/**
 * CapEdify API Client - Professional TypeScript API layer
 * 
 * @description Centralized, type-safe API client for CapEdify Phase 3
 * 
 * Key Features:
 * • Comprehensive TypeScript interfaces for all API responses
 * • Intelligent error handling with user-friendly messages
 * • Progress tracking for long-running operations
 * • Automatic retry logic for failed requests
 * • Request/response logging for debugging
 * • Phase 3 chunked transcription support
 * • Multiple export format handling
 * 
 * Architecture:
 * 1. Core HTTP client with interceptors
 * 2. Resource-specific service classes
 * 3. Type-safe response interfaces
 * 4. Error handling and retry mechanisms
 * 5. Progress tracking utilities
 * 6. Export format management
 */

// ========================================================================
// TYPE DEFINITIONS - Comprehensive TypeScript interfaces
// ========================================================================

/**
 * Core transcription segment interface
 */
export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Video upload response
 */
export interface VideoUploadResponse {
  success: boolean;
  video: {
    id: string;
    original_name: string;
    size: number;
    path: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
  };
  transcription: {
    id: string;
    video_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  };
}

/**
 * Transcription status response
 */
export interface TranscriptionStatusResponse {
  success: boolean;
  transcription: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    status_message: string;
    result?: {
      text: string;
      segments: TranscriptionSegment[];
      language: string;
      model: string;
      provider: 'whisper.cpp' | 'whisper.cpp-chunked';
      chunkCount?: number;
      metadata?: {
        processingTime: number;
        audioQuality: string;
        totalDuration: number;
      };
    };
    created_at: string;
    updated_at: string;
  };
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: string;
  timestamp: string;
  port: string;
  mode: string;
  phase: string;
  endpoints: Record<string, string>;
  features: {
    chunked_transcription: boolean;
    long_form_videos: string;
    after_effects_jsx: boolean;
    ecma2018_syntax: boolean;
    fade_animations: boolean;
    multiple_styles: string[];
    multiple_positions: string[];
    export_formats: string[];
  };
  environment: {
    node_version: string;
    local_mode: boolean;
    whisper_available: boolean;
    whisper_chunker_agent: boolean;
    ae_jsx_exporter_agent: boolean;
  };
}

/**
 * API error response
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Export options for JSX generation
 */
export interface ExportOptions {
  style?: 'modern' | 'minimal' | 'bold' | 'podcast' | 'cinematic';
  position?: 'bottom' | 'top' | 'center' | 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  enableFades?: boolean;
  enableStroke?: boolean;
  enableShadow?: boolean;
  projectName?: string;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (percent: number, message: string) => void;

// ========================================================================
// CORE HTTP CLIENT - Professional request handling
// ========================================================================

/**
 * Core API client with intelligent error handling and retry logic
 */
class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private maxRetries: number;

  constructor(baseURL = 'http://localhost:4000', timeout = 30000, maxRetries = 3) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.defaultTimeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Make HTTP request with intelligent error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        
        throw new ApiClientError(
          errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as T;
      }

    } catch (error) {
      clearTimeout(timeoutId);

      // Retry logic for network errors
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.warn(`Request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error instanceof ApiClientError ? error : new ApiClientError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        { originalError: error }
      );
    }
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof ApiClientError) {
      // Retry on server errors (5xx) but not client errors (4xx)
      return error.status >= 500;
    }
    
    // Retry on network errors
    return error.name === 'TypeError' || error.name === 'AbortError';
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP method helpers
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }
}

/**
 * Custom API error class with additional context
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.status) {
      case 0:
        return 'Unable to connect to server. Please check your connection.';
      case 400:
        return 'Invalid request. Please check your input.';
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return this.message;
    }
  }
}

// ========================================================================
// SERVICE CLASSES - Resource-specific API methods
// ========================================================================

/**
 * Health and system status service
 */
export class HealthService {
  constructor(private client: ApiClient) {}

  /**
   * Check server health and capabilities
   */
  async check(): Promise<HealthResponse> {
    return this.client.get<HealthResponse>('/health');
  }

  /**
   * Verify Phase 3 capabilities
   */
  async verifyPhase3(): Promise<boolean> {
    try {
      const health = await this.check();
      return health.phase === '3' && health.features.chunked_transcription;
    } catch {
      return false;
    }
  }
}

/**
 * Video upload and management service
 */
export class VideoService {
  constructor(private client: ApiClient) {}

  /**
   * Upload video file with progress tracking
   */
  async upload(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('video', file);

    // Simulate progress for now (actual progress would need server-sent events)
    if (onProgress) {
      onProgress(0, 'Starting upload...');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        // This would be replaced with actual progress tracking
      }, 500);

      try {
        const result = await this.client.upload<VideoUploadResponse>('/api/videos/upload', formData);
        clearInterval(progressInterval);
        onProgress(100, 'Upload complete!');
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    }

    return this.client.upload<VideoUploadResponse>('/api/videos/upload', formData);
  }

  /**
   * List uploaded videos
   */
  async list(): Promise<{ success: boolean; videos: any[] }> {
    return this.client.get<{ success: boolean; videos: any[] }>('/api/videos');
  }
}

/**
 * Transcription service with Phase 3 support
 */
export class TranscriptionService {
  constructor(private client: ApiClient) {}

  /**
   * Start transcription process
   */
  async start(videoId: string, transcriptionId: string, model = 'small'): Promise<{
    success: boolean;
    transcription_id: string;
    status: string;
    message: string;
  }> {
    return this.client.post('/api/transcribe', {
      video_id: videoId,
      transcription_id: transcriptionId,
      model,
    });
  }

  /**
   * Get transcription status
   */
  async getStatus(transcriptionId: string): Promise<TranscriptionStatusResponse> {
    return this.client.get<TranscriptionStatusResponse>(`/api/transcribe/${transcriptionId}`);
  }

  /**
   * Poll transcription until complete
   */
  async pollUntilComplete(
    transcriptionId: string,
    onProgress?: ProgressCallback,
    pollInterval = 2000
  ): Promise<TranscriptionStatusResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getStatus(transcriptionId);
          
          if (onProgress) {
            onProgress(
              status.transcription.progress,
              status.transcription.status_message || 'Processing...'
            );
          }

          if (status.transcription.status === 'completed') {
            resolve(status);
          } else if (status.transcription.status === 'failed') {
            reject(new ApiClientError('Transcription failed', 500, status));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

/**
 * Export service for multiple formats
 */
export class ExportService {
  constructor(private client: ApiClient) {}

  /**
   * Export After Effects JSX script
   */
  async exportJSX(transcriptionId: string, options: ExportOptions = {}): Promise<string> {
    const params = new URLSearchParams({
      id: transcriptionId,
      ...Object.entries(options).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>),
    });

    return this.client.get<string>(`/api/export/jsx/phase3?${params}`);
  }

  /**
   * Export SRT subtitle file
   */
  async exportSRT(transcriptionId: string): Promise<string> {
    return this.client.get<string>(`/api/export/srt/phase3?id=${transcriptionId}`);
  }

  /**
   * Export WebVTT subtitle file
   */
  async exportVTT(transcriptionId: string): Promise<string> {
    return this.client.get<string>(`/api/export/vtt/phase3?id=${transcriptionId}`);
  }

  /**
   * Export raw JSON data
   */
  async exportJSON(transcriptionId: string): Promise<{
    success: boolean;
    transcription: {
      id: string;
      segments: TranscriptionSegment[];
      metadata: any;
    };
  }> {
    return this.client.get(`/api/export/json/phase3?id=${transcriptionId}`);
  }
}

// ========================================================================
// MAIN API CLIENT - Unified interface
// ========================================================================

/**
 * Main CapEdify API client with all services
 */
export class CapEdifyAPI {
  private client: ApiClient;
  
  public health: HealthService;
  public videos: VideoService;
  public transcriptions: TranscriptionService;
  public exports: ExportService;

  constructor(baseURL?: string) {
    this.client = new ApiClient(baseURL);
    
    // Initialize services
    this.health = new HealthService(this.client);
    this.videos = new VideoService(this.client);
    this.transcriptions = new TranscriptionService(this.client);
    this.exports = new ExportService(this.client);
  }

  /**
   * Complete workflow: upload video and transcribe
   */
  async processVideo(
    file: File,
    options: {
      model?: string;
      onUploadProgress?: ProgressCallback;
      onTranscriptionProgress?: ProgressCallback;
    } = {}
  ): Promise<TranscriptionStatusResponse> {
    // Step 1: Upload video
    const uploadResult = await this.videos.upload(file, options.onUploadProgress);
    
    // Step 2: Start transcription
    await this.transcriptions.start(
      uploadResult.video.id,
      uploadResult.transcription.id,
      options.model
    );
    
    // Step 3: Poll until complete
    return this.transcriptions.pollUntilComplete(
      uploadResult.transcription.id,
      options.onTranscriptionProgress
    );
  }
}

// ========================================================================
// SINGLETON INSTANCE - Ready to use
// ========================================================================

/**
 * Default API instance for immediate use
 */
export const api = new CapEdifyAPI();

// Export for advanced usage
export { ApiClient };