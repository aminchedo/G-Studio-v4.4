/**
 * useCache - Response and importance caching hook
 * 
 * Provides intelligent caching for API responses and computed values
 * with TTL, LRU eviction, and importance scoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  ttl: number;
  importance: number;
  size: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  maxSize: number;
  evictions: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  onEvict?: (entry: CacheEntry<unknown>) => void;
}

export interface SetOptions {
  ttl?: number;
  importance?: number;
  tags?: string[];
}

export interface UseCacheReturn<T = unknown> {
  // State
  stats: CacheStats;
  entries: CacheEntry<T>[];
  
  // Actions
  get: (key: string) => T | undefined;
  set: (key: string, value: T, options?: SetOptions) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  
  // Advanced
  getByTag: (tag: string) => T[];
  deleteByTag: (tag: string) => number;
  setImportance: (key: string, importance: number) => void;
  prune: () => number;
  preload: (entries: Array<{ key: string; value: T; options?: SetOptions }>) => void;
}

// Calculate object size (rough estimate)
const calculateSize = (value: unknown): number => {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
};

/**
 * useCache hook
 */
export function useCache<T = unknown>(options: CacheOptions = {}): UseCacheReturn<T> {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    defaultTTL = 5 * 60 * 1000, // 5 minutes
    cleanupInterval = 60 * 1000, // 1 minute
    onEvict,
  } = options;

  // State
  const [cache, setCache] = useState<Map<string, CacheEntry<T>>>(new Map());
  const [stats, setStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    totalSize: 0,
    maxSize,
    evictions: 0,
  });

  // Refs
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update stats
  const updateStats = useCallback((hit: boolean) => {
    setStats(prev => {
      const newHits = prev.hits + (hit ? 1 : 0);
      const newMisses = prev.misses + (hit ? 0 : 1);
      const total = newHits + newMisses;
      return {
        ...prev,
        hits: newHits,
        misses: newMisses,
        hitRate: total > 0 ? newHits / total : 0,
        totalEntries: cache.size,
        totalSize: Array.from(cache.values()).reduce((sum, e) => sum + e.size, 0),
      };
    });
  }, [cache]);

  // Calculate cache score for eviction (lower = more likely to evict)
  const calculateScore = useCallback((entry: CacheEntry<T>): number => {
    const age = Date.now() - entry.createdAt;
    const recency = Date.now() - entry.lastAccessedAt;
    const frequency = entry.accessCount;
    
    // Score based on: importance, frequency, recency
    return (
      entry.importance * 100 +
      frequency * 10 -
      recency / 1000 -
      age / 10000
    );
  }, []);

  // Evict entries to make room
  const evict = useCallback((requiredSpace: number) => {
    let freedSpace = 0;
    let evictedCount = 0;

    // Sort by score (lowest first)
    const sortedEntries = Array.from(cache.entries())
      .map(([key, entry]) => ({ key, entry, score: calculateScore(entry) }))
      .sort((a, b) => a.score - b.score);

    for (const { key, entry } of sortedEntries) {
      if (freedSpace >= requiredSpace) break;

      cache.delete(key);
      freedSpace += entry.size;
      evictedCount++;
      onEvict?.(entry as CacheEntry<unknown>);
    }

    setStats(prev => ({
      ...prev,
      evictions: prev.evictions + evictedCount,
    }));

    return freedSpace;
  }, [cache, calculateScore, onEvict]);

  // Get value
  const get = useCallback((key: string): T | undefined => {
    const entry = cache.get(key);

    if (!entry) {
      updateStats(false);
      return undefined;
    }

    // Check TTL
    if (Date.now() > entry.createdAt + entry.ttl) {
      cache.delete(key);
      setCache(new Map(cache));
      updateStats(false);
      return undefined;
    }

    // Update access info
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    updateStats(true);
    return entry.value;
  }, [cache, updateStats]);

  // Set value
  const set = useCallback((
    key: string,
    value: T,
    setOptions: SetOptions = {}
  ) => {
    const {
      ttl = defaultTTL,
      importance = 0.5,
      tags,
    } = setOptions;

    const size = calculateSize(value);
    const currentTotal = stats.totalSize;
    const existingEntry = cache.get(key);
    const existingSize = existingEntry?.size || 0;
    const requiredSpace = size - existingSize;

    // Evict if needed
    if (currentTotal + requiredSpace > maxSize) {
      evict(requiredSpace);
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      ttl,
      importance: Math.max(0, Math.min(1, importance)),
      size,
      tags,
    };

    cache.set(key, entry);
    setCache(new Map(cache));

    setStats(prev => ({
      ...prev,
      totalEntries: cache.size,
      totalSize: Array.from(cache.values()).reduce((sum, e) => sum + e.size, 0),
    }));
  }, [cache, defaultTTL, maxSize, stats.totalSize, evict]);

  // Check if key exists
  const has = useCallback((key: string): boolean => {
    const entry = cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (Date.now() > entry.createdAt + entry.ttl) {
      cache.delete(key);
      setCache(new Map(cache));
      return false;
    }
    
    return true;
  }, [cache]);

  // Delete entry
  const deleteEntry = useCallback((key: string): boolean => {
    const deleted = cache.delete(key);
    if (deleted) {
      setCache(new Map(cache));
      setStats(prev => ({
        ...prev,
        totalEntries: cache.size,
        totalSize: Array.from(cache.values()).reduce((sum, e) => sum + e.size, 0),
      }));
    }
    return deleted;
  }, [cache]);

  // Clear all entries
  const clear = useCallback(() => {
    cache.clear();
    setCache(new Map());
    setStats(prev => ({
      ...prev,
      totalEntries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
    }));
  }, [cache]);

  // Get entries by tag
  const getByTag = useCallback((tag: string): T[] => {
    return Array.from(cache.values())
      .filter(entry => entry.tags?.includes(tag))
      .map(entry => entry.value);
  }, [cache]);

  // Delete entries by tag
  const deleteByTag = useCallback((tag: string): number => {
    let count = 0;
    for (const [key, entry] of cache.entries()) {
      if (entry.tags?.includes(tag)) {
        cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      setCache(new Map(cache));
    }
    return count;
  }, [cache]);

  // Set importance
  const setImportance = useCallback((key: string, importance: number) => {
    const entry = cache.get(key);
    if (entry) {
      entry.importance = Math.max(0, Math.min(1, importance));
    }
  }, [cache]);

  // Prune expired entries
  const prune = useCallback((): number => {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.createdAt + entry.ttl) {
        cache.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      setCache(new Map(cache));
      setStats(prev => ({
        ...prev,
        totalEntries: cache.size,
        totalSize: Array.from(cache.values()).reduce((sum, e) => sum + e.size, 0),
      }));
    }

    return pruned;
  }, [cache]);

  // Preload entries
  const preload = useCallback((
    entries: Array<{ key: string; value: T; options?: SetOptions }>
  ) => {
    for (const { key, value, options } of entries) {
      set(key, value, options);
    }
  }, [set]);

  // Get entries for state
  const entries = Array.from(cache.values());

  // Cleanup interval
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(prune, cleanupInterval);
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [prune, cleanupInterval]);

  return {
    stats,
    entries,
    get,
    set,
    has,
    delete: deleteEntry,
    clear,
    getByTag,
    deleteByTag,
    setImportance,
    prune,
    preload,
  };
}

export default useCache;
