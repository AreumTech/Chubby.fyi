# Chubby MCP Server (Go) - EXPERIMENTAL

> **Status: EXPERIMENTAL.** Use `apps/mcp-server/` (Node.js + WASM) for production.

## Quick Start

```bash
npm run chatgpt:go   # Experimental Go server
npm run chatgpt      # Default Node.js server (recommended)
```

## Known Issues

This pure Go rewrite has not achieved output parity with the canonical WASM engine:
- Percentile calculations differ
- Account balances drift over time
- Runway estimates don't match

The Node.js server works because it calls the **same WASM binary** as the test harness — a black box that guarantees identical output. This also means the MCP server, AreumFire React workbench (`src/`), and any future frontends all share the same simulation engine. Native Go execution introduced subtle bugs that were never fully resolved.

**Future path:** If Go native is ever needed, consider running WASM via [wazero](https://wazero.io/) + contract tests against the canonical engine.

---

## What This Was

A pure Go implementation attempting full feature parity with the WASM simulation engine.

## Performance Comparison

| Engine | 100 paths, 30yr | Features |
|--------|-----------------|----------|
| **Basic** | ~2ms | Simple compound growth |
| **Bronze** | ~3ms | Tax brackets + account types |
| **Full (LiteMode)** | ~512ms | Complete simulation |
| **Full (complete)** | ~557ms | All features enabled |

### Target: 100 paths under 500ms

- ✅ Basic: 2ms (250x under target)
- ✅ Bronze: 3ms (167x under target)
- ⚠️ Full: 512-557ms (at target)

## Simulation Tiers

### Basic Tier (~2ms)
Fastest option for quick projections:
- Simple Monte Carlo with compound growth
- No tax calculations
- Single portfolio value

### Bronze Tier (~3ms)
Fast with essential tax support:
- Federal income tax brackets (2024/2025)
- State income tax
- Long-term capital gains tax
- Account types: cash, taxable, 401k, roth
- Tax withholding and settlement
- Contribution tracking

### Full Tier (~500ms) ✅ Complete Feature Parity
Complete simulation engine from `wasm/`:
- All tax calculations (federal, state, FICA, AMT, NIIT)
- All account types with proper bucketing
- Withdrawal sequencing optimization
- RMD calculations
- Social Security benefits
- Roth conversions
- Tax-loss harvesting
- Contribution limits and employer matching
- Event-driven architecture with priority queue
- GARCH volatility modeling
- Full event processing (income, expenses, one-time events)

## Quick Start

```bash
# Build
./scripts/build.sh

# Run locally
./server  # Default port 8080
PORT=3000 ./server  # Custom port

# Test
curl http://localhost:8080/health
open http://localhost:8080/test

# Run benchmarks
go test -bench=. -benchmem ./internal/simulation/

# Compare all tiers
go test -v -run TestAllEngineComparison ./internal/simulation/
```

## API Usage

### MCP Tool: run_simulation_packet

```json
{
  "name": "run_simulation_packet",
  "arguments": {
    "investableAssets": 500000,
    "annualSpending": 60000,
    "currentAge": 35,
    "expectedIncome": 100000,
    "seed": 12345,
    "startYear": 2025,
    "tier": "full",
    "cashBalance": 50000,
    "taxableBalance": 250000,
    "retirement401kBalance": 150000,
    "rothBalance": 50000,
    "contribution401k": 23000,
    "contributionRoth": 7000,
    "stateRate": 0.093
  }
}
```

### Tier Selection

| Tier | Use Case |
|------|----------|
| `basic` | Quick projections, UI responsiveness |
| `bronze` | Tax-aware planning, default for ChatGPT |
| `full` | Comprehensive analysis, detailed reports |

## Directory Structure

```
apps/mcp-server-go/
├── cmd/server/main.go           # Entry point
├── internal/
│   ├── engine/                  # Full simulation engine (ported from wasm/)
│   │   ├── config/              # Tax brackets, RMD tables, etc.
│   │   ├── simulation.go        # Core MC simulation
│   │   ├── tax.go               # Tax calculations
│   │   ├── event_handler*.go    # Event processing
│   │   └── ... (~60 files)
│   ├── mcp/                     # MCP protocol (SSE, tools, resources)
│   ├── simulation/              # Simulation adapters
│   │   ├── engine.go            # Basic tier
│   │   ├── engine_bronze.go     # Bronze tier
│   │   ├── engine_full.go       # Full tier adapter
│   │   └── types.go             # Shared types
│   └── widget/                  # Embedded widget HTML
├── scripts/                     # Build scripts
├── Dockerfile                   # Multi-stage, distroless
├── BENCHMARK_RESULTS.md         # Performance data
└── wrangler.toml                # Cloudflare Containers config
```

## Engine Port Details

The full engine was ported from `wasm/` by:
1. Copying 63 core Go files
2. Changing `package main` to `package engine`
3. Removing WASM build tags
4. Creating `config_embedded.go` for tax bracket loading
5. Adding adapter in `internal/simulation/engine_full.go`

All financial logic is identical to the WASM version.

## Related

- `apps/mcp-server/` - **RECOMMENDED:** Production Node.js MCP server (uses WASM)
- `wasm/` - Canonical Go simulation engine (compiles to WASM)
