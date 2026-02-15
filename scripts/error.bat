@echo off
REM =====================================================
REM Debug File Collector (Absolute & Safe)
REM This script uses its own location as the SRC root
REM =====================================================

SETLOCAL

REM Absolute path to src (location of this .bat file)
SET SRC_ROOT=%~dp0
SET DEBUG_DIR=%SRC_ROOT%debug

REM Normalize (remove trailing backslash)
IF "%SRC_ROOT:~-1%"=="\" SET SRC_ROOT=%SRC_ROOT:~0,-1%

REM Create debug directory
IF NOT EXIST "%DEBUG_DIR%" (
    mkdir "%DEBUG_DIR%"
)

REM ================= Priority 1 =================

call :COPY services\utilityTools.ts
call :COPY stores\conversationStore.ts
call :COPY stores\projectStore.ts
call :COPY stores\settingsStore.ts
call :COPY test-local-model.ts
call :COPY test\setup.ts
call :COPY theme\designTokens.ts
call :COPY types\editor.ts
call :COPY types\index.ts
call :COPY types\preview.ts
call :COPY utils\apiClient.ts
call :COPY utils\errorHandler.ts
call :COPY utils\EventBus.ts
call :COPY utils\logger.ts
call :COPY utils\monitoring.ts
call :COPY utils\performanceUtils.ts
call :COPY utils\stateUpdateLogger.ts
call :COPY utils\storageManager.ts

REM ================= Priority 2 =================

call :COPY services\mcpService.ts
call :COPY services\ai\geminiService.ts
call :COPY hooks\core\useMcp.tsx
call :COPY components\app\App.tsx

echo.
echo Debug file collection finished.
pause
exit /b

REM =====================================================
REM COPY subroutine
REM %1 = relative path inside src
REM =====================================================
:COPY
SET REL_PATH=%1
SET SRC_FILE=%SRC_ROOT%\%REL_PATH%
SET DST_FILE=%DEBUG_DIR%\%REL_PATH%

REM Create destination directory
FOR %%A IN ("%DST_FILE%") DO (
    IF NOT EXIST "%%~dpA" mkdir "%%~dpA"
)

REM Copy if exists
IF EXIST "%SRC_FILE%" (
    copy "%SRC_FILE%" "%DST_FILE%" >nul
) ELSE (
    echo WARNING: File not found - %REL_PATH%
)

exit /b
