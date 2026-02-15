/**
 * Importance & Similarity Cache
 * 
 * LRU cache for importance scoring and semantic similarity calculations
 * Reduces repeated inference calls and improves context ranking latency
 */

interface CacheEntry {
  value: number;
  timestamp: number;
  accessCount: number;
}

class ImportanceCache {
  private static cache: Map<string, CacheEntry> = new Map();
  private static readonly MAX_SIZE = 100;
  private static readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate cache key from content and query
   */
  private static generateKey(content: string, query: string): string {
    // Simple hash function
    const str = content.substring(0, 200) + query.substring(0, 100);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash)}`;
  }

  /**
   * Get cached value
   */
  static get(content: string, query: string): number | null {
    const key = this.generateKey(content, query);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log('[CACHE]: MISS');
      return null;
    }

    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.cache.delete(key);
      console.log('[CACHE]: EVICT (expired)');
      return null;
    }

    // Update access count
    entry.accessCount++;
    console.log('[CACHE]: HIT');
    return entry.value;
  }

  /**
   * Set cached value
   */
  static set(content: string, query: string, value: number): void {
    const key = this.generateKey(content, query);

    // Evict if cache is full (LRU)
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      // Find least recently used entry
      let lruKey = '';
      let lruAccess = Infinity;
      let lruTimestamp = Infinity;

      for (const [k, entry] of this.cache.entries()) {
        const score = entry.accessCount * 0.3 + (Date.now() - entry.timestamp) * 0.7;
        if (score < lruAccess) {
          lruKey = k;
          lruAccess = score;
          lruTimestamp = entry.timestamp;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
        console.log('[CACHE]: EVICT (LRU)');
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Clear cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Clean expired entries
   */
  static cleanExpired(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      console.log(`[CACHE]: EVICT (${evicted} expired entries)`);
    }
  }

  /**
   * Get cache stats
   */
  static getStats(): { size: number; maxSize: number; hitRate: number } {
    let totalAccess = 0;
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      hitRate: totalAccess > 0 ? totalAccess / (totalAccess + this.cache.size) : 0,
    };
  }
}

// Periodic cleanup
setInterval(() => {
  ImportanceCache.cleanExpired();
}, 60000); // Every minute

export { ImportanceCache };
