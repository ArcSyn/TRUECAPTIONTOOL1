import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Download, Copy, FileCode, Layers, Settings, Film, Package } from 'lucide-react';
import { Caption } from '@/types';
import { generateAfterEffectsExport, generateReactExport, getStyles } from '@/api/export';
import { 
  getJSXStyles, 
  exportEnhancedJSX, 
  exportSceneJSX, 
  previewJSX, 
  downloadSceneFilesAsZip,
  JSXExportOptions,
  JSXStyle,
  JSXCaption
} from '@/api/video';
import { useToast } from '@/hooks/useToast';
import { CaptionPreview } from './CaptionPreview';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';
import './ExportOptions.css';

type ExportType = 'srt' | 'vtt' | 'ass' | 'after-effects' | 'react';

interface ExportOptionsProps {
  captions: Caption[];
  projectName: string;
  transcriptionId: string;
}

interface StyleOption {
  id: string;
  name: string;
  hex?: string;
}

interface StyleGroup {
  fonts: StyleOption[];
  colors: StyleOption[];
  effects: StyleOption[];
  positions: StyleOption[];
  alignments: StyleOption[];
}

interface SelectedStyles {
  font: string;
  color: string;
  effects: string[];
  position: string;
  alignment: string;
}

export function ExportOptions({ captions, projectName, transcriptionId }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCode, setExportedCode] = useState('');
  const [exportType, setExportType] = useState<ExportType>('srt');
  const [componentName, setComponentName] = useState('VideoCaptions');
  const [styleOptions, setStyleOptions] = useState<StyleGroup | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<SelectedStyles>({
    font: '',
    color: '',
    effects: [],
    position: 'bottom',
    alignment: 'center'
  });

  // Enhanced JSX Export State
  const [jsxStyles, setJsxStyles] = useState<JSXStyle[]>([]);
  const [jsxOptions, setJsxOptions] = useState<JSXExportOptions>({
    projectName: projectName,
    styleName: 'modern',
    sceneMode: false,
    gapThreshold: 2.0
  });
  const [jsxPreview, setJsxPreview] = useState<string>('');
  const [sceneFiles, setSceneFiles] = useState<{ [filename: string]: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const [styles, jsxStylesList] = await Promise.all([
          getStyles(),
          getJSXStyles()
        ]);
        setStyleOptions(styles);
        setJsxStyles(jsxStylesList);
      } catch (error) {
        toast({
          title: "Failed to load styles",
          description: error instanceof Error ? error.message : "Failed to load style options",
          variant: "destructive",
        });
      }
    };
    loadStyles();
  }, [toast]);

  // Update JSX options when projectName changes
  useEffect(() => {
    setJsxOptions(prev => ({ ...prev, projectName }));
  }, [projectName]);

  const handleAfterEffectsExport = async () => {
    setIsExporting(true);
    try {
      console.log('Generating After Effects export');
      const result = await generateAfterEffectsExport(captions, projectName);
      
      // Create and download file
      const blob = new Blob([result.jsxCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_captions.jsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "After Effects script has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReactExport = async () => {
    setIsExporting(true);
    try {
      console.log('Generating React export');
      // Since we have captions directly, we pass empty string for transcriptionId and include captions
      const result = await generateReactExport('', componentName, captions);
      setExportedCode(result.jsxCode);
      setExportType('react');
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedCode);
      toast({
        title: "Copied to clipboard",
        description: "React component code has been copied.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Enhanced JSX Export Handlers
  const handleEnhancedJSXExport = async () => {
    setIsExporting(true);
    try {
      console.log('Starting enhanced JSX export with options:', jsxOptions);
      
      const result = await exportEnhancedJSX(transcriptionId, {
        ...jsxOptions,
        captions: captions
      });

      toast({
        title: "Enhanced JSX Export successful",
        description: jsxOptions.sceneMode 
          ? "Scene-based JSX files ready for download" 
          : "JSX file has been downloaded",
      });

      if (result.type === 'multi-file' && result.files) {
        setSceneFiles(result.files);
      }
    } catch (error) {
      console.error('Enhanced JSX Export error:', error);
      toast({
        title: "Enhanced JSX Export failed",
        description: error instanceof Error ? error.message : "Failed to export enhanced JSX",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSceneJSXExport = async () => {
    setIsExporting(true);
    try {
      const files = await exportSceneJSX(transcriptionId, {
        ...jsxOptions,
        captions: captions,
        sceneMode: true
      });

      setSceneFiles(files);
      
      toast({
        title: "Scene JSX Export successful",
        description: `${Object.keys(files).length} scene files ready for download`,
      });
    } catch (error) {
      toast({
        title: "Scene JSX Export failed",
        description: error instanceof Error ? error.message : "Failed to export scene JSX",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleJSXPreview = async () => {
    try {
      const result = await previewJSX(transcriptionId, {
        ...jsxOptions,
        captions: captions
      });
      setJsxPreview(result.preview);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to generate preview",
        variant: "destructive",
      });
    }
  };

  const downloadAllSceneFiles = () => {
    if (sceneFiles) {
      downloadSceneFilesAsZip(sceneFiles, jsxOptions.projectName || 'scenes');
      toast({
        title: "Downloading scene files",
        description: "All scene files are being downloaded",
      });
    }
  };

  return (
    <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20")}>
      <div className={cn("space-y-6")}>
        <div>
          <h3 className={cn("mb-2 font-semibold text-gray-900 text-lg")}>Export Options</h3>
          <p className={cn("text-gray-600")}>Choose your preferred export format</p>
        </div>

        <div className={cn("gap-4 grid grid-cols-1 md:grid-cols-2")}>
          <Card className={cn("bg-white/5 p-4 border-white/10")}>
            <div className={cn("space-y-4")}>
              <div className={cn("flex items-center space-x-3")}>
                <div className={cn("flex justify-center items-center bg-purple-500/20 rounded-lg w-10 h-10")}>
                  <Layers className={cn("w-5 h-5 text-purple-600")} />
                </div>
                <div>
                  <h4 className={cn("font-semibold text-gray-900")}>After Effects</h4>
                  <p className={cn("text-gray-600 text-sm")}>JSX Script Export</p>
                </div>
              </div>
              <p className={cn("text-gray-700 text-sm")}>
                Generate a JSX script that creates text layers with proper timing in After Effects.
              </p>
              <Button
                onClick={handleAfterEffectsExport}
                disabled={isExporting || captions.length === 0}
                className={cn("bg-purple-600 hover:bg-purple-700 w-full")}
              >
                <Download className={cn("mr-2 w-4 h-4")} />
                Download .jsx
              </Button>
            </div>
          </Card>

          {/* Enhanced JSX Export Card */}
          <Card className={cn("bg-white/5 p-4 border-white/10")}>
            <div className={cn("space-y-4")}>
              <div className={cn("flex items-center space-x-3")}>
                <div className={cn("flex justify-center items-center bg-green-500/20 rounded-lg w-10 h-10")}>
                  <Settings className={cn("w-5 h-5 text-green-600")} />
                </div>
                <div>
                  <h4 className={cn("font-semibold text-gray-900")}>Enhanced JSX</h4>
                  <p className={cn("text-gray-600 text-sm")}>Advanced After Effects Export</p>
                </div>
              </div>
              
              <div className={cn("space-y-3")}>
                {/* Style Selector */}
                <div>
                  <Label>Style Template</Label>
                  <Select 
                    value={jsxOptions.styleName} 
                    onValueChange={(value: 'modern' | 'minimal' | 'bold') => 
                      setJsxOptions(prev => ({ ...prev, styleName: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {jsxStyles.map(style => (
                          <SelectItem key={style.name} value={style.name}>
                            {style.displayName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scene Mode Toggle */}
                <div className={cn("flex justify-between items-center")}>
                  <div>
                    <Label>Scene Mode</Label>
                    <p className={cn("text-gray-500 text-xs")}>Split into multiple scene files</p>
                  </div>
                  <Switch
                    checked={jsxOptions.sceneMode}
                    onCheckedChange={(checked: boolean) => 
                      setJsxOptions(prev => ({ ...prev, sceneMode: checked }))
                    }
                  />
                </div>

                {/* Gap Threshold for Scene Mode */}
                {jsxOptions.sceneMode && (
                  <div>
                    <Label>Scene Gap (seconds)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={jsxOptions.gapThreshold}
                      onChange={(e) => 
                        setJsxOptions(prev => ({ 
                          ...prev, 
                          gapThreshold: parseFloat(e.target.value) || 2.0 
                        }))
                      }
                      className={cn("bg-white/10 border-white/20")}
                    />
                  </div>
                )}
              </div>

              <div className={cn("flex space-x-2")}>
                <Button
                  onClick={handleJSXPreview}
                  disabled={isExporting || captions.length === 0}
                  variant="outline"
                  size="sm"
                  className={cn("flex-1")}
                >
                  Preview
                </Button>
                <Button
                  onClick={jsxOptions.sceneMode ? handleSceneJSXExport : handleEnhancedJSXExport}
                  disabled={isExporting || captions.length === 0}
                  className={cn("flex-1 bg-green-600 hover:bg-green-700")}
                >
                  <Download className={cn("mr-2 w-4 h-4")} />
                  {jsxOptions.sceneMode ? 'Export Scenes' : 'Export JSX'}
                </Button>
              </div>

              {/* Scene Files Download */}
              {sceneFiles && (
                <div className={cn("bg-green-50/50 p-3 border border-green-200/50 rounded-lg")}>
                  <div className={cn("flex justify-between items-center mb-2")}>
                    <p className={cn("font-medium text-green-800 text-sm")}>
                      {Object.keys(sceneFiles).length} scene files ready
                    </p>
                    <Button
                      onClick={downloadAllSceneFiles}
                      size="sm"
                      className={cn("bg-green-600 hover:bg-green-700")}
                    >
                      <Package className={cn("mr-1 w-3 h-3")} />
                      Download All
                    </Button>
                  </div>
                  <div className={cn("space-y-1")}>
                    {Object.keys(sceneFiles).map(filename => (
                      <div key={filename} className={cn("flex justify-between items-center text-xs")}>
                        <span className={cn("text-green-700")}>{filename}</span>
                        <a
                          href={sceneFiles[filename]}
                          download={filename}
                          className={cn("text-green-600 hover:text-green-800 underline")}
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSX Preview */}
              {jsxPreview && (
                <div className={cn("bg-gray-50/50 p-3 border border-gray-200/50 rounded-lg")}>
                  <Label>JSX Preview</Label>
                  <pre className={cn("mt-1 overflow-x-auto text-gray-700 text-xs")}>
                    {jsxPreview}
                  </pre>
                </div>
              )}
            </div>
          </Card>

          <Card className={cn("p-4")}>
            <div className={cn("space-y-4")}>
              <div className={cn("gap-4 grid grid-cols-2")}>
                <div>
                  <Label>Export Format</Label>
                  <Select onValueChange={(val: any) => setExportType(val)} value={exportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Basic</SelectLabel>
                        <SelectItem value="srt">SRT</SelectItem>
                        <SelectItem value="vtt">VTT</SelectItem>
                        <SelectItem value="ass">ASS/SSA</SelectItem>
                        <SelectLabel>Advanced</SelectLabel>
                        <SelectItem value="after-effects">After Effects</SelectItem>
                        <SelectItem value="react">React Component</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {styleOptions && (
                  <div>
                    <Label>Font</Label>
                    <Select 
                      onValueChange={(val: string) => setSelectedStyles(prev => ({ ...prev, font: val }))}
                      value={selectedStyles.font}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {styleOptions.fonts.map(font => (
                            <SelectItem key={font.id} value={font.id}>{font.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {styleOptions && (
                <div className="gap-4 grid grid-cols-2">
                  <div>
                    <Label>Text Color</Label>
                    <Select 
                      onValueChange={(val: string) => setSelectedStyles(prev => ({ ...prev, color: val }))}
                      value={selectedStyles.color}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {styleOptions.colors.map(color => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="border border-gray-300 rounded w-4 h-4" 
                                  data-color={color.hex || '#ffffff'}
                                />
                                <span>{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Position</Label>
                    <Select 
                      onValueChange={(val: string) => setSelectedStyles(prev => ({ ...prev, position: val }))}
                      value={selectedStyles.position}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {styleOptions.positions.map(pos => (
                            <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Label>Preview</Label>
                <CaptionPreview 
                  transcriptionId={transcriptionId} 
                  format={exportType} 
                  styles={selectedStyles}
                />
              </div>

              <div className={cn("flex items-center space-x-3 mt-6")}>
                <div className={cn("flex justify-center items-center bg-blue-500/20 rounded-lg w-10 h-10")}>
                  <FileCode className={cn("w-5 h-5 text-blue-600")} />
                </div>
                <div>
                  <h4 className={cn("font-semibold text-gray-900")}>Export Options</h4>
                  <p className={cn("text-gray-600 text-sm")}>Export with selected format and styles</p>
                </div>
              </div>
              <div className={cn("space-y-2")}>
                <label className={cn("text-gray-600 text-xs")}>Component Name</label>
                <Input
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  placeholder="VideoCaptions"
                  className={cn("bg-white/10 border-white/20")}
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleReactExport}
                    disabled={isExporting || captions.length === 0}
                    className={cn("bg-blue-600 hover:bg-blue-700 w-full")}
                  >
                    <FileCode className={cn("mr-2 w-4 h-4")} />
                    Generate Component
                  </Button>
                </DialogTrigger>
                <DialogContent className={cn("bg-white max-w-4xl max-h-[80vh]")}>
                  <DialogHeader>
                    <DialogTitle>React Component Code</DialogTitle>
                  </DialogHeader>
                  <div className={cn("space-y-4")}>
                    <div className={cn("flex justify-end")}>
                      <Button onClick={copyToClipboard} size="sm">
                        <Copy className={cn("mr-2 w-4 h-4")} />
                        Copy to Clipboard
                      </Button>
                    </div>
                    <Textarea
                      value={exportedCode}
                      readOnly
                      className={cn("bg-gray-50 h-96 font-mono text-sm")}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>

        <div className={cn("bg-blue-50/50 p-4 border border-blue-200/50 rounded-lg")}>
          <h4 className={cn("mb-2 font-semibold text-blue-900")}>Usage Instructions</h4>
          <div className={cn("space-y-2 text-blue-800 text-sm")}>
            <p><strong>After Effects:</strong> File → Scripts → Run Script File → Select downloaded .jsx file</p>
            <p><strong>React:</strong> Copy the component code and use with a video player that provides currentTime</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

