/* eslint-disable */
/**
 * This file was automatically generated from JSON Schema.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run npm run generate-types to regenerate this file.
 */

/**
 * A financial event that occurs during simulation
 */
export interface FinancialEvent {
  /**
   * Unique identifier for the event
   */
  id: string;
  /**
   * Type of financial event
   */
  type:
    | 'INITIAL_STATE'
    | 'INCOME'
    | 'SOCIAL_SECURITY_INCOME'
    | 'PENSION_INCOME'
    | 'ANNUITY_PAYMENT'
    | 'RECURRING_EXPENSE'
    | 'ONE_TIME_EVENT'
    | 'HEALTHCARE_COST'
    | 'SCHEDULED_CONTRIBUTION'
    | 'RSU_VESTING'
    | 'RSU_SALE'
    | 'GOAL_DEFINE'
    | 'ROTH_CONVERSION'
    | 'REBALANCE_PORTFOLIO'
    | 'STRATEGY_ASSET_ALLOCATION_SET'
    | 'STRATEGY_REBALANCING_RULE_SET'
    | 'STRATEGY_TAX_LOSS_HARVESTING_SET'
    | 'STRATEGY_ROTH_CONVERSION_LADDER_SET'
    | 'STRATEGY_GUARDRAILS_SET'
    | 'REAL_ESTATE_PURCHASE'
    | 'REAL_ESTATE_SALE'
    | 'MORTGAGE_ORIGINATION'
    | 'MORTGAGE_PAYMENT'
    | 'DEBT_PAYOFF'
    | 'FINANCIAL_MILESTONE'
    | 'STRATEGIC_TRADE';
  /**
   * Human-readable description of the event
   */
  description: string;
  /**
   * Event priority for execution order
   */
  priority: number;
  /**
   * Number of months from simulation start when event occurs
   */
  monthOffset: number;
  /**
   * Monetary amount associated with the event
   */
  amount?: number;
  /**
   * Month offset when recurring event starts
   */
  startDateOffset?: number;
  /**
   * Month offset when recurring event ends (optional for indefinite events)
   */
  endDateOffset?: number;
  /**
   * Legacy frequency property for backwards compatibility
   */
  frequency?: 'monthly' | 'annually' | 'one-time';
  /**
   * Annual growth rate for recurring events
   */
  annualGrowthRate?: number;
  /**
   * Source of income for income events
   */
  source?: string;
  /**
   * Target account type for contribution events
   */
  accountType?: string;
  /**
   * Category for expense events
   */
  category?: string;
  /**
   * Whether amount is after-tax for income events
   */
  isNet?: boolean;
  /**
   * Percentage of amount that is taxable (0.0-1.0)
   */
  taxablePortion?: number;
  /**
   * Liability details for debt events
   */
  liabilityDetails?: {
    id: string;
    name: string;
    type: 'MORTGAGE' | 'STUDENT_LOAN' | 'AUTO_LOAN' | 'PERSONAL_LOAN';
    initialPrincipal: number;
    interestRate: number;
    termMonths: number;
    isTaxDeductible?: boolean;
  };
  /**
   * Additional event-specific data
   */
  metadata?: {};
  /**
   * Real estate property details
   */
  property?: {
    id: string;
    name: string;
    type: 'primary_residence' | 'rental_property' | 'vacation_home' | 'commercial' | 'land';
    purchasePrice: number;
    purchaseDate?: string;
    annualRentalIncome?: number;
    annualExpenses?: {
      propertyTax?: number;
      insurance?: number;
      maintenance?: number;
      management?: number;
      other?: number;
    };
  };
  /**
   * Financing details for real estate purchase
   */
  financing?: {
    downPaymentAmount: number;
    downPaymentSource: string;
    mortgage?: {
      principalAmount: number;
      annualInterestRate: number;
      termInMonths: number;
      monthlyPayment?: number;
      mortgageId?: string;
    };
  };
  /**
   * Closing costs for real estate purchase
   */
  closingCosts?: {
    totalAmount: number;
    source: string;
    breakdown?: {
      lenderFees?: number;
      titleInsurance?: number;
      appraisal?: number;
      inspection?: number;
      other?: number;
    };
  };
}
