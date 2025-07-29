// Temporary compatibility layer - maps old API calls to new consolidated API
import { api } from './index';

export const startTranscription = async (videoId: string, transcriptionId: string, model?: string) => {
  try {
    return await api.transcriptions.start(videoId, transcriptionId, model);
  } catch (error) {
    console.error('startTranscription error:', error);
    throw error;
  }
};

export const getTranscriptionProgress = async (transcriptionId: string) => {
  try {
    return await api.transcriptions.getStatus(transcriptionId);
  } catch (error) {
    console.error('getTranscriptionProgress error:', error);
    throw error;
  }
};