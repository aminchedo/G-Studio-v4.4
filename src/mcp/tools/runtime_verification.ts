/**
 * runtime_verification MCP Tool
 *
 * Wraps scripts/runtime-verification.ts - verifies Local AI, Hybrid Decision Engine,
 * SQLite persistence, etc. Note: script uses @/ path aliases; run from project root with tsx.
 */

import { Tool } from "./registry";
import { executeScript } from "@/services/scriptExecutionService";

interface ExecutorArgs {
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const runtime_verification: Tool = {
  name: "runtime_verification",
  description:
    "Run runtime verification: Local AI Model Service, Hybrid Decision Engine, SQLite persistence, and related services. Returns pass/fail summary.",
  execute: async (args?: ExecutorArgs): Promise<unknown> => {
    const result = await executeScript("runtime-verification.ts", {
      timeoutMs: 90000,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? "Runtime verification failed",
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    return {
      success: true,
      message: "Runtime verification complete",
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default runtime_verification;
