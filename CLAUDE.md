# CLAUDE.md

> **Note:** The React workbench UI is still called "AreumFire" (the original project name). Some code also references "PFOS-E" — the original spec name.

## Repository Structure

```
chubby/
├── apps/mcp-server/           # ChatGPT App (MCP server + widget)
├── services/simulation-service/  # WASM HTTP wrapper
├── wasm/                      # Go Monte Carlo engine
├── src/                       # React workbench (AreumFire UI) — browser-only
└── docs/                      # Documentation
```

The AreumFire React workbench runs entirely in-browser (no backend). All data in localStorage, WASM runs via Web Workers.

## Quick Start

```bash
npm install && npm run build:wasm && npm run dev
# → http://localhost:5180/test-harness

# Or run ChatGPT App
cd apps/mcp-server && npm run chatgpt:tunnel
```

## Commands

```bash
npm run dev              # React workbench
npm run build:wasm       # Rebuild Go→WASM
npm run test             # Unit tests
npm run quality          # Lint + typecheck + tests
cd wasm && go test ./... # Go tests
```

## Core Philosophy

Chubby answers "what tends to happen under these assumptions?" — never "what should I do?"

- **Deterministic**: Same seed + inputs = identical output
- **Educational only**: Simulation results, not advice
- **Explicit uncertainty**: Missing data blocks outputs, never defaults silently

## Contributing Guidelines

### Principles
- **Ship over polish:** Stylistic inconsistencies are intentional. Don't refactor working code.
- **No speculative work:** Only fix actual bugs, not "risks" or "best practices."
- **Minimal changes:** Don't add features, refactor, or "improve" beyond what's asked.
- **Comments sparingly:** Only where logic isn't self-evident.

### When NOT to Refactor
Skip refactoring unless there's an **actual bug, merge conflict, or developer confusion right now**.

Red flags to ignore:
- "Risk of..." / "Could cause..." → Where's the bug report?
- "For scalability..." → Are we at that scale?
- "Best practice suggests..." → What's our context?

### Code Style
- Large files (600+ lines) are fine. Split only when causing real issues.
- Hardcoded values are fine if consistent.
- Don't migrate patterns unless broken.

## Documentation

- [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) — Product philosophy and UX
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — ChatGPT App architecture
- [docs/ENGINEERING.md](./docs/ENGINEERING.md) — Tool surface, state model
- [apps/mcp-server/docs/](./apps/mcp-server/docs/) — MCP server docs
