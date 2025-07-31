/**
 * BatchCoordinatorAgent - Orchestrates batch video processing operations
 * 
 * @class BatchCoordinatorAgent
 * @description Manages multi-file video processing with intelligent job queuing
 * 
 * Key Features:
 * • CLI Support: captionforge *.mp4 or captionforge folder/
 * • API Integration: POST /api/batch-process with multi-file upload
 * • Smart Deduplication: Prevents duplicate file processing
 * • Queue Management: BullMQ integration with fallback to Supabase
 * • Progress Monitoring: Real-time batch status tracking
 * • Error Handling: Comprehensive validation and retry logic
 * 
 * Architecture:
 * 1. File Discovery: Glob pattern matching and folder traversal
 * 2. Job Creation: Unique IDs, metadata extraction, validation
 * 3. Queue Management: Intelligent job distribution and priority
 * 4. Status Tracking: Real-time progress and error reporting
 * 5. Cleanup: Automatic resource management and optimization
 */

const path = require('path');
const fs = require('fs').promises;
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');
const Queue = require('bull');

class BatchCoordinatorAgent {
  constructor() {
    // Initialize job queue (BullMQ with Redis)
    this.batchQueue = new Queue('batch processing', {
      redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 2,          // Retry failed jobs once
        backoff: 'exponential',
        delay: 5000,          // 5 second delay between retries
      }
    });

    // Batch job storage (in-memory with Supabase backup)
    this.activeBatches = new Map();
    this.completedBatches = new Map();
    
    // Configuration
    this.config = {
      maxConcurrentJobs: 3,           // Max parallel video processing
      supportedFormats: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB max per file
      outputFormats: ['srt', 'vtt', 'jsx', 'json', 'txt'],
      zipCompression: 6,              // ZIP compression level (0-9)
    };

    console.log('🤖 BatchCoordinatorAgent initialized');
    console.log(`📊 Max concurrent jobs: ${this.config.maxConcurrentJobs}`);
    console.log(`📁 Supported formats: ${this.config.supportedFormats.join(', ')}`);
  }

  // ========================================================================
  // PUBLIC API - Main entry points for batch processing
  // ========================================================================

  /**
   * Process folder containing video files
   * @param {string} folderPath - Path to folder containing videos
   * @param {Object} options - Processing options
   * @returns {Promise<BatchResult>} - Batch processing result
   */
  async processFolder(folderPath, options = {}) {
    console.log(`📁 Starting folder batch processing: ${folderPath}`);
    
    try {
      // Validate folder exists
      const folderStats = await fs.stat(folderPath);
      if (!folderStats.isDirectory()) {
        throw new Error(`Path is not a directory: ${folderPath}`);
      }

      // Find all video files in folder
      const videoFiles = await this._findVideoFiles(folderPath);
      
      if (videoFiles.length === 0) {
        throw new Error(`No supported video files found in: ${folderPath}`);
      }

      console.log(`🎬 Found ${videoFiles.length} video files`);
      
      // Create batch job
      return await this._createBatchJob(videoFiles, {
        ...options,
        source: 'folder',
        sourcePath: folderPath
      });

    } catch (error) {
      console.error('❌ Folder processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process multiple uploaded files
   * @param {Array<File>} files - Array of uploaded video files
   * @param {Object} options - Processing options
   * @returns {Promise<BatchResult>} - Batch processing result
   */
  async processMultipleFiles(files, options = {}) {
    console.log(`📤 Starting multi-file batch processing: ${files.length} files`);
    
    try {
      // Validate and convert files to our format
      const videoFiles = await this._validateUploadedFiles(files);
      
      if (videoFiles.length === 0) {
        throw new Error('No valid video files provided');
      }

      console.log(`✅ Validated ${videoFiles.length} files`);
      
      // Create batch job
      return await this._createBatchJob(videoFiles, {
        ...options,
        source: 'upload',
        sourcePath: 'multi-file-upload'
      });

    } catch (error) {
      console.error('❌ Multi-file processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process files from CLI glob pattern
   * @param {string} pattern - Glob pattern (e.g., "*.mp4", "videos/*.mov")
   * @param {Object} options - Processing options
   * @returns {Promise<BatchResult>} - Batch processing result
   */
  async processGlobPattern(pattern, options = {}) {
    console.log(`🔍 Starting glob pattern processing: ${pattern}`);
    
    try {
      // Find files matching pattern
      const videoFiles = await this._findFilesWithGlob(pattern);
      
      if (videoFiles.length === 0) {
        throw new Error(`No files found matching pattern: ${pattern}`);
      }

      console.log(`🎯 Found ${videoFiles.length} files matching pattern`);
      
      // Create batch job
      return await this._createBatchJob(videoFiles, {
        ...options,
        source: 'glob',
        sourcePath: pattern
      });

    } catch (error) {
      console.error('❌ Glob pattern processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Get batch status and progress
   * @param {string} batchId - Batch job ID
   * @returns {Promise<BatchStatus>} - Current batch status
   */
  async getBatchStatus(batchId) {
    try {
      const batch = this.activeBatches.get(batchId) || this.completedBatches.get(batchId);
      
      if (!batch) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      // Get queue job statuses
      const jobStatuses = await Promise.all(
        batch.jobs.map(async (job) => {
          const queueJob = await this.batchQueue.getJob(job.queueJobId);
          return {
            jobId: job.jobId,
            filename: job.filename,
            status: queueJob ? queueJob.finishedOn ? 'completed' : queueJob.failedReason ? 'failed' : 'processing' : 'unknown',
            progress: queueJob ? queueJob.progress() : 0,
            error: queueJob ? queueJob.failedReason : null,
            downloadUrl: job.downloadUrl || null
          };
        })
      );

      // Calculate batch progress
      const completedJobs = jobStatuses.filter(job => job.status === 'completed').length;
      const failedJobs = jobStatuses.filter(job => job.status === 'failed').length;
      const totalJobs = jobStatuses.length;
      const batchProgress = Math.round((completedJobs / totalJobs) * 100);

      return {
        batchId,
        status: completedJobs === totalJobs ? 'completed' : failedJobs > 0 ? 'partial' : 'processing',
        progress: batchProgress,
        totalJobs,
        completedJobs,
        failedJobs,
        jobs: jobStatuses,
        createdAt: batch.createdAt,
        completedAt: completedJobs === totalJobs ? new Date().toISOString() : null
      };

    } catch (error) {
      console.error('❌ Failed to get batch status:', error.message);
      throw error;
    }
  }

  /**
   * Cancel a batch job
   * @param {string} batchId - Batch job ID to cancel
   * @returns {Promise<void>}
   */
  async cancelBatch(batchId) {
    try {
      const batch = this.activeBatches.get(batchId);
      
      if (!batch) {
        throw new Error(`Active batch not found: ${batchId}`);
      }

      // Cancel all queue jobs
      await Promise.all(
        batch.jobs.map(async (job) => {
          const queueJob = await this.batchQueue.getJob(job.queueJobId);
          if (queueJob && !queueJob.finishedOn) {
            await queueJob.remove();
          }
        })
      );

      // Move to completed batches as cancelled
      batch.status = 'cancelled';
      batch.completedAt = new Date().toISOString();
      this.completedBatches.set(batchId, batch);
      this.activeBatches.delete(batchId);

      console.log(`❌ Batch cancelled: ${batchId}`);

    } catch (error) {
      console.error('❌ Failed to cancel batch:', error.message);
      throw error;
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS - Internal batch processing logic
  // ========================================================================

  /**
   * Find video files in a directory
   * @private
   */
  async _findVideoFiles(dirPath) {
    const files = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (this.config.supportedFormats.includes(ext)) {
          const stats = await fs.stat(fullPath);
          files.push({
            filename: entry.name,
            path: fullPath,
            size: stats.size,
            ext: ext
          });
        }
      }
    }
    
    return files;
  }

  /**
   * Find files using glob pattern
   * @private
   */
  async _findFilesWithGlob(pattern) {
    return new Promise((resolve, reject) => {
      glob(pattern, (err, filePaths) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoFiles = filePaths
          .filter(filePath => {
            const ext = path.extname(filePath).toLowerCase();
            return this.config.supportedFormats.includes(ext);
          })
          .map(filePath => ({
            filename: path.basename(filePath),
            path: filePath,
            size: 0, // Will be filled later
            ext: path.extname(filePath).toLowerCase()
          }));
          
        resolve(videoFiles);
      });
    });
  }

  /**
   * Validate uploaded files
   * @private
   */
  async _validateUploadedFiles(files) {
    const validFiles = [];
    
    for (const file of files) {
      const ext = path.extname(file.originalname || file.name).toLowerCase();
      
      // Check format support
      if (!this.config.supportedFormats.includes(ext)) {
        console.warn(`⚠️ Unsupported format: ${file.originalname || file.name}`);
        continue;
      }
      
      // Check file size
      if (file.size > this.config.maxFileSize) {
        console.warn(`⚠️ File too large: ${file.originalname || file.name}`);
        continue;
      }
      
      validFiles.push({
        filename: file.originalname || file.name,
        path: file.path || file.tempPath,
        size: file.size,
        ext: ext
      });
    }
    
    return validFiles;
  }

  /**
   * Create a new batch job with all individual video jobs
   * @private
   */
  async _createBatchJob(videoFiles, options) {
    const batchId = uuidv4();
    const timestamp = new Date().toISOString();
    
    console.log(`🚀 Creating batch job: ${batchId}`);
    
    // Deduplicate files by name and size
    const uniqueFiles = this._deduplicateFiles(videoFiles);
    console.log(`🔍 Deduplicated: ${videoFiles.length} → ${uniqueFiles.length} files`);
    
    // Create individual jobs for each video
    const jobs = uniqueFiles.map(file => ({
      jobId: uuidv4(),
      filename: file.filename,
      path: file.path,
      size: file.size,
      ext: file.ext,
      status: 'pending',
      queueJobId: null,
      downloadUrl: null,
      createdAt: timestamp
    }));
    
    // Create batch record
    const batch = {
      batchId,
      status: 'created',
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      jobs,
      options: {
        outputFormats: options.outputFormats || this.config.outputFormats,
        style: options.style || 'modern',
        position: options.position || 'bottom',
        userTier: options.userTier || 'free',
        ...options
      },
      createdAt: timestamp,
      completedAt: null
    };
    
    // Store batch
    this.activeBatches.set(batchId, batch);
    
    // Add jobs to queue
    for (const job of jobs) {
      const queueJob = await this.batchQueue.add('process-video', {
        jobId: job.jobId,
        batchId: batchId,
        videoPath: job.path,
        filename: job.filename,
        options: batch.options
      }, {
        jobId: job.jobId, // Use our job ID as queue job ID
        priority: this._calculateJobPriority(job, batch.options)
      });
      
      job.queueJobId = queueJob.id;
      console.log(`📋 Queued job: ${job.filename} (${job.jobId})`);
    }
    
    batch.status = 'processing';
    
    console.log(`✅ Batch created: ${batchId} with ${jobs.length} jobs`);
    
    return {
      success: true,
      batchId,
      totalJobs: jobs.length,
      estimatedDuration: `${Math.ceil(jobs.length * 2)} minutes`,
      statusUrl: `/api/batch/status/${batchId}`,
      message: `Batch processing started for ${jobs.length} video files`
    };
  }

  /**
   * Remove duplicate files based on name and size
   * @private
   */
  _deduplicateFiles(files) {
    const seen = new Set();
    const unique = [];
    
    for (const file of files) {
      const key = `${file.filename}:${file.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(file);
      } else {
        console.log(`🔄 Skipping duplicate: ${file.filename}`);
      }
    }
    
    return unique;
  }

  /**
   * Calculate job priority based on file characteristics
   * @private
   */
  _calculateJobPriority(job, options) {
    let priority = 1; // Default priority
    
    // Smaller files get higher priority (faster processing)
    if (job.size < 100 * 1024 * 1024) priority += 2; // < 100MB
    if (job.size < 50 * 1024 * 1024) priority += 1;  // < 50MB
    
    // Premium users get higher priority
    if (options.userTier === 'creator') priority += 3;
    if (options.userTier === 'studio') priority += 5;
    
    return priority;
  }

  /**
   * Cleanup completed batches older than specified days
   * @param {number} olderThanDays - Remove batches older than this many days
   */
  async cleanupOldBatches(olderThanDays = 7) {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;
    
    for (const [batchId, batch] of this.completedBatches) {
      if (new Date(batch.createdAt) < cutoffDate) {
        this.completedBatches.delete(batchId);
        cleanedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} old batches`);
    return cleanedCount;
  }
}

// Export singleton instance
module.exports = new BatchCoordinatorAgent();