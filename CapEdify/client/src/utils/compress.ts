// src/utils/compress.ts
/**
 * Compress a File in‑browser using @ffmpeg/ffmpeg@0.12.x
 * Falls back to the original file if FFmpeg isn’t available or errors.
 */

export async function compressVideo(file: File): Promise<File> {
  let createFFmpeg: any
  let fetchFile: any

  try {
    // 1) dynamically import so Vite doesn’t pre‑bundle the wrong shape
    const ffmpegModule = await import('@ffmpeg/ffmpeg')

    // 2) unwrap either the named exports or the .default-exported namespace
    const lib = (ffmpegModule as any).createFFmpeg
      ? ffmpegModule
      : (ffmpegModule as any).default

    createFFmpeg = lib.createFFmpeg
    fetchFile     = lib.fetchFile

    if (typeof createFFmpeg !== 'function' || typeof fetchFile !== 'function') {
      throw new Error('FFmpeg exports not found')
    }
  } catch {
    console.warn('FFmpeg load failed, skipping compression')
    return file
  }

  // 3) initialize and load the wasm module
  const ffmpeg = createFFmpeg({ log: true })
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }

  // 4) write the incoming file and run the compression
  const inName  = file.name
  const outName = `compressed-${file.name.replace(/\.[^/.]+$/, '')}.mp4`

  ffmpeg.FS('writeFile', inName, await fetchFile(file))
  await ffmpeg.run('-i', inName, '-vcodec', 'libx264', '-crf', '28', outName)

  // 5) pull the result back out and wrap in a JS File
  const data = ffmpeg.FS('readFile', outName)
  return new File([data.buffer], outName, { type: 'video/mp4' })
}