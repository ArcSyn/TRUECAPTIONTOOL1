# 🔌 API Reference

## Base URL

```
http://localhost:4000
```

## Authentication

CapEdify currently runs in local mode and does not require authentication. All endpoints are accessible without API keys when running locally.

## Health Check

### GET /health

Check server status and capabilities.

**Response:**
```json
{
  "status": "✅ LOCAL Server is healthy - Phase 3 Ready",
  "timestamp": "2025-07-28T17:23:11.866Z",
  "port": "4000",
  "mode": "LOCAL",
  "phase": "3",
  "endpoints": {
    "health": "/health",
    "videos": "/api/videos",
    "transcribe": "/api/transcribe",
    "export_phase2": "/api/export/jsx/enhanced",
    "export_phase3_jsx": "/api/export/jsx/phase3",
    "export_phase3_srt": "/api/export/srt/phase3",
    "export_phase3_vtt": "/api/export/vtt/phase3",
    "export_phase3_json": "/api/export/json/phase3"
  },
  "features": {
    "chunked_transcription": true,
    "long_form_videos": "3-5+ minutes",
    "after_effects_jsx": true,
    "ecma2018_syntax": true,
    "fade_animations": true,
    "multiple_styles": ["modern", "minimal", "bold", "podcast", "cinematic"],
    "multiple_positions": ["bottom", "top", "center", "corners"],
    "export_formats": ["jsx", "srt", "vtt", "json"]
  },
  "environment": {
    "node_version": "v22.17.0",
    "local_mode": true,
    "whisper_available": true,
    "whisper_chunker_agent": true,
    "ae_jsx_exporter_agent": true
  }
}
```

## Video Management

### GET /api/videos

Get list of uploaded videos.

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "id": "video-uuid",
      "original_name": "my-video.mp4",
      "size": 1234567,
      "status": "uploaded",
      "created_at": "2025-07-28T17:23:11.866Z"
    }
  ]
}
```

### POST /api/videos/upload

Upload a video file for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `video` field containing the file

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "video-uuid",
    "original_name": "my-video.mp4",
    "size": 1234567,
    "path": "/uploads/video-uuid.mp4",
    "status": "uploaded"
  },
  "transcription": {
    "id": "transcription-uuid",
    "video_id": "video-uuid",
    "status": "pending",
    "progress": 0
  }
}
```

## Transcription

### POST /api/transcribe

Start transcription of an uploaded video.

**Request:**
```json
{
  "video_id": "video-uuid",
  "transcription_id": "transcription-uuid",
  "model": "whisper-large-v3"
}
```

**Response:**
```json
{
  "success": true,
  "transcription_id": "transcription-uuid",
  "status": "processing",
  "message": "Transcription started - processing in background"
}
```

### GET /api/transcribe/:id

Check transcription status and progress.

**Response (In Progress):**
```json
{
  "success": true,
  "transcription": {
    "id": "transcription-uuid",
    "status": "processing",
    "progress": 75,
    "status_message": "🎯 Phase 3: Processed chunk 7/9",
    "created_at": "2025-07-28T17:23:11.866Z",
    "updated_at": "2025-07-28T17:24:30.123Z"
  }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "transcription": {
    "id": "transcription-uuid",
    "status": "completed",
    "progress": 100,
    "status_message": "✅ Phase 3: Long-form transcription complete!",
    "result": {
      "text": "Full transcription text...",
      "segments": [
        {
          "start": 0,
          "end": 4.18,
          "text": "This is the opening sentence."
        }
      ],
      "language": "en",
      "model": "small",
      "provider": "whisper.cpp-chunked",
      "chunkCount": 9
    },
    "created_at": "2025-07-28T17:23:11.866Z",
    "updated_at": "2025-07-28T17:26:45.789Z"
  }
}
```

## Export Endpoints

### GET /api/export/jsx/phase3

Export After Effects JSX script with Phase 3 enhancements.

**Query Parameters:**
- `id` (required): Transcription ID
- `style` (optional): Style preset (`modern`, `minimal`, `bold`, `podcast`, `cinematic`)
- `position` (optional): Position preset (`bottom`, `top`, `center`, `bottomLeft`, `bottomRight`, `topLeft`, `topRight`)
- `enableFades` (optional): Enable fade animations (`true`/`false`)
- `enableStroke` (optional): Enable text stroke (`true`/`false`)
- `enableShadow` (optional): Enable drop shadow (`true`/`false`)

**Example:**
```
GET /api/export/jsx/phase3?id=transcription-uuid&style=modern&position=bottom&enableFades=true
```

**Response:**
- Content-Type: `application/javascript`
- Body: Complete After Effects JSX script

### GET /api/export/srt/phase3

Export SRT subtitle file with Phase 3 timing.

**Query Parameters:**
- `id` (required): Transcription ID

**Response:**
- Content-Type: `application/x-subrip`
- Body: SRT format subtitle file

**Example Output:**
```srt
1
00:00:00,000 --> 00:00:04,180
This is the opening sentence.

2
00:00:04,180 --> 00:00:05,640
The second caption follows.
```

### GET /api/export/vtt/phase3

Export WebVTT subtitle file.

**Query Parameters:**
- `id` (required): Transcription ID

**Response:**
- Content-Type: `text/vtt`
- Body: WebVTT format subtitle file

**Example Output:**
```vtt
WEBVTT

1
00:00:00.000 --> 00:00:04.180
This is the opening sentence.

2
00:00:04.180 --> 00:00:05.640
The second caption follows.
```

### GET /api/export/json/phase3

Export raw JSON transcript data.

**Query Parameters:**
- `id` (required): Transcription ID

**Response:**
```json
{
  "success": true,
  "transcription": {
    "id": "transcription-uuid",
    "segments": [
      {
        "start": 0,
        "end": 4.18,
        "text": "This is the opening sentence."
      }
    ],
    "metadata": {
      "language": "en",
      "model": "small",
      "provider": "whisper.cpp-chunked",
      "chunkCount": 9,
      "duration": 230.74,
      "processed_at": "2025-07-28T17:26:45.789Z"
    }
  }
}
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "additional": "context information"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VIDEO_NOT_FOUND` | Specified video ID does not exist |
| `TRANSCRIPTION_NOT_FOUND` | Specified transcription ID does not exist |
| `TRANSCRIPTION_IN_PROGRESS` | Cannot export - transcription still processing |
| `TRANSCRIPTION_FAILED` | Transcription completed with errors |
| `INVALID_PARAMETERS` | Missing or invalid request parameters |
| `SERVER_ERROR` | Internal server error |

## Rate Limits

Currently, CapEdify does not implement rate limiting in local mode. For production deployments, consider implementing appropriate rate limiting based on your infrastructure.

## Webhooks

Webhooks are not currently supported but are planned for future releases to notify external systems when transcriptions complete.

## SDK Examples

### JavaScript/Node.js

```javascript
const CapEdifyClient = {
  baseURL: 'http://localhost:4000',
  
  async uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await fetch(`${this.baseURL}/api/videos/upload`, {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  },
  
  async startTranscription(videoId, transcriptionId) {
    const response = await fetch(`${this.baseURL}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        video_id: videoId, 
        transcription_id: transcriptionId 
      })
    });
    
    return response.json();
  },
  
  async pollTranscription(transcriptionId) {
    const response = await fetch(`${this.baseURL}/api/transcribe/${transcriptionId}`);
    return response.json();
  },
  
  async exportJSX(transcriptionId, options = {}) {
    const params = new URLSearchParams({
      id: transcriptionId,
      ...options
    });
    
    const response = await fetch(`${this.baseURL}/api/export/jsx/phase3?${params}`);
    return response.text();
  }
};

// Usage example
const upload = await CapEdifyClient.uploadVideo(videoFile);
const transcription = await CapEdifyClient.startTranscription(
  upload.video.id, 
  upload.transcription.id
);

// Poll for completion
let status;
do {
  status = await CapEdifyClient.pollTranscription(transcription.transcription_id);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
} while (status.transcription.status === 'processing');

// Export JSX
const jsx = await CapEdifyClient.exportJSX(transcription.transcription_id, {
  style: 'modern',
  position: 'bottom',
  enableFades: 'true'
});
```

### Python

```python
import requests
import time

class CapEdifyClient:
    def __init__(self, base_url='http://localhost:4000'):
        self.base_url = base_url
    
    def upload_video(self, file_path):
        with open(file_path, 'rb') as f:
            files = {'video': f}
            response = requests.post(f'{self.base_url}/api/videos/upload', files=files)
            return response.json()
    
    def start_transcription(self, video_id, transcription_id):
        data = {
            'video_id': video_id,
            'transcription_id': transcription_id
        }
        response = requests.post(f'{self.base_url}/api/transcribe', json=data)
        return response.json()
    
    def poll_transcription(self, transcription_id):
        response = requests.get(f'{self.base_url}/api/transcribe/{transcription_id}')
        return response.json()
    
    def export_jsx(self, transcription_id, **options):
        params = {'id': transcription_id, **options}
        response = requests.get(f'{self.base_url}/api/export/jsx/phase3', params=params)
        return response.text

# Usage
client = CapEdifyClient()
upload = client.upload_video('my-video.mp4')
transcription = client.start_transcription(upload['video']['id'], upload['transcription']['id'])

# Poll for completion
while True:
    status = client.poll_transcription(transcription['transcription_id'])
    if status['transcription']['status'] != 'processing':
        break
    time.sleep(2)

# Export JSX
jsx = client.export_jsx(transcription['transcription_id'], style='modern', position='bottom')
```

## Version Information

- **API Version**: 3.0.0
- **Phase**: 3 (Complete)
- **Last Updated**: July 28, 2025

For more examples and advanced usage, see the [User Guide](user-guide.md).