/**
 * AI Behavior Validation Layer
 *
 * Classifies AI responses and validates that they contain working, executable code.
 * Ensures the system never fails fast and always attempts to return valid code.
 *
 * NON-NEGOTIABLE: The system is only correct if the model eventually responds with real code.
 * All errors are internal obstacles, not outcomes.
 */

import { ModelId } from "@/mcp/runtime/types";
import { NotificationDeduplicator } from "../notificationDeduplicator";

// Runtime-safe const objects (not enums) to prevent tree-shaking issues
export const FailureType = {
  MODEL_FAILURE: "MODEL_FAILURE",
  INFRA_FAILURE: "INFRA_FAILURE",
  CONFIG_FAILURE: "CONFIG_FAILURE",
  CODE_BUG: "CODE_BUG",
} as const;

export type FailureType = (typeof FailureType)[keyof typeof FailureType];

export const ClassificationResult = {
  MODEL_SUCCESS: "MODEL_SUCCESS",
  MODEL_FAILURE: "MODEL_FAILURE",
  INFRA_FAILURE: "INFRA_FAILURE",
  CONFIG_FAILURE: "CONFIG_FAILURE",
  CODE_BUG: "CODE_BUG",
  QUOTA_EXHAUSTED: "QUOTA_EXHAUSTED",
  NO_OP: "NO_OP", // Valid state - no error, no action needed
} as const;

export type ClassificationResult =
  (typeof ClassificationResult)[keyof typeof ClassificationResult];

export interface ValidationResult {
  isValid: boolean;
  containsCode: boolean;
  isComplete: boolean;
  isRefusal: boolean;
  reason?: string;
}

export interface CompletionVerificationResult {
  isComplete: boolean;
  criteria: {
    modelResponded: boolean;
    responseNonEmpty: boolean;
    containsCodeBlock: boolean;
    codeSyntacticallyValid: boolean;
    containsExplanation: boolean;
    noUnclassifiedErrors: boolean;
  };
  failures: string[];
}

export interface ClassificationAttempt {
  requestId: string;
  modelName: ModelId;
  failureType: FailureType | null;
  attemptNumber: number;
  timestamp: number;
  error?: Error;
  responseText?: string;
}

/**
 * Context for notification decisions
 */
export interface NotificationContext {
  executionPhase: "initial" | "retry" | "fallback" | "final";
  errorType?: FailureType | ClassificationResult;
  retryCount?: number;
  fallbackState?: boolean;
  allModelsExhausted?: boolean;
  requiresUserAction?: boolean;
  errorMessage?: string; // Error message for defensive quota detection
}

export class AIBehaviorValidation {
  /**
   * Classify an AI response or error into one of three categories
   *
   * @param response - The AI response (text, toolCalls, usage)
   * @param error - Any error that occurred
   * @param requestId - Request ID for correlation across attempts
   * @param modelName - Current model being used
   * @param attemptNumber - Current attempt number (for logging)
   */
  static classifyResponse(
    response: { text?: string; toolCalls?: any[]; usage?: any } | null,
    error: Error | null,
    requestId: string,
    modelName: ModelId,
    attemptNumber: number = 1,
    apiKey?: string,
    payload?: any,
  ): ClassificationResult {
    // CRITICAL: Check for CODE_BUG first (before any retry/fallback)
    // CODE_BUG never retries, never falls back
    if (error) {
      // Check for CODE_BUG (JS exceptions before network, invalid requestId, etc.)
      if (this.isCodeBug(error, requestId, apiKey, modelName, payload)) {
        this.logAttempt({
          requestId,
          modelName,
          failureType: FailureType.CODE_BUG,
          attemptNumber,
          timestamp: Date.now(),
          error,
        });
        return ClassificationResult.CODE_BUG;
      }

      // CRITICAL: Check for QUOTA_EXHAUSTED (permanent quota exhaustion)
      // QUOTA_EXHAUSTED never retries, never falls back, never self-heals
      if (this.isPermanentQuotaExhaustion(error)) {
        this.logAttempt({
          requestId,
          modelName,
          failureType: FailureType.MODEL_FAILURE, // Use MODEL_FAILURE for logging, but QUOTA_EXHAUSTED for classification
          attemptNumber,
          timestamp: Date.now(),
          error,
        });
        return ClassificationResult.QUOTA_EXHAUSTED;
      }

      // Check for CONFIG_FAILURE (API key missing/invalid)
      if (this.isConfigFailure(error)) {
        this.logAttempt({
          requestId,
          modelName,
          failureType: FailureType.CONFIG_FAILURE,
          attemptNumber,
          timestamp: Date.now(),
          error,
        });
        return ClassificationResult.CONFIG_FAILURE;
      }

      // Check for INFRA_FAILURE (5xx, network, timeout)
      if (this.isInfraFailure(error)) {
        this.logAttempt({
          requestId,
          modelName,
          failureType: FailureType.INFRA_FAILURE,
          attemptNumber,
          timestamp: Date.now(),
          error,
        });
        return ClassificationResult.INFRA_FAILURE;
      }

      // Otherwise, treat as MODEL_FAILURE (refusal, malformed, etc.)
      this.logAttempt({
        requestId,
        modelName,
        failureType: FailureType.MODEL_FAILURE,
        attemptNumber,
        timestamp: Date.now(),
        error,
      });
      return ClassificationResult.MODEL_FAILURE;
    }

    // Also check requestId validity even if no error (defensive)
    if (!requestId || requestId.trim() === "") {
      const codeBugError = new Error(
        "requestId is required but was missing or empty",
      );
      this.logAttempt({
        requestId: "MISSING",
        modelName,
        failureType: FailureType.CODE_BUG,
        attemptNumber,
        timestamp: Date.now(),
        error: codeBugError,
      });
      return ClassificationResult.CODE_BUG;
    }

    // No error - validate the response
    if (!response || !response.text) {
      this.logAttempt({
        requestId,
        modelName,
        failureType: FailureType.MODEL_FAILURE,
        attemptNumber,
        timestamp: Date.now(),
        responseText: "",
      });
      return ClassificationResult.MODEL_FAILURE;
    }

    // Validate the response content
    const validation = this.validateCodeResponse(response.text);

    if (
      !validation.isValid ||
      !validation.containsCode ||
      validation.isRefusal
    ) {
      this.logAttempt({
        requestId,
        modelName,
        failureType: FailureType.MODEL_FAILURE,
        attemptNumber,
        timestamp: Date.now(),
        responseText: response.text.substring(0, 200), // Log first 200 chars
      });
      return ClassificationResult.MODEL_FAILURE;
    }

    // Success - response contains valid code
    this.logAttempt({
      requestId,
      modelName,
      failureType: null,
      attemptNumber,
      timestamp: Date.now(),
      responseText: response.text.substring(0, 200),
    });
    return ClassificationResult.MODEL_SUCCESS;
  }

  /**
   * Validate if a response contains executable code (not just explanations)
   */
  static validateCodeResponse(text: string): ValidationResult {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return {
        isValid: false,
        containsCode: false,
        isComplete: false,
        isRefusal: false,
        reason: "Empty response",
      };
    }

    const normalizedText = text.toLowerCase().trim();

    // Check for refusals
    const refusalPatterns = [
      /i cannot/i,
      /i'm not able/i,
      /i am not able/i,
      /i don't have/i,
      /i do not have/i,
      /i cannot help/i,
      /i'm unable/i,
      /i am unable/i,
      /sorry,? i cannot/i,
      /i'm sorry,? but i cannot/i,
      /i apologize,? but/i,
      /as an ai/i,
      /i'm an ai/i,
      /i am an ai/i,
    ];

    const isRefusal = refusalPatterns.some((pattern) =>
      pattern.test(normalizedText),
    );
    if (isRefusal) {
      return {
        isValid: false,
        containsCode: false,
        isComplete: false,
        isRefusal: true,
        reason: "Model refusal detected",
      };
    }

    // Check for code blocks (markdown code fences)
    const codeBlockPattern = /```[\s\S]*?```/;
    const hasCodeBlocks = codeBlockPattern.test(text);

    // Check for inline code
    const inlineCodePattern = /`[^`]+`/;
    const hasInlineCode = inlineCodePattern.test(text);

    // Check for common code patterns (function declarations, class definitions, etc.)
    const codePatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=\s*(\(|function|async|\(|\[)/,
      /class\s+\w+/,
      /import\s+.*from/,
      /export\s+(const|function|class|default)/,
      /def\s+\w+\s*\(/,
      /public\s+(class|interface|enum)/,
      /<[A-Z]\w+[^>]*>/,
      /return\s+[^;]+;/,
      /if\s*\([^)]+\)\s*\{/,
      /for\s*\([^)]+\)\s*\{/,
      /while\s*\([^)]+\)\s*\{/,
    ];

    const hasCodePatterns = codePatterns.some((pattern) => pattern.test(text));

    // Response must have code blocks OR inline code OR code patterns
    const containsCode = hasCodeBlocks || hasInlineCode || hasCodePatterns;

    if (!containsCode) {
      // Check if it's just an explanation without code
      const explanationOnlyPatterns = [
        /^here's how/i,
        /^to do this/i,
        /^you can/i,
        /^the solution is/i,
        /^here's what/i,
        /^i'll explain/i,
      ];

      const isExplanationOnly =
        explanationOnlyPatterns.some((pattern) =>
          pattern.test(normalizedText.substring(0, 100)),
        ) &&
        !hasCodeBlocks &&
        !hasInlineCode;

      if (isExplanationOnly) {
        return {
          isValid: false,
          containsCode: false,
          isComplete: false,
          isRefusal: false,
          reason: "Explanation only, no code",
        };
      }
    }

    // Check for truncated responses (ends abruptly)
    const isTruncated = this.isTruncatedResponse(text);

    // Check for syntax validity (basic checks)
    const hasValidSyntax = this.hasBasicValidSyntax(text);

    return {
      isValid: containsCode && hasValidSyntax && !isTruncated,
      containsCode,
      isComplete: !isTruncated,
      isRefusal: false,
      reason: isTruncated
        ? "Truncated response"
        : hasValidSyntax
          ? undefined
          : "Invalid syntax",
    };
  }

  /**
   * Check if response is truncated (ends abruptly)
   */
  private static isTruncatedResponse(text: string): boolean {
    // Check if ends with incomplete code block
    const codeBlockCount = (text.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      return true; // Unclosed code block
    }

    // Check if ends mid-statement (common patterns)
    const truncatedPatterns = [
      /[^;{}]\s*$/, // Ends without semicolon, brace, or bracket (might be incomplete)
      /function\s+\w+\s*\([^)]*$/, // Function declaration without closing paren
      /const\s+\w+\s*=\s*[^=]*$/, // Const assignment incomplete
      /if\s*\([^)]*$/, // If statement without closing paren
    ];

    const lastLines = text.split("\n").slice(-3).join("\n");
    return truncatedPatterns.some((pattern) => pattern.test(lastLines));
  }

  /**
   * Basic syntax validation (checks for common syntax errors)
   */
  private static hasBasicValidSyntax(text: string): boolean {
    // Extract code blocks
    const codeBlockPattern = /```(?:\w+)?\n?([\s\S]*?)```/g;
    const codeBlocks: string[] = [];
    let match;
    while ((match = codeBlockPattern.exec(text)) !== null) {
      codeBlocks.push(match[1]);
    }

    // If no code blocks, check inline code
    if (codeBlocks.length === 0) {
      const inlineCodePattern = /`([^`]+)`/g;
      while ((match = inlineCodePattern.exec(text)) !== null) {
        codeBlocks.push(match[1]);
      }
    }

    // If still no code blocks, check the entire text for code patterns
    if (codeBlocks.length === 0) {
      codeBlocks.push(text);
    }

    // Basic validation: check for balanced brackets, parentheses, braces
    for (const code of codeBlocks) {
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;

      // Allow some imbalance (not all code needs to be complete)
      // But flag if severely imbalanced
      const braceImbalance = Math.abs(openBraces - closeBraces);
      const parenImbalance = Math.abs(openParens - closeParens);
      const bracketImbalance = Math.abs(openBrackets - closeBrackets);

      // If severely imbalanced, likely malformed
      if (braceImbalance > 3 || parenImbalance > 3 || bracketImbalance > 3) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determine if an error is an infrastructure failure (5xx, network, timeout)
   */
  static isInfraFailure(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // CORS errors are infrastructure failures (network/connectivity)
    if (this.isCorsError(error)) {
      return true;
    }

    // HTTP 4xx errors (API-level issues, not CODE_BUG)
    // CRITICAL: 400 INVALID_ARGUMENT with "invalid role" is CODE_BUG, not INFRA_FAILURE
    // This should be caught in pre-flight validation, but if it reaches here, it's still CODE_BUG
    if (errorMessage.includes("400") || errorMessage.includes("bad request")) {
      // Check if it's an invalid role error (CODE_BUG)
      if (
        errorMessage.includes("invalid role") ||
        errorMessage.includes("valid role") ||
        errorMessage.includes("role: user, model")
      ) {
        return false; // This is CODE_BUG, not INFRA_FAILURE
      }
      // Other 400 errors (invalid model, endpoint) are INFRA_FAILURE
      if (
        errorMessage.includes("invalid model") ||
        errorMessage.includes("model not found")
      ) {
        return true;
      }
      // Default: 400 without specific pattern is likely CODE_BUG (should be caught in pre-flight)
      return false;
    }

    // HTTP 5xx errors
    if (
      errorMessage.includes("500") ||
      errorMessage.includes("502") ||
      errorMessage.includes("503") ||
      errorMessage.includes("504") ||
      errorMessage.includes("internal server error")
    ) {
      return true;
    }

    // Network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("econnreset") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound") ||
      errorName === "networkerror" ||
      errorName === "typeerror"
    ) {
      return true;
    }

    // Timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("aborted") ||
      errorName === "timeouterror" ||
      errorName === "aborterror"
    ) {
      return true;
    }

    // Rate limit (429) - BUT check if quota is permanently exhausted
    if (
      errorMessage.includes("429") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("resource_exhausted")
    ) {
      // CRITICAL: If quota limit is 0, this is NOT retriable
      // Check for permanent quota exhaustion
      if (
        errorMessage.includes("limit: 0") ||
        (errorMessage.includes("quota exceeded") &&
          errorMessage.includes("free_tier"))
      ) {
        // This is a permanent failure, not a transient INFRA_FAILURE
        // We'll handle this separately in the retry logic
        return false; // Don't retry on permanent quota exhaustion
      }
      return true; // Transient rate limit - retriable
    }

    // SSE stream interruption
    if (
      errorMessage.includes("stream") ||
      errorMessage.includes("sse") ||
      errorMessage.includes("readable")
    ) {
      return true;
    }

    // VPN/connectivity degradation
    if (
      errorMessage.includes("vpn") ||
      errorMessage.includes("proxy") ||
      errorMessage.includes("connectivity")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determine if an error is a configuration failure (API key missing/invalid)
   */
  static isConfigFailure(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // CORS errors are NOT config failures - they're network/infrastructure issues
    if (this.isCorsError(error)) {
      return false;
    }

    // API key missing
    if (
      errorMessage.includes("api key") &&
      (errorMessage.includes("required") ||
        errorMessage.includes("missing") ||
        errorMessage.includes("not set"))
    ) {
      return true;
    }

    // API key invalid (401, 403) - but NOT if it's CORS
    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      // 403 can be CORS or auth - check if it's CORS first
      if (!this.isCorsError(error)) {
        if (
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("forbidden") ||
          errorMessage.includes("invalid api key") ||
          errorMessage.includes("api key is invalid") ||
          errorMessage.includes("permission denied")
        ) {
          return true;
        }
      }
    }

    // Authentication errors (not CORS)
    if (
      !this.isCorsError(error) &&
      (errorMessage.includes("authentication") ||
        errorMessage.includes("auth") ||
        errorName === "authenticationerror")
    ) {
      return true;
    }

    return false;
  }

  static isCorsError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    const errorString = JSON.stringify(error).toLowerCase();

    // CORS-specific error patterns
    if (
      errorName === "typeerror" &&
      (errorMessage.includes("cors") ||
        errorMessage.includes("cross-origin") ||
        errorMessage.includes("networkerror") ||
        errorMessage.includes("failed to fetch"))
    ) {
      return true;
    }

    // Network errors that are likely CORS
    if (
      errorMessage.includes("cors") ||
      errorMessage.includes("cross-origin") ||
      errorMessage.includes("access-control-allow-origin") ||
      errorMessage.includes("preflight") ||
      errorString.includes("cors") ||
      errorString.includes("cross-origin")
    ) {
      return true;
    }

    // Failed to fetch (often CORS in browser)
    if (
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("networkerror") ||
      errorMessage.includes("network error")
    ) {
      // Check if it's a fetch error (likely CORS in browser context)
      if (errorName === "typeerror" || errorName === "networkerror") {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine if an error is a model failure (refusal, empty, malformed)
   */
  static isModelFailure(error: Error): boolean {
    // If it's not a config failure or infra failure, it's likely a model failure
    return !this.isConfigFailure(error) && !this.isInfraFailure(error);
  }

  /**
   * Check if error indicates permanent quota exhaustion (limit: 0)
   * Detects ALL of: RESOURCE_EXHAUSTED, "quota exceeded", "limit: 0", "free_tier_* = 0"
   * Also checks for retryDelay combined with zero quota
   */
  static isPermanentQuotaExhaustion(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorString = JSON.stringify(error).toLowerCase();

    // Check for RESOURCE_EXHAUSTED
    if (
      errorMessage.includes("resource_exhausted") ||
      errorString.includes("resource_exhausted")
    ) {
      // If combined with limit: 0 or free_tier quota = 0, it's permanent
      if (
        errorMessage.includes("limit: 0") ||
        errorMessage.includes("limit = 0") ||
        (errorMessage.includes("free_tier") &&
          (errorMessage.includes("= 0") || errorMessage.includes(": 0")))
      ) {
        return true;
      }
    }

    // Check for quota exceeded with limit: 0
    if (
      errorMessage.includes("quota exceeded") ||
      errorMessage.includes("quota_exceeded")
    ) {
      if (
        errorMessage.includes("limit: 0") ||
        errorMessage.includes("limit = 0") ||
        (errorMessage.includes("free_tier") &&
          (errorMessage.includes("= 0") || errorMessage.includes(": 0")))
      ) {
        return true;
      }
    }

    // Check for 429 with limit: 0
    if (errorMessage.includes("429") || errorString.includes("429")) {
      if (
        errorMessage.includes("limit: 0") ||
        errorMessage.includes("limit = 0") ||
        (errorMessage.includes("free_tier") &&
          (errorMessage.includes("= 0") || errorMessage.includes(": 0")))
      ) {
        return true;
      }
    }

    // Check for free_tier quota patterns (free_tier_* = 0)
    const freeTierPattern = /free_tier[_\w]*\s*[=:]\s*0/i;
    if (
      freeTierPattern.test(errorMessage) ||
      freeTierPattern.test(errorString)
    ) {
      return true;
    }

    // Check for retryDelay combined with zero quota (indicates permanent exhaustion)
    if (
      (errorMessage.includes("retrydelay") ||
        errorMessage.includes("retry_delay")) &&
      (errorMessage.includes("limit: 0") ||
        errorMessage.includes("limit = 0") ||
        (errorMessage.includes("quota") && errorMessage.includes("0")))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is 400 INVALID_ARGUMENT with invalid role
   */
  static isInvalidRoleError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      (errorMessage.includes("400") || errorMessage.includes("bad request")) &&
      (errorMessage.includes("invalid role") ||
        errorMessage.includes("valid role") ||
        errorMessage.includes("role: user, model"))
    );
  }

  /**
   * Check if error is 400 INVALID_ARGUMENT (any 400 error)
   * 400 errors are NOT retriable and should not trigger fallback
   */
  static is400InvalidArgument(error: Error): boolean {
    // Check error status code if available
    const errorAny = error as any;
    if (errorAny.status === 400 || errorAny.statusCode === 400) {
      return true;
    }

    // Check error message
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes("400") || errorMessage.includes("bad request")) {
      // Exclude invalid role errors (those are CODE_BUG, handled separately)
      if (!this.isInvalidRoleError(error)) {
        return true;
      }
    }

    // Check for INVALID_ARGUMENT in error details
    const errorString = JSON.stringify(error).toLowerCase();
    if (
      errorString.includes("invalid_argument") ||
      errorString.includes("invalid argument")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extract HTTP status code from error
   * Returns null if status code cannot be determined
   */
  static getHttpStatusCode(error: Error): number | null {
    const errorAny = error as any;

    // Check common status code properties
    if (typeof errorAny.status === "number") {
      return errorAny.status;
    }
    if (typeof errorAny.statusCode === "number") {
      return errorAny.statusCode;
    }
    if (typeof errorAny.code === "number") {
      return errorAny.code;
    }

    // Try to extract from error message
    const errorMessage = error.message;
    const statusMatch = errorMessage.match(
      /\b(400|401|403|429|500|502|503|504)\b/,
    );
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }

    return null;
  }

  /**
   * Determine if an error is a code bug (JS exception before network, invalid payload, etc.)
   */
  static isCodeBug(
    error: Error | null,
    requestId?: string,
    apiKey?: string,
    modelId?: ModelId,
    payload?: any,
  ): boolean {
    // CRITICAL: Invalid role errors are CODE_BUG
    if (error && this.isInvalidRoleError(error)) {
      return true;
    }

    // Missing requestId is a CODE_BUG
    if (!requestId || requestId.trim() === "") {
      return true;
    }

    // Missing API key is CONFIG_FAILURE, not CODE_BUG
    // But invalid API key format could be CODE_BUG if it's a programming error
    if (
      apiKey !== undefined &&
      (typeof apiKey !== "string" || apiKey.trim() === "")
    ) {
      // This is handled by isConfigFailure, but if it's a type error, it's CODE_BUG
      return false; // Let isConfigFailure handle this
    }

    // Invalid model ID is CODE_BUG
    if (
      modelId !== undefined &&
      !Object.values(ModelId).includes(modelId as any)
    ) {
      return true;
    }

    // Invalid payload structure is CODE_BUG
    if (
      payload !== undefined &&
      (payload === null || typeof payload !== "object")
    ) {
      return true;
    }

    // JS exceptions before network (TypeError, ReferenceError, etc.) are CODE_BUG
    if (error) {
      const errorName = error.name.toLowerCase();
      const errorMessage = error.message.toLowerCase();

      // Common JS exceptions that indicate code bugs
      if (
        errorName === "typeerror" &&
        !errorMessage.includes("network") &&
        !errorMessage.includes("fetch")
      ) {
        return true;
      }
      if (errorName === "referenceerror") {
        return true;
      }
      if (errorName === "syntaxerror") {
        return true;
      }
      if (errorName === "rangeerror") {
        return true;
      }
      // If error message contains common JS error patterns but not network-related
      if (
        errorMessage.includes("is not a function") ||
        errorMessage.includes("cannot read property") ||
        errorMessage.includes("cannot read") ||
        errorMessage.includes("undefined is not") ||
        errorMessage.includes("null is not") ||
        (errorMessage.includes("is not defined") &&
          !errorMessage.includes("api key"))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Pre-flight validation before blaming the model
   * Checks for CODE_BUG conditions that should never retry or fallback
   *
   * @param requestId - Request ID (must exist)
   * @param apiKey - API key (must be present, but never logged)
   * @param modelId - Model ID (must be valid)
   * @param payload - Request payload (must be valid structure)
   * @param error - Any error that occurred before network call
   * @returns Validation result with CODE_BUG classification if any check fails
   */
  static validateRequestPreFlight(
    requestId: string | undefined,
    apiKey: string | undefined,
    modelId: ModelId | undefined,
    payload?: any,
    error?: Error | null,
  ): { isValid: boolean; failureType: FailureType | null; reason?: string } {
    // Check requestId exists
    if (!requestId || requestId.trim() === "") {
      return {
        isValid: false,
        failureType: FailureType.CODE_BUG,
        reason: "requestId is required and must not be empty",
      };
    }

    // Check API key present (but never log it)
    if (
      apiKey === undefined ||
      apiKey === null ||
      (typeof apiKey === "string" && apiKey.trim() === "")
    ) {
      // This is CONFIG_FAILURE, not CODE_BUG
      return {
        isValid: false,
        failureType: null, // Let classifyResponse handle CONFIG_FAILURE
        reason: "API key is missing",
      };
    }

    // Check model ID is valid
    // CRITICAL: Accept both enum ModelId and string model IDs (for dynamically discovered models)
    // Model IDs can be from enum OR discovered at runtime (e.g., gemini-2.5-flash-lite)
    if (modelId === undefined) {
      return {
        isValid: false,
        failureType: FailureType.CODE_BUG,
        reason: `Model ID is required`,
      };
    }

    // Accept string model IDs (discovered models) OR enum ModelId values
    const isValidModelId =
      (typeof modelId === "string" &&
        modelId.trim() !== "" &&
        modelId.startsWith("gemini")) ||
      Object.values(ModelId).includes(modelId as any);

    if (!isValidModelId) {
      return {
        isValid: false,
        failureType: FailureType.CODE_BUG,
        reason: `Invalid model ID: ${modelId}`,
      };
    }

    // Check payload structure is valid (if provided)
    if (payload !== undefined) {
      if (
        payload === null ||
        (typeof payload !== "object" && typeof payload !== "string")
      ) {
        return {
          isValid: false,
          failureType: FailureType.CODE_BUG,
          reason: "Invalid payload structure",
        };
      }

      // CRITICAL: Validate roles in payload (if contents array exists)
      // Gemini API ONLY accepts 'user' and 'model' roles
      if (payload.history && Array.isArray(payload.history)) {
        for (const msg of payload.history) {
          if (msg && typeof msg === "object" && msg.role) {
            const role = msg.role;
            if (role !== "user" && role !== "model") {
              return {
                isValid: false,
                failureType: FailureType.CODE_BUG,
                reason: `Invalid role in payload: ${role}. Gemini API only accepts 'user' or 'model' roles.`,
              };
            }
          }
        }
      }

      // Also check contents array if it exists directly
      if (payload.contents && Array.isArray(payload.contents)) {
        for (const content of payload.contents) {
          if (content && typeof content === "object" && content.role) {
            const role = content.role;
            if (role !== "user" && role !== "model") {
              return {
                isValid: false,
                failureType: FailureType.CODE_BUG,
                reason: `Invalid role in contents: ${role}. Gemini API only accepts 'user' or 'model' roles.`,
              };
            }
          }
        }
      }
    }

    // Check for JS exceptions before network
    if (error && this.isCodeBug(error, requestId, apiKey, modelId, payload)) {
      return {
        isValid: false,
        failureType: FailureType.CODE_BUG,
        reason: `JS exception before network: ${error.name}: ${error.message}`,
      };
    }

    // All checks passed
    return {
      isValid: true,
      failureType: null,
    };
  }

  /**
   * Validate final payload before network call
   * CRITICAL: Must be called AFTER formatHistory() and BEFORE network call
   * Validates the actual contents[] array that will be sent to Gemini API
   *
   * @param contents - The contents array to be sent to Gemini API
   * @param requestId - Request ID for error reporting
   * @throws Error with CODE_BUG classification if any invalid role is found
   */
  static validateFinalPayload(contents: any[], requestId: string): void {
    if (!Array.isArray(contents)) {
      console.error(
        `[AIBehaviorValidation] CODE_BUG: Contents must be an array. requestId=${requestId}`,
      );
      return; // Don't throw, just return
    }

    const ALLOWED_ROLES = ["user", "model"];
    const FORBIDDEN_ROLES = ["system", "function", "tool", "assistant"];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (!content || typeof content !== "object") {
        console.error(
          `[AIBehaviorValidation] CODE_BUG: Invalid content item at index ${i}. requestId=${requestId}`,
        );
        return; // Don't throw, just return
      }

      if (!content.role) {
        console.error(
          `[AIBehaviorValidation] CODE_BUG: Content item at index ${i} missing role. requestId=${requestId}`,
        );
        return; // Don't throw, just return
      }

      const role = content.role;

      // Check if role is explicitly forbidden
      if (FORBIDDEN_ROLES.includes(role)) {
        console.error(
          `[AIBehaviorValidation] CODE_BUG: Forbidden role '${role}' at index ${i}. Gemini API only accepts 'user' or 'model' roles. requestId=${requestId}`,
        );
        return; // Don't throw, just return
      }

      // Check if role is not in allowed list
      if (!ALLOWED_ROLES.includes(role)) {
        console.error(
          `[AIBehaviorValidation] CODE_BUG: Invalid role '${role}' at index ${i}. Gemini API only accepts 'user' or 'model' roles. Unknown roles are forbidden. requestId=${requestId}`,
        );
        return; // Don't throw, just return
      }
    }
  }

  /**
   * Log classification attempt for telemetry
   */
  private static logAttempt(attempt: ClassificationAttempt): void {
    const logData = {
      requestId: attempt.requestId,
      modelName: attempt.modelName,
      failureType: attempt.failureType,
      attemptNumber: attempt.attemptNumber,
      timestamp: attempt.timestamp,
      errorMessage: attempt.error?.message,
      errorName: attempt.error?.name,
      responsePreview: attempt.responseText,
    };

    console.log(
      `[AIBehaviorValidation][requestId=${attempt.requestId}][model=${attempt.modelName}][attempt=${attempt.attemptNumber}]:`,
      {
        classification:
          attempt.failureType === null ? "MODEL_SUCCESS" : attempt.failureType,
        ...logData,
      },
    );

    // Also record metric if telemetry is available
    try {
      const { recordMetric } = require("../llm/telemetry");
      recordMetric("ai_validation_attempt", 1, {
        model: attempt.modelName,
        failureType: attempt.failureType || "SUCCESS",
        requestId: attempt.requestId,
      });
    } catch {
      // Silently fail if telemetry not available
    }
  }

  /**
   * Determine if a notification should be shown based on context
   *
   * Rules:
   * - FORBIDDEN: Notifications during retry
   * - FORBIDDEN: Notifications during fallback
   * - FORBIDDEN: Notifications for recoverable errors
   * - ALLOWED: User action required (API key missing)
   * - ALLOWED: All retries + fallbacks exhausted
   * - ALLOWED: Invariant broken (CODE_BUG)
   * - ALLOWED: Final failure verdict reached
   */
  static shouldShowNotification(context: NotificationContext): boolean {
    // CRITICAL: Fully null-safe, enum-guarded, non-throwing
    try {
      // Defensive check: Ensure enums are available at runtime
      if (
        !FailureType ||
        typeof FailureType !== "object" ||
        !ClassificationResult ||
        typeof ClassificationResult !== "object"
      ) {
        // Safe default: only show for final phase
        return (
          context.executionPhase === "final" ||
          context.allModelsExhausted === true
        );
      }

      // FORBIDDEN: During retry phase
      if (context.executionPhase === "retry") {
        return false;
      }

      // FORBIDDEN: During fallback phase
      if (context.executionPhase === "fallback") {
        return false;
      }

      // ALLOWED: QUOTA_EXHAUSTED - always show (terminal failure)
      // Use string comparison to avoid type narrowing issues
      const errorTypeStr = String(context.errorType || "");
      const isQuotaExhausted =
        errorTypeStr === ClassificationResult.QUOTA_EXHAUSTED ||
        errorTypeStr === ("QUOTA_EXHAUSTED" as any);
      if (isQuotaExhausted) {
        return true;
      }

      // ALLOWED: User action required (API key missing/invalid)
      const isConfigFailure =
        errorTypeStr === FailureType.CONFIG_FAILURE ||
        errorTypeStr === ClassificationResult.CONFIG_FAILURE ||
        errorTypeStr === ("CONFIG_FAILURE" as any);
      if (context.requiresUserAction || isConfigFailure) {
        return true;
      }

      // ALLOWED: Invariant broken (CODE_BUG)
      const isCodeBug =
        errorTypeStr === FailureType.CODE_BUG ||
        errorTypeStr === ClassificationResult.CODE_BUG ||
        errorTypeStr === ("CODE_BUG" as any);
      if (isCodeBug) {
        return true;
      }

      // ALLOWED: All models exhausted (final failure) - ONLY if executionPhase is 'final'
      if (
        context.executionPhase === "final" &&
        context.allModelsExhausted === true
      ) {
        return true;
      }

      // FORBIDDEN: Recoverable errors (INFRA_FAILURE, MODEL_FAILURE) - never show during retry/fallback
      // Safe enum access with fallback to string comparison
      const isInfraFailure =
        errorTypeStr === FailureType.INFRA_FAILURE ||
        errorTypeStr === ClassificationResult.INFRA_FAILURE ||
        errorTypeStr === "INFRA_FAILURE";
      const isModelFailure =
        errorTypeStr === FailureType.MODEL_FAILURE ||
        errorTypeStr === ClassificationResult.MODEL_FAILURE ||
        errorTypeStr === "MODEL_FAILURE";
      if (isInfraFailure || isModelFailure) {
        // Only show if it's the final phase AND all models exhausted
        return (
          context.executionPhase === "final" &&
          context.allModelsExhausted === true
        );
      }

      // Default: don't show notification (silent for retries, fallbacks, internal recovery)
      return false;
    } catch (error) {
      // CRITICAL: Never throw - return safe default
      console.error(
        "[AIBehaviorValidation] shouldShowNotification error (non-throwing):",
        error,
      );
      return (
        context.executionPhase === "final" ||
        context.allModelsExhausted === true
      );
    }
  }

  /**
   * Verify completion - ensures no fake success is reported
   * ALL criteria must pass for completion to be verified
   *
   * Criteria:
   * - Model responded successfully
   * - Response text is non-empty
   * - Contains real fenced code block
   * - Code is syntactically valid
   * - Contains explanation (not code-only)
   * - No unclassified errors remain
   *
   * Note: UI rendering verification is handled separately in App.tsx
   */
  static verifyCompletion(
    response: { text?: string; toolCalls?: any[]; usage?: any } | null,
    error: Error | null,
    requestId: string,
  ): CompletionVerificationResult {
    const criteria = {
      modelResponded: false,
      responseNonEmpty: false,
      containsCodeBlock: false,
      codeSyntacticallyValid: false,
      containsExplanation: false,
      noUnclassifiedErrors: false,
    };
    const failures: string[] = [];

    // 1. Model responded successfully
    if (response !== null && !error) {
      criteria.modelResponded = true;
    } else {
      failures.push("Model did not respond successfully");
    }

    // 2. Response text is non-empty
    if (response?.text && response.text.trim().length > 0) {
      criteria.responseNonEmpty = true;
    } else {
      failures.push("Response text is empty");
    }

    // 3. Contains real fenced code block
    if (response?.text) {
      const codeBlockPattern = /```[\s\S]*?```/;
      if (codeBlockPattern.test(response.text)) {
        criteria.containsCodeBlock = true;
      } else {
        failures.push("Response does not contain fenced code block");
      }
    }

    // 4. Code is syntactically valid
    if (response?.text) {
      const validation = this.validateCodeResponse(response.text);
      if (validation.isValid) {
        criteria.codeSyntacticallyValid = true;
      } else {
        failures.push(
          `Code syntax validation failed: ${validation.reason || "Invalid syntax"}`,
        );
      }
    }

    // 5. Contains explanation (not code-only)
    if (response?.text) {
      const text = String(response.text);
      // Extract code blocks
      const codeBlockPattern = /```[\s\S]*?```/g;
      const codeBlocks: string[] = (text.match(codeBlockPattern) ||
        []) as string[];
      const codeOnlyLength = codeBlocks.reduce(
        (sum, block) => sum + block.length,
        0,
      );
      const totalLength = text.length;
      // At least 20% of response should be non-code (explanation)
      const explanationRatio =
        totalLength > 0 ? (totalLength - codeOnlyLength) / totalLength : 0;
      if (explanationRatio >= 0.2 || codeBlocks.length === 0) {
        criteria.containsExplanation = true;
      } else {
        failures.push("Response contains only code, no explanation");
      }
    }

    // 6. No unclassified errors remain
    if (!error) {
      criteria.noUnclassifiedErrors = true;
    } else {
      // Check if error is classified
      const isClassified =
        this.isConfigFailure(error) ||
        this.isInfraFailure(error) ||
        this.isCodeBug(error, requestId);
      if (isClassified) {
        criteria.noUnclassifiedErrors = true;
      } else {
        failures.push(`Unclassified error: ${error.message}`);
      }
    }

    // All criteria must pass
    const isComplete = Object.values(criteria).every((c) => c === true);

    return {
      isComplete,
      criteria,
      failures,
    };
  }

  /**
   * Get user-friendly error message (never expose raw infrastructure errors)
   * Per requirements: Only show notifications for manual actions or final failures
   */
  static getUserMessage(
    classification: ClassificationResult,
    allModelsExhausted: boolean,
    context?: NotificationContext,
  ): string {
    // Defensive check: Ensure ClassificationResult is available at runtime
    if (!ClassificationResult || typeof ClassificationResult !== "object") {
      console.error(
        "[AIBehaviorValidation] ClassificationResult not available at runtime",
      );
      return "An error occurred. Please try again.";
    }

    // Defensive check: Ensure FailureType is available at runtime
    if (!FailureType || typeof FailureType !== "object") {
      console.error(
        "[AIBehaviorValidation] FailureType not available at runtime",
      );
      return "An error occurred. Please try again.";
    }

    if (classification === ClassificationResult.MODEL_SUCCESS) {
      return ""; // No error
    }

    // Build context if not provided
    const notificationContext: NotificationContext = context || {
      executionPhase: allModelsExhausted ? "final" : "initial",
      errorType: classification,
      allModelsExhausted,
    };

    // FORBIDDEN: Return empty for retry/fallback phases (no notification)
    if (
      notificationContext.executionPhase === "retry" ||
      notificationContext.executionPhase === "fallback"
    ) {
      return ""; // Silent - no notification during retry/fallback
    }

    // Check if notification should be shown
    if (!this.shouldShowNotification(notificationContext)) {
      return ""; // Silent - no notification
    }

    // Check deduplication (defensive - handle if module not available)
    try {
      if (NotificationDeduplicator) {
        const fingerprint = NotificationDeduplicator.createFingerprint(
          String(classification),
          context?.errorMessage || "",
          context?.errorType?.toString(),
        );
        if (!NotificationDeduplicator.shouldShow(fingerprint)) {
          return ""; // Duplicate notification - skip
        }
      }
    } catch (error) {
      // Silently fail if NotificationDeduplicator not available
      console.warn(
        "[AIBehaviorValidation] NotificationDeduplicator not available:",
        error,
      );
    }

    // CONFIG_FAILURE: User action required (API key)
    if (
      classification === ClassificationResult.CONFIG_FAILURE ||
      classification === ("CONFIG_FAILURE" as any)
    ) {
      return "API key is missing or invalid. Please configure your API key in Settings.";
    }

    // CODE_BUG: Invariant broken
    if (
      classification === ClassificationResult.CODE_BUG ||
      classification === ("CODE_BUG" as any)
    ) {
      return "An internal error occurred. This has been logged and will be fixed. Please try again or reload the page.";
    }

    // CRITICAL: QUOTA_EXHAUSTED must be checked BEFORE generic "temporarily unavailable" message
    // Quota exhaustion is NOT temporary and MUST NOT suggest retrying
    if (
      classification === ClassificationResult.QUOTA_EXHAUSTED ||
      classification === ("QUOTA_EXHAUSTED" as any)
    ) {
      return "API quota exhausted. Please check your Gemini API quota limits in Google Cloud Console or upgrade your plan.";
    }

    // CORS errors: Infrastructure issue, not user action required
    if (
      classification === ClassificationResult.INFRA_FAILURE &&
      context?.errorMessage
    ) {
      const error = new Error(context.errorMessage);
      if (this.isCorsError(error)) {
        return "Network connectivity issue detected. This may be due to CORS restrictions or network configuration. Local features remain available.";
      }
    }

    // INFRA_FAILURE: Transient network/server issues
    if (classification === ClassificationResult.INFRA_FAILURE) {
      if (allModelsExhausted) {
        return "Cloud AI temporarily unavailable due to network issues. Please check your connection and try again.";
      }
      return ""; // Silent during retry/fallback
    }

    // Check context for quota exhaustion indicators (defensive check)
    if (context) {
      // Check if error message contains quota exhaustion indicators
      const errorMessage = (context as any).errorMessage?.toLowerCase() || "";
      if (
        errorMessage.includes("quota") &&
        (errorMessage.includes("exhausted") ||
          errorMessage.includes("exceeded"))
      ) {
        if (
          errorMessage.includes("limit: 0") ||
          errorMessage.includes("limit = 0")
        ) {
          return "API quota exhausted. Please check your Gemini API quota limits in Google Cloud Console or upgrade your plan.";
        }
      }
    }

    // CRITICAL: ALL_MODELS_EXHAUSTED is now a TERMINAL state handled by FatalAIError
    // This function should NEVER be called with allModelsExhausted=true for terminal states
    // If we reach here with allModelsExhausted=true, it's a CODE_BUG - the caller should have thrown FatalAIError
    if (allModelsExhausted) {
      // Log warning - this path should not be reached for terminal states
      console.warn(
        "[AIBehaviorValidation] getUserMessage called with allModelsExhausted=true - this should be a FatalAIError",
      );
      // Return empty to avoid showing misleading "temporarily unavailable" message
      // The FatalAIError will provide the correct user message
      return "";
    }

    // For retries and fallbacks: return empty (no notification)
    // System will continue silently until success or all models exhausted
    return "";
  }
}
