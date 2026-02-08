/**
 * Bronze Adapter - TEMPORARY THROWAWAY CODE
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WARNING: This file is THROWAWAY CODE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This adapter is a temporary stopgap until Cloudflare Workers deployment
 * completes. After Workers, the TypeScript packetBuildService becomes
 * authoritative and this file should be DELETED.
 *
 * DO NOT:
 * - Add Silver/Gold tier logic here
 * - Generalize beyond Bronze tier
 * - Create abstractions or utilities
 * - Invest time in making this "cleaner"
 *
 * This creates temporary duplication that MUST NOT be extended.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @module adapter
 */

/**
 * Transform Bronze-tier params to WASM SimulationInput shape
 *
 * SimulationInput shape (from wasm/domain_types.go:478):
 * - initialAccounts: AccountHoldingsMonthEnd
 * - events: FinancialEvent[]
 * - config: StochasticModelConfig (includes randomSeed)
 * - monthsToRun: number
 * - initialAge: number
 * - startYear: number
 * - withdrawalStrategy: string
 * - goals?: Goal[]
 *
 * @param {Object} params - Bronze tier parameters
 * @returns {Object} SimulationInput for WASM
 */
export function bronzeParamsToSimulationInput(params) {
  const {
    investableAssets = 0,
    annualSpending = 0,
    currentAge = 30,
    expectedIncome = 0,
    seed,
    startYear,
    mcPaths = 1,
    horizonMonths = 360,
    taxConfig = null, // Effective rate tax configuration
    // Event Modules (v4)
    incomeChange = null,
    spendingChange = null,
    oneTimeEvents = [],
    // Account Buckets (v5)
    accountBuckets = null,
    // Asset Allocation (v10)
    stockRatio = 0.70, // Pre-resolved by MCP layer (0-1)
    assetAllocation = null, // Full config: { strategy, stockPercentage, retirementAge }
    // Concentration Risk (v6a)
    concentration = null,
    // Healthcare (v7)
    healthcare = null,
    // Contributions (v8)
    contributions = null,
    // Social Security (v9)
    socialSecurity = null,
    // Roth Conversions (v9)
    rothConversions = null,
    // Withdrawal Strategy (v11)
    withdrawalStrategy = 'TAX_EFFICIENT',
    // Cash Reserve (v11)
    cashReserve = null,
    // Rebalancing (v11)
    rebalancing = null,
    // Debt (v11)
    debt = null,
    // Income Streams (v12)
    incomeStreams = null,
  } = params;

  // Validate required params
  if (seed === undefined || seed === null) {
    throw new Error('seed is required for deterministic simulation');
  }
  if (!startYear) {
    throw new Error('startYear is required');
  }

  // Extract custom allocations if provided (v10b)
  const customAllocations = assetAllocation?.customAllocations || null;

  // Build initial accounts using user-specified buckets or Bronze tier defaults
  // Pass concentration to allocate portion to high-vol individual stock
  // Pass stockRatio to set stock/bond mix (from assetAllocation, default 0.70)
  // Pass customAllocations for multi-asset allocations (overrides stockRatio if provided)
  const initialAccounts = buildAccountsFromBuckets(investableAssets, accountBuckets, concentration, stockRatio, customAllocations);

  // Build events (monthly recurrence with optional regime changes)
  const events = buildBronzeEvents({
    annualSpending,
    expectedIncome,
    seed,
    horizonMonths,
    taxConfig, // Pass tax config for income adjustment
    // Event Modules (v4)
    incomeChange,
    spendingChange,
    oneTimeEvents,
    // Healthcare (v7)
    healthcare,
    currentAge,
    // Contributions (v8)
    contributions,
    // Social Security (v9)
    socialSecurity,
    // Roth Conversions (v9)
    rothConversions,
    // Debt (v11)
    debt,
    horizonMonths,
    // Income Streams (v12)
    incomeStreams,
  });

  // Build stochastic config with seed (pass annualSpending for cash floor calculation)
  const config = buildBronzeConfig(seed, mcPaths, annualSpending);

  // Build StrategySettings for dynamic rebalancing (v10)
  // This enables glide_path to recalculate allocations as simulated age changes
  const strategySettings = buildStrategySettings(assetAllocation, stockRatio);

  // Build SimpleTaxConfig for WASM (matches Go SimpleTaxConfig struct)
  // This enables immediate tax withholding on withdrawals
  const simpleTaxConfig = taxConfig && taxConfig.enabled ? {
    enabled: true,
    effectiveRate: taxConfig.effectiveRate || 0.22, // Default 22% if not specified
    capitalGainsRate: taxConfig.capitalGainsRate || 0.15, // Default 15% LTCG
    filingStatus: taxConfig.filingStatus || 'single',
    state: taxConfig.state || 'NONE',
  } : null;

  // Build CashManagementStrategy for WASM (matches Go CashManagementStrategy struct)
  // Determines cash reserve targets and auto-invest behavior
  const cashStrategy = cashReserve ? {
    targetReserveMonths: cashReserve.targetMonths ?? 6, // Default 6 months
    targetReserveAmount: cashReserve.targetAmount ?? 0, // 0 means use months instead
    autoInvestExcess: cashReserve.autoInvestExcess ?? false,
    autoSellForShortfall: true, // Always enabled - this is how we cover expenses
    noAutoLiquidate: false, // Don't "show the wall" - always try to cover shortfall
  } : {
    // Default cash strategy
    targetReserveMonths: 6,
    targetReserveAmount: 0,
    autoInvestExcess: false,
    autoSellForShortfall: true,
    noAutoLiquidate: false,
  };

  // Merge rebalancing config into strategySettings
  if (rebalancing) {
    strategySettings.rebalancing = {
      method: rebalancing.method || 'threshold',
      thresholdPercentage: rebalancing.thresholdPct ?? 0.05,
      frequency: rebalancing.frequency || 'quarterly',
      minimumTradeSize: 100,
      taxAwarenessLevel: 'basic',
    };
  }

  // Return CORRECT SimulationInput shape (matches Go struct exactly)
  return {
    initialAccounts,
    events,
    config,
    monthsToRun: horizonMonths,
    initialAge: currentAge,
    startYear,
    withdrawalStrategy, // User-configurable: TAX_EFFICIENT, PROPORTIONAL, or ROTH_FIRST
    goals: [], // No goals for Bronze tier
    strategySettings, // v10: Enable dynamic glide path rebalancing + v11 rebalancing config
    cashStrategy, // v11: Cash reserve targets
    taxConfig: simpleTaxConfig, // v11: Enable immediate tax withholding on withdrawals
    // Note: Debt is handled via events (DEBT_PAYMENT events) not direct config
    // debt config would need to be converted to events here if used
  };
}

/**
 * Build StrategySettings for WASM simulation
 *
 * Enables dynamic rebalancing with glide_path strategy.
 * When strategy is 'glide_path', WASM will recalculate target allocations
 * at each rebalancing event based on simulated age vs retirement age.
 *
 * v10b: Supports custom multi-asset allocations.
 * When customAllocations is provided, uses those instead of stockRatio split.
 *
 * @param {Object|null} assetAllocation - Asset allocation config from MCP
 * @param {number} stockRatio - Pre-resolved stock ratio (0-1)
 * @returns {Object} StrategySettings for WASM
 */
function buildStrategySettings(assetAllocation, stockRatio) {
  // Determine strategy type (default: 'fixed')
  let strategy = assetAllocation?.strategy || 'fixed';
  const retirementAge = assetAllocation?.retirementAge || 65;
  const customAllocations = assetAllocation?.customAllocations;

  // Build allocations from customAllocations (v10b) or fall back to stockRatio split
  let allocations;
  if (customAllocations) {
    // Map MCP custom allocation keys to WASM asset class names (as percentages, not ratios)
    allocations = {};
    if (customAllocations.usStocks) allocations['stocks'] = customAllocations.usStocks / 100;
    if (customAllocations.internationalStocks) allocations['international_stocks'] = customAllocations.internationalStocks / 100;
    if (customAllocations.bonds) allocations['bonds'] = customAllocations.bonds / 100;
    if (customAllocations.cash) allocations['cash'] = customAllocations.cash / 100;
    if (customAllocations.leveragedSpy) allocations['leveraged_spy'] = customAllocations.leveragedSpy / 100;

    // Custom allocations use 'fixed' strategy (no glide path with custom)
    if (strategy !== 'fixed') {
      console.warn('Custom allocations override glide_path strategy to fixed');
      strategy = 'fixed';
    }
  } else {
    // Default: split stockRatio between domestic/international stocks
    const bondRatio = 1.0 - stockRatio;
    allocations = {
      'stocks': stockRatio * 0.6,               // 60% domestic of stock portion
      'international_stocks': stockRatio * 0.4, // 40% international of stock portion
      'bonds': bondRatio,                       // All bonds domestic for simplicity
    };
  }

  return {
    assetAllocation: {
      strategyType: strategy,
      allocations: allocations,
      rebalanceThreshold: 0.05, // 5% drift threshold
      targetRetirementAge: retirementAge,
    },
    rebalancing: {
      method: 'threshold',
      thresholdPercentage: 0.05,
      frequency: 'quarterly',
      minimumTradeSize: 100,
      taxAwarenessLevel: 'basic',
    },
    // Other strategy settings use defaults (handled by WASM getDefaultStrategySettings)
  };
}

/**
 * Normalized price per share for each asset class
 * WASM uses $1/share normalization for simplified Bronze tier
 * This avoids legacy holding detection (Quantity=1 with high cost basis)
 */
const NORMALIZED_PRICE_PER_SHARE = 1.0;

/**
 * Build a single holding with proper share-based accounting
 * CRITICAL: Must use realistic share quantities to avoid legacy detection
 *
 * @param {string} assetClass - Asset class identifier
 * @param {number} value - Dollar value of the holding
 * @returns {Object} Holding with proper share-based structure
 */
function buildHolding(assetClass, value) {
  if (value <= 0) {
    return null;
  }

  const pricePerShare = NORMALIZED_PRICE_PER_SHARE;
  const quantity = value / pricePerShare; // e.g., $100,000 / $1 = 100,000 shares

  return {
    id: `${assetClass}-holding`,
    assetClass,
    liquidityTier: 'LIQUID', // Stocks/bonds are liquid assets
    quantity,
    costBasisPerUnit: pricePerShare,
    costBasisTotal: value,
    currentMarketPricePerUnit: pricePerShare,
    currentMarketValueTotal: value,
  };
}

/**
 * Build a single account with stock/bond holdings
 * Uses share-based accounting to avoid WASM legacy holding detection
 *
 * @param {number} totalValue - Total value of the account
 * @param {number} stockRatio - Ratio of stocks (0-1), rest is bonds
 * @returns {Object} Account with holdings array
 */
function buildAccount(totalValue, stockRatio) {
  if (totalValue <= 0) {
    return { totalValue: 0, holdings: [] };
  }

  const stockValue = totalValue * stockRatio;
  const bondValue = totalValue * (1 - stockRatio);
  const holdings = [];

  const stockHolding = buildHolding('stocks', stockValue);
  if (stockHolding) holdings.push(stockHolding);

  const bondHolding = buildHolding('bonds', bondValue);
  if (bondHolding) holdings.push(bondHolding);

  return {
    totalValue,
    holdings,
  };
}

/**
 * Build a single account with custom multi-asset allocations
 * Supports any combination of: usStocks, internationalStocks, bonds, cash, leveragedSpy
 *
 * @param {number} totalValue - Total value of the account
 * @param {Object} customAllocations - Allocation percentages for each asset class
 * @returns {Object} Account with holdings array
 */
function buildAccountWithCustomAllocations(totalValue, customAllocations) {
  if (totalValue <= 0) {
    return { totalValue: 0, holdings: [] };
  }

  const holdings = [];

  // Map custom allocation keys to WASM asset class names
  const assetClassMap = {
    usStocks: 'stocks',
    internationalStocks: 'international_stocks',
    bonds: 'bonds',
    cash: 'cash',
    leveragedSpy: 'leveraged_spy',
  };

  for (const [key, assetClass] of Object.entries(assetClassMap)) {
    const pct = customAllocations[key];
    if (pct && pct > 0) {
      const value = totalValue * (pct / 100);
      const holding = buildHolding(assetClass, value);
      if (holding) holdings.push(holding);
    }
  }

  return {
    totalValue,
    holdings,
  };
}

/**
 * Build initial accounts from user-specified buckets or Bronze tier defaults
 *
 * Allocation percentages:
 * - Default (Bronze): 10% cash, 30% taxable, 60% tax-deferred
 * - User can specify custom allocations via accountBuckets
 *
 * Asset allocation within accounts (stock/bond ratios):
 * - v10: All accounts now use the same stockRatio (user-configurable)
 * - Default: 70% stocks, 30% bonds (same across all account types)
 * - User can override via assetAllocation.stockPercentage or glide_path
 * - v10b: Custom multi-asset allocations via customAllocations
 *
 * Concentration (v6a):
 * - If concentration.concentratedPct is provided, that percentage of total assets
 *   is allocated to a high-volatility individual stock in the taxable account
 * - Remaining assets are distributed per bucket allocations
 *
 * Concentration Override (v6b - instant loss comparison):
 * - If concentration.concentrationOverrideValue is provided, use that value for
 *   the concentrated holding instead of calculating from percentage
 * - This allows the MCP layer to model "instant loss" scenarios where only the
 *   concentrated holding is reduced, leaving other bucket allocations unchanged
 * - Remaining assets are still calculated from the ORIGINAL percentage to keep
 *   other bucket allocations stable
 *
 * @param {number} investableAssets - Total investable assets
 * @param {Object|null} buckets - User-specified allocation percentages
 * @param {Object|null} concentration - Concentration risk parameters
 * @param {number} stockRatio - Stock ratio (0-1), default 0.70
 * @param {Object|null} customAllocations - Custom multi-asset allocations (percentages for each asset class)
 * @returns {Object} AccountHoldingsMonthEnd shape
 */
function buildAccountsFromBuckets(investableAssets, buckets, concentration, stockRatio = 0.70, customAllocations = null) {
  // Calculate concentrated amount (v6a)
  // Defense-in-depth: clamp to valid range (MCP layer also validates)
  const rawPct = concentration?.concentratedPct || 0;
  const concentratedPct = Math.max(0, Math.min(100, rawPct));

  // v6b: Check for override (instant loss comparison mode)
  // When override is provided, use it for the concentrated holding value
  // but KEEP the original percentage for calculating remaining assets
  const concentrationOverrideValue = concentration?.concentrationOverrideValue;
  const useOverride = concentrationOverrideValue !== undefined && concentrationOverrideValue >= 0;

  // Original concentrated amount (for bucket distribution calculation)
  const baseConcentratedAmount = investableAssets * (concentratedPct / 100);

  // Actual concentrated amount to use in the account
  // If override is provided, use it; otherwise calculate from percentage
  // SECURITY: Clamp override to valid range [0, baseConcentratedAmount]
  // This prevents direct callers from bypassing MCP validation
  let concentratedAmount;
  if (useOverride) {
    concentratedAmount = Math.max(0, Math.min(concentrationOverrideValue, baseConcentratedAmount));
  } else {
    concentratedAmount = baseConcentratedAmount;
  }

  // Remaining assets are ALWAYS calculated from the original percentage
  // This ensures other bucket allocations stay stable when comparing
  // baseline vs. after-loss scenarios
  const remainingAssets = investableAssets - baseConcentratedAmount;

  // Default to Bronze tier if no buckets provided
  const allocation = buckets || {
    cash: 10,
    taxable: 30,
    taxDeferred: 60,
    roth: 0,
    hsa: 0,
  };

  // Calculate amounts from remaining assets (after concentration carve-out)
  const cashAmount = remainingAssets * (allocation.cash || 0) / 100;
  const taxableAmount = remainingAssets * (allocation.taxable || 0) / 100;
  const taxDeferredAmount = remainingAssets * (allocation.taxDeferred || 0) / 100;
  const rothAmount = remainingAssets * (allocation.roth || 0) / 100;
  const hsaAmount = remainingAssets * (allocation.hsa || 0) / 100;

  // Helper to build an account with either custom allocations or stock/bond ratio
  const buildAccountFn = (amount) => {
    if (customAllocations) {
      return buildAccountWithCustomAllocations(amount, customAllocations);
    }
    return buildAccount(amount, stockRatio);
  };

  // Build taxable account with user-specified allocation
  // v10: All accounts use the same allocation (user-configurable)
  // v10b: Custom multi-asset allocations when customAllocations is provided
  const taxableAccount = buildAccountFn(taxableAmount);

  // Add concentrated stock as separate holding INSIDE taxable account (v6a)
  // Uses 'individual_stock' asset class: 35% vol, 0.75 SPY correlation in engine
  if (concentratedAmount > 0) {
    // Update total value to include concentrated amount
    taxableAccount.totalValue = (taxableAccount.totalValue || 0) + concentratedAmount;

    // Add concentrated equity holding with proper share-based accounting
    // CRITICAL: Must use realistic quantity to avoid legacy holding detection
    const concentratedHolding = buildHolding('individual_stock', concentratedAmount);
    if (concentratedHolding) {
      concentratedHolding.id = 'concentrated-equity'; // Override default ID
      taxableAccount.holdings.push(concentratedHolding);
    }
  }

  const accounts = {
    // Cash is a simple number in the struct
    cash: cashAmount,

    // Taxable account (may include concentrated equity)
    taxable: taxableAccount,

    // Tax-deferred (401k/IRA): use same allocation
    tax_deferred: buildAccountFn(taxDeferredAmount),

    // Roth: use same allocation
    roth: buildAccountFn(rothAmount),
  };

  // HSA only added if there's a balance
  if (hsaAmount > 0) {
    accounts.hsa = buildAccountFn(hsaAmount);
  }

  return accounts;
}

// NOTE: applyTax() removed - FOOLPROOF RULE: Adapter passes GROSS income, Go handles all taxation
// This ensures proper tax tracking (taxWithholdingYTD, year-end reconciliation).

/**
 * Build Bronze-tier events with support for regime changes and one-time events
 *
 * CRITICAL ENGINE CONSTRAINTS (from plan review):
 * 1. Use `endDateOffset` in metadata (not `recurrenceCount`) to terminate events
 * 2. Use `"one-time"` frequency string (hyphenated, not underscore)
 * 3. Allow `monthOffset === 0` (immediate changes are valid)
 * 4. Clamp all end dates to `horizonMonths`
 * 5. Put description at top level (for trace output)
 *
 * FOOLPROOF TAXATION RULE:
 * - Adapter passes GROSS income amounts
 * - Go handler applies withholding and tracks taxes (taxWithholdingYTD)
 * - This ensures proper year-end reconciliation and IRMAA tracking
 * - taxConfig is passed to Go for WITHDRAWAL tax handling only
 *
 * TODO: migrate to Workers - this logic is portable
 *
 * @param {Object} params - Event parameters
 * @returns {Array} FinancialEvent[] array
 */
function buildBronzeEvents({
  annualSpending,
  expectedIncome,
  seed,
  horizonMonths,
  taxConfig,
  incomeChange,
  spendingChange,
  oneTimeEvents,
  healthcare,
  currentAge,
  contributions,
  socialSecurity,
  rothConversions,
  debt,
  incomeStreams,
}) {
  const events = [];

  // Helper: clamp to horizon bounds
  const clamp = (month) => Math.min(Math.max(0, month), horizonMonths);

  // ==========================================================================
  // EXPENSE REGIMES (explicit timeline, no implicit truncation)
  // ==========================================================================

  if (spendingChange && spendingChange.monthOffset >= 0) {
    // Two-regime spending: before and after change

    // Regime 1: Base spending until change (if change is not at month 0)
    if (spendingChange.monthOffset > 0 && annualSpending > 0) {
      events.push({
        id: `expense-regime-1-${seed}`,
        type: 'EXPENSE',
        description: 'Living expenses (before change)',
        monthOffset: 0,
        amount: annualSpending / 12,
        frequency: 'monthly',
        metadata: {
          endDateOffset: spendingChange.monthOffset - 1,
          applyInflation: true,  // Apply 2.5% CPI inflation
        },
        // PFOS-E fields
        expenseNature: 'fixed',
        driverKey: 'expense:fixed',
      });
    }

    // Regime 2: New spending from change onward
    // inflationBase controls whether newAnnualSpending is in "today's dollars" (simulation_start)
    // or "event date dollars" (event_start). Default is simulation_start for backward compatibility.
    events.push({
      id: `expense-regime-2-${seed}`,
      type: 'EXPENSE',
      description: spendingChange.description || 'Living expenses (after change)',
      monthOffset: spendingChange.monthOffset,
      amount: spendingChange.newAnnualSpending / 12,
      frequency: 'monthly',
      metadata: {
        endDateOffset: horizonMonths - 1,
        applyInflation: true,  // Apply 2.5% CPI inflation
        inflationBase: spendingChange.inflationBase || 'simulation_start',
      },
      // PFOS-E fields
      expenseNature: 'fixed',
      driverKey: 'expense:fixed',
    });
  } else if (annualSpending > 0) {
    // No change: single regime for full horizon
    events.push({
      id: `expense-living-${seed}`,
      type: 'EXPENSE',
      description: 'Living expenses',
      monthOffset: 0,
      amount: annualSpending / 12,
      frequency: 'monthly',
      metadata: {
        endDateOffset: horizonMonths - 1,
        applyInflation: true,  // Apply 2.5% CPI inflation
      },
      // PFOS-E fields
      expenseNature: 'fixed',
      driverKey: 'expense:fixed',
    });
  }

  // ==========================================================================
  // INCOME REGIMES (explicit timeline with optional gap + revert)
  // ==========================================================================

  // NOTE: taxDescSuffix removed - Go handles taxation, descriptions are clean

  if (incomeChange && incomeChange.monthOffset >= 0) {
    // Multi-regime income: before change, during change, after revert (optional)
    // FOOLPROOF: Pass GROSS income. Go handler applies withholding and tracks taxes.

    const changeMonth = incomeChange.monthOffset;
    const grossBase = expectedIncome / 12;
    const grossNew = incomeChange.newAnnualIncome / 12;

    // Calculate regime boundaries (clamped to horizon)
    const gapEnd = incomeChange.durationMonths
      ? clamp(changeMonth + incomeChange.durationMonths)
      : horizonMonths;

    // Regime 1: Base income until change (if change is not at month 0)
    if (changeMonth > 0 && expectedIncome > 0) {
      events.push({
        id: `income-regime-1-${seed}`,
        type: 'INCOME',
        description: `Salary income (before change)`,
        monthOffset: 0,
        amount: grossBase, // GROSS - Go handles taxation
        frequency: 'monthly',
        metadata: {
          endDateOffset: changeMonth - 1,
          applyInflation: true,
        },
        incomeType: 'salary',
        taxProfile: 'ordinary_income',
        driverKey: 'income:employment',
      });
    }

    // Regime 2: New income from change (may be 0 for sabbatical)
    if (incomeChange.newAnnualIncome > 0 || !incomeChange.durationMonths) {
      events.push({
        id: `income-regime-2-${seed}`,
        type: 'INCOME',
        description: incomeChange.description || 'Income (changed)',
        monthOffset: changeMonth,
        amount: grossNew, // GROSS - Go handles taxation
        frequency: 'monthly',
        metadata: {
          endDateOffset: gapEnd - 1,
          applyInflation: true,
        },
        incomeType: 'salary',
        taxProfile: 'ordinary_income',
        driverKey: 'income:employment',
      });
    }

    // Regime 3: Revert to original income after gap (if duration specified)
    if (incomeChange.durationMonths && gapEnd < horizonMonths && expectedIncome > 0) {
      events.push({
        id: `income-regime-3-${seed}`,
        type: 'INCOME',
        description: `Salary income (resumed)`,
        monthOffset: gapEnd,
        amount: grossBase, // GROSS - Go handles taxation
        frequency: 'monthly',
        metadata: {
          endDateOffset: horizonMonths - 1,
          applyInflation: true,
        },
        incomeType: 'salary',
        taxProfile: 'ordinary_income',
        driverKey: 'income:employment',
      });
    }
  } else if (expectedIncome > 0) {
    // No change: single regime for full horizon
    // FOOLPROOF: Pass GROSS income. Go handler applies withholding and tracks taxes.
    const grossMonthlyIncome = expectedIncome / 12;

    events.push({
      id: `income-salary-${seed}`,
      type: 'INCOME',
      description: `Salary income`,
      monthOffset: 0,
      amount: grossMonthlyIncome, // GROSS - Go handles taxation
      frequency: 'monthly',
      metadata: {
        endDateOffset: horizonMonths - 1,
        applyInflation: true, // Apply 2.5% wage inflation
      },
      // PFOS-E fields
      incomeType: 'salary',
      taxProfile: 'ordinary_income',
      driverKey: 'income:employment',
    });
  }

  // ==========================================================================
  // ONE-TIME EVENTS (use correct frequency string: "one-time" not "one_time")
  // ==========================================================================

  if (oneTimeEvents && oneTimeEvents.length > 0) {
    oneTimeEvents.forEach((ote, index) => {
      const baseId = `one-time-${ote.type}-${index}-${seed}`;
      const count = ote.recurring?.count || 1;
      const interval = ote.recurring?.intervalMonths || 12; // Default: annual

      for (let i = 0; i < count; i++) {
        const month = ote.monthOffset + i * interval;
        if (month >= horizonMonths) continue; // Skip events beyond horizon

        const eventId = count > 1 ? `${baseId}-${i}` : baseId;

        if (ote.type === 'expense') {
          events.push({
            id: eventId,
            type: 'ONE_TIME_EVENT', // Dedicated type for flow tracker
            description: ote.description,
            monthOffset: month,
            amount: -Math.abs(ote.amount), // Negative = expense
            frequency: 'one-time', // CRITICAL: hyphenated, not underscore
            metadata: {},
            // PFOS-E fields
            expenseNature: 'shock',
            driverKey: 'expense:shock',
          });
        } else {
          // One-time income (bonus, severance, etc.)
          // FOOLPROOF: Pass GROSS amount. Go handler applies IRS supplemental withholding (22% or 37% over $1M).
          events.push({
            id: eventId,
            type: 'ONE_TIME_EVENT',
            description: ote.description,
            monthOffset: month,
            amount: Math.abs(ote.amount), // GROSS - positive = income
            frequency: 'one-time',
            metadata: {},
            taxProfile: 'ordinary_income',
            driverKey: 'income:employment',
          });
        }
      }
    });
  }

  // ==========================================================================
  // HEALTHCARE EVENTS (v7)
  // ==========================================================================

  if (healthcare && currentAge !== undefined) {
    const healthcareEvents = buildHealthcareEvents(
      healthcare,
      currentAge,
      horizonMonths,
      seed
    );
    events.push(...healthcareEvents);
  }

  // ==========================================================================
  // INCOME STREAMS (v12)
  // ==========================================================================

  if (incomeStreams && incomeStreams.length > 0) {
    for (let i = 0; i < incomeStreams.length; i++) {
      const stream = incomeStreams[i];
      const monthlyAmount = stream.annualAmount / 12;
      const startMonth = stream.startMonthOffset || 0;
      const endMonth = stream.endMonthOffset !== undefined
        ? Math.min(stream.endMonthOffset, horizonMonths)
        : horizonMonths;

      if (monthlyAmount > 0 && startMonth < endMonth) {
        events.push({
          id: `income-stream-${i}-${seed}`,
          type: 'INCOME',
          description: stream.description || `Income stream ${i + 1}`,
          monthOffset: startMonth,
          amount: monthlyAmount,
          frequency: 'monthly',
          metadata: {
            endDateOffset: endMonth - 1,
            applyInflation: true,
          },
          incomeType: 'salary',
          taxProfile: stream.taxable === false ? 'tax_free' : 'ordinary_income',
          driverKey: 'income:employment',
        });
      }
    }
  }

  // ==========================================================================
  // CONTRIBUTION EVENTS (v8)
  // ==========================================================================
  // NOTE: Only create contributions if expectedIncome > 0
  // WASM will auto-skip contributions when income < expenses (decumulation mode)

  if (contributions && expectedIncome > 0) {
    const contributionEvents = buildContributionEvents(
      contributions,
      expectedIncome,
      seed
    );
    events.push(...contributionEvents);
  }

  // ==========================================================================
  // SOCIAL SECURITY EVENTS (v9)
  // ==========================================================================

  if (socialSecurity && currentAge !== undefined) {
    const ssEvent = buildSocialSecurityEvent(
      socialSecurity,
      currentAge,
      horizonMonths,
      seed
    );
    if (ssEvent) {
      events.push(ssEvent);
    }
  }

  // ==========================================================================
  // ROTH CONVERSION EVENTS (v9)
  // ==========================================================================

  if (rothConversions && rothConversions.length > 0) {
    const conversionEvents = buildRothConversionEvents(
      rothConversions,
      horizonMonths,
      seed
    );
    events.push(...conversionEvents);
  }

  // ==========================================================================
  // DEBT PAYMENT EVENTS (v11)
  // ==========================================================================

  if (debt && debt.debts && debt.debts.length > 0) {
    const debtEvents = buildDebtEvents(debt, horizonMonths, seed);
    events.push(...debtEvents);
  }

  return events;
}

/**
 * Build Bronze-tier stochastic config
 * Uses reasonable defaults for Monte Carlo simulation
 *
 * @param {number} seed - Random seed for reproducibility
 * @param {number} mcPaths - Number of Monte Carlo paths
 * @param {number} annualSpending - Annual spending for cash floor calculation
 * @returns {Object} StochasticModelConfig shape
 */
function buildBronzeConfig(seed, mcPaths, annualSpending) {
  // CRITICAL: Only send mode, seed, and cashFloor - let Go apply complete defaults
  // for mean returns, volatilities, GARCH parameters, correlation matrix, etc.
  // The Go code in wasm_bindings.go checks:
  //   if MeanSPYReturn == 0 && MeanBondReturn == 0 && MeanInflation == 0 { apply defaults }
  // By sending 0s for means, Go will use GetDefaultStochasticConfig() which has
  // all GARCH parameters, correlation matrix, and other advanced stochastic settings.
  return {
    // Mode selection
    simulationMode: mcPaths > 1 ? 'stochastic' : 'deterministic',

    // CRITICAL: randomSeed field (NOT top-level seed)
    randomSeed: seed,

    // Cash floor - trigger withdrawals when cash drops below this
    // Default to 6 months of spending as a realistic "runs out" threshold
    // (users implicitly expect some buffer, not literally $0)
    cashFloor: annualSpending ? annualSpending / 2 : 0,

    // Full mode: GARCH volatility dynamics for realistic fat-tailed distributions
    // LiteMode was ~7% faster but produced artificially tight distributions
    // with no bankruptcy paths — not worth the accuracy tradeoff
    liteMode: false,

    // DO NOT send mean/volatility values - let Go apply complete defaults
    // including GARCH parameters, correlation matrix, fat tail parameters, etc.
    // Sending partial config would override Go defaults with zeros for GARCH params.
  };
}

/**
 * Build healthcare expense events for simulation (v7)
 *
 * Healthcare costs are split into pre-Medicare (before age 65) and
 * post-Medicare (age 65+) phases. Healthcare inflation is applied
 * at a higher rate than general inflation (5% default vs 2.5%).
 *
 * @param {Object} healthcareConfig - Healthcare configuration from MCP params
 * @param {number} currentAge - User's current age
 * @param {number} horizonMonths - Simulation horizon in months
 * @param {number} seed - Simulation seed for deterministic IDs
 * @returns {Array} Array of EXPENSE events
 */
function buildHealthcareEvents(healthcareConfig, currentAge, horizonMonths, seed) {
  const events = [];
  const medicareAge = 65;
  // Clamp to simulation horizon - don't create events beyond what we simulate
  const monthsToMedicare = Math.min(
    Math.max(0, (medicareAge - currentAge) * 12),
    horizonMonths
  );
  const annualGrowthRate = healthcareConfig.inflationRate || 0.05;

  // Pre-Medicare healthcare costs
  if (healthcareConfig.preMedicare && monthsToMedicare > 0) {
    const { monthlyPremium, source, annualDeductible = 3000, outOfPocketMax = 8000 } = healthcareConfig.preMedicare;

    // Monthly premium expense
    events.push({
      id: `healthcare-premium-pre-medicare-${seed}`,  // Deterministic ID
      type: 'EXPENSE',
      description: `Pre-Medicare ${source} healthcare premiums`,
      monthOffset: 0,  // Start immediately (top-level, not in metadata)
      amount: monthlyPremium,
      frequency: 'monthly',
      metadata: {
        category: 'healthcare',
        endDateOffset: monthsToMedicare - 1,  // When to stop (0-indexed)
        annualGrowthRate,           // Healthcare inflation (not applyInflation)
      },
      // PFOS-E fields
      expenseNature: 'fixed',     // healthcare premiums are fixed
      driverKey: 'healthcare',    // sensitivity attribution
    });

    // Annual out-of-pocket (simplified as fixed expense)
    // Estimate: ~30% utilization of OOP max on top of deductible
    const monthlyOOP = (annualDeductible + outOfPocketMax * 0.3) / 12;
    events.push({
      id: `healthcare-oop-pre-medicare-${seed}`,
      type: 'EXPENSE',
      description: 'Pre-Medicare out-of-pocket costs',
      monthOffset: 0,
      amount: monthlyOOP,
      frequency: 'monthly',
      metadata: {
        category: 'healthcare',
        endDateOffset: monthsToMedicare - 1,
        annualGrowthRate,
      },
      // PFOS-E fields
      expenseNature: 'variable',  // OOP costs vary
      driverKey: 'healthcare',
    });
  }

  // Post-Medicare healthcare costs
  if (healthcareConfig.postMedicare && monthsToMedicare < horizonMonths) {
    const { monthlyPremium, supplementType } = healthcareConfig.postMedicare;

    events.push({
      id: `healthcare-premium-post-medicare-${seed}`,
      type: 'EXPENSE',
      description: `Medicare + ${supplementType} premiums`,
      monthOffset: monthsToMedicare,  // Start at Medicare age
      amount: monthlyPremium,
      frequency: 'monthly',
      metadata: {
        category: 'healthcare',
        // No endDateOffset - runs for remainder of simulation
        annualGrowthRate,
      },
      // PFOS-E fields
      expenseNature: 'fixed',
      driverKey: 'healthcare',
    });
  }

  return events;
}

/**
 * Build contribution events for simulation (v8)
 *
 * IMPORTANT: Uses valid PFOS-E fields:
 * - targetAccountType at event root (not metadata)
 * - driverKey from closed enum: contribution:retirement, contribution:taxable
 * - taxTreatment from closed enum: pre_tax, post_tax
 *
 * @param {Object} contributionsConfig - Contribution configuration
 * @param {number} expectedIncome - Annual income for percentage calculations
 * @param {number} seed - Random seed for deterministic IDs
 * @returns {Array} ACCOUNT_CONTRIBUTION events
 */
function buildContributionEvents(contributionsConfig, expectedIncome, seed) {
  const events = [];

  // Employee contribution (from income)
  if (contributionsConfig.employeeContribution) {
    const { percentageOfSalary, targetAccount } = contributionsConfig.employeeContribution;
    const annualContribution = expectedIncome * percentageOfSalary;
    const monthlyContribution = annualContribution / 12;

    // Determine correct driverKey based on account type
    const driverKey = targetAccount === 'taxable'
      ? 'contribution:taxable'
      : 'contribution:retirement';

    // Determine tax treatment
    const taxTreatment = targetAccount === 'roth' ? 'post_tax' : 'pre_tax';

    events.push({
      id: `contribution-employee-${seed}`,
      type: 'ACCOUNT_CONTRIBUTION',
      description: `Employee contribution to ${targetAccount}`,
      monthOffset: 0,
      amount: monthlyContribution,
      frequency: 'monthly',
      // CRITICAL: targetAccountType at event root (not in metadata)
      targetAccountType: targetAccount,
      // PFOS-E fields - using valid closed enum values
      taxTreatment,
      driverKey,
      metadata: {
        category: 'contribution',
      },
    });
  }

  // Employer match (always goes to tax_deferred)
  if (contributionsConfig.employerMatch && contributionsConfig.employeeContribution) {
    const { matchUpToPercentage, matchRate } = contributionsConfig.employerMatch;
    const { percentageOfSalary } = contributionsConfig.employeeContribution;

    // Match is limited to matchUpToPercentage of salary
    const employeeContribPct = Math.min(percentageOfSalary, matchUpToPercentage);
    const matchAmount = expectedIncome * employeeContribPct * matchRate;
    const monthlyMatch = matchAmount / 12;

    events.push({
      id: `contribution-employer-match-${seed}`,
      type: 'ACCOUNT_CONTRIBUTION',
      description: 'Employer 401(k) match',
      monthOffset: 0,
      amount: monthlyMatch,
      frequency: 'monthly',
      // CRITICAL: targetAccountType at event root
      targetAccountType: 'tax_deferred',
      // PFOS-E fields
      taxTreatment: 'pre_tax',
      driverKey: 'contribution:retirement',
      metadata: {
        category: 'contribution',
        matchRate,
        matchUpToPercentage,
      },
    });
  }

  return events;
}

/**
 * Build Social Security income event (v9)
 *
 * IMPORTANT:
 * - Handler expects metadata.isColaAdjusted (not colaAdjusted)
 * - monthlyBenefit is in today's dollars
 * - monthOffset clamped to 0 if already claiming
 *
 * @param {Object} ssConfig - Social Security configuration
 * @param {number} currentAge - User's current age
 * @param {number} horizonMonths - Simulation horizon
 * @param {number} seed - Random seed for deterministic IDs
 * @returns {Object|null} SOCIAL_SECURITY_INCOME event or null
 */
function buildSocialSecurityEvent(ssConfig, currentAge, horizonMonths, seed) {
  const { claimingAge, monthlyBenefit, colaAdjusted = true } = ssConfig;

  // Skip if no benefit
  if (monthlyBenefit <= 0) {
    return null;
  }

  // Clamp monthOffset to 0 if already claiming (claimingAge <= currentAge)
  const monthsUntilClaiming = Math.max(0, (claimingAge - currentAge) * 12);

  // Skip if claiming is beyond horizon
  if (monthsUntilClaiming >= horizonMonths) {
    return null;
  }

  return {
    id: `social-security-${seed}`,
    type: 'SOCIAL_SECURITY_INCOME',
    description: `Social Security benefit starting at age ${claimingAge}`,
    monthOffset: monthsUntilClaiming,
    amount: monthlyBenefit,
    frequency: 'monthly',
    // Tax profile for SS taxation rules (up to 85% taxable depending on income)
    taxProfile: 'social_security_benefit',
    // driverKey valid enum value
    driverKey: 'income:retirement',
    metadata: {
      category: 'income',
      claimingAge,
      // CRITICAL: Handler reads isColaAdjusted, not colaAdjusted
      isColaAdjusted: colaAdjusted,
    },
  };
}

/**
 * Build Roth conversion events (v9)
 *
 * IMPORTANT:
 * - Omit driverKey (not a valid enum value for conversions)
 * - Handler expects sourceAccountType/targetAccountType
 * - Conversions occur in January of specified year
 *
 * @param {Array} conversions - Array of Roth conversion configs
 * @param {number} horizonMonths - Simulation horizon
 * @param {number} seed - Random seed for deterministic IDs
 * @returns {Array} ROTH_CONVERSION events
 */
function buildRothConversionEvents(conversions, horizonMonths, seed) {
  const horizonYears = Math.floor(horizonMonths / 12);

  return conversions
    .filter(conv => conv.yearOffset < horizonYears && conv.amount > 0)
    .map((conv, index) => ({
      id: `roth-conversion-${index}-${seed}`,
      type: 'ROTH_CONVERSION',
      description: `Roth conversion year ${conv.yearOffset}`,
      monthOffset: conv.yearOffset * 12, // January of that year
      amount: conv.amount,
      sourceAccountType: 'tax_deferred',
      targetAccountType: 'roth',
      // NOTE: Omit driverKey — no valid enum value for conversions
      metadata: {
        category: 'tax_strategy',
      },
    }));
}

/**
 * Build debt payment events (v11)
 *
 * Debt is modeled as monthly expense events for the minimum payment,
 * plus any extra payments. Payments continue until the debt would be
 * paid off (calculated from remainingMonths or balance/payment).
 *
 * @param {Object} debtConfig - Debt configuration
 * @param {number} horizonMonths - Simulation horizon
 * @param {number} seed - Random seed for event IDs
 * @returns {Array} Debt payment events
 */
function buildDebtEvents(debtConfig, horizonMonths, seed) {
  const events = [];
  const { debts, payoffStrategy = 'avalanche', extraMonthlyPayment = 0 } = debtConfig;

  if (!debts || debts.length === 0) {
    return events;
  }

  // Sort debts by payoff strategy to allocate extra payments
  const sortedDebts = [...debts].sort((a, b) => {
    if (payoffStrategy === 'avalanche') {
      // Highest interest rate first
      return b.interestRate - a.interestRate;
    } else {
      // Snowball: smallest balance first
      return a.balance - b.balance;
    }
  });

  // Generate payment events for each debt
  sortedDebts.forEach((debt, index) => {
    // Calculate how many months until debt is paid off
    // Simple approximation: balance / payment (ignores interest accrual for Bronze tier)
    const monthsToPayoff = debt.remainingMonths ||
      Math.ceil(debt.balance / debt.minimumPayment);
    const payoffMonth = Math.min(monthsToPayoff, horizonMonths);

    if (payoffMonth > 0 && debt.minimumPayment > 0) {
      // Add monthly payment event
      events.push({
        id: `debt-payment-${debt.id}-${seed}`,
        type: 'EXPENSE',
        description: `Debt payment: ${debt.description}`,
        monthOffset: 0,
        amount: debt.minimumPayment,
        frequency: 'monthly',
        metadata: {
          category: 'debt',
          debtId: debt.id,
          interestRate: debt.interestRate,
          endDateOffset: payoffMonth - 1, // Stop payments when paid off
        },
        // PFOS-E fields
        expenseNature: 'fixed',
        driverKey: 'debt',
      });
    }
  });

  // Add extra payment as separate event going to first debt in priority order
  if (extraMonthlyPayment > 0 && sortedDebts.length > 0) {
    const primaryDebt = sortedDebts[0];
    const monthsToPayoff = primaryDebt.remainingMonths ||
      Math.ceil(primaryDebt.balance / (primaryDebt.minimumPayment + extraMonthlyPayment));
    const payoffMonth = Math.min(monthsToPayoff, horizonMonths);

    events.push({
      id: `debt-extra-payment-${seed}`,
      type: 'EXPENSE',
      description: `Extra debt payment (${payoffStrategy} strategy)`,
      monthOffset: 0,
      amount: extraMonthlyPayment,
      frequency: 'monthly',
      metadata: {
        category: 'debt',
        strategy: payoffStrategy,
        endDateOffset: payoffMonth - 1,
      },
      // PFOS-E fields
      expenseNature: 'fixed',
      driverKey: 'debt',
    });
  }

  return events;
}

/**
 * Extract Bronze params from PacketBuildRequest
 *
 * Supports two formats:
 * 1. confirmedChanges array (NLP extraction flow)
 * 2. Direct properties on packetBuildRequest (MCP/API flow)
 *
 * @param {Object} packetBuildRequest - The full packet build request
 * @returns {Object} Bronze params extracted from request
 */
export function extractBronzeParams(packetBuildRequest) {
  const {
    seed,
    startYear,
    mcPaths = 1,
    horizon,
    horizonMonths,
    confirmedChanges = [],
    // Direct properties (MCP/API flow)
    investableAssets: directInvestablAssets,
    annualSpending: directAnnualSpending,
    currentAge: directCurrentAge,
    expectedIncome: directExpectedIncome,
    // Tax configuration (MCP v3)
    taxConfig,
    // Event Modules (MCP v4)
    incomeChange,
    spendingChange,
    oneTimeEvents,
    // Account Buckets (MCP v5)
    accountBuckets,
    // Asset Allocation (MCP v10)
    assetAllocation,
    stockRatio,
    // Concentration Risk (MCP v6a)
    concentration,
    // Healthcare (MCP v7)
    healthcare,
    // Contributions (MCP v8)
    contributions,
    // Social Security (MCP v9)
    socialSecurity,
    // Roth Conversions (MCP v9)
    rothConversions,
    // Withdrawal Strategy (MCP v11)
    withdrawalStrategy,
    // Income Streams (MCP v12)
    incomeStreams,
  } = packetBuildRequest;

  // Helper to extract value from confirmedChanges by fieldPath
  const extractValue = (fieldPath, defaultValue = 0) => {
    const pathStr = JSON.stringify(fieldPath);
    const change = confirmedChanges.find((c) => JSON.stringify(c.fieldPath) === pathStr);
    return change?.newValue ?? defaultValue;
  };

  // Prefer direct properties, fall back to confirmedChanges extraction
  return {
    investableAssets: directInvestablAssets ?? extractValue(['profile', 'investableAssets']),
    annualSpending: directAnnualSpending ?? extractValue(['profile', 'annualSpending']),
    currentAge: directCurrentAge ?? extractValue(['profile', 'currentAge'], 30),
    expectedIncome: directExpectedIncome ?? extractValue(['profile', 'expectedIncome']),
    seed,
    startYear,
    mcPaths,
    // Honor caller-provided horizon (multiple formats), default to 360 (30 years)
    horizonMonths: horizonMonths ?? horizon?.endMonth ?? 360,
    // Tax configuration (passed through to events)
    taxConfig: taxConfig || null,
    // Event Modules (v4) - regime changes + one-time events
    // TODO: migrate to Workers - this logic is portable
    incomeChange: incomeChange || null,
    spendingChange: spendingChange || null,
    oneTimeEvents: oneTimeEvents || [],
    // Account Buckets (v5) - user-specified allocation
    accountBuckets: accountBuckets || null,
    // Asset Allocation (v10) - full config for dynamic rebalancing
    assetAllocation: assetAllocation || null,
    stockRatio: stockRatio ?? 0.70,
    // Concentration Risk (v6a)
    concentration: concentration || null,
    // Healthcare (v7)
    healthcare: healthcare || null,
    // Contributions (v8)
    contributions: contributions || null,
    // Social Security (v9)
    socialSecurity: socialSecurity || null,
    // Roth Conversions (v9)
    rothConversions: rothConversions || null,
    // Withdrawal Strategy (v11)
    withdrawalStrategy: withdrawalStrategy || 'TAX_EFFICIENT',
    // Income Streams (v12)
    incomeStreams: incomeStreams || null,
  };
}
