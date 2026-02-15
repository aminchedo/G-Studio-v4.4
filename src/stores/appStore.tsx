/**
 * G Studio v2.3.0 - Main Application Store
 *
 * Centralized state management using Zustand
 * Replaces scattered useState calls in App.tsx
 *
 * MIGRATION NOTE: API lifecycle stabilization and safe voice wiring
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { persist, createJSONStorage } from "zustand/middleware";
// Import settings store to provide a compatible `settings` snapshot
import { useSettingsStore } from "./settingsStore";
import { useThemeStore } from "./themeStore";
import { ModelId } from "@/mcp/runtime/types";
import { ViewMode } from "@/types";

export interface UIState {
  // Panel visibility
  chatVisible: boolean;
  chatCollapsed: boolean;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  previewVisible: boolean;
  monitorVisible: boolean;
  editorVisible: boolean;
  bottomPanelVisible: boolean;
  minimapEnabled: boolean;

  // View mode (for root App / simple shell)
  viewMode: ViewMode;

  // Split view
  splitOrientation: "horizontal" | "vertical";
  splitRatio: number;
  useMonacoEditor: boolean;

  // Theme
  isDarkMode: boolean;
}

export interface ModalState {
  settings: boolean;
  agentModal: boolean;
  geminiTester: boolean;
  aiSettingsHub: boolean;
  conversationList: boolean;
  contextViewer: boolean;
  speechTest: boolean;
  agentCollaboration: boolean;
  agentSelector: boolean;
  codeIntelligence: boolean;
  mcpTool: { isOpen: boolean; tool: string };
  voiceChat: boolean;
  commandPalette: boolean;
  enhancedSettings: boolean;

  // Ribbon modals
  projectStructure: boolean;
  toolHistory: boolean;
  toolChains: boolean;
  toolManager: boolean;
  codeMetrics: boolean;
  toolUsageAnalytics: boolean;
}

export interface AIConfigState {
  apiKey: string;
  selectedModel: ModelId;
  selectionMode: "auto" | "manual";
  temperature: number;
  maxTokens: number;
  topP: number;
  enableStreaming: boolean;

  // Behavior
  persona: string;
  responseStyle: string;
  codeStyle: string;
  autoFormat: boolean;

  // Voice
  voiceEnabled: boolean;
  language: string;
  voiceModel: string;
  autoSend: boolean;
  confidenceThreshold: number;

  // Local AI
  localAIEnabled: boolean;
  localModel: string;
  offlineMode: "auto" | "cloud-only" | "local-only" | "hybrid";
  fallbackToCloud: boolean;
  promptImprovement: boolean;

  // General
  notifications: boolean;
}

/** API lifecycle: never validate before key exists; READY only after validation success. */
export type ApiStatus = "UNINITIALIZED" | "LOADING" | "READY" | "ERROR";

export interface ValidationState {
  isValidating: boolean;
  isComplete: boolean;
  lastValidatedKey: string | null;
}

export interface ToolState {
  executionHistory: Array<{
    tool: string;
    timestamp: Date;
    success: boolean;
  }>;
  chains: string[][];
  customTools: Array<{ id: string; name: string; description: string }>;
  usage: Record<string, number>;
}

export interface CodeMetricsState {
  complexity: string;
  maintainability: string;
  testCoverage: string;
  securityScore: string;
}

export interface AppState {
  // UI State
  ui: UIState;
  modals: ModalState;

  // AI Configuration
  aiConfig: AIConfigState;
  validation: ValidationState;

  // API lifecycle (runtime only; not persisted)
  apiStatus: ApiStatus;
  setApiStatus: (status: ApiStatus) => void;

  // Tool Management
  tools: ToolState;
  codeMetrics: CodeMetricsState;

  // Actions
  setUI: (updates: Partial<UIState>) => void;
  setViewMode: (mode: ViewMode) => void;
  togglePanel: (
    panel: keyof Pick<
      UIState,
      | "chatVisible"
      | "sidebarVisible"
      | "inspectorVisible"
      | "previewVisible"
      | "monitorVisible"
      | "editorVisible"
    >,
  ) => void;
  toggleTheme: () => void;

  openModal: (modal: keyof ModalState, data?: { tool?: string }) => void;
  closeModal: (modal: keyof ModalState) => void;
  closeAllModals: () => void;

  setAIConfig: (updates: Partial<AIConfigState>) => void;
  setValidation: (updates: Partial<ValidationState>) => void;

  addToolExecution: (tool: string, success: boolean) => void;
  addCustomTool: (name: string, description: string) => void;
  removeCustomTool: (id: string) => void;
  updateToolUsage: (tool: string) => void;

  setCodeMetrics: (metrics: Partial<CodeMetricsState>) => void;
  setChatVisible: (visible: boolean) => void;
  setBottomPanelVisible: (visible: boolean) => void;

  // Settings methods (delegated to settingsStore)
  updateSettings: (updates: any) => void;
  resetSettings: () => void;

  // Backwards-compatible settings snapshot (read-only proxy to settingsStore)
  settings?: any;

  // View mode property (for backward compatibility)
  viewMode?: ViewMode;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialUIState: UIState = {
  // Default: show the AI agent sidebar on first load
  chatVisible: true,
  chatCollapsed: false,
  sidebarVisible: true,
  inspectorVisible: false,
  previewVisible: true,
  monitorVisible: false,
  editorVisible: true,
  bottomPanelVisible: true,
  minimapEnabled: true,
  viewMode: "split",
  splitOrientation: "horizontal",
  splitRatio: 0.5,
  useMonacoEditor: false,
  isDarkMode: true,
};

const initialModalState: ModalState = {
  settings: false,
  agentModal: false,
  geminiTester: false,
  aiSettingsHub: false,
  conversationList: false,
  contextViewer: false,
  speechTest: false,
  agentCollaboration: false,
  agentSelector: false,
  codeIntelligence: false,
  mcpTool: { isOpen: false, tool: "" },
  voiceChat: false,
  commandPalette: false,
  enhancedSettings: false,
  projectStructure: false,
  toolHistory: false,
  toolChains: false,
  toolManager: false,
  codeMetrics: false,
  toolUsageAnalytics: false,
};

const initialAIConfig: AIConfigState = {
  apiKey: "",
  selectedModel: ModelId.Gemini3FlashPreview,
  selectionMode: "auto",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  enableStreaming: true,
  persona: "Professional",
  responseStyle: "Detailed",
  codeStyle: "Modern ES6+",
  autoFormat: true,
  voiceEnabled: false,
  language: "en-US",
  voiceModel: "Vosk",
  autoSend: true,
  confidenceThreshold: 0.7,
  localAIEnabled: false,
  localModel: "",
  offlineMode: "auto",
  fallbackToCloud: true,
  promptImprovement: false,
  notifications: true,
};

const initialToolState: ToolState = {
  executionHistory: [],
  chains: [],
  customTools: [],
  usage: {},
};

const initialCodeMetrics: CodeMetricsState = {
  complexity: "Low",
  maintainability: "High",
  testCoverage: "85%",
  securityScore: "95%",
};

// ============================================================================
// STORE
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      ui: initialUIState,
      modals: initialModalState,
      aiConfig: initialAIConfig,
      validation: {
        isValidating: false,
        isComplete: false,
        lastValidatedKey: null,
      },
      apiStatus: "UNINITIALIZED" as ApiStatus,
      setApiStatus: (status) => set({ apiStatus: status }),
      tools: initialToolState,
      codeMetrics: initialCodeMetrics,

      // Computed viewMode for backward compatibility
      get viewMode() {
        return this.ui.viewMode;
      },

      // Provide a snapshot of settings so legacy selectors like state.settings.theme work
      settings: {
        // top-level theme (legacy accessors expect state.settings.theme)
        theme: useSettingsStore.getState().ui.theme,
        // full UI/editor/ai/mcp objects for components expecting nested keys
        ui: useSettingsStore.getState().ui,
        editor: useSettingsStore.getState().editor,
        ai: useSettingsStore.getState().ai,
        mcp: useSettingsStore.getState().mcp,
        // helper methods that proxy to the settings store
        updateUISettings: (s: any) =>
          useSettingsStore.getState().updateUISettings(s),
        updateEditorSettings: (s: any) =>
          useSettingsStore.getState().updateEditorSettings(s),
        updateAISettings: (s: any) =>
          useSettingsStore.getState().updateAISettings(s),
      },

      // UI Actions
      setUI: (updates) =>
        set((state) => ({
          ui: { ...state.ui, ...updates },
        })),

      setViewMode: (mode) =>
        set((state) => ({
          ui: { ...state.ui, viewMode: mode },
        })),

      togglePanel: (panel) =>
        set((state) => ({
          ui: { ...state.ui, [panel]: !state.ui[panel] },
        })),

      toggleTheme: () =>
        set((state) => {
          const nextDark = !state.ui.isDarkMode;
          const nextTheme = nextDark ? "dark" : "light";
          useThemeStore.getState().setTheme(nextTheme);
          return { ui: { ...state.ui, isDarkMode: nextDark } };
        }),

      // Modal Actions
      openModal: (modal, data) =>
        set((state) => {
          if (modal === "mcpTool" && data) {
            return {
              modals: {
                ...state.modals,
                mcpTool: { isOpen: true, tool: data.tool || "" },
              },
            };
          }
          return {
            modals: { ...state.modals, [modal]: true },
          };
        }),

      closeModal: (modal) =>
        set((state) => {
          if (modal === "mcpTool") {
            return {
              modals: { ...state.modals, mcpTool: { isOpen: false, tool: "" } },
            };
          }
          return {
            modals: { ...state.modals, [modal]: false },
          };
        }),

      closeAllModals: () => set({ modals: initialModalState }),

      // AI Config Actions
      setAIConfig: (updates) =>
        set((state) => ({
          aiConfig: { ...state.aiConfig, ...updates },
        })),

      setValidation: (updates) =>
        set((state) => ({
          validation: { ...state.validation, ...updates },
        })),

      // Tool Actions
      addToolExecution: (tool, success) =>
        set((state) => ({
          tools: {
            ...state.tools,
            executionHistory: [
              ...state.tools.executionHistory,
              { tool, timestamp: new Date(), success },
            ].slice(-100),
          },
        })),

      addCustomTool: (name, description) =>
        set((state) => ({
          tools: {
            ...state.tools,
            customTools: [
              ...state.tools.customTools,
              { id: `custom_${Date.now()}`, name, description },
            ],
          },
        })),

      removeCustomTool: (id) =>
        set((state) => ({
          tools: {
            ...state.tools,
            customTools: state.tools.customTools.filter((t) => t.id !== id),
          },
        })),

      updateToolUsage: (tool) =>
        set((state) => ({
          tools: {
            ...state.tools,
            usage: {
              ...state.tools.usage,
              [tool]: (state.tools.usage[tool] || 0) + 1,
            },
          },
        })),

      setCodeMetrics: (metrics) =>
        set((state) => ({
          codeMetrics: { ...state.codeMetrics, ...metrics },
        })),

      setChatVisible: (visible) =>
        set((state) => ({
          ui: { ...state.ui, chatVisible: visible },
        })),

      setBottomPanelVisible: (visible) =>
        set((state) => ({
          ui: { ...state.ui, bottomPanelVisible: visible },
        })),

      // Settings methods (delegate to settingsStore)
      updateSettings: (updates) => {
        useSettingsStore.getState().updateUISettings(updates);
        // Re-sync settings snapshot
        set((state) => ({
          settings: {
            ...state.settings,
            theme: useSettingsStore.getState().ui.theme,
            ui: useSettingsStore.getState().ui,
            editor: useSettingsStore.getState().editor,
            ai: useSettingsStore.getState().ai,
            mcp: useSettingsStore.getState().mcp,
          },
        }));
      },

      resetSettings: () => {
        // Reset all settings subsections
        useSettingsStore.getState().resetAllSettings();
        // Re-sync settings snapshot
        set((state) => ({
          settings: {
            ...state.settings,
            theme: useSettingsStore.getState().ui.theme,
            ui: useSettingsStore.getState().ui,
            editor: useSettingsStore.getState().editor,
            ai: useSettingsStore.getState().ai,
            mcp: useSettingsStore.getState().mcp,
          },
        }));
      },
    }),
    {
      name: "gstudio-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: {
          isDarkMode: state.ui.isDarkMode,
          splitOrientation: state.ui.splitOrientation,
          useMonacoEditor: state.ui.useMonacoEditor,
          minimapEnabled: state.ui.minimapEnabled,
        },
        aiConfig: {
          selectedModel: state.aiConfig.selectedModel,
          temperature: state.aiConfig.temperature,
          maxTokens: state.aiConfig.maxTokens,
          persona: state.aiConfig.persona,
          language: state.aiConfig.language,
        },
        tools: {
          customTools: state.tools.customTools,
          usage: state.tools.usage,
        },
      }),
    },
  ),
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useUIState = () => useAppStore((state) => state.ui);
export const useModals = () => useAppStore((state) => state.modals);
export const useAIConfig = () => useAppStore((state) => state.aiConfig);
export const useValidation = () => useAppStore((state) => state.validation);
export const useApiStatus = () => useAppStore((state) => state.apiStatus);
export const useIsApiReady = () =>
  useAppStore((state) => state.apiStatus === "READY");
export const useTools = () => useAppStore((state) => state.tools);
export const useCodeMetrics = () => useAppStore((state) => state.codeMetrics);

export const useUIActions = () =>
  useAppStore(
    useShallow((state) => ({
      setUI: state.setUI,
      setViewMode: state.setViewMode,
      togglePanel: state.togglePanel,
      toggleTheme: state.toggleTheme,
      setChatVisible: state.setChatVisible,
      setBottomPanelVisible: state.setBottomPanelVisible,
    })),
  );

export const useModalActions = () =>
  useAppStore(
    useShallow((state) => ({
      openModal: state.openModal,
      closeModal: state.closeModal,
      closeAllModals: state.closeAllModals,
    })),
  );

export const useAIConfigActions = () =>
  useAppStore(
    useShallow((state) => ({
      setAIConfig: state.setAIConfig,
      setValidation: state.setValidation,
    })),
  );

export const useToolActions = () =>
  useAppStore(
    useShallow((state) => ({
      addToolExecution: state.addToolExecution,
      addCustomTool: state.addCustomTool,
      removeCustomTool: state.removeCustomTool,
      updateToolUsage: state.updateToolUsage,
    })),
  );
