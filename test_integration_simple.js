// Simple Node.js test for the pipeline integration
async function testPipelineIntegration() {
  console.log('🧪 Testing CapEdify Pipeline Integration\n');

  const testSRT = `1
00:00:01,000 --> 00:00:03,500
Welcome to our magical video platform!

2
00:00:03,500 --> 00:00:06,000
This is a test of the AgentOrchestrator pipeline system.

3
00:00:06,000 --> 00:00:08,500
Our AI agents will process this content automatically.

4
00:00:10,000 --> 00:00:13,000
Thank you for using CapEdify for your caption needs.`;

  try {
    console.log('📡 Testing pipeline API endpoint...');
    
    const fetch = (await import('node-fetch')).default;
    
    // Test with direct API call
    const response = await fetch('http://localhost:4000/api/pipeline/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputType: 'srt',
        srtContent: testSRT,
        userTier: 'creator',
        jobCountThisMonth: 1,
        durationMinutes: 2.0,
        style: 'modern',
        position: 'bottom',
        projectName: 'Integration_Test'
      })
    });

    const result = await response.json();
    console.log('✅ Pipeline Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`\n🆔 Job ID: ${result.jobId}`);
      console.log(`📊 Status URL: http://localhost:4000${result.statusUrl}`);
      console.log(`📥 Download URL: http://localhost:4000${result.downloadUrl}`);
      
      // Test status polling
      console.log('\n🔄 Polling for status updates...');
      
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`http://localhost:4000/api/pipeline/status/${result.jobId}`);
        const status = await statusResponse.json();
        
        console.log(`📈 Progress: ${status.progress}% - ${status.progressMessage}`);
        
        if (status.status === 'completed') {
          console.log('🎉 Pipeline completed successfully!');
          console.log(`📊 Scenes created: ${status.result?.sceneCount || 'N/A'}`);
          console.log(`💎 Credits used: ${status.result?.creditInfo?.estimatedCreditsUsed || 'N/A'}`);
          console.log(`⚡ Processing time: ${status.result?.metadata?.processing?.totalTime || 'N/A'}ms`);
          
          // Test download
          console.log('\n📥 Testing JSX download...');
          const downloadResponse = await fetch(`http://localhost:4000/api/pipeline/download/${result.jobId}`);
          
          if (downloadResponse.ok) {
            const jsxContent = await downloadResponse.text();
            console.log('✅ JSX Download successful!');
            console.log(`📄 JSX File size: ${jsxContent.length} characters`);
            console.log('📄 JSX Content Preview:');
            console.log(jsxContent.substring(0, 500) + '...\n');
            
            console.log('🎯 INTEGRATION TEST PASSED! ✅');
            return true;
          } else {
            console.log('❌ JSX Download failed:', downloadResponse.statusText);
          }
          
          completed = true;
        } else if (status.status === 'failed') {
          console.log('❌ Pipeline failed:', status.error);
          break;
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('⏰ Timeout: Pipeline took too long to complete');
      }
      
    } else {
      console.log('❌ Pipeline failed to start:', result.error);
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    // Check if server is running
    console.log('\n🔍 Checking if server is running...');
    try {
      const healthResponse = await fetch('http://localhost:4000/health');
      if (healthResponse.ok) {
        console.log('✅ Server is running on port 4000');
      } else {
        console.log('❌ Server responded with error:', healthResponse.status);
      }
    } catch (healthError) {
      console.log('❌ Cannot connect to server on port 4000. Make sure it\'s running with: npm run dev');
    }
  }
}

// Run the test
testPipelineIntegration();