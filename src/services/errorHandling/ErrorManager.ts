/**
 * Error Manager Service
 * Centralized error handling, tracking, and recovery
 */

import { PresentableError, ErrorParser } from './ErrorPresentation';

export interface ErrorHistoryEntry {
  error: PresentableError;
  resolved: boolean;
  resolvedAt?: Date;
  retryCount: number;
}

class ErrorManagerService {
  private errors: Map<string, ErrorHistoryEntry> = new Map();
  private listeners: Set<(errors: ErrorHistoryEntry[]) => void> = new Set();
  private maxHistorySize = 50;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Handle an error
   */
  handleError(error: any, context?: Record<string, any>): PresentableError {
    const presentableError = ErrorParser.parse(error);
    
    // Add to history
    this.addToHistory(presentableError);

    // Log to console if enabled
    if (presentableError.reporting.logToConsole) {
      console.error('[ErrorManager]', presentableError.title, presentableError.message, {
        error: presentableError,
        context,
      });
    }

    // Send telemetry if enabled
    if (presentableError.reporting.sendTelemetry) {
      this.sendTelemetry(presentableError, context);
    }

    // Auto-retry if enabled
    if (presentableError.recovery.autoRetry) {
      this.scheduleRetry(presentableError);
    }

    return presentableError;
  }

  /**
   * Add error to history
   */
  private addToHistory(error: PresentableError): void {
    const entry: ErrorHistoryEntry = {
      error,
      resolved: false,
      retryCount: 0,
    };

    this.errors.set(error.id, entry);

    // Limit history size
    if (this.errors.size > this.maxHistorySize) {
      const firstKey = this.errors.keys().next().value;
      this.errors.delete(firstKey);
    }

    this.notifyListeners();
  }

  /**
   * Schedule automatic retry
   */
  private scheduleRetry(error: PresentableError): void {
    const entry = this.errors.get(error.id);
    if (!entry) return;

    if (entry.retryCount >= error.recovery.maxRetries) {
      console.warn('[ErrorManager] Max retries reached for', error.id);
      return;
    }

    const timer = setTimeout(() => {
      console.log('[ErrorManager] Auto-retrying', error.id);
      entry.retryCount++;
      
      if (error.recovery.fallback) {
        try {
          error.recovery.fallback();
        } catch (err) {
          console.error('[ErrorManager] Retry failed', err);
        }
      }

      this.retryTimers.delete(error.id);
      this.notifyListeners();
    }, error.recovery.retryDelay);

    this.retryTimers.set(error.id, timer);
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): void {
    const entry = this.errors.get(errorId);
    if (entry) {
      entry.resolved = true;
      entry.resolvedAt = new Date();
      
      // Cancel any pending retries
      const timer = this.retryTimers.get(errorId);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(errorId);
      }

      this.notifyListeners();
    }
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorHistoryEntry[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): ErrorHistoryEntry[] {
    return this.getErrors().filter((entry) => !entry.resolved);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: string): ErrorHistoryEntry[] {
    return this.getErrors().filter((entry) => entry.error.category === category);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    // Cancel all retry timers
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
    
    this.errors.clear();
    this.notifyListeners();
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    const unresolved = this.getUnresolvedErrors();
    this.errors.clear();
    
    unresolved.forEach((entry) => {
      this.errors.set(entry.error.id, entry);
    });
    
    this.notifyListeners();
  }

  /**
   * Subscribe to error updates
   */
  subscribe(listener: (errors: ErrorHistoryEntry[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const errors = this.getErrors();
    this.listeners.forEach((listener) => {
      try {
        listener(errors);
      } catch (err) {
        console.error('[ErrorManager] Listener error', err);
      }
    });
  }

  /**
   * Send telemetry (placeholder - implement with your telemetry service)
   */
  private sendTelemetry(error: PresentableError, context?: Record<string, any>): void {
    // TODO: Implement telemetry sending
    console.log('[ErrorManager] Telemetry:', {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      title: error.title,
      context,
    });
  }

  /**
   * Export errors to JSON
   */
  exportToJSON(): string {
    const errors = this.getErrors().map((entry) => ({
      error: {
        id: entry.error.id,
        category: entry.error.category,
        severity: entry.error.severity,
        title: entry.error.title,
        message: entry.error.message,
        timestamp: entry.error.timestamp.toISOString(),
        metadata: entry.error.metadata,
      },
      resolved: entry.resolved,
      resolvedAt: entry.resolvedAt?.toISOString(),
      retryCount: entry.retryCount,
    }));

    return JSON.stringify(errors, null, 2);
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const errors = this.getErrors();
    const unresolved = this.getUnresolvedErrors();

    const byCategory = errors.reduce((acc, entry) => {
      const cat = entry.error.category;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = errors.reduce((acc, entry) => {
      const sev = entry.error.severity;
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: errors.length,
      unresolved: unresolved.length,
      resolved: errors.length - unresolved.length,
      byCategory,
      bySeverity,
      averageRetries: errors.reduce((sum, e) => sum + e.retryCount, 0) / errors.length || 0,
    };
  }
}

// Singleton instance
export const ErrorManager = new ErrorManagerService();

// React Hook
export function useErrorManager() {
  const [errors, setErrors] = React.useState<ErrorHistoryEntry[]>([]);

  React.useEffect(() => {
    // Initial load
    setErrors(ErrorManager.getErrors());

    // Subscribe to updates
    const unsubscribe = ErrorManager.subscribe(setErrors);

    return unsubscribe;
  }, []);

  return {
    errors,
    unresolvedErrors: errors.filter((e) => !e.resolved),
    handleError: (error: any, context?: Record<string, any>) => ErrorManager.handleError(error, context),
    resolveError: (errorId: string) => ErrorManager.resolveError(errorId),
    clearErrors: () => ErrorManager.clearErrors(),
    clearResolvedErrors: () => ErrorManager.clearResolvedErrors(),
    statistics: ErrorManager.getStatistics(),
    exportToJSON: () => ErrorManager.exportToJSON(),
  };
}

// Add React import for the hook
import React from 'react';
