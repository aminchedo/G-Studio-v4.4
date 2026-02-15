/**
 * Network Reliability Service
 * 
 * Detects and handles VPN-related API communication failures where API key
 * validation succeeds but real message requests fail.
 * 
 * Features:
 * - Network failure differentiation (auth, VPN, timeout, streaming)
 * - VPN-suspect detection logic
 * - Automatic fallback strategy (non-streaming, increased timeout)
 * - Comprehensive logging
 * - Single retry enforcement
 */

export enum NetworkErrorType {
  API_AUTH_FAILURE = 'API_AUTH_FAILURE',
  NETWORK_VPN_INTERFERENCE = 'NETWORK_VPN_INTERFERENCE',
  TIMEOUT = 'TIMEOUT',
  STREAMING_BLOCKAGE = 'STREAMING_BLOCKAGE',
  UNKNOWN = 'UNKNOWN'
}

export interface NetworkError {
  type: NetworkErrorType;
  originalError: Error;
  errorName?: string;
  errorCode?: string | number;
  statusCode?: number;
  timeout?: boolean;
  isVpnSuspected: boolean;
}

export interface NetworkRequestContext {
  apiKeyValidated: boolean;
  requestType: 'streaming' | 'non-streaming';
  attemptNumber: number;
}

export interface FallbackResult {
  shouldRetry: boolean;
  useStreaming: boolean;
  timeout: number;
  error?: NetworkError;
}

export class NetworkReliabilityService {
  private static vpnSuspected: boolean = false;
  private static streamingDisabled: boolean = false;
  private static lastNetworkCheck: number = 0;
  private static readonly NETWORK_CHECK_INTERVAL = 60000; // 1 minute
  private static readonly MAX_RETRY_ATTEMPTS = 1; // Only one retry allowed
  private static readonly DEFAULT_TIMEOUT = 10000; // 10s default
  private static readonly FALLBACK_TIMEOUT = 30000; // 30s for fallback

  /**
   * Analyze error and determine network error type
   */
  static analyzeError(error: unknown, context: NetworkRequestContext): NetworkError {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorName = err.name;
    const errorMessage = err.message.toLowerCase();
    
    // Extract status code if available
    let statusCode: number | undefined;
    let errorCode: string | number | undefined;
    
    // Check for fetch/network errors
    if ('status' in err) {
      statusCode = (err as any).status;
    }
    if ('code' in err) {
      errorCode = (err as any).code;
    }
    
    // Check for timeout
    const isTimeout = 
      errorName === 'TimeoutError' ||
      errorName === 'AbortError' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('aborted') ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ECONNABORTED';

    // Check for connection reset/refused
    const isConnectionError =
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('reset') ||
      errorMessage.includes('refused') ||
      errorCode === 'ECONNRESET' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND';

    // Check for empty response
    const isEmptyResponse = 
      errorMessage.includes('empty') ||
      errorMessage.includes('no response') ||
      errorMessage.includes('response body is null');

    // Check for API auth failure
    const isAuthFailure =
      statusCode === 401 ||
      statusCode === 403 ||
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid api key');

    // Check for streaming-specific errors
    const isStreamingError =
      context.requestType === 'streaming' &&
      (errorMessage.includes('stream') ||
       errorMessage.includes('chunk') ||
       errorMessage.includes('readable'));

    // Determine error type
    let type: NetworkErrorType;
    if (isAuthFailure) {
      type = NetworkErrorType.API_AUTH_FAILURE;
    } else if (isTimeout) {
      type = NetworkErrorType.TIMEOUT;
    } else if (isStreamingError && context.requestType === 'streaming') {
      type = NetworkErrorType.STREAMING_BLOCKAGE;
    } else if (isConnectionError || isEmptyResponse) {
      type = NetworkErrorType.NETWORK_VPN_INTERFERENCE;
    } else {
      type = NetworkErrorType.UNKNOWN;
    }

    // VPN suspicion logic
    const isVpnSuspected = 
      context.apiKeyValidated && // API key test passed
      type !== NetworkErrorType.API_AUTH_FAILURE && // Not an auth issue
      (type === NetworkErrorType.NETWORK_VPN_INTERFERENCE ||
       type === NetworkErrorType.TIMEOUT ||
       type === NetworkErrorType.STREAMING_BLOCKAGE) &&
      (isConnectionError || isTimeout || isEmptyResponse);

    return {
      type,
      originalError: err,
      errorName,
      errorCode,
      statusCode,
      timeout: isTimeout,
      isVpnSuspected
    };
  }

  /**
   * Detect VPN suspicion based on error pattern
   */
  static detectVpnSuspicion(
    apiKeyValidated: boolean,
    messageSendFailed: boolean,
    networkError: NetworkError,
    requestId?: string
  ): boolean {
    if (!apiKeyValidated || !messageSendFailed) {
      return false;
    }

    const isNetworkIssue = 
      networkError.type === NetworkErrorType.NETWORK_VPN_INTERFERENCE ||
      networkError.type === NetworkErrorType.TIMEOUT ||
      networkError.type === NetworkErrorType.STREAMING_BLOCKAGE;

    if (isNetworkIssue) {
      const logPrefix = requestId ? `[NETWORK][requestId=${requestId}]` : '[NETWORK]';
      console.log(`${logPrefix} [VPN_SUSPECTED]`, {
        errorType: networkError.type,
        errorName: networkError.errorName,
        errorCode: networkError.errorCode,
        statusCode: networkError.statusCode,
        timeout: networkError.timeout,
        apiKeyValidated,
        messageSendFailed
      });
      this.vpnSuspected = true;
      return true;
    }

    return false;
  }

  /**
   * Determine fallback strategy
   */
  static determineFallback(
    error: NetworkError,
    context: NetworkRequestContext
  ): FallbackResult {
    const logPrefix = '[NETWORK]';
    
    console.log('[NETWORK]: REQUEST_START', {
      requestType: context.requestType,
      attemptNumber: context.attemptNumber,
      apiKeyValidated: context.apiKeyValidated
    });

    // If VPN suspected and first attempt, apply fallback
    if (error.isVpnSuspected && context.attemptNumber === 1) {
      console.log(`${logPrefix} [FALLBACK_APPLIED]`, {
        reason: 'VPN_SUSPECTED',
        originalErrorType: error.type,
        willRetry: true,
        useStreaming: false,
        timeout: this.FALLBACK_TIMEOUT,
        attemptNumber: context.attemptNumber
      });

      this.streamingDisabled = true;
      
      return {
        shouldRetry: true,
        useStreaming: false,
        timeout: this.FALLBACK_TIMEOUT,
        error
      };
    }

    // If already retried once, don't retry again
    if (context.attemptNumber > this.MAX_RETRY_ATTEMPTS) {
      console.log(`${logPrefix} [REQUEST_FAILED_FINAL]`, {
        attemptNumber: context.attemptNumber,
        errorType: error.type,
        reason: 'MAX_RETRIES_EXCEEDED',
        apiKeyValidated: context.apiKeyValidated,
        requestType: context.requestType
      });

      return {
        shouldRetry: false,
        useStreaming: false,
        timeout: this.DEFAULT_TIMEOUT,
        error
      };
    }

    // For timeout errors, retry with increased timeout
    if (error.type === NetworkErrorType.TIMEOUT && context.attemptNumber === 1) {
      console.log(`${logPrefix}: TIMEOUT`, {
        attemptNumber: context.attemptNumber,
        willRetry: true,
        newTimeout: this.FALLBACK_TIMEOUT
      });

      return {
        shouldRetry: true,
        useStreaming: !this.streamingDisabled,
        timeout: this.FALLBACK_TIMEOUT,
        error
      };
    }

    // No retry for auth failures
    if (error.type === NetworkErrorType.API_AUTH_FAILURE) {
      return {
        shouldRetry: false,
        useStreaming: false,
        timeout: this.DEFAULT_TIMEOUT,
        error
      };
    }

    // Default: no retry
    console.log(`${logPrefix} [REQUEST_FAILED_FINAL]`, {
      attemptNumber: context.attemptNumber,
      errorType: error.type,
      reason: 'NO_FALLBACK_AVAILABLE',
      apiKeyValidated: context.apiKeyValidated,
      requestType: context.requestType
    });

    return {
      shouldRetry: false,
      useStreaming: false,
      timeout: this.DEFAULT_TIMEOUT,
      error
    };
  }

  /**
   * Check if streaming should be re-enabled
   */
  static checkStreamingRecovery(): void {
    const now = Date.now();
    if (now - this.lastNetworkCheck < this.NETWORK_CHECK_INTERVAL) {
      return;
    }

    this.lastNetworkCheck = now;

    // If VPN was suspected but enough time has passed, try re-enabling streaming
    if (this.vpnSuspected && this.streamingDisabled) {
      // Reset flags to allow streaming again
      // This will be tested on next request
      this.streamingDisabled = false;
      console.log('[NETWORK]: STREAMING_RECOVERY_ATTEMPT', {
        note: 'Streaming will be re-enabled on next request'
      });
    }
  }

  /**
   * Get current streaming status
   */
  static isStreamingEnabled(): boolean {
    return !this.streamingDisabled;
  }

  /**
   * Reset VPN suspicion (for testing or manual recovery)
   */
  static resetVpnSuspicion(): void {
    this.vpnSuspected = false;
    this.streamingDisabled = false;
    console.log('[NETWORK]: VPN_SUSPICION_RESET');
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: NetworkError, fallbackApplied: boolean): string {
    if (error.type === NetworkErrorType.API_AUTH_FAILURE) {
      return 'Your API key is invalid or expired. Please check your API key in Settings.';
    }

    if (error.isVpnSuspected) {
      if (fallbackApplied) {
        return `Your API key is valid, but your network (VPN) is blocking full requests.\n\nThe system retried safely. If the issue persists, disable VPN or switch networks.`;
      } else {
        return `Your API key is valid, but your network (VPN) is blocking requests.\n\nPlease disable VPN or switch networks and try again.`;
      }
    }

    if (error.type === NetworkErrorType.TIMEOUT) {
      return 'The request timed out. This may be due to network issues or VPN interference.\n\nPlease check your connection and try again.';
    }

    if (error.type === NetworkErrorType.STREAMING_BLOCKAGE) {
      return 'Streaming is blocked by your network (VPN). The system will retry with non-streaming mode.';
    }

    return `Network error: ${error.originalError.message}\n\nPlease check your connection and try again.`;
  }

  /**
   * Log network event
   */
  static logNetworkEvent(event: string, data?: any): void {
    console.log(`[NETWORK]: ${event}`, data || {});
  }
}
