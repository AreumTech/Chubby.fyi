/**
 * Event Migration Service
 * 
 * Handles migration of legacy events to ensure they meet current validation requirements.
 * This fixes issues where old events are missing required fields like description, priority, etc.
 */

import type { FinancialEvent, EventType, EventPriority } from '../types/events';
import { logger } from '../utils/logger';

interface LegacyEvent {
  id: string;
  type: EventType;
  name?: string;
  amount?: number;
  description?: string;
  priority?: string | number;
  monthOffset?: number;
  startDateOffset?: number;
  endDateOffset?: number;
  [key: string]: any;
}

/**
 * Converts string priorities to numeric EventPriority values
 */
function convertPriorityToNumber(priority: string | number | undefined): number {
  if (typeof priority === 'number') {
    return priority; // Already numeric
  }
  
  if (typeof priority === 'string') {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 70; // EventPriority.USER_ACTION
      case 'MEDIUM':
      case 'NORMAL':
        return 80; // EventPriority.DEFAULT_FINANCIAL_EVENT
      case 'LOW':
        return 100; // EventPriority.TIME_STEP
      case 'USER_ACTION':
        return 70;
      case 'DEFAULT_FINANCIAL_EVENT':
        return 80;
      case 'TIME_STEP':
        return 100;
      case 'INCOME':
        return 1;
      case 'RECURRING_EXPENSE':
        return 12;
      case 'SCHEDULED_CONTRIBUTION':
        return 21;
      default:
        return 80; // Default fallback
    }
  }
  
  return 80; // Default fallback
}

/**
 * Migrates a legacy event to meet current validation requirements
 */
export function migrateEvent(event: LegacyEvent): FinancialEvent {
  const migrated = { ...event } as any;
  
  // Ensure required fields exist
  
  // Fix missing name field
  if (!migrated.name) {
    migrated.name = getDefaultDescription(event.type);
    logger.debug(`[migrateEvent] Added name to event ${event.id}: "${migrated.name}"`);
  }
  
  if (!migrated.description) {
    migrated.description = migrated.name || getDefaultDescription(event.type);
    logger.debug(`[migrateEvent] Added description to event ${event.id}: "${migrated.description}"`);
  }
  
  // Convert string priority to numeric EventPriority
  const oldPriority = migrated.priority;
  migrated.priority = convertPriorityToNumber(migrated.priority);
  
  if (oldPriority !== migrated.priority) {
    logger.debug(`[migrateEvent] Event ${event.id}: Converted priority from ${oldPriority} (${typeof oldPriority}) to ${migrated.priority}`);
  }
  
  // Ensure monthOffset exists
  if (migrated.monthOffset === undefined || migrated.monthOffset === null) {
    migrated.monthOffset = 0; // Start immediately
  }
  
  // Ensure date offsets are integers
  if (migrated.startDateOffset !== undefined && !Number.isInteger(migrated.startDateOffset)) {
    migrated.startDateOffset = Math.round(migrated.startDateOffset || 0);
  }
  
  if (migrated.endDateOffset !== undefined && !Number.isInteger(migrated.endDateOffset)) {
    migrated.endDateOffset = Math.round(migrated.endDateOffset || 0);
  }
  
  // Event-specific migrations
  switch (event.type) {
    case 'INCOME':
    case 'SOCIAL_SECURITY_INCOME':
    case 'PENSION_INCOME':
    case 'RENTAL_INCOME':
    case 'BUSINESS_INCOME':
      if (!migrated.description && migrated.name) {
        migrated.description = `Income from ${migrated.name}`;
      }
      break;
      
    case 'RECURRING_EXPENSE':
    case 'ONE_TIME_EXPENSE':
    case 'HEALTHCARE_EXPENSE':
      if (!migrated.description && migrated.name) {
        migrated.description = `Expense for ${migrated.name}`;
      }
      break;
      
    case 'SCHEDULED_CONTRIBUTION':
      if (!migrated.description) {
        migrated.description = `Contribution to ${migrated.targetAccountType || 'investment account'}`;
      }
      break;
      
    case 'ROTH_CONVERSION':
      if (!migrated.description) {
        migrated.description = `Roth IRA conversion of $${migrated.amount || 0}`;
      }
      break;
      
    default:
      if (!migrated.description) {
        migrated.description = migrated.name || `${event.type} event`;
      }
  }
  
  return migrated as FinancialEvent;
}

/**
 * Migrates an array of events
 */
export function migrateEvents(events: LegacyEvent[]): FinancialEvent[] {
  return events.map(migrateEvent);
}

/**
 * Gets a default description for an event type
 */
function getDefaultDescription(eventType: EventType): string {
  switch (eventType) {
    case 'INCOME': return 'Income event';
    case 'SOCIAL_SECURITY_INCOME': return 'Social Security income';
    case 'PENSION_INCOME': return 'Pension income';
    case 'RENTAL_INCOME': return 'Rental property income';
    case 'BUSINESS_INCOME': return 'Business income';
    case 'RECURRING_EXPENSE': return 'Recurring expense';
    case 'ONE_TIME_EXPENSE': return 'One-time expense';
    case 'HEALTHCARE_EXPENSE': return 'Healthcare expense';
    case 'SCHEDULED_CONTRIBUTION': return 'Investment contribution';
    case 'ROTH_CONVERSION': return 'Roth IRA conversion';
    case 'REAL_ESTATE_PURCHASE': return 'Real estate purchase';
    case 'LIABILITY_ADD': return 'Liability added';
    case 'LIABILITY_PAYMENT': return 'Liability payment';
    case 'INITIAL_STATE': return 'Initial financial state';
    default: return 'Financial event';
  }
}

/**
 * Checks if an event needs migration
 */
export function eventNeedsMigration(event: any): boolean {
  // Check for missing required fields
  const needsName = !event.name;
  const needsDescription = !event.description;
  const needsPriority = !event.priority || typeof event.priority === 'string';
  const needsMonthOffset = event.monthOffset === undefined || event.monthOffset === null;
  const needsDateOffsetFix = (event.startDateOffset !== undefined && !Number.isInteger(event.startDateOffset)) ||
                             (event.endDateOffset !== undefined && !Number.isInteger(event.endDateOffset));
  
  const needs = needsName || needsDescription || needsPriority || needsMonthOffset || needsDateOffsetFix;
  
  if (needs) {
    logger.debug(`[eventNeedsMigration] Event ${event.id} needs migration:`, {
      needsName,
      needsDescription,
      needsPriority: needsPriority ? `${event.priority} (${typeof event.priority})` : false,
      needsMonthOffset,
      needsDateOffsetFix
    });
  }
  
  return needs;
}