/**
 * Performance Utilities
 * 
 * Collection of utilities for optimizing React component performance
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Debounce function - delays execution until after wait time
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * @param func Function to throttle
 * @param wait Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * Hook for debounced value
 * @param value Value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callback
 * @param callback Callback to throttle
 * @param delay Delay in milliseconds
 * @returns Throttled callback
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const throttledCallback = useRef<(...args: Parameters<T>) => void>();
  
  useEffect(() => {
    throttledCallback.current = throttle(callback, delay);
  }, [callback, delay]);
  
  return useCallback((...args: Parameters<T>) => {
    throttledCallback.current?.(...args);
  }, []);
}

/**
 * Hook for debounced callback
 * @param callback Callback to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced callback
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const debouncedCallback = useRef<(...args: Parameters<T>) => void>();
  
  useEffect(() => {
    debouncedCallback.current = debounce(callback, delay);
  }, [callback, delay]);
  
  return useCallback((...args: Parameters<T>) => {
    debouncedCallback.current?.(...args);
  }, []);
}

/**
 * Hook for intersection observer (lazy loading)
 * @param options IntersectionObserver options
 * @returns [ref, isIntersecting]
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * Hook for measuring component render time
 * @param componentName Name of component for logging
 */
export function useRenderTime(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (process.env['NODE_ENV'] === 'development') {
      console.log(
        `[Performance] ${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
      );
    }
    
    startTime.current = performance.now();
  });
}

/**
 * Hook for previous value
 * @param value Current value
 * @returns Previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Hook for comparing objects (deep equality)
 * @param value Value to compare
 * @returns Memoized value that only changes when deep equality fails
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  
  const isEqual = useMemo(() => {
    return JSON.stringify(ref.current) === JSON.stringify(value);
  }, [value]);
  
  if (!isEqual) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Memoize expensive computations
 * @param factory Factory function
 * @param deps Dependencies
 * @returns Memoized value
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Check if component is mounted
 * @returns isMounted ref
 */
export function useIsMounted(): React.MutableRefObject<boolean> {
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return isMounted;
}

/**
 * Safe setState that only updates if component is mounted
 * @param initialState Initial state
 * @returns [state, safeSetState]
 */
export function useSafeState<T>(
  initialState: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(initialState);
  const isMounted = useIsMounted();
  
  const safeSetState = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (value) => {
      if (isMounted.current) {
        setState(value);
      }
    },
    [isMounted]
  );
  
  return [state, safeSetState];
}

/**
 * Batch state updates to reduce re-renders
 * @returns batchUpdate function
 */
export function useBatchUpdate() {
  const updates = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchUpdate = useCallback((update: () => void) => {
    updates.current.push(update);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      updates.current.forEach(fn => fn());
      updates.current = [];
    }, 0);
  }, []);
  
  return batchUpdate;
}

/**
 * Measure component performance
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();
  
  static start(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      
      this.measurements.get(label)!.push(duration);
    };
  }
  
  static getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;
    
    const count = measurements.length;
    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return { count, avg, min, max };
  }
  
  static clear(label?: string) {
    if (label) {
      this.measurements.delete(label);
    } else {
      this.measurements.clear();
    }
  }
  
  static logStats() {
    console.group('Performance Stats');
    this.measurements.forEach((_, label) => {
      const stats = this.getStats(label);
      if (stats) {
        console.log(`${label}:`, {
          count: stats.count,
          avg: `${stats.avg.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
        });
      }
    });
    console.groupEnd();
  }
}

/**
 * Lazy load component with retry logic
 * @param importFunc Dynamic import function
 * @param retries Number of retries
 * @returns Lazy component
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retries: number = 3
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFunc();
      } catch (error) {
        lastError = error as Error;
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    
    throw lastError;
  });
}

// Re-export React for convenience
import * as React from 'react';
