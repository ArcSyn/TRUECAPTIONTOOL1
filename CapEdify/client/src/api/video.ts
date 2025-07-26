// Enhanced video upload with auto-transcription support
const API_BASE_URL = 'http://localhost:4000/api';

export async function uploadVideo(file: File, onProgress?: (progress: number) => void) {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('video', file);

    if (onProgress) {
      onProgress(10);
    }

    // Upload to our enhanced server with auto-transcription
    const response = await fetch(`${API_BASE_URL}/videos/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    if (onProgress) {
      onProgress(90);
    }

    // Return enhanced video data with transcription info
    const result = {
      videoId: data.video.id,
      videoUrl: data.video.url,
      size: data.video.size,
      duration: 0, // Will be calculated later
      transcriptionId: data.transcription.id,
      transcriptionStatus: data.transcription.status,
        mime_type: file.type,
        status: 'uploaded'
      }])
      .select()
      .single()

    if (videoError) throw videoError

    if (onProgress) {
      onProgress(100)
    }

    return {
      videoId: videoData.id,
      url: videoUrl,
      size: file.size,
      duration: 0
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    throw error
  }
}

export async function startTranscription(videoId: string, model: 'groq' | 'whisper') {
  try {
    // 1. Create transcription record
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .insert([{
        video_id: videoId,
        model: model,
        status: 'pending',
        progress: 0
      }])
      .select()
      .single()

    if (error) throw error

    // 2. Start backend transcription process
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        videoId,
        transcriptionId: transcription.id,
        model 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to start transcription')
    }

    return { transcriptionId: transcription.id }
  } catch (error: any) {
    console.error('Transcription error:', error)
    throw error
  }
}

export async function getTranscriptionProgress(transcriptionId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptionId)
    .single()

  if (error) throw error

  return {
    status: data.status,
    progress: data.progress,
    result: data.result,
    error: data.error
  }
}

export async function exportTranscription(transcriptionId: string, format: 'srt' | 'vtt') {
  const response = await fetch(`/api/export/${transcriptionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format })
  })

  if (!response.ok) {
    throw new Error('Failed to export transcription')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcription.${format}`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}