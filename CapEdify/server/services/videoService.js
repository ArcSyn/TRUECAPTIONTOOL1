const Video = require('../models/Video');
const fs = require('fs').promises;
const path = require('path');

class VideoService {
  async createVideo(videoData) {
    try {
      console.log('Creating video record:', videoData.originalName);
      const video = new Video(videoData);
      const savedVideo = await video.save();
      console.log('Video record created with ID:', savedVideo._id);
      return savedVideo;
    } catch (error) {
      console.error('Error creating video record:', error);
      throw new Error(`Failed to create video record: ${error.message}`);
    }
  }

  async getVideoById(id) {
    try {
      console.log('Fetching video by ID:', id);
      const video = await Video.findById(id);
      if (!video) {
        throw new Error('Video not found');
      }
      return video;
    } catch (error) {
      console.error('Error fetching video:', error);
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
  }

  async getAllVideos() {
    try {
      console.log('Fetching all videos');
      const videos = await Video.find().sort({ uploadedAt: -1 });
      console.log(`Found ${videos.length} videos`);
      return videos;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
  }

  async deleteVideo(id) {
    try {
      console.log('Deleting video with ID:', id);
      const video = await Video.findById(id);
      if (!video) {
        throw new Error('Video not found');
      }

      // Delete the physical file
      try {
        await fs.unlink(video.path);
        console.log('Video file deleted:', video.path);
      } catch (fileError) {
        console.warn('Could not delete video file:', fileError.message);
      }

      // Delete the database record
      await Video.findByIdAndDelete(id);
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
      const video = await Video.findByIdAndUpdate(
        id,
        { status, lastModified: new Date() },
        { new: true }
      );
      if (!video) {
        throw new Error('Video not found');
      }
      return video;
    } catch (error) {
      console.error('Error updating video status:', error);
      throw new Error(`Failed to update video status: ${error.message}`);
    }
  }
}

module.exports = new VideoService();