# Architecture

Chubby is a ChatGPT/Claude App that runs financial simulations via MCP (Model Context Protocol).

## System Overview

```
User → ChatGPT/Claude → MCP Server → WASM Engine → Results
```

1. User asks a financial question in chat
2. LLM calls the `run_simulation_packet` tool via MCP
3. MCP server validates inputs and runs the WASM simulation engine
4. Engine runs 100 Monte Carlo paths
5. Results returned as percentiles (P10/P50/P75) with a widget URL

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| MCP Server | `apps/mcp-server/` | Tool endpoint for ChatGPT/Claude |
| Simulation Service | `services/simulation-service/` | HTTP wrapper for WASM |
| WASM Engine | `wasm/` | Go simulation compiled to WebAssembly |
| React Workbench | `src/` | Local dev UI (browser-only) |

## Data Flow

The MCP server exposes these tools:

- `run_simulation_packet` — Run a simulation with given parameters
- `extract_financial_changes` — Parse natural language into structured inputs

Results are encoded in a URL fragment (`#d=...`) that never reaches servers. The widget at `widget.chubby.fyi` decodes and displays the results client-side.

## Key Principles

**Stateless**: No server-side storage. All data lives in URL fragments or the chat context.

**Deterministic**: Same seed + inputs = identical output. Every simulation is replayable.

**Educational**: Shows what *tends to happen*, never recommends what you *should* do.

## Local Development

The React workbench (`src/`) runs entirely in-browser:
- WASM engine loaded via Web Workers
- Data stored in localStorage
- No backend required

Start with `npm run dev` → `http://localhost:5180/test-harness`

## Deployment

The MCP server can run anywhere that supports Node.js. For production, we use ngrok tunnels during development and can deploy to any hosting provider.

See [SECURITY.md](./SECURITY.md) for the zero-storage security model.
