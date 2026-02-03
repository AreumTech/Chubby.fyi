# AreumFire MCP Server - Usage Guide

This guide covers how to use the AreumFire ChatGPT App for financial simulation.

---

## Quick Start

### Start the Server

```bash
# Local testing only
npm run chatgpt

# With ngrok tunnel for ChatGPT access
npm run chatgpt:tunnel
```

This starts:
- Simulation service on port 3002 (WASM engine)
- MCP SSE server on port 8000 (ChatGPT connects via `/mcp`)
- (Optional) ngrok tunnel with public HTTPS URL

### Configure ChatGPT

1. Go to [ChatGPT Apps](https://chatgpt.com/gpts) → Create new GPT → Configure
2. Add a **Connector** (MCP Server):
   - **Server URL:** `https://xxxx.ngrok-free.app/mcp` (include `/mcp`!)
   - **Authentication:** None (for testing)

---

## Tools

### run_simulation_packet

Runs a Monte Carlo financial simulation.

**Required Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `investableAssets` | number | Total investable assets in dollars |
| `annualSpending` | number | Annual spending in dollars |
| `currentAge` | number | Current age (projects to maxAge, default: 80) |
| `expectedIncome` | number | Annual income (0 for retirement) |
| `seed` | number | Random seed for deterministic results |
| `startYear` | number | Simulation start year (e.g., 2026) |

**Optional Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mcPaths` | number | 100 | Monte Carlo paths |
| `horizonMonths` | number | (maxAge-currentAge)*12 | Simulation horizon |
| `maxAge` | number | 80 | Max projection age (50-100) |
| `verbosity` | string | summary | `summary`, `annual`, or `trace` |
| `accountBuckets` | object | — | Account allocation percentages |
| `taxAssumptions` | object | — | Tax mode and rates |
| `incomeChange` | object | — | Income regime change |
| `incomeStreams` | array | — | Multiple income streams (dual-earner) |
| `spendingChange` | object | — | Spending regime change |
| `oneTimeEvents` | array | — | Large purchases, bonuses |
| `concentration` | object | — | Concentrated stock exposure |
| `healthcare` | object | — | Pre/post Medicare costs |
| `contributions` | object | — | Employee/employer contributions |
| `socialSecurity` | object | — | SS claiming age and benefit |
| `rothConversions` | array | — | Roth conversion schedule |

### extract_financial_changes

Parses natural language into structured financial data.

```json
{
  "text": "I'm 35, make $120k per year, spend about $60k, and have $500k saved"
}
```

Returns structured changes with confidence scores.

---

## Test Prompts

### Basic Simulation (Saturated Plan)

```
I'm 35, make $150k/year, spend $50k, and have $800k saved.
Run a 30-year simulation with seed 12345.
```

**Expected:** "This plan covers baseline spending through Age 65" with healthy trajectory.

---

### Constrained Plan (Money Runs Out)

```
Run a simulation: age 55, $400k saved, no income (retired), spending $80k/year.
Use seed 22222.
```

**Expected:** Shows "Around Age 63 in typical outcome" with stress ages.

---

### Retirement Transition

```
I'm 50 with $1.2M saved, earning $180k. I plan to retire at 60.
After retirement, spending stays at $80k. Social Security at 70 ($4k/month).
Seed 67890.
```

**Expected:** Shows retirement event at 60, SS at 70, milestones in trajectory.

---

### Complex Schedule

```
Age 55, $1.5M saved, $150k income, $70k spending.
- Retire at 60
- Buy vacation home at 58 ($300k)
- Roth conversions: $50k/year ages 60-62
- Social Security at 67 ($3,500/month)
Seed 33333.
```

**Expected:** Shows all events with icons, multiple milestones.

---

### Concentration Risk

```
I'm 40 with $2M saved. 40% is in company stock.
What if the stock drops 50%? Income $200k, spending $80k.
Seed 55555.
```

**Expected:** Side-by-side comparison showing baseline vs after-loss scenarios.

---

### Healthcare Costs

```
Age 58, $1.5M saved, retiring now, $60k spending.
Healthcare: $800/month until Medicare at 65, then $400/month.
Seed 77777.
```

**Expected:** Healthcare costs visible in modeling choices, age-based transition.

---

### Natural Language Input

```
My wife and I are both 42. Together we make about $200k and spend around $90k.
We have $650k in 401ks and $150k in taxable accounts.
Planning to retire at 60. What does our trajectory look like?
```

**Expected:** Should extract values and run simulation.

---

## Response Format

```json
{
  "success": true,
  "runId": "AF-7K3P9",
  "pathsRun": 100,
  "planDuration": {
    "horizonSaturated": true,
    "mostPathsAge": 80,
    "earlierStressAge": 80,
    "laterOutcomesAge": 80
  },
  "mc": {
    "everBreachProbability": 0,
    "finalNetWorthP50": 2880000,
    "runwayP10": 360,
    "runwayP50": 360
  }
}
```

---

## Determinism Guarantee

**Same seed + same inputs = identical results**

```javascript
const result1 = await runSimulation({ seed: 12345, ... });
const result2 = await runSimulation({ seed: 12345, ... });
// result1.mc.finalNetWorthP50 === result2.mc.finalNetWorthP50
```

---

## Error Handling

| Code | Description |
|------|-------------|
| `MISSING_INPUT` | Required field not provided |
| `INVALID_RANGE` | Value outside allowed range |
| `SERVICE_UNAVAILABLE` | Simulation service not running |
| `SERVICE_TIMEOUT` | Request timed out |

---

## Current Capabilities

**Available:**
- Monte Carlo simulation (100+ paths)
- Outcome distribution (P10/P50/P75)
- Account buckets (cash, taxable, tax-deferred, roth, HSA)
- Concentration risk + shock scenarios
- Healthcare (pre/post Medicare)
- Contributions (employee + employer match)
- Social Security + Roth conversions
- Tax assumptions (three modes)
- Event modules (income/spending changes, one-time events)

**Not Available:**
- Debt modeling
- 529 plans
- Tax-loss harvesting
- Withdrawal sequencing optimization
- Estate planning

See `CHECKPOINT_CURRENT_REALITY.md` for full feature coverage.

---

## Local Testing (Without ChatGPT)

For quick widget iteration:

```bash
# Start servers
npm run chatgpt

# Open test harness
open http://localhost:8000/test
```

Or test widget directly:

```bash
cd apps/mcp-server/public
python3 -m http.server 8765
open http://localhost:8765/simulation-widget.html
```

---

## Troubleshooting

### Widget doesn't render
- Check ngrok tunnel is active
- Verify ChatGPT app connector URL includes `/mcp`

### "Service unavailable"
- Ensure simulation service is running: `curl localhost:3002/health`
- Check MCP server is running: `curl localhost:8000/health`

### Bars look wrong
- Refresh page to clear CSS cache
- Check browser console for errors
