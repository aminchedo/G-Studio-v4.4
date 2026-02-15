/**
 * G Studio v2.3.0 - Stores Index
 *
 * Central export for all Zustand stores
 */

// App Store (main application state)
export {
  useAppStore,
  useUIState,
  useModals,
  useAIConfig,
  useValidation,
  useApiStatus,
  useIsApiReady,
  useTools,
  useCodeMetrics,
  useUIActions,
  useModalActions,
  useAIConfigActions,
  useToolActions,
} from "./appStore";

export type {
  UIState,
  ModalState,
  AIConfigState,
  ApiStatus,
  ValidationState,
  ToolState,
  CodeMetricsState,
  AppState,
} from "./appStore";

// Conversation Store
export {
  useConversationStore,
  useCurrentConversation,
  useConversationActions,
} from "./conversationStore";

// Project Store
export { useProjectStore } from "./projectStore";

// Code Intelligence Store
export { useCodeIntelligenceStore } from "./codeIntelligenceStore";
// Settings Store (modular configuration)
export {
  useSettingsStore,
  useAISettings,
  useMCPSettings,
  useEditorSettings,
  useUISettings,
  getSetting,
  setSetting,
  DEFAULT_AI_SETTINGS,
  DEFAULT_MCP_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_UI_SETTINGS,
} from "./settingsStore";

export type {
  AISettings,
  MCPSettings,
  EditorSettings,
  UISettings,
  SettingsState,
} from "./settingsStore";

// Theme Store (Phase 4 – dynamic theming)
export {
  useThemeStore,
  useTheme,
  useSetTheme,
  useIsDarkMode,
} from "./themeStore";
export type { ThemeId, ThemeState } from "./themeStore";

// Voice Store (TTS/STT state; integrated from master-update)
export { useVoiceStore } from "./voiceStore";
export type { VoiceState, VoiceSettings } from "./voiceStore";
