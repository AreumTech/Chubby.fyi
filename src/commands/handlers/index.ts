/**
 * Command Handlers Registry
 * 
 * This file registers all command handlers with the command bus.
 * Import this file during app initialization to set up the command handling system.
 */

import { CommandBus } from '../commandBus';
import { logger } from '@/utils/logger';

// Import all handlers
import {
  updateInitialStateHandler,
  updateEventHandler,
  deleteEventHandler,
  createEnhancedGoalHandler,
  updateEnhancedGoalHandler,
  deleteEnhancedGoalHandler,
  createGoalFromRecommendationHandler,
  bulkUpdateEventsHandler
} from './eventHandlers';

import {
  runSimulationHandler,
  simulationCompleteHandler,
  simulationFailedHandler
} from './simulationHandlers';

import {
  createScenarioHandler,
  deleteScenarioHandler,
  renameScenarioHandler,
  switchScenarioHandler
} from './scenarioHandlers';

import {
  openModalHandler,
  closeModalHandler,
  showConfirmationHandler,
  setDeepDiveYearHandler
} from './uiHandlers';

import {
  updateConfigHandler,
  importDataHandler,
  initializeAppHandler,
  resetAppHandler,
  loadExampleScenarioHandler,
  loadPersonaEventManifestHandler,
  loadScenarioDataHandler
} from './configHandlers';

import {
  executeStrategyHandler,
  removeStrategyHandler,
  getApplicableStrategiesHandler,
  getStrategyParametersHandler,
  validateStrategyInputsHandler
} from './strategyHandlers';

/**
 * Register all command handlers with the command bus
 * Call this function during app initialization
 */
export function registerCommandHandlers() {
  // Get the command bus instance
  const commandBus = CommandBus.getInstance();

  // Event Management Commands
  commandBus.register('UPDATE_INITIAL_STATE', updateInitialStateHandler);
  commandBus.register('UPDATE_EVENT', updateEventHandler);
  commandBus.register('DELETE_EVENT', deleteEventHandler);
  commandBus.register('CREATE_EVENT', updateEventHandler);
  commandBus.register('CREATE_ENHANCED_GOAL', createEnhancedGoalHandler);
  commandBus.register('UPDATE_ENHANCED_GOAL', updateEnhancedGoalHandler);
  commandBus.register('DELETE_ENHANCED_GOAL', deleteEnhancedGoalHandler);
  commandBus.register('CREATE_GOAL_FROM_RECOMMENDATION', createGoalFromRecommendationHandler);
  commandBus.register('BULK_UPDATE_EVENTS', bulkUpdateEventsHandler);

  // Simulation Commands
  commandBus.register('RUN_SIMULATION', runSimulationHandler);
  commandBus.register('SIMULATION_COMPLETE', simulationCompleteHandler);
  commandBus.register('SIMULATION_FAILED', simulationFailedHandler);

  // Scenario Management Commands
  commandBus.register('CREATE_SCENARIO', createScenarioHandler);
  commandBus.register('DELETE_SCENARIO', deleteScenarioHandler);
  commandBus.register('RENAME_SCENARIO', renameScenarioHandler);
  commandBus.register('SWITCH_SCENARIO', switchScenarioHandler);

  // UI State Commands
  commandBus.register('OPEN_MODAL', openModalHandler);
  commandBus.register('CLOSE_MODAL', closeModalHandler);
  commandBus.register('SHOW_CONFIRMATION', showConfirmationHandler);
  commandBus.register('SET_DEEP_DIVE_YEAR', setDeepDiveYearHandler);

  // Configuration Commands
  commandBus.register('UPDATE_CONFIG', updateConfigHandler);
  commandBus.register('IMPORT_DATA', importDataHandler);
  commandBus.register('INITIALIZE_APP', initializeAppHandler);
  commandBus.register('RESET_APP', resetAppHandler);
  commandBus.register('LOAD_EXAMPLE_SCENARIO', loadExampleScenarioHandler);
  commandBus.register('LOAD_PERSONA_EVENT_MANIFEST', loadPersonaEventManifestHandler);
  commandBus.register('LOAD_SCENARIO_DATA', loadScenarioDataHandler);

  // Strategy Commands
  commandBus.register('EXECUTE_STRATEGY', executeStrategyHandler);
  commandBus.register('REMOVE_STRATEGY', removeStrategyHandler);
  commandBus.register('GET_APPLICABLE_STRATEGIES', getApplicableStrategiesHandler);
  commandBus.register('GET_STRATEGY_PARAMETERS', getStrategyParametersHandler);
  commandBus.register('VALIDATE_STRATEGY_INPUTS', validateStrategyInputsHandler);

  const registeredTypes = commandBus.getRegisteredCommandTypes();
  logger.commandLog(`Registered ${registeredTypes.length} command handlers`);
}

/**
 * Unregister all command handlers (useful for testing)
 */
export function unregisterCommandHandlers() {
  const commandBus = CommandBus.getInstance();
  commandBus.clearAllHandlers();
  logger.commandLog('All command handlers unregistered');
}

// Export individual handlers for testing
export {
  updateInitialStateHandler,
  updateEventHandler,
  deleteEventHandler,
  createEnhancedGoalHandler,
  updateEnhancedGoalHandler,
  deleteEnhancedGoalHandler,
  bulkUpdateEventsHandler,
  runSimulationHandler,
  simulationCompleteHandler,
  simulationFailedHandler,
  createScenarioHandler,
  deleteScenarioHandler,
  renameScenarioHandler,
  switchScenarioHandler,
  openModalHandler,
  closeModalHandler,
  showConfirmationHandler,
  setDeepDiveYearHandler,
  updateConfigHandler,
  importDataHandler,
  initializeAppHandler,
  resetAppHandler,
  loadExampleScenarioHandler,
  loadPersonaEventManifestHandler,
  loadScenarioDataHandler,
  executeStrategyHandler,
  getApplicableStrategiesHandler,
  getStrategyParametersHandler,
  validateStrategyInputsHandler
};