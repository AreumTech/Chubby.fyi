/**
 * Strategy Migration Utility
 *
 * Converts legacy ActiveStrategyMetadata to StrategyPolicyEvent.
 * This enables the "Everything is an Event" architecture where strategies
 * are first-class events with duration semantics.
 */

import { EventPriority, EventType } from '@/types/events/base';
import {
  StrategyPolicyEvent,
  StrategyPhase,
  determineStrategyPhase,
  getStrategyPhaseColor,
} from '@/types/events/strategy-events';
import type { ActiveStrategyMetadata } from '@/store/slices/planSlice';

/**
 * Generate a unique ID for strategy events
 */
const generateId = (): string => {
  return `strategy-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
};

/**
 * Convert a single ActiveStrategyMetadata to a StrategyPolicyEvent
 *
 * @param strategy - The legacy strategy metadata
 * @param startYear - The simulation start year (for calculating month offsets)
 * @returns A StrategyPolicyEvent that represents the strategy
 */
export function convertStrategyToEvent(
  strategy: ActiveStrategyMetadata,
  startYear: number
): StrategyPolicyEvent {
  // Determine the phase based on strategy type
  const phase = determineStrategyPhase(strategy.strategyId, strategy.configuration);

  // Calculate month offset from when strategy was applied
  const appliedDate = new Date(strategy.appliedAt);
  const appliedYear = appliedDate.getFullYear();
  const appliedMonth = appliedDate.getMonth();
  const startDateOffset = (appliedYear - startYear) * 12 + appliedMonth;

  // Most strategies are ongoing (no end date)
  // Specific strategies like Roth conversion ladder might have end dates from config
  const endDateOffset = extractEndDateOffset(strategy, startYear);

  const event: StrategyPolicyEvent = {
    id: generateId(),
    type: EventType.STRATEGY_POLICY,
    name: strategy.strategyName,
    description: strategy.policy.summary,
    monthOffset: Math.max(0, startDateOffset), // Ensure non-negative
    priority: EventPriority.STRATEGY_POLICY,

    // Strategy-specific fields
    strategyId: strategy.strategyId,
    strategyType: inferStrategyType(strategy.strategyId),
    phase,
    startDateOffset: Math.max(0, startDateOffset),
    endDateOffset,
    configuration: strategy.configuration,
    policySummary: strategy.policy.summary,
    visualizationColor: getStrategyPhaseColor(phase),
    generatedEventIds: strategy.eventIds,
  };

  return event;
}

/**
 * Migrate all ActiveStrategyMetadata to StrategyPolicyEvents
 *
 * @param activeStrategies - Array of legacy strategy metadata
 * @param startYear - The simulation start year
 * @returns Array of StrategyPolicyEvents
 */
export function migrateActiveStrategiesToEvents(
  activeStrategies: ActiveStrategyMetadata[],
  startYear: number
): StrategyPolicyEvent[] {
  if (!activeStrategies || activeStrategies.length === 0) {
    return [];
  }

  return activeStrategies.map((strategy) =>
    convertStrategyToEvent(strategy, startYear)
  );
}

/**
 * Infer the strategy type category from the strategy ID
 */
function inferStrategyType(strategyId: string): string {
  const typeMap: Record<string, string> = {
    'investment-optimization': 'INVESTMENT',
    'asset-allocation': 'INVESTMENT',
    'retirement-withdrawal': 'RETIREMENT',
    'roth-conversion': 'TAX_OPTIMIZATION',
    'tax-loss-harvesting': 'TAX_OPTIMIZATION',
    'tax-withholding': 'TAX_OPTIMIZATION',
    'contribution-optimization': 'INVESTMENT',
    'social-security-optimization': 'RETIREMENT',
    'debt-payoff-strategy': 'DEBT_MANAGEMENT',
    'college-planning': 'EDUCATION',
    'home-purchase': 'REAL_ESTATE',
    'wealth-transfer': 'ESTATE',
  };

  return typeMap[strategyId] || 'GENERAL';
}

/**
 * Extract end date offset from strategy configuration if applicable
 * Most strategies are ongoing, but some (like Roth conversion ladder) have defined periods
 */
function extractEndDateOffset(
  strategy: ActiveStrategyMetadata,
  startYear: number
): number | undefined {
  const config = strategy.configuration;

  // Check for explicit end date in configuration
  if (config.endDate) {
    const endDate = new Date(config.endDate);
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    return (endYear - startYear) * 12 + endMonth;
  }

  // Roth conversion ladder typically runs for a fixed number of years
  if (strategy.strategyId === 'roth-conversion' && config.conversionYears) {
    const appliedDate = new Date(strategy.appliedAt);
    const endYear = appliedDate.getFullYear() + config.conversionYears;
    return (endYear - startYear) * 12;
  }

  // Most strategies are ongoing
  return undefined;
}

/**
 * Check if a scenario needs migration (has activeStrategies but they haven't been converted)
 */
export function needsStrategyMigration(
  activeStrategies: ActiveStrategyMetadata[] | undefined,
  eventLedger: any[]
): boolean {
  // No strategies to migrate
  if (!activeStrategies || activeStrategies.length === 0) {
    return false;
  }

  // Check if any strategy events already exist in ledger
  const hasStrategyEvents = eventLedger.some(
    (event) => event.type === EventType.STRATEGY_POLICY
  );

  // If there are active strategies but no strategy events, migration is needed
  return !hasStrategyEvents;
}

/**
 * Get a human-readable migration summary
 */
export function getMigrationSummary(
  activeStrategies: ActiveStrategyMetadata[]
): string {
  if (!activeStrategies || activeStrategies.length === 0) {
    return 'No strategies to migrate';
  }

  const names = activeStrategies.map((s) => s.strategyName).join(', ');
  return `Migrating ${activeStrategies.length} strateg${activeStrategies.length === 1 ? 'y' : 'ies'}: ${names}`;
}
