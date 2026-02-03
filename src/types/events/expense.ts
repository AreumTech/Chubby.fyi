/**
 * Expense Events - All expense-related event types
 * 
 * This module contains all expense event definitions, including recurring expenses,
 * one-time expenses, and healthcare costs.
 */

import { BaseEvent, EventType } from './base';
import { FilingStatus } from '../common';

// =============================================================================
// RECURRING EXPENSES
// =============================================================================

export const RECURRING_EXPENSE_EVENT_TYPE = EventType.RECURRING_EXPENSE;

export interface RecurringExpenseEvent extends BaseEvent {
  type: typeof RECURRING_EXPENSE_EVENT_TYPE;
  category?: string; // e.g., 'Housing', 'Utilities', 'Insurance'
  amount: number; // Monthly amount
  frequency?: 'monthly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // Month offset when expense starts
  endDateOffset?: number; // Month offset when expense ends (optional)
  annualGrowthRate?: number; // How much the expense increases annually
}

export function isRecurringExpenseEvent(event: { type: EventType }): event is RecurringExpenseEvent {
  return event.type === RECURRING_EXPENSE_EVENT_TYPE;
}

// =============================================================================
// ONE-TIME EVENTS (Consolidated from ONE_TIME_EXPENSE and ONE_TIME_EVENT)
// =============================================================================

export const ONE_TIME_EVENT_TYPE = EventType.ONE_TIME_EVENT;

/**
 * OneTimeEvent - Handles both financial and non-financial one-time events
 * 
 * This consolidated event type replaces the previous OneTimeExpenseEvent and OneTimeEvent.
 * Use the amount field to indicate financial impact, or omit it for non-financial events.
 */
export interface OneTimeEvent extends BaseEvent {
  type: typeof ONE_TIME_EVENT_TYPE;
  category?: string; // e.g., 'Vacation', 'Appliance Purchase', 'Life Event', 'Decision Point'
  amount?: number; // Optional: Amount for financial impact (positive=expense, negative=income)
  description?: string; // Detailed description of the event
  isExpense?: boolean; // Optional: Explicitly mark as expense vs other event types
}

export function isOneTimeEvent(event: { type: EventType }): event is OneTimeEvent {
  return event.type === ONE_TIME_EVENT_TYPE;
}

// Legacy type guard for backward compatibility during migration
export function isOneTimeExpenseEvent(event: { type: EventType }): event is OneTimeEvent {
  return event.type === ONE_TIME_EVENT_TYPE;
}

// Type alias for backward compatibility
export type OneTimeExpenseEvent = OneTimeEvent;

// =============================================================================
// HEALTHCARE COSTS
// =============================================================================

export const HEALTHCARE_COST_EVENT_TYPE = EventType.HEALTHCARE_COST;

export interface HealthcareCostEvent extends BaseEvent {
  type: typeof HEALTHCARE_COST_EVENT_TYPE;
  baseAnnualCost: number; // Base annual cost before adjustments
  startDateOffset: number; // Month to start incurring healthcare costs
  endDateOffset: number; // Month to stop incurring healthcare costs (e.g., upon death or other event)
  annualGrowthRate: number; // Rate at which costs increase annually
  filingStatus: FilingStatus; // Used for IRMAA calculations
  // IRMAA adjustments calculated dynamically based on income
}

export function isHealthcareCostEvent(event: { type: EventType }): event is HealthcareCostEvent {
  return event.type === HEALTHCARE_COST_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all expense events
 */
export type ExpenseEvents = 
  | RecurringExpenseEvent
  | OneTimeEvent
  | HealthcareCostEvent;

/**
 * Type guard for any expense event
 */
export function isExpenseEventType(event: { type: EventType }): event is ExpenseEvents {
  return isRecurringExpenseEvent(event) || 
         isOneTimeEvent(event) || 
         isHealthcareCostEvent(event);
}

/**
 * Type guard for events with a specific amount
 */
export function hasAmount(event: { type: EventType; amount?: number }): event is RecurringExpenseEvent | OneTimeEvent | HealthcareCostEvent {
  return (isRecurringExpenseEvent(event) || 
          isOneTimeEvent(event) || 
          isHealthcareCostEvent(event)) && 
         typeof event.amount === 'number';
}

/**
 * Type guard for events with growth rates
 */
export function hasGrowthRate(event: { type: EventType; annualGrowthRate?: number }): event is RecurringExpenseEvent | HealthcareCostEvent {
  return (isRecurringExpenseEvent(event) || isHealthcareCostEvent(event)) && 
         typeof event.annualGrowthRate === 'number';
}