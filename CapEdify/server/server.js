// Load environment variables
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const basicRoutes = require("./routes/index");
const videoRoutes = require("./routes/videoRoutes");
const transcribeRoutes = require("./routes/transcribeRoutes");
const exportRoutes = require("./routes/exportRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");
const batchRoutes = require("./routes/batchRoutes");
const customExportRoutes = require("./routes/customExportRoutes");
const ExportCleanupService = require("./services/exportCleanupService");
const themeSeedingService = require("./services/themeSeedingService");
const cors = require("cors");
const path = require("path");

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
  origin: 'http://localhost:5173',
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
      transcribe: '/api/transcribe',
      pipeline_run: '/api/pipeline/run',
      pipeline_status: '/api/pipeline/status/:jobId',
      pipeline_download: '/api/pipeline/download/:jobId',
      batch_process: '/api/batch/process',
      batch_status: '/api/batch/status/:batchId',
      batch_download: '/api/batch/download/:jobId',
      export_custom: '/api/export/custom',
      export_status: '/api/export/status/:exportId',
      export_download: '/api/export/download/:exportId',
      export_presets: '/api/export/presets',
      export_themes: '/api/export/themes',
      export_jobs: '/api/export/jobs'
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

// Pipeline Routes (AgentOrchestrator)
app.use('/api/pipeline', pipelineRoutes);

// Batch Processing Routes
app.use('/api/batch', batchRoutes);

// Custom Export Routes
app.use('/api/export', customExportRoutes);

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

// Initialize export cleanup service
const exportsDir = path.join(__dirname, 'exports');
const cleanupService = new ExportCleanupService(exportsDir, 24 * 60 * 60 * 1000); // 24 hours

app.listen(PORT, true, async () => {
  console.log(`🚀 CapEdify API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Video API: http://localhost:${PORT}/api/videos`);
  console.log(`📝 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`📤 Export API: http://localhost:${PORT}/api/export`);
  console.log(`📁 Export directory initialized: ${exportsDir}`);
  
  // Start cleanup service
  await cleanupService.start();
  
  // Seed default themes
  console.log('🎨 Seeding default export themes...');
  const themeResult = await themeSeedingService.seedDefaultThemes();
  if (themeResult.success) {
    console.log(`✅ Theme seeding: ${themeResult.message}`);
  } else {
    console.error(`❌ Theme seeding failed: ${themeResult.error}`);
  }
});