/**
 * StatusReporterAgent - Real-time batch processing monitoring and reporting
 * 
 * @class StatusReporterAgent
 * @description Comprehensive status tracking and reporting for batch video processing
 * 
 * Key Features:
 * • Real-time Updates: WebSocket/SSE integration for live progress streaming
 * • Database Logging: Persistent status storage in Supabase/Redis
 * • Webhook Support: External API notifications on job completion
 * • Progress Metrics: Detailed % complete, ETA, and error tracking
 * • Download Management: ZIP file access URLs and cleanup scheduling
 * • Health Monitoring: System resource tracking and alert generation
 * 
 * Architecture:
 * 1. Status Collection: Gathers progress from all active batch jobs
 * 2. Progress Calculation: Intelligent ETA and completion estimates
 * 3. Notification Dispatch: Webhooks, SSE, and database updates
 * 4. Error Aggregation: Centralized error tracking and reporting
 * 5. Cleanup Scheduling: Automatic file and job cleanup management
 * 6. Analytics: Batch processing performance metrics
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class StatusReporterAgent extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      updateInterval: 2000,           // Status update frequency (ms)
      webhookTimeout: 10000,          // Webhook request timeout (ms)
      maxRetentionDays: 30,           // Status history retention
      enableWebhooks: true,           // Enable webhook notifications
      enableSSE: true,                // Enable Server-Sent Events
      compressionEnabled: true,       // Compress status payloads
      analyticsEnabled: true,         // Enable performance analytics
    };

    // Status storage
    this.activeJobs = new Map();      // Currently processing jobs
    this.completedJobs = new Map();   // Recently completed jobs
    this.batchStatuses = new Map();   // Batch-level status tracking
    this.systemMetrics = {            // System performance metrics
      totalJobsProcessed: 0,
      totalBatchesProcessed: 0,
      averageJobTime: 0,
      averageBatchTime: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    };

    // Webhook subscribers
    this.webhookSubscribers = new Set();
    
    // SSE connections
    this.sseConnections = new Set();

    // Start monitoring
    this._startStatusMonitoring();

    console.log('📡 StatusReporterAgent initialized');
    console.log(`⏱️ Update interval: ${this.config.updateInterval}ms`);
    console.log(`🔗 Webhooks: ${this.config.enableWebhooks ? 'enabled' : 'disabled'}`);
  }

  // ========================================================================
  // PUBLIC API - Status tracking and reporting interface
  // ========================================================================

  /**
   * Update job status and progress
   * @param {string} jobId - Job identifier
   * @param {Object} status - Job status object
   */
  async updateJobStatus(jobId, status) {
    const timestamp = new Date().toISOString();
    
    const jobStatus = {
      jobId,
      batchId: status.batchId,
      filename: status.filename,
      status: status.status, // 'processing', 'completed', 'failed'
      progress: status.progress || 0,
      message: status.message || '',
      error: status.error || null,
      startTime: status.startTime || timestamp,
      endTime: status.status === 'completed' || status.status === 'failed' ? timestamp : null,
      downloadUrl: status.downloadUrl || null,
      outputs: status.outputs || [],
      processingTime: status.processingTime || 0,
      updatedAt: timestamp
    };

    // Store job status
    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      this.completedJobs.set(jobId, jobStatus);
      this.activeJobs.delete(jobId);
      this.systemMetrics.totalJobsProcessed++;
    } else {
      this.activeJobs.set(jobId, jobStatus);
    }

    // Update batch-level status
    await this._updateBatchStatus(status.batchId, jobId, jobStatus);

    // Emit status update event
    this.emit('jobUpdated', jobStatus);

    // Send notifications
    await this._sendNotifications('job', jobStatus);

    console.log(`📊 Job status updated: ${jobId} - ${status.status} (${Math.round(status.progress || 0)}%)`);
  }

  /**
   * Report batch progress and status
   * @param {string} batchId - Batch identifier
   * @returns {Promise<BatchProgress>} - Current batch progress
   */
  async reportBatchProgress(batchId) {
    try {
      const batchStatus = this.batchStatuses.get(batchId);
      
      if (!batchStatus) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      // Calculate current progress
      const jobs = [...this.activeJobs.values(), ...this.completedJobs.values()]
        .filter(job => job.batchId === batchId);

      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const failedJobs = jobs.filter(job => job.status === 'failed').length;
      const processingJobs = jobs.filter(job => job.status === 'processing').length;

      const overallProgress = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

      // Calculate ETA
      const eta = this._calculateBatchETA(jobs);

      const batchProgress = {
        batchId,
        status: this._determineBatchStatus(completedJobs, failedJobs, processingJobs, totalJobs),
        progress: overallProgress,
        totalJobs,
        completedJobs,
        failedJobs,
        processingJobs,
        jobs: jobs.map(job => ({
          jobId: job.jobId,
          filename: job.filename,
          status: job.status,
          progress: job.progress,
          error: job.error,
          downloadUrl: job.downloadUrl
        })),
        estimatedTimeRemaining: eta,
        startedAt: batchStatus.startedAt,
        completedAt: completedJobs === totalJobs ? new Date().toISOString() : null,
        processingTime: Date.now() - new Date(batchStatus.startedAt).getTime(),
        downloadUrls: jobs
          .filter(job => job.downloadUrl)
          .map(job => ({ filename: job.filename, url: job.downloadUrl }))
      };

      // Update stored batch status
      this.batchStatuses.set(batchId, {
        ...batchStatus,
        ...batchProgress,
        lastUpdated: new Date().toISOString()
      });

      return batchProgress;

    } catch (error) {
      console.error('❌ Failed to report batch progress:', error.message);
      throw error;
    }
  }

  /**
   * Send webhook notification
   * @param {string} event - Event type ('job', 'batch', 'system')
   * @param {Object} data - Event data
   */
  async sendWebhook(event, data) {
    if (!this.config.enableWebhooks || this.webhookSubscribers.size === 0) {
      return;
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      source: 'CapEdify StatusReporterAgent'
    };

    console.log(`🔗 Sending webhook: ${event} to ${this.webhookSubscribers.size} subscribers`);

    const webhookPromises = Array.from(this.webhookSubscribers).map(async (webhookUrl) => {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CapEdify-StatusReporter/1.0'
          },
          body: JSON.stringify(payload),
          timeout: this.config.webhookTimeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✅ Webhook delivered: ${webhookUrl}`);
      } catch (error) {
        console.error(`❌ Webhook failed: ${webhookUrl} - ${error.message}`);
      }
    });

    // Send webhooks in parallel, don't wait for completion
    Promise.allSettled(webhookPromises);
  }

  /**
   * Generate download URL for job results
   * @param {string} zipPath - Path to ZIP file
   * @param {string} jobId - Job identifier
   * @returns {Promise<string>} - Public download URL
   */
  async generateDownloadURL(zipPath, jobId) {
    try {
      // For local development, create a public URL
      const publicDir = path.join(__dirname, '../public/downloads');
      await fs.mkdir(publicDir, { recursive: true });

      const filename = path.basename(zipPath);
      const publicPath = path.join(publicDir, filename);
      
      // Copy file to public directory
      await fs.copyFile(zipPath, publicPath);

      const downloadUrl = `/downloads/${filename}`;
      
      // Store download info for cleanup
      this._scheduleDownloadCleanup(publicPath, jobId);

      console.log(`🔗 Download URL generated: ${downloadUrl}`);
      return downloadUrl;

    } catch (error) {
      console.error('❌ Failed to generate download URL:', error.message);
      throw error;
    }
  }

  /**
   * Get system health and performance metrics
   * @returns {Object} - System metrics
   */
  getSystemMetrics() {
    const activeJobCount = this.activeJobs.size;
    const activeBatchCount = this.batchStatuses.size;
    const memoryUsage = process.memoryUsage();

    return {
      ...this.systemMetrics,
      currentLoad: {
        activeJobs: activeJobCount,
        activeBatches: activeBatchCount,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        }
      },
      uptime: process.uptime(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Register batch for monitoring
   * @param {string} batchId - Batch identifier
   * @param {Object} batchInfo - Batch information
   */
  registerBatch(batchId, batchInfo) {
    const batchStatus = {
      batchId,
      totalJobs: batchInfo.totalJobs,
      status: 'created',
      startedAt: new Date().toISOString(),
      completedAt: null,
      options: batchInfo.options || {},
      source: batchInfo.source || 'unknown',
      lastUpdated: new Date().toISOString()
    };

    this.batchStatuses.set(batchId, batchStatus);
    console.log(`📋 Batch registered: ${batchId} (${batchInfo.totalJobs} jobs)`);
  }

  // ========================================================================
  // SSE (Server-Sent Events) Support
  // ========================================================================

  /**
   * Register SSE connection for real-time updates
   * @param {Object} res - Express response object
   * @param {string} batchId - Optional batch ID filter
   */
  registerSSEConnection(res, batchId = null) {
    const connectionId = uuidv4();
    
    const connection = {
      id: connectionId,
      response: res,
      batchId: batchId,
      createdAt: new Date().toISOString()
    };

    this.sseConnections.add(connection);

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Handle connection close
    res.on('close', () => {
      this.sseConnections.delete(connection);
      console.log(`📡 SSE connection closed: ${connectionId}`);
    });

    console.log(`📡 SSE connection registered: ${connectionId}`);
  }

  // ========================================================================
  // PRIVATE METHODS - Internal status processing and utilities
  // ========================================================================

  /**
   * Start status monitoring loop
   * @private
   */
  _startStatusMonitoring() {
    setInterval(() => {
      this._updateSystemMetrics();
      this._broadcastStatusUpdates();
      this._cleanupOldData();
    }, this.config.updateInterval);

    console.log('📊 Status monitoring started');
  }

  /**
   * Update batch-level status based on job updates
   * @private
   */
  async _updateBatchStatus(batchId, jobId, jobStatus) {
    if (!batchId) return;

    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) return;

    // Update batch status based on job completion
    const batchProgress = await this.reportBatchProgress(batchId);
    
    // Emit batch update event
    this.emit('batchUpdated', batchProgress);

    // Send batch completion webhook
    if (batchProgress.status === 'completed') {
      await this._sendNotifications('batch', batchProgress);
      this.systemMetrics.totalBatchesProcessed++;
    }
  }

  /**
   * Calculate estimated time remaining for batch
   * @private
   */
  _calculateBatchETA(jobs) {
    const processingJobs = jobs.filter(job => job.status === 'processing');
    if (processingJobs.length === 0) return null;

    const completedJobs = jobs.filter(job => job.status === 'completed');
    if (completedJobs.length === 0) return null;

    // Calculate average processing time from completed jobs
    const avgProcessingTime = completedJobs.reduce((sum, job) => sum + job.processingTime, 0) / completedJobs.length;

    // Estimate remaining time
    const remainingJobs = jobs.filter(job => job.status !== 'completed' && job.status !== 'failed').length;
    const estimatedMs = remainingJobs * avgProcessingTime;

    return Math.round(estimatedMs / 1000); // Return seconds
  }

  /**
   * Determine overall batch status
   * @private
   */
  _determineBatchStatus(completedJobs, failedJobs, processingJobs, totalJobs) {
    if (completedJobs === totalJobs) return 'completed';
    if (failedJobs === totalJobs) return 'failed';
    if (processingJobs > 0) return 'processing';
    if (failedJobs > 0 && completedJobs > 0) return 'partial';
    return 'pending';
  }

  /**
   * Send notifications via configured channels
   * @private
   */
  async _sendNotifications(type, data) {
    // Send webhook
    if (this.config.enableWebhooks) {
      await this.sendWebhook(type, data);
    }

    // Send SSE updates
    if (this.config.enableSSE) {
      this._broadcastSSE(type, data);
    }
  }

  /**
   * Broadcast SSE updates to connected clients
   * @private
   */
  _broadcastSSE(type, data) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    for (const connection of this.sseConnections) {
      try {
        // Filter by batch ID if specified
        if (connection.batchId && data.batchId && connection.batchId !== data.batchId) {
          continue;
        }

        connection.response.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        // Connection might be closed, remove it
        this.sseConnections.delete(connection);
      }
    }
  }

  /**
   * Broadcast periodic status updates
   * @private
   */
  _broadcastStatusUpdates() {
    if (this.sseConnections.size > 0) {
      const metrics = this.getSystemMetrics();
      this._broadcastSSE('system', metrics);
    }
  }

  /**
   * Update system performance metrics
   * @private
   */
  _updateSystemMetrics() {
    // Update error rate
    const totalJobs = this.systemMetrics.totalJobsProcessed;
    const failedJobs = Array.from(this.completedJobs.values()).filter(job => job.status === 'failed').length;
    this.systemMetrics.errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

    // Update average times
    const completedJobs = Array.from(this.completedJobs.values());
    if (completedJobs.length > 0) {
      this.systemMetrics.averageJobTime = completedJobs.reduce((sum, job) => sum + job.processingTime, 0) / completedJobs.length;
    }

    this.systemMetrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Clean up old status data
   * @private
   */
  _cleanupOldData() {
    const cutoffDate = new Date(Date.now() - (this.config.maxRetentionDays * 24 * 60 * 60 * 1000));
    let cleanedJobs = 0;
    let cleanedBatches = 0;

    // Clean up old completed jobs
    for (const [jobId, job] of this.completedJobs) {
      if (new Date(job.updatedAt) < cutoffDate) {
        this.completedJobs.delete(jobId);
        cleanedJobs++;
      }
    }

    // Clean up old batch statuses
    for (const [batchId, batch] of this.batchStatuses) {
      if (batch.completedAt && new Date(batch.completedAt) < cutoffDate) {
        this.batchStatuses.delete(batchId);
        cleanedBatches++;
      }
    }

    if (cleanedJobs > 0 || cleanedBatches > 0) {
      console.log(`🧹 Cleaned up: ${cleanedJobs} jobs, ${cleanedBatches} batches`);
    }
  }

  /**
   * Schedule download file cleanup
   * @private
   */
  _scheduleDownloadCleanup(filePath, jobId) {
    // Clean up download files after 24 hours
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
        console.log(`🧹 Download file cleaned up: ${path.basename(filePath)}`);
      } catch (error) {
        // File might already be deleted, ignore error
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Add webhook subscriber
   * @param {string} webhookUrl - Webhook URL to notify
   */
  addWebhookSubscriber(webhookUrl) {
    this.webhookSubscribers.add(webhookUrl);
    console.log(`🔗 Webhook subscriber added: ${webhookUrl}`);
  }

  /**
   * Remove webhook subscriber
   * @param {string} webhookUrl - Webhook URL to remove
   */
  removeWebhookSubscriber(webhookUrl) {
    this.webhookSubscribers.delete(webhookUrl);
    console.log(`🔗 Webhook subscriber removed: ${webhookUrl}`);
  }
}

// Export singleton instance
module.exports = new StatusReporterAgent();