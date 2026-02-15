/**
 * project_file_comparison MCP Tool
 *
 * Wraps scripts/project-file-comparison.ts - compares src/ vs root files,
 * suggests consolidations. Dry-run only (no --execute) for safety.
 */

import { Tool } from "./registry";
import { executeScript } from "@/services/scriptExecutionService";

interface ExecutorArgs {
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const project_file_comparison: Tool = {
  name: "project_file_comparison",
  description:
    "Compare files in src/ and root: duplicates, completeness, actionable steps. Dry-run only. Options: verbose (boolean), reportPath (string).",
  execute: async (args?: ExecutorArgs): Promise<unknown> => {
    const payload = (args?.payload ?? args ?? {}) as Record<string, unknown>;
    const verbose = payload.verbose === true;
    const reportPath =
      typeof payload.reportPath === "string" && payload.reportPath.trim()
        ? payload.reportPath.trim()
        : "project-file-comparison-report.md";

    const cliArgs: string[] = ["--dry-run"];
    if (verbose) cliArgs.push("--verbose");
    cliArgs.push(`--report=${reportPath}`);

    const result = await executeScript("project-file-comparison.ts", {
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
      message: "Project file comparison complete (dry-run)",
      reportPath,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default project_file_comparison;
