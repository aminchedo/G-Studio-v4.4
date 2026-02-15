/**
 * Additional Type Definitions for G-Studio
 *
 * This file contains type definitions that are referenced across the codebase
 * but were not yet defined in the main type files.
 */

// ==================== EDITOR TYPES ====================

export interface EditorConfig {
  language?: string;
  theme: string;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoComplete?: boolean;
  formatOnSave?: boolean;
  formatOnPaste?: boolean;
}

export interface EditorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  start: EditorPosition;
  end: EditorPosition;
}

// ==================== PREVIEW TYPES ====================

export interface PreviewConfig {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshDelay?: number;
  showErrors?: boolean;
  mode: "live" | "manual" | "auto" | "split" | "code" | "preview";
  splitOrientation?: "horizontal" | "vertical";
  splitRatio?: number;
  hotReload?: boolean;
  autoSave?: boolean;
  syncScroll?: boolean;
  refreshRate?: number;
}

export interface PreviewError {
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning" | "info";
}

// ==================== PROJECT TYPES ====================

/** Project file structure */
export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: string;
  lastModified: Date;
  size: number;
  encoding?: string;
  isModified?: boolean;
  version?: number | string;
}

/** Project structure from core types */
export interface Project {
  id: string;
  name: string;
  description: string;
  created: Date;
  updated: Date;
  files: ProjectFile[];
  settings: {
    defaultLanguage: string;
    autoSave: boolean;
    autoFormat: boolean;
    theme: string;
  };
}

// ==================== EXTENDED MESSAGE TYPES ====================

/** Base message interface (minimal required fields) */
export interface BaseMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

/** Extended message with additional fields for context and analysis */
export interface ExtendedMessage extends BaseMessage {
  /** Relevance score for context building */
  relevance?: number;
  /** Summary of message content */
  summary?: string;
  /** Extracted entities or key points */
  entities?: string[];
  /** Related message IDs */
  relatedMessages?: string[];
  /** Token count estimate */
  tokenCount?: number;
  /** Whether this message is included in current context */
  inContext?: boolean;
  /** Legacy metadata field for backward compatibility */
  metadata?: Record<string, unknown>;
  /** Legacy files field */
  files?: unknown[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  isError?: boolean;
  /** Tool calls */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments?: Record<string, any>;
  }>;
}

// ==================== EVENT BUS TYPES ====================

export type EventNames =
  | "file:created"
  | "file:updated"
  | "file:deleted"
  | "editor:changed"
  | "conversation:updated"
  | "error:occurred"
  | "network:status"
  | string;

// ==================== CONTEXT BUILDER TYPES ====================

export interface ContextBuildOptions {
  maxTokens?: number;
  includeFiles?: boolean;
  includeHistory?: boolean;
  relevanceThreshold?: number;
}

export interface ContextSummary {
  totalTokens: number;
  messageCount: number;
  fileCount: number;
  truncated: boolean;
}

export interface MessageRelevance {
  messageId: string;
  score: number;
  reasons: string[];
}

// ==================== MCP TOOL TYPES ====================

export interface McpToolCallbacks {
  onProgress?: (progress: number, message?: string) => void;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export interface CreateFileArgs {
  path: string;
  content: string;
  overwrite?: boolean;
  language?: string;
}

export interface ReadFileArgs {
  path: string;
  encoding?: string;
}

export interface WriteCodeArgs {
  path: string;
  code: string;
  language?: string;
}

export interface EditFileArgs {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
  edits?: Array<{ start: number; end: number; text: string }>;
}

export interface DeleteFileArgs {
  path: string;
  force?: boolean;
}

export interface MoveFileArgs {
  from: string;
  to: string;
  overwrite?: boolean;
  oldPath?: string;
  newPath?: string;
}

export interface SearchFilesArgs {
  pattern: string;
  directory?: string;
  maxResults?: number;
  caseSensitive?: boolean;
  includeContent?: boolean;
  fileTypes?: string[];
}

export type ToolCategory =
  | "file"
  | "code"
  | "conversation"
  | "analysis"
  | "documentation"
  | "utility"
  | "security"
  | "testing";

// ==================== API CLIENT TYPES ====================

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface APIRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

export interface APIRequestResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface APIClientStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastRequestTime?: Date;
}

// ==================== ERROR HANDLING TYPES ====================

export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  stack?: string;
}

export type ErrorCategory =
  | "network"
  | "api"
  | "validation"
  | "authentication"
  | "authorization"
  | "timeout"
  | "unknown"
  | "not_found"
  | "server_error"
  | "invalid_request"
  | "model_error"
  | "rate_limit"
  | "server"
  | "client";

/** Error severity enum - placeholder if not imported from utils */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export type ErrorAction =
  | "retry"
  | "ignore"
  | "fail"
  | "fallback"
  | "report"
  | "retry_with_backoff"
  | "retry_with_exponential_backoff"
  | "contact_support"
  | "check_credentials"
  | "check_model_availability"
  | "none"
  | "notify"
  | "abort";

export type ModelFailureReason =
  | "rate_limit"
  | "invalid_key"
  | "network_error"
  | "timeout"
  | "safety_filter"
  | "context_length"
  | "unknown"
  | "quota_exhausted"
  | "permission_denied"
  | "model_disabled";

// ==================== STREAMING TYPES ====================

export interface StreamChunk {
  id?: string;
  delta?: string;
  done?: boolean;
  model?: string;
  usage?: UsageMetadata;
  text?: string;
  error?: string;
  providerLimit?: ProviderLimitInfo;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments?: Record<string, any>;
    args?: Record<string, any>;
  }>;
}

export interface UsageMetadata {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cost?: number;
  cached?: boolean;
}

// ==================== PROVIDER LIMIT TYPES ====================

export interface ProviderLimitInfo {
  provider?: string;
  requestsPerMinute?: number;
  requestsPerDay?: number;
  tokensPerMinute?: number;
  tokensPerDay?: number;
  limitType?: string;
  currentUsage?: {
    requestsThisMinute: number;
    requestsToday: number;
    tokensThisMinute: number;
    tokensToday: number;
  };
  resetTime?: Date;
  retryAfter?: number;
  message?: string;
}

// ==================== DEBUG TYPES ====================

export type DebugScope = "global" | "service" | "component" | "hook" | "store";

// ==================== GEMINI SERVICE TYPES ====================

export interface StreamProcessor {
  process(chunk: StreamChunk): void;
  complete(): void;
  error(error: Error): void;
}

// ==================== HELPER FUNCTIONS ====================

export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  if (message.includes("network") || message.includes("fetch"))
    return "network";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("auth") || message.includes("unauthorized"))
    return "authentication";
  if (message.includes("rate limit") || message.includes("429"))
    return "rate_limit";
  if (message.includes("not found") || message.includes("404"))
    return "not_found";
  if (message.includes("server") || message.includes("500"))
    return "server_error";
  return "unknown";
}

export function createApiClient(
  baseUrl: string,
  apiKey: string,
): {
  baseUrl: string;
  apiKey: string;
} {
  return {
    baseUrl,
    apiKey,
  };
}
