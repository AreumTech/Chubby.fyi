package engine

// rmd_calculator.go
// Required Minimum Distribution (RMD) calculations
// Reference: IRS Uniform Lifetime Table (Publication 590-B)
// Reference: Python robo-advisor Chapter 9

import (
	"fmt"
)

// RMDCalculator handles Required Minimum Distribution calculations
type RMDCalculator struct {
	uniformLifetimeTable map[int]float64
}

// NewRMDCalculator creates a new RMD calculator with IRS Uniform Lifetime Table
func NewRMDCalculator() *RMDCalculator {
	return &RMDCalculator{
		uniformLifetimeTable: getUniformLifetimeTable(),
	}
}

// getUniformLifetimeTable returns the IRS Uniform Lifetime Table
// Source: IRS Publication 590-B, Appendix B
// Updated for SECURE 2.0 Act (RMDs start at age 73 as of 2023)
func getUniformLifetimeTable() map[int]float64 {
	return map[int]float64{
		// Age: Life Expectancy Factor (Divisor)
		72: 27.4, // Pre-RMD age (for reference)
		73: 26.5, // First RMD year (SECURE 2.0)
		74: 25.5,
		75: 24.6,
		76: 23.7,
		77: 22.9,
		78: 22.0,
		79: 21.1,
		80: 20.2,
		81: 19.4,
		82: 18.5,
		83: 17.7,
		84: 16.8,
		85: 16.0,
		86: 15.2,
		87: 14.4,
		88: 13.7,
		89: 12.9,
		90: 12.2,
		91: 11.5,
		92: 10.8,
		93: 10.1,
		94: 9.5,
		95: 9.0,
		96: 8.4,
		97: 7.8,
		98: 7.3,
		99: 6.8,
		100: 6.4,
		101: 6.0,
		102: 5.6,
		103: 5.2,
		104: 4.9,
		105: 4.6,
		106: 4.3,
		107: 4.1,
		108: 3.9,
		109: 3.7,
		110: 3.5,
		111: 3.4,
		112: 3.3,
		113: 3.1,
		114: 3.0,
		115: 2.9,
		116: 2.8,
		117: 2.7,
		118: 2.5,
		119: 2.3,
		120: 2.0,
	}
}

// CalculateRMD calculates the required minimum distribution for a given age and balance
// Returns 0 if below RMD age (73), or the calculated RMD amount
func (calc *RMDCalculator) CalculateRMD(age int, accountBalance float64) float64 {
	// No RMD required before age 73 (SECURE 2.0 Act)
	if age < 73 {
		return 0.0
	}

	// Age 120+ uses 2.0 divisor (50% distribution)
	if age >= 120 {
		return accountBalance * 0.5
	}

	// Look up divisor from table
	divisor, exists := calc.uniformLifetimeTable[age]
	if !exists {
		// Shouldn't happen with complete table, but handle gracefully
		return accountBalance * 0.5 // Conservative fallback
	}

	return accountBalance / divisor
}

// CalculateRMDPercentage returns the RMD as a percentage of the account balance
func (calc *RMDCalculator) CalculateRMDPercentage(age int) float64 {
	if age < 73 {
		return 0.0
	}

	if age >= 120 {
		return 0.5
	}

	divisor, exists := calc.uniformLifetimeTable[age]
	if !exists {
		return 0.5
	}

	return 1.0 / divisor
}

// GetDivisor returns the life expectancy divisor for a given age
func (calc *RMDCalculator) GetDivisor(age int) (float64, error) {
	if age < 73 {
		return 0.0, fmt.Errorf("no RMD required before age 73")
	}

	if age >= 120 {
		return 2.0, nil
	}

	divisor, exists := calc.uniformLifetimeTable[age]
	if !exists {
		return 0.0, fmt.Errorf("divisor not found for age %d", age)
	}

	return divisor, nil
}

// RMDProjection represents projected RMDs over multiple years
type RMDProjection struct {
	Year              int
	Age               int
	StartingBalance   float64
	RequiredRMD       float64
	RMDPercentage     float64
	EndingBalance     float64
}

// ProjectRMDs calculates RMD projections over multiple years
// Accounts for balance growth and RMD withdrawals
func (calc *RMDCalculator) ProjectRMDs(
	startingAge int,
	startingBalance float64,
	annualGrowthRate float64,
	numberOfYears int,
) []RMDProjection {
	projections := make([]RMDProjection, 0, numberOfYears)
	balance := startingBalance

	for year := 0; year < numberOfYears; year++ {
		age := startingAge + year

		// Calculate RMD for this year
		rmd := calc.CalculateRMD(age, balance)
		rmdPercentage := calc.CalculateRMDPercentage(age)

		// Withdraw RMD
		balanceAfterRMD := balance - rmd

		// Apply growth to remaining balance
		endingBalance := balanceAfterRMD * (1.0 + annualGrowthRate)

		projections = append(projections, RMDProjection{
			Year:            year + 1,
			Age:             age,
			StartingBalance: balance,
			RequiredRMD:     rmd,
			RMDPercentage:   rmdPercentage,
			EndingBalance:   endingBalance,
		})

		// Update balance for next year
		balance = endingBalance
	}

	return projections
}

// CalculateTotalRMDs calculates total RMDs across all tax-deferred accounts
func (calc *RMDCalculator) CalculateTotalRMDs(
	age int,
	accounts *AccountHoldingsMonthEnd,
) float64 {
	totalRMD := 0.0

	// RMDs apply to tax-deferred accounts (Traditional IRA, 401k)
	if accounts.TaxDeferred != nil {
		totalRMD += calc.CalculateRMD(age, accounts.TaxDeferred.TotalValue)
	}

	// Note: Roth accounts do NOT have RMDs
	// Note: Some 401k balances might be in tax_deferred

	return totalRMD
}

// RMDStrategy defines how to handle RMD withdrawals
type RMDStrategy struct {
	AutomaticWithdrawal bool    // Automatically withdraw RMDs
	ReinvestExcess     bool    // Reinvest RMD amount exceeding spending needs
	TargetAccount      string  // Where to deposit RMD ("cash", "taxable")
}

// ProcessRMD handles RMD withdrawal and applies tax consequences
func (calc *RMDCalculator) ProcessRMD(
	age int,
	accounts *AccountHoldingsMonthEnd,
	strategy RMDStrategy,
	currentMonth int,
	taxCalculator *TaxCalculator,
) (rmdAmount float64, taxOwed float64, err error) {
	// Calculate required RMD
	rmdAmount = calc.CalculateTotalRMDs(age, accounts)

	if rmdAmount == 0 {
		return 0, 0, nil
	}

	// Withdraw from tax-deferred account
	if accounts.TaxDeferred == nil || accounts.TaxDeferred.TotalValue < rmdAmount {
		return 0, 0, fmt.Errorf("insufficient tax-deferred funds for RMD: need %.2f, have %.2f",
			rmdAmount, accounts.TaxDeferred.TotalValue)
	}

	// RMD is taxed as ordinary income
	// Note: Actual tax calculation would happen at year-end
	// For now, we just track the income

	// Transfer to target account
	if strategy.TargetAccount == "cash" {
		accounts.Cash += rmdAmount
	} else if strategy.TargetAccount == "taxable" {
		// Would need to purchase assets in taxable account
		accounts.Cash += rmdAmount // Simplified - deposit to cash first
	}

	// Reduce tax-deferred account
	accounts.TaxDeferred.TotalValue -= rmdAmount

	return rmdAmount, 0, nil // Tax calculated separately at year-end
}

// RMDShortfall represents when RMD exceeds spending needs
type RMDShortfall struct {
	RequiredRMD    float64
	SpendingNeed   float64
	ExcessRMD      float64
	ShouldReinvest bool
}

// AnalyzeRMDVsSpending compares RMD to spending needs
func (calc *RMDCalculator) AnalyzeRMDVsSpending(
	age int,
	accountBalance float64,
	annualSpending float64,
) RMDShortfall {
	rmd := calc.CalculateRMD(age, accountBalance)
	excess := rmd - annualSpending

	return RMDShortfall{
		RequiredRMD:    rmd,
		SpendingNeed:   annualSpending,
		ExcessRMD:      excess,
		ShouldReinvest: excess > 0,
	}
}
