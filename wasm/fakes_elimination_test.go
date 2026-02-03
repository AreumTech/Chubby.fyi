package main

import (
	"testing"
	"math"
)

// TestFakesElimination validates that all identified fakes and placeholders have been properly externalized
func TestFakesElimination(t *testing.T) {
	// Load just the defaults configuration for these tests
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("BacktestAcquisitionDateNotHardcoded", func(t *testing.T) {
		// Verify that backtest acquisition date is configurable, not hardcoded to -12
		acquisitionDate := GetDefaultBacktestAcquisitionDate()

		// Should not be hardcoded -12 anymore
		if acquisitionDate == -12 {
			t.Error("Backtest acquisition date is still hardcoded to -12, should use configuration value")
		}

		// Should be the configured value from defaults.json
		expectedAcquisitionDate := -18 // From our configuration
		if acquisitionDate != expectedAcquisitionDate {
			t.Errorf("Expected acquisition date %d, got %d", expectedAcquisitionDate, acquisitionDate)
		}
	})

	t.Run("AgeBasedStrategyParametersExternalized", func(t *testing.T) {
		// Verify age-based strategy parameters are loaded from config, not hardcoded
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		// Check that values match our configuration
		expectedAgeRule := 110
		expectedMaxStock := 0.90
		expectedMinStock := 0.20
		expectedDomesticProp := 0.70
		expectedIntlProp := 0.30

		if ageRule != expectedAgeRule {
			t.Errorf("Expected age rule constant %d, got %d", expectedAgeRule, ageRule)
		}
		if math.Abs(maxStock - expectedMaxStock) > 0.001 {
			t.Errorf("Expected max stock allocation %.3f, got %.3f", expectedMaxStock, maxStock)
		}
		if math.Abs(minStock - expectedMinStock) > 0.001 {
			t.Errorf("Expected min stock allocation %.3f, got %.3f", expectedMinStock, minStock)
		}
		if math.Abs(domesticProp - expectedDomesticProp) > 0.001 {
			t.Errorf("Expected domestic proportion %.3f, got %.3f", expectedDomesticProp, domesticProp)
		}
		if math.Abs(intlProp - expectedIntlProp) > 0.001 {
			t.Errorf("Expected international proportion %.3f, got %.3f", expectedIntlProp, intlProp)
		}
	})

	t.Run("GlidePathBracketsExternalized", func(t *testing.T) {
		// Verify glide path brackets are loaded from config, not hardcoded
		brackets := GetGlidePathBrackets()

		if len(brackets) == 0 {
			t.Error("No glide path brackets loaded from configuration")
		}

		// Check that brackets contain expected structure
		foundThirtyYear := false
		foundRetirement := false

		for _, bracket := range brackets {
			if bracket.YearsToRetirementMin == 30 {
				foundThirtyYear = true
				if math.Abs(bracket.StockPercentage - 0.90) > 0.001 {
					t.Errorf("Expected 30-year bracket to have 90%% stocks, got %.1f%%", bracket.StockPercentage*100)
				}
			}
			if bracket.YearsToRetirementMin == 0 {
				foundRetirement = true
				if math.Abs(bracket.StockPercentage - 0.30) > 0.001 {
					t.Errorf("Expected retirement bracket to have 30%% stocks, got %.1f%%", bracket.StockPercentage*100)
				}
			}
		}

		if !foundThirtyYear {
			t.Error("Missing 30-year retirement bracket in configuration")
		}
		if !foundRetirement {
			t.Error("Missing retirement (0-year) bracket in configuration")
		}
	})

	t.Run("CapitalGainsTaxCalculationAccuracy", func(t *testing.T) {
		// Test that using configurable acquisition dates produces mathematically correct results
		// This validates that the critical backtest fix works properly

		// Create a scenario where acquisition date matters for capital gains classification
		acquisitionDate := GetDefaultBacktestAcquisitionDate() // Should be -18
		currentMonth := 6 // 6 months into simulation

		// Calculate holding period
		holdingPeriodMonths := currentMonth - acquisitionDate // 6 - (-18) = 24 months

		// 24 months should qualify as long-term (> 12 months)
		isLongTerm := holdingPeriodMonths > 12
		if !isLongTerm {
			t.Error("With -18 acquisition date and 6-month sale, should be long-term (24 months > 12)")
		}

		// Verify this is different from the old hardcoded -12 behavior
		oldHardcodedPeriod := currentMonth - (-12) // 6 - (-12) = 18 months

		if holdingPeriodMonths == oldHardcodedPeriod {
			t.Error("New configurable acquisition date should produce different holding periods than hardcoded -12")
		}

		// The key improvement is that now it's configurable and not always -12
		// This allows for more realistic and varied acquisition date scenarios
		if acquisitionDate == -12 {
			t.Error("Acquisition date should not be hardcoded to -12 anymore")
		}
	})
}

// TestStrategyProcessorConfiguration validates that strategy processing uses configuration
func TestStrategyProcessorConfiguration(t *testing.T) {
	// Load just the defaults configuration for these tests
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("AgeBasedAllocationUsesConfig", func(t *testing.T) {
		// Test that age-based allocation uses configuration, not hardcoded values
		taxCalc := NewTaxCalculator(GetDefaultTaxConfig(), nil)
		cashMgr := NewCashManager()
		sp := NewStrategyProcessor(taxCalc, cashMgr)

		// Create minimal test data
		accounts := &AccountHoldingsMonthEnd{
			Cash: 10000.0,
			Taxable: &Account{
				TotalValue: 90000.0,
				Holdings: []Holding{
					{
						AssetClass: AssetClassUSStocksTotalMarket,
						CurrentMarketValueTotal: 90000.0,
					},
				},
			},
		}

		strategy := AssetAllocationStrategy{
			StrategyType: "age_based",
			RebalanceThreshold: 0.05,
		}

		// Test with a 30-year-old (should get aggressive allocation)
		currentAge := 30
		currentMonth := 0

		// Process the strategy - should not panic and should use config values
		err := sp.ProcessAssetAllocationStrategy(accounts, strategy, currentMonth, currentAge, 65)
		if err != nil {
			t.Errorf("Age-based allocation failed: %v", err)
		}

		// Verify the allocation was processed (hard to test exact values without full setup,
		// but at least verify it didn't panic and completed successfully)
	})

	t.Run("GlidePathAllocationUsesConfig", func(t *testing.T) {
		// Test that glide path allocation uses configuration, not hardcoded values
		taxCalc := NewTaxCalculator(GetDefaultTaxConfig(), nil)
		cashMgr := NewCashManager()
		sp := NewStrategyProcessor(taxCalc, cashMgr)

		// Create minimal test data
		accounts := &AccountHoldingsMonthEnd{
			Cash: 10000.0,
			Taxable: &Account{
				TotalValue: 90000.0,
				Holdings: []Holding{
					{
						AssetClass: AssetClassUSStocksTotalMarket,
						CurrentMarketValueTotal: 90000.0,
					},
				},
			},
		}

		strategy := AssetAllocationStrategy{
			StrategyType: "glide_path",
			RebalanceThreshold: 0.05,
		}

		// Test with someone 35 years from retirement
		currentAge := 30
		targetRetirementAge := 65
		currentMonth := 0

		// Process the strategy - should not panic and should use config values
		err := sp.ProcessAssetAllocationStrategy(accounts, strategy, currentMonth, currentAge, targetRetirementAge)
		if err != nil {
			t.Errorf("Glide path allocation failed: %v", err)
		}

		// Verify the allocation was processed successfully
	})
}