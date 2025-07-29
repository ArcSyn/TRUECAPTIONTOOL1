// Test the enhanced CaptionSplitAgent line-breaking functionality
const { run } = require('./CapEdify/server/agents/CaptionSplitAgent');

const testSRT = `1
00:00:01,000 --> 00:00:03,500
This is a test line that is deliberately very long to test our line-breaking functionality.

2
00:00:03,500 --> 00:00:06,000
Another test line for the enhanced caption system.

3
00:00:10,000 --> 00:00:13,000
Final test line with proper timing.`;

console.log('🧪 Testing Enhanced Line-Breaking in CaptionSplitAgent\n');

run(testSRT).then(result => {
  console.log('📊 Results:');
  console.log(`Scenes generated: ${result.length}\n`);
  
  result.forEach((scene, index) => {
    console.log(`Scene ${scene.scene}:`);
    console.log(`Time: ${scene.start} --> ${scene.end}`);
    console.log(`Text: "${scene.text}"`);
    console.log(`Character count: ${scene.text.length}`);
    
    // Check line breaks
    const lines = scene.text.split('\n');
    console.log(`Lines: ${lines.length}`);
    lines.forEach((line, i) => {
      console.log(`  Line ${i + 1}: "${line}" (${line.length} chars)`);
    });
    console.log('---\n');
  });
}).catch(error => {
  console.error('❌ Test failed:', error);
});