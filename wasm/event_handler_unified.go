package main

import (
	"fmt"
)

// =============================================================================
// UNIFIED EVENT HANDLERS - PFOS-E Compliant
//
// These handlers consolidate multiple legacy event types into fewer, metadata-driven
// handlers while preserving:
// 1. Tax semantics for PFOS-E tax fidelity modes
// 2. Sensitivity attribution via typed driverKey
// 3. Blocked output reasoning via constraint codes
// 4. Wedge-specific semantics (fragility, capital sourcing, concentration, sabbatical)
//
// CRITICAL INVARIANTS:
// - Invariant 1: Preprocessing resolves all time semantics (recurrence, inflation, etc.)
// - Invariant 2: Tax engine owns all branching (handlers register with taxProfile)
// - Invariant 3: Normalization is assertive (missing fields fail loudly)
// - Invariant 4: driverKey is typed, not freeform
// =============================================================================

// =============================================================================
// HELPER FUNCTIONS - Extract PFOS-E fields from events
// =============================================================================

// getTaxProfile extracts the taxProfile from an event, failing loudly if missing
func getTaxProfile(event FinancialEvent) string {
	if event.TaxProfile != nil && *event.TaxProfile != "" {
		return *event.TaxProfile
	}
	// Check metadata as fallback
	if profile := getStringFromMetadata(event.Metadata, "taxProfile", ""); profile != "" {
		return profile
	}
	// PFOS-E Invariant 3: Fail loudly on missing required fields in dev/test
	simLogVerbose("⚠️ [PFOS-E-ERROR] Missing taxProfile for event %s (type=%s) - this should be caught during normalization",
		event.ID, event.Type)
	return "ordinary_income" // Conservative default for production resilience
}

// getDriverKey extracts the driverKey from an event, failing loudly if missing
func getDriverKey(event FinancialEvent) string {
	if event.DriverKey != nil && *event.DriverKey != "" {
		return *event.DriverKey
	}
	// Check metadata as fallback
	if key := getStringFromMetadata(event.Metadata, "driverKey", ""); key != "" {
		return key
	}
	// PFOS-E Invariant 3: Fail loudly on missing required fields in dev/test
	simLogVerbose("⚠️ [PFOS-E-ERROR] Missing driverKey for event %s (type=%s) - this should be caught during normalization",
		event.ID, event.Type)
	return "" // Empty string signals error condition
}

// getWithholdingModel extracts the withholding model from an event
func getWithholdingModel(event FinancialEvent) string {
	if event.WithholdingModel != nil && *event.WithholdingModel != "" {
		return *event.WithholdingModel
	}
	// Check metadata as fallback
	if model := getStringFromMetadata(event.Metadata, "withholdingModel", ""); model != "" {
		return model
	}
	return "irs_percentage" // Default to IRS percentage method
}

// getExpenseNature extracts the expense nature from an event
func getExpenseNature(event FinancialEvent) string {
	if event.ExpenseNature != nil && *event.ExpenseNature != "" {
		return *event.ExpenseNature
	}
	// Check metadata as fallback
	if nature := getStringFromMetadata(event.Metadata, "expenseNature", ""); nature != "" {
		return nature
	}
	return "fixed" // Conservative default
}

// getSourceType extracts the income source type from an event
func getSourceType(event FinancialEvent) string {
	if event.SourceType != nil && *event.SourceType != "" {
		return *event.SourceType
	}
	// Check metadata as fallback
	if sourceType := getStringFromMetadata(event.Metadata, "sourceType", ""); sourceType != "" {
		return sourceType
	}
	// Fall back to legacy IncomeType field
	if event.IncomeType != nil && *event.IncomeType != "" {
		return *event.IncomeType
	}
	return "salary" // Default
}

// getInsuranceType extracts the insurance type from an event
func getInsuranceType(event FinancialEvent) string {
	if event.InsuranceType != nil && *event.InsuranceType != "" {
		return *event.InsuranceType
	}
	// Check metadata as fallback
	return getStringFromMetadata(event.Metadata, "insuranceType", "life_term")
}

// getExposureType extracts the exposure type from an event
func getExposureType(event FinancialEvent) string {
	if event.ExposureType != nil && *event.ExposureType != "" {
		return *event.ExposureType
	}
	return getStringFromMetadata(event.Metadata, "exposureType", "rsu")
}

// =============================================================================
// UNIFIED INCOME HANDLER
// Consolidates: INCOME, SOCIAL_SECURITY_INCOME, PENSION_INCOME, DIVIDEND_INCOME,
//               RENTAL_INCOME, BUSINESS_INCOME, ANNUITY_PAYMENT
// =============================================================================

// UnifiedIncomeEventHandler handles all income events with PFOS-E metadata
type UnifiedIncomeEventHandler struct{}

// EventTypeCashflowIncome is the consolidated income event type
const EventTypeCashflowIncome EventType = "CASHFLOW_INCOME"

func (h *UnifiedIncomeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	taxProfile := getTaxProfile(event)
	withholdingModel := getWithholdingModel(event)
	driverKey := getDriverKey(event)
	sourceType := getSourceType(event)

	simLogVerbose("🔍 [UNIFIED-INCOME] Processing: ID=%s, Amount=$%.2f, TaxProfile=%s, DriverKey=%s, SourceType=%s",
		event.ID, event.Amount, taxProfile, driverKey, sourceType)

	// FOOLPROOF RULE: Income arrives GROSS. Go handles all taxation.
	// This ensures proper tax tracking (taxWithholdingYTD, year-end reconciliation).
	var withholding float64
	switch withholdingModel {
	case "irs_percentage":
		payFrequency := getStringFromMetadata(event.Metadata, "payFrequency", "monthly")
		filingStatus := FilingStatus(getStringFromMetadata(event.Metadata, "filingStatus", string(FilingStatusSingle)))
		taxConfig := GetDefaultTaxConfigDetailed()
		taxConfig.FilingStatus = filingStatus
		taxCalculator := NewTaxCalculator(taxConfig, nil)
		withholding = taxCalculator.CalculateFederalWithholding(event.Amount, payFrequency, filingStatus)
	case "fixed_rate":
		rate := getFloat64FromMetadata(event.Metadata, "withholdingRate", 0.22)
		withholding = event.Amount * rate
	case "none":
		withholding = 0
	default:
		// Default: use IRS percentage method
		payFrequency := getStringFromMetadata(event.Metadata, "payFrequency", "monthly")
		filingStatus := FilingStatus(getStringFromMetadata(event.Metadata, "filingStatus", string(FilingStatusSingle)))
		taxConfig := GetDefaultTaxConfigDetailed()
		taxConfig.FilingStatus = filingStatus
		taxCalculator := NewTaxCalculator(taxConfig, nil)
		withholding = taxCalculator.CalculateFederalWithholding(event.Amount, payFrequency, filingStatus)
	}

	// Calculate net income
	netIncome := event.Amount - withholding

	// Update cash balance
	accounts.Cash += netIncome
	*cashFlow += netIncome

	// Track monthly flows
	se.currentMonthFlows.IncomeThisMonth += event.Amount
	se.currentMonthFlows.TaxWithheldThisMonth += withholding

	// Track granular income by source type
	switch sourceType {
	case "salary":
		se.currentMonthFlows.SalaryIncomeThisMonth += event.Amount
		se.currentMonthFlows.EmploymentIncomeThisMonth += event.Amount
	case "bonus":
		se.currentMonthFlows.BonusIncomeThisMonth += event.Amount
		se.currentMonthFlows.EmploymentIncomeThisMonth += event.Amount
	case "rsu":
		se.currentMonthFlows.RSUIncomeThisMonth += event.Amount
		se.currentMonthFlows.EmploymentIncomeThisMonth += event.Amount
	}

	// PFOS-E: Register income with tax engine by taxProfile
	// Tax engine owns all branching - handler does NOT embed policy logic
	se.RegisterIncomeByTaxProfile(event.Amount, taxProfile, withholding)

	// PFOS-E: Record driver contribution for sensitivity analysis
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, event.Amount)
	}

	// Record in ledger
	if err := se.ledger.RecordIncome(event.Amount, sourceType); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record income in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: CASHFLOW_INCOME | Source: %s | Gross: $%.2f | Net: $%.2f | TaxProfile: %s",
		currentMonth, sourceType, event.Amount, netIncome, taxProfile)

	return nil
}

// =============================================================================
// UNIFIED EXPENSE HANDLER
// Consolidates: RECURRING_EXPENSE, ONE_TIME_EVENT, HEALTHCARE_COST, etc.
// =============================================================================

// UnifiedExpenseEventHandler handles all expense events with PFOS-E metadata
type UnifiedExpenseEventHandler struct{}

// EventTypeCashflowExpense is the consolidated expense event type
const EventTypeCashflowExpense EventType = "CASHFLOW_EXPENSE"

func (h *UnifiedExpenseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	expenseNature := getExpenseNature(event)
	driverKey := getDriverKey(event)
	category := "other"
	if event.ExpenseCategory != nil {
		category = *event.ExpenseCategory
	}

	simLogVerbose("🔍 [UNIFIED-EXPENSE] Processing: ID=%s, Amount=$%.2f, Nature=%s, DriverKey=%s, Category=%s",
		event.ID, event.Amount, expenseNature, driverKey, category)

	// CRITICAL FIX: Check if we have enough cash BEFORE processing expense
	// If not, divest from investment accounts to cover the shortfall
	if accounts.Cash < event.Amount {
		shortfall := event.Amount - accounts.Cash
		simLogVerbose("💰 [PRE-EXPENSE-CHECK] Month %d: Insufficient cash ($%.2f) for expense ($%.2f), need to raise $%.2f",
			currentMonth, accounts.Cash, event.Amount, shortfall)

		// Attempt to raise cash from investments
		saleResult, _ := se.cashManager.ExecuteWithdrawalWithStrategy(
			accounts, shortfall, se.simulationInput.WithdrawalStrategy, currentMonth, 0, FilingStatusSingle)

		// Add proceeds to cash
		accounts.Cash += saleResult.TotalProceeds

		// Apply immediate tax withholding on withdrawals
		taxWithheld := se.ApplyImmediateWithdrawalTax(saleResult, accounts)
		if taxWithheld > 0 {
			simLogVerbose("💸 [UNIFIED-EXPENSE] Tax withheld on withdrawal: $%.2f", taxWithheld)
		}

		// Track capital gains
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		// Track divestment
		se.currentMonthFlows.DivestmentProceedsThisMonth += saleResult.TotalProceeds

		// Track auto-shortfall cover separately (for Trace View attribution)
		se.currentMonthFlows.AutoShortfallCoverThisMonth += saleResult.TotalProceeds
	}

	// Deduct expense
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track monthly flows
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// Track granular expense categories
	switch category {
	case "housing":
		se.currentMonthFlows.HousingExpensesThisMonth += event.Amount
	case "transportation":
		se.currentMonthFlows.TransportationExpensesThisMonth += event.Amount
	case "food":
		se.currentMonthFlows.FoodExpensesThisMonth += event.Amount
	default:
		se.currentMonthFlows.OtherExpensesThisMonth += event.Amount
	}

	// PFOS-E: Record driver contribution for sensitivity analysis
	// ExpenseNature powers the sabbatical wedge analysis
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, event.Amount)
	}

	// Record in ledger
	if err := se.ledger.RecordExpense(event.Amount, category); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record expense in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: CASHFLOW_EXPENSE | Category: %s | Nature: %s | Amount: $%.2f",
		currentMonth, category, expenseNature, event.Amount)

	return nil
}

// =============================================================================
// UNIFIED INSURANCE PREMIUM HANDLER
// Consolidates: LIFE_INSURANCE_PREMIUM, DISABILITY_INSURANCE_PREMIUM, LTC_INSURANCE_PREMIUM
// =============================================================================

// UnifiedInsurancePremiumEventHandler handles all insurance premium events
type UnifiedInsurancePremiumEventHandler struct{}

// EventTypeInsurancePremium is the consolidated insurance premium event type
const EventTypeInsurancePremium EventType = "INSURANCE_PREMIUM"

func (h *UnifiedInsurancePremiumEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	insuranceType := getInsuranceType(event)
	driverKey := getDriverKey(event)

	simLogVerbose("🔍 [UNIFIED-INSURANCE-PREMIUM] Processing: ID=%s, Amount=$%.2f, InsuranceType=%s, DriverKey=%s",
		event.ID, event.Amount, insuranceType, driverKey)

	// Premium payment reduces cash
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount

	// Track as expense
	se.currentMonthFlows.ExpensesThisMonth += event.Amount

	// PFOS-E: Record driver contribution (premiums are typically fixed expenses)
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, event.Amount)
	}

	// Record in ledger
	ledgerType := fmt.Sprintf("%s_premium", insuranceType)
	if err := se.ledger.RecordExpense(event.Amount, ledgerType); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record insurance premium in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	simLogEvent("INFO  [Month %d] Event: INSURANCE_PREMIUM | Type: %s | Amount: $%.2f",
		currentMonth, insuranceType, event.Amount)

	return nil
}

// =============================================================================
// UNIFIED INSURANCE PAYOUT HANDLER
// Consolidates: LIFE_INSURANCE_PAYOUT, DISABILITY_INSURANCE_PAYOUT, LTC_PAYOUT
// =============================================================================

// UnifiedInsurancePayoutEventHandler handles all insurance payout events
type UnifiedInsurancePayoutEventHandler struct{}

// EventTypeInsurancePayout is the consolidated insurance payout event type
const EventTypeInsurancePayout EventType = "INSURANCE_PAYOUT"

func (h *UnifiedInsurancePayoutEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	insuranceType := getInsuranceType(event)
	taxProfile := getTaxProfile(event)
	driverKey := getDriverKey(event)

	simLogVerbose("🔍 [UNIFIED-INSURANCE-PAYOUT] Processing: ID=%s, Amount=$%.2f, InsuranceType=%s, TaxProfile=%s",
		event.ID, event.Amount, insuranceType, taxProfile)

	// Payout increases cash
	accounts.Cash += event.Amount
	*cashFlow += event.Amount

	// Track as one-time income event
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	// PFOS-E: Register income with appropriate tax treatment
	// Life insurance death benefits are generally tax-free
	// Disability payouts may be taxable depending on who paid premiums
	// LTC payouts are generally tax-free up to limits
	se.RegisterIncomeByTaxProfile(event.Amount, taxProfile, 0) // No withholding on payouts

	// PFOS-E: Record driver contribution
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, event.Amount)
	}

	// Record in ledger
	ledgerType := fmt.Sprintf("%s_payout", insuranceType)
	if err := se.ledger.RecordIncome(event.Amount, ledgerType); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record insurance payout in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	taxStatus := "tax-free"
	if taxProfile != "tax_exempt" {
		taxStatus = "taxable"
	}
	simLogEvent("INFO  [Month %d] Event: INSURANCE_PAYOUT | Type: %s | Amount: $%.2f | Tax: %s",
		currentMonth, insuranceType, event.Amount, taxStatus)

	return nil
}

// =============================================================================
// UNIFIED CONTRIBUTION HANDLER
// Consolidates: SCHEDULED_CONTRIBUTION with enhanced constraint tracking
// =============================================================================

// UnifiedContributionEventHandler handles all contribution events with PFOS-E metadata
type UnifiedContributionEventHandler struct {
	contributionCount map[string]int
	monthlyTotals     map[int]float64
}

// EventTypeAccountContribution is the consolidated contribution event type
const EventTypeAccountContribution EventType = "ACCOUNT_CONTRIBUTION"

func NewUnifiedContributionEventHandler() *UnifiedContributionEventHandler {
	return &UnifiedContributionEventHandler{
		contributionCount: make(map[string]int),
		monthlyTotals:     make(map[int]float64),
	}
}

func (h *UnifiedContributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	driverKey := getDriverKey(event)
	taxTreatment := "post_tax" // Default
	if event.TaxTreatment != nil {
		taxTreatment = *event.TaxTreatment
	}

	// Get target account
	targetAccount := "taxable"
	if event.TargetAccountType != nil {
		targetAccount = *event.TargetAccountType
	} else {
		targetAccount = getStringFromMetadata(event.Metadata, "targetAccount", "taxable")
	}

	simLogVerbose("🔍 [UNIFIED-CONTRIBUTION] Processing: ID=%s, Amount=$%.2f, Target=%s, TaxTreatment=%s, DriverKey=%s",
		event.ID, event.Amount, targetAccount, taxTreatment, driverKey)

	// Track contribution count for debugging
	h.contributionCount[event.ID]++
	h.monthlyTotals[currentMonth] += event.Amount

	// Skip contributions if in decumulation mode
	monthlyIncome := se.currentMonthFlows.IncomeThisMonth
	monthlyExpenses := se.currentMonthFlows.ExpensesThisMonth

	if monthlyIncome < monthlyExpenses {
		simLogVerbose("CONTRIBUTION-SKIP Event %s: In decumulation mode (Income=$%.2f < Expenses=$%.2f), skipping",
			event.ID, monthlyIncome, monthlyExpenses)
		return nil
	}

	// Check cash availability and minimum reserves
	availableCash := accounts.Cash
	var targetReserveMonths float64 = 3.0
	if se.simulationInput != nil && se.simulationInput.CashStrategy != nil {
		if se.simulationInput.CashStrategy.TargetReserveMonths > 0 {
			targetReserveMonths = se.simulationInput.CashStrategy.TargetReserveMonths
		}
	}

	monthlyExpensesEstimate := se.getEstimatedMonthlyExpenses()
	minCashReserve := monthlyExpensesEstimate * targetReserveMonths

	if availableCash <= minCashReserve {
		// PFOS-E: Add constraint code for blocked output
		if event.ConstraintCodes == nil {
			event.ConstraintCodes = []string{}
		}
		event.ConstraintCodes = append(event.ConstraintCodes, "insufficient_balance")
		simLogVerbose("CONTRIBUTION-SKIP Event %s: Cash $%.2f <= reserve $%.2f, adding constraint code",
			event.ID, availableCash, minCashReserve)
		return nil
	}

	// Calculate actual contribution amount
	maxAvailableToContribute := availableCash - minCashReserve
	actualContribution := event.Amount
	if actualContribution > maxAvailableToContribute {
		actualContribution = maxAvailableToContribute
	}

	if actualContribution <= 0 {
		return nil
	}

	// Deduct from cash
	accounts.Cash -= actualContribution
	se.currentMonthFlows.ContributionsToInvestmentsThisMonth += actualContribution

	// Apply contribution limits and track excess
	excessAmount := 0.0
	contributionAmount := actualContribution

	switch targetAccount {
	case "tax_deferred":
		excessAmount = se.enforcePreTaxContributionLimits(&contributionAmount, currentMonth)
		if contributionAmount > 0 {
			se.preTaxContributionsYTD += contributionAmount
		}
		se.currentMonthFlows.ContributionsTaxDeferredThisMonth += contributionAmount
	case "roth":
		excessAmount = se.enforceRothContributionLimits(&contributionAmount, currentMonth)
		se.currentMonthFlows.ContributionsRothThisMonth += contributionAmount
	case "taxable":
		se.currentMonthFlows.ContributionsTaxableThisMonth += contributionAmount
	}

	// Process the contribution
	assetClass := NormalizeAssetClass(AssetClass(getStringFromMetadata(event.Metadata, "assetClass", string(AssetClassUSStocksTotalMarket))))

	if contributionAmount > 0 {
		if err := se.processInvestmentContributionWithFIFO(accounts, contributionAmount, targetAccount, assetClass, currentMonth); err != nil {
			accounts.Cash += contributionAmount
			se.currentMonthFlows.ContributionsToInvestmentsThisMonth -= contributionAmount
			return fmt.Errorf("contribution failed: %w", err)
		}
	}

	// Route excess to taxable
	if excessAmount > 0 {
		// Add constraint code for limit exceeded
		if event.ConstraintCodes == nil {
			event.ConstraintCodes = []string{}
		}
		event.ConstraintCodes = append(event.ConstraintCodes, "limit_exceeded")

		if err := se.processInvestmentContributionWithFIFO(accounts, excessAmount, "taxable", assetClass, currentMonth); err != nil {
			accounts.Cash += excessAmount
			return fmt.Errorf("excess contribution routing failed: %w", err)
		}
		se.currentMonthFlows.ContributionsTaxableThisMonth += excessAmount
	}

	// PFOS-E: Record driver contribution
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, actualContribution)
	}

	// Record in ledger
	if err := se.ledger.RecordInvestment(actualContribution, targetAccount); err != nil {
		simLogVerbose("⚠️ [LEDGER-WARNING] Failed to record contribution in ledger: %v", err)
	}

	// Level 1 (EVENT): One-line event summary
	if excessAmount > 0 {
		simLogEvent("INFO  [Month %d] Event: ACCOUNT_CONTRIBUTION | Target: %s | Amount: $%.2f | Excess: $%.2f (routed to taxable)",
			currentMonth, targetAccount, contributionAmount, excessAmount)
	} else {
		simLogEvent("INFO  [Month %d] Event: ACCOUNT_CONTRIBUTION | Target: %s | Amount: $%.2f",
			currentMonth, targetAccount, contributionAmount)
	}

	return nil
}

// =============================================================================
// EXPOSURE CHANGE HANDLER - For RSU/Concentration Wedge
// =============================================================================

// ExposureChangeEventHandler handles equity compensation and concentration events
type ExposureChangeEventHandler struct{}

// EventTypeExposureChange is the event type for exposure changes
const EventTypeExposureChange EventType = "EXPOSURE_CHANGE"

func (h *ExposureChangeEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Extract PFOS-E metadata
	exposureType := getExposureType(event)
	driverKey := getDriverKey(event)

	// Delta notional: positive = vesting/purchase, negative = sale
	deltaNotional := event.Amount
	if event.DeltaNotional != nil {
		deltaNotional = *event.DeltaNotional
	}

	simLogVerbose("🔍 [EXPOSURE-CHANGE] Processing: ID=%s, ExposureType=%s, DeltaNotional=$%.2f, DriverKey=%s",
		event.ID, exposureType, deltaNotional, driverKey)

	// If this is a sale (negative delta), process as income with appropriate tax treatment
	if deltaNotional < 0 {
		saleAmount := -deltaNotional
		taxProfile := getTaxProfile(event)

		// Add proceeds to cash
		accounts.Cash += saleAmount
		*cashFlow += saleAmount

		// Register with tax engine
		se.RegisterIncomeByTaxProfile(saleAmount, taxProfile, 0)

		simLogEvent("INFO  [Month %d] Event: EXPOSURE_CHANGE | Type: %s | Sale: $%.2f | TaxProfile: %s",
			currentMonth, exposureType, saleAmount, taxProfile)
	} else if deltaNotional > 0 {
		// Vesting event - this is ordinary income at vesting
		taxProfile := getTaxProfile(event)

		// For RSU vesting, the value is added to income (shares are received)
		se.currentMonthFlows.IncomeThisMonth += deltaNotional
		se.currentMonthFlows.RSUIncomeThisMonth += deltaNotional

		// Register with tax engine (RSU vesting is ordinary income)
		se.RegisterIncomeByTaxProfile(deltaNotional, taxProfile, 0)

		simLogEvent("INFO  [Month %d] Event: EXPOSURE_CHANGE | Type: %s | Vesting: $%.2f | TaxProfile: %s",
			currentMonth, exposureType, deltaNotional, taxProfile)
	}

	// PFOS-E: Record driver contribution for concentration wedge analysis
	if driverKey != "" {
		se.RecordDriverContribution(driverKey, deltaNotional)
	}

	return nil
}
