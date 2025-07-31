/**
 * Custom Export Routes - Advanced export management API
 * 
 * @description REST API endpoints for CapEdify's advanced export system.
 * Handles custom export bundle generation, preset management, and file downloads.
 * 
 * Key Endpoints:
 * • POST /api/export/custom - Create custom export bundle
 * • GET /api/export/status/:exportId - Check export status
 * • GET /api/export/download/:exportId - Download export bundle
 * • GET /api/export/presets - List user's export presets
 * • POST /api/export/presets - Save new export preset
 * • GET /api/export/themes - List available themes
 * • GET /api/export/jobs - List user's completed jobs
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const customExportService = require('../services/customExportService');
const { getUserId, setupRLSContext } = require('../middleware/userAuth');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

/**
 * POST /api/export/custom - Create custom export bundle
 */
router.post('/custom', getUserId, async (req, res) => {
  try {
    const {
      jobs,
      formats = ['jsx'],
      theme = 'minimal_clean',
      jsxStyle = 'modern',
      zipMode = 'grouped',
      compress = false,
      expiresInHours = 24,
      renameMap = {},
      presetId = null
    } = req.body;

    // Validation
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Jobs array is required and must not be empty'
      });
    }

    const validFormats = ['jsx', 'srt', 'vtt', 'json', 'txt'];
    const invalidFormats = formats.filter(f => !validFormats.includes(f));
    if (invalidFormats.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid formats: ${invalidFormats.join(', ')}`
      });
    }

    const validJsxStyles = ['bold', 'modern', 'plain'];
    if (!validJsxStyles.includes(jsxStyle)) {
      return res.status(400).json({
        success: false,
        error: `Invalid jsxStyle. Must be one of: ${validJsxStyles.join(', ')}`
      });
    }

    const validZipModes = ['individual', 'grouped', 'combined'];
    if (!validZipModes.includes(zipMode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid zipMode. Must be one of: ${validZipModes.join(', ')}`
      });
    }

    console.log('🎨 Custom export request:', {
      userId: req.userId.substring(0, 12) + '...',
      jobs: jobs.length,
      formats: formats.join(', '),
      theme,
      zipMode
    });

    // Create export bundle
    const result = await customExportService.createCustomExport({
      jobs,
      formats,
      theme,
      jsxStyle,
      zipMode,
      compress,
      expiresInHours,
      renameMap,
      presetId
    }, req.userId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Custom export creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/status/:exportId - Check export status
 */
router.get('/status/:exportId', getUserId, async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const status = await customExportService.getExportStatus(exportId, req.userId);
    
    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error(`❌ Export status check failed for ${req.params.exportId}:`, error);
    
    if (error.message === 'Export not found') {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/download/:exportId - Download export bundle
 */
router.get('/download/:exportId', getUserId, async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // Get export record
    const { data: exportRecord, error } = await supabase
      .from('custom_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', req.userId)
      .single();

    if (error || !exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }

    // Check if expired
    if (new Date(exportRecord.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Export has expired'
      });
    }

    // Check if completed
    if (exportRecord.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Export is not ready. Status: ${exportRecord.status}`,
        status: exportRecord.status
      });
    }

    // Send file
    const filePath = path.join(customExportService.exportDir, `export_${exportId}.zip`);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Export file not found'
      });
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename=\"${exportRecord.zip_filename}\"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', exportRecord.zip_size_bytes || 0);
    res.setHeader('X-Export-ID', exportId);
    res.setHeader('X-Expires-At', exportRecord.expires_at);

    // Stream file
    res.sendFile(path.resolve(filePath));
    
    console.log(`📥 Export downloaded: ${exportId} by ${req.userId.substring(0, 12)}...`);

  } catch (error) {
    console.error(`❌ Export download failed for ${req.params.exportId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/presets - List user's export presets
 */
router.get('/presets', getUserId, async (req, res) => {
  try {
    const { data: presets, error } = await supabase
      .from('export_presets')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch presets: ${error.message}`);
    }

    res.json({
      success: true,
      presets: presets || []
    });

  } catch (error) {
    console.error('❌ Preset fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/export/presets - Save new export preset
 */
router.post('/presets', getUserId, async (req, res) => {
  try {
    const { name, description, config } = req.body;

    if (!name || !config) {
      return res.status(400).json({
        success: false,
        error: 'Name and config are required'
      });
    }

    const { data: preset, error } = await supabase
      .from('export_presets')
      .insert({
        user_id: req.userId,
        name,
        description: description || '',
        config_json: config
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Preset name already exists'
        });
      }
      throw new Error(`Failed to save preset: ${error.message}`);
    }

    res.json({
      success: true,
      preset
    });

  } catch (error) {
    console.error('❌ Preset save failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/export/presets/:presetId - Delete export preset
 */
router.delete('/presets/:presetId', getUserId, async (req, res) => {
  try {
    const { presetId } = req.params;

    const { error } = await supabase
      .from('export_presets')
      .delete()
      .eq('id', presetId)
      .eq('user_id', req.userId);

    if (error) {
      throw new Error(`Failed to delete preset: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Preset deleted successfully'
    });

  } catch (error) {
    console.error('❌ Preset deletion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/themes - List available themes
 */
router.get('/themes', async (req, res) => {
  try {
    const { data: themes, error } = await supabase
      .from('export_themes')
      .select('id, name, display_name, description, theme_config, category, preview_image_url')
      .eq('is_public', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch themes: ${error.message}`);
    }

    // Group themes by category
    const themesByCategory = (themes || []).reduce((groups, theme) => {
      if (!groups[theme.category]) {
        groups[theme.category] = [];
      }
      groups[theme.category].push(theme);
      return groups;
    }, {});

    res.json({
      success: true,
      themes: themesByCategory
    });

  } catch (error) {
    console.error('❌ Themes fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/jobs - List user's completed pipeline jobs
 */
router.get('/jobs', getUserId, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: jobs, error } = await supabase
      .from('pipeline_jobs_extended')
      .select('job_id, input_filename, input_type, duration_minutes, processing_config, files_generated, created_at, completed_at')
      .eq('user_id', req.userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    // Format job data for frontend
    const formattedJobs = (jobs || []).map(job => ({
      jobId: job.job_id,
      filename: job.input_filename,
      inputType: job.input_type,
      duration: job.duration_minutes,
      style: job.processing_config?.style || 'modern',
      position: job.processing_config?.position || 'bottom',
      availableFormats: Object.keys(job.files_generated || {}),
      createdAt: job.created_at,
      completedAt: job.completed_at
    }));

    res.json({
      success: true,
      jobs: formattedJobs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: formattedJobs.length
      }
    });

  } catch (error) {
    console.error('❌ Jobs fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/export/cleanup - Manual cleanup of expired exports (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await customExportService.cleanupExpiredExports();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired exports`
    });

  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DEBUG ENDPOINT - Check pipeline jobs in database
 */
router.get('/debug/pipeline-jobs', async (req, res) => {
  try {
    const { data: allJobs, error } = await supabase
      .from('pipeline_jobs_extended')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    res.json({
      success: true,
      totalJobs: allJobs?.length || 0,
      jobs: allJobs || [],
      tableName: 'pipeline_jobs_extended'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;