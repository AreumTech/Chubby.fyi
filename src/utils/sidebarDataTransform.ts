import { FinancialEvent } from '../types';

interface SidebarGoal {
  id: string;
  name: string;
  icon: string;
  targetYear: number;
  targetAmount?: number;
  goalPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceAccountCategory?: string;
  isFlexible?: boolean;
}

interface SidebarEvent {
  id: string;
  name: string;
  icon: string;
  startYear: number;
  endYear: number;
  description: string;
}

interface SidebarStrategy {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'planned';
  description: string;
}

/**
 * Convert monthOffset to calendar year.
 * Must match the logic in getCalendarYearAndMonthFromMonthOffset to avoid discrepancies.
 */
const getYearFromMonthOffset = (
  baseYear: number,
  baseMonth: number, // 1-indexed
  monthOffset: number
): number => {
  const totalMonths = (baseMonth - 1) + monthOffset;
  return baseYear + Math.floor(totalMonths / 12);
};

const getEventIcon = (eventType?: string): string => {
  const iconMap: Record<string, string> = {
    'GOAL_DEFINE': '🎯',
    'INCOME_STREAM': '💰',
    'EXPENSE_STREAM': '💸',
    'WITHDRAWAL': '🏧',
    'CONTRIBUTION': '📈',
    'ACCOUNT_TRANSFER': '🔄',
    'ONE_TIME_INCOME': '💵',
    'ONE_TIME_EXPENSE': '💳',
    'ASSET_SALE': '🏠',
    'DEBT_PAYOFF': '💳',
    'TAX_EVENT': '📊',
    'INITIAL_STATE': '📋',
    'STRATEGY_POLICY': '📊',
    'STRATEGY_EXECUTION': '⚡'
  };
  return iconMap[eventType || ''] || '📅';
};

const getGoalIcon = (goalType?: string): string => {
  const iconMap: Record<string, string> = {
    'RETIREMENT': '🏖️',
    'HOME_PURCHASE': '🏠',
    'EDUCATION': '🎓',
    'EMERGENCY_FUND': '🛡️',
    'VACATION': '✈️',
    'CAR_PURCHASE': '🚗',
    'INVESTMENT': '📈',
    'DEBT_PAYOFF': '💳'
  };
  return iconMap[goalType || ''] || '🎯';
};

const getCurrentYear = (): number => new Date().getFullYear();
const getCurrentMonth = (): number => new Date().getMonth() + 1; // 1-indexed

export const transformEventLedgerForSidebar = (
  eventLedger: FinancialEvent[],
  startYear?: number,
  startMonth?: number // 1-indexed, defaults to current month
): {
  goals: SidebarGoal[];
  events: SidebarEvent[];
  strategies: SidebarStrategy[];
} => {
  const baseYear = startYear || getCurrentYear();
  const baseMonth = startMonth || getCurrentMonth();

  // Transform goals from GOAL_DEFINE events
  const goals: SidebarGoal[] = eventLedger
    .filter(event => event.type === 'GOAL_DEFINE')
    .map(event => {
      const goalEvent = event as any; // Type assertion for goal-specific properties
      return {
        id: event.id,
        name: event.name || 'Financial Goal',
        icon: getGoalIcon(goalEvent.goalType),
        targetYear: getYearFromMonthOffset(baseYear, baseMonth, goalEvent.targetDateOffset || 0),
        targetAmount: goalEvent.targetAmount,
        goalPriority: goalEvent.goalPriority,
        sourceAccountCategory: goalEvent.sourceAccountCategory,
        isFlexible: goalEvent.isFlexible
      };
    });

  // Transform other events (excluding GOAL_DEFINE and hidden strategy events)
  const events: SidebarEvent[] = eventLedger
    .filter(event =>
      event.type !== 'GOAL_DEFINE' &&
      !(event.metadata as any)?.hiddenFromTimeline
    )
    .map(event => {
      // Use startDateOffset for recurring events, fall back to monthOffset for one-time events
      const startOffset = (event as any).startDateOffset ?? event.monthOffset ?? 0;
      const eventStartYear = getYearFromMonthOffset(baseYear, baseMonth, startOffset);
      const endDateOffset = (event as any).endDateOffset;
      const eventEndYear = endDateOffset
        ? getYearFromMonthOffset(baseYear, baseMonth, endDateOffset)
        : eventStartYear;
      
      return {
        id: event.id,
        name: event.name || (event.type ? event.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : 'Financial Event'),
        icon: getEventIcon(event.type),
        startYear: eventStartYear,
        endYear: eventEndYear,
        description: event.description || `${event.type ? event.type.replace(/_/g, ' ').toLowerCase() : 'financial'} event`
      };
    });

  // Create basic strategies (these would typically come from config, but we'll provide defaults)
  const strategies: SidebarStrategy[] = [
    {
      id: 'asset-allocation',
      name: 'Asset Allocation Strategy',
      icon: '📊',
      status: 'active',
      description: 'Diversified investment allocation'
    },
    {
      id: 'tax-optimization',
      name: 'Tax Optimization',
      icon: '💰',
      status: 'planned',
      description: 'Tax-efficient strategies'
    }
  ];

  return {
    goals,
    events,
    strategies
  };
};