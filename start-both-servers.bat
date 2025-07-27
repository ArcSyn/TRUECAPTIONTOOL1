@echo off
echo Starting test API server...
start "API Server" cmd /k "node test-api-server.js"
echo Waiting for API server to initialize...
timeout /t 3
echo Starting Vite dev server...
cd CapEdify\client
start "Frontend" cmd /k "npm run dev"
echo Done! Both servers should be starting now.
echo API Server: http://localhost:4000
echo Frontend: http://localhost:5173
