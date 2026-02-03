/**
 * Strategy System Base Types
 * 
 * This module defines the foundational types for the strategy system,
 * providing a discriminated union approach for type-safe strategy management.
 */

import { StrategyCategory } from '../common';

// =============================================================================
// STRATEGY TYPES ENUM
// =============================================================================

/**
 * Comprehensive enum of all strategy types in the system
 */
export enum StrategyType {
  // Investment Strategies
  ASSET_ALLOCATION = 'ASSET_ALLOCATION',
  REBALANCING = 'REBALANCING',
  ASSET_LOCATION = 'ASSET_LOCATION',
  
  // Tax Strategies
  ROTH_CONVERSION = 'ROTH_CONVERSION',
  TAX_LOSS_HARVESTING = 'TAX_LOSS_HARVESTING',
  STRATEGIC_CAPITAL_GAINS = 'STRATEGIC_CAPITAL_GAINS',
  IRMAA_MANAGEMENT = 'IRMAA_MANAGEMENT',
  
  // Decumulation Strategies
  RETIREMENT_WITHDRAWAL = 'RETIREMENT_WITHDRAWAL',
  CASH_MANAGEMENT = 'CASH_MANAGEMENT',
  
  // Risk Management
  CONCENTRATION_RISK = 'CONCENTRATION_RISK',
  LTC_PLANNING = 'LTC_PLANNING',
  
  // Healthcare
  HEALTHCARE_COST_MANAGEMENT = 'HEALTHCARE_COST_MANAGEMENT',
  
  // Debt Management
  DEBT_MANAGEMENT = 'DEBT_MANAGEMENT',
  
  // Charitable Giving
  CHARITABLE_GIVING = 'CHARITABLE_GIVING',
  
  // Equity Compensation
  EQUITY_COMPENSATION = 'EQUITY_COMPENSATION',
}

// =============================================================================
// BASE STRATEGY INTERFACE
// =============================================================================

/**
 * Base interface that all strategies must implement
 * Provides common fields for identification, categorization, and UI display
 */
export interface BaseStrategy {
  /** Unique identifier for this strategy instance */
  id: string;
  
  /** Human-readable name for the strategy */
  name: string;
  
  /** High-level category for grouping strategies */
  category: StrategyCategory;
  
  /** Specific strategy type for discrimination */
  type: StrategyType;
  
  /** Detailed description of what this strategy does */
  description?: string;
  
  /** UI-specific metadata */
  ui: {
    /** Current status of the strategy */
    status: 'active' | 'planned' | 'disabled';
    
    /** Icon for UI display */
    icon: string;
    
    /** Optional color theme for UI */
    color?: string;
    
    /** Whether this strategy is user-visible */
    visible?: boolean;
  };
  
  /** When this strategy was created */
  createdAt?: Date;
  
  /** When this strategy was last modified */
  updatedAt?: Date;
}

// =============================================================================
// STRATEGY STATUS AND METADATA
// =============================================================================

/**
 * Possible states a strategy can be in
 */
export type StrategyStatus = 'active' | 'planned' | 'disabled' | 'archived';

/**
 * Metadata for strategy execution and tracking
 */
export interface StrategyMetadata {
  /** Current execution status */
  status: StrategyStatus;
  
  /** Priority for execution order (lower = higher priority) */
  priority?: number;
  
  /** Whether strategy is currently executing */
  isExecuting?: boolean;
  
  /** Last execution timestamp */
  lastExecuted?: Date;
  
  /** Next scheduled execution */
  nextExecution?: Date;
  
  /** Execution frequency */
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
}

// =============================================================================
// STRATEGY EXECUTION CONTEXT
// =============================================================================

/**
 * Context information available to strategies during execution
 * This is the boundary between strategy configuration and simulation state
 */
export interface StrategyExecutionContext {
  /** Current simulation month */
  monthOffset: number;
  
  /** Current age of the person */
  currentAge: number;
  
  /** Current calendar year */
  currentYear: number;
  
  /** Available cash across all accounts */
  availableCash: number;
  
  /** Total portfolio value */
  totalPortfolioValue: number;
  
  /** Year-to-date income for tax planning */
  ytdIncome: number;
  
  /** Other context as needed by strategies */
  [key: string]: any;
}