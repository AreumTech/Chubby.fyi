package main

import (
	"encoding/json"
	"fmt"
	"time"
)

// SimulationDebugger provides detailed debugging capabilities for simulation analysis
type SimulationDebugger struct {
	isEnabled      bool
	currentSession *DebugSession
	stepByStepMode bool
	breakpoints    []int  // Month offsets where to pause
	logLevel       string // "basic", "detailed", "verbose"
}

// DebugSession represents a debugging session for a single simulation run
type DebugSession struct {
	SessionID       string              `json:"sessionId"`
	StartTime       time.Time           `json:"startTime"`
	SimulationInput *SimulationInput    `json:"simulationInput"`
	MonthlyStates   []MonthlyDebugState `json:"monthlyStates"`
	Transactions    []TransactionRecord `json:"transactions"`
	Events          []EventRecord       `json:"events"`
	Warnings        []WarningRecord     `json:"warnings"`
	Summary         *DebugSummary       `json:"summary"`
}

// MonthlyDebugState captures the complete state at the end of each month
type MonthlyDebugState struct {
	MonthOffset         int                     `json:"monthOffset"`
	CalendarDate        string                  `json:"calendarDate"`
	Accounts            AccountHoldingsMonthEnd `json:"accounts"`
	NetWorth            float64                 `json:"netWorth"`
	CashFlow            float64                 `json:"cashFlow"`
	YTDTaxTracking      YTDTaxState             `json:"ytdTaxTracking"`
	EventsProcessed     []string                `json:"eventsProcessed"`
	TransactionsSummary TransactionsSummary     `json:"transactionsSummary"`
	MarketReturns       *StochasticReturns      `json:"marketReturns,omitempty"`
	Calculations        []CalculationLog        `json:"calculations"`
}

// YTDTaxState captures year-to-date tax tracking information
type YTDTaxState struct {
	OrdinaryIncomeYTD        float64 `json:"ordinaryIncomeYTD"`
	QualifiedDividendsYTD    float64 `json:"qualifiedDividendsYTD"`
	CapitalGainsYTD          float64 `json:"capitalGainsYTD"`
	CapitalLossesYTD         float64 `json:"capitalLossesYTD"`
	TaxWithholdingYTD        float64 `json:"taxWithholdingYTD"`
	EstimatedPaymentsYTD     float64 `json:"estimatedPaymentsYTD"`
	ShortTermCapitalGainsYTD float64 `json:"shortTermCapitalGainsYTD"`
	LongTermCapitalGainsYTD  float64 `json:"longTermCapitalGainsYTD"`
}

// TransactionsSummary provides a summary of transactions for the month
type TransactionsSummary struct {
	TotalTransactions  int     `json:"totalTransactions"`
	TotalVolume        float64 `json:"totalVolume"`
	RealizedGains      float64 `json:"realizedGains"`
	RealizedLosses     float64 `json:"realizedLosses"`
	TransactionCosts   float64 `json:"transactionCosts"`
	AssetsSold         int     `json:"assetsSold"`
	LiquidAssetsSold   int     `json:"liquidAssetsSold"`
	IlliquidAssetsSold int     `json:"illiquidAssetsSold"`
}

// TransactionRecord captures detailed transaction information
type TransactionRecord struct {
	ID               string        `json:"id"`
	MonthOffset      int           `json:"monthOffset"`
	TransactionType  string        `json:"transactionType"` // "sale", "purchase", "dividend", etc.
	AssetClass       AssetClass    `json:"assetClass"`
	LiquidityTier    LiquidityTier `json:"liquidityTier"`
	Quantity         float64       `json:"quantity"`
	Price            float64       `json:"price"`
	GrossAmount      float64       `json:"grossAmount"`
	TransactionCost  float64       `json:"transactionCost"`
	NetAmount        float64       `json:"netAmount"`
	RealizedGainLoss float64       `json:"realizedGainLoss"`
	Reason           string        `json:"reason"` // Why this transaction occurred
	AccountType      AccountType   `json:"accountType"`
}

// EventRecord captures event processing information
type EventRecord struct {
	ID             string                 `json:"id"`
	MonthOffset    int                    `json:"monthOffset"`
	EventType      EventType              `json:"eventType"`
	Amount         float64                `json:"amount"`
	Metadata       map[string]interface{} `json:"metadata"`
	ProcessingTime time.Duration          `json:"processingTime"`
	CashFlowImpact float64                `json:"cashFlowImpact"`
	AccountsImpact []string               `json:"accountsImpact"`
	Warnings       []string               `json:"warnings,omitempty"`
}

// CalculationLog captures detailed calculation steps
type CalculationLog struct {
	CalculationType string                 `json:"calculationType"`
	Inputs          map[string]interface{} `json:"inputs"`
	Result          float64                `json:"result"`
	Formula         string                 `json:"formula,omitempty"`
	Notes           string                 `json:"notes,omitempty"`
}

// WarningRecord captures warnings and issues during simulation
type WarningRecord struct {
	MonthOffset int    `json:"monthOffset"`
	Severity    string `json:"severity"` // "info", "warning", "error"
	Category    string `json:"category"` // "liquidity", "tax", "market", etc.
	Message     string `json:"message"`
	Details     string `json:"details,omitempty"`
}

// DebugSummary provides overall debugging insights
type DebugSummary struct {
	TotalMonthsSimulated  int                   `json:"totalMonthsSimulated"`
	TotalTransactions     int                   `json:"totalTransactions"`
	TotalEvents           int                   `json:"totalEvents"`
	TotalWarnings         int                   `json:"totalWarnings"`
	PerformanceMetrics    PerformanceMetrics    `json:"performanceMetrics"`
	KeyInsights           []string              `json:"keyInsights"`
	RecommendedActions    []string              `json:"recommendedActions"`
	LiquidityAnalysis     LiquidityAnalysis     `json:"liquidityAnalysis"`
	TaxEfficiencyAnalysis TaxEfficiencyAnalysis `json:"taxEfficiencyAnalysis"`
}

// PerformanceMetrics captures simulation performance data
type PerformanceMetrics struct {
	TotalExecutionTime     time.Duration `json:"totalExecutionTime"`
	AverageMonthTime       time.Duration `json:"averageMonthTime"`
	TransactionsThroughput float64       `json:"transactionsThroughput"`
	MemoryUsagePeak        int64         `json:"memoryUsagePeak,omitempty"`
}

// LiquidityAnalysis provides insights into asset liquidity patterns
type LiquidityAnalysis struct {
	ForcedIlliquidSales     int      `json:"forcedIlliquidSales"`
	TotalIlliquidSaleAmount float64  `json:"totalIlliquidSaleAmount"`
	AverageLiquidityTime    float64  `json:"averageLiquidityTime"`
	LiquidityWarnings       []string `json:"liquidityWarnings"`
}

// TaxEfficiencyAnalysis provides insights into tax efficiency
type TaxEfficiencyAnalysis struct {
	TotalTaxLiability     float64  `json:"totalTaxLiability"`
	EffectiveTaxRate      float64  `json:"effectiveTaxRate"`
	ShortTermCapitalGains float64  `json:"shortTermCapitalGains"`
	LongTermCapitalGains  float64  `json:"longTermCapitalGains"`
	TaxInefficiencies     []string `json:"taxInefficiencies"`
	TaxOptimizationTips   []string `json:"taxOptimizationTips"`
}

// NewSimulationDebugger creates a new simulation debugger
func NewSimulationDebugger() *SimulationDebugger {
	return &SimulationDebugger{
		isEnabled:      false,
		stepByStepMode: false,
		breakpoints:    make([]int, 0),
		logLevel:       "basic",
	}
}

// EnableDebugging enables debugging with specified configuration
func (sd *SimulationDebugger) EnableDebugging(stepByStep bool, logLevel string) {
	sd.isEnabled = true
	sd.stepByStepMode = stepByStep
	sd.logLevel = logLevel
}

// SetBreakpoints sets month offsets where simulation should pause for inspection
func (sd *SimulationDebugger) SetBreakpoints(monthOffsets []int) {
	sd.breakpoints = monthOffsets
}

// StartDebugSession starts a new debugging session
func (sd *SimulationDebugger) StartDebugSession(input *SimulationInput) *DebugSession {
	session := &DebugSession{
		SessionID:       fmt.Sprintf("debug_%d", time.Now().Unix()),
		StartTime:       time.Now(),
		SimulationInput: input,
		MonthlyStates:   make([]MonthlyDebugState, 0, input.MonthsToRun),
		Transactions:    make([]TransactionRecord, 0),
		Events:          make([]EventRecord, 0),
		Warnings:        make([]WarningRecord, 0),
	}

	sd.currentSession = session
	return session
}

// CaptureMonthlyState captures the complete state at the end of a month
func (sd *SimulationDebugger) CaptureMonthlyState(
	monthOffset int,
	accounts *AccountHoldingsMonthEnd,
	engine *SimulationEngine,
) {
	if !sd.isEnabled || sd.currentSession == nil {
		return
	}

	// Calculate net worth
	netWorth := accounts.Cash
	if accounts.Taxable != nil {
		taxableAccount := (accounts.Taxable)
		netWorth += taxableAccount.TotalValue
	}
	if accounts.TaxDeferred != nil {
		taxDeferredAccount := (accounts.TaxDeferred)
		netWorth += taxDeferredAccount.TotalValue
	}
	if accounts.Roth != nil {
		rothAccount := (accounts.Roth)
		netWorth += rothAccount.TotalValue
	}

	// Create YTD tax state
	ytdTaxState := YTDTaxState{
		OrdinaryIncomeYTD:        engine.ordinaryIncomeYTD,
		QualifiedDividendsYTD:    engine.qualifiedDividendsYTD,
		CapitalGainsYTD:          engine.capitalGainsYTD,
		CapitalLossesYTD:         engine.capitalLossesYTD,
		TaxWithholdingYTD:        engine.taxWithholdingYTD,
		EstimatedPaymentsYTD:     engine.estimatedPaymentsYTD,
		ShortTermCapitalGainsYTD: engine.shortTermCapitalGainsYTD,
		LongTermCapitalGainsYTD:  engine.longTermCapitalGainsYTD,
	}

	// Generate calendar date
	year := monthOffset / 12
	month := monthOffset % 12
	calendarDate := fmt.Sprintf("Year %d, Month %d", year+1, month+1)

	state := MonthlyDebugState{
		MonthOffset:         monthOffset,
		CalendarDate:        calendarDate,
		Accounts:            *accounts,
		NetWorth:            netWorth,
		CashFlow:            engine.currentMonthFlows.IncomeThisMonth - engine.currentMonthFlows.ExpensesThisMonth,
		YTDTaxTracking:      ytdTaxState,
		EventsProcessed:     make([]string, 0),     // Will be populated by event logging
		TransactionsSummary: TransactionsSummary{}, // Will be populated by transaction logging
		Calculations:        make([]CalculationLog, 0),
	}

	sd.currentSession.MonthlyStates = append(sd.currentSession.MonthlyStates, state)
}

// LogTransaction logs a detailed transaction record
func (sd *SimulationDebugger) LogTransaction(
	monthOffset int,
	transactionType string,
	assetClass AssetClass,
	liquidityTier LiquidityTier,
	quantity, price, transactionCost, realizedGainLoss float64,
	reason string,
	accountType AccountType,
) {
	if !sd.isEnabled || sd.currentSession == nil {
		return
	}

	transaction := TransactionRecord{
		ID:               fmt.Sprintf("txn_%d_%d", monthOffset, len(sd.currentSession.Transactions)),
		MonthOffset:      monthOffset,
		TransactionType:  transactionType,
		AssetClass:       assetClass,
		LiquidityTier:    liquidityTier,
		Quantity:         quantity,
		Price:            price,
		GrossAmount:      quantity * price,
		TransactionCost:  transactionCost,
		NetAmount:        (quantity * price) - transactionCost,
		RealizedGainLoss: realizedGainLoss,
		Reason:           reason,
		AccountType:      accountType,
	}

	sd.currentSession.Transactions = append(sd.currentSession.Transactions, transaction)
}

// LogEvent logs an event processing record
func (sd *SimulationDebugger) LogEvent(
	monthOffset int,
	event *FinancialEvent,
	processingTime time.Duration,
	cashFlowImpact float64,
	warnings []string,
) {
	if !sd.isEnabled || sd.currentSession == nil {
		return
	}

	eventRecord := EventRecord{
		ID:             event.ID,
		MonthOffset:    monthOffset,
		EventType:      SimulatorEventType(event.Type),
		Amount:         event.Amount,
		Metadata:       event.Metadata,
		ProcessingTime: processingTime,
		CashFlowImpact: cashFlowImpact,
		AccountsImpact: make([]string, 0), // Could be populated with affected accounts
		Warnings:       warnings,
	}

	sd.currentSession.Events = append(sd.currentSession.Events, eventRecord)
}

// LogWarning logs a warning or issue
func (sd *SimulationDebugger) LogWarning(monthOffset int, severity, category, message, details string) {
	if !sd.isEnabled || sd.currentSession == nil {
		return
	}

	warning := WarningRecord{
		MonthOffset: monthOffset,
		Severity:    severity,
		Category:    category,
		Message:     message,
		Details:     details,
	}

	sd.currentSession.Warnings = append(sd.currentSession.Warnings, warning)
}

// GenerateDebugSummary generates a comprehensive debugging summary
func (sd *SimulationDebugger) GenerateDebugSummary() *DebugSummary {
	if !sd.isEnabled || sd.currentSession == nil {
		return nil
	}

	session := sd.currentSession

	// Generate performance metrics
	executionTime := time.Since(session.StartTime)
	avgMonthTime := time.Duration(0)
	if len(session.MonthlyStates) > 0 {
		avgMonthTime = executionTime / time.Duration(len(session.MonthlyStates))
	}

	perfMetrics := PerformanceMetrics{
		TotalExecutionTime:     executionTime,
		AverageMonthTime:       avgMonthTime,
		TransactionsThroughput: float64(len(session.Transactions)) / executionTime.Seconds(),
	}

	// Analyze liquidity patterns
	liquidityAnalysis := sd.analyzeLiquidity()

	// Analyze tax efficiency
	taxAnalysis := sd.analyzeTaxEfficiency()

	// Generate key insights
	insights := sd.generateKeyInsights()

	// Generate recommendations
	recommendations := sd.generateRecommendations()

	summary := &DebugSummary{
		TotalMonthsSimulated:  len(session.MonthlyStates),
		TotalTransactions:     len(session.Transactions),
		TotalEvents:           len(session.Events),
		TotalWarnings:         len(session.Warnings),
		PerformanceMetrics:    perfMetrics,
		KeyInsights:           insights,
		RecommendedActions:    recommendations,
		LiquidityAnalysis:     liquidityAnalysis,
		TaxEfficiencyAnalysis: taxAnalysis,
	}

	session.Summary = summary
	return summary
}

// ExportDebugData exports the complete debugging session as JSON
func (sd *SimulationDebugger) ExportDebugData() (string, error) {
	if !sd.isEnabled || sd.currentSession == nil {
		return "", fmt.Errorf("no active debug session")
	}

	data, err := json.MarshalIndent(sd.currentSession, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal debug data: %v", err)
	}

	return string(data), nil
}

// Helper functions for analysis

func (sd *SimulationDebugger) analyzeLiquidity() LiquidityAnalysis {
	forcedIlliquidSales := 0
	totalIlliquidAmount := 0.0
	warnings := make([]string, 0)

	for _, tx := range sd.currentSession.Transactions {
		if tx.TransactionType == "sale" && tx.LiquidityTier == LiquidityTierIlliquid {
			forcedIlliquidSales++
			totalIlliquidAmount += tx.NetAmount
		}
	}

	if forcedIlliquidSales > 0 {
		warnings = append(warnings,
			fmt.Sprintf("Forced to sell illiquid assets %d times totaling $%.0f",
				forcedIlliquidSales, totalIlliquidAmount))
	}

	return LiquidityAnalysis{
		ForcedIlliquidSales:     forcedIlliquidSales,
		TotalIlliquidSaleAmount: totalIlliquidAmount,
		LiquidityWarnings:       warnings,
	}
}

func (sd *SimulationDebugger) analyzeTaxEfficiency() TaxEfficiencyAnalysis {
	totalSTCG := 0.0
	totalLTCG := 0.0
	inefficiencies := make([]string, 0)

	for _, tx := range sd.currentSession.Transactions {
		if tx.TransactionType == "sale" && tx.RealizedGainLoss > 0 {
			// This is a simplified analysis - would need more context to determine term
			totalLTCG += tx.RealizedGainLoss // Assume long-term for now
		}
	}

	// Check for potential tax inefficiencies
	if totalSTCG > totalLTCG*0.5 { // More than 50% short-term gains
		inefficiencies = append(inefficiencies,
			"High proportion of short-term capital gains (higher tax rate)")
	}

	return TaxEfficiencyAnalysis{
		ShortTermCapitalGains: totalSTCG,
		LongTermCapitalGains:  totalLTCG,
		TaxInefficiencies:     inefficiencies,
	}
}

func (sd *SimulationDebugger) generateKeyInsights() []string {
	insights := make([]string, 0)

	if sd.currentSession == nil {
		return insights
	}

	session := sd.currentSession

	// Transaction volume insights
	if len(session.Transactions) > 100 {
		insights = append(insights,
			fmt.Sprintf("High transaction volume: %d transactions may indicate excessive trading",
				len(session.Transactions)))
	}

	// Warning insights
	if len(session.Warnings) > 0 {
		insights = append(insights,
			fmt.Sprintf("%d warnings detected - review for potential issues",
				len(session.Warnings)))
	}

	// Net worth progression
	if len(session.MonthlyStates) > 12 {
		initial := session.MonthlyStates[0].NetWorth
		final := session.MonthlyStates[len(session.MonthlyStates)-1].NetWorth
		if final < initial {
			insights = append(insights, "Net worth declined during simulation period")
		} else {
			growth := ((final - initial) / initial) * 100
			insights = append(insights,
				fmt.Sprintf("Net worth grew %.1f%% during simulation", growth))
		}
	}

	return insights
}

func (sd *SimulationDebugger) generateRecommendations() []string {
	recommendations := make([]string, 0)

	if sd.currentSession == nil {
		return recommendations
	}

	// Analyze liquidity
	liquidityAnalysis := sd.analyzeLiquidity()
	if liquidityAnalysis.ForcedIlliquidSales > 0 {
		recommendations = append(recommendations,
			"Consider maintaining higher liquid asset reserves to avoid forced illiquid sales")
	}

	// Analyze transaction costs
	totalCosts := 0.0
	for _, tx := range sd.currentSession.Transactions {
		totalCosts += tx.TransactionCost
	}
	if totalCosts > 1000 {
		recommendations = append(recommendations,
			fmt.Sprintf("High transaction costs ($%.0f) - consider reducing portfolio turnover", totalCosts))
	}

	return recommendations
}
