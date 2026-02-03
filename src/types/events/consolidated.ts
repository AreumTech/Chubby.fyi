/**
 * Consolidated Event Types - PFOS-E Compliant
 *
 * This module defines the consolidated event types that reduce 56+ event types
 * into ~20 metadata-driven types while preserving:
 * - Tax semantics for PFOS-E tax fidelity modes
 * - Sensitivity attribution via typed driverKey
 * - Blocked output reasoning via constraint codes
 * - Wedge-specific semantics (fragility, capital sourcing, concentration, sabbatical)
 *
 * MIGRATION STRATEGY:
 * - Legacy events are automatically normalized to these types during preprocessing
 * - New events should use these types directly
 * - Both legacy and consolidated types coexist during migration
 */

import { BaseEvent, EventType, EventPriority } from './base';
import {
  TaxProfile,
  WithholdingModel,
  DriverKey,
  ExpenseNature,
  ConstraintCode,
  LiquidityProfile,
  IncomeSourceType,
  ExpenseCategory,
  InsuranceType,
  ExposureType,
  TaxTreatment,
} from './shared';
import { AccountType } from '../accountTypes';
import { AssetClass } from '../common';

// =============================================================================
// CONSOLIDATED EVENT TYPE CONSTANTS
// The actual enum values are defined in base.ts EventType enum
// =============================================================================

/**
 * Constants for consolidated event types (for convenience)
 * These map to EventType enum values
 */
export const ConsolidatedEventType = {
  CASHFLOW_INCOME: EventType.CASHFLOW_INCOME,
  CASHFLOW_EXPENSE: EventType.CASHFLOW_EXPENSE,
  INSURANCE_PREMIUM: EventType.INSURANCE_PREMIUM,
  INSURANCE_PAYOUT: EventType.INSURANCE_PAYOUT,
  ACCOUNT_CONTRIBUTION: EventType.ACCOUNT_CONTRIBUTION,
  EXPOSURE_CHANGE: EventType.EXPOSURE_CHANGE,
} as const;

// =============================================================================
// CASHFLOW_INCOME - Consolidated Income Event
// Replaces: INCOME, SOCIAL_SECURITY_INCOME, PENSION_INCOME, DIVIDEND_INCOME,
//           RENTAL_INCOME, BUSINESS_INCOME, ANNUITY_PAYMENT
// =============================================================================

export interface CashflowIncomeEvent extends BaseEvent {
  type: EventType.INCOME | EventType.CASHFLOW_INCOME;

  /** Gross amount before tax */
  amount: number;

  /** Source of income (salary, bonus, rsu, social_security, pension, etc.) */
  sourceType: IncomeSourceType;

  /** REQUIRED: Tax profile determines how income is taxed */
  taxProfile: TaxProfile;

  /** How withholding is calculated */
  withholdingModel: WithholdingModel;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Month offset when income starts */
  startDateOffset: number;

  /** Month offset when income ends (optional for indefinite) */
  endDateOffset?: number;

  /** Annual growth rate for the income */
  annualGrowthRate?: number;

  /** Whether COLA adjustments apply (for SS, pension) */
  isColaAdjusted?: boolean;

  /** Optional exposure link for RSU income */
  exposureLink?: {
    exposureType: ExposureType;
    deltaNotional: number;
  };

  // Social Security specific fields
  claimAge?: number;
  fullRetirementAge?: number;
  taxablePercentage?: number;

  // Pension specific fields
  pensionType?: 'defined_benefit' | 'government' | 'military' | 'union' | 'other';
  survivorBenefitPercentage?: number;

  // Dividend specific fields
  isQualified?: boolean;
  reinvestDividends?: boolean;

  // Business income specific fields
  isNetOfExpenses?: boolean;
}

// =============================================================================
// CASHFLOW_EXPENSE - Consolidated Expense Event
// Replaces: RECURRING_EXPENSE, ONE_TIME_EVENT, HEALTHCARE_COST, etc.
// =============================================================================

export interface CashflowExpenseEvent extends BaseEvent {
  type: EventType.RECURRING_EXPENSE | EventType.ONE_TIME_EVENT | EventType.CASHFLOW_EXPENSE;

  /** Expense amount */
  amount: number;

  /** Category of expense */
  category: ExpenseCategory;

  /** REQUIRED: Nature of expense (fixed, variable, shock) for sabbatical wedge */
  expenseNature: ExpenseNature;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Month offset when expense starts */
  startDateOffset?: number;

  /** Month offset when expense ends */
  endDateOffset?: number;

  /** Annual growth rate for the expense */
  annualGrowthRate?: number;

  /** Whether this is a one-time expense */
  isOneTime?: boolean;

  /** Description of the expense */
  description?: string;
}

// =============================================================================
// INSURANCE_PREMIUM - Consolidated Insurance Premium Event
// Replaces: LIFE_INSURANCE_PREMIUM, DISABILITY_INSURANCE_PREMIUM, LTC_INSURANCE_PREMIUM
// =============================================================================

export interface InsurancePremiumEvent extends BaseEvent {
  type: EventType.LIFE_INSURANCE_PREMIUM | EventType.DISABILITY_INSURANCE_PREMIUM |
        EventType.LONG_TERM_CARE_INSURANCE_PREMIUM | EventType.INSURANCE_PREMIUM;

  /** Premium amount */
  amount: number;

  /** Type of insurance */
  insuranceType: InsuranceType;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Month offset when premiums start */
  startDateOffset: number;

  /** Month offset when premiums end */
  endDateOffset?: number;

  /** Annual premium increase rate */
  annualGrowthRate?: number;

  /** Coverage amount (for informational purposes) */
  coverageAmount?: number;

  /** Benefit period for disability/LTC */
  benefitPeriodYears?: number;
}

// =============================================================================
// INSURANCE_PAYOUT - Consolidated Insurance Payout Event
// Replaces: LIFE_INSURANCE_PAYOUT, DISABILITY_INSURANCE_PAYOUT, LONG_TERM_CARE_PAYOUT
// =============================================================================

export interface InsurancePayoutEvent extends BaseEvent {
  type: EventType.LIFE_INSURANCE_PAYOUT | EventType.DISABILITY_INSURANCE_PAYOUT |
        EventType.LONG_TERM_CARE_PAYOUT | EventType.INSURANCE_PAYOUT;

  /** Payout amount */
  amount: number;

  /** Type of insurance */
  insuranceType: InsuranceType;

  /** REQUIRED: Tax profile (life payouts typically tax_exempt, disability may be ordinary_income) */
  taxProfile: TaxProfile;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Whether payout is recurring (disability) or one-time (life) */
  isRecurring?: boolean;

  /** Month offset for the payout */
  startDateOffset?: number;

  /** End month for recurring payouts */
  endDateOffset?: number;
}

// =============================================================================
// ACCOUNT_CONTRIBUTION - Consolidated Contribution Event
// Replaces: SCHEDULED_CONTRIBUTION with enhanced constraint tracking
// =============================================================================

export interface AccountContributionEvent extends BaseEvent {
  type: EventType.SCHEDULED_CONTRIBUTION | EventType.ACCOUNT_CONTRIBUTION;

  /** Contribution amount */
  amount: number;

  /** Target account type */
  accountType: AccountType;

  /** REQUIRED: Tax treatment of contribution */
  taxTreatment: TaxTreatment;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Populated when contribution is blocked or limited */
  constraintCodes?: ConstraintCode[];

  /** Liquidity profile for capital sourcing wedge */
  liquidityProfile?: LiquidityProfile;

  /** Month offset when contributions start */
  startDateOffset: number;

  /** Month offset when contributions end */
  endDateOffset?: number;

  /** Annual growth rate for contribution amount */
  annualGrowthRate?: number;

  /** Asset class for the contribution */
  assetClass?: AssetClass;

  /** Whether this includes employer match */
  isEmployerMatch?: boolean;

  /** Employer match percentage */
  employerMatchPercentage?: number;

  /** Maximum employer match amount */
  employerMatchLimit?: number;

  /** Whether this is a catch-up contribution */
  isCatchUpContribution?: boolean;
}

// =============================================================================
// EXPOSURE_CHANGE - New Event Type for RSU/Concentration Wedge
// =============================================================================

export interface ExposureChangeEvent extends BaseEvent {
  type: EventType.EXPOSURE_CHANGE;

  /** Type of exposure (rsu, iso, nso, concentrated_stock) */
  exposureType: ExposureType;

  /** Delta notional: positive = vesting/purchase, negative = sale */
  deltaNotional: number;

  /** Tax profile for sales (required when deltaNotional < 0) */
  taxProfile?: TaxProfile;

  /** REQUIRED: Driver key for sensitivity attribution */
  driverKey: DriverKey;

  /** Grant date for equity compensation */
  grantDate?: number;

  /** Vesting schedule details */
  vestingSchedule?: {
    totalShares: number;
    vestingPeriodMonths: number;
    cliffMonths?: number;
  };

  /** Exercise price for options */
  exercisePrice?: number;

  /** Fair market value at vesting/exercise */
  fairMarketValue?: number;
}

// =============================================================================
// CONSOLIDATED EVENT UNION TYPE
// =============================================================================

/**
 * Union type of all consolidated event types
 */
export type ConsolidatedEvent =
  | CashflowIncomeEvent
  | CashflowExpenseEvent
  | InsurancePremiumEvent
  | InsurancePayoutEvent
  | AccountContributionEvent
  | ExposureChangeEvent;

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isCashflowIncomeEvent(event: { type: string }): event is CashflowIncomeEvent {
  return event.type === EventType.INCOME ||
         event.type === EventType.CASHFLOW_INCOME;
}

export function isCashflowExpenseEvent(event: { type: string }): event is CashflowExpenseEvent {
  return event.type === EventType.RECURRING_EXPENSE ||
         event.type === EventType.ONE_TIME_EVENT ||
         event.type === EventType.CASHFLOW_EXPENSE;
}

export function isConsolidatedInsurancePremiumEvent(event: { type: string }): event is InsurancePremiumEvent {
  return event.type === EventType.LIFE_INSURANCE_PREMIUM ||
         event.type === EventType.DISABILITY_INSURANCE_PREMIUM ||
         event.type === EventType.LONG_TERM_CARE_INSURANCE_PREMIUM ||
         event.type === EventType.INSURANCE_PREMIUM;
}

export function isConsolidatedInsurancePayoutEvent(event: { type: string }): event is InsurancePayoutEvent {
  return event.type === EventType.LIFE_INSURANCE_PAYOUT ||
         event.type === EventType.DISABILITY_INSURANCE_PAYOUT ||
         event.type === EventType.LONG_TERM_CARE_PAYOUT ||
         event.type === EventType.INSURANCE_PAYOUT;
}

export function isAccountContributionEvent(event: { type: string }): event is AccountContributionEvent {
  return event.type === EventType.SCHEDULED_CONTRIBUTION ||
         event.type === EventType.ACCOUNT_CONTRIBUTION;
}

export function isExposureChangeEvent(event: { type: string }): event is ExposureChangeEvent {
  return event.type === EventType.EXPOSURE_CHANGE;
}

export function isConsolidatedEvent(event: { type: string }): event is ConsolidatedEvent {
  return isCashflowIncomeEvent(event) ||
         isCashflowExpenseEvent(event) ||
         isConsolidatedInsurancePremiumEvent(event) ||
         isConsolidatedInsurancePayoutEvent(event) ||
         isAccountContributionEvent(event) ||
         isExposureChangeEvent(event);
}
