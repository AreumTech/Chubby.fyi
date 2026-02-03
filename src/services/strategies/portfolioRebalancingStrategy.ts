/**
 * Portfolio Rebalancing Strategy
 * 
 * Implements sophisticated portfolio rebalancing approaches including:
 * - Threshold-based rebalancing (when allocation drifts)
 * - Calendar-based rebalancing (fixed schedule)
 * - Volatility-based rebalancing (respond to market conditions)
 * - Tax-efficient rebalancing (minimize tax impact)
 * - Smart rebalancing with new contributions
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

export class PortfolioRebalancingStrategy implements StrategyEngine {
  id = 'portfolio-rebalancing';
  name = 'Portfolio Rebalancing Optimizer';
  category = 'ADVANCED_INVESTMENT' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Systematically rebalance portfolio to maintain target allocation and optimize returns',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 12, // 1 year to establish system
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['rebalancing', 'portfolio-management', 'risk-control', 'tax-efficiency', 'systematic-investing']
  };

  getParameters(): StrategyParameters {
    return {
      rebalancingMethod: {
        type: 'selection',
        label: 'Rebalancing Method',
        description: 'Primary rebalancing trigger methodology',
        defaultValue: 'hybrid',
        options: [
          { value: 'threshold', label: 'Threshold-Based (Rebalance when drift exceeds limit)' },
          { value: 'calendar', label: 'Calendar-Based (Fixed schedule)' },
          { value: 'volatility', label: 'Volatility-Based (Respond to market conditions)' },
          { value: 'hybrid', label: 'Hybrid (Threshold + Calendar)' },
          { value: 'contributions', label: 'Contribution-Based (Rebalance with new money)' }
        ],
        required: true
      },
      thresholdPercentage: {
        type: 'percentage',
        label: 'Rebalancing Threshold',
        description: 'Rebalance when any asset class drifts by this percentage',
        defaultValue: 0.05,
        min: 0.01,
        max: 0.20,
        step: 0.01,
        required: true
      },
      calendarFrequency: {
        type: 'selection',
        label: 'Calendar Frequency',
        description: 'Fixed schedule for calendar-based rebalancing',
        defaultValue: 'quarterly',
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'semi_annually', label: 'Semi-Annually' },
          { value: 'annually', label: 'Annually' }
        ],
        required: true
      },
      taxOptimizedRebalancing: {
        type: 'boolean',
        label: 'Tax-Optimized Rebalancing',
        description: 'Prioritize rebalancing in tax-advantaged accounts to minimize taxes',
        defaultValue: true,
        required: false
      },
      minimumTradeSize: {
        type: 'number',
        label: 'Minimum Trade Size ($)',
        description: 'Only execute trades above this dollar amount',
        defaultValue: 1000,
        min: 100,
        max: 10000,
        step: 100,
        required: false
      },
      tradingCostConsideration: {
        type: 'number',
        label: 'Trading Cost Threshold (%)',
        description: 'Skip rebalancing if trading costs exceed this percentage',
        defaultValue: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        required: false
      },
      volatilityThreshold: {
        type: 'percentage',
        label: 'Volatility Threshold',
        description: 'Market volatility level that triggers rebalancing consideration',
        defaultValue: 0.20,
        min: 0.10,
        max: 0.40,
        step: 0.05,
        required: false
      },
      useNewContributions: {
        type: 'boolean',
        label: 'Rebalance with New Contributions',
        description: 'Direct new contributions to underweight asset classes',
        defaultValue: true,
        required: false
      },
      emergencyOverrideThreshold: {
        type: 'percentage',
        label: 'Emergency Override Threshold',
        description: 'Force rebalancing if drift exceeds this extreme threshold',
        defaultValue: 0.15,
        min: 0.10,
        max: 0.30,
        step: 0.05,
        required: false
      },
      accountPriority: {
        type: 'selection',
        label: 'Account Rebalancing Priority',
        description: 'Which accounts to prioritize for rebalancing trades',
        defaultValue: 'tax_advantaged_first',
        options: [
          { value: 'tax_advantaged_first', label: 'Tax-Advantaged Accounts First' },
          { value: 'taxable_first', label: 'Taxable Accounts First' },
          { value: 'largest_drift_first', label: 'Largest Drift First' },
          { value: 'balanced', label: 'Balanced Across All Accounts' }
        ],
        required: true
      },
      seasonalAdjustments: {
        type: 'boolean',
        label: 'Seasonal Adjustments',
        description: 'Consider seasonal patterns and tax-loss harvesting timing',
        defaultValue: true,
        required: false
      }
    };
  }

  async evaluate(context: StrategyExecutionContext, parameters: Record<string, any>): Promise<StrategyResult> {
    const { config, currentEvents, userInputs, currentAge } = context;
    const {
      rebalancingMethod,
      thresholdPercentage,
      calendarFrequency,
      taxOptimizedRebalancing,
      minimumTradeSize,
      useNewContributions
    } = parameters;

    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];

    // Generate rebalancing events based on method
    switch (rebalancingMethod) {
      case 'threshold':
        generatedEvents.push(...this.generateThresholdRebalancingEvents(context, parameters));
        break;
      case 'calendar':
        generatedEvents.push(...this.generateCalendarRebalancingEvents(context, parameters));
        break;
      case 'volatility':
        generatedEvents.push(...this.generateVolatilityRebalancingEvents(context, parameters));
        break;
      case 'hybrid':
        generatedEvents.push(...this.generateHybridRebalancingEvents(context, parameters));
        break;
      case 'contributions':
        generatedEvents.push(...this.generateContributionRebalancingEvents(context, parameters));
        break;
    }

    // Generate monitoring and review events
    generatedEvents.push(...this.generateMonitoringEvents(context, parameters));

    // Generate rebalancing recommendations
    recommendations.push(...this.generateRebalancingRecommendations(context, parameters));

    // Validate rebalancing strategy
    const rebalancingWarnings = this.validateRebalancingStrategy(parameters);
    warnings.push(...rebalancingWarnings);

    const estimatedImpact = this.calculateRebalancingImpact(parameters, currentAge);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `${rebalancingMethod.replace('_', ' ')} Rebalancing Plan`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps: this.generateRebalancingNextSteps(rebalancingMethod)
    };
  }

  private generateThresholdRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { thresholdPercentage, emergencyOverrideThreshold } = parameters;

    // Generate periodic portfolio drift checks
    for (let month = 1; month <= 24; month += 3) { // Check quarterly
      const driftCheckEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.FINANCIAL_MILESTONE,
        name: `Portfolio Drift Check - Month ${month}`,
        description: `Check if any asset class has drifted beyond ${(thresholdPercentage * 100).toFixed(1)}% threshold`,
        monthOffset: month,
        amount: 0,
        rebalanceThreshold: thresholdPercentage,
        emergencyThreshold: emergencyOverrideThreshold,
        priority: 'MEDIUM' as any
      };

      events.push({
        event: driftCheckEvent,
        reason: 'Systematic portfolio drift monitoring for threshold-based rebalancing',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });

      // Generate conditional rebalancing event
      const rebalanceEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.REBALANCE_PORTFOLIO,
        name: `Threshold Rebalancing - Month ${month}`,
        description: `Rebalance portfolio if drift exceeds ${(thresholdPercentage * 100).toFixed(1)}% threshold`,
        monthOffset: month,
        amount: 0,
        rebalanceThreshold: thresholdPercentage,
        priority: 'HIGH' as any
      };

      events.push({
        event: rebalanceEvent,
        reason: 'Maintain target allocation when drift exceeds threshold',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateCalendarRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { calendarFrequency, seasonalAdjustments } = parameters;

    const frequencyMonths = {
      monthly: 1,
      quarterly: 3,
      semi_annually: 6,
      annually: 12
    };

    const monthInterval = frequencyMonths[calendarFrequency as keyof typeof frequencyMonths];

    // Generate regular rebalancing events
    for (let month = monthInterval; month <= 36; month += monthInterval) {
      // Adjust timing for seasonal considerations
      let adjustedMonth = month;
      if (seasonalAdjustments && calendarFrequency === 'annually') {
        // Schedule annual rebalancing in December for tax considerations
        adjustedMonth = Math.floor(month / 12) * 12 + 12;
      }

      const rebalanceEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.REBALANCE_PORTFOLIO,
        name: `${calendarFrequency.replace('_', ' ')} Rebalancing`,
        description: `Scheduled ${calendarFrequency} portfolio rebalancing`,
        monthOffset: adjustedMonth,
        amount: 0,
        priority: 'HIGH' as any
      };

      events.push({
        event: rebalanceEvent,
        reason: `Systematic ${calendarFrequency} rebalancing to maintain target allocation`,
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateVolatilityRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { volatilityThreshold } = parameters;

    // Generate monthly volatility checks
    for (let month = 1; month <= 24; month++) {
      const volatilityCheckEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.FINANCIAL_MILESTONE,
        name: `Market Volatility Assessment - Month ${month}`,
        description: `Assess market volatility and consider rebalancing if above ${(volatilityThreshold * 100).toFixed(0)}%`,
        monthOffset: month,
        amount: 0,
        volatilityThreshold: volatilityThreshold,
        priority: 'LOW' as any
      };

      events.push({
        event: volatilityCheckEvent,
        reason: 'Monitor market volatility for opportunistic rebalancing',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'LOW'
      });
    }

    return events;
  }

  private generateHybridRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    // Combine threshold and calendar approaches
    const thresholdEvents = this.generateThresholdRebalancingEvents(context, parameters);
    const calendarEvents = this.generateCalendarRebalancingEvents(context, parameters);
    
    // Reduce frequency to avoid over-rebalancing
    return [
      ...thresholdEvents.slice(0, Math.ceil(thresholdEvents.length / 2)),
      ...calendarEvents.slice(0, Math.ceil(calendarEvents.length / 2))
    ];
  }

  private generateContributionRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { useNewContributions } = parameters;

    if (!useNewContributions) return events;

    // Generate events to direct new contributions to underweight assets
    for (let month = 1; month <= 24; month += 3) {
      const contributionRebalanceEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.FINANCIAL_MILESTONE,
        name: `Contribution Rebalancing Check - Month ${month}`,
        description: 'Direct new contributions to underweight asset classes',
        monthOffset: month,
        amount: 0,
        priority: 'MEDIUM' as any
      };

      events.push({
        event: contributionRebalanceEvent,
        reason: 'Use new contributions to rebalance portfolio without selling assets',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    return events;
  }

  private generateMonitoringEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];

    // Annual rebalancing strategy review
    for (let year = 1; year <= 3; year++) {
      const reviewEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.FINANCIAL_MILESTONE,
        name: `Annual Rebalancing Strategy Review - Year ${year}`,
        description: 'Review rebalancing strategy effectiveness and make adjustments',
        monthOffset: year * 12,
        amount: 0,
        priority: 'MEDIUM' as any
      };

      events.push({
        event: reviewEvent,
        reason: 'Ensure rebalancing strategy remains optimal and effective',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    return events;
  }

  private generateRebalancingRecommendations(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];
    const { taxOptimizedRebalancing, minimumTradeSize, tradingCostConsideration } = parameters;

    // Tax optimization recommendation
    if (taxOptimizedRebalancing) {
      recommendations.push({
        id: generateId(),
        title: 'Prioritize Tax-Advantaged Account Rebalancing',
        description: 'Focus rebalancing trades in 401(k), IRA, and other tax-advantaged accounts to minimize tax impact.',
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        estimatedBenefit: '0.2-0.8%/yr tax savings',
        timeToImplement: 'Next rebalancing'
      });
    }

    // Cost efficiency recommendation
    recommendations.push({
      id: generateId(),
      title: 'Use Commission-Free ETFs for Rebalancing',
      description: 'Select low-cost, commission-free ETFs to minimize trading costs during rebalancing.',
      type: 'ACTION',
      priority: 'HIGH',
      estimatedBenefit: 'Reduce trading costs by 50-100%',
      timeToImplement: 'Immediate'
    });

    // Automation recommendation
    recommendations.push({
      id: generateId(),
      title: 'Set Up Automatic Rebalancing Alerts',
      description: 'Configure portfolio tracking to alert you when rebalancing thresholds are exceeded.',
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      estimatedBenefit: 'Consistent rebalancing discipline',
      timeToImplement: '1-2 weeks'
    });

    // Contribution-based rebalancing
    recommendations.push({
      id: generateId(),
      title: 'Implement Smart Contribution Allocation',
      description: 'Direct new contributions to underweight asset classes to reduce need for selling.',
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      estimatedBenefit: 'Reduced trading and tax costs',
      timeToImplement: 'Next contribution'
    });

    // Market timing consideration
    recommendations.push({
      id: generateId(),
      title: 'Avoid Emotional Rebalancing Decisions',
      description: 'Stick to systematic rebalancing rules and avoid making changes based on market emotions.',
      type: 'WARNING',
      priority: 'HIGH',
      estimatedBenefit: 'Avoid behavioral investment mistakes',
      timeToImplement: 'Ongoing discipline'
    });

    return recommendations;
  }

  private validateRebalancingStrategy(parameters: Record<string, any>): string[] {
    const warnings: string[] = [];
    const { thresholdPercentage, calendarFrequency, minimumTradeSize, tradingCostConsideration } = parameters;

    // Threshold validation
    if (thresholdPercentage < 0.02) {
      warnings.push('Very low rebalancing threshold may lead to excessive trading and costs');
    }
    if (thresholdPercentage > 0.15) {
      warnings.push('High rebalancing threshold may allow significant allocation drift');
    }

    // Frequency validation
    if (calendarFrequency === 'monthly') {
      warnings.push('Monthly rebalancing may be too frequent and costly for most portfolios');
    }

    // Cost validation
    if (minimumTradeSize < 500) {
      warnings.push('Very low minimum trade size may result in many small, inefficient trades');
    }

    if (tradingCostConsideration > 1.0) {
      warnings.push('High trading cost threshold may prevent beneficial rebalancing');
    }

    return warnings;
  }

  private calculateRebalancingImpact(parameters: Record<string, any>, currentAge: number): StrategyImpact {
    const { rebalancingMethod, thresholdPercentage, calendarFrequency } = parameters;

    // Estimate rebalancing frequency and impact
    const expectedAnnualRebalances = this.estimateRebalancingFrequency(rebalancingMethod, thresholdPercentage, calendarFrequency);
    const riskReductionBenefit = Math.min(0.5, thresholdPercentage * 10); // Lower threshold = more risk control
    const potentialTaxDrag = expectedAnnualRebalances * 0.1; // Rough estimate

    return {
      financialImpact: {
        cashFlowChange: 0,
        netWorthChange: 0,
        taxImplications: `Estimated ${potentialTaxDrag.toFixed(1)}%/yr tax drag from rebalancing activities`,
        riskAdjustment: `${(riskReductionBenefit * 100).toFixed(1)}% reduction in allocation drift risk`
      },
      portfolioImpact: {
        expectedReturn: 'Maintains target allocation for consistent risk/return profile',
        riskLevel: 'Reduced - systematic risk control through rebalancing',
        diversificationEffect: 'Enhanced - prevents concentration in outperforming assets',
        timeHorizon: 'Ongoing portfolio management'
      },
      goalAlignment: {
        primaryGoals: ['Risk control', 'Systematic investing', 'Allocation discipline'],
        potentialConflicts: ['Higher trading costs', 'Potential tax implications'],
        overallScore: 8
      }
    };
  }

  private estimateRebalancingFrequency(method: string, threshold: number, frequency: string): number {
    const baseFrequencies: Record<string, number> = {
      monthly: 12,
      quarterly: 4,
      semi_annually: 2,
      annually: 1
    };

    switch (method) {
      case 'calendar':
        return baseFrequencies[frequency] || 4;
      case 'threshold':
        // Estimate based on threshold - lower threshold = more frequent
        return Math.max(1, Math.min(12, 8 / (threshold * 100)));
      case 'hybrid':
        return (baseFrequencies[frequency] || 4) * 0.7; // Slightly less than pure calendar
      case 'volatility':
        return 2; // Estimate 2 times per year on average
      case 'contributions':
        return 1; // Usually rebalances with contributions rather than selling
      default:
        return 4;
    }
  }

  private generateRebalancingNextSteps(method: string): string[] {
    const baseSteps = [
      'Set up portfolio tracking to monitor allocation drift',
      'Choose low-cost funds/ETFs for each asset class',
      'Configure rebalancing alerts and reminders',
      'Document rebalancing rules and stick to them',
      'Track rebalancing costs and tax implications'
    ];

    const methodSpecificSteps: Record<string, string[]> = {
      'threshold': [
        'Set up automated drift monitoring',
        'Define specific threshold percentages for each asset class',
        'Create rebalancing decision flowchart'
      ],
      'calendar': [
        'Set calendar reminders for rebalancing dates',
        'Plan rebalancing around tax considerations',
        'Prepare standard rebalancing checklist'
      ],
      'volatility': [
        'Set up market volatility monitoring tools',
        'Define volatility thresholds for action',
        'Create opportunistic rebalancing guidelines'
      ],
      'contributions': [
        'Set up automatic contribution allocation rules',
        'Monitor allocation drift from contributions',
        'Plan periodic full rebalancing as backup'
      ]
    };

    return [
      ...(methodSpecificSteps[method] || []),
      ...baseSteps
    ];
  }

  async isApplicable(context: StrategyExecutionContext): Promise<boolean> {
    const { currentEvents } = context;
    // Applicable for investors with existing portfolios
    return currentEvents.some(event => 
      event.type === EventType.SCHEDULED_CONTRIBUTION || 
      event.type === EventType.INITIAL_INVESTMENT
    );
  }

  async getApplicabilityScore(context: StrategyExecutionContext): Promise<number> {
    const { currentAge, currentEvents } = context;
    
    let score = 70; // Base score
    
    // Higher score for investors with multiple asset classes
    const investmentEvents = currentEvents.filter(event => 
      event.type === EventType.SCHEDULED_CONTRIBUTION || 
      event.type === EventType.INITIAL_INVESTMENT
    );
    
    if (investmentEvents.length > 1) score += 20;
    if (investmentEvents.length > 3) score += 10;
    
    // Moderate boost for middle-aged investors (most benefit from systematic rebalancing)
    if (currentAge >= 30 && currentAge <= 55) score += 10;
    
    return Math.min(100, score);
  }
}