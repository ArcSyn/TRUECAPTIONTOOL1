# Kill any existing server processes
Write-Host "🔄 Stopping existing servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate to project directory
Set-Location "C:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify"

Write-Host "🚀 Starting CapEdify servers with LOCAL whisper.cpp..." -ForegroundColor Green
Write-Host "📊 Environment: TRANSCRIPTION_MODE=LOCAL" -ForegroundColor Cyan

# Start both client and server
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify'; npm run start"

Write-Host "✅ Servers starting... Check console for environment debug info" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host "⚡ Backend: http://localhost:4000" -ForegroundColor Blue