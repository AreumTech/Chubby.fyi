/**
 * Lifecycle Transition Events
 * 
 * Events that model major life transitions and their financial impacts.
 * These events capture changes in location, property, and healthcare
 * that significantly affect financial planning.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// RELOCATION EVENT
// =============================================================================

export const RELOCATION_EVENT_TYPE = EventType.RELOCATION;

export interface RelocationEvent extends BaseEvent {
  type: typeof RELOCATION_EVENT_TYPE;
  fromState: string; // Current state/location
  toState: string; // Destination state/location
  movingCosts: number; // One-time moving expenses
  costOfLivingChange: number; // Percentage change in living costs (+/- as decimal, e.g., 0.15 for 15% increase)
  stateTaxImpact: {
    incomeTaxChange: number; // Percentage point change in effective tax rate
    salesTaxChange: number; // Percentage point change in sales tax rate
    propertyTaxChange: number; // Percentage point change in property tax rate
  };
  effectiveDate: number; // Month offset when relocation occurs
  housingCostChange?: number; // Specific housing cost change (overrides cost of living if provided)
  description?: string; // Additional details about the move
}

export function isRelocationEvent(event: { type: EventType }): event is RelocationEvent {
  return event.type === RELOCATION_EVENT_TYPE;
}

// =============================================================================
// REAL ESTATE APPRECIATION EVENT
// =============================================================================

export const REAL_ESTATE_APPRECIATION_EVENT_TYPE = EventType.REAL_ESTATE_APPRECIATION;

export interface RealEstateAppreciationEvent extends BaseEvent {
  type: typeof REAL_ESTATE_APPRECIATION_EVENT_TYPE;
  propertyName: string; // Identifier for the property
  currentValue: number; // Current estimated value
  annualAppreciationRate: number; // Expected annual appreciation rate as decimal (e.g., 0.03 for 3%)
  startDateOffset: number; // When appreciation tracking begins
  endDateOffset?: number; // When appreciation tracking ends (optional)
  reassessmentFrequency?: number; // How often to reassess value (in months, default 12)
  volatility?: number; // Standard deviation for Monte Carlo simulation
  category?: 'primary-residence' | 'investment-property' | 'vacation-home';
  taxBasis?: number; // Purchase price for capital gains calculations
}

export function isRealEstateAppreciationEvent(event: { type: EventType }): event is RealEstateAppreciationEvent {
  return event.type === REAL_ESTATE_APPRECIATION_EVENT_TYPE;
}

// =============================================================================
// PROPERTY MAINTENANCE EVENT
// =============================================================================

export const PROPERTY_MAINTENANCE_EVENT_TYPE = EventType.PROPERTY_MAINTENANCE;

export interface PropertyMaintenanceEvent extends BaseEvent {
  type: typeof PROPERTY_MAINTENANCE_EVENT_TYPE;
  propertyName: string; // Identifier for the property
  annualMaintenanceCost: number; // Annual maintenance costs
  startDateOffset: number; // When maintenance costs begin
  endDateOffset?: number; // When maintenance costs end (e.g., when property is sold)
  maintenanceSchedule: {
    routine: number; // Annual routine maintenance (percentage of property value, e.g., 0.01 for 1%)
    major: {
      frequency: number; // Years between major maintenance
      cost: number; // Cost of major maintenance as percentage of property value
    };
    emergency: {
      annualProbability: number; // Probability of emergency repair per year
      averageCost: number; // Average cost of emergency repair
    };
  };
  annualGrowthRate?: number; // How maintenance costs increase annually
  paymentAccount?: AccountType; // Which account to pay from
  taxDeductible?: boolean; // Whether costs are tax deductible (for rental properties)
}

export function isPropertyMaintenanceEvent(event: { type: EventType }): event is PropertyMaintenanceEvent {
  return event.type === PROPERTY_MAINTENANCE_EVENT_TYPE;
}

// =============================================================================
// HEALTHCARE TRANSITION EVENT
// =============================================================================

export const HEALTHCARE_TRANSITION_EVENT_TYPE = EventType.HEALTHCARE_TRANSITION;

export interface HealthcareTransitionEvent extends BaseEvent {
  type: typeof HEALTHCARE_TRANSITION_EVENT_TYPE;
  transitionType: 'job-loss-cobra' | 'early-retirement-aca' | 'medicare-transition' | 'spouse-plan-change';
  startDateOffset: number; // When transition begins
  endDateOffset: number; // When transition ends
  bridgeCosts: {
    monthlyPremium: number; // Monthly premium cost
    deductible: number; // Annual deductible
    maxOutOfPocket: number; // Maximum annual out-of-pocket costs
  };
  subsidyEligible?: boolean; // Whether eligible for ACA subsidies
  cobraDetails?: {
    originalPremium: number; // Original employer-sponsored premium
    employerContribution: number; // What employer was paying
    cobraMultiplier: number; // COBRA cost multiplier (typically 1.02)
  };
  paymentAccount?: AccountType; // Which account to pay from
  annualGrowthRate?: number; // Premium inflation rate
}

export function isHealthcareTransitionEvent(event: { type: EventType }): event is HealthcareTransitionEvent {
  return event.type === HEALTHCARE_TRANSITION_EVENT_TYPE;
}

// =============================================================================
// CAREER CHANGE EVENT
// =============================================================================

export const CAREER_CHANGE_EVENT_TYPE = EventType.CAREER_CHANGE;

export interface CareerChangeEvent extends BaseEvent {
  type: typeof CAREER_CHANGE_EVENT_TYPE;
  changeType: 'job-change' | 'promotion' | 'career-switch' | 'retirement' | 'unemployment' | 'self-employment';
  effectiveDate: number; // Month offset when change occurs
  incomeChange: {
    currentIncome: number; // Current annual income
    newIncome: number; // New annual income
    changeReason?: string; // Additional context
  };
  benefitsChange?: {
    healthInsuranceChange: 'improved' | 'downgraded' | 'lost' | 'no-change';
    retirementMatchChange?: number; // Change in employer match percentage
    stockOptionsGranted?: number; // Value of new stock options/RSUs
    bonusStructureChange?: string; // Description of bonus changes
  };
  costsAndExpenses?: {
    jobSearchCosts?: number; // One-time costs for job searching
    relocationCosts?: number; // Moving costs if job requires relocation
    educationCosts?: number; // Costs for retraining or certification
    unemploymentDuration?: number; // Expected months of unemployment
  };
  taxImplications?: {
    stateChange?: boolean; // Whether moving to different tax state
    filingStatusChange?: boolean; // Whether filing status changes
    deductionChanges?: string; // Description of deduction changes
  };
  description?: string; // Additional details about the career change
}

export function isCareerChangeEvent(event: { type: EventType }): event is CareerChangeEvent {
  return event.type === CAREER_CHANGE_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all lifecycle transition events
 */
export type LifecycleTransitionEvents = 
  | RelocationEvent
  | RealEstateAppreciationEvent
  | PropertyMaintenanceEvent
  | HealthcareTransitionEvent
  | CareerChangeEvent;

/**
 * Type guard for any lifecycle transition event
 */
export function isLifecycleTransitionEventType(event: { type: EventType }): event is LifecycleTransitionEvents {
  return isRelocationEvent(event) || 
         isRealEstateAppreciationEvent(event) || 
         isPropertyMaintenanceEvent(event) ||
         isHealthcareTransitionEvent(event) ||
         isCareerChangeEvent(event);
}

/**
 * Type guard for events that affect property values
 */
export function affectsPropertyValue(event: { type: EventType }): event is RealEstateAppreciationEvent | PropertyMaintenanceEvent {
  return isRealEstateAppreciationEvent(event) || isPropertyMaintenanceEvent(event);
}

/**
 * Type guard for events that have ongoing costs
 */
export function hasOngoingCosts(event: { type: EventType }): event is PropertyMaintenanceEvent | HealthcareTransitionEvent {
  return isPropertyMaintenanceEvent(event) || isHealthcareTransitionEvent(event);
}

/**
 * Type guard for events that affect taxes
 */
export function affectsTaxes(event: { type: EventType }): event is RelocationEvent | PropertyMaintenanceEvent {
  return isRelocationEvent(event) || isPropertyMaintenanceEvent(event);
}