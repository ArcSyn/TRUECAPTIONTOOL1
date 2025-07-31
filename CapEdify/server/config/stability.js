/**
 * CapEdify Stability Configuration
 * Defines which services and routes are locked/stable vs development
 */

const STABLE_SERVICES = {
  // Core export functionality - DO NOT MODIFY
  multiFormatExportService: true,
  exportCleanupService: true,
  
  // Agent-based processing - STABLE
  batchCoordinatorAgent: true,
  queueWorkerAgent: true,
  statusReporterAgent: true,
};

const STABLE_ROUTES = {
  // Export system routes - LOCKED
  '/api/export/custom': true,
  '/api/export/status/:exportId': true,
  '/api/export/download/:exportId': true,
  '/api/export/presets': true,
  '/api/export/themes': true,
  '/api/export/jobs': true,
  
  // Batch processing routes - STABLE
  '/api/batch/process': true,
  '/api/batch/status/:batchId': true,
  '/api/batch/download/:jobId': true,
  
  // Pipeline routes - STABLE
  '/api/pipeline/run': true,
  '/api/pipeline/status/:jobId': true,
  '/api/pipeline/download/:jobId': true,
};

const DEVELOPMENT_COMPONENTS = {
  // These can be modified during development
  batchProcessingDemo: false,
  batchProcessingProgress: false,
  // Add new experimental features here
};

// Health check endpoints for monitoring
const HEALTH_CHECKS = {
  exportService: '/health/export',
  batchProcessor: '/health/batch',
  agentSystem: '/health/agents',
  cleanup: '/health/cleanup'
};

// Rate limiting for stable endpoints
const RATE_LIMITS = {
  export: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  batch: {
    windowMs: 15 * 60 * 1000,
    max: 50
  }
};

// Monitoring thresholds
const MONITORING = {
  maxResponseTime: 5000, // 5 seconds
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  maxCpuUsage: 80, // 80%
  maxFileAge: 24 * 60 * 60 * 1000, // 24 hours
};

module.exports = {
  STABLE_SERVICES,
  STABLE_ROUTES,
  DEVELOPMENT_COMPONENTS,
  HEALTH_CHECKS,
  RATE_LIMITS,
  MONITORING
};