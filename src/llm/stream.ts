/**
 * Streaming Handler
 * Handles streaming responses from LLM APIs
 * Works with Gemini, OpenAI, and similar APIs
 */

import { StreamingOptions } from './types';

export interface StreamConfig {
  endpoint: string;
  apiKey: string;
  payload: any;
  headers?: Record<string, string>;
}

/**
 * Stream response from API
 * Supports both SSE and chunked responses
 */
export async function streamResponse(
  config: StreamConfig,
  options: StreamingOptions = {}
): Promise<string> {
  const { endpoint, apiKey, payload, headers = {} } = config;
  const { onToken, onError } = options;

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

    // Check if response is streaming
    const contentType = response.headers.get('content-type') || '';
    const isStreaming = contentType.includes('stream') || 
                       contentType.includes('text/event-stream') ||
                       response.body !== null;

    if (isStreaming && response.body) {
      return await handleStreamingResponse(response, onToken);
    } else {
      // Non-streaming response
      const text = await response.text();
      onToken?.(text);
      return text;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  }
}

/**
 * Handle streaming response (SSE or chunked)
 */
async function handleStreamingResponse(
  response: Response,
  onToken?: (token: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let result = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      onToken?.(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

/**
 * Parse SSE (Server-Sent Events) format
 */
export function parseSSE(chunk: string): string[] {
  const lines = chunk.split('\n');
  const events: string[] = [];

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        if (parsed.text || parsed.content) {
          events.push(parsed.text || parsed.content);
        }
      } catch {
        // Not JSON, treat as plain text
        events.push(data);
      }
    }
  }

  return events;
}
