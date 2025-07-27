# 🚀 CapEdify Development Startup Guide

## Quick Start

**Single Command Startup:**
```bash
npm run dev
```

This will:
1. Start the backend server on `http://localhost:4000`
2. Start the frontend client on `http://localhost:5173`
3. Open both in separate PowerShell windows

## Alternative Manual Startup

If you prefer to start servers individually:

**Backend Only:**
```bash
npm run server
```

**Frontend Only:**
```bash
npm run client
```

## What's Running

- **Backend**: Express.js server with Groq transcription, Supabase storage
- **Frontend**: React + Vite with Tailwind CSS, real-time debugging
- **Ports**: Backend :4000, Frontend :5173

## Development Features

- ✅ Real-time transcription status polling
- ✅ Enhanced error handling with toast notifications
- ✅ React DevTools integration for debugging
- ✅ Network tab debugging for API issues
- ✅ Comprehensive logging infrastructure

## Cleanup Complete

Removed redundant startup files:
- ❌ `start-backend-only.bat`
- ❌ `start-with-devtools.bat`
- ❌ `test-api-server.js`
- ❌ `test-server-endpoints.js`
- ✅ Now using single `npm run dev` command

## Troubleshooting

If the startup script fails:
1. Ensure you're in the project root directory
2. Check that Node.js and npm are installed
3. Run `npm install` to ensure dependencies are present
4. Use manual startup commands as fallback
