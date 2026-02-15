/**
 * Model Service - Fetch and manage Gemini models dynamically from Google API
 * Provides real-time access to all available models with caching
 */

import { ErrorHandler, ErrorCode } from '../errorHandler';
import { TelemetryService } from '../telemetryService';

export interface GeminiModel {
  id: string;
  name: string;
  displayName: string;
  version: string;
  category: 'experimental' | 'latest' | 'stable';
  maxTokens: number;
  capabilities: string[];
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export interface FetchModelsOptions {
  apiKey?: string;
  ignoreCache?: boolean;
  timeout?: number;
}

class ModelService {
  private static instance: ModelService;
  private cachedModels: GeminiModel[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour
  private readonly API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

  // Fallback models if API fetch fails
  private readonly DEFAULT_MODELS: GeminiModel[] = [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      displayName: 'Gemini 2.0 Flash (Experimental)',
      version: '2.0',
      category: 'experimental',
      maxTokens: 1000000,
      capabilities: ['text', 'vision', 'audio', 'streaming'],
      description: 'Latest experimental model with improved reasoning',
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      displayName: 'Gemini 1.5 Pro',
      version: '1.5',
      category: 'latest',
      maxTokens: 2000000,
      capabilities: ['text', 'vision', 'audio'],
      description: 'High-performance model for complex tasks',
      inputTokenLimit: 2000000,
      outputTokenLimit: 8192,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      displayName: 'Gemini 1.5 Flash',
      version: '1.5',
      category: 'latest',
      maxTokens: 1000000,
      capabilities: ['text', 'vision', 'audio'],
      description: 'Fast and efficient model for real-time tasks',
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192,
    },
    {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro',
      displayName: 'Gemini 1.0 Pro',
      version: '1.0',
      category: 'stable',
      maxTokens: 32768,
      capabilities: ['text'],
      description: 'Stable and reliable model',
      inputTokenLimit: 32768,
      outputTokenLimit: 8192,
    },
  ];

  private constructor() {}

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  /**
   * Fetch all available models from Google API with fallback
   */
  async fetchAvailableModels(options: FetchModelsOptions = {}): Promise<GeminiModel[]> {
    try {
      // Check cache first
      if (!options.ignoreCache && this.isCacheValid()) {
        return this.cachedModels || this.DEFAULT_MODELS;
      }

      const apiKey = options.apiKey || this.getApiKeyFromEnv();
      if (!apiKey) {
        console.warn('[ModelService] No API key provided, using default models');
        return this.DEFAULT_MODELS;
      }

      const models = await this.fetchModelsFromAPI(apiKey, options.timeout);
      this.cachedModels = models;
      this.cacheTimestamp = Date.now();

      TelemetryService.recordEvent('models_fetched_success', {
        count: models.length,
        source: 'api',
      });

      return models;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to fetch models';
      console.warn('[ModelService] API fetch failed, using default models:', errorMsg);

      TelemetryService.recordEvent('models_fetched_fallback', {
        error: errorMsg,
        source: 'default',
      });

      return this.DEFAULT_MODELS;
    }
  }

  /**
   * Fetch models from Google Generative AI API
   * @private
   */
  private async fetchModelsFromAPI(apiKey: string, timeout: number = 10000): Promise<GeminiModel[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseModelsFromResponse(data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse and normalize models from API response
   * @private
   */
  private parseModelsFromResponse(data: any): GeminiModel[] {
    if (!data.models || !Array.isArray(data.models)) {
      return this.DEFAULT_MODELS;
    }

    return data.models
      .map((m: any) => ({
        id: m.name?.split('/').pop() || m.name || '',
        name: m.displayName || m.name || '',
        displayName: m.displayName || m.name || '',
        version: this.extractVersion(m.name || ''),
        category: this.categorizeModel(m.name || ''),
        maxTokens: m.inputTokenLimit || 32768,
        capabilities: m.supportedGenerationMethods || [],
        description: m.description || undefined,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
      }))
      .filter((m: GeminiModel) => m.id.length > 0)
      .sort((a: GeminiModel, b: GeminiModel) => this.sortModels(a, b));
  }

  /**
   * Get API key from environment or localStorage
   * @private
   */
  private getApiKeyFromEnv(): string | null {
    // Check environment variables (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) {
      return (import.meta as any).env.VITE_GOOGLE_API_KEY;
    }

    // Check localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('google_api_key');
      if (stored) return stored;
    }

    return null;
  }

  /**
   * Extract version from model name
   * @private
   */
  private extractVersion(modelName: string): string {
    const versionMatch = modelName.match(/gemini-(\d+\.\d+)/i);
    if (versionMatch) return versionMatch[1];
    return '1.0';
  }

  /**
   * Categorize model based on name
   * @private
   */
  private categorizeModel(modelName: string): 'experimental' | 'latest' | 'stable' {
    if (modelName.includes('exp')) return 'experimental';
    if (modelName.includes('1.5') || modelName.includes('2.0')) return 'latest';
    return 'stable';
  }

  /**
   * Sort models by category and version (newest first)
   * @private
   */
  private sortModels(a: GeminiModel, b: GeminiModel): number {
    const categoryOrder = { experimental: 0, latest: 1, stable: 2 };
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;

    // Sort by version descending (newer first)
    const versionA = parseFloat(a.version);
    const versionB = parseFloat(b.version);
    return versionB - versionA;
  }

  /**
   * Check if cache is still valid
   * @private
   */
  private isCacheValid(): boolean {
    if (!this.cachedModels) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Clear cache (e.g., after settings change)
   */
  clearCache(): void {
    this.cachedModels = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get recommended models (filtered by category)
   */
  getRecommendedModels(models: GeminiModel[]): GeminiModel[] {
    return models.filter(m => m.category === 'experimental' || m.category === 'latest').slice(0, 3);
  }

  /**
   * Find model by ID
   */
  findModelById(models: GeminiModel[], id: string): GeminiModel | undefined {
    return models.find(m => m.id === id);
  }

  /**
   * Group models by version
   */
  groupByVersion(models: GeminiModel[]): Record<string, GeminiModel[]> {
    return models.reduce((acc, model) => {
      const version = model.version;
      if (!acc[version]) acc[version] = [];
      acc[version].push(model);
      return acc;
    }, {} as Record<string, GeminiModel[]>);
  }
}

export const modelService = ModelService.getInstance();
