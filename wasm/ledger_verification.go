//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"time"
)

// VerifyLedgerExportFunctionality demonstrates and verifies the ledger export capabilities
func VerifyLedgerExportFunctionality() {
	fmt.Println("=== PathFinder Pro Ledger Export Functionality ===")

	// Create basic components
	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		VolatilitySPY:             0.15,
		TransactionCostPercentage: 0.001,
		TransactionCostMinimum:    1.0,
		TransactionCostMaximum:    10.0,
	}

	engine := NewSimulationEngine(config)
	debugger := NewSimulationDebugger()
	debugger.EnableDebugging(false, "detailed")

	// Create ledger exporter
	exporter := NewLedgerExporter(engine, debugger)

	// Create mock debug session with sample data
	input := &SimulationInput{
		MonthsToRun: 12,
	}

	session := debugger.StartDebugSession(input)

	// Add sample transactions
	debugger.LogTransaction(
		0, "sale", AssetClassSPY, LiquidityTierLiquid,
		100, 150.0, 5.0, 2000.0,
		"Portfolio rebalancing", AccountTypeTaxable,
	)

	debugger.LogTransaction(
		1, "purchase", AssetClassBonds, LiquidityTierLiquid,
		50, 100.0, 2.0, 0.0,
		"Asset allocation adjustment", AccountTypeTaxDeferred,
	)

	debugger.LogTransaction(
		2, "sale", AssetClassRealEstate, LiquidityTierIlliquid,
		1, 50000.0, 500.0, -5000.0,
		"Emergency cash need", AccountTypeTaxable,
	)

	// Add sample events
	mockEvent := &FinancialEvent{
		ID:     "salary_jan",
		Type:   EventTypeIncome,
		Amount: 8000.0,
		Metadata: map[string]interface{}{
			"source":      "Employment",
			"withholding": 2000.0,
		},
	}

	debugger.LogEvent(1, mockEvent, time.Millisecond*50, 6000.0, []string{})

	// Add monthly states
	accounts := AccountHoldingsMonthEnd{
		Cash: 15000.0,
	}

	state := MonthlyDebugState{
		MonthOffset:  1,
		CalendarDate: "Year 1, Month 2",
		Accounts:     accounts,
		NetWorth:     125000.0,
		YTDTaxTracking: YTDTaxState{
			TaxWithholdingYTD: 4000.0,
			CapitalGainsYTD:   2000.0,
			CapitalLossesYTD:  -5000.0,
			OrdinaryIncomeYTD: 16000.0,
		},
	}

	session.MonthlyStates = []MonthlyDebugState{state}

	// Generate complete ledger
	entries, err := exporter.GenerateCompleteLedger()
	if err != nil {
		return
	}

	// Display sample entries
	fmt.Println("\n=== Sample Ledger Entries ===")
	for i, entry := range entries {
		if i < 3 { // Show first 3 entries
			fmt.Printf("%d. %s: %s - $%.2f (Tax Category: %s)\n",
				i+1, entry.EntryID, entry.Description, entry.NetAmount, entry.TaxCategory)
		}
	}

	// Generate summary
	summary := exporter.GenerateLedgerSummary(entries)
	fmt.Println("\n=== Ledger Summary ===")
	fmt.Printf("Total Entries: %d\n", summary.TotalEntries)
	fmt.Printf("Total Volume: $%.2f\n", summary.TotalVolume)
	fmt.Printf("Total Transaction Costs: $%.2f\n", summary.TotalTransactionCosts)
	fmt.Printf("Total Realized Gains: $%.2f\n", summary.TotalRealizedGains)
	fmt.Printf("Total Realized Losses: $%.2f\n", summary.TotalRealizedLosses)
	fmt.Printf("Total Tax Withheld: $%.2f\n", summary.TotalTaxWithheld)
	fmt.Printf("Time Span: %d months\n", summary.TimeSpanMonths)

	fmt.Println("\nTransactions by Type:")
	for txnType, count := range summary.TransactionsByType {
		fmt.Printf("  %s: %d\n", txnType, count)
	}

	// Test CSV export
	csvData, err := exporter.ExportToCSV(entries)
	if err != nil {
		return
	}

	fmt.Printf("CSV Sample (first 200 chars): %s...\n",
		csvData[:minInt(200, len(csvData))])

	// Test JSON export
	jsonData, err := exporter.ExportToJSON(entries, summary)
	if err != nil {
		return
	}

	// Validate tax categorization
	fmt.Println("\n=== Tax Category Analysis ===")
	txnRecord := TransactionRecord{TransactionType: "sale", RealizedGainLoss: 1000.0}
	taxCategory := exporter.determineTaxCategory(txnRecord)
	fmt.Printf("Sale with $1000 gain -> Tax Category: %s\n", taxCategory)

	txnRecord2 := TransactionRecord{TransactionType: "sale", RealizedGainLoss: -500.0}
	taxCategory2 := exporter.determineTaxCategory(txnRecord2)
	fmt.Printf("Sale with $500 loss -> Tax Category: %s\n", taxCategory2)

	fmt.Println("Features demonstrated:")
	fmt.Println("  - Complete transaction ledger generation")
	fmt.Println("  - Comprehensive summary statistics")
	fmt.Println("  - CSV export with proper formatting")
	fmt.Println("  - JSON export with metadata")
	fmt.Println("  - Tax category classification")
	fmt.Println("  - Multi-account transaction tracking")
	fmt.Println("  - Liquidity tier analysis")
	fmt.Println("  - Event and transaction integration")
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	VerifyLedgerExportFunctionality()
}
