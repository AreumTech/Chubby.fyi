# Calculator Integration Guide

This document explains how the comprehensive financial calculators are integrated into the WASM simulation engine.

## Overview

The simulation engine includes 12 specialized financial calculators that provide accurate, regulation-compliant calculations for retirement planning:

### All Calculators (Integrated, Tested & Documented) ✅

1. **ContributionLimitTracker** - IRS contribution limit enforcement
2. **StateTaxCalculator** - State-specific income tax calculations
3. **RMDCalculator** - Required Minimum Distribution calculations
4. **WithdrawalSequencer** - Tax-efficient withdrawal ordering
5. **AssetLocationOptimizer** - Asset placement across account types
6. **RothConversionOptimizer** - Roth conversion tax optimization
7. **SocialSecurityCalculator** - Benefit optimization and claiming strategies
8. **EstateTaxCalculator** - Federal and state estate tax planning
9. **LongTermCareCalculator** - LTC cost projections with insurance
10. **PropertyCostEscalator** - Property tax and insurance with state rules
11. **GoalPrioritizer** - Multi-goal fund allocation
12. **TaxAwareRebalancer** - Portfolio rebalancing with tax optimization

**Status**: All 12 calculators are production-ready with comprehensive documentation, integration tests, and usage examples.

## Architecture

### Initialization

Calculators are created and injected into `SimulationEngine` during initialization:

```go
// In NewSimulationEngine() - simulation.go:168-227
stateTaxCalculator := NewStateTaxCalculator()
taxCalculator := NewTaxCalculator(taxConfig, stateTaxCalculator)
contributionLimitTracker := NewContributionLimitTracker()
// ... other calculators ...

return &SimulationEngine{
    taxCalculator:            taxCalculator,
    contributionLimitTracker: contributionLimitTracker,
    stateTaxCalculator:       stateTaxCalculator,
    // ... other fields ...
}
```

### Integration Pattern

Calculators follow a clean dependency injection pattern:

1. **Calculator** = Stateless, reusable calculation logic
2. **Event Handler** = Orchestration layer that calls calculators
3. **SimulationEngine** = Owns calculator instances

```
User Event → Event Handler → Calculator → Result → Handler processes
```

## Active Integrations

### 1. Contribution Limit Tracker

**Enforces IRS contribution limits** during contribution events.

**Integration Point**: `simulation.go:2625-2670`

```go
func (se *SimulationEngine) enforcePreTaxContributionLimits(
    contributionAmount *float64,
    currentMonth int,
) float64 {
    // Get maximum allowed contribution
    maxAllowed := se.contributionLimitTracker.GetMaxAllowedContribution(
        "tax_deferred",
        *contributionAmount,
    )

    if maxAllowed < *contributionAmount {
        // Cap contribution and return excess
        excess := *contributionAmount - maxAllowed
        *contributionAmount = maxAllowed
        se.contributionLimitTracker.TrackContribution("tax_deferred", maxAllowed)
        return excess // Routed to taxable account
    }

    // Within limit
    se.contributionLimitTracker.TrackContribution("tax_deferred", *contributionAmount)
    return 0
}
```

**Features**:
- Tracks YTD contributions per account type
- Age-based catch-up contributions ($7.5k at 50+ for 401k, $1k at 50+ for IRA)
- Annual limit reset in `ProcessAnnualTaxes()`
- Separate tracking for 401k, IRA, HSA, SIMPLE, SEP
- Returns excess for routing to taxable accounts

**2024 IRS Limits**:
- 401k/403b/457: $23,000 + $7,500 catch-up (age 50+)
- IRA/Roth IRA: $7,000 + $1,000 catch-up (age 50+)
- HSA: $4,150 individual / $8,300 family + $1,000 catch-up (age 55+)

### 2. State Tax Calculator

**Calculates state-specific income taxes** during annual tax processing.

**Integration Point**: `tax.go:291-336`

```go
func (tc *TaxCalculator) CalculateStateIncomeTax(taxableIncome float64) float64 {
    if tc.stateTaxCalculator != nil {
        return tc.stateTaxCalculator.CalculateStateTax(
            taxableIncome,    // ordinaryIncome
            0,                // capitalGains (handled separately)
            tc.config.State,
            tc.config.FilingStatus,
            0,                // numDependents
        )
    }
    // Fallback to legacy logic...
}
```

**Supported Tax Structures**:
- **Progressive**: CA, NY, NJ, HI, DC, OR, MN, MA (8 states)
- **Flat**: IL (4.95%), PA (3.07%), CO (4.40%), MI (4.25%) (4 states)
- **No Tax**: TX, FL, WA, NV, SD, AK, TN, NH, WY (9 states)
- **Special**: WA capital gains (7% on gains >$250k)

**Features**:
- Filing status-specific brackets (single, MFJ, MFS, HoH)
- Standard deductions by state
- Dependent exemptions
- 2024 tax year accurate

### 3. RMD Calculator

**Calculates Required Minimum Distributions** for tax-deferred retirement accounts.

**Integration Point**: `withdrawal_sequencing.go:60-72`

```go
// Automatic RMD calculation during withdrawals (age 73+)
if request.CurrentAge >= 73 {
    rmdAmount := ws.rmdCalculator.CalculateTotalRMDs(request.CurrentAge, accounts)
    if rmdAmount > 0 {
        result.RMDAmount = rmdAmount
        // RMD must be withdrawn from tax-deferred accounts
        accounts.TaxDeferred.TotalValue -= rmdAmount
        accounts.Cash += rmdAmount
    }
}
```

**Features**:
- IRS Uniform Lifetime Table (Publication 590-B)
- SECURE 2.0 Act compliant (RMDs start at age 73)
- Age-based divisors (73: 26.5, 80: 20.2, 90: 12.2)
- Multi-year RMD projections
- Total RMD calculation across all tax-deferred accounts

**Usage Examples**:
```go
// Single-year RMD calculation
rmd := engine.rmdCalculator.CalculateRMD(75, 500000.0)
// Returns: $20,325 (age 75 divisor is 24.6)

// RMD as percentage
pct := engine.rmdCalculator.CalculateRMDPercentage(75)
// Returns: 0.0407 (4.07%)

// Multi-year projection
projections := engine.rmdCalculator.ProjectRMDs(
    73,        // starting age
    500000.0,  // starting balance
    0.05,      // 5% annual growth
    10,        // 10 years
)
```

### 4. Withdrawal Sequencer

**Executes tax-efficient withdrawals** with intelligent account ordering.

**Integration Point**: `event_handler.go:1271-1532` (Withdrawal events)

```go
// Four withdrawal sequences available
type WithdrawalSequence string

const (
    WithdrawalSequenceTaxEfficient     = "tax_efficient"      // Recommended
    WithdrawalSequenceTaxDeferredFirst = "tax_deferred_first" // IRA-first
    WithdrawalSequenceCashFirst        = "cash_first"         // Simple
    WithdrawalSequenceProportional     = "proportional"       // Constant allocation
)
```

**Features**:
- Tax-efficient sequence: Cash → Taxable → Tax-Deferred → Roth
- Automatic RMD processing (age 73+)
- Gross-up calculations for tax-deferred withdrawals
- Capital gains tracking during taxable withdrawals
- FIFO asset sale ordering

**Usage Examples**:
```go
// Execute tax-efficient withdrawal
request := WithdrawalRequest{
    Amount:       60000.0,
    CurrentAge:   68,
    CurrentMonth: 6,
}

result, err := engine.withdrawalSequencer.ExecuteWithdrawal(
    request,
    accounts,
    WithdrawalSequenceTaxEfficient,
)

// Result contains:
// - CashWithdrawn, TaxableWithdrawn, TaxDeferredWithdrawn, RothWithdrawn
// - RMDAmount (if applicable)
// - EstimatedTaxOwed
// - WithdrawalSequence (audit trail)
```

**Withdrawal Strategies**:

| Sequence | Order | Use Case |
|----------|-------|----------|
| `tax_efficient` | Cash → Taxable → Tax-Deferred → Roth | **Recommended** - Minimizes lifetime taxes |
| `tax_deferred_first` | Cash → Tax-Deferred → Taxable → Roth | Reduce future RMDs |
| `cash_first` | Cash only | Simple, no tax optimization |
| `proportional` | All accounts proportionally | Maintain allocation |

### 5. Asset Location Optimizer

**Optimizes asset placement** across account types for maximum after-tax wealth.

**Integration Point**: Available for use in rebalancing and allocation strategies

```go
// Asset location principles (Chapter 8):
// 1. Highest return assets → Roth (tax-free growth)
// 2. Tax-inefficient assets → Tax-deferred (defer ordinary income)
// 3. Tax-efficient assets → Taxable (low tax drag)
```

**Features**:
- Tax efficiency scoring for asset classes
- Multi-phase placement algorithm (Roth → Tax-Deferred → Taxable)
- Default profiles for stocks, bonds, REITs, international
- After-tax value projections
- Account type comparison tools

**Usage Examples**:
```go
// Calculate tax efficiency
bondProfile := AssetClassProfile{
    AssetClass:           AssetClassUSBondsTotalMarket,
    ExpectedReturn:       0.04,
    DividendYield:        0.04,  // All interest income
    TurnoverRate:         0.20,
    QualifiedDividendPct: 0.0,   // None qualified
}

efficiency := engine.assetLocationOptimizer.CalculateTaxEfficiency(bondProfile)
// Returns: ~60 (bonds are tax-inefficient)

// Generate location plan
profiles := engine.assetLocationOptimizer.GetDefaultAssetProfiles()

accountCapacities := map[string]float64{
    "taxable":      200000.0,
    "tax_deferred": 400000.0,
    "roth":         100000.0,
}

targetAllocations := map[AssetClass]float64{
    AssetClassUSStocksTotalMarket: 420000.0,  // 60%
    AssetClassUSBondsTotalMarket:  210000.0,  // 30%
    AssetClassInternationalStocks: 70000.0,   // 10%
}

plan, err := engine.assetLocationOptimizer.GenerateLocationPlan(
    profiles,
    accountCapacities,
    targetAllocations,
)

// Plan contains:
// - AssetPlacements: map[AssetClass]map[AccountType]Amount
// - Recommendations with priority and reasoning
// - Tax drag estimates
```

**Tax Efficiency Rankings**:
- **Highly Efficient (>85)**: Index stocks, ETFs, tax-managed funds → **Taxable**
- **Moderately Efficient (70-85)**: International stocks, active funds → **Either**
- **Tax-Inefficient (<70)**: Bonds, REITs, high-yield → **Tax-Deferred** or **Roth**

### 6. Roth Conversion Optimizer

**Optimizes Roth IRA conversions** for tax-efficient retirement income.

**Integration Point**: Annual tax processing for conversion opportunities

```go
// Optimal conversion window: Low-income years before RMDs
// Typical: Ages 62-72 (early retirement, before Social Security & RMDs)
```

**Features**:
- Tax bracket targeting (fill 10%, 12%, 22% brackets)
- Multi-year conversion planning
- Effective tax rate analysis
- Break-even horizon calculations
- Scenario comparison (with vs. without conversions)

**Usage Examples**:
```go
// Evaluate single conversion opportunity
opportunity := engine.rothConversionOptimizer.EvaluateConversionOpportunity(
    65,        // age
    2024,      // year
    30000.0,   // current taxable income (low - ideal for conversion)
    40000.0,   // conversion amount
    FilingStatusMarriedFilingJointly,
    29200.0,   // standard deduction
)

// Returns ConversionOpportunity with:
// - Recommended: true/false
// - EffectiveTaxRate: 0.12 (12%)
// - ConversionTaxOwed: $4,800
// - Reason: "Good: 12% tax rate (low bracket)"

// Calculate optimal conversion to fill bracket
optimalAmount := engine.rothConversionOptimizer.CalculateOptimalConversionAmount(
    50000.0,   // current taxable income
    89075.0,   // 12% bracket top (MFJ 2024)
    200000.0,  // IRA balance
)
// Returns: $39,075 (fills 12% bracket exactly)

// Generate multi-year conversion plan
strategy := ConversionStrategy{
    TargetBracketName:   "12%",
    TargetBracketTop:    89075.0,
    MaxAge:              72,    // Before RMDs start
    MaxEffectiveTaxRate: 0.15,  // Don't convert above 15%
}

plan, err := engine.rothConversionOptimizer.GenerateConversionPlan(
    62,         // start age (early retirement)
    500000.0,   // IRA balance
    20000.0,    // projected annual income
    FilingStatusMarriedFilingJointly,
    29200.0,    // standard deduction
    strategy,
)

// Plan contains:
// - Conversions: []ConversionOpportunity (year-by-year)
// - TotalAmountConverted
// - TotalTaxesPaid
// - EstimatedTaxSavings
```

**Conversion Decision Matrix**:

| Income Level | Tax Bracket | Recommendation | Effective Rate |
|--------------|-------------|----------------|----------------|
| Low (<$50k) | 10-12% | ✅ **Excellent** | <15% |
| Medium ($50-100k) | 12-22% | ⚠️ **Consider** | 15-22% |
| High (>$100k) | 22-24%+ | ❌ **Skip** | >22% |

### 7. Social Security Calculator

**Calculates Social Security benefits** with claiming age optimization.

**Integration Point**: Available for retirement income planning

```go
// Social Security claiming strategies
// Ages 62-70: 62 = 70% of FRA benefit, 70 = 124% of FRA benefit
// Full Retirement Age (FRA): 67 for those born 1960+
```

**Features**:
- Claiming age 62-70 with accurate benefit adjustments
- Full Retirement Age (FRA) calculations for different birth years
- Spousal benefits (up to 50% of higher earner's PIA)
- Survivor benefits (100% of deceased spouse's benefit)
- COLA adjustments (2.5% historical average)
- Early claiming reduction (5/9% per month for first 36 months, 5/12% thereafter)
- Delayed retirement credits (8% per year from FRA to 70)
- Earnings test if claiming before FRA

**Usage Examples**:
```go
// Calculate monthly benefit at different claiming ages
profile := SocialSecurityProfile{
    BirthYear:              1960,
    FullRetirementAge:      67,
    PrimaryInsuranceAmount: 2500.0, // PIA at FRA
    PlannedClaimingAge:     67,
}

// Benefit at age 62 (early)
benefitAt62 := engine.socialSecurityCalc.CalculateMonthlyBenefit(profile, 62)
// Returns: ~$1,750 (70% of PIA due to early claiming penalty)

// Benefit at age 67 (FRA)
benefitAt67 := engine.socialSecurityCalc.CalculateMonthlyBenefit(profile, 67)
// Returns: $2,500 (100% of PIA)

// Benefit at age 70 (delayed)
benefitAt70 := engine.socialSecurityCalc.CalculateMonthlyBenefit(profile, 70)
// Returns: $3,100 (124% of PIA due to delayed credits)

// Optimize claiming age
optimalAge := engine.socialSecurityCalc.OptimizeClaimingAge(
    profile,
    90,   // life expectancy
    0.03, // discount rate
)

// Calculate spousal benefit
spousalBenefit := engine.socialSecurityCalc.CalculateSpousalBenefit(
    profile.PrimaryInsuranceAmount,
    63, // spouse's claiming age
    67, // spouse's FRA
)
```

**Claiming Age Impact Table**:

| Claiming Age | % of FRA Benefit | Example ($2,500 PIA) |
|--------------|------------------|---------------------|
| 62 | 70% | $1,750 |
| 64 | 80% | $2,000 |
| 67 (FRA) | 100% | $2,500 |
| 68 | 108% | $2,700 |
| 70 | 124% | $3,100 |

**Break-Even Analysis**: Claiming at 62 vs 70 breaks even around age 80-81

### 8. Estate Tax Calculator

**Calculates federal and state estate taxes** with exemption and portability rules.

**Integration Point**: Available for estate planning and legacy analysis

```go
// Estate tax rules (2024)
// Federal exemption: $13.61M per person
// Rate: 40% on amounts above exemption
// Portability: Surviving spouse can use deceased spouse's unused exemption
```

**Features**:
- Federal estate tax (2024 exemption: $13.61M, 40% rate)
- State estate taxes (12 states + DC)
- Spousal portability election
- Lifetime gift integration
- Generation-skipping transfer tax (GSTT)
- Deductions for charitable and marital bequests
- Sunset provision tracking (drops to ~$7M in 2026)

**Usage Examples**:
```go
// Calculate federal estate tax
profile := EstateProfile{
    GrossEstateValue:    20000000.0,
    Debts:               500000.0,
    FuneralExpenses:     25000.0,
    AdminExpenses:       100000.0,
    CharitableBequest:   1000000.0,
    MaritalBequest:      5000000.0,
    LifetimeGifts:       1000000.0, // Gifts above annual exclusion
    PortableExemption:   0.0,
    StateCode:           "CA",
    YearOfDeath:         2024,
}

fedTax := engine.estateTaxCalculator.CalculateFederalEstateTax(profile)
// Calculates: (Taxable Estate - Exemption) * 40%

stateTax := engine.estateTaxCalculator.CalculateStateEstateTax(profile)
// California has no state estate tax, returns $0

// Calculate total tax liability
totalTax := engine.estateTaxCalculator.CalculateTotalEstateTax(profile)

// Calculate after-tax legacy
netEstate := profile.GrossEstateValue - profile.Debts -
             profile.FuneralExpenses - profile.AdminExpenses - totalTax
```

**State Estate Tax Summary**:

| State | Exemption | Rate Range | Notes |
|-------|-----------|------------|-------|
| MA, OR | $1M | 10-16% | Lowest exemptions |
| NY | $6.94M | 3.06-16% | Cliff tax |
| CT, VT | $13.61M | Matches federal | Most generous |
| CA, FL, TX | None | N/A | No estate tax |

### 9. Long-Term Care Calculator

**Models long-term care costs** and insurance benefits for retirement planning.

**Integration Point**: Available for healthcare expense projections

```go
// LTC cost ranges (2024 national averages)
// Nursing Home: $105-117k/year
// Assisted Living: $64k/year
// Home Health Aide: $76k/year
```

**Features**:
- National and state-specific cost data
- Multiple care levels (homemaker, home health, assisted living, nursing home)
- Healthcare inflation (5% vs 2.5% general inflation)
- Duration statistics (70% of 65+ need LTC, average 3 years)
- Medicaid eligibility analysis
- LTC insurance benefit calculations
- Regional cost adjustments

**Usage Examples**:
```go
// Calculate annual LTC cost
profile := LongTermCareProfile{
    CurrentAge:           65,
    Gender:               "female", // Women need care longer
    StateCode:            "CA",
    PreferredCareLevel:   LTCAssistedLiving,
    HasLTCInsurance:      true,
    DailyBenefit:         200.0,
    BenefitPeriod:        3, // years
    EliminationPeriod:    90, // days
}

// Annual cost for assisted living in CA
annualCost := engine.ltcCalculator.CalculateAnnualCost(
    LTCAssistedLiving,
    "CA", // California costs ~30% above national average
)
// Returns: ~$83,000/year (vs $64k national average)

// Project costs over time with healthcare inflation
projection := engine.ltcCalculator.ProjectCosts(
    profile,
    10, // years
    0.05, // 5% healthcare inflation
)

// Calculate insurance benefit
insuranceCoverage := engine.ltcCalculator.CalculateInsuranceBenefit(profile)

// Medicaid eligibility check
eligible := engine.ltcCalculator.CheckMedicaidEligibility(
    profile,
    150000.0, // net worth
    3000.0,   // monthly income
)
```

**2024 National Average Costs**:

| Care Level | Annual Cost | Daily/Hourly |
|------------|-------------|--------------|
| Nursing Home (Private) | $116,800 | $320/day |
| Nursing Home (Semi-Private) | $105,200 | $288/day |
| Assisted Living | $64,200 | $5,350/month |
| Home Health Aide | $75,504 | $33/hour |
| Homemaker Services | $68,640 | $30/hour |
| Adult Day Care | $21,320 | $82/day |

**Planning Guidelines**:
- **Self-insure if net worth >$2M**
- **LTC insurance if net worth $200K-$2M**
- **Medicaid planning if net worth <$200K**

### 10. Property Cost Escalator

**Models escalating property ownership costs** including taxes, maintenance, insurance, and HOA fees.

**Integration Point**: Available for real estate expense projections

```go
// Property tax rules vary by state
// California Prop 13: 2% annual cap
// Texas: No cap, ~1.8% of value annually
// National average: 2-4% annual increases
```

**Features**:
- Property tax escalation with state-specific rules
- Maintenance cost modeling (1-2% of home value annually)
- Homeowner's insurance increases (5-10% in high-risk areas)
- HOA fee escalation (3-5% annually)
- State-specific rules (CA Prop 13, FL Save Our Homes, MA Prop 2½)
- Major system replacement scheduling
- Climate risk adjustments

**Usage Examples**:
```go
// Project property costs
profile := PropertyProfile{
    PurchasePrice:     800000.0,
    CurrentValue:      1000000.0,
    YearBuilt:         2000,
    SquareFeet:        2500,
    PropertyType:      "single_family",
    PropertyTax:       10000.0,  // Current annual
    HomeInsurance:     2000.0,
    HOAFees:           4800.0,   // $400/month
    MaintenanceBudget: 10000.0,
    StateCode:         "CA",
    IsCoastal:         true,
    IsWildfireZone:    false,
    IsFloodZone:       false,
}

// Project costs over 30 years
projection := engine.propertyCostEscalator.ProjectPropertyCosts(
    profile,
    30, // years
)

// Year 1: $26,800 total ($10k tax + $2k insurance + $4.8k HOA + $10k maintenance)
// Year 30: ~$60,000 total (with escalation)

// Calculate specific component escalation
taxInYear10 := engine.propertyCostEscalator.ProjectPropertyTax(
    profile,
    10, // years ahead
)

// CA Prop 13: Tax capped at 2% annual increase
// Year 10: $10,000 * (1.02^10) = $12,190
```

**State Property Tax Rules**:

| State | Rule | Annual Cap | Notes |
|-------|------|------------|-------|
| CA | Prop 13 | 2% | Resets on sale |
| FL | Save Our Homes | 3% | Primary residence |
| TX | None | Varies | High rates (~1.8%) |
| NY | STAR program | Varies | School tax reduction |
| MA | Prop 2½ | 2.5% | Municipal cap |

### 11. Goal Prioritizer

**Prioritizes and optimizes goal funding** when resources are constrained.

**Integration Point**: Available for multi-goal planning and optimization

```go
// Goal priority levels:
// CRITICAL: Essential needs (healthcare, food, shelter)
// MUST_HAVE: Core retirement goals that define success
// IMPORTANT: Desired goals that improve quality of life
// NICE_TO_HAVE: Aspirational goals
```

**Features**:
- Four-tier priority system (Critical, Must-Have, Important, Nice-to-Have)
- Goal category tracking (Retirement, College, Dream, Other)
- Monte Carlo success rate analysis
- Goal failure cascade management
- Resource allocation optimization
- Trade-off analysis and recommendations
- Goal timing optimization

**Usage Examples**:
```go
// Define multiple goals
goals := []PrioritizedGoal{
    {
        ID:           "basic-retirement",
        Name:         "Basic Retirement Spending",
        Priority:     PriorityCritical,
        Category:     "Retirement",
        TargetAmount: 2400000.0, // $80k/year * 30 years
        StartYear:    2030,
        EndYear:      2060,
        Status:       GoalStatusNotStarted,
    },
    {
        ID:           "college-fund",
        Name:         "Children's College",
        Priority:     PriorityMustHave,
        Category:     "College",
        TargetAmount: 300000.0,
        StartYear:    2028,
        EndYear:      2032,
        Status:       GoalStatusNotStarted,
    },
    {
        ID:           "vacation-home",
        Name:         "Beach House",
        Priority:     PriorityNiceToHave,
        Category:     "Dream",
        TargetAmount: 500000.0,
        StartYear:    2035,
        EndYear:      2035,
        Status:       GoalStatusNotStarted,
    },
}

// Allocate funds across goals
availableFunds := 150000.0 // Annual savings
allocation := engine.goalPrioritizer.AllocateFunds(
    goals,
    availableFunds,
)

// Returns FundingPlan with prioritized allocation
// Result: Basic retirement fully funded, college partially funded,
//         beach house deferred if funds insufficient

// Analyze goal success rates
successRates := engine.goalPrioritizer.AnalyzeGoalSuccessRates(
    goals,
    monteCarloResults,
)

// Recommend trade-offs
recommendations := engine.goalPrioritizer.RecommendTradeoffs(
    goals,
    successRates,
)
```

**Goal Success Rate Interpretation**:

| Success Rate | Status | Action |
|--------------|--------|--------|
| 90%+ | ✅ **Excellent** | Goal likely achievable |
| 75-90% | ✅ **Good** | Minor adjustments needed |
| 50-75% | ⚠️ **Uncertain** | Significant risk |
| <50% | ❌ **Poor** | Major changes required |

### 12. Tax-Aware Rebalancer

**Implements tax-efficient portfolio rebalancing** to minimize tax drag.

**Integration Point**: Available for portfolio rebalancing operations

```go
// Tax-aware rebalancing principles:
// 1. Rebalance tax-deferred accounts first (no immediate tax)
// 2. Use new contributions to rebalance (avoid sales)
// 3. Harvest tax losses opportunistically
// 4. Defer gains when in high tax bracket
// 5. Avoid short-term capital gains
```

**Features**:
- Tax-loss harvesting with wash sale prevention
- Capital gains tax optimization
- Account-type prioritization (tax-deferred → Roth → taxable)
- Contribution-based rebalancing
- Threshold-based rebalancing triggers
- Tax lot optimization (FIFO, LIFO, specific identification)
- NIIT (3.8% Net Investment Income Tax) awareness

**Usage Examples**:
```go
// Setup portfolio for rebalancing
accounts := []PortfolioAccount{
    {
        AccountType:  "taxable",
        TotalValue:   200000.0,
        CashBalance:  10000.0,
        Lots: []AccountLot{
            {
                AssetClass:    "US_Stocks",
                PurchaseDate:  2020,
                CostBasis:     80000.0,
                CurrentValue:  120000.0, // $40k gain
                Shares:        1200,
                ShortTermGains: false,
            },
        },
    },
    {
        AccountType:  "tax_deferred",
        TotalValue:   300000.0,
        CashBalance:  5000.0,
        Lots: []AccountLot{/* ... */},
    },
}

// Target allocation
targetAllocation := []AssetAllocation{
    {AssetClass: "US_Stocks", TargetPercent: 0.60},
    {AssetClass: "US_Bonds", TargetPercent: 0.30},
    {AssetClass: "International", TargetPercent: 0.10},
}

// Generate tax-aware rebalancing plan
plan := engine.taxAwareRebalancer.GenerateRebalancingPlan(
    accounts,
    targetAllocation,
    0.05, // 5% rebalance threshold
    2024, // current year
)

// Plan prioritizes:
// 1. Tax-deferred account rebalancing (no tax impact)
// 2. New contributions to underweight assets
// 3. Tax-loss harvesting opportunities
// 4. Minimal taxable sales

// Harvest tax losses
losses := engine.taxAwareRebalancer.IdentifyTaxLossHarvestingOpportunities(
    accounts,
    10000.0, // minimum loss to harvest
)

// Calculate rebalancing cost
cost := engine.taxAwareRebalancer.CalculateRebalancingCost(
    plan,
    0.15, // long-term cap gains rate
    0.24, // ordinary income rate
)
```

**Tax-Loss Harvesting Rules**:
- Can offset unlimited capital gains
- Can deduct $3,000/year against ordinary income
- Carry forward unused losses indefinitely
- **Wash sale rule**: Can't repurchase within 30 days
- Replace with similar but not "substantially identical" security

**Rebalancing Priority Order**:
1. **Tax-Deferred accounts** - No tax consequences
2. **Roth accounts** - Tax-free, but preserve tax-free growth
3. **Taxable accounts** - Only when necessary, minimize gains

## Helper Methods

Convenience methods on `SimulationEngine` provide easy access to calculator functionality:

```go
// Contribution limits
maxAllowed := se.GetContributionLimit("tax_deferred", 25000.0)
se.TrackContribution("roth", 7000.0)
se.ResetContributionLimits(2025)

// State tax
stateTax := se.CalculateStateTaxLiability(
    100000.0,  // ordinary income
    0.0,       // capital gains
    "CA",
    FilingStatusSingle,
    0,
)
```

See `simulation.go:3847-3878` for all helper methods.

## Configuration

### TypeScript Types

Calculator settings are defined in `src/types/strategies/unified.ts`:

```typescript
export interface StrategySettings {
  contributionLimits?: ContributionLimitSettings;
  stateTax?: StateTaxSettings;
  socialSecurity?: SocialSecuritySettings;
  estatePlanning?: EstatePlanningSettings;
  longTermCare?: LongTermCareSettings;
  propertyCosts?: PropertyCostSettings;
  goalPrioritization?: GoalPrioritizationSettings;
  taxAwareRebalancing?: TaxAwareRebalancingSettings;
}
```

### Default Configuration

See `src/config/appConfig.ts:382-424` for default calculator settings.

## Testing

Comprehensive test suite in `wasm/calculator_integration_test.go`:

### Test Coverage

```bash
# Run calculator integration tests
go test -v -run "TestContribution|TestStateTax|TestEnforce|TestCalculator|TestRetirement"

# Run retirement feature tests (comprehensive)
go test -v -run "TestRMD|TestWithdrawal|TestAssetLocation|TestRothConversion"
```

**Calculator Integration Test Suites** (`calculator_integration_test.go` - 19 test cases, all passing):

1. `TestContributionLimitIntegration` (4 subtests)
   - Pre-tax 401k limits ($23k base)
   - Roth IRA limits ($7k base)
   - Catch-up contributions (age 50+)
   - Partial contributions with YTD tracking

2. `TestStateTaxIntegration` (4 subtests)
   - California progressive tax
   - No-tax states (TX, FL, etc.)
   - Flat-tax states (IL, PA, etc.)
   - Washington capital gains tax

3. `TestEnforcePreTaxContributionLimits` (2 subtests)
   - Within limit scenarios
   - Excess routing to taxable

4. `TestEnforceRothContributionLimits` (3 subtests)
   - Multiple contributions same year
   - Independent limit tracking

5. `TestCalculatorAvailability` (1 test)
   - All 12 calculators initialized

6. `TestTaxCalculatorIntegration` (1 test)
   - Dependency injection verification

7. `TestRetirementCalculatorsAvailability` (1 test)
   - RMD, Withdrawal Sequencer, Asset Location, Roth Conversion initialized

**Retirement Feature Test Suites** (`retirement_features_integration_test.go` - Comprehensive):

8. `TestRMDCalculatorIntegration`
   - Age 73 first-year RMD calculations
   - Multi-year RMD projections with growth
   - IRS Uniform Lifetime Table validation

9. `TestWithdrawalSequencingIntegration`
   - Tax-efficient withdrawal sequence (Cash → Taxable → Tax-Deferred → Roth)
   - Tax-deferred first sequence
   - Automatic RMD processing during withdrawals
   - Gross-up calculations

10. `TestAssetLocationIntegration`
    - Tax efficiency scoring (bonds vs. stocks)
    - Multi-phase asset placement algorithm
    - After-tax value comparisons across account types

11. `TestRothConversionIntegration`
    - Conversion opportunity evaluation
    - Tax bracket targeting
    - Multi-year conversion planning
    - Break-even horizon calculations

### Example Test

```go
func TestContributionLimitIntegration(t *testing.T) {
    engine := NewSimulationEngine(StochasticModelConfig{})
    engine.contributionLimitTracker.SetUserAge(35)
    engine.contributionLimitTracker.ResetForNewYear(2024)

    // Try to contribute $30k when limit is $23k
    maxAllowed := engine.GetContributionLimit("tax_deferred", 30000.0)

    if maxAllowed != 23000.0 {
        t.Errorf("Expected $23,000 limit, got $%.0f", maxAllowed)
    }
}
```

## Usage Examples

### Adding a New Calculator Integration

To integrate one of the ready calculators (e.g., Social Security):

1. **Find the integration point** (e.g., Social Security income event handler)

2. **Call the calculator**:
```go
func (h *SocialSecurityIncomeEventHandler) Process(...) error {
    se := context.SimulationEngine

    // Use calculator to optimize claiming age
    profile := SocialSecurityProfile{
        BirthYear: 1960,
        PIA: 2500.0, // Primary Insurance Amount
    }

    optimalAge := se.socialSecurityCalc.OptimizeClaimingAge(
        profile,
        90,   // life expectancy
        0.03, // discount rate
    )

    // Calculate benefit at optimal age
    monthlyBenefit := se.socialSecurityCalc.CalculateMonthlyBenefit(profile, 2024)

    // Process benefit...
}
```

3. **Add tests** to `calculator_integration_test.go`

4. **Update documentation** in this file

### Accessing Calculators Directly

All calculators are available as public fields on `SimulationEngine`:

```go
// In any event handler
se := context.SimulationEngine

// Contribution limits
limit := se.contributionLimitTracker.GetLimit("tax_deferred")

// State tax
tax := se.stateTaxCalculator.CalculateStateTax(income, gains, "NY", status, 0)

// Social Security
benefit := se.socialSecurityCalc.CalculateMonthlyBenefit(profile, 2024)

// Estate planning
fedTax := se.estateTaxCalculator.CalculateFederalEstateTax(profile)

// LTC costs
cost := se.ltcCalculator.CalculateAnnualCost("assistedLiving", "CA")

// Property costs
escalation := se.propertyCostEscalator.ProjectPropertyTax(config)

// Goal prioritization
allocation := se.goalPrioritizer.AllocateFunds()

// Tax-aware rebalancing
plan := se.taxAwareRebalancer.OptimizeRebalancing(accounts)
```

## Best Practices

1. **Age Management**: Set user age before calling contribution limit methods
   ```go
   se.contributionLimitTracker.SetUserAge(currentAge)
   ```

2. **Annual Resets**: Contribution limits reset annually (handled in `ProcessAnnualTaxes`)

3. **YTD Tracking**: Contribution tracker maintains year-to-date totals automatically

4. **Excess Routing**: When limits exceeded, excess routed to taxable accounts

5. **State Tax Fallback**: StateTaxCalculator includes fallback logic for unknown states

6. **Test Coverage**: Always add tests when integrating new calculators

7. **Documentation**: Update this file and inline comments when making changes

## Performance

Calculators are designed for efficiency:
- **Stateless**: No mutable state between calls
- **Cached**: Lookup tables for brackets and limits
- **Fast**: O(1) or O(log n) lookups
- **Memory**: Minimal allocation per calculation

## Future Work

### Planned Integrations

1. **Social Security**: Optimize claiming age during retirement planning events
2. **Estate Tax**: Calculate estate tax liability at end of simulation
3. **Long-Term Care**: Project LTC costs during retirement phase
4. **Property Costs**: Calculate property tax escalation with Prop 13 (CA)
5. **Goal Prioritizer**: Allocate funds across multiple goals
6. **Tax-Aware Rebalancing**: Minimize tax impact during rebalancing

### Enhancement Opportunities

- [ ] UI configuration panels for all calculator settings
- [ ] Real-time calculator previews in planning interface
- [ ] Historical limit data for past years (pre-2024)
- [ ] Additional state-specific rules (e.g., local taxes)
- [ ] Medicare Part B/D IRMAA integration with Social Security
- [ ] Roth conversion optimization with bracket targeting

## Resources

- **IRS Publication 590-B**: RMD and IRA contribution rules
- **IRS Publication 915**: Social Security taxation
- **State Tax Authorities**: Individual state tax codes
- **SECURE Act 2.0**: Retirement account rule changes (2023+)

## Maintenance

When IRS limits change (annually):

1. Update `contribution_limit_tracker.go:95-120` with new year limits
2. Add test cases for new year in `calculator_integration_test.go`
3. Update default config in `src/config/appConfig.ts`
4. Rebuild WASM: `npm run build:wasm`
5. Run tests: `go test ./...`

## Questions?

See:
- Main README: `README.md`
- Architecture docs: `DOCS.md`
- Development guide: `CLAUDE.md`
- Test files: `wasm/*_test.go`
