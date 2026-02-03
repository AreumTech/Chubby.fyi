package simulation

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"
)

// TestBasicSimulation verifies the simulation produces expected outputs
func TestBasicSimulation(t *testing.T) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    360, // 30 years
		MCPaths:          100,
	}

	result, err := engine.RunSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	if !result.Success {
		t.Error("Expected success to be true")
	}

	if result.PathsRun != 100 {
		t.Errorf("Expected 100 paths, got %d", result.PathsRun)
	}

	if result.BaseSeed != 12345 {
		t.Errorf("Expected seed 12345, got %d", result.BaseSeed)
	}

	// Verify MC results are populated
	if result.MC == nil {
		t.Fatal("MC results should not be nil")
	}

	// Verify trajectory is populated
	if len(result.Trajectory) == 0 {
		t.Error("Trajectory should not be empty")
	}
}

// TestDeterminism verifies same seed produces same results
func TestDeterminism(t *testing.T) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             42,
		StartYear:        2025,
		HorizonMonths:    360,
		MCPaths:          100,
	}

	result1, err := engine.RunSimulation(params)
	if err != nil {
		t.Fatalf("First simulation failed: %v", err)
	}

	result2, err := engine.RunSimulation(params)
	if err != nil {
		t.Fatalf("Second simulation failed: %v", err)
	}

	// Compare key results
	if result1.MC.FinalNetWorthP50 != result2.MC.FinalNetWorthP50 {
		t.Errorf("FinalNetWorthP50 differs: %f vs %f",
			result1.MC.FinalNetWorthP50, result2.MC.FinalNetWorthP50)
	}

	if result1.MC.RunwayP50 != result2.MC.RunwayP50 {
		t.Errorf("RunwayP50 differs: %d vs %d",
			result1.MC.RunwayP50, result2.MC.RunwayP50)
	}

	if result1.MC.EverBreachProbability != result2.MC.EverBreachProbability {
		t.Errorf("EverBreachProbability differs: %f vs %f",
			result1.MC.EverBreachProbability, result2.MC.EverBreachProbability)
	}
}

// BenchmarkSimulation100Paths benchmarks 100 Monte Carlo paths
func BenchmarkSimulation100Paths(b *testing.B) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    360,
		MCPaths:          100,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i // Vary seed to avoid caching effects
		_, err := engine.RunSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// BenchmarkSimulation1000Paths benchmarks 1000 Monte Carlo paths
func BenchmarkSimulation1000Paths(b *testing.B) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    360,
		MCPaths:          1000,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// BenchmarkSimulation100PathsShortHorizon benchmarks 100 paths with 5-year horizon
func BenchmarkSimulation100PathsShortHorizon(b *testing.B) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    60, // 5 years
		MCPaths:          100,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		params.Seed = 12345 + i
		_, err := engine.RunSimulation(params)
		if err != nil {
			b.Fatalf("Simulation failed: %v", err)
		}
	}
}

// RunPerformanceReport runs a performance report with timing information
func RunPerformanceReport() string {
	engine := NewEngine()

	configs := []struct {
		name    string
		paths   int
		horizon int
	}{
		{"100 paths, 30yr", 100, 360},
		{"100 paths, 60yr", 100, 720},
		{"500 paths, 30yr", 500, 360},
		{"1000 paths, 30yr", 1000, 360},
	}

	report := "Native Go Simulation Performance Report\n"
	report += "========================================\n\n"

	for _, cfg := range configs {
		params := SimulationParams{
			InvestableAssets: 500000,
			AnnualSpending:   50000,
			CurrentAge:       35,
			ExpectedIncome:   100000,
			Seed:             12345,
			StartYear:        2025,
			HorizonMonths:    cfg.horizon,
			MCPaths:          cfg.paths,
		}

		// Run 10 iterations and average
		var totalDuration time.Duration
		iterations := 10
		var result *SimulationResult

		for i := 0; i < iterations; i++ {
			params.Seed = 12345 + i
			start := time.Now()
			var err error
			result, err = engine.RunSimulation(params)
			if err != nil {
				continue
			}
			totalDuration += time.Since(start)
		}

		avgDuration := totalDuration / time.Duration(iterations)
		report += fmt.Sprintf("%s:\n", cfg.name)
		report += fmt.Sprintf("  Average time: %v\n", avgDuration)
		report += fmt.Sprintf("  Paths/second: %.0f\n", float64(cfg.paths)/avgDuration.Seconds())
		if result != nil {
			report += fmt.Sprintf("  Final NW P50: $%.0f\n", result.MC.FinalNetWorthP50)
		}
		report += "\n"
	}

	return report
}

// TestPerformanceReport generates and prints a performance report
func TestPerformanceReport(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance report in short mode")
	}

	report := RunPerformanceReport()
	t.Log("\n" + report)
}

// TestJSONOutput verifies the output can be serialized to JSON
func TestJSONOutput(t *testing.T) {
	engine := NewEngine()

	params := SimulationParams{
		InvestableAssets: 500000,
		AnnualSpending:   50000,
		CurrentAge:       35,
		ExpectedIncome:   100000,
		Seed:             12345,
		StartYear:        2025,
		HorizonMonths:    360,
		MCPaths:          100,
	}

	result, err := engine.RunSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	jsonBytes, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("JSON marshaling failed: %v", err)
	}

	// Verify it's valid JSON by unmarshaling
	var parsed SimulationResult
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("JSON unmarshaling failed: %v", err)
	}

	if parsed.MC.FinalNetWorthP50 != result.MC.FinalNetWorthP50 {
		t.Error("JSON round-trip changed FinalNetWorthP50")
	}
}
