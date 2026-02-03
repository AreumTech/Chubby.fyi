/**
 * Waterfall Allocation Dynamic Event Implementation
 * 
 * Implements priority-based savings cascade: "First max 401k match, then HSA, then Roth IRA, then taxable"
 * This is the core strategy for optimal contribution ordering.
 */

import { WaterfallAllocationEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { calculateWaterfallAllocation, validateAmount, formatCurrency } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';
import { logger } from '@/utils/logger';

/**
 * Account contribution limits for 2025
 */
const CONTRIBUTION_LIMITS_2025 = {
  '401k': 23500,
  'ira': 7000,
  'roth_ira': 7000,
  'hsa': 4550, // 2025 self-only limit
  'catch_up_401k': 7500, // Age 50+
  'enhanced_catch_up_401k': 11250, // Ages 60-63
  'catch_up_ira': 1000   // Age 50+
};

/**
 * Waterfall Allocation Event Processor
 * 
 * Handles evaluation and execution of waterfall allocation events
 */
export class WaterfallAllocationProcessor {
  /**
   * Evaluates a waterfall allocation event and returns actions to execute
   */
  static async evaluate(
    event: WaterfallAllocationEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    // Validate the event first
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid waterfall allocation event: ${validation.errorMessage}`);
    }

    // Check if base conditions are met
    if (!this.checkConditions(event, context)) {
      return []; // No actions if conditions aren't met
    }

    // Calculate waterfall allocations
    const allocations = calculateWaterfallAllocation(event, context);
    
    if (!allocations || allocations.length === 0) {
      return [];
    }

    // Convert allocations to actions
    const actions: EventAction[] = [];
    
    for (const allocation of allocations) {
      if (allocation.allocatedAmount > 0) {
        // Validate the calculated amount
        try {
          validateAmount(allocation.allocatedAmount, { 
            min: 0, 
            max: 1000000, // Reasonable upper limit
            name: `Waterfall allocation to ${allocation.targetAccount}` 
          });
        } catch (error) {
          logger.error('Invalid allocation amount calculated:', 'DATA', error);
          continue;
        }

        const action: EventAction = {
          type: 'CONTRIBUTION',
          amount: allocation.allocatedAmount,
          sourceAccount: 'cash',
          targetAccount: allocation.targetAccount,
          description: this.generateActionDescription(allocation, event),
          priority: event.priority,
          metadata: {
            waterfallPriority: allocation.priority,
            remainingCapacity: allocation.remainingCapacity || 0
          }
        };

        actions.push(action);
      }
    }

    // Handle remainder if specified
    if (event.remainder && actions.length > 0) {
      const totalAllocated = actions.reduce((sum, action) => sum + action.amount, 0);
      const remainderAmount = Math.max(0, event.totalAmount - totalAllocated);
      
      if (remainderAmount > 0) {
        const remainderAction = this.createRemainderAction(event.remainder, remainderAmount, event.priority);
        if (remainderAction) {
          actions.push(remainderAction);
        }
      }
    }

    return actions;
  }

  /**
   * Validates the waterfall allocation event
   */
  static validateEvent(event: WaterfallAllocationEvent): ValidationResult {
    return validateDynamicEvent(event);
  }

  /**
   * Checks if event conditions are met
   */
  static checkConditions(event: WaterfallAllocationEvent, context: SimulationContext): boolean {
    // Check if we have enough cash for the total amount
    if (context.cashBalance < event.totalAmount) {
      return false;
    }

    // Check optional condition set
    if (event.conditions) {
      return this.evaluateConditionSet(event.conditions, context);
    }

    return true;
  }

  /**
   * Evaluates the condition set for the event
   */
  private static evaluateConditionSet(conditions: any, context: SimulationContext): boolean {
    // Cash balance conditions
    if (conditions.cashBalance) {
      if (conditions.cashBalance.min && context.cashBalance < conditions.cashBalance.min) {
        return false;
      }
      if (conditions.cashBalance.max && context.cashBalance > conditions.cashBalance.max) {
        return false;
      }
    }

    // Income conditions
    if (conditions.income) {
      if (conditions.income.minMonthly && context.monthlyIncome < conditions.income.minMonthly) {
        return false;
      }
      if (conditions.income.maxMonthly && context.monthlyIncome > conditions.income.maxMonthly) {
        return false;
      }
      if (conditions.income.minAnnual && (context.monthlyIncome * 12) < conditions.income.minAnnual) {
        return false;
      }
      if (conditions.income.maxAnnual && (context.monthlyIncome * 12) > conditions.income.maxAnnual) {
        return false;
      }
    }

    // Age conditions
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

  /**
   * Generates a descriptive action description
   */
  private static generateActionDescription(
    allocation: { priority: number; targetAccount: StandardAccountType; allocatedAmount: number; },
    event: WaterfallAllocationEvent
  ): string {
    const tierInfo = event.waterfall.find(tier => tier.priority === allocation.priority);
    const description = tierInfo?.description || `Priority ${allocation.priority}`;
    
    return `Waterfall allocation: ${formatCurrency(allocation.allocatedAmount)} to ${allocation.targetAccount} (${description})`;
  }

  /**
   * Creates a remainder action based on the remainder strategy
   */
  private static createRemainderAction(
    remainder: WaterfallAllocationEvent['remainder'],
    amount: number,
    priority: EventPriority
  ): EventAction | null {
    if (!remainder || amount <= 0) {
      return null;
    }

    switch (remainder.action) {
      case 'INVEST_TAXABLE':
        return {
          type: 'CONTRIBUTION',
          amount,
          sourceAccount: 'cash',
          targetAccount: remainder.targetAccount || 'taxable',
          description: `Waterfall remainder: ${formatCurrency(amount)} to taxable investments`,
          priority
        };

      case 'KEEP_CASH':
        return {
          type: 'TRANSFER',
          amount,
          sourceAccount: 'cash',
          targetAccount: 'cash',
          description: `Waterfall remainder: ${formatCurrency(amount)} kept in cash`,
          priority
        };

      case 'DISTRIBUTE_EVENLY':
        // TODO: Implement even distribution logic
        return null;

      default:
        return null;
    }
  }

  /**
   * Creates a template waterfall allocation event with sensible defaults
   */
  static createTemplate(overrides: Partial<WaterfallAllocationEvent> = {}): WaterfallAllocationEvent {
    return {
      id: `waterfall-allocation-${Date.now()}`,
      type: EventType.WATERFALL_ALLOCATION,
      name: 'Optimal Contribution Strategy',
      description: 'Priority-based savings allocation for maximum tax efficiency',
      priority: 40 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      totalAmount: 5000,
      waterfall: [
        {
          priority: 1,
          targetAccount: 'tax_deferred',
          maxAmount: 23500,
          description: '401k to employer match',
          conditions: { employerMatch: true }
        },
        {
          priority: 2,
          targetAccount: 'tax_deferred',
          maxAmount: 4300,
          description: 'HSA contribution'
        },
        {
          priority: 3,
          targetAccount: 'roth',
          maxAmount: 7000,
          description: 'Roth IRA'
        }
      ],
      remainder: {
        action: 'INVEST_TAXABLE',
        targetAccount: 'taxable'
      },
      ...overrides
    };
  }

  /**
   * Validates user input for creating/editing waterfall allocation events
   */
  static validateUserInput(input: Partial<WaterfallAllocationEvent>): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (typeof input.totalAmount !== 'number' || input.totalAmount <= 0) {
      errors.push('Total amount must be a positive number');
    }

    if (!input.waterfall || !Array.isArray(input.waterfall) || input.waterfall.length === 0) {
      errors.push('Waterfall tiers are required');
    }

    // Validate waterfall tiers
    if (input.waterfall && Array.isArray(input.waterfall)) {
      const priorities = new Set();
      
      for (let i = 0; i < input.waterfall.length; i++) {
        const tier = input.waterfall[i];
        
        if (typeof tier.priority !== 'number' || tier.priority < 1) {
          errors.push(`Tier ${i + 1}: Priority must be a positive number`);
        }
        
        if (priorities.has(tier.priority)) {
          errors.push(`Tier ${i + 1}: Duplicate priority ${tier.priority}`);
        }
        priorities.add(tier.priority);
        
        if (!tier.targetAccount) {
          errors.push(`Tier ${i + 1}: Target account is required`);
        }
        
        if (tier.maxAmount && (typeof tier.maxAmount !== 'number' || tier.maxAmount <= 0)) {
          errors.push(`Tier ${i + 1}: Max amount must be a positive number`);
        }
      }
    }

    // Remainder validation
    if (input.remainder && !input.remainder.action) {
      errors.push('Remainder action is required if remainder is specified');
    }

    // Reasonable limits
    if (typeof input.totalAmount === 'number' && input.totalAmount > 200000) {
      errors.push('Total amount seems unusually high (max $200,000)');
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

  /**
   * Explains the event behavior in user-friendly terms
   */
  static explainBehavior(event: WaterfallAllocationEvent): string {
    const totalAmount = formatCurrency(event.totalAmount);
    
    let explanation = `This event allocates ${totalAmount} each month using a priority-based waterfall strategy:\n\n`;
    
    // Explain each tier
    event.waterfall
      .sort((a, b) => a.priority - b.priority)
      .forEach((tier, index) => {
        const maxAmount = tier.maxAmount ? ` (up to ${formatCurrency(tier.maxAmount)})` : '';
        explanation += `${tier.priority}. ${tier.description}${maxAmount} → ${tier.targetAccount.replace('_', ' ')} account\n`;
      });
    
    // Explain remainder handling
    if (event.remainder) {
      explanation += `\nAny remaining funds will be `;
      switch (event.remainder.action) {
        case 'INVEST_TAXABLE':
          explanation += `invested in your ${event.remainder.targetAccount || 'taxable'} account.`;
          break;
        case 'KEEP_CASH':
          explanation += `kept in cash.`;
          break;
        case 'DISTRIBUTE_EVENLY':
          explanation += `distributed evenly across unfilled tiers.`;
          break;
      }
    }
    
    explanation += `\n\nThis ensures optimal tax efficiency by prioritizing tax-advantaged accounts while respecting contribution limits.`;
    
    return explanation;
  }

  /**
   * Gets the effective annual contribution limit for an account type
   */
  static getContributionLimit(accountType: StandardAccountType, age: number): number {
    const isCatchUpEligible = age >= 50;
    
    switch (accountType) {
      case 'tax_deferred':
        return CONTRIBUTION_LIMITS_2024['401k'] + (isCatchUpEligible ? CONTRIBUTION_LIMITS_2024.catch_up_401k : 0);
      case 'roth':
        return CONTRIBUTION_LIMITS_2024.roth_ira + (isCatchUpEligible ? CONTRIBUTION_LIMITS_2024.catch_up_ira : 0);
      // HSA case handled through description matching
      case 'taxable':
      case 'cash':
      case '529':
        return Infinity; // No contribution limits
      default:
        return 0;
    }
  }
}

/**
 * Factory function for creating waterfall allocation events
 */
export function createWaterfallAllocation(
  config: {
    name: string;
    totalAmount: number;
    waterfall: Array<{
      priority: number;
      targetAccount: StandardAccountType;
      maxAmount?: number;
      description: string;
      conditions?: any;
    }>;
    remainder?: {
      action: 'INVEST_TAXABLE' | 'KEEP_CASH' | 'DISTRIBUTE_EVENLY';
      targetAccount?: StandardAccountType;
    };
    conditions?: any;
  }
): WaterfallAllocationEvent {
  return WaterfallAllocationProcessor.createTemplate({
    name: config.name,
    description: `Waterfall allocation: ${config.name}`,
    totalAmount: config.totalAmount,
    waterfall: config.waterfall,
    remainder: config.remainder,
    conditions: config.conditions
  });
}

/**
 * Predefined templates for common waterfall strategies
 */
export const WaterfallAllocationTemplates = {
  /**
   * Max Out Everything: Optimal order for high earners
   */
  maxOutEverything: (totalAmount: number): WaterfallAllocationEvent => 
    createWaterfallAllocation({
      name: 'Max Out Everything',
      totalAmount,
      waterfall: [
        {
          priority: 1,
          targetAccount: 'tax_deferred',
          maxAmount: 12000, // Assumes 50% employer match up to 6%
          description: '401k to full employer match',
          conditions: { employerMatch: true }
        },
        {
          priority: 2,
          targetAccount: 'tax_deferred',
          maxAmount: 4300,
          description: 'HSA contribution (triple tax advantage)'
        },
        {
          priority: 3,
          targetAccount: 'roth',
          maxAmount: 7000,
          description: 'Roth IRA contribution'
        },
        {
          priority: 4,
          targetAccount: 'tax_deferred',
          maxAmount: 23500,
          description: 'Additional 401k contribution'
        }
      ],
      remainder: {
        action: 'INVEST_TAXABLE',
        targetAccount: 'taxable'
      }
    }),

  /**
   * Balanced Approach: Emergency fund then balanced retirement savings
   */
  balancedApproach: (totalAmount: number, emergencyFundTarget: number): WaterfallAllocationEvent =>
    createWaterfallAllocation({
      name: 'Balanced Approach',
      totalAmount,
      waterfall: [
        {
          priority: 1,
          targetAccount: 'cash',
          maxAmount: emergencyFundTarget,
          description: 'Emergency fund (6 months expenses)'
        },
        {
          priority: 2,
          targetAccount: 'tax_deferred',
          maxAmount: 12000,
          description: '401k to employer match'
        },
        {
          priority: 3,
          targetAccount: 'roth',
          maxAmount: 7000,
          description: 'Roth IRA contribution'
        },
        {
          priority: 4,
          targetAccount: 'tax_deferred',
          maxAmount: 23500,
          description: 'Additional 401k contribution'
        }
      ],
      remainder: {
        action: 'INVEST_TAXABLE',
        targetAccount: 'taxable'
      }
    }),

  /**
   * Retirement Focused: Max all retirement accounts first
   */
  retirementFocused: (totalAmount: number): WaterfallAllocationEvent =>
    createWaterfallAllocation({
      name: 'Retirement Focused',
      totalAmount,
      waterfall: [
        {
          priority: 1,
          targetAccount: 'tax_deferred',
          maxAmount: 23500,
          description: '401k contribution (full amount)'
        },
        {
          priority: 2,
          targetAccount: 'tax_deferred',
          maxAmount: 4300,
          description: 'HSA contribution'
        },
        {
          priority: 3,
          targetAccount: 'roth',
          maxAmount: 7000,
          description: 'Roth IRA contribution'
        }
      ],
      remainder: {
        action: 'INVEST_TAXABLE',
        targetAccount: 'taxable'
      }
    }),

  /**
   * Tax Optimized: HSA first, then traditional accounts for tax deduction
   */
  taxOptimized: (totalAmount: number): WaterfallAllocationEvent =>
    createWaterfallAllocation({
      name: 'Tax Optimized',
      totalAmount,
      waterfall: [
        {
          priority: 1,
          targetAccount: 'tax_deferred',
          maxAmount: 4300,
          description: 'HSA (triple tax advantage)'
        },
        {
          priority: 2,
          targetAccount: 'tax_deferred',
          maxAmount: 23500,
          description: 'Traditional 401k (tax deduction)'
        },
        {
          priority: 3,
          targetAccount: 'roth',
          maxAmount: 7000,
          description: 'Backdoor Roth IRA',
          conditions: { incomeLimit: 140000 }
        }
      ],
      remainder: {
        action: 'INVEST_TAXABLE',
        targetAccount: 'taxable'
      }
    })
};