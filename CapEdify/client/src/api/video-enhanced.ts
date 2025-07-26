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
    };

    if (onProgress) {
      onProgress(100);
    }

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Get transcription status
export async function getTranscriptionStatus(transcriptionId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/transcriptions/${transcriptionId}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get transcription status');
    }
    
    return data.transcription;
  } catch (error) {
    console.error('Get transcription status error:', error);
    throw error;
  }
}

// Export transcription to various formats
export async function exportTranscription(transcriptionId: string, formats: string[] = ['srt', 'jsx', 'vtt']) {
  try {
    const response = await fetch(`${API_BASE_URL}/transcriptions/${transcriptionId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ formats })
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Export failed');
    }
    
    return data.exports;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

// Get all videos
export async function getVideos() {
  try {
    const response = await fetch(`${API_BASE_URL}/videos`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get videos');
    }
    
    return data.videos;
  } catch (error) {
    console.error('Get videos error:', error);
    throw error;
  }
}

// Trigger manual transcription
export async function startTranscription(videoId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/transcribe`, {
      method: 'POST'
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to start transcription');
    }
    
    return data.transcriptionId;
  } catch (error) {
    console.error('Start transcription error:', error);
    throw error;
  }
}

// Legacy function for compatibility
export async function createVideo(videoData: any) {
  console.warn('createVideo is deprecated, use uploadVideo instead');
  return videoData;
}

// Legacy function for compatibility  
export async function updateVideoTranscription(videoId: string, transcriptionData: any) {
  console.warn('updateVideoTranscription is deprecated, transcription is now automatic');
  return transcriptionData;
}
