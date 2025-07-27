import React, { useState } from 'react';
import './styles/theme.css';

interface TranscriptionResult {
  text: string;
  segments: any[];
  language: string;
}

function App() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'transcribe' | 'edit' | 'export'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const uploadAndTranscribe = async () => {
    if (!file) return;

    setUploading(true);
    setCurrentStep('transcribe');
    setStatus('Uploading video...');

    try {
      // Upload video
      const formData = new FormData();
      formData.append('video', file);

      const uploadResponse = await fetch('http://localhost:4000/api/videos/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      setStatus('Starting transcription...');

      // Start transcription
      const transcribeResponse = await fetch('http://localhost:4000/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: uploadResult.video.id,
          transcriptionId: uploadResult.transcription.id,
          model: 'whisper-large-v3'
        })
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed to start');
      }

      setTranscriptionId(uploadResult.transcription.id);
      setStatus('Transcription in progress...');
      pollTranscription(uploadResult.transcription.id);

    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploading(false);
    }
  };

  const pollTranscription = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/transcribe/${id}`);
      const result = await response.json();

      if (result.success) {
        const transcription = result.transcription;
        
        // Update progress and status
        setProgress(transcription.progress || 0);
        
        // Show fun message if available, otherwise show technical status
        if (transcription.status_message) {
          setStatus(transcription.status_message);
        } else {
          setStatus(`Status: ${transcription.status}`);
        }

        if (transcription.status === 'completed') {
          setStatus('🏆 VICTORY! All audio invaders defeated!');
          setProgress(100);
          setUploading(false);
          setTranscriptionResult(transcription.result);
          setEditedText(transcription.result.text);
          setCurrentStep('edit');
        } else if (transcription.status === 'error') {
          setStatus(`💥 GAME OVER: ${transcription.error}`);
          setProgress(0);
          setUploading(false);
        } else {
          // Keep polling
          setTimeout(() => pollTranscription(id), 2000);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      setStatus('❌ Failed to check transcription status');
      setUploading(false);
    }
  };

  const exportSRT = () => {
    if (!transcriptionResult) return;
    
    // Simple SRT export (could be enhanced with proper timing)
    const srtContent = `1\n00:00:00,000 --> 00:00:10,000\n${editedText}\n\n`;
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name || 'transcription'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportVTT = () => {
    if (!transcriptionResult) return;
    
    // Simple VTT export
    const vttContent = `WEBVTT\n\n1\n00:00:00.000 --> 00:00:10.000\n${editedText}\n\n`;
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name || 'transcription'}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTXT = () => {
    if (!editedText) return;
    
    const blob = new Blob([editedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name || 'transcription'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSX = async (style: string = 'modern') => {
    if (!transcriptionId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/api/export/jsx/enhanced?id=${transcriptionId}&style=${style}&scene_detection=false`);
      
      if (!response.ok) {
        throw new Error('Failed to export JSX');
      }
      
      const jsxContent = await response.text();
      const blob = new Blob([jsxContent], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `captions_${style}_${Date.now()}.jsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSX export error:', error);
      alert('Failed to export JSX file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-green-900">
      {/* Header */}
      <header className="bg-black shadow-lg border-b-2 border-green-500">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-400 font-mono tracking-wider">👾 CAPEDIFY</h1>
              <p className="text-sm text-green-300 font-mono">RETRO CAPTION ARCADE</p>
            </div>
            
            {/* Step Indicator */}
            <div className="hidden md:flex space-x-8">
              {[
                { key: 'upload', label: 'LOAD', icon: '🚀' },
                { key: 'transcribe', label: 'BATTLE', icon: '👾' },
                { key: 'edit', label: 'UPGRADE', icon: '⚡' },
                { key: 'export', label: 'VICTORY', icon: '🏆' }
              ].map((step) => (
                <div key={step.key} className={`flex items-center space-x-2 font-mono ${
                  currentStep === step.key ? 'text-green-400 font-bold animate-pulse' : 
                  ['upload', 'transcribe', 'edit'].indexOf(currentStep) > ['upload', 'transcribe', 'edit'].indexOf(step.key) ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <span className="text-lg animate-bounce">{step.icon}</span>
                  <span className="text-sm tracking-wider">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl p-8 border-2 border-green-500 text-white">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border-4 border-green-400">
                <span className="text-3xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2 font-mono tracking-wider">MISSION BRIEFING</h2>
              <p className="text-green-300 mb-6 font-mono">Select video file to initiate caption invasion protocol</p>
              
              <div className="border-2 border-dashed border-green-500 rounded-lg p-8 hover:border-green-400 transition-all bg-black/50">
                <div className="mb-4 text-green-400 font-mono text-sm">
                  ▲ ▲ ▲ UPLOAD ZONE ▲ ▲ ▲
                </div>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="block mx-auto mb-4 text-green-300 file:bg-green-600 file:text-black file:border-0 file:rounded file:px-4 file:py-2 file:font-mono file:font-bold hover:file:bg-green-500"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                
                {file && (
                  <div className="mt-6 p-4 bg-green-900/50 rounded-lg border border-green-600">
                    <p className="text-sm text-green-300 mb-2 font-mono">🎯 TARGET: {file.name}</p>
                    <p className="text-xs text-green-400 mb-4 font-mono">SIZE: {(file.size / (1024*1024)).toFixed(1)} MB</p>
                    <button 
                      onClick={uploadAndTranscribe}
                      disabled={uploading}
                      className="w-full py-3 px-6 bg-green-600 text-black font-bold rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-mono tracking-wider border-2 border-green-400"
                    >
                      {uploading ? '🚀 LAUNCHING MISSION...' : '👾 START INVASION'}
                    </button>
                  </div>
                )}
                
                {/* ASCII decoration */}
                <div className="mt-4 text-green-500 text-xs font-mono">
                  ████████████████████████████
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcribe Step */}
        {currentStep === 'transcribe' && (
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-lg p-8 text-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-2xl">👾</span>
              </div>
              <h2 className="text-xl font-semibold text-green-400 mb-2">🚀 CAPTION INVASION INITIATED</h2>
              <p className="text-green-300 mb-6">AI forces are converting your audio to text...</p>
              
              <div className="bg-black rounded-lg p-6 border-2 border-green-500">
                {/* Space Invaders Style Progress Bar */}
                <div className="relative w-full h-8 bg-gray-800 rounded-full mb-4 overflow-hidden border border-green-400">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-600 via-green-400 to-yellow-400 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Animated scanning effect */}
                    <div className="absolute right-0 top-0 w-4 h-full bg-white opacity-50 animate-pulse"></div>
                  </div>
                  
                  {/* Space Invaders characters moving across */}
                  <div className="absolute top-1 left-2 text-xs animate-bounce">👾</div>
                  <div className="absolute top-1 right-12 text-xs animate-pulse">🛸</div>
                </div>
                
                {/* Retro-style status text */}
                <div className="font-mono text-center">
                  <p className="text-green-400 text-sm font-bold tracking-wider animate-pulse">{status || 'PREPARING BATTLE STATIONS...'}</p>
                  <div className="mt-2 text-xs text-green-300">
                    <span className="animate-pulse">▼ ▼ ▼ PROGRESS: {progress}% ▼ ▼ ▼</span>
                  </div>
                </div>
                
                {/* ASCII-style border */}
                <div className="mt-4 text-green-500 text-xs font-mono text-center">
                  ████████████████████████████
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Step */}
        {currentStep === 'edit' && transcriptionResult && (
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl p-8 border-2 border-green-500 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-green-400 font-mono tracking-wider">⚡ UPGRADE STATION</h2>
                <p className="text-green-300 font-mono">Fine-tune your captured text before final deployment</p>
              </div>
              <button 
                onClick={() => setCurrentStep('export')}
                className="px-6 py-3 bg-green-600 text-black font-bold rounded-lg hover:bg-green-500 transition-all font-mono tracking-wider border-2 border-green-400 animate-pulse"
              >
                🏆 DEPLOY →
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 font-mono tracking-wider">
                  👾 CAPTURED TEXT DATA
                </label>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-64 p-4 bg-black border-2 border-green-600 rounded-lg focus:border-green-400 text-green-300 font-mono resize-none"
                  placeholder="Your decoded audio transmissions will appear here..."
                />
              </div>
              
              <div className="flex justify-between items-center text-sm text-green-400 font-mono">
                <span>📊 CHARS: {editedText.length}</span>
                <span>📈 WORDS: {editedText.split(/\s+/).filter(w => w.length > 0).length}</span>
              </div>
              
              {/* ASCII decoration */}
              <div className="text-green-500 text-xs font-mono text-center">
                ▼ ▼ ▼ TEXT PROCESSING COMPLETE ▼ ▼ ▼
              </div>
            </div>
          </div>
        )}

        {/* Export Step */}
        {currentStep === 'export' && (
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-2xl p-8 border-2 border-green-500 text-white">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce border-4 border-green-400">
                <span className="text-3xl">🏆</span>
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2 font-mono tracking-wider">🎉 MISSION ACCOMPLISHED</h2>
              <p className="text-green-300 font-mono">Select your victory format and claim your prize</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* After Effects JSX - Featured */}
              <div className="border-2 border-green-400 rounded-lg p-6 hover:shadow-2xl transition-all bg-green-900/50 hover:bg-green-800/50">
                <h3 className="text-lg font-bold text-green-400 mb-2 font-mono">🎭 AFTER EFFECTS (.jsx)</h3>
                <p className="text-green-300 text-sm mb-4 font-mono">Pro-grade caption scripts for Adobe AE</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => exportJSX('modern')}
                    className="w-full py-2 px-4 bg-green-600 text-black font-bold rounded-lg hover:bg-green-500 transition-all text-sm font-mono border border-green-400"
                  >
                    🎯 MODERN STYLE
                  </button>
                  <button 
                    onClick={() => exportJSX('minimal')}
                    className="w-full py-2 px-4 bg-gray-700 text-green-400 font-bold rounded-lg hover:bg-gray-600 transition-all text-sm font-mono border border-gray-500"
                  >
                    ⚡ MINIMAL STYLE
                  </button>
                  <button 
                    onClick={() => exportJSX('bold')}
                    className="w-full py-2 px-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all text-sm font-mono border border-yellow-400"
                  >
                    💥 BOLD STYLE
                  </button>
                </div>
              </div>
              
              <div className="border-2 border-green-600 rounded-lg p-6 hover:shadow-2xl transition-all bg-black/50">
                <h3 className="text-lg font-bold text-green-400 mb-2 font-mono">🎬 SUBTITLE (.srt)</h3>
                <p className="text-green-300 text-sm mb-4 font-mono">Universal format for video players</p>
                <button 
                  onClick={exportSRT}
                  className="w-full py-2 px-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-all font-mono border border-purple-400"
                >
                  📥 DOWNLOAD SRT
                </button>
              </div>
              
              <div className="border-2 border-green-600 rounded-lg p-6 hover:shadow-2xl transition-all bg-black/50">
                <h3 className="text-lg font-bold text-green-400 mb-2 font-mono">🌐 WEBVTT (.vtt)</h3>
                <p className="text-green-300 text-sm mb-4 font-mono">Web video captions for HTML5</p>
                <button 
                  onClick={exportVTT}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all font-mono border border-blue-400"
                >
                  📥 DOWNLOAD VTT
                </button>
              </div>
            </div>
            
            <div className="mt-6 grid md:grid-cols-1 gap-6">
              <div className="border-2 border-green-600 rounded-lg p-6 hover:shadow-2xl transition-all bg-black/50">
                <h3 className="text-lg font-bold text-green-400 mb-2 font-mono">📄 TEXT FILE (.txt)</h3>
                <p className="text-green-300 text-sm mb-4 font-mono">Raw text data for basic operations</p>
                <button 
                  onClick={exportTXT}
                  className="w-full py-2 px-4 bg-cyan-600 text-black font-bold rounded-lg hover:bg-cyan-500 transition-all font-mono border border-cyan-400"
                >
                  📥 DOWNLOAD TXT
                </button>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t-2 border-green-600 text-center">
              <button 
                onClick={() => {
                  setCurrentStep('upload');
                  setFile(null);
                  setTranscriptionResult(null);
                  setEditedText('');
                  setStatus('');
                  setProgress(0);
                }}
                className="px-8 py-3 text-green-400 hover:text-green-300 transition-all font-mono font-bold tracking-wider border-2 border-green-600 rounded-lg hover:bg-green-900/30"
              >
                🔄 NEW MISSION
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

