/**
 * Simulation Command Handlers
 * 
 * These handlers manage simulation execution, orchestrating the simulation service
 * and updating the appropriate stores with results.
 */

import { useAppStore } from "@/store/appStore";
import { runSimulation, validateSimulationInputs } from '@/services/simulationService';
import { migrateEvents, eventNeedsMigration } from '@/services/eventMigrationService';
import { logger } from '@/utils/logger';
import { CommandHandler, CommandBus } from '../commandBus';
import {
  RunSimulationCommand,
  SimulationCompleteCommand,
  SimulationFailedCommand,
  createCommand
} from '../types';

export const runSimulationHandler: CommandHandler<RunSimulationCommand> = async (command) => {
  logger.commandLog('RUN_SIMULATION handler called');
  const { force = false } = command.payload || {};
  const { isOrchestrating, setIsOrchestrating } = useAppStore.getState();
  
  // Don't run if already orchestrating unless forced
  if (isOrchestrating && !force) {
    logger.info('[runSimulationHandler] Simulation already running, skipping');
    return;
  }
  
  const { getActiveScenario, config: rawConfig, activeScenarioId, getEnhancedGoals } = useAppStore.getState();
  
  // DEFENSIVE: Ensure config has required fields with fallbacks
  // Read Monte Carlo runs from the correct location where UI saves it
  const numberOfRuns = rawConfig.advancedSimulationSettings?.monteCarloSettings?.numSimulations
    || rawConfig.stochasticConfig?.monteCarloRuns
    || rawConfig.monteCarloRuns
    || 50;

  const config = {
    ...rawConfig,
    currentAge: rawConfig.currentAge || 35,
    simulationEndAge: rawConfig.simulationEndAge || 85,
    monteCarloRuns: numberOfRuns
  };
  
  setIsOrchestrating(true);
  
  try {
    const activeScenario = getActiveScenario();
    if (!activeScenario) {
      throw new Error('No active scenario found');
    }
    
    const { initialState, eventLedger } = activeScenario;

    logger.dataLog(`Processing ${eventLedger.length} events from scenario`);

    if (!initialState) {
      throw new Error('No initial state found in active scenario');
    }
    
    // Migrate legacy events to ensure they meet validation requirements
    const migratedEvents = eventLedger.some(eventNeedsMigration) 
      ? migrateEvents(eventLedger)
      : eventLedger;
    
    // Update the store with migrated events if any migrations occurred
    if (migratedEvents !== eventLedger) {
      logger.info('[runSimulationHandler] Migrated legacy events to meet validation requirements');
      useAppStore.getState().setEventLedger(migratedEvents);
    }
    
    // Validate inputs using the service layer
    const validationErrors = validateSimulationInputs(
      initialState,
      migratedEvents,
      config
    );
    
    if (validationErrors.length > 0) {
      throw new Error(`Simulation validation failed: ${validationErrors.join(', ')}`);
    }
    
    const progressCallback = {
      onWorkerComplete: () => {},
      onComplete: () => {},
      onError: (error: Error) => {
        // Reduce error spam - only log if it's not a cascading WASM error
        if (!error.message.includes('More than 90% of simulation paths failed')) {
          logger.error('[runSimulationHandler] WebWorker simulation error:', error);
        }
      }
    };
    
    logger.simulationLog(`Starting simulation with ${migratedEvents.length} events`);
    
    // Get enhanced goals from store
    const enhancedGoals = getEnhancedGoals();
    logger.dataLog(`Found ${enhancedGoals.length} enhanced goals for simulation`);

    const completePayload = await runSimulation(
      initialState,
      migratedEvents,
      config,
      progressCallback,
      enhancedGoals
    );

    // Update store to reflect latest payload immediately; service cache already updated inside runSimulation
    const { setSimulationPayload } = useAppStore.getState();
    setSimulationPayload(completePayload);
    
    // Dispatch success command
    const successCmd = createCommand.simulationComplete(completePayload, activeScenarioId);
    successCmd.meta = {
      source: 'runSimulationHandler',
      correlationId: command.meta?.correlationId
    };
    await CommandBus.getInstance().dispatch(successCmd);
    
  } catch (error) {
    logger.error('Failed to run simulation:', (error as Error).message);

    // Dispatch failure command
    const failureCmd = createCommand.simulationFailed(error as Error, activeScenarioId);
    failureCmd.meta = {
      source: 'runSimulationHandler',
      correlationId: command.meta?.correlationId
    };
    await CommandBus.getInstance().dispatch(failureCmd);
  } finally {
    setIsOrchestrating(false);
  }
};

export const simulationCompleteHandler: CommandHandler<SimulationCompleteCommand> = async (command) => {
  const { result, scenarioId } = command.payload;
  const { setSimulationPayload } = useAppStore.getState();
  const { activeScenarioId } = useAppStore.getState();

  // Only update if this is for the currently active scenario
  if (scenarioId === activeScenarioId) {
    setSimulationPayload(result);
    logger.commandLog('Simulation completed successfully');
  } else {
    logger.debug(`Ignoring simulation result for inactive scenario: ${scenarioId}`);
  }
};

export const simulationFailedHandler: CommandHandler<SimulationFailedCommand> = async (command) => {
  const { error, scenarioId } = command.payload;
  const { activeScenarioId } = useAppStore.getState();

  // Only show error if this is for the currently active scenario
  if (scenarioId === activeScenarioId) {
    logger.error('Simulation failed:', error.message);
    
    // Could dispatch a command to show error notification to user
    // await CommandBus.getInstance().dispatch({
    //   type: 'SHOW_NOTIFICATION',
    //   payload: {
    //     type: 'error',
    //     message: `Simulation failed: ${error.message}`,
    //     duration: 5000
    //   }
    // });
  }
};
