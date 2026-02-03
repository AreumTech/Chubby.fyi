/**
 * Scenario Management Command Handlers
 * 
 * These handlers manage scenario operations including creation, deletion,
 * renaming, and switching between scenarios.
 */

import { useAppStore } from "@/store/appStore";
import { CommandHandler } from '../commandBus';
import { Scenario } from '@/store/slices/planSlice';
import { logger } from '@/utils/logger';
import { withAutoSimulation } from '../handlerUtils';
import { EventPriority } from '@/types';
import { INITIAL_STATE_EVENT_TYPE } from '@/types/events/initial-state';
import { createDefaultPolicySettings } from '@/types/strategies/unified';
import {
  CreateScenarioCommand,
  DeleteScenarioCommand,
  RenameScenarioCommand,
  SwitchScenarioCommand
} from '../types';

export const createScenarioHandler: CommandHandler<CreateScenarioCommand> = async (command) => {
  const { name, sourceScenarioId } = command.payload;
  const { duplicateScenario, setScenarios, setActiveScenarioId } = useAppStore.getState();
  
  if (sourceScenarioId) {
    // Duplicate existing scenario
    const newScenarioId = duplicateScenario(sourceScenarioId, name);
    logger.info(`[createScenarioHandler] Duplicated scenario ${sourceScenarioId} as ${newScenarioId}`);
  } else {
    // Create new empty scenario with default initial state
    const newId = Math.random().toString(36).substr(2, 9);
    const { config } = useAppStore.getState();
    
    const defaultInitialState: any = {
      id: Math.random().toString(36).substr(2, 9),
      type: INITIAL_STATE_EVENT_TYPE,
      name: 'Initial State',
      priority: EventPriority.USER_ACTION,
      currentAge: config.currentAge,
      startYear: config.simulationStartYear,
      initialMonth: config.currentMonth,
      filingStatus: config.filingStatus,
      numberOfDependents: config.numberOfDependents || 0,
      initialCash: 50000,
      initialAccounts: {
        taxable: [{
          id: 'initial-taxable-stocks',
          assetClass: 'stocks',
          assetSymbolOrIdentifier: 'VTSAX',
          quantity: 1000,
          purchasePricePerUnit: 85,
          costBasisTotal: 85000,
          currentMarketPricePerUnit: 100,
          currentMarketValueTotal: 100000,
          unrealizedGainLossTotal: 15000,
          openTransactionDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString()
        }],
        tax_deferred: [{
          id: 'initial-401k-stocks',
          assetClass: 'stocks',
          assetSymbolOrIdentifier: 'VTIAX',
          quantity: 750,
          purchasePricePerUnit: 93.33,
          costBasisTotal: 70000,
          currentMarketPricePerUnit: 100,
          currentMarketValueTotal: 75000,
          unrealizedGainLossTotal: 5000,
          openTransactionDate: new Date(new Date().getFullYear() - 3, 0, 1).toISOString()
        }],
        roth: [{
          id: 'initial-roth-stocks',
          assetClass: 'stocks',
          assetSymbolOrIdentifier: 'VTIAX',
          quantity: 250,
          purchasePricePerUnit: 80,
          costBasisTotal: 20000,
          currentMarketPricePerUnit: 100,
          currentMarketValueTotal: 25000,
          unrealizedGainLossTotal: 5000,
          openTransactionDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString()
        }]
      },
      initialLiabilities: [],
      monthOffset: 0,
    };
    
    const newScenario: Scenario = {
      id: newId,
      name,
      description: undefined,
      createdAt: new Date(),
      lastModified: new Date(),
      sourcePersona: undefined,
      initialState: defaultInitialState,
      eventLedger: [defaultInitialState], // INITIAL_STATE must always be first event
      enhancedGoals: [],
      policySettings: createDefaultPolicySettings()
    };
    
    setScenarios(prev => ({
      ...prev,
      [newId]: newScenario
    }));
    setActiveScenarioId(newId);
    
    logger.info(`[createScenarioHandler] Created new scenario: ${newId}`);
  }
};

export const deleteScenarioHandler: CommandHandler<DeleteScenarioCommand> = async (command) => {
  const { scenarioId } = command.payload;
  const { deleteScenario } = useAppStore.getState();
  
  deleteScenario(scenarioId);
  logger.info(`[deleteScenarioHandler] Deleted scenario: ${scenarioId}`);
};

export const renameScenarioHandler: CommandHandler<RenameScenarioCommand> = async (command) => {
  const { scenarioId, newName } = command.payload;
  const { renameScenario } = useAppStore.getState();
  
  renameScenario(scenarioId, newName);
  logger.info(`[renameScenarioHandler] Renamed scenario ${scenarioId} to: ${newName}`);
};

// Core logic for switching scenarios (without simulation trigger)
const switchScenarioHandlerCore: CommandHandler<SwitchScenarioCommand> = async (command) => {
  const { scenarioId } = command.payload;
  const { setActiveScenarioId, scenarios } = useAppStore.getState();

  if (!scenarios[scenarioId]) {
    logger.error(`[switchScenarioHandler] Scenario not found: ${scenarioId}`);
    return;
  }

  setActiveScenarioId(scenarioId);
  logger.info(`[switchScenarioHandler] Switched to scenario: ${scenarioId}`);
};

// Decorated handler with automatic simulation trigger
export const switchScenarioHandler = withAutoSimulation(switchScenarioHandlerCore);