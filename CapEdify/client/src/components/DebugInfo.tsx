import React from 'react';

interface DebugInfoProps {
  label: string;
  data: any;
  collapsed?: boolean;
}

export function DebugInfo({ label, data, collapsed = true }: DebugInfoProps) {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <details className="mt-2 p-2 border border-gray-300 rounded text-xs" open={!collapsed}>
      <summary className="font-mono text-blue-600 cursor-pointer">
        🐛 {label}
      </summary>
      <pre className="bg-gray-100 mt-2 p-2 rounded max-h-40 overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

interface DebugUploadProps {
  uploadProgress: number;
  isUploading: boolean;
  uploadedFile: File | null;
  error?: any;
}

export function DebugUpload({ uploadProgress, isUploading, uploadedFile, error }: DebugUploadProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const [debugLogs, setDebugLogs] = React.useState<string[]>([]);

  // Capture console logs for debugging
  React.useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      if (args[0]?.includes?.('🚀') || args[0]?.includes?.('📡') || args[0]?.includes?.('✅') || args[0]?.includes?.('❌')) {
        setDebugLogs(prev => [...prev.slice(-10), args.join(' ')]);
      }
      originalLog(...args);
    };
    
    console.error = (...args) => {
      if (args[0]?.includes?.('Upload') || args[0]?.includes?.('fetch')) {
        setDebugLogs(prev => [...prev.slice(-10), `ERROR: ${args.join(' ')}`]);
      }
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="bg-yellow-50 mt-4 p-4 border-2 border-yellow-300 border-dashed">
      <h3 className="mb-2 font-bold text-yellow-800">🐛 Upload Debug Info</h3>
      
      {/* Real-time status */}
      <div className="bg-blue-50 mb-2 p-2 rounded">
        <div className="font-mono text-sm">
          Status: {isUploading ? '🔄 Uploading...' : '⏸️ Idle'} ({uploadProgress}%)
        </div>
        <div className="text-gray-600 text-xs">
          Backend: <span id="backend-status">❓ Checking...</span>
        </div>
      </div>
      
      <DebugInfo label="Upload State" data={{
        uploadProgress,
        isUploading,
        fileName: uploadedFile?.name,
        fileSize: uploadedFile?.size,
        fileType: uploadedFile?.type,
        timestamp: new Date().toISOString()
      }} collapsed={false} />
      
      {error && (
        <DebugInfo label="Last Error" data={{
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }} collapsed={false} />
      )}
      
      {/* Debug logs */}
      {debugLogs.length > 0 && (
        <details className="mt-2 p-2 border border-gray-300 rounded text-xs" open>
          <summary className="font-mono text-green-600 cursor-pointer">
            📝 Upload Logs ({debugLogs.length})
          </summary>
          <div className="bg-gray-900 mt-2 p-2 rounded max-h-40 overflow-auto font-mono text-green-400 text-xs">
            {debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </details>
      )}
      
      <div className="mt-2 text-yellow-700 text-xs">
        💡 Use React DevTools to inspect component state in real-time
        <br />
        🔍 Set breakpoints in Sources tab or use debugger; statement
        <br />
        📊 <strong>Network Tab Debug:</strong>
        <br />
        &nbsp;&nbsp;• Look for POST to /api/video/upload
        <br />
        &nbsp;&nbsp;• If you see "provisional headers" = request blocked
        <br />
        &nbsp;&nbsp;• Check if status shows (failed) or actual HTTP code
        <br />
        &nbsp;&nbsp;• Red requests = failed, black = successful
      </div>
    </div>
  );
}
