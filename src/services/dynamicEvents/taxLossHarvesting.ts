/**
 * Tax Loss Harvesting Dynamic Event Implementation
 * 
 * Implements year-end tax optimization: "Harvest losses in taxable accounts while avoiding wash sale rules"
 * This provides automatic tax-loss harvesting to reduce tax liability while maintaining target allocation.
 */

import { TaxLossHarvestingEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';

/**
 * Tax loss harvesting analysis interface
 */
interface TaxLossAnalysis {
  taxableAccountBalance: number;
  estimatedUnrealizedLosses: number;
  harvestableAmount: number;
  estimatedTaxSavings: number;
  washSaleRisk: boolean;
  harvestingActions: HarvestingAction[];
  shouldExecute: boolean;
  harvestingReason: string;
}

/**
 * Harvesting action interface
 */
interface HarvestingAction {
  action: 'SELL_LOSERS' | 'BUY_SUBSTITUTE' | 'WAIT_WASH_SALE';
  assetClass: string;
  amount: number;
  estimatedLoss: number;
  taxSavings: number;
  reason: string;
  waitPeriod?: number; // Days to wait for wash sale rule
}

/**
 * Tax Loss Harvesting Event Processor
 */
export class TaxLossHarvestingProcessor {
  static async evaluate(
    event: TaxLossHarvestingEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid tax loss harvesting event: ${validation.errorMessage}`);
    }

    // Check if it's harvesting season
    if (!this.isHarvestingSeason(event, context)) {
      return [];
    }

    // Analyze tax loss harvesting opportunities
    const harvestingAnalysis = this.analyzeTaxLossOpportunities(event, context);
    
    if (!harvestingAnalysis.shouldExecute) {
      return [];
    }

    // Generate tax loss harvesting actions
    const actions = this.generateHarvestingActions(event, harvestingAnalysis, context);

    return actions;
  }

  /**
   * Check if it's the appropriate time for tax loss harvesting
   */
  private static isHarvestingSeason(
    event: TaxLossHarvestingEvent,
    context: SimulationContext
  ): boolean {
    const currentMonth = context.currentMonth % 12; // 0-11
    
    switch (event.harvestingRules.timing) {
      case 'YEAR_END':
        return currentMonth >= 10; // November-December (months 10-11)
      
      case 'QUARTERLY':
        return currentMonth % 3 === 2; // End of quarters (Mar, Jun, Sep, Dec)
      
      case 'CONTINUOUS':
        return true; // Can harvest anytime
      
      default:
        return currentMonth === 11; // December only
    }
  }

  /**
   * Analyze tax loss harvesting opportunities
   */
  private static analyzeTaxLossOpportunities(
    event: TaxLossHarvestingEvent,
    context: SimulationContext
  ): TaxLossAnalysis {
    const taxableBalance = context.accountBalances.taxable || 0;
    
    if (taxableBalance < event.thresholds.minimumAccountValue) {
      return {
        taxableAccountBalance: taxableBalance,
        estimatedUnrealizedLosses: 0,
        harvestableAmount: 0,
        estimatedTaxSavings: 0,
        washSaleRisk: false,
        harvestingActions: [],
        shouldExecute: false,
        harvestingReason: `Taxable account balance ${formatCurrency(taxableBalance)} below minimum threshold ${formatCurrency(event.thresholds.minimumAccountValue)}`
      };
    }

    // Estimate unrealized losses (simplified calculation)
    const estimatedLossRate = this.estimateMarketLossRate(context);
    const estimatedUnrealizedLosses = taxableBalance * estimatedLossRate;
    
    // Calculate harvestable amount
    const harvestableAmount = Math.min(
      estimatedUnrealizedLosses,
      event.thresholds.maxAnnualHarvesting || estimatedUnrealizedLosses,
      taxableBalance * 0.3 // Don't harvest more than 30% of portfolio
    );

    // Estimate tax savings
    const estimatedTaxSavings = harvestableAmount * (event.taxSettings.marginalTaxRate || 0.25);
    
    // Check if harvesting meets minimum threshold
    const meetsMinimumThreshold = estimatedTaxSavings >= event.thresholds.minimumTaxSavings;
    
    // Check wash sale risk
    const washSaleRisk = this.assessWashSaleRisk(event, context);
    
    // Generate harvesting actions if profitable
    const harvestingActions = meetsMinimumThreshold && !washSaleRisk ? 
      this.planHarvestingActions(event, harvestableAmount, estimatedUnrealizedLosses) : [];
    
    const shouldExecute = meetsMinimumThreshold && !washSaleRisk && harvestingActions.length > 0;
    
    const harvestingReason = this.generateHarvestingReason(
      meetsMinimumThreshold,
      washSaleRisk,
      estimatedTaxSavings,
      event.thresholds.minimumTaxSavings
    );

    return {
      taxableAccountBalance: taxableBalance,
      estimatedUnrealizedLosses,
      harvestableAmount,
      estimatedTaxSavings,
      washSaleRisk,
      harvestingActions,
      shouldExecute,
      harvestingReason
    };
  }

  /**
   * Estimate current market loss rate for tax loss harvesting
   */
  private static estimateMarketLossRate(context: SimulationContext): number {
    // Simplified: use year-to-date performance or assume some market volatility
    // In a real implementation, this would look at actual portfolio performance
    const currentMonth = context.currentMonth % 12;
    
    // Assume higher loss opportunities late in bear market years
    if (currentMonth >= 9) { // Q4
      return 0.15; // Assume 15% of holdings have unrealized losses
    } else if (currentMonth >= 6) { // Q3
      return 0.10; // 10% loss opportunity
    } else {
      return 0.05; // 5% baseline loss opportunity
    }
  }

  /**
   * Assess wash sale risk based on recent transactions
   */
  private static assessWashSaleRisk(
    event: TaxLossHarvestingEvent,
    context: SimulationContext
  ): boolean {
    // Simplified wash sale risk assessment
    // In a real implementation, this would check transaction history
    
    if (!event.washSaleProtection.enabled) {
      return false; // User disabled wash sale protection
    }
    
    // Assume lower risk if it's been a while since last harvesting
    const monthsSinceLastHarvest = 2; // Simplified
    return monthsSinceLastHarvest < 2; // Risky if harvested recently
  }

  /**
   * Plan specific harvesting actions
   */
  private static planHarvestingActions(
    event: TaxLossHarvestingEvent,
    harvestableAmount: number,
    totalUnrealizedLosses: number
  ): HarvestingAction[] {
    const actions: HarvestingAction[] = [];
    
    // Plan to sell losers first
    const sellAmount = harvestableAmount * 0.8; // Sell 80% of harvestable amount
    const estimatedLoss = sellAmount * 0.2; // Assume 20% loss on positions
    const taxSavings = estimatedLoss * (event.taxSettings.marginalTaxRate || 0.25);
    
    actions.push({
      action: 'SELL_LOSERS',
      assetClass: 'stocks',
      amount: sellAmount,
      estimatedLoss,
      taxSavings,
      reason: 'Harvest tax losses from underperforming stock positions'
    });
    
    // Plan substitute purchases if enabled
    if (event.washSaleProtection.useSubstitutes) {
      actions.push({
        action: 'BUY_SUBSTITUTE',
        assetClass: 'stocks',
        amount: sellAmount,
        estimatedLoss: 0,
        taxSavings: 0,
        reason: 'Purchase substitute ETF to maintain market exposure'
      });
    } else if (event.washSaleProtection.waitPeriod) {
      actions.push({
        action: 'WAIT_WASH_SALE',
        assetClass: 'stocks',
        amount: sellAmount,
        estimatedLoss: 0,
        taxSavings: 0,
        reason: 'Wait 31 days before repurchasing to avoid wash sale',
        waitPeriod: 31
      });
    }
    
    return actions;
  }

  /**
   * Generate harvesting reason description
   */
  private static generateHarvestingReason(
    meetsThreshold: boolean,
    washSaleRisk: boolean,
    estimatedSavings: number,
    minSavings: number
  ): string {
    if (!meetsThreshold) {
      return `Estimated tax savings ${formatCurrency(estimatedSavings)} below minimum threshold ${formatCurrency(minSavings)}`;
    }
    
    if (washSaleRisk) {
      return 'Wash sale risk detected - skipping harvesting to avoid IRS penalties';
    }
    
    return `Tax loss harvesting opportunity: ${formatCurrency(estimatedSavings)} estimated savings`;
  }

  /**
   * Generate tax loss harvesting actions
   */
  private static generateHarvestingActions(
    event: TaxLossHarvestingEvent,
    analysis: TaxLossAnalysis,
    context: SimulationContext
  ): EventAction[] {
    const actions: EventAction[] = [];
    
    for (const harvestingAction of analysis.harvestingActions) {
      switch (harvestingAction.action) {
        case 'SELL_LOSERS':
          actions.push({
            type: 'WITHDRAWAL',
            amount: harvestingAction.amount,
            sourceAccount: 'taxable',
            description: `Tax loss harvesting: ${harvestingAction.reason}`,
            priority: event.priority,
            metadata: {
              taxLossHarvesting: true,
              estimatedLoss: harvestingAction.estimatedLoss,
              estimatedTaxSavings: harvestingAction.taxSavings,
              harvestingAction: harvestingAction.action,
              assetClass: harvestingAction.assetClass
            }
          });
          break;
        
        case 'BUY_SUBSTITUTE':
          actions.push({
            type: 'CONTRIBUTION',
            amount: harvestingAction.amount,
            targetAccount: 'taxable',
            description: `Tax loss harvesting: ${harvestingAction.reason}`,
            priority: event.priority,
            metadata: {
              taxLossHarvesting: true,
              substituteInvestment: true,
              harvestingAction: harvestingAction.action,
              assetClass: harvestingAction.assetClass
            }
          });
          break;
        
        case 'WAIT_WASH_SALE':
          // This would be handled by scheduling a future action
          // For now, just record the intention
          actions.push({
            type: 'CONTRIBUTION',
            amount: 0, // Placeholder - no immediate action
            targetAccount: 'taxable',
            description: `Tax loss harvesting: ${harvestingAction.reason}`,
            priority: event.priority,
            metadata: {
              taxLossHarvesting: true,
              delayedAction: true,
              waitPeriod: harvestingAction.waitPeriod,
              futureAmount: harvestingAction.amount
            }
          });
          break;
      }
    }
    
    return actions;
  }

  /**
   * Validate tax loss harvesting event configuration
   */
  static validateEvent(event: TaxLossHarvestingEvent): ValidationResult {
    const errors: string[] = [];

    // Validate thresholds
    if (event.thresholds.minimumAccountValue <= 0) {
      errors.push('Minimum account value must be positive');
    }

    if (event.thresholds.minimumTaxSavings <= 0) {
      errors.push('Minimum tax savings threshold must be positive');
    }

    if (event.thresholds.maxAnnualHarvesting && event.thresholds.maxAnnualHarvesting <= 0) {
      errors.push('Maximum annual harvesting amount must be positive');
    }

    // Validate tax settings
    if (event.taxSettings.marginalTaxRate && 
        (event.taxSettings.marginalTaxRate <= 0 || event.taxSettings.marginalTaxRate > 0.5)) {
      errors.push('Marginal tax rate must be between 0 and 0.5 (50%)');
    }

    if (event.taxSettings.capitalGainsRate && 
        (event.taxSettings.capitalGainsRate < 0 || event.taxSettings.capitalGainsRate > 0.4)) {
      errors.push('Capital gains rate must be between 0 and 0.4 (40%)');
    }

    // Validate wash sale protection
    if (event.washSaleProtection.waitPeriod && event.washSaleProtection.waitPeriod < 31) {
      errors.push('Wash sale wait period must be at least 31 days');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Validate user input for creating tax loss harvesting event
   */
  static validateUserInput(input: any): ValidationResult {
    const errors: string[] = [];

    if (!input.name || typeof input.name !== 'string') {
      errors.push('Event name is required');
    }

    if (!input.thresholds || typeof input.thresholds !== 'object') {
      errors.push('Thresholds configuration is required');
    }

    if (!input.taxSettings || typeof input.taxSettings !== 'object') {
      errors.push('Tax settings are required');
    }

    if (!input.harvestingRules || typeof input.harvestingRules !== 'object') {
      errors.push('Harvesting rules are required');
    }

    if (!input.washSaleProtection || typeof input.washSaleProtection !== 'object') {
      errors.push('Wash sale protection settings are required');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Explain tax loss harvesting behavior for user
   */
  static explainBehavior(event: TaxLossHarvestingEvent): string {
    const timing = event.harvestingRules.timing.toLowerCase().replace('_', ' ');
    const minSavings = formatCurrency(event.thresholds.minimumTaxSavings);
    const minAccount = formatCurrency(event.thresholds.minimumAccountValue);
    const taxRate = formatPercentage(event.taxSettings.marginalTaxRate || 0.25);

    return `This event automatically harvests tax losses to reduce your tax liability:

**Harvesting Rules:**
- Timing: ${timing}
- Minimum account value: ${minAccount}
- Minimum tax savings: ${minSavings}
- Your marginal tax rate: ${taxRate}

**Wash Sale Protection:**
- ${event.washSaleProtection.enabled ? 'Enabled' : 'Disabled'}
- ${event.washSaleProtection.useSubstitutes ? 'Uses substitute ETFs to maintain exposure' : 'No substitute investments'}
- ${event.washSaleProtection.waitPeriod ? `Waits ${event.washSaleProtection.waitPeriod} days before repurchasing` : 'No wait period'}

**Portfolio Management:**
- Only operates on taxable accounts
- Maintains target asset allocation when possible
- ${event.harvestingRules.maintainAllocation ? 'Maintains allocation via substitutes' : 'May temporarily alter allocation'}

This strategy can significantly reduce your annual tax bill while maintaining your investment strategy.`;
  }

  /**
   * Create template tax loss harvesting event
   */
  static createTemplate(overrides: Partial<TaxLossHarvestingEvent> = {}): TaxLossHarvestingEvent {
    return {
      id: `tax-loss-harvesting-${Date.now()}`,
      type: EventType.TAX_LOSS_HARVESTING,
      name: 'Tax Loss Harvesting',
      description: 'Automatically harvest tax losses to reduce tax liability',
      priority: 30 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'MONTHLY',
      
      thresholds: {
        minimumAccountValue: 50000, // $50k minimum taxable account
        minimumTaxSavings: 500, // $500 minimum tax savings to execute
        maxAnnualHarvesting: 100000 // $100k max harvesting per year
      },
      
      taxSettings: {
        marginalTaxRate: 0.25, // 25% marginal tax rate
        capitalGainsRate: 0.15, // 15% long-term capital gains
        stateRate: 0.05 // 5% state tax rate
      },
      
      harvestingRules: {
        timing: 'YEAR_END',
        maintainAllocation: true,
        allowedAssetClasses: ['stocks', 'bonds', 'international']
      },
      
      washSaleProtection: {
        enabled: true,
        useSubstitutes: true,
        waitPeriod: 31,
        substituteList: [
          { original: 'VTI', substitute: 'ITOT' },
          { original: 'VXUS', substitute: 'IXUS' }
        ]
      },
      
      ...overrides
    };
  }
}

/**
 * Factory function for creating tax loss harvesting events
 */
export function createTaxLossHarvesting(
  config: {
    name: string;
    marginalTaxRate: number;
    minimumAccountValue?: number;
    minimumTaxSavings?: number;
    timing?: 'YEAR_END' | 'QUARTERLY' | 'CONTINUOUS';
    useSubstitutes?: boolean;
  }
): TaxLossHarvestingEvent {
  return TaxLossHarvestingProcessor.createTemplate({
    name: config.name,
    description: `Tax loss harvesting with ${(config.marginalTaxRate * 100).toFixed(1)}% tax rate`,
    thresholds: {
      minimumAccountValue: config.minimumAccountValue || 50000,
      minimumTaxSavings: config.minimumTaxSavings || 500,
      maxAnnualHarvesting: 100000
    },
    taxSettings: {
      marginalTaxRate: config.marginalTaxRate,
      capitalGainsRate: Math.min(0.20, config.marginalTaxRate * 0.8), // Estimate LTCG rate
      stateRate: 0.05
    },
    harvestingRules: {
      timing: config.timing || 'YEAR_END',
      maintainAllocation: true,
      allowedAssetClasses: ['stocks', 'bonds', 'international']
    },
    washSaleProtection: {
      enabled: true,
      useSubstitutes: config.useSubstitutes ?? true,
      waitPeriod: 31,
      substituteList: [
        { original: 'VTI', substitute: 'ITOT' },
        { original: 'VXUS', substitute: 'IXUS' },
        { original: 'BND', substitute: 'AGG' }
      ]
    }
  });
}

/**
 * Pre-built tax loss harvesting templates
 */
export const TaxLossHarvestingTemplates = {
  conservative: (): TaxLossHarvestingEvent =>
    createTaxLossHarvesting({
      name: 'Conservative Tax Loss Harvesting',
      marginalTaxRate: 0.22, // 22% bracket
      minimumAccountValue: 100000, // Higher threshold
      minimumTaxSavings: 1000, // Higher minimum savings
      timing: 'YEAR_END',
      useSubstitutes: true
    }),

  moderate: (): TaxLossHarvestingEvent =>
    createTaxLossHarvesting({
      name: 'Moderate Tax Loss Harvesting',
      marginalTaxRate: 0.24, // 24% bracket
      minimumAccountValue: 50000,
      minimumTaxSavings: 500,
      timing: 'QUARTERLY',
      useSubstitutes: true
    }),

  aggressive: (): TaxLossHarvestingEvent =>
    createTaxLossHarvesting({
      name: 'Aggressive Tax Loss Harvesting',
      marginalTaxRate: 0.32, // Higher bracket
      minimumAccountValue: 25000, // Lower threshold
      minimumTaxSavings: 250, // Lower minimum
      timing: 'CONTINUOUS',
      useSubstitutes: true
    }),

  highNetWorth: (): TaxLossHarvestingEvent =>
    createTaxLossHarvesting({
      name: 'High Net Worth Tax Loss Harvesting',
      marginalTaxRate: 0.37, // Top bracket
      minimumAccountValue: 500000, // Much higher threshold
      minimumTaxSavings: 5000, // Higher minimum savings
      timing: 'QUARTERLY',
      useSubstitutes: true
    })
};