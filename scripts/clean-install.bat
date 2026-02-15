@echo off
echo ========================================
echo G Studio - Clean Install Script
echo ========================================
echo.

echo [1/4] Cleaning node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo     ✓ Deleted node_modules
) else (
    echo     ⚠ node_modules not found
)

echo.
echo [2/4] Cleaning package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
    echo     ✓ Deleted package-lock.json
) else (
    echo     ⚠ package-lock.json not found
)

echo.
echo [3/4] Clearing npm cache...
npm cache clean --force
echo     ✓ Cache cleared

echo.
echo [4/4] Installing dependencies...
npm install

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Next steps:
echo   1. npm run dev
echo   2. npm run build:analyze
echo.
pause
