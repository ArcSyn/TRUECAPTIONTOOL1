import { useEffect, useRef } from 'react';
import { useToast } from './useToast';

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay: number = 5000
) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const currentDataString = JSON.stringify(data);
    
    if (currentDataString === lastSavedRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFunction(data);
        lastSavedRef.current = currentDataString;
        console.log('Auto-save completed');
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast({
          title: "Auto-save failed",
          description: "Your changes couldn't be saved automatically.",
          variant: "destructive",
        });
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveFunction, delay, toast]);
}