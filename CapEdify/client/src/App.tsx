import React from 'react';
import { Home } from './pages/Home';
import { ThemeDropdown } from './components/ThemeDropdown';

function App() {
  // Always show the real tool UI with the theme dropdown in the header
  return (
    <div className="bg-background min-h-screen text-foreground transition-all duration-300">
      <header className="top-0 z-50 sticky bg-background/95 backdrop-blur border-b border-border w-full">
        <div className="flex items-center mx-auto px-4 max-w-6xl h-14 container">
          <div className="flex flex-1 justify-between md:justify-end items-center space-x-4">
            <h1 className="font-bold text-lg">CapEdify</h1>
            <ThemeDropdown />
          </div>
        </div>
      </header>
      <Home />
    </div>
  );
}

export default App;

