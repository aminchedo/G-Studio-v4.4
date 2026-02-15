/**
 * Agent Layer
 * High-level orchestration with validation, quota, telemetry, and cost tracking
 * This is the main entry point for LLM operations
 */

import { optimizePrompt } from './optimizer';
import { callGateway, GatewayConfig } from './gateway';
import { checkQuota, recordUsage, getRemainingQuota } from './quota';
import { recordMetric, incrementCounter, recordHistogram } from './telemetry';
import { estimateCost, TokenUsage } from './cost';
import { getCached, setCached } from './cache';
import { LLMRequest, LLMResponse } from './types';
import { generateContextAbstraction, formatContextAbstraction } from './contextAbstraction';
import { ENABLE_CONTEXT_ABSTRACTION } from './config';

export interface AgentRequest {
  userId: string;
  model: string;
  text: string;
  system?: string;
  image?: string;
  gatewayConfig: GatewayConfig;
  enableCache?: boolean;
  enableOptimization?: boolean;
  useContextAbstraction?: boolean;
  files?: Record<string, { name: string; content: string; language: string }>;
  changedFiles?: string[];
  projectRoot?: string;
}

export interface AgentResponse extends LLMResponse {
  cost: number;
  cached: boolean;
  quotaRemaining?: {
    remainingCost: number;
    percentageUsed: number;
  };
}

/**
 * Run agent with full orchestration
 * Handles: optimization, caching, quota, telemetry, cost tracking
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  const {
    userId,
    model,
    text,
    system,
    image,
    gatewayConfig,
    enableCache = true,
    enableOptimization = true,
    useContextAbstraction = false,
    files,
    changedFiles,
    projectRoot,
  } = request;

  try {
    // Step 0: Generate context abstraction (if enabled)
    let enhancedSystem = system;
    if (ENABLE_CONTEXT_ABSTRACTION && useContextAbstraction && files) {
      try {
        const context = await generateContextAbstraction({
          files,
          changedFiles: changedFiles || [],
          projectRoot,
        });
        const contextText = formatContextAbstraction(context);
        enhancedSystem = system 
          ? `${system}\n\n## Code Context\n${contextText}`
          : `## Code Context\n${contextText}`;
      } catch (error) {
        // Graceful degradation: if context abstraction fails, continue without it
        console.warn('[Agent] Context abstraction failed, continuing without it:', error);
      }
    }

    // Step 1: Optimize prompt (if enabled)
    const optimized = enableOptimization ? optimizePrompt(text) : text;
    
    // Step 2: Check cache (if enabled)
    const cacheKey = `${userId}:${model}:${optimized}`;
    let cached: LLMResponse | null = null;
    
    if (enableCache) {
      cached = getCached(optimized, undefined, model);
      if (cached) {
        incrementCounter('cache_hit');
        recordMetric('cache_hit', 1);
        
        const latency = Date.now() - startTime;
        recordHistogram('latency_ms', latency);
        
        return {
          ...cached,
          cost: 0, // Cached responses have no cost
          cached: true,
        };
      }
      incrementCounter('cache_miss');
      recordMetric('cache_miss', 1);
    }

    // Step 3: Check quota before making API call
    try {
      checkQuota(userId);
    } catch (error) {
      incrementCounter('quota_exceeded');
      recordMetric('quota_exceeded', 1);
      throw error;
    }

    // Step 4: Call gateway (actual API call)
    const gatewayResponse = await callGateway(gatewayConfig, {
      userInput: optimized,
      history: [],
      apiKey: gatewayConfig.apiKey,
      endpoint: gatewayConfig.endpoint,
      modelId: model,
      systemInstruction: enhancedSystem,
      image,
      useContextAbstraction: ENABLE_CONTEXT_ABSTRACTION && useContextAbstraction,
    });

    // Step 5: Calculate cost
    const usage: TokenUsage = {
      promptTokens: gatewayResponse.usage?.promptTokens,
      completionTokens: gatewayResponse.usage?.completionTokens,
      totalTokens: gatewayResponse.usage?.totalTokens,
    };
    
    const cost = estimateCost(model, usage);

    // Step 6: Record usage and metrics
    recordUsage(userId, cost, usage.totalTokens);
    
    // Record telemetry
    incrementCounter('request_count');
    if (usage.totalTokens) {
      recordHistogram('tokens_used', usage.totalTokens);
      recordHistogram('tokens_prompt', usage.promptTokens || 0);
      recordHistogram('tokens_completion', usage.completionTokens || 0);
    }
    recordHistogram('cost_usd', cost);
    
    const latency = Date.now() - startTime;
    recordHistogram('latency_ms', latency);

    // Step 7: Cache response (if enabled)
    const response: LLMResponse = {
      text: gatewayResponse.text,
      tokens: usage.totalTokens ? {
        prompt: usage.promptTokens || 0,
        response: usage.completionTokens || 0,
        total: usage.totalTokens,
      } : undefined,
      cached: false,
    };

    if (enableCache && gatewayResponse.text) {
      setCached(
        optimized,
        gatewayResponse.text,
        response.tokens ? {
          prompt: response.tokens.prompt,
          response: response.tokens.response,
        } : undefined,
        undefined,
        model
      );
    }

    // Step 8: Get remaining quota
    const quotaRemaining = getRemainingQuota(userId);

    return {
      ...response,
      cost,
      cached: false,
      quotaRemaining: {
        remainingCost: quotaRemaining.remainingCost,
        percentageUsed: quotaRemaining.percentageUsed,
      },
    };
  } catch (error) {
    // Record error
    incrementCounter('error_count');
    recordMetric('error_count', 1);
    
    const latency = Date.now() - startTime;
    recordHistogram('latency_ms', latency);
    
    throw error;
  }
}

/**
 * Get agent statistics for a user
 */
export function getAgentStats(userId: string): {
  quota: ReturnType<typeof getRemainingQuota>;
  metrics: ReturnType<typeof import('./telemetry').getAllMetricSummaries>;
} {
  return {
    quota: getRemainingQuota(userId),
    metrics: require('./telemetry').getAllMetricSummaries(),
  };
}
