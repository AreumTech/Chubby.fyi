/**
 * Events Module - Central hub for all financial event types
 * 
 * This module exports all event types and provides the main FinancialEvent
 * discriminated union that serves as the type-safe contract between the
 * frontend timeline and the simulation engine.
 * 
 * Architecture:
 * - Each event type is defined in its own module for maintainability
 * - Type guards are co-located with their event definitions
 * - The main FinancialEvent union provides compile-time type safety
 * - Clear separation between UI events and simulation events
 */

// =============================================================================
// RE-EXPORTS - All event types and their guards
// =============================================================================

// Base types
export * from './base';

// Shared PFOS-E compliant types
export * from './shared';

// Consolidated event types (PFOS-E compliant)
export * from './consolidated';

// Event categories
export * from './initial-state';
export * from './income';
export * from './expense';
export * from './contribution';
export * from './liability';
export * from './tax-strategy';
export * from './strategic';
export * from './equity-compensation';
export * from './planning';
export * from './insurance';
export * from './education';
export * from './business';
export * from './estate';
export * from './realEstate';
export * from './retirement';
export * from './dynamicEvents';
export * from './advanced-investment';
export * from './lifecycle-transitions';
export * from './strategy-events';

// TODO: Add these modules as they are created
// export * from './cash-management';

// =============================================================================
// FINANCIAL EVENT DISCRIMINATED UNION
// =============================================================================

import { InitialStateEvent } from './initial-state';
import { IncomeEvent, SocialSecurityIncomeEvent, PensionIncomeEvent, AnnuityPaymentEvent, RentalIncomeEvent, DividendIncomeEvent } from './income';
import { RecurringExpenseEvent, OneTimeEvent, HealthcareCostEvent } from './expense';
import { ScheduledContributionEvent } from './contribution';
import { LiabilityAddEvent, LiabilityPaymentEvent, DebtPaymentEvent, DebtConsolidationEvent, RefinanceEvent, HomeEquityLoanEvent } from './liability';
import { RothConversionEvent, MegaBackdoorRothEvent, QualifiedCharitableDistributionEvent, RequiredMinimumDistributionEvent, TaxLossHarvestingSaleEvent, TaxLossHarvestingCheckAndExecuteEvent, StrategicCapitalGainsRealizationEvent } from './tax-strategy';
import { StrategicTradeEvent, RebalancePortfolioEvent, StrategyAssetAllocationSetEvent, StrategyRebalancingRuleSetEvent } from './strategic';
import { RsuVestingEvent, RsuSaleEvent } from './equity-compensation';
import { GoalDefineEvent, ConcentrationRiskAlertEvent, FinancialMilestoneEvent } from './planning';
import { LifeInsurancePremiumEvent, LifeInsurancePayoutEvent, DisabilityInsurancePremiumEvent, DisabilityInsurancePayoutEvent, LongTermCareInsurancePremiumEvent, LongTermCarePayoutEvent } from './insurance';
import { FiveTwoNineContributionEvent, FiveTwoNineWithdrawalEvent, TuitionPaymentEvent } from './education';
import { BusinessIncomeEvent, QuarterlyEstimatedTaxPaymentEvent } from './business';
import { AnnualGiftEvent, LargeGiftEvent, InheritanceEvent } from './estate';
import { RealEstatePurchaseEvent, RealEstateSaleEvent } from './realEstate';
import { WithdrawalEvent, AccountTransferEvent } from './retirement';
import { ConditionalContributionEvent, WaterfallAllocationEvent, PercentageContributionEvent, SmartDebtPaymentEvent, GoalDrivenContributionEvent, EmergencyFundMaintenanceEvent } from './dynamicEvents';
import { LeveragedInvestmentEvent, BridgeStrategyEvent, MortgagePayoffEvent } from './advanced-investment';
import { RelocationEvent, RealEstateAppreciationEvent, PropertyMaintenanceEvent, HealthcareTransitionEvent, CareerChangeEvent } from './lifecycle-transitions';
import { StrategyPolicyEvent, StrategyExecutionEvent } from './strategy-events';

/**
 * FinancialEvent: Type-safe discriminated union of all financial events
 * 
 * This is the main contract between the frontend timeline and simulation engine.
 * Each event type has its own specific interface with required fields.
 * TypeScript can narrow types based on the 'type' discriminator field.
 * 
 * Benefits:
 * - Type safety: Compiler prevents accessing wrong fields on wrong event types
 * - Better IntelliSense: IDE provides correct autocomplete based on event type  
 * - Easier refactoring: Changes to specific event types don't affect others
 * - Runtime safety: No more (event as any) type assertions needed
 * 
 * Usage:
 * ```typescript
 * function processEvent(event: FinancialEvent) {
 *   if (isIncomeEvent(event)) {
 *     // TypeScript knows event is IncomeEvent here
 *     console.log(event.source, event.amount);
 *   }
 * }
 * ```
 */
export type FinancialEvent = 
  | InitialStateEvent
  | IncomeEvent
  | SocialSecurityIncomeEvent
  | PensionIncomeEvent
  | AnnuityPaymentEvent
  | RentalIncomeEvent
  | DividendIncomeEvent
  | RecurringExpenseEvent
  | OneTimeEvent
  | ScheduledContributionEvent
  | LiabilityAddEvent
  | LiabilityPaymentEvent
  | DebtPaymentEvent
  | DebtConsolidationEvent
  | RefinanceEvent
  | HomeEquityLoanEvent
  | RothConversionEvent
  | MegaBackdoorRothEvent
  | QualifiedCharitableDistributionEvent
  | RequiredMinimumDistributionEvent
  | TaxLossHarvestingSaleEvent
  | TaxLossHarvestingCheckAndExecuteEvent
  | StrategicCapitalGainsRealizationEvent
  | HealthcareCostEvent
  | StrategicTradeEvent
  | RebalancePortfolioEvent
  | StrategyAssetAllocationSetEvent
  | StrategyRebalancingRuleSetEvent
  | RsuVestingEvent
  | RsuSaleEvent
  | GoalDefineEvent
  | ConcentrationRiskAlertEvent
  | FinancialMilestoneEvent
  | LifeInsurancePremiumEvent
  | LifeInsurancePayoutEvent
  | DisabilityInsurancePremiumEvent
  | DisabilityInsurancePayoutEvent
  | LongTermCareInsurancePremiumEvent
  | LongTermCarePayoutEvent
  | FiveTwoNineContributionEvent
  | FiveTwoNineWithdrawalEvent
  | TuitionPaymentEvent
  | BusinessIncomeEvent
  | QuarterlyEstimatedTaxPaymentEvent
  | AnnualGiftEvent
  | LargeGiftEvent
  | InheritanceEvent
  | RealEstatePurchaseEvent
  | RealEstateSaleEvent
  | WithdrawalEvent
  | AccountTransferEvent
  | ConditionalContributionEvent
  | WaterfallAllocationEvent
  | PercentageContributionEvent
  | SmartDebtPaymentEvent
  | GoalDrivenContributionEvent
  | EmergencyFundMaintenanceEvent
  | LeveragedInvestmentEvent
  | BridgeStrategyEvent
  | MortgagePayoffEvent
  | RelocationEvent
  | RealEstateAppreciationEvent
  | PropertyMaintenanceEvent
  | HealthcareTransitionEvent
  | CareerChangeEvent
  | StrategyPolicyEvent
  | StrategyExecutionEvent;

// TODO: Add these event types when modules are created
// | StrategyAssetAllocationSetEvent
// | StrategyRebalancingRuleSetEvent  
// | TaxLossHarvestingSaleEvent
// | TaxLossHarvestingCheckAndExecuteEvent
// | StrategicCapitalGainsRealizationEvent
// | AdjustCashReserveSellAssetsEvent
// | AdjustCashReserveBuyAssetsEvent

// =============================================================================
// SIMULATION EVENT - Atomic events for WASM processing
// =============================================================================

import { EventType, EventPriority } from './base';
import { AccountType, AssetClass } from '../common';

/**
 * SimulationEvent: Atomic event processed by WASM simulation engine
 * 
 * This is distinct from FinancialEvent which represents frontend timeline events.
 * SimulationEvents are:
 * - Atomic: Each event represents a single account state change at a specific month
 * - Simple: Minimal required fields for WASM processing
 * - Preprocessed: Generated from FinancialEvents via preprocessEventsForWASM()
 * 
 * Key differences from FinancialEvent:
 * - No frequency/date ranges (each event is for a specific monthOffset)
 * - No growth rates (already applied during preprocessing)
 * - Simplified structure optimized for WASM performance
 * - Required fields are strictly enforced
 * 
 * Boundary: UI → Frontend Events (FinancialEvent) → Preprocessing → Simulation Events → WASM
 */
export interface SimulationEvent {
  /** Unique identifier for this atomic simulation event */
  id: string;

  /** Type of event - same enum as FinancialEvent but usage is atomic */
  type: EventType;

  /** Display name for debugging (optional) */
  name?: string;

  /** Description for Go struct compatibility */
  description?: string;

  /** Exact month offset when this atomic event occurs */
  monthOffset: number;

  /** End month offset for recurring events */
  endMonthOffset?: number;

  /** Frequency - always 'monthly' after normalization */
  frequency?: 'monthly' | 'annually' | 'one-time';

  /** Event priority for processing order */
  priority?: EventPriority;
  
  /** Amount for this specific month (already adjusted for growth) */
  amount?: number;
  
  /** Target account type for contributions/transfers */
  accountType?: AccountType;
  
  /** Asset class for investments */
  assetClass?: AssetClass;
  
  /** Source account for transfers */
  sourceAccountType?: AccountType;
  
  /** Target account for transfers */
  targetAccountType?: AccountType;
  
  /** Income source identifier */
  source?: string;
  
  /** Whether amount is net of taxes */
  isNet?: boolean;
  
  // Advanced event fields (for complex events)
  realizedLoss?: number;
  realizedGain?: number;
  qcdAmount?: number;
  amountToAdjust?: number;
  washSaleMonitoringRequired?: boolean;

  // Strategy fields - TODO: Move to strategy module
  allocation?: any; // MasterAssetAllocationStrategy
  rebalancingMethod?: string; // RebalancingMethod
  rebalancingFrequencyMonths?: number;
  rebalancingThresholdPercentage?: number;

  // =============================================================================
  // PFOS-E COMPLIANT FIELDS - Event system consolidation
  // =============================================================================

  /** Tax profile determines how income is taxed (tax engine owns branching) */
  taxProfile?: string;

  /** Sensitivity attribution key for PFOS-E charts */
  driverKey?: string;

  /** How withholding is calculated */
  withholdingModel?: string;

  /** Expense classification for sabbatical wedge analysis */
  expenseNature?: string;

  /** Blocked output reasoning codes */
  constraintCodes?: string[];

  /** Asset liquidity for capital sourcing wedge */
  liquidityProfile?: string;

  /** Income source type for consolidated handler */
  sourceType?: string;

  /** Exposure type for concentration wedge */
  exposureType?: string;

  /** Delta notional for exposure changes */
  deltaNotional?: number;

  /** Tax treatment for contributions */
  taxTreatment?: string;

  /** Insurance type for consolidated handler */
  insuranceType?: string;

  /** Additional event-specific metadata */
  metadata?: Record<string, any>;
}

// =============================================================================
// COMPOSITE TYPE GUARDS
// =============================================================================

/**
 * Check if an event is recurring (has start/end dates and frequency)
 */
export function isRecurringEvent(event: FinancialEvent): boolean {
  return event.type === EventType.INCOME || 
         event.type === EventType.RECURRING_EXPENSE || 
         event.type === EventType.SCHEDULED_CONTRIBUTION ||
         event.type === EventType.SOCIAL_SECURITY_INCOME ||
         event.type === EventType.PENSION_INCOME ||
         event.type === EventType.RENTAL_INCOME ||
         event.type === EventType.BUSINESS_INCOME ||
         event.type === EventType.QUARTERLY_ESTIMATED_TAX_PAYMENT ||
         event.type === EventType.ANNUAL_GIFT;
}

/**
 * Check if an event has a monetary amount
 */
export function hasMonetaryAmount(event: FinancialEvent): boolean {
  return 'amount' in event && typeof event.amount === 'number';
}

/**
 * Check if an event has growth rate
 */
export function hasGrowthRate(event: FinancialEvent): boolean {
  return 'annualGrowthRate' in event && typeof event.annualGrowthRate === 'number';
}

/**
 * Check if an event has date range
 */
export function hasDateRange(event: FinancialEvent): boolean {
  return 'startDateOffset' in event && typeof event.startDateOffset === 'number';
}