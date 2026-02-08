package main

import (
	"fmt"
	"testing"
)

func liteModeStrPtr(s string) *string { return &s }

// buildRealisticInput creates a realistic simulation input matching what
// chubby.fyi actually generates via the adapter layer.
func buildRealisticInput() SimulationInput {
	return SimulationInput{
		MonthsToRun: 480, // 40 years (age 35 to 75)
		StartYear:   2025,
		InitialAge:  35,
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 50000,
			Taxable: &Account{
				TotalValue: 200000,
				Holdings: []Holding{
					{AssetClass: "SPY", Quantity: 400, CurrentMarketPricePerUnit: 500},
				},
			},
			TaxDeferred: &Account{
				TotalValue: 150000,
				Holdings: []Holding{
					{AssetClass: "SPY", Quantity: 200, CurrentMarketPricePerUnit: 500},
					{AssetClass: "BND", Quantity: 200, CurrentMarketPricePerUnit: 250},
				},
			},
			Roth: &Account{
				TotalValue: 75000,
				Holdings: []Holding{
					{AssetClass: "SPY", Quantity: 150, CurrentMarketPricePerUnit: 500},
				},
			},
		},
		Config: func() StochasticModelConfig {
			c := GetDefaultStochasticConfig()
			c.RandomSeed = 42
			c.SimulationMode = "stochastic"
			c.CashFloor = 30000
			return c
		}(),
		Events: []FinancialEvent{
			{
				ID: "income-salary", Type: "INCOME", Description: "Employment income",
				Amount: 12500, MonthOffset: 0, Frequency: "monthly",
				IncomeType: liteModeStrPtr("salary"), TaxProfile: liteModeStrPtr("ordinary_income"),
				DriverKey: liteModeStrPtr("income:employment"),
				Metadata:  map[string]interface{}{"endDateOffset": 359, "applyInflation": true},
			},
			{
				ID: "expense-living", Type: "EXPENSE", Description: "Living expenses",
				Amount: 5000, MonthOffset: 0, Frequency: "monthly",
				DriverKey: liteModeStrPtr("expense:essentials"),
				Metadata:  map[string]interface{}{"applyInflation": true},
			},
			{
				ID: "expense-housing", Type: "EXPENSE", Description: "Housing costs",
				Amount: 2500, MonthOffset: 0, Frequency: "monthly",
				DriverKey: liteModeStrPtr("expense:essentials"),
				Metadata:  map[string]interface{}{"applyInflation": true},
			},
			{
				ID: "contrib-401k", Type: "CONTRIBUTION", Description: "401(k) contribution",
				Amount: 1875, MonthOffset: 0, Frequency: "monthly",
				TargetAccountType: liteModeStrPtr("taxDeferred"),
				DriverKey:         liteModeStrPtr("contribution:pre_tax"),
				Metadata:          map[string]interface{}{"endDateOffset": 359},
			},
			{
				ID: "contrib-roth", Type: "CONTRIBUTION", Description: "Roth IRA contribution",
				Amount: 583, MonthOffset: 0, Frequency: "monthly",
				TargetAccountType: liteModeStrPtr("roth"),
				DriverKey:         liteModeStrPtr("contribution:roth"),
				Metadata:          map[string]interface{}{"endDateOffset": 359},
			},
			{
				ID: "social-security", Type: "INCOME", Description: "Social Security benefits",
				Amount: 3000, MonthOffset: 384, Frequency: "monthly",
				IncomeType: liteModeStrPtr("social_security"), TaxProfile: liteModeStrPtr("social_security"),
				DriverKey: liteModeStrPtr("income:social_security"),
				Metadata:  map[string]interface{}{"applyInflation": true},
			},
			{
				ID: "healthcare-pre-medicare", Type: "EXPENSE", Description: "Healthcare (pre-Medicare)",
				Amount: 500, MonthOffset: 0, Frequency: "monthly",
				DriverKey: liteModeStrPtr("expense:healthcare"),
				Metadata:  map[string]interface{}{"endDateOffset": 359, "applyInflation": true},
			},
			{
				ID: "healthcare-post-medicare", Type: "EXPENSE", Description: "Healthcare (Medicare supplement)",
				Amount: 300, MonthOffset: 360, Frequency: "monthly",
				DriverKey: liteModeStrPtr("expense:healthcare"),
				Metadata:  map[string]interface{}{"applyInflation": true},
			},
		},
	}
}

// TestFullVsLiteModeAccuracy verifies that full mode (GARCH) produces wider,
// more realistic distributions than lite mode (constant volatility).
// Full mode should have wider P10-P90 spread due to volatility clustering.
func TestFullVsLiteModeAccuracy(t *testing.T) {
	input := buildRealisticInput()

	input.Config.LiteMode = false
	input.Config.RandomSeed = 42
	fullResult := RunMonteCarloSimulation(input, 100)
	if !fullResult.Success {
		t.Fatalf("Full mode failed: %s", fullResult.Error)
	}

	input.Config.LiteMode = true
	input.Config.RandomSeed = 42
	liteResult := RunMonteCarloSimulation(input, 100)
	if !liteResult.Success {
		t.Fatalf("Lite mode failed: %s", liteResult.Error)
	}

	// Full mode GARCH should produce wider dispersion than lite mode
	fullSpread := fullResult.FinalNetWorthP90 - fullResult.FinalNetWorthP10
	liteSpread := liteResult.FinalNetWorthP90 - liteResult.FinalNetWorthP10

	t.Logf("Full mode: P10=%.0f P50=%.0f P90=%.0f spread=%.0f",
		fullResult.FinalNetWorthP10, fullResult.FinalNetWorthP50, fullResult.FinalNetWorthP90, fullSpread)
	t.Logf("Lite mode: P10=%.0f P50=%.0f P90=%.0f spread=%.0f",
		liteResult.FinalNetWorthP10, liteResult.FinalNetWorthP50, liteResult.FinalNetWorthP90, liteSpread)

	if fullSpread <= liteSpread {
		t.Errorf("Expected full mode to have wider P10-P90 spread than lite mode: full=%.0f lite=%.0f", fullSpread, liteSpread)
	}
}

// TestBothModesComplete verifies both modes run to completion without errors.
func TestBothModesComplete(t *testing.T) {
	input := buildRealisticInput()

	for _, mode := range []struct {
		name string
		lite bool
	}{
		{"FullMode", false},
		{"LiteMode", true},
	} {
		t.Run(mode.name, func(t *testing.T) {
			input.Config.LiteMode = mode.lite
			input.Config.RandomSeed = 42
			result := RunMonteCarloSimulation(input, 50)
			if !result.Success {
				t.Fatalf("%s failed: %s", mode.name, result.Error)
			}
			if result.NumberOfRuns == 0 {
				t.Fatalf("%s produced 0 runs", mode.name)
			}
		})
	}
}

func BenchmarkRealisticFullVsLite(b *testing.B) {
	input := buildRealisticInput()

	for _, paths := range []int{100, 500} {
		b.Run(fmt.Sprintf("FullMode_%dpaths", paths), func(b *testing.B) {
			input.Config.LiteMode = false
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				result := RunMonteCarloSimulation(input, paths)
				if !result.Success {
					b.Fatalf("failed: %s", result.Error)
				}
			}
		})
		b.Run(fmt.Sprintf("LiteMode_%dpaths", paths), func(b *testing.B) {
			input.Config.LiteMode = true
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				result := RunMonteCarloSimulation(input, paths)
				if !result.Success {
					b.Fatalf("failed: %s", result.Error)
				}
			}
		})
	}
}
