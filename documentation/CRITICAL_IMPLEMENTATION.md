# G-Studio Critical Implementation Tasks
## Immediate Actions for Functionality

---

## 🔴 CRITICAL - Do These First

### 1. Create .env File (5 minutes)
**Action:** Copy `.env.example` to `.env` and add your Gemini API key

```bash
# Windows Command Prompt
copy .env.example .env

# Then edit .env and replace with your actual key:
# VITE_GEMINI_API_KEY=AIzaSy...your_actual_key
```

**Verification:**
```bash
# Make sure .env is in .gitignore
type .gitignore | findstr .env
```

---

### 2. Update Config to Use Environment Variables (10 minutes)
**File:** `src/config.ts`

**Add this function at the top:**
```typescript
// Load API key from environment or localStorage
export const getApiKey = (): string => {
  // Priority: env var > localStorage > empty
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'your_gemini_api_key_here') {
    return envKey;
  }
  
  try {
    const stored = localStorage.getItem('gstudio_api_key');
    if (stored) return stored;
  } catch (e) {
    console.warn('Cannot access localStorage:', e);
  }
  
  return '';
};

// Save API key to localStorage
export const setApiKey = (key: string): void => {
  try {
    localStorage.setItem('gstudio_api_key', key);
  } catch (e) {
    console.error('Cannot save API key:', e);
  }
};
```

---

### 3. Fix App.tsx API Key Usage (15 minutes)
**File:** `src/App.tsx`

**Find the agentConfig initialization** (around line 120-140) and update:

```typescript
// BEFORE
const { agentConfig, setAgentConfig } = useAgentConfig();

// ADD AFTER - Initialize API key from environment
useEffect(() => {
  const apiKey = getApiKey();
  if (apiKey && !agentConfig.apiKey) {
    setAgentConfig(prev => ({ ...prev, apiKey }));
    console.log('✅ API key loaded from environment');
  }
}, []);
```

**Also update the API key in AI config:**
```typescript
const aiConfig = useMemo(() => ({
  // Connection - Use environment or config
  apiKey: agentConfig.apiKey || getApiKey(),
  // ... rest of config
}), [agentConfig.apiKey, selectedModel]);
```

---

### 4. Verify MCP Tools Registration (10 minutes)
**File:** `src/App.tsx`

**Ensure FILE_TOOLS are passed to Gemini:**

Find the `handleSendMessage` function and verify it includes:
```typescript
const handleSendMessage = async (message: string) => {
  // ... existing code ...
  
  const response = await GeminiService.streamChat(
    updatedMessages,
    selectedModel,
    agentConfig.apiKey || getApiKey(), // ← Ensure API key is passed
    {
      tools: FILE_TOOLS, // ← CRITICAL: Enable MCP tools
      onChunk: (chunk) => { /* ... */ },
      onToolCall: async (toolCall) => {
        // ← CRITICAL: Execute MCP tools
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
          }
        );
        return result;
      }
    }
  );
};
```

---

### 5. Add MCP Tool Execution Logging (10 minutes)
**File:** `src/services/mcpService.ts`

**Add logging at the start of executeTool:**
```typescript
static async executeTool(
  tool: string,
  args: Record<string, any>,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks
): Promise<McpToolResult> {
  // ADD THIS
  console.log('🔧 MCP Tool Execution:', {
    tool,
    args,
    fileCount: Object.keys(files).length
  });
  
  const startTime = Date.now();
  // ... rest of existing code ...
  
  // ADD THIS BEFORE RETURN
  console.log(`✅ MCP Tool ${tool} completed in ${Date.now() - startTime}ms`);
  return result;
}
```

---

### 6. Add API Connection Test Component (15 minutes)
**File:** Create `src/components/ApiConnectionTest.tsx`

```typescript
import { useState } from 'react';
import { GeminiService } from '@/services/geminiService';
import { ModelId } from '@/types';
import { getApiKey } from '@/config';

export function ApiConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing...');
    
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setResult('❌ No API key found. Check .env file.');
        return;
      }

      const response = await GeminiService.chatNonStreaming(
        [{ role: 'user', content: 'Say "Connection successful!" if you can read this.' }],
        ModelId.Gemini3FlashPreview,
        apiKey
      );

      setResult(`✅ SUCCESS: ${response.content}`);
    } catch (error: any) {
      setResult(`❌ ERROR: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-bold mb-2">API Connection Test</h3>
      <button
        onClick={testConnection}
        disabled={testing}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Gemini API'}
      </button>
      {result && (
        <pre className="mt-2 p-2 bg-white rounded text-sm">{result}</pre>
      )}
    </div>
  );
}
```

**Then add to App.tsx (temporarily for testing):**
```typescript
import { ApiConnectionTest } from './components/ApiConnectionTest';

// In the render, add somewhere visible:
{FEATURE_FLAGS.DEBUG_MODE && <ApiConnectionTest />}
```

---

### 7. Ensure Constants.ts Has FILE_TOOLS (5 minutes)
**File:** `src/constants.ts`

**Verify FILE_TOOLS exists:**
```typescript
export const FILE_TOOLS = [
  {
    name: 'create_file',
    description: 'Create a new file with specified content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        changes: { type: 'string', description: 'Changes to make' }
      },
      required: ['path', 'changes']
    }
  },
  {
    name: 'read_file',
    description: 'Read file contents',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' }
      },
      required: ['path']
    }
  }
  // Add more tools as needed
];
```

---

## ✅ Verification Checklist

After completing the above:

```bash
# 1. Ensure dependencies are installed
npm install

# 2. Check TypeScript compiles
npm run type-check

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5173

# 5. Test in browser console:
localStorage.getItem('gstudio_api_key')  // Should show your key or null
```

**In the app:**
1. ✅ No console errors about API key
2. ✅ API Connection Test passes
3. ✅ Can send message "Create a file called test.js with hello world"
4. ✅ File appears in editor
5. ✅ Can edit the file
6. ✅ MCP tool logs appear in console

---

## 🚨 Common Errors & Fixes

### Error: "API key not defined"
**Fix:** 
- Check `.env` file exists in project root
- Verify `VITE_GEMINI_API_KEY` is set (no quotes, no spaces)
- Restart dev server after creating .env

### Error: "Tool execution failed"
**Fix:**
- Check console for MCP tool logs
- Verify FILE_TOOLS is imported in App.tsx
- Ensure callbacks object has all required functions

### Error: "Cannot read properties of undefined"
**Fix:**
- Check App.tsx state initialization
- Verify all hooks are called before any conditionals
- Look for missing null checks

### Error: "Vite config error"
**Fix:**
- Run `npm install` again
- Delete `node_modules` and `.vite` folders
- Run `npm install` fresh

---

## 🎯 Expected Timeline

- ⏱️ **Setup & Config:** 30 minutes
- ⏱️ **Code Changes:** 45 minutes  
- ⏱️ **Testing:** 30 minutes
- ⏱️ **Debugging:** 30 minutes
- **Total:** ~2-3 hours to fully functional

---

## 📝 After It Works

Once basic functionality is verified:

1. **Remove test component** - Delete ApiConnectionTest
2. **Clean up console logs** - Remove debugging logs
3. **Add proper UI** - Polish the interface
4. **Write documentation** - Document how to use features
5. **Create templates** - Add project templates

---

## 🚀 Next Features to Add

After core functionality works:

1. **File tree view** - Visual file explorer
2. **Multi-file editing** - Work on multiple files
3. **Code completion** - AI-powered autocomplete
4. **Debugging tools** - Integrated debugger
5. **Git integration** - Version control
6. **Deployment** - One-click deploy

---

**Status:** Ready to implement
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours
