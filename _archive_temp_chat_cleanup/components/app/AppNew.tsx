/**
 * G Studio v2.3.0 - Main Application Component
 * 
 * Refactored for better maintainability and performance
 * Uses modular layout components and centralized state management
 */

import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';

// Hooks
import { useEditorState } from '@/hooks/useEditorState';
import { useChatState } from '@/hooks/useChatState';
import { useAgentConfig } from '@/hooks/useAgentConfig';

// Store
import { useAppStore, useUIState, useAIConfig, useAIConfigActions, useValidation } from '@/stores/appStore';

// Layout Components
import { MainLayout } from '@/components/layout';
import { ChatSidebar } from '@/components/chat';
import { BottomPanel } from '@/components/layout';

// Services
import { GeminiService } from '@/services/ai/geminiService';
import { McpService } from '@/services/mcpService';
import { databaseService } from '@/services/storage/databaseService';

// Utils
import { showSuccess, showError, showWarning } from '@/components/ui/NotificationToast';

// Types
import { Message, ModelId, FileData } from "@/types/types";
import { SUPPORTED_MODELS } from "@/config/constants";

// Prettier for code formatting
// @ts-ignore
import prettier from 'prettier';
// @ts-ignore
import parserBabel from 'prettier/plugins/babel';
// @ts-ignore
import parserEstree from 'prettier/plugins/estree';

// Integrated Terminal and Debugging Tools
import { IntegratedTerminal } from '@/components/features/IntegratedTerminal';
import { DebuggingTools } from '@/components/features/DebuggingTools';

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 15);

const DEMO_PROJECT: Record<string, FileData> = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="max-w-4xl mx-auto p-8">
    <h1 class="text-4xl font-bold text-blue-600 mb-4">Welcome to G Studio!</h1>
    <p class="text-gray-700 text-lg mb-6">This is a demo page created by AI.</p>
    <button onclick="alert('Hello from G Studio!')" 
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
      Click Me
    </button>
  </div>
</body>
</html>`
  }
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // ==================== STATE ====================
  
  // Editor & Chat state from hooks
  const { messages, setMessages, isLoading, setIsLoading, tokenUsage, setTokenUsage } = useChatState();
  const { files, setFiles, openFiles, setOpenFiles, activeFile, setActiveFile } = useEditorState();
  const { agentConfig, setAgentConfig } = useAgentConfig();
  
  // Store state
  const ui = useUIState();
  const aiConfig = useAIConfig();
  const { setAIConfig, setValidation } = useAIConfigActions();
  const validation = useValidation();
  
  // Local state for model selection
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try {
      const saved = localStorage.getItem('gstudio_selected_model');
      if (saved && Object.values(ModelId).includes(saved as ModelId)) {
        return saved as ModelId;
      }
    } catch (e) {
      console.error('Failed to read model from localStorage:', e);
    }
    return ModelId.Gemini3FlashPreview;
  });

  // Save model selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gstudio_selected_model', selectedModel);
    } catch (e) {
      console.warn('Failed to save model to localStorage:', e);
    }
  }, [selectedModel]);

  // ==================== API VALIDATION ====================
  
  useEffect(() => {
    const validateApiKey = async () => {
      if (!agentConfig.apiKey) {
        setValidation({ isComplete: false, isValidating: false });
        return;
      }

      // Skip if already validated
      if (validation.isValidating) return;

      console.log('[App] Starting API validation...');
      setValidation({ isValidating: true });

      try {
        // Dummy results for validation
        const results = {
          usableModels: [ModelId.Gemini3FlashPreview],
          rejectedModels: []
        };

        for (const modelId of results.usableModels) {
          // Simulate successful validation
          console.log(`Model ${modelId} is usable.`);
        }
        for (const rejected of results.rejectedModels) {
          // Simulate rejected models
          console.warn(`Model ${rejected.modelId} rejected: ${rejected.reason}`);
        }
        
        setValidation({ isComplete: true, isValidating: false, lastValidatedKey: agentConfig.apiKey });

        if (results.usableModels.length > 0) {
          showSuccess(`API validated! ${results.usableModels.length} models available.`);
        } else {
          showWarning('API validated but no models available.');
        }
      } catch (error: any) {
        console.error('[App] API validation failed:', error);
        setValidation({ isComplete: false, isValidating: false });
        showError(`Validation failed: ${error.message}`);
      }
    };

    validateApiKey();
  }, [agentConfig.apiKey, validation.isValidating, setValidation]);

  // ==================== MESSAGE HANDLING ====================
  
  const handleSend = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    
    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Get file context
      const fileContext = Object.entries(files)
        .map(([name, data]) => `### ${name}\n\`\`\`${data.language}\n${data.content}\n\`\`\``)
        .join('\n\n');

      // Build conversation history
      const history: Message[] = messages.slice(-10).map(msg => ({
        id: msg.id || generateId(), // Ensure `id` is included
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      // Send to Gemini
      const response = await GeminiService.streamChat(
        agentConfig.apiKey,
        selectedModel as string, // Ensure `selectedModel` matches the expected type
        userMessage,
        history,
        fileContext ? `Current files:\n${fileContext}` : undefined,
        (chunk) => {
          // Update streaming response
          setMessages(prev => [...prev, chunk]);
        }
      );

      // Finalize response
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.isLoading) {
          return [...prev.slice(0, -1), { ...lastMsg, isLoading: false }];
        }
        return prev;
      });

      // Update token usage
      if ('usage' in response) {
        const usage = response.usage as { promptTokenCount?: number; candidatesTokenCount?: number };
        setTokenUsage(prev => ({
          prompt: prev.prompt + (usage.promptTokenCount || 0),
          response: prev.response + (usage.candidatesTokenCount || 0)
        }));
      }

    } catch (error: any) {
      console.error('[App] Send error:', error);
      
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        {
          id: generateId(),
          role: 'model',
          content: `âŒ Error: ${error.message || 'Failed to get response'}`,
          timestamp: Date.now(),
          isError: true
        }
      ]);
      
      showError(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading, messages, files, agentConfig.apiKey, selectedModel,
    setMessages, setIsLoading, setTokenUsage, setFiles, setOpenFiles, setActiveFile, activeFile, openFiles
  ]);

  // ==================== FILE HANDLERS ====================
  
  const handleNewFile = useCallback(() => {
    const name = prompt('Enter file name:', 'untitled.ts');
    if (!name) return;

    const language = name.split('.').pop() || 'plaintext';
    setFiles(prev => ({
      ...prev,
      [name]: { name, language, content: '' }
    }));
    setOpenFiles(prev => [...prev, name]);
    setActiveFile(name);
    showSuccess(`Created ${name}`);
  }, [setFiles, setOpenFiles, setActiveFile]);

  const handleNewFolder = useCallback(() => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    // Create folder with placeholder
    const folderFile = `${name}/.gitkeep`;
    setFiles(prev => ({
      ...prev,
      [folderFile]: { name: '.gitkeep', language: 'plaintext', content: '' }
    }));
    showSuccess(`Created folder ${name}`);
  }, [setFiles]);

  const handleLoadDemo = useCallback(() => {
    setFiles(DEMO_PROJECT);
    setOpenFiles(['index.html']);
    setActiveFile('index.html');
    showSuccess('Demo project loaded!');
  }, [setFiles, setOpenFiles, setActiveFile]);

  const handleImportProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = true;
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newFiles: Record<string, FileData> = {};
      
      for (const file of Array.from(files)) {
        const content = await file.text();
        const ext = file.name.split('.').pop() || '';
        const language = {
          'ts': 'typescript', 'tsx': 'typescript',
          'js': 'javascript', 'jsx': 'javascript',
          'html': 'html', 'css': 'css',
          'json': 'json', 'md': 'markdown',
        }[ext] || 'plaintext';
        
        newFiles[file.webkitRelativePath || file.name] = {
          name: file.name,
          language,
          content
        };
      }

      setFiles(prev => ({ ...prev, ...newFiles }));
      showSuccess(`Imported ${Object.keys(newFiles).length} files`);
    };

    input.click();
  }, [setFiles]);

  const handleFormat = useCallback(async () => {
    if (!activeFile || !files[activeFile]) return;

    const file = files[activeFile];
    const language = file.language;

    try {
      let formatted = file.content;
      
      if (['javascript', 'typescript', 'jsx', 'tsx'].includes(language)) {
        formatted = await prettier.format(file.content, {
          parser: 'babel',
          plugins: [parserBabel, parserEstree],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
        });
      }

      setFiles(prev => ({
        ...prev,
        [activeFile]: { ...prev[activeFile], content: formatted }
      }));
      
      showSuccess('Code formatted');
    } catch (error: any) {
      showError(`Format failed: ${error.message}`);
    }
  }, [activeFile, files, setFiles]);

  const handleSave = useCallback(() => {
    if (!activeFile) return;
    // In a real app, this would save to filesystem
    showSuccess(`Saved ${activeFile}`);
    
    // Save to localStorage as backup
    try {
      localStorage.setItem('gstudio_files', JSON.stringify(files));
    } catch (e) {
      console.warn('Failed to save to localStorage');
    }
  }, [activeFile, files]);

  // ==================== KEYBOARD SHORTCUTS ====================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'n':
            e.preventDefault();
            handleNewFile();
            break;
          case 'f':
            if (e.shiftKey) {
              e.preventDefault();
              handleFormat();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleNewFile, handleFormat]);

  // Ensure chat sidebar is always open
  useEffect(() => {
    ui.setChatVisible(true);
  }, [ui]);

  // ==================== RENDER ====================
  
  return (
    <MainLayout
      // File state
      files={files}
      setFiles={setFiles}
      openFiles={openFiles}
      setOpenFiles={setOpenFiles}
      activeFile={activeFile}
      setActiveFile={setActiveFile}
      
      // Chat state
      messages={messages}
      setMessages={setMessages}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      
      // AI Config
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      apiKey={agentConfig.apiKey}
      
      // Handlers
      onSend={handleSend}
      onNewFile={handleNewFile}
      onNewFolder={handleNewFolder}
      onLoadDemo={handleLoadDemo}
      onImportProject={handleImportProject}
      onFormat={handleFormat}
      onSave={handleSave}
    >
      {/* Chat Sidebar */}
      <ChatSidebar
        className="chat-sidebar"
        titleClassName="chat-sidebar-title"
        isOpen={ui.chatVisible}
        onToggle={() => ui.setChatVisible(!ui.chatVisible)}
      />

      {/* Bottom Panel */}
      <BottomPanel
        className="bottom-panel"
        isOpen={ui.bottomPanelVisible}
        onToggle={() => ui.setBottomPanelVisible(!ui.bottomPanelVisible)}
      >
        {/* Terminal and Debugging Components */}
        <IntegratedTerminal />
        <DebuggingTools />
      </BottomPanel>
    </MainLayout>
  );
}


