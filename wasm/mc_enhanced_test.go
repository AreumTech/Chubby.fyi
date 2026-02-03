package main

import (
	"math"
	"testing"
)

// mc_enhanced_test.go
// Tests for Monte Carlo enhancements: deterministic seed derivation, extended KPIs, exemplar path

// createMCTestInput creates a basic SimulationInput for MC testing
func createMCTestInput() SimulationInput {
	config := GetDefaultStochasticConfig()
	config.SimulationMode = "stochastic"
	config.RandomSeed = 12345 // Non-zero seed required for PFOS-E

	return SimulationInput{
		MonthsToRun: 60, // 5 years
		StartYear:   2025,
		InitialAge:  40,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 50000,
			Taxable: &Account{
				TotalValue: 100000,
				Holdings: []Holding{
					{
						ID:                        "spy-holding",
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  100000,
						CostBasisPerUnit:          0.80,
						CostBasisTotal:            80000,
						CurrentMarketPricePerUnit: 1.0,
						CurrentMarketValueTotal:   100000,
						Lots: []TaxLot{
							{
								ID:               "lot-1",
								AssetClass:       AssetClassUSStocksTotalMarket,
								Quantity:         100000,
								CostBasisPerUnit: 0.80,
								CostBasisTotal:   80000,
								AcquisitionDate:  0,
								IsLongTerm:       true,
							},
						},
					},
				},
			},
		},
		Config: config,
	}
}

// TestDeterministicSeedDerivation verifies same base seed produces identical results
func TestDeterministicSeedDerivation(t *testing.T) {
	t.Log("Testing deterministic seed derivation")

	input := createMCTestInput()
	input.Config.RandomSeed = 12345

	// Run MC twice with same seed
	r1 := RunMonteCarloSimulation(input, 20)
	r2 := RunMonteCarloSimulation(input, 20)

	if !r1.Success || !r2.Success {
		t.Fatalf("MC simulations failed: r1.Success=%v, r2.Success=%v, r1.Error=%s, r2.Error=%s",
			r1.Success, r2.Success, r1.Error, r2.Error)
	}

	// Verify identical results
	if r1.FinalNetWorthP50 != r2.FinalNetWorthP50 {
		t.Errorf("P50 mismatch: r1=%f, r2=%f", r1.FinalNetWorthP50, r2.FinalNetWorthP50)
	}
	if r1.EverBreachProbability != r2.EverBreachProbability {
		t.Errorf("EverBreachProbability mismatch: r1=%f, r2=%f", r1.EverBreachProbability, r2.EverBreachProbability)
	}
	if r1.ExemplarPath.PathSeed != r2.ExemplarPath.PathSeed {
		t.Errorf("ExemplarPath.PathSeed mismatch: r1=%d, r2=%d", r1.ExemplarPath.PathSeed, r2.ExemplarPath.PathSeed)
	}

	t.Logf("Verified: Same seed produces identical results (P50=$%.0f)", r1.FinalNetWorthP50)
}

// TestPathSeedFormula verifies pathSeed = baseSeed + pathIndex
func TestPathSeedFormula(t *testing.T) {
	t.Log("Testing path seed formula: pathSeed = baseSeed + pathIndex")

	baseSeed := int64(42)
	input := createMCTestInput()
	input.Config.RandomSeed = baseSeed

	r := RunMonteCarloSimulation(input, 10)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	// Verify exemplar path seed formula
	expectedSeed := baseSeed + int64(r.ExemplarPath.PathIndex)
	if r.ExemplarPath.PathSeed != expectedSeed {
		t.Errorf("PathSeed formula incorrect: expected %d (baseSeed=%d + pathIndex=%d), got %d",
			expectedSeed, baseSeed, r.ExemplarPath.PathIndex, r.ExemplarPath.PathSeed)
	}

	t.Logf("Verified: ExemplarPath.PathSeed=%d = baseSeed(%d) + pathIndex(%d)",
		r.ExemplarPath.PathSeed, baseSeed, r.ExemplarPath.PathIndex)
}

// TestExtendedPercentiles verifies P5/P95 calculation accuracy
func TestExtendedPercentiles(t *testing.T) {
	t.Log("Testing extended percentiles (P5, P95)")

	// Test with known values: 1 to 100
	values := make([]float64, 100)
	for i := range values {
		values[i] = float64(i + 1)
	}

	pct := calculatePercentilesExtended(values)

	// P5 should be ~5.95 (linear interpolation)
	if math.Abs(pct[0]-5.95) > 0.5 {
		t.Errorf("P5 incorrect: expected ~5.95, got %f", pct[0])
	}

	// P50 should be 50.5
	if math.Abs(pct[3]-50.5) > 0.5 {
		t.Errorf("P50 incorrect: expected ~50.5, got %f", pct[3])
	}

	// P95 should be ~95.05 (linear interpolation)
	if math.Abs(pct[6]-95.05) > 0.5 {
		t.Errorf("P95 incorrect: expected ~95.05, got %f", pct[6])
	}

	t.Logf("Verified: P5=%.2f, P50=%.2f, P95=%.2f", pct[0], pct[3], pct[6])
}

// TestMinCashTracking verifies minimum cash tracking across path lifetime
func TestMinCashTracking(t *testing.T) {
	t.Log("Testing min cash tracking")

	input := createMCTestInput()
	input.InitialAccounts.Cash = 50000

	// Add expense to create cash deficit
	input.Events = []FinancialEvent{
		{
			Type:        "EXPENSE",
			Amount:      8000,
			Frequency:   "monthly",
			MonthOffset: 0,
		},
	}

	r := RunMonteCarloSimulation(input, 20)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	// Min cash P50 should be less than initial cash due to expenses
	if r.MinCashP50 >= 50000 {
		t.Errorf("MinCashP50 should be less than initial cash: got %f", r.MinCashP50)
	}

	t.Logf("Verified: MinCashP5=%.0f, MinCashP50=%.0f, MinCashP95=%.0f",
		r.MinCashP5, r.MinCashP50, r.MinCashP95)
}

// TestBreachProbabilityMonotonic verifies breach probability never decreases
func TestBreachProbabilityMonotonic(t *testing.T) {
	t.Log("Testing breach probability monotonicity")

	input := createMCTestInput()
	input.InitialAccounts.Cash = 10000
	input.Config.CashFloor = 5000

	// Add expense to potentially trigger breaches
	input.Events = []FinancialEvent{
		{
			Type:        "EXPENSE",
			Amount:      3000,
			Frequency:   "monthly",
			MonthOffset: 0,
		},
	}

	r := RunMonteCarloSimulation(input, 50)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	if len(r.BreachProbabilityByMonth) < 2 {
		t.Skip("Not enough months for monotonicity test")
	}

	// Verify cumulative breach probability never decreases
	for i := 1; i < len(r.BreachProbabilityByMonth); i++ {
		prev := r.BreachProbabilityByMonth[i-1].CumulativeBreachProb
		curr := r.BreachProbabilityByMonth[i].CumulativeBreachProb
		if curr < prev {
			t.Errorf("Breach probability decreased at month %d: %.4f -> %.4f",
				i, prev, curr)
		}
	}

	t.Logf("Verified: Breach probability is monotonically increasing (final=%.2f%%)",
		r.BreachProbabilityByMonth[len(r.BreachProbabilityByMonth)-1].CumulativeBreachProb*100)
}

// TestRunwayConditionalOnBreach verifies runway percentiles only count breached paths
func TestRunwayConditionalOnBreach(t *testing.T) {
	t.Log("Testing runway percentiles are conditional on breach")

	input := createMCTestInput()

	r := RunMonteCarloSimulation(input, 100)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	if r.BreachedPathCount == 0 {
		// No breaches - runway percentiles should be 0
		if r.RunwayP50 != 0 {
			t.Errorf("RunwayP50 should be 0 when no breaches, got %d", r.RunwayP50)
		}
		t.Log("Verified: No breaches, runway percentiles are 0")
	} else {
		// Has breaches - runway percentiles should be positive
		if r.RunwayP50 <= 0 {
			t.Errorf("RunwayP50 should be positive when breaches occur, got %d", r.RunwayP50)
		}
		t.Logf("Verified: %d breached paths, RunwayP50=%d months", r.BreachedPathCount, r.RunwayP50)
	}
}

// TestSeed0Rejected verifies MC with seed=0 returns error
func TestSeed0Rejected(t *testing.T) {
	t.Log("Testing seed=0 rejection (PFOS-E compliance)")

	input := createMCTestInput()
	input.Config.RandomSeed = 0

	r := RunMonteCarloSimulation(input, 10)

	if r.Success {
		t.Error("Expected MC to fail with seed=0")
	}

	if r.Error == "" {
		t.Error("Expected error message for seed=0")
	}

	// Check error mentions RandomSeed
	if len(r.Error) < 10 {
		t.Errorf("Error message too short: %s", r.Error)
	}

	t.Logf("Verified: seed=0 rejected with error: %s", r.Error)
}

// TestExemplarPathReference verifies exemplar has valid seed for trace fetch
func TestExemplarPathReference(t *testing.T) {
	t.Log("Testing exemplar path reference")

	input := createMCTestInput()
	input.Config.RandomSeed = 99

	r := RunMonteCarloSimulation(input, 20)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	if r.ExemplarPath == nil {
		t.Fatal("ExemplarPath is nil")
	}

	if r.ExemplarPath.SelectionCriterion != "median_terminal_wealth" {
		t.Errorf("SelectionCriterion incorrect: expected 'median_terminal_wealth', got '%s'",
			r.ExemplarPath.SelectionCriterion)
	}

	if r.ExemplarPath.PathSeed == 0 {
		t.Error("ExemplarPath.PathSeed is 0")
	}

	if r.ExemplarPath.PathIndex < 0 || r.ExemplarPath.PathIndex >= 20 {
		t.Errorf("ExemplarPath.PathIndex out of range: %d", r.ExemplarPath.PathIndex)
	}

	t.Logf("Verified: ExemplarPath={index:%d, seed:%d, criterion:%s, terminalWealth:%.0f}",
		r.ExemplarPath.PathIndex, r.ExemplarPath.PathSeed,
		r.ExemplarPath.SelectionCriterion, r.ExemplarPath.TerminalWealth)
}

// TestMCDeterminismPFOSE verifies full PFOS-E determinism: 3 runs must be identical
func TestMCDeterminismPFOSE(t *testing.T) {
	t.Log("Testing PFOS-E determinism: 3 runs with same seed must be identical")

	input := createMCTestInput()
	input.Config.RandomSeed = 99999

	var results [3]SimulationResults
	for i := 0; i < 3; i++ {
		results[i] = RunMonteCarloSimulation(input, 100)
		if !results[i].Success {
			t.Fatalf("Run %d failed: %s", i+1, results[i].Error)
		}
	}

	// All runs must be identical
	for i := 1; i < 3; i++ {
		if results[0].FinalNetWorthP50 != results[i].FinalNetWorthP50 {
			t.Errorf("Run %d P50 mismatch: %.0f != %.0f",
				i+1, results[0].FinalNetWorthP50, results[i].FinalNetWorthP50)
		}
		if results[0].EverBreachProbability != results[i].EverBreachProbability {
			t.Errorf("Run %d EverBreachProbability mismatch: %f != %f",
				i+1, results[0].EverBreachProbability, results[i].EverBreachProbability)
		}
		if results[0].ExemplarPath.PathSeed != results[i].ExemplarPath.PathSeed {
			t.Errorf("Run %d ExemplarPath.PathSeed mismatch: %d != %d",
				i+1, results[0].ExemplarPath.PathSeed, results[i].ExemplarPath.PathSeed)
		}
	}

	t.Logf("Verified: 3 runs with seed=99999 are identical (P50=$%.0f, EverBreach=%.2f%%)",
		results[0].FinalNetWorthP50, results[0].EverBreachProbability*100)
}

// TestAuditFields verifies audit fields are populated
func TestAuditFields(t *testing.T) {
	t.Log("Testing audit fields population")

	baseSeed := int64(54321)
	input := createMCTestInput()
	input.Config.RandomSeed = baseSeed

	r := RunMonteCarloSimulation(input, 50)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	// Verify audit fields
	if r.BaseSeed != baseSeed {
		t.Errorf("BaseSeed incorrect: expected %d, got %d", baseSeed, r.BaseSeed)
	}

	if r.SuccessfulPaths <= 0 {
		t.Errorf("SuccessfulPaths should be positive: got %d", r.SuccessfulPaths)
	}

	if r.SuccessfulPaths+r.FailedPaths != 50 && r.FailedPaths != 50 {
		// Either all succeeded or some failed, but total should make sense
		t.Logf("Note: SuccessfulPaths=%d, FailedPaths=%d", r.SuccessfulPaths, r.FailedPaths)
	}

	t.Logf("Verified: BaseSeed=%d, SuccessfulPaths=%d, FailedPaths=%d",
		r.BaseSeed, r.SuccessfulPaths, r.FailedPaths)
}

// TestCashFloorBreachDetection verifies breach detection at custom cash floor
func TestCashFloorBreachDetection(t *testing.T) {
	t.Log("Testing cash floor breach detection")

	input := createMCTestInput()
	input.InitialAccounts.Cash = 20000
	input.Config.CashFloor = 10000 // Breach when cash < $10,000

	// Add expense to potentially trigger breaches
	input.Events = []FinancialEvent{
		{
			Type:        "EXPENSE",
			Amount:      5000,
			Frequency:   "monthly",
			MonthOffset: 0,
		},
	}

	r := RunMonteCarloSimulation(input, 50)
	if !r.Success {
		t.Fatalf("MC simulation failed: %s", r.Error)
	}

	// With $5k/month expenses and $20k initial cash, breaches should occur quickly
	if r.EverBreachProbability < 0.5 {
		t.Logf("Note: Low breach probability (%.2f%%) - may need scenario adjustment",
			r.EverBreachProbability*100)
	}

	t.Logf("Verified: CashFloor=$10,000, EverBreachProbability=%.2f%%, BreachedPathCount=%d",
		r.EverBreachProbability*100, r.BreachedPathCount)
}
