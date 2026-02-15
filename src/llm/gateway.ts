/**
 * LLM Gateway
 * Handles actual API calls to LLM providers (Gemini, OpenAI, etc.)
 * This is a thin adapter layer that can be swapped for different providers
 */

import { LLMRequest, LLMResponse, ProviderType } from './types';
import { callGeminiGateway, streamGeminiGateway } from './providers/geminiGateway';
import { shouldUseGeminiGateway } from './config';

export interface GatewayConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  systemInstruction?: string;
  headers?: Record<string, string>;
  provider?: ProviderType;
}

export interface GatewayResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: any[];
}

/**
 * Detect provider type from config or request
 */
function detectProvider(config: GatewayConfig, request: LLMRequest): ProviderType {
  // Explicit provider takes precedence
  if (config.provider) {
    return config.provider;
  }
  if (request.provider) {
    return request.provider;
  }

  // Auto-detect from model name
  const model = config.model.toLowerCase();
  if (model.startsWith('gemini-')) {
    return 'gemini';
  }
  if (model.startsWith('gpt-') || model.includes('openai')) {
    return 'openai';
  }

  return 'generic';
}

/**
 * Call LLM gateway (actual API call)
 * Routes to appropriate provider implementation
 */
export async function callGateway(
  config: GatewayConfig,
  request: LLMRequest
): Promise<GatewayResponse> {
  const provider = detectProvider(config, request);

  // Route to Gemini provider if enabled and model is Gemini
  if (provider === 'gemini' && shouldUseGeminiGateway()) {
    try {
      return await callGeminiGateway(config, request);
    } catch (error) {
      // Log error but fall through to generic implementation for graceful degradation
      console.warn('[Gateway] Gemini provider failed, falling back to generic:', error);
      // Continue to generic implementation below
    }
  }

  // Generic implementation (original code)
  const { endpoint, apiKey, model, systemInstruction, headers = {} } = config;
  const { userInput, image } = request;

  // Build payload according to provider format
  // This is a simplified example - adjust based on your actual API
  const payload: any = {
    model,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      { role: 'user', content: userInput },
    ],
  };

  // Add image if provided
  if (image) {
    payload.messages[payload.messages.length - 1].image = image;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Parse response based on provider format
    // Adjust this based on your actual API response structure
    return {
      text: data.choices?.[0]?.message?.content || data.text || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || data.usage?.promptTokenCount,
        completionTokens: data.usage?.completion_tokens || data.usage?.candidatesTokenCount,
        totalTokens: data.usage?.total_tokens || data.usage?.totalTokenCount,
      },
      toolCalls: data.tool_calls || data.functionCalls,
    };
  } catch (error) {
    throw new Error(`Gateway error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Stream response from gateway (for streaming APIs)
 * Routes to appropriate provider implementation
 */
export async function* streamGateway(
  config: GatewayConfig,
  request: LLMRequest
): AsyncGenerator<string, void, unknown> {
  const provider = detectProvider(config, request);

  // Route to Gemini provider if enabled and model is Gemini
  if (provider === 'gemini' && shouldUseGeminiGateway()) {
    try {
      yield* streamGeminiGateway(config, request);
      return;
    } catch (error) {
      // Log error but fall through to generic implementation for graceful degradation
      console.warn('[Gateway] Gemini provider streaming failed, falling back to generic:', error);
      // Continue to generic implementation below
    }
  }

  // Generic implementation (original code)
  const { endpoint, apiKey, model, systemInstruction, headers = {} } = config;
  const { userInput, image } = request;

  const payload: any = {
    model,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      { role: 'user', content: userInput },
    ],
    stream: true,
  };

  if (image) {
    payload.messages[payload.messages.length - 1].image = image;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format or chunked format based on provider
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || parsed.text || '';
              if (text) yield text;
            } catch {
              // Not JSON, skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    throw new Error(`Gateway streaming error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
