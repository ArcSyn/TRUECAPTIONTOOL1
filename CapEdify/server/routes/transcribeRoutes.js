const express = require('express');
const router = express.Router();
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
    const transcriptionPromise = model === 'groq' 
      ? transcribeWithGroq(video.public_url, transcriptionId)
      : transcribeWithWhisper(video.public_url, transcriptionId);

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

const groqService = require('../services/groqService');

async function transcribeWithGroq(videoUrl, transcriptionId) {
  return groqService.transcribe(videoUrl, transcriptionId);
}

async function transcribeWithWhisper(videoUrl, transcriptionId) {
  // Fallback to Groq since we're using it as primary
  return transcribeWithGroq(videoUrl, transcriptionId);
}

async function transcribeWithWhisper(videoUrl, transcriptionId) {
  // Fallback to Groq since we're using it as primary
  return transcribeWithGroq(videoUrl, transcriptionId);
}

module.exports = router;
