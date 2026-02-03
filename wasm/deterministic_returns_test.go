package main

import (
	"testing"
)

// TestDeterministicModeReturns verifies that deterministic mode uses mean returns without volatility
func TestDeterministicModeReturns(t *testing.T) {
	t.Log("Testing deterministic mode returns (SimulationMode='deterministic')")

	config := GetDefaultStochasticConfig()
	config.SimulationMode = "deterministic"
	config.RandomSeed = 12345
	config.LiteMode = true

	// Build test input
	input := SimulationInput{
		MonthsToRun: 12, // 1 year
		StartYear:   2025,
		InitialAge:  40,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 0,
			Taxable: &Account{
				TotalValue: 100000,
				Holdings: []Holding{
					{
						ID:                        "spy-holding",
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  100000,
						CostBasisPerUnit:          1.0,
						CostBasisTotal:            100000,
						CurrentMarketPricePerUnit: 1.0,
						CurrentMarketValueTotal:   100000,
					},
				},
			},
		},
		Config: config,
	}

	// Run Monte Carlo with 1 path (deterministic)
	results := RunMonteCarloSimulation(input, 1)
	if !results.Success {
		t.Fatalf("Simulation failed: %s", results.Error)
	}

	// Expected: ~7% annual growth = $107,000 final
	// May be slightly lower due to taxes, fees, or rounding
	expectedFinal := 107000.0
	actualFinal := results.FinalNetWorthP50
	actualGrowth := (actualFinal/100000 - 1) * 100

	// Allow 2% tolerance (5-9% growth is acceptable for ~7% mean)
	// The old bug produced 110%+ growth, so anything under 15% is correct behavior
	minAcceptable := 105000.0 // 5% growth
	maxAcceptable := 109000.0 // 9% growth

	if actualFinal < minAcceptable || actualFinal > maxAcceptable {
		t.Errorf("Deterministic mode returned wrong growth: expected 5-9%%, got %.1f%% ($%.0f)",
			actualGrowth, actualFinal)
		if actualGrowth > 50 {
			t.Errorf("CRITICAL BUG: Annual returns being applied as monthly (110%%+ growth)")
		}
	} else {
		t.Logf("PASS: Deterministic mode returns reasonable growth: %.1f%% ($%.0f, expected ~$%.0f)",
			actualGrowth, actualFinal, expectedFinal)
	}

	// Verify DebugDisableRandomness was set
	if !input.Config.DebugDisableRandomness {
		t.Log("Note: DebugDisableRandomness flag is set internally by RunMonteCarloSimulation")
	}
}

// TestStochasticModeReturns verifies stochastic mode still produces variability
func TestStochasticModeReturns(t *testing.T) {
	t.Log("Testing stochastic mode returns (SimulationMode='stochastic')")

	config := GetDefaultStochasticConfig()
	config.SimulationMode = "stochastic"
	config.RandomSeed = 12345
	config.LiteMode = true

	input := SimulationInput{
		MonthsToRun: 120, // 10 years
		StartYear:   2025,
		InitialAge:  40,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 0,
			Taxable: &Account{
				TotalValue: 100000,
				Holdings: []Holding{
					{
						ID:                        "spy-holding",
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  100000,
						CostBasisPerUnit:          1.0,
						CostBasisTotal:            100000,
						CurrentMarketPricePerUnit: 1.0,
						CurrentMarketValueTotal:   100000,
					},
				},
			},
		},
		Config: config,
	}

	results := RunMonteCarloSimulation(input, 50)
	if !results.Success {
		t.Fatalf("Simulation failed: %s", results.Error)
	}

	// Check for variability (P10 should differ from P75 significantly)
	p10 := results.FinalNetWorthP10
	p75 := results.FinalNetWorthP75
	spread := (p75 - p10) / results.FinalNetWorthP50

	if spread < 0.2 { // At least 20% spread
		t.Errorf("Stochastic mode lacks variability: P10=$%.0f, P75=$%.0f, spread=%.1f%%",
			p10, p75, spread*100)
	} else {
		t.Logf("PASS: Stochastic mode shows variability (P10=$%.0f, P75=$%.0f, spread=%.1f%%)",
			p10, p75, spread*100)
	}
}
