/**
 * GeminiTesterUtils - Enhanced Utility Functions
 * 
 * Comprehensive utility functions for logging, caching, rate limiting, and token management
 * with improved error handling and performance optimization
 */

import { 
  LogType, 
  LogEntry, 
  ModelCache, 
  CachedModelInfo,
  TokenUsage,
  TokenUsageSummary,
  RateLimitStatus,
  ErrorInfo,
  APIError
} from './GeminiTesterTypes';
import { CONFIG } from './GeminiTesterConfig';

// ============================================================================
// LOGGER
// ============================================================================

export class Logger {
  private callback: (type: LogType, message: string, data?: any) => void;
  private logHistory: LogEntry[] = [];
  private maxHistory = 1000;

  constructor(callback: (type: LogType, message: string, data?: any) => void) {
    this.callback = callback;
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log success message
   */
  success(message: string, data?: any): void {
    this.log('success', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Log warning message
   */
  warning(message: string, data?: any): void {
    this.log('warning', message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Internal log method
   */
  private log(type: LogType, message: string, data?: any): void {
    const entry: LogEntry = {
      type,
      message,
      timestamp: Date.now(),
      data
    };

    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.shift();
    }

    this.callback(type, message, data);
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// ============================================================================
// MODEL CACHE MANAGER
// ============================================================================

export class ModelCacheManager {
  private static readonly CACHE_VERSION = '3.0';
  private static readonly STORAGE_KEY = CONFIG.CACHE.storageKey;

  /**
   * Generate hash for API key (for cache identification)
   */
  private static hashApiKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached models for an API key
   */
  static getCache(apiKey: string): ModelCache | null {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = `${this.STORAGE_KEY}_${this.hashApiKey(apiKey)}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Check version
      if (data.version !== this.CACHE_VERSION) {
        this.clearCache(apiKey);
        return null;
      }

      // Check TTL
      const age = Date.now() - data.timestamp;
      if (age > CONFIG.CACHE.modelInfoTTL) {
        this.clearCache(apiKey);
        return null;
      }

      // Convert models array back to Map
      const models = new Map<string, CachedModelInfo>(
        data.models.map((m: any) => [m.name, m])
      );

      return {
        models,
        timestamp: data.timestamp,
        apiKeyHash: data.apiKeyHash
      };
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Save models to cache
   */
  static setCache(apiKey: string, cache: ModelCache): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = `${this.STORAGE_KEY}_${this.hashApiKey(apiKey)}`;
      
      // Convert Map to array for storage
      const data = {
        version: this.CACHE_VERSION,
        models: Array.from(cache.models.values()),
        timestamp: cache.timestamp,
        apiKeyHash: cache.apiKeyHash
      };

      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Clear cache for an API key
   */
  static clearCache(apiKey: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = `${this.STORAGE_KEY}_${this.hashApiKey(apiKey)}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; age: number } | null {
    if (typeof window === 'undefined') return null;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.STORAGE_KEY));
      const size = keys.length;
      
      let oldestAge = 0;
      keys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          const age = Date.now() - data.timestamp;
          if (age > oldestAge) oldestAge = age;
        }
      });

      return { size, age: oldestAge };
    } catch (error) {
      return null;
    }
  }
}

// ============================================================================
// TOKEN USAGE TRACKER
// ============================================================================

export class TokenUsageTracker {
  private static usageHistory: TokenUsage[] = [];
  private static readonly MAX_HISTORY = 100;

  /**
   * Track token usage for a model
   */
  static trackUsage(usage: TokenUsage): void {
    this.usageHistory.push(usage);
    
    if (this.usageHistory.length > this.MAX_HISTORY) {
      this.usageHistory.shift();
    }
  }

  /**
   * Get current usage summary
   */
  static getCurrentUsage(): TokenUsageSummary {
    const input = this.usageHistory.reduce((sum, u) => sum + u.inputTokens, 0);
    const output = this.usageHistory.reduce((sum, u) => sum + u.outputTokens, 0);
    
    return {
      input,
      output,
      total: input + output
    };
  }

  /**
   * Get usage by model
   */
  static getUsageByModel(modelName: string): TokenUsageSummary {
    const filtered = this.usageHistory.filter(u => u.modelName === modelName);
    const input = filtered.reduce((sum, u) => sum + u.inputTokens, 0);
    const output = filtered.reduce((sum, u) => sum + u.outputTokens, 0);
    
    return {
      input,
      output,
      total: input + output
    };
  }

  /**
   * Get usage history
   */
  static getHistory(): TokenUsage[] {
    return [...this.usageHistory];
  }

  /**
   * Clear usage history
   */
  static clearHistory(): void {
    this.usageHistory = [];
  }

  /**
   * Estimate cost based on usage (rough estimate)
   */
  static estimateCost(model: string): number {
    const usage = this.getUsageByModel(model);
    
    // Rough pricing estimates (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-3-pro': { input: 1.25, output: 5.00 },
      'gemini-3-flash': { input: 0.075, output: 0.30 },
      'gemini-2.5-pro': { input: 1.25, output: 5.00 },
      'gemini-2.5-flash': { input: 0.075, output: 0.30 },
      'gemini-2.0-flash': { input: 0.075, output: 0.30 },
      default: { input: 0.10, output: 0.40 }
    };

    const price = pricing[model] || pricing.default;
    const inputCost = (usage.input / 1_000_000) * price.input;
    const outputCost = (usage.output / 1_000_000) * price.output;
    
    return inputCost + outputCost;
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

export class RateLimiter {
  private static requests: number[] = [];
  private static readonly WINDOW = CONFIG.GEMINI_API.rateLimitWindow;
  private static readonly LIMIT = CONFIG.GEMINI_API.rateLimit;

  /**
   * Check if request can be made
   */
  static canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requests.length < this.LIMIT;
  }

  /**
   * Record a request
   */
  static recordRequest(): void {
    this.requests.push(Date.now());
    this.cleanupOldRequests();
  }

  /**
   * Get current status
   */
  static getStatus(): RateLimitStatus {
    this.cleanupOldRequests();
    const remaining = Math.max(0, this.LIMIT - this.requests.length);
    const canRequest = remaining > 0;
    
    let resetTime: number | undefined;
    if (this.requests.length > 0) {
      resetTime = this.requests[0] + this.WINDOW;
    }

    return {
      remaining,
      canRequest,
      resetTime
    };
  }

  /**
   * Wait for rate limit reset if needed
   */
  static async waitIfNeeded(): Promise<void> {
    if (this.canMakeRequest()) return;

    const status = this.getStatus();
    if (status.resetTime) {
      const waitTime = status.resetTime - Date.now();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Reset rate limiter
   */
  static reset(): void {
    this.requests = [];
  }

  /**
   * Clean up old requests outside the window
   */
  private static cleanupOldRequests(): void {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.WINDOW);
  }

  /**
   * Get estimated wait time in ms
   */
  static getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    
    const status = this.getStatus();
    if (status.resetTime) {
      return Math.max(0, status.resetTime - Date.now());
    }
    
    return 0;
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

export class ErrorHandler {
  /**
   * Parse and categorize API errors
   */
  static parseError(error: any): ErrorInfo {
    const status = error.status || error.response?.status;
    const message = error.message || error.error?.message || 'Unknown error';

    // Authentication errors
    if (status === 401 || status === 403) {
      return {
        category: 'authentication',
        type: status === 401 ? 'INVALID_API_KEY' : 'PERMISSION_DENIED',
        message: status === 401 
          ? 'Invalid API key. Please check your credentials.'
          : 'Permission denied. This model may not be available in your region.',
        retryable: false,
        suggestion: status === 401
          ? 'Get a valid API key from Google AI Studio'
          : 'Try a different model or check regional availability'
      };
    }

    // Rate limit errors
    if (status === 429) {
      return {
        category: 'rate_limit',
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please wait before retrying.',
        retryable: true,
        suggestion: 'Wait a few moments and try again'
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        category: 'server',
        type: 'SERVER_ERROR',
        message: 'Server error. The service may be temporarily unavailable.',
        retryable: true,
        suggestion: 'Retry in a few moments'
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || message.includes('network')) {
      return {
        category: 'network',
        type: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        retryable: true,
        suggestion: 'Check your internet connection and try again'
      };
    }

    // Validation errors
    if (status === 400) {
      return {
        category: 'validation',
        type: 'INVALID_REQUEST',
        message: 'Invalid request. Please check your input.',
        retryable: false,
        suggestion: 'Verify your request parameters'
      };
    }

    // Unknown errors
    return {
      category: 'unknown',
      type: 'UNKNOWN_ERROR',
      message,
      retryable: false,
      suggestion: 'Check the error details and try again'
    };
  }

  /**
   * Create enhanced API error
   */
  static createAPIError(error: any): APIError {
    const errorInfo = this.parseError(error);
    const apiError = new Error(errorInfo.message) as APIError;
    apiError.status = error.status;
    apiError.retryable = errorInfo.retryable;
    apiError.errorInfo = errorInfo;
    return apiError;
  }

  /**
   * Should retry this error?
   */
  static shouldRetry(error: any): boolean {
    const errorInfo = this.parseError(error);
    return errorInfo.retryable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    const errorInfo = this.parseError(error);
    return `${errorInfo.message}${errorInfo.suggestion ? ` ${errorInfo.suggestion}` : ''}`;
  }
}

// ============================================================================
// MODEL UTILITIES
// ============================================================================

export class ModelUtils {
  /**
   * Extract model family from name
   */
  static extractFamily(modelName: string): string | undefined {
    const match = modelName.match(/gemini-([\d.]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract model tier from name
   */
  static extractTier(modelName: string): string | undefined {
    if (modelName.includes('pro')) return 'pro';
    if (modelName.includes('flash')) return 'flash';
    if (modelName.includes('lite')) return 'lite';
    return undefined;
  }

  /**
   * Determine if model is experimental
   */
  static isExperimental(modelName: string): boolean {
    return modelName.includes('preview') || 
           modelName.includes('experimental') || 
           modelName.includes('latest');
  }

  /**
   * Get model generation number
   */
  static getGeneration(modelName: string): number | undefined {
    const family = this.extractFamily(modelName);
    if (!family) return undefined;
    
    const gen = parseFloat(family);
    return isNaN(gen) ? undefined : Math.floor(gen);
  }

  /**
   * Compare model versions (for sorting)
   */
  static compareVersions(a: string, b: string): number {
    const genA = this.getGeneration(a) || 0;
    const genB = this.getGeneration(b) || 0;
    
    if (genA !== genB) return genB - genA;
    
    // Compare tiers
    const tierOrder = { pro: 3, flash: 2, lite: 1 };
    const tierA = tierOrder[this.extractTier(a) as keyof typeof tierOrder] || 0;
    const tierB = tierOrder[this.extractTier(b) as keyof typeof tierOrder] || 0;
    
    return tierB - tierA;
  }

  /**
   * Format model name for display
   */
  static formatDisplayName(modelName: string): string {
    return modelName
      .replace(/^models\//, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get model color theme
   */
  static getModelColor(modelName: string): string {
    const tier = this.extractTier(modelName);
    switch (tier) {
      case 'pro': return 'purple';
      case 'flash': return 'blue';
      case 'lite': return 'green';
      default: return 'slate';
    }
  }

  /**
   * Validate model name format
   */
  static isValidModelName(name: string): boolean {
    return /^(models\/)?gemini-[\w.-]+$/.test(name);
  }
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  /**
   * Start performance measurement
   */
  static start(label: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.record(label, duration);
      return duration;
    };
  }

  /**
   * Record measurement
   */
  static record(label: string, duration: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
  }

  /**
   * Get statistics for a label
   */
  static getStats(label: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const median = sorted[Math.floor(count / 2)];

    return { count, min, max, avg, median };
  }

  /**
   * Clear measurements
   */
  static clear(label?: string): void {
    if (label) {
      this.measurements.delete(label);
    } else {
      this.measurements.clear();
    }
  }

  /**
   * Export all measurements
   */
  static export(): Record<string, any> {
    const result: Record<string, any> = {};
    this.measurements.forEach((measurements, label) => {
      result[label] = this.getStats(label);
    });
    return result;
  }
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

export class RetryHandler {
  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      exponentialBackoff?: boolean;
      shouldRetry?: (error: any) => boolean;
      onRetry?: (attempt: number, error: any) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = CONFIG.GEMINI_API.maxRetries,
      initialDelay = CONFIG.GEMINI_API.retryDelay,
      exponentialBackoff = CONFIG.GEMINI_API.exponentialBackoff,
      shouldRetry = ErrorHandler.shouldRetry,
      onRetry
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw ErrorHandler.createAPIError(error);
        }

        const delay = exponentialBackoff
          ? initialDelay * Math.pow(2, attempt)
          : initialDelay;

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw ErrorHandler.createAPIError(lastError);
  }

  /**
   * Retry with rate limiting
   */
  static async retryWithRateLimit<T>(
    fn: () => Promise<T>,
    options?: Parameters<typeof RetryHandler.retry>[1]
  ): Promise<T> {
    await RateLimiter.waitIfNeeded();
    return this.retry(fn, options);
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export class ExportUtils {
  /**
   * Export data as JSON file
   */
  static exportJSON(data: any, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  /**
   * Export data as CSV file
   */
  static exportCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadFile(csv, filename, 'text/csv');
  }

  /**
   * Download file helper
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
