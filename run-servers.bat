@echo off
echo Starting CapEdify servers...

echo Starting Backend on port 4000...
start cmd /k "cd CapEdify\server && node server.js"

echo Starting Frontend on port 5173...
start cmd /k "cd c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify\client && npm run dev"

echo Running server endpoint tests...
node test-server-endpoints.js

echo Done! 
echo Frontend will be available at http://localhost:5173
echo Backend API health check: http://localhost:4000/health
echo.
echo Press any key to exit this window (servers will continue running)
pause > nul

