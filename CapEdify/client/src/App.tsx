import React from 'react';
import { Home } from './pages/Home';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
      <header className="top-0 z-50 sticky bg-white/95 dark:bg-gray-900/95 backdrop-blur border-gray-200 dark:border-gray-700 border-b w-full">
        <div className="flex items-center mx-auto px-4 max-w-6xl h-14 container">
          <div className="flex flex-1 justify-between md:justify-end items-center space-x-2">
            <h1 className="font-bold text-lg">CapEdify</h1>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <Home />
    </div>
  );
}

export default App;

