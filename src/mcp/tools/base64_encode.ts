/**
 * base64_encode Tool
 *
 * Extracted from mcpService.tsx - encodes text to base64
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const base64_encode: Tool = {
  name: "base64_encode",
  description: "Encodes text to base64",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const text = payload["text"];

    // Call UtilityTools.base64Encode (preserving original implementation)
    return UtilityTools.base64Encode(text);
  },
};

export default base64_encode;
