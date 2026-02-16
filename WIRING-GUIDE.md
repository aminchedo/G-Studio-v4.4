# 🔌 Component Wiring Guide

## Complete Integration of AI Features

This guide shows you how all the components are wired together and how to use them in your app.

---

## 📁 Organized File Structure

```
src/
├── features/ai/                     ⭐ AI Features Module
│   ├── AISettingsHub.tsx            (Enhanced version - main settings)
│   ├── AIModule.tsx                 (Main integration component)
│   ├── index.ts                     (Central exports)
│   │
│   ├── AISettingsHub/               (Settings tabs)
│   │   ├── ConnectionTab.tsx        (Enhanced connection tab)
│   │   ├── ModelsTab.tsx
│   │   ├── ProvidersTab.tsx
│   │   ├── APITestTab.tsx
│   │   ├── BehaviorTab.tsx
│   │   ├── VoiceInputTab.tsx
│   │   ├── VoiceOutputTab.tsx
│   │   ├── LocalAITab.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── gemini-tester/               (Gemini testing module)
│   └── [other AI features...]
│
└── components/conversation/         ⭐ Conversation Module
    ├── ConversationWindow.tsx       (Basic chat)
    ├── EnhancedConversationWindow.tsx (Advanced chat)
    ├── ConversationDemo.tsx         (Demo component)
    ├── index.ts                     (Exports)
    ├── README.md                    (Documentation)
    └── VISUAL-GUIDE.md              (Design specs)
```

---

## 🔌 Import Patterns

### ✅ Correct Imports

```typescript
// AI Settings Hub
import { AISettingsHub } from '@/features/ai';
// OR
import { AISettingsHub } from '@/features/ai/AISettingsHub';

// Conversation Components
import { 
  ConversationWindow,
  EnhancedConversationWindow,
  ConversationDemo 
} from '@/components/conversation';

// All AI Features (Main Integration)
import { AIModule } from '@/features/ai';

// Types
import type { AIConfig } from '@/features/ai/AISettingsHub/types';
```

### ❌ Wrong Imports (Don't Use)

```typescript
// Don't use old paths
import { AISettingsHub } from '@/components/AISettingsHub'; // ❌
import { AISettingsHubEnhanced } from '@/features/ai'; // ❌ (now just AISettingsHub)
```

---

## 🎯 How to Wire Components

### Option 1: Use AIModule (Recommended - All-in-One)

The `AIModule` component handles both settings and conversation:

```tsx
import React, { useState } from 'react';
import { AIModule } from '@/features/ai';

function MyApp() {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleSendMessage = async (message: string) => {
    // Call your AI API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    return data.reply;
  };

  const handleSaveSettings = (config) => {
    console.log('Settings saved:', config);
    // Save to your backend or localStorage
  };

  return (
    <div>
      {/* Your app UI */}
      <button onClick={() => setShowSettings(true)}>
        Open AI Settings
      </button>
      <button onClick={() => setShowChat(true)}>
        Open Chat
      </button>

      {/* AI Module handles everything */}
      <AIModule
        showSettings={showSettings}
        onSettingsClose={() => setShowSettings(false)}
        onSettingsSave={handleSaveSettings}
        
        showConversation={showChat}
        onConversationClose={() => setShowChat(false)}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
```

### Option 2: Use Components Individually

If you want more control, use components separately:

```tsx
import React, { useState } from 'react';
import { AISettingsHub } from '@/features/ai';
import { EnhancedConversationWindow } from '@/components/conversation';

function MyApp() {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);

  return (
    <div>
      {/* Settings Modal */}
      <AISettingsHub
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(config) => console.log('Saved:', config)}
      />

      {/* Chat Window */}
      {showChat && (
        <div className="fixed inset-0 z-50">
          <EnhancedConversationWindow
            onSendMessage={async (msg) => await callAI(msg)}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 📍 Integration with Existing App.tsx

Your app already has `AISettingsHub` imported. Here's how to add the conversation window:

### Step 1: Add Import

In `src/components/app/App.tsx` (or wherever your main App is):

```tsx
// Add this import at the top
import { EnhancedConversationWindow } from '@/components/conversation';
```

### Step 2: Add State

```tsx
// Add state for conversation window
const [isConversationOpen, setIsConversationOpen] = useState(false);
```

### Step 3: Add Handler

```tsx
// Add message handler
const handleSendMessage = useCallback(async (message: string) => {
  // Your AI API call here
  // For now, just echo
  return `AI Response to: ${message}`;
}, []);
```

### Step 4: Add UI Trigger

Add a button somewhere in your UI:

```tsx
<button 
  onClick={() => setIsConversationOpen(true)}
  className="..."
>
  💬 Open Chat
</button>
```

### Step 5: Add Component

Add this where your other modals are (near the AISettingsHub):

```tsx
{/* AI Settings Hub (already exists) */}
{isAISettingsHubOpen && (
  <AISettingsHub
    isOpen={isAISettingsHubOpen}
    onClose={() => setIsAISettingsHubOpen(false)}
    config={aiConfig}
    onSave={handleAIConfigSave}
  />
)}

{/* Conversation Window (NEW - add this) */}
{isConversationOpen && (
  <div className="fixed inset-0 z-50">
    <EnhancedConversationWindow
      onSendMessage={handleSendMessage}
      showSearch={true}
      showExport={true}
      allowEdit={true}
      allowDelete={true}
    />
    <button
      onClick={() => setIsConversationOpen(false)}
      className="absolute top-4 right-4 p-2 bg-slate-700 rounded-lg"
    >
      ✕ Close
    </button>
  </div>
)}
```

---

## 🎨 Adding to Ribbon/Toolbar

If you want to add a chat button to your ribbon:

```tsx
// In Ribbon.tsx or your toolbar component
<button
  onClick={onOpenConversation}  // Pass this as a prop
  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
  <span>AI Chat</span>
</button>
```

---

## 🔗 Connecting to Real AI API

### Gemini AI Example

```tsx
const handleSendMessage = async (message: string): Promise<string> => {
  const apiKey = aiConfig.apiKey; // From your settings
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    }
  );
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};
```

### OpenAI Example

```tsx
const handleSendMessage = async (message: string): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
};
```

---

## 📦 Complete Example

Here's a complete working example:

```tsx
import React, { useState, useCallback } from 'react';
import { AISettingsHub } from '@/features/ai';
import { EnhancedConversationWindow } from '@/components/conversation';
import type { AIConfig } from '@/features/ai/AISettingsHub/types';

export function App() {
  // State
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiConfig, setAiConfig] = useState<Partial<AIConfig>>({});

  // Handlers
  const handleSaveSettings = useCallback((config: AIConfig) => {
    setAiConfig(config);
    localStorage.setItem('ai_config', JSON.stringify(config));
    setShowSettings(false);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!aiConfig.apiKey) {
      throw new Error('Please configure your API key in settings');
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${aiConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }]
          })
        }
      );

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI Error:', error);
      return 'Sorry, there was an error processing your message.';
    }
  }, [aiConfig.apiKey]);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">G-Studio</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChat(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            💬 AI Chat
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Your app content here */}
        <div className="text-center text-slate-400">
          <p>Click AI Chat to start a conversation</p>
          <p>Click Settings to configure your API</p>
        </div>
      </main>

      {/* AI Settings Modal */}
      <AISettingsHub
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={aiConfig}
        onSave={handleSaveSettings}
      />

      {/* Conversation Window */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[80vh] relative">
            <button
              onClick={() => setShowChat(false)}
              className="absolute -top-12 right-0 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              ✕ Close
            </button>
            <div className="h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <EnhancedConversationWindow
                onSendMessage={handleSendMessage}
                showSearch={true}
                showExport={true}
                allowEdit={true}
                allowDelete={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Verification Checklist

After integrating, verify:

- [ ] Settings modal opens correctly
- [ ] Connection tab shows enhanced version
- [ ] API key can be saved
- [ ] Conversation window opens
- [ ] Messages can be sent
- [ ] Messages are received
- [ ] Code highlighting works
- [ ] Search functionality works
- [ ] Export works
- [ ] No console errors
- [ ] All imports resolve correctly

---

## 🐛 Common Issues & Fixes

### Issue: Import errors

**Fix:** Make sure your `tsconfig.json` has path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Components not showing

**Fix:** Check z-index conflicts. Conversation uses `z-50`, settings uses `z-[9999]`

### Issue: Styles not applying

**Fix:** Verify Tailwind config includes all paths:
```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
}
```

---

## 📚 Additional Resources

- **Conversation API**: `src/components/conversation/README.md`
- **Settings Docs**: `docs/ENHANCED-UI-README.md`
- **Visual Guide**: `src/components/conversation/VISUAL-GUIDE.md`
- **Quick Reference**: `QUICK-REFERENCE.md`

---

## 🎉 You're Ready!

All components are:
- ✅ Properly organized
- ✅ Correctly wired
- ✅ Import paths fixed
- ✅ Ready to use

Start integrating with the examples above! 🚀
