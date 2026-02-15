/**
 * Request Coalescing
 * Prevents duplicate concurrent requests to the same endpoint
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  requestKey: string;
}

export class RequestCoalescer {
  private static pendingRequests: Map<string, PendingRequest> = new Map();
  private static readonly REQUEST_TIMEOUT_MS = 60000; // 1 minute

  static async coalesce<T>(
    requestKey: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean up stale requests
    this.cleanup();

    // Check if identical request is already in-flight
    const existing = this.pendingRequests.get(requestKey);
    if (existing && Date.now() - existing.timestamp < this.REQUEST_TIMEOUT_MS) {
      console.log(`[RequestCoalescer] Reusing in-flight request: ${requestKey}`);
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending after completion
      this.pendingRequests.delete(requestKey);
    });

    this.pendingRequests.set(requestKey, {
      promise,
      timestamp: Date.now(),
      requestKey
    });

    return promise;
  }

  static createKey(
    modelId: string,
    message: string,
    apiKey: string
  ): string {
    // Create stable key from request characteristics
    const messageHash = message.substring(0, 100).replace(/\s+/g, ' ');
    const apiKeyPrefix = apiKey.substring(0, 8);
    return `${modelId}:${apiKeyPrefix}:${messageHash}`;
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT_MS) {
        this.pendingRequests.delete(key);
      }
    }
  }

  static reset(): void {
    this.pendingRequests.clear();
  }
}
