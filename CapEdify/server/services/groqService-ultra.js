const { Groq } = require("groq-sdk");
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔥 ULTRA Groq API Key loaded:', !!process.env.GROQ_API_KEY);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class UltraCompressedGroqService {
  async transcribe(videoUrl, transcriptionId, transcriptionsMap) {
    try {
      console.log('🎬 Starting ULTRA-COMPRESSED transcription for:', videoUrl);
      
      // Update status to downloading
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 10, transcriptionsMap);
      
      // Step 1: Extract and ultra-compress audio
      const audioBuffer = await this.extractUltraCompressedAudio(videoUrl);
      
      // Update status to transcribing
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 50, transcriptionsMap);

      // Step 2: Create temporary file with ultra-compressed audio
      const tempAudioPath = path.join(__dirname, '../temp', `ultra_audio_${Date.now()}.mp3`);
      await fs.writeFile(tempAudioPath, audioBuffer);

      try {
        console.log('🎙️ Sending ULTRA-COMPRESSED audio to Groq Whisper API...');
        
        const fileStream = require('fs').createReadStream(tempAudioPath);
        
        const transcription = await groq.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-large-v3",
          prompt: "Transcribe this audio with precise timing and formatting. Focus on speech content.",
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
        await this.updateTranscriptionStatus(
          transcriptionId, 
          'completed', 
          100, 
          transcriptionsMap,
          result
        );
        
        console.log('✅ ULTRA-COMPRESSED transcription completed successfully!');
        return result;

      } catch (groqError) {
        // Clean up temp file on error
        await fs.unlink(tempAudioPath).catch(() => {});
        throw groqError;
      }

    } catch (error) {
      console.error('❌ Ultra-compressed transcription error:', error);
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

  async extractUltraCompressedAudio(videoUrl) {
    return new Promise((resolve, reject) => {
      console.log('🔥 Extracting ULTRA-COMPRESSED audio with maximum compression...');
      const chunks = [];
      
      const ffmpegCommand = ffmpeg(videoUrl)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioFrequency(12000)     // Even lower: 12kHz for maximum compression
        .audioChannels(1)          // Mono audio
        .audioBitrate('12k')       // ULTRA-LOW bitrate: 12kbps (down from 24k)
        .format('mp3')
        .outputOptions([
          '-ac', '1',              // Force mono
          '-ar', '12000',          // Force 12kHz
          '-ab', '12k',            // Force 12kbps bitrate (ultra-compressed)
          '-t', '180',             // Limit to 3 minutes max (faster processing)
          '-f', 'mp3',             // Force MP3 format
          '-q:a', '9',             // Lowest quality, highest compression
          '-compression_level', '9', // Maximum compression
          '-joint_stereo', '1',    // Joint stereo for better compression
          '-cutoff', '6000',       // Cut off frequencies above 6kHz (speech only)
          '-map_metadata', '-1',   // Remove all metadata
          '-fflags', '+bitexact'   // Reproducible output
        ])
        .on('start', (commandLine) => {
          console.log('🔥 ULTRA FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('🔄 Audio extraction progress:', Math.round(progress.percent || 0) + '%');
        })
        .on('error', (err) => {
          console.error('❌ Ultra-compression error:', err.message);
          reject(err);
        });

      const stream = ffmpegCommand.pipe();
      
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', async () => {
        const finalBuffer = Buffer.concat(chunks);
        const fileSizeMB = finalBuffer.length / 1024 / 1024;
        console.log(`🔥 ULTRA-COMPRESSION completed - Size: ${fileSizeMB.toFixed(2)} MB`);
        
        // If still too large, apply secondary compression
        if (fileSizeMB > 5) {
          console.log('🔧 File still large, applying SECONDARY ultra-compression...');
          try {
            const secondaryCompressed = await this.applySecondaryCompression(finalBuffer);
            const secondarySizeMB = secondaryCompressed.length / 1024 / 1024;
            console.log(`🎯 SECONDARY compression: ${secondarySizeMB.toFixed(2)} MB`);
            resolve(secondaryCompressed);
          } catch (compressionError) {
            console.log('⚠️  Secondary compression failed, using primary...');
            resolve(finalBuffer);
          }
        } else {
          resolve(finalBuffer);
        }
      });
      stream.on('error', reject);
    });
  }

  async applySecondaryCompression(audioBuffer) {
    return new Promise((resolve, reject) => {
      console.log('🔧 Applying SECONDARY ultra-compression with 8kbps...');
      const chunks = [];
      
      // Create temporary input file
      const tempInputPath = path.join(__dirname, '../temp', `temp_input_${Date.now()}.mp3`);
      require('fs').writeFileSync(tempInputPath, audioBuffer);
      
      const ffmpegCommand = ffmpeg(tempInputPath)
        .audioCodec('libmp3lame')
        .audioFrequency(8000)      // Even lower: 8kHz for telephone quality
        .audioChannels(1)
        .audioBitrate('8k')        // EXTREME: 8kbps bitrate
        .format('mp3')
        .outputOptions([
          '-ac', '1',
          '-ar', '8000',           // 8kHz sample rate (telephone quality)
          '-ab', '8k',             // 8kbps bitrate
          '-q:a', '9',             // Lowest quality setting
          '-compression_level', '9',
          '-cutoff', '4000',       // Cut off even more frequencies
          '-joint_stereo', '1',
          '-t', '120'              // Limit to 2 minutes for ultra-fast processing
        ])
        .on('start', (commandLine) => {
          console.log('🔧 Secondary compression command:', commandLine);
        })
        .on('error', (err) => {
          console.error('❌ Secondary compression error:', err.message);
          // Clean up temp file
          require('fs').unlinkSync(tempInputPath).catch(() => {});
          reject(err);
        });

      const stream = ffmpegCommand.pipe();
      
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        // Clean up temp file
        require('fs').unlinkSync(tempInputPath).catch(() => {});
        const compressedBuffer = Buffer.concat(chunks);
        console.log(`🎯 SECONDARY compression completed`);
        resolve(compressedBuffer);
      });
      stream.on('error', (err) => {
        // Clean up temp file
        require('fs').unlinkSync(tempInputPath).catch(() => {});
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
          updatedAt: new Date().toISOString()
        };
        
        if (result) {
          updateData.result = result;
        }
        
        if (error) {
          updateData.error = error;
        }
        
        transcriptionsMap.set(transcriptionId, updateData);
        console.log(`📊 Transcription ${transcriptionId} status: ${status} (${progress}%)`);
      }
    } catch (error) {
      console.error('Error updating transcription status:', error);
    }
  }
}

module.exports = new UltraCompressedGroqService();
