/**
 * Hybrid Decision Engine
 * 
 * Decides execution mode based on:
 * - Network state
 * - API health
 * - User preference
 * - Task complexity
 * - Token pressure
 */

import { LocalAIModelService } from './ai/localAIModelService';
import { SecureStorage } from './security/secureStorage';
import { TokenOptimizer } from './tokenOptimizer';
import { ChaosTesting } from './chaosTesting';

export type ExecutionMode = 'CLOUD' | 'LOCAL' | 'HYBRID' | 'OFFLINE';

interface DecisionContext {
  networkState?: 'online' | 'offline';
  apiKey?: string;
  message: string;
  history?: any[];
  userPreference?: ExecutionMode;
  taskComplexity?: 'simple' | 'medium' | 'complex';
  tokenPressure?: 'low' | 'medium' | 'high';
}

interface ExecutionPlan {
  mode: ExecutionMode;
  useLocalForContext: boolean;
  useCloudForResponse: boolean;
  useLocalForResponse: boolean;
  fallbackMode?: ExecutionMode;
  reason: string;
}

class HybridDecisionEngine {
  private static userPreference: ExecutionMode | null = null;
  private static initialized: boolean = false;
  private static apiHealthCache: { status: 'healthy' | 'unhealthy' | 'unknown'; lastCheck: number } = {
    status: 'unknown',
    lastCheck: 0,
  };
  private static readonly API_HEALTH_CACHE_TTL = 60000; // 1 minute

  /**
   * Initialize and load user preferences
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const settings = await SecureStorage.getItem('gstudio_ai_mode_preference');
      if (settings && settings.mode) {
        this.userPreference = settings.mode;
      }
      this.initialized = true;
      console.log('[HybridDecisionEngine] Initialized');
    } catch (error) {
      console.warn('[HybridDecisionEngine] Failed to load preferences, using defaults');
      this.initialized = true;
    }
  }

  /**
   * Set user preference
   */
  static async setUserPreference(mode: ExecutionMode | null): Promise<void> {
    this.userPreference = mode;
    try {
      await SecureStorage.setItem('gstudio_ai_mode_preference', { mode });
    } catch (error) {
      console.error('[HybridDecisionEngine] Failed to save preference:', error);
    }
  }

  /**
   * Get user preference
   */
  static getUserPreference(): ExecutionMode | null {
    return this.userPreference;
  }

  /**
   * Check network state
   */
  static checkNetworkState(): 'online' | 'offline' {
    // ==================== CHAOS TESTING ====================
    if (ChaosTesting.injectNetworkFailure()) {
      return 'offline';
    }

    if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
      return navigator.onLine ? 'online' : 'offline';
    }
    // Assume online if navigator not available
    return 'online';
  }

  /**
   * Check API health (Gemini)
   */
  static async checkAPIHealth(apiKey?: string): Promise<'healthy' | 'unhealthy'> {
    // Check cache first
    const now = Date.now();
    if (this.apiHealthCache.lastCheck > 0 && (now - this.apiHealthCache.lastCheck) < this.API_HEALTH_CACHE_TTL) {
      return this.apiHealthCache.status === 'healthy' ? 'healthy' : 'unhealthy';
    }

    if (!apiKey) {
      this.apiHealthCache = { status: 'unhealthy', lastCheck: now };
      return 'unhealthy';
    }

    try {
      // Simple health check - try a minimal API call
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      const healthy = response.ok;
      this.apiHealthCache = {
        status: healthy ? 'healthy' : 'unhealthy',
        lastCheck: now,
      };
      return healthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.apiHealthCache = { status: 'unhealthy', lastCheck: now };
      return 'unhealthy';
    }
  }

  /**
   * Estimate task complexity
   */
  static estimateTaskComplexity(message: string, history?: any[]): 'simple' | 'medium' | 'complex' {
    const messageLength = message.length;
    const tokenEstimate = TokenOptimizer.estimateTokens(message);
    const historyLength = history?.length || 0;

    // Simple heuristics
    if (tokenEstimate < 50 && historyLength < 5) {
      return 'simple';
    } else if (tokenEstimate < 500 && historyLength < 20) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  /**
   * Assess token pressure
   */
  static assessTokenPressure(contextSize: number, maxTokens: number): 'low' | 'medium' | 'high' {
    const ratio = contextSize / maxTokens;
    if (ratio < 0.5) return 'low';
    if (ratio < 0.8) return 'medium';
    return 'high';
  }

  /**
   * Check local AI capability for task
   * Enforces capability matrix:
   * - Local AI ALLOWED: Rank context, score importance, generate summaries, rewrite prompts, offline fallback
   * - Local AI BLOCKED: Deep multi-file refactors, long chain-of-thought, complex tasks
   */
  static checkLocalAICapability(taskComplexity: 'simple' | 'medium' | 'complex'): boolean {
    const localAIStatus = LocalAIModelService.getStatus();
    const localAIHealth = LocalAIModelService.getHealthStatus();

    // Local AI not available or health is ERROR - force CLOUD mode
    if (localAIStatus !== 'READY' || localAIHealth === 'ERROR') {
      console.log('[LOCAL_AI_CAPABILITY]: BLOCKED (not ready or health error)');
      return false;
    }

    // Health is DEGRADED - allow only for simple tasks
    if (localAIHealth === 'DEGRADED' && taskComplexity !== 'simple') {
      console.log('[LOCAL_AI_CAPABILITY]: BLOCKED (degraded health, complex task)');
      return false;
    }

    // Complex tasks should use cloud (capability matrix enforcement)
    if (taskComplexity === 'complex') {
      console.log('[LOCAL_AI_CAPABILITY]: BLOCKED (complex task - use cloud)');
      return false;
    }

    // Medium complexity tasks - allow but prefer cloud
    if (taskComplexity === 'medium') {
      console.log('[LOCAL_AI_CAPABILITY]: ALLOWED (medium task - may use hybrid)');
      return true;
    }

    // Simple tasks - fully allowed
    console.log('[LOCAL_AI_CAPABILITY]: ALLOWED (simple task)');
    return true;
  }

  /**
   * Decide execution mode
   */
  static async decideMode(context: DecisionContext): Promise<ExecutionPlan> {
    await this.initialize();

    const networkState = context.networkState || this.checkNetworkState();
    const apiHealth = await this.checkAPIHealth(context.apiKey);
    const taskComplexity = context.taskComplexity || this.estimateTaskComplexity(context.message, context.history);
    const localAIAvailable = this.checkLocalAICapability(taskComplexity);

    // User preference override
    if (this.userPreference && this.userPreference !== 'HYBRID') {
      return this.createPlan(this.userPreference, {
        networkState,
        apiHealth,
        localAIAvailable,
        reason: `User preference: ${this.userPreference}`,
      });
    }

    // Decision logic
    let mode: ExecutionMode;

    // Force CLOUD if local AI health is ERROR (capability matrix enforcement)
    if (LocalAIModelService.getHealthStatus() === 'ERROR') {
      mode = 'CLOUD';
      console.log('[LOCAL_AI_CAPABILITY]: BLOCKED (health error - forcing CLOUD)');
    }
    // Offline or API unhealthy
    else if (networkState === 'offline' || apiHealth === 'unhealthy') {
      if (localAIAvailable) {
        mode = 'OFFLINE';
      } else {
        // No fallback available
        mode = 'CLOUD'; // Will fail gracefully
      }
    }
    // Online and API healthy
    else if (networkState === 'online' && apiHealth === 'healthy') {
      if (localAIAvailable && taskComplexity !== 'complex') {
        // Use hybrid for medium complexity, cloud for complex
        mode = taskComplexity === 'simple' ? 'HYBRID' : 'CLOUD';
      } else {
        mode = 'CLOUD';
      }
    }
    // Edge case
    else {
      mode = localAIAvailable ? 'LOCAL' : 'CLOUD';
    }

    return this.createPlan(mode, {
      networkState,
      apiHealth,
      localAIAvailable,
      reason: this.getReason(mode, { networkState, apiHealth, taskComplexity, localAIAvailable }),
    });
  }

  /**
   * Create execution plan
   */
  private static createPlan(
    mode: ExecutionMode,
    context: {
      networkState: string;
      apiHealth: string;
      localAIAvailable: boolean;
      reason: string;
    }
  ): ExecutionPlan {
    const plan: ExecutionPlan = {
      mode,
      useLocalForContext: false,
      useCloudForResponse: false,
      useLocalForResponse: false,
      reason: context.reason,
    };

    switch (mode) {
      case 'CLOUD':
        plan.useCloudForResponse = true;
        plan.fallbackMode = context.localAIAvailable ? 'LOCAL' : undefined;
        break;

      case 'LOCAL':
        plan.useLocalForResponse = true;
        plan.useLocalForContext = true;
        break;

      case 'HYBRID':
        plan.useLocalForContext = context.localAIAvailable;
        plan.useCloudForResponse = true;
        plan.useLocalForResponse = false; // Cloud primary
        plan.fallbackMode = context.localAIAvailable ? 'LOCAL' : undefined;
        break;

      case 'OFFLINE':
        plan.useLocalForResponse = context.localAIAvailable;
        plan.useLocalForContext = context.localAIAvailable;
        plan.fallbackMode = undefined; // No fallback in offline
        break;
    }

    console.log(`[AI_MODE]: ${mode}`);
    console.log(`[FALLBACK]: ${plan.fallbackMode ? 'true' : 'false'}`);

    return plan;
  }

  /**
   * Get reason for decision
   */
  private static getReason(
    mode: ExecutionMode,
    context: {
      networkState: string;
      apiHealth: string;
      taskComplexity: string;
      localAIAvailable: boolean;
    }
  ): string {
    const reasons: string[] = [];

    if (context.networkState === 'offline') {
      reasons.push('Network offline');
    }
    if (context.apiHealth === 'unhealthy') {
      reasons.push('API unhealthy');
    }
    if (!context.localAIAvailable) {
      reasons.push('Local AI unavailable');
    }
    if (context.taskComplexity === 'complex') {
      reasons.push('Complex task');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Optimal conditions';
  }

  /**
   * Get execution plan for a mode
   */
  static getExecutionPlan(mode: ExecutionMode): ExecutionPlan {
    const networkState = this.checkNetworkState();
    const localAIAvailable = LocalAIModelService.getStatus() === 'READY';

    return this.createPlan(mode, {
      networkState,
      apiHealth: 'unknown',
      localAIAvailable,
      reason: `Manual mode: ${mode}`,
    });
  }
}

// Initialize on import
HybridDecisionEngine.initialize().catch(console.error);

export { HybridDecisionEngine };
