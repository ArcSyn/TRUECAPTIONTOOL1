require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Import services
const groqService = require('./services/groqService-simplified');

console.log('🚀 Starting CapEdify Server (Simplified Database Mode)...');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3333', 'http://localhost:5173', 'http://localhost:3000', null],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use(express.static(path.join(__dirname, 'public')));

// Create necessary directories
const directories = ['uploads', 'downloads', 'temp', 'public'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// In-memory storage for demo (replace with database later)
const uploadedVideos = new Map();
const transcriptions = new Map();

// Initialize simplified export service
const exportService = require('./services/exportService-simplified');
exportService.setTranscriptionsMap(transcriptions);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎥 CapEdify API Server - Auto-Transcription Ready! (Simplified Mode)',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    features: ['Auto-Transcription', 'SRT Export', 'JSX Export', 'VTT Export'],
    mode: 'simplified_storage',
    endpoints: {
      health: 'GET /health',
      upload: 'POST /api/videos/upload',
      transcribe: 'POST /api/videos/:id/transcribe',
      transcriptions: 'GET /api/transcriptions/:id',
      export: 'POST /api/transcriptions/:id/export',
      download: 'GET /downloads/:filename'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'CapEdify API (Simplified)',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    groq_configured: !!process.env.GROQ_API_KEY,
    supabase_configured: !!process.env.SUPABASE_URL,
    storage_mode: 'simplified',
    timestamp: new Date().toISOString()
  });
});

// Video upload with auto-transcription endpoint
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file provided' 
      });
    }

    console.log('📁 Processing upload:', req.file.originalname);

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `videos/${Date.now()}-${req.file.originalname}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Store video data in memory (simplified approach)
    const videoId = Date.now().toString();
    const transcriptionId = `trans_${videoId}`;
    
    const videoData = {
      id: videoId,
      title: req.file.originalname,
      file_path: fileName,
      file_size: req.file.size,
      url: urlData.publicUrl,
      status: 'uploaded',
      created_at: new Date().toISOString()
    };

    const transcriptionData = {
      id: transcriptionId,
      video_id: videoId,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    uploadedVideos.set(videoId, videoData);
    transcriptions.set(transcriptionId, transcriptionData);

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Start auto-transcription in background
    setImmediate(async () => {
      try {
        console.log('🎙️ Starting auto-transcription for:', videoData.title);
        
        // Update status to processing
        transcriptionData.status = 'processing';
        transcriptionData.progress = 25;
        transcriptionData.updated_at = new Date().toISOString();
        transcriptions.set(transcriptionId, transcriptionData);

        // Call Groq transcription service
        const result = await groqService.transcribe(urlData.publicUrl, transcriptionId, transcriptions);
        
        console.log('✅ Auto-transcription completed for:', videoData.title);
      } catch (error) {
        console.error('❌ Auto-transcription failed:', error);
        
        // Update transcription with error
        transcriptionData.status = 'error';
        transcriptionData.error = error.message;
        transcriptionData.updated_at = new Date().toISOString();
        transcriptions.set(transcriptionId, transcriptionData);
      }
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully! Auto-transcription started.',
      video: {
        id: videoData.id,
        title: videoData.title,
        url: urlData.publicUrl,
        size: req.file.size
      },
      transcription: {
        id: transcriptionData.id,
        status: 'pending',
        progress: 0
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get transcription status and results
app.get('/api/transcriptions/:id', async (req, res) => {
  try {
    const transcriptionId = req.params.id;
    
    const transcription = transcriptions.get(transcriptionId);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    const video = uploadedVideos.get(transcription.video_id);

    res.json({
      success: true,
      transcription: {
        ...transcription,
        videos: {
          id: video?.id,
          title: video?.title,
          url: video?.url
        }
      }
    });

  } catch (error) {
    console.error('❌ Get transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simplified export using existing export service
app.post('/api/transcriptions/:id/export', async (req, res) => {
  try {
    const transcriptionId = req.params.id;
    const { formats = ['srt', 'jsx', 'vtt'] } = req.body;

    const transcription = transcriptions.get(transcriptionId);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    if (!transcription.result || !transcription.result.segments) {
      return res.status(400).json({
        success: false,
        error: 'No transcription data available'
      });
    }

    const video = uploadedVideos.get(transcription.video_id);
    const exports = {};
    const baseFilename = video.title.replace(/\.[^/.]+$/, ""); // Remove extension
    
    // Generate requested formats using simplified export service
    for (const format of formats) {
      try {
        let content = '';
        switch (format.toLowerCase()) {
          case 'srt':
            content = await exportService.exportToSRT(transcriptionId);
            break;
          case 'jsx':
            content = await exportService.exportToJSX(transcriptionId);
            break;
          case 'vtt':
            content = await exportService.exportToVTT(transcriptionId);
            break;
          case 'fcpxml':
            content = await exportService.exportToFCPXML(transcriptionId);
            break;
          case 'ass':
            content = await exportService.exportToASS(transcriptionId);
            break;
          default:
            continue;
        }

        // Save file
        const filename = `${baseFilename}-${Date.now()}.${format}`;
        const filepath = path.join(__dirname, 'downloads', filename);
        fs.writeFileSync(filepath, content, 'utf8');

        exports[format] = {
          filename,
          downloadUrl: `/downloads/${filename}`,
          size: Buffer.byteLength(content, 'utf8')
        };

      } catch (formatError) {
        console.error(`Failed to export ${format}:`, formatError);
        exports[format] = {
          error: formatError.message
        };
      }
    }

    res.json({
      success: true,
      message: 'Export completed',
      exports,
      transcription: {
        id: transcription.id,
        title: video.title,
        segments: transcription.result.segments.length
      }
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all videos (from memory)
app.get('/api/videos', async (req, res) => {
  try {
    const videos = Array.from(uploadedVideos.values()).map(video => {
      const videoTranscriptions = Array.from(transcriptions.values())
        .filter(t => t.video_id === video.id);
      
      return {
        ...video,
        transcriptions: videoTranscriptions
      };
    });

    res.json({
      success: true,
      videos: videos || []
    });

  } catch (error) {
    console.error('❌ Get videos error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 500MB.'
      });
    }
  }
  
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/videos/upload',
      'GET /api/transcriptions/:id',
      'POST /api/transcriptions/:id/export',
      'GET /api/videos'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CapEdify API Server LIVE on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎥 Upload Endpoint: http://localhost:${PORT}/api/videos/upload`);
  console.log(`\n✨ Features Ready (Simplified Mode):`);
  console.log(`   🤖 Auto-Transcription with Groq Whisper`);
  console.log(`   📝 SRT Export for Video Editors`);
  console.log(`   🎬 JSX Export for After Effects`);
  console.log(`   🌐 VTT Export for Web Players`);
  console.log(`   💾 Supabase Storage (Database: In-Memory)`);
  console.log(`\n🎯 Ready for video editors and creators!\n`);
});

module.exports = app;
