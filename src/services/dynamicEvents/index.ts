/**
 * Dynamic Events Service Module
 * 
 * Provides centralized access to all dynamic event functionality including
 * processors, registry, utilities, and templates.
 */

// Import everything first so it's available in local scope
import { DynamicEventRegistry, getDynamicEventRegistry, initializeDynamicEventRegistry, DynamicEventUtils } from './dynamicEventRegistry';

import { ConditionalContributionProcessor, createConditionalContribution, ConditionalContributionTemplates } from './conditionalContribution';
import { WaterfallAllocationProcessor, createWaterfallAllocation, WaterfallAllocationTemplates } from './waterfallAllocation';
import { PercentageContributionProcessor, createPercentageContribution, PercentageContributionTemplates } from './percentageContribution';
import { SmartDebtPaymentProcessor, createSmartDebtPayment, SmartDebtPaymentTemplates } from './smartDebtPayment';
import { GoalDrivenContributionProcessor, createGoalDrivenContribution, GoalDrivenContributionTemplates } from './goalDrivenContribution';
import { EmergencyFundMaintenanceProcessor, createEmergencyFundMaintenance, EmergencyFundMaintenanceTemplates } from './emergencyFundMaintenance';

import { AutomaticRebalancingProcessor, createAutomaticRebalancing, AutomaticRebalancingTemplates } from './automaticRebalancing';
import { IncomeResponsiveSavingsProcessor, createIncomeResponsiveSavings, IncomeResponsiveSavingsTemplates } from './incomeResponsiveSavings';
import { LifecycleAdjustmentProcessor, createLifecycleAdjustment, LifecycleAdjustmentTemplates } from './lifecycleAdjustment';
import { TaxLossHarvestingProcessor, createTaxLossHarvesting, TaxLossHarvestingTemplates } from './taxLossHarvesting';

// Re-export everything for external use
export { DynamicEventRegistry, getDynamicEventRegistry, initializeDynamicEventRegistry, DynamicEventUtils };

export { ConditionalContributionProcessor, createConditionalContribution, ConditionalContributionTemplates };
export { WaterfallAllocationProcessor, createWaterfallAllocation, WaterfallAllocationTemplates };
export { PercentageContributionProcessor, createPercentageContribution, PercentageContributionTemplates };
export { SmartDebtPaymentProcessor, createSmartDebtPayment, SmartDebtPaymentTemplates };
export { GoalDrivenContributionProcessor, createGoalDrivenContribution, GoalDrivenContributionTemplates };
export { EmergencyFundMaintenanceProcessor, createEmergencyFundMaintenance, EmergencyFundMaintenanceTemplates };

export { AutomaticRebalancingProcessor, createAutomaticRebalancing, AutomaticRebalancingTemplates };
export { IncomeResponsiveSavingsProcessor, createIncomeResponsiveSavings, IncomeResponsiveSavingsTemplates };
export { LifecycleAdjustmentProcessor, createLifecycleAdjustment, LifecycleAdjustmentTemplates };
export { TaxLossHarvestingProcessor, createTaxLossHarvesting, TaxLossHarvestingTemplates };

// Import types for local use and re-export
import type {
  AnyDynamicEvent,
  DynamicEventType,
  ConditionalContributionEvent,
  WaterfallAllocationEvent,
  PercentageContributionEvent,
  SmartDebtPaymentEvent,
  GoalDrivenContributionEvent,
  EmergencyFundMaintenanceEvent,
  AutomaticRebalancingEvent,
  IncomeResponsiveSavingsEvent,
  LifecycleAdjustmentEvent,
  TaxLossHarvestingEvent,
  SimulationContext,
  EventAction,
  DynamicEventConfig,
  ConditionSet,
  BalanceCondition,
  IncomeCondition,
  AgeCondition,
  DebtCondition,
  GoalProgressCondition,
  AccountBalanceCondition,
  DateRangeCondition,
  MarketCondition,
  FallbackAction
} from '../../types/events/dynamicEvents';

// Re-export types for convenience
export type {
  AnyDynamicEvent,
  DynamicEventType,
  ConditionalContributionEvent,
  WaterfallAllocationEvent,
  PercentageContributionEvent,
  SmartDebtPaymentEvent,
  GoalDrivenContributionEvent,
  EmergencyFundMaintenanceEvent,
  AutomaticRebalancingEvent,
  IncomeResponsiveSavingsEvent,
  LifecycleAdjustmentEvent,
  TaxLossHarvestingEvent,
  SimulationContext,
  EventAction,
  DynamicEventConfig,
  ConditionSet,
  BalanceCondition,
  IncomeCondition,
  AgeCondition,
  DebtCondition,
  GoalProgressCondition,
  AccountBalanceCondition,
  DateRangeCondition,
  MarketCondition,
  FallbackAction
} from '../../types/events/dynamicEvents';

// Re-export math utilities
export {
  calculateEmergencyFundTarget,
  calculateWaterfallAllocation,
  calculatePercentageContribution,
  calculateConditionalContribution,
  calculateSmartDebtPayment,
  calculateGoalDrivenContribution,
  checkBalanceCondition,
  checkIncomeCondition,
  validateAmount,
  formatCurrency,
  formatPercentage,
  calculateCompoundGrowth
} from '../../utils/dynamicEventMath';

// Re-export validation functions
export {
  validateDynamicEvent,
  isValidDynamicEvent,
  validateConditionSet
} from '../validationService';

/**
 * Quick access to commonly used functionality
 */
export const DynamicEvents = {
  // Registry
  getRegistry: function() { return getDynamicEventRegistry(); },
  
  // Core Processors (Phase 2) - lazy getters to avoid import order issues
  get ConditionalContribution() { return ConditionalContributionProcessor; },
  get WaterfallAllocation() { return WaterfallAllocationProcessor; },
  get PercentageContribution() { return PercentageContributionProcessor; },
  get SmartDebtPayment() { return SmartDebtPaymentProcessor; },
  get GoalDrivenContribution() { return GoalDrivenContributionProcessor; },
  get EmergencyFundMaintenance() { return EmergencyFundMaintenanceProcessor; },
  
  // Advanced Processors (Phase 3) - lazy getters to avoid import order issues
  get AutomaticRebalancing() { return AutomaticRebalancingProcessor; },
  get IncomeResponsiveSavings() { return IncomeResponsiveSavingsProcessor; },
  get LifecycleAdjustment() { return LifecycleAdjustmentProcessor; },
  get TaxLossHarvesting() { return TaxLossHarvestingProcessor; },
  
  // Templates - lazy getters to avoid import order issues
  Templates: {
    get ConditionalContribution() { return ConditionalContributionTemplates; },
    get WaterfallAllocation() { return WaterfallAllocationTemplates; },
    get PercentageContribution() { return PercentageContributionTemplates; },
    get SmartDebtPayment() { return SmartDebtPaymentTemplates; },
    get GoalDrivenContribution() { return GoalDrivenContributionTemplates; },
    get EmergencyFundMaintenance() { return EmergencyFundMaintenanceTemplates; },
    get AutomaticRebalancing() { return AutomaticRebalancingTemplates; },
    get IncomeResponsiveSavings() { return IncomeResponsiveSavingsTemplates; },
    get LifecycleAdjustment() { return LifecycleAdjustmentTemplates; },
    get TaxLossHarvesting() { return TaxLossHarvestingTemplates; }
  },
  
  // Utilities - lazy getter to avoid import order issues
  get Utils() { return DynamicEventUtils; }
};

/**
 * Factory functions for creating dynamic events
 * Using function approach to avoid import order issues
 */
export function getCreateDynamicEventAPI() {
  return {
    // Core events (Phase 2)
    conditionalContribution: createConditionalContribution,
    waterfallAllocation: createWaterfallAllocation,
    percentageContribution: createPercentageContribution,
    smartDebtPayment: createSmartDebtPayment,
    goalDrivenContribution: createGoalDrivenContribution,
    emergencyFundMaintenance: createEmergencyFundMaintenance,
    
    // Advanced events (Phase 3)
    automaticRebalancing: createAutomaticRebalancing,
    incomeResponsiveSavings: createIncomeResponsiveSavings,
    lifecycleAdjustment: createLifecycleAdjustment,
    taxLossHarvesting: createTaxLossHarvesting
  };
}

// For backward compatibility, but using lazy getter
export const createDynamicEvent = {
  get conditionalContribution() { return createConditionalContribution; },
  get waterfallAllocation() { return createWaterfallAllocation; },
  get percentageContribution() { return createPercentageContribution; },
  get smartDebtPayment() { return createSmartDebtPayment; },
  get goalDrivenContribution() { return createGoalDrivenContribution; },
  get emergencyFundMaintenance() { return createEmergencyFundMaintenance; },
  get automaticRebalancing() { return createAutomaticRebalancing; },
  get incomeResponsiveSavings() { return createIncomeResponsiveSavings; },
  get lifecycleAdjustment() { return createLifecycleAdjustment; },
  get taxLossHarvesting() { return createTaxLossHarvesting; }
};

/**
 * Check if the dynamic events module is properly initialized
 */
export function isDynamicEventsModuleReady(): boolean {
  try {
    const registry = getDynamicEventRegistry();
    return registry !== null;
  } catch {
    return false;
  }
}

/**
 * Get information about implemented dynamic event types
 */
export function getImplementedEventTypes(): DynamicEventType[] {
  return [
    // Core events (Phase 2)
    'CONDITIONAL_CONTRIBUTION', 
    'WATERFALL_ALLOCATION', 
    'PERCENTAGE_CONTRIBUTION', 
    'SMART_DEBT_PAYMENT',
    'GOAL_DRIVEN_CONTRIBUTION',
    'EMERGENCY_FUND_MAINTENANCE',
    
    // Advanced events (Phase 3)
    'AUTOMATIC_REBALANCING',
    'INCOME_RESPONSIVE_SAVINGS',
    'LIFECYCLE_ADJUSTMENT',
    'TAX_LOSS_HARVESTING'
  ];
}

/**
 * Get information about core vs advanced dynamic event types
 */
export function getCoreEventTypes(): DynamicEventType[] {
  return [
    'CONDITIONAL_CONTRIBUTION', 
    'WATERFALL_ALLOCATION', 
    'PERCENTAGE_CONTRIBUTION', 
    'SMART_DEBT_PAYMENT',
    'GOAL_DRIVEN_CONTRIBUTION',
    'EMERGENCY_FUND_MAINTENANCE'
  ];
}

export function getAdvancedEventTypes(): DynamicEventType[] {
  return [
    'AUTOMATIC_REBALANCING',
    'INCOME_RESPONSIVE_SAVINGS',
    'LIFECYCLE_ADJUSTMENT',
    'TAX_LOSS_HARVESTING'
  ];
}