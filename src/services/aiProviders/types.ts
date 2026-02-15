/**
 * AI Provider Types
 * 
 * Type definitions for the AI provider system.
 * Supports multiple AI providers with a unified interface.
 */

/**
 * Base provider configuration
 */
export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

/**
 * Chat completion request options
 */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stop?: string | string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletion {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  id: string;
  model: string;
  created: number;
  content?: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | null;
  delta?: {
    role?: string;
    content?: string;
  };
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsJSON: boolean;
  maxTokens: number;
  supportedModels: string[];
  contextWindow: number;
}

/**
 * Authentication types
 */
export type AuthType = 'bearer' | 'api-key' | 'basic' | 'custom' | 'none';

/**
 * Request format types
 */
export type RequestFormat = 'openai' | 'anthropic' | 'google' | 'custom';

/**
 * Custom provider configuration
 */
export interface CustomProviderConfig extends ProviderConfig {
  id: string;
  authType: AuthType;
  requestFormat: RequestFormat;
  models: string[];
  customHeaders?: Record<string, string>;
  transformRequest?: (options: ChatCompletionOptions) => any;
  transformResponse?: (response: any) => ChatCompletion;
  transformStreamChunk?: (chunk: any) => StreamChunk;
}

/**
 * Provider status
 */
export interface ProviderStatus {
  isAvailable: boolean;
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  config: ProviderConfig | CustomProviderConfig;
  status?: ProviderStatus;
}

/**
 * Stored providers structure
 */
export interface StoredProviders {
  builtIn: {
    gemini?: { enabled: boolean; config: ProviderConfig };
    openai?: { enabled: boolean; config: ProviderConfig };
    anthropic?: { enabled: boolean; config: ProviderConfig };
  };
  custom: Array<{
    id: string;
    name: string;
    enabled: boolean;
    config: CustomProviderConfig;
    createdAt: number;
    updatedAt: number;
  }>;
  activeProvider: string; // Provider ID
  defaultProvider: string; // Fallback provider ID
}

/**
 * Provider test result
 */
export interface ProviderTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  modelsTested?: string[];
  capabilities?: ProviderCapabilities;
}

/**
 * Provider constructor type
 */
export type ProviderConstructor = new (
  config: ProviderConfig | CustomProviderConfig,
  providerName: string
) => any;

/**
 * Provider error types
 */
export enum ProviderErrorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  INVALID_REQUEST = 'invalid_request',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Provider error
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public type: ProviderErrorType,
    public statusCode?: number,
    public providerName?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  capabilities: string[];
}

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
  name: string;
  constructor: ProviderConstructor;
  metadata: {
    displayName: string;
    description: string;
    isBuiltIn: boolean;
  };
}
