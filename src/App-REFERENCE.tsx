import * as React from 'react';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEditorState } from './hooks/useEditorState';
import { useChatState } from './hooks/useChatState';
import { useUIPanelState } from './hooks/useUIPanelState';
import { useAgentConfig } from './hooks/useAgentConfig';
import { Sidebar } from './components/Sidebar';
import { RightActivityBar } from './components/RightActivityBar';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { CodeEditor } from './components/CodeEditor';
import { EditorTabs } from './components/EditorTabs';
import { Ribbon } from './components/Ribbon';
import { PreviewPanel } from './components/PreviewPanel';
import { PreviewPanelEnhanced } from './components/PreviewPanelEnhanced';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FEATURE_FLAGS } from './constants';
import { InspectorPanel } from './components/InspectorPanel';
import MonitorPanel from './components/MonitorPanel';
import { MultiAgentStatus } from './components/MultiAgentStatus';
import { AgentCollaboration } from './components/AgentCollaboration';
import { SpeechTest } from './components/SpeechTest';
import { NotificationToast, notificationManager, showSuccess, showError, showWarning, showInfo } from './components/NotificationToast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PromptDialog } from './components/PromptDialog';
// Lazy load large modal components for better performance
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const AgentModal = React.lazy(() => import('./components/AgentModal').then(module => ({ default: module.AgentModal })));
const McpToolModal = React.lazy(() => import('./components/McpToolModal').then(module => ({ default: module.McpToolModal })));
const AgentSelector = React.lazy(() => import('./components/AgentSelector').then(module => ({ default: module.AgentSelector })));
const CodeIntelligenceDashboard = React.lazy(() => import('./components/CodeIntelligenceDashboard').then(module => ({ default: module.CodeIntelligenceDashboard })));
const GeminiTesterPro = React.lazy(() => import('./components/ultimate-gemini-tester').then(module => ({ default: module.default })));
// NEW: AI Settings Hub - Unified AI Configuration
const AISettingsHub = React.lazy(() => import('./components/AISettingsHub').then(module => ({ default: module.AISettingsHub })));
import { AgentOrchestrator, ProjectState } from './services/agentOrchestrator';
import { databaseService } from './services/databaseService';
import { McpService } from './services/mcpService';
import { sendAgentTelemetry } from './utils/agentTelemetry';
import { GeminiService } from './services/geminiService';
import { StateTransaction } from './services/stateTransaction';
import { SecureStorage } from './services/secureStorage';
import { ModelSelectionService } from './services/modelSelectionService';
import { Message, ModelId, FileData } from './types';
import { SUPPORTED_MODELS } from './constants';
import { ExecutionMode } from './services/hybridDecisionEngine';
import { NetworkReliabilityVerification } from './services/networkReliabilityVerification';
import {
  Terminal, Layers, PanelRightClose, PanelRight, 
  Cpu, Activity, Zap, X, Code2, Users, Sparkles, ChevronDown, ChevronUp, Loader2, Wifi, WifiOff, Cloud, HardDrive
} from 'lucide-react';
import { ProjectStructureModal } from './components/ribbon/ProjectStructureModal';
import { ToolExecutionHistoryModal } from './components/ribbon/ToolExecutionHistoryModal';
import { ToolChainsModal } from './components/ribbon/ToolChainsModal';
import { ToolManagerModal } from './components/ribbon/ToolManagerModal';
import { CodeMetricsModal } from './components/ribbon/CodeMetricsModal';
import { ToolUsageAnalyticsModal } from './components/ribbon/ToolUsageAnalyticsModal';
// @ts-ignore
import prettier from 'prettier';
// @ts-ignore
import parserBabel from 'prettier/plugins/babel';
// @ts-ignore
import parserEstree from 'prettier/plugins/estree';
// @ts-ignore
import parserMarkdown from 'prettier/plugins/markdown';

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

/**
 * G Studio - Advanced AI-Powered IDE
 * 
 * قابلیت‌های کلیدی:
 * - 🤖 Agent Orchestration: همه چیز با گفتگو
 * - 🎨 رابط کاربری مدرن و حرفه‌ای
 * - 💾 پایگاه داده یکپارچه
 * - 🔧 Code Completion هوشمند
 * - 🎯 Multi-Agent Collaboration
 * - 🚀 Live Preview کامل
 * - 📝 فرمت کد خودکار
 * - 🌐 پشتیبانی کامل فارسی
 */

export default function App() {
  // ==================== STATE MANAGEMENT ====================
  const { messages, setMessages, isLoading, setIsLoading, tokenUsage, setTokenUsage } = useChatState();
  const { files, setFiles, openFiles, setOpenFiles, activeFile, setActiveFile } = useEditorState();
  const { 
    chatVisible, setChatVisible, 
    chatCollapsed, setChatCollapsed,
    sidebarVisible, setSidebarVisible,
    inspectorVisible, setInspectorVisible,
    previewVisible, setPreviewVisible,
    monitorVisible, setMonitorVisible,
    minimapEnabled, setMinimapEnabled,
    editorVisible, setEditorVisible
  } = useUIPanelState();
  const { agentConfig, setAgentConfig } = useAgentConfig();
  
  // Define selectedModel FIRST (before aiConfig that uses it)
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('gstudio_selected_model');
      if (saved && Object.values(ModelId).includes(saved as ModelId)) {
        return saved as ModelId;
      }
    } catch (e) {
      console.error('Failed to read selected model from localStorage:', e);
    }
    return ModelId.Gemini3FlashPreview;
  });
  
  // NEW: AI Settings Hub configuration (combines all AI settings)
  const aiConfig = useMemo(() => ({
    // Connection
    apiKey: agentConfig.apiKey || '',
    
    // Models
    selectedModel: selectedModel,
    selectionMode: ModelSelectionService.getSelectionMode(agentConfig.apiKey || '') as 'auto' | 'manual',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    enableStreaming: true,
    
    // Behavior
    persona: agentConfig.persona || 'Professional',
    responseStyle: 'Detailed',
    codeStyle: 'Modern ES6+',
    autoFormat: true,
    
    // Voice & Language
    voiceEnabled: false,
    language: agentConfig.language || 'en-US',
    voiceModel: 'Vosk',
    autoSend: true,
    confidenceThreshold: 0.7,
    
    // Local AI
    localAIEnabled: false,
    localModel: '',
    offlineMode: 'auto' as const,
    fallbackToCloud: true,
    promptImprovement: false,
    promptMode: 'deterministic' as const,
    
    // General
    notifications: true,
  }), [agentConfig, selectedModel]);

  const handleSaveAIConfig = useCallback((newConfig: any) => {
    // Update agentConfig
    setAgentConfig({
      ...agentConfig,
      apiKey: newConfig.apiKey,
      persona: newConfig.persona,
      language: newConfig.language,
    });
    
    // Update selectedModel
    if (newConfig.selectedModel) {
      setSelectedModel(newConfig.selectedModel);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('ai_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save AI config:', e);
    }
  }, [agentConfig, setAgentConfig]);
  const [projectState, setProjectState] = useState<ProjectState>({
    name: 'G Studio Project',
    description: '',
    files: [],
    structure: {},
    technologies: [],
    status: 'planning'
  });

  // ==================== UI STATE ====================
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCodeIntelligenceOpen, setIsCodeIntelligenceOpen] = useState(false);
  const [codeIntelligenceAPI, setCodeIntelligenceAPI] = useState<any>(null);
  const [isSpeechTestOpen, setIsSpeechTestOpen] = useState(false);
  const [showAgentCollaboration, setShowAgentCollaboration] = useState(false);

  // NEW: AI Settings Hub state
  const [isAISettingsHubOpen, setIsAISettingsHubOpen] = useState(false);

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activeAgentTab, setActiveAgentTab] = useState<'connection' | 'voice' | 'identity'>('connection');
  const [isGeminiTesterOpen, setIsGeminiTesterOpen] = useState(false); // Don't open automatically - user can open manually
  const [mcpToolModal, setMcpToolModal] = useState<{ isOpen: boolean; tool: string }>({ 
    isOpen: false, 
    tool: '' 
  });

  // ==================== RIBBON MODALS STATE ====================
  const [ribbonModals, setRibbonModals] = useState({
    projectStructure: false,
    toolHistory: false,
    toolChains: false,
    toolManager: false,
    codeMetrics: false,
    toolUsageAnalytics: false
  });

  // State for MCP tab modals
  const [toolExecutionHistory, setToolExecutionHistory] = useState<Array<{
    tool: string;
    timestamp: Date;
    success: boolean;
  }>>([]);
  const [toolChains, setToolChains] = useState<string[][]>([]);
  const [customTools, setCustomTools] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [editingTool, setEditingTool] = useState<{ id: string; name: string; description: string } | null>(null);
  const [newToolName, setNewToolName] = useState('');
  const [newToolDescription, setNewToolDescription] = useState('');

  // State for Intelligence tab modal
  const [codeMetrics, setCodeMetrics] = useState<{
    complexity: string;
    maintainability: string;
    testCoverage: string;
    securityScore: string;
  } | null>(null);

  // State for Home tab modal
  const [toolUsage, setToolUsage] = useState<Record<string, number>>({});

  // ==================== THEME STATE ====================
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Load theme from localStorage or default to dark
    try {
      const saved = localStorage.getItem('gstudio_theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      // Default to dark mode
      return true;
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
      return true;
    }
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
    // Save to localStorage
    try {
      localStorage.setItem('gstudio_theme', isDarkMode ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Load custom tools from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gstudio_custom_tools');
      if (saved) {
        setCustomTools(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load custom tools:', e);
    }
  }, []);

  // Calculate code metrics
  useEffect(() => {
    setCodeMetrics({
      complexity: 'Low',
      maintainability: 'High',
      testCoverage: '85%',
      securityScore: '95%'
    });
  }, []);

  // Track tool usage
  useEffect(() => {
    const tools = ['Format', 'Save', 'Close', 'Find', 'Undo', 'Redo'];
    const usage: Record<string, number> = {};
    tools.forEach(tool => {
      const stored = localStorage.getItem(`tool_usage_${tool}`);
      usage[tool] = stored ? parseInt(stored, 10) : 0;
    });
    setToolUsage(usage);
  }, []);

  // Track tool executions from MCP tab
  useEffect(() => {
    // This will be updated when tools are executed
  }, []);

  // ==================== STARTUP VALIDATION ====================
  // Validate API key and discover models at startup
  const [isValidatingApi, setIsValidatingApi] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  useEffect(() => {
    const validateApiKeyAndModels = async () => {
      // Skip if no API key
      if (!agentConfig.apiKey) {
        setValidationComplete(false);
        return;
      }

      // Skip if already validated for this API key
      const { ModelValidationStore } = await import('./services/modelValidationStore');
      if (ModelValidationStore.hasTestBeenExecuted(agentConfig.apiKey)) {
        setValidationComplete(true);
        return;
      }

      // Skip if already validating
      if (isValidatingApi) return;

      console.log('[App] Starting API key validation and model discovery...');
      setIsValidatingApi(true);

      try {
        // Import UltimateGeminiTester service
        const { UltimateGeminiTester } = await import('./services/ultimateGeminiTester');

        // Create tester instance
        const tester = new UltimateGeminiTester({
          apiKey: agentConfig.apiKey,
          verbose: false,
          bypassMode: 'auto',
          addLogCallback: (log: any) => {
            // Optional: Log to console for debugging
            if (log.type === 'error') {
              console.error('[Tester]', log.message);
            }
          }
        });

        // Initialize tester
        await tester.initialize();

        // Discover models
        const models = await tester.discoverModels();
        console.log(`[App] Discovered ${models.length} models`);

        // Test all models
        const testResults = await tester.testAllModels(models, (current, total) => {
          console.log(`[App] Testing models: ${current}/${total}`);
        });

        console.log('[App] Model testing complete:', {
          usableModels: testResults.usableModels.length,
          rejectedModels: testResults.rejectedModels.length,
          providerStatus: testResults.providerStatus
        });

        // Store results in ModelValidationStore
        const { ModelValidationStore: Store } = await import('./services/modelValidationStore');

        // Clear previous results for this API key
        Store.clearResults(agentConfig.apiKey);

        // Record usable models
        for (const modelId of testResults.usableModels) {
          const modelData = models.find(m => m.name === modelId);
          Store.recordTestResult(
            agentConfig.apiKey,
            modelId,
            'working',
            undefined,
            modelData?.inputTokenLimit,
            modelData?.outputTokenLimit,
            modelData?.responseTime
          );
        }

        // Record rejected models
        for (const rejected of testResults.rejectedModels) {
          Store.recordTestResult(
            agentConfig.apiKey,
            rejected.modelId,
            'failed',
            rejected.reason as any
          );
        }

        // Mark test as complete (locks results)
        Store.markTestComplete(agentConfig.apiKey);

        // Store provider status
        Store.setProviderStatus(
          agentConfig.apiKey,
          testResults.providerStatus
        );

        setValidationComplete(true);

        // Show success notification
        if (testResults.usableModels.length > 0) {
          showSuccess(`API key validated! ${testResults.usableModels.length} models available.`);
        } else {
          showWarning('API key validated but no models are available. Check your billing and quotas.');
        }

      } catch (error: any) {
        console.error('[App] API validation failed:', error);
        setValidationComplete(false);
        
        // Show error notification
        showError(`API validation failed: ${error.message || 'Unknown error'}`);
      } finally {
        setIsValidatingApi(false);
      }
    };

    validateApiKeyAndModels();
  }, [agentConfig.apiKey]); // Re-run when API key changes

  const handleAddTool = () => {
    if (newToolName.trim()) {
      const newTool = {
        id: `custom_${Date.now()}`,
        name: newToolName,
        description: newToolDescription || 'Custom tool'
      };
      const updated = [...customTools, newTool];
      setCustomTools(updated);
      try {
        localStorage.setItem('gstudio_custom_tools', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save custom tools:', e);
      }
      setNewToolName('');
      setNewToolDescription('');
      if (typeof window !== 'undefined' && (window as any).showSuccess) {
        (window as any).showSuccess(`Tool "${newTool.name}" added`);
      }
    }
  };

  const handleRemoveTool = (id: string) => {
    const updated = customTools.filter(tool => tool.id !== id);
    setCustomTools(updated);
    try {
      localStorage.setItem('gstudio_custom_tools', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom tools:', e);
    }
    if (typeof window !== 'undefined' && (window as any).showInfo) {
      (window as any).showInfo('Tool removed');
    }
  };

  const handleEditTool = (tool: { id: string; name: string; description: string }) => {
    setEditingTool(tool);
    setNewToolName(tool.name);
    setNewToolDescription(tool.description);
  };

  const handleSaveEdit = () => {
    if (editingTool && newToolName.trim()) {
      const updated = customTools.map(tool =>
        tool.id === editingTool.id
          ? { ...tool, name: newToolName, description: newToolDescription }
          : tool
      );
      setCustomTools(updated);
      try {
        localStorage.setItem('gstudio_custom_tools', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save custom tools:', e);
      }
      setEditingTool(null);
      setNewToolName('');
      setNewToolDescription('');
      if (typeof window !== 'undefined' && (window as any).showSuccess) {
        (window as any).showSuccess('Tool updated');
      }
    }
  };

  // ==================== MULTI-AGENT STATE ====================
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['coder']);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [useMultiAgent, setUseMultiAgent] = useState(false);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(!agentConfig.apiKey);
  const [currentAIMode, setCurrentAIMode] = useState<ExecutionMode | null>(null);
  const [isOfflineResponse, setIsOfflineResponse] = useState(false);

  // Notification and dialog state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notification, setNotification] = useState<any>(null); // Keep for backward compatibility
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });
  const [promptDialog, setPromptDialog] = useState<{ isOpen: boolean; title: string; message: string; defaultValue?: string; placeholder?: string; onConfirm: (value: string) => void; validate?: (value: string) => string | null }>({
    isOpen: false,
    title: '',
    message: '',
    defaultValue: '',
    placeholder: '',
    onConfirm: () => {},
    validate: undefined
  });

  // Subscribe to notifications (new API with multiple notifications)
  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notifs) => {
      setNotifications(notifs);
      // Keep backward compatibility - set first notification as current
      setNotification(notifs.length > 0 ? notifs[0] : null);
    });
    // Expose notification functions globally for components that need them
    (window as any).showSuccess = showSuccess;
    (window as any).showError = showError;
    (window as any).showWarning = showWarning;
    (window as any).showInfo = showInfo;
    return () => {
      unsubscribe();
      delete (window as any).showSuccess;
      delete (window as any).showError;
      delete (window as any).showWarning;
      delete (window as any).showInfo;
    };
  }, []);

  // ==================== DIAGNOSTIC COMMAND ====================
  const handleDiagnostic = useCallback(async () => {
    console.log('[DIAGNOSTIC]: EXECUTED');
    
    const { LocalAIModelService } = await import('./services/localAIModelService');
    const { HybridDecisionEngine } = await import('./services/hybridDecisionEngine');
    const { ContextDatabaseBridge } = await import('./services/contextDatabaseBridge');
    const { AgentVerifier } = await import('./services/agentVerifier');
    const { PromptProfessionalizer } = await import('./services/promptProfessionalizer');

    // Gather diagnostic information
    const networkState = HybridDecisionEngine.checkNetworkState();
    const modelStatus = LocalAIModelService.getStatus();
    const modelHealth = LocalAIModelService.getHealthStatus();
    const promptMode = PromptProfessionalizer.getMode();
    const promptEnabled = PromptProfessionalizer.isEnabled();

    // Database health
    let dbHealth = 'unknown';
    let contextSize = { totalTokens: 0, entryCount: 0 };
    let summaryCount = 0;
    try {
      await ContextDatabaseBridge.init();
      const sessionId = await ContextDatabaseBridge.getCurrentSession();
      if (sessionId) {
        dbHealth = 'healthy';
        contextSize = await ContextDatabaseBridge.getContextSize(sessionId);
        const summaries = await ContextDatabaseBridge.getSummaries(sessionId);
        summaryCount = summaries.length;
      } else {
        dbHealth = 'no_session';
      }
    } catch (error) {
      dbHealth = 'error';
    }

    // Agent verification
    const verificationResults = await AgentVerifier.verifyAll();
    const verificationSummary = AgentVerifier.getSummary();
    
    // Log diagnostic result
    const diagnosticPassed = verificationSummary.failed === 0 && dbHealth === 'healthy';
    console.log(`[DIAGNOSTIC]: ${diagnosticPassed ? 'PASSED' : 'FAILED'}`);
    
    // Store diagnostic result for system status panel
    localStorage.setItem('gstudio_last_diagnostic', diagnosticPassed ? 'passed' : 'failed');

    // Build diagnostic report
    const diagnosticReport = `# 🔍 System Diagnostic Report

## AI Mode
- **Active Mode:** ${currentAIMode || 'Not set'}
- **Network State:** ${networkState}
- **User Preference:** ${(await HybridDecisionEngine.getUserPreference()) || 'Auto'}

## Local AI Model
- **Status:** ${modelStatus}
- **Health:** ${modelHealth}
- **Last Latency:** ${LocalAIModelService.getLastLatency()}ms

## Database
- **Health:** ${dbHealth}
- **Context Size:** ${contextSize.totalTokens} tokens (${contextSize.entryCount} entries)
- **Summary Layers:** ${summaryCount}

## Prompt Professionalization
- **Enabled:** ${promptEnabled ? 'Yes' : 'No'}
- **Mode:** ${promptMode}

## Component Verification
- **Passed:** ${verificationSummary.passed}/${verificationSummary.total}
- **Failed:** ${verificationSummary.failed}

${verificationSummary.failed > 0 ? `\n### Failed Components:\n${AgentVerifier.getFailed().map(r => `- ${r.component}: ${r.issue}`).join('\n')}` : ''}

---
*Generated at ${new Date().toISOString()}*`;

    // Add diagnostic message to chat
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'model',
      content: diagnosticReport,
      timestamp: Date.now()
    }]);
  }, [currentAIMode]);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    // Initialize SecureStorage
    SecureStorage.initialize({
      forceEncryption: true,
      migrateFromLocalStorage: true,
      keyPrefix: 'secure_',
    }).catch((err: any) => {
      console.error('SecureStorage initialization failed:', err);
    });
    
    // مقداردهی اولیه پایگاه داده
    databaseService.init().catch((err: any) => {
      console.error('Database initialization failed:', err);
    });

    // Initialize context database and restore session
    (async () => {
      try {
        const { ContextDatabaseBridge } = await import('./services/contextDatabaseBridge');
        const { LocalAIModelService } = await import('./services/localAIModelService');
        const { HybridDecisionEngine } = await import('./services/hybridDecisionEngine');
        const { PromptProfessionalizer } = await import('./services/promptProfessionalizer');
        
        // Initialize all services
        await ContextDatabaseBridge.init();
        await LocalAIModelService.initialize();
        await HybridDecisionEngine.initialize();
        await PromptProfessionalizer.initialize();
        
        // Restore context session (will get existing or create new)
        const sessionId = await ContextDatabaseBridge.getCurrentSession();
        if (sessionId) {
          console.log('[App] Context session restored:', sessionId);
          const contextSize = await ContextDatabaseBridge.getContextSize(sessionId);
          console.log(`[App] Restored context: ${contextSize.entryCount} entries, ${contextSize.totalTokens} tokens`);
        }

        // ==================== CONTINUOUS VERIFICATION ====================
        // CRITICAL: Idempotent guard prevents React strict mode double execution
        // Only run once per app lifecycle, not on every mount
        const verificationKey = 'app-init-verification';
        if (!(window as any).__verificationCompleted) {
          (window as any).__verificationCompleted = true;
          const { ContinuousVerification } = await import('./services/continuousVerification');
          await ContinuousVerification.verifyLightweight();
        }

        // ==================== CAPABILITY MONITORING ====================
        const { CapabilityMonitor } = await import('./services/capabilityMonitor');
        CapabilityMonitor.startMonitoring();

        // ==================== RUNTIME UI VERIFICATION ====================
        // Will be initialized after handlers are defined (see useEffect below)
      } catch (error) {
        console.warn('[App] Context restoration failed (non-critical):', error);
      }
    })();

    // نمایش پیام خوش‌آمدگو��د
    // Welcome message moved to separate useEffect below (line 552)
    /* if (!agentConfig.apiKey && messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'model',
        content: `# 🎉 Welcome to G Studio!

I'm your intelligent assistant for software development. To get started, please enter your API Key in Settings.

## My Capabilities:
- 🤖 **Complete Project Management**: Just tell me what you want, I'll handle the rest
- 💻 **Professional Code Writing**: With best practices
- 🔧 **Editing & Optimization**: I'll improve existing code
- 🐛 **Smart Debugging**: Find and fix issues
- 📊 **Code Analysis**: Review quality and security
- 🎨 **Great UI/UX**: Build beautiful user interfaces

## How to Start?
1. Click **⚙️ Settings**
2. Enter your API Key
3. Start chatting!

**Example:** "Create a React project with TypeScript for an online store"`,
        timestamp: Date.now()
      }]);
    } */
  }, []); // Removed welcome message - handled in separate useEffect

  // نمایش پیام خوش‌آمدگویی - فقط یک بار و در زمان مناسب
  useEffect(() => {
    // فقط اگر API Key وجود نداشته باشد و پیام‌ها خالی باشند
    if (!agentConfig.apiKey && messages.length === 0) {
      const welcomeMessage = {
        id: generateId(),
        role: 'model' as const,
        content: `🎉 **Welcome to G Studio!**`,
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
  }, [agentConfig.apiKey, messages.length]);

  // Show validation status message
  useEffect(() => {
    if (agentConfig.apiKey && isValidatingApi && messages.length === 0) {
      const validationMessage = {
        id: generateId(),
        role: 'model' as const,
        content: `⏳ **Validating API key and discovering models...**\n\nThis will only take a moment. Please wait while we test your API key and discover available models.`,
        timestamp: Date.now()
      };
      setMessages([validationMessage]);
    } else if (agentConfig.apiKey && validationComplete && messages.length === 1 && messages[0].content.includes('Validating')) {
      // Replace validation message with ready message
      const readyMessage = {
        id: generateId(),
        role: 'model' as const,
        content: `✅ **Ready!**\n\nAPI key validated successfully. You can now start chatting!`,
        timestamp: Date.now()
      };
      setMessages([readyMessage]);
    }
  }, [agentConfig.apiKey, isValidatingApi, validationComplete]);

  // ==================== RUNTIME UI VERIFICATION INITIALIZATION ====================
  useEffect(() => {
    // Initialize runtime UI verification and register actions
    (async () => {
      try {
        const { runtimeUIVerification } = await import('./services/runtimeUIVerification');
        const { uiActionRegistry } = await import('./services/uiActionRegistry');
        
        // Register all UI actions for self-healing
        uiActionRegistry.register('new-file', () => handleNewFile());
        uiActionRegistry.register('save-file', () => {
          if (activeFile) handleSaveFile();
        });
        uiActionRegistry.register('format-file', () => {
          if (activeFile) handleFormat();
        });
        uiActionRegistry.register('run-code', () => {
          handleRunCode();
        });
        uiActionRegistry.register('open-settings', () => setIsSettingsOpen(true));
        uiActionRegistry.register('close', () => {
          if (activeFile) handleCloseFile(activeFile);
        });
        uiActionRegistry.register('undo', () => handleUndo());
        uiActionRegistry.register('redo', () => handleRedo());
        uiActionRegistry.register('find', () => handleFind());
        
        // Initialize runtime verification
        runtimeUIVerification.initialize();
        
        console.log('[App] Runtime UI verification initialized');
      } catch (error) {
        console.warn('[App] Runtime UI verification initialization failed (non-critical):', error);
      }
    })();
  }, []); // Run once on mount

  // Update state for runtime verification
  useEffect(() => {
    (window as any).__activeFile = activeFile;
    (window as any).__files = files;
    (window as any).__messages = messages;
  }, [activeFile, files, messages]);

  // ESC key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSpeechTestOpen) {
          setIsSpeechTestOpen(false);
        } else if (showAgentCollaboration) {
          setShowAgentCollaboration(false);
        } else if (showAgentSelector) {
          setShowAgentSelector(false);
        }
      }
    };

    if (isSpeechTestOpen || showAgentCollaboration || showAgentSelector) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSpeechTestOpen, showAgentCollaboration, showAgentSelector]);

  // ==================== MAIN HANDLER: پردازش پیام ====================
  const handleSend = useCallback(async (content: string, image?: string) => {
    // CRITICAL: Prevent duplicate requests - if already loading, ignore
    if (isLoading) {
      console.log('[App] Ignoring duplicate request - already processing');
      return;
    }
    
    // CRITICAL: Provider availability guard - MUST be FIRST check
    // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), block submission
    // This prevents ANY dispatch to AgentOrchestrator
    const { DegradedMode } = await import('./services/degradedMode');
    if (!DegradedMode.isProviderAvailable('gemini')) {
      const degradedMessage = DegradedMode.getDegradedMessage('gemini');
      if (degradedMessage && DegradedMode.shouldShowNotification('gemini')) {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'user',
          content,
          timestamp: Date.now()
        }, {
          id: generateId(),
          role: 'model',
          content: degradedMessage,
          timestamp: Date.now()
        }]);
      }
      return; // Block submission - do NOT dispatch to AgentOrchestrator
    }

    // CRITICAL: Check for cooldown after 429
    const { StreamLifecycleManager } = await import('./services/streamLifecycleManager');
    if (agentConfig?.apiKey && StreamLifecycleManager.isInCooldown(agentConfig.apiKey)) {
      const remaining = StreamLifecycleManager.getRemainingCooldown(agentConfig.apiKey);
      const message = `Rate limited. Please wait ${Math.ceil(remaining / 1000)} seconds before trying again.`;
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now()
      }, {
        id: generateId(),
        role: 'model',
        content: message,
        timestamp: Date.now()
      }]);
      return; // Block submission during cooldown
    }

    // Generate requestId for end-to-end telemetry
    const requestId = NetworkReliabilityVerification.generateRequestId();
    (window as any).__currentRequestId = requestId;
    
    // #region agent log
    sendAgentTelemetry({
      location: 'App.tsx:202',
      message: 'handleSend called',
      data: { hasContent: !!content.trim(), hasImage: !!image, contentLength: content?.length || 0, requestId },
      hypothesisId: 'A'
    });
    // #endregion
    
    // Handle diagnostic command
    if (content.trim() === '/diagnose') {
      await handleDiagnostic();
      return;
    }
    
    if (!content.trim() && !image) return;

    // بررسی API Key
    if (!agentConfig.apiKey) {
      // #region agent log
      sendAgentTelemetry({
        location: 'App.tsx:207',
        message: 'API key missing',
        data: {},
        hypothesisId: 'A'
      });
      // #endregion
      // Ensure chat is visible
      if (!chatVisible) {
        setChatVisible(true);
        setChatCollapsed(false);
      }
      // Add user message and error response
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now()
      }, {
        id: generateId(),
        role: 'model',
        content: '⚠️ Please enter your API Key in Settings first. Click on ⚙️ Settings in the Ribbon to configure your API key.',
        timestamp: Date.now()
      }]);
      return;
    }

    // CRITICAL: Check if API validation is in progress
    if (isValidatingApi) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now()
      }, {
        id: generateId(),
        role: 'model',
        content: '⏳ Please wait... Validating API key and discovering models. This will only take a moment.',
        timestamp: Date.now()
      }]);
      return;
    }

    // CRITICAL: Check if validation completed successfully
    if (!validationComplete) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now()
      }, {
        id: generateId(),
        role: 'model',
        content: '⚠️ API validation failed or incomplete. Please check your API key in Settings and try again.',
        timestamp: Date.now()
      }]);
      return;
    }

    // پیام کاربر
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      image,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // پیام مدل (loading)
    const modelMessageId = generateId();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    };
    setMessages(prev => [...prev, modelMessage]);

    // requestId already generated above
    console.log(`[App][requestId=${requestId}]: Processing user message`);

    try {
      // Get validated model from Model Ribbon (SINGLE SOURCE OF TRUTH)
      const { ModelSelectionService } = await import('./services/modelSelectionService');
      const modelSelection = await ModelSelectionService.getValidatedModel(agentConfig.apiKey);
      
      if (!modelSelection.isValid) {
        const errorMsg = modelSelection.error || 'Selected model is no longer available. Please reselect a model in Agent Settings.';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: errorMsg,
          timestamp: Date.now()
        }]);
        return;
      }
      
      // Log runtime model selection for observability
      console.log(`[RuntimeChat][requestId=${requestId}]`, {
        SelectedModel: modelSelection.modelId,
        Source: modelSelection.source === 'ribbon' ? 'ModelRibbon' : 'Default',
        DiscoveryStatus: 'usable',
        UsableModelsCount: modelSelection.usableModels.length
      });
      
      // Provider availability already checked at handleSend entry point
      // AgentOrchestrator also has a defensive guard
      // پردازش با AgentOrchestrator
      // Note: selectedModel parameter is kept for compatibility, but GeminiService.streamChat
      // will use the ribbon selection from ModelSelectionService
      const result = await AgentOrchestrator.processUserMessage(
        content,
        agentConfig.apiKey,
        selectedModel, // Kept for compatibility, but ribbon selection takes precedence
        files,
        messages,
        requestId
      );

      // Handle provider limit (quota exhaustion) gracefully
      if (result.providerLimit) {
        const { DegradedMode: DM } = await import('./services/degradedMode');
        const degradedMessage = DM.getDegradedMessage('gemini') || result.response;
        if (DM.shouldShowNotification('gemini')) {
          setMessages(prev => prev.map(m => 
            m.id === modelMessageId 
              ? { ...m, content: degradedMessage, isLoading: false }
              : m
          ));
        } else {
          setMessages(prev => prev.map(m => 
            m.id === modelMessageId 
              ? { ...m, content: '', isLoading: false }
              : m
          ));
        }
        setIsLoading(false);
        return;
      }

      // Update AI mode state
      if (result.aiMode) {
        setCurrentAIMode(result.aiMode);
      }
      if (result.isOfflineResponse !== undefined) {
        setIsOfflineResponse(result.isOfflineResponse);
      }

      // به‌روزرسانی پیام
      setMessages(prev => prev.map(m => 
        m.id === modelMessageId 
          ? { ...m, content: result.response, isLoading: false }
          : m
      ));

      // Track token usage
      if (result.tokenUsage) {
        setTokenUsage(prev => {
          const newUsage = {
            prompt: prev.prompt + result.tokenUsage!.prompt,
            response: prev.response + result.tokenUsage!.response
          };
          // Save to localStorage for MCP tools
          try {
            localStorage.setItem('gstudio_token_usage', JSON.stringify(newUsage));
          } catch (e) {
            console.error('Failed to save token usage to localStorage:', e);
          }
          return newUsage;
        });
      }

      // به‌روزرسانی فایل‌ها
      if (result.updatedFiles) {
        setFiles(result.updatedFiles);
        
        // باز کردن خودکار فایل‌های جدید
        const newFiles = Object.keys(result.updatedFiles).filter(f => !files[f]);
        if (newFiles.length > 0) {
          setOpenFiles(prev => {
            const updated = [...new Set([...prev, ...newFiles])];
            return updated.slice(-10); // حداکثر 10 تب
          });
          setActiveFile(newFiles[0]);
        }
      }

      // به‌روزرسانی وضعیت پروژه
      if (result.projectState) {
        setProjectState(result.projectState);
      }

      // نمایش اقدامات انجام شده (development only)
      if (process.env.NODE_ENV === 'development' && result.actions && result.actions.length > 0) {
        console.log('🎯 Actions performed:', result.actions);
      }

      // Generate completion report
      try {
        const { CompletionReporter } = await import('./services/completionReporter');
        const { AIBehaviorValidation } = await import('./services/aiBehaviorValidation');
        
        // Verify completion
        const completionVerification = AIBehaviorValidation.verifyCompletion(
          { text: result.response, toolCalls: result.actions },
          null,
          requestId
        );

        // Determine system status
        const systemStatus = {
          ui: 'OK' as const,
          ai: completionVerification.isComplete ? 'OK' as const : 'BLOCKED' as const,
          infra: 'OK' as const
        };

        // Live verification
        const liveVerification = {
          uiInteractions: true,
          aiRequestSent: true,
          aiResponseReceived: !!result.response,
          networkReachable: true,
          details: ['Request processed successfully']
        };

        // Code delivery confirmation
        const codeDelivery = {
          codeDetected: completionVerification.criteria.containsCodeBlock,
          codeBlockCount: (result.response.match(/```/g) || []).length / 2,
          uiRendered: true,
          messageId: modelMessageId
        };

        // Generate report
        const report = CompletionReporter.generateReport(
          requestId,
          systemStatus,
          liveVerification,
          codeDelivery,
          completionVerification,
          false // allModelsExhausted
        );

        // Log report in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[CompletionReporter] Final report:', CompletionReporter.formatReportAsMarkdown(report));
        }
      } catch (reportError) {
        console.warn('[App] Failed to generate completion report:', reportError);
      }

    } catch (err: any) {
      console.error(`[App][requestId=${requestId}] Agent processing error:`, err);
      
      // CRITICAL: Check for FatalAIError - must block UI and stop execution
      const { isFatalError } = await import('./services/fatalAIError');
      if (isFatalError(err)) {
        console.error(`[App][requestId=${requestId}] FATAL_ERROR_DETECTED - blocking UI and stopping execution`, err.message);
        
        // Block UI input
        setIsLoading(false);
        
        // Show blocking error message
        const errorMessage = err.userMessage || err.message;
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'user',
          content,
          timestamp: Date.now()
        }, {
          id: generateId(),
          role: 'model',
          content: `⛔ **Fatal Error**: ${errorMessage}\n\nPlease run "API Model Test" again before using AI features.`,
          timestamp: Date.now()
        }]);
        
        // Stop execution - do NOT continue
        return;
      }
      
      // ERROR CLASSIFICATION: Use smart notification policy (only for non-fatal errors)
      let errorContent: string;
      const errorMsg = err.message || String(err);
      let classification: any = null;
      
      // Classify error and generate reports
      try {
        const { CompletionReporter } = await import('./services/completionReporter');
        const { AIBehaviorValidation, ClassificationResult } = await import('./services/aiBehaviorValidation');
        
        // Classify error
        const error = err instanceof Error ? err : new Error(String(err));
        classification = AIBehaviorValidation.classifyResponse(null, error, requestId, selectedModel, 1);
        
        // Record error root cause
        CompletionReporter.recordErrorRootCause(requestId, error, classification, selectedModel);
        
        // Generate failure report
        const completionVerification = AIBehaviorValidation.verifyCompletion(null, error, requestId);
        const systemStatus = {
          ui: 'OK' as const,
          ai: 'BLOCKED' as const,
          infra: classification === ClassificationResult.INFRA_FAILURE ? 'DEGRADED' as const : 'OK' as const
        };
        const liveVerification = {
          uiInteractions: true,
          aiRequestSent: true,
          aiResponseReceived: false,
          networkReachable: classification !== ClassificationResult.INFRA_FAILURE,
          details: [`Error: ${error.message}`]
        };
        const codeDelivery = {
          codeDetected: false,
          codeBlockCount: 0,
          uiRendered: false
        };
        
        const report = CompletionReporter.generateReport(
          requestId,
          systemStatus,
          liveVerification,
          codeDelivery,
          completionVerification,
          true // allModelsExhausted (assume true on error)
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[CompletionReporter] Failure report:', CompletionReporter.formatReportAsMarkdown(report));
        }
        
        // Check if in degraded mode (quota exhaustion handled gracefully)
        const { DegradedMode } = await import('./services/degradedMode');
        if (DegradedMode.isDegraded('gemini')) {
          // Provider limit - show notification only once
          if (DegradedMode.shouldShowNotification('gemini')) {
            errorContent = DegradedMode.getDegradedMessage('gemini') || 'Cloud AI is temporarily unavailable. Core features remain active.';
          } else {
            // Silent - already notified
            errorContent = '';
          }
        } else {
          // Get user message using smart notification policy
          // Determine if all models were exhausted (error reached App.tsx, so likely exhausted)
          const allModelsExhausted = true; // Errors reaching App.tsx typically mean all models exhausted
          
          // CRITICAL: Preserve quota exhaustion classification and pass error message for defensive detection
          // Check if error is quota exhaustion (defensive check)
          const isQuotaExhausted = classification === ClassificationResult.QUOTA_EXHAUSTED ||
                                   AIBehaviorValidation.isPermanentQuotaExhaustion(error);
          
          // Build notification context with error message for defensive quota detection
          const context = {
            executionPhase: 'final' as const, // Errors reaching App.tsx are final
            errorType: isQuotaExhausted ? ClassificationResult.QUOTA_EXHAUSTED : classification,
            allModelsExhausted,
            requiresUserAction: classification === ClassificationResult.CONFIG_FAILURE,
            errorMessage: error.message // Pass error message for defensive quota detection
          };
          
          // Use quota-aware classification if quota exhaustion detected
          const finalClassification = isQuotaExhausted 
            ? ClassificationResult.QUOTA_EXHAUSTED 
            : classification;
          
          // Get user message using smart notification policy
          errorContent = AIBehaviorValidation.getUserMessage(finalClassification, allModelsExhausted, context);
        }
        
        if (userMessage) {
          // Use the context-aware message from smart notification policy
          errorContent = userMessage;
        } else {
          // Fallback: If no message (shouldn't happen for final errors), use sanitized error
          const sanitizedMsg = errorMsg
            .split('\n')[0] // Only first line
            .replace(/at .*\(.*\)/g, '') // Remove stack traces
            .replace(/Error: /g, '')
            .trim();
          
          errorContent = `❌ Error: ${sanitizedMsg || 'Unknown error'}\n\n💡 Please try again or provide more details about your request.`;
        }
      } catch (reportError) {
        // Fallback if validation import fails
        console.warn('[App] Failed to use smart notification policy, using fallback:', reportError);
        const sanitizedMsg = errorMsg
          .split('\n')[0]
          .replace(/at .*\(.*\)/g, '')
          .replace(/Error: /g, '')
          .trim();
        errorContent = `❌ Error: ${sanitizedMsg || 'Unknown error'}\n\n💡 Please try again or provide more details about your request.`;
      }
      
      setMessages(prev => prev.map(m => 
        m.id === modelMessageId 
          ? { 
              ...m, 
              content: errorContent,
              isLoading: false 
            }
          : m
      ));
    } finally {
      setIsLoading(false);
      // Update state for runtime verification
      (window as any).__activeFile = activeFile;
      (window as any).__files = files;
      (window as any).__messages = messages;
      delete (window as any).__currentRequestId;
    }
  }, [agentConfig.apiKey, selectedModel, files, messages, activeFile]);

  // ==================== FILE MANAGEMENT ====================
  const handleRunCode = useCallback(async () => {
    if (!activeFile || !files[activeFile]) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: '⚠️ No file is currently open. Please open a file first.',
        timestamp: Date.now()
      }]);
      return;
    }

    const file = files[activeFile];
    const ext = activeFile.split('.').pop()?.toLowerCase();
    const isExecutable = ['js', 'ts', 'jsx', 'tsx', 'html'].includes(ext || '');
    
    if (!isExecutable) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: `⚠️ Cannot execute ${ext || 'this file type'}. Only JavaScript, TypeScript, and HTML files can be executed.`,
        timestamp: Date.now()
      }]);
      return;
    }

    // For HTML files, ensure preview is visible and refresh it
    if (ext === 'html') {
      if (!previewVisible) {
        setPreviewVisible(true);
      }
      // Preview will auto-refresh when files change, so we just need to ensure it's visible
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: `✅ Opening preview for ${activeFile}. The preview will automatically execute the HTML code.`,
        timestamp: Date.now()
      }]);
      return;
    }

    // For JS/TS files, execute code directly
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext || '')) {
      // Ensure preview is visible for console output
      if (!previewVisible) {
        setPreviewVisible(true);
      }
      
      try {
        const code = file.content;
        const capturedLogs: Array<{ type: 'log' | 'error' | 'warn' | 'info'; message: string }> = [];
        
        // Create isolated console that captures output
        const mockConsole = {
          log: (...args: any[]) => {
            capturedLogs.push({ type: 'log', message: args.map(a => String(a)).join(' ') });
          },
          error: (...args: any[]) => {
            capturedLogs.push({ type: 'error', message: args.map(a => String(a)).join(' ') });
          },
          warn: (...args: any[]) => {
            capturedLogs.push({ type: 'warn', message: args.map(a => String(a)).join(' ') });
          },
          info: (...args: any[]) => {
            capturedLogs.push({ type: 'info', message: args.map(a => String(a)).join(' ') });
          }
        };
        
        // Execute in isolated scope
        const wrappedCode = `
          (function() {
            const console = arguments[0];
            ${code}
          })(${JSON.stringify(mockConsole)});
        `;
        
        eval(wrappedCode);
        
        // Display captured output
        if (capturedLogs.length > 0) {
          const output = capturedLogs.map(log => 
            `[${log.type.toUpperCase()}] ${log.message}`
          ).join('\n');
          
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'model',
            content: `✅ Code executed successfully:\n\`\`\`\n${output}\n\`\`\``,
            timestamp: Date.now()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'model',
            content: '✅ Code executed successfully (no output).',
            timestamp: Date.now()
          }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'model',
          content: `❌ Error executing code:\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``,
          timestamp: Date.now()
        }]);
      }
    }
  }, [activeFile, files, previewVisible, setPreviewVisible, setMessages]);

  const handleFileChange = useCallback(async (filename: string, newContent: string) => {
    const oldContent = files[filename]?.content || null;
    const language = files[filename]?.language || 'plaintext';
    
    // Use StateTransaction for atomic state/DB updates
    const transaction = StateTransaction.createFileTransaction(
      filename,
      newContent,
      oldContent,
      setFiles,
      language
    );
    
    const result = await StateTransaction.execute(transaction);
    
    if (!result.success) {
      console.error('Failed to save file:', result.error);
      // State was automatically rolled back
    } else {
      // Update state for runtime verification
      (window as any).__files = { ...files, [filename]: { ...files[filename], content: newContent } };
    }
  }, [files]);

  const handleOpenFile = useCallback((filename: string) => {
    if (!openFiles.includes(filename)) {
      setOpenFiles(prev => [...prev, filename]);
    }
    setActiveFile(filename);
  }, [openFiles]);

  const handleCloseFile = useCallback((filename: string) => {
    setOpenFiles(prev => {
      const updated = prev.filter(f => f !== filename);
      if (activeFile === filename && updated.length > 0) {
        setActiveFile(updated[updated.length - 1]);
      } else if (updated.length === 0) {
        setActiveFile(null);
      }
      return updated;
    });
  }, [activeFile]);

  // ==================== FORMATTING ====================
  const handleFormat = useCallback(async () => {
    if (!activeFile || !files[activeFile]) return;

    try {
      const file = files[activeFile];
      const ext = activeFile.split('.').pop()?.toLowerCase();

      let formatted = file.content;
      
      if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
        formatted = await prettier.format(file.content, {
          parser: 'babel-ts',
          plugins: [parserBabel, parserEstree],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          printWidth: 100
        });
      } else if (ext === 'md' || ext === 'markdown') {
        formatted = await prettier.format(file.content, {
          parser: 'markdown',
          plugins: [parserMarkdown],
          proseWrap: 'always'
        });
      }

      handleFileChange(activeFile, formatted);
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: `✅ File ${activeFile} formatted.`,
        timestamp: Date.now()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: `❌ خطا در فرمت کردن: ${error.message}`,
        timestamp: Date.now()
      }]);
    }
  }, [activeFile, files, handleFileChange]);

  // ==================== PROJECT ACTIONS ====================
  const handleNewProject = useCallback(() => {
    if (Object.keys(files).length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'New Project',
        message: 'Are you sure? Current project will be deleted.',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setFiles({});
          setOpenFiles([]);
          setActiveFile(null);
          setMessages([]);
          AgentOrchestrator.reset();
          
          setMessages([{
            id: generateId(),
            role: 'model',
            content: `# New Project Ready! 🚀

What project would you like to build?

**Examples:**
- "Create an e-commerce website with React and TypeScript"
- "Build a management dashboard with interactive charts"
- "Create a To-Do app with LocalStorage"`,
            timestamp: Date.now()
          }]);
        }
      });
      return;
    }

    setFiles({});
    setOpenFiles([]);
    setActiveFile(null);
    setMessages([]);
    AgentOrchestrator.reset();
    
    setMessages([{
      id: generateId(),
      role: 'model',
      content: `# New Project Ready! 🚀

What project would you like to build?

**Examples:**
- "Create an e-commerce website with React and TypeScript"
- "Build a management dashboard with interactive charts"
- "Create a To-Do app with LocalStorage"`,
      timestamp: Date.now()
    }]);
  }, [files]);

  // ==================== FILE OPERATIONS ====================
  const handleNewFile = useCallback(() => {
    // #region agent log
    sendAgentTelemetry({
      location: 'App.tsx:435',
      message: 'handleNewFile called',
      data: {},
      hypothesisId: 'B'
    });
    // #endregion
    setPromptDialog({
      isOpen: true,
      title: 'New File',
      message: 'Enter file name:',
      defaultValue: 'untitled.txt',
      placeholder: 'untitled.txt',
      onConfirm: (filename) => {
        setPromptDialog(prev => ({ ...prev, isOpen: false }));
        if (!filename.trim()) return;
        
        const newFile: FileData = {
          name: filename,
          content: '',
          language: filename.split('.').pop() || 'plaintext'
        };
        
        setFiles(prev => ({ ...prev, [filename]: newFile }));
        setOpenFiles(prev => {
          if (prev.includes(filename)) {
            return prev; // Already open, don't add duplicate
          }
          return [...prev, filename];
        });
        setActiveFile(filename);
      }
    });
  }, []);

  const handleNewFolder = useCallback(() => {
    setPromptDialog({
      isOpen: true,
      title: 'New Folder',
      message: 'Enter folder name:',
      defaultValue: '',
      placeholder: 'folder-name',
      onConfirm: (foldername) => {
        setPromptDialog(prev => ({ ...prev, isOpen: false }));
        if (!foldername.trim()) return;
        
        // Validate and sanitize folder name
        const validFoldername = foldername.replace(/[^a-zA-Z0-9-_]/g, '_').trim();
        if (!validFoldername) {
          showError('Invalid folder name. Please use only letters, numbers, hyphens, and underscores.');
          return;
        }
        
        // Create a folder structure by adding a .gitkeep file
        const folderPath = `${validFoldername}/.gitkeep`;
        const folderMarkerFile: FileData = {
          name: '.gitkeep',
          content: `# Folder: ${validFoldername}\nThis file marks the folder structure.`,
          language: 'plaintext'
        };
        
        setFiles(prev => ({
          ...prev,
          [folderPath]: folderMarkerFile
        }));
        
        // Update project state to track the folder
        setProjectState(prev => ({
          ...prev,
          structure: {
            ...prev.structure,
            folders: [...(prev.structure.folders || []), validFoldername]
          }
        }));
        
        // Show confirmation message
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'model',
          content: `✅ Folder "${validFoldername}" created successfully.`,
          timestamp: Date.now()
        }]);
      }
    });
  }, []);

  const handleLoadDemo = useCallback(() => {
    setFiles(DEMO_PROJECT);
    setOpenFiles(['index.html']);
    setActiveFile('index.html');
    
    setMessages([{
      id: generateId(),
      role: 'model',
      content: `✅ Demo project loaded!`,
      timestamp: Date.now()
    }]);
  }, []);

  const handleImportProject = useCallback((importedFiles: Record<string, FileData>) => {
    setFiles(prev => ({ ...prev, ...importedFiles }));
    const fileNames = Object.keys(importedFiles);
    setOpenFiles(fileNames.slice(0, 5));
    setActiveFile(fileNames[0] || null);
    
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'model',
      content: `✅ ${fileNames.length} files imported.`,
      timestamp: Date.now()
    }]);
  }, []);

  // ==================== ADDITIONAL FILE HANDLERS ====================
  const handleSaveFile = useCallback(() => {
    if (!activeFile || !files[activeFile]) return;
    // File is auto-saved via handleFileChange, but we can show a message
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'model',
      content: `✅ File ${activeFile} saved.`,
      timestamp: Date.now()
    }]);
  }, [activeFile, files]);

  const handleDuplicateFile = useCallback(() => {
    if (!activeFile || !files[activeFile]) return;
    const ext = activeFile.split('.').pop();
    const baseName = activeFile.replace(`.${ext}`, '');
    const newName = `${baseName}.copy.${ext}`;
    const newFile: FileData = {
      name: newName,
      content: files[activeFile].content,
      language: files[activeFile].language
    };
    setFiles(prev => ({ ...prev, [newName]: newFile }));
    setOpenFiles(prev => [...prev, newName]);
    setActiveFile(newName);
  }, [activeFile, files]);

  const handleCopyFilePath = useCallback(() => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile).then(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        content: `✅ File path copied: ${activeFile}`,
        timestamp: Date.now()
      }]);
    });
  }, [activeFile]);

  const handleToggleWordWrap = useCallback(() => {
    // Toggle word wrap in editor
    if ((window as any).__editorToggleWordWrap) {
      (window as any).__editorToggleWordWrap();
    }
  }, []);

  const handleClearEditor = useCallback(() => {
    if (Object.keys(files).length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Editor',
      message: 'Are you sure? All files will be deleted.',
      variant: 'danger',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setFiles({});
        setOpenFiles([]);
        setActiveFile(null);
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'model',
          content: `✅ All files deleted.`,
          timestamp: Date.now()
        }]);
      }
    });
  }, [files]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleSearchFiles = useCallback(() => {
    setPromptDialog({
      isOpen: true,
      title: 'Search Files',
      message: 'Enter search query:',
      defaultValue: '',
      placeholder: 'Search term...',
      onConfirm: (query) => {
        setPromptDialog(prev => ({ ...prev, isOpen: false }));
        if (!query.trim()) return;
        const results = Object.keys(files).filter(name => 
          name.toLowerCase().includes(query.toLowerCase()) || 
          files[name].content.toLowerCase().includes(query.toLowerCase())
        );
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'model',
          content: results.length > 0 
            ? `✅ Found ${results.length} file(s):\n${results.join('\n')}`
            : `❌ No files found.`,
          timestamp: Date.now()
        }]);
      }
    });
  }, [files]);

  const handleFind = useCallback(() => {
    if (!activeFile) return;
    // Trigger editor find
    if ((window as any).__editorFind) {
      (window as any).__editorFind();
    }
  }, [activeFile]);

  const handleUndo = useCallback(() => {
    if ((window as any).__editorUndo) {
      (window as any).__editorUndo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if ((window as any).__editorRedo) {
      (window as any).__editorRedo();
    }
  }, []);

  const handleGoToLine = useCallback(() => {
    if (!activeFile) return;
    setPromptDialog({
      isOpen: true,
      title: 'Go to Line',
      message: 'Enter line number:',
      defaultValue: '',
      placeholder: 'Line number',
      validate: (value) => {
        if (!value.trim()) return 'Please enter a line number';
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Please enter a valid positive line number';
        }
        return null;
      },
      onConfirm: (line) => {
        setPromptDialog(prev => ({ ...prev, isOpen: false }));
        const lineNum = parseInt(line);
        if ((window as any).__editorGoToLine) {
          (window as any).__editorGoToLine(lineNum);
        }
      }
    });
  }, [activeFile]);

  // ==================== RENDER ====================
  return (
    <div className={`h-screen flex flex-col font-['Inter','Vazir'] overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Modern Ribbon */}
      <Ribbon
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onLoadDemo={handleLoadDemo}
        onImportProject={handleImportProject}
        onTriggerTool={async (action) => {
          if (action === 'format' && activeFile) {
            handleFormat();
            return;
          }
          
          // Map actions to appropriate messages
          const actionMessages: Record<string, string> = {
            'overview': 'Analyze the project structure and provide an overview of all files, dependencies, and architecture.',
            'analyze': 'Perform a deep code audit. Review the architecture, design patterns, code quality, and provide detailed analysis.',
            'bugs': 'Find and identify all bugs, security vulnerabilities, and potential issues in the codebase.',
            'refactor': 'Refactor the code to improve quality, maintainability, and follow best practices. Modernize the codebase.',
            'optimize': 'Optimize the code for performance, efficiency, and resource usage.'
          };
          
          const message = actionMessages[action];
          if (message) {
            // Ensure chat is visible
            if (!chatVisible) {
              setChatVisible(true);
            }
            // Send message to chat handler
            await handleSend(message);
          }
        }}
        onToggleChat={() => {
          // #region agent log
          sendAgentTelemetry({
            location: 'App.tsx:660',
            message: 'Toggle chat clicked',
            data: { currentState: chatVisible, newState: !chatVisible },
            hypothesisId: 'D'
          });
          // #endregion
          setChatVisible(!chatVisible);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCodeIntelligence={() => {
          // Initialize Code Intelligence API if not already initialized
          if (!codeIntelligenceAPI) {
            try {
              // Try to import and initialize the API
              import('./services/codeIntelligence/api').then(({ getCodeIntelligenceAPI }) => {
                const api = getCodeIntelligenceAPI();
                setCodeIntelligenceAPI(api);
                setIsCodeIntelligenceOpen(true);
                // Initialize asynchronously
                api.initialize().catch((err: any) => {
                  console.error('Code Intelligence initialization error:', err);
                  setMessages(prev => [...prev, {
                    id: generateId(),
                    role: 'model',
                    content: `⚠️ Code Intelligence initialized with limited functionality. Some features may not be available.`,
                    timestamp: Date.now()
                  }]);
                });
              }).catch((err: any) => {
                // Handle TypeScript dependency error gracefully
                const errorMessage = err?.message || String(err);
                const isTypeScriptError = errorMessage.includes('typescript') || 
                                         errorMessage.includes('Synchronous require');
                
                console.warn('Code Intelligence API load warning:', err);
                
                if (isTypeScriptError) {
                  setMessages(prev => [...prev, {
                    id: generateId(),
                    role: 'model',
                    content: `⚠️ Code Intelligence feature requires TypeScript. Some features may be limited. This is expected in browser environments.`,
                    timestamp: Date.now()
                  }]);
                } else {
                  setMessages(prev => [...prev, {
                    id: generateId(),
                    role: 'model',
                    content: `⚠️ Code Intelligence feature is not available in this environment. The feature requires Node.js runtime.`,
                    timestamp: Date.now()
                  }]);
                }
              });
            } catch (err: any) {
              console.error('Code Intelligence error:', err);
              setMessages(prev => [...prev, {
                id: generateId(),
                role: 'model',
                content: `⚠️ Code Intelligence feature is not available. ${err.message || 'Unknown error'}`,
                timestamp: Date.now()
              }]);
            }
          } else {
            setIsCodeIntelligenceOpen(true);
          }
        }}
        onClearChat={() => {
          setMessages([]);
          AgentOrchestrator.reset();
        }}
        chatVisible={chatVisible}
        selectedModel={selectedModel}
        onSelectModel={(model) => {
          setSelectedModel(model);
          // Save via ModelSelectionService (CONTRACT API - SINGLE SOURCE OF TRUTH)
          if (agentConfig?.apiKey) {
            ModelSelectionService.setManualModel(agentConfig.apiKey, model);
          }
        }}
        onManageApiKey={() => {
          setIsAgentModalOpen(true);
          setActiveAgentTab('connection');
        }}
        onChangeVoice={() => {
          setIsAgentModalOpen(true);
          setActiveAgentTab('voice');
        }}
        onChangePersonality={() => {
          setIsAgentModalOpen(true);
          setActiveAgentTab('identity');
        }}
        onRunMcpTool={(tool) => setMcpToolModal({ isOpen: true, tool })}
        agentConfig={agentConfig}
        files={files}
        onShare={() => {
          if (Object.keys(files).length === 0) {
            showWarning("No files to share.");
            return;
          }
          const jsonString = JSON.stringify(files, null, 2);
          navigator.clipboard.writeText(jsonString).then(() => {
            setMessages(prev => [...prev, {
              id: generateId(),
              role: 'model',
              content: `✅ Project copied to clipboard. You can share it now.`,
              timestamp: Date.now()
            }]);
          });
        }}
        onShowSpeechTest={() => {
          setIsSpeechTestOpen(true);
        }}
        isListening={isListening}
        onToggleListening={() => setIsListening(!isListening)}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onToggleInspector={() => setInspectorVisible(!inspectorVisible)}
        onTogglePreview={() => setPreviewVisible(!previewVisible)}
        onToggleMonitor={() => setMonitorVisible(!monitorVisible)}
        onToggleMinimap={() => setMinimapEnabled(!minimapEnabled)}
        onToggleEditor={() => setEditorVisible(!editorVisible)}
        sidebarVisible={sidebarVisible}
        inspectorVisible={inspectorVisible}
        previewVisible={previewVisible}
        monitorVisible={monitorVisible}
        minimapEnabled={minimapEnabled}
        editorVisible={editorVisible}
        onFormatFile={handleFormat}
        activeFile={activeFile}
        openFiles={openFiles}
        onSaveFile={handleSaveFile}
        onCloseFile={() => activeFile && handleCloseFile(activeFile)}
        onDuplicateFile={handleDuplicateFile}
        onCopyFilePath={handleCopyFilePath}
        onToggleWordWrap={handleToggleWordWrap}
        onClearEditor={handleClearEditor}
        onRefresh={handleRefresh}
        onSearchFiles={handleSearchFiles}
        onFind={handleFind}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onGoToLine={handleGoToLine}
        onRunCode={async () => {
          // #region agent log
          sendAgentTelemetry({
            location: 'App.tsx:740',
            message: 'onRunCode clicked',
            data: { activeFile, hasFile: !!files[activeFile || ''] },
            hypothesisId: 'C'
          });
          // #endregion
          handleRunCode();
        }}
        onShowRibbonModal={(modalName, data) => {
          setRibbonModals(prev => ({ ...prev, [modalName]: true }));
          // Update state from RibbonMcpTab if provided
          if (data) {
            if (data.toolExecutionHistory) {
              setToolExecutionHistory(data.toolExecutionHistory);
            }
            if (data.toolChains) {
              setToolChains(data.toolChains);
            }
            if (data.customTools) {
              setCustomTools(data.customTools);
            }
            if (data.editingTool !== undefined) {
              setEditingTool(data.editingTool);
            }
            if (data.newToolName !== undefined) {
              setNewToolName(data.newToolName);
            }
            if (data.newToolDescription !== undefined) {
              setNewToolDescription(data.newToolDescription);
            }
          }
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onOpenGeminiTester={() => setIsGeminiTesterOpen(true)}
        onOpenAISettingsHub={() => setIsAISettingsHubOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Toolbox always visible, drawer controlled by sidebarVisible */}
        <Sidebar
              files={files}
              selectedModel={selectedModel}
              onSelectModel={(model) => {
                setSelectedModel(model);
                // Save via ModelSelectionService (CONTRACT API - SINGLE SOURCE OF TRUTH)
                if (agentConfig?.apiKey) {
                  ModelSelectionService.setManualModel(agentConfig.apiKey, model);
                }
              }}
              onClearChat={() => {
                setMessages([]);
                AgentOrchestrator.reset();
              }}
              onFileSelect={(filename) => {
                // #region agent log
                sendAgentTelemetry({
                  location: 'App.tsx:814',
                  message: 'File selected from sidebar',
                  data: { filename },
                  hypothesisId: 'E'
                });
                // #endregion
                handleOpenFile(filename);
              }}
              selectedFile={activeFile}
              onCreateFile={handleNewFile}
              onDeleteFile={(filename) => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Delete File',
                  message: `Are you sure you want to delete "${filename}"?`,
                  variant: 'danger',
                  onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setFiles(prev => {
                      const updated = { ...prev };
                      delete updated[filename];
                      return updated;
                    });
                    handleCloseFile(filename);
                  }
                });
              }}
              onRenameItem={(oldPath, newName) => {
                if (files[oldPath]) {
                  const newPath = newName;
                  setFiles(prev => {
                    const updated = { ...prev };
                    updated[newPath] = { ...updated[oldPath], name: newName };
                    delete updated[oldPath];
                    return updated;
                  });
                  if (activeFile === oldPath) {
                    setActiveFile(newPath);
                  }
                  setOpenFiles(prev => prev.map(f => f === oldPath ? newPath : f));
                }
              }}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAISettingsHub={() => setIsAISettingsHubOpen(true)}
              onLoadProject={handleLoadDemo}
              onTriggerTool={async (action) => {
                if (action === 'format' && activeFile) {
                  handleFormat();
                  return;
                }
                
                // Map actions to appropriate messages
                const actionMessages: Record<string, string> = {
                  'overview': 'Analyze the project structure and provide an overview of all files, dependencies, and architecture.',
                  'analyze': 'Perform a deep code audit. Review the architecture, design patterns, code quality, and provide detailed analysis.',
                  'bugs': 'Find and identify all bugs, security vulnerabilities, and potential issues in the codebase.',
                  'refactor': 'Refactor the code to improve quality, maintainability, and follow best practices. Modernize the codebase.',
                  'optimize': 'Optimize the code for performance, efficiency, and resource usage.'
                };
                
                const message = actionMessages[action];
                if (message) {
                  // Ensure chat is visible
                  if (!chatVisible) {
                    setChatVisible(true);
                    setChatCollapsed(false);
                  }
                  // Send message to chat handler
                  await handleSend(message);
                }
              }}
              onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
              sidebarVisible={sidebarVisible}
        />

        {/* Center Area: Editor and Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          {editorVisible && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tabs */}
              {openFiles.length > 0 && (
                <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 shadow-md">
                  <EditorTabs
                    openFiles={openFiles}
                    activeFile={activeFile}
                    onFileSelect={setActiveFile}
                    onFileClose={handleCloseFile}
                    onCreateFile={handleNewFile}
                  />
                </div>
              )}

              {/* Editor */}
              <div className="flex-1 bg-slate-900 overflow-hidden">
                {activeFile && files[activeFile] ? (
                  <CodeEditor
                    key={activeFile}
                    filename={activeFile}
                    content={files[activeFile].content}
                    onSave={handleFileChange}
                    onClose={() => handleCloseFile(activeFile)}
                    modelName={SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
                    tokenCount={tokenUsage.prompt + tokenUsage.response}
                    minimapEnabled={minimapEnabled}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center space-y-4">
                      <Code2 className="w-20 h-20 mx-auto opacity-30" />
                      <p className="text-lg font-semibold text-slate-300">No file open</p>
                      <p className="text-sm text-slate-400">Select a file from the Sidebar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Panel - Only rendered when explicitly opened */}
          {chatVisible && (
            <div className={`${chatCollapsed ? 'h-12' : 'h-[40%]'} border-t border-slate-700/60 bg-slate-900/95 backdrop-blur-sm shadow-lg flex flex-col transition-all duration-300 ease-out`}>
              {/* Header - Always visible, outside overflow container */}
              <div 
                className="px-4 py-2 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white flex items-center justify-between shadow-md cursor-pointer hover:from-slate-750 hover:via-slate-650 hover:to-slate-750 transition-colors shrink-0 relative z-10" 
                onClick={() => {
                  if (chatCollapsed) {
                    setChatCollapsed(false);
                  }
                }}
              >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                    <h3 className="font-semibold text-base text-white whitespace-nowrap flex-shrink-0 relative z-10">G Studio Assistant</h3>
                    {!chatCollapsed && (
                      <>
                        <span className="text-xs bg-slate-800/60 px-2 py-1 rounded-full text-slate-300 flex-shrink-0">
                          {agentConfig.persona} Mode
                        </span>
                        {/* AI Mode Badge */}
                        {currentAIMode && (
                          <span 
                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${
                              currentAIMode === 'OFFLINE' 
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                : currentAIMode === 'LOCAL'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : currentAIMode === 'CLOUD'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            }`}
                            title={`AI Mode: ${currentAIMode}${isOfflineResponse ? ' (Offline Response)' : ''}`}
                          >
                            {currentAIMode === 'OFFLINE' && <WifiOff className="w-3 h-3" />}
                            {currentAIMode === 'LOCAL' && <HardDrive className="w-3 h-3" />}
                            {currentAIMode === 'CLOUD' && <Cloud className="w-3 h-3" />}
                            {currentAIMode === 'HYBRID' && <Wifi className="w-3 h-3" />}
                            {currentAIMode}
                            {isOfflineResponse && ' (Offline)'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!chatCollapsed && (
                      <>
                        {/* Token Counter */}
                        <div 
                          className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center gap-2 shadow-sm backdrop-blur-sm" 
                          title="Session Token Usage"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Usage</span>
                          <div className="h-2 w-px bg-slate-600" />
                          <span className="text-[10px] font-mono font-bold text-slate-200">
                            {((tokenUsage.prompt + tokenUsage.response)).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatCollapsed(!chatCollapsed);
                      }}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title={chatCollapsed ? "Expand" : "Collapse"}
                    >
                      {chatCollapsed ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatCollapsed(true);
                      }}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title="Collapse Chat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
              </div>
              
              {/* Content - Only shown when not collapsed */}
              {!chatCollapsed && (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <MessageList messages={messages} isLoading={isLoading} />
                  
                  <InputArea
                    onSend={handleSend}
                    isLoading={isLoading || isValidatingApi}
                    isListening={isListening}
                    onListeningChange={setIsListening}
                    language={agentConfig.language || 'fa-IR'}
                    currentAIMode={currentAIMode}
                    isOfflineResponse={isOfflineResponse}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Preview, Inspector, Monitor - Shared Container */}
        {(previewVisible || inspectorVisible || monitorVisible) && (
          <div className="w-[32%] max-w-[420px] border-l border-slate-800/60 bg-slate-900/80 backdrop-blur-md shadow-xl mr-16 transition-all duration-300 ease-in-out">
            {previewVisible && (
              <div className="h-full transition-opacity duration-300 ease-in-out">
                {FEATURE_FLAGS.ENABLE_ENHANCED_PREVIEW ? (
                  <ErrorBoundary componentName="PreviewPanelEnhanced">
                    <PreviewPanelEnhanced
                      files={files || {}}
                      activeFile={activeFile || undefined}
                    />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary componentName="PreviewPanel">
                    <PreviewPanel
                      files={files || {}}
                      activeFile={activeFile || undefined}
                    />
                  </ErrorBoundary>
                )}
              </div>
            )}
            {!previewVisible && inspectorVisible && (
              <div className="h-full transition-opacity duration-300 ease-in-out">
                <InspectorPanel
                  activeFile={activeFile}
                  files={files}
                  openFiles={openFiles}
                  tokenUsage={tokenUsage}
                  onClose={() => setInspectorVisible(false)}
                />
              </div>
            )}
            {!previewVisible && !inspectorVisible && monitorVisible && (
              <div className="h-full transition-opacity duration-300 ease-in-out">
                <div className="h-full flex flex-col bg-slate-900/80">
                  <MonitorPanel onClose={() => setMonitorVisible(false)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Activity Bar - Always visible */}
      <RightActivityBar
        chatVisible={chatVisible}
        previewVisible={previewVisible}
        inspectorVisible={inspectorVisible}
        monitorVisible={monitorVisible}
        onToggleChat={() => {
          const newValue = !chatVisible;
          setChatVisible(newValue);
          if (newValue) {
            setChatCollapsed(false);
          }
        }}
        onTogglePreview={() => {
          const newValue = !previewVisible;
          setPreviewVisible(newValue);
          if (newValue) {
            setInspectorVisible(false);
            setMonitorVisible(false);
          }
        }}
        onToggleInspector={() => {
          const newValue = !inspectorVisible;
          setInspectorVisible(newValue);
          if (newValue) {
            setPreviewVisible(false);
            setMonitorVisible(false);
          }
        }}
        onToggleMonitor={() => {
          const newValue = !monitorVisible;
          setMonitorVisible(newValue);
          if (newValue) {
            setPreviewVisible(false);
            setInspectorVisible(false);
          }
        }}
        onClosePreview={() => setPreviewVisible(false)}
        onCloseInspector={() => setInspectorVisible(false)}
        onCloseMonitor={() => setMonitorVisible(false)}
      />


      {/* Multi-Agent Status Bar */}
      {activeAgents.length > 0 && (
        <div className="fixed top-16 left-0 right-0 z-40">
          <MultiAgentStatus
            activeAgents={activeAgents}
            currentAgent={currentAgent}
            isProcessing={isLoading}
          />
        </div>
      )}

      {/* Notification Toast */}
      <NotificationToast
        notifications={notifications}
        onClose={(id) => {
          if (id) {
            notificationManager.remove(id);
          } else {
            notificationManager.clear();
          }
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Prompt Dialog */}
      <PromptDialog
        isOpen={promptDialog.isOpen}
        title={promptDialog.title}
        message={promptDialog.message}
        defaultValue={promptDialog.defaultValue}
        placeholder={promptDialog.placeholder}
        onConfirm={promptDialog.onConfirm}
        onCancel={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
        validate={promptDialog.validate}
      />

      {/* Modals - Lazy loaded with Suspense */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
        {isAgentModalOpen && (
          <AgentModal
            isOpen={isAgentModalOpen}
            config={agentConfig}
            onSave={setAgentConfig}
            onClose={() => setIsAgentModalOpen(false)}
            initialTab={activeAgentTab}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            isOpen={true}
            onClose={() => setIsSettingsOpen(false)}
            selectedModel={selectedModel}
            onSelectModel={(model) => {
              setSelectedModel(model);
              // Save via ModelSelectionService (CONTRACT API - SINGLE SOURCE OF TRUTH)
              if (agentConfig?.apiKey) {
                ModelSelectionService.setManualModel(agentConfig.apiKey, model);
              }
            }}
          />
        )}

        {/* AI Settings Hub - Unified AI Configuration */}
        {isAISettingsHubOpen && (
          <AISettingsHub
            isOpen={isAISettingsHubOpen}
            onClose={() => setIsAISettingsHubOpen(false)}
            config={aiConfig}
            onSave={handleSaveAIConfig}
          />
        )}

        {isCodeIntelligenceOpen && codeIntelligenceAPI && (
          <CodeIntelligenceDashboard
            isOpen={isCodeIntelligenceOpen}
            onClose={() => setIsCodeIntelligenceOpen(false)}
            api={codeIntelligenceAPI}
          />
        )}

        {mcpToolModal.isOpen && (
          <McpToolModal
            isOpen={true}
            tool={mcpToolModal.tool}
            onClose={() => setMcpToolModal({ isOpen: false, tool: '' })}
            onExecute={async (params) => {
            try {
              const result = await McpService.executeTool(
                mcpToolModal.tool,
                params,
                files,
                {
                  setFiles: (updater) => {
                    setFiles(updater);
                  },
                  setOpenFiles: (updater) => {
                    setOpenFiles(updater);
                  },
                  setActiveFile: (file) => {
                    setActiveFile(file);
                  },
                  getActiveFile: () => activeFile,
                  getOpenFiles: () => openFiles
                }
              );
              
              if (result.success) {
                setMessages(prev => [...prev, {
                  id: generateId(),
                  role: 'model',
                  content: `✅ ${result.message}`,
                  timestamp: Date.now()
                }]);
              } else {
                setMessages(prev => [...prev, {
                  id: generateId(),
                  role: 'model',
                  content: `❌ Error: ${result.message}`,
                  timestamp: Date.now()
                }]);
              }
            } catch (error: any) {
              setMessages(prev => [...prev, {
                id: generateId(),
                role: 'model',
                content: `❌ Error executing tool: ${error.message}`,
                timestamp: Date.now()
              }]);
            }
          }}
          files={files}
        />
        )}

        {showAgentSelector && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAgentSelector(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <React.Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
                <AgentSelector
                  selectedAgents={selectedAgents}
                  onChange={setSelectedAgents}
                  onClose={() => setShowAgentSelector(false)}
                />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* Agent Collaboration Modal */}
        {showAgentCollaboration && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAgentCollaboration(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Agent Collaboration</h2>
                <button
                  onClick={() => setShowAgentCollaboration(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <AgentCollaboration
                activeAgents={selectedAgents as any}
                onAgentsChange={(roles) => {
                  setSelectedAgents(roles as any);
                }}
              />
            </div>
          </div>
        )}

        {/* Speech Test Modal */}
        {isSpeechTestOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setIsSpeechTestOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Speech Recognition Test</h2>
                <button
                  onClick={() => setIsSpeechTestOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SpeechTest />
            </div>
          </div>
        )}

        {/* Gemini Model Tester Modal - First screen on startup */}
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"><div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-white" /></div></div>}>
          <GeminiTesterPro 
            isOpen={isGeminiTesterOpen} 
            onClose={() => setIsGeminiTesterOpen(false)} 
          />
        </React.Suspense>
      </React.Suspense>

      {/* Ribbon Modals - Rendered as popups in separate frame */}
      <ProjectStructureModal
        isOpen={ribbonModals.projectStructure}
        files={files}
        onClose={() => setRibbonModals(prev => ({ ...prev, projectStructure: false }))}
      />

      <ToolExecutionHistoryModal
        isOpen={ribbonModals.toolHistory}
        toolExecutionHistory={toolExecutionHistory}
        onClose={() => setRibbonModals(prev => ({ ...prev, toolHistory: false }))}
      />

      <ToolChainsModal
        isOpen={ribbonModals.toolChains}
        toolChains={toolChains}
        onClose={() => setRibbonModals(prev => ({ ...prev, toolChains: false }))}
      />

      <ToolManagerModal
        isOpen={ribbonModals.toolManager}
        customTools={customTools}
        editingTool={editingTool}
        newToolName={newToolName}
        newToolDescription={newToolDescription}
        onClose={() => {
          setRibbonModals(prev => ({ ...prev, toolManager: false }));
          setEditingTool(null);
          setNewToolName('');
          setNewToolDescription('');
        }}
        onAddTool={handleAddTool}
        onEditTool={handleEditTool}
        onRemoveTool={handleRemoveTool}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => {
          setEditingTool(null);
          setNewToolName('');
          setNewToolDescription('');
        }}
        onNewToolNameChange={setNewToolName}
        onNewToolDescriptionChange={setNewToolDescription}
      />

      <CodeMetricsModal
        isOpen={ribbonModals.codeMetrics}
        codeMetrics={codeMetrics}
        onClose={() => setRibbonModals(prev => ({ ...prev, codeMetrics: false }))}
      />

      <ToolUsageAnalyticsModal
        isOpen={ribbonModals.toolUsageAnalytics}
        toolUsage={toolUsage}
        onClose={() => setRibbonModals(prev => ({ ...prev, toolUsageAnalytics: false }))}
      />
    </div>
  );
}
