/**
 * read_file Tool
 *
 * Extracted from mcpService.tsx - reads a file from the in-memory filesystem
 */

import { Tool } from "./registry";
import { ToolValidator } from "@/services/security/toolValidator";
import { FileData } from "@/types/types";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, FileData>;
  callbacks?: any;
  context?: any;
}

export const read_file: Tool = {
  name: "read_file",
  description: "Reads a file from the in-memory filesystem",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const files = args?.files || {};

    // Validate inputs
    const validated = ToolValidator.validateOrThrow(payload, [
      ToolValidator.filePathRules("path", true),
    ]);

    const path = validated["path"];
    const file = files[path];

    if (!file) {
      return {
        success: false,
        message: `File ${path} not found. Available files: ${Object.keys(files).join(", ") || "none"}`,
        error: "FILE_NOT_FOUND",
      };
    }

    return {
      success: true,
      message: `File ${path} read successfully`,
      data: {
        content: file.content,
        language: file.language,
        size: file.content.length,
        lines: file.content.split("\n").length,
      },
    };
  },
};

export default read_file;
