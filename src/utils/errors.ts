/**
 * errors.ts
 *
 * Centralized error types and classes for the application
 * ✅ AppError base class
 * ✅ Specific error classes (Network, API, Auth, etc.)
 * ✅ Runtime-safe enums for ErrorCode and ErrorSeverity
 * ✅ Utilities for type checking and friendly messages
 */

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error codes for specific error types
 */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Context for additional error info
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly timestamp: Date;

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly severity: ErrorSeverity = ErrorSeverity.ERROR,
    public readonly context?: ErrorContext,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.timestamp = new Date();

    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Specific error types
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCode.NETWORK_ERROR, ErrorSeverity.ERROR, context, originalError);
    this.name = 'NetworkError';
  }
}

export class APIError extends AppError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      message,
      ErrorCode.API_ERROR,
      ErrorSeverity.ERROR,
      { ...context, statusCode },
      originalError
    );
    this.name = 'APIError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCode.AUTH_ERROR, ErrorSeverity.ERROR, context, originalError);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      message,
      ErrorCode.RATE_LIMIT_ERROR,
      ErrorSeverity.WARNING,
      { ...context, retryAfter },
      originalError
    );
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorSeverity.WARNING,
      { ...context, field },
      originalError
    );
    this.name = 'ValidationError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCode.STORAGE_ERROR, ErrorSeverity.ERROR, context, originalError);
    this.name = 'StorageError';
  }
}

export class ParsingError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCode.PARSING_ERROR, ErrorSeverity.WARNING, context, originalError);
    this.name = 'ParsingError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super(message, ErrorCode.TIMEOUT_ERROR, ErrorSeverity.WARNING, context, originalError);
    this.name = 'TimeoutError';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract a plain error message from any unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/**
 * User-friendly error message mapping
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection.';
      case ErrorCode.API_ERROR:
        return 'There was a problem communicating with the AI service. Please try again.';
      case ErrorCode.AUTH_ERROR:
        return 'Authentication failed. Please check your API key.';
      case ErrorCode.RATE_LIMIT_ERROR:
        return 'Rate limit exceeded. Please wait a moment before trying again.';
      case ErrorCode.VALIDATION_ERROR:
        return 'Invalid input. Please check your data and try again.';
      case ErrorCode.STORAGE_ERROR:
        return 'Unable to save data. Please check your storage settings.';
      case ErrorCode.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      default:
        return error.message;
    }
  }

  return getErrorMessage(error);
}
