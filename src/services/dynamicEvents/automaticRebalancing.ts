/**
 * Automatic Rebalancing Dynamic Event Implementation
 * 
 * Implements sophisticated portfolio rebalancing: "Rebalance portfolio monthly if any asset class drifts >5% from target"
 * This provides automated portfolio maintenance with tax-efficient rebalancing strategies.
 */

import { AutomaticRebalancingEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';

/**
 * Portfolio state interface for rebalancing calculations
 */
interface PortfolioState {
  totalValue: number;
  currentAllocation: {
    stocks: number;
    bonds: number;
    international: number;
    realEstate?: number;
    commodities?: number;
    cash?: number;
  };
  accountValues: Record<StandardAccountType, number>;
  driftFromTarget: Record<string, number>;
  requiresRebalancing: boolean;
}

/**
 * Rebalancing trade interface
 */
interface RebalancingTrade {
  fromAsset: string;
  toAsset: string;
  amount: number;
  preferredAccount: StandardAccountType;
  reason: string;
  taxImplications: 'NONE' | 'MINIMAL' | 'SIGNIFICANT';
}

/**
 * Automatic Rebalancing Event Processor
 */
export class AutomaticRebalancingProcessor {
  static async evaluate(
    event: AutomaticRebalancingEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid automatic rebalancing event: ${validation.errorMessage}`);
    }

    if (!this.checkConditions(event, context)) {
      return [];
    }

    // Calculate current portfolio state
    const portfolioState = this.calculatePortfolioState(event, context);
    
    if (!portfolioState.requiresRebalancing) {
      return []; // No rebalancing needed
    }

    // Generate rebalancing trades
    const trades = this.generateRebalancingTrades(event, portfolioState);
    
    if (trades.length === 0) {
      return [];
    }

    // Convert trades to actions
    const actions: EventAction[] = [];
    for (const trade of trades) {
      const action: EventAction = {
        type: 'REBALANCE',
        amount: trade.amount,
        sourceAccount: trade.preferredAccount,
        targetAccount: trade.preferredAccount,
        description: this.generateTradeDescription(trade),
        priority: event.priority || 50 as any,
        metadata: {
          rebalancingEvent: true,
          fromAsset: trade.fromAsset,
          toAsset: trade.toAsset,
          driftCorrection: true,
          taxImplications: trade.taxImplications,
          reason: trade.reason
        }
      };
      
      actions.push(action);
    }

    return actions;
  }

  /**
   * Calculate current portfolio state and drift from targets
   */
  private static calculatePortfolioState(
    event: AutomaticRebalancingEvent,
    context: SimulationContext
  ): PortfolioState {
    // Calculate total portfolio value across included accounts
    let totalValue = 0;
    const accountValues: Record<StandardAccountType, number> = {} as any;
    
    for (const accountType of event.accountScope.includedAccounts) {
      const balance = context.accountBalances?.[accountType] || 0;
      accountValues[accountType] = balance;
      totalValue += balance;
    }

    // Mock current allocation calculation - in real implementation would analyze holdings
    const currentAllocation = this.estimateCurrentAllocation(context, event.accountScope.includedAccounts);
    
    // Calculate drift from target allocation
    const driftFromTarget: Record<string, number> = {};
    const targetAllocation = event.targetAllocation;
    
    driftFromTarget.stocks = Math.abs(currentAllocation.stocks - targetAllocation.stocks);
    driftFromTarget.bonds = Math.abs(currentAllocation.bonds - targetAllocation.bonds);
    driftFromTarget.international = Math.abs(currentAllocation.international - targetAllocation.international);
    
    if (targetAllocation.realEstate && currentAllocation.realEstate) {
      driftFromTarget.realEstate = Math.abs(currentAllocation.realEstate - targetAllocation.realEstate);
    }

    // Check if rebalancing is required
    const maxDrift = Math.max(...Object.values(driftFromTarget));
    const requiresRebalancing = maxDrift > event.rebalancingTriggers.driftThreshold;

    return {
      totalValue,
      currentAllocation,
      accountValues,
      driftFromTarget,
      requiresRebalancing
    };
  }

  /**
   * Generate optimal rebalancing trades
   */
  private static generateRebalancingTrades(
    event: AutomaticRebalancingEvent,
    portfolioState: PortfolioState
  ): RebalancingTrade[] {
    const trades: RebalancingTrade[] = [];
    const { totalValue, currentAllocation, driftFromTarget } = portfolioState;
    const { targetAllocation } = event;
    
    // Simple rebalancing algorithm - sell overweight, buy underweight
    const assetsToRebalance: Array<{ asset: string; currentWeight: number; targetWeight: number; drift: number }> = [
      { asset: 'stocks', currentWeight: currentAllocation.stocks, targetWeight: targetAllocation.stocks, drift: driftFromTarget.stocks },
      { asset: 'bonds', currentWeight: currentAllocation.bonds, targetWeight: targetAllocation.bonds, drift: driftFromTarget.bonds },
      { asset: 'international', currentWeight: currentAllocation.international, targetWeight: targetAllocation.international, drift: driftFromTarget.international }
    ];

    // Add optional assets if they exist
    if (targetAllocation.realEstate && currentAllocation.realEstate) {
      assetsToRebalance.push({
        asset: 'realEstate',
        currentWeight: currentAllocation.realEstate,
        targetWeight: targetAllocation.realEstate,
        drift: driftFromTarget.realEstate || 0
      });
    }

    // Generate trades for assets that need significant adjustment
    const driftThreshold = event.rebalancingTriggers.driftThreshold;
    
    for (const asset of assetsToRebalance) {
      if (asset.drift > driftThreshold) {
        const currentValue = asset.currentWeight * totalValue;
        const targetValue = asset.targetWeight * totalValue;
        const tradeAmount = Math.abs(targetValue - currentValue);
        
        // Skip small trades if minimum trade amount is set
        if (event.rebalancingTriggers.minimumTradeAmount && 
            tradeAmount < event.rebalancingTriggers.minimumTradeAmount) {
          continue;
        }

        const isOverweight = asset.currentWeight > asset.targetWeight;
        const preferredAccount = this.selectOptimalAccount(event, isOverweight ? 'SELL' : 'BUY');
        
        const trade: RebalancingTrade = {
          fromAsset: isOverweight ? asset.asset : 'cash',
          toAsset: isOverweight ? 'cash' : asset.asset,
          amount: tradeAmount,
          preferredAccount,
          reason: `Drift correction: ${asset.asset} is ${isOverweight ? 'overweight' : 'underweight'} by ${formatPercentage(asset.drift)}`,
          taxImplications: preferredAccount === 'taxable' ? 'SIGNIFICANT' : 'MINIMAL'
        };
        
        trades.push(trade);
      }
    }

    // Limit trades per rebalancing if constraint is set
    if (event.constraints?.maxTradesPerRebalance) {
      return trades.slice(0, event.constraints.maxTradesPerRebalance);
    }

    return trades;
  }

  /**
   * Select optimal account for rebalancing trades
   */
  private static selectOptimalAccount(
    event: AutomaticRebalancingEvent,
    tradeType: 'BUY' | 'SELL'
  ): StandardAccountType {
    const preferredAccounts = event.constraints?.preferredTradingAccounts;
    
    if (preferredAccounts && preferredAccounts.length > 0) {
      // Use preferred account if available
      return preferredAccounts[0];
    }
    
    // Default to first included account for tax-deferred trades
    const includedAccounts = event.accountScope.includedAccounts;
    
    // Prefer tax-advantaged accounts for rebalancing to avoid tax implications
    const taxAdvantaged = includedAccounts.filter(acc => acc === 'tax_deferred' || acc === 'roth');
    if (taxAdvantaged.length > 0) {
      return taxAdvantaged[0];
    }
    
    return includedAccounts[0] || 'taxable';
  }

  /**
   * Estimate current allocation based on account balances
   */
  private static estimateCurrentAllocation(
    context: SimulationContext,
    includedAccounts: StandardAccountType[]
  ): PortfolioState['currentAllocation'] {
    // Mock allocation estimation - in real implementation would analyze actual holdings
    // This is a simplified model assuming different accounts have different default allocations
    
    let totalValue = 0;
    let stocksValue = 0;
    let bondsValue = 0;
    let internationalValue = 0;
    
    for (const accountType of includedAccounts) {
      const balance = context.accountBalances?.[accountType] || 0;
      totalValue += balance;
      
      // Estimate allocation based on account type (simplified)
      switch (accountType) {
        case 'tax_deferred':
          stocksValue += balance * 0.7; // Assume 70% stocks in 401k
          bondsValue += balance * 0.2;  // 20% bonds
          internationalValue += balance * 0.1; // 10% international
          break;
        case 'roth':
          stocksValue += balance * 0.8; // More aggressive in Roth
          internationalValue += balance * 0.2;
          break;
        case 'taxable':
          stocksValue += balance * 0.6; // More conservative in taxable
          bondsValue += balance * 0.3;
          internationalValue += balance * 0.1;
          break;
        default:
          stocksValue += balance * 0.6; // Default allocation
          bondsValue += balance * 0.4;
          break;
      }
    }
    
    if (totalValue === 0) {
      return { stocks: 0, bonds: 0, international: 0 };
    }
    
    return {
      stocks: stocksValue / totalValue,
      bonds: bondsValue / totalValue,
      international: internationalValue / totalValue
    };
  }

  /**
   * Generate description for rebalancing trade
   */
  private static generateTradeDescription(trade: RebalancingTrade): string {
    const action = trade.fromAsset === 'cash' ? 'Buy' : 'Sell';
    const asset = trade.fromAsset === 'cash' ? trade.toAsset : trade.fromAsset;
    
    return `${action} ${formatCurrency(trade.amount)} of ${asset} - ${trade.reason}`;
  }

  /**
   * Check if rebalancing conditions are met
   */
  private static checkConditions(
    event: AutomaticRebalancingEvent,
    context: SimulationContext
  ): boolean {
    // Check minimum cash reserve requirement
    if (event.constraints?.minimumCashReserve) {
      const cashBalance = context.accountBalances.cash || 0;
      if (cashBalance < event.constraints.minimumCashReserve) {
        return false;
      }
    }

    // Check time-based trigger if set
    if (event.rebalancingTriggers.timeBased) {
      const currentMonth = context.currentMonth;
      
      switch (event.rebalancingTriggers.timeBased) {
        case 'MONTHLY':
          return true; // Can rebalance every month
        case 'QUARTERLY':
          return currentMonth % 3 === 0; // Every 3 months
        case 'ANNUALLY':
          return currentMonth % 12 === 0; // Every 12 months
      }
    }

    return true;
  }

  /**
   * Validate rebalancing event configuration
   */
  static validateEvent(event: AutomaticRebalancingEvent): ValidationResult {
    const errors: string[] = [];

    // Validate target allocation sums to 1.0
    const totalAllocation = 
      event.targetAllocation.stocks + 
      event.targetAllocation.bonds + 
      event.targetAllocation.international +
      (event.targetAllocation.realEstate || 0) +
      (event.targetAllocation.commodities || 0) +
      (event.targetAllocation.cash || 0);

    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      errors.push('Target allocation must sum to 1.0 (100%)');
    }

    // Validate drift threshold
    if (event.rebalancingTriggers.driftThreshold <= 0 || event.rebalancingTriggers.driftThreshold > 0.5) {
      errors.push('Drift threshold must be between 0 and 0.5 (50%)');
    }

    // Validate account scope
    if (event.accountScope.includedAccounts.length === 0) {
      errors.push('Must include at least one account for rebalancing');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Validate user input for creating rebalancing event
   */
  static validateUserInput(input: any): ValidationResult {
    const errors: string[] = [];

    if (!input.name || typeof input.name !== 'string') {
      errors.push('Event name is required');
    }

    if (!input.targetAllocation || typeof input.targetAllocation !== 'object') {
      errors.push('Target allocation is required');
    }

    if (!input.rebalancingTriggers || typeof input.rebalancingTriggers !== 'object') {
      errors.push('Rebalancing triggers configuration is required');
    }

    if (!input.accountScope || !Array.isArray(input.accountScope?.includedAccounts)) {
      errors.push('Account scope with included accounts is required');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Explain rebalancing behavior for user
   */
  static explainBehavior(event: AutomaticRebalancingEvent): string {
    const targetDesc = Object.entries(event.targetAllocation)
      .map(([asset, weight]) => `${asset}: ${formatPercentage(weight)}`)
      .join(', ');

    const frequency = event.rebalancingTriggers.timeBased || 'drift-based';
    const driftThreshold = formatPercentage(event.rebalancingTriggers.driftThreshold);

    return `This event automatically rebalances your portfolio to maintain target allocation (${targetDesc}). 
    
Rebalancing triggers when any asset class drifts more than ${driftThreshold} from its target allocation${event.rebalancingTriggers.timeBased ? ` or ${frequency}` : ''}.

The system ${event.accountScope.treatAsOnePortfolio ? 'treats all accounts as one portfolio for asset location optimization' : 'rebalances each account separately'}.

${event.constraints?.preferredTradingAccounts ? `Trades are preferentially made in: ${event.constraints.preferredTradingAccounts.join(', ')} accounts for tax efficiency.` : ''}

This helps maintain your desired risk level and ensures your portfolio doesn't drift due to market movements.`;
  }

  /**
   * Create template rebalancing event
   */
  static createTemplate(overrides: Partial<AutomaticRebalancingEvent> = {}): AutomaticRebalancingEvent {
    return {
      id: `automatic-rebalancing-${Date.now()}`,
      type: EventType.AUTOMATIC_REBALANCING,
      name: 'Portfolio Auto-Rebalancing',
      description: 'Automatically rebalance portfolio when allocation drifts from target',
      priority: 35 as EventPriority, // Medium priority
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      
      targetAllocation: {
        stocks: 0.60,
        bonds: 0.30,
        international: 0.10
      },
      
      rebalancingTriggers: {
        driftThreshold: 0.05, // 5% drift threshold
        timeBased: 'QUARTERLY',
        minimumTradeAmount: 1000
      },
      
      accountScope: {
        includedAccounts: ['tax_deferred', 'roth', 'taxable'],
        treatAsOnePortfolio: true
      },
      
      constraints: {
        maxTradesPerRebalance: 5,
        preferredTradingAccounts: ['tax_deferred', 'roth'],
        avoidWashSales: true,
        minimumCashReserve: 5000
      },
      
      ...overrides
    };
  }
}

/**
 * Factory function for creating automatic rebalancing events
 */
export function createAutomaticRebalancing(
  config: {
    name: string;
    targetAllocation: {
      stocks: number;
      bonds: number;
      international: number;
      realEstate?: number;
    };
    driftThreshold: number;
    frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    accountScope: StandardAccountType[];
    treatAsOnePortfolio?: boolean;
  }
): AutomaticRebalancingEvent {
  return AutomaticRebalancingProcessor.createTemplate({
    name: config.name,
    description: `Automatic rebalancing with ${(config.driftThreshold * 100).toFixed(1)}% drift threshold`,
    targetAllocation: config.targetAllocation,
    rebalancingTriggers: {
      driftThreshold: config.driftThreshold,
      timeBased: config.frequency || 'QUARTERLY',
      minimumTradeAmount: 500
    },
    accountScope: {
      includedAccounts: config.accountScope,
      treatAsOnePortfolio: config.treatAsOnePortfolio ?? true
    }
  });
}

/**
 * Pre-built automatic rebalancing templates
 */
export const AutomaticRebalancingTemplates = {
  conservative: (): AutomaticRebalancingEvent => 
    createAutomaticRebalancing({
      name: 'Conservative Portfolio Rebalancing',
      targetAllocation: { stocks: 0.40, bonds: 0.50, international: 0.10 },
      driftThreshold: 0.05,
      frequency: 'QUARTERLY',
      accountScope: ['tax_deferred', 'roth']
    }),

  balanced: (): AutomaticRebalancingEvent =>
    createAutomaticRebalancing({
      name: 'Balanced Portfolio Rebalancing', 
      targetAllocation: { stocks: 0.60, bonds: 0.30, international: 0.10 },
      driftThreshold: 0.05,
      frequency: 'QUARTERLY',
      accountScope: ['tax_deferred', 'roth', 'taxable']
    }),

  aggressive: (): AutomaticRebalancingEvent =>
    createAutomaticRebalancing({
      name: 'Aggressive Portfolio Rebalancing',
      targetAllocation: { stocks: 0.80, bonds: 0.10, international: 0.10 },
      driftThreshold: 0.03, // Tighter rebalancing for aggressive portfolio
      frequency: 'MONTHLY',
      accountScope: ['tax_deferred', 'roth', 'taxable']
    }),

  threeFund: (): AutomaticRebalancingEvent =>
    createAutomaticRebalancing({
      name: 'Three-Fund Portfolio Rebalancing',
      targetAllocation: { stocks: 0.70, bonds: 0.20, international: 0.10 },
      driftThreshold: 0.05,
      frequency: 'QUARTERLY',
      accountScope: ['tax_deferred', 'roth']
    })
};