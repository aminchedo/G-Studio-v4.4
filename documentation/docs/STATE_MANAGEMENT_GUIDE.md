# G-Studio State Management Guide

## 🎯 Overview

This guide explains the new Context-based state management system that eliminates prop drilling and improves component reusability.

## 📦 New Context Providers

### 1. AppStateContext
Manages all application state including editor, chat, UI panels, agent config, and theme.

### 2. ModalContext
Centralized modal management for all modals in the application.

## 🚀 Quick Start

### Setup in App.tsx

```typescript
import { AppStateProvider, ModalProvider } from './contexts';

function App() {
  return (
    <AppStateProvider>
      <ModalProvider>
        {/* Your app components */}
      </ModalProvider>
    </AppStateProvider>
  );
}
```

## 📚 Usage Examples

### Using Editor State

**Before (Prop Drilling):**
```typescript
// App.tsx
<Sidebar 
  files={files}
  setFiles={setFiles}
  activeFile={activeFile}
  setActiveFile={setActiveFile}
  openFiles={openFiles}
  setOpenFiles={setOpenFiles}
/>

// Sidebar.tsx
interface SidebarProps {
  files: Record<string, FileData>;
  setFiles: (files: Record<string, FileData>) => void;
  activeFile: string | null;
  setActiveFile: (file: string | null) => void;
  openFiles: string[];
  setOpenFiles: (files: string[]) => void;
}
```

**After (Context):**
```typescript
// App.tsx
<Sidebar />

// Sidebar.tsx
import { useEditorFiles } from '../contexts';

function Sidebar() {
  const { files, setFiles, activeFile, setActiveFile, openFiles, setOpenFiles } = useEditorFiles();
  // Use state directly - no props needed!
}
```

### Using UI Panels

**Before:**
```typescript
<Ribbon
  chatVisible={chatVisible}
  onToggleChat={() => setChatVisible(!chatVisible)}
  sidebarVisible={sidebarVisible}
  onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
  // ... 10+ more props
/>
```

**After:**
```typescript
// App.tsx
<Ribbon />

// Ribbon.tsx
import { useUIPanels } from '../contexts';

function Ribbon() {
  const { 
    chatVisible, 
    setChatVisible,
    sidebarVisible,
    setSidebarVisible 
  } = useUIPanels();
  
  const toggleChat = () => setChatVisible(!chatVisible);
  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
}
```

### Using Modals

**Before:**
```typescript
// App.tsx
const [isSettingsOpen, setIsSettingsOpen] = useState(false);
const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
const [activeAgentTab, setActiveAgentTab] = useState('connection');

<Ribbon onOpenSettings={() => setIsSettingsOpen(true)} />
<SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
```

**After:**
```typescript
// App.tsx
<Ribbon />
<SettingsModal />

// Ribbon.tsx
import { useSettingsModal } from '../contexts';

function Ribbon() {
  const settings = useSettingsModal();
  
  return (
    <button onClick={settings.open}>
      Open Settings
    </button>
  );
}

// SettingsModal.tsx
import { useSettingsModal } from '../contexts';

function SettingsModal() {
  const { isOpen, close } = useSettingsModal();
  
  if (!isOpen) return null;
  
  return (
    <div>
      <button onClick={close}>Close</button>
    </div>
  );
}
```

### Using Agent Modal with Tabs

```typescript
import { useAgentModal } from '../contexts';

function Ribbon() {
  const agent = useAgentModal();
  
  // Open to specific tab
  const openConnection = () => agent.open('connection');
  const openVoice = () => agent.open('voice');
  const openIdentity = () => agent.open('identity');
  
  return (
    <>
      <button onClick={openConnection}>API Key</button>
      <button onClick={openVoice}>Voice</button>
      <button onClick={openIdentity}>Persona</button>
    </>
  );
}

function AgentModal() {
  const { isOpen, close, tab, setTab } = useAgentModal();
  
  if (!isOpen) return null;
  
  return (
    <div>
      <Tabs activeTab={tab} onChange={setTab}>
        {/* Tab content */}
      </Tabs>
      <button onClick={close}>Close</button>
    </div>
  );
}
```

### Using Theme

```typescript
import { useTheme } from '../contexts';

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDarkMode ? '🌙' : '☀️'}
    </button>
  );
}
```

### Using Voice

```typescript
import { useVoice } from '../contexts';

function VoiceButton() {
  const { isListening, toggleListening } = useVoice();
  
  return (
    <button onClick={toggleListening}>
      {isListening ? 'Stop' : 'Start'} Listening
    </button>
  );
}
```

## 🎨 Available Hooks

### AppStateContext Hooks

#### `useAppState()`
Returns all application state. Use sparingly - prefer specific hooks.

#### `useEditorFiles()`
```typescript
const { 
  files,           // Record<string, FileData>
  setFiles,        // Setter
  openFiles,       // string[]
  setOpenFiles,    // Setter
  activeFile,      // string | null
  setActiveFile    // Setter
} = useEditorFiles();
```

#### `useChatMessages()`
```typescript
const {
  messages,        // Message[]
  setMessages,     // Setter
  isLoading,       // boolean
  setIsLoading,    // Setter
  tokenUsage,      // { input: number; output: number }
  setTokenUsage    // Setter
} = useChatMessages();
```

#### `useUIPanels()`
```typescript
const {
  chatVisible,
  setChatVisible,
  chatCollapsed,
  setChatCollapsed,
  sidebarVisible,
  setSidebarVisible,
  inspectorVisible,
  setInspectorVisible,
  previewVisible,
  setPreviewVisible,
  monitorVisible,
  setMonitorVisible,
  minimapEnabled,
  setMinimapEnabled,
  editorVisible,
  setEditorVisible
} = useUIPanels();
```

#### `useAgent()`
```typescript
const {
  agentConfig,      // { apiKey, voice, persona, language }
  setAgentConfig,   // Setter
  selectedModel,    // ModelId
  setSelectedModel  // Setter
} = useAgent();
```

#### `useTheme()`
```typescript
const {
  isDarkMode,      // boolean
  setIsDarkMode,   // Setter
  toggleTheme      // () => void
} = useTheme();
```

#### `useVoice()`
```typescript
const {
  isListening,     // boolean
  setIsListening,  // Setter
  toggleListening  // () => void
} = useVoice();
```

### ModalContext Hooks

#### `useModal()`
Returns all modal management functions. Use sparingly - prefer specific hooks.

#### `useSettingsModal()`
```typescript
const { isOpen, open, close, toggle } = useSettingsModal();
```

#### `useAgentModal()`
```typescript
const { 
  isOpen,          // boolean
  open,            // (tab?: AgentModalTab) => void
  close,           // () => void
  tab,             // 'connection' | 'voice' | 'identity'
  setTab           // (tab: AgentModalTab) => void
} = useAgentModal();
```

#### `useMcpToolModal()`
```typescript
const {
  isOpen,          // boolean
  open,            // (toolName: string) => void
  close,           // () => void
  toolName         // string
} = useMcpToolModal();
```

#### `useAISettingsHubModal()`
```typescript
const { isOpen, open, close, toggle } = useAISettingsHubModal();
```

#### `useGeminiTesterModal()`
```typescript
const { isOpen, open, close, toggle } = useGeminiTesterModal();
```

#### `useCodeIntelligenceModal()`
```typescript
const { isOpen, open, close, toggle } = useCodeIntelligenceModal();
```

#### `useRibbonModals()`
```typescript
const {
  projectStructure: { isOpen, open, close },
  toolHistory: { isOpen, open, close },
  toolChains: { isOpen, open, close },
  toolManager: { isOpen, open, close },
  codeMetrics: { isOpen, open, close },
  toolUsageAnalytics: { isOpen, open, close }
} = useRibbonModals();
```

## 🔧 Migration Guide

### Step 1: Wrap App with Providers

```typescript
// index.tsx or App.tsx
import { AppStateProvider, ModalProvider } from './contexts';

function App() {
  return (
    <AppStateProvider>
      <ModalProvider>
        <YourApp />
      </ModalProvider>
    </AppStateProvider>
  );
}
```

### Step 2: Remove Props from Components

**Before:**
```typescript
function Sidebar({ files, setFiles, activeFile, setActiveFile }: SidebarProps) {
  // ...
}
```

**After:**
```typescript
import { useEditorFiles } from '../contexts';

function Sidebar() {
  const { files, setFiles, activeFile, setActiveFile } = useEditorFiles();
  // ...
}
```

### Step 3: Update Parent Components

**Before:**
```typescript
<Sidebar 
  files={files}
  setFiles={setFiles}
  activeFile={activeFile}
  setActiveFile={setActiveFile}
/>
```

**After:**
```typescript
<Sidebar />
```

### Step 4: Update Modal Usage

**Before:**
```typescript
const [isOpen, setIsOpen] = useState(false);
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
<Button onClick={() => setIsOpen(true)}>Open</Button>
```

**After:**
```typescript
// In Modal component
const { isOpen, close } = useSettingsModal();

// In Button component
const { open } = useSettingsModal();
<Button onClick={open}>Open</Button>
```

## ✅ Benefits

### 1. No Prop Drilling
- Components access state directly
- No need to pass props through multiple levels
- Cleaner component interfaces

### 2. Better Performance
- Components only re-render when their specific state changes
- Memoized context values prevent unnecessary updates
- Selector hooks allow fine-grained subscriptions

### 3. Improved Reusability
- Components are self-contained
- Easy to move components around
- No dependency on parent component structure

### 4. Type Safety
- Full TypeScript support
- Autocomplete for all hooks
- Compile-time error checking

### 5. Easier Testing
- Mock context providers for tests
- Test components in isolation
- No need to mock complex prop chains

## 🎯 Best Practices

### 1. Use Specific Hooks
```typescript
// ❌ Bad - subscribes to all state
const state = useAppState();

// ✅ Good - subscribes only to what you need
const { files, activeFile } = useEditorFiles();
```

### 2. Memoize Callbacks
```typescript
const { setFiles } = useEditorFiles();

// ✅ Good - memoized callback
const handleFileChange = useCallback((newFile: FileData) => {
  setFiles(prev => ({ ...prev, [newFile.name]: newFile }));
}, [setFiles]);
```

### 3. Keep Context Values Stable
```typescript
// Context provider already memoizes values
// No need to memoize in consuming components
const { files } = useEditorFiles();
```

### 4. Use Modal Hooks Consistently
```typescript
// ✅ Good - use modal hooks
const settings = useSettingsModal();
<button onClick={settings.open}>Settings</button>

// ❌ Bad - manage modal state locally
const [isOpen, setIsOpen] = useState(false);
```

## 🚨 Common Pitfalls

### 1. Using Context Outside Provider
```typescript
// ❌ Error: useAppState must be used within AppStateProvider
function Component() {
  const state = useAppState(); // Will throw error if not wrapped
}
```

**Solution:** Ensure component is wrapped in provider.

### 2. Subscribing to Too Much State
```typescript
// ❌ Bad - re-renders on any state change
const state = useAppState();

// ✅ Good - only re-renders when files change
const { files } = useEditorFiles();
```

### 3. Not Memoizing Derived Values
```typescript
// ❌ Bad - recalculates on every render
const { files } = useEditorFiles();
const fileCount = Object.keys(files).length;

// ✅ Good - memoized
const fileCount = useMemo(() => Object.keys(files).length, [files]);
```

## 📊 Performance Comparison

### Before (Prop Drilling)
- Props passed through 5+ levels
- 10+ props per component
- Re-renders cascade through tree
- Difficult to optimize

### After (Context)
- Direct state access
- 0 props for state
- Only affected components re-render
- Easy to optimize with selectors

## 🎉 Summary

The new Context-based state management:
- ✅ Eliminates prop drilling
- ✅ Improves performance
- ✅ Enhances code organization
- ✅ Simplifies component interfaces
- ✅ Makes testing easier
- ✅ Provides better type safety

Start using these contexts today to make your G-Studio development experience better!
