#!/usr/bin/env node

/**
 * CapEdify Update Script
 * 
 * This script applies all the necessary updates to fix the JSX export functionality
 * and adds the CLI tool to the CapEdify application.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory (assumes this script is in the root of the project)
const baseDir = process.cwd();
const serverDir = path.join(baseDir, 'CapEdify', 'server');
const clientDir = path.join(baseDir, 'CapEdify', 'client');

console.log('CapEdify Update Script');
console.log('=====================\n');

// 1. Create necessary directories
console.log('Step 1: Creating necessary directories...');
try {
  if (!fs.existsSync(path.join(serverDir, 'uploads'))) {
    fs.mkdirSync(path.join(serverDir, 'uploads'), { recursive: true });
    console.log('  ✅ Created uploads directory');
  } else {
    console.log('  ℹ️ Uploads directory already exists');
  }
  
  if (!fs.existsSync(path.join(serverDir, 'downloads'))) {
    fs.mkdirSync(path.join(serverDir, 'downloads'), { recursive: true });
    console.log('  ✅ Created downloads directory');
  } else {
    console.log('  ℹ️ Downloads directory already exists');
  }
} catch (error) {
  console.error(`  ❌ Error creating directories: ${error.message}`);
  process.exit(1);
}

// 2. Update client-side API files
console.log('\nStep 2: Updating client-side API files...');
try {
  // Copy the new export.ts file
  const exportNewPath = path.join(baseDir, 'CapEdify', 'client', 'src', 'api', 'export.new.ts');
  const exportPath = path.join(baseDir, 'CapEdify', 'client', 'src', 'api', 'export.ts');
  
  if (fs.existsSync(exportNewPath)) {
    fs.copyFileSync(exportNewPath, exportPath);
    console.log('  ✅ Updated export.ts file');
  } else {
    console.error('  ❌ Could not find export.new.ts file');
    process.exit(1);
  }
} catch (error) {
  console.error(`  ❌ Error updating client files: ${error.message}`);
  process.exit(1);
}

// 3. Install CLI tool
console.log('\nStep 3: Setting up CLI tool...');
try {
  // Make the CLI script executable
  const cliPath = path.join(baseDir, 'CapEdify', 'cli.js');
  fs.chmodSync(cliPath, '755');
  console.log('  ✅ Made CLI script executable');
  
  // Link package (optional)
  try {
    console.log('  ℹ️ Linking CLI package (this may require admin privileges)...');
    execSync('cd CapEdify && npm link', { stdio: 'inherit' });
    console.log('  ✅ CLI tool linked successfully');
  } catch (error) {
    console.log('  ⚠️ Could not link CLI package. You can still use it by running node cli.js');
  }
} catch (error) {
  console.error(`  ❌ Error setting up CLI tool: ${error.message}`);
  process.exit(1);
}

// 4. Check environment configuration
console.log('\nStep 4: Checking environment configuration...');
try {
  const envPath = path.join(serverDir, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('  ✅ Found existing .env file');
  } else {
    console.log('  ⚠️ No .env file found, creating a template...');
    envContent = `PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
UPLOADS_DIR=./uploads
DOWNLOADS_DIR=./downloads`;
    fs.writeFileSync(envPath, envContent);
    console.log('  ✅ Created .env template file');
  }
  
  // Check for required variables
  const requiredVars = ['PORT', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'UPLOADS_DIR', 'DOWNLOADS_DIR'];
  const missingVars = [];
  
  for (const variable of requiredVars) {
    if (!envContent.includes(`${variable}=`)) {
      missingVars.push(variable);
    }
  }
  
  if (missingVars.length > 0) {
    console.log(`  ⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('  ⚠️ Please update your .env file with these variables');
  } else {
    console.log('  ✅ All required environment variables are present');
  }
} catch (error) {
  console.error(`  ❌ Error checking environment: ${error.message}`);
  process.exit(1);
}

// 5. Final steps and instructions
console.log('\nStep 5: Final instructions...');
console.log(`
✅ Update completed successfully!

Next steps:
-----------
1. Start the server:
   cd CapEdify/server && node server.js

2. In a separate terminal, start the client:
   cd CapEdify/client && npm start

3. Try using the CLI tool:
   capedify --help

For more details, please read the README-UPDATED.md file.
`);
