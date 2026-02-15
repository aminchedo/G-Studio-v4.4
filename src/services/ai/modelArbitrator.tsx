/**
 * Multi-Model Arbitration
 * 
 * Evaluates task requirements and selects optimal model.
 * Blocks hardcoded model routing.
 */

import { ModelId } from "@/mcp/runtime/types";
import { LocalAIModelService } from './localAIModelService';
import { HybridDecisionEngine, ExecutionMode } from '../hybridDecisionEngine';
import { TokenOptimizer } from '../tokenOptimizer';
import { ProductivityMetrics } from '../monitoring/productivityMetrics';

export type TaskType = 'coding' | 'analysis' | 'refactoring' | 'documentation' | 'debugging' | 'general';
export type PrivacyLevel = 'low' | 'medium' | 'high' | 'critical';

interface ArbitrationContext {
  taskType: TaskType;
  message: string;
  latencyBudget?: number; // milliseconds
  tokenPressure?: 'low' | 'medium' | 'high';
  privacyLevel?: PrivacyLevel;
  history?: any[];
  apiKey?: string;
}

interface ArbitrationResult {
  selectedModel: ModelId;
  executionMode: ExecutionMode;
  confidence: number; // 0-1
  reason: string;
  alternatives: Array<{ model: ModelId; score: number; reason: string }>;
}

export class ModelArbitrator {
  private static readonly ARBITRATION_REQUIRED = Symbol('ARBITRATION_REQUIRED');
  private static lastArbitration: ArbitrationResult | null = null;

  /**
   * Arbitrate model selection
   * MUST be called before any model invocation
   */
  static async arbitrate(context: ArbitrationContext): Promise<ArbitrationResult> {
    const taskType = context.taskType || this.detectTaskType(context.message);
    const privacyLevel = context.privacyLevel || this.assessPrivacyLevel(context.message);
    const tokenPressure = context.tokenPressure || this.assessTokenPressure(context);
    const latencyBudget = context.latencyBudget || 30000; // Default 30s

    // Evaluate available models
    const localAIAvailable = LocalAIModelService.getStatus() === 'READY';
    const localAIHealth = LocalAIModelService.getHealthStatus();
    const networkState = HybridDecisionEngine.checkNetworkState();
    const apiHealth = context.apiKey ? await HybridDecisionEngine.checkAPIHealth(context.apiKey) : 'unhealthy';

    // Score each model
    const alternatives: Array<{ model: ModelId; score: number; reason: string }> = [];

    // Local AI scoring
    if (localAIAvailable && localAIHealth === 'OK') {
      let score = 0.5;
      let reason = 'Local AI available';

      // Privacy boost
      if (privacyLevel === 'high' || privacyLevel === 'critical') {
        score += 0.3;
        reason += ', high privacy requirement';
      }

      // Latency boost (local is faster)
      if (latencyBudget < 10000) {
        score += 0.2;
        reason += ', low latency requirement';
      }

      // Task type boost (local good for simple tasks)
      if (taskType === 'general' || taskType === 'documentation') {
        score += 0.1;
        reason += ', simple task type';
      }

      // Penalty for complex tasks
      if (taskType === 'refactoring' || taskType === 'analysis') {
        score -= 0.2;
        reason += ', complex task (prefer cloud)';
      }

      alternatives.push({
        model: ModelId.GeminiFlashLatest, // Local uses same model ID for tracking
        score: Math.max(0, Math.min(1, score)),
        reason,
      });
    }

    // Cloud model scoring
    if (networkState === 'online' && apiHealth === 'healthy' && context.apiKey) {
      let score = 0.7;
      let reason = 'Cloud API available and healthy';

      // Complex task boost
      if (taskType === 'refactoring' || taskType === 'analysis') {
        score += 0.2;
        reason += ', complex task';
      }

      // Token pressure boost (cloud handles large contexts better)
      if (tokenPressure === 'high') {
        score += 0.1;
        reason += ', high token pressure';
      }

      // Privacy penalty
      if (privacyLevel === 'high' || privacyLevel === 'critical') {
        score -= 0.3;
        reason += ', privacy concern';
      }

      // Latency penalty
      if (latencyBudget < 5000) {
        score -= 0.2;
        reason += ', very low latency requirement';
      }

      alternatives.push({
        model: ModelId.GeminiFlashLatest,
        score: Math.max(0, Math.min(1, score)),
        reason,
      });
    }

    // Select best model
    alternatives.sort((a, b) => b.score - a.score);
    const selected = alternatives[0];

    if (!selected) {
      // Fallback: use cloud if available, otherwise local
      const fallbackModel = networkState === 'online' && apiHealth === 'healthy'
        ? ModelId.GeminiFlashLatest
        : ModelId.GeminiFlashLatest; // Same model, different execution mode

      const result: ArbitrationResult = {
        selectedModel: fallbackModel,
        executionMode: localAIAvailable ? 'LOCAL' : 'CLOUD',
        confidence: 0.3,
        reason: 'No optimal model available, using fallback',
        alternatives: [],
      };

      this.lastArbitration = result;
      console.log(`[MODEL_ARBITRATION]: SELECTED=${fallbackModel} (fallback)`);
      return result;
    }

    // Determine execution mode based on selected model
    let executionMode: ExecutionMode = 'CLOUD';
    if (selected.model === ModelId.GeminiFlashLatest && localAIAvailable) {
      // Check if local should be used
      const decisionPlan = await HybridDecisionEngine.decideMode({
        networkState,
        apiKey: context.apiKey,
        message: context.message,
        history: context.history,
      });
      executionMode = decisionPlan.mode;
    }

    const result: ArbitrationResult = {
      selectedModel: selected.model,
      executionMode,
      confidence: selected.score,
      reason: selected.reason,
      alternatives: alternatives.slice(1), // Other options
    };

    this.lastArbitration = result;
    console.log(`[MODEL_ARBITRATION]: SELECTED=${selected.model} (confidence: ${selected.score.toFixed(2)})`);
    return result;
  }

  /**
   * Detect task type from message (public for external use)
   */
  static detectTaskType(message: string): TaskType {
    const lower = message.toLowerCase();
    
    if (lower.includes('refactor') || lower.includes('restructure')) {
      return 'refactoring';
    }
    if (lower.includes('debug') || lower.includes('fix') || lower.includes('error')) {
      return 'debugging';
    }
    if (lower.includes('analyze') || lower.includes('review') || lower.includes('inspect')) {
      return 'analysis';
    }
    if (lower.includes('document') || lower.includes('comment') || lower.includes('readme')) {
      return 'documentation';
    }
    if (lower.includes('code') || lower.includes('implement') || lower.includes('create') || lower.includes('write')) {
      return 'coding';
    }
    
    return 'general';
  }

  /**
   * Assess privacy level from message
   */
  private static assessPrivacyLevel(message: string): PrivacyLevel {
    const lower = message.toLowerCase();
    
    if (lower.includes('password') || lower.includes('secret') || lower.includes('key') || lower.includes('token')) {
      return 'critical';
    }
    if (lower.includes('private') || lower.includes('sensitive') || lower.includes('confidential')) {
      return 'high';
    }
    if (lower.includes('user') || lower.includes('data') || lower.includes('personal')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Assess token pressure
   */
  private static assessTokenPressure(context: ArbitrationContext): 'low' | 'medium' | 'high' {
    const messageTokens = TokenOptimizer.estimateTokens(context.message);
    const historyTokens = context.history
      ? context.history.reduce((sum, msg) => sum + TokenOptimizer.estimateTokens(msg.content || ''), 0)
      : 0;
    const totalTokens = messageTokens + historyTokens;

    if (totalTokens > 8000) return 'high';
    if (totalTokens > 4000) return 'medium';
    return 'low';
  }

  /**
   * Get last arbitration result
   */
  static getLastArbitration(): ArbitrationResult | null {
    return this.lastArbitration;
  }

  /**
   * Verify arbitration was called (for enforcement)
   */
  static verifyArbitrationCalled(): boolean {
    return this.lastArbitration !== null;
  }
}
