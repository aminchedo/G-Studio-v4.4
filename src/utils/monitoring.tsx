/**
 * Monitoring Utilities - Refactored from class-based monitors
 * 
 * Provides streaming and memory monitoring via hooks and factory functions
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// ============================================
// Streaming Monitor
// ============================================

export interface StreamingMetrics {
  bytesReceived: number;
  chunksReceived: number;
  startTime: number;
  lastChunkTime: number;
  averageChunkSize: number;
  throughput: number; // bytes per second
  isActive: boolean;
  errors: number;
}

export interface UseStreamingMonitorReturn {
  metrics: StreamingMetrics;
  isStreaming: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordChunk: (size: number) => void;
  recordError: () => void;
  reset: () => void;
}

const initialStreamingMetrics: StreamingMetrics = {
  bytesReceived: 0,
  chunksReceived: 0,
  startTime: 0,
  lastChunkTime: 0,
  averageChunkSize: 0,
  throughput: 0,
  isActive: false,
  errors: 0,
};

/**
 * Factory function for streaming monitor (non-React)
 */
export function createStreamingMonitor() {
  let metrics = { ...initialStreamingMetrics };
  const listeners = new Set<(metrics: StreamingMetrics) => void>();

  const notify = () => {
    listeners.forEach((listener) => listener({ ...metrics }));
  };

  const calculateThroughput = (): number => {
    if (!metrics.startTime || !metrics.lastChunkTime) return 0;
    const duration = (metrics.lastChunkTime - metrics.startTime) / 1000;
    return duration > 0 ? metrics.bytesReceived / duration : 0;
  };

  return {
    getMetrics: () => ({ ...metrics }),
    
    subscribe: (listener: (metrics: StreamingMetrics) => void) => {
      listeners.add(listener);
      listener({ ...metrics });
      return () => listeners.delete(listener);
    },

    start: () => {
      metrics = {
        ...initialStreamingMetrics,
        startTime: Date.now(),
        isActive: true,
      };
      notify();
    },

    stop: () => {
      metrics.isActive = false;
      metrics.throughput = calculateThroughput();
      notify();
    },

    recordChunk: (size: number) => {
      metrics.bytesReceived += size;
      metrics.chunksReceived++;
      metrics.lastChunkTime = Date.now();
      metrics.averageChunkSize =
        metrics.bytesReceived / metrics.chunksReceived;
      metrics.throughput = calculateThroughput();
      notify();
    },

    recordError: () => {
      metrics.errors++;
      notify();
    },

    reset: () => {
      metrics = { ...initialStreamingMetrics };
      notify();
    },
  };
}

/**
 * useStreamingMonitor hook
 */
export function useStreamingMonitor(): UseStreamingMonitorReturn {
  const [metrics, setMetrics] = useState<StreamingMetrics>(initialStreamingMetrics);
  const monitorRef = useRef(createStreamingMonitor());

  useEffect(() => {
    const unsubscribe = monitorRef.current.subscribe(setMetrics);
    return () => {
      unsubscribe();
    };
  }, []);

  const startMonitoring = useCallback(() => {
    monitorRef.current.start();
  }, []);

  const stopMonitoring = useCallback(() => {
    monitorRef.current.stop();
  }, []);

  const recordChunk = useCallback((size: number) => {
    monitorRef.current.recordChunk(size);
  }, []);

  const recordError = useCallback(() => {
    monitorRef.current.recordError();
  }, []);

  const reset = useCallback(() => {
    monitorRef.current.reset();
  }, []);

  return {
    metrics,
    isStreaming: metrics.isActive,
    startMonitoring,
    stopMonitoring,
    recordChunk,
    recordError,
    reset,
  };
}

// ============================================
// Memory Pressure Monitor
// ============================================

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  pressure: 'low' | 'moderate' | 'high' | 'critical';
  timestamp: number;
}

export interface MemoryThresholds {
  moderate: number; // percentage
  high: number;
  critical: number;
}

export interface UseMemoryMonitorOptions {
  interval?: number;
  thresholds?: Partial<MemoryThresholds>;
  onPressureChange?: (pressure: MemoryMetrics['pressure']) => void;
  onCritical?: () => void;
}

export interface UseMemoryMonitorReturn {
  metrics: MemoryMetrics | null;
  pressure: MemoryMetrics['pressure'];
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  checkNow: () => MemoryMetrics | null;
  getHistory: () => MemoryMetrics[];
  clearHistory: () => void;
}

const DEFAULT_THRESHOLDS: MemoryThresholds = {
  moderate: 50,
  high: 75,
  critical: 90,
};

const getMemoryInfo = (): MemoryMetrics | null => {
  // Check if performance.memory is available (Chrome only)
  const perf = performance as any;
  if (!perf.memory) {
    return null;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;
  const usagePercentage = (usedJSHeapSize / jsHeapSizeLimit) * 100;

  let pressure: MemoryMetrics['pressure'] = 'low';
  if (usagePercentage >= DEFAULT_THRESHOLDS.critical) {
    pressure = 'critical';
  } else if (usagePercentage >= DEFAULT_THRESHOLDS.high) {
    pressure = 'high';
  } else if (usagePercentage >= DEFAULT_THRESHOLDS.moderate) {
    pressure = 'moderate';
  }

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    usagePercentage,
    pressure,
    timestamp: Date.now(),
  };
};

/**
 * Factory function for memory monitor (non-React)
 */
export function createMemoryMonitor(options: UseMemoryMonitorOptions = {}) {
  const {
    interval = 5000,
    thresholds = {},
    onPressureChange,
    onCritical,
  } = options;

  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  
  let isMonitoring = false;
  let intervalId: NodeJS.Timeout | null = null;
  let lastPressure: MemoryMetrics['pressure'] = 'low';
  const history: MemoryMetrics[] = [];
  const listeners = new Set<(metrics: MemoryMetrics | null) => void>();

  const notify = (metrics: MemoryMetrics | null) => {
    listeners.forEach((listener) => listener(metrics));
  };

  const checkMemory = (): MemoryMetrics | null => {
    const metrics = getMemoryInfo();
    if (!metrics) return null;

    // Update pressure based on thresholds
    if (metrics.usagePercentage >= finalThresholds.critical) {
      metrics.pressure = 'critical';
    } else if (metrics.usagePercentage >= finalThresholds.high) {
      metrics.pressure = 'high';
    } else if (metrics.usagePercentage >= finalThresholds.moderate) {
      metrics.pressure = 'moderate';
    } else {
      metrics.pressure = 'low';
    }

    // Add to history
    history.push(metrics);
    if (history.length > 100) {
      history.shift();
    }

    // Check for pressure changes
    if (metrics.pressure !== lastPressure) {
      onPressureChange?.(metrics.pressure);
      if (metrics.pressure === 'critical') {
        onCritical?.();
      }
      lastPressure = metrics.pressure;
    }

    notify(metrics);
    return metrics;
  };

  return {
    subscribe: (listener: (metrics: MemoryMetrics | null) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    start: () => {
      if (isMonitoring) return;
      isMonitoring = true;
      checkMemory();
      intervalId = setInterval(checkMemory, interval);
    },

    stop: () => {
      isMonitoring = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    checkNow: checkMemory,

    getHistory: () => [...history],

    clearHistory: () => {
      history.length = 0;
    },

    isMonitoring: () => isMonitoring,
  };
}

/**
 * useMemoryMonitor hook
 */
export function useMemoryMonitor(
  options: UseMemoryMonitorOptions = {}
): UseMemoryMonitorReturn {
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitorRef = useRef(createMemoryMonitor(options));

  useEffect(() => {
    const unsubscribe = monitorRef.current.subscribe(setMetrics);
    return () => {
      unsubscribe();
      monitorRef.current.stop();
    };
  }, []);

  const startMonitoring = useCallback(() => {
    monitorRef.current.start();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    monitorRef.current.stop();
    setIsMonitoring(false);
  }, []);

  const checkNow = useCallback(() => {
    return monitorRef.current.checkNow();
  }, []);

  const getHistory = useCallback(() => {
    return monitorRef.current.getHistory();
  }, []);

  const clearHistory = useCallback(() => {
    monitorRef.current.clearHistory();
  }, []);

  const pressure = useMemo(
    () => metrics?.pressure || 'low',
    [metrics]
  );

  return {
    metrics,
    pressure,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    checkNow,
    getHistory,
    clearHistory,
  };
}

// ============================================
// Performance Monitor
// ============================================

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  longTasks: number;
  timestamp: number;
}

export interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

const initialPerformanceMetrics: PerformanceMetrics = {
  fps: 60,
  frameTime: 16.67,
  longTasks: 0,
  timestamp: Date.now(),
};

/**
 * usePerformanceMonitor hook
 */
export function usePerformanceMonitor(): UsePerformanceMonitorReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(initialPerformanceMetrics);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    setIsMonitoring(true);

    const measureFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      frameCountRef.current++;

      setMetrics((prev) => ({
        ...prev,
        frameTime,
        timestamp: Date.now(),
      }));

      rafRef.current = requestAnimationFrame(measureFrame);
    };

    // Calculate FPS every second
    fpsIntervalRef.current = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        fps: frameCountRef.current,
        timestamp: Date.now(),
      }));
      frameCountRef.current = 0;
    }, 1000);

    rafRef.current = requestAnimationFrame(measureFrame);
  }, [isMonitoring]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}

// Backward compatibility exports
export const StreamingMonitor = {
  create: createStreamingMonitor,
};

export const MemoryPressureMonitor = {
  create: createMemoryMonitor,
};

export default {
  useStreamingMonitor,
  useMemoryMonitor,
  usePerformanceMonitor,
  createStreamingMonitor,
  createMemoryMonitor,
};
