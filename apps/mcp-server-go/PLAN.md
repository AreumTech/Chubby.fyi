# Go MCP Server - Implementation Notes

> See README.md for status and decision to defer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Worker (JS)                    Container (Go)                          │
│  ┌─────────────┐               ┌─────────────────────────────────────┐ │
│  │ Route /mcp  │──────────────▶│  Single Go Binary                   │ │
│  │ to container│               │  ├── MCP Server (SSE)               │ │
│  └─────────────┘               │  ├── Simulation Engine (native)     │ │
│                                │  ├── Widget HTML (embedded)         │ │
│                                │  └── Health endpoint                │ │
│                                │                                     │ │
│                                │  Port 8080 · linux/amd64            │ │
│                                └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Stateless (No Durable Objects)

PFOS-E simulations are pure functions: `(seed, inputs) → deterministic output`

- No session state needed at server
- SSE session is ephemeral (message routing only)
- Container can scale to zero and spin up fresh
- Reduces cost, complexity, mental overhead

Add Durable Objects only if later needed for:
- Multi-user collaboration
- Long-running async jobs
- Server-side persistence

### wrangler.toml (Stateless Config)

```toml
name = "areumfire-mcp-server"
main = "src/worker.js"
compatibility_date = "2024-01-01"

[containers]
image = "areumfire-mcp-server:latest"
max_instances = 3
min_instances = 0

[[containers.routes]]
pattern = "/mcp"
to = "http://localhost:8080/mcp"
```

### Worker Glue (Simple Proxy)

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const containerUrl = new URL(url.pathname + url.search, 'http://localhost:8080');
    return fetch(new Request(containerUrl, request));
  },
};
```

## Future: Full Port from WASM

To reach feature parity with Node.js server:

1. **Extract from `wasm/`:**
   - `simulation.go` - Core MC engine
   - `event_handler_*.go` - Event processing (~20 files)
   - `tax_engine.go` - Tax calculations
   - `withdrawal_ordering.go` - Account withdrawal logic

2. **Remove WASM specifics:**
   - `//go:build js && wasm` tags
   - `syscall/js` imports
   - JS callback registration

3. **Integrate:**
   - Wire handlers into `internal/simulation/`
   - Add validation from `runSimulation.ts`
   - Add response formatting

Estimated: 3-5 days of focused work.
