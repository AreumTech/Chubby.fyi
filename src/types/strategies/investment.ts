/**
 * Investment Strategies - Asset allocation, rebalancing, and investment management
 * 
 * This module contains all investment-related strategy definitions including
 * asset allocation, rebalancing rules, and asset location preferences.
 */

import { BaseStrategy, StrategyType } from './base';
import { AssetClass, AccountType, RebalancingMethod } from '../common';

// =============================================================================
// ASSET ALLOCATION STRATEGY
// =============================================================================

export const ASSET_ALLOCATION_STRATEGY_TYPE = StrategyType.ASSET_ALLOCATION;

/**
 * Master asset allocation percentages across all asset classes
 * Excludes cash as it's managed separately via cash management strategy
 */
export type MasterAssetAllocation = {
  [K in Exclude<AssetClass, AssetClass.CASH>]?: number;
};

export interface AssetAllocationStrategy extends BaseStrategy {
  type: typeof ASSET_ALLOCATION_STRATEGY_TYPE;
  parameters: {
    /** Target allocation percentages (sum should equal 1.0) */
    targetAllocation: MasterAssetAllocation;
    
    /** Tolerance bands before rebalancing is triggered */
    toleranceBands?: {
      [K in AssetClass]?: {
        min: number; // Minimum acceptable percentage
        max: number; // Maximum acceptable percentage
      };
    };
    
    /** Minimum trade size to avoid tiny transactions */
    minimumTradeSize?: number;
    
    /** Whether to consider tax implications when rebalancing */
    taxAware?: boolean;
    
    /** Asset location preferences (which assets go in which account types) */
    assetLocationPreferences?: AssetLocationPreferences;
  };
}

export function isAssetAllocationStrategy(strategy: { type: StrategyType }): strategy is AssetAllocationStrategy {
  return strategy.type === ASSET_ALLOCATION_STRATEGY_TYPE;
}

// =============================================================================
// REBALANCING STRATEGY
// =============================================================================

export const REBALANCING_STRATEGY_TYPE = StrategyType.REBALANCING;

export interface RebalancingParameters {
  method: RebalancingMethod;
  frequencyMonths: number;
  thresholdPercentage?: number; // For threshold-based rebalancing
}

export interface RebalancingStrategy extends BaseStrategy {
  type: typeof REBALANCING_STRATEGY_TYPE;
  parameters: {
    /** Core rebalancing parameters */
    rebalancing: RebalancingParameters;
    
    /** Asset-specific thresholds */
    assetSpecificThresholds?: {
      [K in AssetClass]?: number;
    };
    
    /** Minimum time between rebalances (in months) */
    minTimeBetweenRebalances?: number;
    
    /** Maximum number of assets to trade in a single rebalance */
    maxAssetsPerRebalance?: number;
    
    /** Whether to rebalance only with new contributions */
    contributionOnlyRebalancing?: boolean;
  };
}

export function isRebalancingStrategy(strategy: { type: StrategyType }): strategy is RebalancingStrategy {
  return strategy.type === REBALANCING_STRATEGY_TYPE;
}

// =============================================================================
// ASSET LOCATION STRATEGY
// =============================================================================

export const ASSET_LOCATION_STRATEGY_TYPE = StrategyType.ASSET_LOCATION;

/**
 * Asset location preferences - which asset classes should be held in which account types
 * Ordered arrays indicate preference (first choice, second choice, etc.)
 */
export type AssetLocationPreferences = {
  [K in Exclude<AssetClass, AssetClass.CASH>]?: AccountType[];
};

export interface AssetLocationStrategy extends BaseStrategy {
  type: typeof ASSET_LOCATION_STRATEGY_TYPE;
  parameters: {
    /** Preferred account types for each asset class */
    preferences: AssetLocationPreferences;
    
    /** Whether to automatically relocate assets during rebalancing */
    autoRelocate?: boolean;
    
    /** Minimum amount to justify relocation */
    minRelocationAmount?: number;
    
    /** Tax cost threshold for relocations */
    maxTaxCostForRelocation?: number;
  };
}

export function isAssetLocationStrategy(strategy: { type: StrategyType }): strategy is AssetLocationStrategy {
  return strategy.type === ASSET_LOCATION_STRATEGY_TYPE;
}

// =============================================================================
// COMPOSITE TYPES AND GUARDS
// =============================================================================

/**
 * Union type for all investment strategies
 */
export type InvestmentStrategies = 
  | AssetAllocationStrategy
  | RebalancingStrategy
  | AssetLocationStrategy;

/**
 * Type guard for any investment strategy
 */
export function isInvestmentStrategy(strategy: { type: StrategyType }): strategy is InvestmentStrategies {
  return isAssetAllocationStrategy(strategy) || 
         isRebalancingStrategy(strategy) || 
         isAssetLocationStrategy(strategy);
}