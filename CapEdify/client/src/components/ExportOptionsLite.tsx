// Simplified version of ExportOptions that focuses just on JSX export
import React, { useState, useEffect } from 'react';
import { exportEnhancedJSX, JSXStyle, getJSXStyles } from '@/api/video';
import { Caption } from '@/types';

interface ExportOptionsLiteProps {
  captions: Caption[];
  projectName: string;
  transcriptionId: string;
}

export function ExportOptionsLite({ captions, projectName, transcriptionId }: ExportOptionsLiteProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [jsxStyles, setJsxStyles] = useState<JSXStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [sceneMode, setSceneMode] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load available JSX styles on component mount
  useEffect(() => {
    const loadStyles = async () => {
      try {
        setMessage('Loading JSX styles...');
        const styles = await getJSXStyles();
        setJsxStyles(styles);
        setMessage('');
      } catch (err) {
        console.error('Error loading JSX styles:', err);
        setError('Failed to load JSX styles. Please try again.');
        setMessage('');
      }
    };
    
    loadStyles();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage('Exporting JSX...');
    setError('');
    
    try {
      console.log(`Exporting JSX with style: ${selectedStyle}, scene mode: ${sceneMode}`);
      
      const result = await exportEnhancedJSX(transcriptionId, {
        projectName,
        styleName: selectedStyle as 'modern' | 'minimal' | 'bold',
        sceneMode,
        captions
      });
      
      setMessage(sceneMode 
        ? 'Scene-based JSX files exported successfully!' 
        : 'JSX file downloaded successfully!');
      
      console.log('Export result:', result);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md mx-auto mb-8 p-6 rounded-xl max-w-md md:max-w-2xl overflow-hidden">
      <div className="mb-6">
        <h2 className="mb-4 font-bold text-xl">Export After Effects JSX</h2>
        
        {/* Style Selection */}
        <div className="mb-4">
          <label htmlFor="caption-style" className="block mb-1 font-medium text-gray-700 text-sm">Caption Style</label>
          <select 
            id="caption-style"
            name="caption-style"
            title="Select caption style"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="p-2 border border-gray-300 rounded-md w-full"
            disabled={isExporting}
            aria-describedby="style-description"
          >
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
            <option value="bold">Bold</option>
          </select>
          <p id="style-description" className="mt-1 text-gray-500 text-xs">Choose the visual style for your captions</p>
        </div>
        
        {/* Scene Mode Toggle */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="scene-mode"
            checked={sceneMode}
            onChange={(e) => setSceneMode(e.target.checked)}
            className="mr-2"
            disabled={isExporting}
          />
          <label htmlFor="scene-mode" className="text-gray-700 text-sm">
            Scene Detection Mode (Split by natural pauses)
          </label>
        </div>
        
        {/* Project Name */}
        <div className="mb-4">
          <label htmlFor="project-name" className="block mb-1 font-medium text-gray-700 text-sm">Project Name</label>
          <input
            id="project-name"
            name="project-name"
            type="text"
            title="Project name (read-only)"
            placeholder="Project name"
            value={projectName}
            readOnly
            className="bg-gray-50 p-2 border border-gray-300 rounded-md w-full"
            aria-describedby="project-description"
          />
          <p id="project-description" className="mt-1 text-gray-500 text-xs">The name of your caption project</p>
        </div>
        
        {/* Caption Count Info */}
        <div className="mb-4 text-gray-600 text-sm">
          {captions.length} captions will be exported
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md w-full font-medium text-white transition-colors disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Export to After Effects JSX'}
        </button>
        
        {/* Messages */}
        {message && (
          <div className="bg-green-50 mt-4 p-2 rounded text-green-800">
            {message}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 mt-4 p-2 rounded text-red-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportOptionsLite;
