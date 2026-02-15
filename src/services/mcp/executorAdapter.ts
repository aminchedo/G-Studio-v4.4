/**
 * Executor Adapter - Step 2 Migration
 *
 * Adapter that bridges the old McpService.executeToolInternal() signature
 * with the new executor infrastructure.
 *
 * This adapter:
 * 1. Maps old signature (tool, args, files, callbacks) to executor format
 * 2. Calls executor if available
 * 3. Falls back to old implementation if executor is not available
 */

import { getGlobalExecutor } from "../../mcp/runtime/executor";
import { McpService } from "../mcpService";
import { FileData } from "@/types/types";
import { McpToolCallbacks, McpToolResult } from "../mcpService";

/**
 * Execute tool via executor (new path) or fallback to old implementation
 *
 * @param toolName - Tool name to execute
 * @param args - Tool arguments
 * @param files - In-memory files object
 * @param callbacks - State update callbacks
 * @returns Tool execution result
 */
export async function executeViaExecutor(
  toolName: string,
  args: Record<string, any>,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  // Check if executor should be used (default: use executor if available)
  const useExecutor = process.env["USE_EXECUTOR"] !== "false";

  if (!useExecutor) {
    // Fallback: original behavior preserved
    return McpService.executeToolInternal(toolName, args, files, callbacks);
  }

  try {
    // Get global executor
    const executor = getGlobalExecutor();

    if (!executor) {
      // Fallback if executor not initialized
      console.warn(
        "[EXECUTOR_ADAPTER] Executor not available, falling back to old implementation",
      );
      return McpService.executeToolInternal(toolName, args, files, callbacks);
    }

    // Map old signature to executor format
    const executorArgs = {
      payload: args,
      files: files,
      callbacks: callbacks,
    };

    // Execute via executor
    const result = await executor.execute(toolName, executorArgs);

    // Map executor result back to McpToolResult format
    return {
      success: result.success,
      message: result.error || "Tool executed successfully",
      data: result.result,
      error: result.error,
      executionTime: result.executionTime,
    };
  } catch (error: any) {
    // If executor fails, fallback to old implementation
    console.warn(
      "[EXECUTOR_ADAPTER] Executor execution failed, falling back:",
      error.message,
    );
    return McpService.executeToolInternal(toolName, args, files, callbacks);
  }
}
