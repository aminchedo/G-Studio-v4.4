/**
 * Degraded Mode Manager
 * Tracks when Cloud AI is unavailable and enforces cooldown periods
 * 
 * GLOBAL LOCK SEMANTICS:
 * When provider-level exhaustion is detected:
 * - ALL models are blocked
 * - ALL retries are blocked
 * - ALL future calls are blocked
 * - Requires EXPLICIT user action (API Model Test rerun or API key change) to unlock
 * - NO automatic recovery is allowed
 */

import { ProviderLimitResult } from './providerLimit';

interface DegradedState {
  readonly isDegraded: boolean;
  readonly provider: string;
  readonly degradedAt: number;
  readonly cooldownUntil: number;
  lastNotification: number;
  readonly requiresUserAction: boolean; // If true, no automatic recovery
}

export class DegradedMode {
  private static state: Map<string, DegradedState> = new Map();
  private static readonly NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
  
  /**
   * GLOBAL LOCK: Enter degraded mode for a provider
   * Once entered, provider is BLOCKED until explicit user action
   */
  static enterDegradedMode(provider: string, cooldownUntil: number): void {
    const state: DegradedState = {
      isDegraded: true,
      provider,
      degradedAt: Date.now(),
      cooldownUntil,
      lastNotification: 0,
      requiresUserAction: true // ALWAYS require user action - no automatic recovery
    };
    this.state.set(provider, state);
    console.log(`[DegradedMode] GLOBAL_LOCK: Entered degraded mode for ${provider} until ${new Date(cooldownUntil).toISOString()}`);
    console.log(`[DegradedMode] REQUIRES_USER_ACTION: API Model Test must be rerun to unlock`);
  }

  /**
   * Check if provider is in degraded mode
   * IMPORTANT: Cooldown expiry does NOT automatically unlock if requiresUserAction is true
   */
  static isDegraded(provider: string = 'gemini'): boolean {
    const state = this.state.get(provider);
    if (!state || !state.isDegraded) {
      return false;
    }

    // GLOBAL LOCK: If user action is required, do NOT auto-unlock on cooldown expiry
    if (state.requiresUserAction) {
      return true; // Stay locked until explicit user action
    }

    // Legacy behavior: Check if cooldown has expired (only if requiresUserAction is false)
    if (Date.now() >= state.cooldownUntil) {
      this.state.delete(provider);
      console.log(`[DegradedMode] Cooldown expired for ${provider}, exiting degraded mode`);
      return false;
    }

    return true;
  }

  static shouldShowNotification(provider: string = 'gemini'): boolean {
    const state = this.state.get(provider);
    if (!state || !state.isDegraded) {
      return false;
    }

    const now = Date.now();
    if (now - state.lastNotification < this.NOTIFICATION_COOLDOWN_MS) {
      return false; // Still in notification cooldown
    }

    state.lastNotification = now;
    this.state.set(provider, state);
    return true;
  }

  static getDegradedMessage(provider: string = 'gemini'): string | null {
    if (!this.isDegraded(provider)) {
      return null;
    }
    return 'Cloud AI is temporarily unavailable due to quota exhaustion. Please run "API Model Test" to check model availability.';
  }

  /**
   * Exit degraded mode - ONLY called by explicit user action
   * This should be called when:
   * 1. User runs API Model Test again
   * 2. User changes API key
   * 
   * NEVER call this automatically - it defeats the global lock
   */
  static exitDegradedMode(provider: string = 'gemini'): void {
    const state = this.state.get(provider);
    if (state) {
      console.log(`[DegradedMode] GLOBAL_UNLOCK: Exiting degraded mode for ${provider} (user action)`);
    }
    this.state.delete(provider);
  }

  /**
   * Reset all degraded states - ONLY for testing or explicit user action
   */
  static reset(): void {
    console.log(`[DegradedMode] GLOBAL_RESET: Clearing all degraded states`);
    this.state.clear();
  }

  /**
   * Check if provider is available (not degraded, not in cooldown)
   * This is the SINGLE source of truth for provider availability
   */
  static isProviderAvailable(provider: string = 'gemini'): boolean {
    return !this.isDegraded(provider);
  }
}
