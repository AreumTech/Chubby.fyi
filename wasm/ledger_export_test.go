package main

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// TestLedgerExportBasicFunctionality validates basic ledger export functionality
func TestLedgerExportBasicFunctionality(t *testing.T) {
	// Create a mock simulation engine and debugger
	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		VolatilitySPY:             0.15,
		TransactionCostPercentage: 0.001,
		TransactionCostMinimum:    1.0,
		TransactionCostMaximum:    10.0,
	}

	initialAccounts := AccountHoldingsMonthEnd{
		Taxable:     &Account{Holdings: []Holding{}, TotalValue: 10000},
		TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 0},
		Roth:        &Account{Holdings: []Holding{}, TotalValue: 0},
		Cash:        5000.0,
	}

	engine := NewSimulationEngine(config)
	debugger := NewSimulationDebugger()
	debugger.EnableDebugging(false, "basic")

	// Create mock debug session
	input := &SimulationInput{
		InitialAccounts: initialAccounts,
		Config:          config,
		MonthsToRun:     12,
	}

	session := debugger.StartDebugSession(input)

	// Add mock transactions
	debugger.LogTransaction(
		0, "sale", AssetClassUSStocksTotalMarket, LiquidityTierLiquid,
		100, 150.0, 5.0, 2000.0,
		"Rebalancing portfolio", AccountTypeTaxable,
	)

	debugger.LogTransaction(
		1, "purchase", AssetClassUSBondsTotalMarket, LiquidityTierLiquid,
		50, 100.0, 2.0, 0.0,
		"Portfolio allocation", AccountTypeTaxable,
	)

	// Add mock event
	mockEvent := &FinancialEvent{
		ID:     "salary_1",
		Type:   "INCOME",
		Amount: 5000.0,
		Metadata: map[string]interface{}{
			"source":      "Employment",
			"withholding": 1200.0,
		},
	}

	debugger.LogEvent(1, mockEvent, time.Millisecond*100, 3800.0, []string{})

	// Add mock monthly states
	state1 := MonthlyDebugState{
		MonthOffset:  0,
		CalendarDate: "Year 1, Month 1",
		Accounts:     initialAccounts,
		NetWorth:     15000.0,
		YTDTaxTracking: YTDTaxState{
			TaxWithholdingYTD: 1200.0,
			CapitalGainsYTD:   2000.0,
		},
	}

	state2 := MonthlyDebugState{
		MonthOffset:  1,
		CalendarDate: "Year 1, Month 2",
		Accounts:     initialAccounts,
		NetWorth:     15800.0,
		YTDTaxTracking: YTDTaxState{
			TaxWithholdingYTD: 2400.0,
			CapitalGainsYTD:   2000.0,
			OrdinaryIncomeYTD: 10000.0,
		},
	}

	session.MonthlyStates = []MonthlyDebugState{state1, state2}

	// Create ledger exporter
	exporter := NewLedgerExporter(engine, debugger)

	// Test generating complete ledger
	entries, err := exporter.GenerateCompleteLedger()
	if err != nil {
		t.Fatalf("Failed to generate ledger: %v", err)
	}

	if len(entries) < 2 {
		t.Errorf("Expected at least 2 ledger entries, got %d", len(entries))
	}

	t.Logf("✅ Generated %d ledger entries", len(entries))

	// Verify transaction entries
	foundSale := false
	foundPurchase := false
	foundEvent := false

	for _, entry := range entries {
		switch entry.TransactionType {
		case "sale":
			foundSale = true
			if entry.RealizedGainLoss != 2000.0 {
				t.Errorf("Expected realized gain of 2000, got %.2f", entry.RealizedGainLoss)
			}
			if entry.TaxCategory != "capital_gains" {
				t.Errorf("Expected tax category 'capital_gains', got '%s'", entry.TaxCategory)
			}
		case "purchase":
			foundPurchase = true
			if entry.TransactionCost != 2.0 {
				t.Errorf("Expected transaction cost of 2.0, got %.2f", entry.TransactionCost)
			}
		case "event":
			foundEvent = true
			if entry.TaxWithheld != 1200.0 {
				t.Errorf("Expected tax withheld of 1200, got %.2f", entry.TaxWithheld)
			}
			if entry.TaxCategory != "ordinary_income" {
				t.Errorf("Expected tax category 'ordinary_income', got '%s'", entry.TaxCategory)
			}
		}
	}

	if !foundSale {
		t.Error("Sale transaction not found in ledger")
	}
	if !foundPurchase {
		t.Error("Purchase transaction not found in ledger")
	}
	if !foundEvent {
		t.Error("Income event not found in ledger")
	}

	t.Logf("✅ All transaction types found in ledger")
}

// TestLedgerSummaryGeneration validates ledger summary statistics
func TestLedgerSummaryGeneration(t *testing.T) {
	// Create mock ledger entries
	entries := []TransactionLedgerEntry{
		{
			EntryID:          "txn_1",
			MonthOffset:      0,
			TransactionType:  "sale",
			AssetClass:       "SPY",
			LiquidityTier:    "LIQUID",
			AccountType:      "taxable",
			GrossAmount:      15000.0,
			TransactionCost:  5.0,
			NetAmount:        14995.0,
			RealizedGainLoss: 2000.0,
			TaxableAmount:    2000.0,
			TaxCategory:      "capital_gains",
		},
		{
			EntryID:         "txn_2",
			MonthOffset:     1,
			TransactionType: "purchase",
			AssetClass:      "Bonds",
			LiquidityTier:   "LIQUID",
			AccountType:     "taxable",
			GrossAmount:     5000.0,
			TransactionCost: 2.0,
			NetAmount:       5002.0,
			TaxCategory:     "non_taxable",
		},
		{
			EntryID:         "event_1",
			MonthOffset:     1,
			TransactionType: "event",
			GrossAmount:     5000.0,
			NetAmount:       3800.0,
			TaxWithheld:     1200.0,
			TaxableAmount:   5000.0,
			TaxCategory:     "ordinary_income",
		},
		{
			EntryID:          "txn_3",
			MonthOffset:      2,
			TransactionType:  "sale",
			AssetClass:       "SPY",
			LiquidityTier:    "LIQUID",
			AccountType:      "roth",
			GrossAmount:      8000.0,
			TransactionCost:  3.0,
			NetAmount:        7997.0,
			RealizedGainLoss: -500.0,
			TaxableAmount:    0.0, // Roth account
			TaxCategory:      "non_taxable",
		},
	}

	engine := NewSimulationEngine(StochasticModelConfig{})
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	// Generate summary
	summary := exporter.GenerateLedgerSummary(entries)

	// Validate summary statistics
	if summary.TotalEntries != 4 {
		t.Errorf("Expected 4 total entries, got %d", summary.TotalEntries)
	}

	if summary.TransactionsByType["sale"] != 2 {
		t.Errorf("Expected 2 sale transactions, got %d", summary.TransactionsByType["sale"])
	}

	if summary.TransactionsByType["purchase"] != 1 {
		t.Errorf("Expected 1 purchase transaction, got %d", summary.TransactionsByType["purchase"])
	}

	if summary.TransactionsByType["event"] != 1 {
		t.Errorf("Expected 1 event transaction, got %d", summary.TransactionsByType["event"])
	}

	expectedVolume := 15000.0 + 5000.0 + 5000.0 + 8000.0 // Sum of all gross amounts
	if summary.TotalVolume != expectedVolume {
		t.Errorf("Expected total volume of %.2f, got %.2f", expectedVolume, summary.TotalVolume)
	}

	expectedCosts := 5.0 + 2.0 + 3.0 // Sum of transaction costs
	if summary.TotalTransactionCosts != expectedCosts {
		t.Errorf("Expected total costs of %.2f, got %.2f", expectedCosts, summary.TotalTransactionCosts)
	}

	if summary.TotalRealizedGains != 2000.0 {
		t.Errorf("Expected total gains of 2000, got %.2f", summary.TotalRealizedGains)
	}

	if summary.TotalRealizedLosses != -500.0 {
		t.Errorf("Expected total losses of -500, got %.2f", summary.TotalRealizedLosses)
	}

	if summary.TotalTaxWithheld != 1200.0 {
		t.Errorf("Expected total tax withheld of 1200, got %.2f", summary.TotalTaxWithheld)
	}

	// Verify breakdown by liquidity tier
	if summary.LiquidityBreakdown["LIQUID"] == 0 {
		t.Error("Expected LIQUID tier breakdown to have transactions")
	}

	// Verify breakdown by tax category
	if summary.TaxCategoryBreakdown["capital_gains"] != 2000.0 {
		t.Errorf("Expected capital gains of 2000, got %.2f", summary.TaxCategoryBreakdown["capital_gains"])
	}

	if summary.TaxCategoryBreakdown["ordinary_income"] != 5000.0 {
		t.Errorf("Expected ordinary income of 5000, got %.2f", summary.TaxCategoryBreakdown["ordinary_income"])
	}

	if summary.TimeSpanMonths != 3 {
		t.Errorf("Expected time span of 3 months, got %d", summary.TimeSpanMonths)
	}

	t.Logf("✅ Ledger summary generation working correctly")
	t.Logf("   Total entries: %d", summary.TotalEntries)
	t.Logf("   Total volume: $%.2f", summary.TotalVolume)
	t.Logf("   Total costs: $%.2f", summary.TotalTransactionCosts)
	t.Logf("   Time span: %d months", summary.TimeSpanMonths)
}

// TestCSVExport validates CSV export functionality
func TestCSVExport(t *testing.T) {
	entries := []TransactionLedgerEntry{
		{
			EntryID:          "test_1",
			MonthOffset:      0,
			CalendarDate:     "Year 1, Month 1",
			TransactionType:  "sale",
			Description:      "Test sale transaction",
			AssetClass:       "SPY",
			LiquidityTier:    "LIQUID",
			AccountType:      "taxable",
			GrossAmount:      1000.0,
			TransactionCost:  2.50,
			NetAmount:        997.50,
			RealizedGainLoss: 200.0,
			TaxableAmount:    200.0,
			TaxCategory:      "capital_gains",
			CashBalance:      5000.0,
			NetWorth:         15000.0,
		},
	}

	engine := NewSimulationEngine(StochasticModelConfig{})
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	csvData, err := exporter.ExportToCSV(entries)
	if err != nil {
		t.Fatalf("Failed to export CSV: %v", err)
	}

	if csvData == "" {
		t.Error("CSV export produced empty result")
	}

	// Verify CSV contains expected headers
	expectedHeaders := []string{"Entry_ID", "Transaction_Type", "Asset_Class", "Net_Worth_After"}
	for _, header := range expectedHeaders {
		if !strings.Contains(csvData, header) {
			t.Errorf("CSV missing expected header: %s", header)
		}
	}

	// Verify CSV contains data values
	expectedValues := []string{"test_1", "sale", "SPY", "15000.00"}
	for _, value := range expectedValues {
		if !strings.Contains(csvData, value) {
			t.Errorf("CSV missing expected value: %s", value)
		}
	}

	lines := strings.Split(strings.TrimSpace(csvData), "\n")
	if len(lines) != 2 { // Header + 1 data row
		t.Errorf("Expected 2 CSV lines, got %d", len(lines))
	}

	t.Logf("✅ CSV export working correctly")
	t.Logf("   Generated %d lines of CSV data", len(lines))
}

// TestJSONExport validates JSON export functionality
func TestJSONExport(t *testing.T) {
	entries := []TransactionLedgerEntry{
		{
			EntryID:         "json_test_1",
			MonthOffset:     0,
			TransactionType: "purchase",
			GrossAmount:     500.0,
			NetAmount:       500.0,
		},
	}

	summary := LedgerSummary{
		TotalEntries:          1,
		TotalVolume:           500.0,
		TotalTransactionCosts: 0.0,
		TransactionsByType:    map[string]int{"purchase": 1},
		TimeSpanMonths:        1,
	}

	engine := NewSimulationEngine(StochasticModelConfig{})
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	jsonData, err := exporter.ExportToJSON(entries, summary)
	if err != nil {
		t.Fatalf("Failed to export JSON: %v", err)
	}

	if jsonData == "" {
		t.Error("JSON export produced empty result")
	}

	// Parse JSON to verify structure
	var exportData map[string]interface{}
	err = json.Unmarshal([]byte(jsonData), &exportData)
	if err != nil {
		t.Fatalf("Failed to parse exported JSON: %v", err)
	}

	// Verify metadata exists
	metadata, ok := exportData["metadata"].(map[string]interface{})
	if !ok {
		t.Error("JSON missing metadata section")
	}

	if entryCount, ok := metadata["entryCount"].(float64); !ok || int(entryCount) != 1 {
		t.Error("JSON metadata missing or incorrect entryCount")
	}

	// Verify entries exist
	entriesData, ok := exportData["entries"].([]interface{})
	if !ok {
		t.Error("JSON missing entries array")
	}

	if len(entriesData) != 1 {
		t.Errorf("Expected 1 entry in JSON, got %d", len(entriesData))
	}

	// Verify entry structure
	entry, ok := entriesData[0].(map[string]interface{})
	if !ok {
		t.Error("Entry is not a proper JSON object")
	}

	if entry["entryId"] != "json_test_1" {
		t.Errorf("Expected entryId 'json_test_1', got %v", entry["entryId"])
	}

	if entry["transactionType"] != "purchase" {
		t.Errorf("Expected transactionType 'purchase', got %v", entry["transactionType"])
	}

	t.Logf("✅ JSON export working correctly")
	t.Logf("   Generated JSON with metadata and %d entries", len(entriesData))
}

// TestTaxCategoryDetermination validates tax category logic
func TestTaxCategoryDetermination(t *testing.T) {
	engine := NewSimulationEngine(StochasticModelConfig{})
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	testCases := []struct {
		txn      TransactionRecord
		expected string
	}{
		{
			txn:      TransactionRecord{TransactionType: "sale", RealizedGainLoss: 1000.0},
			expected: "capital_gains",
		},
		{
			txn:      TransactionRecord{TransactionType: "sale", RealizedGainLoss: -500.0},
			expected: "capital_losses",
		},
		{
			txn:      TransactionRecord{TransactionType: "sale", RealizedGainLoss: 0.0},
			expected: "sale_no_gain_loss",
		},
		{
			txn:      TransactionRecord{TransactionType: "dividend"},
			expected: "dividend_income",
		},
		{
			txn:      TransactionRecord{TransactionType: "purchase"},
			expected: "non_taxable",
		},
		{
			txn:      TransactionRecord{TransactionType: "other"},
			expected: "other",
		},
	}

	for i, tc := range testCases {
		result := exporter.determineTaxCategory(tc.txn)
		if result != tc.expected {
			t.Errorf("Test case %d: expected tax category '%s', got '%s'", i, tc.expected, result)
		}
	}

	t.Logf("✅ Tax category determination working correctly")
}

// TestLedgerIntegrationWithDebugger validates integration between ledger and debugger
func TestLedgerIntegrationWithDebugger(t *testing.T) {
	// This test would normally run a full simulation with debugging enabled
	// and verify that the ledger export captures all transactions correctly

	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		VolatilitySPY:             0.15,
		TransactionCostPercentage: 0.001,
		TransactionCostMinimum:    1.0,
		TransactionCostMaximum:    10.0,
	}

	_ = AccountHoldingsMonthEnd{
		Taxable:     &Account{Holdings: []Holding{}, TotalValue: 10000},
		TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 5000},
		Roth:        &Account{Holdings: []Holding{}, TotalValue: 2000},
		Cash:        3000.0,
	}

	debugger := NewSimulationDebugger()
	debugger.EnableDebugging(false, "detailed")

	engine := NewSimulationEngine(config)
	// Normally would integrate debugger with engine here

	exporter := NewLedgerExporter(engine, debugger)

	// Verify exporter is properly configured
	if exporter.simulationEngine == nil {
		t.Error("Simulation engine not properly set in exporter")
	}

	if exporter.debugger == nil {
		t.Error("Debugger not properly set in exporter")
	}

	t.Logf("✅ Ledger export integration configured correctly")
}
