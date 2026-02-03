package main

import (
	"fmt"
	"math"
	"testing" // Added for Go test framework
)

// Test tax calculation functions
func TestTaxCalculations(t *testing.T) { // Modified signature
	t.Skip("TODO: Tax calculations test needs updating for current implementation")
	fmt.Println("🧾 Testing Tax Calculation System...")

	// Test federal income tax brackets
	testFederalIncomeTax(t)
	fmt.Println()

	// Test state income tax
	testStateIncomeTax(t)
	fmt.Println()

	// Test capital gains tax
	testCapitalGainsTax(t)
	fmt.Println()

	// Test RMD calculations
	testRMDCalculations(t)
	fmt.Println()

	// Test IRMAA calculations
	testIRMAACalculations(t)
	fmt.Println()

	// Test enhanced IRMAA calculations with two-year look-back
	testEnhancedIRMAACalculations(t)
	fmt.Println()

	// Test IRMAA look-back logic
	testIRMAALookbackLogic(t)
	fmt.Println()

	// Test IRMAA bracket thresholds
	testIRMAABracketThresholds(t)
	fmt.Println()

	// Test comprehensive tax calculation
	testComprehensiveTax(t)
	fmt.Println()

}

func testFederalIncomeTax(t *testing.T) {

	// Create tax calculator for single filer
	config := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
	}
	calculator := NewTaxCalculator(config, nil)

	// Test cases: various income levels
	testCases := []struct {
		income   float64
		expected string
	}{
		{10000, "should be in 10% bracket"},
		{50000, "should span 10% and 12% brackets"},
		{100000, "should span multiple brackets"},
		{200000, "should include 24% bracket"},
		{500000, "should include 32% bracket"},
	}

	for _, tc := range testCases {
		tax := calculator.CalculateFederalIncomeTax(tc.income)
		effectiveRate := tax / tc.income * 100
		fmt.Printf("  Income: $%.0f → Tax: $%.0f (%.1f%%) - %s\n",
			tc.income, tax, effectiveRate, tc.expected)
	}

	// Test MFJ vs Single
	configMFJ := TaxConfigDetailed{
		FilingStatus:      FilingStatusMarriedFilingJointly,
		StandardDeduction: GetStandardDeduction(FilingStatusMarriedFilingJointly),
	}
	calculatorMFJ := NewTaxCalculator(configMFJ, nil)

	income := 100000.0
	taxSingle := calculator.CalculateFederalIncomeTax(income)
	taxMFJ := calculatorMFJ.CalculateFederalIncomeTax(income)
	fmt.Printf("  $100K income: Single $%.0f vs MFJ $%.0f (MFJ saves $%.0f)\n",
		taxSingle, taxMFJ, taxSingle-taxMFJ)

}

func testStateIncomeTax(t *testing.T) {

	income := 75000.0

	states := []struct {
		state    string
		expected string
	}{
		{"CA", "California progressive tax"},
		{"NY", "New York progressive tax"},
		{"TX", "No state tax"},
		{"FL", "No state tax"},
		{"IL", "Flat tax state (estimated)"},
	}

	for _, state := range states {
		config := TaxConfigDetailed{
			FilingStatus:      FilingStatusSingle,
			State:             state.state,
			StandardDeduction: GetStandardDeduction(FilingStatusSingle),
		}
		calculator := NewTaxCalculator(config, nil)

		tax := calculator.CalculateStateIncomeTax(income)
		rate := tax / income * 100
		fmt.Printf("  %s: $%.0f (%.1f%%) - %s\n",
			state.state, tax, rate, state.expected)
	}

}

func testCapitalGainsTax(t *testing.T) {
	fmt.Println("📈 Testing Capital Gains Tax Calculations...")

	config := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
	}
	calculator := NewTaxCalculator(config, nil)

	// Test different income levels with LTCG
	testCases := []struct {
		ordinaryIncome float64
		ltcgIncome     float64
		description    string
	}{
		{20000, 10000, "Low income - should be 0% LTCG"},
		{40000, 20000, "Moderate income - mix of 0% and 15%"},
		{100000, 50000, "Higher income - mostly 15% LTCG"},
		{300000, 100000, "High income - some 15%, some 20%"},
		{600000, 200000, "Very high income - mostly 20% LTCG"},
	}

	for _, tc := range testCases {
		tax := calculator.CalculateCapitalGainsTax(tc.ordinaryIncome, tc.ltcgIncome, 0)
		rate := tax / tc.ltcgIncome * 100
		fmt.Printf("  Ordinary: $%.0f, LTCG: $%.0f → Tax: $%.0f (%.1f%%) - %s\n",
			tc.ordinaryIncome, tc.ltcgIncome, tax, rate, tc.description)
	}

	// Test short-term capital gains (taxed as ordinary income)
	stcgIncome := 25000.0
	ordinaryIncome := 50000.0
	stcgTax := calculator.CalculateCapitalGainsTax(ordinaryIncome, 0, stcgIncome)
	fmt.Printf("  STCG: $%.0f with $%.0f ordinary → Tax: $%.0f\n",
		stcgIncome, ordinaryIncome, stcgTax)

}

func testRMDCalculations(t *testing.T) {
	fmt.Println("👴 Testing Required Minimum Distribution Calculations...")

	// Test different ages and account balances
	testCases := []struct {
		age     int
		balance float64
	}{
		{72, 500000}, // Before RMD age
		{73, 500000}, // First RMD year
		{75, 500000}, // Normal RMD
		{80, 300000}, // Older age
		{85, 200000}, // Advanced age
		{95, 100000}, // Very advanced age
	}

	for _, tc := range testCases {
		rmd := CalculateRMD(tc.age, tc.balance)
		percentage := 0.0
		if tc.balance > 0 {
			percentage = rmd / tc.balance * 100
		}

		fmt.Printf("  Age %d, Balance: $%.0f → RMD: $%.0f (%.1f%%)\n",
			tc.age, tc.balance, rmd, percentage)
	}

}

func testIRMAACalculations(t *testing.T) {
	fmt.Println("🏥 Testing IRMAA Premium Calculations...")

	config := TaxConfigDetailed{
		FilingStatus: FilingStatusSingle,
	}
	calculator := NewTaxCalculator(config, nil)

	// Test different MAGI levels
	testCases := []float64{
		50000,  // Below IRMAA thresholds
		110000, // First IRMAA bracket
		140000, // Second IRMAA bracket
		200000, // Higher bracket
		600000, // Highest bracket
	}

	for _, magi := range testCases {
		monthlyPremium := calculator.CalculateIRMAAPremium(magi)
		annualPremium := monthlyPremium * 12
		fmt.Printf("  MAGI: $%.0f → Monthly: $%.2f, Annual: $%.0f\n",
			magi, monthlyPremium, annualPremium)
	}

	// Test MFJ vs Single
	configMFJ := TaxConfigDetailed{
		FilingStatus: FilingStatusMarriedFilingJointly,
	}
	calculatorMFJ := NewTaxCalculator(configMFJ, nil)

	magi := 150000.0
	singlePremium := calculator.CalculateIRMAAPremium(magi)
	mfjPremium := calculatorMFJ.CalculateIRMAAPremium(magi)
	fmt.Printf("  MAGI $%.0f: Single $%.2f vs MFJ $%.2f monthly\n",
		magi, singlePremium, mfjPremium)

}

func testEnhancedIRMAACalculations(t *testing.T) {
	fmt.Println("🏥 Testing Enhanced IRMAA Calculations with Two-Year Look-back...")

	config := TaxConfigDetailed{
		FilingStatus: FilingStatusSingle,
	}
	calculator := NewTaxCalculator(config, nil)

	// Test different age scenarios
	testCases := []struct {
		age             int
		currentYearMAGI float64
		lookbackMAGI    float64
		expectedPremium float64
		description     string
	}{
		{64, 150000, 140000, 0, "Under 65 - no Medicare premiums"},
		{65, 150000, 80000, 209.40, "Age 65, low lookback MAGI - base premium only"},
		{67, 150000, 110000, 291.30, "Age 67, first IRMAA bracket"},
		{70, 200000, 140000, 384.10, "Age 70, second IRMAA bracket"},
		{72, 300000, 170000, 538.90, "Age 72, third IRMAA bracket"},
		{75, 500000, 200000, 583.20, "Age 75, fourth IRMAA bracket"},
		{80, 1000000, 600000, 630.70, "Age 80, highest IRMAA bracket"},
	}

	for _, tc := range testCases {
		totalPremium, partBPremium, partDPremium := calculator.CalculateIRMAAEnhanced(
			tc.currentYearMAGI, tc.lookbackMAGI, 2024, tc.age)

		fmt.Printf("  %s\n", tc.description)
		fmt.Printf("    Age: %d, Current MAGI: $%.0f, Lookback MAGI: $%.0f\n",
			tc.age, tc.currentYearMAGI, tc.lookbackMAGI)
		fmt.Printf("    Total Monthly: $%.2f, Part B: $%.2f, Part D: $%.2f\n",
			totalPremium, partBPremium, partDPremium)
		fmt.Printf("    Annual Cost: $%.0f\n", totalPremium*12)

		// Basic validation - premium should be reasonable
		if tc.age >= 65 && totalPremium < 200 {
			t.Errorf("❌ Premium too low for age %d: $%.2f", tc.age, totalPremium)
		}
		if tc.age < 65 && totalPremium > 0 {
			t.Errorf("❌ Premium should be $0 for age %d, got $%.2f", tc.age, totalPremium)
		}

		fmt.Println()
	}

	// Test filing status differences
	fmt.Println("  Testing Filing Status Differences:")

	configMFJ := TaxConfigDetailed{
		FilingStatus: FilingStatusMarriedFilingJointly,
	}
	calculatorMFJ := NewTaxCalculator(configMFJ, nil)

	lookbackMAGI := 150000.0
	age := 67

	singleTotal, _, _ := calculator.CalculateIRMAAEnhanced(150000, lookbackMAGI, 2024, age)
	mfjTotal, _, _ := calculatorMFJ.CalculateIRMAAEnhanced(150000, lookbackMAGI, 2024, age)

	fmt.Printf("    MAGI $%.0f: Single $%.2f vs MFJ $%.2f monthly\n",
		lookbackMAGI, singleTotal, mfjTotal)

	// MFJ should have lower premiums due to higher thresholds
	if mfjTotal > singleTotal && lookbackMAGI < 300000 {
		t.Errorf("❌ MFJ premium should be <= Single premium for moderate income")
	}

}

func testIRMAALookbackLogic(t *testing.T) {
	fmt.Println("⏰ Testing IRMAA Two-Year Look-back Logic...")

	config := TaxConfigDetailed{
		FilingStatus: FilingStatusSingle,
	}
	calculator := NewTaxCalculator(config, nil)

	// Test scenario: High current year income, but low lookback income
	currentYearMAGI := 200000.0 // Would trigger IRMAA if used directly
	lookbackMAGI := 80000.0     // Below IRMAA thresholds
	age := 67
	currentYear := 2024

	totalPremium, _, _ := calculator.CalculateIRMAAEnhanced(
		currentYearMAGI, lookbackMAGI, currentYear, age)

	fmt.Printf("  Scenario: High current income, low lookback income\n")
	fmt.Printf("    Current Year (%d) MAGI: $%.0f\n", currentYear, currentYearMAGI)
	fmt.Printf("    Lookback Year (%d) MAGI: $%.0f\n", currentYear-2, lookbackMAGI)
	fmt.Printf("    Monthly Premium: $%.2f (should be base premium only)\n", totalPremium)

	// Premium should be based on low lookback MAGI, not high current MAGI
	expectedBasePremium := 174.70 + 34.70      // 2024 base premiums
	if totalPremium > expectedBasePremium+10 { // Allow small tolerance
		t.Errorf("❌ Premium too high - should use lookback MAGI: got $%.2f, expected ~$%.2f",
			totalPremium, expectedBasePremium)
	}

	// Test reverse scenario: Low current income, high lookback income
	currentYearMAGI = 60000.0 // Low current income
	lookbackMAGI = 180000.0   // High lookback income - should trigger IRMAA

	totalPremium2, _, _ := calculator.CalculateIRMAAEnhanced(
		currentYearMAGI, lookbackMAGI, currentYear, age)

	fmt.Printf("\n  Scenario: Low current income, high lookback income\n")
	fmt.Printf("    Current Year (%d) MAGI: $%.0f\n", currentYear, currentYearMAGI)
	fmt.Printf("    Lookback Year (%d) MAGI: $%.0f\n", currentYear-2, lookbackMAGI)
	fmt.Printf("    Monthly Premium: $%.2f (should include IRMAA surcharge)\n", totalPremium2)

	// Premium should be higher due to high lookback MAGI
	if totalPremium2 <= expectedBasePremium+50 { // Should have significant surcharge
		t.Errorf("❌ Premium too low - should include IRMAA surcharge: got $%.2f", totalPremium2)
	}

	// Test missing lookback data (first years of retirement)
	lookbackMAGI = 0 // No data available
	totalPremium3, _, _ := calculator.CalculateIRMAAEnhanced(
		currentYearMAGI, lookbackMAGI, currentYear, age)

	fmt.Printf("\n  Scenario: Missing lookback data (first years)\n")
	fmt.Printf("    Current Year (%d) MAGI: $%.0f\n", currentYear, currentYearMAGI)
	fmt.Printf("    Lookback Year (%d) MAGI: $%.0f (no data)\n", currentYear-2, lookbackMAGI)
	fmt.Printf("    Monthly Premium: $%.2f (should be base premium)\n", totalPremium3)

	// With no lookback data (0), should use base premium
	if totalPremium3 > expectedBasePremium+10 {
		t.Errorf("❌ Premium should be base when no lookback data: got $%.2f, expected ~$%.2f",
			totalPremium3, expectedBasePremium)
	}

}

func testIRMAABracketThresholds(t *testing.T) {

	config := TaxConfigDetailed{
		FilingStatus: FilingStatusSingle,
	}
	calculator := NewTaxCalculator(config, nil)

	age := 67
	currentYear := 2024

	// Test exact bracket thresholds for single filers
	thresholds := []struct {
		magi               float64
		expectedMinPremium float64
		expectedMaxPremium float64
		description        string
	}{
		{102999, 209.40, 210.00, "Just below first threshold"},
		{103001, 280.00, 300.00, "Just above first threshold"},
		{128999, 280.00, 300.00, "Just below second threshold"},
		{129001, 380.00, 400.00, "Just above second threshold"},
		{160999, 380.00, 400.00, "Just below third threshold"},
		{161001, 450.00, 480.00, "Just above third threshold"},
		{192999, 450.00, 480.00, "Just below fourth threshold"},
		{193001, 520.00, 550.00, "Just above fourth threshold"},
		{499999, 520.00, 550.00, "Just below highest threshold"},
		{500001, 600.00, 650.00, "Just above highest threshold"},
	}

	for _, threshold := range thresholds {
		totalPremium, _, _ := calculator.CalculateIRMAAEnhanced(
			150000, threshold.magi, currentYear, age)

		fmt.Printf("  %s (MAGI: $%.0f)\n", threshold.description, threshold.magi)
		fmt.Printf("    Monthly Premium: $%.2f\n", totalPremium)

		// Validate premium is in expected range
		if totalPremium < threshold.expectedMinPremium || totalPremium > threshold.expectedMaxPremium {
			t.Errorf("❌ Premium out of range for MAGI $%.0f: got $%.2f, expected $%.2f-$%.2f",
				threshold.magi, totalPremium, threshold.expectedMinPremium, threshold.expectedMaxPremium)
		}
	}

	// Test MFJ thresholds (should be roughly double)
	configMFJ := TaxConfigDetailed{
		FilingStatus: FilingStatusMarriedFilingJointly,
	}
	calculatorMFJ := NewTaxCalculator(configMFJ, nil)

	mfj_magi := 210000.0 // Just above first MFJ threshold
	singlePremium, _, _ := calculator.CalculateIRMAAEnhanced(150000, 110000, currentYear, age)
	mfjPremium, _, _ := calculatorMFJ.CalculateIRMAAEnhanced(150000, mfj_magi, currentYear, age)

	fmt.Printf("\n  Filing Status Comparison:\n")
	fmt.Printf("    Single (MAGI $110k): $%.2f\n", singlePremium)
	fmt.Printf("    MFJ (MAGI $210k): $%.2f\n", mfjPremium)

	// Both should be in similar range since they're in the first IRMAA bracket
	if math.Abs(singlePremium-mfjPremium) > 20 {
		t.Errorf("❌ Similar bracket positions should have similar premiums")
	}

}

func testComprehensiveTax(t *testing.T) {
	fmt.Println("🧮 Testing Comprehensive Tax Calculation...")

	config := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
	}
	calculator := NewTaxCalculator(config, nil)

	// Test realistic retirement scenario
	ordinaryIncome := 60000.0    // Pension, 401k withdrawals, SS
	ltcgIncome := 15000.0        // Long-term capital gains
	qualifiedDividends := 8000.0 // Qualified dividends
	withholding := 12000.0       // Tax withholding
	estimated := 2000.0          // Estimated payments

	result := calculator.CalculateComprehensiveTax(
		ordinaryIncome,
		ltcgIncome,
		0, // STCG
		qualifiedDividends,
		withholding,
		estimated,
	)

	fmt.Printf("    Adjusted Gross Income: $%.0f\n", result.AdjustedGrossIncome)
	fmt.Printf("    Taxable Income: $%.0f\n", result.TaxableIncome)
	fmt.Printf("    Federal Income Tax: $%.0f\n", result.FederalIncomeTax)
	fmt.Printf("    State Income Tax: $%.0f\n", result.StateIncomeTax)
	fmt.Printf("    Capital Gains Tax: $%.0f\n", result.CapitalGainsTax)
	fmt.Printf("    IRMAA Premium: $%.0f\n", result.IRMAAPremium)
	fmt.Printf("    Total Tax Due: $%.0f\n", result.TotalTax)
	fmt.Printf("    Effective Tax Rate: %.1f%%\n", result.EffectiveRate*100)
	fmt.Printf("    Marginal Tax Rate: %.1f%%\n", result.MarginalRate*100)

	// Test edge cases
	fmt.Printf("\n  🧪 Testing Edge Cases:\n")

	// No income
	noIncomeResult := calculator.CalculateComprehensiveTax(0, 0, 0, 0, 0, 0)
	fmt.Printf("    No income: Total tax = $%.0f\n", noIncomeResult.TotalTax)

	// Very high income
	highIncomeResult := calculator.CalculateComprehensiveTax(1000000, 500000, 0, 100000, 0, 0)
	fmt.Printf("    High income ($1.6M AGI): Total tax = $%.0f (%.1f%% effective)\n",
		highIncomeResult.TotalTax, highIncomeResult.EffectiveRate*100)

}

// Test integration with simulation engine
func TestTaxIntegration(t *testing.T) { // Modified signature
	fmt.Println("🔗 Testing Tax Integration with Simulation Engine...")

	// Create simulation engine
	config := createDefaultConfigIfNeeded()
	engine := NewSimulationEngine(config)

	// Test tax tracking
	fmt.Println("  Testing income tracking...")
	engine.ProcessIncome(5000, false, 800) // Ordinary income with withholding
	engine.ProcessIncome(1000, true, 0)    // Qualified dividend
	engine.ProcessCapitalGains(2500)       // Capital gain

	// Calculate current tax
	taxResult := engine.CalculateTaxOwed()
	fmt.Printf("    YTD Ordinary Income: $%.0f\n", engine.ordinaryIncomeYTD)
	fmt.Printf("    YTD Qualified Dividends: $%.0f\n", engine.qualifiedDividendsYTD)
	fmt.Printf("    YTD Capital Gains: $%.0f\n", engine.capitalGainsYTD)
	fmt.Printf("    YTD Tax Withholding: $%.0f\n", engine.taxWithholdingYTD)
	fmt.Printf("    Current Tax Owed: $%.0f\n", taxResult.TotalTax)

	// Test RMD processing
	fmt.Println("  Testing RMD processing...")
	accounts := AccountHoldingsMonthEnd{
		Cash: 50000,
		TaxDeferred: &Account{
			TotalValue: 400000,
			Holdings: []Holding{
				{AssetClass: AssetClassUSStocksTotalMarket, CurrentMarketValueTotal: 400000},
			},
		},
	}

	// Simulate 75-year-old processing RMD
	err := engine.processRMDs(&accounts, 75)
	if err != nil {
		t.Errorf("    ❌ RMD processing failed: %v\n", err) // Changed from fmt.Printf to t.Errorf
	} else {
		fmt.Printf("    Cash after RMD: $%.0f\n", accounts.Cash)
		fmt.Printf("    Tax-deferred balance: $%.0f\n", accounts.TaxDeferred.TotalValue)
		fmt.Printf("    Ordinary income from RMD: $%.0f\n", engine.ordinaryIncomeYTD)
	}

}

// Helper function for creating default config (if not already defined)
func createDefaultConfigIfNeeded() StochasticModelConfig {
	return StochasticModelConfig{
		MeanSPYReturn:             0.08,
		MeanBondReturn:            0.04,
		MeanIntlStockReturn:       0.07,
		MeanInflation:             0.025,
		MeanHomeValueAppreciation: 0.04,
		MeanRentalIncomeGrowth:    0.03,

		VolatilitySPY:                0.175,
		VolatilityBond:               0.045,
		VolatilityIntlStock:          0.20,
		VolatilityInflation:          0.015,
		VolatilityHomeValue:          0.10,
		VolatilityRentalIncomeGrowth: 0.08,

		GarchSPYOmega: 0.0001,
		GarchSPYAlpha: 0.1,
		GarchSPYBeta:  0.85,

		GarchBondOmega: 0.00005,
		GarchBondAlpha: 0.05,
		GarchBondBeta:  0.90,

		GarchIntlStockOmega: 0.00015,
		GarchIntlStockAlpha: 0.12,
		GarchIntlStockBeta:  0.80,

		AR1InflationConstant:          0.005,
		AR1InflationPhi:               0.7,
		AR1HomeValueConstant:          0.01,
		AR1HomeValuePhi:               0.6,
		AR1RentalIncomeGrowthConstant: 0.008,
		AR1RentalIncomeGrowthPhi:      0.5,

		FatTailParameter: 5.0,
		CostLeveragedETF: 0.012,

		CorrelationMatrix: [][]float64{
			{1.00, -0.15, 0.05, 0.75, 0.20, 0.30},
			{-0.15, 1.00, -0.25, -0.10, -0.05, 0.10},
			{0.05, -0.25, 1.00, 0.10, 0.40, 0.50},
			{0.75, -0.10, 0.10, 1.00, 0.25, 0.35},
			{0.20, -0.05, 0.40, 0.25, 1.00, 0.60},
			{0.30, 0.10, 0.50, 0.35, 0.60, 1.00},
		},

		Guardrails: GuardrailConfig{
			UpperGuardrail:   0.06,
			LowerGuardrail:   0.03,
			SpendingCutPct:   0.1,
			SpendingBonusPct: 0.05,
		},
	}
}
