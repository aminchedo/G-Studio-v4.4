/**
 * Response Cache
 * Exact-match and semantic caching for LLM responses
 * Reduces redundant API calls without affecting output behavior
 */

import { CacheEntry } from './types';

/**
 * Simple hash function (browser-compatible)
 */
function hash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate cache key from prompt and context
 */
function generateCacheKey(prompt: string, context?: string, modelId?: string): string {
  const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
  const contextHash = context ? hash(context) : 'none';
  const modelHash = modelId ? hash(modelId) : 'default';
  return `cache:${modelHash}:${contextHash}:${hash(normalized)}`;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_SIZE = 100;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached response
   */
  get(prompt: string, context?: string, modelId?: string): CacheEntry | null {
    const key = generateCacheKey(prompt, context, modelId);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Set cached response
   */
  set(
    prompt: string,
    response: string,
    tokens?: { prompt: number; response: number },
    context?: string,
    modelId?: string
  ): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.MAX_SIZE) {
      this.clean();
    }

    const key = generateCacheKey(prompt, context, modelId);
    const entry: CacheEntry = {
      key,
      response,
      timestamp: Date.now(),
      tokens,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clean expired entries
   */
  private clean(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    // If still full, remove oldest entries
    if (this.cache.size >= this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_SIZE + 10);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL,
    };
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

/**
 * Convenience functions
 */
export function getCached(prompt: string, context?: string, modelId?: string): string | null {
  const entry = responseCache.get(prompt, context, modelId);
  return entry ? entry.response : null;
}

export function setCached(
  prompt: string,
  response: string,
  tokens?: { prompt: number; response: number },
  context?: string,
  modelId?: string
): void {
  responseCache.set(prompt, response, tokens, context, modelId);
}
