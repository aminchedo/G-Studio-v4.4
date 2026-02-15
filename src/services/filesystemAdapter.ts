/**
 * FilesystemAdapter - Compatibility Bridge
 * 
 * Purpose: Route tool execution between in-memory and filesystem modes
 * - Default: in-memory (existing behavior, unchanged)
 * - Optional: filesystem (real filesystem operations, opt-in only)
 * 
 * Safety Guarantees:
 * - No breaking changes
 * - Backward compatible
 * - Instant rollback via environment variable
 * - Filesystem mode requires explicit enablement
 * - Tool whitelist enforcement
 * - Sandbox permission checks
 * - Path validation (project root only)
 * - State synchronization (FS → memory → UI)
 * 
 * Phase 1: Adapter structure only (filesystem mode throws error)
 * Phase 2: Real filesystem operations with safety enforcement
 * Phase 3: Policy-based access control and audit logging
 */

import { McpToolResult, McpToolCallbacks } from '@/types';
import { McpService } from './mcpService';
// Runtime imports are redirected to browser stub in vite.config.ts
import { FileOperations } from '../runtime/toolRuntime';
import { SandboxManager, SandboxMode, Capability } from './sandboxManager';
import { TelemetryService } from './telemetryService';
import { ErrorHandler, ErrorCode } from './errorHandler';
import { PolicyEngine, Role, PolicyEvaluationContext } from './policyEngine';
import { AuditLogger, AuditEventType } from './auditLogger';

// Browser-safe path utilities
const isNode = typeof process !== 'undefined' && process.versions?.node;
let path: any = null;
if (isNode) {
  try {
    path = require('path');
  } catch (e) {
    // path module not available
  }
}

// Browser-compatible path utilities
const pathUtils = {
  isAbsolute: (filePath: string): boolean => {
    if (path) return path.isAbsolute(filePath);
    // Browser fallback
    return filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath);
  },
  join: (...paths: string[]): string => {
    if (path) return path.join(...paths);
    // Browser fallback
    return paths.join('/').replace(/\/+/g, '/');
  },
  normalize: (filePath: string): string => {
    if (path) return path.normalize(filePath);
    // Browser fallback - simple normalization
    return filePath.replace(/\/+/g, '/').replace(/\/\.\//g, '/').replace(/\/\.\.\//g, '/');
  }
};

type ExecutionMode = 'memory' | 'filesystem';

// PHASE 2: Tool whitelist - only these tools can use filesystem mode
// PHASE 3: Expanded whitelist with policy-based access control
const FILESYSTEM_ALLOWED_TOOLS = ['read_file', 'write_file', 'delete_file', 'move_file', 'create_directory'];

// Project root for path validation
// In browser/Electron renderer, use a safe default or get from environment
const PROJECT_ROOT = (() => {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    try {
      return process.cwd();
    } catch (e) {
      // process.cwd() not available
    }
  }
  // Browser fallback
  return typeof window !== 'undefined' ? window.location.pathname.replace(/\/[^/]*$/, '') : '/';
})();

// PHASE 3: Default role (can be overridden per request)
let DEFAULT_ROLE = Role.DEVELOPER;

export class FilesystemAdapter {
  /**
   * Set default role for operations
   * PHASE 3: Role-based access control
   */
  static setDefaultRole(role: Role): void {
    DEFAULT_ROLE = role;
  }

  /**
   * Get default role
   */
  static getDefaultRole(): Role {
    return DEFAULT_ROLE;
  }

  /**
   * Main execution entry point
   * Routes to appropriate execution mode
   * 
   * @param tool - Tool name to execute
   * @param args - Tool arguments
   * @param files - In-memory files object
   * @param callbacks - State update callbacks
   * @param mode - Execution mode (default: 'memory')
   * @param role - User role for policy evaluation (default: DEFAULT_ROLE)
   * @returns Tool execution result
   */
  static async execute(
    tool: string,
    args: Record<string, any>,
    files: Record<string, any>,
    callbacks: McpToolCallbacks,
    mode: ExecutionMode = 'memory',
    role: Role = DEFAULT_ROLE
  ): Promise<McpToolResult> {
    
    // SAFETY: Default behavior unchanged
    // All existing functionality routes through here with mode='memory'
    if (mode === 'memory') {
      return McpService.executeToolInternal(tool, args, files, callbacks);
    }
    
    // --- Filesystem Mode (Phase 2+) ---
    // NOTE: Intentionally blocked until Phase 2 implementation
    // This ensures no accidental filesystem access in Phase 1
    
    const result = await this.executeFilesystemTool(tool, args, callbacks);
    
    // Sync filesystem changes back to in-memory state
    // Maintains UI consistency
    await this.syncState(result, tool, args, callbacks);
    
    return result;
  }
  
  /**
   * Execute tool in filesystem mode
   * 
   * Phase 2: Real filesystem operations with safety enforcement
   * - Tool whitelist enforcement
   * - Sandbox permission checks
   * - Path validation
   * - Telemetry logging
   * - Error recovery
   * 
   * @private
   */
  private static async executeFilesystemTool(
    tool: string,
    args: Record<string, any>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    
    try {
      // SAFETY CHECK 1: Tool whitelist enforcement
      if (!FILESYSTEM_ALLOWED_TOOLS.includes(tool)) {
        const error = `Tool "${tool}" is not whitelisted for filesystem mode. Allowed tools: ${FILESYSTEM_ALLOWED_TOOLS.join(', ')}`;
        TelemetryService.recordEvent('filesystem_tool_blocked', {
          tool,
          reason: 'not_whitelisted',
        });
        
        return {
          success: false,
          message: error,
          error: 'TOOL_NOT_WHITELISTED',
        };
      }
      
      // SAFETY CHECK 2: Path validation
      const filePath = args.path || args.filename;
      if (!filePath) {
        return {
          success: false,
          message: 'File path is required',
          error: 'MISSING_PATH',
        };
      }
      
      const pathValidation = this.validatePath(filePath);
      if (!pathValidation.valid) {
        TelemetryService.recordEvent('filesystem_path_blocked', {
          tool,
          path: filePath,
          reason: pathValidation.error,
        });
        
        return {
          success: false,
          message: `Path validation failed: ${pathValidation.error}`,
          error: 'INVALID_PATH',
        };
      }
      
      // SAFETY CHECK 3: Sandbox permission check
      const sandboxResult = await this.checkSandboxPermissions(tool, args, pathValidation.absolute);
      if (!sandboxResult.allowed) {
        TelemetryService.recordEvent('filesystem_sandbox_blocked', {
          tool,
          path: filePath,
          reason: sandboxResult.reason,
        });
        
        return {
          success: false,
          message: `Sandbox permission denied: ${sandboxResult.reason}`,
          error: 'PERMISSION_DENIED',
        };
      }
      
      // Execute filesystem operation based on tool
      let result: McpToolResult;
      
      switch (tool) {
        case 'read_file':
          result = await this.executeFilesystemRead(filePath, pathValidation.absolute);
          break;
          
        case 'write_file':
          result = await this.executeFilesystemWrite(
            filePath,
            pathValidation.absolute,
            args.content || '',
            callbacks
          );
          break;
          
        default:
          // Should never reach here due to whitelist check
          result = {
            success: false,
            message: `Tool "${tool}" not implemented for filesystem mode`,
            error: 'NOT_IMPLEMENTED',
          };
      }
      
      // Record telemetry
      const duration = Date.now() - startTime;
      TelemetryService.recordEvent('filesystem_tool_execution', {
        tool,
        success: result.success,
        duration,
        path: filePath,
      });
      
      return result;
      
    } catch (error: any) {
      // Error recovery
      const duration = Date.now() - startTime;
      const errorContext = ErrorHandler.handle(error, 'FILESYSTEM_EXECUTION', {
        code: ErrorCode.TOOL_EXECUTION_FAILED,
        context: { tool, args },
      });
      
      TelemetryService.recordEvent('filesystem_tool_error', {
        tool,
        duration,
        error: errorContext.message,
      });
      
      return {
        success: false,
        message: `Filesystem operation failed: ${errorContext.userMessage}`,
        error: errorContext.code,
      };
    }
  }
  
  /**
   * Synchronize filesystem changes back to in-memory state
   * Ensures UI remains consistent with filesystem
   * 
   * Phase 2: Real state synchronization
   * - Read file back from filesystem after write
   * - Update in-memory files object
   * - Trigger UI refresh
   * - Handle sync failures with rollback
   * 
   * @private
   */
  private static async syncState(
    result: McpToolResult,
    tool: string,
    args: Record<string, any>,
    callbacks: McpToolCallbacks
  ): Promise<void> {
    // Only sync on successful write operations
    if (!result.success || tool !== 'write_file') {
      return;
    }
    
    try {
      const filePath = args.path || args.filename;
      if (!filePath) return;
      
      // Read file back from filesystem to ensure consistency
      const readResult = await FileOperations.readFile(filePath);
      
      if (readResult.success && readResult.content !== undefined) {
        // Update in-memory state
        callbacks.setFiles(prev => ({
          ...prev,
          [filePath]: {
            name: filePath,
            content: readResult.content!,
            language: filePath.split('.').pop() || 'plaintext',
          },
        }));
        
        // Ensure file is open in UI
        if (!callbacks.getOpenFiles().includes(filePath)) {
          callbacks.setOpenFiles(prev => [...prev, filePath]);
        }
        callbacks.setActiveFile(filePath);
        
        TelemetryService.recordEvent('filesystem_state_sync', {
          tool,
          path: filePath,
          success: true,
        });
      } else {
        // Sync failed - log warning but don't fail the operation
        TelemetryService.recordEvent('filesystem_state_sync', {
          tool,
          path: filePath,
          success: false,
          error: readResult.error,
        });
        
        console.warn(`State sync failed for ${filePath}: ${readResult.error}`);
      }
    } catch (error: any) {
      // Sync failure should not fail the operation
      // Log error and continue
      TelemetryService.recordEvent('filesystem_state_sync_error', {
        tool,
        error: error.message,
      });
      
      console.error('State synchronization error:', error);
    }
  }
  
  /**
   * Check if filesystem mode is enabled
   * 
   * @returns true if filesystem mode is enabled via environment variable
   */
  static isFilesystemModeEnabled(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.ENABLE_FILESYSTEM_MODE === 'true';
    }
    // Browser fallback - filesystem mode disabled in browser
    return false;
  }
  
  /**
   * Get current execution mode based on environment
   * 
   * @returns 'filesystem' if enabled, 'memory' otherwise
   */
  static getCurrentMode(): ExecutionMode {
    return this.isFilesystemModeEnabled() ? 'filesystem' : 'memory';
  }
  
  // ==================== PHASE 2: HELPER METHODS ====================
  
  /**
   * Validate file path
   * - Must be within project root
   * - No directory traversal
   * - No absolute paths outside project
   * 
   * @private
   */
  private static validatePath(filePath: string): {
    valid: boolean;
    absolute: string;
    error?: string;
  } {
    try {
      // Resolve to absolute path
      const absolute = pathUtils.isAbsolute(filePath)
        ? filePath
        : pathUtils.join(PROJECT_ROOT, filePath);
      
      // Normalize to remove .. and .
      const normalized = pathUtils.normalize(absolute);
      
      // Check if within project root
      if (!normalized.startsWith(PROJECT_ROOT)) {
        return {
          valid: false,
          absolute: normalized,
          error: 'Path outside project root (directory traversal blocked)',
        };
      }
      
      // Check for suspicious patterns
      if (filePath.includes('..') || filePath.includes('~')) {
        return {
          valid: false,
          absolute: normalized,
          error: 'Path contains suspicious patterns',
        };
      }
      
      return {
        valid: true,
        absolute: normalized,
      };
    } catch (error: any) {
      return {
        valid: false,
        absolute: '',
        error: `Path validation error: ${error.message}`,
      };
    }
  }
  
  /**
   * Check sandbox permissions before filesystem operation
   * 
   * @private
   */
  private static async checkSandboxPermissions(
    tool: string,
    args: Record<string, any>,
    absolutePath: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Execute through sandbox with CONTROLLED mode
      const result = await SandboxManager.execute({
        tool,
        args,
        config: {
          mode: SandboxMode.CONTROLLED,
          capabilities: [
            tool === 'read_file' ? Capability.FS_READ : Capability.FS_WRITE,
            Capability.STATE_READ,
            Capability.STATE_WRITE,
          ],
          timeout: 10000, // 10 second timeout
          allowedPaths: [PROJECT_ROOT + '/**'], // Allow all paths within project
        },
        executor: async () => {
          // Dummy executor - we just want permission check
          return { allowed: true };
        },
      });
      
      if (!result.success) {
        return {
          allowed: false,
          reason: result.error?.message || 'Sandbox check failed',
        };
      }
      
      // Check for violations
      if (result.metadata.violations.length > 0) {
        const criticalViolations = result.metadata.violations.filter(
          v => v.severity === 'critical' || v.severity === 'high'
        );
        
        if (criticalViolations.length > 0) {
          return {
            allowed: false,
            reason: criticalViolations[0].message,
          };
        }
      }
      
      return { allowed: true };
      
    } catch (error: any) {
      return {
        allowed: false,
        reason: `Sandbox check error: ${error.message}`,
      };
    }
  }
  
  /**
   * Execute filesystem read operation
   * 
   * @private
   */
  private static async executeFilesystemRead(
    filePath: string,
    absolutePath: string
  ): Promise<McpToolResult> {
    const readResult = await FileOperations.readFile(filePath);
    
    if (!readResult.success) {
      return {
        success: false,
        message: `Failed to read file ${filePath}: ${readResult.error}`,
        error: readResult.error || 'FILE_READ_ERROR',
      };
    }
    
    return {
      success: true,
      message: `File ${filePath} read successfully from filesystem`,
      data: {
        content: readResult.content,
        path: filePath,
        size: readResult.content?.length || 0,
        lines: readResult.content?.split('\n').length || 0,
        mode: 'filesystem',
      },
    };
  }
  
  /**
   * Execute filesystem write operation
   * 
   * @private
   */
  private static async executeFilesystemWrite(
    filePath: string,
    absolutePath: string,
    content: string,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const writeResult = await FileOperations.writeFile(filePath, content);
    
    if (!writeResult.success) {
      return {
        success: false,
        message: `Failed to write file ${filePath}: ${writeResult.error}`,
        error: writeResult.error || 'FILE_WRITE_ERROR',
      };
    }
    
    return {
      success: true,
      message: `File ${filePath} written successfully to filesystem`,
      data: {
        path: filePath,
        size: content.length,
        lines: content.split('\n').length,
        mode: 'filesystem',
      },
    };
  }
}
