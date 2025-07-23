const express = require('express');
const router = express.Router();
const videoService = require('../services/videoService');
const upload = require('./middleware/upload');

// POST /api/video/upload - Upload video file
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file provided' 
      });
    }

    console.log('Video upload request received:', req.file.originalname);

    const videoData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      duration: 0, // Will be updated later when processing
      status: 'uploaded'
    };

    const video = await videoService.createVideo(videoData);

    res.json({
      success: true,
      videoId: video._id,
      duration: video.duration,
      size: video.size,
      filename: video.originalName
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/videos - Get all videos
router.get('/', async (req, res) => {
  try {
    console.log('Get all videos request received');
    const videos = await videoService.getAllVideos();
    
    res.json({
      success: true,
      videos: videos.map(video => ({
        id: video._id,
        filename: video.originalName,
        size: video.size,
        duration: video.duration,
        status: video.status,
        uploadedAt: video.uploadedAt,
        lastModified: video.lastModified
      }))
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/video/:id - Get single video
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Get video by ID request received:', id);
    
    const video = await videoService.getVideoById(id);
    
    res.json({
      success: true,
      video: {
        id: video._id,
        filename: video.originalName,
        size: video.size,
        duration: video.duration,
        status: video.status,
        uploadedAt: video.uploadedAt,
        lastModified: video.lastModified
      }
    });

  } catch (error) {
    console.error('Get video error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE /api/video/:id - Delete video
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete video request received:', id);
    
    const result = await videoService.deleteVideo(id);
    
    res.json(result);

  } catch (error) {
    console.error('Delete video error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PUT /api/video/:id/status - Update video status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status is required' 
      });
    }

    console.log('Update video status request received:', id, status);
    
    const video = await videoService.updateVideoStatus(id, status);
    
    res.json({
      success: true,
      video: {
        id: video._id,
        filename: video.originalName,
        status: video.status,
        lastModified: video.lastModified
      }
    });

  } catch (error) {
    console.error('Update video status error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;