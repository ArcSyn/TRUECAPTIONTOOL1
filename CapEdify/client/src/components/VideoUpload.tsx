import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { formatFileSize } from '@/utils/time';
import { useToast } from '@/hooks/useToast';
import { VideoFile } from '@/types';
import { cn } from '@/lib/utils';
// import { DebugUpload } from './DebugInfo'; // Temporarily disabled
import '@/utils/debug'; // Initialize backend status checker
// Optional step navigation
// import { useStep } from '@/hooks/useStep';

interface VideoUploadProps {
  onVideoUploaded: (video: VideoFile) => void;
}

export function VideoUpload({ onVideoUploaded }: VideoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lastError, setLastError] = useState<any>(null);
  const { toast } = useToast();
  // const { setStep } = useStep(); // Optional, uncomment if using a step system

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📁 File selected for pipeline processing:', file.name);

      // Simulate upload progress for UI feedback
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create VideoFile object with local URL for preview
      const videoUrl = URL.createObjectURL(file);

      const videoFile: VideoFile = {
        file: file,
        url: videoUrl,
        duration: 0, // Will be calculated by pipeline
        size: file.size,
        name: file.name,
        id: `temp-${Date.now()}`, // Temporary ID
        transcriptionId: undefined,
        transcriptionStatus: 'pending',
      };

      onVideoUploaded(videoFile);

      toast({
        title: 'File ready for processing',
        description: `${file.name} will be processed by the magical pipeline.`,
      });
    } catch (err: any) {
      console.error('File preparation failed:', err);
      setLastError(err);
      
      toast({
        title: 'File preparation failed',
        description: 'Could not prepare file for processing.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [onVideoUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 * 1024, // 100GB
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  if (uploadedFile && !isUploading) {
    return (
      <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20")}>
        <div className={cn("flex justify-between items-center")}>
          <div className={cn("flex items-center space-x-4")}>
            <div className={cn("flex justify-center items-center bg-blue-500/20 rounded-lg w-12 h-12")}>
              <File className={cn("w-6 h-6 text-blue-600")} />
            </div>
            <div>
              <h3 className={cn("font-semibold text-gray-900")}>{uploadedFile.name}</h3>
              <p className={cn("text-gray-600 text-sm")}>
                {formatFileSize(uploadedFile.size)} • Ready for magical processing ✨
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className={cn("text-gray-500 hover:text-red-500")}
          >
            <X className={cn("w-4 h-4")} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white/10 backdrop-blur-sm p-8 border-2 border-white/20 border-dashed")}>
      <div
        {...getRootProps()}
        className={cn(
          'transition-all duration-300 cursor-pointer',
          isDragActive && 'scale-105 bg-blue-50/50'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn("space-y-4 text-center")}>
          <div className={cn("flex justify-center items-center bg-blue-500/20 mx-auto rounded-full w-16 h-16")}>
            <Upload className={cn("w-8 h-8 text-blue-600")} />
          </div>

          {isUploading ? (
            <div className={cn("space-y-4")}>
              <h3 className={cn("font-semibold text-gray-900 text-lg")}>Uploading...</h3>
              <Progress value={uploadProgress} className={cn("mx-auto w-full max-w-xs")} />
              <p className={cn("text-gray-600 text-sm")}>{Math.round(uploadProgress)}% complete</p>
            </div>
          ) : (
            <>
              <h3 className={cn("font-semibold text-gray-900 text-lg")}>
                {isDragActive ? 'Drop your video here' : 'Upload your video'}
              </h3>
              <p className={cn("text-gray-600")}>
                Drag and drop your video file here, or click to browse
              </p>
              <p className={cn("text-gray-500 text-sm")}>
                Supports MP4, MOV, WebM, AVI • Up to 100GB
              </p>
              <Button className={cn("mt-4")}>Choose File</Button>
            </>
          )}
        </div>
      </div>
      
      {/* <DebugUpload 
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        uploadedFile={uploadedFile}
        error={lastError}
      /> */}
    </Card>
  );
}
