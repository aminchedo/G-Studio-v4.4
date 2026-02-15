@echo off
REM G-Studio Quick Setup Script
REM This script automates the initial setup process

echo =====================================
echo G-Studio Quick Setup
echo =====================================
echo.

REM Check if .env exists
if exist .env (
    echo [OK] .env file already exists
) else (
    echo [ACTION] Creating .env from template...
    copy .env.example .env
    echo.
    echo [IMPORTANT] Edit .env file and add your Gemini API key:
    echo   VITE_GEMINI_API_KEY=your_actual_api_key_here
    echo.
    pause
)

REM Check if node_modules exists
if exist node_modules (
    echo [OK] node_modules exists
) else (
    echo [ACTION] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo.
echo =====================================
echo Setup Complete!
echo =====================================
echo.
echo Next steps:
echo 1. Edit .env file and add your Gemini API key
echo 2. Run: npm run dev
echo 3. Open browser to http://localhost:5173
echo.
echo For detailed instructions, see:
echo - QUICK_START_ROADMAP.md
echo - CRITICAL_IMPLEMENTATION.md
echo.
pause
