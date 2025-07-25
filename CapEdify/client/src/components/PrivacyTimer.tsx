import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Shield, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface PrivacyTimerProps {
  onDataCleared: () => void;
}

export function PrivacyTimer({ onDataCleared }: PrivacyTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            handleAutoClear();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const handleAutoClear = () => {
    console.log('Auto-clearing data for privacy');
    
    // Clear localStorage
    localStorage.removeItem('captionflow-project');
    localStorage.removeItem('captionflow-captions');
    
    // Revoke object URLs
    const objectUrls = JSON.parse(localStorage.getItem('captionflow-object-urls') || '[]');
    objectUrls.forEach((url: string) => URL.revokeObjectURL(url));
    localStorage.removeItem('captionflow-object-urls');

    setIsActive(false);
    onDataCleared();

    toast({
      title: "Session cleared for privacy",
      description: "All local data has been automatically removed.",
    });
  };

  const handleManualClear = () => {
    handleAutoClear();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return null;
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 p-4 bg-white/90 backdrop-blur-sm border-white/20 shadow-lg max-w-xs")}>
      <div className={cn("space-y-3")}>
        <div className={cn("flex items-center space-x-2")}>
          <Shield className={cn("h-4 w-4 text-green-600")} />
          <span className={cn("text-sm font-medium text-gray-900")}>Privacy Timer</span>
        </div>
        
        <div className={cn("flex items-center space-x-2")}>
          <Clock className={cn("h-4 w-4 text-gray-600")} />
          <span className={cn("text-sm text-gray-700")}>
            Auto-clear in {formatTime(timeRemaining)}
          </span>
        </div>

        <p className={cn("text-xs text-gray-600")}>
          All data will be automatically cleared for your privacy.
        </p>

        <Button
          onClick={handleManualClear}
          size="sm"
          variant="outline"
          className={cn("w-full text-xs bg-white/50 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700")}
        >
          <Trash2 className={cn("h-3 w-3 mr-1")} />
          Clear Now
        </Button>
      </div>
    </Card>
  );
}

import { cn } from "@/lib/utils";

