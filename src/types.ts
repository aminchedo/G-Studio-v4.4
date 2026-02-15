
// Re-export canonical runtime types for compatibility across the codebase
// Many modules imported different type definitions which caused type
// mismatches. Centralize exports here so files that import from
// '@/types' will get the canonical runtime types.
export * from "@/mcp/runtime/types";

// Provide lightweight backward-compatible aliases for older shapes that
// some modules still referenced (e.g., ToolCall.args vs ToolCall.arguments).
// These aliases keep the API stable while consolidating the source of truth
// in `@/mcp/runtime/types`.

import type {
  ToolCall as RuntimeToolCall,
  ToolResult as RuntimeToolResult,
  Message as RuntimeMessage,
  FileData as RuntimeFileData,
} from "@/mcp/runtime/types";

// Back-compat: older code used `ToolCall.args` instead of `arguments`.
export type ToolCall = RuntimeToolCall & { args?: RuntimeToolCall["arguments"] };

// Back-compat for ToolResult shape
export type ToolResult = RuntimeToolResult;

// Re-export Message and FileData under the local module name
export type Message = RuntimeMessage;
export type FileData = RuntimeFileData;

// Keep legacy ChatState shape for modules that referenced it
export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  selectedModel: ModelId;
  files: Record<string, FileData>;
  openFiles: string[];
  filesystemMode?: "memory" | "filesystem";
}
