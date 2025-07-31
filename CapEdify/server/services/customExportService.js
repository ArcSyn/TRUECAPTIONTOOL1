/**
 * Custom Export Service - Advanced multi-format export management
 * 
 * @description Handles custom export bundle generation with themes, presets,
 * and expiry management. Supports multiple ZIP modes and format combinations.
 * 
 * Features:
 * • Multi-job format selection and bundling
 * • Theme application to JSX files
 * • Export preset management
 * • Automatic expiry and cleanup
 * • Multiple ZIP modes (individual, grouped, combined)
 */

const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js');

class CustomExportService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );
    
    this.exportDir = process.env.EXPORT_DIR || path.join(__dirname, '../exports');
    this.defaultExpiryHours = 24;
    
    // JSX Style Presets
    this.jsxStylePresets = {
      bold: {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '48px',
        fontWeight: '900',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '8px',
        padding: '16px 24px',
        textAlign: 'center',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        border: '2px solid #FFD700'
      },
      modern: {
        fontFamily: 'Helvetica Neue, Arial, sans-serif',
        fontSize: '36px',
        fontWeight: '500',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '12px',
        padding: '12px 20px',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      },
      plain: {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontWeight: '400',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '4px',
        padding: '8px 16px',
        textAlign: 'center'
      }
    };
    
    // Ensure export directory exists
    this.initializeExportDirectory();
  }

  async initializeExportDirectory() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      console.log('📁 Export directory initialized:', this.exportDir);
    } catch (error) {
      console.error('❌ Failed to create export directory:', error);
    }
  }

  /**
   * Create custom export bundle
   * @param {Object} exportRequest - Export configuration
   * @param {string} userId - User ID
   * @returns {Object} Export result with URL and expiry
   */
  async createCustomExport(exportRequest, userId) {
    const {
      jobs,
      formats = ['jsx'],
      theme = 'minimal_clean',
      jsxStyle = 'modern',
      zipMode = 'grouped',
      compress = false,
      expiresInHours = this.defaultExpiryHours,
      renameMap = {},
      presetId = null
    } = exportRequest;

    console.log('🎨 Creating custom export:', {
      jobCount: jobs.length,
      formats: formats.join(', '),
      theme,
      jsxStyle,
      zipMode,
      userId: userId.substring(0, 8) + '...'
    });

    try {
      // Generate unique export ID
      const exportId = this.generateExportId();
      const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

      // Create export record in database
      const { data: exportRecord, error: createError } = await this.supabase
        .from('custom_exports')
        .insert({
          id: exportId,
          user_id: userId,
          job_ids: jobs,
          export_config: {
            formats,
            theme,
            zipMode,
            compress,
            renameMap,
            presetId
          },
          zip_filename: `export_${exportId}.zip`,
          status: 'processing',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create export record: ${createError.message}`);
      }

      // Process export in background
      this.processExportBundle(exportId, exportRequest, userId).catch(error => {
        console.error(`❌ Export processing failed for ${exportId}:`, error);
        this.updateExportStatus(exportId, 'failed', error.message);
      });

      return {
        exportId,
        status: 'processing',
        estimatedCompletion: '30-90 seconds',
        expiresAt: expiresAt.toISOString(),
        statusUrl: `/api/export/status/${exportId}`
      };

    } catch (error) {
      console.error('❌ Custom export creation failed:', error);
      throw error;
    }
  }

  /**
   * Process export bundle generation
   * @param {string} exportId - Export ID
   * @param {Object} exportRequest - Export configuration
   * @param {string} userId - User ID
   */
  async processExportBundle(exportId, exportRequest, userId) {
    const { jobs, formats, theme, zipMode, compress, renameMap } = exportRequest;

    try {
      console.log(`🔄 Processing export bundle ${exportId}...`);

      // Fetch job data from database
      const jobData = await this.fetchJobData(jobs, userId);
      if (jobData.length === 0) {
        throw new Error('No valid jobs found for export');
      }

      // Get theme configuration
      const themeConfig = await this.getThemeConfig(theme);

      // Generate files with theme applied
      const processedFiles = await this.generateThemedFiles(jobData, formats, themeConfig, exportRequest.jsxStyle, renameMap);

      // Create ZIP based on mode
      const zipPath = await this.createZipBundle(exportId, processedFiles, zipMode, compress);
      const zipStats = await fs.stat(zipPath);

      // Upload to storage (Supabase or local)
      const zipUrl = await this.uploadZipFile(exportId, zipPath);

      // Update export record
      await this.updateExportRecord(exportId, {
        status: 'completed',
        zip_url: zipUrl,
        zip_size_bytes: zipStats.size,
        completed_at: new Date().toISOString()
      });

      console.log(`✅ Export bundle ${exportId} completed successfully`);

    } catch (error) {
      console.error(`❌ Export processing failed for ${exportId}:`, error);
      await this.updateExportStatus(exportId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Fetch pipeline job data
   * @param {string[]} jobIds - Array of pipeline job IDs
   * @param {string} userId - User ID for security
   * @returns {Array} Job data with file paths
   */
  async fetchJobData(jobIds, userId) {
    const { data: jobs, error } = await this.supabase
      .from('pipeline_jobs_extended')
      .select('*')
      .in('job_id', jobIds)
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) {
      throw new Error(`Failed to fetch job data: ${error.message}`);
    }

    return jobs || [];
  }

  /**
   * Get theme configuration
   * @param {string} themeName - Theme name
   * @returns {Object} Theme configuration
   */
  async getThemeConfig(themeName) {
    const { data: theme, error } = await this.supabase
      .from('export_themes')
      .select('theme_config')
      .eq('name', themeName)
      .eq('is_public', true)
      .single();

    if (error || !theme) {
      console.warn(`⚠️ Theme ${themeName} not found, using default`);
      return this.getDefaultThemeConfig();
    }

    return theme.theme_config;
  }

  /**
   * Generate themed files for export
   * @param {Array} jobData - Job data with file paths
   * @param {string[]} formats - Requested formats
   * @param {Object} themeConfig - Theme configuration
   * @param {string} jsxStyle - JSX style preset
   * @param {Object} renameMap - File rename mapping
   * @returns {Array} Processed files for ZIP
   */
  async generateThemedFiles(jobData, formats, themeConfig, jsxStyle = 'modern', renameMap = {}) {
    const processedFiles = [];

    for (const job of jobData) {
      const baseName = renameMap[job.job_id] || job.input_filename.replace(/\.[^/.]+$/, '');
      const jobFiles = job.files_generated || {};

      for (const format of formats) {
        if (!jobFiles[format]) {
          console.warn(`⚠️ Format ${format} not available for job ${job.job_id}`);
          continue;
        }

        let filePath = jobFiles[format];
        let fileName = `${baseName}.${format}`;

        // Apply theme and JSX style to JSX files
        if (format === 'jsx') {
          const jsxStyleConfig = this.jsxStylePresets[jsxStyle] || this.jsxStylePresets['modern'];
          filePath = await this.applyThemeToJSX(filePath, themeConfig, jsxStyleConfig, fileName);
        }

        processedFiles.push({
          jobId: job.job_id,
          format,
          filePath,
          fileName,
          jobName: baseName
        });
      }
    }

    return processedFiles;
  }

  /**
   * Apply theme configuration and JSX style to JSX file
   * @param {string} jsxPath - Original JSX file path
   * @param {Object} themeConfig - Theme configuration
   * @param {Object} jsxStyleConfig - JSX style preset configuration
   * @param {string} outputName - Output file name
   * @returns {string} Path to themed JSX file
   */
  async applyThemeToJSX(jsxPath, themeConfig, jsxStyleConfig, outputName) {
    try {
      const originalContent = await fs.readFile(jsxPath, 'utf8');
      
      // Merge theme config with JSX style preset
      const combinedStyles = { ...themeConfig, ...jsxStyleConfig };
      
      // Apply combined styling to JSX content
      const themedContent = this.injectThemeIntoJSX(originalContent, combinedStyles);
      
      // Save themed version
      const themedPath = path.join(this.exportDir, 'temp', `themed_${Date.now()}_${outputName}`);
      await fs.mkdir(path.dirname(themedPath), { recursive: true });
      await fs.writeFile(themedPath, themedContent, 'utf8');
      
      return themedPath;
    } catch (error) {
      console.warn(`⚠️ Failed to apply theme to JSX: ${error.message}`);
      return jsxPath; // Return original if theming fails
    }
  }

  /**
   * Inject theme configuration into JSX content
   * @param {string} jsxContent - Original JSX content
   * @param {Object} themeConfig - Theme configuration
   * @returns {string} Themed JSX content
   */
  injectThemeIntoJSX(jsxContent, themeConfig) {
    // Create CSS style from theme config
    const themeStyles = Object.entries(themeConfig)
      .map(([key, value]) => `${this.camelToKebab(key)}: ${value}`)
      .join('; ');

    // Inject theme into JSX style attributes
    const themedContent = jsxContent.replace(
      /style={{([^}]+)}}/g,
      `style={{$1, ${JSON.stringify(themeConfig).slice(1, -1)}}}`
    );

    return themedContent;
  }

  /**
   * Create ZIP bundle based on mode
   * @param {string} exportId - Export ID
   * @param {Array} files - Files to include
   * @param {string} zipMode - ZIP organization mode
   * @param {boolean} compress - Enable compression
   * @returns {string} ZIP file path
   */
  async createZipBundle(exportId, files, zipMode, compress) {
    const zipPath = path.join(this.exportDir, `export_${exportId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: compress ? 9 : 1 }
      });

      output.on('close', () => {
        console.log(`📦 ZIP created: ${archive.pointer()} bytes`);
        resolve(zipPath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add files based on ZIP mode
      switch (zipMode) {
        case 'individual':
          this.addFilesIndividual(archive, files);
          break;
        case 'grouped':
          this.addFilesGrouped(archive, files);
          break;
        case 'combined':
          this.addFilesCombined(archive, files);
          break;
        default:
          throw new Error(`Invalid ZIP mode: ${zipMode}`);
      }

      archive.finalize();
    });
  }

  /**
   * Add files to archive in individual mode (one ZIP per job)
   */
  addFilesIndividual(archive, files) {
    // Group files by job
    const jobGroups = files.reduce((groups, file) => {
      if (!groups[file.jobId]) groups[file.jobId] = [];
      groups[file.jobId].push(file);
      return groups;
    }, {});

    // Add each job as a separate folder
    Object.entries(jobGroups).forEach(([jobId, jobFiles]) => {
      const firstFile = jobFiles[0];
      const jobFolderName = firstFile.jobName;
      
      jobFiles.forEach(file => {
        archive.file(file.filePath, { name: `${jobFolderName}/${file.fileName}` });
      });
    });
  }

  /**
   * Add files to archive in grouped mode (folders per video)
   */
  addFilesGrouped(archive, files) {
    files.forEach(file => {
      archive.file(file.filePath, { name: `${file.jobName}/${file.fileName}` });
    });
  }

  /**
   * Add files to archive in combined mode (flat structure)
   */
  addFilesCombined(archive, files) {
    files.forEach(file => {
      archive.file(file.filePath, { name: file.fileName });
    });
  }

  /**
   * Upload ZIP file to storage
   * @param {string} exportId - Export ID
   * @param {string} zipPath - Local ZIP file path
   * @returns {string} Storage URL
   */
  async uploadZipFile(exportId, zipPath) {
    try {
      // For now, return local file URL
      // In production, upload to Supabase storage or S3
      const fileName = path.basename(zipPath);
      return `/api/export/download/${exportId}`;
    } catch (error) {
      console.error('❌ ZIP upload failed:', error);
      throw error;
    }
  }

  /**
   * Update export record status
   * @param {string} exportId - Export ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if failed
   */
  async updateExportStatus(exportId, status, errorMessage = null) {
    const updateData = { status };
    if (errorMessage) updateData.error_message = errorMessage;

    const { error } = await this.supabase
      .from('custom_exports')
      .update(updateData)
      .eq('id', exportId);

    if (error) {
      console.error(`❌ Failed to update export status: ${error.message}`);
    }
  }

  /**
   * Update export record with multiple fields
   * @param {string} exportId - Export ID
   * @param {Object} updateData - Data to update
   */
  async updateExportRecord(exportId, updateData) {
    const { error } = await this.supabase
      .from('custom_exports')
      .update(updateData)
      .eq('id', exportId);

    if (error) {
      throw new Error(`Failed to update export record: ${error.message}`);
    }
  }

  /**
   * Get export status
   * @param {string} exportId - Export ID
   * @param {string} userId - User ID for security
   * @returns {Object} Export status
   */
  async getExportStatus(exportId, userId) {
    const { data: exportRecord, error } = await this.supabase
      .from('custom_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', userId)
      .single();

    if (error || !exportRecord) {
      throw new Error('Export not found');
    }

    return {
      exportId,
      status: exportRecord.status,
      createdAt: exportRecord.created_at,
      completedAt: exportRecord.completed_at,
      expiresAt: exportRecord.expires_at,
      downloadUrl: exportRecord.status === 'completed' ? exportRecord.zip_url : null,
      zipSize: exportRecord.zip_size_bytes,
      errorMessage: exportRecord.error_message
    };
  }

  /**
   * Cleanup expired exports
   * @returns {number} Number of cleaned up exports
   */
  async cleanupExpiredExports() {
    try {
      // Get expired exports
      const { data: expiredExports, error: fetchError } = await this.supabase
        .from('custom_exports')
        .select('id, zip_url')
        .lt('expires_at', new Date().toISOString())
        .neq('status', 'expired');

      if (fetchError) {
        throw new Error(`Failed to fetch expired exports: ${fetchError.message}`);
      }

      if (!expiredExports || expiredExports.length === 0) {
        return 0;
      }

      // Delete physical files
      for (const exportRecord of expiredExports) {
        try {
          const filePath = path.join(this.exportDir, `export_${exportRecord.id}.zip`);
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted expired export file: ${exportRecord.id}`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete export file ${exportRecord.id}: ${error.message}`);
        }
      }

      // Update database status
      const { error: updateError } = await this.supabase
        .from('custom_exports')
        .update({ status: 'expired' })
        .in('id', expiredExports.map(e => e.id));

      if (updateError) {
        throw new Error(`Failed to update expired exports: ${updateError.message}`);
      }

      console.log(`🧹 Cleaned up ${expiredExports.length} expired exports`);
      return expiredExports.length;

    } catch (error) {
      console.error('❌ Export cleanup failed:', error);
      return 0;
    }
  }

  // Utility methods
  generateExportId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  getDefaultThemeConfig() {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontWeight: '600',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: '4px',
      padding: '8px 16px',
      textAlign: 'center'
    };
  }
}

module.exports = new CustomExportService();