import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { VideoFile } from '@/types';
import { cn } from '@/lib/utils';
import { FileVideo, Users, ArrowLeft, Package, Play, RotateCcw, Upload, CheckCircle, Loader2 } from 'lucide-react';

// Import components directly to avoid HMR issues
import { VideoUpload } from './VideoUpload';
import { BatchProcessingProgress } from './BatchProcessingProgress';  
import { PipelineProgress } from './PipelineProgress';
import { SimpleExportDemo } from './SimpleExportDemo';


export function BatchProcessingDemo() {
  const [singleVideo, setSingleVideo] = useState<VideoFile | null>(null);
  const [multipleVideos, setMultipleVideos] = useState<VideoFile[]>([]);
  const [singleJobId, setSingleJobId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<'upload' | 'processing'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleSingleVideo = (video: VideoFile) => {
    setSingleVideo(video);
    addLog(`📄 Single video selected: ${video.name} (${(video.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const handleMultipleVideos = (videos: VideoFile[]) => {
    setMultipleVideos(videos);
    addLog(`📁 Multiple videos selected: ${videos.length} files`);
    videos.forEach(video => {
      addLog(`  - ${video.name} (${(video.size / (1024 * 1024)).toFixed(2)} MB)`);
    });
  };

  const startSingleProcessing = async () => {
    if (!singleVideo) return;
    
    setIsProcessing(true);
    setProcessingMode('processing');
    addLog(`🚀 Starting pipeline for: ${singleVideo.name}`);
    
    try {
      const formData = new FormData();
      formData.append('video', singleVideo.file);
      formData.append('projectName', singleVideo.name.replace(/\.[^/.]+$/, ''));
      formData.append('inputType', 'video');
      formData.append('userTier', 'free');

      const response = await fetch('http://localhost:4000/api/pipeline/run', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSingleJobId(result.jobId);
        addLog(`✅ Pipeline started with job ID: ${result.jobId}`);
        addLog(`⏱️ Estimated duration: ${result.estimatedDuration || 'Unknown'}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Pipeline failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      addLog(`❌ Failed to start pipeline: ${error.message}`);
      setProcessingMode('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const startBatchProcessing = async () => {
    if (multipleVideos.length === 0) return;
    
    setIsProcessing(true);
    setProcessingMode('processing');
    addLog(`🔄 Starting batch processing for ${multipleVideos.length} videos`);
    
    try {
      // Create FormData for multi-file upload
      const formData = new FormData();
      
      // Add all video files
      multipleVideos.forEach((video) => {
        formData.append('videos', video.file);
      });
      
      // Add batch options
      formData.append('userTier', 'free');
      formData.append('style', 'modern');
      formData.append('position', 'bottom');
      formData.append('outputFormats', 'srt,vtt,jsx,json,txt');
      formData.append('projectName', 'Batch_Processing');

      const response = await fetch('http://localhost:4000/api/batch/process', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setBatchId(result.batchId);
        addLog(`✅ Batch started with ID: ${result.batchId}`);
        addLog(`📊 Total jobs: ${result.totalJobs}`);
        addLog(`⏱️ Estimated duration: ${result.estimatedDuration}`);
        
        // The BatchProcessingProgress component will handle the actual progress tracking
      } else {
        const errorText = await response.text();
        throw new Error(`Batch processing failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      addLog(`❌ Failed to start batch processing: ${error.message}`);
      setProcessingMode('upload');
      setIsProcessing(false);
    }
  };

  const resetDemo = () => {
    setSingleVideo(null);
    setMultipleVideos([]);
    setSingleJobId(null);
    setBatchId(null);
    setProcessingMode('upload');
    setIsProcessing(false);
    setLogs([]);
    addLog('🔄 System reset - ready for new uploads');
  };

  // Built-in video upload component
  const DirectVideoUpload = ({ onVideoUploaded, onVideosUploaded, allowMultiple }: any) => (
    <Card className="p-6 border-2 border-dashed border-gray-300 text-center hover:border-blue-400 transition-colors">
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {allowMultiple ? 'Upload Multiple Videos' : 'Upload Single Video'}
      </h3>
      <p className="text-gray-600 mb-4">
        Drag and drop video files here, or click to browse
      </p>
      <input
        type="file"
        accept="video/*"
        multiple={allowMultiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;
          
          const videoFiles = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
            duration: 0,
            size: file.size,
            name: file.name,
            id: Math.random().toString(36).substr(2, 9)
          }));

          if (allowMultiple && onVideosUploaded) {
            onVideosUploaded(videoFiles);
          } else if (onVideoUploaded) {
            onVideoUploaded(videoFiles[0]);
          }
        }}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
    </Card>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm p-6 border-white/50">
          <div className="flex justify-between items-center">
            <Link 
              to="/"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Main App</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900">
              CapEdify Batch Processing
            </h1>
            
            <Button 
              onClick={resetDemo}
              variant="outline" 
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Processing Area */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/50">
                <TabsTrigger value="single">
                  <FileVideo className="w-4 h-4 mr-2" />
                  Single Video
                </TabsTrigger>
                <TabsTrigger value="batch">
                  <Users className="w-4 h-4 mr-2" />
                  Batch Processing  
                </TabsTrigger>
                <TabsTrigger value="export">
                  <Package className="w-4 h-4 mr-2" />
                  Export System
                </TabsTrigger>
              </TabsList>

                <TabsContent value="single" className="space-y-4">
                  <Card className="bg-white/80 backdrop-blur-sm p-6">
                    <h2 className="text-xl font-semibold mb-4">Single Video Processing</h2>
                    
                    {processingMode === 'processing' && singleJobId ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <h3 className="font-medium text-blue-900">Currently Processing: {singleVideo?.name}</h3>
                          <p className="text-blue-700 text-sm">Job ID: {singleJobId}</p>
                        </div>
                        <PipelineProgress 
                          jobId={singleJobId}
                          onComplete={(job: any) => {
                            addLog(`✅ Processing completed: ${job.jobId}`);
                            setProcessingMode('upload');
                          }}
                          onError={(error: any) => addLog(`❌ Processing failed: ${error.message}`)}
                        />
                      </div>
                    ) : (
                      <>
                        <VideoUpload 
                          onVideoUploaded={handleSingleVideo}
                          allowMultiple={false}
                        />
                        
                        {singleVideo && (
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-blue-900">Ready: {singleVideo.name}</h3>
                                <p className="text-blue-700 text-sm">
                                  {(singleVideo.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                              <Button 
                                onClick={startSingleProcessing}
                                disabled={isProcessing}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                {isProcessing ? 'Starting...' : 'Process Now'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="batch" className="space-y-4">
                  <Card className="bg-white/80 backdrop-blur-sm p-6">
                    <h2 className="text-xl font-semibold mb-4">Batch Processing</h2>
                    
                    {processingMode === 'processing' && multipleVideos.length > 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <h3 className="font-medium text-green-900">Currently Processing: {multipleVideos.length} Videos</h3>
                          <p className="text-green-700 text-sm">Batch processing in progress...</p>
                        </div>
                        <BatchProcessingProgress 
                          videos={multipleVideos}
                          batchId={batchId}
                          options={{
                            style: 'modern',
                            position: 'bottom',
                            userTier: 'free'
                          }}
                          onComplete={(results: any) => {
                            addLog(`✅ Batch completed: ${results.length} jobs`);
                            setProcessingMode('upload');
                          }}
                          onError={(error: any) => addLog(`❌ Batch error: ${error.message}`)}
                        />
                      </div>
                    ) : (
                      <>
                        <VideoUpload 
                          onVideoUploaded={handleSingleVideo}
                          onVideosUploaded={handleMultipleVideos}
                          allowMultiple={true}
                        />
                        
                        {multipleVideos.length > 0 && (
                          <div className="mt-6 p-4 bg-green-50 rounded-lg">
                            <h3 className="font-medium text-green-900 mb-3">
                              {multipleVideos.length} Videos Ready
                            </h3>
                            <div className="space-y-2 mb-4">
                              {multipleVideos.map((video, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-green-700">{video.name}</span>
                                  <span className="text-green-600">
                                    {(video.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </div>
                              ))}
                            </div>
                            <Button 
                              onClick={startBatchProcessing}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Batch Processing
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="export" className="space-y-4">
                  <SimpleExportDemo />
                </TabsContent>
              </Tabs>
          </div>

          {/* Status Sidebar */}
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Backend: Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Export: Ready</span>
                </div>
                <div className="flex items-center space-x-2">
                  {processingMode === 'processing' ? (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span>
                    Processing: {processingMode === 'processing' ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>
              
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Activity Log</h3>
              <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Upload a video to start...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="text-gray-700 break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}