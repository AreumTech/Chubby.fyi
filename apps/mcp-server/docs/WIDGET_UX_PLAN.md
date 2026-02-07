# Widget UX Fixes - Feedback Round 5

Based on continued "life story" scenario testing.

---

## Completed ✅

### Round 2
- ~~Horizon default to age 80 (was incorrectly stopping at 65)~~
- ~~"Return to work" → "Income resumes" with "$0 → $150k/yr" format~~
- ~~Handle negative net worth in trajectory (visual indicator)~~
- ~~Collapsible assumptions section~~
- ~~Tooltips for P10/P50/P75 explanations~~
- ~~Seed/paths behind "Advanced" accordion~~

### Round 3
- ~~"Cash-floor breach" → "Spending constraint reached" (server.ts, MonteCarloSummaryPanel.tsx)~~
- ~~"Runway Until Breach" → "Runway Until Constraint"~~
- ~~Recurring events show duration/frequency: "$1.2k/mo × 24"~~
- ~~intervalMonths validation skipped when count=1~~

### Round 4
- ~~Make `recurring` object optional for single events~~
- ~~Make `intervalMonths` optional within `recurring` (only `count` required)~~
- ~~Default `intervalMonths` to 1 (monthly) when not specified~~
- ~~Update schemas in server.ts and server-sse.ts~~
- ~~Update TypeScript types~~
- ~~Fix trajectory chart skew: now shows P10→P50→P75 (was only P10→P50 but scaled to P75)~~
- ~~Added "optimistic" bar segment (P50→P75) with lighter styling~~
- ~~Updated legend: "Downside–Median" + "Median–Optimistic" + "Median"~~

### Round 5
- ~~Removed `extract_financial_changes` tool - ChatGPT handles NL parsing directly~~
- ~~Removed extractor from server.ts, server-sse.ts~~
- ~~Deleted extractChanges.ts~~
- ~~Removed extractor tests from integration.test.js~~
- ~~Implemented negative net worth handling (Option A)~~
  - Floor displayed values at $0 (no negative bars)
  - Added "⚠️ Spending constraint reached" marker at first constrained age
  - Constrained rows highlighted with amber/warning styling
  - Explanatory note: "baseline spending exceeds available resources"
- ~~Fixed trajectory chart "squished left" issue~~
  - Now scales to max P50 (median), not P75
  - P75 bars capped at 100% with dashed edge indicator when clipped
  - Added note: "Optimistic scenarios extend further due to compound growth"
- ~~Fixed negative value formatting in all display functions~~
  - `fmt()` now handles negatives with K/M suffix (e.g., -$2.3M not -2330000)
  - `fmtYr()` same fix for yearly values
  - `fmtFull()` same fix for detailed ledger values
  - Inspector fallback path now floors values at $0 with constraint indicator

### Round 6
- ~~Server-side clamping of all net worth values at 0~~
  - Clamps ALL percentile fields (p5, p10, p25, p50, p75, p90, p95) to maintain monotonicity
  - Fixed bug where p10=0 but p25=-$23k (invalid ordering)
- ~~Removed P90/P95 from default response (avoids "tail theater" distraction)~~
  - Removed finalNetWorthP90, finalNetWorthP95, minCashP90, runwayP90
  - Only P10/P50/P75 returned in MC results
- ~~Renamed `everBreachProbability` to `constraintProbability`~~
  - Only included when > 0 (avoids pass/fail thinking when always 0)
- ~~Added late-horizon uncertainty note~~
  - Shows when trajectory extends to age 70+
  - "Uncertainty naturally widens over long horizons..."
- ~~Added "Copy Summary" button~~
  - Generates ASCII-friendly text summary
  - Copy to clipboard for pasting elsewhere

### Round 7
- ~~"Constraint" terminology → "Assets depleted"~~
  - "Spending constraint reached" → "Assets depleted"
  - "X% of paths reached constraint" → "X% of paths depleted assets"
  - "No constraint observed" → "Assets stay funded" / "stays funded"
- ~~Human-readable percentile labels~~
  - Legend: "Harder → Typical" and "Typical Outcome" (removed P10/P50 jargon)
  - Tooltips explain in plain language: "Half of simulated outcomes are better, half are worse"
  - Row tooltips: "Harder · Typical · Optimistic" instead of P10/P50/P75
- ~~P75 overconfidence warning~~
  - Tooltip now says "Optimistic (requires favorable markets)"
  - Long-horizon note: "Optimistic projections require sustained favorable markets"
- ~~Bankruptcy/$0 path annotation~~
  - "Paths showing $0 have exhausted all funds"
  - "At this point, assets are exhausted and spending can no longer be sustained"
- ~~Widget link copy~~
  - "View interactive visualization" → "See your projections →"

### Round 8
- ~~Fixed headline mismatch when p50Assets near zero~~
  - Added `effectivelySaturated` check: if p50Assets < max(annualSpending, $10k), don't show "stays funded"
  - New "marginal coverage" mode: "This plan reaches Age X with minimal reserves"
  - Warning note when assets nearly exhausted by horizon
- ~~Constraint marker now percentile-specific~~
  - Shows actual percentage: "In X% of scenarios, assets depleted by Age Y"
  - Falls back to "In most scenarios" if percentage unavailable
- ~~Accessibility improvements~~
  - Added `aria-modal="true"` to inspector dialog
  - Trajectory row aria-label now includes "Press Enter or tap to view details"
  - Added `.sr-only` CSS class and sr-only span to copy button
- ~~Fixed "Tap a year" copy~~
  - Changed to "Tap an age to see the math"

### Round 8.5
- ~~Fixed header/constraint marker contradiction~~
  - Added `getFirstConstraintAge()` helper to detect when trajectory will show constraint
  - If constraint fires at earlier age while saturated, shows new mode: "Plan reaches Age X in favorable scenarios"
  - Header now acknowledges constraint: "In X% of scenarios, assets depleted by Age Y"
- ~~Added indicator when range bars disappear at 65+~~
  - Updated long-horizon note: "After 65, range bars are hidden because outcome spread becomes very wide. Only the median is shown. Tap any row for full percentiles."
- ~~Added Run ID tooltip~~
  - Run ID span now has title="Simulation ID — use this to reference or share this run"

### Round 9
- ~~Added percentile continuity note~~
  - Below legend: "Percentiles recalculated at each age" with tooltip explaining they're not one continuous path
- ~~Labeled inspector as "one simulation"~~
  - Inspector title now includes: "One simulated path (example, not typical)"
- ~~Driver-aware trajectory explainer~~
  - Accumulation: "modeled income exceeds spending, so assets rise from ongoing contributions. Market returns add uncertainty."
  - Decumulation: "spending exceeds modeled income, so withdrawals fund the gap. Market returns drive how quickly assets change."
- ~~Clarified returns pill and assumptions~~
  - Summary: "Stocks 7% / Bonds 4%" instead of "~7% returns"
  - Added volatility explanation: "Higher volatility means wider spread between outcomes"
  - Added disclaimer: "These are long-run illustrative assumptions — not a prediction of future performance"
- ~~Softened optimistic tooltip~~
  - "(requires favorable markets)" → "(reflects stronger markets in this model)"

### Round 9.5 (Bug Fixes)
- ~~Fixed Social Security validation bug~~
  - Bug: `validateSocialSecurity` used `params.horizonMonths || 360` instead of computed `effectiveHorizon` from maxAge
  - Fix: Pass `effectiveHorizon` as parameter to validation functions
  - Also fixed same bug in `validateRothConversions`
  - Improved error message to show actual horizon end age and suggest fix

---

## Priority 1: Verify Deployed Fixes

After rebuild/redeploy, verify these work:

### 1.1 Verify intervalMonths=0 with count=1 works
**Status:** Code fix in place (runSimulation.ts:199-202)
**Test:** `recurring: { count: 1, intervalMonths: 0 }` should NOT error

### 1.2 Verify recurring display shows cadence
**Status:** Code fix in place (runSimulation.ts:574-580)
**Test:** Childcare expense with `{ count: 24, intervalMonths: 1 }` should show "$1.2k/mo × 24"

### 1.3 Verify recurring without intervalMonths works
**Status:** Code fix in place
**Test:** `recurring: { count: 5 }` (no intervalMonths) should default to monthly

### 1.4 Verify trajectory chart shows P10→P75 range
**Status:** Code fix in place (simulation-widget.html)
**Test:** Chart should show solid bar (P10→P50) + outlined bar (P50→P75) + median marker

---

## Priority 2: Deferred (Future Work)

### Backend/routing inconsistency
- "Resource not found" routing issues between endpoints
- "Connector not installed" prompt appearing with successful results
- **Deferred:** Environment/ops issue, not code fix

### `everBreachProbability` in payload
- Still returned in payload (for internal use)
- UI uses "constraint" language - field name is internal
- **Deferred:** No user-facing impact

### Scenario compare view
- Pin and compare multiple scenarios
- Chart with multiple P50 lines
- Diff of event schedules
- **Deferred:** Feature request for future iteration

### Story mode input
- "Work until X, then retire..." natural language
- Age-based input vs month offsets
- **Deferred:** Feature request

### Clearer final net worth labeling
- Label `finalNetWorthP50` as "Ending net worth at horizon (floored at $0)"
- Show `constraintProbability` prominently alongside final figures
- Helps users understand why trajectory shows values but final is $0
- **Deferred:** UX clarity

### Annual snapshots UX
- Collapse behind "Show the math" accordion (closed by default)
- Add 2-3 plain-English highlights above (e.g., "income drops at 60", "first constraint appears around age X in P10 paths")
- **Deferred:** Reduce cognitive load for casual users

### Constraint timing annotation
- When `pctPathsFunded` starts dropping, show annotation: "Some simulated paths hit a spending constraint around age __"
- Makes constraint concept more concrete
- **Deferred:** Feature request

### Scenario management
- Scenario title input (name runs for reference)
- One-click "copy share link" encoding inputs + seed for replay
- **Deferred:** Feature request

### Permanent change toggle
- For retirement/income events, add UI toggle "Permanent change" instead of requiring `durationMonths` omission
- Prevents `durationMonths: 0` validation confusion
- **Deferred:** Input UX improvement

### Social Security input clarity
- `monthlyBenefit` asks for "today's dollars" but ssa.gov estimates project future wages
- Add tooltip: "(enter your current ssa.gov estimate)"
- **Deferred:** Input UX

### Tax impact visibility
- Taxes applied (~22% effective) but not broken out in output
- Show "taxes paid over simulation" for users optimizing Roth conversions / withdrawal strategies
- **Deferred:** Feature request (power users)

### Sensitivity analysis
- "What if returns are 1% lower?" slider
- Quick way to stress-test assumptions
- **Deferred:** Feature request

---

## Priority 3: Backlog (from Feedback Testing)

### 3.1 Debt Payoff Timeline Visibility

**Gap:** Users can't see when each debt gets paid off or how much interest is saved with avalanche vs snowball strategy.

**Current state:** Debt is modeled in the engine (accepted via `debt` parameter in toolDefinition.ts) and affects simulation results, but the widget has zero debt UI — no balances, payoff dates, or interest savings shown.

**Proposed solution:** Add a "Debt Payoff" section to the widget showing a table of debts with projected payoff dates, total interest paid, and a comparison row if strategy differs from current.

**Effort:** Medium — engine already tracks debt; needs new widget section + data passthrough from simulation results.

### 3.2 Employer Match Surfacing

**Gap:** Users pass employer match config (`contributions.employerMatch`) but can't see the employer's contribution amount separately in output.

**Current state:** Match is modeled in engine (contributions parameter, toolDefinition.ts lines 466-503) and affects account growth, but widget shows no indication of employee vs employer contribution breakdown.

**Proposed solution:** Add employer match as a line item in the scheduled events section (e.g., "Employer contributes $X/year via 50% match on first 6%") and include in the assumptions section.

**Effort:** Low-Medium — data exists in input config; needs formatting + widget rendering.

### 3.3 Scenario Compare

**Gap:** Users want to compare two scenarios side-by-side (e.g., "retire at 60 vs 65", "with vs without house purchase") without losing context between runs.

**Current state:** Each simulation is independent. No way to view two results simultaneously. Users must run separately and remember previous results.

**Proposed solution:** Two approaches:
- **(A) Client-side:** Store previous result in sessionStorage, render two trajectory charts side-by-side with delta annotation.
- **(B) Server-side:** New `compare_scenarios` tool that runs two simulations and returns a comparison payload with both trajectories + delta metrics.

Recommend starting with (B) since the MCP tool can run two sims and the widget can render comparison data.

**Effort:** High — requires either significant widget state management (A) or new tool + response format (B).

---

## Files Modified (Round 5)

| File | Changes |
|------|---------|
| `apps/mcp-server/src/server.ts` | Removed extractor tool registration |
| `apps/mcp-server/src/server-sse.ts` | Removed extractor tool registration |
| `apps/mcp-server/src/tools/extractChanges.ts` | DELETED |
| `apps/mcp-server/tests/integration.test.js` | Removed extractor tests |
| `apps/mcp-server/public/simulation-widget.html` | Negative net worth → constraint mode (Option A) |

---

## Verification Checklist

After rebuild/redeploy:
- [ ] `recurring: { count: 1, intervalMonths: 0 }` - should NOT error
- [ ] `recurring: { count: 5 }` without intervalMonths - should work (defaults to monthly)
- [ ] One-time event without `recurring` object - should work
- [ ] Monthly childcare expense `{ count: 24, intervalMonths: 1 }` - should show "$1.2k/mo × 24"
- [ ] Annual tuition `{ count: 4, intervalMonths: 12 }` - should show "$50k/yr × 4"
- [ ] Widget chart - shows P10→P50 (solid) + P50→P75 (outlined) segments
- [ ] `extract_financial_changes` tool - should NOT exist (ChatGPT parses NL directly)
- [ ] Negative net worth scenario - shows $0 with constraint marker, NOT negative values
- [ ] Run MCP integration tests: `cd apps/mcp-server && npm test` - expect 6 tests
