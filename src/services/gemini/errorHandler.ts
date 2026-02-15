/**
 * G Studio v2.3.0 - Gemini Error Handler
 *
 * Error categorization and handling for Gemini API
 */

import {
  ErrorInfo,
  ErrorCategory,
  ErrorSeverity,
  ErrorAction,
  ModelFailureReason,
} from "@/types/types";

// ============================================================================
// ERROR NORMALIZATION (type-safe, no any)
// ============================================================================

export interface NormalizedError {
  message: string;
  status?: number;
  name?: string;
}

/** Extract message and status from unknown error for pattern matching. */
function normalizeError(error: unknown): NormalizedError {
  const message = error instanceof Error ? error.message : String(error ?? "");
  let status: number | undefined;
  let name: string | undefined;
  if (error != null && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.status === "number") status = o.status;
    else if (
      o.response &&
      typeof o.response === "object" &&
      typeof (o.response as Record<string, unknown>).status === "number"
    ) {
      status = (o.response as Record<string, unknown>).status as number;
    }
    if (typeof o.name === "string") name = o.name;
  }
  return { message, status, name };
}

// ============================================================================
// ERROR PATTERNS
// ============================================================================

interface ErrorPattern {
  pattern: RegExp | ((error: unknown) => boolean);
  category: ErrorCategory;
  type: string;
  severity: ErrorSeverity;
  retryable: boolean;
  action: ErrorAction;
  message: string;
  suggestedFix: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // DNS/Network Errors
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      return (
        n.message.includes("network") ||
        n.message.includes("ECONN") ||
        n.message.includes("ENOTFOUND") ||
        n.message.includes("fetch") ||
        n.name === "AbortError"
      );
    },
    category: "network",
    type: "dns_network_error",
    severity: "high",
    retryable: true,
    action: "retry_with_backoff",
    message: "Network or DNS resolution error.",
    suggestedFix:
      "Check internet connection, try different DNS server, or check proxy settings.",
  },

  // Timeout
  {
    pattern: /timeout/i,
    category: "network",
    type: "timeout",
    severity: "medium",
    retryable: true,
    action: "retry_with_backoff",
    message: "Request timed out.",
    suggestedFix:
      "Try again or increase timeout. The server may be under heavy load.",
  },

  // Rate Limiting (429)
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      const msg = n.message.toLowerCase();
      return (
        n.status === 429 ||
        msg.includes("429") ||
        msg.includes("rate limit") ||
        msg.includes("too many requests")
      );
    },
    category: "rate_limit",
    type: "rate_limit_exceeded",
    severity: "medium",
    retryable: true,
    action: "retry_with_exponential_backoff",
    message: "Rate limit exceeded. Too many requests.",
    suggestedFix: "Wait before retrying. Consider reducing request frequency.",
  },

  // Quota Exhausted
  {
    pattern: (error: unknown) => {
      const msg = normalizeError(error).message.toLowerCase();
      return (
        msg.includes("quota") ||
        msg.includes("exceeded") ||
        msg.includes("limit: 0") ||
        msg.includes("limit = 0")
      );
    },
    category: "rate_limit",
    type: "quota_exhausted",
    severity: "critical",
    retryable: false,
    action: "contact_support",
    message: "API quota exhausted.",
    suggestedFix:
      "Check your billing and quota limits. Upgrade plan if needed.",
  },

  // Unauthorized (401)
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      const msg = n.message.toLowerCase();
      return (
        n.status === 401 ||
        msg.includes("401") ||
        msg.includes("unauthorized") ||
        msg.includes("invalid api key")
      );
    },
    category: "authentication",
    type: "unauthorized",
    severity: "critical",
    retryable: false,
    action: "check_credentials",
    message: "Unauthorized. Invalid API key.",
    suggestedFix: "Verify your API key is correct and has not expired.",
  },

  // Forbidden (403)
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      const msg = n.message.toLowerCase();
      return (
        n.status === 403 ||
        msg.includes("403") ||
        msg.includes("forbidden") ||
        msg.includes("permission")
      );
    },
    category: "authentication",
    type: "forbidden",
    severity: "critical",
    retryable: false,
    action: "check_credentials",
    message: "Forbidden. Check API key permissions.",
    suggestedFix:
      "Verify API key has proper permissions and billing is enabled.",
  },

  // Not Found (404)
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      const msg = n.message.toLowerCase();
      return (
        n.status === 404 ||
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("does not exist")
      );
    },
    category: "not_found",
    type: "resource_not_found",
    severity: "medium",
    retryable: false,
    action: "check_model_availability",
    message: "Model or resource not found.",
    suggestedFix:
      "Check model name is correct. The model may be deprecated or unavailable.",
  },

  // Server Errors (5xx)
  {
    pattern: (error: unknown) => {
      const status = normalizeError(error).status;
      return status != null && status >= 500 && status < 600;
    },
    category: "server_error",
    type: "server_error",
    severity: "high",
    retryable: true,
    action: "retry_with_backoff",
    message: "Server error. The API is experiencing issues.",
    suggestedFix: "Try again in a few moments. Check Gemini API status page.",
  },

  // Invalid Request (400)
  {
    pattern: (error: unknown) => {
      const n = normalizeError(error);
      const msg = n.message.toLowerCase();
      return (
        n.status === 400 ||
        msg.includes("400") ||
        msg.includes("bad request") ||
        msg.includes("invalid")
      );
    },
    category: "invalid_request",
    type: "bad_request",
    severity: "high",
    retryable: false,
    action: "none",
    message: "Invalid request. Check your input.",
    suggestedFix:
      "Review request parameters. Content may be too long or malformed.",
  },

  // Model-specific errors
  {
    pattern: (error: unknown) => {
      const msg = normalizeError(error).message.toLowerCase();
      return (
        msg.includes("model") &&
        (msg.includes("unavailable") ||
          msg.includes("disabled") ||
          msg.includes("deprecated"))
      );
    },
    category: "model_error",
    type: "model_unavailable",
    severity: "medium",
    retryable: false,
    action: "check_model_availability",
    message: "Model is unavailable or disabled.",
    suggestedFix: "Try a different model. This model may be deprecated.",
  },

  // Safety/Content Filter
  {
    pattern: (error: unknown) => {
      const msg = normalizeError(error).message.toLowerCase();
      return (
        msg.includes("safety") ||
        msg.includes("blocked") ||
        msg.includes("content filter") ||
        msg.includes("policy")
      );
    },
    category: "invalid_request",
    type: "content_blocked",
    severity: "medium",
    retryable: false,
    action: "none",
    message: "Content blocked by safety filters.",
    suggestedFix: "Modify your request to comply with content policies.",
  },
];

// ============================================================================
// ERROR CATEGORIZER
// ============================================================================

/**
 * Categorize an error and return detailed info
 */
export function categorizeError(error: any): ErrorInfo {
  // Try each pattern
  for (const pattern of ERROR_PATTERNS) {
    const matches =
      typeof pattern.pattern === "function"
        ? pattern.pattern(error)
        : pattern.pattern.test(error?.message || String(error));

    if (matches) {
      return {
        category: pattern.category,
        type: pattern.type,
        severity: pattern.severity,
        retryable: pattern.retryable,
        action: pattern.action,
        message: pattern.message,
        suggestedFix: pattern.suggestedFix,
        originalError: error,
      };
    }
  }

  // Default unknown error
  return {
    category: "unknown",
    type: "unknown_error",
    severity: "medium",
    retryable: true,
    action: "retry_with_backoff",
    message: error?.message || "An unknown error occurred.",
    suggestedFix:
      "Try again. If the problem persists, check your connection and API key.",
    originalError: error,
  };
}

/**
 * Map error info to model failure reason
 */
export function mapToModelFailureReason(
  errorInfo: ErrorInfo,
): ModelFailureReason {
  switch (errorInfo.category) {
    case "rate_limit":
      return "quota_exhausted";
    case "authentication":
      return "permission_denied";
    case "not_found":
    case "model_error":
      return "model_disabled";
    case "network":
      if (errorInfo.type === "timeout") {
        return "timeout";
      }
      return "network_error";
    default:
      return "unknown";
  }
}

/**
 * Build observability error payload from ErrorInfo (internal use only).
 * Do not expose in UI or change external error contract.
 */
export function getObservabilityError(
  info: ErrorInfo,
  context?: { requestId?: string; model?: string; attempt?: number },
): {
  requestId?: string;
  category: string;
  message: string;
  retryable: boolean;
  model?: string;
  attempt?: number;
} {
  return {
    ...(context?.requestId != null && { requestId: context.requestId }),
    category: info.category,
    message: info.message,
    retryable: info.retryable ?? false,
    ...(context?.model != null && { model: context.model }),
    ...(context?.attempt != null && { attempt: context.attempt }),
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const info = categorizeError(error);
  return info.retryable;
}

/**
 * Check if error is a quota/rate limit error
 */
export function isQuotaError(error: any): boolean {
  const info = categorizeError(error);
  return info.category === "rate_limit";
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  const info = categorizeError(error);
  return info.category === "authentication";
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown, context?: string): string {
  const info = categorizeError(error);
  let message = info.message;

  if (context) {
    message = `${context}: ${message}`;
  }

  if (info.severity === "critical") {
    message += ` ${info.suggestedFix}`;
  }

  return message;
}

// ============================================================================
// ERROR RECOVERY SUGGESTIONS
// ============================================================================

export interface RecoverySuggestion {
  action: string;
  description: string;
  automatic: boolean;
}

/**
 * Get recovery suggestions for an error
 */
export function getRecoverySuggestions(error: unknown): RecoverySuggestion[] {
  const info = categorizeError(error);
  const suggestions: RecoverySuggestion[] = [];

  switch (info.category) {
    case "network":
      suggestions.push(
        { action: "retry", description: "Retry the request", automatic: true },
        {
          action: "check_connection",
          description: "Check your internet connection",
          automatic: false,
        },
      );
      break;

    case "rate_limit":
      suggestions.push(
        {
          action: "wait",
          description: "Wait and retry later",
          automatic: true,
        },
        {
          action: "use_different_model",
          description: "Try a different model",
          automatic: true,
        },
        {
          action: "check_quota",
          description: "Check your API quota",
          automatic: false,
        },
      );
      break;

    case "authentication":
      suggestions.push(
        {
          action: "check_api_key",
          description: "Verify your API key",
          automatic: false,
        },
        {
          action: "refresh_key",
          description: "Generate a new API key",
          automatic: false,
        },
      );
      break;

    case "server_error":
      suggestions.push(
        { action: "retry", description: "Retry the request", automatic: true },
        {
          action: "use_different_model",
          description: "Try a different model",
          automatic: true,
        },
        {
          action: "check_status",
          description: "Check API status page",
          automatic: false,
        },
      );
      break;

    case "invalid_request":
      suggestions.push(
        {
          action: "modify_request",
          description: "Modify your request",
          automatic: false,
        },
        {
          action: "reduce_content",
          description: "Reduce content length",
          automatic: true,
        },
      );
      break;

    default:
      suggestions.push({
        action: "retry",
        description: "Retry the request",
        automatic: true,
      });
  }

  return suggestions;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  categorizeError,
  mapToModelFailureReason,
  isRetryableError,
  isQuotaError,
  isAuthError,
  getUserMessage,
  getRecoverySuggestions,
};
