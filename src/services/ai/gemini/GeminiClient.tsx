import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { 
  GeminiConfig, 
  GeminiRequest, 
  GeminiResponse, 
  IGeminiClient,
  GeminiError as GeminiErrorType 
} from './types';
import { GeminiError } from './types';
import { RetryPolicy } from './RetryPolicy';
import { CircuitBreaker } from './CircuitBreaker';
import { CacheManager, generateCacheKey } from './CacheManager';
import type { AIStreamChunk, TokenUsage } from '@/types/ai';

export class GeminiClient implements IGeminiClient {
  private client: GoogleGenerativeAI;
  private retryPolicy: RetryPolicy;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager<GeminiResponse>;

  constructor(private config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    
    this.retryPolicy = new RetryPolicy(
      config.retryConfig || {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: ['RATE_LIMIT_EXCEEDED', 'INTERNAL', 'UNAVAILABLE'],
      }
    );

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
    });

    this.cache = new CacheManager<GeminiResponse>({
      ttl: 300000, // 5 minutes
      maxSize: 100,
    });
  }

  async sendRequest(request: GeminiRequest): Promise<GeminiResponse> {
    // Check cache first (if not streaming)
    if (!request.stream) {
      const cacheKey = generateCacheKey(request as unknown as Record<string, unknown>);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    // Execute with circuit breaker and retry policy
    const response = await this.circuitBreaker.execute(async () => {
      return await this.retryPolicy.execute(async () => {
        return await this.executeRequest(request);
      });
    });

    // Cache successful responses (if not streaming)
    if (!request.stream) {
      const cacheKey = generateCacheKey(request as unknown as Record<string, unknown>);
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  async sendStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<void> {
    await this.circuitBreaker.execute(async () => {
      await this.retryPolicy.execute(async () => {
        await this.executeStreamRequest(request, onChunk);
      });
    });
  }

  async getModels(): Promise<string[]> {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.defaultModel });
      // For now, return a list of known models
      // The API doesn't provide a list endpoint yet
      return [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
      ];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async executeRequest(request: GeminiRequest): Promise<GeminiResponse> {
    const startTime = Date.now();

    try {
      const model = this.getModel(request.model);
      
      const generationConfig = {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
        topK: request.topK,
      };

      const chat = model.startChat({
        history: request.messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig,
        systemInstruction: request.systemInstruction,
      });

      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage) {
        throw new GeminiError('No messages provided', 'INVALID_REQUEST', 400, false);
      }

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      
      const text = response.text();
      const usage = this.extractUsage(response);
      
      return {
        id: crypto.randomUUID(),
        model: request.model,
        content: text,
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
        usage,
        metadata: {
          latency: Date.now() - startTime,
          retryCount: this.retryPolicy.getAttempts(),
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async executeStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<void> {
    try {
      const model = this.getModel(request.model);
      
      const generationConfig = {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
        topK: request.topK,
      };

      const chat = model.startChat({
        history: request.messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig,
        systemInstruction: request.systemInstruction,
      });

      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage) {
        throw new GeminiError('No messages provided', 'INVALID_REQUEST', 400, false);
      }

      const result = await chat.sendMessageStream(lastMessage.content);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        
        onChunk({
          id: crypto.randomUUID(),
          delta: text,
          done: false,
        });
      }

      // Send final chunk
      onChunk({
        id: crypto.randomUUID(),
        delta: '',
        done: true,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private getModel(modelName: string): GenerativeModel {
    return this.client.getGenerativeModel({ model: modelName });
  }

  private extractUsage(response: unknown): TokenUsage {
    // Gemini API doesn't always provide usage info
    // Estimate based on response
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  private mapFinishReason(reason: string | undefined): GeminiResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'safety';
      default:
        return 'stop';
    }
  }

  private handleError(error: unknown): GeminiErrorType {
    if (error instanceof GeminiError) {
      return error;
    }

    if (error instanceof Error) {
      // Determine if error is retryable
      const retryable = this.config.retryConfig?.retryableErrors.some(code =>
        error.message.includes(code)
      ) || false;

      return new GeminiError(
        error.message,
        'UNKNOWN_ERROR',
        undefined,
        retryable,
        { originalError: error }
      );
    }

    return new GeminiError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      undefined,
      false,
      { error }
    );
  }

  getStats() {
    return {
      cache: this.cache.getStats(),
      circuitBreaker: this.circuitBreaker.getStats(),
      retryAttempts: this.retryPolicy.getAttempts(),
    };
  }
}
