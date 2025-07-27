const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const jsxExportService = require('../services/jsxExportService');

// POST /api/export/:transcriptionId
router.post('/:transcriptionId', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { format } = req.body;

    let content;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'srt':
        content = await exportService.exportToSRT(transcriptionId);
        contentType = 'application/x-subrip';
        filename = 'subtitles.srt';
        break;
      
      case 'vtt':
        content = await exportService.exportToVTT(transcriptionId);
        contentType = 'text/vtt';
        filename = 'subtitles.vtt';
        break;
      
      case 'jsx':
        content = await exportService.exportToJSX(transcriptionId);
        contentType = 'application/javascript';
        filename = 'subtitles.jsx';
        break;
      
      case 'fcpxml':
        content = await exportService.exportToFCPXML(transcriptionId);
        contentType = 'application/xml';
        filename = 'captions.fcpxml';
        break;
      
      case 'ass':
        content = await exportService.exportToASS(transcriptionId);
        contentType = 'text/plain';
        filename = 'subtitles.ass';
        break;
      
      case 'premiere':
        content = await exportService.exportToPremiereSRT(transcriptionId);
        contentType = 'application/x-subrip';
        filename = 'premiere_subtitles.srt';
        break;
      
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Unsupported format: ${format}` 
        });
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to export transcription' 
    });
  }
});

// POST /api/export/preview
router.post('/preview', async (req, res) => {
  try {
    const { transcriptionId, format, styles } = req.body;
    let preview;

    switch (format.toLowerCase()) {
      case 'srt':
        preview = await exportService.exportToSRT(transcriptionId, styles);
        break;
      case 'vtt':
        preview = await exportService.exportToVTT(transcriptionId, styles);
        break;
      case 'ass':
        preview = await exportService.exportToASS(transcriptionId, styles);
        break;
      default:
        preview = await exportService.exportToSRT(transcriptionId, styles);
    }

    // Return first 3 captions for preview
    const previewLines = preview.split('\n\n').slice(0, 3).join('\n\n');
    res.json({ 
      success: true, 
      preview: previewLines,
      fullLength: preview.split('\n\n').length 
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate preview' 
    });
  }
});

// GET /api/export/styles
router.get('/styles', (req, res) => {
  const styles = {
    fonts: [
      { id: 'arial', name: 'Arial' },
      { id: 'helvetica', name: 'Helvetica' },
      { id: 'times', name: 'Times New Roman' },
      { id: 'courier', name: 'Courier New' }
    ],
    colors: [
      { id: 'white', name: 'White', hex: '#FFFFFF' },
      { id: 'yellow', name: 'Yellow', hex: '#FFFF00' },
      { id: 'cyan', name: 'Cyan', hex: '#00FFFF' },
      { id: 'green', name: 'Green', hex: '#00FF00' },
      { id: 'magenta', name: 'Magenta', hex: '#FF00FF' }
    ],
    effects: [
      { id: 'bold', name: 'Bold' },
      { id: 'italic', name: 'Italic' },
      { id: 'underline', name: 'Underline' }
    ],
    positions: [
      { id: 'bottom', name: 'Bottom' },
      { id: 'top', name: 'Top' },
      { id: 'middle', name: 'Middle' }
    ],
    alignments: [
      { id: 'left', name: 'Left' },
      { id: 'center', name: 'Center' },
      { id: 'right', name: 'Right' }
    ]
  };

  res.json({ success: true, styles });
});

// GET /api/export/formats
router.get('/formats', (req, res) => {
  const formats = [
    {
      id: 'srt',
      name: 'SubRip (SRT)',
      description: 'Standard subtitle format supported by most video players'
    },
    {
      id: 'vtt',
      name: 'WebVTT',
      description: 'Web Video Text Tracks format for HTML5 video'
    },
    {
      id: 'jsx',
      name: 'React JSX',
      description: 'JavaScript/React component format'
    },
    {
      id: 'fcpxml',
      name: 'Final Cut Pro XML',
      description: 'Compatible with Final Cut Pro X'
    },
    {
      id: 'ass',
      name: 'Advanced SubStation Alpha',
      description: 'Advanced subtitle format with styling support'
    },
    {
      id: 'premiere',
      name: 'Adobe Premiere Pro',
      description: 'Compatible with Adobe Premiere Pro'
    }
  ];

  res.json({ success: true, formats });
});

// POST /api/export/jsx/enhanced - Enhanced JSX export with styling and scenes
router.post('/jsx/enhanced', async (req, res) => {
  try {
    const { 
      transcriptionId, 
      projectName = 'Caption Project',
      styleName = 'modern',
      sceneMode = false,
      gapThreshold = 2.0,
      captions,
      srtContent 
    } = req.body;

    if (!transcriptionId && !captions && !srtContent) {
      return res.status(400).json({
        success: false,
        error: 'Either transcriptionId, captions array, or srtContent must be provided'
      });
    }

    const options = {
      projectName,
      styleName,
      sceneMode,
      gapThreshold,
      captions,
      srtContent
    };

    const result = await jsxExportService.exportToJSX(transcriptionId, options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (sceneMode && typeof result.data === 'object') {
      // Return multiple files as ZIP or JSON structure
      res.json({
        success: true,
        type: 'multi-file',
        files: result.data,
        metadata: result.metadata
      });
    } else {
      // Single JSX file
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/\s+/g, '_')}.jsx"`);
      res.send(result.data);
    }

  } catch (error) {
    console.error('Enhanced JSX Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to export enhanced JSX' 
    });
  }
});

// GET /api/export/jsx/styles - Get available JSX styles
router.get('/jsx/styles', (req, res) => {
  try {
    const styles = jsxExportService.getAvailableStyles();
    res.json({ 
      success: true, 
      styles 
    });
  } catch (error) {
    console.error('Get JSX styles error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get JSX styles' 
    });
  }
});

// POST /api/export/jsx/preview - Preview JSX output
router.post('/jsx/preview', async (req, res) => {
  try {
    const { 
      transcriptionId, 
      styleName = 'modern',
      sceneMode = false,
      captions,
      srtContent 
    } = req.body;

    const options = {
      projectName: 'Preview',
      styleName,
      sceneMode,
      captions,
      srtContent
    };

    const result = await jsxExportService.exportToJSX(transcriptionId, options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Return preview with first 1000 characters
    let previewContent = '';
    if (typeof result.data === 'string') {
      previewContent = result.data.substring(0, 1000);
    } else {
      // For scene mode, preview the master file
      previewContent = (result.data['master.jsx'] || Object.values(result.data)[0] || '').substring(0, 1000);
    }

    res.json({
      success: true,
      preview: previewContent,
      fullLength: typeof result.data === 'string' ? result.data.length : JSON.stringify(result.data).length,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('JSX Preview error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate JSX preview' 
    });
  }
});

// POST /api/export/jsx/react - Generate React component with captions
router.post('/jsx/react', async (req, res) => {
  try {
    const { 
      transcriptionId, 
      componentName = 'CaptionDisplay',
      captions
    } = req.body;

    if (!transcriptionId && !captions) {
      return res.status(400).json({
        success: false,
        error: 'Either transcriptionId or captions array must be provided'
      });
    }

    // Get captions data if transcriptionId is provided
    let captionData = captions;
    if (!captionData && transcriptionId) {
      // In a real implementation, fetch captions from database using transcriptionId
      // For now, return an error
      return res.status(400).json({
        success: false,
        error: 'Direct transcriptionId lookup not implemented. Please provide captions array.'
      });
    }

    // Generate React component JSX
    const jsxCode = `import React, { useState, useEffect } from 'react';

interface Caption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface ${componentName}Props {
  currentTime: number;
  className?: string;
}

const ${componentName}: React.FC<${componentName}Props> = ({ currentTime, className = '' }) => {
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  
  const captions: Caption[] = ${JSON.stringify(captionData, null, 4)};
  
  useEffect(() => {
    const activeCaption = captions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
    setCurrentCaption(activeCaption || null);
  }, [currentTime]);
  
  if (!currentCaption) {
    return null;
  }
  
  return (
    <div className={\`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 \${className}\`}>
      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-center max-w-2xl">
        <p className="text-lg font-medium">{currentCaption.text}</p>
      </div>
    </div>
  );
};

export default ${componentName};`;

    res.json({
      success: true,
      jsxCode
    });

  } catch (error) {
    console.error('React JSX Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate React component' 
    });
  }
});

module.exports = router;
