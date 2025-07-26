// Load environment variables
require("dotenv").config();
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

app.use(cors({}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CapEdify API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Video API: http://localhost:${PORT}/api/videos`);
  console.log(`📝 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`📤 Export API: http://localhost:${PORT}/api/export`);
});