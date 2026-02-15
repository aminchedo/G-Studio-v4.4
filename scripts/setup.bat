@echo off
REM G-Studio Complete Setup Script for Windows
REM Automatically installs and configures everything

setlocal enabledelayedexpansion

echo ================================================
echo   G-Studio Conversational IDE - Setup
echo ================================================
echo.

REM Check Node.js
echo [1/6] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Install dependencies
echo [2/6] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Setup MCP servers (optional)
echo [3/6] Setting up MCP servers...
if exist "mcp-servers" (
  cd mcp-servers
  if exist "install.bat" (
    call install.bat
    if %ERRORLEVEL% NEQ 0 (
      echo [WARNING] MCP server installation had issues
      echo You can retry later with: cd mcp-servers ^&^& install.bat
    ) else (
      echo [OK] MCP servers installed successfully
    )
  ) else (
    echo [WARNING] install.bat not found in mcp-servers
  )
  cd ..
) else (
  echo [WARNING] mcp-servers directory not found - skipping
)
echo.

REM Setup configuration
echo [4/6] Setting up configuration...
if exist "config\mcp-config.example.json" (
  if not exist "config\mcp-config.json" (
    copy config\mcp-config.example.json config\mcp-config.json >nul
    echo [OK] Configuration file created
  ) else (
    echo [OK] Configuration file already exists
  )
) else (
  echo [WARNING] config\mcp-config.example.json not found - skipping
)
echo.

REM Create data directory
echo [5/6] Creating data directories...
if not exist "data" mkdir data
echo [OK] Data directories created
echo.

REM Verify installation
echo [6/6] Verifying installation...
set ERRORS=0

if not exist "src\components\IntegratedConversationalIDE.tsx" (
  echo [WARNING] Main component missing
  set /a ERRORS+=1
)

if %ERRORS% EQU 0 (
  echo [OK] All components verified
) else (
  echo [WARNING] Found %ERRORS% issues - review above
)
echo.

REM Final instructions
echo ================================================
echo [OK] Setup Complete!
echo ================================================
echo.
echo Next steps:
echo.
echo 1. Get your FREE Gemini API key:
echo    -^> https://makersuite.google.com/app/apikey
echo.
echo 2. Start G-Studio:
echo    npm run dev
echo.
echo 3. Enter your API key when prompted
echo.
echo 4. Start coding with AI! Try:
echo    - Type: "Create a React component..."
echo    - Voice: "Generate a color palette..."
echo.
echo Read README.md or COMPLETE_SETUP_GUIDE.md for full documentation
echo.

REM Offer to start immediately
set /p REPLY="Start G-Studio now? (y/n) "
if /i "%REPLY%"=="y" (
  echo.
  echo Starting G-Studio...
  echo.
  npm run dev
) else (
  echo.
  echo Run 'npm run dev' when you're ready to start!
  echo.
)

pause
