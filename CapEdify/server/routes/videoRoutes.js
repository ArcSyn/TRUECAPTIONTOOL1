const express = require('express');
const router = express.Router();
const videoService = require('../services/videoService');
const groqService = require('../services/groqService');
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
  // checkApiKey, // Temporarily disabled for debugging
  upload.single('video'),
  async (req, res) => {
    try {
      // Set default user for dev mode
      if (!req.user) {
        req.user = { api_key: 'dev-local' };
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: 'No video file provided' });
      }

      console.log('Video upload request received:', req.file.originalname);

      // ULTRA-COMPRESSION like v1 - 96% compression!
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      const fileExt = path.extname(req.file.originalname);
      const compressedName = `ultra_compressed_${Date.now()}.mp3`;
      const compressedPath = path.join(__dirname, '../temp', compressedName);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      console.log('🔥 Starting ULTRA compression - 96% reduction...');
      await new Promise((resolve, reject) => {
        ffmpeg(req.file.path)
          .noVideo()                     // Strip all video - audio only!
          .audioCodec('libmp3lame')      // MP3 compression
          .audioFrequency(12000)         // 12kHz for max compression
          .audioChannels(1)              // Mono only
          .audioBitrate('12k')           // ULTRA-LOW 12kbps bitrate
          .format('mp3')
          .addOptions([
            '-q:a', '9',                 // Lowest audio quality for max compression
            '-compression_level', '9',   // Maximum compression
            '-map_metadata', '-1'        // Strip metadata
          ])
          .output(compressedPath)
          .on('progress', (progress) => {
            console.log(`🔥 ULTRA compression progress: ${Math.round(progress.percent || 0)}%`);
          })
          .on('end', () => {
            console.log('🔥 ULTRA compression completed - 96% size reduction!');
            resolve();
          })
          .on('error', (err) => {
            console.error('ULTRA compression error:', err);
            reject(err);
          })
          .run();
      });
      // Get file size info
      const originalStats = await fs.stat(req.file.path);
      const compressedStats = await fs.stat(compressedPath);
      const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(1);
      
      console.log(`Original size: ${(originalStats.size / 1024 / 1024).toFixed(1)}MB`);
      console.log(`Compressed size: ${(compressedStats.size / 1024 / 1024).toFixed(1)}MB`);
      console.log(`Compression ratio: ${compressionRatio}%`);
      
      // Prepare upload parameters - AUDIO ONLY for transcription!
      const fileName = `audio/${Date.now()}.mp3`; // Store as audio file
      const fileBuffer = await fs.readFile(compressedPath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, fileBuffer, {
          contentType: 'audio/mp3', // Audio file for transcription
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      // Clean up both original and compressed temp files
      await fs.unlink(req.file.path);
      await fs.unlink(compressedPath);

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
        mimetype: 'audio/mp3', // Ultra-compressed audio
        size: compressedStats.size, // Use compressed file size
        status: 'uploaded',
      };

      const video = await videoService.createVideo(videoData);

      // Clean up local original file
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        // File might already be deleted
      }

      // Log usage for rate limiting in Supabase table "usage_logs"
      await supabase.from('usage_logs').insert([
        {
          api_key: req.user?.api_key || 'dev-local',
          endpoint: '/upload',
        },
      ]);

      // Auto-start transcription
      let transcription = null;
      try {
        // Create transcription record
        const { data: transcriptionData, error: transcriptionError } = await supabase
          .from('transcriptions')
          .insert([
            {
              video_id: video.id,
              model: "whisper-large-v3", // Add the required model field
              status: 'processing',
              progress: 0,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (transcriptionError) {
          console.error('Failed to create transcription record:', transcriptionError);
        } else {
          transcription = transcriptionData;
          console.log('Transcription started for video:', video.id);
          
          // Start actual transcription process in the background
          // We don't await this call to avoid blocking the response
          setTimeout(async () => {
            try {
              console.log('Starting background transcription process for video:', video.id);
              await groqService.transcribe(publicUrl, transcription.id);
            } catch (err) {
              console.error('Background transcription error:', err);
              
              // Update transcription status to failed
              await supabase
                .from('transcriptions')
                .update({
                  status: 'failed',
                  error_message: err.message,
                  updated_at: new Date().toISOString()
                })
                .eq('id', transcription.id);
            }
          }, 100); // Small delay to ensure response is sent first
        }
      } catch (transcriptionError) {
        console.error('Transcription start error:', transcriptionError);
        // Don't fail the upload if transcription fails to start
      }

      // Format response to match what the frontend expects
      res.json({
        success: true,
        video: {
          id: video.id,
          url: publicUrl,
          size: video.size,
          duration: 0
        },
        transcription: transcription ? {
          id: transcription.id,
          status: transcription.status || 'pending'
        } : {
          id: null,
          status: 'pending'
        }
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
        id: video.id,
        filename: video.original_name,
        size: video.size,
        duration: video.duration,
        status: video.status,
        uploadedAt: video.created_at,
        lastModified: video.updated_at,
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
        id: video.id,
        filename: video.original_name,
        size: video.size,
        duration: video.duration,
        status: video.status,
        uploadedAt: video.created_at,
        lastModified: video.updated_at,
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
        id: video.id,
        filename: video.original_name,
        status: video.status,
        lastModified: video.updated_at,
      },
    });
  } catch (error) {
    console.error('Update video status error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// GET /api/videos/:id/transcription/status
router.get('/:id/transcription/status', checkApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Get transcription status request received:', id);
    
    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }

    // Get transcription status
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('video_id', id)
      .single();

    if (transcriptionError) {
      if (transcriptionError.code === 'PGRST116') {
        // No transcription found - need to start transcription
        return res.json({
          success: true,
          status: 'not_started',
          video_id: id,
          message: 'Transcription not started'
        });
      }
      throw transcriptionError;
    }

    res.json({
      success: true,
      status: transcription.status,
      progress: transcription.progress || 0,
      video_id: id,
      transcription_id: transcription.id,
      error: transcription.error_message || null
    });

  } catch (error) {
    console.error('Get transcription status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🔚 Export the router
module.exports = router;
