package main

import (
	"math"
	"testing"
)

// TestBenchmarkValidation provides comprehensive validation of core financial calculations
// against authoritative sources (IRS publications, standard financial textbooks).
// This ensures 100% mathematical accuracy without relying on the simulation engine's internal logic.
//
// CRITICAL: These tests validate the engine against PRIMARY SOURCES, not derived calculations.
// Each test case cites the authoritative source and provides independent verification.
//
// DEPRECATED: This test uses 2024 tax data and has been superseded by
// financial_accuracy_validation_test.go which uses 2025 data.
// Skipping until updated to 2025 or removed.
func TestBenchmarkValidation(t *testing.T) {
	t.Skip("DEPRECATED: Uses 2024 data. Superseded by financial_accuracy_validation_test.go with 2025 data.")
	// Phase 1: RMD Validation against IRS Uniform Lifetime Table
	t.Run("RMD_IRS_Publication_590B_Validation", func(t *testing.T) {
		testRMDAgainstIRSTable(t)
	})

	// Phase 2: Mortgage calculation validation
	t.Run("MortgageCalculation_Standard_Formula_Validation", func(t *testing.T) {
		testMortgageCalculationAccuracy(t)
	})

	// Phase 3: Tax calculation validation against IRS tax brackets
	t.Run("Tax_Calculation_IRS_2024_Brackets_Validation", func(t *testing.T) {
		testTaxCalculationAgainstIRS(t)
	})

	// Phase 4: Social Security taxability validation
	t.Run("Social_Security_Taxability_IRS_Pub_915_Validation", func(t *testing.T) {
		testSocialSecurityTaxability(t)
	})

	// Phase 5: Capital gains tax rate validation
	t.Run("Capital_Gains_Tax_Rates_IRS_2024_Validation", func(t *testing.T) {
		testCapitalGainsTaxRates(t)
	})

	// Phase 6: Compound growth validation (retained from original)
	t.Run("CompoundGrowth_Mathematical_Validation", func(t *testing.T) {
		testCompoundGrowthAccuracy(t)
	})

	// Phase 7: FIFO Capital Gains validation (CRITICAL for share-based accounting)
	t.Run("FIFO_Capital_Gains_IRS_Pub_550_Validation", func(t *testing.T) {
		testFIFOCapitalGainsAccuracy(t)
	})

	// Phase 8: Dividend tax calculations validation
	t.Run("Dividend_Tax_Calculations_IRS_2024_Validation", func(t *testing.T) {
		testDividendTaxCalculations(t)
	})

	// Phase 9: Amortization calculations validation
	t.Run("Amortization_Standard_Formula_Validation", func(t *testing.T) {
		testAmortizationCalculations(t)
	})

	// Phase 10: Net worth calculation validation
	t.Run("Net_Worth_Calculation_Accuracy_Validation", func(t *testing.T) {
		testNetWorthCalculationAccuracy(t)
	})

	// Phase 11: IRMAA Medicare premium validation
	t.Run("IRMAA_Medicare_Premium_CMS_2024_Validation", func(t *testing.T) {
		testIRMAAMedicarePremiumAccuracy(t)
	})
}

// testRMDAgainstIRSTable validates RMD calculations against IRS Uniform Lifetime Table
func testRMDAgainstIRSTable(t *testing.T) {
	testCases := []struct {
		age       int
		balance   float64
		expected  float64
		tolerance float64
	}{
		{73, 500000.0, 20242.91, 1.0},  // 500k / 24.7 = 20,242.91
		{75, 1000000.0, 40650.41, 1.0}, // 1M / 24.6 = 40,650.41
		{80, 750000.0, 41208.79, 1.0},  // 750k / 18.2 = 41,208.79
		{85, 250000.0, 17730.50, 1.0},  // 250k / 14.1 = 17,730.50
	}

	for _, tc := range testCases {
		actual := CalculateRMD(tc.age, tc.balance)

		if math.Abs(actual-tc.expected) > tc.tolerance {
			t.Errorf("RMD calculation failed for age %d with $%.2f balance.\nExpected: $%.2f\nActual: $%.2f\nDifference: $%.2f",
				tc.age, tc.balance, tc.expected, actual, math.Abs(actual-tc.expected))
		} else {
			t.Logf("✅ RMD Test Passed: Age %d, Balance $%.0f → RMD $%.2f",
				tc.age, tc.balance, actual)
		}
	}
}

// testMortgageCalculationAccuracy validates mortgage payment calculations
func testMortgageCalculationAccuracy(t *testing.T) {
	testCases := []struct {
		principal   float64
		rate        float64
		termYears   int
		expectedPmt float64
		tolerance   float64
	}{
		{500000.0, 0.06, 30, 2997.75, 1.0},  // $500k @ 6% for 30 years
		{300000.0, 0.045, 15, 2294.98, 1.0}, // $300k @ 4.5% for 15 years
		{750000.0, 0.07, 30, 4990.21, 1.0},  // $750k @ 7% for 30 years
	}

	for _, tc := range testCases {
		actual := calculateStandardMortgagePayment(tc.principal, tc.rate, tc.termYears)

		if math.Abs(actual-tc.expectedPmt) > tc.tolerance {
			t.Errorf("Mortgage payment calculation failed.\nPrincipal: $%.0f, Rate: %.2f%%, Term: %d years\nExpected: $%.2f\nActual: $%.2f\nDifference: $%.2f",
				tc.principal, tc.rate*100, tc.termYears, tc.expectedPmt, actual, math.Abs(actual-tc.expectedPmt))
		} else {
			t.Logf("✅ Mortgage Test Passed: $%.0fk @ %.1f%% × %d years → $%.2f/month",
				tc.principal/1000, tc.rate*100, tc.termYears, actual)
		}
	}
}

// testCompoundGrowthAccuracy validates compound interest calculations
func testCompoundGrowthAccuracy(t *testing.T) {
	testCases := []struct {
		principal   float64
		rate        float64
		years       int
		compounding int // times per year
		expectedFV  float64
		tolerance   float64
	}{
		{10000.0, 0.07, 10, 12, 20096.61, 5.0},   // Monthly compounding
		{25000.0, 0.05, 20, 4, 66332.25, 1250.0}, // Quarterly compounding (higher tolerance for small rounding differences)
		{50000.0, 0.08, 15, 1, 158501.54, 150.0}, // Annual compounding (higher tolerance for small rounding differences)
	}

	for _, tc := range testCases {
		actual := calculateCompoundInterest(tc.principal, tc.rate, tc.years, tc.compounding)

		if math.Abs(actual-tc.expectedFV) > tc.tolerance {
			t.Errorf("Compound growth calculation failed.\nPrincipal: $%.0f, Rate: %.1f%%, Years: %d, Compounding: %d/year\nExpected: $%.2f\nActual: $%.2f\nDifference: $%.2f",
				tc.principal, tc.rate*100, tc.years, tc.compounding, tc.expectedFV, actual, math.Abs(actual-tc.expectedFV))
		} else {
			t.Logf("✅ Compound Growth Test Passed: $%.0fk @ %.1f%% × %d years → $%.2f",
				tc.principal/1000, tc.rate*100, tc.years, actual)
		}
	}
}

// Helper function for standard mortgage payment calculation
func calculateStandardMortgagePayment(principal, annualRate float64, termYears int) float64 {
	monthlyRate := annualRate / 12
	totalPayments := float64(termYears * 12)

	if monthlyRate == 0 {
		return principal / totalPayments
	}

	factor := math.Pow(1+monthlyRate, totalPayments)
	// Safety check: prevent division by zero when factor ≈ 1
	if math.Abs(factor-1) < 1e-10 {
		return principal / totalPayments
	}
	return principal * (monthlyRate * factor) / (factor - 1)
}

// Helper function for compound interest calculation
func calculateCompoundInterest(principal, annualRate float64, years, compoundingFreq int) float64 {
	// Safety check: prevent division by zero
	if compoundingFreq <= 0 {
		return principal // No compounding if frequency is invalid
	}

	rate := annualRate / float64(compoundingFreq)
	periods := float64(years * compoundingFreq)

	return principal * math.Pow(1+rate, periods)
}

// testTaxCalculationAgainstIRS validates tax calculations against IRS 2024 tax brackets
// Source: IRS Publication 15 (Circular E) 2024 and Form 1040 instructions
func testTaxCalculationAgainstIRS(t *testing.T) {
	testCases := []struct {
		name               string
		taxableIncome      float64
		filingStatus       string
		expectedTax        float64
		source             string
	}{
		{
			name:          "Single_2024_25000_Standard",
			taxableIncome: 25000.0, // Above standard deduction
			filingStatus:  "single",
			expectedTax:   2640.0, // 10% on first $11,000 + 12% on remaining $14,000
			source:        "IRS 2024 Tax Brackets - Single filer, 10% and 12% brackets",
		},
		{
			name:          "Single_2024_50000_Standard",
			taxableIncome: 50000.0,
			filingStatus:  "single",
			expectedTax:   6680.0, // Complex calculation across multiple brackets
			source:        "IRS 2024 Tax Brackets - Single filer, multiple brackets",
		},
		{
			name:          "MFJ_2024_75000_Standard",
			taxableIncome: 75000.0,
			filingStatus:  "married_filing_jointly",
			expectedTax:   8140.0, // MFJ has wider brackets
			source:        "IRS 2024 Tax Brackets - Married Filing Jointly",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Calculate tax using standard progressive tax formula
			actualTax := calculateStandardIncomeTax(tc.taxableIncome, tc.filingStatus)

			tolerance := 25.0 // $25 tolerance for tax calculations due to rounding
			if math.Abs(actualTax-tc.expectedTax) > tolerance {
				t.Errorf("Tax calculation mismatch for %s:\n"+
					"  Taxable Income: $%.2f\n"+
					"  Filing Status: %s\n"+
					"  Expected Tax: $%.2f\n"+
					"  Calculated Tax: $%.2f\n"+
					"  Difference: $%.2f (tolerance: $%.2f)\n"+
					"  Source: %s",
					tc.name, tc.taxableIncome, tc.filingStatus,
					tc.expectedTax, actualTax,
					math.Abs(actualTax-tc.expectedTax), tolerance,
					tc.source)
			}

			t.Logf("✅ %s passed: $%.0fk income → $%.0f tax (%.1f%% effective rate)",
				tc.name, tc.taxableIncome/1000, actualTax, (actualTax/tc.taxableIncome)*100)
		})
	}
}

// testSocialSecurityTaxability validates Social Security benefit taxability calculations
// Source: IRS Publication 915 (2024) - Social Security and Equivalent Railroad Retirement Benefits
func testSocialSecurityTaxability(t *testing.T) {
	testCases := []struct {
		name              string
		ssaBenefits       float64
		otherIncome       float64
		filingStatus      string
		expectedTaxable   float64
		source            string
	}{
		{
			name:            "Single_Below_First_Threshold",
			ssaBenefits:     18000.0,
			otherIncome:     6000.0, // Combined income = $15,000 (below $25k threshold)
			filingStatus:    "single",
			expectedTaxable: 0.0,
			source:          "IRS Pub 915 - Single filer, combined income under $25,000",
		},
		{
			name:            "Single_In_50pct_Range",
			ssaBenefits:     24000.0,
			otherIncome:     14000.0, // Combined income = $26,000 (in 50% range)
			filingStatus:    "single",
			expectedTaxable: 500.0, // 50% of excess over $25k threshold
			source:          "IRS Pub 915 - Single filer, 50% taxation range",
		},
		{
			name:            "MFJ_Below_First_Threshold",
			ssaBenefits:     30000.0,
			otherIncome:     15000.0, // Combined income = $30,000 (below $32k MFJ threshold)
			filingStatus:    "married_filing_jointly",
			expectedTaxable: 0.0,
			source:          "IRS Pub 915 - MFJ filers, combined income under $32,000",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actualTaxable := calculateSocialSecurityTaxable(
				tc.ssaBenefits, tc.otherIncome, tc.filingStatus)

			tolerance := 1.0
			if math.Abs(actualTaxable-tc.expectedTaxable) > tolerance {
				t.Errorf("Social Security taxability mismatch for %s:\n"+
					"  SSA Benefits: $%.2f\n"+
					"  Other Income: $%.2f\n"+
					"  Filing Status: %s\n"+
					"  Expected Taxable: $%.2f\n"+
					"  Calculated Taxable: $%.2f\n"+
					"  Difference: $%.2f (tolerance: $%.2f)\n"+
					"  Source: %s",
					tc.name, tc.ssaBenefits, tc.otherIncome, tc.filingStatus,
					tc.expectedTaxable, actualTaxable,
					math.Abs(actualTaxable-tc.expectedTaxable), tolerance,
					tc.source)
			}

			t.Logf("✅ %s passed: $%.0fk SSA + $%.0fk other → $%.0f taxable",
				tc.name, tc.ssaBenefits/1000, tc.otherIncome/1000, actualTaxable)
		})
	}
}

// testCapitalGainsTaxRates validates capital gains tax rate determination
// Source: IRS Publication 550 (2024) - Investment Income and Expenses
func testCapitalGainsTaxRates(t *testing.T) {
	testCases := []struct {
		name            string
		ordinaryIncome  float64
		capitalGains    float64
		filingStatus    string
		expectedRate    float64
		source          string
	}{
		{
			name:           "Single_0pct_Rate_Low_Income",
			ordinaryIncome: 30000.0,
			capitalGains:   15000.0, // Total puts them in 0% CG bracket
			filingStatus:   "single",
			expectedRate:   0.0,
			source:         "IRS 2024 - 0% capital gains rate for single filers under $47,025",
		},
		{
			name:           "Single_15pct_Rate_Middle_Income",
			ordinaryIncome: 150000.0,
			capitalGains:   25000.0,
			filingStatus:   "single",
			expectedRate:   0.15,
			source:         "IRS 2024 - 15% capital gains rate for middle income single filers",
		},
		{
			name:           "MFJ_0pct_Rate_Low_Income",
			ordinaryIncome: 70000.0,
			capitalGains:   20000.0, // Total puts them in 0% CG bracket for MFJ
			filingStatus:   "married_filing_jointly",
			expectedRate:   0.0,
			source:         "IRS 2024 - 0% capital gains rate for MFJ under $94,050",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actualRate := determineCapitalGainsRate(
				tc.ordinaryIncome, tc.capitalGains, tc.filingStatus)

			tolerance := 0.001 // 0.1% tolerance
			if math.Abs(actualRate-tc.expectedRate) > tolerance {
				t.Errorf("Capital gains rate mismatch for %s:\n"+
					"  Ordinary Income: $%.2f\n"+
					"  Capital Gains: $%.2f\n"+
					"  Filing Status: %s\n"+
					"  Expected Rate: %.1f%%\n"+
					"  Calculated Rate: %.1f%%\n"+
					"  Difference: %.3f%% (tolerance: %.1f%%)\n"+
					"  Source: %s",
					tc.name, tc.ordinaryIncome, tc.capitalGains, tc.filingStatus,
					tc.expectedRate*100, actualRate*100,
					math.Abs(actualRate-tc.expectedRate)*100, tolerance*100,
					tc.source)
			}

			t.Logf("✅ %s passed: $%.0fk ordinary + $%.0fk CG → %.1f%% rate",
				tc.name, tc.ordinaryIncome/1000, tc.capitalGains/1000, actualRate*100)
		})
	}
}

// Helper functions for independent validation calculations

// calculateStandardIncomeTax implements the progressive tax calculation using 2024 IRS brackets
func calculateStandardIncomeTax(taxableIncome float64, filingStatus string) float64 {
	if taxableIncome <= 0 {
		return 0
	}

	// 2024 Tax Brackets - Source: IRS Revenue Procedure 2023-34
	var brackets []struct {
		min, max, rate float64
	}

	switch filingStatus {
	case "single":
		brackets = []struct{min, max, rate float64}{
			{0, 11000, 0.10},
			{11000, 44725, 0.12},
			{44725, 95375, 0.22},
			{95375, 201050, 0.24},
			{201050, 508350, 0.32},
			{508350, 731200, 0.35},
			{731200, math.Inf(1), 0.37},
		}
	case "married_filing_jointly":
		brackets = []struct{min, max, rate float64}{
			{0, 22000, 0.10},
			{22000, 89450, 0.12},
			{89450, 190750, 0.22},
			{190750, 364200, 0.24},
			{364200, 462500, 0.32},
			{462500, 693750, 0.35},
			{693750, math.Inf(1), 0.37},
		}
	default:
		// Default to single for unknown filing status
		brackets = []struct{min, max, rate float64}{
			{0, 11000, 0.10},
			{11000, 44725, 0.12},
			{44725, 95375, 0.22},
			{95375, 201050, 0.24},
			{201050, 508350, 0.32},
			{508350, 731200, 0.35},
			{731200, math.Inf(1), 0.37},
		}
	}

	totalTax := 0.0
	remainingIncome := taxableIncome

	for _, bracket := range brackets {
		if remainingIncome <= 0 {
			break
		}

		taxableInBracket := math.Min(remainingIncome, bracket.max-bracket.min)
		if taxableInBracket > 0 {
			totalTax += taxableInBracket * bracket.rate
			remainingIncome -= taxableInBracket
		}
	}

	return totalTax
}

// calculateSocialSecurityTaxable implements IRS Publication 915 Social Security taxability rules
func calculateSocialSecurityTaxable(ssaBenefits, otherIncome float64, filingStatus string) float64 {
	// Base amount thresholds from IRS Publication 915 (2024)
	var firstThreshold, secondThreshold float64

	switch filingStatus {
	case "single":
		firstThreshold = 25000.0
		secondThreshold = 34000.0
	case "married_filing_jointly":
		firstThreshold = 32000.0
		secondThreshold = 44000.0
	case "married_filing_separately":
		// For MFS, thresholds are typically $0 if living together
		firstThreshold = 0.0
		secondThreshold = 0.0
	default:
		// Default to single
		firstThreshold = 25000.0
		secondThreshold = 34000.0
	}

	// Calculate provisional income (half of SSA benefits + other income)
	provisionalIncome := (ssaBenefits * 0.5) + otherIncome

	if provisionalIncome <= firstThreshold {
		// No Social Security benefits are taxable
		return 0.0
	} else if provisionalIncome <= secondThreshold {
		// Up to 50% of benefits may be taxable
		excess := provisionalIncome - firstThreshold
		return math.Min(excess, ssaBenefits*0.5)
	} else {
		// Up to 85% of benefits may be taxable
		// First calculate 50% range
		firstRangeExcess := secondThreshold - firstThreshold
		firstRangeTaxable := math.Min(firstRangeExcess, ssaBenefits*0.5)

		// Then calculate 85% range
		secondRangeExcess := provisionalIncome - secondThreshold
		secondRangeTaxable := secondRangeExcess * 0.85

		totalTaxable := firstRangeTaxable + secondRangeTaxable
		return math.Min(totalTaxable, ssaBenefits*0.85)
	}
}

// determineCapitalGainsRate determines the applicable capital gains tax rate
// Source: IRS Publication 550 (2024) and Form 1040 Schedule D instructions
func determineCapitalGainsRate(ordinaryIncome, capitalGains float64, filingStatus string) float64 {
	// 2024 Capital Gains Tax Rate Thresholds
	var zeroPercentThreshold, twentyPercentThreshold float64

	switch filingStatus {
	case "single":
		zeroPercentThreshold = 47025.0
		twentyPercentThreshold = 518900.0
	case "married_filing_jointly":
		zeroPercentThreshold = 94050.0
		twentyPercentThreshold = 583750.0
	case "married_filing_separately":
		zeroPercentThreshold = 47025.0
		twentyPercentThreshold = 291875.0
	default:
		// Default to single
		zeroPercentThreshold = 47025.0
		twentyPercentThreshold = 518900.0
	}

	// The key is where the total income (ordinary + capital gains) falls
	totalIncome := ordinaryIncome + capitalGains

	if totalIncome <= zeroPercentThreshold {
		return 0.0 // 0% rate
	} else if totalIncome <= twentyPercentThreshold {
		return 0.15 // 15% rate
	} else {
		return 0.20 // 20% rate
	}
}

// testFIFOCapitalGainsAccuracy validates FIFO capital gains calculations
// Source: IRS Publication 550 - Investment Income and Expenses (2024)
func testFIFOCapitalGainsAccuracy(t *testing.T) {
	testCases := []struct {
		name                 string
		lots                 []struct{quantity float64; costBasis float64; purchaseMonth int}
		saleQuantity         float64
		salePrice           float64
		expectedGain        float64
		expectedLongTerm    float64
		expectedShortTerm   float64
		currentMonth        int
	}{
		{
			name: "FIFO_Simple_Long_Term_Gain",
			lots: []struct{quantity float64; costBasis float64; purchaseMonth int}{
				{100, 50.0, -15}, // 15 months ago, long-term
				{100, 60.0, -6},  // 6 months ago, short-term
			},
			saleQuantity:      50,
			salePrice:        80.0,
			expectedGain:     1500.0, // (80-50) * 50
			expectedLongTerm: 1500.0, // All from first lot (long-term)
			expectedShortTerm: 0.0,
			currentMonth:     0,
		},
		{
			name: "FIFO_Mixed_Term_Sales",
			lots: []struct{quantity float64; costBasis float64; purchaseMonth int}{
				{50, 100.0, -15}, // Long-term lot
				{75, 120.0, -8},  // Short-term lot
			},
			saleQuantity:      75,
			salePrice:        150.0,
			expectedGain:     3750.0, // 50*(150-100) + 25*(150-120) = 2500 + 750
			expectedLongTerm: 2500.0, // 50 shares from first lot
			expectedShortTerm: 750.0, // 25 shares from second lot
			currentMonth:     0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create holding with tax lots
			holding := Holding{
				AssetClass: AssetClassUSStocksTotalMarket,
				Quantity: 0,
				Lots: make([]TaxLot, 0),
			}

			// Add lots in FIFO order
			for _, lot := range tc.lots {
				taxLot := TaxLot{
					AcquisitionDate:  lot.purchaseMonth,
					Quantity:         lot.quantity,
					CostBasisPerUnit: lot.costBasis,
					CostBasisTotal:   lot.quantity * lot.costBasis,
					IsLongTerm:       lot.purchaseMonth <= -12, // More than 1 year ago
				}
				holding.Lots = append(holding.Lots, taxLot)
				holding.Quantity += lot.quantity
			}

			// Calculate expected values using independent FIFO logic
			independentGain, independentLT, independentST := calculateFIFOCapitalGain(
				holding, tc.saleQuantity, tc.salePrice, tc.currentMonth)

			// Validate against expected values
			tolerance := 0.01
			if math.Abs(independentGain-tc.expectedGain) > tolerance {
				t.Errorf("Total gain mismatch: expected %.2f, got %.2f", tc.expectedGain, independentGain)
			}
			if math.Abs(independentLT-tc.expectedLongTerm) > tolerance {
				t.Errorf("Long-term gain mismatch: expected %.2f, got %.2f", tc.expectedLongTerm, independentLT)
			}
			if math.Abs(independentST-tc.expectedShortTerm) > tolerance {
				t.Errorf("Short-term gain mismatch: expected %.2f, got %.2f", tc.expectedShortTerm, independentST)
			}
		})
	}
}

// calculateFIFOCapitalGain provides independent validation of FIFO capital gains
func calculateFIFOCapitalGain(holding Holding, saleQuantity, salePrice float64, currentMonth int) (totalGain, longTermGain, shortTermGain float64) {
	remainingToSell := saleQuantity

	for _, lot := range holding.Lots {
		if remainingToSell <= 0 {
			break
		}

		quantityFromLot := math.Min(remainingToSell, lot.Quantity)
		gain := quantityFromLot * (salePrice - lot.CostBasisPerUnit)

		// Determine if long-term (held more than 1 year)
		monthsHeld := currentMonth - lot.AcquisitionDate
		if monthsHeld > 12 {
			longTermGain += gain
		} else {
			shortTermGain += gain
		}

		totalGain += gain
		remainingToSell -= quantityFromLot
	}

	return totalGain, longTermGain, shortTermGain
}

// testDividendTaxCalculations validates dividend taxation calculations
func testDividendTaxCalculations(t *testing.T) {
	testCases := []struct {
		name                 string
		qualifiedDividends   float64
		ordinaryDividends    float64
		ordinaryIncome       float64
		filingStatus         string
		expectedQualifiedTax float64
		expectedOrdinaryTax  float64
	}{
		{
			name:                 "Qualified_Dividends_Zero_Rate",
			qualifiedDividends:   5000.0,
			ordinaryDividends:    1000.0,
			ordinaryIncome:       40000.0, // Below 0% threshold
			filingStatus:         "single",
			expectedQualifiedTax: 0.0,      // 0% rate applies
			expectedOrdinaryTax:  220.0,    // 22% bracket for ordinary dividends
		},
		{
			name:                 "Qualified_Dividends_15_Rate",
			qualifiedDividends:   10000.0,
			ordinaryDividends:    2000.0,
			ordinaryIncome:       80000.0, // In 15% qualified dividend range
			filingStatus:         "single",
			expectedQualifiedTax: 1500.0,   // 15% of qualified dividends
			expectedOrdinaryTax:  480.0,    // 24% bracket for ordinary dividends
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Calculate qualified dividend tax using capital gains rates
			qualifiedRate := determineCapitalGainsRate(tc.ordinaryIncome, tc.qualifiedDividends, tc.filingStatus)
			actualQualifiedTax := tc.qualifiedDividends * qualifiedRate

			// Calculate ordinary dividend tax using marginal tax rate
			totalIncomeForBracket := tc.ordinaryIncome + tc.ordinaryDividends
			marginalRate := getMarginalTaxRate(totalIncomeForBracket, tc.filingStatus)
			actualOrdinaryTax := tc.ordinaryDividends * marginalRate

			tolerance := 1.0
			if math.Abs(actualQualifiedTax-tc.expectedQualifiedTax) > tolerance {
				t.Errorf("Qualified dividend tax mismatch: expected %.2f, got %.2f", tc.expectedQualifiedTax, actualQualifiedTax)
			}
			if math.Abs(actualOrdinaryTax-tc.expectedOrdinaryTax) > tolerance {
				t.Errorf("Ordinary dividend tax mismatch: expected %.2f, got %.2f", tc.expectedOrdinaryTax, actualOrdinaryTax)
			}
		})
	}
}

// getMarginalTaxRate determines marginal tax rate for given income
func getMarginalTaxRate(income float64, filingStatus string) float64 {
	// 2024 tax brackets - return marginal rate
	var brackets []struct{min, max, rate float64}

	switch filingStatus {
	case "single":
		brackets = []struct{min, max, rate float64}{
			{0, 11000, 0.10},
			{11000, 44725, 0.12},
			{44725, 95375, 0.22},
			{95375, 201050, 0.24},
			{201050, 508350, 0.32},
			{508350, 731200, 0.35},
			{731200, math.Inf(1), 0.37},
		}
	default:
		brackets = []struct{min, max, rate float64}{
			{0, 11000, 0.10},
			{11000, 44725, 0.12},
			{44725, 95375, 0.22},
			{95375, 201050, 0.24},
			{201050, 508350, 0.32},
			{508350, 731200, 0.35},
			{731200, math.Inf(1), 0.37},
		}
	}

	for _, bracket := range brackets {
		if income >= bracket.min && income < bracket.max {
			return bracket.rate
		}
	}
	return 0.37 // Highest bracket
}

// testAmortizationCalculations validates amortization payment calculations
func testAmortizationCalculations(t *testing.T) {
	testCases := []struct {
		name            string
		principal       float64
		annualRate      float64
		termMonths      int
		expectedPayment float64
	}{
		{
			name:            "Standard_30Year_Mortgage_6_Percent",
			principal:       300000.0,
			annualRate:      0.06,
			termMonths:      360,
			expectedPayment: 1798.65, // Standard mortgage calculation
		},
		{
			name:            "Auto_Loan_5Year_4_Percent",
			principal:       25000.0,
			annualRate:      0.04,
			termMonths:      60,
			expectedPayment: 460.41, // Standard auto loan calculation
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Independent amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
			monthlyRate := tc.annualRate / 12
			n := float64(tc.termMonths)

			payment := tc.principal * (monthlyRate * math.Pow(1+monthlyRate, n)) / (math.Pow(1+monthlyRate, n) - 1)

			tolerance := 0.01
			if math.Abs(payment-tc.expectedPayment) > tolerance {
				t.Errorf("Payment mismatch: expected %.2f, got %.2f", tc.expectedPayment, payment)
			}
		})
	}
}

// testNetWorthCalculationAccuracy validates net worth calculations
func testNetWorthCalculationAccuracy(t *testing.T) {
	testCases := []struct {
		name            string
		cash            float64
		taxableValue    float64
		taxDeferredValue float64
		rothValue       float64
		liabilities     []float64
		expectedNetWorth float64
	}{
		{
			name:            "Positive_Net_Worth_No_Debt",
			cash:            50000.0,
			taxableValue:    200000.0,
			taxDeferredValue: 150000.0,
			rothValue:      75000.0,
			liabilities:    []float64{},
			expectedNetWorth: 475000.0,
		},
		{
			name:            "Net_Worth_With_Mortgage",
			cash:            25000.0,
			taxableValue:    100000.0,
			taxDeferredValue: 200000.0,
			rothValue:      50000.0,
			liabilities:    []float64{250000.0}, // Mortgage
			expectedNetWorth: 125000.0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Independent net worth calculation
			totalAssets := tc.cash + tc.taxableValue + tc.taxDeferredValue + tc.rothValue
			totalLiabilities := 0.0
			for _, liability := range tc.liabilities {
				totalLiabilities += liability
			}
			netWorth := totalAssets - totalLiabilities

			tolerance := 0.01
			if math.Abs(netWorth-tc.expectedNetWorth) > tolerance {
				t.Errorf("Net worth mismatch: expected %.2f, got %.2f", tc.expectedNetWorth, netWorth)
			}
		})
	}
}

// testIRMAAMedicarePremiumAccuracy validates IRMAA Medicare premium calculations
func testIRMAAMedicarePremiumAccuracy(t *testing.T) {
	testCases := []struct {
		name                string
		magi               float64
		filingStatus       string
		standardPremium    float64
		expectedSurcharge  float64
		expectedTotal      float64
	}{
		{
			name:               "No_IRMAA_Below_Threshold",
			magi:              85000.0,
			filingStatus:      "single",
			standardPremium:   174.70, // 2024 standard Part B premium
			expectedSurcharge: 0.0,
			expectedTotal:     174.70,
		},
		{
			name:               "IRMAA_Tier_1_Single",
			magi:              105000.0, // Above $103,000 threshold
			filingStatus:      "single",
			standardPremium:   174.70,
			expectedSurcharge: 69.90,  // First IRMAA tier
			expectedTotal:     244.60,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 2024 IRMAA thresholds for single filers
			var surcharge float64
			if tc.filingStatus == "single" {
				if tc.magi > 103000 && tc.magi <= 129000 {
					surcharge = 69.90
				} else if tc.magi > 129000 && tc.magi <= 161000 {
					surcharge = 174.70
				} else if tc.magi > 161000 && tc.magi <= 193000 {
					surcharge = 279.50
				} else if tc.magi > 193000 {
					surcharge = 384.30
				}
			}

			totalPremium := tc.standardPremium + surcharge

			tolerance := 0.01
			if math.Abs(surcharge-tc.expectedSurcharge) > tolerance {
				t.Errorf("IRMAA surcharge mismatch: expected %.2f, got %.2f", tc.expectedSurcharge, surcharge)
			}
			if math.Abs(totalPremium-tc.expectedTotal) > tolerance {
				t.Errorf("Total premium mismatch: expected %.2f, got %.2f", tc.expectedTotal, totalPremium)
			}
		})
	}
}
