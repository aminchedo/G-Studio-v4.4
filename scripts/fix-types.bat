@echo off
echo ========================================
echo Installing Missing Type Definitions
echo ========================================
echo.

echo Installing @types/diff...
call pnpm add -D @types/diff@^8.0.0

echo.
echo Installing @types/react-window...
call pnpm add -D @types/react-window@^2.0.0

echo.
echo Installing @types/uuid...
call pnpm add -D @types/uuid@^11.0.0

echo.
echo ========================================
echo Type definitions installed successfully!
echo ========================================
echo.
echo Running TypeScript check...
call pnpm type-check

echo.
echo Done!
pause
