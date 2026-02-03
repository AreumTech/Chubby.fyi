/**
 * Percentage Contribution Dynamic Event Implementation
 * 
 * Implements automatic percentage-based savings: "Save 20% of gross income in 401k"
 * This provides automated savings rate management with income tracking.
 */

import { PercentageContributionEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculatePercentageContribution, validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Percentage Contribution Event Processor
 */
export class PercentageContributionProcessor {
  static async evaluate(
    event: PercentageContributionEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid percentage contribution event: ${validation.errorMessage}`);
    }

    if (!this.checkConditions(event, context)) {
      return [];
    }

    const contributionAmount = calculatePercentageContribution(event, context);
    if (contributionAmount <= 0) {
      return [];
    }

    try {
      validateAmount(contributionAmount, { 
        min: 0, 
        max: 1000000,
        name: 'Percentage contribution amount' 
      });
    } catch (error) {
      logger.error('Invalid contribution amount calculated:', 'DATA', error);
      return [];
    }

    const finalAmount = this.applyLimits(contributionAmount, event.limits);

    const action: EventAction = {
      type: 'CONTRIBUTION',
      amount: finalAmount,
      sourceAccount: 'cash',
      targetAccount: event.targetAccountType,
      description: this.generateActionDescription(event, finalAmount, contributionAmount, context),
      priority: event.priority,
      metadata: {
        savingsRate: event.savingsRate,
        baseIncome: context.monthlyIncome,
        calculatedAmount: contributionAmount,
        limitedAmount: finalAmount
      }
    };

    return [action];
  }

  static validateEvent(event: PercentageContributionEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  static checkConditions(event: PercentageContributionEvent, context: SimulationContext): boolean {
    if (event.incomeSource.includeTypes.includes('salary') && context.monthlyIncome <= 0) {
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
      if (conditions.income.minAnnual && (context.monthlyIncome * 12) < conditions.income.minAnnual) {
        return false;
      }
      if (conditions.income.maxAnnual && (context.monthlyIncome * 12) > conditions.income.maxAnnual) {
        return false;
      }
    }

    if (conditions.age) {
      if (conditions.age.min && context.currentAge < conditions.age.min) {
        return false;
      }
      if (conditions.age.max && context.currentAge > conditions.age.max) {
        return false;
      }
    }

    return true;
  }

  private static applyLimits(
    amount: number,
    limits?: PercentageContributionEvent['limits']
  ): number {
    if (!limits) {
      return amount;
    }

    let limitedAmount = amount;

    if (limits.minMonthly && limitedAmount < limits.minMonthly) {
      limitedAmount = limits.minMonthly;
    }

    if (limits.maxMonthly && limitedAmount > limits.maxMonthly) {
      limitedAmount = limits.maxMonthly;
    }

    if (limits.maxAnnual) {
      const maxMonthly = limits.maxAnnual / 12;
      if (limitedAmount > maxMonthly) {
        limitedAmount = maxMonthly;
      }
    }

    return limitedAmount;
  }

  private static generateActionDescription(
    event: PercentageContributionEvent,
    finalAmount: number,
    calculatedAmount: number,
    context: SimulationContext
  ): string {
    const rate = formatPercentage(event.savingsRate);
    const incomeType = event.incomeSource.useGross ? 'gross' : 'net';
    
    let description = `Percentage contribution: ${formatCurrency(finalAmount)} to ${event.targetAccountType} `;
    description += `(${rate} of ${incomeType} income: ${formatCurrency(context.monthlyIncome)})`;

    if (Math.abs(finalAmount - calculatedAmount) > 0.01) {
      description += ` [limited from ${formatCurrency(calculatedAmount)}]`;
    }

    return description;
  }

  static createTemplate(overrides: Partial<PercentageContributionEvent> = {}): PercentageContributionEvent {
    return {
      id: `percentage-contribution-${Date.now()}`,
      type: EventType.PERCENTAGE_CONTRIBUTION,
      name: 'Automated Savings',
      description: 'Automatic percentage-based contribution with income tracking',
      priority: 45 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      savingsRate: 0.20,
      incomeSource: {
        includeTypes: ['salary', 'bonus', 'commission'],
        excludeTypes: [],
        useGross: false
      },
      targetAccountType: 'tax_deferred',
      limits: {
        minMonthly: 500,
        maxAnnual: 23500
      },
      incomeAdjustment: {
        enabled: true,
        thresholds: [
          {
            incomeChange: 0.10,
            savingsRateAdjustment: 0.02
          },
          {
            incomeChange: -0.10,
            savingsRateAdjustment: -0.02
          }
        ]
      },
      ...overrides
    };
  }

  static validateUserInput(input: Partial<PercentageContributionEvent>): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (typeof input.savingsRate !== 'number' || input.savingsRate <= 0 || input.savingsRate > 1) {
      errors.push('Savings rate must be between 0 and 1 (0% to 100%)');
    }

    if (!input.targetAccountType) {
      errors.push('Target account type is required');
    }

    if (!input.incomeSource?.includeTypes?.length) {
      errors.push('Income source types are required');
    }

    if (typeof input.savingsRate === 'number' && input.savingsRate > 0.5) {
      errors.push('Savings rate above 50% seems unusually high');
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

  static explainBehavior(event: PercentageContributionEvent): string {
    const rate = formatPercentage(event.savingsRate);
    const incomeType = event.incomeSource.useGross ? 'gross' : 'after-tax';
    const account = event.targetAccountType.replace('_', ' ');

    let explanation = `This event automatically saves ${rate} of your ${incomeType} income into your ${account} account each month.`;

    if (event.incomeSource.includeTypes.length > 0) {
      explanation += ` It tracks income from: ${event.incomeSource.includeTypes.join(', ')}.`;
    }

    explanation += '\n\nThis ensures consistent, automated savings that scales with your income.';

    return explanation;
  }
}

export function createPercentageContribution(
  config: {
    name: string;
    savingsRate: number;
    targetAccountType: StandardAccountType;
    incomeTypes: string[];
    useGross?: boolean;
    limits?: {
      minMonthly?: number;
      maxMonthly?: number;
      maxAnnual?: number;
    };
    autoAdjust?: boolean;
  }
): PercentageContributionEvent {
  return PercentageContributionProcessor.createTemplate({
    name: config.name,
    description: `Percentage contribution: ${formatPercentage(config.savingsRate)} to ${config.targetAccountType}`,
    savingsRate: config.savingsRate,
    targetAccountType: config.targetAccountType,
    incomeSource: {
      includeTypes: config.incomeTypes,
      excludeTypes: [],
      useGross: config.useGross || false
    },
    limits: config.limits,
    incomeAdjustment: config.autoAdjust ? undefined : { enabled: false, thresholds: [] }
  });
}

export const PercentageContributionTemplates = {
  standard401k: (savingsRate: number = 0.20): PercentageContributionEvent => 
    createPercentageContribution({
      name: 'Standard 401k Contribution',
      savingsRate,
      targetAccountType: 'tax_deferred',
      incomeTypes: ['salary'],
      limits: {
        minMonthly: 500,
        maxAnnual: 23500
      },
      autoAdjust: true
    }),

  aggressiveSavings: (savingsRate: number = 0.30): PercentageContributionEvent =>
    createPercentageContribution({
      name: 'Aggressive Savings',
      savingsRate,
      targetAccountType: 'taxable',
      incomeTypes: ['salary', 'bonus', 'commission', 'side_income'],
      limits: {
        minMonthly: 1000
      },
      autoAdjust: true
    }),

  rothIRA: (savingsRate: number = 0.15): PercentageContributionEvent =>
    createPercentageContribution({
      name: 'Roth IRA Contribution',
      savingsRate,
      targetAccountType: 'roth',
      incomeTypes: ['salary', 'bonus'],
      useGross: false,
      limits: {
        minMonthly: 250,
        maxAnnual: 7000
      },
      autoAdjust: true
    })
};