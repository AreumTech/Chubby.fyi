package main

import (
	"math"
)

/**
 * Property Cost Escalator
 *
 * Models escalating costs of property ownership including taxes, maintenance,
 * insurance, and HOA fees. Critical for accurate real estate expense projections.
 *
 * Property Tax Increases:
 * - National average: 2-4% per year
 * - California (Prop 13): 2% annual cap on assessed value increase
 * - Texas: No state income tax, but ~1.8% property tax rate (high)
 * - New Jersey: Highest property taxes (~2.5% of home value)
 * - Reassessment on sale triggers step-up in most states
 *
 * Maintenance Costs:
 * - Rule of thumb: 1-2% of home value annually
 * - Newer homes (<10 years): ~1% of value
 * - Older homes (>20 years): ~2-3% of value
 * - Major systems replacement every 15-25 years:
 *   - Roof: $10,000-$30,000 (20-25 year life)
 *   - HVAC: $7,000-$15,000 (15-20 year life)
 *   - Water heater: $1,500-$3,000 (10-15 year life)
 *   - Appliances: $5,000-$10,000 (10-15 year life)
 *
 * HOA Fees:
 * - Average: $200-$400/month
 * - Increase: 3-5% per year
 * - Special assessments: $5,000-$50,000 (unpredictable)
 *
 * Homeowner's Insurance:
 * - National average: $1,400-$2,000/year
 * - Disaster-prone areas: 2-3x national average
 * - Annual increases: 5-10% in high-risk areas
 * - Climate change impact: accelerating in coastal/wildfire areas
 *
 * State Property Tax Rules:
 * - California Prop 13: 2% annual increase cap
 * - Florida Save Our Homes: 3% annual increase cap
 * - Texas: No caps, but homestead exemption
 * - New York: STAR program reduces school taxes
 * - Massachusetts Prop 2½: 2.5% annual increase cap
 *
 * Planning Considerations:
 * - Property taxes can double over 25-year retirement
 * - Insurance may become unaffordable in some areas
 * - Maintenance backlog can reduce home value
 * - HOA fees often outpace inflation
 *
 * References:
 * - National Association of Realtors
 * - Tax Foundation State Property Tax Data
 * - Insurance Information Institute
 * - American Society of Home Inspectors
 */

// PropertyProfile holds property information for cost escalation
type PropertyProfile struct {
	// Property details
	PurchasePrice       float64
	CurrentValue        float64
	YearBuilt           int
	SquareFeet          int
	PropertyType        string // "single_family", "condo", "townhouse"

	// Current annual costs
	PropertyTax         float64
	HomeInsurance       float64
	HOAFees             float64 // Annual
	MaintenanceBudget   float64 // Annual planned maintenance

	// Location
	StateCode           string
	IsCoastal           bool
	IsWildfireZone      bool
	IsFloodZone         bool

	// Purchase info
	YearPurchased       int
}

// PropertyCostProjection holds projected costs for a future year
type PropertyCostProjection struct {
	Year                int
	PropertyTax         float64
	HomeInsurance       float64
	HOAFees             float64
	RoutineMaintenance  float64
	MajorRepairs        float64 // Roof, HVAC, etc.
	TotalAnnualCost     float64
}

// PropertyTaxRules holds state-specific property tax rules
type PropertyTaxRules struct {
	StateCode           string
	HasAssessmentCap    bool
	AnnualCapPercentage float64 // e.g., 0.02 for 2% cap
	AvgEffectiveRate    float64 // Effective tax rate as % of value
	HasHomesteadExemption bool
	HomesteadExemptionAmount float64
}

// PropertyCostEscalator projects future property costs
type PropertyCostEscalator struct {
	// Escalation rates
	propertyTaxInflation  float64 // 3% default
	insuranceInflation    float64 // 5% default
	hoaInflation          float64 // 4% default
	maintenanceInflation  float64 // 2.5% default

	// State-specific rules
	stateRules map[string]PropertyTaxRules

	// Major repair schedule
	majorRepairCosts map[string]float64
	majorRepairLifespan map[string]int
}

// NewPropertyCostEscalator creates escalator with default assumptions
func NewPropertyCostEscalator() *PropertyCostEscalator {
	escalator := &PropertyCostEscalator{
		propertyTaxInflation:  0.03,
		insuranceInflation:    0.05,
		hoaInflation:          0.04,
		maintenanceInflation:  0.025,
		stateRules:            make(map[string]PropertyTaxRules),
		majorRepairCosts:      make(map[string]float64),
		majorRepairLifespan:   make(map[string]int),
	}

	escalator.initializeStateRules()
	escalator.initializeMajorRepairs()
	return escalator
}

// initializeStateRules loads state-specific property tax rules
func (esc *PropertyCostEscalator) initializeStateRules() {
	// California - Prop 13
	esc.stateRules["CA"] = PropertyTaxRules{
		StateCode:             "CA",
		HasAssessmentCap:      true,
		AnnualCapPercentage:   0.02, // 2% cap
		AvgEffectiveRate:      0.0073,
		HasHomesteadExemption: true,
		HomesteadExemptionAmount: 7000,
	}

	// Florida - Save Our Homes
	esc.stateRules["FL"] = PropertyTaxRules{
		StateCode:             "FL",
		HasAssessmentCap:      true,
		AnnualCapPercentage:   0.03, // 3% cap
		AvgEffectiveRate:      0.0098,
		HasHomesteadExemption: true,
		HomesteadExemptionAmount: 50000,
	}

	// Texas - High property tax, no cap
	esc.stateRules["TX"] = PropertyTaxRules{
		StateCode:             "TX",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0181, // 1.81% - highest in nation
		HasHomesteadExemption: true,
		HomesteadExemptionAmount: 40000,
	}

	// New Jersey - Highest property taxes
	esc.stateRules["NJ"] = PropertyTaxRules{
		StateCode:             "NJ",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0249, // 2.49% - very high
		HasHomesteadExemption: false,
	}

	// Massachusetts - Prop 2½
	esc.stateRules["MA"] = PropertyTaxRules{
		StateCode:             "MA",
		HasAssessmentCap:      true,
		AnnualCapPercentage:   0.025, // 2.5% cap
		AvgEffectiveRate:      0.0118,
		HasHomesteadExemption: true,
		HomesteadExemptionAmount: 500000, // Equity protection
	}

	// New York
	esc.stateRules["NY"] = PropertyTaxRules{
		StateCode:             "NY",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0168,
		HasHomesteadExemption: false,
	}

	// Oregon
	esc.stateRules["OR"] = PropertyTaxRules{
		StateCode:             "OR",
		HasAssessmentCap:      true,
		AnnualCapPercentage:   0.03, // 3% cap
		AvgEffectiveRate:      0.0097,
		HasHomesteadExemption: false,
	}

	// Washington - No income tax, moderate property tax
	esc.stateRules["WA"] = PropertyTaxRules{
		StateCode:             "WA",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0092,
		HasHomesteadExemption: true,
		HomesteadExemptionAmount: 100000,
	}

	// Colorado
	esc.stateRules["CO"] = PropertyTaxRules{
		StateCode:             "CO",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0051, // Low
		HasHomesteadExemption: false,
	}

	// Arizona
	esc.stateRules["AZ"] = PropertyTaxRules{
		StateCode:             "AZ",
		HasAssessmentCap:      false,
		AvgEffectiveRate:      0.0062,
		HasHomesteadExemption: false,
	}
}

// initializeMajorRepairs defines major repair/replacement costs and lifespans
func (esc *PropertyCostEscalator) initializeMajorRepairs() {
	// Cost estimates (national averages)
	esc.majorRepairCosts["roof"] = 15000
	esc.majorRepairCosts["hvac"] = 10000
	esc.majorRepairCosts["water_heater"] = 2000
	esc.majorRepairCosts["appliances"] = 7500
	esc.majorRepairCosts["flooring"] = 10000
	esc.majorRepairCosts["painting"] = 5000
	esc.majorRepairCosts["windows"] = 15000
	esc.majorRepairCosts["siding"] = 12000

	// Expected lifespan (years)
	esc.majorRepairLifespan["roof"] = 22
	esc.majorRepairLifespan["hvac"] = 17
	esc.majorRepairLifespan["water_heater"] = 12
	esc.majorRepairLifespan["appliances"] = 13
	esc.majorRepairLifespan["flooring"] = 20
	esc.majorRepairLifespan["painting"] = 7
	esc.majorRepairLifespan["windows"] = 25
	esc.majorRepairLifespan["siding"] = 30
}

// ProjectPropertyTax projects property tax for a future year
func (esc *PropertyCostEscalator) ProjectPropertyTax(
	profile PropertyProfile,
	targetYear int,
) float64 {
	rules, exists := esc.stateRules[profile.StateCode]
	if !exists {
		// Default: uncapped, 3% annual increase
		yearsFromNow := targetYear - profile.YearPurchased
		return profile.PropertyTax * math.Pow(1+esc.propertyTaxInflation, float64(yearsFromNow))
	}

	// Calculate taxable value
	taxableValue := profile.CurrentValue
	if rules.HasHomesteadExemption {
		taxableValue -= rules.HomesteadExemptionAmount
		if taxableValue < 0 {
			taxableValue = 0
		}
	}

	// Apply assessment cap if applicable
	yearsFromPurchase := targetYear - profile.YearPurchased
	if rules.HasAssessmentCap && yearsFromPurchase > 0 {
		// Purchase price is initial assessed value (stepped up on sale)
		assessedValue := profile.PurchasePrice
		capRate := rules.AnnualCapPercentage

		// Apply cap each year
		for year := 0; year < yearsFromPurchase; year++ {
			assessedValue *= (1 + capRate)
		}

		// Tax based on capped assessed value
		return assessedValue * rules.AvgEffectiveRate
	}

	// No cap: tax based on current market value
	return taxableValue * rules.AvgEffectiveRate
}

// ProjectHomeInsurance projects homeowner's insurance for a future year
func (esc *PropertyCostEscalator) ProjectHomeInsurance(
	profile PropertyProfile,
	targetYear int,
) float64 {
	yearsFromNow := targetYear - 2024 // From current year

	// Base inflation
	inflationRate := esc.insuranceInflation

	// Adjust for risk factors
	if profile.IsCoastal || profile.IsWildfireZone || profile.IsFloodZone {
		inflationRate += 0.03 // Additional 3% for high-risk areas
	}

	return profile.HomeInsurance * math.Pow(1+inflationRate, float64(yearsFromNow))
}

// ProjectHOAFees projects HOA fees for a future year
func (esc *PropertyCostEscalator) ProjectHOAFees(
	profile PropertyProfile,
	targetYear int,
) float64 {
	if profile.HOAFees == 0 {
		return 0
	}

	yearsFromNow := targetYear - 2024
	return profile.HOAFees * math.Pow(1+esc.hoaInflation, float64(yearsFromNow))
}

// ProjectRoutineMaintenance projects routine maintenance costs
func (esc *PropertyCostEscalator) ProjectRoutineMaintenance(
	profile PropertyProfile,
	targetYear int,
) float64 {
	yearsFromNow := targetYear - 2024
	propertyAge := targetYear - profile.YearBuilt

	// Base maintenance: 1-2% of home value
	maintenanceRate := 0.01
	if propertyAge > 20 {
		maintenanceRate = 0.02
	} else if propertyAge > 30 {
		maintenanceRate = 0.025
	}

	// Project home value with appreciation
	futureHomeValue := profile.CurrentValue * math.Pow(1.03, float64(yearsFromNow))

	// Calculate maintenance cost
	baseMaintenance := futureHomeValue * maintenanceRate

	return baseMaintenance
}

// ProjectMajorRepairs projects major repair/replacement costs for a year
func (esc *PropertyCostEscalator) ProjectMajorRepairs(
	profile PropertyProfile,
	targetYear int,
) float64 {
	propertyAge := targetYear - profile.YearBuilt
	var totalRepairs float64

	// Check each major system
	for system, lifespan := range esc.majorRepairLifespan {
		// Check if replacement is due in target year
		if propertyAge%lifespan == 0 && propertyAge > 0 {
			cost := esc.majorRepairCosts[system]

			// Inflate cost to target year
			yearsFromNow := targetYear - 2024
			inflatedCost := cost * math.Pow(1+esc.maintenanceInflation, float64(yearsFromNow))

			totalRepairs += inflatedCost
		}
	}

	return totalRepairs
}

// ProjectTotalPropertyCosts projects all property costs for a future year
func (esc *PropertyCostEscalator) ProjectTotalPropertyCosts(
	profile PropertyProfile,
	targetYear int,
) PropertyCostProjection {
	projection := PropertyCostProjection{
		Year:               targetYear,
		PropertyTax:        esc.ProjectPropertyTax(profile, targetYear),
		HomeInsurance:      esc.ProjectHomeInsurance(profile, targetYear),
		HOAFees:            esc.ProjectHOAFees(profile, targetYear),
		RoutineMaintenance: esc.ProjectRoutineMaintenance(profile, targetYear),
		MajorRepairs:       esc.ProjectMajorRepairs(profile, targetYear),
	}

	projection.TotalAnnualCost = projection.PropertyTax +
		projection.HomeInsurance +
		projection.HOAFees +
		projection.RoutineMaintenance +
		projection.MajorRepairs

	return projection
}

// ProjectCostSeries projects costs for a range of years
func (esc *PropertyCostEscalator) ProjectCostSeries(
	profile PropertyProfile,
	startYear int,
	endYear int,
) []PropertyCostProjection {
	projections := make([]PropertyCostProjection, 0)

	for year := startYear; year <= endYear; year++ {
		projection := esc.ProjectTotalPropertyCosts(profile, year)
		projections = append(projections, projection)
	}

	return projections
}

// Calculate30YearTotalCost calculates total property ownership cost over 30 years
func (esc *PropertyCostEscalator) Calculate30YearTotalCost(profile PropertyProfile) float64 {
	var totalCost float64

	for year := 2024; year < 2054; year++ {
		projection := esc.ProjectTotalPropertyCosts(profile, year)
		totalCost += projection.TotalAnnualCost
	}

	return totalCost
}

// EstimateMonthlyCarryCost estimates current monthly carrying cost
func (esc *PropertyCostEscalator) EstimateMonthlyCarryCost(profile PropertyProfile) float64 {
	projection := esc.ProjectTotalPropertyCosts(profile, 2024)
	return projection.TotalAnnualCost / 12.0
}

// CompareStates compares property costs across states
func (esc *PropertyCostEscalator) CompareStates(
	homeValue float64,
	states []string,
) map[string]float64 {
	comparison := make(map[string]float64)

	for _, state := range states {
		rules := esc.stateRules[state]

		// Calculate annual property tax
		taxableValue := homeValue
		if rules.HasHomesteadExemption {
			taxableValue -= rules.HomesteadExemptionAmount
		}

		annualTax := taxableValue * rules.AvgEffectiveRate
		comparison[state] = annualTax
	}

	return comparison
}

// EstimateMaintenanceReserve estimates how much to reserve for maintenance
func (esc *PropertyCostEscalator) EstimateMaintenanceReserve(
	profile PropertyProfile,
	yearsAhead int,
) float64 {
	var totalReserve float64

	currentYear := 2024
	for year := currentYear; year < currentYear+yearsAhead; year++ {
		projection := esc.ProjectTotalPropertyCosts(profile, year)

		// Reserve needed: routine maintenance + amortized major repairs
		yearlyReserve := projection.RoutineMaintenance + (projection.MajorRepairs / float64(yearsAhead))
		totalReserve += yearlyReserve
	}

	return totalReserve
}

// SetCustomInflationRates allows custom inflation rate overrides
func (esc *PropertyCostEscalator) SetCustomInflationRates(
	propertyTax float64,
	insurance float64,
	hoa float64,
	maintenance float64,
) {
	if propertyTax >= 0 {
		esc.propertyTaxInflation = propertyTax
	}
	if insurance >= 0 {
		esc.insuranceInflation = insurance
	}
	if hoa >= 0 {
		esc.hoaInflation = hoa
	}
	if maintenance >= 0 {
		esc.maintenanceInflation = maintenance
	}
}
