# CapEdify Updates

## Overview

This update implements fixes for the CapEdify application, focusing on the JSX export functionality and API integration. The changes improve the connection between the frontend and backend, ensure proper file handling, and add a new CLI tool for transcription and export.

## Key Changes

### 1. Updated API Integration

- Fixed client-side API calls to properly connect to backend endpoints
- Improved error handling and response processing
- Added proper React JSX component export functionality

### 2. JSX Export Implementation

- Enhanced JSX export endpoint in `exportRoutes.js`
- Added React component export endpoint
- Ensured proper file download handling

### 3. Backend Integration

- Ensured `server.js` properly imports all required routes
- Validated API endpoint consistency between frontend and backend

### 4. CLI Tool (New)

- Added a command-line interface for transcription and export
- Supports all export formats including enhanced JSX
- Provides status checking and format listing

## Setup Instructions

### 1. Environment Setup

Ensure the `.env` file is properly configured with:

```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
UPLOADS_DIR=./uploads
DOWNLOADS_DIR=./downloads
```

### 2. Directory Structure

Make sure these directories exist:

```bash
mkdir -p CapEdify/server/uploads
mkdir -p CapEdify/server/downloads
```

### 3. Frontend Update

1. Replace the `export.ts` file with the updated version:

   ```bash
   cp CapEdify/client/src/api/export.new.ts CapEdify/client/src/api/export.ts
   ```

### 4. CLI Tool Setup

1. Install dependencies:

   ```bash
   cd CapEdify
   npm install -g ./cli-package.json
   ```

2. Make the CLI executable:

   ```bash
   chmod +x cli.js
   ```

3. Create a symbolic link (optional):

   ```bash
   npm link
   ```

## Usage

### Starting the Server

```bash
cd CapEdify/server
npm install
node server.js
```

### Using the CLI Tool

1. Transcribe a video:

   ```bash
   capedify transcribe path/to/video.mp4
   ```

2. Check transcription status:

   ```bash
   capedify status <transcriptionId>
   ```

3. Export captions:

   ```bash
   capedify export <transcriptionId> --format srt
   ```

4. List available formats:

   ```bash
   capedify formats
   ```

## API Endpoints

### Export Endpoints

- `GET /api/export/formats` - Get available export formats
- `GET /api/export/styles` - Get available styles
- `POST /api/export/preview` - Get preview of export
- `POST /api/export/:transcriptionId` - Export to specified format
- `POST /api/export/jsx/enhanced` - Export to After Effects JSX
- `POST /api/export/jsx/react` - Export to React component

### Video and Transcription Endpoints

- `POST /api/video/upload` - Upload a video
- `GET /api/video/:id` - Get video details
- `POST /api/transcribe` - Start transcription
- `GET /api/transcribe/status/:id` - Check transcription status

## Troubleshooting

- If you encounter connection issues, ensure the server is running on port 4000
- Check the API base URL in `api.ts` to ensure it points to the correct server
- Verify that all required directories (uploads, downloads) exist and are writable

## Future Improvements

- Implement file caching for exported captions
- Add more styling options for JSX exports
- Improve error handling and retry logic
- Add authentication to protect API endpoints
