/**
 * get_current_time Tool
 *
 * Extracted from mcpService.tsx - gets the current time
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const get_current_time: Tool = {
  name: "get_current_time",
  description: "Gets the current time in various formats",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const timezone = payload["timezone"];
    const format = payload["format"];

    // Call UtilityTools.getCurrentTime (preserving original implementation)
    return UtilityTools.getCurrentTime(timezone, format);
  },
};

export default get_current_time;
