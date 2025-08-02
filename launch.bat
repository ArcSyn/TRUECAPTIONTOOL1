@echo off
echo 🧹 Killing ports 5173 and 4000...

for %%P in (5173 4000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
        echo ⚠ Killing PID %%a on port %%P...
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo 🚀 Launching frontend (in new window)...
start cmd /k "cd /d .\CapEdify\client && npm run dev"

echo 🚀 Launching backend (in new window)...
start cmd /k "cd /d .\CapEdify\server && npm start"

echo ✅ All systems launched (frontend + backend in new terminals)
pause
