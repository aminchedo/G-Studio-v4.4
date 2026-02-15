@echo off
REM Voice Chat Integration - Quick Start
REM Integrates VoiceChatModal into G-Studio

echo =========================================
echo Voice Chat Integration - Quick Start
echo =========================================
echo.

echo Step 1: Creating directories...
if not exist "src\components\modals" mkdir "src\components\modals"
if not exist "src\hooks" mkdir "src\hooks"
echo [OK] Directories created
echo.

echo Step 2: Copying VoiceChatModal...
copy "temp\src_FEATURE\components\modals\VoiceChatModal.tsx" "src\components\modals\VoiceChatModal.tsx"
if errorlevel 1 (
    echo [ERROR] Failed to copy VoiceChatModal.tsx
    pause
    exit /b 1
)
echo [OK] VoiceChatModal.tsx copied
echo.

echo Step 3: Check if useSpeechRecognition hook needs to be created...
if not exist "src\hooks\useSpeechRecognition.ts" (
    echo [INFO] Creating useSpeechRecognition hook...
    echo. > "src\hooks\useSpeechRecognition.ts"
    echo [WARNING] Please add the hook code from VOICE_INTEGRATION_GUIDE.md
) else (
    echo [OK] Hook already exists
)
echo.

echo =========================================
echo Integration Steps Complete!
echo =========================================
echo.
echo Next steps:
echo 1. Add useSpeechRecognition hook code (see VOICE_INTEGRATION_GUIDE.md)
echo 2. Add state to App.tsx:
echo    const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
echo.
echo 3. Add VoiceChatModal to App.tsx render:
echo    ^<VoiceChatModal
echo      isOpen={isVoiceChatOpen}
echo      onClose={() =^> setIsVoiceChatOpen(false)}
echo      apiKey={agentConfig.apiKey}
echo    /^>
echo.
echo 4. Add button to trigger: setIsVoiceChatOpen(true)
echo.
echo For detailed instructions, see:
echo - VOICE_INTEGRATION_GUIDE.md
echo.
pause
