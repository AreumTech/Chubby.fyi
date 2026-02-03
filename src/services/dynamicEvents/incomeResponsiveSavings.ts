/**
 * Income Responsive Savings Dynamic Event Implementation
 * 
 * Implements income-responsive savings rate adjustments: "Increase 401k contribution by 1% for every $10k income increase"
 * This provides adaptive savings that scale with income changes, preventing lifestyle inflation.
 */

import { IncomeResponsiveSavingsEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';

/**
 * Income change analysis interface
 */
interface IncomeChangeAnalysis {
  currentIncome: number;
  referenceIncome: number;
  incomeChange: number;
  changePercentage: number;
  smoothedIncome: number;
  newSavingsRate: number;
  adjustmentReason: string;
}

/**
 * Income Responsive Savings Event Processor
 */
export class IncomeResponsiveSavingsProcessor {
  static async evaluate(
    event: IncomeResponsiveSavingsEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid income responsive savings event: ${validation.errorMessage}`);
    }

    // Analyze income changes and calculate new savings rate
    const incomeAnalysis = this.analyzeIncomeChanges(event, context);
    
    if (incomeAnalysis.newSavingsRate === event.baseSavingsRate) {
      return []; // No adjustment needed
    }

    // Calculate contribution amount
    const contributionAmount = this.calculateContributionAmount(
      incomeAnalysis.smoothedIncome,
      incomeAnalysis.newSavingsRate,
      event
    );

    if (contributionAmount <= 0) {
      return [];
    }

    // Create contribution action
    const action: EventAction = {
      type: 'CONTRIBUTION',
      amount: contributionAmount,
      targetAccount: event.targetAccountType,
      description: this.generateContributionDescription(incomeAnalysis, contributionAmount),
      priority: event.priority,
      metadata: {
        incomeResponsiveEvent: true,
        originalSavingsRate: event.baseSavingsRate,
        adjustedSavingsRate: incomeAnalysis.newSavingsRate,
        incomeChange: incomeAnalysis.incomeChange,
        changePercentage: incomeAnalysis.changePercentage,
        adjustmentReason: incomeAnalysis.adjustmentReason,
        smoothedIncome: incomeAnalysis.smoothedIncome
      }
    };

    return [action];
  }

  /**
   * Analyze income changes and calculate new savings rate
   */
  private static analyzeIncomeChanges(
    event: IncomeResponsiveSavingsEvent,
    context: SimulationContext
  ): IncomeChangeAnalysis {
    // Calculate reference income for comparison
    const referenceIncome = this.calculateReferenceIncome(event, context);
    
    // Calculate smoothed current income
    const smoothedIncome = this.calculateSmoothedIncome(event, context);
    
    // Calculate income change
    const incomeChange = smoothedIncome - referenceIncome;
    const changePercentage = referenceIncome > 0 ? incomeChange / referenceIncome : 0;
    
    // Determine new savings rate based on income thresholds
    const newSavingsRate = this.calculateAdjustedSavingsRate(event, incomeChange);
    
    // Generate adjustment reason
    const adjustmentReason = this.generateAdjustmentReason(
      incomeChange,
      changePercentage,
      newSavingsRate,
      event.baseSavingsRate
    );

    return {
      currentIncome: context.monthlyIncome,
      referenceIncome,
      incomeChange,
      changePercentage,
      smoothedIncome,
      newSavingsRate,
      adjustmentReason
    };
  }

  /**
   * Calculate reference income for comparison
   */
  private static calculateReferenceIncome(
    event: IncomeResponsiveSavingsEvent,
    context: SimulationContext
  ): number {
    const { rollingAveragePeriod = 6 } = event.incomeCalculation;
    
    // Use 6-month average as reference by default
    return context.averageIncomeLast6Months || context.monthlyIncome;
  }

  /**
   * Calculate smoothed current income
   */
  private static calculateSmoothedIncome(
    event: IncomeResponsiveSavingsEvent,
    context: SimulationContext
  ): number {
    const { smoothingPeriod = 3 } = event.limits;
    
    if (smoothingPeriod <= 1) {
      return context.monthlyIncome;
    }
    
    // Use available historical data for smoothing
    // In a real implementation, this would use a rolling average
    const availableIncomes = [
      context.monthlyIncome,
      context.lastMonthIncome || context.monthlyIncome,
      context.averageIncomeLast6Months || context.monthlyIncome
    ].slice(0, smoothingPeriod);
    
    return availableIncomes.reduce((sum, income) => sum + income, 0) / availableIncomes.length;
  }

  /**
   * Calculate adjusted savings rate based on income thresholds
   */
  private static calculateAdjustedSavingsRate(
    event: IncomeResponsiveSavingsEvent,
    incomeChange: number
  ): number {
    let adjustedRate = event.baseSavingsRate;
    
    // Apply income threshold adjustments
    for (const threshold of event.incomeThresholds) {
      if (Math.abs(incomeChange) >= threshold.incomeIncrease) {
        const adjustmentDirection = incomeChange > 0 ? 1 : -1;
        adjustedRate += threshold.savingsRateAdjustment * adjustmentDirection;
      }
    }
    
    // Apply limits
    adjustedRate = Math.max(event.limits.minSavingsRate, adjustedRate);
    adjustedRate = Math.min(event.limits.maxSavingsRate, adjustedRate);
    
    return adjustedRate;
  }

  /**
   * Calculate actual contribution amount
   */
  private static calculateContributionAmount(
    smoothedIncome: number,
    savingsRate: number,
    event: IncomeResponsiveSavingsEvent
  ): number {
    let baseIncome = smoothedIncome;
    
    // Adjust for gross vs net income
    if (event.incomeCalculation.useGrossIncome) {
      baseIncome = smoothedIncome;
    } else {
      // Simplified after-tax calculation
      const estimatedTaxRate = 0.25;
      baseIncome = smoothedIncome * (1 - estimatedTaxRate);
    }
    
    // Calculate contribution
    const contributionAmount = baseIncome * savingsRate;
    
    return Math.max(0, contributionAmount);
  }

  /**
   * Generate adjustment reason description
   */
  private static generateAdjustmentReason(
    incomeChange: number,
    changePercentage: number,
    newRate: number,
    baseRate: number
  ): string {
    if (Math.abs(incomeChange) < 100) {
      return 'Income stable, maintaining base savings rate';
    }
    
    const direction = incomeChange > 0 ? 'increased' : 'decreased';
    const rateChange = newRate - baseRate;
    const rateDirection = rateChange > 0 ? 'increased' : 'decreased';
    
    return `Income ${direction} by ${formatCurrency(Math.abs(incomeChange))}, ` +
           `savings rate ${rateDirection} by ${formatPercentage(Math.abs(rateChange))}`;
  }

  /**
   * Generate contribution description
   */
  private static generateContributionDescription(
    analysis: IncomeChangeAnalysis,
    contributionAmount: number
  ): string {
    const rateDisplay = formatPercentage(analysis.newSavingsRate);
    return `Income-responsive contribution: ${formatCurrency(contributionAmount)} ` +
           `(${rateDisplay} of smoothed income) - ${analysis.adjustmentReason}`;
  }

  /**
   * Validate income responsive savings event configuration
   */
  static validateEvent(event: IncomeResponsiveSavingsEvent): ValidationResult {
    const errors: string[] = [];

    // Validate base savings rate
    if (event.baseSavingsRate < 0 || event.baseSavingsRate > 1) {
      errors.push('Base savings rate must be between 0 and 1 (0% to 100%)');
    }

    // Validate limits
    if (event.limits.minSavingsRate < 0 || event.limits.minSavingsRate > 1) {
      errors.push('Minimum savings rate must be between 0 and 1');
    }

    if (event.limits.maxSavingsRate < 0 || event.limits.maxSavingsRate > 1) {
      errors.push('Maximum savings rate must be between 0 and 1');
    }

    if (event.limits.minSavingsRate > event.limits.maxSavingsRate) {
      errors.push('Minimum savings rate cannot be greater than maximum savings rate');
    }

    if (event.baseSavingsRate < event.limits.minSavingsRate || 
        event.baseSavingsRate > event.limits.maxSavingsRate) {
      errors.push('Base savings rate must be within min/max limits');
    }

    // Validate income thresholds
    if (event.incomeThresholds.length === 0) {
      errors.push('At least one income threshold must be defined');
    }

    for (const threshold of event.incomeThresholds) {
      if (threshold.incomeIncrease <= 0) {
        errors.push('Income threshold amounts must be positive');
      }
      
      if (Math.abs(threshold.savingsRateAdjustment) > 0.5) {
        errors.push('Savings rate adjustments should not exceed 50% per threshold');
      }
    }

    // Validate smoothing period
    if (event.limits.smoothingPeriod && event.limits.smoothingPeriod < 1) {
      errors.push('Smoothing period must be at least 1 month');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Validate user input for creating income responsive savings event
   */
  static validateUserInput(input: any): ValidationResult {
    const errors: string[] = [];

    if (!input.name || typeof input.name !== 'string') {
      errors.push('Event name is required');
    }

    if (input.baseSavingsRate === undefined || typeof input.baseSavingsRate !== 'number') {
      errors.push('Base savings rate is required');
    }

    if (!input.targetAccountType || typeof input.targetAccountType !== 'string') {
      errors.push('Target account type is required');
    }

    if (!input.incomeThresholds || !Array.isArray(input.incomeThresholds)) {
      errors.push('Income thresholds array is required');
    }

    if (!input.limits || typeof input.limits !== 'object') {
      errors.push('Limits configuration is required');
    }

    if (!input.incomeCalculation || typeof input.incomeCalculation !== 'object') {
      errors.push('Income calculation settings are required');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Explain income responsive savings behavior for user
   */
  static explainBehavior(event: IncomeResponsiveSavingsEvent): string {
    const baseRateDisplay = formatPercentage(event.baseSavingsRate);
    const minRateDisplay = formatPercentage(event.limits.minSavingsRate);
    const maxRateDisplay = formatPercentage(event.limits.maxSavingsRate);
    
    const thresholdDescriptions = event.incomeThresholds
      .map(t => `${formatCurrency(t.incomeIncrease)} income change → ${formatPercentage(Math.abs(t.savingsRateAdjustment))} rate adjustment`)
      .join(', ');

    return `This event automatically adjusts your savings rate based on income changes:

**Base Configuration:**
- Starting savings rate: ${baseRateDisplay}
- Rate limits: ${minRateDisplay} to ${maxRateDisplay}
- Target account: ${event.targetAccountType}

**Income Response Rules:**
${thresholdDescriptions}

**Income Calculation:**
- Uses ${event.incomeCalculation.useGrossIncome ? 'gross' : 'net'} income
- ${event.limits.smoothingPeriod ? `Smoothed over ${event.limits.smoothingPeriod} months` : 'No smoothing'}
- ${event.incomeCalculation.includeBonus ? 'Includes' : 'Excludes'} bonus income

This prevents lifestyle inflation by automatically increasing savings when income rises, while protecting against over-saving during income dips.`;
  }

  /**
   * Create template income responsive savings event
   */
  static createTemplate(overrides: Partial<IncomeResponsiveSavingsEvent> = {}): IncomeResponsiveSavingsEvent {
    return {
      id: `income-responsive-savings-${Date.now()}`,
      type: EventType.INCOME_RESPONSIVE_SAVINGS,
      name: 'Income-Responsive Savings',
      description: 'Automatically adjust savings rate based on income changes',
      priority: 25 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      
      baseSavingsRate: 0.15, // 15% base rate
      targetAccountType: 'tax_deferred',
      
      incomeThresholds: [
        {
          incomeIncrease: 5000, // $5k income increase
          savingsRateAdjustment: 0.01, // +1% savings rate
          description: 'Moderate income increase adjustment'
        },
        {
          incomeIncrease: 10000, // $10k income increase
          savingsRateAdjustment: 0.02, // +2% savings rate
          description: 'Significant income increase adjustment'
        },
        {
          incomeIncrease: 20000, // $20k income increase
          savingsRateAdjustment: 0.03, // +3% savings rate
          description: 'Major income increase adjustment'
        }
      ],
      
      limits: {
        minSavingsRate: 0.05, // Never below 5%
        maxSavingsRate: 0.40, // Never above 40%
        smoothingPeriod: 3 // 3-month smoothing
      },
      
      incomeCalculation: {
        useGrossIncome: true,
        includeBonus: false,
        excludeOneTimeEvents: true,
        rollingAveragePeriod: 6
      },
      
      ...overrides
    };
  }
}

/**
 * Factory function for creating income responsive savings events
 */
export function createIncomeResponsiveSavings(
  config: {
    name: string;
    baseSavingsRate: number;
    targetAccountType: StandardAccountType;
    incomeThresholds: Array<{
      incomeIncrease: number;
      savingsRateAdjustment: number;
      description: string;
    }>;
    minRate?: number;
    maxRate?: number;
    useGrossIncome?: boolean;
  }
): IncomeResponsiveSavingsEvent {
  return IncomeResponsiveSavingsProcessor.createTemplate({
    name: config.name,
    description: `Income-responsive savings starting at ${(config.baseSavingsRate * 100).toFixed(1)}%`,
    baseSavingsRate: config.baseSavingsRate,
    targetAccountType: config.targetAccountType,
    incomeThresholds: config.incomeThresholds,
    limits: {
      minSavingsRate: config.minRate || 0.05,
      maxSavingsRate: config.maxRate || 0.40,
      smoothingPeriod: 3
    },
    incomeCalculation: {
      useGrossIncome: config.useGrossIncome ?? true,
      includeBonus: false,
      excludeOneTimeEvents: true,
      rollingAveragePeriod: 6
    }
  });
}

/**
 * Pre-built income responsive savings templates
 */
export const IncomeResponsiveSavingsTemplates = {
  conservative: (): IncomeResponsiveSavingsEvent =>
    createIncomeResponsiveSavings({
      name: 'Conservative Income-Responsive Savings',
      baseSavingsRate: 0.10, // 10% base
      targetAccountType: 'tax_deferred',
      incomeThresholds: [
        { incomeIncrease: 10000, savingsRateAdjustment: 0.01, description: 'Modest adjustment for income growth' }
      ],
      minRate: 0.05,
      maxRate: 0.25
    }),

  moderate: (): IncomeResponsiveSavingsEvent =>
    createIncomeResponsiveSavings({
      name: 'Moderate Income-Responsive Savings',
      baseSavingsRate: 0.15, // 15% base
      targetAccountType: 'tax_deferred',
      incomeThresholds: [
        { incomeIncrease: 5000, savingsRateAdjustment: 0.01, description: 'Small income increase' },
        { incomeIncrease: 15000, savingsRateAdjustment: 0.02, description: 'Significant income increase' }
      ],
      minRate: 0.08,
      maxRate: 0.35
    }),

  aggressive: (): IncomeResponsiveSavingsEvent =>
    createIncomeResponsiveSavings({
      name: 'Aggressive Income-Responsive Savings',
      baseSavingsRate: 0.20, // 20% base
      targetAccountType: 'tax_deferred',
      incomeThresholds: [
        { incomeIncrease: 2500, savingsRateAdjustment: 0.015, description: 'Quick response to income changes' },
        { incomeIncrease: 7500, savingsRateAdjustment: 0.025, description: 'Significant adjustment' },
        { incomeIncrease: 15000, savingsRateAdjustment: 0.035, description: 'Major lifestyle inflation prevention' }
      ],
      minRate: 0.10,
      maxRate: 0.50
    }),

  antiInflation: (): IncomeResponsiveSavingsEvent =>
    createIncomeResponsiveSavings({
      name: 'Anti-Lifestyle Inflation Savings',
      baseSavingsRate: 0.12, // 12% base
      targetAccountType: 'taxable',
      incomeThresholds: [
        { incomeIncrease: 1000, savingsRateAdjustment: 0.005, description: 'Immediate response to any income increase' },
        { incomeIncrease: 5000, savingsRateAdjustment: 0.015, description: 'Strong inflation prevention' },
        { incomeIncrease: 12000, savingsRateAdjustment: 0.025, description: 'Maximum lifestyle inflation prevention' }
      ],
      minRate: 0.05,
      maxRate: 0.45,
      useGrossIncome: false // Use net income for more accurate lifestyle impact
    })
};