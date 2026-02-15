/**
 * Real-Time Streaming Monitor
 * 
 * Monitors live SSE streams, network traffic, state transitions, and UI events
 * Provides runtime debugging and observability for streaming behavior
 * 
 * CRITICAL: This service runs while the app is actively executing
 */

export interface StreamEvent {
  type: 'stream_start' | 'stream_chunk' | 'stream_end' | 'stream_error' | '429_detected' | 'cooldown_active' | 'model_switch';
  requestId: string;
  timestamp: number;
  data: any;
}

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

export class StreamingMonitor {
  private static events: StreamEvent[] = [];
  private static networkRequests: Map<string, NetworkRequest> = new Map();
  private static activeStreams: Map<string, {
    requestId: string;
    modelId: string;
    apiKey: string;
    startedAt: number;
    chunksReceived: number;
    bytesReceived: number;
  }> = new Map();
  
  private static readonly MAX_EVENTS = 1000; // Keep last 1000 events
  private static listeners: Set<(event: StreamEvent) => void> = new Set();

  /**
   * Record a stream event for real-time monitoring
   */
  static recordEvent(type: StreamEvent['type'], requestId: string, data: any): void {
    const event: StreamEvent = {
      type,
      requestId,
      timestamp: Date.now(),
      data
    };

    this.events.push(event);
    
    // Keep only last MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[StreamingMonitor] Listener error:', error);
      }
    });

    // Log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[StreamMonitor][${type}]`, { requestId, ...data });
    }
  }

  /**
   * Track network request start
   */
  static trackRequestStart(requestId: string, url: string, method: string = 'POST'): void {
    this.networkRequests.set(requestId, {
      requestId,
      url,
      method,
      startTime: Date.now()
    });
    
    this.recordEvent('stream_start', requestId, { url, method });
  }

  /**
   * Track network request completion
   */
  static trackRequestEnd(requestId: string, status: number, statusText?: string, error?: string): void {
    const request = this.networkRequests.get(requestId);
    if (request) {
      request.endTime = Date.now();
      request.status = status;
      request.statusText = statusText;
      request.error = error;
      
      if (status === 429) {
        this.recordEvent('429_detected', requestId, { status, statusText });
      } else if (error) {
        this.recordEvent('stream_error', requestId, { error, status });
      }
    }
  }

  /**
   * Register active stream
   */
  static registerStream(requestId: string, modelId: string, apiKey: string): void {
    this.activeStreams.set(requestId, {
      requestId,
      modelId,
      apiKey,
      startedAt: Date.now(),
      chunksReceived: 0,
      bytesReceived: 0
    });
    
    this.recordEvent('stream_start', requestId, { modelId, apiKey: apiKey.substring(0, 8) + '...' });
  }

  /**
   * Record stream chunk
   */
  static recordChunk(requestId: string, chunkSize: number, text?: string): void {
    const stream = this.activeStreams.get(requestId);
    if (stream) {
      stream.chunksReceived++;
      stream.bytesReceived += chunkSize;
      
      this.recordEvent('stream_chunk', requestId, {
        chunkSize,
        totalChunks: stream.chunksReceived,
        totalBytes: stream.bytesReceived,
        textPreview: text ? text.substring(0, 50) : undefined
      });
    }
  }

  /**
   * Unregister stream
   */
  static unregisterStream(requestId: string): void {
    const stream = this.activeStreams.get(requestId);
    if (stream) {
      const duration = Date.now() - stream.startedAt;
      this.recordEvent('stream_end', requestId, {
        duration,
        chunksReceived: stream.chunksReceived,
        bytesReceived: stream.bytesReceived
      });
      
      this.activeStreams.delete(requestId);
    }
    
    this.networkRequests.delete(requestId);
  }

  /**
   * Record 429 detection
   */
  static record429(requestId: string, apiKey: string, cooldownMs: number): void {
    this.recordEvent('429_detected', requestId, {
      apiKey: apiKey.substring(0, 8) + '...',
      cooldownMs,
      cooldownUntil: Date.now() + cooldownMs
    });
  }

  /**
   * Record cooldown status
   */
  static recordCooldown(apiKey: string, remainingMs: number): void {
    this.recordEvent('cooldown_active', 'system', {
      apiKey: apiKey.substring(0, 8) + '...',
      remainingMs
    });
  }

  /**
   * Record model switch
   */
  static recordModelSwitch(requestId: string, oldModel: string, newModel: string): void {
    this.recordEvent('model_switch', requestId, { oldModel, newModel });
  }

  /**
   * Get active streams count
   */
  static getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Get active streams for an API key
   */
  static getActiveStreamsForApiKey(apiKey: string): string[] {
    const apiKeyHash = apiKey.substring(0, 8) + apiKey.substring(apiKey.length - 8);
    return Array.from(this.activeStreams.values())
      .filter(s => s.apiKey === apiKey)
      .map(s => s.requestId);
  }

  /**
   * Get recent events
   */
  static getRecentEvents(count: number = 50): StreamEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get network requests
   */
  static getNetworkRequests(): NetworkRequest[] {
    return Array.from(this.networkRequests.values());
  }

  /**
   * Subscribe to events
   */
  static subscribe(listener: (event: StreamEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all monitoring data
   */
  static clear(): void {
    this.events = [];
    this.networkRequests.clear();
    this.activeStreams.clear();
  }

  /**
   * Get monitoring statistics
   */
  static getStats(): {
    totalEvents: number;
    activeStreams: number;
    networkRequests: number;
    recent429s: number;
  } {
    const recent429s = this.events
      .filter(e => e.type === '429_detected')
      .filter(e => Date.now() - e.timestamp < 60000) // Last minute
      .length;

    return {
      totalEvents: this.events.length,
      activeStreams: this.activeStreams.size,
      networkRequests: this.networkRequests.size,
      recent429s
    };
  }
}

// Expose to window for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).StreamingMonitor = StreamingMonitor;
}
