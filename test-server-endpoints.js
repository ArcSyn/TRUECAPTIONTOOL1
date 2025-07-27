// Quick test to check server availability and endpoints

async function testServer() {
    const baseUrl = 'http://localhost:4000';
    
    console.log('Testing server endpoints...\n');
    
    // Test health endpoint
    try {
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint working:');
        console.log(JSON.stringify(healthData, null, 2));
    } catch (error) {
        console.log('❌ Health endpoint failed:', error.message);
        console.log('Server may not be running on port 4000');
        return;
    }
    
    // Test transcribe endpoint with invalid ID (should return 404 but as JSON)
    try {
        const transcribeResponse = await fetch(`${baseUrl}/api/transcribe/test-id`);
        const transcribeData = await transcribeResponse.text();
        console.log(`\n📝 Transcribe endpoint status: ${transcribeResponse.status}`);
        console.log('Response:', transcribeData);
        
        if (transcribeResponse.headers.get('content-type')?.includes('application/json')) {
            console.log('✅ Returns JSON response');
        } else {
            console.log('❌ Returns HTML/text instead of JSON');
        }
    } catch (error) {
        console.log('❌ Transcribe endpoint test failed:', error.message);
    }
    
    // Test non-existent endpoint
    try {
        const notFoundResponse = await fetch(`${baseUrl}/api/nonexistent`);
        const notFoundData = await notFoundResponse.text();
        console.log(`\n🔍 Non-existent endpoint status: ${notFoundResponse.status}`);
        console.log('Response:', notFoundData);
        
        if (notFoundResponse.headers.get('content-type')?.includes('application/json')) {
            console.log('✅ 404 returns JSON response');
        } else {
            console.log('❌ 404 returns HTML/text instead of JSON');
        }
    } catch (error) {
        console.log('❌ 404 test failed:', error.message);
    }
}

testServer();
