/**
 * Prompt Optimizer
 * Reduces token usage by removing redundant phrases and optimizing text
 */

export function optimizePrompt(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let optimized = input;

  // Remove redundant polite phrases (save tokens)
  const redundantPhrases = [
    /\b(please|kindly|could you|would you|thank you|thanks)\b/gi,
    /\b(i would like|i want|i need|i think that|i believe)\b/gi,
    /\b(it would be great|it would be nice|it would be helpful)\b/gi,
    /\b(in order to|for the purpose of|due to the fact that)\b/gi,
    /\b(at this point in time|at the present time)\b/gi,
  ];

  redundantPhrases.forEach(regex => {
    optimized = optimized.replace(regex, '');
  });

  // Replace verbose phrases with concise ones
  const replacements: [RegExp, string][] = [
    [/create\s+a\s+new\s+/gi, 'create '],
    [/make\s+sure\s+that/gi, 'ensure '],
    [/i\s+think\s+that/gi, ''],
    [/in\s+order\s+to/gi, 'to '],
    [/due\s+to\s+the\s+fact\s+that/gi, 'because '],
    [/at\s+this\s+point\s+in\s+time/gi, 'now '],
    [/for\s+the\s+purpose\s+of/gi, 'for '],
  ];

  replacements.forEach(([regex, replacement]) => {
    optimized = optimized.replace(regex, replacement);
  });

  // Normalize whitespace
  optimized = optimized.replace(/\s+/g, ' ').trim();

  // Remove redundant punctuation
  optimized = optimized.replace(/[.,;]{2,}/g, '.');

  return optimized;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimate: ~4 characters per token for English
  // For code, it's usually ~3-5 characters per token
  return Math.ceil(text.length / 4);
}
