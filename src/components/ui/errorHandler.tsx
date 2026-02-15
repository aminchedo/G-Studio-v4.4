import {
  AppError,
  ErrorSeverity,
  isAppError,
  getErrorMessage,
} from "../../utils/errors";
import { eventBus } from './EventBus';

type ErrorHandler = (error: AppError) => void;

class ErrorHandlerService {
  private handlers: Map<string, Set<ErrorHandler>> = new Map();
  private globalHandlers: Set<ErrorHandler> = new Set();

  /**
   * Handle an error
   */
  handle(error: unknown, context?: Record<string, unknown>): void {
    const appError = this.normalizeError(error, context);

    // Log to console
    this.logError(appError);

    // Emit event
    eventBus.emit("error:occurred", appError);

    // Call global handlers
    this.globalHandlers.forEach((handler) => {
      try {
        handler(appError);
      } catch (handlerError) {
        console.error("[ErrorHandler] Error in global handler:", handlerError);
      }
    });

    // Call specific handlers
    const handlers = this.handlers.get(appError.code);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(appError);
        } catch (handlerError) {
          console.error(
            "[ErrorHandler] Error in specific handler:",
            handlerError,
          );
        }
      });
    }

    // Send to monitoring service if available
    this.sendToMonitoring(appError);
  }

  /**
   * Register a global error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  /**
   * Register a specific error handler
   */
  onErrorCode(code: string, handler: ErrorHandler): () => void {
    if (!this.handlers.has(code)) {
      this.handlers.set(code, new Set());
    }
    this.handlers.get(code)!.add(handler);

    return () => {
      const handlers = this.handlers.get(code);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(code);
        }
      }
    };
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  private normalizeError(
    error: unknown,
    context?: Record<string, unknown>,
  ): AppError {
    if (isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        "UNKNOWN_ERROR" as any as any,
        ErrorSeverity.ERROR,
        context,
        error,
      );
    }

    return new AppError(
      getErrorMessage(error),
      "UNKNOWN_ERROR" as any as any,
      ErrorSeverity.ERROR,
      context,
    );
  }

  private logError(error: AppError): void {
    const logMethod =
      error.severity === "critical" || error.severity === "error"
        ? console.error
        : error.severity === "warning"
          ? console.warn
          : console.info;

    logMethod(
      `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`,
      {
        timestamp: error.timestamp,
        context: error.context,
        stack: error.stack,
      },
    );
  }

  private sendToMonitoring(error: AppError): void {
    // In production, send to monitoring service (Sentry, LogRocket, etc.)
    if ((import.meta as any)?.env?.PROD && error.severity === "critical") {
      // TODO: Integrate with monitoring service
      console.log("[ErrorHandler] Would send to monitoring:", error.toJSON());
    }
  }
}

// Singleton instance
export const errorHandler = new ErrorHandlerService();

/**
 * Wrapper for async functions that handles errors
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handle(error, context);
    return null;
  }
}

/**
 * Wrapper for sync functions that handles errors
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: Record<string, unknown>,
): T | null {
  try {
    return fn();
  } catch (error) {
    errorHandler.handle(error, context);
    return null;
  }
}
