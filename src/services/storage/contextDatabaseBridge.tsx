/**
 * Context Database Bridge
 * 
 * Renderer-side bridge to communicate with main process SQLite database
 * via IPC
 */

export interface ContextEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenEstimate: number;
  importance: number;
  createdAt: number;
}

export interface ContextSummary {
  id: string;
  layer: number;
  content: string;
  coversUntil: number;
  method: string;
  createdAt: number;
}

export interface ContextSize {
  totalTokens: number;
  entryCount: number;
}

class ContextDatabaseBridge {
  private static initialized: boolean = false;
  private static currentSessionId: string | null = null;

  /**
   * Check if IPC is available
   */
  private static isIPCAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electron?.ipcRenderer;
  }

  /**
   * Invoke IPC method
   * RUNTIME SAFETY: Never throws in browser mode, always returns fallback
   */
  private static async invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.isIPCAvailable()) {
      // Browser mode - use fallback, log as INFO (expected behavior)
      console.info('[ContextDatabaseBridge] Browser mode → using in-memory context');
      return { success: false, error: 'IPC not available', fallback: true };
    }

    try {
      return await (window as any).electron.ipcRenderer.invoke(channel, ...args);
    } catch (error: any) {
      // IPC error - log as WARN, return fallback, never throw
      console.warn(`[ContextDatabaseBridge] IPC error for ${channel} (non-fatal):`, error);
      return { success: false, error: error.message, fallback: true };
    }
  }

  /**
   * Initialize database
   */
  static async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    console.log('[ContextDatabaseBridge] Initializing...');
    const result = await this.invoke('context-db:init');
    
    if (result.success) {
      this.initialized = true;
      console.log('[ContextDatabaseBridge] Initialized');
      console.log('[CONTEXT]: sqlite + summary');
      return true;
    } else {
      // If this is a fallback (browser mode), log as info (expected behavior)
      if (result.fallback) {
        console.info('[ContextDatabaseBridge] Browser mode → using in-memory context');
      } else {
        console.error('[ContextDatabaseBridge] Initialization failed:', result.error);
      }
      return false;
    }
  }

  /**
   * Get or create current session
   */
  static async getCurrentSession(): Promise<string | null> {
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    const result = await this.invoke('context-db:get-current-session');
    if (result.success && result.sessionId) {
      this.currentSessionId = result.sessionId;
      return result.sessionId;
    }

    // Create new session if none exists
    const createResult = await this.invoke('context-db:create-session', 'CLOUD', 'gemini');
    if (createResult.success && createResult.sessionId) {
      this.currentSessionId = createResult.sessionId;
      return createResult.sessionId;
    }

    return null;
  }

  /**
   * Create a new session
   */
  static async createSession(mode: string = 'CLOUD', activeModel: string = 'gemini'): Promise<string | null> {
    const result = await this.invoke('context-db:create-session', mode, activeModel);
    if (result.success && result.sessionId) {
      this.currentSessionId = result.sessionId;
      return result.sessionId;
    }
    return null;
  }

  /**
   * Add context entry
   */
  static async addEntry(
    sessionId: string,
    entry: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      tokenEstimate?: number;
      importance?: number;
    }
  ): Promise<string | null> {
    const result = await this.invoke('context-db:add-entry', sessionId, {
      role: entry.role,
      content: entry.content,
      tokenEstimate: entry.tokenEstimate || 0,
      importance: entry.importance || 0.5,
    });

    return result.success && result.id ? result.id : null;
  }

  /**
   * Get relevant context entries
   */
  static async getRelevantContext(
    sessionId: string,
    query: string = '',
    limit: number = 20
  ): Promise<ContextEntry[]> {
    const result = await this.invoke('context-db:get-context', sessionId, query, limit);
    
    if (result.success && result.entries) {
      return result.entries.map((e: any) => ({
        id: e.id,
        role: e.role,
        content: e.content,
        tokenEstimate: e.token_estimate || 0,
        importance: e.importance || 0.5,
        createdAt: e.created_at || Date.now(),
      }));
    }

    return [];
  }

  /**
   * Create summary
   */
  static async createSummary(
    sessionId: string,
    summary: {
      layer: number;
      content: string;
      coversUntil: number;
      method?: string;
    }
  ): Promise<boolean> {
    const result = await this.invoke('context-db:create-summary', sessionId, {
      layer: summary.layer,
      content: summary.content,
      coversUntil: summary.coversUntil,
      method: summary.method || 'local_ai',
    });

    return result.success || false;
  }

  /**
   * Get summaries for session
   */
  static async getSummaries(sessionId: string): Promise<ContextSummary[]> {
    const result = await this.invoke('context-db:get-summaries', sessionId);
    
    if (result.success && result.summaries) {
      return result.summaries.map((s: any) => ({
        id: s.id,
        layer: s.layer,
        content: s.content,
        coversUntil: s.covers_until || 0,
        method: s.method || 'local_ai',
        createdAt: s.created_at || Date.now(),
      }));
    }

    return [];
  }

  /**
   * Get context size
   */
  static async getContextSize(sessionId: string): Promise<ContextSize> {
    const result = await this.invoke('context-db:get-context-size', sessionId);
    
    if (result.success) {
      return {
        totalTokens: result.totalTokens || 0,
        entryCount: result.entryCount || 0,
      };
    }

    return { totalTokens: 0, entryCount: 0 };
  }

  /**
   * Trim context to target token count
   */
  static async trimContext(sessionId: string, targetTokens: number): Promise<boolean> {
    const result = await this.invoke('context-db:trim-context', sessionId, targetTokens);
    return result.success || false;
  }

  /**
   * Reset current session
   */
  static resetSession(): void {
    this.currentSessionId = null;
  }

  /**
   * Record context lineage for a response
   */
  static async recordLineage(
    sessionId: string,
    lineage: {
      responseId: string;
      contextEntryIds: string[];
      summaryIds: string[];
      model: string;
      mode: string;
    }
  ): Promise<boolean> {
    const result = await this.invoke('context-db:record-lineage', sessionId, lineage);
    return result.success || false;
  }

  /**
   * Get lineage for a response
   */
  static async getLineage(responseId: string): Promise<{
    id: string;
    responseId: string;
    sessionId: string;
    contextEntryIds: string[];
    summaryIds: string[];
    model: string;
    mode: string;
    createdAt: number;
  } | null> {
    const result = await this.invoke('context-db:get-lineage', responseId);
    
    if (result.success && result.lineage) {
      return result.lineage;
    }

    return null;
  }

  /**
   * Record productivity metric
   */
  static async recordProductivityMetric(metric: {
    id: string;
    taskId: string;
    stepId?: string;
    metricType: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const result = await this.invoke('context-db:record-productivity-metric', metric);
    return result.success || false;
  }

  /**
   * Get productivity metrics
   */
  static async getProductivityMetrics(
    metricType: string,
    taskType?: string,
    limit: number = 100,
    taskId?: string
  ): Promise<Array<{
    id: string;
    taskId: string;
    stepId?: string;
    metricType: string;
    value: number;
    timestamp: number;
    metadata: Record<string, any>;
  }>> {
    const result = await this.invoke('context-db:get-productivity-metrics', metricType, taskType, limit, taskId);
    
    if (result.success && result.metrics) {
      return result.metrics;
    }

    return [];
  }

  /**
   * Record decomposition plan
   */
  static async recordDecompositionPlan(plan: {
    id: string;
    taskId: string;
    originalMessage: string;
    steps: any[];
    totalEstimatedTime: number;
    confidence: number;
  }): Promise<boolean> {
    const result = await this.invoke('context-db:record-decomposition-plan', plan);
    return result.success || false;
  }

  /**
   * Get decomposition plan
   */
  static async getDecompositionPlan(taskId: string): Promise<{
    id: string;
    taskId: string;
    originalMessage: string;
    steps: any[];
    totalEstimatedTime: number;
    confidence: number;
    createdAt: number;
  } | null> {
    const result = await this.invoke('context-db:get-decomposition-plan', taskId);
    
    if (result.success && result.plan) {
      return result.plan;
    }

    return null;
  }

  /**
   * Record planning feedback
   */
  static async recordPlanningFeedback(feedback: {
    id: string;
    taskType: string;
    adjustmentType: string;
    adjustmentValue: any;
    reason: string;
  }): Promise<boolean> {
    const result = await this.invoke('context-db:record-planning-feedback', feedback);
    return result.success || false;
  }

  /**
   * Get planning feedback
   */
  static async getPlanningFeedback(taskType: string, limit: number = 50): Promise<Array<{
    id: string;
    taskType: string;
    adjustmentType: string;
    adjustmentValue: any;
    reason: string;
    appliedAt: number;
  }>> {
    const result = await this.invoke('context-db:get-planning-feedback', taskType, limit);
    
    if (result.success && result.feedbacks) {
      return result.feedbacks;
    }

    return [];
  }
}

export { ContextDatabaseBridge };
