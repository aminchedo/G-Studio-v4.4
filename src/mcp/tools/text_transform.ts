/**
 * text_transform Tool
 *
 * Extracted from mcpService.tsx - transforms text (uppercase, lowercase, etc.)
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const text_transform: Tool = {
  name: "text_transform",
  description: "Transforms text (uppercase, lowercase, capitalize, etc.)",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const text = payload["text"];
    const operation = payload["operation"];

    // Call UtilityTools.textTransform (preserving original implementation)
    return UtilityTools.textTransform(text, operation);
  },
};

export default text_transform;
