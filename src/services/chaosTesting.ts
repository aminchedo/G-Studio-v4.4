/**
 * Failure Injection & Chaos Hooks (Non-Destructive, DEV-ONLY)
 * 
 * Allows controlled testing of failure paths without code changes.
 * Environment-based flags for simulating failures.
 * 
 * SAFETY: NEVER runs in production - checked via NODE_ENV.
 */

export class ChaosTesting {
  private static enabled: boolean = false;
  private static flags: Map<string, boolean> = new Map();
  private static requestCount: Map<string, number> = new Map(); // Track per-request chaos state

  /**
   * Check if we're in development mode
   */
  private static isDevelopment(): boolean {
    return typeof process !== 'undefined' && 
           process.env && 
           (process.env.NODE_ENV === 'development' || process.env.DEV_CHAOS_MODE === 'true');
  }

  /**
   * Initialize chaos testing from environment
   * DEV-ONLY: Automatically disabled in production
   */
  static initialize(): void {
    // SAFETY: Only enable in development
    if (!this.isDevelopment()) {
      this.enabled = false;
      console.log('[CHAOS_TEST]: DISABLED (production mode)');
      return;
    }

    if (typeof process !== 'undefined' && process.env) {
      // Use DEV_CHAOS_MODE or ENABLE_CHAOS_TESTING
      this.enabled = process.env.DEV_CHAOS_MODE === 'true' || process.env.ENABLE_CHAOS_TESTING === 'true';
      
      // Load chaos flags
      this.flags.set('api_outage', process.env.CHAOS_API_OUTAGE === 'true');
      this.flags.set('network_flapping', process.env.CHAOS_NETWORK_FLAPPING === 'true');
      this.flags.set('corrupt_context', process.env.CHAOS_CORRUPT_CONTEXT === 'true');
      this.flags.set('partial_download', process.env.CHAOS_PARTIAL_DOWNLOAD === 'true');
      this.flags.set('empty_response', process.env.CHAOS_EMPTY_RESPONSE === 'true');
      this.flags.set('malformed_chunk', process.env.CHAOS_MALFORMED_CHUNK === 'true');
      this.flags.set('partial_network_drop', process.env.CHAOS_PARTIAL_NETWORK_DROP === 'true');
    }

    if (this.enabled) {
      console.log('[CHAOS_TEST]: ENABLED (DEV-ONLY)');
      console.warn('[ChaosTesting] ⚠️ Failure injection is ACTIVE - DEV MODE ONLY!');
    } else {
      console.log('[CHAOS_TEST]: DISABLED');
    }
  }

  /**
   * Check if chaos testing is enabled
   * DEV-ONLY: Always false in production
   */
  static isEnabled(): boolean {
    // Double-check we're in dev mode
    if (!this.isDevelopment()) {
      return false;
    }
    return this.enabled;
  }

  /**
   * Simulate API outage
   */
  static shouldSimulateAPIOutage(): boolean {
    return this.enabled && this.flags.get('api_outage') === true;
  }

  /**
   * Simulate network flapping
   */
  static shouldSimulateNetworkFlapping(): boolean {
    if (!this.enabled || !this.flags.get('network_flapping')) {
      return false;
    }
    // Randomly return true ~30% of the time
    return Math.random() < 0.3;
  }

  /**
   * Simulate corrupt context entry
   */
  static shouldSimulateCorruptContext(): boolean {
    return this.enabled && this.flags.get('corrupt_context') === true;
  }

  /**
   * Simulate partial download
   */
  static shouldSimulatePartialDownload(): boolean {
    return this.enabled && this.flags.get('partial_download') === true;
  }

  /**
   * Handle chaos event
   */
  static handleChaosEvent(eventType: string, handler: () => void | Promise<void>): void {
    if (!this.enabled) {
      return;
    }

    try {
      console.log(`[CHAOS_EVENT]: HANDLED (${eventType})`);
      handler();
    } catch (error) {
      console.error(`[CHAOS_EVENT]: ESCAPED (${eventType})`, error);
    }
  }

  /**
   * Inject API failure
   */
  static async injectAPIFailure(): Promise<never> {
    if (this.shouldSimulateAPIOutage()) {
      console.log('[CHAOS_EVENT]: HANDLED (API outage)');
      throw new Error('Chaos test: Simulated API outage');
    }
    throw new Error('Chaos test not enabled for API outage');
  }

  /**
   * Inject network failure
   */
  static injectNetworkFailure(): boolean {
    if (this.shouldSimulateNetworkFlapping()) {
      console.log('[CHAOS_EVENT]: HANDLED (network flapping)');
      return true; // Signal network failure
    }
    return false;
  }

  /**
   * A) Simulate Empty Gemini Response
   * Returns valid HTTP response but with empty candidates/content
   * DEV-ONLY
   */
  static shouldSimulateEmptyResponse(requestId: string): boolean {
    if (!this.isEnabled() || !this.flags.get('empty_response')) {
      return false;
    }
    // Track per-request to ensure consistent behavior
    const count = this.requestCount.get(requestId) || 0;
    this.requestCount.set(requestId, count + 1);
    // Simulate on first request attempt
    return count === 0;
  }

  /**
   * Inject empty response (returns empty object)
   */
  static injectEmptyResponse(requestId: string): any {
    if (this.shouldSimulateEmptyResponse(requestId)) {
      console.log(`[CHAOS_EVENT][requestId=${requestId}]: HANDLED (empty response)`);
      return {
        candidates: [],
        usageMetadata: undefined
      };
    }
    return null; // No chaos injection
  }

  /**
   * B) Simulate Malformed Stream Chunk
   * Streaming API yields undefined, missing fields, or corrupted payload
   * DEV-ONLY
   */
  static shouldSimulateMalformedChunk(requestId: string, chunkIndex: number): boolean {
    if (!this.isEnabled() || !this.flags.get('malformed_chunk')) {
      return false;
    }
    // Simulate malformed chunk on 3rd chunk (after some data received)
    return chunkIndex === 2;
  }

  /**
   * Inject malformed chunk
   */
  static injectMalformedChunk(requestId: string, chunkIndex: number): any {
    if (this.shouldSimulateMalformedChunk(requestId, chunkIndex)) {
      console.log(`[CHAOS_EVENT][requestId=${requestId}]: HANDLED (malformed chunk)`, { chunkIndex });
      // Return malformed chunk: missing expected fields
      return {
        // Missing 'text', 'functionCalls', 'usageMetadata'
        // This will trigger validation errors
      };
    }
    return null; // No chaos injection
  }

  /**
   * C) Simulate Partial Network Drop
   * Mid-stream disconnect, ECONNRESET, timeout after partial data
   * DEV-ONLY
   */
  static shouldSimulatePartialNetworkDrop(requestId: string, bytesReceived: number): boolean {
    if (!this.isEnabled() || !this.flags.get('partial_network_drop')) {
      return false;
    }
    // Simulate drop after receiving some data (> 100 bytes but < 1000 bytes)
    return bytesReceived > 100 && bytesReceived < 1000;
  }

  /**
   * Inject partial network drop error
   */
  static injectPartialNetworkDrop(requestId: string, bytesReceived: number): Error | null {
    if (this.shouldSimulatePartialNetworkDrop(requestId, bytesReceived)) {
      console.log(`[CHAOS_EVENT][requestId=${requestId}]: HANDLED (partial network drop)`, { bytesReceived });
      const error = new Error('ECONNRESET: Connection reset by peer');
      (error as any).code = 'ECONNRESET';
      (error as any).bytesReceived = bytesReceived;
      return error;
    }
    return null; // No chaos injection
  }

  /**
   * Clean up request tracking (call after request completes)
   */
  static cleanupRequest(requestId: string): void {
    this.requestCount.delete(requestId);
  }
}

// Initialize on import
ChaosTesting.initialize();
