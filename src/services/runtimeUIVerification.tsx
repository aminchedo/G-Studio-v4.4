/**
 * Runtime UI Verification, Binding Enforcement & Self-Healing Service
 * 
 * This service runs ONLY at runtime and verifies that every UI interaction
 * produces a real, measurable effect. It auto-fixes broken bindings.
 * 
 * CRITICAL INVARIANTS:
 * - requestId MUST be derived from parent, never generated
 * - Verification requires explicit intent with expectedEffect
 * - Self-healing only allowed with intent and expectedEffect
 * - Max 1-2 verification attempts per interaction
 * - NO_OP is valid and must not trigger self-healing
 */

/**
 * Verification Intent (MANDATORY for verification)
 * Verification is FORBIDDEN unless explicit intent exists
 */
export interface VerificationIntent {
  source: 'USER_ACTION' | 'AI_OUTPUT' | 'STATE_CHANGE';
  expectedEffect?: 'DOM_CHANGE' | 'STATE_UPDATE' | 'NAVIGATION';
  parentRequestId?: string; // Required to derive requestId
}

interface UIElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'select' | 'custom';
  label: string;
  component: string;
  handler: string | null;
  hasHandler: boolean;
  isClickable: boolean;
  lastInteraction?: {
    requestId: string;
    timestamp: number;
    effect: 'success' | 'failure' | 'no-effect';
  };
  verificationAttempts?: number; // Track attempts to prevent loops
}

interface InteractionTrace {
  requestId: string;
  elementId: string;
  timestamp: number;
  handler: string | null;
  executionPath: string[];
  effect: 'success' | 'failure' | 'no-effect' | 'NO_OP';
  effectDetails?: any;
  intent?: VerificationIntent;
}

class RuntimeUIVerification {
  private static instance: RuntimeUIVerification;
  private uiElements: Map<string, UIElement> = new Map();
  private interactionTraces: InteractionTrace[] = [];
  private observers: MutationObserver[] = [];
  private clickHandlers: Map<string, Set<Function>> = new Map();
  private isInitialized = false;
  private codeBugRequests: Set<string> = new Set(); // Track requests with CODE_BUG
  private verificationAttempts: Map<string, number> = new Map(); // Track verification attempts per requestId

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): RuntimeUIVerification {
    if (!RuntimeUIVerification.instance) {
      RuntimeUIVerification.instance = new RuntimeUIVerification();
    }
    return RuntimeUIVerification.instance;
  }

  /**
   * Initialize runtime verification - MUST be called at app startup
   */
  initialize(): void {
    if (this.isInitialized) {
      // React StrictMode intentionally double-invokes effects in dev mode
      if (import.meta.env.DEV) {
        console.debug('[RuntimeUIVerification] Skipped duplicate init (StrictMode)');
      }
      return;
    }

    console.log('[RuntimeUIVerification] Initializing runtime UI verification...');

    // Hook into global event system
    this.setupGlobalEventHooks();
    
    // Discover existing UI elements
    this.discoverUIElements();
    
    // Setup mutation observer for dynamic UI
    this.setupMutationObserver();
    
    // Setup periodic verification
    this.setupPeriodicVerification();
    
    // Inject runtime assertions
    this.injectRuntimeAssertions();

    this.isInitialized = true;
    console.log('[RuntimeUIVerification] ✅ Runtime verification active');
  }

  /**
   * Derive requestId from parent (FORBIDDEN to generate new requestId)
   * CRITICAL: requestId MUST come from UI layer, never generated here
   */
  private deriveRequestId(parentRequestId?: string): string | null {
    if (!parentRequestId) {
      // No parent requestId - this is a CODE_BUG if verification is attempted
      console.error('[RuntimeUIVerification] Attempted verification without parent requestId - CODE_BUG');
      return null;
    }
    // Derive: parent:ui
    return `${parentRequestId}:ui`;
  }

  /**
   * Setup global event hooks for all interactions
   * CRITICAL: No verification without explicit intent
   */
  private setupGlobalEventHooks(): void {
    // Hook into click events (only for tracking, not verification)
    // Verification requires explicit intent via verifyInteraction()
    document.addEventListener('click', (e) => {
      // Only track, don't verify without intent
      const target = e.target as HTMLElement;
      if (target && !target.hasAttribute('data-runtime-verified')) {
        // Store interaction for potential verification (if intent provided later)
        // But do NOT verify here - requires explicit intent
      }
    }, true); // Use capture phase

    // Hook into pointer events (tracking only)
    document.addEventListener('pointerdown', (e) => {
      // Tracking only, no verification without intent
    }, true);

    // Hook into keyboard shortcuts (tracking only)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Tracking only, no verification without intent
      }
    }, true);

    console.log('[RuntimeUIVerification] Global event hooks installed (tracking only, verification requires explicit intent)');
  }

  /**
   * Public API: Verify interaction with explicit intent
   * CRITICAL: This is the ONLY way to trigger verification
   */
  static verifyInteraction(
    element: HTMLElement,
    intent: VerificationIntent,
    event?: Event
  ): void {
    const instance = RuntimeUIVerification.getInstance();
    
    // CRITICAL: Intent with expectedEffect is mandatory
    if (!intent || !intent.expectedEffect) {
      // NO_OP - valid state, no verification
      console.debug('[RuntimeUIVerification] Verification skipped - no expectedEffect (NO_OP)');
      return;
    }

    // CRITICAL: Parent requestId is mandatory
    if (!intent.parentRequestId) {
      console.error('[RuntimeUIVerification] CODE_BUG: Verification attempted without parent requestId');
      return;
    }

    // Derive requestId from parent
    const requestId = instance.deriveRequestId(intent.parentRequestId);
    if (!requestId) {
      console.error('[RuntimeUIVerification] CODE_BUG: Failed to derive requestId');
      return;
    }

    // Check verification attempt limit
    const attempts = instance.verificationAttempts.get(requestId) || 0;
    if (attempts >= 2) {
      console.warn(`[RuntimeUIVerification][requestId=${requestId}] Max verification attempts reached (${attempts})`);
      return;
    }
    instance.verificationAttempts.set(requestId, attempts + 1);

    // Handle interaction with intent
    instance.handleInteraction(
      event || new Event('verify'),
      'verification',
      intent
    );
  }

  /**
   * Handle any UI interaction
   * CRITICAL: Only verifies if intent with expectedEffect exists
   */
  private handleInteraction(event: Event, type: string, intent?: VerificationIntent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Skip if it's our own instrumentation
    if (target.hasAttribute('data-runtime-verified')) return;

    // CRITICAL: Verification requires explicit intent with expectedEffect
    if (!intent || !intent.expectedEffect) {
      // NO_OP - valid state, no verification needed
      return;
    }

    // Derive requestId from parent (FORBIDDEN to generate)
    const requestId = this.deriveRequestId(intent.parentRequestId);
    if (!requestId) {
      // CODE_BUG: Missing parent requestId
      console.error('[RuntimeUIVerification] CODE_BUG: Verification attempted without parent requestId');
      return;
    }

    const elementId = this.getElementId(target);

    // Check verification attempt limit (max 2)
    const attempts = this.verificationAttempts.get(requestId) || 0;
    if (attempts >= 2) {
      console.warn(`[RuntimeUIVerification][requestId=${requestId}] Max verification attempts reached (${attempts}), skipping`);
      return;
    }
    this.verificationAttempts.set(requestId, attempts + 1);

    // Log interaction
    console.log(`[RuntimeUIVerification][requestId=${requestId}] Interaction detected:`, {
      type,
      elementId,
      target: target.tagName,
      className: target.className,
      intent: intent.source,
      expectedEffect: intent.expectedEffect
    });

    // Trace execution with intent
    this.traceInteraction(requestId, elementId, target, event, intent);
  }

  /**
   * Trace interaction execution path
   * CRITICAL: Requires intent with expectedEffect
   */
  private traceInteraction(requestId: string, elementId: string, element: HTMLElement, event: Event, intent?: VerificationIntent): void {
    // CRITICAL: Intent with expectedEffect is mandatory
    if (!intent || !intent.expectedEffect) {
      // NO_OP - valid state, no verification
      return;
    }

    const trace: InteractionTrace = {
      requestId,
      elementId,
      timestamp: Date.now(),
      handler: null,
      executionPath: [],
      effect: 'NO_OP', // Default to NO_OP
      intent
    };

    // Check if element has handler
    const hasHandler = this.checkHandler(element, event);
    trace.handler = hasHandler ? 'bound' : null;

    // Monitor for effects (only if expectedEffect exists)
    const effectDetected = this.monitorEffect(requestId, element, trace, intent.expectedEffect);

    // Update trace effect based on monitoring result
    // Note: monitorEffect is async, so effectDetected may be false initially
    // The async setTimeout will update trace.effect

    // Store trace
    this.interactionTraces.push(trace);

    // CRITICAL: Self-healing rules (STRICT)
    // Allowed ONLY IF:
    // 1. Intent exists (already checked)
    // 2. expectedEffect exists (already checked)
    // 3. Effect not detected
    // 4. No handler
    // 5. NOT CODE_BUG
    // 6. NOT NO_OP (NO_OP is valid, not a failure)
    // 7. NOT CONFIG_ERROR
    const isCodeBug = this.isCodeBugDetected(requestId);
    const isNoOp = trace.effect === 'NO_OP' || (!effectDetected && !intent.expectedEffect);
    
    // Use setTimeout to check effect after async monitoring completes
    setTimeout(() => {
      const finalEffect = trace.effect;
      const finalEffectDetected = finalEffect === 'success';
      
      if (!finalEffectDetected && !hasHandler && !isCodeBug && !isNoOp && intent.expectedEffect) {
        // Self-healing allowed
        console.warn(`[RuntimeUIVerification][requestId=${requestId}] ⚠️ No effect detected, attempting self-healing...`);
        this.attemptSelfHealing(requestId, element, trace);
      } else if (isCodeBug) {
        console.warn(`[RuntimeUIVerification][requestId=${requestId}] ⚠️ CODE_BUG detected - skipping self-healing to prevent infinite loops`);
      } else if (isNoOp || finalEffect === 'NO_OP') {
        // NO_OP is valid - no action needed
        console.debug(`[RuntimeUIVerification][requestId=${requestId}] NO_OP - no expectedEffect or valid state, skipping self-healing`);
      }
    }, 150); // Wait for async monitoring to complete

    // Update element record
    const uiElement = this.uiElements.get(elementId);
    if (uiElement) {
      uiElement.lastInteraction = {
        requestId,
        timestamp: Date.now(),
        effect: effectDetected ? 'success' : 'no-effect'
      };
      uiElement.verificationAttempts = (uiElement.verificationAttempts || 0) + 1;
    }
  }

  /**
   * Check if element has a bound handler
   */
  private checkHandler(element: HTMLElement, event: Event): boolean {
    // Check React event handlers (via __reactInternalInstance or similar)
    const reactInstance = (element as any).__reactInternalInstance || 
                         (element as any)._reactInternalFiber ||
                         (element as any).__reactFiber;
    
    if (reactInstance) {
      // React element has handlers
      return true;
    }

    // Check native event listeners
    const listeners = (element as any).__eventListeners;
    if (listeners && listeners.length > 0) {
      return true;
    }

    // Check onclick attribute
    if (element.onclick || element.getAttribute('onclick')) {
      return true;
    }

    // Check data attributes for handlers
    if (element.getAttribute('data-handler') || element.getAttribute('data-onclick')) {
      return true;
    }

    return false;
  }

  /**
   * Monitor for measurable effects after interaction
   * CRITICAL: Requires expectedEffect to be specified
   */
  private monitorEffect(requestId: string, element: HTMLElement, trace: InteractionTrace, expectedEffect: string): boolean {
    // CRITICAL: expectedEffect is mandatory
    if (!expectedEffect) {
      // NO_OP - valid state
      trace.effect = 'NO_OP';
      return false;
    }

    const stateBefore = this.captureState();
    
    // Wait a bit for async effects (max 100ms)
    setTimeout(() => {
      const stateAfter = this.captureState();
      
      // Check based on expectedEffect type
      switch (expectedEffect) {
        case 'DOM_CHANGE':
          const stateChanged = this.compareState(stateBefore, stateAfter);
          if (stateChanged) {
            trace.effect = 'success';
            trace.effectDetails = { type: 'dom-change', changes: stateChanged };
            console.log(`[RuntimeUIVerification][requestId=${requestId}] ✅ Effect detected: DOM change`);
          } else {
            const modalOpened = document.querySelector('[role="dialog"], .modal, [data-modal]');
            if (modalOpened) {
              trace.effect = 'success';
              trace.effectDetails = { type: 'modal-opened', modal: modalOpened };
              console.log(`[RuntimeUIVerification][requestId=${requestId}] ✅ Effect detected: modal opened`);
            } else {
              trace.effect = 'NO_OP';
              console.debug(`[RuntimeUIVerification][requestId=${requestId}] NO_OP: No DOM change detected`);
            }
          }
          break;

        case 'STATE_UPDATE':
          const stateChanged2 = this.compareState(stateBefore, stateAfter);
          if (stateChanged2) {
            trace.effect = 'success';
            trace.effectDetails = { type: 'state-update', changes: stateChanged2 };
            console.log(`[RuntimeUIVerification][requestId=${requestId}] ✅ Effect detected: state update`);
          } else {
            trace.effect = 'NO_OP';
            console.debug(`[RuntimeUIVerification][requestId=${requestId}] NO_OP: No state update detected`);
          }
          break;

        case 'NAVIGATION':
          const urlChanged = window.location.href !== (window as any).__previousUrl;
          if (urlChanged) {
            trace.effect = 'success';
            trace.effectDetails = { type: 'navigation', url: window.location.href };
            console.log(`[RuntimeUIVerification][requestId=${requestId}] ✅ Effect detected: navigation`);
          } else {
            trace.effect = 'NO_OP';
            console.debug(`[RuntimeUIVerification][requestId=${requestId}] NO_OP: No navigation detected`);
          }
          (window as any).__previousUrl = window.location.href;
          break;

        default:
          trace.effect = 'NO_OP';
          console.debug(`[RuntimeUIVerification][requestId=${requestId}] NO_OP: Unknown expectedEffect: ${expectedEffect}`);
      }
    }, 100);

    // Return false initially (async check updates trace)
    return false;
  }

  /**
   * Capture current application state
   */
  private captureState(): any {
    return {
      url: window.location.href,
      openModals: document.querySelectorAll('[role="dialog"], .modal, [data-modal]').length,
      activeFile: (window as any).__activeFile || null,
      files: (window as any).__files ? Object.keys((window as any).__files).length : 0,
      messages: (window as any).__messages ? (window as any).__messages.length : 0,
      timestamp: Date.now()
    };
  }

  /**
   * Compare two states
   */
  private compareState(before: any, after: any): any {
    const changes: any = {};
    
    if (before.url !== after.url) changes.url = { before: before.url, after: after.url };
    if (before.openModals !== after.openModals) changes.modals = { before: before.openModals, after: after.openModals };
    if (before.activeFile !== after.activeFile) changes.activeFile = { before: before.activeFile, after: after.activeFile };
    if (before.files !== after.files) changes.files = { before: before.files, after: after.files };
    if (before.messages !== after.messages) changes.messages = { before: before.messages, after: after.messages };

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Detect file operations
   */
  private detectFileOperations(before: any, after: any): string[] {
    const operations: string[] = [];
    
    if (after.files > before.files) operations.push('file-created');
    if (after.files < before.files) operations.push('file-deleted');
    if (after.activeFile !== before.activeFile && after.activeFile) operations.push('file-opened');
    
    return operations;
  }

  /**
   * Check if CODE_BUG is detected for a request (prevents infinite self-healing loops)
   */
  private isCodeBugDetected(requestId: string): boolean {
    // Check if this request has been marked as CODE_BUG
    if (this.codeBugRequests.has(requestId)) {
      return true;
    }
    
    // Check global CODE_BUG marker (set by geminiService when CODE_BUG is detected)
    try {
      const globalCodeBugMarker = (globalThis as any).__codeBugRequests;
      if (globalCodeBugMarker && globalCodeBugMarker.has(requestId)) {
        this.codeBugRequests.add(requestId); // Cache locally
        return true;
      }
    } catch {
      // Silently fail if global marker not available
    }
    
    return false;
  }

  /**
   * Mark a request as CODE_BUG (called by error handlers)
   */
  static markCodeBug(requestId: string): void {
    const instance = RuntimeUIVerification.getInstance();
    instance.codeBugRequests.add(requestId);
    
    // Also set global marker for cross-module access
    if (!(globalThis as any).__codeBugRequests) {
      (globalThis as any).__codeBugRequests = new Set<string>();
    }
    (globalThis as any).__codeBugRequests.add(requestId);
  }

  /**
   * Attempt to self-heal broken bindings
   */
  private attemptSelfHealing(requestId: string, element: HTMLElement, trace: InteractionTrace): void {
    const elementId = this.getElementId(element);
    const label = this.getElementLabel(element);

    console.log(`[RuntimeUIVerification][requestId=${requestId}] 🔧 Attempting self-healing for: ${label}`);

    // Try to infer action from element
    const action = this.inferAction(element, label);
    
    if (action) {
      // Bind handler based on inferred action
      this.bindHandler(element, action, requestId);
      trace.executionPath.push('self-healed');
    } else {
      // If we can't infer, show user feedback
      this.showUserFeedback(element, 'This action requires configuration. Please check settings.');
      trace.effect = 'failure';
      trace.effectDetails = { type: 'requires-config' };
    }
  }

  /**
   * Infer action from element
   */
  private inferAction(element: HTMLElement, label: string): string | null {
    const labelLower = label.toLowerCase();
    
    // Map common patterns
    if (labelLower.includes('new file') || labelLower.includes('create')) return 'new-file';
    if (labelLower.includes('save')) return 'save-file';
    if (labelLower.includes('format')) return 'format-file';
    if (labelLower.includes('run') || labelLower.includes('execute')) return 'run-code';
    if (labelLower.includes('settings') || labelLower.includes('config')) return 'open-settings';
    if (labelLower.includes('close')) return 'close';
    if (labelLower.includes('delete')) return 'delete';
    if (labelLower.includes('undo')) return 'undo';
    if (labelLower.includes('redo')) return 'redo';
    if (labelLower.includes('find') || labelLower.includes('search')) return 'find';
    
    // Check data attributes
    const dataAction = element.getAttribute('data-action');
    if (dataAction) return dataAction;

    return null;
  }

  /**
   * Bind handler to element
   */
  private bindHandler(element: HTMLElement, action: string, requestId: string): void {
    console.log(`[RuntimeUIVerification][requestId=${requestId}] Binding handler for action: ${action}`);

    // Get action handler from global registry
    const handler = this.getActionHandler(action);
    
    if (handler) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }, { once: false });
      
      element.setAttribute('data-runtime-verified', 'true');
      element.setAttribute('data-action', action);
      
      console.log(`[RuntimeUIVerification][requestId=${requestId}] ✅ Handler bound successfully`);
    } else {
      console.warn(`[RuntimeUIVerification][requestId=${requestId}] ⚠️ No handler found for action: ${action}`);
    }
  }

  /**
   * Get action handler from global registry
   */
  private getActionHandler(action: string): ((e: Event) => void) | null {
    // Check global action registry
    const registry = (window as any).__uiActionRegistry;
    if (registry && registry[action]) {
      return registry[action];
    }

    // Check React component handlers (if available)
    const reactHandlers = (window as any).__reactHandlers;
    if (reactHandlers && reactHandlers[action]) {
      return reactHandlers[action];
    }

    return null;
  }

  /**
   * Show user feedback for broken actions
   */
  private showUserFeedback(element: HTMLElement, message: string): void {
    // Use notification system if available
    if (typeof window !== 'undefined' && (window as any).showWarning) {
      (window as any).showWarning(message);
    } else if (typeof window !== 'undefined' && (window as any).showError) {
      (window as any).showError(message);
    } else {
      // Fallback to console
      console.warn(`[RuntimeUIVerification] ${message}`);
    }
  }

  /**
   * Discover all UI elements in the DOM
   */
  private discoverUIElements(): void {
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      '[data-action]',
      '[onclick]',
      '.ribbon-button',
      '.toolbar-button'
    ];

    interactiveSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const elementId = this.getElementId(htmlElement);
        
        if (!this.uiElements.has(elementId)) {
          const uiElement: UIElement = {
            id: elementId,
            type: this.getElementType(htmlElement),
            label: this.getElementLabel(htmlElement),
            component: this.getComponentName(htmlElement),
            handler: null,
            hasHandler: this.checkHandler(htmlElement, new Event('click')),
            isClickable: !htmlElement.hasAttribute('disabled') && !htmlElement.classList.contains('disabled')
          };

          this.uiElements.set(elementId, uiElement);
        }
      });
    });

    console.log(`[RuntimeUIVerification] Discovered ${this.uiElements.size} UI elements`);
  }

  /**
   * Setup mutation observer for dynamic UI
   */
  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              // Re-discover UI elements when new ones are added
              setTimeout(() => this.discoverUIElements(), 100);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
    console.log('[RuntimeUIVerification] Mutation observer installed');
  }

  /**
   * Setup periodic verification
   */
  private setupPeriodicVerification(): void {
    setInterval(() => {
      this.verifyAllBindings();
    }, 30000); // Every 30 seconds

    console.log('[RuntimeUIVerification] Periodic verification scheduled');
  }

  /**
   * Verify all UI bindings
   */
  private verifyAllBindings(): void {
    let broken = 0;
    let working = 0;

    this.uiElements.forEach((element, id) => {
      const domElement = document.querySelector(`[data-ui-id="${id}"]`) as HTMLElement;
      if (!domElement) return;

      const hasHandler = this.checkHandler(domElement, new Event('click'));
      if (element.isClickable && !hasHandler) {
        broken++;
        console.warn(`[RuntimeUIVerification] ⚠️ Broken binding: ${element.label}`);
      } else {
        working++;
      }
    });

    console.log(`[RuntimeUIVerification] Verification: ${working} working, ${broken} broken`);
  }

  /**
   * Inject runtime assertions
   */
  private injectRuntimeAssertions(): void {
    // Override console methods to detect console-only effects
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    // Track console usage per requestId
    (window as any).__consoleEffects = new Map();

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      // Console.log is NOT a valid effect - flag it
      const requestId = (window as any).__currentRequestId;
      if (requestId) {
        const effects = (window as any).__consoleEffects.get(requestId) || [];
        effects.push({ type: 'console-log', args });
        (window as any).__consoleEffects.set(requestId, effects);
      }
    };

    console.log('[RuntimeUIVerification] Runtime assertions injected');
  }

  /**
   * Get unique element ID
   */
  private getElementId(element: HTMLElement): string {
    // Use existing ID or generate one
    if (element.id) return element.id;
    
    const generatedId = `ui-${element.tagName}-${Array.from(element.classList).join('-')}-${Math.random().toString(36).substring(2, 9)}`;
    element.setAttribute('data-ui-id', generatedId);
    return generatedId;
  }

  /**
   * Get element label
   */
  private getElementLabel(element: HTMLElement): string {
    return element.textContent?.trim() || 
           element.getAttribute('aria-label') || 
           element.getAttribute('title') || 
           element.getAttribute('data-label') ||
           element.tagName;
  }

  /**
   * Get element type
   */
  private getElementType(element: HTMLElement): UIElement['type'] {
    if (element.tagName === 'BUTTON') return 'button';
    if (element.tagName === 'A') return 'link';
    if (element.tagName === 'INPUT') return 'input';
    if (element.tagName === 'SELECT') return 'select';
    return 'custom';
  }

  /**
   * Get component name from React fiber
   */
  private getComponentName(element: HTMLElement): string {
    const reactInstance = (element as any).__reactInternalInstance || 
                         (element as any)._reactInternalFiber ||
                         (element as any).__reactFiber;
    
    if (reactInstance) {
      return reactInstance.type?.name || reactInstance.type?.displayName || 'Unknown';
    }

    return element.className || 'Unknown';
  }

  /**
   * Get live UI binding map
   */
  getLiveBindingMap(): any {
    return {
      timestamp: Date.now(),
      elements: Array.from(this.uiElements.values()),
      interactions: this.interactionTraces.slice(-100), // Last 100 interactions
      stats: {
        total: this.uiElements.size,
        withHandlers: Array.from(this.uiElements.values()).filter(e => e.hasHandler).length,
        withoutHandlers: Array.from(this.uiElements.values()).filter(e => !e.hasHandler).length,
        lastVerified: Date.now()
      }
    };
  }

  /**
   * Get dead control fix log
   */
  getDeadControlFixLog(): any {
    return {
      timestamp: Date.now(),
      fixes: this.interactionTraces
        .filter(t => t.executionPath.includes('self-healed'))
        .map(t => ({
          requestId: t.requestId,
          elementId: t.elementId,
          timestamp: t.timestamp,
          fix: 'handler-bound'
        }))
    };
  }

  /**
   * Get runtime verdict
   */
  getRuntimeVerdict(): { operational: boolean; details: any } {
    const elements = Array.from(this.uiElements.values());
    const broken = elements.filter(e => e.isClickable && !e.hasHandler).length;
    const total = elements.length;
    const operational = broken === 0;

    return {
      operational,
      details: {
        total,
        broken,
        working: total - broken,
        percentage: total > 0 ? ((total - broken) / total * 100).toFixed(2) : 100
      }
    };
  }
}

// Export singleton instance
export const runtimeUIVerification = RuntimeUIVerification.getInstance();

// Auto-initialize when module loads (runtime)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runtimeUIVerification.initialize();
    });
  } else {
    runtimeUIVerification.initialize();
  }
}
