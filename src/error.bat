@echo off
REM =====================================================
REM Debug File Collector
REM This script is intended to be executed INSIDE the src folder
REM It collects specific files and copies them into ./debug
REM while preserving the original directory structure.
REM =====================================================

SETLOCAL ENABLEDELAYEDEXPANSION

REM Base output directory
SET DEBUG_DIR=debug

REM Create debug directory if it does not exist
IF NOT EXIST "%DEBUG_DIR%" (
    mkdir "%DEBUG_DIR%"
)

REM -----------------------------------------------------
REM Function-like pattern:
REM For each file:
REM 1. Create target directory inside debug
REM 2. Copy file while preserving structure
REM -----------------------------------------------------

REM ===== Priority 1 files =====

call :COPY_FILE services\utilityTools.ts
call :COPY_FILE stores\conversationStore.ts
call :COPY_FILE stores\projectStore.ts
call :COPY_FILE stores\settingsStore.ts
call :COPY_FILE test-local-model.ts
call :COPY_FILE test\setup.ts
call :COPY_FILE theme\designTokens.ts
call :COPY_FILE types\editor.ts
call :COPY_FILE types\index.ts
call :COPY_FILE types\preview.ts
call :COPY_FILE utils\apiClient.ts
call :COPY_FILE utils\errorHandler.ts
call :COPY_FILE utils\EventBus.ts
call :COPY_FILE utils\logger.ts
call :COPY_FILE utils\monitoring.ts
call :COPY_FILE utils\performanceUtils.ts
call :COPY_FILE utils\stateUpdateLogger.ts
call :COPY_FILE utils\storageManager.ts

REM ===== Priority 2 files =====

call :COPY_FILE services\mcpService.ts
call :COPY_FILE services\ai\geminiService.ts
call :COPY_FILE hooks\core\useMcp.tsx
call :COPY_FILE components\app\App.tsx

REM -----------------------------------------------------
REM Done
REM -----------------------------------------------------

echo.
echo All specified files have been collected into the "debug" folder.
echo.
pause
exit /b

REM =====================================================
REM Subroutine: COPY_FILE
REM %1 = relative file path (from src)
REM =====================================================
:COPY_FILE
SET FILE_PATH=%1

REM Extract directory path
FOR %%F IN ("%FILE_PATH%") DO SET FILE_DIR=%%~dpF

REM Remove trailing backslash
SET FILE_DIR=!FILE_DIR:~0,-1!

REM Create target directory if needed
IF NOT EXIST "%DEBUG_DIR%\!FILE_DIR!" (
    mkdir "%DEBUG_DIR%\!FILE_DIR!"
)

REM Copy file (overwrite without prompt)
IF EXIST "%FILE_PATH%" (
    copy "%FILE_PATH%" "%DEBUG_DIR%\%FILE_PATH%" >nul
) ELSE (
    echo WARNING: File not found - %FILE_PATH%
)

exit /b
