import { Theme } from '@/types';

export const themes: Theme[] = [
  {
    id: 'studio-calm',
    name: 'Studio Calm',
    colors: {
      primary: 'hsl(210, 100%, 50%)',
      secondary: 'hsl(210, 20%, 95%)',
      accent: 'hsl(210, 100%, 60%)',
      background: 'hsl(210, 20%, 98%)',
      surface: 'hsl(210, 20%, 100%)'
    }
  },
  {
    id: 'midnight-code',
    name: 'Midnight Code',
    colors: {
      primary: 'hsl(220, 100%, 70%)',
      secondary: 'hsl(220, 20%, 15%)',
      accent: 'hsl(280, 100%, 70%)',
      background: 'hsl(220, 20%, 8%)',
      surface: 'hsl(220, 20%, 12%)'
    }
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    colors: {
      primary: 'hsl(280, 100%, 70%)',
      secondary: 'hsl(280, 20%, 15%)',
      accent: 'hsl(180, 100%, 50%)',
      background: 'hsl(280, 20%, 5%)',
      surface: 'hsl(280, 20%, 10%)'
    }
  },
  {
    id: 'desert-bloom',
    name: 'Desert Bloom',
    colors: {
      primary: 'hsl(30, 100%, 60%)',
      secondary: 'hsl(30, 30%, 90%)',
      accent: 'hsl(15, 100%, 65%)',
      background: 'hsl(30, 30%, 96%)',
      surface: 'hsl(30, 30%, 98%)'
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colors: {
      primary: 'hsl(180, 100%, 40%)',
      secondary: 'hsl(180, 30%, 90%)',
      accent: 'hsl(200, 100%, 50%)',
      background: 'hsl(180, 30%, 96%)',
      surface: 'hsl(180, 30%, 98%)'
    }
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    colors: {
      primary: 'hsl(330, 100%, 70%)',
      secondary: 'hsl(330, 30%, 90%)',
      accent: 'hsl(300, 100%, 75%)',
      background: 'hsl(330, 30%, 96%)',
      surface: 'hsl(330, 30%, 98%)'
    }
  },
  {
    id: 'forest-glow',
    name: 'Forest Glow',
    colors: {
      primary: 'hsl(150, 100%, 40%)',
      secondary: 'hsl(150, 30%, 90%)',
      accent: 'hsl(120, 100%, 50%)',
      background: 'hsl(150, 30%, 96%)',
      surface: 'hsl(150, 30%, 98%)'
    }
  },
  {
    id: 'cyber-rain',
    name: 'Cyber Rain',
    colors: {
      primary: 'hsl(270, 100%, 70%)',
      secondary: 'hsl(270, 20%, 15%)',
      accent: 'hsl(320, 100%, 70%)',
      background: 'hsl(270, 20%, 8%)',
      surface: 'hsl(270, 20%, 12%)'
    }
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    colors: {
      primary: 'hsl(20, 100%, 60%)',
      secondary: 'hsl(20, 30%, 90%)',
      accent: 'hsl(340, 100%, 70%)',
      background: 'hsl(20, 30%, 96%)',
      surface: 'hsl(20, 30%, 98%)'
    }
  },
  {
    id: 'monochrome-plus',
    name: 'Monochrome+',
    colors: {
      primary: 'hsl(0, 0%, 20%)',
      secondary: 'hsl(0, 0%, 90%)',
      accent: 'hsl(210, 100%, 50%)',
      background: 'hsl(0, 0%, 98%)',
      surface: 'hsl(0, 0%, 100%)'
    }
  },
  {
    id: 'tokyo-pulse',
    name: 'Tokyo Pulse',
    colors: {
      primary: 'hsl(0, 100%, 60%)',
      secondary: 'hsl(0, 0%, 95%)',
      accent: 'hsl(0, 100%, 70%)',
      background: 'hsl(0, 0%, 98%)',
      surface: 'hsl(0, 0%, 100%)'
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    colors: {
      primary: 'hsl(240, 100%, 70%)',
      secondary: 'hsl(240, 20%, 90%)',
      accent: 'hsl(300, 100%, 70%)',
      background: 'linear-gradient(135deg, hsl(240, 30%, 96%), hsl(300, 30%, 96%))',
      surface: 'hsl(240, 30%, 98%)'
    }
  }
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};