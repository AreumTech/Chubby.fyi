/**
 * Emergency Fund Maintenance Dynamic Event Implementation
 * 
 * Implements automatic emergency fund maintenance: "Maintain 6 months expenses in emergency fund, auto-top-up when needed"
 * This ensures emergency fund stays adequately funded as expenses change.
 */

import { EmergencyFundMaintenanceEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculateEmergencyFundTarget, validateAmount, formatCurrency } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Emergency Fund status interface
 */
interface EmergencyFundStatus {
  currentAmount: number;
  targetAmount: number;
  shortfall: number;
  isAdequate: boolean;
  monthsOfExpensesCovered: number;
  recommendedTopUp: number;
  lastExpenseUpdate: Date;
}

/**
 * Emergency Fund Maintenance Event Processor
 */
export class EmergencyFundMaintenanceProcessor {
  static async evaluate(
    event: EmergencyFundMaintenanceEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid emergency fund maintenance event: ${validation.errorMessage}`);
    }

    if (!this.checkConditions(event, context)) {
      return [];
    }

    // Calculate emergency fund status
    const fundStatus = this.calculateEmergencyFundStatus(event, context);
    
    // Check if maintenance is needed
    if (fundStatus.isAdequate && !this.shouldRebalance(event, fundStatus)) {
      return []; // No action needed
    }

    const actions: EventAction[] = [];

    // Handle shortfall (top-up needed)
    if (fundStatus.shortfall > 0) {
      const topUpAction = this.createTopUpAction(event, fundStatus, context);
      if (topUpAction) {
        actions.push(topUpAction);
      }
    }

    // Handle excess (drain needed) if enabled
    if (event.drainExcess && fundStatus.shortfall < 0) {
      const drainAction = this.createDrainAction(event, fundStatus);
      if (drainAction) {
        actions.push(drainAction);
      }
    }

    return actions;
  }

  static validateEvent(event: EmergencyFundMaintenanceEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  static checkConditions(event: EmergencyFundMaintenanceEvent, context: SimulationContext): boolean {
    // Check minimum funding sources available
    if (event.fundingSources.includes('income') && context.monthlyIncome <= 0) {
      return false;
    }

    if (event.fundingSources.includes('surplus') && context.cashBalance <= event.targetMonths * 2000) {
      return false; // Need some buffer above emergency fund for surplus
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
    }

    return true;
  }

  private static calculateEmergencyFundStatus(
    event: EmergencyFundMaintenanceEvent,
    context: SimulationContext
  ): EmergencyFundStatus {
    // Calculate target emergency fund amount
    const monthlyExpenses = this.estimateMonthlyExpenses(context);
    const targetAmount = calculateEmergencyFundTarget(event.targetMonths, context);
    
    // Get current emergency fund balance (cash + any designated emergency accounts)
    const currentAmount = context.cashBalance; // In real implementation, would include emergency fund accounts
    
    const shortfall = targetAmount - currentAmount;
    const monthsOfExpensesCovered = monthlyExpenses > 0 ? currentAmount / monthlyExpenses : 0;
    
    return {
      currentAmount,
      targetAmount,
      shortfall,
      isAdequate: shortfall <= 0,
      monthsOfExpensesCovered,
      recommendedTopUp: Math.max(0, shortfall),
      lastExpenseUpdate: new Date()
    };
  }

  private static estimateMonthlyExpenses(context: SimulationContext): number {
    // Mock expense calculation - in real implementation this would come from user's expense events
    // Estimate based on income (typically 70-80% of after-tax income)
    const estimatedAfterTaxIncome = context.monthlyIncome * 0.75; // Rough after-tax estimate
    const estimatedExpenses = estimatedAfterTaxIncome * 0.80; // 80% of after-tax income
    
    // Minimum reasonable emergency fund target
    return Math.max(estimatedExpenses, 3000);
  }

  private static shouldRebalance(
    event: EmergencyFundMaintenanceEvent,
    fundStatus: EmergencyFundStatus
  ): boolean {
    // Check if it's been long enough since last rebalancing
    const daysSinceUpdate = (Date.now() - fundStatus.lastExpenseUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) { // Don't rebalance more than monthly
      return false;
    }

    // Check if rebalancing threshold is met
    if (event.rebalancingThreshold) {
      const deviationPercentage = Math.abs(fundStatus.shortfall) / fundStatus.targetAmount;
      return deviationPercentage >= event.rebalancingThreshold;
    }

    return false;
  }

  private static createTopUpAction(
    event: EmergencyFundMaintenanceEvent,
    fundStatus: EmergencyFundStatus,
    context: SimulationContext
  ): EventAction | null {
    let topUpAmount = fundStatus.shortfall;

    // Apply top-up limits
    if (event.topUpLimits?.maxMonthlyTopUp) {
      topUpAmount = Math.min(topUpAmount, event.topUpLimits.maxMonthlyTopUp);
    }

    if (event.topUpLimits?.maxPercentageOfIncome) {
      const maxIncomeBasedTopUp = context.monthlyIncome * event.topUpLimits.maxPercentageOfIncome;
      topUpAmount = Math.min(topUpAmount, maxIncomeBasedTopUp);
    }

    // Check if we have enough funds for top-up
    const availableFunds = this.getAvailableFundsForTopUp(event, context);
    topUpAmount = Math.min(topUpAmount, availableFunds);

    if (topUpAmount <= 10) { // Minimum meaningful top-up
      return null;
    }

    try {
      validateAmount(topUpAmount, { 
        min: 0, 
        max: 100000,
        name: 'Emergency fund top-up amount' 
      });
    } catch (error) {
      logger.error('Invalid top-up amount calculated:', 'DATA', error);
      return null;
    }

    return {
      type: 'TRANSFER',
      amount: topUpAmount,
      sourceAccount: this.selectTopUpSource(event, context),
      targetAccount: event.emergencyFundAccount,
      description: this.generateTopUpDescription(topUpAmount, fundStatus),
      priority: event.priority,
      metadata: {
        maintenanceType: 'TOP_UP',
        targetMonths: event.targetMonths,
        currentMonths: fundStatus.monthsOfExpensesCovered,
        shortfall: fundStatus.shortfall
      }
    };
  }

  private static createDrainAction(
    event: EmergencyFundMaintenanceEvent,
    fundStatus: EmergencyFundStatus
  ): EventAction | null {
    if (!event.drainExcess || fundStatus.shortfall >= 0) {
      return null;
    }

    const excessAmount = Math.abs(fundStatus.shortfall);
    
    // Only drain if excess is significant (> 10% of target)
    if (excessAmount < fundStatus.targetAmount * 0.10) {
      return null;
    }

    const drainAmount = event.drainExcess.maxDrainPercentage ? 
      excessAmount * event.drainExcess.maxDrainPercentage : 
      excessAmount;

    try {
      validateAmount(drainAmount, { 
        min: 0, 
        max: 100000,
        name: 'Emergency fund drain amount' 
      });
    } catch (error) {
      logger.error('Invalid drain amount calculated:', 'DATA', error);
      return null;
    }

    return {
      type: 'TRANSFER',
      amount: drainAmount,
      sourceAccount: event.emergencyFundAccount,
      targetAccount: event.drainExcess.targetAccount || 'taxable',
      description: this.generateDrainDescription(drainAmount, fundStatus),
      priority: event.priority,
      metadata: {
        maintenanceType: 'DRAIN_EXCESS',
        targetMonths: event.targetMonths,
        currentMonths: fundStatus.monthsOfExpensesCovered,
        excessAmount: excessAmount
      }
    };
  }

  private static getAvailableFundsForTopUp(
    event: EmergencyFundMaintenanceEvent,
    context: SimulationContext
  ): number {
    let availableFunds = 0;

    if (event.fundingSources.includes('income')) {
      // Use percentage of income for top-up
      availableFunds += context.monthlyIncome * (event.topUpLimits?.maxPercentageOfIncome || 0.20);
    }

    if (event.fundingSources.includes('surplus')) {
      // Use surplus cash beyond what's needed for the emergency fund
      const targetAmount = calculateEmergencyFundTarget(event.targetMonths, context);
      const surplus = Math.max(0, context.cashBalance - targetAmount);
      availableFunds += surplus * 0.5; // Only use 50% of surplus
    }

    if (event.fundingSources.includes('other_savings')) {
      // Would check other savings accounts in real implementation
      availableFunds += 1000; // Mock amount
    }

    return availableFunds;
  }

  private static selectTopUpSource(
    event: EmergencyFundMaintenanceEvent,
    context: SimulationContext
  ): StandardAccountType {
    // Prioritize funding sources based on availability
    if (event.fundingSources.includes('surplus') && context.cashBalance > 5000) {
      return 'cash';
    }

    if (event.fundingSources.includes('income')) {
      return 'cash'; // Income goes to cash first
    }

    if (event.fundingSources.includes('other_savings')) {
      return 'taxable'; // Use other savings
    }

    return 'cash'; // Default
  }

  private static generateTopUpDescription(
    amount: number,
    fundStatus: EmergencyFundStatus
  ): string {
    const months = fundStatus.monthsOfExpensesCovered.toFixed(1);
    return `Emergency fund top-up: ${formatCurrency(amount)} (currently ${months} months of expenses)`;
  }

  private static generateDrainDescription(
    amount: number,
    fundStatus: EmergencyFundStatus
  ): string {
    const months = fundStatus.monthsOfExpensesCovered.toFixed(1);
    return `Emergency fund excess drain: ${formatCurrency(amount)} (currently ${months} months of expenses)`;
  }

  static createTemplate(overrides: Partial<EmergencyFundMaintenanceEvent> = {}): EmergencyFundMaintenanceEvent {
    return {
      id: `emergency-fund-maintenance-${Date.now()}`,
      type: EventType.EMERGENCY_FUND_MAINTENANCE,
      name: 'Emergency Fund Auto-Maintenance',
      description: 'Automatically maintain emergency fund target based on expenses',
      priority: 65 as EventPriority, // High priority for emergency fund
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      targetMonths: 6,
      emergencyFundAccount: 'cash',
      fundingSources: ['income', 'surplus'],
      topUpLimits: {
        maxMonthlyTopUp: 2000,
        maxPercentageOfIncome: 0.20 // Max 20% of income for emergency fund top-up
      },
      rebalancingThreshold: 0.10, // Rebalance if 10% deviation from target
      drainExcess: {
        enabled: true,
        targetAccount: 'taxable',
        maxDrainPercentage: 0.50 // Only drain 50% of excess at a time
      },
      ...overrides
    };
  }

  static validateUserInput(input: Partial<EmergencyFundMaintenanceEvent>): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (typeof input.targetMonths !== 'number' || input.targetMonths < 1 || input.targetMonths > 24) {
      errors.push('Target months must be between 1 and 24');
    }

    if (!input.emergencyFundAccount) {
      errors.push('Emergency fund account is required');
    }

    if (!input.fundingSources || input.fundingSources.length === 0) {
      errors.push('At least one funding source is required');
    }

    if (input.topUpLimits?.maxPercentageOfIncome && 
        (input.topUpLimits.maxPercentageOfIncome <= 0 || input.topUpLimits.maxPercentageOfIncome > 1)) {
      errors.push('Max percentage of income must be between 0 and 100%');
    }

    if (input.topUpLimits?.maxMonthlyTopUp && 
        (typeof input.topUpLimits.maxMonthlyTopUp !== 'number' || input.topUpLimits.maxMonthlyTopUp <= 0)) {
      errors.push('Max monthly top-up must be a positive number');
    }

    if (input.rebalancingThreshold && 
        (input.rebalancingThreshold <= 0 || input.rebalancingThreshold > 1)) {
      errors.push('Rebalancing threshold must be between 0 and 100%');
    }

    if (input.drainExcess?.maxDrainPercentage && 
        (input.drainExcess.maxDrainPercentage <= 0 || input.drainExcess.maxDrainPercentage > 1)) {
      errors.push('Max drain percentage must be between 0 and 100%');
    }

    if (typeof input.targetMonths === 'number' && input.targetMonths > 12) {
      errors.push('Emergency fund target above 12 months seems unusually high');
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

  static explainBehavior(event: EmergencyFundMaintenanceEvent): string {
    let explanation = `This event automatically maintains your emergency fund at ${event.targetMonths} months of expenses.`;

    explanation += `\n\nFunding sources: ${event.fundingSources.join(', ')}.`;

    if (event.topUpLimits?.maxMonthlyTopUp) {
      explanation += `\nMax monthly top-up: ${formatCurrency(event.topUpLimits.maxMonthlyTopUp)}.`;
    }

    if (event.topUpLimits?.maxPercentageOfIncome) {
      explanation += `\nMax top-up from income: ${(event.topUpLimits.maxPercentageOfIncome * 100).toFixed(1)}%.`;
    }

    explanation += '\n\nThe system monitors your expenses and automatically:';
    explanation += '\n• Tops up the fund when expenses increase or fund falls below target';
    explanation += '\n• Keeps the fund at the right level without over-funding';

    if (event.drainExcess?.enabled) {
      explanation += `\n• Redirects excess funds to ${event.drainExcess.targetAccount || 'investments'} when fund exceeds target`;
    }

    explanation += '\n\nThis ensures you always have adequate emergency coverage without tying up excess cash.';

    return explanation;
  }

  static getMaintenanceStrategies(): { [key: string]: string } {
    return {
      conservative: 'Higher emergency fund target (8-12 months) with gradual top-ups',
      balanced: 'Standard emergency fund target (6 months) with regular maintenance',
      aggressive: 'Lower emergency fund target (3-4 months) with quick rebalancing to investments'
    };
  }
}

export function createEmergencyFundMaintenance(
  config: {
    name: string;
    targetMonths: number;
    fundingStrategy: 'conservative' | 'balanced' | 'aggressive';
    emergencyFundAccount?: StandardAccountType;
    maxMonthlyTopUp?: number;
    maxIncomePercentage?: number;
    enableExcessDrain?: boolean;
    excessDrainTarget?: StandardAccountType;
  }
): EmergencyFundMaintenanceEvent {
  const strategyDefaults = {
    conservative: {
      targetMonths: 8,
      maxIncomePercentage: 0.15,
      rebalancingThreshold: 0.05,
      enableExcessDrain: false
    },
    balanced: {
      targetMonths: 6,
      maxIncomePercentage: 0.20,
      rebalancingThreshold: 0.10,
      enableExcessDrain: true
    },
    aggressive: {
      targetMonths: 4,
      maxIncomePercentage: 0.25,
      rebalancingThreshold: 0.15,
      enableExcessDrain: true
    }
  };

  const defaults = strategyDefaults[config.fundingStrategy];

  return EmergencyFundMaintenanceProcessor.createTemplate({
    name: config.name,
    description: `Emergency fund auto-maintenance: ${config.fundingStrategy} strategy`,
    targetMonths: config.targetMonths || defaults.targetMonths,
    emergencyFundAccount: config.emergencyFundAccount || 'cash',
    topUpLimits: {
      maxMonthlyTopUp: config.maxMonthlyTopUp || 3000,
      maxPercentageOfIncome: config.maxIncomePercentage || defaults.maxIncomePercentage
    },
    rebalancingThreshold: defaults.rebalancingThreshold,
    drainExcess: config.enableExcessDrain !== false && defaults.enableExcessDrain ? {
      enabled: true,
      targetAccount: config.excessDrainTarget || 'taxable',
      maxDrainPercentage: 0.50
    } : {
      enabled: false,
      targetAccount: 'cash',
      maxDrainPercentage: 0
    }
  });
}

export const EmergencyFundMaintenanceTemplates = {
  conservative: (targetMonths: number = 8): EmergencyFundMaintenanceEvent => 
    createEmergencyFundMaintenance({
      name: 'Conservative Emergency Fund',
      targetMonths,
      fundingStrategy: 'conservative',
      maxMonthlyTopUp: 1500,
      maxIncomePercentage: 0.15,
      enableExcessDrain: false
    }),

  balanced: (targetMonths: number = 6): EmergencyFundMaintenanceEvent =>
    createEmergencyFundMaintenance({
      name: 'Balanced Emergency Fund',
      targetMonths,
      fundingStrategy: 'balanced',
      maxMonthlyTopUp: 2000,
      maxIncomePercentage: 0.20,
      enableExcessDrain: true,
      excessDrainTarget: 'taxable'
    }),

  aggressive: (targetMonths: number = 4): EmergencyFundMaintenanceEvent =>
    createEmergencyFundMaintenance({
      name: 'Aggressive Emergency Fund',
      targetMonths,
      fundingStrategy: 'aggressive',
      maxMonthlyTopUp: 3000,
      maxIncomePercentage: 0.25,
      enableExcessDrain: true,
      excessDrainTarget: 'taxable'
    }),

  highIncome: (targetMonths: number = 6): EmergencyFundMaintenanceEvent => {
    const event = createEmergencyFundMaintenance({
      name: 'High Income Emergency Fund',
      targetMonths,
      fundingStrategy: 'balanced',
      maxMonthlyTopUp: 5000,
      maxIncomePercentage: 0.15, // Lower percentage for high earners
      enableExcessDrain: true,
      excessDrainTarget: 'taxable'
    });
    
    // Higher priority for high income earners
    event.priority = 70 as EventPriority;
    
    return event;
  }
};