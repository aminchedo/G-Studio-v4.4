/**
 * Base Provider Abstract Class
 * 
 * Defines the interface that all AI providers must implement.
 * Provides a consistent API for different AI service providers.
 */

import { 
  ChatCompletionOptions, 
  ChatCompletion, 
  StreamChunk, 
  ProviderConfig,
  ProviderCapabilities
} from './types';

/**
 * BaseProvider abstract class
 * 
 * All provider implementations must extend this class and implement
 * its abstract methods. This ensures a consistent interface across
 * all AI providers.
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected providerName: string;

  constructor(config: ProviderConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
  }

  /**
   * Create a chat completion (non-streaming)
   */
  abstract createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion>;

  /**
   * Stream a chat completion
   */
  abstract streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamChunk>;

  /**
   * Count tokens in text
   */
  abstract countTokens(text: string): Promise<number>;

  /**
   * Validate provider configuration
   */
  abstract validateConfig(config: ProviderConfig): boolean;

  /**
   * Get supported models
   */
  abstract getSupportedModels(): string[];

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    const newConfig = { ...this.config, ...config };
    
    if (!this.validateConfig(newConfig)) {
      throw new Error(`Invalid configuration for provider: ${this.providerName}`);
    }
    
    this.config = newConfig;
    console.log(`[${this.providerName}] Configuration updated`);
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.countTokens('test');
      return true;
    } catch (error) {
      console.error(`[${this.providerName}] Connection test failed:`, error);
      return false;
    }
  }
}
