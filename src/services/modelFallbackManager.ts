/**
 * Model Fallback Manager
 * 
 * Manages the model fallback sequence and retry logic.
 * Ensures the system tries all available models before giving up.
 */

import { ModelId } from '@/types';
import { FailureType } from './aiBehaviorValidation';

export interface FallbackState {
  primaryModel: ModelId;
  currentModel: ModelId;
  triedModels: Set<ModelId>;
  attemptsOnCurrentModel: number;
  maxAttemptsPerModel: number;
  unavailableModels: Map<ModelId, { reason: string; timestamp: number }>; // Track permanently unavailable models
  availableModels?: string[]; // Discovered available models from API
}

export class ModelFallbackManager {
  /**
   * Priority order for model selection (highest to lowest)
   * Models are selected in this order if available
   */
  private static readonly MODEL_PRIORITY = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    // Any other discovered models will be added after these
  ];

  /**
   * Map ModelId enum values to API model names
   */
  private static mapModelIdToApiName(modelId: ModelId): string {
    const mapping: Record<ModelId, string> = {
      [ModelId.Gemini3FlashPreview]: 'gemini-3-flash-preview',
      [ModelId.Gemini3ProPreview]: 'gemini-3-pro-preview',
      [ModelId.GeminiFlashLatest]: 'gemini-flash-latest',
      [ModelId.GeminiFlashLiteLatest]: 'gemini-flash-lite-latest',
    };
    return mapping[modelId] || modelId;
  }

  /**
   * Map API model names back to ModelId enum values (if possible)
   */
  private static mapApiNameToModelId(apiName: string): ModelId | null {
    const mapping: Record<string, ModelId> = {
      'gemini-3-flash-preview': ModelId.Gemini3FlashPreview,
      'gemini-3-pro-preview': ModelId.Gemini3ProPreview,
      'gemini-flash-latest': ModelId.GeminiFlashLatest,
      'gemini-flash-lite-latest': ModelId.GeminiFlashLiteLatest,
    };
    return mapping[apiName] || null;
  }

  /**
   * Get the fallback sequence for a given primary model
   * Filters to only include discovered available models and applies priority order
   * 
   * @param primaryModel - The primary model to use
   * @param availableModels - Optional array of discovered available model IDs from API
   * @returns Filtered fallback sequence with priority order applied
   */
  static getFallbackSequence(primaryModel: ModelId, availableModels?: string[]): ModelId[] {
    // If no available models provided, return empty array (will be handled by caller)
    if (!availableModels || availableModels.length === 0) {
      return [];
    }

    // Define base fallback sequences for each primary model
    const baseSequences: Record<ModelId, ModelId[]> = {
      [ModelId.Gemini3FlashPreview]: [
        ModelId.Gemini3FlashPreview,
        ModelId.Gemini3ProPreview,
        ModelId.GeminiFlashLiteLatest
      ],
      [ModelId.Gemini3ProPreview]: [
        ModelId.Gemini3ProPreview,
        ModelId.Gemini3FlashPreview,
        ModelId.GeminiFlashLiteLatest
      ],
      [ModelId.GeminiFlashLatest]: [
        ModelId.GeminiFlashLatest,
        ModelId.Gemini3ProPreview,
        ModelId.GeminiFlashLiteLatest
      ],
      [ModelId.GeminiFlashLiteLatest]: [
        ModelId.GeminiFlashLiteLatest,
        ModelId.Gemini3FlashPreview,
        ModelId.Gemini3ProPreview,
        ModelId.GeminiFlashLatest
      ]
    };

    const baseSequence = baseSequences[primaryModel] || [primaryModel];

    // Filter sequence to only include models that are in availableModels
    const filteredSequence: ModelId[] = [];
    for (const modelId of baseSequence) {
      const apiName = this.mapModelIdToApiName(modelId);
      if (availableModels.includes(apiName)) {
        filteredSequence.push(modelId);
      }
    }

    // If primary model is not available, try to find a suitable replacement
    if (filteredSequence.length === 0 || filteredSequence[0] !== primaryModel) {
      // Apply priority order to available models
      const prioritizedModels = this.applyPriorityOrder(availableModels);
      
      // Try to map prioritized models back to ModelId enum
      for (const apiName of prioritizedModels) {
        const modelId = this.mapApiNameToModelId(apiName);
        if (modelId && !filteredSequence.includes(modelId)) {
          filteredSequence.unshift(modelId); // Add to front as primary
          break;
        }
      }
    }

    // If still no models, return empty array
    if (filteredSequence.length === 0) {
      return [];
    }

    return filteredSequence;
  }

  /**
   * Apply priority order to available models
   * Priority: gemini-1.5-flash → gemini-1.5-pro → gemini-pro → others
   */
  private static applyPriorityOrder(availableModels: string[]): string[] {
    const prioritized: string[] = [];
    const others: string[] = [];

    // First, add models in priority order
    for (const priorityModel of this.MODEL_PRIORITY) {
      if (availableModels.includes(priorityModel)) {
        prioritized.push(priorityModel);
      }
    }

    // Then, add any other discovered models
    for (const model of availableModels) {
      if (!this.MODEL_PRIORITY.includes(model) && !prioritized.includes(model)) {
        others.push(model);
      }
    }

    return [...prioritized, ...others];
  }

  /**
   * Initialize fallback state for a request
   * 
   * @param primaryModel - The primary model to use
   * @param availableModels - Optional array of discovered available model IDs from API
   */
  static initializeState(primaryModel: ModelId, availableModels?: string[]): FallbackState {
    // Get filtered fallback sequence
    const sequence = this.getFallbackSequence(primaryModel, availableModels);
    
    // If primary model is not in sequence, use first available model
    const initialModel = sequence.length > 0 && sequence.includes(primaryModel) 
      ? primaryModel 
      : (sequence.length > 0 ? sequence[0] : primaryModel);

    return {
      primaryModel,
      currentModel: initialModel,
      triedModels: new Set([initialModel]),
      attemptsOnCurrentModel: 0,
      maxAttemptsPerModel: 2, // Max 2 attempts per model (initial attempt + 1 retry)
      unavailableModels: new Map<ModelId, { reason: string; timestamp: number }>(), // Initialize unavailable models Map
      availableModels // Store discovered models
    };
  }

  /**
   * Determine if we should retry the same model (for INFRA_FAILURE)
   */
  static shouldRetrySameModel(
    failureType: FailureType,
    attemptsOnCurrentModel: number,
    maxAttemptsPerModel: number
  ): boolean {
    // CODE_BUG: NEVER retry, NEVER fallback - fail immediately
    if (failureType === FailureType.CODE_BUG) {
      return false;
    }

    // CONFIG_FAILURE: NEVER retry, NEVER fallback - fail immediately
    if (failureType === FailureType.CONFIG_FAILURE) {
      return false;
    }

    // INFRA_FAILURE: retry same model up to maxAttemptsPerModel times
    if (failureType === FailureType.INFRA_FAILURE) {
      return attemptsOnCurrentModel < maxAttemptsPerModel;
    }

    // MODEL_FAILURE: never retry same model, immediately fallback
    return false;
  }

  /**
   * Get the next model to try
   */
  static getNextModel(
    state: FallbackState,
    failureType: FailureType | null
  ): ModelId | null {
    const sequence = this.getFallbackSequence(state.primaryModel, state.availableModels);

    // If no failure, return current model (success case)
    if (failureType === null) {
      return state.currentModel;
    }

    // CODE_BUG: NEVER fallback - return null to stop immediately
    if (failureType === FailureType.CODE_BUG) {
      return null;
    }

    // CONFIG_FAILURE: NEVER fallback - return null to stop immediately
    if (failureType === FailureType.CONFIG_FAILURE) {
      return null;
    }

    // QUOTA_EXHAUSTED: NEVER fallback - return null to stop immediately
    // If any model has quota exhaustion, do not try other models
    if (this.hasQuotaExhaustedModels(state)) {
      return null;
    }

    // Check if we should retry same model (INFRA_FAILURE only)
    if (this.shouldRetrySameModel(failureType, state.attemptsOnCurrentModel, state.maxAttemptsPerModel)) {
      // Increment attempt count but keep same model
      return state.currentModel;
    }

    // Find next model in sequence that hasn't been tried and isn't permanently unavailable
    // Also verify it's in availableModels if provided
    const currentIndex = sequence.indexOf(state.currentModel);
    for (let i = currentIndex + 1; i < sequence.length; i++) {
      const nextModel = sequence[i];
      // Skip if already tried, permanently unavailable, or not in availableModels
      if (!state.triedModels.has(nextModel) && 
          !this.isModelUnavailable(state, nextModel)) {
        // If availableModels is provided, verify the model is available
        if (state.availableModels && state.availableModels.length > 0) {
          const apiName = this.mapModelIdToApiName(nextModel);
          if (!state.availableModels.includes(apiName)) {
            continue; // Skip this model, not in availableModels
          }
        }
        return nextModel;
      }
    }

    // No more models available
    return null;
  }

  /**
   * Update state after an attempt
   */
  static updateStateAfterAttempt(
    state: FallbackState,
    failureType: FailureType | null,
    success: boolean
  ): FallbackState {
    if (success) {
      // Success - no need to update, just return current state
      return state;
    }

    // Failure - increment attempts on current model
    const newAttempts = state.attemptsOnCurrentModel + 1;

    // Check if we should move to next model
    if (failureType === FailureType.MODEL_FAILURE || 
        (failureType === FailureType.INFRA_FAILURE && newAttempts >= state.maxAttemptsPerModel)) {
      // Move to next model
      const nextModel = this.getNextModel(state, failureType);
      
      if (nextModel && nextModel !== state.currentModel) {
        // Switch to next model
        return {
          ...state,
          currentModel: nextModel,
          triedModels: new Set([...state.triedModels, nextModel]),
          attemptsOnCurrentModel: 0 // Reset for new model
        };
      } else {
        // No more models, but keep current state for logging
        return {
          ...state,
          attemptsOnCurrentModel: newAttempts
        };
      }
    } else {
      // Retry same model (INFRA_FAILURE with attempts remaining)
      return {
        ...state,
        attemptsOnCurrentModel: newAttempts
      };
    }
  }

  /**
   * Check if there are more models to try
   */
  static hasMoreModels(state: FallbackState): boolean {
    const sequence = this.getFallbackSequence(state.primaryModel, state.availableModels);
    return state.triedModels.size < sequence.length;
  }

  /**
   * Get all models that have been tried
   */
  static getTriedModels(state: FallbackState): ModelId[] {
    return Array.from(state.triedModels);
  }

  /**
   * Get remaining models in sequence
   */
  static getRemainingModels(state: FallbackState): ModelId[] {
    const sequence = this.getFallbackSequence(state.primaryModel, state.availableModels);
    return sequence.filter(model => !state.triedModels.has(model));
  }

  /**
   * Mark a model as permanently unavailable
   * @param state - Current fallback state
   * @param modelId - Model to mark as unavailable
   * @param reason - Reason for unavailability (e.g., 'QUOTA_EXHAUSTED')
   */
  static markModelUnavailable(
    state: FallbackState,
    modelId: ModelId,
    reason: string
  ): FallbackState {
    const unavailableModels = new Map(state.unavailableModels);
    unavailableModels.set(modelId, {
      reason,
      timestamp: Date.now()
    });
    
    return {
      ...state,
      unavailableModels
    };
  }

  /**
   * Check if a model is permanently unavailable
   * @param state - Current fallback state
   * @param modelId - Model to check
   * @returns true if model is permanently unavailable
   */
  static isModelUnavailable(state: FallbackState, modelId: ModelId): boolean {
    if (!state.unavailableModels) {
      return false;
    }
    return state.unavailableModels.has(modelId);
  }

  /**
   * Check if any models were unavailable due to quota exhaustion
   * @param state - Current fallback state
   * @returns true if any model failed due to quota exhaustion
   */
  static hasQuotaExhaustedModels(state: FallbackState): boolean {
    if (!state.unavailableModels) {
      return false;
    }
    for (const entry of state.unavailableModels.values()) {
      if (entry.reason === 'QUOTA_EXHAUSTED') {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if all models have been exhausted
   * CRITICAL: Only counts eligible models (excludes permanently unavailable models)
   * Exhaustion only applies to genuine transient infra failures
   * CODE_BUG and QUOTA_EXHAUSTED are NOT counted as exhaustion
   */
  static allModelsExhausted(state: FallbackState): boolean {
    const sequence = this.getFallbackSequence(state.primaryModel, state.availableModels);
    
    // Count only models that are not permanently unavailable
    // QUOTA_EXHAUSTED models are marked unavailable and excluded
    const eligibleModels = sequence.filter(model => !this.isModelUnavailable(state, model));
    
    // All models exhausted if all eligible models have been tried
    // NOTE: CODE_BUG failures throw immediately and never reach this point,
    // so they are automatically excluded from exhaustion count
    return eligibleModels.every(model => state.triedModels.has(model));
  }
}
