import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Mic, Zap, Wifi, WifiOff } from 'lucide-react';
import { TranscriptionProgress as TranscriptionProgressType } from '@/types';
import { startTranscription, getTranscriptionProgress } from '@/api/video';
import { useToast } from '@/hooks/useToast';

interface TranscriptionProgressProps {
  videoId: string;
  onTranscriptionComplete: (transcriptionId: string) => void;
}

export function TranscriptionProgress({ videoId, onTranscriptionComplete }: TranscriptionProgressProps) {
  const [progress, setProgress] = useState<TranscriptionProgressType>({
    progress: 0,
    status: 'idle'
  });
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'groq' | 'whisper'>('groq');
  const { toast } = useToast();

  const startTranscriptionProcess = async (model: 'groq' | 'whisper') => {
    try {
      console.log('Starting transcription with model:', model);
      const result = await startTranscription(videoId, model);
      setTranscriptionId(result.transcriptionId);
      setProgress({ progress: 0, status: 'processing' });
      
      toast({
        title: "Transcription started",
        description: `Using ${model === 'groq' ? 'Groq AI' : 'Whisper'} for transcription.`,
      });
    } catch (error) {
      console.error('Failed to start transcription:', error);
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Failed to start transcription",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!transcriptionId || progress.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const progressData = await getTranscriptionProgress(transcriptionId);
        setProgress(progressData);

        if (progressData.status === 'completed') {
          clearInterval(interval);
          onTranscriptionComplete(transcriptionId);
          toast({
            title: "Transcription complete",
            description: "Your video has been successfully transcribed!",
          });
        }
      } catch (error) {
        console.error('Failed to get transcription progress:', error);
        clearInterval(interval);
        setProgress({ progress: 0, status: 'error' });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transcriptionId, progress.status, onTranscriptionComplete, toast]);

  if (progress.status === 'processing') {
    return (
      <Card className={cn("p-6 bg-white/10 backdrop-blur-sm border-white/20")}>
        <div className={cn("text-center space-y-4")}>
          <div className={cn("w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse")}>
            <Mic className={cn("h-8 w-8 text-blue-600")} />
          </div>
          <h3 className={cn("text-lg font-semibold text-gray-900")}>Transcribing Audio...</h3>
          <Progress value={progress.progress} className={cn("w-full max-w-xs mx-auto")} />
          <div className={cn("space-y-1")}>
            <p className={cn("text-sm text-gray-600")}>{Math.round(progress.progress)}% complete</p>
            {progress.estimatedTime && (
              <p className={cn("text-xs text-gray-500")}>
                Estimated time remaining: {progress.estimatedTime}s
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 bg-white/10 backdrop-blur-sm border-white/20")}>
      <div className={cn("text-center space-y-6")}>
        <div className={cn("w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center")}>
          <Mic className={cn("h-8 w-8 text-green-600")} />
        </div>
        
        <div>
          <h3 className={cn("text-lg font-semibold text-gray-900 mb-2")}>
            Ready to Transcribe
          </h3>
          <p className={cn("text-gray-600 mb-6")}>
            Choose your preferred transcription method
          </p>
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
          <Button
            onClick={() => startTranscriptionProcess('groq')}
            className={cn("flex flex-col items-center space-y-2 h-auto py-4 bg-blue-600 hover:bg-blue-700")}
            disabled={progress.status === 'processing'}
          >
            <div className={cn("flex items-center space-x-2")}>
              <Zap className={cn("h-5 w-5")} />
              <Wifi className={cn("h-4 w-4")} />
            </div>
            <div className={cn("text-center")}>
              <div className={cn("font-semibold")}>Groq AI</div>
              <div className={cn("text-xs opacity-90")}>Fast & Accurate</div>
            </div>
          </Button>

          <Button
            onClick={() => startTranscriptionProcess('whisper')}
            variant="outline"
            className={cn("flex flex-col items-center space-y-2 h-auto py-4 bg-white/10 border-white/20 hover:bg-white/20")}
            disabled={progress.status === 'processing'}
          >
            <div className={cn("flex items-center space-x-2")}>
              <Mic className={cn("h-5 w-5")} />
              <WifiOff className={cn("h-4 w-4")} />
            </div>
            <div className={cn("text-center")}>
              <div className={cn("font-semibold")}>Whisper Local</div>
              <div className={cn("text-xs opacity-70")}>Private & Offline</div>
            </div>
          </Button>
        </div>
      </div>
    </Card>
  );
}

import { cn } from "@/lib/utils";

