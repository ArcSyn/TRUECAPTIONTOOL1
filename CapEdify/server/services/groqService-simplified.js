const { Groq } = require("groq-sdk");
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('GROQ_API_KEY loaded:', !!process.env.GROQ_API_KEY);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class GroqService {
  async transcribe(videoUrl, transcriptionId, transcriptionsMap) {
    try {
      console.log('Starting transcription for URL:', videoUrl);
      
      // Update status to downloading
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 10, transcriptionsMap);
      
      // Download and convert video to audio
      const audioBuffer = await this.downloadAndExtractAudio(videoUrl);
      
      // Update status to transcribing
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 50, transcriptionsMap);

      // Create a temporary file for the audio
      const tempAudioPath = path.join(__dirname, '../temp', `audio_${Date.now()}.mp3`);
      await fs.writeFile(tempAudioPath, audioBuffer);

      try {
        // Use Groq's Whisper API for transcription
        console.log('🎙️ Sending audio to Groq Whisper API...');
        
        const fileStream = require('fs').createReadStream(tempAudioPath);
        
        const transcription = await groq.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-large-v3",
          prompt: "Transcribe this audio with precise timing and formatting.",
          response_format: "verbose_json",
          language: "en"
        });

        console.log('🎉 Received transcription from Groq:', transcription.text?.substring(0, 100) + '...');

        // Clean up temp file
        await fs.unlink(tempAudioPath);

        const result = {
          text: transcription.text,
          segments: transcription.segments || [],
          language: transcription.language || 'en'
        };

        // Update transcription record with results
        await this.updateTranscriptionStatus(transcriptionId, 'completed', 100, transcriptionsMap, result);

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
        transcriptionsMap,
        null, 
        error.message
      );
      
      throw error;
    }
  }

  async downloadAndExtractAudio(videoUrl) {
    return new Promise((resolve, reject) => {
      console.log('🎵 Extracting ultra-compressed audio from video using FFmpeg...');
      const chunks = [];
      
      const ffmpegCommand = ffmpeg(videoUrl)
        .noVideo()
        .audioCodec('libmp3lame')  // Use MP3 for better compression
        .audioFrequency(16000)     // 16kHz sample rate (minimum for speech)
        .audioChannels(1)          // Mono audio
        .audioBitrate('24k')       // Ultra-low bitrate (down from 32k)
        .format('mp3')             // MP3 format is more compressed
        .outputOptions([
          '-ac', '1',              // Force mono
          '-ar', '16000',          // Force 16kHz
          '-ab', '24k',            // Force 24kbps bitrate (ultra-compressed)
          '-t', '300',             // Limit to 5 minutes max (faster processing)
          '-f', 'mp3',             // Force MP3 format
          '-q:a', '9',             // Lowest quality, highest compression
          '-compression_level', '9', // Maximum compression
          '-joint_stereo', '1',    // Joint stereo for better compression
          '-cutoff', '8000'        // Cut off frequencies above 8kHz (speech only)
        ])
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Audio extraction progress:', Math.round(progress.percent || 0) + '%');
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
          reject(err);
        });

      const stream = ffmpegCommand.pipe();
      
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', async () => {
        const finalBuffer = Buffer.concat(chunks);
        const fileSizeMB = finalBuffer.length / 1024 / 1024;
        console.log(`✅ Audio extraction completed - Size: ${fileSizeMB.toFixed(2)} MB`);
        
        // If file is still too large, apply additional compression
        if (fileSizeMB > 15) {
          console.log('🔧 File still large, applying additional compression...');
          try {
            const compressedBuffer = await this.applyAdditionalCompression(finalBuffer);
            const compressedSizeMB = compressedBuffer.length / 1024 / 1024;
            console.log(`🎯 Compressed size: ${compressedSizeMB.toFixed(2)} MB`);
            resolve(compressedBuffer);
          } catch (compressionError) {
            console.log('⚠️  Additional compression failed, using original...');
            resolve(finalBuffer);
          }
        } else {
          resolve(finalBuffer);
        }
      });
      stream.on('error', reject);
    });
  }

  async applyAdditionalCompression(audioBuffer) {
    return new Promise((resolve, reject) => {
      console.log('🔧 Applying additional compression with even lower bitrate...');
      const chunks = [];
      
      // Create temporary input file
      const tempInputPath = path.join(__dirname, '../temp', `temp_input_${Date.now()}.mp3`);
      require('fs').writeFileSync(tempInputPath, audioBuffer);
      
      const ffmpegCommand = ffmpeg(tempInputPath)
        .audioCodec('libmp3lame')
        .audioFrequency(12000)     // Even lower sample rate for maximum compression
        .audioChannels(1)
        .audioBitrate('16k')       // Extremely low bitrate (16kbps)
        .format('mp3')
        .outputOptions([
          '-ac', '1',
          '-ar', '12000',          // 12kHz sample rate
          '-ab', '16k',            // 16kbps bitrate
          '-q:a', '9',             // Lowest quality setting
          '-compression_level', '9',
          '-cutoff', '6000',       // Cut off even more frequencies
          '-joint_stereo', '1'
        ])
        .on('start', (commandLine) => {
          console.log('Additional compression command:', commandLine);
        })
        .on('error', (err) => {
          console.error('Additional compression error:', err.message);
          // Clean up temp file
          try { require('fs').unlinkSync(tempInputPath); } catch {}
          reject(err);
        });

      const stream = ffmpegCommand.pipe();
      
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        // Clean up temp file
        try { require('fs').unlinkSync(tempInputPath); } catch {}
        const compressedBuffer = Buffer.concat(chunks);
        console.log(`🎯 Additional compression completed`);
        resolve(compressedBuffer);
      });
      stream.on('error', (err) => {
        // Clean up temp file
        try { require('fs').unlinkSync(tempInputPath); } catch {}
        reject(err);
      });
    });
  }

  async updateTranscriptionStatus(transcriptionId, status, progress, transcriptionsMap, result = null, error = null) {
    try {
      const transcription = transcriptionsMap.get(transcriptionId);
      if (transcription) {
        const updateData = {
          ...transcription,
          status,
          progress,
          updated_at: new Date().toISOString()
        };

        if (result) updateData.result = result;
        if (error) updateData.error = error;

        transcriptionsMap.set(transcriptionId, updateData);
        console.log(`📊 Transcription ${transcriptionId} status: ${status} (${progress}%)`);
      }
    } catch (err) {
      console.error('Failed to update transcription status:', err);
    }
  }
}

module.exports = new GroqService();
