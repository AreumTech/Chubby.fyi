/**
 * Commands Module - Export all command bus functionality
 * 
 * This module provides a complete Command Bus implementation for the financial planning application.
 * It includes the command bus itself, command types, handlers, and utility functions.
 */

// Core command bus
export { CommandBus } from './commandBus';
export type { Command, CommandHandler, CommandBusOptions } from './commandBus';

// Handler registration
export { registerCommandHandlers, unregisterCommandHandlers } from './handlers';

// Individual handlers (for testing)
export * from './handlers/eventHandlers';
export * from './handlers/simulationHandlers';
export * from './handlers/scenarioHandlers';
export * from './handlers/uiHandlers';
export * from './handlers/configHandlers';

// Command types and creators (after handlers to avoid circular deps)
export * from './types';

/**
 * Initialize the command bus system
 * Call this function early in your app initialization
 */
export async function initializeCommandBus(options?: { enableLogging?: boolean; enableMetrics?: boolean }) {
  // Use dynamic imports to avoid circular dependency issues
  const { CommandBus: LocalCommandBus } = await import('./commandBus');
  
  // Create command bus instance with options
  const bus = LocalCommandBus.getInstance(options);
  
  // Import and register handlers after CommandBus is available
  const { registerCommandHandlers: registerHandlers } = await import('./handlers');
  registerHandlers();
  
  return bus;
}