/**
 * create_file Tool
 *
 * Extracted from mcpService.tsx - creates a new file in the in-memory filesystem
 */

import { Tool } from "./registry";
import { ToolValidator } from "@/services/security/toolValidator";
import { StateTransaction } from "@/services/stateTransaction";
import { FileData } from "@/types/types";
import { McpToolCallbacks } from "@/services/mcpService";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, FileData>;
  callbacks?: McpToolCallbacks;
  context?: any;
}

export const create_file: Tool = {
  name: "create_file",
  description: "Creates a new file in the in-memory filesystem",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const files = args?.files || {};
    const callbacks = args?.callbacks || createDefaultCallbacks();

    // Validate inputs
    const validated = ToolValidator.validateOrThrow(payload, [
      ToolValidator.filePathRules("path", false),
      ToolValidator.filePathRules("filename", false),
      ToolValidator.fileContentRules("content", false),
    ]);

    const path = validated["path"] || validated["filename"];
    const content = validated["content"] || "";

    if (!path) {
      return {
        success: false,
        message: "Path or filename is required",
        error: "MISSING_PATH",
      };
    }

    // Check if file already exists
    if (files[path]) {
      return {
        success: false,
        message: `File ${path} already exists. Use write_code or edit_file to modify it.`,
        error: "FILE_EXISTS",
      };
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      content,
      null, // No old content (new file)
      callbacks.setFiles,
      path.split(".").pop() || "plaintext",
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to create file ${path}`,
        error: result.error?.message || "TRANSACTION_FAILED",
      };
    }

    // Update UI state
    if (!callbacks.getOpenFiles().includes(path)) {
      callbacks.setOpenFiles((prev) => [...prev, path]);
    }
    callbacks.setActiveFile(path);

    return {
      success: true,
      message: `File ${path} created successfully`,
      data: { path, content },
    };
  },
};

function createDefaultCallbacks(): McpToolCallbacks {
  return {
    setFiles: () => {},
    setOpenFiles: () => {},
    setActiveFile: () => {},
    getActiveFile: () => null,
    getOpenFiles: () => [],
  };
}

export default create_file;
