import React, { useState, useEffect } from 'react';
import { X, Download, Package, CheckCircle, Loader2, FileText, Video, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const API_BASE_URL = 'http://localhost:4000/api';

interface JobExportModalProps {
  jobId: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
}

interface ExportJob {
  exportId: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'srt',
    name: 'SRT Subtitles',
    description: 'Standard subtitle format for video players',
    icon: <Video className="w-4 h-4" />,
    fileExtension: '.srt'
  },
  {
    id: 'vtt',
    name: 'VTT Captions',
    description: 'Web-compatible caption format',
    icon: <FileText className="w-4 h-4" />,
    fileExtension: '.vtt'
  },
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text transcript',
    icon: <FileText className="w-4 h-4" />,
    fileExtension: '.txt'
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Structured data with timestamps',
    icon: <Package className="w-4 h-4" />,
    fileExtension: '.json'
  },
  {
    id: 'csv',
    name: 'CSV Export',
    description: 'Spreadsheet-compatible format',
    icon: <Package className="w-4 h-4" />,
    fileExtension: '.csv'
  }
];

const THEMES = [
  { id: 'default', name: 'Default', description: 'Standard styling' },
  { id: 'netflix', name: 'Netflix Style', description: 'Clean, modern subtitles' },
  { id: 'youtube', name: 'YouTube Style', description: 'Familiar social media style' },
  { id: 'accessibility', name: 'High Contrast', description: 'Optimized for accessibility' }
];

export function JobExportModal({ jobId, jobTitle, isOpen, onClose }: JobExportModalProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['srt', 'vtt']);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [exportJobs, setExportJobs] = useState<Record<string, ExportJob>>({});
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const toggleFormat = (formatId: string) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const startExport = async () => {
    if (selectedFormats.length === 0) {
      toast({
        title: 'No Formats Selected',
        description: 'Please select at least one export format.',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);

    try {
      // Start export jobs for each selected format
      const exportPromises = selectedFormats.map(async (format) => {
        const response = await fetch(`${API_BASE_URL}/export/custom`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pipelineJobId: jobId,
            formats: [format],
            theme: selectedTheme,
            zipMode: 'individual',
            compress: false
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start ${format} export: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || `Export failed for ${format}`);
        }

        return {
          format,
          exportId: result.exportId,
          status: 'processing' as const,
          progress: 0
        };
      });

      const results = await Promise.all(exportPromises);
      
      // Update export jobs state
      const newExportJobs: Record<string, ExportJob> = {};
      results.forEach(result => {
        newExportJobs[result.format] = result;
      });
      setExportJobs(newExportJobs);

      toast({
        title: 'Export Started',
        description: `Starting export for ${selectedFormats.length} format(s)`,
      });

      // Start polling for each export job
      results.forEach(result => {
        pollExportStatus(result.exportId, result.format);
      });

    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to start export process',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const pollExportStatus = async (exportId: string, format: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setExportJobs(prev => ({
          ...prev,
          [format]: {
            ...prev[format],
            status: 'failed',
            error: 'Export timeout'
          }
        }));
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/export/status/${exportId}`);
        
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          setExportJobs(prev => ({
            ...prev,
            [format]: {
              exportId,
              format,
              status: result.status,
              progress: result.progress || 0,
              downloadUrl: result.status === 'completed' ? `${API_BASE_URL}/export/download/${exportId}` : undefined,
              error: result.error
            }
          }));

          if (result.status === 'completed') {
            toast({
              title: `${format.toUpperCase()} Export Complete`,
              description: 'Your caption file is ready for download!',
            });
            return; // Stop polling
          } else if (result.status === 'failed') {
            toast({
              title: `${format.toUpperCase()} Export Failed`,
              description: result.error || 'Export process failed',
              variant: 'destructive'
            });
            return; // Stop polling
          }
        }

        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const downloadFile = async (exportJob: ExportJob) => {
    if (!exportJob.downloadUrl) return;

    try {
      const response = await fetch(exportJob.downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const format = EXPORT_FORMATS.find(f => f.id === exportJob.format);
      const filename = `${jobTitle}_captions${format?.fileExtension || '.txt'}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `${filename} download has begun.`,
      });

    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download file. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Export Captions</span>
              </CardTitle>
              <CardDescription>
                Choose formats and styling for: {jobTitle}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="font-medium mb-3">Select Export Formats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXPORT_FORMATS.map((format) => (
                <Card 
                  key={format.id}
                  className={cn(
                    "cursor-pointer transition-colors border-2",
                    selectedFormats.includes(format.id) 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => toggleFormat(format.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        checked={selectedFormats.includes(format.id)}
                        readOnly
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {format.icon}
                          <span className="font-medium">{format.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{format.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <h3 className="font-medium mb-3">Caption Theme</h3>
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    <div>
                      <div className="font-medium">{theme.name}</div>
                      <div className="text-sm text-gray-500">{theme.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Status */}
          {Object.keys(exportJobs).length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Export Progress</h3>
              <div className="space-y-3">
                {Object.values(exportJobs).map((job) => {
                  const format = EXPORT_FORMATS.find(f => f.id === job.format);
                  return (
                    <Card key={job.format} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {format?.icon}
                          <div>
                            <div className="font-medium">{format?.name}</div>
                            <div className="text-sm text-gray-600">
                              {job.status === 'processing' && `${job.progress}% complete`}
                              {job.status === 'completed' && 'Ready for download'}
                              {job.status === 'failed' && `Failed: ${job.error}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {job.status === 'processing' && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                          {job.status === 'completed' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <Button 
                                size="sm" 
                                onClick={() => downloadFile(job)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </>
                          )}
                          {job.status === 'failed' && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      </div>

                      {job.status === 'processing' && (
                        <Progress value={job.progress} className="mt-2" />
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={startExport}
              disabled={isExporting || selectedFormats.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Export...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Export {selectedFormats.length} Format{selectedFormats.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}