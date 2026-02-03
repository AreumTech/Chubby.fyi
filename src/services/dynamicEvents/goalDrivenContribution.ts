/**
 * Goal-Driven Contribution Dynamic Event Implementation
 * 
 * Implements smart contribution adjustments based on goal progress: "Adjust retirement savings based on 401k goal progress"
 * This provides automatic savings rate optimization to keep goals on track.
 */

import { GoalDrivenContributionEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculateGoalDrivenContribution, validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Goal tracking interface for progress calculations
 */
interface GoalProgress {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  monthsRemaining: number;
  progressPercentage: number;
  isOnTrack: boolean;
  recommendedMonthlyContribution: number;
}

/**
 * Goal-Driven Contribution Event Processor
 */
export class GoalDrivenContributionProcessor {
  static async evaluate(
    event: GoalDrivenContributionEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid goal-driven contribution event: ${validation.errorMessage}`);
    }

    if (!this.checkConditions(event, context)) {
      return [];
    }

    // Get goal progress information
    const goalProgress = this.getGoalProgress(event.targetGoalId, context);
    if (!goalProgress) {
      return []; // Goal not found or completed
    }

    const contributionResult = calculateGoalDrivenContribution(event, context);
    if (contributionResult.contributionAmount <= 0) {
      return [];
    }

    try {
      validateAmount(contributionResult.contributionAmount, { 
        min: 0, 
        max: 500000,
        name: 'Goal-driven contribution amount' 
      });
    } catch (error) {
      logger.error('Invalid contribution amount calculated:', 'DATA', error);
      return [];
    }

    const finalAmount = this.applyLimits(contributionResult.contributionAmount, event.limits);

    const action: EventAction = {
      type: 'CONTRIBUTION',
      amount: finalAmount,
      sourceAccount: 'cash',
      targetAccount: event.targetAccountType,
      description: this.generateActionDescription(event, finalAmount, goalProgress),
      priority: event.priority,
      metadata: {
        goalId: event.targetGoalId,
        goalProgress: goalProgress.progressPercentage,
        isOnTrack: goalProgress.isOnTrack,
        adjustmentReason: contributionResult.reasoning,
        recommendedAmount: contributionResult.contributionAmount,
        adjustedAmount: finalAmount
      }
    };

    return [action];
  }

  static validateEvent(event: GoalDrivenContributionEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  static checkConditions(event: GoalDrivenContributionEvent, context: SimulationContext): boolean {
    // Check minimum cash requirements
    if (event.adjustmentStrategy.minContribution && context.cashBalance < event.adjustmentStrategy.minContribution) {
      return false;
    }

    if (event.conditions) {
      return this.evaluateConditionSet(event.conditions, context);
    }

    return true;
  }

  private static evaluateConditionSet(conditions: any, context: SimulationContext): boolean {
    if (conditions.cashBalance) {
      if (conditions.cashBalance.min && context.cashBalance < conditions.cashBalance.min) {
        return false;
      }
      if (conditions.cashBalance.max && context.cashBalance > conditions.cashBalance.max) {
        return false;
      }
    }

    if (conditions.income) {
      if (conditions.income.minMonthly && context.monthlyIncome < conditions.income.minMonthly) {
        return false;
      }
      if (conditions.income.maxMonthly && context.monthlyIncome > conditions.income.maxMonthly) {
        return false;
      }
    }

    if (conditions.goalProgress) {
      // Would check actual goal progress here in real implementation
      if (conditions.goalProgress.minProgress && context.monthlyIncome <= 0) {
        return false;
      }
    }

    return true;
  }

  private static getGoalProgress(goalId: string, context: SimulationContext): GoalProgress | null {
    // Mock goal progress - in real implementation this would come from context.goals
    const mockGoalProgress: GoalProgress = {
      goalId: goalId,
      goalName: 'Retirement Goal',
      targetAmount: 1000000,
      currentAmount: 150000,
      targetDate: new Date('2055-12-31'),
      monthsRemaining: 360, // 30 years
      progressPercentage: 0.15, // 15% complete
      isOnTrack: false, // Behind schedule
      recommendedMonthlyContribution: 2800 // Need to increase contributions
    };

    // Check if goal is completed
    if (mockGoalProgress.currentAmount >= mockGoalProgress.targetAmount) {
      return null; // Goal completed
    }

    return mockGoalProgress;
  }

  private static applyLimits(
    amount: number,
    limits?: GoalDrivenContributionEvent['limits']
  ): number {
    if (!limits) {
      return amount;
    }

    let limitedAmount = amount;

    if (limits.minContribution && limitedAmount < limits.minContribution) {
      limitedAmount = limits.minContribution;
    }

    if (limits.maxContribution && limitedAmount > limits.maxContribution) {
      limitedAmount = limits.maxContribution;
    }

    if (limits.maxAdjustmentPercentage) {
      // Limit based on percentage change from base amount
      const baseAmount = limits.baseAmount || amount;
      const maxIncrease = baseAmount * limits.maxAdjustmentPercentage;
      if (limitedAmount > baseAmount + maxIncrease) {
        limitedAmount = baseAmount + maxIncrease;
      }
    }

    return limitedAmount;
  }

  private static generateActionDescription(
    event: GoalDrivenContributionEvent,
    finalAmount: number,
    goalProgress: GoalProgress
  ): string {
    const status = goalProgress.isOnTrack ? 'on track' : 'behind schedule';
    const adjustment = finalAmount > (event.adjustmentStrategy.baseContribution || 0) ? 'increased' : 'maintained';
    
    return `Goal-driven contribution: ${formatCurrency(finalAmount)} to ${event.targetAccountType} `
      + `(${goalProgress.goalName} is ${status}, contribution ${adjustment})`;
  }

  private static getAdjustmentReason(
    goalProgress: GoalProgress,
    event: GoalDrivenContributionEvent
  ): string {
    if (!goalProgress.isOnTrack) {
      return `Behind schedule: ${formatPercentage(goalProgress.progressPercentage)} complete with ${goalProgress.monthsRemaining} months remaining`;
    }

    if (goalProgress.progressPercentage > 0.8) {
      return 'Goal approaching completion, maintaining steady contributions';
    }

    return 'Goal on track, continuing planned contributions';
  }

  static createTemplate(overrides: Partial<GoalDrivenContributionEvent> = {}): GoalDrivenContributionEvent {
    return {
      id: `goal-driven-contribution-${Date.now()}`,
      type: EventType.GOAL_DRIVEN_CONTRIBUTION,
      name: 'Smart Goal Tracking',
      description: 'Automatically adjust contributions based on goal progress',
      priority: 50 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      targetGoalId: 'retirement-goal-1',
      targetAccountType: 'tax_deferred',
      adjustmentStrategy: {
        type: 'PROGRESS_BASED',
        baseContribution: 2000,
        minContribution: 1000,
        maxContribution: 5000,
        aggressiveness: 'MODERATE'
      },
      limits: {
        minContribution: 500,
        maxContribution: 10000,
        maxAdjustmentPercentage: 0.50, // Max 50% increase
        baseAmount: 2000
      },
      progressThresholds: [
        {
          progressPercentage: 0.20,
          action: 'INCREASE_CONTRIBUTION',
          adjustmentPercentage: 0.25 // 25% increase if less than 20% complete
        },
        {
          progressPercentage: 0.50,
          action: 'MAINTAIN_CONTRIBUTION',
          adjustmentPercentage: 0.00 // Maintain if 20-50% complete
        },
        {
          progressPercentage: 0.80,
          action: 'OPTIMIZE_CONTRIBUTION',
          adjustmentPercentage: -0.10 // Slight decrease if 50-80% complete
        }
      ],
      ...overrides
    };
  }

  static validateUserInput(input: Partial<GoalDrivenContributionEvent>): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (!input.targetGoalId || input.targetGoalId.trim().length === 0) {
      errors.push('Target goal is required');
    }

    if (!input.targetAccountType) {
      errors.push('Target account type is required');
    }

    if (!input.adjustmentStrategy?.type) {
      errors.push('Adjustment strategy type is required');
    }

    if (input.adjustmentStrategy?.baseContribution && 
        (typeof input.adjustmentStrategy.baseContribution !== 'number' || input.adjustmentStrategy.baseContribution <= 0)) {
      errors.push('Base contribution must be a positive number');
    }

    if (input.adjustmentStrategy?.maxContribution && 
        input.adjustmentStrategy?.minContribution &&
        input.adjustmentStrategy.maxContribution <= input.adjustmentStrategy.minContribution) {
      errors.push('Maximum contribution must be greater than minimum contribution');
    }

    if (input.limits?.maxAdjustmentPercentage && 
        (input.limits.maxAdjustmentPercentage < 0 || input.limits.maxAdjustmentPercentage > 2)) {
      errors.push('Maximum adjustment percentage must be between 0 and 200%');
    }

    if (input.adjustmentStrategy?.baseContribution && 
        typeof input.adjustmentStrategy.baseContribution === 'number' && 
        input.adjustmentStrategy.baseContribution > 50000) {
      errors.push('Base contribution amount seems unusually high (max $50,000)');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errorMessage: errors.join('; '),
        errors: errors.map(msg => ({ message: msg } as any))
      };
    }

    return { isValid: true };
  }

  static explainBehavior(event: GoalDrivenContributionEvent): string {
    let explanation = `This event automatically adjusts your contributions to keep your "${event.targetGoalId}" goal on track.`;

    explanation += `\n\nBase contribution: ${formatCurrency(event.adjustmentStrategy.baseContribution || 0)} per month to your ${event.targetAccountType.replace('_', ' ')} account.`;

    explanation += '\n\nThe system monitors goal progress and:';
    
    if (event.progressThresholds) {
      event.progressThresholds.forEach(threshold => {
        const adjustment = threshold.adjustmentPercentage >= 0 ? 
          `increases by ${formatPercentage(threshold.adjustmentPercentage)}` : 
          `reduces by ${formatPercentage(Math.abs(threshold.adjustmentPercentage))}`;
        
        explanation += `\n• ${threshold.action.replace('_', ' ').toLowerCase()}: ${adjustment} when ${formatPercentage(threshold.progressPercentage)} complete`;
      });
    }

    explanation += `\n\nContribution limits: ${formatCurrency(event.limits?.minContribution || 0)} to ${formatCurrency(event.limits?.maxContribution || 10000)} per month.`;

    explanation += '\n\nThis ensures you stay on track while avoiding over or under-contribution.';

    return explanation;
  }

  static getStrategyExplanation(strategy: GoalDrivenContributionEvent['adjustmentStrategy']['type']): string {
    switch (strategy) {
      case 'PROGRESS_BASED':
        return 'Adjusts contributions based on how much progress has been made toward the goal relative to time remaining.';
      case 'TIME_BASED':
        return 'Adjusts contributions based on the time remaining until the goal deadline.';
      case 'DEFICIT_BASED':
        return 'Calculates the exact monthly amount needed to reach the goal and adjusts accordingly.';
      case 'MARKET_RESPONSIVE':
        return 'Adjusts contributions based on market performance and goal progress combined.';
      default:
        return '';
    }
  }
}

export function createGoalDrivenContribution(
  config: {
    name: string;
    targetGoalId: string;
    targetAccountType: StandardAccountType;
    baseContribution: number;
    adjustmentStrategy: {
      type: 'PROGRESS_BASED' | 'TIME_BASED' | 'DEFICIT_BASED' | 'MARKET_RESPONSIVE';
      aggressiveness: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
      minContribution?: number;
      maxContribution?: number;
    };
    limits?: {
      minContribution?: number;
      maxContribution?: number;
      maxAdjustmentPercentage?: number;
    };
  }
): GoalDrivenContributionEvent {
  return GoalDrivenContributionProcessor.createTemplate({
    name: config.name,
    description: `Goal-driven contribution: adjust ${config.targetAccountType} based on ${config.targetGoalId} progress`,
    targetGoalId: config.targetGoalId,
    targetAccountType: config.targetAccountType,
    adjustmentStrategy: {
      type: config.adjustmentStrategy.type,
      baseContribution: config.baseContribution,
      minContribution: config.adjustmentStrategy.minContribution || config.baseContribution * 0.5,
      maxContribution: config.adjustmentStrategy.maxContribution || config.baseContribution * 2,
      aggressiveness: config.adjustmentStrategy.aggressiveness
    },
    limits: config.limits
  });
}

export const GoalDrivenContributionTemplates = {
  retirementGoal: (baseAmount: number, goalId: string = 'retirement'): GoalDrivenContributionEvent => 
    createGoalDrivenContribution({
      name: 'Retirement Goal Tracking',
      targetGoalId: goalId,
      targetAccountType: 'tax_deferred',
      baseContribution: baseAmount,
      adjustmentStrategy: {
        type: 'PROGRESS_BASED',
        aggressiveness: 'MODERATE',
        minContribution: baseAmount * 0.5,
        maxContribution: baseAmount * 2
      },
      limits: {
        minContribution: 500,
        maxContribution: 15000,
        maxAdjustmentPercentage: 0.50
      }
    }),

  emergencyFundGoal: (baseAmount: number, goalId: string = 'emergency-fund'): GoalDrivenContributionEvent =>
    createGoalDrivenContribution({
      name: 'Emergency Fund Goal',
      targetGoalId: goalId,
      targetAccountType: 'cash',
      baseContribution: baseAmount,
      adjustmentStrategy: {
        type: 'DEFICIT_BASED',
        aggressiveness: 'AGGRESSIVE',
        minContribution: baseAmount * 0.25,
        maxContribution: baseAmount * 3
      },
      limits: {
        minContribution: 200,
        maxContribution: 5000,
        maxAdjustmentPercentage: 1.0 // Allow 100% adjustment for emergency fund
      }
    }),

  houseDownPayment: (baseAmount: number, goalId: string = 'house-down-payment'): GoalDrivenContributionEvent =>
    createGoalDrivenContribution({
      name: 'House Down Payment',
      targetGoalId: goalId,
      targetAccountType: 'taxable',
      baseContribution: baseAmount,
      adjustmentStrategy: {
        type: 'TIME_BASED',
        aggressiveness: 'CONSERVATIVE',
        minContribution: baseAmount * 0.75,
        maxContribution: baseAmount * 1.5
      },
      limits: {
        minContribution: 1000,
        maxContribution: 8000,
        maxAdjustmentPercentage: 0.25 // Conservative 25% adjustment for house savings
      }
    }),

  flexibleSavings: (baseAmount: number, goalId: string): GoalDrivenContributionEvent => {
    const event = createGoalDrivenContribution({
      name: 'Flexible Savings Goal',
      targetGoalId: goalId,
      targetAccountType: 'taxable',
      baseContribution: baseAmount,
      adjustmentStrategy: {
        type: 'MARKET_RESPONSIVE',
        aggressiveness: 'MODERATE',
        minContribution: baseAmount * 0.5,
        maxContribution: baseAmount * 2
      },
      limits: {
        minContribution: 250,
        maxContribution: 10000,
        maxAdjustmentPercentage: 0.75
      }
    });

    // Add custom progress thresholds for flexible goals
    event.progressThresholds = [
      {
        progressPercentage: 0.25,
        action: 'INCREASE_CONTRIBUTION',
        adjustmentPercentage: 0.30
      },
      {
        progressPercentage: 0.50,
        action: 'MAINTAIN_CONTRIBUTION', 
        adjustmentPercentage: 0.00
      },
      {
        progressPercentage: 0.75,
        action: 'OPTIMIZE_CONTRIBUTION',
        adjustmentPercentage: -0.15
      }
    ];

    return event;
  }
};