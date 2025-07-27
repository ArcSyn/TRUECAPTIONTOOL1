const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('video', fs.createReadStream('test_video.mp4'), {
      filename: 'test_video.mp4',
      contentType: 'video/mp4'
    });

    console.log('🚀 Testing ultra-compression upload...');
    
    const response = await fetch('http://localhost:4000/api/videos/upload', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('📊 Upload result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log('🎯 Video ID:', result.video.id);
      console.log('📏 Compressed size:', result.video.size, 'bytes');
      console.log('🔗 URL:', result.video.url);
      
      if (result.transcription) {
        console.log('📝 Transcription ID:', result.transcription.id);
        console.log('📈 Status:', result.transcription.status);
      }
    } else {
      console.error('❌ Upload failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testUpload();
