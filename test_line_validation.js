// Test line-breaking validation for both interfaces
const { run } = require('./CapEdify/server/agents/CaptionSplitAgent');

const longTestSRT = `1
00:00:01,000 --> 00:00:03,500
This is a very long test line that should demonstrate our enhanced line-breaking capabilities.

2
00:00:03,500 --> 00:00:06,000
Short line.

3
00:00:08,000 --> 00:00:11,000
Another extremely long line that will definitely exceed our 35 character limit and should be broken properly.`;

console.log('🧪 Line-Breaking Validation Test\n');

run(longTestSRT).then(result => {
  console.log('📊 Scene Results:');
  let allLinesValid = true;
  
  result.forEach((scene, index) => {
    console.log(`\nScene ${scene.scene}:`);
    console.log(`Time: ${scene.start} --> ${scene.end}`);
    console.log(`Full text: "${scene.text}"`);
    
    const lines = scene.text.split('\n');
    console.log(`Lines: ${lines.length}`);
    
    lines.forEach((line, i) => {
      const lineLength = line.length;
      const isValid = lineLength <= 35;
      if (!isValid) allLinesValid = false;
      
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} Line ${i + 1}: "${line}" (${lineLength} chars)`);
    });
  });
  
  console.log(`\n🎯 Overall Result: ${allLinesValid ? '✅ ALL LINES VALID' : '❌ SOME LINES TOO LONG'}`);
  console.log(`📏 Max character limit: 35 characters per line`);
  console.log(`📺 Perfect for video display!`);
  
}).catch(error => {
  console.error('❌ Test failed:', error);
});