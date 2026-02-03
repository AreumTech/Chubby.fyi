package main

import (
	"strings"
	"testing"
	"time"
)

// TestLedgerExportBasicTypes validates basic ledger export type functionality
func TestLedgerExportBasicTypes(t *testing.T) {
	// Create a simple mock engine and debugger
	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		VolatilitySPY:             0.15,
		TransactionCostPercentage: 0.001,
		TransactionCostMinimum:    1.0,
		TransactionCostMaximum:    10.0,
	}

	engine := NewSimulationEngine(config)
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	// Test that exporter was created correctly
	if exporter == nil {
		t.Fatal("Failed to create ledger exporter")
	}

	if exporter.simulationEngine == nil {
		t.Error("Simulation engine not set in exporter")
	}

	if exporter.debugger == nil {
		t.Error("Debugger not set in exporter")
	}

	t.Logf("✅ Ledger exporter created successfully")
}

// TestTransactionLedgerEntryCreation validates creating transaction ledger entries
func TestTransactionLedgerEntryCreation(t *testing.T) {
	// Create a sample transaction ledger entry
	entry := TransactionLedgerEntry{
		EntryID:          "test_1",
		Timestamp:        time.Now(),
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
		EventContext:     "portfolio_rebalancing",
		Notes:            "Test transaction for validation",
	}

	// Validate all fields are set correctly
	if entry.EntryID != "test_1" {
		t.Errorf("Expected EntryID 'test_1', got '%s'", entry.EntryID)
	}

	if entry.TransactionType != "sale" {
		t.Errorf("Expected TransactionType 'sale', got '%s'", entry.TransactionType)
	}

	if entry.GrossAmount != 1000.0 {
		t.Errorf("Expected GrossAmount 1000.0, got %.2f", entry.GrossAmount)
	}

	if entry.NetAmount != 997.50 {
		t.Errorf("Expected NetAmount 997.50, got %.2f", entry.NetAmount)
	}

	if entry.TaxCategory != "capital_gains" {
		t.Errorf("Expected TaxCategory 'capital_gains', got '%s'", entry.TaxCategory)
	}

	t.Logf("✅ TransactionLedgerEntry creation and validation working correctly")
}

// TestLedgerSummaryBasics validates basic ledger summary functionality
func TestLedgerSummaryBasics(t *testing.T) {
	// Create sample entries
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
	}

	config := StochasticModelConfig{}
	engine := NewSimulationEngine(config)
	debugger := NewSimulationDebugger()
	exporter := NewLedgerExporter(engine, debugger)

	// Generate summary
	summary := exporter.GenerateLedgerSummary(entries)

	// Validate summary statistics
	if summary.TotalEntries != 3 {
		t.Errorf("Expected 3 total entries, got %d", summary.TotalEntries)
	}

	if summary.TransactionsByType["sale"] != 1 {
		t.Errorf("Expected 1 sale transaction, got %d", summary.TransactionsByType["sale"])
	}

	if summary.TransactionsByType["purchase"] != 1 {
		t.Errorf("Expected 1 purchase transaction, got %d", summary.TransactionsByType["purchase"])
	}

	if summary.TransactionsByType["event"] != 1 {
		t.Errorf("Expected 1 event transaction, got %d", summary.TransactionsByType["event"])
	}

	expectedVolume := 15000.0 + 5000.0 + 5000.0 // Sum of all gross amounts
	if summary.TotalVolume != expectedVolume {
		t.Errorf("Expected total volume of %.2f, got %.2f", expectedVolume, summary.TotalVolume)
	}

	expectedCosts := 5.0 + 2.0 // Sum of transaction costs
	if summary.TotalTransactionCosts != expectedCosts {
		t.Errorf("Expected total costs of %.2f, got %.2f", expectedCosts, summary.TotalTransactionCosts)
	}

	if summary.TotalRealizedGains != 2000.0 {
		t.Errorf("Expected total gains of 2000, got %.2f", summary.TotalRealizedGains)
	}

	if summary.TotalTaxWithheld != 1200.0 {
		t.Errorf("Expected total tax withheld of 1200, got %.2f", summary.TotalTaxWithheld)
	}

	if summary.TimeSpanMonths != 2 {
		t.Errorf("Expected time span of 2 months, got %d", summary.TimeSpanMonths)
	}

	t.Logf("✅ Ledger summary generation working correctly")
	t.Logf("   Total entries: %d", summary.TotalEntries)
	t.Logf("   Total volume: $%.2f", summary.TotalVolume)
	t.Logf("   Total costs: $%.2f", summary.TotalTransactionCosts)
	t.Logf("   Time span: %d months", summary.TimeSpanMonths)
}

// TestCSVExportBasics validates basic CSV export functionality
func TestCSVExportBasics(t *testing.T) {
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

	config := StochasticModelConfig{}
	engine := NewSimulationEngine(config)
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

// TestTaxCategoryHelperFunction validates tax category determination logic
func TestTaxCategoryHelperFunction(t *testing.T) {
	config := StochasticModelConfig{}
	engine := NewSimulationEngine(config)
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
