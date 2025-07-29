// Temporary stub for caption API functionality
import { Caption } from '@/types';

// Description: Update caption text and timing
// Endpoint: PUT /api/captions/:id
// Request: { startTime: number, endTime: number, text: string }
// Response: { success: boolean, caption: Caption }
export const updateCaption = async (captionId: string, data: Partial<Caption>) => {
  console.log('Updating caption (stub):', captionId, data);
  
  // Return stub response for now
  return {
    success: true,
    caption: { id: captionId, ...data } as Caption
  };
};

// Description: Delete a caption
// Endpoint: DELETE /api/captions/:id
// Request: {}
// Response: { success: boolean }
export const deleteCaption = async (captionId: string) => {
  console.log('Deleting caption (stub):', captionId);
  
  return { success: true };
};

// Description: Add new caption
// Endpoint: POST /api/captions
// Request: { startTime: number, endTime: number, text: string, projectId: string }
// Response: { success: boolean, caption: Caption }
export const addCaption = async (data: Omit<Caption, 'id'> & { projectId: string }) => {
  console.log('Adding new caption (stub):', data);
  
  return {
    success: true,
    caption: { 
      id: Math.random().toString(36),
      startTime: data.startTime,
      endTime: data.endTime,
      text: data.text
    } as Caption
  };
};