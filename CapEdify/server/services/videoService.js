require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

class VideoService {
  async createVideo(videoData) {
    try {
      console.log('Creating video record:', videoData.originalName);
      const { data, error } = await supabase
        .from('videos')
        .insert([{
          storage_path: videoData.path,
          public_url: videoData.publicUrl || '',
          original_name: videoData.originalName,
          size: videoData.size,
          mime_type: videoData.mimetype,
          status: 'uploaded',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('Video record created with ID:', data.id);
      return data;
    } catch (error) {
      console.error('Error creating video record:', error);
      throw new Error(`Failed to create video record: ${error.message}`);
    }
  }

  async getVideoById(id) {
    try {
      console.log('Fetching video by ID:', id);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Video not found');

      return data;
    } catch (error) {
      console.error('Error fetching video:', error);
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
  }

  async getAllVideos() {
    try {
      console.log('Fetching all videos');
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log(`Found ${data.length} videos`);
      return data;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
  }

  async deleteVideo(id) {
    try {
      console.log('Deleting video with ID:', id);
      const video = await this.getVideoById(id);

      // Delete from storage if path exists
      if (video.storage_path) {
        try {
          const { error: storageError } = await supabase
            .storage
            .from('videos')
            .remove([video.path]);
          
          if (storageError) {
            console.warn('Could not delete video file:', storageError.message);
          } else {
            console.log('Video file deleted from storage');
          }
        } catch (fileError) {
          console.warn('Could not delete video file:', fileError.message);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('Video record deleted from database');
      return { success: true, message: 'Video deleted successfully' };
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  async updateVideoStatus(id, status) {
    try {
      console.log('Updating video status:', id, status);
      const { data, error } = await supabase
        .from('videos')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Video not found');

      return data;
    } catch (error) {
      console.error('Error updating video status:', error);
      throw new Error(`Failed to update video status: ${error.message}`);
    }
  }
}

module.exports = new VideoService();
