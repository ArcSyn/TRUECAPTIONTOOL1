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

// Initialize Groq only if API key is available
const groq = process.env.GROQ_API_KEY ? new Groq({
  apiKey: process.env.GROQ_API_KEY
}) : null;

// Import local whisper service
let whisperLocalService = null;
try {
  whisperLocalService = require('./whisperLocalService');
  console.log('✅ WhisperLocalService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load WhisperLocalService:', error.message);
}

class GroqService {
  constructor() {
    // Transcription mode: LOCAL, GROQ, or HYBRID
    this.mode = process.env.TRANSCRIPTION_MODE || 'HYBRID';
    
    console.log(`🎯 Transcription mode: ${this.mode}`);
    console.log(`🔧 Environment TRANSCRIPTION_MODE: ${process.env.TRANSCRIPTION_MODE}`);
    console.log(`🔧 WhisperLocalService available: ${!!whisperLocalService}`);
    
    if (this.mode === 'GROQ' && !groq) {
      console.warn('⚠️ GROQ mode selected but no API key provided!');
    }
    
    if (this.mode === 'LOCAL' && !whisperLocalService) {
      console.error('❌ LOCAL mode selected but WhisperLocalService not available!');
    }
  }
  async transcribe(videoUrl, transcriptionId) {
    try {
      console.log('🎯 Starting transcription for ID:', transcriptionId);
      console.log('📂 Video URL:', videoUrl);
      console.log(`🔧 Mode: ${this.mode}`);
      
      // Route to appropriate service based on mode
      if (this.mode === 'LOCAL') {
        console.log('🏠 Using LOCAL whisper.cpp transcription');
        if (!whisperLocalService) {
          throw new Error('LOCAL mode selected but WhisperLocalService not loaded!');
        }
        return await whisperLocalService.transcribe(videoUrl, transcriptionId);
      } else if (this.mode === 'GROQ' && groq) {
        console.log('☁️ Using GROQ API transcription');
        return await this.transcribeWithGroq(videoUrl, transcriptionId);
      } else if (this.mode === 'HYBRID') {
        // Try LOCAL first, fallback to GROQ on error
        console.log('🔄 Using HYBRID mode - trying LOCAL first');
        if (!whisperLocalService) {
          console.log('⚠️ WhisperLocalService not available, falling back to GROQ');
          if (groq) {
            return await this.transcribeWithGroq(videoUrl, transcriptionId);
          } else {
            throw new Error('Neither LOCAL nor GROQ services available');
          }
        }
        
        try {
          console.log('🏠 Attempting LOCAL whisper.cpp transcription...');
          const result = await whisperLocalService.transcribe(videoUrl, transcriptionId);
          console.log('✅ LOCAL transcription completed successfully');
          return result;
        } catch (localError) {
          console.error(`❌ LOCAL failed with error: ${localError.message}`);
          console.error(`❌ Stack trace: ${localError.stack}`);
          console.log('☁️ Falling back to GROQ API...');
          if (groq) {
            return await this.transcribeWithGroq(videoUrl, transcriptionId);
          } else {
            throw new Error('LOCAL failed and no GROQ API key available');
          }
        }
      } else {
        throw new Error(`Invalid transcription mode: ${this.mode} or missing API key`);
      }
    } catch (error) {
      console.error('❌ Transcription service error:', error);
      
      // Update transcription record with error
      console.log('💾 Updating transcription status to error...');
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

  async transcribeWithGroq(videoUrl, transcriptionId) {
    try {
      // Update status to downloading
      console.log('📊 Setting status to processing (10%)...');
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 10);
      
      // Update status to transcribing
      console.log('📊 Setting status to processing (50%)...');
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 50);

      // Always use chunking for reliability (professional approach)
      console.log('🔄 DEBUG: Starting chunking system...');
      console.log('🔄 DEBUG: videoUrl =', videoUrl);
      console.log('🔄 DEBUG: transcriptionId =', transcriptionId);
      
      try {
        console.log('🔄 DEBUG: About to update status...');
        await this.updateTranscriptionStatus(transcriptionId, 'processing', 55, null, null, '🎧 Analyzing audio patterns...');
        console.log('🔄 DEBUG: Status updated successfully');
        
        // Split into ~2 minute chunks for optimal rate limit management and accuracy
        const chunkDurationSeconds = 120; // 2 minutes - better for rate limits and quality
        // Get duration first
        console.log('🔄 DEBUG: Getting video duration...');
        const duration = await this.getVideoDuration(videoUrl);
        console.log(`📊 DEBUG: Video duration: ${Math.floor(duration/60)}:${Math.floor(duration%60).toString().padStart(2,'0')} (${duration} seconds)`);
        
        console.log('🔄 DEBUG: Starting audio splitting...');
        const chunks = await this.splitAudioIntoChunks(videoUrl, chunkDurationSeconds);
        console.log(`🔄 DEBUG: Got ${chunks.length} chunks`);
        
        const funMessages = [
          '👾 LEVEL 1: Scanning audio waves...',
          '🚀 LEVEL 2: Deploying speech recognition...',
          '💥 LEVEL 3: Destroying silence barriers...',
          '⚡ LEVEL 4: Capturing voice patterns...',
          '🎯 LEVEL 5: Lock and load captions...',
          '🏆 BOSS FIGHT: Final transcription processing...'
        ];
        
        let fullTranscription = '';
        let chunkIndex = 0;
        
        // Process chunks in parallel for speed
        const chunkPromises = chunks.map(async (chunkBuffer, index) => {
          const actualIndex = index + 1;
          const chunkPath = path.join(__dirname, '../uploads', `chunk_${Date.now()}_${actualIndex}.mp3`);
          
          // Calculate time offset for this chunk
          const chunkStartTime = index * chunkDurationSeconds;
          
          // Validate uploads directory exists
          const uploadsDir = path.dirname(chunkPath);
          try {
            await fs.access(uploadsDir);
          } catch (error) {
            await fs.mkdir(uploadsDir, { recursive: true });
          }
          
          await fs.writeFile(chunkPath, chunkBuffer);
          
          try {
            // Show fun progress message
            const messageIndex = index % funMessages.length;
            const progress = 55 + Math.floor((actualIndex / chunks.length) * 35);
            await this.updateTranscriptionStatus(transcriptionId, 'processing', progress, null, null, funMessages[messageIndex]);
            
            const transcription = await groq.audio.transcriptions.create({
              file: fsSync.createReadStream(chunkPath),
              model: "whisper-large-v3",
              response_format: "verbose_json"
            });
            
            // Adjust segment timing to account for chunk offset
            const adjustedSegments = (transcription.segments || []).map(segment => ({
              start: (segment.start || 0) + chunkStartTime,
              end: (segment.end || segment.start + 1) + chunkStartTime,
              text: segment.text || ''
            }));
            
            return { 
              index: actualIndex, 
              text: transcription.text || '',
              segments: adjustedSegments
            };
            
          } finally {
            // Clean up chunk file
            await fs.unlink(chunkPath);
          }
        });
        
        // Wait for all chunks to complete
        await this.updateTranscriptionStatus(transcriptionId, 'processing', 90, null, null, '🔗 Assembling your complete transcription...');
        const chunkResults = await Promise.all(chunkPromises);
        
        // Sort and combine results in order
        chunkResults.sort((a, b) => a.index - b.index);
        fullTranscription = chunkResults.map(chunk => chunk.text).join(' ');
        
        // Combine all segments from all chunks
        const allSegments = [];
        chunkResults.forEach(chunk => {
          if (chunk.segments && chunk.segments.length > 0) {
            allSegments.push(...chunk.segments);
          }
        });
        
        // Sort segments by start time to ensure proper order
        allSegments.sort((a, b) => a.start - b.start);
        
        console.log(`✅ Combined ${allSegments.length} segments with timing data`);
        
        const result = {
          text: fullTranscription.trim(),
          segments: allSegments,
          language: 'en'
        };
        
        // Update transcription record with results
        console.log('💾 Saving transcription to database...');
        await this.updateTranscriptionStatus(transcriptionId, 'completed', 100, result);
        console.log('✅ Transcription completed successfully!');

        return result;
      } catch (chunkError) {
        console.error('❌ Chunking failed:', chunkError);
        throw chunkError;
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      
      // Update transcription record with error
      console.log('💾 Updating transcription status to error...');
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
    console.log('🎵 Starting audio extraction...');
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      ffmpeg(videoUrl)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioFrequency(8000)
        .audioChannels(1)
        .audioBitrate('16k')
        .format('mp3')
        .pipe()
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          const audioBuffer = Buffer.concat(chunks);
          console.log('✅ Audio extracted:', audioBuffer.length, 'bytes');
          resolve(audioBuffer);
        })
        .on('error', (error) => {
          console.error('❌ Audio extraction failed:', error.message);
          reject(error);
        });
    });
  }

  async splitAudioIntoChunks(videoUrl, chunkDurationSeconds) {
    console.log(`🔄 Splitting audio into ${chunkDurationSeconds}s chunks...`);
    
    const chunks = [];
    let startTime = 0;
    
    // Get video duration first
    const duration = await this.getVideoDuration(videoUrl);
    console.log(`📊 Video duration: ${duration} seconds`);
    
    while (startTime < duration) {
      const chunkBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        
        ffmpeg(videoUrl)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioFrequency(8000)
          .audioChannels(1)
          .audioBitrate('16k')
          .format('mp3')
          .seekInput(startTime)
          .duration(chunkDurationSeconds)
          .pipe()
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .on('error', reject);
      });
      
      if (chunkBuffer.length > 0) {
        chunks.push(chunkBuffer);
        console.log(`📦 Chunk ${chunks.length}: ${chunkBuffer.length} bytes`);
      }
      
      startTime += chunkDurationSeconds;
    }
    
    console.log(`✅ Split into ${chunks.length} chunks`);
    return chunks;
  }

  async getVideoDuration(videoUrl) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  async updateTranscriptionStatus(transcriptionId, status, progress, result = null, error = null, message = null) {
    try {
      console.log(`📊 Updating transcription ${transcriptionId}: ${status} (${progress}%)`);
      if (message) console.log(`💬 Message: ${message}`);
      
      const updateData = {
        status,
        progress,
        updated_at: new Date().toISOString()
      };

      if (result) {
        updateData.result = result;
        console.log('📝 Adding transcription result to update');
      }
      if (error) {
        updateData.error = error;
        console.log('❌ Adding error message to update:', error);
      }
      if (message) {
        updateData.status_message = message;
      }

      const { error: updateError } = await supabase
        .from('transcriptions')
        .update(updateData)
        .eq('id', transcriptionId);

      if (updateError) {
        console.error('❌ Database update failed:', updateError);
        throw updateError;
      }
      
      console.log('✅ Database updated successfully');
    } catch (err) {
      console.error('❌ Failed to update transcription status:', err);
    }
  }
}

module.exports = new GroqService();
