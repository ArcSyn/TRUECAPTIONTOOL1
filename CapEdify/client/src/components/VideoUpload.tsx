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
  onVideosUploaded?: (videos: VideoFile[]) => void; // New prop for multi-file support
  allowMultiple?: boolean; // Flag to enable multi-file mode
}

export function VideoUpload({ onVideoUploaded, onVideosUploaded, allowMultiple = false }: VideoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingStatus, setProcessingStatus] = useState<Map<string, { progress: number; status: string }>>(new Map());
  const [lastError, setLastError] = useState<any>(null);
  const { toast } = useToast();
  // const { setStep } = useStep(); // Optional, uncomment if using a step system

  // Legacy support for single file
  const uploadedFile = uploadedFiles.length > 0 ? uploadedFiles[0] : null;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const filesToProcess = allowMultiple ? acceptedFiles : [acceptedFiles[0]];
    setUploadedFiles(filesToProcess);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log(`📁 ${filesToProcess.length} file(s) selected for pipeline processing:`, 
        filesToProcess.map(f => f.name));

      // Simulate upload progress for UI feedback
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create VideoFile objects for all files
      const videoFiles: VideoFile[] = filesToProcess.map((file, index) => {
        const videoUrl = URL.createObjectURL(file);
        return {
          file: file,
          url: videoUrl,
          duration: 0, // Will be calculated by pipeline
          size: file.size,
          name: file.name,
          id: `temp-${Date.now()}-${index}`, // Unique temporary ID
          transcriptionId: undefined,
          transcriptionStatus: 'pending',
        };
      });

      // Call appropriate callback based on mode
      if (allowMultiple && onVideosUploaded && videoFiles.length > 1) {
        onVideosUploaded(videoFiles);
        toast({
          title: 'Files ready for processing',
          description: `${videoFiles.length} files will be processed by the magical pipeline.`,
        });
      } else {
        // Single file mode or fallback
        onVideoUploaded(videoFiles[0]);
        toast({
          title: 'File ready for processing',
          description: `${videoFiles[0].name} will be processed by the magical pipeline.`,
        });
      }

    } catch (err: any) {
      console.error('File preparation failed:', err);
      setLastError(err);
      
      toast({
        title: 'File preparation failed',
        description: 'Could not prepare files for processing.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [onVideoUploaded, onVideosUploaded, allowMultiple, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
    },
    maxFiles: allowMultiple ? 50 : 1, // Allow up to 50 files in multi-file mode
    maxSize: 100 * 1024 * 1024 * 1024, // 100GB per file
    multiple: allowMultiple,
  });

  const removeFile = (indexToRemove?: number) => {
    if (typeof indexToRemove === 'number') {
      // Remove specific file by index
      setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    } else {
      // Remove all files (legacy behavior)
      setUploadedFiles([]);
      setUploadProgress(0);
      setProcessingStatus(new Map());
    }
  };

  if (uploadedFiles.length > 0 && !isUploading) {
    return (
      <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20")}>
        <div className={cn("space-y-4")}>
          {/* Header */}
          <div className={cn("flex justify-between items-center")}>
            <h3 className={cn("font-semibold text-gray-900")}>
              {uploadedFiles.length === 1 ? 'Uploaded File' : `${uploadedFiles.length} Uploaded Files`}
            </h3>
            {uploadedFiles.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile()}
                className={cn("text-gray-500 hover:text-red-500")}
              >
                <X className={cn("w-4 h-4 mr-2")} />
                Clear All
              </Button>
            )}
          </div>

          {/* File List */}
          <div className={cn("space-y-3")}>
            {uploadedFiles.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className={cn("flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10")}
              >
                <div className={cn("flex items-center space-x-3")}>
                  <div className={cn("flex justify-center items-center bg-blue-500/20 rounded-lg w-10 h-10")}>
                    <File className={cn("w-5 h-5 text-blue-600")} />
                  </div>
                  <div>
                    <h4 className={cn("font-medium text-gray-900 text-sm")}>{file.name}</h4>
                    <p className={cn("text-gray-600 text-xs")}>
                      {formatFileSize(file.size)} • Ready for processing ✨
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className={cn("text-gray-500 hover:text-red-500")}
                >
                  <X className={cn("w-4 h-4")} />
                </Button>
              </div>
            ))}
          </div>

          {/* Summary */}
          {uploadedFiles.length > 1 && (
            <div className={cn("text-sm text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-200/50")}>
              <strong>Batch Processing:</strong> {uploadedFiles.length} files ready • Total size: {
                formatFileSize(uploadedFiles.reduce((sum, file) => sum + file.size, 0))
              }
            </div>
          )}
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
                {isDragActive 
                  ? `Drop your ${allowMultiple ? 'videos' : 'video'} here` 
                  : `Upload your ${allowMultiple ? 'videos' : 'video'}`
                }
              </h3>
              <p className={cn("text-gray-600")}>
                {allowMultiple 
                  ? 'Drag and drop multiple video files here, or click to browse'
                  : 'Drag and drop your video file here, or click to browse'
                }
              </p>
              <p className={cn("text-gray-500 text-sm")}>
                Supports MP4, MOV, WebM, AVI • Up to 100GB{allowMultiple ? ' per file • Max 50 files' : ''}
              </p>
              <Button className={cn("mt-4")}>
                {allowMultiple ? 'Choose Files' : 'Choose File'}
              </Button>
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
