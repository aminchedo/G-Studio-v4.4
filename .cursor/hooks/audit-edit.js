#!/usr/bin/env node
/**
 * Cursor audit hook: logs agent file edits to a report.
 * Useful for tracking what the AI changed. Receives JSON via stdin.
 */

import { appendFileSync } from "fs";
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
  const edits = data.edits ?? [];
  const hookEvent = data.hook_event_name ?? "unknown";
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    hook_event: hookEvent,
    file: filePath,
    edit_count: edits.length,
    conversation_id: data.conversation_id ?? null,
  };

  try {
    const logPath = ".cursor/hooks/audit.log";
    appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
  } catch {
    // Ignore write errors
  }

  process.exit(0);
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
