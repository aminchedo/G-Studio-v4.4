/**
 * Script Execution Service
 *
 * Securely runs allowed scripts from /scripts with validation, timeouts,
 * and path restrictions. Used by MCP script tools.
 * Requires Node (Electron main or Node runtime); returns a clear error in browser.
 */

let execAsync: (
  cmd: string,
  opts: any,
) => Promise<{ stdout: string; stderr: string }>;
let pathMod: typeof import("path");
let fsMod: typeof import("fs");

try {
  const child_process = require("child_process");
  const util = require("util");
  execAsync = util.promisify(child_process.exec);
  pathMod = require("path");
  fsMod = require("fs");
} catch {
  execAsync = null as any;
  pathMod = null as any;
  fsMod = null as any;
}

function isNodeAvailable(): boolean {
  return typeof execAsync === "function" && pathMod && fsMod;
}

/** Scripts that are allowed to be executed by the AI model */
export const ALLOWED_SCRIPTS = [
  "project-analyzer.cjs",
  "src-directory-analyzer.ts",
  "file-optimizer.ts",
  "runtime-verification.ts",
  "project-file-comparison.ts",
] as const;

/** Scripts that must never be executed (system-modifying or dangerous) */
export const FORBIDDEN_SCRIPTS = [
  "clean-install.bat",
  "setup.bat",
  "setup.sh",
  "fix-and-install.bat",
  "fix-types.bat",
  "error.bat",
  "build-complete.sh",
];

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
const MAX_PATH_LENGTH = 500;
const SCRIPTS_DIR = "scripts";

export interface ScriptExecutionOptions {
  /** Optional working directory (must be within project) */
  cwd?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Extra CLI args (will be sanitized) */
  args?: string[];
}

export interface ScriptExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
  /** Parsed output when applicable (e.g. analysis.json path) */
  data?: unknown;
}

/**
 * Resolve project root (directory containing package.json)
 */
function getProjectRoot(): string {
  if (!fsMod || typeof process === "undefined") return ".";
  let dir = process.cwd();
  for (let i = 0; i < 20; i++) {
    if (fsMod.existsSync(pathMod.join(dir, "package.json"))) {
      return dir;
    }
    const parent = pathMod.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Sanitize a path argument: no traversal, no absolute outside project
 */
function sanitizePathArg(value: string, projectRoot: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(`Path length exceeds ${MAX_PATH_LENGTH}`);
  }
  if (trimmed.includes("..")) {
    throw new Error("Path cannot contain '..'");
  }
  const resolved = pathMod.resolve(projectRoot, trimmed);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error("Path must be within project");
  }
  return resolved;
}

/**
 * Sanitize CLI flag/option (no shell metacharacters)
 */
function sanitizeArg(arg: string): string {
  if (typeof arg !== "string" || arg.length > 200) {
    throw new Error("Invalid argument");
  }
  if (/[;&|$`<>]/.test(arg)) {
    throw new Error("Invalid characters in argument");
  }
  return arg;
}

/**
 * Check if a script is allowed
 */
export function isScriptAllowed(scriptName: string): boolean {
  const base = pathMod
    ? pathMod.basename(scriptName)
    : scriptName.split(/[/\\]/).pop() || scriptName;
  if (FORBIDDEN_SCRIPTS.some((f) => base === f || base.endsWith(f))) {
    return false;
  }
  return ALLOWED_SCRIPTS.includes(base as (typeof ALLOWED_SCRIPTS)[number]);
}

/**
 * Get full path to scripts directory
 */
export function getScriptsPath(): string {
  const root = getProjectRoot();
  return pathMod ? pathMod.join(root, SCRIPTS_DIR) : SCRIPTS_DIR;
}

/**
 * Execute an allowed script with security checks
 */
export async function executeScript(
  scriptFileName: string,
  options: ScriptExecutionOptions = {},
): Promise<ScriptExecutionResult> {
  if (!isNodeAvailable()) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      error:
        "Script execution is only available in Node/Electron (child_process/fs not available in browser).",
    };
  }

  const base = pathMod.basename(scriptFileName);
  if (!isScriptAllowed(base)) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      error: `Script "${base}" is not in the allowed list or is forbidden.`,
    };
  }

  const projectRoot = getProjectRoot();
  const scriptsDir = pathMod.join(projectRoot, SCRIPTS_DIR);
  const scriptPath = pathMod.join(scriptsDir, base);

  if (!fsMod.existsSync(scriptPath)) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      error: `Script not found: ${scriptPath}`,
    };
  }

  const cwd = options.cwd
    ? sanitizePathArg(options.cwd, projectRoot)
    : projectRoot;
  const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 300_000);

  let cmdArgs: string[] = [];
  if (options.args?.length) {
    cmdArgs = options.args.map((a) => sanitizeArg(String(a)));
  }

  const ext = pathMod.extname(base);
  const isTs = ext === ".ts";
  const nodeCmd = isTs
    ? `npx tsx "${scriptPath}" ${cmdArgs.join(" ")}`.trim()
    : `node "${scriptPath}" ${cmdArgs.join(" ")}`.trim();

  try {
    const { stdout, stderr } = await execAsync(nodeCmd, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024, // 2MB
      encoding: "utf-8",
    });

    return {
      success: true,
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
    };
  } catch (err: any) {
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    const exitCode = err.code ?? null;
    const error =
      err.killed && err.signal === "SIGTERM"
        ? "Script timed out"
        : err.message || String(err);
    return {
      success: exitCode === 0,
      stdout,
      stderr,
      exitCode,
      error,
    };
  }
}

/**
 * List available script names (allowed only)
 */
export function listAvailableScripts(): string[] {
  return [...ALLOWED_SCRIPTS];
}
