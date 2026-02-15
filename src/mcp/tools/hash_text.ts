/**
 * hash_text Tool
 *
 * Extracted from mcpService.tsx - hashes text using various algorithms
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const hash_text: Tool = {
  name: "hash_text",
  description: "Hashes text using various algorithms (MD5, SHA1, SHA256, etc.)",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const text = payload["text"];
    const algorithm = payload["algorithm"];

    // Call UtilityTools.hashText (preserving original implementation)
    return await UtilityTools.hashText(text, algorithm);
  },
};

export default hash_text;
