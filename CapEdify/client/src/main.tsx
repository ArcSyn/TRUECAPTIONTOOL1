import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { BatchProcessingDemo } from "./components/BatchProcessingDemo";
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
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
