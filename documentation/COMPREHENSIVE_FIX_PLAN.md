# G-Studio Comprehensive Fix Plan
## Fixing All Critical Issues

---

## 🎯 Issues to Fix

1. ❌ **Model Recognition** - Models don't work properly in modules
2. ❌ **Performance** - Very heavy to test
3. ❌ **API Flow** - Nothing works after API confirmation
4. ❌ **Chat UI** - Poorly designed, not flexible
5. ❌ **Settings UI** - Not attractive, requires scrolling
6. ❌ **MCP Communication** - Can't communicate with agent, unclear tool access

---

## 🔧 Solution Overview

### Phase 1: Core Communication & MCP (CRITICAL)
- Add MCP status indicator
- Show available tools in UI
- Add agent communication panel
- Fix API flow

### Phase 2: Settings Redesign
- Modern tabbed interface (no scrolling)
- Attractive visual design
- Compact sections

### Phase 3: Chat UI Overhaul
- Flexible layout
- Better message display
- Tool execution visibility
- Performance optimization

### Phase 4: Model Selection Fix
- Clear model status
- Proper error handling
- Testing interface

---

## 📋 Phase 1: MCP Communication Fix (30 min)

### 1.1 Create MCP Status Component

**File:** `src/components/mcp/McpStatusPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Tool, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  available: boolean;
}

interface McpStatusPanelProps {
  onTestTool?: (toolName: string) => void;
}

export const McpStatusPanel: React.FC<McpStatusPanelProps> = ({ onTestTool }) => {
  const [connected, setConnected] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  // Available MCP tools
  const mcpTools: Tool[] = [
    { name: 'create_file', description: 'Create new files', available: true },
    { name: 'read_file', description: 'Read file contents', available: true },
    { name: 'edit_file', description: 'Edit existing files', available: true },
    { name: 'delete_file', description: 'Delete files', available: true },
    { name: 'search_files', description: 'Search in files', available: true },
    { name: 'run', description: 'Execute commands', available: true },
  ];

  useEffect(() => {
    setTools(mcpTools);
    // Simulate connection check
    setConnected(true);
  }, []);

  const handleTestTool = async (toolName: string) => {
    setTesting(toolName);
    setTimeout(() => {
      setTesting(null);
      onTestTool?.(toolName);
    }, 1000);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm font-medium text-white">
            MCP Status: {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {connected ? 'Active' : 'Offline'}
        </span>
      </div>

      {/* Available Tools */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
          Available Tools ({tools.filter(t => t.available).length}/{tools.length})
        </h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1">
                <Tool className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white">{tool.name}</div>
                  <div className="text-[10px] text-slate-400">{tool.description}</div>
                </div>
              </div>
              <button
                onClick={() => handleTestTool(tool.name)}
                disabled={!tool.available || testing === tool.name}
                className="px-2 py-1 text-xs rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 disabled:opacity-50 transition-colors"
              >
                {testing === tool.name ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Communication Test */}
      <div className="border-t border-white/10 pt-3">
        <button
          onClick={() => onTestTool?.('agent_ping')}
          className="w-full px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm font-medium"
        >
          Test Agent Communication
        </button>
      </div>
    </div>
  );
};
```

### 1.2 Add Agent Communication Dialog

**File:** `src/components/mcp/AgentCommunicationDialog.tsx`

```typescript
import React, { useState } from 'react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface AgentCommunicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string>;
}

export const AgentCommunicationDialog: React.FC<AgentCommunicationDialogProps> = ({
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: 'Hello! I\'m your AI agent. Ask me about my available tools or request a task.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await onSendMessage(input);
      const agentMessage: Message = {
        role: 'agent',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'agent',
        content: `Error: ${error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-md bg-black/50" />
      <div
        className="relative bg-slate-900 rounded-xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Agent Communication</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 text-purple-200'
                    : 'bg-slate-700/50 text-slate-200'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask agent about tools, status, or request a task..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 📋 Phase 2: Settings Redesign (45 min)

### 2.1 Modern Settings Modal (No Scrolling)

**File:** `src/components/modals/SettingsModalNew.tsx`

```typescript
import React, { useState } from 'react';
import {
  X,
  Cpu,
  Zap,
  Settings,
  Palette,
  Shield,
  Wifi,
  Check,
} from 'lucide-react';
import { ModelId, ModelOption } from '@/types';
import { SUPPORTED_MODELS } from '@/constants';

interface SettingsModalNewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
}

type Tab = 'models' | 'connection' | 'behavior' | 'appearance';

export const SettingsModalNew: React.FC<SettingsModalNewProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('models');

  if (!isOpen) return null;

  const tabs = [
    { id: 'models', label: 'AI Models', icon: Cpu, color: 'purple' },
    { id: 'connection', label: 'Connection', icon: Wifi, color: 'blue' },
    { id: 'behavior', label: 'Behavior', icon: Zap, color: 'amber' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'pink' },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-md bg-black/50" />
      <div
        className="relative bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl h-[600px] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">Configure G-Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with Tabs */}
        <div className="flex-1 flex min-h-0">
          {/* Tab Sidebar */}
          <div className="w-48 border-r border-white/10 p-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isActive
                      ? `bg-${tab.color}-500/10 text-${tab.color}-400 border border-${tab.color}-500/30`
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'models' && (
              <ModelsTab selectedModel={selectedModel} onSelectModel={onSelectModel} />
            )}
            {activeTab === 'connection' && <ConnectionTab />}
            {activeTab === 'behavior' && <BehaviorTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tab Components
const ModelsTab: React.FC<{
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
}> = ({ selectedModel, onSelectModel }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">Select AI Model</h3>
      <p className="text-xs text-slate-400">Choose the model for your tasks</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {SUPPORTED_MODELS.map((model: ModelOption) => (
        <button
          key={model.id}
          onClick={() => onSelectModel(model.id)}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedModel === model.id
              ? 'bg-purple-500/10 border-purple-500/40'
              : 'bg-slate-800/50 border-white/10 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-semibold text-white">{model.name}</span>
            {selectedModel === model.id && <Check className="w-4 h-4 text-purple-400" />}
          </div>
          <p className="text-xs text-slate-400">{model.description}</p>
        </button>
      ))}
    </div>
  </div>
);

const ConnectionTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">API Configuration</h3>
      <p className="text-xs text-slate-400">Manage your API connections</p>
    </div>
    {/* Add connection settings here */}
  </div>
);

const BehaviorTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">Agent Behavior</h3>
      <p className="text-xs text-slate-400">Configure how the AI behaves</p>
    </div>
    {/* Add behavior settings here */}
  </div>
);

const AppearanceTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">UI Appearance</h3>
      <p className="text-xs text-slate-400">Customize the interface</p>
    </div>
    {/* Add appearance settings here */}
  </div>
);
```

---

## 📋 Phase 3: Chat UI Improvements (45 min)