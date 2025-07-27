export interface VideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  transcriptionId?: string;
  file?: File;
}

export interface Caption {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

export interface Transcription {
  id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: TranscriptionResult;
  error?: string;
  created_at: string;
  updated_at: string;
}