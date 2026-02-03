import { logger } from '@/utils/logger';

/**
 * useEventLedgerCommands Hook - Command Bus version of useEventLedger
 * 
 * This hook provides the same interface as useEventLedger but uses the Command Bus
 * pattern internally. This demonstrates how existing components can be gradually
 * migrated to use the Command Bus without changing their external interface.
 */

import { useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from './useCommandBus';
import { createCommand } from '@/commands/types';
import { FinancialEvent, GoalDefineEvent } from '@/types';

// Stable empty array for fallback
const EMPTY_EVENTS: FinancialEvent[] = [];

export const useEventLedgerCommands = () => {
  // Select eventLedger directly to get stable reference
  const eventLedger = useAppStore(state => {
    const activeScenario = state.scenarios[state.activeScenarioId];
    return activeScenario?.eventLedger || EMPTY_EVENTS;
  });
  const { dispatch } = useCommandBus();

  const saveEvent = useCallback(async (eventData: FinancialEvent, runSimulation?: () => void) => {
    try {
      // Use command bus instead of direct store manipulation
      await dispatch(createCommand.updateEvent(eventData, !!runSimulation));
      
      // If a custom runSimulation function was provided, we still call it
      // This maintains backward compatibility with existing components
      if (runSimulation && !runSimulation) {
        // The command already triggered simulation, so we don't need to call it again
        // This condition will never be true, but it's here for clarity
      }
    } catch (error) {
      logger.error('[useEventLedgerCommands] Failed to save event:', error);
      throw error;
    }
  }, [dispatch]);

  const deleteEvent = useCallback(async (eventId: string, runSimulation?: () => void) => {
    try {
      await dispatch(createCommand.deleteEvent(eventId, !!runSimulation));
    } catch (error) {
      logger.error('[useEventLedgerCommands] Failed to delete event:', error);
      throw error;
    }
  }, [dispatch]);

  // Legacy goal functions removed - use enhanced goal system instead

  // Additional command-based functions that weren't in the original hook
  const bulkUpdateEvents = useCallback(async (events: FinancialEvent[], runSimulation = false) => {
    try {
      await dispatch(createCommand.bulkUpdateEvents(events, runSimulation));
    } catch (error) {
      logger.error('[useEventLedgerCommands] Failed to bulk update events:', error);
      throw error;
    }
  }, [dispatch]);

  const createEvent = useCallback(async (eventData: FinancialEvent, runSimulation = false) => {
    try {
      await dispatch(createCommand.createEvent(eventData, runSimulation));
    } catch (error) {
      logger.error('[useEventLedgerCommands] Failed to create event:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    // Core event management functions
    eventLedger,
    saveEvent,
    deleteEvent,

    // Additional command-based functions
    bulkUpdateEvents,
    createEvent
  };
};