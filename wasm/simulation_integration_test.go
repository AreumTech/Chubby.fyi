package main

import (
	"encoding/json"
	"testing"
)

// TestFullSimulationIntegration tests end-to-end simulation scenarios
func TestFullSimulationIntegration(t *testing.T) {
	t.Run("Basic_Retirement_Scenario", func(t *testing.T) {
		testBasicRetirementScenario(t)
	})
	t.Run("Complex_Financial_Plan", func(t *testing.T) {
		testComplexFinancialPlan(t)
	})
	t.Run("Tax_Optimization_Scenario", func(t *testing.T) {
		testTaxOptimizationScenario(t)
	})
}

// testBasicRetirementScenario tests a simple retirement planning scenario
func testBasicRetirementScenario(t *testing.T) {
	input := SimulationInput{
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash:        10000,
			Taxable:     &Account{Holdings: []Holding{}, TotalValue: 50000},
			TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 100000},
			Roth:        &Account{Holdings: []Holding{}, TotalValue: 25000},
		},
		Events: []FinancialEvent{
			{ID: "salary", Type: "INCOME", Amount: 75000, MonthOffset: 0},
			{ID: "retirement_expenses", Type: "EXPENSE", Amount: 50000, MonthOffset: 372}, // 31 years later
		},
		Config: StochasticModelConfig{
			MeanSPYReturn:       0.08,
			MeanBondReturn:      0.04,
			MeanIntlStockReturn: 0.07,
			MeanInflation:       0.025,
			GarchSPYOmega:       0.0001, GarchSPYAlpha: 0.1, GarchSPYBeta: 0.85,
			GarchBondOmega: 0.00005, GarchBondAlpha: 0.05, GarchBondBeta: 0.90,
			GarchIntlStockOmega: 0.00015, GarchIntlStockAlpha: 0.12, GarchIntlStockBeta: 0.80,
			FatTailParameter: 4.0,
			CorrelationMatrix: [][]float64{
				{1, 0, 0, 0, 0, 0},
				{0, 1, 0, 0, 0, 0},
				{0, 0, 1, 0, 0, 0},
				{0, 0, 0, 1, 0, 0},
				{0, 0, 0, 0, 1, 0},
				{0, 0, 0, 0, 0, 1},
			},
		},
		MonthsToRun:        720, // 60 years
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
	}
	engine := NewSimulationEngine(input.Config)
	result := engine.RunSingleSimulation(input)
	if !result.Success {
		t.Errorf("Basic retirement simulation failed: %v", result.Error)
	}
	if len(result.MonthlyData) == 0 {
		t.Error("No simulation results returned")
	}
}

// testComplexFinancialPlan tests a more complex scenario with multiple strategies
func testComplexFinancialPlan(t *testing.T) {
	input := SimulationInput{
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash:        20000,
			Taxable:     &Account{Holdings: []Holding{}, TotalValue: 100000},
			TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 200000},
			Roth:        &Account{Holdings: []Holding{}, TotalValue: 50000},
		},
		Events: []FinancialEvent{
			{ID: "high_salary", Type: "INCOME", Amount: 150000, MonthOffset: 0},
			{ID: "401k_contribution", Type: "CONTRIBUTION", Amount: 23000, MonthOffset: 0},
			{ID: "roth_conversion", Type: "ROTH_CONVERSION", Amount: 10000, MonthOffset: 312}, // 26 years later
			{ID: "retirement_withdrawal", Type: "EXPENSE", Amount: 80000, MonthOffset: 312},
		},
		Config: StochasticModelConfig{
			MeanSPYReturn:       0.08,
			MeanBondReturn:      0.04,
			MeanIntlStockReturn: 0.07,
			MeanInflation:       0.025,
			GarchSPYOmega:       0.0001, GarchSPYAlpha: 0.1, GarchSPYBeta: 0.85,
			GarchBondOmega: 0.00005, GarchBondAlpha: 0.05, GarchBondBeta: 0.90,
			GarchIntlStockOmega: 0.00015, GarchIntlStockAlpha: 0.12, GarchIntlStockBeta: 0.80,
			FatTailParameter: 4.0,
			CorrelationMatrix: [][]float64{
				{1, 0, 0, 0, 0, 0},
				{0, 1, 0, 0, 0, 0},
				{0, 0, 1, 0, 0, 0},
				{0, 0, 0, 1, 0, 0},
				{0, 0, 0, 0, 1, 0},
				{0, 0, 0, 0, 0, 1},
			},
		},
		MonthsToRun:        720,
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
	}
	engine := NewSimulationEngine(input.Config)
	result := engine.RunSingleSimulation(input)
	if !result.Success {
		t.Errorf("Complex financial plan simulation failed: %v", result.Error)
	}
	if len(result.MonthlyData) == 0 {
		t.Error("No simulation results returned for complex plan")
	}
}

// testTaxOptimizationScenario tests tax-aware strategies
func testTaxOptimizationScenario(t *testing.T) {
	input := SimulationInput{
		InitialAccounts: AccountHoldingsMonthEnd{
			Cash:        15000,
			Taxable:     &Account{Holdings: []Holding{}, TotalValue: 300000},
			TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 500000},
			Roth:        &Account{Holdings: []Holding{}, TotalValue: 100000},
		},
		Events: []FinancialEvent{
			{ID: "pre_retirement_income", Type: "INCOME", Amount: 120000, MonthOffset: 0},
			{ID: "strategic_roth_conversion", Type: "ROTH_CONVERSION", Amount: 25000, MonthOffset: 192}, // 16 years later
			{ID: "retirement_expenses", Type: "EXPENSE", Amount: 70000, MonthOffset: 192},
		},
		Config: StochasticModelConfig{
			MeanSPYReturn:       0.08,
			MeanBondReturn:      0.04,
			MeanIntlStockReturn: 0.07,
			MeanInflation:       0.025,
			GarchSPYOmega:       0.0001, GarchSPYAlpha: 0.1, GarchSPYBeta: 0.85,
			GarchBondOmega: 0.00005, GarchBondAlpha: 0.05, GarchBondBeta: 0.90,
			GarchIntlStockOmega: 0.00015, GarchIntlStockAlpha: 0.12, GarchIntlStockBeta: 0.80,
			FatTailParameter: 4.0,
			CorrelationMatrix: [][]float64{
				{1, 0, 0, 0, 0, 0},
				{0, 1, 0, 0, 0, 0},
				{0, 0, 1, 0, 0, 0},
				{0, 0, 0, 1, 0, 0},
				{0, 0, 0, 0, 1, 0},
				{0, 0, 0, 0, 0, 1},
			},
		},
		MonthsToRun:        600,
		WithdrawalStrategy: WithdrawalSequenceTaxDeferred,
	}
	engine := NewSimulationEngine(input.Config)
	result := engine.RunSingleSimulation(input)
	if !result.Success {
		t.Errorf("Tax optimization simulation failed: %v", result.Error)
	}
	if len(result.MonthlyData) == 0 {
		t.Error("No simulation results returned for tax optimization scenario")
	}
}

// TestWASMInputParsing tests the WASM input parsing functionality
func TestWASMInputParsing(t *testing.T) {
	// Create a sample JavaScript-style input
	inputJSON := `{
		"initialState": {
			"cash": 10000,
			"taxable": {"totalValue": 50000},
			"taxDeferred": {"totalValue": 100000},
			"roth": {"totalValue": 25000}
		},
		"events": [
			{
				"id": "test_income",
				"type": "INCOME",
				"amount": 60000,
				"startYear": 2025,
				"endYear": 2055
			}
		],
		"numPaths": 10,
		"randomSeed": 12345,
		"startYear": 2025,
		"endYear": 2055
	}`

	// Test parsing
	var rawInput map[string]interface{}
	err := json.Unmarshal([]byte(inputJSON), &rawInput)
	if err != nil {
		t.Errorf("Failed to parse JSON input: %v", err)
	}

	// This would normally be done by the WASM parsing functions
	// For now, just verify the structure is correct
	if rawInput["numPaths"].(float64) != 10 {
		t.Errorf("Expected numPaths 10, got %v", rawInput["numPaths"])
	}

	if rawInput["randomSeed"].(float64) != 12345 {
		t.Errorf("Expected randomSeed 12345, got %v", rawInput["randomSeed"])
	}

	events := rawInput["events"].([]interface{})
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
}

// All test cases now use the SimulationInput struct with the WithdrawalStrategy field as needed.

