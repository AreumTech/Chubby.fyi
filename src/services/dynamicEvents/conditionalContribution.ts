/**
 * Conditional Contribution Dynamic Event Implementation
 * 
 * Implements the "invest X after keeping Y in cash" use case.
 * This is the most common dynamic event pattern requested by users.
 */

import { ConditionalContributionEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculateConditionalContribution, validateAmount, formatCurrency } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Conditional Contribution Event Processor
 * 
 * Handles evaluation and execution of conditional contribution events
 */
export class ConditionalContributionProcessor {
  /**
   * Evaluates a conditional contribution event and returns actions to execute
   */
  static async evaluate(
    event: ConditionalContributionEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    // Validate the event first
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid conditional contribution event: ${validation.errorMessage}`);
    }

    // Check if base conditions are met
    if (!this.checkConditions(event, context)) {
      return []; // No actions if conditions aren't met
    }

    // Calculate contribution amount
    const contributionAmount = calculateConditionalContribution(event, context);

    // If no contribution calculated, return empty actions
    if (contributionAmount <= 0) {
      return [];
    }

    // Validate the calculated amount
    try {
      validateAmount(contributionAmount, { 
        min: 0, 
        max: 1000000, // Reasonable upper limit
        name: 'Conditional contribution amount' 
      });
    } catch (error) {
      logger.error('Invalid contribution amount calculated:', 'DATA', error);
      return [];
    }

    // Create the contribution action
    const action: EventAction = {
      type: 'CONTRIBUTION',
      amount: contributionAmount,
      sourceAccount: 'cash',
      targetAccount: event.targetAccountType,
      description: this.generateActionDescription(event, contributionAmount, context),
      priority: event.priority || 50 as any
    };

    return [action];
  }

  /**
   * Validates the conditional contribution event
   */
  static validateEvent(event: ConditionalContributionEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  /**
   * Checks if event conditions are met
   */
  static checkConditions(event: ConditionalContributionEvent, context: SimulationContext): boolean {
    // Check basic cash threshold
    if (context.cashBalance < event.cashThreshold) {
      return false;
    }

    // Check optional condition set
    if (event.conditions) {
      if (!this.evaluateConditionSet(event.conditions, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates the condition set for the event
   */
  private static evaluateConditionSet(conditions: any, context: SimulationContext): boolean {
    // Cash balance conditions
    if (conditions.cashBalance) {
      if (conditions.cashBalance.min && context.cashBalance < conditions.cashBalance.min) {
        return false;
      }
      if (conditions.cashBalance.max && context.cashBalance > conditions.cashBalance.max) {
        return false;
      }
    }

    // Income conditions
    if (conditions.income) {
      if (conditions.income.minMonthly && context.monthlyIncome < conditions.income.minMonthly) {
        return false;
      }
      if (conditions.income.maxMonthly && context.monthlyIncome > conditions.income.maxMonthly) {
        return false;
      }
      if (conditions.income.minAnnual && (context.monthlyIncome * 12) < conditions.income.minAnnual) {
        return false;
      }
      if (conditions.income.maxAnnual && (context.monthlyIncome * 12) > conditions.income.maxAnnual) {
        return false;
      }
    }

    // Age conditions
    if (conditions.age) {
      if (conditions.age.min && context.currentAge < conditions.age.min) {
        return false;
      }
      if (conditions.age.max && context.currentAge > conditions.age.max) {
        return false;
      }
    }

    // Net worth conditions
    if (conditions.netWorth) {
      if (conditions.netWorth.min && context.totalNetWorth < conditions.netWorth.min) {
        return false;
      }
      if (conditions.netWorth.max && context.totalNetWorth > conditions.netWorth.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generates a descriptive action description
   */
  private static generateActionDescription(
    event: ConditionalContributionEvent,
    amount: number,
    context: SimulationContext
  ): string {
    const excessCash = context.cashBalance - event.cashThreshold;
    const strategy = event.contributionStrategy.type;

    let description = `Conditional contribution: ${formatCurrency(amount)} to ${event.targetAccountType}`;
    
    switch (strategy) {
      case 'FIXED_AMOUNT':
        description += ` (fixed amount, ${formatCurrency(excessCash)} excess cash available)`;
        break;
      case 'PERCENTAGE_OF_EXCESS':
        const percentage = event.contributionStrategy.percentage || 1.0;
        description += ` (${(percentage * 100).toFixed(1)}% of ${formatCurrency(excessCash)} excess)`;
        break;
      case 'ALL_EXCESS':
        description += ` (all excess above ${formatCurrency(event.cashThreshold)} threshold)`;
        break;
    }

    return description;
  }

  /**
   * Creates a template conditional contribution event with sensible defaults
   */
  static createTemplate(overrides: Partial<ConditionalContributionEvent> = {}): ConditionalContributionEvent {
    return {
      id: `conditional-contribution-${Date.now()}`,
      type: EventType.CONDITIONAL_CONTRIBUTION,
      name: 'Smart Investment Strategy',
      description: 'Invest excess cash after maintaining emergency fund',
      priority: 50 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      targetAmount: 2000,
      targetAccountType: 'tax_deferred',
      cashThreshold: 50000,
      contributionStrategy: {
        type: 'FIXED_AMOUNT'
      },
      ...overrides
    };
  }

  /**
   * Validates user input for creating/editing conditional contribution events
   */
  static validateUserInput(input: Partial<ConditionalContributionEvent>): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (typeof input.targetAmount !== 'number' || input.targetAmount <= 0) {
      errors.push('Target amount must be a positive number');
    }

    if (typeof input.cashThreshold !== 'number' || input.cashThreshold < 0) {
      errors.push('Cash threshold must be a non-negative number');
    }

    if (!input.targetAccountType) {
      errors.push('Target account type is required');
    }

    if (!input.contributionStrategy?.type) {
      errors.push('Contribution strategy type is required');
    }

    // Strategy-specific validation
    if (input.contributionStrategy?.type === 'PERCENTAGE_OF_EXCESS') {
      const percentage = input.contributionStrategy.percentage;
      if (typeof percentage !== 'number' || percentage <= 0 || percentage > 1) {
        errors.push('Percentage must be between 0 and 1 for percentage-based strategy');
      }
    }

    // Reasonable limits
    if (typeof input.targetAmount === 'number' && input.targetAmount > 100000) {
      errors.push('Target amount seems unusually high (max $100,000)');
    }

    if (typeof input.cashThreshold === 'number' && input.cashThreshold > 1000000) {
      errors.push('Cash threshold seems unusually high (max $1,000,000)');
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

  /**
   * Explains the event behavior in user-friendly terms
   */
  static explainBehavior(event: ConditionalContributionEvent): string {
    const threshold = formatCurrency(event.cashThreshold);
    const amount = formatCurrency(event.targetAmount);
    const account = event.targetAccountType.replace('_', ' ');

    let explanation = `This event maintains a cash cushion of ${threshold}, then invests `;

    switch (event.contributionStrategy.type) {
      case 'FIXED_AMOUNT':
        explanation += `a fixed ${amount} into your ${account} account when you have excess cash.`;
        break;
      case 'PERCENTAGE_OF_EXCESS':
        const percentage = ((event.contributionStrategy.percentage || 1.0) * 100).toFixed(1);
        explanation += `${percentage}% of any excess cash into your ${account} account.`;
        break;
      case 'ALL_EXCESS':
        explanation += `all excess cash into your ${account} account.`;
        break;
    }

    explanation += ` This ensures you always maintain your emergency fund while automatically investing when you have extra money.`;

    if (event.conditions) {
      explanation += ` Additional conditions apply based on your income, age, or other factors.`;
    }

    return explanation;
  }
}

/**
 * Factory function for creating conditional contribution events
 */
export function createConditionalContribution(
  config: {
    name: string;
    targetAmount: number;
    targetAccountType: StandardAccountType;
    cashThreshold: number;
    strategy: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_EXCESS' | 'ALL_EXCESS';
    percentage?: number;
    conditions?: any;
  }
): ConditionalContributionEvent {
  return ConditionalContributionProcessor.createTemplate({
    name: config.name,
    description: `Conditional contribution: ${config.strategy.toLowerCase().replace('_', ' ')}`,
    targetAmount: config.targetAmount,
    targetAccountType: config.targetAccountType,
    cashThreshold: config.cashThreshold,
    contributionStrategy: {
      type: config.strategy,
      percentage: config.percentage
    },
    conditions: config.conditions
  });
}

/**
 * Predefined templates for common use cases
 */
export const ConditionalContributionTemplates = {
  /**
   * Emergency fund + 401k: Keep 6 months expenses, invest excess in 401k
   */
  emergencyPlusRetirement: (monthlyExpenses: number): ConditionalContributionEvent => 
    createConditionalContribution({
      name: 'Emergency Fund + 401k',
      targetAmount: 2000,
      targetAccountType: 'tax_deferred',
      cashThreshold: monthlyExpenses * 6,
      strategy: 'FIXED_AMOUNT'
    }),

  /**
   * Conservative approach: Keep large cash buffer, invest 25% of excess
   */
  conservative: (cashBuffer: number): ConditionalContributionEvent =>
    createConditionalContribution({
      name: 'Conservative Investment',
      targetAmount: 0, // Not used for percentage strategy
      targetAccountType: 'taxable',
      cashThreshold: cashBuffer,
      strategy: 'PERCENTAGE_OF_EXCESS',
      percentage: 0.25
    }),

  /**
   * Aggressive approach: Keep minimal cash, invest all excess
   */
  aggressive: (minCash: number): ConditionalContributionEvent =>
    createConditionalContribution({
      name: 'Aggressive Investment',
      targetAmount: 0, // Not used for all excess strategy
      targetAccountType: 'taxable',
      cashThreshold: minCash,
      strategy: 'ALL_EXCESS'
    }),

  /**
   * Goal-focused: Save for specific goal with conditions
   */
  goalFocused: (
    goalName: string,
    targetAmount: number,
    cashThreshold: number,
    targetAccount: StandardAccountType = 'cash'
  ): ConditionalContributionEvent =>
    createConditionalContribution({
      name: `${goalName} Savings`,
      targetAmount,
      targetAccountType: targetAccount,
      cashThreshold,
      strategy: 'FIXED_AMOUNT'
    })
};