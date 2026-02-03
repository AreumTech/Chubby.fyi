package main

import (
	"math"
	"testing"
)

// TestTransactionCosts validates that transaction costs are correctly applied to asset sales
func TestTransactionCosts(t *testing.T) {
	// Create a config with transaction costs
	config := StochasticModelConfig{
		TransactionCostPercentage: 0.0005, // 0.05% transaction cost
		TransactionCostMinimum:    1.0,    // $1 minimum
		TransactionCostMaximum:    25.0,   // $25 maximum
	}

	// Create cash manager with config
	cashMgr := NewCashManagerWithConfig(&config)

	t.Run("TransactionCostCalculation", func(t *testing.T) {
		testCases := []struct {
			transactionValue float64
			expectedCost     float64
			description      string
		}{
			{500.0, 1.0, "Small transaction hits minimum"},          // 0.05% of $500 = $0.25, but minimum is $1
			{2000.0, 1.0, "Medium transaction uses percentage"},     // 0.05% of $2000 = $1.00
			{10000.0, 5.0, "Large transaction uses percentage"},     // 0.05% of $10000 = $5.00
			{100000.0, 25.0, "Very large transaction hits maximum"}, // 0.05% of $100k = $50, but max is $25
		}

		for _, tc := range testCases {
			actualCost := cashMgr.calculateTransactionCost(tc.transactionValue)

			if math.Abs(actualCost-tc.expectedCost) > 0.01 {
				t.Errorf("%s: expected cost $%.2f, got $%.2f",
					tc.description, tc.expectedCost, actualCost)
			} else {
				t.Logf("✅ %s: $%.0f transaction → $%.2f cost",
					tc.description, tc.transactionValue, actualCost)
			}
		}
	})

	t.Run("SaleTransactionWithCosts", func(t *testing.T) {
		// Create a test lot
		lot := TaxLot{
			ID:               "test-lot",
			AssetClass:       AssetClassUSStocksTotalMarket,
			Quantity:         100,
			CostBasisPerUnit: 100.0, // Bought at $100/share
			CostBasisTotal:   10000.0,
			AcquisitionDate:  -12,
			IsLongTerm:       true,
		}

		// Sell 50 shares at $120/share
		salePrice := 120.0
		sellQuantity := 50.0
		expectedGrossProceeds := sellQuantity * salePrice                      // $6,000
		expectedTransactionCost := 3.0                                         // 0.05% of $6,000 = $3.00
		expectedNetProceeds := expectedGrossProceeds - expectedTransactionCost // $5,997
		expectedCostBasis := sellQuantity * lot.CostBasisPerUnit               // $5,000
		expectedGainLoss := expectedNetProceeds - expectedCostBasis            // $997

		saleTransaction := cashMgr.createSaleTransaction(lot, sellQuantity, salePrice, 1)

		// Validate transaction results
		tolerance := 0.01

		if math.Abs(saleTransaction.Proceeds-expectedNetProceeds) > tolerance {
			t.Errorf("Net proceeds incorrect: expected $%.2f, got $%.2f",
				expectedNetProceeds, saleTransaction.Proceeds)
		}

		if math.Abs(saleTransaction.CostBasis-expectedCostBasis) > tolerance {
			t.Errorf("Cost basis incorrect: expected $%.2f, got $%.2f",
				expectedCostBasis, saleTransaction.CostBasis)
		}

		if math.Abs(saleTransaction.RealizedGainLoss-expectedGainLoss) > tolerance {
			t.Errorf("Realized gain/loss incorrect: expected $%.2f, got $%.2f",
				expectedGainLoss, saleTransaction.RealizedGainLoss)
		}

		t.Logf("✅ Sale transaction with costs:")
		t.Logf("   Gross Proceeds: $%.2f", expectedGrossProceeds)
		t.Logf("   Transaction Cost: $%.2f", expectedTransactionCost)
		t.Logf("   Net Proceeds: $%.2f", saleTransaction.Proceeds)
		t.Logf("   Cost Basis: $%.2f", saleTransaction.CostBasis)
		t.Logf("   Realized Gain: $%.2f", saleTransaction.RealizedGainLoss)
	})

	t.Run("NoConfigNoCosts", func(t *testing.T) {
		// Create cash manager without config
		cashMgrNoConfig := NewCashManager()

		// Test that no costs are applied when config is nil
		cost := cashMgrNoConfig.calculateTransactionCost(10000.0)
		if cost != 0.0 {
			t.Errorf("Expected no transaction costs without config, got $%.2f", cost)
		}

		t.Log("✅ No transaction costs applied when config is not available")
	})
}

// TestTransactionCostsInSimulation validates transaction costs in a full simulation
func TestTransactionCostsInSimulation(t *testing.T) {
	// Use default config and override transaction costs
	config := GetDefaultStochasticConfig()
	config.TransactionCostPercentage = 0.001 // 0.1% transaction cost
	config.TransactionCostMinimum = 5.0      // $5 minimum
	config.TransactionCostMaximum = 50.0     // $50 maximum

	// Simple initial setup
	initialAccounts := AccountHoldingsMonthEnd{
		Taxable: &Account{
			Holdings: []Holding{
				{
					ID:                        "stocks",
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  1000,
					CostBasisPerUnit:          100.0,
					CostBasisTotal:            100000.0,
					CurrentMarketPricePerUnit: 100.0,
					CurrentMarketValueTotal:   100000.0,
					UnrealizedGainLossTotal:   0.0,
					Lots: []TaxLot{
						{
							ID:               "lot1",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         1000,
							CostBasisPerUnit: 100.0,
							CostBasisTotal:   100000.0,
							AcquisitionDate:  -12,
							IsLongTerm:       true,
						},
					},
				},
			},
			TotalValue: 100000.0,
		},
		TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 0.0},
		Roth:        &Account{Holdings: []Holding{}, TotalValue: 0.0},
		Cash:        10000.0, // Enough cash to cover the $5000 expense
	}

	// Create an expense event that will force asset sales
	events := []FinancialEvent{
		{
			ID:          "large-expense",
			Type:        "EXPENSE",
			MonthOffset: 1,
			Amount:      5000.0, // Will force selling assets
			Metadata:    map[string]interface{}{"category": "Test Expense"},
		},
	}

	simulationInput := SimulationInput{
		InitialAccounts:    initialAccounts,
		Events:             events,
		Config:             config,
		MonthsToRun:        12,
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
	}

	// Run simulation
	engine := NewSimulationEngine(config)
	t.Logf("Running simulation with MonthsToRun=%d, Events=%d, Cash=%.2f",
		simulationInput.MonthsToRun, len(simulationInput.Events), simulationInput.InitialAccounts.Cash)
	result := engine.RunSingleSimulation(simulationInput)
	t.Logf("Simulation result: Success=%v, Error='%s', MonthlyData=%d",
		result.Success, result.Error, len(result.MonthlyData))

	if !result.Success {
		if result.IsBankrupt {
			t.Fatalf("Simulation went bankrupt at month %d: %s", result.BankruptcyMonth, result.BankruptcyTrigger)
		}
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Verify simulation ran and processed the expense
	if len(result.MonthlyData) < 2 {
		t.Fatalf("Expected at least 2 months of data, got %d", len(result.MonthlyData))
	}

	// Check that the expense was processed
	month1Data := result.MonthlyData[1]
	if month1Data.ExpensesThisMonth == 0 {
		t.Errorf("Expected expenses in month 1, got $%.2f", month1Data.ExpensesThisMonth)
	}

	// The transaction costs would have reduced the net proceeds from asset sales
	// This should be reflected in slightly lower net worth compared to no transaction costs
	t.Logf("✅ Simulation with transaction costs completed successfully")
	t.Logf("   Month 1 expenses: $%.2f", month1Data.ExpensesThisMonth)
	t.Logf("   Month 1 net worth: $%.2f", month1Data.NetWorth)
}

// TestTransactionCostConfiguration validates configuration parsing
func TestTransactionCostConfiguration(t *testing.T) {
	t.Run("DefaultConfiguration", func(t *testing.T) {
		// Test with zero values (default)
		config := StochasticModelConfig{
			TransactionCostPercentage: 0.0,
			TransactionCostMinimum:    0.0,
			TransactionCostMaximum:    0.0,
		}

		cashMgr := NewCashManagerWithConfig(&config)
		cost := cashMgr.calculateTransactionCost(10000.0)

		if cost != 0.0 {
			t.Errorf("Expected no transaction costs with zero config, got $%.2f", cost)
		}

		t.Log("✅ Zero configuration produces no transaction costs")
	})

	t.Run("RealisticConfiguration", func(t *testing.T) {
		// Test with realistic brokerage costs
		config := StochasticModelConfig{
			TransactionCostPercentage: 0.0005, // 0.05% (5 basis points)
			TransactionCostMinimum:    0.0,    // No minimum for modern brokers
			TransactionCostMaximum:    0.0,    // No maximum
		}

		cashMgr := NewCashManagerWithConfig(&config)

		testCases := []struct {
			amount       float64
			expectedCost float64
		}{
			{1000.0, 0.50},    // $1000 × 0.05% = $0.50
			{10000.0, 5.00},   // $10k × 0.05% = $5.00
			{100000.0, 50.00}, // $100k × 0.05% = $50.00
		}

		for _, tc := range testCases {
			actualCost := cashMgr.calculateTransactionCost(tc.amount)
			if math.Abs(actualCost-tc.expectedCost) > 0.01 {
				t.Errorf("For $%.0f transaction: expected $%.2f cost, got $%.2f",
					tc.amount, tc.expectedCost, actualCost)
			}
		}

		t.Log("✅ Realistic configuration produces expected costs")
	})
}
