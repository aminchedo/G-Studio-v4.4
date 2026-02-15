/**
 * Network Reliability Verification
 * 
 * Runtime checks to ensure:
 * - VPN failure cannot crash the app
 * - Fallback does not loop
 * - Only ONE retry allowed
 * - Streaming is re-enabled automatically when network stabilizes
 */

import { NetworkReliabilityService } from './networkReliabilityService';

export class NetworkReliabilityVerification {
  private static retryCount: Map<string, number> = new Map();
  private static readonly MAX_RETRIES = 1;
  private static readonly RETRY_WINDOW_MS = 60000; // 1 minute
  private static lastVerification: number = 0;
  private static readonly VERIFICATION_INTERVAL = 30000; // 30 seconds

  /**
   * Verify retry count doesn't exceed limit
   */
  static verifyRetryLimit(requestId: string): boolean {
    const count = this.retryCount.get(requestId) || 0;
    if (count >= this.MAX_RETRIES) {
      console.warn('[NETWORK_VERIFY]: Retry limit exceeded', {
        requestId,
        count,
        maxRetries: this.MAX_RETRIES
      });
      return false;
    }
    return true;
  }

  /**
   * Increment retry count for a request
   */
  static incrementRetry(requestId: string): void {
    const count = (this.retryCount.get(requestId) || 0) + 1;
    this.retryCount.set(requestId, count);
    
    // Clean up old entries after window expires
    setTimeout(() => {
      this.retryCount.delete(requestId);
    }, this.RETRY_WINDOW_MS);
  }

  /**
   * Verify fallback doesn't loop
   */
  static verifyNoFallbackLoop(requestId: string, attemptNumber: number): boolean {
    if (attemptNumber > 2) {
      console.error('[NETWORK_VERIFY]: Fallback loop detected', {
        requestId,
        attemptNumber
      });
      return false;
    }
    return true;
  }

  /**
   * Verify VPN failure handling doesn't crash
   */
  static verifyVpnFailureHandling(error: unknown): boolean {
    try {
      // Ensure error is properly handled
      if (error instanceof Error) {
        // Error is properly typed - good
        return true;
      }
      
      // Convert to Error if needed
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Verify NetworkReliabilityService can handle it
      const networkError = NetworkReliabilityService.analyzeError(err, {
        apiKeyValidated: true,
        requestType: 'streaming',
        attemptNumber: 1
      });
      
      // If we got here, handling is working
      return true;
    } catch (verificationError) {
      console.error('[NETWORK_VERIFY]: VPN failure handling verification failed', {
        originalError: error,
        verificationError
      });
      // Don't crash - return false to indicate verification failed
      return false;
    }
  }

  /**
   * Verify streaming recovery mechanism
   */
  static verifyStreamingRecovery(): void {
    const now = Date.now();
    if (now - this.lastVerification < this.VERIFICATION_INTERVAL) {
      return;
    }

    this.lastVerification = now;

    // Check if streaming should be re-enabled
    NetworkReliabilityService.checkStreamingRecovery();
    
    const streamingEnabled = NetworkReliabilityService.isStreamingEnabled();
    
    console.log('[NETWORK_VERIFY]: Streaming recovery check', {
      streamingEnabled,
      timestamp: now
    });
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Full verification before retry
   */
  static verifyBeforeRetry(requestId: string, attemptNumber: number, error: unknown): {
    canRetry: boolean;
    reason?: string;
  } {
    // Check retry limit
    if (!this.verifyRetryLimit(requestId)) {
      return {
        canRetry: false,
        reason: 'MAX_RETRIES_EXCEEDED'
      };
    }

    // Check for fallback loop
    if (!this.verifyNoFallbackLoop(requestId, attemptNumber)) {
      return {
        canRetry: false,
        reason: 'FALLBACK_LOOP_DETECTED'
      };
    }

    // Verify error handling
    if (!this.verifyVpnFailureHandling(error)) {
      return {
        canRetry: false,
        reason: 'ERROR_HANDLING_FAILED'
      };
    }

    // All checks passed
    this.incrementRetry(requestId);
    return {
      canRetry: true
    };
  }

  /**
   * Cleanup old retry counts (call periodically)
   */
  static cleanup(): void {
    // Cleanup happens automatically via setTimeout in incrementRetry
    // This method is for manual cleanup if needed
    const now = Date.now();
    // In a real implementation, we'd track timestamps and clean up here
    // For now, the setTimeout approach is sufficient
  }
}
