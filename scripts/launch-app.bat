@echo off
REM G-Studio v4.4 - Launch application (client + server)
REM Starts the Express server in a new window, then starts the Vite client.
REM Server: default port 5000. Client: Vite dev (e.g. http://localhost:5173).

setlocal
cd /d "%~dp0\.."

if not exist "node_modules" (
  echo [G-Studio] node_modules not found. Run: npm install
  pause
  exit /b 1
)

echo.
echo [G-Studio] Launching server and client...
echo.

if exist "server.js" (
  start "G-Studio Server" cmd /k "cd /d "%~dp0\.." && node server.js"
  timeout /t 2 /nobreak >nul
) else (
  echo [G-Studio] server.js not found; starting client only.
)

start "G-Studio Client" cmd /k "cd /d "%~dp0\.." && npm run dev"

echo [G-Studio] Server and client windows opened. Close each window to stop.
echo.
endlocal
pause
