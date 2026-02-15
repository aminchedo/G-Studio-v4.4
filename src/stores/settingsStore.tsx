/**
 * Settings Store - Modular configuration management
 * Centralized settings for AI, MCP, Editor, and UI configuration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  responseMode: 'streaming' | 'complete';
  topP: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface MCPSettings {
  enabled: boolean;
  autoStart: boolean;
  servers: Array<{
    id: string;
    name: string;
    enabled: boolean;
    autoStart: boolean;
    customArgs: string;
    endpoint?: string;
  }>;
}

export interface EditorSettings {
  fontSize: number;
  indentSize: number;
  useSpaces: boolean;
  minimap: boolean;
  autoFormat: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  formatOnSave: boolean;
  showWhitespace: boolean;
  cursorStyle: 'block' | 'line' | 'underline';
  scrollBeyondLastLine: boolean;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  fontFamily: string;
  sidebarPosition: 'left' | 'right';
  panelLayout: 'single' | 'split' | 'tabs';
  compactMode: boolean;
  showStatusBar: boolean;
}

export interface SettingsState {
  // Settings modules
  ai: AISettings;
  mcp: MCPSettings;
  editor: EditorSettings;
  ui: UISettings;

  // Settings actions
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateMCPSettings: (settings: Partial<MCPSettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  updateUISettings: (settings: Partial<UISettings>) => void;

  // Bulk operations
  updateAllSettings: (settings: Partial<SettingsState>) => void;
  resetAISettings: () => void;
  resetMCPSettings: () => void;
  resetEditorSettings: () => void;
  resetUISettings: () => void;
  resetAllSettings: () => void;

  // Import/Export
  exportSettings: () => string;
  importSettings: (json: string) => boolean;

  // Utility
  getSettingsSnapshot: () => Omit<SettingsState, keyof typeof useSettingsStore>;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_AI_SETTINGS: AISettings = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  maxTokens: 8000,
  systemPrompt: 'You are a helpful AI coding assistant for the G-Studio IDE.',
  responseMode: 'streaming',
  topP: 0.95,
  topK: 40,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export const DEFAULT_MCP_SETTINGS: MCPSettings = {
  enabled: true,
  autoStart: false,
  servers: [],
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  indentSize: 2,
  useSpaces: true,
  minimap: true,
  autoFormat: false,
  autoSave: true,
  autoSaveDelay: 2000,
  lineNumbers: true,
  wordWrap: true,
  formatOnSave: true,
  showWhitespace: false,
  cursorStyle: 'line',
  scrollBeyondLastLine: false,
};

export const DEFAULT_UI_SETTINGS: UISettings = {
  theme: 'auto',
  language: 'en',
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  bottomPanelHeight: 200,
  fontFamily: 'Fira Code, monospace',
  sidebarPosition: 'left',
  panelLayout: 'split',
  compactMode: false,
  showStatusBar: true,
};

// ============================================================================
// STORE
// ============================================================================

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set, get) => ({
      // Initial state
      ai: DEFAULT_AI_SETTINGS,
      mcp: DEFAULT_MCP_SETTINGS,
      editor: DEFAULT_EDITOR_SETTINGS,
      ui: DEFAULT_UI_SETTINGS,

      // AI Settings actions
      updateAISettings: (newSettings) =>
        set((state) => ({
          ai: { ...state.ai, ...newSettings },
        })),

      // MCP Settings actions
      updateMCPSettings: (newSettings) =>
        set((state) => ({
          mcp: {
            ...state.mcp,
            ...newSettings,
            servers: newSettings.servers || state.mcp.servers,
          },
        })),

      // Editor Settings actions
      updateEditorSettings: (newSettings) =>
        set((state) => ({
          editor: { ...state.editor, ...newSettings },
        })),

      // UI Settings actions
      updateUISettings: (newSettings) =>
        set((state) => ({
          ui: { ...state.ui, ...newSettings },
        })),

      // Bulk update
      updateAllSettings: (newSettings) =>
        set((state) => ({
          ai: newSettings.ai || state.ai,
          mcp: newSettings.mcp || state.mcp,
          editor: newSettings.editor || state.editor,
          ui: newSettings.ui || state.ui,
        })),

      // Reset individual sections
      resetAISettings: () =>
        set(() => ({
          ai: DEFAULT_AI_SETTINGS,
        })),

      resetMCPSettings: () =>
        set(() => ({
          mcp: DEFAULT_MCP_SETTINGS,
        })),

      resetEditorSettings: () =>
        set(() => ({
          editor: DEFAULT_EDITOR_SETTINGS,
        })),

      resetUISettings: () =>
        set(() => ({
          ui: DEFAULT_UI_SETTINGS,
        })),

      // Reset all settings
      resetAllSettings: () =>
        set(() => ({
          ai: DEFAULT_AI_SETTINGS,
          mcp: DEFAULT_MCP_SETTINGS,
          editor: DEFAULT_EDITOR_SETTINGS,
          ui: DEFAULT_UI_SETTINGS,
        })),

      // Export settings to JSON
      exportSettings: () => {
        const state = get();
        const settingsToExport = {
          ai: state.ai,
          mcp: state.mcp,
          editor: state.editor,
          ui: state.ui,
          exportedAt: new Date().toISOString(),
          version: '2.3.0',
        };
        return JSON.stringify(settingsToExport, null, 2);
      },

      // Import settings from JSON
      importSettings: (json: string) => {
        try {
          const imported = JSON.parse(json);

          // Validate imported settings
          if (
            imported.ai ||
            imported.mcp ||
            imported.editor ||
            imported.ui
          ) {
            set({
              ai: { ...DEFAULT_AI_SETTINGS, ...imported.ai },
              mcp: { ...DEFAULT_MCP_SETTINGS, ...imported.mcp },
              editor: { ...DEFAULT_EDITOR_SETTINGS, ...imported.editor },
              ui: { ...DEFAULT_UI_SETTINGS, ...imported.ui },
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },

      // Get settings snapshot
      getSettingsSnapshot: () => {
        const state = get();
        return {
          ai: state.ai,
          mcp: state.mcp,
          editor: state.editor,
          ui: state.ui,
        };
      },
    }),
    {
      name: 'g-studio-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        ai: state.ai,
        mcp: state.mcp,
        editor: state.editor,
        ui: state.ui,
        updateAISettings: state.updateAISettings,
        updateMCPSettings: state.updateMCPSettings,
        updateEditorSettings: state.updateEditorSettings,
        updateUISettings: state.updateUISettings,
        updateAllSettings: state.updateAllSettings,
        resetAISettings: state.resetAISettings,
        resetMCPSettings: state.resetMCPSettings,
        resetEditorSettings: state.resetEditorSettings,
        resetUISettings: state.resetUISettings,
        resetAllSettings: state.resetAllSettings,
        exportSettings: state.exportSettings,
        importSettings: state.importSettings,
        getSettingsSnapshot: state.getSettingsSnapshot,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useAISettings = () => useSettingsStore((state) => state.ai);
export const useMCPSettings = () => useSettingsStore((state) => state.mcp);
export const useEditorSettings = () => useSettingsStore((state) => state.editor);
export const useUISettings = () => useSettingsStore((state) => state.ui);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a specific setting by path (e.g., 'ai.model', 'editor.fontSize')
 */
export function getSetting(path: string): any {
  const state = useSettingsStore.getState();
  const [section, key] = path.split('.');

  if (section === 'ai' && key) return (state.ai as any)[key];
  if (section === 'mcp' && key) return (state.mcp as any)[key];
  if (section === 'editor' && key) return (state.editor as any)[key];
  if (section === 'ui' && key) return (state.ui as any)[key];

  return undefined;
}

/**
 * Set a specific setting by path
 */
export function setSetting(path: string, value: any): void {
  const [section] = path.split('.');

  if (section === 'ai') {
    useSettingsStore.getState().updateAISettings({ [path.split('.')[1]]: value });
  } else if (section === 'mcp') {
    useSettingsStore.getState().updateMCPSettings({ [path.split('.')[1]]: value } as any);
  } else if (section === 'editor') {
    useSettingsStore.getState().updateEditorSettings({ [path.split('.')[1]]: value } as any);
  } else if (section === 'ui') {
    useSettingsStore.getState().updateUISettings({ [path.split('.')[1]]: value } as any);
  }
}
