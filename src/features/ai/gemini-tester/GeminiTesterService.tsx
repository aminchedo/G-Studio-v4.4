/**
 * GeminiTesterService - Core Testing Logic
 * 
 * Service layer for model discovery, testing, and result aggregation
 */

import { CONFIG } from './GeminiTesterConfig';
import {
  ModelInfo,
  TestResult,
  TestProgress,
  ModelRecommendations,
  ModelCategories
} from './GeminiTesterTypes';
import {
  Logger,
  RobustAPIClient,
  ModelCacheManager,
  TokenUsageTracker,
  RateLimiter,
  GeographicalConstraintChecker,
  APIKeyValidator,
  ErrorCategorizer
} from './GeminiTesterUtils';

// ============================================================================
// MODEL TESTER SERVICE
// ============================================================================

export class ModelTesterService {
  private apiKey: string;
  private logger: Logger;
  private client: RobustAPIClient;
  private useCache: boolean;
  private regionInfo: { allowed: boolean; region: string; message: string } | null = null;
  
  public results: {
    timestamp: string;
    models: {
      total: number;
      discovered: ModelInfo[];
      accessible: TestResult[];
      restricted: TestResult[];
      failed: TestResult[];
    };
    performance: {
      totalTime: number;
      avgResponseTime: number;
      fastest: { name: string; responseTime: number } | null;
      slowest: { name: string; responseTime: number } | null;
      modelStats: { name: string; responseTime: number }[];
    };
    tokenUsage?: {
      totalInput: number;
      totalOutput: number;
      totalTokens: number;
      byModel: Record<string, { input: number; output: number; total: number }>;
    };
  };

  constructor(options: { apiKey: string; useCache?: boolean }, logger: Logger) {
    this.apiKey = options.apiKey;
    this.logger = logger;
    this.client = new RobustAPIClient(this.apiKey, logger);
    this.useCache = options.useCache !== false;
    
    this.results = {
      timestamp: new Date().toISOString(),
      models: {
        total: 0,
        discovered: [],
        accessible: [],
        restricted: [],
        failed: []
      },
      performance: {
        totalTime: 0,
        avgResponseTime: 0,
        fastest: null,
        slowest: null,
        modelStats: []
      },
      tokenUsage: {
        totalInput: 0,
        totalOutput: 0,
        totalTokens: 0,
        byModel: {}
      }
    };
  }

  /**
   * Initialize the service - validate API key and check constraints
   */
  async initialize(): Promise<boolean> {
    this.logger.info('🔧 Initializing service...');
    
    // Validate API key format
    if (!APIKeyValidator.isValidFormat(this.apiKey)) {
      throw new Error('Invalid API key format. Key should be at least 20 characters.');
    }
    
    // Validate API key with API
    this.logger.info('🔑 Validating API key...');
    const validation = await APIKeyValidator.validate(this.apiKey);
    
    if (!validation.valid) {
      const errorInfo = ErrorCategorizer.categorize({
        status: 401,
        message: validation.error || 'API key validation failed'
      });
      
      throw new Error(`${validation.error}\n\n💡 ${errorInfo.suggestion}`);
    }
    
    // Check geographical constraints
    if (CONFIG.GEOGRAPHICAL.checkRegionOnInit) {
      this.logger.info('🌍 Checking geographical constraints...');
      const regionInfo = await GeographicalConstraintChecker.checkRegion();
      
      if (!regionInfo.allowed) {
        this.logger.warning(`⚠️ ${regionInfo.message}`);
      } else {
        this.logger.success(`✅ Region: ${regionInfo.region}`);
      }
    }

    this.logger.success('✅ Service initialized successfully');
    return true;
  }

  /**
   * Discover available models from API
   */
  async discoverModels(): Promise<ModelInfo[]> {
    this.logger.info('🔍 Starting model discovery...');
    
    const allModels = new Map<string, ModelInfo>();
    
    // Known models list (comprehensive)
    const knownModels = this.getKnownModelsList();
    this.logger.info(`📋 Reference list: ${knownModels.length} known models`);
    
    // Check API endpoints
    const endpoints = [
      { url: 'models', version: 'v1', name: 'v1 (Stable)' },
      { url: 'models?pageSize=100', version: 'v1', name: 'v1 (Large Page)' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        this.logger.info(`  Checking ${endpoint.name}...`);
        const response = await this.client.request(endpoint.url);
        
        if (response.success && response.data?.models) {
          let found = 0;
          response.data.models.forEach((model: any) => {
            const hasGen = model.supportedGenerationMethods?.length > 0;
            if (hasGen) {
              const name = model.name.replace('models/', '').replace('tunedModels/', '');
              if (!allModels.has(name)) {
                const info = CONFIG.MODELS[name as keyof typeof CONFIG.MODELS] || {
                  family: this.getFamilyFromName(name),
                  tier: this.getTierFromName(name),
                  capabilities: ['text']
                };
                
                allModels.set(name, {
                  name,
                  displayName: model.displayName || name,
                  methods: model.supportedGenerationMethods || [],
                  inputTokenLimit: model.inputTokenLimit || 0,
                  outputTokenLimit: model.outputTokenLimit || 0,
                  ...info
                });
                found++;
              }
            }
          });
          
          if (found > 0) {
            this.logger.success(`  ✅ ${found} new models (Total: ${allModels.size})`);
          }
        }
      } catch (error: any) {
        const errorInfo = ErrorCategorizer.categorize(error);
        this.logger.debug(`  ⚠️ ${endpoint.name}: ${errorInfo.message}`);
      }
    }
    
    // Test known models directly
    this.logger.info('🔍 Testing known models directly...');
    const modelsToTest = knownModels.slice(0, 50); // Test first 50
    let knownFound = 0;
    
    for (const modelName of modelsToTest) {
      if (!allModels.has(modelName)) {
        try {
          const response = await this.client.request(`models/${modelName}`);
          if (response.success && response.data) {
            const model = response.data;
            const info = CONFIG.MODELS[modelName as keyof typeof CONFIG.MODELS] || {
              family: this.getFamilyFromName(modelName),
              tier: this.getTierFromName(modelName),
              capabilities: ['text']
            };
            
            allModels.set(modelName, {
              name: modelName,
              displayName: model.displayName || modelName,
              methods: model.supportedGenerationMethods || [],
              inputTokenLimit: model.inputTokenLimit || 0,
              outputTokenLimit: model.outputTokenLimit || 0,
              ...info
            });
            knownFound++;
          }
        } catch (error) {
          // Silently skip - model doesn't exist
        }
      }
    }
    
    if (knownFound > 0) {
      this.logger.success(`  ✅ ${knownFound} additional models found`);
    }
    
    const discovered = Array.from(allModels.values());
    this.results.models.discovered = discovered;
    this.results.models.total = discovered.length;
    
    this.logger.success(`✅ Discovery complete: ${discovered.length} models found`);
    return discovered;
  }

  /**
   * Test a single model
   */
  async testModel(model: ModelInfo): Promise<TestResult> {
    // Check cache first
    if (this.useCache) {
      const cached = ModelCacheManager.getCachedModel(this.apiKey, model.name);
      if (cached) {
        this.logger.debug(`📦 Using cached result for ${model.name}`);
        return cached as TestResult;
      }
    }
    
    // Check rate limit
    if (!RateLimiter.canMakeRequest()) {
      this.logger.warning(`⏳ Rate limit reached, waiting...`);
      await this.sleep(1000);
    }
    
    const startTime = Date.now();
    
    try {
      // Test basic generation
      const response = await this.client.request(`models/${model.name}:generateContent`, {
        method: 'POST',
        body: {
          contents: [{ parts: [{ text: 'Hello' }] }]
        }
      });
      
      RateLimiter.recordRequest();
      const responseTime = Date.now() - startTime;
      
      if (response.success) {
        // Track token usage
        const usage = response.data?.usageMetadata;
        if (usage) {
          TokenUsageTracker.recordUsage(
            model.name,
            usage.promptTokenCount || 0,
            usage.candidatesTokenCount || 0
          );
        }
        
        const result: TestResult = {
          name: model.name,
          accessible: true,
          streaming: model.methods?.includes('streamGenerateContent') || false,
          multimodal: model.capabilities?.includes('image') || false,
          responseTime,
          error: null,
          workingVersion: 'v1',
          family: model.family,
          tier: model.tier,
          methods: model.methods,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit,
          capabilities: model.capabilities,
          timestamp: new Date().toISOString()
        };
        
        // Cache result
        if (this.useCache) {
          ModelCacheManager.addToCache(model.name, result);
        }
        
        return result;
      } else {
        return {
          name: model.name,
          accessible: false,
          streaming: false,
          multimodal: false,
          responseTime: null,
          error: response.error || 'Unknown error',
          workingVersion: null,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error: any) {
      const errorInfo = ErrorCategorizer.categorize(error);
      return {
        name: model.name,
        accessible: false,
        streaming: false,
        multimodal: false,
        responseTime: null,
        error: errorInfo.message,
        workingVersion: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test all models with progress tracking
   */
  async testAllModels(
    models: ModelInfo[],
    onProgress?: (progress: TestProgress) => void,
    shouldStop?: () => boolean
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const total = models.length;
    
    this.logger.info(`🧪 Testing ${total} models...`);
    
    for (let i = 0; i < total; i++) {
      if (shouldStop && shouldStop()) {
        this.logger.warning('⏹️ Testing stopped by user');
        break;
      }
      
      const model = models[i];
      this.logger.info(`  [${i + 1}/${total}] Testing ${model.name}...`);
      
      const result = await this.testModel(model);
      results.push(result);
      
      // Update progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100)
        });
      }
      
      // Categorize result
      if (result.accessible) {
        this.results.models.accessible.push(result);
        this.logger.success(`    ✅ Accessible (${result.responseTime}ms)`);
      } else if (result.error?.includes('403') || result.error?.includes('restricted')) {
        this.results.models.restricted.push(result);
        this.logger.warning(`    ⚠️ Restricted`);
      } else {
        this.results.models.failed.push(result);
        this.logger.error(`    ❌ Failed: ${result.error}`);
      }
      
      // Small delay to avoid rate limiting
      await this.sleep(100);
    }
    
    // Calculate performance stats
    this.calculatePerformanceStats(results);
    
    this.logger.success(`✅ Testing complete: ${this.results.models.accessible.length}/${total} accessible`);
    return results;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(results: TestResult[]): ModelRecommendations {
    const accessible = results.filter(r => r.accessible);
    
    const recommendations: ModelRecommendations = {
      bestForSpeed: '',
      bestForQuality: '',
      bestForBalance: '',
      bestForLatest: ''
    };
    
    // Best for speed (fastest response time)
    const fastest = accessible
      .filter(r => r.responseTime !== null)
      .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0];
    if (fastest) recommendations.bestForSpeed = fastest.name;
    
    // Best for quality (pro models)
    const proModels = accessible.filter(r => r.tier === 'pro');
    if (proModels.length > 0) {
      recommendations.bestForQuality = proModels[0].name;
    }
    
    // Best for balance (flash models)
    const flashModels = accessible.filter(r => r.tier === 'flash');
    if (flashModels.length > 0) {
      recommendations.bestForBalance = flashModels[0].name;
    }
    
    // Best for latest (highest version number)
    const latest = accessible.sort((a, b) => {
      const aVer = parseFloat(a.family || '0');
      const bVer = parseFloat(b.family || '0');
      return bVer - aVer;
    })[0];
    if (latest) recommendations.bestForLatest = latest.name;
    
    return recommendations;
  }

  /**
   * Categorize models by family and tier
   */
  categorizeModels(results: TestResult[]): ModelCategories {
    const categories: ModelCategories = {};
    
    results.forEach(result => {
      const category = result.family || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });
    
    return categories;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculatePerformanceStats(results: TestResult[]) {
    const accessible = results.filter(r => r.accessible && r.responseTime !== null);
    
    if (accessible.length === 0) return;
    
    const responseTimes = accessible.map(r => r.responseTime!);
    const totalTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const avgResponseTime = totalTime / accessible.length;
    
    const fastest = accessible.reduce((min, r) => 
      (r.responseTime! < min.responseTime!) ? r : min
    );
    
    const slowest = accessible.reduce((max, r) => 
      (r.responseTime! > max.responseTime!) ? r : max
    );
    
    this.results.performance = {
      totalTime,
      avgResponseTime,
      fastest: { name: fastest.name, responseTime: fastest.responseTime! },
      slowest: { name: slowest.name, responseTime: slowest.responseTime! },
      modelStats: accessible.map(r => ({ name: r.name, responseTime: r.responseTime! }))
    };
  }

  private getFamilyFromName(name: string): string {
    if (name.includes('gemini-3')) return '3.0';
    if (name.includes('gemini-2.5')) return '2.5';
    if (name.includes('gemini-2.0') || name.includes('gemini-2-')) return '2.0';
    if (name.includes('gemini-1.5')) return '1.5';
    if (name.includes('gemini-1.0') || name.includes('gemini-pro')) return '1.0';
    if (name.includes('gemma-3')) return 'gemma-3';
    if (name.includes('gemma-2')) return 'gemma-2';
    if (name.includes('gemma-1')) return 'gemma-1';
    return 'unknown';
  }

  private getTierFromName(name: string): string {
    if (name.includes('pro')) return 'pro';
    if (name.includes('flash')) return 'flash';
    if (name.includes('lite')) return 'lite';
    if (name.includes('ultra')) return 'ultra';
    if (name.includes('nano')) return 'nano';
    return 'standard';
  }

  private getKnownModelsList(): string[] {
    return [
      // Gemini 3
      'gemini-3-pro', 'gemini-3-flash', 'gemini-3-pro-preview', 'gemini-3-flash-preview',
      // Gemini 2.5
      'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
      // Gemini 2.0
      'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-exp',
      // Gemini 1.5
      'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b',
      // Gemini 1.0
      'gemini-pro', 'gemini-pro-vision', 'gemini-1.0-pro',
      // Gemma 3
      'gemma-3-1b-it', 'gemma-3-4b-it', 'gemma-3-12b-it', 'gemma-3-27b-it',
      // Gemma 2
      'gemma-2-27b-it', 'gemma-2-9b-it', 'gemma-2-2b-it',
      // Special
      'gemini-robotics-er-1.5-preview', 'gemini-flash-latest', 'gemini-pro-latest'
    ];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
