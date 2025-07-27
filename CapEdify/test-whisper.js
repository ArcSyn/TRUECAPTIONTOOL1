const path = require('path');
const fs = require('fs');

async function testWhisper() {
  console.log('🧪 Testing whisper.cpp setup...');
  
  try {
    // Test if whisper executable exists
    const whisperPath = path.join(__dirname, 'whisper-cpp/Release/whisper-cli.exe');
    
    if (!fs.existsSync(whisperPath)) {
      console.error('❌ Whisper executable not found at:', whisperPath);
      return;
    }
    
    console.log('✅ Whisper executable found');
    
    // Test if model exists
    const modelPath = path.join(__dirname, 'whisper-cpp/models/ggml-small.bin');
    if (!fs.existsSync(modelPath)) {
      console.error('❌ Model not found at:', modelPath);
      return;
    }
    
    console.log('✅ Model found');
    console.log('🎉 Whisper.cpp setup is ready!');
    
    // Test basic functionality
    console.log('📋 Available models:');
    console.log('  - tiny (39MB, 32x speed)');
    console.log('  - base (74MB, 16x speed)'); 
    console.log('  - small (244MB, 6x speed) ✅ Downloaded');
    console.log('  - medium (769MB, 2x speed)');
    console.log('  - large (1550MB, 1x speed)');
    
    console.log('\n🚀 To use LOCAL transcription:');
    console.log('1. Set TRANSCRIPTION_MODE=LOCAL in your .env');
    console.log('2. Optional: Set WHISPER_MODEL=small (or tiny/base/medium/large)');
    console.log('3. Restart your server');
    console.log('\n💡 HYBRID mode (default) tries LOCAL first, falls back to GROQ');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWhisper();