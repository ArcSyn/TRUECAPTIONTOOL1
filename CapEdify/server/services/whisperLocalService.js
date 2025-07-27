const { exec } = require('child_process');
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

class WhisperLocalService {
  constructor() {
    // Path to whisper.cpp executable (use whisper-cli.exe, not deprecated main.exe)
    this.whisperPath = path.join(__dirname, '../../whisper-cpp/Release/whisper-cli.exe');
    this.modelsPath = path.join(__dirname, '../../whisper-cpp/models');
    
    // Available models (download on demand)
    this.models = {
      tiny: { file: 'ggml-tiny.bin', size: '39MB', speed: '32x', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin' },
      base: { file: 'ggml-base.bin', size: '74MB', speed: '16x', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin' },
      small: { file: 'ggml-small.bin', size: '244MB', speed: '6x', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin' },
      medium: { file: 'ggml-medium.bin', size: '769MB', speed: '2x', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin' },
      large: { file: 'ggml-large-v3.bin', size: '1550MB', speed: '1x', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin' }
    };
    
    // Default model for balance of speed/quality
    this.defaultModel = process.env.WHISPER_MODEL || 'small';
  }

  async transcribe(videoUrl, transcriptionId, model = this.defaultModel) {
    try {
      console.log('🏠 Starting LOCAL whisper transcription for ID:', transcriptionId);
      console.log('📂 Video URL:', videoUrl);
      console.log('🤖 Using model:', model);
      
      // Check if whisper executable exists
      const fs = require('fs');
      if (!fs.existsSync(this.whisperPath)) {
        throw new Error(`Whisper executable not found at: ${this.whisperPath}`);
      }
      console.log('✅ Whisper executable found');
      
      // Update status to downloading
      console.log('📊 Setting status to processing (10%)...');
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 10);
      
      // Update status to transcribing
      console.log('📊 Setting status to processing (50%)...');
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 50);

      // Ensure model is available
      await this.ensureModel(model);
      
      console.log('🔄 Starting chunking system...');
      await this.updateTranscriptionStatus(transcriptionId, 'processing', 55, null, null, '🎧 Analyzing audio patterns...');
      
      // Split into 2-minute chunks for optimal processing (same as Groq)
      const chunkDurationSeconds = 120; // 2 minutes
      
      // Get duration first
      console.log('🔄 Getting video duration...');
      const duration = await this.getVideoDuration(videoUrl);
      console.log(`📊 Video duration: ${Math.floor(duration/60)}:${Math.floor(duration%60).toString().padStart(2,'0')} (${duration} seconds)`);
      
      console.log('🔄 Starting audio splitting...');
      const chunks = await this.splitAudioIntoChunks(videoUrl, chunkDurationSeconds);
      console.log(`🔄 Got ${chunks.length} chunks`);
      
      const funMessages = [
        '👾 LEVEL 1: Scanning audio waves...',
        '🚀 LEVEL 2: Deploying speech recognition...',
        '💥 LEVEL 3: Destroying silence barriers...',
        '⚡ LEVEL 4: Capturing voice patterns...',
        '🎯 LEVEL 5: Lock and load captions...',
        '🏆 BOSS FIGHT: Final transcription processing...'
      ];
      
      let fullTranscription = '';
      
      // Process chunks in parallel for speed
      const chunkPromises = chunks.map(async (chunkBuffer, index) => {
        const actualIndex = index + 1;
        const chunkPath = path.join(__dirname, '../uploads', `chunk_local_${Date.now()}_${actualIndex}.wav`);
        
        console.log(`🎯 Processing chunk ${actualIndex}/${chunks.length}: ${chunkBuffer.length} bytes`);
        
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
          
          // Run local whisper transcription
          const transcription = await this.runWhisper(chunkPath, model);
          
          // Parse segments and adjust timing
          const adjustedSegments = transcription.segments.map(segment => ({
            start: segment.start + chunkStartTime,
            end: segment.end + chunkStartTime,
            text: segment.text
          }));
          
          return { 
            index: actualIndex, 
            text: transcription.text || '',
            segments: adjustedSegments
          };
          
        } finally {
          // Clean up chunk file
          try {
            await fs.unlink(chunkPath);
          } catch (e) {
            // File might already be deleted
          }
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
      
      console.log(`✅ Combined ${allSegments.length} segments with timing data (LOCAL)`);
      
      const result = {
        text: fullTranscription.trim(),
        segments: allSegments,
        language: 'en',
        model: model,
        provider: 'whisper.cpp'
      };
      
      // Update transcription record with results
      console.log('💾 Saving transcription to database...');
      await this.updateTranscriptionStatus(transcriptionId, 'completed', 100, result);
      console.log('✅ LOCAL transcription completed successfully!');

      return result;
      
    } catch (error) {
      console.error('❌ LOCAL transcription error:', error);
      
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

  async ensureModel(modelName) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }
    
    const modelPath = path.join(this.modelsPath, model.file);
    
    try {
      await fs.access(modelPath);
      console.log(`✅ Model ${modelName} already available`);
    } catch (error) {
      console.log(`📥 Downloading model ${modelName} (${model.size})...`);
      
      // Download model
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(`curl -L -o "${modelPath}" "${model.url}"`, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            console.log(`✅ Model ${modelName} downloaded successfully`);
            resolve();
          }
        });
      });
    }
  }

  async runWhisper(audioPath, model) {
    return new Promise((resolve, reject) => {
      const modelPath = path.join(this.modelsPath, this.models[model].file);
      
      // Generate output paths
      const outputBase = audioPath.replace(path.extname(audioPath), '');
      const srtOutput = `${outputBase}.srt`;
      
      // Command to run whisper with SRT output (correct format for whisper-cli.exe)
      const command = `"${this.whisperPath}" -m "${modelPath}" -f "${audioPath}" --output-srt --output-file "${outputBase}" --no-prints`;
      
      console.log(`🏠 Running LOCAL whisper: ${command}`);
      
      exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
        console.log(`🏠 Whisper stdout: ${stdout}`);
        console.log(`🏠 Whisper stderr: ${stderr}`);
        
        if (error) {
          console.error(`❌ Whisper execution error: ${error}`);
          console.error(`❌ Error code: ${error.code}`);
          console.error(`❌ Error signal: ${error.signal}`);
          reject(error);
          return;
        }
        
        try {
          // Parse SRT output for segments
          let segments = [];
          let text = '';
          
          try {
            const srtContent = await fs.readFile(srtOutput, 'utf8');
            console.log('📄 SRT content received, parsing...');
            
            // Parse SRT format
            const srtBlocks = srtContent.trim().split(/\n\s*\n/);
            
            for (const block of srtBlocks) {
              const lines = block.trim().split('\n');
              if (lines.length >= 3) {
                const timeRange = lines[1];
                const captionText = lines.slice(2).join(' ');
                
                // Parse time format: 00:00:10,500 --> 00:00:13,240
                const timeMatch = timeRange.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (timeMatch) {
                  const startTime = parseInt(timeMatch[1]) * 3600 + 
                                   parseInt(timeMatch[2]) * 60 + 
                                   parseInt(timeMatch[3]) + 
                                   parseInt(timeMatch[4]) / 1000;
                  const endTime = parseInt(timeMatch[5]) * 3600 + 
                                 parseInt(timeMatch[6]) * 60 + 
                                 parseInt(timeMatch[7]) + 
                                 parseInt(timeMatch[8]) / 1000;
                  
                  segments.push({
                    start: startTime,
                    end: endTime,
                    text: captionText.trim()
                  });
                }
              }
            }
            
            text = segments.map(s => s.text).join(' ');
            console.log(`✅ Parsed ${segments.length} segments from SRT`);
            
          } catch (srtError) {
            console.log('ℹ️ No SRT output, using stdout');
            // Use stdout as fallback
            text = stdout.trim();
            segments = [{
              start: 0,
              end: 10,
              text: text
            }];
          }
          
          // Clean up output files
          try {
            await fs.unlink(srtOutput);
          } catch (e) {
            // File might not exist
          }
          
          resolve({
            text: text.trim(),
            segments: segments
          });
          
        } catch (parseError) {
          console.error(`❌ Error parsing whisper output: ${parseError}`);
          reject(parseError);
        }
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
          .audioCodec('pcm_s16le') // WAV format for whisper.cpp
          .audioFrequency(16000)   // 16kHz sample rate
          .audioChannels(1)        // Mono
          .format('wav')
          .seekInput(startTime)
          .duration(chunkDurationSeconds)
          .on('error', (err) => {
            console.error(`❌ FFmpeg chunk error: ${err}`);
            reject(err);
          })
          .pipe()
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => {
            console.log(`✅ Created chunk buffer: ${Buffer.concat(chunks).length} bytes`);
            resolve(Buffer.concat(chunks));
          })
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

module.exports = new WhisperLocalService();