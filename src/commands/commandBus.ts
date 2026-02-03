/**
 * Command Bus - Lightweight mediator pattern for application-wide actions
 * 
 * This implements a command bus pattern that decouples "what" (commands dispatched from UI)
 * from "how" (complex sequences of actions in handlers). It makes data flow explicit,
 * traceable, and easier to debug as the application scales.
 */

import { logger } from '@/utils/logger';

export interface Command {
  type: string;
  payload?: any;
  meta?: {
    correlationId?: string;
    timestamp?: number;
    source?: string;
  };
}

export type CommandHandler<T extends Command = Command> = (command: T) => Promise<any> | any;

export interface CommandBusOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

export class CommandBus {
  private static instance: CommandBus;
  private handlers = new Map<string, CommandHandler[]>();
  private options: CommandBusOptions;
  private commandHistory: Command[] = [];
  private isDispatching = false;
  private dispatchQueue: Command[] = [];

  private constructor(options: CommandBusOptions = {}) {
    this.options = {
      enableLogging: false,
      enableMetrics: false,
      ...options
    };
  }

  static getInstance(options?: CommandBusOptions): CommandBus {
    if (!CommandBus.instance) {
      CommandBus.instance = new CommandBus(options);
    }
    return CommandBus.instance;
  }

  /**
   * Register a command handler for a specific command type
   */
  register<T extends Command>(commandType: string, handler: CommandHandler<T>): () => void {
    if (!this.handlers.has(commandType)) {
      this.handlers.set(commandType, []);
    }
    
    const handlers = this.handlers.get(commandType)!;
    handlers.push(handler as CommandHandler);

    // Route command bus logs to debug admin to reduce console spam

    // Return unregister function
    return () => {
      const currentHandlers = this.handlers.get(commandType);
      if (currentHandlers) {
        const index = currentHandlers.indexOf(handler as CommandHandler);
        if (index > -1) {
          currentHandlers.splice(index, 1);
          if (currentHandlers.length === 0) {
            this.handlers.delete(commandType);
          }
        }
      }
    };
  }

  /**
   * Dispatch a command to all registered handlers
   */
  async dispatch<T extends Command>(command: T): Promise<any> {
    // Add metadata if not present
    const enrichedCommand: T = {
      ...command,
      meta: {
        correlationId: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        source: 'CommandBus',
        ...command.meta
      }
    };

    // Handle recursive dispatching by queueing
    if (this.isDispatching) {
      this.dispatchQueue.push(enrichedCommand);
      return;
    }

    try {
      this.isDispatching = true;
      const result = await this._dispatchInternal(enrichedCommand);

      // Process any queued commands
      while (this.dispatchQueue.length > 0) {
        const queuedCommand = this.dispatchQueue.shift()!;
        await this._dispatchInternal(queuedCommand);
      }

      return result;
    } finally {
      this.isDispatching = false;
    }
  }

  private async _dispatchInternal<T extends Command>(command: T): Promise<any> {
    const handlers = this.handlers.get(command.type) || [];

    // TEMPORARY DEBUG: Always log RUN_SIMULATION commands
    if (command.type === 'RUN_SIMULATION') {
      logger.debug(`[COMMAND-BUS] Dispatching ${command.type}, handlers: ${handlers.length}`);
    }

    if (this.options.enableLogging) {
      logger.commandLog(`Dispatching command: ${command.type}`, {
        payload: command.payload,
        handlerCount: handlers.length,
        correlationId: command.meta?.correlationId
      });
    }

    // Store command in history for debugging
    this.commandHistory.push(command);
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift(); // Keep only last 100 commands
    }

    if (handlers.length === 0) {
      if (this.options.enableLogging) {
        logger.warn(`No handlers registered for command: ${command.type}`, 'COMMAND');
      }
      return;
    }

    // Execute all handlers in parallel
    const handlerPromises = handlers.map(async (handler) => {
      try {
        return await handler(command);
      } catch (error) {
        logger.error(`Error in handler for command ${command.type}`, 'ERROR', error);
        throw error; // Re-throw to allow caller to handle
      }
    });

    const results = await Promise.all(handlerPromises);

    if (this.options.enableLogging) {
      logger.commandLog(`Successfully dispatched command: ${command.type}`);
    }

    // Return the first result if there's only one handler, otherwise return all results
    return handlers.length === 1 ? results[0] : results;
  }

  /**
   * Get command execution history (useful for debugging)
   */
  getCommandHistory(): readonly Command[] {
    return [...this.commandHistory];
  }

  /**
   * Get registered command types
   */
  getRegisteredCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAllHandlers(): void {
    this.handlers.clear();
    this.commandHistory = [];
  }

  /**
   * Check if a command type has registered handlers
   */
  hasHandlers(commandType: string): boolean {
    return this.handlers.has(commandType) && this.handlers.get(commandType)!.length > 0;
  }
}

// Singleton instance is created on-demand via CommandBus.getInstance()