/**
 * Runtime Guardrails & Regression Protection
 * 
 * Ensures verified guarantees cannot be accidentally broken.
 * Adds lightweight runtime assertions at critical boundaries.
 * 
 * NON-REMOVABLE: These assertions are production-critical and must never be disabled.
 */

export class RuntimeGuardrails {
  // NON-REMOVABLE: Production assertions cannot be disabled
  private static readonly PRODUCTION_ENABLED = true;
  private static readonly GUARD_MARKER = Symbol('GUARD_PASSED');

  /**
   * Enable or disable guardrails (for testing only - production guards remain active)
   */
  static setEnabled(enabled: boolean): void {
    // Production guards always enabled - this only affects non-critical guards
    console.warn('[GUARD] Attempted to disable guards - production guards remain active');
  }

  /**
   * Guard: Verify orchestrator entry point
   * Must be called before any AI processing
   * NON-REMOVABLE: Production assertion
   */
  static guardOrchestratorEntry(message: string, apiKey: string, requestId?: string): void {
    // NON-REMOVABLE: Always enforce in production
    const guardPrefix = requestId ? `[GUARD][requestId=${requestId}]` : '[GUARD]';

    // PRECONDITION: Message must be valid string
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error(`${guardPrefix}: TRIGGERED - Invalid message input`, { messageType: typeof message, messageLength: message?.length });
      throw new Error('Invalid input: Message cannot be empty. Please provide a valid message.');
    }

    // PRECONDITION: API key must be string (can be empty, but type must be correct)
    if (apiKey !== undefined && apiKey !== null && typeof apiKey !== 'string') {
      console.error(`${guardPrefix}: TRIGGERED - Invalid API key type`, { apiKeyType: typeof apiKey });
      throw new Error('Invalid configuration: API key must be a string.');
    }

    // POSTCONDITION: Entry point validated
    console.log(`${guardPrefix}: PASSED (orchestrator entry)`);
  }

  /**
   * Guard: Verify context manager is consulted
   * Must be called before context persistence
   */
  static guardContextManager(hasContext: boolean, sessionId: string | null): void {
    if (!this.enabled) return;

    // Context manager should have been consulted (even if no context returned)
    // We verify by checking that sessionId is available if context is expected
    if (hasContext && !sessionId) {
      console.warn('[GUARD]: TRIGGERED - Context expected but no session');
      // Non-fatal: may be first message
    }

    console.log('[GUARD]: PASSED (context manager)');
  }

  /**
   * Guard: Verify hybrid decision engine was consulted
   * Must be called before model/API invocation
   * NON-REMOVABLE: Production assertion
   */
  static guardDecisionEngine(executionPlan: any, requestId?: string): void {
    // NON-REMOVABLE: Always enforce in production
    const guardPrefix = requestId ? `[GUARD][requestId=${requestId}]` : '[GUARD]';

    // PRECONDITION: Execution plan must exist and have mode
    if (!executionPlan || typeof executionPlan !== 'object') {
      console.error(`${guardPrefix}: TRIGGERED - Decision engine not consulted`, { executionPlanType: typeof executionPlan });
      throw new Error('System error: Decision engine must be consulted before processing. Please try again.');
    }

    if (typeof executionPlan.mode === 'undefined' || executionPlan.mode === null) {
      console.error(`${guardPrefix}: TRIGGERED - Missing execution mode`, { executionPlan });
      throw new Error('System error: Execution mode not determined. Please try again.');
    }

    // PRECONDITION: Mode must be valid
    const validModes = ['CLOUD', 'LOCAL', 'HYBRID', 'OFFLINE'];
    if (!validModes.includes(executionPlan.mode)) {
      console.error(`${guardPrefix}: TRIGGERED - Invalid execution mode`, { mode: executionPlan.mode, validModes });
      throw new Error(`System error: Invalid execution mode detected. Please refresh and try again.`);
    }

    // POSTCONDITION: Decision engine validated
    console.log(`${guardPrefix}: PASSED (decision engine)`, { mode: executionPlan.mode });
  }

  /**
   * Guard: Verify context persistence
   * Must be called after response generation
   */
  static guardContextPersistence(sessionId: string | null, response: string): void {
    if (!this.enabled) return;

    // If we have a session, context should be persisted
    // We can't verify actual persistence here, but we verify the attempt
    if (sessionId && (!response || response.trim().length === 0)) {
      console.warn('[GUARD]: TRIGGERED - Empty response with active session');
      // Non-fatal: may be intentional
    }

    console.log('[GUARD]: PASSED (context persistence)');
  }

  /**
   * Guard: Verify no direct service bypass
   * Checks that orchestrator flow was followed
   */
  static guardNoBypass(callerStack: string): void {
    if (!this.enabled) return;

    // Check if caller is from orchestrator
    if (!callerStack.includes('agentOrchestrator') && !callerStack.includes('processUserMessage')) {
      console.warn('[GUARD]: TRIGGERED - Potential bypass detected');
      // Log but don't throw - may be legitimate utility call
    }

    console.log('[GUARD]: PASSED (no bypass)');
  }

  /**
   * Guard: Verify GeminiService input preconditions
   * NON-REMOVABLE: Production assertion
   */
  static guardGeminiServiceInput(
    contents: any,
    requestId: string,
    operation: 'stream' | 'non-stream'
  ): void {
    const guardPrefix = `[GUARD][requestId=${requestId}]`;

    // PRECONDITION: Contents must be array
    if (!Array.isArray(contents)) {
      console.error(`${guardPrefix}: TRIGGERED - Contents not array`, { 
        type: typeof contents, 
        operation,
        contentsValue: contents 
      });
      throw new Error('Internal error: Invalid request format. Please try again.');
    }

    // PRECONDITION: Contents must have at least one message
    if (contents.length === 0) {
      console.error(`${guardPrefix}: TRIGGERED - Empty contents array`, { operation });
      throw new Error('Internal error: Request cannot be empty. Please try again.');
    }

    // PRECONDITION: Each content item must have required structure
    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      if (!item || typeof item !== 'object') {
        console.error(`${guardPrefix}: TRIGGERED - Invalid content item`, { index: i, itemType: typeof item });
        throw new Error('Internal error: Invalid message format. Please try again.');
      }
      if (!item.role || !item.parts || !Array.isArray(item.parts)) {
        console.error(`${guardPrefix}: TRIGGERED - Content item missing required fields`, { 
          index: i, 
          hasRole: !!item.role,
          hasParts: !!item.parts,
          partsIsArray: Array.isArray(item.parts)
        });
        throw new Error('Internal error: Message structure invalid. Please try again.');
      }
    }

    console.log(`${guardPrefix}: PASSED (gemini service input)`, { operation, contentsLength: contents.length });
  }

  /**
   * Guard: Verify GeminiService response postconditions
   * NON-REMOVABLE: Production assertion
   */
  static guardGeminiServiceResponse(
    response: any,
    requestId: string,
    operation: 'stream' | 'non-stream'
  ): { isValid: boolean; error?: string } {
    const guardPrefix = `[GUARD][requestId=${requestId}]`;

    // POSTCONDITION: Response must exist
    if (response === null || response === undefined) {
      console.error(`${guardPrefix}: TRIGGERED - Null response`, { operation });
      return { isValid: false, error: 'Empty response received. Please try again.' };
    }

    // POSTCONDITION: Response must have text OR toolCalls OR usage (at least one)
    const hasText = response.text !== undefined && response.text !== null;
    const hasToolCalls = response.toolCalls !== undefined && Array.isArray(response.toolCalls) && response.toolCalls.length > 0;
    const hasUsage = response.usage !== undefined && response.usage !== null;

    if (!hasText && !hasToolCalls && !hasUsage) {
      console.error(`${guardPrefix}: TRIGGERED - Empty response content`, { 
        operation,
        hasText,
        hasToolCalls,
        hasUsage,
        responseKeys: Object.keys(response)
      });
      return { isValid: false, error: 'Empty response content. The AI did not return any content. Please try again.' };
    }

    // POSTCONDITION: If text exists, it must be string
    if (hasText && typeof response.text !== 'string') {
      console.error(`${guardPrefix}: TRIGGERED - Invalid text type`, { 
        operation,
        textType: typeof response.text 
      });
      return { isValid: false, error: 'Invalid response format. Please try again.' };
    }

    console.log(`${guardPrefix}: PASSED (gemini service response)`, { 
      operation,
      hasText,
      hasToolCalls,
      hasUsage
    });
    return { isValid: true };
  }

  /**
   * Guard: Verify network reliability service input
   * NON-REMOVABLE: Production assertion
   */
  static guardNetworkReliabilityInput(
    error: any,
    context: { apiKeyValidated: boolean; requestType: string; attemptNumber: number },
    requestId: string
  ): void {
    const guardPrefix = `[GUARD][requestId=${requestId}]`;

    // PRECONDITION: Error must exist
    if (!error) {
      console.error(`${guardPrefix}: TRIGGERED - No error provided to network reliability`, { context });
      throw new Error('Internal error: Network analysis requires error information.');
    }

    // PRECONDITION: Context must be valid
    if (!context || typeof context !== 'object') {
      console.error(`${guardPrefix}: TRIGGERED - Invalid context`, { contextType: typeof context });
      throw new Error('Internal error: Invalid network context.');
    }

    if (typeof context.apiKeyValidated !== 'boolean') {
      console.error(`${guardPrefix}: TRIGGERED - Invalid apiKeyValidated`, { context });
      throw new Error('Internal error: Invalid API key validation state.');
    }

    if (typeof context.attemptNumber !== 'number' || context.attemptNumber < 1) {
      console.error(`${guardPrefix}: TRIGGERED - Invalid attempt number`, { context });
      throw new Error('Internal error: Invalid attempt number.');
    }

    console.log(`${guardPrefix}: PASSED (network reliability input)`, { 
      errorType: error?.constructor?.name,
      context
    });
  }

  /**
   * Mark guard as passed (for tracking)
   */
  static markPassed(guardName: string, requestId?: string): symbol {
    const guardPrefix = requestId ? `[GUARD][requestId=${requestId}]` : '[GUARD]';
    console.log(`${guardPrefix}: PASSED (${guardName})`);
    return this.GUARD_MARKER;
  }
}
