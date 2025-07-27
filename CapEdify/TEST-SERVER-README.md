# CapEdify - Quick Start Guide with Test Server

This document provides instructions for running CapEdify with the test server for development and testing purposes.

## Overview

The test server provides mock endpoints for:
- Video uploads
- Transcription processing
- JSX exports (After Effects and React)

This allows you to test and develop the frontend without needing a full backend infrastructure.

## Starting the Test Server

1. Open a terminal window
2. Navigate to the server directory:
   ```
   cd server
   ```
3. Start the test server:
   ```
   node test-server.js
   ```
4. The server should start on port 4000
5. You should see output like:
   ```
   🚀 Test Server running on http://localhost:4000
   📊 Health check: http://localhost:4000/health
   🎬 JSX Export: http://localhost:4000/api/export/jsx/enhanced
   ```

## Starting the Client

1. Open a new terminal window
2. Navigate to the client directory:
   ```
   cd client
   ```
3. Install dependencies if needed:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. The client should start and be accessible at http://localhost:5173

## Testing JSX Export Functionality

The test server provides mock endpoints for JSX export:

1. `/api/export/jsx/styles` - Returns available JSX styles
2. `/api/export/jsx/enhanced` - Exports After Effects JSX
3. `/api/export/jsx/react` - Exports React component JSX

### Testing in the UI

1. Upload a test video using the UI
2. When the video is processed, you should see an option to export captions
3. Try the JSX export options to verify they work correctly

## Customizing the Test Server

You can modify the test-server.js file to:

1. Add new endpoints
2. Customize the response data
3. Add error scenarios for testing

## Troubleshooting

### If the test server fails to start:

1. Check if port 4000 is already in use
2. Check that you have the required dependencies installed

### If the client fails to connect to the test server:

1. Make sure the test server is running
2. Check the API URL in the client configuration (src/api/api.ts)
3. Verify that CORS is enabled in the test server

## Next Steps

Once you've verified that the test server works with the client, you can:

1. Start developing new features
2. Modify the JSX export templates
3. Add more advanced functionality to the test server

For full production use, you'll want to switch to the regular server.js which provides the complete backend functionality.
