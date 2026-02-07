# Chubby

Monte Carlo financial planning simulation for ChatGPT and Claude.

Chubby runs thousands of market simulations to answer questions like "can I retire at 55?" or "what if I take a sabbatical?" It shows you what *tends to happen* under your assumptions — not what you *should* do. The goal is rigorous, auditable simulation that an LLM can use to give you honest answers about financial uncertainty.

The simulation engine is written in Go and compiled to WebAssembly. It handles tax brackets, retirement accounts, Social Security, RMDs, and dozens of life events. See [docs/SIMULATION_ENGINE.md](./docs/SIMULATION_ENGINE.md) for how it works, or [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) for the philosophy.

## Quick Start

```bash
npm install
npm run build:wasm
npm run dev
# → http://localhost:5180/test-harness
```

### Use with ChatGPT or Claude

Add `https://api.chubby.fyi/mcp` as an MCP server in ChatGPT Actions or Claude connectors. No auth required.

Then ask: *"I'm 35, make $150k, spend $50k, have $800k saved. Can I retire at 55?"*

### Local development

Requires Node.js 18+ and Go 1.22+.

## Project Structure

The MCP server (`apps/mcp-server/`) connects ChatGPT to the simulation engine. The engine itself lives in `wasm/`. There's also a React workbench (`src/`) for local development — it runs entirely in-browser with no backend.

For development details, see [CLAUDE.md](./CLAUDE.md).

## License

MIT
