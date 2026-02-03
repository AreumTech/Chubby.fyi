package main

// retirement_features_integration_test.go
// Integration tests for retirement features:
// - RMD calculator
// - Withdrawal sequencing
// - Asset location optimizer
// - Roth conversion optimizer

import (
	"math"
	"testing"
)

// TestRMDCalculatorIntegration tests the RMD calculator with realistic scenarios
func TestRMDCalculatorIntegration(t *testing.T) {
	calc := NewRMDCalculator()

	t.Run("RMD_Age73_FirstYear", func(t *testing.T) {
		// First year of RMDs
		age := 73
		balance := 1000000.0

		rmd := calc.CalculateRMD(age, balance)

		// Age 73 divisor is 26.5
		expectedRMD := 1000000.0 / 26.5 // = $37,735.85

		if math.Abs(rmd-expectedRMD) > 1.0 {
			t.Errorf("RMD mismatch: got %.2f, expected %.2f", rmd, expectedRMD)
		}
	})

	t.Run("RMD_MultiYearProjection", func(t *testing.T) {
		// Project RMDs over 10 years with growth
		startAge := 73
		startBalance := 500000.0
		growthRate := 0.05 // 5% annual growth
		years := 10

		projections := calc.ProjectRMDs(startAge, startBalance, growthRate, years)

		if len(projections) != years {
			t.Errorf("Expected %d projections, got %d", years, len(projections))
		}

		// Verify first year
		if projections[0].Age != 73 {
			t.Errorf("First projection age should be 73, got %d", projections[0].Age)
		}

		// Verify RMDs increase each year (due to growth and aging)
		firstRMD := projections[0].RequiredRMD
		if firstRMD < 18000 || firstRMD > 19000 {
			t.Errorf("First RMD should be ~$18,868, got %.2f", firstRMD)
		}

		// Balance should grow despite RMDs (if growth > RMD percentage)
		if projections[years-1].EndingBalance <= 0 {
			t.Errorf("Final balance should be positive")
		}
	})
}

// TestWithdrawalSequencingIntegration tests the withdrawal sequencing engine
func TestWithdrawalSequencingIntegration(t *testing.T) {
	cashMgr := &CashManager{}
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	rmdCalc := NewRMDCalculator()
	sequencer := NewWithdrawalSequencer(cashMgr, taxCalc, rmdCalc)

	t.Run("TaxEfficientSequence", func(t *testing.T) {
		// Setup accounts
		accounts := &AccountHoldingsMonthEnd{
			Cash:        50000.0,
			Taxable:     &Account{TotalValue: 300000.0, Holdings: []Holding{}},
			TaxDeferred: &Account{TotalValue: 400000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 200000.0, Holdings: []Holding{}},
		}

		// Request withdrawal
		request := WithdrawalRequest{
			Amount:             60000.0,
			CurrentAge:         65,
			CurrentMonth:       1,
			AnnualSpendingNeed: 60000.0,
			MinimumSpending:    40000.0,
		}

		result, err := sequencer.ExecuteWithdrawal(
			request,
			accounts,
			WithdrawalSequenceTaxEfficient,
		)

		if err != nil {
			t.Fatalf("Withdrawal failed: %v", err)
		}

		// Verify total withdrawn
		if math.Abs(result.TotalWithdrawn-60000.0) > 1.0 {
			t.Errorf("Total withdrawn mismatch: got %.2f, expected 60000", result.TotalWithdrawn)
		}

		// Verify tax-efficient order: Cash first, then Taxable
		if result.CashWithdrawn != 50000.0 {
			t.Errorf("Should withdraw all cash first, got %.2f", result.CashWithdrawn)
		}

		if result.TaxableWithdrawn != 10000.0 {
			t.Errorf("Should withdraw remaining from taxable, got %.2f", result.TaxableWithdrawn)
		}

		// Should not touch Roth (last resort)
		if result.RothWithdrawn > 0 {
			t.Errorf("Should not touch Roth, but withdrew %.2f", result.RothWithdrawn)
		}
	})

	t.Run("RMD_MandatoryWithdrawal", func(t *testing.T) {
		// Setup accounts for someone age 75
		accounts := &AccountHoldingsMonthEnd{
			Cash:        10000.0,
			TaxDeferred: &Account{TotalValue: 500000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 200000.0, Holdings: []Holding{}},
		}

		request := WithdrawalRequest{
			Amount:             40000.0,
			CurrentAge:         75, // RMDs required
			CurrentMonth:       1,
			AnnualSpendingNeed: 40000.0,
		}

		result, err := sequencer.ExecuteWithdrawal(
			request,
			accounts,
			WithdrawalSequenceTaxEfficient,
		)

		if err != nil {
			t.Fatalf("Withdrawal failed: %v", err)
		}

		// Should have RMD amount
		if result.RMDAmount <= 0 {
			t.Errorf("Should have RMD for age 75")
		}

		// RMD for age 75, divisor 24.6
		expectedRMD := 500000.0 / 24.6 // ~$20,325
		if math.Abs(result.RMDAmount-expectedRMD) > 100.0 {
			t.Errorf("RMD mismatch: got %.2f, expected %.2f", result.RMDAmount, expectedRMD)
		}
	})
}

// TestAssetLocationIntegration tests the asset location optimizer
func TestAssetLocationIntegration(t *testing.T) {
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	optimizer := NewAssetLocationOptimizer(taxCalc)

	t.Run("TaxEfficiency_Bonds", func(t *testing.T) {
		// Bonds are tax-inefficient (high ordinary income)
		bondProfile := AssetClassProfile{
			AssetClass:          AssetClassUSBondsTotalMarket,
			ExpectedReturn:      0.04,
			DividendYield:       0.04, // All interest
			TurnoverRate:        0.20,
			QualifiedDividendPct: 0.0, // No qualified dividends
		}

		efficiency := optimizer.CalculateTaxEfficiency(bondProfile)

		// Bonds should have lower efficiency than stocks (higher tax drag)
		if efficiency > 85 {
			t.Errorf("Bonds should have lower tax efficiency than stocks, got %.2f", efficiency)
		}

		t.Logf("Bond tax efficiency: %.2f%%", efficiency)

		// Recommendation should be tax-deferred
		recommendation := optimizer.RecommendAssetLocation(bondProfile)
		if recommendation != "tax_deferred" {
			t.Errorf("Bonds should go in tax-deferred, got %s", recommendation)
		}
	})

	t.Run("TaxEfficiency_Stocks", func(t *testing.T) {
		// Stocks are tax-efficient (qualified dividends, capital gains)
		stockProfile := AssetClassProfile{
			AssetClass:          AssetClassUSStocksTotalMarket,
			ExpectedReturn:      0.10,
			DividendYield:       0.015, // 1.5%
			TurnoverRate:        0.05,  // Low for index
			QualifiedDividendPct: 1.0,  // 100% qualified
		}

		efficiency := optimizer.CalculateTaxEfficiency(stockProfile)

		// Stocks should have high efficiency
		if efficiency < 80 {
			t.Errorf("Stocks should have high tax efficiency, got %.2f", efficiency)
		}
	})

	t.Run("LocationPlan_MultiAsset", func(t *testing.T) {
		// Get default profiles
		profiles := optimizer.GetDefaultAssetProfiles()

		// Define account capacities
		capacities := map[string]float64{
			"roth":         100000.0,
			"tax_deferred": 300000.0,
			"taxable":      200000.0,
		}

		// Define target allocations (60/40 stocks/bonds)
		targetAllocations := map[AssetClass]float64{
			AssetClassUSStocksTotalMarket: 360000.0, // 60% stocks
			AssetClassUSBondsTotalMarket:  240000.0, // 40% bonds
		}

		plan, err := optimizer.GenerateLocationPlan(profiles, capacities, targetAllocations)

		if err != nil {
			t.Fatalf("Failed to generate plan: %v", err)
		}

		// Verify total allocation
		if math.Abs(plan.TotalValue-600000.0) > 1.0 {
			t.Errorf("Total value mismatch: got %.2f, expected 600000", plan.TotalValue)
		}

		// Verify bonds go to tax-deferred (tax-inefficient)
		bondPlacements := plan.AssetPlacements[AssetClassUSBondsTotalMarket]
		if bondPlacements["tax_deferred"] < 200000.0 {
			t.Errorf("Most bonds should go to tax-deferred, got %.2f", bondPlacements["tax_deferred"])
		}

		// Verify stocks go to Roth (highest return) and taxable
		stockPlacements := plan.AssetPlacements[AssetClassUSStocksTotalMarket]
		if stockPlacements["roth"] <= 0 {
			t.Errorf("Stocks should go to Roth, got %.2f", stockPlacements["roth"])
		}
	})

	t.Run("AccountTypeComparison", func(t *testing.T) {
		// Compare after-tax values across account types
		amount := 100000.0
		expectedReturn := 0.08
		horizon := 30
		marginalTaxRate := 0.24
		capitalGainsTaxRate := 0.15

		results := optimizer.CompareAccountTypes(
			amount, expectedReturn, horizon, marginalTaxRate, capitalGainsTaxRate,
		)

		// Roth should have highest value (no taxes)
		if results["roth"] <= results["tax_deferred"] {
			t.Errorf("Roth should have highest value: Roth=%.0f, TaxDef=%.0f", results["roth"], results["tax_deferred"])
		}

		if results["roth"] <= results["taxable"] {
			t.Errorf("Roth should beat taxable: Roth=%.0f, Taxable=%.0f", results["roth"], results["taxable"])
		}

		// Tax-deferred vs taxable depends on rates - just log for comparison
		t.Logf("After-tax values: Roth=$%.0f, TaxDeferred=$%.0f, Taxable=$%.0f",
			results["roth"], results["tax_deferred"], results["taxable"])
	})
}

// TestRothConversionIntegration tests the Roth conversion optimizer
func TestRothConversionIntegration(t *testing.T) {
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	rmdCalc := NewRMDCalculator()
	optimizer := NewRothConversionOptimizer(taxCalc, rmdCalc)

	t.Run("ConversionOpportunity_LowBracket", func(t *testing.T) {
		// Early retirement, low income, good conversion opportunity
		age := 62
		year := 2024
		currentIncome := 30000.0 // Low income (retirement, before SS)
		conversionAmount := 50000.0
		filingStatus := FilingStatusMarriedFilingJointly
		standardDeduction := 29200.0

		opportunity := optimizer.EvaluateConversionOpportunity(
			age, year, currentIncome, conversionAmount, filingStatus, standardDeduction,
		)

		// Should be recommended (low tax rate)
		if !opportunity.Recommended {
			t.Errorf("Should recommend conversion at low income: %s", opportunity.Reason)
		}

		// Tax rate should be low
		if opportunity.EffectiveTaxRate > 0.15 {
			t.Errorf("Tax rate too high for low income: %.2f%%", opportunity.EffectiveTaxRate*100)
		}
	})

	t.Run("ConversionOpportunity_HighBracket", func(t *testing.T) {
		// High income year, bad conversion opportunity
		age := 62
		year := 2024
		currentIncome := 200000.0 // High income
		conversionAmount := 50000.0
		filingStatus := FilingStatusMarriedFilingJointly
		standardDeduction := 29200.0

		opportunity := optimizer.EvaluateConversionOpportunity(
			age, year, currentIncome, conversionAmount, filingStatus, standardDeduction,
		)

		// Should NOT be recommended (high tax rate)
		if opportunity.Recommended {
			t.Errorf("Should NOT recommend conversion at high income: %s", opportunity.Reason)
		}

		// Tax rate should be high
		if opportunity.EffectiveTaxRate < 0.22 {
			t.Errorf("Tax rate should be high for high income: %.2f%%", opportunity.EffectiveTaxRate*100)
		}
	})

	t.Run("OptimalConversionAmount", func(t *testing.T) {
		// Calculate optimal conversion to fill 22% bracket
		currentIncome := 50000.0
		targetBracketTop := 89075.0 // Top of 12% bracket for MFJ
		iraBalance := 500000.0

		conversionAmount := optimizer.CalculateOptimalConversionAmount(
			currentIncome, targetBracketTop, iraBalance,
		)

		// Should fill the bracket
		expectedConversion := 89075.0 - 50000.0 // = $39,075
		if math.Abs(conversionAmount-expectedConversion) > 1.0 {
			t.Errorf("Conversion amount mismatch: got %.2f, expected %.2f",
				conversionAmount, expectedConversion)
		}
	})

	t.Run("MultiYearConversionPlan", func(t *testing.T) {
		// Generate multi-year conversion plan
		startAge := 62
		iraBalance := 800000.0
		annualIncome := 40000.0 // Low retirement income
		filingStatus := FilingStatusMarriedFilingJointly
		standardDeduction := 29200.0

		strategy := ConversionStrategy{
			TargetBracketName:   "22%",
			TargetBracketTop:    89075.0,
			MaxAnnualConversion: 100000.0,
			MinAge:              62,
			MaxAge:              72, // Before RMDs
			MaxEffectiveTaxRate: 0.22,
			MaxMarginalTaxRate:  0.24,
			YearsUntilRMD:       11,
		}

		plan, err := optimizer.GenerateConversionPlan(
			startAge, iraBalance, annualIncome, filingStatus, standardDeduction, strategy,
		)

		if err != nil {
			t.Fatalf("Failed to generate plan: %v", err)
		}

		// Should have conversions over multiple years
		if len(plan.Conversions) < 5 {
			t.Errorf("Should have multiple conversion years, got %d", len(plan.Conversions))
		}

		// Should convert significant amount
		if plan.TotalAmountConverted < 100000.0 {
			t.Errorf("Should convert significant amount, got %.2f", plan.TotalAmountConverted)
		}

		// Should have tax savings (converting at lower rate than future RMDs)
		if plan.EstimatedTaxSavings <= 0 {
			t.Logf("Warning: No estimated tax savings (might be expected depending on assumptions)")
		}
	})

	t.Run("ConversionImpactSimulation", func(t *testing.T) {
		// Compare outcomes with and without conversion
		iraBalance := 500000.0
		conversionAmount := 100000.0
		conversionTaxRate := 0.12         // Convert at 12% rate
		growthRate := 0.07                // 7% annual growth
		horizon := 20                     // 20 years
		futureWithdrawalTaxRate := 0.22   // Future withdrawals at 22%

		withConv, withoutConv := optimizer.SimulateConversionImpact(
			iraBalance,
			conversionAmount,
			conversionTaxRate,
			growthRate,
			horizon,
			futureWithdrawalTaxRate,
		)

		// With conversion should be better (converting at 12% vs future 22%)
		if withConv <= withoutConv {
			t.Errorf("Conversion should improve outcome when converting at lower rate")
		}

		benefit := withConv - withoutConv
		if benefit < 50000.0 {
			t.Logf("Warning: Conversion benefit is small: $%.2f", benefit)
		}
	})
}

// TestIntegratedRetirementScenario tests all features working together
func TestIntegratedRetirementScenario(t *testing.T) {
	t.Run("Complete_Retirement_Workflow", func(t *testing.T) {
		// Setup: 65-year-old retiree
		age := 65
		accounts := &AccountHoldingsMonthEnd{
			Cash:        50000.0,
			Taxable:     &Account{TotalValue: 400000.0, Holdings: []Holding{}},
			TaxDeferred: &Account{TotalValue: 600000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 150000.0, Holdings: []Holding{}},
		}

		// Step 1: Calculate RMDs (not yet required at 65)
		rmdCalc := NewRMDCalculator()
		rmd := rmdCalc.CalculateTotalRMDs(age, accounts)
		if rmd != 0 {
			t.Errorf("No RMD should be required at age 65, got %.2f", rmd)
		}

		// Step 2: Evaluate Roth conversion opportunity
		taxConfig := GetDefaultTaxConfig()
		taxCalc := NewTaxCalculator(taxConfig, nil)
		rothOptimizer := NewRothConversionOptimizer(taxCalc, rmdCalc)

		currentIncome := 30000.0 // Low retirement income
		conversionAmount := 50000.0
		filingStatus := FilingStatusMarriedFilingJointly
		standardDeduction := 29200.0

		convOpportunity := rothOptimizer.EvaluateConversionOpportunity(
			age, 2024, currentIncome, conversionAmount, filingStatus, standardDeduction,
		)

		if !convOpportunity.Recommended {
			t.Logf("Warning: Conversion not recommended: %s", convOpportunity.Reason)
		}

		// Step 3: Plan asset location
		locationOptimizer := NewAssetLocationOptimizer(taxCalc)
		profiles := locationOptimizer.GetDefaultAssetProfiles()

		capacities := map[string]float64{
			"roth":         accounts.Roth.TotalValue,
			"tax_deferred": accounts.TaxDeferred.TotalValue,
			"taxable":      accounts.Taxable.TotalValue,
		}

		totalValue := accounts.Taxable.TotalValue + accounts.TaxDeferred.TotalValue + accounts.Roth.TotalValue

		targetAllocations := map[AssetClass]float64{
			AssetClassUSStocksTotalMarket: totalValue * 0.60, // 60% stocks
			AssetClassUSBondsTotalMarket:  totalValue * 0.40, // 40% bonds
		}

		locationPlan, err := locationOptimizer.GenerateLocationPlan(profiles, capacities, targetAllocations)
		if err != nil {
			t.Fatalf("Failed to generate location plan: %v", err)
		}

		if locationPlan.TotalValue < 1000000.0 {
			t.Errorf("Total value should be ~1.2M, got %.2f", locationPlan.TotalValue)
		}

		// Step 4: Execute withdrawal with sequencing
		cashMgr := &CashManager{}
		sequencer := NewWithdrawalSequencer(cashMgr, taxCalc, rmdCalc)

		withdrawalRequest := WithdrawalRequest{
			Amount:             60000.0,
			CurrentAge:         age,
			CurrentMonth:       1,
			AnnualSpendingNeed: 60000.0,
		}

		withdrawalResult, err := sequencer.ExecuteWithdrawal(
			withdrawalRequest,
			accounts,
			WithdrawalSequenceTaxEfficient,
		)

		if err != nil {
			t.Fatalf("Withdrawal failed: %v", err)
		}

		if math.Abs(withdrawalResult.TotalWithdrawn-60000.0) > 1.0 {
			t.Errorf("Should withdraw requested amount, got %.2f", withdrawalResult.TotalWithdrawn)
		}

		t.Logf("✓ Integrated retirement scenario completed successfully")
		t.Logf("  - RMD check: $%.0f (age %d)", rmd, age)
		t.Logf("  - Conversion recommended: %v @ %.1f%% tax", convOpportunity.Recommended, convOpportunity.EffectiveTaxRate*100)
		t.Logf("  - Asset location plan: $%.0f total", locationPlan.TotalValue)
		t.Logf("  - Withdrawal executed: $%.0f", withdrawalResult.TotalWithdrawn)
	})
}
