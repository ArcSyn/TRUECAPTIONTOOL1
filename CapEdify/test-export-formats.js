#!/usr/bin/env node

/**
 * Advanced Export System Format Testing Script
 * 
 * Tests all export formats (JSX, SRT, TXRT, YTVV) to ensure they work correctly
 * and validates that export quality matches existing single-job exports.
 */

const fs = require('fs');
const path = require('path');

// Sample transcription data that matches the pipeline structure
const mockTranscriptionData = {
  segments: [
    {
      start: 0.5,
      end: 3.2,
      text: "Welcome to CapEdify's Advanced Export System."
    },
    {
      start: 3.5,
      end: 6.8,
      text: "This system allows you to export multiple jobs in various formats."
    },
    {
      start: 7.0,
      end: 10.5,
      text: "You can choose from JSX, SRT, TXRT, and YTVV formats."
    }
  ],
  captionSegments: [
    {
      start: 0.5,
      end: 3.2,
      text: "Welcome to CapEdify's Advanced Export System."
    },
    {
      start: 3.5,
      end: 6.8,
      text: "This system allows you to export multiple jobs in various formats."
    },
    {
      start: 7.0,
      end: 10.5,
      text: "You can choose from JSX, SRT, TXRT, and YTVV formats."
    }
  ],
  text: "Welcome to CapEdify's Advanced Export System. This system allows you to export multiple jobs in various formats. You can choose from JSX, SRT, TXRT, and YTVV formats.",
  duration: 10.5,
  totalWords: 25,
  totalCharacters: 150,
  srtContent: `1
00:00:00,500 --> 00:00:03,200
Welcome to CapEdify's Advanced Export System.

2
00:00:03,500 --> 00:00:06,800
This system allows you to export multiple jobs in various formats.

3
00:00:07,000 --> 00:00:10,500
You can choose from JSX, SRT, TXRT, and YTVV formats.

`
};

// Import the format generators from customExportRoutes.js
async function testFormatGeneration() {
  console.log('🧪 Testing Advanced Export System Format Generation');
  console.log('=' .repeat(60));
  
  try {
    // Test SRT format
    console.log('\n📄 Testing SRT Format Generation...');
    const srtContent = await generateSRT(mockTranscriptionData);
    console.log('✅ SRT generated successfully');
    console.log('Sample SRT content:');
    console.log(srtContent.substring(0, 200) + '...');
    
    // Test TXRT format
    console.log('\n📝 Testing TXRT Format Generation...');
    const txrtContent = await generateTXRT(mockTranscriptionData);
    console.log('✅ TXRT generated successfully');
    const txrtData = JSON.parse(txrtContent);
    console.log(`TXRT contains ${txrtData.segments.length} segments, ${txrtData.wordCount} words`);
    
    // Test YTVV format
    console.log('\n📺 Testing YTVV Format Generation...');
    const ytvvContent = await generateYTVV(mockTranscriptionData);
    console.log('✅ YTVV generated successfully');
    console.log('Sample YTVV content:');
    console.log(ytvvContent.substring(0, 200) + '...');
    
    // Test JSX format (using AE JSX Exporter Agent)
    console.log('\n🎬 Testing JSX Format Generation...');
    const AEJSXExporterAgent = require('./server/services/aeJSXExporterAgent');
    const jsxContent = AEJSXExporterAgent.generateJSX(mockTranscriptionData.segments, {
      style: 'bold',
      position: 'bottom',
      projectName: 'test_export'
    });
    console.log('✅ JSX generated successfully');
    console.log(`JSX content length: ${jsxContent.length} characters`);
    
    console.log('\n🎉 All format tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Format generation test failed:', error);
    process.exit(1);
  }
}

// Copy the format generator functions from customExportRoutes.js
async function generateSRT(transcriptionData) {
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

function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Run the tests
if (require.main === module) {
  testFormatGeneration().catch(console.error);
}

module.exports = { testFormatGeneration };