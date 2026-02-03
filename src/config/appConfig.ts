import { AppConfig, FilingStatus, TaxBracket, IRMAABracket, StochasticModelConfig, AdvancedSimulationSettings, AssetClass } from '../types';

// Default advanced stochastic configuration based on historical data (1994-2023)
// WARNING: This period benefited from 30-year decline in interest rates - may be overly optimistic
export const DEFAULT_STOCHASTIC_CONFIG: StochasticModelConfig = {
  simulationYears: 70, // Default simulation length
  monteCarloRuns: 1, // Reduced to 1 for debugging
  fatTailParameter: 5, // Student's t DoF for fat-tailed risk modeling

  // Core Asset Properties (Geometric Mean & Annual Standard Deviation)
  meanSpyReturn: 0.098,      // 9.8% - Strong US equity performance including major crashes
  volatilitySpy: 0.175,      // 17.5% - Standard volatility reflecting dot-com and 2008 crises
  meanBondReturn: 0.042,      // 4.2% - Benefited greatly from 30-year rate decline (unlikely to repeat)
  volatilityBond: 0.055,      // 5.5% - Higher than long-term average due to recent rate volatility
  meanInflation: 0.026, // 2.6% - Average CPI-U including recent highs
  volatilityInflation: 0.020, // 2.0% - Reflects stability periods and recent sharp increases
  meanIntlStockReturn: 0.080, // 8.0% - Historically slightly lower returns than US
  volatilityIntlStock: 0.190, // 19.0% - Historically slightly more volatile than US
  meanHomeValueAppreciation: 0.040, // 4.0% - Long-term US home price appreciation
  volatilityHomeValue: 0.065, // 6.5% - Much less volatile than stocks
  meanRentalIncomeGrowth: 0.032, // 3.2% - Tends to track slightly above CPI
  volatilityRentalIncomeGrowth: 0.030, // 3.0% - Less volatile than general inflation

  // GARCH(1,1) Parameters for Volatility Clustering
  garchSpyAlpha: 0.12,     // 12% - Immediate impact of market shock on next year's volatility
  garchSpyBeta: 0.87,      // 87% - Persistence: how much volatility carries over to next year
  garchSpyOmega: 0.000015, // Calculated to target long-run variance: σ² * (1 - α - β)

  garchBondAlpha: 0.15,     // 15% - Higher shock impact than historical due to rate sensitivity
  garchBondBeta: 0.82,      // 82% - High volatility persistence for bonds
  garchBondOmega: 0.000004, // Calculated to target long-run variance

  garchIntlStockAlpha: 0.14, // 14% - Similar to SPY but reflecting different market dynamics
  garchIntlStockBeta: 0.85,  // 85% - Slightly less persistence than SPY
  // Corrected Omega for INTL (annual): σ_intl_t^2 * (1 - α_intl - β_intl) = 0.19^2 * (1 - 0.14 - 0.85) = 0.0361 * 0.01 = 0.000361
  garchIntlStockOmega: 0.000361, // Recalculated based on formula V_L * (1 - α - β)

  // GARCH parameters for Other assets (generic fallback for misc asset classes)
  garchOtherAlpha: 0.12,     // 12% - Moderate shock impact
  garchOtherBeta: 0.86,      // 86% - High persistence similar to stocks
  garchOtherOmega: 0.0001,   // Generic omega for other asset classes

  // GARCH parameters for Individual Stock assets
  garchIndividualStockAlpha: 0.15, // 15% - Higher shock impact for individual stocks
  garchIndividualStockBeta: 0.82,  // 82% - Slightly less persistence than market indices
  garchIndividualStockOmega: 0.00015, // Higher volatility for individual stocks

  // AR(1) Model for Persistence
  ar1InflationPhi: 0.65,       // 65% persistence - inflation "stickiness" observed historically
  // c_infl = μ_infl * (1 - φ_infl) = 0.026 * (1 - 0.65) = 0.0091
  ar1InflationConstant: 0.0091,

  ar1HomeValuePhi: 0.80,       // 80% persistence - home values are sticky
  // c_home = μ_home * (1 - φ_home) = 0.040 * (1 - 0.80) = 0.008
  ar1HomeValueConstant: 0.008,

  ar1RentalIncomeGrowthPhi: 0.70, // 70% persistence - rental income growth
  // c_rent = μ_rent * (1 - φ_rent) = 0.032 * (1 - 0.70) = 0.0096
  ar1RentalIncomeGrowthConstant: 0.0096,

  // Leveraged ETF Cost
  costLeveragedEtf: 0.012, // 1.2% (Expense Ratio + Financing Costs)

  // Correlation Matrix (8x8: SPY, BND, INTL, OTHER, INDIVIDUAL, INFL, HOME, RENT)
  // CRITICAL: Order MUST match WASM math.go line 481 exactly
  correlationMatrix: [
    // SPY       BND      INTL     OTHER    INDIV    INFL     HOME     RENT
    [1.00,     -0.22,    0.85,    0.80,    0.90,    0.15,    0.10,    0.05   ], // SPY
    [-0.22,     1.00,   -0.20,   -0.15,   -0.20,   -0.40,    0.20,   -0.10   ], // BND
    [0.85,     -0.20,    1.00,    0.75,    0.85,    0.10,    0.10,    0.05   ], // INTL
    [0.80,     -0.15,    0.75,    1.00,    0.75,    0.10,    0.10,    0.05   ], // OTHER (similar to stocks)
    [0.90,     -0.20,    0.85,    0.75,    1.00,    0.15,    0.10,    0.05   ], // INDIVIDUAL (high correlation with SPY)
    [0.15,     -0.40,    0.10,    0.10,    0.15,    1.00,    0.60,    0.75   ], // INFL
    [0.10,      0.20,    0.10,    0.10,    0.10,    0.60,    1.00,    0.50   ], // HOME
    [0.05,     -0.10,    0.05,    0.05,    0.05,    0.75,    0.50,    1.00   ], // RENT
  ],

  // Guardrails for Dynamic Spending Adjustments (Unchanged from previous structure)
  guardrails: {
    upperGuardrail: 0.06,      // 6.0% - Withdrawal rate triggering spending cuts
    lowerGuardrail: 0.035,     // 3.5% - Withdrawal rate allowing spending increases
    spendingCutPct: 0.10,      // 10% - Size of spending cut when upper guardrail breached
    spendingBonusPct: 0.10,    // 10% - Size of spending increase when lower guardrail breached
  },

  // Healthcare Cost Premium (Unchanged from previous structure)
  healthcareInflationPremium: 0.02, // +2.0% above general inflation for healthcare expenses

  // Tax payment timing - enabled by default to disable tax float
  payTaxesEndOfYear: true, // Pay taxes at end of year (December) instead of April
};

// Default advanced simulation settings
export const DEFAULT_ADVANCED_SETTINGS: AdvancedSimulationSettings = {
  stochasticConfig: DEFAULT_STOCHASTIC_CONFIG, // This now includes all new asset params

  taxEfficientWithdrawal: {
    enabled: true,
    capitalGainsAssumption: 0.30,
    preferredTaxRate: 0.15,
    rothDelayYears: 5,
    minimizeIrmaa: true,
  },

  monteCarloSettings: {
    numSimulations: DEFAULT_STOCHASTIC_CONFIG.monteCarloRuns, // Use value from stochasticConfig
    confidenceLevel: 0.95,
    successThreshold: 0,
    targetAnalysisAge: 95,
    enableProgressiveSpending: true,
  },

  advancedRebalancing: {
    enableTaxLossHarvesting: true,
    enableAssetLocation: true,
    rebalanceThresholdByAsset: {
      [AssetClass.US_STOCKS_TOTAL_MARKET]: 0.05,
      [AssetClass.US_BONDS_TOTAL_MARKET]: 0.03,
      [AssetClass.INTERNATIONAL_STOCKS]: 0.05,
      [AssetClass.REAL_ESTATE_PRIMARY_HOME]: 0.10,
      [AssetClass.OTHER_ASSETS]: 0.10,
    },
    minimumTradeSize: 1000,
  },

  stressTesting: {
    enableStressTests: false,
    customScenarios: [
      {
        name: "2008 Financial Crisis",
        description: "Severe market downturn similar to 2008-2009",
        marketShockYear: 5,
        stockReturnShock: -0.37, // General stock shock, could specify for SPY/INTL
        bondReturnShock: 0.05,
        inflationShock: -0.01,
        duration: 2,
      },
      {
        name: "1970s Stagflation",
        description: "High inflation with poor stock performance",
        marketShockYear: 10,
        stockReturnShock: -0.05,
        bondReturnShock: -0.03,
        inflationShock: 0.05,
        duration: 5,
      }
    ]
  },

  strategySettings: {
    retirementWithdrawal: {
      withdrawalSequence: 'tax_efficient',
      enableAutomaticRMDs: true,
      enableRothConversions: false,
      rothConversionMaxTaxRate: 24,
    },
    socialSecurity: {
      plannedClaimingAge: 67,
    },
    assetLocation: {
      enabled: false,
    },
  }
};

// Default advanced simulation settings with historical market data
export const DEFAULT_ADVANCED_SIMULATION_SETTINGS: AdvancedSimulationSettings = {
  ...DEFAULT_ADVANCED_SETTINGS, // Start by copying default advanced settings
  // Override specific historical simulation settings if necessary
  taxEfficientWithdrawal: {
    ...DEFAULT_ADVANCED_SETTINGS.taxEfficientWithdrawal,
    capitalGainsAssumption: 0.70, // Example override
  },
  monteCarloSettings: {
    ...DEFAULT_ADVANCED_SETTINGS.monteCarloSettings,
    enableProgressiveSpending: false, // Example override
  },
  // Ensure stochasticConfig is also correctly referenced or overridden if historical uses different base params
  stochasticConfig: DEFAULT_STOCHASTIC_CONFIG, // Assuming historical also uses the new full config
};

// Single filer tax brackets for 2024
export const SINGLE_TAX_BRACKETS: TaxBracket[] = [
  { incomeMin: 0, incomeMax: 11600, rate: 0.10 },        // 10% bracket
  { incomeMin: 11600, incomeMax: 47150, rate: 0.12 },    // 12% bracket
  { incomeMin: 47150, incomeMax: 100525, rate: 0.22 },   // 22% bracket
  { incomeMin: 100525, incomeMax: 191950, rate: 0.24 },  // 24% bracket
  { incomeMin: 191950, incomeMax: 243725, rate: 0.32 },  // 32% bracket
  { incomeMin: 243725, incomeMax: 609350, rate: 0.35 },  // 35% bracket
  { incomeMin: 609350, incomeMax: Infinity, rate: 0.37 } // 37% bracket
];

// Married filing jointly tax brackets for 2024
export const MFJ_TAX_BRACKETS: TaxBracket[] = [
  { incomeMin: 0, incomeMax: 23200, rate: 0.10 },        // 10% bracket
  { incomeMin: 23200, incomeMax: 94300, rate: 0.12 },    // 12% bracket
  { incomeMin: 94300, incomeMax: 201050, rate: 0.22 },   // 22% bracket
  { incomeMin: 201050, incomeMax: 383900, rate: 0.24 },  // 24% bracket
  { incomeMin: 383900, incomeMax: 487450, rate: 0.32 },  // 32% bracket
  { incomeMin: 487450, incomeMax: 731200, rate: 0.35 },  // 35% bracket
  { incomeMin: 731200, incomeMax: Infinity, rate: 0.37 } // 37% bracket
];

// Long-term capital gains tax brackets for 2024
export const LTCG_TAX_BRACKETS: TaxBracket[] = [
  { incomeMin: 0, incomeMax: 47025, rate: 0.00 },        // 0% rate (single)
  { incomeMin: 47025, incomeMax: 518900, rate: 0.15 },   // 15% rate (single)
  { incomeMin: 518900, incomeMax: Infinity, rate: 0.20 } // 20% rate (single)
];

export const DEFAULT_FEDERAL_TAX_BRACKETS: TaxBracket[] = [
  { incomeMin: 0, incomeMax: 23200, rate: 0.10 },        // Example for MFJ, 2024
  { incomeMin: 23200, incomeMax: 94300, rate: 0.12 },   // Example for MFJ, 2024
  { incomeMin: 94300, incomeMax: 201050, rate: 0.22 },  // Example for MFJ, 2024
  { incomeMin: 201050, incomeMax: 383900, rate: 0.24 }, // Example for MFJ, 2024
  { incomeMin: 383900, incomeMax: 487450, rate: 0.32 }, // Example for MFJ, 2024
  { incomeMin: 487450, incomeMax: 731200, rate: 0.35 }, // Example for MFJ, 2024
  { incomeMin: 731200, incomeMax: Infinity, rate: 0.37 } // Example for MFJ, 2024
];

export const DEFAULT_LTCG_BRACKETS: TaxBracket[] = [
  { incomeMin: 0, incomeMax: 94050, rate: 0.00 },    // Up to $94,050 for MFJ for 0% rate in 2024
  { incomeMin: 94050, incomeMax: 583750, rate: 0.15 }, // Up to $583,750 for MFJ for 15% rate
  { incomeMin: 583750, incomeMax: Infinity, rate: 0.20 } // Above that is 20%
];

// Based on 2024 numbers, assuming MFJ for thresholds.
// Note: Real IRMAA brackets depend on filing status and specific year's figures.
// The 'monthlyAdjustment' here is a sum of Part B and Part D adjustments.
// For the type, we'll put it into partBDollarAdjustment and set partDDollarAdjustment to 0.
export const DEFAULT_IRMAA_BRACKETS: IRMAABracket[] = [
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 0, magiThresholdMfj: 0, partBDollarAdjustment: 0, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 103000, magiThresholdMfj: 206000, partBDollarAdjustment: 69.90, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 129000, magiThresholdMfj: 258000, partBDollarAdjustment: 174.70, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 161000, magiThresholdMfj: 322000, partBDollarAdjustment: 279.50, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 193000, magiThresholdMfj: 386000, partBDollarAdjustment: 384.30, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, magiThresholdSingle: 500000, magiThresholdMfj: 750000, partBDollarAdjustment: 419.30, partDDollarAdjustment: 0 }, // For MAGI above thresholds
  // Simplified: Using a single high threshold for the top bracket for single filers as well.
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 0, magiThresholdMfj: 0, partBDollarAdjustment: 0, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 103000, magiThresholdMfj: 206000, partBDollarAdjustment: 69.90, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 129000, magiThresholdMfj: 258000, partBDollarAdjustment: 174.70, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 161000, magiThresholdMfj: 322000, partBDollarAdjustment: 279.50, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 193000, magiThresholdMfj: 386000, partBDollarAdjustment: 384.30, partDDollarAdjustment: 0 },
  { year: 2024, filingStatus: FilingStatus.SINGLE, magiThresholdSingle: 500000, magiThresholdMfj: 750000, partBDollarAdjustment: 419.30, partDDollarAdjustment: 0 },
];


export const DEFAULT_TAX_SYSTEM: any = {
  filingStatus: 'mfj', // Default filing status
  federalTaxBrackets: DEFAULT_FEDERAL_TAX_BRACKETS,
  capitalGainsTaxRates: {
    shortTerm: DEFAULT_FEDERAL_TAX_BRACKETS, // Assuming STCG are taxed as ordinary income
    longTerm: DEFAULT_LTCG_BRACKETS,
  },
  standardDeduction: 29200, // Example for MFJ, 2024
  includeSocialSecurityTaxation: false,
  includeMedicareSurtax: false,
  maxCapitalLossDeduction: 3000,
  irmaaBrackets: DEFAULT_IRMAA_BRACKETS,
};

export const DEFAULT_STRATEGIES: Pick<AppConfig,
  'currentMasterAssetAllocationStrategy' | 'currentRebalancingParameters' | 'currentAssetLocationPreferences' |
  'currentRetirementWithdrawalStrategy' | 'currentRothConversionStrategy' | 'currentDebtManagementStrategy' |
  'currentCashManagementStrategy' | 'currentIrmaaManagementStrategy' | 'currentTaxLossHarvestingSettings' |
  'currentStrategicCapitalGainsRealizationSettings' | 'currentCharitableGivingStrategy' | 'currentEquityCompensationStrategy'
> = {
  currentMasterAssetAllocationStrategy: undefined,
  currentRebalancingParameters: undefined,
  currentAssetLocationPreferences: undefined,
  currentRetirementWithdrawalStrategy: undefined,
  currentRothConversionStrategy: undefined,
  currentDebtManagementStrategy: undefined,
  currentCashManagementStrategy: {
    enabled: true,
    targetReserveMonthsOfExpenses: 3,
    sweepExcessCashToInvestments: true,
    sweepThreshold: 5000,
  },
  currentIrmaaManagementStrategy: undefined,
  currentTaxLossHarvestingSettings: undefined,
  currentStrategicCapitalGainsRealizationSettings: undefined,
  currentCharitableGivingStrategy: undefined,
  currentEquityCompensationStrategy: {
    rsuSaleStrategy: {
      strategy: 'sell_to_cover_taxes',
      taxRate: 0.22
    }
  },
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  currentAge: 35,
  currentMonth: new Date().getMonth() + 1, // Current month (1-indexed for user display)
  simulationStartYear: new Date().getFullYear(),
  simulationEndAge: 95, // Standard retirement planning end age (aligns with life expectancy planning)
  monteCarloRuns: DEFAULT_STOCHASTIC_CONFIG.monteCarloRuns, // Corrected access
  simulationMode: 'monteCarlo',

  // Centralized date settings
  dateSettings: {
    simulationStartYear: new Date().getFullYear(),
    simulationStartMonth: new Date().getMonth() + 1, // 1-indexed
    simulationHorizonYears: 60, // Default 60-year forecast (from age 35 to 95)
    simulationEndYear: new Date().getFullYear() + 60,
  },

  assetConfig: { // This might be deprecated or used differently with the new stochastic model
    cash: { meanReturn: 0.015, stdDev: 0.005, type: 'cash', dividendYield: 0 },
    stocks: { meanReturn: DEFAULT_STOCHASTIC_CONFIG.meanSpyReturn, stdDev: DEFAULT_STOCHASTIC_CONFIG.volatilitySpy, type: 'equity', dividendYield: 0.015 },
    bonds: { meanReturn: DEFAULT_STOCHASTIC_CONFIG.meanBondReturn, stdDev: DEFAULT_STOCHASTIC_CONFIG.volatilityBond, type: 'fixed_income', dividendYield: 0.025 },
    international_stocks: { meanReturn: DEFAULT_STOCHASTIC_CONFIG.meanIntlStockReturn, stdDev: DEFAULT_STOCHASTIC_CONFIG.volatilityIntlStock, type: 'equity', dividendYield: 0.018 },
    real_estate_primary_home: { meanReturn: DEFAULT_STOCHASTIC_CONFIG.meanHomeValueAppreciation, stdDev: DEFAULT_STOCHASTIC_CONFIG.volatilityHomeValue, type: 'realEstate', dividendYield: 0 },
    leveraged_spy: { meanReturn: 0, stdDev: 0, type: 'equity', dividendYield: 0 }, // Placeholder, return is derived
    otherAssets: { meanReturn: 0.060, stdDev: 0.120, type: 'alternative', dividendYield: 0.01 }
  },

  accountTypes: ['taxable', '401k', 'roth401k', 'ira', 'rothIra', 'hsa', '403b', '457b', 'brokerage', 'checking', 'savings', 'other'],
  assetClasses: Object.values(AssetClass).filter(value => typeof value === 'string'), // Use AssetClass enum values
  inflationRate: DEFAULT_STOCHASTIC_CONFIG.meanInflation, // Use stochastic model's mean inflation
  reinvestDividends: true,
  rmdStartAge: 73,
  // ... rmdFactors ...
  rmdFactors: {
    73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
    87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
    94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4
  },

  filingStatus: FilingStatus.SINGLE,
  numberOfDependents: 0,
  domicileState: 'DEFAULT',
  applyIRMAA: true,
  taxSystem: {
    [FilingStatus.SINGLE]: {
      brackets: SINGLE_TAX_BRACKETS,
      standardDeduction: 14600,
    },
    [FilingStatus.MARRIED_FILING_JOINTLY]: {
      brackets: MFJ_TAX_BRACKETS,
      standardDeduction: 29200,
    },
    ltcg: {
      brackets: LTCG_TAX_BRACKETS,
      standardDeduction: 0,
    },
    capitalLossOffsetLimit: 3000,
    socialSecurityTaxablePortion: 0.85,
    itemizedDeductionLimits: {
      saltCap: 10000,
    },
    irmaaBrackets: DEFAULT_IRMAA_BRACKETS,
  } as any,
  currentMasterAssetAllocationStrategy: null,
  currentRebalancingParameters: null,
  currentAssetLocationPreferences: null,
  currentRetirementWithdrawalStrategy: null,
  currentRothConversionStrategy: null,
  currentIrmaaManagementStrategy: {
    enabled: false,
    magiThreshold: 206000,
    tactics: [],
  },
  currentTaxLossHarvestingSettings: {
    enabled: false,
    minLossThresholdAbsolute: 500,
    washSalePeriodDays: 31,
  },
  currentStrategicCapitalGainsRealizationSettings: {
    enabled: false,
    targetBracket: '0_ltcg',
  },
  currentDebtManagementStrategy: null,
  currentCashManagementStrategy: {
    enabled: true,
    targetReserveMonthsOfExpenses: 3,
    sweepExcessCashToInvestments: true,
    sweepThreshold: 5000,
  },
  currentLtcPlanningStrategy: {
    type: 'SELF_INSURE',
  },
  currentCharitableGivingStrategy: {
    qcdEnabled: false,
    qcdAnnualTargetAmount: 0,
    qcdPrioritizeForRmd: true,
  },
  currentEquityCompensationStrategy: {
    rsuSaleStrategy: {
      strategy: 'sell_to_cover_taxes',
      taxRate: 0.22
    }
  },
  currentConcentrationRiskSettings: { enabled: false, thresholdPct: 0 },

  // Calculator-specific settings
  contributionLimitSettings: {
    userAge: 35,  // Will be sync'd with currentAge
    hasFamily: false, // For HSA contribution limits
  },
  stateTaxSettings: {
    stateCode: 'CA', // Default to California, sync'd with domicileState
    filingStatus: 'single',
    numDependents: 0,
  },
  socialSecuritySettings: {
    enabled: false,
    birthYear: 1989, // Default ~35 years old in 2024
    primaryInsuranceAmount: 2500, // ~$30k annual benefit at FRA
    plannedClaimingAge: 67, // Full retirement age for those born 1960+
    hasSpouse: false,
  },
  estatePlanningSettings: {
    enabled: false,
    estimatedEstateTaxable: 0,
    lifetimeGifts: 0,
    portableExemption: 0,
    annualGiftingBudget: 0,
  },
  propertyCostSettings: {
    hasProperty: false,
    stateCode: 'CA',
    isCoastal: false,
    isWildfireZone: false,
    isFloodZone: false,
  },
  goalPrioritizationSettings: {
    enabled: false,
    availableMonthlyFunds: 0,
    priorityOrder: [],
  },
  taxAwareRebalancingSettings: {
    enabled: false,
    rebalanceThreshold: 0.05, // 5% deviation
    preferTaxDeferredAccounts: true,
    enableTaxLossHarvesting: false,
    minimumLossToHarvest: 500,
  },

  simulationParams: {
    simulationStartYear: new Date().getFullYear(),
    simulationEndYear: new Date().getFullYear() + DEFAULT_STOCHASTIC_CONFIG.simulationYears,
    monteCarloRuns: DEFAULT_STOCHASTIC_CONFIG.monteCarloRuns,
    includeInflation: true,
    baseInflationRate: DEFAULT_STOCHASTIC_CONFIG.meanInflation,
    includeMarketVolatility: true,
    marketAssumptions: {
      stockReturn: DEFAULT_STOCHASTIC_CONFIG.meanSpyReturn,
      stockVolatility: DEFAULT_STOCHASTIC_CONFIG.volatilitySpy,
      bondReturn: DEFAULT_STOCHASTIC_CONFIG.meanBondReturn,
      bondVolatility: DEFAULT_STOCHASTIC_CONFIG.volatilityBond,
      cashReturn: 0.015
    }
  },

  stochasticConfig: DEFAULT_STOCHASTIC_CONFIG,
  advancedSimulationSettings: DEFAULT_ADVANCED_SETTINGS, // Ensure this uses the updated DEFAULT_STOCHASTIC_CONFIG
};
