/**
 * useSimulationOrchestratorCommands Hook - Command Bus version of useSimulationOrchestrator
 * 
 * This hook provides the same interface as useSimulationOrchestrator but uses the Command Bus
 * pattern internally. This demonstrates how simulation orchestration can be handled through
 * the command bus for better traceability and consistency.
 */

import { useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { useCommandBus } from './useCommandBus';
import { createCommand } from '@/commands/types';
import { logger } from '@/utils/logger';

export const useSimulationOrchestratorCommands = () => {
  const { isOrchestrating } = useAppStore();
  const { dispatch } = useCommandBus();

  const runNewSimulation = useCallback(async (force = false) => {
    logger.commandLog(`runNewSimulation called, force: ${force}`);
    try {
      logger.commandLog('Dispatching RUN_SIMULATION command');
      await dispatch(createCommand.runSimulation(force));
      logger.commandLog('RUN_SIMULATION command dispatched successfully');
    } catch (error) {
      logger.error('Failed to run simulation:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    runNewSimulation,
    isSimulating: isOrchestrating
  };
};