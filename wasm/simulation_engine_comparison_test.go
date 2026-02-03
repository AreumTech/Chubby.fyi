package main

import (
	"fmt"
	"testing"
)

// TestQueueEngineValidation validates that the priority queue-based simulation engine
// produces consistent, correct financial simulations. This test ensures the queue engine
// is working properly after the legacy engine has been removed.
func TestQueueEngineValidation(t *testing.T) {
	// Use a simple but comprehensive test scenario
	testInput := createComparisonTestInput()

	// Run the simulation with the queue engine
	queueResult := runWithQueueEngine(testInput)

	// Validate the engine completed successfully
	if !queueResult.Success {
		t.Fatalf("Queue engine failed: %s", queueResult.Error)
	}

	// Validate we have the expected number of months
	expectedMonths := testInput.MonthsToRun
	if len(queueResult.MonthlyData) != expectedMonths {
		t.Fatalf("Expected %d months of data, got %d", expectedMonths, len(queueResult.MonthlyData))
	}

	simLogVerbose("🔍 [VALIDATION] Testing %d months of simulation data", len(queueResult.MonthlyData))

	// Validate month sequence is correct
	for i, monthData := range queueResult.MonthlyData {
		expectedMonthOffset := i
		if monthData.MonthOffset != expectedMonthOffset {
			t.Errorf("Month %d has incorrect offset: expected %d, got %d",
				i, expectedMonthOffset, monthData.MonthOffset)
		}
	}

	// Validate financial sanity checks
	for i, monthData := range queueResult.MonthlyData {
		// Check that accounts exist and have reasonable values
		if monthData.Accounts.Taxable == nil {
			t.Errorf("Month %d: Taxable account is nil", i)
		}
		if monthData.Accounts.TaxDeferred == nil {
			t.Errorf("Month %d: TaxDeferred account is nil", i)
		}
		if monthData.Accounts.Roth == nil {
			t.Errorf("Month %d: Roth account is nil", i)
		}

		// Net worth should be reasonable (not wildly negative or zero unless bankrupty)
		if monthData.NetWorth < -1000000 && queueResult.BankruptcyMonth == 0 {
			t.Errorf("Month %d: Unrealistic net worth $%.2f without bankruptcy", i, monthData.NetWorth)
		}

		// Log progress for key months
		if i%12 == 11 || i < 12 { // December of each year + first year
			fmt.Printf("📊 [MONTH-%d] Cash=$%.0f, NetWorth=$%.0f, Taxable=$%.0f\n",
				i, monthData.Accounts.Cash, monthData.NetWorth, monthData.Accounts.Taxable.TotalValue)
		}
	}

	// Calculate final net worth
	finalNetWorth := 0.0
	if len(queueResult.MonthlyData) > 0 {
		finalNetWorth = queueResult.MonthlyData[len(queueResult.MonthlyData)-1].NetWorth
	}

	// Final net worth should be reasonable for the test scenario
	if finalNetWorth <= 0 && queueResult.BankruptcyMonth == 0 {
		t.Errorf("Final net worth is $%.2f but no bankruptcy occurred", finalNetWorth)
	}

	fmt.Printf("✅ [VALIDATION-SUCCESS] Queue engine produces consistent financial results!\n")
	fmt.Printf("🎯 [FINAL-RESULT] Net Worth: $%.2f after %d months\n",
		finalNetWorth, len(queueResult.MonthlyData))
}

// createComparisonTestInput creates a comprehensive test scenario for engine comparison
func createComparisonTestInput() SimulationInput {
	// Create a realistic but simple test scenario
	return SimulationInput{
		MonthsToRun: 60, // 5 years - enough to test major functionality

		InitialAccounts: AccountHoldingsMonthEnd{
			Cash: 50000.0,
			Taxable: &Account{
				TotalValue: 100000.0,
				Holdings: []Holding{
					{
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  1000.0,
						CostBasisPerUnit:          80.0,
						CostBasisTotal:            80000.0,
						CurrentMarketPricePerUnit: 100.0,
						CurrentMarketValueTotal:   100000.0,
						// Purchased 1 year ago (timing now tracked in individual tax lots)
						UnrealizedGainLossTotal:   20000.0,
						Lots: []TaxLot{
							{
								AcquisitionDate:  -12,
								Quantity:         1000.0,
								CostBasisPerUnit: 80.0,
								CostBasisTotal:   80000.0,
								IsLongTerm:       true,
							},
						},
					},
				},
			},
			TaxDeferred: &Account{
				TotalValue: 200000.0,
				Holdings: []Holding{
					{
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  2000.0,
						CostBasisPerUnit:          100.0,
						CostBasisTotal:            200000.0,
						CurrentMarketPricePerUnit: 100.0,
						CurrentMarketValueTotal:   200000.0,
						UnrealizedGainLossTotal:   0.0,
						Lots: []TaxLot{
							{
								AcquisitionDate:  -24,
								Quantity:         2000.0,
								CostBasisPerUnit: 100.0,
								CostBasisTotal:   200000.0,
								IsLongTerm:       true,
							},
						},
					},
				},
			},
			Roth: &Account{
				TotalValue: 75000.0,
				Holdings: []Holding{
					{
						AssetClass:                AssetClassUSStocksTotalMarket,
						Quantity:                  750.0,
						CostBasisPerUnit:          100.0,
						CostBasisTotal:            75000.0,
						CurrentMarketPricePerUnit: 100.0,
						CurrentMarketValueTotal:   75000.0,
						UnrealizedGainLossTotal:   0.0,
						Lots: []TaxLot{
							{
								AcquisitionDate:  -12,
								Quantity:         750.0,
								CostBasisPerUnit: 100.0,
								CostBasisTotal:   75000.0,
								IsLongTerm:       true,
							},
						},
					},
				},
			},
		},

		Events: []FinancialEvent{
			// Monthly salary
			{
				ID:          "salary",
				Type:        "INCOME",
				Amount:      10000.0,
				MonthOffset: 0,
				Frequency:   "monthly",
				Metadata: map[string]interface{}{
					"frequency": "monthly",
					"endMonth":  float64(60),
				},
			},
			// Monthly expenses
			{
				ID:          "living_expenses",
				Type:        "EXPENSE",
				Amount:      8000.0,
				MonthOffset: 0,
				Frequency:   "monthly",
				Metadata: map[string]interface{}{
					"frequency": "monthly",
					"endMonth":  float64(60),
				},
			},
			// Monthly 401k contribution
			{
				ID:          "401k_contribution",
				Type:        "CONTRIBUTION",
				Amount:      2000.0,
				MonthOffset: 0,
				Frequency:   "monthly",
				// Note: TargetAccountType doesn't exist in FinancialEvent, using Metadata instead
				Metadata: map[string]interface{}{
					"targetAccountType": "tax_deferred",
					"frequency":         "monthly",
					"endMonth":          float64(60),
				},
			},
		},

		Config:             GetDefaultStochasticConfig(),
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
		// Note: InitialLiabilities field doesn't exist, debt management handled elsewhere
	}
}

// runWithQueueEngine runs the simulation using the new queue-based engine
func runWithQueueEngine(input SimulationInput) SimulationResult {
	fmt.Printf("🚀 [QUEUE-TEST] Running simulation with queue engine...\n")

	config := GetDefaultStochasticConfig()
	engine := NewSimulationEngine(config)

	// Directly call the queue loop method
	result := engine.runQueueSimulationLoop(input, input.InitialAccounts)

	finalNetWorth := 0.0
	if len(result.MonthlyData) > 0 {
		finalNetWorth = result.MonthlyData[len(result.MonthlyData)-1].NetWorth
	}
	fmt.Printf("🚀 [QUEUE-COMPLETE] %d months, final net worth: $%.2f\n",
		len(result.MonthlyData), finalNetWorth)

	return result
}

// TestQueueEngineBasicFunctionality tests that the queue engine can run successfully
func TestQueueEngineBasicFunctionality(t *testing.T) {
	fmt.Printf("🧪 [BASIC-TEST] Testing queue engine basic functionality...\n")

	input := createComparisonTestInput()
	result := runWithQueueEngine(input)

	if !result.Success {
		t.Fatalf("Queue engine failed: %s", result.Error)
	}

	if len(result.MonthlyData) == 0 {
		t.Fatalf("No monthly data generated")
	}

	finalNetWorth := 0.0
	if len(result.MonthlyData) > 0 {
		finalNetWorth = result.MonthlyData[len(result.MonthlyData)-1].NetWorth
	}
	if finalNetWorth <= 0 {
		t.Fatalf("Invalid final net worth: $%.2f", finalNetWorth)
	}

	fmt.Printf("✅ [BASIC-TEST] Queue engine basic functionality validated\n")
}
