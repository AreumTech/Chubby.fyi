package engine

// GetDefaultStochasticConfig returns a default stochastic model configuration
// This function is available for both WASM builds and tests
func GetDefaultStochasticConfig() StochasticModelConfig {
	return StochasticModelConfig{
		// Mean returns (annual)
		MeanSPYReturn:             0.07,  // 7% S&P 500
		MeanBondReturn:            0.03,  // 3% bonds
		MeanIntlStockReturn:       0.06,  // 6% international
		MeanInflation:             0.025, // 2.5% inflation
		MeanHomeValueAppreciation: 0.03,  // 3% home appreciation
		MeanRentalIncomeGrowth:    0.025, // 2.5% rental growth
		MeanOtherReturn:           0.08,  // 8% alternative assets
		MeanIndividualStockReturn: 0.10,  // 10% individual stocks (higher risk)

		// Volatilities (annual)
		VolatilitySPY:                0.16,  // 16% SPY volatility
		VolatilityBond:               0.05,  // 5% bond volatility
		VolatilityIntlStock:          0.20,  // 20% international volatility
		VolatilityInflation:          0.015, // 1.5% inflation volatility
		VolatilityHomeValue:          0.12,  // 12% home price volatility
		VolatilityRentalIncomeGrowth: 0.08,  // 8% rental income volatility
		VolatilityOther:              0.25,  // 25% alternative assets volatility
		VolatilityIndividualStock:    0.35,  // 35% individual stock volatility

		// GARCH Parameters for volatility clustering
		// SPY GARCH(1,1) parameters (estimated from historical data)
		GarchSPYOmega: 0.000015, // Long-term variance level
		GarchSPYAlpha: 0.08,     // Impact of previous shock
		GarchSPYBeta:  0.91,     // Persistence of volatility

		// Bond GARCH(1,1) parameters
		GarchBondOmega: 0.000005,
		GarchBondAlpha: 0.05,
		GarchBondBeta:  0.93,

		// International Stock GARCH(1,1) parameters
		GarchIntlStockOmega: 0.000020,
		GarchIntlStockAlpha: 0.09,
		GarchIntlStockBeta:  0.89,

		// Other/Alternative Assets GARCH(1,1) parameters
		GarchOtherOmega: 0.0001,
		GarchOtherAlpha: 0.12,
		GarchOtherBeta:  0.86,

		// Individual Stock GARCH(1,1) parameters
		GarchIndividualStockOmega: 0.0003,
		GarchIndividualStockAlpha: 0.15,
		GarchIndividualStockBeta:  0.82,

		// AR(1) parameters for inflation dynamics
		AR1InflationConstant: 0.01,
		AR1InflationPhi:      0.5,

		// AR(1) parameters for home value dynamics
		AR1HomeValueConstant: 0.01,
		AR1HomeValuePhi:      0.6,

		// AR(1) parameters for rental income growth
		AR1RentalIncomeGrowthConstant: 0.008,
		AR1RentalIncomeGrowthPhi:      0.5,

		// Fat tail parameter for Student's t-distribution (degrees of freedom)
		FatTailParameter: 5.0,

		// Correlation matrix (8x8: SPY, Bond, Intl, Infl, Home, Rent, Other, Individual)
		// Based on historical correlations - positive definite matrix
		CorrelationMatrix: [][]float64{
			//  SPY    Bond   Intl   Infl   Home   Rent   Other  Indiv
			{1.00,  -0.20,  0.85,  0.15,  0.25,  0.30,  0.70,  0.75}, // SPY
			{-0.20,  1.00, -0.15, -0.40,  0.10,  0.05, -0.10, -0.15}, // Bonds
			{0.85,  -0.15,  1.00,  0.20,  0.20,  0.25,  0.65,  0.70}, // International
			{0.15,  -0.40,  0.20,  1.00,  0.30,  0.35,  0.20,  0.15}, // Inflation
			{0.25,   0.10,  0.20,  0.30,  1.00,  0.60,  0.30,  0.25}, // Home Value
			{0.30,   0.05,  0.25,  0.35,  0.60,  1.00,  0.35,  0.30}, // Rental Income
			{0.70,  -0.10,  0.65,  0.20,  0.30,  0.35,  1.00,  0.80}, // Other/Alternative
			{0.75,  -0.15,  0.70,  0.15,  0.25,  0.30,  0.80,  1.00}, // Individual Stocks
		},

		// Dividend yields (set but disabled by default)
		DividendYieldSPY:       0.018, // 1.8% S&P 500 dividend yield
		DividendYieldIntlStock: 0.025, // 2.5% international dividend yield
		DividendYieldBond:      0.032, // 3.2% bond interest income
		DividendYieldDefault:   0.015, // 1.5% default yield for other assets

		// Tax timing configuration
		PayTaxesEndOfYear: true, // Pay taxes at end of year (December) instead of April - enabled by default to disable tax float

		// Additional configuration
		EnableDividends: false, // Disabled by default for performance
	}
}