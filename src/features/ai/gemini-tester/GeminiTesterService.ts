/**
 * GeminiTesterService - Enhanced Service Layer
 * 
 * Comprehensive service for discovering, testing, and managing Gemini AI models
 * with improved error handling, caching, and performance optimization
 */

import {
  ModelInfo,
  TestResult,
  TestProgress,
  APIResponse,
  ModelRecommendations,
  ModelCategories,
  CachedModelInfo
} from './GeminiTesterTypes';
import { CONFIG } from './GeminiTesterConfig';
import {
  Logger,
  ModelCacheManager,
  RateLimiter,
  TokenUsageTracker,
  ErrorHandler,
  ModelUtils,
  PerformanceMonitor,
  RetryHandler
} from './GeminiTesterUtils';

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

interface ServiceConfig {
  apiKey: string;
  useCache?: boolean;
  timeout?: number;
  maxRetries?: number;
}

// ============================================================================
// MODEL TESTER SERVICE
// ============================================================================

export class ModelTesterService {
  private config: Required<ServiceConfig>;
  private logger: Logger;
  private abortController: AbortController | null = null;

  // Results tracking
  public results = {
    models: {
      all: [] as TestResult[],
      accessible: [] as TestResult[],
      restricted: [] as TestResult[],
      failed: [] as TestResult[]
    },
    stats: {
      total: 0,
      accessible: 0,
      restricted: 0,
      failed: 0,
      avgResponseTime: 0
    }
  };

  constructor(config: ServiceConfig, logger: Logger) {
    this.config = {
      apiKey: config.apiKey,
      useCache: config.useCache ?? true,
      timeout: config.timeout ?? CONFIG.GEMINI_API.timeout,
      maxRetries: config.maxRetries ?? CONFIG.GEMINI_API.maxRetries
    };
    this.logger = logger;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize service and validate API key
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Gemini Tester Service...');

    try {
      // Validate API key format
      if (!this.validateApiKeyFormat(this.config.apiKey)) {
        throw new Error('Invalid API key format');
      }

      // Test API connectivity
      await this.testConnection();

      this.logger.success('✅ Service initialized successfully');
    } catch (error: any) {
      this.logger.error(`❌ Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate API key format
   */
  private validateApiKeyFormat(apiKey: string): boolean {
    return apiKey && apiKey.length >= 20 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  /**
   * Test API connection
   */
  private async testConnection(): Promise<void> {
    this.logger.info('🔌 Testing API connection...');

    try {
      const response = await fetch(
        `${CONFIG.GEMINI_API.baseUrl}models?key=${this.config.apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key or insufficient permissions');
        }
        throw new Error(`Connection test failed: ${response.statusText}`);
      }

      this.logger.success('✅ API connection successful');
    } catch (error: any) {
      throw ErrorHandler.createAPIError(error);
    }
  }

  // ============================================================================
  // MODEL DISCOVERY
  // ============================================================================

  /**
   * Discover all available models
   */
  async discoverModels(): Promise<ModelInfo[]> {
    this.logger.info('🔍 Discovering available models...');

    try {
      // Check cache first
      if (this.config.useCache) {
        const cached = ModelCacheManager.getCache(this.config.apiKey);
        if (cached) {
          const models = Array.from(cached.models.values()).map(this.cachedToModelInfo);
          this.logger.info(`📦 Loaded ${models.length} models from cache`);
          return models;
        }
      }

      // Fetch from API
      const models = await this.fetchModelsFromAPI();
      
      this.logger.success(`✅ Discovered ${models.length} models`);
      return models;
    } catch (error: any) {
      this.logger.error(`❌ Model discovery failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch models from API
   */
  private async fetchModelsFromAPI(): Promise<ModelInfo[]> {
    const stopTimer = PerformanceMonitor.start('model_discovery');

    try {
      await RateLimiter.waitIfNeeded();
      
      const response = await RetryHandler.retryWithRateLimit(async () => {
        const res = await fetch(
          `${CONFIG.GEMINI_API.baseUrl}models?key=${this.config.apiKey}`,
          {
            method: 'GET',
            signal: AbortSignal.timeout(this.config.timeout)
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      }, {
        maxRetries: this.config.maxRetries,
        onRetry: (attempt, error) => {
          this.logger.warning(`⚠️ Retry attempt ${attempt}: ${error.message}`);
        }
      });

      RateLimiter.recordRequest();
      stopTimer();

      // Parse and enhance model information
      const models = response.models || [];
      return models
        .filter((m: any) => m.name && m.name.includes('gemini'))
        .map((m: any) => this.parseModelInfo(m));
    } catch (error: any) {
      stopTimer();
      throw ErrorHandler.createAPIError(error);
    }
  }

  /**
   * Parse raw model info from API
   */
  private parseModelInfo(rawModel: any): ModelInfo {
    const name = rawModel.name.replace('models/', '');
    const family = ModelUtils.extractFamily(name);
    const tier = ModelUtils.extractTier(name);

    return {
      name,
      displayName: rawModel.displayName || ModelUtils.formatDisplayName(name),
      family,
      tier,
      accessible: false,
      streaming: rawModel.supportedGenerationMethods?.includes('streamGenerateContent') ?? false,
      multimodal: this.detectMultimodal(rawModel),
      methods: rawModel.supportedGenerationMethods || [],
      inputTokenLimit: rawModel.inputTokenLimit || CONFIG.GEMINI_API.tokenLimit.input,
      outputTokenLimit: rawModel.outputTokenLimit || CONFIG.GEMINI_API.tokenLimit.output,
      capabilities: this.extractCapabilities(rawModel)
    };
  }

  /**
   * Detect if model supports multimodal input
   */
  private detectMultimodal(rawModel: any): boolean {
    const name = rawModel.name.toLowerCase();
    
    // Check explicit capabilities
    if (rawModel.capabilities) {
      const caps = JSON.stringify(rawModel.capabilities).toLowerCase();
      if (caps.includes('image') || caps.includes('video') || caps.includes('audio')) {
        return true;
      }
    }

    // Check by model name patterns
    if (name.includes('vision') || name.includes('multimodal')) {
      return true;
    }

    // Pro and Flash models typically support multimodal
    if (name.includes('pro') || name.includes('flash')) {
      return true;
    }

    return false;
  }

  /**
   * Extract model capabilities
   */
  private extractCapabilities(rawModel: any): string[] {
    const capabilities = new Set<string>();

    // Add text by default
    capabilities.add('text');

    // Check for multimodal
    if (this.detectMultimodal(rawModel)) {
      capabilities.add('image');
    }

    // Check for streaming
    if (rawModel.supportedGenerationMethods?.includes('streamGenerateContent')) {
      capabilities.add('streaming');
    }

    // Check for function calling
    if (rawModel.supportedGenerationMethods?.includes('generateContent')) {
      capabilities.add('function_calling');
    }

    // Check for embeddings
    if (rawModel.supportedGenerationMethods?.includes('embedContent')) {
      capabilities.add('embeddings');
    }

    return Array.from(capabilities);
  }

  // ============================================================================
  // MODEL TESTING
  // ============================================================================

  /**
   * Test all models
   */
  async testAllModels(
    models: ModelInfo[],
    onProgress?: (progress: TestProgress) => void,
    shouldStop?: () => boolean
  ): Promise<TestResult[]> {
    this.logger.info(`🧪 Starting tests for ${models.length} models...`);
    
    this.abortController = new AbortController();
    const results: TestResult[] = [];
    const total = models.length;

    for (let i = 0; i < models.length; i++) {
      // Check if should stop
      if (shouldStop && shouldStop()) {
        this.logger.warning('⏸️ Testing stopped by user');
        break;
      }

      const model = models[i];
      const current = i + 1;
      const percentage = Math.round((current / total) * 100);

      this.logger.info(`📊 Testing model ${current}/${total}: ${model.name}`);

      if (onProgress) {
        onProgress({ current, total, percentage });
      }

      try {
        const result = await this.testModel(model);
        results.push(result);

        if (result.accessible) {
          this.logger.success(`✅ ${model.name}: Accessible (${result.responseTime}ms)`);
        } else {
          this.logger.warning(`⚠️ ${model.name}: ${result.error}`);
        }
      } catch (error: any) {
        this.logger.error(`❌ ${model.name}: ${error.message}`);
        results.push(this.createFailedResult(model, error));
      }

      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update results tracking
    this.updateResults(results);

    // Cache results if enabled
    if (this.config.useCache) {
      this.cacheResults(results);
    }

    this.logger.success(`✅ Testing complete! ${this.results.stats.accessible}/${total} models accessible`);
    
    return results;
  }

  /**
   * Test a single model
   */
  async testModel(model: ModelInfo): Promise<TestResult> {
    const stopTimer = PerformanceMonitor.start(`test_${model.name}`);

    try {
      await RateLimiter.waitIfNeeded();

      const response = await RetryHandler.retryWithRateLimit(async () => {
        const startTime = performance.now();
        
        const res = await fetch(
          `${CONFIG.GEMINI_API.baseUrl}models/${model.name}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Hello' }]
              }],
              generationConfig: {
                maxOutputTokens: 10,
                temperature: 0.1
              }
            }),
            signal: AbortSignal.timeout(this.config.timeout)
          }
        );

        const responseTime = Math.round(performance.now() - startTime);

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
          throw { status: res.status, message: error.error?.message || res.statusText };
        }

        const data = await res.json();
        return { data, responseTime };
      }, {
        maxRetries: 1, // Single retry for model tests
        shouldRetry: (error) => error.status >= 500 // Only retry server errors
      });

      RateLimiter.recordRequest();
      stopTimer();

      // Track token usage
      if (response.data.usageMetadata) {
        TokenUsageTracker.trackUsage({
          inputTokens: response.data.usageMetadata.promptTokenCount || 0,
          outputTokens: response.data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.data.usageMetadata.totalTokenCount || 0,
          timestamp: Date.now(),
          modelName: model.name
        });
      }

      return {
        ...model,
        accessible: true,
        responseTime: response.responseTime,
        error: null,
        workingVersion: model.name,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      stopTimer();
      return this.createFailedResult(model, error);
    }
  }

  /**
   * Create failed result
   */
  private createFailedResult(model: ModelInfo, error: any): TestResult {
    const errorInfo = ErrorHandler.parseError(error);
    const accessible = false;

    return {
      ...model,
      accessible,
      responseTime: null,
      error: errorInfo.message,
      workingVersion: null,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // RESULTS MANAGEMENT
  // ============================================================================

  /**
   * Update results tracking
   */
  private updateResults(results: TestResult[]): void {
    this.results.models.all = results;
    this.results.models.accessible = results.filter(r => r.accessible);
    this.results.models.restricted = results.filter(
      r => !r.accessible && r.error?.includes('403')
    );
    this.results.models.failed = results.filter(
      r => !r.accessible && !r.error?.includes('403')
    );

    this.results.stats.total = results.length;
    this.results.stats.accessible = this.results.models.accessible.length;
    this.results.stats.restricted = this.results.models.restricted.length;
    this.results.stats.failed = this.results.models.failed.length;

    const responseTimes = this.results.models.accessible
      .map(r => r.responseTime)
      .filter((t): t is number => t !== null);
    
    this.results.stats.avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
  }

  /**
   * Cache test results
   */
  private cacheResults(results: TestResult[]): void {
    try {
      const cachedModels = new Map<string, CachedModelInfo>();

      results.forEach(result => {
        cachedModels.set(result.name, {
          ...result,
          testedAt: new Date().toISOString()
        });
      });

      ModelCacheManager.setCache(this.config.apiKey, {
        models: cachedModels,
        timestamp: Date.now(),
        apiKeyHash: this.hashApiKey(this.config.apiKey)
      });

      this.logger.info('💾 Results cached successfully');
    } catch (error: any) {
      this.logger.warning(`⚠️ Failed to cache results: ${error.message}`);
    }
  }

  /**
   * Hash API key for cache identification
   */
  private hashApiKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Convert cached model to ModelInfo
   */
  private cachedToModelInfo(cached: CachedModelInfo): ModelInfo {
    return {
      name: cached.name,
      displayName: cached.displayName,
      family: cached.family,
      tier: cached.tier,
      accessible: cached.accessible,
      streaming: cached.streaming,
      multimodal: cached.multimodal,
      methods: cached.methods,
      inputTokenLimit: cached.inputTokenLimit,
      outputTokenLimit: cached.outputTokenLimit,
      capabilities: cached.capabilities
    };
  }

  // ============================================================================
  // RECOMMENDATIONS & CATEGORIZATION
  // ============================================================================

  /**
   * Generate model recommendations
   */
  generateRecommendations(results: TestResult[]): ModelRecommendations {
    const accessible = results.filter(r => r.accessible);

    // Find best for speed (fastest response time)
    const bestForSpeed = accessible
      .filter(r => r.responseTime !== null)
      .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0]?.name || '';

    // Find best for quality (latest pro model)
    const bestForQuality = accessible
      .filter(r => r.tier === 'pro')
      .sort((a, b) => ModelUtils.compareVersions(a.name, b.name))[0]?.name || '';

    // Find best for balance (latest flash model)
    const bestForBalance = accessible
      .filter(r => r.tier === 'flash' && !r.name.includes('lite'))
      .sort((a, b) => ModelUtils.compareVersions(a.name, b.name))[0]?.name || '';

    // Find latest model
    const bestForLatest = accessible
      .sort((a, b) => ModelUtils.compareVersions(a.name, b.name))[0]?.name || '';

    return {
      bestForSpeed,
      bestForQuality,
      bestForBalance,
      bestForLatest
    };
  }

  /**
   * Categorize models by family
   */
  categorizeModels(results: TestResult[]): ModelCategories {
    const categories: ModelCategories = {};

    results.forEach(result => {
      const family = result.family || 'other';
      if (!categories[family]) {
        categories[family] = [];
      }
      categories[family].push(result);
    });

    // Sort each category
    Object.keys(categories).forEach(family => {
      categories[family].sort((a, b) => ModelUtils.compareVersions(a.name, b.name));
    });

    return categories;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Stop current testing operation
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.logger.warning('⏸️ Test operation stopped');
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, any> {
    return PerformanceMonitor.export();
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    testing: boolean;
    cacheEnabled: boolean;
    rateLimit: any;
  } {
    return {
      initialized: true,
      testing: this.abortController !== null,
      cacheEnabled: this.config.useCache,
      rateLimit: RateLimiter.getStatus()
    };
  }
}
