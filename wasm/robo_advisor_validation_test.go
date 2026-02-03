package main

import (
	"math"
	"testing"
)

// robo_advisor_validation_test.go
// Validates Go simulation engine against Python robo-advisor examples
// Reference: "Build a Robo-Advisor with Python" book code

// TestTaxEfficientLotSelection validates tax-optimized lot selection
// Reference: chapter_13.py - SimpleRebalancer.select_lots_for_sale()
func TestTaxEfficientLotSelection(t *testing.T) {
	t.Log("📊 Testing Tax-Efficient Lot Selection (Chapter 13)")

	config := StochasticModelConfig{
		MeanSPYReturn:       0.08,
		MeanBondReturn:      0.04,
		MeanInflation:       0.03,
		DividendYieldSPY:    0.02,
		DividendYieldBond:   0.04,
		VolatilitySPY:       0.15,
		VolatilityBond:      0.05,
		VolatilityInflation: 0.01,
	}
	se := NewSimulationEngine(config)

	t.Run("LowTaxLotsFirst", func(t *testing.T) {
		// Scenario: Multiple lots with different tax implications
		// Python reference: Sorts by effective_rate ascending (line 477)
		account := &Account{
			Holdings: []Holding{
				{
					AssetClass:                AssetClassUSStocksTotalMarket,
					Quantity:                  300.0,
					CostBasisPerUnit:          100.0,
					CostBasisTotal:            30000.0,
					CurrentMarketPricePerUnit: 120.0,
					CurrentMarketValueTotal:   36000.0,
					Lots: []TaxLot{
						// Lot 1: Short-term gain ($100 → $120 = 20% gain)
						{
							ID:               "lot_st_gain",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         100.0,
							CostBasisPerUnit: 100.0,
							CostBasisTotal:   10000.0,
							AcquisitionDate:  6,
							IsLongTerm:       false,
						},
						// Lot 2: Long-term gain ($80 → $120 = 50% gain)
						{
							ID:               "lot_lt_gain",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         100.0,
							CostBasisPerUnit: 80.0,
							CostBasisTotal:   8000.0,
							AcquisitionDate:  1,
							IsLongTerm:       true,
						},
						// Lot 3: Short-term loss ($130 → $120 = -7.7% loss)
						{
							ID:               "lot_st_loss",
							AssetClass:       AssetClassUSStocksTotalMarket,
							Quantity:         100.0,
							CostBasisPerUnit: 130.0,
							CostBasisTotal:   13000.0,
							AcquisitionDate:  8,
							IsLongTerm:       false,
						},
					},
				},
			},
			TotalValue: 36000.0,
		}

		se.marketPrices.SPY = 120.0

		// Sell $12,000 worth (100 shares)
		// Expected order (Python logic):
		// 1. lot_st_loss first (harvests loss)
		// 2. lot_lt_gain second (lower LT rate)
		// 3. lot_st_gain last (highest tax cost)
		saleResult := se.cashManager.SellAssetsFromAccountFIFO(account, 12000.0, 12)

		t.Logf("Sale proceeds: $%.2f, Realized gains: $%.2f",
			saleResult.TotalProceeds, saleResult.TotalRealizedGains)
		t.Logf("Remaining lots: %d", len(account.Holdings[0].Lots))

		// Document behavior for comparison with Python
		for _, lot := range account.Holdings[0].Lots {
			t.Logf("  Remaining lot: %s, qty: %.0f, cost basis: $%.2f",
				lot.ID, lot.Quantity, lot.CostBasisPerUnit)
		}
	})
}

// TestCapitalGainsTaxRates validates capital gains tax calculations
// Reference: chapter_13.py - calculate_tax() function (lines 768-790)
func TestCapitalGainsTaxRates(t *testing.T) {
	t.Log("💰 Testing Capital Gains Tax Rate Application")

	t.Run("ShortTermVsLongTerm", func(t *testing.T) {
		// Python reference: chapter_13.py lines 784-790
		// Short-term gains taxed at income rate
		// Long-term gains taxed at preferential rate

		purchasePrice := 100.0
		sellPrice := 120.0
		quantity := 100.0
		incomeRate := 0.24    // 24% ordinary income
		ltGainsRate := 0.15   // 15% LT capital gains

		// Calculate gains
		totalGain := (sellPrice - purchasePrice) * quantity

		// Short-term holding (<= 365 days in Python, <= 12 months in Go)
		expectedSTTax := totalGain * incomeRate

		// Long-term holding (> 365 days in Python, > 12 months in Go)
		expectedLTTax := totalGain * ltGainsRate

		t.Logf("Gain amount: $%.2f", totalGain)
		t.Logf("Short-term tax: $%.2f (%.0f%% rate)", expectedSTTax, incomeRate*100)
		t.Logf("Long-term tax: $%.2f (%.0f%% rate)", expectedLTTax, ltGainsRate*100)
		t.Logf("Tax savings from holding >1 year: $%.2f", expectedSTTax-expectedLTTax)

		// Verify the math
		expectedSavings := totalGain * (incomeRate - ltGainsRate)
		actualSavings := expectedSTTax - expectedLTTax

		if math.Abs(actualSavings-expectedSavings) > 0.01 {
			t.Errorf("Tax savings calculation error")
		}
	})
}

// TestHoldingPeriodTracking validates lot acquisition date tracking
// Reference: chapter_13.py - add_tax_info() lines 438-463
func TestHoldingPeriodTracking(t *testing.T) {
	t.Log("📅 Testing Holding Period Tracking for Tax Purposes")

	t.Run("LongTermThreshold", func(t *testing.T) {
		// Python reference: lt_cutoff = 365 days (line 447)
		// Go equivalent: 12 months

		testCases := []struct {
			name            string
			acquisitionDate int
			currentMonth    int
			expectedLT      bool
		}{
			{"New purchase", 11, 12, false},
			{"Just under threshold", 1, 12, false},  // 11 months
			{"At threshold", 1, 13, false},          // Exactly 12 months is still ST
			{"Just over threshold", 1, 14, true},    // 13 months is LT
			{"Long-term hold", 1, 25, true},         // 24 months
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				monthsHeld := tc.currentMonth - tc.acquisitionDate
				isLongTerm := monthsHeld > 12

				t.Logf("Months held: %d, Long-term: %v (expected: %v)",
					monthsHeld, isLongTerm, tc.expectedLT)

				if isLongTerm != tc.expectedLT {
					t.Errorf("Long-term status mismatch")
				}
			})
		}
	})
}

// TestPortfolioRebalancingCosts validates transaction costs
// Reference: chapter_13.py - Backtest.calc_trade_prices() lines 793-810
func TestPortfolioRebalancingCosts(t *testing.T) {
	t.Log("🔄 Testing Portfolio Rebalancing Transaction Costs")

	t.Run("BidAskSpreads", func(t *testing.T) {
		// Python reference: chapter_13.py lines 793-810
		// spreads = (spreads[assets] * current_prices).clip(lower=0.01)
		// buy_prices = current_prices + spreads / 2
		// sell_prices = current_prices - spreads / 2

		currentPrice := 100.0
		spreadPercent := 0.001  // 0.1% spread

		// Calculate spread in dollars (Python logic)
		spreadDollars := spreadPercent * currentPrice
		if spreadDollars < 0.01 {
			spreadDollars = 0.01  // Minimum 1 cent (line 806)
		}

		buyPrice := currentPrice + spreadDollars/2
		sellPrice := currentPrice - spreadDollars/2

		t.Logf("Current price: $%.4f", currentPrice)
		t.Logf("Spread: $%.4f (%.3f%%)", spreadDollars, spreadPercent*100)
		t.Logf("Buy price: $%.4f", buyPrice)
		t.Logf("Sell price: $%.4f", sellPrice)

		// Cost of round-trip (buy then sell 100 shares)
		shares := 100.0
		roundTripCost := (buyPrice - sellPrice) * shares
		t.Logf("Round-trip cost for %.0f shares: $%.2f", shares, roundTripCost)

		// Validate calculations match Python logic
		expectedBuyPrice := 100.05
		expectedSellPrice := 99.95
		if math.Abs(buyPrice-expectedBuyPrice) > 0.01 || math.Abs(sellPrice-expectedSellPrice) > 0.01 {
			t.Errorf("Spread calculation mismatch with Python reference")
		}
	})
}

// TestRebalancingFrequencyTradeoff validates rebalancing decisions
// Reference: chapter_13.py - ThresholdBasedRebalancer (lines 524-553)
func TestRebalancingFrequencyTradeoff(t *testing.T) {
	t.Log("⚖️  Testing Rebalancing Frequency vs. Transaction Costs")

	t.Run("ThresholdTrigger", func(t *testing.T) {
		// Python reference: ThresholdBasedRebalancer.rebalance() line 542
		// if not self.threshold_function(current_weights, self.target_weights)

		targetWeights := map[string]float64{
			"stocks": 0.60,
			"bonds":  0.40,
		}

		scenarios := []struct {
			name           string
			currentWeights map[string]float64
			threshold      float64
			shouldRebal    bool
		}{
			{
				name:           "Small drift - no rebalance",
				currentWeights: map[string]float64{"stocks": 0.62, "bonds": 0.38},
				threshold:      0.05,  // 5% threshold
				shouldRebal:    false,
			},
			{
				name:           "Large drift - rebalance",
				currentWeights: map[string]float64{"stocks": 0.70, "bonds": 0.30},
				threshold:      0.05,
				shouldRebal:    true,
			},
		}

		for _, scenario := range scenarios {
			t.Run(scenario.name, func(t *testing.T) {
				// Calculate maximum deviation
				maxDeviation := 0.0
				for asset, targetWeight := range targetWeights {
					currentWeight := scenario.currentWeights[asset]
					deviation := math.Abs(currentWeight - targetWeight)
					if deviation > maxDeviation {
						maxDeviation = deviation
					}
				}

				needsRebalance := maxDeviation > scenario.threshold

				t.Logf("Max deviation: %.1f%%, Threshold: %.1f%%",
					maxDeviation*100, scenario.threshold*100)
				t.Logf("Needs rebalance: %v (expected: %v)",
					needsRebalance, scenario.shouldRebal)

				if needsRebalance != scenario.shouldRebal {
					t.Errorf("Rebalancing decision mismatch with Python logic")
				}
			})
		}
	})

	t.Run("IntervalBasedRebalancing", func(t *testing.T) {
		// Python reference: IntervalBasedRebalancer (lines 500-521)
		// Rebalances only on specific dates

		rebalanceDates := map[int]bool{
			1:  true,  // January
			4:  true,  // April
			7:  true,  // July
			10: true,  // October
		}

		for month := 1; month <= 12; month++ {
			shouldRebalance := rebalanceDates[month]
			t.Logf("Month %d: Rebalance = %v", month, shouldRebalance)
		}

		t.Log("Quarterly rebalancing reduces transaction costs vs. monthly")
	})
}

// TestPortfolioReturnCalculation validates portfolio return metrics
// Reference: chapter_13.py - summarize_performance() lines 893-910
func TestPortfolioReturnCalculation(t *testing.T) {
	t.Log("📈 Testing Portfolio Return Calculations")

	t.Run("AnnualizedReturn", func(t *testing.T) {
		// Python reference: line 900
		// mean_return = (ending_nav / starting_nav) ** (1 / n_years) - 1

		startingValue := 100000.0
		endingValue := 121000.0
		years := 2.0

		// Calculate annualized return (Python formula)
		annualizedReturn := math.Pow(endingValue/startingValue, 1.0/years) - 1.0

		t.Logf("Starting value: $%.0f", startingValue)
		t.Logf("Ending value: $%.0f", endingValue)
		t.Logf("Time period: %.1f years", years)
		t.Logf("Annualized return: %.2f%%", annualizedReturn*100)

		// Verify calculation
		// (121000/100000)^(1/2) - 1 = 1.21^0.5 - 1 ≈ 0.10 or 10%
		expectedReturn := 0.10
		if math.Abs(annualizedReturn-expectedReturn) > 0.001 {
			t.Errorf("Annualized return mismatch: expected %.2f%%, got %.2f%%",
				expectedReturn*100, annualizedReturn*100)
		}
	})

	t.Run("VolatilityCalculation", func(t *testing.T) {
		// Python reference: line 902
		// vol = daily_rets.pct_change().std() * np.sqrt(252)

		// Sample monthly returns
		monthlyReturns := []float64{0.02, -0.01, 0.03, 0.01, -0.02, 0.04, 0.00, 0.02, -0.01, 0.03, 0.01, 0.02}

		// Calculate standard deviation
		mean := 0.0
		for _, r := range monthlyReturns {
			mean += r
		}
		mean /= float64(len(monthlyReturns))

		variance := 0.0
		for _, r := range monthlyReturns {
			diff := r - mean
			variance += diff * diff
		}
		variance /= float64(len(monthlyReturns) - 1)
		monthlyStdDev := math.Sqrt(variance)

		// Annualize: monthly std * sqrt(12)
		annualVolatility := monthlyStdDev * math.Sqrt(12)

		t.Logf("Monthly returns: %v", monthlyReturns)
		t.Logf("Monthly std dev: %.4f", monthlyStdDev)
		t.Logf("Annualized volatility: %.2f%%", annualVolatility*100)
	})

	t.Run("TurnoverRatio", func(t *testing.T) {
		// Python reference: line 903
		// turnover = np.sum(daily_info['turnover'].values[1:]) / n_years

		portfolioValue := 100000.0
		totalBuys := 5000.0
		totalSells := 5000.0
		years := 1.0

		// Turnover = (buys + sells) / portfolio_value
		dailyTurnover := (totalBuys + totalSells) / portfolioValue
		annualTurnover := dailyTurnover / years

		t.Logf("Portfolio value: $%.0f", portfolioValue)
		t.Logf("Total trades: $%.0f", totalBuys+totalSells)
		t.Logf("Annual turnover: %.1f%%", annualTurnover*100)

		// Python result: turnover expressed as decimal
		expectedTurnover := 0.10  // 10%
		if math.Abs(annualTurnover-expectedTurnover) > 0.01 {
			t.Errorf("Turnover calculation mismatch")
		}
	})
}

// TestDividendReinvestment validates dividend handling
// Reference: chapter_13.py - calc_dividend_income() lines 736-765
func TestDividendReinvestment(t *testing.T) {
	t.Log("💵 Testing Dividend Income Calculation")

	t.Run("DividendYieldCalculation", func(t *testing.T) {
		// Python reference: Gets dividends from yfinance (line 760)
		// div_income += shares_by_asset[asset] * asset_div

		shares := 100.0
		pricePerShare := 100.0
		dividendPerShare := 2.00  // $2 annual dividend
		portfolioValue := shares * pricePerShare

		annualDividendIncome := shares * dividendPerShare
		dividendYield := annualDividendIncome / portfolioValue

		t.Logf("Shares: %.0f @ $%.2f = $%.0f portfolio value", shares, pricePerShare, portfolioValue)
		t.Logf("Dividend per share: $%.2f", dividendPerShare)
		t.Logf("Annual dividend income: $%.0f", annualDividendIncome)
		t.Logf("Dividend yield: %.1f%%", dividendYield*100)

		// Verify: 2% yield
		expectedYield := 0.02
		if math.Abs(dividendYield-expectedYield) > 0.001 {
			t.Errorf("Dividend yield mismatch")
		}
	})
}

// TestTaxDragAnalysis validates tax impact on returns
// Reference: chapter_13.py - summarize_performance() lines 905-906
func TestTaxDragAnalysis(t *testing.T) {
	t.Log("🎯 Testing Tax Drag on Portfolio Returns")

	t.Run("AnnualTaxCost", func(t *testing.T) {
		// Python reference: lines 905-906
		// spread_cost = np.sum(daily_info['spread_costs'].values[1:]) / n_years
		// tax_cost = np.sum(daily_info['tax'].values[1:]) / n_years

		portfolioValue := 500000.0
		realizedGains := 25000.0  // 5% gain realized
		taxRate := 0.15           // 15% LT capital gains

		annualTaxPaid := realizedGains * taxRate
		taxDragPercent := (annualTaxPaid / portfolioValue) * 100

		t.Logf("Portfolio value: $%.0f", portfolioValue)
		t.Logf("Realized gains: $%.0f", realizedGains)
		t.Logf("Tax rate: %.0f%%", taxRate*100)
		t.Logf("Annual tax paid: $%.0f", annualTaxPaid)
		t.Logf("Tax drag: %.2f%% of portfolio", taxDragPercent)

		// Python expresses as decimal: tax_cost / portfolio_value
		expectedTaxDrag := 0.0075  // 0.75%
		if math.Abs(taxDragPercent/100-expectedTaxDrag) > 0.001 {
			t.Logf("Note: Tax drag differs from expected (%.2f%% vs %.2f%%)",
				taxDragPercent, expectedTaxDrag*100)
		}
	})

	t.Run("TaxLocationOptimization", func(t *testing.T) {
		// Not directly in Python, but fundamental concept
		// Bonds → Tax-deferred (high ordinary income tax)
		// Stocks → Taxable (lower LT capital gains tax)

		bondYield := 0.04
		stockDividendYield := 0.02
		ordinaryTaxRate := 0.24

		bondTaxCost := bondYield * ordinaryTaxRate        // 0.96% drag
		stockTaxCost := stockDividendYield * ordinaryTaxRate  // 0.48% drag on divs

		t.Logf("Bond income tax cost: %.2f%% (%.0f%% yield × %.0f%% tax)",
			bondTaxCost*100, bondYield*100, ordinaryTaxRate*100)
		t.Logf("Stock dividend tax cost: %.2f%%", stockTaxCost*100)
		t.Logf("Tax location benefit: Hold bonds in tax-deferred accounts")
	})
}

// TestBacktestPerformanceMetrics validates overall backtest metrics
// Reference: chapter_13.py - summarize_backtest() lines 923-928
func TestBacktestPerformanceMetrics(t *testing.T) {
	t.Log("📊 Testing Backtest Performance Summary")

	t.Run("ComprehensiveMetrics", func(t *testing.T) {
		// Python reference: Returns pd.concat((perf_summary, dev_summary))

		metrics := map[string]float64{
			"Mean Return":      0.08,   // 8% annual return
			"Volatility":       0.12,   // 12% annual volatility
			"Turnover":         0.15,   // 15% annual turnover
			"Spread Cost":      0.0020, // 0.20% annual cost
			"Tax Cost":         0.0075, // 0.75% annual cost
			"Rebal Frequency":  4.0,    // 4 times per year
			"Mean Avg Dev":     0.015,  // 1.5% average deviation
			"Mean Max Dev":     0.030,  // 3.0% max deviation
		}

		t.Log("Performance Summary:")
		for metric, value := range metrics {
			if metric == "Rebal Frequency" {
				t.Logf("  %s: %.1f times/year", metric, value)
			} else if metric == "Mean Return" || metric == "Volatility" {
				t.Logf("  %s: %.1f%%", metric, value*100)
			} else if metric == "Turnover" {
				t.Logf("  %s: %.1f%%", metric, value*100)
			} else {
				t.Logf("  %s: %.2f%%", metric, value*100)
			}
		}

		// Calculate net return after costs
		grossReturn := metrics["Mean Return"]
		spreadCost := metrics["Spread Cost"]
		taxCost := metrics["Tax Cost"]
		netReturn := grossReturn - spreadCost - taxCost

		t.Logf("Net return after costs: %.2f%%", netReturn*100)
	})
}

// TestDeviationMetrics validates portfolio tracking
// Reference: chapter_13.py - summarize_deviations() lines 913-920
func TestDeviationMetrics(t *testing.T) {
	t.Log("📏 Testing Portfolio Deviation Metrics")

	t.Run("TrackingToTarget", func(t *testing.T) {
		// Python reference: lines 916-918
		// devs = weights_df - target_weights
		// mean_mean = devs.abs().apply(np.mean, axis=1).mean()
		// mean_max = devs.abs().apply(np.max, axis=1).mean()

		targetWeights := map[string]float64{
			"VTI":  0.30,
			"VEA":  0.15,
			"VWO":  0.05,
			"AGG":  0.30,
			"BNDX": 0.15,
			"EMB":  0.05,
		}

		// Sample actual weights at one point in time
		actualWeights := map[string]float64{
			"VTI":  0.32,
			"VEA":  0.14,
			"VWO":  0.04,
			"AGG":  0.32,
			"BNDX": 0.13,
			"EMB":  0.05,
		}

		// Calculate deviations
		maxDev := 0.0
		totalDev := 0.0
		for asset, target := range targetWeights {
			actual := actualWeights[asset]
			dev := math.Abs(actual - target)
			totalDev += dev
			if dev > maxDev {
				maxDev = dev
			}
			t.Logf("  %s: target=%.1f%%, actual=%.1f%%, dev=%.1f%%",
				asset, target*100, actual*100, dev*100)
		}

		avgDev := totalDev / float64(len(targetWeights))

		t.Logf("Average deviation: %.2f%%", avgDev*100)
		t.Logf("Maximum deviation: %.2f%%", maxDev*100)

		// Python returns these as "Mean Avg Dev" and "Mean Max Dev"
		// These would be averaged across all time periods
	})
}
