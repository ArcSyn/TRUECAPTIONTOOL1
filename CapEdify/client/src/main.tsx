if (import.meta.env.DEV) {
  import('react-devtools');
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { BatchProcessingDemo } from "./components/BatchProcessingDemo";
import ExportOptionsTab from "./components/ExportOptionsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary componentName="Application Root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary componentName="Main App">
              <App />
            </ErrorBoundary>
          } />
          <Route path="/demo" element={
            <ErrorBoundary componentName="Demo Page">
              <BatchProcessingDemo />
            </ErrorBoundary>
          } />
          <Route path="/export" element={
            <ErrorBoundary componentName="Advanced Export">
              <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 min-h-screen">
                <div className="mx-auto py-8 max-w-6xl">
                  <div className="mb-8 text-center">
                    <h1 className="bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 mb-3 font-bold text-transparent text-4xl">
                      📦 Advanced Export System
                    </h1>
                    <p className="text-purple-200 text-lg">
                      Export multiple completed jobs in various formats
                    </p>
                  </div>
                  <div className="bg-black/20 shadow-2xl backdrop-blur-xl border border-purple-500/20 rounded-3xl">
                    <ExportOptionsTab />
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);