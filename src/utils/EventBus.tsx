type EventCallback<T = unknown> = (data: T) => void;

type EventMap = {
  'model:status:changed': string;
  'model:response:start': void;
  'model:response:chunk': string;
  'model:response:end': void;
  'model:error': Error;
  'conversation:created': string;
  'conversation:updated': string;
  'conversation:deleted': string;
  'message:added': { conversationId: string; messageId: string };
  'message:updated': { conversationId: string; messageId: string };
  'network:online': void;
  'network:offline': void;
  'settings:updated': Partial<Record<string, unknown>>;
  'error:occurred': Error;
  'notification:show': { message: string; type: 'info' | 'success' | 'warning' | 'error' };
};

/** Event names available in the event bus */
export type EventNames = keyof EventMap;

class EventBus {
  private events = new Map<keyof EventMap, Set<EventCallback>>();
  private debugMode = import.meta.env.DEV;

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(callback as EventCallback);
    
    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to: ${event}`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
      
      if (this.debugMode) {
        console.log(`[EventBus] Unsubscribed from: ${event}`);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const callbacks = this.events.get(event);
    
    if (this.debugMode) {
      console.log(`[EventBus] Emitting: ${event}`, data);
    }

    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): () => void {
    const wrappedCallback = (data: EventMap[K]) => {
      callback(data);
      this.off(event, wrappedCallback as EventCallback<EventMap[K]>);
    };

    return this.on(event, wrappedCallback as EventCallback<EventMap[K]>);
  }

  /**
   * Clear all listeners for an event
   */
  clear(event?: keyof EventMap): void {
    if (event) {
      this.events.delete(event);
      
      if (this.debugMode) {
        console.log(`[EventBus] Cleared all listeners for: ${event}`);
      }
    } else {
      this.events.clear();
      
      if (this.debugMode) {
        console.log('[EventBus] Cleared all listeners');
      }
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: keyof EventMap): number {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Get all active events
   */
  getActiveEvents(): Array<keyof EventMap> {
    return Array.from(this.events.keys());
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export type for consumers
export type { EventMap };
