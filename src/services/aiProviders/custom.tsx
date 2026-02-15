/**
 * Custom Provider Implementation
 * 
 * Allows users to add custom AI providers with OpenAI-compatible APIs.
 * Supports flexible authentication and request/response transformation.
 */

import { BaseProvider } from './base';
import {
  CustomProviderConfig,
  ChatCompletionOptions,
  ChatCompletion,
  StreamChunk,
  ProviderCapabilities,
  ProviderError,
  ProviderErrorType
} from './types';

export class CustomProvider extends BaseProvider {
  private customConfig: CustomProviderConfig;

  constructor(config: CustomProviderConfig, providerName: string) {
    super(config, providerName);
    this.customConfig = config;
  }

  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion> {
    const requestBody = this.transformRequest(options);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw this.handleError(response.status, await response.text());
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        error.message || 'Request failed',
        ProviderErrorType.NETWORK,
        undefined,
        this.providerName
      );
    }
  }

  async *streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const requestBody = this.transformRequest({ ...options, stream: true });
    
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw this.handleError(response.status, await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            yield this.transformStreamChunk(parsed);
          } catch (e) {
            console.error('[CustomProvider] Failed to parse stream chunk:', e);
          }
        }
      }
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        error.message || 'Stream failed',
        ProviderErrorType.NETWORK,
        undefined,
        this.providerName
      );
    }
  }

  private transformRequest(options: ChatCompletionOptions): any {
    if (this.customConfig.transformRequest) {
      return this.customConfig.transformRequest(options);
    }

    // Default: OpenAI format
    return {
      model: options.model || this.config.model,
      messages: options.messages,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      top_p: options.topP,
      stream: options.stream ?? false,
      stop: options.stop,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };
  }

  private transformResponse(response: any): ChatCompletion {
    if (this.customConfig.transformResponse) {
      return this.customConfig.transformResponse(response);
    }

    // Default: OpenAI format
    return response as ChatCompletion;
  }

  private transformStreamChunk(chunk: any): StreamChunk {
    if (this.customConfig.transformStreamChunk) {
      return this.customConfig.transformStreamChunk(chunk);
    }

    // Default: OpenAI format
    return {
      id: chunk.id,
      model: chunk.model,
      created: chunk.created,
      content: chunk.choices?.[0]?.delta?.content,
      finishReason: chunk.choices?.[0]?.finish_reason,
      delta: chunk.choices?.[0]?.delta,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.customConfig.customHeaders,
    };

    switch (this.customConfig.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'api-key':
        headers['X-API-Key'] = this.config.apiKey;
        break;
      case 'basic':
        const encoded = btoa(`api:${this.config.apiKey}`);
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      case 'custom':
        // Custom headers already added above
        break;
      case 'none':
        // No authentication
        break;
    }

    return headers;
  }

  private handleError(status: number, body: string): ProviderError {
    let type: ProviderErrorType;
    let message: string;

    if (status === 401 || status === 403) {
      type = ProviderErrorType.AUTHENTICATION;
      message = 'Authentication failed. Check API key.';
    } else if (status === 429) {
      type = ProviderErrorType.RATE_LIMIT;
      message = 'Rate limit exceeded.';
    } else if (status >= 500) {
      type = ProviderErrorType.SERVER_ERROR;
      message = 'Server error.';
    } else if (status === 400) {
      type = ProviderErrorType.INVALID_REQUEST;
      message = 'Invalid request.';
    } else {
      type = ProviderErrorType.UNKNOWN;
      message = `Request failed with status ${status}`;
    }

    return new ProviderError(message, type, status, this.providerName);
  }

  validateConfig(config: any): boolean {
    return !!(config.baseUrl && config.apiKey);
  }

  getSupportedModels(): string[] {
    return this.customConfig.models || [];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: false,
      supportsVision: false,
      supportsJSON: false,
      maxTokens: this.config.maxTokens || 4096,
      supportedModels: this.getSupportedModels(),
      contextWindow: this.config.maxTokens || 4096,
    };
  }

  async countTokens(text: string): Promise<number> {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
