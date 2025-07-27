// Load environment variables
require("dotenv").config();

// Debug environment variables
console.log('🔧 Environment variables loaded:');
console.log(`🔧 TRANSCRIPTION_MODE: ${process.env.TRANSCRIPTION_MODE}`);
console.log(`🔧 WHISPER_MODEL: ${process.env.WHISPER_MODEL}`);
console.log(`🔧 GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`🔧 PORT: ${process.env.PORT}`);

const express = require("express");
const session = require("express-session");
const basicRoutes = require("./routes/index");
const videoRoutes = require("./routes/videoRoutes");
const transcribeRoutes = require("./routes/transcribeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const cors = require("cors");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  console.error("Error: Supabase environment variables missing in .env");
  process.exit(-1);
}

const app = express();
const PORT = process.env.PORT || 4000;
// Pretty-print JSON responses
app.enable('json spaces');
// We want to be consistent with URL paths, so we enable strict routing
app.enable('strict routing');

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: '✅ API Server is healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: {
      health: '/health',
      videos: '/api/videos',
      export: '/api/export',
      transcribe: '/api/transcribe'
    },
    environment: {
      node_version: process.version,
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
    }
  });
});

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Basic Routes
app.use(basicRoutes);

// Video Routes
app.use('/api/video', videoRoutes);
app.use('/api/videos', videoRoutes);

// Transcription Routes
app.use('/api/transcribe', transcribeRoutes);

// Export Routes
app.use('/api/export', exportRoutes);

// JSON parse error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      status: 400, 
      message: err.message 
    });
  }
  next(err);
});

// If no routes handled the request, it's a 404
app.use((req, res) => {
  res.status(404).json({ error: `Path ${req.path} not found` });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

app.listen(PORT, true, () => {
  console.log(`🚀 CapEdify API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Video API: http://localhost:${PORT}/api/videos`);
  console.log(`📝 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`📤 Export API: http://localhost:${PORT}/api/export`);
});