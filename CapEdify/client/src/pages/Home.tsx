import React, { useState, useEffect } from 'react';
import { VideoUpload } from '@/components/VideoUpload';
import { TranscriptionProgress } from '@/components/TranscriptionProgress';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ExportOptions } from '@/components/ExportOptions';
import { StepIndicator } from '@/components/StepIndicator';
import { ThemeSelector } from '@/components/ThemeSelector';
import { PrivacyTimer } from '@/components/PrivacyTimer';
import { VideoFile, Caption } from '@/types';
import { getTranscriptionCaptions } from '@/api/video';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/useToast';

type Step = 'upload' | 'transcribe' | 'edit' | 'export';

export function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [projectId] = useState(() => 'project_' + Date.now());
  const [savedProject, setSavedProject] = useLocalStorage('captionflow-project', null);
  const { toast } = useToast();

  // Restore session on load
  useEffect(() => {
    if (savedProject && !videoFile && captions.length === 0) {
      console.log('Restoring saved project');
      setVideoFile(savedProject.videoFile);
      setCaptions(savedProject.captions || []);
      setCurrentStep(savedProject.currentStep || 'upload');
      setCompletedSteps(savedProject.completedSteps || []);

      toast({
        title: "Session restored",
        description: "Your previous work has been restored.",
      });
    }
  }, []); // Remove dependencies to run only once on mount

  // Auto-save project state
  useEffect(() => {
    if (videoFile || captions.length > 0) {
      setSavedProject({
        videoFile,
        captions,
        currentStep,
        completedSteps,
        projectId,
        lastModified: new Date().toISOString()
      });
    }
  }, [videoFile, captions, currentStep, completedSteps, projectId, setSavedProject]);

  const handleVideoUploaded = (video: VideoFile) => {
    console.log('Video uploaded:', video.name);
    setVideoFile(video);
    setCurrentStep('transcribe');
    setCompletedSteps(['upload']);

    // Store object URL for cleanup
    const objectUrls = JSON.parse(localStorage.getItem('captionflow-object-urls') || '[]');
    objectUrls.push(video.url);
    localStorage.setItem('captionflow-object-urls', JSON.stringify(objectUrls));
  };

  const handleTranscriptionComplete = async (transcriptionId: string) => {
    try {
      console.log('Transcription completed:', transcriptionId);
      const result = await getTranscriptionCaptions(transcriptionId);
      setCaptions(result.captions);
      setCurrentStep('edit');
      setCompletedSteps(['upload', 'transcribe']);
    } catch (error) {
      console.error('Failed to get captions:', error);
      toast({
        title: "Failed to load captions",
        description: error instanceof Error ? error.message : "Failed to load transcription",
        variant: "destructive",
      });
    }
  };

  const handleCaptionsChange = (newCaptions: Caption[]) => {
    setCaptions(newCaptions);
    if (!completedSteps.includes('edit')) {
      setCompletedSteps([...completedSteps, 'edit']);
      setCurrentStep('export');
    }
  };

  const handleDataCleared = () => {
    setVideoFile(null);
    setCaptions([]);
    setCurrentStep('upload');
    setCompletedSteps([]);
    setSavedProject(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CaptionFlow
              </h1>
              <p className="text-sm text-gray-600">AI-Powered Caption Editor</p>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

          {/* Upload Step */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Upload Your Video
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Get started by uploading your video file. We support large files up to 100GB 
                  and all processing happens locally for your privacy.
                </p>
              </div>
              <VideoUpload onVideoUploaded={handleVideoUploaded} />
            </div>
          )}

          {/* Transcription Step */}
          {currentStep === 'transcribe' && videoFile && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  AI Transcription
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Choose your preferred transcription method. Groq AI offers fast, accurate results, 
                  while Whisper runs locally for complete privacy.
                </p>
              </div>
              <TranscriptionProgress
                videoId="video_123"
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </div>
          )}

          {/* Edit Step */}
          {(currentStep === 'edit' || currentStep === 'export') && captions.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Edit Your Captions
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Fine-tune your captions by editing text and adjusting timing. 
                  Changes are automatically saved every 5 seconds.
                </p>
              </div>
              <CaptionEditor
                captions={captions}
                onCaptionsChange={handleCaptionsChange}
                projectId={projectId}
              />
            </div>
          )}

          {/* Export Step */}
          {currentStep === 'export' && captions.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Export Your Captions
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Export your captions as an After Effects script or React component. 
                  Both formats are ready to use in your projects.
                </p>
              </div>
              <ExportOptions
                captions={captions}
                projectName={videoFile?.name.replace(/\.[^/.]+$/, '') || 'CaptionFlow Project'}
              />
            </div>
          )}

          {/* Empty State */}
          {currentStep === 'upload' && !videoFile && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to CaptionFlow
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                The fastest way to create professional captions for your videos using AI. 
                Everything runs locally for maximum privacy and security.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Timer */}
      {(videoFile || captions.length > 0) && (
        <PrivacyTimer onDataCleared={handleDataCleared} />
      )}
    </div>
  );
}