// Core MCP Runtime Types
// This file centralizes all common type definitions for the MCP runtime,
// ensuring consistency across tools, services, and UI components.

export interface FileData {
  content: string;
  language: string;
  path: string;
  // Added 'name' property as required by errors
  name: string;
  // Changed to Date object as required by errors
  lastModified: Date;
  size?: number;
  encoding?: string;
  isModified?: boolean;
  version?: string | number;
}

// McpToolCallbacks (from src/services/mcp/types.ts and initial definition)
export type McpToolCallbacks = {
  setFiles: (
    updater: (prev: Record<string, FileData>) => Record<string, FileData>,
  ) => void;
  setOpenFiles: (updater: (prev: string[]) => string[]) => void;
  setActiveFile: (file: string | null) => void;
  getActiveFile: () => string | null;
  getOpenFiles: () => string[];
  getTokenUsage?: () => { prompt: number; response: number };
  getSelectedModel?: () => string;
};

// McpToolResult (from src/services/mcp/types.ts and initial definition)
export interface McpToolResult {
  success: boolean;
  message: string;
  data?: any;
  // Changed to 'any' to resolve "Property 'message' does not exist on type 'string'."
  error?: any;
  warnings?: string[];
  executionTime?: number;
}

// ExecutorArgs (from initial definition)
export interface ExecutorArgs {
  tool: string;
  payload: Record<string, any>;
  files: Record<string, FileData>;
  callbacks: McpToolCallbacks;
}

// ExecutionContext (from initial definition)
export interface ExecutionContext {
  getFiles: () => Record<string, FileData>;
  getActiveFile: () => string | null;
  getOpenFiles: () => string[];
  getTokenUsage?: () => { prompt: number; response: number };
  getSelectedModel?: () => string;
}

// MessageRole (from src/types/conversation.ts)
export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "model"
  | "function";

// MessageStatus (from src/types/conversation.ts)
export type MessageStatus = "pending" | "sending" | "sent" | "error";

// ToolCall (from src/types/conversation.ts)
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  args?: Record<string, unknown>;
}

// ToolResult (from src/types/conversation.ts)
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
  name?: string;
  id?: string;
}

// MessageMetadata (from src/types/conversation.ts)
export interface MessageMetadata {
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  latency?: number;
  error?: string;
}

// Message (from src/types/conversation.ts)
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date | number;
  status?: MessageStatus;
  metadata?: MessageMetadata;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isLoading?: boolean;
  isError?: boolean;
  /** Set when stream was cancelled by user */
  isCancelled?: boolean;
  /** When isError/isCancelled/isProviderLimit, prompt to re-send for retry/resume */
  retryPrompt?: string;
  /** Incremented on each chunk batch during streaming (cursor reaction) */
  streamingChunkKey?: number;
  /** Inline provider-limit message (e.g. quota) */
  isProviderLimit?: boolean;
  image?: string | { url: string; alt?: string };
}

// MessageRelevance (from src/types/conversation.ts)
export interface MessageRelevance {
  messageId: string;
  score: number;
  reason: string;
}

// Agent (from src/services/multiAgentService.ts)
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  systemPrompt: string;
  color: string;
  icon: string;
  capabilities: string[];
}

// AgentRole (from src/services/multiAgentService.ts) - moved here
export type AgentRole =
  | "user"
  | "assistant"
  | "system"
  | "tool"
  | "multi-agent";

// AgentConfig (from src/features/ai/AISettingsHub/types.ts)
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  modelId: string | null;
  color: string;
}

// AgentThought (inferred from usage)
export interface AgentThought {
  agentId: string;
  thought: string;
  timestamp: Date;
}

// AgentMessage (inferred from usage, similar to Message but agent-specific)
export interface AgentMessage extends Message {
  agentId: string;
}

// AgentStep (inferred from usage)
export interface AgentStep {
  agentId: string;
  step: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: Date;
}

// AgentRegistry (inferred from usage)
export interface AgentRegistry {
  agents: Agent[];
  registerAgent: (agent: Agent) => void;
  getAgent: (id: string) => Agent | undefined;
}

// AgentConfigProfile (inferred from usage)
export interface AgentConfigProfile {
  id: string;
  name: string;
  description: string;
  config: AIConfig;
}

// TestResult (from src/features/ai/AISettingsHub/types.ts)
export interface TestResult {
  modelId: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: number;
}

// ConnectionStatus (from src/features/ai/AISettingsHub/types.ts)
export interface ConnectionStatus {
  connected: boolean;
  latency: number;
  lastChecked: number;
  error?: string;
}

// ErrorCategory (canonical - used by gemini errorHandler)
export type ErrorCategory =
  | "api"
  | "code"
  | "network"
  | "system"
  | "user"
  | "rate_limit"
  | "authentication"
  | "not_found"
  | "server_error"
  | "invalid_request"
  | "model_error"
  | "unknown";

// ErrorSeverity (from src/services/errorHandling/ErrorPresentation.ts)
export type ErrorSeverity =
  | "info"
  | "warning"
  | "error"
  | "critical"
  | "low"
  | "medium"
  | "high";

// ErrorInfo (canonical - used by apiClient, errorHandler, ErrorManager, ErrorPresentation)
export interface ErrorInfo {
  id?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp?: Date;
  details?: unknown;
  action?: ErrorAction;
  title?: string;
  suggestion?: string;
  suggestedFix?: string;
  retryable?: boolean;
  type?: string;
  code?: string;
  location?: { file: string; line: number; column: number };
  actionCallback?: () => void;
  recovery?: {
    autoRetry?: boolean;
    maxRetries?: number;
    fallback?: () => void;
    retryDelay?: number;
  };
  helpLink?: string;
  stack?: string[];
  reporting?: {
    copyToClipboard?: () => string;
    logToConsole?: boolean;
    sendTelemetry?: boolean;
  };
  metadata?: Record<string, unknown>;
  originalError?: unknown;
}

// ErrorAction: string (e.g. 'retry_with_backoff') or object for UI
export type ErrorAction = string | { label: string; handler: string };

// ModelFailureReason (canonical - includes all used in gemini errorHandler)
export type ModelFailureReason =
  | "rate_limit"
  | "authentication"
  | "not_found"
  | "server_error"
  | "invalid_request"
  | "model_error"
  | "quota_exhausted"
  | "permission_denied"
  | "model_disabled"
  | "timeout"
  | "network_error"
  | "unknown";

// ModelId (defined as string or enum)
// Based on usage, it appears to be a string.
export const ModelId = {
  Gemini3FlashPreview: "gemini-3.0-flash-preview",
  Gemini3ProPreview: "gemini-3.0-pro-preview",
  GeminiFlashLatest: "gemini-flash-latest",
  GeminiFlashLiteLatest: "gemini-flash-lite-latest",
  Gemini2Flash: "gemini-2.0-flash",
  Gemini2FlashThinking: "gemini-2.0-flash-thinking-exp",
  Gemini15Pro: "gemini-1.5-pro",
  Gemini15Flash: "gemini-1.5-flash",
  Gemini15Flash8B: "gemini-1.5-flash-8b",
} as const;

export type ModelId = (typeof ModelId)[keyof typeof ModelId];

// ModelOption (from src/config/constants.ts, assumed simple interface for now)
export interface ModelOption {
  id: string;
  label: string;
  name?: string;
  description?: string;
  value: string;
}

// AIConfig (inferred from usage in AISettingsHub, and AgentConfigProfile)
export interface AIConfig {
  modelId: ModelId;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stopSequences?: string[];
  // Add any other properties inferred from usage in AISettingsHub
}

// PersonaType (canonical - used by AISettingsHub)
export type PersonaType =
  | "default"
  | "code-assistant"
  | "creative"
  | "professional"
  | "friendly"
  | "concise";

// ResponseStyleType (canonical - used by AISettingsHub)
export type ResponseStyleType =
  | "concise"
  | "balanced"
  | "detailed"
  | "conversational"
  | "step-by-step";

// CodeStyleType (canonical - used by AISettingsHub)
export type CodeStyleType = "clean" | "idiomatic" | "functional" | "modern";

// ExecutionModeType (canonical - used by AISettingsHub and ModelsTab)
export type ExecutionModeType =
  | "auto"
  | "manual"
  | "assisted"
  | "hybrid"
  | "memory"
  | "filesystem";

// Logger (canonical - used by apiClient defaultLogger)
export interface Logger {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
  success?: (msg: string, data?: unknown) => void;
  warning?: (msg: string, data?: unknown) => void;
}

// APIRequestOptions (canonical - used by apiClient)
export interface APIRequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  maxRetries?: number;
  method?: string;
  body?: unknown;
}

// APIRequestResult (canonical - used by apiClient request())
export interface APIRequestResult<T> {
  data?: T;
  error?: string | ErrorInfo;
  errorInfo?: ErrorInfo;
  status?: number;
  ok?: boolean;
  success?: boolean;
  responseTime?: number;
  attempt?: number;
  retryable?: boolean;
}

// APIClientStats (canonical - used by apiClient getStats())
export interface APIClientStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency?: number;
  successRate?: number;
  total?: number;
  success?: number;
  failed?: number;
  retries?: number;
}

// McpToolMetadata (from src/services/mcp/types.ts - assuming this is the full definition)
export interface McpToolMetadata {
  name: string;
  category: ToolCategory; // Need to define ToolCategory
  description: string;
  args: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: any;
  }>;
  returns: {
    type: string;
    description: string;
  };
  examples?: Array<{
    args: Record<string, any>;
    description: string;
  }>;
}

// McpTool interface (inferred from registry.ts and usage)
export interface McpTool {
  name: string;
  description: string;
  execute: (
    args: ExecutorArgs,
    ctx: ExecutionContext,
  ) => Promise<McpToolResult>;
}

// ToolCategory (from src/services/mcp/types.ts)
export enum ToolCategory {
  FILE_OPERATIONS = "file_operations",
  CODE_ANALYSIS = "code_analysis",
  CODE_GENERATION = "code_generation",
  REFACTORING = "refactoring",
  UTILITY = "utility",
  CONVERSATION = "conversation",
  ADVANCED = "advanced",
}

// ==================== CONTEXT BUILDING (canonical for foundation layer) ====================
// Same shape as @/types/conversation - avoids circular re-export.

export interface ContextBuildOptions {
  maxTokens?: number;
  includeSystemPrompt?: boolean;
  includePreviousMessages?: number;
  includeToolCalls?: boolean;
  includeMetadata?: boolean;
  prioritizeRecent?: boolean;
  messages?: Message[];
  files?: Record<string, unknown>;
  currentTask?: string;
  includeFiles?: boolean;
}

export interface ContextSummary {
  totalMessages: number;
  totalTokens?: number;
  includedMessages?: number;
  truncated?: boolean;
  summary?: string;
  selectedMessages?: string[] | number[];
  estimatedTokens?: number;
  topics?: string[];
  timeRange?: { start: Date; end: Date };
}

// Re-exports for foundation layer single-source imports (no cycle: these files do not import from mcp/runtime/types)
export type { Theme } from "@/types/core";
export type { Project, ProjectFile } from "@/types/additional";
