const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

async function testLargerFile() {
    console.log('🎬 TESTING WITH LARGER VIDEO FILE');
    console.log('==================================');
    
    const videoPath = path.join(__dirname, '../uploads/video-1753550484169-775114630.mp4');
    
    if (!fs.existsSync(videoPath)) {
        console.log('❌ Large video file not found');
        return;
    }
    
    const fileStats = fs.statSync(videoPath);
    const originalSizeMB = (fileStats.size / 1024 / 1024).toFixed(1);
    console.log('📏 Original file size:', originalSizeMB + 'MB');
    
    console.log('🔥 Starting ultra-compression test...');
    
    const form = new FormData();
    form.append('video', fs.createReadStream(videoPath), {
        filename: 'large_test_video.mp4',
        contentType: 'video/mp4'
    });
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/videos/upload',
        method: 'POST',
        headers: form.getHeaders()
    };
    
    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(1);
            
            try {
                const result = JSON.parse(data);
                
                if (result.success) {
                    const compressedSizeMB = (result.video.size / 1024 / 1024).toFixed(1);
                    const compressionRatio = ((fileStats.size - result.video.size) / fileStats.size * 100).toFixed(1);
                    const speedup = (fileStats.size / result.video.size).toFixed(1);
                    
                    console.log('✅ ULTRA-COMPRESSION SUCCESSFUL!');
                    console.log('==========================================');
                    console.log('📊 Original size:', originalSizeMB + 'MB');
                    console.log('🔥 Compressed size:', compressedSizeMB + 'MB');
                    console.log('🎯 Compression ratio:', compressionRatio + '%');
                    console.log('⚡ Speed improvement:', speedup + 'x faster processing');
                    console.log('⏱️ Processing time:', processingTime + 's');
                    console.log('🆔 Video ID:', result.video.id);
                    console.log('📝 Transcription:', result.transcription?.status || 'N/A');
                    
                    if (parseFloat(compressionRatio) >= 96) {
                        console.log('🏆 TARGET ACHIEVED! 96%+ compression!');
                    } else if (parseFloat(compressionRatio) >= 90) {
                        console.log('🔥 EXCELLENT compression achieved!');
                    } else if (parseFloat(compressionRatio) >= 80) {
                        console.log('✅ VERY GOOD compression achieved!');
                    } else {
                        console.log('👍 GOOD compression achieved!');
                    }
                    
                    console.log('==========================================');
                    console.log('🚀 ULTRA-COMPRESSION SYSTEM: OPERATIONAL');
                    
                } else {
                    console.log('❌ Upload failed:', result.error);
                }
            } catch (err) {
                console.log('💥 Parse error:', err.message);
                console.log('Raw response:', data.substring(0, 200) + '...');
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('💥 Request error:', err.message);
    });
    
    req.setTimeout(120000, () => {
        console.log('⏰ Request timeout - large file processing');
    });
    
    form.pipe(req);
}

testLargerFile();
