/**
 * format_json Tool
 *
 * Extracted from mcpService.tsx - formats JSON text
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const format_json: Tool = {
  name: "format_json",
  description: "Formats JSON text with indentation",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const json = payload["json"];
    const indent = payload["indent"];

    // Call UtilityTools.formatJSON (preserving original implementation)
    return UtilityTools.formatJSON(json, indent);
  },
};

export default format_json;
