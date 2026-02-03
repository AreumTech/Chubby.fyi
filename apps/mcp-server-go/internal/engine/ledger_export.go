package engine

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// LedgerExporter provides functionality to export detailed transaction ledgers
type LedgerExporter struct {
	simulationEngine *SimulationEngine
	debugger         *SimulationDebugger
}

// TransactionLedgerEntry represents a complete ledger entry with all relevant transaction details
type TransactionLedgerEntry struct {
	EntryID         string    `json:"entryId" csv:"Entry_ID"`
	Timestamp       time.Time `json:"timestamp" csv:"Timestamp"`
	MonthOffset     int       `json:"monthOffset" csv:"Month_Offset"`
	CalendarDate    string    `json:"calendarDate" csv:"Calendar_Date"`
	TransactionType string    `json:"transactionType" csv:"Transaction_Type"`
	Description     string    `json:"description" csv:"Description"`

	// Asset details
	AssetClass    string `json:"assetClass,omitempty" csv:"Asset_Class"`
	LiquidityTier string `json:"liquidityTier,omitempty" csv:"Liquidity_Tier"`
	AccountType   string `json:"accountType,omitempty" csv:"Account_Type"`

	// Financial amounts
	GrossAmount      float64 `json:"grossAmount" csv:"Gross_Amount"`
	TransactionCost  float64 `json:"transactionCost,omitempty" csv:"Transaction_Cost"`
	NetAmount        float64 `json:"netAmount" csv:"Net_Amount"`
	RealizedGainLoss float64 `json:"realizedGainLoss,omitempty" csv:"Realized_Gain_Loss"`

	// Tax information
	TaxableAmount float64 `json:"taxableAmount,omitempty" csv:"Taxable_Amount"`
	TaxWithheld   float64 `json:"taxWithheld,omitempty" csv:"Tax_Withheld"`
	TaxCategory   string  `json:"taxCategory,omitempty" csv:"Tax_Category"`

	// Context
	CashBalance  float64 `json:"cashBalance" csv:"Cash_Balance_After"`
	NetWorth     float64 `json:"netWorth" csv:"Net_Worth_After"`
	EventContext string  `json:"eventContext,omitempty" csv:"Event_Context"`
	Notes        string  `json:"notes,omitempty" csv:"Notes"`
}

// LedgerSummary provides aggregated statistics about the ledger
type LedgerSummary struct {
	TotalEntries          int                `json:"totalEntries"`
	TransactionsByType    map[string]int     `json:"transactionsByType"`
	TransactionsByMonth   map[int]int        `json:"transactionsByMonth"`
	TotalVolume           float64            `json:"totalVolume"`
	TotalTransactionCosts float64            `json:"totalTransactionCosts"`
	TotalRealizedGains    float64            `json:"totalRealizedGains"`
	TotalRealizedLosses   float64            `json:"totalRealizedLosses"`
	TotalTaxWithheld      float64            `json:"totalTaxWithheld"`
	LiquidityBreakdown    map[string]float64 `json:"liquidityBreakdown"`
	AccountBreakdown      map[string]float64 `json:"accountBreakdown"`
	TaxCategoryBreakdown  map[string]float64 `json:"taxCategoryBreakdown"`
	TimeSpanMonths        int                `json:"timeSpanMonths"`
}

// NewLedgerExporter creates a new ledger exporter
func NewLedgerExporter(engine *SimulationEngine, debugger *SimulationDebugger) *LedgerExporter {
	return &LedgerExporter{
		simulationEngine: engine,
		debugger:         debugger,
	}
}

// GenerateCompleteLedger generates a complete transaction ledger for the simulation
func (le *LedgerExporter) GenerateCompleteLedger() ([]TransactionLedgerEntry, error) {
	if le.debugger == nil || le.debugger.currentSession == nil {
		return nil, fmt.Errorf("no debug session available for ledger generation")
	}

	session := le.debugger.currentSession
	entries := make([]TransactionLedgerEntry, 0)

	// Process all transactions from the debug session
	for _, txn := range session.Transactions {
		entry := le.convertTransactionToLedgerEntry(txn, session)
		entries = append(entries, entry)
	}

	// Process all events that had financial impact
	for _, event := range session.Events {
		if event.CashFlowImpact != 0 {
			entry := le.convertEventToLedgerEntry(event, session)
			entries = append(entries, entry)
		}
	}

	// Add tax payment entries
	for _, state := range session.MonthlyStates {
		if state.YTDTaxTracking.TaxWithholdingYTD > 0 {
			entry := le.createTaxWithholdingEntry(state)
			entries = append(entries, entry)
		}
	}

	return entries, nil
}

// convertTransactionToLedgerEntry converts a TransactionRecord to a TransactionLedgerEntry
func (le *LedgerExporter) convertTransactionToLedgerEntry(txn TransactionRecord, session *DebugSession) TransactionLedgerEntry {
	// Find corresponding monthly state
	var cashBalance, netWorth float64
	var calendarDate string

	for _, state := range session.MonthlyStates {
		if state.MonthOffset == txn.MonthOffset {
			cashBalance = state.Accounts.Cash
			netWorth = state.NetWorth
			calendarDate = state.CalendarDate
			break
		}
	}

	// Determine tax category based on transaction type and asset class
	taxCategory := le.determineTaxCategory(txn)

	description := fmt.Sprintf("%s %s %s",
		strings.Title(txn.TransactionType),
		string(txn.AssetClass),
		txn.Reason)

	return TransactionLedgerEntry{
		EntryID:          txn.ID,
		Timestamp:        time.Now(), // In real implementation, would use actual transaction time
		MonthOffset:      txn.MonthOffset,
		CalendarDate:     calendarDate,
		TransactionType:  txn.TransactionType,
		Description:      description,
		AssetClass:       string(txn.AssetClass),
		LiquidityTier:    string(txn.LiquidityTier),
		AccountType:      string(txn.AccountType),
		GrossAmount:      txn.GrossAmount,
		TransactionCost:  txn.TransactionCost,
		NetAmount:        txn.NetAmount,
		RealizedGainLoss: txn.RealizedGainLoss,
		TaxableAmount:    le.calculateTaxableAmount(txn),
		TaxCategory:      taxCategory,
		CashBalance:      cashBalance,
		NetWorth:         netWorth,
		EventContext:     txn.Reason,
	}
}

// convertEventToLedgerEntry converts an EventRecord to a TransactionLedgerEntry
func (le *LedgerExporter) convertEventToLedgerEntry(event EventRecord, session *DebugSession) TransactionLedgerEntry {
	// Find corresponding monthly state
	var cashBalance, netWorth float64
	var calendarDate string

	for _, state := range session.MonthlyStates {
		if state.MonthOffset == event.MonthOffset {
			cashBalance = state.Accounts.Cash
			netWorth = state.NetWorth
			calendarDate = state.CalendarDate
			break
		}
	}

	description := fmt.Sprintf("%s Event: %s",
		strings.Title(string(event.EventType)),
		le.getEventDescription(event))

	taxWithheld := le.extractTaxWithholding(event)

	return TransactionLedgerEntry{
		EntryID:         fmt.Sprintf("event_%s", event.ID),
		Timestamp:       time.Now(),
		MonthOffset:     event.MonthOffset,
		CalendarDate:    calendarDate,
		TransactionType: "event",
		Description:     description,
		GrossAmount:     event.Amount,
		NetAmount:       event.CashFlowImpact,
		TaxWithheld:     taxWithheld,
		TaxCategory:     le.getEventTaxCategory(event),
		CashBalance:     cashBalance,
		NetWorth:        netWorth,
		EventContext:    string(event.EventType),
		Notes:           strings.Join(event.Warnings, "; "),
	}
}

// createTaxWithholdingEntry creates a ledger entry for tax withholding
func (le *LedgerExporter) createTaxWithholdingEntry(state MonthlyDebugState) TransactionLedgerEntry {
	return TransactionLedgerEntry{
		EntryID:         fmt.Sprintf("tax_withholding_%d", state.MonthOffset),
		Timestamp:       time.Now(),
		MonthOffset:     state.MonthOffset,
		CalendarDate:    state.CalendarDate,
		TransactionType: "tax_withholding",
		Description:     "Monthly Tax Withholding",
		NetAmount:       -state.YTDTaxTracking.TaxWithholdingYTD, // Negative because it's an expense
		TaxWithheld:     state.YTDTaxTracking.TaxWithholdingYTD,
		TaxCategory:     "withholding",
		CashBalance:     state.Accounts.Cash,
		NetWorth:        state.NetWorth,
		EventContext:    "tax_withholding",
	}
}

// GenerateLedgerSummary generates aggregate statistics about the ledger
func (le *LedgerExporter) GenerateLedgerSummary(entries []TransactionLedgerEntry) LedgerSummary {
	summary := LedgerSummary{
		TotalEntries:         len(entries),
		TransactionsByType:   make(map[string]int),
		TransactionsByMonth:  make(map[int]int),
		LiquidityBreakdown:   make(map[string]float64),
		AccountBreakdown:     make(map[string]float64),
		TaxCategoryBreakdown: make(map[string]float64),
	}

	minMonth, maxMonth := 999999, -999999

	for _, entry := range entries {
		// Count by type
		summary.TransactionsByType[entry.TransactionType]++

		// Count by month
		summary.TransactionsByMonth[entry.MonthOffset]++

		// Track month range
		if entry.MonthOffset < minMonth {
			minMonth = entry.MonthOffset
		}
		if entry.MonthOffset > maxMonth {
			maxMonth = entry.MonthOffset
		}

		// Aggregate financial metrics
		summary.TotalVolume += entry.GrossAmount
		summary.TotalTransactionCosts += entry.TransactionCost
		summary.TotalTaxWithheld += entry.TaxWithheld

		if entry.RealizedGainLoss > 0 {
			summary.TotalRealizedGains += entry.RealizedGainLoss
		} else {
			summary.TotalRealizedLosses += entry.RealizedGainLoss
		}

		// Breakdown by liquidity tier
		if entry.LiquidityTier != "" {
			summary.LiquidityBreakdown[entry.LiquidityTier] += entry.NetAmount
		}

		// Breakdown by account type
		if entry.AccountType != "" {
			summary.AccountBreakdown[entry.AccountType] += entry.NetAmount
		}

		// Breakdown by tax category
		if entry.TaxCategory != "" {
			summary.TaxCategoryBreakdown[entry.TaxCategory] += entry.TaxableAmount
		}
	}

	if maxMonth > minMonth {
		summary.TimeSpanMonths = maxMonth - minMonth + 1
	}

	return summary
}

// ExportToCSV exports the ledger to CSV format
func (le *LedgerExporter) ExportToCSV(entries []TransactionLedgerEntry) (string, error) {
	var csvContent strings.Builder
	writer := csv.NewWriter(&csvContent)

	// Write headers
	headers := []string{
		"Entry_ID", "Timestamp", "Month_Offset", "Calendar_Date", "Transaction_Type",
		"Description", "Asset_Class", "Liquidity_Tier", "Account_Type",
		"Gross_Amount", "Transaction_Cost", "Net_Amount", "Realized_Gain_Loss",
		"Taxable_Amount", "Tax_Withheld", "Tax_Category",
		"Cash_Balance_After", "Net_Worth_After", "Event_Context", "Notes",
	}
	writer.Write(headers)

	// Write data rows
	for _, entry := range entries {
		row := []string{
			entry.EntryID,
			entry.Timestamp.Format("2006-01-02 15:04:05"),
			strconv.Itoa(entry.MonthOffset),
			entry.CalendarDate,
			entry.TransactionType,
			entry.Description,
			entry.AssetClass,
			entry.LiquidityTier,
			entry.AccountType,
			fmt.Sprintf("%.2f", entry.GrossAmount),
			fmt.Sprintf("%.2f", entry.TransactionCost),
			fmt.Sprintf("%.2f", entry.NetAmount),
			fmt.Sprintf("%.2f", entry.RealizedGainLoss),
			fmt.Sprintf("%.2f", entry.TaxableAmount),
			fmt.Sprintf("%.2f", entry.TaxWithheld),
			entry.TaxCategory,
			fmt.Sprintf("%.2f", entry.CashBalance),
			fmt.Sprintf("%.2f", entry.NetWorth),
			entry.EventContext,
			entry.Notes,
		}
		writer.Write(row)
	}

	writer.Flush()
	return csvContent.String(), writer.Error()
}

// ExportToJSON exports the ledger to JSON format
func (le *LedgerExporter) ExportToJSON(entries []TransactionLedgerEntry, summary LedgerSummary) (string, error) {
	exportData := struct {
		Metadata struct {
			ExportTimestamp time.Time     `json:"exportTimestamp"`
			EntryCount      int           `json:"entryCount"`
			Summary         LedgerSummary `json:"summary"`
		} `json:"metadata"`
		Entries []TransactionLedgerEntry `json:"entries"`
	}{
		Entries: entries,
	}

	exportData.Metadata.ExportTimestamp = time.Now()
	exportData.Metadata.EntryCount = len(entries)
	exportData.Metadata.Summary = summary

	data, err := json.MarshalIndent(exportData, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal ledger data: %v", err)
	}

	return string(data), nil
}

// Helper functions

func (le *LedgerExporter) determineTaxCategory(txn TransactionRecord) string {
	switch txn.TransactionType {
	case "sale":
		if txn.RealizedGainLoss > 0 {
			return "capital_gains"
		} else if txn.RealizedGainLoss < 0 {
			return "capital_losses"
		}
		return "sale_no_gain_loss"
	case "dividend":
		return "dividend_income"
	case "purchase":
		return "non_taxable"
	default:
		return "other"
	}
}

func (le *LedgerExporter) calculateTaxableAmount(txn TransactionRecord) float64 {
	switch txn.TransactionType {
	case "sale":
		return txn.RealizedGainLoss
	case "dividend":
		return txn.NetAmount
	default:
		return 0
	}
}

func (le *LedgerExporter) getEventDescription(event EventRecord) string {
	if desc, ok := event.Metadata["description"].(string); ok {
		return desc
	}
	if source, ok := event.Metadata["source"].(string); ok {
		return source
	}
	return fmt.Sprintf("Amount: %.2f", event.Amount)
}

func (le *LedgerExporter) extractTaxWithholding(event EventRecord) float64 {
	if withholding, ok := event.Metadata["withholding"].(float64); ok {
		return withholding
	}
	return 0
}

func (le *LedgerExporter) getEventTaxCategory(event EventRecord) string {
	switch event.EventType {
	case EventTypeIncome:
		if source, ok := event.Metadata["source"].(string); ok {
			switch source {
			case "Employment", "Salary":
				return "ordinary_income"
			case "Dividend":
				return "dividend_income"
			case "Business":
				return "business_income"
			default:
				return "other_income"
			}
		}
		return "income"
	case EventTypeExpense:
		return "expense"
	default:
		return "other"
	}
}
