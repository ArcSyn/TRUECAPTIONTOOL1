#!/usr/bin/env node
mkdir -p scripts
cat > scripts/ff.js <<'EOF'
#!/usr/bin/env node
/**
 * Tiny FFmpeg CLI wrapper
 * Usage examples:
 *   node scripts/ff.js audio input.mp4 out.mp3
 *   node scripts/ff.js wav input.mp4 out.wav
 *   node scripts/ff.js trim input.mp4 00:00:10 00:00:25 out.mp4
 *   node scripts/ff.js srt input.mp4 subs.srt out.mp4
 *   node scripts/ff.js concat list.txt out.mp4
 *   node scripts/ff.js waves input.mp3 waves.mp4
 *   node scripts/ff.js probe input.mp4
 *   node scripts/ff.js silence input.wav cuts/
 */

const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const argv = process.argv.slice(2);
const cmd = argv[0];

if (!cmd) {
  help();
  process.exit(1);
}

switch (cmd) {
  case 'audio': // mp3
    ensureArgs(3);
    runFFmpeg(['-i', argv[1], '-vn', '-codec:a', 'libmp3lame', '-q:a', '2', argv[2]]);
    break;

  case 'wav':
    ensureArgs(3);
    runFFmpeg(['-i', argv[1], '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', argv[2]]);
    break;

  case 'trim':
    ensureArgs(5);
    // input, start, end, output
    runFFmpeg(['-ss', argv[2], '-to', argv[3], '-i', argv[1], '-c', 'copy', argv[4]]);
    break;

  case 'srt':
    ensureArgs(4);
    // input, subs.srt, output
    runFFmpeg(['-i', argv[1], '-vf', `subtitles=${escapePath(argv[2])}`, '-c:a', 'copy', argv[3]]);
    break;

  case 'concat':
    ensureArgs(3);
    // list.txt (ffmpeg concat file format), out
    runFFmpeg(['-f', 'concat', '-safe', '0', '-i', argv[1], '-c', 'copy', argv[2]]);
    break;

  case 'waves':
    ensureArgs(3);
    // input audio, output video
    runFFmpeg(['-i', argv[1], '-filter_complex', 'showwaves=s=1280x720:mode=line', '-pix_fmt', 'yuv420p', argv[2]]);
    break;

  case 'probe':
    ensureArgs(2);
    runFFprobe(['-hide_banner', '-i', argv[1]]);
    break;

  case 'silence':
    ensureArgs(3);
    // input.wav, outputDir/
    silenceSplit(argv[1], argv[2]);
    break;

  default:
    console.error('❌ Unknown command:', cmd);
    help();
    process.exit(1);
}

/* ------------ helpers ------------ */
function runFFmpeg(args) {
  execFile(ffmpegPath, args, { stdio: 'inherit' }, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
    console.log('✅ Done');
  });
}

function runFFprobe(args) {
  execFile(ffprobePath, args, { stdio: 'inherit' }, (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  });
}

function ensureArgs(n) {
  if (argv.length < n) {
    console.error('❌ Not enough args.');
    help();
    process.exit(1);
  }
}

function help() {
  console.log(`
Tiny FFmpeg helper
------------------------------------
audio   <in.mp4> <out.mp3>          Extract MP3
wav     <in.mp4> <out.wav>          Extract WAV 44.1k/16-bit/stereo
trim    <in.mp4> <start> <end> <out.mp4>   Clip without re-encode
srt     <in.mp4> <subs.srt> <out.mp4>      Burn subtitles
concat  <list.txt> <out.mp4>        Concatenate files (same codec)
waves   <in.mp3> <out.mp4>          Audio waveform video
probe   <input>                     Show metadata
silence <in.wav> <outDir>           Split by silence (auto segments)
`);
}

function escapePath(p) {
  // escape : and ' for ffmpeg filter
  return p.replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function silenceSplit(input, outDir) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Detect silence and write log
  execFile(ffmpegPath,
    ['-i', input, '-af', 'silencedetect=n=-30dB:d=0.5', '-f', 'null', '-'],
    (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Error during silencedetect:', err.message);
        process.exit(1);
      }
      const log = stderr.toString();
      const segments = parseSilence(log);
      if (!segments.length) {
        console.log('No silence markers found, copying whole file');
        fs.copyFileSync(input, path.join(outDir, path.basename(input)));
        return;
      }
      // 2. Trim out each segment
      const jobs = segments.map((seg, i) => {
        const out = path.join(outDir, `part_${String(i).padStart(3,'0')}.wav`);
        return new Promise((resolve, reject) => {
          execFile(ffmpegPath,
            ['-i', input, '-ss', seg.start, '-to', seg.end, '-c', 'copy', out],
            (e) => e ? reject(e) : resolve(out));
        });
      });
      Promise.all(jobs)
        .then(list => {
          console.log('✅ Segments:', list);
        })
        .catch(e => {
          console.error('❌ Error splitting:', e.message);
        });
    });
}

function parseSilence(log) {
  // parse ffmpeg silencedetect lines
  // silence_start: X.XXXXX
  // silence_end:   Y.YYYY | silence_duration: Z.ZZZZ
  const starts = [];
  const segments = [];
  const startRe = /silence_start:\s*([0-9.]+)/g;
  const endRe = /silence_end:\s*([0-9.]+)/g;

  let m;
  while ((m = startRe.exec(log))) starts.push(parseFloat(m[1]));
  let ends = [];
  while ((m = endRe.exec(log))) ends.push(parseFloat(m[1]));

  // Build segments between silence end/start
  // If no starting silence, we assume audio from 0 to first silence_start
  let last = 0;
  const paired = Math.min(starts.length, ends.length);
  for (let i = 0; i < paired; i++) {
    const s = starts[i];
    if (s > last) segments.push({ start: last, end: s });
    last = ends[i];
  }
  // tail segment after last silence end
  // (only if there was an 'ends' entry)
  if (ends.length) {
    const totalMatch = /time=(\d+:\d+:\d+\.\d+)/.exec(log.split('\n').reverse().find(l=>l.includes('time=')) || '');
    const total = totalMatch ? totalToSeconds(totalMatch[1]) : null;
    if (total && total > last) segments.push({ start: last, end: total });
  }
  // convert seconds to H:M:S.FF
  return segments.map(o => ({
    start: secToTime(o.start),
    end: secToTime(o.end)
  }));
}

function secToTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = (sec % 60).toFixed(3);
  return [h, m, s].map(v => String(v).padStart(2,'0')).join(':');
}

function totalToSeconds(t) {
  const [h,m,s] = t.split(':').map(Number);
  return h*3600 + m*60 + s;
}
