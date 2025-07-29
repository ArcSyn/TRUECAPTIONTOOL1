import React, { useState } from 'react';
import './App.css';
import { TranscriptionProgress } from './components/TranscriptionProgress';
import { VideoUpload } from './components/VideoUpload';
import { CaptionEditor } from './components/CaptionEditor';
import { ExportOptions } from './components/ExportOptions';

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

  const handleVideoUploaded = (video: VideoFile) => {
    setUploadedVideo(video);
    setProjectName(video.name.replace(/\.[^/.]+$/, '')); // Remove extension
    
    // Mark upload as complete and move to transcription
    setCompletedSteps(['upload']);
    setCurrentStep('transcribe');
  };

  const handleTranscriptionComplete = (id: string) => {
    setTranscriptionId(id);
    
    // Mark transcription as complete and move to editing
    setCompletedSteps(['upload', 'transcribe']);
    setCurrentStep('edit');
  };

  const handleCaptionsReady = (newCaptions: Caption[]) => {
    setCaptions(newCaptions);
    
    // Mark editing as complete and move to export
    setCompletedSteps(['upload', 'transcribe', 'edit']);
    setCurrentStep('export');
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
                  <p className="text-purple-300">Our AI spirits are listening to your video and transcribing every word</p>
                </div>
                
                <div className="magical-transcription-wrapper">
                  <TranscriptionProgress 
                    videoId={uploadedVideo.id || 'temp-id'} 
                    onTranscriptionComplete={handleTranscriptionComplete}
                  />
                </div>
              </div>
            )}

            {currentStep === 'edit' && transcriptionId && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-purple-200 mb-3">📜 Enchant Your Text</h2>
                  <p className="text-purple-300">Perfect your captions with magical editing tools</p>
                </div>
                
                <div className="magical-editor-wrapper">
                  <CaptionEditor 
                    captions={captions}
                    onCaptionsChange={setCaptions}
                    projectId={transcriptionId}
                  />
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
                  <p className="text-purple-300">Transform your captions into powerful formats: JSX, SRT, VTT, and more!</p>
                </div>
                
                <div className="magical-export-wrapper">
                  <ExportOptions 
                    captions={captions}
                    projectName={projectName}
                    transcriptionId={transcriptionId}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Magical Footer */}
      <footer className="relative z-10 text-center py-8 text-purple-400 text-sm">
        <p className="mb-2">✨ Powered by AI Magic & Enhanced Line-Breaking Enchantments ✨</p>
        <p className="text-purple-500">🔮 Every caption perfectly sized for video display 🔮</p>
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