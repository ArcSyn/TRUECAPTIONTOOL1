import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadVideo(file: File) {
  const fileExt = file.name.split('.').pop()
  const filePath = `videos/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from('videos')
    .getPublicUrl(filePath)

  const videoUrl = publicUrlData?.publicUrl
  if (!videoUrl) throw new Error("Failed to get public URL")

  return {
    videoId: filePath,
    url: videoUrl,
    size: file.size,
    duration: 0
  }
}