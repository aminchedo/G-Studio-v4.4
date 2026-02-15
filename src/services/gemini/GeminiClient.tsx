/**
 * Gemini Client - Core HTTP Communication
 * 
 * ✅ Handles all HTTP communication with Gemini API
 * ✅ Streaming support
 * ✅ Error handling
 * ✅ Request/response transformation
 */

import {
  GeminiConfig,
  GeminiRequest,
  GeminiResponse,
  GeminiStreamChunk,
  IGeminiClient,
  GeminiError,
  GeminiErrorCode,
  TokenUsage,
  FinishReason,
} from './types';

export class GeminiClient implements IGeminiClient {
  private readonly config: GeminiConfig;
  private readonly baseUrl: string;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Send a request to Gemini API
   */
  async sendRequest(request: GeminiRequest): Promise<GeminiResponse> {
    const url = this.buildUrl(request.model, 'generateContent');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.formatRequest(request)),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      const data = await response.json();
      return this.parseResponse(data, request.model);
      
    } catch (error: any) {
      if (error instanceof GeminiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new GeminiError(
          'Request timeout',
          GeminiErrorCode.TIMEOUT
        );
      }
      
      throw new GeminiError(
        'Network error',
        GeminiErrorCode.NETWORK_ERROR,
        undefined,
        error
      );
    }
  }

  /**
   * Send a streaming request to Gemini API
   */
  async sendStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: GeminiStreamChunk) => void
  ): Promise<void> {
    const url = this.buildUrl(request.model, 'streamGenerateContent');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.formatRequest(request)),
      });

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      await this.processStream(response, onChunk);
      
    } catch (error: any) {
      if (error instanceof GeminiError) {
        throw error;
      }
      
      throw new GeminiError(
        'Stream error',
        GeminiErrorCode.NETWORK_ERROR,
        undefined,
        error
      );
    }
  }

  /**
   * Build API URL
   */
  private buildUrl(model: string, endpoint: string): string {
    return `${this.baseUrl}/models/${model}:${endpoint}`;
  }

  /**
   * Build request headers
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.config.apiKey,
    };
  }

  /**
   * Format request for Gemini API
   */
  private formatRequest(request: GeminiRequest): any {
    const body: any = {
      contents: [
        {
          parts: [{ text: request.prompt }],
          role: 'user',
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
        topP: request.topP ?? 0.95,
        topK: request.topK ?? 40,
      },
    };

    if (request.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: request.systemInstruction }],
      };
    }

    if (request.stopSequences && request.stopSequences.length > 0) {
      body.generationConfig.stopSequences = request.stopSequences;
    }

    return body;
  }

  /**
   * Parse API response
   */
  private parseResponse(data: any, model: string): GeminiResponse {
    const candidate = data.candidates?.[0];
    
    if (!candidate) {
      throw new GeminiError(
        'No candidate in response',
        GeminiErrorCode.INVALID_REQUEST,
        undefined,
        data
      );
    }

    const content = candidate.content?.parts?.[0];
    if (!content || !content.text) {
      throw new GeminiError(
        'No text in response',
        GeminiErrorCode.INVALID_REQUEST,
        undefined,
        data
      );
    }

    return {
      text: content.text,
      model: data.modelVersion || model,
      usage: this.parseUsage(data.usageMetadata),
      finishReason: this.parseFinishReason(candidate.finishReason),
      safetyRatings: candidate.safetyRatings,
    };
  }

  /**
   * Parse token usage
   */
  private parseUsage(metadata: any): TokenUsage {
    return {
      promptTokens: metadata?.promptTokenCount || 0,
      completionTokens: metadata?.candidatesTokenCount || 0,
      totalTokens: metadata?.totalTokenCount || 0,
    };
  }

  /**
   * Parse finish reason
   */
  private parseFinishReason(reason?: string): FinishReason {
    if (!reason) return 'stop';
    
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('stop')) return 'stop';
    if (lowerReason.includes('length') || lowerReason.includes('max_tokens')) return 'length';
    if (lowerReason.includes('safety')) return 'safety';
    
    return 'other';
  }

  /**
   * Process streaming response
   */
  private async processStream(
    response: Response,
    onChunk: (chunk: GeminiStreamChunk) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new GeminiError(
        'No response body',
        GeminiErrorCode.NETWORK_ERROR
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Send final chunk
          onChunk({ text: '', done: true });
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || !trimmed.startsWith('data: ')) {
            continue;
          }

          try {
            const jsonStr = trimmed.slice(6); // Remove 'data: '
            const data = JSON.parse(jsonStr);
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (text) {
              onChunk({ text, done: false });
            }
          } catch (err) {
            console.warn('Failed to parse stream chunk:', trimmed);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle HTTP errors
   */
  private async handleHttpError(response: Response): Promise<GeminiError> {
    const status = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const message = errorData.error?.message || errorData.message || 'Unknown error';

    // Map status codes to error codes
    if (status === 400) {
      return new GeminiError(message, GeminiErrorCode.INVALID_REQUEST, status, errorData);
    }
    
    if (status === 401 || status === 403) {
      return new GeminiError(message, GeminiErrorCode.INVALID_API_KEY, status, errorData);
    }
    
    if (status === 429) {
      return new GeminiError(message, GeminiErrorCode.RATE_LIMITED, status, errorData);
    }
    
    if (status === 404) {
      return new GeminiError(message, GeminiErrorCode.MODEL_NOT_FOUND, status, errorData);
    }
    
    if (status >= 500) {
      return new GeminiError(
        'Server error',
        GeminiErrorCode.NETWORK_ERROR,
        status,
        errorData
      );
    }

    return new GeminiError(message, GeminiErrorCode.UNKNOWN, status, errorData);
  }
}
