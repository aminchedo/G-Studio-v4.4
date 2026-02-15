/**
 * useAIProvider - Unified AI provider switcher
 * 
 * Routes requests to either Gemini (cloud) or LM Studio (local)
 * Provides seamless switching between providers
 */

import { useState, useCallback, useMemo } from 'react';

// Types
export type AIProvider = 'gemini' | 'lmstudio';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemInstruction?: string;
  [key: string]: unknown;
}

export interface AIResponse {
  success: boolean;
  content: string;
  provider: AIProvider;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface ProviderStatus {
  provider: AIProvider;
  isReady: boolean;
  isConnected: boolean;
  currentModel: string | null;
  error: string | null;
}

export interface UseAIProviderOptions {
  defaultProvider?: AIProvider;
  autoFallback?: boolean;
  onProviderChange?: (provider: AIProvider) => void;
  onError?: (error: Error, provider: AIProvider) => void;
}

export interface UseAIProviderReturn {
  // State
  provider: AIProvider;
  isLocal: boolean;
  isCloud: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  providerStatus: Record<AIProvider, ProviderStatus>;
  
  // Actions
  setProvider: (provider: AIProvider) => void;
  sendMessage: (
    messages: AIMessage[] | string,
    options?: AIOptions
  ) => Promise<AIResponse>;
  streamMessage: (
    messages: AIMessage[] | string,
    onChunk: (chunk: string) => void,
    options?: AIOptions
  ) => Promise<AIResponse>;
  cancelRequest: () => void;
  
  // Provider-specific config
  setGeminiConfig: (config: { apiKey?: string; model?: string }) => void;
  setLMStudioConfig: (config: { baseUrl?: string; model?: string }) => void;
}

// Normalize messages to array format
const normalizeMessages = (input: AIMessage[] | string): AIMessage[] => {
  if (typeof input === 'string') {
    return [{ role: 'user', content: input }];
  }
  return input;
};

/**
 * useAIProvider hook
 */
export function useAIProvider(options: UseAIProviderOptions = {}): UseAIProviderReturn {
  const {
    defaultProvider = 'gemini',
    autoFallback = true,
    onProviderChange,
    onError,
  } = options;

  // State
  const [provider, setProviderState] = useState<AIProvider>(defaultProvider);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Provider configurations
  const [geminiConfig, setGeminiConfigState] = useState({
    apiKey: '',
    model: 'gemini-1.5-flash',
    isReady: false,
    isConnected: false,
  });

  const [lmStudioConfig, setLMStudioConfigState] = useState({
    baseUrl: 'http://localhost:1234/v1',
    model: null as string | null,
    isReady: false,
    isConnected: false,
  });

  // Computed values
  const isLocal = provider === 'lmstudio';
  const isCloud = provider === 'gemini';
  
  const isReady = useMemo(() => {
    if (provider === 'gemini') {
      return geminiConfig.isReady && !!geminiConfig.apiKey;
    }
    return lmStudioConfig.isReady && lmStudioConfig.isConnected;
  }, [provider, geminiConfig, lmStudioConfig]);

  const providerStatus: Record<AIProvider, ProviderStatus> = useMemo(() => ({
    gemini: {
      provider: 'gemini',
      isReady: !!geminiConfig.apiKey,
      isConnected: geminiConfig.isConnected,
      currentModel: geminiConfig.model,
      error: null,
    },
    lmstudio: {
      provider: 'lmstudio',
      isReady: lmStudioConfig.isReady,
      isConnected: lmStudioConfig.isConnected,
      currentModel: lmStudioConfig.model,
      error: null,
    },
  }), [geminiConfig, lmStudioConfig]);

  // Set provider
  const setProvider = useCallback((newProvider: AIProvider) => {
    setProviderState(newProvider);
    setError(null);
    onProviderChange?.(newProvider);
  }, [onProviderChange]);

  // Set Gemini config
  const setGeminiConfig = useCallback((config: { apiKey?: string; model?: string }) => {
    setGeminiConfigState(prev => ({
      ...prev,
      ...config,
      isReady: !!(config.apiKey || prev.apiKey),
    }));
  }, []);

  // Set LM Studio config
  const setLMStudioConfig = useCallback((config: { baseUrl?: string; model?: string }) => {
    setLMStudioConfigState(prev => ({
      ...prev,
      ...config,
    }));
  }, []);

  // Cancel request
  const cancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
  }, [abortController]);

  // Send message to Gemini
  const sendToGemini = useCallback(async (
    messages: AIMessage[],
    options: AIOptions = {}
  ): Promise<AIResponse> => {
    if (!geminiConfig.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent?key=${geminiConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : m.role,
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 2048,
              topP: options.topP ?? 1,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        success: true,
        content,
        provider: 'gemini',
        model: geminiConfig.model,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, content: '', provider: 'gemini', error: 'Request cancelled' };
      }
      throw error;
    }
  }, [geminiConfig]);

  // Send message to LM Studio
  const sendToLMStudio = useCallback(async (
    messages: AIMessage[],
    options: AIOptions = {}
  ): Promise<AIResponse> => {
    if (!lmStudioConfig.isConnected) {
      throw new Error('LM Studio not connected');
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${lmStudioConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: lmStudioConfig.model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        content,
        provider: 'lmstudio',
        model: lmStudioConfig.model || undefined,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, content: '', provider: 'lmstudio', error: 'Request cancelled' };
      }
      throw error;
    }
  }, [lmStudioConfig]);

  // Send message (unified)
  const sendMessage = useCallback(async (
    input: AIMessage[] | string,
    options: AIOptions = {}
  ): Promise<AIResponse> => {
    setIsLoading(true);
    setError(null);

    const messages = normalizeMessages(input);

    try {
      let response: AIResponse;

      if (provider === 'gemini') {
        response = await sendToGemini(messages, options);
      } else {
        response = await sendToLMStudio(messages, options);
      }

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err.message);
      onError?.(err, provider);

      // Try fallback if enabled
      if (autoFallback) {
        const fallbackProvider = provider === 'gemini' ? 'lmstudio' : 'gemini';
        const fallbackStatus = providerStatus[fallbackProvider];
        
        if (fallbackStatus.isReady) {
          try {
            if (fallbackProvider === 'gemini') {
              return await sendToGemini(messages, options);
            } else {
              return await sendToLMStudio(messages, options);
            }
          } catch (fallbackError) {
            // Fallback also failed
          }
        }
      }

      return {
        success: false,
        content: '',
        provider,
        error: err.message,
      };
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [provider, sendToGemini, sendToLMStudio, autoFallback, providerStatus, onError]);

  // Stream message
  const streamMessage = useCallback(async (
    input: AIMessage[] | string,
    onChunk: (chunk: string) => void,
    options: AIOptions = {}
  ): Promise<AIResponse> => {
    setIsLoading(true);
    setError(null);

    const messages = normalizeMessages(input);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      if (provider === 'lmstudio') {
        // LM Studio streaming
        const response = await fetch(`${lmStudioConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: lmStudioConfig.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`LM Studio API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullContent = '';
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
                  fullContent += content;
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        return {
          success: true,
          content: fullContent,
          provider: 'lmstudio',
          model: lmStudioConfig.model || undefined,
        };
      } else {
        // Gemini doesn't have native streaming in basic API, simulate with regular call
        const response = await sendToGemini(messages, options);
        if (response.success) {
          onChunk(response.content);
        }
        return response;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err.message);
      onError?.(err, provider);

      return {
        success: false,
        content: '',
        provider,
        error: err.message,
      };
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [provider, lmStudioConfig, sendToGemini, onError]);

  return {
    provider,
    isLocal,
    isCloud,
    isReady,
    isLoading,
    error,
    providerStatus,
    setProvider,
    sendMessage,
    streamMessage,
    cancelRequest,
    setGeminiConfig,
    setLMStudioConfig,
  };
}

export default useAIProvider;
