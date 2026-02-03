/**
 * Cash Buffer Strategy
 * 
 * Automated cash buffer management strategy for retirement planning.
 * Maintains optimal cash reserves during retirement to avoid premature withdrawals.
 */

import { generateId } from '../../utils/formatting';
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

export class CashBufferStrategy implements StrategyEngine {
  id = 'cash-buffer-strategy';
  name = 'Retirement Cash Buffer Management';
  category = 'RETIREMENT_OPTIMIZATION' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Maintain optimal cash reserves during retirement to minimize sequence of returns risk and avoid premature withdrawals',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 1, // Immediate implementation
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['retirement', 'cash-management', 'withdrawal-strategy', 'sequence-risk', 'liquidity']
  };

  getParameters(): StrategyParameters {
    return {
      bufferMonths: {
        type: 'number',
        label: 'Cash Buffer (Months of Expenses)',
        description: 'Number of months of retirement expenses to keep in cash',
        defaultValue: 12,
        min: 6,
        max: 24,
        step: 1,
        required: true
      },
      retirementExpenses: {
        type: 'number',
        label: 'Monthly Retirement Expenses',
        description: 'Expected monthly expenses during retirement',
        defaultValue: 8000,
        min: 2000,
        max: 25000,
        step: 250,
        required: true
      },
      glidePath: {
        type: 'selection',
        label: 'Buffer Glide Path',
        description: 'How cash buffer changes over retirement years',
        defaultValue: 'static',
        options: [
          { value: 'static', label: 'Static - Same buffer throughout retirement' },
          { value: 'declining', label: 'Declining - Reduce buffer over time' },
          { value: 'rising', label: 'Rising - Increase buffer with age' }
        ],
        required: true
      },
      replenishmentTrigger: {
        type: 'percentage',
        label: 'Replenishment Trigger',
        description: 'Replenish cash buffer when it drops below this percentage of target',
        defaultValue: 0.75,
        min: 0.50,
        max: 0.95,
        step: 0.05,
        required: true
      },
      marketConditionOverride: {
        type: 'boolean',
        label: 'Market Condition Override',
        description: 'Increase cash buffer during market downturns',
        defaultValue: true,
        required: false
      },
      highYieldCash: {
        type: 'boolean',
        label: 'High-Yield Cash Management',
        description: 'Use high-yield savings for cash buffer to maximize returns',
        defaultValue: true,
        required: false
      },
      ladderCDs: {
        type: 'boolean',
        label: 'CD Ladder for Buffer',
        description: 'Use CD ladder for portion of cash buffer to increase yield',
        defaultValue: false,
        required: false
      },
      inflationAdjustment: {
        type: 'boolean',
        label: 'Annual Inflation Adjustment',
        description: 'Automatically adjust cash buffer target for inflation',
        defaultValue: true,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check if user is in or approaching retirement
    const retirementAge = 65; // Standard retirement age
    const isNearRetirement = context.currentAge >= retirementAge - 5;
    
    if (!isNearRetirement) {
      reasons.push('Cash buffer strategy is most applicable within 5 years of retirement');
    }

    // Check if user has retirement savings
    const hasRetirementSavings = context.currentEvents.some(event => 
      event.type === '401K_CONTRIBUTION' || 
      event.type === 'IRA_CONTRIBUTION' || 
      event.type === 'ROTH_CONVERSION'
    );
    
    if (!hasRetirementSavings) {
      reasons.push('No retirement savings events found - cash buffer strategy requires existing retirement accounts');
    }

    // Check if user has withdrawal strategies
    const hasWithdrawalStrategy = context.currentEvents.some(event => 
      event.type === 'WITHDRAWAL' || event.type === 'RMD'
    );

    return {
      applicable: reasons.length === 0 || isNearRetirement,
      reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // Default inputs with user preferences
    const bufferMonths = context.userInputs?.bufferMonths || 12;
    const monthlyExpenses = context.userInputs?.retirementExpenses || 8000;
    const glidePath = context.userInputs?.glidePath || 'static';
    const replenishmentTrigger = context.userInputs?.replenishmentTrigger || 0.75;
    const marketConditionOverride = context.userInputs?.marketConditionOverride ?? true;
    const highYieldCash = context.userInputs?.highYieldCash ?? true;
    const ladderCDs = context.userInputs?.ladderCDs || false;
    const inflationAdjustment = context.userInputs?.inflationAdjustment ?? true;
    
    const currentYear = new Date().getFullYear();
    const retirementYear = currentYear + Math.max(0, 65 - context.currentAge);
    
    // Calculate cash buffer target
    const baseBufferTarget = bufferMonths * monthlyExpenses;
    
    // 1. Generate cash buffer establishment event
    const bufferEstablishmentEvent = this.generateCashBufferEstablishment(
      retirementYear,
      baseBufferTarget,
      monthlyExpenses,
      bufferMonths
    );
    
    generatedEvents.push({
      event: bufferEstablishmentEvent,
      reason: `Establish ${bufferMonths}-month cash buffer (${baseBufferTarget.toLocaleString()}) to support retirement withdrawals`,
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // 2. Generate automated replenishment system
    const replenishmentEvent = this.generateBufferReplenishmentSystem(
      retirementYear,
      baseBufferTarget,
      replenishmentTrigger,
      monthlyExpenses
    );
    
    generatedEvents.push({
      event: replenishmentEvent,
      reason: `Automated replenishment when cash buffer drops below ${(replenishmentTrigger * 100).toFixed(0)}% of target`,
      isEditable: true,
      linkedToStrategy: true,
      importance: 'HIGH'
    });

    // 3. High-yield cash optimization
    if (highYieldCash) {
      const highYieldEvent = this.generateHighYieldCashOptimization(
        retirementYear,
        baseBufferTarget
      );
      
      generatedEvents.push({
        event: highYieldEvent,
        reason: 'Optimize cash buffer returns with high-yield savings accounts',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // 4. CD ladder for enhanced yield
    if (ladderCDs && baseBufferTarget > 50000) {
      const cdLadderEvent = this.generateCDLadderForBuffer(
        retirementYear,
        Math.min(baseBufferTarget * 0.5, 100000), // Max 50% in CDs or $100k
        bufferMonths
      );
      
      generatedEvents.push({
        event: cdLadderEvent,
        reason: 'CD ladder for portion of cash buffer to increase yield while maintaining liquidity',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // 5. Market condition monitoring
    if (marketConditionOverride) {
      const marketMonitoringEvent = this.generateMarketConditionMonitoring(
        retirementYear,
        baseBufferTarget,
        monthlyExpenses
      );
      
      generatedEvents.push({
        event: marketMonitoringEvent,
        reason: 'Increase cash buffer during market downturns to reduce sequence of returns risk',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    // 6. Annual review and adjustment
    if (inflationAdjustment) {
      const adjustmentEvent = this.generateAnnualAdjustmentReview(
        retirementYear,
        bufferMonths,
        monthlyExpenses,
        glidePath
      );
      
      generatedEvents.push({
        event: adjustmentEvent,
        reason: 'Annual review and inflation adjustment of cash buffer target',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // Generate recommendations
    recommendations.push(
      {
        id: generateId(),
        title: 'Coordinate with Withdrawal Strategy',
        description: 'Ensure cash buffer strategy works seamlessly with your chosen withdrawal strategy (4% rule, bucket strategy, etc.)',
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: 'Reduced sequence of returns risk',
        timeToImplement: '2-3 hours',
        difficulty: 'MODERATE'
      },
      {
        id: generateId(),
        title: 'Model Different Market Scenarios',
        description: 'Test cash buffer strategy against historical bear market scenarios to validate adequacy',
        type: 'CONSIDERATION',
        priority: 'HIGH',
        estimatedBenefit: 'Confidence in retirement plan resilience',
        timeToImplement: '4-6 hours',
        difficulty: 'MODERATE'
      },
      {
        id: generateId(),
        title: 'Optimize Cash Yield',
        description: 'Regularly shop for best high-yield savings rates to maximize cash buffer returns',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        estimatedBenefit: `$${Math.round(baseBufferTarget * 0.02)} extra annually`,
        timeToImplement: '1-2 hours quarterly',
        difficulty: 'EASY'
      }
    );

    // Warnings
    if (bufferMonths > 18) {
      warnings.push('Large cash buffer may create opportunity cost - consider if full amount needs to be in cash');
    }

    if (baseBufferTarget > 200000) {
      warnings.push('Large cash buffer may exceed FDIC insurance limits - consider spreading across multiple institutions');
    }

    if (context.currentAge < 60) {
      warnings.push('Cash buffer strategy may be premature - focus on accumulation strategies first');
    }

    // Next steps
    nextSteps.push(
      'Calculate precise monthly retirement expenses',
      'Research high-yield savings accounts and CD rates',
      'Integrate with existing withdrawal strategy',
      'Set up automatic monitoring and alerts',
      'Plan transition from accumulation to cash buffer phase'
    );

    const estimatedImpact = await this.estimateImpact(context);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `Cash Buffer Strategy - ${bufferMonths} Month Reserve`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const bufferMonths = context.userInputs?.bufferMonths || 12;
    const monthlyExpenses = context.userInputs?.retirementExpenses || 8000;
    const baseBufferTarget = bufferMonths * monthlyExpenses;
    
    // Cash buffer reduces sequence of returns risk but has opportunity cost
    const highYieldAPY = 0.045; // 4.5% high-yield savings
    const marketReturnAssumption = 0.07; // 7% market returns
    const opportunityCost = (marketReturnAssumption - highYieldAPY) * baseBufferTarget;
    
    // Sequence of returns protection value (estimated)
    const sequenceRiskProtection = baseBufferTarget * 0.15; // 15% protection value

    return {
      cashFlowImpact: {
        monthlyChange: 0, // No monthly change once established
        annualChange: baseBufferTarget * highYieldAPY, // Annual interest earnings
        firstYearTotal: -baseBufferTarget // Initial cash allocation
      },
      netWorthImpact: {
        fiveYearProjection: -opportunityCost * 5 + sequenceRiskProtection,
        tenYearProjection: -opportunityCost * 10 + sequenceRiskProtection * 2,
        retirementImpact: sequenceRiskProtection * 3 // Significant protection value
      },
      taxImpact: {
        annualTaxSavings: 0, // Interest is taxable
        lifetimeTaxSavings: 0
      },
      riskFactors: [
        {
          factor: 'Opportunity cost of cash',
          severity: 'MEDIUM',
          mitigation: 'Use high-yield accounts and consider partial CD ladders'
        },
        {
          factor: 'Inflation erosion',
          severity: 'MEDIUM',
          mitigation: 'Annual review and adjustment for inflation'
        },
        {
          factor: 'Sequence of returns risk',
          severity: 'LOW',
          mitigation: 'Cash buffer provides significant protection during market downturns'
        }
      ]
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (inputs.bufferMonths < 6 || inputs.bufferMonths > 24) {
      errors.bufferMonths = 'Cash buffer should be between 6-24 months of expenses';
    }

    if (inputs.retirementExpenses <= 1000) {
      errors.retirementExpenses = 'Monthly retirement expenses seem unrealistically low';
    }

    if (inputs.retirementExpenses > 30000) {
      errors.retirementExpenses = 'Monthly retirement expenses seem very high - please verify';
    }

    if (inputs.replenishmentTrigger < 0.5 || inputs.replenishmentTrigger > 0.95) {
      errors.replenishmentTrigger = 'Replenishment trigger should be between 50% and 95%';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Helper methods

  private generateCashBufferEstablishment(
    year: number,
    targetAmount: number,
    monthlyExpenses: number,
    bufferMonths: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Retirement Cash Buffer Establishment',
      description: `Establish ${bufferMonths}-month cash buffer for retirement withdrawals`,
      type: 'CASH_BUFFER_SETUP',
      startDate: new Date(year, 0, 1),
      amount: targetAmount,
      targetAccountType: 'cash',
      priority: 'high',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetAmount,
        monthlyExpenses,
        bufferMonths,
        purpose: 'sequence_risk_mitigation',
        liquidityRequirement: 'immediate',
        notes: `Retirement cash buffer to support withdrawal strategy and reduce sequence of returns risk`
      }
    } as FinancialEvent;
  }

  private generateBufferReplenishmentSystem(
    year: number,
    targetAmount: number,
    replenishmentTrigger: number,
    monthlyExpenses: number
  ): FinancialEvent {
    const triggerAmount = targetAmount * replenishmentTrigger;
    
    return {
      id: generateId(),
      name: 'Cash Buffer Replenishment System',
      description: `Automatically replenish cash buffer when below ${(replenishmentTrigger * 100).toFixed(0)}% of target`,
      type: 'BUFFER_REPLENISHMENT',
      startDate: new Date(year, 0, 1),
      isRecurring: true,
      frequency: 'monthly',
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetAmount,
        triggerAmount,
        replenishmentTrigger,
        monthlyExpenses,
        replenishmentSource: 'investment_accounts',
        replenishmentStrategy: 'tax_efficient_sequence',
        maxMonthlyReplenishment: monthlyExpenses * 3,
        alertThresholds: [
          { balance: triggerAmount, alertType: 'replenishment_needed' },
          { balance: targetAmount * 0.5, alertType: 'critical_low' },
          { balance: targetAmount * 0.25, alertType: 'emergency_low' }
        ],
        notes: 'Maintains optimal cash buffer through automated monitoring and replenishment'
      }
    } as FinancialEvent;
  }

  private generateHighYieldCashOptimization(
    year: number,
    targetAmount: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'High-Yield Cash Buffer Optimization',
      description: 'Optimize cash buffer returns with high-yield savings accounts',
      type: 'ACCOUNT_OPTIMIZATION',
      startDate: new Date(year, 0, 1),
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetAmount,
        targetAPY: 0.045, // 4.5% target
        accountType: 'high_yield_savings',
        features: [
          'FDIC insured up to $250,000',
          'No minimum balance requirements',
          'Mobile/online access',
          'Instant transfers',
          'Competitive rates'
        ],
        fdic_strategy: {
          multipleInstitutions: targetAmount > 200000,
          institutionLimit: 250000,
          recommendedSplit: targetAmount > 250000 ? 'multiple_banks' : 'single_bank'
        },
        notes: 'Maximize cash buffer returns while maintaining full liquidity and FDIC protection'
      }
    } as FinancialEvent;
  }

  private generateCDLadderForBuffer(
    year: number,
    ladderAmount: number,
    totalBufferMonths: number
  ): FinancialEvent {
    const segments = Math.min(4, totalBufferMonths / 3); // Max 4 segments, 3+ months each
    
    return {
      id: generateId(),
      name: 'Cash Buffer CD Ladder',
      description: `CD ladder for ${ladderAmount.toLocaleString()} of cash buffer to enhance yield`,
      type: 'CD_LADDER_SETUP',
      startDate: new Date(year, 0, 1),
      amount: ladderAmount,
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        ladderAmount,
        segments,
        ladderStructure: [
          { term: '6_month', amount: ladderAmount * 0.25, apy: 0.050 },
          { term: '12_month', amount: ladderAmount * 0.25, apy: 0.055 },
          { term: '18_month', amount: ladderAmount * 0.25, apy: 0.058 },
          { term: '24_month', amount: ladderAmount * 0.25, apy: 0.060 }
        ],
        rolloverStrategy: 'automatic_to_longest_term',
        emergencyAccess: {
          earlyWithdrawal: 'penalty_applies',
          gracePeriod: '10_calendar_days',
          penaltyMitigation: 'staggered_maturity'
        },
        yieldBenefit: 0.01, // ~1% higher than savings
        liquidityTrade: 'partial_liquidity_for_higher_yield',
        notes: 'Portion of cash buffer in CD ladder for enhanced yield while maintaining emergency access'
      }
    } as FinancialEvent;
  }

  private generateMarketConditionMonitoring(
    year: number,
    baseBufferTarget: number,
    monthlyExpenses: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Market Condition Buffer Override',
      description: 'Increase cash buffer during market downturns for sequence risk protection',
      type: 'MARKET_CONDITION_MONITOR',
      startDate: new Date(year, 0, 1),
      isRecurring: true,
      frequency: 'monthly',
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        baseBufferTarget,
        monthlyExpenses,
        marketTriggers: [
          {
            condition: 'market_decline_10_percent',
            action: 'increase_buffer_25_percent',
            duration: '6_months_or_recovery'
          },
          {
            condition: 'market_decline_20_percent',
            action: 'increase_buffer_50_percent',
            duration: '12_months_or_recovery'
          },
          {
            condition: 'recession_indicator',
            action: 'increase_buffer_75_percent',
            duration: '18_months_or_recovery'
          }
        ],
        recoveryConditions: [
          'market_recovery_above_trigger',
          'positive_returns_3_consecutive_months',
          'economic_indicators_improving'
        ],
        maxBufferIncrease: baseBufferTarget, // Double at most
        fundingSource: 'bond_allocation_first',
        notes: 'Dynamic cash buffer adjustment based on market conditions to minimize sequence of returns risk'
      }
    } as FinancialEvent;
  }

  private generateAnnualAdjustmentReview(
    year: number,
    bufferMonths: number,
    monthlyExpenses: number,
    glidePath: string
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Annual Cash Buffer Review & Adjustment',
      description: 'Annual review and inflation adjustment of cash buffer strategy',
      type: 'ANNUAL_STRATEGY_REVIEW',
      startDate: new Date(year, 0, 1),
      isRecurring: true,
      frequency: 'annually',
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        bufferMonths,
        monthlyExpenses,
        glidePath,
        reviewComponents: [
          'expense_inflation_adjustment',
          'lifestyle_change_assessment',
          'market_performance_review',
          'withdrawal_rate_optimization',
          'glide_path_adjustment'
        ],
        inflationAdjustment: {
          method: 'cpi_based',
          capAnnualIncrease: 0.05, // Max 5% annual increase
          floorAnnualDecrease: -0.02 // Max 2% annual decrease
        },
        glidePath: {
          static: 'maintain_same_months_throughout',
          declining: 'reduce_buffer_1_month_every_5_years',
          rising: 'increase_buffer_6_months_every_10_years'
        },
        optimization_triggers: [
          'significant_lifestyle_change',
          'major_market_shift',
          'health_status_change',
          'withdrawal_strategy_modification'
        ],
        notes: 'Ensures cash buffer strategy remains optimal throughout retirement'
      }
    } as FinancialEvent;
  }
}