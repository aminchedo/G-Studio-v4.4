/**
 * SecureStorage - Encrypted storage wrapper
 * 
 * Purpose: Secure sensitive data storage
 * - Uses Electron's safeStorage API when available
 * - Falls back to encrypted localStorage in browser
 * - Backward compatible with existing localStorage data
 * - Automatic migration path
 * 
 * Usage: Drop-in replacement for localStorage
 * 
 * @example
 * // Instead of:
 * localStorage.setItem('api_key', key);
 * 
 * // Use:
 * await SecureStorage.setItem('api_key', key);
 */

import { ErrorHandler, ErrorCode } from '../errorHandler';

export interface SecureStorageOptions {
  // Use encryption even in browser (basic XOR encryption)
  forceEncryption?: boolean;
  
  // Migrate existing localStorage data
  migrateFromLocalStorage?: boolean;
  
  // Key prefix for namespacing
  keyPrefix?: string;
}

export class SecureStorage {
  private static isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  private static safeStorage = this.isElectron ? (window as any).electron?.safeStorage : null;
  private static encryptionKey: string | null = null;
  private static options: SecureStorageOptions = {
    forceEncryption: true,
    migrateFromLocalStorage: false,
    keyPrefix: 'secure_',
  };

  /**
   * Initialize secure storage
   * Call this once at app startup
   */
  static async initialize(options: SecureStorageOptions = {}): Promise<void> {
    this.options = { ...this.options, ...options };
    
    // Generate encryption key for browser fallback
    if (!this.isElectron && this.options.forceEncryption) {
      this.encryptionKey = await this.generateEncryptionKey();
    }
    
    // Migrate existing localStorage data if requested
    if (this.options.migrateFromLocalStorage) {
      await this.migrateFromLocalStorage();
    }
  }

  /**
   * Clear old non-essential data to free up localStorage space
   */
  private static async clearOldData(): Promise<void> {
    console.log('[SecureStorage] Starting aggressive cleanup...');
    
    // Essential keys to keep (exact matches)
    const essentialKeys = [
      'secure_gstudio_agent_config',
      'gstudio_api_key',
      'secure_api_key',
      'gemini_api_key',
      'gemini_test_results'
    ];
    
    const keysToRemove: string[] = [];
    let totalSize = 0;
    const keySizes: Array<{ key: string; size: number }> = [];
    
    // Calculate sizes and collect keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          keySizes.push({ key, size });
          
          // Check if key is essential (exact match or starts with essential prefix)
          const isEssential = essentialKeys.some(essential => 
            key === essential || key.startsWith(essential)
          );
          
          if (!isEssential) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    const sizeInMB = totalSize / (1024 * 1024);
    console.log(`[SecureStorage] Current storage: ${sizeInMB.toFixed(2)}MB`);
    
    // Remove all non-essential keys
    let removedCount = 0;
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
        removedCount++;
      } catch (error) {
        console.warn(`[SecureStorage] Failed to clear key: ${key}`, error);
      }
    }
    
    // If still over 3MB after cleanup, aggressively compress essential keys
    const remainingSize = Array.from({ length: localStorage.length }, (_, i) => {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        return value ? new Blob([value]).size : 0;
      }
      return 0;
    }).reduce((a, b) => a + b, 0);
    
    const remainingMB = remainingSize / (1024 * 1024);
    
    if (remainingMB > 3) {
      console.warn(`[SecureStorage] Still over quota (${remainingMB.toFixed(2)}MB). Compressing essential keys...`);
      
      // Aggressively compress secure_gstudio_agent_config
      const agentConfigKey = 'secure_gstudio_agent_config';
      const agentConfig = localStorage.getItem(agentConfigKey);
      if (agentConfig) {
        const agentConfigSize = new Blob([agentConfig]).size;
        if (agentConfigSize > 512 * 1024) { // If over 512KB
          try {
            const parsed = JSON.parse(agentConfig);
            if (parsed && typeof parsed === 'object') {
              // Keep only absolutely essential fields
              const minimal: any = {};
              if (parsed.apiKey) minimal.apiKey = parsed.apiKey;
              if (parsed.selectedModel) minimal.selectedModel = parsed.selectedModel;
              if (parsed.settings) {
                // Keep only essential settings
                minimal.settings = {
                  temperature: parsed.settings?.temperature,
                  maxTokens: parsed.settings?.maxTokens,
                };
              }
              const minimalStr = JSON.stringify(minimal);
              if (new Blob([minimalStr]).size < agentConfigSize) {
                localStorage.setItem(agentConfigKey, minimalStr);
                console.log(`[SecureStorage] Compressed ${agentConfigKey} from ${(agentConfigSize / 1024).toFixed(2)}KB to ${(new Blob([minimalStr]).size / 1024).toFixed(2)}KB`);
              }
            }
          } catch (e) {
            console.warn(`[SecureStorage] Failed to compress ${agentConfigKey}:`, e);
          }
        }
      }
    }
    
    console.log(`[SecureStorage] Cleared ${removedCount} items. Remaining: ${localStorage.length} items (${remainingMB.toFixed(2)}MB)`);
  }

  /**
   * Store item securely
   * 
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   * @returns Promise that resolves when stored
   */
  static async setItem(key: string, value: any): Promise<void> {
    // Log operation start
    console.log(`[SecureStorage] setItem called for key: ${key}`);
    try {
      // Normalize undefined to null for backward compatibility with tests
      let serialized = JSON.stringify(value === undefined ? null : value);
      const prefixedKey = this.getPrefixedKey(key);
      
      // Check size before attempting to save
      const dataSize = new Blob([serialized]).size;
      const sizeInMB = dataSize / (1024 * 1024);
      
      // If data is very large (>1MB), try to compress it
      if (sizeInMB > 1 && typeof value === 'object' && value !== null) {
        // Try to remove unnecessary fields for large objects
        const compressed: any = {};
        // Keep only essential fields based on key
        if (key === 'gstudio_agent_config') {
          if (value.apiKey) compressed.apiKey = value.apiKey;
          if (value.selectedModel) compressed.selectedModel = value.selectedModel;
          if (value.settings) compressed.settings = value.settings;
          // Remove large arrays
          if (value.conversations && Array.isArray(value.conversations)) {
            compressed.conversations = value.conversations.slice(-5); // Keep only last 5
          }
          if (value.history && Array.isArray(value.history)) {
            compressed.history = value.history.slice(-20); // Keep only last 20
          }
          serialized = JSON.stringify(compressed);
          console.log(`[SecureStorage] Compressed ${key} before saving from ${sizeInMB.toFixed(2)}MB to ${(new Blob([serialized]).size / (1024 * 1024)).toFixed(2)}MB`);
        }
      }
      
      // Check current storage usage
      let currentUsage = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const v = localStorage.getItem(k);
          if (v) {
            currentUsage += new Blob([v]).size;
          }
        }
      }
      const currentMB = currentUsage / (1024 * 1024);
      
      // If storage is over 60% full (3MB of typical 5MB), clean up proactively
      if (currentMB > 3) {
        console.warn(`[SecureStorage] Storage at ${currentMB.toFixed(2)}MB, cleaning up before save...`);
        await this.clearOldData();
        
        // If still too large after cleanup, do aggressive cleanup
        let newUsage = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            const v = localStorage.getItem(k);
            if (v) newUsage += new Blob([v]).size;
          }
        }
        const newMB = newUsage / (1024 * 1024);
        
        if (newMB > 3) {
          console.warn(`[SecureStorage] Still at ${newMB.toFixed(2)}MB after cleanup, doing aggressive cleanup...`);
          // Remove all non-essential keys
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && !k.includes('api') && !k.includes('config') && !k.includes('settings')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          console.log(`[SecureStorage] Aggressively removed ${keysToRemove.length} non-essential keys`);
        }
      }
      
      const trySetItem = async () => {
        try {
          if (this.isElectron && this.safeStorage) {
            // Use Electron's safeStorage
            try {
              const encrypted = await this.safeStorage.encryptString(serialized);
              localStorage.setItem(prefixedKey, encrypted);
            } catch (error: any) {
              // Fallback to localStorage if safeStorage fails
              console.warn('[SecureStorage] safeStorage failed, using localStorage:', error);
              this.setItemWithErrorHandling(prefixedKey, serialized);
            }
          } else if (this.options.forceEncryption && this.encryptionKey && serialized) {
            // Use basic encryption in browser (only if we have content to encrypt)
            const encrypted = this.encrypt(serialized, this.encryptionKey);
            this.setItemWithErrorHandling(prefixedKey, encrypted);
          } else {
            // Plain localStorage (not recommended for sensitive data)
            this.setItemWithErrorHandling(prefixedKey, serialized);
          }
        } catch (error: any) {
          // Log error details
          console.error('[SecureStorage] Error in trySetItem:', {
            error: error.message,
            name: error.name,
            code: error.code,
            key: prefixedKey,
            dataSize: new Blob([serialized]).size,
          });
          throw error;
        }
      };
      
      try {
        await trySetItem();
      } catch (error: any) {
        // Handle QuotaExceededError
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.warn('[SecureStorage] localStorage quota exceeded, clearing old data...');
          console.log('[SecureStorage] Before cleanup - Storage size:', this.getStorageSize());
          
          await this.clearOldData();
          
          console.log('[SecureStorage] After cleanup - Storage size:', this.getStorageSize());
          
          // Retry after clearing
          try {
            await trySetItem();
            console.log('[SecureStorage] Successfully saved after cleanup');
          } catch (retryError: any) {
            console.error('[SecureStorage] Retry failed after cleanup:', retryError);
            
            // If still failing, try to save minimal version
            if (key === 'gstudio_agent_config' && typeof value === 'object') {
              try {
                const minimal: any = {};
                if (value.apiKey) minimal.apiKey = value.apiKey;
                if (value.selectedModel) minimal.selectedModel = value.selectedModel;
                if (value.settings) minimal.settings = value.settings;
                const minimalSerialized = JSON.stringify(minimal);
                const minimalEncrypted = this.options.forceEncryption && this.encryptionKey
                  ? this.encrypt(minimalSerialized, this.encryptionKey)
                  : minimalSerialized;
                this.setItemWithErrorHandling(prefixedKey, minimalEncrypted);
                console.warn(`[SecureStorage] Saved minimal version of ${key} due to quota`);
                return; // Success with minimal data
              } catch (minimalError: any) {
                console.error('[SecureStorage] Even minimal save failed:', minimalError);
                // Even minimal save failed
              }
            }
            
            ErrorHandler.handle(retryError, 'SECURE_STORAGE', {
              code: ErrorCode.STATE_UPDATE_FAILED,
              context: { 
                operation: 'setItem', 
                key, 
                retry: true,
                error: retryError.message,
                storageSize: this.getStorageSize(),
              },
            });
            throw retryError;
          }
        } else {
          console.error('[SecureStorage] Non-quota error:', error);
          ErrorHandler.handle(error, 'SECURE_STORAGE', {
            code: ErrorCode.STATE_UPDATE_FAILED,
            context: { 
              operation: 'setItem', 
              key,
              error: error.message,
              storageSize: this.getStorageSize(),
            },
          });
          throw error;
        }
      }
    } catch (error: any) {
      console.error('[SecureStorage] Outer catch block:', error);
      ErrorHandler.handle(error, 'SECURE_STORAGE', {
        code: ErrorCode.STATE_UPDATE_FAILED,
        context: { 
          operation: 'setItem', 
          key,
          error: error.message,
          storageSize: this.getStorageSize(),
        },
      });
      throw error;
    }
  }

  /**
   * Retrieve item securely
   * 
   * @param key - Storage key
   * @returns Promise that resolves with the value, or null if not found
   */
  static async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const stored = localStorage.getItem(prefixedKey);
      
      if (!stored) {
        // Try unprefixed key for backward compatibility
        const unprefixed = localStorage.getItem(key);
        if (unprefixed) {
          try {
            return JSON.parse(unprefixed);
          } catch {
            return unprefixed as any;
          }
        }
        return null;
      }
      
      let decrypted: string;
      
      if (this.isElectron && this.safeStorage) {
        // Use Electron's safeStorage
        try {
          decrypted = await this.safeStorage.decryptString(stored);
        } catch (error) {
          // Might be unencrypted data, try parsing directly
          decrypted = stored;
        }
      } else if (this.options.forceEncryption && this.encryptionKey) {
        // Use basic decryption in browser
        try {
          decrypted = this.decrypt(stored, this.encryptionKey);
        } catch {
          // Might be unencrypted data
          decrypted = stored;
        }
      } else {
        decrypted = stored;
      }
      
      try {
        return JSON.parse(decrypted);
      } catch {
        // Not JSON, return as-is
        return decrypted as any;
      }
    } catch (error) {
      ErrorHandler.handle(error, 'SECURE_STORAGE', {
        code: ErrorCode.STATE_UPDATE_FAILED,
        context: { operation: 'getItem', key },
        silent: true, // Don't log missing keys
      });
      return null;
    }
  }

  /**
   * Remove item
   * 
   * @param key - Storage key
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);
      
      // Also remove unprefixed key for backward compatibility
      localStorage.removeItem(key);
    } catch (error) {
      ErrorHandler.handle(error, 'SECURE_STORAGE', {
        code: ErrorCode.STATE_UPDATE_FAILED,
        context: { operation: 'removeItem', key },
      });
      throw error;
    }
  }

  /**
   * Clear all secure storage items
   */
  static async clear(): Promise<void> {
    try {
      const prefix = this.options.keyPrefix || 'secure_';
      const keys = [];
      
      // Collect all keys that match our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      
      // Remove all matching keys
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'SECURE_STORAGE', {
        code: ErrorCode.STATE_UPDATE_FAILED,
        context: { operation: 'clear' },
      });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  static async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Get all keys
   */
  static async keys(): Promise<string[]> {
    const prefix = this.options.keyPrefix || 'secure_';
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    
    return keys;
  }

  /**
   * Migrate data from localStorage to secure storage
   */
  private static async migrateFromLocalStorage(): Promise<void> {
    const keysToMigrate = [
      'gstudio_agent_config',
      'gstudio_selected_model',
      'gstudio_token_usage',
      'saved_conversations',
    ];
    
    for (const key of keysToMigrate) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // Parse and re-store securely
          try {
            const parsed = JSON.parse(value);
            await this.setItem(key, parsed);
            
            // Remove old unencrypted version
            // (Keep for now for backward compatibility)
            // localStorage.removeItem(key);
          } catch {
            // Not JSON, store as-is
            await this.setItem(key, value);
          }
        }
      } catch (error) {
        console.warn(`[SecureStorage] Failed to migrate key: ${key}`, error);
      }
    }
  }

  /**
   * Generate encryption key for browser fallback
   */
  private static async generateEncryptionKey(): Promise<string> {
    // Use a combination of factors to generate a consistent key
    // Note: This is basic encryption, not cryptographically secure
    // For production, consider using Web Crypto API
    
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      new Date().getTimezoneOffset().toString(),
    ];
    
    const combined = factors.join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Basic XOR encryption (browser fallback)
   * Note: This is NOT cryptographically secure
   * It's better than plaintext but should not be relied upon for true security
   */
  private static encrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Basic XOR decryption (browser fallback)
   */
  private static decrypt(encrypted: string, key: string): string {
    try {
      const decoded = atob(encrypted); // Base64 decode
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      // Decryption failed, might be unencrypted data
      return encrypted;
    }
  }

  /**
   * Get prefixed key
   */
  private static getPrefixedKey(key: string): string {
    const prefix = this.options.keyPrefix || 'secure_';
    return `${prefix}${key}`;
  }

  /**
   * Set item with comprehensive error handling
   */
  private static setItemWithErrorHandling(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.error('[SecureStorage] QuotaExceededError when setting item:', {
          key,
          valueSize: new Blob([value]).size,
          storageSize: this.getStorageSize(),
        });
        throw error; // Re-throw to be handled by caller
      } else {
        console.error('[SecureStorage] Error setting item:', {
          key,
          error: error.message,
          name: error.name,
        });
        throw error;
      }
    }
  }

  /**
   * Get current storage size in MB
   */
  private static getStorageSize(): { sizeMB: number; itemCount: number; details: Array<{ key: string; sizeKB: number }> } {
    let totalSize = 0;
    const details: Array<{ key: string; sizeKB: number }> = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            totalSize += size;
            details.push({
              key,
              sizeKB: size / 1024,
            });
          }
        }
      }
    } catch (error) {
      console.error('[SecureStorage] Error calculating storage size:', error);
    }
    
    return {
      sizeMB: totalSize / (1024 * 1024),
      itemCount: localStorage.length,
      details: details.sort((a, b) => b.sizeKB - a.sizeKB), // Sort by size descending
    };
  }

  /**
   * Check if Electron safeStorage is available
   */
  static isSecureStorageAvailable(): boolean {
    return this.isElectron && !!this.safeStorage;
  }

  /**
   * Get storage info
   */
  static getStorageInfo(): {
    isElectron: boolean;
    hasSafeStorage: boolean;
    encryptionEnabled: boolean;
    itemCount: number;
  } {
    return {
      isElectron: this.isElectron,
      hasSafeStorage: !!this.safeStorage,
      encryptionEnabled: this.options.forceEncryption || false,
      itemCount: this.keys().then(keys => keys.length).catch(() => 0) as any,
    };
  }
}

/**
 * React hook for using secure storage
 */
export function useSecureStorage<T = any>(key: string, defaultValue: T) {
  const [value, setValue] = React.useState<T>(defaultValue);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    SecureStorage.getItem<T>(key).then(stored => {
      if (stored !== null) {
        setValue(stored);
      }
      setLoading(false);
    });
  }, [key]);

  const setStoredValue = React.useCallback(async (newValue: T) => {
    setValue(newValue);
    await SecureStorage.setItem(key, newValue);
  }, [key]);

  return [value, setStoredValue, loading] as const;
}

// Import React for the hook
import * as React from 'react';
