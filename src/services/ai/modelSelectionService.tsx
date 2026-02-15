/**
 * Model Selection Service
 * SINGLE SOURCE OF TRUTH for runtime model selection
 * 
 * This service ensures that:
 * 1. Runtime always uses the model selected in the Model Ribbon
 * 2. Selected model is validated against discovered usable models
 * 3. No hardcoded fallbacks or silent substitutions
 * 
 * CONTRACT-BASED ARCHITECTURE:
 * All UI, runtime, and orchestration layers must depend on the ModelSelectionServiceContract interface.
 * No component is allowed to call methods not declared in the contract.
 */

import { ModelValidationStore } from './modelValidationStore';
import { ModelInfo, ModelFamily, selectBestDefaultModel, scoreModel } from './modelInfo';

/**
 * Model Selection Service Contract
 * This interface defines EXACTLY what must exist - nothing more, nothing less.
 * All UI and runtime code must use ONLY these methods.
 */
export interface ModelSelectionServiceContract {
  // Selection Mode
  getSelectionMode(apiKey: string): 'auto' | 'manual';
  setSelectionMode(apiKey: string, mode: 'auto' | 'manual'): void;
  
  // Default & Active Model
  getActiveModel(apiKey: string): string | null;
  getDefaultModel(apiKey: string): string | null;
  setManualModel(apiKey: string, modelId: string): void;
  clearManualSelection(apiKey: string): void;
  
  // Validation & Reconciliation
  revalidateAgainstStore(apiKey: string): void;
  
  // Model Families
  getModelsByFamily(apiKey: string): {
    flash: ModelInfo[];
    pro: ModelInfo[];
    normal: ModelInfo[];
    all: ModelInfo[];
  };
  
  // Scoring & Auto Selection
  scoreModel(model: ModelInfo): number;
  selectBestDefaultModel(apiKey: string): string | null;
  
  // Read-Only State for UI
  isReady(apiKey: string): boolean;
}

export interface ModelSelectionResult {
  modelId: string;
  isValid: boolean;
  source: 'ribbon' | 'default' | 'invalid';
  usableModels: string[];
  error?: string;
  modelInfo?: ModelInfo;
}

/**
 * Model Selection Service Implementation
 * Implements ModelSelectionServiceContract exactly as specified.
 */
export class ModelSelectionService /* implements ModelSelectionServiceContract */ {
  /**
   * Get selection mode (auto or manual)
   */
  static getSelectionMode(apiKey: string): 'auto' | 'manual' {
    return ModelValidationStore.getSelectionMode(apiKey);
  }

  /**
   * Set selection mode (auto or manual)
   */
  static setSelectionMode(apiKey: string, mode: 'auto' | 'manual'): void {
    ModelValidationStore.setSelectionMode(apiKey, mode);
    
    // If switching to auto, select best default model
    if (mode === 'auto') {
      this.revalidateAgainstStore(apiKey);
    }
  }

  /**
   * Get active model ID (returns string, not ModelInfo)
   */
  static getActiveModel(apiKey: string): string | null {
    const activeModel = ModelValidationStore.getActiveModel(apiKey);
    return activeModel?.id || null;
  }

  /**
   * Get default model ID (best scored model)
   */
  static getDefaultModel(apiKey: string): string | null {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    if (validatedModelInfos.length === 0) return null;
    
    const bestModel = selectBestDefaultModel(validatedModelInfos);
    return bestModel?.id || null;
  }

  /**
   * Set manual model selection
   * CRITICAL: Supports dynamic model switching without app restart
   */
  static setManualModel(apiKey: string, modelId: string): void {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    const model = validatedModelInfos.find(m => m.id === modelId);
    
    // Get current active model for comparison
    const currentModel = ModelValidationStore.getActiveModel(apiKey);
    const oldModelId = currentModel?.id;
    
    if (model) {
      ModelValidationStore.setActiveModel(apiKey, model);
      // Ensure we're in manual mode when user selects
      ModelValidationStore.setSelectionMode(apiKey, 'manual');
      
      // Record model switch event for real-time monitoring
      if (oldModelId && oldModelId !== modelId) {
        try {
          const { StreamingMonitor } = require('./streamingMonitor');
          StreamingMonitor.recordModelSwitch('system', oldModelId, modelId);
          console.log(`[ModelSelectionService] Model switched dynamically: ${oldModelId} → ${modelId}`);
        } catch (e) {
          // Monitor not available, continue
        }
      }
    } else {
      console.warn(`[ModelSelectionService] Model "${modelId}" not found in validated models`);
    }
  }

  /**
   * Clear manual selection (revert to auto)
   */
  static clearManualSelection(apiKey: string): void {
    ModelValidationStore.setSelectionMode(apiKey, 'auto');
    this.revalidateAgainstStore(apiKey);
  }

  /**
   * Revalidate against store (ensures selected/default models still exist)
   */
  static revalidateAgainstStore(apiKey: string): void {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    
    if (validatedModelInfos.length === 0) {
      // No validated models - active model will be null (handled by getActiveModel)
      return;
    }

    const current = ModelValidationStore.getActiveModel(apiKey);
    
    // If current model is still valid, keep it
    if (current && validatedModelInfos.find(m => m.id === current.id)) {
      return;
    }

    // Current model is invalid or missing - select best default
    const bestDefault = selectBestDefaultModel(validatedModelInfos);
    
    if (bestDefault) {
      ModelValidationStore.setActiveModel(apiKey, bestDefault);
    }
  }

  /**
   * Get models by family
   * 
   * CONTRACT GUARANTEE: Always returns initialized arrays for all family keys.
   * Never returns undefined, null, or missing keys.
   * Empty arrays are valid, undefined is forbidden.
   */
  static getModelsByFamily(apiKey: string): {
    flash: ModelInfo[];
    pro: ModelInfo[];
    normal: ModelInfo[];
    all: ModelInfo[];
  } {
    // Initialize with empty arrays to guarantee shape stability
    const result: {
      flash: ModelInfo[];
      pro: ModelInfo[];
      normal: ModelInfo[];
      all: ModelInfo[];
    } = {
      flash: [],
      pro: [],
      normal: [],
      all: []
    };
    
    // Only populate if API key is valid
    if (!apiKey) {
      return result;
    }
    
    try {
      const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
      
      // Populate families (guaranteed to be arrays)
      result.flash = validatedModelInfos.filter(m => m.family === 'flash');
      result.pro = validatedModelInfos.filter(m => m.family === 'pro');
      result.normal = validatedModelInfos.filter(m => m.family === 'normal');
      result.all = validatedModelInfos;
    } catch (error) {
      // If store access fails, return empty arrays (guaranteed shape)
      console.warn('[ModelSelectionService] Failed to get models by family:', error);
    }
    
    // Always return initialized shape (never undefined, never missing keys)
    return result;
  }

  /**
   * Score a model (delegates to modelInfo.scoreModel)
   */
  static scoreModel(model: ModelInfo): number {
    return scoreModel(model);
  }

  /**
   * Select best default model (returns model ID string)
   */
  static selectBestDefaultModel(apiKey: string): string | null {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    if (validatedModelInfos.length === 0) return null;
    
    const bestModel = selectBestDefaultModel(validatedModelInfos);
    return bestModel?.id || null;
  }

  /**
   * Check if service is ready (API key valid AND at least one usable model exists)
   */
  static isReady(apiKey: string): boolean {
    if (!apiKey) return false;
    
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    return validatedModelInfos.length > 0;
  }

  // ==================== RUNTIME METHODS (Not part of contract, but needed for runtime) ====================
  
  /**
   * Get validated model for runtime execution (AUTHORITATIVE - NO RESCORING)
   * This MUST be called before every chat request
   * 
   * CONTRACT: Once a model is selected (manually or auto), it becomes runtime-authoritative.
   * No rescoring, no fallback, no mid-session model switching.
   * 
   * @param apiKey - API key to validate against
   * @returns ModelSelectionResult with validation status and model info
   */
  static async getValidatedModel(apiKey: string): Promise<ModelSelectionResult> {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    const usableModels = validatedModelInfos.map(m => m.id);
    
    // If no usable models, this is a terminal state
    if (usableModels.length === 0) {
      return {
        modelId: '',
        isValid: false,
        source: 'invalid',
        usableModels: [],
        error: 'No usable models discovered. Please run "API Model Test" first.'
      };
    }

    // Get selection mode
    const selectionMode = this.getSelectionMode(apiKey);
    
    // AUTHORITATIVE MODEL SELECTION: Use selected model, never rescore during chat
    let activeModel: ModelInfo | null = null;
    
    if (selectionMode === 'auto') {
      // Auto mode: Get best default (only if not already set)
      // If active model exists, use it (freeze selection for session)
      activeModel = ModelValidationStore.getActiveModel(apiKey);
      
      if (!activeModel) {
        // First time: select best default
        const bestModel = selectBestDefaultModel(validatedModelInfos);
        if (bestModel) {
          activeModel = bestModel;
          // Set once, then freeze
          ModelValidationStore.setActiveModel(apiKey, bestModel);
        }
      }
      // If activeModel exists, use it (no rescoring)
    } else {
      // Manual mode: Use user-selected model (AUTHORITATIVE)
      activeModel = ModelValidationStore.getActiveModel(apiKey);
    }

    // AUTHORITATIVE CHECK: Selected model must be used if it exists and is valid
    if (activeModel && usableModels.includes(activeModel.id)) {
      return {
        modelId: activeModel.id,
        isValid: true,
        source: selectionMode === 'auto' ? 'default' : 'ribbon',
        usableModels,
        modelInfo: activeModel
      };
    }

    // NO FALLBACK DURING CHAT: If selected model is invalid, fail explicitly
    // Fallback logic is ONLY allowed during discovery/validation, never during chat execution
    return {
      modelId: '',
      isValid: false,
      source: 'invalid',
      usableModels,
      error: activeModel 
        ? `Selected model "${activeModel.id}" is no longer available. Please reselect a model.`
        : 'No model selected. Please select a model in the Ribbon.'
    };
  }

  /**
   * Get fallback model if active model fails
   * Returns next best model from validated models using family-aware fallback chain
   * Fallback order: Flash → Pro → Normal → Other
   */
  static getFallbackModel(apiKey: string, excludeModelId?: string): ModelInfo | null {
    const validatedModelInfos = ModelValidationStore.getValidatedModelInfos(apiKey);
    const available = excludeModelId 
      ? validatedModelInfos.filter(m => m.id !== excludeModelId)
      : validatedModelInfos;
    
    if (available.length === 0) return null;
    
    // Get the failed model's family to determine fallback order
    const failedModel = excludeModelId 
      ? validatedModelInfos.find(m => m.id === excludeModelId)
      : null;
    
    // Family-aware fallback order: Flash → Pro → Normal → Others
    const FALLBACK_ORDER: ModelFamily[] = ['flash', 'pro', 'normal', 'others'];
    
    // If we know the failed model's family, start fallback from next family
    if (failedModel) {
      const startIndex = FALLBACK_ORDER.indexOf(failedModel.family);
      
      // Try families in fallback order starting from next family
      for (let i = startIndex + 1; i < FALLBACK_ORDER.length; i++) {
        const family = FALLBACK_ORDER[i];
        const candidate = available.find(m => m.family === family);
        if (candidate) return candidate;
      }
    }
    
    // If no family-aware fallback found, or failed model unknown, use fallback order from start
    for (const family of FALLBACK_ORDER) {
      const candidate = available.find(m => m.family === family);
      if (candidate) return candidate;
    }
    
    // Last resort: return first available
    return available[0];
  }
}
