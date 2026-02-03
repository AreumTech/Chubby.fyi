package main

import (
	"math"
	"testing"
)

// TestRunIsolatedPathSeedDiversity verifies that each path gets a unique seed
func TestRunIsolatedPathSeedDiversity(t *testing.T) {
	input := createTestInput(1000000, 50000, 60, 12345) // 5 years is enough to test

	// Run two paths with different indices
	result0 := RunIsolatedPath(input, 0, IsolatedPathOptions{TrackMonthlyData: true})
	result1 := RunIsolatedPath(input, 1, IsolatedPathOptions{TrackMonthlyData: true})

	if !result0.Success || !result1.Success {
		t.Fatalf("Simulation failed: result0.Success=%v (error: %s), result1.Success=%v (error: %s)",
			result0.Success, result0.Error, result1.Success, result1.Error)
	}

	// With different seeds, final net worth should differ (stochastic market returns)
	// Allow for small floating point tolerance but expect meaningful difference
	if math.Abs(result0.FinalNetWorth-result1.FinalNetWorth) < 1000 {
		t.Errorf("Paths should have different final net worth due to seed diversity: path0=%v, path1=%v",
			result0.FinalNetWorth, result1.FinalNetWorth)
	}
}

// TestRunIsolatedPathStateIsolation verifies that paths don't pollute each other's state
func TestRunIsolatedPathStateIsolation(t *testing.T) {
	// Start with $2M, spend $70k/year, no income (retirement scenario)
	input := createTestInput(2000000, 70000, 120, 99999)
	input.InitialAccounts.Cash = 200000

	// Run multiple paths
	var firstPathNetWorth float64
	for i := 0; i < 5; i++ {
		result := RunIsolatedPath(input, i, IsolatedPathOptions{TrackMonthlyData: true})

		if !result.Success {
			t.Fatalf("Path %d failed: %s", i, result.Error)
		}

		if len(result.MonthlyData) == 0 {
			t.Fatalf("Path %d has no monthly data", i)
		}

		// First month net worth should be approximately starting balance
		// (may vary slightly due to first month's spending and returns)
		firstMonthNetWorth := result.MonthlyData[0].NetWorth

		if i == 0 {
			firstPathNetWorth = firstMonthNetWorth
		}

		// All paths should start with similar net worth (within 10% of first path)
		// This catches the state pollution bug where subsequent paths started depleted
		tolerance := firstPathNetWorth * 0.1
		if math.Abs(firstMonthNetWorth-firstPathNetWorth) > tolerance {
			t.Errorf("Path %d state pollution detected: first month net worth=%v, expected near %v (within %v)",
				i, firstMonthNetWorth, firstPathNetWorth, tolerance)
		}
	}
}

// TestTrajectoryAggregationCorrectness verifies trajectory values match expectations
func TestTrajectoryAggregationCorrectness(t *testing.T) {
	// Start with $2M, spend $70k/year, no income
	// Year 1 should have ~$1.9M (before market returns)
	input := createTestInput(2000000, 70000, 60, 42)

	// Generate sample paths like the payload transformer does
	samplePaths := make([]SimulationResult, 0, 5)
	for i := 0; i < 5; i++ {
		result := RunIsolatedPath(input, i, IsolatedPathOptions{TrackMonthlyData: true})
		if result.Success && len(result.MonthlyData) > 0 {
			samplePaths = append(samplePaths, result)
		}
	}

	if len(samplePaths) == 0 {
		t.Fatal("No successful sample paths generated")
	}

	// Aggregate trajectory
	trajectory := aggregateNetWorthTrajectory(samplePaths, input)

	if len(trajectory) == 0 {
		t.Fatal("Trajectory aggregation produced no data points")
	}

	// Year 1 (month 11) should have net worth in reasonable range
	// Starting $2M, spending $70k, expect $1.8M - $2.2M range
	year1Point := trajectory[0]
	if year1Point.P50 < 1500000 || year1Point.P50 > 2500000 {
		t.Errorf("Year 1 P50 out of expected range: got %v, expected 1.5M-2.5M", year1Point.P50)
	}

	// P10 should be less than P50, P50 less than P75 (proper percentile ordering)
	if year1Point.P10 > year1Point.P50 {
		t.Errorf("Percentile ordering violation: P10 (%v) > P50 (%v)", year1Point.P10, year1Point.P50)
	}
	if year1Point.P50 > year1Point.P75 {
		t.Errorf("Percentile ordering violation: P50 (%v) > P75 (%v)", year1Point.P50, year1Point.P75)
	}
}

// createTestInput creates a SimulationInput for testing
// Uses the same pattern as other working tests (event_injection_test.go)
func createTestInput(assets, spending float64, months int, seed int64) SimulationInput {
	// Use default config and customize
	config := GetDefaultStochasticConfig()
	config.RandomSeed = seed
	config.SimulationMode = "stochastic"

	// Distribute assets: 10% cash, 30% taxable, 60% tax-deferred
	cashAmount := assets * 0.10
	taxableAmount := assets * 0.30
	taxDeferredAmount := assets * 0.60

	// Use CashManager to properly create holdings with lot tracking
	cashMgr := NewCashManager()

	taxableAccount := &Account{Holdings: []Holding{}, TotalValue: 0}
	cashMgr.AddHoldingWithLotTracking(taxableAccount, AssetClassUSStocksTotalMarket, taxableAmount*0.6, 0)
	cashMgr.AddHoldingWithLotTracking(taxableAccount, AssetClassUSBondsTotalMarket, taxableAmount*0.4, 0)

	taxDeferredAccount := &Account{Holdings: []Holding{}, TotalValue: 0}
	cashMgr.AddHoldingWithLotTracking(taxDeferredAccount, AssetClassUSStocksTotalMarket, taxDeferredAmount*0.7, 0)
	cashMgr.AddHoldingWithLotTracking(taxDeferredAccount, AssetClassUSBondsTotalMarket, taxDeferredAmount*0.3, 0)

	return SimulationInput{
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash:        cashAmount,
			Taxable:     taxableAccount,
			TaxDeferred: taxDeferredAccount,
			Roth:        &Account{Holdings: []Holding{}, TotalValue: 0},
		},
		Events: []FinancialEvent{
			{
				ID:          "spending",
				Type:        "EXPENSE",
				MonthOffset: 0,
				Amount:      spending / 12,
				Frequency:   "monthly",
				Metadata: map[string]interface{}{
					"endDateOffset": months - 1,
				},
			},
		},
		Config:             config,
		MonthsToRun:        months,
		InitialAge:         35,
		StartYear:          2026,
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
		Goals:              []Goal{},
	}
}

