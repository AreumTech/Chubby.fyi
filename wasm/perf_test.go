// Performance test for MC optimizations
// Run with: go test -bench=BenchmarkMonteCarloOptimized -benchtime=3x -benchmem

package main

import (
	"testing"
)

// BenchmarkMonteCarloOptimized measures MC performance with Phase A + B.1 optimizations
func BenchmarkMonteCarloOptimized(b *testing.B) {
	// Create minimal test input
	input := SimulationInput{
		MonthsToRun: 360, // 30 years
		StartYear:   2025,
		InitialAge:  35,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 100000,
			Taxable: &Account{
				TotalValue: 500000,
				Holdings:   []Holding{},
			},
		},
		Config: StochasticModelConfig{
			RandomSeed:     12345,
			SimulationMode: "stochastic",
			CashFloor:      10000,
			VolatilitySPY:  0.18,
		},
		Events: []FinancialEvent{
			{
				ID:          "income-salary",
				Type:        "INCOME",
				Amount:      8333.33, // $100k/year
				MonthOffset: 0,
			},
			{
				ID:          "expense-living",
				Type:        "EXPENSE",
				Amount:      5000, // $60k/year
				MonthOffset: 0,
			},
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		result := RunMonteCarloSimulation(input, 100) // 100 paths
		if !result.Success {
			b.Fatalf("MC simulation failed: %s", result.Error)
		}
	}
}

// BenchmarkSinglePath measures single path performance
func BenchmarkSinglePath(b *testing.B) {
	input := SimulationInput{
		MonthsToRun: 360,
		StartYear:   2025,
		InitialAge:  35,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 100000,
			Taxable: &Account{
				TotalValue: 500000,
				Holdings:   []Holding{},
			},
		},
		Config: StochasticModelConfig{
			RandomSeed:     12345,
			SimulationMode: "stochastic",
			CashFloor:      10000,
			VolatilitySPY:  0.18,
		},
		Events: []FinancialEvent{
			{
				ID:          "income-salary",
				Type:        "INCOME",
				Amount:      8333.33,
				MonthOffset: 0,
			},
			{
				ID:          "expense-living",
				Type:        "EXPENSE",
				Amount:      5000,
				MonthOffset: 0,
			},
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine := NewSimulationEngine(input.Config)
		engine.trackMonthlyData = false // MC optimization
		result := engine.RunSingleSimulation(input)
		if !result.Success {
			b.Fatalf("Simulation failed: %s", result.Error)
		}
	}
}
