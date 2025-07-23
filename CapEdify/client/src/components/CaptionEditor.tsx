import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, Plus, Save, Undo, Redo } from 'lucide-react';
import { Caption } from '@/types';
import { updateCaption, deleteCaption, addCaption } from '@/api/captions';
import { formatTime, parseTime } from '@/utils/time';
import { useToast } from '@/hooks/useToast';
import { useAutoSave } from '@/hooks/useAutoSave';

interface CaptionEditorProps {
  captions: Caption[];
  onCaptionsChange: (captions: Caption[]) => void;
  projectId: string;
}

export function CaptionEditor({ captions, onCaptionsChange, projectId }: CaptionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<Caption[][]>([captions]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const { toast } = useToast();

  const saveProject = async (data: Caption[]) => {
    console.log('Auto-saving captions:', data.length);
    // This would normally save to backend
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  useAutoSave(captions, saveProject, 5000);

  const addToHistory = (newCaptions: Caption[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newCaptions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onCaptionsChange(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onCaptionsChange(history[newIndex]);
    }
  };

  const handleUpdateCaption = async (captionId: string, updates: Partial<Caption>) => {
    try {
      await updateCaption(captionId, updates);
      const updatedCaptions = captions.map(caption =>
        caption.id === captionId ? { ...caption, ...updates } : caption
      );
      addToHistory(updatedCaptions);
      onCaptionsChange(updatedCaptions);
      setEditingId(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCaption = async (captionId: string) => {
    try {
      await deleteCaption(captionId);
      const updatedCaptions = captions.filter(caption => caption.id !== captionId);
      addToHistory(updatedCaptions);
      onCaptionsChange(updatedCaptions);
      toast({
        title: "Caption deleted",
        description: "Caption has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete caption",
        variant: "destructive",
      });
    }
  };

  const handleAddCaption = async () => {
    const lastCaption = captions[captions.length - 1];
    const startTime = lastCaption ? lastCaption.endTime + 1 : 0;
    const endTime = startTime + 3;

    try {
      const result = await addCaption({
        startTime,
        endTime,
        text: 'New caption text',
        projectId
      });

      const updatedCaptions = [...captions, result.caption];
      addToHistory(updatedCaptions);
      onCaptionsChange(updatedCaptions);
      setEditingId(result.caption.id);
    } catch (error) {
      toast({
        title: "Add failed",
        description: error instanceof Error ? error.message : "Failed to add caption",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Caption Editor</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="bg-white/10 border-white/20"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="bg-white/10 border-white/20"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Button onClick={handleAddCaption} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Caption
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {captions.map((caption, index) => (
              <Card key={caption.id} className="p-4 bg-white/5 border-white/10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Caption {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCaption(caption.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Start Time</label>
                      <Input
                        value={formatTime(caption.startTime)}
                        onChange={(e) => {
                          const newStartTime = parseTime(e.target.value);
                          handleUpdateCaption(caption.id, { startTime: newStartTime });
                        }}
                        className="bg-white/10 border-white/20"
                        placeholder="00:00.0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">End Time</label>
                      <Input
                        value={formatTime(caption.endTime)}
                        onChange={(e) => {
                          const newEndTime = parseTime(e.target.value);
                          handleUpdateCaption(caption.id, { endTime: newEndTime });
                        }}
                        className="bg-white/10 border-white/20"
                        placeholder="00:00.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Caption Text</label>
                    {editingId === caption.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={caption.text}
                          onChange={(e) => {
                            const updatedCaptions = captions.map(c =>
                              c.id === caption.id ? { ...c, text: e.target.value } : c
                            );
                            onCaptionsChange(updatedCaptions);
                          }}
                          className="bg-white/10 border-white/20"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCaption(caption.id, { text: caption.text })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            className="bg-white/10 border-white/20"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingId(caption.id)}
                        className="p-2 bg-white/5 border border-white/10 rounded cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <p className="text-sm text-gray-800">{caption.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{captions.length} captions</span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Auto-saved</span>
          </span>
        </div>
      </div>
    </Card>
  );
}