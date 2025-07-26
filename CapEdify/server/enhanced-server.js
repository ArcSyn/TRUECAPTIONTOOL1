require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Import services
const groqService = require('./services/groqService');
const exportService = require('./services/exportService');

console.log('🚀 Starting CapEdify Server with Auto-Transcription...');

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
  origin: ['http://localhost:3333', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Create necessary directories
const directories = ['uploads', 'downloads', 'temp'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎥 CapEdify API Server - Auto-Transcription Ready!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['Auto-Transcription', 'SRT Export', 'JSX Export', 'VTT Export'],
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
    service: 'CapEdify API',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    groq_configured: !!process.env.GROQ_API_KEY,
    supabase_configured: !!process.env.SUPABASE_URL,
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
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Create video record in database
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: req.file.originalname,
        file_path: fileName,
        file_size: req.file.size,
        url: urlData.publicUrl,
        status: 'uploaded'
      })
      .select()
      .single();

    if (videoError) {
      throw new Error(`Database error: ${videoError.message}`);
    }

    // Create transcription record
    const { data: transcriptionData, error: transcriptionError } = await supabase
      .from('transcriptions')
      .insert({
        video_id: videoData.id,
        status: 'pending',
        progress: 0
      })
      .select()
      .single();

    if (transcriptionError) {
      throw new Error(`Transcription record error: ${transcriptionError.message}`);
    }

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Start auto-transcription in background
    setImmediate(async () => {
      try {
        console.log('🎙️ Starting auto-transcription for:', videoData.title);
        const result = await groqService.transcribe(urlData.publicUrl, transcriptionData.id);
        console.log('✅ Auto-transcription completed for:', videoData.title);
      } catch (error) {
        console.error('❌ Auto-transcription failed:', error);
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

// Manual transcription trigger (if auto-transcription was skipped)
app.post('/api/videos/:id/transcribe', async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if transcription already exists
    const { data: existingTranscription } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('video_id', videoId)
      .single();

    let transcriptionId;
    
    if (existingTranscription) {
      transcriptionId = existingTranscription.id;
      // Reset status to pending
      await supabase
        .from('transcriptions')
        .update({ status: 'pending', progress: 0 })
        .eq('id', transcriptionId);
    } else {
      // Create new transcription record
      const { data: newTranscription, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          video_id: videoId,
          status: 'pending',
          progress: 0
        })
        .select()
        .single();

      if (transcriptionError) {
        throw new Error(`Failed to create transcription record: ${transcriptionError.message}`);
      }
      transcriptionId = newTranscription.id;
    }

    // Start transcription in background
    setImmediate(async () => {
      try {
        console.log('🎙️ Starting manual transcription for video:', video.title);
        const result = await groqService.transcribe(video.url, transcriptionId);
        console.log('✅ Manual transcription completed for:', video.title);
      } catch (error) {
        console.error('❌ Manual transcription failed:', error);
      }
    });

    res.json({
      success: true,
      message: 'Transcription started successfully',
      transcriptionId
    });

  } catch (error) {
    console.error('❌ Transcription start error:', error);
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
    
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select(`
        *,
        videos (
          id,
          title,
          url
        )
      `)
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    res.json({
      success: true,
      transcription
    });

  } catch (error) {
    console.error('❌ Get transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export transcription to multiple formats
app.post('/api/transcriptions/:id/export', async (req, res) => {
  try {
    const transcriptionId = req.params.id;
    const { formats = ['srt', 'jsx', 'vtt'] } = req.body;

    // Get transcription data
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select(`
        *,
        videos (
          id,
          title,
          url
        )
      `)
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
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

    const exports = {};
    const baseFilename = transcription.videos.title.replace(/\.[^/.]+$/, ""); // Remove extension
    
    // Generate requested formats
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
            continue; // Skip unsupported formats
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
        title: transcription.videos.title,
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

// List all videos
app.get('/api/videos', async (req, res) => {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        *,
        transcriptions (
          id,
          status,
          progress,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }

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
      'POST /api/videos/:id/transcribe',
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
  console.log(`\n✨ Features Ready:`);
  console.log(`   🤖 Auto-Transcription with Groq Whisper`);
  console.log(`   📝 SRT Export for Video Editors`);
  console.log(`   🎬 JSX Export for After Effects`);
  console.log(`   🌐 VTT Export for Web Players`);
  console.log(`   💾 Supabase Storage & Database`);
  console.log(`\n🎯 Ready for video editors and creators!\n`);
});

module.exports = app;
