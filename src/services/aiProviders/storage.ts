/**
 * Provider Storage Service
 * 
 * Manages persistence of provider configurations in localStorage.
 */

import { StoredProviders, ProviderConfig, CustomProviderConfig } from './types';

const STORAGE_KEY = 'gstudio_ai_providers';

export class ProviderStorage {
  /**
   * Load stored providers from localStorage
   */
  static load(): StoredProviders {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ProviderStorage] Failed to load providers:', error);
    }

    // Return default structure
    return {
      builtIn: {},
      custom: [],
      activeProvider: 'gemini',
      defaultProvider: 'gemini',
    };
  }

  /**
   * Save providers to localStorage
   */
  static save(providers: StoredProviders): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
      console.log('[ProviderStorage] Providers saved');
    } catch (error) {
      console.error('[ProviderStorage] Failed to save providers:', error);
    }
  }

  /**
   * Get active provider
   */
  static getActiveProvider(): string {
    const providers = this.load();
    return providers.activeProvider;
  }

  /**
   * Set active provider
   */
  static setActiveProvider(providerId: string): void {
    const providers = this.load();
    providers.activeProvider = providerId;
    this.save(providers);
  }

  /**
   * Get provider config by ID
   */
  static getProviderConfig(providerId: string): ProviderConfig | CustomProviderConfig | null {
    const providers = this.load();

    // Check built-in providers
    if (providers.builtIn[providerId as keyof typeof providers.builtIn]) {
      return providers.builtIn[providerId as keyof typeof providers.builtIn]!.config;
    }

    // Check custom providers
    const custom = providers.custom.find(p => p.id === providerId);
    return custom?.config || null;
  }

  /**
   * Save built-in provider config
   */
  static saveBuiltInProvider(
    providerId: 'gemini' | 'openai' | 'anthropic',
    config: ProviderConfig,
    enabled: boolean = true
  ): void {
    const providers = this.load();
    providers.builtIn[providerId] = { enabled, config };
    this.save(providers);
  }

  /**
   * Add custom provider
   */
  static addCustomProvider(config: CustomProviderConfig): void {
    const providers = this.load();
    
    // Check if provider with same ID exists
    const existingIndex = providers.custom.findIndex(p => p.id === config.id);
    
    const now = Date.now();
    const providerEntry = {
      id: config.id,
      name: config.name,
      enabled: true,
      config,
      createdAt: existingIndex >= 0 ? providers.custom[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      providers.custom[existingIndex] = providerEntry;
    } else {
      providers.custom.push(providerEntry);
    }

    this.save(providers);
  }

  /**
   * Remove custom provider
   */
  static removeCustomProvider(providerId: string): void {
    const providers = this.load();
    providers.custom = providers.custom.filter(p => p.id !== providerId);
    
    // If this was the active provider, switch to default
    if (providers.activeProvider === providerId) {
      providers.activeProvider = providers.defaultProvider;
    }
    
    this.save(providers);
  }

  /**
   * Toggle provider enabled state
   */
  static toggleProvider(providerId: string, enabled: boolean): void {
    const providers = this.load();

    // Check built-in providers
    if (providers.builtIn[providerId as keyof typeof providers.builtIn]) {
      providers.builtIn[providerId as keyof typeof providers.builtIn]!.enabled = enabled;
    } else {
      // Check custom providers
      const custom = providers.custom.find(p => p.id === providerId);
      if (custom) {
        custom.enabled = enabled;
      }
    }

    this.save(providers);
  }

  /**
   * Get all enabled providers
   */
  static getEnabledProviders(): string[] {
    const providers = this.load();
    const enabled: string[] = [];

    // Built-in providers
    Object.entries(providers.builtIn).forEach(([id, data]) => {
      if (data?.enabled) {
        enabled.push(id);
      }
    });

    // Custom providers
    providers.custom.forEach(p => {
      if (p.enabled) {
        enabled.push(p.id);
      }
    });

    return enabled;
  }

  /**
   * Clear all providers (reset to defaults)
   */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[ProviderStorage] Providers cleared');
  }
}
