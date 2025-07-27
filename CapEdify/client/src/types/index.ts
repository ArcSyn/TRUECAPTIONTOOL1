export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

export interface Caption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface VideoFile {
  file: File;
  url: string;
  duration: number;
  size: number;
  name: string;
  id?: string; // Backend video ID
  transcriptionId?: string; // Auto-transcription ID
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'error';
}

export interface TranscriptionProgress {
  progress: number;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'error';
  estimatedTime?: number;
}

// End of file

export interface ProjectData {
  id: string;
  videoFile: VideoFile;
  captions: Caption[];
  createdAt: Date;
  lastModified: Date;
}