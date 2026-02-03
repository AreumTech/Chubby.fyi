package engine

import (
	"encoding/json"
	"fmt"
	"math"
)

// RMD calculation and processing functions for WASM engine


// CalculateRMD calculates the Required Minimum Distribution based on age and account balance
func CalculateRMD(age int, accountBalance float64) float64 {
	if age < 73 || accountBalance <= 0 {
		return 0
	}

	// Use config loader to get life expectancy from external config
	lifeExpectancy, exists := GetRMDLifeExpectancy(age)
	if !exists {
		// For ages beyond the table, use the last available value
		lifeExpectancy = 4.5 // Age 105+ value (fallback)
	}

	return accountBalance / lifeExpectancy
}

// ProcessRMDsAnnual processes Required Minimum Distributions for the year
func ProcessRMDsAnnual(accounts *AccountHoldingsMonthEnd, monthContext *MonthContext, activeConfig *StochasticModelConfig) {
	if monthContext.AgeYears < 73 {
		return
	}

	// Only process RMDs once per year (in December)
	if monthContext.CalendarMonth != 11 { // December is month 11 (0-based)
		return
	}

	taxDeferredAccount := (accounts.TaxDeferred)
	if accounts.TaxDeferred == nil || taxDeferredAccount.TotalValue <= 0 {
		return
	}

	rmdAmount := CalculateRMD(monthContext.AgeYears, taxDeferredAccount.TotalValue)
	if rmdAmount <= 0 {
		return
	}

	// Store RMD amount in context for tax calculations
	monthContext.RMDAmountAnnualCalculated = rmdAmount

	// Process the distribution
	withdrawalAmount := math.Min(rmdAmount, taxDeferredAccount.TotalValue)

	// Proportionally reduce holdings in tax-deferred account
	if taxDeferredAccount.TotalValue > 0 {
		reductionFactor := 1.0 - (withdrawalAmount / taxDeferredAccount.TotalValue)
		for i := range taxDeferredAccount.Holdings {
			taxDeferredAccount.Holdings[i].CurrentMarketValueTotal *= reductionFactor
		}
		taxDeferredAccount.TotalValue -= withdrawalAmount
	}

	// Save the modified account back
	accounts.TaxDeferred = taxDeferredAccount

	// Add RMD to cash
	accounts.Cash += withdrawalAmount
	monthContext.RMDAmountTaken = withdrawalAmount
}

// Tax bracket structure
type TaxBracket struct {
	IncomeMin float64 `json:"incomeMin"`
	IncomeMax float64 `json:"incomeMax"`
	Rate      float64 `json:"rate"`
}

// Custom unmarshaler to handle "Infinity" string in JSON
func (tb *TaxBracket) UnmarshalJSON(data []byte) error {
	// Define a temporary struct with string incomeMax to handle "Infinity"
	var temp struct {
		IncomeMin interface{} `json:"incomeMin"`
		IncomeMax interface{} `json:"incomeMax"`
		Rate      float64     `json:"rate"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Handle IncomeMin (should always be a number)
	switch v := temp.IncomeMin.(type) {
	case float64:
		tb.IncomeMin = v
	case int:
		tb.IncomeMin = float64(v)
	default:
		return fmt.Errorf("invalid incomeMin type: %T", temp.IncomeMin)
	}

	// Handle IncomeMax (could be "Infinity" or a number)
	switch v := temp.IncomeMax.(type) {
	case string:
		if v == "Infinity" {
			tb.IncomeMax = math.Inf(1) // Positive infinity
		} else {
			return fmt.Errorf("invalid incomeMax string: %s", v)
		}
	case float64:
		tb.IncomeMax = v
	case int:
		tb.IncomeMax = float64(v)
	default:
		return fmt.Errorf("invalid incomeMax type: %T", temp.IncomeMax)
	}

	tb.Rate = temp.Rate
	return nil
}

// Filing status constants for internal use (main types are in generated_interface_types.go)
const (
	FilingStatusQualifyingWidow = "qualifying_widow"
)

// Tax calculation configuration (detailed version for internal calculations)
type TaxConfigDetailed struct {
	FilingStatus         FilingStatus          `json:"filingStatus"`
	State                string                `json:"state"`
	StandardDeduction    float64               `json:"standardDeduction"`
	ItemizedDeduction    float64               `json:"itemizedDeduction"`
	SaltCap              float64               `json:"saltCap"`
	FederalBrackets      []TaxBracket          `json:"federalBrackets"`
	CapitalGainsBrackets []CapitalGainsBracket `json:"capitalGainsBrackets"`
	MedicareConfig       *MedicareConfig       `json:"medicareConfig,omitempty"`
}

// Capital gains tax brackets
type CapitalGainsBracket struct {
	IncomeMin float64 `json:"incomeMin"`
	IncomeMax float64 `json:"incomeMax"`
	Rate      float64 `json:"rate"`
}

// Custom unmarshaler to handle "Infinity" string in JSON for capital gains brackets
func (cgb *CapitalGainsBracket) UnmarshalJSON(data []byte) error {
	// Define a temporary struct with interface{} incomeMax to handle "Infinity"
	var temp struct {
		IncomeMin interface{} `json:"incomeMin"`
		IncomeMax interface{} `json:"incomeMax"`
		Rate      float64     `json:"rate"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Handle IncomeMin (should always be a number)
	switch v := temp.IncomeMin.(type) {
	case float64:
		cgb.IncomeMin = v
	case int:
		cgb.IncomeMin = float64(v)
	default:
		return fmt.Errorf("invalid incomeMin type: %T", temp.IncomeMin)
	}

	// Handle IncomeMax (could be "Infinity" or a number)
	switch v := temp.IncomeMax.(type) {
	case string:
		if v == "Infinity" {
			cgb.IncomeMax = math.Inf(1) // Positive infinity
		} else {
			return fmt.Errorf("invalid incomeMax string: %s", v)
		}
	case float64:
		cgb.IncomeMax = v
	case int:
		cgb.IncomeMax = float64(v)
	default:
		return fmt.Errorf("invalid incomeMax type: %T", temp.IncomeMax)
	}

	cgb.Rate = temp.Rate
	return nil
}

// IRMAA bracket structure (updated to support new Medicare configuration)
type IRMAABracket struct {
	MAGIThreshold  float64 `json:"magiThreshold"`
	PartBSurcharge float64 `json:"partBSurcharge"`
	PartDSurcharge float64 `json:"partDSurcharge"`
	// Legacy fields for backwards compatibility
	MAGIThresholdSingle   float64 `json:"magiThresholdSingle,omitempty"`
	MAGIThresholdMFJ      float64 `json:"magiThresholdMfj,omitempty"`
	PartBDollarAdjustment float64 `json:"partBDollarAdjustment,omitempty"`
	PartDDollarAdjustment float64 `json:"partDDollarAdjustment,omitempty"`
}

// Medicare configuration for a specific year
type MedicareYearData struct {
	BasePartBPremium float64                   `json:"basePartBPremium"`
	BasePartDPremium float64                   `json:"basePartDPremium"`
	IRMAABrackets    map[string][]IRMAABracket `json:"irmaaBrackets"`
}

// Complete Medicare configuration with multi-year data
type MedicareConfig struct {
	YearData map[string]MedicareYearData `json:"yearData"`
}

// Tax calculation result
type TaxCalculationResult struct {
	FederalIncomeTax      float64 `json:"federalIncomeTax"`
	StateIncomeTax        float64 `json:"stateIncomeTax"`
	CapitalGainsTax       float64 `json:"capitalGainsTax"`
	AlternativeMinimumTax float64 `json:"alternativeMinimumTax"`

	// FICA Tax Breakdown
	SocialSecurityTax     float64 `json:"socialSecurityTax"`
	MedicareTax           float64 `json:"medicareTax"`
	AdditionalMedicareTax float64 `json:"additionalMedicareTax"`
	TotalFICATax          float64 `json:"totalFicaTax"`

	IRMAAPremium        float64 `json:"irmaaPremium"`
	TotalTax            float64 `json:"totalTax"`            // Total tax liability (before withholding/payments)
	NetTaxDueOrRefund   float64 `json:"netTaxDueOrRefund"`   // Net amount due after withholding/estimated payments
	EffectiveRate       float64 `json:"effectiveRate"`
	MarginalRate        float64 `json:"marginalRate"`
	AdjustedGrossIncome float64 `json:"adjustedGrossIncome"`
	TaxableIncome       float64 `json:"taxableIncome"`
}

// Tax calculator structure
type TaxCalculator struct {
	config             TaxConfigDetailed
	stateTaxCalculator *StateTaxCalculator
}

// Create new tax calculator
func NewTaxCalculator(config TaxConfigDetailed, stateTaxCalc *StateTaxCalculator) *TaxCalculator {
	return &TaxCalculator{
		config:             config,
		stateTaxCalculator: stateTaxCalc,
	}
}


// Calculate progressive tax from brackets
func calculateProgressiveTax(income float64, brackets []TaxBracket) float64 {
	if income <= 0 {
		return 0
	}

	totalTax := 0.0
	remainingIncome := income

	for _, bracket := range brackets {
		if remainingIncome <= 0 {
			break
		}

		// Calculate taxable amount in this bracket
		bracketMax := bracket.IncomeMax
		if math.IsInf(bracketMax, 1) {
			bracketMax = remainingIncome + bracket.IncomeMin
		}

		taxableInBracket := math.Min(remainingIncome, bracketMax-bracket.IncomeMin)
		if taxableInBracket > 0 {
			totalTax += taxableInBracket * bracket.Rate
			remainingIncome -= taxableInBracket
		}
	}

	return totalTax
}

// Calculate federal income tax
func (tc *TaxCalculator) CalculateFederalIncomeTax(taxableIncome float64) float64 {
	if taxableIncome <= 0 {
		return 0
	}

	// Use config loader to get tax brackets from external config
	brackets := GetFederalTaxBrackets(tc.config.FilingStatus)
	return calculateProgressiveTax(taxableIncome, brackets)
}

// Calculate state income tax
func (tc *TaxCalculator) CalculateStateIncomeTax(taxableIncome float64) float64 {
	if taxableIncome <= 0 {
		return 0
	}

	// Use comprehensive state tax calculator
	if tc.stateTaxCalculator != nil {
		// Note: This function receives combined taxableIncome, so we treat it all as ordinary income
		// Capital gains are handled separately in comprehensive tax calculation
		return tc.stateTaxCalculator.CalculateStateTax(
			taxableIncome, // ordinaryIncome
			0,             // capitalGains (handled separately)
			tc.config.State,
			tc.config.FilingStatus,
			0, // numDependents - would need to be added to config if needed
		)
	}

	// Fallback to hardcoded calculations if calculator not available (legacy support)
	switch tc.config.State {
	case "CA":
		return tc.calculateCaliforniaIncomeTax(taxableIncome)
	case "NY":
		return tc.calculateNewYorkIncomeTax(taxableIncome)
	case "TX", "FL", "WA", "NV", "SD", "TN", "WY", "AK", "NH":
		// No state income tax
		return 0
	default:
		// Use configurable flat tax rate for other states
		flatRate := tc.getStateFlatTaxRate(tc.config.State)
		return taxableIncome * flatRate
	}
}

// California state income tax (progressive)
func (tc *TaxCalculator) calculateCaliforniaIncomeTax(taxableIncome float64) float64 {
	var brackets []TaxBracket
	if tc.config.FilingStatus == FilingStatusMarriedJointly {
		brackets = []TaxBracket{
			{IncomeMin: 0, IncomeMax: 23200, Rate: 0.01},
			{IncomeMin: 23200, IncomeMax: 55500, Rate: 0.02},
			{IncomeMin: 55500, IncomeMax: 87500, Rate: 0.04},
			{IncomeMin: 87500, IncomeMax: 122000, Rate: 0.06},
			{IncomeMin: 122000, IncomeMax: 154500, Rate: 0.08},
			{IncomeMin: 154500, IncomeMax: 186600, Rate: 0.093},
			{IncomeMin: 186600, IncomeMax: 318500, Rate: 0.103},
			{IncomeMin: 318500, IncomeMax: 638900, Rate: 0.113},
			{IncomeMin: 638900, IncomeMax: math.Inf(1), Rate: 0.123},
		}
	} else {
		brackets = []TaxBracket{
			{IncomeMin: 0, IncomeMax: 10099, Rate: 0.01},
			{IncomeMin: 10099, IncomeMax: 23942, Rate: 0.02},
			{IncomeMin: 23942, IncomeMax: 37788, Rate: 0.04},
			{IncomeMin: 37788, IncomeMax: 52455, Rate: 0.06},
			{IncomeMin: 52455, IncomeMax: 66295, Rate: 0.08},
			{IncomeMin: 66295, IncomeMax: 338639, Rate: 0.093},
			{IncomeMin: 338639, IncomeMax: 406364, Rate: 0.103},
			{IncomeMin: 406364, IncomeMax: 677278, Rate: 0.113},
			{IncomeMin: 677278, IncomeMax: math.Inf(1), Rate: 0.123},
		}
	}
	return calculateProgressiveTax(taxableIncome, brackets)
}

// New York state income tax (simplified progressive)
func (tc *TaxCalculator) calculateNewYorkIncomeTax(taxableIncome float64) float64 {
	var brackets []TaxBracket
	if tc.config.FilingStatus == FilingStatusMarriedJointly {
		brackets = []TaxBracket{
			{IncomeMin: 0, IncomeMax: 17150, Rate: 0.04},
			{IncomeMin: 17150, IncomeMax: 23600, Rate: 0.045},
			{IncomeMin: 23600, IncomeMax: 27900, Rate: 0.0525},
			{IncomeMin: 27900, IncomeMax: 161550, Rate: 0.059},
			{IncomeMin: 161550, IncomeMax: 323200, Rate: 0.0645},
			{IncomeMin: 323200, IncomeMax: 2155350, Rate: 0.0685},
			{IncomeMin: 2155350, IncomeMax: math.Inf(1), Rate: 0.103},
		}
	} else {
		brackets = []TaxBracket{
			{IncomeMin: 0, IncomeMax: 8500, Rate: 0.04},
			{IncomeMin: 8500, IncomeMax: 11700, Rate: 0.045},
			{IncomeMin: 11700, IncomeMax: 13900, Rate: 0.0525},
			{IncomeMin: 13900, IncomeMax: 80650, Rate: 0.059},
			{IncomeMin: 80650, IncomeMax: 215400, Rate: 0.0645},
			{IncomeMin: 215400, IncomeMax: 1077550, Rate: 0.0685},
			{IncomeMin: 1077550, IncomeMax: math.Inf(1), Rate: 0.103},
		}
	}
	return calculateProgressiveTax(taxableIncome, brackets)
}

// getStateFlatTaxRate returns the flat tax rate for states that use flat tax systems
func (tc *TaxCalculator) getStateFlatTaxRate(state string) float64 {
	stateRates := map[string]float64{
		"AL": 0.05,  // Alabama: 2-5%, using 5%
		"AZ": 0.025, // Arizona: 2.5% flat
		"AR": 0.055, // Arkansas: 2-5.5%, using 5.5%
		"CO": 0.044, // Colorado: 4.4% flat
		"CT": 0.055, // Connecticut: 3-6.99%, using 5.5%
		"DE": 0.066, // Delaware: 0-6.6%, using 6.6%
		"FL": 0.0,   // Florida: No state income tax
		"GA": 0.0575, // Georgia: 1-5.75%, using 5.75%
		"HI": 0.0825, // Hawaii: 1.4-11%, using 8.25%
		"ID": 0.058, // Idaho: 1.125-5.8%, using 5.8%
		"IL": 0.0495, // Illinois: 4.95% flat
		"IN": 0.0323, // Indiana: 3.23% flat
		"IA": 0.0853, // Iowa: 0.33-8.53%, using 8.53%
		"KS": 0.057, // Kansas: 3.1-5.7%, using 5.7%
		"KY": 0.05,  // Kentucky: 5% flat
		"LA": 0.06,  // Louisiana: 1.85-6%, using 6%
		"ME": 0.075, // Maine: 5.8-7.15%, using 7.5%
		"MD": 0.0575, // Maryland: 2-5.75%, using 5.75%
		"MA": 0.05,  // Massachusetts: 5% flat
		"MI": 0.0425, // Michigan: 4.25% flat
		"MN": 0.0985, // Minnesota: 5.35-9.85%, using 9.85%
		"MS": 0.05,  // Mississippi: 0-5%, using 5%
		"MO": 0.054, // Missouri: 1.5-5.4%, using 5.4%
		"MT": 0.0675, // Montana: 1-6.75%, using 6.75%
		"NE": 0.0684, // Nebraska: 2.46-6.84%, using 6.84%
		"NV": 0.0,   // Nevada: No state income tax
		"NH": 0.0,   // New Hampshire: No state income tax on wages
		"NJ": 0.1075, // New Jersey: 1.4-10.75%, using 10.75%
		"NM": 0.059, // New Mexico: 1.7-5.9%, using 5.9%
		"NC": 0.049, // North Carolina: 4.9% flat
		"ND": 0.029, // North Dakota: 1.1-2.9%, using 2.9%
		"OH": 0.0399, // Ohio: 0-3.99%, using 3.99%
		"OK": 0.05,  // Oklahoma: 0.25-5%, using 5%
		"OR": 0.099, // Oregon: 4.75-9.9%, using 9.9%
		"PA": 0.0307, // Pennsylvania: 3.07% flat
		"RI": 0.0599, // Rhode Island: 3.75-5.99%, using 5.99%
		"SC": 0.07,  // South Carolina: 0-7%, using 7%
		"SD": 0.0,   // South Dakota: No state income tax
		"TN": 0.0,   // Tennessee: No state income tax on wages
		"TX": 0.0,   // Texas: No state income tax
		"UT": 0.049, // Utah: 4.9% flat
		"VT": 0.0875, // Vermont: 3.35-8.75%, using 8.75%
		"VA": 0.0575, // Virginia: 2-5.75%, using 5.75%
		"WA": 0.0,   // Washington: No state income tax
		"WV": 0.065, // West Virginia: 3-6.5%, using 6.5%
		"WI": 0.0765, // Wisconsin: 3.54-7.65%, using 7.65%
		"WY": 0.0,   // Wyoming: No state income tax
		"NY": 0.0685, // New York: 4-8.82%, using 6.85% (handled by progressive system above)
	}

	if rate, exists := stateRates[state]; exists {
		return rate
	}

	// Default to 5% if state not found
	return 0.05
}

// Calculate long-term capital gains tax
func (tc *TaxCalculator) CalculateCapitalGainsTax(ordinaryIncome, ltcgIncome, stcgIncome float64) float64 {
	if ltcgIncome <= 0 && stcgIncome <= 0 {
		return 0
	}

	// Short-term capital gains are taxed as ordinary income
	stcgTax := tc.CalculateFederalIncomeTax(ordinaryIncome+stcgIncome) - tc.CalculateFederalIncomeTax(ordinaryIncome)

	// Long-term capital gains have preferential rates - use config loader
	ltcgBrackets := GetLTCGBrackets(tc.config.FilingStatus)

	ltcgTax := 0.0
	remainingLTCG := ltcgIncome
	currentIncome := ordinaryIncome

	for _, bracket := range ltcgBrackets {
		if remainingLTCG <= 0 {
			break
		}

		// Determine how much income fits in this bracket
		bracketCapacity := bracket.IncomeMax - math.Max(bracket.IncomeMin, currentIncome)
		if bracketCapacity <= 0 {
			// Ordinary income already exceeds this bracket - skip to next bracket
			// DO NOT reset currentIncome - it should remain at the actual stacked income level
			continue
		}

		// Tax the portion of LTCG that fits in this bracket
		taxableInBracket := math.Min(remainingLTCG, bracketCapacity)
		ltcgTax += taxableInBracket * bracket.Rate
		remainingLTCG -= taxableInBracket
		currentIncome += taxableInBracket
	}

	return stcgTax + ltcgTax
}

// Calculate Alternative Minimum Tax (AMT)
func (tc *TaxCalculator) CalculateAlternativeMinimumTax(income, preferences float64) float64 {
	// AMT exemption amounts for 2024
	var exemption float64
	var phaseoutThreshold float64

	switch tc.config.FilingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		exemption = 133300
		phaseoutThreshold = 1218700
	case FilingStatusMarriedSeparately:
		exemption = 66650
		phaseoutThreshold = 609350
	default: // Single, Head of Household
		exemption = 85700
		phaseoutThreshold = 609350
	}

	// Calculate AMT income
	amtIncome := income + preferences

	// Apply exemption with phaseout
	if amtIncome > phaseoutThreshold {
		phaseoutAmount := (amtIncome - phaseoutThreshold) * 0.25
		exemption = math.Max(0, exemption-phaseoutAmount)
	}

	amtTaxableIncome := math.Max(0, amtIncome-exemption)

	// AMT tax calculation (26% and 28% rates)
	amtTax := 0.0
	if amtTaxableIncome <= 220700 { // 2024 threshold
		amtTax = amtTaxableIncome * 0.26
	} else {
		amtTax = 220700*0.26 + (amtTaxableIncome-220700)*0.28
	}

	return math.Max(0, amtTax)
}

// Calculate IRMAA premium
func (tc *TaxCalculator) CalculateIRMAAPremium(magi float64) float64 {
	if magi <= 0 {
		return 0
	}

	// Use config loader to get IRMAA premium from external config
	return GetIRMAAMonthlyPremium(magi, tc.config.FilingStatus)
}

// Enhanced IRMAA calculation with two-year look-back and Medicare configuration support
func (tc *TaxCalculator) CalculateIRMAAEnhanced(currentYearMAGI float64, lookbackMAGI float64, currentYear int, age int) (float64, float64, float64) {
	// Only apply Medicare premiums and IRMAA for people 65 and older
	if age < 65 {
		return 0, 0, 0
	}

	// Use two-year look-back MAGI for IRMAA calculation (current policy)
	magiForIRMAA := lookbackMAGI

	// Determine the year for Medicare data (use current year)
	yearStr := fmt.Sprintf("%d", currentYear)

	// Get base Medicare premiums and IRMAA brackets from configuration
	var basePartBPremium, basePartDPremium, irmaaPartBSurcharge, irmaaPartDSurcharge float64 = 0, 0, 0, 0

	// Use hardcoded values if no Medicare config is available (fallback)
	if tc.config.MedicareConfig == nil || tc.config.MedicareConfig.YearData[yearStr].BasePartBPremium == 0 {
		// Fallback to 2024 values
		basePartBPremium = 174.70
		basePartDPremium = 34.70

		// Calculate IRMAA surcharge using existing logic
		existingIRMAA := tc.CalculateIRMAAPremium(magiForIRMAA)
		irmaaPartBSurcharge = existingIRMAA * 0.7 // Approximate Part B portion
		irmaaPartDSurcharge = existingIRMAA * 0.3 // Approximate Part D portion
	} else {
		// Use Medicare configuration data
		yearData := tc.config.MedicareConfig.YearData[yearStr]
		basePartBPremium = yearData.BasePartBPremium
		basePartDPremium = yearData.BasePartDPremium

		// Determine filing status key
		var filingStatusKey string
		switch tc.config.FilingStatus {
		case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
			filingStatusKey = "marriedFilingJointly"
		default:
			filingStatusKey = "single"
		}

		// Calculate IRMAA surcharge based on MAGI brackets
		brackets := yearData.IRMAABrackets[filingStatusKey]
		if brackets != nil {
			for i := len(brackets) - 1; i >= 0; i-- {
				bracket := brackets[i]
				if magiForIRMAA >= bracket.MAGIThreshold {
					irmaaPartBSurcharge = bracket.PartBSurcharge
					irmaaPartDSurcharge = bracket.PartDSurcharge
					break
				}
			}
		}
	}

	// Calculate total monthly premium costs
	totalMonthlyPartB := basePartBPremium + irmaaPartBSurcharge
	totalMonthlyPartD := basePartDPremium + irmaaPartDSurcharge
	totalMonthlyMedicare := totalMonthlyPartB + totalMonthlyPartD

	return totalMonthlyMedicare, totalMonthlyPartB, totalMonthlyPartD
}

// CalculateFICATaxes calculates Social Security, Medicare, and Additional Medicare taxes
func (tc *TaxCalculator) CalculateFICATaxes(employmentIncome float64, filingStatus FilingStatus) (socialSecurity, medicare, additionalMedicare float64) {
	// Get FICA tax rates from configuration
	socialSecurityRate, medicareRate, additionalMedicareRate := GetFICATaxRates()

	// Get wage base from config
	socialSecurityWageBase := GetSocialSecurityWageBase()

	// Additional Medicare tax thresholds (2024)
	// Get threshold from config based on filing status
	additionalMedicareThreshold := GetAdditionalMedicareThreshold(filingStatus)

	// Calculate Social Security tax (capped at wage base)
	socialSecurityIncome := math.Min(employmentIncome, socialSecurityWageBase)
	socialSecurity = socialSecurityIncome * socialSecurityRate

	// Calculate Medicare tax (no cap)
	medicare = employmentIncome * medicareRate

	// Calculate Additional Medicare tax (0.9% on income above threshold)
	if employmentIncome > additionalMedicareThreshold {
		additionalMedicare = (employmentIncome - additionalMedicareThreshold) * additionalMedicareRate
	}

	return socialSecurity, medicare, additionalMedicare
}

// CalculateSelfEmploymentTax calculates self-employment tax for 1099 income
func (tc *TaxCalculator) CalculateSelfEmploymentTax(selfEmploymentIncome float64) (socialSecurity, medicare, additionalMedicare float64) {
	// Get self-employment tax rates from configuration
	seSocialSecurityRate, seMedicareRate, seDeduction := GetSelfEmploymentTaxRates()

	// Additional Medicare rate is the same as regular FICA
	_, _, additionalMedicareRate := GetFICATaxRates()

	// Get wage bases from config
	socialSecurityWageBase := GetSocialSecurityWageBase()

	// Apply SE deduction (92.35% of SE income subject to SE tax)
	adjustedSEIncome := selfEmploymentIncome * seDeduction

	// Calculate Social Security SE tax (capped at wage base)
	socialSecurityIncome := math.Min(adjustedSEIncome, socialSecurityWageBase)
	socialSecurity = socialSecurityIncome * seSocialSecurityRate

	// Calculate Medicare SE tax (no cap)
	medicare = adjustedSEIncome * seMedicareRate

	// Additional Medicare tax thresholds are same as regular employment
	// Get threshold from config based on filing status
	additionalMedicareThreshold := GetAdditionalMedicareThreshold(tc.config.FilingStatus)

	// Calculate Additional Medicare tax (0.9% on income above threshold)
	if adjustedSEIncome > additionalMedicareThreshold {
		additionalMedicare = (adjustedSEIncome - additionalMedicareThreshold) * additionalMedicareRate
	}

	return socialSecurity, medicare, additionalMedicare
}

// Calculate taxable portion of Social Security benefits based on IRS formula
func (tc *TaxCalculator) CalculateTaxableSocialSecurity(provisionalIncome, socialSecurityBenefits float64) float64 {
	if socialSecurityBenefits <= 0 {
		return 0
	}

	// Get thresholds from configuration based on filing status
	threshold1, threshold2 := GetSocialSecurityThresholds(tc.config.FilingStatus)

	// Calculate provisional income (adjusted gross income + half of SS benefits + tax-exempt interest)
	halfSSBenefits := socialSecurityBenefits * 0.5
	totalProvisionalIncome := provisionalIncome + halfSSBenefits

	// Apply IRS formula for taxable SS benefits
	if totalProvisionalIncome <= threshold1 {
		// No taxable portion
		return 0
	} else if totalProvisionalIncome <= threshold2 {
		// Up to 50% of benefits may be taxable
		excessOverFirst := totalProvisionalIncome - threshold1
		taxableAmount := math.Min(excessOverFirst, halfSSBenefits)
		return taxableAmount
	} else {
		// Up to 85% of benefits may be taxable
		excessOverSecond := totalProvisionalIncome - threshold2

		// First calculate the 50% portion
		firstTierTaxable := math.Min(threshold2-threshold1, halfSSBenefits)

		// Then calculate the additional 35% portion (85% - 50% = 35%)
		additionalTaxable := math.Min(excessOverSecond*0.85, socialSecurityBenefits*0.35)

		// Total taxable is the sum, but cannot exceed 85% of total benefits
		totalTaxable := firstTierTaxable + additionalTaxable
		return math.Min(totalTaxable, socialSecurityBenefits*0.85)
	}
}

// CalculateSocialSecurityBenefit calculates monthly Social Security benefit based on claiming age
// Uses official SSA formulas for early/delayed retirement adjustments
// Source: Social Security Administration - "Early or Late Retirement" Publication
func CalculateSocialSecurityBenefit(claimAge int, pia float64, fullRetirementAge int) float64 {
	if pia <= 0 {
		return 0
	}

	// If claiming at Full Retirement Age, return 100% of PIA
	if claimAge == fullRetirementAge {
		return pia
	}

	// Early claiming (before FRA) - benefits are reduced
	if claimAge < fullRetirementAge {
		monthsEarly := (fullRetirementAge - claimAge) * 12

		// SSA formula for early retirement reduction:
		// - First 36 months: 5/9 of 1% per month (0.5556%)
		// - Additional months: 5/12 of 1% per month (0.4167%)

		var reductionPercent float64
		if monthsEarly <= 36 {
			// All months within first 36
			reductionPercent = float64(monthsEarly) * (5.0 / 9.0) / 100.0
		} else {
			// First 36 months at 5/9 rate, remainder at 5/12 rate
			first36Reduction := 36.0 * (5.0 / 9.0) / 100.0
			additionalMonths := float64(monthsEarly - 36)
			additionalReduction := additionalMonths * (5.0 / 12.0) / 100.0
			reductionPercent = first36Reduction + additionalReduction
		}

		return pia * (1.0 - reductionPercent)
	}

	// Delayed claiming (after FRA) - benefits are increased
	// Maximum increase stops at age 70
	effectiveClaimAge := claimAge
	if effectiveClaimAge > 70 {
		effectiveClaimAge = 70
	}

	monthsDelayed := (effectiveClaimAge - fullRetirementAge) * 12

	// SSA formula for delayed retirement credits:
	// 2/3 of 1% per month (0.6667% per month = 8% per year)
	increasePercent := float64(monthsDelayed) * (2.0 / 3.0) / 100.0

	return pia * (1.0 + increasePercent)
}

// CalculateRMD is already defined above, removing duplicate

// Calculate comprehensive tax
func (tc *TaxCalculator) CalculateComprehensiveTax(
	ordinaryIncome float64,
	ltcgIncome float64,
	stcgIncome float64,
	qualifiedDividends float64,
	taxWithholding float64,
	estimatedPayments float64,
) TaxCalculationResult {
	return tc.CalculateComprehensiveTaxWithFICA(ordinaryIncome, ltcgIncome, stcgIncome, qualifiedDividends, taxWithholding, estimatedPayments, 0, 0)
}

// Calculate comprehensive tax with FICA breakdown
func (tc *TaxCalculator) CalculateComprehensiveTaxWithFICA(
	ordinaryIncome float64,
	ltcgIncome float64,
	stcgIncome float64,
	qualifiedDividends float64,
	taxWithholding float64,
	estimatedPayments float64,
	employmentIncome float64,
	selfEmploymentIncome float64,
) TaxCalculationResult {

	// Calculate adjusted gross income
	adjustedGrossIncome := ordinaryIncome + ltcgIncome + stcgIncome + qualifiedDividends

	// Calculate deductions
	deduction := math.Max(tc.config.StandardDeduction, tc.config.ItemizedDeduction)

	// Apply SALT cap to itemized deductions
	if tc.config.ItemizedDeduction > tc.config.StandardDeduction && tc.config.SaltCap > 0 {
		deduction = math.Min(deduction, tc.config.StandardDeduction+tc.config.SaltCap)
	}

	// Calculate taxable income
	taxableIncome := math.Max(0, adjustedGrossIncome-deduction)

	// Calculate federal tax on ordinary income only (excluding capital gains)
	ordinaryTaxableIncome := math.Max(0, ordinaryIncome-deduction)
	federalIncomeTax := tc.CalculateFederalIncomeTax(ordinaryTaxableIncome)

	// Calculate state tax on full taxable income
	stateIncomeTax := tc.CalculateStateIncomeTax(taxableIncome)

	// Calculate capital gains tax (this function already calculates incremental tax correctly)
	capitalGainsTax := tc.CalculateCapitalGainsTax(ordinaryIncome, ltcgIncome+qualifiedDividends, stcgIncome)

	// AMT calculation (simplified - would need more detailed preferences in real implementation)
	amtTax := tc.CalculateAlternativeMinimumTax(adjustedGrossIncome, 0)

	// IRMAA calculation
	irmaa := tc.CalculateIRMAAPremium(adjustedGrossIncome)

	// Calculate FICA taxes
	var socialSecurityTax, medicareTax, additionalMedicareTax float64

	// FICA taxes on employment income (W-2)
	if employmentIncome > 0 {
		ss, med, addMed := tc.CalculateFICATaxes(employmentIncome, tc.config.FilingStatus)
		socialSecurityTax += ss
		medicareTax += med
		additionalMedicareTax += addMed
	}

	// Self-employment tax on self-employment income (1099)
	if selfEmploymentIncome > 0 {
		ss, med, addMed := tc.CalculateSelfEmploymentTax(selfEmploymentIncome)
		socialSecurityTax += ss
		medicareTax += med
		additionalMedicareTax += addMed
	}

	totalFICATax := socialSecurityTax + medicareTax + additionalMedicareTax

	// Total federal tax: ordinary income tax + capital gains tax (not double-counted)
	regularFederalTax := federalIncomeTax + capitalGainsTax
	totalFederalTax := math.Max(regularFederalTax, amtTax)
	totalTax := totalFederalTax + stateIncomeTax + totalFICATax + irmaa*12 // IRMAA is monthly

	// Net tax after withholding and estimated payments
	netTaxDue := math.Max(0, totalTax-taxWithholding-estimatedPayments)

	// Calculate effective and marginal rates
	effectiveRate := 0.0
	if adjustedGrossIncome > 0 {
		effectiveRate = totalTax / adjustedGrossIncome
	}

	// Marginal rate calculation (simplified - approximate next dollar impact)
	marginalIncome := adjustedGrossIncome + 1000
	marginalTaxableIncome := math.Max(0, marginalIncome-deduction)
	marginalTax := tc.CalculateFederalIncomeTax(marginalTaxableIncome) + tc.CalculateStateIncomeTax(marginalTaxableIncome)
	marginalRate := math.Max(0, (marginalTax-(federalIncomeTax+stateIncomeTax))/1000)

	return TaxCalculationResult{
		FederalIncomeTax:      federalIncomeTax,
		StateIncomeTax:        stateIncomeTax,
		CapitalGainsTax:       capitalGainsTax,
		AlternativeMinimumTax: amtTax,

		// FICA Tax Breakdown
		SocialSecurityTax:     socialSecurityTax,
		MedicareTax:           medicareTax,
		AdditionalMedicareTax: additionalMedicareTax,
		TotalFICATax:          totalFICATax,

		IRMAAPremium:        irmaa * 12,
		TotalTax:            totalTax,    // FIXED: Total liability (not net due)
		NetTaxDueOrRefund:   netTaxDue,   // Net amount after withholding/payments
		EffectiveRate:       effectiveRate,
		MarginalRate:        marginalRate,
		AdjustedGrossIncome: adjustedGrossIncome,
		TaxableIncome:       taxableIncome,
	}
}

// Get standard deduction for filing status (2024 amounts)
func GetStandardDeduction(filingStatus FilingStatus) float64 {
	// Use config loader to get standard deduction from external config
	return GetStandardDeductionFromConfig(filingStatus)
}

// CalculateFederalWithholding calculates federal tax withholding using IRS Percentage Method
func (tc *TaxCalculator) CalculateFederalWithholding(grossPay float64, payFrequency string, filingStatus FilingStatus) float64 {
	if grossPay <= 0 {
		return 0
	}

	// Step 1: Annualize the pay
	var annualGrossPay float64
	switch payFrequency {
	case "weekly":
		annualGrossPay = grossPay * 52
	case "biweekly":
		annualGrossPay = grossPay * 26
	case "semimonthly":
		annualGrossPay = grossPay * 24
	case "monthly":
		annualGrossPay = grossPay * 12
	case "quarterly":
		annualGrossPay = grossPay * 4
	case "annually":
		annualGrossPay = grossPay
	default:
		// Default to monthly if frequency not recognized
		annualGrossPay = grossPay * 12
	}

	// Step 2: Subtract standard deduction (IRS Percentage Method)
	standardDeduction := GetStandardDeduction(filingStatus)
	adjustedAnnualPay := math.Max(0, annualGrossPay-standardDeduction)

	// Step 3: Calculate annual tax on adjusted pay using progressive brackets from config
	brackets := GetFederalTaxBrackets(filingStatus)

	annualTax := calculateProgressiveTax(adjustedAnnualPay, brackets)

	// Step 4: De-annualize the tax to get per-paycheck withholding
	var paychecksPerYear float64
	switch payFrequency {
	case "weekly":
		paychecksPerYear = 52
	case "biweekly":
		paychecksPerYear = 26
	case "semimonthly":
		paychecksPerYear = 24
	case "monthly":
		paychecksPerYear = 12
	case "quarterly":
		paychecksPerYear = 4
	case "annually":
		paychecksPerYear = 1
	default:
		paychecksPerYear = 12 // Default to monthly
	}

	withholdingPerPaycheck := annualTax / paychecksPerYear
	return withholdingPerPaycheck
}

// Create default tax configuration
func GetDefaultTaxConfig() TaxConfigDetailed {
	return GetDefaultTaxConfigDetailed()
}

func GetDefaultTaxConfigDetailed() TaxConfigDetailed {
	return TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle), // Use config-based value
		ItemizedDeduction: 0,
		SaltCap:           10000,
	}
}

// CalculateIRMAASurcharge calculates the Medicare Income-Related Monthly Adjustment Amount
// based on Modified Adjusted Gross Income (MAGI) and filing status
// Returns the combined monthly surcharge for Part B + Part D
// Source: Medicare.gov, CMS 2025 IRMAA brackets
func CalculateIRMAASurcharge(magi float64, filingStatus string, year int) float64 {
	// Normalize filing status
	normalizedStatus := filingStatus
	if filingStatus == "married_joint" || filingStatus == "married filing jointly" {
		normalizedStatus = "married"
	} else if filingStatus == "single" || filingStatus == "head of household" {
		normalizedStatus = "single"
	}

	// 2025 IRMAA brackets (Source: Medicare.gov)
	// Format: income threshold, Part B surcharge, Part D surcharge

	type IRMAABracket struct {
		MinIncome        float64
		MaxIncome        float64
		PartBSurcharge   float64
		PartDSurcharge   float64
	}

	var brackets []IRMAABracket

	if normalizedStatus == "married" {
		// Married Filing Jointly brackets
		brackets = []IRMAABracket{
			{0, 212000, 0, 0},                // No IRMAA
			{212000, 266000, 74.0, 13.70},    // Tier 1
			{266000, 320000, 185.0, 35.30},   // Tier 2
			{320000, 426000, 295.0, 56.90},   // Tier 3
			{426000, 999999999, 406.0, 78.50}, // Tier 4 (top)
		}
	} else {
		// Single/Head of Household brackets
		brackets = []IRMAABracket{
			{0, 106000, 0, 0},                 // No IRMAA
			{106000, 133000, 74.0, 13.70},     // Tier 1
			{133000, 160000, 185.0, 35.30},    // Tier 2
			{160000, 213000, 295.0, 56.90},    // Tier 3
			{213000, 999999999, 406.0, 78.50}, // Tier 4 (top)
		}
	}

	// Find applicable bracket
	for _, bracket := range brackets {
		if magi >= bracket.MinIncome && magi < bracket.MaxIncome {
			return bracket.PartBSurcharge + bracket.PartDSurcharge
		}
	}

	// Default: return top bracket if somehow not found
	lastBracket := brackets[len(brackets)-1]
	return lastBracket.PartBSurcharge + lastBracket.PartDSurcharge
}

// GetRothIRAContributionLimit returns the Roth IRA contribution limit after phase-out
// Phase-out based on Modified Adjusted Gross Income (MAGI) and filing status
// Source: IRS Notice 2024-80 (2025 limits)
func GetRothIRAContributionLimit(age int, magi float64, filingStatus string) float64 {
	baseLimit := GetIRAContributionLimit(age)

	// Normalize filing status
	normalizedStatus := filingStatus
	if filingStatus == "married_joint" || filingStatus == "married filing jointly" {
		normalizedStatus = "married"
	} else {
		normalizedStatus = "single"
	}

	// 2025 Roth IRA phase-out ranges
	var phaseOutStart, phaseOutEnd float64
	if normalizedStatus == "married" {
		phaseOutStart = 236000.0
		phaseOutEnd = 246000.0
	} else {
		phaseOutStart = 150000.0
		phaseOutEnd = 165000.0
	}

	// No phase-out: full contribution
	if magi <= phaseOutStart {
		return baseLimit
	}

	// Fully phased out: no contribution
	if magi >= phaseOutEnd {
		return 0.0
	}

	// Partial phase-out: linear reduction
	phaseOutRange := phaseOutEnd - phaseOutStart
	amountOverThreshold := magi - phaseOutStart
	reductionPercentage := amountOverThreshold / phaseOutRange

	return baseLimit * (1.0 - reductionPercentage)
}

// normalizeFilingStatus converts various filing status strings to standardized values
func normalizeFilingStatus(filingStatus string) string {
	switch filingStatus {
	case "married_joint", "married filing jointly", "married":
		return "married"
	case "single", "head of household":
		return "single"
	default:
		return "single" // Default to single for unknown statuses
	}
}

// CalculateStateTax calculates state income tax for the given state, income, and filing status
// Uses the existing stateTaxConfig loaded from state_tax_brackets.json
func CalculateStateTax(stateCode string, taxableIncome float64, filingStatus string) float64 {
	if taxableIncome <= 0 || stateTaxConfig == nil {
		return 0
	}

	stateData, exists := stateTaxConfig.States[stateCode]
	if !exists {
		// Unknown state - return 0 (no tax)
		return 0
	}

	switch stateData.TaxType {
	case "none":
		// No state income tax (TX, FL)
		return 0

	case "flat":
		// Flat tax rate (PA, IL, NC, GA, MI)
		return taxableIncome * stateData.Rate

	case "progressive":
		// Progressive brackets (CA, NY, OH)
		return calculateProgressiveStateTax(stateData, taxableIncome, filingStatus)

	default:
		return 0
	}
}

// Helper to convert interface{} income bounds to float64
func convertIncomeBound(bound interface{}) float64 {
	switch v := bound.(type) {
	case float64:
		return v
	case string:
		if v == "Infinity" {
			return 99999999.0
		}
		return 0
	default:
		return 0
	}
}

// calculateProgressiveStateTax applies progressive bracket calculation using existing config structure
func calculateProgressiveStateTax(stateData struct {
	Name                 string `json:"name"`
	TaxType              string `json:"taxType"`
	Rate                 float64 `json:"rate,omitempty"`
	Single               []struct {
		IncomeMin interface{} `json:"incomeMin"`
		IncomeMax interface{} `json:"incomeMax"`
		Rate      float64     `json:"rate"`
	} `json:"single,omitempty"`
	MarriedFilingJointly []struct {
		IncomeMin interface{} `json:"incomeMin"`
		IncomeMax interface{} `json:"incomeMax"`
		Rate      float64     `json:"rate"`
	} `json:"marriedFilingJointly,omitempty"`
}, income float64, filingStatus string) float64 {
	// Normalize filing status
	normalizedStatus := normalizeFilingStatus(filingStatus)

	// Select appropriate brackets based on filing status
	if normalizedStatus == "married" {
		brackets := stateData.MarriedFilingJointly
		if len(brackets) == 0 {
			return 0
		}

		totalTax := 0.0
		for _, bracket := range brackets {
			min := convertIncomeBound(bracket.IncomeMin)
			max := convertIncomeBound(bracket.IncomeMax)

			if income <= min {
				break
			}

			// Calculate taxable amount in this bracket
			bracketIncome := 0.0
			if income >= max {
				bracketIncome = max - min
			} else {
				bracketIncome = income - min
			}

			totalTax += bracketIncome * bracket.Rate
		}
		return totalTax
	} else {
		// Single filers
		brackets := stateData.Single
		if len(brackets) == 0 {
			return 0
		}

		totalTax := 0.0
		for _, bracket := range brackets {
			min := convertIncomeBound(bracket.IncomeMin)
			max := convertIncomeBound(bracket.IncomeMax)

			if income <= min {
				break
			}

			// Calculate taxable amount in this bracket
			bracketIncome := 0.0
			if income >= max {
				bracketIncome = max - min
			} else {
				bracketIncome = income - min
			}

			totalTax += bracketIncome * bracket.Rate
		}
		return totalTax
	}
}

// ACAContributionBracket represents income-based contribution percentages for ACA subsidies
type ACAContributionBracket struct {
	FPLMin     float64
	FPLMax     float64
	PercentMin float64
	PercentMax float64
}

// CalculateACASubsidy calculates the ACA premium tax credit (subsidy) based on income and benchmark premium
// Uses 2025 enhanced subsidy rules (no 400% FPL cliff, 8.5% cap)
// Formula: subsidy = benchmark_premium - (MAGI * applicable_percentage)
// Source: IRS Rev. Proc. 2024-35
func CalculateACASubsidy(magi float64, householdSize int, benchmarkPremium float64) float64 {
	if magi <= 0 || benchmarkPremium <= 0 {
		return 0
	}

	// 2025 Federal Poverty Level (FPL) amounts
	// Source: HHS Federal Poverty Guidelines 2024 (used for 2025 calculations)
	fpl := 15650.0 // Individual
	if householdSize > 1 {
		// Additional $5,400 per person for household sizes > 1
		fpl = 15650.0 + float64(householdSize-1)*5400.0
	}

	// Calculate FPL percentage
	fplPercent := (magi / fpl) * 100.0

	// 2025 Enhanced ACA contribution percentages (valid through 12/31/2025)
	// Source: IRS Rev. Proc. 2024-35
	brackets := []ACAContributionBracket{
		{0, 150, 0.0, 4.0},       // Up to 150% FPL: 0% to 4%
		{150, 200, 4.0, 6.52},    // 150-200% FPL: 4% to 6.52%
		{200, 250, 6.52, 8.33},   // 200-250% FPL: 6.52% to 8.33%
		{250, 300, 8.33, 9.83},   // 250-300% FPL: 8.33% to 9.83%
		{300, 400, 9.83, 9.83},   // 300-400% FPL: flat 9.83%
		{400, 99999, 8.5, 8.5},   // Above 400% FPL: capped at 8.5% (enhanced through 2025)
	}

	// Find applicable contribution percentage
	applicablePercent := 8.5 // Default cap
	for _, bracket := range brackets {
		if fplPercent >= bracket.FPLMin && fplPercent <= bracket.FPLMax {
			if bracket.PercentMin == bracket.PercentMax {
				// Flat rate bracket
				applicablePercent = bracket.PercentMin
			} else {
				// Linear interpolation within bracket
				rangePercent := (fplPercent - bracket.FPLMin) / (bracket.FPLMax - bracket.FPLMin)
				applicablePercent = bracket.PercentMin + rangePercent*(bracket.PercentMax-bracket.PercentMin)
			}
			break
		}
	}

	// Calculate required contribution
	requiredContribution := magi * (applicablePercent / 100.0)

	// Subsidy = benchmark premium - required contribution
	subsidy := benchmarkPremium - requiredContribution

	// Subsidy cannot be negative
	if subsidy < 0 {
		return 0
	}

	return subsidy
}
