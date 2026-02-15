/**
 * Browser stub for runtime module
 * This file is used in the browser/renderer process instead of the actual runtime
 * which uses Node.js modules that can't run in the browser.
 *
 * The actual runtime should only be used in the Electron main process.
 */

export const FileOperations = {
  readFile: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  writeFile: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  deleteFile: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  listDirectory: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  fileExists: async () => false,
  getFileStats: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  moveFile: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
  copyFile: async () => ({
    success: false,
    error: "File operations not available in browser",
  }),
};

export const CommandExecution = {
  runCommand: async () => ({
    success: false,
    error: "Command execution not available in browser",
  }),
  spawnCommand: () => ({
    process: null,
    promise: Promise.resolve({
      success: false,
      exitCode: 1,
      error: "Command execution not available in browser",
    }),
  }),
};

export const CodeAnalysis = {
  parseToAST: async () => ({
    success: false,
    error: "Code analysis not available in browser",
  }),
  getImports: async () => ({
    success: false,
    error: "Code analysis not available in browser",
  }),
  getExports: async () => ({
    success: false,
    error: "Code analysis not available in browser",
  }),
};

export const TestExecution = {
  runJestTests: async () => ({
    success: false,
    error: "Test execution not available in browser",
  }),
};

export const Linting = {
  lintFile: async () => ({
    success: false,
    error: "Linting not available in browser",
  }),
};

export const TypeChecking = {
  checkTypes: async () => ({
    success: false,
    error: "Type checking not available in browser",
  }),
};

export const Formatting = {
  formatFile: async () => ({
    success: false,
    error: "Formatting not available in browser",
  }),
};

export const ToolRegistry = {
  get: () => null,
  getToolNames: () => [],
};

export const ToolDispatcher = {
  dispatch: async () => ({
    success: false,
    error: "Tool execution not available in browser",
  }),
};

export const ModelIntegration = {
  executeTool: async () => ({
    success: false,
    error: "Tool execution not available in browser",
  }),
  getAvailableTools: () => [],
  getStatistics: () => ({}),
  getHistory: () => [],
};

export async function executeTool() {
  return { success: false, error: "Tool execution not available in browser" };
}

export function getAvailableTools() {
  return [];
}

export function getStatistics() {
  return {};
}

export function getHistory() {
  return [];
}

export function initialize() {
  console.warn(
    "[RUNTIME] Runtime module is not available in browser. Use Electron IPC to communicate with main process.",
  );
  return {
    executeTool,
    getAvailableTools,
    getStatistics,
    getHistory,
  };
}
