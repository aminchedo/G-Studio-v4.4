/**
 * Tool Dispatcher - Routes tool calls to REAL implementations
 * This is the execution engine - NOT a simulator
 */

import { ToolRegistry } from './toolRegistry';

export interface DispatchResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  toolName: string;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

/**
 * Tool Dispatcher - Central execution point for all tools
 */
export class ToolDispatcher {
  private static executionLog: DispatchResult[] = [];
  private static maxLogSize = 1000;

  /**
   * Dispatch tool execution
   * This is the ONLY entry point for tool execution
   */
  static async dispatch(toolName: string, args: any = {}): Promise<DispatchResult> {
    const startTime = Date.now();
    
    console.log(`[DISPATCHER] Executing: ${toolName}`);
    console.log(`[DISPATCHER] Args:`, JSON.stringify(args, null, 2));

    try {
      // Get tool from registry
      const tool = ToolRegistry.get(toolName);
      
      if (!tool) {
        const result: DispatchResult = {
          success: false,
          error: `Tool '${toolName}' not found. Available tools: ${ToolRegistry.getToolNames().join(', ')}`,
          executionTime: Date.now() - startTime,
          toolName
        };
        this.logExecution(result);
        return result;
      }

      // Validate args if required
      if (tool.requiresValidation) {
        const validation = this.validateArgs(args, toolName);
        if (!validation.valid) {
          const result: DispatchResult = {
            success: false,
            error: `Validation failed: ${validation.errors.join(', ')}`,
            executionTime: Date.now() - startTime,
            toolName
          };
          this.logExecution(result);
          return result;
        }
      }

      // EXECUTE THE TOOL - This is real execution
      const data = await tool.execute(args);

      const result: DispatchResult = {
        success: data.success !== false,
        data,
        executionTime: Date.now() - startTime,
        toolName
      };

      console.log(`[DISPATCHER] ✅ Success: ${toolName} (${result.executionTime}ms)`);
      this.logExecution(result);
      return result;

    } catch (error: any) {
      const result: DispatchResult = {
        success: false,
        error: error.message || 'Unknown error',
        executionTime: Date.now() - startTime,
        toolName
      };

      console.error(`[DISPATCHER] ❌ Error: ${toolName}`, error);
      this.logExecution(result);
      return result;
    }
  }

  /**
   * Validate arguments
   */
  private static validateArgs(args: any, toolName: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation - ensure args is an object
    if (typeof args !== 'object' || args === null) {
      errors.push('Arguments must be an object');
      return { valid: false, errors };
    }

    // Tool-specific validation rules
    const rules = this.getValidationRules(toolName);
    
    for (const rule of rules) {
      const value = args[rule.field];

      // Required check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      // Skip further validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type check
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field '${rule.field}' must be of type ${rule.type}, got ${actualType}`);
          continue;
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`Field '${rule.field}' does not match required pattern`);
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field '${rule.field}' must be at most ${rule.max}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get validation rules for a tool
   */
  private static getValidationRules(toolName: string): ValidationRule[] {
    const rules: Record<string, ValidationRule[]> = {
      read_file: [
        { field: 'path', required: true, type: 'string', minLength: 1 }
      ],
      write_file: [
        { field: 'path', required: true, type: 'string', minLength: 1 },
        { field: 'content', required: true, type: 'string' }
      ],
      delete_file: [
        { field: 'path', required: true, type: 'string', minLength: 1 }
      ],
      move_file: [
        { field: 'source', required: true, type: 'string', minLength: 1 },
        { field: 'destination', required: true, type: 'string', minLength: 1 }
      ],
      copy_file: [
        { field: 'source', required: true, type: 'string', minLength: 1 },
        { field: 'destination', required: true, type: 'string', minLength: 1 }
      ],
      run_command: [
        { field: 'command', required: true, type: 'string', minLength: 1 }
      ]
    };

    return rules[toolName] || [];
  }

  /**
   * Log execution for audit trail
   */
  private static logExecution(result: DispatchResult) {
    this.executionLog.push(result);
    
    // Keep log size manageable
    if (this.executionLog.length > this.maxLogSize) {
      this.executionLog.shift();
    }
  }

  /**
   * Get execution history
   */
  static getExecutionHistory(limit?: number): DispatchResult[] {
    if (limit) {
      return this.executionLog.slice(-limit);
    }
    return [...this.executionLog];
  }

  /**
   * Get execution statistics
   */
  static getStatistics() {
    const total = this.executionLog.length;
    const successful = this.executionLog.filter(r => r.success).length;
    const failed = total - successful;
    
    const byTool: Record<string, { total: number; successful: number; failed: number }> = {};
    
    for (const result of this.executionLog) {
      if (!byTool[result.toolName]) {
        byTool[result.toolName] = { total: 0, successful: 0, failed: 0 };
      }
      byTool[result.toolName].total++;
      if (result.success) {
        byTool[result.toolName].successful++;
      } else {
        byTool[result.toolName].failed++;
      }
    }

    const avgExecutionTime = total > 0
      ? this.executionLog.reduce((sum, r) => sum + r.executionTime, 0) / total
      : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
      byTool
    };
  }

  /**
   * Clear execution history
   */
  static clearHistory() {
    this.executionLog = [];
  }

  /**
   * Batch dispatch - execute multiple tools in sequence
   */
  static async batchDispatch(
    calls: Array<{ tool: string; args: any }>
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    
    for (const call of calls) {
      const result = await this.dispatch(call.tool, call.args);
      results.push(result);
      
      // Stop on first failure if needed
      if (!result.success) {
        console.warn(`[DISPATCHER] Batch execution stopped at ${call.tool} due to failure`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Parallel dispatch - execute multiple tools concurrently
   */
  static async parallelDispatch(
    calls: Array<{ tool: string; args: any }>
  ): Promise<DispatchResult[]> {
    const promises = calls.map(call => this.dispatch(call.tool, call.args));
    return await Promise.all(promises);
  }
}
