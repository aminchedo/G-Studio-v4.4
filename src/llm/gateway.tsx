/**
 * LLM Gateway
 * Handles actual API calls to LLM providers (Gemini, OpenAI, etc.)
 * This is a thin adapter layer that can be swapped for different providers
 */

import { LLMRequest, LLMResponse, ProviderType } from "./types";
import { shouldUseGeminiGateway } from "./config";
import { GeminiService } from "@/services/geminiService";
import { ModelId } from "@/types/types";
import type { Message } from "@/types/types";

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
function detectProvider(
  config: GatewayConfig,
  request: LLMRequest,
): ProviderType {
  // Explicit provider takes precedence
  if (config.provider) {
    return config.provider;
  }
  if (request.provider) {
    return request.provider;
  }

  // Auto-detect from model name
  const model = config.model.toLowerCase();
  if (model.startsWith("gemini-")) {
    return "gemini";
  }
  if (model.startsWith("gpt-") || model.includes("openai")) {
    return "openai";
  }

  return "generic";
}

/**
 * Convert model string to ModelId enum
 */
function modelStringToModelId(model: string): ModelId {
  const modelLower = model.toLowerCase();
  if (modelLower.includes("gemini-3-flash")) return ModelId.Gemini3FlashPreview;
  if (modelLower.includes("gemini-3-pro")) return ModelId.Gemini3ProPreview;
  if (modelLower.includes("gemini-flash")) return ModelId.GeminiFlashLatest;
  if (modelLower.includes("gemini-flash-lite"))
    return ModelId.GeminiFlashLiteLatest;
  // Default fallback
  return ModelId.GeminiFlashLatest;
}

/**
 * Convert LLMRequest history to Message[] format
 */
function convertHistory(history: string[] = []): Message[] {
  return history.map((text, index) => ({
    id: `gateway-msg-${index}-${Date.now()}`,
    role: (index % 2 === 0 ? "user" : "model") as Message["role"],
    content: text,
    timestamp: Date.now(),
  }));
}

/**
 * Call LLM gateway (actual API call)
 * Routes to appropriate provider implementation
 */
export async function callGateway(
  config: GatewayConfig,
  request: LLMRequest,
): Promise<GatewayResponse> {
  const provider = detectProvider(config, request);

  // Route to Gemini provider if enabled and model is Gemini
  if (provider === "gemini" && shouldUseGeminiGateway()) {
    try {
      // Use GeminiService instead of direct SDK calls for architectural compliance
      const modelId = modelStringToModelId(config.model);
      const history = convertHistory(request.history);
      const requestId = `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Collect all chunks from streaming response
      let fullText = "";
      let usage: GatewayResponse["usage"];
      let toolCalls: any[] = [];

      for await (const chunk of GeminiService.streamChat(
        modelId,
        history,
        request.userInput,
        request.image,
        config.systemInstruction,
        config.apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId,
      )) {
        if (chunk.text) {
          fullText += chunk.text;
        }
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.promptTokenCount,
            completionTokens: chunk.usage.candidatesTokenCount,
            totalTokens: chunk.usage.totalTokenCount,
          };
        }
        if (chunk.toolCalls) {
          toolCalls.push(...chunk.toolCalls);
        }
      }

      return {
        text: fullText,
        usage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      // Log error but fall through to generic implementation for graceful degradation
      console.warn(
        "[Gateway] Gemini provider failed, falling back to generic:",
        error,
      );
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
      ...(systemInstruction
        ? [{ role: "system", content: systemInstruction }]
        : []),
      { role: "user", content: userInput },
    ],
  };

  // Add image if provided
  if (image) {
    payload.messages[payload.messages.length - 1].image = image;
  }

  try {
    // Route through service layer for architectural consistency
    const { McpService } = await import("@/services/mcpService");
    const data = await McpService.request(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: payload,
    });

    // Parse response based on provider format
    // Adjust this based on your actual API response structure
    return {
      text: data.choices?.[0]?.message?.content || data.text || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || data.usage?.promptTokenCount,
        completionTokens:
          data.usage?.completion_tokens || data.usage?.candidatesTokenCount,
        totalTokens: data.usage?.total_tokens || data.usage?.totalTokenCount,
      },
      toolCalls: data.tool_calls || data.functionCalls,
    };
  } catch (error) {
    throw new Error(
      `Gateway error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Stream response from gateway (for streaming APIs)
 * Routes to appropriate provider implementation
 */
export async function* streamGateway(
  config: GatewayConfig,
  request: LLMRequest,
): AsyncGenerator<string, void, unknown> {
  const provider = detectProvider(config, request);

  // Route to Gemini provider if enabled and model is Gemini
  if (provider === "gemini" && shouldUseGeminiGateway()) {
    try {
      // Use GeminiService instead of direct SDK calls for architectural compliance
      const modelId = modelStringToModelId(config.model);
      const history = convertHistory(request.history);
      const requestId = `gateway-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      for await (const chunk of GeminiService.streamChat(
        modelId,
        history,
        request.userInput,
        request.image,
        config.systemInstruction,
        config.apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId,
      )) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
      return;
    } catch (error) {
      // Log error but fall through to generic implementation for graceful degradation
      console.warn(
        "[Gateway] Gemini provider streaming failed, falling back to generic:",
        error,
      );
      // Continue to generic implementation below
    }
  }

  // Generic implementation (original code)
  const { endpoint, apiKey, model, systemInstruction, headers = {} } = config;
  const { userInput, image } = request;

  const payload: any = {
    model,
    messages: [
      ...(systemInstruction
        ? [{ role: "system", content: systemInstruction }]
        : []),
      { role: "user", content: userInput },
    ],
    stream: true,
  };

  if (image) {
    payload.messages[payload.messages.length - 1].image = image;
  }

  try {
    // NOTE: Streaming requests require direct fetch access for ReadableStream
    // This is a documented exception - mcpService.request() doesn't support streaming yet
    // TODO: Add streaming support to mcpService for full architectural compliance
    // For now, we use fetch directly but document this architectural exception
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      throw new Error("Response body is not readable");
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format or chunked format based on provider
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const text =
                parsed.choices?.[0]?.delta?.content || parsed.text || "";
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
    throw new Error(
      `Gateway streaming error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
