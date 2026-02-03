/**
 * Event and Goal Icon and Color Mapping
 * 
 * Maps event types and goal types to icons and colors for consistent UI display
 */

import { EventType } from '@/types';

/**
 * Get emoji icon for a specific event type
 */
export function getEventIcon(eventType: EventType): string {
  const iconMap: Record<EventType, string> = {
    // Core financial events
    [EventType.INCOME]: '💼',
    [EventType.SCHEDULED_CONTRIBUTION]: '📈',
    [EventType.RECURRING_EXPENSE]: '🛒',
    [EventType.ONE_TIME_EVENT]: '⚡',
    
    // Debt management
    [EventType.LIABILITY_ADD]: '💳',
    [EventType.LIABILITY_PAYMENT]: '💸',
    [EventType.DEBT_PAYMENT]: '💸',
    
    // Real Estate
    [EventType.REAL_ESTATE_PURCHASE]: '🏠',
    [EventType.REAL_ESTATE_SALE]: '🏡',
    
    // Retirement events
    [EventType.SOCIAL_SECURITY_INCOME]: '🏛️',
    [EventType.PENSION_INCOME]: '🏢',
    [EventType.ANNUITY_PAYMENT]: '🧾',
    [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: '📊',
    
    // Tax strategies
    [EventType.ROTH_CONVERSION]: '🔄',
    [EventType.QUALIFIED_CHARITABLE_DISTRIBUTION]: '🎁',
    
    // Healthcare
    [EventType.HEALTHCARE_COST]: '🏥',
    
    // Investment strategies
    [EventType.STRATEGY_ASSET_ALLOCATION_SET]: '🎯',
    [EventType.STRATEGY_REBALANCING_RULE_SET]: '⚖️',
    [EventType.REBALANCE_PORTFOLIO]: '⚖️',
    [EventType.TAX_LOSS_HARVESTING_SALE]: '🗃️',
    [EventType.TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE]: '🗃️',
    [EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION]: '💹',
    
    // Strategic trades
    [EventType.STRATEGIC_TRADE]: '📊',
    [EventType.ADJUST_CASH_RESERVE_SELL_ASSETS]: '💰',
    [EventType.ADJUST_CASH_RESERVE_BUY_ASSETS]: '💰',
    
    // Equity compensation
    [EventType.RSU_VESTING]: '📈',
    [EventType.RSU_SALE]: '📊',
    
    // Risk management
    [EventType.CONCENTRATION_RISK_ALERT]: '⚠️',
    
    // Planning
    [EventType.GOAL_DEFINE]: '🎯',
    [EventType.FINANCIAL_MILESTONE]: '🏆',
    [EventType.INITIAL_STATE]: '🏁',
  };

  return iconMap[eventType] || '📅';
}

/**
 * Rotating color palette for events - bright, distinguishable colors
 */
const EVENT_COLORS = [
  '#EF4444', // red-500
  '#F59E0B', // amber-500
  '#10B981', // green-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#A855F7', // purple-500
  '#14B8A6', // teal-500
  '#F472B6', // pink-400
  '#FB7185', // rose-400
  '#FBBF24', // amber-400
  '#34D399', // emerald-400
  '#60A5FA', // blue-400
  '#A78BFA', // violet-400
  '#F87171', // red-400
  '#FCD34D', // amber-300
];

/**
 * Get color for event by rotating through color palette based on event ID
 */
export function getEventColor(eventId: string): string {
  // Create a simple hash from the event ID to ensure consistent color assignment
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const colorIndex = Math.abs(hash) % EVENT_COLORS.length;
  return EVENT_COLORS[colorIndex];
}

/**
 * Get color by event type (deprecated - use getEventColor with ID instead)
 */
export function getEventColorByType(eventType: EventType): string {
  const colorMap: Record<EventType, string> = {
    // Core financial events
    [EventType.INCOME]: '#10B981', // green-500
    [EventType.SCHEDULED_CONTRIBUTION]: '#3B82F6', // blue-500
    [EventType.RECURRING_EXPENSE]: '#EF4444', // red-500
    [EventType.ONE_TIME_EVENT]: '#F59E0B', // amber-500
    
    // Debt management
    [EventType.LIABILITY_ADD]: '#DC2626', // red-600
    [EventType.LIABILITY_PAYMENT]: '#F87171', // red-400
    [EventType.DEBT_PAYMENT]: '#F87171', // red-400
    
    // Real Estate
    [EventType.REAL_ESTATE_PURCHASE]: '#10B981', // green-500
    [EventType.REAL_ESTATE_SALE]: '#F59E0B', // amber-500
    
    // Retirement events
    [EventType.SOCIAL_SECURITY_INCOME]: '#6366F1', // indigo-500
    [EventType.PENSION_INCOME]: '#8B5CF6', // violet-500
    [EventType.ANNUITY_PAYMENT]: '#A855F7', // purple-500
    [EventType.REQUIRED_MINIMUM_DISTRIBUTION]: '#EC4899', // pink-500
    
    // Tax strategies
    [EventType.ROTH_CONVERSION]: '#06B6D4', // cyan-500
    [EventType.QUALIFIED_CHARITABLE_DISTRIBUTION]: '#84CC16', // lime-500
    
    // Healthcare
    [EventType.HEALTHCARE_COST]: '#F97316', // orange-500
    
    // Investment strategies
    [EventType.STRATEGY_ASSET_ALLOCATION_SET]: '#8B5CF6', // violet-500
    [EventType.STRATEGY_REBALANCING_RULE_SET]: '#06B6D4', // cyan-500
    [EventType.REBALANCE_PORTFOLIO]: '#06B6D4', // cyan-500
    [EventType.TAX_LOSS_HARVESTING_SALE]: '#10B981', // green-500
    [EventType.TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE]: '#10B981', // green-500
    [EventType.STRATEGIC_CAPITAL_GAINS_REALIZATION]: '#3B82F6', // blue-500
    
    // Strategic trades
    [EventType.STRATEGIC_TRADE]: '#6366F1', // indigo-500
    [EventType.ADJUST_CASH_RESERVE_SELL_ASSETS]: '#F59E0B', // amber-500
    [EventType.ADJUST_CASH_RESERVE_BUY_ASSETS]: '#10B981', // green-500
    
    // Equity compensation
    [EventType.RSU_VESTING]: '#8B5CF6', // violet-500
    [EventType.RSU_SALE]: '#6366F1', // indigo-500
    
    // Risk management
    [EventType.CONCENTRATION_RISK_ALERT]: '#EF4444', // red-500
    
    // Planning
    [EventType.GOAL_DEFINE]: '#3B82F6', // blue-500
    [EventType.FINANCIAL_MILESTONE]: '#F59E0B', // amber-500
    [EventType.INITIAL_STATE]: '#6B7280', // gray-500
  };

  return colorMap[eventType] || '#6B7280'; // default gray-500
}

/**
 * Get emoji icon for goals based on goal name/type
 */
export function getGoalIcon(goalName: string): string {
  const name = goalName.toLowerCase();
  
  // Primary patterns
  if (name.includes('independence') || name.includes('fire') || name.includes('retire')) {
    return '🔥';
  }
  if (name.includes('education') || name.includes('college') || name.includes('school')) {
    return '🎓';
  }
  if (name.includes('home') || name.includes('house') || name.includes('property')) {
    return '🏡';
  }
  if (name.includes('travel') || name.includes('vacation') || name.includes('trip')) {
    return '✈️';
  }
  if (name.includes('wedding') || name.includes('marriage')) {
    return '💒';
  }
  if (name.includes('emergency') || name.includes('fund')) {
    return '🛡️';
  }
  if (name.includes('car') || name.includes('vehicle') || name.includes('auto')) {
    return '🚗';
  }
  if (name.includes('business') || name.includes('startup') || name.includes('entrepreneur')) {
    return '🚀';
  }
  if (name.includes('debt') || name.includes('loan') || name.includes('payoff')) {
    return '💸';
  }
  if (name.includes('child') || name.includes('baby') || name.includes('family')) {
    return '👶';
  }
  
  // Default goal icon
  return '🎯';
}

/**
 * Get color for goals based on goal name/type
 */
export function getGoalColor(goalName: string): string {
  const name = goalName.toLowerCase();
  
  // Primary patterns
  if (name.includes('independence') || name.includes('fire') || name.includes('retire')) {
    return '#EF4444'; // red-500 (fire)
  }
  if (name.includes('education') || name.includes('college') || name.includes('school')) {
    return '#3B82F6'; // blue-500
  }
  if (name.includes('home') || name.includes('house') || name.includes('property')) {
    return '#10B981'; // green-500
  }
  if (name.includes('travel') || name.includes('vacation') || name.includes('trip')) {
    return '#06B6D4'; // cyan-500
  }
  if (name.includes('wedding') || name.includes('marriage')) {
    return '#EC4899'; // pink-500
  }
  if (name.includes('emergency') || name.includes('fund')) {
    return '#F59E0B'; // amber-500
  }
  if (name.includes('car') || name.includes('vehicle') || name.includes('auto')) {
    return '#6366F1'; // indigo-500
  }
  if (name.includes('business') || name.includes('startup') || name.includes('entrepreneur')) {
    return '#8B5CF6'; // violet-500
  }
  if (name.includes('debt') || name.includes('loan') || name.includes('payoff')) {
    return '#DC2626'; // red-600
  }
  if (name.includes('child') || name.includes('baby') || name.includes('family')) {
    return '#84CC16'; // lime-500
  }
  
  // Default goal color
  return '#6B7280'; // gray-500
}

/**
 * Get emoji icon for strategy types
 */
export function getStrategyIcon(strategyName: string): string {
  const name = strategyName.toLowerCase();
  
  if (name.includes('investment') || name.includes('allocation')) {
    return '📈';
  }
  if (name.includes('tax') || name.includes('optimization')) {
    return '🏛️';
  }
  if (name.includes('decumulation') || name.includes('withdrawal')) {
    return '🎭';
  }
  if (name.includes('healthcare') || name.includes('medical')) {
    return '🩺';
  }
  if (name.includes('real estate') || name.includes('property')) {
    return '🏠';
  }
  if (name.includes('risk') || name.includes('insurance')) {
    return '🛡️';
  }
  
  // Default strategy icon
  return '⚙️';
}