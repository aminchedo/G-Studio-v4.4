/**
 * GeminiTesterUtils - Utility Classes and Functions
 *
 * Utility classes for API client, cache management, token tracking, etc.
 */

import { CONFIG } from "./GeminiTesterConfig";
import {
  APIResponse,
  APIStats,
  CachedModelInfo,
  ModelCache,
  TokenUsage,
  TokenUsageSummary,
  TokenLimitCheck,
  ErrorInfo,
  LogType,
  RegionInfo,
} from "./GeminiTesterTypes";

// ============================================================================
// LOGGER
// ============================================================================

export class Logger {
  addLogCallback: ((type: LogType, message: string, data?: any) => void) | null;

  constructor(
    addLogCallback:
      | ((type: LogType, message: string, data?: any) => void)
      | null = null,
  ) {
    this.addLogCallback = addLogCallback;
  }

  log(type: LogType, message: string, data?: any) {
    if (this.addLogCallback) {
      this.addLogCallback(type, message, data);
    }
  }

  info(message: string, data?: any) {
    this.log("info", message, data);
  }

  success(message: string, data?: any) {
    this.log("success", message, data);
  }

  error(message: string, data?: any) {
    this.log("error", message, data);
  }

  warning(message: string, data?: any) {
    this.log("warning", message, data);
  }

  debug(message: string, data?: any) {
    this.log("debug", message, data);
  }
}

// ============================================================================
// ERROR CATEGORIZER
// ============================================================================

export class ErrorCategorizer {
  static categorize(error: any): ErrorInfo {
    const msg = error?.message || String(error);
    const status = error?.status || 0;

    // Authentication errors
    if (
      status === 401 ||
      status === 403 ||
      msg.includes("API key") ||
      msg.includes("unauthorized")
    ) {
      return {
        category: "authentication",
        type: status === 401 ? "unauthorized" : "forbidden",
        message: "Invalid or missing API key. Please check your API key.",
        retryable: false,
        suggestion:
          "Verify your API key is correct and has the necessary permissions.",
      };
    }

    // Rate limit errors
    if (status === 429 || msg.includes("rate limit") || msg.includes("quota")) {
      return {
        category: "rate_limit",
        type: "quota_exceeded",
        message:
          "Rate limit exceeded. Please wait before making more requests.",
        retryable: true,
        suggestion:
          "Wait a few minutes before retrying or upgrade your API plan.",
      };
    }

    // Network errors
    if (
      status === 0 ||
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("fetch")
    ) {
      return {
        category: "network",
        type: "connection_failed",
        message: "Network error. Please check your internet connection.",
        retryable: true,
        suggestion: "Check your internet connection and try again.",
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        category: "server",
        type: "server_error",
        message: `Server error (${status}). The API service may be temporarily unavailable.`,
        retryable: true,
        suggestion:
          "Wait a few minutes and try again. If the problem persists, check the API status page.",
      };
    }

    // Validation errors
    if (
      status === 400 ||
      msg.includes("invalid") ||
      msg.includes("validation")
    ) {
      return {
        category: "validation",
        type: "invalid_request",
        message: "Invalid request. Please check your input parameters.",
        retryable: false,
        suggestion: "Review your request parameters and ensure they are valid.",
      };
    }

    // Unknown errors
    return {
      category: "unknown",
      type: "unknown_error",
      message: msg || "An unknown error occurred.",
      retryable: false,
      suggestion:
        "Please try again or contact support if the problem persists.",
    };
  }
}

// ============================================================================
// ROBUST API CLIENT
// ============================================================================

export class RobustAPIClient {
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
      retries: 0,
    };
  }

  async request(
    endpoint: string,
    options: {
      maxRetries?: number;
      timeout?: number;
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {},
  ): Promise<APIResponse> {
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
          attempt,
        };
      } catch (error: any) {
        lastError = error;
        this.stats.total++;

        const errorInfo = ErrorCategorizer.categorize(error);

        // Don't retry on auth errors
        if (
          error.status === 401 ||
          error.status === 403 ||
          errorInfo.category === "authentication"
        ) {
          this.stats.failed++;
          return {
            success: false,
            error: errorInfo.message,
            status:
              error.status || (errorInfo.type === "unauthorized" ? 401 : 403),
            retryable: false,
            errorInfo: errorInfo,
          };
        }

        // Retry on network/server errors
        if (attempt < maxRetries) {
          const delay = CONFIG.GEMINI_API.exponentialBackoff
            ? CONFIG.GEMINI_API.retryDelay * Math.pow(2, attempt - 1)
            : CONFIG.GEMINI_API.retryDelay;

          this.stats.retries++;
          this.logger?.debug(
            `Retry ${attempt}/${maxRetries} after ${delay}ms...`,
          );
          await this.sleep(delay);
          continue;
        }

        this.stats.failed++;
      }
    }

    return {
      success: false,
      error: lastError?.message || "Max retries exceeded",
      status: lastError?.status || 0,
      retryable: true,
    };
  }

  async makeRequest(
    endpoint: string,
    options: { method?: string; headers?: Record<string, string>; body?: any },
    timeout: number,
  ) {
    const url = `${CONFIG.GEMINI_API.baseUrl}${endpoint}?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { McpService } = await import("@/services/mcpService");
      const data = await McpService.request(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body,
        signal: controller.signal,
        timeout: timeout,
      });

      clearTimeout(timeoutId);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        const timeoutError: any = new Error("Request timeout");
        timeoutError.status = 0;
        throw timeoutError;
      }
      throw error;
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats(): APIStats {
    return {
      ...this.stats,
      successRate:
        this.stats.total > 0
          ? (this.stats.success / this.stats.total) * 100
          : 0,
    };
  }
}

// ============================================================================
// MODEL CACHE MANAGER
// ============================================================================

export class ModelCacheManager {
  private static cache: ModelCache | null = null;
  private static inMemoryCache = new Map<
    string,
    { data: any; timestamp: number }
  >();

  static getCacheKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `api_${Math.abs(hash)}`;
  }

  static getFromCache(modelId: string): any {
    const cached = this.inMemoryCache.get(modelId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CONFIG.CACHE.modelInfoTTL) {
      this.inMemoryCache.delete(modelId);
      return null;
    }

    return cached.data;
  }

  static addToCache(modelId: string, data: any) {
    this.inMemoryCache.set(modelId, {
      data,
      timestamp: Date.now(),
    });
  }

  static clearInMemoryCache() {
    this.inMemoryCache.clear();
  }

  static loadCache(apiKey: string): ModelCache | null {
    try {
      if (typeof window === "undefined") return null;

      const cacheKey = this.getCacheKey(apiKey);
      const stored = localStorage.getItem(
        `${CONFIG.CACHE.storageKey}_${cacheKey}`,
      );

      if (!stored) return null;

      const cache: ModelCache = JSON.parse(stored);
      const now = Date.now();

      if (now - cache.timestamp > CONFIG.CACHE.modelInfoTTL) {
        this.clearCache(apiKey);
        return null;
      }

      cache.models = new Map(Object.entries(cache.models as any));

      this.cache = cache;
      return cache;
    } catch (error) {
      console.error("Failed to load model cache:", error);
      return null;
    }
  }

  static saveCache(apiKey: string, models: Map<string, CachedModelInfo>) {
    try {
      if (typeof window === "undefined") return;

      const cacheKey = this.getCacheKey(apiKey);
      const cache: ModelCache = {
        models: models,
        timestamp: Date.now(),
        apiKeyHash: cacheKey,
      };

      const modelsObj: Record<string, CachedModelInfo> = {};
      models.forEach((value, key) => {
        modelsObj[key] = value;
      });

      const cacheData = {
        ...cache,
        models: modelsObj,
      };

      localStorage.setItem(
        `${CONFIG.CACHE.storageKey}_${cacheKey}`,
        JSON.stringify(cacheData),
      );
      this.cache = cache;
    } catch (error) {
      console.error("Failed to save model cache:", error);
    }
  }

  static getCachedModel(
    apiKey: string,
    modelName: string,
  ): CachedModelInfo | null {
    const cache = this.loadCache(apiKey);
    if (!cache) return null;

    const model = cache.models.get(modelName);
    if (!model) return null;

    const now = Date.now();
    const testedAt = new Date(model.testedAt).getTime();
    if (now - testedAt > CONFIG.CACHE.modelInfoTTL) {
      return null;
    }

    return model;
  }

  static clearCache(apiKey: string) {
    try {
      if (typeof window === "undefined") return;
      const cacheKey = this.getCacheKey(apiKey);
      localStorage.removeItem(`${CONFIG.CACHE.storageKey}_${cacheKey}`);
      this.cache = null;
    } catch (error) {
      console.error("Failed to clear model cache:", error);
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

export class TokenUsageTracker {
  private static usageHistory: TokenUsage[] = [];
  private static currentUsage: TokenUsageSummary = {
    input: 0,
    output: 0,
    total: 0,
  };

  static recordUsage(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
  ) {
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      timestamp: Date.now(),
      modelName,
    };

    this.usageHistory.push(usage);
    this.currentUsage.input += inputTokens;
    this.currentUsage.output += outputTokens;
    this.currentUsage.total += inputTokens + outputTokens;

    if (this.usageHistory.length > 1000) {
      this.usageHistory.shift();
    }
  }

  static getCurrentUsage(): TokenUsageSummary {
    return { ...this.currentUsage };
  }

  static getUsageForModel(modelName: string): TokenUsage[] {
    return this.usageHistory.filter((u) => u.modelName === modelName);
  }

  static getUsageReport(): string {
    return `Input Tokens: ${this.currentUsage.input.toLocaleString()}, Output Tokens: ${this.currentUsage.output.toLocaleString()}, Total: ${this.currentUsage.total.toLocaleString()}`;
  }

  static trackTokens(input: number, output: number) {
    this.recordUsage("unknown", input, output);
  }

  static checkLimit(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
  ): TokenLimitCheck {
    const modelConfig = CONFIG.MODELS[modelName as keyof typeof CONFIG.MODELS];
    const inputLimit =
      modelConfig?.inputTokenLimit || CONFIG.GEMINI_API.tokenLimit.input;
    const outputLimit =
      modelConfig?.outputTokenLimit || CONFIG.GEMINI_API.tokenLimit.output;

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
      outputLimit,
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

export class RateLimiter {
  private static requestHistory: number[] = [];
  private static requestsMade = 0;
  private static lastRequestTime = Date.now();
  private static readonly maxRequests = CONFIG.GEMINI_API.rateLimit;
  private static readonly windowMs = CONFIG.GEMINI_API.rateLimitWindow;

  static canMakeRequest(): boolean {
    const now = Date.now();
    if (now - this.lastRequestTime > this.windowMs) {
      this.requestsMade = 0;
      this.lastRequestTime = now;
    }

    this.requestHistory = this.requestHistory.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    return (
      this.requestsMade < this.maxRequests &&
      this.requestHistory.length < this.maxRequests
    );
  }

  static recordRequest() {
    const now = Date.now();
    this.requestHistory.push(now);
    this.requestsMade++;
    this.lastRequestTime = now;
  }

  static getStatus() {
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    return {
      remaining: this.maxRequests - this.requestHistory.length,
      canRequest: this.canMakeRequest(),
      resetTime: this.lastRequestTime + this.windowMs,
    };
  }

  static reset() {
    this.requestHistory = [];
    this.requestsMade = 0;
    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// GEOGRAPHICAL CONSTRAINT CHECKER
// ============================================================================

export class GeographicalConstraintChecker {
  private static cachedRegion: string | null = null;
  private static regionCheckTime: number = 0;
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static async checkRegion(): Promise<RegionInfo> {
    const now = Date.now();

    if (this.cachedRegion && now - this.regionCheckTime < this.CACHE_DURATION) {
      return this.getRegionInfo(this.cachedRegion);
    }

    try {
      // Route through mcpService for architectural consistency
      const { McpService } = await import("@/services/mcpService");
      const data = await McpService.request("https://ipapi.co/json/", {
        method: "GET",
        timeout: 5000,
      });
      const region = data.continent_code || "UNKNOWN";

      this.cachedRegion = region;
      this.regionCheckTime = now;

      return this.getRegionInfo(region);
    } catch (error) {
      return {
        region: "UNKNOWN",
        allowed: true,
        restricted: false,
        message: "Could not determine region. Assuming allowed.",
      };
    }
  }

  private static getRegionInfo(region: string): RegionInfo {
    const allowed =
      CONFIG.GEOGRAPHICAL.allowedRegions.includes(region) ||
      CONFIG.GEOGRAPHICAL.allowedRegions.includes("GLOBAL");
    const restricted = CONFIG.GEOGRAPHICAL.restrictedRegions.includes(region);

    return {
      region,
      allowed,
      restricted,
      message: restricted
        ? "API access is restricted in your region."
        : undefined,
    };
  }

  static clearCache() {
    this.cachedRegion = null;
    this.regionCheckTime = 0;
  }
}

// ============================================================================
// API KEY VALIDATOR
// ============================================================================

export class APIKeyValidator {
  private static validKeys: string[] = [];

  static isValidFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== "string") return false;
    if (apiKey.length < 20) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) return false;
    return true;
  }

  static async validate(
    apiKey: string,
  ): Promise<{ valid: boolean; error?: string }> {
    if (!this.isValidFormat(apiKey)) {
      return {
        valid: false,
        error:
          "Invalid API key format. Key should be at least 20 characters and contain only alphanumeric characters, hyphens, and underscores.",
      };
    }

    try {
      const client = new RobustAPIClient(apiKey);
      const response = await client.request("models", {
        maxRetries: 1,
        timeout: 10000,
      });

      if (response.success) {
        this.validKeys.push(apiKey);
        return { valid: true };
      } else {
        return {
          valid: false,
          error: response.error || "API key validation failed",
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || "API key validation failed",
      };
    }
  }

  static markAsValid(apiKey: string) {
    if (!this.validKeys.includes(apiKey)) {
      this.validKeys.push(apiKey);
    }
  }

  static isMarkedValid(apiKey: string): boolean {
    return this.validKeys.includes(apiKey);
  }

  static clearValidKeys() {
    this.validKeys = [];
  }
}
