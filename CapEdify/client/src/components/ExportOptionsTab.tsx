import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Package, Settings, Palette, Save, Trash2, Clock, FileVideo, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const API_BASE_URL = 'http://localhost:4000/api';

interface PipelineJob {
  jobId: string;
  filename: string;
  inputType: 'video' | 'srt';
  duration: number;
  style: string;
  position: string;
  availableFormats: string[];
  createdAt: string;
  completedAt: string;
}

interface ExportTheme {
  id: string;
  name: string;
  display_name: string;
  description: string;
  theme_config: object;
  category: string;
  preview_image_url?: string;
}

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  config_json: {
    formats: string[];
    theme: string;
    jsxStyle?: string;
    zipMode: string;
    compress: boolean;
  };
  created_at: string;
}

interface CustomExport {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  downloadUrl?: string;
  zipSize?: number;
  errorMessage?: string;
}

export function ExportOptionsTab() {
  // State management
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [themes, setThemes] = useState<Record<string, ExportTheme[]>>({});
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [exports, setExports] = useState<CustomExport[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedFormats, setSelectedFormats] = useState<Record<string, string[]>>({});
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  // Export configuration
  const [selectedTheme, setSelectedTheme] = useState('minimal_clean');
  const [jsxStyle, setJsxStyle] = useState<'bold' | 'modern' | 'plain'>('modern');
  const [zipMode, setZipMode] = useState<'individual' | 'grouped' | 'combined'>('grouped');
  const [compress, setCompress] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);

  // Preset management
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);

  // UI state
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadJobs(),
        loadThemes(),
        loadPresets(),
        loadRecentExports()
      ]);
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load export data. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export/jobs`, {
        headers: { 'X-User-ID': 'demo-user-123' }
      });
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
        
        // Initialize format selection
        const initialFormats: Record<string, string[]> = {};
        data.jobs.forEach((job: PipelineJob) => {
          initialFormats[job.jobId] = ['jsx']; // Default to JSX
        });
        setSelectedFormats(initialFormats);
      }
    } catch (error) {
      console.error('❌ Failed to load jobs:', error);
    }
  };

  const loadThemes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export/themes`);
      const data = await response.json();
      
      if (data.success) {
        setThemes(data.themes);
      }
    } catch (error) {
      console.error('❌ Failed to load themes:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export/presets`, {
        headers: { 'X-User-ID': 'demo-user-123' }
      });
      const data = await response.json();
      
      if (data.success) {
        setPresets(data.presets);
      }
    } catch (error) {
      console.error('❌ Failed to load presets:', error);
    }
  };

  const loadRecentExports = async () => {
    // For now, just initialize empty - would load from /api/export/recent
    setExports([]);
  };

  // Job selection handlers
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const selectAllJobs = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.jobId)));
    }
  };

  // Format selection handlers
  const toggleFormat = (jobId: string, format: string) => {
    setSelectedFormats(prev => {
      const jobFormats = prev[jobId] || [];
      const newFormats = jobFormats.includes(format)
        ? jobFormats.filter(f => f !== format)
        : [...jobFormats, format];
      
      return { ...prev, [jobId]: newFormats };
    });
  };

  const setAllFormats = (format: string, enabled: boolean) => {
    setSelectedFormats(prev => {
      const updated = { ...prev };
      jobs.forEach(job => {
        if (job.availableFormats.includes(format)) {
          const jobFormats = updated[job.jobId] || [];
          if (enabled && !jobFormats.includes(format)) {
            updated[job.jobId] = [...jobFormats, format];
          } else if (!enabled) {
            updated[job.jobId] = jobFormats.filter(f => f !== format);
          }
        }
      });
      return updated;
    });
  };

  // Export creation
  const createExport = async () => {
    if (selectedJobs.size === 0) {
      toast({
        title: 'No Jobs Selected',
        description: 'Please select at least one job to export.',
        variant: 'destructive'
      });
      return;
    }

    // Get all selected formats
    const allFormats = new Set<string>();
    Array.from(selectedJobs).forEach(jobId => {
      (selectedFormats[jobId] || []).forEach(format => allFormats.add(format));
    });

    if (allFormats.size === 0) {
      toast({
        title: 'No Formats Selected',
        description: 'Please select at least one format to export.',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/export/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify({
          jobs: Array.from(selectedJobs),
          formats: Array.from(allFormats),
          theme: selectedTheme,
          jsxStyle,
          zipMode,
          compress,
          expiresInHours,
          renameMap
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Export Started! 🎉',
          description: `Your export is being processed. It will be ready in ${data.estimatedCompletion}.`
        });

        // Add to exports list for tracking
        const newExport: CustomExport = {
          exportId: data.exportId,
          status: 'processing',
          createdAt: new Date().toISOString(),
          expiresAt: data.expiresAt
        };
        setExports(prev => [newExport, ...prev]);

        // Start polling for status
        pollExportStatus(data.exportId);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('❌ Export creation failed:', error);
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Export status polling
  const pollExportStatus = async (exportId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/export/status/${exportId}`, {
          headers: { 'X-User-ID': 'demo-user-123' }
        });
        const data = await response.json();
        
        if (data.success) {
          setExports(prev => prev.map(exp => 
            exp.exportId === exportId ? { ...exp, ...data } : exp
          ));

          if (data.status === 'completed') {
            toast({
              title: 'Export Complete! ✅',
              description: 'Your export is ready for download.'
            });
          } else if (data.status === 'failed') {
            toast({
              title: 'Export Failed',
              description: data.errorMessage || 'Export processing failed.',
              variant: 'destructive'
            });
          } else if (data.status === 'processing') {
            // Continue polling
            setTimeout(poll, 3000);
          }
        }
      } catch (error) {
        console.error('❌ Status polling failed:', error);
      }
    };

    poll();
  };

  // Preset management
  const savePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the preset.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const allFormats = new Set<string>();
      Object.values(selectedFormats).forEach(formats => {
        formats.forEach(format => allFormats.add(format));
      });

      const response = await fetch(`${API_BASE_URL}/export/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify({
          name: presetName,
          description: presetDescription,
          config: {
            formats: Array.from(allFormats),
            theme: selectedTheme,
            jsxStyle,
            zipMode,
            compress
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPresets(prev => [data.preset, ...prev]);
        setPresetName('');
        setPresetDescription('');
        setShowPresetForm(false);
        
        toast({
          title: 'Preset Saved! 💾',
          description: `Export preset "${presetName}" has been saved.`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('❌ Preset save failed:', error);
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const loadPreset = (preset: ExportPreset) => {
    const config = preset.config_json;
    setSelectedTheme(config.theme);
    if (config.jsxStyle) setJsxStyle(config.jsxStyle as any);
    setZipMode(config.zipMode as any);
    setCompress(config.compress);
    
    // Apply formats to all jobs
    setSelectedFormats(prev => {
      const updated = { ...prev };
      jobs.forEach(job => {
        updated[job.jobId] = config.formats.filter(format => 
          job.availableFormats.includes(format)
        );
      });
      return updated;
    });

    toast({
      title: 'Preset Loaded! 📋',
      description: `Applied settings from "${preset.name}".`
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64 space-x-2")}>
        <RefreshCw className={cn("w-6 h-6 animate-spin")} />
        <span>Loading export options...</span>
      </div>
    );
  }

  return (
    <div className={cn("max-w-6xl mx-auto p-6 space-y-6")}>
      <div className={cn("space-y-2")}>
        <h1 className={cn("text-3xl font-bold")}>Advanced Export Center</h1>
        <p className={cn("text-muted-foreground")}>
          Create custom export bundles with multiple formats, themes, and organization options.
        </p>
      </div>

      <Tabs defaultValue="jobs" className={cn("w-full")}>
        <TabsList className={cn("grid w-full grid-cols-5")}>
          <TabsTrigger value="jobs">Jobs & Formats</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Jobs</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="exports">Recent Exports</TabsTrigger>
        </TabsList>

        {/* Jobs & Format Selection */}
        <TabsContent value="jobs" className={cn("space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center space-x-2")}>
                <FileVideo className={cn("w-5 h-5")} />
                <span>Select Jobs & Formats</span>
                <Badge variant="secondary">{jobs.length} completed jobs</Badge>
              </CardTitle>
              <CardDescription>
                Choose which completed jobs to include and select the formats you want to export.
              </CardDescription>
            </CardHeader>
            <CardContent className={cn("space-y-4")}>
              {/* Format selection controls */}
              <div className={cn("flex flex-wrap gap-2 p-3 bg-muted rounded-lg")}>
                <Label className={cn("text-sm font-medium")}>Quick Format Selection:</Label>
                {['jsx', 'srt', 'vtt', 'json', 'txt'].map(format => (
                  <div key={format} className={cn("flex items-center space-x-1")}>
                    <Checkbox
                      id={`format-${format}`}
                      onCheckedChange={(checked) => setAllFormats(format, !!checked)}
                    />
                    <Label htmlFor={`format-${format}`} className={cn("text-xs uppercase")}>
                      {format}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Job selection */}
              <div className={cn("space-y-2")}>
                <div className={cn("flex items-center justify-between")}>
                  <Label className={cn("text-sm font-medium")}>
                    Available Jobs ({selectedJobs.size} selected)
                  </Label>
                  <Button variant="outline" size="sm" onClick={selectAllJobs}>
                    {selectedJobs.size === jobs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className={cn("space-y-2 max-h-64 overflow-y-auto")}>
                  {jobs.map(job => (
                    <Card key={job.jobId} className={cn("p-3")}>
                      <div className={cn("flex items-start space-x-3")}>
                        <Checkbox
                          checked={selectedJobs.has(job.jobId)}
                          onCheckedChange={() => toggleJobSelection(job.jobId)}
                        />
                        <div className={cn("flex-1 space-y-2")}>
                          <div className={cn("flex items-center justify-between")}>
                            <h4 className={cn("font-medium")}>{job.filename}</h4>
                            <Badge variant="outline"> 
                              {job.duration.toFixed(1)}min • {job.style}
                            </Badge>
                          </div>
                          
                          <div className={cn("flex flex-wrap gap-2")}>
                            {job.availableFormats.map(format => (
                              <div key={format} className={cn("flex items-center space-x-1")}>
                                <Checkbox
                                  id={`${job.jobId}-${format}`}
                                  checked={(selectedFormats[job.jobId] || []).includes(format)}
                                  onCheckedChange={() => toggleFormat(job.jobId, format)}
                                  disabled={!selectedJobs.has(job.jobId)}
                                />
                                <Label 
                                  htmlFor={`${job.jobId}-${format}`}
                                  className={cn("text-xs uppercase font-mono", {
                                    "text-muted-foreground": !selectedJobs.has(job.jobId)
                                  })}
                                >
                                  {format}
                                </Label>
                              </div>
                            ))}
                          </div>

                          {selectedJobs.has(job.jobId) && (
                            <Input
                              placeholder={`Rename: ${job.filename}`}
                              value={renameMap[job.jobId] || ''}
                              onChange={(e) => setRenameMap(prev => ({
                                ...prev,
                                [job.jobId]: e.target.value
                              }))}
                              className={cn("text-xs")}
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline Jobs */}
        <TabsContent value="pipeline" className={cn("space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center space-x-2")}>
                <FileVideo className={cn("w-5 h-5")} />
                <span>Recent Pipeline Jobs</span>
              </CardTitle>
              <CardDescription>
                Import completed pipeline jobs for caption export. These are videos you've already processed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-center py-8 text-muted-foreground")}>
                <div className={cn("mb-4")}>
                  <Package className={cn("w-12 h-12 mx-auto mb-2 opacity-50")} />
                </div>
                <h3 className={cn("font-medium mb-2")}>No Recent Pipeline Jobs</h3>
                <p className={cn("text-sm")}>
                  Process some videos first, then come back here to export them in different caption formats.
                </p>
                <p className={cn("text-sm mt-2")}>
                  Or use the main processing page to upload and process videos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Selection */}
        <TabsContent value="themes" className={cn("space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center space-x-2")}>
                <Palette className={cn("w-5 h-5")} />
                <span>Caption Themes & Styles</span>
              </CardTitle>
              <CardDescription>
                Choose a visual theme and JSX style for your exported captions.
              </CardDescription>
            </CardHeader>
            <CardContent className={cn("space-y-6")}>
              {/* JSX Style Selection */}
              <div className={cn("space-y-3")}>
                <Label className={cn("text-base font-medium")}>JSX Style Presets</Label>
                <p className={cn("text-sm text-muted-foreground")}>
                  These styles only apply to JSX format exports.
                </p>
                <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3")}>
                  {[
                    { value: 'bold', label: 'Bold', description: 'Heavy weight with gold border for high impact' },
                    { value: 'modern', label: 'Modern', description: 'Clean styling with subtle blur backdrop' },
                    { value: 'plain', label: 'Plain', description: 'Simple, minimal styling for basic captions' }
                  ].map(style => (
                    <Card 
                      key={style.value}
                      className={cn("p-3 cursor-pointer transition-all", {
                        "ring-2 ring-primary bg-primary/5": jsxStyle === style.value
                      })}
                      onClick={() => setJsxStyle(style.value as any)}
                    >
                      <h4 className={cn("font-medium")}>{style.label}</h4>
                      <p className={cn("text-xs text-muted-foreground mt-1")}>{style.description}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Theme Selection */}
              <div className={cn("space-y-3")}>
                <Label className={cn("text-base font-medium")}>Caption Themes</Label>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}>
                  {Object.entries(themes).map(([category, categoryThemes]) => (
                    <div key={category} className={cn("space-y-2")}>
                      <Label className={cn("text-sm font-medium capitalize")}>{category} Themes</Label>
                      <div className={cn("space-y-2")}>
                        {categoryThemes.map(theme => (
                          <Card 
                            key={theme.id}
                            className={cn("p-3 cursor-pointer transition-all", {
                              "ring-2 ring-primary": selectedTheme === theme.name
                            })}
                            onClick={() => setSelectedTheme(theme.name)}
                          >
                            <h4 className={cn("font-medium")}>{theme.display_name}</h4>
                            <p className={cn("text-xs text-muted-foreground")}>{theme.description}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Presets */}
        <TabsContent value="presets" className={cn("space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center space-x-2")}>
                <Save className={cn("w-5 h-5")} />
                <span>Export Presets</span>
              </CardTitle>
              <CardDescription>
                Save and reuse your favorite export configurations.
              </CardDescription>
            </CardHeader>
            <CardContent className={cn("space-y-4")}>
              <Button 
                variant="outline" 
                onClick={() => setShowPresetForm(!showPresetForm)}
              >
                {showPresetForm ? 'Cancel' : 'Create New Preset'}
              </Button>

              {showPresetForm && (
                <Card className={cn("p-4 bg-muted")}>
                  <div className={cn("grid grid-cols-2 gap-4")}>
                    <div>
                      <Label htmlFor="preset-name">Preset Name</Label>
                      <Input
                        id="preset-name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., YouTube Export"
                      />
                    </div>
                    <div>
                      <Label htmlFor="preset-desc">Description (optional)</Label>
                      <Input
                        id="preset-desc"
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                  <div className={cn("mt-4 flex justify-end space-x-2")}>
                    <Button variant="outline" onClick={() => setShowPresetForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={savePreset}>Save Preset</Button>
                  </div>
                </Card>
              )}

              <div className={cn("space-y-2")}>
                {presets.map(preset => (
                  <Card key={preset.id} className={cn("p-4")}>
                    <div className={cn("flex items-center justify-between")}>
                      <div>
                        <h4 className={cn("font-medium")}>{preset.name}</h4>
                        <p className={cn("text-sm text-muted-foreground")}>{preset.description}</p>
                        <div className={cn("flex space-x-2 mt-1")}>
                          {preset.config_json.formats.map(format => (
                            <Badge key={format} variant="secondary" className={cn("text-xs")}>
                              {format}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className={cn("flex space-x-2")}>
                        <Button variant="outline" size="sm" onClick={() => loadPreset(preset)}>
                          Load
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className={cn("w-4 h-4")} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Exports */}
        <TabsContent value="exports" className={cn("space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center space-x-2")}>
                <Package className={cn("w-5 h-5")} />
                <span>Recent Exports</span>
              </CardTitle>
              <CardDescription>
                Track and download your recent export bundles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exports.length === 0 ? (
                <p className={cn("text-muted-foreground text-center py-8")}>
                  No recent exports. Create your first export above!
                </p>
              ) : (
                <div className={cn("space-y-2")}>
                  {exports.map(exportItem => (
                    <Card key={exportItem.exportId} className={cn("p-4")}>
                      <div className={cn("flex items-center justify-between")}>
                        <div>
                          <div className={cn("flex items-center space-x-2")}>
                            <Badge 
                              variant={exportItem.status === 'completed' ? 'default' : 
                                     exportItem.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {exportItem.status}
                            </Badge>
                            {exportItem.status === 'processing' && (
                              <RefreshCw className={cn("w-4 h-4 animate-spin")} />
                            )}
                          </div>
                          <p className={cn("text-sm text-muted-foreground mt-1")}>
                            Created: {new Date(exportItem.createdAt).toLocaleString()}
                          </p>
                          <p className={cn("text-sm text-muted-foreground")}>
                            Expires: {new Date(exportItem.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        {exportItem.status === 'completed' && exportItem.downloadUrl && (
                          <Button asChild>
                            <a href={exportItem.downloadUrl} download>
                              <Download className={cn("w-4 h-4 mr-2")} />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Configuration & Action */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center space-x-2")}>
            <Settings className={cn("w-5 h-5")} />
            <span>Export Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-4")}>
          <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4")}>
            <div>
              <Label htmlFor="zip-mode">ZIP Organization</Label>
              <Select value={zipMode} onValueChange={(value: any) => setZipMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grouped">Grouped (folders per video)</SelectItem>
                  <SelectItem value="combined">Combined (flat structure)</SelectItem>
                  <SelectItem value="individual">Individual (separate ZIPs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className={cn("flex items-center space-x-2 pt-6")}>
              <Checkbox 
                id="compress"
                checked={compress}
                onCheckedChange={(checked) => setCompress(!!checked)}
              />
              <Label htmlFor="compress">Compress files</Label>
            </div>

            <div>
              <Label htmlFor="expiry">Expires in (hours)</Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                max="168"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 24)}
              />
            </div>

            <div className={cn("flex items-end")}>
              <Button 
                onClick={createExport}
                disabled={processing || selectedJobs.size === 0}
                className={cn("w-full")}
              >
                {processing ? (
                  <>
                    <RefreshCw className={cn("w-4 h-4 mr-2 animate-spin")} />
                    Creating Export...
                  </>
                ) : (
                  <>
                    <Package className={cn("w-4 h-4 mr-2")} />
                    Create Export Bundle
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}