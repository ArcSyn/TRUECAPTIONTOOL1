// Test transcription with a simple audio file
const groqService = require('./services/groqService');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function testTranscription() {
  try {
    console.log('🧪 Testing transcription system...');
    console.log('📊 Environment check:');
    console.log('  ✅ GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set' : 'Missing');
    console.log('  ✅ SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('  ✅ SUPABASE_SERVICE_ROLE:', process.env.SUPABASE_SERVICE_ROLE ? 'Set' : 'Missing');

    // Check if we have any uploaded videos to test with
    const { data: videos, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (videoError) {
      console.error('❌ Error fetching videos:', videoError);
      return;
    }

    if (!videos || videos.length === 0) {
      console.log('⚠️  No videos found in database. Please upload a video first.');
      return;
    }

    const video = videos[0];
    console.log('🎥 Found video to test:', {
      id: video.id,
      url: video.public_url,
      name: video.original_name,
      size: video.size
    });

    // Check if there's already a transcription for this video
    const { data: existingTranscription } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('video_id', video.id)
      .single();

    if (existingTranscription) {
      console.log('📝 Existing transcription found:', {
        id: existingTranscription.id,
        status: existingTranscription.status,
        progress: existingTranscription.progress
      });
      
      if (existingTranscription.status === 'completed') {
        console.log('✅ Transcription already completed!');
        console.log('📄 Result preview:', 
          existingTranscription.result?.text?.substring(0, 200) + '...'
        );
        return;
      }
    }

    // Create a new transcription record for testing
    console.log('🆕 Creating new transcription record...');
    const { data: newTranscription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .insert([
        {
          video_id: video.id,
          model: "whisper-large-v3",
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (transcriptionError) {
      console.error('❌ Error creating transcription:', transcriptionError);
      return;
    }

    console.log('✅ Transcription record created:', newTranscription.id);
    console.log('🚀 Starting transcription process...');

    // Start the actual transcription
    const result = await groqService.transcribe(video.public_url, newTranscription.id);
    
    console.log('🎉 Transcription completed successfully!');
    console.log('📄 Text preview:', result.text.substring(0, 500) + '...');
    console.log('🎯 Total segments:', result.segments?.length || 0);

  } catch (error) {
    console.error('❌ Transcription test failed:', error);
    console.error('📍 Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}

// Run the test
console.log('🔬 Starting transcription test...');
testTranscription()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
