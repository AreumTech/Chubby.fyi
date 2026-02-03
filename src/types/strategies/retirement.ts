/**
 * Retirement Strategies - Withdrawal and decumulation strategies
 * 
 * This module contains all retirement-related strategy definitions including
 * withdrawal strategies, cash management, and retirement planning.
 */

import { BaseStrategy, StrategyType } from './base';
import { AccountType } from '../common';

// =============================================================================
// RETIREMENT WITHDRAWAL STRATEGY
// =============================================================================

export const RETIREMENT_WITHDRAWAL_STRATEGY_TYPE = StrategyType.RETIREMENT_WITHDRAWAL;

export type RetirementWithdrawalStrategyType = 'constant_inflation_adjusted' | 'vpw' | 'guardrail' | 'dynamic_guardrail';
export type WithdrawalAccountSequence = AccountType[];

// Base parameters for all withdrawal strategies
export interface BaseRetirementWithdrawalParams {
  /** Account order for withdrawals */
  accountSequence: WithdrawalAccountSequence;
  
  /** Whether to minimize taxes during withdrawals */
  taxOptimized?: boolean;
  
  /** Maximum withdrawal rate as safety limit */
  maxWithdrawalRate?: number;
  
  /** Minimum withdrawal amount (for basic expenses) */
  minWithdrawalAmount?: number;
}

// Constant inflation-adjusted withdrawal (traditional 4% rule)
export interface ConstantInflationAdjustedParams extends BaseRetirementWithdrawalParams {
  /** Initial withdrawal rate (e.g., 0.04 for 4%) */
  initialRate: number;
  
  /** Type of inflation adjustment */
  inflationAdjustment: 'cpi' | 'fixed' | 'none';
  
  /** Fixed inflation rate if using 'fixed' */
  fixedInflationRate?: number;
}

// Variable percentage withdrawal
export interface VpwParams extends BaseRetirementWithdrawalParams {
  /** VPW table name or custom rates */
  vpwTableName?: string;
  
  /** Custom rates by age */
  rates?: { [age: number]: number };
}

// Guardrail strategies
export interface GuardrailParams extends BaseRetirementWithdrawalParams {
  /** Initial withdrawal rate */
  initialRate: number;
  
  /** Upper threshold triggering spending cuts */
  prosperityRuleThreshold: number;
  
  /** Lower threshold allowing spending increases */
  capitalPreservationThreshold: number;
  
  /** Adjustment amount for prosperity rule */
  prosperityAdjustment: number;
  
  /** Adjustment amount for capital preservation */
  capitalPreservationAdjustment: number;
  
  /** Whether to freeze withdrawals on threshold violation */
  freezeOnViolation?: boolean;
}

// Dynamic guardrail parameters
export interface DynamicGuardrailParams extends BaseRetirementWithdrawalParams {
  /** Initial withdrawal rate */
  initialRate: number;
  
  /** Upper guardrail triggering spending cuts */
  upperGuardrail: number;
  
  /** Lower guardrail allowing spending increases */
  lowerGuardrail: number;
  
  /** Magnitude of spending adjustments */
  spendingAdjustmentPct: number;
  
  /** Inflation adjustment method */
  inflationAdjustment: 'cpi' | 'fixed' | 'none';
}

export interface RetirementWithdrawalStrategy extends BaseStrategy {
  type: typeof RETIREMENT_WITHDRAWAL_STRATEGY_TYPE;
  parameters: {
    /** Specific withdrawal strategy type */
    strategyType: RetirementWithdrawalStrategyType;
    
    /** Strategy-specific parameters */
    constantInflationAdjusted?: ConstantInflationAdjustedParams;
    vpw?: VpwParams;
    guardrail?: GuardrailParams;
    dynamicGuardrail?: DynamicGuardrailParams;
    
    /** Last year's withdrawal amount for inflation adjustments */
    lastYearWithdrawalAmount?: number;
    
    /** Initial portfolio value at retirement */
    initialPortfolioValueAtRetirement?: number;
    
    /** Age when retirement withdrawals begin */
    retirementStartAge?: number;
  };
}

export function isRetirementWithdrawalStrategy(strategy: { type: StrategyType }): strategy is RetirementWithdrawalStrategy {
  return strategy.type === RETIREMENT_WITHDRAWAL_STRATEGY_TYPE;
}

// =============================================================================
// CASH MANAGEMENT STRATEGY
// =============================================================================

export const CASH_MANAGEMENT_STRATEGY_TYPE = StrategyType.CASH_MANAGEMENT;

export interface CashManagementStrategy extends BaseStrategy {
  type: typeof CASH_MANAGEMENT_STRATEGY_TYPE;
  parameters: {
    /** Whether cash management is enabled */
    enabled: boolean;
    
    /** Target cash reserve in months of expenses */
    targetReserveMonthsOfExpenses?: number;
    
    /** Target cash reserve as absolute amount */
    targetReserveAbsoluteAmount?: number;
    
    /** Minimum cash reserve (safety buffer) */
    minReserveAbsoluteAmount?: number;
    
    /** How aggressively to replenish cash (0-1 scale) */
    replenishmentAggressiveness?: number;
    
    /** Whether to automatically invest excess cash */
    sweepExcessCashToInvestments?: boolean;
    
    /** Excess cash threshold for investment */
    sweepThreshold?: number;
    
    /** Account priority for cash management */
    cashAccountPriority?: AccountType[];
    
    /** Investment account priority for excess cash */
    investmentAccountPriority?: AccountType[];
    
    /** Maximum time to hold excess cash before investing (months) */
    maxCashHoldPeriod?: number;
  };
}

export function isCashManagementStrategy(strategy: { type: StrategyType }): strategy is CashManagementStrategy {
  return strategy.type === CASH_MANAGEMENT_STRATEGY_TYPE;
}

// =============================================================================
// COMPOSITE TYPES AND GUARDS
// =============================================================================

/**
 * Union type for all retirement strategies
 */
export type RetirementStrategies = 
  | RetirementWithdrawalStrategy
  | CashManagementStrategy;

/**
 * Type guard for any retirement strategy
 */
export function isRetirementStrategy(strategy: { type: StrategyType }): strategy is RetirementStrategies {
  return isRetirementWithdrawalStrategy(strategy) || 
         isCashManagementStrategy(strategy);
}