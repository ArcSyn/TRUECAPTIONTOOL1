import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import fs from 'fs/promises';

const inFile = process.argv[2] || 'in.mp4';
const outFile = process.argv[3] || 'out.wav';

const ffmpeg = createFFmpeg({ log: true });
await ffmpeg.load();

ffmpeg.FS('writeFile', inFile, await fetchFile(inFile));
await ffmpeg.run('-i', inFile, '-vn', '-ar', '44100', '-ac', '2', outFile);

const data = ffmpeg.FS('readFile', outFile);
await fs.writeFile(outFile, data);
console.log('✅ Done:', outFile);
