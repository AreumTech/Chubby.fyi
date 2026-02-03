# MCP Server Optimization

This document describes the payload optimization implemented for the AreumFire MCP server to improve ChatGPT Apps SDK performance.

## Problem

The original implementation sent the full simulation result (~13KB) to both the model and the widget via `structuredContent`. This caused:

1. **Model performance degradation** - LLM processes unnecessary data (trajectory arrays, snapshots)
2. **Slower rendering** - Oversized payloads slow down ChatGPT's response
3. **Wasted context** - Model context budget spent on data it doesn't need for narration

## Solution: `_meta.widgetData` Split

Following the OpenAI Apps SDK best practice:

> "Trim `structuredContent` to what the model truly needs; oversized payloads degrade model performance and slow rendering."

We now split the response into two parts:

| Field | Size | Recipient | Purpose |
|-------|------|-----------|---------|
| `structuredContent` | ~800 bytes | Model + Widget | Lean summary for narration |
| `_meta.widgetData` | ~13KB | Widget only | Full data for visualization |

### What the Model Receives (`structuredContent`)

```typescript
{
  success: boolean,
  runId: string,
  pathsRun: number,
  planDuration: {
    horizonSaturated: boolean,
    mostPathsAge: number,
    earlierStressAge: number,
    laterOutcomesAge: number
  },
  inputs: {
    currentAge: number,
    investableAssets: number,
    annualSpending: number,
    expectedIncome: number,
    horizonMonths: number
  },
  mc: {
    runwayP10: number,
    runwayP50: number,
    runwayP75: number,
    finalNetWorthP50: number,
    everBreachProbability: number
  },
  // Sampled trajectory for narration (5-7 points instead of 30)
  trajectoryByAge: [
    { age: 50, p10: 1200000, p50: 1300000, p75: 1400000 },
    { age: 60, p10: 1900000, p50: 2600000, p75: 3000000 },
    { age: 70, p10: 2500000, p50: 4700000, p75: 6500000 },
    { age: 80, p10: 1500000, p50: 8300000, p75: 12700000 }
  ],
  schedule: {...},
  phaseInfo: {...}
}
```

The `trajectoryByAge` array gives the model key data points for narration:
- Uses 5-year intervals for horizons ≤25 years
- Uses 10-year intervals for longer horizons
- Always includes start age and horizon end age
- Each point has P10/P50/P75 in dollars (rounded)
```

### What Only the Widget Receives (`_meta.widgetData`)

The full result including:
- `netWorthTrajectory` (30 data points for chart)
- `annualSnapshots` (8 years for Year Inspector)
- `flexibilityCurve` (spending sensitivity analysis)
- Full event trace data

## Implementation

### Server (`server-sse.ts`)

```typescript
// Build lean model summary
const modelSummary = {
  success: result.success,
  runId: result.runId,
  planDuration: result.planDuration,
  inputs: { /* key fields only */ },
  mc: { /* percentiles only, no arrays */ },
  schedule: result.schedule,
  phaseInfo: result.phaseInfo,
};

return {
  content: [{ type: 'text', text: textSummary }],
  structuredContent: modelSummary,  // ~800 bytes (model-facing)
  _meta: {
    'openai/outputTemplate': WIDGET_TEMPLATE_URI,
    widgetData: result,  // ~13KB (widget-only)
  },
};
```

### Widget (`simulation-widget.html`)

```javascript
function init(raw) {
  // Priority: _meta.widgetData (optimized) > structuredContent (legacy) > result > raw
  data = raw._meta?.widgetData || raw.structuredContent || raw.result || raw;
}
```

## Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Model context | ~13KB | ~1KB | **93% reduction** |
| Widget data | ~13KB | ~13KB | No change |
| Trajectory for model | 30 points | 4-7 points | Sampled at key ages |
| Backward compat | N/A | ✅ Fallback chain | Works with legacy |

## Cache Headers

Widget resources now include cache headers:

```typescript
_meta: {
  'cache-control': 'public, max-age=3600',  // 1 hour
  etag: `"widget-${WIDGET_VERSION}"`,
}
```

This allows clients to cache the widget HTML and skip re-fetching on subsequent loads.

## Testing

Run the optimization test:

```bash
cd apps/mcp-server
node test-optimization.js
```

Expected output:
```
📊 Payload sizes:
   structuredContent (model): ~1KB
   _meta.widgetData (widget): ~13KB
   Reduction: 93%

📈 Model trajectory (sampled for narration):
   Age 50: $1.3M median ($1.2M–$1.4M range)
   Age 60: $2.6M median ($1.9M–$3.0M range)
   Age 70: $4.7M median ($2.5M–$6.5M range)
   Age 80: $8.3M median ($1.5M–$12.7M range)

✅ All required widget fields present!
```

## Version History

- **v8** - Added `_meta.widgetData` split, cache headers
- **v7** - Previous version (full data in `structuredContent`)
