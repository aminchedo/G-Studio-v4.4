/**
 * calculate Tool
 *
 * Extracted from mcpService.tsx - performs mathematical calculations
 */

import { Tool } from "./registry";
import { UtilityTools } from "@/services/utilityTools";

interface ExecutorArgs {
  payload?: Record<string, any>;
  files?: Record<string, any>;
  callbacks?: any;
  context?: any;
}

export const calculate: Tool = {
  name: "calculate",
  description: "Performs mathematical calculations",
  execute: async (args?: ExecutorArgs): Promise<any> => {
    // Extract arguments from executor format
    const payload = args?.payload || args || {};
    const expression = payload["expression"] || "";

    // Call UtilityTools.calculate (preserving original implementation)
    return UtilityTools.calculate(expression);
  },
};

export default calculate;
