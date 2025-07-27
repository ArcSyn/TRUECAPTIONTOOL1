// src/hooks/useTheme.ts
import { useEffect, useState } from 'react';

const THEMES = ['light', 'dark', 'neon', 'mystic'] as const;
export type Theme = typeof THEMES[number];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return THEMES.includes(stored) ? stored : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    THEMES.forEach(t => root.classList.remove(t));
    
    // Add current theme class
    root.classList.add(theme);
    
    // Persist to localStorage
    localStorage.setItem('theme', theme);
    
    // Set CSS custom properties for theme-specific colors
    if (theme === 'neon') {
      root.style.setProperty('--primary', '57 255 20'); // #39ff14
      root.style.setProperty('--background', '0 0 0'); // black bg for neon
      root.style.setProperty('--foreground', '57 255 20');
    } else if (theme === 'mystic') {
      root.style.setProperty('--primary', '110 68 255'); // #6e44ff
      root.style.setProperty('--background', '15 15 35'); // dark purple bg
      root.style.setProperty('--foreground', '255 255 255');
    } else {
      // Reset to default for light/dark themes
      root.style.removeProperty('--primary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
    }
  }, [theme]);

  const toggleTheme = () => {
    const currentIndex = THEMES.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme,
    availableThemes: THEMES 
  };
}
