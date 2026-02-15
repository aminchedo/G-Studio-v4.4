/**
 * Forwarding Registry - Step 1 Migration
 *
 * This module registers forwarding adapters for all tools in the monolithic switch statement.
 * Each adapter calls the old McpService.executeToolInternal() implementation.
 *
 * This is a non-breaking step that preserves existing behavior while enabling
 * the executor infrastructure to be used.
 */

import { ToolRegistry, getGlobalRegistry, Tool } from "./registry";
import { McpService } from "@/services/mcpService";
import { FileData } from "@/types/types";
import { McpToolCallbacks, McpToolResult } from "@/services/mcpService";

/**
 * Executor args format: { payload, files, callbacks, context }
 * Old signature: (tool, args, files, callbacks) => Promise<McpToolResult>
 */
interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, FileData>;
  callbacks?: McpToolCallbacks;
  context?: any;
}

/**
 * Create a forwarding adapter for a tool
 * Maps executor args format to old executeToolInternal signature
 */
function createForwardingAdapter(toolName: string): Tool {
  return {
    name: toolName,
    description: `Forwarding adapter for ${toolName} (calls legacy executeToolInternal)`,
    execute: async (args?: ExecutorArgs): Promise<any> => {
      // Extract arguments from executor format
      const payload = args?.payload || args || {};
      const files = args?.files || {};
      const callbacks = args?.callbacks || createDefaultCallbacks();

      // Call the old implementation
      const result = await McpService.executeToolInternal(
        toolName,
        payload,
        files,
        callbacks,
      );

      // Return in executor format (ToolExecutionResult)
      return {
        success: result.success,
        result: result.data,
        error: result.error,
        message: result.message,
        executionTime: result.executionTime,
      };
    },
  };
}

/**
 * Default callbacks for tools that don't need state updates
 */
function createDefaultCallbacks(): McpToolCallbacks {
  return {
    setFiles: () => {},
    setOpenFiles: () => {},
    setActiveFile: () => {},
    getActiveFile: () => null,
    getOpenFiles: () => [],
  };
}

/**
 * List of all tools from the switch statement in mcpService.tsx
 * Extracted from the switch cases
 */
const ALL_TOOLS = [
  // File Operations
  "create_file",
  "read_file",
  "write_code",
  "edit_file",
  "move_file",
  "delete_file",
  "search_files",
  "open_file",
  "get_file_info",

  // Code Operations
  "format_file",
  "search_in_file",
  "replace_in_file",
  "get_line",
  "get_lines",
  "insert_at_line",
  "replace_line",
  "delete_line",

  // Execution & Project
  "run",
  "project_overview",

  // Conversation Management
  "save_conversation",
  "load_conversation",
  "list_conversations",
  "delete_conversation",

  // Utility Tools
  "calculate",
  "get_current_time",
  "generate_uuid",
  "hash_text",
  "base64_encode",
  "base64_decode",
  "format_json",
  "text_transform",
  "generate_random",
  "color_converter",
  "unit_converter",

  // Token & Optimization
  "check_quota",
  "token_optimization_tips",
  "remove_comments",
  "compress_code",
  "optimize_prompt",
  "estimate_tokens",

  // Code Analysis Tools
  "analyze_code_quality",
  "detect_code_smells",
  "find_dependencies",
  "check_types",
  "lint_code",

  // Code Generation Tools
  "generate_component",
  "generate_test",
  "generate_documentation",
  "generate_types",
  "generate_api_client",

  // Refactoring Tools
  "extract_function",
  "rename_symbol",
  "optimize_imports",
  "split_file",
  "convert_syntax",

  // Advanced Operations
  "find_unused_code",
  "add_error_handling",
  "add_logging",
  "create_barrel_export",
  "setup_path_aliases",
];

/**
 * Register all forwarding adapters in the global registry
 * This populates the registry with forwarding wrappers that call the old implementation
 */
export function registerForwardingTools(): void {
  const registry = getGlobalRegistry();

  console.log(
    `[FORWARDING_REGISTRY] Registering ${ALL_TOOLS.length} forwarding adapters...`,
  );

  for (const toolName of ALL_TOOLS) {
    const adapter = createForwardingAdapter(toolName);
    registry.registerTool(adapter);
  }

  console.log(
    `[FORWARDING_REGISTRY] ✅ Registered ${ALL_TOOLS.length} forwarding tools`,
  );
}

/**
 * Initialize forwarding registry at module load
 * This ensures tools are registered when the module is imported
 *
 * NOTE: Tools that have been migrated will be registered directly,
 * not via forwarding adapters. This function only registers tools
 * that haven't been migrated yet.
 */
registerForwardingTools();
