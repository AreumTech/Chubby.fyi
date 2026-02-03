/**
 * Investment Contribution Strategy
 *
 * Sets up automated monthly investment contributions across retirement and taxable accounts.
 * Focuses on dollar-cost averaging and consistent saving habits.
 *
 * For asset allocation, rebalancing, and fund selection, see:
 * - AssetAllocationStrategy
 * - PortfolioRebalancingStrategy
 * - TaxOptimizationStrategy
 */

import { generateId } from '../../utils/formatting';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent,
  StrategyModifiedEvent,
  StrategyRecommendation
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

export class InvestmentStrategy implements StrategyEngine {
  id = 'investment-optimization';
  name = 'Cash Flow & Investment Policy';
  category = 'INVESTMENT_STRATEGY' as const;

  config = {
    id: this.id,
    name: this.name,
    description: 'Set up automated savings and investments: emergency fund, retirement contributions, and taxable investments',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 3, // 3 months to set up
    difficultyLevel: 'BEGINNER' as const,
    tags: ['cash-flow', 'emergency-fund', 'dollar-cost-averaging', 'automated-investing', 'retirement-contributions']
  };

  getParameters(): StrategyParameters {
    return {
      monthlyInvestment: {
        type: 'number',
        label: 'Total Monthly Savings',
        description: 'Total amount to save/invest monthly across all accounts',
        defaultValue: 3000,
        min: 100,
        max: 50000,
        step: 100,
        required: true
      },
      emergencyFundMonths: {
        type: 'number',
        label: 'Emergency Fund Target (months)',
        description: 'Target months of expenses to save for emergencies',
        defaultValue: 6,
        min: 3,
        max: 12,
        step: 1,
        required: true
      },
      monthlyExpenses: {
        type: 'number',
        label: 'Monthly Expenses',
        description: 'Your average monthly living expenses',
        defaultValue: 4000,
        min: 1000,
        max: 50000,
        step: 100,
        required: true
      },
      maxRetirement401k: {
        type: 'number',
        label: 'Max 401(k) Monthly',
        description: 'Maximum monthly 401(k) contribution (IRS limit: $1,833/mo)',
        defaultValue: 1833,
        min: 0,
        max: 1833,
        step: 50,
        required: false
      },
      maxRetirementIRA: {
        type: 'number',
        label: 'Max IRA Monthly',
        description: 'Maximum monthly IRA contribution (IRS limit: $542/mo)',
        defaultValue: 542,
        min: 0,
        max: 542,
        step: 50,
        required: false
      },
      has401k: {
        type: 'boolean',
        label: 'Have 401(k) Access',
        description: 'Contribute to employer 401(k) plan',
        defaultValue: true,
        required: true
      },
      hasIRA: {
        type: 'boolean',
        label: 'Contribute to IRA',
        description: 'Make IRA contributions',
        defaultValue: true,
        required: false
      },
      contributeTaxable: {
        type: 'boolean',
        label: 'Invest in Taxable Account',
        description: 'Invest remaining funds in taxable brokerage',
        defaultValue: true,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    // This is an investment SETUP strategy - it creates the foundation for investing
    // So we don't validate for existing investments/accounts
    // The strategy will generate events to set up automatic contributions

    const reasons: string[] = [];

    // Optional: Warn if no income (but don't block)
    const hasIncome = context.currentEvents.some(event =>
      event.type === 'INCOME' || event.type === 'SALARY'
    );

    if (!hasIncome) {
      reasons.push('Recommended: Add income events for more realistic investment projections');
    }

    // Always applicable - this is a setup strategy
    return {
      applicable: true,
      reasons
    };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const generatedEvents: StrategyGeneratedEvent[] = [];
    const modifiedEvents: StrategyModifiedEvent[] = [];
    const recommendations: StrategyRecommendation[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    const inputs = context.userInputs;
    const currentYear = context.currentYear;
    const existingEvents = context.currentEvents || [];

    // Helper function to find and update existing events
    const findExistingEvent = (type: string, targetAccount?: string): FinancialEvent | undefined => {
      return existingEvents.find(e => {
        if (e.type !== type) return false;
        if (e.metadata?.strategyId !== this.id) return false;
        if (targetAccount && e.targetAccountType !== targetAccount) return false;
        return true;
      });
    };

    // Helper to track changes between events
    const recordChanges = (original: FinancialEvent, updated: FinancialEvent): Array<{field: string; oldValue: any; newValue: any; reason: string}> => {
      const changes = [];
      if (original.amount !== updated.amount) {
        changes.push({
          field: 'amount',
          oldValue: original.amount,
          newValue: updated.amount,
          reason: 'Updated based on new monthly investment amount'
        });
      }
      if (original.description !== updated.description) {
        changes.push({
          field: 'description',
          oldValue: original.description,
          newValue: updated.description,
          reason: 'Updated description'
        });
      }
      return changes;
    };

    // Calculate contribution allocation using waterfall priority
    const monthlyAmount = inputs.monthlyInvestment || 3000;
    const maxRetirement401k = inputs.maxRetirement401k || 1833; // $22,000/year IRS limit
    const maxRetirementIRA = inputs.maxRetirementIRA || 542;    // $6,500/year IRS limit
    const emergencyFundMonths = inputs.emergencyFundMonths || 6;
    const monthlyExpenses = inputs.monthlyExpenses || 4000;

    // Calculate emergency fund target (for metadata/logging)
    const emergencyFundTarget = emergencyFundMonths * monthlyExpenses;

    // WATERFALL PRIORITY ALLOCATION
    // After emergency fund is complete, allocate: 401k → IRA → Taxable
    let remaining = monthlyAmount;
    let amount401k = 0;
    let amountIRA = 0;
    let amountTaxable = 0;

    // Priority 1: 401(k) up to IRS limit
    if (inputs.has401k !== false) {
      amount401k = Math.min(remaining, maxRetirement401k);
      remaining -= amount401k;
    }

    // Priority 2: IRA up to IRS limit
    if (inputs.hasIRA && remaining > 0) {
      amountIRA = Math.min(remaining, maxRetirementIRA);
      remaining -= amountIRA;
    }

    // Priority 3: Taxable (remaining)
    if (inputs.contributeTaxable !== false && remaining > 0) {
      amountTaxable = remaining;
    }

    // Store emergency fund settings in metadata for simulation
    const emergencyFundMetadata = {
      emergencyFundTarget,
      emergencyFundMonths,
      monthlyExpenses,
      priority: 'cash_first'  // Indicates simulation should prioritize cash until target reached
    };

    // 1. Generate or update 401(k) contribution event
    if (amount401k > 0) {
      const event401k: FinancialEvent = {
        id: generateId(),
        name: 'Monthly 401(k) Contribution',
        description: 'Automated monthly 401(k) contribution',
        type: 'SCHEDULED_CONTRIBUTION',
        startDate: new Date(currentYear, 0, 1),
        amount: amount401k,
        frequency: 'monthly',
        targetAccountType: 'tax_deferred',
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          accountPreference: '401k',
          automationType: 'dollar_cost_averaging',
          ...emergencyFundMetadata,
          notes: `401(k) contribution - activates after emergency fund ($${emergencyFundTarget.toLocaleString()}) is complete`
        }
      } as FinancialEvent;

      const existing401k = existingEvents.find(e =>
        e.type === 'SCHEDULED_CONTRIBUTION' &&
        e.metadata?.strategyId === this.id &&
        e.metadata?.accountPreference === '401k'
      );

      if (existing401k) {
        const updatedEvent = {
          ...existing401k,
          amount: event401k.amount,
          description: event401k.description,
          metadata: {
            ...existing401k.metadata,
            ...event401k.metadata,
            lastUpdated: new Date()
          }
        };

        modifiedEvents.push({
          originalEventId: existing401k.id,
          modifiedEvent: updatedEvent,
          changes: recordChanges(existing401k, updatedEvent)
        });
      } else {
        generatedEvents.push({
          event: event401k,
          reason: 'Set up automated monthly 401(k) contributions',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'HIGH'
        });
      }
    }

    // 2. Generate or update IRA contribution event
    if (amountIRA > 0) {
      const eventIRA: FinancialEvent = {
        id: generateId(),
        name: 'Monthly IRA Contribution',
        description: 'Automated monthly IRA contribution',
        type: 'SCHEDULED_CONTRIBUTION',
        startDate: new Date(currentYear, 0, 1),
        amount: amountIRA,
        frequency: 'monthly',
        targetAccountType: 'tax_deferred',
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          accountPreference: 'ira',
          automationType: 'dollar_cost_averaging',
          ...emergencyFundMetadata,
          notes: `IRA contribution - activates after emergency fund ($${emergencyFundTarget.toLocaleString()}) is complete`
        }
      } as FinancialEvent;

      const existingIRA = existingEvents.find(e =>
        e.type === 'SCHEDULED_CONTRIBUTION' &&
        e.metadata?.strategyId === this.id &&
        e.metadata?.accountPreference === 'ira'
      );

      if (existingIRA) {
        const updatedEvent = {
          ...existingIRA,
          amount: eventIRA.amount,
          description: eventIRA.description,
          metadata: {
            ...existingIRA.metadata,
            ...eventIRA.metadata,
            lastUpdated: new Date()
          }
        };

        modifiedEvents.push({
          originalEventId: existingIRA.id,
          modifiedEvent: updatedEvent,
          changes: recordChanges(existingIRA, updatedEvent)
        });
      } else {
        generatedEvents.push({
          event: eventIRA,
          reason: 'Set up automated monthly IRA contributions',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'HIGH'
        });
      }
    }

    // Warnings
    if (!inputs.has401k && !inputs.hasIRA && !inputs.contributeTaxable) {
      warnings.push('No account types selected - no investment events will be created');
    } else if (!inputs.has401k && !inputs.hasIRA) {
      warnings.push('No retirement accounts selected - all funds will go to taxable account (missing tax advantages)');
    }

    // 3. Generate or update taxable account contributions
    if (amountTaxable > 0) {
      const taxableEvent: FinancialEvent = {
        id: generateId(),
        name: 'Monthly Taxable Investment',
        description: 'Automated monthly investment to taxable brokerage account',
        type: 'SCHEDULED_CONTRIBUTION',
        startDate: new Date(currentYear, 0, 1),
        amount: amountTaxable,
        frequency: 'monthly',
        targetAccountType: 'taxable',
        metadata: {
          isAutoGenerated: true,
          strategyId: this.id,
          automationType: 'dollar_cost_averaging',
          ...emergencyFundMetadata,
          notes: `Taxable brokerage contribution - activates after emergency fund ($${emergencyFundTarget.toLocaleString()}) is complete`
        }
      } as FinancialEvent;

      const existingTaxable = existingEvents.find(e =>
        e.type === 'SCHEDULED_CONTRIBUTION' &&
        e.metadata?.strategyId === this.id &&
        e.targetAccountType === 'taxable'
      );

      if (existingTaxable) {
        const updatedEvent = {
          ...existingTaxable,
          amount: taxableEvent.amount,
          description: taxableEvent.description,
          metadata: {
            ...existingTaxable.metadata,
            ...taxableEvent.metadata,
            lastUpdated: new Date()
          }
        };

        modifiedEvents.push({
          originalEventId: existingTaxable.id,
          modifiedEvent: updatedEvent,
          changes: recordChanges(existingTaxable, updatedEvent)
        });
      } else {
        generatedEvents.push({
          event: taxableEvent,
          reason: 'Set up automated monthly taxable brokerage contributions',
          isEditable: true,
          linkedToStrategy: true,
          importance: 'MEDIUM'
        });
      }
    }

    // Generate recommendations
    recommendations.push(
      {
        id: generateId(),
        title: 'Maximize Employer Match',
        description: 'If you have 401(k) match, contribute enough to get full employer match - it\'s free money!',
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        estimatedBenefit: 'Typically 3-6% of salary',
        timeToImplement: '30 minutes',
        difficulty: 'EASY'
      },
      {
        id: generateId(),
        title: 'Consider Asset Allocation Strategy',
        description: 'Once contributions are set up, configure asset allocation to optimize risk/return',
        type: 'ACTION',
        priority: 'HIGH',
        timeToImplement: '1-2 hours',
        difficulty: 'INTERMEDIATE'
      },
      {
        id: generateId(),
        title: 'Annual Contribution Review',
        description: 'Review and increase contributions annually as income grows',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        estimatedBenefit: 'Compound growth boost',
        timeToImplement: 'Annually',
        difficulty: 'EASY'
      }
    );

    // Warnings
    if (monthlyAmount < 500) {
      warnings.push('Consider increasing contributions once budget allows - consistency compounds over time');
    }

    if (monthlyAmount > 10000 && !inputs.has401k) {
      warnings.push('Large investment amounts should prioritize tax-advantaged accounts like 401(k)/IRA first');
    }

    // Next steps
    nextSteps.push(
      'Open investment accounts if not already available',
      'Set up automatic monthly transfers from checking account',
      'Consider configuring Asset Allocation strategy next',
      'Review contribution amounts quarterly',
      'Increase contributions when income grows'
    );

    const estimatedImpact = await this.estimateImpact(context);

    // Generate policy summary for sidebar display
    const policy = this.generatePolicySummary(inputs, amount401k, amountIRA, amountTaxable);

    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `Investment Contributions - $${monthlyAmount.toLocaleString()}/mo`,
      generatedEvents,
      modifiedEvents,
      recommendations,
      estimatedImpact,
      warnings,
      nextSteps,
      policy
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const inputs = context.userInputs;
    const annualInvestment = (inputs.monthlyInvestment || 3000) * 12;

    // Use moderate historical market return assumption (7% real)
    const expectedReturn = 0.07;

    // Calculate compound growth
    const fiveYearValue = this.calculateFutureValue(annualInvestment, expectedReturn, 5);
    const tenYearValue = this.calculateFutureValue(annualInvestment, expectedReturn, 10);
    const thirtyYearValue = this.calculateFutureValue(annualInvestment, expectedReturn, 30);

    // Tax benefits from retirement contributions (401k + IRA)
    const maxRetirement401k = inputs.maxRetirement401k || 1833;
    const maxRetirementIRA = inputs.maxRetirementIRA || 542;
    const monthlyRetirement = Math.min(inputs.monthlyInvestment || 3000, maxRetirement401k + maxRetirementIRA);
    const annualRetirement = monthlyRetirement * 12;
    const taxSavings = annualRetirement * 0.24; // Assume 24% marginal tax rate

    return {
      cashFlowImpact: {
        monthlyChange: -inputs.monthlyInvestment,
        annualChange: -annualInvestment,
        firstYearTotal: -annualInvestment
      },
      netWorthImpact: {
        fiveYearProjection: fiveYearValue,
        tenYearProjection: tenYearValue,
        retirementImpact: thirtyYearValue
      },
      taxImpact: {
        annualTaxSavings: taxSavings,
        lifetimeTaxSavings: taxSavings * 30
      },
      riskFactors: [
        {
          factor: 'Contribution consistency',
          severity: 'MEDIUM',
          mitigation: 'Automation ensures consistent investing regardless of market conditions'
        },
        {
          factor: 'Account selection',
          severity: inputs.has401k ? 'LOW' : 'MEDIUM',
          mitigation: inputs.has401k ? 'Prioritizing tax-advantaged accounts' : 'Consider opening retirement accounts for tax benefits'
        }
      ]
    };
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!inputs.monthlyInvestment || inputs.monthlyInvestment <= 0) {
      errors.monthlyInvestment = 'Monthly investment must be greater than 0';
    }

    if (inputs.monthlyInvestment > 100000) {
      errors.monthlyInvestment = 'Monthly investment seems unreasonably high';
    }

    if (inputs.emergencyFundMonths && (inputs.emergencyFundMonths < 3 || inputs.emergencyFundMonths > 12)) {
      errors.emergencyFundMonths = 'Emergency fund coverage should be between 3 and 12 months';
    }

    if (inputs.monthlyExpenses && inputs.monthlyExpenses <= 0) {
      errors.monthlyExpenses = 'Monthly expenses must be greater than 0';
    }

    if (inputs.maxRetirement401k && inputs.maxRetirement401k < 0) {
      errors.maxRetirement401k = 'Max 401(k) contribution must be positive';
    }

    if (inputs.maxRetirementIRA && inputs.maxRetirementIRA < 0) {
      errors.maxRetirementIRA = 'Max IRA contribution must be positive';
    }

    if (!inputs.has401k && !inputs.hasIRA && !inputs.contributeTaxable) {
      errors.general = 'Must select at least one account type for contributions';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Helper methods

  private calculateFutureValue(annualPayment: number, rate: number, years: number): number {
    if (rate === 0) return annualPayment * years;

    const futureValue = annualPayment * (Math.pow(1 + rate, years) - 1) / rate;
    return Math.round(futureValue);
  }

  /**
   * Generate policy summary for sidebar display
   * Example: "$3,000/mo → 1) 401k ($1,833) → 2) IRA ($542) → 3) Taxable ($625)"
   */
  private generatePolicySummary(
    inputs: Record<string, any>,
    amount401k: number,
    amountIRA: number,
    amountTaxable: number
  ): { summary: string; details: string[]; configuration: Record<string, any> } {
    const monthlyAmount = inputs.monthlyInvestment || 0;
    const emergencyFundTarget = (inputs.emergencyFundMonths || 6) * (inputs.monthlyExpenses || 4000);

    // Build contribution flow
    const contributionFlow: string[] = [];
    let stepNum = 1;

    if (amount401k > 0) {
      contributionFlow.push(`${stepNum}) 401k ($${Math.round(amount401k).toLocaleString()})`);
      stepNum++;
    }

    if (amountIRA > 0) {
      contributionFlow.push(`${stepNum}) IRA ($${Math.round(amountIRA).toLocaleString()})`);
      stepNum++;
    }

    if (amountTaxable > 0) {
      contributionFlow.push(`${stepNum}) Taxable ($${Math.round(amountTaxable).toLocaleString()})`);
    }

    const summary = contributionFlow.length > 0
      ? `$${monthlyAmount.toLocaleString()}/mo → ${contributionFlow.join(' → ')}`
      : 'No automatic investments configured';

    // Build details array
    const details = [
      `Total: $${monthlyAmount.toLocaleString()}/month`,
      `Annual: $${(monthlyAmount * 12).toLocaleString()}/year`,
      `Emergency Fund: $${emergencyFundTarget.toLocaleString()} target`,
      'Priority: Cash → 401k → IRA → Taxable'
    ];

    return {
      summary,
      details,
      configuration: inputs
    };
  }
}
