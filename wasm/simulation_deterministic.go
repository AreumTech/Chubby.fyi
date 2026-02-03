// Deterministic simulation mode - single path with constant growth rates
// Provides detailed event-by-event tracing and monthly/yearly snapshots

package main

import (
	"fmt"
)

// RunDeterministicSimulation runs a single simulation path with constant returns
// Returns detailed monthly snapshots and event-by-event trace
// Supports both deterministic (mean returns) and stochastic (seeded random) modes
func RunDeterministicSimulation(input SimulationInput) DeterministicResults {
	simLogVerbose("🎯 [DETERMINISTIC] Starting deterministic simulation")

	// PFOS-E requires explicit seed for stochastic mode (reproducibility requirement)
	if input.Config.SimulationMode == "stochastic" && input.Config.RandomSeed == 0 {
		return DeterministicResults{
			Success: false,
			Error:   "Stochastic mode requires a non-zero RandomSeed for reproducibility (PFOS-E requirement)",
		}
	}

	// Determine simulation mode: if seed is provided, use stochastic mode
	isStochasticMode := input.Config.SimulationMode == "stochastic" && input.Config.RandomSeed != 0
	if !isStochasticMode {
		// Force deterministic mode by setting DebugDisableRandomness
		input.Config.DebugDisableRandomness = true
		input.Config.SimulationMode = "deterministic"
	}

	// Validate input
	if input.MonthsToRun <= 0 || input.MonthsToRun > 1200 {
		return DeterministicResults{
			Success: false,
			Error:   fmt.Sprintf("Invalid MonthsToRun: %d", input.MonthsToRun),
		}
	}

	// Extract assumptions from config for UI display
	assumptions := DeterministicAssumptions{
		StockReturnAnnual:      input.Config.MeanSPYReturn,
		BondReturnAnnual:       input.Config.MeanBondReturn,
		InflationAnnual:        input.Config.MeanInflation,
		IntlStockReturnAnnual:  input.Config.MeanIntlStockReturn,
		HomeAppreciationAnnual: input.Config.MeanHomeValueAppreciation,
	}

	// Create isolated engine for this simulation
	engine := NewSimulationEngine(input.Config)

	// Run simulation with event tracing enabled
	result, eventTrace, comprehensiveStates := engine.runDeterministicSimulationWithTrace(input)

	if !result.Success {
		return DeterministicResults{
			Success: false,
			Error:   result.Error,
		}
	}

	// Convert MonthlyDataSimulation to DeterministicMonthSnapshot
	monthlySnapshots := convertToMonthSnapshots(result.MonthlyData, input)

	// Aggregate into yearly data
	yearlyData := aggregateToYearlyData(monthlySnapshots, input)

	simLogVerbose("🎯 [DETERMINISTIC] Completed: %d months, %d years, %d events traced, %d comprehensive states",
		len(monthlySnapshots), len(yearlyData), len(eventTrace), len(comprehensiveStates))

	// Build result with simulation mode metadata
	deterministicResult := DeterministicResults{
		Success:                    true,
		Assumptions:                assumptions,
		MonthlySnapshots:           monthlySnapshots,
		EventTrace:                 eventTrace,
		YearlyData:                 yearlyData,
		FinalNetWorth:              result.FinalNetWorth,
		IsBankrupt:                 result.IsBankrupt,
		BankruptcyMonth:            result.BankruptcyMonth,
		ComprehensiveMonthlyStates: comprehensiveStates,
		SimulationMode:             input.Config.SimulationMode,
	}

	// Add stochastic-specific fields
	if isStochasticMode {
		deterministicResult.Seed = input.Config.RandomSeed
		deterministicResult.ModelDescription = "PCG32 seeded GARCH(1,1) with Student-t(5)"
		deterministicResult.RealizedPathVariables = engine.GetRealizedPathVariables()
	}

	return deterministicResult
}

// runDeterministicSimulationWithTrace runs simulation and captures event-by-event trace
func (se *SimulationEngine) runDeterministicSimulationWithTrace(input SimulationInput) (SimulationResult, []EventTraceEntry, []DeterministicMonthState) {
	simLogVerbose("🔥 DETERMINISTIC MODE: Running with constant returns 🔥")

	// Store simulation input for access to strategies
	se.simulationInput = &input

	// Reset state for new simulation run
	se.ResetSimulationState()

	// Initialize accounts (same as RunSingleSimulation)
	accounts := AccountHoldingsMonthEnd{
		Cash: input.InitialAccounts.Cash,
	}

	// Helper function to initialize tax lots
	initializeMissingTaxLots := func(account *Account, startMonth int) {
		if account == nil {
			return
		}
		for i := range account.Holdings {
			holding := &account.Holdings[i]
			if len(holding.Lots) == 0 && holding.Quantity > 0 {
				initialLot := TaxLot{
					ID:               fmt.Sprintf("%s-initial", holding.ID),
					AssetClass:       holding.AssetClass,
					Quantity:         holding.Quantity,
					CostBasisPerUnit: holding.CostBasisPerUnit,
					CostBasisTotal:   holding.CostBasisTotal,
					AcquisitionDate:  startMonth,
					IsLongTerm:       true,
				}
				holding.Lots = []TaxLot{initialLot}
			}
		}
	}

	// Preserve holdings from input
	if input.InitialAccounts.Taxable != nil {
		accounts.Taxable = &Account{
			TotalValue: input.InitialAccounts.Taxable.TotalValue,
			Holdings:   input.InitialAccounts.Taxable.Holdings,
		}
		initializeMissingTaxLots(accounts.Taxable, 0)
	} else {
		accounts.Taxable = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	if input.InitialAccounts.TaxDeferred != nil {
		accounts.TaxDeferred = &Account{
			TotalValue: input.InitialAccounts.TaxDeferred.TotalValue,
			Holdings:   input.InitialAccounts.TaxDeferred.Holdings,
		}
		initializeMissingTaxLots(accounts.TaxDeferred, 0)
	} else {
		accounts.TaxDeferred = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	if input.InitialAccounts.Roth != nil {
		accounts.Roth = &Account{
			TotalValue: input.InitialAccounts.Roth.TotalValue,
			Holdings:   input.InitialAccounts.Roth.Holdings,
		}
		initializeMissingTaxLots(accounts.Roth, 0)
	} else {
		accounts.Roth = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	// Run simulation with event tracing
	return se.runQueueSimulationLoopWithTrace(input, accounts)
}

// runQueueSimulationLoopWithTrace is a modified version of runQueueSimulationLoop that captures event traces
func (se *SimulationEngine) runQueueSimulationLoopWithTrace(input SimulationInput, accounts AccountHoldingsMonthEnd) (SimulationResult, []EventTraceEntry, []DeterministicMonthState) {
	// Store simulation input
	se.simulationInput = &input

	// Create and populate the event queue
	eventQueue := PreprocessAndPopulateQueue(input)
	se.eventQueue = eventQueue

	// Initialize accounts
	accounts = se.initializeAccountsForQueue(accounts)

	// Initialize system event handler
	systemHandler := NewSystemEventHandlerSimple(se)

	// Initialize results storage
	monthlyDataList := make([]MonthlyDataSimulation, 0, input.MonthsToRun)
	eventTrace := make([]EventTraceEntry, 0, 1000) // Pre-allocate for efficiency
	comprehensiveStates := make([]DeterministicMonthState, 0, input.MonthsToRun) // Comprehensive state capture
	var currentMonthData *MonthlyDataSimulation
	var currentMonthEventIDs []string // Track events for current month
	currentMonth := -1

	// Calculate start year and age for comprehensive state
	startYear := 2025
	startAge := 35.0
	if input.InitialAge > 0 {
		startAge = float64(input.InitialAge)
	}
	if input.StartYear > 0 {
		startYear = input.StartYear
	}

	// Track bankruptcy
	bankruptcyMonth := 0
	bankruptcyTrigger := ""

	// Helper to get current state snapshot
	getStateSnapshot := func() (netWorth, cash, taxable, taxDeferred, roth float64) {
		netWorth = se.calculateNetWorth(accounts)
		cash = accounts.Cash
		if accounts.Taxable != nil {
			taxable = accounts.Taxable.TotalValue
		}
		if accounts.TaxDeferred != nil {
			taxDeferred = accounts.TaxDeferred.TotalValue
		}
		if accounts.Roth != nil {
			roth = accounts.Roth.TotalValue
		}
		return
	}

	// Main simulation loop with event tracing
	for !eventQueue.IsEmpty() {
		queuedEvent := eventQueue.Next()

		// Check if we've moved to a new month
		if queuedEvent.MonthOffset > currentMonth {
			// Save previous month's data
			if currentMonthData != nil {
				// NOTE: Debt payments are handled by SYSTEM_DEBT_PAYMENT event (priority 50)
				// Do NOT call ProcessDebtPayments here - it would double-count payments

				currentMonthData.NetWorth = se.calculateNetWorth(accounts)
				currentMonthData.Accounts = se.deepCopyAccounts(accounts)

				// Copy monthly flows
				currentMonthData.IncomeThisMonth = se.currentMonthFlows.IncomeThisMonth
				currentMonthData.EmploymentIncomeThisMonth = se.currentMonthFlows.EmploymentIncomeThisMonth
				currentMonthData.ExpensesThisMonth = se.currentMonthFlows.ExpensesThisMonth
				currentMonthData.ContributionsToInvestmentsThisMonth = se.currentMonthFlows.ContributionsToInvestmentsThisMonth
				currentMonthData.DivestmentProceedsThisMonth = se.currentMonthFlows.DivestmentProceedsThisMonth
				currentMonthData.TaxWithheldThisMonth = se.currentMonthFlows.TaxWithheldThisMonth
				currentMonthData.TaxesPaidThisMonth = se.currentMonthFlows.TaxesPaidThisMonth

				// Copy market returns for investment growth calculation
				if se.currentMonthReturns != nil {
					currentMonthData.Returns = *se.currentMonthReturns
				}

				monthlyDataList = append(monthlyDataList, *currentMonthData)

				// Capture comprehensive state at end of month
				calendarYear := startYear + currentMonth/12
				calendarMonth := currentMonth%12 + 1
				age := startAge + float64(currentMonth)/12.0
				comprehensiveState := se.CaptureComprehensiveMonthState(
					accounts,
					currentMonth,
					calendarYear,
					calendarMonth,
					age,
					currentMonthEventIDs,
				)
				comprehensiveStates = append(comprehensiveStates, comprehensiveState)

				// Check bankruptcy
				if se.isBankrupt {
					bankruptcyMonth = se.bankruptcyMonth
					bankruptcyTrigger = se.bankruptcyTrigger
					break
				}
			}

			// Initialize new month
			currentMonth = queuedEvent.MonthOffset
			currentMonthData = &MonthlyDataSimulation{
				MonthOffset: currentMonth,
			}
			currentMonthEventIDs = nil // Reset event IDs for new month
			systemHandler.SetMonthlyData(currentMonthData)
			se.updateExpenseHistory()
			se.resetMonthlyFlows()
		}

		// Skip system events from event trace (only trace user events)
		isUserEvent := !isSystemEventDeterministic(queuedEvent.Event.Type)

		// Capture state BEFORE event
		var beforeNW, beforeCash, beforeTaxable, beforeTaxDeferred, beforeRoth float64
		if isUserEvent {
			beforeNW, beforeCash, beforeTaxable, beforeTaxDeferred, beforeRoth = getStateSnapshot()
		}

		// Process the event
		err := se.processQueuedEvent(queuedEvent, &accounts, currentMonthData, systemHandler)
		if err != nil {
			if queuedEvent.Event.Type == SystemEventYearEnd {
				bankruptcyMonth = currentMonth
				bankruptcyTrigger = err.Error()
				break
			}
		}

		// Capture state AFTER event and create trace entry
		if isUserEvent {
			afterNW, afterCash, afterTaxable, afterTaxDeferred, afterRoth := getStateSnapshot()

			traceEntry := EventTraceEntry{
				MonthOffset:       queuedEvent.MonthOffset,
				EventID:           queuedEvent.Event.ID,
				EventName:         queuedEvent.Event.Description,
				EventType:         queuedEvent.Event.Type,
				Priority:          int(queuedEvent.Priority),
				Amount:            queuedEvent.Event.Amount,
				NetWorthBefore:    beforeNW,
				CashBefore:        beforeCash,
				TaxableBefore:     beforeTaxable,
				TaxDeferredBefore: beforeTaxDeferred,
				RothBefore:        beforeRoth,
				NetWorthAfter:     afterNW,
				CashAfter:         afterCash,
				TaxableAfter:      afterTaxable,
				TaxDeferredAfter:  afterTaxDeferred,
				RothAfter:         afterRoth,
				Description:       generateEventDescription(queuedEvent.Event, beforeNW, afterNW),
			}
			eventTrace = append(eventTrace, traceEntry)

			// Track event ID for comprehensive state
			currentMonthEventIDs = append(currentMonthEventIDs, queuedEvent.Event.ID)
		}
	}

	// Save final month's data
	if currentMonthData != nil {
		currentMonthData.NetWorth = se.calculateNetWorth(accounts)
		currentMonthData.Accounts = se.deepCopyAccounts(accounts)
		currentMonthData.IncomeThisMonth = se.currentMonthFlows.IncomeThisMonth
		currentMonthData.ExpensesThisMonth = se.currentMonthFlows.ExpensesThisMonth
		// Copy market returns for investment growth calculation
		if se.currentMonthReturns != nil {
			currentMonthData.Returns = *se.currentMonthReturns
		}
		// Copy retirement income tracking
		currentMonthData.SocialSecurityIncomeThisMonth = se.currentMonthFlows.SocialSecurityIncomeThisMonth
		currentMonthData.PensionIncomeThisMonth = se.currentMonthFlows.PensionIncomeThisMonth
		monthlyDataList = append(monthlyDataList, *currentMonthData)

		// Capture comprehensive state for final month
		calendarYear := startYear + currentMonth/12
		calendarMonth := currentMonth%12 + 1
		age := startAge + float64(currentMonth)/12.0
		comprehensiveState := se.CaptureComprehensiveMonthState(
			accounts,
			currentMonth,
			calendarYear,
			calendarMonth,
			age,
			currentMonthEventIDs,
		)
		comprehensiveStates = append(comprehensiveStates, comprehensiveState)
	}

	// Build result
	isBankrupt := bankruptcyMonth > 0
	finalNetWorth := 0.0
	if len(monthlyDataList) > 0 {
		finalNetWorth = monthlyDataList[len(monthlyDataList)-1].NetWorth
	}

	result := SimulationResult{
		Success:         true,
		MonthlyData:     monthlyDataList,
		FinalNetWorth:   finalNetWorth,
		IsBankrupt:      isBankrupt,
		BankruptcyMonth: bankruptcyMonth,
	}
	if isBankrupt {
		result.BankruptcyTrigger = bankruptcyTrigger
	}

	return result, eventTrace, comprehensiveStates
}

// isSystemEventDeterministic checks if an event type is a system-generated event
func isSystemEventDeterministic(eventType string) bool {
	switch eventType {
	case SystemEventTimeStep, SystemEventMarketUpdate, SystemEventYearEnd,
		SystemEventCashCheck, SystemEventRMDCheck, SystemEventTaxCheck,
		SystemEventDebtPayment, SystemEventFinancialHealthCheck:
		return true
	default:
		return false
	}
}

// generateEventDescription creates a human-readable description of an event's impact
func generateEventDescription(event FinancialEvent, beforeNW, afterNW float64) string {
	delta := afterNW - beforeNW
	sign := "+"
	if delta < 0 {
		sign = ""
	}
	return fmt.Sprintf("%s: %s$%.0f net worth", event.Type, sign, delta)
}

// convertToMonthSnapshots converts MonthlyDataSimulation to DeterministicMonthSnapshot
func convertToMonthSnapshots(monthlyData []MonthlyDataSimulation, input SimulationInput) []DeterministicMonthSnapshot {
	snapshots := make([]DeterministicMonthSnapshot, 0, len(monthlyData))

	startYear := 2025 // Default start year
	startAge := 35.0  // Default age, should come from input

	// Try to get age from input if available
	if input.InitialAge > 0 {
		startAge = float64(input.InitialAge)
	}
	if input.StartYear > 0 {
		startYear = input.StartYear
	}

	for _, md := range monthlyData {
		calendarYear := startYear + md.MonthOffset/12
		calendarMonth := md.MonthOffset%12 + 1
		age := startAge + float64(md.MonthOffset)/12.0

		snapshot := DeterministicMonthSnapshot{
			MonthOffset:   md.MonthOffset,
			CalendarYear:  calendarYear,
			CalendarMonth: calendarMonth,
			Age:           age,

			NetWorth:           md.NetWorth,
			CashBalance:        md.Accounts.Cash,
			TaxableBalance:     getAccountValue(md.Accounts.Taxable),
			TaxDeferredBalance: getAccountValue(md.Accounts.TaxDeferred),
			RothBalance:        getAccountValue(md.Accounts.Roth),
			HSABalance:         getAccountValue(md.Accounts.HSA),
			FiveTwoNineBalance: getAccountValue(md.Accounts.FiveTwoNine),

			IncomeThisMonth:        md.IncomeThisMonth,
			ExpensesThisMonth:      md.ExpensesThisMonth,
			TaxesThisMonth:         md.TaxWithheldThisMonth + md.TaxesPaidThisMonth,
			ContributionsThisMonth: md.ContributionsToInvestmentsThisMonth,
			WithdrawalsThisMonth:   md.DivestmentProceedsThisMonth,
			DivestmentProceeds:     md.DivestmentProceedsThisMonth,
		}

		// Calculate investment growth from all investment accounts
		// This is an approximation: account_value * monthly_return
		// In reality, growth happens continuously, but this gives a reasonable estimate
		if md.Returns.SPY != 0 || md.Returns.BND != 0 {
			// Calculate growth for each account type
			// Assume stocks (SPY) for equity accounts, bonds (BND) for fixed income
			taxableGrowth := getAccountValue(md.Accounts.Taxable) * md.Returns.SPY
			taxDeferredGrowth := getAccountValue(md.Accounts.TaxDeferred) * md.Returns.SPY
			rothGrowth := getAccountValue(md.Accounts.Roth) * md.Returns.SPY
			hsaGrowth := getAccountValue(md.Accounts.HSA) * md.Returns.SPY

			snapshot.InvestmentGrowth = taxableGrowth + taxDeferredGrowth + rothGrowth + hsaGrowth
		}

		snapshots = append(snapshots, snapshot)
	}

	return snapshots
}

// aggregateToYearlyData aggregates monthly snapshots into yearly summaries
func aggregateToYearlyData(monthlySnapshots []DeterministicMonthSnapshot, input SimulationInput) []DeterministicYearData {
	if len(monthlySnapshots) == 0 {
		return nil
	}

	// Group by year
	yearMap := make(map[int]*DeterministicYearData)

	for i := range monthlySnapshots {
		ms := &monthlySnapshots[i]
		year := ms.CalendarYear

		if _, exists := yearMap[year]; !exists {
			yearMap[year] = &DeterministicYearData{
				Year:          year,
				Age:           int(ms.Age),
				StartNetWorth: ms.NetWorth,
				Months:        make([]DeterministicMonthSnapshot, 0, 12),
			}
		}

		yd := yearMap[year]
		yd.Months = append(yd.Months, *ms)
		yd.EndNetWorth = ms.NetWorth
		yd.TotalIncome += ms.IncomeThisMonth
		yd.TotalExpenses += ms.ExpensesThisMonth
		yd.TotalTaxes += ms.TaxesThisMonth
		yd.TotalContributions += ms.ContributionsThisMonth
		yd.TotalWithdrawals += ms.WithdrawalsThisMonth
		yd.InvestmentGrowth += ms.InvestmentGrowth
	}

	// Convert map to sorted slice
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		years = append(years, y)
	}

	// Simple sort
	for i := 0; i < len(years)-1; i++ {
		for j := i + 1; j < len(years); j++ {
			if years[i] > years[j] {
				years[i], years[j] = years[j], years[i]
			}
		}
	}

	result := make([]DeterministicYearData, 0, len(years))
	for _, y := range years {
		yd := yearMap[y]
		yd.NetWorthChange = yd.EndNetWorth - yd.StartNetWorth
		result = append(result, *yd)
	}

	return result
}
