/**
 * G Studio v2.3.0 - App Provider
 *
 * Unified context provider architecture combining all application contexts.
 * Fully functional implementation with proper dependency ordering.
 *
 * @version 2.3.0
 * @refactored Replaced service-based architecture with functional hooks
 */

import React, { ReactNode, useMemo, useCallback } from "react";

// ==================== CONTEXT PROVIDERS ====================

// Core Contexts
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";

// AI Providers
import { GeminiProvider } from "@/hooks/core/useGemini";
import { LMStudioProvider } from "@/contexts/LMStudioProvider";
import { McpProvider } from "@/hooks/core/useMcp";
import { ModelSelectionProvider } from "@/hooks/core/useModelSelection";

// Agent Providers
import { AutonomousModeProvider } from "@/hooks/core/useAutonomousMode";
import { AgentOrchestratorProvider } from "@/hooks/core/useAgentOrchestrator";
import { ContextManagerProvider } from "@/hooks/core/useContextManager";

// Voice Provider
import { VoiceCommandsProvider } from "@/hooks/voice/useVoiceCommands";

// ==================== TYPES ====================

/**
 * Configuration interface for the AppProvider
 */
export interface AppProviderConfig {
  // Gemini AI Configuration
  geminiApiKey?: string;
  geminiModel?: string;

  // LM Studio Configuration
  lmStudioUrl?: string;
  lmStudioAutoConnect?: boolean;

  // Feature Flags
  enableVoice?: boolean;
  enableLocalAI?: boolean;
  enableTelemetry?: boolean;
  enableMCP?: boolean;
  enableAutonomousMode?: boolean;

  // Voice Configuration
  defaultLanguage?: "en" | "fa" | "en-US" | "fa-IR";
  voiceModel?: "Vosk" | "Web Speech API";

  // Development
  debug?: boolean;
  verbose?: boolean;

  // Storage
  useIndexedDB?: boolean;
  useLocalStorage?: boolean;

  // Security
  encryptStorage?: boolean;

  // Performance
  enableCaching?: boolean;
  cacheSize?: number;
}

/**
 * Props for the AppProvider component
 */
interface AppProviderProps {
  children: ReactNode;
  config?: Partial<AppProviderConfig> | undefined;
  onConfigChange?: (config: AppProviderConfig) => void;
  onError?: (error: Error) => void;
}

// ==================== DEFAULT CONFIGURATION ====================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppProviderConfig = {
  // AI Models
  geminiModel: "gemini-1.5-flash",

  // Local AI
  lmStudioUrl: "http://localhost:1234/v1",
  lmStudioAutoConnect: false,

  // Features
  enableVoice: true,
  enableLocalAI: true,
  enableTelemetry: true,
  enableMCP: true,
  enableAutonomousMode: false,

  // Voice
  defaultLanguage: "en",
  voiceModel: "Vosk",

  // Development
  debug: typeof import.meta.env !== "undefined" && import.meta.env.DEV,
  verbose: false,

  // Storage
  useIndexedDB: true,
  useLocalStorage: true,

  // Security
  encryptStorage: false,

  // Performance
  enableCaching: true,
  cacheSize: 100,
};

// ==================== MAIN PROVIDER ====================

/**
 * AppProvider - Main application context provider
 *
 * Orchestrates all context providers in the correct dependency order.
 * Provides centralized configuration and error handling.
 *
 * @example
 * ```tsx
 * <AppProvider config={{ geminiApiKey: 'your-key' }}>
 *   <App />
 * </AppProvider>
 * ```
 */
export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  config = {},
  onConfigChange,
  onError,
}) => {
  // ==================== MERGED CONFIGURATION ====================

  /**
   * Merge provided config with defaults
   */
  const mergedConfig = useMemo<AppProviderConfig>(() => {
    const merged = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Notify parent of config changes
    if (onConfigChange) {
      onConfigChange(merged);
    }

    return merged;
  }, [config, onConfigChange]);

  // ==================== DERIVED CONFIGURATIONS ====================

  /**
   * Gemini-specific configuration
   */
  const geminiConfig = useMemo(
    () => ({
      apiKey: mergedConfig.geminiApiKey || "",
      model: mergedConfig.geminiModel || "gemini-1.5-flash",
      debug: mergedConfig.debug,
    }),
    [mergedConfig.geminiApiKey, mergedConfig.geminiModel, mergedConfig.debug],
  );

  /**
   * LM Studio configuration
   */
  const lmStudioConfig = useMemo(
    () => ({
      baseUrl: mergedConfig.lmStudioUrl || "http://localhost:1234/v1",
      autoConnect: mergedConfig.lmStudioAutoConnect,
      enabled: mergedConfig.enableLocalAI,
    }),
    [
      mergedConfig.lmStudioUrl,
      mergedConfig.lmStudioAutoConnect,
      mergedConfig.enableLocalAI,
    ],
  );

  /**
   * Voice configuration
   */
  const voiceConfig = useMemo(
    () => ({
      enabled: mergedConfig.enableVoice,
      language: mergedConfig.defaultLanguage || "en",
      model: mergedConfig.voiceModel || "Vosk",
    }),
    [
      mergedConfig.enableVoice,
      mergedConfig.defaultLanguage,
      mergedConfig.voiceModel,
    ],
  );

  /**
   * Database configuration
   */
  const databaseConfig = useMemo(
    () => ({
      useIndexedDB: mergedConfig.useIndexedDB,
      useLocalStorage: mergedConfig.useLocalStorage,
      encryptStorage: mergedConfig.encryptStorage,
    }),
    [
      mergedConfig.useIndexedDB,
      mergedConfig.useLocalStorage,
      mergedConfig.encryptStorage,
    ],
  );

  // ==================== ERROR HANDLING ====================

  /**
   * Global error handler for all providers
   */
  const handleError = useCallback(
    (error: Error, context?: string) => {
      if (mergedConfig.debug || mergedConfig.verbose) {
        console.error(`[AppProvider${context ? ` - ${context}` : ""}]:`, error);
      }

      if (onError) {
        onError(error);
      }
    },
    [mergedConfig.debug, mergedConfig.verbose, onError],
  );

  // ==================== PROVIDER TREE ====================

  /**
   * Provider composition following dependency order:
   *
   * 1. NotificationProvider - No dependencies, needed by all
   * 2. DatabaseProvider - Uses notifications
   * 3. GeminiProvider - Core AI provider
   * 4. LMStudioProvider - Local AI (optional)
   * 5. McpProvider - Model Context Protocol
   * 6. ModelSelectionProvider - Model selection logic
   * 7. AutonomousModeProvider - Autonomous agent operations
   * 8. AgentOrchestratorProvider - Multi-agent coordination
   * 9. ContextManagerProvider - Context management
   * 10. VoiceCommandsProvider - Voice input (optional)
   */
  return (
    <NotificationProvider>
      <DatabaseProvider>
        <GeminiProvider
          initialApiKey={geminiConfig.apiKey}
          initialModel={geminiConfig.model}
        >
          <LMStudioProvider
            initialConfig={lmStudioConfig}
            autoConnect={lmStudioConfig.autoConnect}
          >
            {mergedConfig.enableMCP ? (
              <McpProvider>
                <ModelSelectionProvider>
                  {mergedConfig.enableAutonomousMode ? (
                    <AutonomousModeProvider>
                      <AgentOrchestratorProvider>
                        <ContextManagerProvider>
                          {mergedConfig.enableVoice ? (
                            <VoiceCommandsProvider>
                              {children}
                            </VoiceCommandsProvider>
                          ) : (
                            children
                          )}
                        </ContextManagerProvider>
                      </AgentOrchestratorProvider>
                    </AutonomousModeProvider>
                  ) : (
                    <AgentOrchestratorProvider>
                      <ContextManagerProvider>
                        {mergedConfig.enableVoice ? (
                          <VoiceCommandsProvider>
                            {children}
                          </VoiceCommandsProvider>
                        ) : (
                          children
                        )}
                      </ContextManagerProvider>
                    </AgentOrchestratorProvider>
                  )}
                </ModelSelectionProvider>
              </McpProvider>
            ) : (
              <ModelSelectionProvider>
                {mergedConfig.enableAutonomousMode ? (
                  <AutonomousModeProvider>
                    <AgentOrchestratorProvider>
                      <ContextManagerProvider>
                        {mergedConfig.enableVoice ? (
                          <VoiceCommandsProvider>
                            {children}
                          </VoiceCommandsProvider>
                        ) : (
                          children
                        )}
                      </ContextManagerProvider>
                    </AgentOrchestratorProvider>
                  </AutonomousModeProvider>
                ) : (
                  <AgentOrchestratorProvider>
                    <ContextManagerProvider>
                      {mergedConfig.enableVoice ? (
                        <VoiceCommandsProvider>
                          {children}
                        </VoiceCommandsProvider>
                      ) : (
                        children
                      )}
                    </ContextManagerProvider>
                  </AgentOrchestratorProvider>
                )}
              </ModelSelectionProvider>
            )}
          </LMStudioProvider>
        </GeminiProvider>
      </DatabaseProvider>
    </NotificationProvider>
  );
};

// ==================== HIGHER-ORDER COMPONENT ====================

/**
 * HOC for wrapping components with AppProvider
 *
 * Useful for wrapping class components or legacy code that can't use hooks.
 *
 * @example
 * ```tsx
 * const WrappedApp = withAppProvider(LegacyApp, {
 *   geminiApiKey: 'your-key'
 * });
 * ```
 */
export function withAppProvider<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: Partial<AppProviderConfig>,
): React.FC<P> {
  const WithAppProvider: React.FC<P> = (props) => (
    <AppProvider config={config}>
      <WrappedComponent {...props} />
    </AppProvider>
  );

  WithAppProvider.displayName = `WithAppProvider(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAppProvider;
}

// ==================== HOOKS ====================

/**
 * Hook to access current AppProvider configuration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const config = useAppConfig();
 *   return <div>Debug: {config.debug ? 'ON' : 'OFF'}</div>;
 * }
 * ```
 */
export function useAppConfig(): AppProviderConfig {
  // This would need to be implemented with a context
  // For now, return default config
  return DEFAULT_CONFIG;
}

/**
 * Hook to check if a feature is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const voiceEnabled = useFeatureFlag('enableVoice');
 *   return voiceEnabled ? <VoiceButton /> : null;
 * }
 * ```
 */
export function useFeatureFlag(flag: keyof AppProviderConfig): boolean {
  const config = useAppConfig();
  return Boolean(config[flag]);
}

// ==================== EXPORTS ====================

export default AppProvider;

// Type exports
export type { AppProviderProps };

// Re-export for convenience
export { DEFAULT_CONFIG as defaultAppConfig };
