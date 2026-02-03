/**
 * Base Strategy Class
 *
 * Extracts common patterns from 17+ strategy files to eliminate duplication.
 * Provides standard config structure, validation methods, event generation helpers,
 * and impact calculation patterns.
 */

import { generateId } from '../../utils/formatting';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent,
  StrategyRecommendation,
  StrategyCategory
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export interface BaseStrategyConfig {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTimeframe: number; // months
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags: string[];
}

export abstract class BaseStrategy implements StrategyEngine {
  abstract id: string;
  abstract name: string;
  abstract category: StrategyCategory;

  protected abstract baseConfig: BaseStrategyConfig;

  get config() {
    return {
      ...this.baseConfig,
      parameters: this.getParameters()
    };
  }

  // Abstract methods each strategy must implement
  abstract getParameters(): StrategyParameters;
  abstract canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] };
  abstract execute(context: StrategyExecutionContext): Promise<StrategyResult>;

  // Common validation method
  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    const parameters = this.getParameters();

    for (const [key, param] of Object.entries(parameters)) {
      const value = inputs[key];

      if (param.required && (value === undefined || value === null || value === '')) {
        errors[key] = `${param.label} is required`;
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (param.type === 'number' || param.type === 'percentage') {
          if (typeof value !== 'number' || isNaN(value)) {
            errors[key] = `${param.label} must be a valid number`;
            continue;
          }

          if (param.min !== undefined && value < param.min) {
            errors[key] = `${param.label} must be at least ${param.min}`;
          }

          if (param.max !== undefined && value > param.max) {
            errors[key] = `${param.label} must be at most ${param.max}`;
          }
        }

        if (param.type === 'selection' && param.options) {
          const validValues = param.options.map(opt => opt.value);
          if (!validValues.includes(value)) {
            errors[key] = `${param.label} must be one of: ${validValues.join(', ')}`;
          }
        }

        // Custom validation
        if (param.validation) {
          const customError = param.validation(value);
          if (customError) {
            errors[key] = customError;
          }
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Common impact estimation
  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    // Default implementation - strategies can override
    return {
      cashFlowImpact: {
        monthlyChange: 0,
        annualChange: 0,
        firstYearTotal: 0
      },
      netWorthImpact: {
        fiveYearProjection: 0,
        tenYearProjection: 0,
        retirementImpact: 0
      },
      taxImpact: {
        annualTaxSavings: 0,
        lifetimeTaxSavings: 0
      },
      riskFactors: []
    };
  }

  // Common helper methods
  protected createDefaultParameters(): Partial<StrategyParameters> {
    return {
      startYear: {
        type: 'number',
        label: 'Start Year',
        description: 'Year to begin strategy implementation',
        defaultValue: new Date().getFullYear(),
        min: new Date().getFullYear(),
        max: new Date().getFullYear() + 10,
        step: 1,
        required: false
      },
      priority: {
        type: 'selection',
        label: 'Priority Level',
        description: 'Implementation priority for this strategy',
        defaultValue: 'MEDIUM',
        options: [
          { value: 'HIGH', label: 'High Priority' },
          { value: 'MEDIUM', label: 'Medium Priority' },
          { value: 'LOW', label: 'Low Priority' }
        ],
        required: false
      }
    };
  }

  protected estimateMonthlyIncome(events: FinancialEvent[]): number {
    const incomeEvents = events.filter(event =>
      event.type === 'INCOME' || event.type === 'SALARY'
    );

    return incomeEvents.reduce((total, event) => {
      const annualAmount = (event as any).amount || 0;
      return total + (annualAmount / 12);
    }, 0);
  }

  protected estimateMonthlyExpenses(events: FinancialEvent[]): number {
    const expenseEvents = events.filter(event =>
      event.type === 'RECURRING_EXPENSE' || event.type === 'EXPENSE'
    );

    return expenseEvents.reduce((total, event) => {
      const amount = (event as any).amount || 0;
      return total + amount;
    }, 0);
  }

  protected hasAdequateIncome(context: StrategyExecutionContext, minimumMonthly = 2000): boolean {
    const monthlyIncome = this.estimateMonthlyIncome(context.currentEvents);
    return monthlyIncome >= minimumMonthly;
  }

  protected hasExistingDebt(events: FinancialEvent[]): boolean {
    return events.some(event =>
      event.type === 'LIABILITY_ADD' || event.type === 'LIABILITY'
    );
  }

  protected hasRetirementAccounts(events: FinancialEvent[]): boolean {
    return events.some(event => {
      const targetAccount = (event as any).targetAccountType;
      return targetAccount === 'tax_deferred' || targetAccount === 'roth';
    });
  }

  protected createFinancialEvent(
    type: string,
    name: string,
    description: string,
    amount: number,
    options: Partial<FinancialEvent> = {}
  ): FinancialEvent {
    return {
      id: generateId(),
      type: type as any,
      name,
      description,
      amount,
      monthOffset: 0,
      priority: 'MEDIUM',
      startDateOffset: 0,
      endDateOffset: 12,
      targetAccountType: 'cash',
      ...options
    } as FinancialEvent;
  }

  protected createStrategyEvent(
    event: FinancialEvent,
    reason: string,
    importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
    isEditable = true
  ): StrategyGeneratedEvent {
    return {
      event,
      reason,
      isEditable,
      linkedToStrategy: true,
      importance
    };
  }

  protected createRecommendation(
    title: string,
    description: string,
    type: 'ACTION' | 'CONSIDERATION' | 'OPTIMIZATION' = 'ACTION',
    priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
    estimatedBenefit = '',
    timeToImplement = '',
    difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT' = 'MODERATE'
  ): StrategyRecommendation {
    return {
      id: generateId(),
      title,
      description,
      type,
      priority,
      estimatedBenefit,
      timeToImplement,
      difficulty
    };
  }

  protected calculateCompoundGrowth(
    principal: number,
    rate: number,
    years: number,
    monthlyContribution = 0
  ): number {
    const monthlyRate = rate / 12;
    const periods = years * 12;

    if (monthlyContribution === 0) {
      return principal * Math.pow(1 + rate, years);
    }

    // Future value of principal + future value of annuity
    const futureValuePrincipal = principal * Math.pow(1 + monthlyRate, periods);
    const futureValueAnnuity = monthlyContribution *
      ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate);

    return futureValuePrincipal + futureValueAnnuity;
  }

  protected calculateTaxSavings(amount: number, taxRate: number): number {
    return amount * taxRate;
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  protected formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  protected createBasicImpact(
    monthlyChange: number,
    taxSavings = 0,
    years = 10
  ): StrategyImpact {
    const annualChange = monthlyChange * 12;
    const netWorthGrowth = this.calculateCompoundGrowth(0, 0.07, years, monthlyChange);

    return {
      cashFlowImpact: {
        monthlyChange,
        annualChange,
        firstYearTotal: annualChange
      },
      netWorthImpact: {
        fiveYearProjection: this.calculateCompoundGrowth(0, 0.07, 5, monthlyChange),
        tenYearProjection: netWorthGrowth,
        retirementImpact: netWorthGrowth * 2
      },
      taxImpact: {
        annualTaxSavings: taxSavings,
        lifetimeTaxSavings: taxSavings * years
      },
      riskFactors: []
    };
  }

  protected addRiskFactor(
    impact: StrategyImpact,
    factor: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    mitigation: string
  ): void {
    impact.riskFactors.push({ factor, severity, mitigation });
  }

  protected createSuccessResult(
    newPlanName: string,
    generatedEvents: StrategyGeneratedEvent[],
    recommendations: StrategyRecommendation[],
    impact: StrategyImpact,
    warnings: string[] = [],
    nextSteps: string[] = []
  ): StrategyResult {
    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact: impact,
      warnings,
      nextSteps
    };
  }

  protected createFailureResult(reasons: string[]): StrategyResult {
    return {
      success: false,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: '',
      generatedEvents: [],
      modifiedEvents: [],
      recommendations: [],
      estimatedImpact: this.createBasicImpact(0),
      warnings: reasons,
      nextSteps: []
    };
  }
}