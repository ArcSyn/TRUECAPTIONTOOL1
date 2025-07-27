// src/components/ThemeDemo.tsx
import React from 'react';
import { ThemeSelector } from './ThemeSelector';

export function ThemeDemo() {
  return (
    <div className="bg-background p-8 min-h-screen text-foreground transition-all duration-300">
      <div className="space-y-8 mx-auto max-w-4xl">
        {/* Header */}
        <header className="text-center">
          <h1 className="bg-clip-text bg-gradient-to-r from-primary to-secondary mb-2 font-bold text-transparent text-4xl">
            🎨 Theme Selector Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Experience our comprehensive theme system with 4 beautiful themes
          </p>
        </header>

        {/* Theme Selector */}
        <div className="flex justify-center">
          <ThemeSelector />
        </div>

        {/* Demo Content */}
        <div className="gap-6 grid md:grid-cols-2">
          {/* Card 1 */}
          <div className="bg-card shadow-lg p-6 border border-border rounded-lg text-card-foreground">
            <h3 className="mb-3 font-semibold text-xl">📋 Sample Content</h3>
            <p className="mb-4 text-muted-foreground">
              This card demonstrates how themes affect background colors, text contrast, 
              and border styling across different components.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full w-3 h-3"></div>
                <span className="text-sm">Primary color indicator</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-secondary rounded-full w-3 h-3"></div>
                <span className="text-sm">Secondary color indicator</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card shadow-lg p-6 border border-border rounded-lg text-card-foreground">
            <h3 className="mb-3 font-semibold text-xl">🚀 Interactive Elements</h3>
            <div className="space-y-3">
              <button className="bg-primary hover:opacity-90 px-4 py-2 rounded-md w-full text-primary-foreground transition-opacity">
                Primary Button
              </button>
              <button className="bg-secondary hover:opacity-90 px-4 py-2 rounded-md w-full text-secondary-foreground transition-opacity">
                Secondary Button
              </button>
              <input 
                type="text" 
                placeholder="Type something..."
                className="bg-background px-4 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring w-full"
              />
            </div>
          </div>
        </div>

        {/* Theme Descriptions */}
        <div className="gap-4 grid md:grid-cols-4 mt-8">
          <div className="bg-card p-4 border border-border rounded-lg text-center">
            <div className="mb-2 text-2xl">☀️</div>
            <h4 className="font-medium">Light Theme</h4>
            <p className="text-muted-foreground text-sm">Clean and professional</p>
          </div>
          <div className="bg-card p-4 border border-border rounded-lg text-center">
            <div className="mb-2 text-2xl">🌙</div>
            <h4 className="font-medium">Dark Theme</h4>
            <p className="text-muted-foreground text-sm">Easy on the eyes</p>
          </div>
          <div className="bg-card p-4 border border-border rounded-lg text-center">
            <div className="mb-2 text-2xl">⚡</div>
            <h4 className="font-medium">Neon Theme</h4>
            <p className="text-muted-foreground text-sm">Cyberpunk vibes</p>
          </div>
          <div className="bg-card p-4 border border-border rounded-lg text-center">
            <div className="mb-2 text-2xl">🔮</div>
            <h4 className="font-medium">Mystic Theme</h4>
            <p className="text-muted-foreground text-sm">Magical gradients</p>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-card p-6 border border-border rounded-lg text-card-foreground">
          <h3 className="mb-4 font-semibold text-xl">✨ Theme System Features</h3>
          <div className="gap-4 grid md:grid-cols-2">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="bg-green-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">Persistent localStorage</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-green-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">Smooth transitions</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-green-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">4 unique themes</span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="bg-blue-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">TypeScript support</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-blue-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">Tailwind integration</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-blue-500 rounded-full w-2 h-2"></span>
                <span className="text-sm">Easy to extend</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
