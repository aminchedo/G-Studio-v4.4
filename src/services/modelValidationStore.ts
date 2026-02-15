/**
 * Model Validation Store
 * Persists active model test results to ensure only verified working models are used
 * 
 * IMMUTABILITY GUARANTEE:
 * Once API Model Test completes, results are READ-ONLY for the session.
 * No service may mutate usableModels, rejection reasons, or provider status
 * except through a new API Model Test execution.
 * 
 * SINGLE SOURCE OF TRUTH:
 * This store is the ONLY authority for model validation state.
 * All Gemini services MUST check this store before making API calls.
 */

import { ModelInfo, detectModelFamily, generateModelLabel, selectBestDefaultModel } from './modelInfo';
import { DEFAULT_MODELS, getDefaultModelInfos } from './defaultModels';

export interface ModelTestResult {
  readonly modelId: string;
  readonly status: 'working' | 'failed' | 'untested';
  readonly failureReason?: 'quota_exhausted' | 'permission_denied' | 'model_disabled' | 'incompatible' | 'not_found' | 'network_error' | 'timeout' | 'unknown';
  readonly testedAt: number;
  readonly apiKeyHash: string; // First 8 + last 8 chars of API key
  readonly maxInputTokens?: number;
  readonly maxOutputTokens?: number;
  readonly responseTime?: number; // Average response time in milliseconds (from UltimateGeminiTester)
  readonly avgResponseTime?: number; // Alias for responseTime (for compatibility)
}

/**
 * Frozen copy of test results - prevents mutation after test completion
 */
function freezeResults(results: ModelTestResult[]): readonly ModelTestResult[] {
  return Object.freeze(results.map(r => Object.freeze({ ...r })));
}

export class ModelValidationStore {
  private static readonly STORAGE_KEY = 'gstudio_model_validation';
  private static readonly PROVIDER_STATUS_KEY = 'gstudio_provider_status';
  private static readonly ACTIVE_MODEL_KEY = 'gstudio_active_model';
  private static readonly SELECTION_MODE_KEY = 'gstudio_selection_mode';
  private static readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private static inMemoryCache: Map<string, readonly ModelTestResult[]> = new Map();
  private static providerStatusCache: Map<string, { readonly status: 'ok' | 'exhausted' | 'rate_limited'; readonly testedAt: number }> = new Map();
  private static activeModelCache: Map<string, ModelInfo | null> = new Map();
  private static selectionModeCache: Map<string, 'auto' | 'manual'> = new Map();
  
  /**
   * IMMUTABILITY LOCK: Tracks which API keys have completed testing
   * Once locked, results cannot be modified except by clearResults()
   */
  private static testCompletedLock: Set<string> = new Set();
  
  /**
   * DISCOVERY STATE: Track ongoing discovery progress
   * This is separate from runtime rate limiting
   */
  private static discoveryState: Map<string, {
    isDiscovering: boolean;
    scannedModelCount: number;
    candidateModelCount: number;
    usableModelsCount: number;
    transientRateLimitCount: number;
  }> = new Map();

  /**
   * Check if API Model Test has been executed for this API key
   * OR if we have usable models (defaults or selected)
   * 
   * CORRECTED LOGIC: Runtime gate should allow execution if:
   * 1. Test was executed, OR
   * 2. Default models exist (preloaded), OR
   * 3. A model has been manually/auto selected
   */
  static hasTestBeenExecuted(apiKey: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    
    // Test has been executed if we have any results (working or failed)
    if (results.length > 0) {
      return true;
    }
    
    // If no test results, check if we have usable models (defaults)
    const validatedModelInfos = this.getValidatedModelInfos(apiKey);
    if (validatedModelInfos.length > 0) {
      // We have default models - consider "tested" for runtime gate
      return true;
    }
    
    // Check if a model has been selected (manual or auto)
    const activeModel = this.getActiveModel(apiKey);
    if (activeModel) {
      // A model is selected - consider "tested" for runtime gate
      return true;
    }
    
    return false;
  }

  /**
   * Get validated models for an API key
   * Returns only models that have been tested and are working
   * 
   * If no test has been run, returns default models (safe defaults that work without testing)
   */
  static getValidatedModels(apiKey: string): string[] {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    
    // If test has been run, return tested working models
    if (results.length > 0) {
      return results
        .filter(r => r.status === 'working')
        .map(r => r.modelId);
    }
    
    // No test run yet - return default models (safe defaults)
    return [...DEFAULT_MODELS];
  }

  /**
   * Get validated models as ModelInfo[]
   * Returns only models that have been tested and are working
   * 
   * If no test has been run, returns default models (safe defaults that work without testing)
   * 
   * Family detection happens exactly once: during discovery.
   * This method uses the family that was detected and stored during discovery.
   */
  static getValidatedModelInfos(apiKey: string): ModelInfo[] {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    
    // If test has been run, return tested working models
    if (results.length > 0) {
      return results
        .filter(r => r.status === 'working')
        .map(r => ({
          id: r.modelId,
          label: generateModelLabel(r.modelId),
          family: detectModelFamily(r.modelId), // Family detected from modelId (deterministic)
          maxInputTokens: r.maxInputTokens,
          maxOutputTokens: r.maxOutputTokens,
          responseTime: r.responseTime || r.avgResponseTime, // Include performance metrics
          avgResponseTime: r.avgResponseTime || r.responseTime // Alias for compatibility
        }));
    }
    
    // No test run yet - return default models (safe defaults)
    return getDefaultModelInfos();
  }

  /**
   * Get selection mode for an API key (auto or manual)
   */
  static getSelectionMode(apiKey: string): 'auto' | 'manual' {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Check in-memory cache
    if (this.selectionModeCache.has(apiKeyHash)) {
      return this.selectionModeCache.get(apiKeyHash)!;
    }

    // Load from localStorage
    try {
      const stored = localStorage.getItem(this.SELECTION_MODE_KEY);
      if (stored) {
        const allModes: Record<string, 'auto' | 'manual'> = JSON.parse(stored);
        const mode = allModes[apiKeyHash];
        if (mode === 'auto' || mode === 'manual') {
          this.selectionModeCache.set(apiKeyHash, mode);
          return mode;
        }
      }
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to load selection mode:', e);
    }

    // Default to auto
    return 'auto';
  }

  /**
   * Set selection mode for an API key
   */
  static setSelectionMode(apiKey: string, mode: 'auto' | 'manual'): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Update in-memory cache
    this.selectionModeCache.set(apiKeyHash, mode);

    // Save to localStorage
    try {
      const stored = localStorage.getItem(this.SELECTION_MODE_KEY);
      const allModes: Record<string, 'auto' | 'manual'> = stored ? JSON.parse(stored) : {};
      allModes[apiKeyHash] = mode;
      localStorage.setItem(this.SELECTION_MODE_KEY, JSON.stringify(allModes));
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to save selection mode:', e);
    }
  }

  /**
   * Get active model for an API key
   * Respects selection mode: auto uses scoring, manual uses selected model
   */
  static getActiveModel(apiKey: string): ModelInfo | null {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const selectionMode = this.getSelectionMode(apiKey);
    const validatedModels = this.getValidatedModelInfos(apiKey);
    
    if (validatedModels.length === 0) return null;

    // Manual mode: use selected model if available
    if (selectionMode === 'manual') {
      // Check in-memory cache
      if (this.activeModelCache.has(apiKeyHash)) {
        const cached = this.activeModelCache.get(apiKeyHash);
        if (cached && validatedModels.find(m => m.id === cached.id)) {
          return cached;
        }
      }

      // Load from localStorage
      try {
        const stored = localStorage.getItem(this.ACTIVE_MODEL_KEY);
        if (stored) {
          const allActive: Record<string, ModelInfo> = JSON.parse(stored);
          const active = allActive[apiKeyHash];
          if (active && validatedModels.find(m => m.id === active.id)) {
            this.activeModelCache.set(apiKeyHash, active);
            return active;
          }
        }
      } catch (e) {
        console.warn('[ModelValidationStore] Failed to load active model:', e);
      }

      // Manual mode but no valid selection - fallback to best default
      const bestDefault = selectBestDefaultModel(validatedModels);
      if (bestDefault) {
        this.setActiveModel(apiKey, bestDefault);
        return bestDefault;
      }
      return null;
    }

    // Auto mode: always use best default (scored)
    const bestDefault = selectBestDefaultModel(validatedModels);
    if (bestDefault) {
      // Update cache if different
      const current = this.activeModelCache.get(apiKeyHash);
      if (!current || current.id !== bestDefault.id) {
        this.setActiveModel(apiKey, bestDefault);
      }
      return bestDefault;
    }

    return null;
  }

  /**
   * Set active model for an API key
   */
  static setActiveModel(apiKey: string, model: ModelInfo): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Update in-memory cache
    this.activeModelCache.set(apiKeyHash, model);

    // Save to localStorage
    try {
      const stored = localStorage.getItem(this.ACTIVE_MODEL_KEY);
      const allActive: Record<string, ModelInfo> = stored ? JSON.parse(stored) : {};
      allActive[apiKeyHash] = model;
      localStorage.setItem(this.ACTIVE_MODEL_KEY, JSON.stringify(allActive));
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to save active model:', e);
    }
  }

  /**
   * Check if a specific model was rejected during test
   */
  static isModelRejected(apiKey: string, modelId: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    const result = results.find(r => r.modelId === modelId);
    
    return result !== undefined && result.status === 'failed';
  }

  /**
   * Get rejection reason for a model
   */
  static getRejectionReason(apiKey: string, modelId: string): string | null {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    const result = results.find(r => r.modelId === modelId && r.status === 'failed');
    
    return result?.failureReason || null;
  }

  /**
   * Get failed models for an API key
   * Returns models that failed testing with terminal failures (quota, permission)
   */
  static getFailedModels(apiKey: string): string[] {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    
    return results
      .filter(r => r.status === 'failed' && 
                   (r.failureReason === 'quota_exhausted' || 
                    r.failureReason === 'permission_denied' ||
                    r.failureReason === 'model_disabled'))
      .map(r => r.modelId);
  }

  /**
   * Check if a model is validated and working
   */
  static isModelValidated(apiKey: string, modelId: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const results = this.loadResults(apiKeyHash);
    const result = results.find(r => r.modelId === modelId);
    
    if (!result) return false;
    if (result.status !== 'working') return false;
    
    // Check if result is still fresh
    if (Date.now() - result.testedAt > this.CACHE_TTL_MS) {
      return false; // Result expired, needs retest
    }
    
    return true;
  }

  /**
   * Record a model test result
   * IMMUTABILITY: Can only be called during active test execution
   * Once test is complete (via markTestComplete), no more results can be recorded
   */
  static recordTestResult(
    apiKey: string,
    modelId: string,
    status: 'working' | 'failed',
    failureReason?: ModelTestResult['failureReason'],
    maxInputTokens?: number,
    maxOutputTokens?: number,
    responseTime?: number // Performance metric from UltimateGeminiTester
  ): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // IMMUTABILITY CHECK: Reject if test already completed
    if (this.testCompletedLock.has(apiKeyHash)) {
      console.warn(`[ModelValidationStore] IMMUTABILITY_VIOLATION: Attempted to modify results after test completion for ${apiKeyHash}`);
      throw new Error('INVARIANT_VIOLATION: Cannot modify test results after API Model Test completion. Run a new test to update results.');
    }
    
    const results = [...this.loadResults(apiKeyHash)]; // Mutable copy
    
    // Remove existing result for this model
    const filtered = results.filter(r => r.modelId !== modelId);
    
    // Add new result
    filtered.push({
      modelId,
      status,
      failureReason,
      testedAt: Date.now(),
      apiKeyHash,
      maxInputTokens,
      maxOutputTokens,
      responseTime,
      avgResponseTime: responseTime // Alias for compatibility
    });
    
    // Save results (not frozen yet - test still in progress)
    this.saveResults(apiKeyHash, filtered, false);
  }

  /**
   * Record multiple test results at once
   * IMMUTABILITY: Can only be called during active test execution
   */
  static recordTestResults(
    apiKey: string,
    results: Array<{ modelId: string; status: 'working' | 'failed'; failureReason?: ModelTestResult['failureReason'] }>
  ): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // IMMUTABILITY CHECK: Reject if test already completed
    if (this.testCompletedLock.has(apiKeyHash)) {
      console.warn(`[ModelValidationStore] IMMUTABILITY_VIOLATION: Attempted to modify results after test completion for ${apiKeyHash}`);
      throw new Error('INVARIANT_VIOLATION: Cannot modify test results after API Model Test completion. Run a new test to update results.');
    }
    
    const existingResults = [...this.loadResults(apiKeyHash)]; // Mutable copy
    
    // Create a map of existing results
    const resultMap = new Map(existingResults.map(r => [r.modelId, r]));
    
    // Update with new results
    for (const result of results) {
      resultMap.set(result.modelId, {
        modelId: result.modelId,
        status: result.status,
        failureReason: result.failureReason,
        testedAt: Date.now(),
        apiKeyHash
      });
    }
    
    // Save all results (not frozen yet - test still in progress)
    this.saveResults(apiKeyHash, Array.from(resultMap.values()), false);
  }

  /**
   * Mark test as complete - LOCKS results from further modification
   * This MUST be called after API Model Test finishes
   * Automatically selects best default model if none is active
   */
  static markTestComplete(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    this.testCompletedLock.add(apiKeyHash);
    
    // Freeze the results in cache
    const results = this.loadResults(apiKeyHash);
    this.inMemoryCache.set(apiKeyHash, freezeResults([...results]));
    
    // Auto-select best default model if none is active
    const validatedModels = this.getValidatedModelInfos(apiKey);
    if (validatedModels.length > 0) {
      const currentActive = this.getActiveModel(apiKey);
      if (!currentActive || !validatedModels.find(m => m.id === currentActive.id)) {
        const bestDefault = selectBestDefaultModel(validatedModels);
        if (bestDefault) {
          this.setActiveModel(apiKey, bestDefault);
          console.log(`[ModelValidationStore] Auto-selected best default model: ${bestDefault.id}`);
        }
      }
    }
    
    console.log(`[ModelValidationStore] Test completed and LOCKED for ${apiKeyHash} - results are now immutable`);
  }

  /**
   * Clear validation results for an API key
   * This UNLOCKS the results, allowing a new test to be run
   */
  static clearResults(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // UNLOCK: Allow new test to be run
    this.testCompletedLock.delete(apiKeyHash);
    this.inMemoryCache.delete(apiKeyHash);
    this.activeModelCache.delete(apiKeyHash);
    this.clearDiscoveryState(apiKey);
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const allResults: Record<string, ModelTestResult[]> = JSON.parse(stored);
        delete allResults[apiKeyHash];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allResults));
      }
      
      const activeStored = localStorage.getItem(this.ACTIVE_MODEL_KEY);
      if (activeStored) {
        const allActive: Record<string, ModelInfo> = JSON.parse(activeStored);
        delete allActive[apiKeyHash];
        localStorage.setItem(this.ACTIVE_MODEL_KEY, JSON.stringify(allActive));
      }
      
      // Clear selection mode (reset to auto)
      const modeStored = localStorage.getItem(this.SELECTION_MODE_KEY);
      if (modeStored) {
        const allModes: Record<string, 'auto' | 'manual'> = JSON.parse(modeStored);
        delete allModes[apiKeyHash];
        localStorage.setItem(this.SELECTION_MODE_KEY, JSON.stringify(allModes));
      }
      this.selectionModeCache.delete(apiKeyHash);
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to clear results from localStorage:', e);
    }
    
    console.log(`[ModelValidationStore] Results cleared and UNLOCKED for ${apiKeyHash}`);
  }

  /**
   * Get all test results for an API key
   */
  static getAllResults(apiKey: string): ModelTestResult[] {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    return this.loadResults(apiKeyHash);
  }

  /**
   * Check if any model has quota exhaustion (terminal state)
   */
  static hasQuotaExhaustedModels(apiKey: string): boolean {
    const providerStatus = this.getProviderStatus(apiKey);
    return providerStatus === 'exhausted';
  }

  /**
   * Get provider status (ok, exhausted, or rate_limited)
   */
  static getProviderStatus(apiKey: string): 'ok' | 'exhausted' | 'rate_limited' {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Check in-memory cache
    if (this.providerStatusCache.has(apiKeyHash)) {
      const cached = this.providerStatusCache.get(apiKeyHash)!;
      if (Date.now() - cached.testedAt <= this.CACHE_TTL_MS) {
        return cached.status;
      }
    }

    // Load from localStorage
    try {
      const stored = localStorage.getItem(this.PROVIDER_STATUS_KEY);
      if (stored) {
        const allStatuses: Record<string, { status: 'ok' | 'exhausted' | 'rate_limited'; testedAt: number }> = JSON.parse(stored);
        const status = allStatuses[apiKeyHash];
        if (status && Date.now() - status.testedAt <= this.CACHE_TTL_MS) {
          this.providerStatusCache.set(apiKeyHash, status);
          return status.status;
        }
      }
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to load provider status:', e);
    }

    return 'ok'; // Default to ok if not tested
  }

  /**
   * Set provider status
   * IMMUTABILITY: Can only be called during active test execution or when entering degraded mode
   */
  static setProviderStatus(apiKey: string, status: 'ok' | 'exhausted' | 'rate_limited'): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Allow setting to 'exhausted' or 'rate_limited' even after test completion (runtime detection)
    // But 'ok' can only be set during test execution
    if (status === 'ok' && this.testCompletedLock.has(apiKeyHash)) {
      console.warn(`[ModelValidationStore] IMMUTABILITY_VIOLATION: Attempted to set provider status to 'ok' after test completion`);
      throw new Error('INVARIANT_VIOLATION: Cannot change provider status to ok after test completion. Run a new test.');
    }
    
    const statusData = Object.freeze({ status, testedAt: Date.now() });
    
    // Update in-memory cache
    this.providerStatusCache.set(apiKeyHash, statusData);

    // Save to localStorage
    try {
      const stored = localStorage.getItem(this.PROVIDER_STATUS_KEY);
      const allStatuses: Record<string, { status: 'ok' | 'exhausted' | 'rate_limited'; testedAt: number }> = stored ? JSON.parse(stored) : {};
      allStatuses[apiKeyHash] = statusData;
      localStorage.setItem(this.PROVIDER_STATUS_KEY, JSON.stringify(allStatuses));
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to save provider status:', e);
    }
  }
  
  /**
   * Start discovery phase - track that discovery is in progress
   */
  static startDiscovery(apiKey: string, candidateModelCount: number): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    this.discoveryState.set(apiKeyHash, {
      isDiscovering: true,
      scannedModelCount: 0,
      candidateModelCount,
      usableModelsCount: 0,
      transientRateLimitCount: 0
    });
  }
  
  /**
   * Update discovery progress
   */
  static updateDiscoveryProgress(
    apiKey: string,
    scannedCount: number,
    usableCount: number,
    rateLimitCount: number
  ): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const state = this.discoveryState.get(apiKeyHash);
    if (state) {
      this.discoveryState.set(apiKeyHash, {
        ...state,
        scannedModelCount: scannedCount,
        usableModelsCount: usableCount,
        transientRateLimitCount: rateLimitCount
      });
    }
  }
  
  /**
   * End discovery phase - mark discovery as complete
   */
  static endDiscovery(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const state = this.discoveryState.get(apiKeyHash);
    if (state) {
      this.discoveryState.set(apiKeyHash, {
        ...state,
        isDiscovering: false
      });
    }
  }
  
  /**
   * Check if discovery is in progress
   */
  static isDiscovering(apiKey: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const state = this.discoveryState.get(apiKeyHash);
    return state?.isDiscovering ?? false;
  }
  
  /**
   * Get discovery state
   */
  static getDiscoveryState(apiKey: string): {
    isDiscovering: boolean;
    scannedModelCount: number;
    candidateModelCount: number;
    usableModelsCount: number;
    transientRateLimitCount: number;
  } | null {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    return this.discoveryState.get(apiKeyHash) ?? null;
  }
  
  /**
   * Clear discovery state (called when clearing results)
   */
  static clearDiscoveryState(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    this.discoveryState.delete(apiKeyHash);
  }

  private static getApiKeyHash(apiKey: string): string {
    if (!apiKey || apiKey.length < 16) {
      return apiKey; // Fallback for short keys
    }
    return apiKey.substring(0, 8) + apiKey.substring(apiKey.length - 8);
  }

  private static loadResults(apiKeyHash: string): readonly ModelTestResult[] {
    // Check in-memory cache first
    if (this.inMemoryCache.has(apiKeyHash)) {
      return this.inMemoryCache.get(apiKeyHash)!;
    }

    // Load from localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const allResults: Record<string, ModelTestResult[]> = JSON.parse(stored);
        const results = allResults[apiKeyHash] || [];
        
        // Filter out expired results
        const now = Date.now();
        const freshResults = results.filter(r => now - r.testedAt <= this.CACHE_TTL_MS);
        
        // Freeze and update cache
        const frozen = freezeResults(freshResults);
        this.inMemoryCache.set(apiKeyHash, frozen);
        
        // Save back if we filtered anything
        if (freshResults.length !== results.length) {
          allResults[apiKeyHash] = freshResults;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allResults));
        }
        
        return frozen;
      }
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to load results from localStorage:', e);
    }

    return Object.freeze([]);
  }

  private static saveResults(apiKeyHash: string, results: ModelTestResult[], freeze: boolean = true): void {
    // Update in-memory cache
    const toCache = freeze ? freezeResults(results) : results;
    this.inMemoryCache.set(apiKeyHash, toCache as readonly ModelTestResult[]);

    // Save to localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const allResults: Record<string, ModelTestResult[]> = stored ? JSON.parse(stored) : {};
      allResults[apiKeyHash] = results;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allResults));
    } catch (e) {
      console.warn('[ModelValidationStore] Failed to save results to localStorage:', e);
    }
  }
}
