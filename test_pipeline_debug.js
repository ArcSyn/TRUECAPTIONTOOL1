// Debug pipeline execution to find 50% hang
const { executePipeline } = require('./CapEdify/server/services/AgentOrchestrator');

const testInput = {
  inputType: 'srt',
  srtContent: `1
00:00:01,000 --> 00:00:03,500
This is a test line to debug the stuck pipeline issue.

2
00:00:03,500 --> 00:00:06,000
Another test line for debugging.`,
  userTier: 'free',
  durationMinutes: 0.5,
  jobCountThisMonth: 1,
  options: {
    style: 'modern',
    position: 'bottom',
    projectName: 'Debug_Test'
  }
};

console.log('🐛 Debug Pipeline Execution\n');

// Track progress updates
let lastProgress = 0;
const progressCallback = (progress, message) => {
  if (progress !== lastProgress) {
    console.log(`${progress}%: ${message}`);
    lastProgress = progress;
  }
};

console.log('Starting pipeline execution...');
const startTime = Date.now();

executePipeline(testInput, progressCallback)
  .then(result => {
    const duration = Date.now() - startTime;
    console.log(`\n✅ Pipeline completed in ${duration}ms`);
    console.log('Success:', result.success);
    console.log('Scenes:', result.data?.sceneCount || 'unknown');
    
    if (result.error) {
      console.log('❌ Error:', result.error);
    }
  })
  .catch(error => {
    const duration = Date.now() - startTime;
    console.log(`\n❌ Pipeline failed after ${duration}ms`);
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  });