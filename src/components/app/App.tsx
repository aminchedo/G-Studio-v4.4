/**
 * G Studio v2.3.0 - Main Application Component
 *
 * Unified and refactored version combining all features:
 * - 🤖 AI Agent Orchestration
 * - 🎨 Modern Professional UI
 * - 💾 Integrated Database
 * - 🔧 Smart Code Intelligence
 * - 🎯 Multi-Agent Collaboration
 * - 🚀 Live Preview
 * - 📝 Auto Code Formatting
 * - 🌐 Full Persian Support
 *
 * @version 2.3.0
 * @refactored Fully functional, minimal UI changes
 */

import * as React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ==================== HOOKS ====================
import { useEditorState } from "@/hooks/useEditorState";
import { useChatState } from "@/hooks/useChatState";
import { useUIPanelState } from "@/hooks/useUIPanelState";
import { useAgentConfig } from "@/hooks/useAgentConfig";

// ==================== COMPONENTS - LAYOUT ====================
import { Sidebar } from "@/components/layout/Sidebar";
import { RightActivityBar } from "@/components/layout/RightActivityBar";
import { Ribbon } from "@/components/layout/Ribbon";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// ==================== COMPONENTS - CHAT ====================
import {
  MessageListVirtualized,
  MessageItem,
} from "@/components/chat/message-list";
import { InputArea } from "@/components/chat/InputArea";

// ==================== COMPONENTS - EDITOR ====================
import { CodeEditor } from "@/components/editor/CodeEditor";
import { EditorTabs } from "@/components/editor/EditorTabs";

// ==================== COMPONENTS - PREVIEW ====================
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import {
  SplitView,
  OrientationToggle,
  RatioPresets,
} from "@/components/preview";
import { LiveCodeEditor } from "@/components/preview";

// ==================== COMPONENTS - PANELS ====================
import { InspectorPanel } from "@/components/panels/InspectorPanel";
import MonitorPanel from "@/components/panels/MonitorPanel";
import { IntegratedConversationalIDE } from "@/components/IntegratedConversationalIDE";

// ==================== COMPONENTS - AI FEATURES ====================
import { MultiAgentStatus } from "@/components/ai/MultiAgentStatus";
import { AgentCollaboration } from "@/components/ai/AgentCollaboration";
import { SpeechTest } from "@/features/ai/SpeechTest";

// ==================== COMPONENTS - CONVERSATION ====================
import { ConversationList, ContextViewer } from "@/components/conversation";
import {
  useConversationStore,
  useCurrentConversation,
  useConversationActions,
} from "@/stores/conversationStore";

// ==================== COMPONENTS - UI ====================
import {
  NotificationToast,
  notificationManager,
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from "@/components/ui/NotificationToast";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { PromptDialog } from "@/components/modals/PromptDialog";

// ==================== LAZY LOADED MODALS ====================
const SettingsModal = React.lazy(() =>
  import("@/components/modals/SettingsModal").then((module) => ({
    default: module.SettingsModal,
  }))
);
const AgentModal = React.lazy(() =>
  import("@/components/modals/AgentModal").then((module) => ({
    default: module.AgentModal,
  }))
);
const McpToolModal = React.lazy(() =>
  import("@/components/modals/McpToolModal").then((module) => ({
    default: module.McpToolModal,
  }))
);
const AgentSelector = React.lazy(() =>
  import("@/components/ai/AgentSelector").then((module) => ({
    default: module.AgentSelector,
  }))
);
const CodeIntelligenceDashboard = React.lazy(() =>
  import("@/features/code-intelligence/CodeIntelligenceDashboard").then(
    (module) => ({ default: module.CodeIntelligenceDashboard })
  )
);
const GeminiTesterPro = React.lazy(() =>
  import("@/features/ai/gemini-tester").then((module) => ({
    default: module.default,
  }))
);
const AISettingsHub = React.lazy(() =>
  import("@/features/ai/AISettingsHub").then((module) => ({
    default: module.AISettingsHub,
  }))
);

// ==================== RIBBON MODALS ====================
import { ProjectStructureModal } from "@/components/ribbon/ProjectStructureModal";
import { ToolExecutionHistoryModal } from "@/components/ribbon/ToolExecutionHistoryModal";
import { ToolChainsModal } from "@/components/ribbon/ToolChainsModal";
import { ToolManagerModal } from "@/components/ribbon/ToolManagerModal";
import { CodeMetricsModal } from "@/components/ribbon/CodeMetricsModal";
import { ToolUsageAnalyticsModal } from "@/components/ribbon/ToolUsageAnalyticsModal";

// ==================== SERVICES ====================
import { GeminiService } from "@/services/ai/geminiService";
import { McpService } from "@/services/mcpService";
import { databaseService } from "@/services/storage/databaseService";
import { AgentOrchestrator, ProjectState } from "@/services/agentOrchestrator";
import { StateTransaction } from "@/services/stateTransaction";
import { SecureStorage } from "@/services/security/secureStorage";
import { ModelSelectionService } from "@/services/ai/modelSelectionService";
import { NetworkReliabilityVerification } from "@/services/network/networkReliabilityVerification";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";

// ==================== TYPES & CONSTANTS ====================
import { Message, ModelId, FileData, ToolCall, ToolResult } from "@/types";
import { SUPPORTED_MODELS, FEATURE_FLAGS } from "@/config/constants";
import { ExecutionMode } from "@/services/hybridDecisionEngine";

// ==================== ICONS ====================
import {
  Terminal,
  Layers,
  PanelRightClose,
  PanelRight,
  Cpu,
  Activity,
  Zap,
  X,
  Code2,
  Users,
  Sparkles,
  Loader2,
  Wifi,
  WifiOff,
  Cloud,
  HardDrive,
  BookOpen,
  Clock,
  History,
  Plus,
  Trash2,
} from "lucide-react";

// ==================== CODE FORMATTING ====================
// @ts-ignore
import prettier from "prettier";
// @ts-ignore
import parserBabel from "prettier/plugins/babel";
// @ts-ignore
import parserEstree from "prettier/plugins/estree";
// @ts-ignore
import parserMarkdown from "prettier/plugins/markdown";

// ==================== HELPERS ====================

/**
 * Generate unique ID for messages and components
 */
const generateId = (): string => Math.random().toString(36).substring(2, 15);

/**
 * Demo project template for quick start
 */
const DEMO_PROJECT: Record<string, FileData> = {
  "index.html": {
    name: "index.html",
    language: "html",
    path: "index.html",
    lastModified: new Date(),
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Page - G Studio</title>
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
    <div class="mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-semibold mb-3">Features</h2>
      <ul class="list-disc list-inside space-y-2 text-gray-600">
        <li>AI-powered code generation</li>
        <li>Live preview and editing</li>
        <li>Multi-agent collaboration</li>
        <li>Intelligent code completion</li>
      </ul>
    </div>
  </div>
</body>
</html>`,
  },
  "styles.css": {
    name: "styles.css",
    language: "css",
    path: "styles.css",
    lastModified: new Date(),
    content: `/* G Studio Demo Styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}`,
  },
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

/**
 * Main App Component
 *
 * This is the core component that orchestrates all functionality.
 * Fully functional, with minimal UI changes from original.
 */
export default function App() {
  // ==================== STATE FROM HOOKS ====================

  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    tokenUsage,
    setTokenUsage,
  } = useChatState();

  const {
    files,
    setFiles,
    openFiles,
    setOpenFiles,
    activeFile,
    setActiveFile,
  } = useEditorState();

  // ==================== STATE REFS (safe access from async) ====================

  const filesRef = useRef(files);
  const openFilesRef = useRef(openFiles);
  const activeFileRef = useRef(activeFile);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

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
    vcodeVisible,
    setVcodeVisible,
    minimapEnabled,
    setMinimapEnabled,
    editorVisible,
    setEditorVisible,
  } = useUIPanelState();

  const {
    agentConfig,
    setAgentConfig,
    loading: agentConfigLoading,
  } = useAgentConfig();

  // ==================== AI SETTINGS (persisted) ====================
  // AISettingsHub persists to gstudio_ai_config; legacy code also used ai_config.
  const loadAiUserConfig = (): any => {
    try {
      const raw =
        localStorage.getItem("gstudio_ai_config") ||
        localStorage.getItem("ai_config");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [aiUserConfig, setAiUserConfig] = useState<any>(() =>
    loadAiUserConfig()
  );

  // Keep local state in sync if user edits storage externally (rare, but safe)
  useEffect(() => {
    setAiUserConfig(loadAiUserConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate API key from gstudio_ai_config or main Settings store if agentConfig has none
  useEffect(() => {
    if (agentConfigLoading) return;
    if (agentConfig.apiKey?.trim()) return;
    const fromHub = loadAiUserConfig();
    if (fromHub?.apiKey?.trim()) {
      setAgentConfig({
        ...agentConfig,
        apiKey: String(fromHub.apiKey).trim(),
      });
      return;
    }
    try {
      const raw = localStorage.getItem("g-studio-settings");
      if (raw) {
        const data = JSON.parse(raw);
        const google =
          data?.state?.settings?.apiKeys?.google ??
          data?.settings?.apiKeys?.google;
        if (typeof google === "string" && google.trim()) {
          setAgentConfig({
            ...agentConfig,
            apiKey: google.trim(),
          });
          localStorage.setItem("gemini_api_key", google.trim());
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentConfigLoading]);

  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [confirmClearChatOpen, setConfirmClearChatOpen] = useState(false);
  const chatHistoryScrollRef = useRef<HTMLDivElement>(null);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setTokenUsage({ prompt: 0, response: 0 });
    setChatHistoryOpen(false);
  }, [setMessages, setTokenUsage]);

  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setTokenUsage({ prompt: 0, response: 0 });
    setChatHistoryOpen(false);
    setConfirmClearChatOpen(false);
  }, [setMessages, setTokenUsage]);

  // Auto-scroll conversation to bottom when messages change (after paint)
  useEffect(() => {
    const scrollToBottom = () => {
      if (!chatHistoryScrollRef.current) return;
      const el = chatHistoryScrollRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      });
    };
    scrollToBottom();
  }, [messages, isLoading]);

  // ==================== MODEL SELECTION ====================

  /**
   * ✅ FIX #1: Properly typed selectedModel state
   */
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try {
      const saved = localStorage.getItem("gstudio_selected_model");
      if (saved && Object.values(ModelId).includes(saved as ModelId)) {
        return saved as ModelId;
      }
    } catch (e) {
      console.error("Failed to load selected model from localStorage:", e);
    }
    return ModelId.Gemini3FlashPreview;
  });

  // Persist model selection
  useEffect(() => {
    try {
      localStorage.setItem("gstudio_selected_model", selectedModel);
    } catch (e) {
      console.warn("Failed to save selected model to localStorage:", e);
    }
  }, [selectedModel]);

  // When user selects a model in Ribbon/Sidebar, update both local state and ModelSelectionService
  // so that chat actually uses the selected model (GeminiService reads from ModelSelectionService)
  const handleSelectModel = useCallback(
    (modelId: ModelId) => {
      setSelectedModel(modelId);
      if (agentConfig.apiKey?.trim()) {
        try {
          ModelSelectionService.setManualModel(agentConfig.apiKey, modelId);
        } catch (e) {
          console.warn(
            "[App] setManualModel failed (run Test Models first):",
            e
          );
        }
      }
    },
    [agentConfig.apiKey]
  );

  // ==================== PREVIEW STATE ====================

  const [splitOrientation, setSplitOrientation] = useState<
    "horizontal" | "vertical"
  >(() => {
    try {
      return (
        (localStorage.getItem("gstudio-split-orientation") as
          | "horizontal"
          | "vertical") || "horizontal"
      );
    } catch {
      return "horizontal";
    }
  });

  const [splitRatio, setSplitRatio] = useState(0.5);

  const [useMonacoEditor, setUseMonacoEditor] = useState(() => {
    try {
      return localStorage.getItem("gstudio-use-monaco") === "true";
    } catch {
      return false;
    }
  });

  const [previewErrors, setPreviewErrors] = useState<
    Array<{
      message: string;
      line?: number;
      column?: number;
      timestamp?: Date | number;
    }>
  >([]);

  // ==================== AI CONFIGURATION ====================

  /**
   * Unified AI configuration object
   */
  const aiConfig = useMemo(
    () => ({
      // Connection
      apiKey: agentConfig.apiKey || "",

      // Models
      selectedModel: selectedModel,
      selectionMode: ModelSelectionService.getSelectionMode(
        agentConfig.apiKey || ""
      ) as "auto" | "manual",
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      enableStreaming: true,

      // Behavior
      persona: (agentConfig.persona?.toLowerCase() || "professional") as
        | "professional"
        | "friendly"
        | "concise"
        | "creative",
      responseStyle: "detailed" as const,
      codeStyle: "modern" as const,
      autoFormat: true,

      // Voice & Language
      voiceEnabled: aiUserConfig.voiceEnabled ?? true, // enable voice UI by default
      language: agentConfig.language || "en-US",
      voiceModel: "Vosk",
      autoSend: aiUserConfig.autoSend ?? true, // voice command mode (auto-send) by default
      confidenceThreshold: 0.7,

      // TTS (voice output)
      ttsEnabled: aiUserConfig.ttsEnabled ?? false,
      autoSpeak: aiUserConfig.autoSpeak ?? false,
      ttsVoice: aiUserConfig.ttsVoice,
      ttsRate: aiUserConfig.ttsRate ?? 1.0,
      ttsPitch: aiUserConfig.ttsPitch ?? 1.0,
      ttsVolume: aiUserConfig.ttsVolume ?? 1.0,

      // Local AI
      localAIEnabled: false,
      localModel: "",
      offlineMode: "auto" as const,
      fallbackToCloud: true,
      promptImprovement: false,
      promptMode: "deterministic" as const,

      // General
      notifications: true,
    }),
    [agentConfig, selectedModel, aiUserConfig]
  );

  /**
   * Handle AI config updates
   */
  const handleSaveAIConfig = useCallback(
    (newConfig: any) => {
      // Persist full AISettingsHub config (voice/tts/local flags, etc.)
      setAiUserConfig(newConfig);
      setAgentConfig({
        ...agentConfig,
        apiKey: newConfig.apiKey,
        persona: newConfig.persona,
        language: newConfig.language,
      });

      // Persist model selection + keep runtime selection service in sync
      const apiKey = (newConfig.apiKey || agentConfig.apiKey || "").trim();
      if (
        newConfig.selectionMode === "auto" ||
        newConfig.selectionMode === "manual"
      ) {
        try {
          if (apiKey)
            ModelSelectionService.setSelectionMode(
              apiKey,
              newConfig.selectionMode
            );
        } catch (e) {
          console.warn("[App] Failed to set selection mode:", e);
        }
      }

      if (newConfig.selectedModel) {
        setSelectedModel(newConfig.selectedModel);
        try {
          if (apiKey)
            ModelSelectionService.setManualModel(
              apiKey,
              newConfig.selectedModel
            );
        } catch (e) {
          console.warn(
            "[App] Failed to set manual model (run API Test first):",
            e
          );
        }
      } else if (newConfig.selectionMode === "auto") {
        try {
          if (apiKey) ModelSelectionService.clearManualSelection(apiKey);
        } catch (e) {
          // Best-effort only
        }
      }

      try {
        localStorage.setItem("gstudio_ai_config", JSON.stringify(newConfig));
        // legacy key (some parts still read this)
        localStorage.setItem("ai_config", JSON.stringify(newConfig));
        // So Vcode (ConversationalCodeInterface) and any consumer of gemini_api_key see the key
        if (newConfig.apiKey?.trim()) {
          localStorage.setItem(
            "gemini_api_key",
            String(newConfig.apiKey).trim()
          );
        }
      } catch (e) {
        console.warn("Failed to save AI config:", e);
      }
    },
    [agentConfig, setAgentConfig]
  );

  // ==================== PROJECT STATE ====================

  const [projectState, setProjectState] = useState<ProjectState>({
    name: "G Studio Project",
    description: "",
    files: [],
    structure: {},
    technologies: [],
    status: "planning",
  });

  // ==================== MODAL STATES ====================

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activeAgentTab, setActiveAgentTab] = useState<
    "connection" | "voice" | "identity"
  >("connection");
  const [isCodeIntelligenceOpen, setIsCodeIntelligenceOpen] = useState(false);
  const [codeIntelligenceAPI, setCodeIntelligenceAPI] = useState<any>(null);
  const [isSpeechTestOpen, setIsSpeechTestOpen] = useState(false);
  const [showAgentCollaboration, setShowAgentCollaboration] = useState(false);
  const [isAISettingsHubOpen, setIsAISettingsHubOpen] = useState(false);
  const [isGeminiTesterOpen, setIsGeminiTesterOpen] = useState(false);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const [showContextViewer, setShowContextViewer] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [mcpToolModal, setMcpToolModal] = useState<{
    isOpen: boolean;
    tool: string;
  }>({
    isOpen: false,
    tool: "",
  });

  // ==================== RIBBON MODALS ====================

  const [ribbonModals, setRibbonModals] = useState({
    projectStructure: false,
    toolHistory: false,
    toolChains: false,
    toolManager: false,
    codeMetrics: false,
    toolUsageAnalytics: false,
  });

  // Ribbon modal data
  const [toolExecutionHistory, setToolExecutionHistory] = useState<
    Array<{
      tool: string;
      timestamp: Date;
      success: boolean;
    }>
  >([]);

  const [toolChains, setToolChains] = useState<string[][]>([]);

  const [customTools, setCustomTools] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
    }>
  >([]);

  const [editingTool, setEditingTool] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  const [newToolName, setNewToolName] = useState("");
  const [newToolDescription, setNewToolDescription] = useState("");

  const [codeMetrics, setCodeMetrics] = useState<{
    complexity: string;
    maintainability: string;
    testCoverage: string;
    securityScore: string;
  } | null>(null);

  const [toolUsage, setToolUsage] = useState<Record<string, number>>({});

  // ==================== TTS (assistant voice output) ====================
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!aiConfig.ttsEnabled || !aiConfig.autoSpeak) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isLoading) return; // only speak when response is finished

    const lastModelMsg = [...messages]
      .reverse()
      .find(
        (m) =>
          (m.role === "model" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0 &&
          !m.isError &&
          !m.isLoading
      );
    if (!lastModelMsg) return;
    if (lastSpokenMessageIdRef.current === lastModelMsg.id) return;

    const text = lastModelMsg.content.trim();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = aiConfig.language || "en-US";
    utter.rate = aiConfig.ttsRate ?? 1.0;
    utter.pitch = aiConfig.ttsPitch ?? 1.0;
    utter.volume = aiConfig.ttsVolume ?? 1.0;

    // Pick a voice if configured
    try {
      const voices = speechSynthesis.getVoices();
      const byName = aiConfig.ttsVoice
        ? voices.find((v) => v.name === aiConfig.ttsVoice)
        : undefined;
      const byLang = voices.find((v) =>
        (v.lang || "")
          .toLowerCase()
          .startsWith((utter.lang || "").toLowerCase())
      );
      utter.voice = byName || byLang || null;
    } catch {
      // ignore
    }

    // Avoid overlap
    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
      lastSpokenMessageIdRef.current = lastModelMsg.id;
    } catch {
      // ignore
    }
  }, [
    aiConfig.ttsEnabled,
    aiConfig.autoSpeak,
    aiConfig.language,
    aiConfig.ttsVoice,
    aiConfig.ttsRate,
    aiConfig.ttsPitch,
    aiConfig.ttsVolume,
    isLoading,
    messages,
  ]);

  // ==================== THEME STATE ====================

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return (
        (localStorage.getItem("gstudio-theme") as "dark" | "light") || "dark"
      );
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("gstudio-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch (e) {
      console.warn("Failed to save theme:", e);
    }
  }, [theme]);

  // ==================== CONVERSATION MANAGEMENT ====================

  // Temporarily disabled to prevent infinite loops - needs fix
  const currentConversation = null; // useCurrentConversation();
  const conversationActions = null; // useConversationActions();
  const currentConversationId = null; // useConversationStore(state => state.currentConversationId);

  // ==================== STARTUP API KEY CHECK ====================
  // Show at most once per session (module-level survives Strict Mode remounts)
  useEffect(() => {
    if ((window as any).__gstudio_startup_api_key_toast_shown) return;
    (window as any).__gstudio_startup_api_key_toast_shown = true;
    const apiKeyMessage =
      "Please set your API key in Settings to use the AI assistant";
    if (!agentConfig.apiKey || agentConfig.apiKey.trim() === "") {
      notificationManager.removeByMessage("warning", apiKeyMessage);
      showWarning(apiKeyMessage);
    } else {
      showInfo("API key loaded. Ready to chat!");
    }
  }, []);

  // ==================== API VALIDATION ====================
  // Validate key when it changes but do NOT show success/warning toasts on every change (reduces noise)
  useEffect(() => {
    if (!agentConfig.apiKey) return;
    const timeoutId = setTimeout(async () => {
      try {
        await GeminiService.validateApiKey(agentConfig.apiKey);
        // Do not toast on success - user would get spammed when key loads from storage
      } catch (error: any) {
        console.error("[App] API validation error:", error);
        showError(`Validation failed: ${error.message}`);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [agentConfig.apiKey]);

  // ==================== MESSAGE HANDLING ====================

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      // Check API key FIRST
      if (!agentConfig.apiKey) {
        showError("Please set your API key in Settings first");
        setIsAgentModalOpen(true);
        return;
      }

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: userMessage.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Create AI response placeholder
      const aiMsgId = generateId();
      const aiMsg: Message = {
        id: aiMsgId,
        role: "model",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      try {
        // Build simple context
        let contextText = "";
        const active = activeFileRef.current;
        const currentFiles = filesRef.current;
        const currentOpenFiles = openFilesRef.current;

        if (active && currentFiles[active]) {
          const file = currentFiles[active];
          const preview = file.content.substring(0, 1000);
          contextText = `\n\nCurrent file: ${active}\n\`\`\`${file.language || "text"}\n${preview}${file.content.length > 1000 ? "\n...(truncated)" : ""}\n\`\`\`\n\n`;
        }

        // Include a tiny open-files hint (helps model choose correct context)
        if (currentOpenFiles?.length) {
          const openList = currentOpenFiles.slice(0, 12).join(", ");
          contextText += `Open files: ${openList}${currentOpenFiles.length > 12 ? ", ..." : ""}\n`;
        }

        // Get last 10 messages for history (ensure current user message is included)
        const historyMessages = [...messages.slice(-10), userMsg];

        // Match response language to user: Persian in → Persian out, English in → English out
        const hasPersian = /[\u0600-\u06FF]/.test(userMessage);
        const systemInstruction =
          "Always respond in the same language as the user's last message. " +
          (hasPersian
            ? "If the user wrote in Persian (Farsi), respond only in Persian. Do not mix English and Persian in one reply."
            : "If the user wrote in English, respond only in English.");

        // CORRECT API CALL - matches actual GeminiService signature (requestId required by this codebase)
        const requestId = generateId();
        console.log("[Trace] handleSend → GeminiService.streamChat", {
          requestId,
          model: selectedModel,
          apiKeySet: !!agentConfig.apiKey,
        });
        const stream = GeminiService.streamChat(
          selectedModel as ModelId, // modelId
          historyMessages, // history
          userMessage + contextText, // newPrompt
          undefined, // image
          systemInstruction, // so responses match user language (Persian/English)
          agentConfig.apiKey, // apiKey
          true,
          true,
          false,
          requestId
        );

        let fullResponse = "";
        let totalTokens = 0;
        let toolCallsSeen: ToolCall[] = [];
        let toolResultsSeen: ToolResult[] = [];

        const toolCallbacks = {
          setFiles,
          setOpenFiles,
          setActiveFile,
          getActiveFile: () => activeFileRef.current,
          getOpenFiles: () => openFilesRef.current,
          getSelectedModel: () => selectedModel,
          getTokenUsage: () => tokenUsage,
        };

        // Process stream
        for await (const chunk of stream) {
          if (chunk.text) {
            fullResponse += chunk.text;

            // Update in real-time
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, content: fullResponse } : msg
              )
            );
          }

          if (chunk.usage) {
            totalTokens = chunk.usage.totalTokenCount || 0;
          }

          // MCP tool calls (function-calling style). Execute and attach results to message.
          if (chunk.toolCalls && chunk.toolCalls.length > 0) {
            toolCallsSeen = [...toolCallsSeen, ...chunk.toolCalls];

            // Attach tool calls to the AI message for UI display
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, toolCalls: toolCallsSeen } : msg
              )
            );

            for (const call of chunk.toolCalls) {
              const args =
                (call.arguments as Record<string, unknown> | undefined) ??
                (call.args as Record<string, unknown> | undefined) ??
                {};

              try {
                const result = await McpService.executeTool(
                  call.name,
                  args as Record<string, any>,
                  filesRef.current,
                  toolCallbacks as any
                );

                const toolResult: ToolResult = {
                  toolCallId: call.id,
                  name: call.name,
                  result,
                  error: result.success
                    ? undefined
                    : result.error || result.message,
                };
                toolResultsSeen = [...toolResultsSeen, toolResult];

                // Update tool analytics
                setToolExecutionHistory((prev) => [
                  ...prev,
                  {
                    tool: call.name,
                    timestamp: new Date(),
                    success: Boolean(result.success),
                  },
                ]);
                setToolUsage((prev) => ({
                  ...prev,
                  [call.name]: (prev[call.name] || 0) + 1,
                }));

                // Attach tool results to the AI message for UI display
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId
                      ? { ...msg, toolResults: toolResultsSeen }
                      : msg
                  )
                );
              } catch (e: any) {
                const toolResult: ToolResult = {
                  toolCallId: call.id,
                  name: call.name,
                  result: null,
                  error: e?.message || "Tool execution failed",
                };
                toolResultsSeen = [...toolResultsSeen, toolResult];
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId
                      ? { ...msg, toolResults: toolResultsSeen }
                      : msg
                  )
                );
              }
            }
          }
        }

        // If tools ran, do a bounded follow-up call so the model can incorporate results.
        // NOTE: GeminiService history forbids "function/tool" roles, so we pass tool results via newPrompt.
        if (toolCallsSeen.length > 0 && toolResultsSeen.length > 0) {
          const summarize = (value: unknown, maxLen: number) => {
            try {
              const s =
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 0);
              if (!s) return "";
              return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
            } catch {
              return "";
            }
          };

          const toolResultsText = toolCallsSeen
            .map((call) => {
              const res = toolResultsSeen.find((r) => r.toolCallId === call.id);
              const argsSummary = summarize(
                call.arguments ?? call.args ?? {},
                400
              );
              const resultSummary = summarize(res?.result, 1200);
              const errorSummary = res?.error ? summarize(res.error, 300) : "";
              return [
                `- tool: ${call.name}`,
                argsSummary ? `  args: ${argsSummary}` : "",
                errorSummary
                  ? `  error: ${errorSummary}`
                  : `  result: ${resultSummary || "(no result)"}`,
              ]
                .filter(Boolean)
                .join("\n");
            })
            .join("\n\n");

          const followupPrompt =
            `${userMessage}${contextText}\n\n` +
            `The following tool calls were executed. Use their results to respond with the final answer.\n\n` +
            `${toolResultsText}\n\n` +
            `Now write the final response to the user.`;

          const followRequestId = generateId();
          const followStream = GeminiService.streamChat(
            selectedModel as ModelId,
            historyMessages,
            followupPrompt,
            undefined,
            undefined,
            agentConfig.apiKey,
            true,
            true,
            false,
            followRequestId
          );

          // Separate with a divider if we already streamed any text
          if (fullResponse.trim().length > 0) {
            fullResponse += "\n\n";
          }

          for await (const chunk of followStream) {
            if (chunk.text) {
              fullResponse += chunk.text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, content: fullResponse } : msg
                )
              );
            }
            if (chunk.usage) {
              totalTokens =
                Math.max(totalTokens, chunk.usage.totalTokenCount || 0) ||
                totalTokens;
            }
          }
        }

        // Update token usage (simple calculation)
        if (totalTokens > 0) {
          setTokenUsage((prev) => ({
            prompt: prev.prompt + Math.floor(totalTokens * 0.3),
            response: prev.response + Math.floor(totalTokens * 0.7),
          }));
        }

        showSuccess("Response received");
      } catch (error: any) {
        console.error("[handleSend] Error:", error);

        // Remove empty AI message
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMsgId));

        // Prefer user-facing message for FatalAIError (e.g. rate limit)
        const displayMsg =
          (error?.userMessage as string) ||
          error?.message ||
          "Failed to get AI response";
        showError(displayMsg);

        // Rate limit: friendly message only (API key is valid)
        const isRateLimit = error?.code === "PROVIDER_RATE_LIMITED";
        const errorChatContent = isRateLimit
          ? `⏳ ${displayMsg}\n\nYou can try again in a minute.`
          : `❌ Error: ${displayMsg}\n\nPlease check:\n1. API key is set in Settings\n2. Internet connection is working\n3. API key is valid`;

        const errorChatMsg: Message = {
          id: generateId(),
          role: "model",
          content: errorChatContent,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorChatMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      setMessages,
      isLoading,
      setIsLoading,
      agentConfig.apiKey,
      selectedModel,
      setTokenUsage,
      setIsAgentModalOpen,
    ]
  );

  // ==================== FILE OPERATIONS ====================

  /**
   * Create new file
   */
  const handleNewFile = useCallback(() => {
    const name = prompt("Enter file name:", "untitled.ts");
    if (!name) return;

    const extension = name.split(".").pop() || "txt";
    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
    };

    const language = languageMap[extension] || "plaintext";

    setFiles((prev) => ({
      ...prev,
      [name]: {
        name,
        language,
        content: "",
        path: name,
        lastModified: new Date(),
      },
    }));

    setOpenFiles((prev) => [...prev, name]);
    setActiveFile(name);
    showSuccess(`Created ${name}`);
  }, [setFiles, setOpenFiles, setActiveFile]);

  /**
   * Create new folder
   */
  const handleNewFolder = useCallback(() => {
    const name = prompt("Enter folder name:");
    if (!name) return;

    const folderFile = `${name}/.gitkeep`;
    setFiles((prev) => ({
      ...prev,
      [folderFile]: {
        name: ".gitkeep",
        language: "plaintext",
        content: "",
        path: folderFile,
        lastModified: new Date(),
      },
    }));

    showSuccess(`Created folder ${name}`);
  }, [setFiles]);

  /**
   * Load demo project
   */
  const handleLoadDemo = useCallback(() => {
    setFiles(DEMO_PROJECT);
    setOpenFiles(["index.html"]);
    setActiveFile("index.html");
    showSuccess("Demo project loaded successfully!");
  }, [setFiles, setOpenFiles, setActiveFile]);

  /**
   * Import project from folder
   */
  const handleImportProject = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.webkitdirectory = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newFiles: Record<string, FileData> = {};
      let importedCount = 0;

      for (const file of Array.from(files)) {
        try {
          const content = await file.text();
          const ext = file.name.split(".").pop() || "";
          const languageMap: Record<string, string> = {
            ts: "typescript",
            tsx: "typescript",
            js: "javascript",
            jsx: "javascript",
            html: "html",
            css: "css",
            json: "json",
            md: "markdown",
          };

          const language = languageMap[ext] || "plaintext";

          newFiles[file.webkitRelativePath || file.name] = {
            name: file.name,
            language,
            content,
            path: file.webkitRelativePath || file.name,
            lastModified: new Date((file as any).lastModified || Date.now()),
          };

          importedCount++;
        } catch (error) {
          console.warn(`Failed to import ${file.name}:`, error);
        }
      }

      setFiles((prev) => ({ ...prev, ...newFiles }));
      showSuccess(`Imported ${importedCount} files successfully`);
    };

    input.click();
  }, [setFiles]);

  /**
   * Format active file code
   */
  const handleFormat = useCallback(async () => {
    if (!activeFile || !files[activeFile]) {
      showWarning("No active file to format");
      return;
    }

    const file = files[activeFile];
    const language = file.language;

    try {
      let formatted = file.content;

      // Format based on language
      if (["javascript", "typescript", "jsx", "tsx"].includes(language)) {
        formatted = await prettier.format(file.content, {
          parser: "babel",
          plugins: [parserBabel, parserEstree],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          printWidth: 100,
        });
      } else if (language === "markdown") {
        formatted = await prettier.format(file.content, {
          parser: "markdown",
          plugins: [parserMarkdown],
          printWidth: 80,
        });
      }

      setFiles((prev) => ({
        ...prev,
        [activeFile]: { ...prev[activeFile], content: formatted },
      }));

      showSuccess("Code formatted successfully");
    } catch (error: any) {
      console.error("Format error:", error);
      showError(`Format failed: ${error.message}`);
    }
  }, [activeFile, files, setFiles]);

  /**
   * Save active file
   */
  const handleSave = useCallback(() => {
    if (!activeFile) {
      showWarning("No active file to save");
      return;
    }

    // Save to localStorage as backup
    try {
      localStorage.setItem("gstudio_files", JSON.stringify(files));
      showSuccess(`Saved ${activeFile}`);
    } catch (e) {
      console.error("Save error:", e);
      showError("Failed to save file");
    }
  }, [activeFile, files]);

  /**
   * Delete file
   */
  const handleDeleteFile = useCallback(
    (fileName: string) => {
      setFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fileName];
        return newFiles;
      });

      setOpenFiles((prev) => prev.filter((f) => f !== fileName));

      if (activeFile === fileName) {
        const remainingFiles = Object.keys(files).filter((f) => f !== fileName);
        setActiveFile(remainingFiles[0] || null);
      }

      showSuccess(`Deleted ${fileName}`);
    },
    [files, activeFile, setFiles, setOpenFiles, setActiveFile]
  );

  /**
   * Rename file
   */
  const handleRenameFile = useCallback(
    (oldName: string) => {
      const newName = prompt("Enter new name:", oldName);
      if (!newName || newName === oldName) return;

      if (files[newName]) {
        showError("File already exists");
        return;
      }

      setFiles((prev) => {
        const newFiles = { ...prev };
        newFiles[newName] = { ...prev[oldName], name: newName };
        delete newFiles[oldName];
        return newFiles;
      });

      setOpenFiles((prev) => prev.map((f) => (f === oldName ? newName : f)));

      if (activeFile === oldName) {
        setActiveFile(newName);
      }

      showSuccess(`Renamed to ${newName}`);
    },
    [files, activeFile, setFiles, setOpenFiles, setActiveFile]
  );

  /** Rename item (oldPath, newName) for v2 Sidebar */
  const handleRenameItem = useCallback(
    (oldPath: string, newName: string) => {
      if (!newName.trim() || newName === oldPath) return;
      const trimmed = newName.trim();
      if (files[trimmed]) {
        showError("File already exists");
        return;
      }
      setFiles((prev) => {
        const next = { ...prev };
        next[trimmed] = { ...prev[oldPath], name: trimmed };
        delete next[oldPath];
        return next;
      });
      setOpenFiles((prev) => prev.map((f) => (f === oldPath ? trimmed : f)));
      if (activeFile === oldPath) setActiveFile(trimmed);
      showSuccess(`Renamed to ${trimmed}`);
    },
    [files, activeFile, setFiles, setOpenFiles, setActiveFile]
  );

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            handleSave();
            break;
          case "n":
            e.preventDefault();
            handleNewFile();
            break;
          case "f":
            if (e.shiftKey) {
              e.preventDefault();
              handleFormat();
            }
            break;
          case "b":
            e.preventDefault();
            setSidebarVisible((prev) => !prev);
            break;
          case "p":
            if (e.shiftKey) {
              e.preventDefault();
              setPreviewVisible((prev) => !prev);
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSave,
    handleNewFile,
    handleFormat,
    setSidebarVisible,
    setPreviewVisible,
  ]);

  // ==================== AUTO-SAVE ====================

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      try {
        localStorage.setItem("gstudio_files", JSON.stringify(files));
        localStorage.setItem("gstudio_messages", JSON.stringify(messages));
      } catch (e) {
        console.warn("Auto-save failed:", e);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [files, messages]);

  // ==================== LOAD SAVED STATE ====================

  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem("gstudio_files");
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        if (Object.keys(parsed).length > 0) {
          setFiles(parsed);
          const firstFile = Object.keys(parsed)[0];
          setOpenFiles([firstFile]);
          setActiveFile(firstFile);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved files:", e);
    }
  }, []);

  // ==================== ENSURE UI PANELS VISIBILITY ====================

  /**
   * ✅ FIX #3 & #4: Ensure chat is always visible on mount
   * Using proper state setters instead of non-existent store methods
   */
  useEffect(() => {
    setChatVisible(true);
  }, [setChatVisible]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setTokenUsage({ prompt: 0, response: 0 });
  }, [setMessages, setTokenUsage]);

  const handleTriggerTool = useCallback((action: string) => {
    setMcpToolModal({ isOpen: true, tool: action });
  }, []);

  // ==================== RIBBON MODAL HANDLERS ====================

  const handleRibbonModalToggle = useCallback(
    (modalName: keyof typeof ribbonModals) => {
      setRibbonModals((prev) => ({
        ...prev,
        [modalName]: !prev[modalName],
      }));
    },
    []
  );

  // ==================== RENDER ====================

  return (
    <ErrorBoundary>
      <div
        className={`app-container ${theme} flex flex-col min-h-full`}
        data-theme={theme}
      >
        {/* Notification Toast */}
        <NotificationToast />

        {/* Top Ribbon */}
        <Ribbon
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onLoadDemo={handleLoadDemo}
          onImportProject={handleImportProject}
          onSaveFile={handleSave}
          onFormat={handleFormat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
          onOpenAISettings={() => setIsAISettingsHubOpen(true)}
          onOpenCodeIntelligence={() => setIsCodeIntelligenceOpen(true)}
          onOpenAISettingsHub={() => setIsAISettingsHubOpen(true)}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onManageApiKey={() => setIsAgentModalOpen(true)}
          agentConfig={agentConfig}
          onRunMcpTool={handleTriggerTool}
          onChangeVoice={() => setIsAgentModalOpen(true)}
          onChangePersonality={() => setIsAgentModalOpen(true)}
          onToggleProjectStructure={() =>
            handleRibbonModalToggle("projectStructure")
          }
          onToggleToolHistory={() => handleRibbonModalToggle("toolHistory")}
          onToggleToolChains={() => handleRibbonModalToggle("toolChains")}
          onToggleToolManager={() => handleRibbonModalToggle("toolManager")}
          onToggleCodeMetrics={() => handleRibbonModalToggle("codeMetrics")}
          onToggleToolAnalytics={() =>
            handleRibbonModalToggle("toolUsageAnalytics")
          }
          theme={theme}
          isDarkMode={theme === "dark"}
          onToggleTheme={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
          onClearChat={handleClearChat}
          onTriggerTool={handleTriggerTool}
          chatVisible={chatVisible}
          onToggleChat={() => setChatVisible((prev) => !prev)}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
          inspectorVisible={inspectorVisible}
          previewVisible={previewVisible}
          monitorVisible={monitorVisible}
          onToggleInspector={() => setInspectorVisible((prev) => !prev)}
          onTogglePreview={() => setPreviewVisible((prev) => !prev)}
          onToggleMonitor={() => setMonitorVisible((prev) => !prev)}
          vcodeVisible={vcodeVisible}
          onToggleVcode={() => {
            setVcodeVisible((prev) => {
              if (!prev) {
                setChatVisible(false);
                setPreviewVisible(false);
                setInspectorVisible(false);
                setMonitorVisible(false);
              }
              return !prev;
            });
          }}
        />

        {/* Main Content Area - v2 layout: flex-1 flex overflow-hidden */}
        <div className="main-content-area flex-1 flex overflow-hidden">
          {/* Left Sidebar - always rendered (activity bar + drawer); v2 props */}
          <Sidebar
            files={files}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            onClearChat={handleClearChat}
            onFileSelect={setActiveFile}
            selectedFile={activeFile}
            onCreateFile={handleNewFile}
            onDeleteFile={handleDeleteFile}
            onRenameItem={handleRenameItem}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAISettingsHub={() => setIsAISettingsHubOpen(true)}
            onLoadProject={handleLoadDemo}
            onTriggerTool={handleTriggerTool}
            onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
            sidebarVisible={sidebarVisible}
          />

          {/* Center: Editor + Chat panel at bottom (v2) */}
          <div className="center-panel flex-1 flex flex-col min-w-0">
            {/* Editor Tabs */}
            {openFiles.length > 0 && (
              <EditorTabs
                openFiles={openFiles}
                activeFile={activeFile}
                onFileSelect={setActiveFile}
                onFileClose={(fileName) => {
                  setOpenFiles((prev) => prev.filter((f) => f !== fileName));
                  if (activeFile === fileName) {
                    const remaining = openFiles.filter((f) => f !== fileName);
                    setActiveFile(remaining[0] || null);
                  }
                }}
              />
            )}

            {/* Editor only in center; chat and preview live in right panel */}
            {editorVisible && activeFile && files[activeFile] ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodeEditor
                  file={files[activeFile]}
                  onChange={(content) => {
                    setFiles((prev) => ({
                      ...prev,
                      [activeFile]: { ...prev[activeFile], content },
                    }));
                  }}
                  minimapEnabled={minimapEnabled}
                  theme={theme}
                />
              </div>
            ) : editorVisible ? (
              <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/50">
                <div className="text-center space-y-5 px-6 max-w-sm">
                  <div className="w-16 h-16 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto">
                    <Code2
                      className="w-8 h-8 text-slate-500"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-200">
                      No file open
                    </p>
                    <p className="text-sm text-slate-500">
                      Select a file from the Explorer or create a new one.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right panel container – chat wider for more space */}
          {(chatVisible ||
            previewVisible ||
            inspectorVisible ||
            monitorVisible ||
            vcodeVisible) && (
            <div
              className={`flex flex-col border-l mr-12 transition-all duration-200 ${
                chatVisible
                  ? "w-[360px] min-w-[360px] bg-slate-900/80 backdrop-blur-md border-slate-800/30"
                  : "w-[32%] max-w-[420px] min-w-[280px] border-slate-800/60"
              }`}
              style={{
                ...(!chatVisible && {
                  background: "var(--bg-secondary)",
                  borderColor: "var(--color-border)",
                }),
              }}
            >
              {chatVisible && (
                <div className="chat-panel flex flex-col flex-1 min-h-0 w-full bg-slate-900 border-l border-slate-800/30 transition-all duration-200 relative">
                  {/* Chat header – same height as left sidebar, subtle action buttons */}
                  <header className="shrink-0 border-b border-slate-800/60 bg-slate-950">
                    <div className="h-[52px] px-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-slate-800/80 flex items-center justify-center ring-1 ring-slate-700/50 flex-shrink-0">
                          <Sparkles
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5 text-purple-400"
                          />
                        </div>
                        <div className="min-w-0">
                          <h2
                            className="text-sm font-semibold text-slate-100 truncate"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Conversation
                          </h2>
                          <p
                            className="text-[10px] text-slate-500 truncate"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Gemini
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={handleNewConversation}
                          aria-label="New conversation"
                          title="New conversation"
                          className="p-2 rounded-lg hover:bg-slate-800/50 hover:text-purple-400 text-slate-400 transition-all duration-200 border border-transparent"
                        >
                          <Plus
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          />
                        </button>
                        <button
                          onClick={() => setConfirmClearChatOpen(true)}
                          aria-label="Delete conversation"
                          title="Delete conversation"
                          className="p-2 rounded-lg hover:bg-slate-800/50 hover:text-purple-400 text-slate-400 transition-all duration-200 border border-transparent"
                        >
                          <Trash2
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          />
                        </button>
                        <button
                          onClick={() => setChatHistoryOpen(true)}
                          aria-label="Open chat history"
                          title="Chat history"
                          className="p-2 rounded-lg hover:bg-slate-800/50 hover:text-purple-400 text-slate-400 transition-all duration-200 border border-transparent"
                        >
                          <History
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          />
                        </button>
                        <button
                          onClick={() => setChatVisible(false)}
                          aria-label="Close assistant panel"
                          className="p-2 rounded-lg hover:bg-slate-800 hover:text-slate-200 text-slate-400 transition-all duration-200 border border-transparent"
                        >
                          <X
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          />
                        </button>
                      </div>
                    </div>
                    <div
                      className="px-3 py-1 flex items-center gap-3 text-[10px] text-slate-500 border-t border-slate-800/40"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Prompt</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {tokenUsage.prompt.toLocaleString()}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Response</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {tokenUsage.response.toLocaleString()}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-400">
                        <span className="text-slate-500">Total</span>
                        <span className="font-mono text-slate-300 tabular-nums">
                          {(
                            tokenUsage.prompt + tokenUsage.response
                          ).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </header>
                  {/* Message list only visible when History is open */}
                  {chatHistoryOpen && (
                    <div
                      className="absolute left-0 right-0 z-10 flex flex-col bg-slate-950 animate-[fadeIn_0.2s_ease-out] border-b border-slate-800/60"
                      style={{ top: "76px", bottom: "120px" }}
                    >
                      <div className="h-9 border-b border-slate-800/60 flex items-center justify-between px-3 bg-slate-950 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <History
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5 text-purple-400 flex-shrink-0"
                          />
                          <span
                            className="text-[11px] font-semibold text-slate-200 truncate"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Chat history
                          </span>
                        </div>
                        <button
                          onClick={() => setChatHistoryOpen(false)}
                          aria-label="Close history"
                          className="p-1.5 hover:bg-slate-800/80 rounded-md transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
                        >
                          <X
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </div>
                      <div
                        ref={chatHistoryScrollRef}
                        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth px-3 py-3 no-scrollbar"
                      >
                        <MessageListVirtualized
                          messages={messages}
                          isLoading={isLoading}
                        />
                      </div>
                    </div>
                  )}
                  {/* Conversation in main area when history closed – show messages after chat with AI */}
                  {!chatHistoryOpen && (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div
                        ref={chatHistoryScrollRef}
                        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth px-3 py-3 no-scrollbar"
                      >
                        {messages.length === 0 && !isLoading && (
                          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                            <div className="w-11 h-11 rounded-xl bg-slate-800/80 flex items-center justify-center mb-3 ring-1 ring-slate-700/50">
                              <Sparkles
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5 text-purple-400"
                              />
                            </div>
                            <p
                              className="text-[12px] font-medium text-slate-300 mb-1"
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              Start a conversation
                            </p>
                            <p
                              className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed"
                              style={{
                                fontFamily: "var(--font-sans)",
                                lineHeight: 1.5,
                              }}
                            >
                              Send a message below. Replies appear here.
                            </p>
                          </div>
                        )}
                        {messages.length > 0 && (
                          <div className="space-y-3 pb-3">
                            {messages.map((msg) => (
                              <MessageItem key={msg.id} message={msg} />
                            ))}
                            {isLoading && (
                              <div
                                className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400"
                                style={{ fontFamily: "var(--font-sans)" }}
                              >
                                <span className="flex gap-0.5">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                    style={{ animationDelay: "0ms" }}
                                  />
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                    style={{ animationDelay: "150ms" }}
                                  />
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                    style={{ animationDelay: "300ms" }}
                                  />
                                </span>
                                <span className="text-[11px]">Typing…</span>
                              </div>
                            )}
                          </div>
                        )}
                        {messages.length === 0 && isLoading && (
                          <div
                            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <span className="flex gap-0.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              />
                            </span>
                            <span className="text-[11px]">Typing…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Input – compact footer, same tone as sidebar */}
                  <div className="shrink-0 border-t border-slate-800/60 bg-slate-950 px-2 py-2 transition-colors duration-200">
                    <InputArea
                      onSend={handleSend}
                      isLoading={isLoading}
                      disabled={!agentConfig.apiKey} // disables text send; mic is handled inside InputArea
                      isListening={aiConfig.voiceEnabled ? isListening : false}
                      onListeningChange={
                        aiConfig.voiceEnabled ? setIsListening : () => {}
                      }
                      language={aiConfig.language}
                      voiceCommandMode={Boolean(aiConfig.autoSend)}
                      placeholder={
                        agentConfig.apiKey
                          ? "Type your message... (Shift+Enter for new line)"
                          : "⚠️ Please set your API key in Settings first"
                      }
                    />
                  </div>
                </div>
              )}
              {!chatVisible && previewVisible && (
                <PreviewPanel
                  files={files}
                  activeFile={activeFile}
                  errors={previewErrors}
                  onErrorsChange={setPreviewErrors}
                />
              )}
              {!chatVisible && !previewVisible && inspectorVisible && (
                <InspectorPanel
                  activeFile={activeFile}
                  files={files}
                  onClose={() => setInspectorVisible(false)}
                />
              )}
              {!chatVisible &&
                !previewVisible &&
                !inspectorVisible &&
                monitorVisible && (
                  <MonitorPanel
                    tokenUsage={tokenUsage}
                    onClose={() => setMonitorVisible(false)}
                  />
                )}
              {!chatVisible &&
                !previewVisible &&
                !inspectorVisible &&
                !monitorVisible &&
                vcodeVisible && (
                  <div className="vcode-panel flex flex-col flex-1 min-h-0 w-full bg-slate-900 border-l border-slate-800/30">
                    <header className="shrink-0 border-b border-slate-800/60 bg-slate-950 flex items-center justify-between px-4 h-[52px]">
                      <span className="text-sm font-semibold text-slate-100">
                        Vcode – Speak to Write Code
                      </span>
                      <button
                        onClick={() => setVcodeVisible(false)}
                        aria-label="Close Vcode panel"
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <X className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </header>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <IntegratedConversationalIDE
                        initialApiKey={agentConfig.apiKey?.trim() || undefined}
                      />
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Right Activity Bar - v2 full props */}
          <RightActivityBar
            chatVisible={chatVisible}
            previewVisible={previewVisible}
            inspectorVisible={inspectorVisible}
            monitorVisible={monitorVisible}
            vcodeVisible={vcodeVisible}
            onToggleChat={() => setChatVisible((prev) => !prev)}
            onTogglePreview={() => setPreviewVisible((prev) => !prev)}
            onToggleInspector={() => setInspectorVisible((prev) => !prev)}
            onToggleMonitor={() => setMonitorVisible((prev) => !prev)}
            onToggleVcode={() => setVcodeVisible((prev) => !prev)}
            onClosePreview={() => setPreviewVisible(false)}
            onCloseInspector={() => setInspectorVisible(false)}
            onCloseMonitor={() => setMonitorVisible(false)}
            onCloseVcode={() => setVcodeVisible(false)}
          />
        </div>

        {/* ==================== MODALS ==================== */}

        {/* Settings Modal */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {isSettingsOpen && (
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              theme={theme}
              onThemeChange={setTheme}
            />
          )}
        </React.Suspense>

        {/* Agent Modal */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {isAgentModalOpen && (
            <AgentModal
              isOpen={isAgentModalOpen}
              onClose={() => setIsAgentModalOpen(false)}
              config={agentConfig}
              onSave={setAgentConfig}
              activeTab={activeAgentTab}
              onTabChange={setActiveAgentTab}
            />
          )}
        </React.Suspense>

        {/* AI Settings Hub */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {isAISettingsHubOpen && (
            <AISettingsHub
              isOpen={isAISettingsHubOpen}
              onClose={() => setIsAISettingsHubOpen(false)}
              config={aiConfig}
              onSave={handleSaveAIConfig}
            />
          )}
        </React.Suspense>

        {/* Code Intelligence Dashboard */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {isCodeIntelligenceOpen && (
            <CodeIntelligenceDashboard
              isOpen={isCodeIntelligenceOpen}
              onClose={() => setIsCodeIntelligenceOpen(false)}
              files={files}
              activeFile={activeFile}
              onAPIReady={setCodeIntelligenceAPI}
            />
          )}
        </React.Suspense>

        {/* Gemini Tester */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {isGeminiTesterOpen && (
            <GeminiTesterPro
              isOpen={isGeminiTesterOpen}
              onClose={() => setIsGeminiTesterOpen(false)}
            />
          )}
        </React.Suspense>

        {/* MCP Tool Modal */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {mcpToolModal.isOpen && (
            <McpToolModal
              isOpen={mcpToolModal.isOpen}
              onClose={() => setMcpToolModal({ isOpen: false, tool: "" })}
              tool={mcpToolModal.tool}
            />
          )}
        </React.Suspense>

        {/* Speech Test */}
        {isSpeechTestOpen && (
          <SpeechTest
            isOpen={isSpeechTestOpen}
            onClose={() => setIsSpeechTestOpen(false)}
          />
        )}

        {/* Confirm clear conversation */}
        <ConfirmDialog
          isOpen={confirmClearChatOpen}
          title="Delete conversation"
          message="Clear all messages in this conversation? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleClearConversation}
          onCancel={() => setConfirmClearChatOpen(false)}
        />

        {/* Agent Collaboration */}
        {showAgentCollaboration && (
          <AgentCollaboration
            isOpen={showAgentCollaboration}
            onClose={() => setShowAgentCollaboration(false)}
          />
        )}

        {/* Conversation List */}
        {isConversationListOpen && (
          <ConversationList
            isOpen={isConversationListOpen}
            onClose={() => setIsConversationListOpen(false)}
          />
        )}

        {/* Context Viewer */}
        {showContextViewer && (
          <ContextViewer
            isOpen={showContextViewer}
            onClose={() => setShowContextViewer(false)}
          />
        )}

        {/* ==================== RIBBON MODALS ==================== */}

        {ribbonModals.projectStructure && (
          <ProjectStructureModal
            isOpen={ribbonModals.projectStructure}
            onClose={() => handleRibbonModalToggle("projectStructure")}
            files={files}
          />
        )}

        {ribbonModals.toolHistory && (
          <ToolExecutionHistoryModal
            isOpen={ribbonModals.toolHistory}
            onClose={() => handleRibbonModalToggle("toolHistory")}
            history={toolExecutionHistory}
          />
        )}

        {ribbonModals.toolChains && (
          <ToolChainsModal
            isOpen={ribbonModals.toolChains}
            onClose={() => handleRibbonModalToggle("toolChains")}
            chains={toolChains}
          />
        )}

        {ribbonModals.toolManager && (
          <ToolManagerModal
            isOpen={ribbonModals.toolManager}
            onClose={() => handleRibbonModalToggle("toolManager")}
            tools={customTools}
            onToolAdd={(tool) => setCustomTools((prev) => [...prev, tool])}
            onToolEdit={(tool) => setEditingTool(tool)}
            onToolDelete={(id) =>
              setCustomTools((prev) => prev.filter((t) => t.id !== id))
            }
          />
        )}

        {ribbonModals.codeMetrics && (
          <CodeMetricsModal
            isOpen={ribbonModals.codeMetrics}
            onClose={() => handleRibbonModalToggle("codeMetrics")}
            metrics={codeMetrics}
            activeFile={activeFile}
            files={files}
          />
        )}

        {ribbonModals.toolUsageAnalytics && (
          <ToolUsageAnalyticsModal
            isOpen={ribbonModals.toolUsageAnalytics}
            onClose={() => handleRibbonModalToggle("toolUsageAnalytics")}
            usage={toolUsage}
          />
        )}

        {/* Multi-Agent Status */}
        <MultiAgentStatus
          agents={[]}
          onAgentClick={() => setShowAgentCollaboration(true)}
        />
      </div>

      {/* Styles */}
      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .main-content-area {
          display: flex;
          flex: 1;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .center-panel {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .chat-sidebar {
          display: flex;
          flex-direction: column;
          width: 400px;
          border-left: 1px solid var(--border-color);
          background: var(--bg-secondary);
          transition: width 0.3s ease;
        }

        .chat-sidebar.collapsed {
          width: 60px;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .chat-controls {
          display: flex;
          gap: 0.5rem;
        }

        .icon-button {
          padding: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          transition: color 0.2s;
        }

        .icon-button:hover {
          color: var(--text-primary);
        }

        .token-usage {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.875rem;
        }

        .token-stat {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
        }

        .token-stat.total {
          border-top: 1px solid var(--border-color);
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          font-weight: 600;
        }

        .preview-controls {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </ErrorBoundary>
  );
}
