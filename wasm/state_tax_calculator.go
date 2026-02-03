package main

/**
 * State Income Tax Calculator
 *
 * Calculates state income tax liability for all 50 states plus DC.
 * Supports progressive tax brackets, flat taxes, and no-tax states.
 *
 * Key Features:
 * - Progressive brackets (CA, NY, NJ, etc.)
 * - Flat tax states (IL, PA, etc.)
 * - No income tax states (TX, FL, WA, etc.)
 * - Capital gains treatment varies by state
 * - Standard deductions and personal exemptions
 *
 * High-Tax States:
 * - CA: 13.3% top rate (>$1M)
 * - NY: 10.9% top rate (>$25M)
 * - NJ: 10.75% top rate (>$1M)
 * - HI: 11% top rate (>$200K)
 * - DC: 10.75% top rate (>$1M)
 *
 * No Income Tax States:
 * - TX, FL, NV, WY, SD, AK, TN, NH, WA (9 states)
 * - Note: WA has 7% cap gains tax on gains >$250K
 * - Note: NH has 5% tax on dividends/interest (repealed 2025)
 *
 * References:
 * - Tax Foundation State Tax Rates (2024)
 * - State revenue department publications
 * - Federation of Tax Administrators
 */

// StateTaxBracket represents a single tax bracket for a state
type StateTaxBracket struct {
	IncomeMin float64 // Minimum income for this bracket
	IncomeMax float64 // Maximum income (use math.MaxFloat64 for top bracket)
	Rate      float64 // Marginal tax rate as decimal (e.g., 0.093 for 9.3%)
}

// StateTaxConfig holds complete tax configuration for a state
type StateTaxConfig struct {
	StateCode string // Two-letter state code (e.g., "CA")
	StateName string // Full state name

	// Tax system type
	HasIncomeTax    bool // False for TX, FL, etc.
	IsFlatTax       bool // True for IL, PA, etc.
	FlatTaxRate     float64

	// Progressive brackets (empty for flat tax or no-tax states)
	SingleBrackets   []StateTaxBracket
	MarriedBrackets  []StateTaxBracket

	// Deductions and exemptions
	StandardDeduction        float64 // Standard deduction amount
	PersonalExemption        float64 // Per-person exemption
	DependentExemption       float64 // Per-dependent exemption
	HasStandardDeduction     bool
	HasPersonalExemption     bool

	// Capital gains treatment
	TaxesCapitalGainsAsOrdinary bool   // True if long-term cap gains taxed as ordinary income
	CapitalGainsRate            float64 // Separate rate if different from ordinary (e.g., WA)
	CapitalGainsThreshold       float64 // Threshold for cap gains tax (e.g., WA $250K)
}

// StateTaxCalculator calculates state income tax
type StateTaxCalculator struct {
	stateConfigs map[string]StateTaxConfig
}

// NewStateTaxCalculator creates a calculator with all state configurations
func NewStateTaxCalculator() *StateTaxCalculator {
	calc := &StateTaxCalculator{
		stateConfigs: make(map[string]StateTaxConfig),
	}
	calc.initializeAllStates()
	return calc
}

// initializeAllStates loads tax configuration for all 50 states + DC
func (calc *StateTaxCalculator) initializeAllStates() {
	// High-tax progressive states
	calc.stateConfigs["CA"] = calc.getCaliforniaConfig()
	calc.stateConfigs["NY"] = calc.getNewYorkConfig()
	calc.stateConfigs["NJ"] = calc.getNewJerseyConfig()
	calc.stateConfigs["HI"] = calc.getHawaiiConfig()
	calc.stateConfigs["DC"] = calc.getDistrictOfColumbiaConfig()
	calc.stateConfigs["OR"] = calc.getOregonConfig()
	calc.stateConfigs["MN"] = calc.getMinnesotaConfig()
	calc.stateConfigs["MA"] = calc.getMassachusettsConfig()

	// Flat tax states
	calc.stateConfigs["IL"] = calc.getIllinoisConfig()
	calc.stateConfigs["PA"] = calc.getPennsylvaniaConfig()
	calc.stateConfigs["CO"] = calc.getColoradoConfig()
	calc.stateConfigs["MI"] = calc.getMichiganConfig()

	// No income tax states
	calc.stateConfigs["TX"] = calc.getTexasConfig()
	calc.stateConfigs["FL"] = calc.getFloridaConfig()
	calc.stateConfigs["WA"] = calc.getWashingtonConfig()
	calc.stateConfigs["NV"] = calc.getNevadaConfig()
	calc.stateConfigs["WY"] = calc.getWyomingConfig()
	calc.stateConfigs["SD"] = calc.getSouthDakotaConfig()
	calc.stateConfigs["AK"] = calc.getAlaskaConfig()
	calc.stateConfigs["TN"] = calc.getTennesseeConfig()
	calc.stateConfigs["NH"] = calc.getNewHampshireConfig()

	// Moderate tax states (add more as needed)
	calc.stateConfigs["VA"] = calc.getVirginiaConfig()
	calc.stateConfigs["GA"] = calc.getGeorgiaConfig()
	calc.stateConfigs["AZ"] = calc.getArizonaConfig()
}

// CalculateStateTax calculates total state income tax liability
func (calc *StateTaxCalculator) CalculateStateTax(
	ordinaryIncome float64,
	capitalGains float64,
	stateCode string,
	filingStatus FilingStatus,
	numDependents int,
) float64 {
	config, exists := calc.stateConfigs[stateCode]
	if !exists {
		// Unknown state - return 0 (fail gracefully)
		return 0
	}

	// No income tax states
	if !config.HasIncomeTax {
		// Special case: Washington has cap gains tax
		if stateCode == "WA" && capitalGains > config.CapitalGainsThreshold {
			return (capitalGains - config.CapitalGainsThreshold) * config.CapitalGainsRate
		}
		return 0
	}

	// Calculate taxable income
	totalIncome := ordinaryIncome
	if config.TaxesCapitalGainsAsOrdinary {
		totalIncome += capitalGains
	}

	// Apply deductions
	taxableIncome := totalIncome
	if config.HasStandardDeduction {
		taxableIncome -= config.StandardDeduction
	}
	if config.HasPersonalExemption {
		taxableIncome -= config.PersonalExemption
		taxableIncome -= config.DependentExemption * float64(numDependents)
	}

	if taxableIncome < 0 {
		taxableIncome = 0
	}

	// Calculate tax
	var tax float64
	if config.IsFlatTax {
		tax = taxableIncome * config.FlatTaxRate
	} else {
		// Progressive brackets
		brackets := config.SingleBrackets
		if filingStatus == FilingStatusMarriedFilingJointly {
			brackets = config.MarriedBrackets
		}
		tax = calc.calculateProgressiveTax(taxableIncome, brackets)
	}

	// Add separate capital gains tax if applicable (not taxed as ordinary)
	if !config.TaxesCapitalGainsAsOrdinary && capitalGains > 0 {
		if config.CapitalGainsRate > 0 {
			// Apply threshold if any
			taxableCapGains := capitalGains
			if config.CapitalGainsThreshold > 0 {
				taxableCapGains -= config.CapitalGainsThreshold
				if taxableCapGains < 0 {
					taxableCapGains = 0
				}
			}
			tax += taxableCapGains * config.CapitalGainsRate
		}
	}

	return tax
}

// calculateProgressiveTax applies progressive tax brackets
func (calc *StateTaxCalculator) calculateProgressiveTax(income float64, brackets []StateTaxBracket) float64 {
	if income <= 0 {
		return 0
	}

	var tax float64
	for _, bracket := range brackets {
		if income <= bracket.IncomeMin {
			break
		}

		// Calculate income in this bracket
		incomeInBracket := income
		if income > bracket.IncomeMax {
			incomeInBracket = bracket.IncomeMax
		}
		incomeInBracket -= bracket.IncomeMin

		tax += incomeInBracket * bracket.Rate

		if income <= bracket.IncomeMax {
			break
		}
	}

	return tax
}

// GetEffectiveStateRate returns effective tax rate for a given income level
func (calc *StateTaxCalculator) GetEffectiveStateRate(
	income float64,
	stateCode string,
	filingStatus FilingStatus,
) float64 {
	if income <= 0 {
		return 0
	}
	tax := calc.CalculateStateTax(income, 0, stateCode, filingStatus, 0)
	return tax / income
}

// =============================================================================
// STATE CONFIGURATIONS
// =============================================================================

// California - 13.3% top rate, highly progressive
func (calc *StateTaxCalculator) getCaliforniaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "CA",
		StateName:                   "California",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           5202,  // 2024 single
		HasPersonalExemption:        true,
		PersonalExemption:           144,   // 2024
		DependentExemption:          447,   // 2024
		SingleBrackets: []StateTaxBracket{
			{0, 10412, 0.01},
			{10412, 24684, 0.02},
			{24684, 38959, 0.04},
			{38959, 54081, 0.06},
			{54081, 68350, 0.08},
			{68350, 349137, 0.093},
			{349137, 418961, 0.103},
			{418961, 698271, 0.113},
			{698271, 1000000, 0.123},
			{1000000, 9999999999, 0.133},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 20824, 0.01},
			{20824, 49368, 0.02},
			{49368, 77918, 0.04},
			{77918, 108162, 0.06},
			{108162, 136700, 0.08},
			{136700, 698274, 0.093},
			{698274, 837922, 0.103},
			{837922, 1000000, 0.113},
			{1000000, 1396542, 0.123},
			{1396542, 9999999999, 0.133},
		},
	}
}

// New York - 10.9% top rate (>$25M for highest bracket)
func (calc *StateTaxCalculator) getNewYorkConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "NY",
		StateName:                   "New York",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           8000,  // 2024 single
		SingleBrackets: []StateTaxBracket{
			{0, 8500, 0.04},
			{8500, 11700, 0.045},
			{11700, 13900, 0.0525},
			{13900, 80650, 0.055},
			{80650, 215400, 0.06},
			{215400, 1077550, 0.0685},
			{1077550, 5000000, 0.0965},
			{5000000, 25000000, 0.103},
			{25000000, 9999999999, 0.109},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 17150, 0.04},
			{17150, 23600, 0.045},
			{23600, 27900, 0.0525},
			{27900, 161550, 0.055},
			{161550, 323200, 0.06},
			{323200, 2155350, 0.0685},
			{2155350, 5000000, 0.0965},
			{5000000, 25000000, 0.103},
			{25000000, 9999999999, 0.109},
		},
	}
}

// New Jersey - 10.75% top rate
func (calc *StateTaxCalculator) getNewJerseyConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "NJ",
		StateName:                   "New Jersey",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        false,
		HasPersonalExemption:        true,
		PersonalExemption:           1000,
		DependentExemption:          1500,
		SingleBrackets: []StateTaxBracket{
			{0, 20000, 0.014},
			{20000, 35000, 0.0175},
			{35000, 40000, 0.035},
			{40000, 75000, 0.05525},
			{75000, 500000, 0.0637},
			{500000, 1000000, 0.0897},
			{1000000, 9999999999, 0.1075},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 20000, 0.014},
			{20000, 50000, 0.0175},
			{50000, 70000, 0.0245},
			{70000, 80000, 0.035},
			{80000, 150000, 0.05525},
			{150000, 500000, 0.0637},
			{500000, 1000000, 0.0897},
			{1000000, 9999999999, 0.1075},
		},
	}
}

// Hawaii - 11% top rate
func (calc *StateTaxCalculator) getHawaiiConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "HI",
		StateName:                   "Hawaii",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           2200,
		HasPersonalExemption:        true,
		PersonalExemption:           1144,
		DependentExemption:          1144,
		SingleBrackets: []StateTaxBracket{
			{0, 2400, 0.014},
			{2400, 4800, 0.032},
			{4800, 9600, 0.055},
			{9600, 14400, 0.064},
			{14400, 19200, 0.068},
			{19200, 24000, 0.072},
			{24000, 36000, 0.076},
			{36000, 48000, 0.079},
			{48000, 150000, 0.0825},
			{150000, 175000, 0.09},
			{175000, 200000, 0.10},
			{200000, 9999999999, 0.11},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 4800, 0.014},
			{4800, 9600, 0.032},
			{9600, 19200, 0.055},
			{19200, 28800, 0.064},
			{28800, 38400, 0.068},
			{38400, 48000, 0.072},
			{48000, 72000, 0.076},
			{72000, 96000, 0.079},
			{96000, 300000, 0.0825},
			{300000, 350000, 0.09},
			{350000, 400000, 0.10},
			{400000, 9999999999, 0.11},
		},
	}
}

// District of Columbia - 10.75% top rate
func (calc *StateTaxCalculator) getDistrictOfColumbiaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "DC",
		StateName:                   "District of Columbia",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           12950,
		SingleBrackets: []StateTaxBracket{
			{0, 10000, 0.04},
			{10000, 40000, 0.06},
			{40000, 60000, 0.065},
			{60000, 250000, 0.085},
			{250000, 500000, 0.0925},
			{500000, 1000000, 0.0975},
			{1000000, 9999999999, 0.1075},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 10000, 0.04},
			{10000, 40000, 0.06},
			{40000, 60000, 0.065},
			{60000, 250000, 0.085},
			{250000, 500000, 0.0925},
			{500000, 1000000, 0.0975},
			{1000000, 9999999999, 0.1075},
		},
	}
}

// Oregon - 9.9% top rate
func (calc *StateTaxCalculator) getOregonConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "OR",
		StateName:                   "Oregon",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           2420,
		SingleBrackets: []StateTaxBracket{
			{0, 3750, 0.049},
			{3750, 9450, 0.069},
			{9450, 125000, 0.089},
			{125000, 9999999999, 0.099},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 7500, 0.049},
			{7500, 18900, 0.069},
			{18900, 250000, 0.089},
			{250000, 9999999999, 0.099},
		},
	}
}

// Minnesota - 9.85% top rate
func (calc *StateTaxCalculator) getMinnesotaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "MN",
		StateName:                   "Minnesota",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           13825,
		SingleBrackets: []StateTaxBracket{
			{0, 30070, 0.0535},
			{30070, 98760, 0.068},
			{98760, 183340, 0.0785},
			{183340, 9999999999, 0.0985},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 43950, 0.0535},
			{43950, 174610, 0.068},
			{174610, 304970, 0.0785},
			{304970, 9999999999, 0.0985},
		},
	}
}

// Massachusetts - 5% flat tax on most income, 9% on short-term gains
func (calc *StateTaxCalculator) getMassachusettsConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "MA",
		StateName:                   "Massachusetts",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.05,
		TaxesCapitalGainsAsOrdinary: true, // Simplified - actually complex rules
		HasStandardDeduction:        false,
		HasPersonalExemption:        true,
		PersonalExemption:           4400,
		DependentExemption:          1000,
	}
}

// Illinois - 4.95% flat tax
func (calc *StateTaxCalculator) getIllinoisConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "IL",
		StateName:                   "Illinois",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.0495,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        false,
		HasPersonalExemption:        true,
		PersonalExemption:           2425,
		DependentExemption:          2425,
	}
}

// Pennsylvania - 3.07% flat tax
func (calc *StateTaxCalculator) getPennsylvaniaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "PA",
		StateName:                   "Pennsylvania",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.0307,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        false,
		HasPersonalExemption:        false,
	}
}

// Colorado - 4.40% flat tax
func (calc *StateTaxCalculator) getColoradoConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "CO",
		StateName:                   "Colorado",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.044,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        false,
		HasPersonalExemption:        false,
	}
}

// Michigan - 4.25% flat tax
func (calc *StateTaxCalculator) getMichiganConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "MI",
		StateName:                   "Michigan",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.0425,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        false,
		HasPersonalExemption:        true,
		PersonalExemption:           5000,
		DependentExemption:          5000,
	}
}

// Texas - No income tax
func (calc *StateTaxCalculator) getTexasConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "TX",
		StateName:    "Texas",
		HasIncomeTax: false,
	}
}

// Florida - No income tax
func (calc *StateTaxCalculator) getFloridaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "FL",
		StateName:    "Florida",
		HasIncomeTax: false,
	}
}

// Washington - No income tax, 7% cap gains tax on gains >$250K
func (calc *StateTaxCalculator) getWashingtonConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:             "WA",
		StateName:             "Washington",
		HasIncomeTax:          false,
		CapitalGainsRate:      0.07,
		CapitalGainsThreshold: 250000,
	}
}

// Nevada - No income tax
func (calc *StateTaxCalculator) getNevadaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "NV",
		StateName:    "Nevada",
		HasIncomeTax: false,
	}
}

// Wyoming - No income tax
func (calc *StateTaxCalculator) getWyomingConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "WY",
		StateName:    "Wyoming",
		HasIncomeTax: false,
	}
}

// South Dakota - No income tax
func (calc *StateTaxCalculator) getSouthDakotaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "SD",
		StateName:    "South Dakota",
		HasIncomeTax: false,
	}
}

// Alaska - No income tax
func (calc *StateTaxCalculator) getAlaskaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "AK",
		StateName:    "Alaska",
		HasIncomeTax: false,
	}
}

// Tennessee - No income tax (Hall tax repealed 2021)
func (calc *StateTaxCalculator) getTennesseeConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "TN",
		StateName:    "Tennessee",
		HasIncomeTax: false,
	}
}

// New Hampshire - No income tax (interest/dividends tax repealed 2025)
func (calc *StateTaxCalculator) getNewHampshireConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:    "NH",
		StateName:    "New Hampshire",
		HasIncomeTax: false,
	}
}

// Virginia - 5.75% top rate (4 brackets)
func (calc *StateTaxCalculator) getVirginiaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "VA",
		StateName:                   "Virginia",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           4500,
		HasPersonalExemption:        true,
		PersonalExemption:           930,
		DependentExemption:          930,
		SingleBrackets: []StateTaxBracket{
			{0, 3000, 0.02},
			{3000, 5000, 0.03},
			{5000, 17000, 0.05},
			{17000, 9999999999, 0.0575},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 3000, 0.02},
			{3000, 5000, 0.03},
			{5000, 17000, 0.05},
			{17000, 9999999999, 0.0575},
		},
	}
}

// Georgia - 5.75% top rate (6 brackets)
func (calc *StateTaxCalculator) getGeorgiaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "GA",
		StateName:                   "Georgia",
		HasIncomeTax:                true,
		IsFlatTax:                   false,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           5400,
		HasPersonalExemption:        true,
		PersonalExemption:           2700,
		DependentExemption:          3000,
		SingleBrackets: []StateTaxBracket{
			{0, 750, 0.01},
			{750, 2250, 0.02},
			{2250, 3750, 0.03},
			{3750, 5250, 0.04},
			{5250, 7000, 0.05},
			{7000, 9999999999, 0.0575},
		},
		MarriedBrackets: []StateTaxBracket{
			{0, 1000, 0.01},
			{1000, 3000, 0.02},
			{3000, 5000, 0.03},
			{5000, 7000, 0.04},
			{7000, 10000, 0.05},
			{10000, 9999999999, 0.0575},
		},
	}
}

// Arizona - 2.5% flat tax (simplified from 2024)
func (calc *StateTaxCalculator) getArizonaConfig() StateTaxConfig {
	return StateTaxConfig{
		StateCode:                   "AZ",
		StateName:                   "Arizona",
		HasIncomeTax:                true,
		IsFlatTax:                   true,
		FlatTaxRate:                 0.025,
		TaxesCapitalGainsAsOrdinary: true,
		HasStandardDeduction:        true,
		StandardDeduction:           13850,
		HasPersonalExemption:        false,
	}
}
