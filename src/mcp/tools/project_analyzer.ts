/**
 * project_analyzer MCP Tool
 *
 * Wraps scripts/project-analyzer.cjs - analyzes project structure and generates reports.
 */

import { Tool } from "./registry";
import {
  executeScript,
  getProjectRoot,
} from "@/services/scriptExecutionService";

interface ExecutorArgs {
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export const project_analyzer: Tool = {
  name: "project_analyzer",
  description:
    "Analyze project structure (JS/TS/TSX files): functions, classes, complexity, scores. Writes analysis.json and returns summary. Optional path (relative to project root).",
  execute: async (args?: ExecutorArgs): Promise<unknown> => {
    const payload = (args?.payload ?? args ?? {}) as Record<string, unknown>;
    const projectPath =
      typeof payload.path === "string" && payload.path.trim()
        ? payload.path.trim()
        : ".";

    const result = await executeScript("project-analyzer.cjs", {
      args: [projectPath],
      timeoutMs: 60000,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? "Script failed",
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    const projectRoot = getProjectRoot();
    const analysisPath = `${projectRoot}/analysis.json`;
    let data: unknown = null;
    try {
      const fs = require("fs") as typeof import("fs");
      const path = require("path") as typeof import("path");
      const fullPath = path.join(projectRoot, "analysis.json");
      if (fs.existsSync(fullPath)) {
        data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      } else {
        data = { path: fullPath, note: "analysis.json not found" };
      }
    } catch {
      data = { path: "analysis.json", note: "fs/path not available (browser)" };
    }

    return {
      success: true,
      message: "Project analysis complete",
      stdout: result.stdout,
      analysisPath,
      data,
    };
  },
};

export default project_analyzer;
