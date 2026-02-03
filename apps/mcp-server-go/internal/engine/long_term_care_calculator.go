package engine

import (
	"math"
)

/**
 * Long-Term Care Cost Calculator
 *
 * Models long-term care costs and insurance benefits for retirement planning.
 * Critical for retirees to understand potential healthcare spending in later years.
 *
 * Cost Ranges (2024 National Averages):
 * - Nursing Home (Private Room): $116,800/year ($320/day)
 * - Nursing Home (Semi-Private): $105,200/year ($288/day)
 * - Assisted Living Facility: $64,200/year ($5,350/month)
 * - Adult Day Health Care: $21,320/year ($82/day)
 * - Home Health Aide: $75,504/year ($33/hour * 44 hours/week)
 * - Homemaker Services: $68,640/year ($30/hour * 44 hours/week)
 *
 * Duration Statistics:
 * - Average LTC need: 3 years
 * - 70% of 65+ will need some form of LTC
 * - 20% will need care for 5+ years
 * - Women need care longer than men (3.7 vs 2.2 years average)
 *
 * Cost Escalation:
 * - Healthcare inflation: ~5% per year (vs 2.5% general inflation)
 * - Regional variation: 40% higher in expensive areas (NYC, SF)
 *
 * Medicaid Coverage:
 * - Covers ~60% of nursing home residents
 * - Asset limit: $2,000 individual / $148,620 couple (2024)
 * - Income limit: varies by state ($2,829/month federal SSI limit)
 * - 5-year look-back for asset transfers
 * - Community spouse resource allowance (CSRA): $148,620
 *
 * LTC Insurance:
 * - Daily benefit amount: $100-$400/day typical
 * - Benefit period: 2-5 years typical
 * - Elimination period: 30-90 days (deductible)
 * - Inflation protection: 3-5% compound
 *
 * Planning Strategies:
 * - Self-insure if net worth >$2M
 * - LTC insurance if net worth $200K-$2M
 * - Medicaid planning if net worth <$200K
 * - Hybrid life/LTC policies for younger buyers
 *
 * References:
 * - Genworth Cost of Care Survey (2024)
 * - U.S. Department of Health and Human Services
 * - National Clearinghouse for Long-Term Care Information
 * - Medicaid.gov
 */

// LongTermCareLevel represents care intensity levels
type LongTermCareLevel int

const (
	LTCNone LongTermCareLevel = iota
	LTCHomemaker                    // Light assistance at home
	LTCHomeHealthAide               // Medical assistance at home
	LTCAdultDaycare                 // Part-time facility care
	LTCAssistedLiving               // Residential care
	LTCNursingHomeSemiPrivate       // Skilled nursing, shared room
	LTCNursingHomePrivate           // Skilled nursing, private room
)

// LongTermCareProfile holds user's LTC planning information
type LongTermCareProfile struct {
	// Demographics
	CurrentAge        int
	Gender            string // "male" or "female" (women need care longer)
	MaritalStatus     string // "single" or "married"

	// Health status
	HasChronicConditions bool
	FamilyHistory        string // "low", "average", "high" risk

	// Financial
	CurrentNetWorth      float64
	HasLTCInsurance      bool
	LTCDailyBenefit      float64 // Insurance daily benefit
	LTCBenefitPeriod     int     // Years of coverage
	LTCEliminationPeriod int     // Days before insurance pays
	LTCInflationProtection float64 // Annual increase in benefit

	// Location
	StateCode            string
	CostOfLivingFactor   float64 // 1.0 = national average, 1.4 = 40% higher

	// Preferences
	PreferredCareLevel   LongTermCareLevel
}

// LongTermCareCosts holds annual cost estimates by care level
type LongTermCareCosts struct {
	Homemaker             float64
	HomeHealthAide        float64
	AdultDaycare          float64
	AssistedLiving        float64
	NursingHomeSemiPrivate float64
	NursingHomePrivate    float64
}

// LongTermCareScenario models a potential care need scenario
type LongTermCareScenario struct {
	StartAge       int               // Age when care starts
	DurationYears  float64           // Years of care needed
	CareLevel      LongTermCareLevel // Level of care
	TotalCost      float64           // Total cost (inflation-adjusted)
	InsurancePays  float64           // Amount insurance covers
	OutOfPocket    float64           // Amount user pays
	MedicaidCovers bool              // Whether Medicaid will cover
}

// LongTermCareCalculator calculates LTC costs and insurance benefits
type LongTermCareCalculator struct {
	// National average costs (2024)
	baseCosts LongTermCareCosts

	// Cost escalation
	healthcareInflation float64 // Default 5% per year

	// Probability tables
	needCareProbability map[int]float64 // Age -> probability of needing care
}

// NewLongTermCareCalculator creates a calculator with 2024 cost data
func NewLongTermCareCalculator() *LongTermCareCalculator {
	calc := &LongTermCareCalculator{
		baseCosts: LongTermCareCosts{
			Homemaker:             68640,  // $30/hr * 44 hrs/wk * 52 weeks
			HomeHealthAide:        75504,  // $33/hr * 44 hrs/wk * 52 weeks
			AdultDaycare:          21320,  // $82/day * 260 days
			AssistedLiving:        64200,  // $5,350/month * 12
			NursingHomeSemiPrivate: 105200, // $288/day * 365
			NursingHomePrivate:    116800, // $320/day * 365
		},
		healthcareInflation: 0.05, // 5% per year
		needCareProbability: make(map[int]float64),
	}

	calc.initializeProbabilities()
	return calc
}

// initializeProbabilities sets up age-based care probability tables
func (calc *LongTermCareCalculator) initializeProbabilities() {
	// Probability of needing LTC by age
	// Source: U.S. Department of Health and Human Services
	calc.needCareProbability[65] = 0.35
	calc.needCareProbability[70] = 0.45
	calc.needCareProbability[75] = 0.55
	calc.needCareProbability[80] = 0.70
	calc.needCareProbability[85] = 0.85
	calc.needCareProbability[90] = 0.95
}

// SetHealthcareInflation updates healthcare inflation rate
func (calc *LongTermCareCalculator) SetHealthcareInflation(rate float64) {
	calc.healthcareInflation = rate
}

// GetAnnualCost returns annual cost for a given care level at current prices
func (calc *LongTermCareCalculator) GetAnnualCost(
	careLevel LongTermCareLevel,
	costOfLivingFactor float64,
) float64 {
	var baseCost float64

	switch careLevel {
	case LTCHomemaker:
		baseCost = calc.baseCosts.Homemaker
	case LTCHomeHealthAide:
		baseCost = calc.baseCosts.HomeHealthAide
	case LTCAdultDaycare:
		baseCost = calc.baseCosts.AdultDaycare
	case LTCAssistedLiving:
		baseCost = calc.baseCosts.AssistedLiving
	case LTCNursingHomeSemiPrivate:
		baseCost = calc.baseCosts.NursingHomeSemiPrivate
	case LTCNursingHomePrivate:
		baseCost = calc.baseCosts.NursingHomePrivate
	default:
		return 0
	}

	return baseCost * costOfLivingFactor
}

// ProjectCost projects future cost with healthcare inflation
func (calc *LongTermCareCalculator) ProjectCost(
	currentCost float64,
	yearsInFuture int,
) float64 {
	return currentCost * math.Pow(1+calc.healthcareInflation, float64(yearsInFuture))
}

// EstimateCareNeedDuration estimates years of care needed based on demographics
func (calc *LongTermCareCalculator) EstimateCareNeedDuration(profile LongTermCareProfile) float64 {
	// Base duration (years)
	baseDuration := 3.0

	// Adjust for gender (women need care longer)
	if profile.Gender == "female" {
		baseDuration = 3.7
	} else {
		baseDuration = 2.2
	}

	// Adjust for health status
	if profile.HasChronicConditions {
		baseDuration += 1.0
	}

	// Adjust for family history
	switch profile.FamilyHistory {
	case "high":
		baseDuration += 1.5
	case "low":
		baseDuration -= 0.5
	}

	if baseDuration < 0.5 {
		baseDuration = 0.5
	}

	return baseDuration
}

// EstimateCareStartAge estimates likely age when care will be needed
func (calc *LongTermCareCalculator) EstimateCareStartAge(profile LongTermCareProfile) int {
	// Base start age
	baseAge := 82

	// Adjust for chronic conditions
	if profile.HasChronicConditions {
		baseAge -= 5
	}

	// Adjust for family history
	switch profile.FamilyHistory {
	case "high":
		baseAge -= 5
	case "low":
		baseAge += 5
	}

	return baseAge
}

// CalculateLifetimeLTCCost calculates total lifetime LTC cost
func (calc *LongTermCareCalculator) CalculateLifetimeLTCCost(profile LongTermCareProfile) float64 {
	// Estimate when care starts and duration
	startAge := calc.EstimateCareStartAge(profile)
	durationYears := calc.EstimateCareNeedDuration(profile)

	// Get annual cost
	annualCost := calc.GetAnnualCost(profile.PreferredCareLevel, profile.CostOfLivingFactor)

	// Project cost to future year
	yearsUntilCare := startAge - profile.CurrentAge
	if yearsUntilCare < 0 {
		yearsUntilCare = 0
	}
	futureCost := calc.ProjectCost(annualCost, yearsUntilCare)

	// Total cost over duration (with continued inflation)
	var totalCost float64
	for year := 0; year < int(durationYears); year++ {
		yearCost := futureCost * math.Pow(1+calc.healthcareInflation, float64(year))
		totalCost += yearCost
	}

	return totalCost
}

// CalculateInsuranceBenefit calculates how much LTC insurance will pay
func (calc *LongTermCareCalculator) CalculateInsuranceBenefit(
	profile LongTermCareProfile,
	scenarioStartAge int,
	scenarioDuration float64,
	actualDailyCost float64,
) float64 {
	if !profile.HasLTCInsurance {
		return 0
	}

	// Calculate daily benefit with inflation protection
	yearsUntilClaim := scenarioStartAge - profile.CurrentAge
	if yearsUntilClaim < 0 {
		yearsUntilClaim = 0
	}

	inflatedDailyBenefit := profile.LTCDailyBenefit
	if profile.LTCInflationProtection > 0 {
		inflatedDailyBenefit *= math.Pow(1+profile.LTCInflationProtection, float64(yearsUntilClaim))
	}

	// Calculate days covered
	totalDays := scenarioDuration * 365
	eliminationDays := float64(profile.LTCEliminationPeriod)
	maxBenefitDays := float64(profile.LTCBenefitPeriod) * 365

	coveredDays := totalDays - eliminationDays
	if coveredDays > maxBenefitDays {
		coveredDays = maxBenefitDays
	}
	if coveredDays < 0 {
		coveredDays = 0
	}

	// Insurance pays lesser of daily benefit or actual cost
	dailyPayment := inflatedDailyBenefit
	if actualDailyCost < inflatedDailyBenefit {
		dailyPayment = actualDailyCost
	}

	return dailyPayment * coveredDays
}

// CheckMedicaidEligibility determines if user would qualify for Medicaid
func (calc *LongTermCareCalculator) CheckMedicaidEligibility(
	profile LongTermCareProfile,
	remainingAssets float64,
) bool {
	// Federal asset limit (2024)
	assetLimit := 2000.0

	// Married couples have higher limit (community spouse resource allowance)
	if profile.MaritalStatus == "married" {
		assetLimit = 148620.0 // 2024 CSRA
	}

	return remainingAssets <= assetLimit
}

// ModelLTCScenario models a complete LTC scenario with costs and coverage
func (calc *LongTermCareCalculator) ModelLTCScenario(
	profile LongTermCareProfile,
	startAge int,
	durationYears float64,
	careLevel LongTermCareLevel,
) LongTermCareScenario {
	scenario := LongTermCareScenario{
		StartAge:      startAge,
		DurationYears: durationYears,
		CareLevel:     careLevel,
	}

	// Calculate annual cost
	annualCost := calc.GetAnnualCost(careLevel, profile.CostOfLivingFactor)
	dailyCost := annualCost / 365.0

	// Project cost to future
	yearsUntilCare := startAge - profile.CurrentAge
	if yearsUntilCare < 0 {
		yearsUntilCare = 0
	}

	// Calculate total cost with inflation
	for year := 0; year < int(durationYears); year++ {
		yearCost := annualCost * math.Pow(1+calc.healthcareInflation, float64(yearsUntilCare+year))
		scenario.TotalCost += yearCost
	}

	// Calculate insurance benefit
	futureDailyCost := dailyCost * math.Pow(1+calc.healthcareInflation, float64(yearsUntilCare))
	scenario.InsurancePays = calc.CalculateInsuranceBenefit(profile, startAge, durationYears, futureDailyCost)

	// Calculate out-of-pocket
	scenario.OutOfPocket = scenario.TotalCost - scenario.InsurancePays

	// Check Medicaid eligibility after spending down assets
	remainingAssets := profile.CurrentNetWorth - scenario.OutOfPocket
	scenario.MedicaidCovers = calc.CheckMedicaidEligibility(profile, remainingAssets)

	return scenario
}

// GenerateProbabilityWeightedScenarios generates multiple scenarios with probabilities
func (calc *LongTermCareCalculator) GenerateProbabilityWeightedScenarios(
	profile LongTermCareProfile,
) []LongTermCareScenario {
	scenarios := make([]LongTermCareScenario, 0)

	// Scenario 1: No care needed (30% probability for age 65)
	// Implicitly handled by 70% need care statistic

	// Scenario 2: Short duration, assisted living (30% probability)
	scenarios = append(scenarios, calc.ModelLTCScenario(
		profile,
		calc.EstimateCareStartAge(profile),
		2.0,
		LTCAssistedLiving,
	))

	// Scenario 3: Average duration, nursing home semi-private (40% probability)
	scenarios = append(scenarios, calc.ModelLTCScenario(
		profile,
		calc.EstimateCareStartAge(profile),
		calc.EstimateCareNeedDuration(profile),
		LTCNursingHomeSemiPrivate,
	))

	// Scenario 4: Long duration, nursing home private (20% probability)
	scenarios = append(scenarios, calc.ModelLTCScenario(
		profile,
		calc.EstimateCareStartAge(profile)-3,
		calc.EstimateCareNeedDuration(profile)+2.0,
		LTCNursingHomePrivate,
	))

	// Scenario 5: Home health aide (10% probability)
	scenarios = append(scenarios, calc.ModelLTCScenario(
		profile,
		calc.EstimateCareStartAge(profile),
		calc.EstimateCareNeedDuration(profile),
		LTCHomeHealthAide,
	))

	return scenarios
}

// CalculateExpectedLTCCost calculates probability-weighted expected cost
func (calc *LongTermCareCalculator) CalculateExpectedLTCCost(profile LongTermCareProfile) float64 {
	scenarios := calc.GenerateProbabilityWeightedScenarios(profile)

	// Probability weights
	weights := []float64{0.30, 0.40, 0.20, 0.10}

	var expectedCost float64
	for i, scenario := range scenarios {
		expectedCost += scenario.OutOfPocket * weights[i]
	}

	// Apply overall probability of needing care (70% for 65-year-old)
	needCareProbability := 0.70
	if profile.CurrentAge >= 70 {
		needCareProbability = 0.80
	}
	if profile.CurrentAge >= 80 {
		needCareProbability = 0.90
	}

	return expectedCost * needCareProbability
}

// RecommendLTCInsurance recommends whether to buy LTC insurance
func (calc *LongTermCareCalculator) RecommendLTCInsurance(profile LongTermCareProfile) string {
	netWorth := profile.CurrentNetWorth

	// Self-insure if very wealthy
	if netWorth > 2000000 {
		return "Self-insure: Net worth sufficient to cover LTC costs"
	}

	// Medicaid planning if low assets
	if netWorth < 200000 {
		return "Medicaid planning: Assets likely insufficient for insurance premiums"
	}

	// LTC insurance recommended for middle wealth
	expectedCost := calc.CalculateExpectedLTCCost(profile)
	if expectedCost > netWorth*0.30 {
		return "LTC insurance recommended: Expected costs would significantly deplete assets"
	}

	return "LTC insurance optional: Moderate expected costs relative to assets"
}

// GetCostByState returns state-specific cost adjustment factor
func (calc *LongTermCareCalculator) GetCostByState(stateCode string) float64 {
	// Cost of living adjustment factors by state (relative to national average)
	stateCosts := map[string]float64{
		"AK": 1.30, "HI": 1.40, "CT": 1.35, "MA": 1.35, "NY": 1.40,
		"CA": 1.35, "NJ": 1.35, "MD": 1.25, "WA": 1.30, "NH": 1.25,
		"CO": 1.20, "IL": 1.15, "OR": 1.20, "RI": 1.20, "VT": 1.20,
		"DE": 1.15, "MN": 1.15, "VA": 1.15, "FL": 1.10, "PA": 1.10,
		// Low-cost states
		"TX": 0.95, "OK": 0.85, "KS": 0.85, "AR": 0.80, "MS": 0.75,
		"AL": 0.80, "KY": 0.85, "LA": 0.85, "MO": 0.85, "TN": 0.85,
	}

	if factor, exists := stateCosts[stateCode]; exists {
		return factor
	}

	return 1.0 // National average
}
