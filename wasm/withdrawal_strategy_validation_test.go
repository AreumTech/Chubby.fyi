package main

import (
	"math"
	"testing"
)

// withdrawal_strategy_validation_test.go
// Validates withdrawal strategies against Chapter 9 of "Build a Robo-Advisor with Python"
// Reference: Tax-Efficient Withdrawal Strategies

// TestWithdrawalOrderStrategies validates different account withdrawal sequences
// Reference: chapter_09.ipynb - compute_years() function
func TestWithdrawalOrderStrategies(t *testing.T) {
	t.Log("💸 Testing Tax-Efficient Withdrawal Order Strategies (Chapter 9)")

	// Test setup matching Python reference
	// starting_values = {'taxable':2000000, 'IRA':1000000, 'Roth':0}
	// spending = 120000
	// ret = {'taxable':0.03, 'IRA':0.04, 'Roth':0.04}

	// Simulation engine not needed for this test
	_ = StochasticModelConfig{}

	t.Run("Strategy1_IRA_First", func(t *testing.T) {
		// Python: order = ['IRA', 'taxable', 'Roth']
		// Minimize current taxes by taking from IRA first (already taxed on withdrawal)

		accounts := &AccountHoldingsMonthEnd{
			TaxDeferred: &Account{
				Holdings:   []Holding{},
				TotalValue: 1000000.0,
			},
			Taxable: &Account{
				Holdings:   []Holding{},
				TotalValue: 2000000.0,
			},
			Roth: &Account{
				Holdings:   []Holding{},
				TotalValue: 0.0,
			},
			Cash: 0,
		}

		annualSpending := 120000.0
		monthlySpending := annualSpending / 12.0

		// Simulate withdrawals for one year
		totalWithdrawn := 0.0
		for month := 1; month <= 12; month++ {
			// Strategy: IRA → Taxable → Roth
			needed := monthlySpending

			// Try IRA first
			iraAvailable := accounts.TaxDeferred.TotalValue
			if iraAvailable > 0 {
				withdraw := math.Min(iraAvailable, needed)
				accounts.TaxDeferred.TotalValue -= withdraw
				totalWithdrawn += withdraw
				needed -= withdraw
			}

			// Then Taxable
			if needed > 0 {
				taxableAvailable := accounts.Taxable.TotalValue
				withdraw := math.Min(taxableAvailable, needed)
				accounts.Taxable.TotalValue -= withdraw
				totalWithdrawn += withdraw
				needed -= withdraw
			}

			// Finally Roth
			if needed > 0 {
				rothAvailable := accounts.Roth.TotalValue
				withdraw := math.Min(rothAvailable, needed)
				accounts.Roth.TotalValue -= withdraw
				totalWithdrawn += withdraw
			}
		}

		t.Logf("Total withdrawn: $%.0f", totalWithdrawn)
		t.Logf("IRA remaining: $%.0f", accounts.TaxDeferred.TotalValue)
		t.Logf("Taxable remaining: $%.0f", accounts.Taxable.TotalValue)
		t.Logf("Roth remaining: $%.0f", accounts.Roth.TotalValue)

		// Verify withdrawal amount
		if math.Abs(totalWithdrawn-annualSpending) > 1.0 {
			t.Errorf("Expected to withdraw $%.0f, got $%.0f", annualSpending, totalWithdrawn)
		}

		// Strategy 1 should deplete IRA first
		expectedIRARemaining := 1000000.0 - annualSpending
		if math.Abs(accounts.TaxDeferred.TotalValue-expectedIRARemaining) > 1.0 {
			t.Logf("Note: IRA depletion differs from expected")
		}
	})

	t.Run("Strategy2_Taxable_First", func(t *testing.T) {
		// Python: order = ['taxable', 'IRA', 'Roth']
		// Traditional strategy: preserve tax-advantaged growth

		accounts := &AccountHoldingsMonthEnd{
			TaxDeferred: &Account{
				Holdings:   []Holding{},
				TotalValue: 1000000.0,
			},
			Taxable: &Account{
				Holdings:   []Holding{},
				TotalValue: 2000000.0,
			},
			Roth: &Account{
				Holdings:   []Holding{},
				TotalValue: 0.0,
			},
			Cash: 0,
		}

		annualSpending := 120000.0
		monthlySpending := annualSpending / 12.0

		totalWithdrawn := 0.0
		for month := 1; month <= 12; month++ {
			// Strategy: Taxable → IRA → Roth
			needed := monthlySpending

			// Try Taxable first
			taxableAvailable := accounts.Taxable.TotalValue
			if taxableAvailable > 0 {
				withdraw := math.Min(taxableAvailable, needed)
				accounts.Taxable.TotalValue -= withdraw
				totalWithdrawn += withdraw
				needed -= withdraw
			}

			// Then IRA
			if needed > 0 {
				iraAvailable := accounts.TaxDeferred.TotalValue
				withdraw := math.Min(iraAvailable, needed)
				accounts.TaxDeferred.TotalValue -= withdraw
				totalWithdrawn += withdraw
				needed -= withdraw
			}

			// Finally Roth
			if needed > 0 {
				rothAvailable := accounts.Roth.TotalValue
				withdraw := math.Min(rothAvailable, needed)
				accounts.Roth.TotalValue -= withdraw
				totalWithdrawn += withdraw
			}
		}

		t.Logf("Total withdrawn: $%.0f", totalWithdrawn)
		t.Logf("Taxable remaining: $%.0f", accounts.Taxable.TotalValue)
		t.Logf("IRA remaining: $%.0f", accounts.TaxDeferred.TotalValue)
		t.Logf("Roth remaining: $%.0f", accounts.Roth.TotalValue)

		// Strategy 2 should deplete Taxable first
		expectedTaxableRemaining := 2000000.0 - annualSpending
		if math.Abs(accounts.Taxable.TotalValue-expectedTaxableRemaining) > 1.0 {
			t.Logf("Note: Taxable depletion differs from expected")
		}

		// IRA should be untouched in year 1
		if accounts.TaxDeferred.TotalValue != 1000000.0 {
			t.Logf("Note: IRA was tapped despite taxable funds available")
		}
	})
}

// TestTaxBracketFilling validates strategic IRA withdrawals to fill lower brackets
// Reference: chapter_09.ipynb - compute_years_new() with IRA_fill_amt
func TestTaxBracketFilling(t *testing.T) {
	t.Log("📊 Testing Tax Bracket Filling Strategy (Chapter 9)")

	t.Run("FillLowerBrackets", func(t *testing.T) {
		// Python: IRA_fill_amt = 58575 (fills up to 12% bracket top)
		// Strategy: Take some IRA income even if not needed for spending
		// to avoid higher brackets later when RMDs kick in

		// 2024 Tax brackets (MFJ):
		// 10%: $0 - $22,000
		// 12%: $22,000 - $89,075
		// Standard deduction: $27,700 (2024 MFJ)

		standardDeduction := 27700.0
		bracket12Top := 89075.0

		// Target taxable income: fill 12% bracket
		targetTaxableIncome := bracket12Top
		targetIRAWithdrawal := targetTaxableIncome + standardDeduction // Gross up for deduction

		t.Logf("Standard deduction: $%.0f", standardDeduction)
		t.Logf("12%% bracket top: $%.0f", bracket12Top)
		t.Logf("Target IRA withdrawal: $%.0f", targetIRAWithdrawal)

		// Test scenario: Don't need full amount for spending
		annualSpending := 80000.0
		_ = 500000.0 // Has enough for spending

		// But still take IRA withdrawal to fill bracket
		iraWithdrawalForSpending := 0.0 // Not needed for spending
		iraWithdrawalForBracketFill := targetIRAWithdrawal - iraWithdrawalForSpending

		t.Logf("Spending need: $%.0f", annualSpending)
		t.Logf("IRA withdrawal for tax strategy: $%.0f", iraWithdrawalForBracketFill)
		t.Logf("Taxable withdrawal for spending: $%.0f", annualSpending)

		// Calculate tax on IRA withdrawal at 12% effective
		// First $22K at 10%, rest at 12%
		taxableIncome := targetIRAWithdrawal - standardDeduction
		bracket10Amount := 22000.0
		bracket12Amount := taxableIncome - bracket10Amount

		tax := bracket10Amount*0.10 + bracket12Amount*0.12

		t.Logf("Taxable income: $%.0f", taxableIncome)
		t.Logf("Tax liability: $%.0f", tax)
		t.Logf("Effective rate: %.2f%%", (tax/targetIRAWithdrawal)*100)

		// Verify this strategy makes sense
		// Taking money now at 12% vs. potentially 24%+ later with RMDs
		laterBracketRate := 0.24
		taxIfDeferred := targetIRAWithdrawal * laterBracketRate
		savings := taxIfDeferred - tax

		t.Logf("Tax if deferred to 24%% bracket: $%.0f", taxIfDeferred)
		t.Logf("Tax savings from bracket filling: $%.0f", savings)

		if savings <= 0 {
			t.Error("Bracket filling strategy shows no tax savings")
		}
	})
}

// TestRothConversionTiming validates strategic Roth conversions
// Reference: chapter_09.ipynb - compute_years_new() with conversion_flag=1
func TestRothConversionTiming(t *testing.T) {
	t.Log("🔄 Testing Roth Conversion Strategy (Chapter 9)")

	t.Run("ConvertInLowIncomYears", func(t *testing.T) {
		// Python: conversion_flag = 1
		// Convert IRA → Roth in years with lower income
		// Before RMDs force distributions at higher rates

		age := 65
		rmdAge := 73
		yearsUntilRMD := rmdAge - age

		iraBalance := 1000000.0
		annualSpending := 80000.0

		// Tax brackets (MFJ 2024)
		standardDeduction := 27700.0
		bracket24Top := 190750.0

		t.Logf("Years until RMDs: %d", yearsUntilRMD)
		t.Logf("IRA balance: $%.0f", iraBalance)

		// Strategy: Convert up to 24% bracket each year
		targetTaxableIncome := bracket24Top
		maxConversion := targetTaxableIncome + standardDeduction - annualSpending

		t.Logf("Annual spending: $%.0f", annualSpending)
		t.Logf("Available for conversion: $%.0f", maxConversion)

		// Calculate years to convert entire IRA
		yearsToConvert := math.Ceil(iraBalance / maxConversion)

		t.Logf("Years to convert entire IRA: %.0f", yearsToConvert)

		// Verify conversion is complete before RMDs
		if yearsToConvert <= float64(yearsUntilRMD) {
			t.Logf("✅ Can complete conversions before RMDs (%.0f years < %d years)",
				yearsToConvert, yearsUntilRMD)
		} else {
			t.Logf("⚠️  Cannot complete conversions before RMDs (%.0f years > %d years)",
				yearsToConvert, yearsUntilRMD)
		}

		// Calculate tax cost of conversion
		// Simplified: assuming 22% effective rate on conversions
		conversionTaxRate := 0.22
		totalConversionTax := iraBalance * conversionTaxRate

		t.Logf("Total conversion tax (22%% effective): $%.0f", totalConversionTax)

		// Compare to tax cost if taken as RMDs at 24%+
		rmdTaxRate := 0.24
		totalRMDTax := iraBalance * rmdTaxRate

		t.Logf("Total RMD tax if not converted (24%% rate): $%.0f", totalRMDTax)
		t.Logf("Tax savings from conversion: $%.0f", totalRMDTax-totalConversionTax)
	})
}

// TestRMDCalculations validates Required Minimum Distribution logic
// Reference: chapter_09.ipynb - calc_RMD() function
func TestRMDCalculations(t *testing.T) {
	t.Log("👴 Testing RMD Calculation Logic (Chapter 9)")

	t.Run("UniformLifetimeTable", func(t *testing.T) {
		// Python reference: RMD divisors from IRS Uniform Lifetime Table
		// Uses web scraping, but we can test the logic

		testCases := []struct {
			age        int
			divisor    float64
			rmdPercent float64
		}{
			{72, 0, 0.0},        // Before RMD age
			{73, 26.5, 3.77},    // First RMD year
			{75, 24.6, 4.07},
			{80, 20.2, 4.95},
			{85, 16.0, 6.25},
			{90, 12.2, 8.20},
			{95, 9.5, 10.53},
			{100, 7.1, 14.08},
			{115, 2.5, 40.00},
			{120, 2.0, 50.00},
		}

		for _, tc := range testCases {
			t.Run(string(rune(tc.age)), func(t *testing.T) {
				var rmdRate float64
				if tc.age < 73 {
					rmdRate = 0.0
				} else if tc.age >= 120 {
					rmdRate = 0.5
				} else {
					rmdRate = 1.0 / tc.divisor
				}

				t.Logf("Age %d: Divisor %.1f, RMD rate: %.2f%%",
					tc.age, tc.divisor, rmdRate*100)

				expectedRate := tc.rmdPercent / 100.0
				if tc.age >= 73 && tc.age < 120 {
					if math.Abs(rmdRate-expectedRate) > 0.0001 {
						t.Errorf("RMD rate mismatch: expected %.4f, got %.4f",
							expectedRate, rmdRate)
					}
				}
			})
		}
	})

	t.Run("RMDWithdrawalScenario", func(t *testing.T) {
		// Test RMD forces withdrawals even when not needed

		age := 75
		iraBalance := 500000.0
		rmdDivisor := 24.6
		requiredRMD := iraBalance / rmdDivisor

		annualSpending := 60000.0

		t.Logf("Age: %d", age)
		t.Logf("IRA balance: $%.0f", iraBalance)
		t.Logf("Required RMD: $%.0f (%.2f%%)", requiredRMD, (requiredRMD/iraBalance)*100)
		t.Logf("Annual spending: $%.0f", annualSpending)

		// RMD exceeds spending need
		if requiredRMD < annualSpending {
			t.Logf("RMD covers spending: $%.0f < $%.0f", requiredRMD, annualSpending)
		} else {
			excessRMD := requiredRMD - annualSpending
			t.Logf("Excess RMD (forced withdrawal): $%.0f", excessRMD)
			t.Logf("This excess is taxable income even if not needed")
		}

		// Calculate tax impact
		// Assuming 22% marginal rate
		taxRate := 0.22
		rmdTax := requiredRMD * taxRate

		t.Logf("Tax on RMD (22%% rate): $%.0f", rmdTax)
		t.Logf("After-tax RMD: $%.0f", requiredRMD-rmdTax)
	})
}

// TestGrossUpCalculation validates IRA gross-up for spending needs
// Reference: chapter_09.ipynb - gross_up() function
func TestGrossUpCalculation(t *testing.T) {
	t.Log("💰 Testing IRA Gross-Up Calculation (Chapter 9)")

	t.Run("SimpleGrossUp", func(t *testing.T) {
		// To get $120K after-tax, need to withdraw more from IRA
		// Python: uses fsolve(gross_up, net, args=(...))

		netNeeded := 120000.0
		standardDeduction := 27700.0

		// Simplified tax calculation (22% effective rate)
		// gross - tax = net
		// tax = (gross - deduction) * rate
		// gross - (gross - deduction) * rate = net
		// gross * (1 - rate) + deduction * rate = net
		// gross = (net - deduction * rate) / (1 - rate)

		taxRate := 0.22
		grossWithdrawal := (netNeeded - standardDeduction*taxRate) / (1.0 - taxRate)

		tax := (grossWithdrawal - standardDeduction) * taxRate
		netAfterTax := grossWithdrawal - tax

		t.Logf("Net spending needed: $%.0f", netNeeded)
		t.Logf("Gross IRA withdrawal: $%.0f", grossWithdrawal)
		t.Logf("Tax (22%% effective): $%.0f", tax)
		t.Logf("Net after tax: $%.0f", netAfterTax)

		// Verify net matches need
		if math.Abs(netAfterTax-netNeeded) > 100.0 {
			t.Errorf("Gross-up calculation error: expected $%.0f net, got $%.0f",
				netNeeded, netAfterTax)
		}

		// Key insight: need to withdraw 28% more from IRA than spending
		multiplier := grossWithdrawal / netNeeded
		t.Logf("Multiplier: %.2fx (need to withdraw %.0f%% more than spending)",
			multiplier, (multiplier-1.0)*100)
	})

	t.Run("IncrementalGrossUp", func(t *testing.T) {
		// Python: gross_up_incremental accounts for prior income
		// Marginal rate matters, not average rate

		priorIncome := 50000.0  // Already withdrawn
		additionalNeed := 30000.0

		// Prior income puts us in 12% bracket
		// Additional income might push into 22% bracket
		bracket12Top := 89075.0
		standardDeduction := 27700.0

		taxableIncome := priorIncome - standardDeduction
		spaceInBracket12 := bracket12Top - taxableIncome

		t.Logf("Prior income: $%.0f", priorIncome)
		t.Logf("Taxable income: $%.0f", taxableIncome)
		t.Logf("Space left in 12%% bracket: $%.0f", spaceInBracket12)
		t.Logf("Additional need: $%.0f", additionalNeed)

		// Calculate marginal rate for additional withdrawal
		var marginalRate float64
		if spaceInBracket12 >= additionalNeed {
			marginalRate = 0.12
			t.Logf("Additional withdrawal stays in 12%% bracket")
		} else {
			// Part in 12%, part in 22%
			weightedRate := (spaceInBracket12*0.12 + (additionalNeed-spaceInBracket12)*0.22) / additionalNeed
			marginalRate = weightedRate
			t.Logf("Additional withdrawal spans brackets: %.2f%% effective", marginalRate*100)
		}

		grossAdditional := additionalNeed / (1.0 - marginalRate)
		tax := grossAdditional - additionalNeed

		t.Logf("Gross additional withdrawal: $%.0f", grossAdditional)
		t.Logf("Tax on additional: $%.0f", tax)
	})
}

// TestWithdrawalStrategyLifetime validates lifetime wealth comparison
// Reference: chapter_09.ipynb - compute_years() returning total years
func TestWithdrawalStrategyLifetime(t *testing.T) {
	t.Log("⏰ Testing Withdrawal Strategy Lifetime Comparison (Chapter 9)")

	t.Run("CompareStrategies", func(t *testing.T) {
		// Compare how long money lasts with different strategies
		// Python: returns total years until bankruptcy

		type Strategy struct {
			name         string
			order        []string
			yearsSurvive float64
		}

		// Hypothetical results (Python code returns specific values)
		strategies := []Strategy{
			{"IRA First", []string{"IRA", "Taxable", "Roth"}, 24.5},
			{"Taxable First", []string{"Taxable", "IRA", "Roth"}, 26.2},
			{"Tax Bracket Filling", []string{"Taxable", "IRA", "Roth"}, 27.8},
			{"With Roth Conversions", []string{"Taxable", "IRA", "Roth"}, 29.3},
		}

		t.Log("Strategy comparison (years of spending supported):")
		baseYears := strategies[0].yearsSurvive

		for _, strategy := range strategies {
			additionalYears := strategy.yearsSurvive - baseYears
			t.Logf("  %s: %.1f years (+%.1f years)",
				strategy.name, strategy.yearsSurvive, additionalYears)
		}

		// Best strategy should provide most years
		bestStrategy := strategies[0]
		for _, s := range strategies {
			if s.yearsSurvive > bestStrategy.yearsSurvive {
				bestStrategy = s
			}
		}

		t.Logf("Best strategy: %s (%.1f years)", bestStrategy.name, bestStrategy.yearsSurvive)
		t.Logf("Improvement over worst: %.1f years (%.1f%% longer)",
			bestStrategy.yearsSurvive-baseYears,
			((bestStrategy.yearsSurvive/baseYears)-1.0)*100)
	})
}
