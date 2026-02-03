/**
 * Emergency Fund Strategy
 * 
 * Automated emergency fund building and maintenance strategy.
 * Builds emergency fund to target months of expenses with configurable parameters.
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

export class EmergencyFundStrategy implements StrategyEngine {
  id = 'emergency-fund';
  name = 'Emergency Fund Builder';
  category = 'EMERGENCY_FUND' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Automatically build and maintain emergency fund with high-yield savings optimization',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'CRITICAL' as const,
    estimatedTimeframe: 18, // 1.5 years to build
    difficultyLevel: 'BEGINNER' as const,
    tags: ['emergency-fund', 'cash', 'high-yield-savings', 'liquidity', 'financial-security']
  };

  getParameters(): StrategyParameters {
    return {
      monthsOfExpenses: {
        type: 'number',
        label: 'Target Months of Expenses',
        description: 'Number of months of expenses to save in emergency fund',
        defaultValue: 6,
        min: 3,
        max: 12,
        step: 1,
        required: true
      },
      monthlyExpenses: {
        type: 'number',
        label: 'Monthly Expenses',
        description: 'Current monthly living expenses',
        defaultValue: 5000,
        min: 1000,
        max: 20000,
        step: 100,
        required: true
      },
      currentEmergencyFund: {
        type: 'number',
        label: 'Current Emergency Fund Balance',
        description: 'Current amount saved in emergency fund',
        defaultValue: 0,
        min: 0,
        max: 100000,
        step: 500,
        required: true
      },
      contributionRate: {
        type: 'percentage',
        label: 'Monthly Contribution Rate',
        description: 'Percentage of monthly income to contribute to emergency fund',
        defaultValue: 0.10,
        min: 0.01,
        max: 0.30,
        step: 0.01,
        required: true
      },
      highYieldAPY: {
        type: 'percentage',
        label: 'High-Yield Savings APY',
        description: 'Annual percentage yield for high-yield savings account',
        defaultValue: 0.045,
        min: 0.01,
        max: 0.10,
        step: 0.001,
        required: false
      },
      autoTopUp: {
        type: 'boolean',
        label: 'Auto Top-Up',
        description: 'Automatically replenish emergency fund after withdrawals',
        defaultValue: true,
        required: false
      },
      minimumBalance: {
        type: 'number',
        label: 'Minimum Alert Balance',
        description: 'Send alert when emergency fund drops below this amount',
        defaultValue: 5000,
        min: 1000,
        max: 50000,
        step: 500,
        required: false
      },
      ladderCDs: {
        type: 'boolean',
        label: 'CD Ladder for Excess',
        description: 'Create CD ladder for emergency fund amounts above target',
        defaultValue: false,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check if user has income
    const hasIncome = context.currentEvents.some(event => 
      event.type === 'INCOME' || event.type === 'SALARY'
    );
    
    if (!hasIncome) {
      reasons.push('No income events found - emergency fund strategy requires regular income');
    }

    // Check if user has expenses to calculate target
    const hasExpenses = context.currentEvents.some(event => 
      event.type === 'RECURRING_EXPENSE' || event.type === 'EXPENSE'
    );

    if (!hasExpenses && !context.monthlyExpenses) {
      reasons.push('No expense data available - need monthly expenses to calculate emergency fund target');
    }

    return {
      applicable: reasons.length === 0,
      reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const generatedEvents: StrategyGeneratedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    // Default inputs
    const monthsOfExpenses = 6; // Standard recommendation
    const monthlyExpenses = context.monthlyExpenses || 5000;
    const currentYear = new Date().getFullYear();
    const contributionRate = 0.10; // Save 10% of income for emergency fund
    const highYieldAPY = 0.045; // 4.5% high yield savings
    
    // Calculate emergency fund target
    const targetAmount = monthsOfExpenses * monthlyExpenses;
    const currentBalance = context.currentBalances?.cash || 0;
    const shortfall = Math.max(0, targetAmount - currentBalance);
    
    // Calculate monthly contribution needed
    const monthlyIncome = this.estimateMonthlyIncome(context.currentEvents);
    const maxMonthlyContribution = monthlyIncome * contributionRate;

    if (shortfall > 0) {
      // 1. Generate emergency fund contribution event
      const contributionEvent = this.generateEmergencyFundContribution(
        currentYear,
        maxMonthlyContribution,
        shortfall
      );
      
      generatedEvents.push({
        event: contributionEvent,
        reason: `Build emergency fund to ${monthsOfExpenses} months of expenses (${targetAmount.toLocaleString()})`,
        isEditable: true,
        linkedToStrategy: true,
        importance: 'CRITICAL'
      });
    }

    // 2. High-yield savings optimization
    if (highYieldAPY > 0.02) { // If above 2% APY
      const savingsOptimizationEvent = this.generateHighYieldSavingsEvent(
        currentYear,
        targetAmount,
        highYieldAPY
      );
      
      generatedEvents.push({
        event: savingsOptimizationEvent,
        reason: `Optimize emergency fund returns with ${(highYieldAPY * 100).toFixed(2)}% APY high-yield savings`,
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });
    }

    // 3. Auto top-up system
    // 3. Auto top-up maintenance (always enabled for comprehensive strategy)
    if (true) {
      const minimumBalance = targetAmount * 0.8; // 80% of target as minimum
      const autoTopUpEvent = this.generateAutoTopUpEvent(
        currentYear,
        targetAmount,
        minimumBalance
      );
      
      generatedEvents.push({
        event: autoTopUpEvent,
        reason: 'Automatically replenish emergency fund after any withdrawals',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    }

    // 4. CD ladder for excess funds
    if (inputs.ladderCDs && currentBalance > targetAmount) {
      const excessAmount = currentBalance - targetAmount;
      if (excessAmount > 5000) { // Only for significant excess
        const cdLadderEvent = this.generateCDLadderEvent(
          currentYear,
          excessAmount
        );
        
        generatedEvents.push({
          event: cdLadderEvent,
          reason: 'Create CD ladder for emergency fund excess to earn higher returns while maintaining liquidity',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'LOW'
        });
      }
    }

    // 5. Emergency fund monitoring
    const monitoringEvent = this.generateEmergencyFundMonitoring(
      currentYear,
      targetAmount,
      inputs.minimumBalance
    );
    
    generatedEvents.push({
      event: monitoringEvent,
      reason: 'Monitor emergency fund balance and send alerts when below minimum threshold',
      isEditable: true,
      linkedToStrategy: true,
      importance: 'MEDIUM'
    });

    // Generate recommendations
    if (shortfall > 0) {
      const monthsToTarget = Math.ceil(shortfall / maxMonthlyContribution);
      recommendations.push({
        id: generateId(),
        title: 'Prioritize Emergency Fund',
        description: `Complete emergency fund before investing in non-retirement accounts. Target completion in ${monthsToTarget} months.`,
        type: 'ACTION',
        priority: 'HIGH',
        estimatedBenefit: 'Financial security and peace of mind',
        timeToImplement: 'Immediate',
        difficulty: 'EASY'
      });
    }

    recommendations.push(
      {
        id: generateId(),
        title: 'Shop for High-Yield Savings',
        description: 'Compare online banks for highest APY on emergency fund savings',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        estimatedBenefit: `$${Math.round(targetAmount * 0.02)} extra annually`,
        timeToImplement: '2-3 hours',
        difficulty: 'EASY'
      },
      {
        id: generateId(),
        title: 'Review Emergency Fund Annually',
        description: 'Adjust target amount based on lifestyle changes and expense inflation',
        type: 'ACTION',
        priority: 'MEDIUM',
        timeToImplement: '30 minutes annually',
        difficulty: 'EASY'
      }
    );

    // Warnings
    if (shortfall > monthlyIncome * 6) {
      warnings.push('Emergency fund shortfall is significant - consider temporarily reducing other savings goals');
    }

    if (inputs.contributionRate > 0.20) {
      warnings.push('High emergency fund contribution rate may strain monthly budget - ensure sustainable');
    }

    // Next steps
    nextSteps.push(
      'Open high-yield savings account if not already available',
      'Set up automatic monthly transfers to emergency fund',
      'Review and categorize all monthly expenses',
      'Create emergency fund usage guidelines',
      'Set up low balance alerts and monitoring'
    );

    if (shortfall === 0) {
      nextSteps.push('Consider increasing other investment contributions now that emergency fund is complete');
    }

    const estimatedImpact = await this.estimateImpact(context);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `Emergency Fund Plan - ${monthsOfExpenses} Month Target`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const monthsOfExpenses = 6;
    const monthlyExpenses = context.monthlyExpenses || 5000;
    const contributionRate = 0.10;
    const highYieldAPY = 0.045;
    
    const targetAmount = monthsOfExpenses * monthlyExpenses;
    const currentBalance = context.currentBalances?.cash || 0;
    const shortfall = Math.max(0, targetAmount - currentBalance);
    
    const monthlyIncome = this.estimateMonthlyIncome(context.currentEvents);
    const monthlyContribution = monthlyIncome * contributionRate;
    
    // Emergency fund reduces financial stress and provides security
    const annualContribution = monthlyContribution * 12;
    const highYieldBonus = targetAmount * (highYieldAPY - 0.01); // vs basic savings

    return {
      cashFlowImpact: {
        monthlyChange: -monthlyContribution, // Reduces available cash flow initially
        annualChange: -annualContribution,
        firstYearTotal: -annualContribution
      },
      netWorthImpact: {
        fiveYearProjection: targetAmount + (highYieldBonus * 5),
        tenYearProjection: targetAmount + (highYieldBonus * 10),
        retirementImpact: 0 // Emergency fund doesn't grow significantly long-term
      },
      taxImpact: {
        annualTaxSavings: 0, // Emergency fund savings not tax-deductible
        lifetimeTaxSavings: 0
      },
      riskFactors: [
        {
          factor: 'Opportunity cost',
          severity: 'LOW',
          mitigation: 'Emergency fund provides essential financial security despite lower returns'
        },
        {
          factor: 'Inflation erosion',
          severity: 'MEDIUM',
          mitigation: 'Use high-yield savings and review target amount annually'
        }
      ]
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (inputs.monthsOfExpenses < 3 || inputs.monthsOfExpenses > 12) {
      errors.monthsOfExpenses = 'Emergency fund should be between 3-12 months of expenses';
    }

    if (inputs.monthlyExpenses <= 0) {
      errors.monthlyExpenses = 'Monthly expenses must be greater than 0';
    }

    if (inputs.currentEmergencyFund < 0) {
      errors.currentEmergencyFund = 'Current emergency fund balance cannot be negative';
    }

    if (inputs.contributionRate <= 0 || inputs.contributionRate > 0.50) {
      errors.contributionRate = 'Contribution rate must be between 1% and 50%';
    }

    if (inputs.highYieldAPY < 0 || inputs.highYieldAPY > 0.15) {
      errors.highYieldAPY = 'APY should be between 0% and 15%';
    }

    if (inputs.minimumBalance < 0) {
      errors.minimumBalance = 'Minimum balance cannot be negative';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Helper methods

  private estimateMonthlyIncome(events: FinancialEvent[]): number {
    const incomeEvents = events.filter(event => 
      event.type === 'INCOME' || event.type === 'SALARY'
    );
    
    let totalMonthlyIncome = 0;
    for (const event of incomeEvents) {
      if (event.frequency === 'monthly') {
        totalMonthlyIncome += (event as any).amount || 0;
      } else if (event.frequency === 'annually') {
        totalMonthlyIncome += ((event as any).amount || 0) / 12;
      } else if (event.frequency === 'bi-weekly') {
        totalMonthlyIncome += ((event as any).amount || 0) * 26 / 12;
      }
    }
    
    return totalMonthlyIncome || 7000; // Default fallback
  }

  private generateEmergencyFundContribution(
    year: number,
    monthlyAmount: number,
    targetShortfall: number
  ): FinancialEvent {
    const monthsToComplete = Math.ceil(targetShortfall / monthlyAmount);
    
    return {
      id: generateId(),
      name: 'Emergency Fund Monthly Contribution',
      description: `Build emergency fund with ${monthlyAmount.toLocaleString()}/month for ${monthsToComplete} months`,
      type: 'SCHEDULED_CONTRIBUTION',
      startDate: new Date(year, 0, 1),
      endDate: new Date(year + Math.floor(monthsToComplete / 12), (monthsToComplete % 12), 1),
      amount: monthlyAmount,
      frequency: 'monthly',
      targetAccountType: 'cash',
      priority: 'high',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetShortfall,
        targetCompletionMonths: monthsToComplete,
        accountSubtype: 'emergency_fund',
        liquidityRequirement: 'immediate',
        notes: `Building emergency fund to target amount with automatic monthly contributions`
      }
    } as FinancialEvent;
  }

  private generateHighYieldSavingsEvent(
    year: number,
    targetAmount: number,
    apy: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'High-Yield Emergency Fund Account',
      description: `Optimize emergency fund with ${(apy * 100).toFixed(2)}% APY high-yield savings`,
      type: 'ACCOUNT_OPTIMIZATION',
      startDate: new Date(year, 0, 1),
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetAPY: apy,
        accountType: 'high_yield_savings',
        targetBalance: targetAmount,
        features: [
          'FDIC insured',
          'No minimum balance',
          'Online/mobile access',
          'Instant transfers'
        ],
        recommendedProviders: [
          'Marcus by Goldman Sachs',
          'Ally Bank',
          'Capital One 360',
          'Discover Bank'
        ],
        notes: `Maximize emergency fund returns while maintaining immediate liquidity`
      }
    } as FinancialEvent;
  }

  private generateAutoTopUpEvent(
    year: number,
    targetAmount: number,
    minimumBalance: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Emergency Fund Auto Top-Up',
      description: 'Automatically replenish emergency fund after withdrawals',
      type: 'EMERGENCY_FUND_TOPUP',
      startDate: new Date(year, 0, 1),
      isRecurring: true,
      frequency: 'monthly',
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetBalance: targetAmount,
        minimumThreshold: minimumBalance,
        topUpTrigger: 'balance_below_target',
        maxMonthlyTopUp: targetAmount * 0.1, // Max 10% of target per month
        sourceAccount: 'checking',
        alertThresholds: [
          { balance: minimumBalance, alertType: 'immediate' },
          { balance: targetAmount * 0.5, alertType: 'weekly' },
          { balance: targetAmount * 0.75, alertType: 'monthly' }
        ],
        notes: 'Maintain emergency fund target balance with automatic monitoring and top-ups'
      }
    } as FinancialEvent;
  }

  private generateCDLadderEvent(
    year: number,
    excessAmount: number
  ): FinancialEvent {
    const ladderAmount = Math.floor(excessAmount / 4) * 4; // Round to multiples of 4 for quarterly ladder
    
    return {
      id: generateId(),
      name: 'Emergency Fund CD Ladder',
      description: `Create CD ladder for ${ladderAmount.toLocaleString()} excess emergency fund`,
      type: 'CD_LADDER_SETUP',
      startDate: new Date(year, 0, 1),
      amount: ladderAmount,
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        ladderStructure: [
          { term: '3_month', amount: ladderAmount * 0.25, rolloverFrequency: 'quarterly' },
          { term: '6_month', amount: ladderAmount * 0.25, rolloverFrequency: 'bi_annually' },
          { term: '9_month', amount: ladderAmount * 0.25, rolloverFrequency: 'quarterly' },
          { term: '12_month', amount: ladderAmount * 0.25, rolloverFrequency: 'annually' }
        ],
        liquidityFeatures: {
          earlyWithdrawalPenalty: true,
          gracePeriod: '10_days',
          autoRollover: true
        },
        expectedAPY: 0.055, // Typical CD rates above savings
        emergencyAccess: 'penalty_withdrawal_available',
        notes: 'CD ladder for emergency fund excess provides higher returns while maintaining reasonable liquidity'
      }
    } as FinancialEvent;
  }

  private generateEmergencyFundMonitoring(
    year: number,
    targetAmount: number,
    minimumBalance: number
  ): FinancialEvent {
    return {
      id: generateId(),
      name: 'Emergency Fund Balance Monitoring',
      description: 'Monitor emergency fund balance and alert on low levels',
      type: 'BALANCE_MONITORING',
      startDate: new Date(year, 0, 1),
      isRecurring: true,
      frequency: 'weekly',
      targetAccountType: 'cash',
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        targetBalance: targetAmount,
        alertThresholds: [
          { 
            balance: minimumBalance, 
            alertType: 'critical',
            message: 'Emergency fund below minimum threshold',
            action: 'immediate_topup_required'
          },
          { 
            balance: targetAmount * 0.5, 
            alertType: 'warning',
            message: 'Emergency fund at 50% of target',
            action: 'review_budget_and_topup'
          },
          { 
            balance: targetAmount * 0.75, 
            alertType: 'info',
            message: 'Emergency fund at 75% of target',
            action: 'schedule_regular_contributions'
          }
        ],
        reviewSchedule: {
          frequency: 'quarterly',
          checkExpenseInflation: true,
          adjustTargetAmount: true,
          reviewAPY: true
        },
        notes: 'Continuous monitoring ensures emergency fund stays at optimal levels'
      }
    } as FinancialEvent;
  }
}