// Quick API test script
const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing server health...');
    const healthResponse = await axios.get('http://localhost:4000/health');
    console.log('✅ Server is healthy:', healthResponse.data.status);
    
    console.log('\nTesting video upload endpoint...');
    // Test if the endpoint exists
    try {
      const uploadTest = await axios.post('http://localhost:4000/api/videos/upload');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Upload endpoint exists (returned 400 - No file provided)');
      } else {
        console.log('❌ Upload endpoint error:', error.response?.status, error.message);
      }
    }
    
    console.log('\nTesting transcribe endpoint...');
    try {
      const transcribeTest = await axios.post('http://localhost:4000/api/transcribe');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 500) {
        console.log('✅ Transcribe endpoint exists (returned error - expected without data)');
      } else {
        console.log('❌ Transcribe endpoint error:', error.response?.status, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Server not running or unreachable:', error.message);
    console.log('\n🔧 Make sure to start the server first:');
    console.log('cd server && node server.js');
  }
}

testAPI();
