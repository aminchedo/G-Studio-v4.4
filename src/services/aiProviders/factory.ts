/**
 * Provider Factory Module
 * 
 * Factory pattern implementation for creating AI provider instances.
 * Manages provider registration and instantiation.
 */

import { BaseProvider } from './base';
import { ProviderConfig, ProviderConstructor } from './types';

/**
 * ProviderFactory class
 * 
 * Manages the creation and registration of AI provider instances.
 * Uses the factory pattern to abstract provider instantiation.
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<string, ProviderConstructor> = new Map();

  private constructor() {
    console.log('[ProviderFactory] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Register a provider
   */
  registerProvider(name: string, providerClass: ProviderConstructor): void {
    if (this.providers.has(name)) {
      console.warn(`[ProviderFactory] Provider '${name}' is already registered. Overwriting.`);
    }
    
    this.providers.set(name, providerClass);
    console.log(`[ProviderFactory] Registered provider: ${name}`);
  }

  /**
   * Create a provider instance
   */
  createProvider(providerName: string, config: ProviderConfig): BaseProvider {
    const ProviderClass = this.providers.get(providerName);
    
    if (!ProviderClass) {
      const available = this.getAvailableProviders();
      throw new Error(
        `Provider '${providerName}' is not registered. ` +
        `Available providers: ${available.join(', ')}`
      );
    }

    try {
      const provider = new ProviderClass(config, providerName);
      
      if (!provider.validateConfig(config)) {
        throw new Error(`Invalid configuration for provider: ${providerName}`);
      }
      
      console.log(`[ProviderFactory] Created provider: ${providerName}`);
      return provider;
      
    } catch (error) {
      console.error(`[ProviderFactory] Failed to create provider '${providerName}':`, error);
      throw error;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is registered
   */
  isProviderRegistered(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerName: string): boolean {
    if (this.providers.has(providerName)) {
      this.providers.delete(providerName);
      console.log(`[ProviderFactory] Unregistered provider: ${providerName}`);
      return true;
    }
    return false;
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }
}

/**
 * Get the singleton factory instance
 */
export function getProviderFactory(): ProviderFactory {
  return ProviderFactory.getInstance();
}
