/**
 * Default Models Service
 * Provides safe default models that work without Model Test
 * These models are assumed to be available when API key is valid
 */

import { ModelInfo, detectModelFamily, generateModelLabel } from "./modelInfo";

/**
 * Default available models (safe defaults that work without testing)
 * These are populated immediately when API key is entered
 */
/**
 * Priority models for fast "Test connection" (only these are probed).
 * Kept short (~8) so identification finishes in seconds, not minutes.
 */
export const PRIORITY_TEST_MODELS: string[] = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.0-pro",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-pro",
];

/**
 * Full candidate list for UI and fallbacks.
 * Used for dropdowns and when priority test list is not used.
 */
export const DEFAULT_MODELS: string[] = [
  ...PRIORITY_TEST_MODELS,
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-2.5-flash-lite-preview-09-2025",
  "gemini-robotics-er-1.5-preview",
  "gemma-3-1b-it",
  "gemma-3-4b-it",
  "gemma-3-12b-it",
  "gemma-3-27b-it",
  "gemma-3n-e2b-it",
  "gemma-3n-e4b-it",
];

/**
 * Convert default model IDs to ModelInfo objects
 * This is used to populate the Ribbon before Model Test runs
 */
export function getDefaultModelInfos(): ModelInfo[] {
  return DEFAULT_MODELS.map((modelId) => ({
    id: modelId,
    label: generateModelLabel(modelId),
    family: detectModelFamily(modelId),
  }));
}

/**
 * Check if a model is in the default list
 */
export function isDefaultModel(modelId: string): boolean {
  return DEFAULT_MODELS.includes(modelId);
}
