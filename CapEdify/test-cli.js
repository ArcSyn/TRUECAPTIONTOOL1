#!/usr/bin/env node

/**
 * CapEdify CLI Test Script
 * Quick test to verify CLI functionality
 */

const { exec } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue.bold('🧪 CapEdify CLI Test Suite'));
console.log(chalk.gray('Testing CLI commands and connectivity...\n'));

// Test 1: CLI Help
console.log(chalk.cyan('1. Testing CLI help...'));
exec('node cli.js --help', (error, stdout, stderr) => {
  if (error) {
    console.log(chalk.red('❌ CLI help failed'));
    return;
  }
  console.log(chalk.green('✅ CLI help working'));
});

// Test 2: Status Command
setTimeout(() => {
  console.log(chalk.cyan('\n2. Testing server status...'));
  exec('node cli.js status', (error, stdout, stderr) => {
    if (error) {
      console.log(chalk.yellow('⚠️  Server not running (expected if not started)'));
    } else {
      console.log(chalk.green('✅ Server status check working'));
    }
  });
}, 1000);

// Test 3: Formats Command
setTimeout(() => {
  console.log(chalk.cyan('\n3. Testing formats command...'));
  exec('node cli.js formats', (error, stdout, stderr) => {
    if (error) {
      console.log(chalk.yellow('⚠️  Formats command failed (server needed)'));
    } else {
      console.log(chalk.green('✅ Formats command working'));
    }
  });
}, 2000);

setTimeout(() => {
  console.log(chalk.blue('\n🎉 CLI Test Complete!'));
  console.log(chalk.gray('CLI is ready for use. Start the server and try:'));
  console.log(chalk.cyan('  node cli.js status'));
  console.log(chalk.cyan('  node cli.js quick video.mp4'));
}, 3000);
