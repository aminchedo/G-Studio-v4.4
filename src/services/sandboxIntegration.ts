/**
 * SandboxIntegration - Integration layer between Sandbox and MCP Service
 * 
 * Purpose: Seamlessly integrate sandbox execution into existing tool pipeline
 * - Backward compatible with existing mcpService
 * - Automatic capability inference
 * - Configurable sandbox modes
 * - Zero breaking changes
 * 
 * Phase 7A: Core Sandbox Infrastructure
 */

import { McpService, McpToolResult, McpToolCallbacks } from './mcpService';
import { SandboxManager, SandboxMode, Capability, SandboxConfig } from './sandboxManager';
import { FileData } from '@/types';
import { ErrorHandler, ErrorCode } from './errorHandler';

// ==================== CONFIGURATION ====================

export interface SandboxIntegrationConfig {
  enabled: boolean;
  defaultMode: SandboxMode;
  toolConfigs: Record<string, {
    mode?: SandboxMode;
    capabilities?: Capability[];
    timeout?: number;
    allowedPaths?: string[];
  }>;
}

// Default configuration
const DEFAULT_CONFIG: SandboxIntegrationConfig = {
  enabled: true,
  defaultMode: SandboxMode.CONTROLLED,
  toolConfigs: {
    // Read-only tools - STRICT mode
    'read_file': { mode: SandboxMode.STRICT },
    'search_files': { mode: SandboxMode.STRICT },
    'search_in_file': { mode: SandboxMode.STRICT },
    'get_file_info': { mode: SandboxMode.STRICT },
    'get_line': { mode: SandboxMode.STRICT },
    'get_lines': { mode: SandboxMode.STRICT },
    'project_overview': { mode: SandboxMode.STRICT },
    
    // Write tools - CONTROLLED mode with specific capabilities
    'create_file': {
      mode: SandboxMode.CONTROLLED,
      capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
      timeout: 10000,
    },
    'write_code': {
      mode: SandboxMode.CONTROLLED,
      capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
      timeout: 10000,
    },
    'edit_file': {
      mode: SandboxMode.CONTROLLED,
      capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
      timeout: 10000,
    },
    'delete_file': {
      mode: SandboxMode.CONTROLLED,
      capabilities: [Capability.FS_DELETE, Capability.STATE_WRITE],
      timeout: 5000,
    },
    'move_file': {
      mode: SandboxMode.CONTROLLED,
      capabilities: [Capability.FS_MOVE, Capability.STATE_WRITE],
      timeout: 5000,
    },
    
    // Utility tools - TRUSTED mode (no filesystem access)
    'calculate': { mode: SandboxMode.TRUSTED, timeout: 1000 },
    'get_current_time': { mode: SandboxMode.TRUSTED, timeout: 100 },
    'generate_uuid': { mode: SandboxMode.TRUSTED, timeout: 100 },
    'hash_text': { mode: SandboxMode.TRUSTED, timeout: 2000 },
    'base64_encode': { mode: SandboxMode.TRUSTED, timeout: 1000 },
    'base64_decode': { mode: SandboxMode.TRUSTED, timeout: 1000 },
    'format_json': { mode: SandboxMode.TRUSTED, timeout: 1000 },
    'text_transform': { mode: SandboxMode.TRUSTED, timeout: 1000 },
    'generate_random': { mode: SandboxMode.TRUSTED, timeout: 100 },
    'color_converter': { mode: SandboxMode.TRUSTED, timeout: 100 },
    'unit_converter': { mode: SandboxMode.TRUSTED, timeout: 100 },
  },
};

// ==================== SANDBOX INTEGRATION ====================

export class SandboxIntegration {
  private static config: SandboxIntegrationConfig = DEFAULT_CONFIG;

  /**
   * Configure sandbox integration
   */
  static configure(config: Partial<SandboxIntegrationConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      toolConfigs: {
        ...this.config.toolConfigs,
        ...config.toolConfigs,
      },
    };
  }

  /**
   * Get current configuration
   */
  static getConfig(): SandboxIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable sandbox
   */
  static setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if sandbox is enabled
   */
  static isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Execute tool with sandbox (if enabled) or fallback to direct execution
   * 
   * This is the main integration point - replaces McpService.executeTool
   */
  static async executeToolWithSandbox(
    tool: string,
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // If sandbox is disabled, use original execution
    if (!this.config.enabled) {
      return McpService.executeTool(tool, args, files, callbacks);
    }

    try {
      // Get sandbox configuration for this tool
      const sandboxConfig = this.getSandboxConfigForTool(tool, args);

      // Execute within sandbox
      const result = await SandboxManager.execute({
        tool,
        args,
        config: sandboxConfig,
        executor: async (executorArgs) => {
          // Call original McpService.executeTool
          return McpService.executeTool(tool, executorArgs, files, callbacks);
        },
      });

      // If sandbox execution succeeded, return the data
      if (result.success && result.data) {
        return result.data;
      }

      // If sandbox execution failed, return error
      if (result.error) {
        return {
          success: false,
          message: result.error.message,
          error: result.error.code,
        };
      }

      // Fallback error
      return {
        success: false,
        message: 'Sandbox execution failed without error details',
        error: 'SANDBOX_ERROR',
      };

    } catch (error: any) {
      // Handle unexpected errors
      const errorContext = ErrorHandler.handle(error, 'SANDBOX_INTEGRATION', {
        code: ErrorCode.TOOL_EXECUTION_FAILED,
        context: { tool, args },
      });

      return {
        success: false,
        message: errorContext.userMessage,
        error: errorContext.code,
      };
    }
  }

  /**
   * Get sandbox configuration for a specific tool
   */
  private static getSandboxConfigForTool(
    tool: string,
    args: Record<string, any>
  ): SandboxConfig {
    // Get tool-specific config or use defaults
    const toolConfig = this.config.toolConfigs[tool] || {};
    const mode = toolConfig.mode || this.config.defaultMode;

    // Infer capabilities if not explicitly provided
    const capabilities = toolConfig.capabilities || this.inferCapabilities(tool);

    // Build sandbox config
    const config: SandboxConfig = {
      mode,
      capabilities,
      timeout: toolConfig.timeout || 30000,
      allowedPaths: toolConfig.allowedPaths || this.getDefaultAllowedPaths(),
      metadata: {
        tool,
        timestamp: Date.now(),
      },
    };

    return config;
  }

  /**
   * Infer capabilities from tool name
   */
  private static inferCapabilities(tool: string): Capability[] {
    const capabilities: Capability[] = [];

    // File write operations
    if (['create_file', 'write_code', 'edit_file', 'replace_in_file', 'insert_at_line', 'replace_line'].includes(tool)) {
      capabilities.push(Capability.FS_WRITE, Capability.STATE_WRITE);
    }

    // File read operations
    if (['read_file', 'search_files', 'search_in_file', 'get_file_info', 'get_line', 'get_lines', 'project_overview'].includes(tool)) {
      capabilities.push(Capability.FS_READ, Capability.STATE_READ);
    }

    // File delete operations
    if (['delete_file', 'delete_line'].includes(tool)) {
      capabilities.push(Capability.FS_DELETE, Capability.STATE_WRITE);
    }

    // File move operations
    if (['move_file'].includes(tool)) {
      capabilities.push(Capability.FS_MOVE, Capability.STATE_WRITE);
    }

    // Command execution
    if (['run'].includes(tool)) {
      capabilities.push(Capability.EXEC_COMMAND);
    }

    // State operations
    if (['open_file', 'format_file'].includes(tool)) {
      capabilities.push(Capability.STATE_WRITE, Capability.FS_READ);
    }

    // If no capabilities inferred, allow all (TRUSTED mode)
    if (capabilities.length === 0) {
      capabilities.push(
        Capability.FS_READ,
        Capability.FS_WRITE,
        Capability.STATE_READ,
        Capability.STATE_WRITE
      );
    }

    return capabilities;
  }

  /**
   * Get default allowed paths (all paths allowed by default in CONTROLLED mode)
   */
  private static getDefaultAllowedPaths(): string[] {
    // Allow all paths by default (empty array means no restrictions)
    // Can be configured per-tool or globally
    return [];
  }

  /**
   * Add tool-specific sandbox configuration
   */
  static configureTool(
    tool: string,
    config: {
      mode?: SandboxMode;
      capabilities?: Capability[];
      timeout?: number;
      allowedPaths?: string[];
    }
  ): void {
    this.config.toolConfigs[tool] = {
      ...this.config.toolConfigs[tool],
      ...config,
    };
  }

  /**
   * Get tool-specific configuration
   */
  static getToolConfig(tool: string): typeof DEFAULT_CONFIG.toolConfigs[string] | undefined {
    return this.config.toolConfigs[tool];
  }

  /**
   * Reset configuration to defaults
   */
  static resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get sandbox statistics
   */
  static getStats() {
    return SandboxManager.getStats();
  }

  /**
   * Get recent sandbox executions
   */
  static getRecentExecutions(count?: number) {
    return SandboxManager.getRecentExecutions(count);
  }
}
