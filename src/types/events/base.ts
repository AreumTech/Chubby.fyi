/**
 * Event System Base Types
 * 
 * This module defines the foundational types for the event system,
 * including event types, priorities, and base interfaces.
 */

// =============================================================================
// EVENT TYPE ENUM - Central registry of all event types
// =============================================================================

/**
 * EventType enum used for both FinancialEvent (frontend timeline) and SimulationEvent (WASM processing)
 * 
 * IMPORTANT: This enum serves as the single source of truth for all event types.
 * When adding new event types, ensure they are processed in both the frontend
 * timeline and the WASM simulation engine.
 */
export enum EventType {
  // Core financial events
  INCOME = 'INCOME',
  SCHEDULED_CONTRIBUTION = 'SCHEDULED_CONTRIBUTION',
  RECURRING_EXPENSE = 'RECURRING_EXPENSE',
  ONE_TIME_EVENT = 'ONE_TIME_EVENT',
  
  // Debt management events
  LIABILITY_ADD = 'LIABILITY_ADD',
  LIABILITY_PAYMENT = 'LIABILITY_PAYMENT',
  DEBT_PAYMENT = 'DEBT_PAYMENT',
  DEBT_CONSOLIDATION = 'DEBT_CONSOLIDATION',
  REFINANCE = 'REFINANCE',
  HOME_EQUITY_LOAN = 'HOME_EQUITY_LOAN',
  
  // Retirement events
  SOCIAL_SECURITY_INCOME = 'SOCIAL_SECURITY_INCOME',
  PENSION_INCOME = 'PENSION_INCOME',
  ANNUITY_PAYMENT = 'ANNUITY_PAYMENT',
  REQUIRED_MINIMUM_DISTRIBUTION = 'REQUIRED_MINIMUM_DISTRIBUTION',
  WITHDRAWAL = 'WITHDRAWAL',
  ACCOUNT_TRANSFER = 'ACCOUNT_TRANSFER',
  
  // Tax strategies
  ROTH_CONVERSION = 'ROTH_CONVERSION',
  MEGA_BACKDOOR_ROTH = 'MEGA_BACKDOOR_ROTH',
  QUALIFIED_CHARITABLE_DISTRIBUTION = 'QUALIFIED_CHARITABLE_DISTRIBUTION',
  
  // Healthcare
  HEALTHCARE_COST = 'HEALTHCARE_COST',
  
  // Insurance events
  LIFE_INSURANCE_PREMIUM = 'LIFE_INSURANCE_PREMIUM',
  LIFE_INSURANCE_PAYOUT = 'LIFE_INSURANCE_PAYOUT',
  DISABILITY_INSURANCE_PREMIUM = 'DISABILITY_INSURANCE_PREMIUM',
  DISABILITY_INSURANCE_PAYOUT = 'DISABILITY_INSURANCE_PAYOUT',
  LONG_TERM_CARE_INSURANCE_PREMIUM = 'LONG_TERM_CARE_INSURANCE_PREMIUM',
  LONG_TERM_CARE_PAYOUT = 'LONG_TERM_CARE_PAYOUT',
  
  // Investment strategies
  STRATEGY_ASSET_ALLOCATION_SET = 'STRATEGY_ASSET_ALLOCATION_SET',
  STRATEGY_REBALANCING_RULE_SET = 'STRATEGY_REBALANCING_RULE_SET',
  REBALANCE_PORTFOLIO = 'REBALANCE_PORTFOLIO',
  TAX_LOSS_HARVESTING_SALE = 'TAX_LOSS_HARVESTING_SALE',
  TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE = 'TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE',
  STRATEGIC_CAPITAL_GAINS_REALIZATION = 'STRATEGIC_CAPITAL_GAINS_REALIZATION',
  
  // Strategic trade management (consolidated from cash reserve adjustments)
  STRATEGIC_TRADE = 'STRATEGIC_TRADE',
  ADJUST_CASH_RESERVE_SELL_ASSETS = 'ADJUST_CASH_RESERVE_SELL_ASSETS',
  ADJUST_CASH_RESERVE_BUY_ASSETS = 'ADJUST_CASH_RESERVE_BUY_ASSETS',
  
  // Equity compensation
  RSU_VESTING = 'RSU_VESTING',
  RSU_SALE = 'RSU_SALE',
  
  // Enhanced income types
  RENTAL_INCOME = 'RENTAL_INCOME',
  DIVIDEND_INCOME = 'DIVIDEND_INCOME',

  // Real Estate events
  REAL_ESTATE_PURCHASE = 'REAL_ESTATE_PURCHASE',
  REAL_ESTATE_SALE = 'REAL_ESTATE_SALE',
  
  // Education events
  FIVE_TWO_NINE_CONTRIBUTION = 'FIVE_TWO_NINE_CONTRIBUTION',
  FIVE_TWO_NINE_WITHDRAWAL = 'FIVE_TWO_NINE_WITHDRAWAL',
  TUITION_PAYMENT = 'TUITION_PAYMENT',
  
  // Business & Self-Employment events
  BUSINESS_INCOME = 'BUSINESS_INCOME',
  QUARTERLY_ESTIMATED_TAX_PAYMENT = 'QUARTERLY_ESTIMATED_TAX_PAYMENT',
  
  // Estate & Gifting events
  ANNUAL_GIFT = 'ANNUAL_GIFT',
  LARGE_GIFT = 'LARGE_GIFT',
  INHERITANCE = 'INHERITANCE',
  
  // Risk management
  CONCENTRATION_RISK_ALERT = 'CONCENTRATION_RISK_ALERT',
  
  // Planning
  GOAL_DEFINE = 'GOAL_DEFINE',
  FINANCIAL_MILESTONE = 'FINANCIAL_MILESTONE',
  INITIAL_STATE = 'INITIAL_STATE',
  
  // Dynamic Events - Smart financial automation
  CONDITIONAL_CONTRIBUTION = 'CONDITIONAL_CONTRIBUTION',
  WATERFALL_ALLOCATION = 'WATERFALL_ALLOCATION',
  PERCENTAGE_CONTRIBUTION = 'PERCENTAGE_CONTRIBUTION',
  SMART_DEBT_PAYMENT = 'SMART_DEBT_PAYMENT',
  GOAL_DRIVEN_CONTRIBUTION = 'GOAL_DRIVEN_CONTRIBUTION',
  EMERGENCY_FUND_MAINTENANCE = 'EMERGENCY_FUND_MAINTENANCE',
  
  // Advanced Dynamic Events - Portfolio management and lifecycle
  AUTOMATIC_REBALANCING = 'AUTOMATIC_REBALANCING',
  INCOME_RESPONSIVE_SAVINGS = 'INCOME_RESPONSIVE_SAVINGS',
  LIFECYCLE_ADJUSTMENT = 'LIFECYCLE_ADJUSTMENT',
  TAX_LOSS_HARVESTING = 'TAX_LOSS_HARVESTING',
  
  // Advanced Investment Strategy Events
  LEVERAGED_INVESTMENT = 'LEVERAGED_INVESTMENT',
  BRIDGE_STRATEGY = 'BRIDGE_STRATEGY',
  MORTGAGE_PAYOFF = 'MORTGAGE_PAYOFF',
  
  // Lifecycle Transition Events
  RELOCATION = 'RELOCATION',
  REAL_ESTATE_APPRECIATION = 'REAL_ESTATE_APPRECIATION',
  PROPERTY_MAINTENANCE = 'PROPERTY_MAINTENANCE',
  HEALTHCARE_TRANSITION = 'HEALTHCARE_TRANSITION',
  CAREER_CHANGE = 'CAREER_CHANGE',
  
  // Major Purchase Events
  VEHICLE_PURCHASE = 'VEHICLE_PURCHASE',
  HOME_IMPROVEMENT = 'HOME_IMPROVEMENT',
  
  // Professional Development Events  
  EDUCATION_EXPENSE = 'EDUCATION_EXPENSE', // Different from 529 - for continuing education, certifications
  
  // Family Events
  FAMILY_EVENT = 'FAMILY_EVENT',

  // Strategy Lifecycle Events - Strategies as first-class events with duration
  STRATEGY_POLICY = 'STRATEGY_POLICY',           // Strategy policy with start/end dates
  STRATEGY_EXECUTION = 'STRATEGY_EXECUTION',     // Individual strategy action (rebalance, withdrawal, etc.)

  // =============================================================================
  // DEBT MANAGEMENT EVENTS
  // =============================================================================
  RATE_RESET = 'RATE_RESET',                     // Variable rate loan rate adjustment

  // =============================================================================
  // PFOS-E CONSOLIDATED EVENT TYPES
  // These unified types replace multiple legacy types with metadata-driven handlers
  // =============================================================================
  CASHFLOW_INCOME = 'CASHFLOW_INCOME',           // Unified income handler
  CASHFLOW_EXPENSE = 'CASHFLOW_EXPENSE',         // Unified expense handler
  INSURANCE_PREMIUM = 'INSURANCE_PREMIUM',       // Unified insurance premium handler
  INSURANCE_PAYOUT = 'INSURANCE_PAYOUT',         // Unified insurance payout handler
  ACCOUNT_CONTRIBUTION = 'ACCOUNT_CONTRIBUTION', // Enhanced contribution with PFOS-E metadata
  EXPOSURE_CHANGE = 'EXPOSURE_CHANGE',           // RSU/concentration tracking
}

// =============================================================================
// EVENT PRIORITY SYSTEM - Processing order within simulation months
// =============================================================================

/**
 * EventPriority determines the order in which events are processed within a single month.
 * Lower numbers = higher priority (processed first).
 * 
 * Processing Order Logic:
 * 1. Income events (cash inflows) - Must happen first to provide liquidity
 * 2. Fixed obligations (debt payments, healthcare) - Non-discretionary outflows
 * 3. Discretionary expenses and contributions - Can be adjusted based on available cash
 * 4. Strategic activities (conversions, rebalancing) - Happen after core cash flows
 * 5. Administrative events - Happen at month end
 */
export enum EventPriority {
  // Phase 1: Income and Cash Inflows (1-10)
  INCOME = 1,
  PENSION_INCOME = 2,
  ANNUITY_PAYMENT = 3,
  SOCIAL_SECURITY_INCOME = 4,
  RSU_VESTING = 5,
  RENTAL_INCOME = 6,
  BUSINESS_INCOME = 7,
  DIVIDEND_INCOME = 8,
  INHERITANCE = 9,
  
  // Phase 2: Fixed Obligations (11-20)
  LIABILITY_PAYMENT = 12,
  RECURRING_EXPENSE = 13,
  HEALTHCARE_COST = 14,
  HEALTHCARE_TRANSITION = 15,
  PROPERTY_MAINTENANCE = 16,
  LIFE_INSURANCE_PREMIUM = 17,
  DISABILITY_INSURANCE_PREMIUM = 18,
  LONG_TERM_CARE_INSURANCE_PREMIUM = 19,
  QUARTERLY_ESTIMATED_TAX_PAYMENT = 20,
  
  // Phase 1.5: Insurance Payouts (between income and obligations)
  LIFE_INSURANCE_PAYOUT = 9,
  DISABILITY_INSURANCE_PAYOUT = 10,
  LONG_TERM_CARE_PAYOUT = 11,
  
  // Phase 3: Discretionary Activities (21-40)
  SCHEDULED_CONTRIBUTION = 21,
  FIVE_TWO_NINE_CONTRIBUTION = 22,
  ROTH_CONVERSION = 23,
  MEGA_BACKDOOR_ROTH = 24,
  REQUIRED_MINIMUM_DISTRIBUTION = 25,
  WITHDRAWAL = 26,
  ACCOUNT_TRANSFER = 27,
  ONE_TIME_EVENT = 28,
  TUITION_PAYMENT = 29,
  FIVE_TWO_NINE_WITHDRAWAL = 30,
  ANNUAL_GIFT = 31,
  LARGE_GIFT = 32,
  
  // Phase 4: Strategic Activities (41-60)
  REBALANCE_PORTFOLIO = 41,
  STRATEGIC_TRADE = 42,
  RSU_SALE = 43,
  TAX_LOSS_HARVESTING_SALE = 44,
  STRATEGIC_CAPITAL_GAINS_REALIZATION = 45,
  QUALIFIED_CHARITABLE_DISTRIBUTION = 46,
  LEVERAGED_INVESTMENT = 47,
  BRIDGE_STRATEGY = 48,
  MORTGAGE_PAYOFF = 49,
  
  // Phase 5: Administrative Events (61-100)
  RATE_RESET = 60,   // Rate resets before new liabilities
  LIABILITY_ADD = 61,
  HOME_EQUITY_LOAN = 62,
  REAL_ESTATE_PURCHASE = 63,
  REAL_ESTATE_SALE = 64,
  REAL_ESTATE_APPRECIATION = 65,
  RELOCATION = 66,
  CAREER_CHANGE = 67,
  GOAL_DEFINE = 68,
  CONCENTRATION_RISK_ALERT = 69,
  FINANCIAL_MILESTONE = 70,
  VEHICLE_PURCHASE = 71,
  HOME_IMPROVEMENT = 72,
  EDUCATION_EXPENSE = 73,
  
  // Strategy Events (50-55) - Between strategic activities and administrative
  STRATEGY_POLICY = 50,           // Strategy activation/deactivation
  STRATEGY_EXECUTION = 51,        // Individual strategy action

  // Default and fallback priorities
  USER_ACTION = 75,
  DEFAULT_FINANCIAL_EVENT = 80,
  TIME_STEP = 100,
}

// =============================================================================
// BASE EVENT INTERFACE - Foundation for all events
// =============================================================================

/**
 * BaseEvent - Common fields for all financial events
 * 
 * This interface provides the foundation that all specific event types extend.
 * Every event must have these core fields for proper processing and identification.
 */
export interface BaseEvent {
  /** Unique identifier for this event */
  id: string;

  /** Discriminator field for type safety */
  type: EventType;

  /** Display name for UI - falls back to formatted type if not provided */
  name?: string;

  /** Simulation month this event occurs in (0 = first month) */
  monthOffset: number;

  /** Description for debugging and UI display */
  description?: string;

  /** Processing priority within the month */
  priority?: EventPriority;

  /** Tags for categorization and filtering */
  tags?: string[];

  /** Additional event-specific metadata */
  metadata?: Record<string, any>;

  // Common event properties (may not apply to all event types)
  /** Monetary amount associated with the event */
  amount?: number;

  /** Month offset when recurring event starts */
  startDateOffset?: number;

  /** Month offset when recurring event ends (optional for indefinite events) */
  endDateOffset?: number;

  /** Legacy frequency property for backwards compatibility */
  frequency?: 'monthly' | 'annually' | 'one-time';

  /** Annual growth rate for recurring events */
  annualGrowthRate?: number;

  /** Source account type for transfers/withdrawals */
  sourceAccountType?: string;

  /** Target account type for contributions/deposits */
  targetAccountType?: string;
}

// =============================================================================
// EVENT MANIFEST - Complete financial plan structure
// =============================================================================

/**
 * EventManifest - Complete financial plan with all event categories
 * 
 * Used by personas and complete financial plans to organize events by category.
 * All arrays are optional to allow for flexible plan construction.
 */
export interface EventManifest {
  /** Initial account balances and states (legacy array format) */
  initialStates?: any[];
  
  /** Initial account balances (new object format) */
  initialAccounts?: any;
  
  /** Income-generating events */
  incomeEvents?: any[];
  
  /** Expense events */
  expenseEvents?: any[];
  
  /** Investment contribution events */
  contributionEvents?: any[];
  
  /** Liability and debt events */
  liabilityEvents?: any[];
  
  /** Tax optimization strategies */
  taxStrategyEvents?: any[];
  
  /** Portfolio and investment strategies */
  strategicEvents?: any[];
  
  /** Real estate events */
  realEstateEvents?: any[];
  
  /** Insurance events */
  insuranceEvents?: any[];
  
  /** Education-related events */
  educationEvents?: any[];
  
  /** Business and self-employment events */
  businessEvents?: any[];
  
  /** Estate planning events */
  estateEvents?: any[];
  
  /** Dynamic and conditional events */
  dynamicEvents?: any[];
  
  /** Planning and goal events */
  planningEvents?: any[];
  
  /** General events array (fallback) */
  events?: any[];
  
  /** Goals associated with this manifest */
  goals?: Array<{
    id: string;
    name: string;
    targetAmount: number;
    targetDate: Date;
    priority: 'high' | 'medium' | 'low';
    type: string;
  }>;
}