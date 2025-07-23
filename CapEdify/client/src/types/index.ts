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
  id?: string; // Add optional id field for backend video ID
}

export interface TranscriptionProgress {
  progress: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  estimatedTime?: number;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
  };
}

export interface ProjectData {
  id: string;
  videoFile: VideoFile;
  captions: Caption[];
  createdAt: Date;
  lastModified: Date;
}