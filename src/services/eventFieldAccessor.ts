/**
 * Event Field Accessor
 *
 * Type-safe extraction of amount and frequency from all FinancialEvent types.
 * Uses existing type guards to safely access specialized event fields,
 * eliminating the need for `as any` casts in event processing.
 *
 * Design:
 * - Uses discriminated union type guards for compile-time safety
 * - Configuration-driven for maintainability
 * - Returns null for events without cash flow (planning events, tracking events)
 */

import type { FinancialEvent } from '@/types';
import type { AmountWithFrequency } from './frequencyNormalization';

// Import existing type guards from event modules
import {
  isRelocationEvent,
  isPropertyMaintenanceEvent,
  isHealthcareTransitionEvent,
  isCareerChangeEvent,
  isRealEstateAppreciationEvent,
} from '@/types/events/lifecycle-transitions';

import {
  isLeveragedInvestmentEvent,
  isBridgeStrategyEvent,
  isMortgagePayoffEvent,
} from '@/types/events/advanced-investment';

import { isIncomeEvent } from '@/types/events/income';
import { isRecurringExpenseEvent, isOneTimeEvent, isHealthcareCostEvent } from '@/types/events/expense';
import { isScheduledContributionEvent } from '@/types/events/contribution';
import { isRothConversionEvent, isRequiredMinimumDistributionEvent, isQualifiedCharitableDistributionEvent, isTaxLossHarvestingSaleEvent, isTaxLossHarvestingCheckAndExecuteEvent, isStrategicCapitalGainsRealizationEvent, isMegaBackdoorRothEvent } from '@/types/events/tax-strategy';
import { isWithdrawalEvent, isAccountTransferEvent } from '@/types/events/retirement';
import { isRealEstatePurchaseEvent, isRealEstateSaleEvent } from '@/types/events/realEstate';
import { isLiabilityAddEvent, isLiabilityPaymentEvent, isDebtPaymentEvent, isDebtConsolidationEvent, isRefinanceEvent, isHomeEquityLoanEvent } from '@/types/events/liability';
import { isLifeInsurancePremiumEvent, isLifeInsurancePayoutEvent, isDisabilityInsurancePremiumEvent, isDisabilityInsurancePayoutEvent, isLongTermCareInsurancePremiumEvent, isLongTermCarePayoutEvent } from '@/types/events/insurance';
import { isFiveTwoNineContributionEvent, isFiveTwoNineWithdrawalEvent, isTuitionPaymentEvent } from '@/types/events/education';
import { isBusinessIncomeEvent, isQuarterlyEstimatedTaxPaymentEvent } from '@/types/events/business';
import { isAnnualGiftEvent, isLargeGiftEvent, isInheritanceEvent } from '@/types/events/estate';
import { isRsuVestingEvent, isRsuSaleEvent } from '@/types/events/equity-compensation';
import { isGoalDefineEvent, isFinancialMilestoneEvent, isConcentrationRiskAlertEvent } from '@/types/events/planning';
import { isStrategicTradeEvent, isRebalancePortfolioEvent, isStrategyAssetAllocationSetEvent, isStrategyRebalancingRuleSetEvent } from '@/types/events/strategic';
import { EventType } from '@/types/events/base';
// Note: dynamicEvents don't export type guards, so we use EventType checks below
import { isSocialSecurityIncomeEvent, isPensionIncomeEvent, isAnnuityPaymentEvent, isRentalIncomeEvent, isDividendIncomeEvent } from '@/types/events/income';
import { isInitialStateEvent } from '@/types/events/initial-state';

// =============================================================================
// TYPES
// =============================================================================

export type Frequency = AmountWithFrequency['frequency'];

export interface ExtractedAmount {
  amount: number;
  frequency: Frequency;
  source: 'specialized' | 'standard' | 'derived' | 'none';
}

// =============================================================================
// SPECIALIZED EVENT EXTRACTORS
// =============================================================================

/**
 * Extract amount and frequency from a FinancialEvent using type guards.
 * Returns null for events without cash flow (planning/tracking events).
 */
export function getEventAmount(event: FinancialEvent): ExtractedAmount | null {
  // =========================================================================
  // LIFECYCLE TRANSITION EVENTS - use existing type guards
  // =========================================================================

  if (isRelocationEvent(event)) {
    return { amount: event.movingCosts, frequency: 'one-time', source: 'specialized' };
  }

  if (isPropertyMaintenanceEvent(event)) {
    return { amount: event.annualMaintenanceCost, frequency: 'annually', source: 'specialized' };
  }

  if (isHealthcareTransitionEvent(event)) {
    return { amount: event.bridgeCosts.monthlyPremium, frequency: 'monthly', source: 'specialized' };
  }

  if (isCareerChangeEvent(event)) {
    // Career change: signed difference (raise = positive, pay cut = negative)
    const change = event.incomeChange.newIncome - event.incomeChange.currentIncome;
    return { amount: change, frequency: 'annually', source: 'derived' };
  }

  if (isRealEstateAppreciationEvent(event)) {
    // Tracking event with no direct cash flow
    return { amount: 0, frequency: 'annually', source: 'none' };
  }

  // =========================================================================
  // ADVANCED INVESTMENT EVENTS
  // =========================================================================

  if (isBridgeStrategyEvent(event)) {
    // Bridge strategies have multiple possible amount fields
    if (event.rothLadderAmount !== undefined) {
      return { amount: event.rothLadderAmount, frequency: 'annually', source: 'specialized' };
    }
    if (event.seppAmount !== undefined) {
      return { amount: event.seppAmount, frequency: 'annually', source: 'specialized' };
    }
    if (event.taxableSpendingAmount !== undefined) {
      return { amount: event.taxableSpendingAmount, frequency: 'annually', source: 'specialized' };
    }
    if (event.rothContributionAmount !== undefined) {
      return { amount: event.rothContributionAmount, frequency: 'annually', source: 'specialized' };
    }
    // No amount specified - planning event
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  if (isMortgagePayoffEvent(event)) {
    return { amount: event.payoffAmount, frequency: 'one-time', source: 'specialized' };
  }

  if (isLeveragedInvestmentEvent(event)) {
    return {
      amount: event.amount,
      frequency: event.frequency === 'once' ? 'one-time' : (event.frequency || 'monthly'),
      source: 'specialized'
    };
  }

  // =========================================================================
  // REAL ESTATE EVENTS
  // =========================================================================

  if (isRealEstatePurchaseEvent(event)) {
    // Use down payment as the cash flow amount
    if (event.financing?.downPaymentAmount) {
      return { amount: event.financing.downPaymentAmount, frequency: 'one-time', source: 'specialized' };
    }
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  if (isRealEstateSaleEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // INCOME EVENTS
  // =========================================================================

  if (isIncomeEvent(event)) {
    return { amount: event.amount, frequency: (event.frequency as Frequency) || 'annually', source: 'standard' };
  }

  if (isSocialSecurityIncomeEvent(event) || isPensionIncomeEvent(event) ||
      isAnnuityPaymentEvent(event) || isRentalIncomeEvent(event) ||
      isBusinessIncomeEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'monthly', source: 'standard' };
  }

  if (isDividendIncomeEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'quarterly', source: 'standard' };
  }

  // =========================================================================
  // EXPENSE EVENTS
  // =========================================================================

  if (isRecurringExpenseEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'monthly', source: 'standard' };
  }

  if (isOneTimeEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  if (isHealthcareCostEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'monthly', source: 'standard' };
  }

  // =========================================================================
  // CONTRIBUTION EVENTS
  // =========================================================================

  if (isScheduledContributionEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'monthly', source: 'standard' };
  }

  if (isFiveTwoNineContributionEvent(event)) {
    return { amount: event.amount || 0, frequency: (event.frequency as Frequency) || 'annually', source: 'standard' };
  }

  // =========================================================================
  // TAX STRATEGY EVENTS
  // =========================================================================

  if (isRothConversionEvent(event) || isMegaBackdoorRothEvent(event)) {
    return { amount: event.amount, frequency: 'annually', source: 'standard' };
  }

  if (isRequiredMinimumDistributionEvent(event)) {
    // RMD amounts are calculated at runtime, use calculatedAmount if available
    return { amount: event.calculatedAmount || 0, frequency: 'annually', source: 'specialized' };
  }

  if (isQualifiedCharitableDistributionEvent(event)) {
    return { amount: event.amount, frequency: 'annually', source: 'standard' };
  }

  if (isTaxLossHarvestingSaleEvent(event)) {
    return { amount: event.lossAmount || 0, frequency: 'annually', source: 'specialized' };
  }

  if (isTaxLossHarvestingCheckAndExecuteEvent(event)) {
    // This is a trigger event, no fixed amount
    return { amount: 0, frequency: 'annually', source: 'none' };
  }

  if (isStrategicCapitalGainsRealizationEvent(event)) {
    return { amount: event.amount, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // WITHDRAWAL & TRANSFER EVENTS
  // =========================================================================

  if (isWithdrawalEvent(event)) {
    return { amount: event.amount, frequency: 'one-time', source: 'standard' };
  }

  if (isAccountTransferEvent(event)) {
    return { amount: event.amount, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // LIABILITY EVENTS
  // =========================================================================

  if (isLiabilityAddEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  if (isLiabilityPaymentEvent(event) || isDebtPaymentEvent(event)) {
    return { amount: event.amount || 0, frequency: 'monthly', source: 'standard' };
  }

  if (isDebtConsolidationEvent(event) || isRefinanceEvent(event)) {
    const amount = 'amount' in event && typeof event.amount === 'number' ? event.amount : 0;
    return { amount, frequency: 'one-time', source: 'standard' };
  }

  if (isHomeEquityLoanEvent(event)) {
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  // =========================================================================
  // INSURANCE EVENTS
  // =========================================================================

  if (isLifeInsurancePremiumEvent(event) || isDisabilityInsurancePremiumEvent(event) ||
      isLongTermCareInsurancePremiumEvent(event)) {
    return { amount: event.amount || 0, frequency: 'monthly', source: 'standard' };
  }

  if (isLifeInsurancePayoutEvent(event) || isDisabilityInsurancePayoutEvent(event) ||
      isLongTermCarePayoutEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // EDUCATION EVENTS
  // =========================================================================

  if (isFiveTwoNineWithdrawalEvent(event) || isTuitionPaymentEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // BUSINESS & TAX EVENTS
  // =========================================================================

  if (isQuarterlyEstimatedTaxPaymentEvent(event)) {
    return { amount: event.amount || 0, frequency: 'quarterly', source: 'standard' };
  }

  // =========================================================================
  // ESTATE EVENTS
  // =========================================================================

  if (isAnnualGiftEvent(event)) {
    return { amount: event.amount || 0, frequency: 'annually', source: 'standard' };
  }

  if (isLargeGiftEvent(event) || isInheritanceEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // EQUITY COMPENSATION EVENTS
  // =========================================================================

  if (isRsuVestingEvent(event) || isRsuSaleEvent(event)) {
    return { amount: event.amount || 0, frequency: 'one-time', source: 'standard' };
  }

  // =========================================================================
  // STRATEGIC EVENTS
  // =========================================================================

  if (isStrategicTradeEvent(event)) {
    const amount = 'amount' in event && typeof event.amount === 'number' ? event.amount : 0;
    return { amount, frequency: 'one-time', source: 'standard' };
  }

  if (isRebalancePortfolioEvent(event)) {
    return { amount: 0, frequency: 'quarterly', source: 'none' };
  }

  if (isStrategyAssetAllocationSetEvent(event) || isStrategyRebalancingRuleSetEvent(event)) {
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  // =========================================================================
  // DYNAMIC EVENTS (no type guards, use EventType check)
  // =========================================================================

  const dynamicEventTypes = [
    EventType.CONDITIONAL_CONTRIBUTION,
    EventType.WATERFALL_ALLOCATION,
    EventType.PERCENTAGE_CONTRIBUTION,
    EventType.GOAL_DRIVEN_CONTRIBUTION,
    EventType.EMERGENCY_FUND_MAINTENANCE,
    EventType.INCOME_RESPONSIVE_SAVINGS,
  ];

  if (dynamicEventTypes.includes(event.type as EventType)) {
    // Dynamic events have variable amounts computed at runtime
    const amount = 'amount' in event && typeof event.amount === 'number' ? event.amount : 0;
    return { amount, frequency: 'monthly', source: 'standard' };
  }

  if (event.type === EventType.SMART_DEBT_PAYMENT) {
    const amount = 'amount' in event && typeof event.amount === 'number' ? event.amount : 0;
    return { amount, frequency: 'monthly', source: 'standard' };
  }

  // =========================================================================
  // PLANNING EVENTS - No cash flow
  // =========================================================================

  if (isGoalDefineEvent(event) || isFinancialMilestoneEvent(event) ||
      isConcentrationRiskAlertEvent(event) || isInitialStateEvent(event)) {
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  // =========================================================================
  // STRATEGY EVENTS - Meta-events for timeline visualization, no cash flow
  // =========================================================================

  if (event.type === EventType.STRATEGY_POLICY || event.type === EventType.STRATEGY_EXECUTION) {
    return { amount: 0, frequency: 'one-time', source: 'none' };
  }

  // =========================================================================
  // FALLBACK - Standard amount field
  // =========================================================================

  // Try standard 'amount' field
  if ('amount' in event && typeof event.amount === 'number') {
    const frequency = ('frequency' in event && event.frequency)
      ? event.frequency as Frequency
      : 'one-time';
    return { amount: event.amount, frequency, source: 'standard' };
  }

  // Try 'annualAmount' field
  if ('annualAmount' in event && typeof (event as any).annualAmount === 'number') {
    return { amount: (event as any).annualAmount, frequency: 'annually', source: 'standard' };
  }

  // Unknown event type - return null (let caller handle)
  return null;
}

/**
 * Check if an event has a specific field safely using type guards.
 * This is a runtime check that returns true if the field exists and is defined.
 */
export function hasEventField<K extends string>(
  event: unknown,
  field: K
): event is { [key in K]: unknown } {
  return (
    typeof event === 'object' &&
    event !== null &&
    field in event &&
    (event as Record<string, unknown>)[field] !== undefined
  );
}

/**
 * Safely get a nested field value from an event.
 * Path should be dot-separated (e.g., 'bridgeCosts.monthlyPremium')
 */
export function getNestedField<T = unknown>(
  event: unknown,
  path: string
): T | undefined {
  const parts = path.split('.');
  let current: unknown = event;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T;
}

/**
 * Check if an event is a specialized event type that requires custom amount extraction.
 * These events don't use the standard 'amount' field.
 */
export function isSpecializedAmountEvent(event: FinancialEvent): boolean {
  return (
    isRelocationEvent(event) ||
    isPropertyMaintenanceEvent(event) ||
    isHealthcareTransitionEvent(event) ||
    isCareerChangeEvent(event) ||
    isBridgeStrategyEvent(event) ||
    isMortgagePayoffEvent(event) ||
    isRealEstatePurchaseEvent(event)
  );
}

/**
 * Check if an event has no direct cash flow (planning/tracking events).
 */
export function isNoCashFlowEvent(event: FinancialEvent): boolean {
  const extracted = getEventAmount(event);
  return extracted?.source === 'none';
}
