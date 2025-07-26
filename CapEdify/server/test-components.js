const { Groq } = require("groq-sdk");
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

console.log('🧪 Testing CapEdify Components...\n');

// Test 1: FFmpeg
console.log('1️⃣ Testing FFmpeg...');
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) {
    console.error('❌ FFmpeg test failed:', err.message);
  } else {
    console.log('✅ FFmpeg working - Formats available:', Object.keys(formats).length);
    testGroq();
  }
});

// Test 2: Groq API
async function testGroq() {
  console.log('\n2️⃣ Testing Groq API...');
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say 'API working'" }],
      model: "llama3-8b-8192",  // Updated to current model
      max_tokens: 10
    });
    
    console.log('✅ Groq API working:', completion.choices[0]?.message?.content);
    console.log('\n🎯 All components working! Ready to restart server.');
    
  } catch (error) {
    console.error('❌ Groq API test failed:', error.message);
  }
}
