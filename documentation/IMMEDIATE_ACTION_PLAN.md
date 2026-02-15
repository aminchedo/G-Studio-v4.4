# G-Studio Immediate Action Plan
## Get It Working in 1 Hour

**Goal:** Minimal changes to make G-Studio fully functional with Gemini API + MCP integration

---

## ✅ PRE-FLIGHT CHECK

Your project ALREADY HAS:
- ✅ Gemini API services implemented
- ✅ MCP tools fully defined (60 tools in FILE_TOOLS)
- ✅ Monaco Editor integrated
- ✅ State management with Zustand
- ✅ React components for UI

**What's Missing:**
- ❌ API key configuration
- ❌ Environment variable loading
- ❌ Tool execution confirmation

---

## 🚀 PART 1: API Key Setup (10 minutes)

### Step 1: Create .env File

**Run this in project root:**
```bash
copy .env.example .env
```

**Edit .env and add your Gemini API key:**
```
VITE_GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

**Verify .env is in .gitignore:**
```bash
type .gitignore | findstr .env
```

If not found, add it:
```bash
echo .env >> .gitignore
```

---

## 🔧 PART 2: Code Changes (30 minutes)

### Change 1: Update src/config.ts

**Add these functions at the top of the file (after imports):**

```typescript
/**
 * Get API key from environment or localStorage
 */
export const getApiKey = (): string => {
  // Priority: environment variable > localStorage
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (envKey && envKey !== 'your_gemini_api_key_here' && envKey.length > 10) {
    console.log('✅ API key loaded from environment');
    return envKey;
  }
  
  try {
    const storedKey = localStorage.getItem('gstudio_api_key');
    if (storedKey && storedKey.length > 10) {
      console.log('✅ API key loaded from localStorage');
      return storedKey;
    }
  } catch (e) {
    console.warn('Cannot access localStorage:', e);
  }
  
  console.warn('⚠️ No API key found in environment or localStorage');
  return '';
};

/**
 * Save API key to localStorage
 */
export const setApiKey = (key: string): void => {
  try {
    if (key && key.length > 10) {
      localStorage.setItem('gstudio_api_key', key);
      console.log('✅ API key saved to localStorage');
    }
  } catch (e) {
    console.error('Cannot save API key to localStorage:', e);
  }
};

/**
 * Validate API key format
 */
export const isValidApiKey = (key: string): boolean => {
  return key && key.startsWith('AIzaSy') && key.length > 30;
};
```

---

### Change 2: Update src/App.tsx

**Find the imports section and add:**
```typescript
import { getApiKey, setApiKey } from '@/config';
```

**Find the agentConfig initialization** (around line 120-150) and add this useEffect **AFTER** state declarations:

```typescript
// Initialize API key from environment on mount
useEffect(() => {
  const envApiKey = getApiKey();
  if (envApiKey && !agentConfig.apiKey) {
    setAgentConfig(prev => ({ ...prev, apiKey: envApiKey }));
    console.log('✅ API key initialized from environment');
  }
}, [agentConfig.apiKey, setAgentConfig]);
```

**Find the `aiConfig` useMemo** (around line 160-180) and update the apiKey line:

```typescript
const aiConfig = useMemo(() => ({
  // Connection - Use agentConfig.apiKey OR fallback to environment
  apiKey: agentConfig.apiKey || getApiKey(), // ← CHANGE THIS LINE
  
  // ... rest of config stays the same
  selectedModel: selectedModel,
  selectionMode: ModelSelectionService.getSelectionMode(agentConfig.apiKey || '') as 'auto' | 'manual',
  // ... etc
}), [agentConfig.apiKey, selectedModel]);
```

**Find the `handleSendMessage` function** and verify it looks like this:

```typescript
const handleSendMessage = useCallback(async (message: string) => {
  if (!message.trim() || isLoading) return;

  // Get API key from config or environment
  const apiKey = agentConfig.apiKey || getApiKey();
  
  if (!apiKey) {
    showError('No API key configured. Please add your Gemini API key in Settings.');
    return;
  }

  console.log('📤 Sending message:', message);
  setIsLoading(true);

  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  };

  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);

  try {
    const assistantMessageId = generateId();
    
    // Create initial assistant message
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    // Stream chat with MCP tools enabled
    const response = await GeminiService.streamChat(
      updatedMessages,
      selectedModel,
      apiKey, // ← CRITICAL: API key passed here
      {
        tools: FILE_TOOLS, // ← CRITICAL: MCP tools enabled
        systemInstruction: INITIAL_SYSTEM_INSTRUCTION,
        onChunk: (chunk: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onToolCall: async (toolCall: any) => {
          // ← CRITICAL: MCP tool execution
          console.log('🔧 Tool called:', toolCall.name, toolCall.arguments);
          
          const result = await McpService.executeTool(
            toolCall.name,
            toolCall.arguments,
            files,
            {
              setFiles,
              setOpenFiles,
              setActiveFile,
              getActiveFile: () => activeFile,
              getOpenFiles: () => openFiles,
              getTokenUsage: () => tokenUsage,
              getSelectedModel: () => selectedModel
            }
          );
          
          console.log('✅ Tool result:', result);
          return result;
        }
      }
    );

    console.log('✅ Message sent successfully');
    
  } catch (error: any) {
    console.error('❌ Error sending message:', error);
    showError(`Failed to send message: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
}, [messages, isLoading, selectedModel, agentConfig.apiKey, files, activeFile, openFiles, tokenUsage]);
```

---

### Change 3: Verify src/constants.ts

**Make sure FILE_TOOLS is exported:**
```typescript
export const FILE_TOOLS: FunctionDeclaration[] = [
  // ... tools definitions ...
];
```

This should already exist based on what we saw earlier.

---

## 🧪 PART 3: Testing (20 minutes)

### Test 1: Install Dependencies

```bash
npm install
```

### Test 2: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v6.4.1  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Test 3: Open Browser

Navigate to: `http://localhost:5173`

### Test 4: Check Console

**Open browser DevTools (F12) and verify:**
```
✅ API key loaded from environment
✅ API key initialized from environment
```

**If you see warnings about API key, check:**
1. Is `.env` file in project root?
2. Does it have `VITE_GEMINI_API_KEY=...`?
3. Did you restart the dev server after creating .env?

### Test 5: Send Test Message

**In the G-Studio chat input, type:**
```
Create a new file called hello.js with a console.log saying "Hello from G-Studio!"
```

**Expected behavior:**
1. Message appears in chat
2. Console shows: `📤 Sending message: ...`
3. Console shows: `🔧 Tool called: create_file ...`
4. Console shows: `✅ Tool result: ...`
5. File appears in editor
6. AI responds confirming file creation

### Test 6: Verify File Creation

**In the console:**
```javascript
// Check files state
window.debugFiles = () => console.log(Object.keys(window.gstudioFiles || {}));
window.debugFiles();
```

**Expected output:**
```
['index.html', 'hello.js']
```

---

## 🎯 SUCCESS CHECKLIST

After completing all steps, you should have:

- [x] .env file with API key
- [x] No console errors about missing API key
- [x] Dev server running on localhost:5173
- [x] Can send messages to AI
- [x] AI can create files via MCP tools
- [x] Files appear in Monaco Editor
- [x] Can edit files manually in editor
- [x] Tool execution logs in console

---

## 🐛 TROUBLESHOOTING

### Issue: "VITE_GEMINI_API_KEY is undefined"

**Solutions:**
1. Verify .env file exists in project root (not in src/)
2. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again
3. Check .env syntax: `VITE_GEMINI_API_KEY=your_key` (no quotes, no spaces around =)

### Issue: "API key not found in environment or localStorage"

**Solutions:**
1. Check .env file has correct key
2. Verify key starts with "AIzaSy"
3. Try adding key via Settings modal in app
4. Check browser console for more details

### Issue: "Tool execution failed"

**Solutions:**
1. Check browser console for error details
2. Verify FILE_TOOLS is imported in App.tsx: `import { FILE_TOOLS } from '@/constants'`
3. Check McpService logs in console
4. Ensure callbacks object has all required functions

### Issue: "Files not appearing in editor"

**Solutions:**
1. Verify setFiles callback is passed to McpService
2. Check browser console for state update errors
3. Look for React errors in console
4. Verify EditorTabs component is rendering

### Issue: "Cannot find module '@/...' "

**Solutions:**
1. Check tsconfig.json has correct paths configuration
2. Verify Vite config has path aliases
3. Run `npm install` again
4. Delete `node_modules` and reinstall

---

## 📊 VERIFICATION COMMANDS

**After implementation, run these checks:**

```bash
# 1. Type check
npm run type-check

# 2. Lint check
npm run lint

# 3. Build test
npm run build

# 4. Preview production build
npm run preview
```

**All should pass without errors.**

---

## 🎓 WHAT YOU JUST DID

1. **Set up environment variables** - Gemini API key now loads automatically
2. **Connected API to app** - App reads key and passes to Gemini service
3. **Enabled MCP tools** - AI can now actually create/edit files
4. **Verified execution** - Tools execute and files appear in editor

**The app now has:**
- ✅ AI chat with Gemini API
- ✅ Code editing via natural language
- ✅ Real-time file creation
- ✅ Monaco Editor integration
- ✅ MCP tool execution

---

## 🚀 NEXT STEPS

Now that it works, you can:

1. **Test all MCP tools** - Try edit_file, delete_file, search_files, etc.
2. **Build features** - Ask AI to create components, utilities, etc.
3. **Optimize** - Add caching, error recovery, better UI
4. **Deploy** - Build for production: `npm run build`
5. **Extend** - Add more tools, features, integrations

---

## 📞 NEED HELP?

**Check these files for reference:**
- `QUICK_START_ROADMAP.md` - Detailed roadmap
- `CRITICAL_IMPLEMENTATION.md` - In-depth implementation guide
- `src/services/geminiService.ts` - API implementation
- `src/services/mcpService.ts` - Tool implementation
- `src/App.tsx` - Main application logic

**Common questions:**
- **Where do I add my API key?** → `.env` file in project root
- **How do I test if it works?** → Send message asking AI to create a file
- **What if tools don't execute?** → Check browser console for errors
- **Can I use a different model?** → Yes, change `selectedModel` state

---

**Estimated Implementation Time:** 60 minutes
**Status:** Ready to implement
**Priority:** IMMEDIATE
