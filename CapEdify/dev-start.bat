@REM TRUECAPTIONTOOL Development Server Launcher
@echo off
setlocal EnableDelayedExpansion
title TRUECAPTIONTOOL Dev Launcher

echo.
echo ========================================================
echo 🚀 TRUECAPTIONTOOL - Starting Development Servers
echo ========================================================
echo.

echo 🛑 Cleaning up any existing Node processes...
taskkill /f /im node.exe 2>nul
if !errorlevel! == 0 (
    echo    ✅ Killed existing Node processes
) else (
    echo    ℹ️  No existing Node processes found
)

echo.
timeout /t 2 >nul

echo 🚀 Starting Backend Server (Port 4000)...
echo    📁 Location: %~dp0server
start "CapEdify Backend" cmd /k "cd /d "%~dp0server" && echo 🔧 Starting backend server... && node server.js"

echo.
echo ⏳ Waiting for backend to initialize...
timeout /t 4 >nul

echo.
echo 🎨 Starting Frontend Server (Port 5173)...
echo    📁 Location: %~dp0client
start "CapEdify Frontend" cmd /k "cd /d "%~dp0client" && echo 🎨 Starting frontend server... && npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo 📊 Backend Health: http://localhost:4000/health
echo 🎨 Frontend App:   http://localhost:5173/
echo.

echo ⏳ Waiting for servers to fully start...
timeout /t 5 >nul

echo.
echo 🔍 Running health check...
echo.

REM Try to run health check with different methods
if exist "%~dp0tools\health-check.ts" (
    cd /d "%~dp0tools"
    echo Running TypeScript health check...
    npx tsx health-check.ts 2>nul
    if !errorlevel! neq 0 (
        echo ⚠️  TypeScript health check failed, trying manual check...
        goto :manual_check
    )
) else (
    echo ⚠️  Health check script not found, doing manual verification...
    goto :manual_check
)

goto :end

:manual_check
echo.
echo 🔍 Manual Health Check:
echo.

REM Check if backend is responding
curl -s http://localhost:4000/health >nul 2>&1
if !errorlevel! == 0 (
    echo ✅ Backend responding on port 4000
) else (
    echo ❌ Backend not responding on port 4000
)

REM Check if frontend is responding  
curl -s http://localhost:5173 >nul 2>&1
if !errorlevel! == 0 (
    echo ✅ Frontend responding on port 5173
) else (
    echo ❌ Frontend not responding on port 5173
)

:end
echo.
echo 🏁 Setup complete! 
echo.
echo 💡 Next steps:
echo    1. Open http://localhost:5173/ in your browser
echo    2. Test the theme selector (4 themes available)
echo    3. Try the JSX export functionality
echo.
echo Press any key to exit...
pause >nul
