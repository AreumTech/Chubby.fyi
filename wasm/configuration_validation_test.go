package main

import (
	"testing"
	"math"
)

// TestConfigurationValidation focuses on validating the specific configuration changes
func TestConfigurationValidation(t *testing.T) {
	// Load configuration for tests
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("AgeBasedStrategyCalculations", func(t *testing.T) {
		// Test age-based strategy calculations with various ages
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		testCases := []struct {
			age                     int
			expectedStockPercentage float64
			description             string
		}{
			{25, 0.85, "25-year-old should get 85% stocks (110-25=85)"},
			{40, 0.70, "40-year-old should get 70% stocks (110-40=70)"},
			{55, 0.55, "55-year-old should get 55% stocks (110-55=55)"},
			{70, 0.40, "70-year-old should get 40% stocks (110-70=40, clamped to max 0.90)"},
			{90, 0.20, "90-year-old should get minimum 20% stocks (clamped to minStock)"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				rawStockPercentage := float64(ageRule-tc.age) / 100.0
				actualStockPercentage := math.Max(minStock, math.Min(maxStock, rawStockPercentage))

				if math.Abs(actualStockPercentage-tc.expectedStockPercentage) > 0.01 {
					t.Errorf("Expected %.2f stock allocation, got %.2f", tc.expectedStockPercentage, actualStockPercentage)
				}

				// Verify domestic + international proportions add up correctly
				domesticAllocation := actualStockPercentage * domesticProp
				intlAllocation := actualStockPercentage * intlProp
				totalStockAllocation := domesticAllocation + intlAllocation

				if math.Abs(totalStockAllocation-actualStockPercentage) > 0.001 {
					t.Errorf("Stock proportion breakdown incorrect: %.3f domestic + %.3f intl != %.3f total",
						domesticAllocation, intlAllocation, actualStockPercentage)
				}
			})
		}
	})

	t.Run("GlidePathStrategyCalculations", func(t *testing.T) {
		brackets := GetGlidePathBrackets()

		testCases := []struct {
			yearsToRetirement       float64
			expectedStockPercentage float64
			description             string
		}{
			{35, 0.90, "35 years to retirement should use aggressive allocation"},
			{25, 0.80, "25 years to retirement should use moderate-aggressive allocation"},
			{15, 0.65, "15 years to retirement should use moderate allocation"},
			{8, 0.50, "8 years to retirement should use conservative allocation"},
			{2, 0.30, "2 years to retirement should use very conservative allocation"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				// Find appropriate bracket (matches logic in strategies.go)
				var stockPercentage float64
				var domesticProp, intlProp float64
				found := false

				for _, bracket := range brackets {
					if tc.yearsToRetirement >= float64(bracket.YearsToRetirementMin) {
						stockPercentage = bracket.StockPercentage
						domesticProp = bracket.DomesticStockProportion
						intlProp = bracket.InternationalStockProportion
						found = true
						break
					}
				}

				if !found && len(brackets) > 0 {
					lastBracket := brackets[len(brackets)-1]
					stockPercentage = lastBracket.StockPercentage
					domesticProp = lastBracket.DomesticStockProportion
					intlProp = lastBracket.InternationalStockProportion
				}

				if math.Abs(stockPercentage-tc.expectedStockPercentage) > 0.01 {
					t.Errorf("Expected %.2f stock allocation, got %.2f", tc.expectedStockPercentage, stockPercentage)
				}

				// Verify proportions are valid
				if math.Abs(domesticProp+intlProp-1.0) > 0.001 {
					t.Errorf("Domestic (%.3f) + International (%.3f) proportions should sum to 1.0", domesticProp, intlProp)
				}
			})
		}
	})

	t.Run("BacktestAcquisitionDateMathematical", func(t *testing.T) {
		// Test that the new configurable acquisition date produces correct capital gains calculations
		acquisitionDate := GetDefaultBacktestAcquisitionDate()

		// Test various sale dates to verify long vs short-term treatment
		testCases := []struct {
			saleMonth     int
			expectedType  string
			description   string
		}{
			{6, "long-term", "Sale at 6 months with -18 acquisition = 24 months (long-term)"},
			{3, "long-term", "Sale at 3 months with -18 acquisition = 21 months (long-term)"},
			{0, "long-term", "Sale at start with -18 acquisition = 18 months (long-term)"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				holdingPeriodMonths := tc.saleMonth - acquisitionDate
				isLongTerm := holdingPeriodMonths > 12

				expectedLongTerm := tc.expectedType == "long-term"
				if isLongTerm != expectedLongTerm {
					t.Errorf("Sale at month %d with acquisition date %d: holding period %d months should be %s",
						tc.saleMonth, acquisitionDate, holdingPeriodMonths, tc.expectedType)
				}

				// Verify this is different from old hardcoded behavior
				oldHardcodedPeriod := tc.saleMonth - (-12)
				if holdingPeriodMonths == oldHardcodedPeriod {
					t.Errorf("New configurable date should produce different holding periods than hardcoded -12")
				}
			})
		}
	})

	t.Run("ConfigurationValuesBounds", func(t *testing.T) {
		// Validate all configuration values are within reasonable bounds

		// Acquisition date
		acquisitionDate := GetDefaultBacktestAcquisitionDate()
		if acquisitionDate > -6 || acquisitionDate < -60 {
			t.Errorf("Acquisition date %d seems unreasonable (should be between -60 and -6)", acquisitionDate)
		}

		// Age-based strategy
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		if ageRule < 90 || ageRule > 130 {
			t.Errorf("Age rule %d outside reasonable range (90-130)", ageRule)
		}

		if maxStock < 0.5 || maxStock > 1.0 {
			t.Errorf("Max stock allocation %.3f outside reasonable range (0.5-1.0)", maxStock)
		}

		if minStock < 0.0 || minStock > 0.5 {
			t.Errorf("Min stock allocation %.3f outside reasonable range (0.0-0.5)", minStock)
		}

		if domesticProp < 0.3 || domesticProp > 0.8 {
			t.Errorf("Domestic stock proportion %.3f outside reasonable range (0.3-0.8)", domesticProp)
		}

		if intlProp < 0.2 || intlProp > 0.7 {
			t.Errorf("International stock proportion %.3f outside reasonable range (0.2-0.7)", intlProp)
		}

		// Glide path brackets
		brackets := GetGlidePathBrackets()

		for i, bracket := range brackets {
			if bracket.StockPercentage < 0.1 || bracket.StockPercentage > 1.0 {
				t.Errorf("Bracket %d stock percentage %.3f outside reasonable range (0.1-1.0)", i, bracket.StockPercentage)
			}

			if bracket.YearsToRetirementMin < 0 || bracket.YearsToRetirementMin > 50 {
				t.Errorf("Bracket %d years to retirement %d outside reasonable range (0-50)", i, bracket.YearsToRetirementMin)
			}
		}
	})

	t.Run("ConfigurationConsistencyCheck", func(t *testing.T) {
		// Check that configuration values are internally consistent

		// Age-based strategy consistency
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		if maxStock <= minStock {
			t.Error("Max stock allocation must be greater than min stock allocation")
		}

		if math.Abs(domesticProp+intlProp-1.0) > 0.001 {
			t.Error("Domestic and international stock proportions must sum to 1.0")
		}

		// Test edge cases for age-based calculations
		youngestAge := 20
		oldestAge := 100

		youngestStock := math.Max(minStock, math.Min(maxStock, float64(ageRule-youngestAge)/100.0))
		oldestStock := math.Max(minStock, math.Min(maxStock, float64(ageRule-oldestAge)/100.0))

		if youngestStock <= oldestStock {
			t.Error("Younger investors should have higher stock allocations than older investors")
		}

		// Glide path consistency
		brackets := GetGlidePathBrackets()

		if len(brackets) == 0 {
			t.Fatal("Must have at least one glide path bracket")
		}

		// Check brackets are ordered correctly
		for i := 1; i < len(brackets); i++ {
			if brackets[i].YearsToRetirementMin > brackets[i-1].YearsToRetirementMin {
				t.Error("Glide path brackets must be ordered by descending years to retirement")
			}
		}

		// Check that we have a retirement bracket (0 years)
		hasRetirementBracket := false
		for _, bracket := range brackets {
			if bracket.YearsToRetirementMin == 0 {
				hasRetirementBracket = true
				break
			}
		}

		if !hasRetirementBracket {
			t.Error("Must have a bracket for retirement (0 years to retirement)")
		}
	})
}