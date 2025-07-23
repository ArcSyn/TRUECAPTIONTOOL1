import api from './api';
import { Caption } from '@/types';

// Description: Update caption text and timing
// Endpoint: PUT /api/captions/:id
// Request: { startTime: number, endTime: number, text: string }
// Response: { success: boolean, caption: Caption }
export const updateCaption = (captionId: string, data: Partial<Caption>) => {
  console.log('Updating caption:', captionId, data);
  // Mocking the response
  return new Promise<{ success: boolean; caption: Caption }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        caption: {
          id: captionId,
          startTime: data.startTime || 0,
          endTime: data.endTime || 0,
          text: data.text || '',
          ...data
        }
      });
    }, 300);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.put(`/api/captions/${captionId}`, data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Delete a caption
// Endpoint: DELETE /api/captions/:id
// Request: {}
// Response: { success: boolean }
export const deleteCaption = (captionId: string) => {
  console.log('Deleting caption:', captionId);
  // Mocking the response
  return new Promise<{ success: boolean }>((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 300);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.delete(`/api/captions/${captionId}`);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Add new caption
// Endpoint: POST /api/captions
// Request: { startTime: number, endTime: number, text: string, projectId: string }
// Response: { success: boolean, caption: Caption }
export const addCaption = (data: Omit<Caption, 'id'> & { projectId: string }) => {
  console.log('Adding new caption:', data);
  // Mocking the response
  return new Promise<{ success: boolean; caption: Caption }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        caption: {
          id: 'caption_' + Date.now(),
          startTime: data.startTime,
          endTime: data.endTime,
          text: data.text
        }
      });
    }, 300);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/captions', data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};