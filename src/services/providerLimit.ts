/**
 * Provider Limit Result
 * Normalizes quota exhaustion into a structured, non-exceptional state
 */

export interface ProviderLimitResult {
  type: 'PROVIDER_LIMIT';
  provider: 'gemini';
  retryable: false;
  terminal: true;
  message: string;
  cooldownUntil?: number;
}

export class ProviderLimit {
  static create(provider: 'gemini' = 'gemini', cooldownMinutes: number = 30): ProviderLimitResult {
    const cooldownUntil = Date.now() + (cooldownMinutes * 60 * 1000);
    return {
      type: 'PROVIDER_LIMIT',
      provider,
      retryable: false,
      terminal: true,
      message: 'Cloud AI is temporarily unavailable. Core features remain active.',
      cooldownUntil
    };
  }

  static isProviderLimit(result: any): result is ProviderLimitResult {
    return result && result.type === 'PROVIDER_LIMIT';
  }
}
