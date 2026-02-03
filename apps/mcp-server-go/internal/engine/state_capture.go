// State capture functions for comprehensive deterministic simulation state
// These functions extract all internal simulation state for enhanced spreadsheet view

package engine

import "fmt"

// CaptureComprehensiveMonthState captures all simulation state at end of a month
func (se *SimulationEngine) CaptureComprehensiveMonthState(
	accounts AccountHoldingsMonthEnd,
	monthOffset int,
	calendarYear int,
	calendarMonth int,
	age float64,
	eventIDs []string,
) DeterministicMonthState {
	// Calculate totals
	totalAssets := accounts.Cash
	totalLiabilities := 0.0

	// Add account values
	if accounts.Taxable != nil {
		totalAssets += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		totalAssets += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		totalAssets += accounts.Roth.TotalValue
	}
	if accounts.HSA != nil {
		totalAssets += accounts.HSA.TotalValue
	}
	if accounts.FiveTwoNine != nil {
		totalAssets += accounts.FiveTwoNine.TotalValue
	}

	// Sum up liabilities
	for _, liability := range se.liabilities {
		if liability != nil {
			totalLiabilities += liability.CurrentPrincipalBalance
		}
	}

	netWorth := totalAssets - totalLiabilities

	// Capture market returns
	var marketReturns StochasticReturns
	if se.currentMonthReturns != nil {
		marketReturns = *se.currentMonthReturns
	}

	return DeterministicMonthState{
		MonthOffset:   monthOffset,
		CalendarYear:  calendarYear,
		CalendarMonth: calendarMonth,
		Age:           age,

		// Accounts with full lot detail
		Cash:        accounts.Cash,
		Taxable:     captureAccountState(accounts.Taxable),
		TaxDeferred: captureAccountState(accounts.TaxDeferred),
		Roth:        captureAccountState(accounts.Roth),
		HSA:         captureAccountState(accounts.HSA),
		FiveTwoNine: captureAccountState(accounts.FiveTwoNine),

		// Aggregates
		NetWorth:         netWorth,
		TotalAssets:      totalAssets,
		TotalLiabilities: totalLiabilities,

		// State snapshots
		TaxState:           se.captureTaxState(),
		Liabilities:        se.captureLiabilityState(calendarYear, calendarMonth),
		StrategyExecutions: se.captureStrategyExecutions(),

		// Monthly flows
		Flows: se.captureMonthlyFlows(),

		// Market state
		MarketReturns: marketReturns,

		// Events processed
		EventIDs: eventIDs,
	}
}

// captureAccountState creates a ComprehensiveAccountState with full lot detail
func captureAccountState(account *Account) *ComprehensiveAccountState {
	if account == nil {
		return nil
	}

	state := &ComprehensiveAccountState{
		TotalValue:     account.TotalValue,
		TotalCostBasis: 0,
		UnrealizedGain: 0,
		LongTermGain:   0,
		ShortTermGain:  0,
		Holdings:       make([]ComprehensiveHoldingDetail, 0, len(account.Holdings)),
	}

	for _, holding := range account.Holdings {
		holdingDetail := ComprehensiveHoldingDetail{
			HoldingID:      holding.ID,
			AssetClass:     string(holding.AssetClass),
			TotalQuantity:  holding.Quantity,
			TotalValue:     holding.Quantity * holding.CurrentMarketPricePerUnit,
			TotalCostBasis: holding.CostBasisTotal,
			UnrealizedGain: holding.UnrealizedGainLossTotal,
			Lots:           make([]ComprehensiveTaxLotDetail, 0, len(holding.Lots)),
		}

		// Calculate weighted average cost basis
		if holding.Quantity > 0 {
			holdingDetail.WeightedAvgCostBasis = holding.CostBasisTotal / holding.Quantity
		}

		// Capture individual tax lots
		for _, lot := range holding.Lots {
			lotDetail := ComprehensiveTaxLotDetail{
				LotID:            lot.ID,
				AssetClass:       string(lot.AssetClass),
				Quantity:         lot.Quantity,
				CostBasisPerUnit: lot.CostBasisPerUnit,
				CostBasisTotal:   lot.CostBasisTotal,
				CurrentValue:     lot.Quantity * holding.CurrentMarketPricePerUnit,
				UnrealizedGain:   (lot.Quantity * holding.CurrentMarketPricePerUnit) - lot.CostBasisTotal,
				AcquisitionMonth: lot.AcquisitionDate,
				IsLongTerm:       lot.IsLongTerm,
			}
			holdingDetail.Lots = append(holdingDetail.Lots, lotDetail)

			// Aggregate long-term vs short-term gains
			if lot.IsLongTerm {
				state.LongTermGain += lotDetail.UnrealizedGain
			} else {
				state.ShortTermGain += lotDetail.UnrealizedGain
			}
		}

		state.Holdings = append(state.Holdings, holdingDetail)
		state.TotalCostBasis += holding.CostBasisTotal
		state.UnrealizedGain += holding.UnrealizedGainLossTotal
	}

	return state
}

// captureTaxState captures all YTD tax tracking from SimulationEngine
func (se *SimulationEngine) captureTaxState() ComprehensiveTaxState {
	return ComprehensiveTaxState{
		// YTD Income tracking
		OrdinaryIncomeYTD:         se.ordinaryIncomeYTD,
		QualifiedDividendsYTD:     se.qualifiedDividendsYTD,
		OrdinaryDividendsYTD:      se.ordinaryDividendsYTD,
		InterestIncomeYTD:         se.interestIncomeYTD,
		SocialSecurityBenefitsYTD: se.socialSecurityBenefitsYTD,

		// YTD Capital gains
		ShortTermCapGainsYTD: se.shortTermCapitalGainsYTD,
		LongTermCapGainsYTD:  se.longTermCapitalGainsYTD,
		CapitalLossesYTD:     se.capitalLossesYTD,
		CapitalLossCarryover: se.getCapitalLossCarryover(),

		// YTD Deductions
		ItemizedDeductibleInterestYTD: se.itemizedDeductibleInterestYTD,
		PreTaxContributionsYTD:        se.preTaxContributionsYTD,
		CharitableDistributionsYTD:    se.qualifiedCharitableDistributionsYTD,

		// YTD Payments
		TaxWithholdingYTD:    se.taxWithholdingYTD,
		EstimatedPaymentsYTD: se.estimatedPaymentsYTD,

		// Accrual tracking
		UnpaidTaxLiability: se.unpaidTaxLiability,

		// Bracket information (estimated)
		CurrentMarginalBracket: se.estimateCurrentMarginalBracket(),
		CurrentLTCGBracket:     se.estimateCurrentLTCGBracket(),
		EstimatedEffectiveRate: se.estimateEffectiveTaxRate(),
	}
}

// getCapitalLossCarryover returns any capital loss carryover from previous years
func (se *SimulationEngine) getCapitalLossCarryover() float64 {
	// Capital loss carryover is tracked in tax calculation results
	// For now, compute from YTD losses that exceed YTD gains
	totalLosses := se.capitalLossesYTD
	totalGains := se.shortTermCapitalGainsYTD + se.longTermCapitalGainsYTD

	// If losses exceed gains, excess can be carried over (up to $3k deducted per year)
	if totalLosses > totalGains {
		return totalLosses - totalGains
	}
	return 0
}

// estimateCurrentMarginalBracket estimates the current marginal tax bracket
func (se *SimulationEngine) estimateCurrentMarginalBracket() float64 {
	totalIncome := se.ordinaryIncomeYTD + se.qualifiedDividendsYTD + se.interestIncomeYTD
	if totalIncome <= 0 {
		return 0.10 // Lowest bracket
	}

	// Use 2025 brackets (MFJ) for estimation
	brackets := []struct {
		limit float64
		rate  float64
	}{
		{23850, 0.10},
		{96950, 0.12},
		{206700, 0.22},
		{394600, 0.24},
		{501050, 0.32},
		{751600, 0.35},
		{1e18, 0.37},
	}

	for _, bracket := range brackets {
		if totalIncome <= bracket.limit {
			return bracket.rate
		}
	}
	return 0.37
}

// estimateCurrentLTCGBracket estimates the current long-term capital gains bracket
func (se *SimulationEngine) estimateCurrentLTCGBracket() float64 {
	totalIncome := se.ordinaryIncomeYTD + se.qualifiedDividendsYTD + se.interestIncomeYTD

	// 2025 LTCG brackets (MFJ)
	if totalIncome <= 96700 {
		return 0.0
	} else if totalIncome <= 600050 {
		return 0.15
	}
	return 0.20
}

// estimateEffectiveTaxRate estimates the effective tax rate based on YTD data
func (se *SimulationEngine) estimateEffectiveTaxRate() float64 {
	totalIncome := se.ordinaryIncomeYTD + se.qualifiedDividendsYTD +
		se.interestIncomeYTD + se.shortTermCapitalGainsYTD + se.longTermCapitalGainsYTD

	if totalIncome <= 0 {
		return 0
	}

	totalTaxPaid := se.taxWithholdingYTD + se.estimatedPaymentsYTD
	return totalTaxPaid / totalIncome
}

// captureLiabilityState captures all debt/liability state
func (se *SimulationEngine) captureLiabilityState(calendarYear, calendarMonth int) []ComprehensiveLiabilityState {
	if len(se.liabilities) == 0 {
		return nil
	}

	states := make([]ComprehensiveLiabilityState, 0, len(se.liabilities))
	for _, liability := range se.liabilities {
		if liability == nil {
			continue
		}

		// Calculate this month's interest/principal split using amortization formula
		monthlyRate := liability.InterestRate / 12.0
		interestThisMonth := 0.0
		principalThisMonth := 0.0
		if liability.CurrentPrincipalBalance > 0 && liability.MonthlyPayment > 0 {
			principalThisMonth, interestThisMonth = CalculateAmortizationSplit(
				liability.CurrentPrincipalBalance,
				liability.MonthlyPayment,
				monthlyRate,
			)
		}

		// Estimate total interest remaining (sum of future interest payments)
		totalInterestRemaining := estimateTotalInterestRemaining(
			liability.CurrentPrincipalBalance,
			liability.MonthlyPayment,
			monthlyRate,
			liability.TermRemainingMonths,
		)

		state := ComprehensiveLiabilityState{
			LiabilityID:         liability.ID,
			Name:                liability.Name,
			Type:                liability.Type,
			OriginalPrincipal:   0, // Not tracked in current LiabilityInfo
			CurrentPrincipal:    liability.CurrentPrincipalBalance,
			InterestRate:        liability.InterestRate,
			MonthlyPayment:      liability.MonthlyPayment,
			TermRemainingMonths: liability.TermRemainingMonths,
			OriginalTermMonths:  0, // Not tracked in current LiabilityInfo

			// YTD tracking from aggregate flows (apportioned by this liability's share)
			// This is an approximation since per-liability YTD tracking isn't available
			InterestPaidYTD:  0, // Would need per-liability tracking
			PrincipalPaidYTD: 0, // Would need per-liability tracking
			TotalPaidYTD:     0, // Would need per-liability tracking

			// This month - computed from amortization formula
			InterestPaidThisMonth:  interestThisMonth,
			PrincipalPaidThisMonth: principalThisMonth,

			// Additional useful fields
			TotalInterestRemaining: totalInterestRemaining,
			PayoffDate:             calculatePayoffDate(calendarYear, calendarMonth, liability.TermRemainingMonths),

			// Flags
			IsTaxDeductible: liability.IsTaxDeductible,
			IsActive:        liability.CurrentPrincipalBalance > 0,
		}
		states = append(states, state)
	}

	return states
}

// estimateTotalInterestRemaining calculates remaining interest over the life of the loan
func estimateTotalInterestRemaining(principal, monthlyPayment, monthlyRate float64, remainingMonths int) float64 {
	if remainingMonths <= 0 || monthlyPayment <= 0 {
		return 0
	}

	totalInterest := 0.0
	balance := principal
	for month := 0; month < remainingMonths && balance > 0; month++ {
		interest := balance * monthlyRate
		principalPayment := monthlyPayment - interest
		if principalPayment > balance {
			principalPayment = balance
		}
		totalInterest += interest
		balance -= principalPayment
	}
	return totalInterest
}

// calculatePayoffDate returns the estimated payoff date as YYYY-MM string
func calculatePayoffDate(currentYear, currentMonth, remainingMonths int) string {
	if remainingMonths <= 0 {
		return ""
	}
	totalMonths := (currentYear * 12) + (currentMonth - 1) + remainingMonths
	payoffYear := totalMonths / 12
	payoffMonth := (totalMonths % 12) + 1
	return fmt.Sprintf("%d-%02d", payoffYear, payoffMonth)
}

// captureStrategyExecutions captures strategy actions taken this month
// Infers strategy executions from monthly flow data
func (se *SimulationEngine) captureStrategyExecutions() []StrategyExecution {
	var executions []StrategyExecution
	flows := se.currentMonthFlows

	// Roth conversion
	if flows.RothConversionAmountThisMonth > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "ROTH_CONVERSION",
			Description:     fmt.Sprintf("Roth conversion: $%.0f from tax-deferred", flows.RothConversionAmountThisMonth),
			Amount:          flows.RothConversionAmountThisMonth,
			SourceAccount:   "tax_deferred",
			TargetAccount:   "roth",
			ExecutionReason: "Scheduled or opportunistic conversion",
		})
	}

	// Asset liquidation for cash needs
	if flows.DivestmentProceedsThisMonth > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "WITHDRAWAL",
			Description:     fmt.Sprintf("Asset liquidation: $%.0f for cash flow", flows.DivestmentProceedsThisMonth),
			Amount:          flows.DivestmentProceedsThisMonth,
			ExecutionReason: "Cash flow requirement",
		})
	}

	// Contributions to tax-deferred accounts (401k, IRA)
	if flows.ContributionsTaxDeferredThisMonth > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "CONTRIBUTION",
			Description:     fmt.Sprintf("Tax-deferred contribution: $%.0f", flows.ContributionsTaxDeferredThisMonth),
			Amount:          flows.ContributionsTaxDeferredThisMonth,
			TargetAccount:   "tax_deferred",
			ExecutionReason: "Scheduled contribution",
		})
	}

	// Contributions to Roth accounts
	if flows.ContributionsRothThisMonth > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "CONTRIBUTION",
			Description:     fmt.Sprintf("Roth contribution: $%.0f", flows.ContributionsRothThisMonth),
			Amount:          flows.ContributionsRothThisMonth,
			TargetAccount:   "roth",
			ExecutionReason: "Scheduled contribution",
		})
	}

	// Contributions to taxable accounts
	if flows.ContributionsTaxableThisMonth > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "CONTRIBUTION",
			Description:     fmt.Sprintf("Taxable investment: $%.0f", flows.ContributionsTaxableThisMonth),
			Amount:          flows.ContributionsTaxableThisMonth,
			TargetAccount:   "taxable",
			ExecutionReason: "Scheduled contribution",
		})
	}

	// Rebalancing trades
	if flows.RebalancingTradesNetEffectThisMonth != 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "REBALANCING",
			Description:     fmt.Sprintf("Portfolio rebalancing: net $%.0f", flows.RebalancingTradesNetEffectThisMonth),
			Amount:          flows.RebalancingTradesNetEffectThisMonth,
			ExecutionReason: "Asset allocation maintenance",
		})
	}

	// Debt payments (principal portion)
	if flows.DebtPaymentsPrincipalThisMonth > 0 {
		totalDebtPayment := flows.DebtPaymentsPrincipalThisMonth + flows.DebtPaymentsInterestThisMonth
		executions = append(executions, StrategyExecution{
			StrategyType:    "DEBT_PAYMENT",
			Description:     fmt.Sprintf("Debt payment: $%.0f ($%.0f principal, $%.0f interest)", totalDebtPayment, flows.DebtPaymentsPrincipalThisMonth, flows.DebtPaymentsInterestThisMonth),
			Amount:          totalDebtPayment,
			ExecutionReason: "Scheduled debt service",
		})
	}

	// Tax payments (if significant)
	totalTaxes := flows.TaxWithheldThisMonth + flows.TaxesPaidThisMonth
	if totalTaxes > 0 {
		executions = append(executions, StrategyExecution{
			StrategyType:    "TAX_PAYMENT",
			Description:     fmt.Sprintf("Tax payment: $%.0f", totalTaxes),
			Amount:          totalTaxes,
			ExecutionReason: "Tax obligation",
		})
	}

	if len(executions) == 0 {
		return nil
	}
	return executions
}

// captureMonthlyFlows converts internal MonthlyFlows to serializable MonthlyFlowsDetail
func (se *SimulationEngine) captureMonthlyFlows() MonthlyFlowsDetail {
	flows := se.currentMonthFlows
	dividends := flows.DividendsReceivedThisMonth.Qualified + flows.DividendsReceivedThisMonth.Ordinary

	return MonthlyFlowsDetail{
		// Income
		TotalIncome:          flows.IncomeThisMonth,
		EmploymentIncome:     flows.EmploymentIncomeThisMonth,
		SalaryIncome:         flows.SalaryIncomeThisMonth,
		BonusIncome:          flows.BonusIncomeThisMonth,
		RSUIncome:            flows.RSUIncomeThisMonth,
		SocialSecurityIncome: flows.SocialSecurityIncomeThisMonth,
		PensionIncome:        flows.PensionIncomeThisMonth,
		DividendIncome:       dividends,
		InterestIncome:       flows.InterestIncomeThisMonth,

		// Expenses
		TotalExpenses:          flows.ExpensesThisMonth,
		HousingExpenses:        flows.HousingExpensesThisMonth,
		TransportationExpenses: flows.TransportationExpensesThisMonth,
		FoodExpenses:           flows.FoodExpensesThisMonth,
		OtherExpenses:          flows.OtherExpensesThisMonth,

		// Debt payments
		DebtPaymentsPrincipal: flows.DebtPaymentsPrincipalThisMonth,
		DebtPaymentsInterest:  flows.DebtPaymentsInterestThisMonth,

		// Contributions
		TotalContributions:       flows.ContributionsToInvestmentsThisMonth,
		ContributionsTaxable:     flows.ContributionsTaxableThisMonth,
		ContributionsTaxDeferred: flows.ContributionsTaxDeferredThisMonth,
		ContributionsRoth:        flows.ContributionsRothThisMonth,
		ContributionsHSA:         flows.ContributionsHSAThisMonth,

		// Withdrawals
		TotalWithdrawals:   flows.DivestmentProceedsThisMonth,
		DivestmentProceeds: flows.DivestmentProceedsThisMonth,
		RMDAmount:          flows.RMDAmountThisMonth,

		// Taxes
		TaxWithheld: flows.TaxWithheldThisMonth,
		TaxesPaid:   flows.TaxesPaidThisMonth,

		// Other
		RothConversionAmount: flows.RothConversionAmountThisMonth,
		InvestmentGrowth:     flows.InvestmentGrowthThisMonth,

		// Auto-shortfall cover (for Trace View attribution)
		AutoShortfallCover: flows.AutoShortfallCoverThisMonth,
	}
}
