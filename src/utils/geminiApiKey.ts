/**
 * Gemini API key helpers.
 *
 * These functions provide best-effort validation to prevent accidental
 * non-key text being saved as an API key.
 */

/**
 * Best-effort validation for Google AI Studio API keys (common format: "AIza...").
 * This is not a security guarantee; it just filters obvious invalid input.
 */
export function isLikelyGeminiApiKey(raw: string | null | undefined): boolean {
  const key = (raw ?? "").trim();
  if (!key) return false;
  return /^AIza[0-9A-Za-z\-_]{20,}$/.test(key);
}

export function normalizeGeminiApiKey(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}
