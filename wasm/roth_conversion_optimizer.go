package main

// roth_conversion_optimizer.go
// Roth conversion optimizer for tax-efficient IRA → Roth conversions
// Reference: Python robo-advisor Chapter 9
//
// Key principle: Convert when in low tax brackets
// - Early retirement years (before RMDs, no W-2 income)
// - Fill up lower tax brackets (12%, 22%)
// - Avoid pushing into higher brackets
// - Balance immediate tax cost vs. future tax-free growth

import (
	"fmt"
	"math"
)

// RothConversionOptimizer handles optimal Roth conversion analysis
type RothConversionOptimizer struct {
	taxCalculator *TaxCalculator
	rmdCalculator *RMDCalculator
}

// NewRothConversionOptimizer creates a new Roth conversion optimizer
func NewRothConversionOptimizer(taxCalc *TaxCalculator, rmdCalc *RMDCalculator) *RothConversionOptimizer {
	return &RothConversionOptimizer{
		taxCalculator: taxCalc,
		rmdCalculator: rmdCalc,
	}
}

// ConversionOpportunity represents a potential Roth conversion scenario
type ConversionOpportunity struct {
	Year                 int
	Age                  int
	ConversionAmount     float64
	CurrentTaxableIncome float64
	ConversionTaxOwed    float64
	EffectiveTaxRate     float64
	MarginalTaxRate      float64
	TargetBracket        string
	RoomInBracket        float64
	Recommended          bool
	Reason               string
}

// ConversionStrategy defines the strategy for Roth conversions
type ConversionStrategy struct {
	// Target tax bracket to fill (e.g., "12%", "22%")
	TargetBracketName   string
	TargetBracketTop    float64 // Top of bracket in taxable income

	// Conversion constraints
	MaxAnnualConversion float64 // Max amount to convert per year
	MinAge              int     // Don't convert before this age
	MaxAge              int     // Don't convert after this age (e.g., before RMDs)

	// Decision criteria
	MaxEffectiveTaxRate float64 // Don't convert if effective rate exceeds this
	MaxMarginalTaxRate  float64 // Don't convert if marginal rate exceeds this

	// Planning horizon
	YearsUntilRMD       int     // Years until RMDs start
}

// RothConversionPlan represents a multi-year conversion plan
type RothConversionPlan struct {
	StartAge              int
	EndAge                int
	TotalAmountConverted  float64
	TotalTaxesPaid        float64
	Conversions           []ConversionOpportunity

	// Projected outcomes
	IRABalanceWithout     float64 // IRA balance without conversions
	IRABalanceWith        float64 // IRA balance after conversions
	RothBalanceWith       float64 // Roth balance after conversions
	EstimatedTaxSavings   float64 // Estimated lifetime tax savings
}

// EvaluateConversionOpportunity analyzes a potential conversion
func (opt *RothConversionOptimizer) EvaluateConversionOpportunity(
	age int,
	year int,
	currentTaxableIncome float64,
	conversionAmount float64,
	filingStatus FilingStatus,
	standardDeduction float64,
) ConversionOpportunity {

	// Calculate taxable income after conversion (IRA conversions are ordinary income)
	// Taxable income = gross income - standard deduction
	currentTaxable := math.Max(0, currentTaxableIncome-standardDeduction)
	newTaxable := math.Max(0, (currentTaxableIncome+conversionAmount)-standardDeduction)

	// Calculate current tax (before conversion)
	currentTax := opt.taxCalculator.CalculateFederalIncomeTax(currentTaxable)

	// Calculate new tax (after conversion)
	newTax := opt.taxCalculator.CalculateFederalIncomeTax(newTaxable)

	conversionTaxOwed := newTax - currentTax
	effectiveTaxRate := conversionTaxOwed / math.Max(0.01, conversionAmount)

	// Estimate marginal rate on the conversion
	marginalRate := 0.0
	if conversionAmount > 0 {
		marginalRate = effectiveTaxRate // Simplified - could calculate exact bracket
	}

	opportunity := ConversionOpportunity{
		Year:                 year,
		Age:                  age,
		ConversionAmount:     conversionAmount,
		CurrentTaxableIncome: currentTaxableIncome,
		ConversionTaxOwed:    conversionTaxOwed,
		EffectiveTaxRate:     effectiveTaxRate,
		MarginalTaxRate:      marginalRate,
		Recommended:          false,
	}

	// Determine if this is a good conversion opportunity
	// Good if:
	// 1. Effective tax rate is low (< 22%)
	// 2. Age is before RMDs (< 73)
	// 3. Low current income (retirement, before SS)

	if effectiveTaxRate < 0.15 {
		opportunity.Recommended = true
		opportunity.Reason = fmt.Sprintf("Excellent: %.1f%% tax rate (very low bracket)", effectiveTaxRate*100)
	} else if effectiveTaxRate < 0.22 {
		opportunity.Recommended = true
		opportunity.Reason = fmt.Sprintf("Good: %.1f%% tax rate (low bracket)", effectiveTaxRate*100)
	} else if effectiveTaxRate < 0.24 {
		opportunity.Recommended = false
		opportunity.Reason = fmt.Sprintf("Marginal: %.1f%% tax rate (consider alternatives)", effectiveTaxRate*100)
	} else {
		opportunity.Recommended = false
		opportunity.Reason = fmt.Sprintf("Not recommended: %.1f%% tax rate (too high)", effectiveTaxRate*100)
	}

	return opportunity
}

// CalculateOptimalConversionAmount finds the optimal conversion to fill a target bracket
func (opt *RothConversionOptimizer) CalculateOptimalConversionAmount(
	currentTaxableIncome float64,
	targetBracketTop float64,
	iraBalance float64,
) float64 {

	// Room in the target bracket
	roomInBracket := math.Max(0, targetBracketTop-currentTaxableIncome)

	// Don't exceed IRA balance
	conversionAmount := math.Min(roomInBracket, iraBalance)

	return conversionAmount
}

// GenerateConversionPlan creates a multi-year Roth conversion strategy
func (opt *RothConversionOptimizer) GenerateConversionPlan(
	startAge int,
	iraBalance float64,
	projectedAnnualIncome float64, // Other income (SS, pension, etc.)
	filingStatus FilingStatus,
	standardDeduction float64,
	strategy ConversionStrategy,
) (*RothConversionPlan, error) {

	plan := &RothConversionPlan{
		StartAge:    startAge,
		EndAge:      strategy.MaxAge,
		Conversions: make([]ConversionOpportunity, 0),
	}

	remainingIRA := iraBalance
	rothBalance := 0.0
	totalTaxes := 0.0
	currentYear := 2024 // Starting year

	// Simulate conversions year by year
	for age := startAge; age <= strategy.MaxAge; age++ {
		if remainingIRA <= 0 {
			break
		}

		// Calculate taxable income for this year
		taxableIncome := math.Max(0, projectedAnnualIncome-standardDeduction)

		// Calculate optimal conversion amount for this year
		conversionAmount := opt.CalculateOptimalConversionAmount(
			taxableIncome,
			strategy.TargetBracketTop,
			remainingIRA,
		)

		// Apply max annual conversion limit
		if strategy.MaxAnnualConversion > 0 {
			conversionAmount = math.Min(conversionAmount, strategy.MaxAnnualConversion)
		}

		if conversionAmount <= 0 {
			currentYear++
			continue
		}

		// Evaluate this conversion opportunity
		opportunity := opt.EvaluateConversionOpportunity(
			age,
			currentYear,
			taxableIncome,
			conversionAmount,
			filingStatus,
			standardDeduction,
		)

		// Check if conversion meets strategy criteria
		if opportunity.EffectiveTaxRate > strategy.MaxEffectiveTaxRate {
			opportunity.Recommended = false
			opportunity.Reason = fmt.Sprintf("Skipped: Tax rate %.1f%% exceeds max %.1f%%",
				opportunity.EffectiveTaxRate*100, strategy.MaxEffectiveTaxRate*100)
		}

		// Only convert if recommended or forced by strategy
		if opportunity.Recommended || strategy.TargetBracketTop > 0 {
			remainingIRA -= conversionAmount
			rothBalance += conversionAmount
			totalTaxes += opportunity.ConversionTaxOwed
			plan.TotalAmountConverted += conversionAmount
		}

		plan.Conversions = append(plan.Conversions, opportunity)
		currentYear++
	}

	plan.TotalTaxesPaid = totalTaxes
	plan.IRABalanceWith = remainingIRA
	plan.RothBalanceWith = rothBalance
	plan.IRABalanceWithout = iraBalance

	// Estimate tax savings (simplified)
	// Assume conversions avoid future RMDs taxed at higher rates
	avgFutureRMDTaxRate := 0.22 // Assume 22% bracket for future RMDs
	estimatedRMDTaxes := plan.TotalAmountConverted * avgFutureRMDTaxRate
	plan.EstimatedTaxSavings = estimatedRMDTaxes - plan.TotalTaxesPaid

	return plan, nil
}

// FindBestConversionYears identifies the best years for conversions
func (opt *RothConversionOptimizer) FindBestConversionYears(
	currentAge int,
	retirementAge int,
	rmdAge int, // Age when RMDs start (73)
	projectedIncomeByAge map[int]float64, // Age -> projected income
	iraBalance float64,
	filingStatus FilingStatus,
	standardDeduction float64,
) []ConversionOpportunity {

	opportunities := make([]ConversionOpportunity, 0)
	currentYear := 2024

	// Scan years from retirement to RMD age
	for age := retirementAge; age < rmdAge; age++ {
		income := 0.0
		if val, exists := projectedIncomeByAge[age]; exists {
			income = val
		}

		taxableIncome := math.Max(0, income-standardDeduction)

		// Try converting to fill 22% bracket (top at $89,075 for MFJ)
		targetBracketTop := 89075.0
		if filingStatus == FilingStatusSingle {
			targetBracketTop = 44725.0
		}

		conversionAmount := opt.CalculateOptimalConversionAmount(
			taxableIncome,
			targetBracketTop,
			iraBalance,
		)

		if conversionAmount > 0 {
			opportunity := opt.EvaluateConversionOpportunity(
				age,
				currentYear+age-currentAge,
				taxableIncome,
				conversionAmount,
				filingStatus,
				standardDeduction,
			)

			opportunities = append(opportunities, opportunity)
		}
	}

	// Sort by recommended first, then by lowest tax rate
	sortConversionOpportunities(opportunities)

	return opportunities
}

// sortConversionOpportunities sorts opportunities by quality
func sortConversionOpportunities(opportunities []ConversionOpportunity) {
	// Sort by: Recommended first, then lowest effective tax rate
	for i := 0; i < len(opportunities); i++ {
		for j := i + 1; j < len(opportunities); j++ {
			// Recommended opportunities first
			if opportunities[i].Recommended && !opportunities[j].Recommended {
				continue
			}
			if !opportunities[i].Recommended && opportunities[j].Recommended {
				opportunities[i], opportunities[j] = opportunities[j], opportunities[i]
				continue
			}
			// Among same recommendation level, prefer lower tax rate
			if opportunities[i].EffectiveTaxRate > opportunities[j].EffectiveTaxRate {
				opportunities[i], opportunities[j] = opportunities[j], opportunities[i]
			}
		}
	}
}

// SimulateConversionImpact compares outcomes with and without conversions
func (opt *RothConversionOptimizer) SimulateConversionImpact(
	iraBalance float64,
	conversionAmount float64,
	taxRate float64,
	growthRate float64,
	horizon int, // years
	futureWithdrawalTaxRate float64,
) (withConversion, withoutConversion float64) {

	// Scenario 1: No conversion
	// IRA grows, then taxed on withdrawal
	iraFutureValue := iraBalance * math.Pow(1+growthRate, float64(horizon))
	afterTaxWithout := iraFutureValue * (1 - futureWithdrawalTaxRate)

	// Scenario 2: With conversion
	// Pay tax now, remaining grows in Roth tax-free
	taxPaid := conversionAmount * taxRate
	remainingIRA := iraBalance - conversionAmount
	rothBalance := conversionAmount - taxPaid

	// IRA remaining portion (still taxed on withdrawal)
	iraFutureWith := remainingIRA * math.Pow(1+growthRate, float64(horizon))
	iraAfterTax := iraFutureWith * (1 - futureWithdrawalTaxRate)

	// Roth portion (tax-free)
	rothFuture := rothBalance * math.Pow(1+growthRate, float64(horizon))

	afterTaxWith := iraAfterTax + rothFuture

	return afterTaxWith, afterTaxWithout
}

// PrintConversionPlan prints a human-readable conversion plan
func (plan *RothConversionPlan) PrintConversionPlan() {
	fmt.Println("\n=== Roth Conversion Plan ===")
	fmt.Printf("Planning Period: Age %d to %d\n", plan.StartAge, plan.EndAge)
	fmt.Printf("\nProjected Conversions:\n")
	fmt.Printf("  Total Amount:   $%.0f\n", plan.TotalAmountConverted)
	fmt.Printf("  Total Taxes:    $%.0f\n", plan.TotalTaxesPaid)
	fmt.Printf("  Net to Roth:    $%.0f\n", plan.TotalAmountConverted-plan.TotalTaxesPaid)

	fmt.Printf("\nFinal Balances:\n")
	fmt.Printf("  IRA (remaining):  $%.0f\n", plan.IRABalanceWith)
	fmt.Printf("  Roth (new):       $%.0f\n", plan.RothBalanceWith)
	fmt.Printf("  IRA (no conv.):   $%.0f\n", plan.IRABalanceWithout)

	if plan.EstimatedTaxSavings > 0 {
		fmt.Printf("\nEstimated Lifetime Tax Savings: $%.0f\n", plan.EstimatedTaxSavings)
	}

	fmt.Printf("\nYear-by-Year Conversions:\n")
	for _, conv := range plan.Conversions {
		if conv.ConversionAmount > 0 {
			status := "✓"
			if !conv.Recommended {
				status = "✗"
			}
			fmt.Printf("  [%s] Age %d (Year %d): Convert $%.0f @ %.1f%% tax = $%.0f tax\n",
				status, conv.Age, conv.Year, conv.ConversionAmount,
				conv.EffectiveTaxRate*100, conv.ConversionTaxOwed)
			fmt.Printf("      %s\n", conv.Reason)
		}
	}
}

// CalculateBreakevenHorizon determines years needed to break even on conversion
func (opt *RothConversionOptimizer) CalculateBreakevenHorizon(
	conversionAmount float64,
	conversionTaxRate float64,
	futureWithdrawalTaxRate float64,
	growthRate float64,
) int {

	// Tax paid on conversion
	taxPaid := conversionAmount * conversionTaxRate

	// After-tax Roth balance (used in comments for explanation)
	_ = conversionAmount - taxPaid // rothBalance

	// If we didn't convert, we'd have full conversionAmount in IRA
	// At withdrawal: conversionAmount * (1+r)^t * (1 - futureRate)
	// With conversion: rothBalance * (1+r)^t

	// Break even when:
	// rothBalance * (1+r)^t = conversionAmount * (1+r)^t * (1 - futureRate)
	// rothBalance = conversionAmount * (1 - futureRate)
	// (conversionAmount - taxPaid) = conversionAmount * (1 - futureRate)
	// 1 - taxPaid/conversionAmount = 1 - futureRate
	// taxPaid/conversionAmount = futureRate
	// conversionTaxRate = futureRate

	// If current tax rate < future tax rate, conversion wins immediately
	// If current tax rate > future tax rate, conversion never wins
	// If equal, break even at any horizon

	if conversionTaxRate >= futureWithdrawalTaxRate {
		return 999 // Never breaks even (or immediate)
	}

	// More complex calculation with growth
	// Need to solve: (1-conversionTax) * (1+r)^t = (1-futureRate) * (1+r)^t
	// This simplifies to immediate if growth is same

	// For now, return simple heuristic
	if conversionTaxRate < futureWithdrawalTaxRate-0.02 {
		return 0 // Immediate benefit
	} else if conversionTaxRate < futureWithdrawalTaxRate {
		return 5 // A few years
	}

	return 999 // Very long or never
}
