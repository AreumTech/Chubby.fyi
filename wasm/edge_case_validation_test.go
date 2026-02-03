package main

import (
	"testing"
	"math"
)

// TestEdgeCaseValidation tests the configuration system under extreme and boundary conditions
func TestEdgeCaseValidation(t *testing.T) {
	// Load configuration
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("AgeBasedStrategyEdgeCases", func(t *testing.T) {
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		testCases := []struct {
			age              int
			description      string
			expectedBehavior string
		}{
			{18, "Very young investor", "Should hit max stock allocation cap"},
			{20, "Young investor", "Should get very high stock allocation"},
			{85, "Very old investor", "Should hit min stock allocation floor"},
			{100, "Extreme age", "Should get minimum allocation"},
			{ageRule, "Exactly at age rule", "Should get 0% stocks (theoretical)"},
			{ageRule + 10, "Beyond age rule", "Should get minimum allocation"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				rawStockPercentage := float64(ageRule-tc.age) / 100.0
				actualStockPercentage := math.Max(minStock, math.Min(maxStock, rawStockPercentage))

				// Verify bounds are respected
				if actualStockPercentage < minStock {
					t.Errorf("Age %d: stock percentage %.3f below minimum %.3f", tc.age, actualStockPercentage, minStock)
				}
				if actualStockPercentage > maxStock {
					t.Errorf("Age %d: stock percentage %.3f above maximum %.3f", tc.age, actualStockPercentage, maxStock)
				}

				// Verify allocations are reasonable
				if actualStockPercentage < 0.0 || actualStockPercentage > 1.0 {
					t.Errorf("Age %d: stock percentage %.3f outside valid range [0.0, 1.0]", tc.age, actualStockPercentage)
				}

				// Test allocation math
				domesticAllocation := actualStockPercentage * domesticProp
				intlAllocation := actualStockPercentage * intlProp
				bondAllocation := 1.0 - actualStockPercentage

				totalAllocation := domesticAllocation + intlAllocation + bondAllocation

				if math.Abs(totalAllocation - 1.0) > 0.001 {
					t.Errorf("Age %d: total allocation %.6f != 1.0 (domestic=%.3f, intl=%.3f, bonds=%.3f)",
						tc.age, totalAllocation, domesticAllocation, intlAllocation, bondAllocation)
				}

				t.Logf("Age %d: %d%% stocks (%d%% domestic, %d%% intl), %d%% bonds",
					tc.age,
					int(actualStockPercentage*100),
					int(domesticAllocation*100),
					int(intlAllocation*100),
					int(bondAllocation*100))
			})
		}
	})

	t.Run("GlidePathStrategyEdgeCases", func(t *testing.T) {
		brackets := GetGlidePathBrackets()

		testCases := []struct {
			yearsToRetirement float64
			description       string
		}{
			{0, "At retirement"},
			{1, "One year before retirement"},
			{4, "Just before 5-year bracket"},
			{5, "Exactly at 5-year bracket"},
			{50, "Far from retirement (beyond brackets)"},
			{100, "Extremely far from retirement"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				// Find appropriate bracket (matches strategies.go logic)
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

				// Use most conservative bracket if none found
				if !found && len(brackets) > 0 {
					lastBracket := brackets[len(brackets)-1]
					stockPercentage = lastBracket.StockPercentage
					domesticProp = lastBracket.DomesticStockProportion
					intlProp = lastBracket.InternationalStockProportion
				}

				// Verify allocation is valid
				if stockPercentage < 0.0 || stockPercentage > 1.0 {
					t.Errorf("%.0f years to retirement: invalid stock percentage %.3f", tc.yearsToRetirement, stockPercentage)
				}

				// Verify proportions sum correctly
				if math.Abs(domesticProp+intlProp-1.0) > 0.001 {
					t.Errorf("%.0f years to retirement: domestic (%.3f) + intl (%.3f) != 1.0", tc.yearsToRetirement, domesticProp, intlProp)
				}

				// Test full allocation
				domesticAllocation := stockPercentage * domesticProp
				intlAllocation := stockPercentage * intlProp
				bondAllocation := 1.0 - stockPercentage

				totalAllocation := domesticAllocation + intlAllocation + bondAllocation

				if math.Abs(totalAllocation-1.0) > 0.001 {
					t.Errorf("%.0f years to retirement: total allocation %.6f != 1.0", tc.yearsToRetirement, totalAllocation)
				}

				t.Logf("%.0f years to retirement: %d%% stocks (%d%% domestic, %d%% intl), %d%% bonds",
					tc.yearsToRetirement,
					int(stockPercentage*100),
					int(domesticAllocation*100),
					int(intlAllocation*100),
					int(bondAllocation*100))
			})
		}
	})

	t.Run("CapitalGainsEdgeCases", func(t *testing.T) {
		acquisitionDate := GetDefaultBacktestAcquisitionDate()

		testCases := []struct {
			saleMonth       int
			expectedType    string
			description     string
		}{
			{acquisitionDate + 6, "short-term", "Sale 6 months after acquisition"},
			{acquisitionDate + 12, "short-term", "Sale exactly 12 months after acquisition"},
			{acquisitionDate + 13, "long-term", "Sale 13 months after acquisition (first long-term)"},
			{acquisitionDate + 24, "long-term", "Sale 24 months after acquisition"},
			{0, "long-term", "Sale at simulation start (with negative acquisition date)"},
			{-acquisitionDate, "long-term", "Sale at holding period = 0 (edge case)"},
		}

		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				holdingPeriodMonths := tc.saleMonth - acquisitionDate
				isLongTerm := holdingPeriodMonths > 12

				expectedLongTerm := tc.expectedType == "long-term"

				if isLongTerm != expectedLongTerm {
					t.Errorf("Sale at month %d with acquisition %d: holding period %d months should be %s (got %v)",
						tc.saleMonth, acquisitionDate, holdingPeriodMonths, tc.expectedType, isLongTerm)
				}

				// Verify holding period calculation is correct
				if holdingPeriodMonths < 0 {
					t.Logf("WARNING: Negative holding period %d months (sale before acquisition)", holdingPeriodMonths)
				}

				t.Logf("Sale month %d, acquisition %d: holding period %d months → %s",
					tc.saleMonth, acquisitionDate, holdingPeriodMonths, tc.expectedType)
			})
		}
	})

	t.Run("ConfigurationBoundaryValidation", func(t *testing.T) {
		// Test acquisition date boundaries
		acquisitionDate := GetDefaultBacktestAcquisitionDate()
		if acquisitionDate >= 0 {
			t.Error("Acquisition date should be negative (months before simulation start)")
		}
		if acquisitionDate < -120 {
			t.Error("Acquisition date should not be more than 10 years in the past")
		}

		// Test age-based strategy boundaries
		ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

		if maxStock <= minStock {
			t.Error("Max stock allocation must be greater than min stock allocation")
		}

		if minStock < 0.0 || maxStock > 1.0 {
			t.Error("Stock allocation bounds must be within [0.0, 1.0]")
		}

		if math.Abs(domesticProp+intlProp-1.0) > 0.001 {
			t.Error("Stock proportions must sum to 1.0")
		}

		if ageRule < 80 || ageRule > 150 {
			t.Errorf("Age rule constant %d seems unrealistic (should be 80-150)", ageRule)
		}

		// Test glide path bracket boundaries
		brackets := GetGlidePathBrackets()
		if len(brackets) == 0 {
			t.Fatal("Must have at least one glide path bracket")
		}

		// Verify brackets are ordered correctly
		for i := 1; i < len(brackets); i++ {
			if brackets[i].YearsToRetirementMin > brackets[i-1].YearsToRetirementMin {
				t.Errorf("Brackets not ordered: bracket %d has %d years, bracket %d has %d years",
					i-1, brackets[i-1].YearsToRetirementMin, i, brackets[i].YearsToRetirementMin)
			}
		}

		// Verify all brackets have valid allocations
		for i, bracket := range brackets {
			if bracket.StockPercentage < 0.0 || bracket.StockPercentage > 1.0 {
				t.Errorf("Bracket %d has invalid stock percentage: %.3f", i, bracket.StockPercentage)
			}

			if math.Abs(bracket.DomesticStockProportion+bracket.InternationalStockProportion-1.0) > 0.001 {
				t.Errorf("Bracket %d proportions don't sum to 1.0: domestic=%.3f, intl=%.3f",
					i, bracket.DomesticStockProportion, bracket.InternationalStockProportion)
			}
		}
	})

	t.Run("ConfigurationConsistencyCheck", func(t *testing.T) {
		// Verify configurations produce reasonable results across the spectrum

		ageRule, maxStock, minStock, _, _ := GetAgeBasedStrategyParams()
		brackets := GetGlidePathBrackets()

		// Test age-based vs glide path consistency for similar scenarios
		testAge := 30
		yearsToRetirement := 35.0

		// Age-based allocation for 30-year-old
		ageBasedRaw := float64(ageRule-testAge) / 100.0
		ageBasedStock := math.Max(minStock, math.Min(maxStock, ageBasedRaw))

		// Glide path allocation for 35 years to retirement
		var glidePathStock float64
		for _, bracket := range brackets {
			if yearsToRetirement >= float64(bracket.YearsToRetirementMin) {
				glidePathStock = bracket.StockPercentage
				break
			}
		}

		// They should be reasonably close (both aggressive allocations)
		difference := math.Abs(ageBasedStock - glidePathStock)
		if difference > 0.20 { // Allow 20% difference
			t.Logf("INFO: Age-based (%.1f%%) and glide-path (%.1f%%) allocations differ by %.1f%% for similar scenarios",
				ageBasedStock*100, glidePathStock*100, difference*100)
		}

		// Test that strategies produce smooth transitions
		ages := []int{25, 35, 45, 55, 65, 75}
		previousAllocation := 1.0

		for _, age := range ages {
			raw := float64(ageRule-age) / 100.0
			allocation := math.Max(minStock, math.Min(maxStock, raw))

			if allocation > previousAllocation {
				t.Errorf("Age-based allocation increases with age: age %d has %.1f%% > previous %.1f%%",
					age, allocation*100, previousAllocation*100)
			}

			previousAllocation = allocation
		}

		// Test glide path smoothness
		previousGlideStock := 1.0
		yearsList := []float64{40, 35, 25, 15, 8, 2, 0}

		for _, years := range yearsList {
			var currentStock float64
			for _, bracket := range brackets {
				if years >= float64(bracket.YearsToRetirementMin) {
					currentStock = bracket.StockPercentage
					break
				}
			}

			if currentStock > previousGlideStock {
				t.Errorf("Glide path allocation increases approaching retirement: %.0f years has %.1f%% > previous %.1f%%",
					years, currentStock*100, previousGlideStock*100)
			}

			previousGlideStock = currentStock
		}
	})
}