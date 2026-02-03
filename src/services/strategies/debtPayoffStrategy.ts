/**
 * Debt Payoff Strategy
 * 
 * Implements debt avalanche and snowball methods for paying off debt.
 * Automatically generates payment events and optimizes debt elimination.
 */

import { generateId } from '../../utils/formatting';
import type {
  StrategyEngine,
  StrategyExecutionContext,
  StrategyResult,
  StrategyParameters,
  StrategyImpact,
  StrategyGeneratedEvent
} from '../../types/strategy';
import type { FinancialEvent } from '../../types/events';

interface DebtInfo {
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  accountType?: string;
}

export class DebtPayoffStrategy implements StrategyEngine {
  id = 'debt-payoff-strategy';
  name = 'Debt Payoff Accelerator';
  category = 'DEBT_PAYOFF' as const;
  
  config = {
    id: this.id,
    name: this.name,
    description: 'Systematically eliminate debt using avalanche or snowball methods',
    category: this.category,
    parameters: this.getParameters(),
    priority: 'HIGH' as const,
    estimatedTimeframe: 36, // 3 years average
    difficultyLevel: 'INTERMEDIATE' as const,
    tags: ['debt', 'payoff', 'interest-savings', 'cash-flow']
  };

  getParameters(): StrategyParameters {
    return {
      method: {
        type: 'selection',
        label: 'Payoff Method',
        description: 'Choose debt elimination strategy',
        defaultValue: 'avalanche',
        options: [
          { value: 'avalanche', label: 'Avalanche (highest interest first)' },
          { value: 'snowball', label: 'Snowball (smallest balance first)' }
        ],
        required: true
      },
      extraPayment: {
        type: 'number',
        label: 'Extra Monthly Payment',
        description: 'Additional amount to allocate to debt payoff',
        defaultValue: 500,
        min: 0,
        max: 10000,
        step: 50,
        required: true
      },
      includeEmergencyFund: {
        type: 'boolean',
        label: 'Maintain Emergency Fund',
        description: 'Keep emergency fund while paying off debt',
        defaultValue: true,
        required: false
      },
      emergencyFundTarget: {
        type: 'number',
        label: 'Emergency Fund Target',
        description: 'Target emergency fund amount (months of expenses)',
        defaultValue: 3,
        min: 1,
        max: 12,
        step: 0.5,
        required: false
      }
    };
  }

  canApply(context: StrategyExecutionContext): { applicable: boolean; reasons: string[] } {
    const debts = this.extractDebtsFromEvents(context.currentEvents);
    const reasons: string[] = [];
    
    if (debts.length === 0) {
      reasons.push('No debts found in current financial plan');
      return { applicable: false, reasons };
    }
    
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    if (totalDebt < 1000) {
      reasons.push('Total debt amount is too small to benefit from systematic payoff');
      return { applicable: false, reasons };
    }
    
    const extraPayment = context.userInputs.extraPayment || 0;
    if (extraPayment <= 0) {
      reasons.push('Additional payment amount must be greater than zero');
      return { applicable: false, reasons };
    }
    
    return { applicable: true, reasons: ['Strategy applicable to current debt situation'] };
  }

  async execute(context: StrategyExecutionContext): Promise<StrategyResult> {
    const debts = this.extractDebtsFromEvents(context.currentEvents);
    const method = context.userInputs.method || 'avalanche';
    const extraPayment = context.userInputs.extraPayment || 500;
    
    // Sort debts according to chosen method
    const sortedDebts = this.sortDebts(debts, method);
    
    // Generate payment events
    const generatedEvents = this.generatePaymentEvents(
      sortedDebts,
      extraPayment,
      context
    );
    
    // Calculate impact
    const impact = await this.calculateImpact(debts, extraPayment, context);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(debts, method, extraPayment);
    
    return {
      success: true,
      strategyId: this.id,
      strategyName: this.name,
      newPlanName: `${method === 'avalanche' ? 'Debt Avalanche' : 'Debt Snowball'} Plan`,
      generatedEvents,
      modifiedEvents: [],
      recommendations,
      estimatedImpact: impact,
      warnings: this.generateWarnings(debts, extraPayment),
      nextSteps: this.generateNextSteps(method, extraPayment)
    };
  }

  async estimateImpact(context: StrategyExecutionContext): Promise<StrategyImpact> {
    const debts = this.extractDebtsFromEvents(context.currentEvents);
    const extraPayment = context.userInputs.extraPayment || 500;
    return this.calculateImpact(debts, extraPayment, context);
  }

  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    if (!inputs.method || !['avalanche', 'snowball'].includes(inputs.method)) {
      errors.method = 'Please select a valid payoff method';
    }
    
    if (!inputs.extraPayment || inputs.extraPayment <= 0) {
      errors.extraPayment = 'Extra payment must be greater than zero';
    }
    
    if (inputs.extraPayment && inputs.extraPayment > 50000) {
      errors.extraPayment = 'Extra payment amount seems unrealistic';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Private helper methods
  private extractDebtsFromEvents(events: FinancialEvent[]): DebtInfo[] {
    const debts: DebtInfo[] = [];
    
    // Look for liability events
    events.forEach(event => {
      if (event.type === 'LIABILITY_ADD' || event.type === 'LIABILITY') {
        const liability = event as any;
        if (liability.originalPrincipalAmount && liability.annualInterestRate) {
          debts.push({
            name: liability.name || 'Debt',
            balance: liability.currentPrincipalBalance || liability.originalPrincipalAmount,
            interestRate: liability.annualInterestRate,
            minimumPayment: liability.monthlyPayment || 0
          });
        }
      }
    });
    
    return debts;
  }

  private sortDebts(debts: DebtInfo[], method: string): DebtInfo[] {
    if (method === 'avalanche') {
      // Highest interest rate first
      return [...debts].sort((a, b) => b.interestRate - a.interestRate);
    } else {
      // Smallest balance first (snowball)
      return [...debts].sort((a, b) => a.balance - b.balance);
    }
  }

  private generatePaymentEvents(
    debts: DebtInfo[],
    extraPayment: number,
    context: StrategyExecutionContext
  ): StrategyGeneratedEvent[] {
    const events: StrategyGeneratedEvent[] = [];
    let remainingExtraPayment = extraPayment;
    
    debts.forEach((debt, index) => {
      const isTarget = index === 0; // First debt gets extra payment
      const paymentAmount = debt.minimumPayment + (isTarget ? remainingExtraPayment : 0);
      
      const paymentEvent: FinancialEvent = {
        id: generateId(),
        type: 'LIABILITY_PAYMENT',
        name: `Extra Payment - ${debt.name}`,
        description: `Accelerated payment for ${debt.name} using ${isTarget ? 'avalanche' : 'snowball'} method`,
        amount: paymentAmount,
        monthOffset: 0,
        priority: 'HIGH',
        startDateOffset: 0,
        endDateOffset: Math.ceil(debt.balance / paymentAmount), // Rough estimate
        targetAccountType: 'cash'
      } as any;
      
      events.push({
        event: paymentEvent,
        reason: isTarget 
          ? `Target debt for extra payment (${debt.interestRate}% interest)`
          : `Minimum payment maintained`,
        isEditable: true,
        linkedToStrategy: true,
        importance: isTarget ? 'HIGH' : 'MEDIUM'
      });
      
      if (isTarget) {
        remainingExtraPayment = 0; // All extra payment goes to first debt
      }
    });
    
    return events;
  }

  private async calculateImpact(
    debts: DebtInfo[],
    extraPayment: number,
    context: StrategyExecutionContext
  ): Promise<StrategyImpact> {
    // Calculate payoff timeline and interest savings
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const averageInterestRate = debts.reduce((sum, debt) => sum + (debt.interestRate * debt.balance), 0) / totalDebt;
    
    // Rough calculation - would be more sophisticated in real implementation
    const monthsToPayoff = Math.ceil(totalDebt / (totalMinimumPayments + extraPayment));
    const totalInterestWithoutStrategy = totalDebt * (averageInterestRate / 100) * (monthsToPayoff / 12);
    const totalInterestWithStrategy = totalDebt * (averageInterestRate / 100) * 0.7; // Assume 30% savings
    const interestSavings = totalInterestWithoutStrategy - totalInterestWithStrategy;
    
    return {
      cashFlowImpact: {
        monthlyChange: -(totalMinimumPayments + extraPayment),
        annualChange: -(totalMinimumPayments + extraPayment) * 12,
        firstYearTotal: -(totalMinimumPayments + extraPayment) * 12
      },
      netWorthImpact: {
        fiveYearProjection: interestSavings,
        tenYearProjection: interestSavings * 1.5,
        retirementImpact: interestSavings * 3
      },
      taxImpact: {
        annualTaxSavings: 0, // Debt payments aren't tax deductible for most personal debt
        lifetimeTaxSavings: 0
      },
      riskFactors: [
        {
          factor: 'Reduced liquidity during payoff period',
          severity: 'MEDIUM',
          mitigation: 'Maintain emergency fund as specified'
        },
        {
          factor: 'Opportunity cost of not investing',
          severity: 'LOW',
          mitigation: 'Guaranteed return from debt payoff vs uncertain investment returns'
        }
      ]
    };
  }

  private generateRecommendations(debts: DebtInfo[], method: string, extraPayment: number) {
    return [
      {
        id: generateId(),
        title: 'Automate Extra Payments',
        description: 'Set up automatic transfers to ensure consistent extra payments',
        type: 'ACTION' as const,
        priority: 'HIGH' as const,
        estimatedBenefit: 'Prevents spending extra payment money elsewhere',
        timeToImplement: '30 minutes',
        difficulty: 'EASY' as const
      },
      {
        id: generateId(),
        title: 'Track Progress Monthly',
        description: 'Monitor debt balances and celebrate milestones',
        type: 'CONSIDERATION' as const,
        priority: 'MEDIUM' as const,
        estimatedBenefit: 'Maintains motivation and identifies issues early',
        timeToImplement: '15 minutes monthly',
        difficulty: 'EASY' as const
      },
      {
        id: generateId(),
        title: 'Consider Balance Transfers',
        description: 'Look for 0% APR balance transfer offers for high-interest debt',
        type: 'OPTIMIZATION' as const,
        priority: 'MEDIUM' as const,
        estimatedBenefit: 'Could save thousands in interest',
        timeToImplement: '2-3 hours research',
        difficulty: 'MODERATE' as const
      }
    ];
  }

  private generateWarnings(debts: DebtInfo[], extraPayment: number): string[] {
    const warnings: string[] = [];
    
    const highInterestDebts = debts.filter(d => d.interestRate > 20);
    if (highInterestDebts.length > 0) {
      warnings.push(`You have ${highInterestDebts.length} debt(s) with interest rates above 20%. Consider balance transfers.`);
    }
    
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    if (extraPayment > totalMinimumPayments * 3) {
      warnings.push('Extra payment is very aggressive. Ensure you maintain adequate emergency fund.');
    }
    
    return warnings;
  }

  private generateNextSteps(method: string, extraPayment: number): string[] {
    return [
      'Review and adjust the generated payment events as needed',
      'Set up automatic transfers for extra payments',
      'Update your budget to accommodate the payment plan',
      `Focus all extra payments on the ${method === 'avalanche' ? 'highest interest' : 'smallest balance'} debt first`,
      'Run the simulation to see your debt-free timeline',
      'Schedule monthly reviews to track progress'
    ];
  }
}