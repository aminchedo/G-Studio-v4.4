/**
 * Tool Registry - Central registry for all available tools
 */

export interface Tool {
  name: string;
  description: string;
  execute: (args?: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    console.log('[REGISTRY] Initializing tool registry');
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[REGISTRY] Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[REGISTRY] Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    if (existed) {
      console.log(`[REGISTRY] Unregistered tool: ${name}`);
    }
    return existed;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    console.warn('[REGISTRY] Clearing all registered tools');
    this.tools.clear();
  }
}

/**
 * Global registry singleton
 */
let globalRegistry: ToolRegistry | null = null;

export function getGlobalRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}
