/**
 * Liability Events - Debt and liability management events
 * 
 * This module contains events related to managing liabilities including
 * adding new liabilities and making payments.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// LIABILITY INTERFACES (Re-exported from state module)
// =============================================================================

// Note: The full Liability interface is defined in state/liability.ts
// We only include the minimal interface needed for events here
export interface LiabilityReference {
  id: string;
  name: string;
  type: 'mortgage' | 'student' | 'auto' | 'credit_card' | 'personal' | 'other';
  originalPrincipalAmount: number;
  currentPrincipalBalance: number;
  annualInterestRate: number;
  interestRateType?: 'fixed' | 'variable'; // Enhanced: Support for variable rates
  remainingTermInMonths: number;
  monthlyPayment: number;
  startDate?: string;
  linkedAssetId?: string;
  // Variable rate properties
  baseRate?: number; // Base rate for variable loans (e.g., Prime Rate)
  margin?: number; // Margin added to base rate
  rateCap?: number; // Maximum rate for variable loans
  rateFloor?: number; // Minimum rate for variable loans
  rateAdjustmentFrequencyMonths?: number; // How often rate adjusts (e.g., 12 for annually)
}

// =============================================================================
// LIABILITY ADDITION
// =============================================================================

export const LIABILITY_ADD_EVENT_TYPE = EventType.LIABILITY_ADD;

export interface LiabilityAddEvent extends BaseEvent {
  type: typeof LIABILITY_ADD_EVENT_TYPE;
  liability: LiabilityReference; // The details of the liability being added
}

export function isLiabilityAddEvent(event: { type: EventType }): event is LiabilityAddEvent {
  return event.type === LIABILITY_ADD_EVENT_TYPE;
}

// =============================================================================
// LIABILITY PAYMENTS
// =============================================================================

export const LIABILITY_PAYMENT_EVENT_TYPE = EventType.LIABILITY_PAYMENT;

export interface LiabilityPaymentEvent extends BaseEvent {
  type: typeof LIABILITY_PAYMENT_EVENT_TYPE;
  amount: number; // Payment amount
  targetLiabilityId: string; // ID of the liability being paid (required)
  paymentType: 'minimum' | 'extra' | 'payoff'; // Type of payment
  sourceAccountType?: AccountType; // Source account for payment
}

export function isLiabilityPaymentEvent(event: { type: EventType }): event is LiabilityPaymentEvent {
  return event.type === LIABILITY_PAYMENT_EVENT_TYPE;
}

// =============================================================================
// DEBT PAYMENTS (Legacy alias for LIABILITY_PAYMENT)
// =============================================================================

export const DEBT_PAYMENT_EVENT_TYPE = EventType.DEBT_PAYMENT;

export interface DebtPaymentEvent extends BaseEvent {
  type: typeof DEBT_PAYMENT_EVENT_TYPE;
  amount: number;
  targetLiabilityId: string;
  paymentType: 'minimum' | 'extra' | 'payoff';
  sourceAccountType?: AccountType;
}

export function isDebtPaymentEvent(event: { type: EventType }): event is DebtPaymentEvent {
  return event.type === DEBT_PAYMENT_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all liability events
 */
export type LiabilityEvents =
  | LiabilityAddEvent
  | LiabilityPaymentEvent
  | DebtPaymentEvent
  | DebtConsolidationEvent
  | RefinanceEvent
  | HomeEquityLoanEvent
  | RateResetEvent;

/**
 * Type guard for any liability event
 */
// =============================================================================
// DEBT CONSOLIDATION
// =============================================================================

export const DEBT_CONSOLIDATION_EVENT_TYPE = EventType.DEBT_CONSOLIDATION;

/**
 * Debt consolidation event for combining multiple debts into a single loan
 */
export interface DebtConsolidationEvent extends BaseEvent {
  type: typeof DEBT_CONSOLIDATION_EVENT_TYPE;
  newLiability: LiabilityReference; // The new consolidated loan
  liabilitiesToPayOff: string[]; // IDs of liabilities to pay off
  consolidationCosts?: number; // Fees associated with consolidation
  sourceAccountType?: AccountType; // Account to pay consolidation costs from
}

export function isDebtConsolidationEvent(event: { type: EventType }): event is DebtConsolidationEvent {
  return event.type === DEBT_CONSOLIDATION_EVENT_TYPE;
}

// =============================================================================
// REFINANCE
// =============================================================================

export const REFINANCE_EVENT_TYPE = EventType.REFINANCE;

/**
 * Refinance event for replacing an existing loan with a new one
 */
export interface RefinanceEvent extends BaseEvent {
  type: typeof REFINANCE_EVENT_TYPE;
  originalLiabilityId: string; // ID of liability being refinanced
  newLiability: LiabilityReference; // The new refinanced loan
  refinancingCosts?: number; // Fees associated with refinancing
  sourceAccountType?: AccountType; // Account to pay refinancing costs from
  cashOutAmount?: number; // Cash-out amount for cash-out refinancing
  targetAccountType?: AccountType; // Account to receive cash-out proceeds
}

export function isRefinanceEvent(event: { type: EventType }): event is RefinanceEvent {
  return event.type === REFINANCE_EVENT_TYPE;
}

// =============================================================================
// HOME EQUITY LOAN/HELOC
// =============================================================================

export const HOME_EQUITY_LOAN_EVENT_TYPE = EventType.HOME_EQUITY_LOAN;

/**
 * Home Equity Loan or HELOC Event
 * 
 * Establishes a home equity line of credit or loan against home equity.
 * Common uses include home improvements, debt consolidation, or investments.
 */
export interface HomeEquityLoanEvent extends BaseEvent {
  type: typeof HOME_EQUITY_LOAN_EVENT_TYPE;
  amount: number; // Credit line limit or loan amount
  interestRate: number; // Annual percentage rate
  loanType: 'heloc' | 'home_equity_loan'; // Type of equity financing
  
  // Loan terms
  drawPeriodYears?: number; // Years during which you can draw funds (HELOC only)
  repaymentPeriodYears?: number; // Years to repay the loan
  minimumDrawAmount?: number; // Minimum draw amount (HELOC)
  
  // Costs and fees
  closingCosts?: number; // One-time closing costs
  annualFee?: number; // Annual maintenance fee
  sourceAccountType?: AccountType; // Account to pay fees from
  
  // Use of funds
  intendedUse?: 'home_improvement' | 'debt_consolidation' | 'investment' | 'education' | 'other';
  targetAccountType?: AccountType; // Where drawn funds go
  
  // Advanced options
  interestOnlyPeriod?: boolean; // Whether there's an interest-only period
  variableRate?: boolean; // Whether rate is variable
  rateCap?: number; // Maximum rate (for variable rate loans)
}

export function isHomeEquityLoanEvent(event: { type: EventType }): event is HomeEquityLoanEvent {
  return event.type === HOME_EQUITY_LOAN_EVENT_TYPE;
}

export function isLiabilityEventType(event: { type: EventType }): event is LiabilityEvents {
  return isLiabilityAddEvent(event) ||
         isLiabilityPaymentEvent(event) ||
         isDebtPaymentEvent(event) ||
         isDebtConsolidationEvent(event) ||
         isRefinanceEvent(event) ||
         isHomeEquityLoanEvent(event) ||
         isRateResetEvent(event);
}

// =============================================================================
// RATE RESET EVENT - PFOS-E Variable Rate Loan Adjustment
// =============================================================================

export const RATE_RESET_EVENT_TYPE = EventType.RATE_RESET;

/**
 * Rate Reset Event for Variable-Rate Loans
 *
 * Changes the interest rate on an existing liability mid-simulation.
 * Supports both explicit rate overrides and base rate adjustments
 * for variable-rate loans.
 *
 * PFOS-E Required: driverKey must be 'debt:interest'
 */
export interface RateResetEvent extends BaseEvent {
  type: typeof RATE_RESET_EVENT_TYPE;

  /** ID of the liability to adjust */
  targetLiabilityId: string;

  /** Explicit new interest rate (overrides base + margin calculation) */
  newInterestRate?: number;

  /** New base rate for variable loans (e.g., Prime Rate, SOFR) */
  newBaseRate?: number;

  /** Month offset when the new rate takes effect */
  effectiveMonthOffset: number;

  /** PFOS-E required: sensitivity attribution key */
  driverKey: 'debt:interest';
}

export function isRateResetEvent(event: { type: EventType }): event is RateResetEvent {
  return event.type === RATE_RESET_EVENT_TYPE;
}