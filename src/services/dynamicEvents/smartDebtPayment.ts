/**
 * Smart Debt Payment Dynamic Event Implementation
 * 
 * Implements intelligent debt payment strategies: "Pay extra $1000/month using debt avalanche method"
 * This provides automated debt reduction with emergency fund protection.
 */

import { SmartDebtPaymentEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculateSmartDebtPayment, validateAmount, formatCurrency } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Debt information interface for smart payment calculations
 */
interface DebtInfo {
  id: string;
  name: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'personal_loan' | 'auto_loan';
}

/**
 * Smart Debt Payment Event Processor
 */
export class SmartDebtPaymentProcessor {
  static async evaluate(
    event: SmartDebtPaymentEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid smart debt payment event: ${validation.errorMessage}`);
    }

    if (!this.checkConditions(event, context)) {
      return [];
    }

    // Check emergency fund requirement
    if (context.cashBalance < event.emergencyFundTarget) {
      return []; // Don't make extra payments if emergency fund is insufficient
    }

    // Get available debts (mock data for now - in real implementation this would come from context)
    const availableDebts = this.getAvailableDebts(event, context);
    if (availableDebts.length === 0) {
      return []; // No debts to pay
    }

    // Calculate debt payments - map DebtInfo to expected format
    const mappedDebts = availableDebts.map(debt => ({
      id: debt.id,
      balance: debt.currentBalance,
      interestRate: debt.interestRate,
      minimumPayment: debt.minimumPayment
    }));
    const debtPayments = calculateSmartDebtPayment(event, context, mappedDebts);
    if (!debtPayments || debtPayments.length === 0) {
      return [];
    }

    const actions: EventAction[] = [];

    for (const payment of debtPayments) {
      if (payment.extraPayment > 0) {
        try {
          validateAmount(payment.extraPayment, { 
            min: 0, 
            max: 100000,
            name: `Extra debt payment for ${payment.debtId}` 
          });
        } catch (error) {
          logger.error('Invalid debt payment amount calculated:', 'DATA', error);
          continue;
        }

        const action: EventAction = {
          type: 'DEBT_PAYMENT',
          amount: payment.extraPayment,
          sourceAccount: 'cash',
          targetAccount: 'debt' as StandardAccountType,
          description: this.generateActionDescription(payment, event),
          priority: event.priority,
          metadata: {
            debtId: payment.debtId,
            strategy: event.strategy,
            totalPayment: payment.totalPayment,
            extraPayment: payment.extraPayment
          }
        };

        actions.push(action);
      }
    }

    return actions;
  }

  static validateEvent(event: SmartDebtPaymentEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  static checkConditions(event: SmartDebtPaymentEvent, context: SimulationContext): boolean {
    // Check minimum cash for emergency fund
    if (context.cashBalance < event.emergencyFundTarget) {
      return false;
    }

    // Check income requirements for percentage-based payments
    if (event.extraPayment.type === 'PERCENTAGE_OF_INCOME' && context.monthlyIncome <= 0) {
      return false;
    }

    if (event.conditions) {
      return this.evaluateConditionSet(event.conditions, context);
    }

    return true;
  }

  private static evaluateConditionSet(conditions: any, context: SimulationContext): boolean {
    if (conditions.cashBalance) {
      if (conditions.cashBalance.min && context.cashBalance < conditions.cashBalance.min) {
        return false;
      }
      if (conditions.cashBalance.max && context.cashBalance > conditions.cashBalance.max) {
        return false;
      }
    }

    if (conditions.income) {
      if (conditions.income.minMonthly && context.monthlyIncome < conditions.income.minMonthly) {
        return false;
      }
      if (conditions.income.maxMonthly && context.monthlyIncome > conditions.income.maxMonthly) {
        return false;
      }
    }

    if (conditions.age) {
      if (conditions.age.min && context.currentAge < conditions.age.min) {
        return false;
      }
      if (conditions.age.max && context.currentAge > conditions.age.max) {
        return false;
      }
    }

    return true;
  }

  private static getAvailableDebts(event: SmartDebtPaymentEvent, context: SimulationContext): DebtInfo[] {
    // Mock debt data - in real implementation this would come from context.debts
    const mockDebts: DebtInfo[] = [
      {
        id: 'cc-1',
        name: 'Credit Card 1',
        currentBalance: 5000,
        interestRate: 0.18,
        minimumPayment: 150,
        type: 'credit_card'
      },
      {
        id: 'student-1',
        name: 'Student Loan',
        currentBalance: 25000,
        interestRate: 0.045,
        minimumPayment: 300,
        type: 'student_loan'
      }
    ];

    // Filter debts based on targetDebts if specified
    if (event.targetDebts && event.targetDebts.length > 0) {
      return mockDebts.filter(debt => event.targetDebts!.includes(debt.id));
    }

    return mockDebts;
  }

  private static generateActionDescription(
    payment: { debtId: string; extraPayment: number; totalPayment: number; },
    event: SmartDebtPaymentEvent
  ): string {
    const strategy = event.strategy.toLowerCase().replace('_', ' ');
    return `Smart debt payment: ${formatCurrency(payment.extraPayment)} extra to ${payment.debtId} (${strategy} strategy)`;
  }

  static createTemplate(overrides: Partial<SmartDebtPaymentEvent> = {}): SmartDebtPaymentEvent {
    return {
      id: `smart-debt-payment-${Date.now()}`,
      type: EventType.SMART_DEBT_PAYMENT,
      name: 'Smart Debt Payoff',
      description: 'Intelligent debt payment with emergency fund protection',
      priority: 55 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      strategy: 'AVALANCHE',
      extraPayment: {
        type: 'FIXED_AMOUNT',
        amount: 1000,
        percentage: 0
      },
      targetDebts: [],
      emergencyFundTarget: 15000, // 3-6 months of expenses
      completionAction: {
        redirectTo: 'taxable',
        continueAmount: true
      },
      ...overrides
    };
  }

  static validateUserInput(input: Partial<SmartDebtPaymentEvent>): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (!input.strategy) {
      errors.push('Debt payment strategy is required');
    }

    if (!input.extraPayment?.type) {
      errors.push('Extra payment type is required');
    }

    if (input.extraPayment?.type === 'FIXED_AMOUNT' && 
        (typeof input.extraPayment.amount !== 'number' || input.extraPayment.amount <= 0)) {
      errors.push('Fixed amount must be a positive number');
    }

    if (input.extraPayment?.type === 'PERCENTAGE_OF_INCOME' && 
        (typeof input.extraPayment.percentage !== 'number' || 
         input.extraPayment.percentage <= 0 || input.extraPayment.percentage > 1)) {
      errors.push('Income percentage must be between 0 and 1');
    }

    if (typeof input.emergencyFundTarget !== 'number' || input.emergencyFundTarget < 0) {
      errors.push('Emergency fund target must be a non-negative number');
    }

    if (input.extraPayment?.type === 'FIXED_AMOUNT' && 
        typeof input.extraPayment.amount === 'number' && input.extraPayment.amount > 50000) {
      errors.push('Extra payment amount seems unusually high (max $50,000)');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errorMessage: errors.join('; '),
        errors: errors.map(msg => ({ message: msg } as any))
      };
    }

    return { isValid: true };
  }

  static explainBehavior(event: SmartDebtPaymentEvent): string {
    const strategy = event.strategy.toLowerCase().replace('_', ' ');
    let explanation = `This event uses the ${strategy} strategy to pay down debt efficiently.`;

    // Explain strategy
    switch (event.strategy) {
      case 'AVALANCHE':
        explanation += '\n\n• Avalanche method: Pays extra toward the highest interest rate debt first, saving the most money on interest over time.';
        break;
      case 'SNOWBALL':
        explanation += '\n\n• Snowball method: Pays extra toward the smallest balance first, providing psychological wins and motivation.';
        break;
      case 'HIGHEST_PAYMENT':
        explanation += '\n\n• Highest payment method: Pays extra toward the debt with the highest monthly payment first.';
        break;
    }

    // Explain payment amount
    explanation += '\n\nExtra payment: ';
    switch (event.extraPayment.type) {
      case 'FIXED_AMOUNT':
        explanation += `${formatCurrency(event.extraPayment.amount)} per month`;
        break;
      case 'PERCENTAGE_OF_INCOME':
        explanation += `${(event.extraPayment.percentage * 100).toFixed(1)}% of monthly income`;
        break;
      case 'SURPLUS_AFTER_EXPENSES':
        explanation += 'All surplus after expenses and emergency fund target';
        break;
    }

    // Explain emergency fund protection
    explanation += `\n\nSafety feature: Only makes extra payments when you have at least ${formatCurrency(event.emergencyFundTarget)} in your emergency fund.`;

    // Explain completion action
    if (event.completionAction.redirectTo) {
      explanation += `\n\nWhen debts are paid off, the payment amount will be redirected to your ${event.completionAction.redirectTo} account.`;
    }

    return explanation;
  }

  static getStrategyExplanation(strategy: SmartDebtPaymentEvent['strategy']): string {
    switch (strategy) {
      case 'AVALANCHE':
        return 'Mathematically optimal: Pay minimums on all debts, then put extra money toward the highest interest rate debt. Saves the most money overall.';
      case 'SNOWBALL':
        return 'Psychologically motivating: Pay minimums on all debts, then put extra money toward the smallest balance. Builds momentum through quick wins.';
      case 'HIGHEST_PAYMENT':
        return 'Cash flow focused: Pay minimums on all debts, then put extra money toward the debt with the highest monthly payment. Frees up cash flow quickly.';
      case 'CUSTOM':
        return 'User-defined priority: Pay debts in the order you specify, allowing for personal preferences and circumstances.';
      default:
        return '';
    }
  }
}

export function createSmartDebtPayment(
  config: {
    name: string;
    strategy: 'AVALANCHE' | 'SNOWBALL' | 'HIGHEST_PAYMENT' | 'CUSTOM';
    extraPayment: {
      type: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_INCOME' | 'SURPLUS_AFTER_EXPENSES';
      amount: number;
      percentage?: number;
    };
    emergencyFundTarget: number;
    targetDebts?: string[];
    redirectTo?: StandardAccountType;
  }
): SmartDebtPaymentEvent {
  return SmartDebtPaymentProcessor.createTemplate({
    name: config.name,
    description: `Smart debt payment: ${config.strategy.toLowerCase()} strategy`,
    strategy: config.strategy,
    extraPayment: config.extraPayment,
    emergencyFundTarget: config.emergencyFundTarget,
    targetDebts: config.targetDebts,
    completionAction: {
      redirectTo: config.redirectTo || 'taxable',
      continueAmount: true
    }
  });
}

export const SmartDebtPaymentTemplates = {
  debtAvalanche: (extraAmount: number, emergencyFund: number = 15000): SmartDebtPaymentEvent => 
    createSmartDebtPayment({
      name: 'Debt Avalanche Strategy',
      strategy: 'AVALANCHE',
      extraPayment: {
        type: 'FIXED_AMOUNT',
        amount: extraAmount
      },
      emergencyFundTarget: emergencyFund,
      redirectTo: 'tax_deferred'
    }),

  debtSnowball: (extraAmount: number, emergencyFund: number = 15000): SmartDebtPaymentEvent =>
    createSmartDebtPayment({
      name: 'Debt Snowball Strategy', 
      strategy: 'SNOWBALL',
      extraPayment: {
        type: 'FIXED_AMOUNT',
        amount: extraAmount
      },
      emergencyFundTarget: emergencyFund,
      redirectTo: 'roth'
    }),

  aggressivePayoff: (incomePercentage: number, emergencyFund: number = 20000): SmartDebtPaymentEvent =>
    createSmartDebtPayment({
      name: 'Aggressive Debt Payoff',
      strategy: 'AVALANCHE',
      extraPayment: {
        type: 'PERCENTAGE_OF_INCOME',
        percentage: incomePercentage
      },
      emergencyFundTarget: emergencyFund,
      redirectTo: 'taxable'
    }),

  creditCardFocus: (extraAmount: number): SmartDebtPaymentEvent => {
    const event = createSmartDebtPayment({
      name: 'Credit Card Debt Focus',
      strategy: 'AVALANCHE',
      extraPayment: {
        type: 'FIXED_AMOUNT',
        amount: extraAmount
      },
      emergencyFundTarget: 10000,
      redirectTo: 'roth'
    });
    // Filter to only credit card debts
    event.targetDebts = ['cc-1', 'cc-2', 'cc-3']; // Would be dynamic in real implementation
    return event;
  }
};