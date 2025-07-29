const { Groq } = require("groq-sdk");
const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class GroqService {
  async transcribe(videoUrl, transcriptionId) {
    try {
      console.log('Starting transcription for URL:', videoUrl);
      
      // Update status to downloading
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 10);
      
      // Download and convert video to audio
      const audioBuffer = await this.downloadAndExtractAudio(videoUrl);
      
      // Update status to transcribing
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 50);

      // Create a temporary file for the audio
      const tempAudioPath = path.join(__dirname, '../uploads', `temp_${Date.now()}.wav`);
      await fs.writeFile(tempAudioPath, audioBuffer);

      try {
        // Use Groq's Whisper API for transcription
        const transcription = await groq.audio.transcriptions.create({
          file: fsSync.createReadStream(tempAudioPath),
          model: "whisper-large-v3",
          prompt: "Transcribe this audio with precise timing and formatting.",
          response_format: "verbose_json",
          language: "en"
        });

        // Clean up temp file
        await fs.unlink(tempAudioPath);

        const result = {
          text: transcription.text,
          segments: transcription.segments || [],
          language: transcription.language || 'en'
        };

        // Update transcription record with results
        await this.updateTranscriptionStatus(transcriptionId, 'completed', 100, result);

        return result;
      } catch (transcriptionError) {
        // Clean up temp file on error
        try {
          await fs.unlink(tempAudioPath);
        } catch (cleanupError) {
          console.error('Failed to clean up temp file:', cleanupError);
        }
        throw transcriptionError;
      }
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Update transcription record with error
      await this.updateTranscriptionStatus(
        transcriptionId, 
        'error', 
        0, 
        null, 
        error.message
      );
      
      throw error;
    }
  }

  async downloadAndExtractAudio(videoUrl) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      ffmpeg(videoUrl)
        .noVideo()
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .pipe()
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
  }

  async updateTranscriptionStatus(transcriptionId, status, progress, result = null, error = null) {
    try {
      const updateData = {
        status,
        progress,
        updated_at: new Date().toISOString()
      };

      if (result) updateData.result = result;
      if (error) updateData.error = error;

      const { error: updateError } = await supabase
        .from('transcriptions')
        .update(updateData)
        .eq('id', transcriptionId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to update transcription status:', err);
    }
  }
}

module.exports = new GroqService();
