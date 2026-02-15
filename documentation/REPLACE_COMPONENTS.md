# ⚡ REPLACE COMPONENTS - 2 METHODS

## METHOD 1: Automatic (30 seconds) - RECOMMENDED

### Run PowerShell Script:

```powershell
.\replace-components.ps1
```

**What it does:**
1. ✅ Backs up your old InputArea.tsx
2. ✅ Installs new improved components
3. ✅ Creates index files
4. ✅ Ready to use!

**Then just restart your dev server:**
```bash
npm run dev
```

**DONE!** All improvements are active!

---

## METHOD 2: Manual (2 minutes)

### Step 1: Backup old file
```bash
copy src\components\chat\InputArea.tsx src\components\chat\InputArea.tsx.backup
```

### Step 2: Replace InputArea
```bash
copy src\components\chat\InputAreaImproved.tsx src\components\chat\InputArea.tsx
```

### Step 3: Copy voice component
```bash
# Create directory if needed
mkdir src\components\voice

# Copy voice assistant
copy src\components\voice\VoiceAssistantWorking.tsx src\components\voice\VoiceAssistant.tsx
```

### Step 4: Restart dev server
```bash
npm run dev
```

**DONE!** All improvements are active!

---

## What Changed

### Old InputArea:
- Basic text input
- Send button
- That's it

### New InputArea (Same component, enhanced):
- ✅ Status bar showing connection
- ✅ MCP tools counter
- ✅ Quick action buttons (click ✨)
- ✅ Voice button (click 🎤)
- ✅ File attachment (click 📎)
- ✅ Agent dialog button
- ✅ Processing indicators
- ✅ Offline mode indicator
- ✅ Auto-resizing input
- ✅ Keyboard shortcuts

---

## Update App.tsx (Add Voice Support)

Find where you use `<InputArea>` in App.tsx and update it:

### Before:
```typescript
<InputArea
  onSend={handleSend}
  disabled={isLoading}
/>
```

### After (with voice support):
```typescript
const [isListening, setIsListening] = useState(false);
const [showAgentDialog, setShowAgentDialog] = useState(false);

// ... in your render:

<InputArea
  onSend={handleSend}
  disabled={isLoading}
  isLoading={isLoading}
  currentAIMode={currentAIMode}
  isOfflineResponse={isOfflineResponse}
  onVoiceToggle={() => setIsListening(!isListening)}
  isListening={isListening}
  onAgentDialog={() => setShowAgentDialog(true)}
  agentConnected={!!agentConfig.apiKey}
  mcpToolsCount={6}
/>
```

### Add Voice Component (before InputArea):
```typescript
import { VoiceAssistant } from '@/components/voice/VoiceAssistant';

// ... in your render:

<div className="hidden">
  <VoiceAssistant
    onTranscript={(text) => {
      handleSend(text);
      setIsListening(false);
    }}
    onError={(error) => {
      console.error('Voice error:', error);
      setIsListening(false);
    }}
    isEnabled={isListening}
  />
</div>
```

### Add Agent Dialog (at end of render):
```typescript
import { AgentCommunicationDialog } from '@/components/mcp/AgentCommunicationDialog';

// ... in your render:

<AgentCommunicationDialog
  isOpen={showAgentDialog}
  onClose={() => setShowAgentDialog(false)}
  onSendMessage={async (message) => {
    try {
      const response = await GeminiService.chatNonStreaming(
        [{ role: 'user', content: message }],
        selectedModel,
        agentConfig.apiKey
      );
      return response.content;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }}
/>
```

---

## Test the New Features

After replacement, test these:

1. **Type and send** - Should work normally ✅
2. **Click sparkle (✨)** - Quick actions appear ✅
3. **Click microphone (🎤)** - Voice starts (Chrome/Edge/Safari) ✅
4. **Click Agent button** - Dialog opens ✅
5. **Click paperclip (📎)** - File picker opens ✅

---

## Rollback (If Needed)

If you want to go back to the old version:

```bash
copy src\components\chat\InputArea.tsx.backup src\components\chat\InputArea.tsx
npm run dev
```

---

## Summary

**Automatic way:**
1. Run: `.\replace-components.ps1`
2. Restart: `npm run dev`
3. Done!

**Manual way:**
1. Copy files manually
2. Update App.tsx imports
3. Restart: `npm run dev`
4. Done!

**Both ways give you the same result:**
- Better chat bar
- Working voice
- Agent dialog
- Quick actions
- File attachment

**Choose whichever is easier for you!**