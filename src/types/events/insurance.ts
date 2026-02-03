/**
 * Insurance Events - Insurance premium and benefit events
 * 
 * This module contains events related to insurance including life insurance,
 * disability insurance, and long-term care insurance.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// LIFE INSURANCE EVENTS
// =============================================================================

export const LIFE_INSURANCE_PREMIUM_EVENT_TYPE = EventType.LIFE_INSURANCE_PREMIUM;

/**
 * Life insurance premium payment event
 */
export interface LifeInsurancePremiumEvent extends BaseEvent {
  type: typeof LIFE_INSURANCE_PREMIUM_EVENT_TYPE;
  policyName: string; // e.g., 'Term Life Policy', 'Whole Life Policy'
  premiumAmount: number; // Monthly premium amount
  frequency?: 'monthly' | 'quarterly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When premiums start
  endDateOffset?: number; // When premiums end (optional)
  annualGrowthRate?: number; // How much premiums increase annually
  insuranceType: 'term' | 'whole' | 'universal' | 'variable' | 'other';
  policyId?: string; // Unique identifier for the policy
  sourceAccountType?: AccountType; // Account to pay premiums from
}

export function isLifeInsurancePremiumEvent(event: { type: EventType }): event is LifeInsurancePremiumEvent {
  return event.type === LIFE_INSURANCE_PREMIUM_EVENT_TYPE;
}

export const LIFE_INSURANCE_PAYOUT_EVENT_TYPE = EventType.LIFE_INSURANCE_PAYOUT;

/**
 * Life insurance payout event (death benefit)
 */
export interface LifeInsurancePayoutEvent extends BaseEvent {
  type: typeof LIFE_INSURANCE_PAYOUT_EVENT_TYPE;
  policyName: string;
  payoutAmount: number; // Death benefit amount
  policyId?: string; // Links to the premium policy
  targetAccountType?: AccountType; // Account to receive payout
  taxable?: boolean; // Whether payout is taxable (usually false)
  beneficiaryType?: 'spouse' | 'children' | 'estate' | 'other';
}

export function isLifeInsurancePayoutEvent(event: { type: EventType }): event is LifeInsurancePayoutEvent {
  return event.type === LIFE_INSURANCE_PAYOUT_EVENT_TYPE;
}

// =============================================================================
// DISABILITY INSURANCE EVENTS
// =============================================================================

export const DISABILITY_INSURANCE_PREMIUM_EVENT_TYPE = EventType.DISABILITY_INSURANCE_PREMIUM;

/**
 * Disability insurance premium payment event
 */
export interface DisabilityInsurancePremiumEvent extends BaseEvent {
  type: typeof DISABILITY_INSURANCE_PREMIUM_EVENT_TYPE;
  policyName: string; // e.g., 'Short-term Disability', 'Long-term Disability'
  premiumAmount: number; // Monthly premium amount
  frequency?: 'monthly' | 'quarterly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When premiums start
  endDateOffset?: number; // When premiums end (optional)
  annualGrowthRate?: number; // How much premiums increase annually
  disabilityType: 'short_term' | 'long_term' | 'both';
  policyId?: string; // Unique identifier for the policy
  sourceAccountType?: AccountType; // Account to pay premiums from
}

export function isDisabilityInsurancePremiumEvent(event: { type: EventType }): event is DisabilityInsurancePremiumEvent {
  return event.type === DISABILITY_INSURANCE_PREMIUM_EVENT_TYPE;
}

export const DISABILITY_INSURANCE_PAYOUT_EVENT_TYPE = EventType.DISABILITY_INSURANCE_PAYOUT;

/**
 * Disability insurance payout event (benefit payments)
 */
export interface DisabilityInsurancePayoutEvent extends BaseEvent {
  type: typeof DISABILITY_INSURANCE_PAYOUT_EVENT_TYPE;
  policyName: string;
  monthlyBenefit: number; // Monthly benefit amount
  startDateOffset: number; // When benefits start
  endDateOffset?: number; // When benefits end (optional)
  policyId?: string; // Links to the premium policy
  targetAccountType?: AccountType; // Account to receive benefits
  taxable?: boolean; // Whether benefits are taxable (depends on premium source)
  benefitPercentage?: number; // Percentage of income replaced (e.g., 0.6 for 60%)
}

export function isDisabilityInsurancePayoutEvent(event: { type: EventType }): event is DisabilityInsurancePayoutEvent {
  return event.type === DISABILITY_INSURANCE_PAYOUT_EVENT_TYPE;
}

// =============================================================================
// LONG-TERM CARE INSURANCE EVENTS
// =============================================================================

export const LONG_TERM_CARE_INSURANCE_PREMIUM_EVENT_TYPE = EventType.LONG_TERM_CARE_INSURANCE_PREMIUM;

/**
 * Long-term care insurance premium payment event
 */
export interface LongTermCareInsurancePremiumEvent extends BaseEvent {
  type: typeof LONG_TERM_CARE_INSURANCE_PREMIUM_EVENT_TYPE;
  policyName: string; // e.g., 'LTC Policy', 'Hybrid Life/LTC Policy'
  premiumAmount: number; // Monthly premium amount
  frequency?: 'monthly' | 'quarterly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When premiums start
  endDateOffset?: number; // When premiums end (optional)
  annualGrowthRate?: number; // How much premiums increase annually
  policyType: 'traditional' | 'hybrid_life' | 'hybrid_annuity' | 'other';
  policyId?: string; // Unique identifier for the policy
  sourceAccountType?: AccountType; // Account to pay premiums from
}

export function isLongTermCareInsurancePremiumEvent(event: { type: EventType }): event is LongTermCareInsurancePremiumEvent {
  return event.type === LONG_TERM_CARE_INSURANCE_PREMIUM_EVENT_TYPE;
}

export const LONG_TERM_CARE_PAYOUT_EVENT_TYPE = EventType.LONG_TERM_CARE_PAYOUT;

/**
 * Long-term care insurance payout event (benefit payments)
 */
export interface LongTermCarePayoutEvent extends BaseEvent {
  type: typeof LONG_TERM_CARE_PAYOUT_EVENT_TYPE;
  policyName: string;
  monthlyBenefit: number; // Monthly benefit amount
  startDateOffset: number; // When benefits start
  endDateOffset?: number; // When benefits end (optional)
  policyId?: string; // Links to the premium policy
  targetAccountType?: AccountType; // Account to receive benefits
  taxable?: boolean; // Whether benefits are taxable (usually false)
  benefitPeriodMonths?: number; // Maximum benefit period in months
  eliminationPeriodMonths?: number; // Waiting period before benefits begin

  // Insurance company
  insuranceCompany?: string; // Insurance company providing benefits

  // Care need assessment
  careLevel?: 'minimal' | 'moderate' | 'extensive' | 'cognitive'; // Level of care required
  careSetting?: 'home_care' | 'adult_day_care' | 'assisted_living' | 'nursing_home' | 'memory_care' | 'family_caregiver'; // Primary care setting
  careCondition?: string; // Brief description of condition requiring care
  eliminationPeriodDays?: number; // Waiting period in days (alternative to months)
  adlsImpaired?: number; // Number of Activities of Daily Living impaired (0-6)

  // Benefit details
  benefitPaymentType?: 'reimbursement' | 'indemnity' | 'hybrid'; // Method of benefit calculation
  dailyBenefit?: number; // Daily benefit amount
  actualCareCosts?: number; // Actual monthly care expenses

  // Duration and limits
  careDurationYears?: number; // Expected duration of care need
  maxBenefitPeriodYears?: number; // Policy maximum benefit duration in years
  lifetimeBenefit?: number; // Total lifetime benefit available
  benefitsUsed?: number; // Amount of benefit pool already used
  annualGrowthRate?: number; // Inflation protection rate for benefits
}

export function isLongTermCarePayoutEvent(event: { type: EventType }): event is LongTermCarePayoutEvent {
  return event.type === LONG_TERM_CARE_PAYOUT_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all insurance events
 */
export type InsuranceEvents = 
  | LifeInsurancePremiumEvent
  | LifeInsurancePayoutEvent
  | DisabilityInsurancePremiumEvent
  | DisabilityInsurancePayoutEvent
  | LongTermCareInsurancePremiumEvent
  | LongTermCarePayoutEvent;

/**
 * Type guard for any insurance event
 */
export function isInsuranceEventType(event: { type: EventType }): event is InsuranceEvents {
  return isLifeInsurancePremiumEvent(event) || 
         isLifeInsurancePayoutEvent(event) ||
         isDisabilityInsurancePremiumEvent(event) ||
         isDisabilityInsurancePayoutEvent(event) ||
         isLongTermCareInsurancePremiumEvent(event) ||
         isLongTermCarePayoutEvent(event);
}

/**
 * Type guard for insurance premium events
 */
export function isInsurancePremiumEvent(event: { type: EventType }): event is LifeInsurancePremiumEvent | DisabilityInsurancePremiumEvent | LongTermCareInsurancePremiumEvent {
  return isLifeInsurancePremiumEvent(event) ||
         isDisabilityInsurancePremiumEvent(event) ||
         isLongTermCareInsurancePremiumEvent(event);
}

/**
 * Type guard for insurance payout events
 */
export function isInsurancePayoutEvent(event: { type: EventType }): event is LifeInsurancePayoutEvent | DisabilityInsurancePayoutEvent | LongTermCarePayoutEvent {
  return isLifeInsurancePayoutEvent(event) ||
         isDisabilityInsurancePayoutEvent(event) ||
         isLongTermCarePayoutEvent(event);
}