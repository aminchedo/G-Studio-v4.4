/**
 * Response Cache - Semantic + Exact-match caching for LLM responses
 * Reduces redundant API calls without affecting output behavior
 */

interface CacheEntry {
  key: string;
  response: string;
  toolCalls?: any[];
  timestamp: number;
  tokenUsage?: { prompt: number; response: number };
}

interface SemanticCacheEntry extends CacheEntry {
  embedding?: number[]; // For future semantic matching
  semanticKey: string;
}

export class ResponseCache {
  private static exactCache: Map<string, CacheEntry> = new Map();
  private static semanticCache: Map<string, SemanticCacheEntry[]> = new Map();
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate exact cache key from prompt
   */
  private static generateExactKey(prompt: string, modelId: string, systemInstruction?: string): string {
    const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
    const systemHash = systemInstruction ? this.simpleHash(systemInstruction) : 'none';
    return `exact:${modelId}:${systemHash}:${this.simpleHash(normalized)}`;
  }

  /**
   * Generate semantic cache key (simplified - uses normalized prompt)
   * TODO: Use actual embeddings for true semantic matching
   */
  private static generateSemanticKey(prompt: string): string {
    // Normalize: lowercase, remove punctuation, sort words
    const normalized = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .sort()
      .join(' ');
    
    return this.simpleHash(normalized);
  }

  /**
   * Simple hash function
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check exact match cache
   */
  static getExactMatch(
    prompt: string,
    modelId: string,
    systemInstruction?: string
  ): CacheEntry | null {
    const key = this.generateExactKey(prompt, modelId, systemInstruction);
    const entry = this.exactCache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.exactCache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Check semantic match cache (simplified version)
   * TODO: Implement proper semantic similarity with embeddings
   */
  static getSemanticMatch(
    prompt: string,
    modelId: string,
    threshold: number = 0.9
  ): CacheEntry | null {
    const semanticKey = this.generateSemanticKey(prompt);
    const candidates = this.semanticCache.get(semanticKey) || [];

    // Find best match (for now, exact semantic key match)
    // In production, use cosine similarity on embeddings
    const match = candidates.find(entry => {
      if (Date.now() - entry.timestamp > this.CACHE_TTL) return false;
      return entry.semanticKey === semanticKey;
    });

    return match || null;
  }

  /**
   * Store in cache
   */
  static set(
    prompt: string,
    modelId: string,
    response: string,
    toolCalls?: any[],
    tokenUsage?: { prompt: number; response: number },
    systemInstruction?: string
  ): void {
    // Clean old entries if cache is full
    if (this.exactCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanOldEntries();
    }

    const exactKey = this.generateExactKey(prompt, modelId, systemInstruction);
    const semanticKey = this.generateSemanticKey(prompt);

    const entry: CacheEntry = {
      key: exactKey,
      response,
      toolCalls,
      timestamp: Date.now(),
      tokenUsage
    };

    // Store in exact cache
    this.exactCache.set(exactKey, entry);

    // Store in semantic cache
    if (!this.semanticCache.has(semanticKey)) {
      this.semanticCache.set(semanticKey, []);
    }
    
    const semanticEntry: SemanticCacheEntry = {
      ...entry,
      semanticKey
    };
    
    this.semanticCache.get(semanticKey)!.push(semanticEntry);

    // Limit semantic cache entries per key
    const semanticEntries = this.semanticCache.get(semanticKey)!;
    if (semanticEntries.length > 5) {
      semanticEntries.shift(); // Remove oldest
    }
  }

  /**
   * Clean old cache entries
   */
  private static cleanOldEntries(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.exactCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.exactCache.delete(key));

    // Clean semantic cache
    for (const [key, entries] of this.semanticCache.entries()) {
      const validEntries = entries.filter(e => now - e.timestamp <= this.CACHE_TTL);
      if (validEntries.length === 0) {
        this.semanticCache.delete(key);
      } else {
        this.semanticCache.set(key, validEntries);
      }
    }
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.exactCache.clear();
    this.semanticCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    exactSize: number;
    semanticSize: number;
    totalEntries: number;
  } {
    const semanticSize = Array.from(this.semanticCache.values())
      .reduce((sum, entries) => sum + entries.length, 0);

    return {
      exactSize: this.exactCache.size,
      semanticSize,
      totalEntries: this.exactCache.size + semanticSize
    };
  }
}
