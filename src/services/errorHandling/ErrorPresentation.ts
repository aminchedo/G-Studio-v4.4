import type {
  ErrorInfo,
  ErrorCategory,
  ErrorSeverity,
  ErrorAction,
} from "@/mcp/runtime/types";

export type PresentableError = ErrorInfo;

export type { ErrorCategory, ErrorSeverity, ErrorAction };

function defaultCopyToClipboard(): string {
  return "";
}

export const ErrorParser = {
  parse(error: unknown): ErrorInfo {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      id: `err-${Date.now()}`,
      category: "unknown",
      severity: "error",
      message: err.message,
      title: err.name,
      timestamp: new Date(),
      recovery: { autoRetry: false, maxRetries: 0 },
      reporting: {
        copyToClipboard: defaultCopyToClipboard,
        logToConsole: true,
        sendTelemetry: false,
      },
    };
  },
};
