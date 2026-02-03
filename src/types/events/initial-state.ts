/**
 * Initial State Event - Defines the starting state of the simulation
 * 
 * This module contains the InitialStateEvent which sets up the beginning
 * conditions for the financial simulation.
 */

import { BaseEvent, EventType } from './base';
import { FilingStatus } from '../common';

// Note: We import these from state module to avoid circular dependencies
// The full definitions are in state/account.ts and state/liability.ts
import { InitialAccountHoldings } from '../state/account';
import { LiabilityReference } from '../state/liability';

// =============================================================================
// INITIAL STATE EVENT
// =============================================================================

// =============================================================================
// INITIAL STATE EVENT
// =============================================================================

export const INITIAL_STATE_EVENT_TYPE = EventType.INITIAL_STATE;

export interface InitialStateEvent extends BaseEvent {
  type: typeof INITIAL_STATE_EVENT_TYPE;
  initialCash: number; // Retained for direct cash initialization
  initialAccounts: InitialAccountHoldings; // Use this for structured account assets
  initialLiabilities?: LiabilityReference[];
  startYear: number; // Year the simulation/scenario starts
  initialMonth: number; // Month of the startYear (0-11 or 1-12, clarify usage)
  currentAge: number; // Age of the primary individual at the start
  filingStatus: FilingStatus;
  numberOfDependents?: number;
  initialCapitalLossCarryover?: number;
}

export function isInitialStateEvent(event: { type: EventType }): event is InitialStateEvent {
  return event.type === INITIAL_STATE_EVENT_TYPE;
}