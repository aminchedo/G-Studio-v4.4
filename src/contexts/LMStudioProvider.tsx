/**
 * LMStudioProvider - Context provider for LM Studio integration
 * 
 * Provides app-wide access to LM Studio functionality
 */

import React, { createContext, useContext, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { useLMStudio, LMStudioConfig, LMStudioModel, ChatMessage, ChatOptions, ChatResponse } from '@/hooks/ai/useLMStudio';

// Context types
export interface LMStudioContextValue {
  // State
  isConnected: boolean;
  availableModels: LMStudioModel[];
  currentModel: string | null;
  connectionError: string | null;
  isLoading: boolean;
  config: LMStudioConfig;
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (messages: ChatMessage[], options?: ChatOptions) => Promise<ChatResponse>;
  streamMessage: (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: ChatOptions
  ) => Promise<void>;
  setCurrentModel: (modelId: string) => void;
  setConfig: (config: Partial<LMStudioConfig>) => void;
  refreshModels: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

// Create context
const LMStudioContext = createContext<LMStudioContextValue | null>(null);

// Provider props
export interface LMStudioProviderProps {
  children: ReactNode;
  initialConfig?: Partial<LMStudioConfig>;
  autoConnect?: boolean;
  persistConfig?: boolean;
}

// Storage key for config persistence
const CONFIG_STORAGE_KEY = 'lmstudio_config';

/**
 * LMStudioProvider Component
 */
export const LMStudioProvider: React.FC<LMStudioProviderProps> = ({
  children,
  initialConfig,
  autoConnect = false,
  persistConfig = true,
}) => {
  // Load persisted config
  const loadPersistedConfig = useCallback((): Partial<LMStudioConfig> | undefined => {
    if (!persistConfig || typeof window === 'undefined') return undefined;
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[LMStudioProvider] Failed to load persisted config:', e);
    }
    return undefined;
  }, [persistConfig]);

  // Merge configs
  const mergedConfig = useMemo(() => ({
    ...loadPersistedConfig(),
    ...initialConfig,
  }), [initialConfig, loadPersistedConfig]);

  // Use the hook
  const lmStudio = useLMStudio(mergedConfig);

  // Persist config changes
  useEffect(() => {
    if (persistConfig && typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(lmStudio.config));
      } catch (e) {
        console.error('[LMStudioProvider] Failed to persist config:', e);
      }
    }
  }, [lmStudio.config, persistConfig]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !lmStudio.isConnected && !lmStudio.isLoading) {
      lmStudio.connect().catch(console.error);
    }
  }, [autoConnect]); // Only run on mount

  // Memoize context value
  const contextValue = useMemo<LMStudioContextValue>(() => ({
    isConnected: lmStudio.isConnected,
    availableModels: lmStudio.availableModels,
    currentModel: lmStudio.currentModel,
    connectionError: lmStudio.connectionError,
    isLoading: lmStudio.isLoading,
    config: lmStudio.config,
    connect: lmStudio.connect,
    disconnect: lmStudio.disconnect,
    sendMessage: lmStudio.sendMessage,
    streamMessage: lmStudio.streamMessage,
    setCurrentModel: lmStudio.setCurrentModel,
    setConfig: lmStudio.setConfig,
    refreshModels: lmStudio.refreshModels,
    testConnection: lmStudio.testConnection,
  }), [lmStudio]);

  return (
    <LMStudioContext.Provider value={contextValue}>
      {children}
    </LMStudioContext.Provider>
  );
};

/**
 * Hook to use LM Studio context
 */
export function useLMStudioContext(): LMStudioContextValue {
  const context = useContext(LMStudioContext);
  if (!context) {
    throw new Error('useLMStudioContext must be used within a LMStudioProvider');
  }
  return context;
}

/**
 * Hook for components that optionally use LM Studio
 */
export function useLMStudioOptional(): LMStudioContextValue | null {
  return useContext(LMStudioContext);
}

export default LMStudioProvider;
