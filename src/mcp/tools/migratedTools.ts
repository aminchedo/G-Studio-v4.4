/**
 * Migrated Tools Registration
 *
 * This module registers tools that have been migrated from the monolithic
 * switch statement to individual tool modules.
 *
 * Tools registered here replace their forwarding adapters.
 */

import { getGlobalRegistry } from "./registry";
import create_file from "./create_file";
import read_file from "./read_file";
import calculate from "./calculate";
import get_current_time from "./get_current_time";
import generate_uuid from "./generate_uuid";
import base64_encode from "./base64_encode";
import base64_decode from "./base64_decode";
import format_json from "./format_json";
import hash_text from "./hash_text";
import text_transform from "./text_transform";
import project_analyzer from "./project_analyzer";
import src_directory_analyzer from "./src_directory_analyzer";
import file_optimizer from "./file_optimizer";
import runtime_verification from "./runtime_verification";
import project_file_comparison from "./project_file_comparison";

/**
 * Register all migrated tools
 * This should be called after forwarding registry to ensure migrated tools
 * overwrite forwarding adapters
 */
export function registerMigratedTools(): void {
  const registry = getGlobalRegistry();

  console.log("[MIGRATED_TOOLS] Registering migrated tools...");

  // Batch 1 tools
  registry.registerTool(create_file);
  console.log("[MIGRATED_TOOLS] ✅ Registered create_file");

  registry.registerTool(read_file);
  console.log("[MIGRATED_TOOLS] ✅ Registered read_file");

  registry.registerTool(calculate);
  console.log("[MIGRATED_TOOLS] ✅ Registered calculate");

  registry.registerTool(get_current_time);
  console.log("[MIGRATED_TOOLS] ✅ Registered get_current_time");

  registry.registerTool(generate_uuid);
  console.log("[MIGRATED_TOOLS] ✅ Registered generate_uuid");

  // Batch 2 tools
  registry.registerTool(base64_encode);
  console.log("[MIGRATED_TOOLS] ✅ Registered base64_encode");

  registry.registerTool(base64_decode);
  console.log("[MIGRATED_TOOLS] ✅ Registered base64_decode");

  registry.registerTool(format_json);
  console.log("[MIGRATED_TOOLS] ✅ Registered format_json");

  registry.registerTool(hash_text);
  console.log("[MIGRATED_TOOLS] ✅ Registered hash_text");

  registry.registerTool(text_transform);
  console.log("[MIGRATED_TOOLS] ✅ Registered text_transform");

  // Script integration tools (priority scripts from /scripts)
  registry.registerTool(project_analyzer);
  console.log("[MIGRATED_TOOLS] ✅ Registered project_analyzer");

  registry.registerTool(src_directory_analyzer);
  console.log("[MIGRATED_TOOLS] ✅ Registered src_directory_analyzer");

  registry.registerTool(file_optimizer);
  console.log("[MIGRATED_TOOLS] ✅ Registered file_optimizer");

  registry.registerTool(runtime_verification);
  console.log("[MIGRATED_TOOLS] ✅ Registered runtime_verification");

  registry.registerTool(project_file_comparison);
  console.log("[MIGRATED_TOOLS] ✅ Registered project_file_comparison");

  console.log("[MIGRATED_TOOLS] ✅ All migrated tools registered (15 tools)");
}

// Register at module load (after forwarding registry)
registerMigratedTools();
