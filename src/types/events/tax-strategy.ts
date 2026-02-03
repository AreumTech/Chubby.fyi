/**
 * Tax Strategy Events - Tax-related financial events
 * 
 * This module contains events related to tax strategies including
 * Roth conversions and qualified charitable distributions.
 */

import { BaseEvent, EventType } from './base';
import { AccountType } from '../common';

// =============================================================================
// ROTH CONVERSIONS
// =============================================================================

export const ROTH_CONVERSION_EVENT_TYPE = EventType.ROTH_CONVERSION;

export interface RothConversionEvent extends BaseEvent {
  type: typeof ROTH_CONVERSION_EVENT_TYPE;
  amount: number;
  sourceAccountType: AccountType; // Typically 'tax_deferred'
  targetAccountType: AccountType; // Typically 'roth'
  conversionStrategy?: 'specific_amount' | 'fill_bracket'; // For more advanced logic later
}

export function isRothConversionEvent(event: { type: EventType }): event is RothConversionEvent {
  return event.type === ROTH_CONVERSION_EVENT_TYPE;
}

// =============================================================================
// MEGA BACKDOOR ROTH CONVERSIONS
// =============================================================================

export const MEGA_BACKDOOR_ROTH_EVENT_TYPE = EventType.MEGA_BACKDOOR_ROTH;

/**
 * Mega Backdoor Roth Event
 * 
 * Advanced strategy for high earners to contribute after-tax dollars to 401(k)
 * and immediately convert to Roth. Requires employer plan support for:
 * - After-tax 401(k) contributions beyond the standard limit
 * - In-service distributions or immediate Roth conversions
 */
export interface MegaBackdoorRothEvent extends BaseEvent {
  type: typeof MEGA_BACKDOOR_ROTH_EVENT_TYPE;
  amount: number; // Annual after-tax contribution amount
  frequency: 'monthly' | 'annually'; // How often contributions are made
  startDateOffset: number; // When strategy starts
  endDateOffset?: number; // When strategy ends (optional)
  annualGrowthRate?: number; // Annual increase in contribution amount
  
  // Strategy details
  immediateConversion?: boolean; // Whether conversion happens immediately or at year-end
  sourceAccountType: AccountType; // Typically 'tax_deferred' (after-tax 401k)
  targetAccountType: AccountType; // Typically 'roth'
  
  // Advanced options
  conversionTiming?: 'immediate' | 'quarterly' | 'annually'; // When conversions occur
  maxContributionLimit?: number; // Annual limit (typically $69,000 - standard contribution)
}

export function isMegaBackdoorRothEvent(event: { type: EventType }): event is MegaBackdoorRothEvent {
  return event.type === MEGA_BACKDOOR_ROTH_EVENT_TYPE;
}

// =============================================================================
// QUALIFIED CHARITABLE DISTRIBUTIONS
// =============================================================================

export const QUALIFIED_CHARITABLE_DISTRIBUTION_EVENT_TYPE = EventType.QUALIFIED_CHARITABLE_DISTRIBUTION;

export interface QualifiedCharitableDistributionEvent extends BaseEvent {
  type: typeof QUALIFIED_CHARITABLE_DISTRIBUTION_EVENT_TYPE;
  amount: number; // This is the amount of the QCD
  assetSoldId?: string; // Optional: if specific asset was sold to fund QCD from taxable, though QCD is from IRA
  amountSold?: number; // Optional: if specific asset was sold
  sourceIraAccountType: AccountType; // e.g., 'tax_deferred' for Traditional IRA
  satisfiesRmdAmount: number; // How much of this QCD counts towards RMD
}

export function isQualifiedCharitableDistributionEvent(event: { type: EventType }): event is QualifiedCharitableDistributionEvent {
  return event.type === QUALIFIED_CHARITABLE_DISTRIBUTION_EVENT_TYPE;
}

// =============================================================================
// REQUIRED MINIMUM DISTRIBUTIONS
// =============================================================================

export const REQUIRED_MINIMUM_DISTRIBUTION_EVENT_TYPE = EventType.REQUIRED_MINIMUM_DISTRIBUTION;

/**
 * Required Minimum Distribution calculation and execution event.
 * Automatically calculates and processes RMDs from tax-deferred accounts.
 */
export interface RequiredMinimumDistributionEvent extends BaseEvent {
  type: typeof REQUIRED_MINIMUM_DISTRIBUTION_EVENT_TYPE;
  sourceAccountType: AccountType; // Typically 'tax_deferred'
  calculatedAmount?: number; // Calculated RMD amount (set during processing)
  satisfiedByQCD?: number; // Amount satisfied by Qualified Charitable Distributions
  remainingDistributionRequired?: number; // Amount still needed after QCDs
  rmdFactor?: number; // IRS life expectancy factor used
  accountBalanceForRMD?: number; // Account balance used for calculation
}

export function isRequiredMinimumDistributionEvent(event: { type: EventType }): event is RequiredMinimumDistributionEvent {
  return event.type === REQUIRED_MINIMUM_DISTRIBUTION_EVENT_TYPE;
}

// =============================================================================
// TAX LOSS HARVESTING
// =============================================================================

export const TAX_LOSS_HARVESTING_SALE_EVENT_TYPE = EventType.TAX_LOSS_HARVESTING_SALE;
export const TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE_EVENT_TYPE = EventType.TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE;
export const STRATEGIC_CAPITAL_GAINS_REALIZATION_EVENT_TYPE = EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION;

export interface TaxLossHarvestingSaleEvent extends BaseEvent {
  type: typeof TAX_LOSS_HARVESTING_SALE_EVENT_TYPE;
  amount: number;
  assetId?: string;
  sourceAccountType: AccountType;
  lossAmount: number;
  washSaleViolation?: boolean;
}

export interface TaxLossHarvestingCheckAndExecuteEvent extends BaseEvent {
  type: typeof TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE_EVENT_TYPE;
  minLossThreshold?: number;
  maxTransactionsPerMonth?: number;
  excludeWashSales?: boolean;
}

/**
 * Strategic Capital Gains Realization Event
 * 
 * Strategically sell investments to realize capital gains or losses.
 * Used for tax optimization, portfolio rebalancing, or raising cash.
 */
export interface StrategicCapitalGainsRealizationEvent extends BaseEvent {
  type: typeof STRATEGIC_CAPITAL_GAINS_REALIZATION_EVENT_TYPE;
  amount: number; // Dollar amount to sell
  sourceAccountType: AccountType; // Account to sell from (typically 'taxable')
  
  // Sale strategy
  saleStrategy: 'specific_amount' | 'percentage_of_portfolio' | 'specific_security';
  percentageToSell?: number; // If selling percentage of portfolio
  securityToSell?: string; // Specific security identifier
  
  // Tax optimization
  gainType?: 'short_term' | 'long_term' | 'mixed'; // Expected gain type
  expectedGainsAmount?: number; // Expected capital gains
  expectedLossAmount?: number; // Expected capital losses
  targetTaxBracket?: string; // Target tax bracket for gains
  
  // Proceeds handling
  proceedsDestination?: AccountType; // Where to deposit sale proceeds
  reinvestProceeds?: boolean; // Whether to reinvest or hold as cash
  
  // Advanced options
  taxLossHarvesting?: boolean; // Coordinate with tax loss harvesting
  washSaleAvoidance?: boolean; // Avoid wash sale rules
}

export function isTaxLossHarvestingSaleEvent(event: { type: EventType }): event is TaxLossHarvestingSaleEvent {
  return event.type === TAX_LOSS_HARVESTING_SALE_EVENT_TYPE;
}

export function isTaxLossHarvestingCheckAndExecuteEvent(event: { type: EventType }): event is TaxLossHarvestingCheckAndExecuteEvent {
  return event.type === TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE_EVENT_TYPE;
}

export function isStrategicCapitalGainsRealizationEvent(event: { type: EventType }): event is StrategicCapitalGainsRealizationEvent {
  return event.type === STRATEGIC_CAPITAL_GAINS_REALIZATION_EVENT_TYPE;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Union type for all tax strategy events
 */
export type TaxStrategyEvents = 
  | RothConversionEvent
  | MegaBackdoorRothEvent
  | QualifiedCharitableDistributionEvent
  | RequiredMinimumDistributionEvent
  | TaxLossHarvestingSaleEvent
  | TaxLossHarvestingCheckAndExecuteEvent
  | StrategicCapitalGainsRealizationEvent;

/**
 * Type guard for any tax strategy event
 */
export function isTaxStrategyEventType(event: { type: EventType }): event is TaxStrategyEvents {
  return isRothConversionEvent(event) || 
         isMegaBackdoorRothEvent(event) ||
         isQualifiedCharitableDistributionEvent(event) || 
         isRequiredMinimumDistributionEvent(event) ||
         isTaxLossHarvestingSaleEvent(event) ||
         isTaxLossHarvestingCheckAndExecuteEvent(event) ||
         isStrategicCapitalGainsRealizationEvent(event);
}