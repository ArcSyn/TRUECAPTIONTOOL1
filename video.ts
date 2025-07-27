import { supabase } from '@/lib/supabase';

export async function uploadVideo(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return {
    videoId: fileName,
    duration: 0, // Placeholder
    size: file.size
  };
}
