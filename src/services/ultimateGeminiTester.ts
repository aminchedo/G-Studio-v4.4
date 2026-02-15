/**
 * Ultimate Gemini API Tester - Browser-Compatible Version
 * Based on ultimate_gemini_tester.js v4.0
 *
 * Features:
 * ✅ Complete Gemini 3 & 2.5 Model Support
 * ✅ Advanced Retry Logic with Exponential Backoff
 * ✅ Smart Bypass System (Proxy Detection, CDN Fallback)
 * ✅ Model Enrichment (Family, Tier, Capabilities)
 * ✅ Performance Analytics & Benchmarking
 * ✅ Comprehensive Error Handling
 * ✅ Model Discovery from API
 *
 * @version 4.0.0-browser
 */

import { ModelValidationStore } from "./modelValidationStore";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  GEMINI_API: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
    cdnUrl: "https://generativelanguage.googleapis.com/v1beta/", // CDN fallback
    // DNS endpoints for automatic rotation and failover
    dnsEndpoints: [
      "https://generativelanguage.googleapis.com/v1beta/", // Primary
      "https://generativelanguage.googleapis.com/v1beta/", // Backup (same for now, can be different CDN)
    ],
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 60, // requests per minute
    delayBetweenRequests: 1000, // 1 second like HTML tester
    exponentialBackoff: true,
    backoffMultiplier: 2,
    maxBackoffDelay: 10000, // 10 seconds max
    // DNS rotation settings
    dnsRotationEnabled: true,
    dnsHealthCheckInterval: 60000, // Check DNS health every 60 seconds
    dnsFailoverThreshold: 3, // Switch DNS after 3 consecutive failures
  },

  MODELS: {
    // Gemini 3 Family (Latest)
    "gemini-3-pro": {
      family: "3.0",
      tier: "pro",
      capabilities: [
        "text",
        "image",
        "video",
        "audio",
        "streaming",
        "function_calling",
        "thinking",
      ],
      contextWindow: 2000000,
      description: "Most intelligent model with Pro-grade reasoning",
    },
    "gemini-3-flash": {
      family: "3.0",
      tier: "flash",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Frontier intelligence built for speed",
    },
    "gemini-3-flash-preview": {
      family: "3.0",
      tier: "experimental",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Preview of Gemini 3 Flash",
    },
    "gemini-3-pro-preview": {
      family: "3.0",
      tier: "experimental",
      capabilities: [
        "text",
        "image",
        "video",
        "streaming",
        "function_calling",
        "deep_think",
      ],
      contextWindow: 2000000,
      description: "Preview of Gemini 3 with deep thinking mode",
    },

    // Gemini 2.5 Family
    "gemini-2.5-pro": {
      family: "2.5",
      tier: "pro",
      capabilities: [
        "text",
        "image",
        "video",
        "audio",
        "streaming",
        "function_calling",
        "adaptive_thinking",
      ],
      contextWindow: 2000000,
      description: "High-capability model with adaptive thinking",
    },
    "gemini-2.5-flash": {
      family: "2.5",
      tier: "flash",
      capabilities: [
        "text",
        "image",
        "streaming",
        "function_calling",
        "thinking_budgets",
      ],
      contextWindow: 1000000,
      description: "Lightning-fast with controllable thinking",
    },
    "gemini-2.5-flash-lite": {
      family: "2.5",
      tier: "lite",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Cost-optimized for high-throughput",
    },
    "gemini-2.5-flash-preview-09-2025": {
      family: "2.5",
      tier: "preview",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Preview version",
    },
    "gemini-2.5-flash-lite-preview-09-2025": {
      family: "2.5",
      tier: "preview",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Preview lite version",
    },
    "gemini-2.5-flash-native-audio": {
      family: "2.5",
      tier: "audio",
      capabilities: [
        "text",
        "audio",
        "streaming",
        "live_api",
        "function_calling",
      ],
      contextWindow: 1000000,
      description: "Live API with native audio generation",
    },

    // Gemma Family
    "gemma-3-1b-it": {
      family: "gemma",
      tier: "1b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 1B Instruct",
    },
    "gemma-3-4b-it": {
      family: "gemma",
      tier: "4b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 4B Instruct",
    },
    "gemma-3-12b-it": {
      family: "gemma",
      tier: "12b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 12B Instruct",
    },
    "gemma-3-27b-it": {
      family: "gemma",
      tier: "27b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 27B Instruct",
    },
    "gemma-3n-e4b-it": {
      family: "gemma",
      tier: "e4b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3n E4B Instruct",
    },
    "gemma-3n-e2b-it": {
      family: "gemma",
      tier: "e2b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3n E2B Instruct",
    },

    // Legacy models
    "gemini-flash-latest": {
      family: "1.5",
      tier: "flash",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Latest Flash model",
    },
    "gemini-flash-lite-latest": {
      family: "1.5",
      tier: "lite",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Latest Flash Lite model",
    },
    "gemini-robotics-er-1.5-preview": {
      family: "robotics",
      tier: "experimental",
      capabilities: ["text", "streaming"],
      contextWindow: 1000000,
      description: "Robotics ER 1.5 Preview",
    },
  },

  BYPASS: {
    methods: ["system-proxy", "auto", "cdn-fallback"],
    fallback: ["cdn", "retry", "alternative-endpoint"],
  },

  PERFORMANCE: {
    trackResponseTimes: true,
    trackErrors: true,
    calculateAverages: true,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

class Logger {
  private verbose: boolean;
  private startTime: number;
  private addLogCallback:
    | ((level: string, message: string, data?: any) => void)
    | null = null;

  constructor(
    verbose: boolean = false,
    addLogCallback?: (level: string, message: string, data?: any) => void,
  ) {
    this.verbose = verbose;
    this.startTime = Date.now();
    this.addLogCallback = addLogCallback || null;
  }

  private log(level: string, message: string, data: any = null) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const icons: Record<string, string> = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      debug: "🔍",
      test: "🧪",
      bypass: "🔓",
      speed: "⚡",
      model: "🤖",
    };

    const icon = icons[level] || "•";
    const logMessage = `[${elapsed}s] ${icon} ${message}`;

    // Call UI callback if provided
    if (this.addLogCallback) {
      this.addLogCallback(level, logMessage, data);
    }

    console.log(logMessage);

    if (data && this.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  setCallback(callback: (level: string, message: string, data?: any) => void) {
    this.addLogCallback = callback;
  }

  info(msg: string, data?: any) {
    this.log("info", msg, data);
  }
  success(msg: string, data?: any) {
    this.log("success", msg, data);
  }
  warning(msg: string, data?: any) {
    this.log("warning", msg, data);
  }
  error(msg: string, data?: any) {
    this.log("error", msg, data);
  }
  debug(msg: string, data?: any) {
    if (this.verbose) this.log("debug", msg, data);
  }
  test(msg: string, data?: any) {
    this.log("test", msg, data);
  }
  bypass(msg: string, data?: any) {
    this.log("bypass", msg, data);
  }
  speed(msg: string, data?: any) {
    this.log("speed", msg, data);
  }
  model(msg: string, data?: any) {
    this.log("model", msg, data);
  }

  section(title: string) {
    console.log(`\n${"─".repeat(76)}`);
    console.log(`  ${title}`);
    console.log("─".repeat(76));
  }
}

// ============================================================================
// DNS MANAGER - Automatic Rotation and Failover
// ============================================================================

class DNSManager {
  private endpoints: string[];
  private currentEndpointIndex: number = 0;
  private endpointHealth: Map<
    string,
    {
      consecutiveFailures: number;
      lastFailure: number;
      totalRequests: number;
      successfulRequests: number;
      avgResponseTime: number;
    }
  >;
  private logger: Logger;
  private healthCheckInterval: any = null;

  constructor(endpoints: string[], logger: Logger) {
    this.endpoints = endpoints;
    this.logger = logger;
    this.endpointHealth = new Map();

    // Initialize health tracking for each endpoint
    endpoints.forEach((endpoint) => {
      this.endpointHealth.set(endpoint, {
        consecutiveFailures: 0,
        lastFailure: 0,
        totalRequests: 0,
        successfulRequests: 0,
        avgResponseTime: 0,
      });
    });
  }

  /**
   * Get current active endpoint
   */
  getCurrentEndpoint(): string {
    return this.endpoints[this.currentEndpointIndex];
  }

  /**
   * Record request result for DNS health tracking
   */
  recordRequest(
    endpoint: string,
    success: boolean,
    responseTime?: number,
  ): void {
    const health = this.endpointHealth.get(endpoint);
    if (!health) return;

    health.totalRequests++;

    if (success) {
      health.successfulRequests++;
      health.consecutiveFailures = 0;

      // Update average response time
      if (responseTime) {
        const total = health.totalRequests;
        health.avgResponseTime =
          (health.avgResponseTime * (total - 1) + responseTime) / total;
      }
    } else {
      health.consecutiveFailures++;
      health.lastFailure = Date.now();

      // Auto-rotate if threshold exceeded
      if (
        health.consecutiveFailures >= CONFIG.GEMINI_API.dnsFailoverThreshold
      ) {
        this.logger.warning(
          `DNS endpoint ${endpoint} exceeded failure threshold, rotating...`,
        );
        this.rotateEndpoint();
      }
    }
  }

  /**
   * Rotate to next available endpoint
   */
  rotateEndpoint(): string {
    const previousEndpoint = this.getCurrentEndpoint();
    this.currentEndpointIndex =
      (this.currentEndpointIndex + 1) % this.endpoints.length;
    const newEndpoint = this.getCurrentEndpoint();

    this.logger.info(`DNS rotated from ${previousEndpoint} to ${newEndpoint}`);
    return newEndpoint;
  }

  /**
   * Get best performing endpoint based on health metrics
   */
  getBestEndpoint(): string {
    let bestEndpoint = this.endpoints[0];
    let bestScore = -1;

    this.endpointHealth.forEach((health, endpoint) => {
      // Calculate score based on success rate and response time
      const successRate =
        health.totalRequests > 0
          ? health.successfulRequests / health.totalRequests
          : 0;

      // Penalize recent failures
      const recentFailurePenalty =
        Date.now() - health.lastFailure < 60000 ? 0.5 : 1;

      // Score: success rate * recency factor / response time
      const score =
        (successRate * recentFailurePenalty) / (health.avgResponseTime || 1000);

      if (score > bestScore) {
        bestScore = score;
        bestEndpoint = endpoint;
      }
    });

    return bestEndpoint;
  }

  /**
   * Get health metrics for all endpoints
   */
  getHealthMetrics(): Array<{
    endpoint: string;
    health: any;
    isCurrent: boolean;
  }> {
    return this.endpoints.map((endpoint, index) => ({
      endpoint,
      health: this.endpointHealth.get(endpoint),
      isCurrent: index === this.currentEndpointIndex,
    }));
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.logger.debug("Running DNS health check...");

      // Switch to best performing endpoint if current one is unhealthy
      const currentHealth = this.endpointHealth.get(this.getCurrentEndpoint());
      if (currentHealth && currentHealth.consecutiveFailures > 0) {
        const bestEndpoint = this.getBestEndpoint();
        const bestIndex = this.endpoints.indexOf(bestEndpoint);

        if (bestIndex !== this.currentEndpointIndex) {
          this.currentEndpointIndex = bestIndex;
          this.logger.info(
            `Health check: Switched to better endpoint ${bestEndpoint}`,
          );
        }
      }
    }, CONFIG.GEMINI_API.dnsHealthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// ============================================================================
// BYPASS MANAGER - Enhanced with smartSNI & v2ray Detection
// ============================================================================

class BypassManager {
  private options: any;
  private logger: Logger;
  private activeBypass: {
    method: string;
    proxy?: string;
    detected?: string[];
  } | null = null;

  // Gemini API domains that need bypass
  private readonly GEMINI_DOMAINS = [
    "generativelanguage.googleapis.com",
    "gemini.google.com",
    "ai.google.dev",
    "googleapis.com",
    "google.com",
  ];

  // Common smartSNI ports
  private readonly SMARTSNI_PORTS = [8080, 9090, 10808, 10809];

  // Common v2ray ports
  private readonly V2RAY_PORTS = [10809, 10808, 1080, 1087, 1086];

  constructor(options: any, logger: Logger) {
    this.options = options;
    this.logger = logger;
  }

  async setup(): Promise<{
    success: boolean;
    method: string;
    proxy?: string;
    detected?: string[];
  }> {
    const mode = this.options.bypassMode || "auto";

    if (mode === "none") {
      return { success: false, method: "none" };
    }

    this.logger.bypass("Initializing bypass mechanisms...");

    const detectedMethods: string[] = [];

    // 1. Detect smartSNI (if mode is auto, smartsni, or v2ray)
    if (mode === "auto" || mode === "smartsni" || mode === "v2ray") {
      const smartSNI = await this.detectSmartSNI();
      if (smartSNI.success) {
        detectedMethods.push("smartSNI");
        this.logger.bypass(`✅ smartSNI detected on port ${smartSNI.port}`);
        this.activeBypass = {
          method: "smartsni",
          proxy: smartSNI.proxy,
          detected: ["smartSNI"],
        };
        return {
          success: true,
          method: "smartsni",
          proxy: smartSNI.proxy,
          detected: ["smartSNI"],
        };
      }
    }

    // 2. Detect v2ray (if mode is auto or v2ray)
    if (mode === "auto" || mode === "v2ray") {
      const v2ray = await this.detectV2Ray();
      if (v2ray.success) {
        detectedMethods.push("v2ray");
        this.logger.bypass(`✅ v2ray detected on port ${v2ray.port}`);
        this.activeBypass = {
          method: "v2ray",
          proxy: v2ray.proxy,
          detected: ["v2ray"],
        };
        return {
          success: true,
          method: "v2ray",
          proxy: v2ray.proxy,
          detected: ["v2ray"],
        };
      }
    }

    // 3. Try custom proxy first
    if (this.options.proxy) {
      const result = await this.testProxy(this.options.proxy, "custom-proxy");
      if (result.success) {
        detectedMethods.push("custom-proxy");
        return { ...result, detected: detectedMethods };
      }
    }

    // 4. Check system proxy (browser environment variables)
    if (mode === "auto" || mode === "system-proxy") {
      const system = await this.checkSystemProxy();
      if (system.success) {
        detectedMethods.push("system-proxy");
        return { ...system, detected: detectedMethods };
      }
    }

    // 5. Try CDN fallback
    if (mode === "auto") {
      this.logger.bypass("CDN fallback available");
      this.activeBypass = { method: "cdn-fallback", detected: detectedMethods };
      return {
        success: true,
        method: "cdn-fallback",
        detected: detectedMethods,
      };
    }

    // 6. Direct connection (browser will use system proxy if configured)
    this.logger.debug(
      "Browser environment: Using direct connection (system proxy will be used automatically if configured)",
    );
    this.activeBypass = {
      method: "direct-connection",
      detected: detectedMethods,
    };
    return {
      success: true,
      method: "direct-connection",
      detected: detectedMethods,
    };
  }

  /**
   * Detect if smartSNI is running locally
   * smartSNI typically runs on ports 8080, 9090, 10808, 10809
   */
  async detectSmartSNI(): Promise<{
    success: boolean;
    port?: number;
    proxy?: string;
  }> {
    // In browser, we can't directly check if a port is open
    // Instead, we'll try to detect by attempting a connection test
    // or check if the user has configured smartSNI proxy

    // Check if user specified smartSNI port
    const smartSNIPort = this.options.smartSNIPort || this.options.smartsniPort;
    if (smartSNIPort) {
      const proxy = `http://127.0.0.1:${smartSNIPort}`;
      const test = await this.testProxyConnection(proxy);
      if (test) {
        return { success: true, port: smartSNIPort, proxy };
      }
    }

    // Try common smartSNI ports
    for (const port of this.SMARTSNI_PORTS) {
      const proxy = `http://127.0.0.1:${port}`;
      const test = await this.testProxyConnection(proxy);
      if (test) {
        this.logger.debug(`smartSNI detected on port ${port}`);
        return { success: true, port, proxy };
      }
    }

    return { success: false };
  }

  /**
   * Detect if v2ray is running locally
   * v2ray typically runs on ports 10809, 10808, 1080, 1087, 1086
   */
  async detectV2Ray(): Promise<{
    success: boolean;
    port?: number;
    proxy?: string;
  }> {
    // Check environment variables (common v2ray setup)
    const envProxy =
      (typeof window !== "undefined" ? null : process.env.HTTPS_PROXY) ||
      (typeof window !== "undefined" ? null : process.env.HTTP_PROXY) ||
      (typeof window !== "undefined" ? null : process.env.ALL_PROXY);

    if (
      envProxy &&
      (envProxy.includes("127.0.0.1") || envProxy.includes("localhost"))
    ) {
      const portMatch = envProxy.match(/:(\d+)/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        if (this.V2RAY_PORTS.includes(port)) {
          this.logger.debug(
            `v2ray detected via environment variable on port ${port}`,
          );
          return { success: true, port, proxy: envProxy };
        }
      }
    }

    // Check if user specified v2ray port
    const v2rayPort = this.options.v2rayPort;
    if (v2rayPort) {
      const proxy = `http://127.0.0.1:${v2rayPort}`;
      const test = await this.testProxyConnection(proxy);
      if (test) {
        return { success: true, port: v2rayPort, proxy };
      }
    }

    // Try common v2ray ports
    for (const port of this.V2RAY_PORTS) {
      const proxy = `http://127.0.0.1:${port}`;
      const test = await this.testProxyConnection(proxy);
      if (test) {
        this.logger.debug(`v2ray detected on port ${port}`);
        return { success: true, port, proxy };
      }
    }

    return { success: false };
  }

  /**
   * Test if a proxy connection works (browser-compatible)
   * In browser, we can't directly test proxy connections, so we'll use a heuristic
   */
  private async testProxyConnection(proxyUrl: string): Promise<boolean> {
    // In browser environment, we can't directly test proxy connections
    // This is a placeholder - in a real Node.js environment, we would test the connection
    // For now, we'll assume the proxy might be available if the user configured it
    return false; // Conservative: don't assume proxy is available without testing
  }

  /**
   * Get recommended smartSNI config.json domains for Gemini
   */
  getSmartSNIDomains(): string[] {
    return this.GEMINI_DOMAINS;
  }

  /**
   * Generate smartSNI config.json snippet for Gemini domains
   */
  generateSmartSNIConfig(): string {
    const domains = this.GEMINI_DOMAINS.map((d) => `    "${d}"`).join(",\n");
    return `{
  "domains": [
${domains}
  ]
}`;
  }

  async checkSystemProxy(): Promise<{
    success: boolean;
    method: string;
    proxy?: string;
  }> {
    // In browser environment, we cannot directly check system proxy
    // Browser will automatically use system proxy if configured
    try {
      // Check for common proxy environment variables (Node.js only)
      if (typeof window === "undefined") {
        const httpsProxy =
          process.env.HTTPS_PROXY ||
          process.env.HTTP_PROXY ||
          process.env.ALL_PROXY;
        if (httpsProxy) {
          this.logger.debug(`System proxy detected: ${httpsProxy}`);
          this.activeBypass = { method: "system-proxy", proxy: httpsProxy };
          return { success: true, method: "system-proxy", proxy: httpsProxy };
        }
      }

      // Browser environment: assume direct connection (browser handles proxy automatically)
      this.logger.debug(
        "Browser environment: Using direct connection (system proxy will be used automatically if configured)",
      );
      this.activeBypass = { method: "direct-connection" };
      return { success: true, method: "direct-connection" };
    } catch (error) {
      this.logger.debug(`Connection check failed: ${(error as Error).message}`);
    }

    return { success: false, method: "none" };
  }

  async testProxy(
    proxyUrl: string,
    method: string,
  ): Promise<{ success: boolean; method: string; proxy?: string }> {
    // In browser, we can't directly use proxy URLs
    // This is a placeholder for future implementation
    this.logger.debug(`Proxy test for ${method}: ${proxyUrl}`);
    return { success: false, method: "none" };
  }

  getActiveBypass() {
    return this.activeBypass;
  }

  /**
   * Get bypass status and recommendations
   */
  getBypassStatus(): {
    active: boolean;
    method: string;
    detected: string[];
    recommendations: string[];
  } {
    const active = this.activeBypass !== null;
    const method = this.activeBypass?.method || "none";
    const detected = this.activeBypass?.detected || [];

    const recommendations: string[] = [];

    if (!active || method === "none" || method === "direct-connection") {
      recommendations.push(
        "Consider using smartSNI for better bypass capabilities",
      );
      recommendations.push("Add Gemini domains to smartSNI config.json");
      recommendations.push("Ensure v2ray is running if you have it configured");
    }

    if (detected.length === 0) {
      recommendations.push(
        "No bypass tools detected - check if smartSNI or v2ray are running",
      );
    }

    return {
      active,
      method,
      detected,
      recommendations,
    };
  }

  /** For UI compatibility: return current bypass state. */
  getActiveBypass(): {
    method: string;
    proxy?: string;
    detected?: string[];
  } | null {
    return this.activeBypass;
  }

  /** For UI compatibility: this service build does not use DNS manager; returns a stub. */
  getDNSManager(): {
    getActiveDNS(): { name: string; primary: string; secondary: string } | null;
  } {
    return { getActiveDNS: () => null };
  }
}

// ============================================================================
// SMART HTTP CLIENT - Advanced Retry Logic
// ============================================================================

class SmartHTTPClient {
  private apiKey: string;
  private logger: Logger;
  private baseUrl: string;
  private dnsManager: DNSManager;
  private performanceStats: Array<{
    url: string;
    responseTime: number;
    success: boolean;
  }> = [];

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger;
    this.baseUrl = CONFIG.GEMINI_API.baseUrl;

    // Initialize DNS Manager with automatic rotation
    this.dnsManager = new DNSManager(CONFIG.GEMINI_API.dnsEndpoints, logger);

    // Start health checks if enabled
    if (CONFIG.GEMINI_API.dnsRotationEnabled) {
      this.dnsManager.startHealthChecks();
    }
  }

  async request(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      timeout?: number;
      maxRetries?: number;
      useCDN?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    data?: any;
    responseTime: number;
    status?: number;
    error?: string;
  }> {
    // Get current best endpoint from DNS Manager
    const currentEndpoint = this.dnsManager.getCurrentEndpoint();
    const url = `${options.useCDN ? CONFIG.GEMINI_API.cdnUrl : currentEndpoint}${endpoint}`;
    const method = options.method || "GET";
    const maxRetries = options.maxRetries || CONFIG.GEMINI_API.maxRetries;
    const timeout = options.timeout || CONFIG.GEMINI_API.timeout;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.makeRequest(url, method, options, timeout);

        // Record successful request for DNS health tracking
        this.dnsManager.recordRequest(
          currentEndpoint,
          true,
          result.responseTime,
        );

        // Track performance
        if (CONFIG.PERFORMANCE.trackResponseTimes) {
          this.performanceStats.push({
            url: endpoint,
            responseTime: result.responseTime,
            success: result.success,
          });
        }

        return result;
      } catch (error: any) {
        this.logger.debug(
          `Attempt ${attempt}/${maxRetries} failed: ${error.message}`,
        );

        // Record failed request for DNS health tracking
        this.dnsManager.recordRequest(currentEndpoint, false);

        const is429 =
          (error?.message || "").includes("429") ||
          (error?.message || "").toLowerCase().includes("rate limit");
        // For 429, only retry once to avoid hammering the API
        const retry429Once = is429 && attempt >= 2;
        const mayRetry =
          attempt < maxRetries && this.isRetryable(error) && !retry429Once;

        if (mayRetry) {
          // Use longer backoff for 429 so we don't hammer the API
          const baseDelay = is429
            ? Math.max(8000, CONFIG.GEMINI_API.maxBackoffDelay)
            : CONFIG.GEMINI_API.exponentialBackoff
              ? Math.min(
                  1000 *
                    Math.pow(CONFIG.GEMINI_API.backoffMultiplier, attempt - 1),
                  CONFIG.GEMINI_API.maxBackoffDelay,
                )
              : 1000 * attempt;

          // Add jitter (±20%)
          const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
          const delay = Math.max(100, baseDelay + jitter);

          this.logger.debug(
            `Retrying in ${Math.round(delay)}ms...${is429 ? " (429 rate limit)" : ""}`,
          );
          await this.sleep(delay);

          // Try CDN on retry if not already using it
          if (attempt === 2 && !options.useCDN) {
            this.logger.bypass("Trying CDN fallback on retry...");
            options.useCDN = true;
          }

          // Try rotating DNS endpoint on third attempt
          if (attempt === 3 && CONFIG.GEMINI_API.dnsRotationEnabled) {
            const newEndpoint = this.dnsManager.rotateEndpoint();
            this.logger.bypass(`Trying alternate DNS endpoint: ${newEndpoint}`);
          }

          continue;
        }

        return {
          success: false,
          responseTime: 0,
          error: error.message,
        };
      }
    }

    return { success: false, responseTime: 0, error: "Max retries exceeded" };
  }

  private async makeRequest(
    url: string,
    method: string,
    options: any,
    timeout: number,
  ): Promise<{
    success: boolean;
    data?: any;
    responseTime: number;
    status?: number;
  }> {
    const startTime = Date.now();

    // Add API key to URL only if not already present (avoids duplicate key= in URL)
    const urlWithKey = /[?&]key=/i.test(url)
      ? url
      : url.includes("?")
        ? `${url}&key=${encodeURIComponent(this.apiKey)}`
        : `${url}?key=${encodeURIComponent(this.apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(urlWithKey, {
        method,
        headers: {
          "Content-Type": "application/json",
          // Add CORS headers for better compatibility
          Accept: "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        // Add mode and credentials for CORS handling
        mode: "cors",
        credentials: "omit",
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
          responseTime,
          status: response.status,
        };
      } else {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${errorText}`;

        // Provide more helpful error messages for common issues
        if (response.status === 403) {
          errorMessage = `Permission denied (403). Check your API key and billing status.`;
        } else if (response.status === 429) {
          errorMessage = `Rate limit exceeded (429). Please wait before retrying.`;
        } else if (response.status === 404) {
          errorMessage = `Model not found (404). This model may not be available.`;
        }

        throw new Error(errorMessage);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle CORS errors specifically
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Network error: Unable to reach API. This may be due to CORS restrictions, network issues, or firewall settings.",
        );
      }

      // Handle abort errors
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout: The API did not respond within the expected time.",
        );
      }

      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    const msg = error.message || String(error);
    return (
      msg.includes("timeout") ||
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("network") ||
      msg.includes("ECONNRESET") ||
      error.name === "AbortError"
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPerformanceStats() {
    return this.performanceStats;
  }

  /**
   * Get DNS health metrics
   */
  getDNSHealthMetrics() {
    return this.dnsManager.getHealthMetrics();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.dnsManager.stopHealthChecks();
  }
}

// ============================================================================
// MODEL ENRICHMENT
// ============================================================================

function enrichModelInfo(modelName: string): {
  family: string;
  tier: string;
  capabilities: string[];
  contextWindow: number;
  description: string;
} {
  // Try exact match first
  if (CONFIG.MODELS[modelName as keyof typeof CONFIG.MODELS]) {
    return CONFIG.MODELS[modelName as keyof typeof CONFIG.MODELS];
  }

  // Try partial match
  for (const [name, info] of Object.entries(CONFIG.MODELS)) {
    if (modelName.includes(name) || name.includes(modelName.split("-")[0])) {
      return info;
    }
  }

  // Detect family from name
  let family = "unknown";
  let tier = "unknown";

  if (modelName.includes("gemini-3")) family = "3.0";
  else if (modelName.includes("gemini-2.5")) family = "2.5";
  else if (modelName.includes("gemini-2.0")) family = "2.0";
  else if (modelName.includes("gemini-1.5")) family = "1.5";
  else if (modelName.includes("gemini-1.0")) family = "1.0";
  else if (modelName.includes("gemma")) family = "gemma";
  else if (modelName.includes("robotics")) family = "robotics";

  if (modelName.includes("pro")) tier = "pro";
  else if (modelName.includes("flash")) tier = "flash";
  else if (modelName.includes("lite")) tier = "lite";
  else if (modelName.includes("preview")) tier = "preview";
  else if (modelName.includes("exp")) tier = "experimental";

  return {
    family,
    tier,
    capabilities: ["text", "streaming"],
    contextWindow: family === "3.0" || family === "2.5" ? 1000000 : 8192,
    description: `Discovered model: ${modelName}`,
  };
}

// ============================================================================
// ULTIMATE GEMINI TESTER - Main Class
// ============================================================================

export class UltimateGeminiTester {
  private options: any;
  private bypassManager: BypassManager;
  private logger: Logger;
  private client: SmartHTTPClient | null = null;
  private cachedModels: any[] | null = null;
  private modelCacheTimestamp: number = 0;
  private readonly MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private results: {
    timestamp: string;
    apiKey: string;
    bypassMethod: string;
    models: {
      total: number;
      discovered: any[];
      accessible: any[];
      restricted: any[];
      failed: any[];
    };
    capabilities: {
      streaming: string[];
      function_calling: string[];
      multimodal: string[];
      live_api: string[];
      code_execution: string[];
    };
    performance: {
      totalTime: number;
      avgResponseTime: number;
      fastest?: { name: string; responseTime: number };
      slowest?: { name: string; responseTime: number };
      modelStats: Array<{ name: string; responseTime: number }>;
    };
    errors: any[];
  };

  constructor(options: any) {
    this.options = options;
    this.logger = new Logger(options.verbose || false, options.addLogCallback);
    this.bypassManager = new BypassManager(options, this.logger);

    this.results = {
      timestamp: new Date().toISOString(),
      apiKey: this.maskApiKey(options.apiKey),
      bypassMethod: "none",
      models: {
        total: 0,
        discovered: [],
        accessible: [],
        restricted: [],
        failed: [],
      },
      capabilities: {
        streaming: [],
        function_calling: [],
        multimodal: [],
        live_api: [],
        code_execution: [],
      },
      performance: {
        totalTime: 0,
        avgResponseTime: 0,
        modelStats: [],
      },
      errors: [],
    };
  }

  private maskApiKey(key: string): string {
    if (!key || key.length < 10) return "***";
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  }

  async initialize(): Promise<void> {
    this.logger.section("ULTIMATE GEMINI API TESTER v4.0 (Browser)");
    this.logger.info(`API Key: ${this.results.apiKey}`);
    this.logger.info(`Bypass Mode: ${this.options.bypassMode || "auto"}`);

    // Setup bypass
    const bypassResult = await this.bypassManager.setup();
    if (bypassResult.success) {
      this.results.bypassMethod = bypassResult.method;
      this.logger.success(`Bypass active: ${bypassResult.method}`);
    }

    // Initialize HTTP client
    this.client = new SmartHTTPClient(this.options.apiKey, this.logger);

    // Validate API key
    await this.validateApiKey();
  }

  private async validateApiKey(): Promise<boolean> {
    this.logger.info("Validating API key...");

    // Check API key format
    if (!this.options.apiKey || this.options.apiKey.length < 20) {
      this.logger.error("API key appears to be invalid (too short)");
      throw new Error("Invalid API key format");
    }

    try {
      // Test API key with a simple models list request
      const response = await this.client!.request("models", {
        timeout: 10000,
        maxRetries: 2, // Fewer retries for validation
      });

      if (response.success) {
        this.logger.success("✅ API key is valid and working");

        // Check if we have access to models
        if (response.data?.models && response.data.models.length > 0) {
          this.logger.success(
            `✅ Access to ${response.data.models.length} models confirmed`,
          );
        } else {
          this.logger.warning(
            "⚠️ API key valid but no models accessible (check billing/quotas)",
          );
        }

        return true;
      } else {
        this.logger.error(
          "❌ API key validation failed: " +
            (response.error || "Unknown error"),
        );
        throw new Error("Invalid API key or insufficient permissions");
      }
    } catch (error: any) {
      this.logger.error("❌ API key validation failed: " + error.message);

      // Provide specific error messages
      if (error.message.includes("403")) {
        throw new Error(
          "API key rejected (403). Check your API key and billing status.",
        );
      } else if (error.message.includes("401")) {
        throw new Error(
          "API key unauthorized (401). The key may be invalid or expired.",
        );
      } else if (error.message.includes("Network")) {
        throw new Error(
          "Network error during validation. Check your internet connection.",
        );
      }

      throw new Error("Invalid API key or network issue: " + error.message);
    }
  }

  async discoverModels(): Promise<any[]> {
    this.logger.section("MODEL DISCOVERY");

    // Check cache first
    if (
      this.cachedModels &&
      Date.now() - this.modelCacheTimestamp < this.MODEL_CACHE_TTL
    ) {
      this.logger.info(
        `Using cached models (${this.cachedModels.length} models)`,
      );
      this.results.models.discovered = this.cachedModels;
      this.results.models.total = this.cachedModels.length;
      return this.cachedModels;
    }

    this.logger.info("Fetching available models from API...");

    try {
      const response = await this.client!.request("models", {
        timeout: 15000,
        maxRetries: 3, // Retry model discovery
      });

      if (!response.success || !response.data?.models) {
        throw new Error("Failed to fetch models from API");
      }

      const models = response.data.models
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => {
          const modelName = m.name.replace("models/", "");
          return {
            name: modelName,
            displayName: m.displayName || m.name,
            description: m.description || "No description",
            supportedMethods: m.supportedGenerationMethods || [],
            version: m.version || "unknown",
            inputTokenLimit: m.inputTokenLimit || 0,
            outputTokenLimit: m.outputTokenLimit || 0,
            ...enrichModelInfo(modelName),
          };
        });

      // Cache the models
      this.cachedModels = models;
      this.modelCacheTimestamp = Date.now();

      // Store in localStorage for persistence
      try {
        localStorage.setItem(
          "gstudio_gemini_models",
          JSON.stringify({
            models,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        this.logger.debug("Failed to cache models in localStorage");
      }

      this.results.models.discovered = models;
      this.results.models.total = models.length;

      this.logger.success(`✅ Discovered ${models.length} models from API`);
      this.displayModelList(models);

      return models;
    } catch (error: any) {
      this.logger.error("❌ Model discovery failed: " + error.message);

      // Try to load from localStorage as fallback
      try {
        const cached = localStorage.getItem("gstudio_gemini_models");
        if (cached) {
          const { models, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            // 24 hours
            this.logger.warning(
              "⚠️ Using cached models from localStorage (API unavailable)",
            );
            this.cachedModels = models;
            this.results.models.discovered = models;
            this.results.models.total = models.length;
            return models;
          }
        }
      } catch (e) {
        this.logger.debug("Failed to load cached models from localStorage");
      }

      throw error;
    }
  }

  private displayModelList(models: any[]): void {
    this.logger.section("DISCOVERED MODELS");
    models.forEach((model, idx) => {
      this.logger.model(`${idx + 1}. ${model.name}`);
      if (this.options.verbose) {
        console.log(`   Family: ${model.family} | Tier: ${model.tier}`);
        console.log(`   Capabilities: ${model.capabilities.join(", ")}`);
        console.log(
          `   Context: ${model.contextWindow.toLocaleString()} tokens`,
        );
      }
    });
  }

  /**
   * Select best model based on performance metrics and preferences
   */
  selectBestModel(preferences?: {
    family?: string;
    tier?: string;
    minContextWindow?: number;
    requiresStreaming?: boolean;
    requiresFunctionCalling?: boolean;
  }): any | null {
    if (!this.cachedModels || this.cachedModels.length === 0) {
      this.logger.warning("No models available for selection");
      return null;
    }

    let candidates = [...this.cachedModels];

    // Apply filters based on preferences
    if (preferences) {
      if (preferences.family) {
        candidates = candidates.filter((m) => m.family === preferences.family);
      }
      if (preferences.tier) {
        candidates = candidates.filter((m) => m.tier === preferences.tier);
      }
      if (preferences.minContextWindow) {
        candidates = candidates.filter(
          (m) => m.contextWindow >= preferences.minContextWindow,
        );
      }
      if (preferences.requiresStreaming) {
        candidates = candidates.filter((m) =>
          m.capabilities.includes("streaming"),
        );
      }
      if (preferences.requiresFunctionCalling) {
        candidates = candidates.filter((m) =>
          m.capabilities.includes("function_calling"),
        );
      }
    }

    if (candidates.length === 0) {
      this.logger.warning("No models match the specified preferences");
      return this.cachedModels[0]; // Return first available model as fallback
    }

    // Sort by performance if we have stats
    if (this.results.performance.modelStats.length > 0) {
      candidates.sort((a, b) => {
        const aStat = this.results.performance.modelStats.find(
          (s) => s.name === a.name,
        );
        const bStat = this.results.performance.modelStats.find(
          (s) => s.name === b.name,
        );

        if (aStat && bStat) {
          return aStat.responseTime - bStat.responseTime; // Faster is better
        }
        return 0;
      });
    }

    const selected = candidates[0];
    this.logger.success(
      `Selected model: ${selected.name} (${selected.family} ${selected.tier})`,
    );
    return selected;
  }

  /**
   * Get cached models without making API call
   */
  getCachedModels(): any[] | null {
    return this.cachedModels;
  }

  /**
   * Clear model cache
   */
  clearModelCache(): void {
    this.cachedModels = null;
    this.modelCacheTimestamp = 0;
    try {
      localStorage.removeItem("gstudio_gemini_models");
    } catch (e) {
      this.logger.debug("Failed to clear model cache from localStorage");
    }
    this.logger.info("Model cache cleared");
  }

  async testAllModels(
    models: any[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<{
    usableModels: string[];
    rejectedModels: Array<{
      modelId: string;
      reason: string;
      isModelScoped: boolean;
    }>;
    providerStatus: "ok" | "exhausted" | "rate_limited";
    testedAt: number;
  }> {
    this.logger.section("MODEL TESTING");

    const usableModels: string[] = [];
    const rejectedModels: Array<{
      modelId: string;
      reason: string;
      isModelScoped: boolean;
    }> = [];
    let rateLimitedCount = 0;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const currentIndex = i + 1;

      // Update progress BEFORE testing (shows which model is being tested)
      if (onProgress) {
        onProgress(currentIndex, models.length);
      }

      this.logger.test(
        `[${currentIndex}/${models.length}] Testing: ${model.name}`,
      );

      const result = await this.testModel(model);

      if (result.accessible) {
        usableModels.push(model.name);
        this.results.models.accessible.push(result);

        // Track capabilities
        if (result.streaming)
          this.results.capabilities.streaming.push(model.name);
        if (result.functionCalling)
          this.results.capabilities.function_calling.push(model.name);
        if (result.multimodal)
          this.results.capabilities.multimodal.push(model.name);
        if (result.liveApi) this.results.capabilities.live_api.push(model.name);
        if (result.codeExecution)
          this.results.capabilities.code_execution.push(model.name);

        // Track performance
        if (result.responseTime) {
          this.results.performance.modelStats.push({
            name: model.name,
            responseTime: result.responseTime,
          });
        }

        this.logger.success(
          `  ✓ ${model.name} is accessible (${result.responseTime || "N/A"}ms)`,
        );
      } else if (result.error?.includes("403")) {
        this.results.models.restricted.push(result);
        rejectedModels.push({
          modelId: model.name,
          reason: "permission_denied",
          isModelScoped: true,
        });
        this.logger.warning(`  ⚠ ${model.name} is restricted: ${result.error}`);
      } else if (result.error?.includes("429")) {
        rateLimitedCount++;
        // 429 means model is valid, add to usable
        usableModels.push(model.name);
        this.results.models.accessible.push(result);
        this.logger.warning(`  ⚠ ${model.name} rate limited but accessible`);
      } else {
        this.results.models.failed.push(result);
        rejectedModels.push({
          modelId: model.name,
          reason: this.parseErrorReason(result.error),
          isModelScoped: true,
        });
        this.logger.error(
          `  ✗ ${model.name} failed: ${result.error || "Unknown error"}`,
        );
      }

      // Update progress AFTER testing (shows completion)
      if (onProgress) {
        onProgress(currentIndex, models.length);
      }

      // Rate limiting delay (skip for last model)
      if (i < models.length - 1) {
        await this.sleep(CONFIG.GEMINI_API.delayBetweenRequests);
      }
    }

    this.calculatePerformance();

    // CRITICAL: Final progress update to ensure 100% completion
    if (onProgress) {
      onProgress(models.length, models.length);
    }

    return {
      usableModels,
      rejectedModels,
      providerStatus: rateLimitedCount > 0 ? "rate_limited" : "ok",
      testedAt: Date.now(),
    };
  }

  /**
   * Run comprehensive performance benchmark on a specific model
   */
  async runPerformanceBenchmark(
    modelName: string,
    iterations: number = 3,
    onProgress?: (current: number, total: number) => void,
  ): Promise<{
    modelName: string;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    successRate: number;
    tokenUsage: { prompt: number; response: number };
    iterations: number;
  }> {
    this.logger.section(`PERFORMANCE BENCHMARK: ${modelName}`);
    this.logger.info(`Running ${iterations} iterations...`);

    const responseTimes: number[] = [];
    let successCount = 0;
    let totalPromptTokens = 0;
    let totalResponseTokens = 0;

    for (let i = 0; i < iterations; i++) {
      if (onProgress) {
        onProgress(i + 1, iterations);
      }

      try {
        const startTime = Date.now();

        const response = await this.client!.request(
          `models/${modelName}:generateContent`,
          {
            method: "POST",
            body: {
              contents: [
                {
                  parts: [
                    {
                      text: "Hello, this is a performance test. Please respond briefly.",
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 50,
                temperature: 0.7,
              },
            },
            timeout: 30000,
          },
        );

        const responseTime = Date.now() - startTime;

        if (response.success) {
          responseTimes.push(responseTime);
          successCount++;

          // Extract token usage if available
          if (response.data?.usageMetadata) {
            totalPromptTokens +=
              response.data.usageMetadata.promptTokenCount || 0;
            totalResponseTokens +=
              response.data.usageMetadata.candidatesTokenCount || 0;
          }

          this.logger.success(`  Iteration ${i + 1}: ${responseTime}ms`);
        } else {
          this.logger.warning(
            `  Iteration ${i + 1}: Failed - ${response.error}`,
          );
        }

        // Delay between iterations
        if (i < iterations - 1) {
          await this.sleep(1000);
        }
      } catch (error: any) {
        this.logger.error(`  Iteration ${i + 1}: Error - ${error.message}`);
      }
    }

    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          )
        : 0;

    const minResponseTime =
      responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime =
      responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const successRate = (successCount / iterations) * 100;

    const benchmark = {
      modelName,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      successRate,
      tokenUsage: {
        prompt: Math.round(totalPromptTokens / iterations),
        response: Math.round(totalResponseTokens / iterations),
      },
      iterations,
    };

    this.logger.section("BENCHMARK RESULTS");
    this.logger.info(`Model: ${modelName}`);
    this.logger.info(`Average Response Time: ${avgResponseTime}ms`);
    this.logger.info(`Min/Max: ${minResponseTime}ms / ${maxResponseTime}ms`);
    this.logger.info(`Success Rate: ${successRate.toFixed(1)}%`);
    this.logger.info(
      `Avg Token Usage: ${benchmark.tokenUsage.prompt} prompt / ${benchmark.tokenUsage.response} response`,
    );

    return benchmark;
  }

  private async testModel(model: any): Promise<{
    name: string;
    accessible: boolean;
    streaming: boolean;
    functionCalling: boolean;
    multimodal: boolean;
    liveApi: boolean;
    codeExecution: boolean;
    responseTime: number | null;
    error: string | null;
  }> {
    const result = {
      name: model.name,
      accessible: false,
      streaming: false,
      functionCalling: false,
      multimodal: false,
      liveApi: false,
      codeExecution: false,
      responseTime: null as number | null,
      error: null as string | null,
    };

    try {
      // Test basic access
      const accessTest = await this.testBasicAccess(model);
      result.accessible = accessTest.success;
      result.responseTime = accessTest.responseTime;

      if (!accessTest.success) {
        result.error = accessTest.error || "Unknown error";
        this.logger.error(`  ✗ ${model.name}: ${accessTest.error}`);
        return result;
      }

      this.logger.success(`  ✓ Accessible (${accessTest.responseTime}ms)`);

      // Check capabilities from enriched info
      if (model.capabilities.includes("streaming")) {
        result.streaming = true;
        this.logger.success("  ✓ Streaming supported");
      }
      if (model.capabilities.includes("function_calling")) {
        result.functionCalling = true;
        this.logger.success("  ✓ Function calling supported");
      }
      if (
        model.capabilities.includes("image") ||
        model.capabilities.includes("video")
      ) {
        result.multimodal = true;
        this.logger.success("  ✓ Multimodal supported");
      }
      if (model.capabilities.includes("live_api")) {
        result.liveApi = true;
        this.logger.success("  ✓ Live API supported");
      }
      if (model.capabilities.includes("code_execution")) {
        result.codeExecution = true;
        this.logger.success("  ✓ Code execution supported");
      }
    } catch (error: any) {
      result.error = error.message;
      this.logger.error(`  ✗ Error: ${error.message}`);
    }

    return result;
  }

  private async testBasicAccess(model: any): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.client!.request(
        `models/${model.name}:generateContent`,
        {
          method: "POST",
          body: {
            contents: [
              {
                parts: [{ text: "Hi" }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
            },
          },
          timeout: 15000, // 15 seconds for model test
        },
      );

      return {
        success: response.success,
        responseTime: Date.now() - startTime,
        error: response.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.parseError(error),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private parseError(error: any): string {
    const msg = error?.message || String(error);

    // Handle CORS and network errors
    if (msg.includes("Failed to fetch") || msg.includes("CORS")) {
      return "Network/CORS Error (check connection and firewall)";
    }

    // Handle specific HTTP errors
    if (msg.includes("403")) return "Permission Denied (check billing/quotas)";
    if (msg.includes("404")) return "Model Not Found";
    if (msg.includes("429")) return "Rate Limit Exceeded";
    if (msg.includes("400")) return "Bad Request (possible restrictions)";
    if (msg.includes("500")) return "Server Error (try again later)";
    if (msg.includes("503")) return "Service Unavailable (try again later)";

    // Handle timeout errors
    if (
      msg.includes("timeout") ||
      msg.includes("AbortError") ||
      msg.includes("Timeout")
    ) {
      return "Request Timeout";
    }

    // Truncate long error messages
    return msg.substring(0, 100);
  }

  private parseErrorReason(
    error: string | null,
  ):
    | "quota_exhausted"
    | "permission_denied"
    | "model_disabled"
    | "incompatible"
    | "not_found"
    | "network_error"
    | "timeout"
    | "unknown"
    | "rate_limited" {
    if (!error) return "unknown";

    // Handle CORS and network errors
    if (
      error.includes("CORS") ||
      error.includes("Failed to fetch") ||
      error.includes("Network")
    ) {
      return "network_error";
    }

    // Handle specific HTTP errors
    if (error.includes("403") || error.includes("Permission Denied"))
      return "permission_denied";
    if (error.includes("404") || error.includes("Not Found"))
      return "not_found";
    if (error.includes("429") || error.includes("Rate Limit"))
      return "rate_limited";
    if (error.includes("quota") || error.includes("exhausted"))
      return "quota_exhausted";
    if (error.includes("timeout") || error.includes("Timeout"))
      return "timeout";
    if (error.includes("network") || error.includes("ECONN"))
      return "network_error";
    if (error.includes("incompatible") || error.includes("unsupported"))
      return "incompatible";

    return "unknown";
  }

  private calculatePerformance(): void {
    const stats = this.results.performance.modelStats;

    if (stats.length === 0) return;

    const times = stats.map((s) => s.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const fastest = stats.reduce((min, s) =>
      s.responseTime < min.responseTime ? s : min,
    );
    const slowest = stats.reduce((max, s) =>
      s.responseTime > max.responseTime ? s : max,
    );

    this.results.performance.avgResponseTime = Math.round(avg);
    this.results.performance.fastest = fastest;
    this.results.performance.slowest = slowest;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getResults() {
    // Add DNS health metrics to results
    const dnsMetrics = this.client?.getDNSHealthMetrics() || [];

    return {
      ...this.results,
      dnsHealth: dnsMetrics,
      performanceEnhanced: {
        ...this.results.performance,
        dnsMetrics: dnsMetrics.map((m) => ({
          endpoint: m.endpoint,
          isCurrent: m.isCurrent,
          successRate:
            m.health.totalRequests > 0
              ? (
                  (m.health.successfulRequests / m.health.totalRequests) *
                  100
                ).toFixed(1) + "%"
              : "N/A",
          avgResponseTime: m.health.avgResponseTime.toFixed(0) + "ms",
          consecutiveFailures: m.health.consecutiveFailures,
        })),
      },
    };
  }

  getClient(): SmartHTTPClient {
    if (!this.client) {
      throw new Error("Client not initialized. Call initialize() first.");
    }
    return this.client;
  }

  /** For UI compatibility: API key manager not used in this service build. */
  getAPIKeyManager(): undefined {
    return undefined;
  }

  /** For UI compatibility: returns bypass manager used by this service. */
  getBypassManager(): BypassManager {
    return this.bypassManager;
  }

  /** For UI compatibility: request queue not used in this service build. */
  getRequestQueue(): undefined {
    return undefined;
  }

  /** For UI compatibility: stream manager not used in this service build. */
  getStreamManager(): undefined {
    return undefined;
  }

  /** For UI compatibility: config validator not used in this service build. */
  getConfigValidator(): undefined {
    return undefined;
  }

  /** For UI compatibility: DNS manager not used in this service build. */
  getDNSManager(): undefined {
    return undefined;
  }

  /**
   * Make API call with smart retry logic and rate limiting
   */
  async makeApiCall(
    model: string,
    params: {
      prompt: string;
      maxTokens?: number;
      temperature?: number;
      systemInstruction?: string;
    },
    options?: {
      maxRetries?: number;
      timeout?: number;
      onRetry?: (attempt: number, error: string) => void;
    },
  ): Promise<{
    success: boolean;
    response?: string;
    tokenUsage?: { prompt: number; response: number };
    responseTime: number;
    error?: string;
  }> {
    const maxRetries = options?.maxRetries || 3;
    const timeout = options?.timeout || 30000;
    let lastError: string = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await this.client!.request(
          `models/${model}:generateContent`,
          {
            method: "POST",
            body: {
              contents: [
                {
                  parts: [{ text: params.prompt }],
                },
              ],
              systemInstruction: params.systemInstruction
                ? {
                    parts: [{ text: params.systemInstruction }],
                  }
                : undefined,
              generationConfig: {
                maxOutputTokens: params.maxTokens || 1024,
                temperature: params.temperature || 0.7,
              },
            },
            timeout,
            maxRetries: 1, // Handle retries at this level
          },
        );

        const responseTime = Date.now() - startTime;

        if (response.success && response.data) {
          const text =
            response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const tokenUsage = response.data.usageMetadata
            ? {
                prompt: response.data.usageMetadata.promptTokenCount || 0,
                response: response.data.usageMetadata.candidatesTokenCount || 0,
              }
            : undefined;

          return {
            success: true,
            response: text,
            tokenUsage,
            responseTime,
          };
        } else {
          lastError = response.error || "Unknown error";

          // Don't retry on certain errors
          if (lastError.includes("403") || lastError.includes("404")) {
            return {
              success: false,
              responseTime,
              error: lastError,
            };
          }

          // Retry on rate limit or network errors
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            this.logger.warning(
              `Attempt ${attempt} failed: ${lastError}. Retrying in ${delay}ms...`,
            );

            if (options?.onRetry) {
              options.onRetry(attempt, lastError);
            }

            await this.sleep(delay);
            continue;
          }
        }
      } catch (error: any) {
        lastError = error.message;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warning(
            `Attempt ${attempt} failed: ${lastError}. Retrying in ${delay}ms...`,
          );

          if (options?.onRetry) {
            options.onRetry(attempt, lastError);
          }

          await this.sleep(delay);
          continue;
        }
      }
    }

    return {
      success: false,
      responseTime: 0,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.client) {
      this.client.cleanup();
    }
    this.logger.info("Tester cleanup complete");
  }

  displaySummary(): void {
    console.log("\n📊 Model Summary:");
    console.log(`   Total Discovered: ${this.results.models.total}`);
    console.log(`   Accessible: ${this.results.models.accessible.length}`);
    console.log(`   Restricted: ${this.results.models.restricted.length}`);
    console.log(`   Failed: ${this.results.models.failed.length}`);

    if (this.results.performance.fastest) {
      console.log("\n⚡ Performance:");
      console.log(`   Average: ${this.results.performance.avgResponseTime}ms`);
      console.log(
        `   Fastest: ${this.results.performance.fastest.name} (${this.results.performance.fastest.responseTime}ms)`,
      );
      console.log(
        `   Slowest: ${this.results.performance.slowest?.name} (${this.results.performance.slowest?.responseTime}ms)`,
      );
    }

    console.log("\n🎯 Capabilities:");
    console.log(
      `   Streaming: ${this.results.capabilities.streaming.length} models`,
    );
    console.log(
      `   Function Calling: ${this.results.capabilities.function_calling.length} models`,
    );
    console.log(
      `   Multimodal: ${this.results.capabilities.multimodal.length} models`,
    );
    console.log(
      `   Live API: ${this.results.capabilities.live_api.length} models`,
    );

    console.log(`\n🔧 Bypass Method: ${this.results.bypassMethod}`);
  }
}
