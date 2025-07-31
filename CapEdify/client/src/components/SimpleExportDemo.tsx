import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const API_BASE_URL = 'http://localhost:4000/api';

interface PipelineJob {
  jobId: string;
  filename: string;
  inputType: string;
  duration: number;
  style: string;
  position: string;
  availableFormats: string[];
  createdAt: string;
  completedAt: string;
}

interface Theme {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
}

export function SimpleExportDemo() {
  const [jsxStyle, setJsxStyle] = useState<'bold' | 'modern' | 'plain'>('modern');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['jsx']);
  const [selectedTheme, setSelectedTheme] = useState<string>('minimal_clean');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [availableJobs, setAvailableJobs] = useState<PipelineJob[]>([]);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<string>('');

  // Fetch available jobs and themes on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch completed pipeline jobs
      const jobsResponse = await fetch(`${API_BASE_URL}/export/jobs`, {
        headers: {
          'X-User-ID': '550e8400-e29b-41d4-a716-446655440000'
        }
      });
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setAvailableJobs(jobsData.jobs || []);
      }

      // Fetch available themes
      const themesResponse = await fetch(`${API_BASE_URL}/export/themes`);
      
      if (themesResponse.ok) {
        const themesData = await themesResponse.json();
        // Flatten themes by category
        const allThemes = Object.values(themesData.themes || {}).flat() as Theme[];
        setAvailableThemes(allThemes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setResult('❌ Failed to load jobs and themes');
    } finally {
      setIsLoading(false);
    }
  };

  const testExport = async () => {
    if (selectedJobs.length === 0) {
      setResult('❌ Please select at least one completed job to export');
      return;
    }

    setIsExporting(true);
    setResult('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/export/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify({
          jobs: selectedJobs,
          formats: selectedFormats,
          theme: selectedTheme,
          jsxStyle,
          zipMode: 'grouped',
          compress: false,
          expiresInHours: 24
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ Export started successfully! Export ID: ${data.exportId}\n📥 Status URL: ${data.statusUrl}\n⏰ Expires at: ${new Date(data.expiresAt).toLocaleString()}`);
      } else {
        setResult(`❌ Export failed: ${data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Network error: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6 max-w-4xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading pipeline jobs and themes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Advanced Export System - Real Data Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Job Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Select Completed Pipeline Jobs ({availableJobs.length} available):
          </label>
          {availableJobs.length === 0 ? (
            <div className="p-4 rounded bg-gray-50 border border-gray-200 text-center">
              <p className="text-gray-600 mb-2">No completed pipeline jobs found</p>
              <p className="text-sm text-gray-500">
                Process some videos through the pipeline first to have jobs available for export
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
              {availableJobs.map(job => (
                <div
                  key={job.jobId}
                  onClick={() => toggleJobSelection(job.jobId)}
                  className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                    selectedJobs.includes(job.jobId)
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.jobId)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <span className="font-medium">{job.filename}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded uppercase">
                          {job.inputType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Duration: {job.duration}min • Style: {job.style} • 
                        Completed: {new Date(job.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedJobs.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✅ {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Caption Theme:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableThemes.map(theme => (
              <button
                key={theme.name}
                onClick={() => setSelectedTheme(theme.name)}
                className={`p-3 border rounded text-left transition-colors ${
                  selectedTheme === theme.name
                    ? 'bg-purple-50 border-purple-500'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{theme.display_name}</div>
                <div className="text-xs text-gray-600 mt-1">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Export Formats:</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {['jsx', 'srt', 'vtt', 'txt', 'json'].map(format => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={`p-2 border rounded text-sm uppercase font-mono transition-colors ${
                  selectedFormats.includes(format)
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* JSX Style Selection */}
        {selectedFormats.includes('jsx') && (
          <div>
            <label className="block text-sm font-medium mb-2">JSX Style Preset:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bold', 'modern', 'plain'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setJsxStyle(style)}
                  className={`p-2 border rounded text-sm capitalize transition-colors ${
                    jsxStyle === style
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={testExport}
          disabled={isExporting || selectedFormats.length === 0 || selectedJobs.length === 0}
          className="w-full"
          size="lg"
        >
          {isExporting 
            ? 'Creating Export Bundle...' 
            : `Create Export Bundle (${selectedJobs.length} job${selectedJobs.length !== 1 ? 's' : ''}, ${selectedFormats.length} format${selectedFormats.length !== 1 ? 's' : ''})`
          }
        </Button>

        {(selectedFormats.length === 0 || selectedJobs.length === 0) && (
          <div className="p-3 rounded text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">
            ⚠️ Please select at least one job and one export format
          </div>
        )}

        {result && (
          <div className={`p-3 rounded text-sm whitespace-pre-line ${
            result.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {result}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
          <p><strong>Status:</strong> Jobs: {selectedJobs.length}, Formats: {selectedFormats.join(', ') || 'None'}, Theme: {selectedTheme}</p>
          <p><strong>What this does:</strong> Creates a ZIP bundle with your selected jobs in the chosen formats, applying the selected theme and JSX style.</p>
          <p><strong>File expiry:</strong> 24 hours after creation</p>
        </div>
      </CardContent>
    </Card>
  );
}