import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { themes, getThemeById } from '@/utils/themes';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useLocalStorage('captionflow-theme', 'studio-calm');
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = getThemeById(selectedTheme);

  // Apply theme to document root when selectedTheme changes
  useEffect(() => {
    const theme = getThemeById(selectedTheme);
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', theme.colors.primary);
      root.style.setProperty('--theme-secondary', theme.colors.secondary);
      root.style.setProperty('--theme-accent', theme.colors.accent);
      root.style.setProperty('--theme-background', theme.colors.background);
      root.style.setProperty('--theme-surface', theme.colors.surface);
    }
  }, [selectedTheme]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleThemeSelect = (themeId: string) => {
    console.log('Theme selected:', themeId);
    setSelectedTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-white/20 rounded-md bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
      >
        <Palette className="h-4 w-4" />
        <div
          className="w-3 h-3 rounded-full border border-white/30"
          style={{ backgroundColor: currentTheme?.colors.primary }}
        />
        <span className="hidden sm:inline">{currentTheme?.name}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-50">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-900">Choose Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => (
                <div key={theme.id} className="relative">
                  <button
                    onClick={() => handleThemeSelect(theme.id)}
                    onMouseEnter={() => setHoveredTheme(theme.id)}
                    onMouseLeave={() => setHoveredTheme(null)}
                    className={`relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 w-full ${
                      selectedTheme === theme.id
                        ? "border-gray-900 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`
                    }}
                  >
                    <div className="w-full h-8 rounded opacity-80" />
                    {selectedTheme === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                      </div>
                    )}
                  </button>
                  {hoveredTheme === theme.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                      {theme.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}