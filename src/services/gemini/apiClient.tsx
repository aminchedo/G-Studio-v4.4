/**
 * G Studio v2.3.0 - Gemini API Client
 *
 * Robust API client with automatic retry and error recovery
 */

import {
  Logger,
  APIRequestOptions,
  APIRequestResult,
  APIClientStats,
} from "@/mcp/runtime/types";
import { categorizeError } from "./errorHandler";
import {
  generateRequestId,
  logRetry,
  logTimeout,
} from "@/services/ai/observability";

/** Safe message extraction from unknown error (no any). */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

/** Safe status extraction from unknown error (no any). */
function getErrorStatus(err: unknown): number | undefined {
  if (err == null || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === "number") return o.status;
  const res = o.response as Record<string, unknown> | undefined;
  if (res != null && typeof res.status === "number") return res.status;
  return undefined;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

// ============================================================================
// ROBUST API CLIENT
// ============================================================================

export class GeminiApiClient {
  private apiKey: string;
  private logger: Logger | null;
  private stats: {
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

  /**
   * Make a request to the Gemini API with automatic retry
   */
  async request<T = unknown>(
    endpoint: string,
    options: APIRequestOptions = {},
  ): Promise<APIRequestResult<T>> {
    const requestId = generateRequestId();
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.makeRequest<T>(
          endpoint,
          options,
          timeout,
          requestId,
        );
        const responseTime = Date.now() - startTime;

        this.stats.total++;
        this.stats.success++;

        this.logger?.success(
          `Request succeeded in ${responseTime}ms (attempt ${attempt})`,
        );

        return {
          success: true,
          data: result,
          responseTime,
          attempt,
        };
      } catch (error: unknown) {
        lastError = error;
        this.stats.total++;

        const errorInfo = categorizeError(error);
        const errStatus = getErrorStatus(error);

        // Don't retry on auth errors
        if (
          errStatus === 401 ||
          errStatus === 403 ||
          errorInfo.category === "authentication"
        ) {
          this.stats.failed++;
          this.logger?.error(`Authentication error: ${errorInfo.message}`);

          return {
            success: false,
            error: errorInfo.message,
            status:
              errStatus ?? (errorInfo.type === "unauthorized" ? 401 : 403),
            retryable: false,
            errorInfo,
          };
        }

        // Don't retry on 4xx errors (except 429)
        if (
          errStatus != null &&
          errStatus >= 400 &&
          errStatus < 500 &&
          errStatus !== 429
        ) {
          this.stats.failed++;
          this.logger?.error(
            `Client error (${errStatus}): ${errorInfo.message}`,
          );

          return {
            success: false,
            error: errorInfo.message,
            status: errStatus ?? 0,
            retryable: false,
            errorInfo,
          };
        }

        // Retry on network/server errors
        if (attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt, errStatus === 429);
          this.stats.retries++;
          logRetry({
            requestId,
            attempt,
            maxAttempts: maxRetries,
            delayMs: delay,
            reason:
              errStatus === 429 ? "rate_limit" : "network_or_server_error",
          });
          this.logger?.warning(
            `Retry ${attempt}/${maxRetries} after ${delay}ms...`,
          );
          await this.sleep(delay);
          continue;
        }

        this.stats.failed++;
        this.logger?.error(
          `Request failed after ${maxRetries} attempts: ${errorInfo.message}`,
        );
      }
    }

    // Final error
    const finalErrorInfo = categorizeError(
      lastError ?? new Error("Max retries exceeded"),
    );

    return {
      success: false,
      error: getErrorMessage(lastError) || "Max retries exceeded",
      status: getErrorStatus(lastError) ?? 0,
      retryable: true,
      errorInfo: finalErrorInfo,
    };
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: APIRequestOptions,
    timeout: number,
    requestId: string,
  ): Promise<T> {
    const url = `${GEMINI_API_BASE}/${endpoint}?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Route through mcpService for architectural consistency
      const { McpService } = await import("@/services/mcpService");
      const data = await McpService.request(url, {
        method: options.method || "GET",
        headers: {
          ...options.headers,
        },
        body: options.body,
        signal: controller.signal,
        timeout: timeout,
      });

      clearTimeout(timeoutId);
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.status) {
        const httpError = new Error(`HTTP ${error.status}`) as Error & {
          status?: number;
          body?: unknown;
        };
        httpError.status = error.status;
        httpError.body = error.body;
        throw httpError;
      }

      throw error;
    }
  }

  /**
   * Calculate backoff delay with jitter
   */
  private calculateBackoff(attempt: number, isRateLimit: boolean): number {
    const baseDelay = isRateLimit ? 5000 : 1000; // 5s for rate limit, 1s otherwise
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 60000); // Max 60s
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get API client statistics
   */
  getStats(): APIClientStats {
    return {
      totalRequests: this.stats.total,
      successfulRequests: this.stats.success,
      failedRequests: this.stats.failed,
      successRate:
        this.stats.total > 0
          ? (this.stats.success / this.stats.total) * 100
          : 0,
      total: this.stats.total,
      success: this.stats.success,
      failed: this.stats.failed,
      retries: this.stats.retries,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retries: 0,
    };
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set logger
   */
  setLogger(logger: Logger | null): void {
    this.logger = logger;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new Gemini API client
 */
export function createApiClient(
  apiKey: string,
  logger?: Logger,
): GeminiApiClient {
  return new GeminiApiClient(apiKey, logger || null);
}

// ============================================================================
// DEFAULT LOGGER
// ============================================================================

export const defaultLogger: Logger = {
  log: (...args: any[]) => console.log("[GeminiAPI]", ...args),
  warn: (msg: string, data?: any) =>
    console.warn(`[GeminiAPI] ${msg}`, data ?? ""),
  info: (msg: string, data?: any) =>
    console.log(`[GeminiAPI] ${msg}`, data || ""),
  success: (msg: string, data?: any) =>
    console.log(`[GeminiAPI] âœ“ ${msg}`, data || ""),
  warning: (msg: string, data?: any) =>
    console.warn(`[GeminiAPI] âš  ${msg}`, data || ""),
  error: (msg: string, data?: any) =>
    console.error(`[GeminiAPI] âœ— ${msg}`, data || ""),
  debug: (msg: string, data?: any) =>
    console.debug(`[GeminiAPI] ${msg}`, data || ""),
};

// ============================================================================
// EXPORTS
// ============================================================================

export default GeminiApiClient;
