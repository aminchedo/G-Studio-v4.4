@echo off
title G-Studio Code Intelligence Launcher
color 0A

REM ============================================================================
REM G-Studio Code Intelligence Menu Launcher
REM ============================================================================

set "SCRIPT_PATH=C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\Debugger\gstudio_analyzer-9.py"
set "DEFAULT_PROJECT=C:\project\G-studio\G-Studio-v4.4_1-Integratedzi"
set "PROJECT_PATH=%DEFAULT_PROJECT%"

REM Enable ANSI colors if possible
for /f "tokens=2 delims=." %%a in ('ver') do set "winver=%%a"
if %winver% geq 100 (set "ANSI=1") else (set "ANSI=0")

if "%ANSI%"=="1" (
    set "ESC="
    set "RED=%ESC%[91m"
    set "GREEN=%ESC%[92m"
    set "YELLOW=%ESC%[93m"
    set "BLUE=%ESC%[94m"
    set "MAGENTA=%ESC%[95m"
    set "CYAN=%ESC%[96m"
    set "WHITE=%ESC%[97m"
    set "BOLD=%ESC%[1m"
    set "RESET=%ESC%[0m"
) else (
    set "RED="
    set "GREEN="
    set "YELLOW="
    set "BLUE="
    set "MAGENTA="
    set "CYAN="
    set "WHITE="
    set "BOLD="
    set "RESET="
)

:check_python
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Python is not installed or not in PATH.%RESET%
    echo Please install Python and ensure it's added to your system PATH.
    pause
    exit /b 1
)

if not exist "%SCRIPT_PATH%" (
    echo %RED%Analyzer script not found at:%RESET% %SCRIPT_PATH%
    pause
    exit /b 1
)

:main_menu
cls
echo %BOLD%%CYAN%============================================================================%RESET%
echo %BOLD%%CYAN%                     G-STUDIO CODE INTELLIGENCE v9.2%RESET%
echo %BOLD%%CYAN%============================================================================%RESET%
echo.
echo %YELLOW%Project path:%RESET% %PROJECT_PATH%
echo.
echo %BOLD%Select analysis type:%RESET%
echo.
echo   %GREEN%1.%RESET% Basic analysis (default, no extra flags)
echo   %GREEN%2.%RESET% Full enterprise analysis (Python, duplicates, recommendations, git, archive, CSV)
echo   %GREEN%3.%RESET% Advanced unused scan (confidence threshold 70)
echo   %GREEN%4.%RESET% Fast unused scan (skip expensive signals)
echo   %GREEN%5.%RESET% Dry run archive simulation (--archive --dry-run)
echo   %GREEN%6.%RESET% Git history only (--git-history)
echo   %GREEN%7.%RESET% Detect barrels and dynamic imports (--detect-barrels --detect-dynamic)
echo   %GREEN%8.%RESET% Change project path
echo   %GREEN%9.%RESET% Custom flags (enter your own flags)
echo  %GREEN%10.%RESET% Help (show all available flags)
echo  %GREEN%0.%RESET% Exit
echo.
set /p CHOICE="%BOLD%Enter choice (0-10): %RESET%"

if "%CHOICE%"=="0" goto :eof
if "%CHOICE%"=="1" goto :basic
if "%CHOICE%"=="2" goto :full
if "%CHOICE%"=="3" goto :unused
if "%CHOICE%"=="4" goto :fast_unused
if "%CHOICE%"=="5" goto :dryrun
if "%CHOICE%"=="6" goto :git_only
if "%CHOICE%"=="7" goto :barrels
if "%CHOICE%"=="8" goto :change_path
if "%CHOICE%"=="9" goto :custom
if "%CHOICE%"=="10" goto :help

echo %RED%Invalid choice. Please try again.%RESET%
pause
goto main_menu

:basic
set "FLAGS="
goto run

:full
set "FLAGS=--enable-python --enable-duplicates --enable-recommendations --git-history --archive --csv"
goto run

:unused
set "FLAGS=--enable-python --enable-duplicates --enable-recommendations --git-history --unused-scan"
echo.
echo %YELLOW%Unused scan uses confidence threshold 70 by default.%RESET%
echo You can change it later with --unused-threshold.
goto run

:fast_unused
set "FLAGS=--enable-python --enable-duplicates --enable-recommendations --git-history --unused-scan --fast-unused-scan"
goto run

:dryrun
set "FLAGS=--archive --dry-run"
goto run

:git_only
set "FLAGS=--git-history"
goto run

:barrels
set "FLAGS=--detect-barrels --detect-dynamic"
goto run

:change_path
cls
echo %BOLD%Current project path:%RESET% %PROJECT_PATH%
echo.
set /p NEW_PATH="Enter new project path (or leave empty to keep current): "
if not "%NEW_PATH%"=="" set "PROJECT_PATH=%NEW_PATH%"
goto main_menu

:custom
echo.
echo %CYAN%Enter any combination of flags (e.g., --enable-python --csv --unused-scan)%RESET%
echo %CYAN%For a full list of flags, choose option 10 (Help).%RESET%
echo.
set /p FLAGS="Flags: "
goto run

:help
cls
echo %BOLD%%CYAN%============================================================================%RESET%
echo %BOLD%%CYAN%                         AVAILABLE COMMAND LINE FLAGS%RESET%
echo %BOLD%%CYAN%============================================================================%RESET%
echo.
python "%SCRIPT_PATH%" --help
echo.
pause
goto main_menu

:run
cls
echo %BOLD%%CYAN%============================================================================%RESET%
echo %BOLD%%CYAN%                           RUNNING ANALYSIS%RESET%
echo %BOLD%%CYAN%============================================================================%RESET%
echo.
echo %YELLOW%Project path:%RESET% %PROJECT_PATH%
echo %YELLOW%Flags:%RESET% %FLAGS%
echo.
echo %BOLD%Executing:%RESET% python "%SCRIPT_PATH%" %FLAGS% "%PROJECT_PATH%"
echo.
python "%SCRIPT_PATH%" %FLAGS% "%PROJECT_PATH%"

if errorlevel 1 (
    echo.
    echo %RED%An error occurred during analysis.%RESET%
) else (
    echo.
    echo %GREEN%Analysis completed successfully.%RESET%
)

echo.
pause
goto main_menu