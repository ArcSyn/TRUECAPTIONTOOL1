/**
 * Multi-Format Export Service - Generate all caption formats
 * 
 * @description Generates multiple caption formats (SRT, VTT, JSX, JSON, TXT)
 * from transcription data and stores file paths for later bundling.
 * 
 * Features:
 * • SRT subtitle format generation
 * • VTT (WebVTT) format generation
 * • JSX After Effects format generation
 * • JSON structured data export
 • Plain text transcription export
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

class MultiFormatExportService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );
    
    this.outputDir = process.env.OUT_DIR || path.join(__dirname, '../outputs');
    this.initializeOutputDirectories();
  }

  async initializeOutputDirectories() {
    try {
      const formats = ['srt', 'vtt', 'jsx', 'json', 'txt'];
      for (const format of formats) {
        await fs.mkdir(path.join(this.outputDir, format), { recursive: true });
      }
      console.log('📁 Multi-format output directories initialized');
    } catch (error) {
      console.error('❌ Failed to create output directories:', error);
    }
  }

  /**
   * Generate all formats from transcription data
   * @param {Object} transcriptionData - Whisper transcription result
   * @param {string} jobId - Pipeline job ID
   * @param {string} projectName - Project name for files
   * @param {Object} options - Processing options
   * @returns {Object} Paths to all generated files
   */
  async generateAllFormats(transcriptionData, jobId, projectName, options = {}) {
    const {
      style = 'modern',
      position = 'bottom',
      userTier = 'free'
    } = options;

    console.log(`🎨 Generating all formats for job ${jobId}...`);

    try {
      const filePaths = {};
      const baseFileName = `${projectName}_${jobId}`;

      // Generate SRT format
      const srtContent = this.generateSRT(transcriptionData);
      const srtPath = path.join(this.outputDir, 'srt', `${baseFileName}.srt`);
      await fs.writeFile(srtPath, srtContent, 'utf8');
      filePaths.srt = srtPath;

      // Generate VTT format
      const vttContent = this.generateVTT(transcriptionData);
      const vttPath = path.join(this.outputDir, 'vtt', `${baseFileName}.vtt`);
      await fs.writeFile(vttPath, vttContent, 'utf8');
      filePaths.vtt = vttPath;

      // Generate JSX format
      const jsxContent = this.generateJSX(transcriptionData, projectName, { style, position });
      const jsxPath = path.join(this.outputDir, 'jsx', `${baseFileName}.jsx`);
      await fs.writeFile(jsxPath, jsxContent, 'utf8');
      filePaths.jsx = jsxPath;

      // Generate JSON format
      const jsonContent = this.generateJSON(transcriptionData, { style, position, userTier });
      const jsonPath = path.join(this.outputDir, 'json', `${baseFileName}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
      filePaths.json = jsonPath;

      // Generate TXT format
      const txtContent = this.generateTXT(transcriptionData);
      const txtPath = path.join(this.outputDir, 'txt', `${baseFileName}.txt`);
      await fs.writeFile(txtPath, txtContent, 'utf8');
      filePaths.txt = txtPath;

      console.log(`✅ All formats generated for ${jobId}:`, Object.keys(filePaths).join(', '));
      return filePaths;

    } catch (error) {
      console.error(`❌ Multi-format generation failed for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generate SRT subtitle format
   * @param {Object} transcriptionData - Whisper transcription result
   * @returns {string} SRT content
   */
  generateSRT(transcriptionData) {
    if (!transcriptionData.segments || transcriptionData.segments.length === 0) {
      return '';
    }

    return transcriptionData.segments
      .map((segment, index) => {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
      })
      .join('\n');
  }

  /**
   * Generate VTT (WebVTT) format
   * @param {Object} transcriptionData - Whisper transcription result
   * @returns {string} VTT content
   */
  generateVTT(transcriptionData) {
    if (!transcriptionData.segments || transcriptionData.segments.length === 0) {
      return 'WEBVTT\n\n';
    }

    const vttSegments = transcriptionData.segments
      .map(segment => {
        const startTime = this.formatVTTTime(segment.start);
        const endTime = this.formatVTTTime(segment.end);
        return `${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
      })
      .join('\n');

    return `WEBVTT\n\n${vttSegments}`;
  }

  /**
   * Generate JSX After Effects format
   * @param {Object} transcriptionData - Whisper transcription result
   * @param {string} projectName - Project name
   * @param {Object} options - Style options
   * @returns {string} JSX content
   */
  generateJSX(transcriptionData, projectName, options = {}) {
    const { style = 'modern', position = 'bottom' } = options;
    
    if (!transcriptionData.segments || transcriptionData.segments.length === 0) {
      return this.generateEmptyJSX(projectName);
    }

    // Convert segments to JSX scenes
    const scenes = transcriptionData.segments.map((segment, index) => ({
      scene: index + 1,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      layer: `Scene_${index + 1}`,
      styles: ['fade-in', 'fade-out']
    }));

    return this.generateJSXContent(scenes, projectName, { style, position });
  }

  /**
   * Generate JSON structured format
   * @param {Object} transcriptionData - Whisper transcription result
   * @param {Object} options - Processing options
   * @returns {Object} JSON data
   */
  generateJSON(transcriptionData, options = {}) {
    const { style, position, userTier } = options;
    
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'CapEdify JSON Export',
        version: '1.0.0',
        style,
        position,
        userTier,
        totalSegments: transcriptionData.segments?.length || 0,
        totalDuration: transcriptionData.segments?.length > 0 
          ? transcriptionData.segments[transcriptionData.segments.length - 1].end 
          : 0
      },
      transcription: {
        fullText: transcriptionData.segments?.map(s => s.text).join(' ') || '',
        language: transcriptionData.language || 'en',
        segments: transcriptionData.segments?.map((segment, index) => ({
          id: index + 1,
          start: segment.start,
          end: segment.end,
          duration: segment.end - segment.start,
          text: segment.text.trim(),
          confidence: segment.confidence || null,
          words: segment.words || []
        })) || []
      },
      export: {
        formats: ['srt', 'vtt', 'jsx', 'json', 'txt'],
        styling: {
          captionStyle: style,
          position: position,
          customizable: true
        }
      }
    };
  }

  /**
   * Generate plain text format
   * @param {Object} transcriptionData - Whisper transcription result
   * @returns {string} Plain text content
   */
  generateTXT(transcriptionData) {
    if (!transcriptionData.segments || transcriptionData.segments.length === 0) {
      return '';
    }

    const header = `CapEdify Transcription Export\nGenerated: ${new Date().toISOString()}\n\n`;
    const transcriptionText = transcriptionData.segments
      .map(segment => segment.text.trim())
      .join(' ');

    const timestampedText = transcriptionData.segments
      .map(segment => {
        const timestamp = this.formatPlainTextTime(segment.start);
        return `[${timestamp}] ${segment.text.trim()}`;
      })
      .join('\n');

    return `${header}FULL TRANSCRIPTION:\n${transcriptionText}\n\nTIMESTAMPED TRANSCRIPTION:\n${timestampedText}`;
  }

  /**
   * Store pipeline job with all format paths
   * @param {string} jobId - Pipeline job ID
   * @param {string} userId - User ID
   * @param {Object} jobData - Job information
   * @param {Object} filePaths - Paths to generated files
   */
  async storePipelineJobExtended(jobId, userId, jobData, filePaths) {
    try {
      const { error } = await this.supabase
        .from('pipeline_jobs_extended')
        .upsert({
          job_id: jobId,
          user_id: userId,
          input_filename: jobData.filename,
          input_type: jobData.inputType,
          duration_minutes: jobData.durationMinutes,
          processing_config: {
            style: jobData.style,
            position: jobData.position,
            userTier: jobData.userTier,
            projectName: jobData.projectName
          },
          files_generated: filePaths,
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'job_id'
        });

      if (error) {
        console.error(`❌ Failed to store extended job data: ${error.message}`);
      } else {
        console.log(`✅ Extended job data stored for ${jobId}`);
      }
    } catch (error) {
      console.error(`❌ Database error storing job ${jobId}:`, error);
    }
  }

  // Utility methods for time formatting
  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  formatPlainTextTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate JSX content for After Effects
   */
  generateJSXContent(scenes, projectName, options = {}) {
    const { style = 'modern', position = 'bottom' } = options;
    
    // Style configurations
    const styleConfigs = {
      modern: {
        fontFamily: 'Arial-BoldMT',
        fontSize: 72,
        fontWeight: 'bold',
        fillColor: [1, 1, 1], // White
        strokeEnabled: true,
        strokeColor: [0, 0, 0], // Black
        strokeWidth: 4
      },
      bold: {
        fontFamily: 'Impact',
        fontSize: 84,
        fontWeight: 'bold',
        fillColor: [1, 0.843, 0], // Gold
        strokeEnabled: true,
        strokeColor: [0, 0, 0],
        strokeWidth: 6
      },
      minimal: {
        fontFamily: 'Helvetica-Light',
        fontSize: 60,
        fontWeight: 'normal',
        fillColor: [1, 1, 1],
        strokeEnabled: false,
        strokeColor: [0, 0, 0],
        strokeWidth: 0
      }
    };

    const config = styleConfigs[style] || styleConfigs.modern;
    const positionY = position === 'top' ? 200 : position === 'center' ? '50%' : 1080 - 200;

    return `// CapEdify Auto-Generated JSX - ${projectName}
// Generated: ${new Date().toISOString()}
// Style: ${style}, Position: ${position}

{
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    alert("Please select a composition first!");
  } else {
    
    // Scene data
    var scenes = ${JSON.stringify(scenes, null, 2)};
    
    // Style configuration
    var config = ${JSON.stringify(config, null, 2)};
    
    // Create text layers for each scene
    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];
      var textLayer = comp.layers.addText(scene.text);
      
      // Set layer properties
      textLayer.name = scene.layer;
      textLayer.inPoint = scene.start;
      textLayer.outPoint = scene.end;
      
      // Apply text styling
      var textProp = textLayer.property("Source Text");
      var textDocument = textProp.value;
      
      textDocument.resetCharStyle();
      textDocument.fontSize = config.fontSize;
      textDocument.fillColor = config.fillColor;
      textDocument.font = config.fontFamily;
      
      if (config.strokeEnabled) {
        textDocument.strokeOverFill = false;
        textDocument.strokeColor = config.strokeColor;
        textDocument.strokeWidth = config.strokeWidth;
      }
      
      textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
      textProp.setValue(textDocument);
      
      // Position text
      var position = textLayer.property("Transform").property("Position");
      position.setValue([comp.width/2, ${positionY}]);
      
      // Add fade animations
      var opacity = textLayer.property("Transform").property("Opacity");
      opacity.setValueAtTime(scene.start, 0);
      opacity.setValueAtTime(scene.start + 0.3, 100);
      opacity.setValueAtTime(scene.end - 0.3, 100);
      opacity.setValueAtTime(scene.end, 0);
    }
    
    alert("✅ " + scenes.length + " caption layers created successfully!");
  }
}`;
  }

  generateEmptyJSX(projectName) {
    return `// CapEdify Auto-Generated JSX - ${projectName}
// Generated: ${new Date().toISOString()}
// No transcription data available

{
  alert("No transcription data found for this project.");
}`;
  }
}

module.exports = new MultiFormatExportService();