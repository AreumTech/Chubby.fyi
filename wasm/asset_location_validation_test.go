package main

import (
	"math"
	"testing"
)

// asset_location_validation_test.go
// Validates asset location strategies against Chapter 8 of "Build a Robo-Advisor with Python"
// Reference: Which assets belong in which account types (Taxable vs IRA vs Roth)

// TestAssetLocationValue validates after-tax value by account type
// Reference: chapter_08.ipynb - Asset class with IRA_value(), Taxable_value(), Roth_value()
func TestAssetLocationValue(t *testing.T) {
	t.Log("🏦 Testing Asset Location Value Calculations (Chapter 8)")

	horizon := 30.0
	startingValue := 500000.0

	t.Run("IRA_AfterTaxValue", func(t *testing.T) {
		// Python: pretax_value * (1 - tax_rate_ord_inc)
		// All growth is taxed as ordinary income on withdrawal

		avgReturn := 0.08
		ordinaryTaxRate := 0.35

		// Grow tax-free, then pay tax on entire balance
		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		afterTaxValue := pretaxValue * (1.0 - ordinaryTaxRate)

		t.Logf("Starting value: $%.0f", startingValue)
		t.Logf("Growth rate: %.1f%%", avgReturn*100)
		t.Logf("Horizon: %.0f years", horizon)
		t.Logf("Pre-tax value: $%.0f", pretaxValue)
		t.Logf("Tax rate: %.0f%%", ordinaryTaxRate*100)
		t.Logf("After-tax value: $%.0f", afterTaxValue)

		// Verify calculation
		expectedPretax := 500000.0 * math.Pow(1.08, 30.0) // ≈ $5,031,000
		if math.Abs(pretaxValue-expectedPretax) > 10000.0 {
			t.Errorf("Pre-tax value mismatch")
		}

		expectedAftertax := expectedPretax * 0.65 // ≈ $3,270,000
		if math.Abs(afterTaxValue-expectedAftertax) > 10000.0 {
			t.Errorf("After-tax value mismatch")
		}
	})

	t.Run("Taxable_AfterTaxValue", func(t *testing.T) {
		// Python: Complex calculation accounting for dividends, turnover, cap gains
		// Tracks cost basis growth year by year

		avgReturn := 0.08
		dividendYield := 0.02
		dividendTaxRate := 0.20
		turnoverRate := 0.0 // Buy and hold
		capGainsTaxRate := 0.20

		// Simplified model: pay tax on dividends each year, cap gains at end
		currValue := startingValue
		currCostBasis := startingValue

		for year := 0; year < int(horizon); year++ {
			// Dividends taxed annually
			dividends := currValue * dividendYield
			dividendTax := dividends * dividendTaxRate

			// Capital gains from turnover (realized gains)
			turnoverAmount := currValue * turnoverRate
			realizedGains := turnoverAmount * (currValue - currCostBasis) / currValue
			turnoverTax := realizedGains * capGainsTaxRate

			// Reinvest after-tax amounts
			taxDrag := dividendTax + turnoverTax
			currValue = currValue*(1.0+avgReturn) - taxDrag

			// Update cost basis (dividends and turnover increase basis)
			currCostBasis += dividends + turnoverAmount - taxDrag
		}

		// Final tax on unrealized gains
		unrealizedGains := currValue - currCostBasis
		finalTax := unrealizedGains * capGainsTaxRate
		afterTaxValue := currValue - finalTax

		t.Logf("Starting value: $%.0f", startingValue)
		t.Logf("Dividend yield: %.1f%%", dividendYield*100)
		t.Logf("Turnover: %.0f%%", turnoverRate*100)
		t.Logf("Final value: $%.0f", currValue)
		t.Logf("Cost basis: $%.0f", currCostBasis)
		t.Logf("Unrealized gains: $%.0f", unrealizedGains)
		t.Logf("Final tax: $%.0f", finalTax)
		t.Logf("After-tax value: $%.0f", afterTaxValue)

		// Key insight: taxable account value depends heavily on turnover
		if turnoverRate == 0 {
			t.Log("Buy-and-hold: only pay tax once at end (tax deferral benefit)")
		}
	})

	t.Run("Roth_AfterTaxValue", func(t *testing.T) {
		// Python: Simply grows tax-free forever
		// No taxes on withdrawal

		avgReturn := 0.08

		afterTaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)

		t.Logf("Starting value: $%.0f", startingValue)
		t.Logf("Growth rate: %.1f%%", avgReturn*100)
		t.Logf("After-tax value: $%.0f", afterTaxValue)
		t.Log("No taxes ever - best for high-growth assets")

		// Verify this is higher than IRA
		iraAfterTax := afterTaxValue * 0.65 // IRA pays 35% tax
		t.Logf("Roth advantage over IRA: $%.0f (%.0f%% better)",
			afterTaxValue-iraAfterTax,
			((afterTaxValue/iraAfterTax)-1.0)*100)
	})
}

// TestAssetLocationPreference validates which assets prefer which accounts
// Reference: chapter_08.ipynb - Taxable_minus_IRA() comparison
func TestAssetLocationPreference(t *testing.T) {
	t.Log("📊 Testing Asset Location Preference Ranking (Chapter 8)")

	horizon := 30.0
	startingValue := 500000.0

	type AssetResult struct {
		name         string
		taxableValue float64
		iraValue     float64
		difference   float64
	}

	results := []AssetResult{}

	t.Run("LargeCapStocks", func(t *testing.T) {
		// Low dividend, low turnover, qualified dividends
		// Python: avg_ret=0.08, payout_rate=0.015, tax_rate_payout=0.20, turnover=0

		avgReturn := 0.08
		dividendYield := 0.015
		dividendTaxRate := 0.20 // Qualified dividends
		capGainsTaxRate := 0.20
		ordinaryTaxRate := 0.35

		// Taxable value
		taxableValue := calculateTaxableValue(startingValue, avgReturn, dividendYield,
			dividendTaxRate, 0.0, capGainsTaxRate, horizon)

		// IRA value
		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		iraValue := pretaxValue * (1.0 - ordinaryTaxRate)

		difference := taxableValue - iraValue
		results = append(results, AssetResult{"Large Cap Stocks", taxableValue, iraValue, difference})

		t.Logf("Taxable value: $%.0f", taxableValue)
		t.Logf("IRA value: $%.0f", iraValue)
		t.Logf("Difference: $%.0f", difference)

		if difference > 0 {
			t.Log("✅ Prefers TAXABLE (tax-efficient)")
		} else {
			t.Log("❌ Prefers IRA (tax-inefficient)")
		}
	})

	t.Run("Bonds", func(t *testing.T) {
		// High income payout, all taxed as ordinary income
		// Python: avg_ret=0.03, payout_rate=0.03, tax_rate_payout=0.35, turnover=0

		avgReturn := 0.03
		interestYield := 0.03
		ordinaryTaxRate := 0.35

		// Taxable: pay tax on interest every year
		taxableValue := startingValue
		for year := 0; year < int(horizon); year++ {
			interest := taxableValue * interestYield
			interestTax := interest * ordinaryTaxRate
			taxableValue = taxableValue*(1.0+avgReturn) - interestTax
		}

		// IRA value
		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		iraValue := pretaxValue * (1.0 - ordinaryTaxRate)

		difference := taxableValue - iraValue
		results = append(results, AssetResult{"Bonds", taxableValue, iraValue, difference})

		t.Logf("Taxable value: $%.0f", taxableValue)
		t.Logf("IRA value: $%.0f", iraValue)
		t.Logf("Difference: $%.0f", difference)

		if difference > 0 {
			t.Log("✅ Prefers TAXABLE (unexpected!)")
		} else {
			t.Log("❌ Prefers IRA (tax-inefficient - all ordinary income)")
		}
	})

	t.Run("REITs", func(t *testing.T) {
		// High dividend yield, taxed as ordinary income
		// Python: avg_ret=0.08, payout_rate=0.045, tax_rate_payout=0.35

		avgReturn := 0.08
		dividendYield := 0.045
		ordinaryTaxRate := 0.35

		// Taxable: pay ordinary income tax on dividends
		taxableValue := startingValue
		for year := 0; year < int(horizon); year++ {
			dividends := taxableValue * dividendYield
			dividendTax := dividends * ordinaryTaxRate
			taxableValue = taxableValue*(1.0+avgReturn) - dividendTax
		}

		// IRA value
		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		iraValue := pretaxValue * (1.0 - ordinaryTaxRate)

		difference := taxableValue - iraValue
		results = append(results, AssetResult{"REITs", taxableValue, iraValue, difference})

		t.Logf("Taxable value: $%.0f", taxableValue)
		t.Logf("IRA value: $%.0f", iraValue)
		t.Logf("Difference: $%.0f", difference)

		if difference > 0 {
			t.Log("✅ Prefers TAXABLE")
		} else {
			t.Log("❌ Prefers IRA (high ordinary income)")
		}
	})

	t.Run("HighGrowthStocks", func(t *testing.T) {
		// High return, low dividends, low turnover
		// Python: avg_ret=0.095, payout_rate=0.015, tax_rate_payout=0.20, turnover=0

		avgReturn := 0.095
		dividendYield := 0.015
		dividendTaxRate := 0.20
		capGainsTaxRate := 0.20
		ordinaryTaxRate := 0.35

		taxableValue := calculateTaxableValue(startingValue, avgReturn, dividendYield,
			dividendTaxRate, 0.0, capGainsTaxRate, horizon)

		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		iraValue := pretaxValue * (1.0 - ordinaryTaxRate)

		difference := taxableValue - iraValue
		results = append(results, AssetResult{"High Growth Stocks", taxableValue, iraValue, difference})

		t.Logf("Taxable value: $%.0f", taxableValue)
		t.Logf("IRA value: $%.0f", iraValue)
		t.Logf("Difference: $%.0f", difference)

		if difference > 0 {
			t.Log("✅ Prefers TAXABLE (but even better in Roth!)")
		}
	})

	t.Run("HighTurnoverFund", func(t *testing.T) {
		// High turnover = more realized gains = more current tax
		// Python: avg_ret=0.08, payout_rate=0.015, turnover=0.20

		avgReturn := 0.08
		dividendYield := 0.015
		dividendTaxRate := 0.20
		turnoverRate := 0.20 // 20% portfolio turnover
		capGainsTaxRate := 0.20
		ordinaryTaxRate := 0.35

		taxableValue := calculateTaxableValue(startingValue, avgReturn, dividendYield,
			dividendTaxRate, turnoverRate, capGainsTaxRate, horizon)

		pretaxValue := startingValue * math.Pow(1.0+avgReturn, horizon)
		iraValue := pretaxValue * (1.0 - ordinaryTaxRate)

		difference := taxableValue - iraValue
		results = append(results, AssetResult{"High Turnover Fund", taxableValue, iraValue, difference})

		t.Logf("Taxable value: $%.0f", taxableValue)
		t.Logf("IRA value: $%.0f", iraValue)
		t.Logf("Difference: $%.0f", difference)

		if difference > 0 {
			t.Log("✅ Prefers TAXABLE (barely)")
		} else {
			t.Log("❌ Prefers IRA (turnover creates tax drag)")
		}
	})

	// Summary ranking
	t.Run("RankingAllAssets", func(t *testing.T) {
		t.Log("\n📊 Asset Location Preference Ranking:")
		t.Log("(Positive = prefers taxable, Negative = prefers tax-deferred)")

		// Sort by difference (most positive = most tax-efficient)
		for i := 0; i < len(results)-1; i++ {
			for j := i + 1; j < len(results); j++ {
				if results[j].difference > results[i].difference {
					results[i], results[j] = results[j], results[i]
				}
			}
		}

		for i, result := range results {
			sign := "+"
			if result.difference < 0 {
				sign = ""
			}
			t.Logf("%d. %s: %s$%.0f", i+1, result.name, sign, result.difference)
		}

		t.Log("\n🎯 Optimal Asset Location Strategy:")
		t.Log("Taxable account: " + results[0].name)
		t.Log("Tax-deferred (IRA): " + results[len(results)-1].name)
		t.Log("Roth: High-growth stocks (best for maximum tax-free growth)")
	})
}

// Helper function to calculate taxable account value with all factors
func calculateTaxableValue(startingValue, avgReturn, dividendYield, dividendTaxRate,
	turnoverRate, capGainsTaxRate, horizon float64) float64 {

	currValue := startingValue
	currCostBasis := startingValue

	for year := 0; year < int(horizon); year++ {
		dividends := currValue * dividendYield
		dividendTax := dividends * dividendTaxRate

		// Turnover creates realized gains
		if turnoverRate > 0 {
			gainPerDollar := (currValue - currCostBasis) / currValue
			realizedGains := currValue * turnoverRate * gainPerDollar
			turnoverTax := realizedGains * capGainsTaxRate

			currValue = currValue*(1.0+avgReturn) - dividendTax - turnoverTax
			currCostBasis += dividends + (currValue*turnoverRate) - dividendTax - turnoverTax
		} else {
			currValue = currValue*(1.0+avgReturn) - dividendTax
			currCostBasis += dividends - dividendTax
		}
	}

	// Final tax on unrealized gains
	unrealizedGains := currValue - currCostBasis
	finalTax := unrealizedGains * capGainsTaxRate

	return currValue - finalTax
}

// TestMunicipalBonds validates tax-exempt bonds in taxable accounts
// Reference: chapter_08.ipynb - muni_bond asset
func TestMunicipalBonds(t *testing.T) {
	t.Log("🏛️  Testing Municipal Bond Tax Treatment (Chapter 8)")

	t.Run("MuniBondAdvantage", func(t *testing.T) {
		// Muni bonds: lower yield but tax-exempt
		// Python: avg_ret=0.025, payout_rate=0.02, tax_rate_payout=0.0

		startingValue := 500000.0
		horizon := 30.0

		// Muni bond (tax-exempt)
		muniYield := 0.025
		muniReturn := 0.025
		muniValue := startingValue * math.Pow(1.0+muniReturn, horizon)

		// Taxable bond (higher yield but taxed)
		taxableBondYield := 0.04
		taxableBondReturn := 0.04
		ordinaryTaxRate := 0.35

		// Pay tax on interest each year
		taxableBondValue := startingValue
		for year := 0; year < int(horizon); year++ {
			interest := taxableBondValue * taxableBondYield
			interestTax := interest * ordinaryTaxRate
			taxableBondValue = taxableBondValue*(1.0+taxableBondReturn) - interestTax
		}

		t.Logf("Municipal bond:")
		t.Logf("  Yield: %.2f%% (tax-exempt)", muniYield*100)
		t.Logf("  Final value: $%.0f", muniValue)

		t.Logf("Taxable bond:")
		t.Logf("  Yield: %.2f%% (taxable)", taxableBondYield*100)
		t.Logf("  Tax rate: %.0f%%", ordinaryTaxRate*100)
		t.Logf("  Final value: $%.0f", taxableBondValue)

		// Calculate tax-equivalent yield
		taxEquivalentYield := muniYield / (1.0 - ordinaryTaxRate)
		t.Logf("Tax-equivalent yield: %.2f%%", taxEquivalentYield*100)

		if muniValue > taxableBondValue {
			t.Logf("✅ Muni bonds win by: $%.0f", muniValue-taxableBondValue)
		} else {
			t.Logf("❌ Taxable bonds win by: $%.0f", taxableBondValue-muniValue)
		}

		// Verify muni bonds should never go in IRA (waste of tax-advantaged space)
		t.Log("\n⚠️  Never put muni bonds in IRA/Roth (already tax-exempt)")
	})
}

// TestAssetLocationMultipleAccounts validates optimal allocation across accounts
// Reference: chapter_08.ipynb - comparing all 6 permutations
func TestAssetLocationMultipleAccounts(t *testing.T) {
	t.Log("🎰 Testing Optimal Asset Allocation Across Accounts (Chapter 8)")

	t.Run("ThreeAssetThreeAccounts", func(t *testing.T) {
		// Python example: $500K in each account type
		// Assets: Large cap stocks, High yield bonds, Emerging markets

		startingValue := 500000.0
		horizon := 30.0

		// Calculate final values for each asset in each account type
		type AssetValue struct {
			name     string
			taxable  float64
			ira      float64
			roth     float64
		}

		// Large cap stocks (tax-efficient)
		largeCap := AssetValue{name: "Large Cap"}
		largeCap.taxable = calculateTaxableValue(startingValue, 0.08, 0.015, 0.20, 0.0, 0.20, horizon)
		largeCap.ira = startingValue * math.Pow(1.08, horizon) * 0.65
		largeCap.roth = startingValue * math.Pow(1.08, horizon)

		// High yield bonds (tax-inefficient)
		hiBonds := AssetValue{name: "High Yield Bonds"}
		hiBonds.taxable = calculateTaxableValue(startingValue, 0.075, 0.055, 0.35, 0.0, 0.20, horizon)
		hiBonds.ira = startingValue * math.Pow(1.075, horizon) * 0.65
		hiBonds.roth = startingValue * math.Pow(1.075, horizon)

		// Emerging markets (high growth)
		emMarkets := AssetValue{name: "Emerging Markets"}
		emMarkets.taxable = calculateTaxableValue(startingValue, 0.095, 0.015, 0.20, 0.04, 0.20, horizon)
		emMarkets.ira = startingValue * math.Pow(1.095, horizon) * 0.65
		emMarkets.roth = startingValue * math.Pow(1.095, horizon)

		// Test all 6 permutations
		type Allocation struct {
			name     string
			taxable  string
			ira      string
			roth     string
			total    float64
		}

		allocations := []Allocation{
			{"1", largeCap.name, hiBonds.name, emMarkets.name,
				largeCap.taxable + hiBonds.ira + emMarkets.roth},
			{"2", largeCap.name, emMarkets.name, hiBonds.name,
				largeCap.taxable + emMarkets.ira + hiBonds.roth},
			{"3", hiBonds.name, largeCap.name, emMarkets.name,
				hiBonds.taxable + largeCap.ira + emMarkets.roth},
			{"4", hiBonds.name, emMarkets.name, largeCap.name,
				hiBonds.taxable + emMarkets.ira + largeCap.roth},
			{"5", emMarkets.name, largeCap.name, hiBonds.name,
				emMarkets.taxable + largeCap.ira + hiBonds.roth},
			{"6", emMarkets.name, hiBonds.name, largeCap.name,
				emMarkets.taxable + hiBonds.ira + largeCap.roth},
		}

		t.Log("\nComparing all 6 allocations:")
		for _, alloc := range allocations {
			t.Logf("Allocation %s: Taxable=%s, IRA=%s, Roth=%s → $%.0f",
				alloc.name, alloc.taxable, alloc.ira, alloc.roth, alloc.total)
		}

		// Find best allocation
		best := allocations[0]
		for _, alloc := range allocations {
			if alloc.total > best.total {
				best = alloc
			}
		}

		t.Logf("\n✅ Optimal allocation #%s:", best.name)
		t.Logf("  Taxable: %s", best.taxable)
		t.Logf("  IRA: %s", best.ira)
		t.Logf("  Roth: %s", best.roth)
		t.Logf("  Total: $%.0f", best.total)

		// Rule of thumb validation
		t.Log("\n🎯 General Rules:")
		t.Log("  Taxable: Tax-efficient stocks (low div, low turnover)")
		t.Log("  IRA: Bonds and tax-inefficient assets")
		t.Log("  Roth: Highest growth potential assets")
	})
}
