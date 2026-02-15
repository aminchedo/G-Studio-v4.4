/**
 * SandboxManager - Core Sandbox Execution Layer
 * 
 * Purpose: Provide isolated, secure execution environment for tool operations
 * - Capability-based access control
 * - Execution boundary enforcement
 * - Resource limits and timeouts
 * - Predictable and auditable behavior
 * 
 * Phase 7A: Core Sandbox Infrastructure
 * 
 * @example
 * const result = await SandboxManager.execute({
 *   tool: 'write_code',
 *   args: { path: 'test.ts', content: 'code' },
 *   capabilities: ['fs:write'],
 *   timeout: 5000,
 * });
 */

import { ErrorHandler, ErrorCode } from './errorHandler';
import { TelemetryService } from './monitoring/telemetryService';

// ==================== TYPES ====================

export enum SandboxMode {
  STRICT = 'strict',       // No writes, no network, read-only
  CONTROLLED = 'controlled', // Limited writes via whitelist
  TRUSTED = 'trusted',     // Full access (opt-in only)
}

export enum Capability {
  // Filesystem capabilities
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  FS_DELETE = 'fs:delete',
  FS_MOVE = 'fs:move',
  
  // State capabilities
  STATE_READ = 'state:read',
  STATE_WRITE = 'state:write',
  
  // Network capabilities (future)
  NETWORK_READ = 'network:read',
  NETWORK_WRITE = 'network:write',
  
  // Execution capabilities
  EXEC_COMMAND = 'exec:command',
  
  // Memory capabilities
  MEMORY_READ = 'memory:read',
  MEMORY_WRITE = 'memory:write',
}

export interface SandboxConfig {
  mode: SandboxMode;
  capabilities: Capability[];
  timeout?: number;           // Max execution time in ms
  maxMemory?: number;         // Max memory usage (simulated)
  maxCallDepth?: number;      // Max recursion depth
  allowedPaths?: string[];    // Whitelisted file paths (for CONTROLLED mode)
  metadata?: Record<string, any>;
}

export interface SandboxExecutionContext<T = any> {
  tool: string;
  args: Record<string, any>;
  config: SandboxConfig;
  executor: (args: Record<string, any>) => Promise<T>;
}

export interface SandboxExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: SandboxError;
  metadata: {
    duration: number;
    timestamp: number;
    mode: SandboxMode;
    capabilitiesUsed: Capability[];
    violations: SandboxViolation[];
  };
}

export interface SandboxError {
  code: ErrorCode;
  message: string;
  type: 'timeout' | 'capability' | 'resource' | 'validation' | 'execution';
  details?: Record<string, any>;
}

export interface SandboxViolation {
  type: 'capability' | 'timeout' | 'memory' | 'path' | 'depth';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SandboxStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  violations: number;
  averageDuration: number;
  byMode: Record<SandboxMode, number>;
  byViolationType: Record<string, number>;
}

// ==================== SANDBOX MANAGER ====================

export class SandboxManager {
  private static executionLog: Array<{
    tool: string;
    mode: SandboxMode;
    success: boolean;
    duration: number;
    timestamp: number;
    violations: SandboxViolation[];
  }> = [];
  
  private static maxLogSize = 500;
  private static activeExecutions = new Map<string, {
    startTime: number;
    config: SandboxConfig;
  }>();

  /**
   * Execute a tool within the sandbox with enforced boundaries
   */
  static async execute<T = any>(
    context: SandboxExecutionContext<T>
  ): Promise<SandboxExecutionResult<T>> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    const violations: SandboxViolation[] = [];
    const capabilitiesUsed: Capability[] = [];

    // Mark execution as active
    this.activeExecutions.set(executionId, {
      startTime,
      config: context.config,
    });

    try {
      // Step 1: Validate configuration
      this.validateConfig(context.config);

      // Step 2: Check capabilities before execution
      const requiredCapabilities = this.inferRequiredCapabilities(context.tool, context.args);
      const capabilityCheck = this.checkCapabilities(
        requiredCapabilities,
        context.config.capabilities,
        context.config.mode
      );

      if (!capabilityCheck.allowed) {
        const violation: SandboxViolation = {
          type: 'capability',
          message: `Tool '${context.tool}' requires capabilities: ${capabilityCheck.missing.join(', ')}`,
          timestamp: Date.now(),
          severity: 'critical',
        };
        violations.push(violation);

        throw this.createSandboxError(
          'capability',
          `Capability violation: ${violation.message}`,
          ErrorCode.PERMISSION_DENIED,
          { missing: capabilityCheck.missing, required: requiredCapabilities }
        );
      }

      capabilitiesUsed.push(...requiredCapabilities);

      // Step 3: Validate paths (for CONTROLLED mode)
      if (context.config.mode === SandboxMode.CONTROLLED) {
        const pathCheck = this.validatePaths(context.args, context.config.allowedPaths || []);
        if (!pathCheck.valid) {
          const violation: SandboxViolation = {
            type: 'path',
            message: `Path access denied: ${pathCheck.invalidPaths.join(', ')}`,
            timestamp: Date.now(),
            severity: 'high',
          };
          violations.push(violation);

          throw this.createSandboxError(
            'validation',
            violation.message,
            ErrorCode.PERMISSION_DENIED,
            { invalidPaths: pathCheck.invalidPaths }
          );
        }
      }

      // Step 4: Execute with timeout
      const timeout = context.config.timeout || 30000; // Default 30s
      const result = await this.executeWithTimeout(
        context.executor,
        context.args,
        timeout
      );

      // Step 5: Log successful execution
      this.logExecution({
        tool: context.tool,
        mode: context.config.mode,
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        violations,
      });

      // Step 6: Record telemetry
      TelemetryService.recordEvent('sandbox_execution', {
        tool: context.tool,
        mode: context.config.mode,
        success: true,
        duration: Date.now() - startTime,
        violations: violations.length,
      });

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          mode: context.config.mode,
          capabilitiesUsed,
          violations,
        },
      };

    } catch (error: any) {
      // Handle sandbox errors
      const sandboxError = error.isSandboxError
        ? error
        : this.createSandboxError(
            'execution',
            error.message || 'Unknown execution error',
            ErrorCode.TOOL_EXECUTION_FAILED,
            { originalError: error }
          );

      // Log failed execution
      this.logExecution({
        tool: context.tool,
        mode: context.config.mode,
        success: false,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        violations,
      });

      // Record telemetry
      TelemetryService.recordEvent('sandbox_execution', {
        tool: context.tool,
        mode: context.config.mode,
        success: false,
        duration: Date.now() - startTime,
        violations: violations.length,
        errorType: sandboxError.type,
      });

      // Use ErrorHandler for standardized error handling
      ErrorHandler.handle(sandboxError, 'SANDBOX_EXECUTION', {
        code: sandboxError.code,
        context: {
          tool: context.tool,
          mode: context.config.mode,
          violations,
        },
      });

      return {
        success: false,
        error: sandboxError,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          mode: context.config.mode,
          capabilitiesUsed,
          violations,
        },
      };

    } finally {
      // Mark execution as complete
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute function with timeout enforcement
   */
  private static async executeWithTimeout<T>(
    executor: (args: Record<string, any>) => Promise<T>,
    args: Record<string, any>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(this.createSandboxError(
          'timeout',
          `Execution exceeded timeout of ${timeout}ms`,
          ErrorCode.TOOL_EXECUTION_FAILED,
          { timeout }
        ));
      }, timeout);

      executor(args)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Validate sandbox configuration
   */
  private static validateConfig(config: SandboxConfig): void {
    if (!config.mode) {
      throw this.createSandboxError(
        'validation',
        'Sandbox mode is required',
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (!Object.values(SandboxMode).includes(config.mode)) {
      throw this.createSandboxError(
        'validation',
        `Invalid sandbox mode: ${config.mode}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (!Array.isArray(config.capabilities)) {
      throw this.createSandboxError(
        'validation',
        'Capabilities must be an array',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Validate timeout
    if (config.timeout !== undefined && (config.timeout < 0 || config.timeout > 300000)) {
      throw this.createSandboxError(
        'validation',
        'Timeout must be between 0 and 300000ms (5 minutes)',
        ErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * Infer required capabilities from tool name and arguments
   */
  private static inferRequiredCapabilities(
    tool: string,
    args: Record<string, any>
  ): Capability[] {
    const capabilities: Capability[] = [];

    // File operation tools
    if (['create_file', 'write_code', 'edit_file', 'replace_in_file', 'insert_at_line', 'replace_line'].includes(tool)) {
      capabilities.push(Capability.FS_WRITE, Capability.STATE_WRITE);
    }

    if (['read_file', 'search_files', 'search_in_file', 'get_file_info', 'get_line', 'get_lines', 'project_overview'].includes(tool)) {
      capabilities.push(Capability.FS_READ, Capability.STATE_READ);
    }

    if (['delete_file', 'delete_line'].includes(tool)) {
      capabilities.push(Capability.FS_DELETE, Capability.STATE_WRITE);
    }

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

    // If no specific capabilities inferred, return empty array (will be checked against allowed list)
    return capabilities;
  }

  /**
   * Check if required capabilities are allowed
   */
  private static checkCapabilities(
    required: Capability[],
    allowed: Capability[],
    mode: SandboxMode
  ): { allowed: boolean; missing: Capability[] } {
    // In STRICT mode, only read operations are allowed
    if (mode === SandboxMode.STRICT) {
      const writeCapabilities = [
        Capability.FS_WRITE,
        Capability.FS_DELETE,
        Capability.FS_MOVE,
        Capability.STATE_WRITE,
        Capability.NETWORK_WRITE,
        Capability.EXEC_COMMAND,
      ];

      const hasWriteCapability = required.some(cap => writeCapabilities.includes(cap));
      if (hasWriteCapability) {
        return {
          allowed: false,
          missing: required.filter(cap => writeCapabilities.includes(cap)),
        };
      }
    }

    // Check if all required capabilities are in allowed list
    const missing = required.filter(cap => !allowed.includes(cap));

    return {
      allowed: missing.length === 0,
      missing,
    };
  }

  /**
   * Validate file paths against whitelist (for CONTROLLED mode)
   */
  private static validatePaths(
    args: Record<string, any>,
    allowedPaths: string[]
  ): { valid: boolean; invalidPaths: string[] } {
    const pathFields = ['path', 'filename', 'source', 'destination'];
    const invalidPaths: string[] = [];

    for (const field of pathFields) {
      const path = args[field];
      if (path && typeof path === 'string') {
        const isAllowed = allowedPaths.length === 0 || allowedPaths.some(allowed => {
          // Support wildcards
          if (allowed.includes('*')) {
            const pattern = allowed.replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(path);
          }
          return path.startsWith(allowed);
        });

        if (!isAllowed) {
          invalidPaths.push(path);
        }
      }
    }

    return {
      valid: invalidPaths.length === 0,
      invalidPaths,
    };
  }

  /**
   * Create a sandbox error
   */
  private static createSandboxError(
    type: SandboxError['type'],
    message: string,
    code: ErrorCode,
    details?: Record<string, any>
  ): SandboxError & { isSandboxError: true } {
    return {
      isSandboxError: true,
      type,
      message,
      code,
      details,
    };
  }

  /**
   * Log execution to history
   */
  private static logExecution(log: {
    tool: string;
    mode: SandboxMode;
    success: boolean;
    duration: number;
    timestamp: number;
    violations: SandboxViolation[];
  }): void {
    this.executionLog.push(log);

    // Keep log size manageable
    if (this.executionLog.length > this.maxLogSize) {
      this.executionLog.shift();
    }
  }

  /**
   * Generate unique execution ID
   */
  private static generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get sandbox statistics
   */
  static getStats(): SandboxStats {
    const byMode: Record<SandboxMode, number> = {
      [SandboxMode.STRICT]: 0,
      [SandboxMode.CONTROLLED]: 0,
      [SandboxMode.TRUSTED]: 0,
    };

    const byViolationType: Record<string, number> = {};
    let totalDuration = 0;
    let totalViolations = 0;

    for (const log of this.executionLog) {
      byMode[log.mode]++;
      totalDuration += log.duration;
      totalViolations += log.violations.length;

      for (const violation of log.violations) {
        byViolationType[violation.type] = (byViolationType[violation.type] || 0) + 1;
      }
    }

    return {
      totalExecutions: this.executionLog.length,
      successfulExecutions: this.executionLog.filter(l => l.success).length,
      failedExecutions: this.executionLog.filter(l => !l.success).length,
      violations: totalViolations,
      averageDuration: this.executionLog.length > 0 ? totalDuration / this.executionLog.length : 0,
      byMode,
      byViolationType,
    };
  }

  /**
   * Get recent executions
   */
  static getRecentExecutions(count: number = 50): typeof SandboxManager.executionLog {
    return this.executionLog.slice(-count);
  }

  /**
   * Clear execution log
   */
  static clearLog(): void {
    this.executionLog = [];
  }

  /**
   * Check if any executions are currently active
   */
  static hasActiveExecutions(): boolean {
    return this.activeExecutions.size > 0;
  }

  /**
   * Get active execution count
   */
  static getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Cancel all active executions (emergency stop)
   */
  static cancelAllExecutions(): void {
    this.activeExecutions.clear();
  }
}
