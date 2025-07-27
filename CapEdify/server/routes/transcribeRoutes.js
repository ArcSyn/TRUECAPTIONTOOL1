const express = require('express');
const router = express.Router();
const groqService = require('../services/groqService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// POST /api/transcribe
router.post('/', async (req, res) => {
  const { videoId, transcriptionId, model } = req.body;
  
  console.log('🎯 Starting transcription request:');
  console.log('📹 Video ID:', videoId);
  console.log('📝 Transcription ID:', transcriptionId);
  console.log('🤖 Model:', model);

  try {
    // 1. Get video details from Supabase
    console.log('📊 Fetching video details from database...');
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError) {
      console.error('❌ Video fetch error:', videoError);
      throw videoError;
    }

    if (!video) {
      console.error('❌ Video not found for ID:', videoId);
      throw new Error('Video not found');
    }
    
    console.log('✅ Video found:', video.filename);
    console.log('🔗 Video URL:', video.public_url);

    // 2. Update transcription status
    console.log('📊 Updating transcription status to processing...');
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        status: 'processing',
        progress: 0
      })
      .eq('id', transcriptionId);

    if (updateError) {
      console.error('❌ Failed to update transcription status:', updateError);
      throw updateError;
    }
    
    console.log('✅ Transcription status updated to processing');

    // 3. Start transcription process
    console.log('🚀 Starting background transcription process...');
    
    // 4. Process transcription asynchronously
    groqService.transcribe(video.public_url, transcriptionId)
      .then(result => {
        console.log('✅ Transcription completed successfully');
      })
      .catch(error => {
        console.error('❌ Transcription failed:', error.message);
      });

    console.log('✅ Transcription request accepted - processing in background');
    res.json({ success: true, message: 'Transcription started' });
  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to start transcription' 
    });
  }
});

// GET /api/transcribe/:id
router.get('/:id', async (req, res) => {
  try {
    const transcriptionId = req.params.id;
    console.log('🔍 Checking transcription status for ID:', transcriptionId);
    
    // Fetch transcription data from Supabase
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select('*, videos:video_id(*)')
      .eq('id', transcriptionId)
      .single();

    if (error) {
      console.error('❌ Transcription fetch error:', error);
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }
    
    console.log(`📊 Transcription status: ${transcription.status} (${transcription.progress}%)`);
    
    // Check for timeout (more than 5 minutes in processing)
    if (transcription.status === 'processing') {
      const createdAt = new Date(transcription.created_at);
      const now = new Date();
      const elapsedMinutes = (now - createdAt) / (1000 * 60);
      
      console.log(`⏱️  Elapsed time: ${elapsedMinutes.toFixed(1)} minutes`);
      
      if (elapsedMinutes > 5) {
        console.log('⚠️  Transcription timeout detected - marking as failed');
        
        // Update to failed status
        await supabase
          .from('transcriptions')
          .update({
            status: 'error',
            error: 'Transcription timeout - please retry'
          })
          .eq('id', transcriptionId);
          
        return res.json({
          success: true,
          transcription: {
            ...transcription,
            status: 'error',
            error: 'Transcription timeout - please retry'
          }
        });
      }
    }

    return res.json({
      success: true,
      transcription: {
        ...transcription,
        complete: transcription.status === 'completed'
      }
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transcription'
    });
  }
});

module.exports = router;