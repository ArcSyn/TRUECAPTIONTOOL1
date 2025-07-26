const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');

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

module.exports = router;
