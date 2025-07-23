import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { formatFileSize, formatDuration } from '@/utils/time';
import { VideoFile } from '@/types';
import { uploadVideo } from '@/api/video';
import { useToast } from '@/hooks/useToast';

interface VideoUploadProps {
  onVideoUploaded: (video: VideoFile) => void;
}

export function VideoUpload({ onVideoUploaded }: VideoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('File dropped:', file.name, file.size);
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const result = await uploadVideo(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Create video object URL for preview
      const videoUrl = URL.createObjectURL(file);

      const videoFile: VideoFile = {
        file,
        url: videoUrl,
        duration: result.duration,
        size: result.size,
        name: file.name,
        id: result.videoId // Add the video ID from the API response
      };

      onVideoUploaded(videoFile);

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      });

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onVideoUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 * 1024 // 100GB
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  if (uploadedFile && !isUploading) {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <File className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{uploadedFile.name}</h3>
              <p className="text-sm text-gray-600">
                {formatFileSize(uploadedFile.size)} • Ready for transcription
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-gray-500 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20 border-dashed border-2">
      <div
        {...getRootProps()}
        className={`cursor-pointer transition-all duration-300 ${
          isDragActive ? 'scale-105 bg-blue-50/50' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>

          {isUploading ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Uploading...</h3>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-gray-600">{Math.round(uploadProgress)}% complete</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900">
                {isDragActive ? 'Drop your video here' : 'Upload your video'}
              </h3>
              <p className="text-gray-600">
                Drag and drop your video file here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports MP4, MOV, WebM, AVI • Up to 100GB
              </p>
              <Button className="mt-4">
                Choose File
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}