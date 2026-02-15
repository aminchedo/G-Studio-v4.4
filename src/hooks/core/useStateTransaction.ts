/**
 * useStateTransaction - Refactored from class StateTransaction
 * 
 * Provides transactional state updates with rollback capability
 * Ensures atomic updates and maintains state consistency
 */

import { useState, useCallback, useRef, useMemo } from 'react';

// Types
export interface TransactionState<T> {
  current: T;
  pending: T | null;
  history: T[];
  isTransactionActive: boolean;
}

export interface TransactionOptions {
  maxHistorySize?: number;
  autoCommitDelay?: number;
  validateBeforeCommit?: boolean;
}

export interface UseStateTransactionReturn<T> {
  // State
  state: T;
  pendingState: T | null;
  isTransactionActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  // Methods
  beginTransaction: () => void;
  commitTransaction: () => Promise<boolean>;
  rollbackTransaction: () => void;
  updatePending: (updater: (current: T) => T) => void;
  setPendingState: (newState: T) => void;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
  // Utilities
  getSnapshot: () => T;
  compareStates: (a: T, b: T) => boolean;
}

// Default options
const DEFAULT_OPTIONS: Required<TransactionOptions> = {
  maxHistorySize: 50,
  autoCommitDelay: 0, // 0 means no auto-commit
  validateBeforeCommit: false,
};

/**
 * Hook for transactional state management
 */
export function useStateTransaction<T>(
  initialState: T,
  options: TransactionOptions = {},
  validator?: (state: T) => boolean
): UseStateTransactionReturn<T> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Main state
  const [state, setState] = useState<T>(initialState);
  const [pendingState, setPendingStateInternal] = useState<T | null>(null);
  const [isTransactionActive, setIsTransactionActive] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Refs for internal tracking
  const autoCommitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCommittedStateRef = useRef<T>(initialState);

  // Computed values
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  /**
   * Begin a new transaction
   */
  const beginTransaction = useCallback(() => {
    if (isTransactionActive) {
      console.warn('[StateTransaction] Transaction already active');
      return;
    }
    
    setIsTransactionActive(true);
    setPendingStateInternal(state);
    lastCommittedStateRef.current = state;
    
    // Set up auto-commit if configured
    if (finalOptions.autoCommitDelay > 0) {
      autoCommitTimerRef.current = setTimeout(() => {
        // Will be handled by commitTransaction
      }, finalOptions.autoCommitDelay);
    }
  }, [isTransactionActive, state, finalOptions.autoCommitDelay]);

  /**
   * Commit the current transaction
   */
  const commitTransaction = useCallback(async (): Promise<boolean> => {
    if (!isTransactionActive || pendingState === null) {
      console.warn('[StateTransaction] No active transaction to commit');
      return false;
    }
    
    // Clear auto-commit timer
    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
      autoCommitTimerRef.current = null;
    }
    
    // Validate if required
    if (finalOptions.validateBeforeCommit && validator) {
      if (!validator(pendingState)) {
        console.warn('[StateTransaction] Validation failed, commit aborted');
        return false;
      }
    }
    
    // Commit the state
    setState(pendingState);
    
    // Update history
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, historyIndex + 1), pendingState];
      // Limit history size
      if (newHistory.length > finalOptions.maxHistorySize) {
        return newHistory.slice(-finalOptions.maxHistorySize);
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, finalOptions.maxHistorySize - 1));
    
    // Reset transaction state
    setIsTransactionActive(false);
    setPendingStateInternal(null);
    lastCommittedStateRef.current = pendingState;
    
    return true;
  }, [isTransactionActive, pendingState, historyIndex, finalOptions, validator]);

  /**
   * Rollback the current transaction
   */
  const rollbackTransaction = useCallback(() => {
    if (!isTransactionActive) {
      console.warn('[StateTransaction] No active transaction to rollback');
      return;
    }
    
    // Clear auto-commit timer
    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
      autoCommitTimerRef.current = null;
    }
    
    // Restore to last committed state
    setState(lastCommittedStateRef.current);
    setIsTransactionActive(false);
    setPendingStateInternal(null);
  }, [isTransactionActive]);

  /**
   * Update pending state with an updater function
   */
  const updatePending = useCallback(
    (updater: (current: T) => T) => {
      if (!isTransactionActive) {
        // Start implicit transaction if not active
        beginTransaction();
      }
      
      setPendingStateInternal((prev) => {
        const current = prev ?? state;
        return updater(current);
      });
    },
    [isTransactionActive, state, beginTransaction]
  );

  /**
   * Set pending state directly
   */
  const setPendingState = useCallback(
    (newState: T) => {
      if (!isTransactionActive) {
        beginTransaction();
      }
      setPendingStateInternal(newState);
    },
    [isTransactionActive, beginTransaction]
  );

  /**
   * Undo last committed change
   */
  const undo = useCallback((): boolean => {
    if (!canUndo) return false;
    
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setState(history[newIndex]);
    lastCommittedStateRef.current = history[newIndex];
    
    return true;
  }, [canUndo, historyIndex, history]);

  /**
   * Redo previously undone change
   */
  const redo = useCallback((): boolean => {
    if (!canRedo) return false;
    
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setState(history[newIndex]);
    lastCommittedStateRef.current = history[newIndex];
    
    return true;
  }, [canRedo, historyIndex, history]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([state]);
    setHistoryIndex(0);
  }, [state]);

  /**
   * Get current state snapshot
   */
  const getSnapshot = useCallback((): T => {
    return pendingState ?? state;
  }, [pendingState, state]);

  /**
   * Compare two states for equality
   */
  const compareStates = useCallback((a: T, b: T): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  }, []);

  return {
    state,
    pendingState,
    isTransactionActive,
    canUndo,
    canRedo,
    historyLength: history.length,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    updatePending,
    setPendingState,
    undo,
    redo,
    clearHistory,
    getSnapshot,
    compareStates,
  };
}

/**
 * Create a standalone transaction manager (for non-React contexts)
 */
export function createTransactionManager<T>(
  initialState: T,
  options: TransactionOptions = {}
) {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  let state = initialState;
  let pendingState: T | null = null;
  let isTransactionActive = false;
  let history: T[] = [initialState];
  let historyIndex = 0;
  let lastCommittedState = initialState;
  
  const listeners = new Set<(state: T) => void>();
  
  const notify = () => {
    listeners.forEach((listener) => listener(state));
  };
  
  return {
    getState: () => state,
    getPendingState: () => pendingState,
    isTransactionActive: () => isTransactionActive,
    
    subscribe: (listener: (state: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    
    beginTransaction: () => {
      if (isTransactionActive) return;
      isTransactionActive = true;
      pendingState = state;
      lastCommittedState = state;
    },
    
    commitTransaction: (): boolean => {
      if (!isTransactionActive || pendingState === null) return false;
      
      state = pendingState;
      history = [...history.slice(0, historyIndex + 1), pendingState];
      if (history.length > finalOptions.maxHistorySize) {
        history = history.slice(-finalOptions.maxHistorySize);
      }
      historyIndex = history.length - 1;
      
      isTransactionActive = false;
      pendingState = null;
      lastCommittedState = state;
      
      notify();
      return true;
    },
    
    rollbackTransaction: () => {
      if (!isTransactionActive) return;
      state = lastCommittedState;
      isTransactionActive = false;
      pendingState = null;
      notify();
    },
    
    updatePending: (updater: (current: T) => T) => {
      const current = pendingState ?? state;
      pendingState = updater(current);
    },
    
    undo: (): boolean => {
      if (historyIndex <= 0) return false;
      historyIndex--;
      state = history[historyIndex];
      lastCommittedState = state;
      notify();
      return true;
    },
    
    redo: (): boolean => {
      if (historyIndex >= history.length - 1) return false;
      historyIndex++;
      state = history[historyIndex];
      lastCommittedState = state;
      notify();
      return true;
    },
  };
}

export default useStateTransaction;
