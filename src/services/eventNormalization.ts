import { logger } from '@/utils/logger';

/**
 * Event Normalization Service
 *
 * CLEAN SEMANTIC DESIGN:
 * 1. UI Layer: Events keep their natural frequency (salary annually, groceries monthly)
 * 2. Normalization Layer: Convert everything to monthly for simulation (SINGLE conversion point)
 * 3. WASM Layer: Only receives monthly amounts with clear semantics
 * 4. Results: Absolute values at snapshots, no frequency concerns
 *
 * PFOS-E INTEGRATION:
 * - Applies PFOS-E normalization to add taxProfile, driverKey, etc.
 * - Passes PFOS-E fields through to WASM for unified handler processing
 */

import { normalizeToMonthly, applyGrowthToMonthly, type AmountWithFrequency } from './frequencyNormalization';
import { getEventAmount } from './eventFieldAccessor';
import type { FinancialEvent, SimulationEvent } from '@/types';
import {
  normalizeAccountType,
  validateAccountType,
  isValidAccountType,
  type StandardAccountType,
  type AccountType
} from '../types/accountTypes';
import {
  VALID_WASM_EVENT_TYPES,
  mapEventTypeForWASM,
  validateWASMEventType,
  type WASMEventType
} from '../types/wasmEventTypes';
import { normalizeEventForPFOSE, type NormalizedEvent as PFOSENormalizedEvent } from './eventPFOSENormalization';

export interface NormalizedEvent {
  id: string;
  name: string;
  type: string;
  monthlyAmount: number; // ALWAYS monthly - no ambiguity
  startMonthOffset: number;
  endMonthOffset?: number;
  originalAmount: number;
  originalFrequency: string;
  annualGrowthRate?: number;
  targetAccountType?: string;
  metadata?: any;
}

/**
 * Convert FinancialEvent to monthly-normalized format for simulation
 * This is the SINGLE conversion point - everything downstream is monthly
 */
export function normalizeEventToMonthly(
  event: FinancialEvent, 
  simulationStartYear: number,
  currentMonthOffset: number = 0,
  inflationRate: number = 0.025
): NormalizedEvent {
  // Extract amount and frequency using type-safe accessor
  const extracted = getEventAmount(event);

  let amount: number;
  let frequency: AmountWithFrequency['frequency'];

  if (extracted !== null) {
    amount = extracted.amount;
    frequency = extracted.frequency;
  } else {
    // Fallback for events not handled by accessor
    throw new Error(`Event ${event.id} (${event.type}) missing amount information`);
  }
  
  // Normalize to monthly using our standard conversion
  const normalized = normalizeToMonthly({ amount, frequency });
  
  // Apply growth if specified (growth rates are always annual, applied to monthly amounts)
  let finalMonthlyAmount = normalized.monthlyAmount;
  let effectiveGrowthRate = 0;
  
  // For income events, check if yearly raises are enabled
  if (event.type === 'INCOME' && 'enableYearlyRaises' in event) {
    if (event.enableYearlyRaises === true || event.enableYearlyRaises === undefined) {
      // Use inflation rate as growth rate when enabled (default is enabled)
      effectiveGrowthRate = inflationRate;
    }
    // If explicitly set to false, no growth rate
  } else if ('annualGrowthRate' in event && event.annualGrowthRate) {
    // For other events or if annualGrowthRate is explicitly set
    effectiveGrowthRate = event.annualGrowthRate;
  }
  
  if (effectiveGrowthRate > 0) {
    const yearsFromStart = currentMonthOffset / 12;
    finalMonthlyAmount = applyGrowthToMonthly(
      normalized.monthlyAmount,
      effectiveGrowthRate,
      yearsFromStart
    );
  }
  
  // Defensive validation - allow negative amounts for income-change events
  const allowNegative = event.type === 'CAREER_CHANGE';
  if (!isFinite(finalMonthlyAmount) || (finalMonthlyAmount < 0 && !allowNegative)) {
    logger.warn(`Event ${event.id} has invalid monthly amount: ${finalMonthlyAmount}`, 'DATA');
    finalMonthlyAmount = 0; // Fail safe to zero
  }
  
  if (finalMonthlyAmount > 1000000) { // > $1M per month seems suspicious
    logger.warn(`Event ${event.id} has unusually large monthly amount: $${finalMonthlyAmount.toLocaleString()}`, 'DATA');
  }
  
  // Convert month offsets to be relative to simulation start
  // Handle both legacy monthOffset and new startDateOffset fields
  let startMonthOffset = event.monthOffset || 0;
  if ((event as any).startDateOffset !== undefined) {
    // If startDateOffset is a year value, convert to month offset
    const startValue = (event as any).startDateOffset;
    if (startValue >= simulationStartYear) {
      // This looks like a year value, convert to month offset
      startMonthOffset = (startValue - simulationStartYear) * 12;
    } else {
      // This is already a month offset
      startMonthOffset = startValue;
    }
  }

  // Handle endDateOffset conversion
  let endMonthOffset = (event as any).endDateOffset;

  if (endMonthOffset !== undefined && endMonthOffset >= simulationStartYear) {
    // This looks like a year value, convert to month offset
    endMonthOffset = (endMonthOffset - simulationStartYear) * 12;
  }

  // No default values - if endMonthOffset is undefined, event has indefinite recurrence
  // UI should properly set endDateOffset when user specifies an end date
  
  
  return {
    id: event.id,
    name: event.name || event.type, // Fallback to event type if name not provided
    type: mapEventTypeForWASM(event.type), // Map to WASM-compatible type
    monthlyAmount: finalMonthlyAmount,
    startMonthOffset,
    endMonthOffset,
    originalAmount: amount,
    originalFrequency: frequency,
    annualGrowthRate: effectiveGrowthRate > 0 ? effectiveGrowthRate : undefined,
    targetAccountType: mapAccountType(event),
    metadata: {
      originalEvent: event,
      enableYearlyRaises: event.type === 'INCOME' ? (event as any).enableYearlyRaises : undefined
    }
  };
}

/**
 * Map legacy accountType to standardized targetAccountType
 * TYPE-SAFE: Uses strict account type system to prevent mapping bugs
 */
function mapAccountType(event: FinancialEvent): StandardAccountType | undefined {
  // First check for explicit targetAccountType
  if ('targetAccountType' in event && event.targetAccountType) {
    if (!isValidAccountType(event.targetAccountType)) {
      throw new Error(`Invalid targetAccountType "${event.targetAccountType}" in event ${event.name}`);
    }
    return normalizeAccountType(event.targetAccountType as AccountType);
  }
  
  // Then check for legacy accountType and map it
  if ('accountType' in event && event.accountType) {
    if (!isValidAccountType(event.accountType)) {
      throw new Error(`Invalid accountType "${event.accountType}" in event ${event.name}`);
    }
    
    const normalized = normalizeAccountType(event.accountType as AccountType);
    
    // Log mapping for debugging (only for legacy types)
    if (event.accountType !== normalized) {
      // Fixed legacy account mapping
    }
    
    return normalized;
  }
  
  return undefined;
}

/**
 * Convert normalized event to WASM SimulationEvent format
 * WASM only receives monthly amounts - no frequency confusion possible
 *
 * PFOS-E INTEGRATION: Applies normalization and passes through metadata fields
 */
export function convertToWasmEvent(normalizedEvent: NormalizedEvent): SimulationEvent {
  // normalizedEvent.type is already WASM-compatible (mapped in normalizeEventToMonthly)
  const wasmEventType = normalizedEvent.type;

  // Validate the type
  try {
    validateWASMEventType(wasmEventType as any);
  } catch (error) {
    logger.error(`Invalid WASM event type: ${wasmEventType}:`, 'WASM', error);
    throw error;
  }

  // Create a temporary event with mapped type for account targeting
  const eventForAccountTargeting = {
    ...normalizedEvent,
    type: wasmEventType
  };

  // Apply PFOS-E normalization to get taxProfile, driverKey, etc.
  const originalEvent = normalizedEvent.metadata?.originalEvent as FinancialEvent | undefined;
  const pfoseData: Partial<PFOSENormalizedEvent> = originalEvent
    ? normalizeEventForPFOSE({ ...originalEvent, type: originalEvent.type as string }, false)
    : {};

  // CRITICAL FIX: Create event structure that exactly matches Go FinancialEvent struct
  // Go expects: ID, Type, Description, MonthOffset, Amount, Frequency, Metadata
  // Extra fields like targetAccountType, priority must go in metadata to avoid JSON parsing errors
  const targetAccount = getTargetAccountType(eventForAccountTargeting);

  // Build the WASM event with PFOS-E fields at top level (Go reads these directly)
  const wasmEvent: SimulationEvent = {
    id: normalizedEvent.id,
    type: wasmEventType as any,
    description: normalizedEvent.name || '', // Map name to description field expected by Go
    monthOffset: normalizedEvent.startMonthOffset,
    amount: normalizedEvent.monthlyAmount, // CRITICAL: Always monthly amount
    frequency: 'monthly', // CRITICAL FIX: Always use monthly frequency since we send monthly amounts

    // PFOS-E fields - passed directly to Go struct (not in metadata)
    taxProfile: pfoseData.taxProfile,
    driverKey: pfoseData.driverKey,
    withholdingModel: pfoseData.withholdingModel,
    expenseNature: pfoseData.expenseNature,
    sourceType: pfoseData.sourceType,

    // Target account
    targetAccountType: targetAccount,

    metadata: {
      // Put all TypeScript-specific fields in metadata to avoid Go JSON parser errors
      name: normalizedEvent.name,
      targetAccountType: targetAccount, // Standard field name (for UI/TS)
      targetAccount: targetAccount, // WASM compatibility field (Go reads this)
      endMonthOffset: normalizedEvent.endMonthOffset,
      priority: 'MEDIUM',
      annualGrowthRate: normalizedEvent.annualGrowthRate || 0, // Pass growth rate to WASM for dynamic application
      originalAmount: normalizedEvent.originalAmount,
      originalFrequency: normalizedEvent.originalFrequency,
      // PFOS-E fields also in metadata for backwards compatibility
      taxProfile: pfoseData.taxProfile,
      driverKey: pfoseData.driverKey,
      withholdingModel: pfoseData.withholdingModel,
      expenseNature: pfoseData.expenseNature,
      sourceType: pfoseData.sourceType,
    }
  };

  return wasmEvent;
}

/**
 * Convert normalized event to recurring WASM SimulationEvent format
 * PERFORMANCE OPTIMIZED: Preserves recurring pattern instead of expanding
 */
export function convertToWasmEventRecurring(normalizedEvent: NormalizedEvent, maxMonthOffset: number): SimulationEvent {
  const baseEvent = convertToWasmEvent(normalizedEvent);
  
  // Set proper end month offset for recurring events
  const endMonthOffset = normalizedEvent.endMonthOffset || maxMonthOffset;
  
  const monthlyAmount = getRecurringAmount(normalizedEvent);
  
  // Debug log for amount conversion verification
  if (normalizedEvent.originalFrequency === 'annually' && normalizedEvent.originalAmount > 100000) {
    // console.log(`💰 [AMOUNT-FIX] Event ${normalizedEvent.name}: ${normalizedEvent.originalAmount} annually → ${monthlyAmount} monthly`);
  }
  
  return {
    ...baseEvent,
    endMonthOffset,
    frequency: 'monthly', // CRITICAL FIX: Always use monthly frequency since we send monthly amounts
    amount: monthlyAmount, // Use monthly amount
  };
}

/**
 * Get the correct amount for recurring events based on their frequency
 * CRITICAL: WASM expects ALL amounts as monthly, so always return monthlyAmount
 */
function getRecurringAmount(normalizedEvent: NormalizedEvent): number {
  // WASM interface expects MonthlyAmount type - always send monthly amount
  return normalizedEvent.monthlyAmount;
}

/**
 * Get target account type for event
 * COMPREHENSIVE: Handles all event types with proper account routing
 */
function getTargetAccountType(normalizedEvent: NormalizedEvent): string | undefined {
  // If explicitly specified, use that
  if (normalizedEvent.targetAccountType) {
    return normalizedEvent.targetAccountType;
  }

  // Otherwise, determine based on event type
  switch (normalizedEvent.type) {
    // === INCOME EVENTS - Default to cash ===
    case 'INCOME':
    case 'SOCIAL_SECURITY_INCOME':
    case 'PENSION_INCOME':
    case 'ANNUITY_PAYMENT':
    case 'BUSINESS_INCOME':
    case 'DISABILITY_INSURANCE_PAYOUT':
    case 'LONG_TERM_CARE_PAYOUT':
    case 'LIFE_INSURANCE_PAYOUT':
      return 'cash';

    // === EXPENSES - Default to cash (withdrawal) ===
    case 'RECURRING_EXPENSE':
    case 'EXPENSE': // Mapped target from frontend types
    case 'ONE_TIME_EVENT':
    case 'LIABILITY_PAYMENT':
    case 'DEBT_PAYMENT':
    case 'LIFE_INSURANCE_PREMIUM':
    case 'DISABILITY_INSURANCE_PREMIUM':
    case 'LONG_TERM_CARE_INSURANCE_PREMIUM':
    case 'HEALTHCARE_COST':
    case 'HEALTHCARE':
    case 'TUITION_PAYMENT':
    case 'QUARTERLY_ESTIMATED_TAX_PAYMENT':
    case 'TAX_PAYMENT': // Mapped target from frontend types
      return 'cash';

    // === INVESTMENT CONTRIBUTIONS - Require explicit targeting ===
    case 'SCHEDULED_CONTRIBUTION':
    case 'CONTRIBUTION': // Mapped target from frontend types
    case 'LEVERAGED_INVESTMENT': // Leveraged investments are contributions with special asset class
    case 'WATERFALL_ALLOCATION': // Dynamic waterfall contributions
    case 'EMERGENCY_FUND_MAINTENANCE': // Emergency fund contributions
    case 'INCOME_RESPONSIVE_SAVINGS': // Income-responsive savings
    case 'CONDITIONAL_CONTRIBUTION': // Conditional dynamic contributions
    case 'PERCENTAGE_CONTRIBUTION': // Percentage-based contributions
    case 'GOAL_DRIVEN_CONTRIBUTION': // Goal-driven contributions
      // CRITICAL: Contributions MUST have explicit targetAccountType to prevent routing errors
      // Throwing error instead of defaulting to 'taxable' to catch configuration issues early
      throw new Error(
        `❌ CONTRIBUTION ROUTING ERROR: Event "${normalizedEvent.id}" (${normalizedEvent.name}) ` +
        `is missing targetAccountType.\n\n` +
        `Contributions must specify where funds should be invested:\n` +
        `- 'tax_deferred' for 401(k)/403(b)/Traditional IRA\n` +
        `- 'roth' for Roth IRA/Roth 401(k)\n` +
        `- 'taxable' for brokerage accounts\n` +
        `- 'hsa' for Health Savings Accounts\n` +
        `- '529' for education savings\n\n` +
        `Please edit the event and specify the target account type.`
      );

    // === TAX-ADVANTAGED CONTRIBUTIONS ===
    case 'FIVE_TWO_NINE_CONTRIBUTION':
      return '529';

    // === ACCOUNT TRANSFERS ===
    case 'TRANSFER': // Mapped target from frontend types
    case 'ACCOUNT_TRANSFER': // Direct account transfer
    case 'ROTH_CONVERSION':
    case 'MEGA_BACKDOOR_ROTH':
      return 'rothIra'; // Target account for conversion

    // === WITHDRAWALS - Specify source account ===
    case 'WITHDRAWAL': // Mapped target from frontend types
    case 'REQUIRED_MINIMUM_DISTRIBUTION':
    case 'RMD': // Mapped target from frontend types  
      return 'tax_deferred'; // RMDs come from tax-deferred accounts
    case 'QUALIFIED_CHARITABLE_DISTRIBUTION':
    case 'FIVE_TWO_NINE_WITHDRAWAL':
      return 'ira'; // QCDs typically from traditional IRA

    // === TAXABLE ACCOUNT EVENTS ===
    case 'RENTAL_INCOME':
    case 'DIVIDEND_INCOME':
    case 'TAX_LOSS_HARVESTING_SALE':
    case 'TAX_LOSS_HARVESTING':
    case 'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE':
    case 'STRATEGIC_CAPITAL_GAINS_REALIZATION':
    case 'RSU_VESTING':
    case 'RSU_SALE':
    case 'STRATEGIC_TRADE':
      return 'taxable';

    // === MULTI-ACCOUNT EVENTS ===
    case 'REBALANCE_PORTFOLIO':
    case 'AUTOMATIC_REBALANCING':
    case 'ADJUST_CASH_RESERVE_BUY_ASSETS':
    case 'ADJUST_CASH_RESERVE_SELL_ASSETS':
      return undefined; // Affects all investment accounts / cash reserves

    // === REAL ESTATE EVENTS ===
    case 'REAL_ESTATE_PURCHASE':
    case 'REAL_ESTATE_SALE':
      return 'cash'; // Down payment from cash, proceeds to cash

    // === DEBT EVENTS ===
    case 'LIABILITY_ADD':
    case 'DEBT_CONSOLIDATION':
    case 'REFINANCE':
      return undefined; // These modify debt structure, not specific accounts
    case 'SMART_DEBT_PAYMENT':
      return 'cash'; // Smart debt payments come from cash
    case 'HOME_EQUITY_LOAN':
      return undefined; // Loan origination doesn't target a specific account
    case 'MORTGAGE_PAYOFF':
      return 'cash'; // Mortgage payoffs typically from cash (or explicit sourceAccountType)

    // === GIFTING & INHERITANCE ===
    case 'ANNUAL_GIFT':
    case 'LARGE_GIFT':
      return 'cash'; // Default to giving from cash
    case 'INHERITANCE':
      return 'cash'; // Default to receiving in cash

    // === LIFECYCLE TRANSITION EVENTS ===
    case 'RELOCATION':
      return 'cash'; // Moving costs paid from cash
    case 'PROPERTY_MAINTENANCE':
      return 'cash'; // Maintenance costs paid from cash
    case 'HEALTHCARE_TRANSITION':
      return 'cash'; // Healthcare bridge costs paid from cash
    case 'CAREER_CHANGE':
      return 'cash'; // Career change income/costs through cash
    case 'REAL_ESTATE_APPRECIATION':
      return undefined; // Tracking event, no direct cash flow

    // === ADVANCED RETIREMENT STRATEGIES ===
    case 'BRIDGE_STRATEGY':
      return 'taxable'; // Bridge strategies typically use taxable accounts first

    // === MAJOR PURCHASE EVENTS ===
    case 'VEHICLE_PURCHASE':
    case 'HOME_IMPROVEMENT':
      return 'cash'; // Major purchases paid from cash

    // === PROFESSIONAL DEVELOPMENT ===
    case 'EDUCATION_EXPENSE':
      return 'cash'; // Education expenses paid from cash

    // === FAMILY EVENTS ===
    case 'FAMILY_EVENT':
      return 'cash'; // Family events paid from cash

    // === DYNAMIC LIFECYCLE EVENTS ===
    case 'LIFECYCLE_ADJUSTMENT':
      return undefined; // Lifecycle adjustments may not have cash flow

    // === PLANNING EVENTS - No account targeting ===
    case 'GOAL_DEFINE':
    case 'FINANCIAL_MILESTONE':
    case 'CONCENTRATION_RISK_ALERT':
    case 'INITIAL_STATE':
    case 'STRATEGY_ASSET_ALLOCATION_SET':
    case 'STRATEGY_REBALANCING_RULE_SET':
    case 'STRATEGY_POLICY':
    case 'STRATEGY_EXECUTION':
      return undefined; // No cash flow impact

    default:
      // STRICT: Throw error instead of defaulting to cash
      throw new Error(
        `❌ UNKNOWN EVENT TYPE FOR ACCOUNT TARGETING: '${normalizedEvent.type}'\n` +
        `This event type is not handled in getTargetAccountType().\n` +
        `Add a case for this event type in src/services/eventNormalization.ts\n` +
        `Available cases: INCOME, EXPENSE, CONTRIBUTION, WITHDRAWAL, TRANSFER, etc.`
      );
  }
}

/**
 * Get default frequency for event type
 * COMPREHENSIVE: Handles all 42+ event types found in codebase
 */
function getDefaultFrequency(eventType: string): AmountWithFrequency['frequency'] {
  switch (eventType) {
    // === CORE FINANCIAL EVENTS ===
    case 'INCOME':
      return 'annually'; // Salary typically entered annually
    case 'EXPENSE':
    case 'RECURRING_EXPENSE':
      return 'monthly'; // Most expenses entered monthly
    case 'ONE_TIME_EVENT':
      return 'one-time';
    case 'CONTRIBUTION':
    case 'SCHEDULED_CONTRIBUTION':
      return 'monthly'; // Contributions typically monthly
    case 'WITHDRAWAL':
      return 'one-time'; // Withdrawals typically one-time
    case 'TRANSFER':
      return 'one-time'; // Transfers typically one-time
    case 'RMD':
      return 'annually'; // RMDs are annual
    case 'TAX_PAYMENT':
      return 'annually'; // Tax payments typically annual

    // === INCOME STREAM EVENTS ===
    case 'SOCIAL_SECURITY_INCOME':
    case 'PENSION_INCOME':
    case 'ANNUITY_PAYMENT':
    case 'RENTAL_INCOME':
    case 'BUSINESS_INCOME':
    case 'DISABILITY_INSURANCE_PAYOUT':
    case 'LONG_TERM_CARE_PAYOUT':
      return 'monthly';

    // === INVESTMENT & TAX STRATEGY EVENTS ===
    case 'ROTH_CONVERSION':
    case 'REQUIRED_MINIMUM_DISTRIBUTION':
    case 'QUALIFIED_CHARITABLE_DISTRIBUTION':
    case 'TAX_LOSS_HARVESTING_SALE':
    case 'STRATEGIC_CAPITAL_GAINS_REALIZATION':
      return 'annually'; // Annual tax planning events

    // === DEBT & LIABILITY EVENTS ===
    case 'LIABILITY_ADD':
    case 'DEBT_CONSOLIDATION':
    case 'REFINANCE':
      return 'one-time';
    case 'LIABILITY_PAYMENT':
    case 'DEBT_PAYMENT':
      return 'monthly';

    // === REAL ESTATE EVENTS ===
    case 'REAL_ESTATE_PURCHASE':
    case 'REAL_ESTATE_SALE':
      return 'one-time';

    // === INSURANCE EVENTS ===
    case 'LIFE_INSURANCE_PREMIUM':
    case 'DISABILITY_INSURANCE_PREMIUM':
    case 'LONG_TERM_CARE_INSURANCE_PREMIUM':
      return 'monthly';
    case 'LIFE_INSURANCE_PAYOUT':
      return 'one-time';

    // === EDUCATION EVENTS ===
    case 'FIVE_TWO_NINE_CONTRIBUTION':
      return 'annually'; // Often annual max contributions
    case 'FIVE_TWO_NINE_WITHDRAWAL':
    case 'TUITION_PAYMENT':
      return 'one-time';

    // === BUSINESS & TAX EVENTS ===
    case 'QUARTERLY_ESTIMATED_TAX_PAYMENT':
      return 'quarterly';

    // === ESTATE & GIFTING EVENTS ===
    case 'ANNUAL_GIFT':
      return 'annually';
    case 'LARGE_GIFT':
    case 'INHERITANCE':
      return 'one-time';

    // === EQUITY COMPENSATION EVENTS ===
    case 'RSU_VESTING':
    case 'RSU_SALE':
      return 'one-time';

    // === PORTFOLIO MANAGEMENT EVENTS ===
    case 'REBALANCE_PORTFOLIO':
      return 'quarterly';
    case 'STRATEGY_ASSET_ALLOCATION_SET':
    case 'STRATEGY_REBALANCING_RULE_SET':
    case 'STRATEGIC_TRADE':
      return 'one-time';

    // === HEALTHCARE EVENTS ===
    case 'HEALTHCARE_COST':
    case 'HEALTHCARE':
      return 'monthly';

    // === PLANNING EVENTS ===
    case 'GOAL_DEFINE':
    case 'FINANCIAL_MILESTONE':
    case 'CONCENTRATION_RISK_ALERT':
    case 'INITIAL_STATE':
    case 'STRATEGY_POLICY':
    case 'STRATEGY_EXECUTION':
      return 'one-time';

    // === ADDITIONAL INCOME TYPES ===
    case 'DIVIDEND_INCOME':
      return 'quarterly'; // Dividends typically paid quarterly

    // === ADDITIONAL TAX STRATEGY EVENTS ===
    case 'MEGA_BACKDOOR_ROTH':
      return 'annually'; // Typically done once per year
    case 'ACCOUNT_TRANSFER':
      return 'one-time'; // Transfers are typically one-time

    // === CASH RESERVE ADJUSTMENTS ===
    case 'ADJUST_CASH_RESERVE_BUY_ASSETS':
    case 'ADJUST_CASH_RESERVE_SELL_ASSETS':
      return 'one-time'; // Triggered adjustments are one-time

    // === DYNAMIC CONTRIBUTION STRATEGIES ===
    case 'CONDITIONAL_CONTRIBUTION':
    case 'PERCENTAGE_CONTRIBUTION':
    case 'GOAL_DRIVEN_CONTRIBUTION':
      return 'monthly'; // Dynamic strategies evaluate monthly

    // === ADVANCED INVESTMENT STRATEGIES ===
    case 'LEVERAGED_INVESTMENT':
      return 'monthly'; // Leveraged investments typically monthly DCA
    case 'BRIDGE_STRATEGY':
      return 'annually'; // Bridge strategies execute annually
    case 'MORTGAGE_PAYOFF':
      return 'one-time'; // Mortgage payoff is a one-time decision

    // === DEBT MANAGEMENT ===
    case 'HOME_EQUITY_LOAN':
      return 'one-time'; // Taking out a loan is one-time

    // === TAX OPTIMIZATION ===
    case 'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE':
      return 'annually'; // Tax loss harvesting is annual strategy

    // === DYNAMIC EVENTS ===
    case 'WATERFALL_ALLOCATION':
    case 'EMERGENCY_FUND_MAINTENANCE':
    case 'INCOME_RESPONSIVE_SAVINGS':
      return 'monthly'; // Dynamic savings strategies evaluate monthly
    case 'AUTOMATIC_REBALANCING':
      return 'quarterly'; // Auto-rebalancing typically quarterly
    case 'SMART_DEBT_PAYMENT':
      return 'monthly'; // Debt payments are monthly
    case 'LIFECYCLE_ADJUSTMENT':
      return 'one-time'; // Lifecycle adjustments are one-time
    case 'TAX_LOSS_HARVESTING':
      return 'annually'; // Tax loss harvesting is annual strategy

    // === LIFECYCLE TRANSITION EVENTS ===
    case 'RELOCATION':
      return 'one-time'; // Moving is a one-time event
    case 'PROPERTY_MAINTENANCE':
      return 'annually'; // Maintenance budgets typically annual
    case 'REAL_ESTATE_APPRECIATION':
      return 'annually'; // Appreciation tracked annually
    case 'HEALTHCARE_TRANSITION':
      return 'monthly'; // Healthcare costs are monthly
    case 'CAREER_CHANGE':
      return 'one-time'; // Career changes are one-time events

    // === MAJOR PURCHASE EVENTS ===
    case 'VEHICLE_PURCHASE':
    case 'HOME_IMPROVEMENT':
      return 'one-time'; // Major purchases are one-time

    // === PROFESSIONAL DEVELOPMENT ===
    case 'EDUCATION_EXPENSE':
      return 'one-time'; // Education expenses are typically one-time

    // === FAMILY EVENTS ===
    case 'FAMILY_EVENT':
      return 'one-time'; // Family events are typically one-time

    // STRICT: No fallback - must handle all event types explicitly
    default:
      throw new Error(
        `❌ UNKNOWN EVENT TYPE FOR FREQUENCY DEFAULT: '${eventType}'\n` +
        `This event type is not handled in getDefaultFrequency().\n` +
        `Add a case for this event type in src/services/eventNormalization.ts\n` +
        `Available frequencies: annually, monthly, quarterly, one-time, weekly, biweekly`
      );
  }
}

/**
 * Expand event based on its original frequency
 * FREQUENCY-AWARE: Annual events create yearly occurrences, monthly events create monthly occurrences
 */
export function expandEventByFrequency(normalized: NormalizedEvent, maxMonthOffset: number): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  logger.debug(`📅 [EVENT-EXPAND] Expanding "${normalized.name}" (${normalized.originalFrequency}) from month ${normalized.startMonthOffset} to ${normalized.endMonthOffset}, monthlyAmount: $${normalized.monthlyAmount}`);

  switch (normalized.originalFrequency) {
    case 'annually': {
      const startMonth = Math.max(0, normalized.startMonthOffset);
      const endMonth = Math.min(maxMonthOffset, normalized.endMonthOffset || maxMonthOffset);

      // SPECIAL CASE: Income with annual frequency should be paid monthly
      // Convert annual salary of $300k → monthly paychecks of $25k
      if (normalized.type === 'INCOME' || normalized.type === 'EMPLOYMENT_INCOME') {
        logger.debug(`💰 [INCOME-FIX] Converting annual income "${normalized.name}" ($${normalized.originalAmount}/year) to monthly payments ($${normalized.monthlyAmount}/month)`);

        // Create monthly events for income
        for (let monthOffset = startMonth; monthOffset <= endMonth; monthOffset++) {
          events.push({
            ...convertToWasmEvent(normalized),
            id: `${normalized.id}_month_${monthOffset}`,
            name: normalized.name,
            amount: normalized.monthlyAmount, // Use monthly amount ($25k/month)
            frequency: 'one-time', // CRITICAL: Prevent WASM from re-expanding this already-expanded event
            monthOffset
          });
        }
      } else {
        // For non-income events (bonuses, etc.), keep annual frequency
        // Create one event per year (every 12 months) with the original annual amount
        for (let monthOffset = startMonth; monthOffset < endMonth; monthOffset += 12) {
          events.push({
            ...convertToWasmEvent(normalized),
            id: `${normalized.id}_annual_${Math.floor(monthOffset / 12)}`,
            name: normalized.name, // Preserve name for validation
            amount: normalized.originalAmount, // Use original annual amount, not divided by 12
            monthOffset
          });
        }
      }
      break;
    }
    
    case 'quarterly': {
      // Quarterly events: create 3 monthly events per quarter (WASM expects monthly granularity)
      const startMonth = Math.max(0, normalized.startMonthOffset);
      const endMonth = Math.min(maxMonthOffset, normalized.endMonthOffset || maxMonthOffset);
      
      for (let quarterStart = startMonth; quarterStart <= endMonth; quarterStart += 3) {
        // Create 3 monthly events for each quarter
        for (let month = 0; month < 3; month++) {
          const monthOffset = quarterStart + month;
          if (monthOffset < endMonth) {
            events.push({
              ...convertToWasmEvent(normalized),
              id: `${normalized.id}_quarter_${Math.floor(quarterStart / 3)}_month_${month}`,
              name: normalized.name, // Preserve name for validation
              amount: normalized.monthlyAmount, // Use monthly amount for WASM
              monthOffset
            });
          }
        }
      }
      break;
    }
    
    case 'semiannually': {
      // Semi-annual events: create 6 monthly events per half-year (WASM expects monthly granularity)
      const startMonth = Math.max(0, normalized.startMonthOffset);
      const endMonth = Math.min(maxMonthOffset, normalized.endMonthOffset || maxMonthOffset);
      
      for (let semiStart = startMonth; semiStart <= endMonth; semiStart += 6) {
        // Create 6 monthly events for each half-year
        for (let month = 0; month < 6; month++) {
          const monthOffset = semiStart + month;
          if (monthOffset < endMonth) {
            events.push({
              ...convertToWasmEvent(normalized),
              id: `${normalized.id}_semiannual_${Math.floor(semiStart / 6)}_month_${month}`,
              name: normalized.name, // Preserve name for validation
              amount: normalized.monthlyAmount, // Use monthly amount for WASM
              monthOffset
            });
          }
        }
      }
      break;
    }
    
    case 'weekly': {
      // Weekly events: create event for each month with weekly amounts aggregated
      const startMonth = Math.max(0, normalized.startMonthOffset);
      const endMonth = Math.min(maxMonthOffset, normalized.endMonthOffset || maxMonthOffset);
      
      for (let monthOffset = startMonth; monthOffset <= endMonth; monthOffset++) {
        events.push({
          ...convertToWasmEvent(normalized),
          id: `${normalized.id}_week_month_${monthOffset}`,
          name: normalized.name, // Preserve name for validation
          monthOffset
        });
      }
      break;
    }
    
    case 'one-time': {
      // One-time events: create single event at specific month
      events.push({
        ...convertToWasmEvent(normalized),
        id: `${normalized.id}_onetime`,
        name: normalized.name, // Preserve name for validation
        monthOffset: normalized.startMonthOffset
      });
      break;
    }
    
    case 'biweekly':
    case 'monthly': 
    default: {
      // Monthly and other frequencies: create event for each month (existing logic)
      const startMonth = Math.max(0, normalized.startMonthOffset);
      const endMonth = Math.min(maxMonthOffset, normalized.endMonthOffset || maxMonthOffset);

      for (let monthOffset = startMonth; monthOffset <= endMonth; monthOffset++) {
        events.push({
          ...convertToWasmEvent(normalized),
          id: `${normalized.id}_month_${monthOffset}`,
          name: normalized.name, // Preserve name for validation
          frequency: 'one-time', // CRITICAL: Already expanded, prevent WASM re-expansion
          monthOffset
        });
      }
      break;
    }
  }

  logger.debug(`📅 [EVENT-EXPAND] "${normalized.name}" generated ${events.length} occurrences`);

  return events;
}

/**
 * Process a list of events for WASM simulation
 * PERFORMANCE OPTIMIZED: Keep events as recurring patterns instead of expanding
 */
export function preprocessEventsForWASM(
  events: FinancialEvent[],
  simulationStartYear: number,
  maxMonthOffset: number,
  inflationRate: number = 0.025
): SimulationEvent[] {
  logger.debug(`🔄 [EVENT-EXPANSION] Preprocessing ${events.length} events into individual occurrences`);

  // SAFETY: Memory usage estimation and circuit breaker
  const estimatedTotalEvents = estimateEventExpansion(events, maxMonthOffset);
  const MEMORY_SAFETY_LIMIT = 50000; // Raised to support 70-year simulations

  if (estimatedTotalEvents > MEMORY_SAFETY_LIMIT) {
    logger.error(`🚨 [MEMORY-PROTECTION] Event expansion would generate ${estimatedTotalEvents} events (limit: ${MEMORY_SAFETY_LIMIT}). Using recurring patterns instead.`);
    return convertToRecurringPatterns(events, simulationStartYear, maxMonthOffset, inflationRate);
  }

  const wasmEvents: SimulationEvent[] = [];
  let totalExpanded = 0;

  // Expand recurring events into individual occurrences
  for (const event of events) {
    try {
      const normalized = normalizeEventToMonthly(event, simulationStartYear, 0, inflationRate);

      // Expand recurring events based on their frequency and date range
      const expandedEvents = expandEventByFrequency(normalized, maxMonthOffset);
      wasmEvents.push(...expandedEvents);
      totalExpanded += expandedEvents.length;

      // Log expansion for significant events
      if (expandedEvents.length > 1) {
        logger.debug(`📅 [EVENT-EXPANSION] Expanded '${event.name}' (${event.type}) into ${expandedEvents.length} occurrences`);
      }

    } catch (error) {
      logger.error(`❌ [EVENT-EXPANSION] Failed to process event ${event.id}:`, error);
      continue;
    }
  }

  logger.debug(`✅ [EVENT-EXPANSION] Generated ${totalExpanded} individual events from ${events.length} source events`);
  return wasmEvents;
}

/**
 * Estimate how many individual events would be generated by expansion
 * MEMORY SAFETY: Prevents OOM crashes by estimating before processing
 */
function estimateEventExpansion(events: FinancialEvent[], maxMonthOffset: number): number {
  let estimatedTotal = 0;

  for (const event of events) {
    // Estimate based on event type and frequency
    const frequency = (event as any).frequency || 'monthly';
    let estimatedOccurrences = 1;

    if (frequency === 'monthly' || frequency === 'biweekly') {
      // Use endDateOffset if available, otherwise assume full simulation period
      const endOffset = (event as any).endDateOffset;
      const effectiveEndOffset = endOffset !== undefined ? endOffset : maxMonthOffset;
      estimatedOccurrences = Math.max(1, effectiveEndOffset);
    } else if (frequency === 'annually') {
      estimatedOccurrences = Math.max(1, Math.floor(maxMonthOffset / 12));
    }

    estimatedTotal += estimatedOccurrences;

    // Early exit if we're already over the limit
    if (estimatedTotal > 5000) {
      return estimatedTotal;
    }
  }

  return estimatedTotal;
}

/**
 * Convert events to recurring patterns instead of expanding them
 * PERFORMANCE: Prevents memory issues by using efficient recurring patterns
 */
function convertToRecurringPatterns(
  events: FinancialEvent[],
  simulationStartYear: number,
  maxMonthOffset: number,
  inflationRate: number
): SimulationEvent[] {
  const recurringPatterns: SimulationEvent[] = [];

  for (const event of events) {
    try {
      const normalized = normalizeEventToMonthly(event, simulationStartYear, 0, inflationRate);

      // Create a single recurring pattern instead of expanding
      const pattern = convertToWasmEvent(normalized);
      recurringPatterns.push(pattern);

      logger.dataLog(`Created recurring pattern for '${event.name}' (${event.type})`);
    } catch (error) {
      logger.error(`Failed to create recurring pattern for event ${event.id}:`, 'EVENT', error);
      continue;
    }
  }

  logger.debug(`🎯 [MEMORY-PROTECTION] Created ${recurringPatterns.length} recurring patterns instead of expanding`);
  return recurringPatterns;
}