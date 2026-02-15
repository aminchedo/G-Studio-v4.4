/**
 * GeminiService - SINGLE GUARDED ENTRY POINT for all Gemini API calls
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. ALL Gemini API calls MUST go through streamChat() or chatNonStreaming()
 * 2. API Model Test MUST be executed before any call (enforced at entry)
 * 3. Only models from usableModels may be used (enforced at entry)
 * 4. Rejected models are PERMANENTLY banned for the session
 * 5. FatalAIError MUST propagate - never swallowed, healed, or retried
 *
 * RETRY POLICY (QUOTA SAFETY):
 * - 429 on rejected model = TERMINAL (FatalAIError, no retry)
 * - Provider exhaustion = TERMINAL (FatalAIError, no retry)
 * - CODE_BUG = TERMINAL (no retry, no fallback)
 * - CONFIG_FAILURE = TERMINAL (no retry, no fallback)
 * - INFRA_FAILURE (500/502/503/504) = MAX 1 retry on same model, then fallback
 * - MODEL_FAILURE = Fallback to next model (no retry on same model)
 *
 * Retries are FORBIDDEN for quota-related errors because:
 * - Quota exhaustion is a billing/account issue, not transient
 * - Retrying wastes API quota on requests that will fail
 * - User must take explicit action (check quota, upgrade plan)
 */

import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  UsageMetadata,
} from "@google/genai";
import { ModelId, Message, ToolCall } from "@/types";
import { FILE_TOOLS } from "@/constants";
import { ContextManager } from "./contextManager";
import { ResponseCache } from "./responseCache";
import { recordTelemetry } from "./modelTelemetryService";
// Dry import - not used yet (Step 2: Safe Import Only)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { runLLM as runLLMNew } from "../llm";
import {
  shouldUseNewGateway,
  getConfigSummary,
  ENABLE_NEW_LLM_GATEWAY,
} from "@/llm/config";
// Import new agent layer for integration
import { runAgent, getAgentStats } from "@/llm/agent";
import { recordMetric, exportMetrics } from "@/llm/telemetry";
import { getRemainingQuota } from "@/llm/quota";
import {
  NetworkReliabilityService,
  NetworkErrorType,
} from "./networkReliabilityService";
import { NetworkReliabilityVerification } from "./networkReliabilityVerification";
import { RuntimeGuardrails } from "./runtimeGuardrails";
import {
  AIBehaviorValidation,
  ClassificationResult,
  FailureType,
  NotificationContext,
} from "./aiBehaviorValidation";
import { ModelFallbackManager, FallbackState } from "./modelFallbackManager";
import { CircuitBreaker } from "./circuitBreaker";
import { ProviderLimit, ProviderLimitResult } from "./providerLimit";
import { DegradedMode } from "./degradedMode";
// Import smart layer for intelligent API requests with bypass/DNS
import { GeminiSmartLayer } from "./geminiSmartLayer";

// ============================================================================
// ROBUST API CLIENT - With Automatic Retry and Error Recovery
// ============================================================================

interface Logger {
  info(msg: string, data?: any): void;
  success(msg: string, data?: any): void;
  warning(msg: string, data?: any): void;
  error(msg: string, data?: any): void;
  debug(msg: string, data?: any): void;
}

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
  ) {
    const maxRetries = options.maxRetries ?? 3;
    const timeout = options.timeout ?? 30000;
    let lastError: any = null;

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

        // Use ErrorCategorizer for better error messages
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
          const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
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

    // Categorize final error
    const finalErrorInfo = ErrorCategorizer.categorize(
      lastError || new Error("Max retries exceeded"),
    );

    return {
      success: false,
      error: lastError?.message || "Max retries exceeded",
      status: lastError?.status || 0,
      retryable: true,
      errorInfo: finalErrorInfo,
    };
  }

  async makeRequest(
    endpoint: string,
    options: { method?: string; headers?: Record<string, string>; body?: any },
    timeout: number,
  ) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${endpoint}?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Capture response body and headers to aid diagnostics (429, 404, etc.)
        let bodyText: string | undefined;
        try {
          bodyText = await response.text();
        } catch (e) {
          bodyText = undefined;
        }

        const error: Error & {
          status?: number;
          body?: string | undefined;
          retryAfter?: number | undefined;
          headers?: Record<string, string> | undefined;
        } = new Error(`HTTP ${response.status}: ${bodyText || "(no body)"}`);
        error.status = response.status;
        error.body = bodyText;
        try {
          const ra = response.headers.get("Retry-After");
          if (ra) {
            const parsed = parseInt(ra, 10);
            if (!Number.isNaN(parsed)) {
              error.retryAfter = parsed;
            }
          }
        } catch {}
        // Attach headers minimally
        try {
          const h: Record<string, string> = {};
          response.headers.forEach((v, k) => (h[k] = v));
          error.headers = h;
        } catch {}

        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError: Error & { status?: number } = new Error(
          "Request timeout",
        );
        timeoutError.status = 0;
        throw timeoutError;
      }
      throw error;
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
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
// ERROR CATEGORIZER - Enhanced Error Handling
// ============================================================================

class ErrorCategorizer {
  static categorize(error: any) {
    const msg = error?.message || String(error);
    const status = error?.status || error?.response?.status;

    // DNS/Network Errors
    if (
      msg.includes("network") ||
      msg.includes("ECONN") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("timeout") ||
      error.name === "AbortError" ||
      msg.includes("fetch")
    ) {
      return {
        category: "network",
        type: "dns_network_error",
        severity: "high",
        retryable: true,
        action: "retry_with_backoff",
        message: "Network or DNS resolution error. Check internet connection.",
        suggestedFix:
          "Verify internet connection, try different DNS server, or check proxy settings.",
      };
    }

    // Rate Limiting Errors
    if (
      status === 429 ||
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("exceeded")
    ) {
      return {
        category: "rate_limit",
        type: "rate_limit_exceeded",
        severity: "medium",
        retryable: true,
        action: "retry_with_exponential_backoff",
        message: "Rate limit exceeded. Too many requests.",
        suggestedFix:
          "Wait before retrying, use API key rotation, or reduce request frequency.",
      };
    }

    // Authentication Errors
    if (
      status === 401 ||
      status === 403 ||
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("permission")
    ) {
      return {
        category: "authentication",
        type: status === 401 ? "unauthorized" : "forbidden",
        severity: "critical",
        retryable: false,
        action: "check_credentials",
        message:
          status === 401
            ? "Unauthorized. Invalid API key."
            : "Forbidden. Check API key permissions.",
        suggestedFix:
          "Verify API key is correct and has proper permissions/billing enabled.",
      };
    }

    // Server Errors
    if (
      (status && status >= 500) ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("server error")
    ) {
      return {
        category: "server",
        type: "server_error",
        severity: "medium",
        retryable: true,
        action: "retry_with_backoff",
        message: "Server error. API service temporarily unavailable.",
        suggestedFix: "Retry after a short delay. This is usually temporary.",
      };
    }

    // Not Found Errors
    if (status === 404 || msg.includes("404") || msg.includes("not found")) {
      return {
        category: "not_found",
        type: "resource_not_found",
        severity: "low",
        retryable: false,
        action: "check_endpoint",
        message: "Resource not found. Invalid endpoint or model.",
        suggestedFix: "Verify the endpoint URL and model name are correct.",
      };
    }

    // Bad Request Errors
    if (
      status === 400 ||
      msg.includes("400") ||
      msg.includes("bad request") ||
      msg.includes("invalid")
    ) {
      return {
        category: "client_error",
        type: "bad_request",
        severity: "medium",
        retryable: false,
        action: "check_request",
        message: "Bad request. Invalid request parameters.",
        suggestedFix: "Check request body, parameters, and format.",
      };
    }

    // Unknown/Generic Errors
    return {
      category: "unknown",
      type: "unknown_error",
      severity: "low",
      retryable: true,
      action: "retry_with_backoff",
      message: msg.substring(0, 100),
      suggestedFix: "Check error details and try again.",
    };
  }

  static getRetryDelay(category: string, attempt: number, baseDelay = 1000) {
    if (category === "rate_limit") {
      return Math.min(baseDelay * Math.pow(2, attempt), 60000); // Max 60 seconds
    }

    if (category === "network" || category === "server") {
      return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    }

    return baseDelay * (attempt + 1);
  }
}

/**
 * Safely extract useful fields from various error shapes for logging.
 */
function formatErrorForLogging(error: any) {
  try {
    return {
      name: error?.name || null,
      message: error?.message || String(error) || null,
      status: error?.status || error?.code || null,
      body: error?.body || error?.response?.body || null,
      retryAfter: error?.retryAfter || null,
      headers:
        error?.headers ||
        (error?.response?.headers ? error.response.headers : null) ||
        null,
      stack: error?.stack ? error.stack.substring(0, 1000) : null,
    };
  } catch (e) {
    return { message: String(error) };
  }
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const GEMINI_MODEL_CONFIG = {
  GEMINI_API: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
  MODELS: {
    "gemini-3-pro": {
      family: "3.0",
      tier: "pro",
      capabilities: ["text", "image", "video", "audio", "streaming"],
    },
    "gemini-3-flash": {
      family: "3.0",
      tier: "flash",
      capabilities: ["text", "image", "streaming"],
    },
    "gemini-2.5-pro": {
      family: "2.5",
      tier: "pro",
      capabilities: ["text", "image", "video", "audio", "streaming"],
    },
    "gemini-2.5-flash": {
      family: "2.5",
      tier: "flash",
      capabilities: ["text", "image", "streaming"],
    },
    "gemini-2.5-flash-lite": {
      family: "2.5",
      tier: "lite",
      capabilities: ["text", "image", "streaming"],
    },
    "gemini-2.0-flash": {
      family: "2.0",
      tier: "flash",
      capabilities: ["text", "image", "streaming"],
    },
    "gemini-2.0-flash-lite": {
      family: "2.0",
      tier: "lite",
      capabilities: ["text", "streaming"],
    },
  },
  RECOMMENDATIONS: {
    bestForSpeed: "gemini-2.5-flash-lite",
    bestForQuality: "gemini-3-pro",
    bestForBalance: "gemini-2.5-flash",
    bestForLatest: "gemini-3-flash",
  },
};

/**
 * One-shot diagnostic to verify model connectivity and correctness.
 * This function MUST succeed before any higher-level logic is trusted.
 *
 * @param modelId - The model ID to test (must be a discovered/validated model)
 * @param apiKey - The API key to use
 * @returns Diagnostic result with success status and response text or error
 */
export async function runModelDiagnosticTest(
  modelId: string,
  apiKey: string,
): Promise<{ ok: true; responseText: string } | { ok: false; error: string }> {
  try {
    // 1. Minimal, deterministic prompt
    const prompt = "Say only the number 42.";

    // 2. Minimal valid request payload (TEXT only)
    const requestPayload = {
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        topP: 1,
        maxOutputTokens: 16,
      },
    };

    console.info("[Diagnostic] Sending request", {
      modelId,
      requestPayload,
    });

    // 3. Execute model call
    if (typeof GoogleGenAI === "undefined") {
      throw new Error(
        "GoogleGenAI SDK is not available in this runtime (likely the browser). Gemini API calls must run server-side or via a proxy.",
      );
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent(requestPayload);

    console.info("[Diagnostic] Raw response", response);

    // 4. Safe response extraction
    const text =
      response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        ?.filter((t: any) => t)
        ?.join("")
        ?.trim() || "";

    if (!text) {
      return {
        ok: false,
        error: "Model responded but no text could be extracted",
      };
    }

    // 5. Hard correctness check
    if (!text.includes("42")) {
      return {
        ok: false,
        error: `Unexpected response content: "${text}"`,
      };
    }

    console.info("[Diagnostic] SUCCESS", {
      modelId,
      responseText: text,
    });

    return {
      ok: true,
      responseText: text,
    };
  } catch (err: any) {
    console.error("[Diagnostic] FAILURE", err);
    return {
      ok: false,
      error: err?.message ?? "Unknown error",
    };
  }
}

/**
 * Convenience wrapper that runs diagnostic test on the active model.
 * Automatically retrieves the active model from ModelValidationStore.
 *
 * @param apiKey - The API key to use
 * @returns Diagnostic result with success status and response text or error
 *
 * @example
 * ```ts
 * const result = await runActiveModelDiagnostic(apiKey);
 * if (result.ok) {
 *   console.log('Active model is healthy:', result.responseText);
 * } else {
 *   console.error('Active model diagnostic failed:', result.error);
 * }
 * ```
 */
export async function runActiveModelDiagnostic(
  apiKey: string,
): Promise<
  | { ok: true; responseText: string; modelId: string }
  | { ok: false; error: string; modelId?: string }
> {
  const { ModelValidationStore } = await import("./modelValidationStore");
  const activeModel = ModelValidationStore.getActiveModel(apiKey);

  if (!activeModel) {
    return {
      ok: false,
      error:
        'No active model found. Please run "API Model Test" first to discover models.',
    };
  }

  const result = await runModelDiagnosticTest(activeModel.id, apiKey);

  if (result.ok) {
    return {
      ok: true,
      responseText: result.responseText,
      modelId: activeModel.id,
    };
  } else {
    return {
      ok: false,
      error: "error" in result ? result.error : "Unknown error occurred",
      modelId: activeModel.id,
    };
  }
}

export class GeminiService {
  /**
   * Cache for discovered models (key: apiKey hash, value: { models, timestamp })
   * Cache TTL: 5 minutes
   */
  private static modelDiscoveryCache: Map<
    string,
    { models: string[]; timestamp: number }
  > = new Map();
  private static readonly MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Test if a model actually responds (ACTIVE VALIDATION)
   * Similar to gemini_api_tester_ui.html approach
   * STRICT: Only returns success on actual successful response
   *
   * NOTE: This method is ONLY used by ModelTestingService during API Model Test.
   * It should NOT be called directly for user requests.
   *
   * Enhanced with RobustAPIClient and ErrorCategorizer for better error handling.
   *
   * @param apiKey - API key to use for testing
   * @param modelId - Model ID to test
   * @param timeout - Timeout in milliseconds (default: 2000)
   * @param testMessage - Test message to send (default: 'ping')
   * @returns Object with success status and failure reason if failed
   */
  private static async testModelResponse(
    apiKey: string,
    modelId: string,
    timeout: number = 2000,
    testMessage: string = "ping",
  ): Promise<{
    success: boolean;
    failureReason?:
      | "quota_exhausted"
      | "permission_denied"
      | "model_disabled"
      | "not_found"
      | "network_error"
      | "timeout"
      | "unknown";
  }> {
    // Create a simple logger for the API client
    const logger: Logger = {
      info: (msg: string) => console.log(`[RobustAPIClient] ${msg}`),
      success: (msg: string) => console.log(`[RobustAPIClient] ✓ ${msg}`),
      warning: (msg: string) => console.warn(`[RobustAPIClient] ⚠ ${msg}`),
      error: (msg: string) => console.error(`[RobustAPIClient] ✗ ${msg}`),
      debug: (msg: string) => console.debug(`[RobustAPIClient] ${msg}`),
    };

    const client = new RobustAPIClient(apiKey, logger);

    try {
      const result = await client.request(`models/${modelId}:generateContent`, {
        method: "POST",
        timeout: timeout,
        maxRetries: 1, // Single attempt for quick test
        body: {
          contents: [{ parts: [{ text: testMessage }] }],
          generationConfig: { maxOutputTokens: 10 }, // Small response for quick test
        },
      });

      if (
        result.success &&
        result.data?.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        console.log(
          `[GeminiService] ✓ Model ${modelId} verified - responded successfully`,
        );
        return { success: true };
      }

      // Use ErrorCategorizer for better error handling
      const errorInfo =
        result.errorInfo ||
        ErrorCategorizer.categorize({
          status: result.status,
          message: result.error || "Unknown error",
        });

      // Map error categories to failure reasons
      if (
        errorInfo.category === "rate_limit" ||
        (errorInfo.category === "authentication" && result.status === 429)
      ) {
        const errorMsg = (result.error || "").toLowerCase();
        const isPermanent =
          errorMsg.includes("limit: 0") || errorMsg.includes("limit = 0");

        if (isPermanent) {
          console.warn(
            `[GeminiService] ✗ Model ${modelId} has PERMANENT quota exhaustion (limit: 0) - TERMINAL`,
          );
          return { success: false, failureReason: "quota_exhausted" };
        } else {
          console.warn(
            `[GeminiService] ✗ Model ${modelId} has rate limit (429) - marking as unavailable`,
          );
          return { success: false, failureReason: "quota_exhausted" };
        }
      }

      if (errorInfo.category === "authentication") {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} permission denied - marking as unavailable`,
        );
        return { success: false, failureReason: "permission_denied" };
      }

      if (errorInfo.category === "not_found") {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} not found or disabled - marking as unavailable`,
        );
        return { success: false, failureReason: "model_disabled" };
      }

      if (
        errorInfo.category === "network" ||
        errorInfo.type === "dns_network_error"
      ) {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} network error: ${errorInfo.message}`,
        );
        return { success: false, failureReason: "network_error" };
      }

      // Timeout handling
      if (
        result.error?.includes("timeout") ||
        result.error?.includes("AbortError")
      ) {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} test timeout - marking as failed`,
        );
        return { success: false, failureReason: "timeout" };
      }

      console.warn(
        `[GeminiService] ✗ Model ${modelId} test failed: ${errorInfo.message}`,
      );
      return { success: false, failureReason: "unknown" };
    } catch (error: any) {
      // Fallback error handling
      const errorInfo = ErrorCategorizer.categorize(error);

      if (
        error.name === "AbortError" ||
        (errorInfo.category === "network" &&
          errorInfo.type === "dns_network_error")
      ) {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} test timeout - marking as failed`,
        );
        return { success: false, failureReason: "timeout" };
      } else if (errorInfo.category === "network") {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} network error: ${error.message}`,
        );
        return { success: false, failureReason: "network_error" };
      } else {
        console.warn(
          `[GeminiService] ✗ Model ${modelId} test error: ${error.message}`,
        );
        return { success: false, failureReason: "unknown" };
      }
    }
  }

  /**
   * Get model configuration from GEMINI_MODEL_CONFIG
   * @param modelId - Model ID to get configuration for
   * @returns Model configuration or null if not found
   */
  static getModelConfig(
    modelId: string,
  ): { family: string; tier: string; capabilities: string[] } | null {
    const config =
      GEMINI_MODEL_CONFIG.MODELS[
        modelId as keyof typeof GEMINI_MODEL_CONFIG.MODELS
      ];
    if (config) {
      return config;
    }

    // Try to infer from model name
    const family = this.getFamilyFromName(modelId);
    const tier = this.getTierFromName(modelId);
    const capabilities = ["text"]; // Default

    if (family !== "unknown" || tier !== "standard") {
      return { family, tier, capabilities };
    }

    return null;
  }

  /**
   * Get family from model name
   */
  private static getFamilyFromName(name: string): string {
    if (name.includes("gemini-3")) return "3.0";
    if (name.includes("gemini-2.5")) return "2.5";
    if (name.includes("gemini-2.0")) return "2.0";
    if (name.includes("gemini-1.5")) return "1.5";
    if (name.includes("gemini-1.0") || name === "gemini-pro") return "1.0";
    if (name.includes("gemma")) return "gemma";
    return "unknown";
  }

  /**
   * Get tier from model name
   */
  private static getTierFromName(name: string): string {
    if (name.includes("pro")) return "pro";
    if (name.includes("flash")) return "flash";
    if (name.includes("lite")) return "lite";
    if (name.includes("ultra")) return "ultra";
    if (name.includes("nano")) return "nano";
    return "standard";
  }

  /**
   * Get recommended model based on use case
   * @param useCase - Use case: 'speed', 'quality', 'balance', 'latest'
   * @returns Recommended model ID or null
   */
  static getRecommendedModel(
    useCase: "speed" | "quality" | "balance" | "latest",
  ): string | null {
    const key =
      `bestFor${useCase.charAt(0).toUpperCase() + useCase.slice(1)}` as keyof typeof GEMINI_MODEL_CONFIG.RECOMMENDATIONS;
    return GEMINI_MODEL_CONFIG.RECOMMENDATIONS[key] || null;
  }

  /**
   * Discover available models for the given API key
   * SINGLE SOURCE OF TRUTH: This function ONLY reads from ModelValidationStore
   * It does NOT probe models - testing happens ONLY in ModelTestingService (called from test button)
   *
   * Enhanced with RobustAPIClient for better API communication.
   *
   * @param apiKey - The API key to use for discovery
   * @returns Array of verified working model IDs (ONLY models that passed test from test button)
   */
  static async discoverAvailableModels(apiKey: string): Promise<string[]> {
    if (!apiKey || apiKey.trim() === "") {
      return [];
    }

    // Import ModelValidationStore
    const { ModelValidationStore } = await import("./modelValidationStore");

    // Check provider status - if exhausted, return empty array
    const providerStatus = ModelValidationStore.getProviderStatus(apiKey);
    if (providerStatus === "exhausted") {
      const { DegradedMode } = await import("./degradedMode");
      const { ProviderLimit } = await import("./providerLimit");
      if (!DegradedMode.isDegraded("gemini")) {
        const providerLimit = ProviderLimit.create("gemini", 30);
        DegradedMode.enterDegradedMode("gemini", providerLimit.cooldownUntil!);
        console.warn(
          `[GeminiService] Provider exhausted - entering degraded mode`,
        );
      }
      return [];
    }

    // Get validated models from store (ONLY source of truth)
    const validatedModels = ModelValidationStore.getValidatedModels(apiKey);

    if (validatedModels.length > 0) {
      console.log(
        `[GeminiService] Using ${validatedModels.length} validated models from store:`,
        validatedModels,
      );
      return validatedModels;
    }

    // No validated models - return empty array
    // Models must be tested via "API Model Test" button first
    console.warn(
      `[GeminiService] No validated models found. Please run "API Model Test" first.`,
    );
    return [];
  }

  /**
   * Get detailed model information (like HTML tester)
   * Returns full model details including token limits
   *
   * @param apiKey - API key to use
   * @param options - Optional configuration (same as discoverAvailableModels)
   * @returns Array of model details with full information
   */
  static async getModelDetails(
    apiKey: string,
    options?: {
      testModels?: boolean;
      testTimeout?: number;
      testOnlyPriority?: boolean;
    },
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      inputTokenLimit: number | string;
      outputTokenLimit: number | string;
      tested: boolean;
    }>
  > {
    // ACTIVE VALIDATION: Get only verified working models
    // SINGLE SOURCE OF TRUTH: Get validated models from store
    const availableModels = await this.discoverAvailableModels(apiKey);

    if (availableModels.length === 0) {
      return [];
    }

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          encodeURIComponent(apiKey),
      );

      if (!response.ok) {
        return availableModels.map((modelId) => ({
          id: modelId,
          name: modelId,
          description: "Unknown",
          inputTokenLimit: "Unknown",
          outputTokenLimit: "Unknown",
          tested: options?.testModels || false,
        }));
      }

      const data = await response.json();

      return availableModels.map((modelId) => {
        const model = data.models?.find(
          (m: any) => m.name === `models/${modelId}`,
        );
        return {
          id: modelId,
          name: model?.displayName || modelId,
          description: model?.description || "No description",
          inputTokenLimit: model?.inputTokenLimit || "Unknown",
          outputTokenLimit: model?.outputTokenLimit || "Unknown",
          tested: options?.testModels || false,
        };
      });
    } catch (error) {
      return availableModels.map((modelId) => ({
        id: modelId,
        name: modelId,
        description: "Unknown",
        inputTokenLimit: "Unknown",
        outputTokenLimit: "Unknown",
        tested: false,
      }));
    }
  }

  /**
   * Format history with token optimization
   * Only sends minimal relevant context, not full history
   * NEVER sends internal fields like thoughtSignature, toolCalls, etc.
   */
  private static formatHistory(
    messages: Message[],
    currentMessage: string,
    modelId: ModelId,
    useMinimalContext: boolean = true,
  ): Content[] {
    // OPTIMIZATION: Use context manager to extract only relevant context
    // Instead of sending full history, send only:
    // 1. Latest user message
    // 2. Minimal relevant context chunks

    // NOTE: extractRelevantContext is async, but formatHistory is sync
    // For now, use fallback method to ensure we always return an array
    // TODO: Consider making formatHistory async if needed
    if (useMinimalContext && messages.length > 2) {
      // Use fallback method for now (extractRelevantContext is async)
      // This ensures we always return an array synchronously
      // The async version can be used in a future refactor
    }

    // Fallback: Only include last few messages for small conversations
    // Filter out ALL internal fields - only send user-visible content
    const validMessages = messages
      .filter((msg) => {
        // NEVER include function messages with toolCalls - those are internal
        if (msg.role === "function") {
          return false; // Function messages are internal artifacts
        }

        // Only include messages with actual text content
        // Context safety: msg.content is NOT guaranteed to be a string
        // CRITICAL FIX: Normalize content before checking
        const contentText = this.normalizeContentToText(msg.content);
        if (!contentText || contentText.trim().length === 0) {
          return false;
        }

        // NEVER include toolCalls in history - they're internal
        // Only send text content
        return true;
      })
      .slice(-10); // Limit to last 10 messages max

    // Convert to API format - ONLY role and text content
    // NEVER send: toolCalls, thoughtSignature, reasoning, chain_of_thought, functionCall
    const result = validMessages
      .map((msg) => {
        const parts: Part[] = [];

        // Handle image (if present)
        if (msg.image) {
          const base64Data = msg.image.split(",")[1] || msg.image;
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          });
        }

        // ONLY send text content - never toolCalls or internal fields
        // Context safety: msg.content is NOT guaranteed to be a string
        // CRITICAL FIX: Normalize content before using
        const contentText = this.normalizeContentToText(msg.content);
        if (contentText && contentText.trim()) {
          parts.push({ text: contentText });
        }

        if (parts.length === 0) {
          return null;
        }

        // CRITICAL: Gemini API ONLY accepts 'user' and 'model' roles
        // ALLOWED_ROLES = ["user", "model"]
        // Forbidden roles: system, function, tool, assistant, any unknown role
        const ALLOWED_ROLES: ("user" | "model")[] = ["user", "model"];
        const role = msg.role;

        // Validate role - throw CODE_BUG immediately for invalid roles
        if (!ALLOWED_ROLES.includes(role as "user" | "model")) {
          throw new Error(
            `CODE_BUG: Invalid role '${role}' in message history. Gemini API only accepts 'user' or 'model' roles. Forbidden roles: system, function, tool, assistant, and any unknown role.`,
          );
        }

        return {
          role: role as "user" | "model",
          parts: parts,
        } as Content;
      })
      .filter((msg): msg is Content => msg !== null && msg !== undefined);

    // RUNTIME GUARD: Ensure we always return an array (never null/undefined)
    // This prevents any possibility of contents.push failing
    // The map().filter() above should always return an array, but this is a safety net
    return Array.isArray(result) ? result : [];
  }

  // Helper function to convert ModelId to API model name
  private static modelIdToApiName(modelId: ModelId): string {
    const mapping: Record<ModelId, string> = {
      [ModelId.Gemini3FlashPreview]: "gemini-3-flash-preview",
      [ModelId.Gemini3ProPreview]: "gemini-3-pro-preview",
      [ModelId.GeminiFlashLatest]: "gemini-flash-latest",
      [ModelId.GeminiFlashLiteLatest]: "gemini-flash-lite-latest",
    };
    return mapping[modelId] || modelId.toString();
  }

  static async *streamChat(
    modelId: ModelId,
    history: Message[],
    newPrompt: string,
    image?: string,
    systemInstruction?: string,
    apiKey?: string,
    useCache: boolean = true,
    useMinimalContext: boolean = true,
    apiKeyValidated: boolean = false,
    requestId?: string,
  ): AsyncGenerator<
    {
      text?: string;
      toolCalls?: ToolCall[];
      usage?: UsageMetadata;
      providerLimit?: ProviderLimitResult;
    },
    void,
    unknown
  > {
    // CRITICAL: requestId MUST be provided - never generate as fallback
    // This violates the global invariant that requestId must propagate explicitly
    if (!requestId) {
      throw new Error(
        "requestId is required. It must be generated in UI layer and passed explicitly through the pipeline.",
      );
    }
    const finalRequestId = requestId;

    // ==================== 429 COOLDOWN CHECK (MUST BE FIRST) ====================
    // CRITICAL: Check 429 cooldown at the VERY START, before ANY processing
    // This prevents requests from even starting if we're in cooldown
    // Import StreamLifecycleManager early for cooldown check
    const { StreamLifecycleManager } = await import("./streamLifecycleManager");
    const { StreamingMonitor } = await import("./streamingMonitor");

    // OPTIMIZATION: If in cooldown, use non-streaming directly (like HTML tester)
    // This avoids hitting rate limits on streaming endpoint
    if (StreamLifecycleManager.isInCooldown(apiKey || "")) {
      const remaining = StreamLifecycleManager.getRemainingCooldown(
        apiKey || "",
      );
      console.log(
        `[GeminiService][requestId=${finalRequestId}]: Cooldown active - using non-streaming directly (HTML tester mode). Remaining: ${remaining}ms`,
      );

      // Record cooldown status with real-time monitor
      StreamingMonitor.recordCooldown(apiKey || "", remaining);

      // Use non-streaming directly (like HTML tester) to avoid rate limits
      try {
        const result = await this.chatNonStreaming(
          modelId,
          history,
          newPrompt,
          image,
          systemInstruction,
          apiKey,
          30000,
          finalRequestId,
        );

        // Yield result as if it came from streaming
        if (result.providerLimit) {
          yield { providerLimit: result.providerLimit };
          return;
        }

        if (result.text) {
          yield { text: result.text };
        }
        if (result.toolCalls) {
          yield { toolCalls: result.toolCalls };
        }
        if (result.usage) {
          yield { usage: result.usage };
        }
        return;
      } catch (error: any) {
        // If non-streaming also fails, throw the error
        throw error;
      }
    }
    // ==================== END 429 COOLDOWN CHECK ====================

    // CRITICAL: Provider availability fail-fast - MUST be after cooldown check
    // If provider is terminal (QUOTA_EXHAUSTED, degraded), abort immediately
    // This prevents ANY network calls, model selection, or retry logic
    if (!DegradedMode.isProviderAvailable("gemini")) {
      const providerLimit = ProviderLimit.create("gemini", 30);
      yield { providerLimit };
      return; // Exit immediately - no fetch, no retry, no fallback
    }

    // Track start time for latency metrics
    const startTime = Date.now();

    // ==================== REAL-TIME STREAMING MONITOR ====================
    // Track request start for live debugging
    StreamingMonitor.trackRequestStart(
      finalRequestId,
      "gemini-api-stream",
      "POST",
    );
    // ==================== END REAL-TIME STREAMING MONITOR ====================

    // ==================== STREAM LIFECYCLE MANAGEMENT (CRITICAL) ====================
    // CRITICAL: Only one active streaming request may exist per API key at any given time
    // CRITICAL FIX: Acquire lock before registering stream to prevent concurrent requests
    const releaseLock = await StreamLifecycleManager.acquireStreamLock(
      apiKey || "",
    );

    // Register this stream (cancels any previous stream for this API key)
    const abortController = StreamLifecycleManager.registerStream(
      finalRequestId,
      apiKey || "",
    );

    // Ensure cleanup on completion (including lock release)
    const cleanup = () => {
      StreamLifecycleManager.unregisterStream(finalRequestId, apiKey || "");
      StreamingMonitor.unregisterStream(finalRequestId);
      releaseLock(); // CRITICAL: Release lock to allow next request
    };
    // ==================== END STREAM LIFECYCLE MANAGEMENT ====================

    // ==================== RUNTIME MODEL SELECTION ENFORCEMENT (NON-NEGOTIABLE) ====================
    // CRITICAL: Runtime MUST use the model selected in the Model Ribbon
    // No hardcoded fallbacks, no silent substitutions
    const { ModelValidationStore } = await import("./modelValidationStore");
    const { ModelSelectionService } = await import("./modelSelectionService");
    const { FatalAIError } = await import("./fatalAIError");

    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "API key is required. Please set your Gemini API key in Agent Settings (Connection tab).",
      );
    }

    // Check if API Model Test has been executed
    if (!ModelValidationStore.hasTestBeenExecuted(apiKey)) {
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: API Model Test not executed`,
      );
      throw FatalAIError.API_TEST_NOT_EXECUTED();
    }

    // Get usable models from test results
    const usableModels = ModelValidationStore.getValidatedModels(apiKey);
    const validatedModelInfos =
      ModelValidationStore.getValidatedModelInfos(apiKey);

    // DEBUG: Log model availability
    console.log(`[GeminiService][requestId=${finalRequestId}][DEBUG_MODELS]:`, {
      usableModelsCount: usableModels.length,
      usableModels: usableModels,
      hasTestBeenExecuted: ModelValidationStore.hasTestBeenExecuted(apiKey),
      providerStatus: ModelValidationStore.getProviderStatus(apiKey),
      apiKeyPrefix: apiKey?.substring(0, 8),
    });

    // Check if zero usable models
    if (usableModels.length === 0) {
      const providerStatus = ModelValidationStore.getProviderStatus(apiKey);
      if (providerStatus === "exhausted") {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Provider exhausted`,
        );
        throw FatalAIError.PROVIDER_EXHAUSTED();
      }
      if (providerStatus === "rate_limited") {
        console.warn(
          `[GeminiService][requestId=${finalRequestId}]: Rate limited; zero usable models from test`,
        );
        throw FatalAIError.PROVIDER_RATE_LIMITED();
      }
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Zero usable models`,
      );
      throw FatalAIError.ZERO_USABLE_MODELS();
    }

    // SINGLE SOURCE OF TRUTH: Get model from Model Ribbon selection
    const selectionResult =
      await ModelSelectionService.getValidatedModel(apiKey);

    if (!selectionResult.isValid) {
      const errorMsg =
        selectionResult.error ||
        "Selected model is no longer available. Please reselect a model.";
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Model selection invalid: ${errorMsg}`,
      );
      throw new Error(errorMsg);
    }

    // Use the validated model from ribbon - this is the ONLY model we can use
    const ribbonSelectedModel = selectionResult.modelId;
    const activeModelInfo = selectionResult.modelInfo;

    // ==================== VERIFICATION: Active Model Check (CRITICAL) ====================
    if (!activeModelInfo) {
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Active model info missing`,
      );
      throw new Error(
        'Active model information is missing. Please run "API Model Test" first.',
      );
    }

    // Hard verification: Log active model details
    console.info("[Model Check]", {
      modelId: activeModelInfo.id,
      family: activeModelInfo.family,
      inputLimit: activeModelInfo.maxInputTokens,
      outputLimit: activeModelInfo.maxOutputTokens,
      label: activeModelInfo.label,
      source: selectionResult.source,
      requestId: finalRequestId,
    });

    // Verify model ID matches
    if (activeModelInfo.id !== ribbonSelectedModel) {
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Model ID mismatch: activeModelInfo.id="${activeModelInfo.id}" vs ribbonSelectedModel="${ribbonSelectedModel}"`,
      );
      throw new Error("Model ID mismatch detected. Please reselect a model.");
    }

    // Logging for observability (dev-only)
    console.log(`[RuntimeChat][requestId=${finalRequestId}]`, {
      SelectedModel: ribbonSelectedModel,
      Source: selectionResult.source === "ribbon" ? "ModelRibbon" : "Default",
      DiscoveryStatus: "usable",
      UsableModelsCount: usableModels.length,
    });

    // Verify the ribbon-selected model is in usable models (double-check)
    if (!usableModels.includes(ribbonSelectedModel)) {
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Ribbon model "${ribbonSelectedModel}" not in usable models`,
      );
      throw new Error(
        `Selected model "${ribbonSelectedModel}" is no longer available. Please reselect a model.`,
      );
    }

    // Convert ribbon model string to API format (if needed)
    // The ribbon stores the actual model ID (e.g., "gemini-2.0-flash-exp")
    // which is already in the correct format for API calls
    const validatedModelApiName = ribbonSelectedModel;
    // ==================== END RUNTIME MODEL SELECTION ENFORCEMENT ====================

    // Check for streaming recovery
    NetworkReliabilityService.checkStreamingRecovery();
    NetworkReliabilityVerification.verifyStreamingRecovery();

    // Ensure cleanup on any exit path
    let cleanupCalled = false;
    const ensureCleanup = () => {
      if (!cleanupCalled) {
        cleanupCalled = true;
        cleanup();
      }
    };

    try {
      // Check if API key is provided
      const finalApiKey = apiKey || process.env.API_KEY;
      if (!finalApiKey || finalApiKey.trim() === "") {
        throw new Error(
          "API key is required. Please set your Gemini API key in Agent Settings (Connection tab).",
        );
      }

      // Use the validated model from ribbon - NO FALLBACKS
      // The ribbon selection is the ONLY valid model for this request
      const currentModel = validatedModelApiName;

      // Register stream with monitor
      StreamingMonitor.registerStream(
        finalRequestId,
        currentModel,
        apiKey || "",
      );

      console.log(
        `[GeminiService][requestId=${finalRequestId}]: Starting streamChat with ribbon-selected model`,
        {
          ribbonSelectedModel: currentModel,
          usableModels: usableModels.length,
          source: "ModelRibbon",
        },
      );

      // OPTIMIZATION: Check cache first (exact match) - only for ribbon-selected model
      if (useCache && newPrompt) {
        const cached = ResponseCache.getExactMatch(
          newPrompt,
          currentModel as any,
          systemInstruction,
        );
        if (cached) {
          // Validate cached response
          const classification = AIBehaviorValidation.classifyResponse(
            { text: cached.response, toolCalls: cached.toolCalls },
            null,
            finalRequestId,
            currentModel as ModelId,
            1, // Cache hit - attempt 1
          );

          if (classification === ClassificationResult.MODEL_SUCCESS) {
            // Record cache hit metric
            try {
              recordMetric("cache_hit", 1, { model: modelId });
              const latency = Date.now() - startTime;
              recordMetric("latency_ms", latency, { model: modelId });
            } catch {
              // Silently fail if telemetry not available
            }

            // Return cached response
            yield {
              text: cached.response,
              toolCalls: cached.toolCalls,
              usage: cached.tokenUsage
                ? {
                    promptTokenCount: cached.tokenUsage.prompt,
                    ...({
                      candidatesTokenCount: cached.tokenUsage.response,
                    } as any),
                    totalTokenCount:
                      cached.tokenUsage.prompt + cached.tokenUsage.response,
                  }
                : undefined,
            };
            return;
          }
          // If cached response is invalid, continue to fresh request
        }
      }

      // RUNTIME MODEL ENFORCEMENT: Use ONLY the ribbon-selected model
      // NO FALLBACKS to other models - if this model fails, the request fails
      // The ribbon selection is the single source of truth

      // Check if already in degraded mode
      if (DegradedMode.isDegraded("gemini")) {
        console.log(
          `[GeminiService][requestId=${finalRequestId}][PROVIDER_LIMIT]: Already in degraded mode - skipping request`,
        );
        const providerLimit = ProviderLimit.create("gemini", 30);
        yield { providerLimit };
        return;
      }

      // Use ribbon-selected model - no fallback loop
      let attemptNumber = 1;
      const maxAttempts = 2; // Max 2 attempts on the same model (for network retries only)
      let useStreaming = NetworkReliabilityService.isStreamingEnabled();
      let timeout = 10000; // Default timeout
      let modelAttemptSuccess = false;
      let modelAttemptError: Error | null = null;
      let modelAttemptResponse: {
        text?: string;
        toolCalls?: ToolCall[];
        usage?: UsageMetadata;
      } | null = null;

      // Initialize fallback state for quota tracking
      let state: FallbackState = {
        primaryModel: modelId,
        currentModel: modelId,
        triedModels: new Set([modelId]),
        attemptsOnCurrentModel: 0,
        maxAttemptsPerModel: maxAttempts,
        unavailableModels: new Map(),
      };

      // Record telemetry: attempt (first attempt on this model)
      const currentModelInfo = validatedModelInfos.find(
        (m) => m.id === currentModel,
      );
      if (currentModelInfo) {
        recordTelemetry(currentModelInfo.family, "attempt");
      }

      // Attempt request with network reliability handling (retry loop for same model only)
      // This loop handles retries on the SAME model for INFRA_FAILURE only
      // NO model switching - we use ONLY the ribbon-selected model
      while (attemptNumber <= maxAttempts) {
        console.log(
          `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][attempt=${attemptNumber}]: Starting request with ribbon-selected model`,
        );
        try {
          // ==================== PRE-FLIGHT VALIDATION (MANDATORY) ====================
          // CRITICAL: Validate before every model request to prevent CODE_BUG misclassification
          // This ensures we never blame the model incorrectly or retry/fallback on code bugs
          const preflightPayload = {
            history,
            newPrompt,
            image,
            systemInstruction,
            modelId: currentModel,
          };

          const preflight = AIBehaviorValidation.validateRequestPreFlight(
            finalRequestId,
            finalApiKey,
            currentModel as ModelId,
            preflightPayload,
            null, // No error yet - this is before network call
          );

          if (!preflight.isValid) {
            // CODE_BUG detected - abort immediately
            // Never retry, never fallback
            console.error(
              `[GeminiService][requestId=${finalRequestId}][PREFLIGHT_FAILED]: CODE_BUG detected`,
              {
                reason: preflight.reason,
                model: currentModel,
                attempt: attemptNumber,
              },
            );

            // Record error root cause
            const codeBugError = new Error(
              `Pre-flight validation failed: ${preflight.reason || "Unknown CODE_BUG"}`,
            );
            try {
              const { CompletionReporter } =
                await import("./completionReporter");
              CompletionReporter.recordErrorRootCause(
                finalRequestId,
                codeBugError,
                FailureType.CODE_BUG,
                currentModel as ModelId,
              );
            } catch {
              // Silently fail if reporter not available
            }

            // Classify and throw immediately
            const classification = AIBehaviorValidation.classifyResponse(
              null,
              codeBugError,
              finalRequestId,
              currentModel as ModelId,
              attemptNumber,
              finalApiKey,
              preflightPayload,
            );

            // Generate final failure report
            const completionVerification =
              AIBehaviorValidation.verifyCompletion(
                null,
                codeBugError,
                finalRequestId,
              );
            const systemStatus = {
              ui: "OK" as const,
              ai: "BLOCKED" as const,
              infra: "OK" as const,
            };
            const liveVerification = {
              uiInteractions: true,
              aiRequestSent: false, // Never sent due to CODE_BUG
              aiResponseReceived: false,
              networkReachable: true,
              details: [`Pre-flight validation failed: ${preflight.reason}`],
            };
            const codeDelivery = {
              codeDetected: false,
              codeBlockCount: 0,
              uiRendered: false,
            };

            try {
              const { CompletionReporter } =
                await import("./completionReporter");
              const report = CompletionReporter.generateReport(
                finalRequestId,
                systemStatus,
                liveVerification,
                codeDelivery,
                completionVerification,
                false, // Not all models exhausted - CODE_BUG stops immediately
              );

              if (process.env.NODE_ENV === "development") {
                console.error(
                  "[CompletionReporter] CODE_BUG report:",
                  CompletionReporter.formatReportAsMarkdown(report),
                );
              }
            } catch {
              // Silently fail if reporter not available
            }

            // Mark as CODE_BUG to prevent UI verification loops
            try {
              const runtimeUIVerification =
                await import("./runtimeUIVerification");
              if (
                runtimeUIVerification &&
                typeof (runtimeUIVerification as any).markCodeBug === "function"
              ) {
                (runtimeUIVerification as any).markCodeBug(finalRequestId);
              }
            } catch {
              // Silently fail if RuntimeUIVerification not available
            }

            // Also set global marker
            if (!(globalThis as any).__codeBugRequests) {
              (globalThis as any).__codeBugRequests = new Set<string>();
            }
            (globalThis as any).__codeBugRequests.add(finalRequestId);

            // Get user message and throw
            const context: NotificationContext = {
              executionPhase: "final",
              errorType: ClassificationResult.CODE_BUG,
              requiresUserAction: false,
              allModelsExhausted: false,
            };
            const userMessage = AIBehaviorValidation.getUserMessage(
              ClassificationResult.CODE_BUG,
              false,
              context,
            );
            throw new Error(
              userMessage ||
                `Internal error: ${preflight.reason || "Code bug detected"}`,
            );
          }
          // ==================== END PRE-FLIGHT VALIDATION ====================

          if (!useStreaming) {
            // Fallback to non-streaming mode
            console.log(
              `[NETWORK][requestId=${finalRequestId}] [FALLBACK_APPLIED] Using non-streaming fallback`,
              {
                attemptNumber,
                timeout,
                reason: "Streaming disabled or VPN suspected",
              },
            );
            const result = await this.chatNonStreaming(
              currentModel as ModelId,
              history,
              newPrompt,
              image,
              systemInstruction,
              finalApiKey,
              timeout,
              finalRequestId,
            );

            // CRITICAL: Check for provider limit FIRST (before classification)
            // If provider limit is returned, yield it and exit immediately
            if (result.providerLimit) {
              ensureCleanup();
              yield { providerLimit: result.providerLimit };
              return; // Exit gracefully with provider limit
            }

            // Classify the response
            const classification = AIBehaviorValidation.classifyResponse(
              result,
              null,
              finalRequestId,
              currentModel as ModelId,
              attemptNumber,
            );

            if (classification === ClassificationResult.MODEL_SUCCESS) {
              // Success - yield and return
              yield {
                text: result.text,
                toolCalls: result.toolCalls,
                usage: result.usage,
              };

              // Cache the response
              if (useCache && newPrompt && result.text) {
                ResponseCache.set(
                  newPrompt,
                  currentModel,
                  result.text,
                  result.toolCalls,
                  result.usage
                    ? {
                        prompt: result.usage.promptTokenCount || 0,
                        response:
                          (result.usage as any).candidatesTokenCount || 0,
                      }
                    : undefined,
                  systemInstruction,
                );
              }

              // Record metrics
              try {
                if (result.usage) {
                  recordMetric(
                    "tokens_used",
                    result.usage.totalTokenCount || 0,
                    { model: currentModel },
                  );
                  recordMetric(
                    "tokens_prompt",
                    result.usage.promptTokenCount || 0,
                    { model: currentModel },
                  );
                  recordMetric(
                    "tokens_completion",
                    (result.usage as any).candidatesTokenCount || 0,
                    { model: currentModel },
                  );
                }
                const latency = Date.now() - startTime;
                recordMetric("latency_ms", latency, { model: currentModel });
              } catch {
                // Silently fail if telemetry not available
              }

              // Log successful attempt
              AIBehaviorValidation.classifyResponse(
                result,
                null,
                finalRequestId,
                currentModel as ModelId,
                attemptNumber,
              );
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordSuccess(circuitKey);
              return; // Success with non-streaming
            } else {
              // Model failure - will fallback to next model
              modelAttemptError = new Error("Response validation failed");
              modelAttemptResponse = result;
              break; // Exit inner retry loop to try next model
            }
          }

          // Streaming mode
          const ai = new GoogleGenAI({ apiKey: finalApiKey });

          // OPTIMIZATION: Use context manager for token-efficient history
          let contents = this.formatHistory(
            history,
            newPrompt,
            currentModel as ModelId,
            useMinimalContext,
          );

          // RUNTIME GUARD: Ensure contents is always an array
          if (!Array.isArray(contents)) {
            console.warn(
              `[GeminiService][requestId=${requestId}] formatHistory returned non-array, normalizing:`,
              typeof contents,
            );
            contents = Array.isArray(contents) ? contents : [];
          }

          // RUNTIME ASSERTION: Verify contents structure (NON-REMOVABLE)
          RuntimeGuardrails.guardGeminiServiceInput(
            contents,
            finalRequestId,
            "stream",
          );

          // Append the latest turn to the contents
          const currentParts: Part[] = [];
          if (image) {
            const base64Data = image.split(",")[1] || image;
            currentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            });
          }
          if (newPrompt) {
            // ==================== VERIFICATION: Request Payload Check ====================
            // Hard guard: Ensure prompt is valid
            if (!newPrompt || typeof newPrompt !== "string") {
              throw new Error(
                `Invalid prompt payload: expected string, got ${typeof newPrompt}. requestId=${finalRequestId}`,
              );
            }
            currentParts.push({ text: newPrompt });
          }
          if (currentParts.length > 0) {
            contents.push({ role: "user", parts: currentParts });
          }

          // CRITICAL: Validate final payload before network call
          // Must validate the actual contents[] array that will be sent to Gemini
          AIBehaviorValidation.validateFinalPayload(contents, finalRequestId);

          // ==================== VERIFICATION: Request Payload Logging ====================
          // Verify request shape (TEXT-only unless image provided)
          const hasText = contents.some((c) =>
            c.parts?.some((p: any) => p.text),
          );
          const hasImage = contents.some((c) =>
            c.parts?.some((p: any) => p.inlineData),
          );
          if (!hasText && !hasImage) {
            throw new Error(
              `Invalid payload: No text or image parts found. requestId=${finalRequestId}`,
            );
          }

          // Log payload structure for verification
          console.debug("[GenConfig]", {
            model: currentModel,
            contentsCount: contents.length,
            hasText,
            hasImage,
            partsCount: contents.reduce(
              (sum, c) => sum + (c.parts?.length || 0),
              0,
            ),
            requestId: finalRequestId,
          });

          const isGemini3 = currentModel.startsWith("gemini-3");

          // ==================== VERIFICATION: Parameter Consistency Check ====================
          // Verify model capability match (should be filtered during discovery, but runtime must trust it)
          const currentModelInfo = validatedModelInfos.find(
            (m) => m.id === currentModel,
          );

          // Build generationConfig according to Google API documentation
          // https://ai.google.dev/api/generate-content#generationconfig
          // temperature: 0.0-1.0 (default: not specified, typically 0.9)
          // topP: 0.0-1.0 (default: not specified, typically 0.95)
          // maxOutputTokens: Use model limit or safe default
          // candidateCount: 1-8 (default: 1)
          const maxOutputTokens = currentModelInfo?.maxOutputTokens
            ? Math.min(currentModelInfo.maxOutputTokens, 8192) // Cap at 8K for safety
            : 8192; // Safe default if model info not available

          const generationConfig = {
            temperature: 0.9, // Standard creative temperature per Google docs
            topP: 0.95, // Standard nucleus sampling per Google docs
            maxOutputTokens: maxOutputTokens, // Respect model limits
            candidateCount: 1, // Single candidate (standard)
          };

          if (currentModelInfo) {
            console.debug("[GenConfig]", {
              model: currentModel,
              family: currentModelInfo.family,
              maxInputTokens: currentModelInfo.maxInputTokens,
              maxOutputTokens: currentModelInfo.maxOutputTokens,
              generationConfig,
              hasSystemInstruction: !!systemInstruction,
              hasTools: true, // FILE_TOOLS always included
              requestId: finalRequestId,
            });
          }

          // CRITICAL: Check cooldown BEFORE making API call
          if (StreamLifecycleManager.isInCooldown(apiKey || "")) {
            const remaining = StreamLifecycleManager.getRemainingCooldown(
              apiKey || "",
            );
            console.log(
              `[GeminiService][requestId=${finalRequestId}][model=${currentModel}]: In cooldown, skipping API call. Remaining: ${remaining}ms`,
            );

            // Record cooldown status with real-time monitor
            StreamingMonitor.recordCooldown(apiKey || "", remaining);

            modelAttemptError = new Error(
              `Rate limited. Please wait ${Math.ceil(remaining / 1000)} seconds before trying again.`,
            );
            break; // Exit retry loop - do NOT make API call
          }

          // CRITICAL: Add delay before API call to respect rate limits (similar to HTML tester)
          // This prevents hitting rate limits when making requests too quickly
          // Apply delay for ALL attempts, with longer delay for retries
          const baseDelay = 1000; // 1 second base delay (like HTML tester)
          const retryDelay =
            attemptNumber > 1 ? Math.min(1000 * (attemptNumber - 1), 2000) : 0; // Additional delay for retries
          const totalDelay = baseDelay + retryDelay;

          console.log(
            `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][attempt=${attemptNumber}]: Adding ${totalDelay}ms delay before API call to respect rate limits (base: ${baseDelay}ms, retry: ${retryDelay}ms)`,
          );
          await new Promise((resolve) => setTimeout(resolve, totalDelay));

          let responseStream: any;
          let streamAborted = false;
          try {
            responseStream = await ai.models.generateContentStream({
              model: currentModel, // VERIFIED: Using discovered model, not hardcoded
              contents: contents,
              config: {
                tools: [{ functionDeclarations: FILE_TOOLS }],
                systemInstruction: systemInstruction,
                ...generationConfig, // CRITICAL: Spread generationConfig properties per Google API docs
                ...(isGemini3
                  ? {
                      thinkingConfig: {
                        thinkingBudget: currentModel.includes("pro")
                          ? 32768
                          : 16384,
                      },
                    }
                  : {}),
              },
            });
          } catch (streamInitError: any) {
            // CRITICAL: Check for 429 rate limit FIRST (transient, not permanent)
            const errorMsg = (streamInitError?.message || "").toLowerCase();
            const errorCode = streamInitError?.code || streamInitError?.status;
            const httpStatus =
              AIBehaviorValidation.getHttpStatusCode(streamInitError);
            const is429 =
              errorCode === 429 ||
              streamInitError?.status === 429 ||
              httpStatus === 429 ||
              errorMsg.includes("429") ||
              errorMsg.includes("too many requests");

            if (is429) {
              // CRITICAL: 429 = RESOURCE_EXHAUSTED = "You've exceeded the rate limit"
              // According to Google docs: Verify you're within the model's rate limit
              // Enter cooldown with exponential backoff
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][429]: Rate limit exceeded during stream init - entering cooldown and disabling streaming`,
              );

              // Get cooldown duration before handling
              const cooldownBefore =
                StreamLifecycleManager.getRemainingCooldown(apiKey || "");
              StreamLifecycleManager.handle429(apiKey || "");
              const cooldownAfter = StreamLifecycleManager.getRemainingCooldown(
                apiKey || "",
              );

              // Record 429 event with real-time monitor
              StreamingMonitor.record429(
                finalRequestId,
                apiKey || "",
                cooldownAfter,
              );
              StreamingMonitor.trackRequestEnd(
                finalRequestId,
                429,
                "Too Many Requests",
                "Rate limit exceeded",
              );

              ensureCleanup();

              // Record telemetry
              const currentModelInfo = validatedModelInfos.find(
                (m) => m.id === currentModel,
              );
              if (currentModelInfo) {
                recordTelemetry(currentModelInfo.family, "rate_limited");
              }

              // CRITICAL FIX: Fallback to non-streaming instead of throwing
              // Streaming is rate-limited, but non-streaming may still work
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][429]: Switching to non-streaming fallback`,
              );
              useStreaming = false;
              attemptNumber++;
              continue; // Retry with non-streaming
            }

            // CRITICAL: Check for quota exhaustion during stream initialization
            // Normalize to PROVIDER_LIMIT (non-exceptional state)
            if (
              AIBehaviorValidation.isPermanentQuotaExhaustion(streamInitError)
            ) {
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][PROVIDER_LIMIT]: Quota exhaustion during stream init - entering degraded mode`,
              );
              // Track model unavailability (for telemetry only - no model switching)
              ModelFallbackManager.markModelUnavailable(
                {} as any,
                currentModel as ModelId,
                "QUOTA_EXHAUSTED",
              );
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordFailure(circuitKey, true);
              const providerLimit = ProviderLimit.create("gemini", 30);
              DegradedMode.enterDegradedMode(
                "gemini",
                providerLimit.cooldownUntil!,
              );
              streamAborted = true;
              ensureCleanup();
              yield { providerLimit };
              return; // Exit gracefully, no exception
            }
            throw streamInitError; // Re-throw other errors
          }

          // Collect full response for caching
          let fullResponse = "";
          const allToolCalls: ToolCall[] = [];
          let finalUsage: UsageMetadata | undefined;
          let chunkIndex = 0;
          let bytesReceived = 0;

          // CHAOS TESTING: Inject empty response (DEV-ONLY)
          const { ChaosTesting } = await import("./chaosTesting");
          const emptyResponse =
            ChaosTesting.injectEmptyResponse(finalRequestId);
          if (emptyResponse) {
            console.warn(
              `[GeminiService][requestId=${finalRequestId}][CHAOS]: Empty response injected`,
            );
            // Validate empty response handling
            const guardResult = RuntimeGuardrails.guardGeminiServiceResponse(
              { text: "", toolCalls: [], usage: undefined },
              finalRequestId,
              "stream",
            );
            if (!guardResult.isValid) {
              // Switch to non-streaming fallback
              console.log(
                `[GeminiService][requestId=${finalRequestId}][FALLBACK]: Empty response detected, switching to non-streaming`,
              );
              useStreaming = false;
              attemptNumber++;
              continue; // Retry with non-streaming
            }
          }

          try {
            // CRITICAL: Check for quota exhaustion before processing stream
            if (
              streamAborted ||
              ModelFallbackManager.hasQuotaExhaustedModels(state)
            ) {
              break; // Exit immediately if quota exhausted
            }

            // CRITICAL: Check if stream was aborted by lifecycle manager
            if (abortController?.signal?.aborted) {
              console.log(
                `[GeminiService][requestId=${finalRequestId}]: Stream aborted by lifecycle manager before processing`,
              );
              break;
            }

            for await (const chunk of responseStream) {
              // CRITICAL: Check if stream was aborted during processing
              if (abortController?.signal?.aborted) {
                console.log(
                  `[GeminiService][requestId=${finalRequestId}]: Stream aborted during processing`,
                );
                break;
              }

              // CRITICAL: Check for quota exhaustion during stream processing
              if (ModelFallbackManager.hasQuotaExhaustedModels(state)) {
                // Abort stream processing immediately
                break;
              }
              // CHAOS TESTING: Inject malformed chunk (DEV-ONLY)
              const malformedChunk = ChaosTesting.injectMalformedChunk(
                finalRequestId,
                chunkIndex,
              );
              const c = malformedChunk || (chunk as GenerateContentResponse);

              // RUNTIME ASSERTION: Validate chunk structure
              if (!c || typeof c !== "object") {
                console.error(
                  `[GeminiService][requestId=${finalRequestId}]: Invalid chunk received`,
                  { chunkType: typeof c, chunkIndex },
                );
                throw new Error(
                  "Invalid response chunk received. Please try again.",
                );
              }

              // CHAOS TESTING: Inject partial network drop (DEV-ONLY)
              const networkDropError = ChaosTesting.injectPartialNetworkDrop(
                finalRequestId,
                bytesReceived,
              );
              if (networkDropError) {
                console.warn(
                  `[GeminiService][requestId=${finalRequestId}][CHAOS]: Partial network drop injected`,
                );
                throw networkDropError;
              }

              // Extract tool calls
              if (c.functionCalls) {
                if (!Array.isArray(c.functionCalls)) {
                  console.error(
                    `[GeminiService][requestId=${finalRequestId}]: Invalid functionCalls type`,
                    { chunkIndex },
                  );
                  throw new Error("Invalid response format. Please try again.");
                }
                for (const fc of c.functionCalls) {
                  if (!fc || typeof fc !== "object" || !fc.name) {
                    console.error(
                      `[GeminiService][requestId=${finalRequestId}]: Invalid function call`,
                      { chunkIndex, fc },
                    );
                    continue; // Skip invalid function call
                  }
                  allToolCalls.push({
                    id: Math.random().toString(36).substring(7),
                    name: fc.name,
                    args: fc.args as Record<string, any>,
                  });
                }
              }

              // Extract text
              // ==================== VERIFICATION: Response Parsing Check (Streaming) ====================
              // Safe extraction pattern for streaming response
              let text = "";
              if (c.text && typeof c.text === "string") {
                text = c.text;
              } else if (c.candidates?.[0]?.content?.parts) {
                // Fallback: Extract from candidates if text not directly available
                text = c.candidates[0].content.parts
                  .map((p: any) => p.text)
                  .filter((t: any) => t)
                  .join("");
              }

              if (typeof text !== "string") {
                console.error(
                  `[GeminiService][requestId=${finalRequestId}]: Invalid text type`,
                  { chunkIndex, textType: typeof text, chunk: c },
                );
                // Continue but skip this chunk
                continue;
              }
              // CRITICAL: Normalize streaming content safely at runtime
              // Handle cases where text might be object, array, or partial delta
              const textObj = text as any;
              const normalizedText =
                typeof text === "string"
                  ? text
                  : textObj?.text ||
                    textObj?.content ||
                    textObj?.delta ||
                    String(text || "");

              fullResponse += normalizedText;
              bytesReceived += normalizedText.length;
              finalUsage = c.usageMetadata;
              chunkIndex++;

              // Record chunk with real-time monitor
              StreamingMonitor.recordChunk(
                finalRequestId,
                normalizedText.length,
                normalizedText,
              );

              // Yield incrementally (for user feedback)
              if (normalizedText || allToolCalls.length > 0 || finalUsage) {
                const responseChunk = {
                  text: normalizedText,
                  toolCalls: allToolCalls.length ? allToolCalls : undefined,
                  usage: finalUsage,
                };
                // RUNTIME ASSERTION: Validate response chunk
                const guardResult =
                  RuntimeGuardrails.guardGeminiServiceResponse(
                    responseChunk,
                    finalRequestId,
                    "stream",
                  );
                if (!guardResult.isValid) {
                  console.error(
                    `[GeminiService][requestId=${finalRequestId}]: Invalid response chunk`,
                    { chunkIndex, error: guardResult.error },
                  );
                  // Continue to next chunk instead of failing completely
                  continue;
                }
                yield responseChunk;
              }
            }

            // Stream completed successfully - full response collected in fullResponse
            // Classification will happen after this try block
          } catch (streamError: any) {
            // CRITICAL: Check for 429 rate limit FIRST (transient, not permanent)
            const errorMsg = (streamError?.message || "").toLowerCase();
            const errorCode = streamError?.code || streamError?.status;
            const httpStatus =
              AIBehaviorValidation.getHttpStatusCode(streamError);
            const is429 =
              errorCode === 429 ||
              streamError?.status === 429 ||
              httpStatus === 429 ||
              errorMsg.includes("429") ||
              errorMsg.includes("too many requests");

            if (is429) {
              // CRITICAL: 429 = RESOURCE_EXHAUSTED = "You've exceeded the rate limit"
              // According to Google docs: Verify you're within the model's rate limit
              // Enter cooldown with exponential backoff
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][429]: Rate limit exceeded during stream processing - entering cooldown and disabling streaming`,
              );

              // Get cooldown duration before handling
              const cooldownBefore =
                StreamLifecycleManager.getRemainingCooldown(apiKey || "");
              StreamLifecycleManager.handle429(apiKey || "");
              const cooldownAfter = StreamLifecycleManager.getRemainingCooldown(
                apiKey || "",
              );

              // Record 429 event with real-time monitor
              StreamingMonitor.record429(
                finalRequestId,
                apiKey || "",
                cooldownAfter,
              );
              StreamingMonitor.trackRequestEnd(
                finalRequestId,
                429,
                "Too Many Requests",
                "Rate limit exceeded",
              );

              ensureCleanup();

              // Check if model was rejected during test (special case)
              const currentModelApiName = this.modelIdToApiName(
                currentModel as ModelId,
              );
              if (
                ModelValidationStore.isModelRejected(
                  finalApiKey,
                  currentModelApiName,
                )
              ) {
                const reason =
                  ModelValidationStore.getRejectionReason(
                    finalApiKey,
                    currentModelApiName,
                  ) || "quota_exhausted";
                console.error(
                  `[GeminiService][requestId=${finalRequestId}][model=${currentModel}]: 429 on model rejected during test - TERMINAL`,
                );
                const { FatalAIError } = await import("./fatalAIError");
                throw FatalAIError.MODEL_REJECTED_DURING_TEST(
                  currentModelApiName,
                  reason,
                );
              }

              // Record telemetry
              const currentModelInfo = validatedModelInfos.find(
                (m) => m.id === currentModel,
              );
              if (currentModelInfo) {
                recordTelemetry(currentModelInfo.family, "rate_limited");
              }

              // CRITICAL FIX: Fallback to non-streaming instead of failing
              // Streaming is rate-limited, but non-streaming may still work
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][429]: Switching to non-streaming fallback`,
              );
              useStreaming = false;
              attemptNumber++;
              break; // Exit stream processing, will retry with non-streaming
            }

            // CRITICAL: Check for quota exhaustion in stream error FIRST
            // Normalize to PROVIDER_LIMIT (non-exceptional state)
            if (AIBehaviorValidation.isPermanentQuotaExhaustion(streamError)) {
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][PROVIDER_LIMIT]: Quota exhaustion in stream - entering degraded mode`,
              );
              // Track model unavailability (for telemetry only - no model switching)
              ModelFallbackManager.markModelUnavailable(
                {} as any,
                currentModel as ModelId,
                "QUOTA_EXHAUSTED",
              );
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordFailure(circuitKey, true);
              const providerLimit = ProviderLimit.create("gemini", 30);
              DegradedMode.enterDegradedMode(
                "gemini",
                providerLimit.cooldownUntil!,
              );
              yield { providerLimit };
              return; // Exit gracefully, no exception
            }

            // Check for CORS errors (permanent infrastructure failure)
            if (AIBehaviorValidation.isCorsError(streamError)) {
              console.error(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][CORS]: CORS error detected - TERMINAL`,
              );
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordFailure(circuitKey, true);
              modelAttemptError = new Error(
                "Network connectivity issue detected. This may be due to CORS restrictions or network configuration.",
              );
              break; // Exit immediately - CORS is not retriable
            }

            // Check for 403 Forbidden (likely auth/CORS)
            if (AIBehaviorValidation.isConfigFailure(streamError)) {
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordFailure(circuitKey, true);
            }

            // Handle partial network drop or stream abort
            if (
              streamError.code === "ECONNRESET" ||
              streamError.message?.includes("reset") ||
              streamError.message?.includes("abort") ||
              streamError.message?.includes("timeout")
            ) {
              console.warn(
                `[GeminiService][requestId=${finalRequestId}][STREAM_ABORTED]: Partial completion detected`,
                {
                  bytesReceived,
                  chunkIndex,
                  fullResponseLength: fullResponse.length,
                  error: streamError.message,
                },
              );

              // Classify partial response
              const partialResponse = {
                text: fullResponse,
                toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
                usage: finalUsage,
              };

              const classification = AIBehaviorValidation.classifyResponse(
                partialResponse,
                streamError,
                finalRequestId,
                currentModel as ModelId,
                attemptNumber,
              );

              // If partial response is valid, yield it
              if (
                classification === ClassificationResult.MODEL_SUCCESS &&
                fullResponse.length > 0
              ) {
                yield partialResponse;
                modelAttemptSuccess = true;
                modelAttemptResponse = partialResponse;
                break; // Exit inner retry loop
              }

              // Network error - try non-streaming fallback on same model
              // CRITICAL: Only if NOT quota exhaustion
              if (
                AIBehaviorValidation.isInfraFailure(streamError) &&
                !AIBehaviorValidation.isPermanentQuotaExhaustion(streamError)
              ) {
                console.log(
                  `[GeminiService][requestId=${finalRequestId}][FALLBACK]: Switching to non-streaming after stream abort`,
                );
                useStreaming = false;
                attemptNumber++;
                continue; // Retry with non-streaming (same model)
              }

              // Not a network error - treat as model failure
              modelAttemptError = streamError;
              break; // Exit inner retry loop to try next model
            }

            // Other stream errors - classify and handle
            // CRITICAL: Check for quota exhaustion before classification
            // Normalize to PROVIDER_LIMIT (non-exceptional state)
            if (AIBehaviorValidation.isPermanentQuotaExhaustion(streamError)) {
              console.log(
                `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][PROVIDER_LIMIT]: Quota exhaustion in stream error - entering degraded mode`,
              );
              // Track model unavailability (for telemetry only - no model switching)
              ModelFallbackManager.markModelUnavailable(
                {} as any,
                currentModel as ModelId,
                "QUOTA_EXHAUSTED",
              );
              const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
              CircuitBreaker.recordFailure(circuitKey, true);
              const providerLimit = ProviderLimit.create("gemini", 30);
              DegradedMode.enterDegradedMode(
                "gemini",
                providerLimit.cooldownUntil!,
              );
              yield { providerLimit };
              return; // Exit gracefully, no exception
            }

            const classification = AIBehaviorValidation.classifyResponse(
              null,
              streamError,
              finalRequestId,
              currentModel as ModelId,
              attemptNumber,
            );

            if (
              classification === ClassificationResult.INFRA_FAILURE &&
              attemptNumber < maxAttempts
            ) {
              // Retry same model - but only if NOT quota exhaustion
              if (
                !AIBehaviorValidation.isPermanentQuotaExhaustion(streamError)
              ) {
                useStreaming = false;
                attemptNumber++;
                continue; // Retry with non-streaming
              }
            }

            // Model failure or no retries left - exit inner loop
            modelAttemptError = streamError;
            break; // Exit inner retry loop to try next model
          }

          // Cache will be set after successful classification (below)

          // POSTCONDITION: Validate final response
          const finalResponse = {
            text: fullResponse,
            toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
            usage: finalUsage,
          };

          // ==================== VERIFICATION: Final Response Check ====================
          // Ensure we have either text or tool calls
          if (!finalResponse.text && !finalResponse.toolCalls?.length) {
            console.error(
              `[GeminiService][requestId=${finalRequestId}]: Empty final response`,
              {
                textLength: finalResponse.text?.length || 0,
                toolCallsCount: finalResponse.toolCalls?.length || 0,
                model: currentModel,
              },
            );
            throw new Error(
              "Empty model response: No text or tool calls received.",
            );
          }

          const guardResult = RuntimeGuardrails.guardGeminiServiceResponse(
            finalResponse,
            finalRequestId,
            "stream",
          );
          if (!guardResult.isValid) {
            console.error(
              `[GeminiService][requestId=${finalRequestId}]: Final response validation failed`,
              { error: guardResult.error },
            );
            // Classify as model failure
            const classification = AIBehaviorValidation.classifyResponse(
              null,
              new Error(guardResult.error || "Empty response received"),
              finalRequestId,
              currentModel as ModelId,
              attemptNumber,
            );
            if (classification === ClassificationResult.MODEL_FAILURE) {
              modelAttemptError = new Error(
                guardResult.error || "Empty response received",
              );
              modelAttemptResponse = finalResponse;
              break; // Exit inner retry loop to try next model
            }
          }

          // Classify the response
          const classification = AIBehaviorValidation.classifyResponse(
            finalResponse,
            null,
            finalRequestId,
            currentModel as ModelId,
            attemptNumber,
          );

          if (classification === ClassificationResult.MODEL_SUCCESS) {
            // Success - cache and return
            if (useCache && newPrompt && fullResponse) {
              ResponseCache.set(
                newPrompt,
                currentModel as any,
                fullResponse,
                allToolCalls.length > 0 ? allToolCalls : undefined,
                finalUsage
                  ? {
                      prompt: finalUsage.promptTokenCount || 0,
                      response: (finalUsage as any).candidatesTokenCount || 0,
                    }
                  : undefined,
                systemInstruction,
              );
            }

            // Record metrics
            try {
              if (finalUsage) {
                recordMetric("tokens_used", finalUsage.totalTokenCount || 0, {
                  model: currentModel,
                });
                recordMetric(
                  "tokens_prompt",
                  finalUsage.promptTokenCount || 0,
                  { model: currentModel },
                );
                recordMetric(
                  "tokens_completion",
                  (finalUsage as any).candidatesTokenCount || 0,
                  { model: currentModel },
                );

                const { estimateCost } = await import("../llm/cost");
                const cost = estimateCost(currentModel, {
                  promptTokens: finalUsage.promptTokenCount,
                  completionTokens: (finalUsage as any).candidatesTokenCount,
                  totalTokens: finalUsage.totalTokenCount,
                });
                recordMetric("cost_usd", cost, { model: currentModel });
              }

              const latency = Date.now() - startTime;
              recordMetric("latency_ms", latency, { model: currentModel });
            } catch (error) {
              // Silently fail if telemetry not available
            }

            // Cleanup chaos testing state (ChaosTesting already imported above)
            ChaosTesting.cleanupRequest(finalRequestId);

            // Record circuit breaker success
            const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
            CircuitBreaker.recordSuccess(circuitKey);

            // Record telemetry: success
            const currentModelInfo = validatedModelInfos.find(
              (m) => m.id === currentModel,
            );
            if (currentModelInfo) {
              recordTelemetry(currentModelInfo.family, "success");
            }

            // CRITICAL: Reset cooldown on success (rate limit cleared)
            StreamLifecycleManager.resetCooldown(apiKey || "");

            modelAttemptSuccess = true;
            modelAttemptResponse = finalResponse;
            break; // Exit inner retry loop - success
          } else {
            // Model failure - will fallback to next model
            modelAttemptError = new Error("Response validation failed");
            modelAttemptResponse = finalResponse;
            break; // Exit inner retry loop to try next model
          }
        } catch (error: any) {
          // CRITICAL: Check for permanent quota exhaustion FIRST (before classification)
          // Normalize to PROVIDER_LIMIT (non-exceptional state)
          if (AIBehaviorValidation.isPermanentQuotaExhaustion(error)) {
            console.log(
              `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][PROVIDER_LIMIT]: Permanent quota exhaustion detected - entering degraded mode`,
            );

            // Record telemetry: rate_limited (quota exhaustion)
            const currentModelInfo = validatedModelInfos.find(
              (m) => m.id === currentModel,
            );
            if (currentModelInfo) {
              recordTelemetry(currentModelInfo.family, "rate_limited");
            }

            state = ModelFallbackManager.markModelUnavailable(
              state,
              currentModel as ModelId,
              "QUOTA_EXHAUSTED",
            );
            const circuitKey = `model:${currentModel}:${finalApiKey.substring(0, 8)}`;
            CircuitBreaker.recordFailure(circuitKey, true);
            const providerLimit = ProviderLimit.create("gemini", 30);
            DegradedMode.enterDegradedMode(
              "gemini",
              providerLimit.cooldownUntil!,
            );
            yield { providerLimit };
            return; // Exit gracefully, no exception
          }

          // Check for 429 rate limit (runtime, not discovery)
          const httpStatus = AIBehaviorValidation.getHttpStatusCode(error);
          if (httpStatus === 429) {
            // CRITICAL: 429 means "wait", not "retry" or "fallback"
            // Enter cooldown and stop immediately - do NOT retry, do NOT fallback
            StreamLifecycleManager.handle429(apiKey || "");

            // Record telemetry: rate_limited
            const currentModelInfo = validatedModelInfos.find(
              (m) => m.id === currentModel,
            );
            if (currentModelInfo) {
              recordTelemetry(currentModelInfo.family, "rate_limited");
            }

            // Throw error to stop processing (cooldown will prevent immediate retry)
            modelAttemptError = new Error(
              "Rate limited. Please wait a few seconds before trying again.",
            );
            break; // Exit immediately - no retry, no fallback
          }

          // CRITICAL: Check for invalid role error (CODE_BUG)
          if (AIBehaviorValidation.isInvalidRoleError(error)) {
            console.error(
              `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][CODE_BUG]: Invalid role detected - should have been caught in pre-flight`,
            );
            modelAttemptError = new Error(
              "CODE_BUG: Invalid role in request. This should have been caught in pre-flight validation.",
            );
            break; // Exit immediately - no retry, no fallback
          }

          // CRITICAL: Check for 400 INVALID_ARGUMENT - NOT retriable, NOT fallback
          if (AIBehaviorValidation.is400InvalidArgument(error)) {
            console.error(
              `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][400_INVALID_ARGUMENT]: 400 error detected - no retry, no fallback`,
            );
            modelAttemptError = new Error(
              "Invalid request argument. Please check your request format.",
            );
            break; // Exit immediately - no retry, no fallback
          }

          // CRITICAL: Log error details before classification for debugging
          console.error(
            `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][ERROR_DETAILS]:`,
            formatErrorForLogging(error),
            {
              httpStatus: AIBehaviorValidation.getHttpStatusCode(error),
              attemptNumber,
            },
          );

          // Classify the error
          const classification = AIBehaviorValidation.classifyResponse(
            null,
            error,
            finalRequestId,
            currentModel as ModelId,
            attemptNumber,
          );

          // Map classification to failure type
          let failureType: FailureType | null = null;
          if (classification === ClassificationResult.CODE_BUG) {
            failureType = FailureType.CODE_BUG;
          } else if (classification === ClassificationResult.CONFIG_FAILURE) {
            failureType = FailureType.CONFIG_FAILURE;
          } else if (classification === ClassificationResult.INFRA_FAILURE) {
            failureType = FailureType.INFRA_FAILURE;
          } else if (classification === ClassificationResult.MODEL_FAILURE) {
            failureType = FailureType.MODEL_FAILURE;
          }

          // CODE_BUG: Don't retry, fail immediately
          if (failureType === FailureType.CODE_BUG) {
            const context: NotificationContext = {
              executionPhase: "final",
              errorType: ClassificationResult.CODE_BUG,
              allModelsExhausted: false,
            };
            const userMessage = AIBehaviorValidation.getUserMessage(
              classification,
              false,
              context,
            );
            modelAttemptError = new Error(
              userMessage || "Internal error detected",
            );
            break; // Exit immediately - no retry, no fallback
          }

          // CONFIG_FAILURE: Don't retry, fail immediately with user message
          if (
            failureType !== null &&
            failureType === FailureType.CONFIG_FAILURE
          ) {
            const context: NotificationContext = {
              executionPhase: "initial",
              errorType: ClassificationResult.CONFIG_FAILURE,
              requiresUserAction: true,
              allModelsExhausted: false,
            };
            const userMessage = AIBehaviorValidation.getUserMessage(
              classification,
              false,
              context,
            );
            modelAttemptError = new Error(userMessage || "Configuration error");
            break; // Exit inner retry loop immediately
          }

          // RUNTIME ASSERTION: Validate error before analysis
          RuntimeGuardrails.guardNetworkReliabilityInput(
            error,
            {
              apiKeyValidated,
              requestType: useStreaming ? "streaming" : "non-streaming",
              attemptNumber,
            },
            finalRequestId,
          );

          // Analyze the error (for network reliability)
          const networkError = NetworkReliabilityService.analyzeError(error, {
            apiKeyValidated,
            requestType: useStreaming ? "streaming" : "non-streaming",
            attemptNumber,
          });

          // CRITICAL: Only retry on 500/502/503/504 errors (transient INFRA_FAILURE)
          // 400 INVALID_ARGUMENT and quota-429 are NOT retriable
          // DEFENSIVE: Explicitly block retries on quota exhaustion, CODE_BUG, CONFIG_FAILURE, and 400 errors
          const isQuotaExhausted =
            AIBehaviorValidation.isPermanentQuotaExhaustion(error);
          // Use classification directly since failureType is narrowed after early returns
          const isCodeBug = classification === ClassificationResult.CODE_BUG;
          const isConfigFailure =
            classification === ClassificationResult.CONFIG_FAILURE;
          const is400Error = AIBehaviorValidation.is400InvalidArgument(error);
          const isInvalidRole = AIBehaviorValidation.isInvalidRoleError(error);

          // ABSOLUTE PROHIBITION: Never retry on these error types
          if (
            isQuotaExhausted ||
            isCodeBug ||
            isConfigFailure ||
            is400Error ||
            isInvalidRole
          ) {
            // These errors should have been caught earlier, but defensive guard ensures no retry
            modelAttemptError = error;
            break; // Exit immediately - no retry
          }

          // Reuse httpStatus from earlier in catch block (line 1420)
          const isTransientInfraFailure =
            failureType === FailureType.INFRA_FAILURE &&
            (httpStatus === 500 ||
              httpStatus === 502 ||
              httpStatus === 503 ||
              httpStatus === 504 ||
              (httpStatus === null &&
                (error.message.includes("500") ||
                  error.message.includes("502") ||
                  error.message.includes("503") ||
                  error.message.includes("504"))));

          // Check if we should retry same model (transient INFRA_FAILURE only, max attempts)
          // We only retry the same ribbon-selected model - no model switching
          const shouldRetry =
            attemptNumber < maxAttempts && isTransientInfraFailure;
          if (shouldRetry) {
            // Retry same model (transient INFRA_FAILURE) with exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.min(
              1000 * Math.pow(2, attemptNumber - 1),
              4000,
            ); // 1s, 2s, 4s
            console.log(
              `[GeminiService][requestId=${finalRequestId}][model=${currentModel}][INFRA_RETRY]: Retrying same model with ${backoffMs}ms backoff`,
              {
                attemptNumber,
                backoffMs,
                attemptsOnModel: attemptNumber,
              },
            );

            // Exponential backoff: wait before retry
            await new Promise((resolve) => setTimeout(resolve, backoffMs));

            attemptNumber++;
            useStreaming = NetworkReliabilityService.determineFallback(
              networkError,
              {
                apiKeyValidated,
                requestType: useStreaming ? "streaming" : "non-streaming",
                attemptNumber,
              },
            ).useStreaming;
            timeout = NetworkReliabilityService.determineFallback(
              networkError,
              {
                apiKeyValidated,
                requestType: useStreaming ? "streaming" : "non-streaming",
                attemptNumber,
              },
            ).timeout;
            continue; // Retry same model
          }

          // No retry on same model - store error
          modelAttemptError = error;
          break; // Exit retry loop - we've exhausted retries on this model
        }
      }

      // After retry loop: Check if we succeeded
      if (modelAttemptSuccess && modelAttemptResponse) {
        ensureCleanup();
        yield modelAttemptResponse;
        return;
      }

      // If we've exhausted retries on this model, fail the request
      if (attemptNumber >= maxAttempts) {
        // Record telemetry: failure (final failure after all retries)
        const failedModelInfo = validatedModelInfos.find(
          (m) => m.id === currentModel,
        );
        if (failedModelInfo) {
          recordTelemetry(failedModelInfo.family, "failure");
        }

        // TERMINAL STATE: Throw FatalAIError immediately - no logging, no intermediate errors
        const { FatalAIError } = await import("./fatalAIError");

        // Check for quota exhaustion FIRST
        const lastErrorIsQuota =
          modelAttemptError &&
          AIBehaviorValidation.isPermanentQuotaExhaustion(modelAttemptError);

        if (lastErrorIsQuota) {
          const providerLimit = ProviderLimit.create("gemini", 30);
          DegradedMode.enterDegradedMode(
            "gemini",
            providerLimit.cooldownUntil!,
          );
          throw FatalAIError.PROVIDER_EXHAUSTED();
        }

        // If last error was 429 (rate limit), throw rate-limit error instead of zero usable models
        const lastErrorIs429 =
          modelAttemptError &&
          (modelAttemptError.status === 429 ||
            modelAttemptError.code === 429 ||
            AIBehaviorValidation.getHttpStatusCode(modelAttemptError) === 429 ||
            /429|rate limit|too many requests/i.test(
              String(modelAttemptError?.message ?? ""),
            ));
        if (lastErrorIs429) {
          throw FatalAIError.PROVIDER_RATE_LIMITED();
        }

        throw FatalAIError.ZERO_USABLE_MODELS();
      }
    } catch (error: any) {
      // CRITICAL: Always cleanup stream on error
      ensureCleanup();

      // CRITICAL: FatalAIError must NEVER be wrapped or modified - rethrow immediately
      const { isFatalError } = await import("./fatalAIError");
      if (isFatalError(error)) {
        throw error; // ⛔️ Propagate FatalAIError unchanged
      }

      // Final error handling - preserve original error message if it's already user-friendly
      if (error.message && !error.message.includes("Your API key is valid")) {
        // Check for thought_signature errors (specific to Gemini 3.0)
        if (
          error.message.includes("thought_signature") ||
          error.message.includes("thought-signature")
        ) {
          throw new Error(
            "خطا در فراخوانی تابع: امضای تفکر (thought signature) مورد نیاز است.\n\nاین خطا برای مدل‌های Gemini 3.0 با ابزارها رخ می‌دهد. لطفاً از مدل دیگری استفاده کنید یا با پشتیبانی تماس بگیرید.",
          );
        }
      }

      throw error; // Re-throw with user-friendly message from NetworkReliabilityService
    } finally {
      // CRITICAL: Always cleanup stream (even on success)
      ensureCleanup();
    }
  }

  /**
   * Non-streaming chat (fallback for VPN/network issues)
   */
  static async chatNonStreaming(
    modelId: ModelId,
    history: Message[],
    newPrompt: string,
    image?: string,
    systemInstruction?: string,
    apiKey?: string,
    timeout: number = 30000,
    requestId?: string,
  ): Promise<{
    text: string;
    toolCalls?: ToolCall[];
    usage?: UsageMetadata;
    providerLimit?: ProviderLimitResult;
  }> {
    const startTime = Date.now();
    // CRITICAL: requestId MUST be provided - never generate as fallback
    if (!requestId) {
      throw new Error(
        "requestId is required. It must be generated in UI layer and passed explicitly through the pipeline.",
      );
    }
    const finalRequestId = requestId;
    console.log(
      `[GeminiService][requestId=${finalRequestId}]: Starting chatNonStreaming`,
      { modelId, timeout },
    );

    // CRITICAL: Provider availability fail-fast - MUST be FIRST check
    // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), abort immediately
    if (!DegradedMode.isProviderAvailable("gemini")) {
      const providerLimit = ProviderLimit.create("gemini", 30);
      return { text: "", providerLimit };
    }

    // ==================== API MODEL TEST ENFORCEMENT (NON-NEGOTIABLE) ====================
    // CRITICAL: Verify API Model Test has been executed and model is allowed
    const { ModelValidationStore } = await import("./modelValidationStore");
    const { FatalAIError } = await import("./fatalAIError");

    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "API key is required. Please set your Gemini API key in Agent Settings (Connection tab).",
      );
    }

    // Check if API Model Test has been executed
    if (!ModelValidationStore.hasTestBeenExecuted(apiKey)) {
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: API Model Test not executed (non-streaming)`,
      );
      throw FatalAIError.API_TEST_NOT_EXECUTED();
    }

    // Get usable models from test results
    const usableModels = ModelValidationStore.getValidatedModels(apiKey);

    // DEBUG: Log model availability (non-streaming)
    console.log(
      `[GeminiService][requestId=${finalRequestId}][DEBUG_MODELS_NON_STREAMING]:`,
      {
        usableModelsCount: usableModels.length,
        usableModels: usableModels,
        hasTestBeenExecuted: ModelValidationStore.hasTestBeenExecuted(apiKey),
        providerStatus: ModelValidationStore.getProviderStatus(apiKey),
        apiKeyPrefix: apiKey?.substring(0, 8),
      },
    );

    // Check if zero usable models
    if (usableModels.length === 0) {
      const providerStatus = ModelValidationStore.getProviderStatus(apiKey);
      if (providerStatus === "exhausted") {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Provider exhausted (non-streaming)`,
        );
        throw FatalAIError.PROVIDER_EXHAUSTED();
      }
      if (providerStatus === "rate_limited") {
        console.warn(
          `[GeminiService][requestId=${finalRequestId}]: Rate limited; zero usable models from test (non-streaming)`,
        );
        throw FatalAIError.PROVIDER_RATE_LIMITED();
      }
      console.error(
        `[GeminiService][requestId=${finalRequestId}]: Zero usable models (non-streaming)`,
      );
      throw FatalAIError.ZERO_USABLE_MODELS();
    }

    // Convert ModelId to API model name for validation
    const requestedModelApiName = this.modelIdToApiName(modelId);

    // Verify requested model is in usable models
    if (!usableModels.includes(requestedModelApiName)) {
      // Check if model was rejected during test
      if (ModelValidationStore.isModelRejected(apiKey, requestedModelApiName)) {
        const reason =
          ModelValidationStore.getRejectionReason(
            apiKey,
            requestedModelApiName,
          ) || "unknown";
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Model ${requestedModelApiName} was rejected during test (non-streaming): ${reason}`,
        );
        throw FatalAIError.MODEL_REJECTED_DURING_TEST(
          requestedModelApiName,
          reason,
        );
      } else {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Model ${requestedModelApiName} not in usable models (non-streaming)`,
        );
        throw FatalAIError.MODEL_NOT_ALLOWED_BY_API_TEST(
          requestedModelApiName,
          "Model was not validated during API Model Test",
        );
      }
    }
    // ==================== END API MODEL TEST ENFORCEMENT ====================

    try {
      const finalApiKey = apiKey || process.env.API_KEY;
      if (!finalApiKey || finalApiKey.trim() === "") {
        throw new Error(
          "API key is required. Please set your Gemini API key in Agent Settings (Connection tab).",
        );
      }

      // SINGLE SOURCE OF TRUTH: Get validated models from store (already checked above)
      const availableModels = await this.discoverAvailableModels(finalApiKey);

      // ==================== PRE-FLIGHT VALIDATION (MANDATORY) ====================
      // CRITICAL: Validate before model request to prevent CODE_BUG misclassification
      const preflightPayload = {
        history,
        newPrompt,
        image,
        systemInstruction,
        modelId,
      };

      const preflight = AIBehaviorValidation.validateRequestPreFlight(
        finalRequestId,
        finalApiKey,
        modelId,
        preflightPayload,
        null, // No error yet - this is before network call
      );

      if (!preflight.isValid) {
        // CODE_BUG detected - abort immediately
        console.error(
          `[GeminiService][requestId=${finalRequestId}][PREFLIGHT_FAILED]: CODE_BUG detected in chatNonStreaming`,
          {
            reason: preflight.reason,
            model: modelId,
          },
        );

        // Record error root cause
        const codeBugError = new Error(
          `Pre-flight validation failed: ${preflight.reason || "Unknown CODE_BUG"}`,
        );
        try {
          const { CompletionReporter } = await import("./completionReporter");
          CompletionReporter.recordErrorRootCause(
            finalRequestId,
            codeBugError,
            FailureType.CODE_BUG,
            modelId,
          );
        } catch {
          // Silently fail if reporter not available
        }

        // Classify and throw immediately
        const classification = AIBehaviorValidation.classifyResponse(
          null,
          codeBugError,
          finalRequestId,
          modelId,
          1,
          finalApiKey,
          preflightPayload,
        );

        // Get user message and throw
        const context: NotificationContext = {
          executionPhase: "final",
          errorType: ClassificationResult.CODE_BUG,
          requiresUserAction: false,
          allModelsExhausted: false,
        };
        const userMessage = AIBehaviorValidation.getUserMessage(
          ClassificationResult.CODE_BUG,
          false,
          context,
        );
        throw new Error(
          userMessage ||
            `Internal error: ${preflight.reason || "Code bug detected"}`,
        );
      }
      // ==================== END PRE-FLIGHT VALIDATION ====================

      // CRITICAL: Use Smart Layer for intelligent API requests with bypass/DNS
      // This ensures consistency with model testing and discovery
      console.log(
        `[GeminiService][requestId=${finalRequestId}][NON_STREAMING]: Using Smart Layer for API request with bypass/DNS`,
      );

      // Get smart client (reuses existing instance with same bypass/DNS settings)
      const smartClient = await GeminiSmartLayer.getClient(finalApiKey, {
        bypassMode: "auto",
        region: "us",
        smartDNS: true,
        verbose: false,
      });

      let contents = this.formatHistory(history, newPrompt, modelId, true);

      // RUNTIME GUARD: Ensure contents is always an array
      if (!Array.isArray(contents)) {
        console.warn(
          `[GeminiService][requestId=${finalRequestId}] formatHistory returned non-array in non-streaming, normalizing:`,
          typeof contents,
        );
        contents = Array.isArray(contents) ? contents : [];
      }

      // RUNTIME ASSERTION: Verify contents structure (NON-REMOVABLE)
      RuntimeGuardrails.guardGeminiServiceInput(
        contents,
        finalRequestId,
        "non-stream",
      );

      const currentParts: Part[] = [];
      if (image) {
        const base64Data = image.split(",")[1] || image;
        currentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        });
      }
      if (newPrompt) {
        currentParts.push({ text: newPrompt });
      }
      if (currentParts.length > 0) {
        contents.push({ role: "user", parts: currentParts });
      }

      // CRITICAL: Validate final payload before network call
      // Must validate the actual contents[] array that will be sent to Gemini
      AIBehaviorValidation.validateFinalPayload(contents, finalRequestId);

      const isGemini3 = modelId.startsWith("gemini-3");

      // Get model info for generationConfig
      const { ModelValidationStore } = await import("./modelValidationStore");
      const validatedModelInfos =
        ModelValidationStore.getValidatedModelInfos(finalApiKey);
      const currentModelInfo = validatedModelInfos.find(
        (m) => m.id === modelId,
      );

      // Build generationConfig according to Google API documentation
      // https://ai.google.dev/api/generate-content#generationconfig
      const maxOutputTokens = currentModelInfo?.maxOutputTokens
        ? Math.min(currentModelInfo.maxOutputTokens, 8192) // Cap at 8K for safety
        : 8192; // Safe default if model info not available

      const generationConfig = {
        temperature: 0.9, // Standard creative temperature per Google docs
        topP: 0.95, // Standard nucleus sampling per Google docs
        maxOutputTokens: maxOutputTokens, // Respect model limits
        candidateCount: 1, // Single candidate (standard)
      };

      // Use Smart Layer client for API request (with bypass/DNS/retry)
      const requestBody = {
        contents: contents,
        generationConfig: generationConfig,
        ...(isGemini3
          ? {
              thinkingConfig: {
                thinkingBudget: modelId.includes("pro") ? 32768 : 16384,
              },
            }
          : {}),
      };

      // Add tools and system instruction if provided
      if (FILE_TOOLS.length > 0 || systemInstruction) {
        (requestBody as any).config = {
          ...(FILE_TOOLS.length > 0
            ? { tools: [{ functionDeclarations: FILE_TOOLS }] }
            : {}),
          ...(systemInstruction ? { systemInstruction } : {}),
          generationConfig: generationConfig,
          ...(isGemini3
            ? {
                thinkingConfig: {
                  thinkingBudget: modelId.includes("pro") ? 32768 : 16384,
                },
              }
            : {}),
        };
      }

      // Make request through Smart Layer (with bypass/DNS/retry)
      const apiResult = await smartClient.request(
        `${modelId}:generateContent`,
        {
          method: "POST",
          body: requestBody,
          timeout: timeout,
          maxRetries: 3,
        },
      );

      if (!apiResult.success || !apiResult.data) {
        throw new Error(apiResult.error || "API request failed");
      }

      // Convert Smart Layer response to GenerateContentResponse format
      const response = apiResult.data as GenerateContentResponse;

      const c = response as GenerateContentResponse;

      // ==================== VERIFICATION: Response Parsing Check ====================
      // Safe extraction pattern for non-streaming response
      const responseText =
        c?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          ?.filter((t: any) => t)
          ?.join("") || "";

      if (!responseText && !c?.functionCalls?.length) {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Empty model response`,
          {
            hasCandidates: !!c?.candidates,
            candidatesLength: c?.candidates?.length || 0,
            hasContent: !!c?.candidates?.[0]?.content,
            hasParts: !!c?.candidates?.[0]?.content?.parts,
            partsLength: c?.candidates?.[0]?.content?.parts?.length || 0,
          },
        );
        throw new Error(
          "Empty model response received. The model returned no text or function calls.",
        );
      }

      // RUNTIME ASSERTION: Validate response structure
      if (!c || typeof c !== "object") {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Invalid response object`,
          { responseType: typeof c },
        );
        throw new Error("Invalid response received. Please try again.");
      }

      // POSTCONDITION: Response must have text OR toolCalls OR usage
      const text = c.text || "";
      const toolCalls: ToolCall[] = [];

      if (c.functionCalls) {
        if (!Array.isArray(c.functionCalls)) {
          console.error(
            `[GeminiService][requestId=${finalRequestId}]: Invalid functionCalls type`,
            { functionCallsType: typeof c.functionCalls },
          );
          throw new Error("Invalid response format. Please try again.");
        }
        for (const fc of c.functionCalls) {
          if (!fc || typeof fc !== "object" || !fc.name) {
            console.error(
              `[GeminiService][requestId=${finalRequestId}]: Invalid function call`,
              { fc },
            );
            continue; // Skip invalid function call
          }
          toolCalls.push({
            id: Math.random().toString(36).substring(7),
            name: fc.name,
            args: fc.args as Record<string, any>,
          });
        }
      }

      const result = {
        text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: c.usageMetadata,
      };

      // RUNTIME ASSERTION: Validate final response
      const guardResult = RuntimeGuardrails.guardGeminiServiceResponse(
        result,
        finalRequestId,
        "non-stream",
      );
      if (!guardResult.isValid) {
        console.error(
          `[GeminiService][requestId=${finalRequestId}]: Final response validation failed`,
          { error: guardResult.error },
        );
        throw new Error(
          guardResult.error ||
            "Empty response received. The AI did not return any content. Please try again.",
        );
      }

      return result;
    } catch (error: any) {
      // CRITICAL: FatalAIError must NEVER be wrapped or modified - rethrow immediately
      const { isFatalError } = await import("./fatalAIError");
      if (isFatalError(error)) {
        throw error; // ⛔️ Propagate FatalAIError unchanged
      }

      // CRITICAL: Check for permanent quota exhaustion (same as streaming)
      // Normalize to PROVIDER_LIMIT (non-exceptional state)
      if (AIBehaviorValidation.isPermanentQuotaExhaustion(error)) {
        console.log(
          `[GeminiService][requestId=${finalRequestId}][model=${modelId}][PROVIDER_LIMIT]: Permanent quota exhaustion detected in non-streaming - entering degraded mode`,
        );
        const circuitKey = `model:${modelId}:${apiKey?.substring(0, 8) || "unknown"}`;
        CircuitBreaker.recordFailure(circuitKey, true);
        const providerLimit = ProviderLimit.create("gemini", 30);
        DegradedMode.enterDegradedMode("gemini", providerLimit.cooldownUntil!);
        return { text: "", providerLimit };
      }

      // CRITICAL: Check for invalid role error (CODE_BUG)
      if (AIBehaviorValidation.isInvalidRoleError(error)) {
        console.error(
          `[GeminiService][requestId=${finalRequestId}][model=${modelId}][CODE_BUG]: Invalid role detected in non-streaming - should have been caught in pre-flight`,
        );
        throw new Error(
          "CODE_BUG: Invalid role in request. This should have been caught in pre-flight validation.",
        );
      }

      // CRITICAL: Check for 400 INVALID_ARGUMENT - NOT retriable, NOT fallback
      if (AIBehaviorValidation.is400InvalidArgument(error)) {
        console.error(
          `[GeminiService][requestId=${finalRequestId}][model=${modelId}][400_INVALID_ARGUMENT]: 400 error detected in non-streaming - no retry, no fallback`,
        );
        throw new Error(
          "Invalid request argument. Please check your request format.",
        );
      }

      console.error("Gemini API Error (non-streaming):", error);
      throw error;
    }
  }

  static async validateApiKey(key: string): Promise<boolean> {
    // CRITICAL: During API Model Test, do NOT make API calls
    // Use ModelValidationStore results instead
    const { ModelTestingService } = await import("./modelTestingService");
    if (ModelTestingService.isTestInProgress(key)) {
      console.log(
        "[GeminiService] validateApiKey: Test in progress - using ModelValidationStore results",
      );
      // Check if test has been executed and has usable models
      const { ModelValidationStore } = await import("./modelValidationStore");
      if (ModelValidationStore.hasTestBeenExecuted(key)) {
        const usableModels = ModelValidationStore.getValidatedModels(key);
        return usableModels.length > 0;
      }
      // Test in progress but not complete yet - assume valid for now
      return true;
    }

    // Outside Test Mode: Simple connectivity check ONLY
    // API Test MUST NOT call generateContent, MUST NOT consume quota, MUST NOT trigger 429
    // Only verify API key validity and provider reachability
    try {
      // Simple GET request to models endpoint (no model calls, no quota consumption)
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          encodeURIComponent(key),
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      // If we get a valid response (even 200 with empty list), API key is valid
      // 401/403 = invalid key
      // 200 = valid key (connected)
      if (
        response.status === 200 ||
        response.status === 401 ||
        response.status === 403
      ) {
        return response.status === 200;
      }

      // Other status codes = connectivity issue
      return false;
    } catch (e: any) {
      // Network error = not connected
      return false;
    }
  }

  static validateConfig(): boolean {
    return !!process.env.API_KEY;
  }

  /**
   * CRITICAL FIX: Normalize content to string
   * Handles streaming payloads where content may be object, array, or partial delta
   * This prevents "TypeError: msg.content.trim is not a function" errors
   */
  private static normalizeContentToText(content: any): string {
    // If content is already a string, return it
    if (typeof content === "string") {
      return content;
    }

    // If content is an array (streaming parts), extract and join text parts
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part?.text) return part.text;
          if (part?.content) return this.normalizeContentToText(part.content);
          return "";
        })
        .filter(Boolean)
        .join(" ");
    }

    // If content is an object, safely extract text fields
    if (content && typeof content === "object") {
      if (content.text) return String(content.text);
      if (content.content) return this.normalizeContentToText(content.content);
      if (content.delta) return this.normalizeContentToText(content.delta);
      // Try to extract any string-like fields
      const textFields = Object.values(content).filter(
        (v) => typeof v === "string",
      );
      if (textFields.length > 0) {
        return textFields.join(" ");
      }
    }

    // Fallback: convert to string or return empty
    return content ? String(content) : "";
  }

  /**
   * Send request to Gemini API using RobustAPIClient
   * This provides automatic retry, exponential backoff, and better error handling
   *
   * @param apiKey - API key to use
   * @param endpoint - API endpoint (without base URL)
   * @param options - Request options
   * @returns Result from RobustAPIClient
   */
  private static async sendRequestToGemini(
    apiKey: string,
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      timeout?: number;
      maxRetries?: number;
      headers?: Record<string, string>;
    } = {},
  ) {
    const logger: Logger = {
      info: (msg: string) => console.log(`[GeminiService] ${msg}`),
      success: (msg: string) => console.log(`[GeminiService] ✓ ${msg}`),
      warning: (msg: string) => console.warn(`[GeminiService] ⚠ ${msg}`),
      error: (msg: string) => console.error(`[GeminiService] ✗ ${msg}`),
      debug: (msg: string) => console.debug(`[GeminiService] ${msg}`),
    };

    const client = new RobustAPIClient(apiKey, logger);
    return await client.request(endpoint, {
      method: options.method || "POST",
      timeout: options.timeout || GEMINI_MODEL_CONFIG.GEMINI_API.timeout,
      maxRetries:
        options.maxRetries || GEMINI_MODEL_CONFIG.GEMINI_API.maxRetries,
      body: options.body,
      headers: options.headers,
    });
  }

  /**
   * Check API quota and usage information
   * Note: Google Gemini API doesn't provide a direct endpoint for quota checking
   * This method attempts to make a minimal request to check if API is working
   * and returns usage information from the response along with quota limits
   *
   * Enhanced with RobustAPIClient and ErrorCategorizer for better error handling.
   */
  static async checkQuota(apiKey?: string): Promise<{
    isValid: boolean;
    message: string;
    usageInfo?: {
      promptTokens?: number;
      candidatesTokens?: number;
      totalTokens?: number;
    };
    quotaLimits?: {
      requestsPerDay: number;
      requestsPerMinute: number;
      tokensPerMinute: number;
      note?: string;
    };
  }> {
    try {
      const finalApiKey = apiKey || process.env.API_KEY;
      if (!finalApiKey || finalApiKey.trim() === "") {
        return {
          isValid: false,
          message:
            "API key is not set. Please set your Gemini API key in Agent Settings.",
          quotaLimits: {
            requestsPerDay: 1500,
            requestsPerMinute: 15,
            tokensPerMinute: 1000000,
            note: "Free tier limits for Gemini 1.5 Flash",
          },
        };
      }

      // Default quota limits for Free Tier
      const defaultQuotaLimits = {
        requestsPerDay: 1500,
        requestsPerMinute: 15,
        tokensPerMinute: 1000000,
        note: "Free tier limits for Gemini 1.5 Flash. Gemini 1.5 Pro has lower limits (50 RPD, 2 RPM).",
      };

      // Use validated model from discovery (not hardcoded)
      const { ModelValidationStore } = await import("./modelValidationStore");
      const validatedModels =
        ModelValidationStore.getValidatedModels(finalApiKey);

      if (validatedModels.length === 0) {
        // No validated models - return default limits
        return {
          isValid: false,
          message:
            'No validated models available. Please run "API Model Test" first.',
          quotaLimits: defaultQuotaLimits,
        };
      }

      // Use first validated model for quota check
      const quotaCheckModel = validatedModels[0];

      // Use RobustAPIClient for better error handling
      const result = await this.sendRequestToGemini(
        finalApiKey,
        `models/${quotaCheckModel}:generateContent`,
        {
          method: "POST",
          body: {
            contents: [{ role: "user", parts: [{ text: "Hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          },
          timeout: 10000, // Shorter timeout for quota check
          maxRetries: 1, // Single attempt for quota check
        },
      );

      if (result.success && result.data) {
        const usage = result.data.usageMetadata as UsageMetadata & {
          candidatesTokenCount?: number;
        };

        return {
          isValid: true,
          message:
            "API is working correctly. This test request used tokens. Check Google Cloud Console for detailed quota usage.",
          usageInfo: usage
            ? {
                promptTokens: usage.promptTokenCount,
                candidatesTokens: (usage as any).candidatesTokenCount || 0,
                totalTokens: usage.totalTokenCount,
              }
            : undefined,
          quotaLimits: defaultQuotaLimits,
        };
      } else {
        // Use ErrorCategorizer for better error messages
        const errorInfo =
          (result as any).errorInfo ||
          ErrorCategorizer.categorize({
            status: result.status,
            message: result.error || "Unknown error",
          });

        if (errorInfo.category === "rate_limit") {
          return {
            isValid: false,
            message: `${errorInfo.message} ${errorInfo.suggestedFix}`,
            quotaLimits: defaultQuotaLimits,
          };
        }

        return {
          isValid: false,
          message:
            errorInfo.message ||
            "Failed to check API quota. Please verify your API key.",
          quotaLimits: defaultQuotaLimits,
        };
      }
    } catch (error: any) {
      console.error("Quota check error:", error);

      // Use ErrorCategorizer for better error messages
      const errorInfo = ErrorCategorizer.categorize(error);

      return {
        isValid: false,
        message:
          errorInfo.message ||
          "Failed to check API quota. Please verify your API key.",
        quotaLimits: {
          requestsPerDay: 1500,
          requestsPerMinute: 15,
          tokensPerMinute: 1000000,
          note: "Free tier limits (approximate)",
        },
      };
    }
  }

  /**
   * Get Google Cloud Console URL for quota management
   */
  static getQuotaConsoleUrl(apiKey?: string): string {
    // Google Cloud Console API & Services > Quotas page
    return "https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas";
  }
}
