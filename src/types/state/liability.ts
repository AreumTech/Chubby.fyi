/**
 * Liability State Types - Debt and liability management
 * 
 * This module contains all liability-related state definitions including
 * liability details and debt management structures.
 */

import { LiabilityType, LiabilityTypeDetailed } from '../common';

export interface LiabilityReference {
  id: string;
  name: string;
  type: 'mortgage' | 'student' | 'auto' | 'credit_card' | 'personal' | 'other';
  originalPrincipalAmount: number;
  currentPrincipalBalance: number;
  annualInterestRate: number;
  remainingTermInMonths: number;
  monthlyPayment: number;
  startDate?: string;
  linkedAssetId?: string;
}

// =============================================================================
// LIABILITY - Core debt/liability definition
// =============================================================================

/**
 * Represents a debt or liability in the financial simulation
 * Contains all information needed for payment calculations and tracking
 */
export interface Liability {
  /** Unique identifier for this liability */
  id: string;
  
  /** User-friendly name for the liability */
  name: string;
  
  /** High-level liability type */
  type: LiabilityType;
  
  /** Detailed liability classification */
  detailedType?: LiabilityTypeDetailed;
  
  /** Original principal amount when the debt was created */
  originalPrincipalAmount: number;
  
  /** Current outstanding principal balance */
  currentPrincipalBalance: number;
  
  /** Annual interest rate (as decimal, e.g., 0.05 for 5%) */
  annualInterestRate: number;
  
  /** Remaining term in months */
  remainingTermInMonths: number;
  
  /** Required monthly payment amount */
  monthlyPayment: number;
  
  /** Start date of the liability (YYYY-MM-DD format) */
  startDate?: string;
  
  /** ID of linked asset (for secured loans like mortgages) */
  linkedAssetId?: string;
  
  /** Additional metadata */
  metadata?: {
    /** Original loan term in months */
    originalTermMonths?: number;
    
    /** Loan origination date */
    originationDate?: string;
    
    /** Whether this is a fixed or variable rate */
    rateType?: 'fixed' | 'variable';
    
    /** Minimum payment amount */
    minimumPayment?: number;
    
    /** Whether extra payments are allowed */
    allowExtraPayments?: boolean;
    
    /** Prepayment penalty details */
    prepaymentPenalty?: {
      exists: boolean;
      amount?: number;
      endDate?: string;
    };
    
    /** Lender/servicer information */
    lender?: string;
    
    /** Account number (masked) */
    accountNumber?: string;
    
    /** Whether to include in simulation */
    includeInSimulation?: boolean;
  };
}

// =============================================================================
// LIABILITY PAYMENT TRACKING
// =============================================================================

/**
 * Tracks a payment made against a liability
 * Used for payment history and amortization calculations
 */
export interface LiabilityPayment {
  /** Unique payment ID */
  id: string;
  
  /** ID of the liability this payment applies to */
  liabilityId: string;
  
  /** Date of payment */
  paymentDate: string;
  
  /** Total payment amount */
  totalAmount: number;
  
  /** Amount applied to principal */
  principalAmount: number;
  
  /** Amount applied to interest */
  interestAmount: number;
  
  /** Amount applied to other fees */
  feesAmount?: number;
  
  /** Whether this was an extra payment beyond the minimum */
  isExtraPayment: boolean;
  
  /** Payment method/source */
  paymentSource?: string;
  
  /** Remaining balance after this payment */
  remainingBalance?: number;
}

// =============================================================================
// AMORTIZATION SCHEDULE
// =============================================================================

/**
 * Represents one entry in an amortization schedule
 */
export interface AmortizationEntry {
  /** Payment number */
  paymentNumber: number;
  
  /** Payment date */
  paymentDate: string;
  
  /** Beginning balance for this payment */
  beginningBalance: number;
  
  /** Scheduled payment amount */
  scheduledPayment: number;
  
  /** Extra payment amount */
  extraPayment: number;
  
  /** Total payment (scheduled + extra) */
  totalPayment: number;
  
  /** Principal portion of payment */
  principalPayment: number;
  
  /** Interest portion of payment */
  interestPayment: number;
  
  /** Ending balance after payment */
  endingBalance: number;
  
  /** Cumulative principal paid */
  cumulativePrincipal: number;
  
  /** Cumulative interest paid */
  cumulativeInterest: number;
}

// =============================================================================
// DEBT MANAGEMENT STRUCTURES
// =============================================================================

/**
 * Debt management method for prioritizing payments
 */
export type DebtManagementMethod = 'avalanche' | 'snowball' | 'custom';

/**
 * Configuration for debt management strategy
 */
export interface DebtManagementConfig {
  /** Method for prioritizing debt payments */
  method: DebtManagementMethod;
  
  /** Extra payment amount available monthly */
  extraPaymentAmountMonthly?: number;
  
  /** Whether to use surplus cash flow for debt payments */
  useSurplusCashflow?: boolean;
  
  /** Target payoff dates for specific liabilities */
  targetPayoffDates?: { [liabilityId: string]: string };
  
  /** Custom priority order for debt payments */
  customPriorityOrder?: string[]; // Array of liability IDs
  
  /** Minimum extra payment amount to bother with */
  minExtraPaymentThreshold?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate monthly interest rate from annual rate
 */
export function getMonthlyInterestRate(annualRate: number): number {
  return annualRate / 12;
}

/**
 * Calculate interest portion of a payment
 */
export function calculateInterestPayment(balance: number, monthlyRate: number): number {
  return balance * monthlyRate;
}

/**
 * Calculate principal portion of a payment
 */
export function calculatePrincipalPayment(totalPayment: number, interestPayment: number): number {
  return Math.max(0, totalPayment - interestPayment);
}

/**
 * Calculate remaining balance after a payment
 */
export function calculateRemainingBalance(currentBalance: number, principalPayment: number): number {
  return Math.max(0, currentBalance - principalPayment);
}

/**
 * Check if liability is secured (has linked asset)
 */
export function isSecuredLiability(liability: Liability): boolean {
  return liability.linkedAssetId !== undefined && liability.linkedAssetId !== null;
}

/**
 * Get liability priority for debt avalanche method
 */
export function getAvalanchePriority(liability: Liability): number {
  return liability.annualInterestRate; // Higher rate = higher priority
}

/**
 * Get liability priority for debt snowball method
 */
export function getSnowballPriority(liability: Liability): number {
  return -liability.currentPrincipalBalance; // Lower balance = higher priority (negative for sorting)
}