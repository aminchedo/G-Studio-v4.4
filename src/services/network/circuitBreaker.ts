/**
 * Circuit Breaker Pattern
 * Prevents retry storms and cascading failures
 */

export interface CircuitState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  consecutiveFailures: number;
}

export class CircuitBreaker {
  private static circuits: Map<string, CircuitState> = new Map();
  
  private static readonly FAILURE_THRESHOLD = 3;
  private static readonly TIMEOUT_MS = 30000; // 30 seconds
  private static readonly HALF_OPEN_TIMEOUT_MS = 10000; // 10 seconds

  static getState(key: string): CircuitState {
    const state = this.circuits.get(key);
    if (!state) {
      return {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        consecutiveFailures: 0
      };
    }
    return state;
  }

  static recordSuccess(key: string): void {
    const state = this.getState(key);
    state.isOpen = false;
    state.failureCount = 0;
    state.consecutiveFailures = 0;
    state.nextAttemptTime = 0;
    this.circuits.set(key, state);
  }

  static recordFailure(key: string, isPermanent: boolean = false): void {
    const state = this.getState(key);
    state.failureCount++;
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();

    // Permanent failures (quota exhausted, CORS, 403) open circuit immediately
    if (isPermanent) {
      state.isOpen = true;
      state.nextAttemptTime = Date.now() + this.TIMEOUT_MS;
      this.circuits.set(key, state);
      return;
    }

    // Transient failures: open after threshold
    if (state.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      state.isOpen = true;
      state.nextAttemptTime = Date.now() + this.TIMEOUT_MS;
    }

    this.circuits.set(key, state);
  }

  static canAttempt(key: string): boolean {
    const state = this.getState(key);
    
    if (!state.isOpen) {
      return true;
    }

    // Check if we can try half-open state
    if (Date.now() >= state.nextAttemptTime) {
      // Allow one attempt in half-open state
      state.nextAttemptTime = Date.now() + this.HALF_OPEN_TIMEOUT_MS;
      this.circuits.set(key, state);
      return true;
    }

    return false;
  }

  static reset(key: string): void {
    this.circuits.delete(key);
  }

  static resetAll(): void {
    this.circuits.clear();
  }
}
