const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

console.log('Starting minimal CapEdify server...');

const app = express();
const PORT = 4000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors({
  origin: ['http://localhost:3333', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎥 CapEdify API Server is WORKING!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      upload: 'POST /api/videos/upload',
      videos: 'GET /api/videos'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'CapEdify API',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Video upload endpoint
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file provided' 
      });
    }

    console.log('✅ Video uploaded:', req.file.originalname);

    res.json({
      success: true,
      message: 'Video uploaded successfully!',
      videoId: Date.now().toString(),
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get videos endpoint
app.get('/api/videos', (req, res) => {
  res.json({
    success: true,
    videos: [],
    message: 'Videos endpoint working'
  });
});

// Transcribe endpoint
app.post('/api/transcribe', (req, res) => {
  res.json({
    success: true,
    message: 'Transcription started (mock)',
    transcriptionId: Date.now().toString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CapEdify API Server RUNNING on http://localhost:${PORT}`);
  console.log(`📊 Test it: http://localhost:${PORT}/health`);
  console.log(`🎥 Upload API: http://localhost:${PORT}/api/videos/upload`);
  console.log('\n✅ Server is ready for video uploads!\n');
});
