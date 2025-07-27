// src/components/ThemeSelector.tsx
import React from 'react';
import { useTheme, type Theme } from '../hooks/useTheme';

const ThemeButton = ({ 
  theme, 
  currentTheme, 
  onClick, 
  children 
}: { 
  theme: Theme;
  currentTheme: Theme;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const isActive = theme === currentTheme;
  
  const getThemeClasses = () => {
    const baseClasses = "px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium";
    
    switch (theme) {
      case 'light':
        return `${baseClasses} ${isActive 
          ? 'bg-gray-200 text-gray-900 shadow-md' 
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`;
      case 'dark':
        return `${baseClasses} ${isActive 
          ? 'bg-gray-800 text-white shadow-lg' 
          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
        }`;
      case 'neon':
        return `${baseClasses} ${isActive 
          ? 'bg-green-400 text-black shadow-lg shadow-green-400/50' 
          : 'bg-gray-900 text-green-400 border border-green-400 hover:bg-green-400 hover:text-black'
        }`;
      case 'mystic':
        return `${baseClasses} ${isActive 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50' 
          : 'bg-gray-900 text-purple-400 border border-purple-400 hover:bg-purple-600 hover:text-white'
        }`;
      default:
        return baseClasses;
    }
  };

  return (
    <button
      onClick={onClick}
      className={getThemeClasses()}
    >
      {children}
    </button>
  );
};

export function ThemeSelector() {
  const { theme, setTheme, toggleTheme, availableThemes } = useTheme();

  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 shadow-lg p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">
          Theme:
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-sm capitalize">
          {theme}
        </span>
      </div>
      
      {/* Theme Buttons Grid */}
      <div className="gap-2 grid grid-cols-2">
        <ThemeButton 
          theme="light" 
          currentTheme={theme} 
          onClick={() => setTheme('light')}
        >
          ☀️ Light
        </ThemeButton>
        
        <ThemeButton 
          theme="dark" 
          currentTheme={theme} 
          onClick={() => setTheme('dark')}
        >
          🌙 Dark
        </ThemeButton>
        
        <ThemeButton 
          theme="neon" 
          currentTheme={theme} 
          onClick={() => setTheme('neon')}
        >
          ⚡ Neon
        </ThemeButton>
        
        <ThemeButton 
          theme="mystic" 
          currentTheme={theme} 
          onClick={() => setTheme('mystic')}
        >
          🔮 Mystic
        </ThemeButton>
      </div>

      {/* Quick Toggle Button */}
      <button
        onClick={toggleTheme}
        className="bg-gradient-to-r from-blue-500 hover:from-blue-600 to-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg mt-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
      >
        🔄 Cycle Theme
      </button>
    </div>
  );
}
