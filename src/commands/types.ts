/**
 * Command Types - Explicit command definitions for the Command Bus
 * 
 * These commands represent all the major actions that can be performed in the application.
 * Each command has a specific type and payload structure.
 */

import { FinancialEvent, AppConfig, SimulationPayload } from '@/types';
import { InitialStateEvent } from '@/types/events/initial-state';
import { EnhancedGoal } from '@/types/enhanced-goal';
import { StrategyExecutionContext, StrategyResult, StrategyEngine } from '@/types/strategy';
import { PersonaProfile } from '@/data/personas';
// Inline GoalRecommendation interface (backend now provides recommendations)
interface GoalRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact?: string;
  targetAmount?: number;
  targetAccount?: any;
  targetDate?: Date;
  suggestedGoal?: {
    name: string;
    targetAmount: number;
    targetAccount: any;
    targetDate?: Date;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    description?: string;
    category?: string;
  };
}
import { Command } from './commandBus';

// Event Management Commands
export interface UpdateInitialStateCommand extends Command {
  type: 'UPDATE_INITIAL_STATE';
  payload: {
    initialStateData: InitialStateEvent;
    runSimulation?: boolean;
  };
}

export interface UpdateEventCommand extends Command {
  type: 'UPDATE_EVENT';
  payload: {
    eventData: FinancialEvent;
    runSimulation?: boolean;
  };
}

export interface DeleteEventCommand extends Command {
  type: 'DELETE_EVENT';
  payload: {
    eventId: string;
    runSimulation?: boolean;
  };
}


// Legacy Goal Management Commands removed - use Enhanced Goals instead

// Enhanced Goal Management Commands
export interface CreateEnhancedGoalCommand extends Command {
  type: 'CREATE_ENHANCED_GOAL';
  payload: {
    goalData: EnhancedGoal;
    runSimulation?: boolean;
  };
}

export interface UpdateEnhancedGoalCommand extends Command {
  type: 'UPDATE_ENHANCED_GOAL';
  payload: {
    goalData: EnhancedGoal;
    runSimulation?: boolean;
  };
}

export interface DeleteEnhancedGoalCommand extends Command {
  type: 'DELETE_ENHANCED_GOAL';
  payload: {
    goalId: string;
    runSimulation?: boolean;
  };
}

export interface CreateGoalFromRecommendationCommand extends Command {
  type: 'CREATE_GOAL_FROM_RECOMMENDATION';
  payload: {
    recommendation: GoalRecommendation;
    runSimulation?: boolean;
  };
}

// Simulation Commands
export interface RunSimulationCommand extends Command {
  type: 'RUN_SIMULATION';
  payload?: {
    force?: boolean; // Force simulation even if already running
  };
}

export interface SimulationCompleteCommand extends Command {
  type: 'SIMULATION_COMPLETE';
  payload: {
    result: SimulationPayload;
    scenarioId: string;
  };
}

export interface SimulationFailedCommand extends Command {
  type: 'SIMULATION_FAILED';
  payload: {
    error: Error;
    scenarioId: string;
  };
}

// Scenario Management Commands
export interface CreateScenarioCommand extends Command {
  type: 'CREATE_SCENARIO';
  payload: {
    name: string;
    sourceScenarioId?: string; // For duplication
  };
}

export interface DeleteScenarioCommand extends Command {
  type: 'DELETE_SCENARIO';
  payload: {
    scenarioId: string;
  };
}

export interface RenameScenarioCommand extends Command {
  type: 'RENAME_SCENARIO';
  payload: {
    scenarioId: string;
    newName: string;
  };
}

export interface SwitchScenarioCommand extends Command {
  type: 'SWITCH_SCENARIO';
  payload: {
    scenarioId: string;
    runSimulation?: boolean;
  };
}

// Configuration Commands
export interface UpdateConfigCommand extends Command {
  type: 'UPDATE_CONFIG';
  payload: {
    config: AppConfig | ((prev: AppConfig) => AppConfig);
    runSimulation?: boolean;
  };
}

// UI State Commands
export interface OpenModalCommand extends Command {
  type: 'OPEN_MODAL';
  payload: {
    modalType: 'event_creation' | 'event_edit' | 'goal_creation' | 'goal_edit' | 'settings' | 'advancedSettings' | 'applicationSettings' | 'strategy' | 'quickstart' | 'onboarding';
    data?: any; // Modal-specific data (e.g., event being edited)
  };
}

export interface CloseModalCommand extends Command {
  type: 'CLOSE_MODAL';
  payload: {
    modalType: 'event_creation' | 'event_edit' | 'goal_creation' | 'goal_edit' | 'settings' | 'advancedSettings' | 'applicationSettings' | 'strategy' | 'quickstart' | 'onboarding';
  };
}

export interface ShowConfirmationCommand extends Command {
  type: 'SHOW_CONFIRMATION';
  payload: {
    title: string;
    message: string;
    onConfirm: () => void;
  };
}

export interface SetDeepDiveYearCommand extends Command {
  type: 'SET_DEEP_DIVE_YEAR';
  payload: {
    year: number | null;
  };
}

// Bulk Operations Commands
export interface BulkUpdateEventsCommand extends Command {
  type: 'BULK_UPDATE_EVENTS';
  payload: {
    events: FinancialEvent[];
    runSimulation?: boolean;
  };
}

export interface ImportDataCommand extends Command {
  type: 'IMPORT_DATA';
  payload: {
    data: {
      config?: AppConfig;
      scenarios?: any;
      activeScenarioId?: string;
    };
    runSimulation?: boolean;
  };
}

// Application Lifecycle Commands
export interface InitializeAppCommand extends Command {
  type: 'INITIALIZE_APP';
  payload?: {
    skipOnboarding?: boolean;
  };
}

export interface ResetAppCommand extends Command {
  type: 'RESET_APP';
  payload?: {
    keepScenarios?: boolean;
  };
}

export interface LoadExampleScenarioCommand extends Command {
  type: 'LOAD_EXAMPLE_SCENARIO';
  payload?: {
    scenarioType?: 'tech_professional' | 'healthcare_worker' | 'entrepreneur' | 'debt_bankruptcy';
    personaName?: string;
  };
}

export interface LoadPersonaEventManifestCommand extends Command {
  type: 'LOAD_PERSONA_EVENT_MANIFEST';
  payload: {
    persona: PersonaProfile;
  };
}

export interface LoadScenarioDataCommand extends Command {
  type: 'LOAD_SCENARIO_DATA';
  payload: {
    scenarioName?: string;
    resetApp?: boolean;
    createNewScenario?: boolean;
    initialState: InitialStateEvent;
    events: FinancialEvent[];
    goals: EnhancedGoal[];
  };
}

// Strategy Commands
export interface ExecuteStrategyCommand extends Command {
  type: 'EXECUTE_STRATEGY';
  payload: {
    strategyId: string;
    context: StrategyExecutionContext;
    basePlanId: string;
  };
}

export interface RemoveStrategyCommand extends Command {
  type: 'REMOVE_STRATEGY';
  payload: {
    strategyId: string;
  };
}

export interface CreateStrategyPlanCommand extends Command {
  type: 'CREATE_STRATEGY_PLAN';
  payload: {
    basePlanId: string;
    strategy: StrategyEngine;
    context: StrategyExecutionContext;
    result: StrategyResult;
  };
}

export interface GetApplicableStrategiesCommand extends Command {
  type: 'GET_APPLICABLE_STRATEGIES';
  payload: {
    context: StrategyExecutionContext;
  };
}

export interface GetStrategyParametersCommand extends Command {
  type: 'GET_STRATEGY_PARAMETERS';
  payload: {
    strategyId: string;
  };
}

export interface ValidateStrategyInputsCommand extends Command {
  type: 'VALIDATE_STRATEGY_INPUTS';
  payload: {
    strategyId: string;
    inputs: Record<string, any>;
  };
}

// Union type of all commands for type safety
export type AppCommand =
  | UpdateInitialStateCommand
  | UpdateEventCommand
  | DeleteEventCommand
  | CreateEnhancedGoalCommand
  | UpdateEnhancedGoalCommand
  | DeleteEnhancedGoalCommand
  | CreateGoalFromRecommendationCommand
  | RunSimulationCommand
  | SimulationCompleteCommand
  | SimulationFailedCommand
  | CreateScenarioCommand
  | DeleteScenarioCommand
  | RenameScenarioCommand
  | SwitchScenarioCommand
  | UpdateConfigCommand
  | OpenModalCommand
  | CloseModalCommand
  | ShowConfirmationCommand
  | SetDeepDiveYearCommand
  | BulkUpdateEventsCommand
  | ImportDataCommand
  | InitializeAppCommand
  | ResetAppCommand
  | LoadExampleScenarioCommand
  | LoadPersonaEventManifestCommand
  | LoadScenarioDataCommand
  | ExecuteStrategyCommand
  | RemoveStrategyCommand
  | CreateStrategyPlanCommand
  | GetApplicableStrategiesCommand
  | GetStrategyParametersCommand
  | ValidateStrategyInputsCommand;

// Helper type to extract payload type from command type
export type CommandPayload<T extends AppCommand['type']> = Extract<AppCommand, { type: T }>['payload'];

// Command creators for type-safe command construction
export const createCommand = {
  updateInitialState: (initialStateData: InitialStateEvent, runSimulation = true): UpdateInitialStateCommand => ({
    type: 'UPDATE_INITIAL_STATE',
    payload: { initialStateData, runSimulation }
  }),

  updateEvent: (eventData: FinancialEvent, runSimulation = true): UpdateEventCommand => ({
    type: 'UPDATE_EVENT',
    payload: { eventData, runSimulation }
  }),

  deleteEvent: (eventId: string, runSimulation = true): DeleteEventCommand => ({
    type: 'DELETE_EVENT',
    payload: { eventId, runSimulation }
  }),


  // Legacy goal command creators removed - use enhanced goals instead

  createEnhancedGoal: (goalData: EnhancedGoal, runSimulation = true): CreateEnhancedGoalCommand => ({
    type: 'CREATE_ENHANCED_GOAL',
    payload: { goalData, runSimulation }
  }),

  updateEnhancedGoal: (goalData: EnhancedGoal, runSimulation = true): UpdateEnhancedGoalCommand => ({
    type: 'UPDATE_ENHANCED_GOAL',
    payload: { goalData, runSimulation }
  }),

  deleteEnhancedGoal: (goalId: string, runSimulation = true): DeleteEnhancedGoalCommand => ({
    type: 'DELETE_ENHANCED_GOAL',
    payload: { goalId, runSimulation }
  }),

  createGoalFromRecommendation: (recommendation: GoalRecommendation, runSimulation = true): CreateGoalFromRecommendationCommand => ({
    type: 'CREATE_GOAL_FROM_RECOMMENDATION',
    payload: { recommendation, runSimulation }
  }),

  runSimulation: (force = false): RunSimulationCommand => ({
    type: 'RUN_SIMULATION',
    payload: { force }
  }),

  simulationComplete: (result: SimulationPayload, scenarioId: string): SimulationCompleteCommand => ({
    type: 'SIMULATION_COMPLETE',
    payload: { result, scenarioId }
  }),

  simulationFailed: (error: Error, scenarioId: string): SimulationFailedCommand => ({
    type: 'SIMULATION_FAILED',
    payload: { error, scenarioId }
  }),

  createScenario: (name: string, sourceScenarioId?: string): CreateScenarioCommand => ({
    type: 'CREATE_SCENARIO',
    payload: { name, sourceScenarioId }
  }),

  deleteScenario: (scenarioId: string): DeleteScenarioCommand => ({
    type: 'DELETE_SCENARIO',
    payload: { scenarioId }
  }),

  renameScenario: (scenarioId: string, newName: string): RenameScenarioCommand => ({
    type: 'RENAME_SCENARIO',
    payload: { scenarioId, newName }
  }),

  switchScenario: (scenarioId: string, runSimulation = false): SwitchScenarioCommand => ({
    type: 'SWITCH_SCENARIO',
    payload: { scenarioId, runSimulation }
  }),

  updateConfig: (config: AppConfig | ((prev: AppConfig) => AppConfig), runSimulation = false): UpdateConfigCommand => ({
    type: 'UPDATE_CONFIG',
    payload: { config, runSimulation }
  }),

  openModal: (modalType: OpenModalCommand['payload']['modalType'], data?: any): OpenModalCommand => ({
    type: 'OPEN_MODAL',
    payload: { modalType, data }
  }),

  closeModal: (modalType: CloseModalCommand['payload']['modalType']): CloseModalCommand => ({
    type: 'CLOSE_MODAL',
    payload: { modalType }
  }),

  showConfirmation: (title: string, message: string, onConfirm: () => void): ShowConfirmationCommand => ({
    type: 'SHOW_CONFIRMATION',
    payload: { title, message, onConfirm }
  }),

  setDeepDiveYear: (year: number | null): SetDeepDiveYearCommand => ({
    type: 'SET_DEEP_DIVE_YEAR',
    payload: { year }
  }),

  bulkUpdateEvents: (events: FinancialEvent[], runSimulation = false): BulkUpdateEventsCommand => ({
    type: 'BULK_UPDATE_EVENTS',
    payload: { events, runSimulation }
  }),

  importData: (data: ImportDataCommand['payload']['data'], runSimulation = false): ImportDataCommand => ({
    type: 'IMPORT_DATA',
    payload: { data, runSimulation }
  }),

  initializeApp: (skipOnboarding = false): InitializeAppCommand => ({
    type: 'INITIALIZE_APP',
    payload: { skipOnboarding }
  }),

  resetApp: (keepScenarios = false): ResetAppCommand => ({
    type: 'RESET_APP',
    payload: { keepScenarios }
  }),

  loadExampleScenario: (scenarioType?: 'tech_professional' | 'healthcare_worker' | 'entrepreneur' | 'debt_bankruptcy', personaName?: string): LoadExampleScenarioCommand => ({
    type: 'LOAD_EXAMPLE_SCENARIO',
    payload: { scenarioType, personaName }
  }),
  loadPersonaEventManifest: (persona: PersonaProfile): LoadPersonaEventManifestCommand => ({
    type: 'LOAD_PERSONA_EVENT_MANIFEST',
    payload: { persona }
  }),

  loadScenarioData: (
    initialState: InitialStateEvent,
    events: FinancialEvent[],
    goals: LoadScenarioDataCommand['payload']['goals'],
    options: {
      scenarioName?: string;
      resetApp?: boolean;
      createNewScenario?: boolean;
    } = {}
  ): LoadScenarioDataCommand => ({
    type: 'LOAD_SCENARIO_DATA',
    payload: {
      scenarioName: options.scenarioName,
      resetApp: options.resetApp,
      createNewScenario: options.createNewScenario,
      initialState,
      events,
      goals
    }
  }),

  executeStrategy: (strategyId: string, context: StrategyExecutionContext, basePlanId: string): ExecuteStrategyCommand => ({
    type: 'EXECUTE_STRATEGY',
    payload: { strategyId, context, basePlanId }
  }),

  removeStrategy: (strategyId: string): RemoveStrategyCommand => ({
    type: 'REMOVE_STRATEGY',
    payload: { strategyId }
  }),

  createStrategyPlan: (basePlanId: string, strategy: StrategyEngine, context: StrategyExecutionContext, result: StrategyResult): CreateStrategyPlanCommand => ({
    type: 'CREATE_STRATEGY_PLAN',
    payload: { basePlanId, strategy, context, result }
  }),

  getApplicableStrategies: (context: StrategyExecutionContext): GetApplicableStrategiesCommand => ({
    type: 'GET_APPLICABLE_STRATEGIES',
    payload: { context }
  }),

  getStrategyParameters: (strategyId: string): GetStrategyParametersCommand => ({
    type: 'GET_STRATEGY_PARAMETERS',
    payload: { strategyId }
  }),

  validateStrategyInputs: (strategyId: string, inputs: Record<string, any>): ValidateStrategyInputsCommand => ({
    type: 'VALIDATE_STRATEGY_INPUTS',
    payload: { strategyId, inputs }
  })
};