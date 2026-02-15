/**
 * Advanced Model Discovery Service
 * Intelligently discovers ALL available models from Google's Gemini API
 * with robust error handling, caching, and user notifications
 */

import { ModelInfo, detectModelFamily, generateModelLabel, selectBestDefaultModel } from './ai/modelInfo';
import { ModelValidationStore } from './modelValidationStore';

export interface ModelDiscoveryResult {
  success: boolean;
  discoveredModels: ModelInfo[];
  failedModels: string[];
  totalScanned: number;
  totalAvailable: number;
  error?: string;
  providerStatus: 'ok' | 'exhausted' | 'rate_limited';
}

export interface ModelDiscoveryProgress {
  phase: 'initializing' | 'discovering' | 'testing' | 'complete' | 'error';
  currentModel?: string;
  scannedCount: number;
  totalCount: number;
  workingModels: string[];
  failedModels: string[];
  message: string;
}

type ProgressCallback = (progress: ModelDiscoveryProgress) => void;

export class ModelDiscoveryService {
  private static readonly API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  private static readonly CACHE_KEY = 'gstudio_discovered_models_cache';
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Discover all available models from the API
   * This is the RECOMMENDED way to discover models - uses official API
   */
  static async discoverModels(
    apiKey: string,
    onProgress?: ProgressCallback
  ): Promise<ModelDiscoveryResult> {
    const notify = (progress: Partial<ModelDiscoveryProgress>) => {
      if (onProgress) {
        onProgress({
          phase: 'discovering',
          scannedCount: 0,
          totalCount: 0,
          workingModels: [],
          failedModels: [],
          message: '',
          ...progress,
        });
      }
    };

    try {
      notify({
        phase: 'initializing',
        message: 'Connecting to Google AI API...',
      });

      // Step 1: Fetch all available models from API
      const response = await fetch(`${this.API_BASE}/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid API response format');
      }

      // Step 2: Extract and filter model names
      const allModels = data.models
        .map((model: any) => model.name?.replace('models/', '') || '')
        .filter((name: string) => name.length > 0)
        .filter((name: string) => 
          // Only include generative models (exclude embeddings, etc.)
          name.startsWith('gemini') || name.startsWith('gemma')
        );

      notify({
        phase: 'discovering',
        message: `Found ${allModels.length} models, testing availability...`,
        totalCount: allModels.length,
      });

      // Step 3: Test each model for actual availability
      const discoveredModels: ModelInfo[] = [];
      const failedModels: string[] = [];
      let scannedCount = 0;

      ModelValidationStore.startDiscovery(apiKey, allModels.length);

      for (const modelId of allModels) {
        scannedCount++;
        
        notify({
          phase: 'testing',
          currentModel: modelId,
          scannedCount,
          totalCount: allModels.length,
          workingModels: discoveredModels.map(m => m.id),
          failedModels,
          message: `Testing ${modelId}... (${scannedCount}/${allModels.length})`,
        });

        try {
          // Quick test: try to get model info
          const testResponse = await fetch(
            `${this.API_BASE}/models/${modelId}?key=${apiKey}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (testResponse.ok) {
            const modelData = await testResponse.json();
            
            // Extract token limits from API response
            const inputTokenLimit = modelData.inputTokenLimit || undefined;
            const outputTokenLimit = modelData.outputTokenLimit || undefined;

            const modelInfo: ModelInfo = {
              id: modelId,
              label: generateModelLabel(modelId),
              family: detectModelFamily(modelId),
              maxInputTokens: inputTokenLimit,
              maxOutputTokens: outputTokenLimit,
            };

            discoveredModels.push(modelInfo);
            
            // Record as working in validation store
            ModelValidationStore.recordTestResult(
              apiKey,
              modelId,
              'working',
              undefined,
              inputTokenLimit,
              outputTokenLimit
            );
          } else {
            failedModels.push(modelId);
            
            // Record as failed
            const errorReason = this.parseErrorReason(testResponse.status);
            ModelValidationStore.recordTestResult(
              apiKey,
              modelId,
              'failed',
              errorReason
            );
          }
        } catch (error) {
          failedModels.push(modelId);
          ModelValidationStore.recordTestResult(
            apiKey,
            modelId,
            'failed',
            'network_error'
          );
        }

        // Update discovery progress
        ModelValidationStore.updateDiscoveryProgress(
          apiKey,
          scannedCount,
          discoveredModels.length,
          0
        );

        // Small delay to avoid rate limiting
        if (scannedCount < allModels.length) {
          await this.delay(100);
        }
      }

      ModelValidationStore.endDiscovery(apiKey);
      ModelValidationStore.markTestComplete(apiKey);

      // Step 4: Auto-select best default model
      if (discoveredModels.length > 0) {
        const bestModel = selectBestDefaultModel(discoveredModels);
        if (bestModel) {
          ModelValidationStore.setActiveModel(apiKey, bestModel);
        }
      }

      // Step 5: Cache results
      this.cacheDiscoveredModels(apiKey, discoveredModels);

      notify({
        phase: 'complete',
        scannedCount: allModels.length,
        totalCount: allModels.length,
        workingModels: discoveredModels.map(m => m.id),
        failedModels,
        message: `Discovery complete! Found ${discoveredModels.length} available models.`,
      });

      return {
        success: true,
        discoveredModels,
        failedModels,
        totalScanned: allModels.length,
        totalAvailable: discoveredModels.length,
        providerStatus: 'ok',
      };
    } catch (error: any) {
      notify({
        phase: 'error',
        message: `Discovery failed: ${error.message}`,
      });

      // Check if it's a quota/auth error
      const providerStatus = error.message.includes('quota')
        ? 'exhausted'
        : error.message.includes('auth')
        ? 'rate_limited'
        : 'ok';

      if (providerStatus !== 'ok') {
        ModelValidationStore.setProviderStatus(apiKey, providerStatus);
      }

      return {
        success: false,
        discoveredModels: [],
        failedModels: [],
        totalScanned: 0,
        totalAvailable: 0,
        error: error.message,
        providerStatus,
      };
    }
  }

  /**
   * Get cached discovered models (if available and not expired)
   */
  static getCachedModels(apiKey: string): ModelInfo[] | null {
    try {
      const apiKeyHash = this.getApiKeyHash(apiKey);
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${apiKeyHash}`);
      
      if (!cached) return null;

      const { models, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_TTL_MS) {
        localStorage.removeItem(`${this.CACHE_KEY}_${apiKeyHash}`);
        return null;
      }

      return models;
    } catch (error) {
      console.warn('[ModelDiscoveryService] Failed to load cached models:', error);
      return null;
    }
  }

  /**
   * Clear cached models for an API key
   */
  static clearCache(apiKey: string): void {
    try {
      const apiKeyHash = this.getApiKeyHash(apiKey);
      localStorage.removeItem(`${this.CACHE_KEY}_${apiKeyHash}`);
    } catch (error) {
      console.warn('[ModelDiscoveryService] Failed to clear cache:', error);
    }
  }

  private static cacheDiscoveredModels(apiKey: string, models: ModelInfo[]): void {
    try {
      const apiKeyHash = this.getApiKeyHash(apiKey);
      const cacheData = {
        models,
        timestamp: Date.now(),
      };
      localStorage.setItem(`${this.CACHE_KEY}_${apiKeyHash}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[ModelDiscoveryService] Failed to cache models:', error);
    }
  }

  private static parseErrorReason(statusCode: number): 'quota_exhausted' | 'permission_denied' | 'not_found' | 'unknown' {
    switch (statusCode) {
      case 429:
        return 'quota_exhausted';
      case 403:
        return 'permission_denied';
      case 404:
        return 'not_found';
      default:
        return 'unknown';
    }
  }

  private static getApiKeyHash(apiKey: string): string {
    if (!apiKey || apiKey.length < 16) {
      return apiKey;
    }
    return apiKey.substring(0, 8) + apiKey.substring(apiKey.length - 8);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
