/**
 * MCP Server Types for AreumFire Financial Simulation
 *
 * These types define the MCP tool interfaces for ChatGPT App integration.
 */

/**
 * Output verbosity levels for simulation results
 * - 'summary': MC aggregates + exemplarPath reference (default)
 * - 'annual': Add year-by-year snapshots from exemplar path
 * - 'trace': Add month-by-month ledger + event trace
 */
export type VerbosityLevel = 'summary' | 'annual' | 'trace';

/**
 * Account allocation percentages (must sum to 100)
 * Allows users to specify how their investableAssets are distributed.
 * Default (Bronze tier): 10% cash, 30% taxable, 60% tax-deferred
 *
 * Supports both original names (cash, taxable, etc.) and explicit Pct-suffixed
 * names (cashPct, taxablePct, etc.) for clarity. The Pct suffix makes it
 * unambiguous that these are percentages, not dollar amounts.
 */
export interface AccountBuckets {
  /** Cash/checking/savings allocation (0-100) */
  cash?: number;
  /** @alias cash - Explicit percentage suffix for clarity */
  cashPct?: number;

  /** Taxable brokerage allocation (0-100) */
  taxable?: number;
  /** @alias taxable - Explicit percentage suffix for clarity */
  taxablePct?: number;

  /** Tax-deferred (401k, Traditional IRA) allocation (0-100) */
  taxDeferred?: number;
  /** @alias taxDeferred - Explicit percentage suffix for clarity */
  taxDeferredPct?: number;

  /** Roth (Roth IRA, Roth 401k) allocation (0-100) */
  roth?: number;
  /** @alias roth - Explicit percentage suffix for clarity */
  rothPct?: number;

  /** HSA allocation (0-100) - Optional */
  hsa?: number;
  /** @alias hsa - Explicit percentage suffix for clarity */
  hsaPct?: number;
}

/**
 * Asset allocation strategy for investment accounts
 *
 * Controls the stock/bond mix across all accounts.
 * Phase 1: Fixed allocation or pre-calculated glide path
 * Phase 2 (future): Dynamic mid-simulation allocation changes
 */
/**
 * Custom allocation percentages for multi-asset portfolios.
 * All values are percentages (0-100) and must sum to 100.
 *
 * Supported asset classes:
 * - usStocks: US stocks total market (e.g., VTI, FSKAX)
 * - internationalStocks: International stocks (e.g., VXUS, FSPSX)
 * - bonds: US bonds total market (e.g., BND, FXNAX)
 * - cash: Cash/money market
 *
 * Future asset classes (not yet fully supported in returns model):
 * - leveragedSpy: 3x leveraged SPY (UPRO-like)
 * - realEstate: Real estate funds
 */
export interface CustomAllocations {
  usStocks?: number;           // 0-100, default: 0
  internationalStocks?: number; // 0-100, default: 0
  bonds?: number;              // 0-100, default: 0
  cash?: number;               // 0-100, default: 0
  leveragedSpy?: number;       // 0-100, experimental
}

export interface AssetAllocation {
  /**
   * Allocation strategy type:
   * - 'fixed': Use stockPercentage or customAllocations for static allocation
   * - 'glide_path': Calculate allocation from bracket based on years to retirement
   * - 'custom': Use fully custom allocations (requires customAllocations)
   *
   * Default: 'fixed'
   */
  strategy?: 'fixed' | 'glide_path' | 'custom';

  /**
   * Stock percentage (0-100) for fixed strategy.
   * Remainder goes to bonds.
   * Default: 70 (70% stocks, 30% bonds)
   *
   * If customAllocations is provided, this is ignored.
   * Ignored when strategy='glide_path' (bracket calculation takes precedence)
   */
  stockPercentage?: number;

  /**
   * Custom multi-asset allocation percentages.
   * Must sum to 100.
   *
   * Use this for portfolios with specific international/domestic splits,
   * bond allocations, or experimental asset classes like leveraged funds.
   *
   * Example: { usStocks: 50, internationalStocks: 20, bonds: 25, cash: 5 }
   */
  customAllocations?: CustomAllocations;

  /**
   * Retirement age for glide_path calculation.
   * Used to determine years-to-retirement for bracket lookup.
   * Default: 65
   *
   * Only used when strategy='glide_path'
   */
  retirementAge?: number;
}

/**
 * Input parameters for run_simulation_packet tool
 * Maps to Bronze-tier quick inputs for rapid financial planning.
 */
export interface RunSimulationParams {
  /** Total investable assets ($) */
  investableAssets: number;

  /** Annual spending ($) */
  annualSpending: number;

  /** Current age (years) */
  currentAge: number;

  /** Expected annual income ($) */
  expectedIncome: number;

  /** Random seed for deterministic simulation */
  seed: number;

  /** Simulation start year (e.g., 2024) */
  startYear: number;

  /** Number of Monte Carlo paths (default: 100, recommended: 50-200 for percentile estimates) */
  mcPaths?: number;

  /** Simulation horizon in months. Default: (maxAge - currentAge) * 12. Auto-capped to not exceed maxAge. */
  horizonMonths?: number;

  /**
   * Maximum age for simulation projection (default: 90, max: 100).
   * Projections beyond age 90 carry significant uncertainty.
   * Use with appropriate caveats for extended projections.
   */
  maxAge?: number;

  /**
   * Output verbosity level:
   * - 'annual' (default): MC aggregates + year-by-year snapshots + first-month events for 'show the math'
   * - 'summary': MC aggregates only (no detailed calculations)
   * - 'trace': Add full month-by-month ledger + event trace
   */
  verbosity?: VerbosityLevel;

  /**
   * Response format:
   * - 'full' (default): Includes interactive widget visualization
   * - 'text': Text summary and structured data only, no widget
   */
  outputMode?: 'full' | 'text';

  /**
   * [Advanced / Replay Mode] Specific path seed to replay.
   * If provided, skips MC and directly replays this path with full trace.
   * Use this to "show me that path again" without re-running MC.
   */
  pathSeed?: number;

  /**
   * Tax assumptions for the simulation.
   * Three modes:
   * - not_applied (default): No tax calculations
   * - user_declared: User provides their own rates
   * - default_assumptions: Use average-case defaults (requires explicit consent)
   */
  taxAssumptions?: TaxAssumptions;

  /**
   * Account allocation percentages (must sum to 100).
   * Specifies how investableAssets are distributed across account types.
   * Default: 10% cash, 30% taxable, 60% tax-deferred
   */
  accountBuckets?: AccountBuckets;

  /**
   * Asset allocation (stock/bond mix) for investment accounts.
   * Controls the equity/fixed-income ratio within each account.
   * Default: 70% stocks, 30% bonds (fixed strategy)
   */
  assetAllocation?: AssetAllocation;

  // ==========================================================================
  // Event Modules (v4)
  // ==========================================================================

  /**
   * Income regime change (job change, layoff, sabbatical)
   * Creates income regimes with explicit start/end dates.
   * For single-income scenarios, use this. For multiple income streams
   * (dual-earner households), use incomeStreams instead.
   */
  incomeChange?: IncomeChange;

  /**
   * Multiple income streams for dual-earner households or multiple income sources.
   * Each stream has its own amount, start, and end timing.
   * Use this instead of incomeChange when modeling multiple distinct income sources.
   */
  incomeStreams?: IncomeStream[];

  /**
   * Spending regime change (retirement, lifestyle changes)
   * Creates spending regimes with explicit start/end dates
   */
  spendingChange?: SpendingChange;

  /**
   * One-time events (large purchases, bonuses, tuition)
   * Can be single or recurring
   */
  oneTimeEvents?: OneTimeEvent[];

  /**
   * Concentration risk (v6a)
   * Models concentrated stock exposure (e.g., company stock, RSUs)
   */
  concentration?: Concentration;

  /**
   * Healthcare costs (v7)
   * Models pre-Medicare and post-Medicare healthcare expenses
   */
  healthcare?: HealthcareConfig;

  /**
   * Contributions (v8)
   * Models retirement contributions and employer matching
   */
  contributions?: ContributionsConfig;

  /**
   * Social Security income (v9)
   * Models SS benefit starting at claiming age
   */
  socialSecurity?: SocialSecurityConfig;

  /**
   * Roth conversions (v9)
   * Models tax-deferred to Roth conversions
   */
  rothConversions?: RothConversionConfig[];

  /**
   * Withdrawal strategy for decumulation phase (v11)
   * Controls the order in which accounts are drawn down when spending exceeds income.
   * Default: 'tax_efficient'
   */
  withdrawalStrategy?: WithdrawalStrategy;

  /**
   * Cash reserve configuration (v11)
   * Controls cash management behavior for emergencies and spending needs.
   * Default: 6 months of expenses
   */
  cashReserve?: CashReserveConfig;

  /**
   * Rebalancing configuration (v11)
   * Controls how and when portfolio is rebalanced back to target allocation.
   * Default: Threshold-based, 5% drift, quarterly
   */
  rebalancing?: RebalancingConfig;

  /**
   * Debt management configuration (v11)
   * Models existing debt and payoff strategies.
   * Default: Not modeled (no debt)
   */
  debt?: DebtConfig;

  /**
   * Return assumptions override (v13)
   * Allows user to specify custom mean return and inflation assumptions.
   * Default: stocks 7%, bonds 3%, inflation 2.5%
   */
  returnAssumptions?: ReturnAssumptions;
}

/**
 * Withdrawal strategy for decumulation phase
 *
 * Controls the order in which accounts are tapped when spending exceeds income:
 * - 'tax_efficient': Cash → Taxable → Tax-Deferred → Roth (default, minimizes lifetime taxes)
 * - 'pro_rata': Proportional withdrawals from all accounts (maintains allocation)
 * - 'roth_first': Roth → Taxable → Tax-Deferred → Cash (preserve tax-deferred growth)
 */
export type WithdrawalStrategy = 'tax_efficient' | 'pro_rata' | 'roth_first';

// =============================================================================
// Cash Reserve Configuration (v11)
// =============================================================================

/**
 * Cash reserve configuration for emergency funds and spending needs
 *
 * Answers questions like:
 * - "I want to keep 12 months of expenses in cash"
 * - "Keep $50k liquid at all times"
 *
 * When cash drops below target, engine sells from investments to replenish.
 * When cash exceeds target, excess can be invested automatically.
 */
export interface CashReserveConfig {
  /**
   * Target reserve as months of expenses (e.g., 6 = 6 months)
   * Mutually exclusive with targetAmount.
   * Default: 6
   */
  targetMonths?: number;

  /**
   * Target reserve as absolute dollar amount (e.g., 50000)
   * Mutually exclusive with targetMonths.
   */
  targetAmount?: number;

  /**
   * Automatically invest cash above target into taxable account.
   * Default: false
   */
  autoInvestExcess?: boolean;
}

// =============================================================================
// Rebalancing Configuration (v11)
// =============================================================================

/**
 * Portfolio rebalancing configuration
 *
 * Answers questions like:
 * - "Rebalance when 10% off target"
 * - "Rebalance annually instead of quarterly"
 *
 * Controls when and how the portfolio returns to target allocation.
 */
export interface RebalancingConfig {
  /**
   * Rebalancing method:
   * - 'threshold': Rebalance when any asset drifts beyond threshold (default)
   * - 'periodic': Rebalance on fixed schedule regardless of drift
   * - 'none': Never rebalance
   */
  method?: 'threshold' | 'periodic' | 'none';

  /**
   * Drift threshold as decimal (e.g., 0.05 = 5%)
   * Triggers rebalancing when any asset is this far from target.
   * Default: 0.05 (5%)
   * Only used when method='threshold'
   */
  thresholdPct?: number;

  /**
   * Rebalancing frequency for periodic method:
   * - 'monthly': Check monthly
   * - 'quarterly': Check quarterly (default)
   * - 'annually': Check annually
   */
  frequency?: 'monthly' | 'quarterly' | 'annually';
}

// =============================================================================
// Debt Configuration (v11)
// =============================================================================

/**
 * Debt modeling configuration
 *
 * Answers questions like:
 * - "I have $20k in student loans at 6%"
 * - "I'm paying an extra $500/month on my mortgage"
 *
 * Models existing debt as a liability that reduces net worth.
 * Payments are modeled as expenses until debt is paid off.
 */
export interface DebtConfig {
  /**
   * List of debt obligations
   */
  debts?: DebtItem[];

  /**
   * Payoff strategy when making extra payments:
   * - 'avalanche': Pay highest interest rate first (mathematically optimal)
   * - 'snowball': Pay smallest balance first (psychological wins)
   * Default: 'avalanche'
   */
  payoffStrategy?: 'avalanche' | 'snowball';

  /**
   * Extra monthly payment applied to debt beyond minimums.
   * Allocated according to payoffStrategy.
   * Default: 0
   */
  extraMonthlyPayment?: number;
}

/**
 * Individual debt item
 */
export interface DebtItem {
  /** Debt identifier (e.g., "student_loan", "mortgage", "car_loan") */
  id: string;

  /** Human-readable description */
  description: string;

  /** Current balance in dollars */
  balance: number;

  /** Annual interest rate as decimal (e.g., 0.06 = 6%) */
  interestRate: number;

  /** Minimum monthly payment in dollars */
  minimumPayment: number;

  /** Optional: Remaining months on loan (for amortizing loans) */
  remainingMonths?: number;
}

/**
 * Reference to the exemplar (median) path for replay/trace support
 */
export interface ExemplarPath {
  /** Replayable seed (baseSeed + pathIndex) */
  pathSeed: number;
  /** Index within the MC run (0-based) */
  pathIndex: number;
  /** How this path was selected */
  selectionCriterion: 'median_terminal_wealth';
  /** Final net worth on this path */
  terminalWealth: number;
}

/**
 * Year-by-year snapshot from exemplar path (verbosity: 'annual')
 */
export interface AnnualSnapshot {
  year: number;
  age: number;
  startBalance: number;
  contributions: number;
  withdrawals: number;
  returnPct: number;
  endBalance: number;
}

/**
 * Single event in first-month trace (lean structure for minimal payload)
 */
export interface FirstMonthEvent {
  /** Event name (e.g., "Salary deposit") */
  n: string;
  /** Event type (e.g., "income", "expense", "market") */
  t: string;
  /** Delta amount (change in dollars) */
  d: number;
  /** Cash balance before this event */
  cb: number;
  /** Cash balance after this event */
  ca: number;
}

/**
 * First-month events by age for "show the math" inspector
 * Map of age → array of events that occurred in January of that year
 */
export type FirstMonthEvents = Record<number, FirstMonthEvent[]>;

/**
 * Month-by-month trace entry (verbosity: 'trace')
 */
export interface TraceMonth {
  month: number;
  year: number;
  calendarMonth: number;
  age: number;
  netWorth: number;
  cash: number;
  taxable: number;
  taxDeferred: number;
  roth: number;
  income: number;
  expenses: number;
  eventIds: string[];
}

/**
 * Event trace entry showing before/after state
 */
export interface TraceEvent {
  month: number;
  id: string;
  name: string;
  type: string;
  amount: number;
  description: string;
  netWorthBefore: number;
  netWorthAfter: number;
  cashBefore: number;
  cashAfter: number;
}

/**
 * Market return data per month (from RealizedMonthVariables)
 */
export interface TraceMarketReturn {
  month: number;
  monthString?: string; // YYYY-MM format
  spyReturn: number;
  bondReturn: number; // Mapped from Go's bndReturn
  intlReturn?: number;
  inflation: number;
  homeValueGrowth?: number;
  weightedReturn?: number;
}

/**
 * Full trace data (verbosity: 'trace')
 */
export interface TraceData {
  months: TraceMonth[];
  events: TraceEvent[];
  marketReturns: TraceMarketReturn[];
  monthCount: number;
  eventCount: number;
  simulationMode: 'stochastic' | 'deterministic';
  seed: number;
  finalNetWorth: number;
}

/**
 * Dollars mode for simulation output
 * - NOMINAL: Raw dollar amounts (default)
 * - REAL: Inflation-adjusted (requires inflation assumption)
 */
export type DollarsMode = 'NOMINAL' | 'REAL';

/**
 * Tax mode for simulation output
 * - NOT_APPLIED: No tax calculations (default)
 * - USER_DECLARED: User-provided tax rates applied
 * - DEFAULT_ASSUMPTIONS: Average-case defaults with explicit user consent
 */
export type TaxMode = 'NOT_APPLIED' | 'USER_DECLARED' | 'DEFAULT_ASSUMPTIONS';

/**
 * Filing status for tax calculations
 */
export type FilingStatus = 'single' | 'married';

/**
 * Tax assumptions for simulation
 * Three modes: not_applied, user_declared, default_assumptions
 */
export interface TaxAssumptions {
  /**
   * Tax application mode:
   * - 'not_applied': No tax calculations (default)
   * - 'user_declared': User provides their own rates
   * - 'default_assumptions': Use average-case defaults (requires explicit consent)
   */
  mode: 'not_applied' | 'user_declared' | 'default_assumptions';

  /**
   * Filing status (used when mode='user_declared' or 'default_assumptions')
   * Default: 'single'
   */
  filingStatus?: FilingStatus;

  /**
   * State code for state tax (two-letter, e.g., 'CA', 'TX')
   * Default: 'CA'
   * Use 'NONE' for no state income tax
   */
  state?: string;

  /**
   * Effective tax rate range [min, max] as decimals (e.g., [0.22, 0.28] for 22-28%)
   * Simulation uses midpoint; range shown for uncertainty display
   * Default for default_assumptions: [0.22, 0.28]
   */
  effectiveRateRange?: [number, number];

  /**
   * Long-term capital gains rate range [min, max] as decimals
   * Default for default_assumptions: [0.15, 0.20]
   */
  capitalGainsRateRange?: [number, number];
}

/**
 * Resolved tax configuration passed to simulation service
 * Contains the actual rates to use (midpoint of ranges)
 */
export interface ResolvedTaxConfig {
  /** Whether taxes are applied */
  enabled: boolean;
  /** Filing status */
  filingStatus: FilingStatus;
  /** State code */
  state: string;
  /** Effective tax rate (midpoint of range) */
  effectiveRate: number;
  /** Capital gains rate (midpoint of range) */
  capitalGainsRate: number;
  /** Original range for display */
  effectiveRateRange: [number, number];
  /** Original range for display */
  capitalGainsRateRange: [number, number];
}

/**
 * Simulation packet result returned to ChatGPT
 *
 * Contains Monte Carlo results and blocked outputs for Bronze tier.
 */
// =============================================================================
// Event Modules (v4) - Regime Changes + One-Time Events
// =============================================================================

/**
 * Income regime change module
 *
 * Answers questions like:
 * - "What if I switch jobs and comp changes?"
 * - "What if I get laid off for 6 months?"
 * - "What if I take a sabbatical (income = 0)?"
 */
export interface IncomeChange {
  /** Month when change occurs (0 = now) */
  monthOffset: number;
  /** New annual income after change (0 for layoff/sabbatical) */
  newAnnualIncome: number;
  /** Optional: months until income reverts to original (for gaps/sabbaticals) */
  durationMonths?: number;
  /** Description (e.g., "Job change", "Sabbatical") */
  description?: string;
  /** Age at which this event occurs. Alternative to monthOffset -- provide one or the other, not both. */
  atAge?: number;
}

/**
 * Income stream for multi-income modeling (dual-earner households)
 *
 * Answers questions like:
 * - "My spouse earns $80k and will retire at 62"
 * - "I have rental income of $2k/month indefinitely"
 * - "My consulting income of $50k ends in 5 years"
 */
export interface IncomeStream {
  /** Annual income amount in dollars (gross) */
  annualAmount: number;
  /** Month when this income stream starts (0 = now, default: 0) */
  startMonthOffset?: number;
  /** Month when this income stream ends (omit for indefinite/until horizon) */
  endMonthOffset?: number;
  /** Description for display (e.g., "Spouse salary", "Rental income") */
  description: string;
  /**
   * Whether this income is taxable.
   * Default: true. Set to false for tax-exempt income like Roth distributions.
   */
  taxable?: boolean;
}

/**
 * Spending regime change module
 *
 * Answers questions like:
 * - "What if I cut spending by 20% in retirement?"
 * - "What if spending increases when kids arrive?"
 * - "What if I move somewhere cheaper?"
 */
export interface SpendingChange {
  /** Month when change occurs (0 = now) */
  monthOffset: number;
  /** New annual spending after change */
  newAnnualSpending: number;
  /** Description (e.g., "Retirement", "Kids arrive") */
  description?: string;
  /** Age at which this event occurs. Alternative to monthOffset -- provide one or the other, not both. */
  atAge?: number;
}

/**
 * One-time event module
 *
 * Answers questions like:
 * - "Can I buy a $1.5M house next year?"
 * - "What about $50k/year tuition for 4 years?"
 * - "Big expense: $30k home renovation in year 5"
 * - "One-time bonus: $100k sign-on in 6 months"
 */
export interface OneTimeEvent {
  /** Month when event occurs */
  monthOffset: number;
  /** Dollar amount (always positive, type determines direction) */
  amount: number;
  /** Direction: 'income' or 'expense' */
  type: 'income' | 'expense';
  /** Description (e.g., "Home purchase", "Tuition", "Sign-on bonus") */
  description: string;
  /** Optional: repeating event pattern. Omit entirely for single events. */
  recurring?: {
    /** How many times total (required) */
    count: number;
    /** Months between occurrences. Optional if count=1, defaults to 1 (monthly). */
    intervalMonths?: number;
  };
  /** Age at which this event occurs. Alternative to monthOffset -- provide one or the other, not both. */
  atAge?: number;
}

// =============================================================================
// Healthcare Module (v7)
// =============================================================================

/**
 * Healthcare cost configuration for simulation
 *
 * Models healthcare costs before and after Medicare (age 65).
 * Uses a higher inflation rate (5% default) compared to general inflation (2.5%).
 */
export interface HealthcareConfig {
  /**
   * Pre-Medicare healthcare costs (before age 65)
   */
  preMedicare?: {
    /** Monthly premium in dollars (e.g., 800 for ACA plan) */
    monthlyPremium: number;
    /** Insurance source (informational, for future tax handling) */
    source: 'employer' | 'aca' | 'cobra' | 'spouse' | 'none';
    /** Annual deductible in dollars (default: 3000) */
    annualDeductible?: number;
    /** Annual out-of-pocket maximum in dollars (default: 8000) */
    outOfPocketMax?: number;
  };

  /**
   * Post-Medicare healthcare costs (age 65+)
   */
  postMedicare?: {
    /** Monthly premium in dollars (Part B + supplement, e.g., 300) */
    monthlyPremium: number;
    /** Type of Medicare supplement */
    supplementType: 'medigap' | 'advantage' | 'none';
  };

  /**
   * Healthcare inflation rate (default: 0.05 = 5%)
   * This is typically higher than general inflation (~2.5%)
   */
  inflationRate?: number;
}

// =============================================================================
// Contributions Module (v8)
// =============================================================================

/**
 * Contributions configuration for retirement savings modeling
 *
 * Answers questions like:
 * - "I'm maxing out my 401k — how does that affect my projection?"
 * - "My employer matches 50% up to 6% — is that included?"
 *
 * WASM handles:
 * - Contribution limits (IRS limits, enforced by ContributionLimitTracker)
 * - Catch-up contributions (auto-enabled at age 50+)
 * - Decumulation skip (contributions stop when income < expenses)
 */
export interface ContributionsConfig {
  /**
   * Employee contribution from salary
   */
  employeeContribution?: {
    /** Percentage of gross income to contribute (0-0.75 = 0-75%) */
    percentageOfSalary: number;
    /** Target account type: tax_deferred (401k), roth, or taxable */
    targetAccount: 'tax_deferred' | 'roth' | 'taxable';
  };

  /**
   * Employer matching contribution
   * IMPORTANT: Requires employeeContribution with targetAccount = tax_deferred or roth
   */
  employerMatch?: {
    /** Max salary % employer matches (e.g., 0.06 = 6%) */
    matchUpToPercentage: number;
    /** Match rate (e.g., 0.50 = 50% of employee contribution) */
    matchRate: number;
  };

  // NOTE: growthRate deferred to v8b (complex, not needed for Bronze tier)
}

// =============================================================================
// Social Security Module (v9)
// =============================================================================

/**
 * Social Security income configuration
 *
 * Answers questions like:
 * - "I'm claiming Social Security at 67 — how does that affect my plan?"
 * - "What if I wait until 70 to claim?"
 *
 * CRITICAL SEMANTICS:
 * - monthlyBenefit is in TODAY'S DOLLARS
 * - If colaAdjusted = true, benefits grow at COLA (~2.5%/year) in NOMINAL terms
 * - This is CASHFLOW simulation, not SSA benefit estimation
 */
export interface SocialSecurityConfig {
  /** Age to start claiming (62-70). Can be <= currentAge if already claiming. */
  claimingAge: number;
  /** Expected monthly benefit at claiming age (today's dollars) */
  monthlyBenefit: number;
  /** Apply COLA inflation adjustments (~2.5%/year nominal). Default: true */
  colaAdjusted?: boolean;
}

// =============================================================================
// Roth Conversion Module (v9)
// =============================================================================

/**
 * Roth conversion configuration
 *
 * Answers questions like:
 * - "I want to convert $50k to Roth this year — what's the tax impact?"
 * - "What does a 3-year Roth conversion ladder look like?"
 *
 * CRITICAL SEMANTICS:
 * - Conversions are user-directed actions, NOT optimized
 * - No bracket targeting or tax stacking analysis
 * - Higher/lower outcomes do not imply recommendation
 */
export interface RothConversionConfig {
  /** Year offset from startYear (0 = first year) */
  yearOffset: number;
  /** Amount to convert from tax-deferred to Roth */
  amount: number;
}

// =============================================================================
// Return Assumptions (v13)
// =============================================================================

/**
 * User-controllable return and inflation assumptions
 *
 * Allows overriding the default mean return assumptions used by the
 * Monte Carlo engine. All values are annual rates as decimals.
 *
 * Default values (when not provided):
 * - stockReturn: 0.07 (7% nominal)
 * - bondReturn: 0.03 (3% nominal)
 * - inflationRate: 0.025 (2.5%)
 */
export interface ReturnAssumptions {
  /** Mean annual stock return (nominal), e.g. 0.07 = 7%. Default: 0.07 */
  stockReturn?: number;
  /** Mean annual bond return (nominal), e.g. 0.03 = 3%. Default: 0.03 */
  bondReturn?: number;
  /** Mean annual inflation rate, e.g. 0.025 = 2.5%. Default: 0.025 */
  inflationRate?: number;
}

// =============================================================================
// Concentration Risk (v6a + v6b)
// =============================================================================

/**
 * Concentration risk parameters
 *
 * Models concentrated stock exposure (e.g., company stock, RSUs).
 * The concentrated portion is modeled as a generic high-volatility equity:
 * - 35% annual volatility
 * - 0.75 correlation with S&P 500
 * - Placed in taxable account (common for RSU/company stock)
 *
 * Answers questions like:
 * - v6a: "I have 40% in company stock — how risky is that?"
 * - v6b: "How exposed am I to a 50% loss?" (instant loss comparison)
 */
export interface Concentration {
  /** Percentage of investableAssets in concentrated stock (0-100) */
  concentratedPct: number;

  /**
   * [v6b] Instant loss scenario: percentage drop applied at t=0 (0-100).
   * When provided, triggers comparison mode: runs simulation twice (baseline vs after-loss).
   * This is t=0 repricing, NOT a mid-simulation crash.
   */
  instantLossPct?: number;

  /**
   * [Internal] Override value for concentrated holding.
   * Used by comparison logic to reduce concentrated holding without rebalancing other buckets.
   * NOT exposed in MCP schema - set internally.
   */
  concentrationOverrideValue?: number;
}

// =============================================================================
// Plan Duration (Widget v2)
// =============================================================================

/**
 * Plan Duration showing when plan stops working, expressed as ages
 * This is the PRIMARY output of the simulation widget v2
 */
export interface PlanDuration {
  /** Age when most paths (~50%) reach constraint */
  mostPathsAge: number;
  /** Age when earlier stress paths (10%) reach constraint */
  earlierStressAge: number;
  /** Age when later outcome paths (25%) reach constraint */
  laterOutcomesAge: number;
  /** Age at end of simulation horizon */
  horizonAge: number;
  /** Whether runway is saturated (no constraint observed within horizon) */
  horizonSaturated: boolean;
  /** Human-readable explanation of horizonSaturated */
  horizonSaturatedLabel?: string;
}

/**
 * Starting point snapshot for scenario display
 */
export interface StartingPoint {
  age: number;
  assets: number;
  income: number;
  spending: number;
}

/**
 * Scheduled event for timeline display
 */
export interface ScheduledEvent {
  /** Age when event occurs */
  age: number;
  /** Type of change */
  type: 'income' | 'spending' | 'expense' | 'income_event' | 'social_security' | 'roth_conversion';
  /** New value or change amount */
  change: string;
  /** Human-readable label */
  label: string;
  /** Optional icon hint */
  icon?: string;
}

/**
 * Schedule for scenario section
 */
export interface SimulationSchedule {
  startingPoint: StartingPoint;
  scheduledEvents: ScheduledEvent[];
}

// =============================================================================
// Phase-Aware UI (v1.5)
// =============================================================================

/**
 * Cash flow mode classification based on net flow fraction
 *
 * Cash flow mode uses net flow (income - spending ± events) to determine
 * whether user is primarily accumulating or drawing down wealth.
 *
 * NOTE: This measures cash flow, NOT life stage. If pension + SS >= spending,
 * mode is 'netPositive' even in retirement (no asset drawdown needed).
 *
 * Thresholds:
 * - netPositive: >= 70% of years have positive net flow (income covers expenses)
 * - mixed: 30-70% of years have positive net flow (transition period)
 * - netNegative: <= 30% of years have positive net flow (drawing down assets)
 */
export interface PhaseInfo {
  /** Fraction of years with positive net flow (0.0 to 1.0) */
  accumulationFraction: number;
  /**
   * Cash flow mode based on net flow fraction.
   * - 'netPositive': Income covers expenses in most years
   * - 'mixed': Some years positive, some negative (transition)
   * - 'netNegative': Drawing down assets in most years
   */
  cashFlowMode: 'netPositive' | 'mixed' | 'netNegative';
  /**
   * @deprecated Use cashFlowMode instead. Kept for backward compatibility.
   * Maps: accumulation → netPositive, transition → mixed, decumulation → netNegative
   */
  phase: 'accumulation' | 'transition' | 'decumulation';
  /** Month when cash flow mode changes (if mixed mode) */
  phaseMarkerMonth?: number;
}

/**
 * Net worth trajectory point for percentile fan chart
 *
 * Used to render growth/decay visualization showing
 * P10/P50/P75 bands over time.
 */
export interface NetWorthTrajectoryPoint {
  /** Month offset from simulation start */
  month: number;
  /** 10th percentile net worth at this month */
  p10: number;
  /** 50th percentile (median) net worth at this month */
  p50: number;
  /** 75th percentile net worth at this month */
  p75: number;
}

/**
 * Flexibility curve point for spending headroom analysis
 *
 * Used in decumulation mode to show how much extra spending
 * can be sustained at different runway levels.
 */
export interface FlexibilityCurvePoint {
  /** Extra annual spending above baseline */
  extraAnnualSpending: number;
  /** Resulting median runway in months */
  runwayP50Months: number;
}

// =============================================================================
// Instant Loss Comparison (v6b)
// =============================================================================

/**
 * Comparison data for instant loss scenarios (v6b)
 *
 * When instantLossPct is provided, the MCP server runs the simulation twice:
 * 1. Baseline: Normal simulation
 * 2. After-loss: Concentrated holding reduced by instantLossPct at t=0
 *
 * This answers: "How exposed am I to a big loss in my concentrated position?"
 * This does NOT model mid-simulation crashes, timing, or recovery dynamics.
 */
export interface ComparisonData {
  baseline: {
    mc: NonNullable<SimulationPacketResult['mc']>;
  };
  afterLoss: {
    mc: NonNullable<SimulationPacketResult['mc']>;
  };
  lossParams: {
    /** The requested loss percentage (0-100) */
    instantLossPct: number;
    /** Dollar amount lost from concentrated holding */
    lossAmount: number;
    /** Original value of concentrated holding before loss */
    originalConcentratedValue: number;
    /** Value of concentrated holding after loss */
    afterLossConcentratedValue: number;
  };
  /**
   * Clarifying note about the after-loss scenario.
   * Helps users understand that the main result shows reduced concentrated value.
   */
  note?: string;
}

export interface SimulationPacketResult {
  success: boolean;
  error?: string;


  /**
   * Dollars mode - always shown in output
   * Default: NOMINAL
   */
  dollarsMode?: DollarsMode;

  /**
   * Tax mode - always shown in output
   * Default: NOT_APPLIED
   */
  taxMode?: TaxMode;

  /**
   * Resolved tax configuration (when taxMode !== 'NOT_APPLIED')
   * Contains the actual rates used and display information
   */
  taxConfig?: ResolvedTaxConfig;

  /**
   * Echo of basic inputs for widget display
   * These are the core parameters passed to the simulation
   */
  inputs?: {
    investableAssets: number;
    annualSpending: number;
    currentAge: number;
    expectedIncome: number;
    horizonMonths: number;
    /**
     * Savings rate: (income - spending) / income.
     * Positive = accumulating, negative = drawing down.
     * Only meaningful when income > 0.
     */
    savingsRate?: number;
    /**
     * Annual amount available for savings: income - spending.
     * Positive = surplus, negative = deficit (drawing from assets).
     */
    annualSurplus?: number;
  };

  /**
   * Start year for calendar calculations
   * Required for widget to display correct years alongside ages
   */
  startYear?: number;

  /** Monte Carlo simulation results */
  mc?: {
    /**
     * Probability of spending constraint being reached.
     * Only included when > 0 to avoid pass/fail thinking when always 0.
     * Renamed from everBreachProbability to avoid pass/fail framing.
     */
    constraintProbability?: number;

    /**
     * @deprecated Use constraintProbability instead
     * Kept for backward compatibility with existing code
     */
    everBreachProbability?: number;

    /**
     * Final net worth percentiles (P10/P50/P75 only)
     * P90/P95 removed to avoid "tail theater" distraction
     */
    finalNetWorthP10?: number;
    finalNetWorthP50?: number;
    finalNetWorthP75?: number;

    /** Minimum cash percentiles (P10/P50 only) */
    minCashP10?: number;
    minCashP50?: number;

    /**
     * Runway (months until constraint) percentiles.
     * Runway = time until spending becomes unsustainable.
     * Values are in MONTHS (convert to age: currentAge + runwayP50Months/12).
     *
     * Display policy: P10/P50/P75 only (no P90 - avoids tail theater).
     * P75 is "optimistic but plausible."
     */
    runwayP10Months?: number;
    runwayP50Months?: number;
    runwayP75Months?: number;

    /**
     * Runway as ages (computed from currentAge + runwayMonths/12).
     * More intuitive than months for user communication.
     * E.g., runwayP50Age: 73 means "In typical outcomes, assets last until age 73"
     */
    runwayP10Age?: number;
    runwayP50Age?: number;
    runwayP75Age?: number;

    /**
     * @deprecated Use runwayP75Months instead
     * Kept for backward compatibility with existing code
     */
    runwayP90?: number;

    /**
     * @deprecated Use runwayP10Months instead
     * Kept for backward compatibility with existing code
     */
    runwayP10?: number;
    /**
     * @deprecated Use runwayP50Months instead
     * Kept for backward compatibility with existing code
     */
    runwayP50?: number;
    /**
     * @deprecated Use runwayP75Months instead
     * Kept for backward compatibility with existing code
     */
    runwayP75?: number;

    /** v1.5: Net worth percentile trajectory from WASM engine */
    netWorthTrajectory?: NetWorthTrajectoryPoint[];
  };

  /**
   * v1.5: Phase detection info (accumulation vs decumulation)
   * Determines which UI mode to show in the widget
   */
  phaseInfo?: PhaseInfo;

  /**
   * v2: Plan duration showing when plan stops working (ages)
   * This is the PRIMARY metric for the widget
   */
  planDuration?: PlanDuration;

  /**
   * v2: Schedule for scenario display
   * Contains starting point and scheduled events
   */
  schedule?: SimulationSchedule;

  /**
   * v1.5: Net worth percentile trajectory over time
   * Used for fan chart visualization showing outcome dispersion
   * Sampled at yearly intervals for display efficiency
   */
  netWorthTrajectory?: NetWorthTrajectoryPoint[];

  /**
   * v1.5: Flexibility curve for decumulation mode
   * Shows runway at different extra spending levels
   * Only computed when phase is decumulation and runway is saturated
   */
  flexibilityCurve?: FlexibilityCurvePoint[];

  /**
   * Exemplar path reference (ALWAYS returned, even in summary mode)
   * Use this to replay/inspect the median path
   */
  exemplarPath?: ExemplarPath;

  /**
   * Year-by-year snapshots from exemplar path (verbosity: 'annual' or 'trace')
   */
  annualSnapshots?: AnnualSnapshot[];

  /**
   * First-month events per year for "show the math" in widget inspector
   * Lightweight: only first month (January) of each displayed year
   * Map of age → array of events
   */
  firstMonthEvents?: FirstMonthEvents;

  /**
   * Full trace data (verbosity: 'trace' only)
   */
  trace?: TraceData;

  /**
   * Note about trace limitations (when trace/annual data couldn't be generated)
   * Includes workaround suggestions and the exemplarPath seed for manual replay
   */
  traceNote?: {
    message: string;
    exemplarPathSeed?: number;
    workaround?: string;
  };

  // ==========================================================================
  // Event Modules Echo (for widget display)
  // ==========================================================================

  /** Income change module (echoed from input for widget display) */
  incomeChange?: IncomeChange;

  /** Income streams (echoed from input for widget display) */
  incomeStreams?: IncomeStream[];

  /** Spending change module (echoed from input for widget display) */
  spendingChange?: SpendingChange;

  /** One-time events (echoed from input for widget display) */
  oneTimeEvents?: OneTimeEvent[];

  /** Account buckets (echoed from input for widget display) */
  accountBuckets?: AccountBuckets;

  /** Asset allocation (echoed from input for widget display) */
  assetAllocation?: AssetAllocation;

  /** Concentration risk (echoed from input for widget display) */
  concentration?: Concentration;

  /** Healthcare config (echoed from input for widget display) */
  healthcare?: HealthcareConfig;

  /** Contributions config (echoed from input for widget display) */
  contributions?: ContributionsConfig;

  /** Social Security config (echoed from input for widget display) */
  socialSecurity?: SocialSecurityConfig;

  /** Roth conversions (echoed from input for widget display) */
  rothConversions?: RothConversionConfig[];

  /** Withdrawal strategy (echoed from input for widget display) */
  withdrawalStrategy?: WithdrawalStrategy;

  /** Cash reserve config (echoed from input for widget display) */
  cashReserve?: CashReserveConfig;

  /** Rebalancing config (echoed from input for widget display) */
  rebalancing?: RebalancingConfig;

  /** Return assumptions (echoed from input for widget/model display) */
  returnAssumptions?: ReturnAssumptions;

  /**
   * Modeling choices made for this simulation.
   * Shown in widget under "Modeling Assumptions" section.
   */
  modelingChoices?: Array<{
    category: string;
    description: string;
  }>;

  /** Blocked outputs for Bronze tier (features requiring Silver/Gold) */
  blockedOutputs?: Array<{
    outputName: string;
    reason: string;
    upgradeMessage: string;
  }>;

  /**
   * [v6b] Comparison data for instant loss scenarios.
   * Present when concentration.instantLossPct was provided.
   * Contains baseline and after-loss MC results for side-by-side display.
   */
  comparison?: ComparisonData;

  /** Hash of engine inputs for determinism verification */
  engineInputsHash?: string;

  /** Base seed used for MC paths */
  baseSeed?: number;

  /** Number of MC paths run */
  pathsRun?: number;

  /** Flag indicating this was a direct replay (no MC run) */
  replayMode?: boolean;

  /**
   * Warning when path count is low (< 100).
   * Low path counts increase variance between runs, making percentile estimates less stable.
   */
  varianceWarning?: string;

  // ==========================================================================
  // Audit Metadata (for replay/verification)
  // ==========================================================================

  /**
   * Engine version string (e.g., "PFOS-E v1.9.0")
   * Used for audit trail and reproducibility
   */
  engineVersion?: string;

  /**
   * Schema version for the packet format (e.g., "1.0.0")
   * Allows future format changes while maintaining compatibility
   */
  schemaVersion?: string;

  /**
   * ISO timestamp when simulation was run
   * For audit trail (not used in determinism - that's seed-based)
   */
  timestamp?: string;

  /**
   * Tax fidelity level for this run
   * - 'none': No tax calculations
   * - 'simplified': Default assumptions applied
   * - 'user_declared': User-provided rates
   */
  taxFidelity?: 'none' | 'simplified' | 'user_declared';
}
