/**
 * JSXSceneBuilderAgent - Convert structured caption scenes into After Effects JSX-ready data
 * 
 * Purpose: Transform scene data into JSX-compatible format with safe layer names and styling
 * Input: Scene array from previous agents
 * Output: JSON array with scene, layer, start, end, text, and optional styles
 */

/**
 * Generate safe variable name for After Effects layers
 * @param {number} sceneIndex - Scene number
 * @param {string} text - Scene text for context
 * @returns {string} - Safe layer variable name
 */
function generateSafeLayerName(sceneIndex, text) {
  // Start with scene prefix
  let layerName = `scene_${sceneIndex}`;
  
  // Add descriptive suffix from text if possible
  if (text && typeof text === 'string') {
    const words = text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .split(/\s+/)
      .filter(word => word.length > 2) // Only meaningful words
      .slice(0, 2); // Max 2 words
    
    if (words.length > 0) {
      const suffix = words.join('_');
      layerName += `_${suffix}`;
    }
  }
  
  // Ensure it starts with letter and contains only safe characters
  layerName = layerName.replace(/[^a-zA-Z0-9_]/g, '_');
  layerName = layerName.replace(/_{2,}/g, '_'); // No double underscores
  layerName = layerName.replace(/^_+|_+$/g, ''); // No leading/trailing underscores
  
  // Ensure starts with letter
  if (/^[0-9]/.test(layerName)) {
    layerName = 'layer_' + layerName;
  }
  
  // Limit length for AE compatibility
  if (layerName.length > 30) {
    layerName = layerName.substring(0, 27) + '_' + sceneIndex;
  }
  
  return layerName;
}

/**
 * Parse style tags from text content
 * @param {string} text - Text that may contain style tags
 * @returns {Object} - Object with cleanText and styles array
 */
function parseStyleTags(text) {
  if (!text || typeof text !== 'string') {
    return { cleanText: text || '', styles: [] };
  }
  
  const styles = [];
  let cleanText = text;
  
  // Supported style tags
  const styleTags = {
    'fade-in': /\[fade-in\]/gi,
    'fade-out': /\[fade-out\]/gi,
    'bold': /\[bold\]/gi,
    'highlight': /\[highlight\]/gi,
    'emphasis': /\[emphasis\]/gi,
    'subtitle': /\[subtitle\]/gi
  };
  
  // Extract style tags
  for (const [styleName, regex] of Object.entries(styleTags)) {
    if (regex.test(cleanText)) {
      styles.push(styleName);
      cleanText = cleanText.replace(regex, '').trim();
    }
  }
  
  // Clean up extra spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return { cleanText, styles };
}

/**
 * Convert timestamp to seconds for JSX compatibility
 * @param {string} timestamp - SRT format timestamp
 * @returns {number} - Seconds as float
 */
function timestampToSeconds(timestamp) {
  if (typeof timestamp === 'number') return timestamp;
  
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms || 0) / 1000;
}

/**
 * Determine appropriate styles based on scene characteristics
 * @param {Object} scene - Scene object
 * @param {number} index - Scene index in array
 * @param {number} totalScenes - Total number of scenes
 * @returns {Array} - Array of recommended style tags
 */
function recommendStyles(scene, index, totalScenes) {
  const autoStyles = [];
  
  // First scene often gets fade-in
  if (index === 0) {
    autoStyles.push('fade-in');
  }
  
  // Last scene often gets fade-out
  if (index === totalScenes - 1) {
    autoStyles.push('fade-out');
  }
  
  // Short scenes might need emphasis
  const duration = timestampToSeconds(scene.end) - timestampToSeconds(scene.start);
  if (duration < 3) {
    autoStyles.push('emphasis');
  }
  
  // Question sentences might need highlight
  if (scene.text && scene.text.includes('?')) {
    autoStyles.push('highlight');
  }
  
  return autoStyles;
}

/**
 * Main agent function - Convert scenes to JSX-ready format
 * @param {Array} scenes - Array of scene objects
 * @returns {Promise<Array>} - Array of JSX-ready scene objects
 */
async function run(scenes) {
  try {
    if (!Array.isArray(scenes)) {
      throw new Error('Invalid input: Expected array of scene objects');
    }

    if (scenes.length === 0) {
      return [];
    }

    const jsxScenes = scenes.map((scene, index) => {
      // Validate scene object
      if (!scene || typeof scene !== 'object') {
        throw new Error(`Invalid scene at index ${index}: Expected object`);
      }
      
      if (!scene.text) {
        throw new Error(`Invalid scene at index ${index}: Missing text property`);
      }

      // Parse text for embedded style tags
      const { cleanText, styles: embeddedStyles } = parseStyleTags(scene.text);
      
      // Generate safe layer name
      const layerName = generateSafeLayerName(scene.scene || index + 1, cleanText);
      
      // Get recommended styles
      const autoStyles = recommendStyles(scene, index, scenes.length);
      
      // Combine embedded and auto styles (embedded takes priority)
      const allStyles = [...new Set([...embeddedStyles, ...autoStyles])];
      
      // Build JSX scene object
      const jsxScene = {
        scene: scene.scene || index + 1,
        layer: layerName,
        start: scene.start,
        end: scene.end,
        text: cleanText
      };
      
      // Add styles if any exist
      if (allStyles.length > 0) {
        jsxScene.styles = allStyles;
      }
      
      return jsxScene;
    });

    return jsxScenes;

  } catch (error) {
    console.error('JSXSceneBuilderAgent error:', error.message);
    return [];
  }
}

// Test function
async function test() {
  console.log('🧠 Testing JSXSceneBuilderAgent...\n');
  
  const testScenes = [
    {
      scene: 1,
      start: "00:00:01,000",
      end: "00:00:03,500",
      text: "Hello everyone, welcome to our video! [fade-in]"
    },
    {
      scene: 2,
      start: "00:00:03,500",
      end: "00:00:06,000",
      text: "Today we're going to talk about AI. [bold]"
    },
    {
      scene: 3,
      start: "00:00:06,000",
      end: "00:00:08,500",
      text: "What do you think about this topic? [highlight]"
    },
    {
      scene: 4,
      start: "00:00:10,000",
      end: "00:00:11,500",
      text: "Thanks for watching!"
    }
  ];

  console.log('Input scenes:');
  testScenes.forEach(scene => {
    console.log(`  Scene ${scene.scene}: "${scene.text}"`);
  });
  
  const result = await run(testScenes);
  
  console.log('\nJSX-ready output:');
  result.forEach(jsxScene => {
    console.log(`Scene ${jsxScene.scene}:`);
    console.log(`  Layer: ${jsxScene.layer}`);
    console.log(`  Time: ${jsxScene.start} --> ${jsxScene.end}`);
    console.log(`  Text: "${jsxScene.text}"`);
    if (jsxScene.styles) {
      console.log(`  Styles: [${jsxScene.styles.join(', ')}]`);
    }
    console.log('---');
  });
  
  // Test error handling
  console.log('\nTesting error handling:');
  const invalidResult = await run("invalid input");
  console.log('Invalid input result:', invalidResult);
}

// Run test if called directly
if (require.main === module) {
  test();
}

module.exports = { run };