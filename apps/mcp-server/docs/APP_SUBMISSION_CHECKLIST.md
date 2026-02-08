# Chubby ChatGPT App Submission Checklist

> Cross-referenced against [OpenAI App Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines) (Feb 2026)
>
> **Status: PARKED** — Still iterating on tool schema and features. Re-review on every
> schema change would slow us down. Submit once the tool surface stabilizes.
>
> **Note:** Published apps require re-review when tool schema or tool definitions change.
> Widget HTML/CSS changes do not trigger re-review. Dev mode URL continues working regardless,
> so users are never blocked during review.

## Technical Requirements

### Widget Configuration ✅
- [x] `openai/outputTemplate` - Widget template URI with version (`v29`)
- [x] `openai/widgetAccessible` - Set to `true` for mobile rendering
- [x] `openai/widgetDomain` - Set to `chubby-simulation`
- [x] `openai/widgetCSP` - Content Security Policy configured (empty — no external resources)
- [x] `openai/toolInvocation/invoking` - Loading message
- [x] `openai/toolInvocation/invoked` - Completion message

### Tool Annotations ✅
- [x] `readOnlyHint: true` - Computation-only, no side effects
- [x] `destructiveHint: false` - No write/delete operations
- [x] `openWorldHint: false` - No external API calls
- [x] `idempotentHint: true` - Same inputs = same outputs (deterministic)

### Tool Naming ✅
- [x] `run_simulation_packet` - Verb-based, descriptive, plain language

### Input Schema ✅
- [x] Requests only financial parameters (no PII, no conversation history)
- [x] All fields directly relate to simulation purpose
- [x] No coarse/precise geolocation requested
- [x] No "just in case" fields — each parameter maps to an engine input

### Response Minimization ✅
- [x] `structuredContent` (model-facing) stripped of diagnostic metadata
- [x] No `pathsRun`, `baseSeed`, or `engineInputsHash` in model response
- [x] No deprecated backward-compat fields in model response
- [x] `runId` retained (determinism audit, not a session/tracking ID)
- [x] Full data only in `_meta.widgetData` (not sent to model)

### Predictable Behavior ✅
- [x] Tool does exactly what name/description says (runs Monte Carlo simulation)
- [x] No hidden side effects
- [x] No data sent outside environment (fragment URLs keep data in browser)
- [x] Safe to retry (idempotent with same seed)

### Widget Quality ✅
- [x] 20px padding (Apps SDK Card standard)
- [x] 44px touch targets (mobile accessibility)
- [x] 16px+ border radius (Apps SDK aligned)
- [x] Dark mode support
- [x] Responsive design
- [x] `aria-live` for loading states

### Error Handling ✅
- [x] Structured error codes (MISSING_INPUT, INVALID_RANGE, etc.)
- [x] Human-readable error messages
- [x] Graceful fallbacks for edge cases
- [x] No crashes or hangs

---

## Content & Privacy Requirements

### Privacy Policy ✅
- [x] Page created: `chubby-site/privacy.html` → https://chubby.fyi/privacy.html
- [x] Covers all required categories:
  - Personal data categories collected (none)
  - Purposes of data use (run simulation, return results)
  - Recipient categories (no third parties)
  - User controls and rights (no data stored = nothing to delete)
- [ ] **Deploy**: Push to main so Cloudflare Pages publishes it

### Terms of Service ✅
- [x] Page created: `chubby-site/terms.html` → https://chubby.fyi/terms.html
- [x] Educational disclaimer (not financial advice)
- [x] Limitation of liability
- [x] No warranty, acceptable use, service availability, IP, changes to terms
- [ ] **Deploy**: Push to main so Cloudflare Pages publishes it

---

## App Store Listing

### Required Assets ✅
- [x] App name: "Chubby" (clear, accurate)
- [x] Short description (under 80 chars) — see below
- [x] Long description — see below
- [x] App icon (512x512): `chubby-site/chubby_512.png`
- [x] Screenshots (actual functionality, correct dimensions):
  - [x] Desktop widget view: `submission-screenshot-desktop.png` (1280x800)
  - [x] Full page view: `submission-screenshot-desktop-full.png`
  - [x] Year Inspector detail: `submission-screenshot-inspector.png`

### Descriptions

**Short:**
> Monte Carlo financial planning simulator. See what tends to happen, not what you should do.

**Long:**
> Chubby is an educational financial planning tool that uses Monte Carlo simulation to explore "what tends to happen" under different assumptions.
>
> Features:
> - Plan Duration analysis (P10/P50/P75 outcomes)
> - Net Worth Trajectory visualization
> - Year-by-year cash flow inspector
> - Scenario comparison (retirement age, spending changes)
>
> Key principles:
> - Educational only — never advice or recommendations
> - Deterministic & auditable — same inputs = same outputs
> - Explicit uncertainty — shows ranges, not false precision
>
> Perfect for exploring questions like:
> - "What if I retired at 55 vs 60?"
> - "How does spending affect my runway?"
> - "What happens in harder market scenarios?"

---

## Authentication & Permissions ✅

- [x] No authentication required (public educational tool)
- [x] No user accounts or sign-ups
- [x] No permissions requested beyond tool invocation
- [x] Rate limiting via Cloudflare (100 req/min per IP)
- N/A: Demo account credentials (no auth = no demo account needed)

---

## Safety & Compliance ✅

### Prohibited Content ✅
Chubby does NOT:
- Provide financial advice or recommendations
- Sell products, services, or subscriptions
- Serve advertisements
- Collect sensitive/regulated data
- Target children under 13
- Include adult content
- Manipulate model selection (description restricts advice-giving, which is safety)

### Third-Party Compliance ✅
- [x] No third-party APIs or scraping
- [x] No bypassing of API restrictions or rate limits
- [x] Self-contained simulation engine (Go WASM)

### Age Appropriateness ✅
- [x] Suitable for general audiences (13+)
- [x] Financial literacy content, no age-restricted material

---

## Developer Verification

### Account Requirements ⚠️ MANUAL
- [ ] OpenAI Platform account with Owner role
- [ ] Identity/business verification completed in Dashboard
- [ ] Support contact email configured and accurate

---

## Pre-Submission Testing

### Functional Testing ✅
- [x] Widget renders on web
- [x] Trajectory bars display correctly
- [x] Year Inspector works for all ages
- [x] Dark mode works
- [x] Plan Duration shows correct messaging
- [x] Saturation detection works

### Edge Cases ✅
- [x] Handles missing trajectory data gracefully
- [x] Handles identical P10/P50/P75 ages (saturation)
- [x] Handles long horizons (>50 years)
- [x] No crashes, hangs, or inconsistent behavior

### Mobile Testing ⚠️ LIMITED
- [ ] Widget renders on ChatGPT mobile app
  - Note: May require published app status

---

## Action Items Summary

### Completed ✅
1. [x] Strip `pathsRun`/`baseSeed`/deprecated fields from `modelSummary` in server.ts
2. [x] Create privacy policy page (`chubby-site/privacy.html`)
3. [x] Create terms of service page (`chubby-site/terms.html`)
4. [x] Create app icon 512x512 (`chubby-site/chubby_512.png`)
5. [x] Take screenshots (desktop, full page, year inspector)
6. [x] Add footer links (Privacy + Terms) to all site pages

### Remaining (Manual) ⚠️
1. [ ] **Deploy chubby-site** — push to main so Cloudflare Pages publishes privacy + terms pages
2. [ ] **Verify OpenAI developer account** — Owner role + identity in Platform Dashboard
3. [ ] **Set support email** — in Dashboard (e.g. contact@chubby.fyi)

---

## Final Submission Checklist

Before clicking "Submit":
- [x] `modelSummary` cleaned of diagnostic metadata
- [ ] Privacy policy URL added to Dashboard (`https://chubby.fyi/privacy.html`)
- [ ] Terms of service URL added to Dashboard (`https://chubby.fyi/terms.html`)
- [ ] App icon uploaded (`chubby-site/chubby_512.png`)
- [ ] Screenshots uploaded (3 available in project root)
- [ ] Description finalized (accurate, no promotional manipulation)
- [ ] Support email verified
- [ ] One final end-to-end test (stability, responsiveness, low latency)
- [ ] Confirm: app is complete (not demo/beta)
