/**
 * createAPIClient - Factory function for robust API clients
 * 
 * Provides retry logic, error handling, and request statistics
 * Replaces class-based RobustAPIClient
 */

// Types
export interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  headers?: Record<string, string>;
  onRequest?: (request: RequestInfo) => void;
  onResponse?: (response: Response) => void;
  onError?: (error: Error) => void;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  skipRetry?: boolean;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  responseTime?: number;
  attempt?: number;
  retryable?: boolean;
}

export interface APIClientStats {
  total: number;
  success: number;
  failed: number;
  retries: number;
  averageResponseTime: number;
}

export interface APIClient {
  request: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<APIResponse<T>>;
  get: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<APIResponse<T>>;
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<APIResponse<T>>;
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<APIResponse<T>>;
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) => Promise<APIResponse<T>>;
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<APIResponse<T>>;
  getStats: () => APIClientStats;
  resetStats: () => void;
  setHeader: (key: string, value: string) => void;
  removeHeader: (key: string) => void;
}

// Default configuration
const DEFAULT_CONFIG: Required<Omit<APIClientConfig, 'onRequest' | 'onResponse' | 'onError'>> = {
  baseUrl: '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper functions
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (status: number): boolean => {
  // Retry on server errors and specific client errors
  return status >= 500 || status === 429 || status === 408;
};

/**
 * Create an API client instance
 */
export function createAPIClient(config: APIClientConfig): APIClient {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    headers: { ...DEFAULT_CONFIG.headers, ...config.headers },
  };

  // Statistics tracking
  const stats: APIClientStats = {
    total: 0,
    success: 0,
    failed: 0,
    retries: 0,
    averageResponseTime: 0,
  };
  const responseTimes: number[] = [];

  // Mutable headers
  let headers = { ...finalConfig.headers };

  // Update average response time
  const updateAverageResponseTime = (time: number): void => {
    responseTimes.push(time);
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
    stats.averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  };

  // Make a single request
  const makeRequest = async <T>(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<{ data: T; status: number; responseTime: number }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startTime = Date.now();

    try {
      finalConfig.onRequest?.({ url, ...options } as RequestInfo);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      finalConfig.onResponse?.(response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || errorData.message || `HTTP ${response.status}`
        );
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      let data: T;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (response.status === 204) {
        data = undefined as T;
      } else {
        data = (await response.text()) as T;
      }

      return { data, status: response.status, responseTime };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Main request function with retry logic
  const request = async <T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> => {
    const maxRetries = options.skipRetry ? 1 : (options.maxRetries ?? finalConfig.maxRetries);
    const timeout = options.timeout ?? finalConfig.timeout;
    const url = endpoint.startsWith('http') ? endpoint : `${finalConfig.baseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        stats.total++;
        const { data, status, responseTime } = await makeRequest<T>(url, options, timeout);

        stats.success++;
        updateAverageResponseTime(responseTime);

        return {
          success: true,
          data,
          status,
          responseTime,
          attempt,
        };
      } catch (error: any) {
        lastError = error;
        const status = error.status || 0;

        finalConfig.onError?.(error);

        // Don't retry on auth errors or if explicitly not retryable
        if (status === 401 || status === 403 || options.skipRetry) {
          stats.failed++;
          return {
            success: false,
            error: error.message,
            status,
            retryable: false,
          };
        }

        // Retry if appropriate
        if (attempt < maxRetries && (status === 0 || isRetryableError(status))) {
          stats.retries++;
          const delay = finalConfig.exponentialBackoff
            ? finalConfig.retryDelay * Math.pow(2, attempt - 1)
            : finalConfig.retryDelay;
          await sleep(delay);
          continue;
        }

        stats.failed++;
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
      status: (lastError as any)?.status || 0,
      retryable: true,
    };
  };

  // Convenience methods
  const get = <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> =>
    request<T>(endpoint, { ...options, method: 'GET' });

  const post = <T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });

  const put = <T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });

  const patch = <T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });

  const del = <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> =>
    request<T>(endpoint, { ...options, method: 'DELETE' });

  const getStats = (): APIClientStats => ({ ...stats });

  const resetStats = (): void => {
    stats.total = 0;
    stats.success = 0;
    stats.failed = 0;
    stats.retries = 0;
    stats.averageResponseTime = 0;
    responseTimes.length = 0;
  };

  const setHeader = (key: string, value: string): void => {
    headers[key] = value;
  };

  const removeHeader = (key: string): void => {
    delete headers[key];
  };

  return {
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    getStats,
    resetStats,
    setHeader,
    removeHeader,
  };
}

// React hook for API client
import { useMemo, useCallback, useState } from 'react';

export interface UseAPIClientOptions extends Omit<APIClientConfig, 'baseUrl'> {
  baseUrl: string;
}

export interface UseAPIClientReturn<T = unknown> {
  client: APIClient;
  isLoading: boolean;
  error: string | null;
  data: T | null;
  execute: <R = T>(endpoint: string, options?: RequestOptions) => Promise<APIResponse<R>>;
  reset: () => void;
}

export function useAPIClient<T = unknown>(
  options: UseAPIClientOptions
): UseAPIClientReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const client = useMemo(() => createAPIClient(options), [options.baseUrl]);

  const execute = useCallback(
    async <R = T>(endpoint: string, requestOptions?: RequestOptions): Promise<APIResponse<R>> => {
      setIsLoading(true);
      setError(null);

      const response = await client.request<R>(endpoint, requestOptions);

      setIsLoading(false);

      if (response.success) {
        setData(response.data as unknown as T);
      } else {
        setError(response.error || 'Request failed');
      }

      return response;
    },
    [client]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    client,
    isLoading,
    error,
    data,
    execute,
    reset,
  };
}

export default createAPIClient;
