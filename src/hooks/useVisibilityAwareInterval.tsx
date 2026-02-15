import { useEffect, useRef, useCallback } from 'react';

interface VisibilityAwareIntervalOptions {
  enabled?: boolean;
  pauseWhenHidden?: boolean;
  immediateExecution?: boolean;
}

/**
 * Hook that runs a callback at specified intervals, with automatic pause when tab is hidden
 * This replaces aggressive polling and reduces CPU usage significantly
 */
export function useVisibilityAwareInterval(
  callback: () => void | Promise<void>,
  delay: number | null,
  options: VisibilityAwareIntervalOptions = {}
): void {
  const {
    enabled = true,
    pauseWhenHidden = true,
    immediateExecution = false,
  } = options;

  const savedCallback = useRef(callback);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const isVisible = useRef(true);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Handle visibility changes
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
      
      if (document.hidden) {
        // Tab is hidden - clear interval
        if (intervalId.current) {
          clearInterval(intervalId.current);
          intervalId.current = null;
        }
      } else {
        // Tab is visible - restart interval if enabled
        if (enabled && delay !== null) {
          startInterval();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, delay, pauseWhenHidden]);

  const startInterval = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }

    intervalId.current = setInterval(async () => {
      // Only execute if tab is visible (or if we don't care about visibility)
      if (!pauseWhenHidden || isVisible.current) {
        try {
          await savedCallback.current();
        } catch (error) {
          console.error('[useVisibilityAwareInterval] Error in callback:', error);
        }
      }
    }, delay!);
  }, [delay, pauseWhenHidden]);

  // Setup interval
  useEffect(() => {
    if (!enabled || delay === null) {
      // Clear interval if disabled or delay is null
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      return;
    }

    // Execute immediately if requested
    if (immediateExecution) {
      savedCallback.current();
    }

    // Only start interval if tab is visible (or if we don't care)
    if (!pauseWhenHidden || !document.hidden) {
      startInterval();
    }

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [enabled, delay, pauseWhenHidden, immediateExecution, startInterval]);
}

/**
 * Hook for debounced callbacks (useful for search inputs, etc.)
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Hook for throttled callbacks (useful for scroll handlers, etc.)
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        // Enough time has passed, execute immediately
        callbackRef.current(...args);
        lastRun.current = now;
      } else {
        // Not enough time, schedule for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [delay]
  );
}
