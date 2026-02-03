/**
 * Asset Allocation Strategy
 * 
 * Implements sophisticated asset allocation strategies including:
 * - Age-based allocation (100 minus age rule, etc.)
 * - Risk-based allocation based on risk tolerance
 * - Target date fund approach
 * - Custom allocation with factor-based optimization
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

export class AssetAllocationStrategy implements StrategyEngine {
  id = 'asset-allocation';
  name = 'Asset Allocation & Rebalancing Policy';
  category = 'INVESTMENT_STRATEGY' as const;

  config = {
    id: this.id,
    name: this.name,
    description: 'Set your investment mix (stocks/bonds/alternatives), automatic rebalancing schedule, and glide path as you age',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 6, // 6 months to implement
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['asset-allocation', 'diversification', 'risk-management', 'age-based', 'rebalancing', 'glide-path']
  };

  getParameters(): StrategyParameters {
    return {
      allocationStrategy: {
        type: 'selection',
        label: 'Allocation Strategy',
        description: 'Primary asset allocation methodology',
        defaultValue: 'age_based_enhanced',
        options: [
          { value: 'age_based_simple', label: '100 minus Age (Simple)' },
          { value: 'age_based_enhanced', label: '120 minus Age (Enhanced)' },
          { value: 'risk_based', label: 'Risk Tolerance Based' },
          { value: 'target_date', label: 'Target Date Approach' },
          { value: 'glide_path', label: 'Custom Glide Path (Advanced)' },
          { value: 'three_fund', label: 'Three-Fund Portfolio (70/30)' },
          { value: 'factor_based', label: 'Factor-Based Allocation' },
          { value: 'custom', label: 'Custom Static Allocation' }
        ],
        required: true
      },
      riskTolerance: {
        type: 'selection',
        label: 'Risk Tolerance',
        description: 'Your comfort level with investment volatility',
        defaultValue: 'moderate',
        options: [
          { value: 'very_conservative', label: 'Very Conservative (20% stocks)' },
          { value: 'conservative', label: 'Conservative (30% stocks)' },
          { value: 'moderate_conservative', label: 'Moderate Conservative (40% stocks)' },
          { value: 'moderate', label: 'Moderate (60% stocks)' },
          { value: 'moderate_aggressive', label: 'Moderate Aggressive (70% stocks)' },
          { value: 'aggressive', label: 'Aggressive (80% stocks)' },
          { value: 'very_aggressive', label: 'Very Aggressive (90% stocks)' }
        ],
        required: true
      },
      targetRetirementAge: {
        type: 'number',
        label: 'Target Retirement Age',
        description: 'Age when you plan to retire (for target date calculations)',
        defaultValue: 65,
        min: 50,
        max: 75,
        step: 1,
        required: true
      },
      includeInternational: {
        type: 'boolean',
        label: 'Include International Exposure',
        description: 'Include international stocks and bonds in allocation',
        defaultValue: true,
        required: false
      },
      internationalPercentage: {
        type: 'percentage',
        label: 'International Allocation',
        description: 'Percentage of stock allocation for international markets',
        defaultValue: 0.30,
        min: 0,
        max: 0.50,
        step: 0.05,
        required: false
      },
      includeAlternatives: {
        type: 'boolean',
        label: 'Include Alternative Investments',
        description: 'Include REITs, commodities, or other alternatives',
        defaultValue: false,
        required: false
      },
      alternativesPercentage: {
        type: 'percentage',
        label: 'Alternatives Allocation',
        description: 'Percentage allocated to alternative investments',
        defaultValue: 0.10,
        min: 0,
        max: 0.20,
        step: 0.05,
        required: false
      },
      bondDuration: {
        type: 'selection',
        label: 'Bond Duration Preference',
        description: 'Preferred bond duration for fixed income allocation',
        defaultValue: 'intermediate',
        options: [
          { value: 'short', label: 'Short Duration (1-3 years)' },
          { value: 'intermediate', label: 'Intermediate Duration (5-7 years)' },
          { value: 'long', label: 'Long Duration (10+ years)' },
          { value: 'mixed', label: 'Mixed Duration Ladder' }
        ],
        required: false
      },
      taxOptimization: {
        type: 'boolean',
        label: 'Tax-Optimized Placement',
        description: 'Optimize asset placement across taxable and tax-advantaged accounts',
        defaultValue: true,
        required: false
      },
      rebalanceFrequency: {
        type: 'selection',
        label: 'Rebalancing Frequency',
        description: 'How often to review and rebalance allocation',
        defaultValue: 'quarterly',
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'semi_annually', label: 'Semi-Annually' },
          { value: 'annually', label: 'Annually' }
        ],
        required: true
      },
      rebalanceThreshold: {
        type: 'percentage',
        label: 'Rebalance Threshold',
        description: 'Rebalance when allocation drifts by this amount',
        defaultValue: 0.05,
        min: 0.01,
        max: 0.15,
        step: 0.01,
        required: true
      },
      customStockPercentage: {
        type: 'percentage',
        label: 'Custom Stock Allocation',
        description: 'Custom percentage for stocks (only for custom strategy)',
        defaultValue: 0.60,
        min: 0,
        max: 1,
        step: 0.05,
        required: false
      },
      customBondPercentage: {
        type: 'percentage',
        label: 'Custom Bond Allocation',
        description: 'Custom percentage for bonds (only for custom strategy)',
        defaultValue: 0.40,
        min: 0,
        max: 1,
        step: 0.05,
        required: false
      },
      // Glide Path Parameters (only for glide_path strategy)
      glidePathType: {
        type: 'selection',
        label: 'Glide Path Type',
        description: 'Predefined or custom glide path template',
        defaultValue: 'moderate',
        options: [
          { value: 'conservative', label: 'Conservative (Lower starting equity)' },
          { value: 'moderate', label: 'Moderate (Balanced approach)' },
          { value: 'aggressive', label: 'Aggressive (Higher starting equity)' },
          { value: 'target_date', label: 'Target Date Fund Style' },
          { value: 'custom', label: 'Custom (Specify exact percentages)' }
        ],
        required: false
      },
      startingStockPercentage: {
        type: 'percentage',
        label: 'Starting Stock Allocation',
        description: 'Stock percentage at beginning of glide path (typically current age)',
        defaultValue: 0.90,
        min: 0.60,
        max: 1.0,
        step: 0.05,
        required: false
      },
      retirementStockPercentage: {
        type: 'percentage',
        label: 'Retirement Stock Allocation',
        description: 'Stock percentage at retirement age',
        defaultValue: 0.50,
        min: 0.20,
        max: 0.70,
        step: 0.05,
        required: false
      },
      postRetirementStockPercentage: {
        type: 'percentage',
        label: 'Post-Retirement Stock Allocation',
        description: 'Stock percentage 15 years after retirement (final allocation)',
        defaultValue: 0.40,
        min: 0.15,
        max: 0.60,
        step: 0.05,
        required: false
      },
      glidePathSmoothingFactor: {
        type: 'selection',
        label: 'Glide Path Curve Shape',
        description: 'How quickly allocation changes over time',
        defaultValue: 'moderate',
        options: [
          { value: 'aggressive', label: 'Aggressive (Rapid early adjustment)' },
          { value: 'moderate', label: 'Moderate (Steady linear adjustment)' },
          { value: 'conservative', label: 'Conservative (Gradual late adjustment)' }
        ],
        required: false
      },
      glidePathAdjustmentFrequency: {
        type: 'selection',
        label: 'Glide Path Adjustment Frequency',
        description: 'How often to adjust allocation along the glide path',
        defaultValue: 'annually',
        options: [
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'semi_annually', label: 'Semi-Annually' },
          { value: 'annually', label: 'Annually' },
          { value: 'every_2_years', label: 'Every 2 Years' }
        ],
        required: false
      },
      minimumGlidePathAdjustment: {
        type: 'percentage',
        label: 'Minimum Adjustment Threshold',
        description: 'Only adjust allocation if change is at least this amount',
        defaultValue: 0.05,
        min: 0.01,
        max: 0.10,
        step: 0.01,
        required: false
      },
      minimumCashBalance: {
        type: 'number',
        label: 'Minimum Cash Balance',
        description: 'Minimum cash balance to maintain (leave blank for no minimum)',
        defaultValue: undefined,
        min: 0,
        max: 100000,
        step: 1000,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Asset allocation strategy can always be applied
    // It sets the foundation for portfolio management
    reasons.push('Set target asset allocation and automatic rebalancing policy');

    return {
      applicable: true,
      reasons
    };
  }

  async evaluate(context: StrategyExecutionContext, parameters: Record<string, any>): Promise<StrategyResult> {
    const { config, currentEvents, userInputs, currentAge } = context;
    const {
      allocationStrategy,
      riskTolerance,
      targetRetirementAge,
      includeInternational,
      internationalPercentage,
      includeAlternatives,
      alternativesPercentage,
      taxOptimization,
      rebalanceFrequency,
      rebalanceThreshold
    } = parameters;

    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];

    // Calculate target allocation based on strategy
    const targetAllocation = this.calculateTargetAllocation(currentAge, allocationStrategy, parameters);

    // Generate asset allocation implementation events
    generatedEvents.push(...this.generateAllocationEvents(context, targetAllocation, parameters));

    // Generate rebalancing events
    generatedEvents.push(...this.generateRebalancingEvents(context, parameters));

    // Generate recommendations
    recommendations.push(...this.generateAllocationRecommendations(context, targetAllocation, parameters));

    // Validate allocation
    const allocationWarnings = this.validateAllocation(targetAllocation, currentAge, targetRetirementAge);
    warnings.push(...allocationWarnings);

    const estimatedImpact = this.calculateAllocationImpact(targetAllocation, currentAge);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `${allocationStrategy.replace('_', ' ')} Asset Allocation Plan`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps: this.generateAllocationNextSteps(allocationStrategy, targetAllocation)
    };
  }

  private calculateTargetAllocation(currentAge: number, strategy: string, parameters: Record<string, any>): AllocationBreakdown {
    const { riskTolerance, targetRetirementAge, includeInternational, internationalPercentage, 
            includeAlternatives, alternativesPercentage, customStockPercentage, customBondPercentage } = parameters;

    let stockPercentage = 0.60; // Default
    let bondPercentage = 0.40;

    switch (strategy) {
      case 'age_based_simple':
        stockPercentage = Math.max(0.2, Math.min(0.9, (100 - currentAge) / 100));
        bondPercentage = 1 - stockPercentage;
        break;

      case 'age_based_enhanced':
        stockPercentage = Math.max(0.2, Math.min(0.9, (120 - currentAge) / 100));
        bondPercentage = 1 - stockPercentage;
        break;

      case 'risk_based':
        const riskAllocations = {
          very_conservative: { stock: 0.20, bond: 0.80 },
          conservative: { stock: 0.30, bond: 0.70 },
          moderate_conservative: { stock: 0.40, bond: 0.60 },
          moderate: { stock: 0.60, bond: 0.40 },
          moderate_aggressive: { stock: 0.70, bond: 0.30 },
          aggressive: { stock: 0.80, bond: 0.20 },
          very_aggressive: { stock: 0.90, bond: 0.10 }
        };
        const riskAllocation = riskAllocations[riskTolerance as keyof typeof riskAllocations];
        stockPercentage = riskAllocation.stock;
        bondPercentage = riskAllocation.bond;
        break;

      case 'target_date':
        const yearsToRetirement = targetRetirementAge - currentAge;
        stockPercentage = Math.max(0.3, Math.min(0.9, 0.9 - (0.6 / 45) * (45 - yearsToRetirement)));
        bondPercentage = 1 - stockPercentage;
        break;

      case 'three_fund':
        stockPercentage = 0.70;
        bondPercentage = 0.30;
        break;

      case 'factor_based':
        // Tilt toward value and small-cap factors
        stockPercentage = 0.75;
        bondPercentage = 0.25;
        break;

      case 'custom':
        stockPercentage = customStockPercentage;
        bondPercentage = customBondPercentage;
        break;

      case 'glide_path':
        const {
          glidePathType,
          startingStockPercentage,
          retirementStockPercentage,
          postRetirementStockPercentage,
          glidePathSmoothingFactor
        } = parameters;

        // Calculate glide path allocation based on age
        const retirementAge = targetRetirementAge || 65;

        if (currentAge <= retirementAge) {
          // Pre-retirement: Interpolate from starting to retirement allocation
          const progressToRetirement = (currentAge - (retirementAge - 40)) / 40;
          stockPercentage = this.interpolateGlidePath(
            startingStockPercentage,
            retirementStockPercentage,
            Math.max(0, Math.min(1, progressToRetirement)),
            glidePathSmoothingFactor
          );
        } else {
          // Post-retirement: Interpolate from retirement to post-retirement allocation
          const yearsPostRetirement = currentAge - retirementAge;
          const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
          stockPercentage = this.interpolateGlidePath(
            retirementStockPercentage,
            postRetirementStockPercentage,
            progressPostRetirement,
            glidePathSmoothingFactor
          );
        }

        // Apply glide path type presets if not custom
        if (glidePathType !== 'custom') {
          const presets = {
            conservative: { start: 0.70, retirement: 0.40, post: 0.30 },
            moderate: { start: 0.85, retirement: 0.50, post: 0.40 },
            aggressive: { start: 0.95, retirement: 0.60, post: 0.50 },
            target_date: { start: 0.90, retirement: 0.45, post: 0.35 }
          };
          const preset = presets[glidePathType as keyof typeof presets];
          if (preset) {
            if (currentAge <= retirementAge) {
              const progressToRetirement = (currentAge - (retirementAge - 40)) / 40;
              stockPercentage = this.interpolateGlidePath(
                preset.start,
                preset.retirement,
                Math.max(0, Math.min(1, progressToRetirement)),
                glidePathSmoothingFactor
              );
            } else {
              const yearsPostRetirement = currentAge - retirementAge;
              const progressPostRetirement = Math.min(1, yearsPostRetirement / 15);
              stockPercentage = this.interpolateGlidePath(
                preset.retirement,
                preset.post,
                progressPostRetirement,
                glidePathSmoothingFactor
              );
            }
          }
        }

        // Clamp to reasonable bounds
        stockPercentage = Math.max(0.15, Math.min(0.95, stockPercentage));
        bondPercentage = 1 - stockPercentage;
        break;
    }

    // Adjust for alternatives if included
    if (includeAlternatives) {
      const altPercentage = alternativesPercentage;
      stockPercentage = stockPercentage * (1 - altPercentage);
      bondPercentage = bondPercentage * (1 - altPercentage);
    }

    // Break down stock allocation between domestic and international
    const domesticStockPercentage = includeInternational 
      ? stockPercentage * (1 - internationalPercentage)
      : stockPercentage;
    const internationalStockPercentage = includeInternational 
      ? stockPercentage * internationalPercentage 
      : 0;

    return {
      domesticStock: domesticStockPercentage,
      internationalStock: internationalStockPercentage,
      bonds: bondPercentage,
      alternatives: includeAlternatives ? alternativesPercentage : 0,
      cash: Math.max(0, 1 - stockPercentage - bondPercentage - (includeAlternatives ? alternativesPercentage : 0))
    };
  }

  private generateAllocationEvents(context: StrategyExecutionContext, allocation: AllocationBreakdown, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { taxOptimization, allocationStrategy, targetRetirementAge, minimumCashBalance } = parameters;
    const currentAge = context.currentAge || 35;

    // Determine if this is a dynamic strategy that changes over time
    const isDynamicStrategy = ['age_based_simple', 'age_based_enhanced', 'target_date', 'glide_path'].includes(allocationStrategy);

    if (isDynamicStrategy) {
      // For dynamic strategies, create multiple allocation adjustment events over time
      const retirementAge = targetRetirementAge || 65;
      const planningYears = Math.max(30, (retirementAge - currentAge) + 15);

      // Create allocation events every 5 years (or when allocation changes significantly)
      let lastAllocation = allocation;

      for (let year = 0; year <= planningYears; year += 5) {
        const futureAge = currentAge + year;
        const futureAllocation = this.calculateTargetAllocation(futureAge, allocationStrategy, parameters);

        // Check if allocation has changed significantly (more than 3%)
        const allocationChange = Math.abs(
          (futureAllocation.domesticStock + futureAllocation.internationalStock) -
          (lastAllocation.domesticStock + lastAllocation.internationalStock)
        );

        if (year === 0 || allocationChange >= 0.03) {
          const allocationEvent: FinancialEvent = {
            id: generateId(),
            type: EventType.STRATEGY_ASSET_ALLOCATION_SET,
            name: year === 0 ? 'Set Initial Asset Allocation' : `Adjust Asset Allocation - Age ${futureAge}`,
            description: `${year === 0 ? 'Implement' : 'Adjust to'} target allocation: ${Math.round((futureAllocation.domesticStock + futureAllocation.internationalStock) * 100)}% stocks, ${Math.round(futureAllocation.bonds * 100)}% bonds`,
            monthOffset: year * 12 + 1,
            amount: 0,
            priority: year === 0 ? 'HIGH' as any : 'MEDIUM' as any,
            allocation: {
              domesticStock: futureAllocation.domesticStock,
              internationalStock: futureAllocation.internationalStock,
              bonds: futureAllocation.bonds,
              alternatives: futureAllocation.alternatives,
              cash: futureAllocation.cash
            } as any,
            metadata: {
              strategyId: this.id,
              hiddenFromTimeline: true,
              ...(minimumCashBalance !== undefined ? { minimumCashBalance } : {})
            }
          };

          events.push({
            event: allocationEvent,
            reason: year === 0
              ? 'Establish optimal asset allocation based on age, risk tolerance, and goals'
              : `Age-based allocation adjustment as you approach retirement`,
            isEditable: true,
            linkedToStrategy: true,
            importance: year === 0 ? 'CRITICAL' : 'HIGH'
          });

          lastAllocation = futureAllocation;
        }
      }
    } else {
      // For static strategies, create a single allocation event
      const allocationEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.STRATEGY_ASSET_ALLOCATION_SET,
        name: 'Set Target Asset Allocation',
        description: `Implement target allocation: ${Math.round(allocation.domesticStock * 100)}% domestic stocks, ${Math.round(allocation.internationalStock * 100)}% international stocks, ${Math.round(allocation.bonds * 100)}% bonds`,
        monthOffset: 1,
        amount: 0,
        priority: 'HIGH' as any,
        allocation: {
          domesticStock: allocation.domesticStock,
          internationalStock: allocation.internationalStock,
          bonds: allocation.bonds,
          alternatives: allocation.alternatives,
          cash: allocation.cash
        } as any,
        metadata: {
          strategyId: this.id,
          hiddenFromTimeline: true,
          ...(minimumCashBalance !== undefined ? { minimumCashBalance } : {})
        }
      };

      events.push({
        event: allocationEvent,
        reason: 'Establish optimal asset allocation based on risk tolerance and goals',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'CRITICAL'
      });
    }

    // Generate tax-optimized placement events if enabled
    if (taxOptimization) {
      const taxOptimizationEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.ACCOUNT_TRANSFER,
        name: 'Tax-Optimized Asset Placement',
        description: 'Move tax-inefficient assets to tax-advantaged accounts',
        monthOffset: 2,
        amount: 0,
        fromAccountType: 'taxable',
        targetAccountType: 'tax_deferred',
        priority: 'HIGH' as any
      };

      events.push({
        event: taxOptimizationEvent,
        reason: 'Optimize asset placement for tax efficiency',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    return events;
  }

  private generateRebalancingEvents(context: StrategyExecutionContext, parameters: Record<string, any>): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    const { rebalanceFrequency, rebalanceThreshold, targetRetirementAge } = parameters;

    const frequencyMonths = {
      monthly: 1,
      quarterly: 3,
      semi_annually: 6,
      annually: 12
    };

    const monthInterval = frequencyMonths[rebalanceFrequency as keyof typeof frequencyMonths];

    // Calculate planning horizon: from now until 15 years after retirement
    const currentAge = context.currentAge || 35;
    const retirementAge = targetRetirementAge || 65;
    const planningYears = Math.max(30, (retirementAge - currentAge) + 15);
    const planningMonths = planningYears * 12;

    // Generate rebalancing events for the entire planning horizon
    for (let i = 1; i <= Math.floor(planningMonths / monthInterval); i++) {
      const rebalanceEvent: FinancialEvent = {
        id: generateId(),
        type: EventType.REBALANCE_PORTFOLIO,
        name: `Portfolio Rebalancing ${i}`,
        description: `${rebalanceFrequency} portfolio rebalancing to maintain target allocation`,
        monthOffset: i * monthInterval,
        amount: 0,
        rebalanceThreshold: rebalanceThreshold,
        priority: 'MEDIUM' as any,
        metadata: {
          strategyId: this.id,
          hiddenFromTimeline: true
        }
      };

      events.push({
        event: rebalanceEvent,
        reason: `Maintain target asset allocation through ${rebalanceFrequency} rebalancing`,
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    return events;
  }

  private generateAllocationRecommendations(context: StrategyExecutionContext, allocation: AllocationBreakdown, parameters: Record<string, any>): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];
    const { currentAge } = context;
    const { includeInternational, includeAlternatives } = parameters;

    // Age-based recommendations
    if (currentAge < 30 && allocation.domesticStock + allocation.internationalStock < 0.8) {
      recommendations.push({
        id: generateId(),
        title: 'Consider Higher Stock Allocation',
        description: 'At your age, you have a long time horizon and may benefit from a higher stock allocation for growth.',
        type: 'CONSIDERATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Higher long-term returns',
        timeToImplement: 'Immediate'
      });
    }

    if (currentAge > 60 && allocation.bonds < 0.3) {
      recommendations.push({
        id: generateId(),
        title: 'Increase Bond Allocation',
        description: 'As you approach retirement, consider increasing your bond allocation for stability.',
        type: 'CONSIDERATION',
        priority: 'HIGH',
        estimatedBenefit: 'Reduced portfolio volatility',
        timeToImplement: 'Next rebalancing'
      });
    }

    // Diversification recommendations
    if (!includeInternational) {
      recommendations.push({
        id: generateId(),
        title: 'Add International Diversification',
        description: 'International stocks can provide diversification benefits and exposure to global growth.',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Better risk-adjusted returns',
        timeToImplement: '1-2 months'
      });
    }

    // Tax efficiency recommendations
    recommendations.push({
      id: generateId(),
      title: 'Implement Tax-Loss Harvesting',
      description: 'Systematically harvest tax losses in taxable accounts to improve after-tax returns.',
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      estimatedBenefit: '0.5-1%/yr tax alpha',
      timeToImplement: 'Ongoing'
    });

    // Cost optimization
    recommendations.push({
      id: generateId(),
      title: 'Use Low-Cost Index Funds',
      description: 'Minimize investment costs by using low-cost index funds or ETFs for each asset class.',
      type: 'ACTION',
      priority: 'HIGH',
      estimatedBenefit: '0.5-2%/yr cost savings',
      timeToImplement: 'Next investment'
    });

    return recommendations;
  }

  private validateAllocation(allocation: AllocationBreakdown, currentAge: number, retirementAge: number): string[] {
    const warnings: string[] = [];

    // Check total allocation adds to 100%
    const total = allocation.domesticStock + allocation.internationalStock + allocation.bonds + allocation.alternatives + allocation.cash;
    if (Math.abs(total - 1) > 0.01) {
      warnings.push(`Allocation percentages don't add up to 100% (currently ${Math.round(total * 100)}%)`);
    }

    // Age-based warnings
    const totalStock = allocation.domesticStock + allocation.internationalStock;
    const yearsToRetirement = retirementAge - currentAge;

    if (yearsToRetirement <= 5 && totalStock > 0.6) {
      warnings.push('High stock allocation near retirement may increase sequence of returns risk');
    }

    if (yearsToRetirement > 20 && totalStock < 0.7) {
      warnings.push('Conservative allocation early in career may limit long-term growth potential');
    }

    // Concentration warnings
    if (allocation.domesticStock > 0.8) {
      warnings.push('High concentration in domestic stocks - consider international diversification');
    }

    if (allocation.alternatives > 0.2) {
      warnings.push('High alternative allocation may increase complexity and costs');
    }

    return warnings;
  }

  private calculateAllocationImpact(allocation: AllocationBreakdown, currentAge: number): StrategyImpact {
    const totalStock = allocation.domesticStock + allocation.internationalStock;
    const expectedReturn = totalStock * 0.07 + allocation.bonds * 0.03 + allocation.alternatives * 0.06;
    const expectedVolatility = totalStock * 0.15 + allocation.bonds * 0.04 + allocation.alternatives * 0.12;

    return {
      financialImpact: {
        cashFlowChange: 0,
        netWorthChange: 0, // Will depend on portfolio size
        taxImplications: 'Optimized asset placement can improve after-tax returns by 0.5-1.5%/yr',
        riskAdjustment: `Expected annual return: ${(expectedReturn * 100).toFixed(1)}%, volatility: ${(expectedVolatility * 100).toFixed(1)}%`
      },
      portfolioImpact: {
        expectedReturn: `${(expectedReturn * 100).toFixed(1)}%/yr`,
        riskLevel: totalStock > 0.7 ? 'High' : totalStock > 0.4 ? 'Medium' : 'Low',
        diversificationEffect: 'Improved through multi-asset class allocation',
        timeHorizon: 'Long-term (10+ years)'
      },
      goalAlignment: {
        primaryGoals: ['Long-term growth', 'Risk management', 'Diversification'],
        potentialConflicts: totalStock > 0.8 ? ['High short-term volatility'] : [],
        overallScore: 8
      }
    };
  }

  private generateAllocationNextSteps(strategy: string, allocation: AllocationBreakdown): string[] {
    const baseSteps = [
      'Review current portfolio allocation against target',
      'Identify any allocation gaps or overweights',
      'Execute trades to align with target allocation',
      'Set up automatic rebalancing schedule',
      'Monitor allocation drift quarterly'
    ];

    const strategySpecificSteps: Record<string, string[]> = {
      'three_fund': [
        'Select total stock market index fund',
        'Select international stock index fund',
        'Select bond market index fund'
      ],
      'factor_based': [
        'Research value and small-cap factor funds',
        'Determine optimal factor tilts for portfolio',
        'Monitor factor performance and attribution'
      ],
      'target_date': [
        'Select appropriate target date fund',
        'Verify glide path aligns with retirement timeline',
        'Consider supplementing with individual funds if needed'
      ]
    };

    return [
      ...(strategySpecificSteps[strategy] || []),
      ...baseSteps
    ];
  }

  /**
   * Interpolate between two allocation percentages along a glide path
   * @param startValue Starting allocation percentage
   * @param endValue Ending allocation percentage
   * @param progress Progress along the path (0 to 1)
   * @param smoothingFactor Curve shape: 'aggressive', 'moderate', or 'conservative'
   * @returns Interpolated allocation percentage
   */
  private interpolateGlidePath(startValue: number, endValue: number, progress: number, smoothingFactor: string = 'moderate'): number {
    // Apply different curves based on smoothing factor
    let adjustedProgress = progress;

    switch (smoothingFactor) {
      case 'aggressive':
        // Rapid early adjustment, slower later (exponential decay)
        adjustedProgress = 1 - Math.pow(1 - progress, 2);
        break;
      case 'conservative':
        // Slower early adjustment, rapid later (exponential growth)
        adjustedProgress = Math.pow(progress, 2);
        break;
      case 'moderate':
      default:
        // Linear progression
        adjustedProgress = progress;
        break;
    }

    // Linear interpolation with adjusted progress
    return startValue + (endValue - startValue) * adjustedProgress;
  }

  async isApplicable(context: StrategyExecutionContext): Promise<boolean> {
    // Applicable for all investors with investable assets
    return true;
  }

  async getApplicabilityScore(context: StrategyExecutionContext): Promise<number> {
    const { currentAge, currentEvents } = context;
    
    // Higher score for younger investors and those with significant assets
    let score = 70; // Base score
    
    if (currentAge < 40) score += 20;
    if (currentAge < 30) score += 10;
    
    // Check for existing investment events
    const hasInvestments = currentEvents.some(event => 
      event.type === EventType.SCHEDULED_CONTRIBUTION || 
      event.type === EventType.INITIAL_INVESTMENT
    );
    
    if (hasInvestments) score += 10;
    
    return Math.min(100, score);
  }
}

interface AllocationBreakdown {
  domesticStock: number;
  internationalStock: number;
  bonds: number;
  alternatives: number;
  cash: number;
}