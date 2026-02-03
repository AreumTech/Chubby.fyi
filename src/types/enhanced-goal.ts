/**
 * Enhanced Goal System - Account-Specific Goals
 *
 * This new goal system aligns with how users actually think about financial goals:
 * - "Save $X in Y account"
 * - "Save $X in Y account by Z date"
 * - Track specific account balances and progress
 */

import type { StandardAccountType } from './accountTypes';

// Re-export for backwards compatibility
export type { StandardAccountType };

/**
 * Goal Mode - Different ways to define a financial goal
 *
 * MODE 1: SOLVE FOR TIME - "$X in account (when will I reach it?)"
 * - Set targetAmount, leave targetDate undefined
 * - Simulation calculates achievement timing distribution
 * - Shows: P10-P90 of months/years when target is achieved
 *
 * MODE 2: SOLVE FOR PROBABILITY - "$X in account by date Y (will I make it?)"
 * - Set both targetAmount and targetDate
 * - Simulation calculates probability of achieving target by date
 * - Shows: Probability gauge + amount distribution at target date
 *
 * MODE 3: SOLVE FOR AMOUNT - "By date Y (how much will I have?)"
 * - Set targetDate, targetAmount optional (or used as reference marker)
 * - Simulation calculates amount distribution at target date
 * - Shows: P10-P90 of account balance at target date
 */
export type GoalMode = 'SOLVE_FOR_TIME' | 'SOLVE_FOR_PROBABILITY' | 'SOLVE_FOR_AMOUNT';

export function getGoalMode(goal: { targetAmount?: number; targetDate?: Date }): GoalMode {
  if (goal.targetAmount && !goal.targetDate) {
    return 'SOLVE_FOR_TIME';
  } else if (goal.targetAmount && goal.targetDate) {
    return 'SOLVE_FOR_PROBABILITY';
  } else if (goal.targetDate && !goal.targetAmount) {
    return 'SOLVE_FOR_AMOUNT';
  }
  // Default to probability mode
  return 'SOLVE_FOR_PROBABILITY';
}

export interface EnhancedGoal {
  id: string;
  name: string;
  description?: string;
  
  // Core goal definition - what the user wants
  // SIMULATION MODES:
  // 1) "$X in Y account (simulate WHEN)" - set targetAmount only, leave targetDate undefined
  // 2) "$X in Y account by Z date (simulate IF)" - set both targetAmount and targetDate
  targetAmount: number;
  targetDate?: Date; // Optional - when undefined, calculates "when will I reach target?"
  goalMode?: GoalMode; // User's explicit mode selection (SOLVE_FOR_TIME, SOLVE_FOR_PROBABILITY, SOLVE_FOR_AMOUNT)
  
  // Account specificity - where the money should be
  targetAccount: {
    type: StandardAccountType; // 'cash', 'taxable', 'tax_deferred', 'roth', etc.
    name?: string; // Optional custom name like "House Fund" or "Emergency Fund"
  };

  /** @deprecated Use targetAccount.type instead - maintained for backwards compatibility */
  accountType?: StandardAccountType;

  /** @deprecated Use targetAccount.name instead - maintained for backwards compatibility */
  accountName?: string;
  
  // Goal type and priority - focused on core financial goals
  // CUSTOM covers: home renovation, car purchase, business startup, debt payoff, healthcare, etc.
  category: 'RETIREMENT' | 'EMERGENCY_FUND' | 'HOUSE_DOWN_PAYMENT' | 'EDUCATION' | 'VACATION' | 'CUSTOM';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Tracking and progress
  currentAmount?: number; // Current balance in target account
  progressPercentage?: number; // Auto-calculated
  monthlyContributionNeeded?: number; // Auto-calculated
  
  // Advanced options (optional)
  fundingStrategy?: {
    automaticContributions?: boolean;
    contributionAmount?: number;
    contributionFrequency?: 'monthly' | 'annually';
    sourceAccount?: StandardAccountType; // Where contributions come from
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;

  /** Additional goal-specific metadata */
  metadata?: Record<string, any>;
}

// Goal templates that match common user scenarios
export interface GoalTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: EnhancedGoal['category'];
  suggestedAccount: StandardAccountType;
  suggestedAmount: number;
  suggestedTimeframe: number; // months
  tips: string[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'house-down-payment',
    name: 'House Down Payment',
    icon: '🏠',
    description: 'Save for a home down payment and closing costs',
    category: 'HOUSE_DOWN_PAYMENT',
    suggestedAccount: 'taxable',
    suggestedAmount: 80000,
    suggestedTimeframe: 60,
    tips: [
      'Consider conservative investments for 3+ year timeline',
      'Include closing costs (2-5% of home price)',
      'Research first-time buyer programs'
    ]
  },
  {
    id: 'retirement',
    name: 'Retirement',
    icon: '🔥',
    description: 'Build retirement savings for financial independence (FIRE)',
    category: 'RETIREMENT',
    suggestedAccount: 'tax_deferred',
    suggestedAmount: 1000000,
    suggestedTimeframe: 120,
    tips: [
      'Consider Roth vs Traditional based on tax situation',
      'Maximize employer matching first',
      'Take advantage of catch-up contributions if 50+'
    ]
  },
  {
    id: 'vacation-fund',
    name: 'Dream Vacation',
    icon: '✈️',
    description: 'Save for that special trip or experience',
    category: 'VACATION',
    suggestedAccount: 'cash',
    suggestedAmount: 10000,
    suggestedTimeframe: 24,
    tips: [
      'Book in advance for better deals',
      'Consider travel rewards credit cards',
      'Set aside money monthly to avoid debt'
    ]
  },
  {
    id: 'education-fund',
    name: 'Education Fund',
    icon: '🎓',
    description: 'Save for college or continuing education',
    category: 'EDUCATION',
    suggestedAccount: '529',
    suggestedAmount: 50000,
    suggestedTimeframe: 180,
    tips: [
      '529 plans offer tax advantages',
      'Start early to benefit from compound growth',
      'Research state tax deductions'
    ]
  }
];

// Cache for goal progress calculations to avoid redundant computation
const progressCache = new Map<string, number>();

// Helper functions for goal calculations
export function calculateGoalProgress(goal: EnhancedGoal): number {
  if (!goal.currentAmount || goal.targetAmount === 0) return 0;
  
  // Create cache key based on goal properties that affect progress
  const cacheKey = `${goal.id}_${goal.currentAmount}_${goal.targetAmount}`;
  
  if (progressCache.has(cacheKey)) {
    return progressCache.get(cacheKey)!;
  }
  
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  
  // Cache the result
  progressCache.set(cacheKey, progress);
  
  // Limit cache size to prevent memory leaks
  if (progressCache.size > 1000) {
    const firstKey = progressCache.keys().next().value;
    progressCache.delete(firstKey);
  }
  
  return progress;
}

export function calculateMonthlyContributionNeeded(
  targetAmount: number,
  currentAmount: number,
  monthsRemaining: number,
  assumedReturn: number = 0.07
): number {
  if (monthsRemaining <= 0) return targetAmount - currentAmount;
  
  const futureValueOfCurrent = currentAmount * Math.pow(1 + assumedReturn / 12, monthsRemaining);
  const remainingNeeded = targetAmount - futureValueOfCurrent;
  
  if (remainingNeeded <= 0) return 0;
  
  const monthlyRate = assumedReturn / 12;
  return remainingNeeded / (((Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate) || monthsRemaining);
}

export function getAccountFriendlyName(accountType: StandardAccountType): string {
  switch (accountType) {
    case 'cash': return 'Savings Account';
    case 'taxable': return 'Investment Account';
    case 'tax_deferred': return '401(k)/IRA';
    case 'roth': return 'Roth IRA';
    case '529': return '529 Education Account';
    case 'hsa': return 'HSA';
    default: return accountType;
  }
}