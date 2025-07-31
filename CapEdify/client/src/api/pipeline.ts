// Pipeline API - Connect to AgentOrchestrator backend
const API_BASE_URL = 'http://localhost:4000/api';

export interface PipelineInput {
  inputType: 'video' | 'srt';
  file?: File;
  srtContent?: string;
  userTier?: 'free' | 'creator' | 'studio';
  jobCountThisMonth?: number;
  durationMinutes?: number;
  style?: string;
  position?: string;
  projectName?: string;
}

export interface PipelineJob {
  success: boolean;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  estimatedDuration: string;
  statusUrl: string;
  downloadUrl: string;
}

export interface PipelineStatus {
  success: boolean;
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
      tierSuggestions?: string[];
    };
    metadata: {
      inputType: string;
      durationMinutes: number;
      userTier: string;
      processing: {
        totalTime: number;
        stageBreakdown: Record<string, number>;
      };
    };
    downloadReady: boolean;
  };
  error?: {
    stage: string;
    agent: string;
    message: string;
  };
}

/**
 * Execute the complete AgentOrchestrator pipeline
 * @param input - Pipeline configuration
 * @returns Pipeline job information
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineJob> {
  console.log('🚀 Starting pipeline execution...', {
    inputType: input.inputType,
    userTier: input.userTier || 'free',
    projectName: input.projectName || 'CapEdify_Export'
  });

  try {
    // Check backend connectivity first
    console.log('🔍 Checking backend connectivity...');
    
    try {
      const healthCheck = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Health check response:', healthCheck.status);
    } catch (healthError) {
      throw new Error('Cannot connect to backend server. Please ensure it\'s running on port 4000.');
    }

    // Prepare form data or JSON payload
    let requestBody: FormData | string;
    let headers: Record<string, string> = {
      'X-User-ID': '550e8400-e29b-41d4-a716-446655440000' // Consistent demo user ID
    };

    if (input.inputType === 'video' && input.file) {
      // Video file upload
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('inputType', 'video');
      formData.append('userTier', input.userTier || 'free');
      formData.append('jobCountThisMonth', (input.jobCountThisMonth || 0).toString());
      formData.append('style', input.style || 'modern');
      formData.append('position', input.position || 'bottom');
      formData.append('projectName', input.projectName || input.file.name.replace(/\.[^/.]+$/, '') || 'CapEdify_Export');
      
      requestBody = formData;
    } else if (input.inputType === 'srt' && input.srtContent) {
      // Direct SRT content
      const jsonPayload = {
        inputType: 'srt',
        srtContent: input.srtContent,
        userTier: input.userTier || 'free',
        jobCountThisMonth: input.jobCountThisMonth || 0,
        durationMinutes: input.durationMinutes || 2.0,
        style: input.style || 'modern',
        position: input.position || 'bottom',
        projectName: input.projectName || 'CapEdify_Export'
      };
      
      requestBody = JSON.stringify(jsonPayload);
      headers['Content-Type'] = 'application/json';
    } else {
      throw new Error('Invalid input: Must provide either video file or SRT content');
    }

    console.log('📡 Sending pipeline request to:', `${API_BASE_URL}/pipeline/run`);
    
    const response = await fetch(`${API_BASE_URL}/pipeline/run`, {
      method: 'POST',
      headers: headers,
      body: requestBody,
    });

    console.log('📥 Pipeline response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pipeline failed with response:', errorText);
      throw new Error(`Pipeline failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Pipeline started successfully:', data);

    if (!data.success) {
      throw new Error(data.error || 'Pipeline failed to start');
    }

    return data as PipelineJob;

  } catch (error: any) {
    console.error('Pipeline execution error:', error);
    throw error;
  }
}

/**
 * Get pipeline job status with real-time progress
 * @param jobId - Pipeline job ID
 * @returns Current job status and progress
 */
export async function getPipelineStatus(jobId: string): Promise<PipelineStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/status/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get pipeline status: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get pipeline status');
    }

    return data as PipelineStatus;

  } catch (error: any) {
    console.error('Get pipeline status error:', error);
    throw error;
  }
}

/**
 * Download the generated JSX file
 * @param jobId - Pipeline job ID
 * @returns Blob containing the JSX file
 */
export async function downloadPipelineResult(jobId: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/download/${jobId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Download failed: ${response.statusText}`);
    }

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `CapEdify_Export_${jobId}.jsx`;

    const blob = await response.blob();
    
    console.log('✅ JSX file downloaded:', {
      filename,
      size: blob.size,
      type: blob.type,
      jobId
    });

    return { blob, filename };

  } catch (error: any) {
    console.error('Download pipeline result error:', error);
    throw error;
  }
}

/**
 * Download JSX with specific style from pipeline job
 */
export async function downloadPipelineJSX(jobId: string, style: 'bold' | 'modern' | 'minimal' = 'modern'): Promise<{ blob: Blob; filename: string }> {
  try {
    console.log(`📥 Requesting ${style} JSX download for job:`, jobId);
    
    const response = await fetch(`${API_BASE_URL}/pipeline/export/${jobId}/jsx?style=${style}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/javascript'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'JSX download failed' }));
      throw new Error(errorData.error || `JSX download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `${jobId}_${style}.jsx`;
    
    console.log(`✅ ${style} JSX downloaded:`, { filename, size: blob.size });
    return { blob, filename };

  } catch (error: any) {
    console.error(`${style} JSX download error:`, error);
    throw error;
  }
}

/**
 * Download SRT from pipeline job
 */
export async function downloadPipelineSRT(jobId: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/export/${jobId}/srt`, {
      method: 'GET',
      headers: { 'Accept': 'application/x-subrip' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'SRT download failed' }));
      throw new Error(errorData.error || `SRT download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `${jobId}.srt`;
    return { blob, filename };
  } catch (error: any) {
    console.error('SRT download error:', error);
    throw error;
  }
}

/**
 * Download VTT from pipeline job
 */
export async function downloadPipelineVTT(jobId: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/export/${jobId}/vtt`, {
      method: 'GET',
      headers: { 'Accept': 'text/vtt' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'VTT download failed' }));
      throw new Error(errorData.error || `VTT download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `${jobId}.vtt`;
    return { blob, filename };
  } catch (error: any) {
    console.error('VTT download error:', error);
    throw error;
  }
}

/**
 * Download plain text transcription from pipeline job
 */
export async function downloadPipelineText(jobId: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/export/${jobId}/txt`, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Text download failed' }));
      throw new Error(errorData.error || `Text download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `${jobId}.txt`;
    return { blob, filename };
  } catch (error: any) {
    console.error('Text download error:', error);
    throw error;
  }
}

/**
 * Helper function to trigger browser download
 * @param blob - File blob
 * @param filename - Filename for download
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Poll pipeline status until completion
 * @param jobId - Pipeline job ID
 * @param onProgress - Progress callback function
 * @param pollInterval - Polling interval in milliseconds
 * @returns Final pipeline status
 */
export async function pollPipelineProgress(
  jobId: string, 
  onProgress: (status: PipelineStatus) => void,
  pollInterval: number = 1000
): Promise<PipelineStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getPipelineStatus(jobId);
        onProgress(status);

        if (status.status === 'completed') {
          resolve(status);
        } else if (status.status === 'failed') {
          reject(new Error(status.error?.message || 'Pipeline failed'));
        } else {
          // Continue polling
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}