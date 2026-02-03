/**
 * Strategic Trade Events - Consolidated cash management and portfolio adjustments
 * 
 * This module consolidates the previous ADJUST_CASH_RESERVE_SELL_ASSETS and 
 * ADJUST_CASH_RESERVE_BUY_ASSETS events into a unified STRATEGIC_TRADE event
 * that can handle both buying and selling operations.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// STRATEGIC TRADE (Consolidated from Cash Reserve Adjustments)
// =============================================================================

export const STRATEGIC_TRADE_EVENT_TYPE = EventType.STRATEGIC_TRADE;

/**
 * StrategicTradeEvent - Unified event for buying/selling assets
 * 
 * This replaces the previous ADJUST_CASH_RESERVE_SELL_ASSETS and 
 * ADJUST_CASH_RESERVE_BUY_ASSETS events with a single, more flexible interface.
 */
export interface StrategicTradeEvent extends BaseEvent {
  type: typeof STRATEGIC_TRADE_EVENT_TYPE;
  
  // Trade operation type
  operation: 'buy' | 'sell';
  
  // Trade amount (positive for both buy and sell)
  amount: number;
  
  // Asset identifier (optional for sell operations using priorities)
  assetId?: string;
  
  // Account management
  sourceAccountType?: AccountType; // For buy operations (cash source)
  targetAccountType?: AccountType; // For sell operations (where cash goes)
  
  // Priority-based account selection
  accountTypesPriority?: AccountType[]; // Ordered list of accounts to use
  
  // Additional trade parameters
  minimumTradeSize?: number; // Don't execute trades below this size
  maxSlippage?: number; // Maximum acceptable slippage percentage
  
  // Strategic context
  reason?: 'rebalancing' | 'cash_management' | 'tax_optimization' | 'risk_management';
}

export function isStrategicTradeEvent(event: { type: EventType }): event is StrategicTradeEvent {
  return event.type === STRATEGIC_TRADE_EVENT_TYPE;
}

// =============================================================================
// REBALANCING PORTFOLIO EVENT
// =============================================================================

export const REBALANCE_PORTFOLIO_EVENT_TYPE = EventType.REBALANCE_PORTFOLIO;

export interface RebalancePortfolioEvent extends BaseEvent {
  type: typeof REBALANCE_PORTFOLIO_EVENT_TYPE;
  
  // Rebalancing parameters
  method?: 'threshold' | 'calendar' | 'tactical'; // Rebalancing trigger method
  thresholdPercentage?: number; // For threshold-based rebalancing
  frequencyMonths?: number; // For calendar-based rebalancing
  
  // Target accounts for rebalancing
  accountTypes?: AccountType[]; // Specific accounts to rebalance
  
  // Trade execution preferences
  minimumTradeSize?: number;
  allowTaxableEvents?: boolean; // Whether to generate taxable events
  
  // Strategic context
  reason?: 'scheduled' | 'threshold_breach' | 'tactical_adjustment';
}

export function isRebalancePortfolioEvent(event: { type: EventType }): event is RebalancePortfolioEvent {
  return event.type === REBALANCE_PORTFOLIO_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all strategic events
 */
export type StrategicEvents = 
  | StrategicTradeEvent
  | RebalancePortfolioEvent
  | StrategyAssetAllocationSetEvent
  | StrategyRebalancingRuleSetEvent;

/**
 * Type guard for any strategic event
 */
export function isStrategicEventType(event: { type: EventType }): event is StrategicEvents {
  return isStrategicTradeEvent(event) || 
         isRebalancePortfolioEvent(event) ||
         isStrategyAssetAllocationSetEvent(event) ||
         isStrategyRebalancingRuleSetEvent(event);
}

/**
 * Check if an event involves trading assets
 */
export function involvesTradingAssets(event: { type: EventType }): event is StrategicEvents {
  return isStrategicEventType(event);
}

// =============================================================================
// LEGACY COMPATIBILITY - For migration period
// =============================================================================

// Type aliases for backward compatibility during migration
export type AdjustCashReserveSellAssetsEvent = StrategicTradeEvent & { operation: 'sell' };
export type AdjustCashReserveBuyAssetsEvent = StrategicTradeEvent & { operation: 'buy' };

// Legacy type guards for backward compatibility
export function isAdjustCashReserveSellAssetsEvent(event: { type: EventType }): event is AdjustCashReserveSellAssetsEvent {
  return isStrategicTradeEvent(event) && (event as StrategicTradeEvent).operation === 'sell';
}

export function isAdjustCashReserveBuyAssetsEvent(event: { type: EventType }): event is AdjustCashReserveBuyAssetsEvent {
  return isStrategicTradeEvent(event) && (event as StrategicTradeEvent).operation === 'buy';
}

// =============================================================================
// STRATEGY CONFIGURATION EVENTS
// =============================================================================

export const STRATEGY_ASSET_ALLOCATION_SET_EVENT_TYPE = EventType.STRATEGY_ASSET_ALLOCATION_SET;
export const STRATEGY_REBALANCING_RULE_SET_EVENT_TYPE = EventType.STRATEGY_REBALANCING_RULE_SET;

export interface StrategyAssetAllocationSetEvent extends BaseEvent {
  type: typeof STRATEGY_ASSET_ALLOCATION_SET_EVENT_TYPE;
  allocation: Record<string, number>; // Asset class to percentage mapping
  accountTypes?: AccountType[]; // Which accounts this applies to
}

export interface StrategyRebalancingRuleSetEvent extends BaseEvent {
  type: typeof STRATEGY_REBALANCING_RULE_SET_EVENT_TYPE;
  method: 'periodic' | 'threshold' | 'tactical';
  frequencyMonths?: number; // For periodic rebalancing
  thresholdPercentage?: number; // For threshold rebalancing
  accountTypes?: AccountType[]; // Which accounts this applies to
}

export function isStrategyAssetAllocationSetEvent(event: { type: EventType }): event is StrategyAssetAllocationSetEvent {
  return event.type === STRATEGY_ASSET_ALLOCATION_SET_EVENT_TYPE;
}

export function isStrategyRebalancingRuleSetEvent(event: { type: EventType }): event is StrategyRebalancingRuleSetEvent {
  return event.type === STRATEGY_REBALANCING_RULE_SET_EVENT_TYPE;
}