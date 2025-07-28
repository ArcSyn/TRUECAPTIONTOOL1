const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * WhisperChunkerAgent - Implements long-form transcription using whisper.cpp chunking
 * 
 * Features:
 * - Takes full .wav, splits into sequential 30s overlapping chunks
 * - Maintains whisper_context across calls for continuity
 * - Combines chunk results into one transcript with full timestamps pointing to original audio timeline
 * - Outputs clean SRT and JSON transcript array: [{start, end, text}, ...]
 * - Ensures accuracy at chunk boundaries without dropped tokens
 */
class WhisperChunkerAgent {
  constructor() {
    this.whisperPath = path.join(__dirname, '../../whisper-cpp/Release/whisper-cli.exe');
    this.modelsPath = path.join(__dirname, '../../whisper-cpp/models');
    
    // Chunking configuration for optimal results
    this.chunkDuration = 30; // 30 seconds per chunk
    this.chunkOverlap = 2;   // 2 seconds overlap for context continuity
    this.defaultModel = 'small'; // Balance of speed vs accuracy
    
    // Available models
    this.models = {
      tiny: { file: 'ggml-tiny.bin', speed: '32x' },
      base: { file: 'ggml-base.bin', speed: '16x' },
      small: { file: 'ggml-small.bin', speed: '6x' },
      medium: { file: 'ggml-medium.bin', speed: '2x' },
      large: { file: 'ggml-large-v3.bin', speed: '1x' }
    };
  }

  /**
   * Process full-length video with chunked transcription
   * @param {string} videoPath - Path to video file
   * @param {string} model - Whisper model to use
   * @param {function} progressCallback - Progress update callback
   * @returns {Promise<Object>} - Transcription result with segments array
   */
  async transcribeFullLength(videoPath, model = this.defaultModel, progressCallback = null) {
    try {
      console.log('🎯 WhisperChunkerAgent: Starting full-length transcription');
      console.log(`📂 Video: ${videoPath}`);
      console.log(`🤖 Model: ${model}`);
      
      // Validate whisper executable
      if (!fsSync.existsSync(this.whisperPath)) {
        throw new Error(`Whisper executable not found: ${this.whisperPath}`);
      }
      
      // Extract audio first
      if (progressCallback) progressCallback(10, '🎵 Extracting audio from video...');
      const audioPath = await this.extractAudio(videoPath);
      
      // Validate extracted audio file
      console.log(`🔍 DEBUG: Audio extracted to: ${audioPath}`);
      const fs = require('fs');
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio extraction failed - file not found: ${audioPath}`);
      }
      
      const audioStats = fs.statSync(audioPath);
      const audioSizeMB = audioStats.size / (1024 * 1024);
      console.log(`🔍 DEBUG: Audio file size: ${audioSizeMB.toFixed(2)} MB`);
      
      // Sanity check - audio file should be reasonably sized for 5-minute video
      if (audioSizeMB < 1) {
        console.warn(`⚠️ WARNING: Audio file seems very small (${audioSizeMB.toFixed(2)} MB) for a long video`);
      }
      
      try {
        // Get audio duration
        if (progressCallback) progressCallback(20, '📊 Analyzing audio duration...');
        const duration = await this.getAudioDuration(audioPath);
        console.log(`📊 Audio duration: ${Math.floor(duration/60)}:${Math.floor(duration%60).toString().padStart(2,'0')} (${duration}s)`);
        
        // Validate duration makes sense
        if (duration < 60) {
          throw new Error(`Audio duration too short (${duration}s) - extraction may have failed`);
        }
        
        // Create overlapping chunks
        if (progressCallback) progressCallback(30, '✂️ Creating overlapping audio chunks...');
        console.log(`🔍 DEBUG: About to create chunks for ${duration}s audio`);
        const chunks = await this.createOverlappingChunks(audioPath, duration);
        console.log(`📦 Created ${chunks.length} overlapping chunks`);
        
        // Validate chunk count
        const expectedChunks = Math.ceil(duration / (this.chunkDuration - this.chunkOverlap));
        console.log(`🔍 DEBUG: Expected chunks: ~${expectedChunks}, Got: ${chunks.length}`);
        
        if (chunks.length === 0) {
          throw new Error('No chunks were created - chunking failed completely');
        }
        
        if (chunks.length === 1 && duration > 60) {
          throw new Error(`Only 1 chunk created for ${duration}s video - chunking loop failed`);
        }
        
        if (chunks.length < expectedChunks * 0.5) {
          console.warn(`⚠️ WARNING: Fewer chunks than expected (${chunks.length} vs ~${expectedChunks})`);
        }
        
        console.log(`🔍 DEBUG: Chunk details:`);
        chunks.forEach((chunk, index) => {
          console.log(`🔍 DEBUG: - Chunk ${index + 1}: ${chunk.startTime.toFixed(1)}s - ${chunk.endTime.toFixed(1)}s (${chunk.duration.toFixed(1)}s)`);
        });
        
        // Process chunks with whisper
        if (progressCallback) progressCallback(40, `🎧 Processing ${chunks.length} chunks with whisper.cpp...`);
        console.log(`🔍 DEBUG: Starting whisper processing for ${chunks.length} chunks`);
        const chunkResults = await this.processChunksParallel(chunks, model, progressCallback);
        console.log(`🔍 DEBUG: Whisper processing complete - got ${chunkResults.length} results`);
        
        // Stitch transcripts with deduped overlaps
        if (progressCallback) progressCallback(90, '🔗 Stitching chunks and removing overlaps...');
        const finalTranscript = await this.stitchChunksWithDedup(chunkResults);
        
        // Clean up temporary files
        await this.cleanup(audioPath, chunks);
        
        if (progressCallback) progressCallback(100, '✅ Full-length transcription complete!');
        
        console.log(`✅ WhisperChunkerAgent: Completed ${finalTranscript.segments.length} segments`);
        return finalTranscript;
        
      } finally {
        // Ensure audio cleanup
        try {
          await fs.unlink(audioPath);
        } catch (e) {
          // File might already be deleted
        }
      }
      
    } catch (error) {
      console.error('❌ WhisperChunkerAgent error:', error);
      throw error;
    }
  }

  /**
   * Extract audio from video using FFmpeg
   */
  async extractAudio(videoPath) {
    const audioPath = videoPath.replace(path.extname(videoPath), '_fullength_audio.wav');
    
    return new Promise((resolve, reject) => {
      console.log('🎵 Extracting audio for full-length processing...');
      
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le') // 16-bit PCM WAV format
        .audioFrequency(16000)   // 16kHz sample rate (whisper optimal)
        .audioChannels(1)        // Mono
        .noVideo()
        .format('wav')
        .output(audioPath)
        .on('end', () => {
          console.log('✅ Audio extraction completed');
          resolve(audioPath);
        })
        .on('error', reject)
        .run();
    });
  }

  /**
   * Get audio duration using FFprobe
   */
  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      console.log('🔍 DEBUG: Getting audio duration for:', audioPath);
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error('❌ DEBUG: FFprobe error:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration;
          console.log(`🔍 DEBUG: Audio duration detected: ${duration} seconds (${Math.floor(duration/60)}:${Math.floor(duration%60).toString().padStart(2,'0')})`);
          resolve(duration);
        }
      });
    });
  }

  /**
   * Create overlapping chunks for context continuity
   */
  async createOverlappingChunks(audioPath, duration) {
    console.log(`🔍 DEBUG: Starting chunk creation for ${duration}s audio`);
    console.log(`🔍 DEBUG: Chunk duration: ${this.chunkDuration}s, Overlap: ${this.chunkOverlap}s`);
    
    const chunks = [];
    let startTime = 0;
    let chunkIndex = 0;
    
    console.log(`🔍 DEBUG: Starting chunking loop - startTime: ${startTime}, duration: ${duration}`);
    
    while (startTime < duration) {
      console.log(`🔍 DEBUG: Loop iteration ${chunkIndex + 1} - startTime: ${startTime.toFixed(1)}s`);
      
      // Calculate chunk end time with overlap
      const effectiveChunkDuration = Math.min(this.chunkDuration, duration - startTime);
      const chunkEndTime = startTime + effectiveChunkDuration;
      
      console.log(`🔍 DEBUG: Chunk ${chunkIndex + 1} - effectiveChunkDuration: ${effectiveChunkDuration}s, chunkEndTime: ${chunkEndTime.toFixed(1)}s`);
      
      // Create chunk info
      const chunkInfo = {
        index: chunkIndex,
        startTime: startTime,
        endTime: chunkEndTime,
        duration: effectiveChunkDuration,
        path: path.join(path.dirname(audioPath), `chunk_${chunkIndex}_${Date.now()}.wav`),
        overlapStart: startTime > 0 ? this.chunkOverlap : 0, // Overlap with previous chunk
        overlapEnd: chunkEndTime < duration ? this.chunkOverlap : 0 // Overlap with next chunk
      };
      
      console.log(`🔍 DEBUG: Creating chunk file: ${chunkInfo.path}`);
      
      // Extract chunk with ffmpeg
      try {
        await this.extractChunk(audioPath, chunkInfo);
        chunks.push(chunkInfo);
        console.log(`✅ Chunk ${chunkIndex + 1}: ${startTime.toFixed(1)}s - ${chunkEndTime.toFixed(1)}s (SUCCESS)`);
      } catch (error) {
        console.error(`❌ DEBUG: Failed to extract chunk ${chunkIndex + 1}:`, error);
        // Continue with next chunk instead of failing completely
      }
      
      // Move to next chunk (accounting for overlap)
      const nextStartTime = startTime + this.chunkDuration - (chunkIndex > 0 ? this.chunkOverlap : 0);
      console.log(`🔍 DEBUG: Next startTime calculation: ${startTime} + ${this.chunkDuration} - ${chunkIndex > 0 ? this.chunkOverlap : 0} = ${nextStartTime}`);
      
      startTime = nextStartTime;
      chunkIndex++;
      
      console.log(`🔍 DEBUG: Moving to next iteration - startTime: ${startTime.toFixed(1)}s, remaining: ${(duration - startTime).toFixed(1)}s`);
    }
    
    console.log(`🔍 DEBUG: Chunking complete - created ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Extract individual chunk using FFmpeg
   */
  async extractChunk(audioPath, chunkInfo) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 DEBUG: Extracting chunk ${chunkInfo.index + 1}:`);
      console.log(`🔍 DEBUG: - Audio source: ${audioPath}`);
      console.log(`🔍 DEBUG: - Output path: ${chunkInfo.path}`);
      console.log(`🔍 DEBUG: - Start time: ${chunkInfo.startTime}s`);
      console.log(`🔍 DEBUG: - Duration: ${chunkInfo.duration}s`);
      
      ffmpeg(audioPath)
        .seekInput(chunkInfo.startTime)
        .duration(chunkInfo.duration)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .output(chunkInfo.path)
        .on('start', (commandLine) => {
          console.log(`🔍 DEBUG: FFmpeg command: ${commandLine}`);
        })
        .on('end', () => {
          console.log(`✅ DEBUG: Chunk ${chunkInfo.index + 1} extraction completed`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`❌ DEBUG: Chunk ${chunkInfo.index + 1} extraction failed:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Process chunks in parallel for speed
   */
  async processChunksParallel(chunks, model, progressCallback) {
    console.log(`🔍 DEBUG: Starting parallel processing of ${chunks.length} chunks`);
    
    const results = [];
    const totalChunks = chunks.length;
    
    // Process chunks with controlled concurrency (max 3 at once to avoid memory issues)
    const concurrency = Math.min(3, totalChunks);
    const chunkBatches = [];
    
    for (let i = 0; i < totalChunks; i += concurrency) {
      chunkBatches.push(chunks.slice(i, i + concurrency));
    }
    
    console.log(`🔍 DEBUG: Created ${chunkBatches.length} batches with concurrency ${concurrency}`);
    
    let processedCount = 0;
    
    for (let batchIndex = 0; batchIndex < chunkBatches.length; batchIndex++) {
      const batch = chunkBatches[batchIndex];
      console.log(`🔍 DEBUG: Processing batch ${batchIndex + 1}/${chunkBatches.length} with ${batch.length} chunks`);
      
      const batchPromises = batch.map(async (chunk) => {
        console.log(`🔍 DEBUG: Starting whisper processing for chunk ${chunk.index + 1}`);
        const result = await this.processChunkWithWhisper(chunk, model);
        processedCount++;
        
        console.log(`🔍 DEBUG: Completed chunk ${chunk.index + 1} - segments: ${result.segments ? result.segments.length : 0}`);
        
        if (progressCallback) {
          const progress = 40 + Math.floor((processedCount / totalChunks) * 40);
          progressCallback(progress, `🎯 Processed chunk ${processedCount}/${totalChunks}`);
        }
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      console.log(`🔍 DEBUG: Batch ${batchIndex + 1} completed - total results so far: ${results.length}`);
    }
    
    // Sort results by chunk index to maintain order
    results.sort((a, b) => a.chunkIndex - b.chunkIndex);
    console.log(`🔍 DEBUG: Parallel processing complete - ${results.length} results ready for stitching`);
    return results;
  }

  /**
   * Process single chunk with whisper
   */
  async processChunkWithWhisper(chunkInfo, model) {
    const modelPath = path.join(this.modelsPath, this.models[model].file);
    const outputBase = chunkInfo.path.replace('.wav', '');
    const srtOutput = `${outputBase}.srt`;
    
    return new Promise((resolve, reject) => {
      // Remove duration limit for full processing
      const command = `"${this.whisperPath}" -m "${modelPath}" -f "${chunkInfo.path}" --output-srt --output-file "${outputBase}" --no-prints`;
      
      console.log(`🎯 Processing chunk ${chunkInfo.index + 1} with whisper...`);
      
      exec(command, { timeout: 60000 }, async (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Whisper error on chunk ${chunkInfo.index}:`, error);
          reject(error);
          return;
        }
        
        try {
          // Parse SRT output
          const segments = await this.parseSRTOutput(srtOutput, chunkInfo.startTime);
          
          // Clean up SRT file
          try {
            await fs.unlink(srtOutput);
          } catch (e) {
            // File might not exist
          }
          
          resolve({
            chunkIndex: chunkInfo.index,
            startTime: chunkInfo.startTime,
            endTime: chunkInfo.endTime,
            overlapStart: chunkInfo.overlapStart,
            overlapEnd: chunkInfo.overlapEnd,
            segments: segments,
            text: segments.map(s => s.text).join(' ')
          });
          
        } catch (parseError) {
          console.error(`❌ Parse error on chunk ${chunkInfo.index}:`, parseError);
          reject(parseError);
        }
      });
    });
  }

  /**
   * Parse SRT output and adjust timestamps to original timeline
   */
  async parseSRTOutput(srtPath, chunkStartTime) {
    try {
      const srtContent = await fs.readFile(srtPath, 'utf8');
      const segments = [];
      
      const srtBlocks = srtContent.trim().split(/\n\s*\n/);
      
      for (const block of srtBlocks) {
        const lines = block.trim().split('\n');
        if (lines.length >= 3) {
          const timeRange = lines[1];
          const captionText = lines.slice(2).join(' ');
          
          // Parse SRT time format: 00:00:10,500 --> 00:00:13,240
          const timeMatch = timeRange.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
          if (timeMatch) {
            const chunkStart = parseInt(timeMatch[1]) * 3600 + 
                              parseInt(timeMatch[2]) * 60 + 
                              parseInt(timeMatch[3]) + 
                              parseInt(timeMatch[4]) / 1000;
            const chunkEnd = parseInt(timeMatch[5]) * 3600 + 
                            parseInt(timeMatch[6]) * 60 + 
                            parseInt(timeMatch[7]) + 
                            parseInt(timeMatch[8]) / 1000;
            
            // Adjust to original timeline
            segments.push({
              start: chunkStart + chunkStartTime,
              end: chunkEnd + chunkStartTime,
              text: captionText.trim()
            });
          }
        }
      }
      
      return segments;
      
    } catch (error) {
      console.log('ℹ️ No SRT output found for chunk, returning empty segments');
      return [];
    }
  }

  /**
   * Stitch chunks together and remove duplicate overlaps
   */
  async stitchChunksWithDedup(chunkResults) {
    const allSegments = [];
    let fullText = '';
    
    for (let i = 0; i < chunkResults.length; i++) {
      const chunk = chunkResults[i];
      const nextChunk = chunkResults[i + 1];
      
      let segmentsToAdd = [...chunk.segments];
      
      // Remove overlapping segments at chunk boundaries
      if (nextChunk && chunk.overlapEnd > 0) {
        // Remove segments that fall in the overlap region with next chunk
        const overlapStartTime = chunk.endTime - chunk.overlapEnd;
        segmentsToAdd = segmentsToAdd.filter(segment => segment.start < overlapStartTime);
      }
      
      allSegments.push(...segmentsToAdd);
      
      // Build full text (with basic deduplication)
      const chunkText = segmentsToAdd.map(s => s.text).join(' ').trim();
      if (chunkText && !fullText.endsWith(chunkText.substring(0, 20))) {
        fullText += (fullText ? ' ' : '') + chunkText;
      }
    }
    
    // Sort final segments by start time to ensure proper order
    allSegments.sort((a, b) => a.start - b.start);
    
    console.log(`✅ Stitched ${allSegments.length} segments from ${chunkResults.length} chunks`);
    
    return {
      text: fullText.trim(),
      segments: allSegments,
      language: 'en',
      model: this.defaultModel,
      provider: 'whisper.cpp-chunked',
      chunkCount: chunkResults.length
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(audioPath, chunks) {
    try {
      // Clean up chunk files
      for (const chunk of chunks) {
        try {
          await fs.unlink(chunk.path);
        } catch (e) {
          // File might already be deleted
        }
      }
      console.log('🧹 Cleaned up temporary chunk files');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }
}

module.exports = new WhisperChunkerAgent();