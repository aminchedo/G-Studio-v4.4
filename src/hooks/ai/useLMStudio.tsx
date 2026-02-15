/**
 * useLMStudio - LM Studio integration hook
 * 
 * Provides connection to LM Studio local AI server
 * Supports chat completion with streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export interface LMStudioConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
}

export interface LMStudioModel {
  id: string;
  name: string;
  size: string;
  format: string;
  contextLength: number;
  parameters: number;
  quantization?: string;
  object?: string;
  owned_by?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface UseLMStudioReturn {
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

// Default configuration
const DEFAULT_CONFIG: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  timeout: 30000,
  maxRetries: 3,
};

/**
 * useLMStudio hook
 */
export function useLMStudio(initialConfig?: Partial<LMStudioConfig>): UseLMStudioReturn {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<LMStudioModel[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfigState] = useState<LMStudioConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set config
  const setConfig = useCallback((newConfig: Partial<LMStudioConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, [config.baseUrl, config.apiKey]);

  // Fetch available models
  const refreshModels = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: LMStudioModel[] = (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id.split('/').pop() || model.id,
        size: 'Unknown',
        format: 'GGUF',
        contextLength: 4096,
        parameters: 0,
        object: model.object,
        owned_by: model.owned_by,
      }));

      setAvailableModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && !currentModel) {
        setCurrentModel(models[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models';
      setConnectionError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [config.baseUrl, config.apiKey, config.timeout, currentModel]);

  // Connect to LM Studio
  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      // Test connection first
      const isReachable = await testConnection();
      if (!isReachable) {
        throw new Error('Cannot connect to LM Studio. Make sure it is running and the server is started.');
      }

      // Fetch models
      await refreshModels();
      
      setIsConnected(true);

      // Start health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      healthCheckIntervalRef.current = setInterval(async () => {
        const isHealthy = await testConnection();
        if (!isHealthy && isConnected) {
          setIsConnected(false);
          setConnectionError('Connection lost. Attempting to reconnect...');
          // Try to reconnect
          const reconnected = await testConnection();
          if (reconnected) {
            setIsConnected(true);
            setConnectionError(null);
          }
        }
      }, 30000);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [testConnection, refreshModels, isConnected]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // Send message (non-streaming)
  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> => {
    if (!isConnected) {
      throw new Error('Not connected to LM Studio');
    }

    if (!currentModel) {
      throw new Error('No model selected');
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          top_p: options.topP ?? 1,
          stream: false,
          stop: options.stopSequences,
          presence_penalty: options.presencePenalty ?? 0,
          frequency_penalty: options.frequencyPenalty ?? 0,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, currentModel, config.baseUrl, config.apiKey]);

  // Stream message
  const streamMessage = useCallback(async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options: ChatOptions = {}
  ): Promise<void> => {
    if (!isConnected) {
      throw new Error('Not connected to LM Studio');
    }

    if (!currentModel) {
      throw new Error('No model selected');
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          top_p: options.topP ?? 1,
          stream: true,
          stop: options.stopSequences,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Stream cancelled');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, currentModel, config.baseUrl, config.apiKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isConnected,
    availableModels,
    currentModel,
    connectionError,
    isLoading,
    config,
    connect,
    disconnect,
    sendMessage,
    streamMessage,
    setCurrentModel,
    setConfig,
    refreshModels,
    testConnection,
  };
}

export default useLMStudio;
