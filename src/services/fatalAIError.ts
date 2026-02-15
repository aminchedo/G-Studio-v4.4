/**
 * FatalAIError
 * Fatal errors that must stop agent execution immediately
 * These errors indicate violations of API Model Test constraints
 * 
 * SEMANTICS:
 * - FatalAIError is NEVER swallowed, wrapped, or converted
 * - FatalAIError ALWAYS propagates to UI layer
 * - FatalAIError ALWAYS blocks further execution
 * - FatalAIError requires explicit user action (API Model Test rerun)
 * 
 * HANDLING RULES:
 * 1. NEVER catch FatalAIError without rethrowing
 * 2. NEVER convert FatalAIError to a generic Error
 * 3. NEVER stringify and rethrow FatalAIError
 * 4. NEVER swallow FatalAIError in Promise chains
 * 5. ALWAYS use isFatalError() helper for detection
 */

export class FatalAIError extends Error {
  public readonly code: string;
  public readonly isFatal: boolean = true;
  public readonly userMessage: string;

  constructor(
    code: string,
    message: string,
    userMessage?: string
  ) {
    super(message);
    this.name = 'FatalAIError';
    this.code = code;
    this.userMessage = userMessage || message;
    
    // Ensure stack trace is preserved
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FatalAIError);
    }
    
    // Freeze to prevent mutation
    Object.freeze(this);
  }

  static MODEL_NOT_ALLOWED_BY_API_TEST(modelId: string, reason?: string): FatalAIError {
    return new FatalAIError(
      'MODEL_NOT_ALLOWED_BY_API_TEST',
      `Model ${modelId} is not allowed by API Model Test results. ${reason || 'Model was not validated or was rejected during testing.'}`,
      `The model "${modelId}" is not available. Please run "API Model Test" and ensure the model is validated.`
    );
  }

  static API_TEST_NOT_EXECUTED(): FatalAIError {
    return new FatalAIError(
      'API_TEST_NOT_EXECUTED',
      'API Model Test has not been executed. No Gemini requests are allowed until test is run.',
      'Please run "API Model Test" before using AI features.'
    );
  }

  static ZERO_USABLE_MODELS(): FatalAIError {
    return new FatalAIError(
      'ZERO_USABLE_MODELS',
      'API Model Test found zero usable models. No Gemini requests are allowed.',
      'No models are available. Please check your API key and quota, then run "API Model Test" again.'
    );
  }

  static MODEL_REJECTED_DURING_TEST(modelId: string, reason: string): FatalAIError {
    return new FatalAIError(
      'MODEL_REJECTED_DURING_TEST',
      `Model ${modelId} was rejected during API Model Test: ${reason}. This model is permanently banned for this session.`,
      `The model "${modelId}" is not available: ${reason}. Please use a different model.`
    );
  }

  static PROVIDER_EXHAUSTED(): FatalAIError {
    return new FatalAIError(
      'PROVIDER_EXHAUSTED',
      'Provider-level quota exhaustion detected. All models are unavailable.',
      'API quota has been exhausted. Please check your quota limits.'
    );
  }

  static PROVIDER_RATE_LIMITED(): FatalAIError {
    return new FatalAIError(
      'PROVIDER_RATE_LIMITED',
      'Provider-level rate limit (429) detected. API calls are temporarily blocked.',
      'API rate limit temporarily exceeded. Your API key is valid. Please wait and try again.'
    );
  }
}

/**
 * Type guard to check if an error is a FatalAIError
 * Use this helper instead of instanceof for consistent detection
 * 
 * @param error - The error to check
 * @returns true if the error is a FatalAIError
 */
export function isFatalError(error: unknown): error is FatalAIError {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  // Check for FatalAIError instance
  if (error instanceof FatalAIError) {
    return true;
  }
  
  // Fallback: Check for duck-typed FatalAIError (in case of serialization/deserialization)
  const maybeError = error as any;
  return (
    maybeError.name === 'FatalAIError' &&
    maybeError.isFatal === true &&
    typeof maybeError.code === 'string' &&
    typeof maybeError.message === 'string'
  );
}

/**
 * Assert that an error is NOT a FatalAIError before handling
 * Throws if the error is fatal (fail-fast pattern)
 * 
 * @param error - The error to check
 * @param context - Context for logging
 */
export function assertNotFatalError(error: unknown, context: string): void {
  if (isFatalError(error)) {
    console.error(`[${context}] FATAL_ERROR_DETECTED - must propagate, not handle:`, error);
    throw error;
  }
}
