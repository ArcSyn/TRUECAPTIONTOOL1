// Local Development Server - No Supabase Required
require("dotenv").config();

console.log('🏠 Starting CapEdify LOCAL Server (No Supabase)...');

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION - Server would crash without this handler:', error);
  console.error('❌ Stack trace:', error.stack);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED PROMISE REJECTION - Server would crash without this handler:', reason);
  console.error('❌ Promise:', promise);
  // Don't exit - keep server running
});

// Debug environment variables
console.log('🔧 Environment variables loaded:');
console.log(`🔧 TRANSCRIPTION_MODE: ${process.env.TRANSCRIPTION_MODE}`);
console.log(`🔧 WHISPER_MODEL: ${process.env.WHISPER_MODEL}`);
console.log(`🔧 PORT: ${process.env.PORT}`);

const express = require("express");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generate UUID alternative using crypto
function generateId() {
  return crypto.randomUUID();
}
// Import whisper functionality but handle it locally
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Import Phase 3 agents
const whisperChunkerAgent = require('./services/whisperChunkerAgent');
const aeJSXExporterAgent = require('./services/aeJSXExporterAgent');

// Helper function to get video duration
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('❌ Error getting video duration:', err);
        reject(err);
      } else {
        const duration = metadata.format.duration;
        console.log(`📊 Video duration detected: ${duration} seconds`);
        resolve(duration);
      }
    });
  });
}

// Local whisper transcription function with Phase 3 chunking support
async function localWhisperTranscribe(videoPath, transcriptionId) {
  console.log('🎯 Starting LOCAL whisper transcription for ID:', transcriptionId);
  console.log('📂 Video path:', videoPath);
  
  try {
    // Update status to processing
    const transcriptions = loadJSON(transcriptionsFile);
    transcriptions[transcriptionId].status = 'processing';
    transcriptions[transcriptionId].progress = 10;
    transcriptions[transcriptionId].status_message = '🎧 Starting whisper processing...';
    saveJSON(transcriptionsFile, transcriptions);

    // Get video duration to determine processing strategy
    console.log('📊 Analyzing video duration...');
    const videoDuration = await getVideoDuration(videoPath);
    console.log(`📊 Video duration: ${Math.floor(videoDuration/60)}:${Math.floor(videoDuration%60).toString().padStart(2,'0')} (${videoDuration}s)`);
    
    // Phase 3: Use chunked processing for videos longer than 45 seconds
    const CHUNKING_THRESHOLD = 45; // seconds
    
    if (videoDuration > CHUNKING_THRESHOLD) {
      console.log('🚀 Phase 3: Using chunked transcription for long-form video');
      
      // Update status message
      const currentTranscriptions = loadJSON(transcriptionsFile);
      currentTranscriptions[transcriptionId].status_message = '🎯 Phase 3: Chunked processing for long video...';
      saveJSON(transcriptionsFile, currentTranscriptions);
      
      // Use WhisperChunkerAgent for long videos with comprehensive error handling
      let result;
      try {
        console.log(`🔍 DEBUG: Calling WhisperChunkerAgent for ${videoDuration}s video`);
        console.log(`🔍 DEBUG: Video path: ${videoPath}`);
        console.log(`🔍 DEBUG: Expected chunks: ~${Math.ceil(videoDuration / 28)} chunks`);
        
        result = await whisperChunkerAgent.transcribeFullLength(
          videoPath, 
          'small', // Use small model for balance of speed/accuracy
          (progress, message) => {
            // Progress callback with detailed logging
            console.log(`🔍 DEBUG: Progress update: ${progress}% - ${message}`);
            const currentTranscriptions = loadJSON(transcriptionsFile);
            currentTranscriptions[transcriptionId].progress = progress;
            currentTranscriptions[transcriptionId].status_message = message;
            saveJSON(transcriptionsFile, currentTranscriptions);
          }
        );
        
        // Validate result
        console.log(`🔍 DEBUG: WhisperChunkerAgent completed`);
        console.log(`🔍 DEBUG: Result segments: ${result?.segments?.length || 0}`);
        console.log(`🔍 DEBUG: Result text length: ${result?.text?.length || 0} chars`);
        console.log(`🔍 DEBUG: Result provider: ${result?.provider || 'unknown'}`);
        
        // Validation checks
        if (!result) {
          throw new Error('WhisperChunkerAgent returned null/undefined result');
        }
        
        if (!result.segments || result.segments.length === 0) {
          throw new Error('WhisperChunkerAgent returned no segments');
        }
        
        if (result.text && result.text.length < 100) {
          console.warn(`⚠️ WARNING: Very short transcription (${result.text.length} chars) for ${videoDuration}s video`);
        }
        
        // Check if we got reasonable segment coverage
        const lastSegment = result.segments[result.segments.length - 1];
        const timelineCoverage = lastSegment ? lastSegment.end : 0;
        const expectedCoverage = videoDuration * 0.8; // At least 80% coverage expected
        
        if (timelineCoverage < expectedCoverage) {
          console.warn(`⚠️ WARNING: Timeline coverage is low - got ${timelineCoverage.toFixed(1)}s, expected ~${expectedCoverage.toFixed(1)}s`);
        }
        
        console.log(`✅ Phase 3 validation passed - ${result.segments.length} segments covering ${timelineCoverage.toFixed(1)}s`);
        
      } catch (chunkerError) {
        console.error('❌ WhisperChunkerAgent failed:', chunkerError);
        console.error('❌ Error details:', {
          message: chunkerError.message,
          stack: chunkerError.stack,
          videoPath: videoPath,
          videoDuration: videoDuration
        });
        
        // Update status with error details
        const errorTranscriptions = loadJSON(transcriptionsFile);
        errorTranscriptions[transcriptionId].status_message = `❌ Chunking failed: ${chunkerError.message}`;
        saveJSON(transcriptionsFile, errorTranscriptions);
        
        throw new Error(`Phase 3 chunking failed: ${chunkerError.message}`);
      }
      
      // Update with final result
      const finalTranscriptions = loadJSON(transcriptionsFile);
      finalTranscriptions[transcriptionId].status = 'completed';
      finalTranscriptions[transcriptionId].progress = 100;
      finalTranscriptions[transcriptionId].result = result;
      finalTranscriptions[transcriptionId].status_message = '✅ Phase 3: Long-form transcription complete!';
      saveJSON(transcriptionsFile, finalTranscriptions);
      
      console.log('✅ Phase 3 chunked transcription completed successfully!');
      return result;
      
    } else {
      console.log('🔄 Phase 2: Using standard processing for short video');
      
      // Whisper setup for short videos (Phase 2 compatibility)
      const whisperPath = path.join(__dirname, '../whisper-cpp/Release/whisper-cli.exe');
      const modelsPath = path.join(__dirname, '../whisper-cpp/models/ggml-small.bin');
      
      console.log('🔍 Checking whisper executable:', whisperPath);
      console.log('🔍 Checking model:', modelsPath);
      
      if (!require('fs').existsSync(whisperPath)) {
        throw new Error(`Whisper executable not found at: ${whisperPath}`);
      }
      
      if (!require('fs').existsSync(modelsPath)) {
        throw new Error(`Whisper model not found at: ${modelsPath}`);
      }

      // Update progress
      const currentTranscriptions = loadJSON(transcriptionsFile);
      currentTranscriptions[transcriptionId].progress = 50;
      currentTranscriptions[transcriptionId].status_message = '🎯 Processing audio with whisper.cpp...';
      saveJSON(transcriptionsFile, currentTranscriptions);

      // Extract audio first, then run whisper
      console.log('🎵 Extracting audio from video...');
      const audioPath = await extractAudioFromVideo(videoPath);
      
      // Update progress
      const progressTranscriptions = loadJSON(transcriptionsFile);
      progressTranscriptions[transcriptionId].progress = 75;
      progressTranscriptions[transcriptionId].status_message = '🎯 Running whisper on audio...';
      saveJSON(transcriptionsFile, progressTranscriptions);
      
      // Run whisper on the extracted audio
      const result = await runWhisperLocal(audioPath, whisperPath, modelsPath);
      
      // Clean up audio file
      try {
        require('fs').unlinkSync(audioPath);
      } catch (e) {
        // File might not exist
      }
      
      // Update with final result
      const finalTranscriptions = loadJSON(transcriptionsFile);
      finalTranscriptions[transcriptionId].status = 'completed';
      finalTranscriptions[transcriptionId].progress = 100;
      finalTranscriptions[transcriptionId].result = result;
      finalTranscriptions[transcriptionId].status_message = '✅ Transcription complete!';
      saveJSON(transcriptionsFile, finalTranscriptions);
      
      console.log('✅ Local transcription completed successfully!');
      return result;
    }
    
  } catch (error) {
    console.error('❌ Local transcription error:', error);
    
    // Update with error
    const transcriptions = loadJSON(transcriptionsFile);
    transcriptions[transcriptionId].status = 'error';
    transcriptions[transcriptionId].error = error.message;
    transcriptions[transcriptionId].status_message = `❌ Error: ${error.message}`;
    saveJSON(transcriptionsFile, transcriptions);
    
    throw error;
  }
}

// Helper function to extract audio from video using FFmpeg
function extractAudioFromVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(path.extname(videoPath), '_audio.wav');
    
    console.log('🎵 Extracting audio:', videoPath, '->', audioPath);
    
    ffmpeg(videoPath)
      .audioCodec('pcm_s16le') // 16-bit PCM WAV format that whisper likes
      .audioFrequency(16000)   // 16kHz sample rate (whisper's preferred)
      .audioChannels(1)        // Mono
      .noVideo()               // Remove video track
      .format('wav')
      .output(audioPath)
      .on('end', () => {
        console.log('✅ Audio extraction completed:', audioPath);
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('❌ Audio extraction failed:', err);
        reject(err);
      })
      .run();
  });
}

// Helper function to run whisper
function runWhisperLocal(audioPath, whisperPath, modelPath) {
  return new Promise((resolve, reject) => {
    const outputBase = audioPath.replace(path.extname(audioPath), '');
    const srtOutput = `${outputBase}.srt`;
    
    // Use SRT format - removed duration limit for full-length processing
    const command = `"${whisperPath}" -m "${modelPath}" --output-srt --output-file "${outputBase}" --no-prints "${audioPath}"`;
    
    console.log('🏠 Running LOCAL whisper:', command);
    
    exec(command, { timeout: 60000 }, async (error, stdout, stderr) => {
      console.log(`🏠 Whisper stdout: ${stdout}`);
      console.log(`🏠 Whisper stderr: ${stderr}`);
      
      if (error) {
        console.error('❌ Whisper execution error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error signal:', error.signal);
        reject(error);
        return;
      }
      
      try {
        // Parse SRT output for segments
        let segments = [];
        let text = '';
        
        try {
          if (require('fs').existsSync(srtOutput)) {
            const srtContent = require('fs').readFileSync(srtOutput, 'utf8');
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
            
            // Clean up SRT file
            require('fs').unlinkSync(srtOutput);
            
          } else {
            console.log('ℹ️ No SRT output, using stdout');
            text = stdout.trim() || 'No audio detected';
            segments = [{
              start: 0,
              end: 10,
              text: text
            }];
          }
          
        } catch (srtError) {
          console.log('ℹ️ SRT parsing failed, using stdout');
          text = stdout.trim() || 'Transcription completed but no text extracted';
          segments = [{
            start: 0,
            end: 10,
            text: text
          }];
        }
        
        if (!text || text.trim() === '') {
          text = 'Audio processed but no speech detected';
        }
        
        resolve({
          text: text.trim(),
          segments: segments,
          language: 'en',
          model: 'whisper-small',
          provider: 'whisper.cpp-local'
        });
        
      } catch (parseError) {
        console.error('❌ Error parsing whisper output:', parseError);
        reject(parseError);
      }
    });
  });
}

const app = express();
const PORT = process.env.PORT || 4000;

// Create required directories
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Local JSON database files
const videosFile = path.join(dataDir, 'videos.json');
const transcriptionsFile = path.join(dataDir, 'transcriptions.json');

// Initialize JSON files if they don't exist
function initLocalDB() {
  if (!fs.existsSync(videosFile)) {
    fs.writeFileSync(videosFile, JSON.stringify({}));
  }
  if (!fs.existsSync(transcriptionsFile)) {
    fs.writeFileSync(transcriptionsFile, JSON.stringify({}));
  }
}

// Helper functions for local JSON database
function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`⚠️ JSON load warning for ${file}:`, error.message);
    return {};
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ JSON save error for ${file}:`, error.message);
    // Try creating directory if it doesn't exist
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } else {
      throw error; // Re-throw if it's not a directory issue
    }
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize local database
initLocalDB();

// Import and use pipeline routes
const pipelineRoutes = require('./routes/pipelineRoutes');
app.use('/api/pipeline', pipelineRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: '✅ LOCAL Server is healthy - Phase 3 Ready',
    timestamp: new Date().toISOString(),
    port: PORT,
    mode: 'LOCAL',
    phase: '3',
    endpoints: {
      health: '/health',
      videos: '/api/videos',
      transcribe: '/api/transcribe',
      pipeline_run: '/api/pipeline/run',
      pipeline_status: '/api/pipeline/status/:jobId',
      pipeline_download: '/api/pipeline/download/:jobId',
      export_phase2: '/api/export/jsx/enhanced',
      export_phase3_jsx: '/api/export/jsx/phase3',
      export_phase3_srt: '/api/export/srt/phase3',
      export_phase3_vtt: '/api/export/vtt/phase3',
      export_phase3_json: '/api/export/json/phase3'
    },
    features: {
      chunked_transcription: true,
      long_form_videos: '3-5+ minutes',
      after_effects_jsx: true,
      ecma2018_syntax: true,
      fade_animations: true,
      multiple_styles: ['modern', 'minimal', 'bold', 'podcast', 'cinematic'],
      multiple_positions: ['bottom', 'top', 'center', 'corners'],
      export_formats: ['jsx', 'srt', 'vtt', 'json']
    },
    environment: {
      node_version: process.version,
      local_mode: true,
      whisper_available: true,
      whisper_chunker_agent: true,
      ae_jsx_exporter_agent: true
    }
  });
});

// GET /api/videos - List uploaded videos
app.get('/api/videos', (req, res) => {
  try {
    const videos = loadJSON(videosFile);
    const videoList = Object.values(videos).map(video => ({
      id: video.id,
      size: video.size,
      status: video.status,
      original_name: video.original_name,
      created_at: video.created_at
    }));
    
    res.json({
      success: true,
      videos: videoList
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
});

// POST /api/videos/upload - Upload video and create transcription
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded'
      });
    }

    console.log('📁 File uploaded:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });

    // Generate IDs
    const videoId = generateId();
    const transcriptionId = generateId();
    
    // Create video record
    const video = {
      id: videoId,
      original_name: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      public_url: `file://${req.file.path}`,
      status: 'uploaded',
      created_at: new Date().toISOString()
    };

    // Create transcription record
    const transcription = {
      id: transcriptionId,
      video_id: videoId,
      model: 'whisper-large-v3',
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      result: null,
      error: null
    };

    // Save to local JSON database
    const videos = loadJSON(videosFile);
    const transcriptions = loadJSON(transcriptionsFile);
    
    videos[videoId] = video;
    transcriptions[transcriptionId] = transcription;
    
    saveJSON(videosFile, videos);
    saveJSON(transcriptionsFile, transcriptions);

    console.log('✅ Video and transcription records created');
    console.log('📹 Video ID:', videoId);
    console.log('📝 Transcription ID:', transcriptionId);

    res.json({
      success: true,
      video: video,
      transcription: transcription
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// POST /api/transcribe - Start transcription
app.post('/api/transcribe', async (req, res) => {
  try {
    const { videoId, transcriptionId, model } = req.body;
    
    console.log('🎯 Starting transcription request:');
    console.log('📹 Video ID:', videoId);
    console.log('📝 Transcription ID:', transcriptionId);
    console.log('🤖 Model:', model);

    // Get video and transcription from local database
    const videos = loadJSON(videosFile);
    const transcriptions = loadJSON(transcriptionsFile);
    
    const video = videos[videoId];
    const transcription = transcriptions[transcriptionId];

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    console.log('✅ Video found:', video.filename);
    console.log('🔗 Video path:', video.path);

    // Update transcription status to processing
    transcription.status = 'processing';
    transcription.progress = 0;
    transcription.updated_at = new Date().toISOString();
    
    transcriptions[transcriptionId] = transcription;
    saveJSON(transcriptionsFile, transcriptions);

    console.log('✅ Transcription status updated to processing');

    // Start transcription process asynchronously with enhanced error handling
    console.log('🚀 Starting background transcription process...');
    
    (async () => {
      try {
        const result = await localWhisperTranscribe(video.path, transcriptionId);
        console.log('✅ Transcription completed successfully');
        
        // Update transcription with result - wrapped in try/catch
        try {
          const currentTranscriptions = loadJSON(transcriptionsFile);
          currentTranscriptions[transcriptionId].status = 'completed';
          currentTranscriptions[transcriptionId].progress = 100;
          currentTranscriptions[transcriptionId].result = result;
          currentTranscriptions[transcriptionId].updated_at = new Date().toISOString();
          saveJSON(transcriptionsFile, currentTranscriptions);
          console.log('✅ Transcription result saved successfully');
        } catch (saveError) {
          console.error('❌ Error saving transcription result:', saveError.message);
          // Don't crash the server - the transcription still succeeded
        }
        
      } catch (error) {
        console.error('❌ Transcription failed:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Update transcription with error - wrapped in try/catch
        try {
          const currentTranscriptions = loadJSON(transcriptionsFile);
          currentTranscriptions[transcriptionId].status = 'error';
          currentTranscriptions[transcriptionId].error = error.message || 'Unknown transcription error';
          currentTranscriptions[transcriptionId].updated_at = new Date().toISOString();
          saveJSON(transcriptionsFile, currentTranscriptions);
          console.log('✅ Error status saved successfully');
        } catch (saveError) {
          console.error('❌ Error saving error status:', saveError.message);
          // Last resort - log the transcription ID so we can manually check
          console.error(`❌ CRITICAL: Unable to update status for transcription ${transcriptionId}`);
        }
      }
    })();

    console.log('✅ Transcription request accepted - processing in background');
    res.json({ 
      success: true, 
      message: 'Transcription started' 
    });

  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to start transcription' 
    });
  }
});

// GET /api/transcribe/:id - Get transcription status
app.get('/api/transcribe/:id', (req, res) => {
  try {
    const transcriptionId = req.params.id;
    console.log('🔍 Checking transcription status for ID:', transcriptionId);
    
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[transcriptionId];

    if (!transcription) {
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
        transcription.status = 'error';
        transcription.error = 'Transcription timeout - please retry';
        transcription.updated_at = new Date().toISOString();
        
        transcriptions[transcriptionId] = transcription;
        saveJSON(transcriptionsFile, transcriptions);
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

// JSX Export endpoint
app.get('/api/export/jsx/enhanced', (req, res) => {
  try {
    const { id, style = 'modern', scene_detection = 'false' } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transcription ID is required'
      });
    }

    console.log('📤 JSX Export request:', { id, style, scene_detection });
    
    // Get transcription data
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[id];

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    // Generate JSX content based on style
    const jsxContent = generateJSXContent(transcription.result, style);
    
    console.log('✅ JSX content generated successfully');
    
    res.set({
      'Content-Type': 'application/javascript',
      'Content-Disposition': `attachment; filename="captions_${style}_${Date.now()}.jsx"`
    });
    
    res.send(jsxContent);

  } catch (error) {
    console.error('❌ JSX export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export JSX'
    });
  }
});

// Helper function to generate JSX content
function generateJSXContent(transcriptionResult, style) {
  const { text, segments } = transcriptionResult;
  
  // Default segments if none exist
  const validSegments = segments && segments.length > 0 ? segments : [
    { start: 0, end: 10, text: text || 'No text available' }
  ];

  const styleConfig = {
    modern: {
      font: 'Montserrat-Bold',
      size: 120,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 8,
      shadowOpacity: 0.8
    },
    minimal: {
      font: 'Arial-Bold',
      size: 100,
      color: '#FFFFFF',
      strokeColor: '#333333',
      strokeWidth: 4,
      shadowOpacity: 0.5
    },
    bold: {
      font: 'Impact',
      size: 140,
      color: '#FFFF00',
      strokeColor: '#000000',
      strokeWidth: 12,
      shadowOpacity: 1.0
    }
  };

  const config = styleConfig[style] || styleConfig.modern;
  
  const jsxTemplate = `// After Effects JSX Caption Script
// Generated by CapEdify
// Style: ${style}

app.beginUndoGroup("Import Captions");

try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition first");
    } else {
        // Caption data
        var captions = ${JSON.stringify(validSegments, null, 8)};
        
        // Style configuration
        var style = {
            font: "${config.font}",
            size: ${config.size},
            color: [${hexToRgb(config.color).join(', ')}],
            strokeColor: [${hexToRgb(config.strokeColor).join(', ')}],
            strokeWidth: ${config.strokeWidth},
            shadowOpacity: ${config.shadowOpacity}
        };
        
        // Create text layers for each caption
        for (var i = 0; i < captions.length; i++) {
            var caption = captions[i];
            var textLayer = comp.layers.addText(caption.text);
            var textProp = textLayer.property("Source Text");
            var textDocument = textProp.value;
            
            // Apply styling
            textDocument.resetCharStyle();
            textDocument.fontSize = style.size;
            textDocument.fillColor = style.color;
            textDocument.strokeColor = style.strokeColor;
            textDocument.strokeWidth = style.strokeWidth;
            textDocument.font = style.font;
            textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
            textDocument.applyStroke = true;
            textDocument.applyFill = true;
            
            textProp.setValue(textDocument);
            
            // Position at bottom center
            textLayer.property("Transform").property("Position").setValue([comp.width/2, comp.height * 0.85]);
            textLayer.property("Transform").property("Anchor Point").setValue([0, 0]);
            
            // Set timing
            textLayer.startTime = caption.start;
            textLayer.outPoint = caption.end;
            
            // Add drop shadow
            var dropShadow = textLayer.property("Effects").addProperty("Drop Shadow");
            dropShadow.property("Opacity").setValue(style.shadowOpacity * 100);
            dropShadow.property("Direction").setValue(135);
            dropShadow.property("Distance").setValue(15);
            dropShadow.property("Softness").setValue(20);
        }
        
        alert("Successfully imported " + captions.length + " captions!");
    }
} catch (error) {
    alert("Error: " + error.toString());
}

app.endUndoGroup();

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}`;

  return jsxTemplate;
}

// Helper function to convert hex to RGB array
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r.toFixed(3), g.toFixed(3), b.toFixed(3)];
}

// Phase 3: Enhanced JSX Export endpoint with AEJSXExporterAgent
app.get('/api/export/jsx/phase3', (req, res) => {
  try {
    const { 
      id, 
      style = 'modern', 
      position = 'bottom',
      enableFades = 'true',
      enableStroke = 'true', 
      enableShadow = 'true',
      exportMode = 'inline'
    } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transcription ID is required'
      });
    }

    console.log('📤 Phase 3 JSX Export request:', { 
      id, style, position, enableFades, enableStroke, enableShadow, exportMode 
    });
    
    // Get transcription data
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[id];

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    if (!transcription.result || !transcription.result.segments) {
      return res.status(400).json({
        success: false,
        error: 'No segments found in transcription result'
      });
    }

    // Validate segments with AEJSXExporterAgent
    try {
      aeJSXExporterAgent.validateSegments(transcription.result.segments);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: `Invalid segment data: ${validationError.message}`
      });
    }

    // Generate JSX content using AEJSXExporterAgent
    const exportOptions = {
      style: style,
      position: position,
      enableFades: enableFades === 'true',
      enableStroke: enableStroke === 'true',
      enableShadow: enableShadow === 'true',
      centerAlign: true,
      exportMode: exportMode,
      filename: `captions_${id}.json`
    };

    const jsxContent = aeJSXExporterAgent.generateMainLoader(
      transcription.result.segments, 
      exportOptions
    );
    
    console.log('✅ Phase 3 JSX content generated successfully');
    console.log(`📊 Exported ${transcription.result.segments.length} segments`);
    
    // Set response headers for JSX download
    res.set({
      'Content-Type': 'application/javascript',
      'Content-Disposition': `attachment; filename="main_loader_${style}_${Date.now()}.jsx"`
    });
    
    res.send(jsxContent);

  } catch (error) {
    console.error('❌ Phase 3 JSX export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export Phase 3 JSX'
    });
  }
});

// Phase 3: SRT Export endpoint
app.get('/api/export/srt/phase3', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transcription ID is required'
      });
    }

    console.log('📤 Phase 3 SRT Export request:', { id });
    
    // Get transcription data
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[id];

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    if (!transcription.result || !transcription.result.segments) {
      return res.status(400).json({
        success: false,
        error: 'No segments found in transcription result'
      });
    }

    // Generate SRT content using AEJSXExporterAgent
    const srtContent = aeJSXExporterAgent.generateSRT(transcription.result.segments);
    
    console.log('✅ Phase 3 SRT content generated successfully');
    console.log(`📊 Exported ${transcription.result.segments.length} segments`);
    
    // Set response headers for SRT download
    res.set({
      'Content-Type': 'application/x-subrip',
      'Content-Disposition': `attachment; filename="captions_${id}_${Date.now()}.srt"`
    });
    
    res.send(srtContent);

  } catch (error) {
    console.error('❌ Phase 3 SRT export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export Phase 3 SRT'
    });
  }
});

// Phase 3: VTT Export endpoint
app.get('/api/export/vtt/phase3', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transcription ID is required'
      });
    }

    console.log('📤 Phase 3 VTT Export request:', { id });
    
    // Get transcription data
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[id];

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    if (!transcription.result || !transcription.result.segments) {
      return res.status(400).json({
        success: false,
        error: 'No segments found in transcription result'
      });
    }

    // Generate VTT content using AEJSXExporterAgent
    const vttContent = aeJSXExporterAgent.generateVTT(transcription.result.segments);
    
    console.log('✅ Phase 3 VTT content generated successfully');
    console.log(`📊 Exported ${transcription.result.segments.length} segments`);
    
    // Set response headers for VTT download
    res.set({
      'Content-Type': 'text/vtt',
      'Content-Disposition': `attachment; filename="captions_${id}_${Date.now()}.vtt"`
    });
    
    res.send(vttContent);

  } catch (error) {
    console.error('❌ Phase 3 VTT export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export Phase 3 VTT'
    });
  }
});

// Phase 3: JSON Export endpoint (for external JSX import)
app.get('/api/export/json/phase3', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transcription ID is required'
      });
    }

    console.log('📤 Phase 3 JSON Export request:', { id });
    
    // Get transcription data
    const transcriptions = loadJSON(transcriptionsFile);
    const transcription = transcriptions[id];

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (transcription.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Transcription not completed yet'
      });
    }

    if (!transcription.result || !transcription.result.segments) {
      return res.status(400).json({
        success: false,
        error: 'No segments found in transcription result'
      });
    }

    // Generate JSON file using AEJSXExporterAgent
    const jsonFile = aeJSXExporterAgent.generateSegmentJSON(
      transcription.result.segments, 
      `captions_${id}.json`
    );
    
    console.log('✅ Phase 3 JSON content generated successfully');
    console.log(`📊 Exported ${transcription.result.segments.length} segments`);
    
    // Set response headers for JSON download
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${jsonFile.filename}"`
    });
    
    res.send(jsonFile.content);

  } catch (error) {
    console.error('❌ Phase 3 JSON export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export Phase 3 JSON'
    });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      status: 400, 
      message: err.message 
    });
  }
  next(err);
});

app.use((req, res) => {
  res.status(404).json({ error: `Path ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CapEdify LOCAL Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎥 Video API: http://localhost:${PORT}/api/videos`);
  console.log(`📝 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`🏠 Mode: LOCAL (No Supabase Required)`);
  console.log(`🎧 Transcription: ${process.env.TRANSCRIPTION_MODE || 'LOCAL'} using whisper.cpp`);
});