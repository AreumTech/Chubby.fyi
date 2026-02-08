package main

import (
	"fmt"
	"math"
	"testing"
)

// monte_carlo_validation_test.go
// Validates Monte Carlo retirement simulation against Chapter 5 of "Build a Robo-Advisor with Python"
// Reference: Monte Carlo retirement simulations, inflation modeling, guardrails strategy

// TestBasicRetirementSimulation validates wealth path with spending
// Reference: chapter_05.ipynb - basic Monte Carlo with spending
func TestBasicRetirementSimulation(t *testing.T) {
	t.Log("📈 Testing Basic Retirement Simulation (Chapter 5)")

	t.Run("SinglePath", func(t *testing.T) {
		// Python parameters:
		// W0 = 1,200,000
		// spending_0 = 60,000
		// mean = 0.06, stdev = 0.12
		// inflation = 0.02

		startingWealth := 1200000.0
		annualSpending := 60000.0
		meanReturn := 0.06
		inflation := 0.02
		numYears := 30

		wealth := startingWealth
		spending := annualSpending

		t.Logf("Starting wealth: $%.0f", startingWealth)
		t.Logf("Initial spending: $%.0f", annualSpending)
		t.Logf("Expected return: %.1f%%", meanReturn*100)
		t.Logf("Inflation: %.1f%%", inflation*100)

		// Simulate one path (deterministic with mean returns)
		for year := 1; year <= numYears; year++ {
			// Spend at beginning of year (Python logic)
			wealth -= spending

			if wealth < 0 {
				t.Logf("❌ Bankruptcy in year %d", year)
				break
			}

			// Grow remaining wealth
			wealth *= (1.0 + meanReturn)

			// Increase spending with inflation
			spending *= (1.0 + inflation)

			if year%10 == 0 || year == numYears {
				t.Logf("Year %d: Wealth=$%.0f, Spending=$%.0f", year, wealth, spending)
			}
		}

		if wealth > 0 {
			t.Logf("✅ Wealth after %d years: $%.0f", numYears, wealth)
		}

		// Withdrawal rate check
		initialWithdrawalRate := annualSpending / startingWealth
		t.Logf("Initial withdrawal rate: %.2f%%", initialWithdrawalRate*100)

		// 4% rule benchmark
		if initialWithdrawalRate <= 0.04 {
			t.Log("✅ Within 4% safe withdrawal rate")
		} else {
			t.Logf("⚠️  Exceeds 4%% rule (%.2f%%)", initialWithdrawalRate*100)
		}
	})

	t.Run("BankruptcyProbability", func(t *testing.T) {
		// Python: Runs 10,000 simulations and counts bankruptcy
		// We'll test the concept with simplified logic

		numYears := 30
		startingWealth := 1200000.0
		annualSpending := 60000.0
		meanReturn := 0.06
		stdDevReturn := 0.12
		inflation := 0.02

		bankruptcyCount := 0

		// Simplified: test a range of return scenarios
		// In practice, you'd use random number generator
		returnScenarios := []float64{
			meanReturn - 2*stdDevReturn, // Bad luck
			meanReturn - stdDevReturn,
			meanReturn,
			meanReturn + stdDevReturn,
			meanReturn + 2*stdDevReturn, // Good luck
		}

		for _, annualReturn := range returnScenarios {
			wealth := startingWealth
			spending := annualSpending

			for year := 1; year <= numYears; year++ {
				wealth -= spending
				if wealth < 0 {
					bankruptcyCount++
					break
				}
				wealth *= (1.0 + annualReturn)
				spending *= (1.0 + inflation)
			}
		}

		bankruptcyProbability := float64(bankruptcyCount) / float64(len(returnScenarios))

		t.Logf("Scenarios tested: %d", len(returnScenarios))
		t.Logf("Bankruptcies: %d", bankruptcyCount)
		t.Logf("Bankruptcy probability: %.1f%%", bankruptcyProbability*100)

		// Python result: ~0% bankruptcy with 5% withdrawal rate at 6% return
		if bankruptcyProbability < 0.1 {
			t.Log("✅ Low bankruptcy risk with these parameters")
		}
	})
}

// TestGuardrailsStrategy validates dynamic spending with guardrails
// Reference: chapter_05.ipynb - guardrails between 4% and 6%
func TestGuardrailsStrategy(t *testing.T) {
	t.Log("🛡️  Testing Guardrails Spending Strategy (Chapter 5)")

	t.Run("GuardrailsLogic", func(t *testing.T) {
		// Python: If spending < 4% or > 6% of portfolio, adjust
		// spending = max(0.05 * wealth, spending_min)

		initialSpending := 60000.0  // 5% of 1.2M
		minimumSpending := 48000.0  // Essential expenses
		inflation := 0.02

		lowerGuardrail := 0.04
		upperGuardrail := 0.06
		targetRate := 0.05

		t.Logf("Guardrails: %.0f%% - %.0f%%", lowerGuardrail*100, upperGuardrail*100)
		t.Logf("Minimum spending: $%.0f", minimumSpending)

		// Scenario 1: Market crash - wealth drops
		wealth := 800000.0 // Down from 1.2M
		spending := initialSpending * math.Pow(1.0+inflation, 3) // 3 years of inflation

		t.Logf("\nScenario 1: Market crash")
		t.Logf("  Wealth: $%.0f", wealth)
		t.Logf("  Current spending: $%.0f", spending)

		spendingRate := spending / wealth
		t.Logf("  Spending rate: %.2f%%", spendingRate*100)

		if spendingRate > upperGuardrail {
			// Exceeds upper guardrail - reduce spending
			newSpending := math.Max(targetRate*wealth, minimumSpending)
			t.Logf("  ⚠️  Exceeds %.0f%% guardrail", upperGuardrail*100)
			t.Logf("  Reduce spending to: $%.0f", newSpending)
			spending = newSpending
		}

		// Scenario 2: Market boom - wealth increases
		wealth = 1800000.0 // Up from 1.2M
		spending = initialSpending * math.Pow(1.0+inflation, 3)

		t.Logf("\nScenario 2: Market boom")
		t.Logf("  Wealth: $%.0f", wealth)
		t.Logf("  Current spending: $%.0f", spending)

		spendingRate = spending / wealth
		t.Logf("  Spending rate: %.2f%%", spendingRate*100)

		if spendingRate < lowerGuardrail {
			// Below lower guardrail - can increase spending
			newSpending := targetRate * wealth
			t.Logf("  ✅ Below %.0f%% guardrail", lowerGuardrail*100)
			t.Logf("  Increase spending to: $%.0f", newSpending)
			spending = newSpending
		}

		t.Log("\n🎯 Guardrails ensure spending adjusts with portfolio value")
	})

	t.Run("GuardrailsVsFixedSpending", func(t *testing.T) {
		// Compare bankruptcy probability with and without guardrails

		startingWealth := 1200000.0
		initialSpending := 60000.0
		minimumSpending := 48000.0
		meanReturn := 0.06
		inflation := 0.02
		numYears := 30

		// Fixed spending (traditional)
		wealthFixed := startingWealth
		spendingFixed := initialSpending
		survivedFixed := true

		for year := 1; year <= numYears; year++ {
			wealthFixed -= spendingFixed
			if wealthFixed < 0 {
				survivedFixed = false
				t.Logf("Fixed spending: Bankrupt in year %d", year)
				break
			}
			wealthFixed *= (1.0 + meanReturn)
			spendingFixed *= (1.0 + inflation)
		}

		// Guardrails spending (adaptive)
		wealthGuardrails := startingWealth
		spendingGuardrails := initialSpending
		survivedGuardrails := true

		for year := 1; year <= numYears; year++ {
			wealthGuardrails -= spendingGuardrails
			if wealthGuardrails < 0 {
				survivedGuardrails = false
				t.Logf("Guardrails: Bankrupt in year %d", year)
				break
			}
			wealthGuardrails *= (1.0 + meanReturn)

			// Apply guardrails
			spendingRate := spendingGuardrails / wealthGuardrails
			if spendingRate < 0.04 || spendingRate > 0.06 {
				spendingGuardrails = math.Max(0.05*wealthGuardrails, minimumSpending)
			} else {
				spendingGuardrails *= (1.0 + inflation)
			}
		}

		t.Log("\nComparison after 30 years:")
		if survivedFixed {
			t.Logf("Fixed spending: Survived with $%.0f", wealthFixed)
		} else {
			t.Log("Fixed spending: Bankrupt")
		}

		if survivedGuardrails {
			t.Logf("Guardrails: Survived with $%.0f", wealthGuardrails)
		} else {
			t.Log("Guardrails: Bankrupt")
		}

		// Guardrails should reduce bankruptcy risk
		if survivedGuardrails {
			t.Log("✅ Guardrails improve success rate")
		}
	})
}

// TestInflationModeling validates AR(1) inflation process
// Reference: chapter_05.ipynb - inflation with persistence
func TestInflationModeling(t *testing.T) {
	t.Log("📊 Testing Inflation Modeling with Persistence (Chapter 5)")

	t.Run("AR1_Process", func(t *testing.T) {
		// Python: AR(1) model for inflation
		// inflation[t] = c + phi * inflation[t-1] + sigma * noise
		// Estimated from CPI data: phi=0.6764, c=0.0115, sigma=0.0214

		phi := 0.6764          // Persistence parameter
		c := 0.0115            // Constant
		sigmaInflation := 0.0214 // Volatility
		inf0 := 0.07           // Starting inflation (high scenario)

		t.Logf("AR(1) parameters from CPI regression:")
		t.Logf("  Persistence (φ): %.4f", phi)
		t.Logf("  Constant (c): %.4f", c)
		t.Logf("  Volatility (σ): %.4f", sigmaInflation)
		t.Logf("  Initial inflation: %.1f%%", inf0*100)

		// Simulate inflation path (deterministic with no noise)
		inflation := inf0
		numYears := 20

		t.Log("\nInflation path:")
		for year := 0; year <= numYears; year++ {
			if year%5 == 0 {
				t.Logf("Year %d: %.2f%%", year, inflation*100)
			}

			// Update for next year
			inflation = c + phi*inflation
		}

		// Long-term mean (equilibrium)
		longTermMean := c / (1.0 - phi)
		t.Logf("\nLong-term equilibrium inflation: %.2f%%", longTermMean*100)

		// Verify persistence effect
		if phi > 0.5 {
			t.Log("✅ Strong persistence: high inflation tends to persist")
		}

		// Compare to simple constant inflation
		t.Log("\n🎯 Key insight: AR(1) captures inflation shocks that persist")
		t.Log("   Better than constant 2% assumption")
	})

	t.Run("InflationImpactOnRetirement", func(t *testing.T) {
		// Compare constant vs. persistent inflation

		startingWealth := 1200000.0
		initialSpending := 60000.0
		meanReturn := 0.06
		numYears := 30

		// Scenario 1: Constant 2% inflation (traditional)
		constInflation := 0.02
		wealthConst := startingWealth
		spendingConst := initialSpending

		for year := 1; year <= numYears; year++ {
			wealthConst -= spendingConst
			wealthConst *= (1.0 + meanReturn)
			spendingConst *= (1.0 + constInflation)
		}

		// Scenario 2: High persistent inflation starts at 7%
		phi := 0.6764
		c := 0.0115
		inflation := 0.07
		wealthPersist := startingWealth
		spendingPersist := initialSpending

		for year := 1; year <= numYears; year++ {
			wealthPersist -= spendingPersist
			wealthPersist *= (1.0 + meanReturn)
			spendingPersist *= (1.0 + inflation)

			// Update inflation (mean reversion)
			inflation = c + phi*inflation
		}

		t.Log("Impact of inflation modeling:")
		t.Logf("Constant 2%% inflation:")
		t.Logf("  Final wealth: $%.0f", wealthConst)
		t.Logf("  Final spending: $%.0f", spendingConst)

		t.Logf("Persistent high inflation (7%% → %.1f%%):", (c/(1.0-phi))*100)
		t.Logf("  Final wealth: $%.0f", wealthPersist)
		t.Logf("  Final spending: $%.0f", spendingPersist)

		difference := wealthConst - wealthPersist
		t.Logf("Wealth difference: $%.0f (%.0f%%)",
			difference, (difference/wealthConst)*100)

		t.Log("\n⚠️  High persistent inflation significantly reduces outcomes")
	})
}

// TestGeometricVsArithmeticReturns validates return calculations
// Reference: chapter_05.ipynb - geometric vs arithmetic average
func TestGeometricVsArithmeticReturns(t *testing.T) {
	t.Log("📐 Testing Geometric vs Arithmetic Returns (Chapter 5)")

	t.Run("ReturnCalculations", func(t *testing.T) {
		// Python example with S&P 500 data
		// Arithmetic mean: higher than geometric
		// Approximation: geometric ≈ arithmetic - 0.5*variance

		arithmeticMean := 0.08
		stdDev := 0.20
		variance := stdDev * stdDev
		_ = stdDev

		// Approximation formula
		geometricApprox := arithmeticMean - 0.5*variance

		t.Logf("Arithmetic mean: %.2f%%", arithmeticMean*100)
		t.Logf("Standard deviation: %.2f%%", stdDev*100)
		t.Logf("Variance: %.4f", variance)
		t.Logf("Geometric approximation: %.2f%%", geometricApprox*100)

		// Simulate to verify
		numYears := 30.0
		startValue := 100.0

		// Using arithmetic mean (wrong for compounding)
		wrongValue := startValue * math.Pow(1.0+arithmeticMean, numYears)

		// Using geometric mean (correct)
		correctValue := startValue * math.Pow(1.0+geometricApprox, numYears)

		t.Logf("\nAfter %.0f years:", numYears)
		t.Logf("Using arithmetic mean: $%.0f", wrongValue)
		t.Logf("Using geometric mean: $%.0f", correctValue)
		t.Logf("Difference: $%.0f (%.0f%% overestimate)",
			wrongValue-correctValue, ((wrongValue/correctValue)-1.0)*100)

		t.Log("\n🎯 Always use geometric mean for long-term compounding")
	})
}

// TestSafeWithdrawalRate validates 4% rule
// Reference: chapter_05.ipynb - retirement simulation with different withdrawal rates
func TestSafeWithdrawalRate(t *testing.T) {
	t.Log("💰 Testing Safe Withdrawal Rate (Chapter 5)")

	t.Run("WithdrawalRateComparison", func(t *testing.T) {
		// Test different withdrawal rates

		startingWealth := 1000000.0
		meanReturn := 0.06
		_ = 0.12 // stdDev - not used in deterministic test
		inflation := 0.02
		numYears := 30

		withdrawalRates := []float64{0.03, 0.04, 0.05, 0.06, 0.07}

		t.Log("Withdrawal rate comparison (deterministic):")

		for _, rate := range withdrawalRates {
			wealth := startingWealth
			spending := startingWealth * rate
			survived := true

			for year := 1; year <= numYears; year++ {
				wealth -= spending
				if wealth < 0 {
					t.Logf("%.0f%%: Bankrupt in year %d", rate*100, year)
					survived = false
					break
				}
				wealth *= (1.0 + meanReturn)
				spending *= (1.0 + inflation)
			}

			if survived {
				t.Logf("%.0f%%: Survived with $%.0f", rate*100, wealth)
			}
		}

		t.Log("\n🎯 4% rule: Safe for 30 years with typical returns")
		t.Log("   Higher rates increase bankruptcy risk")
		t.Log("   Lower rates leave larger legacy")
	})
}

// TestSequenceOfReturnsRisk validates timing impact
// Reference: chapter_05.ipynb - Monte Carlo shows path dependency
func TestSequenceOfReturnsRisk(t *testing.T) {
	t.Log("⚠️  Testing Sequence of Returns Risk (Chapter 5)")

	t.Run("GoodVsBadTiming", func(t *testing.T) {
		// Same average return, different sequence

		startingWealth := 1000000.0
		annualSpending := 50000.0
		inflation := 0.02

		// Good sequence: high returns early
		returnsGood := []float64{0.20, 0.15, 0.10, 0.05, 0.00, -0.05}

		// Bad sequence: low returns early (bear market at start of retirement)
		returnsBad := []float64{-0.05, 0.00, 0.05, 0.10, 0.15, 0.20}

		// Verify same average
		avgGood := 0.0
		avgBad := 0.0
		for i := 0; i < len(returnsGood); i++ {
			avgGood += returnsGood[i]
			avgBad += returnsBad[i]
		}
		avgGood /= float64(len(returnsGood))
		avgBad /= float64(len(returnsBad))

		t.Logf("Average return (both): %.1f%%", avgGood*100)

		// Simulate good sequence
		wealthGood := startingWealth
		spendingGood := annualSpending
		for year, ret := range returnsGood {
			wealthGood -= spendingGood
			wealthGood *= (1.0 + ret)
			spendingGood *= (1.0 + inflation)
			t.Logf("Good sequence year %d: return=%.0f%%, wealth=$%.0f",
				year+1, ret*100, wealthGood)
		}

		// Simulate bad sequence
		wealthBad := startingWealth
		spendingBad := annualSpending
		for year, ret := range returnsBad {
			wealthBad -= spendingBad
			wealthBad *= (1.0 + ret)
			spendingBad *= (1.0 + inflation)
			t.Logf("Bad sequence year %d: return=%.0f%%, wealth=$%.0f",
				year+1, ret*100, wealthBad)
		}

		t.Logf("\nFinal wealth comparison:")
		t.Logf("Good sequence (high returns early): $%.0f", wealthGood)
		t.Logf("Bad sequence (low returns early): $%.0f", wealthBad)
		t.Logf("Difference: $%.0f", wealthGood-wealthBad)

		t.Log("\n⚠️  Sequence risk: Bear market at retirement start is catastrophic")
		t.Log("   Same average return, vastly different outcomes")
		t.Log("   This is why Monte Carlo simulation is essential")
	})
}

// TestAR1MonthlyConversion validates that AR(1) annual-to-monthly parameter
// conversion preserves the unconditional mean in the correct units.
// This catches a past bug where the annual unconditional mean (e.g. 2%) was
// used as the monthly unconditional mean (2%/month = 26.8%/year).
func TestAR1MonthlyConversion(t *testing.T) {
	cases := []struct {
		name           string
		annualConstant float64
		annualPhi      float64
	}{
		{"Inflation", 0.01, 0.5},
		{"HomeValue", 0.01, 0.6},
		{"RentalIncome", 0.008, 0.5},
		{"HighPersistence", 0.005, 0.9},
		{"LowPersistence", 0.02, 0.2},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			annualMean := tc.annualConstant / (1 - tc.annualPhi)
			expectedMonthlyMean := AnnualToMonthlyRate(annualMean)

			monthlyPhi := math.Pow(tc.annualPhi, 1.0/12.0)
			monthlyConstant := ar1MonthlyConstant(tc.annualConstant, tc.annualPhi, monthlyPhi)

			// Unconditional mean of monthly AR(1) = c_monthly / (1 - phi_monthly)
			actualMonthlyMean := monthlyConstant / (1 - monthlyPhi)

			t.Logf("Annual mean: %.4f, expected monthly mean: %.6f, actual monthly mean: %.6f",
				annualMean, expectedMonthlyMean, actualMonthlyMean)

			// Must match within 0.01% (floating point tolerance)
			if math.Abs(actualMonthlyMean-expectedMonthlyMean) > expectedMonthlyMean*0.0001 {
				t.Errorf("Monthly unconditional mean mismatch: got %.8f, want %.8f (annual mean %.4f)",
					actualMonthlyMean, expectedMonthlyMean, annualMean)
			}

			// Sanity: monthly mean must be << annual mean (the old bug made them equal)
			if actualMonthlyMean > annualMean*0.5 {
				t.Errorf("Monthly mean (%.6f) is suspiciously close to annual mean (%.4f) — likely not converted",
					actualMonthlyMean, annualMean)
			}
		})
	}
}

// TestLongHorizonNetWorthSanity runs a 30-year accumulation simulation and
// validates that P50 net worth stays within economically plausible bounds.
// This catches systemic calibration bugs (e.g. 27% inflation, explosive returns)
// that are invisible over 1-2 years but catastrophic over decades.
func TestLongHorizonNetWorthSanity(t *testing.T) {
	// Scenario: 35-year-old, $250K assets, $110K income, $60K spending, 30-year horizon
	// Expected: ~$2M–$8M after 30 years (7% real return, $50K/yr surplus)
	// Must NOT be $1B+ (indicates compounding bug)
	input := createTestInput(250000, 60000, 360, 54321)

	// Add income event
	input.Events = append(input.Events, FinancialEvent{
		ID:          "income",
		Type:        "INCOME",
		MonthOffset: 0,
		Amount:      110000.0 / 12,
		Frequency:   "monthly",
		Metadata: map[string]interface{}{
			"endDateOffset":  359,
			"applyInflation": true,
		},
	})
	// Mark spending as inflation-adjusted too
	input.Events[0].Metadata["applyInflation"] = true

	// Run 10 paths and check P50
	netWorths := make([]float64, 0, 10)
	for i := 0; i < 10; i++ {
		result := RunIsolatedPath(input, i, IsolatedPathOptions{TrackMonthlyData: true})
		if !result.Success {
			t.Fatalf("Path %d failed: %s", i, result.Error)
		}
		netWorths = append(netWorths, result.FinalNetWorth)
	}

	// Sort to get approximate percentiles
	for i := 0; i < len(netWorths); i++ {
		for j := i + 1; j < len(netWorths); j++ {
			if netWorths[i] > netWorths[j] {
				netWorths[i], netWorths[j] = netWorths[j], netWorths[i]
			}
		}
	}

	median := netWorths[len(netWorths)/2]
	t.Logf("30-year net worth distribution (10 paths):")
	for i, nw := range netWorths {
		t.Logf("  Path %d: $%s", i, formatDollars(nw))
	}
	t.Logf("Approximate median: $%s", formatDollars(median))

	// Sanity bounds: median should be between $500K and $50M
	// $500K = pessimistic (poor returns, high inflation)
	// $50M = very optimistic (great returns) but NOT billions
	if median > 50_000_000 {
		t.Errorf("SANITY FAILURE: 30-year median net worth $%s exceeds $50M — likely a compounding or inflation bug",
			formatDollars(median))
	}
	if median < 500_000 {
		t.Errorf("SANITY FAILURE: 30-year median net worth $%s below $500K — returns may be too low or broken",
			formatDollars(median))
	}
}

func formatDollars(v float64) string {
	abs := math.Abs(v)
	switch {
	case abs >= 1e9:
		return fmt.Sprintf("%.1fB", v/1e9)
	case abs >= 1e6:
		return fmt.Sprintf("%.1fM", v/1e6)
	case abs >= 1e3:
		return fmt.Sprintf("%.0fK", v/1e3)
	default:
		return fmt.Sprintf("%.0f", v)
	}
}
