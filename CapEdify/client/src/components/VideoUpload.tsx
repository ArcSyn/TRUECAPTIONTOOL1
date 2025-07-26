import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { formatFileSize } from '@/utils/time';
import { compressVideo } from '@/utils/compress';
import { uploadVideo } from '@/api/video-enhanced';
import { useToast } from '@/hooks/useToast';
import { VideoFile } from '@/types';
import { cn } from '@/lib/utils';
// Optional step navigation
// import { useStep } from '@/hooks/useStep';

interface VideoUploadProps {
  onVideoUploaded: (video: VideoFile) => void;
}

export function VideoUpload({ onVideoUploaded }: VideoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  // const { setStep } = useStep(); // Optional, uncomment if using a step system

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let compressedFile: File = file;

      try {
        compressedFile = await compressVideo(file);
      } catch (compressionError) {
        console.warn('Compression failed, uploading original file.', compressionError);
      }

      const result = await uploadVideo(compressedFile, (progress: number) => {
        setUploadProgress(progress);
      });

      const videoUrl = URL.createObjectURL(compressedFile);

      const videoFile: VideoFile = {
        file: compressedFile,
        url: result.videoUrl,
        duration: result.duration,
        size: result.size,
        name: compressedFile.name,
        id: result.videoId,
        transcriptionId: result.transcriptionId,
        transcriptionStatus: result.transcriptionStatus,
      };

      onVideoUploaded(videoFile);
      // setStep('transcribe'); // Optional transition

      toast({
        title: 'Upload successful',
        description: `${compressedFile.name} uploaded.`,
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast({
        title: 'Upload failed',
        description: err?.message || 'Could not upload video.',
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
                {formatFileSize(uploadedFile.size)} • Ready for transcription
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
    </Card>
  );
}
