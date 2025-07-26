const express = require('express');
const router = express.Router();
const videoService = require('../services/videoService');
const upload = require('../middleware/upload');
const checkApiKey = require('../middleware/checkApiKey'); 
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// POST /api/video/upload
router.post(
  '/upload',
  checkApiKey,
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: 'No video file provided' });
      }

      console.log('Video upload request received:', req.file.originalname);

      // Upload to Supabase Storage
      const fileExt = path.extname(req.file.originalname);
      const fileName = `videos/${Date.now()}${fileExt}`;
      
      const fileBuffer = await fs.readFile(req.file.path);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');

      const videoData = {
        path: fileName,
        publicUrl: publicUrl,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        status: 'uploaded',
      };

      const video = await videoService.createVideo(videoData);

      // Clean up local file
      await fs.unlink(req.file.path);

      // Log usage for rate limiting in Supabase table "usage_logs"
      await supabase.from('usage_logs').insert([
        {
          api_key: req.user.api_key,
          endpoint: '/upload',
        },
      ]);

      res.json({
        success: true,
        videoId: video.id,
        url: publicUrl,
        size: video.size,
        duration: 0
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/videos
router.get('/', checkApiKey, async (req, res) => {
  try {
    console.log('Get all videos request received');
    const videos = await videoService.getAllVideos();

    res.json({
      success: true,
      videos: videos.map((video) => ({
        id: video._id,
        filename: video.originalName,
        size: video.size,
        duration: video.duration,
        status: video.status,
        uploadedAt: video.uploadedAt,
        lastModified: video.lastModified,
      })),
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/video/:id
router.get('/:id', checkApiKey, async (req, res) => {
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
        lastModified: video.lastModified,
      },
    });
  } catch (error) {
    console.error('Get video error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// DELETE /api/video/:id
router.delete('/:id', checkApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete video request received:', id);

    const result = await videoService.deleteVideo(id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Delete video error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// PUT /api/video/:id/status
router.put('/:id/status', checkApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, error: 'Status is required' });
    }

    console.log('Update video status request received:', id, status);

    const video = await videoService.updateVideoStatus(id, status);

    res.json({
      success: true,
      video: {
        id: video._id,
        filename: video.originalName,
        status: video.status,
        lastModified: video.lastModified,
      },
    });
  } catch (error) {
    console.error('Update video status error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// 🔚 Export the router
module.exports = router;
