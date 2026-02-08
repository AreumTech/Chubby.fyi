package main

import (
	"math"
	"testing"
)

// TestGarchReturnDistribution generates many months of GARCH returns
// and checks that the distribution is reasonable.
func TestGarchReturnDistribution(t *testing.T) {
	config := GetDefaultStochasticConfig()
	config.RandomSeed = 42
	config.SimulationMode = "stochastic"
	config.LiteMode = false

	if err := PrecomputeConfigParameters(&config); err != nil {
		t.Fatalf("PrecomputeConfigParameters failed: %v", err)
	}

	rng := NewSeededRNG(42)

	state := StochasticState{
		SPYVolatility:            config.VolatilitySPY,
		SPYLastReturn:            config.MeanSPYReturn,
		BNDVolatility:            config.VolatilityBond,
		BNDLastReturn:            config.MeanBondReturn,
		IntlVolatility:           config.VolatilityIntlStock,
		IntlLastReturn:           config.MeanIntlStockReturn,
		OtherVolatility:          config.VolatilityOther,
		OtherLastReturn:          config.MeanOtherReturn,
		IndividualStockVolatility: config.VolatilityIndividualStock,
		IndividualStockLastReturn: config.MeanIndividualStockReturn,
		LastInflation:            config.MeanInflation,
		LastHomeValueGrowth:      config.MeanHomeValueAppreciation,
		LastRentalIncomeGrowth:   config.MeanRentalIncomeGrowth,
	}

	months := 600 // 50 years
	spyReturns := make([]float64, months)
	spyVols := make([]float64, months)
	cumulativeSPY := 1.0

	for m := 0; m < months; m++ {
		returns, newState, err := GenerateAdvancedStochasticReturnsSeeded(state, &config, rng)
		if err != nil {
			t.Fatalf("Month %d: %v", m, err)
		}
		spyReturns[m] = returns.SPY
		spyVols[m] = newState.SPYVolatility // annual vol stored in state
		cumulativeSPY *= (1 + returns.SPY)
		state = newState
	}

	// Compute stats
	sumR, sumR2 := 0.0, 0.0
	minR, maxR := spyReturns[0], spyReturns[0]
	for _, r := range spyReturns {
		sumR += r
		sumR2 += r * r
		if r < minR {
			minR = r
		}
		if r > maxR {
			maxR = r
		}
	}
	meanR := sumR / float64(months)
	varR := sumR2/float64(months) - meanR*meanR
	stdR := math.Sqrt(varR)

	annualizedMean := math.Pow(1+meanR, 12) - 1
	annualizedVol := stdR * math.Sqrt(12)

	t.Logf("=== GARCH SPY Monthly Return Distribution (%d months) ===", months)
	t.Logf("Monthly mean:     %.4f%% (expected ~0.57%%)", meanR*100)
	t.Logf("Monthly std:      %.4f%% (expected ~4.6%%)", stdR*100)
	t.Logf("Monthly min:      %.4f%%", minR*100)
	t.Logf("Monthly max:      %.4f%%", maxR*100)
	t.Logf("Annualized mean:  %.2f%% (expected ~7%%)", annualizedMean*100)
	t.Logf("Annualized vol:   %.2f%% (expected ~16%%)", annualizedVol*100)
	t.Logf("Cumulative (50yr): %.2fx ($250K → $%.0fK)", cumulativeSPY, 250*cumulativeSPY)

	// GARCH vol at start and end
	t.Logf("GARCH vol[0]:  %.2f%% annual", spyVols[0]*100)
	t.Logf("GARCH vol[60]: %.2f%% annual", spyVols[60]*100)
	t.Logf("GARCH vol[300]:%.2f%% annual", spyVols[300]*100)
	t.Logf("GARCH vol[599]:%.2f%% annual", spyVols[599]*100)

	// Check GARCH unconditional vol
	// σ² = ω / (1 - α - β)
	monthlyOmega := config.GarchSPYOmega / 12.0
	unconditionalVar := monthlyOmega / (1.0 - config.GarchSPYAlpha - config.GarchSPYBeta)
	unconditionalMonthlyVol := math.Sqrt(unconditionalVar)
	unconditionalAnnualVol := unconditionalMonthlyVol * math.Sqrt(12)
	t.Logf("GARCH unconditional vol: %.2f%% annual (monthly omega=%.8f, 1-α-β=%.4f)",
		unconditionalAnnualVol*100, monthlyOmega, 1-config.GarchSPYAlpha-config.GarchSPYBeta)

	// Now compare with lite mode
	rng2 := NewSeededRNG(42)
	config2 := config
	config2.LiteMode = true
	cumulativeLite := 1.0
	liteReturns := make([]float64, months)
	for m := 0; m < months; m++ {
		returns, _, err := GenerateAdvancedStochasticReturnsSeeded(state, &config2, rng2)
		if err != nil {
			t.Fatalf("Lite month %d: %v", m, err)
		}
		liteReturns[m] = returns.SPY
		cumulativeLite *= (1 + returns.SPY)
	}
	sumLR, sumLR2 := 0.0, 0.0
	for _, r := range liteReturns {
		sumLR += r
		sumLR2 += r * r
	}
	liteMean := sumLR / float64(months)
	liteVar := sumLR2/float64(months) - liteMean*liteMean
	liteStd := math.Sqrt(liteVar)
	t.Logf("")
	t.Logf("=== LITE MODE SPY Monthly Return Distribution ===")
	t.Logf("Monthly mean:     %.4f%%", liteMean*100)
	t.Logf("Monthly std:      %.4f%%", liteStd*100)
	t.Logf("Annualized mean:  %.2f%%", (math.Pow(1+liteMean, 12)-1)*100)
	t.Logf("Annualized vol:   %.2f%%", liteStd*math.Sqrt(12)*100)
	t.Logf("Cumulative (50yr): %.2fx ($250K → $%.0fK)", cumulativeLite, 250*cumulativeLite)
}
