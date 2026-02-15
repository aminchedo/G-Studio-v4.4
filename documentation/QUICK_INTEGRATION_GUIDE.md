# Quick Integration Guide - G-Studio Fixes

## 🚀 Immediate Steps (15 minutes)

### 1. Update App.tsx to Use New Components

**Location:** `src/App.tsx`

**Add imports at the top:**
```typescript
// Import new improved components
import { SettingsModalImproved } from '@/components/modals/SettingsModalImproved';
import { EnhancedInputArea } from '@/components/chat/EnhancedInputArea';
import { McpStatusPanel } from '@/components/mcp/McpStatusPanel';
import { AgentCommunicationDialog } from '@/components/mcp/AgentCommunicationDialog';
```

**Add state for MCP communication:**
```typescript
const [showMcpStatus, setShowMcpStatus] = useState(false);
const [showAgentDialog, setShowAgentDialog] = useState(false);
```

**Replace old SettingsModal with SettingsModalImproved:**
```typescript
// BEFORE
<SettingsModal
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  selectedModel={selectedModel}
  onSelectModel={handleModelChange}
/>

// AFTER
<SettingsModalImproved
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  selectedModel={selectedModel}
  onSelectModel={handleModelChange}
/>
```

**Replace old InputArea with EnhancedInputArea:**
```typescript
// BEFORE
<InputArea
  onSend={handleSendMessage}
  disabled={isProcessing}
/>

// AFTER
<EnhancedInputArea
  onSend={handleSendMessage}
  disabled={isProcessing}
  isProcessing={isProcessing}
  showTools={true}
/>
```

**Add MCP Status Panel to Ribbon:**
```typescript
// In the Ribbon component, add a new tab/button:
<button
  onClick={() => setShowMcpStatus(!showMcpStatus)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10"
  title="MCP Tools Status"
>
  <Shield className="w-4 h-4" />
  <span className="text-xs">MCP Status</span>
</button>

// Add the panel (can be in RightActivityBar or a modal):
{showMcpStatus && (
  <McpStatusPanel 
    onTestTool={(toolName) => {
      console.log('Testing MCP tool:', toolName);
      // Add your test logic here
    }}
  />
)}
```

**Add Agent Communication Dialog:**
```typescript
// Add button in UI (e.g., in Ribbon or RightActivityBar):
<button
  onClick={() => setShowAgentDialog(true)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10"
>
  <Bot className="w-4 h-4" />
  <span className="text-xs">Talk to Agent</span>
</button>

// Add dialog to render:
<AgentCommunicationDialog
  isOpen={showAgentDialog}
  onClose={() => setShowAgentDialog(false)}
  onSendMessage={async (message) => {
    // Send message to AI and return response
    const response = await GeminiService.chatNonStreaming(
      [{ role: 'user', content: message }],
      selectedModel,
      agentConfig.apiKey || getApiKey()
    );
    return response.content;
  }}
/>
```

---

### 2. Add API Key Check & Auto-Load

**In App.tsx, add this useEffect near the top:**
```typescript
// Auto-load API key from environment on mount
useEffect(() => {
  const apiKey = getApiKey();
  if (apiKey && !agentConfig.apiKey) {
    setAgentConfig(prev => ({ ...prev, apiKey }));
    console.log('✅ API key loaded from environment');
    
    // Show success notification
    showSuccess('API key loaded successfully');
  } else if (!apiKey) {
    // Show warning if no API key
    showWarning('No API key found. Please add it in Settings.');
  }
}, []);
```

---

### 3. Fix MCP Tool Execution Flow

**In handleSendMessage function, ensure proper tool execution:**

```typescript
const handleSendMessage = async (message: string, files?: File[]) => {
  if (!message.trim()) return;
  
  setIsProcessing(true);
  
  try {
    // Check API key first
    const apiKey = agentConfig.apiKey || getApiKey();
    if (!apiKey) {
      showError('Please add your Gemini API key in Settings');
      setIsProcessing(false);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Log MCP status
    console.log('🔧 MCP Tools Available:', FILE_TOOLS.length);
    
    // Stream response with MCP tools
    const response = await GeminiService.streamChat(
      updatedMessages,
      selectedModel,
      apiKey,
      {
        tools: FILE_TOOLS, // ✅ CRITICAL: Enable MCP tools
        onChunk: (chunk) => {
          // Handle streaming chunks
          console.log('📝 Received chunk:', chunk);
        },
        onToolCall: async (toolCall) => {
          // ✅ CRITICAL: Execute MCP tools
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
            }
          );

          console.log('✅ Tool result:', result);
          
          // Show notification for tool execution
          if (result.success) {
            showSuccess(`Tool ${toolCall.name} executed successfully`);
          } else {
            showError(`Tool ${toolCall.name} failed: ${result.error}`);
          }

          return result;
        },
        onComplete: (finalMessage) => {
          // Handle completion
          console.log('✅ Chat complete:', finalMessage);
          setMessages(prev => [...prev, finalMessage]);
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Chat error:', error);
    showError(`Error: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

---

### 4. Add MCP Status Indicator to UI

**Add a persistent MCP status indicator:**

```typescript
// In your main UI (e.g., bottom of Ribbon or in RightActivityBar)
<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-white/10">
  <Wifi className="w-3.5 h-3.5 text-green-400" />
  <span className="text-xs text-slate-300">MCP Active</span>
  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
    {FILE_TOOLS.length} tools
  </span>
</div>
```

---

### 5. Test Everything

**Open browser console and test:**

```javascript
// 1. Check API key
localStorage.getItem('gstudio_api_key')

// 2. Check MCP tools
console.log(FILE_TOOLS)

// 3. Test sending message
// Type in chat: "Create a file called test.js with console.log('hello')"

// 4. Check console for MCP logs:
// - Should see: "🔧 MCP Tool Execution: create_file"
// - Should see: "✅ MCP Tool create_file completed in XXms"
```

---

## 🎯 Expected Results

After integration:

✅ **Settings Modal:**
- No scrolling required
- All tabs fit perfectly
- Attractive design with gradients
- MCP status visible

✅ **Chat UI:**
- Quick action buttons visible
- Enhanced input area with file attach
- Processing indicator when AI is thinking
- Tool execution notifications

✅ **MCP Communication:**
- MCP status panel shows available tools
- Can test individual tools
- Agent communication dialog for direct chat
- Clear visual feedback on tool execution

✅ **Performance:**
- Lazy loading for modals
- Optimized rendering
- Better error handling
- Fast tool execution

---

## 🐛 Troubleshooting

**Problem:** Settings modal still scrolling
**Fix:** Check that parent container has `h-[600px]` and tabs area has `overflow-hidden`

**Problem:** MCP tools not working
**Fix:** Ensure `FILE_TOOLS` is passed to `GeminiService.streamChat` options

**Problem:** API key not loading
**Fix:** Check `.env` file exists and has `VITE_GEMINI_API_KEY` set

**Problem:** Agent dialog not responding
**Fix:** Check `onSendMessage` function is properly calling AI service

---

## 📝 Next Steps

1. **Test all features** - Make sure everything works
2. **Customize appearance** - Adjust colors/styles to your liking
3. **Add more tools** - Extend FILE_TOOLS with more capabilities
4. **Optimize performance** - Profile and optimize as needed
5. **Write tests** - Add unit tests for critical functions

---

**Estimated Time:** 15-30 minutes
**Difficulty:** Medium
**Impact:** High - Fixes all major issues