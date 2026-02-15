/**
 * base64_decode Tool
 *
 * Extracted from mcpService.tsx - decodes base64 text
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const base64_decode: Tool = {
  name: "base64_decode",
  description: "Decodes base64 text",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const text = payload["text"];

    // Call UtilityTools.base64Decode (preserving original implementation)
    return UtilityTools.base64Decode(text);
  },
};

export default base64_decode;
