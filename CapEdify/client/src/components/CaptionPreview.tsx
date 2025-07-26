import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPreview } from '@/api/export';

interface CaptionPreviewProps {
  transcriptionId: string;
  format: string;
  styles?: any;
}

export function CaptionPreview({ transcriptionId, format, styles }: CaptionPreviewProps) {
  const [preview, setPreview] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const result = await getPreview(transcriptionId, format, styles);
        setPreview(result.preview);
        setTotalCount(result.fullLength);
        setError('');
      } catch (err) {
        setError('Failed to load preview');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (transcriptionId && format) {
      fetchPreview();
    }
  }, [transcriptionId, format, styles]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex space-y-4 animate-pulse">
          <div className="space-y-3">
            <div className="bg-gray-200 rounded h-3"></div>
            <div className="bg-gray-200 rounded w-5/6 h-3"></div>
            <div className="bg-gray-200 rounded w-4/6 h-3"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200">
        <div className="text-red-500">{error}</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline">{format.toUpperCase()}</Badge>
        <span className="text-gray-500 text-sm">
          Showing first 3 of {totalCount} captions
        </span>
      </div>
      <pre className="bg-gray-50 p-3 rounded font-mono text-sm whitespace-pre-wrap">
        {preview}
      </pre>
    </Card>
  );
}
