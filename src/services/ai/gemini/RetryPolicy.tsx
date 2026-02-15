import type { RetryConfig } from '@/types/ai';
import { GeminiError } from './types';

export class RetryPolicy {
  private attempts = 0;

  constructor(private config: RetryConfig) {}

  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    this.attempts = 0;

    while (true) {
      try {
        const result = await fn();
        this.attempts = 0; // Reset on success
        return result;
      } catch (error) {
        this.attempts++;

        const isRetryable = this.isRetryableError(error);
        const hasAttemptsLeft = this.attempts < this.config.maxAttempts;

        if (!isRetryable || !hasAttemptsLeft) {
          throw error;
        }

        const delay = this.calculateDelay();
        
        if (onRetry) {
          onRetry(this.attempts, error as Error);
        }

        console.warn(
          `[RetryPolicy] Attempt ${this.attempts}/${this.config.maxAttempts} failed. Retrying in ${delay}ms...`,
          error
        );

        await this.sleep(delay);
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof GeminiError) {
      return error.retryable;
    }

    if (error instanceof Error) {
      // Check if error message contains retryable error codes
      return this.config.retryableErrors.some(code =>
        error.message.includes(code)
      );
    }

    return false;
  }

  private calculateDelay(): number {
    const exponentialDelay =
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.attempts - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return Math.min(exponentialDelay + jitter, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAttempts(): number {
    return this.attempts;
  }

  reset(): void {
    this.attempts = 0;
  }
}
