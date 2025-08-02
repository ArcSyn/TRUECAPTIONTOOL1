'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { Loader2 } from 'lucide-react';

interface CompletedJob {
  id: string;
  name: string;
  duration: string;
  status: 'completed';
  transcriptionId?: string;
}

const formatOptions = ['jsx', 'srt', 'txrt', 'ytvv'];
const styleOptions = ['bold', 'modern', 'plain'];
const zipModes = ['individual', 'grouped', 'combined'];

export default function ExportOptionsTab() {
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobFormats, setJobFormats] = useState<Record<string, string[]>>({});
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const [jsxStyles, setJsxStyles] = useState<Record<string, string>>({});
  const [zipMode, setZipMode] = useState('grouped');
  const [compress, setCompress] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const { toast } = useToast();

  // Fetch completed jobs from backend
  useEffect(() => {
    const fetchCompletedJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/videos');
        if (!response.ok) {
          throw new Error('Failed to fetch completed jobs');
        }
        
        const data = await response.json();
        if (data.success && data.videos) {
          // Filter for completed transcription jobs only
          const completed = data.videos
            .filter((video: any) => video.status === 'uploaded' && video.transcriptionId)
            .map((video: any) => ({
              id: video.id,
              name: video.filename,
              duration: video.duration || 'Unknown',
              status: 'completed' as const,
              transcriptionId: video.transcriptionId
            }));
          
          setCompletedJobs(completed);
        }
      } catch (error) {
        console.error('Error fetching completed jobs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load completed jobs',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedJobs();
  }, [toast]);

  const toggleJob = (jobId: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const updateFormat = (jobId: string, format: string) => {
    setJobFormats((prev) => {
      const current = prev[jobId] || [];
      const updated = current.includes(format)
        ? current.filter((f) => f !== format)
        : [...current, format];
      return { ...prev, [jobId]: updated };
    });
  };

  const buildExportPayload = () => {
    if (selectedJobs.length === 0) {
      toast({
        title: 'No Jobs Selected',
        description: 'Please select at least one job to export',
        variant: 'destructive'
      });
      return null;
    }

    // Check if any selected jobs have formats
    const hasFormats = selectedJobs.some(jobId => jobFormats[jobId]?.length > 0);
    if (!hasFormats) {
      toast({
        title: 'No Formats Selected',
        description: 'Please select at least one format for your jobs',
        variant: 'destructive'
      });
      return null;
    }

    return {
      jobs: selectedJobs,
      formats: Array.from(new Set(selectedJobs.flatMap((id) => jobFormats[id] || []))),
      jsxStyle: jsxStyles[selectedJobs[0]] || 'bold',
      zipMode,
      compress,
      expiresInHours,
      renameMap: Object.fromEntries(
        Object.entries(renameMap).filter(([key, value]) => selectedJobs.includes(key) && value.trim())
      )
    };
  };

  const handleExport = async () => {
    const payload = buildExportPayload();
    if (!payload) return;

    try {
      setExporting(true);
      
      const response = await fetch('/api/export/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const result = await response.json();
      
      if (result.success && result.downloadUrl) {
        toast({
          title: 'Export Complete! 🎉',
          description: `Your export is ready. Download expires in ${expiresInHours} hours.`
        });

        // Trigger download
        window.open(result.downloadUrl, '_blank');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading completed jobs...
      </div>
    );
  }

  if (completedJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No completed transcription jobs found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete some video transcriptions first to use the Advanced Export feature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Advanced Export Options</h2>
        <div className="text-sm text-muted-foreground">
          {selectedJobs.length} of {completedJobs.length} jobs selected
        </div>
      </div>

      <div className="space-y-4">
        {completedJobs.map((job) => (
          <div key={job.id} className="border p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={selectedJobs.includes(job.id)} 
                  onCheckedChange={() => toggleJob(job.id)} 
                />
                <span className="font-medium">{job.name}</span>
                <span className="text-sm text-muted-foreground">({job.duration})</span>
              </Label>
              <Input
                placeholder="Rename file (optional)"
                value={renameMap[job.id] || ''}
                onChange={(e) => setRenameMap({ ...renameMap, [job.id]: e.target.value })}
                className="w-1/3"
                disabled={!selectedJobs.includes(job.id)}
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-3">
                {formatOptions.map((format) => (
                  <Label key={format} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={jobFormats[job.id]?.includes(format) || false}
                      onCheckedChange={() => updateFormat(job.id, format)}
                      disabled={!selectedJobs.includes(job.id)}
                    />
                    <span className="text-sm font-mono">.{format}</span>
                  </Label>
                ))}
              </div>

              <Select
                value={jsxStyles[job.id] || 'bold'}
                onValueChange={(val) => setJsxStyles({ ...jsxStyles, [job.id]: val })}
                disabled={!selectedJobs.includes(job.id) || !jobFormats[job.id]?.includes('jsx')}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="JSX Style" />
                </SelectTrigger>
                <SelectContent>
                  {styleOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <Label className="text-sm font-medium">ZIP Mode</Label>
            <Select value={zipMode} onValueChange={setZipMode}>
              <SelectTrigger className="w-[160px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual ZIPs</SelectItem>
                <SelectItem value="grouped">Grouped Folders</SelectItem>
                <SelectItem value="combined">Combined Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="compress"
              checked={compress} 
              onCheckedChange={(checked) => setCompress(checked as boolean)} 
            />
            <Label htmlFor="compress" className="text-sm font-medium">
              Enable Compression
            </Label>
          </div>

          <div>
            <Label className="text-sm font-medium">Expires In</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="1"
                max="168"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Math.max(1, Math.min(168, Number(e.target.value))))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </div>
        </div>
      </div>

      <Button 
        className="w-full" 
        onClick={handleExport}
        disabled={exporting || selectedJobs.length === 0}
      >
        {exporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Export...
          </>
        ) : (
          '🚀 Build Export ZIP'
        )}
      </Button>
    </div>
  );
}