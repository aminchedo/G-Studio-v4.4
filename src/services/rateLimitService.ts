/**
 * Rate Limit Service
 * Global state management for provider-level rate limiting
 * 
 * This service provides a centralized way to track and manage rate limit status
 * across the entire application, ensuring all components are aware of rate limit state.
 */

export interface RateLimitState {
  isRateLimited: boolean;
  rateLimitedAt: number | null;
  cooldownSeconds: number;
  apiKeyHash: string | null; // First 8 + last 4 chars for identification
}

export class RateLimitService {
  private static readonly STORAGE_KEY = 'gstudio_rate_limit_state';
  private static readonly DEFAULT_COOLDOWN_SECONDS = 60;
  private static inMemoryState: RateLimitState = {
    isRateLimited: false,
    rateLimitedAt: null,
    cooldownSeconds: RateLimitService.DEFAULT_COOLDOWN_SECONDS,
    apiKeyHash: null
  };

  /**
   * Mark provider as rate-limited
   * @param apiKey - API key that triggered rate limit
   * @param cooldownSeconds - Cooldown duration (default: 60)
   */
  static markRateLimited(apiKey: string, cooldownSeconds: number = RateLimitService.DEFAULT_COOLDOWN_SECONDS): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const state: RateLimitState = {
      isRateLimited: true,
      rateLimitedAt: Date.now(),
      cooldownSeconds,
      apiKeyHash
    };

    this.inMemoryState = state;

    // Persist to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[RateLimitService] Failed to persist rate limit state:', e);
    }

    console.log(`[RateLimitService] Provider marked as rate-limited (cooldown: ${cooldownSeconds}s)`);
  }

  /**
   * Clear rate limit status
   */
  static clearRateLimit(): void {
    this.inMemoryState = {
      isRateLimited: false,
      rateLimitedAt: null,
      cooldownSeconds: RateLimitService.DEFAULT_COOLDOWN_SECONDS,
      apiKeyHash: null
    };

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('[RateLimitService] Failed to clear rate limit state:', e);
    }

    console.log('[RateLimitService] Rate limit status cleared');
  }

  /**
   * Check if provider is currently rate-limited
   * @param apiKey - Optional API key to check (if provided, checks if rate limit applies to this key)
   * @returns true if rate-limited and cooldown hasn't expired
   */
  static isRateLimited(apiKey?: string): boolean {
    const state = this.getState();

    if (!state.isRateLimited || !state.rateLimitedAt) {
      return false;
    }

    // Check if cooldown has expired
    const elapsedSeconds = (Date.now() - state.rateLimitedAt) / 1000;
    if (elapsedSeconds >= state.cooldownSeconds) {
      // Cooldown expired - auto-clear
      this.clearRateLimit();
      return false;
    }

    // If API key provided, check if it matches the rate-limited key
    if (apiKey) {
      const apiKeyHash = this.getApiKeyHash(apiKey);
      if (state.apiKeyHash && state.apiKeyHash !== apiKeyHash) {
        // Different API key - not rate-limited
        return false;
      }
    }

    return true;
  }

  /**
   * Get remaining cooldown seconds
   * @param apiKey - Optional API key
   * @returns Remaining cooldown seconds, or 0 if not rate-limited
   */
  static getRemainingCooldown(apiKey?: string): number {
    if (!this.isRateLimited(apiKey)) {
      return 0;
    }

    const state = this.getState();
    if (!state.rateLimitedAt) {
      return 0;
    }

    const elapsedSeconds = (Date.now() - state.rateLimitedAt) / 1000;
    const remaining = Math.max(0, state.cooldownSeconds - elapsedSeconds);
    return Math.ceil(remaining);
  }

  /**
   * Get current rate limit state
   */
  static getState(): RateLimitState {
    // Try to load from localStorage if in-memory state is not rate-limited
    if (!this.inMemoryState.isRateLimited) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RateLimitState;
          // Check if cooldown has expired
          if (parsed.rateLimitedAt) {
            const elapsedSeconds = (Date.now() - parsed.rateLimitedAt) / 1000;
            if (elapsedSeconds < parsed.cooldownSeconds) {
              this.inMemoryState = parsed;
            } else {
              // Expired - clear it
              this.clearRateLimit();
            }
          }
        }
      } catch (e) {
        // Silently fail
      }
    }

    return { ...this.inMemoryState };
  }

  /**
   * Get API key hash for identification (first 8 + last 4 chars)
   */
  private static getApiKeyHash(apiKey: string): string {
    if (apiKey.length <= 12) {
      return apiKey.substring(0, 8) + '...';
    }
    return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Record rate limit event for telemetry
   */
  static recordRateLimitEvent(apiKey: string, context?: string): void {
    try {
      const events = JSON.parse(localStorage.getItem('gstudio_rate_limit_events') || '[]');
      events.push({
        timestamp: Date.now(),
        apiKeyHash: this.getApiKeyHash(apiKey),
        context: context || 'unknown'
      });
      // Keep only last 50 events
      const recentEvents = events.slice(-50);
      localStorage.setItem('gstudio_rate_limit_events', JSON.stringify(recentEvents));
    } catch (e) {
      // Silently fail telemetry
    }
  }

  /**
   * Get rate limit event history (for debugging/analytics)
   */
  static getRateLimitEvents(): Array<{ timestamp: number; apiKeyHash: string; context: string }> {
    try {
      return JSON.parse(localStorage.getItem('gstudio_rate_limit_events') || '[]');
    } catch (e) {
      return [];
    }
  }
}
