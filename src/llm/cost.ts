/**
 * Cost Estimation Engine
 * Estimates LLM API costs based on token usage and model pricing
 */

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ModelPricing {
  input: number;  // Cost per input token (USD)
  output: number; // Cost per output token (USD)
}

/**
 * Pricing table for different models (USD per token)
 * Prices are approximate and should be updated based on actual API pricing
 */
const PRICE_TABLE: Record<string, ModelPricing> = {
  // Gemini models
  'gemini-pro': { input: 0.000001, output: 0.000002 },
  'gemini-pro-latest': { input: 0.000001, output: 0.000002 },
  'gemini-3.0-pro-preview': { input: 0.000001, output: 0.000002 },
  'gemini-3.0-pro': { input: 0.000001, output: 0.000002 },
  
  'gemini-flash': { input: 0.0000005, output: 0.000001 },
  'gemini-flash-latest': { input: 0.0000005, output: 0.000001 },
  'gemini-1.5-flash-latest': { input: 0.0000005, output: 0.000001 },
  'gemini-3.0-flash-preview': { input: 0.0000005, output: 0.000001 },
  'gemini-3.0-flash': { input: 0.0000005, output: 0.000001 },
  
  'gemini-flash-lite': { input: 0.00000025, output: 0.0000005 },
  'gemini-flash-lite-latest': { input: 0.00000025, output: 0.0000005 },
  
  // OpenAI models (for reference)
  'gpt-4': { input: 0.00003, output: 0.00006 },
  'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
  'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 },
  
  // Default fallback
  'default': { input: 0.000001, output: 0.000002 },
};

/**
 * Estimate cost for a model based on token usage
 * @param model Model identifier
 * @param usage Token usage information
 * @returns Estimated cost in USD
 */
export function estimateCost(
  model: string,
  usage?: TokenUsage
): number {
  if (!usage) {
    return 0;
  }

  // Normalize model name (handle variations)
  const normalizedModel = normalizeModelName(model);
  const pricing = PRICE_TABLE[normalizedModel] || PRICE_TABLE['default'];

  // Calculate cost
  const inputCost = (usage.promptTokens || 0) * pricing.input;
  const outputCost = (usage.completionTokens || 0) * pricing.output;

  const totalCost = inputCost + outputCost;

  // Round to 6 decimal places (micro-dollars precision)
  return Number(totalCost.toFixed(6));
}

/**
 * Normalize model name to match pricing table
 */
function normalizeModelName(model: string): string {
  const normalized = model.toLowerCase().trim();
  
  // Handle Gemini model variations
  if (normalized.includes('gemini-3.0-pro')) {
    return 'gemini-3.0-pro-preview';
  }
  if (normalized.includes('gemini-3.0-flash')) {
    return 'gemini-3.0-flash-preview';
  }
  if (normalized.includes('gemini-pro')) {
    return 'gemini-pro';
  }
  if (normalized.includes('gemini-flash-lite')) {
    return 'gemini-flash-lite';
  }
  if (normalized.includes('gemini-flash')) {
    return 'gemini-flash-latest';
  }
  
  return normalized;
}

/**
 * Get pricing information for a model
 */
export function getModelPricing(model: string): ModelPricing {
  const normalized = normalizeModelName(model);
  return PRICE_TABLE[normalized] || PRICE_TABLE['default'];
}

/**
 * Update pricing table (for dynamic pricing updates)
 */
export function updatePricing(model: string, pricing: ModelPricing): void {
  PRICE_TABLE[model] = pricing;
}

/**
 * Get all available models and their pricing
 */
export function getAllPricing(): Record<string, ModelPricing> {
  return { ...PRICE_TABLE };
}
