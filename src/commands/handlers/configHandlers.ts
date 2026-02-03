/**
 * Configuration Command Handlers
 * 
 * These handlers manage application configuration updates and data import/export operations.
 */

import { useAppStore } from "@/store/appStore";
import { DEFAULT_APP_CONFIG } from '@/config/appConfig';
import { CommandHandler, CommandBus } from '../commandBus';
import { withAutoSimulation } from '../handlerUtils';
import { dataLoaderService } from '@/services/dataLoaderService';
import { createCommand } from '../types';
import { logger } from '@/utils/logger';
import {
  UpdateConfigCommand,
  ImportDataCommand,
  InitializeAppCommand,
  ResetAppCommand,
  LoadExampleScenarioCommand,
  LoadPersonaEventManifestCommand,
  LoadScenarioDataCommand
} from '../types';
import { EventType, EventPriority, FilingStatus } from '@/types';
import { EnhancedGoal } from '@/types/enhanced-goal';
import { createDefaultPolicySettings } from '@/types/strategies/unified';


// Core logic for updating config (without simulation trigger)
const updateConfigHandlerCore: CommandHandler<UpdateConfigCommand> = async (command) => {
  const { config } = command.payload;
  const { setConfig } = useAppStore.getState();

  setConfig(config);
  logger.commandLog('Configuration updated');
};

// Decorated handler with automatic simulation trigger
export const updateConfigHandler = withAutoSimulation(updateConfigHandlerCore);

// Core logic for importing data (without simulation trigger)
const importDataHandlerCore: CommandHandler<ImportDataCommand> = async (command) => {
  const { data } = command.payload;
  const planStore = useAppStore.getState();

  // Update config if provided
  if (data.config) {
    planStore.setConfig(data.config);
  }

  // Update scenarios if provided
  if (data.scenarios) {
    planStore.setScenarios(data.scenarios);
  }

  // Update active scenario if provided
  if (data.activeScenarioId) {
    planStore.setActiveScenarioId(data.activeScenarioId);
  }

  logger.commandLog('Data imported successfully');
};

// Decorated handler with automatic simulation trigger
export const importDataHandler = withAutoSimulation(importDataHandlerCore);

export const initializeAppHandler: CommandHandler<InitializeAppCommand> = async (command) => {
  const { skipOnboarding: _skipOnboarding = false } = command.payload || {};
  const appState = useAppStore.getState();

  logger.commandLog('Initializing application');

  const { getEventLedger, scenarios } = appState;
  const eventLedger = getEventLedger();
  const existingScenarios = Object.keys(scenarios).length;

  // If no scenarios exist, load default "tech_professional" scenario
  if (existingScenarios === 0 && eventLedger.length === 0) {
    logger.commandLog('No scenarios found - loading default tech_professional scenario');

    const loadExampleCmd = createCommand.loadExampleScenario('tech_professional');
    loadExampleCmd.meta = {
      source: 'initializeAppHandler',
      correlationId: command.meta?.correlationId
    };
    await CommandBus.getInstance().dispatch(loadExampleCmd);
    return; // loadExampleScenario will trigger simulation automatically
  }

  // Run simulation if we have existing events
  if (eventLedger.length > 0) {
    const runSimCmd = createCommand.runSimulation();
    runSimCmd.meta = {
      source: 'initializeAppHandler',
      correlationId: command.meta?.correlationId
    };
    await CommandBus.getInstance().dispatch(runSimCmd);
  }
};

export const resetAppHandler: CommandHandler<ResetAppCommand> = async (command) => {
  const { keepScenarios = false } = command.payload || {};
  const planStore = useAppStore.getState();
  const uiState = useAppStore.getState();
  const simulationStore = useAppStore.getState();
  
  logger.commandLog('Resetting application');
  
  // Reset configuration to defaults
  planStore.setConfig(DEFAULT_APP_CONFIG);
  
  // Reset scenarios unless keeping them
  if (!keepScenarios) {
    const defaultScenarioId = 'default-scenario';
    const now = new Date();
    const defaultInitialState: any = {
      id: 'initial-state',
      type: EventType.INITIAL_STATE,
      name: 'Initial State',
      priority: EventPriority.USER_ACTION,
      currentAge: 30,
      startYear: new Date().getFullYear(),
      initialMonth: 0,
      filingStatus: FilingStatus.SINGLE,
      numberOfDependents: 0,
      initialCash: 10000,
      initialAccounts: { taxable: [], tax_deferred: [], roth: [] },
      initialLiabilities: [],
      monthOffset: 0,
    };
    planStore.setScenarios({
      [defaultScenarioId]: {
        id: defaultScenarioId,
        name: 'Base Plan',
        description: 'Default scenario',
        createdAt: now,
        lastModified: now,
        initialState: defaultInitialState,
        eventLedger: [defaultInitialState], // INITIAL_STATE must always be first event
        enhancedGoals: [],
        policySettings: createDefaultPolicySettings()
      }
    });
    planStore.setActiveScenarioId(defaultScenarioId);
  }
  
  // Reset UI state
  uiState.setIsEditModalOpen(false);
  uiState.setEditingEvent(null);
  uiState.setIsEventCreationModalOpen(false);
  uiState.setIsGoalCreationModalOpen(false);
  uiState.setIsGoalEditModalOpen(false);
  uiState.setEditingGoal(null);
  uiState.setShowSettings(false);
  uiState.setShowAdvancedSettings(false);
  uiState.setShowStrategyModal(false);
  uiState.setSelectedDeepDiveCalendarYear(null);
  
  // Reset simulation results
  simulationStore.setSimulationPayload(null);
  
  logger.commandLog('Application reset completed');
};

export const loadScenarioDataHandler: CommandHandler<LoadScenarioDataCommand> = async (command) => {
  const {
    scenarioName,
    resetApp = false,
    createNewScenario = false,
    initialState,
    events,
    goals
  } = command.payload;
  const commandBus = CommandBus.getInstance();

  // Separate goals and initial state from regular events
  const _goalEvents = events.filter(event => event.type === 'GOAL_DEFINE');
  const regularEvents = events.filter(event =>
    event.type !== 'GOAL_DEFINE' && event.type !== 'INITIAL_STATE'
  );

  // Reset app if requested
  if (resetApp) {
    const resetCmd = createCommand.resetApp(false);
    resetCmd.meta = {
      source: 'loadScenarioDataHandler',
      correlationId: command.meta?.correlationId
    };
    await commandBus.dispatch(resetCmd);
  }

  // Create new scenario if requested
  if (createNewScenario && scenarioName) {
    const createScenarioCmd = createCommand.createScenario(scenarioName);
    createScenarioCmd.meta = {
      source: 'loadScenarioDataHandler',
      correlationId: command.meta?.correlationId
    };
    await commandBus.dispatch(createScenarioCmd);
  }

  // Update initial state
  const updateInitialStateCmd = createCommand.updateInitialState(initialState, false);
  updateInitialStateCmd.meta = {
    source: 'loadScenarioDataHandler',
    correlationId: command.meta?.correlationId
  };
  await commandBus.dispatch(updateInitialStateCmd);

  // Bulk update regular events (excluding goals)
  if (regularEvents.length > 0) {
    const bulkUpdateCmd = createCommand.bulkUpdateEvents(regularEvents, false);
    bulkUpdateCmd.meta = {
      source: 'loadScenarioDataHandler',
      correlationId: command.meta?.correlationId
    };
    await commandBus.dispatch(bulkUpdateCmd);
  }

  // Create enhanced goals using CREATE_ENHANCED_GOAL command
  for (const goal of goals) {
    // Goals are already in EnhancedGoal format
    const createGoalCmd = createCommand.createEnhancedGoal(goal, false);
    createGoalCmd.meta = {
      source: 'loadScenarioDataHandler',
      correlationId: command.meta?.correlationId
    };
    await commandBus.dispatch(createGoalCmd);
  }

  // Run simulation after all data is loaded
  const finalRunSimCmd = createCommand.runSimulation();
  finalRunSimCmd.meta = {
    source: 'loadScenarioDataHandler',
    correlationId: command.meta?.correlationId
  };
  await commandBus.dispatch(finalRunSimCmd);

  logger.commandLog(`Scenario data loaded: ${scenarioName || 'unnamed'} with ${events.length} events and ${goals.length} goals`);
};

export const loadExampleScenarioHandler: CommandHandler<LoadExampleScenarioCommand> = async (command) => {
  const { scenarioType = 'tech_professional', personaName } = command.payload || {};
  const commandBus = CommandBus.getInstance();

  logger.commandLog(`Loading example scenario: ${scenarioType}`, personaName ? `for persona: ${personaName}` : '');

  // Try loading from testCases.json for specific scenarios
  const testCaseData = await dataLoaderService.parseTestCaseFromJson(scenarioType);
  if (testCaseData) {
    // Convert legacy goals to EnhancedGoal format if needed
    const enhancedGoals = testCaseData.goals?.map((goal: any) => {
      // If it's already an EnhancedGoal, use as-is
      if (goal.targetAccount && goal.category) {
        return goal;
      }
      // Convert legacy Goal to EnhancedGoal
      return {
        id: goal.id,
        name: goal.name,
        description: goal.description || `Financial goal to reach $${goal.targetAmount?.toLocaleString()}`,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetMonthOffset ? new Date(Date.now() + goal.targetMonthOffset * 30 * 24 * 60 * 60 * 1000) : undefined,
        targetAccount: {
          type: goal.category === 'RETIREMENT' ? 'tax_deferred' :
                goal.category === 'EDUCATION' ? '529' :
                goal.category === 'MAJOR_PURCHASE' ? 'taxable' : 'cash',
          name: `${goal.name} Fund`
        },
        category: goal.category === 'MAJOR_PURCHASE' ? 'CUSTOM' : goal.category,
        priority: goal.priority === 1 ? 'HIGH' : goal.priority === 2 ? 'MEDIUM' : 'LOW',
        currentAmount: 0,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
    }) || [];

    // Load the test case scenario using unified command
    const loadScenarioCmd = createCommand.loadScenarioData(
      testCaseData.initialState,
      testCaseData.events,
      enhancedGoals,
      { resetApp: true }
    );
    loadScenarioCmd.meta = {
      source: 'loadExampleScenarioHandler',
      correlationId: command.meta?.correlationId
    };
    await commandBus.dispatch(loadScenarioCmd);
    return;
  }

  // Generate example scenario using centralized service
  const scenarioData = dataLoaderService.generateExampleScenario(scenarioType, personaName);

  // Separate goal events from regular events
  const goalEvents = scenarioData.events.filter(event => event.type === EventType.GOAL_DEFINE);
  const regularEvents = scenarioData.events.filter(event => event.type !== EventType.GOAL_DEFINE);

  // Convert goal events to EnhancedGoal format
  const convertedGoals = goalEvents.map(goalEvent => ({
    id: goalEvent.id,
    name: goalEvent.name || 'Financial Goal',
    description: goalEvent.description || '',
    targetAmount: (goalEvent as any).targetAmount,
    targetDate: new Date(Date.now() + goalEvent.monthOffset * 30 * 24 * 60 * 60 * 1000),
    targetAccount: {
      type: 'tax_deferred' as const,
      name: `${goalEvent.name || 'Financial Goal'} Fund`
    },
    category: 'RETIREMENT' as const,
    priority: 'HIGH' as const,
    currentAmount: 0,
    progressPercentage: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  }));

  // Convert scenario goals to EnhancedGoal format if needed
  const convertedScenarioGoals = scenarioData.goals?.map((goal: any) => {
    // If it's already an EnhancedGoal, use as-is
    if (goal.targetAccount && goal.priority && typeof goal.priority === 'string') {
      return goal;
    }
    // Convert legacy Goal to EnhancedGoal
    return {
      id: goal.id || `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: goal.name,
      description: goal.description || `Financial goal to reach $${goal.targetAmount?.toLocaleString()}`,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetMonthOffset ? new Date(Date.now() + goal.targetMonthOffset * 30 * 24 * 60 * 60 * 1000) : undefined,
      targetAccount: {
        type: goal.category === 'RETIREMENT' ? 'tax_deferred' :
              goal.category === 'EDUCATION' ? '529' :
              goal.category === 'MAJOR_PURCHASE' ? 'taxable' : 'cash',
        name: `${goal.name} Fund`
      },
      category: goal.category === 'MAJOR_PURCHASE' ? 'CUSTOM' : goal.category,
      priority: goal.priority === 1 ? 'HIGH' : goal.priority === 2 ? 'MEDIUM' : 'LOW',
      currentAmount: 0,
      progressPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
  }) || [];

  // Combine enhanced goals with converted goal events
  const allGoals = [...convertedScenarioGoals, ...convertedGoals];

  // Load the scenario using unified command
  const loadScenarioCmd2 = createCommand.loadScenarioData(
    scenarioData.initialState,
    regularEvents,
    allGoals,
    {
      scenarioName: scenarioData.metadata.name,
      createNewScenario: true
    }
  );
  loadScenarioCmd2.meta = {
    source: 'loadExampleScenarioHandler',
    correlationId: command.meta?.correlationId
  };
  await commandBus.dispatch(loadScenarioCmd2);

  logger.commandLog(`Example scenario loaded: ${scenarioType}`);
};

export const loadPersonaEventManifestHandler: CommandHandler<LoadPersonaEventManifestCommand> = async (command) => {
  const { persona } = command.payload;
  const commandBus = CommandBus.getInstance();

  logger.commandLog(`Loading persona event manifest: ${persona.title}`);

  // Parse persona manifest using centralized service FIRST
  const parsedData = dataLoaderService.parsePersonaManifest(persona);

  // Convert parsed goals to EnhancedGoal format BEFORE creating scenario
  const convertedParsedGoals = parsedData.goals?.map((goal: any) => {
    // If it's already an EnhancedGoal, use as-is
    if (goal.targetAccount && goal.priority && typeof goal.priority === 'string') {
      return goal;
    }
    // Convert legacy Goal to EnhancedGoal
    return {
      id: goal.id || `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: goal.name,
      description: goal.description || `Financial goal to reach $${goal.targetAmount?.toLocaleString()}`,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetMonthOffset ? new Date(Date.now() + goal.targetMonthOffset * 30 * 24 * 60 * 60 * 1000) : undefined,
      targetAccount: {
        type: goal.category === 'RETIREMENT' ? 'tax_deferred' :
              goal.category === 'EDUCATION' ? '529' :
              goal.category === 'MAJOR_PURCHASE' ? 'taxable' : 'cash',
        name: `${goal.name} Fund`
      },
      category: goal.category === 'MAJOR_PURCHASE' ? 'CUSTOM' : goal.category,
      priority: goal.priority === 1 ? 'HIGH' : goal.priority === 2 ? 'MEDIUM' : 'LOW',
      currentAmount: 0,
      progressPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
  }) || [];

  // Create new scenario with smart persona naming AND populated data
  const { createPersonaScenario } = useAppStore.getState();

  // Use parsed data from persona (with events and goals)
  const scenarioData = {
    description: parsedData.metadata.description,
    sourcePersona: persona.title.toLowerCase().replace(/\s+/g, '-'),
    initialState: parsedData.initialState,
    eventLedger: parsedData.events,  // ✅ Include parsed events
    enhancedGoals: convertedParsedGoals,  // ✅ Include converted goals
    policySettings: createDefaultPolicySettings()
  };

  // Create scenario with smart naming
  createPersonaScenario(persona.title, scenarioData);

  // Update demographics in config before running simulation
  const { setConfig } = useAppStore.getState();
  const currentConfig = useAppStore.getState().config;

  setConfig({
    ...currentConfig,
    currentAge: persona.demographics.age,
    simulationEndAge: persona.demographics.retirementAge,
  });

  // Run simulation with the newly created scenario
  const runSimCmd = createCommand.runSimulation();
  runSimCmd.meta = {
    source: 'loadPersonaEventManifestHandler',
    correlationId: command.meta?.correlationId
  };
  await commandBus.dispatch(runSimCmd);

  logger.commandLog(`Persona event manifest loaded: ${persona.title} with ${parsedData.events.length} events and ${convertedParsedGoals.length} goals`);
};