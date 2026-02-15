@echo off
REM G-Studio v4.4 - Launch Client (Vite dev server / SPA)
REM Starts the frontend development server. Use this for client-only development.

setlocal
cd /d "%~dp0\.."

echo.
echo [G-Studio] Starting client (Vite dev)...
echo.

if not exist "node_modules" (
  echo [G-Studio] node_modules not found. Run: npm install
  pause
  exit /b 1
)

call npm run dev

endlocal
pause
