import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Terminal, Settings, Database, Key, Globe, Play, CheckCircle2, AlertCircle, Clock, Download, Loader2, Sparkles, FlaskConical, Activity, Zap, Square, TrendingUp, BarChart3, RefreshCw, Copy, Filter, Server, FileText, RotateCw, Save, Rocket, Repeat, Eye, EyeOff, Network, Code, Brain, Layers, GitBranch } from 'lucide-react';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  GEMINI_API: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    rateLimit: 60, // requests per minute
    rateLimitWindow: 60000, // 1 minute in ms
    tokenLimit: {
      input: 2000000, // 2M tokens default
      output: 8192 // 8K tokens default
    }
  },
  MODELS: {
    'gemini-3-pro': { family: '3.0', tier: 'pro', capabilities: ['text', 'image', 'video', 'audio', 'streaming'] },
    'gemini-3-flash': { family: '3.0', tier: 'flash', capabilities: ['text', 'image', 'streaming'] },
    'gemini-2.5-pro': { family: '2.5', tier: 'pro', capabilities: ['text', 'image', 'video', 'audio', 'streaming'] },
    'gemini-2.5-flash': { family: '2.5', tier: 'flash', capabilities: ['text', 'image', 'streaming'] },
    'gemini-2.5-flash-lite': { family: '2.5', tier: 'lite', capabilities: ['text', 'image', 'streaming'] },
    'gemini-2.0-flash': { family: '2.0', tier: 'flash', capabilities: ['text', 'image', 'streaming'] },
    'gemini-2.0-flash-lite': { family: '2.0', tier: 'lite', capabilities: ['text', 'streaming'] }
  },
  RECOMMENDATIONS: {
    bestForSpeed: 'gemini-2.5-flash-lite',
    bestForQuality: 'gemini-3-pro-preview',
    bestForBalance: 'gemini-2.5-flash',
    bestForLatest: 'gemini-3-flash-preview',
    bestForRobotics: 'gemini-robotics-er-1.5-preview',
    bestForSmall: 'gemma-3-1b-it',
    bestForLarge: 'gemma-3-27b-it'
  },
  CACHE: {
    modelInfoTTL: 24 * 60 * 60 * 1000, // 24 hours
    testResultsTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    storageKey: 'gemini_model_cache_v2'
  },
  GEOGRAPHICAL: {
    // Regions where Gemini API is available
    allowedRegions: ['US', 'EU', 'ASIA', 'GLOBAL'],
    // Regions with restrictions (can be expanded)
    restrictedRegions: [],
    // Check region via API
    checkRegionOnInit: true
  }
};

// ============================================================================
// ROBUST API CLIENT - With Automatic Retry and Error Recovery
// ============================================================================

class RobustAPIClient {
  apiKey: string;
  logger: Logger | null;
  stats: {
    total: number;
    success: number;
    failed: number;
    retries: number;
  };

  constructor(apiKey: string, logger: Logger | null = null) {
    this.apiKey = apiKey;
    this.logger = logger;
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retries: 0
    };
  }

  async request(endpoint: string, options: { maxRetries?: number; timeout?: number; method?: string; headers?: Record<string, string>; body?: any } = {}) {
    const maxRetries = options.maxRetries || CONFIG.GEMINI_API.maxRetries;
    const timeout = options.timeout || CONFIG.GEMINI_API.timeout;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.makeRequest(endpoint, options, timeout);
        const responseTime = Date.now() - startTime;

        this.stats.total++;
        this.stats.success++;

        return {
          success: true,
          data: result,
          responseTime,
          attempt
        };
      } catch (error: any) {
        lastError = error;
        this.stats.total++;
        
        // Use ErrorCategorizer for better error messages
        const errorInfo = ErrorCategorizer.categorize(error);
        
        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403 || errorInfo.category === 'authentication') {
          this.stats.failed++;
          return {
            success: false,
            error: errorInfo.message,
            status: error.status || (errorInfo.type === 'unauthorized' ? 401 : 403),
            retryable: false,
            errorInfo: errorInfo
          };
        }

        // Retry on network/server errors
        if (attempt < maxRetries) {
          const delay = CONFIG.GEMINI_API.exponentialBackoff
            ? CONFIG.GEMINI_API.retryDelay * Math.pow(2, attempt - 1)
            : CONFIG.GEMINI_API.retryDelay;
          
          this.stats.retries++;
          this.logger?.debug(`Retry ${attempt}/${maxRetries} after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        this.stats.failed++;
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
      status: lastError?.status || 0,
      retryable: true
    };
  }

  async makeRequest(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any }, timeout: number) {
    const url = `${CONFIG.GEMINI_API.baseUrl}${endpoint}?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: Error & { status?: number } = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const timeoutError: Error & { status?: number } = new Error('Request timeout');
        timeoutError.status = 0;
        throw timeoutError;
      }
      throw error;
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.total > 0 ? (this.stats.success / this.stats.total) * 100 : 0
    };
  }

  getErrorSummary() {
    return {
      total: this.stats.total,
      success: this.stats.success,
      failed: this.stats.failed,
      retries: this.stats.retries,
      successRate: this.stats.total > 0 ? (this.stats.success / this.stats.total) * 100 : 0
    };
  }
}

// ============================================================================
// MODEL CACHE MANAGER - Persist Model Information
// ============================================================================

interface CachedModelInfo {
  name: string;
  accessible: boolean;
  streaming: boolean;
  multimodal: boolean;
  responseTime: number | null;
  error: string | null;
  workingVersion: string | null;
  testedAt: string;
  family?: string;
  tier?: string;
  methods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  capabilities?: string[];
}

interface ModelCache {
  models: Map<string, CachedModelInfo>;
  timestamp: number;
  apiKeyHash: string;
}

class ModelCacheManager {
  private static cache: ModelCache | null = null;
  private static inMemoryCache = new Map<string, { data: any; timestamp: number }>();

  static getCacheKey(apiKey: string): string {
    // Create a simple hash of the API key for cache identification
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `api_${Math.abs(hash)}`;
  }

  /**
   * Get model data from in-memory cache (faster than localStorage)
   * Matches the pattern from geminiService.ts
   */
  static getFromCache(modelId: string): any {
    const cached = this.inMemoryCache.get(modelId);
    if (!cached) return null;
    
    // Check if cache is still valid (24 hours)
    const now = Date.now();
    if (now - cached.timestamp > CONFIG.CACHE.modelInfoTTL) {
      this.inMemoryCache.delete(modelId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Add model data to in-memory cache
   * Matches the pattern from geminiService.ts
   */
  static addToCache(modelId: string, data: any) {
    this.inMemoryCache.set(modelId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear in-memory cache
   */
  static clearInMemoryCache() {
    this.inMemoryCache.clear();
  }

  static loadCache(apiKey: string): ModelCache | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cacheKey = this.getCacheKey(apiKey);
      const stored = localStorage.getItem(`${CONFIG.CACHE.storageKey}_${cacheKey}`);
      
      if (!stored) return null;
      
      const cache: ModelCache = JSON.parse(stored);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - cache.timestamp > CONFIG.CACHE.modelInfoTTL) {
        this.clearCache(apiKey);
        return null;
      }
      
      // Restore Map from array
      cache.models = new Map(Object.entries(cache.models as any));
      
      this.cache = cache;
      return cache;
    } catch (error) {
      console.error('Failed to load model cache:', error);
      return null;
    }
  }

  static saveCache(apiKey: string, models: Map<string, CachedModelInfo>) {
    try {
      if (typeof window === 'undefined') return;
      
      const cacheKey = this.getCacheKey(apiKey);
      const cache: ModelCache = {
        models: models,
        timestamp: Date.now(),
        apiKeyHash: cacheKey
      };
      
      // Convert Map to object for JSON serialization
      const modelsObj: Record<string, CachedModelInfo> = {};
      models.forEach((value, key) => {
        modelsObj[key] = value;
      });
      
      const cacheData = {
        ...cache,
        models: modelsObj
      };
      
      localStorage.setItem(`${CONFIG.CACHE.storageKey}_${cacheKey}`, JSON.stringify(cacheData));
      this.cache = cache;
    } catch (error) {
      console.error('Failed to save model cache:', error);
    }
  }

  static getCachedModel(apiKey: string, modelName: string): CachedModelInfo | null {
    const cache = this.loadCache(apiKey);
    if (!cache) return null;
    
    const model = cache.models.get(modelName);
    if (!model) return null;
    
    // Check if cached model info is still valid (within TTL)
    const now = Date.now();
    const testedAt = new Date(model.testedAt).getTime();
    if (now - testedAt > CONFIG.CACHE.modelInfoTTL) {
      return null; // Cache expired
    }
    
    return model;
  }

  static clearCache(apiKey: string) {
    try {
      if (typeof window === 'undefined') return;
      const cacheKey = this.getCacheKey(apiKey);
      localStorage.removeItem(`${CONFIG.CACHE.storageKey}_${cacheKey}`);
      this.cache = null;
    } catch (error) {
      console.error('Failed to clear model cache:', error);
    }
  }

  static hasCache(apiKey: string): boolean {
    const cache = this.loadCache(apiKey);
    return cache !== null && cache.models.size > 0;
  }
}

// ============================================================================
// TOKEN USAGE TRACKER
// ============================================================================

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: number;
  modelName: string;
}

class TokenUsageTracker {
  private static usageHistory: TokenUsage[] = [];
  private static currentUsage: { input: number; output: number; total: number } = { input: 0, output: 0, total: 0 };

  static recordUsage(modelName: string, inputTokens: number, outputTokens: number) {
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      timestamp: Date.now(),
      modelName
    };
    
    this.usageHistory.push(usage);
    this.currentUsage.input += inputTokens;
    this.currentUsage.output += outputTokens;
    this.currentUsage.total += (inputTokens + outputTokens);
    
    // Keep only last 1000 records
    if (this.usageHistory.length > 1000) {
      this.usageHistory.shift();
    }
  }

  static getCurrentUsage() {
    return { ...this.currentUsage };
  }

  static getUsageForModel(modelName: string): TokenUsage[] {
    return this.usageHistory.filter(u => u.modelName === modelName);
  }

  /**
   * Get usage report as formatted string
   * Matches the example pattern provided
   */
  static getUsageReport(): string {
    return `Input Tokens: ${this.currentUsage.input.toLocaleString()}, Output Tokens: ${this.currentUsage.output.toLocaleString()}, Total: ${this.currentUsage.total.toLocaleString()}`;
  }

  /**
   * Track tokens (simplified interface matching the example)
   */
  static trackTokens(input: number, output: number) {
    this.recordUsage('unknown', input, output);
  }

  static checkLimit(modelName: string, inputTokens: number, outputTokens: number): {
    withinLimit: boolean;
    warning: string | null;
    inputLimit: number;
    outputLimit: number;
  } {
    const modelConfig = CONFIG.MODELS[modelName as keyof typeof CONFIG.MODELS];
    const inputLimit = modelConfig?.inputTokenLimit || CONFIG.GEMINI_API.tokenLimit.input;
    const outputLimit = modelConfig?.outputTokenLimit || CONFIG.GEMINI_API.tokenLimit.output;
    
    const inputUsage = this.currentUsage.input + inputTokens;
    const outputUsage = this.currentUsage.output + outputTokens;
    
    let warning: string | null = null;
    
    if (inputUsage > inputLimit * 0.9) {
      warning = `Input token usage is at ${Math.round((inputUsage / inputLimit) * 100)}% of limit`;
    }
    
    if (outputUsage > outputLimit * 0.9) {
      warning = `Output token usage is at ${Math.round((outputUsage / outputLimit) * 100)}% of limit`;
    }
    
    return {
      withinLimit: inputUsage <= inputLimit && outputUsage <= outputLimit,
      warning,
      inputLimit,
      outputLimit
    };
  }

  static reset() {
    this.usageHistory = [];
    this.currentUsage = { input: 0, output: 0, total: 0 };
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private static requestHistory: number[] = [];
  private static requestsMade = 0;
  private static lastRequestTime = Date.now();
  private static readonly maxRequests = CONFIG.GEMINI_API.rateLimit;
  private static readonly windowMs = CONFIG.GEMINI_API.rateLimitWindow;

  static canMakeRequest(): boolean {
    const now = Date.now();
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.windowMs) {
      this.requestsMade = 0;
      this.lastRequestTime = now;
    }
    
    // Remove old requests from history
    this.requestHistory = this.requestHistory.filter(timestamp => now - timestamp < this.windowMs);
    
    return this.requestsMade < this.maxRequests && this.requestHistory.length < this.maxRequests;
  }

  static recordRequest() {
    const now = Date.now();
    this.requestHistory.push(now);
    this.requestsMade++;
    this.lastRequestTime = now;
  }

  /**
   * Handle rate limiting with automatic wait
   * Matches the example pattern provided
   */
  static async handleRateLimiting(): Promise<void> {
    if (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      // Reset after waiting
      const now = Date.now();
      if (now - this.lastRequestTime > this.windowMs) {
        this.requestsMade = 0;
        this.lastRequestTime = now;
      }
    }
    this.recordRequest();
  }

  static getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    
    const now = Date.now();
    const oldestRequest = Math.min(...this.requestHistory);
    const waitTime = this.windowMs - (now - oldestRequest);
    
    return Math.max(0, waitTime);
  }

  static getRemainingRequests(): number {
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.maxRequests - this.requestHistory.length);
  }
}

// ============================================================================
// GEOGRAPHICAL CONSTRAINT CHECKER
// ============================================================================

class GeographicalConstraintChecker {
  private static cachedRegion: string | null = null;
  private static regionCheckTime: number = 0;
  private static readonly REGION_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Check if a region is allowed
   * Matches the example pattern provided
   */
  static async checkRegion(region: string): Promise<boolean> {
    const allowedRegions = CONFIG.GEOGRAPHICAL.allowedRegions;
    return allowedRegions.includes(region) || region === 'GLOBAL';
  }

  /**
   * Check region for API key (full implementation)
   */
  static async checkRegionForApiKey(apiKey: string): Promise<{ allowed: boolean; region: string; message: string }> {
    // Check cache first
    const now = Date.now();
    if (this.cachedRegion && (now - this.regionCheckTime) < this.REGION_CACHE_TTL) {
      return {
        allowed: CONFIG.GEOGRAPHICAL.allowedRegions.includes(this.cachedRegion) || this.cachedRegion === 'GLOBAL',
        region: this.cachedRegion,
        message: this.cachedRegion === 'GLOBAL' ? 'Global access' : `Region: ${this.cachedRegion}`
      };
    }

    try {
      // Try to detect region via a lightweight API call
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        // If API call succeeds, region is likely allowed
        // Try to detect region from response headers or use default
        const region = response.headers.get('x-goog-region') || 'GLOBAL';
        this.cachedRegion = region;
        this.regionCheckTime = now;
        
        return {
          allowed: CONFIG.GEOGRAPHICAL.allowedRegions.includes(region) || region === 'GLOBAL',
          region,
          message: region === 'GLOBAL' ? 'Global access detected' : `Region detected: ${region}`
        };
      } else if (response.status === 403) {
        // 403 might indicate geographical restriction
        return {
          allowed: false,
          region: 'UNKNOWN',
          message: 'Access denied. This may be due to geographical restrictions.'
        };
      }
    } catch (error) {
      // Network error - assume allowed but log warning
      console.warn('Could not verify region, assuming allowed:', error);
    }

    // Default: assume allowed
    this.cachedRegion = 'GLOBAL';
    this.regionCheckTime = now;
    return {
      allowed: true,
      region: 'GLOBAL',
      message: 'Region check unavailable, assuming global access'
    };
  }

  static isValidRegion(region: string): boolean {
    return CONFIG.GEOGRAPHICAL.allowedRegions.includes(region) || region === 'GLOBAL';
  }
}

// ============================================================================
// API KEY VALIDATOR
// ============================================================================

class APIKeyValidator {
  // For demonstration - in production, this would be managed server-side
  private static validKeys: string[] = [];

  /**
   * Check if API key is valid (simple format check)
   * Matches the example pattern provided
   */
  static isValid(apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;
    if (!apiKey.startsWith('AIza')) return false;
    if (apiKey.length < 30) return false;
    // In production, you might check against a list of valid keys
    // For now, we do format validation only
    return true;
  }

  static validateFormat(apiKey: string): { valid: boolean; error: string | null } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    if (!apiKey.startsWith('AIza')) {
      return { valid: false, error: 'API key must start with "AIza"' };
    }

    if (apiKey.length < 30) {
      return { valid: false, error: 'API key appears to be too short' };
    }

    return { valid: true, error: null };
  }

  static async validateWithAPI(apiKey: string): Promise<{ valid: boolean; error: string | null; details?: any }> {
    const formatCheck = this.validateFormat(apiKey);
    if (!formatCheck.valid) {
      return formatCheck;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Referer': 'https://ai.google.dev/',
          'Origin': 'https://ai.google.dev'
        }
      });

      if (response.ok) {
        return { valid: true, error: null };
      } else if (response.status === 401) {
        return { valid: false, error: 'Invalid API key. Please check your credentials.' };
      } else if (response.status === 403) {
        return { 
          valid: false, 
          error: 'API key access denied. Check permissions and billing status.',
          details: { status: 403 }
        };
      } else {
        return { 
          valid: false, 
          error: `API validation failed with status ${response.status}`,
          details: { status: response.status }
        };
      }
    } catch (error: any) {
      const errorInfo = ErrorCategorizer.categorize(error);
      return { 
        valid: false, 
        error: errorInfo.message || 'Failed to validate API key',
        details: errorInfo
      };
    }
  }
}

// ============================================================================
// ERROR CATEGORIZER - Enhanced Error Handling
// ============================================================================

class ErrorCategorizer {
  static categorize(error: any) {
    const msg = error?.message || String(error);
    const status = error?.status || error?.response?.status;
    
    // DNS/Network Errors
    if (msg.includes('network') || msg.includes('ECONN') || msg.includes('ENOTFOUND') || 
        msg.includes('timeout') || error.name === 'AbortError' || msg.includes('fetch')) {
      return {
        category: 'network',
        type: 'dns_network_error',
        severity: 'high',
        retryable: true,
        action: 'retry_with_backoff',
        message: 'Network or DNS resolution error. Check internet connection.',
        suggestedFix: 'Verify internet connection, try different DNS server, or check proxy settings.'
      };
    }

    // Rate Limiting Errors
    if (status === 429 || msg.includes('429') || msg.includes('rate limit') || 
        msg.includes('quota') || msg.includes('exceeded')) {
      return {
        category: 'rate_limit',
        type: 'rate_limit_exceeded',
        severity: 'medium',
        retryable: true,
        action: 'retry_with_exponential_backoff',
        message: 'Rate limit exceeded. Too many requests.',
        suggestedFix: 'Wait before retrying, use API key rotation, or reduce request frequency.'
      };
    }

    // Authentication Errors
    if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403') ||
        msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('permission')) {
      return {
        category: 'authentication',
        type: status === 401 ? 'unauthorized' : 'forbidden',
        severity: 'critical',
        retryable: false,
        action: 'check_credentials',
        message: status === 401 ? 'Unauthorized. Invalid API key.' : 'Forbidden. Check API key permissions.',
        suggestedFix: 'Verify API key is correct and has proper permissions/billing enabled.'
      };
    }

    // Server Errors
    if (status >= 500 || msg.includes('500') || msg.includes('502') || msg.includes('503') || 
        msg.includes('504') || msg.includes('server error')) {
      return {
        category: 'server',
        type: 'server_error',
        severity: 'medium',
        retryable: true,
        action: 'retry_with_backoff',
        message: 'Server error. API service temporarily unavailable.',
        suggestedFix: 'Retry after a short delay. This is usually temporary.'
      };
    }

    // Not Found Errors
    if (status === 404 || msg.includes('404') || msg.includes('not found')) {
      return {
        category: 'not_found',
        type: 'resource_not_found',
        severity: 'low',
        retryable: false,
        action: 'check_endpoint',
        message: 'Resource not found. Invalid endpoint or model.',
        suggestedFix: 'Verify the endpoint URL and model name are correct.'
      };
    }

    // Bad Request Errors
    if (status === 400 || msg.includes('400') || msg.includes('bad request') || 
        msg.includes('invalid')) {
      return {
        category: 'client_error',
        type: 'bad_request',
        severity: 'medium',
        retryable: false,
        action: 'check_request',
        message: 'Bad request. Invalid request parameters.',
        suggestedFix: 'Check request body, parameters, and format.'
      };
    }

    // Unknown/Generic Errors
    return {
      category: 'unknown',
      type: 'unknown_error',
      severity: 'low',
      retryable: true,
      action: 'retry_with_backoff',
      message: msg.substring(0, 100),
      suggestedFix: 'Check error details and try again.'
    };
  }

  static getRetryDelay(category: string, attempt: number, baseDelay = 1000) {
    if (category === 'rate_limit') {
      // Exponential backoff for rate limits
      return Math.min(baseDelay * Math.pow(2, attempt), 60000); // Max 60 seconds
    }
    
    if (category === 'network' || category === 'server') {
      // Exponential backoff for network/server errors
      return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    }
    
    // Linear backoff for other retryable errors
    return baseDelay * (attempt + 1);
  }
}

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  addLogCallback: ((type: string, message: string, data?: any) => void) | null;

  constructor(addLogCallback: ((type: string, message: string, data?: any) => void) | null = null) {
    this.addLogCallback = addLogCallback;
  }

  log(level: string, message: string, data: any = null) {
    if (this.addLogCallback) {
      this.addLogCallback(level, message, data);
    }
    console.log(`[${level}] ${message}`, data || '');
  }

  info(msg: string, data?: any) { this.log('info', msg, data); }
  success(msg: string, data?: any) { this.log('success', msg, data); }
  warning(msg: string, data?: any) { this.log('warning', msg, data); }
  error(msg: string, data?: any) { this.log('error', msg, data); }
  debug(msg: string, data?: any) { this.log('debug', msg, data); }
  test(msg: string, data?: any) { this.log('test', msg, data); }
}

// ============================================================================
// MODEL TESTER SERVICE
// ============================================================================

interface ModelInfo {
  name: string;
  displayName?: string;
  description?: string;
  methods?: string[];
  version?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  family?: string;
  tier?: string;
  capabilities?: string[];
}

interface TestResult {
  name: string;
  accessible: boolean;
  streaming: boolean;
  multimodal: boolean;
  responseTime: number | null;
  error: string | null;
  workingVersion: string | null;
  testedAt: string;
  family?: string;
  tier?: string;
  methods?: string[];
}

class ModelTesterService {
  apiKey: string;
  logger: Logger;
  client: RobustAPIClient;
  results: {
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
  private useCache: boolean;
  private regionInfo: { allowed: boolean; region: string; message: string } | null = null;

  constructor(options: { apiKey: string; apiKeys?: string[]; useCache?: boolean }, logger: Logger) {
    this.apiKey = options.apiKey;
    this.logger = logger;
    this.client = new RobustAPIClient(this.apiKey, logger);
    this.useCache = options.useCache !== false; // Default to true
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

  async initialize() {
    this.logger.info('🔧 Initializing service...');
    
    // Step 1: Validate API key format
    const formatValidation = APIKeyValidator.validateFormat(this.apiKey);
    if (!formatValidation.valid) {
      throw new Error(`Invalid API key format: ${formatValidation.error}`);
    }
    
    // Step 2: Validate API key with API
    this.logger.info('🔑 Validating API key...');
    const apiValidation = await APIKeyValidator.validateWithAPI(this.apiKey);
    if (!apiValidation.valid) {
      const errorInfo = apiValidation.details || ErrorCategorizer.categorize({
        status: 401,
        message: apiValidation.error || 'API key validation failed'
      });
      
      if (errorInfo.category === 'authentication') {
        const detailedError = new Error(
          `${apiValidation.error}\n\n💡 ${errorInfo.suggestedFix || 'Check your API key and billing status'}\n\n` +
          `Common causes:\n` +
          `• API key is invalid or expired\n` +
          `• Billing is not enabled for your Google Cloud project\n` +
          `• API key doesn't have Generative Language API enabled\n` +
          `• API key restrictions are blocking the request\n\n` +
          `To fix:\n` +
          `1. Go to https://console.cloud.google.com/apis/credentials\n` +
          `2. Verify your API key is active and has Generative Language API enabled\n` +
          `3. Ensure billing is enabled for your project\n` +
          `4. Check API key restrictions (IP, referrer, etc.)`
        );
        throw detailedError;
      }
      
      throw new Error(`${apiValidation.error}\n\n💡 ${errorInfo.suggestedFix || 'Please check your API key'}`);
    }
    
    // Step 3: Check geographical constraints
    if (CONFIG.GEOGRAPHICAL.checkRegionOnInit) {
      this.logger.info('🌍 Checking geographical constraints...');
      this.regionInfo = await GeographicalConstraintChecker.checkRegionForApiKey(this.apiKey);
      
      if (!this.regionInfo.allowed) {
        this.logger.warning(`⚠️ ${this.regionInfo.message}`);
        // Don't throw error, just warn - some regions might still work
      } else {
        this.logger.success(`✅ ${this.regionInfo.message}`);
      }
    }
    
    // Step 4: Validate API connection
    const validation = await this.client.request('models', { maxRetries: 2 });
    
    if (!validation.success) {
      const errorInfo = (validation as any).errorInfo || ErrorCategorizer.categorize({
        status: validation.status,
        message: validation.error || 'API connection failed'
      });
      
      throw new Error(`${errorInfo.message}\n\n💡 ${errorInfo.suggestedFix}`);
    }

    this.logger.success('✅ Service initialized successfully');
    return true;
  }

  async discoverModels() {
    this.logger.info('🔍 Starting comprehensive model discovery with advanced algorithms...');
    
    const allModels = new Map(); // Use Map to avoid duplicates
    const allModelsArray = [];
    
    // ═══════════════════════════════════════════════════════════════
    // Step 1: Start with known models (comprehensive list from main.js)
    // ═══════════════════════════════════════════════════════════════
    const knownModels = [
      // Gemini 3
      'gemini-3-pro', 'gemini-3-flash', 'gemini-3-pro-preview', 'gemini-3-flash-preview',
      'gemini-3-pro-exp', 'gemini-3-flash-exp', 'gemini-3-ultra', 'gemini-3-nano',
      'gemini-3-pro-image-preview', 'gemini-3-flash-image-preview',
      
      // Gemini 2.5
      'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
      'gemini-2.5-pro-preview', 'gemini-2.5-flash-preview',
      'gemini-2.5-flash-preview-09-2025', 'gemini-2.5-flash-lite-preview-09-2025',
      'gemini-2.5-flash-native-audio', 'gemini-2.5-pro-exp', 'gemini-2.5-ultra',
      'gemini-2.5-pro-latest', 'gemini-2.5-flash-latest', 'gemini-2.5-flash-image',
      'gemini-2.5-flash-image-preview', 'gemini-2.5-pro-preview-tts',
      'gemini-2.5-computer-use-preview-10-2025',
      
      // Gemini 2.0
      'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-exp',
      'gemini-2.0-flash-thinking-exp', 'gemini-2.0-pro-exp', 'gemini-2.0-ultra',
      'gemini-2.0-pro-preview', 'gemini-2.0-flash-preview',
      'gemini-2.0-flash-001', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001',
      'gemini-2.0-flash-lite-preview', 'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-flash-exp-image-generation',
      
      // Gemini 1.5
      'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b',
      'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest',
      'gemini-1.5-pro-002', 'gemini-1.5-flash-002', 'gemini-1.5-pro-001',
      'gemini-1.5-flash-001', 'gemini-1.5-pro-exp', 'gemini-1.5-flash-exp',
      'gemini-1.5-pro-preview', 'gemini-1.5-flash-preview',
      
      // Gemini 1.0
      'gemini-pro', 'gemini-pro-vision', 'gemini-1.0-pro', 'gemini-1.0-pro-vision',
      'gemini-1.0-pro-latest', 'gemini-ultra', 'gemini-ultra-latest',
      'gemini-1.0-pro-001', 'gemini-1.0-pro-002',
      
      // Gemma 3
      'gemma-3-1b-it', 'gemma-3-4b-it', 'gemma-3-12b-it', 'gemma-3-27b-it',
      'gemma-3n-e4b-it', 'gemma-3n-e2b-it', 'gemma-3-1b', 'gemma-3-4b',
      'gemma-3-12b', 'gemma-3-27b',
      
      // Gemma 2
      'gemma-2-27b-it', 'gemma-2-9b-it', 'gemma-2-2b-it', 'gemma-2-1.1b-it',
      'gemma-2-27b', 'gemma-2-9b', 'gemma-2-2b',
      
      // Gemma 1.1
      'gemma-1.1-7b-it', 'gemma-1.1-2b-it', 'gemma-1.1-1b-it',
      'gemma-1.1-7b', 'gemma-1.1-2b',
      
      // Special & Experimental
      'gemini-robotics-er-1.5-preview', 'gemini-flash-latest', 'gemini-flash-lite-latest',
      'gemini-pro-latest', 'gemini-nano', 'gemini-micro', 'gemini-mini',
      'gemini-experimental', 'gemini-beta', 'gemini-alpha',
      'gemini-pro-experimental', 'gemini-flash-experimental',
      
      // Imagen
      'imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001',
      'imagen-4.0-generate-preview-06-06', 'imagen-4.0-ultra-generate-001',
      'imagen-4.0-ultra-generate-preview-06-06',
      
      // Veo
      'veo-2.0-generate-001', 'veo-3.0-fast-generate-001',
      'veo-3.0-generate-001', 'veo-3.1-generate-preview',
      
      // Embeddings
      'embedding-001', 'embedding-gecko-001', 'gemini-embedding-001',
      'gemini-embedding-exp', 'gemini-embedding-exp-03-07', 'text-embedding-004',
      
      // Other
      'aqa', 'nano-banana-pro-preview', 'deep-research-pro-preview-12-2025',
      'gemini-exp-1206'
    ];
    
    // NOTE: We don't add known models directly - only use them as reference
    // We'll only test models that are actually discovered from API endpoints
    // This prevents 404 errors from testing non-existent models
    this.logger.info(`📋 Reference list: ${knownModels.length} known models (will only test discovered ones)`);
    
    // ═══════════════════════════════════════════════════════════════
    // Step 2: Check all API endpoints (comprehensive from main.js)
    // ═══════════════════════════════════════════════════════════════
    const endpoints = [
      { url: 'https://generativelanguage.googleapis.com/v1/models', version: 'v1', name: 'v1 (Stable)' },
      { url: 'https://generativelanguage.googleapis.com/v1beta/models', version: 'v1beta', name: 'v1beta (Experimental)' },
      { url: 'https://generativelanguage.googleapis.com/v1alpha/models', version: 'v1alpha', name: 'v1alpha (Alpha)' },
      { url: 'https://generativelanguage.googleapis.com/v1/models?pageSize=100', version: 'v1', name: 'v1 (Large Page)' },
      { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', version: 'v1beta', name: 'v1beta (Large Page)' },
      { url: 'https://generativelanguage.googleapis.com/v1/models?pageSize=200', version: 'v1', name: 'v1 (Extra Large Page)' },
      { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', version: 'v1beta', name: 'v1beta (Extra Large Page)' }
    ];
    
    this.logger.info('📡 Checking all API endpoints...');
    for (const endpoint of endpoints) {
      try {
        const sep = endpoint.url.includes('?') ? '&' : '?';
        const url = `${endpoint.url}${sep}key=${this.apiKey}`;
        this.logger.info(`  Checking ${endpoint.name || endpoint.url}...`);
        
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(20000),
          headers: {
            'Referer': 'https://ai.google.dev/',
            'Origin': 'https://ai.google.dev',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            let found = 0;
            data.models.forEach(model => {
              const hasGen = model.supportedGenerationMethods && 
                model.supportedGenerationMethods.length > 0;
              if (hasGen) {
                const name = model.name.replace('models/', '').replace('tunedModels/', '');
                if (!allModels.has(name)) {
                  const info = CONFIG.MODELS[name] || {
                    family: this.getFamilyFromName(name),
                    tier: this.getTierFromName(name),
                    capabilities: ['text']
                  };
                  
                  allModels.set(name, {
                    name: name,
                    displayName: model.displayName || name,
                    description: model.description || 'No description',
                    methods: model.supportedGenerationMethods || [],
                    version: endpoint.version,
                    inputTokenLimit: model.inputTokenLimit || 0,
                    outputTokenLimit: model.outputTokenLimit || 0,
                    ...info
                  });
                  found++;
                } else {
                  // Update existing model with better info
                  const existing = allModels.get(name);
                  if (model.displayName && !existing.displayName) {
                    existing.displayName = model.displayName;
                  }
                  if (model.description && !existing.description) {
                    existing.description = model.description;
                  }
                  if (model.supportedGenerationMethods?.length > 0) {
                    existing.methods = model.supportedGenerationMethods;
                  }
                }
              }
            });
            if (found > 0) {
              this.logger.success(`  ✅ ${found} new models from ${endpoint.version} (Total: ${allModels.size})`);
            }
          }
        } else {
          // Handle specific error codes with better messages
          if (response.status === 403) {
            const errorInfo = ErrorCategorizer.categorize({ status: 403, message: 'Forbidden' });
            this.logger.warning(`  ⚠️ ${endpoint.name || endpoint.version}: ${errorInfo.message}`);
            this.logger.info(`  💡 ${errorInfo.suggestedFix}`);
          } else if (response.status === 401) {
            const errorInfo = ErrorCategorizer.categorize({ status: 401, message: 'Unauthorized' });
            this.logger.error(`  ❌ ${endpoint.name || endpoint.version}: ${errorInfo.message}`);
            this.logger.info(`  💡 ${errorInfo.suggestedFix}`);
          } else {
            this.logger.debug(`  ⚠️ HTTP ${response.status} from ${endpoint.version} (non-critical)`);
          }
        }
      } catch (error: any) {
        // Use ErrorCategorizer for better error messages
        const errorInfo = ErrorCategorizer.categorize(error);
        if (errorInfo.category === 'authentication') {
          this.logger.warning(`  ⚠️ ${endpoint.name || endpoint.version}: ${errorInfo.message}`);
          this.logger.info(`  💡 ${errorInfo.suggestedFix}`);
        } else {
          this.logger.debug(`  ⚠️ Error from ${endpoint.version}: ${errorInfo.message || error.message} (non-critical)`);
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 3: Test known models directly (improved discovery)
    // ═══════════════════════════════════════════════════════════════
    this.logger.info('🔍 Testing known models directly for better discovery...');
    let knownFound = 0;
    // Test ALL known models, not just first 50
    const modelsToTest = knownModels; // Test all known models
    
    // Test in batches to avoid overwhelming the API
    const batchSize = 15; // Increased batch size for faster discovery
    for (let i = 0; i < modelsToTest.length; i += batchSize) {
      const batch = modelsToTest.slice(i, i + batchSize);
      const promises = batch.map(async (modelName) => {
        if (!allModels.has(modelName)) {
          try {
            // Try v1beta first (most models are here)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}?key=${this.apiKey}`;
            const response = await fetch(url, { 
              method: 'GET',
              signal: AbortSignal.timeout(2000),
              headers: {
                'Referer': 'https://ai.google.dev/',
                'Origin': 'https://ai.google.dev'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.name) {
                const name = data.name.replace('models/', '').replace('tunedModels/', '');
                const info = CONFIG.MODELS[name] || {
                  family: this.getFamilyFromName(name),
                  tier: this.getTierFromName(name),
                  capabilities: ['text']
                };
                
                allModels.set(name, {
                  name: name,
                  displayName: data.displayName || name,
                  description: data.description || 'Discovered from known list',
                  methods: data.supportedGenerationMethods || [],
                  version: 'v1beta',
                  inputTokenLimit: data.inputTokenLimit || 0,
                  outputTokenLimit: data.outputTokenLimit || 0,
                  ...info
                });
                return true;
              }
            } else if (response.status === 404) {
              // Try v1 as fallback
              try {
                const urlV1 = `https://generativelanguage.googleapis.com/v1/models/${modelName}?key=${this.apiKey}`;
                const responseV1 = await fetch(urlV1, { 
                  method: 'GET',
                  signal: AbortSignal.timeout(2000)
                });
                if (responseV1.ok) {
                  const data = await responseV1.json();
                  if (data.name) {
                    const name = data.name.replace('models/', '');
                    const info = CONFIG.MODELS[name] || {
                      family: this.getFamilyFromName(name),
                      tier: this.getTierFromName(name),
                      capabilities: ['text']
                    };
                    
                    allModels.set(name, {
                      name: name,
                      displayName: data.displayName || name,
                      description: data.description || 'Discovered from known list',
                      methods: data.supportedGenerationMethods || [],
                      version: 'v1',
                      inputTokenLimit: data.inputTokenLimit || 0,
                      outputTokenLimit: data.outputTokenLimit || 0,
                      ...info
                    });
                    return true;
                  }
                }
              } catch (e) {
                // Model doesn't exist
              }
            }
          } catch (e) {
            // Model doesn't exist or error, continue
          }
        }
        return false;
      });
      
      const results = await Promise.all(promises);
      knownFound += results.filter(r => r).length;
      
      // Small delay between batches (reduced for faster discovery)
      if (i + batchSize < modelsToTest.length) {
        await this.sleep(300);
      }
    }
    
    if (knownFound > 0) {
      this.logger.success(`  ✅ Found ${knownFound} models from known list testing`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 4: Test pattern combinations (fallback)
    // ═══════════════════════════════════════════════════════════════
    this.logger.info('🔍 Testing pattern combinations as fallback...');
    const patterns = ['gemini-3', 'gemini-2.5', 'gemini-2.0', 'gemini-1.5', 'gemini-1.0', 'gemma-3', 'gemma-2', 'gemma-1.1'];
    const suffixes = ['pro', 'flash', 'lite', 'pro-preview', 'flash-preview', 'exp', 'experimental', 'ultra', 'nano', 'micro', 'latest'];
    
    let patternFound = 0;
    for (const pattern of patterns) {
      for (const suffix of suffixes) {
        const testModel = `${pattern}-${suffix}`;
        if (!allModels.has(testModel)) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}?key=${this.apiKey}`;
            const response = await fetch(url, { 
              method: 'GET',
              signal: AbortSignal.timeout(2000) 
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.name) {
                const name = data.name.replace('models/', '');
                allModels.set(name, {
                  name: name,
                  displayName: data.displayName || name,
                  description: data.description || 'Discovered via pattern',
                  methods: data.supportedGenerationMethods || [],
                  version: 'v1beta',
                  inputTokenLimit: data.inputTokenLimit || 0,
                  outputTokenLimit: data.outputTokenLimit || 0,
                  family: this.getFamilyFromName(name),
                  tier: this.getTierFromName(name),
                  capabilities: ['text']
                });
                patternFound++;
              }
            }
          } catch (e) {
            // Model doesn't exist, continue
          }
        }
      }
    }
    if (patternFound > 0) {
      this.logger.success(`  ✅ Found ${patternFound} models via pattern testing`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 5: Test numbered versions (optimized)
    // ═══════════════════════════════════════════════════════════════
    this.logger.info('🔍 Testing numbered version patterns...');
    let numberedFound = 0;
    // Focus on known version numbers to avoid too many requests
    const knownVersions = [
      // Gemini 3.x
      '3.0', '3.5',
      // Gemini 2.x
      '2.5', '2.0',
      // Gemini 1.x
      '1.5', '1.0'
    ];
    
    for (const versionStr of knownVersions) {
      const [major, minor] = versionStr.split('.');
      const versions = [
        `gemini-${versionStr}-pro`,
        `gemini-${versionStr}-flash`,
        `gemini-${versionStr}-pro-preview`,
        `gemini-${versionStr}-flash-preview`,
        `gemini-${versionStr}-flash-lite`
      ];
      
      for (const version of versions) {
        if (!allModels.has(version)) {
          try {
            // Try v1beta first
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${version}?key=${this.apiKey}`;
            const response = await fetch(url, { 
              method: 'GET',
              signal: AbortSignal.timeout(2000) 
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.name) {
                const name = data.name.replace('models/', '');
                allModels.set(name, {
                  name: name,
                  displayName: data.displayName || name,
                  description: data.description || 'Discovered via numbered pattern',
                  methods: data.supportedGenerationMethods || [],
                  version: 'v1beta',
                  inputTokenLimit: data.inputTokenLimit || 0,
                  outputTokenLimit: data.outputTokenLimit || 0,
                  family: this.getFamilyFromName(name),
                  tier: this.getTierFromName(name),
                  capabilities: ['text']
                });
                numberedFound++;
              }
            }
          } catch (e) {
            // Doesn't exist
          }
        }
      }
    }
    if (numberedFound > 0) {
      this.logger.success(`  ✅ Found ${numberedFound} models via numbered pattern testing`);
    }
    
    // Convert Map to Array and sort
    allModelsArray.push(...Array.from(allModels.values()));
    allModelsArray.sort((a, b) => a.name.localeCompare(b.name));
    
    // Return ALL discovered models - be less aggressive with filtering
    // Models discovered from API endpoints or from known list testing are all valid
    // The testModel() function will handle 404s gracefully
    const confirmedModels = allModelsArray.filter(model => {
      // Keep models that:
      // 1. Were discovered from API endpoints (have version info)
      // 2. Were found via known list testing (have methods or version)
      // 3. Are in our known models list (trust the comprehensive list)
      return model.version !== 'unknown' || 
             (model.methods && model.methods.length > 0) ||
             knownModels.includes(model.name);
    });
    
    this.results.models.discovered = confirmedModels;
    this.results.models.total = confirmedModels.length;

    this.logger.success(`✅ Discovery complete! Found ${confirmedModels.length} models (${allModelsArray.length} total discovered)`);
    if (allModelsArray.length > confirmedModels.length) {
      this.logger.info(`ℹ️ ${allModelsArray.length - confirmedModels.length} models filtered (will be tested anyway)`);
    }
    
    return confirmedModels;
  }
  
  getFamilyFromName(name: string): string {
    if (name.includes('gemini-3')) return '3.0';
    if (name.includes('gemini-2.5')) return '2.5';
    if (name.includes('gemini-2.0')) return '2.0';
    if (name.includes('gemini-1.5')) return '1.5';
    if (name.includes('gemini-1.0') || name === 'gemini-pro') return '1.0';
    if (name.includes('gemma')) return 'gemma';
    if (name.includes('imagen')) return 'imagen';
    if (name.includes('veo')) return 'veo';
    return 'unknown';
  }
  
  getTierFromName(name: string): string {
    if (name.includes('pro')) return 'pro';
    if (name.includes('flash')) return 'flash';
    if (name.includes('lite')) return 'lite';
    if (name.includes('ultra')) return 'ultra';
    if (name.includes('nano')) return 'nano';
    return 'standard';
  }

  async testModel(model: ModelInfo): Promise<TestResult> {
    const result = {
      name: model.name,
      accessible: false,
      streaming: false,
      multimodal: false,
      responseTime: null,
      error: null,
      workingVersion: null,
      testedAt: new Date().toISOString(),
      family: model.family,
      tier: model.tier,
      methods: model.methods
    };

    // CRITICAL FIX: Only test models that were discovered from API
    // If model version is 'unknown' and has no methods, skip testing to avoid 404
    if (model.version === 'unknown' && (!model.methods || model.methods.length === 0)) {
      result.error = 'Model not confirmed by API discovery';
      return result;
    }

    // Check cache first if enabled
    if (this.useCache) {
      const cached = ModelCacheManager.getCachedModel(this.apiKey, model.name);
      if (cached) {
        this.logger.debug(`📦 Using cached result for ${model.name}`);
        return {
          ...result,
          accessible: cached.accessible,
          streaming: cached.streaming,
          multimodal: cached.multimodal,
          responseTime: cached.responseTime,
          error: cached.error,
          workingVersion: cached.workingVersion,
          testedAt: cached.testedAt
        };
      }
    }

    // Check rate limit before making request
    if (!RateLimiter.canMakeRequest()) {
      const waitTime = RateLimiter.getWaitTime();
      this.logger.warning(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    RateLimiter.recordRequest();

    // Try API versions based on where model was discovered
    // This is the key difference - use the version that discovered the model first
    let versions = ['v1', 'v1beta', 'v1alpha'];
    
    // If model was discovered from a specific version, try that first
    if (model.version && model.version !== 'unknown') {
      const discoveredVersion = model.version.replace('ai-studio-', '').replace('-v1', '').replace('-v1beta', '').replace('-v1alpha', '');
      if (discoveredVersion === 'v1') {
        versions = ['v1', 'v1beta', 'v1alpha'];
      } else if (discoveredVersion === 'v1beta') {
        versions = ['v1beta', 'v1alpha', 'v1'];
      } else if (discoveredVersion === 'v1alpha') {
        versions = ['v1alpha', 'v1beta', 'v1'];
      }
    }

    for (const version of versions) {
      try {
        const startTime = Date.now();
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model.name}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Referer': 'https://ai.google.dev/',
            'Origin': 'https://ai.google.dev'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }],
            generationConfig: { maxOutputTokens: 10 }
          }),
          signal: AbortSignal.timeout(15000)
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const responseData = await response.json();
          
          result.accessible = true;
          result.responseTime = responseTime;
          result.workingVersion = version;
          
          // Check capabilities from model info
          if (model.capabilities?.includes('streaming')) {
            result.streaming = true;
          }
          if (model.capabilities?.includes('image') || model.capabilities?.includes('video') || model.capabilities?.includes('audio')) {
            result.multimodal = true;
          }
          
          // Track token usage if available
          if (responseData.usageMetadata) {
            const inputTokens = responseData.usageMetadata.promptTokenCount || 0;
            const outputTokens = responseData.usageMetadata.candidatesTokenCount || 0;
            TokenUsageTracker.recordUsage(model.name, inputTokens, outputTokens);
            
            // Update results with token usage
            if (!this.results.tokenUsage) {
              this.results.tokenUsage = {
                totalInput: 0,
                totalOutput: 0,
                totalTokens: 0,
                byModel: {}
              };
            }
            this.results.tokenUsage.totalInput += inputTokens;
            this.results.tokenUsage.totalOutput += outputTokens;
            this.results.tokenUsage.totalTokens += (inputTokens + outputTokens);
            
            if (!this.results.tokenUsage.byModel[model.name]) {
              this.results.tokenUsage.byModel[model.name] = { input: 0, output: 0, total: 0 };
            }
            this.results.tokenUsage.byModel[model.name].input += inputTokens;
            this.results.tokenUsage.byModel[model.name].output += outputTokens;
            this.results.tokenUsage.byModel[model.name].total += (inputTokens + outputTokens);
          }
          
          // Cache successful result
          if (this.useCache) {
            const cacheMap = new Map<string, CachedModelInfo>();
            cacheMap.set(model.name, {
              name: model.name,
              accessible: true,
              streaming: result.streaming,
              multimodal: result.multimodal,
              responseTime: result.responseTime,
              error: null,
              workingVersion: result.workingVersion,
              testedAt: result.testedAt,
              family: model.family,
              tier: model.tier,
              methods: model.methods,
              inputTokenLimit: model.inputTokenLimit,
              outputTokenLimit: model.outputTokenLimit,
              capabilities: model.capabilities
            });
            ModelCacheManager.saveCache(this.apiKey, cacheMap);
          }
          
          return result;
        } else {
          // Use ErrorCategorizer for better error handling
          const error: any = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          const errorInfo = ErrorCategorizer.categorize(error);
          
          if (errorInfo.category === 'authentication') {
            // 403 means model exists but access denied - don't try other versions
            result.error = errorInfo.message;
            return result;
          } else if (errorInfo.category === 'not_found') {
            // 404 means model doesn't exist in this version - try next
            result.error = `${errorInfo.message} (${version})`;
            continue;
          } else if (errorInfo.category === 'rate_limit') {
            result.error = errorInfo.message;
            // Don't retry on rate limit
            return result;
          } else {
            result.error = `${errorInfo.message} (${version})`;
            // Try next version
            continue;
          }
        }
      } catch (error: any) {
        // Use ErrorCategorizer for better error categorization
        const errorInfo = ErrorCategorizer.categorize(error);
        
        if (error.name === 'AbortError') {
          result.error = 'Request timeout';
        } else {
          result.error = errorInfo.message || error.message || 'Unknown error';
        }
        // Continue to next version
        continue;
      }
    }

    // If all versions failed, return result with error
    // Don't mark as accessible if we got 404s from all versions
    if (result.error?.includes('404') || result.error?.includes('not found')) {
      result.error = 'Model not found in any API version';
    }
    
    // Cache failed result (to avoid retesting immediately)
    if (this.useCache && result.error) {
      const cacheMap = new Map<string, CachedModelInfo>();
      cacheMap.set(model.name, {
        name: model.name,
        accessible: false,
        streaming: false,
        multimodal: false,
        responseTime: null,
        error: result.error,
        workingVersion: null,
        testedAt: result.testedAt,
        family: model.family,
        tier: model.tier,
        methods: model.methods,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        capabilities: model.capabilities
      });
      ModelCacheManager.saveCache(this.apiKey, cacheMap);
    }
    
    return result;
  }

  async testAllModels(models: ModelInfo[], progressCallback?: (current: number, total: number) => void) {
    this.logger.info(`🧪 Testing ${models.length} models...`);
    
    const usableModels = [];
    const rejectedModels = [];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      
      // Update progress SAFELY without throwing errors
      try {
        if (progressCallback) {
          progressCallback(i + 1, models.length);
        }
      } catch (err) {
        // Ignore progress callback errors - they shouldn't stop the scan
        this.logger.debug(`Progress callback error (non-critical): ${err.message}`);
      }

      this.logger.test(`[${i + 1}/${models.length}] Testing: ${model.name}`);
      
      // Test model with per-model error handling
      let testResult;
      try {
        testResult = await this.testModel(model);
      } catch (error: any) {
        // Individual model test failure shouldn't stop the scan
        // Use ErrorCategorizer for better error messages
        const errorInfo = ErrorCategorizer.categorize(error);
        this.logger.error(`✗ ${model.name}: ${errorInfo.message}`);
        this.results.models.failed.push({
          name: model.name,
          accessible: false,
          streaming: false,
          multimodal: false,
          responseTime: null,
          error: errorInfo.message || error.message || 'Unknown error',
          workingVersion: null,
          testedAt: new Date().toISOString()
        });
        continue;
      }

      if (testResult.accessible) {
        usableModels.push(model.name);
        this.results.models.accessible.push(testResult);
        
        if (testResult.responseTime) {
          this.results.performance.modelStats.push({
            name: model.name,
            responseTime: testResult.responseTime
          });
        }
        
        this.logger.success(`  ✓ ${model.name} (${testResult.responseTime}ms, ${testResult.workingVersion})`);
      } else if (testResult.error?.includes('403') || testResult.error?.includes('Forbidden')) {
        // 403 means model exists but access is restricted
        this.results.models.restricted.push(testResult);
        rejectedModels.push({
          modelId: model.name,
          reason: 'permission_denied'
        });
        this.logger.warning(`  ⚠ ${model.name}: Permission denied (model exists but restricted)`);
      } else if (testResult.error?.includes('404') || testResult.error?.includes('not found')) {
        // 404 means model doesn't exist - this is expected for many models
        this.results.models.failed.push(testResult);
        rejectedModels.push({
          modelId: model.name,
          reason: 'model_not_found'
        });
        this.logger.debug(`  ✗ ${model.name}: Not found (expected for some models)`);
      } else {
        // Other errors (timeout, network, etc.)
        this.results.models.failed.push(testResult);
        rejectedModels.push({
          modelId: model.name,
          reason: 'test_failed'
        });
        this.logger.error(`  ✗ ${model.name}: ${testResult.error}`);
      }
      
      // Small delay between tests
      await this.sleep(1000);
    }

    this.calculatePerformance();

    return {
      usableModels,
      rejectedModels,
      testedAt: Date.now()
    };
  }

  calculatePerformance() {
    const stats = this.results.performance.modelStats;
    
    if (stats.length === 0) return;

    const times = stats.map(s => s.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const fastest = stats.reduce((min, s) => s.responseTime < min.responseTime ? s : min);
    const slowest = stats.reduce((max, s) => s.responseTime > max.responseTime ? s : max);

    this.results.performance.avgResponseTime = Math.round(avg);
    this.results.performance.fastest = fastest;
    this.results.performance.slowest = slowest;
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }

  getClient() {
    return this.client;
  }

  getErrorSummary() {
    const total = this.results.models.total;
    const accessible = this.results.models.accessible.length;
    const restricted = this.results.models.restricted.length;
    const failed = this.results.models.failed.length;
    
    return {
      total,
      accessible,
      restricted,
      failed,
      successRate: total > 0 ? Math.round((accessible / total) * 100) : 0,
      errorBreakdown: {
        notFound: this.results.models.failed.filter(m => m.error?.includes('404') || m.error?.includes('not found')).length,
        forbidden: this.results.models.restricted.length,
        rateLimit: this.results.models.failed.filter(m => m.error?.includes('429') || m.error?.includes('rate limit')).length,
        timeout: this.results.models.failed.filter(m => m.error?.includes('timeout')).length,
        other: this.results.models.failed.filter(m => 
          !m.error?.includes('404') && 
          !m.error?.includes('not found') && 
          !m.error?.includes('429') && 
          !m.error?.includes('rate limit') && 
          !m.error?.includes('timeout')
        ).length
      }
    };
  }
}

// ============================================================================
// GEMINI REQUEST SERVICE - Exportable Service for Other Components
// ============================================================================

/**
 * GeminiRequestService - Centralized service for all Gemini API requests
 * 
 * This service provides:
 * - Model caching to avoid redundant API calls
 * - Token usage tracking
 * - Rate limiting with automatic backoff
 * - Geographical constraint checking
 * - API key validation
 * - Enhanced error handling
 * - Multimodal support
 * 
 * Usage:
 * ```typescript
 * import { GeminiRequestService } from './components/ultimate-gemini-tester';
 * 
 * const service = new GeminiRequestService(apiKey);
 * await service.initialize();
 * 
 * // Send a chat request
 * const response = await service.sendChatRequest({
 *   model: 'gemini-2.5-flash',
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   stream: false
 * });
 * ```
 */
export class GeminiRequestService {
  private apiKey: string;
  private logger: Logger | null;
  private client: RobustAPIClient;
  private useCache: boolean;
  private regionInfo: { allowed: boolean; region: string; message: string } | null = null;

  constructor(apiKey: string, options: { useCache?: boolean; logger?: Logger } = {}) {
    this.apiKey = apiKey;
    this.useCache = options.useCache !== false;
    this.logger = options.logger || null;
    this.client = new RobustAPIClient(this.apiKey, this.logger);
  }

  /**
   * Initialize the service - validates API key and checks geographical constraints
   */
  async initialize(): Promise<{ success: boolean; error?: string; regionInfo?: any }> {
    try {
      // Validate API key format
      const formatValidation = APIKeyValidator.validateFormat(this.apiKey);
      if (!formatValidation.valid) {
        return { success: false, error: formatValidation.error || 'Invalid API key format' };
      }

      // Validate API key with API
      const apiValidation = await APIKeyValidator.validateWithAPI(this.apiKey);
      if (!apiValidation.valid) {
        return { success: false, error: apiValidation.error || 'API key validation failed' };
      }

      // Check geographical constraints
      if (CONFIG.GEOGRAPHICAL.checkRegionOnInit) {
        this.regionInfo = await GeographicalConstraintChecker.checkRegionForApiKey(this.apiKey);
        if (!this.regionInfo.allowed) {
          this.logger?.warning(`⚠️ ${this.regionInfo.message}`);
        }
      }

      // Validate API connection
      const validation = await this.client.request('models', { maxRetries: 2 });
      if (!validation.success) {
        return { success: false, error: validation.error || 'API connection failed' };
      }

      this.logger?.success('✅ Service initialized successfully');
      return { success: true, regionInfo: this.regionInfo };
    } catch (error: any) {
      return { success: false, error: error.message || 'Initialization failed' };
    }
  }

  /**
   * Send a chat request to a Gemini model
   * 
   * @param options - Request options
   * @returns Response with text, usage metadata, and error handling
   */
  async sendChatRequest(options: {
    model: string;
    messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string; parts?: any[] }>;
    systemInstruction?: string;
    generationConfig?: {
      temperature?: number;
      maxOutputTokens?: number;
      topP?: number;
      topK?: number;
    };
    stream?: boolean;
    multimodal?: {
      images?: string[];
      videos?: string[];
      audio?: string[];
    };
  }): Promise<{
    success: boolean;
    text?: string;
    usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
    error?: string;
    errorInfo?: any;
  }> {
    // Check rate limit
    if (!RateLimiter.canMakeRequest()) {
      const waitTime = RateLimiter.getWaitTime();
      this.logger?.warning(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    RateLimiter.recordRequest();

    // Check token limits before sending
    const estimatedInputTokens = this.estimateTokens(options.messages);
    const tokenCheck = TokenUsageTracker.checkLimit(options.model, estimatedInputTokens, 0);
    if (!tokenCheck.withinLimit) {
      return {
        success: false,
        error: tokenCheck.warning || 'Token limit exceeded',
        errorInfo: { category: 'token_limit', type: 'limit_exceeded' }
      };
    }

    try {
      // Build request body
      const contents = options.messages.map(msg => {
        const parts: any[] = [];
        
        // Add text content
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        
        // Add multimodal content
        if (options.multimodal) {
          if (options.multimodal.images) {
            options.multimodal.images.forEach(img => {
              parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } });
            });
          }
          if (options.multimodal.videos) {
            options.multimodal.videos.forEach(video => {
              parts.push({ inlineData: { mimeType: 'video/mp4', data: video } });
            });
          }
          if (options.multimodal.audio) {
            options.multimodal.audio.forEach(audio => {
              parts.push({ inlineData: { mimeType: 'audio/mpeg', data: audio } });
            });
          }
        }
        
        return { parts };
      });

      const requestBody: any = {
        contents,
        generationConfig: {
          maxOutputTokens: 8192,
          ...options.generationConfig
        }
      };

      if (options.systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] };
      }

      // Determine API version (try v1beta first, then v1)
      const versions = ['v1beta', 'v1'];
      let lastError: any = null;

      for (const version of versions) {
        try {
          const endpoint = `models/${options.model}:generateContent`;
          const result = await this.client.request(endpoint, {
            method: 'POST',
            body: requestBody,
            timeout: CONFIG.GEMINI_API.timeout,
            maxRetries: CONFIG.GEMINI_API.maxRetries
          });

          if (result.success && result.data) {
            const responseData = result.data;
            
            // Extract text from response
            const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Track token usage
            if (responseData.usageMetadata) {
              const inputTokens = responseData.usageMetadata.promptTokenCount || 0;
              const outputTokens = responseData.usageMetadata.candidatesTokenCount || 0;
              TokenUsageTracker.recordUsage(options.model, inputTokens, outputTokens);
              
              return {
                success: true,
                text,
                usage: {
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens
                }
              };
            }

            return { success: true, text };
          } else {
            lastError = result.error || 'Request failed';
            const errorInfo = (result as any).errorInfo || ErrorCategorizer.categorize({
              status: result.status,
              message: lastError
            });
            
            // Don't retry on auth errors
            if (errorInfo.category === 'authentication') {
              return {
                success: false,
                error: errorInfo.message,
                errorInfo
              };
            }
            
            // Try next version
            continue;
          }
        } catch (error: any) {
          lastError = error;
          continue;
        }
      }

      // All versions failed
      const errorInfo = ErrorCategorizer.categorize(lastError || new Error('All API versions failed'));
      return {
        success: false,
        error: errorInfo.message || lastError?.message || 'Request failed',
        errorInfo
      };
    } catch (error: any) {
      const errorInfo = ErrorCategorizer.categorize(error);
      return {
        success: false,
        error: errorInfo.message || error.message || 'Unknown error',
        errorInfo
      };
    }
  }

  /**
   * Stream chat request (for streaming responses)
   */
  async *streamChatRequest(options: {
    model: string;
    messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>;
    systemInstruction?: string;
    generationConfig?: any;
    multimodal?: any;
  }): AsyncGenerator<{ text?: string; done?: boolean; error?: string; usage?: any }, void, unknown> {
    // Similar to sendChatRequest but with streaming
    // This is a simplified version - full implementation would handle SSE
    const result = await this.sendChatRequest(options);
    
    if (result.success && result.text) {
      // Simulate streaming by yielding chunks
      const chunks = result.text.split(' ');
      for (const chunk of chunks) {
        yield { text: chunk + ' ' };
      }
      yield { done: true, usage: result.usage };
    } else {
      yield { error: result.error, done: true };
    }
  }

  /**
   * Get cached model information
   */
  getCachedModel(modelName: string): CachedModelInfo | null {
    if (!this.useCache) return null;
    return ModelCacheManager.getCachedModel(this.apiKey, modelName);
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage() {
    return TokenUsageTracker.getCurrentUsage();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return {
      remaining: RateLimiter.getRemainingRequests(),
      canRequest: RateLimiter.canMakeRequest(),
      waitTime: RateLimiter.getWaitTime()
    };
  }

  /**
   * Clear cache for this API key
   */
  clearCache() {
    ModelCacheManager.clearCache(this.apiKey);
  }

  /**
   * Estimate token count (simplified - in production use a proper tokenizer)
   */
  private estimateTokens(messages: Array<{ content: string }>): number {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Convenience function to create and initialize a GeminiRequestService
 * 
 * @example
 * ```typescript
 * import { createGeminiService } from './components/ultimate-gemini-tester';
 * 
 * const service = await createGeminiService(apiKey);
 * const response = await service.sendChatRequest({
 *   model: 'gemini-2.5-flash',
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 * ```
 */
export async function createGeminiService(
  apiKey: string,
  options: { useCache?: boolean; logger?: Logger } = {}
): Promise<GeminiRequestService> {
  const service = new GeminiRequestService(apiKey, options);
  const initResult = await service.initialize();
  
  if (!initResult.success) {
    throw new Error(initResult.error || 'Failed to initialize Gemini service');
  }
  
  return service;
}

/**
 * Export utility functions for use by other components
 */
export {
  ModelCacheManager,
  TokenUsageTracker,
  RateLimiter,
  GeographicalConstraintChecker,
  APIKeyValidator,
  ErrorCategorizer,
  RobustAPIClient
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GeminiTesterProProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function GeminiTesterPro({ isOpen = true, onClose }: GeminiTesterProProps) {
  const [apiKeys, setApiKeys] = useState(['']);
  const [showApiKeys, setShowApiKeys] = useState([false]);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('setup');
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [modelCategories, setModelCategories] = useState(null);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [rateLimitStatus, setRateLimitStatus] = useState({ remaining: 60, canRequest: true });
  const [regionInfo, setRegionInfo] = useState(null);
  const [useCache, setUseCache] = useState(true);
  
  // Use refs for progress tracking to avoid state update issues
  const testStateRef = useRef({
    current: 0,
    total: 0,
    successCount: 0,
    isStopping: false
  });
  
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [successRate, setSuccessRate] = useState(0);
  
  const logsEndRef = useRef(null);
  
  // Load saved results from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load API key
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey && apiKeys[0] === '') {
        setApiKeys([savedKey]);
      }
      
      // Load saved test results
      const savedResults = localStorage.getItem('gemini_test_results');
      if (savedResults && !results) {
        try {
          const parsed = JSON.parse(savedResults);
          setResults(parsed.results);
          if (parsed.recommendations) setRecommendations(parsed.recommendations);
          if (parsed.categories) {
            setModelCategories(parsed.categories);
          }
          addLog('info', '📂 Loaded saved test results from storage');
        } catch (e) {
          console.error('Failed to load saved results:', e);
        }
      }
    }
  }, []);

  // Generate categories when results are available but categories are not
  useEffect(() => {
    if (results && !modelCategories) {
      const categories = categorizeModels(results);
      setModelCategories(categories);
    }
  }, [results]);

  // Save results to localStorage with size management
  useEffect(() => {
    if (results && typeof window !== 'undefined') {
      try {
        // Compress data by removing unnecessary fields
        const compressedData = {
          results: {
            timestamp: results.timestamp,
            models: {
              total: results.models?.total,
              accessible: results.models?.accessible?.map((m: any) => ({
                name: m.name,
                responseTime: m.responseTime,
                family: m.family,
                tier: m.tier,
                workingVersion: m.workingVersion,
                streaming: m.streaming,
                multimodal: m.multimodal
              })),
              restricted: results.models?.restricted?.map((m: any) => ({
                name: m.name,
                error: m.error
              })),
              failed: results.models?.failed?.map((m: any) => ({
                name: m.name,
                error: m.error
              }))
            },
            performance: results.performance
          },
          recommendations: recommendations ? {
            bestForSpeed: recommendations.bestForSpeed?.name,
            bestForQuality: recommendations.bestForQuality?.name,
            bestForBalance: recommendations.bestForBalance?.name
          } : null,
          savedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(compressedData);
        const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
        
        // Only save if under 4MB (localStorage limit is ~5-10MB)
        if (sizeInMB < 4) {
          localStorage.setItem('gemini_test_results', jsonString);
        } else {
          // If too large, only save essential data
          const minimalData = {
            results: {
              timestamp: results.timestamp,
              models: {
                total: results.models?.total,
                accessible: results.models?.accessible?.map((m: any) => ({
                  name: m.name,
                  responseTime: m.responseTime,
                  family: m.family,
                  tier: m.tier
                }))
              }
            },
            savedAt: new Date().toISOString()
          };
          localStorage.setItem('gemini_test_results', JSON.stringify(minimalData));
          addLog('warning', '⚠️ Results too large, saved minimal version');
        }
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          // Try cleanup first - inline cleanup logic
          try {
            const essentialKeys = ['gemini_api_key', 'secure_gstudio_agent_config', 'gstudio_api_key'];
            let cleaned = 0;
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && !essentialKeys.includes(key) && !key.startsWith('gemini_test_results')) {
                try {
                  localStorage.removeItem(key);
                  cleaned++;
                } catch (e) {
                  // Ignore errors during cleanup
                }
              }
            }
            
            // Retry with minimal data
            try {
              const minimalData = {
                results: {
                  timestamp: results.timestamp,
                  models: {
                    total: results.models?.total,
                    accessible: results.models?.accessible?.map((m: any) => ({
                      name: m.name,
                      responseTime: m.responseTime,
                      family: m.family,
                      tier: m.tier
                    }))
                  }
                },
                savedAt: new Date().toISOString()
              };
              localStorage.setItem('gemini_test_results', JSON.stringify(minimalData));
              if (cleaned > 0) {
                console.log(`🧹 Cleaned up ${cleaned} localStorage items`);
              }
            } catch (e) {
              // If still fails, try with even less data
              try {
                localStorage.removeItem('gemini_test_results');
                const ultraMinimalData = {
                  results: {
                    timestamp: results.timestamp,
                    models: {
                      total: results.models?.total,
                      accessible: results.models?.accessible?.slice(0, 20).map((m: any) => ({
                        name: m.name,
                        responseTime: m.responseTime,
                        family: m.family,
                        tier: m.tier
                      }))
                    }
                  },
                  savedAt: new Date().toISOString()
                };
                localStorage.setItem('gemini_test_results', JSON.stringify(ultraMinimalData));
                console.warn('⚠️ Storage quota exceeded, saved only top 20 models');
              } catch (e2) {
                console.error('❌ Failed to save results to localStorage. Storage is full.');
              }
            }
          } catch (cleanupError) {
            console.error('❌ Cleanup failed:', cleanupError);
          }
        } else {
          console.error(`❌ Failed to save: ${error.message}`);
        }
      }
    }
  }, [results, recommendations, modelCategories]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (logs.length > 0 && logsEndRef.current) {
      const timeoutId = setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [logs.length]);

  // Memoized addLog to prevent infinite loops
  const addLog = useCallback((type, message, data = null) => {
    const log = {
      id: Date.now() + Math.random(),
      type,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev, log]);
  }, []);

  // Utility function to clean up localStorage when quota is exceeded
  const cleanupLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Calculate current storage usage
      let totalSize = 0;
      const keysToCheck: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            totalSize += size;
            keysToCheck.push(key);
          }
        }
      }
      
      const sizeInMB = totalSize / (1024 * 1024);
      
      // If storage is over 80% full (assuming 5MB limit), clean up non-essential data
      if (sizeInMB > 4) {
        // Priority keys to keep
        const essentialKeys = [
          'gemini_api_key',
          'secure_gstudio_agent_config',
          'gstudio_api_key'
        ];
        
        // Remove non-essential keys
        let cleaned = 0;
        keysToCheck.forEach(key => {
          if (!essentialKeys.includes(key) && !key.startsWith('gemini_test_results')) {
            try {
              localStorage.removeItem(key);
              cleaned++;
            } catch (e) {
              // Ignore errors during cleanup
            }
          }
        });
        
        addLog('info', `🧹 Cleaned up ${cleaned} localStorage items (was ${sizeInMB.toFixed(2)}MB)`);
        return true;
      }
      return false;
    } catch (error: any) {
      addLog('warning', `⚠️ Cleanup failed: ${error.message}`);
      return false;
    }
  }, [addLog]);

  // Bulletproof runFullTest - NEVER abandons unless explicitly stopped
  const runFullTest = async () => {
    // Validation
    if (!apiKeys[0] || !apiKeys[0].trim()) {
      addLog('error', '❌ Please enter at least one API key');
      return;
    }

    const validApiKeys = apiKeys.filter(key => key && key.trim());
    if (validApiKeys.length === 0) {
      addLog('error', '❌ No valid API keys found');
      return;
    }

    // Initialize
    setTesting(true);
    setResults(null);
    setLogs([]);
    setActiveTab('logs');
    
    // Reset progress tracking
    testStateRef.current = {
      current: 0,
      total: 0,
      successCount: 0,
      isStopping: false
    };
    setProgress({ current: 0, total: 0, percentage: 0 });
    setSuccessRate(0);

    addLog('info', `🚀 Starting full model test with ${validApiKeys.length} API key(s)...`);

    const logger = new Logger(addLog);
    let tester = null;
    let finalResults = null;

    try {
      // Initialize tester with cache enabled
      tester = new ModelTesterService({
        apiKey: validApiKeys[0],
        apiKeys: validApiKeys,
        useCache: true // Enable caching to avoid redundant API calls
      }, logger);

      await tester.initialize();

      // Check if we have cached models
      const hasCache = ModelCacheManager.hasCache(validApiKeys[0]);
      if (hasCache && useCache) {
        addLog('info', '📦 Found cached model information. Will use cache to avoid redundant API calls.');
      }

      // Discover models
      addLog('info', '🔍 Discovering models...');
      const models = await tester.discoverModels();

      if (!models || models.length === 0) {
        addLog('warning', '⚠️ No models discovered');
        return;
      }

      // Initialize progress
      testStateRef.current.total = models.length;
      setProgress({ current: 0, total: models.length, percentage: 0 });

      // Progress callback that NEVER throws errors
      const progressCallback = (current, total) => {
        // Update ref without triggering re-render
        testStateRef.current.current = current;
        
        // Batch UI updates to avoid race conditions
        requestAnimationFrame(() => {
          const percentage = Math.round((current / total) * 100);
          setProgress({ current, total, percentage });
          
          // Update success rate
          if (testStateRef.current.successCount > 0) {
            const rate = Math.round((testStateRef.current.successCount / current) * 100);
            setSuccessRate(rate);
          }
        });
      };

      // Test all models with robust error handling
      addLog('info', `🧪 Testing ${models.length} models...`);
      
      const testResults = await tester.testAllModels(models, progressCallback);

      // Get results
      finalResults = tester.getResults();
      
      // Update token usage
      if (finalResults.tokenUsage) {
        setTokenUsage(finalResults.tokenUsage);
      }
      
      // Update rate limit status
      setRateLimitStatus({
        remaining: RateLimiter.getRemainingRequests(),
        canRequest: RateLimiter.canMakeRequest()
      });
      
      // Calculate final success rate
      const successCount = finalResults.models?.accessible?.length || 0;
      const totalTested = models.length;
      const finalRate = totalTested > 0 ? Math.round((successCount / totalTested) * 100) : 0;
      
      testStateRef.current.successCount = successCount;
      setSuccessRate(finalRate);
      setProgress({ current: totalTested, total: totalTested, percentage: 100 });

      // Set results
      setResults(finalResults);
      
      // Generate recommendations based on results
      const recs = generateRecommendations(finalResults);
      setRecommendations(recs);
      
      // Generate model categories
      const categories = categorizeModels(finalResults);
      setModelCategories(categories);
      
      addLog('success', `🎉 Testing complete! ${successCount}/${totalTested} models accessible (${finalRate}% success rate)`);
      
      // Save API key to localStorage
      if (typeof window !== 'undefined' && validApiKeys[0]) {
        localStorage.setItem('gemini_api_key', validApiKeys[0]);
      }
      
      // Switch to results tab
      setActiveTab('results');

    } catch (error: any) {
      // Handle multi-line error messages (especially for authentication errors)
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorLines = errorMessage.split('\n');
      
      // Log the main error
      addLog('error', `💥 Test failed: ${errorLines[0]}`);
      
      // Log additional details if present (for authentication errors with detailed guidance)
      if (errorLines.length > 1) {
        errorLines.slice(1).forEach((line: string) => {
          if (line.trim()) {
            // Use appropriate log level based on content
            if (line.includes('💡') || line.includes('To fix:') || line.includes('Common causes:')) {
              addLog('info', line.trim());
            } else if (line.startsWith('•')) {
              addLog('info', line.trim());
            } else {
              addLog('warning', line.trim());
            }
          }
        });
      }
      
      // Save partial results if available
      if (finalResults && finalResults.models) {
        setResults(finalResults);
        addLog('info', '💾 Partial results saved');
      }
    } finally {
      setTesting(false);
    }
  };

  const stopTest = () => {
    if (!testing) {
      addLog('warning', '⚠️ No active test to stop');
      return;
    }

    testStateRef.current.isStopping = true;
    setTesting(false);
    addLog('info', '✅ Test stopped');
  };

  const generateRecommendations = (results) => {
    if (!results || !results.models?.accessible) return null;
    
    const accessible = results.models.accessible;
    const fastest = accessible.reduce((min, m) => 
      (!min || (m.responseTime && m.responseTime < min.responseTime)) ? m : min, null
    );
    const slowest = accessible.reduce((max, m) => 
      (!max || (m.responseTime && m.responseTime > max.responseTime)) ? m : max, null
    );
    
    const proModels = accessible.filter(m => m.tier === 'pro' && m.family === '3.0');
    const flashModels = accessible.filter(m => m.tier === 'flash');
    const liteModels = accessible.filter(m => m.tier === 'lite');
    const gemmaModels = accessible.filter(m => m.family?.includes('gemma'));
    
    return {
      bestForSpeed: fastest || liteModels[0] || flashModels[0],
      bestForQuality: proModels[0] || accessible.find(m => m.tier === 'pro') || accessible[0],
      bestForBalance: flashModels[0] || accessible[0],
      bestForLatest: accessible.find(m => m.name.includes('3-')) || accessible[0],
      bestForRobotics: accessible.find(m => m.name.includes('robotics')) || null,
      bestForSmall: gemmaModels.find(m => m.name.includes('1b')) || gemmaModels[0] || null,
      bestForLarge: gemmaModels.find(m => m.name.includes('27b')) || gemmaModels[gemmaModels.length - 1] || null
    };
  };

  const categorizeModels = (results) => {
    if (!results || !results.models?.accessible) return null;
    
    const accessible = results.models.accessible;
    
    // Category 1: Code Generation - Fast models optimized for code generation tasks
    const codeGeneration = accessible
      .filter(m => 
        (m.tier === 'flash' || m.tier === 'lite') && 
        m.responseTime && m.responseTime < 2000
      )
      .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
      .slice(0, 5);
    
    // Category 2: Daily Program Analysis - Balanced models for analyzing daily programs and tasks
    const dailyAnalysis = accessible
      .filter(m => 
        m.tier === 'flash' || (m.tier === 'pro' && m.family && parseFloat(m.family) >= 2.5)
      )
      .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
      .slice(0, 5);
    
    // Category 3: Powerful Code Writer - High-performance Pro models for complex coding tasks
    const powerfulCodeWriter = accessible
      .filter(m => 
        m.tier === 'pro' && 
        (m.family === '3.0' || m.family === '2.5' || m.family === '2.0')
      )
      .sort((a, b) => {
        // Prioritize newer families
        const familyOrder = { '3.0': 3, '2.5': 2, '2.0': 1 };
        const aOrder = familyOrder[a.family as keyof typeof familyOrder] || 0;
        const bOrder = familyOrder[b.family as keyof typeof familyOrder] || 0;
        if (aOrder !== bOrder) return bOrder - aOrder;
        return (a.responseTime || 9999) - (b.responseTime || 9999);
      })
      .slice(0, 5);
    
    // Category 4: General Purpose - Versatile models for various tasks
    const generalPurpose = accessible
      .sort((a, b) => {
        // Score based on tier, family, and response time
        const tierScore = { 'pro': 3, 'flash': 2, 'lite': 1 };
        const aScore = (tierScore[a.tier as keyof typeof tierScore] || 0) * 1000 - (a.responseTime || 9999);
        const bScore = (tierScore[b.tier as keyof typeof tierScore] || 0) * 1000 - (b.responseTime || 9999);
        return bScore - aScore;
      })
      .slice(0, 10);
    
    return {
      codeGeneration: {
        name: 'Code Generation',
        description: 'Fast and efficient models optimized for code generation, syntax completion, and programming assistance. Perfect for real-time coding support.',
        icon: Code,
        color: 'from-blue-500 to-cyan-500',
        models: codeGeneration,
        bestModel: codeGeneration[0] || null,
        useCases: ['Code completion', 'Syntax generation', 'Quick prototyping', 'Real-time assistance']
      },
      dailyAnalysis: {
        name: 'Daily Program Analysis',
        description: 'Balanced models designed for analyzing daily programs, task planning, and routine optimization. Ideal for productivity and workflow analysis.',
        icon: Brain,
        color: 'from-purple-500 to-pink-500',
        models: dailyAnalysis,
        bestModel: dailyAnalysis[0] || null,
        useCases: ['Task analysis', 'Schedule optimization', 'Routine planning', 'Productivity insights']
      },
      powerfulCodeWriter: {
        name: 'Powerful Code Writer',
        description: 'High-performance Pro models engineered for complex coding tasks, architecture design, and advanced software development. Best for enterprise-level projects.',
        icon: Rocket,
        color: 'from-emerald-500 to-teal-500',
        models: powerfulCodeWriter,
        bestModel: powerfulCodeWriter[0] || null,
        useCases: ['Complex algorithms', 'System architecture', 'Enterprise development', 'Advanced debugging']
      },
      generalPurpose: {
        name: 'General Purpose',
        description: 'Versatile and well-balanced models suitable for a wide range of tasks. Excellent all-around performance for diverse applications.',
        icon: Network,
        color: 'from-indigo-500 to-purple-500',
        models: generalPurpose,
        bestModel: generalPurpose[0] || null,
        useCases: ['Multi-purpose tasks', 'General AI assistance', 'Content generation', 'Problem solving']
      }
    };
  };

  const downloadResults = () => {
    if (!results) {
      addLog('warning', '⚠️ No results to download');
      return;
    }

    try {
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '4.0',
          apiKey: apiKeys[0] ? `${apiKeys[0].substring(0, 8)}...${apiKeys[0].substring(apiKeys[0].length - 4)}` : 'hidden'
        },
        results: results,
        recommendations: recommendations,
        summary: {
          totalDiscovered: results.models?.total || 0,
          totalAccessible: results.models?.accessible?.length || 0,
          totalRestricted: results.models?.restricted?.length || 0,
          totalFailed: results.models?.failed?.length || 0,
          successRate: results.models?.total > 0 
            ? `${Math.round((results.models.accessible.length / results.models.total) * 100)}%`
            : '0%',
          avgResponseTime: results.performance?.avgResponseTime || 0
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog('success', '💾 Results downloaded successfully');
    } catch (error) {
      addLog('error', `❌ Download failed: ${error.message}`);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900/80 via-purple-900/60 to-blue-900/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => onClose?.()}
    >
      <div 
        className="bg-white dark:bg-slate-900 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-3xl w-full max-w-7xl flex flex-col overflow-hidden h-[92vh] sm:h-[90vh] transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Modern Gradient */}
        <div className="relative flex items-center justify-between p-5 sm:p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-blue-600/90 to-indigo-600/90 backdrop-blur-sm"></div>
          <div className="relative flex items-center gap-4 z-10">
            <div className="relative p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/30">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl"></div>
              <FlaskConical className="relative w-7 h-7 text-white drop-shadow-lg" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">
                Gemini Model Tester
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-semibold mt-0.5 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Production Grade v4.0 • Advanced Discovery
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event: any) => {
                      try {
                        const data = JSON.parse(event.target.result);
                        if (data.results) {
                          setResults(data.results);
                          if (data.recommendations) setRecommendations(data.recommendations);
                          if (data.categories) setModelCategories(data.categories);
                          addLog('success', '✅ Results loaded from JSON file');
                          setActiveTab('results');
                        } else if (data.categories) {
                          setModelCategories(data.categories);
                          addLog('success', '✅ Categories loaded from JSON file');
                          setActiveTab('categories');
                        } else {
                          addLog('error', '❌ Invalid JSON file format');
                        }
                      } catch (error: any) {
                        addLog('error', `❌ Failed to load JSON: ${error.message}`);
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-110"
              title="Load JSON file"
            >
              <Download className="w-5 h-5 rotate-180" />
            </button>
          <button
            onClick={() => onClose?.()}
              className="p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-110"
              title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Progress Bar - Modern Design */}
        {testing && progress.total > 0 && (
          <div className="px-5 sm:px-6 py-4 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800 dark:to-purple-900/20 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Testing Models
                  </span>
                  <span className="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg text-xs font-black text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                    {progress.current}/{progress.total}
                  </span>
                  <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                    {progress.percentage}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {successRate > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700/50 backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{successRate}% Success</span>
                  </div>
                )}
                <button
                  onClick={stopTest}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl text-sm font-bold hover:from-red-600 hover:to-rose-600 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105 active:scale-95"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>
            <div className="relative w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-slate-300/50 dark:border-slate-600/50">
              <div 
                className="relative h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 transition-all duration-500 ease-out rounded-full shadow-lg"
                style={{ width: `${progress.percentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                <div className="absolute top-0 right-0 w-1 h-full bg-white/50 blur-sm"></div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs - Modern Design */}
        <div className="flex px-4 sm:px-6 py-3 border-b border-slate-200/50 dark:border-slate-700/50 gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm overflow-x-auto scrollbar-hide">
          {[
            { id: 'setup', label: 'Setup', icon: Settings },
            { id: 'logs', label: 'Console', icon: Terminal },
            { id: 'results', label: 'Results', icon: Database },
            { id: 'categories', label: 'Categories', icon: GitBranch },
            { id: 'performance', label: 'Performance', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 sm:px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all duration-200 rounded-xl whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-sm opacity-50 -z-10"></div>
              )}
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'drop-shadow-sm' : ''}`} />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* API Keys - Modern Card */}
              <div className="relative bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/30 shadow-lg backdrop-blur-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <label className="relative text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <span>API Keys</span>
                </label>
                <div className="space-y-3">
                  {apiKeys.map((key, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type={showApiKeys[index] ? "text" : "password"}
                          value={key}
                          onChange={(e) => {
                            const newKeys = [...apiKeys];
                            newKeys[index] = e.target.value;
                            setApiKeys(newKeys);
                          }}
                          placeholder={`API Key ${index + 1} (AIza...)`}
                          className="relative w-full px-4 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-2 border-slate-300/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600"
                        />
                        <button
                          onClick={() => {
                            const newShowApiKeys = [...showApiKeys];
                            newShowApiKeys[index] = !newShowApiKeys[index];
                            setShowApiKeys(newShowApiKeys);
                          }}
                          className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-purple-600 rounded-lg transition-all"
                          type="button"
                        >
                          {showApiKeys[index] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {apiKeys.length > 1 && (
                          <button
                            onClick={() => {
                              setApiKeys(apiKeys.filter((_, i) => i !== index));
                              setShowApiKeys(showApiKeys.filter((_, i) => i !== index));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {index === 0 && (
                        <div className="flex items-center px-3 bg-emerald-100 rounded-xl border-2 border-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
                          <span className="text-xs font-bold text-emerald-800">Primary</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setApiKeys([...apiKeys, '']);
                    setShowApiKeys([...showApiKeys, false]);
                  }}
                  className="mt-3 w-full px-4 py-2 text-sm font-semibold text-purple-600 bg-white border-2 border-purple-300 rounded-lg hover:border-purple-400 transition-all"
                >
                  + Add Another Key
                </button>
              </div>

              {/* Cache Settings */}
              <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-indigo-200/50 dark:border-indigo-700/30 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-black text-indigo-800 dark:text-indigo-200 uppercase tracking-wider">
                      Model Cache
                    </h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCache}
                      onChange={(e) => setUseCache(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  {useCache 
                    ? '✅ Cache enabled: Model information will be stored to avoid redundant API calls.'
                    : '⚠️ Cache disabled: All models will be tested via API (slower but always fresh).'}
                </p>
                {useCache && ModelCacheManager.hasCache(apiKeys[0] || '') && (
                  <button
                    onClick={() => {
                      ModelCacheManager.clearCache(apiKeys[0] || '');
                      addLog('info', '🗑️ Model cache cleared');
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Cache
                  </button>
                )}
              </div>

              {/* Storage Management */}
              {typeof window !== 'undefined' && (
                <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-700/30 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                        Storage Management
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window === 'undefined') return;
                        
                        try {
                          // Calculate current storage
                          let totalSize = 0;
                          const keySizes: Array<{ key: string; size: number }> = [];
                          
                          for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key) {
                              const value = localStorage.getItem(key);
                              if (value) {
                                const size = new Blob([value]).size;
                                totalSize += size;
                                keySizes.push({ key, size });
                              }
                            }
                          }
                          
                          const sizeInMB = totalSize / (1024 * 1024);
                          
                          // Essential keys to keep
                          const essentialKeys = [
                            'gemini_api_key',
                            'secure_gstudio_agent_config',
                            'gstudio_api_key',
                            'gemini_test_results'
                          ];
                          
                          // Remove non-essential keys
                          let cleaned = 0;
                          for (const { key } of keySizes) {
                            const isEssential = essentialKeys.some(essential => 
                              key === essential || key.startsWith(essential)
                            );
                            
                            if (!isEssential) {
                              try {
                                localStorage.removeItem(key);
                                cleaned++;
                              } catch (e) {
                                // Ignore errors
                              }
                            }
                          }
                          
                          // Try to compress secure_gstudio_agent_config if it's large
                          const agentConfigKey = 'secure_gstudio_agent_config';
                          const agentConfig = localStorage.getItem(agentConfigKey);
                          if (agentConfig) {
                            const agentSize = new Blob([agentConfig]).size;
                            if (agentSize > 500 * 1024) { // Over 500KB
                              try {
                                const parsed = JSON.parse(agentConfig);
                                if (parsed && typeof parsed === 'object') {
                                  const compressed: any = {};
                                  if (parsed.apiKey) compressed.apiKey = parsed.apiKey;
                                  if (parsed.selectedModel) compressed.selectedModel = parsed.selectedModel;
                                  if (parsed.settings) compressed.settings = parsed.settings;
                                  // Remove large arrays
                                  if (parsed.conversations && Array.isArray(parsed.conversations)) {
                                    compressed.conversations = parsed.conversations.slice(-5);
                                  }
                                  if (parsed.history && Array.isArray(parsed.history)) {
                                    compressed.history = parsed.history.slice(-20);
                                  }
                                  const compressedStr = JSON.stringify(compressed);
                                  localStorage.setItem(agentConfigKey, compressedStr);
                                  addLog('info', `📦 Compressed ${agentConfigKey} from ${(agentSize / 1024).toFixed(0)}KB to ${(new Blob([compressedStr]).size / 1024).toFixed(0)}KB`);
                                }
                              } catch (e) {
                                // Ignore compression errors
                              }
                            }
                          }
                          
                          // Calculate new size
                          let newSize = 0;
                          for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key) {
                              const value = localStorage.getItem(key);
                              if (value) {
                                newSize += new Blob([value]).size;
                              }
                            }
                          }
                          const newMB = newSize / (1024 * 1024);
                          
                          if (cleaned > 0) {
                            addLog('success', `✅ Cleaned ${cleaned} items. Storage: ${sizeInMB.toFixed(2)}MB → ${newMB.toFixed(2)}MB`);
                          } else {
                            addLog('info', `ℹ️ Storage usage: ${sizeInMB.toFixed(2)}MB (${((sizeInMB / 5) * 100).toFixed(1)}% of 5MB limit)`);
                          }
                        } catch (error: any) {
                          addLog('error', `❌ Cleanup failed: ${error.message}`);
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clean Storage
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    If you encounter "QuotaExceededError", click "Clean Storage" to free up space. This will remove non-essential data while keeping your API keys and test results.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={runFullTest}
                  disabled={testing || !apiKeys[0]}
                  className="relative flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {testing ? (
                    <>
                      <Loader2 className="relative z-10 w-5 h-5 animate-spin drop-shadow-sm" />
                      <span className="relative z-10">Testing Models...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="relative z-10 w-5 h-5 drop-shadow-sm group-hover:scale-110 transition-transform" />
                      <span className="relative z-10">Run Full Test</span>
                    </>
                  )}
                </button>

                {testing && (
                  <button
                    onClick={stopTest}
                    className="px-6 py-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-xl flex items-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Console Tab */}
        {activeTab === 'logs' && (
          <div className="p-4 overflow-hidden flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                Console Output
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
              >
                Clear
              </button>
            </div>
            
            <div className="relative rounded-2xl p-4 sm:p-6 flex-1 overflow-y-auto font-mono text-xs bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              {logs.length === 0 ? (
                <div className="relative flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="relative mx-auto mb-4">
                      <Terminal className="w-16 h-16 text-slate-400/30 mx-auto" />
                      <div className="absolute inset-0 bg-purple-500/10 blur-2xl"></div>
                    </div>
                    <p className="text-slate-400 text-sm font-semibold">&gt; Console Ready</p>
                    <p className="text-slate-500 text-xs mt-1">Waiting for logs...</p>
                  </div>
                </div>
              ) : (
                <div className="relative space-y-1.5">
                  {logs.map(log => {
                    const getColor = (type) => {
                      if (type === 'error') return 'text-red-400 dark:text-red-300';
                      if (type === 'success') return 'text-emerald-400 dark:text-emerald-300';
                      if (type === 'warning') return 'text-amber-400 dark:text-amber-300';
                      if (type === 'test') return 'text-purple-400 dark:text-purple-300';
                      return 'text-slate-300 dark:text-slate-400';
                    };
                    
                    const getBgColor = (type) => {
                      if (type === 'error') return 'bg-red-500/10 border-red-500/20';
                      if (type === 'success') return 'bg-emerald-500/10 border-emerald-500/20';
                      if (type === 'warning') return 'bg-amber-500/10 border-amber-500/20';
                      if (type === 'test') return 'bg-purple-500/10 border-purple-500/20';
                      return 'bg-slate-800/50 border-slate-700/50';
                    };
                    
                    return (
                      <div key={log.id} className={`flex items-start gap-3 p-2 rounded-lg border ${getBgColor(log.type)} transition-all hover:bg-opacity-20`}>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold min-w-[60px] mt-0.5">{log.timestamp}</span>
                        <span className={`${getColor(log.type)} font-medium flex-1`}>{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="p-4 overflow-y-auto flex-1">
            {!results ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 mb-2">No Test Results Yet</h3>
                  <p className="text-slate-500 text-sm">Run a full test to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success Rate Banner - Modern Design */}
                {(() => {
                  const total = results.models?.total || 0;
                  const accessible = results.models?.accessible?.length || 0;
                  const rate = total > 0 ? Math.round((accessible / total) * 100) : 0;
                  
                  return (
                    <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="relative p-4 sm:p-5 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl border border-white/30">
                            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-300 rounded-full border-2 border-white animate-pulse"></div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Success Rate</div>
                            <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-lg mb-1">{rate}%</div>
                            <p className="text-sm sm:text-base text-white/90 font-semibold">
                              {accessible} of {total} models accessible
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Avg Response</div>
                          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
                            {results.performance?.avgResponseTime || 0}<span className="text-xl">ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stats Grid - Modern Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative group bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg mb-1">
                        {results.models?.accessible?.length || 0}
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider">Accessible</div>
                    </div>
                  </div>

                  <div className="relative group bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg mb-1">
                        {results.models?.restricted?.length || 0}
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider">Restricted</div>
                    </div>
                  </div>

                  <div className="relative group bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <X className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg mb-1">
                        {results.models?.failed?.length || 0}
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider">Failed</div>
                    </div>
                  </div>
                </div>

                {/* Filters - Modern Design */}
                <div className="relative bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-5 sm:p-6 border border-purple-200/50 dark:border-purple-700/30 shadow-lg backdrop-blur-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 block flex items-center gap-2">
                        <span className="text-base">🔍</span> Search
                      </label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search models..."
                        className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-2 border-slate-300/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 text-sm transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 block flex items-center gap-2">
                        <span className="text-base">📂</span> Category
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-2 border-slate-300/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 text-sm transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600"
                      >
                        <option value="">All Categories</option>
                        <option value="3.0">Gemini 3.0</option>
                        <option value="2.5">Gemini 2.5</option>
                        <option value="2.0">Gemini 2.0</option>
                        <option value="1.5">Gemini 1.5</option>
                        <option value="gemma">Gemma</option>
                        <option value="imagen">Imagen</option>
                        <option value="veo">Veo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 block flex items-center gap-2">
                        <span className="text-base">✅</span> Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border-2 border-slate-300/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 text-sm transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600"
                      >
                        <option value="">All Status</option>
                        <option value="accessible">Accessible</option>
                        <option value="restricted">Restricted</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Token Usage Section */}
                {tokenUsage && (
                  <div className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6" />
                        Token Usage
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30">
                          <div className="text-xs font-bold text-white/80 mb-1">Input Tokens</div>
                          <div className="text-2xl font-black text-white">{tokenUsage.totalInput.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30">
                          <div className="text-xs font-bold text-white/80 mb-1">Output Tokens</div>
                          <div className="text-2xl font-black text-white">{tokenUsage.totalOutput.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30">
                          <div className="text-xs font-bold text-white/80 mb-1">Total Tokens</div>
                          <div className="text-2xl font-black text-white">{tokenUsage.totalTokens.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Limit Status */}
                {rateLimitStatus && (
                  <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-700/30 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-sm font-bold text-white">Rate Limit Status</div>
                          <div className="text-xs text-white/80">
                            {rateLimitStatus.remaining} requests remaining
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg ${rateLimitStatus.canRequest ? 'bg-emerald-500' : 'bg-red-500'} text-white text-xs font-bold`}>
                        {rateLimitStatus.canRequest ? 'Available' : 'Limited'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {recommendations && (
                  <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        Recommendations
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {recommendations.bestForSpeed && (
                          <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
                            <div className="text-xs font-bold text-white/80 mb-1">⚡ Fastest</div>
                            <div className="text-sm font-black text-white">{recommendations.bestForSpeed.name}</div>
                            {recommendations.bestForSpeed.responseTime && (
                              <div className="text-xs text-white/70 mt-1">{recommendations.bestForSpeed.responseTime}ms</div>
                            )}
                          </div>
                        )}
                        {recommendations.bestForQuality && (
                          <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
                            <div className="text-xs font-bold text-white/80 mb-1">🧠 Best Quality</div>
                            <div className="text-sm font-black text-white">{recommendations.bestForQuality.name}</div>
                          </div>
                        )}
                        {recommendations.bestForBalance && (
                          <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
                            <div className="text-xs font-bold text-white/80 mb-1">⚖️ Balanced</div>
                            <div className="text-sm font-black text-white">{recommendations.bestForBalance.name}</div>
                          </div>
                        )}
                        {recommendations.bestForLatest && (
                          <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
                            <div className="text-xs font-bold text-white/80 mb-1">🆕 Latest</div>
                            <div className="text-sm font-black text-white">{recommendations.bestForLatest.name}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessible Models */}
                {(() => {
                  let filteredModels = results.models?.accessible || [];
                  
                  if (searchQuery) {
                    filteredModels = filteredModels.filter(m => 
                      m.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  }
                  
                  if (categoryFilter) {
                    filteredModels = filteredModels.filter(m => 
                      m.family === categoryFilter
                    );
                  }
                  
                  if (statusFilter === 'accessible') {
                    filteredModels = filteredModels.filter(m => m.accessible);
                  }
                  
                  return filteredModels.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Accessible Models ({filteredModels.length} of {results.models.accessible.length})
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const names = filteredModels.map(m => m.name).join('\n');
                              navigator.clipboard.writeText(names);
                              addLog('success', '✅ Model names copied');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-700 transition-all flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy Names
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredModels.map((model, idx) => (
                          <div 
                            key={idx} 
                            className="group relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border-2 border-emerald-200/50 dark:border-emerald-700/30 rounded-2xl p-5 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-emerald-300 dark:hover:border-emerald-600 overflow-hidden"
                            onClick={() => {
                              setSelectedModel(model);
                              setShowModelModal(true);
                            }}
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                            <div className="relative">
                              <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base pr-2 flex-1">{model.name}</div>
                                <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-lg whitespace-nowrap">
                                  {model.responseTime || 0}ms
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <span className="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {model.family || 'unknown'}
                                </span>
                                <span className="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {model.tier || 'unknown'}
                                </span>
                                {model.workingVersion && (
                                  <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                    {model.workingVersion}
                                  </span>
                                )}
                                {model.streaming && (
                                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                    ⚡ Streaming
                                  </span>
                                )}
                                {model.multimodal && (
                                  <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                    🎨 Multimodal
                                  </span>
                                )}
                              </div>
                              {model.methods && model.methods.length > 0 && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">
                                  {model.methods.length} method{model.methods.length > 1 ? 's' : ''} supported
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mt-3 font-semibold group-hover:gap-3 transition-all">
                                <span>Click for details</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No models match the current filters
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={downloadResults}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <Download className="w-4 h-4" />
                    Download Complete Results (JSON)
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event: any) => {
                            try {
                              const data = JSON.parse(event.target.result);
                              if (data.results) {
                                setResults(data.results);
                                if (data.recommendations) setRecommendations(data.recommendations);
                                if (data.categories) setModelCategories(data.categories);
                                addLog('success', '✅ Results loaded from JSON file');
                                setActiveTab('results');
                              } else {
                                addLog('error', '❌ Invalid JSON file format');
                              }
                            } catch (error: any) {
                              addLog('error', `❌ Failed to load JSON: ${error.message}`);
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <Download className="w-4 h-4 rotate-180" />
                    Load from JSON
                  </button>
                  <button
                    onClick={() => {
                      setResults(null);
                      setRecommendations(null);
                      setModelCategories(null);
                      setLogs([]);
                      localStorage.removeItem('gemini_test_results');
                      addLog('info', '🔄 All results cleared');
                    }}
                    className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab - Compact & Attractive Design */}
        {activeTab === 'categories' && (
          <div className="p-3 sm:p-4 overflow-y-auto flex-1">
            {!modelCategories ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">No Categories Available</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Run a full test to see model categories</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Compact Header */}
                <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-3 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-black text-white">Model Categories</h3>
                    </div>
                    <div className="text-xs text-white/90 font-semibold">
                      {Object.values(modelCategories as Record<string, any>).reduce((sum: number, cat: any) => sum + (cat.models?.length || 0), 0)} models
                    </div>
                  </div>
                </div>

                {/* Compact Category Cards - Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Object.entries(modelCategories as Record<string, any>).map(([key, category]: [string, any]) => (
                    <div key={key} className="group relative bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 hover:shadow-xl">
                      {/* Category Header - Compact */}
                      <div className={`relative bg-gradient-to-r ${category.color} p-3 cursor-pointer`} onClick={() => {
                        const element = document.getElementById(`category-${key}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          const isExpanded = element.classList.contains('expanded');
                          element.classList.toggle('expanded', !isExpanded);
                        }
                      }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex-shrink-0">
                              <category.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black text-white truncate">{category.name}</h4>
                              <p className="text-xs text-white/80 truncate">{category.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {category.bestModel && (
                              <div className="hidden sm:block text-right">
                                <div className="text-xs font-bold text-white/90">{category.bestModel.name.split('-').pop()}</div>
                                {category.bestModel.responseTime && (
                                  <div className="text-[10px] text-white/70">{category.bestModel.responseTime}ms</div>
                                )}
                              </div>
                            )}
                            <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                              <span className="text-xs font-black text-white">{category.models?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compact Models List - Collapsible */}
                      <div id={`category-${key}`} className="max-h-0 overflow-hidden transition-all duration-300 expanded:max-h-[600px]">
                        <div className="p-2 space-y-1.5">
                          {category.models && category.models.length > 0 ? (
                            category.models.map((model: any, modelIndex: number) => (
                              <div
                                key={modelIndex}
                                className={`group/item relative flex items-center gap-2 p-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                                  modelIndex === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                onClick={() => {
                                  setSelectedModel(model);
                                  setShowModelModal(true);
                                }}
                              >
                                {modelIndex === 0 && (
                                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                    <span className="text-[8px] text-white font-black">⭐</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-xs font-bold truncate ${
                                      modelIndex === 0 
                                        ? 'text-emerald-700 dark:text-emerald-300' 
                                        : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {model.name.split('-').slice(-2).join('-')}
                                    </span>
                                    {model.streaming && (
                                      <span className="text-[10px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-semibold">
                                        ⚡
                                      </span>
                                    )}
                                    {model.multimodal && (
                                      <span className="text-[10px] px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-700 dark:text-indigo-300 font-semibold">
                                        🎨
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {model.family && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 font-medium">
                                        {model.family}
                                      </span>
                                    )}
                                    {model.tier && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-300 font-medium">
                                        {model.tier}
                                      </span>
                                    )}
                                    {model.responseTime && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-300 font-bold">
                                        {model.responseTime}ms
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400">→</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">No models</div>
                          )}
                        </div>
                      </div>

                      {/* Use Cases - Compact Tags */}
                      {category.useCases && category.useCases.length > 0 && (
                        <div className="px-3 pb-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {category.useCases.slice(0, 3).map((useCase: string, idx: number) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400 font-medium">
                                {useCase}
                              </span>
                            ))}
                            {category.useCases.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-500 font-medium">
                                +{category.useCases.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Compact Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(modelCategories as Record<string, any>).map(([key, category]: [string, any]) => (
                    <div key={key} className={`relative bg-gradient-to-br ${category.color} rounded-lg p-3 text-center shadow-md overflow-hidden group hover:scale-105 transition-transform duration-200 cursor-pointer`} onClick={() => {
                      const element = document.getElementById(`category-${key}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        element.classList.toggle('expanded');
                      }
                    }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className="relative">
                        <category.icon className="w-4 h-4 text-white mx-auto mb-1" />
                        <div className="text-xl font-black text-white mb-0.5">{category.models?.length || 0}</div>
                        <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider truncate">{category.name.split(' ')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compact Export Button */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      if (modelCategories) {
                        const exportData = {
                          metadata: {
                            exportedAt: new Date().toISOString(),
                            version: '4.0',
                            type: 'categories'
                          },
                          categories: modelCategories,
                          summary: {
                            totalCategories: Object.keys(modelCategories).length,
                            totalModels: Object.values(modelCategories as Record<string, any>).reduce((sum: number, cat: any) => sum + (cat.models?.length || 0), 0)
                          }
                        };
                        const jsonString = JSON.stringify(exportData, null, 2);
                        const blob = new Blob([jsonString], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `gemini-model-categories-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        addLog('success', '💾 Categories exported to JSON file');
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-xs shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="p-4 overflow-y-auto flex-1">
            {!results ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">No Performance Data</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Run a full test to see performance metrics</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Performance Metrics
                </h3>

                {/* Stats - Modern Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                      <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg mb-1">
                        {results.performance?.avgResponseTime || 0}<span className="text-lg">ms</span>
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider">Avg Response</div>
                    </div>
                  </div>

                  <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                      <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg mb-1">
                        {results.performance?.fastest?.responseTime || 0}<span className="text-lg">ms</span>
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider mb-1">Fastest</div>
                      {results.performance?.fastest?.name && (
                        <div className="text-xs text-white/80 truncate">{results.performance.fastest.name}</div>
                      )}
                    </div>
                  </div>

                  <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 border border-white/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                      <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg mb-1">
                        {results.performance?.slowest?.responseTime || 0}<span className="text-lg">ms</span>
                      </div>
                      <div className="text-sm font-bold text-white/90 uppercase tracking-wider mb-1">Slowest</div>
                      {results.performance?.slowest?.name && (
                        <div className="text-xs text-white/80 truncate">{results.performance.slowest.name}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Response Time Distribution */}
                {results.performance?.modelStats && results.performance.modelStats.length > 0 && (
                  <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        Response Time Distribution (Top 10)
                    </h4>
                      <div className="space-y-3">
                      {results.performance.modelStats
                        .sort((a, b) => b.responseTime - a.responseTime)
                        .slice(0, 10)
                        .map((stat, idx) => {
                          const maxTime = Math.max(...results.performance.modelStats.map(s => s.responseTime));
                          const percentage = (stat.responseTime / maxTime) * 100;
                          
                          return (
                              <div key={idx} className="flex items-center gap-4 p-3 bg-white/50 dark:bg-slate-700/50 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md transition-all">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[30px]">
                                  #{idx + 1}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 min-w-[200px] truncate flex-1">
                                {stat.name}
                              </div>
                                <div className="flex-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-300/50 dark:border-slate-600/50">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      stat.responseTime < 1000 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                      stat.responseTime < 3000 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                                      'bg-gradient-to-r from-red-500 to-rose-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                                <div className="text-xs font-black text-slate-700 dark:text-slate-200 min-w-[70px] text-right">
                                {stat.responseTime}ms
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Category Breakdown */}
                {results.models?.accessible && (
                  <div className="relative bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/30 shadow-lg backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-500" />
                        Category Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(() => {
                          const categories: Record<string, number> = {};
                          results.models.accessible.forEach(m => {
                            const cat = m.family || 'other';
                            categories[cat] = (categories[cat] || 0) + 1;
                          });
                          
                          return Object.entries(categories).map(([cat, count]) => (
                            <div key={cat} className="bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 dark:border-slate-600 text-center">
                              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">{count}</div>
                              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{cat}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Model Details Modal - Modern Design */}
      {showModelModal && selectedModel && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900/90 via-purple-900/70 to-blue-900/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowModelModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200/50 dark:border-slate-700/50 transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-6 sm:p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-blue-600/90 to-indigo-600/90 backdrop-blur-sm"></div>
              <div className="relative flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 drop-shadow-lg">{selectedModel.name}</h3>
                  <p className="text-white/90 font-medium">{selectedModel.displayName}</p>
                </div>
                <button
                  onClick={() => setShowModelModal(false)}
                  className="p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-5 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl p-5 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-bold text-white/80 uppercase mb-2">Family</div>
                    <div className="text-2xl font-black text-white drop-shadow-lg">{selectedModel.family || 'unknown'}</div>
                  </div>
                </div>
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-bold text-white/80 uppercase mb-2">Tier</div>
                    <div className="text-2xl font-black text-white drop-shadow-lg">{selectedModel.tier || 'unknown'}</div>
                  </div>
                </div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-bold text-white/80 uppercase mb-2">API Version</div>
                    <div className="text-2xl font-black text-white drop-shadow-lg">{selectedModel.version || 'unknown'}</div>
                  </div>
                </div>
                {selectedModel.workingVersion && (
                  <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="text-xs font-bold text-white/80 uppercase mb-2">Working Version</div>
                      <div className="text-2xl font-black text-white drop-shadow-lg">{selectedModel.workingVersion}</div>
                    </div>
                  </div>
                )}
                {selectedModel.responseTime && (
                  <div className="relative bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-5 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative">
                      <div className="text-xs font-bold text-white/80 uppercase mb-2">Response Time</div>
                      <div className="text-2xl font-black text-white drop-shadow-lg">{selectedModel.responseTime}ms</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Capabilities Section */}
              {(selectedModel.streaming || selectedModel.multimodal || selectedModel.methods?.length > 0) && (
                <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-5 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">Capabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.streaming && (
                      <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        ⚡ Streaming
                      </span>
                    )}
                    {selectedModel.multimodal && (
                      <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        🎨 Multimodal
                      </span>
                    )}
                    {selectedModel.methods?.map((method, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedModel.description && (
                <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="text-xs font-bold text-slate-600 uppercase mb-2">Description</div>
                  <div className="text-sm text-slate-700">{selectedModel.description}</div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedModel.inputTokenLimit > 0 && (
                  <div className="relative bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border-2 border-violet-200 dark:border-violet-700 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-200/20 dark:bg-violet-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                        <span>📥</span> Input Tokens
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {selectedModel.inputTokenLimit.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Maximum input context
                      </div>
                    </div>
                  </div>
                )}
                {selectedModel.outputTokenLimit > 0 && (
                  <div className="relative bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 rounded-xl p-4 border-2 border-fuchsia-200 dark:border-fuchsia-700 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-200/20 dark:bg-fuchsia-700/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                        <span>📤</span> Output Tokens
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      {selectedModel.outputTokenLimit.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Maximum output length
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedModel.methods && selectedModel.methods.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="text-xs font-bold text-slate-600 uppercase mb-2">Supported Methods</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.methods.map((method, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedModel.responseTime && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
                  <div className="text-xs font-bold text-slate-600 uppercase mb-1">Response Time</div>
                  <div className="text-2xl font-black text-emerald-700">{selectedModel.responseTime}ms</div>
                </div>
              )}
              
              {selectedModel.testedAt && (
                <div className="text-xs text-slate-500">
                  Tested at: {new Date(selectedModel.testedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}