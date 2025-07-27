# CapEdify Development Startup Script
# Starts both backend (port 4000) and frontend (port 5173)

Write-Host "🚀 Starting CapEdify Development Environment..." -ForegroundColor Green

# Change to project root
Set-Location "c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-"

# Start backend server in background
Write-Host "📡 Starting Backend Server (port 4000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'CapEdify\server'; node server.js"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend in current window
Write-Host "🎨 Starting Frontend Client (port 5173)..." -ForegroundColor Magenta
Set-Location "CapEdify\client"
npm run dev

Write-Host "✅ Both servers should now be running!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:4000" -ForegroundColor Yellow
