const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

class WhisperService {
  async downloadVideo(url, videoId) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer'
    });

    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempPath = path.join(tempDir, `${videoId}.mp4`);
    await fs.writeFile(tempPath, response.data);
    
    return tempPath;
  }

  async transcribe(videoUrl, transcriptionId) {
    try {
      // Update status to downloading
      await this.updateTranscriptionStatus(transcriptionId, 'downloading', 10);
      
      // Download video
      const videoPath = await this.downloadVideo(videoUrl, transcriptionId);
      
      // Update status to transcribing
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 30);

      // Open video file
      const videoFile = await fs.readFile(videoPath);

      // Transcribe with Whisper
      const transcript = await openai.createTranscription(
        videoFile,
        "whisper-1"
      );

      // Clean up temp file
      await fs.unlink(videoPath);

      // Process transcription results
      const result = {
        text: transcript.data.text,
        segments: transcript.data.segments || [],
        language: transcript.data.language
      };

      // Update transcription record with results
      await this.updateTranscriptionStatus(transcriptionId, 'completed', 100, result);

      return result;
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

  async updateTranscriptionStatus(id, status, progress, result = null, error = null) {
    const { data, error: updateError } = await supabase
      .from('transcriptions')
      .update({
        status,
        progress,
        result,
        error,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating transcription status:', updateError);
      throw updateError;
    }

    return data;
  }
}

module.exports = new WhisperService();
