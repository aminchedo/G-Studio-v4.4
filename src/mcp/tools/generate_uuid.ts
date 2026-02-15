/**
 * generate_uuid Tool
 *
 * Extracted from mcpService.tsx - generates UUIDs
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const generate_uuid: Tool = {
  name: "generate_uuid",
  description: "Generates UUIDs (v1 or v4)",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const version = payload["version"];
    const count = payload["count"];

    // Call UtilityTools.generateUUID (preserving original implementation)
    return UtilityTools.generateUUID(version, count);
  },
};

export default generate_uuid;
