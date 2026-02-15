/**
 * useTelemetry - Telemetry and analytics hook
 * 
 * Provides event tracking, performance metrics, and error logging
 * with privacy-aware data collection
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export interface TelemetryEvent {
  id: string;
  name: string;
  timestamp: number;
  category: string;
  properties: Record<string, unknown>;
  sessionId: string;
}

export interface PerformanceMetric {
  id: string;
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  success: boolean;
}

export interface ErrorMetric {
  id: string;
  error: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface TelemetryMetrics {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  performanceMetrics: PerformanceMetric[];
  errorMetrics: ErrorMetric[];
  averageResponseTime: number;
  errorRate: number;
  sessionDuration: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  maxEventsInMemory: number;
  flushInterval: number;
  privacyMode: boolean;
  excludePatterns: string[];
}

export interface UseTelemetryReturn {
  // State
  metrics: TelemetryMetrics;
  events: TelemetryEvent[];
  isEnabled: boolean;
  sessionId: string;
  
  // Actions
  track: (eventName: string, properties?: Record<string, unknown>, category?: string) => void;
  trackPerformance: (operation: string, duration: number, metadata?: Record<string, unknown>) => void;
  trackError: (error: Error, context?: Record<string, unknown>, severity?: ErrorMetric['severity']) => void;
  
  // Utilities
  startTimer: (operation: string) => () => void;
  exportMetrics: () => TelemetryMetrics;
  clearMetrics: () => void;
  setConfig: (config: Partial<TelemetryConfig>) => void;
  
  // Analysis
  getEventsByCategory: (category: string) => TelemetryEvent[];
  getErrorsByTime: (startTime: number, endTime?: number) => ErrorMetric[];
  getPerformanceTrend: (operation: string) => number[];
}

// Generate IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateSessionId = (): string => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default configuration
const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  sampleRate: 1.0,
  maxEventsInMemory: 1000,
  flushInterval: 60000,
  privacyMode: true,
  excludePatterns: ['password', 'token', 'secret', 'key', 'auth'],
};

// Filter sensitive data
const filterSensitiveData = (
  data: Record<string, unknown>,
  patterns: string[]
): Record<string, unknown> => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    if (patterns.some(pattern => keyLower.includes(pattern))) {
      filtered[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value as Record<string, unknown>, patterns);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
};

/**
 * useTelemetry hook
 */
export function useTelemetry(initialConfig?: Partial<TelemetryConfig>): UseTelemetryReturn {
  // Initialize session
  const [sessionId] = useState(() => generateSessionId());
  const sessionStartRef = useRef(Date.now());

  // Config
  const [config, setConfigState] = useState<TelemetryConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // State
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetric[]>([]);
  const [eventsByCategory, setEventsByCategory] = useState<Record<string, number>>({});

  // Computed metrics
  const metrics: TelemetryMetrics = {
    totalEvents: events.length,
    eventsByCategory,
    performanceMetrics,
    errorMetrics,
    averageResponseTime: performanceMetrics.length > 0
      ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length
      : 0,
    errorRate: events.length > 0
      ? errorMetrics.length / events.length
      : 0,
    sessionDuration: Date.now() - sessionStartRef.current,
  };

  // Should sample
  const shouldSample = useCallback((): boolean => {
    return config.enabled && Math.random() < config.sampleRate;
  }, [config.enabled, config.sampleRate]);

  // Track event
  const track = useCallback((
    eventName: string,
    properties: Record<string, unknown> = {},
    category: string = 'general'
  ) => {
    if (!shouldSample()) return;

    const filteredProperties = config.privacyMode
      ? filterSensitiveData(properties, config.excludePatterns)
      : properties;

    const event: TelemetryEvent = {
      id: generateId(),
      name: eventName,
      timestamp: Date.now(),
      category,
      properties: filteredProperties,
      sessionId,
    };

    setEvents(prev => {
      const updated = [...prev, event];
      if (updated.length > config.maxEventsInMemory) {
        return updated.slice(-config.maxEventsInMemory);
      }
      return updated;
    });

    setEventsByCategory(prev => ({
      ...prev,
      [category]: (prev[category] || 0) + 1,
    }));
  }, [shouldSample, config, sessionId]);

  // Track performance
  const trackPerformance = useCallback((
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ) => {
    if (!shouldSample()) return;

    const metric: PerformanceMetric = {
      id: generateId(),
      operation,
      duration,
      timestamp: Date.now(),
      metadata: metadata ? (config.privacyMode
        ? filterSensitiveData(metadata, config.excludePatterns)
        : metadata) : undefined,
      success: true,
    };

    setPerformanceMetrics(prev => {
      const updated = [...prev, metric];
      if (updated.length > config.maxEventsInMemory) {
        return updated.slice(-config.maxEventsInMemory);
      }
      return updated;
    });

    // Also track as event
    track(`performance:${operation}`, { duration, ...metadata }, 'performance');
  }, [shouldSample, config, track]);

  // Track error
  const trackError = useCallback((
    error: Error,
    context?: Record<string, unknown>,
    severity: ErrorMetric['severity'] = 'medium'
  ) => {
    if (!config.enabled) return;

    const errorMetric: ErrorMetric = {
      id: generateId(),
      error: error.message,
      stack: config.privacyMode ? undefined : error.stack,
      timestamp: Date.now(),
      context: context ? (config.privacyMode
        ? filterSensitiveData(context, config.excludePatterns)
        : context) : undefined,
      severity,
      handled: true,
    };

    setErrorMetrics(prev => {
      const updated = [...prev, errorMetric];
      if (updated.length > config.maxEventsInMemory) {
        return updated.slice(-config.maxEventsInMemory);
      }
      return updated;
    });

    // Also track as event
    track('error', {
      message: error.message,
      severity,
      ...context,
    }, 'error');
  }, [config, track]);

  // Start timer
  const startTimer = useCallback((operation: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      trackPerformance(operation, duration);
    };
  }, [trackPerformance]);

  // Export metrics
  const exportMetrics = useCallback((): TelemetryMetrics => {
    return { ...metrics };
  }, [metrics]);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    setEvents([]);
    setPerformanceMetrics([]);
    setErrorMetrics([]);
    setEventsByCategory({});
  }, []);

  // Set config
  const setConfig = useCallback((newConfig: Partial<TelemetryConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Get events by category
  const getEventsByCategory = useCallback((category: string): TelemetryEvent[] => {
    return events.filter(e => e.category === category);
  }, [events]);

  // Get errors by time
  const getErrorsByTime = useCallback((
    startTime: number,
    endTime: number = Date.now()
  ): ErrorMetric[] => {
    return errorMetrics.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }, [errorMetrics]);

  // Get performance trend
  const getPerformanceTrend = useCallback((operation: string): number[] => {
    return performanceMetrics
      .filter(m => m.operation === operation)
      .map(m => m.duration);
  }, [performanceMetrics]);

  // Global error handler
  useEffect(() => {
    if (!config.enabled) return;

    const handleError = (event: ErrorEvent) => {
      trackError(
        event.error || new Error(event.message),
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        'high'
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      trackError(error, { unhandled: true }, 'high');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [config.enabled, trackError]);

  // Track session start
  useEffect(() => {
    track('session:start', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    }, 'session');

    return () => {
      track('session:end', {
        duration: Date.now() - sessionStartRef.current,
      }, 'session');
    };
  }, []);

  return {
    metrics,
    events,
    isEnabled: config.enabled,
    sessionId,
    track,
    trackPerformance,
    trackError,
    startTimer,
    exportMetrics,
    clearMetrics,
    setConfig,
    getEventsByCategory,
    getErrorsByTime,
    getPerformanceTrend,
  };
}

export default useTelemetry;
