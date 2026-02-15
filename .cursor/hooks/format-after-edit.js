#!/usr/bin/env node
/**
 * Cursor afterFileEdit hook: runs Prettier on files the agent edits.
 * Keeps AI-generated code consistent with your project's formatting.
 */

import { spawn } from "child_process";
import { createInterface } from "readline";

async function main() {
  const input = await readStdin();
  if (!input) return process.exit(0);

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(1);
  }

  const filePath = data.file_path;
  if (!filePath) return process.exit(0);

  // Only format supported file types
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!["ts", "tsx", "js", "jsx", "json", "css", "md"].includes(ext)) {
    return process.exit(0);
  }

  const result = spawn("npx", ["prettier", "--write", filePath], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    cwd: process.cwd(),
  });

  return new Promise((resolve) => {
    result.on("close", (code) => resolve(process.exit(code ?? 0)));
    result.stderr?.on("data", () => {});
  });
}

function readStdin() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin });
    let data = "";
    rl.on("line", (line) => (data += line + "\n"));
    rl.on("close", () => resolve(data.trim() || null));
  });
}

main();
