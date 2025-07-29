/**
 * CaptionSplitAgent - Break full SRT transcripts into logical scene blocks
 * 
 * Purpose: Convert continuous SRT transcript into digestible scene chunks
 * Max duration: 10-15 seconds per scene
 * Max line length: 35 characters per line for optimal video display
 * Split criteria: Pauses, sentence boundaries, natural breaks, line length
 */

/**
 * Parse SRT timestamp to seconds
 * @param {string} timestamp - SRT format: "00:01:23,456"
 * @returns {number} - Seconds as float
 */
function srtTimeToSeconds(timestamp) {
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

/**
 * Convert seconds back to SRT timestamp format
 * @param {number} seconds - Time in seconds
 * @returns {string} - SRT format timestamp
 */
function secondsToSrtTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Parse SRT string into structured segments
 * @param {string} srtContent - Full SRT transcript
 * @returns {Array} - Array of parsed segments
 */
function parseSRT(srtContent) {
  const segments = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const timeRange = lines[1];
      const text = lines.slice(2).join(' ').trim();
      
      const timeMatch = timeRange.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (timeMatch) {
        segments.push({
          start: srtTimeToSeconds(timeMatch[1]),
          end: srtTimeToSeconds(timeMatch[2]),
          text: text
        });
      }
    }
  }
  
  return segments.sort((a, b) => a.start - b.start);
}

/**
 * Break long text into video-safe lines (max 35 characters)
 * @param {string} text - Text to break
 * @returns {string} - Text with proper line breaks for video display
 */
function breakLongLines(text) {
  const MAX_LINE_LENGTH = 35;
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= MAX_LINE_LENGTH) {
      currentLine = testLine;
    } else {
      // Current line is full, start new line
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word longer than limit - keep as is but warn
        lines.push(word);
        currentLine = '';
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Limit to 2 lines max for video captions
  if (lines.length > 2) {
    // If too many lines, take first 2 that fit within character limits
    const validLines = [];
    for (const line of lines) {
      if (line.length <= MAX_LINE_LENGTH && validLines.length < 2) {
        validLines.push(line);
      }
    }
    
    // If we have 2 valid lines, use them
    if (validLines.length === 2) {
      return validLines.join('\n');
    }
    
    // Otherwise, try to fit everything in 2 lines by truncating
    const firstLine = lines[0].length <= MAX_LINE_LENGTH ? lines[0] : lines[0].substring(0, MAX_LINE_LENGTH - 3) + '...';
    const remainingText = lines.slice(1).join(' ');
    const secondLine = remainingText.length <= MAX_LINE_LENGTH ? remainingText : remainingText.substring(0, MAX_LINE_LENGTH - 3) + '...';
    
    return `${firstLine}\n${secondLine}`;
  }
  
  return lines.join('\n');
}

/**
 * Determine if there's a natural break between segments
 * @param {Object} currentSeg - Current segment
 * @param {Object} nextSeg - Next segment
 * @returns {boolean} - True if natural break exists
 */
function hasNaturalBreak(currentSeg, nextSeg) {
  if (!nextSeg) return true;
  
  // Gap of 1+ seconds indicates natural pause
  const gap = nextSeg.start - currentSeg.end;
  if (gap >= 1.0) return true;
  
  // Sentence ending punctuation
  const text = currentSeg.text.trim();
  if (/[.!?]$/.test(text)) return true;
  
  // Comma pause with reasonable gap
  if (text.endsWith(',') && gap >= 0.5) return true;
  
  return false;
}

/**
 * Main agent function - Split SRT into logical scenes
 * @param {string} srtContent - Full SRT transcript string
 * @returns {Promise<Array>} - Array of scene objects
 */
async function run(srtContent) {
  try {
    if (!srtContent || typeof srtContent !== 'string') {
      throw new Error('Invalid input: Expected SRT string');
    }

    const segments = parseSRT(srtContent);
    if (segments.length === 0) {
      return [];
    }

    const scenes = [];
    let currentScene = {
      scene: 1,
      start: segments[0].start,
      end: segments[0].end,
      text: segments[0].text,
      segments: [segments[0]]
    };

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const sceneDuration = segment.end - currentScene.start;
      
      // Check if we should start a new scene
      const shouldSplit = (
        sceneDuration > 15 || // Max 15 second scenes
        (sceneDuration > 10 && hasNaturalBreak(segments[i-1], segment)) // 10+ seconds with natural break
      );
      
      if (shouldSplit) {
        // Finalize current scene with proper line breaking
        scenes.push({
          scene: currentScene.scene,
          start: secondsToSrtTime(currentScene.start),
          end: secondsToSrtTime(currentScene.end),
          text: breakLongLines(currentScene.text)
        });
        
        // Start new scene
        currentScene = {
          scene: scenes.length + 1,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          segments: [segment]
        };
      } else {
        // Add to current scene
        currentScene.end = segment.end;
        currentScene.text += ' ' + segment.text;
        currentScene.segments.push(segment);
      }
    }
    
    // Add final scene with proper line breaking
    if (currentScene.segments.length > 0) {
      scenes.push({
        scene: currentScene.scene,
        start: secondsToSrtTime(currentScene.start),
        end: secondsToSrtTime(currentScene.end),
        text: breakLongLines(currentScene.text)
      });
    }

    return scenes;

  } catch (error) {
    console.error('CaptionSplitAgent error:', error.message);
    return [];
  }
}

// Test function
async function test() {
  console.log('🎬 Testing CaptionSplitAgent...\n');
  
  const testSRT = `1
00:00:01,000 --> 00:00:03,500
Hello everyone, welcome to our video.

2
00:00:03,500 --> 00:00:06,000
Today we're going to talk about AI.

3
00:00:06,000 --> 00:00:08,500
It's a fascinating subject that affects us all.

4
00:00:10,000 --> 00:00:13,000
Let's start with the basics. What is AI?

5
00:00:13,000 --> 00:00:16,500
Artificial Intelligence is the simulation of human intelligence.

6
00:00:16,500 --> 00:00:20,000
It includes learning, reasoning, and self-correction.

7
00:00:22,000 --> 00:00:25,500
Now, let's explore some practical applications.

8
00:00:25,500 --> 00:00:28,000
AI is everywhere in our daily lives.`;

  const result = await run(testSRT);
  
  console.log('Input SRT length:', testSRT.length, 'characters');
  console.log('Output scenes:', result.length);
  console.log('\nScenes generated:');
  result.forEach(scene => {
    console.log(`Scene ${scene.scene}: ${scene.start} --> ${scene.end}`);
    console.log(`Text: "${scene.text}"`);
    console.log('---');
  });
}

// Run test if called directly
if (require.main === module) {
  test();
}

module.exports = { run };