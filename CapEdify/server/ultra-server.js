require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Import ultra-compressed service
const groqServiceUltra = require('./services/groqService-ultra');

console.log('🔥 Starting CapEdify ULTRA-COMPRESSED Server...');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Configure multer for file uploads with size limits
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
    fileSize: 100 * 1024 * 1024 // 100MB limit (will be ultra-compressed)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Enhanced CORS for ultra-compression
app.use(cors({
  origin: ['http://localhost:3333', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000', null],
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

// In-memory storage for ultra-compressed demo
const uploadedVideos = new Map();
const transcriptions = new Map();

// Initialize ultra-compressed export service
const exportService = require('./services/exportService-simplified');
exportService.setTranscriptionsMap(transcriptions);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🔥 CapEdify ULTRA-COMPRESSED API Server - Ready!',
    timestamp: new Date().toISOString(),
    version: '3.0.0-ultra',
    features: ['Ultra-Compression', 'Auto-Transcription', 'SRT Export', 'JSX Export', 'VTT Export'],
    compression: 'Maximum (8-12kbps audio)',
    limits: 'Up to 100MB videos → <2MB audio'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'CapEdify ULTRA-COMPRESSED API',
    port: PORT.toString(),
    environment: 'development',
    groq_configured: !!process.env.GROQ_API_KEY,
    supabase_configured: !!process.env.SUPABASE_URL,
    storage_mode: 'ultra-compressed',
    compression_level: 'maximum',
    timestamp: new Date().toISOString()
  });
});

// Upload endpoint with ultra-compression
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    console.log(`📁 Processing ULTRA-COMPRESSED upload: ${req.file.originalname}`);
    console.log(`📊 Original file size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase with ultra-compressed naming
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = `videos/${fileName}`;
    
    const fileBuffer = fs.readFileSync(req.file.path);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, fileBuffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Create video record
    const videoId = `video_${Date.now()}`;
    const videoRecord = {
      id: videoId,
      filename: req.file.originalname,
      path: publicUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      compression: 'ultra-max'
    };

    uploadedVideos.set(videoId, videoRecord);

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Start ultra-compressed transcription immediately
    const transcriptionId = `trans_${Date.now()}`;
    const transcriptionRecord = {
      id: transcriptionId,
      videoId: videoId,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      compression: 'ultra-max'
    };

    transcriptions.set(transcriptionId, transcriptionRecord);

    // Start ultra-compressed transcription in background
    setImmediate(async () => {
      try {
        console.log(`🔥 Starting ULTRA-COMPRESSED auto-transcription for: ${req.file.originalname}`);
        await groqServiceUltra.transcribe(publicUrl, transcriptionId, transcriptions);
        console.log(`✅ ULTRA-COMPRESSED auto-transcription completed for: ${req.file.originalname}`);
      } catch (error) {
        console.error(`❌ ULTRA-COMPRESSED auto-transcription failed: ${error.message}`);
      }
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully - Starting ULTRA-COMPRESSED transcription',
      video: {
        id: videoId,
        filename: req.file.originalname,
        size: req.file.size,
        transcriptionId: transcriptionId,
        compression: 'ultra-max'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transcription status with ultra-compression info
app.get('/api/videos/:videoId/transcription/status', (req, res) => {
  const { videoId } = req.params;
  
  // Find transcription for this video
  const transcription = Array.from(transcriptions.values())
    .find(t => t.videoId === videoId);
  
  if (!transcription) {
    return res.status(404).json({ error: 'Transcription not found' });
  }

  res.json({
    id: transcription.id,
    status: transcription.status,
    progress: transcription.progress || 0,
    compression: 'ultra-max',
    error: transcription.error || null,
    createdAt: transcription.createdAt,
    updatedAt: transcription.updatedAt || transcription.createdAt
  });
});

// Export endpoints for ultra-compressed transcriptions
app.get('/api/videos/:videoId/export/:format', async (req, res) => {
  try {
    const { videoId, format } = req.params;
    
    // Find transcription for this video
    const transcription = Array.from(transcriptions.values())
      .find(t => t.videoId === videoId);
    
    if (!transcription || !transcription.result) {
      return res.status(404).json({ error: 'Transcription not found or not completed' });
    }

    const video = uploadedVideos.get(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const exportedContent = await exportService.exportTranscription(
      transcription.result,
      format,
      video.filename
    );

    const filename = `${path.parse(video.filename).name}_ultra.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(exportedContent);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for ultra-compression
app.get('/api/test-ultra', (req, res) => {
  res.json({
    message: '🔥 Ultra-compression test endpoint',
    compression: {
      primary: '12kbps, 12kHz, 3min max',
      secondary: '8kbps, 8kHz, 2min max',
      expected_size: '<2MB for most videos'
    },
    features: ['Maximum compression', 'Speech-optimized', 'Fast processing']
  });
});

app.listen(PORT, () => {
  console.log(`🔥 CapEdify ULTRA-COMPRESSED API Server LIVE on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎥 Upload Endpoint: http://localhost:${PORT}/api/videos/upload`);
  console.log(`🔥 Ultra-Test: http://localhost:${PORT}/api/test-ultra`);
  console.log(`✨ ULTRA Features Ready:`);
  console.log(`   🔥 Maximum Audio Compression (8-12kbps)`);
  console.log(`   🎙️ Auto-Transcription with Groq Whisper`);
  console.log(`   📝 SRT Export for Video Editors`);
  console.log(`   🎬 JSX Export for After Effects`);
  console.log(`   🌐 VTT Export for Web Players`);
  console.log(`   💾 Supabase Storage (Database: In-Memory)`);
  console.log(`🎯 Ready for ULTRA-COMPRESSED video processing!`);
});
