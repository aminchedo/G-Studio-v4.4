/**
 * App.tsx - Refactored with Modular Architecture
 * Based on codebase analysis report recommendations
 * 
 * Key Changes:
 * - Uses ModalManager for all modal state (instead of 20+ individual states)
 * - Integrates FileTree, ChatLayout components
 * - Proper FileData types with path & lastModified
 * - Custom hooks for better state management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// === LAYOUT COMPONENTS (Valuable Unused - Now Integrated!) ===
import { ModalManager } from '@/components/layout/ModalManager';
import { FileTree } from '@/components/layout/FileTree';
import { ChatLayout } from '@/components/layout/ChatLayout';

// === CUSTOM HOOKS (Better than direct useContext) ===
import { useModals, useModalActions } from '@/hooks/useModals';
import { useTools, useToolActions } from '@/hooks/useTools';
import { useCodeMetrics } from '@/hooks/useCodeMetrics';

// === TYPES ===
interface FileData {
  name: string;
  language: string;
  content: string;
  path: string;           // Required!
  lastModified: number;   // Required!
}

type ModelId = string;

interface AgentConfig {
  model: ModelId;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

interface AIConfig {
  provider?: string;
  apiKey?: string;
  [key: string]: any;
}

// === HELPER FUNCTIONS ===
const createFileData = (
  name: string,
  content: string = '',
  language: string = 'typescript'
): FileData => {
  const path = name.startsWith('/') ? name : `/${name}`;
  return {
    name: path.split('/').pop() || name,
    language,
    content,
    path,
    lastModified: Date.now()
  };
};

// === MAIN APP COMPONENT ===
export default function App() {
  // ============================================
  // THEME
  // ============================================
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // ============================================
  // FILE MANAGEMENT
  // ============================================
  const [files, setFiles] = useState<Record<string, FileData>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  
  // ============================================
  // UI VISIBILITY
  // ============================================
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [editorVisible, setEditorVisible] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [chatVisible, setChatVisible] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [monitorVisible, setMonitorVisible] = useState(false);
  
  // ============================================
  // MODALS - Using ModalManager Hook (Better!)
  // ============================================
  const modals = useModals();
  const modalActions = useModalActions();
  
  // Backward compatibility - if you still need individual states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAISettingsHubOpen, setIsAISettingsHubOpen] = useState(false);
  const [isCodeIntelligenceOpen, setIsCodeIntelligenceOpen] = useState(false);
  const [isGeminiTesterOpen, setIsGeminiTesterOpen] = useState(false);
  const [isSpeechTestOpen, setIsSpeechTestOpen] = useState(false);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  
  // ============================================
  // RIBBON MODALS
  // ============================================
  const [ribbonModals, setRibbonModals] = useState({
    fileTree: false,
    toolHistory: false,
    toolChains: false,
    customTools: false,
    codeMetrics: false,
    toolUsage: false,
  });
  
  // ============================================
  // MCP & COLLABORATION
  // ============================================
  const [mcpToolModal, setMcpToolModal] = useState<{ 
    isOpen: boolean; 
    toolData?: any 
  }>({ isOpen: false });
  
  const [showAgentCollaboration, setShowAgentCollaboration] = useState(false);
  const [showContextViewer, setShowContextViewer] = useState(false);
  
  // ============================================
  // EDITOR CONFIGURATION
  // ============================================
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [splitRatio, setSplitRatio] = useState(50);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  
  // ============================================
  // PREVIEW
  // ============================================
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  
  // ============================================
  // CHAT & AI
  // ============================================
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>({});
  const [activeAgentTab, setActiveAgentTab] = useState<string>('config');
  
  // ============================================
  // METRICS & USAGE
  // ============================================
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const tools = useTools();
  const toolActions = useToolActions();
  const codeMetrics = useCodeMetrics();
  
  const [toolExecutionHistory, setToolExecutionHistory] = useState<any[]>([]);
  const [toolChains, setToolChains] = useState<any[]>([]);
  const [customTools, setCustomTools] = useState<any[]>([]);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [codeIntelligenceAPI, setCodeIntelligenceAPI] = useState<string>('');
  const [toolUsage, setToolUsage] = useState<any[]>([]);
  
  // ============================================
  // FILE HANDLERS
  // ============================================
  const handleNewFile = useCallback(() => {
    const fileName = `untitled-${Object.keys(files).length + 1}.tsx`;
    const newFile = createFileData(fileName);
    
    setFiles(prev => ({ ...prev, [newFile.path]: newFile }));
    setActiveFile(newFile.path);
    setOpenFiles(prev => [...prev, newFile.path]);
  }, [files]);
  
  const handleNewFolder = useCallback(() => {
    console.log('Create new folder');
    // Implementation
  }, []);
  
  const handleLoadDemo = useCallback(() => {
    const demoFile = createFileData(
      'demo.tsx',
      '// Demo code\nexport default function Demo() {\n  return <div>Hello!</div>;\n}'
    );
    setFiles(prev => ({ ...prev, [demoFile.path]: demoFile }));
    setActiveFile(demoFile.path);
  }, []);
  
  const handleImportProject = useCallback(() => {
    console.log('Import project');
    // Implementation
  }, []);
  
  const handleSave = useCallback(() => {
    if (activeFile && files[activeFile]) {
      console.log('Saving:', activeFile);
      // Update lastModified
      setFiles(prev => ({
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          lastModified: Date.now()
        }
      }));
    }
  }, [activeFile, files]);
  
  const handleFormat = useCallback(() => {
    if (activeFile && files[activeFile]) {
      console.log('Formatting:', activeFile);
      // Implementation
    }
  }, [activeFile, files]);
  
  const handleDeleteFile = useCallback((path: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[path];
      return newFiles;
    });
    
    setOpenFiles(prev => prev.filter(p => p !== path));
    
    if (activeFile === path) {
      const remainingFiles = openFiles.filter(p => p !== path);
      setActiveFile(remainingFiles[0] || null);
    }
  }, [activeFile, openFiles]);
  
  const handleRenameFile = useCallback((oldPath: string, newPath: string) => {
    setFiles(prev => {
      const file = prev[oldPath];
      if (!file) return prev;
      
      const newFiles = { ...prev };
      delete newFiles[oldPath];
      newFiles[newPath] = {
        ...file,
        path: newPath,
        name: newPath.split('/').pop() || newPath,
        lastModified: Date.now(),
      };
      return newFiles;
    });
    
    setOpenFiles(prev => prev.map(p => p === oldPath ? newPath : p));
    
    if (activeFile === oldPath) {
      setActiveFile(newPath);
    }
  }, [activeFile]);
  
  // ============================================
  // CHAT HANDLERS
  // ============================================
  const handleSend = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Your API call implementation here
      // const response = await callAPI(message, agentConfig);
      
      // Placeholder
      setTimeout(() => {
        const aiMessage = { 
          role: 'assistant', 
          content: 'Response from AI (implement your API call)' 
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        
        // Update token usage
        setTokenUsage(prev => ({
          input: prev.input + message.length,
          output: prev.output + 100
        }));
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  }, [isLoading, agentConfig]);
  
  // ============================================
  // AI CONFIG HANDLERS
  // ============================================
  const handleSaveAIConfig = useCallback((config: AIConfig) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
    console.log('AI Config saved:', config);
  }, []);
  
  // ============================================
  // MODAL HANDLERS
  // ============================================
  const handleRibbonModalToggle = useCallback((modalKey: string) => {
    setRibbonModals(prev => ({
      ...prev,
      [modalKey]: !prev[modalKey as keyof typeof prev]
    }));
  }, []);
  
  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
    
    // Load saved files
    const savedFiles = localStorage.getItem('files');
    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch (e) {
        console.error('Error loading files:', e);
      }
    }
  }, []);
  
  useEffect(() => {
    // Save theme
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    // Save files (debounced in real app)
    localStorage.setItem('files', JSON.stringify(files));
  }, [files]);
  
  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={`app theme-${theme}`}>
      {/* Modal Manager - Handles all modals centrally */}
      <ModalManager />
      
      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar with File Tree */}
        {sidebarVisible && (
          <FileTree
            files={files}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
            onFileDelete={handleDeleteFile}
            onFileRename={handleRenameFile}
          />
        )}
        
        {/* Editor Area */}
        {editorVisible && activeFile && files[activeFile] && (
          <div className="editor-area">
            {/* Your editor component here */}
            <pre>{files[activeFile].content}</pre>
          </div>
        )}
        
        {/* Chat Layout */}
        {chatVisible && (
          <ChatLayout
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            agentConfig={agentConfig}
            collapsed={chatCollapsed}
            onCollapse={setChatCollapsed}
          />
        )}
      </div>
      
      {/* Inspector Panel */}
      {inspectorVisible && activeFile && (
        <div className="inspector-panel">
          <h3>Inspector</h3>
          <p>File: {files[activeFile]?.name}</p>
          <p>Language: {files[activeFile]?.language}</p>
          <p>Last Modified: {new Date(files[activeFile]?.lastModified).toLocaleString()}</p>
        </div>
      )}
      
      {/* Monitor Panel */}
      {monitorVisible && (
        <div className="monitor-panel">
          <h3>Token Usage</h3>
          <p>Input: {tokenUsage.input}</p>
          <p>Output: {tokenUsage.output}</p>
          <p>Total: {tokenUsage.input + tokenUsage.output}</p>
        </div>
      )}
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal">
          <h2>Settings</h2>
          <label>
            Theme:
            <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button onClick={() => setIsSettingsOpen(false)}>Close</button>
        </div>
      )}
      
      {/* AI Settings Hub */}
      {isAISettingsHubOpen && (
        <div className="modal">
          <h2>AI Settings</h2>
          <button onClick={() => setIsAISettingsHubOpen(false)}>Close</button>
        </div>
      )}
      
      {/* Agent Modal */}
      {isAgentModalOpen && (
        <div className="modal">
          <h2>Agent Configuration</h2>
          <button onClick={() => setIsAgentModalOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
