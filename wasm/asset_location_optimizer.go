package main

// asset_location_optimizer.go
// Asset location optimizer for maximizing after-tax wealth
// Reference: Python robo-advisor Chapter 8
//
// Key principle: Place tax-inefficient assets in tax-advantaged accounts
// - Bonds (high ordinary income) → Tax-deferred accounts (IRA, 401k)
// - Stocks (capital gains + qualified dividends) → Taxable accounts
// - Highest return assets → Roth accounts (tax-free growth)

import (
	"fmt"
	"math"
	"sort"
)

// AssetLocationOptimizer handles optimal asset placement across account types
type AssetLocationOptimizer struct {
	taxCalculator *TaxCalculator
}

// NewAssetLocationOptimizer creates a new asset location optimizer
func NewAssetLocationOptimizer(taxCalc *TaxCalculator) *AssetLocationOptimizer {
	return &AssetLocationOptimizer{
		taxCalculator: taxCalc,
	}
}

// AssetClassProfile defines tax characteristics of an asset class
type AssetClassProfile struct {
	AssetClass          AssetClass
	ExpectedReturn      float64 // Annual expected return
	DividendYield       float64 // Annual dividend/interest yield
	TurnoverRate        float64 // Portfolio turnover (0-1)
	QualifiedDividendPct float64 // Percentage of dividends that are qualified (0-1)

	// Tax efficiency score (higher = more tax efficient, better for taxable)
	TaxEfficiencyScore  float64
}

// LocationRecommendation represents the optimal account for an asset class
type LocationRecommendation struct {
	AssetClass          AssetClass
	RecommendedAccount  string // "roth", "tax_deferred", "taxable"
	Priority            int    // 1 = highest priority, lower numbers first
	Reason              string
	TaxDragEstimate     float64 // Annual tax drag if held in taxable account
}

// AssetLocationPlan represents the complete allocation plan
type AssetLocationPlan struct {
	TotalValue         float64
	TaxableCapacity    float64
	TaxDeferredCapacity float64
	RothCapacity       float64

	Recommendations    []LocationRecommendation
	AssetPlacements    map[AssetClass]map[string]float64 // AssetClass -> AccountType -> Amount
}

// CalculateTaxEfficiency calculates the tax efficiency score for an asset class
// Higher score = more tax efficient = better for taxable accounts
func (opt *AssetLocationOptimizer) CalculateTaxEfficiency(profile AssetClassProfile) float64 {
	// Tax drag components:
	// 1. Dividend/interest income taxed annually
	// 2. Capital gains from turnover
	// 3. Treatment of dividends (qualified vs ordinary)

	// Assume marginal rates (can be refined with actual tax calculator)
	ordinaryIncomeTaxRate := 0.24      // 24% bracket
	qualifiedDividendRate := 0.15      // 15% LTCG rate
	capitalGainsRate := 0.15           // 15% LTCG rate

	// Annual tax drag from dividends
	ordinaryDividendPct := 1.0 - profile.QualifiedDividendPct
	dividendTaxDrag := profile.DividendYield * (
		profile.QualifiedDividendPct*qualifiedDividendRate +
		ordinaryDividendPct*ordinaryIncomeTaxRate)

	// Annual tax drag from realized capital gains (due to turnover)
	capitalGainComponent := (profile.ExpectedReturn - profile.DividendYield) * profile.TurnoverRate
	capitalGainsTaxDrag := capitalGainComponent * capitalGainsRate

	totalTaxDrag := dividendTaxDrag + capitalGainsTaxDrag

	// Tax efficiency = inverse of tax drag
	// Scale to 0-100 for readability
	taxEfficiency := 100.0 * (1.0 - totalTaxDrag/math.Max(0.01, profile.ExpectedReturn))

	return math.Max(0, math.Min(100, taxEfficiency))
}

// GetDefaultAssetProfiles returns typical profiles for common asset classes
func (opt *AssetLocationOptimizer) GetDefaultAssetProfiles() []AssetClassProfile {
	profiles := []AssetClassProfile{
		// US Stocks - Tax efficient (low dividends, qualified, low turnover if index)
		{
			AssetClass:          AssetClassUSStocksTotalMarket,
			ExpectedReturn:      0.10,  // 10% annual
			DividendYield:       0.015, // 1.5%
			TurnoverRate:        0.05,  // 5% for index fund
			QualifiedDividendPct: 1.0,  // 100% qualified
			TaxEfficiencyScore:  0,     // Will be calculated
		},

		// International Stocks - Moderately tax efficient (higher dividends, some non-qualified)
		{
			AssetClass:          AssetClassInternationalStocks,
			ExpectedReturn:      0.09,  // 9% annual
			DividendYield:       0.025, // 2.5%
			TurnoverRate:        0.10,  // 10% turnover
			QualifiedDividendPct: 0.80, // 80% qualified (some foreign tax complications)
			TaxEfficiencyScore:  0,
		},

		// Bonds - Tax inefficient (high interest income, all ordinary)
		{
			AssetClass:          AssetClassUSBondsTotalMarket,
			ExpectedReturn:      0.04,  // 4% annual
			DividendYield:       0.04,  // 4% (all interest income)
			TurnoverRate:        0.20,  // 20% turnover
			QualifiedDividendPct: 0.0,  // 0% - all ordinary income
			TaxEfficiencyScore:  0,
		},

		// REITs - Very tax inefficient (high ordinary income, required distributions)
		{
			AssetClass:          AssetClassOtherAssets, // Using OTHER for REITs
			ExpectedReturn:      0.08,
			DividendYield:       0.05,  // 5% (mostly ordinary)
			TurnoverRate:        0.15,
			QualifiedDividendPct: 0.20, // Only 20% qualified
			TaxEfficiencyScore:  0,
		},
	}

	// Calculate tax efficiency scores
	for i := range profiles {
		profiles[i].TaxEfficiencyScore = opt.CalculateTaxEfficiency(profiles[i])
	}

	return profiles
}

// GenerateLocationPlan creates an optimal asset location plan
func (opt *AssetLocationOptimizer) GenerateLocationPlan(
	assetProfiles []AssetClassProfile,
	accountCapacities map[string]float64, // "taxable", "tax_deferred", "roth" -> capacity
	targetAllocations map[AssetClass]float64, // AssetClass -> target dollar amount
) (*AssetLocationPlan, error) {

	plan := &AssetLocationPlan{
		TaxableCapacity:     accountCapacities["taxable"],
		TaxDeferredCapacity: accountCapacities["tax_deferred"],
		RothCapacity:        accountCapacities["roth"],
		Recommendations:     make([]LocationRecommendation, 0),
		AssetPlacements:     make(map[AssetClass]map[string]float64),
	}

	// Calculate total target value
	totalTarget := 0.0
	for _, amount := range targetAllocations {
		totalTarget += amount
	}
	plan.TotalValue = totalTarget

	// Asset location priority rules (from Chapter 8):
	// 1. Highest expected return assets → Roth (tax-free growth)
	// 2. Most tax-inefficient assets → Tax-deferred (defer ordinary income)
	// 3. Most tax-efficient assets → Taxable (low tax drag)

	// Create sortable list of assets
	type assetInfo struct {
		profile           AssetClassProfile
		targetAmount      float64
		expectedReturn    float64
		taxEfficiency     float64
		taxInefficiency   float64 // Inverse of efficiency
	}

	assets := make([]assetInfo, 0)
	for _, profile := range assetProfiles {
		if amount, exists := targetAllocations[profile.AssetClass]; exists && amount > 0 {
			assets = append(assets, assetInfo{
				profile:         profile,
				targetAmount:    amount,
				expectedReturn:  profile.ExpectedReturn,
				taxEfficiency:   profile.TaxEfficiencyScore,
				taxInefficiency: 100.0 - profile.TaxEfficiencyScore,
			})
		}
	}

	// Initialize placement maps
	for _, asset := range assets {
		plan.AssetPlacements[asset.profile.AssetClass] = map[string]float64{
			"taxable":      0,
			"tax_deferred": 0,
			"roth":         0,
		}
	}

	// Remaining capacity trackers
	remainingRoth := plan.RothCapacity
	remainingTaxDeferred := plan.TaxDeferredCapacity
	remainingTaxable := plan.TaxableCapacity

	// Phase 1: Fill Roth with highest expected return assets
	sort.Slice(assets, func(i, j int) bool {
		return assets[i].expectedReturn > assets[j].expectedReturn
	})

	for i := range assets {
		if remainingRoth <= 0 {
			break
		}

		amountToPlace := math.Min(assets[i].targetAmount, remainingRoth)
		if amountToPlace > 0 {
			plan.AssetPlacements[assets[i].profile.AssetClass]["roth"] = amountToPlace
			assets[i].targetAmount -= amountToPlace
			remainingRoth -= amountToPlace

			plan.Recommendations = append(plan.Recommendations, LocationRecommendation{
				AssetClass:         assets[i].profile.AssetClass,
				RecommendedAccount: "roth",
				Priority:           1,
				Reason:             fmt.Sprintf("Highest return (%.1f%%) → Roth for tax-free growth", assets[i].expectedReturn*100),
				TaxDragEstimate:    0, // No tax drag in Roth
			})
		}
	}

	// Phase 2: Fill Tax-Deferred with most tax-inefficient assets
	sort.Slice(assets, func(i, j int) bool {
		return assets[i].taxInefficiency > assets[j].taxInefficiency
	})

	for i := range assets {
		if remainingTaxDeferred <= 0 {
			break
		}
		if assets[i].targetAmount <= 0 {
			continue
		}

		amountToPlace := math.Min(assets[i].targetAmount, remainingTaxDeferred)
		if amountToPlace > 0 {
			plan.AssetPlacements[assets[i].profile.AssetClass]["tax_deferred"] = amountToPlace
			assets[i].targetAmount -= amountToPlace
			remainingTaxDeferred -= amountToPlace

			plan.Recommendations = append(plan.Recommendations, LocationRecommendation{
				AssetClass:         assets[i].profile.AssetClass,
				RecommendedAccount: "tax_deferred",
				Priority:           2,
				Reason:             fmt.Sprintf("Tax-inefficient (%.1f efficiency) → Tax-deferred to defer taxes", assets[i].taxEfficiency),
				TaxDragEstimate:    0, // Deferred until withdrawal
			})
		}
	}

	// Phase 3: Fill Taxable with remaining (most tax-efficient assets)
	sort.Slice(assets, func(i, j int) bool {
		return assets[i].taxEfficiency > assets[j].taxEfficiency
	})

	for i := range assets {
		if assets[i].targetAmount <= 0 {
			continue
		}

		amountToPlace := assets[i].targetAmount
		if amountToPlace > remainingTaxable {
			return plan, fmt.Errorf("insufficient taxable account capacity: need %.0f, have %.0f",
				amountToPlace, remainingTaxable)
		}

		if amountToPlace > 0 {
			plan.AssetPlacements[assets[i].profile.AssetClass]["taxable"] += amountToPlace
			assets[i].targetAmount -= amountToPlace
			remainingTaxable -= amountToPlace

			taxDrag := (100.0 - assets[i].taxEfficiency) / 100.0 * assets[i].expectedReturn

			plan.Recommendations = append(plan.Recommendations, LocationRecommendation{
				AssetClass:         assets[i].profile.AssetClass,
				RecommendedAccount: "taxable",
				Priority:           3,
				Reason:             fmt.Sprintf("Tax-efficient (%.1f efficiency) → Taxable account", assets[i].taxEfficiency),
				TaxDragEstimate:    taxDrag,
			})
		}
	}

	return plan, nil
}

// CalculateLocationValue calculates after-tax future value for different account types
func (opt *AssetLocationOptimizer) CalculateLocationValue(
	initialAmount float64,
	annualReturn float64,
	horizon int, // years
	accountType string,
	marginalTaxRate float64,
	capitalGainsTaxRate float64,
) float64 {

	switch accountType {
	case "roth":
		// Roth: No taxes on growth or withdrawal
		futureValue := initialAmount * math.Pow(1+annualReturn, float64(horizon))
		return futureValue

	case "tax_deferred":
		// Tax-deferred (Traditional IRA/401k): Grow tax-free, but entire withdrawal is taxed
		preWithdrawalValue := initialAmount * math.Pow(1+annualReturn, float64(horizon))
		afterTaxValue := preWithdrawalValue * (1 - marginalTaxRate)
		return afterTaxValue

	case "taxable":
		// Taxable: Annual tax drag on gains
		// Simplified: Assume capital gains taxed at end (no annual tax)
		// More accurate would be to tax dividends annually and gains at end
		preWithdrawalValue := initialAmount * math.Pow(1+annualReturn, float64(horizon))
		gains := preWithdrawalValue - initialAmount
		taxes := gains * capitalGainsTaxRate
		afterTaxValue := preWithdrawalValue - taxes
		return afterTaxValue

	default:
		return initialAmount * math.Pow(1+annualReturn, float64(horizon))
	}
}

// CompareAccountTypes calculates the after-tax value advantage of different account types
func (opt *AssetLocationOptimizer) CompareAccountTypes(
	amount float64,
	expectedReturn float64,
	horizon int,
	marginalTaxRate float64,
	capitalGainsTaxRate float64,
) map[string]float64 {

	results := make(map[string]float64)

	results["roth"] = opt.CalculateLocationValue(
		amount, expectedReturn, horizon, "roth", marginalTaxRate, capitalGainsTaxRate)

	results["tax_deferred"] = opt.CalculateLocationValue(
		amount, expectedReturn, horizon, "tax_deferred", marginalTaxRate, capitalGainsTaxRate)

	results["taxable"] = opt.CalculateLocationValue(
		amount, expectedReturn, horizon, "taxable", marginalTaxRate, capitalGainsTaxRate)

	return results
}

// RecommendAssetLocation provides a simple recommendation for a single asset
func (opt *AssetLocationOptimizer) RecommendAssetLocation(profile AssetClassProfile) string {
	efficiency := opt.CalculateTaxEfficiency(profile)

	// Simple heuristic:
	// - Very tax-inefficient (< 70): Tax-deferred
	// - Moderately efficient (70-85): Either tax-deferred or taxable
	// - Very efficient (> 85): Taxable
	// - Highest return: Roth (if available)

	if efficiency < 70 {
		return "tax_deferred"
	} else if efficiency > 85 {
		return "taxable"
	}

	return "tax_deferred" // Default to tax-advantaged if uncertain
}

// PrintLocationPlan prints a human-readable asset location plan
func (plan *AssetLocationPlan) PrintLocationPlan() {
	fmt.Println("\n=== Asset Location Plan ===")
	fmt.Printf("Total Portfolio Value: $%.0f\n", plan.TotalValue)
	fmt.Printf("\nAccount Capacities:\n")
	fmt.Printf("  Roth:         $%.0f\n", plan.RothCapacity)
	fmt.Printf("  Tax-Deferred: $%.0f\n", plan.TaxDeferredCapacity)
	fmt.Printf("  Taxable:      $%.0f\n", plan.TaxableCapacity)

	fmt.Printf("\nAsset Placements:\n")
	for assetClass, placements := range plan.AssetPlacements {
		total := placements["roth"] + placements["tax_deferred"] + placements["taxable"]
		if total > 0 {
			fmt.Printf("\n  %s (Total: $%.0f):\n", assetClass, total)
			if placements["roth"] > 0 {
				fmt.Printf("    Roth:         $%.0f (%.1f%%)\n", placements["roth"], 100*placements["roth"]/total)
			}
			if placements["tax_deferred"] > 0 {
				fmt.Printf("    Tax-Deferred: $%.0f (%.1f%%)\n", placements["tax_deferred"], 100*placements["tax_deferred"]/total)
			}
			if placements["taxable"] > 0 {
				fmt.Printf("    Taxable:      $%.0f (%.1f%%)\n", placements["taxable"], 100*placements["taxable"]/total)
			}
		}
	}

	fmt.Printf("\nRecommendations:\n")
	for _, rec := range plan.Recommendations {
		fmt.Printf("  [P%d] %s → %s: %s\n", rec.Priority, rec.AssetClass, rec.RecommendedAccount, rec.Reason)
		if rec.TaxDragEstimate > 0 {
			fmt.Printf("       (Estimated annual tax drag: %.2f%%)\n", rec.TaxDragEstimate*100)
		}
	}
}
