/**
 * G Studio v2.3.0 - MCP File Operations
 *
 * File manipulation tools for the MCP service
 */

import { FileData } from "@/types";
import {
  McpToolResult,
  McpToolCallbacks,
  CreateFileArgs,
  ReadFileArgs,
  WriteCodeArgs,
  EditFileArgs,
  MoveFileArgs,
  DeleteFileArgs,
  SearchFilesArgs,
} from "@/types";

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  dockerfile: "dockerfile",
  makefile: "makefile",
  vue: "vue",
  svelte: "svelte",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TO_LANGUAGE[ext] || "plaintext";
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Create a new file
 */
export async function createFile(
  args: CreateFileArgs,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path, content = "", language } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  // Check if file already exists
  if (files[path]) {
    return {
      success: false,
      message: `File already exists: ${path}`,
      error: "FILE_EXISTS",
    };
  }

  // Detect language from extension
  const detectedLanguage = language || detectLanguage(path);
  const fileName = path.split("/").pop() || path;

  // Create file
  callbacks.setFiles((prev) => ({
    ...prev,
    [path]: {
      name: fileName,
      language: detectedLanguage,
      content: content,
      path,
      lastModified: new Date(),
    },
  }));

  // Open and activate the file
  callbacks.setOpenFiles((prev) =>
    prev.includes(path) ? prev : [...prev, path],
  );
  callbacks.setActiveFile(path);

  return {
    success: true,
    message: `Created file: ${path}`,
    data: {
      path,
      language: detectedLanguage,
      size: content.length,
    },
  };
}

/**
 * Read a file
 */
export async function readFile(
  args: ReadFileArgs,
  files: Record<string, FileData>,
): Promise<McpToolResult> {
  const { path } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  const file = files[path];
  if (!file) {
    return {
      success: false,
      message: `File not found: ${path}`,
      error: "FILE_NOT_FOUND",
    };
  }

  return {
    success: true,
    message: `Read file: ${path}`,
    data: {
      path,
      name: file.name,
      language: file.language,
      content: file.content,
      lines: file.content.split("\n").length,
      size: file.content.length,
    },
  };
}

/**
 * Write code to a file (create or update)
 */
export async function writeCode(
  args: WriteCodeArgs,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path, code, language } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  if (code === undefined) {
    return {
      success: false,
      message: "Code content is required",
      error: "MISSING_CODE",
    };
  }

  const detectedLanguage = language || detectLanguage(path);
  const fileName = path.split("/").pop() || path;
  const isNew = !files[path];

  callbacks.setFiles((prev) => ({
    ...prev,
    [path]: {
      name: fileName,
      language: detectedLanguage,
      content: code,
      path,
      lastModified: new Date(),
    },
  }));

  // Open and activate the file
  callbacks.setOpenFiles((prev) =>
    prev.includes(path) ? prev : [...prev, path],
  );
  callbacks.setActiveFile(path);

  return {
    success: true,
    message: isNew ? `Created file: ${path}` : `Updated file: ${path}`,
    data: {
      path,
      language: detectedLanguage,
      lines: code.split("\n").length,
      size: code.length,
      isNew,
    },
  };
}

/**
 * Edit a file with line-based edits
 */
export async function editFile(
  args: EditFileArgs,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path, edits } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  const file = files[path];
  if (!file) {
    return {
      success: false,
      message: `File not found: ${path}`,
      error: "FILE_NOT_FOUND",
    };
  }

  if (!edits || !Array.isArray(edits) || edits.length === 0) {
    return {
      success: false,
      message: "Edits array is required",
      error: "MISSING_EDITS",
    };
  }

  // Apply edits (sorted by start in reverse to preserve line numbers)
  const lines = file.content.split("\n");
  const sortedEdits = [...edits].sort((a, b) => b.start - a.start);

  for (const edit of sortedEdits) {
    const { start, end = start, text: content } = edit;

    // Validate line numbers
    if (start < 1 || start > lines.length + 1) {
      return {
        success: false,
        message: `Invalid start line: ${start}`,
        error: "INVALID_LINE",
      };
    }

    // Apply edit
    const newLines = content.split("\n");
    lines.splice(start - 1, end - start + 1, ...newLines);
  }

  const newContent = lines.join("\n");

  callbacks.setFiles((prev) => ({
    ...prev,
    [path]: {
      ...prev[path],
      content: newContent,
    },
  }));

  return {
    success: true,
    message: `Edited file: ${path} (${edits.length} edit(s))`,
    data: {
      path,
      editsApplied: edits.length,
      lines: newContent.split("\n").length,
    },
  };
}

/**
 * Move/rename a file
 */
export async function moveFile(
  args: MoveFileArgs,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { oldPath, newPath } = args;

  if (!oldPath || !newPath) {
    return {
      success: false,
      message: "Both old and new paths are required",
      error: "MISSING_PATH",
    };
  }

  const file = files[oldPath];
  if (!file) {
    return {
      success: false,
      message: `File not found: ${oldPath}`,
      error: "FILE_NOT_FOUND",
    };
  }

  if (files[newPath]) {
    return {
      success: false,
      message: `Destination already exists: ${newPath}`,
      error: "FILE_EXISTS",
    };
  }

  // Create at new path and delete from old
  const newFileName = newPath.split("/").pop() || newPath;
  const newLanguage = detectLanguage(newPath);

  callbacks.setFiles((prev) => {
    const { [oldPath]: removed, ...rest } = prev;
    return {
      ...rest,
      [newPath]: {
        name: newFileName,
        language: newLanguage,
        content: file.content,
        path: newPath,
        lastModified: new Date(),
      },
    };
  });

  // Update open files
  callbacks.setOpenFiles((prev) =>
    prev.map((f) => (f === oldPath ? newPath : f)),
  );

  // Update active file if needed
  if (callbacks.getActiveFile() === oldPath) {
    callbacks.setActiveFile(newPath);
  }

  return {
    success: true,
    message: `Moved file: ${oldPath} â†’ ${newPath}`,
    data: {
      oldPath,
      newPath,
    },
  };
}

/**
 * Delete a file
 */
export async function deleteFile(
  args: DeleteFileArgs,
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  if (!files[path]) {
    return {
      success: false,
      message: `File not found: ${path}`,
      error: "FILE_NOT_FOUND",
    };
  }

  // Remove file
  callbacks.setFiles((prev) => {
    const { [path]: removed, ...rest } = prev;
    return rest;
  });

  // Remove from open files
  callbacks.setOpenFiles((prev) => prev.filter((f) => f !== path));

  // Clear active file if needed
  if (callbacks.getActiveFile() === path) {
    const openFiles = callbacks.getOpenFiles().filter((f) => f !== path);
    callbacks.setActiveFile(openFiles.length > 0 ? openFiles[0] : null);
  }

  return {
    success: true,
    message: `Deleted file: ${path}`,
    data: { path },
  };
}

/**
 * Search for files
 */
export async function searchFiles(
  args: SearchFilesArgs,
  files: Record<string, FileData>,
): Promise<McpToolResult> {
  const {
    pattern,
    caseSensitive = false,
    includeContent = false,
    fileTypes,
  } = args;

  if (!pattern) {
    return {
      success: false,
      message: "Search pattern is required",
      error: "MISSING_PATTERN",
    };
  }

  const regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
  const results: Array<{
    path: string;
    name: string;
    language: string;
    matches?: Array<{ line: number; content: string }>;
  }> = [];

  for (const [path, file] of Object.entries(files)) {
    // Filter by file types if specified
    if (fileTypes && fileTypes.length > 0) {
      const ext = path.split(".").pop()?.toLowerCase() || "";
      if (!fileTypes.includes(ext) && !fileTypes.includes(file.language)) {
        continue;
      }
    }

    // Check filename match
    const filenameMatch = regex.test(path);

    // Check content match if requested
    let contentMatches: Array<{ line: number; content: string }> = [];
    if (includeContent) {
      const lines = file.content.split("\n");
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          contentMatches.push({
            line: index + 1,
            content: line.trim().substring(0, 100),
          });
        }
      });
    }

    if (filenameMatch || contentMatches.length > 0) {
      results.push({
        path,
        name: file.name,
        language: file.language,
        ...(includeContent &&
          contentMatches.length > 0 && { matches: contentMatches }),
      });
    }
  }

  return {
    success: true,
    message: `Found ${results.length} file(s) matching "${pattern}"`,
    data: {
      pattern,
      count: results.length,
      results,
    },
  };
}

/**
 * Open a file (add to open files and set as active)
 */
export async function openFile(
  args: { path: string },
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  if (!files[path]) {
    return {
      success: false,
      message: `File not found: ${path}`,
      error: "FILE_NOT_FOUND",
    };
  }

  callbacks.setOpenFiles((prev) =>
    prev.includes(path) ? prev : [...prev, path],
  );
  callbacks.setActiveFile(path);

  return {
    success: true,
    message: `Opened file: ${path}`,
    data: { path },
  };
}

/**
 * Get file information
 */
export async function getFileInfo(
  args: { path: string },
  files: Record<string, FileData>,
  callbacks: McpToolCallbacks,
): Promise<McpToolResult> {
  const { path } = args;

  if (!path) {
    return {
      success: false,
      message: "File path is required",
      error: "MISSING_PATH",
    };
  }

  const file = files[path];
  if (!file) {
    return {
      success: false,
      message: `File not found: ${path}`,
      error: "FILE_NOT_FOUND",
    };
  }

  const lines = file.content.split("\n");
  const isOpen = callbacks.getOpenFiles().includes(path);
  const isActive = callbacks.getActiveFile() === path;

  return {
    success: true,
    message: `File info: ${path}`,
    data: {
      path,
      name: file.name,
      language: file.language,
      size: file.content.length,
      lines: lines.length,
      isOpen,
      isActive,
      isEmpty: file.content.trim().length === 0,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createFile,
  readFile,
  writeCode,
  editFile,
  moveFile,
  deleteFile,
  searchFiles,
  openFile,
  getFileInfo,
};
