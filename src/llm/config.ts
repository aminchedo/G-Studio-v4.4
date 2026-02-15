/**
 * LLM Gateway Configuration
 * Feature flags and settings for safe, gradual rollout
 */

/**
 * Feature flag: Enable new LLM gateway
 * Set to false to use existing implementation (default)
 * Set to true to use optimized LLM gateway
 */
export const ENABLE_NEW_LLM_GATEWAY = false;

/**
 * Gradual rollout percentage (0-100)
 * Only applies when ENABLE_NEW_LLM_GATEWAY is true
 * 0 = use existing, 100 = use new gateway for all requests
 */
export const NEW_LLM_ROLLOUT_PERCENTAGE = 0;

/**
 * Enable response caching
 */
export const ENABLE_CACHE = true;

/**
 * Enable prompt optimization
 */
export const ENABLE_PROMPT_OPTIMIZATION = true;

/**
 * Enable context trimming
 */
export const ENABLE_CONTEXT_TRIMMING = true;

/**
 * Maximum context tokens
 */
export const MAX_CONTEXT_TOKENS = 2000;

/**
 * Maximum context messages
 */
export const MAX_CONTEXT_MESSAGES = 10;

/**
 * Always preserve last N messages for continuity
 */
export const PRESERVE_RECENT_MESSAGES = 2;

/**
 * Feature flag: Enable Gemini gateway provider
 * Set to false to use generic implementation (default)
 * Set to true to use Gemini-specific provider
 * 
 * STATUS: Enabled for gradual rollout (Phase 2)
 */
export const ENABLE_GEMINI_GATEWAY = true;

/**
 * Feature flag: Enable context abstraction layer
 * When enabled, provides structural summaries instead of raw code
 * 
 * STATUS: Disabled - will be enabled separately after gateway is stable (Phase 4)
 */
export const ENABLE_CONTEXT_ABSTRACTION = false;

/**
 * Gradual rollout percentage for Gemini gateway (0-100)
 * Only applies when ENABLE_GEMINI_GATEWAY is true
 * 0 = use generic, 100 = use Gemini gateway for all requests
 * 
 * STATUS: Set to 25% for Phase 2 testing (conservative rollout)
 */
export const GEMINI_GATEWAY_ROLLOUT_PERCENTAGE = 25;

/**
 * Check if new LLM gateway should be used for this request
 * Uses rollout percentage for gradual activation
 */
export function shouldUseNewGateway(requestId?: string): boolean {
  if (!ENABLE_NEW_LLM_GATEWAY) {
    return false;
  }

  if (NEW_LLM_ROLLOUT_PERCENTAGE >= 100) {
    return true;
  }

  if (NEW_LLM_ROLLOUT_PERCENTAGE <= 0) {
    return false;
  }

  // Use requestId or random to determine if this request should use new gateway
  // This ensures consistent behavior for the same request
  const hash = requestId 
    ? simpleHash(requestId) 
    : Math.random() * 100;
  
  return hash < NEW_LLM_ROLLOUT_PERCENTAGE;
}

/**
 * Simple hash function for consistent request routing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if Gemini gateway should be used for this request
 * Uses rollout percentage for gradual activation
 */
export function shouldUseGeminiGateway(requestId?: string): boolean {
  if (!ENABLE_GEMINI_GATEWAY) {
    return false;
  }

  if (GEMINI_GATEWAY_ROLLOUT_PERCENTAGE >= 100) {
    return true;
  }

  if (GEMINI_GATEWAY_ROLLOUT_PERCENTAGE <= 0) {
    return false;
  }

  // Use requestId or random to determine if this request should use Gemini gateway
  // This ensures consistent behavior for the same request
  const hash = requestId 
    ? simpleHash(requestId) 
    : Math.random() * 100;
  
  return hash < GEMINI_GATEWAY_ROLLOUT_PERCENTAGE;
}

/**
 * Get configuration summary for logging
 */
export function getConfigSummary() {
  return {
    newGatewayEnabled: ENABLE_NEW_LLM_GATEWAY,
    rolloutPercentage: NEW_LLM_ROLLOUT_PERCENTAGE,
    geminiGatewayEnabled: ENABLE_GEMINI_GATEWAY,
    geminiGatewayRolloutPercentage: GEMINI_GATEWAY_ROLLOUT_PERCENTAGE,
    contextAbstractionEnabled: ENABLE_CONTEXT_ABSTRACTION,
    cacheEnabled: ENABLE_CACHE,
    promptOptimizationEnabled: ENABLE_PROMPT_OPTIMIZATION,
    contextTrimmingEnabled: ENABLE_CONTEXT_TRIMMING,
    maxContextTokens: MAX_CONTEXT_TOKENS,
    maxContextMessages: MAX_CONTEXT_MESSAGES,
    preserveRecentMessages: PRESERVE_RECENT_MESSAGES,
  };
}
