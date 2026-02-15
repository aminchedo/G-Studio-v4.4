/**
 * Tool Executor - Central execution engine with mandatory enforcement
 * CRITICAL: All tool executions MUST go through this executor
 */

import { ExecutionContext, getGlobalContext } from './context';
import { PolicyEnforcer, getGlobalEnforcer, PolicyViolationError } from '../policy/enforcement';
import { ToolRegistry, getGlobalRegistry } from '../tools/registry';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export class ToolExecutor {
  private context: ExecutionContext;
  private enforcer: PolicyEnforcer;
  private registry: ToolRegistry;

  constructor(
    context?: ExecutionContext,
    enforcer?: PolicyEnforcer,
    registry?: ToolRegistry
  ) {
    this.context = context || getGlobalContext();
    this.enforcer = enforcer || getGlobalEnforcer();
    this.registry = registry || getGlobalRegistry();
  }

  /**
   * CRITICAL EXECUTION POINT
   * This is the ONLY way tools should be executed
   * Enforces policy before execution
   */
  async execute(toolName: string, args?: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    console.log(`\n[EXECUTOR] ========================================`);
    console.log(`[EXECUTOR] Attempting to execute: ${toolName}`);
    console.log(`[EXECUTOR] Arguments:`, args);

    try {
      // STEP 1: MANDATORY POLICY ENFORCEMENT
      // This will throw if requirements are not met
      this.enforcer.enforcePolicy(toolName, this.context);

      // STEP 2: Get tool implementation
      const tool = this.registry.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool "${toolName}" not found in registry`);
      }

      // STEP 3: Execute tool
      console.log(`[EXECUTOR] Executing tool implementation...`);
      const result = await tool.execute(args);

      // STEP 4: Record successful execution
      const executionTime = Date.now() - startTime;
      this.context.recordExecution(toolName, true, result);

      console.log(`[EXECUTOR] ✅ Success in ${executionTime}ms`);
      console.log(`[EXECUTOR] ========================================\n`);

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failed execution
      this.context.recordExecution(toolName, false, undefined, errorMessage);

      console.error(`[EXECUTOR] ❌ Failed in ${executionTime}ms`);
      console.error(`[EXECUTOR] Error:`, errorMessage);
      console.error(`[EXECUTOR] ========================================\n`);

      // Re-throw PolicyViolationError to maintain enforcement
      if (error instanceof PolicyViolationError) {
        throw error;
      }

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * Execute multiple tools in sequence
   * Stops on first failure
   */
  async executeSequence(toolNames: string[], args?: any[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    for (let i = 0; i < toolNames.length; i++) {
      const toolName = toolNames[i];
      const toolArgs = args?.[i];
      
      const result = await this.execute(toolName, toolArgs);
      results.push(result);
      
      if (!result.success) {
        console.error(`[EXECUTOR] Sequence stopped at "${toolName}" due to failure`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Check if a tool can be executed without actually executing it
   */
  canExecute(toolName: string): {
    allowed: boolean;
    missingDependencies: string[];
  } {
    return this.enforcer.canExecute(toolName, this.context);
  }

  /**
   * Get execution context
   */
  getContext(): ExecutionContext {
    return this.context;
  }

  /**
   * Get policy enforcer
   */
  getEnforcer(): PolicyEnforcer {
    return this.enforcer;
  }

  /**
   * Get tool registry
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }
}

/**
 * Global executor singleton
 */
let globalExecutor: ToolExecutor | null = null;

export function getGlobalExecutor(): ToolExecutor {
  if (!globalExecutor) {
    globalExecutor = new ToolExecutor();
  }
  return globalExecutor;
}
