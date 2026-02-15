/**
 * Tool Registry - Maps tool names to REAL executable functions
 * This is NOT a simulation - these are actual function bindings
 */

import {
  FileOperations,
  CommandExecution,
  CodeAnalysis,
  TestExecution,
  Linting,
  TypeChecking,
  Formatting
} from './toolRuntime';

export interface ToolFunction {
  (args: any): Promise<any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  execute: ToolFunction;
  category: string;
  requiresValidation: boolean;
}

/**
 * Tool Registry - Central mapping of tool names to implementations
 */
export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  /**
   * Initialize registry with all real tool implementations
   */
  static initialize() {
    // ==================== FILE OPERATIONS ====================
    this.register({
      name: 'read_file',
      description: 'Read file from filesystem',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { path: string }) => {
        return await FileOperations.readFile(args.path);
      }
    });

    this.register({
      name: 'write_file',
      description: 'Write file to filesystem',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { path: string; content: string }) => {
        return await FileOperations.writeFile(args.path, args.content);
      }
    });

    this.register({
      name: 'delete_file',
      description: 'Delete file from filesystem',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { path: string }) => {
        return await FileOperations.deleteFile(args.path);
      }
    });

    this.register({
      name: 'move_file',
      description: 'Move/rename file',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { source: string; destination: string }) => {
        return await FileOperations.moveFile(args.source, args.destination);
      }
    });

    this.register({
      name: 'copy_file',
      description: 'Copy file',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { source: string; destination: string }) => {
        return await FileOperations.copyFile(args.source, args.destination);
      }
    });

    this.register({
      name: 'list_directory',
      description: 'List directory contents',
      category: 'file',
      requiresValidation: true,
      execute: async (args: { path?: string }) => {
        return await FileOperations.listDirectory(args.path || '.');
      }
    });

    this.register({
      name: 'file_exists',
      description: 'Check if file exists',
      category: 'file',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        const exists = await FileOperations.fileExists(args.path);
        return { success: true, exists };
      }
    });

    this.register({
      name: 'get_file_stats',
      description: 'Get file statistics',
      category: 'file',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await FileOperations.getFileStats(args.path);
      }
    });

    // ==================== COMMAND EXECUTION ====================
    this.register({
      name: 'run_command',
      description: 'Execute shell command',
      category: 'execution',
      requiresValidation: true,
      execute: async (args: { command: string; cwd?: string; timeout?: number }) => {
        return await CommandExecution.runCommand(args.command, {
          cwd: args.cwd,
          timeout: args.timeout
        });
      }
    });

    this.register({
      name: 'spawn_command',
      description: 'Spawn command with streaming output',
      category: 'execution',
      requiresValidation: true,
      execute: async (args: { command: string; args: string[]; cwd?: string }) => {
        const { process, promise } = CommandExecution.spawnCommand(
          args.command,
          args.args || [],
          { cwd: args.cwd }
        );
        
        // Return process info and wait for completion
        const result = await promise;
        return {
          ...result,
          pid: process.pid
        };
      }
    });

    // ==================== CODE ANALYSIS ====================
    this.register({
      name: 'parse_ast',
      description: 'Parse file to AST',
      category: 'analysis',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await CodeAnalysis.parseToAST(args.path);
      }
    });

    this.register({
      name: 'get_imports',
      description: 'Get imports from file',
      category: 'analysis',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await CodeAnalysis.getImports(args.path);
      }
    });

    this.register({
      name: 'get_exports',
      description: 'Get exports from file',
      category: 'analysis',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await CodeAnalysis.getExports(args.path);
      }
    });

    // ==================== TESTING ====================
    this.register({
      name: 'run_tests',
      description: 'Run Jest tests',
      category: 'testing',
      requiresValidation: false,
      execute: async (args: { pattern?: string }) => {
        return await TestExecution.runJestTests(args.pattern);
      }
    });

    // ==================== LINTING ====================
    this.register({
      name: 'lint_file',
      description: 'Lint file with ESLint',
      category: 'linting',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await Linting.lintFile(args.path);
      }
    });

    // ==================== TYPE CHECKING ====================
    this.register({
      name: 'check_types',
      description: 'Type check with TypeScript',
      category: 'type-checking',
      requiresValidation: false,
      execute: async (args: { path?: string }) => {
        return await TypeChecking.checkTypes(args.path);
      }
    });

    // ==================== FORMATTING ====================
    this.register({
      name: 'format_file',
      description: 'Format file with Prettier',
      category: 'formatting',
      requiresValidation: false,
      execute: async (args: { path: string }) => {
        return await Formatting.formatFile(args.path);
      }
    });

    console.log(`[REGISTRY] Initialized ${this.tools.size} real executable tools`);
  }

  /**
   * Register a tool
   */
  static register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tool by name
   */
  static get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if tool exists
   */
  static has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   */
  static getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   */
  static getByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Get all tools
   */
  static getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

// Initialize on module load
ToolRegistry.initialize();
