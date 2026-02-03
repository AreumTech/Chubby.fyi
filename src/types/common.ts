/**
 * Common Types - Shared primitive enums and basic types
 * 
 * This module contains foundational types used across the application.
 * These are stable, rarely-changing definitions that other modules depend on.
 */

// =============================================================================
// CORE ENUMS - Fundamental building blocks
// =============================================================================

export enum AssetClass {
  CASH = "cash",
  US_STOCKS_TOTAL_MARKET = "us_stocks_total_market",
  US_BONDS_TOTAL_MARKET = "us_bonds_total_market",
  INTERNATIONAL_STOCKS = "international_stocks", 
  REAL_ESTATE_PRIMARY_HOME = "real_estate_primary_home",
  LEVERAGED_SPY = "leveraged_spy",
  OTHER_ASSETS = "other_assets",
  INDIVIDUAL_STOCK = "individual_stock",
}

export enum FilingStatus {
  SINGLE = 'single',
  MARRIED_FILING_JOINTLY = 'marriedFilingJointly',
  MARRIED_FILING_SEPARATELY = 'marriedFilingSeparately',
  HEAD_OF_HOUSEHOLD = 'headOfHousehold',
  QUALIFYING_WIDOW = 'qualifyingWidow'
}

// =============================================================================
// CATEGORY TYPES - High-level classifications
// =============================================================================

export const AccountCategory = {
  INVESTMENT: 'investment' as const,
  CASH: 'cash' as const,
  REAL_ESTATE: 'real_estate' as const,
  DEBT: 'debt' as const
} as const;

export type AccountCategory = typeof AccountCategory[keyof typeof AccountCategory];
// NOTE: AccountType moved to compatibility adapter to consolidate 4 conflicting definitions

export const StrategyCategory = {
  INVESTMENT: 'investment' as const,
  TAX: 'tax' as const,
  DECUMULATION: 'decumulation' as const,
  RISK_MANAGEMENT: 'risk_management' as const,
  HEALTHCARE: 'healthcare' as const,
  REAL_ESTATE: 'real_estate' as const
} as const;

export type StrategyCategory = typeof StrategyCategory[keyof typeof StrategyCategory];
export const InsightType = {
  STRENGTH: 'strength' as const,
  RISK: 'risk' as const,
  OPPORTUNITY: 'opportunity' as const
} as const;

export type InsightType = typeof InsightType[keyof typeof InsightType];

// =============================================================================
// FREQUENCY AND TIME TYPES
// =============================================================================

export const CashFlowEventFrequency = {
  ONCE: 'once' as const,
  ANNUALLY: 'annually' as const,
  MONTHLY: 'monthly' as const
} as const;

export type CashFlowEventFrequency = typeof CashFlowEventFrequency[keyof typeof CashFlowEventFrequency]; // Legacy type for backwards compatibility
export const RebalancingFrequency = {
  ANNUAL: 'annual' as const,
  SEMI_ANNUAL: 'semiAnnual' as const,
  QUARTERLY: 'quarterly' as const,
  NONE: 'none' as const
} as const;

export type RebalancingFrequency = typeof RebalancingFrequency[keyof typeof RebalancingFrequency];
export const RebalancingMethod = {
  PERIODIC: 'periodic' as const,
  THRESHOLD: 'threshold' as const
} as const;

export type RebalancingMethod = typeof RebalancingMethod[keyof typeof RebalancingMethod];

// Legacy debt type for compatibility
export const DebtType = {
  MORTGAGE: 'mortgage' as const,
  STUDENT_LOAN: 'studentLoan' as const,
  CREDIT_CARD: 'creditCard' as const,
  AUTO_LOAN: 'autoLoan' as const,
  OTHER: 'other' as const
} as const;

export type DebtType = typeof DebtType[keyof typeof DebtType];


// =============================================================================
// ASSET AND LIABILITY TYPES
// =============================================================================

export const AssetType = {
  STOCK: 'stock' as const,
  BOND: 'bond' as const,
  CASH: 'cash' as const,
  REAL_ESTATE: 'realEstate' as const,
  OTHER: 'other' as const
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];
export const LiabilityType = {
  MORTGAGE: 'mortgage' as const,
  STUDENT: 'student' as const,
  AUTO: 'auto' as const,
  CREDIT_CARD: 'credit_card' as const,
  PERSONAL: 'personal' as const,
  OTHER: 'other' as const
} as const;

export type LiabilityType = typeof LiabilityType[keyof typeof LiabilityType];
export const LotAcquisitionType = {
  PURCHASE: 'purchase' as const,
  REINVESTMENT: 'reinvestment' as const,
  TRANSFER: 'transfer' as const,
  OTHER: 'other' as const
} as const;

export type LotAcquisitionType = typeof LotAcquisitionType[keyof typeof LotAcquisitionType];

export enum LiabilityTypeDetailed {
  PRIMARY_RESIDENCE_MORTGAGE = 'PRIMARY_RESIDENCE_MORTGAGE',
  INVESTMENT_PROPERTY_MORTGAGE = 'INVESTMENT_PROPERTY_MORTGAGE',
  STUDENT_LOAN_FEDERAL = 'STUDENT_LOAN_FEDERAL',
  STUDENT_LOAN_PRIVATE = 'STUDENT_LOAN_PRIVATE',
  AUTO_LOAN = 'AUTO_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  CREDIT_CARD_DEBT = 'CREDIT_CARD_DEBT',
  BUSINESS_LOAN = 'BUSINESS_LOAN',
  MARGIN_LOAN = 'MARGIN_LOAN',
  OTHER_DEBT = 'OTHER_DEBT',
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export const GoalType = {
  RETIREMENT: 'retirement' as const,
  COLLEGE: 'college' as const,
  DREAM: 'dream' as const,
  OTHER: 'other' as const
} as const;

export type GoalType = typeof GoalType[keyof typeof GoalType];
export const SimulationMode = {
  MONTE_CARLO: 'monteCarlo' as const,
  DETERMINISTIC: 'deterministic' as const
} as const;

export type SimulationMode = typeof SimulationMode[keyof typeof SimulationMode];

export interface OptionType<T = string | number> {
  value: T;
  label: string;
  tooltip?: string;
}

export interface TaxBracket {
  incomeMin: number;
  incomeMax: number;
  rate: number;
}

export interface IRMAABracket {
  // New format for Medicare configuration
  magiThreshold?: number;
  partBSurcharge?: number;
  partDSurcharge?: number;
  // Legacy fields for backwards compatibility
  year?: number;
  filingStatus?: FilingStatus;
  magiThresholdSingle?: number;
  magiThresholdMfj?: number;
  partBDollarAdjustment?: number;
  partDDollarAdjustment?: number;
}

export interface MedicareYearData {
  basePartBPremium: number;
  basePartDPremium: number;
  irmaaBrackets: {
    [filingStatus: string]: IRMAABracket[];
  };
}

export interface MedicareConfig {
  yearData: {
    [year: string]: MedicareYearData;
  };
}

export interface TaxConfig {
  filingStatus: FilingStatus;
  state: string;
  standardDeduction: number;
  itemizedDeduction: number;
  saltCap: number;
  federalBrackets: TaxBracket[];
  capitalGainsBrackets: TaxBracket[];
  medicareConfig?: MedicareConfig;
}

export interface StochasticModelConfig {
  simulationYears: number;
  monteCarloRuns: number;
  fatTailParameter: number;
  meanSpyReturn: number;
  volatilitySpy: number;
  meanBondReturn: number;
  volatilityBond: number;
  meanInflation: number;
  volatilityInflation: number;
  meanIntlStockReturn: number;
  volatilityIntlStock: number;
  meanHomeValueAppreciation: number;
  volatilityHomeValue: number;
  meanRentalIncomeGrowth: number;
  volatilityRentalIncomeGrowth: number;
  garchSpyAlpha: number;
  garchSpyBeta: number;
  garchSpyOmega: number;
  garchBondAlpha: number;
  garchBondBeta: number;
  garchBondOmega: number;
  garchIntlStockAlpha: number;
  garchIntlStockBeta: number;
  garchIntlStockOmega: number;
  garchOtherAlpha: number;
  garchOtherBeta: number;
  garchOtherOmega: number;
  garchIndividualStockAlpha: number;
  garchIndividualStockBeta: number;
  garchIndividualStockOmega: number;
  ar1InflationPhi: number;
  ar1InflationConstant: number;
  ar1HomeValuePhi: number;
  ar1HomeValueConstant: number;
  ar1RentalIncomeGrowthPhi: number;
  ar1RentalIncomeGrowthConstant: number;
  costLeveragedEtf: number;
  correlationMatrix: number[][];
  guardrails: {
    upperGuardrail: number;
    lowerGuardrail: number;
    spendingCutPct: number;
    spendingBonusPct: number;
  };
  healthcareInflationPremium: number;
  payTaxesEndOfYear?: boolean; // When true, taxes paid end of year instead of April (disables tax float)
  debugDisableRandomness?: boolean; // Debug mode: disable market randomness, use mean returns only
  /** Simulation mode: 'deterministic' uses mean returns, 'stochastic' uses seeded random returns */
  simulationMode?: 'deterministic' | 'stochastic';
  /** Random seed for reproducible stochastic simulation (0 = use crypto/rand) */
  randomSeed?: number;
  /** Cash floor for breach detection in MC mode (default 0) */
  cashFloor?: number;
}

export interface AdvancedSimulationSettings {
  stochasticConfig: StochasticModelConfig;
  taxEfficientWithdrawal: {
    enabled: boolean;
    capitalGainsAssumption: number;
    preferredTaxRate: number;
    rothDelayYears: number;
    minimizeIrmaa: boolean;
  };
  monteCarloSettings: {
    numSimulations: number;
    confidenceLevel: number;
    successThreshold: number;
    targetAnalysisAge: number;
    enableProgressiveSpending: boolean;
  };
  advancedRebalancing: {
    enableTaxLossHarvesting: boolean;
    enableAssetLocation: boolean;
    rebalanceThresholdByAsset: { [key in AssetClass]?: number };
    minimumTradeSize: number;
  };
  stressTesting: {
    enableStressTests: boolean;
    customScenarios: Array<{
      name: string;
      description: string;
      marketShockYear: number;
      stockReturnShock: number;
      bondReturnShock: number;
      inflationShock: number;
      duration: number;
    }>;
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
}