import api from './api';
import { VideoFile, TranscriptionProgress, Caption } from '@/types';

// Description: Upload video file for processing
// Endpoint: POST /api/video/upload
// Request: FormData with video file
// Response: { success: boolean, videoId: string, duration: number, size: number }
export const uploadVideo = async (file: File) => {
  try {
    console.log('Uploading video file:', file.name);
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await api.post('/api/video/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Upload failed:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all uploaded videos
// Endpoint: GET /api/videos
// Request: {}
// Response: { success: boolean, videos: Array<{ id: string, filename: string, size: number, duration: number, status: string, uploadedAt: string, lastModified: string }> }
export const getAllVideos = async () => {
  try {
    console.log('Fetching all videos');
    const response = await api.get('/api/videos');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch videos:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get single video by ID
// Endpoint: GET /api/video/:id
// Request: {}
// Response: { success: boolean, video: { id: string, filename: string, size: number, duration: number, status: string, uploadedAt: string, lastModified: string } }
export const getVideoById = async (id: string) => {
  try {
    console.log('Fetching video by ID:', id);
    const response = await api.get(`/api/video/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch video:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete video by ID
// Endpoint: DELETE /api/video/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deleteVideo = async (id: string) => {
  try {
    console.log('Deleting video:', id);
    const response = await api.delete(`/api/video/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete video:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Start AI transcription process
// Endpoint: POST /api/video/transcribe
// Request: { videoId: string, model: 'groq' | 'whisper' }
// Response: { success: boolean, transcriptionId: string }
export const startTranscription = (videoId: string, model: 'groq' | 'whisper' = 'groq') => {
  console.log('Starting transcription for video:', videoId, 'with model:', model);
  // Mocking the response
  return new Promise<{ success: boolean; transcriptionId: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transcriptionId: 'trans_' + Date.now()
      });
    }, 1000);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/video/transcribe', { videoId, model });
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get transcription progress
// Endpoint: GET /api/video/transcription/:id/progress
// Request: {}
// Response: { progress: number, status: string, estimatedTime?: number }
export const getTranscriptionProgress = (transcriptionId: string) => {
  console.log('Getting transcription progress for:', transcriptionId);
  // Mocking the response
  return new Promise<TranscriptionProgress>((resolve) => {
    setTimeout(() => {
      const progress = Math.min(100, Math.random() * 100);
      resolve({
        progress,
        status: progress >= 100 ? 'completed' : 'processing',
        estimatedTime: progress < 100 ? Math.floor((100 - progress) * 2) : undefined
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get(`/api/video/transcription/${transcriptionId}/progress`);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Get completed captions
// Endpoint: GET /api/video/transcription/:id/captions
// Request: {}
// Response: { captions: Caption[] }
export const getTranscriptionCaptions = (transcriptionId: string) => {
  console.log('Getting captions for transcription:', transcriptionId);
  // Mocking the response
  return new Promise<{ captions: Caption[] }>((resolve) => {
    setTimeout(() => {
      resolve({
        captions: [
          { id: '1', startTime: 0, endTime: 3.5, text: 'Welcome to our amazing video content.' },
          { id: '2', startTime: 3.5, endTime: 7.2, text: 'Today we will be exploring the world of AI transcription.' },
          { id: '3', startTime: 7.2, endTime: 12.1, text: 'This technology has revolutionized how we create captions.' },
          { id: '4', startTime: 12.1, endTime: 16.8, text: 'Let me show you how easy it is to use our platform.' },
          { id: '5', startTime: 16.8, endTime: 21.3, text: 'Simply upload your video and let AI do the work.' }
        ]
      });
    }, 1000);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get(`/api/video/transcription/${transcriptionId}/captions`);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};