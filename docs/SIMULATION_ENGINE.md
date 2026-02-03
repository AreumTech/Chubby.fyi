# Simulation Engine

The simulation engine runs Monte Carlo projections of your financial future. It's written in Go and compiled to WebAssembly so it runs in the browser and on the server.

## How It Works

The engine is a **discrete event simulation**. You define events (income, expenses, contributions, etc.) and the engine processes them month by month, tracking account balances, taxes, and cash flow.

```
Events → Priority Queue → Process by Month → Update State → Repeat
```

For each simulation path:
1. Events are sorted by month and priority
2. Each month, all scheduled events execute in order
3. Market returns are applied to investment accounts
4. Taxes are calculated at year-end
5. State snapshots are recorded for output

The engine runs 100 paths with different random seeds, then reports P10/P50/P75 percentiles.

## Accounts

The engine tracks five account types:

| Account | Tax Treatment |
|---------|--------------|
| Cash | No growth, no taxes |
| Taxable | Growth taxed as capital gains |
| Tax-Deferred (401k, IRA) | Withdrawals taxed as income |
| Roth | Tax-free growth and withdrawals |
| 529 | Tax-free for education |

Withdrawals follow a default sequence: Cash → Taxable → Tax-Deferred → Roth.

## Events

Events are the building blocks. Common types:

- **Income**: Salary, Social Security, pensions
- **Expense**: Living costs, one-time purchases
- **Contribution**: Adding to investment accounts
- **Withdrawal**: Taking from accounts (with tax implications)
- **Transfer**: Moving between accounts (Roth conversions, etc.)

Each event has a `monthOffset` (when it happens) and `frequency` (once, monthly, yearly).

## Determinism

Same seed + same inputs = identical output. This is guaranteed by:

- Seeded random number generator for market returns
- Deterministic event ordering (month, then priority)
- No floating-point ambiguity in financial calculations

You can replay any simulation by saving the seed.

## Key Files

| File | Purpose |
|------|---------|
| `wasm/simulation.go` | Main simulation loop |
| `wasm/event_queue.go` | Priority queue implementation |
| `wasm/event_handler_*.go` | Event processing logic |
| `wasm/tax.go` | Tax calculations |
| `wasm/market.go` | Market return generation |

## Limitations

- U.S. tax system only
- No real estate modeling (except as illiquid asset)
- No debt/mortgage amortization
- Social Security uses simplified benefit calculation
