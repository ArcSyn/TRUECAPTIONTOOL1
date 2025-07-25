import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Download, Copy, FileCode, Layers } from 'lucide-react';
import { Caption } from '@/types';
import { generateAfterEffectsExport, generateReactExport } from '@/api/export';
import { useToast } from '@/hooks/useToast';

interface ExportOptionsProps {
  captions: Caption[];
  projectName: string;
}

export function ExportOptions({ captions, projectName }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCode, setExportedCode] = useState('');
  const [exportType, setExportType] = useState<'after-effects' | 'react'>('after-effects');
  const [componentName, setComponentName] = useState('VideoCaptions');
  const { toast } = useToast();

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
      const result = await generateReactExport(captions, componentName);
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

  return (
    <Card className={cn("p-6 bg-white/10 backdrop-blur-sm border-white/20")}>
      <div className={cn("space-y-6")}>
        <div>
          <h3 className={cn("text-lg font-semibold text-gray-900 mb-2")}>Export Options</h3>
          <p className={cn("text-gray-600")}>Choose your preferred export format</p>
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
          <Card className={cn("p-4 bg-white/5 border-white/10")}>
            <div className={cn("space-y-4")}>
              <div className={cn("flex items-center space-x-3")}>
                <div className={cn("w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center")}>
                  <Layers className={cn("h-5 w-5 text-purple-600")} />
                </div>
                <div>
                  <h4 className={cn("font-semibold text-gray-900")}>After Effects</h4>
                  <p className={cn("text-sm text-gray-600")}>JSX Script Export</p>
                </div>
              </div>
              <p className={cn("text-sm text-gray-700")}>
                Generate a JSX script that creates text layers with proper timing in After Effects.
              </p>
              <Button
                onClick={handleAfterEffectsExport}
                disabled={isExporting || captions.length === 0}
                className={cn("w-full bg-purple-600 hover:bg-purple-700")}
              >
                <Download className={cn("h-4 w-4 mr-2")} />
                Download .jsx
              </Button>
            </div>
          </Card>

          <Card className={cn("p-4 bg-white/5 border-white/10")}>
            <div className={cn("space-y-4")}>
              <div className={cn("flex items-center space-x-3")}>
                <div className={cn("w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center")}>
                  <FileCode className={cn("h-5 w-5 text-blue-600")} />
                </div>
                <div>
                  <h4 className={cn("font-semibold text-gray-900")}>React Component</h4>
                  <p className={cn("text-sm text-gray-600")}>JSX Component Export</p>
                </div>
              </div>
              <div className={cn("space-y-2")}>
                <label className={cn("text-xs text-gray-600")}>Component Name</label>
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
                    className={cn("w-full bg-blue-600 hover:bg-blue-700")}
                  >
                    <FileCode className={cn("h-4 w-4 mr-2")} />
                    Generate Component
                  </Button>
                </DialogTrigger>
                <DialogContent className={cn("max-w-4xl max-h-[80vh] bg-white")}>
                  <DialogHeader>
                    <DialogTitle>React Component Code</DialogTitle>
                  </DialogHeader>
                  <div className={cn("space-y-4")}>
                    <div className={cn("flex justify-end")}>
                      <Button onClick={copyToClipboard} size="sm">
                        <Copy className={cn("h-4 w-4 mr-2")} />
                        Copy to Clipboard
                      </Button>
                    </div>
                    <Textarea
                      value={exportedCode}
                      readOnly
                      className={cn("font-mono text-sm h-96 bg-gray-50")}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>

        <div className={cn("bg-blue-50/50 border border-blue-200/50 rounded-lg p-4")}>
          <h4 className={cn("font-semibold text-blue-900 mb-2")}>Usage Instructions</h4>
          <div className={cn("space-y-2 text-sm text-blue-800")}>
            <p><strong>After Effects:</strong> File → Scripts → Run Script File → Select downloaded .jsx file</p>
            <p><strong>React:</strong> Copy the component code and use with a video player that provides currentTime</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { cn } from "@/lib/utils";

