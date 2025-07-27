#!/usr/bin/env node

/**
 * CaptionFlow CLI - Enhanced SRT to JSX Converter
 * Phase 1 Implementation: SRT → JSX Engine
 * 
 * Usage:
 *   node jsx-export-cli.js input.srt [options]
 * 
 * Options:
 *   --style modern|minimal|bold     Style template (default: modern)
 *   --scenes                        Split into scene files
 *   --gap 2.0                      Scene gap threshold in seconds
 *   --project "My Project"         Project name
 *   --output ./output              Output directory
 */

const fs = require('fs').promises;
const path = require('path');
const jsxExportService = require('../server/services/jsxExportService');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    styleName: 'modern',
    sceneMode: false,
    gapThreshold: 2.0,
    projectName: 'Caption Project',
    outputDir: './output'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('-')) {
      switch (arg) {
        case '--style':
          options.styleName = args[++i];
          break;
        case '--scenes':
          options.sceneMode = true;
          break;
        case '--gap':
          options.gapThreshold = parseFloat(args[++i]);
          break;
        case '--project':
          options.projectName = args[++i];
          break;
        case '--output':
          options.outputDir = args[++i];
          break;
        case '--help':
          showHelp();
          process.exit(0);
          break;
        default:
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
      }
    } else if (!options.inputFile) {
      options.inputFile = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
CaptionFlow CLI - Enhanced SRT to JSX Converter

Usage:
  node jsx-export-cli.js input.srt [options]

Options:
  --style <template>     Style template: modern, minimal, bold (default: modern)
  --scenes              Split into scene files based on gaps
  --gap <seconds>       Scene gap threshold in seconds (default: 2.0)
  --project <name>      Project name (default: "Caption Project")
  --output <dir>        Output directory (default: ./output)
  --help               Show this help message

Examples:
  # Basic JSX export
  node jsx-export-cli.js captions.srt --style modern

  # Scene-based export with custom gap
  node jsx-export-cli.js captions.srt --scenes --gap 3.0 --project "My Video"

  # Export to specific directory
  node jsx-export-cli.js captions.srt --output ./ae-scripts --style bold
`);
}

async function ensureOutputDir(outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error(`Error creating output directory: ${error.message}`);
    process.exit(1);
  }
}

async function readSRTFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading SRT file: ${error.message}`);
    process.exit(1);
  }
}

async function writeJSXFiles(outputDir, jsxData, projectName, sceneMode) {
  try {
    if (sceneMode && typeof jsxData === 'object') {
      // Multiple scene files
      console.log(`Writing ${Object.keys(jsxData).length} scene files...`);
      
      for (const [filename, content] of Object.entries(jsxData)) {
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`✓ ${filename}`);
      }
      
      console.log(`\n✨ Scene files exported successfully to ${outputDir}`);
    } else {
      // Single JSX file
      const filename = `${projectName.replace(/\s+/g, '_')}.jsx`;
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, jsxData, 'utf-8');
      
      console.log(`✨ JSX file exported successfully: ${filename}`);
    }
  } catch (error) {
    console.error(`Error writing JSX files: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();
  
  if (!options.inputFile) {
    console.error('Error: Please provide an SRT file to convert');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  if (!['modern', 'minimal', 'bold'].includes(options.styleName)) {
    console.error('Error: Style must be one of: modern, minimal, bold');
    process.exit(1);
  }

  console.log('🎬 CaptionFlow CLI - Enhanced SRT to JSX Converter');
  console.log(`📁 Input: ${options.inputFile}`);
  console.log(`🎨 Style: ${options.styleName}`);
  console.log(`📚 Scene Mode: ${options.sceneMode ? 'enabled' : 'disabled'}`);
  if (options.sceneMode) {
    console.log(`⏱️  Scene Gap: ${options.gapThreshold}s`);
  }
  console.log(`📂 Output: ${options.outputDir}`);
  console.log('');

  // Ensure output directory exists
  await ensureOutputDir(options.outputDir);

  // Read SRT file
  console.log('📖 Reading SRT file...');
  const srtContent = await readSRTFile(options.inputFile);

  // Parse and export
  console.log('🔄 Converting to JSX...');
  const result = await jsxExportService.exportToJSX(null, {
    srtContent,
    projectName: options.projectName,
    styleName: options.styleName,
    sceneMode: options.sceneMode,
    gapThreshold: options.gapThreshold
  });

  if (!result.success) {
    console.error(`❌ Export failed: ${result.error}`);
    process.exit(1);
  }

  // Write JSX files
  await writeJSXFiles(
    options.outputDir, 
    result.data, 
    options.projectName, 
    options.sceneMode
  );

  // Show summary
  console.log('');
  console.log('📊 Export Summary:');
  console.log(`   Captions: ${result.metadata.captionCount}`);
  console.log(`   Duration: ${result.metadata.totalDuration.toFixed(1)}s`);
  console.log(`   Style: ${result.metadata.style}`);
  console.log(`   Scenes: ${result.metadata.sceneMode ? 'Yes' : 'No'}`);
  
  console.log('');
  console.log('🎉 Done! Import the JSX file(s) into After Effects:');
  console.log('   File → Scripts → Run Script File → Select .jsx file');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`❌ Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ CLI Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { parseArgs, showHelp, main };
