/**
 * Utils Index
 * 
 * Exports all utility functions and factories
 */

export {
  createLogger,
  useLogger,
  getLogger,
  setGlobalLogger,
  createServiceLogger,
  Logger,
} from './logger';
export type {
  LogLevel,
  LogEntry,
  LoggerOptions,
  UseLoggerOptions,
} from './logger';

export {
  createAPIClient,
  useAPIClient,
} from './apiClient';
export type {
  APIClientConfig,
  RequestOptions,
  APIResponse,
  APIClientStats,
  APIClient,
  UseAPIClientOptions,
  UseAPIClientReturn,
} from './apiClient';

export {
  createErrorHandler,
  useErrorHandler,
  categorizeError,
  ErrorCode,
  ErrorHandler,
} from './errorHandler';
export type {
  ErrorCategory,
  ErrorSeverity,
  ErrorInfo,
  ErrorHandlerConfig,
  ErrorCodeType,
  UseErrorHandlerReturn,
} from './errorHandler';

export {
  useStreamingMonitor,
  useMemoryMonitor,
  usePerformanceMonitor,
  createStreamingMonitor,
  createMemoryMonitor,
  StreamingMonitor,
  MemoryPressureMonitor,
} from './monitoring';
export type {
  StreamingMetrics,
  UseStreamingMonitorReturn,
  MemoryMetrics,
  MemoryThresholds,
  UseMemoryMonitorOptions,
  UseMemoryMonitorReturn,
  PerformanceMetrics,
  UsePerformanceMonitorReturn,
} from './monitoring';
