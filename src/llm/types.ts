/**
 * LLM Gateway Types
 * Type definitions for the optimized LLM interaction layer
 */

export type ProviderType = 'gemini' | 'openai' | 'generic';

export interface LLMRequest {
  userInput: string;
  history?: string[];
  apiKey: string;
  endpoint?: string;
  modelId?: string;
  systemInstruction?: string;
  image?: string;
  provider?: ProviderType;
  useContextAbstraction?: boolean;
}

export interface LLMResponse {
  text: string;
  tokens?: {
    prompt: number;
    response: number;
    total: number;
  };
  cached?: boolean;
  cost?: number; // Cost in USD
  quotaRemaining?: {
    remainingCost: number;
    percentageUsed: number;
  };
}

export interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

export interface CacheEntry {
  key: string;
  response: string;
  timestamp: number;
  tokens?: {
    prompt: number;
    response: number;
  };
}
