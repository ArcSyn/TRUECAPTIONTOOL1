import React, { useState, useMemo, useCallback } from 'react';
import './App.css';
import { TranscriptionProgress } from './components/TranscriptionProgress';
import { VideoUpload } from './components/VideoUpload';
import { runPipeline, pollPipelineProgress, downloadPipelineResult, downloadPipelineJSX, downloadPipelineSRT, downloadPipelineVTT, downloadPipelineText, triggerDownload, getPipelineStatus, PipelineStatus } from './api/pipeline';

// Simple types for now
interface VideoFile {
  file: File;
  url: string;
  duration: number;
  size: number;
  name: string;
  id?: string;
  transcriptionId?: string;
  transcriptionStatus?: string;
}

interface Caption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}



// Magical themed step configuration
const MAGICAL_STEPS = [
  { 
    id: 'upload', 
    label: 'Summon Media', 
    icon: '🔮', 
    description: 'Upload your mystical video file',
    magicalText: 'The crystal ball awaits your video...'
  },
  { 
    id: 'transcribe', 
    label: 'Divine Words', 
    icon: '✨', 
    description: 'AI spirits transcribe your audio',
    magicalText: 'Ancient spirits are listening to your words...'
  },
  { 
    id: 'edit', 
    label: 'Enchant Text', 
    icon: '📜', 
    description: 'Edit and perfect your captions',
    magicalText: 'Weave your words with magical precision...'
  },
  { 
    id: 'export', 
    label: 'Cast Spells', 
    icon: '🪄', 
    description: 'Export in multiple magical formats',
    magicalText: 'Transform your work into powerful spells...'
  }
];

type StepType = 'upload' | 'transcribe' | 'edit' | 'export';

function App() {
  const [currentStep, setCurrentStep] = useState<StepType>('upload');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<VideoFile | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string>('');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  
  // New pipeline integration state
  const [pipelineJobId, setPipelineJobId] = useState<string>('');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [jsxDownloadReady, setJsxDownloadReady] = useState<boolean>(false);
  const [transcriptionStats, setTranscriptionStats] = useState<{words: number, characters: number} | null>(null);

  // Check for completed pipeline on mount
  React.useEffect(() => {
    const savedJobId = localStorage.getItem('currentPipelineJob');
    if (savedJobId && !pipelineJobId) {
      console.log('🔄 Checking saved pipeline job:', savedJobId);
      checkPipelineStatus(savedJobId);
    }
  }, [pipelineJobId]); // Only re-run when pipelineJobId changes

  const checkPipelineStatus = async (jobId: string) => {
    try {
      const status = await getPipelineStatus(jobId);
      setPipelineStatus(status);
      setPipelineJobId(jobId);
      
      if (status.status === 'completed') {
        setCompletedSteps(['upload', 'transcribe']);
        setCurrentStep('edit');
        setJsxDownloadReady(true);
        setIsProcessing(false);
        setProcessingProgress(100);
        
        // Extract transcription data from pipeline result
        if (status.result) {
          extractTranscriptionData(status, jobId);
        }
        
        setProcessingMessage('✨ Transcription complete! Review your magical text.');
      } else if (status.status === 'processing') {
        setCurrentStep('transcribe');
        setIsProcessing(true);
        setProcessingProgress(status.progress);
        setProcessingMessage(status.progressMessage || 'Processing...');
        
        // Resume polling
        await pollPipelineProgress(jobId, (updatedStatus) => {
          setPipelineStatus(updatedStatus);
          setProcessingProgress(updatedStatus.progress);
          setProcessingMessage(updatedStatus.progressMessage);
          
          if (updatedStatus.progress >= 25 && !completedSteps.includes('transcribe')) {
            setCompletedSteps(['upload', 'transcribe']);
          }
          if (updatedStatus.progress === 100) {
            // Pipeline complete - show transcription for review
            setCompletedSteps(['upload', 'transcribe']);
            setCurrentStep('edit');
            setIsProcessing(false);
            setJsxDownloadReady(true);
            
            // Extract transcription data from pipeline result
            if (updatedStatus.result) {
              extractTranscriptionData(updatedStatus, jobId);
            }
            
            setProcessingMessage('✨ Transcription complete! Review your magical text.');
          }
        });
      }
    } catch (error) {
      console.error('Error checking pipeline status:', error);
      localStorage.removeItem('currentPipelineJob');
    }
  };

  const extractTranscriptionData = async (status: PipelineStatus, jobId: string) => {
    const startTime = performance.now();
    console.log('🔄 Starting transcription data extraction...');
    
    try {
      if (status.result?.transcriptionData) {
        const { text, segments, totalCharacters, totalWords } = status.result.transcriptionData;
        
        console.log(`📝 Got raw transcription text: ${text.length} characters`);
        
        // Store the raw text as one big "caption" for display
        const captions: Caption[] = [{
          id: 'transcription_text',
          startTime: 0,
          endTime: 0,
          text: text || ''
        }];
        
        setCaptions(captions);
        setTranscriptionId(jobId);
        setTranscriptionStats({ words: totalWords, characters: totalCharacters });
        
        const totalTime = performance.now() - startTime;
        console.log(`📊 Transcription Stats: ${totalWords} words, ${totalCharacters} characters`);
        console.log(`⚡ Total extraction took ${totalTime.toFixed(2)}ms`);
        
      } else {
        console.warn('No transcription data found in pipeline result');
      }
    } catch (error) {
      console.error('Error extracting transcription data:', error);
    }
  };

  const handleVideoUploaded = async (video: VideoFile) => {
    setUploadedVideo(video);
    const cleanProjectName = video.name.replace(/\.[^/.]+$/, ''); // Remove extension
    setProjectName(cleanProjectName);
    
    // Mark upload as complete and start pipeline processing
    setCompletedSteps(['upload']);
    setCurrentStep('transcribe');
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingMessage('Starting magical transcription...');
    
    try {
      console.log('🚀 Starting AgentOrchestrator pipeline for video:', video.name);
      
      // Start the pipeline with video file
      const pipelineJob = await runPipeline({
        inputType: 'video',
        file: video.file,
        userTier: 'creator', // You can make this dynamic based on user
        jobCountThisMonth: 1,
        projectName: cleanProjectName,
        style: 'modern',
        position: 'bottom'
      });
      
      setPipelineJobId(pipelineJob.jobId);
      localStorage.setItem('currentPipelineJob', pipelineJob.jobId);
      console.log('✅ Pipeline started:', pipelineJob.jobId);
      
      // Start polling for progress
      await pollPipelineProgress(pipelineJob.jobId, (status) => {
        setPipelineStatus(status);
        setProcessingProgress(status.progress);
        setProcessingMessage(status.progressMessage);
        
        // Update UI steps based on progress
        if (status.progress >= 25 && !completedSteps.includes('transcribe')) {
          setCompletedSteps(['upload', 'transcribe']);
        }
        if (status.progress === 100) {
          // Pipeline complete - show transcription for review
          setCompletedSteps(['upload', 'transcribe']);
          setCurrentStep('edit');
          setIsProcessing(false);
          setJsxDownloadReady(true);
          
          // Extract transcription data from pipeline result
          if (status.result) {
            extractTranscriptionData(status, pipelineJob.jobId);
          }
          
          setProcessingMessage('✨ Transcription complete! Review your magical text.');
        }
      });
      
    } catch (error: any) {
      console.error('❌ Pipeline failed:', error);
      setIsProcessing(false);
      setProcessingMessage(`❌ Magic failed: ${error.message}`);
      setProcessingProgress(0);
    }
  };

  // Download handler for JSX file
  const handleDownloadJSX = async () => {
    if (!pipelineJobId) {
      console.error('No pipeline job ID available');
      return;
    }
    
    try {
      console.log('📥 Downloading JSX file for job:', pipelineJobId);
      const { blob, filename } = await downloadPipelineResult(pipelineJobId);
      
      // Trigger browser download
      triggerDownload(blob, filename);
      
      console.log('✅ JSX file downloaded successfully:', filename);
      setProcessingMessage('🎉 JSX downloaded! Import into After Effects.');
      
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      setProcessingMessage(`❌ Download failed: ${error.message}`);
    }
  };

  // New styled JSX download handlers (memoized for performance)
  const handleDownloadJSXStyled = useCallback(async (style: 'bold' | 'modern' | 'minimal') => {
    if (!pipelineJobId) {
      console.error('No pipeline job ID available');
      return;
    }
    
    try {
      console.log(`📥 Downloading ${style} JSX for job:`, pipelineJobId);
      const { blob, filename } = await downloadPipelineJSX(pipelineJobId, style);
      triggerDownload(blob, filename);
      console.log(`✅ ${style} JSX downloaded:`, filename);
    } catch (error: any) {
      console.error(`❌ ${style} JSX download failed:`, error);
    }
  }, [pipelineJobId]);

  const handleDownloadSRT = useCallback(async () => {
    if (!pipelineJobId) {
      console.error('No pipeline job ID available');
      return;
    }
    
    try {
      console.log('📥 Downloading SRT for job:', pipelineJobId);
      const { blob, filename } = await downloadPipelineSRT(pipelineJobId);
      triggerDownload(blob, filename);
      console.log('✅ SRT downloaded:', filename);
    } catch (error: any) {
      console.error('❌ SRT download failed:', error);
    }
  }, [pipelineJobId]);

  const handleDownloadVTT = useCallback(async () => {
    if (!pipelineJobId) {
      console.error('No pipeline job ID available');
      return;
    }
    
    try {
      console.log('📥 Downloading VTT for job:', pipelineJobId);
      const { blob, filename } = await downloadPipelineVTT(pipelineJobId);
      triggerDownload(blob, filename);
      console.log('✅ VTT downloaded:', filename);
    } catch (error: any) {
      console.error('❌ VTT download failed:', error);
    }
  }, [pipelineJobId]);

  const handleDownloadText = useCallback(async () => {
    if (!pipelineJobId) {
      console.error('No pipeline job ID available');
      return;
    }
    
    try {
      console.log('📥 Downloading text transcription for job:', pipelineJobId);
      const { blob, filename } = await downloadPipelineText(pipelineJobId);
      triggerDownload(blob, filename);
      console.log('✅ Text downloaded:', filename);
    } catch (error: any) {
      console.error('❌ Text download failed:', error);
    }
  }, [pipelineJobId]);

  const handleCaptionsReady = (captionsData: Caption[]) => {
    console.log('🪄 Moving to export step with captions:', captionsData.length);
    setCaptions(captionsData);
    setCompletedSteps(['upload', 'transcribe', 'edit']);
    setCurrentStep('export');
    // Clear the saved job from localStorage since we're done with transcription
    localStorage.removeItem('currentPipelineJob');
  };

  const getCurrentStepInfo = () => MAGICAL_STEPS.find(step => step.id === currentStep);
  const stepInfo = getCurrentStepInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
      
      {/* Magical Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating magical particles */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-300 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-pink-300 rounded-full opacity-80 animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-3 h-3 bg-cyan-300 rounded-full opacity-60" style={{animation: 'float 6s ease-in-out infinite'}}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-green-300 rounded-full opacity-90 animate-ping"></div>
        <div className="absolute bottom-1/3 right-10 w-2 h-2 bg-purple-300 rounded-full opacity-50" style={{animation: 'float 4s ease-in-out infinite reverse'}}></div>
        
        {/* Mystical aurora effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/30 backdrop-blur-md border-b border-purple-500/30 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3">
              🔮 CapEdify Enchanted
            </h1>
            <p className="text-purple-200 text-lg font-medium mb-2">
              ✨ Mystical AI Caption Sorcery ✨
            </p>
            <p className="text-purple-300 text-sm">
              Transform your videos with magical AI transcription and enchanted exports
            </p>
            
            {/* Current step indicator */}
            {stepInfo && (
              <div className="mt-4 px-6 py-3 bg-purple-900/50 backdrop-blur-sm rounded-full inline-flex items-center space-x-3 border border-purple-500/30">
                <span className="text-2xl animate-pulse">{stepInfo.icon}</span>
                <div className="text-left">
                  <div className="text-purple-200 font-semibold text-sm">{stepInfo.label}</div>
                  <div className="text-purple-400 text-xs">{stepInfo.magicalText}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="relative z-10 max-w-4xl mx-auto pt-8 px-4">
        <div className="flex justify-center items-center space-x-8 mb-8">
          {MAGICAL_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isUpcoming = !isCompleted && !isCurrent;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-3">
                  <div
                    className={`
                      flex justify-center items-center rounded-full w-16 h-16 text-2xl
                      transition-all duration-500 relative
                      ${isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 scale-110' : ''}
                      ${isCurrent ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 scale-110 animate-pulse' : ''}
                      ${isUpcoming ? 'bg-gray-700/50 backdrop-blur-sm border border-gray-600' : ''}
                    `}
                  >
                    {isCompleted ? '✅' : step.icon}
                    
                    {/* Magical sparkles for current step */}
                    {isCurrent && (
                      <>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      </>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <span
                      className={`
                        font-semibold text-sm transition-colors duration-300
                        ${isCompleted ? 'text-green-400' : ''}
                        ${isCurrent ? 'text-purple-300' : ''}
                        ${isUpcoming ? 'text-gray-400' : ''}
                      `}
                    >
                      {step.label}
                    </span>
                    <div className={`text-xs mt-1 ${isCurrent ? 'text-purple-400' : 'text-gray-500'}`}>
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {/* Connection line */}
                {index < MAGICAL_STEPS.length - 1 && (
                  <div
                    className={`
                      w-20 h-1 rounded-full transition-all duration-500
                      ${completedSteps.includes(MAGICAL_STEPS[index + 1].id) 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm shadow-green-500/30' 
                        : 'bg-gray-600/30'
                      }
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto p-6">
        <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden">
          
          {/* Step Content */}
          <div className="p-8">
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-purple-200 mb-3">🔮 Summon Your Media</h2>
                  <p className="text-purple-300">Upload your video file to begin the magical transcription process</p>
                </div>
                
                <div className="magical-upload-wrapper">
                  <VideoUpload onVideoUploaded={handleVideoUploaded} />
                </div>
              </div>
            )}

            {currentStep === 'transcribe' && uploadedVideo && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-purple-200 mb-3">✨ Divine the Words</h2>
                  <p className="text-purple-300">Our AI spirits are casting magical spells on your video</p>
                </div>
                
                <div className="magical-transcription-wrapper">
                  {isProcessing ? (
                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
                      <div className="text-center space-y-6">
                        <div className="flex justify-center">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">
                              ✨
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-purple-200">
                            Agent Pipeline Active
                          </h3>
                          <p className="text-purple-300">{processingMessage}</p>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                              style={{ width: `${processingProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-purple-400">{processingProgress}% complete</p>
                        </div>
                        
                        {/* Agent stages */}
                        <div className="grid grid-cols-4 gap-4 mt-6">
                          <div className={`p-3 rounded-lg text-center ${processingProgress >= 25 ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/30 text-gray-400'}`}>
                            <div className="text-lg">💳</div>
                            <div className="text-xs">Credits</div>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${processingProgress >= 50 ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/30 text-gray-400'}`}>
                            <div className="text-lg">✂️</div>
                            <div className="text-xs">Split</div>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${processingProgress >= 75 ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/30 text-gray-400'}`}>
                            <div className="text-lg">📝</div>
                            <div className="text-xs">Format</div>
                          </div>
                          <div className={`p-3 rounded-lg text-center ${processingProgress >= 100 ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/30 text-gray-400'}`}>
                            <div className="text-lg">🏗️</div>
                            <div className="text-xs">JSX</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-purple-300">
                      <p>Upload a video to start the magical transcription process</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'edit' && transcriptionId && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-purple-200 mb-3">📜 Enchant Your Text</h2>
                  <p className="text-purple-300">Perfect your captions with magical editing tools</p>
                  
                  {/* Transcription Statistics */}
                  {transcriptionStats && (
                    <div className="mt-6 bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-200 mb-4">✨ Transcription Statistics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-900/30 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-300">{transcriptionStats.words.toLocaleString()}</div>
                          <div className="text-sm text-purple-300">Words</div>
                        </div>
                        <div className="bg-purple-900/30 rounded-lg p-4">
                          <div className="text-2xl font-bold text-cyan-300">{transcriptionStats.characters.toLocaleString()}</div>
                          <div className="text-sm text-purple-300">Characters</div>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-purple-400">
                        📊 Your mystical transcription has been processed with {captions.length} scenes
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Simple Transcription Display */}
                <div className="magical-transcription-display">
                  {captions.length > 0 ? (
                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-200 mb-4">
                        📜 Your Transcription
                      </h3>
                      <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <textarea
                          className="w-full h-80 bg-transparent text-purple-100 text-sm leading-relaxed resize-none border-none outline-none"
                          value={captions[0]?.text || ''}
                          readOnly
                          placeholder="Transcription will appear here..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30 text-center">
                      <div className="text-4xl mb-4">🔮</div>
                      <p className="text-purple-300">Loading transcription...</p>
                    </div>
                  )}
                </div>
                
                <div className="text-center pt-4">
                  <button
                    onClick={() => handleCaptionsReady(captions)}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 
                             text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 
                             transform hover:scale-105 transition-all duration-300"
                  >
                    🪄 Ready to Cast Export Spells
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'export' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-purple-200 mb-3">🪄 Cast Your Export Spells</h2>
                  <p className="text-purple-300">Your magical JSX export is ready for After Effects!</p>
                </div>
                
                <div className="magical-export-wrapper">
                  {jsxDownloadReady ? (
                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-green-500/30 text-center space-y-6">
                      <div className="text-6xl animate-bounce">🎉</div>
                      
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-green-300">
                          ✨ Magic Complete! ✨
                        </h3>
                        <p className="text-purple-300">
                          Your video has been processed by the AgentOrchestrator pipeline
                        </p>
                        
                        {pipelineStatus?.result && (
                          <div className="bg-purple-900/30 rounded-lg p-4 space-y-2">
                            <p className="text-sm text-purple-200">
                              📊 <strong>{pipelineStatus.result.sceneCount}</strong> scenes created
                            </p>
                            <p className="text-sm text-purple-200">
                              💎 <strong>{pipelineStatus.result.creditInfo.estimatedCreditsUsed}</strong> credits used
                            </p>
                            <p className="text-sm text-purple-200">
                              ⚡ Processed in <strong>{pipelineStatus.result.metadata.processing?.totalTime || 'N/A'}ms</strong>
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* JSX Export Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-purple-200">🎬 After Effects JSX Exports</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <button
                            onClick={() => handleDownloadJSXStyled('bold')}
                            className="p-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-yellow-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">💥</div>
                            <div className="text-sm">Bold Style</div>
                          </button>
                          
                          <button
                            onClick={() => handleDownloadJSXStyled('modern')}
                            className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">✨</div>
                            <div className="text-sm">Modern Style</div>
                          </button>
                          
                          <button
                            onClick={() => handleDownloadJSXStyled('minimal')}
                            className="p-4 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-500 hover:to-slate-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-gray-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">📐</div>
                            <div className="text-sm">Simple Style</div>
                          </button>
                        </div>
                        <div className="text-xs text-purple-400 text-center">
                          🎬 Import JSX files into After Effects • 📐 Optimized for 1920×1080 • ⏱️ Perfect sync
                        </div>
                      </div>

                      {/* Subtitle Export Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-purple-200">📝 Subtitle & Text Exports</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <button
                            onClick={handleDownloadSRT}
                            className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">📄</div>
                            <div className="text-sm">SRT Format</div>
                          </button>
                          
                          <button
                            onClick={handleDownloadVTT}
                            className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">🔗</div>
                            <div className="text-sm">VTT Format</div>
                          </button>
                          
                          <button
                            onClick={handleDownloadText}
                            className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 
                                     text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 
                                     transform hover:scale-105 transition-all duration-300"
                          >
                            <div className="text-2xl mb-2">📜</div>
                            <div className="text-sm">Plain Text</div>
                          </button>
                        </div>
                        <div className="text-xs text-purple-400 text-center">
                          📄 SRT for video editors • 🔗 VTT for web players • 📜 TXT for transcription
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30 text-center">
                      <div className="text-4xl mb-4">🔮</div>
                      <h3 className="text-xl font-semibold text-purple-200 mb-2">
                        Processing Your Video...
                      </h3>
                      <p className="text-purple-300">
                        The magical agents are working their spells. This will complete soon!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Magical Footer */}
      <footer className="relative z-10 text-center py-8 text-purple-400 text-sm">
        <p className="mb-2">✨ Powered by AgentOrchestrator Pipeline & Claude AI Magic ✨</p>
        <p className="text-purple-500">🔮 4-Agent System: Credit → Split → Format → JSX 🔮</p>
        {pipelineStatus?.result && (
          <p className="text-purple-600 mt-2">
            🏗️ Last export: {pipelineStatus.result.sceneCount} scenes
            {pipelineStatus.result.metadata?.processing?.totalTime && 
              ` in ${pipelineStatus.result.metadata.processing.totalTime}ms`}
          </p>
        )}
      </footer>

      {/* Custom magical animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .magical-transcription-wrapper {
          position: relative;
        }
        
        .magical-transcription-wrapper::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: linear-gradient(45deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
          border-radius: 1rem;
          z-index: -1;
          animation: float 3s ease-in-out infinite;
        }
        
        .magical-upload-wrapper {
          position: relative;
        }
        
        .magical-upload-wrapper::before {
          content: '';
          position: absolute;
          top: -15px;
          left: -15px;
          right: -15px;
          bottom: -15px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15));
          border-radius: 1.5rem;
          z-index: -1;
          animation: float 4s ease-in-out infinite reverse;
        }
        
        .magical-editor-wrapper {
          position: relative;
        }
        
        .magical-editor-wrapper::before {
          content: '';
          position: absolute;
          top: -12px;
          left: -12px;
          right: -12px;
          bottom: -12px;
          background: linear-gradient(225deg, rgba(236, 72, 153, 0.12), rgba(139, 92, 246, 0.12));
          border-radius: 1.25rem;
          z-index: -1;
          animation: float 5s ease-in-out infinite;
        }
        
        .magical-export-wrapper {
          position: relative;
        }
        
        .magical-export-wrapper::before {
          content: '';
          position: absolute;
          top: -18px;
          left: -18px;
          right: -18px;
          bottom: -18px;
          background: linear-gradient(315deg, rgba(34, 197, 94, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
          border-radius: 1.75rem;
          z-index: -1;
          animation: float 6s ease-in-out infinite reverse;
        }
      `}</style>
    </div>
  );
}

export default App;