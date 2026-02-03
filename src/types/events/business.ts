/**
 * Business & Self-Employment Events
 * 
 * This module contains events related to business income, self-employment,
 * and entrepreneurial activities.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// BUSINESS INCOME EVENTS
// =============================================================================

export const BUSINESS_INCOME_EVENT_TYPE = EventType.BUSINESS_INCOME;

/**
 * Business income event for self-employment and business profits
 */
export interface BusinessIncomeEvent extends BaseEvent {
  type: typeof BUSINESS_INCOME_EVENT_TYPE;
  businessName: string; // Name of the business
  incomeAmount: number; // Monthly business income
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'irregular'; // Legacy property for backwards compatibility
  startDateOffset: number; // When business income starts
  endDateOffset?: number; // When business income ends (optional)
  annualGrowthRate?: number; // How much income grows annually
  
  // Business details
  businessType: 'sole_proprietorship' | 'partnership' | 'llc' | 's_corp' | 'c_corp' | 'other';
  industryType?: string; // Industry classification
  
  // Tax considerations
  isNet?: boolean; // Whether amount is net of business expenses
  subjectToSelfEmploymentTax?: boolean; // Whether subject to SE tax (default: true)
  
  // Deductible business expenses (monthly amounts)
  businessExpenses?: number; // Deductible business expenses
  homeOfficeDeduction?: number; // Home office deduction
  businessInsurance?: number; // Business insurance premiums
  professionalFees?: number; // Legal/accounting fees
  marketingExpenses?: number; // Marketing and advertising
  equipmentDepreciation?: number; // Equipment depreciation
  
  // Cash flow
  targetAccountType?: AccountType; // Account to receive income
  sourceAccountType?: AccountType; // Account to pay expenses from
}

export function isBusinessIncomeEvent(event: { type: EventType }): event is BusinessIncomeEvent {
  return event.type === BUSINESS_INCOME_EVENT_TYPE;
}

// =============================================================================
// QUARTERLY ESTIMATED TAX PAYMENTS
// =============================================================================

export const QUARTERLY_ESTIMATED_TAX_PAYMENT_EVENT_TYPE = EventType.QUARTERLY_ESTIMATED_TAX_PAYMENT;

/**
 * Quarterly estimated tax payment event for business owners and freelancers
 */
export interface QuarterlyEstimatedTaxPaymentEvent extends BaseEvent {
  type: typeof QUARTERLY_ESTIMATED_TAX_PAYMENT_EVENT_TYPE;
  paymentAmount: number; // Quarterly payment amount
  startDateOffset: number; // When payments start
  endDateOffset?: number; // When payments end (optional)
  annualGrowthRate?: number; // How much payments increase annually
  
  // Tax payment details
  taxYear: number; // Tax year for the payments
  quarter: 1 | 2 | 3 | 4; // Which quarter this payment covers
  
  // Payment breakdown
  federalAmount?: number; // Federal portion of payment
  stateAmount?: number; // State portion of payment
  localAmount?: number; // Local portion of payment
  
  // Payment method
  sourceAccountType?: AccountType; // Account to pay from
  paymentMethod?: 'check' | 'electronic' | 'credit_card' | 'other';
  
  // Business relationship
  relatedBusinessName?: string; // Business generating the tax liability
  estimatedAnnualIncome?: number; // Estimated annual income for the tax year
}

export function isQuarterlyEstimatedTaxPaymentEvent(event: { type: EventType }): event is QuarterlyEstimatedTaxPaymentEvent {
  return event.type === QUARTERLY_ESTIMATED_TAX_PAYMENT_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all business events
 */
export type BusinessEvents = 
  | BusinessIncomeEvent
  | QuarterlyEstimatedTaxPaymentEvent;

/**
 * Type guard for any business event
 */
export function isBusinessEventType(event: { type: EventType }): event is BusinessEvents {
  return isBusinessIncomeEvent(event) || 
         isQuarterlyEstimatedTaxPaymentEvent(event);
}

/**
 * Type guard for events that generate business income
 */
export function isBusinessIncomeEventType(event: { type: EventType }): event is BusinessIncomeEvent {
  return isBusinessIncomeEvent(event);
}

/**
 * Type guard for events that represent business tax obligations
 */
export function isBusinessTaxEventType(event: { type: EventType }): event is QuarterlyEstimatedTaxPaymentEvent {
  return isQuarterlyEstimatedTaxPaymentEvent(event);
}

