# CapEdify - Startup Guide

This document provides instructions for starting the CapEdify application.

## Prerequisites

1. Make sure you have Node.js installed (v16+ recommended)
2. Make sure the `.env` file is properly configured in the server directory

## Starting the Server

1. Open a terminal window
2. Navigate to the server directory:
   ```
   cd server
   ```
3. Install dependencies if needed:
   ```
   npm install
   ```
4. Start the server:
   ```
   node server.js
   ```
5. The server should start on port 4000 (or the port specified in your .env file)

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

## Troubleshooting

### If the server fails to start:

1. Check if the required directories exist:
   - Make sure the upload and download directories specified in the `.env` file exist
   - If not, create them manually

2. Check environment variables:
   - Make sure your `.env` file in the server directory has all required variables
   - Ensure paths are correct for your system

3. Check for port conflicts:
   - If port 4000 is already in use, change the PORT value in the `.env` file

### If the client fails to connect to the server:

1. Make sure the server is running
2. Check the API URL in the client configuration (api.ts)
3. Check for CORS issues in the browser developer console

### If JSX export doesn't work:

1. Check the server logs for any specific errors
2. Make sure the jsxExportService.js file exists and is properly implemented
3. Check that the routes in exportRoutes.js are properly implemented

## Main Files to Check

- Server: `server.js`
- API Routes: `server/routes/exportRoutes.js`, `server/routes/videoRoutes.js`
- Services: `server/services/jsxExportService.js`, `server/services/exportService.js`
- Client API: `client/src/api/api.ts`, `client/src/api/export.ts`
