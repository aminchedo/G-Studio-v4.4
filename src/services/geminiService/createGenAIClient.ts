/**
 * Create @google/genai client instance.
 * ARCHITECTURAL: Single place that imports GoogleGenAI from @google/genai.
 * Used by the deprecated LLM gateway; production code should use GeminiService.streamChat().
 */

import { GoogleGenAI } from "@google/genai";

export function createGenAIClient(apiKey: string): InstanceType<typeof GoogleGenAI> {
  if (typeof GoogleGenAI === "undefined") {
    throw new Error(
      "GoogleGenAI SDK is not available in this runtime (likely the browser). Use a server-side proxy for Gemini API calls."
    );
  }
  return new GoogleGenAI({ apiKey });
}
