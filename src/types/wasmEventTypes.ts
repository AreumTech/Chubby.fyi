/**
 * WASM Event Type Registry
 *
 * This file maintains the single source of truth for event types that are
 * supported by the WASM simulation engine. It ensures frontend-WASM compatibility.
 */

import { logger } from '../utils/logger';

// Valid WASM event types - must match Go SimulatorEventType and event_registry.go
export const VALID_WASM_EVENT_TYPES = new Set([
  // Core SimulatorEventType values (generated_interface_types.go)
  'INCOME',
  'EXPENSE',
  'CONTRIBUTION',
  'WITHDRAWAL',
  'TRANSFER',
  'ROTH_CONVERSION',
  'TAX_PAYMENT',
  'RMD',
  
  // Extended event registry types
  'RECURRING_EXPENSE', 
  'ONE_TIME_EXPENSE',
  'SCHEDULED_CONTRIBUTION',
  
  // Income stream events
  'SOCIAL_SECURITY_INCOME',
  'PENSION_INCOME',
  'DIVIDEND_INCOME',
  'ANNUITY_PAYMENT',
  
  // Capital gains and investment events
  'CAPITAL_GAINS_REALIZATION',
  'RSU_VESTING',
  'RSU_SALE',
  
  // Portfolio management events
  'REBALANCE_PORTFOLIO',
  'TAX_LOSS_HARVESTING_SALE',
  'STRATEGIC_CAPITAL_GAINS_REALIZATION',
  'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE',
  
  // Healthcare and charitable events
  'HEALTHCARE_COST',
  'QUALIFIED_CHARITABLE_DISTRIBUTION',
  
  // Cash management events
  'ADJUST_CASH_RESERVE_SELL_ASSETS',
  'ADJUST_CASH_RESERVE_BUY_ASSETS',
  
  // Planning and monitoring events
  'GOAL_DEFINE',
  'CONCENTRATION_RISK_ALERT',
  
  // Distribution events
  'REQUIRED_MINIMUM_DISTRIBUTION',
  
  // Debt and liability events
  'ONE_TIME_EVENT',
  'LIABILITY_ADD',
  'MORTGAGE_ORIGINATION',
  'LIABILITY_PAYMENT',
  'DEBT_PAYMENT',
  
  // Real estate events
  'REAL_ESTATE_PURCHASE',
  'REAL_ESTATE_SALE',
  
  // Strategy configuration events
  'STRATEGY_ASSET_ALLOCATION_SET',
  'STRATEGY_REBALANCING_RULE_SET',

  // Strategy policy events - meta-events for timeline visualization
  'STRATEGY_POLICY',
  'STRATEGY_EXECUTION',

  // Initial state events
  'INITIAL_STATE',
  
  // Insurance events
  'LIFE_INSURANCE_PREMIUM',
  'LIFE_INSURANCE_PAYOUT',
  'DISABILITY_INSURANCE_PREMIUM',
  'DISABILITY_INSURANCE_PAYOUT',
  'LONG_TERM_CARE_INSURANCE_PREMIUM',
  'LONG_TERM_CARE_PAYOUT',
  
  // Education events
  'FIVE_TWO_NINE_CONTRIBUTION',
  'FIVE_TWO_NINE_WITHDRAWAL',
  'TUITION_PAYMENT',
  
  // Business events
  'BUSINESS_INCOME',
  'QUARTERLY_ESTIMATED_TAX_PAYMENT',
  
  // Additional types found in WASM registry
  'ONE_TIME_EVENT', // From unified_types.go
  'HEALTHCARE' // From unified_types.go
] as const);

// Type-safe array for iteration
export const VALID_WASM_EVENT_TYPES_ARRAY = Array.from(VALID_WASM_EVENT_TYPES);

// Type guard function
export function isValidWASMEventType(eventType: string): eventType is WASMEventType {
  return VALID_WASM_EVENT_TYPES.has(eventType as WASMEventType);
}

// TypeScript type derived from the set
export type WASMEventType = typeof VALID_WASM_EVENT_TYPES_ARRAY[number];

// Event type mapping for frontend to WASM compatibility
export const FRONTEND_TO_WASM_EVENT_TYPE_MAP: Record<string, WASMEventType> = {
  // Core SimulatorEventType mappings (CRITICAL: Use basic WASM types, not extended registry)
  'INCOME': 'INCOME',
  'EXPENSE': 'EXPENSE', // WASM expects basic EXPENSE type
  'CONTRIBUTION': 'CONTRIBUTION', // WASM expects basic CONTRIBUTION type
  'WITHDRAWAL': 'WITHDRAWAL',
  'TRANSFER': 'TRANSFER',
  'ROTH_CONVERSION': 'ROTH_CONVERSION',
  'TAX_PAYMENT': 'TAX_PAYMENT',
  'RMD': 'RMD',
  
  // Extended registry types that are valid in WASM (pass through)
  // NOTE: Only include types that are actually registered in Go event_registry.go
  'CAPITAL_GAINS_REALIZATION': 'CAPITAL_GAINS_REALIZATION',
  'RSU_VESTING': 'RSU_VESTING',
  'RSU_SALE': 'RSU_SALE',
  'REBALANCE_PORTFOLIO': 'REBALANCE_PORTFOLIO',
  'TAX_LOSS_HARVESTING_SALE': 'TAX_LOSS_HARVESTING_SALE',
  'STRATEGIC_CAPITAL_GAINS_REALIZATION': 'STRATEGIC_CAPITAL_GAINS_REALIZATION',
  'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE': 'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE',
  'QUALIFIED_CHARITABLE_DISTRIBUTION': 'QUALIFIED_CHARITABLE_DISTRIBUTION',
  'ADJUST_CASH_RESERVE_SELL_ASSETS': 'ADJUST_CASH_RESERVE_SELL_ASSETS',
  'ADJUST_CASH_RESERVE_BUY_ASSETS': 'ADJUST_CASH_RESERVE_BUY_ASSETS',
  'GOAL_DEFINE': 'GOAL_DEFINE',
  'CONCENTRATION_RISK_ALERT': 'CONCENTRATION_RISK_ALERT',
  'ONE_TIME_EVENT': 'ONE_TIME_EVENT',
  'LIABILITY_ADD': 'LIABILITY_ADD',
  'MORTGAGE_ORIGINATION': 'MORTGAGE_ORIGINATION',
  'LIABILITY_PAYMENT': 'LIABILITY_PAYMENT',
  'DEBT_PAYMENT': 'DEBT_PAYMENT',
  'REAL_ESTATE_PURCHASE': 'REAL_ESTATE_PURCHASE',
  'REAL_ESTATE_SALE': 'REAL_ESTATE_SALE',
  'STRATEGY_ASSET_ALLOCATION_SET': 'STRATEGY_ASSET_ALLOCATION_SET',
  'STRATEGY_REBALANCING_RULE_SET': 'STRATEGY_REBALANCING_RULE_SET',
  'STRATEGY_POLICY': 'STRATEGY_POLICY',
  'STRATEGY_EXECUTION': 'STRATEGY_EXECUTION',
  'INITIAL_STATE': 'INITIAL_STATE',
  'LIFE_INSURANCE_PREMIUM': 'LIFE_INSURANCE_PREMIUM',
  'LIFE_INSURANCE_PAYOUT': 'LIFE_INSURANCE_PAYOUT',
  'DISABILITY_INSURANCE_PREMIUM': 'DISABILITY_INSURANCE_PREMIUM',
  'DISABILITY_INSURANCE_PAYOUT': 'DISABILITY_INSURANCE_PAYOUT',
  'LONG_TERM_CARE_INSURANCE_PREMIUM': 'LONG_TERM_CARE_INSURANCE_PREMIUM',
  'LONG_TERM_CARE_PAYOUT': 'LONG_TERM_CARE_PAYOUT',
  
  // Compatibility mappings (frontend type → basic WASM SimulatorEventType)
  'RECURRING_EXPENSE': 'EXPENSE', // All expenses map to basic EXPENSE type
  'ONE_TIME_EXPENSE': 'EXPENSE', 
  
  // CRITICAL: Map all contribution types to basic CONTRIBUTION SimulatorEventType
  'SCHEDULED_CONTRIBUTION': 'CONTRIBUTION', // All contribution types -> CONTRIBUTION
  'CONDITIONAL_CONTRIBUTION': 'CONTRIBUTION',
  'PERCENTAGE_CONTRIBUTION': 'CONTRIBUTION',
  'GOAL_DRIVEN_CONTRIBUTION': 'CONTRIBUTION',
  
  // Map income types to base INCOME type (these need simulation interface mapping)
  'SOCIAL_SECURITY_INCOME': 'INCOME',
  'PENSION_INCOME': 'INCOME',
  'DIVIDEND_INCOME': 'INCOME',
  'BUSINESS_INCOME': 'INCOME',
  'ANNUITY_PAYMENT': 'INCOME',
  
  // Map expense types to base EXPENSE type  
  'HEALTHCARE_COST': 'EXPENSE',
  'TUITION_PAYMENT': 'EXPENSE',
  
  // Map specific event types that need transformation
  'QUARTERLY_ESTIMATED_TAX_PAYMENT': 'TAX_PAYMENT',
  'FIVE_TWO_NINE_CONTRIBUTION': 'CONTRIBUTION', // Override pass-through
  'FIVE_TWO_NINE_WITHDRAWAL': 'WITHDRAWAL',
  'REQUIRED_MINIMUM_DISTRIBUTION': 'RMD',
  
  // Add missing event types that aren't mapped yet
  'DEBT_CONSOLIDATION': 'DEBT_PAYMENT',
  'REFINANCE': 'DEBT_PAYMENT',
  'HOME_EQUITY_LOAN': 'DEBT_PAYMENT',
  'ACCOUNT_TRANSFER': 'TRANSFER',
  'MEGA_BACKDOOR_ROTH': 'ROTH_CONVERSION',
  'STRATEGIC_TRADE': 'TRANSFER',

  // Advanced investment strategies
  'LEVERAGED_INVESTMENT': 'CONTRIBUTION', // Leveraged investments are contributions with special asset class
  'BRIDGE_STRATEGY': 'CONTRIBUTION',
  'MORTGAGE_PAYOFF': 'WITHDRAWAL',

  // Enhanced income types
  'RENTAL_INCOME': 'INCOME',

  // Estate & Gifting events
  'ANNUAL_GIFT': 'EXPENSE', // Giving gifts is a cash outflow
  'LARGE_GIFT': 'EXPENSE',
  'INHERITANCE': 'INCOME', // Receiving inheritance is a cash inflow

  // Dynamic events - Smart financial automation
  'WATERFALL_ALLOCATION': 'CONTRIBUTION',
  'EMERGENCY_FUND_MAINTENANCE': 'CONTRIBUTION',
  'AUTOMATIC_REBALANCING': 'REBALANCE_PORTFOLIO',
  'INCOME_RESPONSIVE_SAVINGS': 'CONTRIBUTION',
  'LIFECYCLE_ADJUSTMENT': 'ONE_TIME_EVENT',
  'TAX_LOSS_HARVESTING': 'TAX_LOSS_HARVESTING_SALE',
  'SMART_DEBT_PAYMENT': 'DEBT_PAYMENT',

  // Lifecycle transition events
  'RELOCATION': 'EXPENSE', // Moving costs treated as expense
  'PROPERTY_MAINTENANCE': 'EXPENSE', // Maintenance costs are expenses
  'HEALTHCARE_TRANSITION': 'EXPENSE', // Healthcare bridge costs are expenses
  'CAREER_CHANGE': 'INCOME', // Career changes affect income
  'REAL_ESTATE_APPRECIATION': 'INITIAL_STATE', // Tracking event, no direct cash flow

  // Major purchase events
  'VEHICLE_PURCHASE': 'EXPENSE',
  'HOME_IMPROVEMENT': 'EXPENSE',

  // Professional development
  'EDUCATION_EXPENSE': 'EXPENSE',

  // Family events
  'FAMILY_EVENT': 'EXPENSE',

  // Planning events
  'FINANCIAL_MILESTONE': 'GOAL_DEFINE' // Milestones are similar to goal definitions
};

/**
 * Maps a frontend event type to its WASM-compatible equivalent
 * STRICT: Throws error on unknown types instead of defaulting
 */
export function mapEventTypeForWASM(frontendType: string): WASMEventType {
  const mapped = FRONTEND_TO_WASM_EVENT_TYPE_MAP[frontendType];
  
  if (!mapped) {
    // DEBUGGING: Log the problematic event type to console
    logger.error(`❌ UNKNOWN EVENT TYPE FOUND: '${frontendType}'`);
    logger.error(`Available event types: ${Object.keys(FRONTEND_TO_WASM_EVENT_TYPE_MAP).sort().join(', ')}`);
    
    // List all available mappings for developer guidance
    const availableTypes = Object.keys(FRONTEND_TO_WASM_EVENT_TYPE_MAP).sort();
    throw new Error(
      `❌ UNKNOWN EVENT TYPE: '${frontendType}'\n` +
      `This event type is not mapped for WASM compatibility.\n` +
      `Available frontend event types:\n${availableTypes.join(', ')}\n\n` +
      `To fix this:\n` +
      `1. Add mapping in src/types/wasmEventTypes.ts\n` +
      `2. Ensure the target WASM type exists in Go code\n` +
      `3. Update VALID_WASM_EVENT_TYPES set if needed`
    );
  }
  
  return mapped;
}

/**
 * Validates that an event type is supported by WASM
 */
export function validateWASMEventType(eventType: string): void {
  if (!isValidWASMEventType(eventType)) {
    throw new Error(
      `Invalid WASM event type: '${eventType}'. ` +
      `Valid types: ${VALID_WASM_EVENT_TYPES_ARRAY.join(', ')}`
    );
  }
}