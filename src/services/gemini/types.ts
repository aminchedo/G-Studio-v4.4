/**
 * Gemini Service Types
 *
 * Complete type definitions for the modular Gemini service
 */

// ==================== CONFIGURATION ====================

export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  quotaConfig?: QuotaConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface QuotaConfig {
  maxTokensPerMinute: number;
  maxTokensPerDay: number;
  maxRequestsPerMinute: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxAttempts: number;
}

// ==================== REQUEST/RESPONSE ====================

export interface GeminiRequest {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface GeminiResponse {
  text: string;
  model: string;
  usage: TokenUsage;
  finishReason: FinishReason;
  safetyRatings?: SafetyRating[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type FinishReason = "stop" | "length" | "safety" | "error" | "other";

export interface SafetyRating {
  category: string;
  probability: "NEGLIGIBLE" | "LOW" | "MEDIUM" | "HIGH";
}

export interface GeminiStreamChunk {
  text: string;
  done: boolean;
  usage?: Partial<TokenUsage>;
}

// ==================== MODEL INFORMATION ====================

export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  maxTokens: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  capabilities: ModelCapability[];
  contextWindow: number;
  description?: string;
}

export type ModelCapability =
  | "text"
  | "code"
  | "vision"
  | "audio"
  | "long-context"
  | "function-calling";

export interface ModelSelectionCriteria {
  maxTokens?: number;
  capabilities?: ModelCapability[];
  maxBudget?: number;
  preferredModels?: string[];
}

// ==================== QUOTA MANAGEMENT ====================

export interface QuotaStatus {
  tokensUsedToday: number;
  tokensRemainingToday: number;
  tokensUsedThisMinute: number;
  requestsThisMinute: number;
  canMakeRequest: boolean;
  resetTime: Date;
}

export interface QuotaRecord {
  timestamp: Date;
  tokens: number;
  cost: number;
}

// ==================== CIRCUIT BREAKER ====================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerStatus {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

// ==================== CACHE ====================

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  expiresAt: Date;
  hits: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  // Added for consistent naming - from src/services/gemini/cache.ts
  cacheName?: string;
  // Added for consistent naming - from src/services/gemini/cache.ts
  cacheStore?: "memory" | "indexeddb";
}

// ==================== CLIENT INTERFACE ====================

export interface IGeminiClient {
  sendRequest(request: GeminiRequest): Promise<GeminiResponse>;
  sendStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: GeminiStreamChunk) => void,
  ): Promise<void>;
}

// ==================== ERROR TYPES ====================

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: GeminiErrorCode,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export enum GeminiErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  INVALID_API_KEY = "INVALID_API_KEY",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  RATE_LIMITED = "RATE_LIMITED",
  INVALID_REQUEST = "INVALID_REQUEST",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
  SAFETY_BLOCK = "SAFETY_BLOCK",
  UNKNOWN = "UNKNOWN",
}

// ==================== TELEMETRY ====================

export interface TelemetryEvent {
  type: "request" | "response" | "error" | "retry";
  timestamp: Date;
  model: string;
  duration?: number;
  tokens?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TelemetryStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  modelUsage: Record<string, number>;
}
