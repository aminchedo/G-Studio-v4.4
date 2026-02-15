/**
 * Model Integration - Exposes tools to LLM in executable format
 * This enables the model to actually modify code and verify results
 */

import { ToolDispatcher, DispatchResult } from './toolDispatcher';
import { ToolRegistry } from './toolRegistry';

export interface ToolCall {
  tool: string;
  args: any;
  id?: string;
}

export interface ToolResponse {
  id?: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

/**
 * Model Integration Layer
 * Provides clean interface for LLM to execute tools
 */
export class ModelIntegration {
  /**
   * Execute a single tool call from the model
   */
  static async executeTool(call: ToolCall): Promise<ToolResponse> {
    const result = await ToolDispatcher.dispatch(call.tool, call.args);
    
    return {
      id: call.id,
      success: result.success,
      result: result.data,
      error: result.error,
      executionTime: result.executionTime
    };
  }

  /**
   * Execute multiple tool calls in sequence
   */
  static async executeSequence(calls: ToolCall[]): Promise<ToolResponse[]> {
    const responses: ToolResponse[] = [];
    
    for (const call of calls) {
      const response = await this.executeTool(call);
      responses.push(response);
      
      // Stop on first failure
      if (!response.success) {
        break;
      }
    }
    
    return responses;
  }

  /**
   * Execute multiple tool calls in parallel
   */
  static async executeParallel(calls: ToolCall[]): Promise<ToolResponse[]> {
    const promises = calls.map(call => this.executeTool(call));
    return await Promise.all(promises);
  }

  /**
   * Get available tools for the model
   */
  static getAvailableTools(): Array<{
    name: string;
    description: string;
    category: string;
    parameters: any;
  }> {
    const tools = ToolRegistry.getAll();
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      parameters: this.getToolParameters(tool.name)
    }));
  }

  /**
   * Get parameters for a specific tool
   */
  private static getToolParameters(toolName: string): any {
    const parameterMap: Record<string, any> = {
      read_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' }
        },
        required: ['path']
      },
      write_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' }
        },
        required: ['path', 'content']
      },
      delete_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to delete' }
        },
        required: ['path']
      },
      move_file: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source file path' },
          destination: { type: 'string', description: 'Destination file path' }
        },
        required: ['source', 'destination']
      },
      run_command: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          cwd: { type: 'string', description: 'Working directory (optional)' },
          timeout: { type: 'number', description: 'Timeout in milliseconds (optional)' }
        },
        required: ['command']
      },
      run_tests: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Test file pattern (optional)' }
        },
        required: []
      },
      lint_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to lint' }
        },
        required: ['path']
      },
      check_types: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to type check (optional, checks all if omitted)' }
        },
        required: []
      },
      format_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to format' }
        },
        required: ['path']
      }
    };

    return parameterMap[toolName] || {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * Get tool execution statistics
   */
  static getStatistics() {
    return ToolDispatcher.getStatistics();
  }

  /**
   * Get recent execution history
   */
  static getHistory(limit: number = 10) {
    return ToolDispatcher.getExecutionHistory(limit);
  }
}

/**
 * Self-Verification Loop
 * Enables the model to verify its own changes
 */
export class SelfVerification {
  /**
   * Verify a code change
   */
  static async verifyChange(filePath: string): Promise<{
    success: boolean;
    checks: {
      syntax: boolean;
      types: boolean;
      lint: boolean;
      tests: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const checks = {
      syntax: false,
      types: false,
      lint: false,
      tests: false
    };

    // 1. Check syntax by trying to read and parse
    try {
      const readResult = await ToolDispatcher.dispatch('read_file', { path: filePath });
      if (readResult.success) {
        checks.syntax = true;
      } else {
        errors.push(`Syntax check failed: ${readResult.error}`);
      }
    } catch (error: any) {
      errors.push(`Syntax check error: ${error.message}`);
    }

    // 2. Type check
    try {
      const typeResult = await ToolDispatcher.dispatch('check_types', { path: filePath });
      if (typeResult.success && typeResult.data.success) {
        checks.types = true;
      } else {
        errors.push(`Type check failed: ${typeResult.data.diagnostics?.join(', ') || 'Unknown error'}`);
      }
    } catch (error: any) {
      errors.push(`Type check error: ${error.message}`);
    }

    // 3. Lint check
    try {
      const lintResult = await ToolDispatcher.dispatch('lint_file', { path: filePath });
      if (lintResult.success && lintResult.data.success) {
        checks.lint = true;
      } else {
        errors.push(`Lint check failed: ${JSON.stringify(lintResult.data.results)}`);
      }
    } catch (error: any) {
      errors.push(`Lint check error: ${error.message}`);
    }

    // 4. Run tests (if test file exists)
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      try {
        const testResult = await ToolDispatcher.dispatch('run_tests', { pattern: filePath });
        if (testResult.success && testResult.data.success) {
          checks.tests = true;
        } else {
          errors.push(`Tests failed: ${JSON.stringify(testResult.data.results)}`);
        }
      } catch (error: any) {
        errors.push(`Test execution error: ${error.message}`);
      }
    } else {
      checks.tests = true; // Not a test file, skip
    }

    return {
      success: checks.syntax && checks.types && checks.lint && checks.tests,
      checks,
      errors
    };
  }

  /**
   * Auto-fix common issues
   */
  static async autoFix(filePath: string): Promise<{
    success: boolean;
    fixed: string[];
    errors: string[];
  }> {
    const fixed: string[] = [];
    const errors: string[] = [];

    // 1. Format file
    try {
      const formatResult = await ToolDispatcher.dispatch('format_file', { path: filePath });
      if (formatResult.success && formatResult.data.formatted) {
        await ToolDispatcher.dispatch('write_file', {
          path: filePath,
          content: formatResult.data.formatted
        });
        fixed.push('Formatted code');
      }
    } catch (error: any) {
      errors.push(`Format error: ${error.message}`);
    }

    // 2. Re-verify after fixes
    const verification = await this.verifyChange(filePath);
    
    return {
      success: verification.success,
      fixed,
      errors: [...errors, ...verification.errors]
    };
  }

  /**
   * Create a diff of changes
   */
  static async createDiff(filePath: string, oldContent: string, newContent: string): Promise<{
    success: boolean;
    diff?: string;
    error?: string;
  }> {
    try {
      // Simple line-by-line diff
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      const diff: string[] = [];
      const maxLines = Math.max(oldLines.length, newLines.length);
      
      for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        
        if (oldLine !== newLine) {
          if (oldLine !== undefined) {
            diff.push(`- ${oldLine}`);
          }
          if (newLine !== undefined) {
            diff.push(`+ ${newLine}`);
          }
        }
      }
      
      return {
        success: true,
        diff: diff.join('\n')
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback a change
   */
  static async rollback(filePath: string, previousContent: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await ToolDispatcher.dispatch('write_file', {
        path: filePath,
        content: previousContent
      });
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
