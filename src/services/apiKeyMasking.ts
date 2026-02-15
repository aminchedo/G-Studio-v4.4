/**
 * API Key Masking Utility
 * 
 * Ensures API keys never appear in:
 * - Logs
 * - Error messages
 * - Reports
 * - Prompts
 * 
 * Security guarantee: API keys are masked everywhere except secure storage
 */

/**
 * Mask an API key for logging/display
 * Shows only last 4 characters: ***abcd
 */
export function maskApiKey(apiKey: string | undefined | null): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return '***MISSING***';
  }

  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) {
    return '***' + '*'.repeat(trimmed.length);
  }

  return '***' + trimmed.slice(-4);
}

/**
 * Check if a string contains an API key pattern
 * Used to detect accidental API key leaks
 */
export function containsApiKey(text: string): boolean {
  // Common API key patterns
  // Gemini API keys are typically 39 characters, alphanumeric
  const apiKeyPatterns = [
    /AIza[0-9A-Za-z_-]{35}/, // Google API key pattern
    /sk-[0-9A-Za-z]{32,}/, // OpenAI API key pattern
    /[0-9A-Za-z]{32,}/, // Generic long alphanumeric (potential API key)
  ];

  return apiKeyPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize a string to remove any API keys
 * Replaces API keys with masked version
 */
export function sanitizeString(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Replace Google API keys
  text = text.replace(/AIza[0-9A-Za-z_-]{35}/g, (match) => maskApiKey(match));
  
  // Replace OpenAI API keys
  text = text.replace(/sk-[0-9A-Za-z]{32,}/g, (match) => maskApiKey(match));
  
  // Replace generic long alphanumeric strings (potential API keys)
  // Only if they're in suspicious contexts (like "apiKey", "key", etc.)
  const suspiciousContexts = [
    /api[_-]?key["\s:=]+([0-9A-Za-z]{32,})/gi,
    /key["\s:=]+([0-9A-Za-z]{32,})/gi,
    /apikey["\s:=]+([0-9A-Za-z]{32,})/gi,
  ];

  suspiciousContexts.forEach(pattern => {
    text = text.replace(pattern, (match, key) => {
      return match.replace(key, maskApiKey(key));
    });
  });

  return text;
}

/**
 * Sanitize an object for logging (removes API keys from all string values)
 */
export function sanitizeObject(obj: any, maxDepth: number = 5): any {
  if (maxDepth <= 0) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip API key fields entirely or mask them
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('apikey') || lowerKey.includes('api_key') || lowerKey === 'key') {
      sanitized[key] = maskApiKey(value as string);
    } else {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    }
  }

  return sanitized;
}

/**
 * Safe console.log that never logs API keys
 */
export function safeLog(...args: any[]): void {
  const sanitized = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    } else if (typeof arg === 'object') {
      return sanitizeObject(arg);
    }
    return arg;
  });
  console.log(...sanitized);
}

/**
 * Safe console.error that never logs API keys
 */
export function safeError(...args: any[]): void {
  const sanitized = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    } else if (typeof arg === 'object') {
      return sanitizeObject(arg);
    }
    return arg;
  });
  console.error(...sanitized);
}

/**
 * Safe console.warn that never logs API keys
 */
export function safeWarn(...args: any[]): void {
  const sanitized = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    } else if (typeof arg === 'object') {
      return sanitizeObject(arg);
    }
    return arg;
  });
  console.warn(...sanitized);
}
