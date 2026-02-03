/**
 * Types Module - Central type system hub
 * 
 * This is the main entry point for the refactored type system. It provides
 * clear exports organized by domain and establishes the architectural boundaries
 * between different parts of the system.
 * 
 * ARCHITECTURAL BOUNDARIES:
 * 
 * 1. COMMON TYPES (types/common)
 *    - Primitive enums and basic types
 *    - Shared across all modules
 *    - Rarely change, stable foundation
 * 
 * 2. EVENTS (types/events)
 *    - Financial events for the timeline
 *    - User-defined, can be recurring
 *    - Frontend → Preprocessing → Simulation
 * 
 * 3. STRATEGIES (types/strategies)
 *    - Financial strategies and their configurations
 *    - Self-contained with discriminated unions
 *    - Type-safe strategy management
 * 
 * 4. STATE (types/state)
 *    - Simulation state that evolves over time
 *    - Account balances, liabilities, tax carryovers
 *    - Internal to simulation engine
 * 
 * 5. API PAYLOAD (types/api)
 *    - UI-optimized data structures
 *    - Pre-computed aggregations for frontend
 *    - Clear UI ↔ Simulation boundary
 * 
 * IMPORT PATTERNS:
 * 
 * For specific domains:
 *   import { IncomeEvent, isIncomeEvent } from '../types/events';
 *   import { AssetAllocationStrategy } from '../types/strategies';
 *   import { SimulationState } from '../types/state';
 *   import { SimulationPayload } from '../types/api';
 * 
 * For common types:
 *   import { AssetClass, AccountType } from '../types/common';
 * 
 * For the main union types:
 *   import { FinancialEvent, PlanStrategy } from '../types';
 */

// =============================================================================
// COMMON TYPES - Foundation layer (with compatibility adapters)
// =============================================================================

// Export common types with AccountType override
export {
  AssetClass,
  FilingStatus,
  AccountCategory,
  StrategyCategory,
  InsightType,
  CashFlowEventFrequency,
  RebalancingFrequency,
  RebalancingMethod,
  DebtType,
  AssetType,
  LiabilityType,
  LotAcquisitionType,
  LiabilityTypeDetailed,
  GoalType,
  SimulationMode,
  type OptionType,
  type TaxBracket,
  type IRMAABracket,
  type MedicareYearData,
  type MedicareConfig,
  type TaxConfig,
  type StochasticModelConfig,
  type AdvancedSimulationSettings
} from './common';

// Export canonical AccountType system (single source of truth)
export {
  type StandardAccountType,
  type LegacyAccountType,
  type AccountType,
  normalizeAccountType,
  isStandardAccountType,
  isLegacyAccountType,
  isValidAccountType,
  validateAccountType,
  ACCOUNT_TYPE_INFO,
  ACCOUNT_TYPE_MAPPING
} from './accountTypes';

// =============================================================================
// DOMAIN MODULES - Organized by responsibility
// =============================================================================

// Events - Financial timeline events
export * from './events';

// Strategies - Financial strategies and configurations  
export * from './strategies';

// State - Simulation engine state
export * from './state';

// API - UI-optimized payloads
export * from './api';

// Impact Calculation - Real-time impact analysis
// Impact calculation types moved to backend services

// =============================================================================
// MAIN DISCRIMINATED UNIONS - Primary contracts
// =============================================================================

// Re-export the main union types for convenience
export type { FinancialEvent, SimulationEvent } from './events';
export type { PlanStrategy } from './strategies';
export type { SimulationState, MonthlySnapshot, YearlySnapshot } from './state';
export type { SimulationPayload } from './api';

// =============================================================================
// WASM BOUNDARY ADAPTERS - Type safety across language boundary
// =============================================================================

export {
  adaptAccountTypeForWasm,
  adaptEventForWasm,
  validateWasmMonthlyData,
  isWasmCompatibleEvent,
  assertWasmBoundary
} from './adapters/wasmBoundary';

// Generated types (WASM contract) - re-exported for transparency
export type {
  FinancialEvent as WasmFinancialEvent,
  MonthlyData as WasmMonthlyData,
  SimulationInput as WasmSimulationInput,
  SimulationResult as WasmSimulationResult,
  AccountHoldingsMonthEnd as WasmAccountHoldings
} from './generated';

// =============================================================================
// ARCHITECTURAL DOCUMENTATION
// =============================================================================

/**
 * TYPE SYSTEM ARCHITECTURE GUIDE
 * 
 * This type system follows domain-driven design principles with clear boundaries:
 * 
 * LAYER 1: COMMON TYPES
 * - Basic enums (AssetClass, AccountType, etc.)
 * - Primitive types shared across domains
 * - Stable, foundational types
 * 
 * LAYER 2: DOMAIN TYPES
 * - Events: User timeline events → Simulation events
 * - Strategies: Self-contained strategy configurations
 * - State: Internal simulation state that evolves
 * - API: UI-optimized data structures
 * 
 * LAYER 3: UNION TYPES
 * - FinancialEvent: All possible user events
 * - PlanStrategy: All possible strategies
 * - SimulationPayload: Main UI data contract
 * 
 * DATA FLOW:
 * 
 * UI Input → FinancialEvent[] → preprocessing → SimulationEvent[] → WASM
 *                ↓
 * PlanStrategy[] → strategy execution → state changes
 *                ↓
 * SimulationState → aggregation → SimulationPayload → UI Display
 * 
 * BENEFITS:
 * 
 * 1. Type Safety: Discriminated unions prevent accessing wrong fields
 * 2. Maintainability: Changes to one domain don't affect others
 * 3. Discoverability: Clear file structure maps to concepts
 * 4. Performance: UI types optimized for frontend consumption
 * 5. Scalability: New event types/strategies can be added easily
 * 
 * BOUNDARIES:
 * 
 * 1. UI ↔ API: SimulationPayload is the contract
 * 2. Events ↔ Simulation: SimulationEvent is atomic, preprocessed
 * 3. Strategies ↔ Engine: PlanStrategy contains full configuration
 * 4. State ↔ Config: Clear separation of what changes vs. what's fixed
 */

// =============================================================================
// UTILITY TYPE EXPORTS
// =============================================================================

// Re-export commonly used utility types
export type { OptionType, TaxBracket, IRMAABracket, StochasticModelConfig } from './common';

// =============================================================================
// LEGACY COMPATIBILITY - Temporary during migration
// =============================================================================

// Legacy interfaces that are still being imported (TODO: Remove after migration)
import {
  FilingStatus,
  AssetClass,
  RebalancingMethod
} from './common';
import { AccountType } from './accountTypes';

// NOTE: AccountType is now exported via compatibility adapter above

import { Account, Holding } from './state/account';
import { Liability } from './state/liability';
import { FinancialEvent, EventType, EventPriority } from './events';
import { SimulationParams } from './state/simulation';
import { InitialAccountHoldings } from './state/account';
import { TaxBracket, IRMAABracket, StochasticModelConfig, AdvancedSimulationSettings } from './common';

// Legacy AppConfig interface - TODO: Migrate to new configuration structure
export interface DateSettings {
  simulationStartYear: number;
  simulationStartMonth: number;
  /** @deprecated Use age-based simulation duration (simulationEndAge - currentAge) instead */
  simulationHorizonYears: number;
  simulationEndYear: number;
}

export interface AppConfig {
  // Basic simulation parameters
  simulationEndAge?: number;
  currentAge: number;
  currentMonth: number;
  simulationStartYear: number;
  monteCarloRuns: number;
  simulationMode: 'monteCarlo';
  
  // Centralized date settings
  dateSettings?: DateSettings;
  
  // Advanced simulation settings
  advancedSimulationSettings?: {
    monteCarloSettings?: {
      numSimulations?: number;
      confidenceLevel?: number;
    };
    strategySettings?: {
      retirementWithdrawal?: {
        withdrawalSequence?: string;
        enableAutomaticRMDs?: boolean;
        enableRothConversions?: boolean;
        rothConversionMaxTaxRate?: number;
      };
      socialSecurity?: {
        plannedClaimingAge?: number;
      };
      assetLocation?: {
        enabled?: boolean;
      };
    };
  };
  
  // Simulation configuration
  simulation?: SimulationParams;

  // Asset configuration
  assetConfig: {
    [key: string]: AssetConfiguration;
  };

  // Account and asset types
  accountTypes: string[];
  assetClasses: AssetClass[];

  // Economic parameters
  inflationRate: number;
  reinvestDividends: boolean;

  // RMD configuration
  rmdStartAge: number;
  rmdFactors: { [age: number]: number };

  // Tax configuration
  filingStatus: FilingStatus;
  numberOfDependents?: number;
  domicileState?: string;
  applyIRMAA?: boolean;

  // Tax system configuration
  taxSystem?: any;

  // Strategies (legacy format)
  currentMasterAssetAllocationStrategy?: any;
  currentAssetLocationPreferences?: any;
  currentRebalancingParameters?: any;
  currentRetirementWithdrawalStrategy?: any;
  currentRothConversionStrategy?: any;
  currentIrmaaManagementStrategy?: any;
  currentTaxLossHarvestingSettings?: any;
  currentStrategicCapitalGainsRealizationSettings?: any;
  currentDebtManagementStrategy?: any;
  currentCashManagementStrategy?: any;
  currentLtcPlanningStrategy?: any;
  currentCharitableGivingStrategy?: any;
  currentEquityCompensationStrategy?: any;

  // Calculator-specific settings
  contributionLimitSettings?: {
    userAge: number;
    hasFamily?: boolean;
  };
  stateTaxSettings?: {
    stateCode: string;
    filingStatus: string;
    numDependents?: number;
  };
  socialSecuritySettings?: {
    enabled: boolean;
    birthYear: number;
    primaryInsuranceAmount: number;
    plannedClaimingAge: number;
    hasSpouse?: boolean;
    spouseBirthYear?: number;
    spousePIA?: number;
    spouseClaimingAge?: number;
  };
  estatePlanningSettings?: {
    enabled: boolean;
    estimatedEstateTaxable?: number;
    lifetimeGifts?: number;
    portableExemption?: number;
    annualGiftingBudget?: number;
  };
  propertyCostSettings?: {
    hasProperty?: boolean;
    stateCode?: string;
    isCoastal?: boolean;
    isWildfireZone?: boolean;
    isFloodZone?: boolean;
  };
  goalPrioritizationSettings?: {
    enabled: boolean;
    availableMonthlyFunds?: number;
    priorityOrder?: string[];
  };
  taxAwareRebalancingSettings?: {
    enabled: boolean;
    rebalanceThreshold?: number;
    preferTaxDeferredAccounts?: boolean;
    enableTaxLossHarvesting?: boolean;
    minimumLossToHarvest?: number;
  };

  // Cash Management Strategy (structured format for WASM)
  cashStrategy?: {
    targetReserveMonths: number;   // Months of expenses to keep in cash
    targetReserveAmount: number;   // Absolute dollar amount minimum
    autoInvestExcess: boolean;     // Automatically invest excess cash
    autoSellForShortfall: boolean; // Automatically sell for cash needs
  };

  // Stochastic simulation configuration
  stochasticConfig: StochasticModelConfig;

  // GARCH volatility model parameters (optional - defaults in DEFAULT_STOCHASTIC_CONFIG)
  garchSpyOmega?: number;
  garchSpyAlpha?: number;
  garchSpyBeta?: number;
  garchBondOmega?: number;
  garchBondAlpha?: number;
  garchBondBeta?: number;
  garchIntlStockOmega?: number;
  garchIntlStockAlpha?: number;
  garchIntlStockBeta?: number;
  garchOtherOmega?: number;
  garchOtherAlpha?: number;
  garchOtherBeta?: number;
  garchIndividualStockOmega?: number;
  garchIndividualStockAlpha?: number;
  garchIndividualStockBeta?: number;

  // Optional simulation properties
  simulationParams?: SimulationParams;
  initialState?: any; // InitialStateEvent - but with 'any' to avoid circular deps
  eventLedger?: FinancialEvent[];
  applyFederalTaxes?: boolean;
  applyStateTaxes?: boolean;
  applySocialSecurityTax?: boolean;
  applyMedicareTax?: boolean;

  // Other global app configurations
  retirementYear?: number;
  retirementIncomeGoal?: number;
  spouseCurrentAge?: number;

  currentConcentrationRiskSettings: any;

  // Debug and development settings
  debugMode?: boolean;

  // Withdrawal strategy settings
  withdrawalStrategy?: string;
}

export interface AssetConfiguration {
  meanReturn: number;
  stdDev: number;
  type: string;
  dividendYield: number;
}


// Legacy simulation output types - TODO: Replace with new API payload types
export interface YearlyData {
  calendarYear: number;
  ageAtYearEnd: number;
  netWorthEndOfYear: number;
  totalIncomeAnnual?: number;
  totalExpensesAnnual?: number;
  totalContributionsToInvestmentsAnnual?: number;
  totalDebtPaymentsPrincipalAnnual?: number;
  totalDebtPaymentsInterestAnnual?: number;
  totalRothConversionsAnnual?: number;
  totalOneTimeEventsNetAnnual?: number;
  totalDivestmentProceedsAnnual?: number;
  totalRebalancingNetAnnual?: number;
  totalQualifiedDividendsAnnual?: number;
  totalOrdinaryDividendsAnnual?: number;
  taxPaidAnnual?: number;
  rmdAmountAnnual?: number;
  irmaaPremiumPaidAnnual?: number;
  capitalLossCarryoverEndOfYear?: number;
  p25NetWorthEndOfYear?: number;
  p75NetWorthEndOfYear?: number;
  assetsEndOfYear?: any; // AccountHoldingsMonthEnd
  liabilitiesEndOfYear?: Liability[];
  goalAchievementsAnnual?: Array<{ goalId: string; achieved: boolean; surplusOrShortfall?: number; targetAmount?: number; netWorthAtTargetMonth?: number }>;
  lastMonthOffsetInYear?: number;
  activeFilingStatus?: FilingStatus;
  activeNumDependents?: number;
  federalIncomeTaxAnnual?: number;
  stateIncomeTaxAnnual?: number;
  capitalGainsTaxShortTermAnnual?: number;
  capitalGainsTaxLongTermAnnual?: number;
  alternativeMinimumTaxAnnual?: number;
  effectiveTaxRateAnnual?: number;
  marginalTaxRateAnnual?: number;
  adjustedGrossIncomeAnnual?: number;
  taxableIncomeAnnual?: number;
  
  // FICA tax breakdown
  socialSecurityTaxAnnual?: number;
  medicareTaxAnnual?: number;
  additionalMedicareTaxAnnual?: number;
  totalFicaTaxAnnual?: number;
}

export interface SimulationResult {
  year: number;
  month: number;
  totalNetWorth: number;
  investmentValue: number;
  cashValue: number;
}

export interface SimulationOutput {
  deterministic?: YearlyData[];
  monteCarlo?: YearlyData[][];
}

export interface MonthlyData {
  monthOffset: number;
  calendarYear: number;
  calendarMonth: number;
  ageYears: number;
  ageMonths: number;
  netWorth: number;
  cashBalance: number;
  taxableAccountValue: number;
  taxDeferredAccountValue: number;
  rothAccountValue: number;
  totalLiabilitiesValue: number;
  grossIncome: number;
  preTaxContributions: number;
  postTaxContributions: number;
  taxesPaid: number;
  expenses: number;
  debtPaymentsPrincipal: number;
  debtPaymentsInterest: number;
  rothConversions: number;
  dividendsReceivedQualified: number;
  dividendsReceivedOrdinary: number;
  interestReceivedTaxable: number;
  interestReceivedTaxExempt: number;
  realizedGainsShortTerm: number;
  realizedGainsLongTerm: number;
  withdrawalsFromTaxable: number;
  withdrawalsFromTaxDeferred: number;
  withdrawalsFromRoth: number;
  rmdAmountTaken: number;
  qcdAmount: number;
  taxPaidAnnual?: number;
  rmdAmountAnnual?: number;
  irmaaMedicarePremiumAdjustment?: number;
  capitalLossCarryoverEndYear?: number;
  activeFilingStatus?: FilingStatus;
  activeNumDependents?: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  contributionsToInvestmentsThisMonth: number;
  debtPaymentsPrincipalThisMonth: number;
  debtPaymentsInterestThisMonth: number;
  rothConversionAmountThisMonth: number;
  oneTimeEventsImpactThisMonth: number;
  divestmentProceedsThisMonth: number;
  rebalancingTradesNetEffectThisMonth: number;
  taxWithheldThisMonth: number;
  dividendsReceivedThisMonth?: { qualified: number; ordinary: number };
  ordinaryIncomeForTaxYTD: number;
  stcgForTaxYTD: number;
  ltcgForTaxYTD: number;
  qualifiedDividendIncomeYTD: number;
  ordinaryDividendIncomeYTD: number;
  itemizedDeductibleInterestPaidYTD: number;
  preTaxContributionsYTD: number;
  taxWithholdingYTD: number;
  itemizedDeductionsTotal?: number;
  assets?: any;
  liabilities?: Liability[];
  detailedAssetHoldings?: {
    taxable?: { [assetClass in AssetClass]?: number };
    taxDeferred?: { [assetClass in AssetClass]?: number };
    roth?: { [assetClass in AssetClass]?: number };
  };
  goalAchievements?: Array<{ goalId: string; goalName: string; targetMonthOffset: number; targetAmount?: number; priority: number; achieved: boolean; netWorthAtTargetMonth: number; surplusOrShortfall?: number }>;
  inflationRateMonthlyApplied?: number;
  marketReturnsApplied?: Record<AssetClass, number>;
  realEstateValue?: number;
  hsaAccountValue?: number;
  dividendIncomeThisMonth?: number;
  interestIncomeThisMonth?: number;
  rsuVestingThisMonth?: number;
  stockReturnYTD?: number;
  bondReturnYTD?: number;
  inflationRateYTD?: number;
}

// =============================================================================
// DEPRECATION NOTICES
// =============================================================================

/**
 * MIGRATION FROM OLD types.ts:
 * 
 * OLD → NEW IMPORTS:
 * 
 * // Event types
 * import { IncomeEvent } from './types'
 * → import { IncomeEvent } from './types/events'
 * 
 * // Strategy types  
 * import { MasterAssetAllocationStrategy } from './types'
 * → import { AssetAllocationStrategy } from './types/strategies'
 * 
 * // State types
 * import { Account, Liability } from './types'
 * → import { Account, Liability } from './types/state'
 * 
 * // UI payload types
 * import { SimulationPayload } from './types'
 * → import { SimulationPayload } from './types/api'
 * 
 * // Common enums (unchanged)
 * import { AssetClass, AccountType } from './types'
 * → import { AssetClass, AccountType } from './types/common'
 * 
 * REMOVED TYPES:
 * - DebtPaymentEvent (consolidated into LiabilityPaymentEvent)
 * - Redundant debt/liability types (use consistent naming)
 * - Kitchen sink interfaces (replaced with discriminated unions)
 * 
 * NEW PATTERNS:
 * - Co-located type guards with event definitions
 * - Self-contained strategy configurations
 * - Clear state vs. configuration separation
 * - UI-optimized payload structures
 */