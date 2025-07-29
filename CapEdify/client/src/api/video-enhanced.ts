// Enhanced video upload with auto-transcription support
const API_BASE_URL = 'http://localhost:4000/api';

export async function uploadVideo(file: File, onProgress?: (progress: number) => void) {
  console.log('🚀 Starting upload process...', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    apiUrl: `${API_BASE_URL}/video/upload`
  });
  
  // Add debugger for VS Code/Chrome debugging
  debugger;
  
  try {
    // Check if backend is reachable first
    console.log('🔍 Checking backend connectivity...');
    
    try {
      const healthCheck = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Health check response:', healthCheck.status);
    } catch (healthError) {
      console.error('❌ Backend not reachable:', healthError);
      throw new Error('Cannot connect to backend server. Please ensure it\'s running on port 4000.');
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('video', file);
    console.log('📦 FormData prepared, starting upload...');

    if (onProgress) {
      onProgress(10);
    }

    // Upload to our enhanced server with auto-transcription
    console.log('📡 Sending POST request to:', `${API_BASE_URL}/video/upload`);
    console.log('🔍 Network Tab Debug: Look for this request in DevTools → Network');
    console.log('⚠️  If you see "provisional headers" it means the request was blocked');
    
    const response = await fetch(`${API_BASE_URL}/video/upload`, {
      method: 'POST',
      body: formData,
      // Add explicit headers for debugging
      headers: {
        // Don't set Content-Type - let browser set it for FormData
      }
    });

    console.log('📥 Upload response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed with response:', errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Upload response data:', data);

    if (!data.success) {
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
