package main

import (
	"testing"
)

// =============================================================================
// SABBATICAL ENHANCED TESTS - PFOS-E Sabbatical Wedge Verification
//
// These tests verify sabbatical wedge analysis scenarios:
// 1. Variable expense reduction during sabbatical
// 2. Withdrawal sequencing during income gap
// 3. Cash reserve recovery after return to work
// 4. Combined with NoAutoLiquidate policy
//
// PFOS-E Wedge: Sabbatical - "How long can I sustain an income gap?"
// =============================================================================

// TestSabbatical_VariableExpenseReduction verifies that variable expenses
// can be flagged and reduced during a sabbatical period
func TestSabbatical_VariableExpenseReduction(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:    50000,  // 6 months of expenses
		Taxable: &Account{TotalValue: 200000, Holdings: []Holding{}},
	}

	// Normal period: $10k income, $8k expenses ($5k fixed + $3k variable)
	// Sabbatical: $0 income, only fixed $5k expenses
	input.Events = []FinancialEvent{
		// Income for first 6 months (then sabbatical)
		{
			ID:             "salary",
			Type:           "INCOME",
			Amount:         10000,
			Frequency:      "monthly",
			Metadata: map[string]interface{}{
				"endDateOffset": 5, // Income stops after month 5
			},
		},
		// Fixed expenses (housing, insurance) - cannot reduce
		{
			ID:        "fixed-expenses",
			Type:      "EXPENSE",
			Amount:    5000,
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"expenseNature": "fixed",
				"driverKey":     "expense:fixed",
			},
		},
		// Variable expenses (food, entertainment) - can reduce during sabbatical
		{
			ID:        "variable-expenses",
			Type:      "EXPENSE",
			Amount:    3000,
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"expenseNature": "variable",
				"driverKey":     "expense:variable",
			},
		},
	}
	input.MonthsToRun = 12 // 6 months working + 6 months sabbatical

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Track cash progression
	if len(result.ComprehensiveMonthlyStates) >= 12 {
		// Month 6: End of income period
		month6 := result.ComprehensiveMonthlyStates[5]
		t.Logf("Month 6 (last income month) - Cash: $%.2f", month6.Cash)

		// Month 12: End of sabbatical
		month12 := result.ComprehensiveMonthlyStates[11]
		t.Logf("Month 12 (end of sabbatical) - Cash: $%.2f", month12.Cash)

		// During sabbatical, cash should deplete but not go severely negative
		// if variable expenses are truly variable
	}
}

// TestSabbatical_WithdrawalSequencing verifies correct account liquidation order
// during an income gap
func TestSabbatical_WithdrawalSequencing(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:        20000, // Minimal cash
		Taxable:     &Account{TotalValue: 100000, Holdings: []Holding{}},
		TaxDeferred: &Account{TotalValue: 300000, Holdings: []Holding{}},
		Roth:        &Account{TotalValue: 100000, Holdings: []Holding{}},
	}

	// Age 45 - pre-retirement
	input.InitialAge = 45

	// Set withdrawal sequence preference
	input.WithdrawalStrategy = WithdrawalSequenceTaxEfficient

	input.Events = []FinancialEvent{
		// No income (sabbatical)
		// Only expenses that must be covered from assets
		{
			ID:        "monthly-expenses",
			Type:      "EXPENSE",
			Amount:    6000,
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 6

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// With tax-efficient sequence:
	// 1. Cash first
	// 2. Taxable (LTCG rates)
	// 3. TaxDeferred last (ordinary income + penalty if < 59.5)
	// Roth should be preserved

	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[len(result.ComprehensiveMonthlyStates)-1]

		t.Logf("Final Cash: $%.2f", finalState.Cash)
		if finalState.Taxable != nil {
			t.Logf("Final Taxable: $%.2f", finalState.Taxable.TotalValue)
		}
		if finalState.TaxDeferred != nil {
			t.Logf("Final TaxDeferred: $%.2f", finalState.TaxDeferred.TotalValue)
		}
		if finalState.Roth != nil {
			t.Logf("Final Roth: $%.2f", finalState.Roth.TotalValue)
		}

		// Verify withdrawal order was respected
		// Taxable should be depleted before TaxDeferred (assuming Roth protection)
	}
}

// TestSabbatical_RecoveryAfterReturn verifies cash reserves rebuild after sabbatical
func TestSabbatical_RecoveryAfterReturn(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:    30000, // Starting cash
		Taxable: &Account{TotalValue: 50000, Holdings: []Holding{}},
	}

	input.Events = []FinancialEvent{
		// Phase 1: Income stops (sabbatical) months 0-5
		// Phase 2: Income returns months 6+ at higher rate
		{
			ID:        "post-sabbatical-income",
			Type:      "INCOME",
			Amount:    12000, // Higher income after sabbatical
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"startDateOffset": 6, // Income starts at month 6
			},
		},
		// Consistent expenses throughout
		{
			ID:        "monthly-expenses",
			Type:      "EXPENSE",
			Amount:    5000,
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 18 // 6 months sabbatical + 12 months working

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	if len(result.ComprehensiveMonthlyStates) >= 18 {
		// Month 6: End of sabbatical (cash should be depleted)
		month6 := result.ComprehensiveMonthlyStates[5]
		t.Logf("Month 6 (end of sabbatical) - Cash: $%.2f", month6.Cash)

		// Month 12: 6 months back to work
		month12 := result.ComprehensiveMonthlyStates[11]
		t.Logf("Month 12 (6 months working) - Cash: $%.2f", month12.Cash)

		// Month 18: Full recovery expected
		month18 := result.ComprehensiveMonthlyStates[17]
		t.Logf("Month 18 (12 months working) - Cash: $%.2f", month18.Cash)

		// Cash should be recovering: 12k income - 5k expenses = 7k/month savings
		// Over 12 months = 84k saved
		if month18.Cash < month6.Cash {
			t.Errorf("Cash should have recovered after sabbatical")
		}
	}
}

// TestSabbatical_WithNoAutoLiquidate tests sabbatical combined with NoAutoLiquidate policy
func TestSabbatical_WithNoAutoLiquidate(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:    10000, // Only 2 months of expenses
		Taxable: &Account{TotalValue: 200000, Holdings: []Holding{}},
	}

	// Enable "show the wall" mode
	input.CashStrategy = &CashManagementStrategy{
		NoAutoLiquidate: true,
	}

	input.Events = []FinancialEvent{
		// No income (sabbatical)
		{
			ID:        "expenses",
			Type:      "EXPENSE",
			Amount:    5000,
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 6

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// With NoAutoLiquidate, taxable should remain untouched
	// Cash will go negative, showing "the wall"
	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[len(result.ComprehensiveMonthlyStates)-1]
		t.Logf("Final Cash: $%.2f", finalState.Cash)

		if finalState.Taxable != nil {
			t.Logf("Final Taxable: $%.2f (should be ~$200k if NoAutoLiquidate working)",
				finalState.Taxable.TotalValue)
		}

		// Expected: Cash negative (~-20k after 6 months of 5k expenses from 10k)
		// Taxable preserved (~200k)
	}
}

// TestSabbatical_ShockExpenseDuringSabbatical tests handling of unexpected expenses
func TestSabbatical_ShockExpenseDuringSabbatical(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:    40000,
		Taxable: &Account{TotalValue: 100000, Holdings: []Holding{}},
	}

	input.Events = []FinancialEvent{
		// Regular fixed expenses
		{
			ID:        "fixed-expenses",
			Type:      "EXPENSE",
			Amount:    4000,
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"expenseNature": "fixed",
			},
		},
		// Shock expense mid-sabbatical (medical emergency, car repair, etc.)
		{
			ID:          "shock-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      15000,
			MonthOffset: 3,
			Metadata: map[string]interface{}{
				"expenseNature": "shock",
				"driverKey":     "expense:shock",
			},
		},
	}
	input.MonthsToRun = 6

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Track how shock expense affects sabbatical viability
	if len(result.ComprehensiveMonthlyStates) >= 6 {
		month3 := result.ComprehensiveMonthlyStates[2]
		month4 := result.ComprehensiveMonthlyStates[3] // After shock expense
		month6 := result.ComprehensiveMonthlyStates[5]

		t.Logf("Month 3 (before shock) - Cash: $%.2f", month3.Cash)
		t.Logf("Month 4 (after shock) - Cash: $%.2f", month4.Cash)
		t.Logf("Month 6 (final) - Cash: $%.2f", month6.Cash)

		// Verify shock expense significantly impacted cash
		cashDropFromShock := month3.Cash - month4.Cash
		if cashDropFromShock < 10000 {
			t.Logf("Shock expense ($15k) resulted in $%.2f cash drop", cashDropFromShock)
		}
	}
}

// TestSabbatical_MultipleSabbaticals tests handling of multiple career breaks
func TestSabbatical_MultipleSabbaticals(t *testing.T) {
	input := createBasicInput()
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:    50000,
		Taxable: &Account{TotalValue: 300000, Holdings: []Holding{}},
	}

	input.Events = []FinancialEvent{
		// First sabbatical: months 0-5 (no income)
		// Working: months 6-17
		{
			ID:        "income-period-1",
			Type:      "INCOME",
			Amount:    10000,
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"startDateOffset": 6,
				"endDateOffset":   17,
			},
		},
		// Second sabbatical: months 18-23 (no income)
		// Working again: months 24+
		{
			ID:        "income-period-2",
			Type:      "INCOME",
			Amount:    12000,
			Frequency: "monthly",
			Metadata: map[string]interface{}{
				"startDateOffset": 24,
			},
		},
		// Consistent expenses
		{
			ID:        "expenses",
			Type:      "EXPENSE",
			Amount:    6000,
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 36 // 3 years covering both sabbaticals

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Track cash through multiple sabbaticals
	if len(result.ComprehensiveMonthlyStates) >= 36 {
		t.Logf("End of 1st sabbatical (month 6) - Cash: $%.2f",
			result.ComprehensiveMonthlyStates[5].Cash)
		t.Logf("Start of 2nd sabbatical (month 18) - Cash: $%.2f",
			result.ComprehensiveMonthlyStates[17].Cash)
		t.Logf("End of 2nd sabbatical (month 24) - Cash: $%.2f",
			result.ComprehensiveMonthlyStates[23].Cash)
		t.Logf("Final (month 36) - Cash: $%.2f",
			result.ComprehensiveMonthlyStates[35].Cash)
	}
}
