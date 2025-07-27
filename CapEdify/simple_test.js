const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Simple Node.js test without fetch dependency
const http = require('http');

async function testUltraCompression() {
    const videoPath = path.join(__dirname, 'test_existing.mp4');
    
    if (!fs.existsSync(videoPath)) {
        console.log('❌ Test video not found:', videoPath);
        return;
    }
    
    const fileStats = fs.statSync(videoPath);
    console.log('🚀 Testing ultra-compression...');
    console.log('📏 Original size:', (fileStats.size / 1024 / 1024).toFixed(1) + 'MB');
    
    const form = new FormData();
    form.append('video', fs.createReadStream(videoPath), {
        filename: 'test_existing.mp4',
        contentType: 'video/mp4'
    });
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/videos/upload',
        method: 'POST',
        headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (result.success) {
                    const originalMB = (fileStats.size / 1024 / 1024).toFixed(1);
                    const compressedMB = (result.video.size / 1024 / 1024).toFixed(1);
                    const compressionRatio = ((fileStats.size - result.video.size) / fileStats.size * 100).toFixed(1);
                    
                    console.log('✅ Upload successful!');
                    console.log('📊 Original:', originalMB + 'MB → Compressed:', compressedMB + 'MB');
                    console.log('🎯 Compression ratio:', compressionRatio + '% (Target: 96%)');
                    console.log('🆔 Video ID:', result.video.id);
                    console.log('📝 Transcription Status:', result.transcription?.status || 'N/A');
                    
                    if (parseFloat(compressionRatio) >= 96) {
                        console.log('🔥 TARGET ACHIEVED! Ultra-compression working!');
                    } else {
                        console.log('⚠️ Target missed - compression needs adjustment');
                    }
                } else {
                    console.log('❌ Upload failed:', result.error);
                }
            } catch (err) {
                console.log('💥 Parse error:', err.message);
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('💥 Request error:', err.message);
    });
    
    form.pipe(req);
}

testUltraCompression();
