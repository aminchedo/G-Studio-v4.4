/**
 * ErrorHandler - Centralized error handling utility
 * 
 * Purpose: Standardize error handling across the application
 * - Consistent error codes
 * - Stack trace preservation
 * - User-friendly messages
 * - Logging and telemetry
 * 
 * Usage: Wrap existing catch blocks without changing logic
 * 
 * @example
 * try {
 *   // existing code
 * } catch (error) {
 *   return ErrorHandler.handle(error, 'FILE_OPERATION', { filename });
 * }
 */

export enum ErrorCode {
  // File Operations
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_DELETE_ERROR = 'FILE_DELETE_ERROR',
  
  // API Errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  
  // Database Errors
  DB_NOT_INITIALIZED = 'DB_NOT_INITIALIZED',
  DB_OPERATION_FAILED = 'DB_OPERATION_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  
  // Tool Execution
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_INVALID_ARGS = 'TOOL_INVALID_ARGS',
  
  // State Management
  STATE_UPDATE_FAILED = 'STATE_UPDATE_FAILED',
  STATE_SYNC_FAILED = 'STATE_SYNC_FAILED',
  
  // Speech Recognition
  SPEECH_NOT_SUPPORTED = 'SPEECH_NOT_SUPPORTED',
  SPEECH_PERMISSION_DENIED = 'SPEECH_PERMISSION_DENIED',
  SPEECH_NETWORK_ERROR = 'SPEECH_NETWORK_ERROR',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  userMessage: string;
  originalError?: Error | unknown;
  context?: Record<string, any>;
  timestamp: number;
  stack?: string;
  recoverable: boolean;
  suggestion?: string;
}

export interface ErrorHandlerOptions {
  code?: ErrorCode;
  userMessage?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
  suggestion?: string;
  silent?: boolean; // Don't log to console
}

export class ErrorHandler {
  private static errorLog: ErrorContext[] = [];
  private static maxLogSize = 100;

  /**
   * Handle an error with standardized processing
   * 
   * @param error - The caught error
   * @param category - Error category for classification
   * @param options - Additional error handling options
   * @returns Standardized error context
   */
  static handle(
    error: unknown,
    category: string,
    options: ErrorHandlerOptions = {}
  ): ErrorContext {
    const errorContext = this.createErrorContext(error, category, options);
    
    // Log error (unless silent)
    if (!options.silent) {
      this.logError(errorContext);
    }
    
    // Store in error log
    this.addToErrorLog(errorContext);
    
    // Send to telemetry (if available)
    this.sendToTelemetry(errorContext);
    
    return errorContext;
  }

  /**
   * Create standardized error context
   */
  private static createErrorContext(
    error: unknown,
    category: string,
    options: ErrorHandlerOptions
  ): ErrorContext {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const code = options.code || this.inferErrorCode(originalError, category);
    const message = originalError.message || 'Unknown error occurred';
    const userMessage = options.userMessage || this.generateUserMessage(code, message);
    
    return {
      code,
      message,
      userMessage,
      originalError,
      context: {
        category,
        ...options.context,
      },
      timestamp: Date.now(),
      stack: originalError.stack,
      recoverable: options.recoverable ?? this.isRecoverable(code),
      suggestion: options.suggestion || this.generateSuggestion(code),
    };
  }

  /**
   * Infer error code from error message and category
   */
  private static inferErrorCode(error: Error, category: string): ErrorCode {
    const message = error.message.toLowerCase();
    
    // API errors
    if (message.includes('api key')) {
      if (message.includes('invalid') || message.includes('unauthorized')) {
        return ErrorCode.API_KEY_INVALID;
      }
      return ErrorCode.API_KEY_MISSING;
    }
    if (message.includes('quota') || message.includes('rate limit')) {
      return ErrorCode.API_QUOTA_EXCEEDED;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCode.API_NETWORK_ERROR;
    }
    
    // File errors
    if (category === 'FILE_OPERATION') {
      if (message.includes('not found')) return ErrorCode.FILE_NOT_FOUND;
      if (message.includes('read')) return ErrorCode.FILE_READ_ERROR;
      if (message.includes('write')) return ErrorCode.FILE_WRITE_ERROR;
      if (message.includes('delete')) return ErrorCode.FILE_DELETE_ERROR;
    }
    
    // Database errors
    if (category === 'DATABASE') {
      if (message.includes('not initialized')) return ErrorCode.DB_NOT_INITIALIZED;
      if (message.includes('transaction')) return ErrorCode.DB_TRANSACTION_FAILED;
      return ErrorCode.DB_OPERATION_FAILED;
    }
    
    // Tool errors
    if (category === 'TOOL_EXECUTION') {
      if (message.includes('not found')) return ErrorCode.TOOL_NOT_FOUND;
      if (message.includes('invalid') || message.includes('argument')) {
        return ErrorCode.TOOL_INVALID_ARGS;
      }
      return ErrorCode.TOOL_EXECUTION_FAILED;
    }
    
    // Speech errors
    if (category === 'SPEECH') {
      if (message.includes('not supported')) return ErrorCode.SPEECH_NOT_SUPPORTED;
      if (message.includes('permission')) return ErrorCode.SPEECH_PERMISSION_DENIED;
      if (message.includes('network')) return ErrorCode.SPEECH_NETWORK_ERROR;
    }
    
    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Generate user-friendly error message
   */
  private static generateUserMessage(code: ErrorCode, technicalMessage: string): string {
    const userMessages: Record<ErrorCode, string> = {
      [ErrorCode.FILE_NOT_FOUND]: 'The requested file could not be found.',
      [ErrorCode.FILE_READ_ERROR]: 'Unable to read the file.',
      [ErrorCode.FILE_WRITE_ERROR]: 'Unable to save the file.',
      [ErrorCode.FILE_DELETE_ERROR]: 'Unable to delete the file.',
      
      [ErrorCode.API_KEY_MISSING]: 'API key is required. Please configure it in Settings.',
      [ErrorCode.API_KEY_INVALID]: 'The API key is invalid. Please check your settings.',
      [ErrorCode.API_QUOTA_EXCEEDED]: 'API quota exceeded. Please try again later.',
      [ErrorCode.API_REQUEST_FAILED]: 'API request failed. Please try again.',
      [ErrorCode.API_NETWORK_ERROR]: 'Network error. Please check your connection.',
      
      [ErrorCode.DB_NOT_INITIALIZED]: 'Database not initialized. Please restart the application.',
      [ErrorCode.DB_OPERATION_FAILED]: 'Database operation failed.',
      [ErrorCode.DB_TRANSACTION_FAILED]: 'Database transaction failed. Changes were not saved.',
      
      [ErrorCode.TOOL_NOT_FOUND]: 'The requested tool was not found.',
      [ErrorCode.TOOL_EXECUTION_FAILED]: 'Tool execution failed.',
      [ErrorCode.TOOL_INVALID_ARGS]: 'Invalid tool arguments provided.',
      
      [ErrorCode.STATE_UPDATE_FAILED]: 'Failed to update application state.',
      [ErrorCode.STATE_SYNC_FAILED]: 'Failed to synchronize state with database.',
      
      [ErrorCode.SPEECH_NOT_SUPPORTED]: 'Speech recognition is not supported in this browser.',
      [ErrorCode.SPEECH_PERMISSION_DENIED]: 'Microphone permission denied.',
      [ErrorCode.SPEECH_NETWORK_ERROR]: 'Speech recognition network error.',
      
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
      [ErrorCode.VALIDATION_ERROR]: 'Validation failed.',
      [ErrorCode.PERMISSION_DENIED]: 'Permission denied.',
    };
    
    return userMessages[code] || technicalMessage;
  }

  /**
   * Generate helpful suggestion for error recovery
   */
  private static generateSuggestion(code: ErrorCode): string | undefined {
    const suggestions: Partial<Record<ErrorCode, string>> = {
      [ErrorCode.API_KEY_MISSING]: 'Click Settings → Connection and enter your Gemini API key.',
      [ErrorCode.API_KEY_INVALID]: 'Verify your API key at https://makersuite.google.com/app/apikey',
      [ErrorCode.API_QUOTA_EXCEEDED]: 'Wait a few minutes or upgrade your API plan.',
      [ErrorCode.API_NETWORK_ERROR]: 'Check your internet connection and try again.',
      [ErrorCode.DB_NOT_INITIALIZED]: 'Restart the application to reinitialize the database.',
      [ErrorCode.SPEECH_PERMISSION_DENIED]: 'Grant microphone permission in your browser settings.',
      [ErrorCode.FILE_NOT_FOUND]: 'The file may have been deleted. Try refreshing the file list.',
    };
    
    return suggestions[code];
  }

  /**
   * Determine if error is recoverable
   */
  private static isRecoverable(code: ErrorCode): boolean {
    const unrecoverableErrors = [
      ErrorCode.API_KEY_INVALID,
      ErrorCode.DB_NOT_INITIALIZED,
      ErrorCode.SPEECH_NOT_SUPPORTED,
      ErrorCode.PERMISSION_DENIED,
    ];
    
    return !unrecoverableErrors.includes(code);
  }

  /**
   * Log error to console with formatting
   */
  private static logError(errorContext: ErrorContext): void {
    const { code, message, context, stack } = errorContext;
    
    console.group(`❌ Error: ${code}`);
    console.error('Message:', message);
    console.error('User Message:', errorContext.userMessage);
    if (context) {
      console.error('Context:', context);
    }
    if (errorContext.suggestion) {
      console.info('💡 Suggestion:', errorContext.suggestion);
    }
    if (stack) {
      console.error('Stack:', stack);
    }
    console.groupEnd();
  }

  /**
   * Add error to in-memory log
   */
  private static addToErrorLog(errorContext: ErrorContext): void {
    this.errorLog.push(errorContext);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Send error to telemetry (if available)
   */
  private static sendToTelemetry(errorContext: ErrorContext): void {
    try {
      // Try to use telemetry if available
      if (typeof window !== 'undefined' && (window as any).telemetry) {
        (window as any).telemetry.recordError(errorContext);
      }
      
      // Try to use TelemetryService if available (non-blocking)
      import('./monitoring/telemetryService')
        .then(({ TelemetryService }) => {
          TelemetryService.recordError(errorContext);
        })
        .catch(() => {
          // TelemetryService not available, silently continue
        });
    } catch {
      // Telemetry not available, silently continue
    }
  }

  /**
   * Get recent errors from log
   */
  static getRecentErrors(count: number = 10): ErrorContext[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recoverable: number;
    unrecoverable: number;
  } {
    const byCode: Record<string, number> = {};
    let recoverable = 0;
    let unrecoverable = 0;
    
    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      if (error.recoverable) {
        recoverable++;
      } else {
        unrecoverable++;
      }
    });
    
    return {
      total: this.errorLog.length,
      byCode,
      recoverable,
      unrecoverable,
    };
  }

  /**
   * Format error for display in UI
   */
  static formatForUI(errorContext: ErrorContext): {
    title: string;
    message: string;
    suggestion?: string;
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      title: errorContext.code.replace(/_/g, ' '),
      message: errorContext.userMessage,
      suggestion: errorContext.suggestion,
      severity: errorContext.recoverable ? 'warning' : 'error',
    };
  }

  /**
   * Create error result for tool execution
   */
  static createToolError(
    error: unknown,
    toolName: string,
    args?: Record<string, any>
  ): {
    success: false;
    message: string;
    error: string;
    code: ErrorCode;
  } {
    const errorContext = this.handle(error, 'TOOL_EXECUTION', {
      context: { toolName, args },
    });
    
    return {
      success: false,
      message: errorContext.userMessage,
      error: errorContext.message,
      code: errorContext.code,
    };
  }
}

/**
 * Convenience function for wrapping async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  category: string,
  options?: ErrorHandlerOptions
): Promise<{ success: true; data: T } | { success: false; error: ErrorContext }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const errorContext = ErrorHandler.handle(error, category, options);
    return { success: false, error: errorContext };
  }
}

/**
 * Convenience function for wrapping sync operations
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  category: string,
  options?: ErrorHandlerOptions
): { success: true; data: T } | { success: false; error: ErrorContext } {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    const errorContext = ErrorHandler.handle(error, category, options);
    return { success: false, error: errorContext };
  }
}
