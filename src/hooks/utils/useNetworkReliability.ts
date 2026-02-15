/**
 * useNetworkReliability - Network reliability and retry hook
 * 
 * Provides network status monitoring, retry logic with exponential backoff,
 * and connection quality measurement
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface ConnectionQuality {
  status: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
}

export interface NetworkStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalRetries: number;
  averageLatency: number;
  lastCheck: number;
}

export interface UseNetworkReliabilityReturn {
  // State
  isOnline: boolean;
  latency: number;
  connectionQuality: ConnectionQuality;
  retryCount: number;
  stats: NetworkStats;
  lastError: Error | null;
  
  // Actions
  withRetry: <T>(operation: () => Promise<T>, config?: RetryConfig) => Promise<T>;
  checkConnection: () => Promise<boolean>;
  measureLatency: (url?: string) => Promise<number>;
  waitForOnline: (timeout?: number) => Promise<boolean>;
  
  // Utilities
  resetStats: () => void;
  setRetryDefaults: (config: RetryConfig) => void;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// Default retryable errors
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'network',
    'timeout',
    'econnrefused',
    'econnreset',
    'etimedout',
    'enetunreach',
    'fetch',
    'failed to fetch',
    '429', // Too many requests
    '500', // Internal server error
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
  ];
  return retryablePatterns.some(pattern => message.includes(pattern));
};

// Calculate delay with jitter
const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number => {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (±20%)
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
};

// Sleep utility
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * useNetworkReliability hook
 */
export function useNetworkReliability(): UseNetworkReliabilityReturn {
  // State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [latency, setLatency] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    status: 'good',
    latency: 0,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [stats, setStats] = useState<NetworkStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalRetries: 0,
    averageLatency: 0,
    lastCheck: Date.now(),
  });
  const [lastError, setLastError] = useState<Error | null>(null);

  // Refs
  const defaultConfigRef = useRef<RetryConfig>(DEFAULT_RETRY_CONFIG);
  const latencyHistoryRef = useRef<number[]>([]);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality(prev => ({ ...prev, status: 'good' }));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Network Information API (if available)
  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateConnectionInfo = () => {
      setConnectionQuality(prev => ({
        ...prev,
        downlink: connection.downlink,
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
      }));
    };

    connection.addEventListener('change', updateConnectionInfo);
    updateConnectionInfo();

    return () => {
      connection.removeEventListener('change', updateConnectionInfo);
    };
  }, []);

  // Update stats helper
  const updateStats = useCallback((
    success: boolean,
    requestLatency?: number,
    retriesUsed?: number
  ) => {
    setStats(prev => {
      const newTotal = prev.totalRequests + 1;
      const newSuccessful = prev.successfulRequests + (success ? 1 : 0);
      const newFailed = prev.failedRequests + (success ? 0 : 1);
      const newRetries = prev.totalRetries + (retriesUsed || 0);

      // Update average latency
      let newAvgLatency = prev.averageLatency;
      if (requestLatency !== undefined) {
        latencyHistoryRef.current.push(requestLatency);
        if (latencyHistoryRef.current.length > 100) {
          latencyHistoryRef.current.shift();
        }
        newAvgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / 
                        latencyHistoryRef.current.length;
      }

      return {
        totalRequests: newTotal,
        successfulRequests: newSuccessful,
        failedRequests: newFailed,
        totalRetries: newRetries,
        averageLatency: Math.round(newAvgLatency),
        lastCheck: Date.now(),
      };
    });
  }, []);

  // Measure latency
  const measureLatency = useCallback(async (url?: string): Promise<number> => {
    const targetUrl = url || 'https://www.google.com/generate_204';
    const startTime = performance.now();

    try {
      await fetch(targetUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      const endTime = performance.now();
      const measuredLatency = Math.round(endTime - startTime);
      
      setLatency(measuredLatency);
      
      // Update connection quality based on latency
      let status: ConnectionQuality['status'] = 'excellent';
      if (measuredLatency > 500) status = 'poor';
      else if (measuredLatency > 200) status = 'good';
      
      setConnectionQuality(prev => ({
        ...prev,
        latency: measuredLatency,
        status: isOnline ? status : 'offline',
      }));

      return measuredLatency;
    } catch (error) {
      setConnectionQuality(prev => ({ ...prev, status: 'poor' }));
      return -1;
    }
  }, [isOnline]);

  // Check connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    try {
      const latencyMs = await measureLatency();
      const isConnected = latencyMs >= 0;
      setIsOnline(isConnected);
      return isConnected;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, [measureLatency]);

  // Wait for online
  const waitForOnline = useCallback(async (timeout?: number): Promise<boolean> => {
    if (isOnline) return true;

    return new Promise((resolve) => {
      const timeoutId = timeout
        ? setTimeout(() => {
            cleanup();
            resolve(false);
          }, timeout)
        : null;

      const checkInterval = setInterval(async () => {
        const online = await checkConnection();
        if (online) {
          cleanup();
          resolve(true);
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    });
  }, [isOnline, checkConnection]);

  // Retry wrapper
  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    config?: RetryConfig
  ): Promise<T> => {
    const mergedConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...defaultConfigRef.current,
      ...config,
    };

    const {
      maxRetries,
      initialDelay,
      maxDelay,
      backoffMultiplier,
      shouldRetry = isRetryableError,
      onRetry,
    } = mergedConfig;

    let lastError: Error = new Error('Operation failed');
    let retriesUsed = 0;
    const startTime = performance.now();

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        setRetryCount(attempt - 1);
        const result = await operation();
        
        const requestLatency = performance.now() - startTime;
        updateStats(true, requestLatency, retriesUsed);
        setLastError(null);
        setRetryCount(0);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        setLastError(lastError);

        // Check if we should retry
        if (attempt > maxRetries || !shouldRetry(lastError, attempt)) {
          break;
        }

        retriesUsed++;
        
        // Calculate delay
        const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);
        
        // Callback
        onRetry?.(lastError, attempt);

        // Wait before retrying
        await sleep(delay);
      }
    }

    const requestLatency = performance.now() - startTime;
    updateStats(false, requestLatency, retriesUsed);
    setRetryCount(0);
    
    throw lastError;
  }, [updateStats]);

  // Reset stats
  const resetStats = useCallback(() => {
    setStats({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalRetries: 0,
      averageLatency: 0,
      lastCheck: Date.now(),
    });
    latencyHistoryRef.current = [];
  }, []);

  // Set default retry config
  const setRetryDefaults = useCallback((config: RetryConfig) => {
    defaultConfigRef.current = { ...defaultConfigRef.current, ...config };
  }, []);

  return {
    isOnline,
    latency,
    connectionQuality,
    retryCount,
    stats,
    lastError,
    withRetry,
    checkConnection,
    measureLatency,
    waitForOnline,
    resetStats,
    setRetryDefaults,
  };
}

export default useNetworkReliability;
