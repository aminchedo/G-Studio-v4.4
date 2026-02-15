/**
 * LLM Gateway - Main Entry Point
 * Optimized LLM interaction layer with:
 * - Token optimization
 * - Context trimming
 * - Response caching
 * - Streaming support
 * - API schema compliance
 * - Telemetry and metrics
 * - Per-user quota tracking
 * - Cost estimation
 */

import { optimizePrompt, estimateTokens } from './optimizer';
import { buildContext, extractRelevantContext } from './context';
import { getCached, setCached } from './cache';
import { streamResponse } from './stream';
import { LLMRequest, LLMResponse, StreamingOptions } from './types';

// Re-export new modules
export { runAgent, getAgentStats, type AgentRequest, type AgentResponse } from './agent';
export { callGateway, streamGateway, type GatewayConfig, type GatewayResponse } from './gateway';
export { recordMetric, exportMetrics, exportPrometheusFormat, type MetricName } from './telemetry';
export { checkQuota, recordUsage, getRemainingQuota, setQuotaConfig, getQuotaConfig, type QuotaConfig } from './quota';
export { estimateCost, getModelPricing, getAllPricing, type TokenUsage, type ModelPricing } from './cost';

// Re-export Gemini gateway provider
export { callGeminiGateway, streamGeminiGateway } from './providers/geminiGateway';

// Re-export context abstraction
export { generateContextAbstraction, formatContextAbstraction, type CodeContextAbstraction } from './contextAbstraction';

// Re-export configuration
export { 
  ENABLE_GEMINI_GATEWAY, 
  ENABLE_CONTEXT_ABSTRACTION, 
  GEMINI_GATEWAY_ROLLOUT_PERCENTAGE,
  shouldUseGeminiGateway,
  getConfigSummary 
} from './config';

/**
 * Main LLM execution function
 * Handles prompt optimization, context building, caching, and streaming
 */
export async function runLLM(
  request: LLMRequest,
  options: StreamingOptions = {}
): Promise<LLMResponse> {
  const {
    userInput,
    history = [],
    apiKey,
    endpoint,
    modelId,
    systemInstruction,
    image,
  } = request;

  // Step 1: Optimize prompt (reduce tokens)
  const optimized = optimizePrompt(userInput);

  // Step 2: Build context (token-aware)
  const context = buildContext(history, {
    maxTokens: 2000,
    maxMessages: 10,
    preserveRecent: 2,
  });

  // Step 3: Check cache
  const cacheKey = `${optimized}:${context}:${modelId || 'default'}`;
  const cached = getCached(optimized, context, modelId);
  
  if (cached) {
    return {
      text: cached,
      cached: true,
      tokens: {
        prompt: estimateTokens(context + optimized),
        response: estimateTokens(cached),
        total: estimateTokens(context + optimized + cached),
      },
    };
  }

  // Step 4: Build API payload (strict schema compliance)
  const payload = buildPayload({
    userInput: optimized,
    context,
    systemInstruction,
    image,
  });

  // Step 5: Stream response
  let result = '';
  let promptTokens = estimateTokens(context + optimized);
  let responseTokens = 0;

  try {
    if (!endpoint) {
      throw new Error('API endpoint is required');
    }

    const streamResult = await streamResponse(
      {
        endpoint,
        apiKey,
        payload,
      },
      {
        ...options,
        onToken: (token) => {
          result += token;
          responseTokens = estimateTokens(result);
          options.onToken?.(token);
        },
      }
    );

    result = streamResult || result;
    responseTokens = estimateTokens(result);

    // Step 6: Cache response
    setCached(
      optimized,
      result,
      {
        prompt: promptTokens,
        response: responseTokens,
      },
      context,
      modelId
    );

    return {
      text: result,
      cached: false,
      tokens: {
        prompt: promptTokens,
        response: responseTokens,
        total: promptTokens + responseTokens,
      },
    };
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Build API payload (Gemini-compatible format)
 * NEVER includes invalid fields: thoughtSignature, reasoning, chain_of_thought, functionCall
 */
function buildPayload(params: {
  userInput: string;
  context?: string;
  systemInstruction?: string;
  image?: string;
}): any {
  const { userInput, context, systemInstruction, image } = params;

  const parts: any[] = [];

  // Add image if provided
  if (image) {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    });
  }

  // Build text content
  let textContent = '';
  if (context) {
    textContent += context + '\n\n';
  }
  textContent += userInput;

  if (textContent.trim()) {
    parts.push({ text: textContent.trim() });
  }

  // Build payload - ONLY valid Gemini API fields
  const payload: any = {
    contents: [
      {
        role: 'user',
        parts: parts,
      },
    ],
  };

  // Add system instruction if provided
  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  // NEVER include:
  // - thoughtSignature
  // - reasoning
  // - chain_of_thought
  // - functionCall (in contents)
  // - Any internal/debug fields

  return payload;
}

/**
 * Extract relevant context (RAG-style)
 */
export function getRelevantContext(
  history: string[],
  currentQuery: string,
  maxTokens: number = 2000
): string {
  const relevant = extractRelevantContext(history, currentQuery, {
    maxTokens,
    preserveRecent: 2,
  });

  return relevant.join('\n\n');
}

// Re-export utilities
export { optimizePrompt, estimateTokens } from './optimizer';
export { buildContext, extractRelevantContext } from './context';
export { getCached, setCached, responseCache } from './cache';
export { streamResponse, parseSSE } from './stream';
export type { LLMRequest, LLMResponse, StreamingOptions } from './types';
