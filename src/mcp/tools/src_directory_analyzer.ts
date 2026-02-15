/**
 * src_directory_analyzer MCP Tool
 *
 * Wraps scripts/src-directory-analyzer.ts - analyzes src/ directory:
 * equivalent files, usage, recommendations. Report-only (no file changes).
 */

import { Tool } from "./registry";
import { executeScript } from "@/services/scriptExecutionService";

interface ExecutorArgs {
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const src_directory_analyzer: Tool = {
  name: "src_directory_analyzer",
  description:
    "Analyze src/ directory: equivalent files in root, usage, recommendations. Options: verbose (boolean), checkSyntax (boolean), reportPath (string). Report saved to project root.",
  execute: async (args?: ExecutorArgs): Promise<unknown> => {
    const payload = (args?.payload ?? args ?? {}) as Record<string, unknown>;
    const verbose = payload.verbose === true;
    const checkSyntax = payload.checkSyntax === true;
    const reportPath =
      typeof payload.reportPath === "string" && payload.reportPath.trim()
        ? payload.reportPath.trim()
        : "src-directory-analysis-report.md";

    const cliArgs: string[] = [];
    if (verbose) cliArgs.push("--verbose");
    if (checkSyntax) cliArgs.push("--check-syntax");
    cliArgs.push(`--report=${reportPath}`);

    const result = await executeScript("src-directory-analyzer.ts", {
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
      message: "Source directory analysis complete",
      reportPath,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default src_directory_analyzer;
