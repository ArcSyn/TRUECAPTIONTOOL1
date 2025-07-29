import api from './api';
import { Caption } from '@/types';

// Description: Update caption text and timing
// Endpoint: PUT /api/captions/:id
// Request: { startTime: number, endTime: number, text: string }
// Response: { success: boolean, caption: Caption }
export const updateCaption = async (captionId: string, data: Partial<Caption>) => {
  console.log('Updating caption:', captionId, data);
  try {
    const response = await api.put(`/api/captions/${captionId}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Delete a caption
// Endpoint: DELETE /api/captions/:id
// Request: {}
// Response: { success: boolean }
export const deleteCaption = async (captionId: string) => {
  console.log('Deleting caption:', captionId);
  try {
    const response = await api.delete(`/api/captions/${captionId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Add new caption
// Endpoint: POST /api/captions
// Request: { startTime: number, endTime: number, text: string, projectId: string }
// Response: { success: boolean, caption: Caption }
export const addCaption = async (data: Omit<Caption, 'id'> & { projectId: string }) => {
  console.log('Adding new caption:', data);
  try {
    const response = await api.post('/api/captions', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};