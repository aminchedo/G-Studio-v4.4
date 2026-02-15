/**
 * App State Context - Global State Management
 *
 * Provides centralized state management to reduce prop drilling
 * and improve component reusability.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { FileData, Message } from "@/types/types";
import { ModelId } from "@/mcp/runtime/types";
import { useEditorState } from "@/hooks/useEditorState";
import { useChatState } from "@/hooks/useChatState";
import { useUIPanelState } from "@/hooks/useUIPanelState";
import { useAgentConfig } from "@/hooks/useAgentConfig";

// ==================== TYPES ====================

interface AppStateContextType {
  // Editor State
  files: Record<string, FileData>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, FileData>>>;
  openFiles: string[];
  setOpenFiles: React.Dispatch<React.SetStateAction<string[]>>;
  activeFile: string | null;
  setActiveFile: React.Dispatch<React.SetStateAction<string | null>>;

  // Chat State
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  tokenUsage: { prompt: number; response: number };
  setTokenUsage: React.Dispatch<
    React.SetStateAction<{ prompt: number; response: number }>
  >;

  // UI Panel State
  chatVisible: boolean;
  setChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
  chatCollapsed: boolean;
  setChatCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarVisible: boolean;
  setSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  inspectorVisible: boolean;
  setInspectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  previewVisible: boolean;
  setPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
  monitorVisible: boolean;
  setMonitorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  minimapEnabled: boolean;
  setMinimapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  editorVisible: boolean;
  setEditorVisible: React.Dispatch<React.SetStateAction<boolean>>;

  // Agent Config
  agentConfig: {
    apiKey: string;
    voice: string;
    persona: string;
    language?: string;
  };
  setAgentConfig: React.Dispatch<
    React.SetStateAction<{
      apiKey: string;
      voice: string;
      persona: string;
      language?: string;
    }>
  >;

  // Model Selection
  selectedModel: ModelId;
  setSelectedModel: React.Dispatch<React.SetStateAction<ModelId>>;

  // Theme
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;

  // Listening State
  isListening: boolean;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
}

// ==================== CONTEXT ====================

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined,
);

// ==================== PROVIDER ====================

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  // Use existing hooks
  const editorState = useEditorState();
  const chatState = useChatState();
  const uiPanelState = useUIPanelState();
  const agentConfigState = useAgentConfig();

  // Additional state
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try {
      const saved = localStorage.getItem("gstudio_selected_model");
      if (saved) {
        return saved as ModelId;
      }
    } catch (e) {
      console.error("Failed to read selected model from localStorage:", e);
    }
    return ModelId.Gemini3FlashPreview;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("gstudio_theme");
      return saved === "dark";
    } catch {
      return true;
    }
  });

  const [isListening, setIsListening] = useState(false);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AppStateContextType>(
    () => ({
      // Editor State
      ...editorState,

      // Chat State
      ...chatState,

      // UI Panel State
      ...uiPanelState,

      // Agent Config
      ...agentConfigState,

      // Model Selection
      selectedModel,
      setSelectedModel,

      // Theme
      isDarkMode,
      setIsDarkMode,

      // Listening State
      isListening,
      setIsListening,
    }),
    [
      editorState,
      chatState,
      uiPanelState,
      agentConfigState,
      selectedModel,
      isDarkMode,
      isListening,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// ==================== HOOK ====================

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};

// Alias for consistency with naming convention
export const useAppStateContext = useAppState;

// ==================== SELECTOR HOOKS ====================
// These hooks allow components to subscribe to only the state they need

export const useEditorFiles = () => {
  const {
    files,
    setFiles,
    openFiles,
    setOpenFiles,
    activeFile,
    setActiveFile,
  } = useAppState();
  return useMemo(
    () => ({
      files,
      setFiles,
      openFiles,
      setOpenFiles,
      activeFile,
      setActiveFile,
    }),
    [files, setFiles, openFiles, setOpenFiles, activeFile, setActiveFile],
  );
};

export const useChatMessages = () => {
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    tokenUsage,
    setTokenUsage,
  } = useAppState();
  return useMemo(
    () => ({
      messages,
      setMessages,
      isLoading,
      setIsLoading,
      tokenUsage,
      setTokenUsage,
    }),
    [messages, setMessages, isLoading, setIsLoading, tokenUsage, setTokenUsage],
  );
};

export const useUIPanels = () => {
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
    setEditorVisible,
  } = useAppState();

  return useMemo(
    () => ({
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
      setEditorVisible,
    }),
    [
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
      setEditorVisible,
    ],
  );
};

export const useAgent = () => {
  const { agentConfig, setAgentConfig, selectedModel, setSelectedModel } =
    useAppState();
  return useMemo(
    () => ({
      agentConfig,
      setAgentConfig,
      selectedModel,
      setSelectedModel,
    }),
    [agentConfig, setAgentConfig, selectedModel, setSelectedModel],
  );
};

export const useTheme = () => {
  const { isDarkMode, setIsDarkMode } = useAppState();

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem("gstudio_theme", newValue ? "dark" : "light");
      } catch (e) {
        console.warn("Failed to save theme preference:", e);
      }
      return newValue;
    });
  }, [setIsDarkMode]);

  return useMemo(
    () => ({
      isDarkMode,
      setIsDarkMode,
      toggleTheme,
    }),
    [isDarkMode, setIsDarkMode, toggleTheme],
  );
};

export const useVoice = () => {
  const { isListening, setIsListening } = useAppState();

  const toggleListening = useCallback(() => {
    setIsListening((prev) => !prev);
  }, [setIsListening]);

  return useMemo(
    () => ({
      isListening,
      setIsListening,
      toggleListening,
    }),
    [isListening, setIsListening, toggleListening],
  );
};
