export type AIProvider = "gemini" | "openai" | "anthropic" | "local";

export type AIModel =
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "claude-3-opus"
  | "claude-3-sonnet";

export type FinishReason =
  | "stop"
  | "length"
  | "safety"
  | "error"
  | "tool_calls";

export type ModelStatus = "idle" | "loading" | "streaming" | "error";

export interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  cacheConfig?: CacheConfig;

  // Behavior configuration
  persona?:
    | "helpful"
    | "concise"
    | "detailed"
    | "creative"
    | "professional"
    | "casual"
    | "technical";
  responseStyle?:
    | "conversational"
    | "formal"
    | "bullet-points"
    | "detailed"
    | "concise";
  codeStyle?: "clean" | "documented" | "minimal" | "robust" | "performant";
  executionMode?: "memory" | "filesystem" | "hybrid" | "sandboxed";

  // Advanced settings
  autoFormat?: boolean;
  apiEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;

  // Voice/TTS configuration
  voiceEnabled?: boolean;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  language?: string;

  // Local AI configuration
  localAIEnabled?: boolean;
  localModel?: string;
  localEndpoint?: string;
  fallbackToCloud?: boolean;
  promptImprovement?: boolean;

  // Streaming and notifications
  enableStreaming?: boolean;
  notifications?: boolean;
  selectedModel?: AIModel;

  // Auto-speak
  autoSpeak?: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

export interface AIRequest {
  model: AIModel;
  messages: AIMessage[];
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  tools?: AITool[];
  toolChoice?: "auto" | "required" | "none";
}

export interface AIMessage {
  role: "user" | "assistant" | "system" | "model" | "function";
  content: string;
  name?: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

export interface AIToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: string[];
  items?: AIToolParameter;
  properties?: Record<string, AIToolParameter>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  id: string;
  model: AIModel;
  content: string;
  finishReason: FinishReason;
  usage: TokenUsage;
  toolCalls?: AIToolCall[];
  metadata?: AIResponseMetadata;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResponseMetadata {
  latency: number;
  cost?: number;
  cached?: boolean;
  retryCount?: number;
  modelVersion?: string;
}

export interface AIStreamChunk {
  id: string;
  delta: string;
  done: boolean;
  usage?: Partial<TokenUsage>;
}

export interface AIError extends Error {
  code: string;
  statusCode?: number;
  provider: AIProvider;
  model?: AIModel;
  retryable: boolean;
  context?: Record<string, unknown>;
}

export interface ModelInfo {
  id: AIModel;
  provider: AIProvider;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  pricing?: ModelPricing;
}

export type ModelCapability =
  | "text-generation"
  | "code-generation"
  | "function-calling"
  | "vision"
  | "audio"
  | "streaming";

export interface ModelPricing {
  promptPrice: number;
  completionPrice: number;
  currency: string;
  per: number;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  resetAt: Date;
  remaining: number;
}

export interface CircuitBreakerState {
  status: "closed" | "open" | "half-open";
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  nextAttemptAt?: Date;
}
