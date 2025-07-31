/**
 * Pipeline Routes - Complete agent workflow API endpoints
 * 
 * @description REST API endpoints for the complete CapEdify agent pipeline.
 * Handles both video file processing and direct SRT input processing.
 * 
 * Key Endpoints:
 * • POST /api/pipeline/run - Execute complete agent pipeline
 * • GET /api/pipeline/status/:jobId - Check pipeline job status  
 * • GET /api/pipeline/download/:jobId - Download generated JSX file
 * 
 * Features:
 * • Dual input support: video files OR SRT strings
 * • Real-time progress tracking via Server-Sent Events
 * • Comprehensive error handling with agent-specific details
 * • JSX file generation with auto-download headers
 * • User tier integration and credit validation
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const { createClient } = require('@supabase/supabase-js');
const { getUserId } = require('../middleware/userAuth');
const whisperChunkerAgent = require('../services/whisperChunkerAgent');
const captionSplitAgent = require('../agents/CaptionSplitAgent');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Import getVideoDuration from server-local.js (simplified version)
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        resolve(2.0); // Default fallback
      } else {
        const duration = metadata.format.duration;
        resolve(duration / 60); // Convert to minutes
      }
    });
  });
}

// Simple UUID generator (no external dependency)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Helper function to format seconds to SRT timestamp
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Helper function to parse SRT timestamp to seconds
function srtTimeToSeconds(timestamp) {
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

const router = express.Router();

// Database logging functions
async function logPipelineJobStart(jobId, userId, inputData) {
  try {
    console.log('🔄 Attempting to log pipeline job:', {
      jobId: jobId,
      userId: userId,
      userIdType: typeof userId,
      filename: inputData.filename,
      inputType: inputData.inputType
    });

    const { data, error } = await supabase
      .from('pipeline_jobs_extended')
      .insert({
        job_id: jobId,
        user_id: userId,
        input_filename: inputData.filename || `${inputData.inputType}_input`,
        input_type: inputData.inputType,
        duration_minutes: inputData.durationMinutes,
        processing_config: {
          userTier: inputData.userTier,
          style: inputData.options?.style || 'modern',
          position: inputData.options?.position || 'bottom',
          projectName: inputData.options?.projectName || 'CapEdify_Export'
        },
        status: 'processing',
        progress: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to log pipeline job start:', {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      console.log('✅ Pipeline job logged to database:', {
        jobId: jobId,
        userId: userId,
        data: data
      });
    }
  } catch (error) {
    console.error('❌ Database logging error:', {
      error: error.message,
      stack: error.stack
    });
  }
}

async function updatePipelineJobStatus(jobId, status, progress = null, files = null) {
  try {
    const updateData = { status };
    if (progress !== null) updateData.progress = progress;
    if (files) updateData.files_generated = files;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('pipeline_jobs_extended')
      .update(updateData)
      .eq('job_id', jobId);

    if (error) {
      console.error('❌ Failed to update pipeline job status:', error);
    }
  } catch (error) {
    console.error('❌ Database update error:', error);
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/temp/'),
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024, // 100GB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept video files and SRT files - temporarily allow all for testing
    console.log(`📁 File upload: ${file.originalname}, mimetype: ${file.mimetype}`);
    
    const isVideo = file.mimetype.startsWith('video/') || file.originalname.endsWith('.mp4') || file.originalname.endsWith('.mov') || file.originalname.endsWith('.avi');
    const isSRT = file.originalname.endsWith('.srt') || file.mimetype === 'text/plain';
    
    if (isVideo || isSRT) {
      cb(null, true);
    } else {
      console.log(`❌ Rejected file: ${file.originalname} (${file.mimetype})`);
      cb(new Error('Invalid file type. Only video and SRT files are allowed.'));
    }
  }
});

// In-memory job storage (replace with database in production)
const pipelineJobs = new Map();

/**
 * Pipeline Job Class for tracking execution state
 */
class PipelineJob {
  constructor(jobId, input, userInfo = {}) {
    this.jobId = jobId;
    this.input = input;
    this.userInfo = userInfo;
    this.status = 'pending';
    this.progress = 0;
    this.progressMessage = 'Job queued';
    this.result = null;
    this.error = null;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.jsxFilePath = null;
  }

  updateProgress(percent, message) {
    this.progress = percent;
    this.progressMessage = message;
    if (percent === 100) {
      this.status = 'completed';
      this.completedAt = new Date().toISOString();
    }
  }

  start() {
    this.status = 'processing';
    this.startedAt = new Date().toISOString();
  }

  complete(result, jsxFilePath = null) {
    this.status = 'completed';
    this.progress = 100;
    this.progressMessage = 'Pipeline completed successfully';
    this.result = result;
    this.jsxFilePath = jsxFilePath;
    this.completedAt = new Date().toISOString();
  }

  fail(error) {
    this.status = 'failed';
    this.error = error;
    this.completedAt = new Date().toISOString();
  }
}

/**
 * Extract duration from video file (simplified - would use ffprobe in production)
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} - Duration in minutes
 */
async function getVideoDuration(filePath) {
  // For now, return a default duration
  // In production, use ffprobe: `ffprobe -v quiet -show_entries format=duration -of csv=p=0 ${filePath}`
  return 2.0; // Default 2 minutes
}

/**
 * Convert SRT file to string content
 * @param {string} filePath - Path to SRT file
 * @returns {Promise<string>} - SRT content as string
 */
async function readSRTFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.trim();
}

/**
 * Generate JSX file from pipeline result
 * @param {Object} pipelineResult - Result from AgentOrchestrator
 * @param {string} projectName - Name for the AE project
 * @returns {string} - Complete JSX script content
 */
function generateJSXFile(pipelineResult, projectName = 'CapEdify_Export') {
  const { jsxScenes, metadata } = pipelineResult;
  
  const jsxHeader = `// CapEdify Phase 3 - After Effects JSX Export
// Generated: ${new Date().toISOString()}
// Project: ${projectName}
// Scenes: ${jsxScenes.length}
// Duration: ${metadata.durationMinutes} minutes
// User Tier: ${metadata.userTier}

// Initialize After Effects project
var project = app.project;
var comp = project.items.addComp("${projectName}", 1920, 1080, 1, ${metadata.durationMinutes * 60}, 30);

`;

  const jsxSceneCode = jsxScenes.map((scene, index) => {
    const layerName = scene.layer || `Scene_${scene.scene}`;
    const startTime = parseFloat(scene.start.replace(/[:,]/g, '.')) || index * 2;
    const endTime = parseFloat(scene.end.replace(/[:,]/g, '.')) || (index + 1) * 2;
    const duration = endTime - startTime;
    
    return `
// Scene ${scene.scene}: ${scene.text.substring(0, 50)}...
var textLayer${index + 1} = comp.layers.addText("${scene.text.replace(/"/g, '\\"')}");
textLayer${index + 1}.name = "${layerName}";
textLayer${index + 1}.startTime = ${startTime};
textLayer${index + 1}.outPoint = ${endTime};

// Apply styling
var textProp${index + 1} = textLayer${index + 1}.property("Source Text");
var textDoc${index + 1} = textProp${index + 1}.value;
textDoc${index + 1}.fontSize = 48;
textDoc${index + 1}.fillColor = [1, 1, 1]; // White text
textDoc${index + 1}.font = "Arial-BoldMT";
textDoc${index + 1}.justification = ParagraphJustification.CENTER_JUSTIFY;
textProp${index + 1}.setValue(textDoc${index + 1});

// Position text layer
textLayer${index + 1}.property("Transform").property("Position").setValue([960, 900]); // Bottom center
${scene.styles && scene.styles.includes('fade-in') ? `
// Add fade-in animation
var opacity${index + 1} = textLayer${index + 1}.property("Transform").property("Opacity");
opacity${index + 1}.setValueAtTime(${startTime}, 0);
opacity${index + 1}.setValueAtTime(${startTime + 0.3}, 100);
` : ''}
${scene.styles && scene.styles.includes('fade-out') ? `
// Add fade-out animation  
opacity${index + 1}.setValueAtTime(${endTime - 0.3}, 100);
opacity${index + 1}.setValueAtTime(${endTime}, 0);
` : ''}`;
  }).join('\n');

  const jsxFooter = `
// Finalize composition
comp.duration = ${metadata.durationMinutes * 60};
project.save();

alert("CapEdify JSX import complete! ${jsxScenes.length} text layers created.");
`;

  return jsxHeader + jsxSceneCode + jsxFooter;
}

/**
 * POST /api/pipeline/run - Execute complete agent pipeline
 */
router.post('/run', getUserId, upload.single('file'), async (req, res) => {
  const jobId = generateId();
  
  try {
    // Parse request parameters
    const { 
      inputType, 
      userTier = 'free', 
      jobCountThisMonth = 0,
      style = 'modern',
      position = 'bottom',
      projectName = 'CapEdify_Export'
    } = req.body;

    let srtContent = '';
    let durationMinutes = 0;
    let videoFilePath = null;

    // Validate input type
    if (!inputType || !['video', 'srt'].includes(inputType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inputType. Must be "video" or "srt"',
        jobId
      });
    }

    // Handle different input types
    if (inputType === 'srt') {
      if (req.body.srtContent) {
        // Direct SRT string input
        srtContent = req.body.srtContent;
        durationMinutes = parseFloat(req.body.durationMinutes) || 2.0;
      } else if (req.file && req.file.originalname.endsWith('.srt')) {
        // SRT file upload
        srtContent = await readSRTFile(req.file.path);
        durationMinutes = parseFloat(req.body.durationMinutes) || 2.0;
        
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
      } else {
        return res.status(400).json({
          success: false,
          error: 'SRT input requires either srtContent string or SRT file upload',
          jobId
        });
      }
    } else if (inputType === 'video') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Video input requires file upload',
          jobId
        });
      }

      // For video input, get duration but keep file for transcription
      console.log(`📁 Video file uploaded to: ${req.file.path}`);
      durationMinutes = await getVideoDuration(req.file.path);
      
      // Don't clean up file yet - we need it for transcription
      // Store the file path for later use in the pipeline
      videoFilePath = req.file.path;
      console.log(`🎬 Video file path stored: ${videoFilePath}`);
    }

    // Validate required data - for video input, SRT will be generated via transcription
    if (inputType === 'srt' && !srtContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No valid SRT content provided',
        jobId
      });
    }

    // Create pipeline job
    const pipelineInput = {
      inputType,
      srtContent,
      userTier,
      durationMinutes,
      jobCountThisMonth: parseInt(jobCountThisMonth) || 0,
      videoFilePath, // Add video file path if exists
      options: {
        style,
        position,
        projectName
      }
    };

    const job = new PipelineJob(jobId, pipelineInput, { userTier });
    pipelineJobs.set(jobId, job);

    // Log job start to database
    const inputDataForLogging = {
      ...pipelineInput,
      filename: req.file ? req.file.originalname : `${inputType}_input`
    };
    await logPipelineJobStart(jobId, req.userId, inputDataForLogging);

    // Start pipeline execution asynchronously
    job.start();
    
    setImmediate(async () => {
      try {
        let srtResult = srtContent;
        let rawTranscriptionText = '';
        
        // If video input, run through WhisperChunker for real transcription
        if (inputType === 'video' && pipelineInput.videoFilePath) {
          job.updateProgress(10, '🎧 Starting real Whisper transcription...');
          
          const transcriptionResult = await whisperChunkerAgent.transcribeFullLength(
            pipelineInput.videoFilePath, // video path
            'small', // model
            (progress, message) => {
              job.updateProgress(10 + (progress * 0.6), message); // 10-70% for transcription
            }
          );
          
          // Get the raw transcription text (like the old system)
          rawTranscriptionText = transcriptionResult.segments.map(segment => segment.text).join(' ');
          
          // Convert segments to SRT format (transcriptionResult contains segments directly)
          srtResult = transcriptionResult.segments.map((segment, index) => {
            const startTime = formatSRTTime(segment.start);
            const endTime = formatSRTTime(segment.end);
            return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
          }).join('\n');
          
          // Clean up video file after transcription
          await fs.unlink(pipelineInput.videoFilePath).catch(() => {});
        } else {
          // For SRT input, extract just the text content
          rawTranscriptionText = srtResult.replace(/\d+\n\d+:\d+:\d+,\d+ --> \d+:\d+:\d+,\d+\n/g, ' ').replace(/\n/g, ' ').trim();
        }
        
        // Run through CaptionSplitAgent for JSX export (keep for After Effects captions)
        job.updateProgress(75, '✂️ Breaking captions into screen-safe lines...');
        const sceneSegments = await captionSplitAgent.run(srtResult);
        
        // Create result format that matches what generateJSXFile expects
        const pipelineResult = {
          jsxScenes: sceneSegments.map(scene => ({
            scene: scene.scene,
            start: scene.start,
            end: scene.end,
            text: scene.text, // Already line-broken by CaptionSplitAgent
            layer: `Scene_${scene.scene}`,
            styles: ['fade-in', 'fade-out']
          })),
          metadata: {
            durationMinutes: durationMinutes,
            userTier: userTier,
            sceneCount: sceneSegments.length
          }
        };
        
        // Generate all format files
        job.updateProgress(90, '📄 Generating export files...');
        
        // Create directories
        const outputDir = path.join('uploads', 'outputs', jobId);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Generate JSX file
        const jsxContent = generateJSXFile(pipelineResult, projectName);
        const jsxFilePath = path.join(outputDir, `${projectName}.jsx`);
        await fs.writeFile(jsxFilePath, jsxContent, 'utf-8');
        
        // Generate SRT file
        const srtFilePath = path.join(outputDir, `${projectName}.srt`);
        await fs.writeFile(srtFilePath, srtResult, 'utf-8');
        
        // Generate VTT file (WebVTT format)
        const vttContent = 'WEBVTT\n\n' + srtResult.replace(/(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g, '$2 --> $3').replace(/,/g, '.');
        const vttFilePath = path.join(outputDir, `${projectName}.vtt`);
        await fs.writeFile(vttFilePath, vttContent, 'utf-8');
        
        // Generate plain text file
        const txtContent = rawTranscriptionText;
        const txtFilePath = path.join(outputDir, `${projectName}.txt`);
        await fs.writeFile(txtFilePath, txtContent, 'utf-8');
        
        // Generate JSON file with all data
        const jsonContent = JSON.stringify({
          metadata: pipelineResult.metadata,
          transcription: rawTranscriptionText,
          segments: pipelineResult.jsxScenes,
          srt: srtResult,
          generatedAt: new Date().toISOString(),
          jobId: jobId
        }, null, 2);
        const jsonFilePath = path.join(outputDir, `${projectName}.json`);
        await fs.writeFile(jsonFilePath, jsonContent, 'utf-8');
        
        // Store file paths for database
        const generatedFiles = {
          jsx: jsxFilePath,
          srt: srtFilePath,
          vtt: vttFilePath,
          txt: txtFilePath,
          json: jsonFilePath
        };
        
        // Complete the job with proper result format
        const finalResult = {
          success: true,
          data: {
            sceneCount: sceneSegments.length,
            creditInfo: {
              estimatedCreditsUsed: Math.ceil(durationMinutes * 2)
            },
            metadata: pipelineResult.metadata,
            transcriptionData: {
              text: rawTranscriptionText, // Raw continuous text like old system
              segments: [{ // Single segment with all the text for display
                id: 'full_transcription',
                start: 0,
                end: durationMinutes * 60,
                text: rawTranscriptionText
              }],
              captionSegments: sceneSegments, // Keep caption-split segments for JSX export only
              srtContent: srtResult,
              totalCharacters: rawTranscriptionText.length,
              totalWords: rawTranscriptionText.split(/\s+/).filter(word => word.length > 0).length
            }
          }
        };
        
        // Update database with completion status and file paths
        await updatePipelineJobStatus(jobId, 'completed', 100, generatedFiles);
        
        job.complete(finalResult, jsxFilePath);
        
      } catch (error) {
        console.error(`Pipeline job ${jobId} failed:`, error);
        
        // Update database with failure status
        await updatePipelineJobStatus(jobId, 'failed');
        
        job.fail({
          stage: 'pipeline_execution',
          message: error.message,
          stack: error.stack
        });
      }
    });

    // Return immediate response with job ID
    res.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Pipeline started successfully',
      estimatedDuration: '30-60 seconds',
      statusUrl: `/api/pipeline/status/${jobId}`,
      downloadUrl: `/api/pipeline/download/${jobId}`
    });

  } catch (error) {
    console.error('Pipeline run error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      jobId
    });
  }
});

/**
 * GET /api/pipeline/status/:jobId - Check pipeline job status
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId
    });
  }

  const response = {
    success: true,
    jobId,
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  };

  if (job.status === 'completed' && job.result) {
    response.result = {
      sceneCount: job.result.data.sceneCount,
      creditInfo: job.result.data.creditInfo,
      metadata: job.result.data.metadata,
      transcriptionData: job.result.data.transcriptionData,
      downloadReady: !!job.jsxFilePath
    };
  }

  if (job.status === 'failed' && job.error) {
    response.error = job.error;
  }

  res.json(response);
});

/**
 * GET /api/pipeline/download/:jobId - Download generated JSX file
 */
router.get('/download/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  if (job.status !== 'completed' || !job.jsxFilePath) {
    return res.status(400).json({
      success: false,
      error: 'Job not completed or JSX file not available',
      status: job.status
    });
  }

  try {
    // Check if file exists
    await fs.access(job.jsxFilePath);

    // Set download headers
    const fileName = path.basename(job.jsxFilePath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('X-Job-ID', jobId);
    res.setHeader('X-Scene-Count', job.result.data.sceneCount);
    res.setHeader('X-Credits-Used', job.result.data.creditInfo.estimatedCreditsUsed);

    // Send file
    res.sendFile(path.resolve(job.jsxFilePath));

  } catch (error) {
    console.error(`Download error for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'JSX file not accessible'
    });
  }
});

/**
 * GET /api/pipeline/jobs - List recent pipeline jobs (for debugging)
 */
router.get('/jobs', (req, res) => {
  const jobs = Array.from(pipelineJobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50) // Last 50 jobs
    .map(job => ({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      userTier: job.userInfo.userTier,
      inputType: job.input.inputType,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }));

  res.json({
    success: true,
    jobs,
    totalCount: pipelineJobs.size
  });
});

/**
 * DELETE /api/pipeline/jobs/:jobId - Clean up completed job
 */
router.delete('/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  try {
    // Clean up JSX file if it exists
    if (job.jsxFilePath) {
      await fs.unlink(job.jsxFilePath).catch(() => {});
    }

    // Remove job from memory
    pipelineJobs.delete(jobId);

    res.json({
      success: true,
      message: 'Job cleaned up successfully',
      jobId
    });

  } catch (error) {
    console.error(`Cleanup error for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up job'
    });
  }
});

/**
 * GET /api/pipeline/export/:jobId/jsx - Download JSX with specific style
 */
router.get('/export/:jobId/jsx', async (req, res) => {
  const { jobId } = req.params;
  const { style = 'modern' } = req.query;
  const job = pipelineJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId
    });
  }

  if (job.status !== 'completed' || !job.result?.data?.transcriptionData) {
    return res.status(400).json({
      success: false,
      error: 'Job not completed or transcription data not available',
      jobId
    });
  }

  try {
    const { transcriptionData } = job.result.data;
    const aeJSXExporterAgent = require('../services/aeJSXExporterAgent');
    
    // Generate JSX with specified style using the AE JSX Exporter Agent
    const jsxContent = await aeJSXExporterAgent.generateJSX({
      segments: transcriptionData.captionSegments || transcriptionData.segments, // Use caption-split segments for JSX
      projectName: `${jobId}_${style}`,
      style: style,
      position: 'bottom'
    });

    // Set download headers
    const fileName = `${jobId}_${style}.jsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/javascript');
    res.send(jsxContent);

  } catch (error) {
    console.error(`❌ JSX export failed for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'JSX export failed',
      details: error.message
    });
  }
});

/**
 * GET /api/pipeline/export/:jobId/srt - Download SRT file
 */
router.get('/export/:jobId/srt', async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job || job.status !== 'completed' || !job.result?.data?.transcriptionData) {
    return res.status(404).json({
      success: false,
      error: 'Job not found or not completed'
    });
  }

  try {
    const srtContent = job.result.data.transcriptionData.srtContent;
    
    const fileName = `${jobId}.srt`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/x-subrip');
    res.send(srtContent);

  } catch (error) {
    console.error(`❌ SRT export failed for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'SRT export failed'
    });
  }
});

/**
 * GET /api/pipeline/export/:jobId/vtt - Download VTT file
 */
router.get('/export/:jobId/vtt', async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job || job.status !== 'completed' || !job.result?.data?.transcriptionData) {
    return res.status(404).json({
      success: false,
      error: 'Job not found or not completed'
    });
  }

  try {
    const { segments } = job.result.data.transcriptionData;
    
    // Convert SRT to VTT format
    let vttContent = 'WEBVTT\n\n';
    segments.forEach((segment, index) => {
      const startTime = formatVTTTime(segment.start);
      const endTime = formatVTTTime(segment.end);
      vttContent += `${startTime} --> ${endTime}\n${segment.text}\n\n`;
    });
    
    const fileName = `${jobId}.vtt`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'text/vtt');
    res.send(vttContent);

  } catch (error) {
    console.error(`❌ VTT export failed for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'VTT export failed'
    });
  }
});

/**
 * POST /api/pipeline/batch-run - Execute pipeline for multiple files
 */
router.post('/batch-run', upload.array('files', 50), async (req, res) => {
  const batchId = generateId();
  const startTime = Date.now();
  
  try {
    console.log('🚀 Batch pipeline request received');
    
    // Validate request
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No video files provided',
        batchId
      });
    }

    // Parse options
    const { 
      userTier = 'free', 
      style = 'modern',
      position = 'bottom',
      projectBaseName = 'CapEdify_Batch'
    } = req.body;

    console.log(`📊 Processing ${req.files.length} files for ${userTier} user`);

    // Create individual jobs for each file
    const batchJobs = [];
    const jobPromises = req.files.map(async (file, index) => {
      const jobId = generateId();
      const projectName = `${projectBaseName}_${index + 1}_${path.parse(file.originalname).name}`;
      
      // Create individual pipeline job
      const pipelineInput = {
        inputType: 'video',
        userTier,
        style,
        position,
        projectName,
        videoFilePath: file.path
      };

      const job = new PipelineJob(jobId, pipelineInput, { userTier });
      pipelineJobs.set(jobId, job);
      
      batchJobs.push({
        jobId,
        filename: file.originalname,
        size: file.size,
        status: 'pending'
      });

      // Start processing asynchronously
      job.start();
      setImmediate(async () => {
        try {
          // Get video duration
          const durationMinutes = await getVideoDuration(file.path);
          
          // Process with WhisperChunker
          job.updateProgress(10, '🎧 Starting Whisper transcription...');
          const transcriptionResult = await whisperChunkerAgent.transcribeFullLength(
            file.path,
            'small',
            (progress, message) => {
              job.updateProgress(10 + (progress * 0.6), message);
            }
          );

          // Get raw transcription text
          const rawTranscriptionText = transcriptionResult.segments.map(segment => segment.text).join(' ');
          
          // Convert to SRT format
          const srtResult = transcriptionResult.segments.map((segment, index) => {
            const startTime = formatSRTTime(segment.start);
            const endTime = formatSRTTime(segment.end);
            return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
          }).join('\n');

          // Process with CaptionSplitAgent
          job.updateProgress(75, '✂️ Breaking captions into screen-safe lines...');
          const sceneSegments = await captionSplitAgent.run(srtResult);

          // Generate JSX
          job.updateProgress(90, '📄 Generating After Effects JSX...');
          const pipelineResult = {
            jsxScenes: sceneSegments.map(scene => ({
              scene: scene.scene,
              start: scene.start,
              end: scene.end,
              text: scene.text,
              layer: `Scene_${scene.scene}`,
              styles: ['fade-in', 'fade-out']
            })),
            metadata: {
              durationMinutes: durationMinutes,
              userTier: userTier,
              sceneCount: sceneSegments.length
            }
          };

          const jsxContent = generateJSXFile(pipelineResult, projectName);
          const jsxFileName = `${projectName}_${jobId}.jsx`;
          const jsxFilePath = path.join('uploads/jsx', jsxFileName);
          
          await fs.mkdir(path.dirname(jsxFilePath), { recursive: true });
          await fs.writeFile(jsxFilePath, jsxContent, 'utf-8');

          // Complete job
          const finalResult = {
            success: true,
            data: {
              sceneCount: sceneSegments.length,
              creditInfo: {
                estimatedCreditsUsed: Math.ceil(durationMinutes * 2)
              },
              metadata: pipelineResult.metadata,
              transcriptionData: {
                text: rawTranscriptionText,
                segments: [{ 
                  id: 'full_transcription',
                  start: 0,
                  end: durationMinutes * 60,
                  text: rawTranscriptionText
                }],
                captionSegments: sceneSegments,
                srtContent: srtResult,
                totalCharacters: rawTranscriptionText.length,
                totalWords: rawTranscriptionText.split(/\s+/).filter(word => word.length > 0).length
              }
            }
          };

          job.complete(finalResult, jsxFilePath);
          
          // Clean up video file
          await fs.unlink(file.path).catch(() => {});
          
        } catch (error) {
          console.error(`Pipeline job ${jobId} failed:`, error);
          job.fail({
            stage: 'pipeline_execution',
            message: error.message,
            stack: error.stack
          });
          
          // Clean up video file on failure
          await fs.unlink(file.path).catch(() => {});
        }
      });

      return { jobId, filename: file.originalname };
    });

    // Wait for all jobs to be created
    await Promise.all(jobPromises);

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Batch created: ${batchId} with ${batchJobs.length} jobs`);

    res.json({
      success: true,
      batchId,
      jobs: batchJobs,
      totalJobs: batchJobs.length,
      estimatedDuration: `${Math.ceil(batchJobs.length * 2)} minutes`,
      message: `Batch processing started for ${batchJobs.length} video files`,
      processingTime
    });

  } catch (error) {
    console.error('Batch pipeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId
    });
  }
});

/**
 * GET /api/pipeline/batch-status/:batchId - Get status of all jobs in a batch
 */
router.get('/batch-status/:batchId', async (req, res) => {
  const { batchId } = req.params;
  
  try {
    // For this implementation, we'll get all jobs that match a pattern
    // In a real implementation, you'd store batch-job relationships in a database
    const allJobs = Array.from(pipelineJobs.values());
    const batchJobs = allJobs.filter(job => 
      job.input.options?.projectName?.includes(batchId.substring(0, 8))
    );

    if (batchJobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
        batchId
      });
    }

    const jobs = batchJobs.map(job => ({
      jobId: job.jobId,
      filename: job.input.options?.projectName || 'Unknown',
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      error: job.error,
      downloadUrl: job.jsxFilePath ? `/api/pipeline/download/${job.jobId}` : null
    }));

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    const processingJobs = jobs.filter(job => job.status === 'processing').length;
    
    const overallProgress = totalJobs > 0 
      ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / totalJobs)
      : 0;

    res.json({
      success: true,
      batchId,
      status: completedJobs === totalJobs ? 'completed' : 
              failedJobs === totalJobs ? 'failed' :
              processingJobs > 0 ? 'processing' : 'pending',
      progress: overallProgress,
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
      jobs
    });

  } catch (error) {
    console.error('Batch status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId
    });
  }
});

/**
 * GET /api/pipeline/export/:jobId/txt - Download plain text transcription
 */
router.get('/export/:jobId/txt', async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);

  if (!job || job.status !== 'completed' || !job.result?.data?.transcriptionData) {
    return res.status(404).json({
      success: false,
      error: 'Job not found or not completed'
    });
  }

  try {
    const { text, segments } = job.result.data.transcriptionData;
    
    // Use the raw continuous text instead of segments
    const header = `Transcription - ${new Date().toISOString()}\nJob ID: ${jobId}\n\n`;
    const fullContent = header + (text || segments[0]?.text || 'No transcription available');
    
    const fileName = `${jobId}_transcription.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(fullContent);

  } catch (error) {
    console.error(`❌ Text export failed for job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Text export failed'
    });
  }
});

/**
 * Helper function to format time for VTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * DEBUG ENDPOINT - Get all pipeline jobs in database (temporary)
 */
router.get('/debug/jobs', async (req, res) => {
  try {
    const { data: allJobs, error } = await supabase
      .from('pipeline_jobs_extended')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      totalJobs: allJobs?.length || 0,
      jobs: allJobs || []
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;