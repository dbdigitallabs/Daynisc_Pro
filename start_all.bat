@echo off
title Daynisc ERP Startup
color 0B
echo ============================================================
echo   Daynisc ERP - Launching All Services
echo ============================================================
echo.

:: 1. Kill any existing processes on port 8000 and 3000 to prevent conflicts
echo Cleaning up existing stale processes on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo Cleaning up existing stale processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak > nul

:: 1b. Auto-install frontend dependencies if running from a fresh clone
if not exist "web_dashboard\node_modules" (
    echo.
    echo [Setup] First-time setup detected: Installing frontend dependencies...
    cd web_dashboard && call npm install && cd ..
)

:: 2. Launch Backend Server in a new window
echo.
echo [1/3] Starting Backend Server on port 8000...
start "Daynisc Backend" cmd /k "cd backend && python demo_server.py"
timeout /t 2 /nobreak > nul

:: 3. Launch Frontend Server in a new window
echo.
echo [2/3] Starting Frontend Web Dashboard on port 3000...
start "Daynisc Frontend" cmd /k "cd web_dashboard && npm run dev"
timeout /t 3 /nobreak > nul

:: 4. Launch Electron Desktop App
echo.
echo [3/3] Launching Daynisc Electron Desktop App...
start "Daynisc Desktop App" cmd /k "cd web_dashboard && npm run electron:start"

echo.
echo ============================================================
echo   ALL SERVICES & ELECTRON APP ARE NOW RUNNING!
echo.
echo   1. Keep "Daynisc Backend" running.
echo   2. Keep "Daynisc Frontend" running.
echo   3. Daynisc Desktop App is launched!
echo.
echo   You can close this script window now.
echo ============================================================
echo.
timeout /t 5
