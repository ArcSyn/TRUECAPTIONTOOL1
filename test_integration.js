// Test the pipeline integration with SRT input
const { runPipeline, getPipelineStatus } = require('./CapEdify/client/src/api/pipeline.ts');

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
    console.log('📡 Testing direct API call to pipeline...');
    
    // Test with curl equivalent
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
    console.log('✅ Pipeline Response:', result);

    if (result.success) {
      console.log(`🆔 Job ID: ${result.jobId}`);
      console.log(`📊 Status URL: ${result.statusUrl}`);
      console.log(`📥 Download URL: ${result.downloadUrl}`);
      
      // Test status polling
      console.log('\n🔄 Polling for status updates...');
      
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`http://localhost:4000${result.statusUrl}`);
        const status = await statusResponse.json();
        
        console.log(`📈 Progress: ${status.progress}% - ${status.progressMessage}`);
        
        if (status.status === 'completed') {
          console.log('🎉 Pipeline completed successfully!');
          console.log(`📊 Scenes created: ${status.result?.sceneCount}`);
          console.log(`💎 Credits used: ${status.result?.creditInfo?.estimatedCreditsUsed}`);
          console.log(`⚡ Processing time: ${status.result?.metadata?.processing?.totalTime}ms`);
          
          // Test download
          console.log('\n📥 Testing JSX download...');
          const downloadResponse = await fetch(`http://localhost:4000${result.downloadUrl}`);
          
          if (downloadResponse.ok) {
            const jsxContent = await downloadResponse.text();
            console.log('✅ JSX Download successful!');
            console.log('📄 JSX Content Preview:');
            console.log(jsxContent.substring(0, 500) + '...\n');
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
  }
}

// Run the test
testPipelineIntegration();