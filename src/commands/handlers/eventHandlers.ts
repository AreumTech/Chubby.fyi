/**
 * Event Management Command Handlers
 * 
 * These handlers manage financial events in the event ledger and coordinate
 * with the simulation engine when needed.
 */

import { useAppStore } from "@/store/appStore";
import { CommandHandler } from '../commandBus';
import { withAutoSimulation } from '../handlerUtils';
import {
  UpdateInitialStateCommand,
  UpdateEventCommand,
  DeleteEventCommand,
  CreateEnhancedGoalCommand,
  UpdateEnhancedGoalCommand,
  DeleteEnhancedGoalCommand,
  CreateGoalFromRecommendationCommand,
  BulkUpdateEventsCommand
} from '../types';
import { EnhancedGoal } from '@/types/enhanced-goal';
import { EventType } from '@/types';
import { logger } from '@/utils/logger';
import { getEventTypeDisplayName } from '@/services/eventCategorization';

// Core logic for updating initial state (without simulation trigger)
const updateInitialStateHandlerCore: CommandHandler<UpdateInitialStateCommand> = async (command) => {
  const { initialStateData } = command.payload;
  const { setInitialState, getEventLedger, setEventLedger } = useAppStore.getState();

  setInitialState(initialStateData);

  // IMPORTANT: Also update the INITIAL_STATE event in eventLedger
  // This ensures UI shows the updated values
  const eventLedger = getEventLedger();
  const initEventIndex = eventLedger.findIndex(e => e.type === EventType.INITIAL_STATE);

  if (initEventIndex > -1) {
    const newLedger = eventLedger.map((e, i) =>
      i === initEventIndex ? initialStateData : e
    );
    setEventLedger(newLedger as any);
    logger.info('[updateInitialStateHandler] Synced INITIAL_STATE to eventLedger');
  }
};

// Decorated handler with automatic simulation trigger
export const updateInitialStateHandler = withAutoSimulation(updateInitialStateHandlerCore);

// Core logic for updating events (without simulation trigger)
const updateEventHandlerCore: CommandHandler<UpdateEventCommand> = async (command) => {
  const { eventData } = command.payload;
  const { getEventLedger, setEventLedger, setInitialState } = useAppStore.getState();

  // Sync name and description fields
  // - name: Used by frontend UI (e.g., "Job Title" for income events)
  // - description: Used by WASM for chart markers and event labels
  // When user edits name in the form, description should update to match so chart markers reflect the change
  const name = eventData.name || eventData.description || `${eventData.id.slice(-8)}_${eventData.type.toLowerCase()}`;
  const finalEventData = {
    ...eventData,
    name,
    description: name, // Always sync description with name for chart markers
  };

  const eventLedger = getEventLedger();
  const existingEventIndex = eventLedger.findIndex(e => e.id === finalEventData.id);

  let newLedger;
  if (existingEventIndex > -1) {
    // Update existing event
    newLedger = eventLedger.map(e => e.id === finalEventData.id ? finalEventData : e);
  } else {
    // Add new event
    newLedger = [...eventLedger, finalEventData];
  }

  setEventLedger(newLedger);

  // IMPORTANT: If this is an INITIAL_STATE event, also update scenario.initialState
  // This ensures simulation uses the updated values
  if (finalEventData.type === EventType.INITIAL_STATE) {
    setInitialState(finalEventData as any);
    logger.info('[updateEventHandler] Synced INITIAL_STATE to scenario.initialState');
  }
};

// Decorated handler with automatic simulation trigger
export const updateEventHandler = withAutoSimulation(updateEventHandlerCore);

// Core logic for deleting events (without simulation trigger)
const deleteEventHandlerCore: CommandHandler<DeleteEventCommand> = async (command) => {
  const { eventId } = command.payload;
  const { getEventLedger, setEventLedger } = useAppStore.getState();

  const eventLedger = getEventLedger();
  const newLedger = eventLedger.filter(e => e.id !== eventId);
  setEventLedger(newLedger);
};

// Decorated handler with automatic simulation trigger
export const deleteEventHandler = withAutoSimulation(deleteEventHandlerCore);


// Legacy createGoalHandler removed - use enhanced goals instead

// Legacy updateGoalHandler removed - use enhanced goals instead

// Core logic for creating enhanced goals (without simulation trigger)
const createEnhancedGoalHandlerCore: CommandHandler<CreateEnhancedGoalCommand> = async (command) => {
  const { goalData } = command.payload;
  const { getEnhancedGoals, setEnhancedGoals } = useAppStore.getState();

  // Check for duplicate enhanced goals by ID
  const existingGoals = getEnhancedGoals();
  const existingGoal = existingGoals.find(g => g.id === goalData.id);

  if (existingGoal) {
    logger.commandLog(`Skipping duplicate enhanced goal creation with ID: ${goalData.id}`);
    // Goal already exists, don't create duplicate
    return;
  }

  // Ensure required timestamps are set
  const now = new Date();
  const enhancedGoal = {
    ...goalData,
    createdAt: goalData.createdAt || now,
    updatedAt: goalData.updatedAt || now,
    isActive: goalData.isActive !== undefined ? goalData.isActive : true
  };

  const newGoals = [...existingGoals, enhancedGoal];
  setEnhancedGoals(newGoals);

  logger.commandLog(`Created new enhanced goal: ${enhancedGoal.name} (${enhancedGoal.id})`);
};

// Decorated handler with automatic simulation trigger
export const createEnhancedGoalHandler = withAutoSimulation(createEnhancedGoalHandlerCore);

// Core logic for creating enhanced goal from recommendation (without simulation trigger)
const createGoalFromRecommendationHandlerCore: CommandHandler<CreateGoalFromRecommendationCommand> = async (command) => {
  const { recommendation } = command.payload;

  // Check if suggestedGoal exists
  if (!recommendation.suggestedGoal) {
    throw new Error('Recommendation does not contain a suggested goal');
  }

  // Transform recommendation into EnhancedGoal
  const goalData: EnhancedGoal = {
    ...recommendation.suggestedGoal,
    id: `goal-${Date.now()}`,
    name: recommendation.suggestedGoal.name || 'Untitled Goal',
    targetAmount: recommendation.suggestedGoal.targetAmount || 0,
    category: (recommendation.suggestedGoal.category as 'RETIREMENT' | 'EMERGENCY_FUND' | 'HOUSE_DOWN_PAYMENT' | 'EDUCATION' | 'VACATION' | 'CUSTOM') || 'CUSTOM',
    priority: recommendation.suggestedGoal.priority || 'MEDIUM',
    targetAccount: recommendation.suggestedGoal.targetAccount || { type: 'cash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  logger.commandLog(`Creating enhanced goal from recommendation: ${goalData.name}`);

  // Use the existing createEnhancedGoalHandlerCore logic
  return createEnhancedGoalHandlerCore({
    type: 'CREATE_ENHANCED_GOAL',
    payload: { goalData }
  });
};

// Decorated handler with automatic simulation trigger
export const createGoalFromRecommendationHandler = withAutoSimulation(createGoalFromRecommendationHandlerCore);


// Core logic for updating enhanced goals (without simulation trigger)
const updateEnhancedGoalHandlerCore: CommandHandler<UpdateEnhancedGoalCommand> = async (command) => {
  const { goalData } = command.payload;
  const { getEnhancedGoals, setEnhancedGoals } = useAppStore.getState();

  // Ensure updatedAt timestamp is set
  const updatedGoal = {
    ...goalData,
    updatedAt: new Date()
  };

  const goals = getEnhancedGoals();
  const newGoals = goals.map(g => g.id === goalData.id ? updatedGoal : g);
  setEnhancedGoals(newGoals);
};

// Decorated handler with automatic simulation trigger
export const updateEnhancedGoalHandler = withAutoSimulation(updateEnhancedGoalHandlerCore);

// Core logic for deleting enhanced goals (without simulation trigger)
const deleteEnhancedGoalHandlerCore: CommandHandler<DeleteEnhancedGoalCommand> = async (command) => {
  const { goalId } = command.payload;
  const { getEnhancedGoals, setEnhancedGoals } = useAppStore.getState();

  const goals = getEnhancedGoals();
  const newGoals = goals.filter(g => g.id !== goalId);
  setEnhancedGoals(newGoals);
};

// Decorated handler with automatic simulation trigger
export const deleteEnhancedGoalHandler = withAutoSimulation(deleteEnhancedGoalHandlerCore);

// Core logic for bulk updating events (without simulation trigger)
const bulkUpdateEventsHandlerCore: CommandHandler<BulkUpdateEventsCommand> = async (command) => {
  const { events } = command.payload;
  const { getEventLedger, setEventLedger } = useAppStore.getState();

  const eventLedger = getEventLedger();
  const eventMap = new Map(eventLedger.map(e => [e.id, e]));

  // Update the map with new/updated events
  events.forEach(event => {
    eventMap.set(event.id, event);
  });

  const newLedger = Array.from(eventMap.values());
  setEventLedger(newLedger);
};

// Decorated handler with automatic simulation trigger
export const bulkUpdateEventsHandler = withAutoSimulation(bulkUpdateEventsHandlerCore);