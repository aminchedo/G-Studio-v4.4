/**
 * AI Observability Layer
 *
 * Structured instrumentation for AI calls. Safe add-on only:
 * - No behavior change, no signature change, no external contract change.
 * - requestId is internal (not exposed in UI).
 */

/** Generate a unique requestId per AI call. */
export function generateRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) id += "-";
    else if (i === 14) id += "4";
    else id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

export interface RetryLogPayload {
  requestId: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: string;
}

export function logRetry(payload: RetryLogPayload): void {
  console.debug("[AI_OBSERVABILITY][retry]", JSON.stringify(payload));
}

export interface TimeoutLogPayload {
  requestId: string;
  model?: string;
  timeoutMs: number;
  stage: string;
}

export function logTimeout(payload: TimeoutLogPayload): void {
  console.warn("[AI_OBSERVABILITY][timeout]", JSON.stringify(payload));
}

export interface ModelSelectionLogPayload {
  requestId: string;
  selectedModel: string;
  fallbackUsed: boolean;
  scoreBreakdown?: Record<string, number>;
  reason: string;
}

export function logModelSelection(payload: ModelSelectionLogPayload): void {
  console.debug("[AI_OBSERVABILITY][model_selection]", JSON.stringify(payload));
}

/**
 * Internal structured error surface for observability only.
 * Do not expose in UI or change external error contract.
 */
export interface ObservabilityError {
  requestId?: string;
  category: string;
  message: string;
  retryable: boolean;
  model?: string;
  attempt?: number;
}

export function toObservabilityError(
  category: string,
  message: string,
  retryable: boolean,
  context?: { requestId?: string; model?: string; attempt?: number },
): ObservabilityError {
  return {
    ...(context?.requestId != null && { requestId: context.requestId }),
    category,
    message,
    retryable,
    ...(context?.model != null && { model: context.model }),
    ...(context?.attempt != null && { attempt: context.attempt }),
  };
}

export function logObservabilityError(payload: ObservabilityError): void {
  console.debug("[AI_OBSERVABILITY][error]", JSON.stringify(payload));
}
