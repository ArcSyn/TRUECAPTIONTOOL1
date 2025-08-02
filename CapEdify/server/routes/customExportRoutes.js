const express = require('express');
const router = express.Router();

// Debug endpoint to test routing
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Advanced Export System routes working',
    timestamp: new Date().toISOString()
  });
});
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { getUserId } = require('../middleware/userAuth');

// Import existing agents - reuse the proven logic
const AEJSXExporterAgent = require('../services/aeJSXExporterAgent');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Ensure exports directory exists
const EXPORTS_DIR = path.join(__dirname, '../exports');
const ensureExportsDir = async () => {
  try {
    await fs.access(EXPORTS_DIR);
  } catch {
    await fs.mkdir(EXPORTS_DIR, { recursive: true });
  }
};

/**
 * POST /api/export/custom
 * 
 * Advanced Export System - creates multi-format ZIP exports
 * 
 * Body:
 * {
 *   "jobs": ["jobA", "jobB"],
 *   "formats": ["jsx", "srt", "txrt"],
 *   "jsxStyle": "bold",
 *   "zipMode": "grouped",
 *   "compress": true,
 *   "expiresInHours": 24,
 *   "renameMap": {
 *     "jobA": "clip_1",
 *     "jobB": "clip_2"
 *   }
 * }
 */
router.post('/custom', getUserId, async (req, res) => {
  console.log('📦 Advanced Export System - Custom export request received');
  console.log('🔐 User ID:', req.userId);
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      jobs, 
      formats, 
      jsxStyle = 'bold', 
      zipMode = 'grouped', 
      compress = false, 
      expiresInHours = 24,
      renameMap = {}
    } = req.body;

    // Validation
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid jobs array provided'
      });
    }

    if (!formats || !Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one export format must be specified'
      });
    }

    const validFormats = ['jsx', 'srt', 'txrt', 'ytvv'];
    const invalidFormats = formats ? formats.filter(f => !validFormats.includes(f)) : [];
    if (invalidFormats.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid formats: ${invalidFormats.join(', ')}`
      });
    }

    console.log(`📋 Processing ${jobs.length} jobs with formats: ${formats.join(', ')}`);
    console.log(`🎨 JSX Style: ${jsxStyle}, ZIP Mode: ${zipMode}, Compress: ${compress}`);

    await ensureExportsDir();

    // Generate unique export ID
    const exportId = uuidv4();
    const exportDir = path.join(EXPORTS_DIR, exportId);
    await fs.mkdir(exportDir, { recursive: true });

    const exportData = {
      export_id: exportId,
      user_id: req.userId,
      job_ids: jobs,
      formats,
      jsx_style: jsxStyle,
      zip_mode: zipMode,
      compress,
      status: 'processing',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString()
    };

    // Store export record in database (optional - skip if table doesn't exist)
    try {
      const { error: dbError } = await supabase
        .from('exports')
        .insert(exportData);

      if (dbError) {
        console.warn('⚠️  Database warning (exports table may not exist):', dbError.message);
        // Continue without database logging for now
      }
    } catch (dbErr) {
      console.warn('⚠️  Database table missing, continuing without export logging');
    }

    // Process each job and generate files
    const processedJobs = [];
    const errors = [];

    for (const jobId of jobs) {
      try {
        console.log(`🔄 Processing job: ${jobId}`);
        
        // Get transcription data from pipeline job results (reuse existing logic)
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('result')
          .eq('id', jobId)
          .eq('status', 'completed')
          .single();
        
        if (jobError || !job || !job.result?.data?.transcriptionData) {
          errors.push(`Job ${jobId}: No transcription data found or job not completed`);
          continue;
        }
        
        const transcriptionData = job.result.data.transcriptionData;

        const jobName = renameMap[jobId] || `job_${jobId}`;
        const jobDir = zipMode === 'grouped' ? path.join(exportDir, jobName) : exportDir;
        
        if (zipMode === 'grouped') {
          await fs.mkdir(jobDir, { recursive: true });
        }

        const jobFiles = [];

        // Generate each requested format
        for (const format of formats) {
          try {
            let filename, content;

            switch (format) {
              case 'jsx':
                console.log(`🎬 Generating JSX (${jsxStyle}) for ${jobId}`);
                // Use segments from transcriptionData (captionSegments or segments)
                const segments = transcriptionData.captionSegments || transcriptionData.segments;
                content = AEJSXExporterAgent.generateJSX(segments, {
                  style: jsxStyle,
                  position: 'bottom',
                  projectName: jobName
                });
                filename = `${jobName}.jsx`;
                break;

              case 'srt':
                console.log(`📄 Generating SRT for ${jobId}`);
                content = await generateSRT(transcriptionData);
                filename = `${jobName}.srt`;
                break;

              case 'txrt':
                console.log(`📝 Generating TXRT for ${jobId}`);
                content = await generateTXRT(transcriptionData);
                filename = `${jobName}.txrt`;
                break;

              case 'ytvv':
                console.log(`📺 Generating YTVV for ${jobId}`);
                content = await generateYTVV(transcriptionData);
                filename = `${jobName}.ytvv`;
                break;

              default:
                throw new Error(`Unsupported format: ${format}`);
            }

            // Write file to export directory
            const filePath = path.join(jobDir, filename);
            await fs.writeFile(filePath, content, 'utf8');
            jobFiles.push(filename);
            
            console.log(`✅ Generated ${filename} (${content.length} chars)`);
          } catch (formatError) {
            console.error(`❌ Error generating ${format} for ${jobId}:`, formatError);
            errors.push(`Job ${jobId}, format ${format}: ${formatError.message}`);
          }
        }

        processedJobs.push({
          jobId,
          jobName,
          files: jobFiles
        });

      } catch (jobError) {
        console.error(`❌ Error processing job ${jobId}:`, jobError);
        errors.push(`Job ${jobId}: ${jobError.message}`);
      }
    }

    // Create ZIP file
    const zipFilename = `export_${exportId}.zip`;
    const zipPath = path.join(EXPORTS_DIR, zipFilename);
    
    console.log(`📦 Creating ZIP archive: ${zipFilename}`);
    await createZipArchive(exportDir, zipPath, compress);

    // Clean up temporary directory
    await fs.rm(exportDir, { recursive: true, force: true });

    // Generate download URL
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/export/download/${exportId}`;

    // Update export record with completion (optional)
    try {
      await supabase
        .from('exports')
        .update({
          status: 'completed',
          download_url: downloadUrl,
          processed_jobs: processedJobs.length,
          errors: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString()
        })
        .eq('export_id', exportId);
    } catch (updateErr) {
      console.warn('⚠️  Could not update export record (table may not exist)');
    }

    console.log(`🎉 Export completed: ${processedJobs.length} jobs processed, ${errors.length} errors`);

    res.json({
      success: true,
      exportId,
      downloadUrl,
      processedJobs: processedJobs.length,
      totalJobs: jobs.length,
      errors: errors.length > 0 ? errors : undefined,
      expiresAt: exportData.expiresAt
    });

  } catch (error) {
    console.error('❌ Advanced Export System error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during export processing'
    });
  }
});

/**
 * GET /api/export/download/:exportId
 * Download completed export ZIP
 */
router.get('/download/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // Get export record from database
    const { data: exportRecord, error } = await supabase
      .from('exports')
      .select('*')
      .eq('export_id', exportId)
      .single();

    if (error || !exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }

    // Check if expired
    if (new Date() > new Date(exportRecord.expires_at)) {
      return res.status(410).json({
        success: false,
        error: 'Export has expired'
      });
    }

    const zipPath = path.join(EXPORTS_DIR, `export_${exportId}.zip`);
    
    try {
      await fs.access(zipPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found'
      });
    }

    console.log(`📥 Serving export download: ${exportId}`);
    
    res.download(zipPath, `capedify_export_${exportId}.zip`, (err) => {
      if (err) {
        console.error('❌ Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Download failed'
          });
        }
      }
    });

  } catch (error) {
    console.error('❌ Download endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper Functions

/**
 * Generate SRT format subtitle file
 */
async function generateSRT(transcriptionData) {
  // Use the existing srtContent if available, or generate from segments
  if (transcriptionData.srtContent) {
    return transcriptionData.srtContent;
  }
  
  const segments = transcriptionData.captionSegments || transcriptionData.segments;
  if (!segments || segments.length === 0) {
    throw new Error('No segments available for SRT generation');
  }

  let srtContent = '';
  segments.forEach((segment, index) => {
    const startTime = formatSRTTime(segment.start);
    const endTime = formatSRTTime(segment.end);
    
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment.text.trim()}\n\n`;
  });

  return srtContent;
}

/**
 * Generate TXRT format (CapEdify's enhanced transcript format)
 */
async function generateTXRT(transcriptionData) {
  const segments = transcriptionData.captionSegments || transcriptionData.segments;
  const txrt = {
    version: '1.0',
    source: 'CapEdify Advanced Export',
    generatedAt: new Date().toISOString(),
    totalDuration: transcriptionData.duration || 0,
    wordCount: transcriptionData.totalWords || 0,
    characterCount: transcriptionData.totalCharacters || 0,
    segments: segments || [],
    fullText: transcriptionData.text || segments?.map(s => s.text).join(' ') || ''
  };

  return JSON.stringify(txrt, null, 2);
}

/**
 * Generate YTVV format (YouTube VTT-compatible)
 */
async function generateYTVV(transcriptionData) {
  const segments = transcriptionData.captionSegments || transcriptionData.segments;
  if (!segments || segments.length === 0) {
    throw new Error('No segments available for YTVV generation');
  }

  let vttContent = 'WEBVTT\n\n';
  
  segments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.start);
    const endTime = formatVTTTime(segment.end);
    
    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${segment.text.trim()}\n\n`;
  });

  return vttContent;
}

/**
 * Format time for SRT files (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format time for VTT files (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Create ZIP archive with optional compression
 */
async function createZipArchive(sourceDir, outputPath, compress = false) {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: compress ? 9 : 1 } // 9 = best compression, 1 = fastest
    });

    output.on('close', () => {
      console.log(`📦 ZIP created: ${archive.pointer()} total bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ ZIP creation error:', err);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

module.exports = router;