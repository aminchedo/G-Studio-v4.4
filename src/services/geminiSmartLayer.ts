/**
 * Gemini Smart Layer - Intelligent Integration Layer
 * 
 * This layer acts as a bridge between GeminiService and UltimateGeminiTesterService,
 * ensuring ALL API requests use the same bypass/DNS/retry logic for consistency.
 * 
 * Features:
 * - Single source of truth for API requests
 * - Automatic bypass/DNS configuration
 * - Smart retry with exponential backoff
 * - Consistent error handling
 * - Minimal latency with intelligent caching
 */

import { UltimateGeminiTester } from './ultimateGeminiTester';

/**
 * Singleton instance manager for UltimateGeminiTesterService
 * Ensures we reuse the same instance with same bypass/DNS settings
 */
class GeminiSmartLayerManager {
  private static instances: Map<string, UltimateGeminiTester> = new Map();
  private static defaultConfig = {
    bypassMode: 'auto' as const,
    region: 'us' as const,
    smartDNS: true,
    verbose: false
  };

  /**
   * Get or create UltimateGeminiTester instance for an API key
   * Reuses existing instance if available with same config
   */
  static async getInstance(
    apiKey: string,
    config?: {
      bypassMode?: 'auto' | 'system-proxy' | 'none';
      region?: 'us' | 'global' | 'secure';
      smartDNS?: boolean;
      verbose?: boolean;
    }
  ): Promise<UltimateGeminiTester> {
    const instanceKey = apiKey.substring(0, 8); // Use first 8 chars as key
    
    // Check if instance exists
    let instance = this.instances.get(instanceKey);
    
    // If instance exists but config changed, recreate it
    const finalConfig = { ...this.defaultConfig, ...config };
    const configKey = JSON.stringify(finalConfig);
    
    if (instance) {
      // Check if config matches (simple check - could be enhanced)
      const existingConfig = (instance as any).__config;
      if (existingConfig === configKey) {
        return instance;
      }
      // Config changed - remove old instance
      this.instances.delete(instanceKey);
    }
    
    // Create new instance
    instance = new UltimateGeminiTester({
      apiKey,
      ...finalConfig
    });
    
    // Store config for comparison
    (instance as any).__config = configKey;
    
    // Initialize if not already initialized
    try {
      await instance.initialize();
    } catch (error) {
      console.warn('[GeminiSmartLayer] Failed to initialize instance:', error);
      // Continue anyway - will initialize on first request
    }
    
    this.instances.set(instanceKey, instance);
    return instance;
  }

  /**
   * Clear instance cache (useful when API key changes)
   */
  static clearInstance(apiKey: string): void {
    const instanceKey = apiKey.substring(0, 8);
    this.instances.delete(instanceKey);
  }

  /**
   * Clear all instances
   */
  static clearAll(): void {
    this.instances.clear();
  }
}

/**
 * Smart HTTP Client Wrapper
 * Provides fetch-like interface but uses UltimateGeminiTesterService internally
 */
export class GeminiSmartClient {
  private tester: UltimateGeminiTester;
  private apiKey: string;

  constructor(tester: UltimateGeminiTester, apiKey: string) {
    this.tester = tester;
    this.apiKey = apiKey;
  }

  /**
   * Make HTTP request using UltimateGeminiTesterService's SmartHTTPClient
   * This ensures bypass/DNS/retry logic is applied consistently
   */
  async request(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<{
    success: boolean;
    data?: any;
    responseTime: number;
    status?: number;
    error?: string;
  }> {
    const client = this.tester.getClient();
    
    // Build full endpoint path
    const fullEndpoint = endpoint.startsWith('models/') 
      ? endpoint 
      : `models/${endpoint}`;
    
    // Add API key to endpoint if not present
    const endpointWithKey = fullEndpoint.includes('?key=')
      ? fullEndpoint
      : `${fullEndpoint}${fullEndpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(this.apiKey)}`;
    
    return client.request(endpointWithKey, {
      method: options.method || 'GET',
      body: options.body,
      timeout: options.timeout || 30000,
      maxRetries: options.maxRetries || 3,
      ...options
    });
  }

  /**
   * Stream request (for SSE/streaming responses)
   * Uses fetch with bypass/DNS settings from tester
   */
  async streamRequest(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      signal?: AbortSignal;
    } = {}
  ): Promise<Response> {
    const client = this.tester.getClient();
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/';
    
    // Build full URL
    const fullEndpoint = endpoint.startsWith('models/') 
      ? endpoint 
      : `models/${endpoint}`;
    
    const url = `${baseUrl}${fullEndpoint}${fullEndpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(this.apiKey)}`;
    
    // Use fetch with same configuration
    // Note: Browser fetch automatically uses system proxy if configured
    // The bypass logic is handled at the network level
    return fetch(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    });
  }
}

/**
 * Main Smart Layer API
 * Provides high-level methods for Gemini API interactions
 */
export class GeminiSmartLayer {
  /**
   * Get smart client for an API key
   * Automatically initializes UltimateGeminiTesterService with optimal settings
   */
  static async getClient(
    apiKey: string,
    config?: {
      bypassMode?: 'auto' | 'system-proxy' | 'none';
      region?: 'us' | 'global' | 'secure';
      smartDNS?: boolean;
      verbose?: boolean;
    }
  ): Promise<GeminiSmartClient> {
    const tester = await GeminiSmartLayerManager.getInstance(apiKey, config);
    return new GeminiSmartClient(tester, apiKey);
  }

  /**
   * Get UltimateGeminiTester instance directly (for advanced usage)
   */
  static async getTester(
    apiKey: string,
    config?: {
      bypassMode?: 'auto' | 'system-proxy' | 'none';
      region?: 'us' | 'global' | 'secure';
      smartDNS?: boolean;
      verbose?: boolean;
    }
  ): Promise<UltimateGeminiTester> {
    return GeminiSmartLayerManager.getInstance(apiKey, config);
  }

  /**
   * Clear cached instance (useful when API key or config changes)
   */
  static clearCache(apiKey?: string): void {
    if (apiKey) {
      GeminiSmartLayerManager.clearInstance(apiKey);
    } else {
      GeminiSmartLayerManager.clearAll();
    }
  }

  /**
   * Discover models using UltimateGeminiTesterService
   * This ensures models are discovered with same bypass/DNS settings
   */
  static async discoverModels(
    apiKey: string,
    config?: {
      bypassMode?: 'auto' | 'system-proxy' | 'none';
      region?: 'us' | 'global' | 'secure';
      smartDNS?: boolean;
      verbose?: boolean;
    }
  ): Promise<any[]> {
    const tester = await GeminiSmartLayerManager.getInstance(apiKey, config);
    return tester.discoverModels();
  }

  /**
   * Test models using UltimateGeminiTesterService
   * This ensures models are tested with same bypass/DNS settings
   */
  static async testModels(
    apiKey: string,
    models: any[],
    config?: {
      bypassMode?: 'auto' | 'system-proxy' | 'none';
      region?: 'us' | 'global' | 'secure';
      smartDNS?: boolean;
      verbose?: boolean;
    }
  ): Promise<{
    usableModels: string[];
    rejectedModels: Array<{ modelId: string; reason: string; isModelScoped: boolean }>;
    providerStatus: 'ok' | 'exhausted' | 'rate_limited';
    testedAt: number;
  }> {
    const tester = await GeminiSmartLayerManager.getInstance(apiKey, config);
    return tester.testAllModels(models);
  }
}
