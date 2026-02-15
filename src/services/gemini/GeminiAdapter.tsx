/**
 * Gemini Adapter - Main Service
 * 
 * ✅ Combines all modules into a cohesive service
 * ✅ Simple, clean API
 * ✅ Handles all complexity internally
 */

import { GeminiClient } from './GeminiClient';
import { ModelManager } from './ModelManager';
import { RetryPolicy, DEFAULT_RETRY_CONFIG } from './RetryPolicy';
import {
  GeminiConfig,
  GeminiRequest,
  GeminiResponse,
  GeminiStreamChunk,
  ModelSelectionCriteria,
  ModelInfo,
} from './types';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  defaultModel: 'gemini-2.0-flash-exp',
  timeout: 30000,
  retryConfig: DEFAULT_RETRY_CONFIG,
};

/**
 * Main Gemini Service Adapter
 */
export class GeminiAdapter {
  private client: GeminiClient;
  private modelManager: ModelManager;
  private retryPolicy: RetryPolicy;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    // Merge with defaults
    this.config = { ...DEFAULT_CONFIG, ...config } as GeminiConfig;

    // Initialize modules
    this.client = new GeminiClient(this.config);
    this.modelManager = new ModelManager(this.config.defaultModel);
    this.retryPolicy = new RetryPolicy(
      this.config.retryConfig || DEFAULT_RETRY_CONFIG
    );
  }

  // ==================== BASIC METHODS ====================

  /**
   * Generate text from a prompt
   */
  async generateText(
    prompt: string,
    options?: Partial<GeminiRequest>
  ): Promise<GeminiResponse> {
    const request: GeminiRequest = {
      model: this.modelManager.getCurrentModel().id,
      prompt,
      ...options,
    };

    return await this.retryPolicy.execute(() =>
      this.client.sendRequest(request)
    );
  }

  /**
   * Generate text with streaming
   */
  async generateTextStream(
    prompt: string,
    onChunk: (text: string) => void,
    options?: Partial<GeminiRequest>
  ): Promise<void> {
    const request: GeminiRequest = {
      model: this.modelManager.getCurrentModel().id,
      prompt,
      stream: true,
      ...options,
    };

    await this.retryPolicy.execute(() =>
      this.client.sendStreamRequest(request, (chunk: GeminiStreamChunk) => {
        if (!chunk.done && chunk.text) {
          onChunk(chunk.text);
        }
      })
    );
  }

  // ==================== ADVANCED METHODS ====================

  /**
   * Generate with automatic model selection
   */
  async generateWithAutoModel(
    prompt: string,
    criteria: ModelSelectionCriteria,
    options?: Partial<GeminiRequest>
  ): Promise<GeminiResponse> {
    // Select best model
    const model = this.modelManager.selectBestModel(criteria);
    
    const request: GeminiRequest = {
      model: model.id,
      prompt,
      ...options,
    };

    try {
      return await this.retryPolicy.execute(() =>
        this.client.sendRequest(request)
      );
    } catch (error) {
      // Try fallback models
      const fallbacks = this.modelManager.getFallbackChain(model.id);
      
      for (const fallbackModel of fallbacks) {
        try {
          console.log(`Trying fallback model: ${fallbackModel.displayName}`);
          
          const fallbackRequest: GeminiRequest = {
            ...request,
            model: fallbackModel.id,
          };
          
          return await this.client.sendRequest(fallbackRequest);
        } catch (fallbackError) {
          console.error(`Fallback ${fallbackModel.id} failed:`, fallbackError);
          continue;
        }
      }
      
      // All fallbacks failed
      throw error;
    }
  }

  /**
   * Generate code with optimized settings
   */
  async generateCode(
    prompt: string,
    language?: string
  ): Promise<GeminiResponse> {
    const systemInstruction = language
      ? `You are an expert ${language} programmer. Generate clean, efficient, well-documented code.`
      : 'You are an expert programmer. Generate clean, efficient, well-documented code.';

    return await this.generateText(prompt, {
      systemInstruction,
      temperature: 0.2, // Lower temperature for more deterministic code
      maxTokens: 4096,
    });
  }

  /**
   * Generate with conversation history
   */
  async continueConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    newMessage: string,
    options?: Partial<GeminiRequest>
  ): Promise<GeminiResponse> {
    // Build conversation context
    const context = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `${context}\n\nUser: ${newMessage}\n\nAssistant:`;

    return await this.generateText(prompt, options);
  }

  // ==================== MODEL MANAGEMENT ====================

  /**
   * Get current model
   */
  getCurrentModel(): ModelInfo {
    return this.modelManager.getCurrentModel();
  }

  /**
   * Set current model
   */
  setCurrentModel(modelId: string): void {
    this.modelManager.setCurrentModel(modelId);
  }

  /**
   * Get all available models
   */
  getAllModels(): ModelInfo[] {
    return this.modelManager.getAllModels();
  }

  /**
   * Select best model for criteria
   */
  selectBestModel(criteria: ModelSelectionCriteria): ModelInfo {
    return this.modelManager.selectBestModel(criteria);
  }

  /**
   * Get model manager instance
   */
  getModelManager(): ModelManager {
    return this.modelManager;
  }

  // ==================== UTILITIES ====================

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    modelId: string,
    inputText: string,
    estimatedOutputTokens: number
  ): number {
    const inputTokens = this.estimateTokens(inputText);
    return this.modelManager.estimateCost(
      modelId,
      inputTokens,
      estimatedOutputTokens
    );
  }

  /**
   * Get configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<GeminiConfig['retryConfig']>): void {
    this.config.retryConfig = { ...this.config.retryConfig!, ...config };
    this.retryPolicy.updateConfig(config);
  }
}

/**
 * Create a new Gemini adapter instance
 */
export function createGeminiAdapter(apiKey: string, config?: Partial<GeminiConfig>): GeminiAdapter {
  return new GeminiAdapter({
    apiKey,
    ...config,
  } as GeminiConfig);
}

/**
 * Example usage:
 * 
 * // Basic usage
 * const gemini = createGeminiAdapter('your-api-key');
 * 
 * const response = await gemini.generateText('Hello, world!');
 * console.log(response.text);
 * 
 * // Streaming
 * await gemini.generateTextStream(
 *   'Write a story',
 *   (chunk) => console.log(chunk)
 * );
 * 
 * // Auto model selection
 * const response = await gemini.generateWithAutoModel(
 *   'Analyze this image',
 *   { capabilities: ['vision'], maxBudget: 0.01 }
 * );
 * 
 * // Code generation
 * const code = await gemini.generateCode(
 *   'Create a React button component',
 *   'typescript'
 * );
 * 
 * // Conversation
 * const reply = await gemini.continueConversation(
 *   [
 *     { role: 'user', content: 'What is React?' },
 *     { role: 'assistant', content: 'React is a JavaScript library...' }
 *   ],
 *   'Tell me more about hooks'
 * );
 */
