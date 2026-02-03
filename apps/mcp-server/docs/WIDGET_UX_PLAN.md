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
