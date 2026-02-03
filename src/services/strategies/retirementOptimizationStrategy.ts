/**
 * Retirement Optimization Strategy
 * 
 * Optimizes retirement contributions across different account types,
 * implements Roth conversion ladders, and maximizes tax efficiency.
 */

import { generateId } from '../../utils/formatting';
import { logger } from '../../utils/logger';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class RetirementOptimizationStrategy implements StrategyEngine {
  id = 'retirement-optimization';
  name = 'Retirement Maximizer';
  category = 'RETIREMENT_OPTIMIZATION' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Optimize retirement contributions and implement tax-efficient withdrawal strategies',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 120, // 10 years
    difficultyLevel: 'ADVANCED' as const,
    tags: ['retirement', '401k', 'roth', 'tax-optimization', 'compound-growth']
  };

  getParameters(): StrategyParameters {
    return {
      currentIncome: {
        type: 'number',
        label: 'Annual Income',
        description: 'Current annual gross income',
        defaultValue: 100000,
        min: 30000,
        max: 1000000,
        step: 5000,
        required: true
      },
      retirementAge: {
        type: 'number',
        label: 'Target Retirement Age',
        description: 'Age when you plan to retire',
        defaultValue: 65,
        min: 50,
        max: 80,
        step: 1,
        required: true
      },
      savingsRate: {
        type: 'percentage',
        label: 'Target Savings Rate',
        description: 'Percentage of income to save for retirement',
        defaultValue: 0.15,
        min: 0.05,
        max: 0.50,
        step: 0.01,
        required: true
      },
      hasEmployerMatch: {
        type: 'boolean',
        label: 'Employer 401(k) Match',
        description: 'Does your employer offer 401(k) matching?',
        defaultValue: true,
        required: false
      },
      employerMatchPercent: {
        type: 'percentage',
        label: 'Employer Match Percentage',
        description: 'Employer match as percentage of salary',
        defaultValue: 0.06,
        min: 0,
        max: 0.15,
        step: 0.005,
        required: false
      },
      implementRothLadder: {
        type: 'boolean',
        label: 'Implement Roth Conversion Ladder',
        description: 'Gradually convert traditional IRA/401k to Roth',
        defaultValue: false,
        required: false
      },
      maxOutContributions: {
        type: 'boolean',
        label: 'Maximize Contribution Limits',
        description: 'Aim to max out all retirement account limits',
        defaultValue: true,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    try {
      // Validate context input with detailed error handling
      if (!context) {
        throw new Error('Strategy execution context is null or undefined');
      }
      
      if (!context.currentEvents || !Array.isArray(context.currentEvents)) {
        throw new Error('Invalid currentEvents in context: must be an array');
      }
      
      if (typeof context.currentAge !== 'number' || isNaN(context.currentAge)) {
        throw new Error(`Invalid currentAge in context: ${context.currentAge} (must be a number)`);
      }
      
      if (context.currentAge < 18 || context.currentAge > 100) {
        throw new Error(`Unrealistic age in context: ${context.currentAge} (must be between 18 and 100)`);
      }

      const currentAge = context.currentAge;
      const retirementAge = context.targetRetirementAge || 65;

      // Validate retirement age
      if (typeof retirementAge !== 'number' || retirementAge < currentAge || retirementAge > 100) {
        logger.warn(`Invalid retirement age: ${retirementAge}. Using default of 65.`);
      }
      
      // Calculate income with enhanced error handling
      let annualIncome = 0;
      try {
        const incomeEvents = context.currentEvents.filter(e => e.type === 'INCOME' || e.type === 'SALARY');
        
        annualIncome = incomeEvents.reduce((sum, event) => {
          const amount = (event as any).amount;
          const frequency = (event as any).frequency;
          
          // Validate amount
          if (typeof amount !== 'number' || isNaN(amount)) {
            logger.warn(`Invalid income amount in event ${event.id}: ${amount}`);
            return sum;
          }
          
          if (amount < 0) {
            logger.warn(`Negative income amount in event ${event.id}: ${amount}`);
            return sum;
          }
          
          if (amount > 10000000) {
            logger.warn(`Unusually high income amount in event ${event.id}: ${amount}`);
          }
          
          // Convert to annual
          const annualizedAmount = frequency === 'monthly' ? amount * 12 : amount;
          return sum + annualizedAmount;
        }, 0);
        
      } catch (incomeError) {
        logger.error('Error calculating annual income:', incomeError);
        reasons.push('Unable to calculate annual income from events');
        return { applicable: false, reasons };
      }
      
      // Age-based checks
      if (currentAge >= retirementAge) {
        reasons.push('Already at or past retirement age');
        return { applicable: false, reasons };
      }
      
      // Income validation
      if (annualIncome <= 0) {
        reasons.push('No positive income found - retirement optimization requires earned income');
        return { applicable: false, reasons };
      }
      
      if (annualIncome < 30000) {
        reasons.push('Income too low to benefit from advanced retirement optimization strategies');
        return { applicable: false, reasons };
      }
      
      // Timeline validation
      const yearsToRetirement = retirementAge - currentAge;
      if (yearsToRetirement < 5) {
        reasons.push('Less than 5 years to retirement - consider catch-up strategies instead');
        return { applicable: false, reasons };
      }
      
      if (yearsToRetirement > 50) {
        logger.warn(`Very long time to retirement: ${yearsToRetirement} years`);
      }
      
      return { 
        applicable: true,
        reasons: [`${yearsToRetirement} years to optimize retirement savings`]
      };
      
    } catch (error) {
      logger.error('RetirementOptimizationStrategy.canApply failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      reasons.push(`Strategy evaluation failed: ${errorMessage}`);
      return { applicable: false, reasons };
    }
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    try {
      // Validate context before execution
      if (!context || !context.currentEvents) {
        throw new Error('Invalid execution context: missing required fields');
      }

      // Calculate income with error handling
      let annualIncome = 0;
      try {
        const incomeEvents = context.currentEvents.filter(e => e.type === 'INCOME' || e.type === 'SALARY');
        
        if (incomeEvents.length === 0) {
          throw new Error('No income events found for retirement optimization');
        }

        annualIncome = incomeEvents.reduce((sum, event) => {
          const amount = (event as any).amount;
          const frequency = (event as any).frequency;
          
          if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            logger.warn(`Skipping invalid income event ${event.id}: amount=${amount}`);
            return sum;
          }
          
          const annualizedAmount = frequency === 'monthly' ? amount * 12 : amount;
          return sum + annualizedAmount;
        }, 0);
        
        if (annualIncome <= 0) {
          throw new Error('No positive income found for retirement optimization');
        }
        
      } catch (incomeError) {
        logger.error('Error calculating income for retirement strategy:', incomeError);
        throw new Error(`Failed to calculate annual income: ${incomeError instanceof Error ? incomeError.message : 'Unknown error'}`);
      }

      // Validate strategy parameters with defaults
      const income = Math.max(annualIncome, 30000); // Minimum viable income
      const savingsRate = Math.min(Math.max(context.userInputs?.savingsRate || 0.15, 0.05), 0.50); // 5-50% range
      const hasEmployerMatch = true; // Conservative assumption
      const employerMatchPercent = Math.min(context.userInputs?.employerMatchPercent || 0.06, 0.10); // Max 10% match
      const maxOutContributions = income > 150000;
      
      // Validate retirement timeline
      const retirementAge = context.targetRetirementAge || 65;
      const yearsToRetirement = retirementAge - context.currentAge;
      
      if (yearsToRetirement <= 0) {
        throw new Error(`Invalid retirement timeline: ${yearsToRetirement} years remaining`);
      }
      
      const implementRothLadder = yearsToRetirement > 20;
      
      // Generate events with error handling
      let generatedEvents: StrategyGeneratedEvent[] = [];
      try {
        generatedEvents = this.generateRetirementEvents(
          income,
          savingsRate,
          hasEmployerMatch,
          employerMatchPercent,
          maxOutContributions,
          implementRothLadder,
          context
        );
      } catch (eventError) {
        logger.error('Error generating retirement events:', eventError);
        throw new Error(`Failed to generate retirement events: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`);
      }

      // Calculate impact with error handling
      let impact: StrategyImpact;
      try {
        impact = await this.calculateImpact(income, savingsRate, context);
      } catch (impactError) {
        logger.error('Error calculating retirement strategy impact:', impactError);
        // Provide fallback impact calculation
        impact = {
          projectedValue: income * savingsRate * yearsToRetirement * 1.07, // Simple projection
          monthlyGain: income * savingsRate / 12,
          annualGain: income * savingsRate,
          confidence: 0.7,
          timeline: yearsToRetirement * 12,
          riskFactors: ['Impact calculation failed - using simplified projection']
        };
      }

      // Generate recommendations and warnings with error handling
      let recommendations: string[] = [];
      let warnings: string[] = [];
      
      try {
        recommendations = this.generateRecommendations(income, savingsRate, maxOutContributions);
      } catch (recError) {
        logger.error('Error generating recommendations:', recError);
        recommendations = ['Maximize employer match', 'Increase retirement contributions gradually'];
      }

      try {
        warnings = this.generateWarnings(income, savingsRate, context.currentAge);
      } catch (warnError) {
        logger.error('Error generating warnings:', warnError);
        warnings = ['Review strategy parameters for accuracy'];
      }

      return {
        success: true,
        strategyId: this.id,
        strategyName: this.name,
        newPlanName: 'Optimized Retirement Plan',
        generatedEvents,
        modifiedEvents: [],
        recommendations,
        estimatedImpact: impact,
        warnings,
        nextSteps: this.generateNextSteps()
      };

    } catch (error) {
      logger.error('RetirementOptimizationStrategy.execute failed:', error);
      
      // Return failure result with diagnostic information
      return {
        success: false,
        strategyId: this.id,
        strategyName: this.name,
        newPlanName: 'Failed Retirement Optimization',
        generatedEvents: [],
        modifiedEvents: [],
        recommendations: [],
        estimatedImpact: {
          projectedValue: 0,
          monthlyGain: 0,
          annualGain: 0,
          confidence: 0,
          timeline: 0,
          riskFactors: [`Strategy execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        },
        warnings: [`Strategy execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        nextSteps: ['Review input data and try again', 'Consider simpler retirement strategies']
      };
    }
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const income = context.userInputs.currentIncome || 100000;
    const savingsRate = context.userInputs.savingsRate || 0.15;
    return this.calculateImpact(income, savingsRate, context);
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    if (!inputs.currentIncome || inputs.currentIncome < 30000) {
      errors.currentIncome = 'Income must be at least $30,000';
    }
    
    if (!inputs.retirementAge || inputs.retirementAge < 50 || inputs.retirementAge > 80) {
      errors.retirementAge = 'Retirement age must be between 50 and 80';
    }
    
    if (!inputs.savingsRate || inputs.savingsRate < 0.05 || inputs.savingsRate > 0.50) {
      errors.savingsRate = 'Savings rate must be between 5% and 50%';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  private generateRetirementEvents(
    income: number,
    savingsRate: number,
    hasEmployerMatch: boolean,
    employerMatchPercent: number,
    maxOutContributions: boolean,
    implementRothLadder: boolean,
    context: StrategyExecutionContext
  ): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const currentYear = context.currentYear;
    
    // 2025 contribution limits (would be dynamic in real implementation)
    const contributionLimits = {
      '401k': 23500,
      ira: 7000,
      catchUp401k: 7500, // Age 50+
      catchUpIra: 1000   // Age 50+
    };
    
    const totalSavingsTarget = income * savingsRate;
    let remainingSavings = totalSavingsTarget;
    
    // 1. Employer 401(k) match (free money first!)
    if (hasEmployerMatch && employerMatchPercent > 0) {
      const matchAmount = Math.min(income * employerMatchPercent, contributionLimits['401k']);
      
      events.push({
        event: {
          id: generateId(),
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Employer 401(k) Match',
          description: `Contribute enough to get full employer match (${(employerMatchPercent * 100).toFixed(1)}%)`,
          amount: matchAmount,
          monthOffset: 0,
          priority: 'HIGH',
          targetAccountType: 'tax_deferred',
          startDateOffset: 0,
          endDateOffset: 12 * (65 - context.currentAge) // Until retirement
        } as any,
        reason: 'Maximize free money from employer matching',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'CRITICAL'
      });
      
      remainingSavings -= matchAmount;
    }
    
    // 2. Roth IRA (tax-free growth)
    if (remainingSavings > 0) {
      const rothContribution = Math.min(remainingSavings, contributionLimits.ira);
      
      events.push({
        event: {
          id: generateId(),
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Roth IRA Contribution',
          description: 'Tax-free growth and withdrawals in retirement',
          amount: rothContribution,
          monthOffset: 0,
          priority: 'HIGH',
          targetAccountType: 'roth',
          startDateOffset: 0,
          endDateOffset: 12 * (65 - context.currentAge)
        } as any,
        reason: 'Tax-free growth and withdrawal flexibility',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
      
      remainingSavings -= rothContribution;
    }
    
    // 3. Additional 401(k) contributions
    if (remainingSavings > 0) {
      const additional401k = maxOutContributions 
        ? Math.min(remainingSavings, contributionLimits['401k'] - (hasEmployerMatch ? income * employerMatchPercent : 0))
        : Math.min(remainingSavings, contributionLimits['401k'] * 0.5);
      
      if (additional401k > 0) {
        events.push({
          event: {
            id: generateId(),
            type: 'SCHEDULED_CONTRIBUTION',
            name: 'Additional 401(k) Contribution',
            description: 'Tax-deferred retirement savings',
            amount: additional401k,
            monthOffset: 0,
            priority: 'MEDIUM',
            targetAccountType: 'tax_deferred',
            startDateOffset: 0,
            endDateOffset: 12 * (65 - context.currentAge)
          } as any,
          reason: 'Tax deferral and compound growth',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'HIGH'
        });
        
        remainingSavings -= additional401k;
      }
    }
    
    // 4. Taxable investment account (for remaining savings)
    if (remainingSavings > 0) {
      events.push({
        event: {
          id: generateId(),
          type: 'SCHEDULED_CONTRIBUTION',
          name: 'Taxable Investment Account',
          description: 'Additional retirement savings in taxable account',
          amount: remainingSavings,
          monthOffset: 0,
          priority: 'MEDIUM',
          targetAccountType: 'taxable',
          startDateOffset: 0,
          endDateOffset: 12 * (65 - context.currentAge)
        } as any,
        reason: 'Flexibility and additional retirement savings beyond tax-advantaged limits',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }
    
    // 5. Roth conversion ladder (if requested)
    if (implementRothLadder && context.currentAge >= 50) {
      const conversionAmount = Math.min(50000, income * 0.10); // Conservative 10% of income
      
      events.push({
        event: {
          id: generateId(),
          type: 'ROTH_CONVERSION',
          name: 'Annual Roth Conversion',
          description: 'Gradual conversion of traditional retirement funds to Roth',
          amount: conversionAmount,
          monthOffset: 0,
          priority: 'MEDIUM',
          startDateOffset: 0,
          endDateOffset: 12 * 10 // 10-year ladder
        } as any,
        reason: 'Create tax-free income stream in retirement',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }
    
    return events;
  }

  private async calculateImpact(
    income: number,
    savingsRate: number,
    context: StrategyExecutionContext
  ): Promise<StrategyImpact> {
    const annualSavings = income * savingsRate;
    const yearsToRetirement = 65 - context.currentAge;
    const assumedReturnRate = 0.07; // 7% annual return
    
    // Compound interest calculation
    const futureValue = annualSavings * (((1 + assumedReturnRate) ** yearsToRetirement - 1) / assumedReturnRate);
    
    // Tax benefits (rough estimate)
    const taxRate = 0.22; // Assume 22% marginal tax rate
    const annualTaxSavings = annualSavings * 0.6 * taxRate; // 60% goes to tax-deferred accounts
    
    return {
      cashFlowImpact: {
        monthlyChange: -annualSavings / 12,
        annualChange: -annualSavings,
        firstYearTotal: -annualSavings
      },
      netWorthImpact: {
        fiveYearProjection: annualSavings * 5 * 1.4, // With compound growth
        tenYearProjection: annualSavings * 10 * 2.0,
        retirementImpact: futureValue
      },
      taxImpact: {
        annualTaxSavings,
        lifetimeTaxSavings: annualTaxSavings * yearsToRetirement
      },
      riskFactors: [
        {
          factor: 'Market volatility affecting long-term returns',
          severity: 'MEDIUM',
          mitigation: 'Diversified portfolio and long investment timeline'
        },
        {
          factor: 'Changes in tax laws affecting retirement accounts',
          severity: 'LOW',
          mitigation: 'Diversification across account types (traditional, Roth, taxable)'
        }
      ]
    };
  }

  private generateRecommendations(income: number, savingsRate: number, maxOut: boolean) {
    return [
      {
        id: generateId(),
        title: 'Automate All Contributions',
        description: 'Set up automatic payroll deductions and transfers',
        type: 'ACTION' as const,
        priority: 'HIGH' as const,
        estimatedBenefit: 'Ensures consistent saving and removes temptation to spend',
        timeToImplement: '1 hour',
        difficulty: 'EASY' as const
      },
      {
        id: generateId(),
        title: 'Review Investment Allocations',
        description: 'Ensure appropriate asset allocation for your age and risk tolerance',
        type: 'CONSIDERATION' as const,
        priority: 'HIGH' as const,
        estimatedBenefit: 'Optimizes long-term growth potential',
        timeToImplement: '2-3 hours',
        difficulty: 'MODERATE' as const
      },
      {
        id: generateId(),
        title: 'Consider HSA as Retirement Vehicle',
        description: 'If eligible, maximize HSA contributions for triple tax advantage',
        type: 'OPTIMIZATION' as const,
        priority: 'MEDIUM' as const,
        estimatedBenefit: 'Tax deduction, growth, and withdrawal benefits',
        timeToImplement: '30 minutes',
        difficulty: 'EASY' as const
      }
    ];
  }

  private generateWarnings(income: number, savingsRate: number, currentAge: number): string[] {
    const warnings: string[] = [];
    
    if (savingsRate < 0.10) {
      warnings.push('Savings rate below 10% may not provide adequate retirement income');
    }
    
    if (savingsRate > 0.30) {
      warnings.push('Very high savings rate - ensure you maintain adequate current lifestyle');
    }
    
    if (currentAge > 50 && savingsRate < 0.20) {
      warnings.push('Starting retirement optimization after age 50 requires higher savings rates');
    }
    
    return warnings;
  }

  private generateNextSteps(): string[] {
    return [
      'Review and adjust contribution amounts based on your budget',
      'Set up automatic payroll deductions for 401(k) contributions',
      'Open Roth IRA account if not already established',
      'Review and optimize investment allocations within accounts',
      'Consider increasing contributions annually with salary raises',
      'Run simulation to see retirement income projections',
      'Schedule annual reviews to adjust strategy as needed'
    ];
  }
}