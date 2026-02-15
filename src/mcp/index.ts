/**
 * Mandatory Tool Enforcement System
 *
 * Entry point for the enforcement system
 * Export all public APIs
 */

// Core runtime

// Policy enforcement

// Tool registry

// Tool implementations

/**
 * Quick setup function for easy initialization
 */
export async function initializeEnforcementSystem() {
  const { getGlobalRegistry } = await import("./tools/registry");
  const { getAllValidatorTools } = await import("./tools/validators");
  const { getAllCodeGenerationTools } = await import("./tools/code-generation");
  const { getAllAnalysisTools } = await import("./tools/analysis");
  const { getAllExecutionTools } = await import("./tools/execution");
  const { getGlobalExecutor } = await import("./runtime/executor");

  const registry = getGlobalRegistry();

  // Register all tools
  getAllValidatorTools().forEach((tool) => registry.registerTool(tool));
  getAllCodeGenerationTools().forEach((tool) => registry.registerTool(tool));
  getAllAnalysisTools().forEach((tool) => registry.registerTool(tool));
  getAllExecutionTools().forEach((tool) => registry.registerTool(tool));

  return getGlobalExecutor();
}
export {
  PolicyEnforcer,
  getGlobalEnforcer,
  PolicyViolationError,
} from "./policy/enforcement";
export type { ToolPolicy } from "./policy/enforcement";
export {
  ExecutionContext,
  getGlobalContext,
  resetGlobalContext,
} from "./runtime/context";
export type { ExecutionRecord } from "./runtime/context";
export { ToolExecutor, getGlobalExecutor } from "./runtime/executor";
export type { ToolExecutionResult } from "./runtime/executor";
export { getAllAnalysisTools } from "./tools/analysis";
export { getAllCodeGenerationTools } from "./tools/code-generation";
export { getAllExecutionTools } from "./tools/execution";
export { ToolRegistry, getGlobalRegistry } from "./tools/registry";
export type { Tool } from "./tools/registry";
export { getAllValidatorTools } from "./tools/validators";
export { registerForwardingTools } from "./tools/forwardingRegistry";

// Import forwarding registry to ensure tools are registered at boot
// This populates the registry with forwarding adapters for all tools
import "./tools/forwardingRegistry";

// Import migrated tools to register them (overwrites forwarding adapters)
// Migrated tools are registered after forwarding registry
import "./tools/migratedTools";
