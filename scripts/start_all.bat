@echo off
title G-Studio Launcher

echo ===============================
echo   G-Studio Full Stack Starter
echo ===============================

REM -------------------------------
REM CONFIG
REM -------------------------------
set PYTHON_SERVER=gmail_server.py
set FRONTEND_CMD=npm run dev
set BACKEND_PORT=5000
set FRONTEND_PORT=3000

REM -------------------------------
REM OPTIONAL: Activate venv if exists
REM -------------------------------
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM -------------------------------
REM Start Backend Server
REM -------------------------------
echo Starting Python Backend on port %BACKEND_PORT%...
start "G-Studio Backend" cmd /k python %PYTHON_SERVER%

REM Give backend time to boot
timeout /t 3 > nul

REM -------------------------------
REM Start Frontend
REM -------------------------------
echo Starting Vite Frontend on port %FRONTEND_PORT%...
start "G-Studio Frontend" cmd /k %FRONTEND_CMD%

echo.
echo ======================================
echo  Backend  -> http://localhost:%BACKEND_PORT%
echo  Frontend -> http://localhost:%FRONTEND_PORT%
echo ======================================
echo.
echo Both services started.
echo Close their windows to stop them.
