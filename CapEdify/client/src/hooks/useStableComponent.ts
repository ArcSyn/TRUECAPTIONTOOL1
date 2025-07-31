import { useState, useEffect, useCallback } from 'react';

interface StableComponentConfig {
  componentName: string;
  maxRetries?: number;
  retryDelay?: number;
  fallbackContent?: React.ReactNode;
}

interface StableComponentState {
  isStable: boolean;
  error: string | null;
  retryCount: number;
  lastError: Date | null;
}

/**
 * Hook for managing stable component state and error recovery
 */
export const useStableComponent = (config: StableComponentConfig) => {
  const [state, setState] = useState<StableComponentState>({
    isStable: true,
    error: null,
    retryCount: 0,
    lastError: null
  });

  const maxRetries = config.maxRetries || 3;
  const retryDelay = config.retryDelay || 1000;

  const reportError = useCallback((error: Error) => {
    console.error(`Stable component ${config.componentName} error:`, error);
    
    setState(prev => ({
      ...prev,
      isStable: false,
      error: error.message,
      lastError: new Date()
    }));

    // Auto-retry logic
    if (state.retryCount < maxRetries) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          isStable: true,
          error: null
        }));
      }, retryDelay * (state.retryCount + 1)); // Exponential backoff
    }
  }, [config.componentName, maxRetries, retryDelay, state.retryCount]);

  const resetComponent = useCallback(() => {
    setState({
      isStable: true,
      error: null,
      retryCount: 0,
      lastError: null
    });
  }, []);

  const markAsStable = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStable: true,
      error: null
    }));
  }, []);

  // Health check for component stability
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (state.lastError && Date.now() - state.lastError.getTime() > 60000) {
        // Component has been stable for 1 minute, reset retry count
        setState(prev => ({
          ...prev,
          retryCount: 0
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheck);
  }, [state.lastError]);

  return {
    isStable: state.isStable,
    error: state.error,
    retryCount: state.retryCount,
    canRetry: state.retryCount < maxRetries,
    reportError,
    resetComponent,
    markAsStable
  };
};

/**
 * Registry of stable components
 */
export const STABLE_COMPONENTS = {
  // UI Components - These should never change
  Button: true,
  Card: true,
  Tabs: true,
  Badge: true,
  Checkbox: true,
  Progress: true,
  Select: true,
  Input: true,

  // Business Logic - Stable after testing
  VideoUpload: true,
  PipelineProgress: true,
  ExportOptionsTab: true,
  
  // Development - Can be modified
  BatchProcessingDemo: false,
  BatchProcessingProgress: false,
} as const;

/**
 * Check if a component is marked as stable
 */
export const isStableComponent = (componentName: keyof typeof STABLE_COMPONENTS): boolean => {
  return STABLE_COMPONENTS[componentName] === true;
};