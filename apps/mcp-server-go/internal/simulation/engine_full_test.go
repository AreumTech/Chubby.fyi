package simulation

import (
	"testing"
	"time"
)

// TestFullEngineBasic verifies the full engine produces valid results
func TestFullEngineBasic(t *testing.T) {
	engine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360, // 30 years
		MCPaths:            100,
		CurrentAge:         35,
		StateCode:          "CA",
		StateRate:          0.093,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 150000, // 401k
		RothBalance:        0,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		Contribution401k:   23000, // Max 401k
		ContributionRoth:   7000,  // Max Roth
		LiteMode:           true,  // Use optimized mode
	}

	result, err := engine.RunFullSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	if !result.Success {
		t.Errorf("Expected success, got error: %s", result.Error)
	}

	if result.PathsRun != 100 {
		t.Errorf("Expected 100 paths, got %d", result.PathsRun)
	}

	// With $500k initial + $100k income - $60k spending + growth, should have positive NW
	if result.MC.FinalNetWorthP50 < 0 {
		t.Errorf("Expected positive final net worth, got %f", result.MC.FinalNetWorthP50)
	}

	t.Logf("Full Engine Results:")
	t.Logf("  Final NW P50: $%.0f", result.MC.FinalNetWorthP50)
	t.Logf("  Runway P50: %d months (%d years)", result.MC.RunwayP50, result.MC.RunwayP50/12)
	t.Logf("  Breach Probability: %.1f%%", result.MC.EverBreachProbability*100)
	t.Logf("  Paths run: %d", result.PathsRun)
}

// TestFullEngineDeterminism verifies same seed produces same results
func TestFullEngineDeterminism(t *testing.T) {
	engine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               42,
		StartYear:          2025,
		HorizonMonths:      360,
		MCPaths:            100,
		CurrentAge:         35,
		CashBalance:        50000,
		TaxableBalance:     450000,
		AnnualIncome:       100000,
		AnnualSpending:     50000,
		LiteMode:           true,
	}

	result1, _ := engine.RunFullSimulation(params)
	result2, _ := engine.RunFullSimulation(params)

	if result1.MC.FinalNetWorthP50 != result2.MC.FinalNetWorthP50 {
		t.Errorf("FinalNetWorthP50 differs: %f vs %f",
			result1.MC.FinalNetWorthP50, result2.MC.FinalNetWorthP50)
	}

	if result1.MC.RunwayP50 != result2.MC.RunwayP50 {
		t.Errorf("RunwayP50 differs: %d vs %d",
			result1.MC.RunwayP50, result2.MC.RunwayP50)
	}
}

// BenchmarkFullEngine100Paths benchmarks the full engine with 100 paths
func BenchmarkFullEngine100Paths(b *testing.B) {
	engine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360,
		MCPaths:            100,
		CurrentAge:         35,
		StateRate:          0.093,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 150000,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		Contribution401k:   23000,
		LiteMode:           true,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunFullSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// BenchmarkFullEngine100PathsFullMode benchmarks without LiteMode
func BenchmarkFullEngine100PathsFullMode(b *testing.B) {
	engine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360,
		MCPaths:            100,
		CurrentAge:         35,
		StateRate:          0.093,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 150000,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		Contribution401k:   23000,
		LiteMode:           false, // Full mode
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunFullSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// TestAllEngineComparison compares all three engine tiers
func TestAllEngineComparison(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping comparison in short mode")
	}

	basicEngine := NewEngine()
	bronzeEngine := NewBronzeEngine()
	fullEngine := NewFullEngine()

	iterations := 10
	mcPaths := 100

	t.Log("\n=== All Engine Performance Comparison ===\n")

	// Basic engine
	basicParams := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   60000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    360,
		MCPaths:          mcPaths,
	}

	var basicTotal time.Duration
	for i := 0; i < iterations; i++ {
		basicParams.Seed = 12345 + i
		start := time.Now()
		basicEngine.RunSimulation(basicParams)
		basicTotal += time.Since(start)
	}
	basicAvg := basicTotal / time.Duration(iterations)

	// Bronze engine
	bronzeParams := EnhancedSimulationParams{
		Seed:          12345,
		StartYear:     2025,
		HorizonMonths: 360,
		MCPaths:       mcPaths,
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

	var bronzeTotal time.Duration
	for i := 0; i < iterations; i++ {
		bronzeParams.Seed = 12345 + i
		start := time.Now()
		bronzeEngine.RunEnhancedSimulation(bronzeParams)
		bronzeTotal += time.Since(start)
	}
	bronzeAvg := bronzeTotal / time.Duration(iterations)

	// Full engine (LiteMode)
	fullParams := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360,
		MCPaths:            mcPaths,
		CurrentAge:         35,
		StateRate:          0.093,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 150000,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		Contribution401k:   23000,
		LiteMode:           true,
	}

	var fullLiteTotal time.Duration
	for i := 0; i < iterations; i++ {
		fullParams.Seed = 12345 + i
		start := time.Now()
		fullEngine.RunFullSimulation(fullParams)
		fullLiteTotal += time.Since(start)
	}
	fullLiteAvg := fullLiteTotal / time.Duration(iterations)

	// Full engine (Full mode)
	fullParams.LiteMode = false
	var fullTotal time.Duration
	for i := 0; i < iterations; i++ {
		fullParams.Seed = 12345 + i
		start := time.Now()
		fullEngine.RunFullSimulation(fullParams)
		fullTotal += time.Since(start)
	}
	fullAvg := fullTotal / time.Duration(iterations)

	t.Logf("%-20s %15s %10s", "Engine", "Time", "vs Basic")
	t.Logf("%-20s %15s %10s", "------", "----", "--------")
	t.Logf("%-20s %15v %10s", "Basic (no tax)", basicAvg, "1.0x")
	t.Logf("%-20s %15v %10.1fx", "Bronze (simple tax)", bronzeAvg, float64(bronzeAvg)/float64(basicAvg))
	t.Logf("%-20s %15v %10.1fx", "Full (LiteMode)", fullLiteAvg, float64(fullLiteAvg)/float64(basicAvg))
	t.Logf("%-20s %15v %10.1fx", "Full (complete)", fullAvg, float64(fullAvg)/float64(basicAvg))
	t.Logf("")
	t.Logf("Target: <500ms for %d paths", mcPaths)
	t.Logf("Basic:  %v (%.0fx under target)", basicAvg, 500.0/float64(basicAvg.Milliseconds()))
	t.Logf("Bronze: %v (%.0fx under target)", bronzeAvg, 500.0/float64(bronzeAvg.Milliseconds()))
	t.Logf("Full:   %v (%.1fx under target)", fullAvg, 500.0/float64(fullAvg.Milliseconds()))
}
