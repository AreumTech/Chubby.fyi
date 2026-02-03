# AreumFire ChatGPT App Architecture

## Overview

AreumFire is a ChatGPT App that provides Monte Carlo financial planning simulations. The serving stack consists of three main components that work together to deliver an interactive widget experience within ChatGPT.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ChatGPT Client                               │
│  (Web Browser / Mobile App)                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (via ngrok in dev)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP Server (SSE)                                │
│  Port 8000 · server-sse.ts                                              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ /mcp (SSE)  │  │ /mcp/msg    │  │ /widget     │  │ /health     │   │
│  │ Stream      │  │ POST        │  │ Preview     │  │ Check       │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  Tools:                                                                 │
│  • run_simulation_packet    → Calls Simulation Service                  │
│  • extract_financial_changes → Local NLP parsing                        │
│                                                                         │
│  Resources:                                                             │
│  • ui://widget/simulation-summary-v13.html (widget template)            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (localhost)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Simulation Service (WASM)                          │
│  Port 3002 · services/simulation-service/server.js                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Go → WebAssembly Engine                       │   │
│  │  • Monte Carlo simulation (100-1000 paths)                       │   │
│  │  • Tax modeling, RMDs, Social Security                           │   │
│  │  • Deterministic (seed-based) results                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Endpoints:                                                             │
│  • POST /simulate    → Run simulation, return results                   │
│  • GET  /health      → WASM readiness check                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. MCP Server (SSE Transport)

**File:** `apps/mcp-server/src/server-sse.ts`
**Port:** 8000
**Protocol:** Server-Sent Events (SSE) for MCP

The MCP Server is the main entry point for ChatGPT. It implements the Model Context Protocol over SSE transport, which ChatGPT uses to:

1. **Discover tools** via `tools/list`
2. **Invoke tools** via `tools/call`
3. **Fetch resources** via `resources/read` (widget HTML)

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | GET (SSE) | MCP stream connection |
| `/mcp/messages` | POST | MCP message handling |
| `/widget` | GET | Widget preview (dev) |
| `/test` | GET | Test harness (dev) |
| `/health` | GET | Health check |

#### Tool Definitions

```typescript
// run_simulation_packet
{
  name: 'run_simulation_packet',
  annotations: {
    readOnlyHint: true,      // Computation only
    destructiveHint: false,  // No side effects
    openWorldHint: false,    // No external APIs
  },
  _meta: {
    'openai/outputTemplate': 'ui://widget/simulation-summary-v13.html',
    'openai/widgetAccessible': true,
    'openai/widgetDomain': 'chubby-simulation',
    'openai/widgetCSP': { connect_domains: [], resource_domains: [] },
  }
}

// extract_financial_changes
{
  name: 'extract_financial_changes',
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
}
```

#### Widget Resource

The widget HTML is served as an MCP resource with MIME type `text/html+skybridge`, which signals ChatGPT to render it as a sandboxed widget.

```typescript
{
  uri: 'ui://widget/simulation-summary-v13.html',
  mimeType: 'text/html+skybridge',
  text: widgetHtml,
}
```

---

### 2. Simulation Service (WASM Engine)

**File:** `services/simulation-service/server.js`
**Port:** 3002
**Runtime:** Node.js + Go/WebAssembly

The Simulation Service runs the actual Monte Carlo simulations using a Go engine compiled to WebAssembly.

#### Architecture

```
HTTP Request → Node.js Server → WASM Adapter → Go Engine → Results
```

#### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express HTTP server |
| `adapter.js` | WASM-JS bridge, event normalization |
| `loader.js` | WASM initialization |
| `mcExtractor.js` | MC result aggregation (P10/P50/P75) |

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/simulate` | POST | Run simulation |
| `/health` | GET | WASM readiness |

#### Simulation Flow

1. MCP Server receives tool call with financial parameters
2. Parameters are normalized and validated
3. POST to `/simulate` with simulation config
4. WASM engine runs N Monte Carlo paths (default: 100)
5. Results aggregated into percentiles (P10/P50/P75)
6. Response includes trajectory, snapshots, runway metrics

---

### 3. Widget (Client-Side UI)

**File:** `apps/mcp-server/public/simulation-widget.html`
**Runtime:** ChatGPT iframe sandbox

The widget is a self-contained HTML file that renders simulation results inside ChatGPT's UI.

#### Data Flow

```
ChatGPT → structuredContent → Widget JavaScript → Rendered UI
```

#### Key Sections

| Section | Purpose |
|---------|---------|
| Plan Duration | Primary metric - how long the plan works |
| Starting Point | Input summary (age, assets, income, spending) |
| Scheduled Events | Retirement, Social Security, etc. |
| Net Worth Trajectory | Interactive bar chart with P10/P50/P75 bands |
| Year Inspector | Detailed cash flow for clicked year |

#### Widget-Host Communication

```javascript
// Read simulation data
window.openai.context.structuredContent

// Request display mode changes
window.openai.requestDisplayMode('fullscreen')

// Theme detection
window.openai.context.theme // 'light' | 'dark'
```

---

## Data Flow

### Complete Request Lifecycle

```
1. User: "What if I retire at 55 with $2M?"
           │
           ▼
2. ChatGPT parses intent, calls run_simulation_packet tool
           │
           ▼
3. MCP Server receives tool call via SSE
   • Validates parameters
   • Adds defaults (seed, startYear, horizon)
           │
           ▼
4. MCP Server → POST localhost:3002/simulate
           │
           ▼
5. Simulation Service
   • Normalizes events (income, spending, SS, etc.)
   • Runs 100 Monte Carlo paths in WASM
   • Aggregates results (P10/P50/P75)
           │
           ▼
6. MCP Server receives results
   • Computes planDuration, phaseInfo
   • Samples trajectory for display
   • Builds structuredContent payload
           │
           ▼
7. MCP Server returns to ChatGPT:
   {
     content: [{ type: 'text', text: summary }],
     structuredContent: { ... simulation results ... },
     _meta: {
       'openai/outputTemplate': 'ui://widget/...',
       ...
     }
   }
           │
           ▼
8. ChatGPT requests widget template resource
           │
           ▼
9. MCP Server returns widget HTML
           │
           ▼
10. ChatGPT renders widget in iframe
    • Widget reads structuredContent
    • Renders Plan Duration, Trajectory, etc.
           │
           ▼
11. User sees interactive simulation widget
```

---

## Development vs Production

### Development (Current)

```
ChatGPT ←→ ngrok tunnel ←→ localhost:8000 (MCP) ←→ localhost:3002 (WASM)
```

**Startup:**
```bash
# Terminal 1: Simulation Service
cd services/simulation-service && node src/server.js

# Terminal 2: MCP Server
cd apps/mcp-server && node dist/server-sse.js

# Terminal 3: ngrok tunnel
ngrok http 8000
```

**Or use the combined script:**
```bash
cd apps/mcp-server && npm run chatgpt:tunnel
```

### Production (Planned)

```
ChatGPT ←→ HTTPS ←→ Cloud MCP Server ←→ Cloud WASM Service
```

Options:
- **Railway/Render:** Single container with both services
- **Vercel + Cloudflare Workers:** Serverless MCP + edge WASM
- **AWS Lambda + API Gateway:** Serverless with cold start

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 8000 | MCP Server port |
| `SIMULATION_SERVICE_URL` | `http://localhost:3002` | WASM service URL |

### Widget Versioning

Widget versions are embedded in the URI for cache busting:

```typescript
const WIDGET_VERSION = 'v13';
const WIDGET_TEMPLATE_URI = `ui://widget/simulation-summary-${WIDGET_VERSION}.html`;
```

Increment `WIDGET_VERSION` when widget HTML changes.

---

## Security Model

### Data Handling
- **No persistence:** All data is ephemeral (session-only)
- **No PII storage:** Financial inputs are not logged
- **Client-side computation:** WASM runs server-side but could run in browser

### Widget Sandbox
- Runs in ChatGPT's iframe sandbox
- CSP configured via `openai/widgetCSP`
- No external network requests from widget

### Tool Annotations
- `readOnlyHint: true` - No side effects
- `destructiveHint: false` - No data modification
- `openWorldHint: false` - No external API calls

---

## File Structure

```
apps/mcp-server/
├── src/
│   ├── server-sse.ts      # MCP Server (SSE transport)
│   ├── server.ts          # MCP Server (stdio transport, for testing)
│   ├── types.ts           # TypeScript interfaces
│   ├── errors.ts          # Error classes
│   └── tools/
│       ├── runSimulation.ts     # Simulation tool implementation
│       └── extractChanges.ts    # NLP extraction tool
├── public/
│   └── simulation-widget.html   # Widget template
├── dist/                  # Compiled JavaScript
└── docs/
    ├── CHATGPT_APP_ARCHITECTURE.md  # This file
    └── APP_SUBMISSION_CHECKLIST.md

services/simulation-service/
├── src/
│   ├── server.js          # HTTP server
│   ├── adapter.js         # WASM adapter
│   ├── loader.js          # WASM loader
│   └── mcExtractor.js     # MC aggregation
└── wasm/                  # Compiled WASM binary
```

---

## Troubleshooting

### Widget Not Rendering
1. Check widget version matches between server and template URI
2. Verify `structuredContent` contains required fields
3. Check browser console for JavaScript errors

### Simulation Errors
1. Verify Simulation Service is running: `curl localhost:3002/health`
2. Check WASM initialization in logs
3. Verify seed and startYear are provided

### Mobile Not Working
- Mobile widget rendering may require published app status
- Verify `openai/widgetAccessible: true` is set
