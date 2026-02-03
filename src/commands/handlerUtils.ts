/**
 * Command Handler Utilities
 *
 * Provides utility functions and decorators for command handlers
 * to reduce boilerplate and standardize common patterns.
 */

import { Command, CommandHandler } from './commandBus';
import { CommandBus } from './commandBus';
import { createCommand } from './types';

/**
 * Higher-order function that wraps a command handler to automatically
 * trigger simulation if the command payload includes runSimulation: true.
 *
 * This eliminates the repetitive boilerplate code found in many handlers.
 */
export function withAutoSimulation<T extends Command>(
  handler: CommandHandler<T>
): CommandHandler<T> {
  return async (command: T) => {
    // Execute the core handler logic first
    const result = await handler(command);

    // Automatically trigger simulation if requested
    if (command.payload && 'runSimulation' in command.payload && command.payload.runSimulation) {
      const runSimCmd = createCommand.runSimulation();
      runSimCmd.meta = {
        source: `${command.type}_withAutoSimulation`,
        correlationId: command.meta?.correlationId
      };
      await CommandBus.getInstance().dispatch(runSimCmd);
    }

    return result;
  };
}

