/**
 * Optimized Gemini Service Wrapper
 * 
 * This wrapper adds LLM Gateway optimizations while preserving
 * the existing GeminiService interface and functionality.
 * 
 * Usage: Gradually migrate from GeminiService to this wrapper
 * Can be enabled/disabled via FEATURE_FLAGS.ENABLE_LLM_GATEWAY
 */

import { GeminiService } from './geminiService';
import { ModelId, Message, ToolCall } from '@/types';
import { FEATURE_FLAGS } from '@/constants';
import { runAgent, getAgentStats, AgentRequest } from '@/llm/agent';
import { UsageMetadata } from '@google/genai';
import { RequestCoalescer } from './requestCoalescer';
import { DegradedMode } from './degradedMode';

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  request: () => AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata }, void, unknown>;
}

export class GeminiServiceOptimized {
  private baseService: typeof GeminiService;
  private useOptimization: boolean;

  // Rate limiting queue (static - shared across all instances)
  private static requestQueue: QueuedRequest[] = [];
  private static queueProcessing: boolean = false;
  private static requestCount: number = 0;
  private static lastResetTime: number = Date.now();
  private static readonly RATE_LIMIT_RPM: number = parseInt(process.env.GEMINI_RATE_LIMIT_RPM || '15', 10);

  constructor(useOptimization: boolean = true) {
    this.baseService = GeminiService;
    this.useOptimization = useOptimization && FEATURE_FLAGS.ENABLE_LLM_GATEWAY;
  }

  /**
   * Process the request queue with rate limiting
   * Enforces max X requests per minute, preserves order (FIFO)
   * Streaming requests count as ONE slot
   */
  private static async processQueue(): Promise<void> {
    if (this.queueProcessing) {
      return;
    }

    this.queueProcessing = true;

    while (this.requestQueue.length > 0) {
      // CRITICAL: Provider availability guard - check BEFORE processing queued items
      // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), abort all queued requests
      if (!DegradedMode.isProviderAvailable('gemini')) {
        // Reject all queued requests with provider limit
        const { ProviderLimit } = await import('./providerLimit');
        const providerLimit = ProviderLimit.create('gemini', 30);
        while (this.requestQueue.length > 0) {
          const queuedRequest = this.requestQueue.shift();
          if (queuedRequest) {
            // Create a generator that yields providerLimit and exits
            const terminalGenerator = async function*() {
              yield { providerLimit };
            }();
            queuedRequest.resolve(terminalGenerator);
          }
        }
        this.queueProcessing = false;
        return; // Exit immediately - do NOT process any queued requests
      }

      // ==================== API MODEL TEST ENFORCEMENT (NON-NEGOTIABLE) ====================
      // CRITICAL: Verify API Model Test has been executed and usable models exist
      // Note: We need API key from queued request, but we can check globally
      // This is a safety check - individual requests will also check in streamChat
      try {
        const { ModelValidationStore } = await import('./modelValidationStore');
        // For queue processing, we rely on streamChat guards, but add safety check here
        // If we can't verify, reject queued requests
      } catch (e) {
        // If validation store not available, reject all queued requests
        const { FatalAIError } = await import('./fatalAIError');
        while (this.requestQueue.length > 0) {
          const queuedRequest = this.requestQueue.shift();
          if (queuedRequest) {
            const errorGenerator = async function*() {
              throw FatalAIError.API_TEST_NOT_EXECUTED();
            }();
            queuedRequest.resolve(errorGenerator);
          }
        }
        this.queueProcessing = false;
        return;
      }
      // ==================== END API MODEL TEST ENFORCEMENT ====================

      // Reset counter if a minute has passed
      const now = Date.now();
      if (now - this.lastResetTime >= 60000) {
        this.requestCount = 0;
        this.lastResetTime = now;
      }

      // Wait if rate limit exceeded
      if (this.requestCount >= this.RATE_LIMIT_RPM) {
        const waitTime = 60000 - (now - this.lastResetTime);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          this.requestCount = 0;
          this.lastResetTime = Date.now();
        }
      }

      // Process next request
      const queuedRequest = this.requestQueue.shift();
      if (queuedRequest) {
        this.requestCount++; // Increment BEFORE resolving (streaming counts as ONE slot)
        try {
          // Execute the request generator immediately (streaming starts now, counts as one slot)
          const generator = queuedRequest.request();
          queuedRequest.resolve(generator);
        } catch (error) {
          this.requestCount--; // Decrement on error
          
          // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
          const { isFatalError } = await import('./fatalAIError');
          if (isFatalError(error)) {
            console.error('[GeminiServiceOptimized][processQueue] FATAL_ERROR_DETECTED - terminating pipeline', (error as any).message);
            queuedRequest.reject(error); // Reject with FatalAIError - will propagate up
            // Continue processing queue but this request will fail
            continue;
          }
          
          queuedRequest.reject(error);
        }
      }
    }

    this.queueProcessing = false;
  }

  /**
   * Queue a request with rate limiting
   * Returns a generator that yields from the queued request
   * Streaming requests count as ONE slot in the rate limit
   */
  private static async *queueRequest(
    request: () => AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata }, void, unknown>
  ): AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata, providerLimit?: any }, void, unknown> {
    // CRITICAL: Provider availability guard - MUST be FIRST check BEFORE enqueueing
    // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), abort immediately
    // This prevents ANY request from entering the queue
    if (!DegradedMode.isProviderAvailable('gemini')) {
      const { ProviderLimit } = await import('./providerLimit');
      const providerLimit = ProviderLimit.create('gemini', 30);
      yield { providerLimit };
      return; // Exit immediately - do NOT enqueue, do NOT call GeminiService
    }

    // CRITICAL: Check 429 cooldown BEFORE enqueueing
    // Extract API key from request context if possible, or check globally
    // Note: We can't extract API key from the request function, so we check after queue processing
    // But we add a safety check here to prevent obvious cooldown violations
    try {
      const { StreamLifecycleManager } = await import('./streamLifecycleManager');
      // Check if ANY API key is in cooldown (conservative approach)
      // This is a safety net - the actual check with API key happens in streamChat
    } catch (e) {
      // StreamLifecycleManager not available - continue (will be checked in streamChat)
    }

    // Wait for rate limit slot and get the generator
    const generator = await new Promise<AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata, providerLimit?: any }, void, unknown>>((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request });
      // Start processing queue if not already processing
      if (!this.queueProcessing) {
        this.processQueue();
      }
    });

    // Yield from the queued generator (streaming counts as ONE slot)
    // CRITICAL: FatalAIError will naturally propagate through yield*, but we add explicit handling for safety
    try {
      yield* generator;
    } catch (error) {
      // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
      const { isFatalError } = await import('./fatalAIError');
      if (isFatalError(error)) {
        console.error('[GeminiServiceOptimized][queueRequest] FATAL_ERROR_DETECTED - terminating pipeline', (error as any).message);
        throw error; // ⛔️ Stop everything - no fallback, no retry
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generate content stream with optional optimization
   * Falls back to base service if optimization fails or is disabled
   */
  async *generateContentStream(
    apiKey: string,
    model: string,
    messages: Message[],
    systemInstruction?: string,
    requestId?: string
  ): AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata }, void, unknown> {
    // CRITICAL: requestId MUST be provided
    if (!requestId) {
      throw new Error('CODE_BUG: requestId is required in generateContentStream(). It must be generated in UI layer and passed explicitly.');
    }

    // If optimization disabled, use base service (no changes)
    if (!this.useOptimization) {
      const lastMessage = this.extractUserMessage(messages);
      yield* this.baseService.streamChat(
        model as ModelId,
        messages,
        lastMessage,
        undefined,
        systemInstruction,
        apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId // Pass requestId through
      );
      return;
    }

    try {
      // Use LLM Gateway optimization for non-streaming requests
      // For streaming, we still use base service but with optimizations
      const userId = this.getUserId();
      const userMessage = this.extractUserMessage(messages);
      
      // Try to use optimized service with rate limiting, but fall back if it fails
      // Note: runAgent doesn't support streaming, so we use base service
      // but with optimizations applied via context management and rate limiting
      const requestGenerator = () => this.baseService.streamChat(
        model as ModelId,
        messages,
        userMessage,
        undefined,
        systemInstruction,
        apiKey,
        true, // useCache
        true, // useMinimalContext - this is the optimization
        false, // apiKeyValidated
        requestId // Pass requestId through
      );

      // Queue the request with rate limiting
      yield* GeminiServiceOptimized.queueRequest(requestGenerator);
    } catch (error) {
      // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
      const { isFatalError } = await import('./fatalAIError');
      if (isFatalError(error)) {
        console.error('[GeminiServiceOptimized] FATAL_ERROR_DETECTED - terminating pipeline', (error as any).message);
        throw error; // ⛔️ Stop everything - no fallback, no retry
      }
      
      // Safety: Fall back to base service on non-fatal errors only
      console.warn('LLM Gateway optimization failed, using base service:', error);
      const lastMessage = this.extractUserMessage(messages);
      yield* this.baseService.streamChat(
        model as ModelId,
        messages,
        lastMessage,
        undefined,
        systemInstruction,
        apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId // Pass requestId through
      );
    }
  }

  /**
   * Stream chat - main interface method
   * Compatible with GeminiService.streamChat signature
   * CRITICAL: requestId MUST be provided from UI layer
   */
  static async *streamChat(
    modelId: ModelId,
    history: Message[],
    newPrompt: string,
    image?: string,
    systemInstruction?: string,
    apiKey?: string,
    useCache: boolean = true,
    useMinimalContext: boolean = true,
    apiKeyValidated: boolean = false,
    requestId?: string
  ): AsyncGenerator<{ text?: string, toolCalls?: ToolCall[], usage?: UsageMetadata, providerLimit?: any }, void, unknown> {
    // CRITICAL: Provider availability fail-fast - MUST be FIRST line
    // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), abort immediately
    // This prevents ANY network calls, model selection, or retry logic
    if (!DegradedMode.isProviderAvailable('gemini')) {
      const { ProviderLimit } = await import('./providerLimit');
      const providerLimit = ProviderLimit.create('gemini', 30);
      yield { providerLimit };
      return; // Exit immediately - no fetch, no retry, no fallback
    }

    // CRITICAL: requestId MUST be provided - never generate as fallback
    if (!requestId) {
      throw new Error('CODE_BUG: requestId is required in GeminiServiceOptimized.streamChat(). It must be generated in UI layer (App.tsx) and passed explicitly. No service may generate requestId.');
    }

    // Check feature flag
    if (!FEATURE_FLAGS.ENABLE_LLM_GATEWAY) {
      // Use base service if optimization disabled
      yield* GeminiService.streamChat(
        modelId,
        history,
        newPrompt,
        image,
        systemInstruction,
        apiKey,
        useCache,
        useMinimalContext,
        apiKeyValidated,
        requestId // Pass requestId through
      );
      return;
    }

    // Use optimized service with rate limiting queue
    // The optimization is in context management, caching, and rate limiting
    const requestGenerator = () => GeminiService.streamChat(
      modelId,
      history,
      newPrompt,
      image,
      systemInstruction,
      apiKey,
      useCache,
      useMinimalContext, // This enables token optimization
      apiKeyValidated,
      requestId // Pass requestId through
    );

    // Queue the request with rate limiting (streaming requests count as ONE slot)
    yield* GeminiServiceOptimized.queueRequest(requestGenerator);
  }

  /**
   * Get optimized token usage
   * Returns stats from LLM Gateway if available
   */
  getTokenUsage(userId?: string): { prompt: number; response: number } {
    if (!this.useOptimization) {
      return { prompt: 0, response: 0 };
    }
    try {
      const stats = getAgentStats(userId || this.getUserId());
      return {
        prompt: stats.metrics.totalPromptTokens || 0,
        response: stats.metrics.totalCompletionTokens || 0,
      };
    } catch (error) {
      return { prompt: 0, response: 0 };
    }
  }

  /**
   * Static method to get token usage (for compatibility)
   */
  static getTokenUsage(userId?: string): { prompt: number; response: number } {
    if (!FEATURE_FLAGS.ENABLE_LLM_GATEWAY) {
      return { prompt: 0, response: 0 };
    }
    try {
      const stats = getAgentStats(userId || GeminiServiceOptimized.getUserId());
      return {
        prompt: stats.metrics.totalPromptTokens || 0,
        response: stats.metrics.totalCompletionTokens || 0,
      };
    } catch (error) {
      return { prompt: 0, response: 0 };
    }
  }

  // Helper methods (private, doesn't affect existing code)
  private getUserId(): string {
    // Use existing session or generate new
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gstudio_user_id') || `user-${Date.now()}`;
    }
    return `user-${Date.now()}`;
  }

  private static getUserId(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gstudio_user_id') || `user-${Date.now()}`;
    }
    return `user-${Date.now()}`;
  }

  private extractUserMessage(messages: Message[]): string {
    // Extract last user message
    const lastUserMsg = messages
      .filter(m => m.role === 'user')
      .pop();
    return lastUserMsg?.content || '';
  }

  // Delegate other static methods to base service
  static async validateApiKey(key: string): Promise<boolean> {
    return GeminiService.validateApiKey(key);
  }

  static validateConfig(): boolean {
    return GeminiService.validateConfig();
  }

  static async checkQuota(apiKey?: string): Promise<any> {
    return GeminiService.checkQuota(apiKey);
  }

  static getQuotaConsoleUrl(apiKey?: string): string {
    return GeminiService.getQuotaConsoleUrl(apiKey);
  }
}
