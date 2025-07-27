// src/components/ThemeDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type Theme } from '../hooks/useTheme';

const themes = [
  { id: 'light', name: 'Light', icon: '☀️', color: 'from-yellow-400 to-orange-500' },
  { id: 'dark', name: 'Dark', icon: '🌙', color: 'from-gray-700 to-gray-900' },
  { id: 'neon', name: 'Neon', icon: '⚡', color: 'from-green-400 to-cyan-500' },
  { id: 'mystic', name: 'Mystic', icon: '🔮', color: 'from-purple-500 to-pink-600' },
] as const;

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Uiverse.io inspired */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 bg-white/10 hover:bg-white/20 shadow-lg hover:shadow-xl backdrop-blur-md px-4 py-2 border border-white/20 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
          {currentTheme.name}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        
        {/* Animated background gradient */}
        <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 
                        transition-opacity duration-300 bg-gradient-to-r ${currentTheme.color}`} />
      </button>

      {/* Dropdown Menu - Uiverse.io inspired */}
      {isOpen && (
        <div className="top-full right-0 absolute bg-white/95 dark:bg-gray-900/95 slide-in-from-top-2 shadow-2xl backdrop-blur-xl mt-2 border border-white/30 dark:border-gray-700/50 rounded-2xl w-48 overflow-hidden animate-in duration-200 fade-in">
          
          {/* Header */}
          <div className="px-4 py-3 border-gray-200/50 dark:border-gray-700/50 border-b">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Choose Theme
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-xs">
              Pick your vibe ✨
            </p>
          </div>

          {/* Theme Options */}
          <div className="p-2">
            {themes.map((themeOption) => (
              <button
                key={themeOption.id}
                onClick={() => {
                  setTheme(themeOption.id as Theme);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           transition-all duration-200 group relative overflow-hidden
                           ${theme === themeOption.id 
                             ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                             : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                           }`}
              >
                {/* Icon */}
                <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                  {themeOption.icon}
                </span>
                
                {/* Text */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{themeOption.name}</div>
                  <div className="opacity-60 text-xs capitalize">{themeOption.id} mode</div>
                </div>

                {/* Active indicator */}
                {theme === themeOption.id && (
                  <div className="bg-blue-500 rounded-full w-2 h-2 animate-pulse" />
                )}

                {/* Hover gradient effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 
                                transition-opacity duration-300 bg-gradient-to-r ${themeOption.color}`} />
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-4 py-2 border-gray-200/50 dark:border-gray-700/50 border-t">
            <p className="text-gray-500 dark:text-gray-400 text-xs text-center">
              Theme saved automatically 💾
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
