import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Download, FileText, Eye, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface TranscriptionStatusProps {
  transcriptionId: string;
  videoTitle: string;
  onExportComplete?: (exports: any) => void;
}

interface TranscriptionData {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  error?: string;
  videos: {
    title: string;
  };
}

export function TranscriptionStatus({ 
  transcriptionId, 
  videoTitle,
  onExportComplete 
}: TranscriptionStatusProps) {
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exports, setExports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Poll for transcription status
  useEffect(() => {
    if (!transcriptionId) return;
    
    // Set start time for timeout tracking
    if (!startTime) {
      setStartTime(new Date());
    }

    const fetchTranscription = async () => {
      try {
        console.log(`🔍 Polling transcription status (attempt ${retryCount + 1})...`);
        
        const response = await fetch(`http://localhost:4000/api/transcribe/${transcriptionId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Transcription fetch failed:', errorText);
          
          // Increment retry count and show timeout if too many failures
          if (retryCount >= 10) {
            toast({
              variant: 'destructive',
              title: 'Transcription Timeout',
              description: 'Transcription is taking too long. Please try uploading a shorter video or try again later.'
            });
            setIsLoading(false);
            return;
          }
          
          setRetryCount(prev => prev + 1);
          return;
        }
        
        const data = await response.json();
          
          if (data.success) {
            const transcriptionData = data.transcription;
            setTranscription(transcriptionData);
            
            console.log(`📊 Status: ${transcriptionData.status} (${transcriptionData.progress}%)`);
            
            // Reset retry count on successful fetch
            setRetryCount(0);
            
            // Check for timeout on frontend side too
            if (transcriptionData.status === 'processing' && startTime) {
              const elapsedMinutes = (new Date().getTime() - startTime.getTime()) / (1000 * 60);
              
              if (elapsedMinutes > 5) {
                console.log('⚠️  Frontend timeout detected');
                toast({
                  variant: 'destructive',
                  title: 'Transcription Stalled',
                  description: 'Processing is taking longer than expected. Please try again with a shorter video.'
                });
                setIsLoading(false);
                return;
              }
              
              // Show progress message
              if (transcriptionData.progress === 50) {
                console.log('🤖 Still processing with Groq API...');
              }
            }
            
            // Stop polling if completed or error
            if (transcriptionData.status === 'completed') {
              console.log('✅ Transcription completed!');
              toast({
                title: 'Transcription Complete!',
                description: 'Your video has been successfully transcribed.'
              });
              setIsLoading(false);
            } else if (transcriptionData.status === 'error') {
              console.log('❌ Transcription failed');
              toast({
                variant: 'destructive',
                title: 'Transcription Failed',
                description: transcriptionData.error || 'An error occurred during transcription'
              });
              setIsLoading(false);
            }
          } else {
            const errorMsg = data.error || 'Failed to fetch transcription data';
            console.error('❌ Transcription fetch error:', errorMsg);
            
            if (retryCount >= 10) {
              toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: 'Unable to connect to transcription service after multiple attempts'
              });
              setIsLoading(false);
            } else {
              setRetryCount(prev => prev + 1);
            }
          }
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          
          if (retryCount >= 10) {
            toast({
              variant: 'destructive',
              title: 'Server Error',
              description: 'Server returned invalid data after multiple attempts'
            });
            setIsLoading(false);
          } else {
            setRetryCount(prev => prev + 1);
          }
        }
      } catch (networkError) {
        console.error('❌ Network error fetching transcription:', networkError);
        
        if (retryCount >= 10) {
          toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: 'Could not connect to the server after multiple attempts'
          });
          setIsLoading(false);
        } else {
          setRetryCount(prev => prev + 1);
        }
      }
    };

    fetchTranscription();

    // Poll every 3 seconds if still processing (increased from 2s to reduce load)
    const interval = setInterval(() => {
      if (transcription?.status === 'completed' || transcription?.status === 'error') {
        clearInterval(interval);
        setIsLoading(false);
        return;
      }
      
      // Show different messages based on progress
      if (transcription?.progress === 50) {
        console.log('⏳ Still transcribing with Groq API... (this may take 1-3 minutes)');
      }
      
      fetchTranscription();
    }, 3000);

    return () => clearInterval(interval);
  }, [transcriptionId, transcription?.status, retryCount, startTime]);

  const handleExport = async (formats: string[] = ['srt', 'jsx', 'vtt']) => {
    if (!transcription || transcription.status !== 'completed') return;

    setIsExporting(true);
    try {
      const response = await fetch(`http://localhost:4000/api/export/${transcriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formats })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed:', errorText);
        toast({
          variant: 'destructive',
          description: `Export request failed: ${errorText}`
        });
        return;
      }
      
      try {
        const data = await response.json();
        
        if (data.success) {
          setExports(data.exports);
          onExportComplete?.(data.exports);
          
          toast({
            description: `Generated ${Object.keys(data.exports).length} caption formats`,
          });
        } else {
          const errorMsg = data.error || 'Export failed';
          console.error('Export error:', errorMsg);
          toast({
            variant: 'destructive',
            description: errorMsg
          });
        }
      } catch (parseError) {
        console.error('JSON parse error in export:', parseError);
        toast({
          variant: 'destructive',
          description: 'Invalid response from server - unable to parse export data'
        });
      }
    } catch (networkError) {
      console.error('Network error during export:', networkError);
      toast({
        variant: 'destructive',
        description: 'Could not connect to the server for export'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (downloadUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `http://localhost:4000${downloadUrl}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = () => {
    switch (transcription?.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (transcription?.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!transcription) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading transcription status...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-lg">{videoTitle}</h3>
            <Badge className={cn(getStatusColor())}>
              {transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {transcription.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Transcribing audio...</span>
            <span>{transcription.progress}%</span>
          </div>
          <Progress value={transcription.progress} className="w-full" />
        </div>
      )}

      {/* Error Message */}
      {transcription.status === 'error' && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-lg">
          <p className="text-red-700">
            <strong>Error:</strong> {transcription.error || 'Transcription failed'}
          </p>
        </div>
      )}

      {/* Completion Info */}
      {transcription.status === 'completed' && transcription.result && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
            <p className="text-green-700">
              ✅ Transcription completed! Found {transcription.result.segments?.length || 0} segments.
            </p>
          </div>

          {/* Preview Text */}
          <div className="space-y-2">
            <h4 className="flex items-center space-x-2 font-medium">
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-gray-700 text-sm">
                {transcription.result.text?.substring(0, 200)}
                {transcription.result.text && transcription.result.text.length > 200 && '...'}
              </p>
            </div>
          </div>

          {/* Export Section */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="flex items-center space-x-2 font-medium">
              <FileText className="w-4 h-4" />
              <span>Export Captions</span>
            </h4>
            
            {!exports ? (
              <div className="gap-3 grid grid-cols-1 md:grid-cols-3">
                <Button
                  onClick={() => handleExport(['srt'])}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting ? <RefreshCw className="mr-2 w-4 h-4 animate-spin" /> : <Download className="mr-2 w-4 h-4" />}
                  SRT (Premiere/DaVinci)
                </Button>
                
                <Button
                  onClick={() => handleExport(['jsx'])}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting ? <RefreshCw className="mr-2 w-4 h-4 animate-spin" /> : <Download className="mr-2 w-4 h-4" />}
                  JSX (After Effects)
                </Button>
                
                <Button
                  onClick={() => handleExport(['vtt'])}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isExporting ? <RefreshCw className="mr-2 w-4 h-4 animate-spin" /> : <Download className="mr-2 w-4 h-4" />}
                  VTT (Web Player)
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-green-600 text-sm">✅ Export files ready for download:</p>
                <div className="gap-2 grid grid-cols-1 md:grid-cols-3">
                  {Object.entries(exports).map(([format, fileInfo]: [string, any]) => (
                    <Button
                      key={format}
                      onClick={() => downloadFile(fileInfo.downloadUrl, fileInfo.filename)}
                      variant="default"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="mr-2 w-4 h-4" />
                      {format.toUpperCase()} ({Math.round(fileInfo.size / 1024)}KB)
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate All Formats */}
            {!exports && (
              <Button
                onClick={() => handleExport(['srt', 'jsx', 'vtt', 'fcpxml', 'ass'])}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Download className="mr-2 w-4 h-4" />
                )}
                Generate All Formats
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
