/**
 * Typed Event Emitter
 *
 * A type-safe event emitter for decoupled communication between services.
 * Replaces monkey-patched reactivity with proper pub/sub pattern.
 */

type EventCallback<T> = (data: T) => void;

/**
 * Type-safe event emitter with automatic cleanup tracking.
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   'data:updated': { payload: SimulationPayload };
 *   'error:occurred': { message: string };
 * }
 *
 * const emitter = new TypedEventEmitter<MyEvents>();
 *
 * // Subscribe
 * const unsubscribe = emitter.on('data:updated', (data) => {
 *   console.log(data.payload);
 * });
 *
 * // Emit
 * emitter.emit('data:updated', { payload: myPayload });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventEmitter<Events extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventCallback<unknown>>>();

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function for cleanup
   */
  on<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback as EventCallback<unknown>);
      // Clean up empty sets
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event for a single emission only.
   * @returns Unsubscribe function (can be called early to cancel)
   */
  once<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // Create a copy to allow unsubscription during emit
      for (const callback of Array.from(callbacks)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${String(event)}":`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for a specific event.
   */
  off<K extends keyof Events>(event: K): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners for all events.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the count of listeners for a specific event.
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Check if there are any listeners for a specific event.
   */
  hasListeners<K extends keyof Events>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

/**
 * Create a singleton event emitter for application-wide events.
 * Use this for cross-service communication.
 */
export function createSingletonEmitter<Events extends Record<string, unknown>>(): TypedEventEmitter<Events> {
  return new TypedEventEmitter<Events>();
}
