# MCP Parameter Reference

This document lists all parameters for `run_simulation_packet` and clarifies what's exposed in the ChatGPT App vs what exists only in the simulation engine.

> **Note:** ChatGPT/Claude receive documentation via MCP tool metadata (name, description, inputSchema) defined in `src/server-sse.ts`. This file is human-readable reference only.

## Quick Reference

| Feature | MCP Exposed | Engine Only | Notes |
|---------|:-----------:|:-----------:|-------|
| Core inputs (assets, spending, age, income) | ✅ | | Required |
| Monte Carlo config (paths, horizon, verbosity) | ✅ | | Optional |
| Account allocation (cash/taxable/tax-deferred/roth/hsa) | ✅ | | Percentages sum to 100 |
| Asset allocation (fixed or glide path) | ✅ | | v10: stock/bond mix |
| Tax assumptions (3 modes) | ✅ | | **ON by default** (federal single filer) |
| Withdrawal strategy selection | ✅ | | v11: tax_efficient, pro_rata, roth_first |
| Cash reserve targets | ✅ | | v11: months or absolute amount |
| Rebalancing configuration | ✅ | | v11: threshold, periodic, or none |
| Debt modeling | ✅ | | v11: avalanche or snowball payoff |
| Income/spending regime changes | ✅ | | Job changes, retirement |
| One-time events (purchases, bonuses) | ✅ | | Single or recurring |
| Concentration risk + instant loss | ✅ | | v6b comparison mode |
| Healthcare (pre/post Medicare) | ✅ | | With healthcare inflation |
| Contributions + employer match | ✅ | | 401k/Roth contributions |
| Social Security | ✅ | | Claiming age 62-70 |
| Roth conversions | ✅ | | User-directed only |
| Tax-loss harvesting | | ✅ | Not exposed (requires Silver tier) |
| Strategic capital gains | | ✅ | Not exposed |

---

## Exposed Parameters (MCP Server)

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `seed` | number | Random seed for deterministic replay |
| `startYear` | number | Simulation start year (e.g., 2026) |
| `investableAssets` | number | Total investable assets ($) |
| `annualSpending` | number | Annual spending ($) |
| `currentAge` | number | Current age (18-100) |
| `expectedIncome` | number | Annual **GROSS** income ($), 0 for retirement |

**Income Tax Handling:**
- `expectedIncome` is **gross** (pre-tax) salary
- The engine applies IRS progressive withholding (~10-25% depending on income)
- Payroll taxes (FICA) are tracked for year-end reconciliation
- This is separate from withdrawal taxes (see Tax Configuration below)

### Monte Carlo Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mcPaths` | number | 100 | Number of Monte Carlo paths (1-10,000) |
| `horizonMonths` | number | (80 - age) × 12 | Simulation duration, auto-capped at age 80 |
| `verbosity` | string | `'summary'` | Output detail: `'summary'`, `'annual'`, `'trace'` |
| `pathSeed` | number | — | Replay specific path from previous run |

### Account Buckets (v5)

```typescript
accountBuckets: {
  cash?: number,        // 0-100, default 10
  taxable?: number,     // 0-100, default 30
  taxDeferred?: number, // 0-100, default 60
  roth?: number,        // 0-100, default 0
  hsa?: number          // 0-100, default 0
}
// Must sum to 100
```

### Asset Allocation (v10)

```typescript
assetAllocation: {
  strategy?: 'fixed' | 'glide_path',  // default: 'fixed'
  stockPercentage?: number,           // 0-100, default: 70 (for fixed)
  retirementAge?: number              // 50-80, default: 65 (for glide_path)
}
```

**Strategies:**
- `fixed` (default) — Uses `stockPercentage` throughout simulation
- `glide_path` — **Dynamically** recalculates stock % at each quarterly rebalancing based on simulated age vs retirement age

**Glide Path Brackets:**

| Years to Retirement | Stock % |
|---------------------|---------|
| 30+ | 90% |
| 20-29 | 80% |
| 10-19 | 65% |
| 5-9 | 50% |
| 0-4 | 30% |

**Examples:**
```json
// Fixed 80/20 allocation
{ "assetAllocation": { "strategy": "fixed", "stockPercentage": 80 } }

// Glide path retiring at 60
{ "assetAllocation": { "strategy": "glide_path", "retirementAge": 60 } }

// Default (omit entirely): 70% stocks, fixed
```

### Tax Assumptions

```typescript
taxAssumptions?: {
  mode: 'not_applied' | 'user_declared' | 'default_assumptions',
  filingStatus?: 'single' | 'married',  // default: 'single'
  state?: string,                        // default: 'NONE' (federal only)
  effectiveRateRange?: [number, number], // default: [0.20, 0.25]
  capitalGainsRateRange?: [number, number] // default: [0.15, 0.15]
}
```

**Modes:**
- `default_assumptions` (**default if omitted**) — Federal single filer (~22% effective, 15% LTCG)
- `not_applied` — Explicitly disable all taxes
- `user_declared` — Custom rates with `effectiveRateRange` and `capitalGainsRateRange`

**Tax Withholding (v11):**

Taxes are applied as **immediate withholding** on withdrawals:
- **Tax-deferred** (401k/IRA): Full amount taxed at `effectiveRate`
- **Taxable** (brokerage): Only gains taxed — LTCG at `capitalGainsRate`, STCG at `effectiveRate`
- **Roth**: Tax-free (no withholding)
- **Cash**: No tax

**Examples:**
```json
// Default (omit entirely): Federal single filer taxes applied
{}

// Explicitly disable taxes
{ "taxAssumptions": { "mode": "not_applied" } }

// Custom rates (married, Texas)
{
  "taxAssumptions": {
    "mode": "user_declared",
    "filingStatus": "married",
    "state": "TX",
    "effectiveRateRange": [0.18, 0.22],
    "capitalGainsRateRange": [0.12, 0.15]
  }
}
```

### Income Change (v4)

```typescript
incomeChange: {
  monthOffset: number,      // When change occurs (0 = now)
  newAnnualIncome: number,  // New income (0 for retirement/sabbatical)
  durationMonths?: number,  // Optional: reverts after N months
  description?: string      // Optional label
}
```

**Patterns:**
- Job change: `{ monthOffset: 12, newAnnualIncome: 150000 }`
- Layoff: `{ monthOffset: 24, newAnnualIncome: 0, durationMonths: 6 }`
- Retirement: `{ monthOffset: 120, newAnnualIncome: 0 }`

### Spending Change (v4)

```typescript
spendingChange: {
  monthOffset: number,        // When change occurs
  newAnnualSpending: number,  // New spending level
  description?: string,       // Optional label
  inflationBase?: 'simulation_start' | 'event_start'  // v11: inflation reference point
}
```

**Inflation Behavior:**

All spending events are inflated at 2.5% annually. The `inflationBase` controls the reference point:

- `simulation_start` (default) — Amount is in **today's dollars**. Inflation is applied from month 0. A $110k retirement spending at age 55 (month 120) becomes ~$141k in year 1 of retirement (10 years of inflation).

- `event_start` — Amount is in **event date dollars**. Inflation is applied only from the spending change date. A $110k retirement spending stays ~$110k in year 1 of retirement.

**Example - Retirement at age 55 (month 120):**
```json
// Today's dollars: $110k becomes ~$141k at retirement due to 10yr inflation
{ "spendingChange": { "monthOffset": 120, "newAnnualSpending": 110000 } }

// Retirement-year dollars: $110k stays ~$110k at retirement start
{ "spendingChange": { "monthOffset": 120, "newAnnualSpending": 110000, "inflationBase": "event_start" } }
```

### One-Time Events (v4)

```typescript
oneTimeEvents: [
  {
    monthOffset: number,     // When event occurs
    amount: number,          // Dollar amount (positive)
    type: 'income' | 'expense',
    description: string,     // Required label
    recurring?: {
      count: number,         // Total occurrences
      intervalMonths?: number // Default: 1 (monthly)
    }
  }
]
```

**Income Tax Handling:**
- `type: 'income'` events are **gross** amounts (pre-tax)
- The engine applies IRS supplemental wage withholding:
  - 22% flat rate for amounts ≤ $1M
  - 37% for amounts > $1M
- Example: `amount: 50000` bonus → $39,000 net after 22% withholding

**Patterns:**
- Home purchase: `{ monthOffset: 24, amount: 300000, type: 'expense', description: 'Down payment' }`
- Bonus: `{ monthOffset: 6, amount: 50000, type: 'income', description: 'Sign-on bonus' }` (→ $39k net)
- Tuition: `{ monthOffset: 12, amount: 50000, type: 'expense', description: 'College', recurring: { count: 4, intervalMonths: 12 } }`

### Concentration Risk (v6b)

```typescript
concentration: {
  concentratedPct: number,   // 0-100, % of assets in concentrated stock
  instantLossPct?: number    // 0-100, triggers comparison mode
}
```

When `instantLossPct` is provided, runs two simulations (baseline vs after-loss) and returns comparison data.

### Healthcare (v7)

```typescript
healthcare: {
  preMedicare?: {
    monthlyPremium: number,   // e.g., 800 for ACA
    source: 'employer' | 'aca' | 'cobra' | 'spouse' | 'none',
    annualDeductible?: number,   // default: 3000
    outOfPocketMax?: number      // default: 8000
  },
  postMedicare?: {
    monthlyPremium: number,   // Part B + supplement
    supplementType: 'medigap' | 'advantage' | 'none'
  },
  inflationRate?: number      // default: 0.05 (5%/year)
}
```

### Contributions (v8)

```typescript
contributions: {
  employeeContribution?: {
    percentageOfSalary: number,  // 0-0.75 (0-75%)
    targetAccount: 'tax_deferred' | 'roth' | 'taxable'
  },
  employerMatch?: {
    matchUpToPercentage: number, // 0-0.10 (0-10% of salary)
    matchRate: number            // 0-1.0 (e.g., 0.5 = 50% match)
  }
}
```

**Note:** Employer match requires `employeeContribution` with `targetAccount` = `tax_deferred` or `roth`.

### Social Security (v9)

```typescript
socialSecurity: {
  claimingAge: number,      // 62-70
  monthlyBenefit: number,   // Today's dollars
  colaAdjusted?: boolean    // default: true (grows with inflation)
}
```

### Roth Conversions (v9)

```typescript
rothConversions: [
  {
    yearOffset: number,  // Year from simulation start (0 = first year)
    amount: number       // Amount to convert
  }
]
```

**Note:** User-directed only. No bracket optimization or recommendations.

### Withdrawal Strategy (v11)

```typescript
withdrawalStrategy?: 'tax_efficient' | 'pro_rata' | 'roth_first'
```

**Strategies:**
- `tax_efficient` (**default**) — Cash → Taxable → Tax-deferred → Roth (minimizes current taxes)
- `pro_rata` — Proportional withdrawals from all accounts (maintains allocation)
- `roth_first` — Roth → Tax-deferred → Taxable → Cash (uses tax-free first)

**Tax Impact:**

Different strategies produce different outcomes because withdrawal taxes are applied immediately:
- Tax-deferred withdrawals: taxed as ordinary income
- Taxable withdrawals: only gains taxed (LTCG/STCG rates)
- Roth withdrawals: tax-free

**Example:**
```json
// Default (omit entirely): tax_efficient
{}

// Compare Roth-first vs tax-efficient for early retiree
{ "withdrawalStrategy": "roth_first" }

// Proportional for even drawdown
{ "withdrawalStrategy": "pro_rata" }
```

### Cash Reserve (v11)

```typescript
cashReserve?: {
  targetMonths?: number,    // 0-24, default: 6
  targetAmount?: number,    // absolute dollars (mutually exclusive with targetMonths)
  autoInvestExcess?: boolean // default: false
}
```

**Behavior:**
- When cash drops below target, engine sells investments to replenish
- When `autoInvestExcess=true`, excess cash is invested in taxable account

**Examples:**
```json
// Default (omit entirely): 6 months of expenses
{}

// Keep 12 months in cash
{ "cashReserve": { "targetMonths": 12 } }

// Keep exactly $100k liquid
{ "cashReserve": { "targetAmount": 100000 } }

// 3 months buffer, invest any excess
{ "cashReserve": { "targetMonths": 3, "autoInvestExcess": true } }
```

### Rebalancing (v11)

```typescript
rebalancing?: {
  method?: 'threshold' | 'periodic' | 'none',  // default: 'threshold'
  thresholdPct?: number,                       // default: 0.05 (5%)
  frequency?: 'monthly' | 'quarterly' | 'annually'  // default: 'quarterly'
}
```

**Methods:**
- `threshold` (default): Rebalance when any asset drifts beyond `thresholdPct`
- `periodic`: Rebalance on fixed schedule regardless of drift
- `none`: Never rebalance (buy-and-hold)

**Examples:**
```json
// Default: 5% threshold, quarterly check
{}

// More aggressive: 3% threshold
{ "rebalancing": { "thresholdPct": 0.03 } }

// Annual rebalancing only
{ "rebalancing": { "method": "periodic", "frequency": "annually" } }

// Never rebalance (pure buy-and-hold)
{ "rebalancing": { "method": "none" } }
```

### Debt (v11)

```typescript
debt?: {
  debts?: DebtItem[],
  payoffStrategy?: 'avalanche' | 'snowball',  // default: 'avalanche'
  extraMonthlyPayment?: number                 // default: 0
}

interface DebtItem {
  id: string,              // e.g., "student_loan"
  description: string,     // e.g., "Federal student loans"
  balance: number,         // current balance ($)
  interestRate: number,    // annual rate as decimal (0.06 = 6%)
  minimumPayment: number,  // monthly minimum ($)
  remainingMonths?: number // optional: months left on loan
}
```

**Strategies:**
- `avalanche` (default): Pay highest interest rate first (mathematically optimal)
- `snowball`: Pay smallest balance first (psychological wins)

**Behavior:**
- Debt payments are modeled as fixed monthly expenses
- Payments stop when debt would be paid off (balance ÷ payment)
- Extra payment goes to first debt in priority order

**Examples:**
```json
// Student loan with extra $200/month payment
{
  "debt": {
    "debts": [{
      "id": "student_loan",
      "description": "Federal student loans",
      "balance": 45000,
      "interestRate": 0.055,
      "minimumPayment": 450
    }],
    "extraMonthlyPayment": 200
  }
}

// Multiple debts with snowball strategy
{
  "debt": {
    "debts": [
      { "id": "cc", "description": "Credit card", "balance": 5000, "interestRate": 0.19, "minimumPayment": 150 },
      { "id": "car", "description": "Car loan", "balance": 12000, "interestRate": 0.05, "minimumPayment": 300 }
    ],
    "payoffStrategy": "snowball",
    "extraMonthlyPayment": 500
  }
}
```

---

## Engine-Only Features (Not Exposed)

These exist in `wasm/domain_types.go` but are NOT accessible via MCP:

### Tax-Loss Harvesting

```go
type TaxLossHarvestingSettings struct {
  Enabled                 bool
  MaxAnnualLossHarvest    float64  // Default: $3,000
  WashSaleAvoidancePeriod int      // 31 days
}
```

**MCP behavior:** Not enabled. Requires Silver/Gold tier.

### Strategic Capital Gains

```go
type StrategicCapitalGainsSettings struct {
  Enabled          bool
  TargetTaxBracket float64  // e.g., 0.0 for 0% bracket
  MaxGainsPerYear  float64
}
```

**MCP behavior:** Not enabled.

---

## Output Structure

### Always Returned

| Field | Description |
|-------|-------------|
| `success` | Boolean success flag |
| `runId` | Unique run ID (e.g., `AF-7K3P9`) |
| `mc.finalNetWorthP10/P50/P75` | Final net worth percentiles |
| `mc.constraintProbability` | % of paths hitting spending constraint (if > 0) |
| `planDuration` | When plan stops working (ages) |
| `phaseInfo` | Accumulation/transition/decumulation classification |
| `exemplarPath` | Median path reference for replay |

### Conditional Returns

| Field | Condition |
|-------|-----------|
| `mc.netWorthTrajectory` | Always (for chart) |
| `annualSnapshots` | When `verbosity: 'annual'` or `'trace'` |
| `trace` | When `verbosity: 'trace'` |
| `comparison` | When `concentration.instantLossPct` provided |
| `flexibilityCurve` | When decumulation + saturated runway |

---

## Constraints

1. **Age 80 cap** — Simulation auto-capped at age 80
2. **P10/P50/P75 only** — No P90/P95 (avoids "tail theater")
3. **Housing as cost** — Home equity not tracked as asset
4. **Deterministic** — Same seed + inputs = identical output
5. **No advice** — Results are "what tends to happen", never "what you should do"

---

## Future Roadmap

Features that may be exposed in future versions:

| Feature | Status | Notes |
|---------|--------|-------|
| Asset allocation strategy | ✅ Done (v10) | Fixed or glide path selection |
| Withdrawal strategy | ✅ Done (v11) | tax_efficient, pro_rata, roth_first |
| Default taxes | ✅ Done (v11) | Federal single filer with immediate withholding |
| Cash reserve targets | ✅ Done (v11) | Months or absolute amount |
| Rebalancing configuration | ✅ Done (v11) | threshold, periodic, or none |
| Debt modeling | ✅ Done (v11) | avalanche or snowball payoff |
| Income growth rate | Deferred | Currently uses inflation only |
| Tax-loss harvesting | Deferred | Requires Silver tier |

---

## Housing Modeling

**Housing is modeled as an ongoing cost, not as an asset.**
Home value and equity are not tracked.

This is intentional. The simulation answers: "Can my liquid assets support this lifestyle?"

**What This Model Answers:**
- "Can I afford this house?"
- "How does buying affect my runway?"
- "Do I need to work longer if I buy?"

**What This Model Does NOT Answer:**
- "What's my net worth including my home?"
- "What if I sell or downsize?"

**Home Purchase Pattern:**
```json
{
  "oneTimeEvents": [{
    "monthOffset": 24, "amount": 300000,
    "type": "expense", "description": "Down payment"
  }],
  "spendingChange": {
    "monthOffset": 24, "newAnnualSpending": 130000,
    "description": "Housing costs"
  }
}
```

---

## Related Documentation

- [`../src/server-sse.ts`](../src/server-sse.ts) — **MCP tool definition** (what ChatGPT/Claude actually see)
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) — End-user guide for ChatGPT App
- [../../docs/SIMULATION_ENGINE.md](../../docs/SIMULATION_ENGINE.md) — Full engine architecture
- [../../docs/PFOS_E_ARCHITECTURE.md](../../docs/PFOS_E_ARCHITECTURE.md) — Pure function design
