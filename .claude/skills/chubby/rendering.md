# AreumFire Rendering Specification (v2)

## Canonical Output Format

Every simulation response follows this exact structure. Each section earns its place - no filler, no padding.

---

### Opening

```
Question
• What tends to happen over [X] years under the assumptions below?
```

---

### Inputs (as used)

```
Inputs (as used)
• Age: [X]
• Investable assets: $[X]
• Income: $[X]/year (or $0 if retiring)
• Spending: $[X]/year
• Net contribution: $[X]/year

Horizon
• [X] years ([X] months)
```

---

### Modeling Choices

Always show, even for defaults. No tier labels.

```
Modeling choices
• Dollars: NOMINAL (add inflation assumption to see real)
• Taxes: NOT APPLIED (add user-declared rates to simulate)
• Returns: stochastic, [X] paths
• Seed: [X]
```

---

### Planning Range

Use scenario names with percentiles in parentheses. No P90/P95 in default output.

```
Planning range at horizon (nominal dollars)

• Downside scenario (~10th percentile): ~$[X]
• Typical outcome (median): ~$[X]
• Optimistic but plausible (~75th percentile): ~$[X]

Observed events in this run:
• Spending constraint reached: [X] of [N] paths
```

Note: P90/P95 are kept internally for audit/trace but NOT shown in default output.

---

### Key Drivers

Mechanical, not evaluative. No "resilient/fragile" language.

```
Key drivers (under these assumptions)
• [Savings rate insight]
• [Time horizon insight]
• Results are most sensitive to: [Top 2-3 drivers]
```

---

### What's Missing

Replaces warning disclaimers. Shows what would unlock gated outputs.

```
What's missing (to tighten ranges)
• Tax assumptions (marginal/effective rates)
• Inflation assumption (to convert to real dollars)
```

---

### Run Provenance

Always include. Random runId (not hash-based).

```
Run provenance
• Run ID: [AF-XXXXX]
• Engine: PFOS-E v1
• Paths: [X]
• Replay: same inputs + seed → same outputs

To inspect: "Show year-by-year" or "Show the math"
```

---

## Annual Snapshots (verbosity=annual or trace)

```
Year-by-year progression (exemplar path):

| Year | Age | Start     | Contrib  | Return | End       |
|------|-----|-----------|----------|--------|-----------|
| 2026 | 40  | $300,000  | $50,000  | +8.2%  | $378,600  |
| 2027 | 41  | $378,600  | $50,000  | +5.1%  | $450,500  |
| ...  | ... | ...       | ...      | ...    | ...       |

This is ONE simulated path (the median outcome). Your actual path will differ.
```

---

## Trace Data (verbosity=trace)

```
Month-by-month trace (selected months):

Month 0 (Start):
  Net Worth: $[X]
  Cash: $[X]

Month 12 (Year 1):
  Net Worth: $[X] ([+/-X]% from start)
  Events: income-salary, expense-living
  Market: SPY +X.X%, Bonds +X.X%

  Account balances:
  • Cash: $[X]
  • Taxable: $[X]
  • Tax-deferred: $[X]
```

---

## Language Rules (HARD)

### NEVER use:
- should, recommend, best, optimal, safer
- "cost of inaction"
- "you should" / "you can"
- good/bad judgments about outcomes
- resilient/fragile (evaluative language)
- Bronze/Silver/Gold tier labels

### ALWAYS use:
- "under these assumptions"
- "tends to"
- "simulated"
- "conditional on"
- scenario names with percentiles in parentheses
- "Observed events" (not "Risk indicators")
- "Key drivers" (not "Why this tends to work")
- "What's missing" (not "Blocked outputs")

---

## Percentile Policy

| Percentile | When to show |
|------------|--------------|
| P10 | Always (downside scenario) |
| P50 | Always (typical outcome) |
| P75 | Always (optimistic but plausible) |
| P90 | Trace/audit only |
| P95 | Trace/audit only |

Rationale: P90+ are mathematically possible but not planning-relevant. Show only planning-relevant band by default.

---

## Output Modes

| User says | Use |
|-----------|-----|
| "What tends to happen?" | verbosity='summary' |
| "Walk through year by year" | verbosity='annual' |
| "Show the math" / "Prove it" | verbosity='trace' |
| "See that path again" | pathSeed=exemplarPath.pathSeed |

---

## Inline Card Anatomy (Apps SDK)

When rendered as a ChatGPT inline card via Apps SDK:

```
┌──────────────────────────────────────────────────────────┐
│  AreumFire · Simulation Summary                          │
│  Educational simulation · not financial advice           │
├──────────────────────────────────────────────────────────┤
│  Question                                                │
│  What tends to happen over 30 years under these          │
│  assumptions?                                            │
├──────────────────────────────────────────────────────────┤
│  Planning range at horizon (nominal dollars)             │
│                                                          │
│   Downside        Typical         Optimistic-plausible   │
│   (~P10)          (median)        (~P75)                 │
│   ─────────       ───────         ───────────────────    │
│     ~$1.5M          ~$9.1M              ~$27M            │
│                                                          │
│  Observed events: Spending constraint: 0 / 100 paths     │
├──────────────────────────────────────────────────────────┤
│  Modeling choices                                        │
│  • Dollars: NOMINAL                                      │
│  • Taxes: [SEE TAX MODE VARIANTS BELOW]                  │
│  • Returns: stochastic (100 paths)                       │
├──────────────────────────────────────────────────────────┤
│  What's missing (to tighten ranges)                      │
│  • [SEE TAX MODE VARIANTS BELOW]                         │
│  • Inflation assumption                                  │
├──────────────────────────────────────────────────────────┤
│  Run provenance                                          │
│  • Run ID: AF-7K3P9 • Engine: PFOS-E v1 • 100 paths      │
├──────────────────────────────────────────────────────────┤
│  ▸ Show year-by-year                                     │
│  ▸ Show the math                                         │
└──────────────────────────────────────────────────────────┘
```

**Card Rules:**
- ✅ Educational disclaimer at top (always visible)
- ✅ Three-number planning band (P10/P50/P75)
- ✅ "Modeling choices" always visible
- ✅ "What's missing" always visible
- ❌ No advice language
- ❌ No green/red success indicators
- ❌ No "on track" / "safe" / "recommended"
- ❌ No single point estimate headline

---

## Tax Mode Display Variants

### Taxes NOT APPLIED (default)

**Modeling choices:**
```
• Dollars: NOMINAL
• Taxes: NOT APPLIED
• Returns: stochastic (100 paths)
```

**What's missing:**
```
• Tax assumptions (effective or marginal rates)
• Inflation assumption
```

---

### Taxes with DEFAULT ASSUMPTIONS

**Modeling choices:**
```
• Dollars: NOMINAL
• Taxes: DEFAULT ASSUMPTIONS (Single, CA, 22-28%)
• Returns: stochastic (100 paths)
```

**What's missing:**
```
• User-declared tax rates (tightens ranges)
• Inflation assumption
```

---

### Taxes USER_DECLARED

**Modeling choices:**
```
• Dollars: NOMINAL
• Taxes: USER-DECLARED (Married, TX, 18-24%)
• Returns: stochastic (100 paths)
```

**What's missing:**
```
• Inflation assumption
```
