package main

import (
	"testing"
	"math"
)

// TestIntegrationValidation runs more comprehensive tests of the fixes
func TestIntegrationValidation(t *testing.T) {
	// Load configuration for tests
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("BacktestConfigurationIntegration", func(t *testing.T) {
		// Test that backtest engine uses the new configurable acquisition date
		config := GetDefaultStochasticConfig()
		simEngine := NewSimulationEngine(config)
		engine := &BacktestEngine{
			simulationEngine: simEngine,
		}

		// Create a minimal historical scenario for testing
		scenario := HistoricalScenario{
			Name: "Test Scenario",
			InitialInvestment: 100000.0,
			Portfolio: &PortfolioAllocation{
				Stocks: 0.6,
				Bonds:  0.4,
			},
		}

		// Create the initial accounts using the refactored method
		accounts := engine.createInitialAccounts(scenario)

		// Verify accounts were created
		if accounts.Taxable == nil {
			t.Error("Taxable account should be created")
			return
		}

		if len(accounts.Taxable.Holdings) == 0 {
			t.Error("Should have holdings in taxable account")
			return
		}

		// Verify holdings have proper lot tracking with configurable acquisition date
		stockHolding := accounts.Taxable.Holdings[0]
		if len(stockHolding.Lots) == 0 {
			t.Error("Holdings should have tax lots for proper capital gains tracking")
			return
		}

		// Check that acquisition date matches configuration, not hardcoded -12
		expectedAcquisitionDate := GetDefaultBacktestAcquisitionDate()
		actualAcquisitionDate := stockHolding.Lots[0].AcquisitionDate

		if actualAcquisitionDate != expectedAcquisitionDate {
			t.Errorf("Expected acquisition date %d, got %d", expectedAcquisitionDate, actualAcquisitionDate)
		}

		if actualAcquisitionDate == -12 {
			t.Error("Acquisition date should not be hardcoded -12 anymore")
		}
	})

	t.Run("AgeBasedStrategyRealScenarios", func(t *testing.T) {
		// Test age-based strategy with various real-world ages
		testCases := []struct {
			age                    int
			expectedStockRange     [2]float64 // min, max expected stock percentage
			description            string
		}{
			{25, [2]float64{0.80, 0.90}, "Young investor should have high stock allocation"},
			{45, [2]float64{0.60, 0.75}, "Mid-career should have moderate-high stock allocation"},
			{65, [2]float64{0.40, 0.50}, "Near retirement should have moderate stock allocation"},
			{75, [2]float64{0.20, 0.40}, "In retirement should have conservative stock allocation"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

				// Calculate what the strategy would produce
				rawStockPercentage := float64(ageRule - tc.age) / 100.0
				stockPercentage := math.Max(minStock, math.Min(maxStock, rawStockPercentage))

				// Verify it's within expected range for the age
				if stockPercentage < tc.expectedStockRange[0] || stockPercentage > tc.expectedStockRange[1] {
					t.Errorf("Age %d: stock allocation %.1f%% outside expected range %.1f%%-%.1f%%",
						tc.age, stockPercentage*100, tc.expectedStockRange[0]*100, tc.expectedStockRange[1]*100)
				}

				// Verify proportions add up correctly
				totalStockAllocation := stockPercentage * (domesticProp + intlProp)
				bondAllocation := 1.0 - stockPercentage

				if math.Abs(totalStockAllocation + bondAllocation - 1.0) > 0.001 {
					t.Errorf("Allocations don't sum to 100%%: stocks=%.1f%%, bonds=%.1f%%",
						totalStockAllocation*100, bondAllocation*100)
				}
			})
		}
	})

	t.Run("GlidePathStrategyRealScenarios", func(t *testing.T) {
		// Test glide path with realistic retirement scenarios
		testCases := []struct {
			currentAge         int
			retirementAge      int
			expectedStockRange [2]float64
			description        string
		}{
			{25, 65, [2]float64{0.85, 0.95}, "40 years to retirement - aggressive"},
			{35, 65, [2]float64{0.85, 0.95}, "30 years to retirement - aggressive"},
			{45, 65, [2]float64{0.75, 0.85}, "20 years to retirement - moderate-aggressive"},
			{55, 65, [2]float64{0.60, 0.70}, "10 years to retirement - moderate"},
			{62, 67, [2]float64{0.45, 0.55}, "5 years to retirement - conservative"},
			{67, 65, [2]float64{0.25, 0.35}, "In retirement - very conservative"},
		}

		brackets := GetGlidePathBrackets()
		if len(brackets) == 0 {
			t.Fatal("No glide path brackets loaded")
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				yearsToRetirement := math.Max(0, float64(tc.retirementAge - tc.currentAge))

				// Find the appropriate bracket (mimics the strategy logic)
				var stockPercentage float64
				found := false

				for _, bracket := range brackets {
					if yearsToRetirement >= float64(bracket.YearsToRetirementMin) {
						stockPercentage = bracket.StockPercentage
						found = true
						break
					}
				}

				if !found && len(brackets) > 0 {
					stockPercentage = brackets[len(brackets)-1].StockPercentage
				}

				// Verify it's within expected range
				if stockPercentage < tc.expectedStockRange[0] || stockPercentage > tc.expectedStockRange[1] {
					t.Errorf("Age %d (%.0f years to retirement): stock allocation %.1f%% outside expected range %.1f%%-%.1f%%",
						tc.currentAge, yearsToRetirement, stockPercentage*100,
						tc.expectedStockRange[0]*100, tc.expectedStockRange[1]*100)
				}
			})
		}
	})

	t.Run("ConfigurationConsistency", func(t *testing.T) {
		// Verify all configuration values are reasonable and consistent

		// Age-based strategy
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		if ageRule < 90 || ageRule > 130 {
			t.Errorf("Age rule constant %d seems unreasonable (should be 90-130)", ageRule)
		}

		if maxStock <= minStock {
			t.Error("Max stock allocation should be greater than min stock allocation")
		}

		if maxStock > 1.0 || minStock < 0.0 {
			t.Error("Stock allocation bounds should be between 0 and 1")
		}

		if math.Abs(domesticProp + intlProp - 1.0) > 0.001 {
			t.Errorf("Domestic (%.1f%%) + international (%.1f%%) proportions should sum to 100%%",
				domesticProp*100, intlProp*100)
		}

		// Glide path brackets
		brackets := GetGlidePathBrackets()
		if len(brackets) < 3 {
			t.Error("Should have at least 3 glide path brackets for reasonable coverage")
		}

		// Check brackets are in descending order of years to retirement
		for i := 1; i < len(brackets); i++ {
			if brackets[i].YearsToRetirementMin > brackets[i-1].YearsToRetirementMin {
				t.Error("Glide path brackets should be ordered by descending years to retirement")
			}
		}

		// Check stock percentages generally decrease as retirement approaches
		for i := 1; i < len(brackets); i++ {
			if brackets[i].StockPercentage > brackets[i-1].StockPercentage {
				t.Logf("WARNING: Stock allocation increases closer to retirement (bracket %d: %.1f%% -> bracket %d: %.1f%%)",
					i-1, brackets[i-1].StockPercentage*100, i, brackets[i].StockPercentage*100)
			}
		}

		// Check all brackets have reasonable allocations
		for i, bracket := range brackets {
			if bracket.StockPercentage < 0.0 || bracket.StockPercentage > 1.0 {
				t.Errorf("Bracket %d has invalid stock percentage: %.1f%%", i, bracket.StockPercentage*100)
			}

			if math.Abs(bracket.DomesticStockProportion + bracket.InternationalStockProportion - 1.0) > 0.001 {
				t.Errorf("Bracket %d: domestic (%.1f%%) + international (%.1f%%) should sum to 100%%",
					i, bracket.DomesticStockProportion*100, bracket.InternationalStockProportion*100)
			}
		}
	})
}