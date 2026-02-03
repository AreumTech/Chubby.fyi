package main

/**
 * Estate Tax Calculator
 *
 * Calculates federal and state estate taxes with exemption and portability rules.
 * Critical for high net worth individuals to understand potential estate tax liability.
 *
 * Federal Estate Tax (2024):
 * - Exemption: $13.61M per person
 * - Rate: 40% on amounts above exemption
 * - Portability: Surviving spouse can use deceased spouse's unused exemption
 * - Sunset provision: Exemption drops to ~$7M (inflation-adjusted) in 2026
 *
 * State Estate Taxes:
 * - 12 states + DC have estate taxes
 * - Exemptions range from $1M (OR, MA) to $13.61M (CT, VT match federal)
 * - Rates range from 10% to 20%
 * - Some states have "cliff" tax (MA, NY) - entire estate taxed if over limit
 *
 * Gift Tax Integration:
 * - Lifetime gifts reduce available estate exemption
 * - Annual exclusion: $18,000 per recipient (2024)
 * - Gifts above annual exclusion consume lifetime exemption
 *
 * Generation-Skipping Transfer Tax (GSTT):
 * - Same exemption and rate as estate tax
 * - Applies to transfers to grandchildren or later generations
 *
 * Planning Strategies:
 * - Spousal portability election (must file 706 even if no tax due)
 * - Lifetime gifting to use exemption before sunset
 * - Irrevocable life insurance trusts (ILITs)
 * - Grantor retained annuity trusts (GRATs)
 * - Charitable remainder trusts (CRTs)
 *
 * References:
 * - IRS Publication 559 (Survivors, Executors, and Administrators)
 * - IRS Form 706 (Estate Tax Return)
 * - IRS Notice 2023-75 (2024 inflation adjustments)
 * - Tax Foundation State Estate Tax Guide
 */

// EstateProfile holds estate information for tax calculation
type EstateProfile struct {
	// Estate value
	GrossEstateValue    float64 // Total estate value at death
	Debts               float64 // Outstanding debts and expenses
	FuneralExpenses     float64 // Deductible funeral costs
	AdminExpenses       float64 // Estate administration costs

	// Deductions
	CharitableBequest   float64 // Amount left to charity (unlimited deduction)
	MaritalBequest      float64 // Amount left to spouse (unlimited deduction)

	// Gift history
	LifetimeGifts       float64 // Taxable gifts made during lifetime (above annual exclusion)

	// Portability from deceased spouse
	PortableExemption   float64 // Unused exemption from deceased spouse

	// State of residence
	StateCode           string

	// Year of death (for exemption amount)
	YearOfDeath         int
}

// EstateExemptions holds exemption amounts by year
type EstateExemptions struct {
	Year              int
	FederalExemption  float64
	AnnualGiftExclusion float64
}

// StateEstateTaxConfig holds state estate tax configuration
type StateEstateTaxConfig struct {
	StateCode          string
	HasEstateTax       bool
	Exemption          float64
	TopRate            float64
	IsCliffTax         bool // True if entire estate taxed when over exemption (MA, NY)
	Brackets           []TaxBracket // Progressive tax brackets
}

// EstaTaxCalculator calculates estate taxes
type EstateTaxCalculator struct {
	exemptions      map[int]EstateExemptions
	stateConfigs    map[string]StateEstateTaxConfig
}

// NewEstateTaxCalculator creates a calculator with federal and state rules
func NewEstateTaxCalculator() *EstateTaxCalculator {
	calc := &EstateTaxCalculator{
		exemptions:   make(map[int]EstateExemptions),
		stateConfigs: make(map[string]StateEstateTaxConfig),
	}
	calc.initializeExemptions()
	calc.initializeStateConfigs()
	return calc
}

// initializeExemptions loads federal exemption amounts by year
func (calc *EstateTaxCalculator) initializeExemptions() {
	// Historical exemptions
	calc.exemptions[2023] = EstateExemptions{
		Year:                 2023,
		FederalExemption:     12920000,
		AnnualGiftExclusion:  17000,
	}

	// 2024 exemptions
	calc.exemptions[2024] = EstateExemptions{
		Year:                 2024,
		FederalExemption:     13610000,
		AnnualGiftExclusion:  18000,
	}

	// 2025 (estimated with inflation)
	calc.exemptions[2025] = EstateExemptions{
		Year:                 2025,
		FederalExemption:     13990000,
		AnnualGiftExclusion:  18000,
	}

	// 2026+ (sunset - drops to ~$7M, inflation-adjusted)
	calc.exemptions[2026] = EstateExemptions{
		Year:                 2026,
		FederalExemption:     7000000, // Approximate - depends on inflation
		AnnualGiftExclusion:  18000,
	}
}

// initializeStateConfigs loads state estate tax rules
func (calc *EstateTaxCalculator) initializeStateConfigs() {
	// States with estate tax
	calc.stateConfigs["MA"] = StateEstateTaxConfig{
		StateCode:    "MA",
		HasEstateTax: true,
		Exemption:    1000000, // Lowest in nation
		TopRate:      0.16,
		IsCliffTax:   true, // Entire estate taxed if over $1M
		Brackets: []TaxBracket{
			{0, 40000, 0.00},
			{40000, 100000, 0.08},
			{100000, 200000, 0.10},
			{200000, 400000, 0.12},
			{400000, 600000, 0.14},
			{600000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["OR"] = StateEstateTaxConfig{
		StateCode:    "OR",
		HasEstateTax: true,
		Exemption:    1000000,
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 1000000, 0.10},
			{1000000, 2500000, 0.10},
			{2500000, 5000000, 0.13},
			{5000000, 10000000, 0.145},
			{10000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["WA"] = StateEstateTaxConfig{
		StateCode:    "WA",
		HasEstateTax: true,
		Exemption:    2193000, // 2024
		TopRate:      0.20,    // Highest state rate
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 1000000, 0.10},
			{1000000, 2000000, 0.14},
			{2000000, 3000000, 0.15},
			{3000000, 4000000, 0.16},
			{4000000, 6000000, 0.18},
			{6000000, 7000000, 0.19},
			{7000000, 9000000, 0.19},
			{9000000, 9999999999, 0.20},
		},
	}

	calc.stateConfigs["NY"] = StateEstateTaxConfig{
		StateCode:    "NY",
		HasEstateTax: true,
		Exemption:    6940000, // 2024
		TopRate:      0.16,
		IsCliffTax:   true, // Phaseout creates cliff effect
		Brackets: []TaxBracket{
			{0, 500000, 0.034},
			{500000, 1000000, 0.05},
			{1000000, 1500000, 0.055},
			{1500000, 2100000, 0.06},
			{2100000, 2600000, 0.065},
			{2600000, 3100000, 0.09},
			{3100000, 3600000, 0.10},
			{3600000, 4100000, 0.11},
			{4100000, 5100000, 0.12},
			{5100000, 6100000, 0.13},
			{6100000, 7100000, 0.14},
			{7100000, 8100000, 0.15},
			{8100000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["CT"] = StateEstateTaxConfig{
		StateCode:    "CT",
		HasEstateTax: true,
		Exemption:    13610000, // Matches federal in 2024
		TopRate:      0.12,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 10100000, 0.10},
			{10100000, 20200000, 0.11},
			{20200000, 9999999999, 0.12},
		},
	}

	calc.stateConfigs["IL"] = StateEstateTaxConfig{
		StateCode:    "IL",
		HasEstateTax: true,
		Exemption:    4000000,
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 4000000, 0.00},
			{4000000, 5000000, 0.08},
			{5000000, 10000000, 0.10},
			{10000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["HI"] = StateEstateTaxConfig{
		StateCode:    "HI",
		HasEstateTax: true,
		Exemption:    5490000,
		TopRate:      0.20,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 5490000, 0.00},
			{5490000, 10000000, 0.10},
			{10000000, 9999999999, 0.20},
		},
	}

	// Vermont matches federal exemption
	calc.stateConfigs["VT"] = StateEstateTaxConfig{
		StateCode:    "VT",
		HasEstateTax: true,
		Exemption:    5000000,
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 5000000, 0.00},
			{5000000, 10000000, 0.12},
			{10000000, 9999999999, 0.16},
		},
	}

	// Maryland has both estate and inheritance tax
	calc.stateConfigs["MD"] = StateEstateTaxConfig{
		StateCode:    "MD",
		HasEstateTax: true,
		Exemption:    5000000,
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 5000000, 0.00},
			{5000000, 10000000, 0.10},
			{10000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["RI"] = StateEstateTaxConfig{
		StateCode:    "RI",
		HasEstateTax: true,
		Exemption:    1733264, // 2024
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 1733264, 0.00},
			{1733264, 5000000, 0.10},
			{5000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["DC"] = StateEstateTaxConfig{
		StateCode:    "DC",
		HasEstateTax: true,
		Exemption:    4528800, // 2024
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 4528800, 0.00},
			{4528800, 5000000, 0.12},
			{5000000, 10000000, 0.14},
			{10000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["MN"] = StateEstateTaxConfig{
		StateCode:    "MN",
		HasEstateTax: true,
		Exemption:    3000000,
		TopRate:      0.16,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 3000000, 0.00},
			{3000000, 5000000, 0.13},
			{5000000, 10000000, 0.14},
			{10000000, 9999999999, 0.16},
		},
	}

	calc.stateConfigs["ME"] = StateEstateTaxConfig{
		StateCode:    "ME",
		HasEstateTax: true,
		Exemption:    6410000, // 2024
		TopRate:      0.12,
		IsCliffTax:   false,
		Brackets: []TaxBracket{
			{0, 6410000, 0.00},
			{6410000, 9000000, 0.08},
			{9000000, 9999999999, 0.12},
		},
	}

	// All other states: no estate tax
	noTaxStates := []string{"AL", "AK", "AZ", "AR", "CA", "CO", "DE", "FL", "GA", "ID", "IN", "IA", "KS", "KY", "LA", "MI", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NC", "ND", "OH", "OK", "PA", "SC", "SD", "TN", "TX", "UT", "VA", "WV", "WI", "WY"}
	for _, state := range noTaxStates {
		calc.stateConfigs[state] = StateEstateTaxConfig{
			StateCode:    state,
			HasEstateTax: false,
		}
	}
}

// CalculateFederalEstateTax calculates federal estate tax liability
func (calc *EstateTaxCalculator) CalculateFederalEstateTax(profile EstateProfile) float64 {
	// Get exemption for year of death
	exemption := calc.getFederalExemption(profile.YearOfDeath)

	// Calculate taxable estate
	taxableEstate := calc.calculateTaxableEstate(profile)

	// Add back lifetime gifts (estate and gift tax are unified)
	taxableEstate += profile.LifetimeGifts

	// Apply exemption (including portability)
	totalExemption := exemption + profile.PortableExemption
	if taxableEstate <= totalExemption {
		return 0
	}

	// Calculate tax on amount above exemption
	taxableAmount := taxableEstate - totalExemption
	tax := taxableAmount * 0.40 // 40% flat rate above exemption

	return tax
}

// calculateTaxableEstate calculates net taxable estate after deductions
func (calc *EstateTaxCalculator) calculateTaxableEstate(profile EstateProfile) float64 {
	// Start with gross estate
	taxableEstate := profile.GrossEstateValue

	// Subtract debts and expenses
	taxableEstate -= profile.Debts
	taxableEstate -= profile.FuneralExpenses
	taxableEstate -= profile.AdminExpenses

	// Subtract unlimited marital deduction
	taxableEstate -= profile.MaritalBequest

	// Subtract unlimited charitable deduction
	taxableEstate -= profile.CharitableBequest

	if taxableEstate < 0 {
		taxableEstate = 0
	}

	return taxableEstate
}

// CalculateStateEstateTax calculates state estate tax liability
func (calc *EstateTaxCalculator) CalculateStateEstateTax(profile EstateProfile) float64 {
	config, exists := calc.stateConfigs[profile.StateCode]
	if !exists || !config.HasEstateTax {
		return 0
	}

	taxableEstate := calc.calculateTaxableEstate(profile)

	// Check if under exemption
	if taxableEstate <= config.Exemption {
		return 0
	}

	// Cliff tax states: entire estate taxed if over threshold
	if config.IsCliffTax {
		// Special handling for MA and NY
		if profile.StateCode == "MA" {
			// MA: dollar-for-dollar credit up to $99,600
			credit := 99600.0
			tax := calc.applyProgressiveTax(taxableEstate, config.Brackets)
			tax -= credit
			if tax < 0 {
				tax = 0
			}
			return tax
		}
		if profile.StateCode == "NY" {
			// NY: cliff when estate > 105% of exemption
			if taxableEstate > config.Exemption*1.05 {
				return calc.applyProgressiveTax(taxableEstate, config.Brackets)
			}
			return 0
		}
	}

	// Progressive tax on amount over exemption
	return calc.applyProgressiveTax(taxableEstate, config.Brackets)
}

// applyProgressiveTax applies progressive tax brackets
func (calc *EstateTaxCalculator) applyProgressiveTax(amount float64, brackets []TaxBracket) float64 {
	if amount <= 0 {
		return 0
	}

	var tax float64
	for _, bracket := range brackets {
		if amount <= bracket.IncomeMin {
			break
		}

		// Calculate amount in this bracket
		amountInBracket := amount
		if amount > bracket.IncomeMax {
			amountInBracket = bracket.IncomeMax
		}
		amountInBracket -= bracket.IncomeMin

		tax += amountInBracket * bracket.Rate

		if amount <= bracket.IncomeMax {
			break
		}
	}

	return tax
}

// CalculateTotalEstateTax calculates combined federal and state estate tax
func (calc *EstateTaxCalculator) CalculateTotalEstateTax(profile EstateProfile) float64 {
	federalTax := calc.CalculateFederalEstateTax(profile)
	stateTax := calc.CalculateStateEstateTax(profile)
	return federalTax + stateTax
}

// getFederalExemption returns federal exemption for a given year
func (calc *EstateTaxCalculator) getFederalExemption(year int) float64 {
	if exemption, exists := calc.exemptions[year]; exists {
		return exemption.FederalExemption
	}
	// Default to 2026 sunset amount for years >= 2026
	if year >= 2026 {
		return calc.exemptions[2026].FederalExemption
	}
	// Default to 2024 for past years
	return calc.exemptions[2024].FederalExemption
}

// GetAnnualGiftExclusion returns annual gift exclusion for a year
func (calc *EstateTaxCalculator) GetAnnualGiftExclusion(year int) float64 {
	if exemption, exists := calc.exemptions[year]; exists {
		return exemption.AnnualGiftExclusion
	}
	return calc.exemptions[2024].AnnualGiftExclusion
}

// CalculateGiftTaxImpact calculates how a gift affects lifetime exemption
func (calc *EstateTaxCalculator) CalculateGiftTaxImpact(
	giftAmount float64,
	numRecipients int,
	year int,
) float64 {
	// Annual exclusion per recipient
	annualExclusion := calc.GetAnnualGiftExclusion(year)
	totalAnnualExclusion := annualExclusion * float64(numRecipients)

	// Amount above annual exclusion consumes lifetime exemption
	taxableGift := giftAmount - totalAnnualExclusion
	if taxableGift < 0 {
		taxableGift = 0
	}

	return taxableGift
}

// CalculatePortableExemption calculates unused exemption from deceased spouse
func (calc *EstateTaxCalculator) CalculatePortableExemption(
	deceasedSpouseEstate EstateProfile,
) float64 {
	// Calculate how much exemption was used
	federalTax := calc.CalculateFederalEstateTax(deceasedSpouseEstate)
	exemption := calc.getFederalExemption(deceasedSpouseEstate.YearOfDeath)

	// If no tax, entire exemption is portable
	if federalTax == 0 {
		taxableEstate := calc.calculateTaxableEstate(deceasedSpouseEstate)
		taxableEstate += deceasedSpouseEstate.LifetimeGifts

		unusedExemption := exemption - taxableEstate
		if unusedExemption < 0 {
			unusedExemption = 0
		}
		return unusedExemption
	}

	// If tax was paid, little/no unused exemption
	return 0
}

// GetEffectiveRate returns effective estate tax rate
func (calc *EstateTaxCalculator) GetEffectiveRate(profile EstateProfile) float64 {
	grossEstate := profile.GrossEstateValue
	if grossEstate <= 0 {
		return 0
	}

	totalTax := calc.CalculateTotalEstateTax(profile)
	return totalTax / grossEstate
}

// EstimateLifeInsuranceNeeded estimates life insurance needed to cover estate tax
func (calc *EstateTaxCalculator) EstimateLifeInsuranceNeeded(profile EstateProfile) float64 {
	// Calculate estate tax liability
	estateTax := calc.CalculateTotalEstateTax(profile)

	// Note: Life insurance death benefit is included in gross estate
	// So need to "gross up" the insurance amount to cover tax
	// Formula: Insurance = Tax / (1 - tax_rate)
	// Use 40% federal rate as approximation
	grossUpFactor := 1.0 / (1.0 - 0.40)

	return estateTax * grossUpFactor
}
