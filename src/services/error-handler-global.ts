/**
 * Global Error Handler
 * Prevents application crashes from uncaught errors and unhandled promise rejections
 */

export function initializeGlobalErrorHandlers() {
  // Browser errors
  window.addEventListener("error", (event) => {
    const details =
      event.error === null
        ? `resource load: ${event.message || "?"} at ${event.filename || "?"}:${event.lineno ?? "?"}`
        : event.error;
    console.error("[Global Error Handler] Uncaught error:", details);
    event.preventDefault();
    if (typeof window !== "undefined" && (window as any).showError) {
      (window as any).showError(
        "An unexpected error occurred. Please try again.",
      );
    }
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const isCancellation =
      (reason &&
        typeof reason === "object" &&
        (reason as { type?: string }).type === "cancelation") ||
      (reason &&
        typeof reason === "object" &&
        /cancel/i.test(String((reason as { msg?: string }).msg ?? ""))) ||
      (reason instanceof Error && /cancel|abort/i.test(reason.message)) ||
      (typeof reason === "string" && /cancel|abort/i.test(reason));

    if (isCancellation) {
      event.preventDefault();
      return; // Don't log or show toast for intentional cancellations
    }

    console.error(
      "[Global Error Handler] Unhandled promise rejection:",
      reason,
    );
    event.preventDefault();

    // Show user-friendly error instead of crashing
    if (typeof window !== "undefined" && (window as any).showError) {
      (window as any).showError(
        "An unexpected error occurred. Please try again.",
      );
    }
  });

  // React error boundary fallback
  if (typeof window !== "undefined") {
    (window as any).__handleError = (error: Error) => {
      console.error("[Global Error Handler] React error:", error);

      // Show user-friendly message
      if ((window as any).showError) {
        (window as any).showError(
          "A component error occurred. Please refresh the page.",
        );
      }
    };
  }

  console.log("[Global Error Handler] ✅ Initialized");
}
