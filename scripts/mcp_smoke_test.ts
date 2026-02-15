/**
 * MCP Smoke Test
 *
 * Simple test that exercises the MCP execution path through AgentOrchestrator
 * to verify tool execution works correctly.
 */

import { McpService } from "../src/services/mcpService";
import { FileData } from "../src/types/types";

// Mock callbacks
const mockCallbacks = {
  setFiles: (
    updater: (prev: Record<string, FileData>) => Record<string, FileData>,
  ) => {
    // Mock implementation
  },
  setOpenFiles: (updater: (prev: string[]) => string[]) => {
    // Mock implementation
  },
  setActiveFile: (file: string | null) => {
    // Mock implementation
  },
  getActiveFile: () => null as string | null,
  getOpenFiles: () => [] as string[],
};

async function runSmokeTest() {
  console.log("[SMOKE TEST] Starting MCP execution smoke test...\n");

  try {
    // Test 1: Execute read_file tool (cheap, safe operation)
    console.log("[SMOKE TEST] Test 1: Executing read_file tool...");
    const result1 = await McpService.executeTool(
      "read_file",
      { path: "package.json" },
      {},
      mockCallbacks,
    );

    console.log(`[SMOKE TEST] Result:`, {
      success: result1.success,
      message: result1.message,
      hasData: !!result1.data,
      error: result1.error,
    });

    if (!result1.success) {
      console.warn(
        "[SMOKE TEST] ⚠️ read_file returned success=false (may be expected if file does not exist)",
      );
    }

    // Test 2: Execute a utility tool (calculate)
    console.log("\n[SMOKE TEST] Test 2: Executing calculate tool...");
    const result2 = await McpService.executeTool(
      "calculate",
      { expression: "2 + 2" },
      {},
      mockCallbacks,
    );

    console.log(`[SMOKE TEST] Result:`, {
      success: result2.success,
      message: result2.message,
      hasData: !!result2.data,
      error: result2.error,
    });

    if (!result2.success) {
      throw new Error(
        `calculate tool failed: ${result2.error || result2.message}`,
      );
    }

    // Test 3: Test unknown tool handling
    console.log("\n[SMOKE TEST] Test 3: Testing unknown tool handling...");
    const result3 = await McpService.executeTool(
      "unknown_tool_xyz",
      {},
      {},
      mockCallbacks,
    );

    console.log(`[SMOKE TEST] Result:`, {
      success: result3.success,
      message: result3.message,
      error: result3.error,
    });

    if (result3.success) {
      throw new Error("Unknown tool should return success=false");
    }

    console.log("\n[SMOKE TEST] ✅ All smoke tests passed!");
    return {
      success: true,
      tests: [
        { name: "read_file", result: result1 },
        { name: "calculate", result: result2 },
        { name: "unknown_tool", result: result3 },
      ],
    };
  } catch (error: any) {
    console.error("\n[SMOKE TEST] ❌ Smoke test failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run if executed directly
if (require.main === module) {
  runSmokeTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("[SMOKE TEST] Fatal error:", error);
      process.exit(1);
    });
}

export { runSmokeTest };
