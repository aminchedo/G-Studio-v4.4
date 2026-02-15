/**
 * OpenAI Provider Implementation
 * 
 * Provider implementation for OpenAI API.
 * Supports GPT models and other OpenAI models.
 */

import { BaseProvider } from './base';
import {
  ChatCompletionOptions,
  ChatCompletion,
  StreamChunk,
  ProviderConfig,
  ProviderCapabilities,
  ProviderError,
  ProviderErrorType
} from './types';

export class OpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig, providerName: string = 'openai') {
    super(config, providerName);
  }

  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion> {
    const endpoint = this.config.baseUrl.endsWith('/chat/completions')
      ? this.config.baseUrl
      : `${this.config.baseUrl}/chat/completions`;

    const requestBody: any = {
      model: options.model || this.config.model,
      messages: options.messages,
      stream: false,
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      top_p: options.topP,
      stop: options.stop,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleError(response.status, await response.text());
      }

      return await response.json();
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
    const endpoint = this.config.baseUrl.endsWith('/chat/completions')
      ? this.config.baseUrl
      : `${this.config.baseUrl}/chat/completions`;

    const requestBody: any = {
      model: options.model || this.config.model,
      messages: options.messages,
      stream: true,
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      top_p: options.topP,
      stop: options.stop,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleError(response.status, await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

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
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              yield {
                id: data.id,
                model: data.model,
                created: data.created,
                content: data.choices?.[0]?.delta?.content,
                finishReason: data.choices?.[0]?.finish_reason,
                delta: data.choices?.[0]?.delta,
              };
            } catch (error) {
              console.error('[OpenAI] Error parsing chunk:', error);
            }
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

  async countTokens(text: string): Promise<number> {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  validateConfig(config: ProviderConfig): boolean {
    return !!(config.apiKey && config.baseUrl && config.model);
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini'
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsJSON: true,
      maxTokens: 16384,
      supportedModels: this.getSupportedModels(),
      contextWindow: 128000,
    };
  }
}
