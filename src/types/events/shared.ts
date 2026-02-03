/**
 * Shared Event Type Definitions - PFOS-E Compliant
 *
 * This module defines the closed enums and shared types used across the consolidated
 * event system. These types enable:
 * - Tax fidelity modes (NONE/HEURISTIC/ENHANCED)
 * - Sensitivity attribution via typed driverKey
 * - Blocked output reasoning via constraint codes
 * - Wedge-specific semantics (fragility, capital sourcing, concentration, sabbatical)
 *
 * CRITICAL INVARIANT: These enums are CLOSED - not freeform strings.
 * The driverKey powers PFOS-E sensitivity charts and packet narratives.
 * The taxProfile enables the tax engine to own all branching.
 */

// =============================================================================
// TAX PROFILE - Determines how income is taxed
// =============================================================================

/**
 * TaxProfile - Closed enum for tax treatment
 *
 * Tax engine owns all interpretation. Handlers register income with a taxProfile
 * and the engine owns the branching logic.
 */
export type TaxProfile =
  | 'ordinary_income'           // Regular wages, salary, bonus
  | 'qualified_dividend'        // Qualified dividends (preferential rates)
  | 'capital_gain_ltcg'         // Long-term capital gains (>1 year)
  | 'capital_gain_stcg'         // Short-term capital gains (<1 year)
  | 'social_security_benefit'   // SS benefits (partially taxable)
  | 'tax_exempt'                // Tax-free income (muni bonds, Roth, etc.)
  | 'schedule_c'                // Self-employment income
  | 'schedule_e';               // Passive/rental income

/**
 * Type guard for TaxProfile
 */
export function isValidTaxProfile(value: string): value is TaxProfile {
  return [
    'ordinary_income',
    'qualified_dividend',
    'capital_gain_ltcg',
    'capital_gain_stcg',
    'social_security_benefit',
    'tax_exempt',
    'schedule_c',
    'schedule_e',
  ].includes(value);
}

// =============================================================================
// WITHHOLDING MODEL - How tax is withheld at source
// =============================================================================

/**
 * WithholdingModel - How tax withholding is calculated
 */
export type WithholdingModel =
  | 'irs_percentage'  // IRS Publication 15-T percentage method
  | 'fixed_rate'      // Fixed withholding rate (e.g., 22% supplemental)
  | 'none';           // No withholding (self-employment, etc.)

export function isValidWithholdingModel(value: string): value is WithholdingModel {
  return ['irs_percentage', 'fixed_rate', 'none'].includes(value);
}

// =============================================================================
// DRIVER KEY - Powers PFOS-E sensitivity charts
// =============================================================================

/**
 * DriverKey - Typed sensitivity attribution key
 *
 * CRITICAL: Must be from this closed enum, NOT arbitrary strings.
 * Powers PFOS-E sensitivity charts and Simulation Packet narratives.
 */
export type DriverKey =
  // Income drivers
  | 'income:employment'         // Salary, wages, bonuses
  | 'income:equity_comp'        // RSU, ISO, NSO vesting/sales
  | 'income:retirement'         // Social Security, pension, annuity
  | 'income:passive'            // Rental, business, royalties
  | 'income:investment'         // Dividends, interest, distributions
  // Expense drivers
  | 'expense:fixed'             // Rent, mortgage, insurance premiums
  | 'expense:variable'          // Food, utilities, discretionary
  | 'expense:shock'             // One-time major expenses
  // Debt drivers
  | 'debt:interest'             // Interest payments
  | 'debt:principal'            // Principal payments
  // Contribution drivers
  | 'contribution:retirement'   // 401k, IRA, Roth contributions
  | 'contribution:taxable'      // Taxable brokerage contributions
  | 'contribution:education'    // 529, ESA contributions
  // Withdrawal drivers
  | 'withdrawal:retirement'     // Retirement account withdrawals
  | 'withdrawal:taxable'        // Taxable account withdrawals
  | 'withdrawal:education';     // Education account withdrawals

export function isValidDriverKey(value: string): value is DriverKey {
  return [
    'income:employment',
    'income:equity_comp',
    'income:retirement',
    'income:passive',
    'income:investment',
    'expense:fixed',
    'expense:variable',
    'expense:shock',
    'debt:interest',
    'debt:principal',
    'contribution:retirement',
    'contribution:taxable',
    'contribution:education',
    'withdrawal:retirement',
    'withdrawal:taxable',
    'withdrawal:education',
  ].includes(value);
}

// =============================================================================
// EXPENSE NATURE - For sabbatical wedge semantics
// =============================================================================

/**
 * ExpenseNature - Categorizes expense flexibility
 *
 * Required for sabbatical wedge analysis:
 * - fixed: Cannot be reduced (rent, mortgage, insurance)
 * - variable: Can be reduced (food, entertainment, travel)
 * - shock: One-time unexpected (medical emergency, car repair)
 */
export type ExpenseNature = 'fixed' | 'variable' | 'shock';

export function isValidExpenseNature(value: string): value is ExpenseNature {
  return ['fixed', 'variable', 'shock'].includes(value);
}

// =============================================================================
// CONSTRAINT CODE - Blocked output reasoning
// =============================================================================

/**
 * ConstraintCode - Reason codes for blocked outputs
 *
 * When a contribution or transaction is blocked, these codes
 * explain why for PFOS-E reporting.
 */
export type ConstraintCode =
  | 'limit_exceeded'            // Annual contribution limit exceeded
  | 'missing_tax_inputs'        // Required tax info not provided
  | 'insufficient_balance'      // Not enough funds in source account
  | 'locked_until_age'          // Age restriction (e.g., 59.5 for retirement)
  | 'trading_window_unknown'    // Equity comp trading window status unknown
  | 'income_phase_out'          // Income exceeds phase-out threshold
  | 'no_earned_income'          // No earned income for IRA contributions
  | 'rmd_required'              // Must take RMD before other withdrawals
  | 'retirement_protected'      // Retirement accounts protected before age threshold
  | 'leverage_exceeded'         // Debt-to-assets ratio exceeded maximum
  | 'cash_floor_breach';        // Cash went below floor (with NoAutoLiquidate)

export function isValidConstraintCode(value: string): value is ConstraintCode {
  return [
    'limit_exceeded',
    'missing_tax_inputs',
    'insufficient_balance',
    'locked_until_age',
    'trading_window_unknown',
    'income_phase_out',
    'no_earned_income',
    'rmd_required',
    'retirement_protected',
    'leverage_exceeded',
    'cash_floor_breach',
  ].includes(value);
}

// =============================================================================
// LIQUIDITY PROFILE - For capital sourcing wedge
// =============================================================================

/**
 * LiquidityProfile - Asset liquidity characteristics
 *
 * Required for capital sourcing wedge analysis to determine
 * which assets can be accessed and at what cost.
 */
export type LiquidityProfile =
  | 'immediate_cash'            // Cash, checking, savings
  | 'sellable_with_market_risk' // Stocks, bonds (market timing risk)
  | 'locked_until_age'          // Retirement accounts (penalty risk)
  | 'borrowable_with_terms';    // Home equity, margin (interest cost)

export function isValidLiquidityProfile(value: string): value is LiquidityProfile {
  return [
    'immediate_cash',
    'sellable_with_market_risk',
    'locked_until_age',
    'borrowable_with_terms',
  ].includes(value);
}

// =============================================================================
// INCOME SOURCE TYPE - For consolidated income handler
// =============================================================================

/**
 * IncomeSourceType - Categorizes the source of income
 */
export type IncomeSourceType =
  | 'salary'          // Regular employment salary
  | 'bonus'           // Employment bonus
  | 'rsu'             // RSU vesting (ordinary income portion)
  | 'social_security' // Social Security benefits
  | 'pension'         // Pension payments
  | 'annuity'         // Annuity payments
  | 'dividend'        // Dividend income
  | 'interest'        // Interest income
  | 'rental'          // Rental property income
  | 'business';       // Self-employment/business income

export function isValidIncomeSourceType(value: string): value is IncomeSourceType {
  return [
    'salary', 'bonus', 'rsu',
    'social_security', 'pension', 'annuity',
    'dividend', 'interest', 'rental', 'business',
  ].includes(value);
}

// =============================================================================
// EXPENSE CATEGORY - For consolidated expense handler
// =============================================================================

/**
 * ExpenseCategory - Categorizes the type of expense
 */
export type ExpenseCategory =
  | 'housing'         // Rent, mortgage, property tax
  | 'transportation'  // Car payment, gas, transit
  | 'food'            // Groceries, dining
  | 'healthcare'      // Medical, dental, vision
  | 'insurance'       // Health, life, disability, property
  | 'utilities'       // Electric, gas, water, internet
  | 'debt_service'    // Loan payments (non-mortgage)
  | 'education'       // Tuition, books, supplies
  | 'childcare'       // Daycare, nanny, babysitting
  | 'personal'        // Clothing, personal care
  | 'entertainment'   // Recreation, hobbies, subscriptions
  | 'travel'          // Vacation, business travel
  | 'other';          // Miscellaneous

export function isValidExpenseCategory(value: string): value is ExpenseCategory {
  return [
    'housing', 'transportation', 'food', 'healthcare',
    'insurance', 'utilities', 'debt_service', 'education',
    'childcare', 'personal', 'entertainment', 'travel', 'other',
  ].includes(value);
}

// =============================================================================
// INSURANCE TYPE - For consolidated insurance handler
// =============================================================================

/**
 * InsuranceType - Type of insurance policy
 */
export type InsuranceType =
  | 'life_term'       // Term life insurance
  | 'life_whole'      // Whole life insurance
  | 'disability_std'  // Short-term disability
  | 'disability_ltd'  // Long-term disability
  | 'ltc'             // Long-term care
  | 'health'          // Health insurance
  | 'property'        // Homeowners/renters
  | 'auto'            // Auto insurance
  | 'umbrella';       // Umbrella liability

export function isValidInsuranceType(value: string): value is InsuranceType {
  return [
    'life_term', 'life_whole',
    'disability_std', 'disability_ltd',
    'ltc', 'health', 'property', 'auto', 'umbrella',
  ].includes(value);
}

// =============================================================================
// EXPOSURE TYPE - For concentration wedge
// =============================================================================

/**
 * ExposureType - Type of concentrated exposure
 */
export type ExposureType =
  | 'rsu'                 // Restricted stock units
  | 'iso'                 // Incentive stock options
  | 'nso'                 // Non-qualified stock options
  | 'concentrated_stock'; // Single-stock concentration

export function isValidExposureType(value: string): value is ExposureType {
  return ['rsu', 'iso', 'nso', 'concentrated_stock'].includes(value);
}

// =============================================================================
// TAX TREATMENT - For contribution handler
// =============================================================================

/**
 * TaxTreatment - Tax treatment of contribution/withdrawal
 */
export type TaxTreatment =
  | 'pre_tax'    // Pre-tax (traditional 401k, IRA)
  | 'post_tax'   // After-tax (Roth contributions, taxable)
  | 'tax_free';  // Tax-free (qualified Roth withdrawals)

export function isValidTaxTreatment(value: string): value is TaxTreatment {
  return ['pre_tax', 'post_tax', 'tax_free'].includes(value);
}

// =============================================================================
// HELPER TYPES FOR VALIDATION
// =============================================================================

/**
 * PFOS-E compliant event metadata
 *
 * These fields should be present on consolidated events to enable
 * full PFOS-E functionality.
 */
export interface PFOSEMetadata {
  /** Required: Tax treatment for income events */
  taxProfile?: TaxProfile;

  /** Required: Sensitivity attribution key */
  driverKey?: DriverKey;

  /** Optional: How withholding is calculated */
  withholdingModel?: WithholdingModel;

  /** Required for expenses: Nature of the expense */
  expenseNature?: ExpenseNature;

  /** Populated when event is blocked */
  constraintCodes?: ConstraintCode[];

  /** Required for capital sourcing analysis */
  liquidityProfile?: LiquidityProfile;
}

/**
 * Validates that required PFOS-E fields are present
 * Fails loudly in dev/test, never silently defaults
 */
export function validatePFOSEMetadata(
  metadata: Partial<PFOSEMetadata>,
  eventType: string,
  requiredFields: (keyof PFOSEMetadata)[]
): void {
  for (const field of requiredFields) {
    if (metadata[field] === undefined) {
      throw new Error(
        `PFOS-E validation failed: Missing required field '${field}' for event type '${eventType}'. ` +
        `Normalization must be total and explicit.`
      );
    }
  }
}
