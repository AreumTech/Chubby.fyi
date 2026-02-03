# Chubby Product Specification

> **Note:** The React workbench UI is still called "AreumFire" (the original project name). Some code also references "PFOS-E" — the original spec name.

Chubby is a chat-assisted financial simulation lens that turns vague life-money questions into Simulation Packets showing conditional outcomes as ranges.

## Core Philosophy

**Chubby answers:** "What tends to happen under these assumptions?"
**Chubby never answers:** "What should I do?"

### What Chubby Is
- Educational tool for exploring "what-if" scenarios
- Structured, auditable simulator that surfaces drivers of outcomes

### What Chubby Is Not
- Advice, recommendations, rankings, optimization, predictions, or execution
- A substitute for tax/legal/financial professionals

## Safety Posture

- **Pull-based only:** User-initiated runs; no notifications, no background monitoring
- **No execution:** No trades, transfers, orders, account controls
- **No nudges:** No "do this," "act now," "cost of inaction," or implied preference
- **No monetization pressure:** No referrals, upsells, product placement
- **No decision memory:** No storing "chosen option" — only user-authored notes

## Architecture Principle

**LLM = intent parsing + clarification + explanation + draft-change proposals (never commits)**
**Engine = deterministic math + simulation + constraint checks (truth layer)**

No component prescribes actions or asserts authority.

---

## Four Educational Wedges

### 1. FI Fragility Exploration
Explore fragility and early sequence sensitivity (not "will you be fine").
- Probability of cash floor breach over early horizon
- Sensitivity to spend/returns/inflation

### 2. Capital Sourcing Scenarios
Explore tradeoffs among liquidity, borrowing assumptions, and timing.
- Probability of meeting funding amount while maintaining cash floor
- Interest cost range, opportunity cost range
- Forced liquidation probability (neutral risk metric)

### 3. Concentration / RSU Exposure Exploration
Explore exposure and concentration behavior over time.
- Exposure bands, concentration bands, regret envelopes
- Hypothetical exposure trajectories (not sell plans)

### 4. Sabbatical / Income Shock Exploration
Explore runway sensitivity under income disruption.
- Distribution of months until cash floor breach
- Scenario variants change assumptions, no direction

---

## Data Completeness Tiers

- **Bronze:** Totals by type + basic income/spend + events skeleton
- **Silver:** Liability terms + policy constraints + coarse exposure info
- **Gold:** Lots + detailed schedules + enhanced tax inputs

Missing data widens bands or blocks outputs — never silently defaults.

---

## Language Rules (Strict)

**Never say:** recommend, should, best, optimal, right choice, cost of inaction, safe plan, act now

**Always say:** under these assumptions, simulated, conditional, sensitive to, ranges overlap, blocked due to missing inputs

---

# UX Specification

## Core Mental Model

Three visible surfaces:
1. **Chat** — Intent & Explanation (control surface)
2. **Simulation Packet** — Truth Artifact (the actual answer)
3. **Simulation Profile** — Persisted Inputs

User intuition:
- "Chat helps me ask better questions."
- "The packet is the actual answer."
- "My profile just saves my assumptions."

## Invocation Workflow

User: "Can I retire this year?"

Chubby response (always structured):
```
I can explore this as an educational simulation.

I don't determine whether you should retire.
I show what tends to happen under explicit assumptions.

To do this safely, I'll:
1) Set up a minimal simulation baseline
2) Simulate "retiring this year" as a scenario

Nothing is saved unless you confirm.
```

## Draft → Review → Confirm Pattern

Chat **never applies changes directly**. When chat infers changes:

1. DraftChange card appears in chat
2. User clicks [Review]
3. Modal shows old/new values, scope options
4. User clicks [Confirm] or [Cancel]

Nothing updates until confirmed.

## Simulation Packet Structure

The packet renders as a formal document with sticky header:

```
SIMULATION PACKET #042
Retirement Timing Exploration
Horizon: 2026–2060 | Tier: Bronze | Seed: 839201

⚠ Educational simulation only. Conditional on assumptions. Not advice.
```

### Packet Sections

1. **Summary** — Question, primary metrics, top drivers, uncertainty notes
2. **Baseline** — No-change scenario with P5/P50/P95 distributions
3. **Variants** — Neutral labels (A/B/C), no preference language
4. **Outcome Overlap** — Symmetric phrasing, no "winner"
5. **Sensitivity** — Top drivers with tornado chart
6. **Missing Data** — Tier, blocked outputs, what unlocks them
7. **Considered-but-Blocked** — Scenarios that couldn't run safely
8. **Conditions of Difference** — Thresholds where outcomes diverge
9. **User Notes** — Optional, user-authored only
10. **Math Trace** — One illustrative period (median path)
11. **Audit Footer** — Engine version, seed, tax fidelity, export options

## UX Rules (Non-Negotiable)

- Chat explains, packets answer
- Every answer = a packet
- No yes/no answers
- No recommendations or rankings
- No default emphasis implying preference
- Uncertainty is always visible
- Blocked outputs are explicit

---

## One-Line Summary

**Chubby lets users ask human financial questions, but forces the answer to appear as a rigorous, inspectable simulation document — never as advice, never as a decision.**
