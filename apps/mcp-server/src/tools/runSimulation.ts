/**
 * MCP Tool: run_simulation_packet
 *
 * Runs financial simulation and returns packet with Monte Carlo results.
 * This tool provides a simplified Bronze-tier interface for ChatGPT App.
 *
 * MODIFIED: Now calls real simulation service instead of returning mocks.
 *
 * Architecture:
 *   MCP Server → HTTP POST → Simulation Service → WASM → Results
 *
 * The simulation service runs WASM in a separate process, preserving the
 * pure-function boundary. When Workers deployment completes, we swap the URL.
 *
 * Claude Connector Support:
 *   In addition to OpenAI's _meta widget protocol, we generate a fragment URL
 *   for privacy-first viewing. The fragment payload is NEVER sent to the server.
 */

import type {
  RunSimulationParams,
  SimulationPacketResult,
  DollarsMode,
  TaxMode,
  TaxAssumptions,
  ResolvedTaxConfig,
  AccountBuckets,
  AssetAllocation,
  IncomeChange,
  IncomeStream,
  SpendingChange,
  OneTimeEvent,
  ComparisonData,
  PhaseInfo,
  FlexibilityCurvePoint,
  AnnualSnapshot,
  PlanDuration,
  SimulationSchedule,
  ScheduledEvent,
  WithdrawalStrategy,
  CashReserveConfig,
  RebalancingConfig,
  DebtConfig,
  ReturnAssumptions,
} from '../types.js';
import { SimulationError, ErrorCode, validate } from '../errors.js';

/**
 * Default tax assumptions when mode='default_assumptions' or when no tax mode specified
 * These are federal single filer values - conservative estimates
 *
 * Federal single filer 2024 brackets (simplified):
 * - 22% marginal on $47,151-$100,525
 * - 24% marginal on $100,526-$191,950
 * - Effective rate ~20-25% for typical incomes
 *
 * Long-term capital gains:
 * - 15% for most filers ($47,026-$518,900)
 */
const DEFAULT_TAX_ASSUMPTIONS = {
  filingStatus: 'single' as const,
  state: 'NONE', // Federal only by default
  effectiveRateRange: [0.20, 0.25] as [number, number], // 20-25% effective federal
  capitalGainsRateRange: [0.15, 0.15] as [number, number], // 15% LTCG federal
};

/**
 * Resolve tax assumptions to concrete configuration
 *
 * DEFAULT BEHAVIOR: Taxes are ENABLED by default with federal single filer assumptions.
 * This ensures simulations are realistic. User can explicitly disable with mode='not_applied'.
 */
function resolveTaxAssumptions(
  taxAssumptions?: TaxAssumptions
): { taxMode: TaxMode; taxConfig: ResolvedTaxConfig | null } {
  // Explicit opt-out: no taxes only if user explicitly requests it
  if (taxAssumptions?.mode === 'not_applied') {
    return { taxMode: 'NOT_APPLIED', taxConfig: null };
  }

  // DEFAULT: If no taxAssumptions provided, use federal single filer defaults
  // This ensures taxes are always applied unless explicitly disabled
  if (!taxAssumptions) {
    return {
      taxMode: 'DEFAULT_ASSUMPTIONS',
      taxConfig: {
        enabled: true,
        filingStatus: DEFAULT_TAX_ASSUMPTIONS.filingStatus,
        state: DEFAULT_TAX_ASSUMPTIONS.state,
        effectiveRate: (DEFAULT_TAX_ASSUMPTIONS.effectiveRateRange[0] + DEFAULT_TAX_ASSUMPTIONS.effectiveRateRange[1]) / 2,
        capitalGainsRate: (DEFAULT_TAX_ASSUMPTIONS.capitalGainsRateRange[0] + DEFAULT_TAX_ASSUMPTIONS.capitalGainsRateRange[1]) / 2,
        effectiveRateRange: DEFAULT_TAX_ASSUMPTIONS.effectiveRateRange,
        capitalGainsRateRange: DEFAULT_TAX_ASSUMPTIONS.capitalGainsRateRange,
      },
    };
  }

  // Default assumptions mode
  if (taxAssumptions.mode === 'default_assumptions') {
    const filingStatus = taxAssumptions.filingStatus ?? DEFAULT_TAX_ASSUMPTIONS.filingStatus;
    const state = taxAssumptions.state ?? DEFAULT_TAX_ASSUMPTIONS.state;
    const effectiveRateRange = taxAssumptions.effectiveRateRange ?? DEFAULT_TAX_ASSUMPTIONS.effectiveRateRange;
    const capitalGainsRateRange = taxAssumptions.capitalGainsRateRange ?? DEFAULT_TAX_ASSUMPTIONS.capitalGainsRateRange;

    return {
      taxMode: 'DEFAULT_ASSUMPTIONS',
      taxConfig: {
        enabled: true,
        filingStatus,
        state,
        effectiveRate: (effectiveRateRange[0] + effectiveRateRange[1]) / 2,
        capitalGainsRate: (capitalGainsRateRange[0] + capitalGainsRateRange[1]) / 2,
        effectiveRateRange,
        capitalGainsRateRange,
      },
    };
  }

  // User declared mode - require rate ranges
  if (taxAssumptions.mode === 'user_declared') {
    const filingStatus = taxAssumptions.filingStatus ?? 'single';
    const state = taxAssumptions.state ?? 'CA';
    const effectiveRateRange = taxAssumptions.effectiveRateRange ?? [0.20, 0.30];
    const capitalGainsRateRange = taxAssumptions.capitalGainsRateRange ?? [0.15, 0.20];

    return {
      taxMode: 'USER_DECLARED',
      taxConfig: {
        enabled: true,
        filingStatus,
        state,
        effectiveRate: (effectiveRateRange[0] + effectiveRateRange[1]) / 2,
        capitalGainsRate: (capitalGainsRateRange[0] + capitalGainsRateRange[1]) / 2,
        effectiveRateRange,
        capitalGainsRateRange,
      },
    };
  }

  // Fallback to no taxes
  return { taxMode: 'NOT_APPLIED', taxConfig: null };
}

/**
 * Normalize account buckets to handle Pct-suffixed aliases.
 * Pct suffix takes precedence if both are provided.
 */
function normalizeAccountBuckets(buckets?: AccountBuckets): AccountBuckets | undefined {
  if (!buckets) return undefined;

  return {
    cash: buckets.cashPct ?? buckets.cash,
    taxable: buckets.taxablePct ?? buckets.taxable,
    taxDeferred: buckets.taxDeferredPct ?? buckets.taxDeferred,
    roth: buckets.rothPct ?? buckets.roth,
    hsa: buckets.hsaPct ?? buckets.hsa,
  };
}

/**
 * Validate account bucket allocations
 * Returns array of validation errors (empty if valid)
 *
 * Rules:
 * - All percentages must be 0-100
 * - Sum must equal 100 (within 0.01% tolerance)
 *
 * Supports both original names (cash, taxable, etc.) and Pct-suffixed
 * aliases (cashPct, taxablePct, etc.) for clarity.
 */
function validateAccountBuckets(buckets?: AccountBuckets): string[] {
  const errors: string[] = [];
  if (!buckets) return errors;

  // Normalize to handle Pct aliases
  const normalized = normalizeAccountBuckets(buckets)!;

  const entries = [
    { name: 'cash', value: normalized.cash },
    { name: 'taxable', value: normalized.taxable },
    { name: 'taxDeferred', value: normalized.taxDeferred },
    { name: 'roth', value: normalized.roth },
    { name: 'hsa', value: normalized.hsa },
  ];

  // Validate each field is within range
  for (const { name, value } of entries) {
    if (value !== undefined && (value < 0 || value > 100)) {
      errors.push(`accountBuckets.${name} must be between 0 and 100`);
    }
  }

  // Validate sum equals 100
  const sum = entries.reduce((acc, { value }) => acc + (value ?? 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    errors.push(`accountBuckets must sum to 100 (got ${sum.toFixed(2)})`);
  }

  return errors;
}

/**
 * Glide path brackets matching WASM engine (from config/defaults.json)
 * Maps years-to-retirement → stock percentage
 */
const GLIDE_PATH_BRACKETS = [
  { yearsToRetirement: 30, stockPct: 0.90 },
  { yearsToRetirement: 20, stockPct: 0.80 },
  { yearsToRetirement: 10, stockPct: 0.65 },
  { yearsToRetirement: 5,  stockPct: 0.50 },
  { yearsToRetirement: 0,  stockPct: 0.30 },
];

/**
 * Calculate stock percentage from glide path brackets
 *
 * @param currentAge - User's current age
 * @param retirementAge - Target retirement age
 * @returns Stock percentage (0-1)
 */
function calculateGlidePathAllocation(currentAge: number, retirementAge: number): number {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  for (const bracket of GLIDE_PATH_BRACKETS) {
    if (yearsToRetirement >= bracket.yearsToRetirement) {
      return bracket.stockPct;
    }
  }

  // Most conservative (already in retirement or past all brackets)
  return 0.30;
}

/**
 * Validate asset allocation inputs
 * Returns array of validation errors (empty if valid)
 *
 * Rules:
 * - stockPercentage: 0-100 (warn if <20 or >95)
 * - retirementAge: 50-80
 * - strategy must be 'fixed', 'glide_path', or 'custom' (if provided)
 * - customAllocations: each value 0-100, must sum to 100
 */
function validateAssetAllocation(assetAllocation?: AssetAllocation): string[] {
  const errors: string[] = [];
  if (!assetAllocation) return errors;

  // Validate strategy
  if (assetAllocation.strategy &&
      !['fixed', 'glide_path', 'custom'].includes(assetAllocation.strategy)) {
    errors.push("assetAllocation.strategy must be 'fixed', 'glide_path', or 'custom'");
  }

  // Validate stockPercentage
  if (assetAllocation.stockPercentage !== undefined) {
    const pct = assetAllocation.stockPercentage;
    if (pct < 0 || pct > 100) {
      errors.push('assetAllocation.stockPercentage must be between 0 and 100');
    }
  }

  // Validate customAllocations
  if (assetAllocation.customAllocations) {
    const allocs = assetAllocation.customAllocations;
    const entries = [
      { name: 'usStocks', value: allocs.usStocks },
      { name: 'internationalStocks', value: allocs.internationalStocks },
      { name: 'bonds', value: allocs.bonds },
      { name: 'cash', value: allocs.cash },
      { name: 'leveragedSpy', value: allocs.leveragedSpy },
    ];

    // Validate each field is within range
    for (const { name, value } of entries) {
      if (value !== undefined && (value < 0 || value > 100)) {
        errors.push(`assetAllocation.customAllocations.${name} must be between 0 and 100`);
      }
    }

    // Validate sum equals 100
    const sum = entries.reduce((acc, { value }) => acc + (value ?? 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      errors.push(`assetAllocation.customAllocations must sum to 100 (got ${sum.toFixed(2)})`);
    }
  }

  // If strategy is 'custom', customAllocations is required
  if (assetAllocation.strategy === 'custom' && !assetAllocation.customAllocations) {
    errors.push("assetAllocation.customAllocations is required when strategy is 'custom'");
  }

  // Validate retirementAge
  if (assetAllocation.retirementAge !== undefined) {
    const age = assetAllocation.retirementAge;
    if (age < 50 || age > 80) {
      errors.push('assetAllocation.retirementAge must be between 50 and 80');
    }
  }

  return errors;
}

/**
 * Resolve asset allocation to a stock ratio (0-1)
 * Handles fixed, glide_path, and custom strategies
 *
 * For 'custom' strategy, returns 0 since the adapter uses customAllocations directly.
 *
 * @param assetAllocation - User-provided allocation config
 * @param currentAge - User's current age (for glide path)
 * @returns Stock ratio (0-1)
 */
function resolveStockRatio(assetAllocation: AssetAllocation | undefined, currentAge: number): number {
  // Default: 70% stocks
  if (!assetAllocation) {
    return 0.70;
  }

  const strategy = assetAllocation.strategy || 'fixed';

  if (strategy === 'glide_path') {
    const retirementAge = assetAllocation.retirementAge || 65;
    return calculateGlidePathAllocation(currentAge, retirementAge);
  }

  // Custom strategy: stockRatio is ignored, adapter uses customAllocations directly
  // Return 0 as a sentinel value (adapter checks for customAllocations first)
  if (strategy === 'custom' && assetAllocation.customAllocations) {
    // Calculate effective stock ratio for logging/display purposes
    const ca = assetAllocation.customAllocations;
    const stockPct = (ca.usStocks || 0) + (ca.internationalStocks || 0);
    return stockPct / 100;
  }

  // Fixed strategy
  if (assetAllocation.stockPercentage !== undefined) {
    return assetAllocation.stockPercentage / 100;
  }

  // Default for fixed without explicit percentage
  return 0.70;
}

/**
 * Validate event module inputs
 * Returns array of validation errors (empty if valid)
 */
function validateModuleInputs(params: RunSimulationParams, horizonMonths: number): string[] {
  const errors: string[] = [];

  // Income change validation
  if (params.incomeChange) {
    const ic = params.incomeChange;
    if (ic.monthOffset < 0) {
      errors.push('incomeChange.monthOffset must be >= 0');
    }
    if (ic.monthOffset >= horizonMonths) {
      errors.push(`incomeChange.monthOffset must be < horizon (${horizonMonths})`);
    }
    if (ic.newAnnualIncome < 0) {
      errors.push('incomeChange.newAnnualIncome must be >= 0');
    }
    // durationMonths: 0 or undefined both mean "permanent" - only error on negative
    if (ic.durationMonths !== undefined && ic.durationMonths < 0) {
      errors.push('incomeChange.durationMonths must be >= 0 (use 0 or omit for permanent changes)');
    }
  }

  // Spending change validation
  if (params.spendingChange) {
    const sc = params.spendingChange;
    if (sc.monthOffset < 0) {
      errors.push('spendingChange.monthOffset must be >= 0');
    }
    if (sc.monthOffset >= horizonMonths) {
      errors.push(`spendingChange.monthOffset must be < horizon (${horizonMonths})`);
    }
    if (sc.newAnnualSpending < 0) {
      errors.push('spendingChange.newAnnualSpending must be >= 0');
    }
  }

  // One-time events validation
  if (params.oneTimeEvents) {
    params.oneTimeEvents.forEach((ote, i) => {
      if (ote.monthOffset < 0) {
        errors.push(`oneTimeEvents[${i}].monthOffset must be >= 0`);
      }
      if (ote.amount <= 0) {
        errors.push(`oneTimeEvents[${i}].amount must be > 0`);
      }
      if (!['income', 'expense'].includes(ote.type)) {
        errors.push(`oneTimeEvents[${i}].type must be 'income' or 'expense'`);
      }
      if (!ote.description || ote.description.trim() === '') {
        errors.push(`oneTimeEvents[${i}].description is required`);
      }
      if (ote.recurring) {
        if (ote.recurring.count < 1) {
          errors.push(`oneTimeEvents[${i}].recurring.count must be >= 1 (or omit recurring entirely for single one-time events)`);
        }
        // Only validate intervalMonths if count > 1 and it's provided
        // (interval is meaningless for single occurrence, defaults to 1 if missing)
        if (ote.recurring.count > 1 && ote.recurring.intervalMonths !== undefined && ote.recurring.intervalMonths < 1) {
          errors.push(`oneTimeEvents[${i}].recurring.intervalMonths must be >= 1`);
        }
      }
    });
  }

  return errors;
}

/**
 * Validate healthcare configuration
 * Returns array of validation errors (empty if valid)
 */
function validateHealthcare(params: RunSimulationParams): string[] {
  const errors: string[] = [];
  if (!params.healthcare) return errors;

  const { preMedicare, postMedicare, inflationRate } = params.healthcare;

  if (preMedicare) {
    if (typeof preMedicare.monthlyPremium !== 'number' || preMedicare.monthlyPremium < 0) {
      errors.push('healthcare.preMedicare.monthlyPremium must be a non-negative number');
    }
    if (!['employer', 'aca', 'cobra', 'spouse', 'none'].includes(preMedicare.source)) {
      errors.push('healthcare.preMedicare.source must be employer, aca, cobra, spouse, or none');
    }
    if (preMedicare.annualDeductible !== undefined && preMedicare.annualDeductible < 0) {
      errors.push('healthcare.preMedicare.annualDeductible must be non-negative');
    }
    if (preMedicare.outOfPocketMax !== undefined && preMedicare.outOfPocketMax < 0) {
      errors.push('healthcare.preMedicare.outOfPocketMax must be non-negative');
    }
  }

  if (postMedicare) {
    if (typeof postMedicare.monthlyPremium !== 'number' || postMedicare.monthlyPremium < 0) {
      errors.push('healthcare.postMedicare.monthlyPremium must be a non-negative number');
    }
    if (!['medigap', 'advantage', 'none'].includes(postMedicare.supplementType)) {
      errors.push('healthcare.postMedicare.supplementType must be medigap, advantage, or none');
    }
  }

  if (inflationRate !== undefined && (inflationRate < 0 || inflationRate > 0.20)) {
    errors.push('healthcare.inflationRate must be between 0 and 0.20 (0-20%)');
  }

  return errors;
}

/**
 * Validate concentration risk inputs
 * Returns array of validation errors (empty if valid)
 */
function validateConcentration(params: RunSimulationParams): string[] {
  const errors: string[] = [];

  if (params.concentration) {
    const pct = params.concentration.concentratedPct;
    if (typeof pct !== 'number' || pct < 0 || pct > 100) {
      errors.push('concentration.concentratedPct must be a number between 0 and 100');
    }

    // v6b: Validate instantLossPct
    const loss = params.concentration.instantLossPct;
    if (loss !== undefined && (typeof loss !== 'number' || loss < 0 || loss > 100)) {
      errors.push('concentration.instantLossPct must be a number between 0 and 100');
    }

    // Logical validation: can't have instant loss without concentration
    if (loss !== undefined && loss > 0 && (!pct || pct <= 0)) {
      errors.push('concentration.instantLossPct requires concentration.concentratedPct > 0');
    }
  }

  return errors;
}

/**
 * Validate contributions configuration
 * Returns array of validation errors (empty if valid)
 */
function validateContributions(params: RunSimulationParams): string[] {
  const errors: string[] = [];
  if (!params.contributions) return errors;

  const { employeeContribution, employerMatch } = params.contributions;

  if (employeeContribution) {
    const pct = employeeContribution.percentageOfSalary;
    if (typeof pct !== 'number' || pct < 0 || pct > 0.75) {
      errors.push('contributions.employeeContribution.percentageOfSalary must be 0-0.75 (0-75%)');
    }
    const validTargets = ['tax_deferred', 'roth', 'taxable'];
    if (!validTargets.includes(employeeContribution.targetAccount)) {
      errors.push('contributions.employeeContribution.targetAccount must be tax_deferred, roth, or taxable');
    }
  }

  if (employerMatch) {
    if (typeof employerMatch.matchUpToPercentage !== 'number' ||
        employerMatch.matchUpToPercentage < 0 || employerMatch.matchUpToPercentage > 0.10) {
      errors.push('contributions.employerMatch.matchUpToPercentage must be 0-0.10 (0-10%)');
    }
    if (typeof employerMatch.matchRate !== 'number' ||
        employerMatch.matchRate < 0 || employerMatch.matchRate > 1.0) {
      errors.push('contributions.employerMatch.matchRate must be 0-1.0 (0-100%)');
    }
    // CRITICAL: Employer match requires employee contribution
    if (!employeeContribution) {
      errors.push('contributions.employerMatch requires contributions.employeeContribution');
    }
    // CRITICAL: Employer match only valid for retirement accounts
    if (employeeContribution && employeeContribution.targetAccount === 'taxable') {
      errors.push('contributions.employerMatch requires targetAccount = tax_deferred or roth (not taxable)');
    }
  }

  return errors;
}

/**
 * Validate Social Security configuration
 * Returns array of validation errors (empty if valid)
 * @param params - Simulation parameters
 * @param effectiveHorizon - Computed horizon in months (accounts for maxAge)
 */
function validateSocialSecurity(params: RunSimulationParams, effectiveHorizon: number): string[] {
  const errors: string[] = [];
  if (!params.socialSecurity) return errors;

  const { claimingAge, monthlyBenefit } = params.socialSecurity;
  const horizonMonths = effectiveHorizon;

  if (claimingAge < 62 || claimingAge > 70) {
    errors.push('socialSecurity.claimingAge must be 62-70');
  }
  if (monthlyBenefit < 0) {
    errors.push('socialSecurity.monthlyBenefit must be >= 0');
  }

  // Check if SS will ever fire within horizon
  // Allow claimingAge < currentAge (already claiming) - monthOffset will be clamped to 0
  if (params.currentAge) {
    const monthsUntilClaiming = Math.max(0, (claimingAge - params.currentAge) * 12);
    const horizonEndAge = params.currentAge + Math.floor(horizonMonths / 12);
    if (monthsUntilClaiming >= horizonMonths) {
      errors.push(`socialSecurity.claimingAge ${claimingAge} is beyond simulation horizon (ends at age ${horizonEndAge}). Set maxAge >= ${claimingAge + 1} to include SS.`);
    }
  }

  return errors;
}

/**
 * Validate withdrawal strategy configuration
 * Returns array of validation errors (empty if valid)
 */
function validateWithdrawalStrategy(params: RunSimulationParams): string[] {
  const errors: string[] = [];
  if (!params.withdrawalStrategy) return errors;

  const validStrategies = ['tax_efficient', 'pro_rata', 'roth_first'];
  if (!validStrategies.includes(params.withdrawalStrategy)) {
    errors.push(`withdrawalStrategy must be one of: ${validStrategies.join(', ')}`);
  }

  return errors;
}

/**
 * Map MCP withdrawal strategy to WASM withdrawal strategy enum
 * WASM expects: TAX_EFFICIENT, PROPORTIONAL, ROTH_FIRST
 */
function mapWithdrawalStrategy(strategy: WithdrawalStrategy | undefined): string {
  switch (strategy) {
    case 'pro_rata':
      return 'PROPORTIONAL';
    case 'roth_first':
      return 'ROTH_FIRST';
    case 'tax_efficient':
    default:
      return 'TAX_EFFICIENT';
  }
}

/**
 * Validate income streams configuration
 * Returns array of validation errors (empty if valid)
 */
function validateIncomeStreams(params: RunSimulationParams): string[] {
  const errors: string[] = [];
  if (!params.incomeStreams) return errors;

  const horizonMonths = params.horizonMonths || 360;

  for (let i = 0; i < params.incomeStreams.length; i++) {
    const stream = params.incomeStreams[i];

    if (stream.annualAmount < 0) {
      errors.push(`incomeStreams[${i}].annualAmount must be >= 0`);
    }
    if (!stream.description || stream.description.trim() === '') {
      errors.push(`incomeStreams[${i}].description is required`);
    }
    if (stream.startMonthOffset !== undefined && stream.startMonthOffset < 0) {
      errors.push(`incomeStreams[${i}].startMonthOffset must be >= 0`);
    }
    if (stream.endMonthOffset !== undefined) {
      if (stream.endMonthOffset < 0) {
        errors.push(`incomeStreams[${i}].endMonthOffset must be >= 0`);
      }
      if (stream.startMonthOffset !== undefined && stream.endMonthOffset <= stream.startMonthOffset) {
        errors.push(`incomeStreams[${i}].endMonthOffset must be > startMonthOffset`);
      }
    }
  }

  return errors;
}

/**
 * Validate Roth conversions configuration
 * Returns array of validation errors (empty if valid)
 * @param params - Simulation parameters
 * @param effectiveHorizon - Computed horizon in months (accounts for maxAge)
 */
function validateRothConversions(params: RunSimulationParams, effectiveHorizon: number): string[] {
  const errors: string[] = [];
  if (!params.rothConversions) return errors;

  const horizonMonths = effectiveHorizon;
  const horizonYears = Math.floor(horizonMonths / 12);

  for (let i = 0; i < params.rothConversions.length; i++) {
    const conv = params.rothConversions[i];
    if (conv.yearOffset < 0) {
      errors.push(`rothConversions[${i}].yearOffset must be >= 0`);
    }
    if (conv.yearOffset >= horizonYears) {
      errors.push(`rothConversions[${i}].yearOffset ${conv.yearOffset} is beyond simulation horizon`);
    }
    if (conv.amount <= 0) {
      errors.push(`rothConversions[${i}].amount must be > 0`);
    }
  }

  return errors;
}

/**
 * Validate return assumptions inputs
 * Returns array of validation errors (empty if valid)
 *
 * Rules:
 * - Each value must be between 0 and 0.30 (0-30%)
 */
function validateReturnAssumptions(params: RunSimulationParams): string[] {
  const errors: string[] = [];
  if (!params.returnAssumptions) return errors;

  const ra = params.returnAssumptions;
  if (ra.stockReturn !== undefined && (ra.stockReturn < 0 || ra.stockReturn > 0.30)) {
    errors.push('returnAssumptions.stockReturn must be between 0 and 0.30 (0-30%)');
  }
  if (ra.bondReturn !== undefined && (ra.bondReturn < 0 || ra.bondReturn > 0.30)) {
    errors.push('returnAssumptions.bondReturn must be between 0 and 0.30 (0-30%)');
  }
  if (ra.inflationRate !== undefined && (ra.inflationRate < 0 || ra.inflationRate > 0.30)) {
    errors.push('returnAssumptions.inflationRate must be between 0 and 0.30 (0-30%)');
  }

  return errors;
}

// =============================================================================
// Phase Detection (v1.5)
// =============================================================================

/**
 * Compute phase info from annual snapshots
 *
 * Phase detection uses net flow (income - spending) to classify:
 * - Accumulation: >= 70% of years have positive net flow
 * - Transition: 30-70% of years have positive net flow
 * - Decumulation: <= 30% of years have positive net flow
 *
 * Also detects phase marker (first year when decumulation starts).
 */
function computePhaseInfo(annualSnapshots?: AnnualSnapshot[]): PhaseInfo {
  if (!annualSnapshots || annualSnapshots.length === 0) {
    return { accumulationFraction: 0.5, cashFlowMode: 'mixed', phase: 'transition' };
  }

  let accumulatingYears = 0;
  let phaseMarkerYear = -1;
  let wasAccumulating = true;

  for (const snap of annualSnapshots) {
    // Use totalIncome/totalExpenses if available, otherwise contributions/withdrawals
    const income = (snap as any).totalIncome ?? snap.contributions ?? 0;
    const expenses = (snap as any).totalExpenses ?? snap.withdrawals ?? 0;
    const isAccumulating = income >= expenses;

    if (isAccumulating) accumulatingYears++;

    // Track first transition from positive to negative cash flow
    if (wasAccumulating && !isAccumulating && phaseMarkerYear < 0) {
      phaseMarkerYear = snap.year;
    }
    wasAccumulating = isAccumulating;
  }

  const accumulationFraction = accumulatingYears / annualSnapshots.length;

  // Determine cash flow mode based on fraction of years with positive net flow
  let cashFlowMode: 'netPositive' | 'mixed' | 'netNegative';
  let phase: 'accumulation' | 'transition' | 'decumulation'; // deprecated, kept for compat
  if (accumulationFraction >= 0.7) {
    cashFlowMode = 'netPositive';
    phase = 'accumulation';
  } else if (accumulationFraction <= 0.3) {
    cashFlowMode = 'netNegative';
    phase = 'decumulation';
  } else {
    cashFlowMode = 'mixed';
    phase = 'transition';
  }

  const startYear = annualSnapshots[0]?.year ?? 0;
  return {
    accumulationFraction,
    cashFlowMode,
    phase, // deprecated but kept for backward compatibility
    phaseMarkerMonth: phaseMarkerYear > 0 ? (phaseMarkerYear - startYear) * 12 : undefined,
  };
}

// =============================================================================
// Plan Duration Computation (Widget v2)
// =============================================================================

/**
 * Compute plan duration showing when plan stops working (as ages)
 *
 * Plan Duration is the PRIMARY output for Widget v2:
 * - mostPathsAge: when ~50% of paths reach constraint
 * - earlierStressAge: when 10% of paths reach constraint
 * - laterOutcomesAge: when 25% of paths reach constraint
 * - horizonAge: end of simulation
 * - horizonSaturated: true if no constraint observed within horizon
 */
function computePlanDuration(
  mc: SimulationPacketResult['mc'],
  currentAge: number,
  horizonMonths: number
): PlanDuration {
  const horizonYears = Math.floor(horizonMonths / 12);
  const horizonAge = currentAge + horizonYears;

  // IMPORTANT: runwayP10/P50/P75 are CONDITIONAL on breach - they only include paths that breached.
  // If everBreachProbability < 50%, then runwayP50 does NOT represent "when most paths fail"
  // because most paths don't fail at all.
  //
  // Example: If everBreachProbability = 21%, then:
  //   - 79% of paths never breach (runway = horizon)
  //   - runwayP50 = median among the 21% that did breach (misleading if used directly)
  //
  // To get unconditional percentiles, we need to account for non-breaching paths.

  const everBreachProbability = mc?.everBreachProbability ?? 0;

  // If fewer than 50% of paths breach, the plan is fundamentally sustainable
  // The conditional runway stats are only meaningful for tail-risk analysis
  const horizonSaturated = everBreachProbability < 0.5;

  if (horizonSaturated) {
    // Most paths succeed - plan is sustainable through horizon
    // Report horizon age for all metrics to indicate "no constraint reached"
    return {
      mostPathsAge: horizonAge,
      earlierStressAge: horizonAge,
      laterOutcomesAge: horizonAge,
      horizonAge,
      horizonSaturated: true,
      horizonSaturatedLabel: 'Plan sustains through horizon',
    };
  }

  // More than 50% of paths breach - runway percentiles are meaningful
  // Get runway percentiles (in months) - these are now truly representative
  const runwayP10 = mc?.runwayP10 ?? horizonMonths;
  const runwayP50 = mc?.runwayP50 ?? horizonMonths;
  const runwayP75 = mc?.runwayP75 ?? mc?.runwayP90 ?? horizonMonths;

  // Convert to ages
  const earlierStressAge = currentAge + Math.floor(runwayP10 / 12);
  const mostPathsAge = currentAge + Math.floor(runwayP50 / 12);
  const laterOutcomesAge = currentAge + Math.floor(runwayP75 / 12);

  return {
    mostPathsAge,
    earlierStressAge,
    laterOutcomesAge,
    horizonAge,
    horizonSaturated: false,
    horizonSaturatedLabel: 'Some paths depleted before horizon',
  };
}

// =============================================================================
// Schedule Extraction (Widget v2)
// =============================================================================

/**
 * Extract scheduled events from simulation parameters
 *
 * Creates a timeline of events for the scenario section:
 * - Income changes (retirement, job change, sabbatical)
 * - Spending changes
 * - One-time events
 * - Social Security
 * - Roth conversions
 */
function extractSchedule(params: RunSimulationParams): SimulationSchedule {
  const currentAge = params.currentAge;
  const scheduledEvents: ScheduledEvent[] = [];

  // Helper to convert month offset to age
  const monthToAge = (monthOffset: number) => currentAge + Math.floor(monthOffset / 12);

  // Income change (retirement, job change, sabbatical)
  if (params.incomeChange) {
    const ic = params.incomeChange;
    const eventAge = monthToAge(ic.monthOffset);
    const isRetirement = ic.newAnnualIncome === 0;
    const isSabbatical = ic.durationMonths !== undefined && ic.newAnnualIncome === 0;

    scheduledEvents.push({
      age: eventAge,
      type: 'income',
      change: isRetirement ? '$0' : `$${(ic.newAnnualIncome / 1000).toFixed(0)}k/yr`,
      label: ic.description || (isRetirement ? 'Retirement' : (isSabbatical ? 'Sabbatical' : 'Income change')),
      icon: '📅',
    });

    // If sabbatical has duration, add return event (only if within horizon)
    if (isSabbatical && ic.durationMonths) {
      const returnAge = monthToAge(ic.monthOffset + ic.durationMonths);
      const horizonMonths = params.horizonMonths || 360;
      const horizonAge = currentAge + Math.floor(horizonMonths / 12);

      // Only add return event if within horizon (silently omit otherwise)
      // This prevents "Age 143 → return to work" when sabbatical duration exceeds horizon
      if (returnAge <= horizonAge) {
        scheduledEvents.push({
          age: returnAge,
          type: 'income',
          change: `$0 → $${(params.expectedIncome / 1000).toFixed(0)}k/yr`,
          label: 'Income resumes',
          icon: '📅',
        });
      }
    }
  }

  // Spending change
  if (params.spendingChange) {
    const sc = params.spendingChange;
    scheduledEvents.push({
      age: monthToAge(sc.monthOffset),
      type: 'spending',
      change: `$${(sc.newAnnualSpending / 1000).toFixed(0)}k/yr`,
      label: sc.description || 'Spending change',
      icon: '📅',
    });
  }

  // One-time events
  if (params.oneTimeEvents) {
    for (const ote of params.oneTimeEvents) {
      let changeDisplay: string;
      if (ote.recurring && ote.recurring.count > 1) {
        // Recurring event: show frequency and duration
        const amountK = (ote.amount / 1000).toFixed(ote.amount >= 1000 ? 0 : 1);
        // Default intervalMonths to 1 (monthly) if not specified
        const interval = ote.recurring.intervalMonths ?? 1;
        const freq = interval === 12 ? '/yr' : '/mo';
        changeDisplay = `$${amountK}k${freq} × ${ote.recurring.count}`;
      } else {
        // Single event
        changeDisplay = `$${(ote.amount / 1000).toFixed(0)}k`;
      }
      scheduledEvents.push({
        age: monthToAge(ote.monthOffset),
        type: ote.type === 'income' ? 'income_event' : 'expense',
        change: changeDisplay,
        label: ote.description,
        icon: ote.type === 'income' ? '💰' : '💸',
      });
    }
  }

  // Social Security
  if (params.socialSecurity) {
    scheduledEvents.push({
      age: params.socialSecurity.claimingAge,
      type: 'social_security',
      change: `+$${(params.socialSecurity.monthlyBenefit * 12 / 1000).toFixed(0)}k/yr`,
      label: 'Social Security',
      icon: '🏛️',
    });
  }

  // Roth conversions
  if (params.rothConversions) {
    for (const rc of params.rothConversions) {
      const rcAge = currentAge + rc.yearOffset;
      scheduledEvents.push({
        age: rcAge,
        type: 'roth_conversion',
        change: `$${(rc.amount / 1000).toFixed(0)}k`,
        label: 'Roth conversion',
        icon: '🔄',
      });
    }
  }

  // Income streams
  if (params.incomeStreams) {
    for (const stream of params.incomeStreams) {
      const startAge = monthToAge(stream.startMonthOffset || 0);
      scheduledEvents.push({
        age: startAge,
        type: 'income',
        change: `+$${(stream.annualAmount / 1000).toFixed(0)}k/yr`,
        label: stream.description,
        icon: '💰',
      });
      if (stream.endMonthOffset !== undefined) {
        scheduledEvents.push({
          age: monthToAge(stream.endMonthOffset),
          type: 'income',
          change: `$0`,
          label: `${stream.description} ends`,
          icon: '💰',
        });
      }
    }
  }

  // Sort by age
  scheduledEvents.sort((a, b) => a.age - b.age);

  return {
    startingPoint: {
      age: currentAge,
      assets: params.investableAssets,
      income: params.expectedIncome,
      spending: params.annualSpending,
    },
    scheduledEvents,
  };
}

/**
 * Compute flexibility curve for decumulation phase
 *
 * Runs multiple simulations with increasing spending levels to show
 * how much extra spending can be sustained at different runway levels.
 *
 * IMPORTANT: Extra spend applies only during decumulation phase,
 * not globally. Uses spendingChange event to implement this.
 *
 * Only called when:
 * - Phase is decumulation
 * - Baseline runway is near saturation (>= 90% of horizon)
 */
async function computeFlexibilityCurve(
  baseParams: RunSimulationParams,
  baselineRunwayP50: number,
  phaseInfo: PhaseInfo,
  context: SimulationContext
): Promise<FlexibilityCurvePoint[]> {
  const horizonMonths = baseParams.horizonMonths || 360;

  // Only compute if runway is near saturation
  if (baselineRunwayP50 < horizonMonths * 0.9) return [];

  const spendLevels = [0, 10000, 20000, 30000, 50000, 75000, 100000];
  const curvePoints: FlexibilityCurvePoint[] = [];

  // Determine when decumulation starts
  const decumulationStartMonth = phaseInfo?.phaseMarkerMonth || 0;

  for (const extraSpend of spendLevels) {
    // For baseline (extraSpend = 0), just use the known runway
    if (extraSpend === 0) {
      curvePoints.push({
        extraAnnualSpending: 0,
        runwayP50Months: baselineRunwayP50,
      });
      continue;
    }

    // Build sweep params with increased spending
    const sweepParams: RunSimulationParams = {
      ...baseParams,
      // Use reduced MC paths for sweep (faster)
      mcPaths: 50,
      // Don't include annual snapshots in sweep runs
      verbosity: 'summary',
    };

    // Apply extra spend at decumulation start (or globally if already decumulating)
    if (decumulationStartMonth > 0) {
      // Phase change mid-simulation: use spendingChange
      sweepParams.spendingChange = {
        monthOffset: decumulationStartMonth,
        newAnnualSpending: baseParams.annualSpending + extraSpend,
        description: `Flexibility sweep +$${Math.round(extraSpend / 1000)}k`,
      };
    } else {
      // Already in decumulation: increase base spending
      sweepParams.annualSpending = baseParams.annualSpending + extraSpend;
    }

    try {
      const sweepResult = await runSingleSimulation(sweepParams, context);
      const runway = sweepResult.mc?.runwayP50 ?? horizonMonths;

      curvePoints.push({
        extraAnnualSpending: extraSpend,
        runwayP50Months: runway,
      });

      // Stop if runway drops below 5 years (60 months)
      if (runway < 60) break;
    } catch {
      // If sweep fails, stop the curve here
      break;
    }
  }

  return curvePoints;
}

/**
 * Limit annual snapshots to displayable subset and normalize values.
 * Keep snapshots for ages displayed in trajectory (5-year intervals + milestones).
 * Floor negative balances to 0 for consistency with chart display.
 * This matches the widget's sampling logic in renderTrajectory().
 */
function limitAnnualSnapshots(
  snapshots: any[] | undefined,
  currentAge?: number
): any[] | undefined {
  if (!snapshots || snapshots.length === 0) return undefined;

  const startAge = currentAge ?? 35;
  const horizonYears = snapshots.length;
  const endAge = startAge + horizonYears - 1;

  // Match widget sampling: 5-year intervals (10-year for >50yr horizons)
  const interval = horizonYears > 50 ? 10 : 5;

  const keepAges = new Set<number>();
  // Always include start and end
  keepAges.add(startAge);
  keepAges.add(endAge);
  // Include interval ages
  const firstAge = Math.ceil(startAge / interval) * interval;
  for (let a = firstAge; a <= endAge; a += interval) {
    keepAges.add(a);
  }

  // Floor negative values to 0 for consistency with chart display
  // Bankrupt paths can't go further negative - runway tells WHEN it happened
  const floor0 = (v: number | undefined | null): number | undefined =>
    v == null ? undefined : Math.max(0, v);

  // Filter to displayed ages and normalize balance fields
  const filtered = snapshots
    .filter((snap) => {
      const age = snap.age ?? (startAge + (snap.year ?? 0));
      return keepAges.has(age);
    })
    .map((snap) => ({
      ...snap,
      // Floor balance fields to 0 for consistency with chart
      startBalance: floor0(snap.startBalance),
      endBalance: floor0(snap.endBalance),
    }));

  return filtered.length > 0 ? filtered : undefined;
}

// generateRunId removed — unnecessary metadata per OpenAI guidelines

/**
 * Simulation service URL - defaults to local service
 * Override with SIMULATION_SERVICE_URL environment variable
 */
const SIMULATION_SERVICE_URL =
  process.env.SIMULATION_SERVICE_URL || 'http://localhost:3002';

/** Timeout for simulation service calls (ms) */
const FETCH_TIMEOUT_MS = 120000; // 2 minutes - MC simulations with 100+ paths can take time

/**
 * Internal context for simulation execution
 * Carries resolved config through helper functions
 */
interface SimulationContext {
  taxMode: TaxMode;
  taxConfig: ResolvedTaxConfig | null;
}

/**
 * Execute a single simulation run
 * This is the core simulation logic extracted for reuse in comparison mode
 *
 * @param params - Bronze-tier simulation parameters
 * @param context - Resolved tax configuration
 * @returns Simulation packet with MC results
 */
async function runSingleSimulation(
  params: RunSimulationParams,
  context: SimulationContext
): Promise<SimulationPacketResult> {
  const { taxMode, taxConfig } = context;

  // Build PacketBuildRequest from Bronze params
  const packetBuildRequest = {
    seed: params.seed,
    startYear: params.startYear,
    horizon: {
      startMonth: 0,
      endMonth: params.horizonMonths || 360,
    },
    mcPaths: params.mcPaths || 100, // Default 100 paths for good percentile estimates
    dataTier: 'bronze',
    // Verbosity and replay params
    // Default to 'annual' to always include illustrative calculation data
    verbosity: params.verbosity || 'annual',
    pathSeed: params.pathSeed,
    // Tax configuration (if enabled)
    taxConfig: taxConfig ? {
      enabled: true,
      effectiveRate: taxConfig.effectiveRate,
      capitalGainsRate: taxConfig.capitalGainsRate,
    } : undefined,
    confirmedChanges: [
      {
        draftChangeId: `dc-investable-${params.seed}`,
        fieldPath: ['profile', 'investableAssets'],
        newValue: params.investableAssets,
        scope: 'baseline_candidate',
      },
      {
        draftChangeId: `dc-spending-${params.seed}`,
        fieldPath: ['profile', 'annualSpending'],
        newValue: params.annualSpending,
        scope: 'baseline_candidate',
      },
      {
        draftChangeId: `dc-age-${params.seed}`,
        fieldPath: ['profile', 'currentAge'],
        newValue: params.currentAge,
        scope: 'baseline_candidate',
      },
      {
        draftChangeId: `dc-income-${params.seed}`,
        fieldPath: ['profile', 'expectedIncome'],
        newValue: params.expectedIncome,
        scope: 'baseline_candidate',
      },
    ],
    // Event Modules (v4)
    incomeChange: params.incomeChange,
    spendingChange: params.spendingChange,
    oneTimeEvents: params.oneTimeEvents,
    // Account Buckets (v5)
    accountBuckets: params.accountBuckets,
    // Asset Allocation (v10) - resolved stock ratio
    assetAllocation: params.assetAllocation,
    // Resolved stock ratio for adapter (0-1)
    stockRatio: resolveStockRatio(params.assetAllocation, params.currentAge),
    // Concentration Risk (v6a/v6b) - includes concentrationOverrideValue if set
    concentration: params.concentration,
    // Healthcare (v7)
    healthcare: params.healthcare,
    // Contributions (v8)
    contributions: params.contributions,
    // Social Security (v9)
    socialSecurity: params.socialSecurity,
    // Roth Conversions (v9)
    rothConversions: params.rothConversions,
    // Withdrawal Strategy (v11)
    withdrawalStrategy: mapWithdrawalStrategy(params.withdrawalStrategy),
    // Cash Reserve (v11)
    cashReserve: params.cashReserve,
    // Rebalancing (v11)
    rebalancing: params.rebalancing,
    // Debt (v11)
    debt: params.debt,
    // Income Streams (v12)
    incomeStreams: params.incomeStreams,
    // Return Assumptions (v13)
    returnAssumptions: params.returnAssumptions,
  };

  // Call simulation service with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${SIMULATION_SERVICE_URL}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packetBuildRequest }),
      signal: controller.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    // Handle abort/timeout specifically
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new SimulationError(
        ErrorCode.SERVICE_TIMEOUT,
        `Simulation service timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        { timeoutMs: FETCH_TIMEOUT_MS }
      );
    }
    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails: string;
    let errorCode: string | undefined;

    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = errorJson.error || errorJson.message || errorText;
      errorCode = errorJson.code;
    } catch {
      errorDetails = errorText;
    }

    throw new SimulationError(
      (errorCode as any) || ErrorCode.SERVICE_UNAVAILABLE,
      `Simulation service error (${response.status}): ${errorDetails}`,
      { statusCode: response.status }
    );
  }

  const result = await response.json() as any;

  // Check for service-level errors
  if (!result.success) {
    throw new SimulationError(
      result.code || ErrorCode.SIMULATION_ERROR,
      result.error || 'Unknown simulation error',
      result.details || {}
    );
  }

  // Transform service response to MCP result format
  const mcResultsRaw = extractMCResults(result);

  // Enrich MC results with runway ages (more intuitive than months)
  const mcResults = mcResultsRaw ? {
    ...mcResultsRaw,
    runwayP10Age: mcResultsRaw.runwayP10Months !== undefined
      ? Math.floor(params.currentAge + mcResultsRaw.runwayP10Months / 12)
      : undefined,
    runwayP50Age: mcResultsRaw.runwayP50Months !== undefined
      ? Math.floor(params.currentAge + mcResultsRaw.runwayP50Months / 12)
      : undefined,
    runwayP75Age: mcResultsRaw.runwayP75Months !== undefined
      ? Math.floor(params.currentAge + mcResultsRaw.runwayP75Months / 12)
      : undefined,
  } : undefined;

  // runId removed — unnecessary metadata per OpenAI guidelines

  // Modeling choices
  const dollarsMode: DollarsMode = 'NOMINAL';

  // Compute phase info from annual snapshots (v1.5)
  const phaseInfo = computePhaseInfo(result.annualSnapshots);

  // Compute plan duration (Widget v2) - PRIMARY output
  const effectiveHorizon = params.horizonMonths || 360;
  const planDuration = computePlanDuration(mcResults, params.currentAge, effectiveHorizon);

  // Extract schedule (Widget v2)
  const schedule = extractSchedule(params);

  // Build modeling choices array for widget display
  const modelingChoices: Array<{ category: string; description: string }> = [];

  // Add healthcare to modeling choices if provided
  if (params.healthcare) {
    const { preMedicare, postMedicare, inflationRate = 0.05 } = params.healthcare;
    if (preMedicare) {
      modelingChoices.push({
        category: 'Healthcare',
        description: `Pre-Medicare: $${preMedicare.monthlyPremium}/mo (${preMedicare.source})`,
      });
    } else {
      modelingChoices.push({
        category: 'Healthcare',
        description: 'Pre-Medicare: Not specified',
      });
    }
    if (postMedicare) {
      modelingChoices.push({
        category: 'Healthcare',
        description: `Post-Medicare: $${postMedicare.monthlyPremium}/mo (${postMedicare.supplementType})`,
      });
    } else {
      modelingChoices.push({
        category: 'Healthcare',
        description: 'Post-Medicare: Not specified',
      });
    }
    modelingChoices.push({
      category: 'Healthcare',
      description: `Inflation: ${(inflationRate * 100).toFixed(1)}%/year`,
    });
  }

  // Add housing disclosure if housing-related events detected
  // Look for common housing keywords in one-time events or spending changes
  const hasHousingEvent = params.oneTimeEvents?.some(ote =>
    /home|house|down.?payment|mortgage|property/i.test(ote.description)
  ) || (params.spendingChange && /housing|mortgage|home/i.test(params.spendingChange.description || ''));

  if (hasHousingEvent) {
    modelingChoices.push({
      category: 'Housing',
      description: 'Modeled as ongoing cost, not as asset. Home value and equity not tracked.',
    });
  }

  const mcpResult: SimulationPacketResult = {
    success: true,
    dollarsMode,
    taxMode,
    taxConfig: taxConfig ?? undefined,
    mc: mcResults,
    // v1.5: Phase info for UI mode switching
    phaseInfo,
    // v2: Plan duration (PRIMARY output) - when plan stops working
    planDuration,
    // v2: Schedule for scenario display
    schedule,
    // v1.5: Net worth trajectory from engine (top-level for widget access)
    netWorthTrajectory: mcResults?.netWorthTrajectory,
    // Echo basic inputs for widget display (with computed metrics)
    inputs: {
      investableAssets: params.investableAssets,
      annualSpending: params.annualSpending,
      currentAge: params.currentAge,
      expectedIncome: params.expectedIncome,
      horizonMonths: params.horizonMonths || 360,
      // Computed savings metrics
      savingsRate: params.expectedIncome > 0
        ? (params.expectedIncome - params.annualSpending) / params.expectedIncome
        : undefined,
      annualSurplus: params.expectedIncome - params.annualSpending,
    },
    // Start year for widget calendar calculations
    startYear: params.startYear,
    // ALWAYS include exemplarPath if available (enables trace replay)
    exemplarPath: extractExemplarPath(result, mcResults),
    // Include annualSnapshots for displayed ages (5-year intervals)
    // Matches widget trajectory sampling to enable Year Inspector for all clickable rows
    annualSnapshots: limitAnnualSnapshots(result.annualSnapshots, params.currentAge),
    // Include first-month events for "show the math" in widget inspector
    // Lightweight: only first month per year, ~420 bytes compressed total
    firstMonthEvents: result.firstMonthEvents,
    // Include trace if verbosity === 'trace'
    trace: result.trace,
    // Include traceNote if trace replay failed or wasn't available
    traceNote: result.traceNote,
    // Echo event modules for widget display
    incomeChange: params.incomeChange,
    incomeStreams: params.incomeStreams,
    spendingChange: params.spendingChange,
    oneTimeEvents: params.oneTimeEvents,
    accountBuckets: params.accountBuckets,
    assetAllocation: params.assetAllocation,
    concentration: params.concentration,
    healthcare: params.healthcare,
    contributions: params.contributions,
    socialSecurity: params.socialSecurity,
    rothConversions: params.rothConversions,
    withdrawalStrategy: params.withdrawalStrategy,
    cashReserve: params.cashReserve,
    rebalancing: params.rebalancing,
    returnAssumptions: {
      stockReturn: params.returnAssumptions?.stockReturn ?? 0.07,
      bondReturn: params.returnAssumptions?.bondReturn ?? 0.03,
      inflationRate: params.returnAssumptions?.inflationRate ?? 0.025,
    },
    modelingChoices: modelingChoices.length > 0 ? modelingChoices : undefined,
    blockedOutputs: result.blockedOutputs || [],
    engineInputsHash: result.engineInputsHash,
    baseSeed: result.baseSeed,
    pathsRun: result.pathsRun,
    replayMode: result.replayMode,
    // Low path count warning - helps users understand variance in results
    varianceWarning: (result.pathsRun ?? 100) < 100
      ? `Low path count (${result.pathsRun}) - results may vary between runs`
      : undefined,
    // Audit metadata
    engineVersion: 'PFOS-E v1.9.0',
    schemaVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    taxFidelity: taxMode === 'NOT_APPLIED' ? 'none' :
                 taxMode === 'DEFAULT_ASSUMPTIONS' ? 'simplified' : 'user_declared',
  };

  return mcpResult;
}

/**
 * Handles run_simulation_packet tool invocation from ChatGPT
 *
 * @param params - Bronze-tier simulation parameters
 * @returns Simulation packet with MC results and blocked outputs
 */
export async function handleRunSimulation(
  params: RunSimulationParams
): Promise<SimulationPacketResult> {
  try {
    // Numeric safety: reject NaN/Infinity on key inputs
    if (!Number.isFinite(params.investableAssets)) {
      throw new SimulationError(
        ErrorCode.INVALID_TYPE,
        `investableAssets must be a finite number, got ${params.investableAssets}`,
        { field: 'investableAssets', value: params.investableAssets }
      );
    }
    if (!Number.isFinite(params.annualSpending)) {
      throw new SimulationError(
        ErrorCode.INVALID_TYPE,
        `annualSpending must be a finite number, got ${params.annualSpending}`,
        { field: 'annualSpending', value: params.annualSpending }
      );
    }
    if (!Number.isFinite(params.expectedIncome)) {
      throw new SimulationError(
        ErrorCode.INVALID_TYPE,
        `expectedIncome must be a finite number, got ${params.expectedIncome}`,
        { field: 'expectedIncome', value: params.expectedIncome }
      );
    }

    // Validate required parameters using structured validation
    validate.required(params.seed, 'seed');
    validate.range(params.startYear, 2000, 2100, 'startYear');
    validate.nonNegative(params.investableAssets, 'investableAssets');
    validate.positive(params.annualSpending, 'annualSpending');
    validate.range(params.currentAge, 18, 100, 'currentAge');
    // expectedIncome can be 0 for retirement scenarios
    validate.nonNegative(params.expectedIncome, 'expectedIncome');

    // Validate optional parameters if provided
    if (params.mcPaths !== undefined) {
      validate.range(params.mcPaths, 1, 10000, 'mcPaths');
    }

    // Low path count warning (logged, not an error)
    if (params.mcPaths !== undefined && params.mcPaths < 50) {
      // low mcPaths — results may vary, but not our problem to log
    }

    // Resolve age-based inputs (atAge -> monthOffset)
    if (params.incomeChange) {
      if (params.incomeChange.atAge !== undefined) {
        if (params.incomeChange.monthOffset !== undefined && params.incomeChange.monthOffset !== 0) {
          throw new SimulationError(
            ErrorCode.INVALID_RANGE,
            'incomeChange: provide either atAge or monthOffset, not both',
            { atAge: params.incomeChange.atAge, monthOffset: params.incomeChange.monthOffset }
          );
        }
        if (params.incomeChange.atAge <= params.currentAge) {
          throw new SimulationError(
            ErrorCode.INVALID_RANGE,
            `incomeChange.atAge (${params.incomeChange.atAge}) must be greater than currentAge (${params.currentAge})`,
            { atAge: params.incomeChange.atAge, currentAge: params.currentAge }
          );
        }
        params.incomeChange.monthOffset = (params.incomeChange.atAge - params.currentAge) * 12;
      }
      if (params.incomeChange.monthOffset === undefined) {
        throw new SimulationError(
          ErrorCode.MISSING_INPUT,
          'incomeChange requires either monthOffset or atAge',
          { field: 'incomeChange.monthOffset' }
        );
      }
    }

    if (params.spendingChange) {
      if (params.spendingChange.atAge !== undefined) {
        if (params.spendingChange.monthOffset !== undefined && params.spendingChange.monthOffset !== 0) {
          throw new SimulationError(
            ErrorCode.INVALID_RANGE,
            'spendingChange: provide either atAge or monthOffset, not both',
            { atAge: params.spendingChange.atAge, monthOffset: params.spendingChange.monthOffset }
          );
        }
        if (params.spendingChange.atAge <= params.currentAge) {
          throw new SimulationError(
            ErrorCode.INVALID_RANGE,
            `spendingChange.atAge (${params.spendingChange.atAge}) must be greater than currentAge (${params.currentAge})`,
            { atAge: params.spendingChange.atAge, currentAge: params.currentAge }
          );
        }
        params.spendingChange.monthOffset = (params.spendingChange.atAge - params.currentAge) * 12;
      }
      if (params.spendingChange.monthOffset === undefined) {
        throw new SimulationError(
          ErrorCode.MISSING_INPUT,
          'spendingChange requires either monthOffset or atAge',
          { field: 'spendingChange.monthOffset' }
        );
      }
    }

    if (params.oneTimeEvents) {
      for (let i = 0; i < params.oneTimeEvents.length; i++) {
        const ote = params.oneTimeEvents[i];
        if (ote.atAge !== undefined) {
          if (ote.monthOffset !== undefined && ote.monthOffset !== 0) {
            throw new SimulationError(
              ErrorCode.INVALID_RANGE,
              `oneTimeEvents[${i}]: provide either atAge or monthOffset, not both`,
              { atAge: ote.atAge, monthOffset: ote.monthOffset }
            );
          }
          if (ote.atAge <= params.currentAge) {
            throw new SimulationError(
              ErrorCode.INVALID_RANGE,
              `oneTimeEvents[${i}].atAge (${ote.atAge}) must be greater than currentAge (${params.currentAge})`,
              { atAge: ote.atAge, currentAge: params.currentAge }
            );
          }
          ote.monthOffset = (ote.atAge - params.currentAge) * 12;
        }
        if (ote.monthOffset === undefined) {
          throw new SimulationError(
            ErrorCode.MISSING_INPUT,
            `oneTimeEvents[${i}] requires either monthOffset or atAge`,
            { field: `oneTimeEvents[${i}].monthOffset` }
          );
        }
      }
    }

    // Configurable max age with sensible defaults
    // Default: 90, Max allowed: 100
    // Projections beyond 90 carry significant uncertainty
    const DEFAULT_MAX_AGE = 90;
    const ABSOLUTE_MAX_AGE = 100;
    let maxEndAge = params.maxAge ?? DEFAULT_MAX_AGE;

    // Validate and clamp maxAge
    if (maxEndAge > ABSOLUTE_MAX_AGE) {
      maxEndAge = ABSOLUTE_MAX_AGE;
    }
    if (maxEndAge < params.currentAge + 1) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `maxAge (${maxEndAge}) must be greater than currentAge (${params.currentAge})`,
        { maxAge: maxEndAge, currentAge: params.currentAge }
      );
    }

    const maxHorizonMonths = (maxEndAge - params.currentAge) * 12;

    // Default horizon to reach maxAge
    let effectiveHorizon = params.horizonMonths ?? maxHorizonMonths;

    // Cap horizon to not exceed maxAge (if user explicitly set a longer horizon)
    if (effectiveHorizon > maxHorizonMonths) {
      effectiveHorizon = maxHorizonMonths;
    }

    // Validate horizon is reasonable
    if (effectiveHorizon < 12) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Horizon too short: currentAge ${params.currentAge} with maxAge ${maxEndAge} gives ${maxHorizonMonths} months`,
        { currentAge: params.currentAge, maxEndAge }
      );
    }

    // Add caveat for extended projections beyond 90
    const extendedProjectionCaveat = maxEndAge > 90
      ? `Note: Projections beyond age 90 carry significant uncertainty due to longevity, healthcare, and economic assumptions.`
      : undefined;
    const moduleErrors = validateModuleInputs(params, effectiveHorizon);
    if (moduleErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid event module inputs: ${moduleErrors.join('; ')}`,
        { errors: moduleErrors }
      );
    }

    // Validate account buckets (if provided)
    const bucketErrors = validateAccountBuckets(params.accountBuckets);
    if (bucketErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid account buckets: ${bucketErrors.join('; ')}`,
        { errors: bucketErrors }
      );
    }

    // Validate asset allocation (if provided)
    const allocationErrors = validateAssetAllocation(params.assetAllocation);
    if (allocationErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid asset allocation: ${allocationErrors.join('; ')}`,
        { errors: allocationErrors }
      );
    }

    // Validate concentration (if provided)
    const concentrationErrors = validateConcentration(params);
    if (concentrationErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid concentration: ${concentrationErrors.join('; ')}`,
        { errors: concentrationErrors }
      );
    }

    // Validate healthcare (if provided)
    const healthcareErrors = validateHealthcare(params);
    if (healthcareErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid healthcare: ${healthcareErrors.join('; ')}`,
        { errors: healthcareErrors }
      );
    }

    // Validate contributions (if provided)
    const contributionsErrors = validateContributions(params);
    if (contributionsErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid contributions: ${contributionsErrors.join('; ')}`,
        { errors: contributionsErrors }
      );
    }

    // Validate Social Security (if provided)
    const ssErrors = validateSocialSecurity(params, effectiveHorizon);
    if (ssErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid socialSecurity: ${ssErrors.join('; ')}`,
        { errors: ssErrors }
      );
    }

    // Validate Roth conversions (if provided)
    const rothErrors = validateRothConversions(params, effectiveHorizon);
    if (rothErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid rothConversions: ${rothErrors.join('; ')}`,
        { errors: rothErrors }
      );
    }

    // Validate withdrawal strategy (if provided)
    const withdrawalErrors = validateWithdrawalStrategy(params);
    if (withdrawalErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid withdrawalStrategy: ${withdrawalErrors.join('; ')}`,
        { errors: withdrawalErrors }
      );
    }

    // Validate income streams (if provided)
    const incomeStreamErrors = validateIncomeStreams(params);
    if (incomeStreamErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid incomeStreams: ${incomeStreamErrors.join('; ')}`,
        { errors: incomeStreamErrors }
      );
    }

    // Validate return assumptions (if provided)
    const returnAssumptionErrors = validateReturnAssumptions(params);
    if (returnAssumptionErrors.length > 0) {
      throw new SimulationError(
        ErrorCode.INVALID_RANGE,
        `Invalid returnAssumptions: ${returnAssumptionErrors.join('; ')}`,
        { errors: returnAssumptionErrors }
      );
    }

    // Resolve tax assumptions (shared context for all runs)
    const { taxMode, taxConfig } = resolveTaxAssumptions(params.taxAssumptions);
    const context: SimulationContext = { taxMode, taxConfig };

    // Normalize incomeChange.durationMonths: 0 → undefined (permanent change)
    const normalizedIncomeChange = params.incomeChange
      ? {
          ...params.incomeChange,
          durationMonths: params.incomeChange.durationMonths === 0
            ? undefined
            : params.incomeChange.durationMonths,
        }
      : undefined;

    // Apply capped horizon and normalize inputs
    const cappedParams: RunSimulationParams = {
      ...params,
      horizonMonths: effectiveHorizon,
      accountBuckets: normalizeAccountBuckets(params.accountBuckets),
      incomeChange: normalizedIncomeChange,
    };

    // =========================================================================
    // v6b: Check if instant loss comparison is requested
    // =========================================================================
    const lossRequested =
      params.concentration?.instantLossPct !== undefined &&
      params.concentration.instantLossPct > 0;

    if (!lossRequested) {
      // Standard single-run path
      const result = await runSingleSimulation(cappedParams, context);

      // v1.5: Compute flexibility curve for decumulation phase with saturated runway
      if (result.phaseInfo?.phase === 'decumulation' && result.mc?.runwayP50) {
        if (result.mc.runwayP50 >= effectiveHorizon * 0.9) {
          try {
            const flexibilityCurve = await computeFlexibilityCurve(
              cappedParams,
              result.mc.runwayP50,
              result.phaseInfo,
              context
            );
            if (flexibilityCurve.length > 0) {
              result.flexibilityCurve = flexibilityCurve;
            }
          } catch (e) {
            // Flexibility curve is optional - don't fail the main simulation
            // flexibility curve failed — optional, don't break main sim
          }
        }
      }

      return result;
    }

    // =========================================================================
    // INSTANT LOSS COMPARISON MODE (v6b)
    // =========================================================================
    const { concentratedPct } = params.concentration!;
    // Type assertion: lossRequested check above guarantees instantLossPct is defined and > 0
    const instantLossPct = params.concentration!.instantLossPct!;

    // Calculate loss values
    const originalConcentratedValue = params.investableAssets * (concentratedPct / 100);
    const lossAmount = originalConcentratedValue * (instantLossPct / 100);
    const afterLossConcentratedValue = originalConcentratedValue - lossAmount;

    // Run 1: Baseline (no loss)
    const baselineResult = await runSingleSimulation(cappedParams, context);
    if (!baselineResult.success || !baselineResult.mc) {
      // If baseline fails, return the error
      return baselineResult;
    }

    // Run 2: After loss - pass concentrationOverrideValue to adapter
    // CRITICAL: We do NOT reduce investableAssets. That would rebalance all holdings.
    // Instead, we pass concentrationOverrideValue which only reduces the concentrated holding.
    const afterLossParams: RunSimulationParams = {
      ...cappedParams,
      concentration: {
        concentratedPct, // Keep same percentage for bucket distribution calculation
        instantLossPct, // Echo for display
        // NEW: Override the concentrated value directly
        concentrationOverrideValue: afterLossConcentratedValue,
      },
    };

    const afterLossResult = await runSingleSimulation(afterLossParams, context);
    if (!afterLossResult.success || !afterLossResult.mc) {
      // If after-loss fails, return that error with note
      return {
        ...afterLossResult,
        error: `After-loss simulation failed: ${afterLossResult.error}`,
      };
    }

    // Build comparison data
    const comparison: ComparisonData = {
      baseline: {
        mc: baselineResult.mc,
      },
      afterLoss: {
        mc: afterLossResult.mc,
      },
      lossParams: {
        instantLossPct,
        lossAmount,
        originalConcentratedValue,
        afterLossConcentratedValue,
      },
      note: `After-loss scenario uses reduced concentrated value ($${afterLossConcentratedValue.toFixed(0)}). ` +
        `Baseline had $${originalConcentratedValue.toFixed(0)} in concentrated holdings.`,
    };

    // Return after-loss as primary result (the "concerning scenario")
    // with comparison data attached for side-by-side display
    return {
      ...afterLossResult,
      // Clear the internal concentrationOverrideValue from echoed concentration
      concentration: {
        concentratedPct,
        instantLossPct,
      },
      comparison,
    };
  } catch (error) {
    // Convert to structured error and return
    const simError = SimulationError.fromUnknown(error, ErrorCode.SIMULATION_ERROR);
    return simError.toJSON();
  }
}

/**
 * Extract Monte Carlo results from service response
 * Handles various payload formats from WASM
 */
function extractMCResults(
  result: any
): SimulationPacketResult['mc'] | undefined {
  // Direct mc field (simulation service extracts and places here)
  if (result.mc && Object.keys(result.mc).length > 0) {
    return normalizePercentileNames(result.mc);
  }

  // Payload with mc field
  if (result.payload?.mc && Object.keys(result.payload.mc).length > 0) {
    return normalizePercentileNames(result.payload.mc);
  }

  // Payload with monteCarloResults
  if (result.payload?.monteCarloResults) {
    return normalizePercentileNames(result.payload.monteCarloResults);
  }

  // WASM returns results in planProjection.summary.portfolioStats
  const portfolioStats = result.payload?.planProjection?.summary?.portfolioStats;
  if (portfolioStats) {
    return normalizePercentileNames({
      // IMPORTANT: Use ?? not || because successRate=0 is valid (0 || 1 = 1, but 0 ?? 1 = 0)
      everBreachProbability: portfolioStats.everBreachProbability ?? (1 - (portfolioStats.successRate ?? 1)),
      finalNetWorthP5: portfolioStats.p5FinalValue,
      finalNetWorthP10: portfolioStats.p10FinalValue,
      finalNetWorthP50: portfolioStats.p50FinalValue,
      finalNetWorthP75: portfolioStats.p75FinalValue,
      finalNetWorthP90: portfolioStats.p90FinalValue,
      finalNetWorthP95: portfolioStats.p95FinalValue,
      minCashP5: portfolioStats.minCashP5,
      minCashP50: portfolioStats.minCashP50,
      minCashP95: portfolioStats.minCashP95,
      runwayP5: portfolioStats.runwayP5,
      runwayP50: portfolioStats.runwayP50,
      runwayP95: portfolioStats.runwayP95,
      // v1.5 phase-aware: net worth trajectory percentiles
      netWorthTrajectory: portfolioStats.netWorthTrajectory,
    });
  }

  // Payload itself looks like MC results
  if (result.payload?.everBreachProbability !== undefined) {
    return normalizePercentileNames(result.payload);
  }

  return undefined;
}

/**
 * Extract exemplarPath from service response
 * Checks multiple locations where WASM might place it
 */
function extractExemplarPath(
  result: any,
  mcResults: any
): SimulationPacketResult['exemplarPath'] | undefined {
  // Check direct exemplarPath field (from simulation service)
  if (result.exemplarPath) {
    return result.exemplarPath;
  }

  // Check MC results (mcExtractor may have passed it through)
  if (mcResults?.exemplarPath) {
    return mcResults.exemplarPath;
  }

  // Check result.mc directly
  if (result.mc?.exemplarPath) {
    return result.mc.exemplarPath;
  }

  // Check nested in portfolioStats
  const portfolioStats = result.payload?.planProjection?.summary?.portfolioStats;
  if (portfolioStats?.exemplarPath) {
    return portfolioStats.exemplarPath;
  }

  return undefined;
}

/**
 * Normalize percentile field names between WASM and MCP formats
 *
 * Display policy (v2):
 * - Default output: P10/P50/P75 only (planning-relevant range)
 * - P90/P95 kept internally for trace/audit but not surfaced by default
 */
function normalizePercentileNames(mc: any): SimulationPacketResult['mc'] {
  if (!mc) return undefined;

  // Floor negative values to 0 for display.
  // Rationale: Bankrupt paths stop simulating and can't go further negative.
  // The negative value is just "how short you were that month" - not meaningful to users.
  // Runway already tells WHEN bankruptcy happened; terminal wealth of 0 means "ran out."
  const floor0 = (v: number | undefined | null): number | undefined =>
    v == null ? undefined : Math.max(0, v);

  // Trajectory points: only include P10/P50/P75 (no P90/P95 - tail theater)
  const trajectory = mc.netWorthTrajectory?.map((pt: any) => ({
    // Keep non-percentile fields (monthOffset, month, age, etc.)
    ...(pt.monthOffset !== undefined ? { monthOffset: pt.monthOffset } : {}),
    ...(pt.month !== undefined ? { month: pt.month } : {}),
    ...(pt.age !== undefined ? { age: pt.age } : {}),
    // Only P10/P50/P75 - floor negatives (bankrupt paths) to 0
    p10: floor0(pt.p10) ?? 0,
    p50: floor0(pt.p50) ?? 0,
    p75: floor0(pt.p75) ?? floor0(pt.p50) ?? 0,
    // Pct paths funded (% of paths still funded at this age) - renamed from survivalRate
    ...(pt.pctPathsFunded !== undefined ? { pctPathsFunded: pt.pctPathsFunded } : {}),
    // Backward compatibility: also check old field name from WASM
    ...(pt.pctPathsFunded === undefined && pt.survivalRate !== undefined ? { pctPathsFunded: pt.survivalRate } : {}),
  }));

  // Only include constraint probability if > 0 (avoids pass/fail thinking when always 0)
  const constraintProb = mc.everBreachProbability ?? 0;

  return {
    // Renamed from everBreachProbability to avoid pass/fail framing
    // Only included when > 0 to avoid "always 0" noise
    ...(constraintProb > 0 ? { constraintProbability: constraintProb } : {}),

    // Final net worth - P10/P50/P75 only, floor negatives to 0
    finalNetWorthP10: floor0(mc.finalNetWorthP10 ?? mc.finalNetWorthP5),
    finalNetWorthP50: floor0(mc.finalNetWorthP50),
    finalNetWorthP75: floor0(mc.finalNetWorthP75),

    // Min cash - P10/P50 only (no P90) - can be negative (cash deficit)
    minCashP10: mc.minCashP10 ?? mc.minCashP5,
    minCashP50: mc.minCashP50,

    // Runway (months until constraint) - P10/P50/P75 only (no P90)
    // Field names include "Months" suffix to clarify units
    runwayP10Months: mc.runwayP10 ?? mc.runwayP5,
    runwayP50Months: mc.runwayP50,
    runwayP75Months: mc.runwayP75,
    // Backward compatibility (deprecated)
    runwayP10: mc.runwayP10 ?? mc.runwayP5,
    runwayP50: mc.runwayP50,
    runwayP75: mc.runwayP75,

    // Net worth trajectory (v1.5 phase-aware UI)
    netWorthTrajectory: trajectory,
  };
}
