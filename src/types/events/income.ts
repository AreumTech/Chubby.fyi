/**
 * Income Events - All income-related event types
 * 
 * This module contains all income event definitions, including employment income,
 * Social Security, pensions, and other income sources.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// EMPLOYMENT INCOME
// =============================================================================

export const INCOME_EVENT_TYPE = EventType.INCOME;

export interface IncomeEvent extends BaseEvent {
  type: typeof INCOME_EVENT_TYPE;
  source: string; // e.g., 'Salary', 'Bonus', 'Rental Income'
  amount: number; // Gross amount before tax
  frequency?: 'monthly' | 'annually' | 'one-time'; // Legacy property for backwards compatibility
  startDateOffset: number; // Month offset when income starts
  endDateOffset?: number; // Month offset when income ends (optional)
  annualGrowthRate?: number;
  enableYearlyRaises?: boolean; // When true, income grows by inflation rate each year
  isNet?: boolean; // True if amount is after-tax
}

export function isIncomeEvent(event: { type: EventType }): event is IncomeEvent {
  return event.type === INCOME_EVENT_TYPE;
}

// =============================================================================
// SOCIAL SECURITY INCOME
// =============================================================================

export const SOCIAL_SECURITY_INCOME_EVENT_TYPE = EventType.SOCIAL_SECURITY_INCOME;

export interface SocialSecurityIncomeEvent extends BaseEvent {
  type: typeof SOCIAL_SECURITY_INCOME_EVENT_TYPE;
  source: string;
  amount: number;
  frequency?: 'monthly'; // Legacy property for backwards compatibility
  startDateOffset: number;
  endDateOffset?: number;
  annualGrowthRate?: number;
  isNet?: boolean;

  // Social Security-specific properties
  claimAge?: number; // Age when claiming benefits (62, 67, 70, etc.)
  fullRetirementAge?: number; // Full retirement age based on birth year
  isColaAdjusted?: boolean; // Whether to apply Cost of Living Adjustments
  colaRate?: number; // Expected annual COLA rate (defaults to inflation)
  earningsRecord?: number; // Average indexed monthly earnings (AIME)
  primaryInsuranceAmount?: number; // PIA at full retirement age

  // Spousal and survivor benefits
  isSpousalBenefit?: boolean; // Whether this is a spousal benefit
  isSurvivorBenefit?: boolean; // Whether this is a survivor benefit
  spousePrimaryBenefit?: number; // Spouse's primary benefit for coordination

  // Tax considerations
  provisionalIncome?: number; // For calculating taxable portion
  taxablePercentage?: number; // Percentage of benefits subject to tax (0%, 50%, or 85%)

  // Windfall elimination & government pension offset
  subjectToWep?: boolean; // Windfall Elimination Provision applies
  subjectToGpo?: boolean; // Government Pension Offset applies
  wepReduction?: number; // Monthly reduction due to WEP
  gpoReduction?: number; // Monthly reduction due to GPO
}

export function isSocialSecurityIncomeEvent(event: { type: EventType }): event is SocialSecurityIncomeEvent {
  return event.type === SOCIAL_SECURITY_INCOME_EVENT_TYPE;
}

// =============================================================================
// PENSION INCOME
// =============================================================================

export const PENSION_INCOME_EVENT_TYPE = EventType.PENSION_INCOME;

/**
 * Pension income events for modeling defined benefit plans in retirement.
 * Supports various pension types including government, corporate, and union pensions.
 */
export interface PensionIncomeEvent extends BaseEvent {
  type: typeof PENSION_INCOME_EVENT_TYPE;
  source: string; // e.g., 'State Teacher Pension', 'Corporate DB Plan'
  amount: number; // Monthly pension amount
  frequency?: 'monthly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When pension payments begin
  endDateOffset?: number; // Optional end date (for survivor benefits, etc.)
  annualGrowthRate?: number; // COLA adjustments
  survivorBenefitPercentage?: number; // Percentage for spouse (e.g., 0.5 for 50%)
  pensionType?: 'defined_benefit' | 'government' | 'military' | 'union' | 'other';
  isNet?: boolean; // Whether amount is after-tax

  // Pension-specific properties
  isColaAdjusted?: boolean; // Whether to apply Cost of Living Adjustments
  colaRate?: number; // Annual COLA rate (defaults to inflation)
  vestingDate?: number; // Month offset when pension vests
  earlyRetirementAge?: number; // Minimum age for early retirement
  normalRetirementAge?: number; // Normal retirement age for full benefits
  earlyRetirementReduction?: number; // Reduction percentage for early retirement
  lumpSumOption?: boolean; // Whether lump sum option is available
  lumpSumAmount?: number; // Lump sum value if taking that option
  jointAndSurvivorOption?: boolean; // Whether joint & survivor option selected
}

export function isPensionIncomeEvent(event: { type: EventType }): event is PensionIncomeEvent {
  return event.type === PENSION_INCOME_EVENT_TYPE;
}

// =============================================================================
// ANNUITY PAYMENTS
// =============================================================================

export const ANNUITY_PAYMENT_EVENT_TYPE = EventType.ANNUITY_PAYMENT;

/**
 * Annuity payment events for modeling annuity income streams in retirement.
 * Supports immediate and deferred annuities with various payout options.
 */
export interface AnnuityPaymentEvent extends BaseEvent {
  type: typeof ANNUITY_PAYMENT_EVENT_TYPE;
  source: string; // e.g., 'Immediate Annuity', 'Variable Annuity'
  amount: number; // Payment amount per period
  frequency?: 'monthly' | 'quarterly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When annuity payments begin
  endDateOffset?: number; // For period-certain annuities
  annualGrowthRate?: number; // For variable or inflation-adjusted annuities
  annuityType?: 'immediate' | 'deferred' | 'variable' | 'fixed' | 'inflation_adjusted';
  survivorBenefitPercentage?: number; // Joint-life annuity survivor percentage
  guaranteedPeriodYears?: number; // Period-certain guarantee
  isNet?: boolean; // Whether amount is after-tax
}

export function isAnnuityPaymentEvent(event: { type: EventType }): event is AnnuityPaymentEvent {
  return event.type === ANNUITY_PAYMENT_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all income events
 */
export type IncomeEvents = 
  | IncomeEvent
  | SocialSecurityIncomeEvent
  | PensionIncomeEvent
  | AnnuityPaymentEvent
  | RentalIncomeEvent;

/**
 * Type guard for any income event
 */
export function isIncomeEventType(event: { type: EventType }): event is IncomeEvents {
  return isIncomeEvent(event) || 
         isSocialSecurityIncomeEvent(event) || 
         isPensionIncomeEvent(event) || 
         isAnnuityPaymentEvent(event) ||
         isRentalIncomeEvent(event);
}

/**
 * Type guard for recurring income events (excludes one-time income)
 */
// =============================================================================
// RENTAL INCOME
// =============================================================================

export const RENTAL_INCOME_EVENT_TYPE = EventType.RENTAL_INCOME;

/**
 * Rental income events for modeling property rental income streams.
 * Supports various property types and associated expenses.
 */
export interface RentalIncomeEvent extends BaseEvent {
  type: typeof RENTAL_INCOME_EVENT_TYPE;
  propertyName: string; // e.g., 'Main Street Duplex', 'Vacation Rental'
  grossRentalIncome: number; // Monthly gross rental income
  frequency?: 'monthly' | 'annually'; // Legacy property for backwards compatibility
  startDateOffset: number; // When rental income starts
  endDateOffset?: number; // When rental income ends (optional)
  annualGrowthRate?: number; // Annual rent increases
  
  // Deductible expenses (monthly amounts)
  propertyManagementFee?: number; // Property management fees
  maintenanceReserve?: number; // Monthly maintenance reserve
  propertyTaxes?: number; // Monthly property taxes
  insurance?: number; // Monthly insurance premiums
  utilities?: number; // Monthly utilities (if paid by owner)
  otherExpenses?: number; // Other deductible expenses
  
  // Depreciation (annual amount)
  annualDepreciation?: number; // Annual depreciation deduction
  
  // Property details
  propertyType?: 'residential' | 'commercial' | 'vacation_rental' | 'other';
  isNet?: boolean; // Whether amount is net of expenses
}

export function isRentalIncomeEvent(event: { type: EventType }): event is RentalIncomeEvent {
  return event.type === RENTAL_INCOME_EVENT_TYPE;
}

// =============================================================================
// DIVIDEND & INTEREST INCOME
// =============================================================================

export const DIVIDEND_INCOME_EVENT_TYPE = EventType.DIVIDEND_INCOME;

/**
 * Dividend and Interest Income Event
 * 
 * Tracks regular investment income from dividends, bond interest, and other securities.
 * This is different from capital gains - it's the regular income generated by investments.
 */
export interface DividendIncomeEvent extends BaseEvent {
  type: typeof DIVIDEND_INCOME_EVENT_TYPE;
  amount: number; // Monthly or annual dividend/interest amount
  source: string; // Description of income source (e.g., "VTSAX Dividends", "Bond Interest")
  frequency: 'monthly' | 'quarterly' | 'annually'; // How often dividends are paid
  startDateOffset: number; // When dividend income starts
  endDateOffset?: number; // When dividend income ends (optional)
  annualGrowthRate?: number; // Expected annual growth in dividend income
  
  // Income source details
  sourceAccountType?: AccountType; // Account where dividends are received
  yieldRate?: number; // Annual yield rate (for informational purposes)
  isQualified?: boolean; // Whether dividends qualify for preferential tax treatment
  reinvestDividends?: boolean; // Whether dividends are automatically reinvested
  
  // Tax considerations
  isNet?: boolean; // Whether amount is after taxes
}

export function isDividendIncomeEvent(event: { type: EventType }): event is DividendIncomeEvent {
  return event.type === DIVIDEND_INCOME_EVENT_TYPE;
}

export function isRecurringIncomeEvent(event: { type: EventType }): event is SocialSecurityIncomeEvent | PensionIncomeEvent | AnnuityPaymentEvent | RentalIncomeEvent | DividendIncomeEvent {
  return isSocialSecurityIncomeEvent(event) || 
         isPensionIncomeEvent(event) || 
         isAnnuityPaymentEvent(event) ||
         isRentalIncomeEvent(event) ||
         isDividendIncomeEvent(event);
}