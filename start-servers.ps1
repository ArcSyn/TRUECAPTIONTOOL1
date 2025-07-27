# Start CapEdify servers
Write-Host "Starting CapEdify servers..." -ForegroundColor Green

Write-Host "Starting Backend on port 4000..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify\server'; node server.js"

Write-Host "Starting Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify\client'; npm run dev"

Write-Host "Done! Frontend will be available at http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API health check: http://localhost:4000/health" -ForegroundColor Green

cd "c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-\CapEdify\client"
npm run dev
