import { SecureStorage } from '@/services/secureStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SecureStorage', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    await SecureStorage.initialize({
      forceEncryption: true,
      migrateFromLocalStorage: false,
      keyPrefix: 'test_',
    });
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve string values', async () => {
      await SecureStorage.setItem('test_key', 'test_value');
      const value = await SecureStorage.getItem('test_key');

      expect(value).toBe('test_value');
    });

    it('should store and retrieve object values', async () => {
      const obj = { name: 'test', value: 123 };
      await SecureStorage.setItem('test_obj', obj);
      const retrieved = await SecureStorage.getItem('test_obj');

      expect(retrieved).toEqual(obj);
    });

    it('should store and retrieve array values', async () => {
      const arr = [1, 2, 3, 'test'];
      await SecureStorage.setItem('test_arr', arr);
      const retrieved = await SecureStorage.getItem('test_arr');

      expect(retrieved).toEqual(arr);
    });

    it('should return null for non-existent keys', async () => {
      const value = await SecureStorage.getItem('non_existent');
      expect(value).toBeNull();
    });

    it('should handle null values', async () => {
      await SecureStorage.setItem('test_null', null);
      const value = await SecureStorage.getItem('test_null');

      expect(value).toBeNull();
    });

    it('should handle undefined values', async () => {
      await SecureStorage.setItem('test_undefined', undefined);
      const value = await SecureStorage.getItem('test_undefined');

      expect(value).toBeNull();
    });

    it('should handle boolean values', async () => {
      await SecureStorage.setItem('test_bool', true);
      const value = await SecureStorage.getItem('test_bool');

      expect(value).toBe(true);
    });

    it('should handle number values', async () => {
      await SecureStorage.setItem('test_num', 42);
      const value = await SecureStorage.getItem('test_num');

      expect(value).toBe(42);
    });
  });

  describe('removeItem', () => {
    it('should remove items', async () => {
      await SecureStorage.setItem('test_key', 'test_value');
      expect(await SecureStorage.getItem('test_key')).toBe('test_value');

      await SecureStorage.removeItem('test_key');
      expect(await SecureStorage.getItem('test_key')).toBeNull();
    });

    it('should not throw on removing non-existent items', async () => {
      await expect(SecureStorage.removeItem('non_existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all secure storage items', async () => {
      await SecureStorage.setItem('key1', 'value1');
      await SecureStorage.setItem('key2', 'value2');
      await SecureStorage.setItem('key3', 'value3');

      await SecureStorage.clear();

      expect(await SecureStorage.getItem('key1')).toBeNull();
      expect(await SecureStorage.getItem('key2')).toBeNull();
      expect(await SecureStorage.getItem('key3')).toBeNull();
    });

    it('should only clear prefixed items', async () => {
      // Add non-prefixed item directly to localStorage
      localStorageMock.setItem('other_key', 'other_value');

      await SecureStorage.setItem('key1', 'value1');
      await SecureStorage.clear();

      expect(await SecureStorage.getItem('key1')).toBeNull();
      expect(localStorageMock.getItem('other_key')).toBe('other_value');
    });
  });

  describe('hasItem', () => {
    it('should return true for existing items', async () => {
      await SecureStorage.setItem('test_key', 'test_value');
      const exists = await SecureStorage.hasItem('test_key');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent items', async () => {
      const exists = await SecureStorage.hasItem('non_existent');
      expect(exists).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys', async () => {
      await SecureStorage.setItem('key1', 'value1');
      await SecureStorage.setItem('key2', 'value2');
      await SecureStorage.setItem('key3', 'value3');

      const keys = await SecureStorage.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });

    it('should return empty array when no items', async () => {
      const keys = await SecureStorage.keys();
      expect(keys).toEqual([]);
    });

    it('should only return prefixed keys', async () => {
      localStorageMock.setItem('other_key', 'other_value');
      await SecureStorage.setItem('key1', 'value1');

      const keys = await SecureStorage.keys();

      expect(keys).toContain('key1');
      expect(keys).not.toContain('other_key');
    });
  });

  describe('backward compatibility', () => {
    it('should read unprefixed localStorage items', async () => {
      // Simulate old localStorage data
      localStorageMock.setItem('old_key', JSON.stringify('old_value'));

      const value = await SecureStorage.getItem('old_key');
      expect(value).toBe('old_value');
    });

    it('should read unencrypted data', async () => {
      // Simulate unencrypted data
      localStorageMock.setItem('test_unencrypted', JSON.stringify({ data: 'test' }));

      const value = await SecureStorage.getItem('unencrypted');
      expect(value).toEqual({ data: 'test' });
    });
  });

  describe('migration', () => {
    it('should migrate from localStorage', async () => {
      // Add old localStorage data
      localStorageMock.setItem('gstudio_agent_config', JSON.stringify({ apiKey: 'test' }));
      localStorageMock.setItem('gstudio_selected_model', JSON.stringify('gemini-flash'));

      await SecureStorage.initialize({
        forceEncryption: true,
        migrateFromLocalStorage: true,
        keyPrefix: 'test_',
      });

      // Wait for migration
      await new Promise(resolve => setTimeout(resolve, 100));

      const config = await SecureStorage.getItem('gstudio_agent_config');
      const model = await SecureStorage.getItem('gstudio_selected_model');

      expect(config).toEqual({ apiKey: 'test' });
      expect(model).toBe('gemini-flash');
    });
  });

  describe('encryption', () => {
    it('should encrypt data in storage', async () => {
      await SecureStorage.setItem('secret', 'sensitive_data');

      // Check that raw localStorage doesn't contain plaintext
      const rawValue = localStorageMock.getItem('test_secret');
      expect(rawValue).toBeDefined();
      expect(rawValue).not.toContain('sensitive_data');
    });

    it('should decrypt data on retrieval', async () => {
      await SecureStorage.setItem('secret', 'sensitive_data');
      const value = await SecureStorage.getItem('secret');

      expect(value).toBe('sensitive_data');
    });
  });

  describe('storage info', () => {
    it('should provide storage info', () => {
      const info = SecureStorage.getStorageInfo();

      expect(info.isElectron).toBeDefined();
      expect(info.hasSafeStorage).toBeDefined();
      expect(info.encryptionEnabled).toBeDefined();
    });

    it('should detect non-Electron environment', () => {
      const info = SecureStorage.getStorageInfo();
      expect(info.isElectron).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      // Store invalid JSON
      localStorageMock.setItem('test_invalid', 'invalid json {');

      const value = await SecureStorage.getItem('invalid');
      // Should return the raw value if JSON parse fails
      expect(value).toBeDefined();
    });

    it('should handle storage quota exceeded', async () => {
      // Mock quota exceeded error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      await expect(SecureStorage.setItem('test', 'value')).rejects.toThrow();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('complex data structures', () => {
    it('should handle nested objects', async () => {
      const complex = {
        user: {
          name: 'Test',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        data: [1, 2, 3],
      };

      await SecureStorage.setItem('complex', complex);
      const retrieved = await SecureStorage.getItem('complex');

      expect(retrieved).toEqual(complex);
    });

    it('should handle arrays of objects', async () => {
      const arr = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      await SecureStorage.setItem('array', arr);
      const retrieved = await SecureStorage.getItem('array');

      expect(retrieved).toEqual(arr);
    });
  });
});
