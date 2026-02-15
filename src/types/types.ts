// This file re-exports types from other modules to consolidate them under `@/types/types`
// This is to maintain compatibility and simplify imports across the application.

// Re-export ModelId as value (const) so it can be used as both value and type
export { ModelId } from "../mcp/runtime/types";

// Re-export core types from MCP runtime
export type {
  FileData,
  Message,
  AgentConfig,
  McpToolResult,
  McpToolCallbacks,
  TestResult,
  PersonaType,
  ResponseStyleType,
  CodeStyleType,
  ExecutionModeType,
  Logger,
  APIRequestOptions,
  APIRequestResult,
  APIClientStats,
  ErrorCategory,
  ErrorSeverity,
  ErrorAction,
  ErrorInfo,
  ModelFailureReason,
  AgentThought,
  AgentMessage,
  AgentStep,
  Agent,
  AgentRegistry,
  AgentConfigProfile,
  McpTool,
  McpToolMetadata,
  ExecutorArgs,
  ExecutionContext,
  AgentRole,
  ConnectionStatus,
  ModelOption,
} from "../mcp/runtime/types";

export type { Theme, EditorLanguage, ViewMode } from "./core";

// Re-export other necessary types
export type { ToolCall, ToolResult } from "./conversation";
export type { ExportInfo, ASTSnapshot, ImportInfo } from "./codeIntelligence";
export type { IpcEventMap, IpcRequestMap, RendererIpcApi } from "./ipc";
export { DEVICE_PRESETS } from "./preview";
export type { ResponsiveTestConfig, PreviewConfig } from "./preview";
export { categorizeError, createApiClient } from "./additional";
export type {
  CreateFileArgs,
  ReadFileArgs,
  WriteCodeArgs,
  EditFileArgs,
  MoveFileArgs,
  DeleteFileArgs,
  SearchFilesArgs,
  ToolCategory,
} from "./additional";
export type { ModelInfo, AIConfig } from "../features/ai/AISettingsHub/types";
export { DEFAULT_CONFIG } from "../features/ai/AISettingsHub/types";
export { combinePatterns } from "./uiPatterns";
export type { UIPatternKey, BadgeVariant } from "./uiPatterns";
