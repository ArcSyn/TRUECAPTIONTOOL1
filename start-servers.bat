@echo off
echo Starting CapEdify servers...

echo Starting Backend on port 4000...
start cmd /k "cd CapEdify\server && node server.js"

echo Starting Frontend on port 5173...
start cmd /k "cd CapEdify\client && npm run dev"

echo Done! Frontend will be available at http://localhost:5173
echo Backend API health check: http://localhost:4000/health
