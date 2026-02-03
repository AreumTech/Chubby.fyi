/**
 * Glide Path Strategy
 * 
 * Implements automatic asset allocation adjustments over time based on:
 * - Age-based glide paths (becoming more conservative over time)
 * - Target date fund methodology
 * - Custom glide path curves
 * - Life event triggered adjustments
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

export class GlidePathStrategy implements StrategyEngine {
  id = 'glide-path';
  name = 'Glide Path Optimizer';
  category = 'ADVANCED_INVESTMENT' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Automatically adjust asset allocation over time based on age and retirement timeline',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'MEDIUM' as const,
    estimatedTimeframe: 240, // 20 years - long-term strategy
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['glide-path', 'target-date', 'automatic-rebalancing', 'age-based', 'retirement-planning']
  };

  getParameters(): StrategyParameters {
    return {
      glidePathType: {
        type: 'selection',
        label: 'Glide Path Type',
        description: 'Type of glide path methodology to implement',
        defaultValue: 'target_date',
        options: [
          { value: 'conservative', label: 'Conservative (Gradual decrease in stocks)' },
          { value: 'moderate', label: 'Moderate (Standard target date approach)' },
          { value: 'aggressive', label: 'Aggressive (Higher stocks longer)' },
          { value: 'target_date', label: 'Target Date Fund Style' },
          { value: 'custom', label: 'Custom Glide Path' }
        ],
        required: true
      },
      targetRetirementAge: {
        type: 'number',
        label: 'Target Retirement Age',
        description: 'Age when you plan to retire',
        defaultValue: 65,
        min: 50,
        max: 75,
        step: 1,
        required: true
      },
      startingStockPercentage: {
        type: 'percentage',
        label: 'Starting Stock Allocation',
        description: 'Initial stock allocation percentage',
        defaultValue: 0.90,
        min: 0.60,
        max: 1.00,
        step: 0.05,
        required: true
      },
      retirementStockPercentage: {
        type: 'percentage',
        label: 'Retirement Stock Allocation',
        description: 'Target stock allocation at retirement',
        defaultValue: 0.50,
        min: 0.20,
        max: 0.70,
        step: 0.05,
        required: true
      },
      postRetirementStockPercentage: {
        type: 'percentage',
        label: 'Post-Retirement Stock Allocation',
        description: 'Final stock allocation 10 years after retirement',
        defaultValue: 0.40,
        min: 0.15,
        max: 0.60,
        step: 0.05,
        required: true
      },
      adjustmentFrequency: {
        type: 'selection',
        label: 'Adjustment Frequency',
        description: 'How often to review and adjust allocation',
        defaultValue: 'annually',
        options: [
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'semi_annually', label: 'Semi-Annually' },
          { value: 'annually', label: 'Annually' },
          { value: 'every_2_years', label: 'Every 2 Years' }
        ],
        required: true
      },
      minimumAdjustment: {
        type: 'percentage',
        label: 'Minimum Adjustment Threshold',
        description: 'Only adjust if allocation change is at least this amount',
        defaultValue: 0.05,
        min: 0.01,
        max: 0.10,
        step: 0.01,
        required: true
      },
      includeLifeEventAdjustments: {
        type: 'boolean',
        label: 'Include Life Event Adjustments',
        description: 'Automatically adjust for major life events (marriage, children, etc.)',
        defaultValue: true,
        required: false
      },
      smoothingFactor: {
        type: 'selection',
        label: 'Glide Path Smoothing',
        description: 'How gradual the allocation changes should be',
        defaultValue: 'moderate',
        options: [
          { value: 'aggressive', label: 'Aggressive (Sharp changes)' },
          { value: 'moderate', label: 'Moderate (Balanced changes)' },
          { value: 'conservative', label: 'Conservative (Gradual changes)' }
        ],
        required: true
      },
      volatilityAdjustment: {
        type: 'boolean',
        label: 'Market Volatility Adjustments',
        description: 'Temporarily adjust allocation based on market volatility',
        defaultValue: false,
        required: false
      },
      internationalAllocation: {
        type: 'percentage',
        label: 'International Stock Allocation',
        description: 'Percentage of stocks allocated to international markets',
        defaultValue: 0.30,
        min: 0,
        max: 0.50,
        step: 0.05,
        required: false
      }
    };
  }

  async evaluate(context: StrategyExecutionContext, parameters: Record<string, any>): Promise<StrategyResult> {
    const { config, currentEvents, userInputs, currentAge } = context;
    const {
      glidePathType,
      targetRetirementAge,
      startingStockPercentage,
      retirementStockPercentage,
      postRetirementStockPercentage,
      adjustmentFrequency,
      minimumAdjustment,
      includeLifeEventAdjustments
    } = parameters;

    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];

    // Calculate glide path curve
    const glidePath = this.calculateGlidePath(currentAge, targetRetirementAge, glidePathType, parameters);

    // Generate allocation adjustment events
    generatedEvents.push(...this.generateGlidePathEvents(context, glidePath, parameters));

    // Generate life event adjustment events if enabled
    if (includeLifeEventAdjustments) {
      generatedEvents.push(...this.generateLifeEventAdjustments(context, parameters));
    }

    // Generate recommendations
    recommendations.push(...this.generateGlidePathRecommendations(context, glidePath, parameters));

    // Validate glide path
    const glidePathWarnings = this.validateGlidePath(glidePath, currentAge, targetRetirementAge);
    warnings.push(...glidePathWarnings);

    const estimatedImpact = this.calculateGlidePathImpact(glidePath, currentAge, targetRetirementAge);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `${glidePathType.replace('_', ' ')} Glide Path Plan`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps: this.generateGlidePathNextSteps(glidePathType)
    };
  }

  private calculateGlidePath(currentAge: number, retirementAge: number, glidePathType: string, parameters: Record<string, any>): GlidePathPoint[] {
    const { startingStockPercentage, retirementStockPercentage, postRetirementStockPercentage, smoothingFactor } = parameters;
    const glidePath: GlidePathPoint[] = [];

    const yearsToRetirement = retirementAge - currentAge;
    const totalYears = Math.max(30, yearsToRetirement + 15); // Plan 15 years post-retirement

    for (let year = 0; year <= totalYears; year++) {
      const age = currentAge + year;
      let stockPercentage = startingStockPercentage;

      if (age <= retirementAge) {
        // Pre-retirement phase
        const progressToRetirement = (age - currentAge) / yearsToRetirement;
        stockPercentage = this.interpolateAllocation(
          startingStockPercentage,
          retirementStockPercentage,
          progressToRetirement,
          glidePathType,
          smoothingFactor
        );
      } else {
        // Post-retirement phase
        const yearsPostRetirement = age - retirementAge;
        const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
        stockPercentage = this.interpolateAllocation(
          retirementStockPercentage,
          postRetirementStockPercentage,
          progressPostRetirement,
          glidePathType,
          smoothingFactor
        );
      }

      glidePath.push({
        age,
        year: currentAge + year,
        stockPercentage: Math.max(0.15, Math.min(0.95, stockPercentage)),
        bondPercentage: 1 - stockPercentage
      });
    }

    return glidePath;
  }

  private interpolateAllocation(start: number, end: number, progress: number, glidePathType: string, smoothingFactor: string): number {
    // Apply different curve shapes based on glide path type and smoothing
    let adjustedProgress = progress;

    switch (glidePathType) {
      case 'aggressive':
        // Stay high in stocks longer, then drop more quickly
        adjustedProgress = Math.pow(progress, 2);
        break;
      case 'conservative':
        // Gradual decline from the start
        adjustedProgress = Math.sqrt(progress);
        break;
      case 'target_date':
        // Standard S-curve
        adjustedProgress = 3 * Math.pow(progress, 2) - 2 * Math.pow(progress, 3);
        break;
    }

    // Apply smoothing factor
    switch (smoothingFactor) {
      case 'aggressive':
        adjustedProgress = Math.pow(adjustedProgress, 1.5);
        break;
      case 'conservative':
        adjustedProgress = Math.pow(adjustedProgress, 0.7);
        break;
      // 'moderate' uses the base curve
    }

    return start + (end - start) * adjustedProgress;
  }

  private generateGlidePathEvents(context: StrategyExecutionContext, glidePath: GlidePathPoint[], parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { adjustmentFrequency, minimumAdjustment, internationalAllocation } = parameters;

    const frequencyYears = {
      quarterly: 0.25,
      semi_annually: 0.5,
      annually: 1,
      every_2_years: 2
    };

    const yearInterval = frequencyYears[adjustmentFrequency as keyof typeof frequencyYears];
    let lastStockPercentage = glidePath[0].stockPercentage;

    // Generate periodic allocation adjustment events
    for (let i = 0; i < glidePath.length; i += Math.ceil(yearInterval)) {
      const point = glidePath[i];
      const allocationChange = Math.abs(point.stockPercentage - lastStockPercentage);

      // Only create event if change exceeds minimum threshold
      if (allocationChange >= minimumAdjustment || i === 0) {
        const domesticStock = point.stockPercentage * (1 - internationalAllocation);
        const internationalStock = point.stockPercentage * internationalAllocation;

        const adjustmentEvent: FinancialEvent = {
          id: generateId(),
          type: EventType.STRATEGY_ASSET_ALLOCATION_SET,
          name: `Glide Path Adjustment - Age ${point.age}`,
          description: `Adjust allocation to ${Math.round(point.stockPercentage * 100)}% stocks, ${Math.round(point.bondPercentage * 100)}% bonds`,
          monthOffset: (point.year - context.config.simulationStartYear) * 12,
          amount: 0,
          allocation: {
            domesticStock,
            internationalStock,
            bonds: point.bondPercentage,
            alternatives: 0,
            cash: 0
          } as any,
          priority: 'MEDIUM' as any
        };

        events.push({
          event: adjustmentEvent,
          reason: `Automatic glide path adjustment for age ${point.age}`,
          isEditable: true,
          linkedToStrategy: true,
          importance: allocationChange >= 0.1 ? 'HIGH' : 'MEDIUM'
        });

        lastStockPercentage = point.stockPercentage;
      }
    }

    return events;
  }

  private generateLifeEventAdjustments(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { currentAge } = context;

    // Common life events that might trigger allocation adjustments
    const lifeEvents = [
      { age: 30, event: 'Marriage/Partnership', adjustment: -0.05 },
      { age: 32, event: 'First Child', adjustment: -0.10 },
      { age: 35, event: 'Home Purchase', adjustment: -0.05 },
      { age: 40, event: 'Career Peak', adjustment: 0.05 },
      { age: 50, event: 'Pre-Retirement Planning', adjustment: -0.10 },
      { age: 55, event: 'College Planning Peak', adjustment: -0.15 }
    ];

    lifeEvents.forEach(({ age, event, adjustment }) => {
      if (age > currentAge && age < parameters.targetRetirementAge) {
        const adjustmentEvent: FinancialEvent = {
          id: generateId(),
          type: EventType.FINANCIAL_MILESTONE,
          name: `Life Event Check: ${event}`,
          description: `Review and potentially adjust allocation for ${event.toLowerCase()}`,
          monthOffset: (age - currentAge) * 12,
          amount: 0,
          priority: 'LOW' as any
        };

        events.push({
          event: adjustmentEvent,
          reason: `Life event milestone that may warrant allocation review`,
          isEditable: true,
          linkedToStrategy: true,
          importance: 'LOW'
        });
      }
    });

    return events;
  }

  private generateGlidePathRecommendations(context: StrategyExecutionContext, glidePath: GlidePathPoint[], parameters: Record<string, any>): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];
    const { currentAge } = context;
    const { targetRetirementAge } = parameters;

    // Current allocation recommendation
    const currentAllocation = glidePath[0];
    recommendations.push({
      id: generateId(),
      title: 'Implement Initial Glide Path Allocation',
      description: `Start with ${Math.round(currentAllocation.stockPercentage * 100)}% stocks and ${Math.round(currentAllocation.bondPercentage * 100)}% bonds based on your age and retirement timeline.`,
      type: 'ACTION',
      priority: 'HIGH',
      estimatedBenefit: 'Age-appropriate risk/return profile',
      timeToImplement: 'Immediate'
    });

    // Automation recommendation
    recommendations.push({
      id: generateId(),
      title: 'Automate Glide Path Adjustments',
      description: 'Set up automatic allocation adjustments to reduce the need for manual intervention.',
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      estimatedBenefit: 'Consistent allocation management',
      timeToImplement: '1-2 months'
    });

    // Mid-career recommendation
    if (currentAge < 45 && targetRetirementAge - currentAge > 15) {
      recommendations.push({
        id: generateId(),
        title: 'Consider Higher Initial Stock Allocation',
        description: 'With a long time horizon, you may benefit from a higher initial stock allocation for growth.',
        type: 'CONSIDERATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Higher long-term returns',
        timeToImplement: 'Next rebalancing'
      });
    }

    // Pre-retirement recommendation
    if (targetRetirementAge - currentAge <= 10) {
      recommendations.push({
        id: generateId(),
        title: 'Plan for Sequence of Returns Risk',
        description: 'Consider strategies to protect against poor market returns in early retirement.',
        type: 'WARNING',
        priority: 'HIGH',
        estimatedBenefit: 'Retirement security',
        timeToImplement: '6-12 months'
      });
    }

    return recommendations;
  }

  private validateGlidePath(glidePath: GlidePathPoint[], currentAge: number, retirementAge: number): string[] {
    const warnings: string[] = [];

    // Check for reasonable starting allocation
    const startingStock = glidePath[0].stockPercentage;
    if (startingStock > 0.95) {
      warnings.push('Starting stock allocation is very high - consider some bond allocation for stability');
    }
    if (startingStock < 0.6 && currentAge < 40) {
      warnings.push('Starting stock allocation may be too conservative for your age');
    }

    // Check glide path slope
    const retirementIndex = glidePath.findIndex(p => p.age >= retirementAge);
    if (retirementIndex > 0) {
      const totalStockReduction = startingStock - glidePath[retirementIndex].stockPercentage;
      const yearsToRetirement = retirementAge - currentAge;
      const annualReduction = totalStockReduction / yearsToRetirement;

      if (annualReduction > 0.03) {
        warnings.push('Glide path may be too aggressive - large annual allocation changes');
      }
      if (annualReduction < 0.005) {
        warnings.push('Glide path may be too conservative - minimal allocation changes over time');
      }
    }

    // Check final allocation
    const finalStock = glidePath[glidePath.length - 1].stockPercentage;
    if (finalStock < 0.2) {
      warnings.push('Final stock allocation may be too conservative for longevity risk');
    }
    if (finalStock > 0.6) {
      warnings.push('Final stock allocation may be too aggressive for retirement');
    }

    return warnings;
  }

  private calculateGlidePathImpact(glidePath: GlidePathPoint[], currentAge: number, retirementAge: number): StrategyImpact {
    // Calculate weighted average expected return over time
    let weightedReturn = 0;
    let weightedVolatility = 0;
    
    glidePath.forEach((point, index) => {
      const weight = 1 / glidePath.length; // Equal weighting for simplicity
      const expectedReturn = point.stockPercentage * 0.07 + point.bondPercentage * 0.03;
      const expectedVolatility = point.stockPercentage * 0.15 + point.bondPercentage * 0.04;
      
      weightedReturn += expectedReturn * weight;
      weightedVolatility += expectedVolatility * weight;
    });

    return {
      financialImpact: {
        cashFlowChange: 0,
        netWorthChange: 0, // Depends on portfolio size
        taxImplications: 'Gradual allocation changes may minimize taxable rebalancing events',
        riskAdjustment: `Average expected return: ${(weightedReturn * 100).toFixed(1)}%, volatility: ${(weightedVolatility * 100).toFixed(1)}%`
      },
      portfolioImpact: {
        expectedReturn: `${(weightedReturn * 100).toFixed(1)}%/yr (decreasing over time)`,
        riskLevel: 'Decreasing from High to Medium over time',
        diversificationEffect: 'Maintains diversification while adjusting risk level',
        timeHorizon: `${retirementAge - currentAge + 15} years`
      },
      goalAlignment: {
        primaryGoals: ['Age-appropriate risk management', 'Automatic portfolio evolution', 'Retirement readiness'],
        potentialConflicts: ['May reduce flexibility for tactical adjustments'],
        overallScore: 8
      }
    };
  }

  private generateGlidePathNextSteps(glidePathType: string): string[] {
    const baseSteps = [
      'Review proposed glide path allocation curve',
      'Set up initial target allocation',
      'Establish automatic rebalancing schedule',
      'Create calendar reminders for allocation reviews',
      'Monitor allocation drift between adjustments'
    ];

    const typeSpecificSteps: Record<string, string[]> = {
      'target_date': [
        'Consider target date funds as simplified implementation',
        'Compare target date fund glide paths with custom approach'
      ],
      'custom': [
        'Document custom glide path rationale',
        'Set specific milestone dates for major adjustments',
        'Plan for life event allocation reviews'
      ],
      'aggressive': [
        'Monitor sequence of returns risk as retirement approaches',
        'Consider backup plans if markets underperform'
      ]
    };

    return [
      ...(typeSpecificSteps[glidePathType] || []),
      ...baseSteps
    ];
  }

  async isApplicable(context: StrategyExecutionContext): Promise<boolean> {
    const { currentAge } = context;
    // Most applicable for long-term investors
    return currentAge < 60;
  }

  async getApplicabilityScore(context: StrategyExecutionContext): Promise<number> {
    const { currentAge, currentEvents } = context;
    
    let score = 60; // Base score
    
    // Higher score for younger investors
    if (currentAge < 30) score += 30;
    else if (currentAge < 40) score += 20;
    else if (currentAge < 50) score += 10;
    
    // Check for existing investments
    const hasInvestments = currentEvents.some(event => 
      event.type === EventType.SCHEDULED_CONTRIBUTION || 
      event.type === EventType.INITIAL_INVESTMENT
    );
    
    if (hasInvestments) score += 10;
    
    return Math.min(100, score);
  }
}

interface GlidePathPoint {
  age: number;
  year: number;
  stockPercentage: number;
  bondPercentage: number;
}