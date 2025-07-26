import React, { useState } from 'react';
import { VideoUpload } from '@/components/VideoUpload';
import { StepIndicator } from '@/components/StepIndicator';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ExportOptions } from '@/components/ExportOptions';
import { TranscriptionStatus } from '@/components/TranscriptionStatus';
import { VideoFile, Caption } from '@/types';
import { cn } from "@/lib/utils";

type Step = 'upload' | 'transcribe' | 'edit' | 'export';

export function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  const handleVideoUploaded = (video: VideoFile) => {
    console.log('Video uploaded:', video.name);
    setVideoFile(video);
    // If auto-transcription is enabled, go directly to transcribe step
    if (video.transcriptionId) {
      setCurrentStep('transcribe');
      setCompletedSteps(['upload']);
    }
  };

  const handleTranscriptionComplete = (transcriptionData: any) => {
    // Convert transcription segments to captions
    const newCaptions: Caption[] = transcriptionData?.segments?.map((segment: any, index: number) => ({
      id: `caption-${index}`,
      startTime: segment.start,
      endTime: segment.end,
      text: segment.text,
    })) || [];
    
    setCaptions(newCaptions);
    setCurrentStep('edit');
    setCompletedSteps(['upload', 'transcribe']);
  };

  const handleCaptionsChange = (newCaptions: Caption[]) => {
    setCaptions(newCaptions);
    if (!completedSteps.includes('edit')) {
      setCompletedSteps([...completedSteps, 'edit']);
    }
  };

  const goToExport = () => {
    setCurrentStep('export');
    if (!completedSteps.includes('export')) {
      setCompletedSteps([...completedSteps, 'export']);
    }
  };

  return (
    <div className={cn("bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen")}>
      {/* Header */}
      <div className={cn("top-0 z-40 sticky bg-white/80 backdrop-blur-sm border-white/20 border-b")}>
        <div className={cn("mx-auto px-6 py-4 max-w-7xl")}>
          <div className={cn("flex justify-between items-center")}>
            <div>
              <h1 className={cn("bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-transparent text-2xl")}>
                CaptionFlow
              </h1>
              <p className={cn("text-gray-600 text-sm")}>AI-Powered Caption Editor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className={cn("mx-auto px-6 py-8 max-w-6xl")}>
        <div className={cn("space-y-8")}>
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

          {currentStep === 'upload' && (
            <VideoUpload onVideoUploaded={handleVideoUploaded} />
          )}

          {currentStep === 'transcribe' && videoFile && videoFile.transcriptionId && (
            <TranscriptionStatus
              transcriptionId={videoFile.transcriptionId}
              videoTitle={videoFile.name}
              onExportComplete={handleTranscriptionComplete}
            />
          )}

          {currentStep === 'edit' && captions.length > 0 && (
            <div className={cn("space-y-6")}>
              <CaptionEditor
                captions={captions}
                onCaptionsChange={handleCaptionsChange}
                projectId="project_123"
              />
              <div className={cn("text-center")}>
                <button
                  className={cn("bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white transition")}
                  onClick={goToExport}
                >
                  Continue to Export
                </button>
              </div>
            </div>
          )}

          {currentStep === 'export' && captions.length > 0 && (
            <ExportOptions
              captions={captions}
              projectName={videoFile?.name || 'Project'}
              transcriptionId={videoFile?.transcriptionId || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}

