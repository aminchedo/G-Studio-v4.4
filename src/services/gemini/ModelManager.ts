/**
 * Model Manager
 * 
 * ✅ Manages available Gemini models
 * ✅ Intelligent model selection based on requirements
 * ✅ Cost optimization
 * ✅ Model fallback logic
 */

import { ModelInfo, ModelCapability, ModelSelectionCriteria } from './types';

export class ModelManager {
  private models: Map<string, ModelInfo> = new Map();
  private currentModelId: string;

  constructor(defaultModel: string) {
    this.currentModelId = defaultModel;
    this.initializeModels();
  }

  /**
   * Initialize available models with their specifications
   */
  private initializeModels(): void {
    // Gemini 2.0 Flash (Experimental) - Fast, cost-effective
    this.models.set('gemini-2.0-flash-exp', {
      id: 'gemini-2.0-flash-exp',
      name: 'gemini-2.0-flash-exp',
      displayName: 'Gemini 2.0 Flash (Experimental)',
      maxTokens: 8192,
      inputCostPer1kTokens: 0.0,
      outputCostPer1kTokens: 0.0,
      capabilities: ['text', 'code', 'vision'],
      contextWindow: 1000000,
      description: 'Fastest Gemini model, free during experimental period',
    });

    // Gemini 1.5 Pro - Most capable
    this.models.set('gemini-1.5-pro', {
      id: 'gemini-1.5-pro',
      name: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      maxTokens: 8192,
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005,
      capabilities: ['text', 'code', 'vision', 'audio', 'long-context', 'function-calling'],
      contextWindow: 2000000,
      description: 'Most capable model with long context window',
    });

    // Gemini 1.5 Flash - Balanced
    this.models.set('gemini-1.5-flash', {
      id: 'gemini-1.5-flash',
      name: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      maxTokens: 8192,
      inputCostPer1kTokens: 0.000075,
      outputCostPer1kTokens: 0.0003,
      capabilities: ['text', 'code', 'vision', 'audio', 'function-calling'],
      contextWindow: 1000000,
      description: 'Fast and efficient for most tasks',
    });

    // Gemini 1.5 Flash-8B - Ultra fast
    this.models.set('gemini-1.5-flash-8b', {
      id: 'gemini-1.5-flash-8b',
      name: 'gemini-1.5-flash-8b',
      displayName: 'Gemini 1.5 Flash 8B',
      maxTokens: 8192,
      inputCostPer1kTokens: 0.0000375,
      outputCostPer1kTokens: 0.00015,
      capabilities: ['text', 'code'],
      contextWindow: 1000000,
      description: 'Smallest, fastest, most cost-effective',
    });

    // Gemini 1.0 Pro - Legacy
    this.models.set('gemini-1.0-pro', {
      id: 'gemini-1.0-pro',
      name: 'gemini-1.0-pro',
      displayName: 'Gemini 1.0 Pro',
      maxTokens: 2048,
      inputCostPer1kTokens: 0.0005,
      outputCostPer1kTokens: 0.0015,
      capabilities: ['text', 'code'],
      contextWindow: 32000,
      description: 'Original Gemini Pro model',
    });
  }

  /**
   * Get model by ID
   */
  getModel(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }

  /**
   * Get current model
   */
  getCurrentModel(): ModelInfo {
    const model = this.models.get(this.currentModelId);
    if (!model) {
      throw new Error(`Current model ${this.currentModelId} not found`);
    }
    return model;
  }

  /**
   * Set current model
   */
  setCurrentModel(id: string): void {
    if (!this.models.has(id)) {
      throw new Error(`Model ${id} not found`);
    }
    this.currentModelId = id;
  }

  /**
   * Get all available models
   */
  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Select best model based on criteria
   */
  selectBestModel(criteria: ModelSelectionCriteria): ModelInfo {
    let candidates = this.getAllModels();

    // Filter by required capabilities
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      candidates = candidates.filter(model =>
        criteria.capabilities!.every(cap => model.capabilities.includes(cap))
      );
    }

    // Filter by max tokens
    if (criteria.maxTokens) {
      candidates = candidates.filter(model => model.maxTokens >= criteria.maxTokens!);
    }

    // Filter by budget (cost per 1k tokens)
    if (criteria.maxBudget) {
      candidates = candidates.filter(model =>
        (model.inputCostPer1kTokens + model.outputCostPer1kTokens) / 2 <= criteria.maxBudget!
      );
    }

    // If no candidates match, throw error
    if (candidates.length === 0) {
      throw new Error('No models match the specified criteria');
    }

    // If preferred models specified, try those first
    if (criteria.preferredModels && criteria.preferredModels.length > 0) {
      const preferred = candidates.find(model =>
        criteria.preferredModels!.includes(model.id)
      );
      if (preferred) return preferred;
    }

    // Sort by cost (cheapest first)
    candidates.sort((a, b) => {
      const costA = (a.inputCostPer1kTokens + a.outputCostPer1kTokens) / 2;
      const costB = (b.inputCostPer1kTokens + b.outputCostPer1kTokens) / 2;
      return costA - costB;
    });

    return candidates[0];
  }

  /**
   * Get model fallback chain
   * Returns models in order of preference for fallback
   */
  getFallbackChain(currentModelId: string): ModelInfo[] {
    const current = this.models.get(currentModelId);
    if (!current) return [];

    // Get models with same or better capabilities
    const candidates = this.getAllModels().filter(model => {
      if (model.id === currentModelId) return false;
      
      // Check if fallback has all required capabilities
      return current.capabilities.every(cap => model.capabilities.includes(cap));
    });

    // Sort by preference:
    // 1. Similar cost
    // 2. Similar context window
    // 3. More capabilities is better
    candidates.sort((a, b) => {
      const currentCost = (current.inputCostPer1kTokens + current.outputCostPer1kTokens) / 2;
      const costA = (a.inputCostPer1kTokens + a.outputCostPer1kTokens) / 2;
      const costB = (b.inputCostPer1kTokens + b.outputCostPer1kTokens) / 2;
      
      const costDiffA = Math.abs(costA - currentCost);
      const costDiffB = Math.abs(costB - currentCost);
      
      if (Math.abs(costDiffA - costDiffB) > 0.001) {
        return costDiffA - costDiffB;
      }
      
      return b.capabilities.length - a.capabilities.length;
    });

    return candidates;
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: ModelCapability): ModelInfo[] {
    return this.getAllModels().filter(model =>
      model.capabilities.includes(capability)
    );
  }

  /**
   * Get cheapest model
   */
  getCheapestModel(): ModelInfo {
    const models = this.getAllModels();
    return models.reduce((cheapest, current) => {
      const cheapestCost = (cheapest.inputCostPer1kTokens + cheapest.outputCostPer1kTokens) / 2;
      const currentCost = (current.inputCostPer1kTokens + current.outputCostPer1kTokens) / 2;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  /**
   * Get most capable model
   */
  getMostCapableModel(): ModelInfo {
    const models = this.getAllModels();
    return models.reduce((best, current) =>
      current.capabilities.length > best.capabilities.length ? current : best
    );
  }
}

/**
 * Example usage:
 * 
 * const manager = new ModelManager('gemini-2.0-flash-exp');
 * 
 * // Select best model for code generation with budget constraint
 * const model = manager.selectBestModel({
 *   capabilities: ['code'],
 *   maxBudget: 0.001,
 * });
 * 
 * // Get fallback models if primary fails
 * const fallbacks = manager.getFallbackChain('gemini-1.5-pro');
 * 
 * // Estimate cost
 * const cost = manager.estimateCost('gemini-1.5-flash', 1000, 500);
 * console.log(`Estimated cost: $${cost.toFixed(6)}`);
 */
