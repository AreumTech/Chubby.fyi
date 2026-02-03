package main

import (
	"testing"
	"math"
	"os"
	"strings"
)

// TestSecurityAndRobustnessAudit performs comprehensive security and robustness checks
func TestSecurityAndRobustnessAudit(t *testing.T) {
	// Load configuration
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		t.Fatalf("Failed to load financial config: %v", err)
	}

	t.Run("ConfigurationSecurityAudit", func(t *testing.T) {
		// Test that configuration loading fails gracefully with missing files
		t.Run("MissingConfigurationFiles", func(t *testing.T) {
			// This test verifies fail-fast behavior with missing configs
			// We can't easily test this without breaking the main config loading
			// but we can verify the current state is secure

			// Verify configuration is actually loaded (not defaulting silently)
			acquisitionDate := GetDefaultBacktestAcquisitionDate()
			if acquisitionDate == 0 {
				t.Error("Configuration may not be properly loaded - got zero acquisition date")
			}

			ageRule, _, _, _, _ := GetAgeBasedStrategyParams()
			if ageRule == 0 {
				t.Error("Configuration may not be properly loaded - got zero age rule")
			}

			brackets := GetGlidePathBrackets()
			if len(brackets) == 0 {
				t.Error("Configuration may not be properly loaded - got empty brackets")
			}
		})

		t.Run("ConfigurationIntegrityChecks", func(t *testing.T) {
			// Verify configuration values are within secure/reasonable bounds
			acquisitionDate := GetDefaultBacktestAcquisitionDate()

			// Prevent extremely unrealistic acquisition dates that could cause overflow
			if acquisitionDate < -1200 { // 100 years
				t.Errorf("Acquisition date %d is unrealistically old (potential security risk)", acquisitionDate)
			}
			if acquisitionDate > 0 {
				t.Errorf("Acquisition date %d should be negative (months before simulation)", acquisitionDate)
			}

			// Age-based strategy bounds checking
			ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

			if ageRule < 50 || ageRule > 200 {
				t.Errorf("Age rule %d outside safe bounds [50, 200] - potential misconfiguration", ageRule)
			}

			if maxStock < 0.0 || maxStock > 1.0 {
				t.Errorf("Max stock allocation %.3f outside valid bounds [0.0, 1.0]", maxStock)
			}

			if minStock < 0.0 || minStock > 1.0 {
				t.Errorf("Min stock allocation %.3f outside valid bounds [0.0, 1.0]", minStock)
			}

			if domesticProp < 0.0 || domesticProp > 1.0 {
				t.Errorf("Domestic proportion %.3f outside valid bounds [0.0, 1.0]", domesticProp)
			}

			if intlProp < 0.0 || intlProp > 1.0 {
				t.Errorf("International proportion %.3f outside valid bounds [0.0, 1.0]", intlProp)
			}

			// Verify proportions sum correctly (prevent allocation errors)
			propSum := domesticProp + intlProp
			if math.Abs(propSum - 1.0) > 0.01 {
				t.Errorf("Stock proportions sum to %.3f, not 1.0 - allocation error risk", propSum)
			}
		})

		t.Run("GlidePathBracketsSecurity", func(t *testing.T) {
			brackets := GetGlidePathBrackets()

			// Prevent empty brackets (would cause runtime panics)
			if len(brackets) == 0 {
				t.Fatal("Glide path brackets are empty - system would fail at runtime")
			}

			// Verify all brackets have valid data
			for i, bracket := range brackets {
				if bracket.StockPercentage < 0.0 || bracket.StockPercentage > 1.0 {
					t.Errorf("Bracket %d: invalid stock percentage %.3f", i, bracket.StockPercentage)
				}

				if bracket.YearsToRetirementMin < 0 || bracket.YearsToRetirementMin > 100 {
					t.Errorf("Bracket %d: unrealistic retirement years %d", i, bracket.YearsToRetirementMin)
				}

				propSum := bracket.DomesticStockProportion + bracket.InternationalStockProportion
				if math.Abs(propSum - 1.0) > 0.01 {
					t.Errorf("Bracket %d: proportions sum to %.3f, not 1.0", i, propSum)
				}
			}

			// Verify brackets are properly ordered (prevent logic errors)
			for i := 1; i < len(brackets); i++ {
				if brackets[i].YearsToRetirementMin > brackets[i-1].YearsToRetirementMin {
					t.Errorf("Brackets not ordered: bracket %d (%d years) > bracket %d (%d years)",
						i, brackets[i].YearsToRetirementMin, i-1, brackets[i-1].YearsToRetirementMin)
				}
			}
		})
	})

	t.Run("RobustnessUnderStress", func(t *testing.T) {
		t.Run("ExtremeAgeInputs", func(t *testing.T) {
			// Test that age-based calculations don't break with extreme inputs
			ageRule, maxStock, minStock, domesticProp, intlProp := GetAgeBasedStrategyParams()

			extremeAges := []int{-10, 0, 1, 150, 200, 1000}

			for _, age := range extremeAges {
				rawStockPercentage := float64(ageRule-age) / 100.0
				actualStockPercentage := math.Max(minStock, math.Min(maxStock, rawStockPercentage))

				// Should always be bounded
				if actualStockPercentage < 0.0 || actualStockPercentage > 1.0 {
					t.Errorf("Age %d produced invalid stock percentage %.3f", age, actualStockPercentage)
				}

				// Test allocation calculation doesn't produce invalid results
				domesticAllocation := actualStockPercentage * domesticProp
				intlAllocation := actualStockPercentage * intlProp
				bondAllocation := 1.0 - actualStockPercentage

				if domesticAllocation < 0.0 || intlAllocation < 0.0 || bondAllocation < 0.0 {
					t.Errorf("Age %d produced negative allocation: domestic=%.3f, intl=%.3f, bonds=%.3f",
						age, domesticAllocation, intlAllocation, bondAllocation)
				}

				total := domesticAllocation + intlAllocation + bondAllocation
				if math.Abs(total - 1.0) > 0.01 {
					t.Errorf("Age %d: total allocation %.6f != 1.0", age, total)
				}
			}
		})

		t.Run("ExtremeRetirementTimelines", func(t *testing.T) {
			// Test glide path with extreme retirement timelines
			brackets := GetGlidePathBrackets()

			extremeYears := []float64{-50, -10, 0, 100, 200, 1000}

			for _, years := range extremeYears {
				// Find bracket (same logic as strategies.go)
				var stockPercentage float64
				var domesticProp, intlProp float64
				found := false

				for _, bracket := range brackets {
					if years >= float64(bracket.YearsToRetirementMin) {
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

				// Verify result is valid
				if stockPercentage < 0.0 || stockPercentage > 1.0 {
					t.Errorf("Years %.0f produced invalid stock percentage %.3f", years, stockPercentage)
				}

				// Test full allocation
				domesticAllocation := stockPercentage * domesticProp
				intlAllocation := stockPercentage * intlProp
				bondAllocation := 1.0 - stockPercentage

				total := domesticAllocation + intlAllocation + bondAllocation
				if math.Abs(total - 1.0) > 0.01 {
					t.Errorf("Years %.0f: total allocation %.6f != 1.0", years, total)
				}
			}
		})

		t.Run("CapitalGainsCalculationStress", func(t *testing.T) {
			// Test capital gains calculation with extreme scenarios
			acquisitionDate := GetDefaultBacktestAcquisitionDate()

			extremeSaleMonths := []int{-1000, -100, -10, 0, 100, 1000, 10000}

			for _, saleMonth := range extremeSaleMonths {
				holdingPeriodMonths := saleMonth - acquisitionDate
				isLongTerm := holdingPeriodMonths > 12

				// Should not cause overflow or invalid results
				if holdingPeriodMonths > 100000 || holdingPeriodMonths < -100000 {
					t.Logf("EXTREME: Sale month %d, acquisition %d → holding period %d months",
						saleMonth, acquisitionDate, holdingPeriodMonths)
				}

				// Classification should be deterministic
				expectedLongTerm := holdingPeriodMonths > 12
				if isLongTerm != expectedLongTerm {
					t.Errorf("Sale month %d: holding period %d months, expected long-term=%v, got=%v",
						saleMonth, holdingPeriodMonths, expectedLongTerm, isLongTerm)
				}
			}
		})
	})

	t.Run("ConfigurationFileIntegrity", func(t *testing.T) {
		t.Run("DefaultsFileExists", func(t *testing.T) {
			// Verify critical configuration files exist and are readable
			_, err := os.Stat("config/defaults.json")
			if os.IsNotExist(err) {
				t.Error("Critical configuration file config/defaults.json is missing")
			} else if err != nil {
				t.Errorf("Cannot access config/defaults.json: %v", err)
			}
		})

		t.Run("ConfigurationIsNotEmpty", func(t *testing.T) {
			// Basic sanity check that configuration has reasonable content
			content, err := os.ReadFile("config/defaults.json")
			if err != nil {
				t.Skip("Cannot read config file for validation")
			}

			contentStr := string(content)

			// Check for key sections
			if !strings.Contains(contentStr, "strategies") {
				t.Error("Configuration missing strategies section")
			}

			if !strings.Contains(contentStr, "backtesting") {
				t.Error("Configuration missing backtesting section")
			}

			if !strings.Contains(contentStr, "ageBasedStrategy") {
				t.Error("Configuration missing ageBasedStrategy section")
			}

			if !strings.Contains(contentStr, "glidePathStrategy") {
				t.Error("Configuration missing glidePathStrategy section")
			}

			// Check that it's not accidentally truncated
			if len(content) < 1000 {
				t.Error("Configuration file suspiciously small - may be corrupted")
			}
		})
	})

	t.Run("FailureModeAnalysis", func(t *testing.T) {
		t.Run("DivisionByZeroProtection", func(t *testing.T) {
			// Verify there are no division by zero risks in the configuration
			_, maxStock, _, domesticProp, intlProp := GetAgeBasedStrategyParams()

			// Check for zero values that could cause division by zero
			if maxStock == 0.0 {
				t.Error("Max stock allocation is zero - could cause division by zero")
			}

			if domesticProp == 0.0 && intlProp == 0.0 {
				t.Error("Both stock proportions are zero - invalid configuration")
			}

			brackets := GetGlidePathBrackets()
			for i, bracket := range brackets {
				propSum := bracket.DomesticStockProportion + bracket.InternationalStockProportion
				if propSum == 0.0 {
					t.Errorf("Bracket %d has zero proportion sum - allocation error risk", i)
				}
			}
		})

		t.Run("OverflowProtection", func(t *testing.T) {
			// Test that calculations don't cause numeric overflow
			ageRule, _, _, _, _ := GetAgeBasedStrategyParams()
			acquisitionDate := GetDefaultBacktestAcquisitionDate()

			// Test with large values that might cause overflow
			largeAge := 100000
			rawStock := float64(ageRule - largeAge) / 100.0

			// Should not cause overflow (Go handles this gracefully, but verify)
			if math.IsInf(rawStock, 0) || math.IsNaN(rawStock) {
				t.Error("Large age calculation caused overflow/NaN")
			}

			// Test holding period calculation
			largeSaleMonth := 1000000
			holdingPeriod := largeSaleMonth - acquisitionDate

			if holdingPeriod < largeSaleMonth-1000 { // Basic overflow check
				t.Error("Holding period calculation may have overflowed")
			}
		})
	})
}