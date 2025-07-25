import { cn } from "@/lib/utils";
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
    <Card className={cn("bg-white/10 backdrop-blur-sm p-6 border-white/20")}>
      <div className={cn("space-y-4")}>
        <div className={cn("flex justify-between items-center")}>
          <h3 className={cn("font-semibold text-gray-900 text-lg")}>Caption Editor</h3>
          <div className={cn("flex items-center space-x-2")}>
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              className={cn("bg-white/10 border-white/20")}
            >
              <Undo className={cn("w-4 h-4")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={cn("bg-white/10 border-white/20")}
            >
              <Redo className={cn("w-4 h-4")} />
            </Button>
            <Button onClick={handleAddCaption} size="sm" className={cn("bg-blue-600 hover:bg-blue-700")}>
              <Plus className={cn("mr-2 w-4 h-4")} />
              Add Caption
            </Button>
          </div>
        </div>

        <ScrollArea className={cn("h-96")}>
          <div className={cn("space-y-3")}>
            {captions.map((caption, index) => (
              <Card key={caption.id} className={cn("bg-white/5 p-4 border-white/10")}>
                <div className={cn("space-y-3")}>
                  <div className={cn("flex justify-between items-center")}>
                    <span className={cn("font-medium text-gray-700 text-sm")}>
                      Caption {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCaption(caption.id)}
                      className={cn("hover:bg-red-50 text-red-500 hover:text-red-700")}
                    >
                      <Trash2 className={cn("w-4 h-4")} />
                    </Button>
                  </div>

                  <div className={cn("gap-2 grid grid-cols-2")}>
                    <div>
                      <label className={cn("block mb-1 text-gray-600 text-xs")}>Start Time</label>
                      <Input
                        value={formatTime(caption.startTime)}
                        onChange={(e) => {
                          const newStartTime = parseTime(e.target.value);
                          handleUpdateCaption(caption.id, { startTime: newStartTime });
                        }}
                        className={cn("bg-white/10 border-white/20")}
                        placeholder="00:00.0"
                      />
                    </div>
                    <div>
                      <label className={cn("block mb-1 text-gray-600 text-xs")}>End Time</label>
                      <Input
                        value={formatTime(caption.endTime)}
                        onChange={(e) => {
                          const newEndTime = parseTime(e.target.value);
                          handleUpdateCaption(caption.id, { endTime: newEndTime });
                        }}
                        className={cn("bg-white/10 border-white/20")}
                        placeholder="00:00.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={cn("block mb-1 text-gray-600 text-xs")}>Caption Text</label>
                    {editingId === caption.id ? (
                      <div className={cn("space-y-2")}>
                        <Textarea
                          value={caption.text}
                          onChange={(e) => {
                            const updatedCaptions = captions.map(c =>
                              c.id === caption.id ? { ...c, text: e.target.value } : c
                            );
                            onCaptionsChange(updatedCaptions);
                          }}
                          className={cn("bg-white/10 border-white/20")}
                          rows={2}
                        />
                        <div className={cn("flex space-x-2")}>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCaption(caption.id, { text: caption.text })}
                            className={cn("bg-green-600 hover:bg-green-700")}
                          >
                            <Save className={cn("mr-1 w-3 h-3")} />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            className={cn("bg-white/10 border-white/20")}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingId(caption.id)}
                        className={cn("bg-white/5 hover:bg-white/10 p-2 border border-white/10 rounded transition-colors cursor-pointer")}
                      >
                        <p className={cn("text-gray-800 text-sm")}>{caption.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className={cn("flex justify-between items-center text-gray-500 text-xs")}>
          <span>{captions.length} captions</span>
          <span className={cn("flex items-center space-x-1")}>
            <div className={cn("bg-green-500 rounded-full w-2 h-2 animate-pulse")} />
            <span>Auto-saved</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

