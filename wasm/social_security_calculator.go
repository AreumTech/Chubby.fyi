package main

import (
	"math"
)

/**
 * Social Security Benefits Calculator
 *
 * Calculates Social Security retirement benefits with claiming age optimization.
 * Supports individual, spousal, and survivor benefits with accurate SSA rules.
 *
 * Key Features:
 * - Claiming age 62-70 (age 62 = 70% of FRA benefit, age 70 = 124% of FRA benefit)
 * - Full Retirement Age (FRA): 67 for those born 1960+
 * - Spousal benefits (up to 50% of higher earner's PIA)
 * - Survivor benefits (100% of deceased spouse's benefit)
 * - COLA adjustments (2.5% historical average)
 * - Early claiming reduction (5/9% per month for first 36 months, 5/12% thereafter)
 * - Delayed retirement credits (8% per year from FRA to 70)
 * - Earnings test if claiming before FRA
 *
 * Claiming Age Impacts:
 * - Age 62: ~70% of FRA benefit (30% permanent reduction)
 * - Age 67 (FRA): 100% of FRA benefit
 * - Age 70: 124% of FRA benefit (24% increase)
 *
 * Break-Even Analysis:
 * - Claiming at 62 vs 70 breaks even around age 80-81
 * - Earlier claiming better if: poor health, need income, no other assets
 * - Later claiming better if: good health, longevity in family, sufficient assets
 *
 * Spousal Benefits:
 * - Spouse can claim up to 50% of primary worker's PIA (at spouse's FRA)
 * - Reduced if claimed before spouse's FRA
 * - Cannot claim spousal until primary worker files
 * - Spousal benefit is greater of: own benefit or 50% of spouse's PIA
 *
 * References:
 * - SSA Publication "Retirement Benefits" (2024)
 * - SSA Publication "When to Start Receiving Benefits" (2024)
 * - SSA Actuarial Tables
 * - "Build a Robo-Advisor with Python" Chapter 9
 */

// SocialSecurityProfile holds user's Social Security earnings profile
type SocialSecurityProfile struct {
	BirthYear              int     // Year of birth
	FullRetirementAge      int     // FRA in years (typically 67)
	PrimaryInsuranceAmount float64 // PIA - monthly benefit at FRA

	// Optional: Spousal information
	HasSpouse            bool
	SpouseBirthYear      int
	SpouseFRA            int
	SpousePIA            float64
	SpouseClaimingAge    int     // Age spouse plans to claim

	// Claiming strategy
	PlannedClaimingAge   int     // Age to start claiming (62-70)

	// For earnings test (if claiming before FRA and still working)
	StillWorking         bool
	AnnualEarnings       float64
}

// SocialSecurityCalculator calculates Social Security benefits
type SocialSecurityCalculator struct {
	// COLA adjustment rate (historical average ~2.5%)
	colaRate float64

	// Earnings test limits (2024 values, adjust annually)
	earningsTestLimitBeforeFRA float64 // $22,320 (2024)
	earningsTestLimitFRAYear   float64 // $59,520 (2024)

	// Reduction amounts
	reductionPerMonthFirst36   float64 // 5/9 of 1% = 0.00555...
	reductionPerMonthAfter36   float64 // 5/12 of 1% = 0.004166...

	// Delayed retirement credit
	delayedCreditPerYear       float64 // 8% per year = 0.08
}

// NewSocialSecurityCalculator creates a calculator with SSA rules
func NewSocialSecurityCalculator() *SocialSecurityCalculator {
	return &SocialSecurityCalculator{
		colaRate:                   0.025,  // 2.5% historical average
		earningsTestLimitBeforeFRA: 22320,  // 2024 limit
		earningsTestLimitFRAYear:   59520,  // 2024 limit
		reductionPerMonthFirst36:   5.0 / 9.0 / 100.0,  // 0.555%
		reductionPerMonthAfter36:   5.0 / 12.0 / 100.0, // 0.4166%
		delayedCreditPerYear:       0.08,   // 8% per year
	}
}

// SetCOLARate updates the COLA adjustment rate (default 2.5%)
func (calc *SocialSecurityCalculator) SetCOLARate(rate float64) {
	calc.colaRate = rate
}

// CalculateMonthlyBenefit calculates monthly Social Security benefit at a given claiming age
func (calc *SocialSecurityCalculator) CalculateMonthlyBenefit(
	profile SocialSecurityProfile,
	claimingAge int,
) float64 {
	if claimingAge < 62 {
		return 0 // Cannot claim before 62
	}
	if claimingAge > 70 {
		claimingAge = 70 // No benefit to waiting past 70
	}

	pia := profile.PrimaryInsuranceAmount
	fra := profile.FullRetirementAge

	// Calculate adjustment factor based on claiming age
	adjustmentFactor := calc.getAdjustmentFactor(claimingAge, fra)

	// Base monthly benefit
	monthlyBenefit := pia * adjustmentFactor

	return monthlyBenefit
}

// getAdjustmentFactor returns benefit adjustment factor for claiming age vs FRA
func (calc *SocialSecurityCalculator) getAdjustmentFactor(claimingAge int, fra int) float64 {
	if claimingAge == fra {
		return 1.0 // 100% at FRA
	}

	if claimingAge < fra {
		// Early claiming reduction
		monthsEarly := (fra - claimingAge) * 12

		// First 36 months: 5/9 of 1% per month
		// After 36 months: 5/12 of 1% per month
		var reduction float64
		if monthsEarly <= 36 {
			reduction = float64(monthsEarly) * calc.reductionPerMonthFirst36
		} else {
			reduction = 36 * calc.reductionPerMonthFirst36
			reduction += float64(monthsEarly-36) * calc.reductionPerMonthAfter36
		}

		return 1.0 - reduction
	}

	// Delayed claiming (after FRA)
	yearsDelayed := claimingAge - fra
	delayedCredit := float64(yearsDelayed) * calc.delayedCreditPerYear
	return 1.0 + delayedCredit
}

// CalculateAnnualBenefit calculates annual benefit (monthly * 12)
func (calc *SocialSecurityCalculator) CalculateAnnualBenefit(
	profile SocialSecurityProfile,
	claimingAge int,
) float64 {
	return calc.CalculateMonthlyBenefit(profile, claimingAge) * 12
}

// CalculateBenefitWithCOLA calculates benefit at a future year with COLA adjustments
func (calc *SocialSecurityCalculator) CalculateBenefitWithCOLA(
	profile SocialSecurityProfile,
	claimingAge int,
	yearsClaimed int, // How many years since claiming
) float64 {
	baseBenefit := calc.CalculateMonthlyBenefit(profile, claimingAge)

	// Apply COLA adjustments
	adjustedBenefit := baseBenefit * math.Pow(1+calc.colaRate, float64(yearsClaimed))

	return adjustedBenefit
}

// CalculateSpousalBenefit calculates spousal benefit amount
func (calc *SocialSecurityCalculator) CalculateSpousalBenefit(
	primaryWorkerPIA float64,
	spouseOwnPIA float64,
	spouseClaimingAge int,
	spouseFRA int,
) float64 {
	// Spousal benefit is 50% of primary worker's PIA at spouse's FRA
	spousalBenefitAtFRA := primaryWorkerPIA * 0.5

	// If spouse has their own benefit, they get the higher amount
	if spouseOwnPIA > spousalBenefitAtFRA {
		// Use own benefit instead
		return calc.CalculateMonthlyBenefit(
			SocialSecurityProfile{
				PrimaryInsuranceAmount: spouseOwnPIA,
				FullRetirementAge:      spouseFRA,
			},
			spouseClaimingAge,
		)
	}

	// Apply early claiming reduction to spousal benefit
	if spouseClaimingAge < spouseFRA {
		// Spousal benefits reduce by 25/36% per month early (different from own benefit!)
		monthsEarly := (spouseFRA - spouseClaimingAge) * 12
		reductionPerMonth := 25.0 / 36.0 / 100.0 // 0.6944%
		reduction := float64(monthsEarly) * reductionPerMonth
		if reduction > 0.30 { // Max 30% reduction
			reduction = 0.30
		}
		return spousalBenefitAtFRA * (1.0 - reduction)
	}

	return spousalBenefitAtFRA
}

// CalculateSurvivorBenefit calculates survivor benefit (100% of deceased spouse's benefit)
func (calc *SocialSecurityCalculator) CalculateSurvivorBenefit(
	deceasedSpouseBenefit float64,
	survivorClaimingAge int,
	survivorFRA int,
) float64 {
	// Survivor can claim reduced benefit as early as 60 (or 50 if disabled)
	if survivorClaimingAge < 60 {
		return 0
	}

	// At survivor's FRA, receives 100% of deceased spouse's benefit
	if survivorClaimingAge >= survivorFRA {
		return deceasedSpouseBenefit
	}

	// Early claiming reduces survivor benefit
	// Reduction: ~28.5% at age 60, linear to 0% at FRA
	monthsEarly := (survivorFRA - survivorClaimingAge) * 12
	maxMonthsEarly := (survivorFRA - 60) * 12 // Typically 84 months (7 years)
	if maxMonthsEarly <= 0 {
		maxMonthsEarly = 84
	}

	reductionFactor := 0.285 * (float64(monthsEarly) / float64(maxMonthsEarly))

	return deceasedSpouseBenefit * (1.0 - reductionFactor)
}

// OptimizeClaimingAge finds optimal claiming age for single individual
func (calc *SocialSecurityCalculator) OptimizeClaimingAge(
	profile SocialSecurityProfile,
	expectedLongevity int, // Expected age at death
	discountRate float64,  // Time value of money (e.g., 0.03 for 3%)
) int {
	if expectedLongevity <= 62 {
		return 62 // Claim ASAP if short life expectancy
	}
	if expectedLongevity > 95 {
		expectedLongevity = 95 // Cap at 95
	}

	// Calculate lifetime present value for each claiming age
	var bestAge int
	var maxPV float64

	for claimingAge := 62; claimingAge <= 70; claimingAge++ {
		pv := calc.calculateLifetimePV(profile, claimingAge, expectedLongevity, discountRate)
		if pv > maxPV {
			maxPV = pv
			bestAge = claimingAge
		}
	}

	return bestAge
}

// calculateLifetimePV calculates present value of lifetime benefits
func (calc *SocialSecurityCalculator) calculateLifetimePV(
	profile SocialSecurityProfile,
	claimingAge int,
	deathAge int,
	discountRate float64,
) float64 {
	monthlyBenefit := calc.CalculateMonthlyBenefit(profile, claimingAge)

	var pv float64
	currentAge := claimingAge

	for age := currentAge; age <= deathAge; age++ {
		yearsFromClaim := age - claimingAge

		// Apply COLA
		adjustedBenefit := monthlyBenefit * math.Pow(1+calc.colaRate, float64(yearsFromClaim))
		annualBenefit := adjustedBenefit * 12

		// Discount to present value
		yearsFromNow := age - profile.BirthYear - currentAge // Simplified
		discountFactor := math.Pow(1+discountRate, -float64(yearsFromNow))
		pv += annualBenefit * discountFactor
	}

	return pv
}

// GetBreakEvenAge calculates break-even age for claiming early vs late
func (calc *SocialSecurityCalculator) GetBreakEvenAge(
	profile SocialSecurityProfile,
	earlyAge int,   // e.g., 62
	lateAge int,    // e.g., 70
) int {
	earlyBenefit := calc.CalculateMonthlyBenefit(profile, earlyAge)
	lateBenefit := calc.CalculateMonthlyBenefit(profile, lateAge)

	// Calculate cumulative benefits over time
	var earlyTotal float64
	var lateTotal float64

	for age := earlyAge; age <= 100; age++ {
		// Early claiming gets benefits now
		yearsFromEarlyClaim := age - earlyAge
		earlyTotal += earlyBenefit * math.Pow(1+calc.colaRate, float64(yearsFromEarlyClaim)) * 12

		// Late claiming starts later
		if age >= lateAge {
			yearsFromLateClaim := age - lateAge
			lateTotal += lateBenefit * math.Pow(1+calc.colaRate, float64(yearsFromLateClaim)) * 12
		}

		// Find crossover point
		if lateTotal > earlyTotal && age > lateAge {
			return age
		}
	}

	return 100 // Never breaks even by age 100
}

// EstimatePIAFromAIME estimates PIA from Average Indexed Monthly Earnings
func (calc *SocialSecurityCalculator) EstimatePIAFromAIME(aime float64, year int) float64 {
	// 2024 bend points (adjust annually)
	bendPoint1 := 1174.0
	bendPoint2 := 7078.0

	// PIA formula (2024):
	// - 90% of first $1,174 of AIME
	// - 32% of AIME between $1,174 and $7,078
	// - 15% of AIME over $7,078

	var pia float64

	if aime <= bendPoint1 {
		pia = aime * 0.90
	} else if aime <= bendPoint2 {
		pia = bendPoint1 * 0.90
		pia += (aime - bendPoint1) * 0.32
	} else {
		pia = bendPoint1 * 0.90
		pia += (bendPoint2 - bendPoint1) * 0.32
		pia += (aime - bendPoint2) * 0.15
	}

	return pia
}

// EstimatePIAFromCareerEarnings estimates PIA from career average earnings
func (calc *SocialSecurityCalculator) EstimatePIAFromCareerEarnings(
	averageAnnualEarnings float64,
	yearsWorked int,
) float64 {
	// Simplified estimation using highest 35 years
	if yearsWorked < 35 {
		// Penalize for having fewer than 35 years
		averageAnnualEarnings = averageAnnualEarnings * float64(yearsWorked) / 35.0
	}

	// Convert annual to monthly
	aime := averageAnnualEarnings / 12.0

	// Apply Social Security wage base cap (approximation)
	// 2024 cap is $168,600 annually = $14,050 monthly
	if aime > 14050 {
		aime = 14050
	}

	return calc.EstimatePIAFromAIME(aime, 2024)
}

// ApplyEarningsTest applies earnings test if claiming before FRA and still working
func (calc *SocialSecurityCalculator) ApplyEarningsTest(
	monthlyBenefit float64,
	annualEarnings float64,
	age int,
	fra int,
) float64 {
	if age >= fra {
		return monthlyBenefit // No earnings test at or after FRA
	}

	// Earnings test: $1 reduction for every $2 over limit (before FRA year)
	var limit float64
	var reductionRatio float64

	if age == fra-1 {
		// Year of FRA: different (higher) limit
		limit = calc.earningsTestLimitFRAYear
		reductionRatio = 1.0 / 3.0 // $1 for every $3 over
	} else {
		// Before FRA year
		limit = calc.earningsTestLimitBeforeFRA
		reductionRatio = 0.5 // $1 for every $2 over
	}

	if annualEarnings <= limit {
		return monthlyBenefit // Under limit, no reduction
	}

	// Calculate reduction
	excessEarnings := annualEarnings - limit
	annualReduction := excessEarnings * reductionRatio
	monthlyReduction := annualReduction / 12.0

	adjustedBenefit := monthlyBenefit - monthlyReduction
	if adjustedBenefit < 0 {
		adjustedBenefit = 0
	}

	return adjustedBenefit
}

// GetFullRetirementAge returns FRA based on birth year
func (calc *SocialSecurityCalculator) GetFullRetirementAge(birthYear int) int {
	// SSA FRA schedule
	if birthYear <= 1937 {
		return 65
	}
	if birthYear >= 1960 {
		return 67
	}

	// Gradual increase from 65 to 67 for birth years 1938-1959
	// 1938-1942: 65 + 2 months per year = 65, 65.17, 65.33, 65.5, 65.67
	// 1943-1954: 66
	// 1955-1959: 66 + 2 months per year = 66.17, 66.33, 66.5, 66.67, 66.83

	if birthYear >= 1943 && birthYear <= 1954 {
		return 66
	}

	// Simplified: return 66 or 67
	if birthYear <= 1954 {
		return 66
	}
	return 67
}

// CalculateCoordinatedStrategy calculates optimal claiming for married couple
func (calc *SocialSecurityCalculator) CalculateCoordinatedStrategy(
	primaryProfile SocialSecurityProfile,
	spouseProfile SocialSecurityProfile,
	jointLifeExpectancy int, // Expected age of second-to-die
	discountRate float64,
) (primaryClaimingAge int, spouseClaimingAge int) {
	// Simplified heuristic for married couples:
	// 1. Higher earner should often delay to 70 (maximizes survivor benefit)
	// 2. Lower earner can claim earlier (less impact on survivor benefit)

	primaryPIA := primaryProfile.PrimaryInsuranceAmount
	spousePIA := spouseProfile.PrimaryInsuranceAmount

	// Determine higher earner
	if primaryPIA >= spousePIA {
		// Primary is higher earner - consider delaying
		primaryClaimingAge = calc.OptimizeClaimingAge(primaryProfile, jointLifeExpectancy, discountRate)

		// Spouse can claim earlier
		spouseClaimingAge = calc.OptimizeClaimingAge(spouseProfile, jointLifeExpectancy, discountRate)
		if spouseClaimingAge > primaryClaimingAge-2 {
			spouseClaimingAge = primaryClaimingAge - 2 // Claim a bit earlier
		}
	} else {
		// Spouse is higher earner - flip logic
		spouseClaimingAge = calc.OptimizeClaimingAge(spouseProfile, jointLifeExpectancy, discountRate)

		primaryClaimingAge = calc.OptimizeClaimingAge(primaryProfile, jointLifeExpectancy, discountRate)
		if primaryClaimingAge > spouseClaimingAge-2 {
			primaryClaimingAge = spouseClaimingAge - 2
		}
	}

	// Ensure within valid range
	if primaryClaimingAge < 62 {
		primaryClaimingAge = 62
	}
	if primaryClaimingAge > 70 {
		primaryClaimingAge = 70
	}
	if spouseClaimingAge < 62 {
		spouseClaimingAge = 62
	}
	if spouseClaimingAge > 70 {
		spouseClaimingAge = 70
	}

	return primaryClaimingAge, spouseClaimingAge
}

// GetReductionPercentage returns total reduction percentage for early claiming
func (calc *SocialSecurityCalculator) GetReductionPercentage(claimingAge int, fra int) float64 {
	if claimingAge >= fra {
		return 0
	}

	factor := calc.getAdjustmentFactor(claimingAge, fra)
	return (1.0 - factor) * 100
}

// GetDelayedCreditPercentage returns total increase percentage for delayed claiming
func (calc *SocialSecurityCalculator) GetDelayedCreditPercentage(claimingAge int, fra int) float64 {
	if claimingAge <= fra {
		return 0
	}

	factor := calc.getAdjustmentFactor(claimingAge, fra)
	return (factor - 1.0) * 100
}
