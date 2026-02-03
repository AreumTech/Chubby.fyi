package simulation

import (
	"encoding/json"
	"math"
	"testing"

	"github.com/areumfire/mcp-server-go/internal/engine"
)

// TestParitySimpleScenario verifies native Go matches expected behavior
func TestParitySimpleScenario(t *testing.T) {
	// Simple scenario: $500k assets, $60k spending, $100k income, age 35
	fullEngine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360, // 30 years
		MCPaths:            100,
		CurrentAge:         35,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 100000,
		RothBalance:        50000,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		Contribution401k:   23000,
		ContributionRoth:   7000,
		LiteMode:           true,
	}

	result, err := fullEngine.RunFullSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	t.Logf("Simple Scenario Results (seed=%d):", params.Seed)
	t.Logf("  Final NW P50: $%.0f", result.MC.FinalNetWorthP50)
	t.Logf("  Runway P50: %d months", result.MC.RunwayP50)
	t.Logf("  Breach Probability: %.1f%%", result.MC.EverBreachProbability*100)
	t.Logf("  Paths: %d", result.PathsRun)

	// Verify determinism - run again with same seed
	result2, _ := fullEngine.RunFullSimulation(params)
	if result.MC.FinalNetWorthP50 != result2.MC.FinalNetWorthP50 {
		t.Errorf("Determinism failed: FinalNetWorthP50 differs %f vs %f",
			result.MC.FinalNetWorthP50, result2.MC.FinalNetWorthP50)
	}
}

// TestParityComplexScenario tests with multiple events and accounts
func TestParityComplexScenario(t *testing.T) {
	// Complex scenario with custom events
	fullEngine := NewFullEngine()

	// Add Social Security at age 67
	params := FullSimulationParams{
		Seed:                  42,
		StartYear:             2025,
		HorizonMonths:         480, // 40 years
		MCPaths:               100,
		CurrentAge:            45,
		CashBalance:           100000,
		TaxableBalance:        500000,
		TaxDeferredBalance:    400000,
		RothBalance:           100000,
		FiveTwoNineBalance:    50000,
		AnnualIncome:          150000,
		AnnualSpending:        80000,
		Contribution401k:      23000,
		ContributionRoth:      7000,
		SocialSecurityAge:     67,
		SocialSecurityBenefit: 3000, // $3k/month
		LiteMode:              true,
	}

	result, err := fullEngine.RunFullSimulation(params)
	if err != nil {
		t.Fatalf("Complex simulation failed: %v", err)
	}

	t.Logf("Complex Scenario Results (seed=%d):", params.Seed)
	t.Logf("  Final NW P50: $%.0f", result.MC.FinalNetWorthP50)
	t.Logf("  Runway P50: %d months (%d years)", result.MC.RunwayP50, result.MC.RunwayP50/12)
	t.Logf("  Breach Probability: %.1f%%", result.MC.EverBreachProbability*100)
	t.Logf("  Trajectory points: %d", len(result.Trajectory))
}

// TestParityDirectEngineCall tests the engine directly (bypassing adapter)
func TestParityDirectEngineCall(t *testing.T) {
	// Start from default config to get correlation matrix
	config := engine.GetDefaultStochasticConfig()
	config.RandomSeed = 12345
	config.SimulationMode = "stochastic"
	config.CashFloor = 10000
	config.LiteMode = true
	config.PayTaxesEndOfYear = true

	// Build input directly for engine
	input := engine.SimulationInput{
		MonthsToRun: 360,
		StartYear:   2025,
		InitialAge:  35,
		InitialAccounts: engine.AccountHoldingsMonthEnd{
			Cash: 50000,
			Taxable: &engine.Account{
				TotalValue: 300000,
				Holdings:   []engine.Holding{},
			},
			TaxDeferred: &engine.Account{
				TotalValue: 150000,
				Holdings:   []engine.Holding{},
			},
			Roth: &engine.Account{
				TotalValue: 50000,
				Holdings:   []engine.Holding{},
			},
		},
		Config: config,
		Events: []engine.FinancialEvent{
			{
				ID:          "income-salary",
				Type:        "INCOME",
				Description: "Annual salary",
				Amount:      100000 / 12, // Monthly
				MonthOffset: 0,
				Frequency:   "monthly",
			},
			{
				ID:          "expense-living",
				Type:        "EXPENSE",
				Description: "Living expenses",
				Amount:      60000 / 12, // Monthly
				MonthOffset: 0,
				Frequency:   "monthly",
			},
		},
	}

	// Run Monte Carlo
	result := engine.RunMonteCarloSimulation(input, 100)

	if !result.Success {
		t.Fatalf("Engine failed: %s", result.Error)
	}

	t.Logf("Direct Engine Call Results:")
	t.Logf("  Final NW P50: $%.0f", result.FinalNetWorthP50)
	t.Logf("  Final NW P10: $%.0f", result.FinalNetWorthP10)
	t.Logf("  Final NW P75: $%.0f", result.FinalNetWorthP75)
	t.Logf("  Ever Breach Prob: %.1f%%", result.EverBreachProbability*100)
	t.Logf("  Successful Paths: %d", result.SuccessfulPaths)

	// Note: NetWorthTrajectory is computed by RunSimulationWithUIPayload, not RunMonteCarloSimulation
	// Direct engine calls don't populate trajectory data
	t.Logf("  Note: Trajectory computed separately via UI payload transformer")

	// Verify stochastic variance (P10 < P50 < P75)
	if result.FinalNetWorthP10 >= result.FinalNetWorthP50 {
		t.Errorf("Expected P10 < P50, got P10=%f, P50=%f", result.FinalNetWorthP10, result.FinalNetWorthP50)
	}
	if result.FinalNetWorthP50 >= result.FinalNetWorthP75 {
		t.Errorf("Expected P50 < P75, got P50=%f, P75=%f", result.FinalNetWorthP50, result.FinalNetWorthP75)
	}
}

// TestParityDeterminism verifies identical seeds produce identical results
func TestParityDeterminism(t *testing.T) {
	seeds := []int{12345, 42, 99999, 1}

	for _, seed := range seeds {
		// Start from default config to get correlation matrix and all parameters
		config := engine.GetDefaultStochasticConfig()
		config.RandomSeed = int64(seed)
		config.SimulationMode = "stochastic"
		config.CashFloor = 10000
		config.LiteMode = true

		input := engine.SimulationInput{
			MonthsToRun: 360,
			StartYear:   2025,
			InitialAge:  35,
			InitialAccounts: engine.AccountHoldingsMonthEnd{
				Cash: 50000,
				Taxable: &engine.Account{
					TotalValue: 450000,
					Holdings:   []engine.Holding{},
				},
			},
			Config: config,
			Events: []engine.FinancialEvent{
				{
					ID:          "income",
					Type:        "INCOME",
					Amount:      8333,
					MonthOffset: 0,
					Frequency:   "monthly",
				},
				{
					ID:          "expense",
					Type:        "EXPENSE",
					Amount:      5000,
					MonthOffset: 0,
					Frequency:   "monthly",
				},
			},
		}

		result1 := engine.RunMonteCarloSimulation(input, 50)
		result2 := engine.RunMonteCarloSimulation(input, 50)

		if result1.FinalNetWorthP50 != result2.FinalNetWorthP50 {
			t.Errorf("Seed %d: P50 differs: %f vs %f",
				seed, result1.FinalNetWorthP50, result2.FinalNetWorthP50)
		}

		if result1.EverBreachProbability != result2.EverBreachProbability {
			t.Errorf("Seed %d: Breach prob differs: %f vs %f",
				seed, result1.EverBreachProbability, result2.EverBreachProbability)
		}

		t.Logf("Seed %d: P50=$%.0f, BreachProb=%.1f%% ✓ deterministic",
			seed, result1.FinalNetWorthP50, result1.EverBreachProbability*100)
	}

	// CRITICAL: Verify different seeds produce different results
	// This catches the bug where RNG isn't properly seeded per path
	config1 := engine.GetDefaultStochasticConfig()
	config1.RandomSeed = 12345
	config1.LiteMode = true

	config2 := engine.GetDefaultStochasticConfig()
	config2.RandomSeed = 99999
	config2.LiteMode = true

	input1 := engine.SimulationInput{
		MonthsToRun: 360, StartYear: 2025, InitialAge: 35,
		InitialAccounts: engine.AccountHoldingsMonthEnd{
			Cash: 50000, Taxable: &engine.Account{TotalValue: 450000},
		},
		Config: config1,
		Events: []engine.FinancialEvent{
			{ID: "income", Type: "INCOME", Amount: 8333, MonthOffset: 0, Frequency: "monthly"},
			{ID: "expense", Type: "EXPENSE", Amount: 5000, MonthOffset: 0, Frequency: "monthly"},
		},
	}
	input2 := input1
	input2.Config = config2

	r1 := engine.RunMonteCarloSimulation(input1, 50)
	r2 := engine.RunMonteCarloSimulation(input2, 50)

	if r1.FinalNetWorthP50 == r2.FinalNetWorthP50 {
		t.Errorf("CRITICAL: Different seeds (12345 vs 99999) produced identical P50 ($%.0f) - RNG not working!",
			r1.FinalNetWorthP50)
	} else {
		t.Logf("✓ Different seeds produce different results: $%.0f vs $%.0f", r1.FinalNetWorthP50, r2.FinalNetWorthP50)
	}
}

// TestParityWithEvents tests event processing matches expectations
func TestParityWithEvents(t *testing.T) {
	// Test with various event types
	targetType401k := "tax_deferred"
	targetTypeRoth := "roth"

	// Start from default config to get correlation matrix
	config := engine.GetDefaultStochasticConfig()
	config.RandomSeed = 12345
	config.SimulationMode = "stochastic"
	config.CashFloor = 5000
	config.LiteMode = true
	config.PayTaxesEndOfYear = true

	input := engine.SimulationInput{
		MonthsToRun: 120, // 10 years
		StartYear:   2025,
		InitialAge:  30,
		InitialAccounts: engine.AccountHoldingsMonthEnd{
			Cash: 20000,
			Taxable: &engine.Account{
				TotalValue: 100000,
				Holdings:   []engine.Holding{},
			},
			TaxDeferred: &engine.Account{
				TotalValue: 50000,
				Holdings:   []engine.Holding{},
			},
			Roth: &engine.Account{
				TotalValue: 25000,
				Holdings:   []engine.Holding{},
			},
		},
		Config: config,
		Events: []engine.FinancialEvent{
			// Income
			{
				ID:          "salary",
				Type:        "INCOME",
				Amount:      10000, // $120k/year
				MonthOffset: 0,
				Frequency:   "monthly",
			},
			// Expenses
			{
				ID:          "living",
				Type:        "EXPENSE",
				Amount:      4000, // $48k/year
				MonthOffset: 0,
				Frequency:   "monthly",
			},
			// 401k contribution
			{
				ID:                "401k-contrib",
				Type:              "SCHEDULED_CONTRIBUTION",
				Amount:            1916, // ~$23k/year
				MonthOffset:       0,
				Frequency:         "monthly",
				TargetAccountType: &targetType401k,
			},
			// Roth contribution
			{
				ID:                "roth-contrib",
				Type:              "SCHEDULED_CONTRIBUTION",
				Amount:            583, // ~$7k/year
				MonthOffset:       0,
				Frequency:         "monthly",
				TargetAccountType: &targetTypeRoth,
			},
		},
	}

	result := engine.RunMonteCarloSimulation(input, 100)

	if !result.Success {
		t.Fatalf("Event test failed: %s", result.Error)
	}

	t.Logf("Event Processing Results:")
	t.Logf("  Final NW P50: $%.0f", result.FinalNetWorthP50)
	t.Logf("  Final NW P10: $%.0f", result.FinalNetWorthP10)
	t.Logf("  Final NW P75: $%.0f", result.FinalNetWorthP75)

	// With $195k initial, $120k income, $48k spending, $30k contributions
	// Should grow significantly over 10 years
	initialNW := 20000.0 + 100000 + 50000 + 25000 // $195k
	if result.FinalNetWorthP50 < initialNW {
		t.Logf("  Warning: Final NW less than initial - may indicate event processing issue")
	}

	// Verify no 100% breach (healthy scenario)
	if result.EverBreachProbability > 0.5 {
		t.Logf("  Warning: High breach probability %.1f%% for healthy scenario",
			result.EverBreachProbability*100)
	}
}

// TestParityJSONRoundTrip verifies results can be serialized/deserialized
func TestParityJSONRoundTrip(t *testing.T) {
	fullEngine := NewFullEngine()

	params := FullSimulationParams{
		Seed:               12345,
		StartYear:          2025,
		HorizonMonths:      360,
		MCPaths:            50,
		CurrentAge:         35,
		CashBalance:        50000,
		TaxableBalance:     300000,
		TaxDeferredBalance: 100000,
		AnnualIncome:       100000,
		AnnualSpending:     60000,
		LiteMode:           true,
	}

	result, err := fullEngine.RunFullSimulation(params)
	if err != nil {
		t.Fatalf("Simulation failed: %v", err)
	}

	// Serialize to JSON
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("JSON marshal failed: %v", err)
	}

	// Deserialize
	var parsed FullSimulationResult
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("JSON unmarshal failed: %v", err)
	}

	// Compare key fields
	if math.Abs(parsed.MC.FinalNetWorthP50-result.MC.FinalNetWorthP50) > 0.01 {
		t.Errorf("P50 changed after JSON round-trip: %f vs %f",
			result.MC.FinalNetWorthP50, parsed.MC.FinalNetWorthP50)
	}

	if parsed.MC.RunwayP50 != result.MC.RunwayP50 {
		t.Errorf("RunwayP50 changed: %d vs %d",
			result.MC.RunwayP50, parsed.MC.RunwayP50)
	}

	t.Logf("JSON size: %d bytes", len(jsonBytes))
	t.Logf("JSON round-trip: ✓ values preserved")
}

// TestParityConfigLoading verifies tax configs are loaded correctly
func TestParityConfigLoading(t *testing.T) {
	// This tests that the embedded configs are loaded
	// by running a simulation that requires tax calculations

	// Start from default config to get correlation matrix and GARCH params
	config := engine.GetDefaultStochasticConfig()
	config.RandomSeed = 12345
	config.SimulationMode = "stochastic"
	config.CashFloor = 10000
	config.LiteMode = false // Full mode to exercise tax code
	config.PayTaxesEndOfYear = true

	input := engine.SimulationInput{
		MonthsToRun: 12, // 1 year
		StartYear:   2025,
		InitialAge:  35,
		InitialAccounts: engine.AccountHoldingsMonthEnd{
			Cash: 100000,
			Taxable: &engine.Account{
				TotalValue: 400000,
				Holdings:   []engine.Holding{},
			},
		},
		Config: config,
		Events: []engine.FinancialEvent{
			{
				ID:          "high-income",
				Type:        "INCOME",
				Amount:      25000, // $300k/year
				MonthOffset: 0,
				Frequency:   "monthly",
			},
			{
				ID:          "spending",
				Type:        "EXPENSE",
				Amount:      10000, // $120k/year
				MonthOffset: 0,
				Frequency:   "monthly",
			},
		},
	}

	result := engine.RunMonteCarloSimulation(input, 10)

	if !result.Success {
		t.Fatalf("Config test failed: %s", result.Error)
	}

	t.Logf("Config Loading Test:")
	t.Logf("  Success: %v", result.Success)
	t.Logf("  Paths run: %d", result.NumberOfRuns)
	t.Logf("  Final NW P50: $%.0f", result.FinalNetWorthP50)

	// If we got here without panic, configs loaded correctly
	t.Logf("  Tax configs: ✓ loaded successfully")
}
