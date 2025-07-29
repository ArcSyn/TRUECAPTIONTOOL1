/**
 * ScriptFormatterAgent - Clean up raw auto-caption text for human readability
 * 
 * Purpose: Fix punctuation, casing, spacing in caption text while preserving timestamps
 * Input: SRT blocks or scene objects with text
 * Output: Same structure with cleaned text
 */

/**
 * Clean and format text content
 * @param {string} text - Raw caption text
 * @returns {string} - Formatted text
 */
function formatText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let formatted = text;

  // Basic cleanup
  formatted = formatted.trim();
  
  // Fix multiple spaces
  formatted = formatted.replace(/\s+/g, ' ');
  
  // Fix spacing around punctuation
  formatted = formatted.replace(/\s*([.,!?;:])\s*/g, '$1 ');
  formatted = formatted.replace(/\s+([.,!?;:])/g, '$1');
  
  // Fix sentence capitalization
  formatted = formatted.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
  
  // Capitalize first letter
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  
  // Fix common issues with auto-generated captions
  formatted = formatted.replace(/\bi\b/g, 'I'); // Fix lowercase 'i'
  formatted = formatted.replace(/\bim\b/g, "I'm"); // Fix "im" -> "I'm"
  formatted = formatted.replace(/\bwont\b/g, "won't"); // Fix "wont" -> "won't"
  formatted = formatted.replace(/\bcant\b/g, "can't"); // Fix "cant" -> "can't"
  formatted = formatted.replace(/\bdont\b/g, "don't"); // Fix "dont" -> "don't"
  formatted = formatted.replace(/\bisnt\b/g, "isn't"); // Fix "isnt" -> "isn't"
  
  // Fix numbers and common abbreviations
  formatted = formatted.replace(/\bu s a\b/gi, 'USA');
  formatted = formatted.replace(/\bu s\b/gi, 'US');
  formatted = formatted.replace(/\ba i\b/gi, 'AI');
  
  // Remove trailing spaces
  formatted = formatted.replace(/\s+$/, '');
  
  // Ensure proper sentence ending
  if (formatted.length > 0 && !/[.!?]$/.test(formatted)) {
    // Only add period if it looks like a complete sentence
    if (formatted.length > 10 && /[a-zA-Z]$/.test(formatted)) {
      formatted += '.';
    }
  }
  
  return formatted;
}

/**
 * Format scene objects (from CaptionSplitAgent output)
 * @param {Array} scenes - Array of scene objects
 * @returns {Array} - Array of formatted scene objects
 */
function formatScenes(scenes) {
  return scenes.map(scene => ({
    ...scene,
    text: formatText(scene.text)
  }));
}

/**
 * Parse and format SRT content directly
 * @param {string} srtContent - Raw SRT string
 * @returns {string} - Formatted SRT string
 */
function formatSRTContent(srtContent) {
  const blocks = srtContent.trim().split(/\n\s*\n/);
  
  const formattedBlocks = blocks.map(block => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const index = lines[0];
      const timestamp = lines[1];
      const text = lines.slice(2).join(' ');
      
      return [index, timestamp, formatText(text)].join('\n');
    }
    return block;
  });
  
  return formattedBlocks.join('\n\n');
}

/**
 * Main agent function - Format caption text for readability
 * @param {string|Array} input - SRT string or array of scene objects
 * @returns {Promise<string|Array>} - Formatted output matching input type
 */
async function run(input) {
  try {
    if (!input) {
      throw new Error('Invalid input: Input is required');
    }

    // Handle array input (scene objects)
    if (Array.isArray(input)) {
      return formatScenes(input);
    }
    
    // Handle string input (SRT content)
    if (typeof input === 'string') {
      return formatSRTContent(input);
    }
    
    throw new Error('Invalid input type: Expected string or array');

  } catch (error) {
    console.error('ScriptFormatterAgent error:', error.message);
    return input; // Return original input on error
  }
}

// Test function
async function test() {
  console.log('✍️ Testing ScriptFormatterAgent...\n');
  
  // Test with SRT string
  const testSRT = `1
00:00:01,000 --> 00:00:03,500
hello everyone   welcome to our video

2
00:00:03,500 --> 00:00:06,000
today were going to talk about a i

3
00:00:06,000 --> 00:00:08,500
its a fascinating subject that affects us all`;

  console.log('Test 1: SRT String Input');
  console.log('Input:', testSRT.replace(/\n/g, '\\n'));
  const srtResult = await run(testSRT);
  console.log('Output:', srtResult.replace(/\n/g, '\\n'));
  console.log('');

  // Test with scene objects
  const testScenes = [
    {
      scene: 1,
      start: "00:00:01,000",
      end: "00:00:03,500", 
      text: "hello everyone   welcome to our video"
    },
    {
      scene: 2,
      start: "00:00:03,500",
      end: "00:00:08,500",
      text: "today were going to talk about a i   its fascinating"
    }
  ];

  console.log('Test 2: Scene Objects Input');
  console.log('Input scenes:');
  testScenes.forEach(scene => {
    console.log(`  Scene ${scene.scene}: "${scene.text}"`);
  });
  
  const sceneResult = await run(testScenes);
  console.log('Output scenes:');
  sceneResult.forEach(scene => {
    console.log(`  Scene ${scene.scene}: "${scene.text}"`);
  });
}

// Run test if called directly
if (require.main === module) {
  test();
}

module.exports = { run };