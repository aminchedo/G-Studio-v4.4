/**
 * useGemini - Refactored from class GeminiService
 *
 * Provides Gemini API integration via React hooks
 * Includes robust API client, error handling, and streaming support
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// Types
export interface GeminiConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface GeminiMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: number;
}

export interface GeminiResponse {
  success: boolean;
  data?: {
    text: string;
    candidates?: unknown[];
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };
  error?: string;
  errorInfo?: ErrorInfo;
  responseTime?: number;
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface ErrorInfo {
  type: string;
  category:
    | "authentication"
    | "rate_limit"
    | "server"
    | "network"
    | "invalid_request"
    | "unknown";
  message: string;
  retryable: boolean;
  suggestion: string;
}

export interface APIClientStats {
  total: number;
  success: number;
  failed: number;
  retries: number;
}

// Default configuration
const DEFAULT_CONFIG: Required<GeminiConfig> = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

// Error categorization (pure function)
export const categorizeError = (error: unknown): ErrorInfo => {
  const err = error as { status?: number; message?: string; code?: string };

  // Authentication errors
  if (err.status === 401 || err.status === 403) {
    return {
      type: err.status === 401 ? "unauthorized" : "forbidden",
      category: "authentication",
      message:
        err.status === 401
          ? "Invalid API key. Please check your Gemini API key."
          : "Access forbidden. Your API key may not have access to this model.",
      retryable: false,
      suggestion: "Verify your API key at https://aistudio.google.com/apikey",
    };
  }

  // Rate limit
  if (
    err.status === 429 ||
    err.message?.includes("quota") ||
    err.message?.includes("rate")
  ) {
    return {
      type: "rate_limit",
      category: "rate_limit",
      message: "Rate limit exceeded. Please wait before making more requests.",
      retryable: true,
      suggestion:
        "Wait a few seconds and try again, or reduce request frequency.",
    };
  }

  // Server errors
  if (err.status && err.status >= 500) {
    return {
      type: "server_error",
      category: "server",
      message: "Google API server error. Please try again later.",
      retryable: true,
      suggestion: "This is usually temporary. Wait and retry.",
    };
  }

  // Network errors
  if (
    err.message?.includes("network") ||
    err.message?.includes("fetch") ||
    err.code === "ECONNREFUSED"
  ) {
    return {
      type: "network_error",
      category: "network",
      message: "Network connection failed. Check your internet connection.",
      retryable: true,
      suggestion: "Verify internet connectivity and firewall settings.",
    };
  }

  // Invalid request
  if (err.status === 400) {
    return {
      type: "invalid_request",
      category: "invalid_request",
      message: err.message || "Invalid request parameters.",
      retryable: false,
      suggestion: "Check your request format and parameters.",
    };
  }

  // Unknown
  return {
    type: "unknown",
    category: "unknown",
    message: err.message || "An unknown error occurred.",
    retryable: true,
    suggestion: "Try again or contact support if the problem persists.",
  };
};

// API Client Factory (closure-based, not class)
export const createAPIClient = (apiKey: string, config: GeminiConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const stats: APIClientStats = { total: 0, success: 0, failed: 0, retries: 0 };

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const makeRequest = async (
    endpoint: string,
    options: RequestInit & { timeout?: number } = {},
  ): Promise<unknown> => {
    const url = `${finalConfig.baseUrl}${endpoint}?key=${apiKey}`;
    const timeout = options.timeout || finalConfig.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`,
        );
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const request = async (
    endpoint: string,
    options: RequestInit & { maxRetries?: number; timeout?: number } = {},
  ): Promise<GeminiResponse> => {
    const maxRetries = options.maxRetries ?? finalConfig.maxRetries;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        stats.total++;
        const startTime = Date.now();
        const result = await makeRequest(endpoint, options);
        const responseTime = Date.now() - startTime;

        stats.success++;
        return {
          success: true,
          data: result as GeminiResponse["data"],
          responseTime,
        };
      } catch (error) {
        lastError = error;
        const errorInfo = categorizeError(error);

        // Don't retry auth errors
        if (!errorInfo.retryable) {
          stats.failed++;
          return {
            success: false,
            error: errorInfo.message,
            errorInfo,
          };
        }

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          stats.retries++;
          const delay = finalConfig.retryDelay * Math.pow(2, attempt - 1);
          await sleep(delay);
          continue;
        }

        stats.failed++;
      }
    }

    const errorInfo = categorizeError(lastError);
    return {
      success: false,
      error: errorInfo.message,
      errorInfo,
    };
  };

  const streamRequest = async (
    endpoint: string,
    body: unknown,
    options: StreamingOptions = {},
  ): Promise<void> => {
    const url = `${finalConfig.baseUrl}${endpoint}?key=${apiKey}&alt=sse`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              fullText += text;
              options.onChunk?.(text);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      options.onComplete?.(fullText);
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  const getStats = (): APIClientStats => ({ ...stats });

  const resetStats = (): void => {
    stats.total = 0;
    stats.success = 0;
    stats.failed = 0;
    stats.retries = 0;
  };

  return {
    request,
    streamRequest,
    getStats,
    resetStats,
  };
};

// Main Hook
export interface UseGeminiOptions {
  apiKey: string;
  model?: string;
  config?: GeminiConfig;
  systemInstruction?: string;
}

export interface UseGeminiReturn {
  // State
  isLoading: boolean;
  isStreaming: boolean;
  error: ErrorInfo | null;
  stats: APIClientStats;
  // Methods
  sendMessage: (
    message: string,
    history?: GeminiMessage[],
  ) => Promise<GeminiResponse>;
  streamMessage: (
    message: string,
    history?: GeminiMessage[],
    options?: StreamingOptions,
  ) => Promise<void>;
  cancelStream: () => void;
  clearError: () => void;
  // Utilities
  listModels: () => Promise<string[]>;
  testConnection: () => Promise<boolean>;
}

export const useGemini = ({
  apiKey,
  model = "gemini-1.5-flash-latest",
  config = {},
  systemInstruction,
}: UseGeminiOptions): UseGeminiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize API client
  const client = useMemo(
    () => createAPIClient(apiKey, config),
    [
      apiKey,
      config.baseUrl,
      config.timeout,
      config.maxRetries,
      config.retryDelay,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const formatHistory = useCallback((history: GeminiMessage[]): unknown[] => {
    return history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
  }, []);

  const sendMessage = useCallback(
    async (
      message: string,
      history: GeminiMessage[] = [],
    ): Promise<GeminiResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const contents = [
          ...formatHistory(history),
          { role: "user", parts: [{ text: message }] },
        ];

        const body: Record<string, unknown> = { contents };
        if (systemInstruction) {
          body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await client.request(
          `models/${model}:generateContent`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );

        if (!response.success && response.errorInfo) {
          setError(response.errorInfo);
        }

        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [client, model, systemInstruction, formatHistory],
  );

  const streamMessage = useCallback(
    async (
      message: string,
      history: GeminiMessage[] = [],
      options: StreamingOptions = {},
    ): Promise<void> => {
      setIsStreaming(true);
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const contents = [
        ...formatHistory(history),
        { role: "user", parts: [{ text: message }] },
      ];

      const body: Record<string, unknown> = { contents };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      try {
        await client.streamRequest(
          `models/${model}:streamGenerateContent`,
          body,
          {
            ...options,
            signal: abortControllerRef.current.signal,
            onError: (err) => {
              const errorInfo = categorizeError(err);
              setError(errorInfo);
              options.onError?.(err);
            },
          },
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [client, model, systemInstruction, formatHistory],
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const listModels = useCallback(async (): Promise<string[]> => {
    const response = await client.request("models", { method: "GET" });
    if (response.success && response.data) {
      const models =
        (response.data as { models?: Array<{ name: string }> }).models || [];
      return models.map((m) => m.name.replace("models/", ""));
    }
    return [];
  }, [client]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    const response = await sendMessage("Hello", []);
    return response.success;
  }, [sendMessage]);

  return {
    isLoading,
    isStreaming,
    error,
    stats: client.getStats(),
    sendMessage,
    streamMessage,
    cancelStream,
    clearError,
    listModels,
    testConnection,
  };
};

// Context for app-wide usage
import React, { createContext, useContext, ReactNode } from "react";

interface GeminiContextValue extends UseGeminiReturn {
  apiKey: string;
  model: string;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
}

const GeminiContext = createContext<GeminiContextValue | null>(null);

interface GeminiProviderProps {
  children: ReactNode;
  initialApiKey?: string;
  initialModel?: string;
  config?: GeminiConfig;
  systemInstruction?: string;
}

export const GeminiProvider: React.FC<GeminiProviderProps> = ({
  children,
  initialApiKey = "",
  initialModel = "gemini-1.5-flash-latest",
  config,
  systemInstruction,
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [model, setModel] = useState(initialModel);

  const gemini = useGemini({
    apiKey,
    model,
    config,
    systemInstruction,
  });

  const value: GeminiContextValue = {
    ...gemini,
    apiKey,
    model,
    setApiKey,
    setModel,
  };

  return (
    <GeminiContext.Provider value={value}>{children}</GeminiContext.Provider>
  );
};

export const useGeminiContext = (): GeminiContextValue => {
  const context = useContext(GeminiContext);
  if (!context) {
    throw new Error("useGeminiContext must be used within a GeminiProvider");
  }
  return context;
};

export default useGemini;
