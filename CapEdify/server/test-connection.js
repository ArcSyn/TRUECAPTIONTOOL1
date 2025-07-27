const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check pinged');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Simple upload test endpoint
app.post('/api/video/upload', (req, res) => {
  console.log('🚀 Upload endpoint hit!');
  res.json({ 
    success: true, 
    message: 'Upload endpoint is working!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Upload test: http://localhost:${PORT}/api/video/upload`);
});
