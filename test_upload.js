// Test the video upload endpoint
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const testUpload = async () => {
  try {
    console.log('Testing video upload endpoint...');
    
    // Create a small test file
    const testData = 'fake video data for testing';
    fs.writeFileSync('test-video.mp4', testData);
    
    const form = new FormData();
    form.append('video', fs.createReadStream('test-video.mp4'));
    
    const response = await fetch('http://localhost:4000/api/videos/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Upload successful!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Upload failed:', error);
    }
    
    // Clean up
    fs.unlinkSync('test-video.mp4');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testUpload();