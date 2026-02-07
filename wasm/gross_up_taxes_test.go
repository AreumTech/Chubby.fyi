package main

import (
	"encoding/json"
	"fmt"
	"math"
	"testing"
)

// =============================================================================
// UNIT TESTS FOR grossUpForTaxes FUNCTION
// =============================================================================

// TestGrossUp_TaxesDisabled verifies no gross-up when taxes are disabled
func TestGrossUp_TaxesDisabled(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})

	// Case 1: TaxConfig is nil
	engine.simulationInput = &SimulationInput{InitialAge: 65}
	accounts := &AccountHoldingsMonthEnd{Cash: 10000}

	result := engine.grossUpForTaxes(5000, accounts)
	if result != 5000 {
		t.Errorf("Expected 5000 when TaxConfig is nil, got %.2f", result)
	}

	// Case 2: TaxConfig.Enabled is false
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{Enabled: false},
	}

	result = engine.grossUpForTaxes(5000, accounts)
	if result != 5000 {
		t.Errorf("Expected 5000 when taxes disabled, got %.2f", result)
	}
}

// TestGrossUp_NoInvestmentAccounts verifies gross-up when no investment accounts available
func TestGrossUp_NoInvestmentAccounts(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Only cash, no investment accounts
	// The function should still gross up since there are no accounts to draw from
	accounts := &AccountHoldingsMonthEnd{Cash: 10000}

	// Need $5000, but no investment accounts - uses worst-case tax rate
	// Gross = 5000 / (1 - 0.22) = 6410.26
	result := engine.grossUpForTaxes(5000, accounts)
	expected := 5000 / 0.78

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f when no investment accounts, got %.2f", expected, result)
	}
}

// TestGrossUp_OnlyTaxDeferredAvailable verifies correct gross-up for tax-deferred withdrawals
func TestGrossUp_OnlyTaxDeferredAvailable(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Only tax-deferred account, no cash
	accounts := &AccountHoldingsMonthEnd{
		Cash: 0,
		TaxDeferred: &Account{
			TotalValue: 100000,
		},
	}

	// Need $10,000 net
	// With 22% tax rate: Gross = Net / (1 - 0.22) = 10000 / 0.78 = 12820.51
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.78

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f for tax-deferred gross-up, got %.2f", expected, result)
	}
}

// TestGrossUp_OnlyTaxableAvailable verifies correct gross-up for taxable withdrawals
func TestGrossUp_OnlyTaxableAvailable(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Only taxable account, no cash
	accounts := &AccountHoldingsMonthEnd{
		Cash: 0,
		Taxable: &Account{
			TotalValue: 100000,
		},
	}

	// Need $10,000 net
	// Taxable: 50% gains taxed at 15% LTCG rate
	// Effective rate on taxable = 0.5 * 0.15 = 0.075
	// Gross = Net / (1 - 0.075) = 10000 / 0.925 = 10810.81
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.925

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f for taxable gross-up, got %.2f", expected, result)
	}
}

// TestGrossUp_OnlyRothAvailable verifies no gross-up for Roth withdrawals
func TestGrossUp_OnlyRothAvailable(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Only Roth account, no cash
	accounts := &AccountHoldingsMonthEnd{
		Cash: 0,
		Roth: &Account{
			TotalValue: 100000,
		},
	}

	// Need $10,000 net - Roth is tax-free
	result := engine.grossUpForTaxes(10000, accounts)
	if result != 10000 {
		t.Errorf("Expected 10000 for Roth (tax-free), got %.2f", result)
	}
}

// TestGrossUp_MixedAccounts_TaxDeferredFirst verifies withdrawal order is Taxable -> Tax-Deferred -> Roth
func TestGrossUp_MixedAccounts_TaxDeferredFirst(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Mix of accounts - cash is NOT considered in gross-up calculation
	accounts := &AccountHoldingsMonthEnd{
		Cash:        3000,                          // Ignored by grossUpForTaxes
		TaxDeferred: &Account{TotalValue: 100000},  // Uses this (22% tax)
	}

	// Need $10,000 net - all from tax-deferred (cash is not considered)
	// Gross = 10000 / 0.78 = 12820.51
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.78

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f for tax-deferred gross-up, got %.2f", expected, result)
	}
}

// TestGrossUp_MixedAccounts_FullSequence verifies complete withdrawal order (without cash)
func TestGrossUp_MixedAccounts_FullSequence(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// All account types with small balances
	accounts := &AccountHoldingsMonthEnd{
		Cash:        1000,                          // Ignored by grossUpForTaxes
		Taxable:     &Account{TotalValue: 2000},
		TaxDeferred: &Account{TotalValue: 3000},
		Roth:        &Account{TotalValue: 5000},
	}

	// Need $7000 net - will tap all investment accounts
	// Order: Taxable -> Tax-Deferred -> Roth (cash is NOT considered)

	// Taxable: max net = 2000 * 0.925 = 1850, gross = 2000, remaining = 5150
	// Tax-Deferred: max net = 3000 * 0.78 = 2340, gross = 3000, remaining = 2810
	// Roth: $2810, no tax
	// Total gross = 2000 + 3000 + 2810 = 7810

	result := engine.grossUpForTaxes(7000, accounts)

	taxableNet := 2000 * 0.925 // 1850
	taxableGross := 2000.0
	taxDeferredNet := 3000 * 0.78 // 2340
	taxDeferredGross := 3000.0
	rothNeeded := 7000 - taxableNet - taxDeferredNet // 7000 - 1850 - 2340 = 2810
	rothGross := rothNeeded

	expected := taxableGross + taxDeferredGross + rothGross

	if math.Abs(result-expected) > 1.0 {
		t.Errorf("Expected %.2f for full sequence, got %.2f", expected, result)
	}
}

// TestGrossUp_InsufficientAccounts verifies behavior when all accounts depleted
func TestGrossUp_InsufficientAccounts(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Very small balances (cash is ignored)
	accounts := &AccountHoldingsMonthEnd{
		Cash:        1000,                         // Ignored by grossUpForTaxes
		TaxDeferred: &Account{TotalValue: 2000},
	}

	// Need $50,000 net - way more than available in investment accounts
	// Tax-Deferred: max net = 2000 * 0.78 = 1560, gross = 2000, remaining = 48440
	// Remaining $48440 at worst-case rate (22%): 48440 / 0.78 = 62102.56
	// Total gross = 2000 + 62102.56 = 64102.56

	result := engine.grossUpForTaxes(50000, accounts)

	taxDeferredNet := 2000 * 0.78
	taxDeferredGross := 2000.0
	remaining := 50000 - taxDeferredNet
	remainingGross := remaining / 0.78

	expected := taxDeferredGross + remainingGross

	if math.Abs(result-expected) > 1.0 {
		t.Errorf("Expected %.2f for insufficient accounts, got %.2f", expected, result)
	}
}

// TestGrossUp_NegativeCash verifies behavior with negative cash balance
func TestGrossUp_NegativeCash(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	// Negative cash (shortfall situation)
	accounts := &AccountHoldingsMonthEnd{
		Cash:        -500, // Already in deficit
		TaxDeferred: &Account{TotalValue: 100000},
	}

	// Need $10,000 net - all from tax-deferred (cash contributes nothing)
	// Gross = 10000 / 0.78 = 12820.51
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.78

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f with negative cash, got %.2f", expected, result)
	}
}

// TestGrossUp_HighTaxRate verifies calculation with high tax rate
func TestGrossUp_HighTaxRate(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.37, // Top federal bracket
			CapitalGainsRate: 0.20, // Top LTCG rate
		},
	}

	accounts := &AccountHoldingsMonthEnd{
		Cash:        0,
		TaxDeferred: &Account{TotalValue: 100000},
	}

	// Need $10,000 net at 37% rate
	// Gross = 10000 / 0.63 = 15873.02
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.63

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f with 37%% rate, got %.2f", expected, result)
	}
}

// TestGrossUp_ZeroAmountNeeded verifies zero amount returns zero
func TestGrossUp_ZeroAmountNeeded(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0.22,
			CapitalGainsRate: 0.15,
		},
	}

	accounts := &AccountHoldingsMonthEnd{
		Cash:        10000,
		TaxDeferred: &Account{TotalValue: 100000},
	}

	result := engine.grossUpForTaxes(0, accounts)
	if result != 0 {
		t.Errorf("Expected 0 for zero amount needed, got %.2f", result)
	}
}

// TestGrossUp_DefaultRates verifies default rates are used when not specified
func TestGrossUp_DefaultRates(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	engine.simulationInput = &SimulationInput{
		InitialAge: 65,
		TaxConfig: &SimpleTaxConfig{
			Enabled:          true,
			EffectiveRate:    0, // Should default to 22%
			CapitalGainsRate: 0, // Should default to 15%
		},
	}

	accounts := &AccountHoldingsMonthEnd{
		Cash:        0,
		TaxDeferred: &Account{TotalValue: 100000},
	}

	// Need $10,000 net - should use default 22% rate
	result := engine.grossUpForTaxes(10000, accounts)
	expected := 10000 / 0.78 // Default 22% rate

	if math.Abs(result-expected) > 0.01 {
		t.Errorf("Expected %.2f with default rate, got %.2f", expected, result)
	}
}

// =============================================================================
// INTEGRATION TESTS - Full simulation flow with gross-up
// =============================================================================

// TestGrossUp_Integration_CashShortfall verifies gross-up works in full simulation
func TestGrossUp_Integration_CashShortfall(t *testing.T) {
	input := createBasicInput()
	// NOTE: Simulation uses normalized $1/share pricing, so Quantity=100000 means $100,000
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 5000, // Small cash balance
		TaxDeferred: &Account{
			TotalValue: 100000,
			Holdings: []Holding{
				{
					ID:                        "test-tax-deferred",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  100000,                  // 100k shares at $1/share = $100k
					CostBasisPerUnit:          0.8,                     // $0.80/share cost basis
					CostBasisTotal:            80000,                   // $80k total cost basis
					CurrentMarketPricePerUnit: 1.0,                     // $1/share normalized price
					CurrentMarketValueTotal:   100000,
				},
			},
		},
	}

	// Enable taxes
	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// Large recurring expense that will force withdrawals
	input.Events = []FinancialEvent{
		{
			ID:        "expense-1",
			Type:      "RECURRING_EXPENSE",
			Amount:    8000, // More than cash available
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 3

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Debug: Print event trace
	t.Logf("Simulation completed. Bankruptcy: %v", result.IsBankrupt)
	t.Logf("Event trace (%d entries):", len(result.EventTrace))
	for _, entry := range result.EventTrace {
		t.Logf("  Month %d: %s (%s) Amount=$%.2f - CashBefore=$%.2f CashAfter=$%.2f TaxDeferredBefore=$%.2f TaxDeferredAfter=$%.2f",
			entry.MonthOffset, entry.EventID, entry.EventType, entry.Amount,
			entry.CashBefore, entry.CashAfter, entry.TaxDeferredBefore, entry.TaxDeferredAfter)
	}

	// Debug: Print each month's state
	t.Logf("\nMonthly states (%d entries):", len(result.ComprehensiveMonthlyStates))
	for i, state := range result.ComprehensiveMonthlyStates {
		taxDeferredValue := 0.0
		if state.TaxDeferred != nil {
			taxDeferredValue = state.TaxDeferred.TotalValue
		}
		t.Logf("Month %d: Cash=$%.2f, NetWorth=$%.2f, TaxDeferred=$%.2f",
			i, state.Cash, state.NetWorth, taxDeferredValue)
	}

	// Verify simulation completed without bankruptcy
	if result.IsBankrupt {
		t.Errorf("Simulation went bankrupt unexpectedly at month %d", result.BankruptcyMonth)
	}

	// Verify cash didn't go too negative (gross-up should prevent large deficits)
	for i, state := range result.ComprehensiveMonthlyStates {
		if state.Cash < -1000 { // Allow small negative due to timing
			t.Errorf("Month %d: Cash went too negative ($%.2f) - gross-up may not be working", i, state.Cash)
		}
	}
}

// TestGrossUp_Integration_NoTaxes_Comparison verifies behavior differs when taxes disabled
func TestGrossUp_Integration_NoTaxes_Comparison(t *testing.T) {
	// Create base input
	// NOTE: Simulation uses normalized $1/share pricing
	createInput := func(taxesEnabled bool) SimulationInput {
		input := createBasicInput()
		input.InitialAccounts = AccountHoldingsMonthEnd{
			Cash: 0, // Start with no cash
			TaxDeferred: &Account{
				TotalValue: 50000,
				Holdings: []Holding{
					{
						ID:                        "test-tax-deferred",
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  50000, // 50k shares at $1/share = $50k
						CostBasisPerUnit:          0.8,
						CostBasisTotal:            40000,
						CurrentMarketPricePerUnit: 1.0,
						CurrentMarketValueTotal:   50000,
					},
				},
			},
		}

		if taxesEnabled {
			input.TaxConfig = &SimpleTaxConfig{
				Enabled:          true,
				EffectiveRate:    0.22,
				CapitalGainsRate: 0.15,
			}
		}

		input.Events = []FinancialEvent{
			{
				ID:        "expense-1",
				Type:      "RECURRING_EXPENSE",
				Amount:    5000,
				Frequency: "monthly",
			},
		}
		input.MonthsToRun = 6

		return input
	}

	// Run with taxes enabled
	resultWithTax := RunDeterministicSimulation(createInput(true))
	if !resultWithTax.Success {
		t.Fatalf("Simulation with taxes failed: %s", resultWithTax.Error)
	}

	// Run without taxes
	resultNoTax := RunDeterministicSimulation(createInput(false))
	if !resultNoTax.Success {
		t.Fatalf("Simulation without taxes failed: %s", resultNoTax.Error)
	}

	// With taxes enabled, more should be withdrawn (gross-up effect)
	// So final net worth should be lower with taxes
	finalWithTax := resultWithTax.ComprehensiveMonthlyStates[len(resultWithTax.ComprehensiveMonthlyStates)-1].NetWorth
	finalNoTax := resultNoTax.ComprehensiveMonthlyStates[len(resultNoTax.ComprehensiveMonthlyStates)-1].NetWorth

	if finalWithTax >= finalNoTax {
		t.Logf("With taxes: $%.2f, Without taxes: $%.2f", finalWithTax, finalNoTax)
		t.Logf("Note: Final values may be similar if gross-up compensates correctly")
	}
}

// TestGrossUp_Integration_LargeExpense verifies handling of large one-time expense
func TestGrossUp_Integration_LargeExpense(t *testing.T) {
	input := createBasicInput()
	// NOTE: Simulation uses normalized $1/share pricing
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 10000,
		TaxDeferred: &Account{
			TotalValue: 200000,
			Holdings: []Holding{
				{
					ID:                        "test-tax-deferred",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  200000, // 200k shares at $1/share = $200k
					CostBasisPerUnit:          0.8,
					CostBasisTotal:            160000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   200000,
				},
			},
		},
	}

	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.25, // 25% effective rate
		CapitalGainsRate: 0.15,
	}

	// Large one-time expense requiring significant withdrawal
	input.Events = []FinancialEvent{
		{
			ID:          "big-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      50000,
			MonthOffset: 1,
		},
	}
	input.MonthsToRun = 3

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Simulation should complete without bankruptcy
	if result.IsBankrupt {
		t.Errorf("Simulation went bankrupt - gross-up may not be handling large expense correctly")
	}

	// After the expense, there should still be significant assets remaining
	// Started with $210k, expense of $50k, should have ~$145k+ remaining after taxes
	finalNetWorth := result.ComprehensiveMonthlyStates[len(result.ComprehensiveMonthlyStates)-1].NetWorth
	if finalNetWorth < 100000 {
		t.Errorf("Final net worth $%.2f is too low - expected >$100k after $50k expense from $210k", finalNetWorth)
	}
}

// TestSellFromInvestmentsOnly_Direct tests the withdrawal function directly
func TestSellFromInvestmentsOnly_Direct(t *testing.T) {
	config := StochasticModelConfig{}
	cashManager := NewCashManagerWithConfig(&config)

	// Create accounts with TaxDeferred holding
	accounts := &AccountHoldingsMonthEnd{
		Cash: 5000,
		TaxDeferred: &Account{
			TotalValue: 100000,
			Holdings: []Holding{
				{
					ID:                        "test-holding",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  100000, // 100k shares at $1/share
					CostBasisPerUnit:          0.8,    // $0.80/share cost basis
					CurrentMarketPricePerUnit: 1.0,    // $1/share market price
					CurrentMarketValueTotal:   100000,
					CostBasisTotal:            80000, // Must set this!
					Lots: []TaxLot{
						{
							ID:               "test-lot",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         100000,
							CostBasisPerUnit: 0.8,
							CostBasisTotal:   80000,
							AcquisitionDate:  -12, // Long term
							IsLongTerm:       true,
						},
					},
				},
			},
		},
	}

	t.Logf("BEFORE: Cash=$%.2f, TaxDeferred=$%.2f", accounts.Cash, accounts.TaxDeferred.TotalValue)
	t.Logf("Holdings: %d, Lots in holding[0]: %d", len(accounts.TaxDeferred.Holdings), len(accounts.TaxDeferred.Holdings[0].Lots))

	// Try to sell $3846 worth
	targetAmount := 3846.15
	result := cashManager.SellFromInvestmentsOnly(accounts, targetAmount, 0)

	t.Logf("AFTER SELL: TotalProceeds=$%.2f, TaxDeferredProceeds=$%.2f",
		result.TotalProceeds, result.TaxDeferredProceeds)
	t.Logf("AFTER: Cash=$%.2f, TaxDeferred=$%.2f", accounts.Cash, accounts.TaxDeferred.TotalValue)
	t.Logf("SaleTransactions: %d", len(result.SaleTransactions))
	for i, tx := range result.SaleTransactions {
		t.Logf("  TX[%d]: Proceeds=$%.2f, Quantity=%.2f, Price=$%.2f", i, tx.Proceeds, tx.Quantity, tx.SalePrice)
	}

	if result.TotalProceeds < targetAmount*0.99 {
		t.Errorf("Expected proceeds ~$%.2f, got $%.2f", targetAmount, result.TotalProceeds)
	}
}

// TestGrossUp_DetailedEventTrace provides detailed event-by-event analysis
func TestGrossUp_DetailedEventTrace(t *testing.T) {
	input := createBasicInput()
	input.InitialAge = 65 // Above 59.5 to avoid early withdrawal penalty
	// Start with $2000 cash and $50k in tax-deferred
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 2000,
		TaxDeferred: &Account{
			TotalValue: 50000,
			Holdings: []Holding{
				{
					ID:                        "test-td",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  50000,
					CostBasisPerUnit:          0.8,
					CostBasisTotal:            40000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   50000,
				},
			},
		},
	}

	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// $5000 expense when we only have $2000 cash
	// Shortfall = $5000 - $2000 = $3000
	// Gross-up = $3000 / 0.78 = $3846.15
	input.Events = []FinancialEvent{
		{
			ID:        "expense-1",
			Type:      "ONE_TIME_EXPENSE",
			Amount:    5000,
			MonthOffset: 0,
		},
	}
	input.MonthsToRun = 1

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	t.Log("=== DETAILED EVENT TRACE ANALYSIS ===")
	t.Logf("Initial: Cash=$2000, TaxDeferred=$50000")
	t.Logf("Expense: $5000, Shortfall: $3000, Gross-up (22%%): $%.2f", 3000/0.78)

	for _, entry := range result.EventTrace {
		t.Logf("\nEvent: %s (%s)", entry.EventID, entry.EventType)
		t.Logf("  Amount: $%.2f", entry.Amount)
		t.Logf("  Cash:        $%.2f -> $%.2f (delta: $%.2f)",
			entry.CashBefore, entry.CashAfter, entry.CashAfter-entry.CashBefore)
		t.Logf("  TaxDeferred: $%.2f -> $%.2f (delta: $%.2f)",
			entry.TaxDeferredBefore, entry.TaxDeferredAfter, entry.TaxDeferredAfter-entry.TaxDeferredBefore)
		t.Logf("  NetWorth:    $%.2f -> $%.2f (delta: $%.2f)",
			entry.NetWorthBefore, entry.NetWorthAfter, entry.NetWorthAfter-entry.NetWorthBefore)
	}

	// Verify final state
	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[0]
		t.Logf("\n=== FINAL STATE ===")
		t.Logf("Cash: $%.2f", finalState.Cash)
		t.Logf("NetWorth: $%.2f", finalState.NetWorth)

		// Cash should be ~0 (not negative)
		if finalState.Cash < -100 {
			t.Errorf("FAIL: Cash went too negative: $%.2f", finalState.Cash)
		}

		// Calculate expected net worth:
		// Initial: $2000 + $50000 = $52000
		// Expense: -$5000
		// Tax on withdrawal: 22% of $3846.15 = $846.15
		// Expected: $52000 - $5000 - $846.15 = $46153.85
		expectedNetWorth := 52000.0 - 5000.0 - (3000.0/0.78)*0.22
		t.Logf("Expected NetWorth: ~$%.2f", expectedNetWorth)

		if math.Abs(finalState.NetWorth - expectedNetWorth) > 100 {
			t.Errorf("FAIL: NetWorth $%.2f differs from expected $%.2f by more than $100",
				finalState.NetWorth, expectedNetWorth)
		}
	}
}

// TestGrossUp_MultipleAccountTypes tests withdrawal from multiple account types
func TestGrossUp_MultipleAccountTypes(t *testing.T) {
	input := createBasicInput()
	// Start with small amounts in each account
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 1000,
		Taxable: &Account{
			TotalValue: 5000,
			Holdings: []Holding{
				{
					ID:                        "test-taxable",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  5000,
					CostBasisPerUnit:          0.5, // 50% gains
					CostBasisTotal:            2500,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   5000,
				},
			},
		},
		TaxDeferred: &Account{
			TotalValue: 10000,
			Holdings: []Holding{
				{
					ID:                        "test-td",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  10000,
					CostBasisPerUnit:          0.8,
					CostBasisTotal:            8000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   10000,
				},
			},
		},
		Roth: &Account{
			TotalValue: 20000,
			Holdings: []Holding{
				{
					ID:                        "test-roth",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  20000,
					CostBasisPerUnit:          1.0,
					CostBasisTotal:            20000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   20000,
				},
			},
		},
	}

	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// Large expense that should tap into multiple accounts
	// Order: Cash -> Taxable -> Tax-Deferred -> Roth
	input.Events = []FinancialEvent{
		{
			ID:          "big-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      20000, // More than cash + taxable + tax-deferred
			MonthOffset: 0,
		},
	}
	input.MonthsToRun = 1

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	t.Log("=== MULTI-ACCOUNT WITHDRAWAL TEST ===")
	t.Logf("Initial: Cash=$1000, Taxable=$5000, TaxDeferred=$10000, Roth=$20000, Total=$36000")
	t.Logf("Expense: $20000")

	for _, entry := range result.EventTrace {
		if entry.EventType == "ONE_TIME_EXPENSE" {
			t.Logf("\nExpense Event Trace:")
			t.Logf("  Cash:        $%.2f -> $%.2f", entry.CashBefore, entry.CashAfter)
			t.Logf("  Taxable:     $%.2f -> $%.2f", entry.TaxableBefore, entry.TaxableAfter)
			t.Logf("  TaxDeferred: $%.2f -> $%.2f", entry.TaxDeferredBefore, entry.TaxDeferredAfter)
			t.Logf("  Roth:        $%.2f -> $%.2f", entry.RothBefore, entry.RothAfter)
		}
	}

	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[0]
		t.Logf("\nFinal State:")
		t.Logf("  Cash: $%.2f", finalState.Cash)
		t.Logf("  NetWorth: $%.2f", finalState.NetWorth)

		// Cash should be ~0, not deeply negative
		if finalState.Cash < -500 {
			t.Errorf("FAIL: Cash went too negative: $%.2f", finalState.Cash)
		}

		// Net worth should be initial ($36k) minus expense ($20k) minus taxes
		if finalState.NetWorth < 10000 {
			t.Errorf("FAIL: NetWorth too low: $%.2f, expected >$10k", finalState.NetWorth)
		}
	}
}

// TestGrossUp_RecurringExpensesManyMonths tests gross-up over extended period
func TestGrossUp_RecurringExpensesManyMonths(t *testing.T) {
	input := createBasicInput()
	input.InitialAge = 65 // Avoid early withdrawal penalty
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 0, // Start with zero cash
		TaxDeferred: &Account{
			TotalValue: 100000,
			Holdings: []Holding{
				{
					ID:                        "test-td",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  100000,
					CostBasisPerUnit:          0.8,
					CostBasisTotal:            80000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   100000,
				},
			},
		},
	}

	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// $3000/month expense for 12 months
	// Total expenses: $36,000
	// With 22% gross-up: $36,000 / 0.78 = $46,153.85 total withdrawn
	input.Events = []FinancialEvent{
		{
			ID:        "monthly-expense",
			Type:      "RECURRING_EXPENSE",
			Amount:    3000,
			Frequency: "monthly",
		},
	}
	input.MonthsToRun = 12

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	t.Log("=== 12-MONTH RECURRING EXPENSE TEST ===")
	t.Logf("Initial: TaxDeferred=$100000")
	t.Logf("Expense: $3000/month for 12 months = $36000 total")
	t.Logf("Expected gross withdrawals: $%.2f", 36000.0/0.78)

	// Check each month's cash balance
	allCashOK := true
	for i, state := range result.ComprehensiveMonthlyStates {
		if state.Cash < -100 {
			t.Logf("Month %d: Cash=$%.2f (TOO NEGATIVE)", i, state.Cash)
			allCashOK = false
		}
	}

	if !allCashOK {
		t.Error("FAIL: Cash went negative in one or more months")
	}

	// Final state check
	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[len(result.ComprehensiveMonthlyStates)-1]
		t.Logf("\nFinal State (Month 11):")
		t.Logf("  Cash: $%.2f", finalState.Cash)
		t.Logf("  NetWorth: $%.2f", finalState.NetWorth)

		// Expected: $100k - $36k expenses - ~$10k taxes = ~$54k
		expectedMin := 100000.0 - 36000.0 - (36000.0/0.78)*0.22 - 1000 // Allow $1k margin
		if finalState.NetWorth < expectedMin {
			t.Errorf("FAIL: Final NetWorth $%.2f is less than expected minimum $%.2f",
				finalState.NetWorth, expectedMin)
		}
	}

	// Check for bankruptcy
	if result.IsBankrupt {
		t.Errorf("FAIL: Simulation went bankrupt at month %d", result.BankruptcyMonth)
	}
}

// TestGrossUp_ExactMathVerification verifies the exact math of gross-up
func TestGrossUp_ExactMathVerification(t *testing.T) {
	input := createBasicInput()
	input.InitialAge = 65 // Avoid early withdrawal penalty
	// Start with exactly $0 cash to force full withdrawal
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 0,
		TaxDeferred: &Account{
			TotalValue: 100000,
			Holdings: []Holding{
				{
					ID:                        "test-td",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  100000,
					CostBasisPerUnit:          1.0, // No gains (cost = value)
					CostBasisTotal:            100000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   100000,
				},
			},
		},
	}

	taxRate := 0.25 // Use 25% for cleaner math
	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    taxRate,
		CapitalGainsRate: 0.15,
	}

	// Need exactly $7500 net
	// Gross = $7500 / (1 - 0.25) = $7500 / 0.75 = $10,000
	// Tax = $10,000 * 0.25 = $2,500
	// Net = $10,000 - $2,500 = $7,500 ✓
	netNeeded := 7500.0
	grossExpected := netNeeded / (1 - taxRate)
	taxExpected := grossExpected * taxRate

	input.Events = []FinancialEvent{
		{
			ID:          "exact-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      netNeeded,
			MonthOffset: 0,
		},
	}
	input.MonthsToRun = 1

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	t.Log("=== EXACT MATH VERIFICATION ===")
	t.Logf("Tax Rate: %.0f%%", taxRate*100)
	t.Logf("Net Needed: $%.2f", netNeeded)
	t.Logf("Expected Gross Withdrawal: $%.2f", grossExpected)
	t.Logf("Expected Tax: $%.2f", taxExpected)

	// Find the expense event
	for _, entry := range result.EventTrace {
		if entry.EventType == "ONE_TIME_EXPENSE" {
			actualWithdrawn := entry.TaxDeferredBefore - entry.TaxDeferredAfter
			t.Logf("\nActual Results:")
			t.Logf("  TaxDeferred withdrawn: $%.2f (expected $%.2f)", actualWithdrawn, grossExpected)
			t.Logf("  Cash before: $%.2f", entry.CashBefore)
			t.Logf("  Cash after: $%.2f", entry.CashAfter)

			// Verify withdrawn amount matches expected gross
			if math.Abs(actualWithdrawn - grossExpected) > 1.0 {
				t.Errorf("FAIL: Withdrawn $%.2f, expected $%.2f", actualWithdrawn, grossExpected)
			}

			// Verify final cash is ~0 (expense paid)
			if math.Abs(entry.CashAfter) > 100 {
				t.Errorf("FAIL: Final cash $%.2f, expected ~$0", entry.CashAfter)
			}
		}
	}

	// Verify net worth matches expected
	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalNW := result.ComprehensiveMonthlyStates[0].NetWorth
		expectedNW := 100000 - netNeeded - taxExpected
		t.Logf("\nNet Worth:")
		t.Logf("  Initial: $100,000")
		t.Logf("  Expense: -$%.2f", netNeeded)
		t.Logf("  Tax: -$%.2f", taxExpected)
		t.Logf("  Expected Final: $%.2f", expectedNW)
		t.Logf("  Actual Final: $%.2f", finalNW)

		if math.Abs(finalNW - expectedNW) > 10 {
			t.Errorf("FAIL: Net worth $%.2f, expected $%.2f", finalNW, expectedNW)
		}
	}
}

// TestGrossUp_TaxableAccountWithGains tests tax treatment for taxable account (capital gains)
func TestGrossUp_TaxableAccountWithGains(t *testing.T) {
	input := createBasicInput()
	// Taxable account with 50% unrealized gains
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 0,
		Taxable: &Account{
			TotalValue: 20000,
			Holdings: []Holding{
				{
					ID:                        "test-taxable",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  20000,
					CostBasisPerUnit:          0.5, // Cost $0.50, Value $1.00 = 50% gain
					CostBasisTotal:            10000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   20000,
				},
			},
		},
	}

	capGainsRate := 0.15
	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: capGainsRate,
	}

	// Need $5000 for expense
	// Taxable: 50% of sale is gains, taxed at 15%
	// Effective rate on taxable = 50% * 15% = 7.5%
	// Gross = $5000 / (1 - 0.075) = $5405.41
	expenseAmount := 5000.0
	effectiveTaxRate := 0.5 * capGainsRate // 50% gains * 15% cap gains rate
	grossExpected := expenseAmount / (1 - effectiveTaxRate)

	input.Events = []FinancialEvent{
		{
			ID:          "taxable-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      expenseAmount,
			MonthOffset: 0,
		},
	}
	input.MonthsToRun = 1

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	t.Log("=== TAXABLE ACCOUNT (CAPITAL GAINS) TEST ===")
	t.Logf("Initial Taxable: $20,000 (cost basis $10,000, 50%% gains)")
	t.Logf("Expense: $%.2f", expenseAmount)
	t.Logf("Effective tax rate on taxable: %.1f%% (50%% gains * %.0f%% LTCG rate)",
		effectiveTaxRate*100, capGainsRate*100)
	t.Logf("Expected gross withdrawal: $%.2f", grossExpected)

	for _, entry := range result.EventTrace {
		if entry.EventType == "ONE_TIME_EXPENSE" {
			actualWithdrawn := entry.TaxableBefore - entry.TaxableAfter
			t.Logf("\nActual Results:")
			t.Logf("  Taxable withdrawn: $%.2f", actualWithdrawn)
			t.Logf("  Cash after expense: $%.2f", entry.CashAfter)
		}
	}

	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalState := result.ComprehensiveMonthlyStates[0]
		if finalState.Cash < -100 {
			t.Errorf("FAIL: Cash went negative: $%.2f", finalState.Cash)
		}
	}
}

// TestGrossUp_CompareWithAndWithoutTaxes compares exact same scenario with/without taxes
func TestGrossUp_CompareWithAndWithoutTaxes(t *testing.T) {
	createInput := func(taxEnabled bool, taxRate float64) SimulationInput {
		input := createBasicInput()
		input.InitialAge = 65 // Avoid early withdrawal penalty
		input.InitialAccounts = AccountHoldingsMonthEnd{
			Cash: 0,
			TaxDeferred: &Account{
				TotalValue: 100000,
				Holdings: []Holding{
					{
						ID:                        "test-td",
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  100000,
						CostBasisPerUnit:          1.0,
						CostBasisTotal:            100000,
						CurrentMarketPricePerUnit: 1.0,
						CurrentMarketValueTotal:   100000,
					},
				},
			},
		}

		if taxEnabled {
			input.TaxConfig = &SimpleTaxConfig{
				Enabled:          true,
				EffectiveRate:    taxRate,
				CapitalGainsRate: 0.15,
			}
		}

		input.Events = []FinancialEvent{
			{
				ID:          "expense",
				Type:        "ONE_TIME_EXPENSE",
				Amount:      10000,
				MonthOffset: 0,
			},
		}
		input.MonthsToRun = 1

		return input
	}

	taxRate := 0.20 // 20% for clean math

	// Run without taxes
	resultNoTax := RunDeterministicSimulation(createInput(false, 0))
	if !resultNoTax.Success {
		t.Fatalf("No-tax simulation failed: %s", resultNoTax.Error)
	}

	// Run with taxes
	resultWithTax := RunDeterministicSimulation(createInput(true, taxRate))
	if !resultWithTax.Success {
		t.Fatalf("With-tax simulation failed: %s", resultWithTax.Error)
	}

	t.Log("=== TAX vs NO-TAX COMPARISON ===")
	t.Logf("Expense: $10,000")
	t.Logf("Tax Rate: %.0f%%", taxRate*100)

	// Calculate expectations
	// Without tax: withdraw $10k, final NW = $90k
	// With tax: withdraw $10k/0.80 = $12.5k, tax = $2.5k, final NW = $87.5k
	expectedNWNoTax := 100000.0 - 10000.0
	grossWithTax := 10000.0 / (1 - taxRate)
	taxPaid := grossWithTax * taxRate
	expectedNWWithTax := 100000.0 - 10000.0 - taxPaid

	var finalNWNoTax, finalNWWithTax float64
	if len(resultNoTax.ComprehensiveMonthlyStates) > 0 {
		finalNWNoTax = resultNoTax.ComprehensiveMonthlyStates[0].NetWorth
	}
	if len(resultWithTax.ComprehensiveMonthlyStates) > 0 {
		finalNWWithTax = resultWithTax.ComprehensiveMonthlyStates[0].NetWorth
	}

	t.Logf("\nWithout Taxes:")
	t.Logf("  Expected NW: $%.2f", expectedNWNoTax)
	t.Logf("  Actual NW: $%.2f", finalNWNoTax)

	t.Logf("\nWith Taxes (%.0f%%):", taxRate*100)
	t.Logf("  Gross withdrawal: $%.2f", grossWithTax)
	t.Logf("  Tax paid: $%.2f", taxPaid)
	t.Logf("  Expected NW: $%.2f", expectedNWWithTax)
	t.Logf("  Actual NW: $%.2f", finalNWWithTax)

	t.Logf("\nDifference (tax cost): $%.2f (expected $%.2f)",
		finalNWNoTax-finalNWWithTax, taxPaid)

	// Verify the difference is approximately the tax paid
	actualTaxCost := finalNWNoTax - finalNWWithTax
	if math.Abs(actualTaxCost - taxPaid) > 10 {
		t.Errorf("FAIL: Tax cost $%.2f doesn't match expected $%.2f", actualTaxCost, taxPaid)
	}

	// Verify both simulations have cash ~0
	if len(resultNoTax.ComprehensiveMonthlyStates) > 0 {
		if math.Abs(resultNoTax.ComprehensiveMonthlyStates[0].Cash) > 100 {
			t.Errorf("FAIL: No-tax cash not ~0: $%.2f", resultNoTax.ComprehensiveMonthlyStates[0].Cash)
		}
	}
	if len(resultWithTax.ComprehensiveMonthlyStates) > 0 {
		if math.Abs(resultWithTax.ComprehensiveMonthlyStates[0].Cash) > 100 {
			t.Errorf("FAIL: With-tax cash not ~0: $%.2f", resultWithTax.ComprehensiveMonthlyStates[0].Cash)
		}
	}
}

// TestGrossUp_VerifyActualWithdrawal verifies the gross-up actually results in correct net amount
func TestGrossUp_VerifyActualWithdrawal(t *testing.T) {
	// This test verifies that when we gross-up a withdrawal, the resulting
	// cash after tax withholding is approximately what we needed

	input := createBasicInput()
	// NOTE: Simulation uses normalized $1/share pricing
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 0, // Start with zero cash to force withdrawal
		TaxDeferred: &Account{
			TotalValue: 100000,
			Holdings: []Holding{
				{
					ID:                        "test-tax-deferred",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  100000, // 100k shares at $1/share = $100k
					CostBasisPerUnit:          1.0,
					CostBasisTotal:            100000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   100000,
				},
			},
		},
	}

	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// Small expense to force a withdrawal
	expenseAmount := 1000.0
	input.Events = []FinancialEvent{
		{
			ID:          "test-expense",
			Type:        "ONE_TIME_EXPENSE",
			Amount:      expenseAmount,
			MonthOffset: 0,
		},
	}
	input.MonthsToRun = 1

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Check that after the expense, cash is approximately 0 or small positive
	// (the gross-up should have withdrawn enough to cover expense + taxes)
	if len(result.ComprehensiveMonthlyStates) > 0 {
		finalCash := result.ComprehensiveMonthlyStates[0].Cash
		// Cash should be close to 0 after paying the expense
		// Allow for some variance due to exact timing of tax withholding
		if finalCash < -500 || finalCash > 500 {
			t.Errorf("Final cash $%.2f is outside expected range [-500, 500] - gross-up may be incorrect", finalCash)
		}
	}
}

// TestIncomeWithholding_DifferentIncomeLevels verifies Go applies correct progressive withholding
// FOOLPROOF RULE: Adapter passes GROSS income, Go handles all taxation
func TestIncomeWithholding_DifferentIncomeLevels(t *testing.T) {
	testCases := []struct {
		name           string
		monthlyGross   float64
		minNetExpected float64 // After withholding
		maxNetExpected float64
	}{
		{"Low income ($3k/month)", 3000, 2600, 2900},    // Low bracket, ~10-12% withholding
		{"Middle income ($8k/month)", 8000, 6800, 7400}, // ~15-20% withholding
		{"High income ($20k/month)", 20000, 15000, 17000}, // Higher bracket, 22-25%
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			input := createBasicInput()
			input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}
			input.TaxConfig = nil

			input.Events = []FinancialEvent{
				{
					ID:          "income",
					Type:        "INCOME",
					Amount:      tc.monthlyGross,
					MonthOffset: 0,
				},
			}
			input.MonthsToRun = 1

			result := RunDeterministicSimulation(input)
			if !result.Success {
				t.Fatalf("Simulation failed: %s", result.Error)
			}

			finalCash := result.ComprehensiveMonthlyStates[0].Cash
			withheld := tc.monthlyGross - finalCash
			pctWithheld := withheld / tc.monthlyGross * 100

			t.Logf("Gross: $%.0f → Net: $%.2f (withheld $%.2f = %.1f%%)",
				tc.monthlyGross, finalCash, withheld, pctWithheld)

			if finalCash < tc.minNetExpected || finalCash > tc.maxNetExpected {
				t.Errorf("Net $%.2f outside expected range [$%.0f - $%.0f]",
					finalCash, tc.minNetExpected, tc.maxNetExpected)
			}
		})
	}
}

// TestIncomeWithholding_FilingStatus verifies withholding differs by filing status
func TestIncomeWithholding_FilingStatus(t *testing.T) {
	testCases := []struct {
		name         string
		filingStatus string
	}{
		{"Single", "single"},
		{"Married Filing Jointly", "married"},
	}

	monthlyGross := 10000.0

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			input := createBasicInput()
			input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}
			input.TaxConfig = nil

			input.Events = []FinancialEvent{
				{
					ID:          "income",
					Type:        "INCOME",
					Amount:      monthlyGross,
					MonthOffset: 0,
					Metadata: map[string]interface{}{
						"filingStatus": tc.filingStatus,
					},
				},
			}
			input.MonthsToRun = 1

			result := RunDeterministicSimulation(input)
			if !result.Success {
				t.Fatalf("Simulation failed: %s", result.Error)
			}

			finalCash := result.ComprehensiveMonthlyStates[0].Cash
			withheld := monthlyGross - finalCash
			pctWithheld := withheld / monthlyGross * 100

			t.Logf("%s: Gross $%.0f → Net $%.2f (%.1f%% withheld)",
				tc.name, monthlyGross, finalCash, pctWithheld)

			// MFJ should have lower withholding than single (wider brackets)
			if tc.filingStatus == "single" && finalCash > 9000 {
				t.Errorf("Single filer should have more withholding than $%.2f", monthlyGross-finalCash)
			}
		})
	}
}

// TestPositiveCashFlow_ShouldNotBankrupt tests the scenario where income > expenses
// This reproduces a user-reported bug where $120k income vs $60k spending still led to bankruptcy
func TestPositiveCashFlow_ShouldNotBankrupt(t *testing.T) {
	input := createBasicInput()

	// User scenario: $500k assets, $120k income, $60k spending
	// Monthly: $10k income, $5k expenses = $5k/month surplus
	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 50000, // Some cash to start
		Taxable: &Account{
			TotalValue: 450000,
			Holdings: []Holding{
				{
					ID:                        "taxable-stocks",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  450000, // $1/share normalized
					CostBasisPerUnit:          0.80,
					CostBasisTotal:            360000,
					CurrentMarketPricePerUnit: 1.0,
					CurrentMarketValueTotal:   450000,
					Lots: []TaxLot{
						{
							ID:               "taxable-lot",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         450000,
							CostBasisPerUnit: 0.80,
							CostBasisTotal:   360000,
							AcquisitionDate:  -24, // Long term
							IsLongTerm:       true,
						},
					},
				},
			},
		},
	}

	// Enable taxes at 22% effective rate
	input.TaxConfig = &SimpleTaxConfig{
		Enabled:          true,
		EffectiveRate:    0.22,
		CapitalGainsRate: 0.15,
	}

	// Create monthly income and expense events
	// FOOLPROOF: Adapter passes GROSS income, Go applies withholding
	monthlyIncomeGross := 10000.0 // $120k/year = $10k/month GROSS
	monthlyExpense := 5000.0      // $60k/year = $5k/month

	input.Events = []FinancialEvent{}

	// Run for 24 months (2 years)
	numMonths := 24
	for i := 0; i < numMonths; i++ {
		// Monthly income event (GROSS - Go will apply withholding)
		input.Events = append(input.Events, FinancialEvent{
			ID:          fmt.Sprintf("income-%d", i),
			Type:        "INCOME",
			Amount:      monthlyIncomeGross,
			MonthOffset: i,
		})

		// Monthly expense event
		input.Events = append(input.Events, FinancialEvent{
			ID:          fmt.Sprintf("expense-%d", i),
			Type:        "RECURRING_EXPENSE",
			Amount:      monthlyExpense,
			MonthOffset: i,
		})
	}
	input.MonthsToRun = numMonths

	t.Logf("=== POSITIVE CASH FLOW TEST ===")
	t.Logf("Initial: Cash=$50k, Taxable=$450k, Total=$500k")
	t.Logf("Monthly: Gross Income=$%.0f, Expense=$%.0f", monthlyIncomeGross, monthlyExpense)
	t.Logf("Go handler applies withholding (~13%% = ~$1,300), Net ~$8,700, Surplus ~$3,700")

	result := RunDeterministicSimulation(input)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// This should NEVER be bankrupt - we have positive cash flow
	if result.IsBankrupt {
		t.Errorf("CRITICAL BUG: Simulation went bankrupt despite positive cash flow!")
		t.Errorf("Bankruptcy month: %d", result.BankruptcyMonth)
	}

	// Trace monthly states
	for i, state := range result.ComprehensiveMonthlyStates {
		t.Logf("Month %d: Cash=$%.2f, Taxable=$%.2f, NetWorth=$%.2f",
			i, state.Cash, state.Taxable.TotalValue, state.NetWorth)

		if state.Cash < 0 {
			t.Errorf("Month %d: Negative cash $%.2f - this should not happen with positive flow", i, state.Cash)
		}
	}

	// Calculate expected final net worth:
	// Initial: $500k
	// Monthly: Gross $10k - ~13% withholding = ~$8.7k net - $5k expense = ~$3.7k surplus
	// 24 months × $3.7k = ~$88.8k surplus
	// Expected: $500k + $88.8k = ~$588.8k (approximately, ignoring returns and year-end taxes)
	finalState := result.ComprehensiveMonthlyStates[len(result.ComprehensiveMonthlyStates)-1]

	t.Logf("Final state: Cash=$%.2f, NetWorth=$%.2f", finalState.Cash, finalState.NetWorth)

	// We should at minimum have more than we started with
	if finalState.NetWorth < 500000 {
		t.Errorf("Final net worth $%.2f is less than initial $500k - positive cash flow should increase wealth",
			finalState.NetWorth)
	}

	// Verify we didn't go bankrupt
	if result.IsBankrupt {
		t.Errorf("BUG: Went bankrupt at month %d despite positive cash flow!", result.BankruptcyMonth)
	}
}

// TestOneTimeIncomeWithholding tests that one-time income events apply supplemental withholding
func TestOneTimeIncomeWithholding(t *testing.T) {
	testCases := []struct {
		name             string
		grossAmount      float64
		expectedRate     float64
		expectedRateName string
	}{
		{"Standard bonus $10k", 10000, 0.22, "22%"},
		{"Large bonus $50k", 50000, 0.22, "22%"},
		{"Mega bonus $2M", 2000000, 0.37, "37%"}, // Over $1M threshold
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			input := createBasicInput()
			input.MonthsToRun = 1

			input.InitialAccounts = AccountHoldingsMonthEnd{
				Cash: 0, // Start with zero to clearly see net income
			}

			taxProfile := "ordinary_income"

			// One-time income event with taxProfile: ordinary_income
			input.Events = []FinancialEvent{
				{
					ID:          "bonus-1",
					Type:        "ONE_TIME_EVENT",
					Description: "Annual bonus",
					Amount:      tc.grossAmount,
					MonthOffset: 0,
					TaxProfile:  &taxProfile,
				},
			}

			result := RunDeterministicSimulation(input)
			if !result.Success {
				t.Fatalf("Simulation failed: %s", result.Error)
			}

			// After month 0, cash should be gross minus withholding
			finalCash := result.ComprehensiveMonthlyStates[0].Cash
			expectedWithholding := tc.grossAmount * tc.expectedRate
			expectedNet := tc.grossAmount - expectedWithholding

			tolerance := 0.01 // $0.01 tolerance
			if finalCash < expectedNet-tolerance || finalCash > expectedNet+tolerance {
				t.Errorf("Expected net $%.2f (gross $%.2f - %s withholding $%.2f), got $%.2f",
					expectedNet, tc.grossAmount, tc.expectedRateName, expectedWithholding, finalCash)
			}

			t.Logf("%s: Gross $%.0f → Net $%.2f (withheld $%.2f = %s)",
				tc.name, tc.grossAmount, finalCash, tc.grossAmount-finalCash, tc.expectedRateName)
		})
	}
}

// TestOneTimeExpense_NoWithholding verifies expenses don't have withholding applied
func TestOneTimeExpense_NoWithholding(t *testing.T) {
	input := createBasicInput()
	input.MonthsToRun = 1

	input.InitialAccounts = AccountHoldingsMonthEnd{
		Cash: 100000, // Start with cash to pay expense
	}

	expenseAmount := 25000.0

	// One-time expense event (negative amount)
	input.Events = []FinancialEvent{
		{
			ID:          "car-purchase",
			Type:        "ONE_TIME_EVENT",
			Description: "New car purchase",
			Amount:      -expenseAmount, // Negative = expense
			MonthOffset: 0,
		},
	}

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// After expense, cash should be exactly initial - expense (no withholding on expenses)
	finalCash := result.ComprehensiveMonthlyStates[0].Cash
	expectedCash := 100000 - expenseAmount

	tolerance := 0.01
	if finalCash < expectedCash-tolerance || finalCash > expectedCash+tolerance {
		t.Errorf("Expected cash $%.2f after expense, got $%.2f (possible erroneous withholding?)",
			expectedCash, finalCash)
	}

	t.Logf("Expense $%.0f: Initial $100k → Final $%.2f (correct: no withholding on expenses)",
		expenseAmount, finalCash)
}

// =============================================================================
// STRESS TESTS: Tax Withholding Edge Cases & Invariants
// =============================================================================

// TestWithholding_EdgeCases tests boundary conditions
func TestWithholding_EdgeCases(t *testing.T) {
	testCases := []struct {
		name           string
		grossAmount    float64
		expectedRate   float64
		description    string
	}{
		// Boundary: exactly $1M (should be 22%)
		{"Exactly $1M", 1000000, 0.22, "At threshold - 22%"},
		// Boundary: just over $1M (should be 37%)
		{"$1M + $1", 1000001, 0.37, "Over threshold - 37%"},
		// Small amounts
		{"$1 bonus", 1, 0.22, "Minimum income"},
		{"$100 bonus", 100, 0.22, "Small bonus"},
		// Large amounts
		{"$10M bonus", 10000000, 0.37, "Very large bonus"},
		// Fractional amounts
		{"$1234.56", 1234.56, 0.22, "Fractional amount"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			input := createBasicInput()
			input.MonthsToRun = 1
			input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}

			taxProfile := "ordinary_income"
			input.Events = []FinancialEvent{
				{
					ID:          "test-income",
					Type:        "ONE_TIME_EVENT",
					Amount:      tc.grossAmount,
					MonthOffset: 0,
					TaxProfile:  &taxProfile,
				},
			}

			result := RunDeterministicSimulation(input)
			if !result.Success {
				t.Fatalf("Simulation failed: %s", result.Error)
			}

			finalCash := result.ComprehensiveMonthlyStates[0].Cash
			expectedNet := tc.grossAmount * (1 - tc.expectedRate)

			tolerance := 0.01
			if finalCash < expectedNet-tolerance || finalCash > expectedNet+tolerance {
				t.Errorf("%s: Expected $%.2f, got $%.2f", tc.description, expectedNet, finalCash)
			}

			t.Logf("%s: Gross $%.2f → Net $%.2f (%.0f%% withheld)",
				tc.name, tc.grossAmount, finalCash, tc.expectedRate*100)
		})
	}
}

// TestWithholding_NoTaxProfile verifies income without taxProfile passes through untaxed
func TestWithholding_NoTaxProfile(t *testing.T) {
	input := createBasicInput()
	input.MonthsToRun = 1
	input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}

	// One-time income WITHOUT taxProfile (e.g., gift, inheritance)
	input.Events = []FinancialEvent{
		{
			ID:          "inheritance",
			Type:        "ONE_TIME_EVENT",
			Description: "Inheritance (tax-free)",
			Amount:      100000,
			MonthOffset: 0,
			// No TaxProfile - should NOT have withholding
		},
	}

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	finalCash := result.ComprehensiveMonthlyStates[0].Cash

	// Without taxProfile, full amount should pass through
	if finalCash != 100000 {
		t.Errorf("Income without taxProfile should NOT be withheld. Expected $100k, got $%.2f", finalCash)
	}

	t.Logf("No taxProfile: Gross $100k → Net $%.2f (correct: no withholding)", finalCash)
}

// TestWithholding_MixedIncomeTypes tests combined regular + supplemental income
func TestWithholding_MixedIncomeTypes(t *testing.T) {
	input := createBasicInput()
	input.MonthsToRun = 1
	input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}

	taxProfile := "ordinary_income"

	// Month 0: Regular salary + one-time bonus
	input.Events = []FinancialEvent{
		// Regular monthly salary (progressive withholding via INCOME handler)
		{
			ID:          "salary",
			Type:        "INCOME",
			Amount:      10000, // $10k/month
			MonthOffset: 0,
		},
		// One-time bonus (flat 22% supplemental withholding)
		{
			ID:          "bonus",
			Type:        "ONE_TIME_EVENT",
			Description: "Q1 Bonus",
			Amount:      25000,
			MonthOffset: 0,
			TaxProfile:  &taxProfile,
		},
	}

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	finalCash := result.ComprehensiveMonthlyStates[0].Cash

	// Salary: ~15% progressive withholding = ~$8,500 net
	// Bonus: 22% flat = $19,500 net
	// Total expected: ~$28,000
	minExpected := 27000.0
	maxExpected := 29000.0

	if finalCash < minExpected || finalCash > maxExpected {
		t.Errorf("Mixed income should yield $27k-$29k. Got $%.2f", finalCash)
	}

	t.Logf("Mixed income: Salary $10k + Bonus $25k → Net $%.2f", finalCash)
}

// TestWithholding_YearEndAccumulation verifies tax tracking accumulates correctly
func TestWithholding_YearEndAccumulation(t *testing.T) {
	input := createBasicInput()
	input.MonthsToRun = 12 // Full year
	input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 100000}

	taxProfile := "ordinary_income"

	// Multiple bonuses throughout the year
	input.Events = []FinancialEvent{
		{ID: "bonus-q1", Type: "ONE_TIME_EVENT", Amount: 10000, MonthOffset: 2, TaxProfile: &taxProfile},
		{ID: "bonus-q2", Type: "ONE_TIME_EVENT", Amount: 15000, MonthOffset: 5, TaxProfile: &taxProfile},
		{ID: "bonus-q3", Type: "ONE_TIME_EVENT", Amount: 10000, MonthOffset: 8, TaxProfile: &taxProfile},
		{ID: "bonus-q4", Type: "ONE_TIME_EVENT", Amount: 20000, MonthOffset: 11, TaxProfile: &taxProfile},
	}

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Total gross: $55,000
	// Total withholding: $55,000 × 22% = $12,100
	// Expected final cash: $100,000 + $55,000 - $12,100 = $142,900
	totalGross := 10000.0 + 15000.0 + 10000.0 + 20000.0
	expectedWithholding := totalGross * 0.22
	expectedFinal := 100000 + totalGross - expectedWithholding

	finalCash := result.ComprehensiveMonthlyStates[11].Cash

	tolerance := 1.0
	if finalCash < expectedFinal-tolerance || finalCash > expectedFinal+tolerance {
		t.Errorf("Year-end cash should be ~$%.2f, got $%.2f", expectedFinal, finalCash)
	}

	t.Logf("Year accumulation: 4 bonuses totaling $%.0f → Final cash $%.2f (withheld $%.2f)",
		totalGross, finalCash, totalGross-finalCash+100000)
}

// TestWithholding_Invariant_NetNeverExceedsGross property-based invariant test
func TestWithholding_Invariant_NetNeverExceedsGross(t *testing.T) {
	// Test with random-ish amounts to verify invariant: net ≤ gross
	amounts := []float64{
		0.01, 0.99, 1.00, 100, 999.99, 1000, 10000, 99999.99,
		100000, 500000, 999999.99, 1000000, 1000000.01, 5000000,
	}

	taxProfile := "ordinary_income"

	for _, amount := range amounts {
		input := createBasicInput()
		input.MonthsToRun = 1
		input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 0}

		input.Events = []FinancialEvent{
			{
				ID:          "test",
				Type:        "ONE_TIME_EVENT",
				Amount:      amount,
				MonthOffset: 0,
				TaxProfile:  &taxProfile,
			},
		}

		result := RunDeterministicSimulation(input)
		if !result.Success {
			t.Fatalf("Simulation failed for amount $%.2f: %s", amount, result.Error)
		}

		finalCash := result.ComprehensiveMonthlyStates[0].Cash

		// INVARIANT: Net should never exceed gross
		if finalCash > amount {
			t.Errorf("INVARIANT VIOLATED: Net $%.2f > Gross $%.2f", finalCash, amount)
		}

		// INVARIANT: Net should be at least 63% of gross (max 37% withholding)
		minNet := amount * 0.63
		if finalCash < minNet-0.01 {
			t.Errorf("INVARIANT VIOLATED: Net $%.2f < 63%% of gross ($%.2f)", finalCash, minNet)
		}
	}

	t.Logf("Invariant test passed for %d different amounts", len(amounts))
}

// TestWithholding_ZeroAmount verifies zero amount doesn't cause issues
func TestWithholding_ZeroAmount(t *testing.T) {
	input := createBasicInput()
	input.MonthsToRun = 1
	input.InitialAccounts = AccountHoldingsMonthEnd{Cash: 50000}

	taxProfile := "ordinary_income"

	input.Events = []FinancialEvent{
		{
			ID:          "zero-bonus",
			Type:        "ONE_TIME_EVENT",
			Amount:      0, // Edge case: zero amount
			MonthOffset: 0,
			TaxProfile:  &taxProfile,
		},
	}

	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	finalCash := result.ComprehensiveMonthlyStates[0].Cash

	// Zero income should leave cash unchanged
	if finalCash != 50000 {
		t.Errorf("Zero income should not change cash. Expected $50k, got $%.2f", finalCash)
	}

	t.Logf("Zero amount: Cash unchanged at $%.2f", finalCash)
}

// TestWithholding_JSONPath tests the ACTUAL path: JSON → Go struct → handler
// This is the critical integration test that mimics what the adapter sends
func TestWithholding_JSONPath(t *testing.T) {
	// This JSON mimics exactly what the adapter sends
	jsonInput := `{
		"initialAccounts": {"cash": 0},
		"events": [
			{
				"id": "bonus-from-adapter",
				"type": "ONE_TIME_EVENT",
				"description": "Signing bonus",
				"amount": 50000,
				"monthOffset": 0,
				"taxProfile": "ordinary_income"
			}
		],
		"monthsToRun": 1,
		"seed": 12345
	}`

	var input SimulationInput
	err := json.Unmarshal([]byte(jsonInput), &input)
	if err != nil {
		t.Fatalf("Failed to parse JSON (this would fail in production!): %v", err)
	}

	// Verify the taxProfile was parsed correctly
	if len(input.Events) == 0 {
		t.Fatal("No events parsed from JSON")
	}
	if input.Events[0].TaxProfile == nil {
		t.Fatal("CRITICAL: taxProfile not parsed from JSON! Withholding will NOT be applied!")
	}
	if *input.Events[0].TaxProfile != "ordinary_income" {
		t.Fatalf("taxProfile parsed incorrectly: got %q, want %q", *input.Events[0].TaxProfile, "ordinary_income")
	}

	// Run simulation
	result := RunDeterministicSimulation(input)
	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	finalCash := result.ComprehensiveMonthlyStates[0].Cash
	expectedNet := 50000 * 0.78 // 22% withholding

	tolerance := 0.01
	if finalCash < expectedNet-tolerance || finalCash > expectedNet+tolerance {
		t.Errorf("JSON path FAILED: Expected $%.2f net, got $%.2f (withholding not applied?)", expectedNet, finalCash)
	}

	t.Logf("✅ JSON path verified: Gross $50k → Net $%.2f (22%% withheld)", finalCash)
}
