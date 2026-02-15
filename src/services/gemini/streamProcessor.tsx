/**
 * G Studio v2.3.0 - Gemini Stream Processor
 *
 * Handles streaming responses from the Gemini API
 */

import {
  StreamChunk,
  UsageMetadata,
  ProviderLimitInfo,
  Logger,
  ErrorCategory,
} from "../../types/additional";
import { categorizeError } from "./errorHandler";

// ==================== TOOL CALL TYPE ====================

export interface ToolCall {
  id: string;
  name: string;
  arguments?: Record<string, any>;
  args?: Record<string, any>;
}

// ============================================================================
// STREAM PROCESSOR CLASS
// ============================================================================

export class StreamProcessor {
  private buffer: string = "";
  private fullText: string = "";
  private toolCalls: ToolCall[] = [];
  private usage: UsageMetadata | null = null;
  private logger: Logger | null;
  private isAborted: boolean = false;
  private chunkCount: number = 0;

  constructor(logger: Logger | null = null) {
    this.logger = logger;
  }

  /**
   * Process a streaming response
   */
  async *processStream(
    response: Response,
    onChunk?: (chunk: StreamChunk) => void,
  ): AsyncGenerator<StreamChunk> {
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (!this.isAborted) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (this.buffer.trim()) {
            const chunk = this.parseChunk(this.buffer);
            if (chunk) {
              yield chunk;
              onChunk?.(chunk);
            }
          }

          // Yield final chunk with done flag
          const finalChunk: StreamChunk = {
            done: true,
            text: this.fullText,
            toolCalls: this.toolCalls.length > 0 ? this.toolCalls : undefined,
            usage: this.usage || undefined,
          };
          yield finalChunk;
          onChunk?.(finalChunk);
          break;
        }

        // Decode chunk
        const text = decoder.decode(value, { stream: true });
        this.buffer += text;

        // Process complete lines
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          const chunk = this.parseChunk(line);
          if (chunk) {
            this.chunkCount++;
            yield chunk;
            onChunk?.(chunk);
          }
        }
      }
    } catch (error: any) {
      const errorCategory = categorizeError(error);
      const errorMessage = error?.message || "Unknown error";
      this.logger?.error(`Stream error: ${errorMessage}`, error);

      yield {
        error: errorMessage,
        done: true,
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse a single chunk from the stream
   */
  private parseChunk(line: string): StreamChunk | null {
    // Remove 'data: ' prefix if present (SSE format)
    let data = line.trim();
    if (data.startsWith("data: ")) {
      data = data.slice(6);
    }

    // Skip empty or special lines
    if (!data || data === "[DONE]") {
      return null;
    }

    try {
      const json = JSON.parse(data);
      return this.processJsonChunk(json);
    } catch (e) {
      // Not valid JSON, might be partial text
      this.logger?.debug(`Non-JSON chunk: ${data.substring(0, 100)}`);
      return null;
    }
  }

  /**
   * Process a parsed JSON chunk
   */
  private processJsonChunk(json: any): StreamChunk | null {
    // Check for error response
    if (json.error) {
      return {
        error: json.error.message || "Unknown API error",
        done: true,
      };
    }

    // Check for rate limit
    if (json.error?.code === 429 || json.status === "RATE_LIMIT_EXCEEDED") {
      const providerLimit: ProviderLimitInfo = {
        limitType: "rate",
        retryAfter: json.error?.retryDelay || 60,
        message: json.error?.message || "Rate limit exceeded",
      };
      return { providerLimit, done: true };
    }

    // Extract text from candidates
    const candidates = json.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    let text = "";
    const newToolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }
      if (part.functionCall) {
        const genId = `tc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        newToolCalls.push({
          id: genId,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
          args: part.functionCall.args || {},
        });
      }
    }

    // Update accumulated state
    if (text) {
      this.fullText += text;
    }
    if (newToolCalls.length > 0) {
      this.toolCalls.push(...newToolCalls);
    }

    // Extract usage metadata
    if (json.usageMetadata) {
      this.usage = {
        promptTokens: json.usageMetadata.promptTokenCount,
        completionTokens: json.usageMetadata.candidatesTokenCount,
        totalTokens: json.usageMetadata.totalTokenCount,
        promptTokenCount: json.usageMetadata.promptTokenCount,
        candidatesTokenCount: json.usageMetadata.candidatesTokenCount,
        totalTokenCount: json.usageMetadata.totalTokenCount,
      };
    }

    // Check for finish reason
    const finishReason = candidates[0]?.finishReason;
    const isDone = finishReason === "STOP" || finishReason === "MAX_TOKENS";

    if (!text && newToolCalls.length === 0 && !isDone) {
      return null; // No meaningful content
    }

    return {
      text: text || undefined,
      toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined,
      usage: this.usage || undefined,
      done: isDone,
    };
  }

  /**
   * Abort the stream processing
   */
  abort(): void {
    this.isAborted = true;
  }

  /**
   * Get accumulated text
   */
  getFullText(): string {
    return this.fullText;
  }

  /**
   * Get all tool calls
   */
  getToolCalls(): ToolCall[] {
    return this.toolCalls;
  }

  /**
   * Get usage metadata
   */
  getUsage(): UsageMetadata | null {
    return this.usage;
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunkCount;
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.buffer = "";
    this.fullText = "";
    this.toolCalls = [];
    this.usage = null;
    this.isAborted = false;
    this.chunkCount = 0;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an async generator from Gemini SDK response
 */
export async function* processGeminiSdkStream(
  stream: AsyncIterable<any>,
  onChunk?: (chunk: StreamChunk) => void,
): AsyncGenerator<StreamChunk> {
  let fullText = "";
  let toolCalls: ToolCall[] = [];
  let usage: UsageMetadata | null = null;

  try {
    for await (const chunk of stream) {
      const text = chunk.text?.() || "";
      const candidates = chunk.candidates || [];
      const parts = candidates[0]?.content?.parts || [];

      // Extract tool calls
      for (const part of parts) {
        if (part.functionCall) {
          const genId = `tc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
          toolCalls.push({
            id: genId,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
            args: part.functionCall.args || {},
          });
        }
      }

      // Update accumulated text
      if (text) {
        fullText += text;
      }

      // Extract usage
      if (chunk.usageMetadata) {
        usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount,
          completionTokens: chunk.usageMetadata.candidatesTokenCount,
          totalTokens: chunk.usageMetadata.totalTokenCount,
          promptTokenCount: chunk.usageMetadata.promptTokenCount,
          candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount,
          totalTokenCount: chunk.usageMetadata.totalTokenCount,
        };
      }

      const streamChunk: StreamChunk = {
        text: text || undefined,
        toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
        usage: usage || undefined,
      };

      yield streamChunk;
      onChunk?.(streamChunk);
    }

    // Final chunk
    const finalChunk: StreamChunk = {
      done: true,
      text: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: usage || undefined,
    };

    yield finalChunk;
    onChunk?.(finalChunk);
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error";
    yield {
      error: errorMessage,
      done: true,
    };
  }
}

/**
 * Collect all chunks from a stream
 */
export async function collectStream(
  stream: AsyncIterable<StreamChunk>,
): Promise<{
  text: string;
  toolCalls: ToolCall[];
  usage: UsageMetadata | null;
}> {
  let text = "";
  let toolCalls: ToolCall[] = [];
  let usage: UsageMetadata | null = null;

  for await (const chunk of stream) {
    if (chunk.text) {
      text += chunk.text;
    }
    if (chunk.toolCalls) {
      toolCalls.push(...chunk.toolCalls);
    }
    if (chunk.usage) {
      usage = chunk.usage;
    }
    if (chunk.done) {
      // Use final accumulated values if available
      if (chunk.text && chunk.text.length > text.length) {
        text = chunk.text;
      }
    }
  }

  return { text, toolCalls, usage };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StreamProcessor;
