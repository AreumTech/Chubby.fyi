// Alert Generation System - Analyzes simulation results to generate financial alerts
// This replaces client-side hardcoded IRMAA calculations and other financial business logic
//
// SOURCES AND CITATIONS:
// All financial constants are sourced from authoritative government publications.
// See DATA_SOURCES.md for complete citations and legal authority references.

package main

import (
	"fmt"
	"math"
	"strconv"
)

// ============================================================================
// FINANCIAL CONSTANTS FOR 2024 TAX YEAR
// ============================================================================
// Source: IRS Publication 17, IRS Rev. Proc. 2023-34
// All values verified against official IRS publications
// Last Updated: November 2023 for 2024 tax year

// Standard Deductions for 2024
// Source: IRS Rev. Proc. 2023-34, Section 3.01
const (
	StandardDeduction2024Single                = 14600.0  // Single filers
	StandardDeduction2024MarriedFilingJointly  = 29200.0  // Married filing jointly
	StandardDeduction2024HeadOfHousehold       = 21900.0  // Head of household
)

// Federal Tax Bracket Thresholds for 2024 (Single Filers)
// Source: IRS Rev. Proc. 2023-34, Section 3.01
// These are the TOP of each bracket (exclusive)
const (
	TaxBracket2024Single10PctMax = 11600.0   // 10% bracket: $0 to $11,600
	TaxBracket2024Single12PctMax = 47150.0   // 12% bracket: $11,601 to $47,150
	TaxBracket2024Single22PctMax = 100525.0  // 22% bracket: $47,151 to $100,525
	TaxBracket2024Single24PctMax = 191950.0  // 24% bracket: $100,526 to $191,950
	TaxBracket2024Single32PctMax = 243725.0  // 32% bracket: $191,951 to $243,725
	TaxBracket2024Single35PctMax = 609350.0  // 35% bracket: $243,726 to $609,350
	// 37% bracket: $609,351 and above
)

// Federal Tax Bracket Thresholds for 2024 (Married Filing Jointly)
// Source: IRS Rev. Proc. 2023-34, Section 3.01
const (
	TaxBracket2024MFJ10PctMax = 23200.0   // 10% bracket: $0 to $23,200
	TaxBracket2024MFJ12PctMax = 94300.0   // 12% bracket: $23,201 to $94,300
	TaxBracket2024MFJ22PctMax = 201050.0  // 22% bracket: $94,301 to $201,050
	TaxBracket2024MFJ24PctMax = 383900.0  // 24% bracket: $201,051 to $383,900
	TaxBracket2024MFJ32PctMax = 487450.0  // 32% bracket: $383,901 to $487,450
	TaxBracket2024MFJ35PctMax = 731200.0  // 35% bracket: $487,451 to $731,200
	// 37% bracket: $731,201 and above
)

// IRMAA Income Thresholds for 2024 (used when config file unavailable)
// Source: CMS Medicare.gov, Medicare Part B & Part D IRMAA for 2024
// Legal Authority: Social Security Act §1839(i) and §1860D-13(a)(7)
// URL: https://www.medicare.gov/your-medicare-costs/part-b-costs
const (
	IRMAA2024SingleThreshold1 = 103000.0  // First IRMAA tier
	IRMAA2024SingleThreshold2 = 129000.0  // Second IRMAA tier
	IRMAA2024SingleThreshold3 = 161000.0  // Third IRMAA tier
	IRMAA2024SingleThreshold4 = 193000.0  // Fourth IRMAA tier
	IRMAA2024SingleThreshold5 = 500000.0  // Fifth IRMAA tier (highest)

	IRMAA2024MFJThreshold1 = 206000.0  // First IRMAA tier (MFJ)
	IRMAA2024MFJThreshold2 = 258000.0  // Second IRMAA tier (MFJ)
	IRMAA2024MFJThreshold3 = 322000.0  // Third IRMAA tier (MFJ)
	IRMAA2024MFJThreshold4 = 386000.0  // Fourth IRMAA tier (MFJ)
	IRMAA2024MFJThreshold5 = 750000.0  // Fifth IRMAA tier (MFJ, highest)
)

// RMD Age Thresholds
// Source: IRS Publication 590-B, SECURE Act 2.0 (2023)
// Legal Authority: Internal Revenue Code §401(a)(9)
const (
	RMDAge2023AndLater = 73  // SECURE Act 2.0: RMD age is 73 for those turning 72 in 2023 or later
	RMDAge2033AndLater = 75  // SECURE Act 2.0: RMD age increases to 75 starting in 2033
)

// Contribution Limits for 2024
// Source: IRS Notice 2023-75 (401k/IRA limits)
const (
	Contribution2024_401kBase       = 23000.0  // 401(k) base contribution limit
	Contribution2024_401kCatchUp    = 7500.0   // 401(k) catch-up (age 50+)
	Contribution2024_IRABase        = 7000.0   // IRA base contribution limit
	Contribution2024_IRACatchUp     = 1000.0   // IRA catch-up (age 50+)
	Contribution2024_CatchUpAge     = 50       // Age for catch-up contributions
)

// IRMAAConfig represents IRMAA brackets configuration
type IRMAAConfig struct {
	Metadata     IRMAAMetadata     `json:"_metadata"`
	PartBPremiums IRMAAPartBPremiums `json:"partBPremiums"`
	PartDPremiums IRMAAPartDPremiums `json:"partDPremiums"`
}

type IRMAAMetadata struct {
	SourceURL       string `json:"sourceURL"`
	Citation        string `json:"citation"`
	LegalAuthority  string `json:"legalAuthority"`
	EffectiveDate   string `json:"effectiveDate"`
	LastUpdated     string `json:"lastUpdated"`
}

type IRMAAPartBPremiums struct {
	StandardMonthlyPremium float64                   `json:"standardMonthlyPremium"`
	IRMAAAAdjustments      []IRMAAPartBAdjustment    `json:"irmaaAdjustments"`
}

type IRMAAPartDPremiums struct {
	IRMAAAAdjustments []IRMAAPartDAdjustment `json:"irmaaAdjustments"`
}

type IRMAAPartBAdjustment struct {
	IncomeRange           IRMAAIncomeRange `json:"incomeRange"`
	MonthlyPremiumAmount  float64          `json:"monthlyPremiumAmount"`
	IRMAAAmount           float64          `json:"irmaaAmount"`
}

type IRMAAPartDAdjustment struct {
	IncomeRange         IRMAAIncomeRange `json:"incomeRange"`
	MonthlyIRMAAAmount  float64          `json:"monthlyIrmaaAmount"`
}

type IRMAAIncomeRange struct {
	Single              IRMAAIncomeBounds `json:"single"`
	MarriedFilingJointly IRMAAIncomeBounds `json:"marriedFilingJointly"`
}

type IRMAAIncomeBounds struct {
	Min interface{} `json:"min"` // Can be float64 or string
	Max interface{} `json:"max"` // Can be float64 or string ("Infinity")
}

// AlertGenerator generates financial alerts based on simulation results
type AlertGenerator struct {
	irmaaConfig *IRMAAConfig
}

// NewAlertGenerator creates a new alert generator
// WASM FIX: Removed file I/O - IRMAA config must be passed in if needed
func NewAlertGenerator() (*AlertGenerator, error) {
	ag := &AlertGenerator{
		irmaaConfig: nil, // No config by default - IRMAA alerts disabled until dependency injection implemented
	}

	simLogVerbose("✅ ALERT-GENERATOR: Initialized (IRMAA alerts disabled - config loading via file I/O removed for WASM compatibility)")
	return ag, nil
}

// NewAlertGeneratorWithConfig creates an alert generator with explicit IRMAA configuration
// This is the proper dependency injection approach for WASM environments
func NewAlertGeneratorWithConfig(irmaaConfig *IRMAAConfig) *AlertGenerator {
	return &AlertGenerator{
		irmaaConfig: irmaaConfig,
	}
}

// loadIRMAAConfig - REMOVED: File I/O not supported in WASM environment
// Use NewAlertGeneratorWithConfig() with pre-loaded config instead

// GenerateAlerts analyzes simulation results and generates appropriate financial alerts
func (ag *AlertGenerator) GenerateAlerts(results SimulationResults, input SimulationInput) []Alert {
	var alerts []Alert

	simLogVerbose("🔍 ALERT-GENERATOR: Generating alerts for simulation results")

	// Generate IRMAA alerts for Medicare premium planning
	irmaaAlerts := ag.generateIRMAAAlerts(results, input)
	alerts = append(alerts, irmaaAlerts...)

	// Generate RMD alerts based on user's current situation
	rmdAlerts := ag.generateRMDAlerts(input)
	alerts = append(alerts, rmdAlerts...)

	// Generate tax bracket optimization alerts
	taxAlerts := ag.generateTaxBracketAlerts(results, input)
	alerts = append(alerts, taxAlerts...)

	// Generate goal achievement risk alerts
	goalAlerts := ag.generateGoalRiskAlerts(results, input)
	alerts = append(alerts, goalAlerts...)

	simLogVerbose("✅ ALERT-GENERATOR: Generated %d alerts total", len(alerts))
	return alerts
}

// generateIRMAAAlerts generates IRMAA bracket cliff warnings for Medicare-eligible users
func (ag *AlertGenerator) generateIRMAAAlerts(results SimulationResults, input SimulationInput) []Alert {
	var alerts []Alert

	if ag.irmaaConfig == nil {
		simLogVerbose("⚠️  IRMAA config not loaded - skipping IRMAA alerts")
		return alerts
	}

	// Calculate approximate annual income from events to identify IRMAA risk
	// Count first 12 months of income events only (to get annual income)
	monthlyIncomes := make(map[int]float64)
	for _, event := range input.Events {
		if event.Type == "INCOME" && event.MonthOffset < 12 {
			monthlyIncomes[event.MonthOffset] += event.Amount
		}
	}

	// Sum up income from first 12 months to get approximate annual income
	annualIncome := 0.0
	for _, income := range monthlyIncomes {
		annualIncome += income
	}

	// Only generate alerts for users with significant income (IRMAA-relevant)
	// Using the first IRMAA threshold for single filers
	if annualIncome < IRMAA2024SingleThreshold1 {
		return alerts
	}

	// Use single filer status (could be enhanced for married filing jointly)
	brackets := ag.irmaaConfig.PartBPremiums.IRMAAAAdjustments

	// Find which bracket the income falls into and check proximity to next bracket
	for i, bracket := range brackets {
		minIncome := parseIncomeValue(bracket.IncomeRange.Single.Min)
		maxIncome := parseIncomeValue(bracket.IncomeRange.Single.Max)

		if annualIncome >= minIncome && annualIncome < maxIncome {
			// Check if close to next bracket
			if i+1 < len(brackets) {
				nextBracket := brackets[i+1]
				nextThreshold := parseIncomeValue(nextBracket.IncomeRange.Single.Min)
				proximityToThreshold := nextThreshold - annualIncome

				// Alert if within $25k of next bracket
				if proximityToThreshold > 0 && proximityToThreshold < 25000 {
					currentAnnualCost := bracket.MonthlyPremiumAmount * 12
					nextAnnualCost := nextBracket.MonthlyPremiumAmount * 12
					costIncrease := nextAnnualCost - currentAnnualCost

					alert := Alert{
						ID:       "irmaa-proximity",
						Type:     "warning",
						Title:    "IRMAA Medicare Premium Alert",
						Message:  fmt.Sprintf("Your projected income of $%.0f is only $%.0f away from the next IRMAA bracket, which would add $%.0f/year in Medicare premiums. Consider tax-deferred strategies to stay below $%.0f.", annualIncome, proximityToThreshold, costIncrease, nextThreshold),
						Severity: "high",
					}
					alerts = append(alerts, alert)
				}
			}
			break
		}
	}

	return alerts
}

// checkIRMAAProximity checks if income is close to IRMAA thresholds and generates alert
func (ag *AlertGenerator) checkIRMAAProximity(magi float64, year int, age int) *Alert {
	// Use single filer brackets (could be enhanced to support married filing jointly)
	brackets := ag.irmaaConfig.PartBPremiums.IRMAAAAdjustments

	// Find the current bracket and next threshold
	var currentBracket *IRMAAPartBAdjustment
	var nextThreshold float64
	var nextBracket *IRMAAPartBAdjustment

	for i, bracket := range brackets {
		minIncome := parseIncomeValue(bracket.IncomeRange.Single.Min)
		maxIncome := parseIncomeValue(bracket.IncomeRange.Single.Max)

		if magi >= minIncome && magi < maxIncome {
			currentBracket = &bracket
			// Find next bracket
			if i+1 < len(brackets) {
				nextBracket = &brackets[i+1]
				nextThreshold = parseIncomeValue(nextBracket.IncomeRange.Single.Min)
			}
			break
		}
	}

	if currentBracket == nil || nextBracket == nil {
		return nil
	}

	// Calculate proximity to next threshold
	proximityToThreshold := nextThreshold - magi
	warningDistance := math.Min(nextThreshold*0.1, 25000) // 10% or $25k, whichever is smaller

	if proximityToThreshold <= warningDistance && proximityToThreshold > 0 {
		// Calculate potential IRMAA cost increase
		currentAnnualCost := currentBracket.MonthlyPremiumAmount * 12
		nextAnnualCost := nextBracket.MonthlyPremiumAmount * 12

		// Add Part D IRMAA increase
		partDAdjustment := ag.findPartDAdjustment(nextThreshold)
		if partDAdjustment != nil {
			nextAnnualCost += partDAdjustment.MonthlyIRMAAAmount * 12
		}

		costIncrease := nextAnnualCost - currentAnnualCost

		title := fmt.Sprintf("IRMAA Bracket Alert for %d", year)
		message := fmt.Sprintf("Your projected MAGI of %s is %s away from triggering an additional %s/year in Medicare premiums. Consider Roth conversions or other tax strategies.",
			formatCurrency(magi),
			formatCurrency(proximityToThreshold),
			formatCurrency(costIncrease))

		return &Alert{
			ID:       fmt.Sprintf("irmaa-warning-%d", year),
			Type:     "warning",
			Title:    title,
			Message:  message,
			Year:     &year,
			Severity: "high",
		}
	}

	return nil
}

// generateRMDAlerts generates Required Minimum Distribution alerts
func (ag *AlertGenerator) generateRMDAlerts(input SimulationInput) []Alert {
	var alerts []Alert

	// RMD age from SECURE Act 2.0 constants
	rmdAge := RMDAge2023AndLater

	// Check for significant tax-deferred balances that will trigger RMDs
	taxDeferredBalance := 0.0
	if input.InitialAccounts.TaxDeferred != nil {
		taxDeferredBalance = input.InitialAccounts.TaxDeferred.TotalValue
	}

	// Generate alert if user has substantial tax-deferred balance
	// Assume user is approaching RMD age if they have IRAs/401ks (typical retirement planning scenario)
	if taxDeferredBalance > 100000 {
		// Alert about RMD planning
		alert := Alert{
			ID:       "rmd-planning",
			Type:     "info",
			Title:    "Required Minimum Distribution (RMD) Planning",
			Message:  fmt.Sprintf("You have $%.0f in tax-deferred accounts. At age %d, you'll be required to take RMDs. Consider Roth conversions in lower-income years to reduce future RMD tax burden.", taxDeferredBalance, rmdAge),
			Severity: "medium",
		}
		alerts = append(alerts, alert)
	}

	// Alert about high RMD risk if balance is very large
	if taxDeferredBalance > 500000 {
		estimatedFirstRMD := taxDeferredBalance * 0.0365 // Approximate first-year RMD percentage
		alert := Alert{
			ID:       "high-rmd-risk",
			Type:     "warning",
			Title:    "High RMD Tax Exposure",
			Message:  fmt.Sprintf("Your tax-deferred balance of $%.0f will generate an estimated first-year RMD of $%.0f, which may push you into higher tax brackets. Consider accelerated Roth conversions.", taxDeferredBalance, estimatedFirstRMD),
			Severity: "high",
		}
		alerts = append(alerts, alert)
	}

	return alerts
}

// generateTaxBracketAlerts generates tax optimization alerts
func (ag *AlertGenerator) generateTaxBracketAlerts(results SimulationResults, input SimulationInput) []Alert {
	var alerts []Alert

	// Calculate approximate annual income from events
	// Sum income from first 12 months
	monthlyIncomes := make(map[int]float64)
	for _, event := range input.Events {
		if event.Type == "INCOME" && event.MonthOffset < 12 {
			monthlyIncomes[event.MonthOffset] += event.Amount
		}
	}

	annualIncome := 0.0
	for _, income := range monthlyIncomes {
		annualIncome += income
	}

	// Check tax-deferred balances for Roth conversion opportunities
	taxDeferredBalance := 0.0
	if input.InitialAccounts.TaxDeferred != nil {
		taxDeferredBalance = input.InitialAccounts.TaxDeferred.TotalValue
	}

	// Alert for Roth conversion opportunities in lower tax brackets
	// Using IRS 2024 constants for single filers
	standardDeduction := StandardDeduction2024Single
	bracket12Max := TaxBracket2024Single12PctMax
	bracket22Max := TaxBracket2024Single22PctMax

	taxableIncome := annualIncome - standardDeduction

	// Opportunity: If in 12% bracket with significant tax-deferred balance
	if taxableIncome > 0 && taxableIncome < bracket12Max && taxDeferredBalance > 200000 {
		spaceInBracket := bracket12Max - taxableIncome
		alert := Alert{
			ID:       "roth-conversion-12pct",
			Type:     "info",
			Title:    "Roth Conversion Opportunity (12% Bracket)",
			Message:  fmt.Sprintf("You have $%.0f of space remaining in the 12%% tax bracket. Consider converting $%.0f from your $%.0f tax-deferred balance to Roth at this favorable rate.", spaceInBracket, math.Min(spaceInBracket, taxDeferredBalance), taxDeferredBalance),
			Severity: "medium",
		}
		alerts = append(alerts, alert)
	}

	// Warning: If in 22% bracket with large tax-deferred balance
	if taxableIncome >= bracket12Max && taxableIncome < bracket22Max && taxDeferredBalance > 500000 {
		alert := Alert{
			ID:       "high-tax-bracket-warning",
			Type:     "warning",
			Title:    "High Tax Bracket Alert",
			Message:  fmt.Sprintf("Your income of $%.0f places you in the 22%% tax bracket. With $%.0f in tax-deferred accounts, consider strategies to reduce future RMDs and tax exposure, such as Roth conversions during lower-income years.", annualIncome, taxDeferredBalance),
			Severity: "medium",
		}
		alerts = append(alerts, alert)
	}

	// Alert for very high earners (24%+ brackets) with large tax-deferred balances
	if taxableIncome >= bracket22Max && taxDeferredBalance > 300000 {
		alert := Alert{
			ID:       "high-earner-tax-strategy",
			Type:     "info",
			Title:    "Advanced Tax Strategy Recommended",
			Message:  fmt.Sprintf("As a high earner with $%.0f in tax-deferred accounts, consider maximizing Roth 401(k) contributions, backdoor Roth conversions, and other advanced tax strategies to reduce future tax burden.", taxDeferredBalance),
			Severity: "low",
		}
		alerts = append(alerts, alert)
	}

	return alerts
}

// generateGoalRiskAlerts generates goal achievement risk alerts
func (ag *AlertGenerator) generateGoalRiskAlerts(results SimulationResults, input SimulationInput) []Alert {
	var alerts []Alert

	// Generate alerts for goals with low success rates
	if results.ProbabilityOfSuccess < 0.7 {
		alert := Alert{
			ID:       "low-success-rate",
			Type:     "warning",
			Title:    "Plan Success Rate Below Target",
			Message:  fmt.Sprintf("Your plan has a %.0f%% success rate. Consider increasing savings, reducing expenses, or adjusting goals to improve outcomes.", results.ProbabilityOfSuccess*100),
			Severity: "high",
		}
		alerts = append(alerts, alert)
	}

	return alerts
}

// Helper functions

func parseIncomeValue(value interface{}) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case string:
		if v == "Infinity" {
			return math.Inf(1)
		}
		parsed, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return 0
		}
		return parsed
	default:
		return 0
	}
}

func (ag *AlertGenerator) findPartDAdjustment(threshold float64) *IRMAAPartDAdjustment {
	for _, adj := range ag.irmaaConfig.PartDPremiums.IRMAAAAdjustments {
		minIncome := parseIncomeValue(adj.IncomeRange.Single.Min)
		if threshold >= minIncome {
			return &adj
		}
	}
	return nil
}

func formatCurrencyAlert(amount float64) string {
	if amount >= 1000000 {
		return fmt.Sprintf("$%.1fM", amount/1000000)
	} else if amount >= 1000 {
		return fmt.Sprintf("$%.0fK", amount/1000)
	}
	return fmt.Sprintf("$%.0f", amount)
}

func getCurrentYear() int {
	return 2024 // Could be made dynamic
}