// Enhanced video upload with auto-transcription support
import { supabase } from '../lib/supabaseClient';
import api from './api';

// API base URL for direct fetch calls
const API_BASE_URL = 'http://localhost:4000/api';

// Types for JSX Export
export interface JSXCaption {
  id: string | number;
  startTime: number;
  endTime: number;
  text: string;
  duration?: number;
}

export interface JSXExportOptions {
  projectName?: string;
  styleName?: 'modern' | 'minimal' | 'bold';
  sceneMode?: boolean;
  gapThreshold?: number;
  captions?: JSXCaption[];
  srtContent?: string;
}

export interface JSXStyle {
  name: string;
  displayName: string;
  config: {
    font: string;
    fontSize: number;
    color: number[];
    strokeColor?: number[] | null;
    strokeWidth: number;
    position: number[];
    justification: string;
    animation: string;
    shadow: boolean;
    shadowColor?: number[];
    shadowDistance?: number;
  };
}

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
    };

    if (onProgress) {
      onProgress(100);
    }

    return result;
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
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
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
  const response = await fetch(`${API_BASE_URL}/export/${transcriptionId}`, {
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

// Enhanced JSX Export Functions

// Get available JSX styles
export async function getJSXStyles(): Promise<JSXStyle[]> {
  try {
    const response = await api.get('/api/export/jsx/styles');
    return response.data.styles;
  } catch (error) {
    console.error('Error getting JSX styles:', error);
    throw error;
  }
}

// Export enhanced JSX for After Effects
export async function exportEnhancedJSX(
  transcriptionId: string, 
  options: JSXExportOptions = {}
): Promise<{ success: boolean; type: string; files?: any; data?: string; metadata?: any }> {
  try {
    // Use axios directly with proper error handling
    const response = await api.post('/api/export/jsx/enhanced', {
      transcriptionId,
      ...options
    });

    // Check if it's scene mode (multiple files)
    if (response.data.type === 'multi-file') {
      return response.data;
    } else {
      // Single file - trigger download
      const blob = new Blob([response.data], { type: 'application/javascript' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.projectName?.replace(/\s+/g, '_') || 'captions'}.jsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true, type: 'single-file', data: response.data };
    }
  } catch (error: any) {
    console.error('Enhanced JSX export error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
}

// Export scene-based JSX files (returns download links)
export async function exportSceneJSX(
  transcriptionId: string,
  options: JSXExportOptions = {}
): Promise<{ [filename: string]: string }> {
  try {
    const sceneOptions = { ...options, sceneMode: true };
    const response = await api.post('/api/export/jsx/enhanced', {
      transcriptionId,
      ...sceneOptions
    });

    if (response.data.type === 'multi-file' && response.data.files) {
      const downloadLinks: { [filename: string]: string } = {};
      
      // Create download links for each scene file
      Object.entries(response.data.files).forEach(([filename, content]) => {
        const blob = new Blob([content as string], { type: 'application/javascript' });
        downloadLinks[filename] = window.URL.createObjectURL(blob);
      });
      
      return downloadLinks;
    } else {
      throw new Error('Invalid scene export response');
    }
  } catch (error: any) {
    console.error('Scene JSX export error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
}

// Preview JSX output
export async function previewJSX(
  transcriptionId: string,
  options: JSXExportOptions = {}
): Promise<{ preview: string; fullLength: number; metadata: any }> {
  try {
    const response = await api.post('/api/export/jsx/preview', {
      transcriptionId,
      ...options
    });
    return response.data;
  } catch (error: any) {
    console.error('JSX preview error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
}

// Utility function to download multiple scene files as a ZIP
export async function downloadSceneFilesAsZip(
  files: { [filename: string]: string },
  projectName: string = 'scenes'
): Promise<void> {
  // This would require a zip library like JSZip
  // For now, we'll download files individually
  Object.entries(files).forEach(([filename, url], index) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, index * 500); // Stagger downloads
  });
}