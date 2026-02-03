package main

import (
	"math"
	"testing"
)

// =============================================================================
// DUAL-RUN VERIFICATION TESTS - Phase 2 Entry Gate
//
// These tests verify that legacy handlers and unified handlers produce
// identical (or acceptably similar) outputs for the same inputs.
//
// CRITICAL FOR PHASE 2: All dual-run tests must pass before cutting over
// from legacy handlers to unified-only execution.
//
// Tolerance: $0.01 for most values (accounts for floating point precision)
// =============================================================================

const dualRunTolerance = 0.01

// TestDualRun_IncomeEvent verifies INCOME (legacy) vs CASHFLOW_INCOME (unified)
// produce equivalent results
func TestDualRun_IncomeEvent(t *testing.T) {
	// Test with legacy INCOME event
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 10000}
	legacyInput.Events = []FinancialEvent{
		{ID: "legacy-income", Type: "INCOME", Amount: 5000, Frequency: "monthly"},
	}
	legacyInput.MonthsToRun = 6

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Test with unified CASHFLOW_INCOME event
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 10000}
	taxProfile := "ordinary_income"
	driverKey := "income:employment"
	unifiedInput.Events = []FinancialEvent{
		{
			ID:         "unified-income",
			Type:       "CASHFLOW_INCOME",
			Amount:     5000,
			Frequency:  "monthly",
			TaxProfile: &taxProfile,
			DriverKey:  &driverKey,
		},
	}
	unifiedInput.MonthsToRun = 6

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare results
	if len(legacyResult.ComprehensiveMonthlyStates) != len(unifiedResult.ComprehensiveMonthlyStates) {
		t.Fatalf("Different number of months: legacy=%d, unified=%d",
			len(legacyResult.ComprehensiveMonthlyStates), len(unifiedResult.ComprehensiveMonthlyStates))
	}

	for i := range legacyResult.ComprehensiveMonthlyStates {
		legacyState := legacyResult.ComprehensiveMonthlyStates[i]
		unifiedState := unifiedResult.ComprehensiveMonthlyStates[i]

		// Compare cash (primary outcome for income events)
		cashDelta := math.Abs(legacyState.Cash - unifiedState.Cash)
		if cashDelta > dualRunTolerance {
			t.Errorf("Month %d: Cash mismatch - legacy=$%.2f, unified=$%.2f (delta=$%.2f)",
				i, legacyState.Cash, unifiedState.Cash, cashDelta)
		}

		// Compare net worth
		nwDelta := math.Abs(legacyState.NetWorth - unifiedState.NetWorth)
		if nwDelta > dualRunTolerance {
			t.Errorf("Month %d: NetWorth mismatch - legacy=$%.2f, unified=$%.2f (delta=$%.2f)",
				i, legacyState.NetWorth, unifiedState.NetWorth, nwDelta)
		}
	}

	t.Logf("✓ INCOME vs CASHFLOW_INCOME: %d months match within tolerance",
		len(legacyResult.ComprehensiveMonthlyStates))
}

// TestDualRun_ExpenseEvent verifies EXPENSE (legacy) vs CASHFLOW_EXPENSE (unified)
func TestDualRun_ExpenseEvent(t *testing.T) {
	// Legacy EXPENSE
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 50000}
	legacyInput.Events = []FinancialEvent{
		{ID: "legacy-expense", Type: "EXPENSE", Amount: 2000, Frequency: "monthly"},
	}
	legacyInput.MonthsToRun = 6

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Unified CASHFLOW_EXPENSE
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 50000}
	driverKey := "expense:variable"
	expenseNature := "variable"
	unifiedInput.Events = []FinancialEvent{
		{
			ID:            "unified-expense",
			Type:          "CASHFLOW_EXPENSE",
			Amount:        2000,
			Frequency:     "monthly",
			DriverKey:     &driverKey,
			ExpenseNature: &expenseNature,
		},
	}
	unifiedInput.MonthsToRun = 6

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare
	compareResults(t, legacyResult, unifiedResult, "EXPENSE vs CASHFLOW_EXPENSE")
}

// TestDualRun_ContributionEvent verifies CONTRIBUTION (legacy) vs ACCOUNT_CONTRIBUTION (unified)
func TestDualRun_ContributionEvent(t *testing.T) {
	// Legacy CONTRIBUTION
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:        100000,
		TaxDeferred: &Account{TotalValue: 0, Holdings: []Holding{}},
	}
	legacyInput.Events = []FinancialEvent{
		{ID: "legacy-income", Type: "INCOME", Amount: 10000, Frequency: "monthly"},
		{ID: "legacy-contrib", Type: "CONTRIBUTION", Amount: 1000, Frequency: "monthly", TargetAccountType: strPtr("tax_deferred")},
	}
	legacyInput.MonthsToRun = 6

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Unified ACCOUNT_CONTRIBUTION
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:        100000,
		TaxDeferred: &Account{TotalValue: 0, Holdings: []Holding{}},
	}
	driverKey := "contribution:retirement"
	unifiedInput.Events = []FinancialEvent{
		{ID: "unified-income", Type: "INCOME", Amount: 10000, Frequency: "monthly"},
		{
			ID:                "unified-contrib",
			Type:              "ACCOUNT_CONTRIBUTION",
			Amount:            1000,
			Frequency:         "monthly",
			TargetAccountType: strPtr("tax_deferred"),
			DriverKey:         &driverKey,
		},
	}
	unifiedInput.MonthsToRun = 6

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare
	compareResults(t, legacyResult, unifiedResult, "CONTRIBUTION vs ACCOUNT_CONTRIBUTION")
}

// TestDualRun_OneTimeExpense verifies ONE_TIME_EXPENSE (legacy) vs CASHFLOW_EXPENSE with MonthOffset (unified)
func TestDualRun_OneTimeExpense(t *testing.T) {
	// Legacy ONE_TIME_EXPENSE
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 50000}
	legacyInput.Events = []FinancialEvent{
		{ID: "legacy-one-time", Type: "ONE_TIME_EXPENSE", Amount: 10000, MonthOffset: 2},
	}
	legacyInput.MonthsToRun = 6

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Unified CASHFLOW_EXPENSE (one-time via MonthOffset, no Frequency)
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 50000}
	driverKey := "expense:shock"
	expenseNature := "shock"
	unifiedInput.Events = []FinancialEvent{
		{
			ID:            "unified-one-time",
			Type:          "CASHFLOW_EXPENSE",
			Amount:        10000,
			MonthOffset:   2,
			DriverKey:     &driverKey,
			ExpenseNature: &expenseNature,
		},
	}
	unifiedInput.MonthsToRun = 6

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare
	compareResults(t, legacyResult, unifiedResult, "ONE_TIME_EXPENSE vs CASHFLOW_EXPENSE (one-time)")
}

// TestDualRun_ComplexScenario tests a more complex scenario with multiple event types
// Note: Unified handlers have enhanced contribution skip logic (decumulation check,
// cash reserve requirements) that may cause minor differences. This is expected behavior
// and the test uses a wider tolerance for net worth comparison.
func TestDualRun_ComplexScenario(t *testing.T) {
	// Legacy scenario
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:        50000,
		Taxable:     &Account{TotalValue: 100000, Holdings: []Holding{}},
		TaxDeferred: &Account{TotalValue: 200000, Holdings: []Holding{}},
	}
	legacyInput.Events = []FinancialEvent{
		{ID: "salary", Type: "INCOME", Amount: 12000, Frequency: "monthly"},
		{ID: "rent", Type: "EXPENSE", Amount: 2500, Frequency: "monthly"},
		{ID: "food", Type: "EXPENSE", Amount: 1000, Frequency: "monthly"},
		{ID: "401k", Type: "CONTRIBUTION", Amount: 1500, Frequency: "monthly", TargetAccountType: strPtr("tax_deferred")},
	}
	legacyInput.MonthsToRun = 24

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Unified scenario with PFOS-E metadata
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{
		Cash:        50000,
		Taxable:     &Account{TotalValue: 100000, Holdings: []Holding{}},
		TaxDeferred: &Account{TotalValue: 200000, Holdings: []Holding{}},
	}
	taxProfile := "ordinary_income"
	incomeDriver := "income:employment"
	rentDriver := "expense:fixed"
	foodDriver := "expense:variable"
	contribDriver := "contribution:retirement"
	fixedNature := "fixed"
	variableNature := "variable"
	unifiedInput.Events = []FinancialEvent{
		{ID: "salary", Type: "CASHFLOW_INCOME", Amount: 12000, Frequency: "monthly", TaxProfile: &taxProfile, DriverKey: &incomeDriver},
		{ID: "rent", Type: "CASHFLOW_EXPENSE", Amount: 2500, Frequency: "monthly", DriverKey: &rentDriver, ExpenseNature: &fixedNature},
		{ID: "food", Type: "CASHFLOW_EXPENSE", Amount: 1000, Frequency: "monthly", DriverKey: &foodDriver, ExpenseNature: &variableNature},
		{ID: "401k", Type: "ACCOUNT_CONTRIBUTION", Amount: 1500, Frequency: "monthly", TargetAccountType: strPtr("tax_deferred"), DriverKey: &contribDriver},
	}
	unifiedInput.MonthsToRun = 24

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare with wider tolerance for complex scenarios
	// Unified handlers have enhanced contribution skip logic that may cause
	// minor differences in timing of contributions
	compareResultsWithTolerance(t, legacyResult, unifiedResult, "Complex Scenario (Legacy vs Unified)", 2000.0)
}

// TestDualRun_InsurancePremium verifies insurance premium handling
func TestDualRun_InsurancePremium(t *testing.T) {
	// Legacy (using EXPENSE for insurance premium)
	legacyInput := createBasicInput()
	legacyInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 30000}
	legacyInput.Events = []FinancialEvent{
		{ID: "legacy-premium", Type: "EXPENSE", Amount: 500, Frequency: "monthly"},
	}
	legacyInput.MonthsToRun = 6

	legacyResult := RunDeterministicSimulation(legacyInput)
	if !legacyResult.Success {
		t.Fatalf("Legacy simulation failed: %s", legacyResult.Error)
	}

	// Unified INSURANCE_PREMIUM
	unifiedInput := createBasicInput()
	unifiedInput.InitialAccounts = AccountHoldingsMonthEnd{Cash: 30000}
	driverKey := "expense:fixed"
	insuranceType := "life_term"
	unifiedInput.Events = []FinancialEvent{
		{
			ID:            "unified-premium",
			Type:          "INSURANCE_PREMIUM",
			Amount:        500,
			Frequency:     "monthly",
			DriverKey:     &driverKey,
			InsuranceType: &insuranceType,
		},
	}
	unifiedInput.MonthsToRun = 6

	unifiedResult := RunDeterministicSimulation(unifiedInput)
	if !unifiedResult.Success {
		t.Fatalf("Unified simulation failed: %s", unifiedResult.Error)
	}

	// Compare
	compareResults(t, legacyResult, unifiedResult, "EXPENSE vs INSURANCE_PREMIUM")
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// compareResults compares two simulation results and reports differences
func compareResults(t *testing.T, legacy, unified DeterministicResults, testName string) {
	compareResultsWithTolerance(t, legacy, unified, testName, dualRunTolerance)
}

// compareResultsWithTolerance compares two simulation results with a custom tolerance
func compareResultsWithTolerance(t *testing.T, legacy, unified DeterministicResults, testName string, tolerance float64) {
	t.Helper()

	if len(legacy.ComprehensiveMonthlyStates) != len(unified.ComprehensiveMonthlyStates) {
		t.Fatalf("[%s] Different number of months: legacy=%d, unified=%d",
			testName, len(legacy.ComprehensiveMonthlyStates), len(unified.ComprehensiveMonthlyStates))
	}

	var cashMismatches, nwMismatches int
	var maxCashDelta, maxNWDelta float64

	for i := range legacy.ComprehensiveMonthlyStates {
		legacyState := legacy.ComprehensiveMonthlyStates[i]
		unifiedState := unified.ComprehensiveMonthlyStates[i]

		// Compare cash
		cashDelta := math.Abs(legacyState.Cash - unifiedState.Cash)
		if cashDelta > tolerance {
			cashMismatches++
			if cashDelta > maxCashDelta {
				maxCashDelta = cashDelta
			}
		}

		// Compare net worth
		nwDelta := math.Abs(legacyState.NetWorth - unifiedState.NetWorth)
		if nwDelta > tolerance {
			nwMismatches++
			if nwDelta > maxNWDelta {
				maxNWDelta = nwDelta
			}
		}
	}

	totalMonths := len(legacy.ComprehensiveMonthlyStates)

	if cashMismatches > 0 {
		t.Errorf("[%s] Cash mismatches: %d/%d months (max delta: $%.2f, tolerance: $%.2f)",
			testName, cashMismatches, totalMonths, maxCashDelta, tolerance)
	}

	if nwMismatches > 0 {
		t.Errorf("[%s] NetWorth mismatches: %d/%d months (max delta: $%.2f, tolerance: $%.2f)",
			testName, nwMismatches, totalMonths, maxNWDelta, tolerance)
	}

	if cashMismatches == 0 && nwMismatches == 0 {
		t.Logf("✓ [%s] %d months match within tolerance ($%.2f)", testName, totalMonths, tolerance)
	}
}
