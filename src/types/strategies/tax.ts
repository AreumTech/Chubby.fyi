/**
 * Tax Strategies - Tax optimization and planning strategies
 * 
 * This module contains all tax-related strategy definitions including
 * Roth conversions, tax-loss harvesting, and IRMAA management.
 */

import { BaseStrategy, StrategyType } from './base';
import { AccountType } from '../common';

// =============================================================================
// ROTH CONVERSION STRATEGY
// =============================================================================

export const ROTH_CONVERSION_STRATEGY_TYPE = StrategyType.ROTH_CONVERSION;

export interface RothConversionStrategy extends BaseStrategy {
  type: typeof ROTH_CONVERSION_STRATEGY_TYPE;
  parameters: {
    /** When to start conversions */
    startYear?: number;
    
    /** When to stop conversions */
    endYear?: number;
    
    /** How to determine conversion amount */
    amountHeuristic: 'fixed_amount' | 'fill_tax_bracket' | 'percentage_of_balance';
    
    /** Fixed amount for fixed_amount heuristic */
    fixedAmount?: number;
    
    /** Target tax bracket index for fill_tax_bracket heuristic */
    targetBracketIndex?: number;
    
    /** Percentage for percentage_of_balance heuristic */
    conversionPercentage?: number;
    
    /** Where to get money for taxes */
    sourceOfTaxPayment?: 'conversion_amount' | 'taxable_account' | 'cash';
    
    /** Maximum conversion amount per year */
    maxAnnualConversion?: number;
    
    /** Minimum conversion amount (don't convert if below this) */
    minAnnualConversion?: number;
    
    /** Whether to consider IRMAA thresholds */
    considerIrmaa?: boolean;
    
    /** Stop conversions if retirement is within this many years */
    stopYearsBeforeRetirement?: number;
  };
}

export function isRothConversionStrategy(strategy: { type: StrategyType }): strategy is RothConversionStrategy {
  return strategy.type === ROTH_CONVERSION_STRATEGY_TYPE;
}

// =============================================================================
// TAX-LOSS HARVESTING STRATEGY
// =============================================================================

export const TAX_LOSS_HARVESTING_STRATEGY_TYPE = StrategyType.TAX_LOSS_HARVESTING;

export interface TaxLossHarvestingStrategy extends BaseStrategy {
  type: typeof TAX_LOSS_HARVESTING_STRATEGY_TYPE;
  parameters: {
    /** Whether TLH is enabled */
    enabled: boolean;
    
    /** Minimum absolute loss to harvest */
    minLossThresholdAbsolute?: number;
    
    /** Minimum percentage loss to harvest */
    minLossThresholdPercentage?: number;
    
    /** Wash sale period in days */
    washSalePeriodDays: number;
    
    /** Strategy for replacement assets */
    replacementAssetStrategy?: 'similar_asset' | 'broad_market' | 'cash_hold';
    
    /** Maximum amount to harvest per year */
    maxAnnualHarvesting?: number;
    
    /** Whether to harvest only to offset gains */
    harvestOnlyToOffsetGains?: boolean;
    
    /** Minimum time to hold replacement asset */
    minReplacementHoldPeriod?: number;
    
    /** Account types where TLH is allowed */
    allowedAccountTypes?: AccountType[];
  };
}

export function isTaxLossHarvestingStrategy(strategy: { type: StrategyType }): strategy is TaxLossHarvestingStrategy {
  return strategy.type === TAX_LOSS_HARVESTING_STRATEGY_TYPE;
}

// =============================================================================
// STRATEGIC CAPITAL GAINS STRATEGY
// =============================================================================

export const STRATEGIC_CAPITAL_GAINS_STRATEGY_TYPE = StrategyType.STRATEGIC_CAPITAL_GAINS;

export interface StrategicCapitalGainsStrategy extends BaseStrategy {
  type: typeof STRATEGIC_CAPITAL_GAINS_STRATEGY_TYPE;
  parameters: {
    /** Whether SCGR is enabled */
    enabled: boolean;
    
    /** Target income level for optimal tax bracket */
    targetIncomeLevel?: number;
    
    /** Target tax bracket for long-term capital gains */
    targetBracket?: '0_ltcg' | '15_ltcg' | '20_ltcg';
    
    /** Maximum amount to realize per year */
    maxAnnualRealizationAmount?: number;
    
    /** Minimum gain amount to justify realization */
    minGainThreshold?: number;
    
    /** Whether to consider IRMAA impact */
    considerIrmaaImpact?: boolean;
    
    /** Preferred assets to realize gains from */
    preferredAssets?: string[];
    
    /** Whether to reinvest proceeds immediately */
    reinvestProceeds?: boolean;
  };
}

export function isStrategicCapitalGainsStrategy(strategy: { type: StrategyType }): strategy is StrategicCapitalGainsStrategy {
  return strategy.type === STRATEGIC_CAPITAL_GAINS_STRATEGY_TYPE;
}

// =============================================================================
// IRMAA MANAGEMENT STRATEGY
// =============================================================================

export const IRMAA_MANAGEMENT_STRATEGY_TYPE = StrategyType.IRMAA_MANAGEMENT;

export enum IrmaaTactic {
  DELAY_ROTH_CONVERSION = 'DELAY_ROTH_CONVERSION',
  REDUCE_ROTH_CONVERSION = 'REDUCE_ROTH_CONVERSION',
  QCD_FROM_IRA = 'QCD_FROM_IRA',
  DEFER_CAPITAL_GAINS = 'DEFER_CAPITAL_GAINS',
  ACCELERATE_DEDUCTIONS = 'ACCELERATE_DEDUCTIONS',
}

export interface IrmaaManagementStrategy extends BaseStrategy {
  type: typeof IRMAA_MANAGEMENT_STRATEGY_TYPE;
  parameters: {
    /** Whether IRMAA management is enabled */
    enabled: boolean;
    
    /** MAGI threshold to stay below */
    magiThreshold: number;
    
    /** Ordered list of tactics to apply */
    tactics: IrmaaTactic[];
    
    /** How aggressively to avoid IRMAA (0-1 scale) */
    avoidanceAggressiveness?: number;
    
    /** Acceptable IRMAA cost vs. tax savings trade-off */
    maxAcceptableIrmaaCost?: number;
    
    /** Years ahead to consider for IRMAA planning */
    planningHorizonYears?: number;
  };
}

export function isIrmaaManagementStrategy(strategy: { type: StrategyType }): strategy is IrmaaManagementStrategy {
  return strategy.type === IRMAA_MANAGEMENT_STRATEGY_TYPE;
}

// =============================================================================
// COMPOSITE TYPES AND GUARDS
// =============================================================================

/**
 * Union type for all tax strategies
 */
export type TaxStrategies = 
  | RothConversionStrategy
  | TaxLossHarvestingStrategy
  | StrategicCapitalGainsStrategy
  | IrmaaManagementStrategy;

/**
 * Type guard for any tax strategy
 */
export function isTaxStrategy(strategy: { type: StrategyType }): strategy is TaxStrategies {
  return isRothConversionStrategy(strategy) || 
         isTaxLossHarvestingStrategy(strategy) || 
         isStrategicCapitalGainsStrategy(strategy) || 
         isIrmaaManagementStrategy(strategy);
}