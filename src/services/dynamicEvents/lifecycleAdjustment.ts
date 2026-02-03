/**
 * Lifecycle Adjustment Dynamic Event Implementation
 * 
 * Implements age-based asset allocation changes: "Reduce stock allocation by 1% per year after age 50"
 * This provides automatic lifecycle investing with glide path adjustments based on age and risk tolerance.
 */

import { LifecycleAdjustmentEvent, SimulationContext, EventAction } from '../../types/events/dynamicEvents';
import { StandardAccountType } from '../../types/accountTypes';
import { EventPriority, EventType } from '../../types';
import { validateAmount, formatCurrency, formatPercentage } from '../../utils/dynamicEventMath';
import { validateDynamicEvent, ValidationResult } from '../validationService';

/**
 * Lifecycle stage analysis interface
 */
interface LifecycleAnalysis {
  currentAge: number;
  currentStage: LifecycleStage | null;
  targetAllocation: AssetAllocation;
  currentAllocation: AssetAllocation;
  allocationChanges: AllocationChange[];
  rebalancingNeeded: boolean;
  stageName: string;
  stageDescription: string;
}

/**
 * Asset allocation interface
 */
interface AssetAllocation {
  stocks: number;
  bonds: number;
  international?: number;
  cash?: number;
}

/**
 * Allocation change interface
 */
interface AllocationChange {
  assetClass: string;
  fromAllocation: number;
  toAllocation: number;
  changeAmount: number;
  reason: string;
}

/**
 * Lifecycle stage interface (internal representation)
 */
interface LifecycleStage {
  ageRange: { min: number; max: number };
  targetAllocation: AssetAllocation;
  stageName: string;
  description: string;
}

/**
 * Lifecycle Adjustment Event Processor
 */
export class LifecycleAdjustmentProcessor {
  static async evaluate(
    event: LifecycleAdjustmentEvent,
    context: SimulationContext
  ): Promise<EventAction[]> {
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw new Error(`Invalid lifecycle adjustment event: ${validation.errorMessage}`);
    }

    // Check if it's time to evaluate (based on frequency)
    if (!this.shouldEvaluate(event, context)) {
      return [];
    }

    // Analyze current lifecycle stage and allocation needs
    const lifecycleAnalysis = this.analyzeLifecycleStage(event, context);
    
    if (!lifecycleAnalysis.rebalancingNeeded) {
      return []; // No rebalancing needed
    }

    // Generate rebalancing actions based on allocation changes
    const actions = this.generateRebalancingActions(event, lifecycleAnalysis, context);

    return actions;
  }

  /**
   * Check if lifecycle adjustment should be evaluated this period
   */
  private static shouldEvaluate(
    event: LifecycleAdjustmentEvent,
    context: SimulationContext
  ): boolean {
    const currentMonth = context.currentMonth;
    
    switch (event.adjustmentRules.frequency) {
      case 'ANNUAL':
        return currentMonth % 12 === 0; // Every 12 months
      
      case 'QUARTERLY':
        return currentMonth % 3 === 0; // Every 3 months
      
      case 'ON_BIRTHDAY':
        // Simplified: assume birthday is in January (month 0)
        return currentMonth % 12 === 0;
      
      default:
        return true;
    }
  }

  /**
   * Analyze current lifecycle stage and determine allocation needs
   */
  private static analyzeLifecycleStage(
    event: LifecycleAdjustmentEvent,
    context: SimulationContext
  ): LifecycleAnalysis {
    const currentAge = context.currentAge;
    
    // Find appropriate lifecycle stage
    const currentStage = this.findLifecycleStage(event, currentAge);
    
    if (!currentStage) {
      return {
        currentAge,
        currentStage: null,
        targetAllocation: { stocks: 0.6, bonds: 0.4 }, // Default allocation
        currentAllocation: { stocks: 0.6, bonds: 0.4 },
        allocationChanges: [],
        rebalancingNeeded: false,
        stageName: 'Unknown',
        stageDescription: 'No matching lifecycle stage found'
      };
    }

    // Calculate target allocation (potentially with glide path)
    const targetAllocation = this.calculateTargetAllocation(event, currentStage, currentAge);
    
    // Estimate current allocation
    const currentAllocation = this.estimateCurrentAllocation(event, context);
    
    // Calculate allocation changes needed
    const allocationChanges = this.calculateAllocationChanges(
      currentAllocation,
      targetAllocation,
      event.implementation.driftThreshold || 0.05
    );
    
    const rebalancingNeeded = allocationChanges.length > 0;

    return {
      currentAge,
      currentStage,
      targetAllocation,
      currentAllocation,
      allocationChanges,
      rebalancingNeeded,
      stageName: currentStage.stageName,
      stageDescription: currentStage.description
    };
  }

  /**
   * Find the appropriate lifecycle stage for current age
   */
  private static findLifecycleStage(
    event: LifecycleAdjustmentEvent,
    currentAge: number
  ): LifecycleStage | null {
    return event.lifecycleStages.find(stage => 
      currentAge >= stage.ageRange.min && currentAge <= stage.ageRange.max
    ) || null;
  }

  /**
   * Calculate target allocation with potential glide path adjustments
   */
  private static calculateTargetAllocation(
    event: LifecycleAdjustmentEvent,
    stage: LifecycleStage,
    currentAge: number
  ): AssetAllocation {
    let targetAllocation = { ...stage.targetAllocation };
    
    // Apply glide path formula if specified
    if (event.adjustmentRules.glidePathFormula === 'LINEAR') {
      targetAllocation = this.applyLinearGlidePath(stage, currentAge);
    }
    
    return targetAllocation;
  }

  /**
   * Apply linear glide path adjustment within lifecycle stage
   */
  private static applyLinearGlidePath(
    stage: LifecycleStage,
    currentAge: number
  ): AssetAllocation {
    // Simple linear glide path: reduce stocks by 1% per year
    const baseStockAllocation = stage.targetAllocation.stocks;
    const ageAdjustment = Math.max(0, (currentAge - 30) * 0.01); // Start adjusting at age 30
    
    const adjustedStocks = Math.max(0.3, baseStockAllocation - ageAdjustment); // Minimum 30% stocks
    const adjustedBonds = Math.min(0.7, stage.targetAllocation.bonds + ageAdjustment); // Maximum 70% bonds
    
    return {
      stocks: adjustedStocks,
      bonds: adjustedBonds,
      international: stage.targetAllocation.international,
      cash: stage.targetAllocation.cash
    };
  }

  /**
   * Estimate current allocation across lifecycle accounts
   */
  private static estimateCurrentAllocation(
    event: LifecycleAdjustmentEvent,
    context: SimulationContext
  ): AssetAllocation {
    let totalValue = 0;
    let stocksValue = 0;
    let bondsValue = 0;
    let internationalValue = 0;
    let cashValue = 0;
    
    // Sum up values across lifecycle-managed accounts
    for (const accountType of event.implementation.accountScope) {
      const balance = context.accountBalances[accountType] || 0;
      totalValue += balance;
      
      // Estimate allocation based on account type (simplified)
      switch (accountType) {
        case 'tax_deferred':
          stocksValue += balance * 0.7; // Assume 70% stocks
          bondsValue += balance * 0.25; // 25% bonds
          internationalValue += balance * 0.05; // 5% international
          break;
        case 'roth':
          stocksValue += balance * 0.8; // More aggressive in Roth
          internationalValue += balance * 0.15;
          cashValue += balance * 0.05;
          break;
        case 'taxable':
          stocksValue += balance * 0.6; // More conservative
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
      return { stocks: 0, bonds: 0, international: 0, cash: 0 };
    }
    
    return {
      stocks: stocksValue / totalValue,
      bonds: bondsValue / totalValue,
      international: internationalValue / totalValue,
      cash: cashValue / totalValue
    };
  }

  /**
   * Calculate allocation changes needed
   */
  private static calculateAllocationChanges(
    current: AssetAllocation,
    target: AssetAllocation,
    driftThreshold: number
  ): AllocationChange[] {
    const changes: AllocationChange[] = [];
    
    // Check stocks allocation
    const stocksDrift = Math.abs(current.stocks - target.stocks);
    if (stocksDrift > driftThreshold) {
      changes.push({
        assetClass: 'stocks',
        fromAllocation: current.stocks,
        toAllocation: target.stocks,
        changeAmount: target.stocks - current.stocks,
        reason: `Stocks allocation drift of ${formatPercentage(stocksDrift)} exceeds ${formatPercentage(driftThreshold)} threshold`
      });
    }
    
    // Check bonds allocation
    const bondsDrift = Math.abs(current.bonds - target.bonds);
    if (bondsDrift > driftThreshold) {
      changes.push({
        assetClass: 'bonds',
        fromAllocation: current.bonds,
        toAllocation: target.bonds,
        changeAmount: target.bonds - current.bonds,
        reason: `Bonds allocation drift of ${formatPercentage(bondsDrift)} exceeds ${formatPercentage(driftThreshold)} threshold`
      });
    }
    
    // Check international allocation if defined
    if (target.international !== undefined && current.international !== undefined) {
      const intlDrift = Math.abs(current.international - target.international);
      if (intlDrift > driftThreshold) {
        changes.push({
          assetClass: 'international',
          fromAllocation: current.international,
          toAllocation: target.international,
          changeAmount: target.international - current.international,
          reason: `International allocation drift of ${formatPercentage(intlDrift)} exceeds threshold`
        });
      }
    }
    
    return changes;
  }

  /**
   * Generate rebalancing actions based on allocation changes
   */
  private static generateRebalancingActions(
    event: LifecycleAdjustmentEvent,
    analysis: LifecycleAnalysis,
    context: SimulationContext
  ): EventAction[] {
    const actions: EventAction[] = [];
    
    // Calculate total portfolio value across managed accounts
    const totalPortfolioValue = event.implementation.accountScope
      .reduce((sum, accountType) => sum + (context.accountBalances[accountType] || 0), 0);
    
    if (totalPortfolioValue === 0) {
      return actions;
    }
    
    // Generate rebalancing actions based on implementation method
    switch (event.implementation.rebalancingMethod) {
      case 'NEW_CONTRIBUTIONS':
        // Only adjust allocation for new contributions
        actions.push(this.createNewContributionAction(event, analysis, context));
        break;
      
      case 'FULL_REBALANCE':
        // Full portfolio rebalancing
        actions.push(...this.createFullRebalanceActions(event, analysis, totalPortfolioValue));
        break;
      
      case 'HYBRID':
        // Combination approach
        actions.push(...this.createHybridRebalanceActions(event, analysis, context, totalPortfolioValue));
        break;
    }
    
    return actions.filter(action => action.amount > 0);
  }

  /**
   * Create action for new contribution allocation adjustment
   */
  private static createNewContributionAction(
    event: LifecycleAdjustmentEvent,
    analysis: LifecycleAnalysis,
    context: SimulationContext
  ): EventAction {
    const estimatedMonthlyContribution = context.monthlyIncome * 0.15; // Assume 15% savings rate
    
    return {
      type: 'CONTRIBUTION',
      amount: estimatedMonthlyContribution,
      targetAccount: event.implementation.accountScope[0] || 'tax_deferred',
      description: `Lifecycle-adjusted contribution to ${analysis.stageName} allocation (age ${analysis.currentAge})`,
      priority: event.priority,
      metadata: {
        lifecycleAdjustment: true,
        currentStage: analysis.stageName,
        targetAllocation: analysis.targetAllocation,
        adjustmentMethod: 'NEW_CONTRIBUTIONS',
        ageBasedAdjustment: true
      }
    };
  }

  /**
   * Create actions for full portfolio rebalancing
   */
  private static createFullRebalanceActions(
    event: LifecycleAdjustmentEvent,
    analysis: LifecycleAnalysis,
    totalValue: number
  ): EventAction[] {
    const actions: EventAction[] = [];
    
    for (const change of analysis.allocationChanges) {
      const rebalanceAmount = Math.abs(change.changeAmount) * totalValue;
      
      if (rebalanceAmount > 1000) { // Minimum rebalance amount
        actions.push({
          type: 'REBALANCE',
          amount: rebalanceAmount,
          sourceAccount: event.implementation.accountScope[0] || 'tax_deferred',
          targetAccount: event.implementation.accountScope[0] || 'tax_deferred',
          description: `Lifecycle rebalancing: ${change.reason}`,
          priority: event.priority,
          metadata: {
            lifecycleAdjustment: true,
            currentStage: analysis.stageName,
            assetClass: change.assetClass,
            allocationChange: change.changeAmount,
            adjustmentMethod: 'FULL_REBALANCE'
          }
        });
      }
    }
    
    return actions;
  }

  /**
   * Create actions for hybrid rebalancing approach
   */
  private static createHybridRebalanceActions(
    event: LifecycleAdjustmentEvent,
    analysis: LifecycleAnalysis,
    context: SimulationContext,
    totalValue: number
  ): EventAction[] {
    const actions: EventAction[] = [];
    
    // Use new contributions for smaller adjustments
    const newContributionAction = this.createNewContributionAction(event, analysis, context);
    actions.push(newContributionAction);
    
    // Use full rebalancing for larger drifts
    const largeChanges = analysis.allocationChanges.filter(change => 
      Math.abs(change.changeAmount) > 0.10 // 10% drift threshold for full rebalance
    );
    
    if (largeChanges.length > 0) {
      const rebalanceActions = this.createFullRebalanceActions(event, analysis, totalValue);
      actions.push(...rebalanceActions);
    }
    
    return actions;
  }

  /**
   * Validate lifecycle adjustment event configuration
   */
  static validateEvent(event: LifecycleAdjustmentEvent): ValidationResult {
    const errors: string[] = [];

    // Validate lifecycle stages
    if (event.lifecycleStages.length === 0) {
      errors.push('At least one lifecycle stage must be defined');
    }

    // Check for age range overlaps and validate allocations
    for (let i = 0; i < event.lifecycleStages.length; i++) {
      const stage = event.lifecycleStages[i];
      
      // Validate age range
      if (stage.ageRange.min >= stage.ageRange.max) {
        errors.push(`Lifecycle stage "${stage.stageName}": minimum age must be less than maximum age`);
      }
      
      // Validate allocation sums to approximately 1.0
      const allocation = stage.targetAllocation;
      const totalAllocation = allocation.stocks + allocation.bonds + 
                              (allocation.international || 0) + (allocation.cash || 0);
      
      if (Math.abs(totalAllocation - 1.0) > 0.05) {
        errors.push(`Lifecycle stage "${stage.stageName}": target allocation must sum to approximately 100%`);
      }
      
      // Check for age range overlaps with other stages
      for (let j = i + 1; j < event.lifecycleStages.length; j++) {
        const otherStage = event.lifecycleStages[j];
        if (!(stage.ageRange.max < otherStage.ageRange.min || 
              otherStage.ageRange.max < stage.ageRange.min)) {
          errors.push(`Age ranges overlap between "${stage.stageName}" and "${otherStage.stageName}"`);
        }
      }
    }

    // Validate implementation settings
    if (event.implementation.accountScope.length === 0) {
      errors.push('At least one account must be included in lifecycle management');
    }

    if (event.implementation.driftThreshold && 
        (event.implementation.driftThreshold <= 0 || event.implementation.driftThreshold > 0.5)) {
      errors.push('Drift threshold must be between 0 and 0.5 (50%)');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Validate user input for creating lifecycle adjustment event
   */
  static validateUserInput(input: any): ValidationResult {
    const errors: string[] = [];

    if (!input.name || typeof input.name !== 'string') {
      errors.push('Event name is required');
    }

    if (!input.lifecycleStages || !Array.isArray(input.lifecycleStages)) {
      errors.push('Lifecycle stages array is required');
    }

    if (!input.adjustmentRules || typeof input.adjustmentRules !== 'object') {
      errors.push('Adjustment rules configuration is required');
    }

    if (!input.implementation || typeof input.implementation !== 'object') {
      errors.push('Implementation settings are required');
    }

    return {
      isValid: errors.length === 0,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Explain lifecycle adjustment behavior for user
   */
  static explainBehavior(event: LifecycleAdjustmentEvent): string {
    const stageDescriptions = event.lifecycleStages
      .map(stage => {
        const allocation = stage.targetAllocation;
        return `**${stage.stageName}** (Ages ${stage.ageRange.min}-${stage.ageRange.max}): ` +
               `${formatPercentage(allocation.stocks)} stocks, ${formatPercentage(allocation.bonds)} bonds`;
      })
      .join('\n');

    const frequency = event.adjustmentRules.frequency.toLowerCase();
    const method = event.implementation.rebalancingMethod.replace('_', ' ').toLowerCase();

    return `This event automatically adjusts your asset allocation based on your age and lifecycle stage:

**Lifecycle Stages:**
${stageDescriptions}

**Adjustment Settings:**
- Evaluation frequency: ${frequency}
- Rebalancing method: ${method}
- ${event.adjustmentRules.glidePathFormula ? `Glide path: ${event.adjustmentRules.glidePathFormula.toLowerCase()}` : 'No glide path formula'}
- ${event.adjustmentRules.smoothTransitions ? 'Smooth transitions between stages' : 'Immediate transitions'}

**Managed Accounts:** ${event.implementation.accountScope.join(', ')}

This implements classic lifecycle investing principles, automatically reducing risk as you approach retirement.`;
  }

  /**
   * Create template lifecycle adjustment event
   */
  static createTemplate(overrides: Partial<LifecycleAdjustmentEvent> = {}): LifecycleAdjustmentEvent {
    return {
      id: `lifecycle-adjustment-${Date.now()}`,
      type: EventType.LIFECYCLE_ADJUSTMENT,
      name: 'Lifecycle Asset Allocation',
      description: 'Automatically adjust asset allocation based on age',
      priority: 40 as EventPriority,
      monthOffset: 0,
      isDynamic: true,
      evaluationFrequency: 'ANNUALLY',
      
      lifecycleStages: [
        {
          ageRange: { min: 20, max: 35 },
          targetAllocation: { stocks: 0.85, bonds: 0.10, international: 0.05 },
          stageName: 'Young Professional',
          description: 'Aggressive growth phase with high risk tolerance'
        },
        {
          ageRange: { min: 36, max: 50 },
          targetAllocation: { stocks: 0.70, bonds: 0.20, international: 0.10 },
          stageName: 'Mid-Career',
          description: 'Balanced growth with some stability'
        },
        {
          ageRange: { min: 51, max: 65 },
          targetAllocation: { stocks: 0.55, bonds: 0.35, international: 0.05, cash: 0.05 },
          stageName: 'Pre-Retirement',
          description: 'Risk reduction as retirement approaches'
        },
        {
          ageRange: { min: 66, max: 100 },
          targetAllocation: { stocks: 0.40, bonds: 0.50, cash: 0.10 },
          stageName: 'Retirement',
          description: 'Capital preservation with income focus'
        }
      ],
      
      adjustmentRules: {
        frequency: 'ANNUAL',
        glidePathFormula: 'LINEAR',
        smoothTransitions: true
      },
      
      implementation: {
        accountScope: ['tax_deferred', 'roth', 'taxable'],
        rebalancingMethod: 'HYBRID',
        driftThreshold: 0.05
      },
      
      ...overrides
    };
  }
}

/**
 * Factory function for creating lifecycle adjustment events
 */
export function createLifecycleAdjustment(
  config: {
    name: string;
    lifecycleStages: Array<{
      ageRange: { min: number; max: number };
      targetAllocation: { stocks: number; bonds: number; international?: number; cash?: number };
      stageName: string;
      description: string;
    }>;
    frequency?: 'ANNUAL' | 'QUARTERLY' | 'ON_BIRTHDAY';
    accountScope?: StandardAccountType[];
    rebalancingMethod?: 'NEW_CONTRIBUTIONS' | 'FULL_REBALANCE' | 'HYBRID';
  }
): LifecycleAdjustmentEvent {
  return LifecycleAdjustmentProcessor.createTemplate({
    name: config.name,
    description: `Lifecycle allocation across ${config.lifecycleStages.length} life stages`,
    lifecycleStages: config.lifecycleStages,
    adjustmentRules: {
      frequency: config.frequency || 'ANNUAL',
      glidePathFormula: 'LINEAR',
      smoothTransitions: true
    },
    implementation: {
      accountScope: config.accountScope || ['tax_deferred', 'roth'],
      rebalancingMethod: config.rebalancingMethod || 'HYBRID',
      driftThreshold: 0.05
    }
  });
}

/**
 * Pre-built lifecycle adjustment templates
 */
export const LifecycleAdjustmentTemplates = {
  traditional: (): LifecycleAdjustmentEvent =>
    createLifecycleAdjustment({
      name: 'Traditional Lifecycle Allocation',
      lifecycleStages: [
        {
          ageRange: { min: 20, max: 40 },
          targetAllocation: { stocks: 0.80, bonds: 0.20 },
          stageName: 'Young Saver',
          description: 'High growth potential with long time horizon'
        },
        {
          ageRange: { min: 41, max: 55 },
          targetAllocation: { stocks: 0.65, bonds: 0.35 },
          stageName: 'Peak Earner',
          description: 'Balanced approach as retirement approaches'
        },
        {
          ageRange: { min: 56, max: 70 },
          targetAllocation: { stocks: 0.45, bonds: 0.55 },
          stageName: 'Near Retirement',
          description: 'Conservative approach for capital preservation'
        },
        {
          ageRange: { min: 71, max: 100 },
          targetAllocation: { stocks: 0.30, bonds: 0.60, cash: 0.10 },
          stageName: 'Retirement',
          description: 'Income-focused with capital preservation'
        }
      ]
    }),

  aggressive: (): LifecycleAdjustmentEvent =>
    createLifecycleAdjustment({
      name: 'Aggressive Lifecycle Allocation',
      lifecycleStages: [
        {
          ageRange: { min: 20, max: 45 },
          targetAllocation: { stocks: 0.90, bonds: 0.05, international: 0.05 },
          stageName: 'Maximum Growth',
          description: 'Aggressive growth for maximum long-term returns'
        },
        {
          ageRange: { min: 46, max: 60 },
          targetAllocation: { stocks: 0.75, bonds: 0.15, international: 0.10 },
          stageName: 'Growth Focused',
          description: 'Continued growth with minor risk reduction'
        },
        {
          ageRange: { min: 61, max: 75 },
          targetAllocation: { stocks: 0.60, bonds: 0.30, international: 0.05, cash: 0.05 },
          stageName: 'Balanced Transition',
          description: 'Gradual shift toward stability'
        },
        {
          ageRange: { min: 76, max: 100 },
          targetAllocation: { stocks: 0.45, bonds: 0.45, cash: 0.10 },
          stageName: 'Conservative Growth',
          description: 'Maintain some growth in retirement'
        }
      ],
      rebalancingMethod: 'FULL_REBALANCE'
    }),

  conservative: (): LifecycleAdjustmentEvent =>
    createLifecycleAdjustment({
      name: 'Conservative Lifecycle Allocation',
      lifecycleStages: [
        {
          ageRange: { min: 20, max: 35 },
          targetAllocation: { stocks: 0.65, bonds: 0.30, cash: 0.05 },
          stageName: 'Cautious Growth',
          description: 'Moderate growth with stability focus'
        },
        {
          ageRange: { min: 36, max: 50 },
          targetAllocation: { stocks: 0.50, bonds: 0.45, cash: 0.05 },
          stageName: 'Balanced Approach',
          description: 'Equal focus on growth and stability'
        },
        {
          ageRange: { min: 51, max: 65 },
          targetAllocation: { stocks: 0.35, bonds: 0.55, cash: 0.10 },
          stageName: 'Stability Focus',
          description: 'Capital preservation becomes priority'
        },
        {
          ageRange: { min: 66, max: 100 },
          targetAllocation: { stocks: 0.25, bonds: 0.60, cash: 0.15 },
          stageName: 'Capital Preservation',
          description: 'Maximum stability and income generation'
        }
      ],
      rebalancingMethod: 'NEW_CONTRIBUTIONS'
    })
};