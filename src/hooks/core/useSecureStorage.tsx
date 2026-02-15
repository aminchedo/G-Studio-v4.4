/**
 * useSecureStorage - Refactored from class SecureStorage
 *
 * Provides secure storage with encryption support
 * Uses Electron's safeStorage when available, falls back to encrypted localStorage
 */

import { useState, useCallback, useEffect, useRef } from "react";

// Types
export interface SecureStorageOptions {
  forceEncryption?: boolean;
  migrateFromLocalStorage?: boolean;
  keyPrefix?: string;
}

export interface StorageInfo {
  isElectron: boolean;
  hasSafeStorage: boolean;
  encryptionEnabled: boolean;
  itemCount: number;
  sizeMB: number;
}

export interface UseSecureStorageReturn<T> {
  value: T;
  setValue: (newValue: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  remove: () => Promise<void>;
}

// Detect Electron environment
const isElectron = typeof window !== "undefined" && !!(window as any).electron;
const safeStorage = isElectron ? (window as any).electron?.safeStorage : null;

// Default options
const DEFAULT_OPTIONS: Required<SecureStorageOptions> = {
  forceEncryption: true,
  migrateFromLocalStorage: false,
  keyPrefix: "secure_",
};

// Runtime options (can be updated via initialize)
let GLOBAL_OPTIONS: Required<SecureStorageOptions> = { ...DEFAULT_OPTIONS };

// Encryption utilities (for browser fallback)
const generateEncryptionKey = (): string => {
  if (typeof navigator === "undefined") return "default-key";

  const factors = [
    navigator.userAgent,
    navigator.language,
    typeof screen !== "undefined" ? screen.width.toString() : "0",
    typeof screen !== "undefined" ? screen.height.toString() : "0",
    new Date().getTimezoneOffset().toString(),
  ];

  const combined = factors.join("|");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
};

const encrypt = (text: string, key: string): string => {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
};

const decrypt = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return encrypted;
  }
};

// Cached encryption key
let encryptionKey: string | null = null;

const getEncryptionKey = (): string => {
  if (!encryptionKey) {
    encryptionKey = generateEncryptionKey();
  }
  return encryptionKey;
};

/**
 * Core storage operations (can be used outside React)
 */
export const secureStorageOperations = {
  setItem: async <T,>(
    key: string,
    value: T,
    options: SecureStorageOptions = {},
  ): Promise<void> => {
    const finalOptions = { ...GLOBAL_OPTIONS, ...options };
    const prefixedKey = `${finalOptions.keyPrefix}${key}`;

    try {
      // Normalize undefined to null for backward compatibility
      let serialized = JSON.stringify(value === undefined ? null : value);

      // Use Electron safeStorage if available
      if (isElectron && safeStorage?.encryptString) {
        const encrypted = safeStorage.encryptString(serialized);
        localStorage.setItem(prefixedKey, encrypted);
        return;
      }

      // Browser fallback with encryption
      if (finalOptions.forceEncryption) {
        serialized = encrypt(serialized, getEncryptionKey());
      }

      localStorage.setItem(prefixedKey, serialized);
    } catch (error: any) {
      // Handle quota exceeded
      if (error.name === "QuotaExceededError" || error.code === 22) {
        console.warn(
          "[SecureStorage] Storage quota exceeded, attempting cleanup...",
        );
        await secureStorageOperations.cleanup(options);

        // Retry once
        const serialized = JSON.stringify(value);
        const data = finalOptions.forceEncryption
          ? encrypt(serialized, getEncryptionKey())
          : serialized;
        localStorage.setItem(`${finalOptions.keyPrefix}${key}`, data);
      } else {
        throw error;
      }
    }
  },

  getItem: async <T,>(
    key: string,
    options: SecureStorageOptions = {},
  ): Promise<T | null> => {
    const finalOptions = { ...GLOBAL_OPTIONS, ...options };
    const prefixedKey = `${finalOptions.keyPrefix}${key}`;

    try {
      const stored = localStorage.getItem(prefixedKey);
      if (!stored) {
        // Fallback: check unprefixed key for backward compatibility
        const unpref = localStorage.getItem(key);
        if (unpref) {
          try {
            return JSON.parse(unpref);
          } catch {
            return (unpref as any) || null;
          }
        }
        return null;
      }

      // Try Electron safeStorage decryption
      if (isElectron && safeStorage?.decryptString) {
        try {
          const decrypted = safeStorage.decryptString(stored);
          return JSON.parse(decrypted);
        } catch {
          // Fall through to browser decryption
        }
      }

      // Browser decryption
      if (finalOptions.forceEncryption) {
        const decrypted = decrypt(stored, getEncryptionKey());
        return JSON.parse(decrypted);
      }

      return JSON.parse(stored);
    } catch {
      // Try parsing as plain JSON (for backward compatibility)
      try {
        const stored = localStorage.getItem(prefixedKey);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
  },

  removeItem: async (
    key: string,
    options: SecureStorageOptions = {},
  ): Promise<void> => {
    const finalOptions = { ...GLOBAL_OPTIONS, ...options };
    localStorage.removeItem(`${finalOptions.keyPrefix}${key}`);
  },

  hasItem: async (
    key: string,
    options: SecureStorageOptions = {},
  ): Promise<boolean> => {
    const value = await secureStorageOperations.getItem(key, options);
    return value !== null;
  },

  keys: async (options: SecureStorageOptions = {}): Promise<string[]> => {
    const finalOptions = { ...GLOBAL_OPTIONS, ...options };
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(finalOptions.keyPrefix)) {
        keys.push(key.substring(finalOptions.keyPrefix.length));
      }
    }

    return keys;
  },

  cleanup: async (options: SecureStorageOptions = {}): Promise<number> => {
    const essentialKeys = ["gstudio_agent_config", "api_key", "gemini_api_key"];
    let removedCount = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !essentialKeys.some((essential) => key.includes(essential))) {
        localStorage.removeItem(key);
        removedCount++;
      }
    }

    return removedCount;
  },

  getStorageInfo: (): StorageInfo => {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) totalSize += new Blob([value]).size;
      }
    }

    return {
      isElectron,
      hasSafeStorage: !!safeStorage,
      encryptionEnabled: true,
      itemCount: localStorage.length,
      sizeMB: totalSize / (1024 * 1024),
    };
  },

  clear: async (options: SecureStorageOptions = {}): Promise<void> => {
    const finalOptions = { ...GLOBAL_OPTIONS, ...options };
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(finalOptions.keyPrefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },
};

/**
 * React hook for secure storage
 */
export function useSecureStorage<T>(
  key: string,
  defaultValue: T,
  options: SecureStorageOptions = {},
): UseSecureStorageReturn<T> {
  const [value, setValueState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Load initial value
  useEffect(() => {
    mountedRef.current = true;

    const loadValue = async () => {
      try {
        const stored = await secureStorageOperations.getItem<T>(key, options);
        if (mountedRef.current) {
          setValueState(stored ?? defaultValue);
          setIsLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      mountedRef.current = false;
    };
  }, [key]);

  // Set value
  const setValue = useCallback(
    async (newValue: T): Promise<void> => {
      try {
        setError(null);
        await secureStorageOperations.setItem(key, newValue, options);
        if (mountedRef.current) {
          setValueState(newValue);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
    },
    [key, options],
  );

  // Remove value
  const remove = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await secureStorageOperations.removeItem(key, options);
      if (mountedRef.current) {
        setValueState(defaultValue);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    }
  }, [key, defaultValue, options]);

  return {
    value,
    setValue,
    isLoading,
    error,
    remove,
  };
}

/**
 * Hook for storage info and management
 */
export function useSecureStorageManager() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const refresh = useCallback(() => {
    setInfo(secureStorageOperations.getStorageInfo());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cleanup = useCallback(async (): Promise<number> => {
    setIsCleaningUp(true);
    try {
      const count = await secureStorageOperations.cleanup();
      refresh();
      return count;
    } finally {
      setIsCleaningUp(false);
    }
  }, [refresh]);

  const clear = useCallback(async (): Promise<void> => {
    await secureStorageOperations.clear();
    refresh();
  }, [refresh]);

  return {
    info,
    isCleaningUp,
    refresh,
    cleanup,
    clear,
  };
}

// Backward compatibility - export class-like interface
export const SecureStorage = {
  initialize: async (options: SecureStorageOptions = {}): Promise<void> => {
    // Apply provided options as global defaults for subsequent operations
    GLOBAL_OPTIONS = { ...GLOBAL_OPTIONS, ...options };

    if (options.migrateFromLocalStorage) {
      const keysToMigrate = ["gstudio_agent_config", "gstudio_selected_model"];
      for (const key of keysToMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            // Store migrated data under the current global prefix for compatibility
            await secureStorageOperations.setItem(key, parsed, {
              ...options,
              keyPrefix: GLOBAL_OPTIONS.keyPrefix,
            });
          } catch {
            // Skip invalid data
          }
        }
      }
    }
  },
  setItem: secureStorageOperations.setItem,
  getItem: secureStorageOperations.getItem,
  removeItem: secureStorageOperations.removeItem,
  hasItem: secureStorageOperations.hasItem,
  keys: secureStorageOperations.keys,
  clear: secureStorageOperations.clear,
  getStorageInfo: secureStorageOperations.getStorageInfo,
  isSecureStorageAvailable: () => isElectron && !!safeStorage,
};

export default useSecureStorage;
