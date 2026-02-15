/**
 * Execution Context - Tracks tool execution state
 * This is the source of truth for enforcement decisions
 */

export interface ExecutionRecord {
  toolName: string;
  timestamp: number;
  success: boolean;
  result?: any;
  error?: string;
}

export class ExecutionContext {
  private executedTools: Map<string, ExecutionRecord> = new Map();
  private sessionId: string;
  private startTime: number;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
  }

  /**
   * Record a tool execution
   * CRITICAL: This is the only way to mark a tool as executed
   */
  recordExecution(toolName: string, success: boolean, result?: any, error?: string): void {
    const record: ExecutionRecord = {
      toolName,
      timestamp: Date.now(),
      success,
      result,
      error
    };
    
    this.executedTools.set(toolName, record);
    
    console.log(`[CONTEXT] Recorded execution: ${toolName} | Success: ${success}`);
  }

  /**
   * Check if a tool has been successfully executed
   * CRITICAL: Returns false unless tool was executed AND succeeded
   */
  hasExecuted(toolName: string): boolean {
    const record = this.executedTools.get(toolName);
    return record !== undefined && record.success === true;
  }

  /**
   * Get all successfully executed tools
   */
  getExecutedTools(): string[] {
    return Array.from(this.executedTools.entries())
      .filter(([_, record]) => record.success)
      .map(([toolName, _]) => toolName);
  }

  /**
   * Get execution record for a specific tool
   */
  getExecutionRecord(toolName: string): ExecutionRecord | undefined {
    return this.executedTools.get(toolName);
  }

  /**
   * Get all execution records
   */
  getAllRecords(): ExecutionRecord[] {
    return Array.from(this.executedTools.values());
  }

  /**
   * Clear execution history (use with caution)
   */
  reset(): void {
    console.warn(`[CONTEXT] Resetting execution context for session ${this.sessionId}`);
    this.executedTools.clear();
  }

  /**
   * Get session metadata
   */
  getMetadata() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      executedCount: this.executedTools.size,
      uptime: Date.now() - this.startTime
    };
  }
}

/**
 * Global context singleton
 * In production, this would be managed per-session/per-user
 */
let globalContext: ExecutionContext | null = null;

export function getGlobalContext(): ExecutionContext {
  if (!globalContext) {
    globalContext = new ExecutionContext();
  }
  return globalContext;
}

export function resetGlobalContext(): void {
  globalContext = new ExecutionContext();
}
