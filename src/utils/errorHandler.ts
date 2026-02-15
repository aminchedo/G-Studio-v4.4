/**
 * Error handling utilities - Refactored from class ErrorHandler
 * 
 * Provides error categorization, handling, and reporting functions
 */

// Types
export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server'
  | 'client'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorInfo {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  suggestion: string;
  retryable: boolean;
  reportable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorHandlerConfig {
  onError?: (error: ErrorInfo) => void;
  onCriticalError?: (error: ErrorInfo) => void;
  reportErrors?: boolean;
  logErrors?: boolean;
  maxErrorHistory?: number;
}

// Error codes
export const ErrorCode = {
  // Authentication
  AUTH_INVALID_KEY: 'AUTH_001',
  AUTH_EXPIRED: 'AUTH_002',
  AUTH_FORBIDDEN: 'AUTH_003',
  
  // Network
  NETWORK_OFFLINE: 'NET_001',
  NETWORK_TIMEOUT: 'NET_002',
  NETWORK_FAILED: 'NET_003',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  QUOTA_EXCEEDED: 'RATE_002',
  
  // Server
  SERVER_ERROR: 'SRV_001',
  SERVER_UNAVAILABLE: 'SRV_002',
  SERVER_OVERLOADED: 'SRV_003',
  
  // Client
  VALIDATION_FAILED: 'CLI_001',
  INVALID_INPUT: 'CLI_002',
  STORAGE_FULL: 'CLI_003',
  
  // AI Specific
  MODEL_NOT_FOUND: 'AI_001',
  CONTENT_FILTERED: 'AI_002',
  CONTEXT_TOO_LONG: 'AI_003',
  
  // Unknown
  UNKNOWN: 'UNK_001',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// Error templates
const ERROR_TEMPLATES: Record<ErrorCodeType, Omit<ErrorInfo, 'originalError' | 'context' | 'timestamp'>> = {
  [ErrorCode.AUTH_INVALID_KEY]: {
    code: ErrorCode.AUTH_INVALID_KEY,
    category: 'authentication',
    severity: 'high',
    message: 'Invalid API key',
    userMessage: 'Your API key is invalid. Please check and try again.',
    suggestion: 'Verify your API key at the provider dashboard.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.AUTH_EXPIRED]: {
    code: ErrorCode.AUTH_EXPIRED,
    category: 'authentication',
    severity: 'high',
    message: 'API key expired',
    userMessage: 'Your API key has expired. Please renew it.',
    suggestion: 'Generate a new API key from the provider dashboard.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.AUTH_FORBIDDEN]: {
    code: ErrorCode.AUTH_FORBIDDEN,
    category: 'authorization',
    severity: 'high',
    message: 'Access forbidden',
    userMessage: 'You don\'t have permission to access this resource.',
    suggestion: 'Check your API key permissions.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.NETWORK_OFFLINE]: {
    code: ErrorCode.NETWORK_OFFLINE,
    category: 'network',
    severity: 'medium',
    message: 'No network connection',
    userMessage: 'You appear to be offline. Please check your connection.',
    suggestion: 'Check your internet connection and try again.',
    retryable: true,
    reportable: false,
  },
  [ErrorCode.NETWORK_TIMEOUT]: {
    code: ErrorCode.NETWORK_TIMEOUT,
    category: 'timeout',
    severity: 'medium',
    message: 'Request timed out',
    userMessage: 'The request took too long. Please try again.',
    suggestion: 'The server may be busy. Wait a moment and retry.',
    retryable: true,
    reportable: true,
  },
  [ErrorCode.NETWORK_FAILED]: {
    code: ErrorCode.NETWORK_FAILED,
    category: 'network',
    severity: 'medium',
    message: 'Network request failed',
    userMessage: 'Unable to connect to the server.',
    suggestion: 'Check your connection and firewall settings.',
    retryable: true,
    reportable: true,
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    category: 'rate_limit',
    severity: 'medium',
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please slow down.',
    suggestion: 'Wait a few seconds before making another request.',
    retryable: true,
    reportable: false,
  },
  [ErrorCode.QUOTA_EXCEEDED]: {
    code: ErrorCode.QUOTA_EXCEEDED,
    category: 'rate_limit',
    severity: 'high',
    message: 'Quota exceeded',
    userMessage: 'You\'ve reached your usage limit.',
    suggestion: 'Upgrade your plan or wait for quota reset.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.SERVER_ERROR]: {
    code: ErrorCode.SERVER_ERROR,
    category: 'server',
    severity: 'high',
    message: 'Server error',
    userMessage: 'The server encountered an error.',
    suggestion: 'This is usually temporary. Please try again.',
    retryable: true,
    reportable: true,
  },
  [ErrorCode.SERVER_UNAVAILABLE]: {
    code: ErrorCode.SERVER_UNAVAILABLE,
    category: 'server',
    severity: 'high',
    message: 'Server unavailable',
    userMessage: 'The service is temporarily unavailable.',
    suggestion: 'The service may be down for maintenance.',
    retryable: true,
    reportable: true,
  },
  [ErrorCode.SERVER_OVERLOADED]: {
    code: ErrorCode.SERVER_OVERLOADED,
    category: 'server',
    severity: 'medium',
    message: 'Server overloaded',
    userMessage: 'The server is busy. Please try again later.',
    suggestion: 'Wait a few moments and retry your request.',
    retryable: true,
    reportable: false,
  },
  [ErrorCode.VALIDATION_FAILED]: {
    code: ErrorCode.VALIDATION_FAILED,
    category: 'validation',
    severity: 'low',
    message: 'Validation failed',
    userMessage: 'The input is invalid.',
    suggestion: 'Check your input and try again.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.INVALID_INPUT]: {
    code: ErrorCode.INVALID_INPUT,
    category: 'client',
    severity: 'low',
    message: 'Invalid input',
    userMessage: 'Please check your input.',
    suggestion: 'Ensure all required fields are filled correctly.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.STORAGE_FULL]: {
    code: ErrorCode.STORAGE_FULL,
    category: 'client',
    severity: 'medium',
    message: 'Storage full',
    userMessage: 'Local storage is full.',
    suggestion: 'Clear some data or use the cleanup feature.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.MODEL_NOT_FOUND]: {
    code: ErrorCode.MODEL_NOT_FOUND,
    category: 'client',
    severity: 'medium',
    message: 'Model not found',
    userMessage: 'The selected AI model is not available.',
    suggestion: 'Select a different model.',
    retryable: false,
    reportable: true,
  },
  [ErrorCode.CONTENT_FILTERED]: {
    code: ErrorCode.CONTENT_FILTERED,
    category: 'client',
    severity: 'low',
    message: 'Content filtered',
    userMessage: 'The content was filtered by safety systems.',
    suggestion: 'Rephrase your request.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.CONTEXT_TOO_LONG]: {
    code: ErrorCode.CONTEXT_TOO_LONG,
    category: 'client',
    severity: 'low',
    message: 'Context too long',
    userMessage: 'The conversation is too long.',
    suggestion: 'Start a new conversation or summarize.',
    retryable: false,
    reportable: false,
  },
  [ErrorCode.UNKNOWN]: {
    code: ErrorCode.UNKNOWN,
    category: 'unknown',
    severity: 'medium',
    message: 'Unknown error',
    userMessage: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support.',
    retryable: true,
    reportable: true,
  },
};

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown): ErrorInfo {
  const timestamp = Date.now();
  const err = error as { status?: number; message?: string; code?: string; name?: string };

  // Check for specific error types
  if (err.status === 401) {
    return { ...ERROR_TEMPLATES[ErrorCode.AUTH_INVALID_KEY], originalError: error as Error, timestamp };
  }
  if (err.status === 403) {
    return { ...ERROR_TEMPLATES[ErrorCode.AUTH_FORBIDDEN], originalError: error as Error, timestamp };
  }
  if (err.status === 429) {
    return { ...ERROR_TEMPLATES[ErrorCode.RATE_LIMIT_EXCEEDED], originalError: error as Error, timestamp };
  }
  if (err.status === 503) {
    return { ...ERROR_TEMPLATES[ErrorCode.SERVER_UNAVAILABLE], originalError: error as Error, timestamp };
  }
  if (err.status && err.status >= 500) {
    return { ...ERROR_TEMPLATES[ErrorCode.SERVER_ERROR], originalError: error as Error, timestamp };
  }

  // Check message patterns
  const message = (err.message || '').toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || err.name === 'TypeError') {
    return { ...ERROR_TEMPLATES[ErrorCode.NETWORK_FAILED], originalError: error as Error, timestamp };
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return { ...ERROR_TEMPLATES[ErrorCode.NETWORK_TIMEOUT], originalError: error as Error, timestamp };
  }
  if (message.includes('offline')) {
    return { ...ERROR_TEMPLATES[ErrorCode.NETWORK_OFFLINE], originalError: error as Error, timestamp };
  }
  if (message.includes('quota')) {
    return { ...ERROR_TEMPLATES[ErrorCode.QUOTA_EXCEEDED], originalError: error as Error, timestamp };
  }
  if (err.name === 'QuotaExceededError' || err.code === '22') {
    return { ...ERROR_TEMPLATES[ErrorCode.STORAGE_FULL], originalError: error as Error, timestamp };
  }

  // Default to unknown
  return {
    ...ERROR_TEMPLATES[ErrorCode.UNKNOWN],
    message: err.message || 'Unknown error',
    originalError: error as Error,
    timestamp,
  };
}

/**
 * Create an error handler instance
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}) {
  const {
    onError,
    onCriticalError,
    reportErrors = true,
    logErrors = true,
    maxErrorHistory = 100,
  } = config;

  const errorHistory: ErrorInfo[] = [];

  const addToHistory = (error: ErrorInfo): void => {
    errorHistory.push(error);
    if (errorHistory.length > maxErrorHistory) {
      errorHistory.shift();
    }
  };

  const handle = (error: unknown, context?: Record<string, unknown>): ErrorInfo => {
    const errorInfo = categorizeError(error);
    errorInfo.context = context;

    addToHistory(errorInfo);

    if (logErrors) {
      console.error(`[${errorInfo.code}] ${errorInfo.message}`, {
        category: errorInfo.category,
        severity: errorInfo.severity,
        context,
      });
    }

    onError?.(errorInfo);

    if (errorInfo.severity === 'critical') {
      onCriticalError?.(errorInfo);
    }

    return errorInfo;
  };

  const createError = (code: ErrorCodeType, context?: Record<string, unknown>): ErrorInfo => {
    const template = ERROR_TEMPLATES[code] || ERROR_TEMPLATES[ErrorCode.UNKNOWN];
    return {
      ...template,
      context,
      timestamp: Date.now(),
    };
  };

  const getHistory = (): ErrorInfo[] => [...errorHistory];

  const clearHistory = (): void => {
    errorHistory.length = 0;
  };

  const getErrorsByCategory = (category: ErrorCategory): ErrorInfo[] =>
    errorHistory.filter((e) => e.category === category);

  const getErrorsBySeverity = (severity: ErrorSeverity): ErrorInfo[] =>
    errorHistory.filter((e) => e.severity === severity);

  return {
    handle,
    createError,
    getHistory,
    clearHistory,
    getErrorsByCategory,
    getErrorsBySeverity,
    categorizeError,
  };
}

// React hook for error handling
import { useState, useCallback, useMemo } from 'react';

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  errorHistory: ErrorInfo[];
  handleError: (error: unknown, context?: Record<string, unknown>) => ErrorInfo;
  clearError: () => void;
  clearHistory: () => void;
}

export function useErrorHandler(config?: ErrorHandlerConfig): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [history, setHistory] = useState<ErrorInfo[]>([]);

  const handler = useMemo(
    () =>
      createErrorHandler({
        ...config,
        onError: (err) => {
          setError(err);
          setHistory((prev) => [...prev, err].slice(-100));
          config?.onError?.(err);
        },
      }),
    [config]
  );

  const handleError = useCallback(
    (err: unknown, context?: Record<string, unknown>): ErrorInfo => {
      return handler.handle(err, context);
    },
    [handler]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    error,
    errorHistory: history,
    handleError,
    clearError,
    clearHistory,
  };
}

// Backward compatibility - class-like interface
export const ErrorHandler = {
  handle: (error: unknown, context?: Record<string, unknown>) => {
    const handler = createErrorHandler({ logErrors: true });
    return handler.handle(error, context);
  },
  categorize: categorizeError,
  createError: (code: ErrorCodeType) => {
    const handler = createErrorHandler();
    return handler.createError(code);
  },
};

export default createErrorHandler;
