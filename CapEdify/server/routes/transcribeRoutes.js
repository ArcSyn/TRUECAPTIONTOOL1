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

  try {
    // 1. Get video details from Supabase
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError) {
      console.error('Video fetch error:', videoError);
      throw videoError;
    }

    if (!video) {
      throw new Error('Video not found');
    }

    // 2. Update transcription status
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        status: 'processing',
        progress: 0
      })
      .eq('id', transcriptionId);

    if (updateError) throw updateError;

    // 3. Start transcription process
    const transcriptionPromise = groqService.transcribe(video.public_url, transcriptionId);

    // 4. Process transcription asynchronously
    transcriptionPromise
      .then(async (result) => {
        console.log('Transcription completed:', result);
        await supabase
          .from('transcriptions')
          .update({
            status: 'completed',
            progress: 100,
            result
          })
          .eq('id', transcriptionId);
      })
      .catch(async (error) => {
        console.error('Transcription error:', error);
        await supabase
          .from('transcriptions')
          .update({
            status: 'error',
            error: error.message
          })
          .eq('id', transcriptionId);
      });

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
    
    // Fetch transcription data from Supabase
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select('*, videos:video_id(*)')
      .eq('id', transcriptionId)
      .single();

    if (error) {
      console.error('Transcription fetch error:', error);
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    return res.json({
      success: true,
      transcription
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
