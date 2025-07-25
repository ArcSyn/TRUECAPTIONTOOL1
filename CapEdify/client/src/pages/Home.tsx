import React, { useState } from 'react';
import { VideoUpload } from '@/components/VideoUpload';
import { StepIndicator } from '@/components/StepIndicator';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ExportOptions } from '@/components/ExportOptions';
import { VideoFile, Caption } from '@/types';

type Step = 'upload' | 'transcribe' | 'edit' | 'export';

export function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  const handleVideoUploaded = (video: VideoFile) => {
    console.log('Video uploaded:', video.name);
    setVideoFile(video);
    setCurrentStep('transcribe');
    setCompletedSteps(['upload']);
  };

  const handleTranscriptionComplete = () => {
    const dummyCaptions: Caption[] = [
      { start: 0, end: 2, text: 'Hello world' },
      { start: 2, end: 4, text: 'Welcome to CaptionFlow' },
    ];
    setCaptions(dummyCaptions);
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

          {currentStep === 'transcribe' && videoFile && (
            <div className={cn("space-y-4 text-center")}>
              <p className={cn("text-gray-700")}>Video is ready for transcription.</p>
              <button
                className={cn("bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition")}
                onClick={handleTranscriptionComplete}
              >
                Start Transcription (Mock)
              </button>
            </div>
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

