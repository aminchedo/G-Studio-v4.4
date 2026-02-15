/**
 * Self-Healing & Auto-Remediation Engine
 * 
 * Subscribes to system events and automatically attempts recovery.
 * Implements exponential backoff and escalation thresholds.
 */

import { LocalAIModelService } from './localAIModelService';
import { ContextDatabaseBridge } from './contextDatabaseBridge';
import { HybridDecisionEngine, ExecutionMode } from './hybridDecisionEngine';
import { AdversarialDetector } from './adversarialDetector';
import { ProductivityMetrics } from './productivityMetrics';
import { CircuitBreaker } from './circuitBreaker';
import { DegradedMode } from './degradedMode';
import { ModelValidationStore } from './modelValidationStore';

type HealingTrigger = 'GUARD' | 'CAPABILITY_CHECK' | 'DB' | 'LOCAL_MODEL' | 'MEMORY' | 'FALLBACK';

interface HealingAction {
  trigger: HealingTrigger;
  condition: (data: any) => boolean;
  action: () => Promise<void>;
  maxAttempts: number;
  backoffMs: number;
}

interface HealingAttempt {
  trigger: HealingTrigger;
  attempt: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export class SelfHealingEngine {
  private static enabled: boolean = true;
  private static attempts: Map<string, HealingAttempt[]> = new Map();
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly INITIAL_BACKOFF_MS = 1000;
  private static readonly MAX_BACKOFF_MS = 30000;

  /**
   * Initialize self-healing engine
   */
  static initialize(): void {
    // Subscribe to console logs for trigger detection
    this.subscribeToLogs();
    console.log('[SelfHealingEngine] Initialized');
  }

  /**
   * Subscribe to console logs to detect triggers
   */
  private static subscribeToLogs(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      this.checkLogForTriggers(args.join(' '));
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      this.checkLogForTriggers(args.join(' '));
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.checkLogForTriggers(args.join(' '));
    };
  }

  /**
   * Check log message for healing triggers
   * CRITICAL: Do NOT retry on CODE_BUG, quota exhaustion, or invalid requests
   * Respect circuit breakers to prevent retry storms
   * CRITICAL: Do NOT activate if API Model Test failed or zero usable models
   */
  private static checkLogForTriggers(message: string): void {
    if (!this.enabled) return;

    // ABSOLUTE PROHIBITION: Do NOT trigger self-healing when in degraded mode
    if (DegradedMode.isDegraded('gemini')) {
      return; // Cloud AI is unavailable - no self-healing attempts
    }

    // ABSOLUTE PROHIBITION: Do NOT activate if API Model Test failed or zero usable models
    // Extract API key from message if possible, or check globally
    try {
      // Try to get API key from global state or message context
      // For now, check if message indicates test failure
      if (message.includes('API_TEST_NOT_EXECUTED') || 
          message.includes('ZERO_USABLE_MODELS') ||
          message.includes('MODEL_NOT_ALLOWED_BY_API_TEST') ||
          message.includes('MODEL_REJECTED_DURING_TEST') ||
          message.includes('PROVIDER_EXHAUSTED')) {
        return; // API Model Test constraints violated - no self-healing
      }
    } catch (e) {
      // Silently fail if ModelValidationStore not available
    }

    // ABSOLUTE PROHIBITION: Do NOT trigger self-healing for terminal errors
    // CODE_BUG: Never self-heal
    if (message.includes('CODE_BUG') || message.includes('code bug') || message.includes('Code bug')) {
      return;
    }
    
    // QUOTA_EXHAUSTED / PROVIDER_LIMIT: Never self-heal
    if (message.includes('QUOTA_EXHAUSTED') ||
        message.includes('PROVIDER_LIMIT') ||
        message.includes('quota permanently exhausted') ||
        message.includes('quota exceeded') && (message.includes('limit: 0') || message.includes('limit = 0'))) {
      return;
    }
    
    // CORS errors: Check circuit breaker before self-healing
    if (message.includes('CORS') || message.includes('cors') || message.includes('cross-origin') || message.includes('failed to fetch')) {
      const circuitKey = this.extractCircuitKey(message);
      if (circuitKey && !CircuitBreaker.canAttempt(circuitKey)) {
        return; // Circuit breaker is open
      }
    }
    
    // 403 Forbidden: Check circuit breaker (likely auth/CORS issue)
    if (message.includes('403') || message.includes('forbidden')) {
      const circuitKey = this.extractCircuitKey(message);
      if (circuitKey && !CircuitBreaker.canAttempt(circuitKey)) {
        return; // Circuit breaker is open
      }
    }
    
    // INVALID_ARGUMENT (400): Never self-heal
    if (message.includes('400_INVALID_ARGUMENT') ||
        message.includes('400') && message.includes('invalid argument') ||
        message.includes('400') && message.includes('bad request') && !message.includes('invalid role')) {
      return;
    }
    
    // Invalid role errors: Never self-heal
    if (message.includes('Invalid role') ||
        message.includes('invalid role') ||
        message.includes('role: user, model') ||
        (message.includes('400') && (message.includes('invalid role') || message.includes('bad request')))) {
      return;
    }
    
    // Missing requestId: Never self-heal
    if (message.includes('requestId is required') ||
        message.includes('requestId must') ||
        message.includes('missing requestId') ||
        message.includes('requestId lost')) {
      return;
    }
    
    // CONFIG_FAILURE: Never self-heal
    if (message.includes('CONFIG_FAILURE') ||
        message.includes('API key is missing') ||
        message.includes('API key is invalid') ||
        message.includes('Configuration error')) {
      return;
    }

    // Check for triggers
    if (message.includes('[GUARD]: TRIGGERED')) {
      this.handleTrigger('GUARD', { message });
    } else if (message.includes('[CAPABILITY_CHECK]: FAILED') || message.includes('[CAPABILITY_CHECK]: DEGRADED')) {
      this.handleTrigger('CAPABILITY_CHECK', { message });
    } else if (message.includes('[DB]: ERROR')) {
      this.handleTrigger('DB', { message });
    } else if (message.includes('[LOCAL_MODEL]: ERROR')) {
      this.handleTrigger('LOCAL_MODEL', { message });
    } else if (message.includes('[MEMORY]: CRITICAL')) {
      this.handleTrigger('MEMORY', { message });
    } else if (message.includes('[FALLBACK]: ACTIVATED')) {
      // Only trigger if not a CODE_BUG or quota issue
      if (!message.includes('CODE_BUG') && !message.includes('QUOTA_EXHAUSTED') && !message.includes('PROVIDER_LIMIT')) {
        this.handleTrigger('FALLBACK', { message });
      }
    }
    
    // CRITICAL: Do NOT react to skipped verification messages
    // Skipped verification is an EXPECTED STATE during degraded mode, not a failure
    if (message.includes('[ContinuousVerification]') && 
        (message.includes('skipping') || message.includes('skipped') || message.includes('Provider Availability'))) {
      return; // Silently ignore - this is expected during degraded mode
    }
  }

  /**
   * Handle a healing trigger
   * ABSOLUTE PROHIBITION: CODE_BUG, QUOTA_EXHAUSTED, INVALID_ARGUMENT, Invalid role errors, Missing requestId
   */
  private static async handleTrigger(trigger: HealingTrigger, data: any): Promise<void> {
    // Safety check: Block prohibited cases even if they somehow passed checkLogForTriggers
    const message = data?.message || JSON.stringify(data).toLowerCase();
    if (message.includes('code_bug') || message.includes('quota_exhausted') || 
        message.includes('400_invalid_argument') || message.includes('invalid role') ||
        message.includes('requestid is required') || message.includes('config_failure')) {
      console.warn(`[SelfHealingEngine] Blocked prohibited trigger: ${trigger}`);
      return;
    }
    
    const key = `${trigger}_${Date.now()}`;
    const attempts = this.attempts.get(trigger) || [];
    
    // Check if we've exceeded max attempts
    const recentAttempts = attempts.filter(a => Date.now() - a.timestamp < 60000); // Last minute
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      console.warn(`[SelfHealingEngine] Max attempts reached for ${trigger}, skipping`);
      return;
    }

    console.log(`[SELF_HEAL]: ATTEMPT (${trigger})`);
    
    try {
      await this.executeHealingAction(trigger, data, recentAttempts.length);
      
      // Record success
      attempts.push({
        trigger,
        attempt: recentAttempts.length + 1,
        timestamp: Date.now(),
        success: true,
      });
      this.attempts.set(trigger, attempts);
      
      console.log(`[SELF_HEAL]: SUCCESS (${trigger})`);
    } catch (error) {
      // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
      // Use centralized isFatalError helper for consistent detection
      const { isFatalError } = await import('./fatalAIError');
      if (isFatalError(error)) {
        console.error(`[SELF_HEAL]: FATAL_ERROR_DETECTED (${trigger}) - terminating pipeline`, (error as any).message);
        throw error; // ⛔️ VERY IMPORTANT: Rethrow to stop execution - NO HEALING ALLOWED
      }
      
      // Record failure (only for non-fatal errors)
      attempts.push({
        trigger,
        attempt: recentAttempts.length + 1,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.attempts.set(trigger, attempts);
      
      console.error(`[SELF_HEAL]: FAILED (${trigger})`, error);
      console.log(`[SELF_HEAL]: FAILED (${trigger})`);
    }
  }

  /**
   * Execute healing action based on trigger
   */
  private static async executeHealingAction(
    trigger: HealingTrigger,
    data: any,
    attemptNumber: number
  ): Promise<void> {
    // Check if this is an adversarial scenario
    if (data.step && typeof data.step === 'object' && data.step.description) {
      const adversarialCheck = AdversarialDetector.detect(data.step.description);
      if (adversarialCheck.isAdversarial && adversarialCheck.confidence > 0.8) {
        // High confidence adversarial - block self-healing
        console.warn(`[SELF_HEAL]: BLOCKED (adversarial detected: ${adversarialCheck.type})`);
        throw new Error('Self-healing blocked due to adversarial detection');
      }
    }
    
    // Calculate exponential backoff
    const backoffMs = Math.min(
      this.INITIAL_BACKOFF_MS * Math.pow(2, attemptNumber),
      this.MAX_BACKOFF_MS
    );

    // Wait for backoff
    if (attemptNumber > 0) {
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    switch (trigger) {
      case 'LOCAL_MODEL':
        // Try to unload and reload model
        if (LocalAIModelService.getStatus() === 'ERROR') {
          try {
            await LocalAIModelService.unloadModel();
            // Don't auto-reload - let user decide
          } catch (error) {
            // Ignore unload errors
          }
        }
        break;

      case 'DB':
        // Try to reinitialize database
        try {
          await ContextDatabaseBridge.init();
        } catch (error) {
          // If init fails, try creating new session
          await ContextDatabaseBridge.createSession('CLOUD', 'gemini');
        }
        break;

      case 'CAPABILITY_CHECK':
        // Downgrade execution mode if capability degraded
        if (data.message?.includes('DEGRADED')) {
          // Force CLOUD mode for degraded local AI
          await HybridDecisionEngine.setUserPreference('CLOUD');
        }
        break;

      case 'MEMORY':
        // Trigger aggressive context trimming
        const sessionId = await ContextDatabaseBridge.getCurrentSession();
        if (sessionId) {
          await ContextDatabaseBridge.trimContext(sessionId, 3000);
        }
        break;

      case 'FALLBACK':
        // Fallback already activated, no action needed
        break;

      case 'GUARD':
        // Guard violations are logged but may not need healing
        // Depends on the specific guard
        break;
    }
  }

  /**
   * Manually trigger healing for a specific component
   * ABSOLUTE PROHIBITION: Never heal on quota exhaustion, CODE_BUG, CONFIG_FAILURE, or invalid requests
   * CRITICAL: One-shot execution path - once tripped, engine must exit cleanly
   */
  static async triggerHealing(trigger: HealingTrigger, data?: any): Promise<boolean> {
    // CRITICAL: Explicit guard to prevent healing on terminal errors
    const message = data?.message || JSON.stringify(data || {}).toLowerCase();
    const requestId = data?.requestId || (data?.error as any)?.requestId;
    
    // CRITICAL: Check for terminal failures first (quota exhaustion, etc.)
    if (requestId) {
      const { ContinuousVerification } = await import('./continuousVerification');
      if (ContinuousVerification.hasTerminalFailure(requestId)) {
        console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: terminal failure detected for requestId=${requestId}`);
        return false;
      }
    }
    
    // Block healing on quota exhaustion
    if (message.includes('quota_exhausted') || 
        message.includes('quota permanently exhausted') ||
        message.includes('api quota exhausted') ||
        (message.includes('quota') && (message.includes('exceeded') || message.includes('exhausted')) && 
         (message.includes('limit: 0') || message.includes('limit = 0')))) {
      console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: quota exhaustion detected`);
      return false;
    }
    
    // Block healing on CODE_BUG
    if (message.includes('code_bug') || message.includes('code bug') || message.includes('Code bug')) {
      console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: CODE_BUG detected`);
      return false;
    }
    
    // Block healing on CONFIG_FAILURE
    if (message.includes('config_failure') || 
        message.includes('api key is missing') ||
        message.includes('api key is invalid') ||
        message.includes('configuration error')) {
      console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: CONFIG_FAILURE detected`);
      return false;
    }
    
    // Block healing on 400 INVALID_ARGUMENT
    if (message.includes('400_invalid_argument') ||
        (message.includes('400') && message.includes('invalid argument')) ||
        (message.includes('400') && message.includes('bad request') && !message.includes('invalid role'))) {
      console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: 400 INVALID_ARGUMENT detected`);
      return false;
    }
    
    // Block healing on invalid role errors
    if (message.includes('invalid role') ||
        message.includes('role: user, model')) {
      console.warn(`[SelfHealingEngine] Blocked healing trigger ${trigger}: invalid role detected`);
      return false;
    }
    
    try {
      await this.handleTrigger(trigger, data || {});
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get healing history
   */
  static getHealingHistory(trigger?: HealingTrigger): HealingAttempt[] {
    if (trigger) {
      return this.attempts.get(trigger) || [];
    }
    // Return all attempts
    const all: HealingAttempt[] = [];
    for (const attempts of this.attempts.values()) {
      all.push(...attempts);
    }
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Enable or disable self-healing
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Extract circuit breaker key from log message
   */
  private static extractCircuitKey(message: string): string | null {
    const modelMatch = message.match(/model[=:]\s*([^\s,]+)/i);
    const apiKeyMatch = message.match(/api[_-]?key[=:]\s*([A-Za-z0-9]{8})/i);
    
    if (modelMatch && apiKeyMatch) {
      return `model:${modelMatch[1]}:${apiKeyMatch[1]}`;
    }
    
    return 'generic:all';
  }
}

// Initialize on import
SelfHealingEngine.initialize();
