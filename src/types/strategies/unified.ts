/**
 * Policy Settings for WASM Engine
 *
 * This module defines the PolicySettings interface that matches the Go StrategySettings struct
 * used by the WASM simulation engine. These are always-active singleton settings (one per type)
 * that govern automated behaviors during simulation.
 *
 * Policies are distinct from Strategy Events:
 * - Policies: Always-active rules (withdrawal order, cash management, rebalancing thresholds)
 * - Strategy Events: Time-bound automations (Roth conversions, tax-loss harvesting events)
 *
 * The PolicySettings object is passed to the WASM engine as part of SimulationInput.
 */

/**
 * Policy-level Retirement Withdrawal Settings
 * Simpler flat structure for policy configuration (not the full strategy object).
 */
export interface PolicyRetirementWithdrawalSettings {
  /** Withdrawal method type */
  method?: 'constant_inflation_adjusted' | 'vpw' | 'guardrail' | 'dynamic_guardrail';
  /** Base withdrawal rate (e.g., 0.04 for 4%) */
  baseWithdrawalRate?: number;
  /** Whether to adjust for inflation */
  inflationAdjustment?: boolean;
  /** Whether to use tax-efficient withdrawal sequence */
  taxEfficientSequence?: boolean;
  /** Withdrawal sequence strategy */
  withdrawalSequence?: 'tax_efficient' | 'proportional' | 'taxable_first';
  /** Enable automatic RMD calculations */
  enableAutomaticRMDs?: boolean;
  /** Enable Roth conversion optimization */
  enableRothConversions?: boolean;
  /** Maximum tax rate for Roth conversions */
  rothConversionMaxRate?: number;
  /** Maximum tax bracket for Roth conversions */
  rothConversionBracket?: number;
  /** Guardrail parameters for dynamic spending */
  guardrailParameters?: {
    enabled: boolean;
    upperGuardrail?: number;
    lowerGuardrail?: number;
    spendingCutPct?: number;
    spendingBonusPct?: number;
  };
  /**
   * PFOS-E: Protect retirement accounts from early withdrawal
   * When true, blocks withdrawals from TaxDeferred/Roth before protectionMinAge
   */
  protectRetirementAccounts?: boolean;
  /**
   * Minimum age for retirement account withdrawals (default 59.5)
   * Only applies when protectRetirementAccounts is true
   */
  protectionMinAge?: number;
}

/**
 * Asset Allocation Strategy
 * Defines target allocation across asset classes
 */
export interface AssetAllocationStrategy {
  enabled: boolean;
  targetAllocation: Record<string, number>; // AssetClass -> allocation percentage
  rebalanceThreshold?: number;
}

/**
 * Asset Location Preferences
 * Controls which assets go in which account types
 */
export interface AssetLocationPreferences {
  enabled: boolean;
  preferTaxEfficientInTaxable?: boolean;
  preferTaxInefficientInDeferred?: boolean;
  preferHighGrowthInRoth?: boolean;
}

/**
 * Rebalancing Parameters
 * Controls when and how portfolio rebalancing occurs
 */
export interface RebalancingParameters {
  enabled: boolean;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'threshold';
  thresholdPercentage?: number;
  minimumCashBeforeRebalance?: number;
}

/**
 * Tax Loss Harvesting Settings
 * Controls tax loss harvesting behavior
 */
export interface TaxLossHarvestingSettings {
  enabled: boolean;
  minLossThreshold?: number;
  washSaleProtection?: boolean;
}

/**
 * Strategic Capital Gains Settings
 * Controls timing of capital gains realization
 */
export interface StrategicCapitalGainsSettings {
  enabled: boolean;
  targetBracketTop?: number;
  harvestUpToBracket?: boolean;
}

/**
 * Cash Management Strategy
 * Controls cash reserve and sweep behavior
 */
export interface CashManagementStrategy {
  enabled: boolean;
  targetReserveMonths?: number;
  autoInvestExcess?: boolean;
  autoSellForShortfall?: boolean;
  /**
   * PFOS-E "Show the wall" mode
   * When true, shortfalls will NOT auto-liquidate from investments.
   * Cash can go negative, triggering cash floor breach flags.
   */
  noAutoLiquidate?: boolean;
}

/**
 * Debt Management Strategy
 * Controls debt payoff strategies
 */
export interface DebtManagementStrategy {
  enabled: boolean;
  method?: 'avalanche' | 'snowball' | 'custom';
  extraPaymentAmount?: number;
  /**
   * PFOS-E: Maximum debt-to-assets ratio (e.g., 0.8 = 80%)
   * Triggers leverage_exceeded constraint when breached
   */
  maxLeverageRatio?: number;
  /**
   * PFOS-E: Block new debt when maxLeverageRatio is exceeded
   */
  blockNewDebtOnBreach?: boolean;
}

/**
 * Qualified Charitable Distribution Settings
 * Controls QCD behavior from IRAs
 */
export interface QualifiedCharitableDistributionSettings {
  enabled: boolean;
  annualAmount?: number;
  satisfyRMDFirst?: boolean;
}

/**
 * Concentration Risk Settings
 * Controls handling of concentrated positions
 */
export interface ConcentrationRiskSettings {
  enabled: boolean;
  maxSinglePositionPct?: number;
  maxSectorPct?: number;
}

/**
 * Contribution Limit Settings
 * User demographics for IRS contribution limit tracking
 */
export interface ContributionLimitSettings {
  userAge: number;
  hasFamily?: boolean; // For HSA family vs individual limit
}

/**
 * State Tax Settings
 * State-specific income tax configuration
 */
export interface StateTaxSettings {
  stateCode: string; // Two-letter state code (e.g., "CA", "NY", "TX")
  filingStatus: 'single' | 'marriedFilingJointly' | 'marriedFilingSeparately' | 'headOfHousehold';
  numDependents?: number;
}

/**
 * Social Security Settings
 * Social Security benefit configuration and claiming strategy
 */
export interface SocialSecuritySettings {
  birthYear: number;
  primaryInsuranceAmount: number; // PIA - monthly benefit at FRA
  plannedClaimingAge: number; // Age to start claiming (62-70)
  hasSpouse?: boolean;
  spouseBirthYear?: number;
  spousePIA?: number;
  spouseClaimingAge?: number;
}

/**
 * Estate Planning Settings
 * Estate and gift tax planning configuration
 */
export interface EstatePlanningSettings {
  enabled: boolean;
  estimatedEstateTaxable?: number; // Estimated taxable estate value
  lifetimeGifts?: number; // Taxable gifts made during lifetime
  portableExemption?: number; // Unused exemption from deceased spouse
  annualGiftingBudget?: number; // Annual gifting to heirs
}

/**
 * Long-Term Care Settings
 * Long-term care cost planning configuration
 */
export interface LongTermCareSettings {
  enabled: boolean;
  hasLTCInsurance?: boolean;
  ltcDailyBenefit?: number; // Insurance daily benefit amount
  ltcBenefitPeriod?: number; // Years of coverage
  ltcEliminationPeriod?: number; // Days before insurance pays
  preferredCareLevel?: 'homemaker' | 'homeHealthAide' | 'adultDaycare' | 'assistedLiving' | 'nursingHomeSemiPrivate' | 'nursingHomePrivate';
}

/**
 * Property Cost Settings
 * Real estate ownership cost projections
 */
export interface PropertyCostSettings {
  hasProperty?: boolean;
  stateCode?: string;
  isCoastal?: boolean;
  isWildfireZone?: boolean;
  isFloodZone?: boolean;
}

/**
 * Goal Prioritization Settings
 * Goal priority and funding allocation configuration
 */
export interface GoalPrioritizationSettings {
  enabled: boolean;
  availableMonthlyFunds?: number; // Total monthly funds available for goals
  priorityOrder?: string[]; // Goal IDs in priority order
}

/**
 * Tax-Aware Rebalancing Settings
 * Multi-account rebalancing with tax optimization
 */
export interface TaxAwareRebalancingSettings {
  enabled: boolean;
  rebalanceThreshold?: number; // Absolute deviation to trigger rebalance (e.g., 0.05 for 5%)
  preferTaxDeferredAccounts?: boolean; // Rebalance tax-deferred first
  enableTaxLossHarvesting?: boolean;
  minimumLossToHarvest?: number; // Minimum loss amount to trigger harvesting
}

/**
 * PolicySettings
 *
 * Always-active singleton configuration for automated behaviors during simulation.
 * This matches the Go StrategySettings struct in domain_types.go (lines 1509-1520).
 *
 * Each field is optional to allow partial configuration.
 * The WASM engine will use defaults for any unspecified policies.
 */
export interface PolicySettings {
  /** Asset allocation strategy configuration */
  assetAllocation?: AssetAllocationStrategy;

  /** Asset location preferences */
  assetLocation?: AssetLocationPreferences;

  /** Rebalancing parameters */
  rebalancing?: RebalancingParameters;

  /** Tax loss harvesting settings */
  taxLossHarvesting?: TaxLossHarvestingSettings;

  /** Strategic capital gains settings */
  strategicCapitalGains?: StrategicCapitalGainsSettings;

  /** Cash management strategy */
  cashManagement?: CashManagementStrategy;

  /** Debt management strategy */
  debtManagement?: DebtManagementStrategy;

  /** Retirement withdrawal settings (includes RMD and Roth conversion settings) */
  retirementWithdrawal?: PolicyRetirementWithdrawalSettings;

  /** Qualified charitable distribution settings */
  qualifiedCharitable?: QualifiedCharitableDistributionSettings;

  /** Concentration risk settings */
  concentrationRisk?: ConcentrationRiskSettings;

  /** Contribution limit tracking settings */
  contributionLimits?: ContributionLimitSettings;

  /** State income tax settings */
  stateTax?: StateTaxSettings;

  /** Social Security benefit settings */
  socialSecurity?: SocialSecuritySettings;

  /** Estate and gift tax planning settings */
  estatePlanning?: EstatePlanningSettings;

  /** Long-term care planning settings */
  longTermCare?: LongTermCareSettings;

  /** Property ownership cost settings */
  propertyCosts?: PropertyCostSettings;

  /** Goal prioritization settings */
  goalPrioritization?: GoalPrioritizationSettings;

  /** Tax-aware rebalancing settings */
  taxAwareRebalancing?: TaxAwareRebalancingSettings;
}

/**
 * Helper function to create default PolicySettings
 */
export function createDefaultPolicySettings(): PolicySettings {
  return {
    assetAllocation: {
      enabled: false,
      targetAllocation: {},
    },
    rebalancing: {
      enabled: false,
      frequency: 'annually',
    },
    taxLossHarvesting: {
      enabled: false,
    },
    cashManagement: {
      enabled: false,
    },
    retirementWithdrawal: {
      method: 'constant_inflation_adjusted',
      baseWithdrawalRate: 0.04,
      inflationAdjustment: true,
      taxEfficientSequence: true,
      withdrawalSequence: 'tax_efficient',
      enableAutomaticRMDs: true,
      enableRothConversions: false,
      rothConversionMaxRate: 0.22,
      rothConversionBracket: 89075,
      guardrailParameters: {
        enabled: false,
        upperGuardrail: 0.06,
        lowerGuardrail: 0.04,
        spendingCutPct: 0.10,
        spendingBonusPct: 0.05,
      },
    },
    contributionLimits: {
      userAge: 35, // Will be updated from user profile
      hasFamily: false,
    },
    stateTax: {
      stateCode: 'CA', // Default to California
      filingStatus: 'single',
      numDependents: 0,
    },
    socialSecurity: {
      birthYear: 1989, // Default ~35 years old in 2024
      primaryInsuranceAmount: 2500, // ~$30k annual benefit
      plannedClaimingAge: 67, // Full retirement age
      hasSpouse: false,
    },
    estatePlanning: {
      enabled: false,
    },
    longTermCare: {
      enabled: false,
    },
    propertyCosts: {
      hasProperty: false,
    },
    goalPrioritization: {
      enabled: false,
    },
    taxAwareRebalancing: {
      enabled: false,
      rebalanceThreshold: 0.05, // 5% deviation
      preferTaxDeferredAccounts: true,
      enableTaxLossHarvesting: false,
    },
  };
}

// Backward compatibility aliases
/** @deprecated Use PolicySettings instead */
export type StrategySettings = PolicySettings;

/** @deprecated Use createDefaultPolicySettings instead */
export const createDefaultStrategySettings = createDefaultPolicySettings;
