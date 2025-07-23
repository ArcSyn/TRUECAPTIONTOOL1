const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const inFile = process.argv[2] || 'in.mp4';
const outFile = process.argv[3] || 'out.mp3';

ffmpeg(inFile)
  .output(outFile)
  .on('end', () => console.log('✅ Done:', outFile))
  .on('error', err => console.error('❌ Error:', err))
  .run();
