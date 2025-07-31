/**
 * Batch Processing Routes - API endpoints for multi-file video processing
 * 
 * @description REST API endpoints for CapEdify batch processing operations.
 * Handles multi-file uploads, folder processing, and batch job management.
 * 
 * Key Endpoints:
 * • POST /api/batch/process - Start batch processing job
 * • GET /api/batch/status/:batchId - Get batch progress and status
 * • GET /api/batch/download/:jobId - Download individual job results
 * • GET /api/batch/list - List all batches for user
 * • DELETE /api/batch/:batchId - Cancel and cleanup batch
 * • GET /api/batch/stream/:batchId - SSE stream for real-time updates
 * 
 * Features:
 * • Multi-file upload support with validation
 * • Real-time progress tracking via Server-Sent Events
 * • Comprehensive error handling with detailed messages
 * • ZIP download management with automatic cleanup
 * • Webhook integration for external notifications
 * • User tier validation and credit management
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Import batch processing agents
const batchCoordinatorAgent = require('../services/batchCoordinatorAgent');
const statusReporterAgent = require('../services/statusReporterAgent');

const router = express.Router();

// Configure multer for multi-file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/batch/'),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB max per file
    files: 50, // Max 50 files per batch
  },
  fileFilter: (req, file, cb) => {
    const supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    console.log(`📁 File upload: ${file.originalname} (${ext})`);
    
    if (supportedFormats.includes(ext)) {
      cb(null, true);
    } else {
      console.log(`❌ Unsupported format: ${file.originalname}`);
      cb(new Error(`Unsupported file format: ${ext}. Supported: ${supportedFormats.join(', ')}`));
    }
  }
});

// ========================================================================
// BATCH PROCESSING ENDPOINTS
// ========================================================================

/**
 * POST /api/batch/process - Start batch processing
 * Accepts multiple video files and starts batch processing
 */
router.post('/process', upload.array('videos', 50), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Batch process request received');
    
    // Validate request
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No video files provided',
        code: 'NO_FILES'
      });
    }

    // Parse options
    const options = {
      userTier: req.body.userTier || 'free',
      style: req.body.style || 'modern',
      position: req.body.position || 'bottom',
      outputFormats: req.body.outputFormats ? req.body.outputFormats.split(',') : ['srt', 'vtt', 'jsx', 'json', 'txt'],
      webhookUrl: req.body.webhookUrl || null,
      projectName: req.body.projectName || 'Batch_Processing'
    };

    console.log(`📊 Processing ${req.files.length} files for ${options.userTier} user`);

    // Start batch processing
    const batchResult = await batchCoordinatorAgent.processMultipleFiles(req.files, options);

    // Register batch with status reporter
    statusReporterAgent.registerBatch(batchResult.batchId, {
      totalJobs: batchResult.totalJobs,
      options: options,
      source: 'api_upload'
    });

    // Add webhook if provided
    if (options.webhookUrl) {
      statusReporterAgent.addWebhookSubscriber(options.webhookUrl);
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Batch created: ${batchResult.batchId} (${processingTime}ms)`);

    res.json({
      success: true,
      batchId: batchResult.batchId,
      totalJobs: batchResult.totalJobs,
      estimatedDuration: batchResult.estimatedDuration,
      statusUrl: `/api/batch/status/${batchResult.batchId}`,
      streamUrl: `/api/batch/stream/${batchResult.batchId}`,
      message: batchResult.message,
      processingTime
    });

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BATCH_PROCESSING_FAILED',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/batch/status/:batchId - Get batch status and progress
 */
router.get('/status/:batchId', async (req, res) => {
  const { batchId } = req.params;
  
  try {
    console.log(`📊 Status request for batch: ${batchId}`);
    
    // Get batch status from coordinator
    const batchStatus = await batchCoordinatorAgent.getBatchStatus(batchId);
    
    // Get detailed progress from status reporter
    const batchProgress = await statusReporterAgent.reportBatchProgress(batchId);
    
    // Combine data
    const response = {
      success: true,
      batchId,
      status: batchProgress.status,
      progress: batchProgress.progress,
      totalJobs: batchProgress.totalJobs,
      completedJobs: batchProgress.completedJobs,
      failedJobs: batchProgress.failedJobs,
      processingJobs: batchProgress.processingJobs,
      estimatedTimeRemaining: batchProgress.estimatedTimeRemaining,
      jobs: batchProgress.jobs.map(job => ({
        jobId: job.jobId,
        filename: job.filename,
        status: job.status,
        progress: job.progress,
        error: job.error,
        downloadUrl: job.downloadUrl ? `/api/batch/download/${job.jobId}` : null
      })),
      startedAt: batchProgress.startedAt,
      completedAt: batchProgress.completedAt,
      processingTime: batchProgress.processingTime,
      downloadUrls: batchProgress.downloadUrls
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Failed to get batch status:', error.message);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: `Batch not found: ${batchId}`,
        code: 'BATCH_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'STATUS_RETRIEVAL_FAILED'
      });
    }
  }
});

/**
 * GET /api/batch/download/:jobId - Download job results ZIP
 */
router.get('/download/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    console.log(`📦 Download request for job: ${jobId}`);
    
    // Find job in completed jobs or active jobs
    const statusReporter = statusReporterAgent;
    const job = statusReporter.completedJobs.get(jobId) || statusReporter.activeJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: `Job not found: ${jobId}`,
        code: 'JOB_NOT_FOUND'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Job not completed. Current status: ${job.status}`,
        code: 'JOB_NOT_READY'
      });
    }

    if (!job.downloadUrl) {
      return res.status(404).json({
        success: false,
        error: 'Download URL not available',
        code: 'DOWNLOAD_NOT_AVAILABLE'
      });
    }

    // Get file path from download URL
    const filename = path.basename(job.downloadUrl);
    const filePath = path.join(__dirname, '../public/downloads', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Download file not found or expired',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('X-Job-ID', jobId);
    res.setHeader('X-Filename', job.filename);

    // Send file
    res.sendFile(path.resolve(filePath));
    
    console.log(`✅ Download served: ${filename} for job ${jobId}`);

  } catch (error) {
    console.error('❌ Download failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DOWNLOAD_FAILED'
    });
  }
});

/**
 * GET /api/batch/list - List all batches for user
 */
router.get('/list', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status = 'all' } = req.query;
    
    console.log(`📋 Batch list request: limit=${limit}, offset=${offset}, status=${status}`);
    
    // Get batches from status reporter
    const allBatches = Array.from(statusReporterAgent.batchStatuses.values());
    
    // Filter by status if specified
    let filteredBatches = allBatches;
    if (status !== 'all') {
      filteredBatches = allBatches.filter(batch => batch.status === status);
    }
    
    // Sort by creation date (newest first)
    filteredBatches.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    
    // Apply pagination
    const paginatedBatches = filteredBatches.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    // Format response
    const batches = paginatedBatches.map(batch => ({
      batchId: batch.batchId,
      status: batch.status,
      totalJobs: batch.totalJobs,
      completedJobs: batch.completedJobs || 0,
      failedJobs: batch.failedJobs || 0,
      progress: batch.progress || 0,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      source: batch.source,
      processingTime: batch.processingTime || null
    }));

    res.json({
      success: true,
      batches,
      pagination: {
        total: filteredBatches.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < filteredBatches.length
      }
    });

  } catch (error) {
    console.error('❌ Failed to list batches:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'LIST_FAILED'
    });
  }
});

/**
 * DELETE /api/batch/:batchId - Cancel and cleanup batch
 */
router.delete('/:batchId', async (req, res) => {
  const { batchId } = req.params;
  
  try {
    console.log(`❌ Cancel request for batch: ${batchId}`);
    
    // Cancel batch via coordinator
    await batchCoordinatorAgent.cancelBatch(batchId);
    
    console.log(`✅ Batch cancelled: ${batchId}`);
    
    res.json({
      success: true,
      message: `Batch ${batchId} has been cancelled`,
      batchId
    });

  } catch (error) {
    console.error('❌ Failed to cancel batch:', error.message);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: `Batch not found: ${batchId}`,
        code: 'BATCH_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CANCEL_FAILED'
      });
    }
  }
});

// ========================================================================
// REAL-TIME UPDATES (Server-Sent Events)
// ========================================================================

/**
 * GET /api/batch/stream/:batchId - SSE stream for real-time batch updates
 */
router.get('/stream/:batchId', (req, res) => {
  const { batchId } = req.params;
  
  console.log(`📡 SSE connection for batch: ${batchId}`);
  
  // Register SSE connection with status reporter
  statusReporterAgent.registerSSEConnection(res, batchId);
  
  // Send initial batch status
  batchCoordinatorAgent.getBatchStatus(batchId)
    .then(status => {
      res.write(`data: ${JSON.stringify({
        type: 'initial',
        data: status,
        timestamp: new Date().toISOString()
      })}\n\n`);
    })
    .catch(error => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
    });
});

/**
 * GET /api/batch/stream - SSE stream for all batch updates
 */
router.get('/stream', (req, res) => {
  console.log('📡 SSE connection for all batches');
  
  // Register SSE connection without batch filter
  statusReporterAgent.registerSSEConnection(res);
  
  // Send system metrics as initial data
  const metrics = statusReporterAgent.getSystemMetrics();
  res.write(`data: ${JSON.stringify({
    type: 'system',
    data: metrics,
    timestamp: new Date().toISOString()
  })}\n\n`);
});

// ========================================================================
// SYSTEM ENDPOINTS
// ========================================================================

/**
 * GET /api/batch/metrics - Get system performance metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = statusReporterAgent.getSystemMetrics();
    
    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('❌ Failed to get metrics:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'METRICS_FAILED'
    });
  }
});

/**
 * POST /api/batch/webhook - Register webhook for notifications
 */
router.post('/webhook', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required',
        code: 'MISSING_URL'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook URL format',
        code: 'INVALID_URL'
      });
    }

    statusReporterAgent.addWebhookSubscriber(url);
    
    res.json({
      success: true,
      message: 'Webhook registered successfully',
      url
    });

  } catch (error) {
    console.error('❌ Failed to register webhook:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'WEBHOOK_REGISTRATION_FAILED'
    });
  }
});

/**
 * DELETE /api/batch/webhook - Remove webhook subscription
 */
router.delete('/webhook', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required',
        code: 'MISSING_URL'
      });
    }

    statusReporterAgent.removeWebhookSubscriber(url);
    
    res.json({
      success: true,
      message: 'Webhook removed successfully',
      url
    });

  } catch (error) {
    console.error('❌ Failed to remove webhook:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'WEBHOOK_REMOVAL_FAILED'
    });
  }
});

// ========================================================================
// ERROR HANDLING
// ========================================================================

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Upload error:', error.message);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10GB per file.',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 50 files per batch.',
        code: 'TOO_MANY_FILES'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  next(error);
});

module.exports = router;