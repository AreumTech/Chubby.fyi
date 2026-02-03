package engine

import (
	"fmt"
	"math"
	"strings"
)

// EventHandler defines the interface for processing financial events
type EventHandler interface {
	Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error
}

// EventProcessingContext contains the context needed for event processing
type EventProcessingContext struct {
	SimulationEngine *SimulationEngine
	CurrentMonth     int
}

// IncomeEventHandler handles income events
type IncomeEventHandler struct{}

func (h *IncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// fmt.Printf("🔴 [INCOME-HANDLER] ENTRY: event.Amount=%.2f\n", event.Amount)

	se := context.SimulationEngine
	// fmt.Printf("🔴 [INCOME-HANDLER] Got SimulationEngine from context\n")

	currentMonth := context.CurrentMonth
	// fmt.Printf("🔴 [INCOME-HANDLER] Got currentMonth=%d\n", currentMonth)

	// PERF: Guard debug strings with VERBOSE_DEBUG to avoid allocation in production
	// 🎯 [MONTH-11-SAFETY] Add debug logging for Month 11 income processing
	if VERBOSE_DEBUG && currentMonth >= 11 {
		_ = fmt.Sprintf("🎯 [INCOME-M11] Starting income processing Month %d, Amount=$%.2f\n",
			currentMonth, event.Amount)
	}

	// fmt.Printf("🔴 [INCOME-HANDLER] About to call getStringFromMetadata\n")

	// Level 0 (VERBOSE): Detailed debug logging
	simLogVerbose("🔍 [INCOME-HANDLER] Processing income event: ID=%s, Amount=$%.2f, Month=%d",
		event.ID, event.Amount, currentMonth)

	// Calculate tax withholding using proper progressive withholding method
	// Extract metadata for withholding calculation
	// fmt.Printf("🔴 [INCOME-HANDLER] About to get payFrequency\n")
	payFrequency := getStringFromMetadata(event.Metadata, "payFrequency", "monthly")
	// fmt.Printf("🔴 [INCOME-HANDLER] Got payFrequency=%s, about to get filingStatus\n", payFrequency)

	filingStatus := FilingStatus(getStringFromMetadata(event.Metadata, "filingStatus", string(FilingStatusSingle)))
	// fmt.Printf("🔴 [INCOME-HANDLER] Got filingStatus=%s, about to get tax config\n", filingStatus)

	// Create tax calculator with default configuration for withholding
	taxConfig := GetDefaultTaxConfigDetailed()
	// fmt.Printf("🔴 [INCOME-HANDLER] Got tax config, about to set filing status\n")

	taxConfig.FilingStatus = filingStatus
	// fmt.Printf("🔴 [INCOME-HANDLER] Set filing status, about to create calculator\n")

	taxCalculator := NewTaxCalculator(taxConfig, nil)
	// fmt.Printf("🔴 [INCOME-HANDLER] Created tax calculator\n")

	// Calculate accurate withholding using IRS Percentage Method
	// fmt.Printf("🔴 [INCOME-HANDLER] About to call CalculateFederalWithholding\n")
	salaryWithholding := taxCalculator.CalculateFederalWithholding(event.Amount, payFrequency, filingStatus)
	// fmt.Printf("🔴 [INCOME-HANDLER] CalculateFederalWithholding returned: %.2f\n", salaryWithholding)

	netIncome := event.Amount - salaryWithholding
	// fmt.Printf("🔴 [INCOME-HANDLER] Calculated netIncome: %.2f\n", netIncome)

	// PERF: Guard debug strings with VERBOSE_DEBUG
	if VERBOSE_DEBUG && currentMonth < 3 {
		_ = fmt.Sprintf("DEBUG INCOME Tax calculation: Gross=$%.2f Withholding=$%.2f Net=$%.2f\n",
			event.Amount, salaryWithholding, netIncome)
	}

	// fmt.Printf("🔴 [INCOME-HANDLER] About to update cash (before=%.2f)\n", accounts.Cash)
	cashBefore := accounts.Cash
	accounts.Cash += netIncome
	// fmt.Printf("🔴 [INCOME-HANDLER] Cash updated (after=%.2f)\n", accounts.Cash)

	// fmt.Printf("🔴 [INCOME-HANDLER] About to update cashFlow\n")
	*cashFlow += netIncome
	// fmt.Printf("🔴 [INCOME-HANDLER] CashFlow updated\n")

	// PERF: Guard debug strings with VERBOSE_DEBUG
	if VERBOSE_DEBUG && currentMonth < 3 {
		_ = fmt.Sprintf("DEBUG INCOME Cash updated: $%.2f to $%.2f (added $%.2f net)\n",
			cashBefore, accounts.Cash, netIncome)
		_ = fmt.Sprintf("💵 [INCOME-HANDLER] Income processing complete\n")
	}

	// Track monthly flow
	// fmt.Printf("🔴 [INCOME-HANDLER] About to track monthly flows\n")
	// fmt.Printf("🔴 [INCOME-HANDLER] About to access se.currentMonthFlows\n")
	se.currentMonthFlows.IncomeThisMonth += event.Amount
	// fmt.Printf("🔴 [INCOME-HANDLER] Updated IncomeThisMonth\n")

	se.currentMonthFlows.EmploymentIncomeThisMonth += event.Amount // NEW: Track employment income separately
	// fmt.Printf("🔴 [INCOME-HANDLER] Updated EmploymentIncomeThisMonth\n")

	se.currentMonthFlows.TaxWithheldThisMonth += salaryWithholding
	// fmt.Printf("🔴 [INCOME-HANDLER] Updated TaxWithheldThisMonth\n")

	// Track granular income types
	// fmt.Printf("🔴 [INCOME-HANDLER] About to track granular income types\n")
	if event.IncomeType != nil {
		switch *event.IncomeType {
		case "salary":
			se.currentMonthFlows.SalaryIncomeThisMonth += event.Amount
		case "bonus":
			se.currentMonthFlows.BonusIncomeThisMonth += event.Amount
		case "rsu":
			se.currentMonthFlows.RSUIncomeThisMonth += event.Amount
		default:
			// Default to salary if no specific type
			se.currentMonthFlows.SalaryIncomeThisMonth += event.Amount
		}
	} else {
		// Default to salary if no income type specified
		se.currentMonthFlows.SalaryIncomeThisMonth += event.Amount
	}
	// fmt.Printf("🔴 [INCOME-HANDLER] Granular income types tracked\n")

	// UNIFIED INCOME TRACKING FIX: Remove separate employmentIncomeYTD tracker
	// ProcessIncome will update ordinaryIncomeYTD, which will be used for BOTH income tax AND FICA
	// This prevents the critical bug where employmentIncomeYTD and ordinaryIncomeYTD get out of sync
	// resulting in "$124k tax on $0 income" (all FICA, no income tax)

	// 🎯 [MONTH-11-SAFETY] Add debug logging before tax processing
	if currentMonth >= 11 {
		simLogVerbose("🎯 [INCOME-M11] About to call ProcessIncome for Month %d", currentMonth)
	}

	// BANKRUPTCY DEBUG: Log income (months 0-3 only)
	if context.CurrentMonth <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d INCOME: Event=%s, Amount=$%.2f, CashBefore=$%.2f",
			context.CurrentMonth, event.ID, event.Amount, accounts.Cash)
	}

	// Track ordinary income for taxes with withholding
	se.ProcessIncome(event.Amount, false, salaryWithholding)
	// fmt.Printf("🔴 [INCOME-HANDLER] ProcessIncome completed\n")

	// BANKRUPTCY DEBUG: Log result (months 0-3 only)
	if context.CurrentMonth <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d INCOME END: CashAfter=$%.2f",
			context.CurrentMonth, accounts.Cash)
	}

	if currentMonth >= 11 {
		simLogVerbose("🎯 [INCOME-M11] ProcessIncome completed for Month %d", currentMonth)
	}

	// Record in ledger
	// fmt.Printf("🔴 [INCOME-HANDLER] About to record in ledger\n")
	if err := se.ledger.RecordIncome(event.Amount, "salary"); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record income in ledger: %v", err)
	}
	// fmt.Printf("🔴 [INCOME-HANDLER] Ledger recording completed\n")

	if currentMonth >= 11 {
		simLogVerbose("🎯 [INCOME-M11] Income processing completed for Month %d", currentMonth)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: INCOME | Amount: $%.2f | Result: Cash +$%.2f (net), YTD Income: $%.2f",
		currentMonth, event.Amount, netIncome, se.ordinaryIncomeYTD)

	// fmt.Printf("🔴 [INCOME-HANDLER] About to return nil\n")
	return nil
}

// RecurringExpenseEventHandler handles recurring expense events
type RecurringExpenseEventHandler struct{}

func (h *RecurringExpenseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Input validation ensures amounts are positive
	expenseAmount := event.Amount

	// Level 0 (VERBOSE): Detailed debug logging
	simLogVerbose("💰 [EXPENSE-HANDLER] Month %d EXPENSE: Event=%s, Amount=$%.2f, CashBefore=$%.2f",
		context.CurrentMonth, event.ID, expenseAmount, accounts.Cash)

	// PERF: Guard debug strings with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG {
		_ = fmt.Sprintf("🚨 [EXPENSE-HANDLER] Processing expense: ID=%s Amount=$%.2f\n", event.ID, expenseAmount)
		_ = fmt.Sprintf("🚨 [EXPENSE-HANDLER] Before: ExpensesThisMonth=$%.2f\n", se.currentMonthFlows.ExpensesThisMonth)
	}

	// CRITICAL FIX: Check if we have enough cash BEFORE processing expense
	// If not, divest from investment accounts to cover the shortfall
	if accounts.Cash < expenseAmount {
		shortfall := expenseAmount - accounts.Cash

		simLogVerbose("💰 [PRE-EXPENSE-CHECK] Month %d: Insufficient cash ($%.2f) for expense ($%.2f), need to raise $%.2f",
			context.CurrentMonth, accounts.Cash, expenseAmount, shortfall)

		// Attempt to raise cash from investments
		saleResult, _ := se.cashManager.ExecuteWithdrawalWithStrategy(
			accounts, shortfall, se.simulationInput.WithdrawalStrategy, context.CurrentMonth, 0, FilingStatusSingle)

		// Add proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Track capital gains
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// Track divestment
		se.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		simLogVerbose("💰 [PRE-EXPENSE-CHECK] Raised $%.2f from investments, cash now $%.2f",
			saleResult.TotalProceeds, accounts.Cash)
	}

	accounts.Cash -= expenseAmount
	*cashFlow -= expenseAmount

	// Track monthly flow (always as positive expense amount)
	se.currentMonthFlows.ExpensesThisMonth += expenseAmount

	// Track granular expense categories
	if event.ExpenseCategory != nil {
		switch *event.ExpenseCategory {
		case "housing":
			se.currentMonthFlows.HousingExpensesThisMonth += expenseAmount
		case "transportation":
			se.currentMonthFlows.TransportationExpensesThisMonth += expenseAmount
		case "food":
			se.currentMonthFlows.FoodExpensesThisMonth += expenseAmount
		case "other":
			se.currentMonthFlows.OtherExpensesThisMonth += expenseAmount
		default:
			// Default to other if unknown category
			se.currentMonthFlows.OtherExpensesThisMonth += expenseAmount
		}
	} else {
		// Default to other if no category specified
		se.currentMonthFlows.OtherExpensesThisMonth += expenseAmount
	}

	// PERF: Guard debug strings with VERBOSE_DEBUG
	if VERBOSE_DEBUG {
		_ = fmt.Sprintf("🚨 [EXPENSE-HANDLER] After: ExpensesThisMonth=$%.2f\n", se.currentMonthFlows.ExpensesThisMonth)
	}

	// Record in ledger
	if err := se.ledger.RecordExpense(expenseAmount, string(event.Type)); err != nil {
		if VERBOSE_DEBUG {
			_ = fmt.Sprintf("Warning: Failed to record expense in ledger: %v\n", err)
		}
	}

	// BANKRUPTCY DEBUG: Log result (months 0-3 only)
	if context.CurrentMonth <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d EXPENSE END: CashAfter=$%.2f",
			context.CurrentMonth, accounts.Cash)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: RECURRING_EXPENSE | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, expenseAmount, expenseAmount)

	return nil
}

// OneTimeExpenseEventHandler handles one-time expense events
type OneTimeExpenseEventHandler struct{}

func (h *OneTimeExpenseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Reduce cash and update cash flow
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track monthly flow for TRACE.md reconciliation
	se.currentMonthFlows.ExpensesThisMonth += event.Amount
	se.currentMonthFlows.OtherExpensesThisMonth += event.Amount

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: ONE_TIME_EXPENSE | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// ScheduledContributionEventHandler handles scheduled contribution events
// ScheduledContributionEventHandler wraps the original handler with extensive debugging
type ScheduledContributionEventHandler struct {
	contributionCount map[string]int  // Track how many times each contribution is processed
	monthlyTotals     map[int]float64 // Track total contributions per month
}

func NewScheduledContributionEventHandler() *ScheduledContributionEventHandler {
	return &ScheduledContributionEventHandler{
		contributionCount: make(map[string]int),
		monthlyTotals:     make(map[int]float64),
	}
}

func (h *ScheduledContributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// CRITICAL DEBUG: Log contribution events when verbose debugging is enabled
	simLogVerbose("🔍 [CONTRIBUTION-HANDLER] Processing contribution event: ID=%s, Amount=$%.2f, Month=%d",
		event.ID, event.Amount, currentMonth)

	// SAFETY: Create safe event ID for tracking to prevent ValueOf panics
	var safeEventID string
	if currentMonth >= 11 {
		// Use index-based ID for Month 11+ to avoid ValueOf issues
		safeEventID = fmt.Sprintf("event_%d", len(h.contributionCount))
	} else {
		safeEventID = event.ID
	}

	// Track how many times this specific event is processed
	h.contributionCount[safeEventID]++
	h.monthlyTotals[currentMonth] += event.Amount

	// Debug logs disabled to reduce spam - frequency conversion is working correctly
	// The 35 events at $23K each shows the preprocessing is correct

	// Only log critical errors if over-processing is detected
	if currentMonth < 11 && h.contributionCount[safeEventID] > currentMonth+1 {
		debugErrorf("[BUG-DETECTED] Event processed %d times by month %d - OVER-PROCESSING!",
			h.contributionCount[safeEventID], currentMonth)
	}

	// CRITICAL: Skip contributions if in decumulation mode (income < expenses)
	// The min cash reserve is for "should I contribute excess?" not a hard floor
	// In decumulation, you're intentionally drawing down assets - don't contribute
	monthlyIncome := se.currentMonthFlows.IncomeThisMonth
	monthlyExpenses := se.currentMonthFlows.ExpensesThisMonth

	if monthlyIncome < monthlyExpenses {
		simLogVerbose("CONTRIBUTION-SKIP Event %s: In decumulation mode (Income=$%.2f < Expenses=$%.2f), skipping",
			event.ID, monthlyIncome, monthlyExpenses)
		return nil
	}

	// Smart contribution logic - contribute up to the maximum specified amount based on available cash
	// This treats the event amount as a "max contribution" rather than a fixed amount
	availableCash := accounts.Cash

	// Use configured cash management strategy or sensible defaults
	var targetReserveMonths float64 = 3.0 // Default: 3 months of expenses
	var targetReserveAmount float64 = 0.0

	// Check if cash strategy is configured
	if se.simulationInput != nil && se.simulationInput.CashStrategy != nil {
		if se.simulationInput.CashStrategy.TargetReserveMonths > 0 {
			targetReserveMonths = se.simulationInput.CashStrategy.TargetReserveMonths
		}
		if se.simulationInput.CashStrategy.TargetReserveAmount > 0 {
			targetReserveAmount = se.simulationInput.CashStrategy.TargetReserveAmount
		}
	}

	// BANKRUPTCY DEBUG: Log contribution attempt (months 0-3 only)
	if currentMonth <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d CONTRIBUTION START: Event=%s, RequestedAmount=$%.2f, CurrentCash=$%.2f, InvestedAssets=$%.2f",
			currentMonth, event.ID, event.Amount, accounts.Cash,
			accounts.Taxable.TotalValue+accounts.TaxDeferred.TotalValue+accounts.Roth.TotalValue)
	}

	// Calculate minimum cash reserve using rolling expense average
	// Priority: rolling average (3-6 months) > current month > default
	monthlyExpenses = se.getEstimatedMonthlyExpenses()

	// Use the higher of: months-based reserve or absolute amount
	minCashReserve := math.Max(monthlyExpenses*targetReserveMonths, targetReserveAmount)

	// Check if user is just starting out (has minimal invested assets)
	totalInvestedAssets := accounts.Taxable.TotalValue + accounts.TaxDeferred.TotalValue + accounts.Roth.TotalValue
	if accounts.FiveTwoNine != nil {
		totalInvestedAssets += accounts.FiveTwoNine.TotalValue
	}
	if accounts.HSA != nil {
		totalInvestedAssets += accounts.HSA.TotalValue
	}

	// If user is just starting out (< $1000 in investments), be more lenient with cash reserves
	if totalInvestedAssets < 1000.0 && availableCash <= minCashReserve {
		// Allow contributions when starting out, but keep at least $1000 cash buffer
		minimalCashBuffer := 1000.0
		if availableCash <= minimalCashBuffer {
			simLogVerbose("CONTRIBUTION-SKIP Event %s: Cash $%.2f <= minimal buffer $%.2f (starting out), skipping",
				event.ID, availableCash, minimalCashBuffer)
			return nil
		}
		simLogVerbose("CONTRIBUTION-STARTER Event %s: Cash $%.2f < normal reserve $%.2f, but allowing contribution (starting out)",
			event.ID, availableCash, minCashReserve)
	} else if availableCash <= minCashReserve {
		// Skip contribution if we're at or below minimum cash reserves and already have investments
		simLogVerbose("CONTRIBUTION-SKIP Event %s: Cash $%.2f <= reserve $%.2f (%.1fx monthly expenses), skipping",
			event.ID, availableCash, minCashReserve, targetReserveMonths)
		return nil
	}

	// Calculate how much we can actually contribute
	maxAvailableToContribute := availableCash - minCashReserve
	actualContribution := math.Min(event.Amount, maxAvailableToContribute)

	if actualContribution <= 0 {
		simLogVerbose("CONTRIBUTION-SKIP Event %s: No cash available for contribution", event.ID)
		return nil
	}

	// Only contribute what we can afford
	accounts.Cash -= actualContribution
	se.currentMonthFlows.ContributionsToInvestmentsThisMonth += actualContribution

	// BANKRUPTCY DEBUG: Log contribution result (months 0-3 only)
	if currentMonth <= 3 {
		simLogVerbose("💰 [BANKRUPTCY-DEBUG] Month %d CONTRIBUTION END: ActualAmount=$%.2f, CashAfter=$%.2f, MinReserve=$%.2f",
			currentMonth, actualContribution, accounts.Cash, minCashReserve)
	}

	if actualContribution < event.Amount {
		simLogVerbose("CONTRIBUTION-PARTIAL Event %s: Contributed $%.2f of $%.2f target (cash limited)",
			event.ID, actualContribution, event.Amount)
	}

	// Get target account with routing fix
	originalTarget := getStringFromMetadata(event.Metadata, "targetAccount", "taxable")
	targetAccount := originalTarget

	simLogVerbose("ROUTING-DEBUG Event %s: originalTarget=%s", event.ID, originalTarget)

	if event.Type == string(EventTypeScheduledContribution) && targetAccount == "taxable" {
		if legacyAccountType := getStringFromMetadata(event.Metadata, "accountType", ""); legacyAccountType != "" {
			simLogVerbose("ROUTING-DEBUG Event %s: Found legacyAccountType=%s", event.ID, legacyAccountType)
			switch legacyAccountType {
			case "401k", "403b", "401k_traditional":
				targetAccount = "tax_deferred"
				simLogVerbose("ROUTING-DEBUG Event %s: Mapped %s -> tax_deferred", event.ID, legacyAccountType)
			case "rothIra", "401k_roth":
				targetAccount = "roth"
				simLogVerbose("ROUTING-DEBUG Event %s: Mapped %s -> roth", event.ID, legacyAccountType)
			case "ira":
				targetAccount = "tax_deferred"
				simLogVerbose("ROUTING-DEBUG Event %s: Mapped %s -> tax_deferred", event.ID, legacyAccountType)
			}
		} else {
			simLogVerbose("ROUTING-DEBUG Event %s: No legacyAccountType, keeping targetAccount=%s", event.ID, targetAccount)
		}
	} else {
		simLogVerbose("ROUTING-DEBUG Event %s: No routing needed, eventType=%s targetAccount=%s", event.ID, event.Type, targetAccount)
	}

	// DEFENSIVE: Check event ID/description for retirement account keywords as final validation
	eventText := strings.ToLower(event.Description + " " + event.ID)
	if targetAccount == "taxable" {
		corrected := false
		if strings.Contains(eventText, "401k") || strings.Contains(eventText, "401(k)") || strings.Contains(eventText, "403b") {
			simLogVerbose("⚠️ [ROUTING-CORRECTION] Event '%s' appears to be a 401k/403b contribution but was routed to taxable. Correcting to tax_deferred.", event.ID)
			targetAccount = "tax_deferred"
			corrected = true
		} else if strings.Contains(eventText, "traditional ira") || (strings.Contains(eventText, "ira") && !strings.Contains(eventText, "roth")) {
			simLogVerbose("⚠️ [ROUTING-CORRECTION] Event '%s' appears to be a Traditional IRA contribution but was routed to taxable. Correcting to tax_deferred.", event.ID)
			targetAccount = "tax_deferred"
			corrected = true
		} else if strings.Contains(eventText, "roth") {
			simLogVerbose("⚠️ [ROUTING-CORRECTION] Event '%s' appears to be a Roth contribution but was routed to taxable. Correcting to roth.", event.ID)
			targetAccount = "roth"
			corrected = true
		}
		if corrected {
			simLogVerbose("ROUTING-DEBUG Event %s: CORRECTED targetAccount=%s (was taxable)", event.ID, targetAccount)
		}
	}

	simLogVerbose("ROUTING-DEBUG Event %s: FINAL targetAccount=%s", event.ID, targetAccount)

	rawAssetClass := AssetClass(getStringFromMetadata(event.Metadata, "assetClass", string(AssetClassUSStocksTotalMarket)))
	assetClass := NormalizeAssetClass(rawAssetClass)

	if rawAssetClass != assetClass {
		simLogVerbose("🔧 [ASSET-CLASS-NORMALIZE] Converted %s → %s", rawAssetClass, assetClass)
	}

	// CRITICAL FIX: Apply contribution limits and route excess to taxable
	// Use the actual contribution amount (which may be less than requested due to cash constraints)
	contributionAmount := actualContribution
	excessAmount := 0.0

	// Apply contribution limits based on account type
	switch targetAccount {
	case "tax_deferred":
		excessAmount = se.enforcePreTaxContributionLimits(&contributionAmount, currentMonth)
		// Track allowed pre-tax contributions for tax calculations
		if contributionAmount > 0 {
			se.preTaxContributionsYTD += contributionAmount

			// Debug YTD tracking
			if currentMonth < 12 {
				simLogVerbose("[YTD-DEBUG] Month %d: preTaxContributionsYTD = $%.2f after adding $%.2f",
					currentMonth, se.preTaxContributionsYTD, contributionAmount)
			}
		}
	case "roth":
		excessAmount = se.enforceRothContributionLimits(&contributionAmount, currentMonth)
	}

	// Process the allowed contribution amount
	if contributionAmount > 0 {
		if err := se.processInvestmentContributionWithFIFO(accounts, contributionAmount, targetAccount, assetClass, currentMonth); err != nil {
			// CRITICAL: Holdings creation failed - restore the cash that was deducted
			simLogVerbose("❌ [CONTRIBUTION-FAILED] Failed to create holding: %v - restoring $%.2f to cash", err, contributionAmount)
			accounts.Cash += contributionAmount  // Restore cash
			se.currentMonthFlows.ContributionsToInvestmentsThisMonth -= contributionAmount  // Adjust tracking
			return fmt.Errorf("contribution failed: %w", err)
		}

		// Track contribution by account type
		switch targetAccount {
		case "taxable":
			se.currentMonthFlows.ContributionsTaxableThisMonth += contributionAmount
		case "tax_deferred":
			se.currentMonthFlows.ContributionsTaxDeferredThisMonth += contributionAmount
		case "roth":
			se.currentMonthFlows.ContributionsRothThisMonth += contributionAmount
		}
	}

	// Route excess to taxable account
	if excessAmount > 0 {
		simLogVerbose("🔍 ROUTING EXCESS TO TAXABLE: $%.0f excess from %s account", excessAmount, targetAccount)
		if err := se.processInvestmentContributionWithFIFO(accounts, excessAmount, "taxable", assetClass, currentMonth); err != nil {
			// CRITICAL: Excess routing failed - restore the cash
			simLogVerbose("❌ [EXCESS-ROUTING-FAILED] Failed to create holding: %v - restoring $%.2f to cash", err, excessAmount)
			accounts.Cash += excessAmount  // Restore cash
			return fmt.Errorf("excess contribution routing failed: %w", err)
		}

		// Track excess contribution to taxable
		se.currentMonthFlows.ContributionsTaxableThisMonth += excessAmount
	}

	// Debug account balances after contribution (including excess routing)
	if currentMonth < 12 || currentMonth%12 == 0 {
		var targetBalance, taxableBalance float64
		switch targetAccount {
		case "tax_deferred":
			if taxDeferredAccount := GetTaxDeferredAccount(accounts); taxDeferredAccount != nil {
				targetBalance = taxDeferredAccount.TotalValue
			}
		case "taxable":
			if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil {
				targetBalance = taxableAccount.TotalValue
			}
		case "roth":
			if rothAccount := GetRothAccount(accounts); rothAccount != nil {
				targetBalance = rothAccount.TotalValue
			}
		}

		// Always check taxable balance for excess routing
		if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil {
			taxableBalance = taxableAccount.TotalValue
		}

		simLogVerbose("[CONTRIBUTION-RESULT] Month %d: $%.0f to %s (balance: $%.0f), $%.0f excess to taxable (balance: $%.0f)",
			currentMonth, contributionAmount, targetAccount, targetBalance, excessAmount, taxableBalance)
	}

	// Level 1 (EVENT): One-line event summary
	if actualContribution < event.Amount {
		simLogEvent("INFO  [Month %d] Event: CONTRIBUTION | Requested: $%.2f | Actual: $%.2f (%.0f%%) | Target: %s | Result: Cash -$%.2f",
			currentMonth, event.Amount, actualContribution, (actualContribution/event.Amount)*100, targetAccount, actualContribution)
	} else {
		simLogEvent("INFO  [Month %d] Event: CONTRIBUTION | Amount: $%.2f | Target: %s | Result: Cash -$%.2f",
			currentMonth, actualContribution, targetAccount, actualContribution)
	}

	// Record in ledger
	if err := se.ledger.RecordInvestment(event.Amount, targetAccount); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record investment in ledger: %v\n", err)
		}
	}

	return nil
}

// RothConversionEventHandler handles Roth conversion events
type RothConversionEventHandler struct{}

func (h *RothConversionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	simLogVerbose("🔍 [ROTH-CONVERSION] Starting transaction-based conversion: event.ID=%s, amount=%.2f", event.ID, event.Amount)

	if accounts == nil {
		return fmt.Errorf("accounts parameter is nil")
	}
	if cashFlow == nil {
		return fmt.Errorf("cashFlow parameter is nil")
	}
	if context == nil {
		return fmt.Errorf("context parameter is nil")
	}

	if accounts.TaxDeferred == nil {
		return fmt.Errorf("tax-deferred account required for Roth conversion")
	}
	if accounts.Roth == nil {
		return fmt.Errorf("Roth account required for Roth conversion")
	}

	conversionAmount := event.Amount
	if accounts.TaxDeferred.TotalValue < conversionAmount {
		return fmt.Errorf("insufficient tax-deferred balance for conversion: need %.2f, have %.2f",
			conversionAmount, accounts.TaxDeferred.TotalValue)
	}

	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	simLogVerbose("🔍 [ROTH-CONVERSION] Pre-conversion balances: TaxDeferred=%.2f, Roth=%.2f",
		accounts.TaxDeferred.TotalValue, accounts.Roth.TotalValue)

	// STEP 1: Sell assets from tax-deferred account using FIFO
	saleResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.TaxDeferred, conversionAmount, currentMonth)

	if saleResult.TotalProceeds < conversionAmount {
		return fmt.Errorf("unable to sell sufficient assets for conversion: need %.2f, sold %.2f",
			conversionAmount, saleResult.TotalProceeds)
	}

	simLogVerbose("🔍 [ROTH-CONVERSION] Sold assets: proceeds=%.2f, shortTerm=%.2f, longTerm=%.2f",
		saleResult.TotalProceeds, saleResult.ShortTermGains, saleResult.LongTermGains)

	// CRITICAL FIX: Roth conversions from tax-deferred accounts are NOT capital gains!
	// The entire distribution amount is taxed as ORDINARY INCOME per IRS rules.
	// DO NOT record any capital gains - this was a fundamental mathematical error.

	// STEP 2: Add conversion amount to ordinary income for tax calculation
	// The entire conversion amount becomes taxable ordinary income
	se.ProcessIncome(conversionAmount, false, 0) // Ordinary income, no withholding

	simLogVerbose("✅ [ROTH-CONVERSION-TAX] Added $%.2f as ordinary income (NO capital gains per IRS rules)", conversionAmount)

	// STEP 4: Add proceeds to cash (simulate selling)
	proceeds := saleResult.TotalProceeds
	accounts.Cash += proceeds

	// STEP 5: Recreate the same asset mix in the Roth account
	// Use proportional allocation based on what was sold
	if len(saleResult.SaleTransactions) > 0 {
		// Group sales by asset class to determine proportions
		assetClassProceeds := make(map[AssetClass]float64)
		for _, transaction := range saleResult.SaleTransactions {
			assetClassProceeds[transaction.AssetClass] += transaction.Proceeds
		}

		// Purchase proportional amounts in Roth account
		for assetClass, classProceeds := range assetClassProceeds {
			purchaseAmount := (classProceeds / proceeds) * conversionAmount
			if purchaseAmount > 0 {
				simLogVerbose("🔍 [ROTH-CONVERSION] Purchasing %.2f of %s in Roth account", purchaseAmount, assetClass)

				err := se.cashManager.AddHoldingWithLotTracking(accounts.Roth, assetClass, purchaseAmount, currentMonth)
				if err != nil {
					// CRITICAL: Engine must fail fast when share-based accounting fails
					// No post-processing corrections - return error to stop simulation
					return fmt.Errorf("CRITICAL: Roth conversion failed - could not create proper share-based holding for asset class %s: %v", assetClass, err)
				}
			}
		}
	} else {
		// CRITICAL: Engine must fail fast when no proper transactions exist
		// No fake cash equivalents - return error to stop simulation
		return fmt.Errorf("CRITICAL: Roth conversion failed - no sale transactions found, cannot properly allocate %v to share-based holdings", conversionAmount)
	}

	// STEP 6: Deduct the conversion amount from cash
	accounts.Cash -= conversionAmount

	simLogVerbose("🔍 [ROTH-CONVERSION] Post-conversion balances: TaxDeferred=%.2f, Roth=%.2f, Cash=%.2f",
		accounts.TaxDeferred.TotalValue, accounts.Roth.TotalValue, accounts.Cash)

	simLogVerbose("🔍 [ROTH-CONVERSION] Transaction-based conversion completed successfully")

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: ROTH_CONVERSION | Amount: $%.2f | Result: TaxDeferred -$%.2f, Roth +$%.2f (taxable income)",
		currentMonth, conversionAmount, conversionAmount, conversionAmount)

	return nil
}

// SocialSecurityIncomeEventHandler handles Social Security income events
type SocialSecurityIncomeEventHandler struct{}

func (h *SocialSecurityIncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Check if COLA adjustment is enabled
	isColaAdjusted := getBoolFromMetadata(event.Metadata, "isColaAdjusted", false)
	adjustedAmount := event.Amount

	if isColaAdjusted && se.currentMonthReturns != nil {
		// Apply COLA adjustment based on inflation rate
		// IMPROVED: Use precise float division instead of integer division
		yearsSinceStart := float64(currentMonth) / 12.0
		if yearsSinceStart > 0 {
			adjustedAmount = event.Amount * math.Pow(1+se.currentMonthReturns.Inflation, yearsSinceStart)
		}
	}

	accounts.Cash += adjustedAmount
	*cashFlow += adjustedAmount
	// Track monthly flow
	se.currentMonthFlows.IncomeThisMonth += adjustedAmount
	se.currentMonthFlows.SocialSecurityIncomeThisMonth += adjustedAmount // Track separately for Trace View
	// Calculate taxable portion using proper IRS formula
	// Note: We'll calculate the exact taxable amount during annual tax processing
	// For now, just track the gross amount and handle taxation in ProcessAnnualTaxes
	se.socialSecurityBenefitsYTD += adjustedAmount

	// Level 1 (EVENT): One-line event summary
	if isColaAdjusted {
		simLogEvent("INFO  [Month %d] Event: SOCIAL_SECURITY | Amount: $%.2f (COLA-adjusted from $%.2f) | Result: Cash +$%.2f",
			currentMonth, adjustedAmount, event.Amount, adjustedAmount)
	} else {
		simLogEvent("INFO  [Month %d] Event: SOCIAL_SECURITY | Amount: $%.2f | Result: Cash +$%.2f",
			currentMonth, adjustedAmount, adjustedAmount)
	}

	return nil
}

// PensionIncomeEventHandler handles pension income events
type PensionIncomeEventHandler struct{}

func (h *PensionIncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Check if COLA adjustment is enabled
	isColaAdjusted := getBoolFromMetadata(event.Metadata, "isColaAdjusted", false)
	adjustedAmount := event.Amount

	if isColaAdjusted && se.currentMonthReturns != nil {
		// Apply COLA adjustment based on inflation rate
		// IMPROVED: Use precise float division instead of integer division
		yearsSinceStart := float64(currentMonth) / 12.0
		if yearsSinceStart > 0 {
			adjustedAmount = event.Amount * math.Pow(1+se.currentMonthReturns.Inflation, yearsSinceStart)
		}
	}

	accounts.Cash += adjustedAmount
	*cashFlow += adjustedAmount
	// Track monthly flow
	se.currentMonthFlows.IncomeThisMonth += adjustedAmount
	se.currentMonthFlows.PensionIncomeThisMonth += adjustedAmount // Track separately for Trace View
	// Pension income is typically fully taxable
	se.ProcessIncome(adjustedAmount, false, 0)

	// Level 1 (EVENT): One-line event summary
	if isColaAdjusted {
		simLogEvent("INFO  [Month %d] Event: PENSION | Amount: $%.2f (COLA-adjusted from $%.2f) | Result: Cash +$%.2f (taxable)",
			currentMonth, adjustedAmount, event.Amount, adjustedAmount)
	} else {
		simLogEvent("INFO  [Month %d] Event: PENSION | Amount: $%.2f | Result: Cash +$%.2f (taxable)",
			currentMonth, adjustedAmount, adjustedAmount)
	}

	return nil
}

// DividendIncomeEventHandler handles dividend income events
type DividendIncomeEventHandler struct{}

func (h *DividendIncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	accounts.Cash += event.Amount
	*cashFlow += event.Amount
	// Track monthly flow for dividends
	se.currentMonthFlows.DividendsReceivedThisMonth.Qualified += event.Amount
	// Assume qualified dividends (could be enhanced to distinguish)
	se.ProcessIncome(event.Amount, true, 0)

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: DIVIDEND | Amount: $%.2f | Result: Cash +$%.2f (qualified dividend)",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// CapitalGainsRealizationEventHandler handles capital gains realization events
type CapitalGainsRealizationEventHandler struct{}

func (h *CapitalGainsRealizationEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process capital gains from asset sales
	accounts.Cash += event.Amount
	*cashFlow += event.Amount
	se.ProcessCapitalGains(event.Amount)

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: CAPITAL_GAINS | Amount: $%.2f | Result: Cash +$%.2f (taxable gains)",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// RSU handlers removed - overly complex feature not needed for core financial simulation


// Insurance Event Handlers

// LifeInsurancePremiumEventHandler handles life insurance premium payments
type LifeInsurancePremiumEventHandler struct{}

func (h *LifeInsurancePremiumEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Premium payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as expense
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "life_insurance_premium"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record life insurance premium in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: LIFE_INSURANCE_PREMIUM | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// LifeInsurancePayoutEventHandler handles life insurance benefit payouts
type LifeInsurancePayoutEventHandler struct{}

func (h *LifeInsurancePayoutEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Payout increases cash (typically tax-free for beneficiaries)
	accounts.Cash += event.Amount
	*cashFlow += event.Amount

	// Track as one-time income event
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	// Record in ledger as tax-free income
	if err := se.ledger.RecordIncome(event.Amount, "life_insurance_payout"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record life insurance payout in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: LIFE_INSURANCE_PAYOUT | Amount: $%.2f | Result: Cash +$%.2f (tax-free)",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// DisabilityInsurancePremiumEventHandler handles disability insurance premium payments
type DisabilityInsurancePremiumEventHandler struct{}

func (h *DisabilityInsurancePremiumEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Premium payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as expense
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "disability_insurance_premium"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record disability insurance premium in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: DISABILITY_INSURANCE_PREMIUM | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// DisabilityInsurancePayoutEventHandler handles disability insurance benefit payouts
type DisabilityInsurancePayoutEventHandler struct{}

func (h *DisabilityInsurancePayoutEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Payout increases cash (may be taxable depending on premium payment source)
	accounts.Cash += event.Amount
	*cashFlow += event.Amount

	// Track as income (conservative assumption - may be taxable)
	se.currentMonthFlows.IncomeThisMonth += event.Amount
	se.ProcessIncome(event.Amount, false, 0) // Assume no withholding

	// Record in ledger
	if err := se.ledger.RecordIncome(event.Amount, "disability_insurance_payout"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record disability insurance payout in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: DISABILITY_INSURANCE_PAYOUT | Amount: $%.2f | Result: Cash +$%.2f (taxable income)",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// LongTermCareInsurancePremiumEventHandler handles LTC insurance premium payments
type LongTermCareInsurancePremiumEventHandler struct{}

func (h *LongTermCareInsurancePremiumEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Premium payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as expense
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "ltc_insurance_premium"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record LTC insurance premium in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: LTC_INSURANCE_PREMIUM | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// LongTermCarePayoutEventHandler handles LTC insurance benefit payouts
type LongTermCarePayoutEventHandler struct{}

func (h *LongTermCarePayoutEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Payout increases cash (typically tax-free up to certain limits)
	accounts.Cash += event.Amount
	*cashFlow += event.Amount

	// Track as one-time income event
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	// Record in ledger as tax-free income
	if err := se.ledger.RecordIncome(event.Amount, "ltc_insurance_payout"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record LTC insurance payout in ledger: %v\n", err)
		}
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: LTC_INSURANCE_PAYOUT | Amount: $%.2f | Result: Cash +$%.2f (tax-free)",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// Education Event Handlers

// FiveTwoNineContributionEventHandler handles 529 plan contributions
type FiveTwoNineContributionEventHandler struct{}

func (h *FiveTwoNineContributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Validate sufficient cash for contribution
	if accounts.Cash < event.Amount {
		return fmt.Errorf("insufficient cash for 529 contribution: have $%.2f, need $%.2f", accounts.Cash, event.Amount)
	}

	// Initialize 529 account if it doesn't exist
	if accounts.FiveTwoNine == nil {
		accounts.FiveTwoNine = &Account{
			Holdings:   []Holding{},
			TotalValue: 0.0,
		}
	}

	// Transfer cash to 529 account
	accounts.Cash -= event.Amount
	accounts.FiveTwoNine.TotalValue += event.Amount
	*cashFlow -= event.Amount

	// Track contribution for monthly flows
	se.currentMonthFlows.ContributionsToInvestmentsThisMonth += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "529_contribution"); err != nil {
		if VERBOSE_DEBUG {
			fmt.Printf("Warning: Failed to record 529 contribution in ledger: %v\n", err)
		}
	}

	// Note: 529 contributions are made with after-tax dollars (no immediate tax benefit)
	// State tax deductions would be handled separately based on state-specific rules

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: 529_CONTRIBUTION | Amount: $%.2f | Result: Cash -$%.2f, 529 +$%.2f",
		context.CurrentMonth, event.Amount, event.Amount, event.Amount)

	return nil
}

// FiveTwoNineWithdrawalEventHandler handles 529 plan withdrawals
type FiveTwoNineWithdrawalEventHandler struct{}

func (h *FiveTwoNineWithdrawalEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Check if 529 account exists and has sufficient balance
	if accounts.FiveTwoNine == nil || accounts.FiveTwoNine.TotalValue < event.Amount {
		available := 0.0
		if accounts.FiveTwoNine != nil {
			available = accounts.FiveTwoNine.TotalValue
		}
		return fmt.Errorf("insufficient 529 balance for withdrawal: have $%.2f, need $%.2f", available, event.Amount)
	}

	// Use proper FIFO selling to transfer from 529 account to cash (tax-free for qualified education expenses)
	saleResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.FiveTwoNine, event.Amount, context.CurrentMonth)
	accounts.Cash += saleResult.TotalProceeds
	*cashFlow += event.Amount

	// Track as one-time income event
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	// Record in ledger as tax-free income (assuming qualified withdrawal)
	if err := se.ledger.RecordIncome(event.Amount, "529_withdrawal"); err != nil {
		simLogVerbose("Warning: Failed to record 529 withdrawal in ledger: %v", err)
	}

	// Note: For qualified education expenses, 529 withdrawals are tax-free
	// Non-qualified withdrawals would incur taxes + 10% penalty on earnings (not implemented here)

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: 529_WITHDRAWAL | Amount: $%.2f | Result: 529 -$%.2f, Cash +$%.2f (tax-free)",
		context.CurrentMonth, event.Amount, event.Amount, saleResult.TotalProceeds)

	return nil
}

// HSAContributionEventHandler handles HSA contributions (Triple Tax Advantage)
type HSAContributionEventHandler struct{}

func (h *HSAContributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Validate sufficient cash for contribution
	if accounts.Cash < event.Amount {
		return fmt.Errorf("insufficient cash for HSA contribution: have $%.2f, need $%.2f", accounts.Cash, event.Amount)
	}

	// Initialize HSA account if it doesn't exist
	if accounts.HSA == nil {
		accounts.HSA = &Account{
			Holdings:   []Holding{},
			TotalValue: 0.0,
		}
	}

	// Transfer cash to HSA account
	accounts.Cash -= event.Amount
	accounts.HSA.TotalValue += event.Amount
	*cashFlow -= event.Amount

	// Track contribution for monthly flows
	se.currentMonthFlows.ContributionsToInvestmentsThisMonth += event.Amount
	se.currentMonthFlows.ContributionsHSAThisMonth += event.Amount // Track separately for Trace View

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "hsa_contribution"); err != nil {
		simLogVerbose("Warning: Failed to record HSA contribution in ledger: %v", err)
	}

	// Note: HSA contributions are triple tax advantaged:
	// 1. Tax-deductible contributions (reduces current year taxable income)
	// 2. Tax-free investment growth
	// 3. Tax-free withdrawals for qualified medical expenses

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: HSA_CONTRIBUTION | Amount: $%.2f | Result: Cash -$%.2f, HSA +$%.2f (tax-deductible)",
		context.CurrentMonth, event.Amount, event.Amount, event.Amount)

	return nil
}

// HSAWithdrawalEventHandler handles HSA withdrawals (tax-free for qualified medical expenses)
type HSAWithdrawalEventHandler struct{}

func (h *HSAWithdrawalEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Check if HSA account exists and has sufficient balance
	if accounts.HSA == nil || accounts.HSA.TotalValue < event.Amount {
		available := 0.0
		if accounts.HSA != nil {
			available = accounts.HSA.TotalValue
		}
		return fmt.Errorf("insufficient HSA balance for withdrawal: have $%.2f, need $%.2f", available, event.Amount)
	}

	// Use proper FIFO selling to transfer from HSA account to cash (tax-free for qualified medical expenses)
	saleResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.HSA, event.Amount, context.CurrentMonth)
	accounts.Cash += saleResult.TotalProceeds
	*cashFlow += event.Amount

	// Track as one-time income event
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	// Record in ledger as tax-free income (assuming qualified medical withdrawal)
	if err := se.ledger.RecordIncome(event.Amount, "hsa_withdrawal"); err != nil {
		simLogVerbose("Warning: Failed to record HSA withdrawal in ledger: %v", err)
	}

	// Note: For qualified medical expenses, HSA withdrawals are tax-free at any age
	// After age 65, HSA can be used for non-medical expenses (taxed as ordinary income, no penalty)
	// Non-qualified withdrawals before age 65 incur taxes + 20% penalty (not implemented here)

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: HSA_WITHDRAWAL | Amount: $%.2f | Result: HSA -$%.2f, Cash +$%.2f (tax-free)",
		context.CurrentMonth, event.Amount, event.Amount, saleResult.TotalProceeds)

	return nil
}

// TuitionPaymentEventHandler handles tuition and education expense payments
type TuitionPaymentEventHandler struct{}

func (h *TuitionPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Tuition payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as expense
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "tuition_payment"); err != nil {
		simLogVerbose("Warning: Failed to record tuition payment in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: TUITION_PAYMENT | Amount: $%.2f | Result: Cash -$%.2f",
		context.CurrentMonth, event.Amount, event.Amount)

	return nil
}

// Business Event Handlers

// BusinessIncomeEventHandler handles self-employment and business income
type BusinessIncomeEventHandler struct{}

func (h *BusinessIncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Business income is typically received without withholding
	netIncome := event.Amount

	accounts.Cash += netIncome
	*cashFlow += netIncome

	// Track monthly flow
	se.currentMonthFlows.IncomeThisMonth += event.Amount

	// Business income is subject to self-employment tax and income tax
	// No withholding typically, so owner must make estimated payments
	se.ProcessIncome(event.Amount, false, 0) // No withholding

	// Record in ledger
	if err := se.ledger.RecordIncome(event.Amount, "business_income"); err != nil {
		simLogVerbose("Warning: Failed to record business income in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: BUSINESS_INCOME | Amount: $%.2f | Result: Cash +$%.2f (no withholding)",
		context.CurrentMonth, event.Amount, netIncome)

	return nil
}

// QuarterlyEstimatedTaxPaymentEventHandler handles quarterly estimated tax payments
type QuarterlyEstimatedTaxPaymentEventHandler struct{}

func (h *QuarterlyEstimatedTaxPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Tax payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as tax payment (similar to withholding)
	se.currentMonthFlows.TaxWithheldThisMonth += event.Amount

	// Add to YTD estimated payments for annual tax calculation
	se.estimatedPaymentsYTD += event.Amount

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, "quarterly_tax_payment"); err != nil {
		simLogVerbose("Warning: Failed to record quarterly tax payment in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: QUARTERLY_TAX_PAYMENT | Amount: $%.2f | Result: Cash -$%.2f, YTD Estimated: $%.2f",
		context.CurrentMonth, event.Amount, event.Amount, se.estimatedPaymentsYTD)

	return nil
}

// TaxPaymentEventHandler handles annual tax payment/refund settlement (scheduled for April)
type TaxPaymentEventHandler struct{}

func (h *TaxPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Simple calculation: pay the unpaid tax liability from December
	// Positive = we owe money (decrease cash), Negative = refund (increase cash)
	payment := se.unpaidTaxLiability

	if payment != 0 {
		accounts.Cash -= payment
		*cashFlow -= payment

		if payment > 0 {
			// Additional tax owed - track as expense
			se.currentMonthFlows.TaxWithheldThisMonth += payment
			if err := se.ledger.RecordExpense(payment, "final_tax_settlement"); err != nil {
				simLogVerbose("Warning: Failed to record final tax payment in ledger: %v", err)
			}
		} else {
			// Refund received - track as income
			refundAmount := -payment
			se.currentMonthFlows.IncomeThisMonth += refundAmount
			if err := se.ledger.RecordIncome(refundAmount, "tax_refund"); err != nil {
				simLogVerbose("Warning: Failed to record tax refund in ledger: %v", err)
			}
		}

		// Clear the liability now that it's been settled
		se.unpaidTaxLiability = 0
	}

	// Level 1 (EVENT): One-line event summary
	if payment > 0 {
		simLogEvent("INFO  [Month %d] Event: TAX_SETTLEMENT | Additional Tax: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, payment, payment)
	} else if payment < 0 {
		refundAmount := -payment
		simLogEvent("INFO  [Month %d] Event: TAX_SETTLEMENT | Refund: $%.2f | Result: Cash +$%.2f",
			context.CurrentMonth, refundAmount, refundAmount)
	} else {
		simLogEvent("INFO  [Month %d] Event: TAX_SETTLEMENT | No adjustment needed (exact withholding)",
			context.CurrentMonth)
	}

	return nil
}

// WithdrawalEventHandler handles general account withdrawals
type WithdrawalEventHandler struct{}

func (h *WithdrawalEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Enhanced withdrawal - supports asset class specific targeting

	// Determine source account from metadata
	sourceAccount := "taxable" // Default
	var targetAssetClass AssetClass // Optional asset class targeting
	hasTargetAssetClass := false

	if event.Metadata != nil {
		if sa, ok := event.Metadata["sourceAccountType"].(string); ok && sa != "" {
			sourceAccount = sa
		}

		// ENHANCEMENT: Support asset class specific withdrawals
		if ac, ok := event.Metadata["targetAssetClass"].(string); ok && ac != "" {
			targetAssetClass = AssetClass(ac)
			hasTargetAssetClass = true
		}
	}

	// Process withdrawal from the specified account
	switch sourceAccount {
	case "cash":
		// Direct cash withdrawal (no transfer needed)
		if accounts.Cash >= event.Amount {
			accounts.Cash -= event.Amount
			*cashFlow -= event.Amount
		} else {
			return fmt.Errorf("insufficient cash for withdrawal: need %.2f, have %.2f", event.Amount, accounts.Cash)
		}
	case "taxable":
		// Initialize taxable account if needed
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}

		se := context.SimulationEngine
		var saleResult LotSaleResult

		// ENHANCEMENT: Support asset class specific withdrawals
		if hasTargetAssetClass {
			simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Selling $%.2f of %s from taxable account", event.Amount, targetAssetClass)
			saleResult = se.cashManager.SellSpecificAssetClassFromAccount(accounts.Taxable, targetAssetClass, event.Amount, context.CurrentMonth)

			// If we couldn't get the full amount from the target asset class, fall back to general sale
			if saleResult.TotalProceeds < event.Amount {
				shortfall := event.Amount - saleResult.TotalProceeds
				fallbackResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.Taxable, shortfall, context.CurrentMonth)
				se.cashManager.mergeSaleResults(&saleResult, fallbackResult)
				simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Sold $%.2f from %s, $%.2f from other assets",
					event.Amount - shortfall, targetAssetClass, fallbackResult.TotalProceeds)
			}
		} else {
			// Standard FIFO sale across all asset classes
			saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.Taxable, event.Amount, context.CurrentMonth)
		}

		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient taxable investments for withdrawal: need %.2f, sold %.2f",
				event.Amount, saleResult.TotalProceeds)
		}

		// Add proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Track divestment proceeds
		se.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		// Process capital gains for tax tracking
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// No cashFlow change (internal transfer)
	case "tax_deferred":
		// Initialize tax_deferred account if needed
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}

		se := context.SimulationEngine
		var saleResult LotSaleResult

		// ENHANCEMENT: Support asset class specific withdrawals
		if hasTargetAssetClass {
			simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Selling $%.2f of %s from tax-deferred account", event.Amount, targetAssetClass)
			saleResult = se.cashManager.SellSpecificAssetClassFromAccount(accounts.TaxDeferred, targetAssetClass, event.Amount, context.CurrentMonth)

			// If we couldn't get the full amount from the target asset class, fall back to general sale
			if saleResult.TotalProceeds < event.Amount {
				shortfall := event.Amount - saleResult.TotalProceeds
				fallbackResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.TaxDeferred, shortfall, context.CurrentMonth)
				se.cashManager.mergeSaleResults(&saleResult, fallbackResult)
				simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Sold $%.2f from %s, $%.2f from other assets",
					event.Amount - shortfall, targetAssetClass, fallbackResult.TotalProceeds)
			}
		} else {
			// Standard FIFO sale across all asset classes
			saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.TaxDeferred, event.Amount, context.CurrentMonth)
		}

		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient tax deferred accounts for withdrawal: need %.2f, sold %.2f",
				event.Amount, saleResult.TotalProceeds)
		}

		// Add proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Track divestment proceeds
		se.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		// Tax-deferred withdrawals are taxed as ordinary income
		se.ProcessIncome(saleResult.TotalProceeds, false, 0) // Ordinary income, no withholding yet
	case "roth":
		// Initialize roth account if needed
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}

		se := context.SimulationEngine
		var saleResult LotSaleResult

		// ENHANCEMENT: Support asset class specific withdrawals
		if hasTargetAssetClass {
			simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Selling $%.2f of %s from Roth account", event.Amount, targetAssetClass)
			saleResult = se.cashManager.SellSpecificAssetClassFromAccount(accounts.Roth, targetAssetClass, event.Amount, context.CurrentMonth)

			// If we couldn't get the full amount from the target asset class, fall back to general sale
			if saleResult.TotalProceeds < event.Amount {
				shortfall := event.Amount - saleResult.TotalProceeds
				fallbackResult := se.cashManager.SellAssetsFromAccountFIFO(accounts.Roth, shortfall, context.CurrentMonth)
				se.cashManager.mergeSaleResults(&saleResult, fallbackResult)
				simLogVerbose("ASSET-SPECIFIC-WITHDRAWAL: Sold $%.2f from %s, $%.2f from other assets",
					event.Amount - shortfall, targetAssetClass, fallbackResult.TotalProceeds)
			}
		} else {
			// Standard FIFO sale across all asset classes
			saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.Roth, event.Amount, context.CurrentMonth)
		}

		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient Roth accounts for withdrawal: need %.2f, sold %.2f",
				event.Amount, saleResult.TotalProceeds)
		}

		// Add proceeds to cash (tax-free for qualified distributions)
		accounts.Cash += saleResult.TotalProceeds

		// Track divestment proceeds
		se.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		// Roth withdrawals are generally tax-free (assuming qualified)
	default:
		return fmt.Errorf("unsupported source account type for withdrawal: %s", sourceAccount)
	}

	// Level 1 (EVENT): One-line event summary
	if hasTargetAssetClass {
		simLogEvent("INFO  [Month %d] Event: WITHDRAWAL | Amount: $%.2f | Source: %s (%s) | Result: Cash +$%.2f",
			context.CurrentMonth, event.Amount, sourceAccount, targetAssetClass, event.Amount)
	} else {
		simLogEvent("INFO  [Month %d] Event: WITHDRAWAL | Amount: $%.2f | Source: %s | Result: Cash +$%.2f",
			context.CurrentMonth, event.Amount, sourceAccount, event.Amount)
	}

	return nil
}

// TransferEventHandler handles account-to-account transfers
type TransferEventHandler struct{}

func (h *TransferEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Simplified transfer - move funds between accounts

	// Get source and target accounts from metadata
	sourceAccount := ""
	targetAccount := ""

	if event.Metadata != nil {
		if sa, ok := event.Metadata["sourceAccountType"].(string); ok {
			sourceAccount = sa
		}
		if ta, ok := event.Metadata["targetAccountType"].(string); ok {
			targetAccount = ta
		}
	}

	if sourceAccount == "" || targetAccount == "" {
		return fmt.Errorf("transfer requires both sourceAccountType and targetAccountType in metadata")
	}

	// CRITICAL FIX: Implement proper sell/buy transactions for transfers
	se := context.SimulationEngine
	var proceedsFromSale float64
	var saleResult LotSaleResult

	// Step 1: Process withdrawal from source account
	switch sourceAccount {
	case "cash":
		if accounts.Cash >= event.Amount {
			accounts.Cash -= event.Amount
			proceedsFromSale = event.Amount
		} else {
			return fmt.Errorf("insufficient cash for transfer: need %.2f, have %.2f", event.Amount, accounts.Cash)
		}
	case "taxable":
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Sell assets using FIFO
		saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.Taxable, event.Amount, context.CurrentMonth)
		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient taxable investments for transfer: need %.2f, sold %.2f", event.Amount, saleResult.TotalProceeds)
		}
		proceedsFromSale = saleResult.TotalProceeds
		// Process capital gains
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

	case "tax_deferred":
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Sell assets using FIFO
		saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.TaxDeferred, event.Amount, context.CurrentMonth)
		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient tax deferred accounts for transfer: need %.2f, sold %.2f", event.Amount, saleResult.TotalProceeds)
		}
		proceedsFromSale = saleResult.TotalProceeds
		// Tax-deferred transfers trigger ordinary income tax
		if targetAccount != "roth" {
			se.ProcessIncome(saleResult.TotalProceeds, false, 0)
		}

	case "roth":
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Sell assets using FIFO
		saleResult = se.cashManager.SellAssetsFromAccountFIFO(accounts.Roth, event.Amount, context.CurrentMonth)
		if saleResult.TotalProceeds < event.Amount {
			return fmt.Errorf("insufficient Roth accounts for transfer: need %.2f, sold %.2f", event.Amount, saleResult.TotalProceeds)
		}
		proceedsFromSale = saleResult.TotalProceeds
		// Roth transfers are generally tax-free

	default:
		return fmt.Errorf("unsupported source account type for transfer: %s", sourceAccount)
	}

	// Step 2: Process deposit to target account
	switch targetAccount {
	case "cash":
		accounts.Cash += proceedsFromSale
	case "taxable":
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Buy assets with proceeds - default to balanced allocation
		defaultAssetClass := AssetClassUSStocksTotalMarket
		if assetClass, ok := event.Metadata["targetAssetClass"].(string); ok {
			defaultAssetClass = NormalizeAssetClass(AssetClass(assetClass))
		}
		err := se.cashManager.AddHoldingWithLotTracking(accounts.Taxable, defaultAssetClass, proceedsFromSale, context.CurrentMonth)
		if err != nil {
			return fmt.Errorf("failed to add holding in taxable account: %v", err)
		}

	case "tax_deferred":
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Buy assets with proceeds
		defaultAssetClass := AssetClassUSStocksTotalMarket
		if assetClass, ok := event.Metadata["targetAssetClass"].(string); ok {
			defaultAssetClass = NormalizeAssetClass(AssetClass(assetClass))
		}
		err := se.cashManager.AddHoldingWithLotTracking(accounts.TaxDeferred, defaultAssetClass, proceedsFromSale, context.CurrentMonth)
		if err != nil {
			return fmt.Errorf("failed to add holding in tax deferred account: %v", err)
		}

	case "roth":
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		// Buy assets with proceeds
		defaultAssetClass := AssetClassUSStocksTotalMarket
		if assetClass, ok := event.Metadata["targetAssetClass"].(string); ok {
			defaultAssetClass = NormalizeAssetClass(AssetClass(assetClass))
		}
		err := se.cashManager.AddHoldingWithLotTracking(accounts.Roth, defaultAssetClass, proceedsFromSale, context.CurrentMonth)
		if err != nil {
			return fmt.Errorf("failed to add holding in Roth account: %v", err)
		}

	default:
		return fmt.Errorf("unsupported target account type for transfer: %s", targetAccount)
	}

	// Transfers typically don't affect net cash flow (just move money between accounts)
	// No cashFlow change for internal transfers

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: TRANSFER | Amount: $%.2f | Route: %s → %s | Result: Internal transfer",
		context.CurrentMonth, event.Amount, sourceAccount, targetAccount)

	return nil
}

// HealthInsurancePremiumEventHandler handles health insurance premium payments
type HealthInsurancePremiumEventHandler struct{}

func (h *HealthInsurancePremiumEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Simple health insurance premium - deduct from cash like other insurance premiums
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: HEALTH_INSURANCE_PREMIUM | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for health insurance premium: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// PropertyInsuranceEventHandler handles property insurance premium payments
type PropertyInsuranceEventHandler struct{}

func (h *PropertyInsuranceEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Simple property insurance premium - deduct from cash
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: PROPERTY_INSURANCE | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for property insurance premium: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// CarPurchaseEventHandler handles car purchase expenses
type CarPurchaseEventHandler struct{}

func (h *CarPurchaseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Simple car purchase - deduct from cash (could be enhanced to handle financing)
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: CAR_PURCHASE | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for car purchase: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// HomeRenovationEventHandler handles home renovation expenses
type HomeRenovationEventHandler struct{}

func (h *HomeRenovationEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Simple home renovation - deduct from cash
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: HOME_RENOVATION | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for home renovation: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// EmergencyExpenseEventHandler handles emergency expenses
type EmergencyExpenseEventHandler struct{}

func (h *EmergencyExpenseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Emergency expense - deduct from cash (could be enhanced to pull from emergency fund account)
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: EMERGENCY_EXPENSE | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for emergency expense: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// VacationExpenseEventHandler handles vacation expenses
type VacationExpenseEventHandler struct{}

func (h *VacationExpenseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Vacation expense - deduct from cash
	if accounts.Cash >= event.Amount {
		accounts.Cash -= event.Amount
		*cashFlow -= event.Amount

		// Level 1 (EVENT): One-line event summary
		simLogEvent("INFO  [Month %d] Event: VACATION_EXPENSE | Amount: $%.2f | Result: Cash -$%.2f",
			context.CurrentMonth, event.Amount, event.Amount)

		return nil
	}
	return fmt.Errorf("insufficient cash for vacation expense: need %.2f, have %.2f", event.Amount, accounts.Cash)
}

// min is a helper function for minimum of two float64 values
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
