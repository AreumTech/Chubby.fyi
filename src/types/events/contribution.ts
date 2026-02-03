/**
 * Contribution Events - Investment contribution event types
 * 
 * This module contains events related to contributing money to investment accounts,
 * including scheduled contributions and retirement account contributions.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// SCHEDULED CONTRIBUTIONS
// =============================================================================

export const SCHEDULED_CONTRIBUTION_EVENT_TYPE = EventType.SCHEDULED_CONTRIBUTION;

export interface ScheduledContributionEvent extends BaseEvent {
  type: typeof SCHEDULED_CONTRIBUTION_EVENT_TYPE;
  accountType: AccountType; // Target account (legacy property)
  targetAccountType?: AccountType; // Preferred: Target account (alias for accountType)
  amount: number; // Amount per contribution
  frequency?: 'monthly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // Month offset when contributions start
  endDateOffset?: number; // Month offset when contributions end (optional)
  annualGrowthRate?: number; // Growth rate of the contribution amount itself

  // Contribution details
  isEmployerMatch?: boolean; // Whether this represents employer matching
  employerMatchPercentage?: number; // Employer match percentage
  employerMatchLimit?: number; // Maximum employer match amount
  isCatchUpContribution?: boolean; // Age 50+ catch-up contribution
  contributionLimit?: number; // Annual contribution limit for this account type
  sourceOfFunds?: 'salary' | 'bonus' | 'other_income' | 'external'; // Where contribution comes from
}

export function isScheduledContributionEvent(event: { type: EventType }): event is ScheduledContributionEvent {
  return event.type === SCHEDULED_CONTRIBUTION_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all contribution events
 */
export type ContributionEvents = ScheduledContributionEvent;

/**
 * Type guard for any contribution event
 */
export function isContributionEventType(event: { type: EventType }): event is ContributionEvents {
  return isScheduledContributionEvent(event);
}

/**
 * Type guard for events with frequency (legacy support)
 */
export function hasFrequency(event: { type: EventType; frequency?: string }): event is ScheduledContributionEvent {
  return isScheduledContributionEvent(event) && 
         typeof event.frequency === 'string';
}

/**
 * Type guard for events with date ranges
 */
export function hasDateRange(event: { type: EventType; startDateOffset?: number; endDateOffset?: number }): event is ScheduledContributionEvent {
  return isScheduledContributionEvent(event) && 
         typeof event.startDateOffset === 'number';
}