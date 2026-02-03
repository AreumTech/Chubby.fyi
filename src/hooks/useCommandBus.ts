/**
 * useCommandBus Hook - React hook for easy command dispatching
 *
 * This hook provides a convenient interface for React components to dispatch
 * commands through the command bus without directly importing and using the bus.
 *
 * API STANDARDIZATION:
 * - Use `execute()` for all command operations (replaces `dispatch()`)
 * - `dispatch()` is deprecated and will be removed in future versions
 * - `execute()` provides clearer semantics and consistent return value handling
 */

import { useCallback } from 'react';
import { CommandBus, AppCommand } from '@/commands';
import { logger } from '@/utils/logger';

export const useCommandBus = () => {
  /**
   * @deprecated Use `execute` instead. This method will be removed in a future version.
   * The `execute` method provides the same functionality with a clearer name and consistent return value handling.
   */
  const dispatch = useCallback(async <T extends AppCommand>(command: T): Promise<void> => {
    try {
      await CommandBus.getInstance().dispatch(command);
    } catch (error) {
      logger.commandLog(`Command dispatch failed: ${error}`);
      throw error; // Re-throw to allow components to handle errors
    }
  }, []);

  const execute = useCallback(async <T extends AppCommand>(command: T): Promise<any> => {
    try {
      return await CommandBus.getInstance().dispatch(command);
    } catch (error) {
      logger.commandLog(`Command execution failed: ${error}`);
      throw error; // Re-throw to allow components to handle errors
    }
  }, []);

  const isHandlerRegistered = useCallback((commandType: string): boolean => {
    return CommandBus.getInstance().hasHandlers(commandType);
  }, []);

  const getCommandHistory = useCallback(() => {
    return CommandBus.getInstance().getCommandHistory();
  }, []);

  const getRegisteredCommandTypes = useCallback(() => {
    return CommandBus.getInstance().getRegisteredCommandTypes();
  }, []);

  return {
    /** @deprecated Use `execute` instead */
    dispatch,
    execute,
    isHandlerRegistered,
    getCommandHistory,
    getRegisteredCommandTypes
  };
};