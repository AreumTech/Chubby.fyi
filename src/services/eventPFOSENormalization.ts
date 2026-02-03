/**
 * PFOS-E Event Normalization Service
 *
 * Normalizes legacy events to PFOS-E compliant format by adding required metadata:
 * - taxProfile: Determines how income is taxed
 * - driverKey: Powers sensitivity attribution
 * - expenseNature: For sabbatical wedge analysis
 * - withholdingModel: How withholding is calculated
 *
 * CRITICAL INVARIANT (Invariant 3): Normalization is assertive, not permissive.
 * Missing taxProfile or driverKey fails loudly in dev/test, never silently defaults.
 */

import { EventType } from '../types/events';
import type {
  TaxProfile,
  DriverKey,
  ExpenseNature,
  WithholdingModel,
  IncomeSourceType,
  ExpenseCategory,
  InsuranceType,
} from '../types/events/shared';
import { logger } from '../utils/logger';

// =============================================================================
// PHASE 2 FEATURE FLAG
// Set to false to revert to Phase 1 (dual-run) behavior
// =============================================================================

export const PFOSE_PHASE2_ENABLED = true;

// =============================================================================
// LEGACY → CONSOLIDATED TYPE MAPPING (Phase 2)
// =============================================================================

/**
 * Maps legacy event types to their consolidated PFOS-E types.
 * This is the core of Phase 2: events are converted BEFORE reaching Go handlers.
 *
 * After conversion:
 * - UnifiedIncomeEventHandler processes all CASHFLOW_INCOME
 * - UnifiedExpenseEventHandler processes all CASHFLOW_EXPENSE
 * - UnifiedInsurancePremiumHandler processes all INSURANCE_PREMIUM
 * - UnifiedInsurancePayoutHandler processes all INSURANCE_PAYOUT
 * - UnifiedContributionHandler processes all ACCOUNT_CONTRIBUTION
 */
const LEGACY_TO_CONSOLIDATED_MAP: Partial<Record<EventType | string, EventType>> = {
  // Income consolidation → CASHFLOW_INCOME
  [EventType.INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.SOCIAL_SECURITY_INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.PENSION_INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.DIVIDEND_INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.RENTAL_INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.BUSINESS_INCOME]: EventType.CASHFLOW_INCOME,
  [EventType.ANNUITY_PAYMENT]: EventType.CASHFLOW_INCOME,
  [EventType.INHERITANCE]: EventType.CASHFLOW_INCOME,
  [EventType.RSU_VESTING]: EventType.CASHFLOW_INCOME,

  // Expense consolidation → CASHFLOW_EXPENSE
  [EventType.RECURRING_EXPENSE]: EventType.CASHFLOW_EXPENSE,
  [EventType.ONE_TIME_EVENT]: EventType.CASHFLOW_EXPENSE,
  [EventType.HEALTHCARE_COST]: EventType.CASHFLOW_EXPENSE,
  [EventType.TUITION_PAYMENT]: EventType.CASHFLOW_EXPENSE,
  [EventType.VEHICLE_PURCHASE]: EventType.CASHFLOW_EXPENSE,
  [EventType.HOME_IMPROVEMENT]: EventType.CASHFLOW_EXPENSE,
  [EventType.EDUCATION_EXPENSE]: EventType.CASHFLOW_EXPENSE,
  [EventType.FAMILY_EVENT]: EventType.CASHFLOW_EXPENSE,
  [EventType.PROPERTY_MAINTENANCE]: EventType.CASHFLOW_EXPENSE,

  // Insurance Premium consolidation → INSURANCE_PREMIUM
  [EventType.LIFE_INSURANCE_PREMIUM]: EventType.INSURANCE_PREMIUM,
  [EventType.DISABILITY_INSURANCE_PREMIUM]: EventType.INSURANCE_PREMIUM,
  [EventType.LONG_TERM_CARE_INSURANCE_PREMIUM]: EventType.INSURANCE_PREMIUM,

  // Insurance Payout consolidation → INSURANCE_PAYOUT
  [EventType.LIFE_INSURANCE_PAYOUT]: EventType.INSURANCE_PAYOUT,
  [EventType.DISABILITY_INSURANCE_PAYOUT]: EventType.INSURANCE_PAYOUT,
  [EventType.LONG_TERM_CARE_PAYOUT]: EventType.INSURANCE_PAYOUT,

  // Contribution consolidation → ACCOUNT_CONTRIBUTION
  [EventType.SCHEDULED_CONTRIBUTION]: EventType.ACCOUNT_CONTRIBUTION,
  [EventType.FIVE_TWO_NINE_CONTRIBUTION]: EventType.ACCOUNT_CONTRIBUTION,
};

/**
 * Gets the consolidated event type for a legacy type.
 * Returns the original type if no mapping exists (type is already consolidated or unaffected).
 */
export function getConsolidatedEventType(legacyType: EventType | string): EventType | string {
  return LEGACY_TO_CONSOLIDATED_MAP[legacyType as EventType] || legacyType;
}

/**
 * Checks if an event type is a legacy type that will be converted.
 */
export function isLegacyEventType(eventType: EventType | string): boolean {
  return eventType in LEGACY_TO_CONSOLIDATED_MAP;
}

// =============================================================================
// NORMALIZATION MAPPINGS
// =============================================================================

/**
 * Maps legacy event types to their default taxProfile
 */
const TAX_PROFILE_MAP: Partial<Record<EventType | string, TaxProfile>> = {
  // Income events
  [EventType.INCOME]: 'ordinary_income',
  [EventType.SOCIAL_SECURITY_INCOME]: 'social_security_benefit',
  [EventType.PENSION_INCOME]: 'ordinary_income',
  [EventType.ANNUITY_PAYMENT]: 'ordinary_income',
  [EventType.DIVIDEND_INCOME]: 'qualified_dividend', // Default to qualified, can be overridden
  [EventType.RENTAL_INCOME]: 'schedule_e',
  [EventType.BUSINESS_INCOME]: 'schedule_c',
  [EventType.RSU_VESTING]: 'ordinary_income',

  // Insurance payouts
  [EventType.LIFE_INSURANCE_PAYOUT]: 'tax_exempt',
  [EventType.DISABILITY_INSURANCE_PAYOUT]: 'ordinary_income', // Depends on who paid premiums
  [EventType.LONG_TERM_CARE_PAYOUT]: 'tax_exempt',

  // Withdrawals
  [EventType.WITHDRAWAL]: 'ordinary_income', // Depends on account type

  // Default
  'DEFAULT': 'ordinary_income',
};

/**
 * Maps legacy event types to their default driverKey
 */
const DRIVER_KEY_MAP: Partial<Record<EventType | string, DriverKey>> = {
  // Income events
  [EventType.INCOME]: 'income:employment',
  [EventType.SOCIAL_SECURITY_INCOME]: 'income:retirement',
  [EventType.PENSION_INCOME]: 'income:retirement',
  [EventType.ANNUITY_PAYMENT]: 'income:retirement',
  [EventType.DIVIDEND_INCOME]: 'income:investment',
  [EventType.RENTAL_INCOME]: 'income:passive',
  [EventType.BUSINESS_INCOME]: 'income:passive',
  [EventType.RSU_VESTING]: 'income:equity_comp',
  [EventType.RSU_SALE]: 'income:equity_comp',

  // Expense events
  [EventType.RECURRING_EXPENSE]: 'expense:fixed',
  [EventType.ONE_TIME_EVENT]: 'expense:shock',
  [EventType.HEALTHCARE_COST]: 'expense:fixed',
  [EventType.LIFE_INSURANCE_PREMIUM]: 'expense:fixed',
  [EventType.DISABILITY_INSURANCE_PREMIUM]: 'expense:fixed',
  [EventType.LONG_TERM_CARE_INSURANCE_PREMIUM]: 'expense:fixed',

  // Contribution events
  [EventType.SCHEDULED_CONTRIBUTION]: 'contribution:retirement',
  [EventType.FIVE_TWO_NINE_CONTRIBUTION]: 'contribution:education',

  // Withdrawal events
  [EventType.WITHDRAWAL]: 'withdrawal:retirement',
  [EventType.FIVE_TWO_NINE_WITHDRAWAL]: 'withdrawal:education',
  [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: 'withdrawal:retirement',

  // Debt events
  [EventType.LIABILITY_PAYMENT]: 'debt:principal',
  [EventType.DEBT_PAYMENT]: 'debt:principal',
  [EventType.RATE_RESET]: 'debt:interest',
};

/**
 * Maps legacy income sources to IncomeSourceType
 */
const SOURCE_TYPE_MAP: Record<string, IncomeSourceType> = {
  'salary': 'salary',
  'Salary': 'salary',
  'bonus': 'bonus',
  'Bonus': 'bonus',
  'rsu': 'rsu',
  'RSU': 'rsu',
  'social_security': 'social_security',
  'Social Security': 'social_security',
  'pension': 'pension',
  'Pension': 'pension',
  'annuity': 'annuity',
  'Annuity': 'annuity',
  'dividend': 'dividend',
  'Dividend': 'dividend',
  'interest': 'interest',
  'Interest': 'interest',
  'rental': 'rental',
  'Rental': 'rental',
  'rental_income': 'rental',
  'business': 'business',
  'Business': 'business',
  'self_employment': 'business',
};

/**
 * Maps expense categories to ExpenseCategory
 */
const EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  'housing': 'housing',
  'Housing': 'housing',
  'rent': 'housing',
  'mortgage': 'housing',
  'transportation': 'transportation',
  'Transportation': 'transportation',
  'car': 'transportation',
  'food': 'food',
  'Food': 'food',
  'groceries': 'food',
  'healthcare': 'healthcare',
  'Healthcare': 'healthcare',
  'medical': 'healthcare',
  'insurance': 'insurance',
  'Insurance': 'insurance',
  'utilities': 'utilities',
  'Utilities': 'utilities',
  'education': 'education',
  'Education': 'education',
  'childcare': 'childcare',
  'Childcare': 'childcare',
  'entertainment': 'entertainment',
  'Entertainment': 'entertainment',
  'travel': 'travel',
  'Travel': 'travel',
  'vacation': 'travel',
  'other': 'other',
  'Other': 'other',
};

// =============================================================================
// NORMALIZATION FUNCTIONS
// =============================================================================

export interface NormalizedEvent {
  // PFOS-E required fields
  taxProfile?: TaxProfile;
  driverKey?: DriverKey;
  withholdingModel?: WithholdingModel;
  expenseNature?: ExpenseNature;
  sourceType?: IncomeSourceType;

  // Phase 2: Original type preserved for debugging/tracing
  _originalLegacyType?: string;

  // Original event data
  [key: string]: unknown;
}

/**
 * Normalizes a legacy event to PFOS-E compliant format
 *
 * INVARIANT 3: Normalization is assertive. This function will:
 * - Add required PFOS-E metadata (taxProfile, driverKey)
 * - Log warnings for events that need manual review
 * - Never silently drop required fields
 *
 * Phase 2 Behavior (when PFOSE_PHASE2_ENABLED = true):
 * - Converts legacy event types to consolidated types
 * - Preserves original type in _originalLegacyType for debugging
 * - Only unified handlers will be invoked in Go
 */
export function normalizeEventForPFOSE<T extends { type: string | EventType; [key: string]: unknown }>(
  event: T,
  strict: boolean = false
): T & NormalizedEvent {
  const normalized = { ...event } as T & NormalizedEvent;
  const originalType = event.type as EventType;

  // Phase 2: Convert legacy type to consolidated type
  if (PFOSE_PHASE2_ENABLED) {
    const consolidatedType = getConsolidatedEventType(originalType);
    if (consolidatedType !== originalType) {
      normalized.type = consolidatedType as T['type'];
      normalized._originalLegacyType = originalType;
      logger.debug(
        `[PFOS-E Phase 2] Converted ${originalType} → ${consolidatedType}`
      );
    }
  }

  // Use original type for metadata inference (preserves accuracy)
  const eventType = originalType;

  // Determine if this is an income, expense, or other event
  const isIncomeEvent = isIncomeType(eventType);
  const isExpenseEvent = isExpenseType(eventType);
  const isContributionEvent = isContributionType(eventType);
  const isInsuranceEvent = isInsuranceType(eventType);

  // Add taxProfile for income and payout events
  if (isIncomeEvent || isInsurancePayoutEvent(eventType)) {
    if (!normalized.taxProfile) {
      normalized.taxProfile = inferTaxProfile(event);

      if (!normalized.taxProfile && strict) {
        throw new Error(
          `PFOS-E normalization failed: Missing taxProfile for event type '${eventType}'. ` +
          `Normalization must be total and explicit.`
        );
      }
    }
  }

  // Add driverKey for all financial events
  if (!normalized.driverKey) {
    normalized.driverKey = inferDriverKey(event);

    if (!normalized.driverKey && strict) {
      logger.warn(
        `[PFOS-E] Missing driverKey for event type '${eventType}'. ` +
        `This will affect sensitivity analysis.`
      );
    }
  }

  // Add withholdingModel for income events
  if (isIncomeEvent && !normalized.withholdingModel) {
    normalized.withholdingModel = inferWithholdingModel(event);
  }

  // Add expenseNature for expense events
  if (isExpenseEvent && !normalized.expenseNature) {
    normalized.expenseNature = inferExpenseNature(event);
  }

  // Add sourceType for income events
  if (isIncomeEvent && !normalized.sourceType) {
    normalized.sourceType = inferSourceType(event);
  }

  return normalized;
}

/**
 * Normalizes an array of events
 */
export function normalizeEventsForPFOSE<T extends { type: string | EventType; [key: string]: unknown }>(
  events: T[],
  strict: boolean = false
): (T & NormalizedEvent)[] {
  return events.map(event => normalizeEventForPFOSE(event, strict));
}

// =============================================================================
// INFERENCE FUNCTIONS
// =============================================================================

function inferTaxProfile(event: { type: string | EventType; [key: string]: unknown }): TaxProfile | undefined {
  const eventType = event.type as EventType;

  // Check if already has taxProfile
  if (event.taxProfile && typeof event.taxProfile === 'string') {
    return event.taxProfile as TaxProfile;
  }

  // Check metadata
  if (event.metadata && typeof event.metadata === 'object') {
    const meta = event.metadata as Record<string, unknown>;
    if (meta.taxProfile && typeof meta.taxProfile === 'string') {
      return meta.taxProfile as TaxProfile;
    }
  }

  // Infer from event type
  const defaultProfile = TAX_PROFILE_MAP[eventType];
  if (defaultProfile) {
    return defaultProfile;
  }

  // Special handling for dividend income
  if (eventType === EventType.DIVIDEND_INCOME) {
    const isQualified = event.isQualified as boolean | undefined;
    return isQualified === false ? 'ordinary_income' : 'qualified_dividend';
  }

  // Special handling for income events based on source
  if (eventType === EventType.INCOME) {
    const source = (event.source as string || '').toLowerCase();
    if (source.includes('bonus')) {
      return 'ordinary_income';
    }
    if (source.includes('rsu') || source.includes('stock')) {
      return 'ordinary_income';
    }
  }

  return TAX_PROFILE_MAP['DEFAULT'];
}

function inferDriverKey(event: { type: string | EventType; [key: string]: unknown }): DriverKey | undefined {
  const eventType = event.type as EventType;

  // Check if already has driverKey
  if (event.driverKey && typeof event.driverKey === 'string') {
    return event.driverKey as DriverKey;
  }

  // Check metadata
  if (event.metadata && typeof event.metadata === 'object') {
    const meta = event.metadata as Record<string, unknown>;
    if (meta.driverKey && typeof meta.driverKey === 'string') {
      return meta.driverKey as DriverKey;
    }
  }

  // Special handling based on account type for contributions
  if (eventType === EventType.SCHEDULED_CONTRIBUTION) {
    const accountType = (event.accountType as string || event.targetAccountType as string || '').toLowerCase();
    if (accountType.includes('529')) {
      return 'contribution:education';
    }
    if (accountType.includes('taxable') || accountType.includes('brokerage')) {
      return 'contribution:taxable';
    }
    return 'contribution:retirement';
  }

  // Special handling for expense categories
  if (isExpenseType(eventType)) {
    const category = (event.category as string || event.expenseCategory as string || '').toLowerCase();
    if (category.includes('housing') || category.includes('rent') || category.includes('mortgage')) {
      return 'expense:fixed';
    }
    if (category.includes('food') || category.includes('entertainment') || category.includes('travel')) {
      return 'expense:variable';
    }
    if (eventType === EventType.ONE_TIME_EVENT) {
      return 'expense:shock';
    }
  }

  // Infer from event type
  return DRIVER_KEY_MAP[eventType];
}

function inferWithholdingModel(event: { type: string | EventType; [key: string]: unknown }): WithholdingModel {
  const eventType = event.type as EventType;

  // Check if already has withholdingModel
  if (event.withholdingModel && typeof event.withholdingModel === 'string') {
    return event.withholdingModel as WithholdingModel;
  }

  // Employment income uses IRS percentage method
  if (eventType === EventType.INCOME) {
    const source = (event.source as string || '').toLowerCase();
    if (source.includes('bonus')) {
      return 'fixed_rate'; // 22% supplemental rate
    }
    return 'irs_percentage';
  }

  // Most other income has no withholding
  return 'none';
}

function inferExpenseNature(event: { type: string | EventType; [key: string]: unknown }): ExpenseNature {
  const eventType = event.type as EventType;

  // Check if already has expenseNature
  if (event.expenseNature && typeof event.expenseNature === 'string') {
    return event.expenseNature as ExpenseNature;
  }

  // One-time events are shocks
  if (eventType === EventType.ONE_TIME_EVENT) {
    return 'shock';
  }

  // Infer from category
  const category = (event.category as string || event.expenseCategory as string || '').toLowerCase();

  // Fixed expenses
  if (
    category.includes('housing') ||
    category.includes('rent') ||
    category.includes('mortgage') ||
    category.includes('insurance') ||
    category.includes('utilities') ||
    category.includes('childcare')
  ) {
    return 'fixed';
  }

  // Variable expenses
  if (
    category.includes('food') ||
    category.includes('entertainment') ||
    category.includes('travel') ||
    category.includes('vacation')
  ) {
    return 'variable';
  }

  // Default to fixed (conservative)
  return 'fixed';
}

function inferSourceType(event: { type: string | EventType; [key: string]: unknown }): IncomeSourceType {
  const eventType = event.type as EventType;

  // Check if already has sourceType
  if (event.sourceType && typeof event.sourceType === 'string') {
    return event.sourceType as IncomeSourceType;
  }

  // Check metadata
  if (event.metadata && typeof event.metadata === 'object') {
    const meta = event.metadata as Record<string, unknown>;
    if (meta.sourceType && typeof meta.sourceType === 'string') {
      return meta.sourceType as IncomeSourceType;
    }
  }

  // Infer from event type
  switch (eventType) {
    case EventType.SOCIAL_SECURITY_INCOME:
      return 'social_security';
    case EventType.PENSION_INCOME:
      return 'pension';
    case EventType.ANNUITY_PAYMENT:
      return 'annuity';
    case EventType.DIVIDEND_INCOME:
      return 'dividend';
    case EventType.RENTAL_INCOME:
      return 'rental';
    case EventType.BUSINESS_INCOME:
      return 'business';
    case EventType.RSU_VESTING:
      return 'rsu';
    case EventType.INCOME:
      break; // Fall through to source analysis
    default:
      return 'salary';
  }

  // Analyze source field for INCOME events
  const source = (event.source as string || '').toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_TYPE_MAP)) {
    if (source.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Check incomeType field
  const incomeType = (event.incomeType as string || '').toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_TYPE_MAP)) {
    if (incomeType.includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'salary'; // Default
}

// =============================================================================
// TYPE CLASSIFICATION HELPERS
// =============================================================================

function isIncomeType(eventType: EventType): boolean {
  return [
    EventType.INCOME,
    EventType.SOCIAL_SECURITY_INCOME,
    EventType.PENSION_INCOME,
    EventType.ANNUITY_PAYMENT,
    EventType.DIVIDEND_INCOME,
    EventType.RENTAL_INCOME,
    EventType.BUSINESS_INCOME,
    EventType.RSU_VESTING,
    EventType.INHERITANCE,
  ].includes(eventType);
}

function isExpenseType(eventType: EventType): boolean {
  return [
    EventType.RECURRING_EXPENSE,
    EventType.ONE_TIME_EVENT,
    EventType.HEALTHCARE_COST,
    EventType.TUITION_PAYMENT,
    EventType.VEHICLE_PURCHASE,
    EventType.HOME_IMPROVEMENT,
    EventType.EDUCATION_EXPENSE,
    EventType.FAMILY_EVENT,
    EventType.PROPERTY_MAINTENANCE,
  ].includes(eventType);
}

function isContributionType(eventType: EventType): boolean {
  return [
    EventType.SCHEDULED_CONTRIBUTION,
    EventType.FIVE_TWO_NINE_CONTRIBUTION,
  ].includes(eventType);
}

function isInsuranceType(eventType: EventType): boolean {
  return [
    EventType.LIFE_INSURANCE_PREMIUM,
    EventType.LIFE_INSURANCE_PAYOUT,
    EventType.DISABILITY_INSURANCE_PREMIUM,
    EventType.DISABILITY_INSURANCE_PAYOUT,
    EventType.LONG_TERM_CARE_INSURANCE_PREMIUM,
    EventType.LONG_TERM_CARE_PAYOUT,
  ].includes(eventType);
}

function isInsurancePayoutEvent(eventType: EventType): boolean {
  return [
    EventType.LIFE_INSURANCE_PAYOUT,
    EventType.DISABILITY_INSURANCE_PAYOUT,
    EventType.LONG_TERM_CARE_PAYOUT,
  ].includes(eventType);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates that an event has all required PFOS-E fields
 */
export function validatePFOSECompliance(event: NormalizedEvent): string[] {
  const errors: string[] = [];
  const eventType = event.type as EventType;

  // Check taxProfile for income events
  if (isIncomeType(eventType) && !event.taxProfile) {
    errors.push(`Missing taxProfile for income event type '${eventType}'`);
  }

  // Check driverKey for all financial events
  if (!event.driverKey) {
    errors.push(`Missing driverKey for event type '${eventType}'`);
  }

  // Check expenseNature for expense events
  if (isExpenseType(eventType) && !event.expenseNature) {
    errors.push(`Missing expenseNature for expense event type '${eventType}'`);
  }

  return errors;
}
