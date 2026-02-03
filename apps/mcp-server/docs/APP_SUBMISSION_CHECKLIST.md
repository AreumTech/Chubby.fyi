# AreumFire ChatGPT App Submission Checklist

## Technical Requirements

### Widget Configuration ✅
- [x] `openai/outputTemplate` - Widget template URI with version
- [x] `openai/widgetAccessible` - Set to `true` for mobile rendering
- [x] `openai/widgetDomain` - Set to `chubby-simulation`
- [x] `openai/widgetCSP` - Content Security Policy configured
- [x] `openai/toolInvocation/invoking` - Loading message
- [x] `openai/toolInvocation/invoked` - Completion message

### Tool Annotations ✅
- [x] `readOnlyHint: true` - Both tools are computation-only
- [x] `destructiveHint: false` - No write/delete operations
- [x] `openWorldHint: false` - No external API calls

### Tool Naming ✅
- [x] `run_simulation_packet` - Verb-based, descriptive
- [x] `extract_financial_changes` - Verb-based, descriptive

### Widget Quality ✅
- [x] 20px padding (Apps SDK Card standard)
- [x] 44px touch targets (mobile accessibility)
- [x] 16px+ border radius (Apps SDK aligned)
- [x] Dark mode support
- [x] Responsive design
- [x] `aria-live` for loading states

---

## Content & Privacy Requirements

### Privacy Policy ⚠️ NEEDED
- [ ] Published privacy policy URL
- [ ] Must explain:
  - Data collection categories
  - Usage purposes
  - Recipient categories
  - User controls/rights

**Draft privacy points for AreumFire:**
- No personal data stored on servers
- All calculations run client-side (WASM)
- No data transmitted to third parties
- No cookies or tracking
- Session data is ephemeral

### Terms of Service ⚠️ NEEDED
- [ ] Published ToS URL
- [ ] Educational disclaimer (not financial advice)
- [ ] Limitation of liability

---

## App Store Listing

### Required Assets ⚠️ NEEDED
- [ ] App name: "AreumFire" or "AreumFire Financial Simulator"
- [ ] Short description (under 80 chars)
- [ ] Long description
- [ ] App icon (512x512)
- [ ] Screenshots (at least 2)
  - [ ] Desktop widget view
  - [ ] Mobile widget view (if supported)
  - [ ] Year Inspector detail

### Suggested Descriptions

**Short:**
> Monte Carlo financial planning simulator. See what tends to happen, not what you should do.

**Long:**
> AreumFire is an educational financial planning tool that uses Monte Carlo simulation to explore "what tends to happen" under different assumptions.
>
> Features:
> - Plan Duration analysis (P10/P50/P75 outcomes)
> - Net Worth Trajectory visualization
> - Year-by-year cash flow inspector
> - Scenario comparison (retirement age, spending changes)
>
> Key principles:
> - Educational only - never advice or recommendations
> - Deterministic & auditable - same inputs = same outputs
> - Explicit uncertainty - shows ranges, not false precision
>
> Perfect for exploring questions like:
> - "What if I retired at 55 vs 60?"
> - "How does spending affect my runway?"
> - "What happens in harder market scenarios?"

---

## Developer Verification

### Account Requirements ⚠️ CHECK
- [ ] OpenAI Platform account with Owner role
- [ ] Identity verification completed
- [ ] Support contact email configured

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

### Mobile Testing ⚠️ LIMITED
- [ ] Widget renders on ChatGPT mobile app
  - Note: May require published app status

---

## Data Minimization ✅

AreumFire complies with data minimization requirements:
- No PII collected
- No session IDs in responses (only runId for auditability)
- No diagnostic metadata exposed to users
- All data is ephemeral (no persistence)

---

## Prohibited Content ✅

AreumFire does NOT:
- Provide financial advice
- Sell products or services
- Collect sensitive data
- Target children under 13
- Include adult content
- Manipulate model selection

---

## Action Items Summary

### Must Have (Blockers)
1. [ ] Publish privacy policy
2. [ ] Publish terms of service
3. [ ] Create app icon
4. [ ] Take screenshots
5. [ ] Verify OpenAI developer account

### Nice to Have
- [ ] Landing page for the app
- [ ] Support documentation
- [ ] FAQ page

---

## Submission Checklist

Before clicking "Submit":
- [ ] All tools tested and working
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] App icon uploaded
- [ ] Screenshots uploaded
- [ ] Description finalized
- [ ] Support email verified
- [ ] One final end-to-end test
