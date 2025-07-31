#!/usr/bin/env node

/**
 * CaptionForge CLI - Batch video processing command-line interface
 * 
 * @description Command-line tool for batch processing video files with CapEdify
 * 
 * Usage:
 * • captionforge *.mp4                    - Process all MP4 files in current directory
 * • captionforge folder/                  - Process all video files in folder
 * • captionforge video1.mp4 video2.mov   - Process specific files
 * • captionforge --help                   - Show help information
 * 
 * Features:
 * • Glob pattern support for flexible file selection
 * • Real-time progress tracking with live updates
 * • Multiple output formats (SRT, VTT, JSX, JSON, TXT)
 * • Automatic ZIP packaging per video
 * • Error handling with detailed feedback
 * • Resume support for interrupted batches
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs').promises;
const glob = require('glob');
const axios = require('axios');

// Import batch coordinator for direct processing
const batchCoordinatorAgent = require('../server/services/batchCoordinatorAgent');
const statusReporterAgent = require('../server/services/statusReporterAgent');

const program = new Command();

// CLI Configuration
const CLI_CONFIG = {
  name: 'captionforge',
  version: '1.0.0',
  description: 'Batch video processing for automated caption generation',
  serverUrl: process.env.CAPEDIFY_SERVER || 'http://localhost:3001',
  outputFormats: ['srt', 'vtt', 'jsx', 'json', 'txt'],
  supportedFormats: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
  maxRetries: 3,
  pollInterval: 2000, // Progress polling interval (ms)
};

// ========================================================================
// CLI PROGRAM SETUP
// ========================================================================

program
  .name(CLI_CONFIG.name)
  .version(CLI_CONFIG.version)
  .description(CLI_CONFIG.description)
  .usage('[options] <files...>')
  .option('-s, --style <style>', 'JSX caption style (bold, modern, minimal)', 'modern')
  .option('-p, --position <position>', 'Caption position (top, center, bottom)', 'bottom')
  .option('-f, --formats <formats>', 'Output formats (comma-separated)', CLI_CONFIG.outputFormats.join(','))
  .option('-o, --output <dir>', 'Output directory for downloads', './downloads')
  .option('-t, --tier <tier>', 'User tier (free, creator, studio)', 'free')
  .option('-w, --webhook <url>', 'Webhook URL for notifications')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-j, --json', 'Output results as JSON')
  .option('--server <url>', 'CapEdify server URL', CLI_CONFIG.serverUrl)
  .option('--no-cleanup', 'Keep temporary files after processing')
  .argument('[files...]', 'Video files or patterns to process')
  .action(async (files, options) => {
    try {
      await processFiles(files, options);
    } catch (error) {
      console.error('❌ CaptionForge failed:', error.message);
      process.exit(1);
    }
  });

// Add help examples
program.addHelpText('after', `
Examples:
  $ captionforge video.mp4                    Process single video
  $ captionforge *.mp4                        Process all MP4 files
  $ captionforge folder/                       Process all videos in folder
  $ captionforge video1.mp4 video2.mov        Process multiple files
  $ captionforge --style bold --formats srt,jsx *.mp4
  $ captionforge --webhook https://api.example.com/notify *.mp4

Supported formats: ${CLI_CONFIG.supportedFormats.join(', ')}
Output formats: ${CLI_CONFIG.outputFormats.join(', ')}
`);

// ========================================================================
// MAIN PROCESSING FUNCTIONS
// ========================================================================

/**
 * Main function to process files based on CLI arguments
 */
async function processFiles(fileArgs, options) {
  const startTime = Date.now();
  
  if (!options.quiet) {
    console.log('🚀 CaptionForge - Batch Video Processing');
    console.log('=====================================');
  }

  // Validate and expand file arguments
  const videoFiles = await expandFileArguments(fileArgs);
  
  if (videoFiles.length === 0) {
    throw new Error('No valid video files found to process');
  }

  if (!options.quiet) {
    console.log(`📁 Found ${videoFiles.length} video files to process`);
    console.log(`🎨 Style: ${options.style} | Position: ${options.position}`);
    console.log(`📄 Formats: ${options.formats}`);
    console.log('');
  }

  // Prepare processing options
  const processingOptions = {
    style: options.style,
    position: options.position,
    outputFormats: options.formats.split(',').map(f => f.trim()),
    userTier: options.tier,
    webhookUrl: options.webhook,
    projectName: 'CLI_Batch_Processing'
  };

  try {
    // Start batch processing using BatchCoordinatorAgent directly
    const batchResult = await batchCoordinatorAgent.processMultipleFiles(
      videoFiles.map(f => ({
        originalname: f.filename,
        path: f.path,
        size: f.size
      })),
      processingOptions
    );

    // Register batch with status reporter
    statusReporterAgent.registerBatch(batchResult.batchId, {
      totalJobs: batchResult.totalJobs,
      options: processingOptions,
      source: 'cli'
    });

    if (!options.quiet) {
      console.log(`✅ Batch created: ${batchResult.batchId}`);
      console.log(`⏳ Estimated duration: ${batchResult.estimatedDuration}`);
      console.log('');
    }

    // Monitor progress
    const result = await monitorBatchProgress(batchResult.batchId, options);
    
    // Handle results
    await handleResults(result, options);
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        batchId: batchResult.batchId,
        totalJobs: result.totalJobs,
        completedJobs: result.completedJobs,
        failedJobs: result.failedJobs,
        processingTime: totalTime,
        downloads: result.jobs.filter(j => j.downloadUrl).map(j => ({
          filename: j.filename,
          downloadUrl: j.downloadUrl
        }))
      }, null, 2));
    } else if (!options.quiet) {
      console.log('');
      console.log('🎉 Batch processing completed!');
      console.log(`📊 Results: ${result.completedJobs}/${result.totalJobs} successful`);
      console.log(`⏱️ Total time: ${totalTime}s`);
      
      if (result.failedJobs > 0) {
        console.log(`❌ Failed jobs: ${result.failedJobs}`);
      }
    }

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: error.message,
        processingTime: Math.round((Date.now() - startTime) / 1000)
      }, null, 2));
    }
    throw error;
  }
}

/**
 * Expand file arguments to actual video files
 */
async function expandFileArguments(fileArgs) {
  const videoFiles = [];
  
  if (!fileArgs || fileArgs.length === 0) {
    // Default to current directory
    fileArgs = ['./'];
  }

  for (const arg of fileArgs) {
    try {
      const stat = await fs.stat(arg);
      
      if (stat.isDirectory()) {
        // Process directory
        const dirFiles = await findVideoFilesInDirectory(arg);
        videoFiles.push(...dirFiles);
      } else if (stat.isFile()) {
        // Single file
        const ext = path.extname(arg).toLowerCase();
        if (CLI_CONFIG.supportedFormats.includes(ext)) {
          videoFiles.push({
            filename: path.basename(arg),
            path: path.resolve(arg),
            size: stat.size
          });
        }
      }
    } catch (error) {
      // Treat as glob pattern
      const globFiles = await expandGlobPattern(arg);
      videoFiles.push(...globFiles);
    }
  }

  // Remove duplicates
  const uniqueFiles = [];
  const seen = new Set();
  
  for (const file of videoFiles) {
    const key = `${file.filename}:${file.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }

  return uniqueFiles;
}

/**
 * Find video files in a directory
 */
async function findVideoFilesInDirectory(dirPath) {
  const files = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (CLI_CONFIG.supportedFormats.includes(ext)) {
        const filePath = path.join(dirPath, entry.name);
        const stat = await fs.stat(filePath);
        files.push({
          filename: entry.name,
          path: path.resolve(filePath),
          size: stat.size
        });
      }
    }
  }
  
  return files;
}

/**
 * Expand glob pattern to video files
 */
async function expandGlobPattern(pattern) {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, filePaths) => {
      if (err) {
        resolve([]); // Return empty array on glob error
        return;
      }
      
      const videoFiles = filePaths
        .filter(filePath => {
          const ext = path.extname(filePath).toLowerCase();
          return CLI_CONFIG.supportedFormats.includes(ext);
        })
        .map(filePath => ({
          filename: path.basename(filePath),
          path: path.resolve(filePath),
          size: 0 // Will be filled later if needed
        }));
        
      resolve(videoFiles);
    });
  });
}

/**
 * Monitor batch progress with real-time updates
 */
async function monitorBatchProgress(batchId, options) {
  let lastProgress = -1;
  let dots = '';
  
  while (true) {
    try {
      const status = await statusReporterAgent.reportBatchProgress(batchId);
      
      if (!options.quiet && !options.json) {
        // Update progress display
        if (status.progress !== lastProgress) {
          if (lastProgress >= 0) process.stdout.write('\r');
          
          const progressBar = createProgressBar(status.progress);
          const statusText = `${progressBar} ${status.progress}% (${status.completedJobs}/${status.totalJobs})`;
          process.stdout.write(statusText);
          
          lastProgress = status.progress;
          dots = '';
        } else {
          // Show activity with dots
          dots = (dots.length >= 3) ? '' : dots + '.';
          process.stdout.write(`\r${createProgressBar(status.progress)} ${status.progress}% (${status.completedJobs}/${status.totalJobs})${dots}`);
        }
      }

      // Check if batch is complete
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'partial') {
        if (!options.quiet && !options.json) {
          process.stdout.write('\n');
        }
        return status;
      }

      await sleep(CLI_CONFIG.pollInterval);
      
    } catch (error) {
      if (!options.quiet && !options.json) {
        console.error(`\n⚠️ Status check failed: ${error.message}`);
      }
      await sleep(CLI_CONFIG.pollInterval * 2); // Longer delay on error
    }
  }
}

/**
 * Handle processing results
 */
async function handleResults(result, options) {
  if (!options.quiet && !options.json) {
    console.log('');
    console.log('📥 Download URLs:');
    console.log('================');
    
    for (const job of result.jobs) {
      if (job.status === 'completed' && job.downloadUrl) {
        console.log(`✅ ${job.filename}: ${options.server}${job.downloadUrl}`);
      } else if (job.status === 'failed') {
        console.log(`❌ ${job.filename}: ${job.error || 'Processing failed'}`);
      }
    }
  }
}

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

/**
 * Create a progress bar string
 */
function createProgressBar(progress, width = 20) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// ========================================================================
// ERROR HANDLING
// ========================================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️ CaptionForge interrupted by user');
  process.exit(0);
});

// ========================================================================
// MAIN ENTRY POINT
// ========================================================================

// Parse CLI arguments and run
if (require.main === module) {
  program.parse(process.argv);
}

module.exports = {
  program,
  processFiles,
  expandFileArguments,
  CLI_CONFIG
};