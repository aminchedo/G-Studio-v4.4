/**
 * Retry Policy Manager
 * 
 * ✅ Exponential backoff with jitter
 * ✅ Configurable retry attempts
 * ✅ Smart retry decision making
 */

import { RetryConfig, GeminiError, GeminiErrorCode } from './types';

export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't delay on last attempt
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(
            `[RetryPolicy] Attempt ${attempt} failed. ` +
            `Retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError!;
  }

  /**
   * Determine if error should be retried
   */
  private isRetryable(error: any): boolean {
    // Network errors are always retryable
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }

    // Timeout errors are retryable
    if (error.name === 'AbortError') {
      return true;
    }

    // Gemini-specific errors
    if (error instanceof GeminiError) {
      switch (error.code) {
        case GeminiErrorCode.NETWORK_ERROR:
        case GeminiErrorCode.TIMEOUT:
        case GeminiErrorCode.RATE_LIMITED:
          return true;

        case GeminiErrorCode.INVALID_API_KEY:
        case GeminiErrorCode.QUOTA_EXCEEDED:
        case GeminiErrorCode.INVALID_REQUEST:
        case GeminiErrorCode.SAFETY_BLOCK:
          return false;

        default:
          // Unknown errors - retry with caution
          return true;
      }
    }

    // HTTP status codes
    if (error.statusCode) {
      const retryableStatuses = [
        408, // Request Timeout
        429, // Too Many Requests
        500, // Internal Server Error
        502, // Bad Gateway
        503, // Service Unavailable
        504, // Gateway Timeout
      ];
      return retryableStatuses.includes(error.statusCode);
    }

    // Default: retry unknown errors
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff
    const exponentialDelay = 
      this.config.baseDelay * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter (randomize ±30%)
    const jitter = cappedDelay * 0.3 * (Math.random() - 0.5);
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Example usage:
 * 
 * const retryPolicy = new RetryPolicy({
 *   maxAttempts: 3,
 *   baseDelay: 1000,
 *   maxDelay: 10000,
 *   backoffMultiplier: 2,
 * });
 * 
 * const result = await retryPolicy.execute(async () => {
 *   return await fetchData();
 * });
 * 
 * // Retry timeline for failed requests:
 * // Attempt 1: Immediate
 * // Attempt 2: After ~1000ms (1s + jitter)
 * // Attempt 3: After ~2000ms (2s + jitter)
 * // Total max time: ~3 seconds
 */
