/**
 * Tax Optimization Strategy
 * 
 * Comprehensive tax optimization including tax-loss harvesting, bracket management,
 * Roth conversions, HSA maximization, and strategic timing of income/deductions.
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

export class TaxOptimizationStrategy implements StrategyEngine {
  id = 'tax-optimization';
  name = 'Tax Optimization Master';
  category = 'TAX_OPTIMIZATION' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Comprehensive tax optimization including bracket management, Roth conversions, tax-loss harvesting, and HSA maximization',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 24, // 2 years to fully implement
    difficultyLevel: 'ADVANCED' as const,
    tags: ['tax-optimization', 'roth-conversion', 'hsa', 'tax-loss-harvesting', 'bracket-management']
  };

  getParameters(): StrategyParameters {
    return {
      currentTaxBracket: {
        type: 'percentage',
        label: 'Current Tax Bracket',
        description: 'Your current marginal tax rate',
        defaultValue: 0.22,
        min: 0.10,
        max: 0.37,
        step: 0.01,
        required: true
      },
      targetRetirementBracket: {
        type: 'percentage',
        label: 'Expected Retirement Tax Bracket',
        description: 'Expected marginal tax rate in retirement',
        defaultValue: 0.12,
        min: 0.10,
        max: 0.37,
        step: 0.01,
        required: true
      },
      hasHSA: {
        type: 'boolean',
        label: 'HSA Access',
        description: 'Do you have access to a Health Savings Account?',
        defaultValue: false,
        required: false
      },
      hasTaxableInvestments: {
        type: 'boolean',
        label: 'Taxable Investment Accounts',
        description: 'Do you have taxable investment accounts for tax-loss harvesting?',
        defaultValue: true,
        required: false
      },
      rothConversionAmount: {
        type: 'number',
        label: 'Annual Roth Conversion Target',
        description: 'Target amount for annual Roth conversions',
        defaultValue: 10000,
        min: 0,
        max: 100000,
        step: 1000,
        required: false
      },
      implementTaxLossHarvesting: {
        type: 'boolean',
        label: 'Tax-Loss Harvesting',
        description: 'Implement systematic tax-loss harvesting',
        defaultValue: true,
        required: false
      },
      charitableGiving: {
        type: 'number',
        label: 'Annual Charitable Giving',
        description: 'Annual charitable giving for tax deduction optimization',
        defaultValue: 0,
        min: 0,
        max: 50000,
        step: 500,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check if user has income (needed for tax optimization)
    const hasIncome = context.currentEvents.some(event => 
      event.type === 'INCOME' || event.type === 'SALARY'
    );
    
    if (!hasIncome) {
      reasons.push('No income events found - tax optimization requires active income');
    }

    // Check if user has retirement accounts
    const hasRetirementAccounts = context.currentEvents.some(event => 
      (event as any).targetAccountType === 'tax_deferred' || 
      (event as any).targetAccountType === 'roth'
    );

    if (!hasRetirementAccounts) {
      reasons.push('No retirement accounts detected - limited tax optimization opportunities');
    }

    // Check current age for early retirement considerations
    if (context.currentAge < 25) {
      reasons.push('Tax optimization most beneficial for those with established careers');
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

    const inputs = context.userInputs;
    const currentYear = context.currentYear;
    
    // 1. HSA Maximization (if applicable)
    if (inputs.hasHSA) {
      const hsaEvent = this.generateHSAMaximizationEvent(currentYear);
      generatedEvents.push({
        event: hsaEvent,
        reason: 'HSA provides triple tax advantage - deductible contributions, tax-free growth, tax-free withdrawals for medical expenses',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'HIGH'
      });

      recommendations.push({
        id: generateId(),
        title: 'HSA Investment Strategy',
        description: 'Invest HSA funds for long-term growth after maintaining minimum cash balance',
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        estimatedBenefit: '$50,000+ in retirement',
        timeToImplement: '30 minutes',
        difficulty: 'EASY'
      });
    }

    // 2. Roth Conversion Ladder
    if (inputs.rothConversionAmount > 0) {
      const conversionEvents = this.generateRothConversionLadder(
        currentYear, 
        inputs.rothConversionAmount,
        inputs.currentTaxBracket,
        inputs.targetRetirementBracket
      );
      
      conversionEvents.forEach(event => {
        generatedEvents.push({
          event,
          reason: `Convert at ${(inputs.currentTaxBracket * 100).toFixed(0)}% bracket vs ${(inputs.targetRetirementBracket * 100).toFixed(0)}% expected retirement bracket`,
          isEditable: true,
          linkedToStrategy: true,
          importance: 'HIGH'
        });
      });

      if (inputs.currentTaxBracket > inputs.targetRetirementBracket) {
        warnings.push('Current tax bracket is higher than expected retirement bracket - consider smaller conversion amounts');
      }
    }

    // 3. Tax-Loss Harvesting
    if (inputs.implementTaxLossHarvesting && inputs.hasTaxableInvestments) {
      const taxLossEvent = this.generateTaxLossHarvestingEvent(currentYear);
      generatedEvents.push({
        event: taxLossEvent,
        reason: 'Systematic tax-loss harvesting can reduce taxable investment gains',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });

      recommendations.push({
        id: generateId(),
        title: 'Wash Sale Rule Compliance',
        description: 'Ensure 30-day wash sale rule compliance when harvesting losses',
        type: 'WARNING',
        priority: 'HIGH',
        timeToImplement: 'Ongoing',
        difficulty: 'MODERATE'
      });
    }

    // 4. Charitable Giving Optimization
    if (inputs.charitableGiving > 0) {
      const charitableEvents = this.generateCharitableGivingOptimization(
        currentYear,
        inputs.charitableGiving
      );
      
      charitableEvents.forEach(event => {
        generatedEvents.push({
          event,
          reason: 'Optimize charitable giving timing and methods for maximum tax benefit',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'MEDIUM'
        });
      });
    }

    // 5. Tax Bracket Management
    const bracketManagementEvents = this.generateBracketManagementEvents(
      currentYear,
      inputs.currentTaxBracket
    );
    
    bracketManagementEvents.forEach(event => {
      generatedEvents.push({
        event,
        reason: 'Manage income timing to optimize tax brackets',
        isEditable: true,
        linkedToStrategy: true,
        importance: 'MEDIUM'
      });
    });

    // Generate recommendations
    recommendations.push(
      {
        id: generateId(),
        title: 'Review Tax Strategy Annually',
        description: 'Tax laws change - review strategy each year and adjust for life changes',
        type: 'ACTION',
        priority: 'HIGH',
        timeToImplement: '2 hours annually',
        difficulty: 'EASY'
      },
      {
        id: generateId(),
        title: 'Consider Professional Tax Advice',
        description: 'Complex tax strategies benefit from professional guidance',
        type: 'CONSIDERATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Potentially significant tax savings',
        timeToImplement: '1-2 meetings',
        difficulty: 'EASY'
      }
    );

    // Next steps
    nextSteps.push(
      'Review all generated tax optimization events',
      'Set up automatic HSA contributions if applicable',
      'Schedule annual Roth conversion reviews',
      'Implement tax-loss harvesting tracking system',
      'Consider working with a tax professional for complex situations'
    );

    const estimatedImpact = await this.estimateImpact(context);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `Tax Optimized Plan - ${new Date().getFullYear()}`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const inputs = context.userInputs;
    
    // Calculate potential annual tax savings
    let annualTaxSavings = 0;
    
    // HSA savings (if applicable)
    if (inputs.hasHSA) {
      const hsaLimit = 4300; // 2025 individual limit
      annualTaxSavings += hsaLimit * inputs.currentTaxBracket;
    }
    
    // Roth conversion tax impact (negative in short term, positive long term)
    const rothConversionTax = inputs.rothConversionAmount * inputs.currentTaxBracket;
    
    // Tax-loss harvesting savings
    if (inputs.implementTaxLossHarvesting) {
      annualTaxSavings += 1500; // Estimated average tax-loss harvesting benefit
    }
    
    // Charitable giving deduction
    if (inputs.charitableGiving > 0) {
      annualTaxSavings += inputs.charitableGiving * inputs.currentTaxBracket;
    }

    const lifetimeTaxSavings = annualTaxSavings * 30; // 30-year projection

    return {
      cashFlowImpact: {
        monthlyChange: -rothConversionTax / 12, // Roth conversions reduce current cash flow
        annualChange: annualTaxSavings - rothConversionTax,
        firstYearTotal: annualTaxSavings - rothConversionTax
      },
      netWorthImpact: {
        fiveYearProjection: annualTaxSavings * 5 * 1.1, // 10% growth factor
        tenYearProjection: annualTaxSavings * 10 * 1.3, // 30% cumulative growth
        retirementImpact: lifetimeTaxSavings * 2 // Compound effect in retirement
      },
      taxImpact: {
        annualTaxSavings,
        lifetimeTaxSavings
      },
      riskFactors: [
        {
          factor: 'Tax law changes',
          severity: 'MEDIUM',
          mitigation: 'Review strategy annually and adapt to changes'
        },
        {
          factor: 'Early withdrawal penalties',
          severity: 'HIGH',
          mitigation: 'Maintain adequate liquidity in taxable accounts'
        }
      ]
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (inputs.currentTaxBracket < 0.10 || inputs.currentTaxBracket > 0.37) {
      errors.currentTaxBracket = 'Tax bracket must be between 10% and 37%';
    }

    if (inputs.targetRetirementBracket < 0.10 || inputs.targetRetirementBracket > 0.37) {
      errors.targetRetirementBracket = 'Retirement tax bracket must be between 10% and 37%';
    }

    if (inputs.rothConversionAmount < 0) {
      errors.rothConversionAmount = 'Roth conversion amount cannot be negative';
    }

    if (inputs.charitableGiving < 0) {
      errors.charitableGiving = 'Charitable giving amount cannot be negative';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Helper methods for generating specific events

  private generateHSAMaximizationEvent(year: number): FinancialEvent {
    return {
      id: generateId(),
      name: 'HSA Maximum Contribution',
      description: 'Maximize HSA contributions for triple tax advantage',
      type: 'SCHEDULED_CONTRIBUTION',
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      amount: 4300, // 2025 individual limit
      frequency: 'monthly',
      targetAccountType: 'hsa',
      taxable: false,
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        priority: 'high',
        notes: 'HSA provides deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses'
      }
    } as FinancialEvent;
  }

  private generateRothConversionLadder(
    startYear: number,
    annualAmount: number,
    currentBracket: number,
    retirementBracket: number
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];
    
    // Generate 5-year Roth conversion ladder
    for (let year = startYear; year < startYear + 5; year++) {
      events.push({
        id: generateId(),
        name: `Roth Conversion Ladder - Year ${year - startYear + 1}`,
        description: `Convert $${annualAmount.toLocaleString()} from traditional to Roth IRA`,
        type: 'ROTH_CONVERSION',
        startDate: new Date(year, 11, 15), // December for tax planning
        amount: annualAmount,
        sourceAccountType: 'tax_deferred',
        targetAccountType: 'roth',
        taxable: true,
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          taxRate: currentBracket,
          expectedRetirementRate: retirementBracket,
          notes: `Converting at ${(currentBracket * 100).toFixed(0)}% vs expected ${(retirementBracket * 100).toFixed(0)}% in retirement`
        }
      } as FinancialEvent);
    }
    
    return events;
  }

  private generateTaxLossHarvestingEvent(year: number): FinancialEvent {
    return {
      id: generateId(),
      name: 'Tax-Loss Harvesting Strategy',
      description: 'Automated tax-loss harvesting when investments drop by threshold percentage',
      type: 'TAX_LOSS_HARVESTING',
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      targetAccountType: 'taxable',
      isRecurring: true,
      frequency: 'monthly', // Check monthly for opportunities
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        dropThresholdPercent: 5, // Trigger when position drops 5%
        maxAnnualHarvest: 3000, // IRS annual capital loss limit
        washSaleAvoidanceDays: 31, // Avoid wash sale rule
        reinvestmentDelay: 31, // Days to wait before reinvesting
        targetFunds: ['VTI', 'VTIAX'], // Example funds to swap between
        alternativeFunds: ['SWTSX', 'FZROX'], // Alternative funds to avoid wash sales
        notes: 'Automatically harvest losses when positions drop by 5%+ while avoiding wash sale rules'
      }
    } as FinancialEvent;
  }

  private generateCharitableGivingOptimization(
    year: number,
    annualAmount: number
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];
    
    // If amount is large enough, consider bunching strategy
    if (annualAmount >= 10000) {
      // Donor-advised fund for bunching strategy
      events.push({
        id: generateId(),
        name: 'Donor-Advised Fund Contribution',
        description: 'Bunch charitable giving into donor-advised fund for tax optimization',
        type: 'CHARITABLE_CONTRIBUTION',
        startDate: new Date(year, 11, 31),
        amount: annualAmount * 3, // Bunch 3 years
        targetAccountType: 'donor_advised_fund',
        taxDeductible: true,
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          bunchingStrategy: true,
          notes: 'Bunch multiple years of giving to exceed standard deduction threshold'
        }
      } as FinancialEvent);
    } else {
      // Regular annual giving
      events.push({
        id: generateId(),
        name: 'Annual Charitable Giving',
        description: 'Optimize timing of charitable contributions',
        type: 'CHARITABLE_CONTRIBUTION',
        startDate: new Date(year, 11, 31),
        amount: annualAmount,
        taxDeductible: true,
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          notes: 'Time charitable giving for maximum tax benefit'
        }
      } as FinancialEvent);
    }
    
    return events;
  }

  private generateBracketManagementEvents(
    year: number,
    currentBracket: number
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];
    
    // Year-end tax planning event
    events.push({
      id: generateId(),
      name: 'Year-End Tax Planning Review',
      description: 'Review income and deductions to optimize tax bracket management',
      type: 'TAX_PLANNING_REVIEW',
      startDate: new Date(year, 10, 1), // November
      metadata: {
        isAutoGenerated: true,
        strategyId: this.id,
        currentBracket: currentBracket,
        actions: [
          'Review year-to-date income',
          'Accelerate or defer deductions',
          'Consider Roth conversion opportunities',
          'Review capital gains/losses'
        ],
        notes: 'Comprehensive year-end review to optimize tax bracket position'
      }
    } as FinancialEvent);
    
    return events;
  }
}