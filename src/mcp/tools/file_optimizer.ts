/**
 * file_optimizer MCP Tool
 *
 * Wraps scripts/file-optimizer.ts. Only dry-run and report-only are allowed
 * for safety; no --execute or --git from the model.
 */

import { Tool } from "./registry";
import { executeScript } from "@/services/scriptExecutionService";

interface ExecutorArgs {
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const file_optimizer: Tool = {
  name: "file_optimizer",
  description:
    "Analyze project files for unused/redundant/outdated files and consolidation opportunities. Safe mode only: dry-run and report. Options: reportOnly (boolean), reportPath (string).",
  execute: async (args?: ExecutorArgs): Promise<unknown> => {
    const payload = (args?.payload ?? args ?? {}) as Record<string, unknown>;
    const reportOnly = payload.reportOnly !== false; // default true for safety
    const reportPath =
      typeof payload.reportPath === "string" && payload.reportPath.trim()
        ? payload.reportPath.trim()
        : "file-optimization-report.md";

    const cliArgs: string[] = ["--dry-run"];
    if (reportOnly) cliArgs.push("--report-only");
    cliArgs.push(`--report=${reportPath}`);

    const result = await executeScript("file-optimizer.ts", {
      args: cliArgs,
      timeoutMs: 120000,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? "Script failed",
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    return {
      success: true,
      message: "File optimization analysis complete (dry-run)",
      reportPath,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default file_optimizer;
