/**
 * Strategies Module - Central hub for all strategy types
 * 
 * This module provides a type-safe, discriminated union approach to strategy management.
 * Each strategy type is self-contained with its own configuration and parameters.
 * 
 * Architecture Benefits:
 * - Type Safety: Strategies are discriminated unions with compile-time type checking
 * - Self-Contained: Each strategy carries its own configuration and metadata
 * - Extensible: New strategies can be added without modifying existing code
 * - UI-Friendly: Strategies include display metadata for frontend components
 * - Execution Context: Clear separation between configuration and runtime state
 */

// =============================================================================
// RE-EXPORTS - All strategy types and utilities
// =============================================================================

// Base types and utilities
export * from './base';

// Strategy categories
export * from './investment';
export * from './tax';
export * from './retirement';

// TODO: Add these as modules are created
// export * from './risk-management';
// export * from './healthcare';
// export * from './debt';
// export * from './charitable';
// export * from './equity-compensation';

// =============================================================================
// STRATEGY DISCRIMINATED UNION
// =============================================================================

import { BaseStrategy, StrategyType } from './base';
import { InvestmentStrategies } from './investment';
import { TaxStrategies } from './tax';
import { RetirementStrategies } from './retirement';

/**
 * PlanStrategy: Type-safe discriminated union of all strategies
 * 
 * This is the main contract for strategy management throughout the application.
 * Each strategy type has its own specific interface with required parameters.
 * TypeScript can narrow types based on the 'type' discriminator field.
 * 
 * Benefits:
 * - Type Safety: Compiler prevents accessing wrong fields on wrong strategy types
 * - Better IntelliSense: IDE provides correct autocomplete based on strategy type
 * - Self-Contained Configuration: Each strategy carries its own parameters
 * - Runtime Safety: No more (strategy as any) type assertions needed
 * 
 * Usage:
 * ```typescript
 * function executeStrategy(strategy: PlanStrategy, context: StrategyExecutionContext) {
 *   if (isAssetAllocationStrategy(strategy)) {
 *     // TypeScript knows strategy is AssetAllocationStrategy here
 *     const allocation = strategy.parameters.targetAllocation;
 *     // ... execute allocation logic
 *   }
 * }
 * ```
 */
export type PlanStrategy =
  | InvestmentStrategies
  | TaxStrategies
  | RetirementStrategies;

// TODO: Add these strategy types as modules are created
// | RiskManagementStrategies
// | HealthcareStrategies
// | DebtManagementStrategies
// | CharitableStrategies
// | EquityCompensationStrategies;

// =============================================================================
// STRATEGY UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all strategies of a specific category
 */
export function getStrategiesByCategory<T extends PlanStrategy>(
  strategies: PlanStrategy[],
  category: T['category']
): T[] {
  return strategies.filter(s => s.category === category) as T[];
}

/**
 * Get all active strategies
 */
export function getActiveStrategies(strategies: PlanStrategy[]): PlanStrategy[] {
  return strategies.filter(s => s.ui.status === 'active');
}

/**
 * Find strategy by ID
 */
export function findStrategyById(strategies: PlanStrategy[], id: string): PlanStrategy | undefined {
  return strategies.find(s => s.id === id);
}

/**
 * Check if strategy is enabled/active
 */
export function isStrategyActive(strategy: PlanStrategy): boolean {
  return strategy.ui.status === 'active';
}

/**
 * Get strategy display name with fallback
 */
export function getStrategyDisplayName(strategy: PlanStrategy): string {
  return strategy.name || strategy.type.replace(/_/g, ' ');
}

// =============================================================================
// STRATEGY FACTORY PATTERNS
// =============================================================================

/**
 * Create a base strategy object with common defaults
 */
export function createBaseStrategy(
  type: StrategyType,
  overrides: Partial<BaseStrategy> = {}
): Omit<BaseStrategy, 'parameters'> {
  const now = new Date();
  
  return {
    id: `${type}_${Date.now()}`,
    name: type.replace(/_/g, ' '),
    category: getDefaultCategoryForType(type),
    type,
    ui: {
      status: 'planned',
      icon: getDefaultIconForType(type),
      visible: true,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Get default category for a strategy type
 */
function getDefaultCategoryForType(type: StrategyType): string {
  const categoryMap: Record<StrategyType, string> = {
    [StrategyType.ASSET_ALLOCATION]: 'investment',
    [StrategyType.REBALANCING]: 'investment',
    [StrategyType.ASSET_LOCATION]: 'investment',
    [StrategyType.ROTH_CONVERSION]: 'tax',
    [StrategyType.TAX_LOSS_HARVESTING]: 'tax',
    [StrategyType.STRATEGIC_CAPITAL_GAINS]: 'tax',
    [StrategyType.IRMAA_MANAGEMENT]: 'tax',
    [StrategyType.RETIREMENT_WITHDRAWAL]: 'decumulation',
    [StrategyType.CASH_MANAGEMENT]: 'decumulation',
    [StrategyType.CONCENTRATION_RISK]: 'risk_management',
    [StrategyType.LTC_PLANNING]: 'risk_management',
    [StrategyType.HEALTHCARE_COST_MANAGEMENT]: 'healthcare',
    [StrategyType.DEBT_MANAGEMENT]: 'risk_management',
    [StrategyType.CHARITABLE_GIVING]: 'tax',
    [StrategyType.EQUITY_COMPENSATION]: 'investment',
  };
  
  return categoryMap[type] || 'investment';
}

/**
 * Get default icon for a strategy type
 */
function getDefaultIconForType(type: StrategyType): string {
  const iconMap: Record<StrategyType, string> = {
    [StrategyType.ASSET_ALLOCATION]: '📊',
    [StrategyType.REBALANCING]: '⚖️',
    [StrategyType.ASSET_LOCATION]: '🏦',
    [StrategyType.ROTH_CONVERSION]: '🔄',
    [StrategyType.TAX_LOSS_HARVESTING]: '📉',
    [StrategyType.STRATEGIC_CAPITAL_GAINS]: '📈',
    [StrategyType.IRMAA_MANAGEMENT]: '🏥',
    [StrategyType.RETIREMENT_WITHDRAWAL]: '🎯',
    [StrategyType.CASH_MANAGEMENT]: '💰',
    [StrategyType.CONCENTRATION_RISK]: '⚠️',
    [StrategyType.LTC_PLANNING]: '🛡️',
    [StrategyType.HEALTHCARE_COST_MANAGEMENT]: '⚕️',
    [StrategyType.DEBT_MANAGEMENT]: '💳',
    [StrategyType.CHARITABLE_GIVING]: '❤️',
    [StrategyType.EQUITY_COMPENSATION]: '💼',
  };
  
  return iconMap[type] || '⚙️';
}