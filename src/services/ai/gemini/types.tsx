import type { AIModel, RetryConfig, AIRequest, AIResponse, AIStreamChunk } from '@/types/ai';

export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: AIModel;
  timeout?: number;
  retryConfig?: RetryConfig;
}

export interface GeminiRequest extends AIRequest {
  model: AIModel;
}

export interface GeminiResponse extends AIResponse {
  cached?: boolean;
}

export interface IGeminiClient {
  sendRequest(request: GeminiRequest): Promise<GeminiResponse>;
  sendStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<void>;
  getModels(): Promise<string[]>;
}

export const DEFAULT_GEMINI_CONFIG: Partial<GeminiConfig> = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  defaultModel: 'gemini-2.0-flash-exp',
  timeout: 30000,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['RATE_LIMIT_EXCEEDED', 'INTERNAL', 'UNAVAILABLE'],
  },
};

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}
