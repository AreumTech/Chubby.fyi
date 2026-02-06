/**
 * Shared Tool Definition for run_simulation_packet
 *
 * Single source of truth for the MCP tool schema and description.
 * Used by server.ts (SSE/HTTP transport for ChatGPT).
 */

// Widget template URI (ChatGPT Apps SDK pattern)
// Version suffix for cache busting - increment when widget changes
export const WIDGET_VERSION = 'v27';
export const WIDGET_TEMPLATE_URI = `ui://widget/simulation-summary-${WIDGET_VERSION}.html`;

/**
 * Tool description for ChatGPT/LLM consumption.
 * Includes response guidelines and design context.
 */
export const TOOL_DESCRIPTION =
  'Use this when the user wants a Monte Carlo projection of "what tends to happen under these assumptions" (retirement, spending changes, big purchases). ' +
  'Do NOT use for recommendations, advice, or "what should I do?" decisions. ' +
  'If required inputs are missing (assets, spending, age, income), ask the user before calling. ' +
  'If seed/start year are missing, set seed = Date.now() and startYear = current calendar year.' +
  '\n\nCRITICAL RESPONSE GUIDELINES (you MUST follow these when presenting results):' +
  '\n- SHOW the embedded widget if present; otherwise surface the visualization link from tool output' +
  '\n- DO NOT add evaluative language ("good position", "on track", "elite", "wealthy", "safe", "likely")' +
  '\n- DO NOT give advice or rules of thumb (no "4% rule", no "you could retire at X")' +
  '\n- DO NOT make predictions ("you will", "you\'re likely to")' +
  '\n- DO explain what the percentiles mean mechanically (P10 = 10% of paths ended below this)' +
  '\n- DO offer to explore scenarios ("What if spending increased?" "What if you retired earlier?")' +
  '\n- KEEP explanations under 100 words - the widget carries the information' +
  '\n- FRAME as "under these assumptions, simulations show..." not "you are/will be..."' +
  '\n\nDESIGN CONTEXT (why we do things this way):' +
  '\n- Default to age 80: Unless user specifies otherwise via maxAge parameter, simulate until age 80. Use maxAge up to 100 for extended projections (with caveats about uncertainty beyond 90).' +
  '\n- P10/P50/P75 not P10/P90: We avoid P90 ("tail theater") because extreme percentiles are noisy and create false confidence. P75 is "optimistic but plausible."' +
  '\n- P75 can be very high: A small number of high-return paths dominate upside percentiles. Most outcomes cluster far below P75. This is expected, not a bug.' +
  '\n- Asymmetric range (10th to 75th): Downside risk matters more than upside luck. P10 shows "harder scenarios" worth planning for; P75 caps optimism.' +
  '\n- "Constraint" not "failure": Running out of money triggers spending adjustment, not catastrophe. We model when baseline spending becomes unsustainable.' +
  '\n- No summary success probability: We don\'t show "X% chance of success" because it implies binary pass/fail. Instead, trajectory shows pctPathsFunded (% of paths still funded at each age) for constraint timing.' +
  '\n- Runway available as MONTHS or AGE: runwayP10Months/P50Months/P75Months are months until constraint. runwayP10Age/P50Age/P75Age are the same as ages (more intuitive).' +
  '\n- Zero/negative P10: When P10 is 0 or negative, say "In 10% of scenarios, assets are depleted by age X" (not "you go broke").' +
  '\n- Paths STOP at bankruptcy: When a path cannot meet spending (all assets depleted), simulation STOPS for that path. It does NOT continue or resurrect. Display floors bankrupt paths to $0 (runway tells you WHEN it happened).' +
  '\n- Phase meanings: "accumulation" = income exceeds spending (building wealth), "decumulation" = spending exceeds income (drawing down), "transition" = mixed (some years accumulating, some drawing down)' +
  '\n- Default assumptions: Tax=federal single filer (~22%), returns=stocks 7%/bonds 3% nominal, inflation=3%, account mix=10% cash/30% taxable/60% tax-deferred, asset mix=70% stocks/30% bonds' +
  '\n\nREQUIRED INPUTS: investableAssets, annualSpending, currentAge, expectedIncome (gross, 0 if retired), seed (use Date.now()), startYear' +
  '\n\nEXAMPLE - "I\'m 40 with $300k, make $100k, spend $50k. Can I retire at 60?":' +
  '\n{"seed": 1738368000, "startYear": 2026, "investableAssets": 300000, "annualSpending": 50000, "currentAge": 40, "expectedIncome": 100000, "incomeChange": {"monthOffset": 240, "newAnnualIncome": 0, "description": "Retire at 60"}}' +
  '\n\nCOMMON PATTERNS:' +
  '\n- Retirement: incomeChange.newAnnualIncome = 0 at retirement month' +
  '\n- Job change: incomeChange.newAnnualIncome = new salary' +
  '\n- Large purchase: oneTimeEvents with type "expense"' +
  '\n- Social Security: socialSecurity with claimingAge and monthlyBenefit' +
  '\n\nOUTPUT STRUCTURE:' +
  '\n- success: boolean' +
  '\n- runId: unique identifier (e.g., "AF-7K3P9")' +
  '\n- inputs.savingsRate: (income - spending) / income. Positive = accumulating, negative = drawing down.' +
  '\n- inputs.annualSurplus: income - spending. Positive = saving, negative = deficit.' +
  '\n- mc.finalNetWorthP10/P50/P75: ending net worth by percentile (floored at $0 - bankrupt paths show as 0)' +
  '\n- mc.runwayP10Months/P50Months/P75Months: MONTHS until spending constraint' +
  '\n- mc.runwayP10Age/P50Age/P75Age: AGES when constraint is reached (more intuitive than months)' +
  '\n- mc.constraintProbability: fraction of paths that hit constraint (0-1). If <0.5, most paths never deplete.' +
  '\n- trajectory[].pctPathsFunded: % of paths still funded at each age (1.0 = all paths OK, 0.5 = half reached constraint)' +
  '\n- planDuration: ages when plan stops working (mostPathsAge, earlierStressAge, horizonAge)' +
  '\n- phaseInfo: { phase: "accumulation"|"transition"|"decumulation", accumulationFraction: 0-1 }' +
  '\n- Widget renders automatically with trajectory chart and scenario details';

/**
 * Input schema for run_simulation_packet tool.
 * Defines all parameters the tool accepts.
 */
export const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    investableAssets: {
      type: 'number',
      description:
        'Total investable assets in dollars. If missing, ask: "How much do you have invested today (excluding home equity)?"',
      minimum: 0,
    },
    annualSpending: {
      type: 'number',
      description: 'Annual spending in dollars. If missing, ask: "What is your annual spending?"',
      minimum: 0,
    },
    currentAge: {
      type: 'number',
      description:
        'Current age in years. Simulation projects to maxAge (default: 80, configurable up to 100). If missing, ask: "What is your current age?"',
      minimum: 0,
    },
    expectedIncome: {
      type: 'number',
      description:
        'Annual GROSS income (pre-tax) in dollars. Use 0 for retirement scenarios. If missing, ask: "What is your current gross annual income (0 if retired)?"',
      minimum: 0,
    },
    seed: {
      type: 'number',
      description: 'Random seed for deterministic replay. If not provided, set to Date.now().',
    },
    startYear: {
      type: 'number',
      description: 'Simulation start year (e.g., 2026). If not provided, use the current year.',
    },
    mcPaths: {
      type: 'number',
      description: 'Number of Monte Carlo paths. Use 100 (default). Higher values increase latency.',
      default: 100,
    },
    horizonMonths: {
      type: 'number',
      description: 'Simulation horizon in months. Default: (maxAge - currentAge) * 12. Auto-capped to not exceed maxAge.',
    },
    maxAge: {
      type: 'number',
      description:
        'Maximum age for simulation projection (default: 80, max: 100). ' +
        'Projections beyond age 90 carry significant uncertainty due to longevity, healthcare, and economic assumptions.',
      default: 80,
      minimum: 50,
      maximum: 100,
    },
    verbosity: {
      type: 'string',
      enum: ['summary', 'annual', 'trace'],
      description:
        "Output verbosity: 'annual' (default) = MC aggregates + year-by-year snapshots + first-month events for 'show the math'; " +
        "'summary' = MC aggregates only; 'trace' = add full month-by-month ledger",
      default: 'annual',
    },
    pathSeed: {
      type: 'number',
      description:
        '[Advanced] Specific path seed to replay. Skips MC and replays this exact path with full trace. ' +
        'Use exemplarPath.pathSeed from a previous run to inspect that path in detail.',
    },
    taxAssumptions: {
      type: 'object',
      description:
        'Tax configuration. DEFAULT: Federal single filer (~22% effective, 15% LTCG) applied automatically. ' +
        "Use mode='not_applied' to disable taxes. Use mode='user_declared' for custom rates.",
      properties: {
        mode: {
          type: 'string',
          enum: ['not_applied', 'user_declared', 'default_assumptions'],
          description: "Tax mode. Defaults to federal single filer if omitted. Use 'not_applied' to disable.",
        },
        filingStatus: {
          type: 'string',
          enum: ['single', 'married'],
          description: "Default: 'single'",
        },
        state: {
          type: 'string',
          description: "Two-letter state code. 'NONE' for federal-only (default)",
        },
        effectiveRateRange: {
          type: 'array',
          items: { type: 'number' },
          description: 'Effective tax rate range [min, max]',
        },
        capitalGainsRateRange: {
          type: 'array',
          items: { type: 'number' },
          description: 'Capital gains rate range [min, max]',
        },
      },
      required: ['mode'],
    },
    accountBuckets: {
      type: 'object',
      description:
        'Account allocation percentages (must sum to 100). Default: 10% cash, 30% taxable, 60% tax-deferred. ' +
        'IMPORTANT: These are PERCENTAGES (0-100), NOT dollar amounts. ' +
        'Use either original names (cash, taxable) OR Pct-suffixed names (cashPct, taxablePct) for clarity. ' +
        'Example: { "cashPct": 10, "taxablePct": 30, "taxDeferredPct": 60 } means 10% in cash, 30% in taxable, 60% in tax-deferred.',
      properties: {
        cash: {
          type: 'number',
          description: 'Cash/savings allocation PERCENTAGE (0-100)',
          minimum: 0,
          maximum: 100,
        },
        cashPct: {
          type: 'number',
          description: 'Cash/savings allocation PERCENTAGE (0-100) - explicit alias',
          minimum: 0,
          maximum: 100,
        },
        taxable: {
          type: 'number',
          description: 'Taxable brokerage allocation PERCENTAGE (0-100)',
          minimum: 0,
          maximum: 100,
        },
        taxablePct: {
          type: 'number',
          description: 'Taxable brokerage allocation PERCENTAGE (0-100) - explicit alias',
          minimum: 0,
          maximum: 100,
        },
        taxDeferred: {
          type: 'number',
          description: 'Tax-deferred 401k/IRA allocation PERCENTAGE (0-100)',
          minimum: 0,
          maximum: 100,
        },
        taxDeferredPct: {
          type: 'number',
          description: 'Tax-deferred 401k/IRA allocation PERCENTAGE (0-100) - explicit alias',
          minimum: 0,
          maximum: 100,
        },
        roth: {
          type: 'number',
          description: 'Roth IRA/401k allocation PERCENTAGE (0-100)',
          minimum: 0,
          maximum: 100,
        },
        rothPct: {
          type: 'number',
          description: 'Roth IRA/401k allocation PERCENTAGE (0-100) - explicit alias',
          minimum: 0,
          maximum: 100,
        },
        hsa: {
          type: 'number',
          description: 'HSA allocation PERCENTAGE (0-100)',
          minimum: 0,
          maximum: 100,
        },
        hsaPct: {
          type: 'number',
          description: 'HSA allocation PERCENTAGE (0-100) - explicit alias',
          minimum: 0,
          maximum: 100,
        },
      },
    },
    assetAllocation: {
      type: 'object',
      description:
        'Asset allocation (stock/bond mix). Default: 70% stocks, 30% bonds. ' +
        "Use 'glide_path' strategy to automatically reduce stocks as retirement approaches.",
      properties: {
        strategy: {
          type: 'string',
          enum: ['fixed', 'glide_path'],
          description: "'fixed' (default): constant stock %. 'glide_path': reduces stocks near retirement.",
        },
        stockPercentage: {
          type: 'number',
          description: 'Stock % (0-100) for fixed strategy. Default: 70.',
          minimum: 0,
          maximum: 100,
        },
        retirementAge: {
          type: 'number',
          description: 'Target retirement age for glide_path (50-80). Default: 65.',
          minimum: 50,
          maximum: 80,
        },
      },
    },
    incomeStreams: {
      type: 'array',
      description:
        'Multiple income streams for dual-earner households or multiple income sources. ' +
        'Each stream has its own amount, start/end timing, and description. ' +
        'Use this instead of incomeChange when modeling multiple distinct income sources. ' +
        'Example: [{"annualAmount": 80000, "endMonthOffset": 120, "description": "Spouse salary - retires at 60"}]',
      items: {
        type: 'object',
        properties: {
          annualAmount: {
            type: 'number',
            description: 'Annual income amount in dollars (gross)',
            minimum: 0,
          },
          startMonthOffset: {
            type: 'number',
            description: 'Month when this income stream starts (0 = now, default: 0)',
            minimum: 0,
          },
          endMonthOffset: {
            type: 'number',
            description: 'Month when this income stream ends (omit for indefinite/until horizon)',
            minimum: 0,
          },
          description: {
            type: 'string',
            description: 'Description for display (e.g., "Spouse salary", "Rental income")',
          },
          taxable: {
            type: 'boolean',
            description: 'Whether this income is taxable (default: true)',
            default: true,
          },
        },
        required: ['annualAmount', 'description'],
      },
    },
    incomeChange: {
      type: 'object',
      description:
        'Income regime change for retirement, job change, layoff, or sabbatical. Use newAnnualIncome=0 for retirement. ' +
        'For multiple income streams (dual-earner households), use incomeStreams instead.',
      properties: {
        monthOffset: {
          type: 'number',
          description: 'Month when change occurs (0 = now, 120 = 10 years)',
        },
        newAnnualIncome: {
          type: 'number',
          description: 'New GROSS annual income. Use 0 for retirement/sabbatical.',
        },
        durationMonths: {
          type: 'number',
          description:
            'ONLY for temporary changes (sabbaticals, parental leave). ' +
            'DO NOT include this field for permanent changes like retirement. ' +
            'If set, income reverts to original after this many months.',
        },
        description: {
          type: 'string',
          description: 'Human-readable label (e.g., "Retire at 60")',
        },
      },
      required: ['monthOffset', 'newAnnualIncome'],
    },
    spendingChange: {
      type: 'object',
      description: 'Spending regime change (retirement, lifestyle)',
      properties: {
        monthOffset: {
          type: 'number',
          description: 'Month when change occurs',
        },
        newAnnualSpending: {
          type: 'number',
          description: 'New annual spending',
        },
        description: {
          type: 'string',
          description: 'Description of the change',
        },
      },
      required: ['monthOffset', 'newAnnualSpending'],
    },
    oneTimeEvents: {
      type: 'array',
      description: 'One-time events (purchases, bonuses, tuition)',
      items: {
        type: 'object',
        properties: {
          monthOffset: {
            type: 'number',
            description: 'Month when event occurs',
          },
          amount: {
            type: 'number',
            description: 'Dollar amount (positive)',
          },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'Direction',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          recurring: {
            type: 'object',
            description:
              'ONLY for repeating events (tuition over 4 years, monthly payments). ' +
              'DO NOT include this field for single one-time events like home purchases or bonuses.',
            properties: {
              count: {
                type: 'number',
                description: 'How many times total (must be >= 1)',
              },
              intervalMonths: {
                type: 'number',
                description: 'Months between occurrences (default: 1 for monthly)',
              },
            },
            required: ['count'],
          },
        },
        required: ['monthOffset', 'amount', 'type', 'description'],
      },
    },
    concentration: {
      type: 'object',
      description:
        'Concentrated stock exposure (e.g., company stock, RSUs). ' +
        'Modeled as generic high-volatility equity (35% vol, 0.75 SPY correlation). ' +
        'Add instantLossPct to compare baseline vs. after-loss scenarios (t=0 repricing).',
      properties: {
        concentratedPct: {
          type: 'number',
          description: 'Percentage of assets in concentrated stock (0-100)',
          minimum: 0,
          maximum: 100,
        },
        instantLossPct: {
          type: 'number',
          description:
            'Instant loss scenario: percentage drop applied at t=0 (0-100). ' +
            'Returns comparison with baseline. Does NOT model mid-simulation crashes.',
          minimum: 0,
          maximum: 100,
        },
      },
      required: ['concentratedPct'],
    },
    healthcare: {
      type: 'object',
      description: 'Healthcare cost modeling. Split by pre/post Medicare (age 65).',
      properties: {
        preMedicare: {
          type: 'object',
          description: 'Healthcare costs before age 65',
          properties: {
            monthlyPremium: {
              type: 'number',
              description: 'Monthly premium in dollars',
            },
            source: {
              type: 'string',
              enum: ['employer', 'aca', 'cobra', 'spouse', 'none'],
              description: 'Insurance source',
            },
            annualDeductible: {
              type: 'number',
              description: 'Annual deductible (default: 3000)',
            },
            outOfPocketMax: {
              type: 'number',
              description: 'Annual out-of-pocket max (default: 8000)',
            },
          },
          required: ['monthlyPremium', 'source'],
        },
        postMedicare: {
          type: 'object',
          description: 'Healthcare costs at age 65+',
          properties: {
            monthlyPremium: {
              type: 'number',
              description: 'Monthly premium (Part B + supplement)',
            },
            supplementType: {
              type: 'string',
              enum: ['medigap', 'advantage', 'none'],
              description: 'Type of Medicare supplement',
            },
          },
          required: ['monthlyPremium', 'supplementType'],
        },
        inflationRate: {
          type: 'number',
          description: 'Healthcare inflation rate (default: 0.05 = 5%)',
        },
      },
    },
    contributions: {
      type: 'object',
      description: 'Retirement contribution modeling (401k, employer match).',
      properties: {
        employeeContribution: {
          type: 'object',
          description: 'Employee contribution from salary',
          properties: {
            percentageOfSalary: {
              type: 'number',
              description: 'Percentage of gross income (0-0.75)',
              minimum: 0,
              maximum: 0.75,
            },
            targetAccount: {
              type: 'string',
              enum: ['tax_deferred', 'roth', 'taxable'],
              description: 'Account type to contribute to',
            },
          },
          required: ['percentageOfSalary', 'targetAccount'],
        },
        employerMatch: {
          type: 'object',
          description: 'Employer matching. Requires employeeContribution with targetAccount = tax_deferred or roth.',
          properties: {
            matchUpToPercentage: {
              type: 'number',
              description: 'Max salary % employer matches (e.g., 0.06 = 6%)',
            },
            matchRate: {
              type: 'number',
              description: 'Match rate (e.g., 0.50 = 50%)',
            },
          },
          required: ['matchUpToPercentage', 'matchRate'],
        },
      },
    },
    socialSecurity: {
      type: 'object',
      description:
        'Social Security income modeling. Benefit starts at claiming age. ' +
        "IMPORTANT: monthlyBenefit is the user's expected benefit in TODAY'S DOLLARS. " +
        'This is a simplification for cashflow simulation, NOT an SSA benefit calculation. ' +
        'Users typically get their estimate from ssa.gov/myaccount. ' +
        'The simulation applies COLA (~2.5%/year) to this value going forward. ' +
        'This differs from SSA estimates which project future earnings and apply wage indexing.',
      properties: {
        claimingAge: {
          type: 'number',
          description: 'Age to start claiming (62-70). Can be <= currentAge if already claiming.',
          minimum: 62,
          maximum: 70,
        },
        monthlyBenefit: {
          type: 'number',
          description:
            "Expected monthly benefit at claiming age in TODAY'S dollars. " +
            "Get this from ssa.gov/myaccount or estimate ~40% of current income for typical earners. " +
            "Simulation applies COLA going forward, so enter the value in today's purchasing power.",
          minimum: 0,
        },
        colaAdjusted: {
          type: 'boolean',
          description: 'Apply COLA inflation adjustments (~2.5%/year nominal). Default: true',
          default: true,
        },
      },
      required: ['claimingAge', 'monthlyBenefit'],
    },
    withdrawalStrategy: {
      type: 'string',
      enum: ['tax_efficient', 'pro_rata', 'roth_first'],
      description:
        "Control which accounts are drawn down first during decumulation. " +
        "'tax_efficient' (default): Cash → Taxable → Tax-Deferred → Roth (minimizes lifetime taxes). " +
        "'pro_rata': Proportional withdrawals from all accounts (maintains allocation). " +
        "'roth_first': Roth → Taxable → Tax-Deferred → Cash (preserve tax-deferred growth).",
    },
    cashReserve: {
      type: 'object',
      description: 'Cash reserve target. Default: 6 months of expenses.',
      properties: {
        targetMonths: {
          type: 'number',
          description: 'Target as months of expenses',
          minimum: 0,
        },
        targetAmount: {
          type: 'number',
          description: 'Target as absolute dollars',
          minimum: 0,
        },
        autoInvestExcess: {
          type: 'boolean',
          description: 'Auto-invest excess cash',
        },
      },
    },
    rebalancing: {
      type: 'object',
      description: 'Portfolio rebalancing. Default: 5% threshold, quarterly.',
      properties: {
        method: {
          type: 'string',
          enum: ['threshold', 'periodic', 'none'],
        },
        thresholdPct: {
          type: 'number',
          description: 'Drift threshold (0.05 = 5%)',
        },
        frequency: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'annually'],
        },
      },
    },
    debt: {
      type: 'object',
      description: 'Debt modeling (student loans, mortgages, etc.)',
      properties: {
        debts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              balance: { type: 'number' },
              interestRate: { type: 'number' },
              minimumPayment: { type: 'number' },
            },
            required: ['id', 'balance', 'interestRate', 'minimumPayment'],
          },
        },
        payoffStrategy: {
          type: 'string',
          enum: ['avalanche', 'snowball'],
        },
        extraMonthlyPayment: { type: 'number' },
      },
    },
    rothConversions: {
      type: 'array',
      description:
        'Roth conversion events. Converts from tax-deferred to Roth. Taxed as ordinary income in conversion year. ' +
        'NOTE: User-directed conversions only — no bracket optimization.',
      items: {
        type: 'object',
        properties: {
          yearOffset: {
            type: 'number',
            description: 'Year offset from startYear (0 = first year)',
            minimum: 0,
          },
          amount: {
            type: 'number',
            description: 'Amount to convert from tax-deferred to Roth',
            minimum: 0,
          },
        },
        required: ['yearOffset', 'amount'],
      },
    },
  },
  required: ['investableAssets', 'annualSpending', 'currentAge', 'expectedIncome', 'seed', 'startYear'],
};

/**
 * Tool annotations for MCP/ChatGPT Apps
 */
export const TOOL_ANNOTATIONS = {
  readOnlyHint: true, // Computation only, no side effects
  destructiveHint: false,
  openWorldHint: false, // No external API calls
  idempotentHint: true,
} as const;

/**
 * Complete tool definition object for MCP
 */
export const RUN_SIMULATION_TOOL = {
  name: 'run_simulation_packet',
  description: TOOL_DESCRIPTION,
  inputSchema: TOOL_INPUT_SCHEMA,
  annotations: TOOL_ANNOTATIONS,
};
