import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  progressRange: [number, number]; // [start%, end%]
}

interface PipelineJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  progressMessage: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: {
    sceneCount: number;
    creditInfo: {
      estimatedCreditsUsed: number;
    };
    metadata: {
      durationMinutes: number;
      userTier: string;
    };
    downloadReady: boolean;
  };
  error?: {
    stage: string;
    agent: string;
    message: string;
  };
}

interface PipelineProgressProps {
  jobId: string;
  onComplete?: (job: PipelineJob) => void;
  onError?: (error: any) => void;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'credit_check',
    label: 'Credit Check',
    description: 'Validating user tier and credit limits',
    progressRange: [0, 25]
  },
  {
    id: 'scene_splitting',
    label: 'Scene Splitting',
    description: 'Breaking transcript into logical scenes',
    progressRange: [25, 50]
  },
  {
    id: 'text_formatting',
    label: 'Text Formatting',
    description: 'Cleaning and formatting caption text',
    progressRange: [50, 75]
  },
  {
    id: 'jsx_building',
    label: 'JSX Building',
    description: 'Converting to After Effects format',
    progressRange: [75, 100]
  }
];

export function PipelineProgress({ jobId, onComplete, onError }: PipelineProgressProps) {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const { toast } = useToast();

  // Determine current stage based on progress
  const getCurrentStage = (progress: number): number => {
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      const [start, end] = PIPELINE_STAGES[i].progressRange;
      if (progress >= start && progress < end) {
        return i;
      }
    }
    return PIPELINE_STAGES.length - 1; // Last stage if 100%
  };

  // Poll job status
  const pollJobStatus = async () => {
    try {
      const response = await fetch(`/api/pipeline/status/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jobData: PipelineJob = await response.json();
      setJob(jobData);
      setCurrentStageIndex(getCurrentStage(jobData.progress));

      // Handle completion
      if (jobData.status === 'completed') {
        setIsPolling(false);
        setDownloadUrl(`/api/pipeline/download/${jobId}`);
        
        toast({
          title: 'Pipeline Complete! 🎉',
          description: `Generated ${jobData.result?.sceneCount || 0} scenes. JSX ready for download.`,
        });

        if (onComplete) {
          onComplete(jobData);
        }
      }

      // Handle failure
      if (jobData.status === 'failed') {
        setIsPolling(false);
        
        const errorMsg = jobData.error 
          ? `${jobData.error.agent}: ${jobData.error.message}`
          : 'Pipeline execution failed';

        toast({
          title: 'Pipeline Failed',
          description: errorMsg,
          variant: 'destructive',
        });

        if (onError) {
          onError(jobData.error);
        }
      }

    } catch (error) {
      console.error('Failed to poll job status:', error);
      setIsPolling(false);
      
      toast({
        title: 'Connection Error',
        description: 'Unable to check pipeline status. Please refresh.',
        variant: 'destructive',
      });

      if (onError) {
        onError(error);
      }
    }
  };

  // Start polling on mount
  useEffect(() => {
    if (!jobId || !isPolling) return;

    const pollInterval = setInterval(pollJobStatus, 2000); // Poll every 2 seconds
    
    // Initial poll
    pollJobStatus();

    return () => clearInterval(pollInterval);
  }, [jobId, isPolling]);

  // Auto-download JSX when ready
  const handleDownload = async () => {
    if (!downloadUrl) return;

    try {
      // Create download link and trigger
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CapEdify_${jobId}.jsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download Started',
        description: 'JSX file download has begun.',
      });

    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download JSX file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!job) {
    return (
      <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20")}>
        <div className={cn("flex items-center justify-center space-x-3")}>
          <Loader2 className={cn("w-5 h-5 animate-spin text-blue-500")} />
          <span className={cn("text-gray-700")}>Loading pipeline status...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20 space-y-6")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between")}>
        <div>
          <h3 className={cn("font-semibold text-gray-900 text-lg")}>
            Agent Pipeline Processing
          </h3>
          <p className={cn("text-gray-600 text-sm")}>
            Job ID: {jobId.substring(0, 8)}...
          </p>
        </div>
        
        <div className={cn("flex items-center space-x-2")}>
          {job.status === 'processing' && (
            <Loader2 className={cn("w-5 h-5 animate-spin text-blue-500")} />
          )}
          {job.status === 'completed' && (
            <CheckCircle className={cn("w-5 h-5 text-green-500")} />
          )}
          {job.status === 'failed' && (
            <AlertCircle className={cn("w-5 h-5 text-red-500")} />
          )}
          <span className={cn("text-sm font-medium capitalize", {
            'text-blue-600': job.status === 'processing',
            'text-green-600': job.status === 'completed',
            'text-red-600': job.status === 'failed',
            'text-gray-600': job.status === 'pending'
          })}>
            {job.status}
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className={cn("space-y-2")}>
        <div className={cn("flex justify-between items-center")}>
          <span className={cn("text-sm font-medium text-gray-700")}>
            Overall Progress
          </span>
          <span className={cn("text-sm text-gray-600")}>
            {Math.round(job.progress)}%
          </span>
        </div>
        <Progress 
          value={job.progress} 
          className={cn("h-3")}
        />
        <p className={cn("text-sm text-gray-600")}>
          {job.progressMessage}
        </p>
      </div>

      {/* Stage Breakdown */}
      <div className={cn("space-y-3")}>
        <h4 className={cn("font-medium text-gray-800")}>Pipeline Stages</h4>
        
        <div className={cn("space-y-2")}>
          {PIPELINE_STAGES.map((stage, index) => {
            const isCompleted = currentStageIndex > index;
            const isCurrent = currentStageIndex === index && job.status === 'processing';
            const isPending = currentStageIndex < index;
            
            return (
              <div
                key={stage.id}
                className={cn("flex items-center space-x-3 p-3 rounded-lg border", {
                  'bg-green-50 border-green-200': isCompleted,
                  'bg-blue-50 border-blue-200': isCurrent,
                  'bg-gray-50 border-gray-200': isPending
                })}
              >
                <div className={cn("flex-shrink-0")}>
                  {isCompleted ? (
                    <CheckCircle className={cn("w-5 h-5 text-green-500")} />
                  ) : isCurrent ? (
                    <Loader2 className={cn("w-5 h-5 animate-spin text-blue-500")} />
                  ) : (
                    <Clock className={cn("w-5 h-5 text-gray-400")} />
                  )}
                </div>
                
                <div className={cn("flex-1")}>
                  <div className={cn("font-medium", {
                    'text-green-700': isCompleted,
                    'text-blue-700': isCurrent,
                    'text-gray-600': isPending
                  })}>
                    {stage.label}
                  </div>
                  <div className={cn("text-sm", {
                    'text-green-600': isCompleted,
                    'text-blue-600': isCurrent,
                    'text-gray-500': isPending
                  })}>
                    {stage.description}
                  </div>
                </div>
                
                <div className={cn("text-sm font-mono", {
                  'text-green-600': isCompleted,
                  'text-blue-600': isCurrent,
                  'text-gray-400': isPending
                })}>
                  {stage.progressRange[0]}%-{stage.progressRange[1]}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Summary (when completed) */}
      {job.status === 'completed' && job.result && (
        <div className={cn("bg-green-50 border border-green-200 rounded-lg p-4 space-y-2")}>
          <h4 className={cn("font-medium text-green-800")}>Pipeline Results</h4>
          <div className={cn("grid grid-cols-2 gap-4 text-sm")}>
            <div>
              <span className={cn("text-green-700 font-medium")}>Scenes Generated:</span>
              <span className={cn("ml-2 text-green-800")}>{job.result.sceneCount}</span>
            </div>
            <div>
              <span className={cn("text-green-700 font-medium")}>Credits Used:</span>
              <span className={cn("ml-2 text-green-800")}>{job.result.creditInfo.estimatedCreditsUsed}</span>
            </div>
            <div>
              <span className={cn("text-green-700 font-medium")}>Duration:</span>
              <span className={cn("ml-2 text-green-800")}>{job.result.metadata.durationMinutes} min</span>
            </div>
            <div>
              <span className={cn("text-green-700 font-medium")}>User Tier:</span>
              <span className={cn("ml-2 text-green-800 capitalize")}>{job.result.metadata.userTier}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Details (when failed) */}
      {job.status === 'failed' && job.error && (
        <div className={cn("bg-red-50 border border-red-200 rounded-lg p-4 space-y-2")}>
          <h4 className={cn("font-medium text-red-800")}>Pipeline Error</h4>
          <div className={cn("text-sm space-y-1")}>
            <div>
              <span className={cn("text-red-700 font-medium")}>Failed Stage:</span>
              <span className={cn("ml-2 text-red-800")}>{job.error.stage}</span>
            </div>
            <div>
              <span className={cn("text-red-700 font-medium")}>Failed Agent:</span>
              <span className={cn("ml-2 text-red-800")}>{job.error.agent}</span>
            </div>
            <div>
              <span className={cn("text-red-700 font-medium")}>Error Message:</span>
              <span className={cn("ml-2 text-red-800")}>{job.error.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Download Button (when completed) */}
      {job.status === 'completed' && downloadUrl && (
        <div className={cn("flex justify-center pt-2")}>
          <Button
            onClick={handleDownload}
            className={cn("bg-green-600 hover:bg-green-700 text-white")}
            size="lg"
          >
            <Download className={cn("w-4 h-4 mr-2")} />
            Download JSX File
          </Button>
        </div>
      )}

      {/* Timing Information */}
      {job.completedAt && (
        <div className={cn("text-xs text-gray-500 border-t pt-3")}>
          <div className={cn("flex justify-between")}>
            <span>Started: {new Date(job.createdAt).toLocaleTimeString()}</span>
            <span>Completed: {new Date(job.completedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </Card>
  );
}