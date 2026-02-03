/**
 * Education Events - Education-specific financial events
 * 
 * This module contains events related to education funding including 529 plans,
 * tuition payments, and education savings.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// 529 PLAN EVENTS
// =============================================================================

export const FIVE_TWO_NINE_CONTRIBUTION_EVENT_TYPE = EventType.FIVE_TWO_NINE_CONTRIBUTION;

/**
 * 529 plan contribution event
 */
export interface FiveTwoNineContributionEvent extends BaseEvent {
  type: typeof FIVE_TWO_NINE_CONTRIBUTION_EVENT_TYPE;
  planName: string; // e.g., 'College Savings Plan', 'Education Fund'
  contributionAmount: number; // Monthly contribution amount
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'one_time'; // Legacy property for backwards compatibility
  startDateOffset: number; // When contributions start
  endDateOffset?: number; // When contributions end (optional)
  annualGrowthRate?: number; // How much contributions increase annually
  
  // 529-specific properties
  beneficiaryName?: string; // Name of the beneficiary
  planState?: string; // State of the 529 plan
  sourceAccountType?: AccountType; // Account to fund contributions from
  
  // Tax considerations
  stateTaxDeduction?: number; // Annual state tax deduction amount
  giftTaxElection?: boolean; // Whether to elect 5-year gift tax averaging
  
  // Contribution limits
  respectAnnualGiftLimit?: boolean; // Whether to respect annual gift limits
  respectStateLimit?: boolean; // Whether to respect state contribution limits
}

export function isFiveTwoNineContributionEvent(event: { type: EventType }): event is FiveTwoNineContributionEvent {
  return event.type === FIVE_TWO_NINE_CONTRIBUTION_EVENT_TYPE;
}

export const FIVE_TWO_NINE_WITHDRAWAL_EVENT_TYPE = EventType.FIVE_TWO_NINE_WITHDRAWAL;

/**
 * 529 plan withdrawal event
 */
export interface FiveTwoNineWithdrawalEvent extends BaseEvent {
  type: typeof FIVE_TWO_NINE_WITHDRAWAL_EVENT_TYPE;
  planName: string;
  withdrawalAmount: number; // Amount to withdraw
  withdrawalPurpose: 'qualified_education' | 'non_qualified' | 'rollover';
  
  // Education expense details (for qualified withdrawals)
  educationExpenseType?: 'tuition' | 'fees' | 'books' | 'supplies' | 'room_board' | 'computer' | 'other';
  educationInstitution?: string; // Name of educational institution
  
  // Tax implications
  taxableAmount?: number; // Taxable portion of withdrawal (for non-qualified)
  penaltyAmount?: number; // 10% penalty on earnings (for non-qualified)
  
  targetAccountType?: AccountType; // Account to receive withdrawal proceeds
  beneficiaryName?: string; // Beneficiary for the withdrawal
}

export function isFiveTwoNineWithdrawalEvent(event: { type: EventType }): event is FiveTwoNineWithdrawalEvent {
  return event.type === FIVE_TWO_NINE_WITHDRAWAL_EVENT_TYPE;
}

// =============================================================================
// TUITION PAYMENT EVENTS
// =============================================================================

export const TUITION_PAYMENT_EVENT_TYPE = EventType.TUITION_PAYMENT;

/**
 * Tuition payment event
 */
export interface TuitionPaymentEvent extends BaseEvent {
  type: typeof TUITION_PAYMENT_EVENT_TYPE;
  studentName: string; // Name of the student
  institutionName: string; // Name of educational institution

  // Amount aliases for form compatibility
  tuitionAmount?: number; // Amount of tuition payment (legacy)

  // Payment details
  frequency?: 'monthly' | 'quarterly' | 'semester' | 'annually' | 'one_time'; // Payment frequency
  startDateOffset: number; // When payments start
  endDateOffset?: number; // When payments end (optional)
  annualGrowthRate?: number; // How much tuition increases annually

  // Payment source details
  sourceAccountType?: AccountType; // Primary account to pay from
  paymentMethod?: 'direct' | 'student_account' | 'financial_aid' | 'third_party'; // How payment is made
  fiveTwoNinePlanName?: string; // 529 plan to use for payment
  fiveTwoNineAmount?: number; // Amount to pay from 529 plan

  // Education details
  educationLevel?: 'k12' | 'undergraduate' | 'graduate' | 'professional' | 'trade_vocational' | 'continuing_education' | 'other';
  academicYear?: string; // Academic year (e.g., "2024-2025")
  program?: string; // Program or major
  programType?: 'full_time' | 'part_time' | 'online' | 'other';
  studentAge?: number; // Current age of student
  programDurationYears?: number; // Expected years to complete

  // Additional expenses
  includesFees?: boolean; // Whether tuition includes mandatory fees
  additionalFees?: number; // Additional fees not included in tuition
  mandatoryFees?: number; // Required institutional fees
  booksSupplies?: number; // Required books and course materials
  roomBoard?: number; // On-campus housing and meal costs
  technologyEquipment?: number; // Required computers, software, lab equipment
  transportationCosts?: number; // Travel to/from school, parking, gas

  // Financial aid
  financialAid?: number; // Grants, scholarships, work-study
  studentLoans?: number; // Federal and private student loans

  // Tax considerations
  taxable?: boolean; // Whether payment is taxable (typically false for expenses)
  eligibleForTaxCredits?: boolean; // Whether eligible for education tax credits
  taxCreditType?: 'american_opportunity' | 'lifetime_learning' | 'other';
  taxCredit?: 'american_opportunity' | 'lifetime_learning' | 'tuition_deduction' | 'none'; // Selected tax benefit
  estimatedTaxBenefit?: number; // Estimated annual tax credit or deduction value
}

export function isTuitionPaymentEvent(event: { type: EventType }): event is TuitionPaymentEvent {
  return event.type === TUITION_PAYMENT_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all education events
 */
export type EducationEvents = 
  | FiveTwoNineContributionEvent
  | FiveTwoNineWithdrawalEvent
  | TuitionPaymentEvent;

/**
 * Type guard for any education event
 */
export function isEducationEventType(event: { type: EventType }): event is EducationEvents {
  return isFiveTwoNineContributionEvent(event) || 
         isFiveTwoNineWithdrawalEvent(event) ||
         isTuitionPaymentEvent(event);
}

/**
 * Type guard for 529 plan events
 */
export function isFiveTwoNineEvent(event: { type: EventType }): event is FiveTwoNineContributionEvent | FiveTwoNineWithdrawalEvent {
  return isFiveTwoNineContributionEvent(event) ||
         isFiveTwoNineWithdrawalEvent(event);
}

/**
 * Type guard for education expense events
 */
export function isEducationExpenseEvent(event: { type: EventType }): event is TuitionPaymentEvent | FiveTwoNineWithdrawalEvent {
  return isTuitionPaymentEvent(event) ||
         (isFiveTwoNineWithdrawalEvent(event) && event.withdrawalPurpose === 'qualified_education');
}

