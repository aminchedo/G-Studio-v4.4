/**
 * G Studio v2.0.0 - App Provider
 *
 * Combines all context providers into a single wrapper for the application.
 * This replaces the old service-based architecture with functional hooks
 * and React contexts.
 */

import React, { ReactNode, useMemo } from "react";
import { NotificationProvider } from "./contexts/NotificationContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { LMStudioProvider } from "./contexts/LMStudioProvider";
import { GeminiProvider } from "./hooks/core/useGemini";
import { McpProvider } from "./hooks/core/useMcp";
import { ModelSelectionProvider } from "./hooks/core/useModelSelection";
import { AutonomousModeProvider } from "./hooks/core/useAutonomousMode";
import { AgentOrchestratorProvider } from "./hooks/core/useAgentOrchestrator";
import { ContextManagerProvider } from "./hooks/core/useContextManager";
import { VoiceCommandsProvider } from "./hooks/voice/useVoiceCommands";

// Configuration type for the app provider
export interface AppProviderConfig {
  // Gemini configuration
  geminiApiKey?: string;
  geminiModel?: string;

  // LM Studio configuration
  lmStudioUrl?: string;
  lmStudioAutoConnect?: boolean;

  // Feature flags
  enableVoice?: boolean;
  enableLocalAI?: boolean;
  enableTelemetry?: boolean;

  // Default language for voice
  defaultLanguage?: "en" | "fa";

  // Debug mode
  debug?: boolean;
}

interface AppProviderProps {
  children: ReactNode;
  config?: AppProviderConfig;
}

// Default configuration
const defaultConfig: AppProviderConfig = {
  geminiModel: "gemini-1.5-flash",
  lmStudioUrl: "http://localhost:1234/v1",
  lmStudioAutoConnect: false,
  enableVoice: true,
  enableLocalAI: true,
  enableTelemetry: true,
  defaultLanguage: "en",
  debug: false,
};

/**
 * AppProvider - Main application context provider
 *
 * Wraps all the individual providers in the correct order to ensure
 * proper dependency resolution and context availability.
 */
export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  config = {},
}) => {
  // Merge with defaults
  const mergedConfig = useMemo(
    () => ({
      ...defaultConfig,
      ...config,
    }),
    [config],
  );

  // Build LM Studio configuration
  const lmStudioConfig = useMemo(
    () => ({
      baseUrl: mergedConfig.lmStudioUrl || "http://localhost:1234/v1",
    }),
    [mergedConfig.lmStudioUrl],
  );

  return (
    <NotificationProvider>
      <DatabaseProvider>
        <GeminiProvider
          initialApiKey={mergedConfig.geminiApiKey || ""}
          initialModel={mergedConfig.geminiModel || "gemini-1.5-flash"}
        >
          <LMStudioProvider
            initialConfig={lmStudioConfig}
            autoConnect={mergedConfig.lmStudioAutoConnect}
          >
            <McpProvider>
              <ModelSelectionProvider>
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
              </ModelSelectionProvider>
            </McpProvider>
          </LMStudioProvider>
        </GeminiProvider>
      </DatabaseProvider>
    </NotificationProvider>
  );
};

/**
 * MinimalAppProvider - Lightweight provider for testing
 *
 * Only includes essential providers for unit testing or
 * performance-critical scenarios.
 */
export const MinimalAppProvider: React.FC<AppProviderProps> = ({
  children,
  config = {},
}) => {
  const mergedConfig = { ...defaultConfig, ...config };

  return (
    <NotificationProvider>
      <DatabaseProvider>{children}</DatabaseProvider>
    </NotificationProvider>
  );
};

/**
 * DevAppProvider - Development provider with all features
 *
 * Includes debug mode and additional development tools.
 */
export const DevAppProvider: React.FC<AppProviderProps> = ({
  children,
  config = {},
}) => {
  const devConfig = { ...config, debug: true };

  return <AppProvider config={devConfig}>{children}</AppProvider>;
};

/**
 * withAppProvider - HOC for wrapping components
 *
 * Useful for wrapping class components or legacy code.
 */
export function withAppProvider<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: AppProviderConfig,
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

export default AppProvider;
