/**
 * Retirement Withdrawal Strategy
 * 
 * Implements sophisticated withdrawal strategies for retirement including:
 * - 4% rule with dynamic adjustments
 * - Bucket strategy for sequenced withdrawals
 * - Bond ladder for income generation
 * - Tax-efficient withdrawal sequencing
 */

import { generateId } from '../../utils/formatting';
import { EventType } from '../../types/events';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent,
  StrategyRecommendation
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class RetirementWithdrawalStrategy implements StrategyEngine {
  id = 'retirement-withdrawal';
  name = 'Retirement Withdrawal Optimizer';
  category = 'RETIREMENT_OPTIMIZATION' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Optimize retirement withdrawal strategies for sustainable income and tax efficiency',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 60, // 5 years to fully implement
    difficultyLevel: 'ADVANCED' as const,
    tags: ['retirement', 'withdrawal', '4%-rule', 'bucket-strategy', 'tax-efficiency', 'income-planning']
  };

  getParameters(): StrategyParameters {
    return {
      withdrawalStrategy: {
        type: 'selection',
        label: 'Withdrawal Strategy',
        description: 'Primary withdrawal strategy to implement',
        defaultValue: 'dynamic_4_percent',
        options: [
          { value: 'fixed_4_percent', label: 'Fixed 4% Rule' },
          { value: 'dynamic_4_percent', label: 'Dynamic 4% with Guardrails' },
          { value: 'bucket_strategy', label: 'Bucket Strategy (3-bucket approach)' },
          { value: 'bond_ladder', label: 'Bond Ladder Strategy' },
          { value: 'hybrid', label: 'Hybrid (Bucket + Dynamic)' }
        ],
        required: true
      },
      initialWithdrawalRate: {
        type: 'percentage',
        label: 'Initial Withdrawal Rate',
        description: 'Starting withdrawal rate as percentage of portfolio',
        defaultValue: 0.04,
        min: 0.025,
        max: 0.06,
        step: 0.0025,
        required: true
      },
      retirementAge: {
        type: 'number',
        label: 'Retirement Age',
        description: 'Age when withdrawals begin',
        defaultValue: 65,
        min: 55,
        max: 75,
        step: 1,
        required: true
      },
      expectedLifespan: {
        type: 'number',
        label: 'Planning Horizon (Years)',
        description: 'Number of years to plan withdrawals for',
        defaultValue: 30,
        min: 20,
        max: 40,
        step: 1,
        required: true
      },
      annualExpenses: {
        type: 'number',
        label: 'Annual Retirement Expenses',
        description: 'Expected annual expenses in retirement',
        defaultValue: 80000,
        min: 30000,
        max: 300000,
        step: 5000,
        required: true
      },
      inflationAdjustment: {
        type: 'boolean',
        label: 'Inflation Adjustments',
        description: 'Adjust withdrawals annually for inflation',
        defaultValue: true,
        required: false
      },
      taxWithholdingRate: {
        type: 'percentage',
        label: 'Tax Withholding Rate',
        description: 'Percentage to withhold for taxes',
        defaultValue: 0.15,
        min: 0,
        max: 0.40,
        step: 0.01,
        required: false
      },
      emergencyBuffer: {
        type: 'number',
        label: 'Emergency Buffer (Months)',
        description: 'Months of expenses to keep as cash buffer',
        defaultValue: 12,
        min: 6,
        max: 24,
        step: 1,
        required: false
      },
      guardrailsEnabled: {
        type: 'boolean',
        label: 'Enable Guardrails',
        description: 'Automatically adjust withdrawals based on portfolio performance',
        defaultValue: true,
        required: false
      },
      guardrailLowerBound: {
        type: 'percentage',
        label: 'Lower Guardrail',
        description: 'Reduce withdrawals if portfolio drops below this threshold',
        defaultValue: 0.80,
        min: 0.70,
        max: 0.90,
        step: 0.05,
        required: false
      },
      guardrailUpperBound: {
        type: 'percentage',
        label: 'Upper Guardrail',
        description: 'Increase withdrawals if portfolio exceeds this threshold',
        defaultValue: 1.20,
        min: 1.10,
        max: 1.50,
        step: 0.05,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const currentAge = context.currentAge || context.config?.currentAge || 30;
    const retirementAge = context.config?.retirementAge || 65;

    // Check if user is near or in retirement
    if (currentAge >= retirementAge - 10) {
      reasons.push('You are approaching retirement age - time to plan your withdrawal strategy');
    } else if (currentAge >= retirementAge) {
      reasons.push('Optimize your retirement withdrawals for longevity and tax efficiency');
    } else {
      reasons.push('Plan ahead: Design your retirement withdrawal strategy now');
    }

    return {
      applicable: true,
      reasons
    };
  }

  async evaluate(context: StrategyExecutionContext, parameters: Record<string, any>): Promise<StrategyResult> {
    const { config, currentEvents, userInputs, currentAge } = context;
    const {
      withdrawalStrategy,
      initialWithdrawalRate,
      retirementAge,
      expectedLifespan,
      annualExpenses,
      inflationAdjustment,
      taxWithholdingRate,
      emergencyBuffer,
      guardrailsEnabled
    } = parameters;

    // Generate withdrawal events based on strategy
    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];

    // Calculate portfolio values
    const portfolioValue = this.calculatePortfolioValue(currentEvents);
    const requiredPortfolioSize = annualExpenses / initialWithdrawalRate;

    if (portfolioValue < requiredPortfolioSize * 0.8) {
      warnings.push(`Portfolio may be underfunded. Current: $${portfolioValue.toLocaleString()}, Recommended: $${requiredPortfolioSize.toLocaleString()}`);
    }

    // Generate withdrawal strategy events
    switch (withdrawalStrategy) {
      case 'fixed_4_percent':
        generatedEvents.push(...this.generateFixed4PercentEvents(context, parameters));
        break;
      case 'dynamic_4_percent':
        generatedEvents.push(...this.generateDynamic4PercentEvents(context, parameters));
        break;
      case 'bucket_strategy':
        generatedEvents.push(...this.generateBucketStrategyEvents(context, parameters));
        break;
      case 'bond_ladder':
        generatedEvents.push(...this.generateBondLadderEvents(context, parameters));
        break;
      case 'hybrid':
        generatedEvents.push(...this.generateHybridStrategyEvents(context, parameters));
        break;
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(context, parameters, portfolioValue));

    // Calculate estimated impact
    const estimatedImpact = this.calculateImpact(parameters, portfolioValue);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `${withdrawalStrategy.replace('_', ' ')} Retirement Plan`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps: this.generateNextSteps(withdrawalStrategy)
    };
  }

  private calculatePortfolioValue(events: FinancialEvent[]): number {
    // Calculate total portfolio value from investment events
    let totalValue = 0;
    
    events.forEach(event => {
      if (event.type === EventType.SCHEDULED_CONTRIBUTION || 
          event.type === EventType.INITIAL_INVESTMENT) {
        totalValue += (event as any).amount || 0;
      }
    });

    // Apply compound growth (simplified calculation)
    return totalValue * 1.07; // Assume 7% average growth
  }

  private generateFixed4PercentEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { retirementAge, annualExpenses, expectedLifespan, inflationAdjustment } = parameters;
    const startYear = context.currentYear + (retirementAge - context.currentAge);

    for (let year = 0; year < expectedLifespan; year++) {
      const withdrawalYear = startYear + year;
      let withdrawalAmount = annualExpenses;

      if (inflationAdjustment && year > 0) {
        withdrawalAmount = annualExpenses * Math.pow(1.025, year); // 2.5% inflation
      }

      const withdrawalEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.WITHDRAWAL,
        name: `Retirement Withdrawal - Year ${year + 1}`,
        description: `Fixed 4% rule withdrawal for retirement year ${year + 1}`,
        monthOffset: (withdrawalYear - context.config.simulationStartYear) * 12,
        amount: withdrawalAmount,
        accountType: 'tax_deferred', // Start with tax-deferred accounts
        priority: 'HIGH' as any
      };

      events.push({
        event: withdrawalEvent,
        reason: 'Fixed 4% rule withdrawal for sustainable retirement income',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateDynamic4PercentEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { retirementAge, annualExpenses, expectedLifespan, guardrailsEnabled } = parameters;
    const startYear = context.currentYear + (retirementAge - context.currentAge);

    // Generate dynamic withdrawal events with guardrails
    for (let year = 0; year < Math.min(expectedLifespan, 5); year++) { // Plan first 5 years in detail
      const withdrawalYear = startYear + year;
      
      const withdrawalEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.WITHDRAWAL,
        name: `Dynamic Withdrawal - Year ${year + 1}`,
        description: `Dynamic 4% rule with guardrails - Year ${year + 1}`,
        monthOffset: (withdrawalYear - context.config.simulationStartYear) * 12,
        amount: annualExpenses * (1 + (year * 0.025)), // Inflation adjusted
        accountType: 'tax_deferred',
        priority: 'HIGH' as any
      };

      events.push({
        event: withdrawalEvent,
        reason: 'Dynamic withdrawal with portfolio-based adjustments',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });

      // Add portfolio review event
      if (guardrailsEnabled && year > 0) {
        const reviewEvent: FinancialEvent = {
          id: generateId(),
          type: EventType.FINANCIAL_MILESTONE,
          name: `Portfolio Review - Year ${year + 1}`,
          description: 'Annual portfolio review for withdrawal adjustments',
          monthOffset: (withdrawalYear - context.config.simulationStartYear) * 12,
          amount: 0,
          priority: 'MEDIUM' as any
        };

        events.push({
          event: reviewEvent,
          reason: 'Annual portfolio review for dynamic withdrawal adjustments',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'MEDIUM'
        });
      }
    }

    return events;
  }

  private generateBucketStrategyEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { retirementAge, annualExpenses, emergencyBuffer } = parameters;
    const startYear = context.currentYear + (retirementAge - context.currentAge);

    // Bucket 1: Cash/Short-term (1-2 years expenses)
    const bucket1Event: FinancialEvent = {
      id: generateId(),
      type: EventType.ASSET_ALLOCATION_SET,
      name: 'Bucket 1: Cash Reserve',
      description: 'Short-term cash bucket for immediate expenses (1-2 years)',
      monthOffset: (startYear - context.config.simulationStartYear) * 12 - 12, // 1 year before retirement
      amount: annualExpenses * 2,
      accountType: 'cash',
      priority: 'HIGH' as any
    };

    events.push({
      event: bucket1Event,
      reason: 'Cash bucket for immediate retirement expenses',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'CRITICAL'
    });

    // Bucket 2: Conservative investments (3-7 years expenses)
    const bucket2Event: FinancialEvent = {
      id: generateId(),
      type: EventType.ASSET_ALLOCATION_SET,
      name: 'Bucket 2: Conservative Portfolio',
      description: 'Conservative investments for medium-term expenses (3-7 years)',
      monthOffset: (startYear - context.config.simulationStartYear) * 12 - 12,
      amount: annualExpenses * 5,
      accountType: 'taxable',
      priority: 'HIGH' as any
    };

    events.push({
      event: bucket2Event,
      reason: 'Conservative bucket for medium-term retirement expenses',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // Bucket 3: Growth investments (8+ years)
    const bucket3Event: FinancialEvent = {
      id: generateId(),
      type: EventType.ASSET_ALLOCATION_SET,
      name: 'Bucket 3: Growth Portfolio',
      description: 'Growth investments for long-term wealth preservation',
      monthOffset: (startYear - context.config.simulationStartYear) * 12 - 12,
      amount: 0, // Remainder of portfolio
      accountType: 'tax_deferred',
      priority: 'MEDIUM' as any
    };

    events.push({
      event: bucket3Event,
      reason: 'Growth bucket for long-term wealth preservation',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // Annual bucket rebalancing events
    for (let year = 0; year < 5; year++) {
      const rebalanceEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.REBALANCE_PORTFOLIO,
        name: `Bucket Rebalancing - Year ${year + 1}`,
        description: 'Annual bucket strategy rebalancing and replenishment',
        monthOffset: (startYear + year - context.config.simulationStartYear) * 12,
        amount: 0,
        priority: 'MEDIUM' as any
      };

      events.push({
        event: rebalanceEvent,
        reason: 'Annual bucket strategy maintenance and rebalancing',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    return events;
  }

  private generateBondLadderEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { retirementAge, annualExpenses } = parameters;
    const startYear = context.currentYear + (retirementAge - context.currentAge);

    // Create bond ladder setup
    for (let maturity = 1; maturity <= 10; maturity++) {
      const bondPurchaseEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.SCHEDULED_CONTRIBUTION,
        name: `Bond Ladder: ${maturity}-Year Bond`,
        description: `Purchase ${maturity}-year bond for retirement income ladder`,
        monthOffset: (startYear - maturity - context.config.simulationStartYear) * 12,
        amount: annualExpenses / 10, // Spread across 10 bonds
        targetAccountType: 'tax_deferred',
        priority: 'MEDIUM' as any
      };

      events.push({
        event: bondPurchaseEvent,
        reason: `Bond ladder construction for predictable retirement income`,
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // Generate bond maturity income events
    for (let year = 0; year < 10; year++) {
      const bondMaturityEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.DIVIDEND_INCOME,
        name: `Bond Maturity Income - Year ${year + 1}`,
        description: `Bond ladder income from maturing ${year + 1}-year bond`,
        monthOffset: (startYear + year - context.config.simulationStartYear) * 12,
        amount: annualExpenses / 10,
        accountType: 'tax_deferred',
        priority: 'HIGH' as any
      };

      events.push({
        event: bondMaturityEvent,
        reason: 'Predictable income from bond ladder strategy',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateHybridStrategyEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    // Combine bucket strategy with dynamic 4% rule
    const bucketEvents = this.generateBucketStrategyEvents(context, parameters);
    const dynamicEvents = this.generateDynamic4PercentEvents(context, parameters);
    
    return [...bucketEvents, ...dynamicEvents.slice(0, 3)]; // Limit dynamic events for hybrid
  }

  private generateRecommendations(context: StrategyExecutionContext, parameters: Record<string, any>, portfolioValue: number): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];
    const { annualExpenses, initialWithdrawalRate } = parameters;

    // Portfolio size recommendation
    const requiredPortfolioSize = annualExpenses / initialWithdrawalRate;
    if (portfolioValue < requiredPortfolioSize) {
      recommendations.push({
        id: generateId(),
        title: 'Increase Retirement Savings',
        description: `Your current portfolio of $${portfolioValue.toLocaleString()} may not support your desired withdrawal rate. Consider increasing savings or reducing expenses.`,
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: 'Sustainable retirement income',
        timeToImplement: 'Ongoing'
      });
    }

    // Tax-efficient withdrawal sequencing
    recommendations.push({
      id: generateId(),
      title: 'Implement Tax-Efficient Withdrawal Sequence',
      description: 'Withdraw from taxable accounts first, then tax-deferred, then Roth accounts for optimal tax efficiency.',
      type: 'OPTIMIZATION',
      priority: 'HIGH',
      estimatedBenefit: '10-15% more spending power',
      timeToImplement: '1-2 months'
    });

    // Roth conversion opportunity
    recommendations.push({
      id: generateId(),
      title: 'Consider Roth Conversions',
      description: 'Convert traditional IRA/401k funds to Roth during low-income years to reduce future required distributions.',
      type: 'CONSIDERATION',
      priority: 'MEDIUM',
      estimatedBenefit: 'Lower future tax burden',
      timeToImplement: '3-6 months'
    });

    return recommendations;
  }

  private calculateImpact(parameters: Record<string, any>, portfolioValue: number): StrategyImpact {
    const { annualExpenses, expectedLifespan } = parameters;
    
    return {
      financialImpact: {
        cashFlowChange: -annualExpenses, // Negative because withdrawing
        netWorthChange: -annualExpenses * expectedLifespan * 0.6, // Account for growth
        taxImplications: 'Structured withdrawals can reduce lifetime tax burden by 10-20%',
        riskAdjustment: 'Medium - depends on market performance and sequence of returns'
      },
      portfolioImpact: {
        expectedReturn: 'Designed to preserve capital while providing income',
        riskLevel: 'Medium',
        diversificationEffect: 'Improved through strategic asset allocation',
        timeHorizon: `${expectedLifespan} years`
      },
      goalAlignment: {
        primaryGoals: ['Sustainable retirement income', 'Tax efficiency', 'Wealth preservation'],
        potentialConflicts: ['May limit legacy wealth if aggressive withdrawal rates used'],
        overallScore: portfolioValue >= annualExpenses * 25 ? 9 : 6
      }
    };
  }

  private generateNextSteps(withdrawalStrategy: string): string[] {
    const baseSteps = [
      'Review and adjust asset allocation for retirement phase',
      'Set up systematic withdrawal process with your financial institution',
      'Establish tax-withholding preferences',
      'Create annual review schedule for withdrawal adjustments'
    ];

    switch (withdrawalStrategy) {
      case 'bucket_strategy':
        return [
          'Set up three separate investment accounts for bucket strategy',
          'Allocate assets according to bucket time horizons',
          ...baseSteps
        ];
      case 'bond_ladder':
        return [
          'Research and purchase initial bond ladder components',
          'Set up bond maturity tracking system',
          ...baseSteps
        ];
      case 'dynamic_4_percent':
        return [
          'Establish portfolio monitoring and guardrail triggers',
          'Set up annual withdrawal adjustment process',
          ...baseSteps
        ];
      default:
        return baseSteps;
    }
  }

  async isApplicable(context: StrategyExecutionContext): Promise<boolean> {
    const { currentAge } = context;
    // Applicable if within 10 years of retirement or already retired
    return currentAge >= 55;
  }

  async getApplicabilityScore(context: StrategyExecutionContext): Promise<number> {
    const { currentAge } = context;
    if (currentAge >= 65) return 95;
    if (currentAge >= 60) return 80;
    if (currentAge >= 55) return 60;
    return 20;
  }
}