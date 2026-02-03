//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"os"
)

// Simple test to verify Accelerator scenario calculations
func main() {
	fmt.Println("🧪 Testing Accelerator Persona WASM Simulation")
	fmt.Println("==============================================")

	// Create Accelerator-like config
	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		MeanBondReturn:            0.04,
		MeanIntlStockReturn:       0.07,
		MeanInflation:             0.025,
		MeanHomeValueAppreciation: 0.04,

		VolatilitySPY:       0.175,
		VolatilityBond:      0.045,
		VolatilityIntlStock: 0.20,
		VolatilityInflation: 0.015,
		VolatilityHomeValue: 0.10,

		GarchSPYOmega: 0.0001,
		GarchSPYAlpha: 0.1,
		GarchSPYBeta:  0.85,

		GarchBondOmega: 0.00005,
		GarchBondAlpha: 0.05,
		GarchBondBeta:  0.90,

		// Minimal correlation matrix
		CorrelationMatrix: [][]float64{
			{1.00, -0.15, 0.05, 0.75, 0.20, 0.30},
			{-0.15, 1.00, -0.25, -0.10, -0.05, 0.10},
			{0.05, -0.25, 1.00, 0.10, 0.40, 0.50},
			{0.75, -0.10, 0.10, 1.00, 0.25, 0.35},
			{0.20, -0.05, 0.40, 0.25, 1.00, 0.60},
			{0.30, 0.10, 0.50, 0.35, 0.60, 1.00},
		},

		Guardrails: GuardrailConfig{
			UpperGuardrail:   0.06,
			LowerGuardrail:   0.03,
			SpendingCutPct:   0.1,
			SpendingBonusPct: 0.05,
		},
	}

	// Mock Accelerator persona initial accounts (corrected values)
	initialAccounts := AccountHoldingsMonthEnd{
		Cash: 50000,
		Taxable: &AccountHolding{
			TotalValue: 40000,
			Holdings: []HoldingData{
				{
					Symbol:                    "VTI",
					Quantity:                  200,
					CurrentMarketPricePerUnit: 200,
					CurrentMarketValueTotal:   40000,
					CostBasisTotal:            36000,
					UnrealizedGainLossTotal:   4000,
				},
			},
		},
		TaxDeferred: &AccountHolding{
			TotalValue: 100000,
			Holdings: []HoldingData{
				{
					Symbol:                    "VTI",
					Quantity:                  500,
					CurrentMarketPricePerUnit: 200,
					CurrentMarketValueTotal:   100000,
					CostBasisTotal:            75000,
					UnrealizedGainLossTotal:   25000,
				},
			},
		},
		Roth: &AccountHolding{
			TotalValue: 26000,
			Holdings: []HoldingData{
				{
					Symbol:                    "VXUS",
					Quantity:                  400,
					CurrentMarketPricePerUnit: 65,
					CurrentMarketValueTotal:   26000,
					CostBasisTotal:            24000,
					UnrealizedGainLossTotal:   2000,
				},
			},
		},
	}

	// Calculate starting assets
	startingAssets := initialAccounts.Cash +
		initialAccounts.Taxable.TotalValue +
		initialAccounts.TaxDeferred.TotalValue +
		initialAccounts.Roth.TotalValue

	fmt.Printf("   Cash: $%.0f\n", initialAccounts.Cash)
	fmt.Printf("   Taxable: $%.0f\n", initialAccounts.Taxable.TotalValue)
	fmt.Printf("   Tax Deferred: $%.0f\n", initialAccounts.TaxDeferred.TotalValue)
	fmt.Printf("   Roth: $%.0f\n", initialAccounts.Roth.TotalValue)

	// Expected: $216,000 total
	if startingAssets != 216000 {
		os.Exit(1)
	} else {
	}

	// Mock Accelerator events (preprocessed)
	events := []FinancialEvent{
		{
			ID:          "monthly-expenses",
			Type:        EventTypeRecurringExpense,
			MonthOffset: 0,
			Amount:      6000, // Monthly expenses
		},
		{
			ID:          "annual-income",
			Type:        EventTypeIncome,
			MonthOffset: 0,
			Amount:      280000, // Annual income
		},
		{
			ID:          "401k-contribution",
			Type:        EventTypeScheduledContribution,
			MonthOffset: 0,
			Amount:      23000, // Annual 401k contribution
		},
	}

	fmt.Printf("\n📋 Events:\n")
	for _, event := range events {
		fmt.Printf("   %s: $%.0f (%s)\n", event.ID, event.Amount, event.Type)
	}

	// Create simulation input
	input := SimulationInput{
		InitialAccounts: initialAccounts,
		Events:          events,
		Config:          config,
		MonthsToRun:     12, // 1 year
	}

	// Run simulation
	fmt.Printf("\nRunning 1-year simulation...\n")
	engine := NewSimulationEngine(config)
	result := engine.RunSingleSimulation(input)

	if result.Success {

		if len(result.MonthlyData) > 0 {
			// Check month 0 and month 11 (Year 1 end)
			month0 := result.MonthlyData[0]
			month11 := result.MonthlyData[len(result.MonthlyData)-1]

			fmt.Printf("   Net Worth: $%.0f\n", month0.NetWorth)
			fmt.Printf("   Cash: $%.0f\n", month0.Accounts.Cash)

			fmt.Printf("   Net Worth: $%.0f\n", month11.NetWorth)
			fmt.Printf("   Cash: $%.0f\n", month11.Accounts.Cash)

			// Check for inflation bug
			if month11.NetWorth > 2000000 {
				os.Exit(1)
			} else if month11.NetWorth > 200000 && month11.NetWorth < 500000 {
			} else {
				fmt.Printf("🤔 Year 1 net worth seems unexpected: $%.0f\n", month11.NetWorth)
			}

			// Show growth details
			growth := month11.NetWorth - month0.NetWorth
			fmt.Printf("Net worth growth: $%.0f\n", growth)
		}
	} else {
		os.Exit(1)
	}

	fmt.Printf("\n🎉 WASM simulation test completed!\n")
}
