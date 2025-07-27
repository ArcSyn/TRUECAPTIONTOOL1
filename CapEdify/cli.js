#!/usr/bin/env node

/**
 * CapEdify CLI Tool
 * A command-line tool for video transcription and caption export
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const axios = require('axios');
const FormData = require('form-data');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// Define the API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

// Set up command line interface
program
  .name('capedify')
  .description('CapEdify CLI for video transcription and caption export')
  .version('1.0.0');

// Transcribe command
program
  .command('transcribe <videoPath>')
  .description('Transcribe a video file')
  .option('-l, --language <language>', 'Language code (e.g., en, es, fr)', 'en')
  .option('-m, --model <model>', 'Transcription model to use', 'whisper-1')
  .action(async (videoPath, options) => {
    const spinner = ora('Preparing video for transcription...').start();
    
    try {
      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        spinner.fail(`File not found: ${videoPath}`);
        return;
      }
      
      // Create form data with video file
      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('language', options.language);
      formData.append('model', options.model);
      
      // Upload and start transcription
      spinner.text = 'Uploading video...';
      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      if (response.data && response.data.success) {
        spinner.succeed(`Transcription started with ID: ${chalk.green(response.data.transcriptionId)}`);
        console.log(`\nUse the following command to check status:`);
        console.log(chalk.cyan(`  capedify status ${response.data.transcriptionId}`));
      } else {
        spinner.fail('Failed to start transcription');
        console.error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      spinner.fail('Transcription request failed');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Check transcription status
program
  .command('status <transcriptionId>')
  .description('Check the status of a transcription')
  .action(async (transcriptionId) => {
    const spinner = ora('Checking transcription status...').start();
    
    try {
      const response = await axios.get(`${API_BASE_URL}/transcribe/status/${transcriptionId}`);
      
      if (response.data && response.data.success) {
        const status = response.data.status;
        
        if (status === 'completed') {
          spinner.succeed(`Transcription completed!`);
          console.log(`\nCaptions: ${response.data.captions.length}`);
          console.log(`Duration: ${Math.floor(response.data.duration / 60)}m ${Math.floor(response.data.duration % 60)}s`);
          
          // Show sample of captions
          if (response.data.captions.length > 0) {
            console.log('\nSample captions:');
            response.data.captions.slice(0, 3).forEach(caption => {
              console.log(`${formatTime(caption.startTime)} --> ${formatTime(caption.endTime)}`);
              console.log(`${caption.text}\n`);
            });
          }
          
          console.log(`\nUse the following command to export:`);
          console.log(chalk.cyan(`  capedify export ${transcriptionId} --format srt`));
        } else if (status === 'processing') {
          spinner.info(`Transcription is still processing (${response.data.progress || 0}%)`);
          console.log(`Run the same command again to check for updates.`);
        } else if (status === 'failed') {
          spinner.fail(`Transcription failed: ${response.data.error || 'Unknown error'}`);
        } else {
          spinner.info(`Transcription status: ${status}`);
        }
      } else {
        spinner.fail('Failed to get transcription status');
        console.error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      spinner.fail('Status request failed');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Export command
program
  .command('export <transcriptionId>')
  .description('Export transcription to various formats')
  .option('-f, --format <format>', 'Export format (srt, vtt, ass, jsx)', 'srt')
  .option('-o, --output <filepath>', 'Output file path')
  .option('--style <style>', 'Style for JSX export (modern, minimal, bold)', 'modern')
  .option('--scene-mode', 'Enable scene mode for JSX export', false)
  .option('--gap-threshold <threshold>', 'Gap threshold for scene detection (seconds)', '2.0')
  .alias('e')
  .action(async (transcriptionId, options) => {
    const spinner = ora(`Exporting to ${options.format.toUpperCase()}...`).start();
    
    try {
      let endpoint = `/export/${transcriptionId}`;
      let requestData = { format: options.format };
      
      // Special handling for JSX export
      if (options.format.toLowerCase() === 'jsx') {
        endpoint = '/export/jsx/enhanced';
        requestData = {
          transcriptionId,
          styleName: options.style,
          sceneMode: options.sceneMode,
          gapThreshold: parseFloat(options.gapThreshold)
        };
        
        spinner.text = `Generating ${options.style} style JSX${options.sceneMode ? ' with scene detection' : ''}...`;
      }
      
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, requestData, {
        responseType: options.format.toLowerCase() === 'jsx' && options.sceneMode ? 'json' : 'arraybuffer'
      });
      
      // Handle scene mode response (multiple files)
      if (options.format.toLowerCase() === 'jsx' && options.sceneMode && response.data.type === 'multi-file') {
        const files = response.data.files;
        const outputDir = options.output || path.join(process.cwd(), `scenes_${transcriptionId}`);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        for (const [filename, content] of Object.entries(files)) {
          const filePath = path.join(outputDir, filename);
          fs.writeFileSync(filePath, content);
        }
        
        spinner.succeed(`Scene files exported to: ${chalk.green(outputDir)}`);
        console.log(`${chalk.cyan('Files created:')}`);
        Object.keys(files).forEach(filename => {
          console.log(`  ${chalk.gray('└─')} ${filename}`);
        });
        return;
      }
      
      // Determine output filename
      const defaultExt = {
        'srt': '.srt',
        'vtt': '.vtt',
        'ass': '.ass',
        'jsx': '.jsx'
      }[options.format.toLowerCase()] || '.txt';
      
      const outputPath = options.output || 
        path.join(process.cwd(), `captions_${transcriptionId}${defaultExt}`);
      
      // Write to file
      const data = options.format.toLowerCase() === 'jsx' ? response.data.data || response.data : response.data;
      fs.writeFileSync(outputPath, data);
      
      spinner.succeed(`Exported to: ${chalk.green(outputPath)}`);
      
      // Show helpful info for JSX files
      if (options.format.toLowerCase() === 'jsx') {
        console.log(`${chalk.cyan('Next steps:')}`);
        console.log(`  1. Open Adobe After Effects`);
        console.log(`  2. File → Scripts → Run Script File...`);
        console.log(`  3. Select: ${outputPath}`);
      }
    } catch (error) {
      spinner.fail('Export failed');
      console.error(chalk.red(error.response?.data?.error || error.message));
    }
  });

// List available formats
program
  .command('formats')
  .description('List available export formats')
  .action(async () => {
    const spinner = ora('Getting available formats...').start();
    
    try {
      const response = await axios.get(`${API_BASE_URL}/export/formats`);
      
      if (response.data && response.data.success) {
        spinner.succeed('Available export formats:');
        
        response.data.formats.forEach(format => {
          console.log(`\n${chalk.bold(format.name)} (${chalk.cyan(format.id)})`);
          console.log(`  ${format.description}`);
        });
      } else {
        spinner.fail('Failed to get formats');
        console.error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      spinner.fail('Request failed');
      console.error(error.response?.data?.error || error.message);
    }
  });

// Quick start command
program
  .command('quick <videoPath>')
  .description('Quick transcribe + JSX export with modern style')
  .option('--style <style>', 'JSX style (modern, minimal, bold)', 'modern')
  .action(async (videoPath, options) => {
    console.log(chalk.blue.bold('🚀 CapEdify Quick Start'));
    console.log(chalk.gray('Transcribing video and generating JSX...'));
    
    try {
      // Step 1: Transcribe
      const transcribeSpinner = ora('Transcribing video...').start();
      
      if (!fs.existsSync(videoPath)) {
        transcribeSpinner.fail(`File not found: ${videoPath}`);
        return;
      }
      
      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('language', 'en');
      
      const transcribeResponse = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: formData.getHeaders()
      });
      
      const transcriptionId = transcribeResponse.data.id;
      transcribeSpinner.succeed(`Transcription complete (ID: ${transcriptionId})`);
      
      // Step 2: Export JSX
      const exportSpinner = ora(`Generating ${options.style} JSX...`).start();
      
      const exportResponse = await axios.post(`${API_BASE_URL}/export/jsx/enhanced`, {
        transcriptionId,
        styleName: options.style,
        sceneMode: false
      });
      
      const outputPath = path.join(process.cwd(), `${path.basename(videoPath, path.extname(videoPath))}_${options.style}.jsx`);
      fs.writeFileSync(outputPath, exportResponse.data.data || exportResponse.data);
      
      exportSpinner.succeed(`JSX exported: ${chalk.green(outputPath)}`);
      
      console.log(`\n${chalk.green('✅ Complete!')} Ready for After Effects:`);
      console.log(`  1. Open Adobe After Effects`);
      console.log(`  2. File → Scripts → Run Script File...`);
      console.log(`  3. Select: ${chalk.cyan(outputPath)}`);
      
    } catch (error) {
      console.error(chalk.red('Quick start failed:'), error.message);
    }
  });

// Status command  
program
  .command('status')
  .description('Check CapEdify server status')
  .action(async () => {
    const spinner = ora('Checking server status...').start();
    
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      spinner.succeed('Server is running');
      console.log(`${chalk.green('✓')} API URL: ${API_BASE_URL}`);
      console.log(`${chalk.green('✓')} Status: ${response.data.status || 'OK'}`);
    } catch (error) {
      spinner.fail('Server is not responding');
      console.log(`${chalk.red('✗')} API URL: ${API_BASE_URL}`);
      console.log(`${chalk.yellow('⚠')} Make sure the CapEdify server is running on port 4000`);
    }
  });

// Helper function to format time
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Execute the program
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
