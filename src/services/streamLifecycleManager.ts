/**
 * Stream Lifecycle Manager
 * 
 * CRITICAL: Only one active Gemini streaming request may exist per chat session at any given time.
 * This manager ensures:
 * 1. Previous streams are cancelled when a new one starts
 * 2. 429 responses trigger cooldown/backoff, not retry
 * 3. Stream lifecycle is strictly controlled
 */

interface ActiveStream {
  requestId: string;
  abortController: AbortController;
  startedAt: number;
  apiKey: string;
}

export class StreamLifecycleManager {
  // Track active streams per API key (one stream per API key at a time)
  private static activeStreams: Map<string, ActiveStream> = new Map();
  
  // Track 429 cooldowns per API key (exponential backoff)
  private static cooldowns: Map<string, { until: number; attempts: number }> = new Map();
  private static readonly INITIAL_COOLDOWN_MS = 5000; // 5 seconds initial cooldown
  private static readonly MAX_COOLDOWN_MS = 60000; // 60 seconds maximum cooldown
  
  // CRITICAL FIX: Request locks to prevent concurrent streaming requests
  // Only one streaming request may be active per API key at any time
  private static requestLocks: Map<string, Promise<void>> = new Map();

  /**
   * CRITICAL FIX: Acquire lock before registering stream
   * Ensures only one streaming request is active per API key
   * Returns a release function that must be called when done
   */
  static async acquireStreamLock(apiKey: string): Promise<() => void> {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Wait for any existing lock to complete
    const existingLock = this.requestLocks.get(apiKeyHash);
    if (existingLock) {
      console.log(`[StreamLifecycleManager] Waiting for existing stream lock to release...`);
      await existingLock;
    }
    
    // Create new lock
    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = () => {
        this.requestLocks.delete(apiKeyHash);
        resolve();
      };
    });
    
    this.requestLocks.set(apiKeyHash, lockPromise);
    console.log(`[StreamLifecycleManager] Acquired stream lock for API key ${apiKeyHash.substring(0, 8)}...`);
    
    return release!;
  }

  /**
   * Register a new stream and cancel any previous stream for the same API key
   * Returns an AbortController that must be used for the stream
   * CRITICAL: Must call acquireStreamLock() BEFORE calling this
   */
  static registerStream(requestId: string, apiKey: string): AbortController {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    
    // Cancel previous stream if exists
    const previousStream = this.activeStreams.get(apiKeyHash);
    if (previousStream) {
      console.log(`[StreamLifecycleManager] Cancelling previous stream: ${previousStream.requestId} (new: ${requestId})`);
      previousStream.abortController.abort();
      this.activeStreams.delete(apiKeyHash);
    }
    
    // Create new abort controller for this stream
    const abortController = new AbortController();
    
    // Register new stream
    this.activeStreams.set(apiKeyHash, {
      requestId,
      abortController,
      startedAt: Date.now(),
      apiKey
    });
    
    console.log(`[StreamLifecycleManager] Registered new stream: ${requestId} for API key ${apiKeyHash.substring(0, 8)}...`);
    
    return abortController;
  }

  /**
   * Unregister a stream when it completes
   */
  static unregisterStream(requestId: string, apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const stream = this.activeStreams.get(apiKeyHash);
    
    if (stream && stream.requestId === requestId) {
      this.activeStreams.delete(apiKeyHash);
      console.log(`[StreamLifecycleManager] Unregistered stream: ${requestId}`);
    }
  }

  /**
   * Check if a stream is currently active for this API key
   */
  static hasActiveStream(apiKey: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    return this.activeStreams.has(apiKeyHash);
  }

  /**
   * Get the active stream for an API key
   */
  static getActiveStream(apiKey: string): ActiveStream | null {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    return this.activeStreams.get(apiKeyHash) || null;
  }

  /**
   * Handle 429 response - enter cooldown with exponential backoff, do NOT retry
   * 429 = RESOURCE_EXHAUSTED = "You've exceeded the rate limit"
   * According to Google docs: Verify you're within the model's rate limit
   * Use exponential backoff to respect rate limits
   * 
   * CRITICAL: Real-time cooldown enforcement with live UI feedback
   */
  static handle429(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const existing = this.cooldowns.get(apiKeyHash);
    const attempts = existing ? existing.attempts + 1 : 1;
    
    // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
    const cooldownMs = Math.min(
      this.INITIAL_COOLDOWN_MS * Math.pow(2, attempts - 1),
      this.MAX_COOLDOWN_MS
    );
    const cooldownUntil = Date.now() + cooldownMs;
    
    this.cooldowns.set(apiKeyHash, { until: cooldownUntil, attempts });
    
    console.log(`[StreamLifecycleManager] 429 detected (attempt ${attempts}) - entering ${cooldownMs}ms cooldown until ${new Date(cooldownUntil).toISOString()}`);
    
    // Real-time monitoring integration
    try {
      const { StreamingMonitor } = require('./streamingMonitor');
      StreamingMonitor.record429('system', apiKey, cooldownMs);
    } catch (e) {
      // Monitor not available, continue
    }
    
    // Cancel any active stream (429 means we should stop, not retry)
    const activeStream = this.activeStreams.get(apiKeyHash);
    if (activeStream) {
      console.log(`[StreamLifecycleManager] Cancelling active stream due to 429: ${activeStream.requestId}`);
      activeStream.abortController.abort();
      this.activeStreams.delete(apiKeyHash);
    }
    
    // Dispatch custom event for UI to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stream-cooldown', {
        detail: {
          apiKey: apiKeyHash,
          cooldownMs,
          cooldownUntil,
          attempts
        }
      }));
    }
  }

  /**
   * Check if API key is in cooldown after 429
   * CRITICAL: Real-time check with live monitoring
   */
  static isInCooldown(apiKey: string): boolean {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const cooldown = this.cooldowns.get(apiKeyHash);
    
    if (!cooldown) return false;
    
    if (Date.now() < cooldown.until) {
      // Still in cooldown - record status for real-time monitoring
      const remaining = cooldown.until - Date.now();
      try {
        const { StreamingMonitor } = require('./streamingMonitor');
        StreamingMonitor.recordCooldown(apiKey, remaining);
      } catch (e) {
        // Monitor not available, continue
      }
      return true; // Still in cooldown
    }
    
    // Cooldown expired, reset attempts counter
    this.cooldowns.delete(apiKeyHash);
    return false;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  static getRemainingCooldown(apiKey: string): number {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    const cooldown = this.cooldowns.get(apiKeyHash);
    
    if (!cooldown) return 0;
    
    const remaining = cooldown.until - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Reset cooldown (when request succeeds after cooldown)
   */
  static resetCooldown(apiKey: string): void {
    const apiKeyHash = this.getApiKeyHash(apiKey);
    this.cooldowns.delete(apiKeyHash);
  }

  /**
   * Cancel all active streams (cleanup)
   */
  static cancelAllStreams(): void {
    for (const stream of this.activeStreams.values()) {
      stream.abortController.abort();
    }
    this.activeStreams.clear();
    console.log('[StreamLifecycleManager] Cancelled all active streams');
  }

  /**
   * Clean up stale streams (older than 5 minutes)
   */
  static cleanup(): void {
    const now = Date.now();
    const STALE_MS = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, stream] of this.activeStreams.entries()) {
      if (now - stream.startedAt > STALE_MS) {
        console.log(`[StreamLifecycleManager] Cleaning up stale stream: ${stream.requestId}`);
        stream.abortController.abort();
        this.activeStreams.delete(key);
      }
    }
  }

  /**
   * Hash API key for storage (first 8 + last 8 chars)
   */
  private static getApiKeyHash(apiKey: string): string {
    if (apiKey.length <= 16) return apiKey;
    return apiKey.substring(0, 8) + apiKey.substring(apiKey.length - 8);
  }
}
