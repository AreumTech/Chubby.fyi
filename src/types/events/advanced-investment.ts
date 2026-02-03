/**
 * Advanced Investment Strategy Events
 * 
 * This module defines sophisticated investment strategies including leveraged investments,
 * bridge strategies for early retirement, and mortgage payoff vs investment analysis.
 * These events require careful modeling of risk-return tradeoffs and complex financial decisions.
 */

import { BaseEvent, EventType } from './base';
import { AccountType, AssetClass } from '../common';

// =============================================================================
// LEVERAGED INVESTMENT EVENT
// =============================================================================

export const LEVERAGED_INVESTMENT_EVENT_TYPE = EventType.LEVERAGED_INVESTMENT;

/**
 * LeveragedInvestmentEvent - For leveraged ETF strategies (2x/3x SPY, etc.)
 * 
 * Models investment in leveraged exchange-traded funds that use derivatives
 * to amplify returns (and volatility) of an underlying index.
 */
export interface LeveragedInvestmentEvent extends BaseEvent {
  type: typeof LEVERAGED_INVESTMENT_EVENT_TYPE;
  
  // Investment details
  amount: number; // Amount to invest
  leverageMultiplier: 2 | 3; // 2x or 3x leverage
  underlyingAsset: 'SPY' | 'QQQ' | 'IWM' | 'TQQQ' | 'UPRO' | 'SPXL'; // Underlying index/ETF
  targetAccountType: AccountType; // Where to make the investment
  
  // Strategy parameters
  frequency?: 'once' | 'monthly' | 'quarterly'; // Investment frequency
  startDateOffset: number; // When to start investing
  endDateOffset?: number; // When to stop (optional for indefinite)
  
  // Risk management
  stopLossThreshold?: number; // Percentage loss to trigger exit (e.g., 30)
  profitTakingThreshold?: number; // Percentage gain to trigger partial exit
  maxPortfolioAllocation?: number; // Maximum percentage of portfolio (e.g., 10)
  
  // Rebalancing rules
  rebalanceFrequency?: 'monthly' | 'quarterly' | 'annually' | 'threshold';
  rebalanceThreshold?: number; // Percentage deviation to trigger rebalance
  
  // Cost basis
  expenseRatio?: number; // Annual expense ratio (default: 0.95% for 3x ETFs)
  annualDecayAssumption?: number; // Expected annual decay due to volatility
}

export function isLeveragedInvestmentEvent(event: { type: EventType }): event is LeveragedInvestmentEvent {
  return event.type === LEVERAGED_INVESTMENT_EVENT_TYPE;
}

// =============================================================================
// BRIDGE STRATEGY EVENT
// =============================================================================

export const BRIDGE_STRATEGY_EVENT_TYPE = EventType.BRIDGE_STRATEGY;

/**
 * BridgeStrategyEvent - For pre-59½ early retirement planning
 * 
 * Models strategies to bridge the gap between early retirement and penalty-free
 * access to retirement accounts, including Roth ladders, 401(k) loans, and
 * taxable account spending strategies.
 */
export interface BridgeStrategyEvent extends BaseEvent {
  type: typeof BRIDGE_STRATEGY_EVENT_TYPE;
  
  // Bridge strategy type
  strategyType: 'roth_ladder' | 'rule_72t' | 'taxable_first' | 'roth_contributions' | 'mixed';
  
  // Timeline
  bridgeStartAge: number; // When early retirement begins
  bridgeEndAge: number; // When penalty-free access starts (typically 59.5)
  startDateOffset: number; // When to start implementing strategy
  
  // Roth Ladder specific parameters
  rothLadderAmount?: number; // Annual Roth conversion amount
  rothLadderYears?: number; // How many years to convert (5-year rule)
  
  // Rule 72(t) SEPP parameters
  seppAmount?: number; // Annual substantially equal payment amount
  seppSourceAccount?: AccountType; // Which IRA/401k to draw from
  seppMethod?: 'fixed_amortization' | 'fixed_annuitization' | 'rmd_method';
  
  // Taxable account spending
  taxableSpendingAmount?: number; // Annual spending from taxable accounts
  preserveCashReserve?: number; // Minimum cash to maintain
  
  // Roth contribution access
  rothContributionAmount?: number; // Annual access to Roth contributions
  rothContributionYears?: number; // Years of contributions to access
  
  // Risk management
  inflationProtection?: boolean; // Whether to adjust amounts for inflation
  contingencyPlan?: 'return_to_work' | 'reduce_spending' | 'early_withdrawal_penalty';
  emergencyBuffer?: number; // Additional months of expenses to maintain
  
  // Tax efficiency
  targetTaxBracket?: number; // Target marginal tax rate for conversions
  stateResidencyChange?: boolean; // Planning to move to lower tax state
  harvestLossesFirst?: boolean; // Use tax loss harvesting before conversions
}

export function isBridgeStrategyEvent(event: { type: EventType }): event is BridgeStrategyEvent {
  return event.type === BRIDGE_STRATEGY_EVENT_TYPE;
}

// =============================================================================
// MORTGAGE PAYOFF EVENT
// =============================================================================

export const MORTGAGE_PAYOFF_EVENT_TYPE = EventType.MORTGAGE_PAYOFF;

/**
 * MortgagePayoffEvent - For lump sum mortgage payoff vs investing analysis
 * 
 * Models the decision to pay off a mortgage with a lump sum versus investing
 * that money, considering psychological benefits, risk tolerance, and tax implications.
 */
export interface MortgagePayoffEvent extends BaseEvent {
  type: typeof MORTGAGE_PAYOFF_EVENT_TYPE;
  
  // Mortgage details
  remainingBalance: number; // Current mortgage balance
  interestRate: number; // Current mortgage interest rate (annual)
  remainingYears: number; // Years left on mortgage
  currentPayment: number; // Current monthly payment
  
  // Payoff details
  payoffAmount: number; // Lump sum amount available for payoff
  sourceAccountType: AccountType; // Where payoff money comes from
  payoffDate: number; // Month offset when payoff occurs
  
  // Alternative investment scenario
  alternativeInvestment?: {
    targetAccountType: AccountType;
    assetClass: AssetClass;
    expectedReturn: number; // Annual expected return
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
  
  // Tax considerations
  mortgageInterestDeductible?: boolean; // Whether interest is tax deductible
  effectiveTaxRate?: number; // Marginal tax rate for deduction benefit
  capitalGainsTaxRate?: number; // Tax rate on investment gains
  
  // Cash flow impact
  reinvestSavings?: boolean; // Reinvest monthly payment savings
  reinvestmentAccount?: AccountType; // Where to invest payment savings
  
  // Psychological factors (for reporting)
  debtAversionScore?: 1 | 2 | 3 | 4 | 5; // 1=love leverage, 5=hate debt
  sleepAtNightFactor?: 1 | 2 | 3 | 4 | 5; // 1=high risk tolerance, 5=need certainty
  
  // Scenario analysis
  runSensitivityAnalysis?: boolean; // Whether to test multiple market scenarios
  worstCaseMarketReturn?: number; // Bear market assumption for analysis
  inflationAssumption?: number; // Inflation rate for real return calculation
  
  // Strategic considerations
  otherDebts?: Array<{
    type: string;
    balance: number;
    rate: number;
    minimumPayment: number;
  }>; // Other debts to consider in optimization
  
  liquidityNeeds?: number; // Months of expenses to maintain in cash
  futureCashFlowChanges?: {
    incomeChange?: number; // Expected income change
    expenseChange?: number; // Expected expense change
    timeframe?: number; // When changes occur
  };
}

export function isMortgagePayoffEvent(event: { type: EventType }): event is MortgagePayoffEvent {
  return event.type === MORTGAGE_PAYOFF_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Union type for all advanced investment strategy events
 */
export type AdvancedInvestmentEvents = 
  | LeveragedInvestmentEvent
  | BridgeStrategyEvent
  | MortgagePayoffEvent;

/**
 * Type guard for any advanced investment strategy event
 */
export function isAdvancedInvestmentEvent(event: { type: EventType }): event is AdvancedInvestmentEvents {
  return isLeveragedInvestmentEvent(event) || 
         isBridgeStrategyEvent(event) ||
         isMortgagePayoffEvent(event);
}

/**
 * Check if an event involves complex risk analysis
 */
export function requiresRiskAnalysis(event: { type: EventType }): boolean {
  return isAdvancedInvestmentEvent(event);
}

/**
 * Check if an event involves leveraged products
 */
export function involvesLeverage(event: { type: EventType }): boolean {
  return isLeveragedInvestmentEvent(event);
}

/**
 * Check if an event is part of early retirement strategy
 */
export function isEarlyRetirementStrategy(event: { type: EventType }): boolean {
  return isBridgeStrategyEvent(event);
}

/**
 * Check if an event involves debt vs investment optimization
 */
export function isDebtVsInvestmentStrategy(event: { type: EventType }): boolean {
  return isMortgagePayoffEvent(event);
}