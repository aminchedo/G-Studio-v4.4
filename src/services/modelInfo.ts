/**
 * Model Information Interface
 * Defines the structure for validated model metadata
 */

export type ModelFamily = "normal" | "flash" | "pro" | "others";

export interface ModelInfo {
  id: string;
  label: string;
  family: ModelFamily;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  /** Alias for maxInputTokens (used by ModelsTab) */
  inputTokenLimit?: number;
  /** Alias for maxOutputTokens (used by ModelsTab) */
  outputTokenLimit?: number;
  responseTime?: number; // Average response time in milliseconds (from UltimateGeminiTester)
  avgResponseTime?: number; // Alias for responseTime (for compatibility)
}

/**
 * Special overrides: Force specific models into categories regardless of name
 * These rules apply BEFORE all other classification rules
 */
const FORCE_FLASH: string[] = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

const FORCE_NORMAL: string[] = ["gemini-robotics-er-1.5-preview"];

/**
 * Smart Model Categorization
 *
 * Automatically categorizes models into Flash / Pro / Normal / Others using deterministic rules.
 * Model ID is the single source of classification truth.
 *
 * Rules (in priority order):
 * 1. Special overrides (FORCE_FLASH, FORCE_NORMAL)
 * 2. Flash: contains "flash" OR "lite"
 * 3. Pro: contains "pro" OR "ultra" OR "advanced" (only if not Flash)
 * 4. Others: Gemma / robotics / experimental models
 * 5. Normal: Stable Gemini or mid-range models (everything else)
 *
 * This works for:
 * - Default (static) models
 * - Discovered (validated) models
 * - Future models with new IDs
 *
 * Classification is deterministic, name-based, and independent of discovery.
 */
export function detectModelFamily(modelId: string): ModelFamily {
  const id = modelId.toLowerCase();

  // Special overrides (highest priority)
  if (FORCE_FLASH.includes(id)) {
    return "flash";
  }
  if (FORCE_NORMAL.includes(id)) {
    return "normal";
  }

  // RULE 1: Flash models (highest priority after overrides)
  // A model is FLASH if it contains "flash" OR "lite"
  if (id.includes("flash") || id.includes("lite")) {
    return "flash";
  }

  // RULE 2: Pro models (runs after Flash check)
  // A model is PRO if it contains "pro" OR "ultra" OR "advanced"
  // Note: If a model contains both "flash" and "pro", Flash wins (already handled above)
  if (id.includes("pro") || id.includes("ultra") || id.includes("advanced")) {
    return "pro";
  }

  // RULE 3: Others - Gemma / robotics / experimental models
  // These are separate from Normal Gemini models
  if (
    id.includes("gemma") ||
    id.includes("robotics") ||
    id.includes("experimental")
  ) {
    return "others";
  }

  // RULE 4: Normal models (default for stable Gemini or mid-range models)
  // This includes:
  // - Stable Gemini models (not flash, not pro, not gemma/robotics)
  // - Mid-range models
  // - Everything else that doesn't match above rules
  return "normal";
}

/**
 * Generate display label from model ID
 */
export function generateModelLabel(modelId: string): string {
  // Convert model ID to readable label
  // e.g., "gemini-3-flash-preview" -> "Gemini 3 Flash Preview"
  return modelId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/Gemini (\d)/g, "Gemini $1");
}

/**
 * Family weights for scoring (authoritative)
 * Flash models are preferred, then Pro, then Normal
 */
const FAMILY_WEIGHT: Record<ModelFamily, number> = {
  flash: 1.0,
  pro: 0.9,
  normal: 0.8,
  others: 0.6,
};

/**
 * Score model for default selection
 * Higher score = better default choice
 *
 * Scoring priorities:
 * 1. Model family (weighted: Flash 1.0 > Pro 0.9 > Normal 0.8)
 * 2. Capability bonuses (token limits)
 * 3. Version preference (newer versions preferred)
 *
 * CRITICAL: Preview models are NOT penalized - they are compared within their family only.
 * A preview model in Flash family should never be downgraded to a non-preview Flash model.
 */
export function scoreModel(model: ModelInfo): number {
  let score = 0;

  // Family preference (weighted) - primary factor
  score += FAMILY_WEIGHT[model.family] * 100;

  // Capability bonuses (token limits)
  if (model.maxInputTokens) {
    score += Math.min(model.maxInputTokens / 1000, 100);
  }
  if (model.maxOutputTokens) {
    score += Math.min(model.maxOutputTokens / 1000, 50);
  }

  // Version preference (newer versions preferred, but no penalty for preview)
  if (model.id.includes("latest")) score += 10;
  // Preview models are NOT penalized - they may be newer/better than stable versions
  // Comparison happens within family, so preview Flash vs stable Flash is fair
  if (model.id.includes("preview")) score += 5; // Preview models may have newer features

  return score;
}

/**
 * Select best default model from validated models
 *
 * CRITICAL: Models are compared WITHIN their family first, then across families.
 * This ensures preview models in Flash family are not downgraded to stable Flash models.
 */
export function selectBestDefaultModel(models: ModelInfo[]): ModelInfo | null {
  if (models.length === 0) return null;

  // Step 1: Group by family
  const byFamily: Record<ModelFamily, ModelInfo[]> = {
    flash: [],
    pro: [],
    normal: [],
    others: [],
  };

  models.forEach((model) => {
    if (byFamily[model.family]) {
      byFamily[model.family].push(model);
    }
  });

  // Step 2: Select best model within each family
  const bestByFamily: ModelInfo[] = [];
  for (const family of ["flash", "pro", "normal", "others"] as ModelFamily[]) {
    const familyModels = byFamily[family];
    if (familyModels.length > 0) {
      // Score models within this family
      const scored = familyModels.map((model) => ({
        model,
        score: scoreModel(model),
      }));
      scored.sort((a, b) => b.score - a.score);
      bestByFamily.push(scored[0].model);
    }
  }

  // Step 3: Select best across families (using family weights)
  if (bestByFamily.length === 0) return null;

  const finalScored = bestByFamily.map((model) => ({
    model,
    score: scoreModel(model),
  }));

  finalScored.sort((a, b) => b.score - a.score);
  return finalScored[0].model;
}
