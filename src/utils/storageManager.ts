/**
 * Storage Manager
 * 
 * Comprehensive localStorage management with automatic cleanup and error handling
 * Prevents QuotaExceededError by proactively managing storage
 */

export interface StorageStats {
  totalSizeMB: number;
  itemCount: number;
  largestItems: Array<{ key: string; sizeKB: number }>;
  usagePercentage: number;
}

export class StorageManager {
  private static readonly MAX_STORAGE_MB = 4.5; // Leave 0.5MB buffer
  private static readonly CLEANUP_THRESHOLD_MB = 3.5; // Start cleanup at 70%
  private static readonly ESSENTIAL_KEYS = [
    'secure_gstudio_agent_config',
    'gstudio_api_key',
    'secure_api_key',
    'gemini_api_key',
    'gstudio_selected_model',
  ];

  /**
   * Get storage statistics
   */
  static getStats(): StorageStats {
    let totalSize = 0;
    const items: Array<{ key: string; sizeKB: number }> = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            totalSize += size;
            items.push({
              key,
              sizeKB: size / 1024,
            });
          }
        }
      }
    } catch (error) {
      console.error('[StorageManager] Error calculating stats:', error);
    }

    const totalSizeMB = totalSize / (1024 * 1024);
    const usagePercentage = (totalSizeMB / 5) * 100; // Assuming 5MB limit

    return {
      totalSizeMB,
      itemCount: localStorage.length,
      largestItems: items.sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 10),
      usagePercentage: Math.min(usagePercentage, 100),
    };
  }

  /**
   * Check if storage needs cleanup
   */
  static needsCleanup(): boolean {
    const stats = this.getStats();
    return stats.totalSizeMB > this.CLEANUP_THRESHOLD_MB;
  }

  /**
   * Clean up old/non-essential data
   */
  static async cleanup(aggressive: boolean = false): Promise<{
    removed: number;
    freedMB: number;
  }> {
    const statsBefore = this.getStats();
    const keysToRemove: string[] = [];

    try {
      // Collect keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Check if key is essential
          const isEssential = this.ESSENTIAL_KEYS.some(essential =>
            key === essential || key.startsWith(essential)
          );

          if (!isEssential) {
            keysToRemove.push(key);
          } else if (aggressive) {
            // In aggressive mode, also check size of essential keys
            const value = localStorage.getItem(key);
            if (value) {
              const sizeMB = new Blob([value]).size / (1024 * 1024);
              if (sizeMB > 1) {
                // Essential key is over 1MB, try to compress it
                try {
                  const parsed = JSON.parse(value);
                  if (parsed && typeof parsed === 'object') {
                    const compressed = this.compressConfig(parsed, key);
                    const compressedStr = JSON.stringify(compressed);
                    const compressedSizeMB = new Blob([compressedStr]).size / (1024 * 1024);
                    if (compressedSizeMB < sizeMB) {
                      localStorage.setItem(key, compressedStr);
                      console.log(`[StorageManager] Compressed ${key} from ${sizeMB.toFixed(2)}MB to ${compressedSizeMB.toFixed(2)}MB`);
                    }
                  }
                } catch (e) {
                  // Compression failed, skip
                }
              }
            }
          }
        }
      }

      // Remove non-essential keys
      let removed = 0;
      for (const key of keysToRemove) {
        try {
          localStorage.removeItem(key);
          removed++;
        } catch (error) {
          console.warn(`[StorageManager] Failed to remove key: ${key}`, error);
        }
      }

      const statsAfter = this.getStats();
      const freedMB = statsBefore.totalSizeMB - statsAfter.totalSizeMB;

      console.log(`[StorageManager] Cleanup complete: removed ${removed} items, freed ${freedMB.toFixed(2)}MB`);

      return { removed, freedMB };
    } catch (error) {
      console.error('[StorageManager] Cleanup error:', error);
      return { removed: 0, freedMB: 0 };
    }
  }

  /**
   * Compress configuration object
   */
  private static compressConfig(config: any, key: string): any {
    const compressed: any = {};

    if (key.includes('agent_config') || key.includes('config')) {
      // Keep only essential fields
      if (config.apiKey) compressed.apiKey = config.apiKey;
      if (config.selectedModel) compressed.selectedModel = config.selectedModel;
      if (config.settings) compressed.settings = config.settings;
      if (config.voice) compressed.voice = config.voice;
      if (config.persona) compressed.persona = config.persona;

      // Limit array sizes
      if (config.conversations && Array.isArray(config.conversations)) {
        compressed.conversations = config.conversations.slice(-5); // Keep last 5
      }
      if (config.history && Array.isArray(config.history)) {
        compressed.history = config.history.slice(-20); // Keep last 20
      }
      if (config.messages && Array.isArray(config.messages)) {
        compressed.messages = config.messages.slice(-10); // Keep last 10
      }
    } else {
      // For other keys, keep as-is but limit arrays
      Object.keys(config).forEach(k => {
        if (Array.isArray(config[k]) && config[k].length > 50) {
          compressed[k] = config[k].slice(-50);
        } else {
          compressed[k] = config[k];
        }
      });
    }

    return compressed;
  }

  /**
   * Safe setItem with automatic cleanup
   */
  static async safeSetItem(key: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const sizeMB = new Blob([serialized]).size / (1024 * 1024);

      // Check if we need cleanup before saving
      if (this.needsCleanup() || sizeMB > 0.5) {
        console.log('[StorageManager] Storage needs cleanup, cleaning before save...');
        await this.cleanup(false);
      }

      // Try to set item
      try {
        localStorage.setItem(key, serialized);
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.warn('[StorageManager] Quota exceeded, performing aggressive cleanup...');
          await this.cleanup(true);

          // Retry
          try {
            localStorage.setItem(key, serialized);
          } catch (retryError: any) {
            // If still failing, try minimal version
            if (typeof value === 'object' && value !== null) {
              const minimal = this.compressConfig(value, key);
              const minimalSerialized = JSON.stringify(minimal);
              localStorage.setItem(key, minimalSerialized);
              console.warn(`[StorageManager] Saved minimal version of ${key} due to quota`);
            } else {
              throw retryError;
            }
          }
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('[StorageManager] Error in safeSetItem:', {
        key,
        error: error.message,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * Clear all non-essential data
   */
  static clearNonEssential(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const isEssential = this.ESSENTIAL_KEYS.some(essential =>
          key === essential || key.startsWith(essential)
        );
        if (!isEssential) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[StorageManager] Failed to remove key: ${key}`, error);
      }
    });

    console.log(`[StorageManager] Cleared ${keysToRemove.length} non-essential items`);
  }
}
