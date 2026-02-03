/**
 * Equity Compensation Events
 * 
 * Events related to stock-based compensation including RSU vesting,
 * stock option exercises, and equity sales. These events bridge
 * income (vesting) and asset transformation (sales).
 */

import { EventType, EventPriority, BaseEvent } from './base';
import { AccountType, AssetClass } from '../common';

// =============================================================================
// RSU VESTING EVENT
// =============================================================================

/**
 * RSU Vesting Event: When restricted stock units vest and become taxable income
 * 
 * Category: Income & Consumption (creates taxable income)
 * Impact: Adds shares to taxable account, creates ordinary income for taxes
 * 
 * Example: 1000 RSUs vest quarterly at $150/share = $150,000 taxable income
 */
export interface RsuVestingEvent extends BaseEvent {
  type: EventType.RSU_VESTING;
  priority: EventPriority.RSU_VESTING;
  
  /** Company symbol or identifier */
  symbol: string;
  
  /** Number of shares vesting */
  shares: number;
  
  /** Share price at vesting (if known) or formula */
  sharePrice?: number;
  
  /** Total value if shares/price not specified */
  totalValue?: number;
  
  /** Target account for vested shares */
  targetAccountType: AccountType;
  
  /** Vesting frequency */
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
  
  /** Start date for vesting schedule */
  startDateOffset: number;
  
  /** End date for vesting schedule (optional) */
  endDateOffset?: number;
  
  /** Tax withholding percentage (0-1) */
  taxWithholdingRate?: number;
}

// =============================================================================
// RSU SALE EVENT
// =============================================================================

/**
 * RSU Sale Event: Selling previously vested equity compensation
 * 
 * Category: Asset & Liability Transformation
 * Impact: Converts equity to cash, may realize capital gains/losses
 * 
 * Example: Sell 500 shares at $175/share after vesting at $150/share
 */
export interface RsuSaleEvent extends BaseEvent {
  type: EventType.RSU_SALE;
  priority: EventPriority.RSU_SALE;
  
  /** Company symbol or identifier */
  symbol: string;
  
  /** Number of shares to sell */
  shares: number;
  
  /** Sale price per share (if known) */
  salePrice?: number;
  
  /** Total sale proceeds if shares/price not specified */
  totalProceeds?: number;
  
  /** Source account holding the equity */
  sourceAccountType: AccountType;
  
  /** Target account for proceeds */
  targetAccountType: AccountType;
  
  /** Cost basis per share (for tax calculations) */
  costBasisPerShare?: number;
  
  /** Sale frequency (for systematic selling) */
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
  
  /** Start date for sale schedule */
  startDateOffset?: number;
  
  /** End date for sale schedule */
  endDateOffset?: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for RSU Vesting Events
 */
export function isRsuVestingEvent(event: any): event is RsuVestingEvent {
  return event?.type === EventType.RSU_VESTING;
}

/**
 * Type guard for RSU Sale Events
 */
export function isRsuSaleEvent(event: any): event is RsuSaleEvent {
  return event?.type === EventType.RSU_SALE;
}

