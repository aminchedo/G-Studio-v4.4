/**
 * Model Telemetry Service
 * Tracks runtime behavior per model family (FLASH / PRO / NORMAL)
 * 
 * Telemetry is recorded ONLY during runtime execution, NOT during discovery.
 * This provides insights into how families behave in real-world usage.
 */

import { ModelFamily } from './modelInfo';

export type TelemetryEvent =
  | 'attempt'
  | 'success'
  | 'failure'
  | 'rate_limited'
  | 'fallback';

export interface FamilyStats {
  attempts: number;
  success: number;
  failure: number;
  rateLimited: number;
  fallback: number;
}

function initFamilyStats(): FamilyStats {
  return {
    attempts: 0,
    success: 0,
    failure: 0,
    rateLimited: 0,
    fallback: 0,
  };
}

/**
 * In-memory telemetry storage (per family)
 * Stats are reset on app restart
 */
const familyStats: Record<ModelFamily, FamilyStats> = {
  flash: initFamilyStats(),
  pro: initFamilyStats(),
  normal: initFamilyStats(),
  other: initFamilyStats(),
};

/**
 * Record a telemetry event for a model family
 * Called during runtime execution (not discovery)
 */
export function recordTelemetry(
  family: ModelFamily,
  event: TelemetryEvent
): void {
  const stats = familyStats[family];
  if (!stats) {
    console.warn(`[ModelTelemetryService] Unknown family: ${family}`);
    return;
  }

  switch (event) {
    case 'attempt':
      stats.attempts++;
      break;
    case 'success':
      stats.success++;
      break;
    case 'failure':
      stats.failure++;
      break;
    case 'rate_limited':
      stats.rateLimited++;
      break;
    case 'fallback':
      stats.fallback++;
      break;
  }

  // Optional: Log for debugging (can be disabled in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ModelTelemetryService] ${family.toUpperCase()}: ${event}`, stats);
  }
}

/**
 * Get current telemetry snapshot
 * Returns a deep clone to prevent external mutation
 */
export function getTelemetrySnapshot(): Record<ModelFamily, FamilyStats> {
  return structuredClone(familyStats);
}

/**
 * Get stats for a specific family
 */
export function getFamilyStats(family: ModelFamily): FamilyStats {
  return structuredClone(familyStats[family] || initFamilyStats());
}

/**
 * Reset all telemetry (useful for testing or manual reset)
 */
export function resetTelemetry(): void {
  Object.keys(familyStats).forEach(family => {
    familyStats[family as ModelFamily] = initFamilyStats();
  });
}
