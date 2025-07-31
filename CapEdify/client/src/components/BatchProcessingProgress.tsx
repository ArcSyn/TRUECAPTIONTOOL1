import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Download, Loader2, PlayCircle, PauseCircle, RefreshCw, FileVideo } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { VideoFile } from '@/types';
import { runPipeline, pollPipelineProgress, PipelineStatus } from '@/api/pipeline';

interface BatchJob {
  id: string;
  videoFile: VideoFile;
  jobId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  progressMessage: string;
  error?: string;
  downloadUrl?: string;
  startedAt?: string;
  completedAt?: string;
}

interface BatchProcessingProgressProps {
  videos: VideoFile[];
  batchId?: string | null;
  options?: {
    style?: string;
    position?: string;
    userTier?: string;
  };
  onComplete?: (results: BatchJob[]) => void;
  onError?: (error: any) => void;
}

export function BatchProcessingProgress({ 
  videos, 
  batchId,
  options = {}, 
  onComplete, 
  onError 
}: BatchProcessingProgressProps) {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [concurrentLimit] = useState(2); // Process 2 videos at a time
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const { toast } = useToast();

  // Initialize batch jobs from videos
  useEffect(() => {
    const jobs: BatchJob[] = videos.map((video, index) => ({
      id: `batch-${Date.now()}-${index}`,
      videoFile: video,
      status: 'pending',
      progress: 0,
      progressMessage: 'Waiting to start...',
    }));
    setBatchJobs(jobs);
  }, [videos]);

  // Start polling when batchId is provided
  useEffect(() => {
    if (batchId && batchId !== null) {
      setIsProcessing(true);
      pollBatchStatus(batchId);
    }
  }, [batchId]);

  // Calculate overall progress
  const overallProgress = batchJobs.length > 0 
    ? Math.round(batchJobs.reduce((sum, job) => sum + job.progress, 0) / batchJobs.length)
    : 0;

  const processingJobs = batchJobs.filter(job => job.status === 'processing').length;
  const pendingJobs = batchJobs.filter(job => job.status === 'pending').length;

  // Poll batch status from the API
  const pollBatchStatus = async (batchId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/batch/status/${batchId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get batch status: ${response.status}`);
      }
      
      const batchStatus = await response.json();
      
      // Update jobs based on batch status
      if (batchStatus.success && batchStatus.jobs) {
        setBatchJobs(prev => prev.map((job, index) => {
          const serverJob = batchStatus.jobs.find((sj: any) => sj.filename === job.videoFile.name);
          if (serverJob) {
            return {
              ...job,
              jobId: serverJob.jobId,
              status: serverJob.status,
              progress: serverJob.progress || 0,
              progressMessage: serverJob.status === 'completed' ? 'Completed successfully!' :
                              serverJob.status === 'failed' ? 'Processing failed' :
                              serverJob.status === 'processing' ? 'Processing...' : 'Waiting...',
              error: serverJob.error,
              downloadUrl: serverJob.downloadUrl
            };
          }
          return job;
        }));
        
        // Update counters
        const completed = batchStatus.completedJobs || 0;
        const failed = batchStatus.failedJobs || 0;
        setCompletedCount(completed);
        setFailedCount(failed);
        
        // Continue polling if batch is still processing
        if (batchStatus.status === 'processing') {
          setTimeout(() => pollBatchStatus(batchId), 3000);
        } else {
          setIsProcessing(false);
          
          if (onComplete) {
            onComplete(batchJobs);
          }
          
          toast({
            title: 'Batch Processing Complete!',
            description: `${completed} successful, ${failed} failed out of ${batchStatus.totalJobs} videos.`,
          });
        }
      }
      
    } catch (error: any) {
      console.error('❌ Failed to poll batch status:', error);
      
      // Retry polling after delay
      setTimeout(() => pollBatchStatus(batchId), 5000);
    }
  };

  // Process jobs with concurrency limit
  const processNextJobs = async () => {
    if (isPaused) return;

    const pendingJobIndexes = batchJobs
      .map((job, index) => ({ job, index }))
      .filter(({ job }) => job.status === 'pending')
      .slice(0, concurrentLimit - processingJobs)
      .map(({ index }) => index);

    // Start processing available slots
    const promises = pendingJobIndexes.map(index => processJob(index));
    await Promise.allSettled(promises);

    // Check if batch is complete
    const allCompleted = batchJobs.every(job => job.status === 'completed' || job.status === 'failed');
    if (allCompleted && isProcessing) {
      setIsProcessing(false);
      
      if (onComplete) {
        onComplete(batchJobs);
      }
      
      toast({
        title: 'Batch Processing Complete!',
        description: `${completedCount} successful, ${failedCount} failed out of ${batchJobs.length} videos.`,
      });
    }
  };

  // Start batch processing
  const startBatch = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    setCompletedCount(0);
    setFailedCount(0);
    
    toast({
      title: 'Batch Processing Started',
      description: `Processing ${videos.length} videos with ${concurrentLimit} concurrent jobs.`,
    });

    processNextJobs();
  };

  // Pause/Resume batch processing
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      processNextJobs(); // Resume processing
    }
  };

  // Retry failed jobs
  const retryFailedJobs = () => {
    setBatchJobs(prev => prev.map(job => 
      job.status === 'failed' 
        ? { ...job, status: 'pending', progress: 0, progressMessage: 'Retry queued...', error: undefined }
        : job
    ));
    setFailedCount(0);
    
    if (!isProcessing) {
      startBatch();
    }
  };

  // Continue processing when jobs complete
  useEffect(() => {
    if (isProcessing && !isPaused && processingJobs < concurrentLimit && pendingJobs > 0) {
      processNextJobs();
    }
  }, [batchJobs, isProcessing, isPaused]);

  return (
    <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20 space-y-6")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between")}>
        <div>
          <h3 className={cn("font-semibold text-gray-900 text-lg")}>
            Batch Video Processing
          </h3>
          <p className={cn("text-gray-600 text-sm")}>
            {videos.length} videos • {completedCount} completed • {failedCount} failed
          </p>
        </div>
        
        <div className={cn("flex items-center space-x-2")}>
          {!isProcessing ? (
            <Button onClick={startBatch} className={cn("bg-blue-600 hover:bg-blue-700")}>
              <PlayCircle className={cn("w-4 h-4 mr-2")} />
              Start Batch
            </Button>
          ) : (
            <>
              <Button 
                onClick={togglePause} 
                variant="outline"
                className={cn(isPaused ? "bg-green-50 border-green-300 text-green-700" : "bg-orange-50 border-orange-300 text-orange-700")}
              >
                {isPaused ? (
                  <>
                    <PlayCircle className={cn("w-4 h-4 mr-2")} />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseCircle className={cn("w-4 h-4 mr-2")} />
                    Pause
                  </>
                )}
              </Button>
              
              {failedCount > 0 && (
                <Button onClick={retryFailedJobs} variant="outline" className={cn("text-red-700 border-red-300")}>
                  <RefreshCw className={cn("w-4 h-4 mr-2")} />
                  Retry Failed
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div className={cn("space-y-2")}>
        <div className={cn("flex justify-between items-center")}>
          <span className={cn("text-sm font-medium text-gray-700")}>
            Overall Progress
          </span>
          <span className={cn("text-sm text-gray-600")}>
            {overallProgress}%
          </span>
        </div>
        <Progress value={overallProgress} className={cn("h-3")} />
        <div className={cn("flex justify-between text-sm text-gray-600")}>
          <span>Processing: {processingJobs}</span>  
          <span>Pending: {pendingJobs}</span>
          <span>Completed: {completedCount}</span>
          <span>Failed: {failedCount}</span>
        </div>
      </div>

      {/* Individual Job Progress */}
      <div className={cn("space-y-3")}>
        <h4 className={cn("font-medium text-gray-800")}>Individual Progress</h4>
        
        <div className={cn("space-y-2 max-h-96 overflow-y-auto")}>
          {batchJobs.map((job, index) => (
            <div
              key={job.id}
              className={cn("flex items-center space-x-3 p-3 rounded-lg border", {
                'bg-green-50 border-green-200': job.status === 'completed',
                'bg-blue-50 border-blue-200': job.status === 'processing',
                'bg-red-50 border-red-200': job.status === 'failed',
                'bg-gray-50 border-gray-200': job.status === 'pending'
              })}
            >
              <div className={cn("flex-shrink-0")}>
                <FileVideo className={cn("w-5 h-5", {
                  'text-green-500': job.status === 'completed',
                  'text-blue-500': job.status === 'processing',
                  'text-red-500': job.status === 'failed',
                  'text-gray-400': job.status === 'pending'
                })} />
              </div>
              
              <div className={cn("flex-1 min-w-0")}>
                <div className={cn("font-medium text-sm truncate", {
                  'text-green-700': job.status === 'completed',
                  'text-blue-700': job.status === 'processing',
                  'text-red-700': job.status === 'failed',
                  'text-gray-600': job.status === 'pending'
                })}>
                  {job.videoFile.name}
                </div>
                <div className={cn("text-xs", {
                  'text-green-600': job.status === 'completed',
                  'text-blue-600': job.status === 'processing',
                  'text-red-600': job.status === 'failed',
                  'text-gray-500': job.status === 'pending'
                })}>
                  {job.error || job.progressMessage}
                </div>
                
                {(job.status === 'processing' || job.status === 'completed') && (
                  <div className={cn("mt-1")}>
                    <Progress value={job.progress} className={cn("h-1")} />
                  </div>
                )}
              </div>
              
              <div className={cn("flex items-center space-x-2")}>
                {job.status === 'processing' && (
                  <Loader2 className={cn("w-4 h-4 animate-spin text-blue-500")} />
                )}
                {job.status === 'completed' && (
                  <>
                    <CheckCircle className={cn("w-4 h-4 text-green-500")} />
                    {job.downloadUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `http://localhost:4000${job.downloadUrl}`;
                          link.download = `${job.videoFile.name.replace(/\.[^/.]+$/, '')}.jsx`;
                          link.click();
                        }}
                      >
                        <Download className={cn("w-4 h-4")} />
                      </Button>
                    )}
                  </>
                )}
                {job.status === 'failed' && (
                  <AlertCircle className={cn("w-4 h-4 text-red-500")} />
                )}
                {job.status === 'pending' && (
                  <Clock className={cn("w-4 h-4 text-gray-400")} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Summary */}
      {(completedCount > 0 || failedCount > 0) && (
        <div className={cn("bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2")}>
          <h4 className={cn("font-medium text-gray-800")}>Batch Summary</h4>
          <div className={cn("grid grid-cols-2 gap-4 text-sm")}>
            <div>
              <span className={cn("text-gray-700 font-medium")}>Total Videos:</span>
              <span className={cn("ml-2 text-gray-800")}>{videos.length}</span>
            </div>
            <div>
              <span className={cn("text-green-700 font-medium")}>Completed:</span>
              <span className={cn("ml-2 text-green-800")}>{completedCount}</span>
            </div>
            <div>
              <span className={cn("text-red-700 font-medium")}>Failed:</span>  
              <span className={cn("ml-2 text-red-800")}>{failedCount}</span>
            </div>
            <div>
              <span className={cn("text-blue-700 font-medium")}>Success Rate:</span>
              <span className={cn("ml-2 text-blue-800")}>
                {videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}