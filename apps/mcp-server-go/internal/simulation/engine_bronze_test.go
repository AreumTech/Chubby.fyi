package simulation

import (
	"testing"
	"time"
)

// TestBronzeEngineBasic verifies the bronze engine produces valid results
func TestBronzeEngineBasic(t *testing.T) {
	engine := NewBronzeEngine()

	params := EnhancedSimulationParams{
		Seed:          12345,
		StartYear:     2025,
		HorizonMonths: 360, // 30 years
		MCPaths:       100,
		Tier:          TierBronze,
		CurrentAge:    35,
		StateRate:     0.093, // CA
		InitialAccounts: Accounts{
			Cash:        50000,
			Taxable:     300000,
			TaxDeferred: 150000, // 401k
			Roth:        0,
		},
		AnnualIncome:     100000,
		AnnualSpending:   60000,
		Contribution401k: 23000, // Max 401k
		ContributionRoth: 7000,  // Max Roth
	}

	result, err := engine.RunEnhancedSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	if !result.Success {
		t.Error("Expected success to be true")
	}

	if result.PathsRun != 100 {
		t.Errorf("Expected 100 paths, got %d", result.PathsRun)
	}

	// Verify final accounts are populated
	if result.FinalAccounts == nil {
		t.Fatal("FinalAccounts should not be nil")
	}

	// With $500k initial + $100k income - $60k spending + growth, should have positive NW
	if result.MC.FinalNetWorthP50 < 0 {
		t.Errorf("Expected positive final net worth, got %f", result.MC.FinalNetWorthP50)
	}

	// Verify taxes were calculated
	if result.TotalTaxesPaid <= 0 {
		t.Error("Expected positive tax payments")
	}

	t.Logf("Bronze Engine Results:")
	t.Logf("  Final NW P50: $%.0f", result.MC.FinalNetWorthP50)
	t.Logf("  Runway P50: %d months (%d years)", result.MC.RunwayP50, result.MC.RunwayP50/12)
	t.Logf("  Breach Probability: %.1f%%", result.MC.EverBreachProbability*100)
	t.Logf("  Final Accounts: Cash=$%.0f, Taxable=$%.0f, 401k=$%.0f, Roth=$%.0f",
		result.FinalAccounts.Cash, result.FinalAccounts.Taxable,
		result.FinalAccounts.TaxDeferred, result.FinalAccounts.Roth)
	t.Logf("  Total Taxes Paid: $%.0f", result.TotalTaxesPaid)
}

// TestBronzeDeterminism verifies same seed produces same results
func TestBronzeDeterminism(t *testing.T) {
	engine := NewBronzeEngine()

	params := EnhancedSimulationParams{
		Seed:          42,
		StartYear:     2025,
		HorizonMonths: 360,
		MCPaths:       100,
		CurrentAge:    35,
		InitialAccounts: Accounts{
			Cash:    50000,
			Taxable: 450000,
		},
		AnnualIncome:   100000,
		AnnualSpending: 50000,
	}

	result1, _ := engine.RunEnhancedSimulation(params)
	result2, _ := engine.RunEnhancedSimulation(params)

	if result1.MC.FinalNetWorthP50 != result2.MC.FinalNetWorthP50 {
		t.Errorf("FinalNetWorthP50 differs: %f vs %f",
			result1.MC.FinalNetWorthP50, result2.MC.FinalNetWorthP50)
	}

	if result1.MC.RunwayP50 != result2.MC.RunwayP50 {
		t.Errorf("RunwayP50 differs: %d vs %d",
			result1.MC.RunwayP50, result2.MC.RunwayP50)
	}
}

// TestTaxCalculations verifies tax calculations are reasonable
func TestTaxCalculations(t *testing.T) {
	// Test federal tax
	tax100k := CalculateFederalTax(100000)
	t.Logf("Federal tax on $100k: $%.2f (%.1f%% effective)", tax100k, tax100k/100000*100)

	// Expected ~$17,400 for $100k single filer 2024
	if tax100k < 15000 || tax100k > 20000 {
		t.Errorf("Federal tax on $100k seems wrong: $%.2f", tax100k)
	}

	// Test capital gains
	capGains := CalculateCapitalGainsTax(50000, 100000)
	t.Logf("Cap gains tax on $50k (with $100k ordinary): $%.2f", capGains)

	// At $100k ordinary + $50k gains = $150k total, most gains at 15%
	expectedCapGains := 50000 * 0.15
	if capGains < expectedCapGains*0.8 || capGains > expectedCapGains*1.2 {
		t.Errorf("Cap gains tax seems wrong: $%.2f (expected ~$%.2f)", capGains, expectedCapGains)
	}
}

// BenchmarkBronzeEngine100Paths benchmarks the bronze engine with 100 paths
func BenchmarkBronzeEngine100Paths(b *testing.B) {
	engine := NewBronzeEngine()

	params := EnhancedSimulationParams{
		Seed:          12345,
		StartYear:     2025,
		HorizonMonths: 360,
		MCPaths:       100,
		CurrentAge:    35,
		StateRate:     0.093,
		InitialAccounts: Accounts{
			Cash:        50000,
			Taxable:     300000,
			TaxDeferred: 150000,
		},
		AnnualIncome:     100000,
		AnnualSpending:   60000,
		Contribution401k: 23000,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunEnhancedSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// BenchmarkBronzeEngine1000Paths benchmarks the bronze engine with 1000 paths
func BenchmarkBronzeEngine1000Paths(b *testing.B) {
	engine := NewBronzeEngine()

	params := EnhancedSimulationParams{
		Seed:          12345,
		StartYear:     2025,
		HorizonMonths: 360,
		MCPaths:       1000,
		CurrentAge:    35,
		InitialAccounts: Accounts{
			Cash:    50000,
			Taxable: 450000,
		},
		AnnualIncome:   100000,
		AnnualSpending: 50000,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunEnhancedSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// TestBronzePerformanceReport generates a performance comparison
func TestBronzePerformanceReport(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance report in short mode")
	}

	basicEngine := NewEngine()
	bronzeEngine := NewBronzeEngine()

	configs := []struct {
		name  string
		paths int
	}{
		{"100 paths", 100},
		{"500 paths", 500},
		{"1000 paths", 1000},
	}

	t.Log("\n=== Performance Comparison: Basic vs Bronze Engine ===\n")

	for _, cfg := range configs {
		// Basic engine params
		basicParams := SimulationParams{
			InvestableAssets: 500000,
			AnnualSpending:   60000,
			CurrentAge:       35,
			ExpectedIncome:   100000,
			Seed:             12345,
			StartYear:        2025,
			HorizonMonths:    360,
			MCPaths:          cfg.paths,
		}

		// Bronze engine params
		bronzeParams := EnhancedSimulationParams{
			Seed:          12345,
			StartYear:     2025,
			HorizonMonths: 360,
			MCPaths:       cfg.paths,
			CurrentAge:    35,
			StateRate:     0.093,
			InitialAccounts: Accounts{
				Cash:        50000,
				Taxable:     300000,
				TaxDeferred: 150000,
			},
			AnnualIncome:     100000,
			AnnualSpending:   60000,
			Contribution401k: 23000,
		}

		iterations := 10

		// Benchmark basic engine
		var basicTotal time.Duration
		for i := 0; i < iterations; i++ {
			basicParams.Seed = 12345 + i
			start := time.Now()
			basicEngine.RunSimulation(basicParams)
			basicTotal += time.Since(start)
		}
		basicAvg := basicTotal / time.Duration(iterations)

		// Benchmark bronze engine
		var bronzeTotal time.Duration
		for i := 0; i < iterations; i++ {
			bronzeParams.Seed = 12345 + i
			start := time.Now()
			bronzeEngine.RunEnhancedSimulation(bronzeParams)
			bronzeTotal += time.Since(start)
		}
		bronzeAvg := bronzeTotal / time.Duration(iterations)

		t.Logf("%s:", cfg.name)
		t.Logf("  Basic Engine:  %v", basicAvg)
		t.Logf("  Bronze Engine: %v (%.1fx slower)", bronzeAvg, float64(bronzeAvg)/float64(basicAvg))
		t.Logf("")
	}
}

// TestBronzeVsFullEngineFeatures documents feature comparison
func TestBronzeVsFullEngineFeatures(t *testing.T) {
	t.Log("\n=== Feature Comparison: Bronze vs Full Engine ===\n")

	features := []struct {
		feature string
		bronze  string
		full    string
	}{
		{"Account Types", "cash, taxable, 401k, roth", "cash, taxable, tax_deferred, roth, 529, HSA"},
		{"Tax Calculation", "Federal brackets + flat state", "Full federal/state brackets, FICA, AMT, NIIT"},
		{"Withdrawal Sequence", "Cash first, then taxable", "Optimal ordering with tax efficiency"},
		{"RMDs", "Not implemented", "Full RMD calculations"},
		{"Social Security", "Not implemented", "PIA calculation, claiming strategy"},
		{"Contributions", "401k, Roth (manual)", "All account types with limits"},
		{"Events", "Basic income/expense", "56+ event types"},
		{"Tax-Loss Harvesting", "Not implemented", "Full implementation"},
		{"Roth Conversions", "Not implemented", "Optimizer"},
		{"GARCH Volatility", "Simple std dev", "Full GARCH(1,1)"},
	}

	for _, f := range features {
		t.Logf("%-20s | Bronze: %-30s | Full: %s", f.feature, f.bronze, f.full)
	}
}
