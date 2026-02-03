package main

import (
	"testing"
)

// createTestConfig creates a minimal config for testing
func createTestConfig() StochasticModelConfig {
	// Return empty config - defaults will be applied in NewSimulationEngine
	return StochasticModelConfig{}
}

// TestContributionLimitIntegration verifies contribution limit enforcement
func TestContributionLimitIntegration(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	// Set user age to 35 (no catch-up contributions)
	engine.contributionLimitTracker.SetUserAge(35)
	engine.contributionLimitTracker.ResetForNewYear(2024)

	t.Run("PreTax 401k Limit", func(t *testing.T) {
		// Try to contribute $30k when limit is $23k
		requestedAmount := 30000.0
		maxAllowed := engine.GetContributionLimit("tax_deferred", requestedAmount)

		if maxAllowed != 23000.0 {
			t.Errorf("Expected max allowed $23,000 for tax_deferred, got $%.0f", maxAllowed)
		}

		// Track the contribution
		engine.TrackContribution("tax_deferred", maxAllowed)

		// Try to contribute more - should get 0
		secondAttempt := engine.GetContributionLimit("tax_deferred", 5000.0)
		if secondAttempt != 0 {
			t.Errorf("Expected $0 after hitting limit, got $%.0f", secondAttempt)
		}
	})

	t.Run("Roth IRA Limit", func(t *testing.T) {
		// Reset for new test
		engine.contributionLimitTracker.ResetForNewYear(2025)

		// Try to contribute $10k when limit is $7k
		requestedAmount := 10000.0
		maxAllowed := engine.GetContributionLimit("roth", requestedAmount)

		if maxAllowed != 7000.0 {
			t.Errorf("Expected max allowed $7,000 for Roth IRA, got $%.0f", maxAllowed)
		}

		// Track the contribution
		engine.TrackContribution("roth", maxAllowed)

		// Try to contribute more - should get 0
		secondAttempt := engine.GetContributionLimit("roth", 3000.0)
		if secondAttempt != 0 {
			t.Errorf("Expected $0 after hitting Roth limit, got $%.0f", secondAttempt)
		}
	})

	t.Run("Catch-Up Contributions Age 50+", func(t *testing.T) {
		// Reset and set age to 52
		engine.contributionLimitTracker.ResetForNewYear(2026)
		engine.contributionLimitTracker.SetUserAge(52)

		// 401k limit should be $23k + $7.5k = $30.5k
		requestedAmount := 35000.0
		maxAllowed := engine.GetContributionLimit("tax_deferred", requestedAmount)

		if maxAllowed != 30500.0 {
			t.Errorf("Expected max allowed $30,500 (with catch-up), got $%.0f", maxAllowed)
		}
	})

	t.Run("Partial Contribution Within Limit", func(t *testing.T) {
		// Reset
		engine.contributionLimitTracker.ResetForNewYear(2027)
		engine.contributionLimitTracker.SetUserAge(35)

		// Contribute $10k first
		firstContribution := 10000.0
		engine.TrackContribution("tax_deferred", firstContribution)

		// Try to contribute $20k more - should get $13k (to reach $23k limit)
		requestedAmount := 20000.0
		maxAllowed := engine.GetContributionLimit("tax_deferred", requestedAmount)

		if maxAllowed != 13000.0 {
			t.Errorf("Expected max allowed $13,000 (to reach limit), got $%.0f", maxAllowed)
		}
	})
}

// TestStateTaxIntegration verifies state tax calculation
func TestStateTaxIntegration(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	t.Run("California Progressive Tax", func(t *testing.T) {
		ordinaryIncome := 100000.0
		capitalGains := 0.0
		stateCode := "CA"
		filingStatus := FilingStatusSingle
		numDependents := 0

		stateTax := engine.CalculateStateTaxLiability(
			ordinaryIncome,
			capitalGains,
			stateCode,
			filingStatus,
			numDependents,
		)

		// California has progressive brackets
		// For $100k income, tax should be around $4,500-$5,500
		if stateTax < 4000 || stateTax > 6000 {
			t.Errorf("Expected CA state tax ~$4,500-$5,500 for $100k income, got $%.2f", stateTax)
		}
	})

	t.Run("No Tax States", func(t *testing.T) {
		ordinaryIncome := 100000.0

		noTaxStates := []string{"TX", "FL", "WA", "NV", "SD", "TN", "WY", "AK", "NH"}

		for _, state := range noTaxStates {
			stateTax := engine.CalculateStateTaxLiability(
				ordinaryIncome,
				0.0,
				state,
				FilingStatusSingle,
				0,
			)

			if stateTax != 0 {
				t.Errorf("Expected $0 tax for %s (no income tax state), got $%.2f", state, stateTax)
			}
		}
	})

	t.Run("Flat Tax States", func(t *testing.T) {
		ordinaryIncome := 100000.0

		// Illinois has 4.95% flat tax (may have standard deduction applied first)
		stateTax := engine.CalculateStateTaxLiability(
			ordinaryIncome,
			0.0,
			"IL",
			FilingStatusSingle,
			0,
		)

		// IL applies standard deduction before flat rate, so actual tax will be less than gross amount
		// Just verify it's in a reasonable range (4-5% effective rate)
		minExpected := ordinaryIncome * 0.04
		maxExpected := ordinaryIncome * 0.05

		if stateTax < minExpected || stateTax > maxExpected {
			t.Errorf("Expected IL tax between $%.2f-$%.2f (4-5%%), got $%.2f", minExpected, maxExpected, stateTax)
		}
	})

	t.Run("Washington Capital Gains Tax", func(t *testing.T) {
		ordinaryIncome := 50000.0
		capitalGains := 300000.0 // Above $250k threshold

		stateTax := engine.CalculateStateTaxLiability(
			ordinaryIncome,
			capitalGains,
			"WA",
			FilingStatusSingle,
			0,
		)

		// WA has 7% capital gains tax on gains over $250k
		// So tax = ($300k - $250k) * 0.07 = $3,500
		expectedTax := 3500.0
		tolerance := 100.0

		if stateTax < expectedTax-tolerance || stateTax > expectedTax+tolerance {
			t.Errorf("Expected WA cap gains tax ~$%.2f, got $%.2f", expectedTax, stateTax)
		}
	})
}

// TestEnforcePreTaxContributionLimits tests the actual event handler integration
func TestEnforcePreTaxContributionLimits(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	// Set age and year
	engine.contributionLimitTracker.SetUserAge(35)
	engine.contributionLimitTracker.ResetForNewYear(2024)

	t.Run("Within Limit", func(t *testing.T) {
		contribution := 15000.0
		excess := engine.enforcePreTaxContributionLimits(&contribution, 0)

		if excess != 0 {
			t.Errorf("Expected no excess for $15k contribution, got $%.2f", excess)
		}

		if contribution != 15000.0 {
			t.Errorf("Expected contribution unchanged at $15k, got $%.2f", contribution)
		}
	})

	t.Run("Exceeds Limit", func(t *testing.T) {
		// Reset for new year
		engine.contributionLimitTracker.ResetForNewYear(2025)

		contribution := 30000.0
		maxAllowed := engine.contributionLimitTracker.GetMaxAllowedContribution("tax_deferred", contribution)
		t.Logf("DEBUG: MaxAllowed for $30k contribution: $%.2f", maxAllowed)
		t.Logf("DEBUG: Limit: $%.2f", engine.contributionLimitTracker.GetLimit("tax_deferred"))
		t.Logf("DEBUG: YTD before: $%.2f", engine.contributionLimitTracker.GetYTDContribution("tax_deferred"))

		excess := engine.enforcePreTaxContributionLimits(&contribution, 0)

		t.Logf("DEBUG: Contribution after enforce: $%.2f", contribution)
		t.Logf("DEBUG: Excess: $%.2f", excess)
		t.Logf("DEBUG: YTD after: $%.2f", engine.contributionLimitTracker.GetYTDContribution("tax_deferred"))

		expectedExcess := 7000.0 // $30k - $23k limit
		if excess != expectedExcess {
			t.Errorf("Expected excess of $%.0f, got $%.2f", expectedExcess, excess)
		}

		if contribution != 23000.0 {
			t.Errorf("Expected contribution capped at $23k, got $%.2f", contribution)
		}
	})
}

// TestEnforceRothContributionLimits tests Roth IRA limit enforcement
func TestEnforceRothContributionLimits(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	// Set age and year
	engine.contributionLimitTracker.SetUserAge(35)
	engine.contributionLimitTracker.ResetForNewYear(2024)

	t.Run("Within Limit", func(t *testing.T) {
		contribution := 5000.0
		excess := engine.enforceRothContributionLimits(&contribution, 0)

		if excess != 0 {
			t.Errorf("Expected no excess for $5k contribution, got $%.2f", excess)
		}

		if contribution != 5000.0 {
			t.Errorf("Expected contribution unchanged at $5k, got $%.2f", contribution)
		}
	})

	t.Run("Exceeds Limit", func(t *testing.T) {
		// Reset for new year
		engine.contributionLimitTracker.ResetForNewYear(2025)

		contribution := 10000.0
		excess := engine.enforceRothContributionLimits(&contribution, 0)

		expectedExcess := 3000.0 // $10k - $7k limit
		if excess != expectedExcess {
			t.Errorf("Expected excess of $%.0f, got $%.2f", expectedExcess, excess)
		}

		if contribution != 7000.0 {
			t.Errorf("Expected contribution capped at $7k, got $%.2f", contribution)
		}
	})

	t.Run("Multiple Contributions Same Year", func(t *testing.T) {
		// Reset for new year
		engine.contributionLimitTracker.ResetForNewYear(2026)

		// First contribution: $4k
		firstContribution := 4000.0
		excess1 := engine.enforceRothContributionLimits(&firstContribution, 0)

		if excess1 != 0 || firstContribution != 4000.0 {
			t.Errorf("First contribution should be fully allowed")
		}

		// Second contribution: $5k (should only allow $3k)
		secondContribution := 5000.0
		excess2 := engine.enforceRothContributionLimits(&secondContribution, 6)

		if excess2 != 2000.0 {
			t.Errorf("Expected $2k excess on second contribution, got $%.2f", excess2)
		}

		if secondContribution != 3000.0 {
			t.Errorf("Expected second contribution capped at $3k, got $%.2f", secondContribution)
		}
	})
}

// TestCalculatorAvailability verifies all calculators are initialized
func TestCalculatorAvailability(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	if engine.contributionLimitTracker == nil {
		t.Error("ContributionLimitTracker not initialized")
	}

	if engine.stateTaxCalculator == nil {
		t.Error("StateTaxCalculator not initialized")
	}

	if engine.socialSecurityCalc == nil {
		t.Error("SocialSecurityCalculator not initialized")
	}

	if engine.estateTaxCalculator == nil {
		t.Error("EstateTaxCalculator not initialized")
	}

	if engine.ltcCalculator == nil {
		t.Error("LongTermCareCalculator not initialized")
	}

	if engine.propertyCostEscalator == nil {
		t.Error("PropertyCostEscalator not initialized")
	}

	if engine.goalPrioritizer == nil {
		t.Error("GoalPrioritizer not initialized")
	}

	if engine.taxAwareRebalancer == nil {
		t.Error("TaxAwareRebalancer not initialized")
	}
}

// TestTaxCalculatorIntegration verifies TaxCalculator uses StateTaxCalculator
func TestTaxCalculatorIntegration(t *testing.T) {
	taxConfig := GetDefaultTaxConfigDetailed()
	taxConfig.State = "NY"
	taxConfig.FilingStatus = FilingStatusSingle

	stateTaxCalc := NewStateTaxCalculator()
	taxCalculator := NewTaxCalculator(taxConfig, stateTaxCalc)

	if taxCalculator.stateTaxCalculator == nil {
		t.Error("TaxCalculator should have StateTaxCalculator dependency")
	}

	// Calculate state tax
	taxableIncome := 75000.0
	stateTax := taxCalculator.CalculateStateIncomeTax(taxableIncome)

	// NY has progressive tax, should be non-zero
	if stateTax <= 0 {
		t.Errorf("Expected positive NY state tax for $75k income, got $%.2f", stateTax)
	}

	// Should be less than 10% effective rate
	if stateTax > taxableIncome*0.10 {
		t.Errorf("NY state tax seems too high: $%.2f on $%.2f income", stateTax, taxableIncome)
	}
}

// TestRetirementCalculatorsAvailability verifies all retirement calculators are initialized
func TestRetirementCalculatorsAvailability(t *testing.T) {
	config := createTestConfig()
	engine := NewSimulationEngine(config)

	// Verify retirement calculators (detailed tests in retirement_features_integration_test.go)
	if engine.rmdCalculator == nil {
		t.Error("RMD Calculator not initialized")
	}

	if engine.withdrawalSequencer == nil {
		t.Error("Withdrawal Sequencer not initialized")
	}

	if engine.assetLocationOptimizer == nil {
		t.Error("Asset Location Optimizer not initialized")
	}

	if engine.rothConversionOptimizer == nil {
		t.Error("Roth Conversion Optimizer not initialized")
	}
}
