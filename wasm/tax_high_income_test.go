package main

import (
	"math"
	"testing"
)

// TestHighIncomeTaxCalculation validates tax calculations for high-income scenarios
// Ensures December monthly snapshots contain all annual tax fields with realistic values
func TestHighIncomeTaxCalculation(t *testing.T) {
	// Load configuration files for tax calculations
	err := LoadFinancialConfigFromFiles("./config")
	if err != nil {
		t.Fatalf("Failed to load financial configuration: %v", err)
	}

	t.Run("HighIncomeSingleFiler", func(t *testing.T) {
		// Setup: $700k salary, single filer, 12 months
		config := GetDefaultStochasticConfig()
		engine := NewSimulationEngine(config)

		// Create initial state with high income
		initialAccounts := AccountHoldingsMonthEnd{
			Cash:        50000.0,
			Taxable:     &Account{TotalValue: 100000.0, Holdings: []Holding{}},
			TaxDeferred: &Account{TotalValue: 200000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 50000.0, Holdings: []Holding{}},
		}

		// High income event: $700k salary
		salaryEvent := FinancialEvent{
			ID:          "high-salary",
			Type:        "INCOME",
			Description: "High tech salary",
			MonthOffset: 0,
			Amount:      700000.0 / 12, // Monthly salary
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"source":          "Employment",
				"incomeType":      "employment",
				"isNet":           false,
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   12,
			},
		}

		// Basic expense to make simulation realistic
		expenseEvent := FinancialEvent{
			ID:          "expenses",
			Type:        "EXPENSE",
			Description: "Living expenses",
			MonthOffset: 0,
			Amount:      8000.0, // $8k/month expenses
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   12,
			},
		}

		// Create simulation input
		input := SimulationInput{
			InitialAccounts:    initialAccounts,
			Events:             []FinancialEvent{salaryEvent, expenseEvent},
			Config:             config,
			MonthsToRun:        12,
			InitialAge:         35,
			StartYear:          2024,
			WithdrawalStrategy: "TAX_EFFICIENT",
			Goals:              []Goal{},
			TaxConfig:          &SimpleTaxConfig{Enabled: true, EffectiveRate: 0.22, CapitalGainsRate: 0.15},
		}

		// Run single simulation
		result := engine.RunSingleSimulation(input)

		// Assertions
		if !result.Success {
			t.Fatalf("Simulation failed: %s", result.Error)
		}

		if len(result.MonthlyData) < 12 {
			t.Fatalf("Expected at least 12 months of data, got %d", len(result.MonthlyData))
		}

		// Get December data (month 11)
		decemberData := result.MonthlyData[11]

		// Test 1: Tax fields must be present (not nil)
		if decemberData.TaxPaidAnnual == nil {
			t.Error("❌ TaxPaidAnnual is nil in December snapshot")
		}
		if decemberData.FederalIncomeTaxAnnual == nil {
			t.Error("❌ FederalIncomeTaxAnnual is nil in December snapshot")
		}
		if decemberData.StateIncomeTaxAnnual == nil {
			t.Error("❌ StateIncomeTaxAnnual is nil in December snapshot")
		}
		if decemberData.TotalFICATaxAnnual == nil {
			t.Error("❌ TotalFICATaxAnnual is nil in December snapshot")
		}
		if decemberData.EffectiveTaxRateAnnual == nil {
			t.Error("❌ EffectiveTaxRateAnnual is nil in December snapshot")
		}
		if decemberData.MarginalTaxRateAnnual == nil {
			t.Error("❌ MarginalTaxRateAnnual is nil in December snapshot")
		}

		// Test 2: Tax amounts must be realistic (> 0 for high income)
		totalTax := 0.0
		if decemberData.TaxPaidAnnual != nil {
			totalTax = *decemberData.TaxPaidAnnual
		}

		if totalTax <= 0 {
			t.Error("❌ Total tax is zero or negative for $700k income")
		}

		// Test 3: Federal tax must be substantial (rough estimate: > $150k for $700k income)
		federalTax := 0.0
		if decemberData.FederalIncomeTaxAnnual != nil {
			federalTax = *decemberData.FederalIncomeTaxAnnual
		}

		if federalTax < 150000.0 {
			t.Errorf("❌ Federal tax too low: expected > $150k, got $%.2f", federalTax)
		}

		// Test 4: FICA tax must be present (capped at ~$10k for Social Security portion)
		ficaTax := 0.0
		if decemberData.TotalFICATaxAnnual != nil {
			ficaTax = *decemberData.TotalFICATaxAnnual
		}

		if ficaTax <= 0 {
			t.Error("❌ FICA tax is zero or negative")
		}

		// FICA should be reasonable (SS cap + Medicare)
		if ficaTax > 60000.0 {
			t.Errorf("⚠️  FICA tax unexpectedly high: $%.2f", ficaTax)
		}

		// Test 5: Effective tax rate must be reasonable (0.2 to 0.4 for high income)
		effectiveRate := 0.0
		if decemberData.EffectiveTaxRateAnnual != nil {
			effectiveRate = *decemberData.EffectiveTaxRateAnnual
		}

		if effectiveRate < 0.20 || effectiveRate > 0.45 {
			t.Errorf("⚠️  Effective tax rate outside expected range (0.20-0.45): %.2f%%", effectiveRate*100)
		}

		// Test 6: Marginal rate must be at top bracket (37% federal for $700k)
		marginalRate := 0.0
		if decemberData.MarginalTaxRateAnnual != nil {
			marginalRate = *decemberData.MarginalTaxRateAnnual
		}

		if marginalRate < 0.35 {
			t.Errorf("⚠️  Marginal tax rate too low for high income: %.2f%%", marginalRate*100)
		}

		// Test 7: Total tax components should sum correctly (within rounding)
		stateTax := 0.0
		if decemberData.StateIncomeTaxAnnual != nil {
			stateTax = *decemberData.StateIncomeTaxAnnual
		}

		componentSum := federalTax + stateTax + ficaTax
		if math.Abs(componentSum-totalTax) > 100.0 { // Allow $100 rounding tolerance
			t.Errorf("⚠️  Tax components don't sum to total: Federal=$%.2f + State=$%.2f + FICA=$%.2f = $%.2f, but TaxPaidAnnual=$%.2f",
				federalTax, stateTax, ficaTax, componentSum, totalTax)
		}

		// Success logging
		t.Logf("✅ High income tax calculation correct:")
		t.Logf("   Income: $700,000")
		t.Logf("   Total Tax: $%.2f (%.1f%% effective)", totalTax, effectiveRate*100)
		t.Logf("   Federal: $%.2f", federalTax)
		t.Logf("   State: $%.2f", stateTax)
		t.Logf("   FICA: $%.2f", ficaTax)
		t.Logf("   Marginal Rate: %.1f%%", marginalRate*100)
		t.Logf("   All December annual tax fields populated ✓")
	})

	t.Run("MultipleYearsTaxConsistency", func(t *testing.T) {
		// Test that December snapshots for multiple years all have tax data
		config := GetDefaultStochasticConfig()
		engine := NewSimulationEngine(config)

		initialAccounts := AccountHoldingsMonthEnd{
			Cash:        30000.0,
			Taxable:     &Account{TotalValue: 50000.0, Holdings: []Holding{}},
			TaxDeferred: &Account{TotalValue: 100000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 25000.0, Holdings: []Holding{}},
		}

		// Moderate income
		incomeEvent := FinancialEvent{
			ID:          "salary",
			Type:        "INCOME",
			Description: "Annual salary",
			MonthOffset: 0,
			Amount:      200000.0 / 12,
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"source":          "Employment",
				"incomeType":      "employment",
				"isNet":           false,
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   35,
			},
		}

		expenseEvent := FinancialEvent{
			ID:          "expenses",
			Type:        "EXPENSE",
			Description: "Living expenses",
			MonthOffset: 0,
			Amount:      5000.0,
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   35,
			},
		}

		input := SimulationInput{
			InitialAccounts:    initialAccounts,
			Events:             []FinancialEvent{incomeEvent, expenseEvent},
			Config:             config,
			MonthsToRun:        36, // 3 years
			InitialAge:         35,
			StartYear:          2024,
			WithdrawalStrategy: "TAX_EFFICIENT",
			Goals:              []Goal{},
			TaxConfig:          &SimpleTaxConfig{Enabled: true, EffectiveRate: 0.22, CapitalGainsRate: 0.15},
		}

		result := engine.RunSingleSimulation(input)

		if !result.Success {
			t.Fatalf("Simulation failed: %s", result.Error)
		}

		// Check December snapshots for years 1, 2, 3
		decemberMonths := []int{11, 23, 35} // Dec 2024, Dec 2025, Dec 2026
		years := []int{2024, 2025, 2026}

		for i, monthIdx := range decemberMonths {
			if monthIdx >= len(result.MonthlyData) {
				continue
			}

			decData := result.MonthlyData[monthIdx]
			year := years[i]

			// Verify all tax fields present
			if decData.TaxPaidAnnual == nil {
				t.Errorf("❌ Year %d: TaxPaidAnnual is nil", year)
			}
			if decData.FederalIncomeTaxAnnual == nil {
				t.Errorf("❌ Year %d: FederalIncomeTaxAnnual is nil", year)
			}
			if decData.TotalFICATaxAnnual == nil {
				t.Errorf("❌ Year %d: TotalFICATaxAnnual is nil", year)
			}

			// Verify tax amounts are positive
			if decData.TaxPaidAnnual != nil && *decData.TaxPaidAnnual > 0 {
				t.Logf("✅ Year %d: Total tax = $%.2f", year, *decData.TaxPaidAnnual)
			} else {
				t.Errorf("❌ Year %d: Tax is zero or negative", year)
			}
		}

		t.Logf("✅ All December snapshots across %d years have complete tax data", len(decemberMonths))
	})
}
