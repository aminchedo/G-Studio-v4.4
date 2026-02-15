@echo off
REM G-Studio v4.4 - Launch Server (Express backend)
REM Starts the Express server (e.g. auth, API). Use with launch-client.bat for full stack.

setlocal
cd /d "%~dp0\.."

echo.
echo [G-Studio] Starting server (Express)...
echo.

if not exist "node_modules" (
  echo [G-Studio] node_modules not found. Run: npm install
  pause
  exit /b 1
)

if not exist "server.js" (
  echo [G-Studio] server.js not found in project root.
  pause
  exit /b 1
)

set PORT=5000
if not "%1"=="" set PORT=%1
echo [G-Studio] Port: %PORT%
echo.

node server.js

endlocal
pause
