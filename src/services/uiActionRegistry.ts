/**
 * UI Action Registry
 * 
 * Central registry for all UI actions that can be bound at runtime.
 * This allows the self-healing system to bind handlers to broken buttons.
 */

interface ActionHandler {
  (event: Event, requestId?: string): void | Promise<void>;
}

class UIActionRegistry {
  private static instance: UIActionRegistry;
  private actions: Map<string, ActionHandler> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): UIActionRegistry {
    if (!UIActionRegistry.instance) {
      UIActionRegistry.instance = new UIActionRegistry();
    }
    return UIActionRegistry.instance;
  }

  /**
   * Register an action handler
   */
  register(action: string, handler: ActionHandler): void {
    this.actions.set(action, handler);
    console.log(`[UIActionRegistry] Registered action: ${action}`);
  }

  /**
   * Get action handler
   */
  get(action: string): ActionHandler | null {
    return this.actions.get(action) || null;
  }

  /**
   * Check if action is registered
   */
  has(action: string): boolean {
    return this.actions.has(action);
  }

  /**
   * List all registered actions
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }
}

// Export singleton
export const uiActionRegistry = UIActionRegistry.getInstance();

// Expose to window for runtime access
if (typeof window !== 'undefined') {
  (window as any).__uiActionRegistry = uiActionRegistry;
}
