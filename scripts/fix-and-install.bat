@echo off
echo === G Studio Installation Fix ===
echo.

echo [1/3] Cleaning npm cache...
call npm cache clean --force

echo [2/3] Removing old files...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f package-lock.json

echo [3/3] Installing with legacy peer deps...
call npm install --legacy-peer-deps --no-optional

echo.
echo === Installation Complete ===
echo.
echo Next steps:
echo 1. npm run type-check
echo 2. npm run dev
echo.
pause
