package engine

import (
	"fmt"
	"math"
)

// SystemEventHandler handles system-generated events (TIME_STEP, MARKET_UPDATE, etc.)
// Simplified implementation for compatibility
type SystemEventHandlerSimple struct {
	engine      *SimulationEngine
	monthlyData *MonthlyDataSimulation
}

// NewSystemEventHandlerSimple creates a new system event handler
func NewSystemEventHandlerSimple(engine *SimulationEngine) *SystemEventHandlerSimple {
	return &SystemEventHandlerSimple{
		engine: engine,
	}
}

// SetMonthlyData sets the current monthly data for tracking
func (h *SystemEventHandlerSimple) SetMonthlyData(monthlyData *MonthlyDataSimulation) {
	h.monthlyData = monthlyData
}

// ProcessSystemEvent processes system events with real business logic extracted from legacy loop
func (h *SystemEventHandlerSimple) ProcessSystemEvent(event FinancialEvent, accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	simLogVerbose("🔧 [DEBUG] Month %d: Processing system event '%s'", monthOffset, event.Type)

	switch event.Type {
	case SystemEventTimeStep:
		return h.processTimeStep(accounts, monthOffset)

	case SystemEventMarketUpdate:
		return h.processMarketUpdate(accounts, monthOffset)

	case SystemEventCashCheck:
		return h.processCashShortfallCheck(accounts, monthOffset)

	case SystemEventRMDCheck:
		return h.processRMDCheck(accounts, monthOffset)

	case SystemEventTaxCheck:
		return h.processTaxCheck(accounts, monthOffset)

	case SystemEventYearEnd:
		return h.processYearEnd(accounts, monthOffset)

	case SystemEventDebtPayment:
		return h.processDebtPayments(accounts, monthOffset)

	case SystemEventFinancialHealthCheck:
		return h.processFinancialHealthCheck(accounts, monthOffset)

	default:
		return fmt.Errorf("unknown system event type: %s", event.Type)
	}
}

// processTimeStep handles TIME_STEP events (reset monthly flows, update lot status)
func (h *SystemEventHandlerSimple) processTimeStep(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// Reset monthly flow tracking for new month
	h.engine.resetMonthlyFlows()

	// Set month offset in monthly data if available
	if h.monthlyData != nil {
		h.monthlyData.MonthOffset = monthOffset
	}

	// PERF: In LiteMode, also do market update here (combined event)
	if h.engine.config.LiteMode {
		return h.processMarketUpdate(accounts, monthOffset)
	}

	// Update lot term status (long-term vs short-term capital gains)
	h.engine.cashManager.UpdateLotTermStatus(accounts, monthOffset)

	// Periodically optimize lot structure for performance (every 12 months)
	if monthOffset%12 == 0 {
		accountSlice := []*Account{
			GetTaxableAccount(accounts),
			GetTaxDeferredAccount(accounts),
			GetRothAccount(accounts),
		}
		for _, account := range accountSlice {
			if account != nil {
				h.engine.cashManager.OptimizeLotStructure(account)
			}
		}
	}

	return nil
}

// processMarketUpdate handles MARKET_UPDATE events (apply market growth to all accounts)
func (h *SystemEventHandlerSimple) processMarketUpdate(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// Calculate total before market update
	totalBefore := 0.0
	if accounts.Taxable != nil {
		totalBefore += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		totalBefore += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		totalBefore += accounts.Roth.TotalValue
	}

	simLogVerbose("📈 [MARKET_UPDATE] Month %d - BEFORE: Total=$%.2f (Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f, Cash=$%.2f)",
		monthOffset,
		totalBefore,
		getAccountVal(accounts.Taxable),
		getAccountVal(accounts.TaxDeferred),
		getAccountVal(accounts.Roth),
		accounts.Cash)

	// DEBUG: Check holdings state BEFORE market update
	if accounts.Taxable != nil && len(accounts.Taxable.Holdings) > 0 {
		holding := &accounts.Taxable.Holdings[0]
		simLogVerbose("🔍 [PRE-MARKET-UPDATE] Before: holding[0] qty=%.6f, price=%.2f, value=%.2f",
			holding.Quantity, holding.CurrentMarketPricePerUnit, holding.CurrentMarketValueTotal)
	}

	// Apply market growth using the existing ApplyMarketGrowth method
	err := h.engine.ApplyMarketGrowth(accounts, monthOffset)
	if err != nil {
		return fmt.Errorf("failed to apply market growth: %w", err)
	}

	// Calculate total after market update
	totalAfter := 0.0
	if accounts.Taxable != nil {
		totalAfter += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		totalAfter += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		totalAfter += accounts.Roth.TotalValue
	}

	simLogVerbose("📈 [MARKET_UPDATE] Month %d - AFTER: Total=$%.2f (Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f, Cash=$%.2f)",
		monthOffset,
		totalAfter,
		getAccountVal(accounts.Taxable),
		getAccountVal(accounts.TaxDeferred),
		getAccountVal(accounts.Roth),
		accounts.Cash)

	if totalAfter == 0 && totalBefore > 0 {
		simLogVerbose("❌ [MARKET_UPDATE] WARNING: All accounts zeroed out! Before=$%.2f, After=$%.2f", totalBefore, totalAfter)
	}

	return nil
}

// Helper function to safely get account value
func getAccountVal(account *Account) float64 {
	if account == nil {
		return 0.0
	}
	return account.TotalValue
}

// processCashShortfallCheck handles CASH_CHECK events (check for cash shortfalls and trigger withdrawals)
func (h *SystemEventHandlerSimple) processCashShortfallCheck(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	simLogVerbose("💰 [CASH_CHECK] Checking for cash shortfalls in month %d", monthOffset)

	// CRITICAL: Nil checks to identify crash source
	if h == nil {
		return fmt.Errorf("CRITICAL: handler is nil")
	}
	if h.engine == nil {
		return fmt.Errorf("CRITICAL: handler.engine is nil")
	}
	if h.engine.cashManager == nil {
		return fmt.Errorf("CRITICAL: handler.engine.cashManager is nil")
	}
	if h.engine.simulationInput == nil {
		return fmt.Errorf("CRITICAL: handler.engine.simulationInput is nil")
	}

	// Check if cash has gone negative after expenses
	// CASH_CHECK runs AFTER expenses have been paid, so accounts.Cash reflects post-expense balance
	monthlyExpenses := h.engine.currentMonthFlows.ExpensesThisMonth

	// Simple logic: If cash is negative or very low, withdraw to maintain minimum buffer
	// Check if cash strategy is configured in simulation input (from investment strategy)
	minCashBuffer := 0.0
	enforceMinimum := false

	if h.engine.simulationInput.CashStrategy != nil {
		// Use strategy-provided minimum cash balance if configured
		if h.engine.simulationInput.CashStrategy.TargetReserveAmount > 0 {
			minCashBuffer = h.engine.simulationInput.CashStrategy.TargetReserveAmount
			enforceMinimum = true
		} else if h.engine.simulationInput.CashStrategy.TargetReserveMonths > 0 {
			minCashBuffer = math.Max(monthlyExpenses*h.engine.simulationInput.CashStrategy.TargetReserveMonths, 0)
			enforceMinimum = true
		}
	}

	// CRITICAL FIX: Always handle negative cash, even if no minimum buffer is configured
	// This is a backup check in case expenses slip through without triggering pre-expense divestment
	if accounts.Cash < 0 {
		amountNeeded := -accounts.Cash + 100 // Raise enough to get back to at least $100 positive

		simLogVerbose("🚨 [NEGATIVE_CASH_BACKUP] Month %d: Cash=$%.2f is negative, need to raise $%.2f",
			monthOffset, accounts.Cash, amountNeeded)

		// Use the cash manager to perform forced withdrawal
		saleResult, _ := h.engine.cashManager.ExecuteWithdrawalWithStrategy(
			accounts, amountNeeded, h.engine.simulationInput.WithdrawalStrategy, monthOffset, 0, FilingStatusSingle)

		// Add the proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Track capital gains from the sale for tax purposes
		h.engine.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// Update monthly flows with withdrawal proceeds
		h.engine.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		simLogVerbose("💸 [NEGATIVE_CASH_BACKUP] Month %d: Raised $%.2f from investments, cash now $%.2f",
			monthOffset, saleResult.TotalProceeds, accounts.Cash)
	} else if enforceMinimum && accounts.Cash < minCashBuffer {
		// Cash is positive but below configured minimum buffer - optionally raise more
		amountNeeded := minCashBuffer - accounts.Cash

		simLogVerbose("🚨 [CASH_SHORTFALL] Cash=$%.2f below minimum buffer=$%.2f, need to raise $%.2f",
			accounts.Cash, minCashBuffer, amountNeeded)

		// Use the cash manager to perform forced withdrawal
		// Pass default values for tax parameters since this is a forced withdrawal, not tax-aware
		saleResult, _ := h.engine.cashManager.ExecuteWithdrawalWithStrategy(
			accounts, amountNeeded, h.engine.simulationInput.WithdrawalStrategy, monthOffset, 0, FilingStatusSingle)

		// Add the proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Track capital gains from the sale for tax purposes
		h.engine.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// Update monthly flows with withdrawal proceeds
		h.engine.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		fmt.Printf("💸 [FORCED_WITHDRAWAL] Month %d: Withdrew $%.2f to raise cash from $%.2f to $%.2f (target: $%.2f). DivestmentProceeds: $%.2f\n",
			monthOffset, saleResult.TotalProceeds,
			accounts.Cash - saleResult.TotalProceeds,  // Cash before withdrawal
			accounts.Cash,  // Cash after withdrawal
			minCashBuffer,
			h.engine.currentMonthFlows.DivestmentProceedsThisMonth)
	}

	return nil
}

// processRMDCheck handles RMD_CHECK events (calculate and process Required Minimum Distributions)
func (h *SystemEventHandlerSimple) processRMDCheck(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// Only process RMDs in December (month % 12 == 11)
	if monthOffset%12 != 11 {
		return nil
	}

	simLogVerbose("📊 [RMD_CHECK] Processing RMD check for year %d", monthOffset/12+2025)

	// Calculate user's current age based on initialAge from input
	age := h.engine.simulationInput.InitialAge + (monthOffset / 12)

	// Only process RMDs if age 73 or older
	if age >= 73 {
		// Process RMDs for tax-deferred accounts
		processRMDForAccount := func(account *Account, accountName string) error {
			if account != nil && account.TotalValue > 0 {
				rmdAmount := CalculateRMD(age, account.TotalValue)
				if rmdAmount > 0 {
					simLogVerbose("📊 [RMD] %s RMD: $%.2f (age %d, balance $%.2f)",
						accountName, rmdAmount, age, account.TotalValue)

					// Force withdrawal for RMD
					// Pass default values for tax parameters since this is an RMD withdrawal
					saleResult, remainingCash := h.engine.cashManager.ExecuteWithdrawalWithStrategy(
						accounts, rmdAmount, WithdrawalSequenceTaxEfficient, monthOffset, 0, FilingStatusSingle)

					// Track capital gains from any taxable account sales
					h.engine.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

					// Track RMD for tax purposes (RMDs from tax-deferred are ordinary income)
					h.engine.lastRMDAmount += saleResult.TotalProceeds
					h.engine.ordinaryIncomeYTD += saleResult.TotalProceeds

					_ = remainingCash // May be used for tracking
				}
			}
			return nil
		}

		// Process RMDs for traditional IRA/401k accounts
		if err := processRMDForAccount(GetTaxDeferredAccount(accounts), "Tax-Deferred"); err != nil {
			return err
		}
	}

	return nil
}

// processTaxCheck handles TAX_CHECK events (calculate and process annual taxes)
func (h *SystemEventHandlerSimple) processTaxCheck(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// Only process taxes in December (month % 12 == 11)
	if monthOffset%12 != 11 {
		return nil
	}

	simLogVerbose("🧾 [TAX_CHECK] Processing annual tax calculation for year %d", monthOffset/12+2025)

	// Calculate user's current age based on initialAge from input
	age := h.engine.simulationInput.InitialAge + (monthOffset / 12)

	// Use the existing ProcessAnnualTaxes method
	err := h.engine.ProcessAnnualTaxes(accounts, monthOffset, age)
	if err != nil {
		return fmt.Errorf("annual tax processing failed: %w", err)
	}

	return nil
}

// processYearEnd handles YEAR_END events (finalize year-end state and reset YTD trackers)
func (h *SystemEventHandlerSimple) processYearEnd(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// Only process in December
	if monthOffset%12 != 11 {
		return nil
	}

	year := monthOffset/12 + 2025
	simLogVerbose("🎊 [YEAR_END] Processing year-end finalization for %d", year)

	// Save current year's MAGI for IRMAA look-back (simplified)
	if h.engine.magiHistory == nil {
		h.engine.magiHistory = make(map[int]float64)
	}
	h.engine.magiHistory[year] = h.engine.ordinaryIncomeYTD + h.engine.capitalGainsYTD

	// Reset YTD trackers for the new year
	h.engine.ordinaryIncomeYTD = 0
	h.engine.capitalGainsYTD = 0
	h.engine.capitalLossesYTD = 0
	h.engine.qualifiedDividendsYTD = 0
	h.engine.ordinaryDividendsYTD = 0
	h.engine.interestIncomeYTD = 0
	h.engine.shortTermCapitalGainsYTD = 0
	h.engine.longTermCapitalGainsYTD = 0
	h.engine.socialSecurityBenefitsYTD = 0
	h.engine.qualifiedCharitableDistributionsYTD = 0
	h.engine.itemizedDeductibleInterestYTD = 0
	h.engine.preTaxContributionsYTD = 0
	h.engine.taxWithholdingYTD = 0
	h.engine.estimatedPaymentsYTD = 0

	simLogVerbose("✨ [YEAR_END] YTD trackers reset for year %d", year+1)

	return nil
}

// processDebtPayments handles monthly debt payment processing
func (h *SystemEventHandlerSimple) processDebtPayments(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	if len(h.engine.liabilities) == 0 {
		return nil // No debts to process
	}

	simLogVerbose("💳 [DEBT] Processing %d liability payments for month %d", len(h.engine.liabilities), monthOffset)

	totalPrincipalPaid := 0.0
	totalInterestPaid := 0.0
	remainingLiabilities := make([]*LiabilityInfo, 0, len(h.engine.liabilities))

	for _, liability := range h.engine.liabilities {
		// Skip if already paid off
		if liability.CurrentPrincipalBalance <= 0 || liability.TermRemainingMonths <= 0 {
			continue
		}

		// Calculate payment split using proper amortization
		// Convert annual interest rate to monthly rate
		monthlyRate := liability.InterestRate / 12.0
		principal, interest := CalculateAmortizationSplit(
			liability.CurrentPrincipalBalance,
			liability.MonthlyPayment,
			monthlyRate,
		)

		totalPayment := principal + interest

		// Check if we have sufficient cash
		if accounts.Cash < totalPayment {
			// Log warning but continue - this is a sign of financial distress
			simLogVerbose("⚠️  [DEBT] Insufficient cash for %s payment: need $%.2f, have $%.2f",
				liability.Name, totalPayment, accounts.Cash)
			// Keep the liability active - payment was missed
			remainingLiabilities = append(remainingLiabilities, liability)
			h.engine.consecutiveMissedPayments++
			continue
		}

		// Make the payment
		accounts.Cash -= totalPayment
		totalPrincipalPaid += principal
		totalInterestPaid += interest

		// Update liability
		liability.CurrentPrincipalBalance -= principal
		liability.TermRemainingMonths--

		// Track tax-deductible interest (e.g., mortgage interest)
		if liability.IsTaxDeductible {
			h.engine.itemizedDeductibleInterestYTD += interest
		}

		// Keep liability if still has balance
		if liability.CurrentPrincipalBalance > 0.01 && liability.TermRemainingMonths > 0 {
			remainingLiabilities = append(remainingLiabilities, liability)
		} else {
			simLogVerbose("✅ [DEBT] Paid off %s liability", liability.Name)
		}

		// Reset missed payments counter on successful payment
		h.engine.consecutiveMissedPayments = 0
	}

	// Update liability list with only remaining debts
	h.engine.liabilities = remainingLiabilities

	// Update monthly flows
	h.engine.currentMonthFlows.DebtPaymentsPrincipalThisMonth += totalPrincipalPaid
	h.engine.currentMonthFlows.DebtPaymentsInterestThisMonth += totalInterestPaid

	simLogVerbose("💰 [DEBT] Paid $%.2f principal, $%.2f interest. %d liabilities remaining",
		totalPrincipalPaid, totalInterestPaid, len(h.engine.liabilities))

	return nil
}

// processFinancialHealthCheck performs insolvency detection based on actual cash flow
func (h *SystemEventHandlerSimple) processFinancialHealthCheck(accounts *AccountHoldingsMonthEnd, monthOffset int) error {
	// BANKRUPTCY DEBUG: Always log month 0-3 financial health
	if monthOffset <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d HEALTH-CHECK: Cash=$%.2f, Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f",
			monthOffset,
			accounts.Cash,
			getAccountVal(accounts.Taxable),
			getAccountVal(accounts.TaxDeferred),
			getAccountVal(accounts.Roth))
	}

	// Insolvency occurs when cash is negative (couldn't meet obligations)
	if accounts.Cash < 0 {
		simLogVerbose("⚠️  [FINANCIAL-HEALTH] Month %d - Negative cash balance: $%.2f", monthOffset, accounts.Cash)

		// Debug: Show account balances before liquidation attempt
		taxableValue := 0.0
		if accounts.Taxable != nil {
			taxableValue = accounts.Taxable.TotalValue
		}
		taxDeferredValue := 0.0
		if accounts.TaxDeferred != nil {
			taxDeferredValue = accounts.TaxDeferred.TotalValue
		}
		rothValue := 0.0
		if accounts.Roth != nil {
			rothValue = accounts.Roth.TotalValue
		}

		simLogVerbose("⚠️  [FINANCIAL-HEALTH] Account balances: Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f",
			taxableValue, taxDeferredValue, rothValue)

		// Attempt to raise cash by selling liquid assets
		initialCashBalance := accounts.Cash
		requiredCash := -accounts.Cash + 100 // Need to get back to at least $100 positive
		simLogVerbose("⚠️  [FINANCIAL-HEALTH] Attempting to raise $%.2f to cover deficit", requiredCash)
		saleResult, actualAmount := h.engine.cashManager.ExecuteTaxEfficientWithdrawal(accounts, requiredCash, monthOffset)

		// Track capital gains from the sale for tax purposes
		h.engine.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// Add the proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		if actualAmount < requiredCash {
			// Could not raise enough cash - this is true insolvency
			h.engine.isBankrupt = true
			h.engine.bankruptcyMonth = monthOffset
			h.engine.bankruptcyTrigger = fmt.Sprintf("Bankruptcy triggered. Cash balance remains negative ($%.2f) after liquidating $%.2f in assets. System is insolvent.", accounts.Cash, actualAmount)

			simLogVerbose("💀 [BANKRUPTCY] Month %d - %s", monthOffset, h.engine.bankruptcyTrigger)
			simLogVerbose("    Initial cash: $%.2f, Required: $%.2f, Raised: $%.2f, Final cash: $%.2f",
				initialCashBalance, requiredCash, actualAmount, accounts.Cash)
			simLogVerbose("    Capital gains from liquidation: ST=$%.2f, LT=$%.2f",
				saleResult.ShortTermGains, saleResult.LongTermGains)

			// Return error to terminate simulation
			return fmt.Errorf("bankruptcy: %s", h.engine.bankruptcyTrigger)
		}

		simLogVerbose("✅ [FINANCIAL-HEALTH] Avoided insolvency by liquidating $%.2f in assets. Cash: $%.2f → $%.2f",
			actualAmount, initialCashBalance, accounts.Cash)
	}

	// Check for prolonged financial distress (consecutive missed payments)
	if h.engine.consecutiveMissedPayments >= 3 {
		h.engine.isBankrupt = true
		h.engine.bankruptcyMonth = monthOffset
		h.engine.bankruptcyTrigger = fmt.Sprintf("Chronic default: %d consecutive missed debt payments", h.engine.consecutiveMissedPayments)

		simLogVerbose("💀 [BANKRUPTCY] Month %d - %s", monthOffset, h.engine.bankruptcyTrigger)
		return fmt.Errorf("bankruptcy: %s", h.engine.bankruptcyTrigger)
	}

	// Calculate financial stress indicators
	netWorth := h.engine.calculateNetWorth(*accounts)
	totalDebt := h.engine.getTotalDebt()

	// Update stress level based on liquidity and debt burden
	if accounts.Cash < 1000 && totalDebt > 0 {
		h.engine.financialStressLevel = 3 // Critical
		h.engine.monthsInFinancialStress++
	} else if accounts.Cash < 5000 && totalDebt > netWorth*0.5 {
		h.engine.financialStressLevel = 2 // Distressed
		h.engine.monthsInFinancialStress++
	} else if accounts.Cash < 10000 {
		h.engine.financialStressLevel = 1 // Stressed
		h.engine.monthsInFinancialStress++
	} else {
		h.engine.financialStressLevel = 0 // Healthy
		h.engine.monthsInFinancialStress = 0
	}

	return nil
}

// getTotalDebt calculates total outstanding debt
func (se *SimulationEngine) getTotalDebt() float64 {
	totalDebt := 0.0
	for _, liability := range se.liabilities {
		totalDebt += liability.CurrentPrincipalBalance
	}
	return totalDebt
}
