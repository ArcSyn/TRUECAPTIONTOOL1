import { Theme, ThemeColors } from '@/types';

/**
 * Creates a complete theme color set from a base hue and mode
 */
const createColors = (hue: number, isLight: boolean): ThemeColors => ({
  primary: `hsl(${hue}, 100%, ${isLight ? '50%' : '70%'})`,
  secondary: `hsl(${hue}, 20%, ${isLight ? '95%' : '15%'})`,
  accent: `hsl(${hue + 30}, 100%, ${isLight ? '60%' : '50%'})`,
  background: `hsl(${hue}, 20%, ${isLight ? '98%' : '5%'})`,
  surface: `hsl(${hue}, 20%, ${isLight ? '100%' : '10%'})`,
  text: `hsl(${hue}, 20%, ${isLight ? '20%' : '90%'})`,
  muted: `hsl(${hue}, 10%, ${isLight ? '60%' : '60%'})`,
  border: `hsl(${hue}, 20%, ${isLight ? '90%' : '20%'})`
});

export const themes: Theme[] = [
  // Light Themes
  {
    id: 'studio-calm',
    name: 'Studio Calm',
    mode: 'light',
    colors: createColors(210, true)
  },
  {
    id: 'desert-bloom',
    name: 'Desert Bloom',
    mode: 'light',
    colors: {
      primary: 'hsl(30, 100%, 60%)',
      secondary: 'hsl(30, 30%, 90%)',
      accent: 'hsl(15, 100%, 65%)',
      background: 'hsl(30, 30%, 96%)',
      surface: 'hsl(30, 30%, 100%)',
      text: 'hsl(30, 20%, 20%)',
      muted: 'hsl(30, 10%, 60%)',
      border: 'hsl(30, 20%, 90%)'
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    mode: 'light',
    colors: {
      primary: 'hsl(195, 100%, 45%)',
      secondary: 'hsl(195, 30%, 92%)',
      accent: 'hsl(170, 100%, 45%)',
      background: 'hsl(195, 30%, 98%)',
      surface: 'hsl(195, 30%, 100%)',
      text: 'hsl(195, 20%, 20%)',
      muted: 'hsl(195, 10%, 60%)',
      border: 'hsl(195, 20%, 90%)'
    }
  },
  {
    id: 'forest-fresh',
    name: 'Forest Fresh',
    mode: 'light',
    colors: {
      primary: 'hsl(150, 100%, 40%)',
      secondary: 'hsl(150, 30%, 92%)',
      accent: 'hsl(120, 100%, 35%)',
      background: 'hsl(150, 30%, 98%)',
      surface: 'hsl(150, 30%, 100%)',
      text: 'hsl(150, 20%, 20%)',
      muted: 'hsl(150, 10%, 60%)',
      border: 'hsl(150, 20%, 90%)'
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    mode: 'light',
    colors: {
      primary: 'hsl(20, 100%, 55%)',
      secondary: 'hsl(20, 30%, 92%)',
      accent: 'hsl(45, 100%, 50%)',
      background: 'hsl(20, 30%, 98%)',
      surface: 'hsl(20, 30%, 100%)',
      text: 'hsl(20, 20%, 20%)',
      muted: 'hsl(20, 10%, 60%)',
      border: 'hsl(20, 20%, 90%)'
    }
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    mode: 'light',
    colors: {
      primary: 'hsl(330, 100%, 70%)',
      secondary: 'hsl(330, 30%, 90%)',
      accent: 'hsl(300, 100%, 75%)',
      background: 'hsl(330, 30%, 96%)',
      surface: 'hsl(330, 30%, 98%)',
      text: 'hsl(330, 20%, 20%)',
      muted: 'hsl(330, 10%, 60%)',
      border: 'hsl(330, 20%, 90%)'
    }
  },
  {
    id: 'monochrome-plus',
    name: 'Monochrome+',
    mode: 'light',
    colors: {
      primary: 'hsl(0, 0%, 20%)',
      secondary: 'hsl(0, 0%, 90%)',
      accent: 'hsl(210, 100%, 50%)',
      background: 'hsl(0, 0%, 98%)',
      surface: 'hsl(0, 0%, 100%)',
      text: 'hsl(0, 0%, 20%)',
      muted: 'hsl(0, 0%, 60%)',
      border: 'hsl(0, 0%, 90%)'
    }
  },

  // Dark Themes
  {
    id: 'midnight-code',
    name: 'Midnight Code',
    mode: 'dark',
    colors: {
      primary: 'hsl(220, 100%, 70%)',
      secondary: 'hsl(220, 20%, 15%)',
      accent: 'hsl(280, 100%, 70%)',
      background: 'hsl(220, 20%, 8%)',
      surface: 'hsl(220, 20%, 12%)',
      text: 'hsl(220, 20%, 90%)',
      muted: 'hsl(220, 10%, 60%)',
      border: 'hsl(220, 20%, 20%)'
    }
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    mode: 'dark',
    colors: {
      primary: 'hsl(280, 100%, 70%)',
      secondary: 'hsl(280, 20%, 15%)',
      accent: 'hsl(180, 100%, 50%)',
      background: 'hsl(280, 20%, 5%)',
      surface: 'hsl(280, 20%, 10%)',
      text: 'hsl(280, 20%, 90%)',
      muted: 'hsl(280, 10%, 60%)',
      border: 'hsl(280, 20%, 20%)'
    }
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    mode: 'dark',
    colors: {
      primary: 'hsl(250, 100%, 70%)',
      secondary: 'hsl(250, 20%, 15%)',
      accent: 'hsl(320, 100%, 60%)',
      background: 'hsl(250, 20%, 5%)',
      surface: 'hsl(250, 20%, 10%)',
      text: 'hsl(250, 20%, 90%)',
      muted: 'hsl(250, 10%, 60%)',
      border: 'hsl(250, 20%, 20%)'
    }
  },
  {
    id: 'dark-ember',
    name: 'Dark Ember',
    mode: 'dark',
    colors: {
      primary: 'hsl(15, 100%, 60%)',
      secondary: 'hsl(15, 20%, 15%)',
      accent: 'hsl(30, 100%, 50%)',
      background: 'hsl(15, 20%, 5%)',
      surface: 'hsl(15, 20%, 10%)',
      text: 'hsl(15, 20%, 90%)',
      muted: 'hsl(15, 10%, 60%)',
      border: 'hsl(15, 20%, 20%)'
    }
  },
  {
    id: 'shadow-tech',
    name: 'Shadow Tech',
    mode: 'dark',
    colors: {
      primary: 'hsl(200, 100%, 60%)',
      secondary: 'hsl(200, 20%, 15%)',
      accent: 'hsl(160, 100%, 50%)',
      background: 'hsl(200, 20%, 5%)',
      surface: 'hsl(200, 20%, 10%)',
      text: 'hsl(200, 20%, 90%)',
      muted: 'hsl(200, 10%, 60%)',
      border: 'hsl(200, 20%, 20%)'
    }
  }
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};