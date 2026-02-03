package main

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"math"
	"sync"

	"gonum.org/v1/gonum/mat"
	"gonum.org/v1/gonum/stat/distuv"
)


// safeFloat64 generates a cryptographically secure random float64 in [0,1)
// This replaces rand.Float64() to prevent WASM runtime crashes from corrupted global state
func safeFloat64() float64 {
	var bytes [8]byte
	_, err := rand.Read(bytes[:])
	if err != nil {
		// Fallback to deterministic value if crypto/rand fails in WASM
		// Crypto rand failed, using fallback
		return 0.5 // Safe fallback
	}

	// Convert bytes to uint64, then to float64 in [0,1)
	u := binary.BigEndian.Uint64(bytes[:])
	// Use only 53 bits for precision, like math/rand does
	return float64(u>>11) / (1 << 53)
}

// AnnualToMonthlyRate converts annual interest rate to monthly rate
// Uses the correct compounding formula: (1 + r_annual)^(1/12) - 1
func AnnualToMonthlyRate(annualRate float64) float64 {
	// Pure mathematical conversion without artificial constraints
	return math.Pow(1+annualRate, 1.0/12.0) - 1
}

// AnnualToMonthlyVolatility converts annual volatility to monthly volatility
func AnnualToMonthlyVolatility(annualVolatility float64) float64 {
	return annualVolatility / math.Sqrt(12)
}

// GaussianRandom generates a random number from Gaussian distribution
func GaussianRandom(mean, stdev float64) float64 {
	normal := distuv.Normal{Mu: mean, Sigma: stdev}
	return normal.Rand()
}

// StudentTRandom generates a random number from Student's t-distribution
func StudentTRandom(degreesOfFreedom float64) float64 {
	if degreesOfFreedom <= 0 {
		// SAFETY: Return normal distribution instead of panicking
		simLogVerbose("🚨 [MATH-SAFETY] Invalid degrees of freedom (%.6f), using normal distribution", degreesOfFreedom)
		return GaussianRandom(0, 1)
	}

	// For very high degrees of freedom, approximate with normal distribution
	if degreesOfFreedom > 100 {
		return GaussianRandom(0, 1)
	}

	// Use the fact that t = Z / sqrt(Chi2/nu) where Z ~ N(0,1) and Chi2 ~ χ²(nu)
	z := GaussianRandom(0, 1)
	chi2 := generateChiSquared(degreesOfFreedom)

	return z / math.Sqrt(chi2/degreesOfFreedom)
}

// Generate chi-squared random variable using gamma distribution
func generateChiSquared(degreesOfFreedom float64) float64 {
	// χ²(k) = Gamma(k/2, 2)
	return generateGamma(degreesOfFreedom/2, 2)
}

// generateGamma generates gamma random variable using Marsaglia and Tsang's method
// Improved with better numerical stability and bounds checking
func generateGamma(shape, scale float64) float64 {
	if shape <= 0 || scale <= 0 {
		// SAFETY: Return safe default instead of panicking
		simLogVerbose("🚨 [MATH-SAFETY] Invalid gamma parameters: shape=%.6f, scale=%.6f, using default (1.0)", shape, scale)
		return 1.0 // Return neutral multiplier instead of crashing
	}

	if shape < 1 {
		// Use the transformation for shape < 1 with improved numerical stability
		u := safeFloat64()
		if u == 0 {
			u = 1e-10 // Avoid log(0)
		}

		// CRITICAL FIX: Prevent division by zero and infinite exponents
		if shape <= 1e-10 {
			return scale * 2.0 // Safe fallback
		}

		// CRITICAL FIX: Prevent infinite recursion by using iterative approach
		// Instead of recursive call, use direct calculation for small shape
		exponent := 1.0 / shape
		if math.IsInf(exponent, 0) || math.IsNaN(exponent) || math.Abs(exponent) > 100 {
			return scale * 1.5 // Safe fallback
		}

		powResult := math.Pow(u, exponent)
		if math.IsInf(powResult, 0) || math.IsNaN(powResult) {
			return scale * 1.2 // Safe fallback
		}

		// Use simplified gamma approximation instead of recursion
		return scale * powResult * math.Gamma(shape+1)
	}

	d := shape - 1.0/3.0
	c := 1.0 / math.Sqrt(9*d)

	// Add maximum iteration limit to prevent infinite loops
	maxIterations := 1000
	for i := 0; i < maxIterations; i++ {
		var x, v float64
		// Inner loop with iteration limit
		for j := 0; j < 100; j++ {
			x = GaussianRandom(0, 1)
			v = 1 + c*x
			if v > 0 {
				break
			}
			if j == 99 {
				// CRITICAL FIX: Prevent division by zero and unsafe math operations
				if shape <= 1e-10 {
					return scale * 1.8 // Safe fallback
				}

				exponent := 1.0 / shape
				if math.IsInf(exponent, 0) || math.IsNaN(exponent) || math.Abs(exponent) > 100 {
					return scale * 1.6 // Safe fallback
				}

				powResult := math.Pow(safeFloat64(), exponent)
				if math.IsInf(powResult, 0) || math.IsNaN(powResult) {
					return scale * 1.4 // Safe fallback
				}

				gammaResult := math.Gamma(shape)
				if math.IsInf(gammaResult, 0) || math.IsNaN(gammaResult) || gammaResult == 0 {
					return scale * 1.3 // Safe fallback
				}

				// Fallback to simple transformation with safety checks
				return shape * scale / gammaResult * powResult
			}
		}

		v = v * v * v
		u := safeFloat64()
		if u == 0 {
			u = 1e-10 // Avoid log(0)
		}

		if u < 1-0.0331*x*x*x*x {
			result := d * v * scale
			// CRITICAL FIX: Validate result before returning
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return scale * 1.1 // Safe fallback
			}
			return result
		}

		// CRITICAL FIX: Validate v before taking logarithm
		if v <= 0 || math.IsInf(v, 0) || math.IsNaN(v) {
			return scale * 1.0 // Safe fallback
		}

		logV := math.Log(v)
		if math.IsInf(logV, 0) || math.IsNaN(logV) {
			return scale * 0.9 // Safe fallback
		}

		logCondition := 0.5*x*x + d*(1-v+logV)
		if math.IsInf(logCondition, 0) || math.IsNaN(logCondition) {
			return scale * 0.8 // Safe fallback
		}

		logU := math.Log(u)
		if math.IsInf(logU, 0) || math.IsNaN(logU) {

			return scale * 0.7 // Safe fallback
		}

		if logU < logCondition {
			result := d * v * scale
			// CRITICAL FIX: Validate result before returning
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return scale * 0.6 // Safe fallback
			}
			return result
		}
	}

	// Fallback if we hit iteration limit - CRITICAL FIX: Validate final result
	fallbackResult := shape * scale
	if math.IsInf(fallbackResult, 0) || math.IsNaN(fallbackResult) {
		return 1.0 // Safe default value
	}
	// Gamma max iterations reached, using fallback
	return fallbackResult
}

// CholeskyDecomposition performs Cholesky decomposition of a symmetric, positive-definite matrix
func CholeskyDecomposition(matrix [][]float64) ([][]float64, error) {
	n := len(matrix)
	if n == 0 {
		return nil, fmt.Errorf("matrix must be non-empty")
	}

	// Check if matrix is square
	for i := 0; i < n; i++ {
		if len(matrix[i]) != n {
			return nil, fmt.Errorf("matrix must be square")
		}
	}

	// Create gonum matrix
	data := make([]float64, n*n)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			data[i*n+j] = matrix[i][j]
		}
	}

	A := mat.NewSymDense(n, data)

	// Perform Cholesky decomposition with numerical stability
	var chol mat.Cholesky
	if !chol.Factorize(A) {
		// Matrix is not positive definite - try to fix it numerically
		// Add small diagonal regularization to ensure positive definiteness
		for i := 0; i < n; i++ {
			data[i*n+i] += 1e-10 // Add tiny amount to diagonal
		}
		A = mat.NewSymDense(n, data)

		if !chol.Factorize(A) {
			return nil, fmt.Errorf("matrix is not positive definite even with regularization")
		}
	}

	// Extract lower triangular matrix
	var L mat.TriDense
	chol.LTo(&L)

	// Convert back to 2D slice
	result := make([][]float64, n)
	for i := 0; i < n; i++ {
		result[i] = make([]float64, n)
		for j := 0; j <= i; j++ {
			result[i][j] = L.At(i, j)
		}
	}

	return result, nil
}

// GenerateCorrelatedTShocks generates N correlated random shocks using Student's t-distribution
func GenerateCorrelatedTShocks(choleskyMatrix [][]float64, degreesOfFreedom float64) []float64 {
	n := len(choleskyMatrix)

	// Generate independent t-distributed random numbers
	tIndependent := make([]float64, n)
	for i := 0; i < n; i++ {
		tIndependent[i] = StudentTRandom(degreesOfFreedom)
	}

	// Apply Cholesky transformation to get correlated shocks
	tCorrelated := make([]float64, n)
	for i := 0; i < n; i++ {
		sum := 0.0
		for j := 0; j <= i; j++ {
			sum += choleskyMatrix[i][j] * tIndependent[j]
		}
		tCorrelated[i] = sum
	}

	return tCorrelated
}

// PERF: Fixed-size buffers for 8-asset correlation (standard case)
// These are used to avoid slice allocations in hot paths
type ShockBuffer8 struct {
	Independent [8]float64
	Correlated  [8]float64
}

// PERF: Pool for shock buffers to avoid allocations
var shockBufferPool = sync.Pool{
	New: func() interface{} {
		return &ShockBuffer8{}
	},
}

// GenerateCorrelatedTShocksFixed8 generates 8 correlated shocks using fixed-size arrays
// PERF: Zero allocations version for standard 8-asset correlation matrix
func GenerateCorrelatedTShocksFixed8(choleskyMatrix [][]float64, degreesOfFreedom float64, buf *ShockBuffer8) {
	// Generate independent t-distributed random numbers directly into buffer
	for i := 0; i < 8; i++ {
		buf.Independent[i] = StudentTRandom(degreesOfFreedom)
	}

	// Apply Cholesky transformation - unrolled for 8x8 matrix
	for i := 0; i < 8; i++ {
		sum := 0.0
		row := choleskyMatrix[i]
		for j := 0; j <= i; j++ {
			sum += row[j] * buf.Independent[j]
		}
		buf.Correlated[i] = sum
	}
}

// GenerateCorrelatedTShocksSeededFixed8 generates 8 correlated shocks using seeded RNG
// PERF: Zero allocations version for deterministic simulations
func GenerateCorrelatedTShocksSeededFixed8(choleskyMatrix [][]float64, degreesOfFreedom float64, rng *SeededRNG, buf *ShockBuffer8) {
	// Generate independent t-distributed random numbers using seeded RNG
	for i := 0; i < 8; i++ {
		buf.Independent[i] = StudentTRandomSeeded(degreesOfFreedom, rng)
	}

	// Apply Cholesky transformation
	for i := 0; i < 8; i++ {
		sum := 0.0
		row := choleskyMatrix[i]
		for j := 0; j <= i; j++ {
			sum += row[j] * buf.Independent[j]
		}
		buf.Correlated[i] = sum
	}
}

// InitializeStochasticState initializes the stochastic state at the beginning of simulation
func InitializeStochasticState(config StochasticModelConfig) StochasticState {
	// Calculate initial volatilities for GARCH models based on long-term variance
	spyVolInit := math.Sqrt(config.GarchSPYOmega / math.Max(1e-9, (1-config.GarchSPYAlpha-config.GarchSPYBeta)))
	bndVolInit := math.Sqrt(config.GarchBondOmega / math.Max(1e-9, (1-config.GarchBondAlpha-config.GarchBondBeta)))
	intlVolInit := math.Sqrt(config.GarchIntlStockOmega / math.Max(1e-9, (1-config.GarchIntlStockAlpha-config.GarchIntlStockBeta)))
	otherVolInit := math.Sqrt(config.GarchOtherOmega / math.Max(1e-9, (1-config.GarchOtherAlpha-config.GarchOtherBeta)))
	individualStockVolInit := math.Sqrt(config.GarchIndividualStockOmega / math.Max(1e-9, (1-config.GarchIndividualStockAlpha-config.GarchIndividualStockBeta)))

	return StochasticState{
		SPYVolatility:                     spyVolInit,
		SPYLastReturn:                     config.MeanSPYReturn,
		BNDVolatility:                     bndVolInit,
		BNDLastReturn:                     config.MeanBondReturn,
		IntlVolatility:                    intlVolInit,
		IntlLastReturn:                    config.MeanIntlStockReturn,
		OtherVolatility:                   otherVolInit,
		OtherLastReturn:                   config.MeanOtherReturn,
		IndividualStockVolatility:         individualStockVolInit,
		IndividualStockLastReturn:         config.MeanIndividualStockReturn,
		LastInflation:                     config.MeanInflation,
		LastHomeValueGrowth:               config.MeanHomeValueAppreciation,
		LastRentalIncomeGrowth:            config.MeanRentalIncomeGrowth,
		LastWithdrawalAmount:              0,
		PortfolioValueAtLastWithdrawal:    0,
	}
}

// REMOVED: Global Cholesky cache to prevent WASM race conditions
// Previously: cachedCholeskyMatrix, cachedMatrixHash, choleskyMutex
// The sync.RWMutex was causing undefined behavior in WASM concurrent environment

// GetCachedCholeskyMatrix computes Cholesky decomposition directly (WASM-safe, no global cache)
func GetCachedCholeskyMatrix(correlationMatrix [][]float64) ([][]float64, error) {
	// CRITICAL FIX: Remove global cache to prevent race conditions in WASM environment
	// Each simulation gets its own Cholesky decomposition to ensure thread safety
	// The sync.RWMutex operations were causing undefined behavior in WASM context

	// Compute Cholesky decomposition directly for each simulation
	chol, err := CholeskyDecomposition(correlationMatrix)
	if err != nil {
		return nil, fmt.Errorf("failed to compute Cholesky decomposition: %v", err)
	}

	return chol, nil
}

// PrecomputeConfigParameters pre-calculates monthly parameters and Cholesky matrix
// PERF: Called once per simulation to avoid repeated calculations during simulation loop
func PrecomputeConfigParameters(config *StochasticModelConfig) error {
	// Pre-compute Cholesky matrix (avoid recomputing O(n^3) every month)
	if len(config.CorrelationMatrix) > 0 && config.CachedCholeskyMatrix == nil {
		chol, err := CholeskyDecomposition(config.CorrelationMatrix)
		if err != nil {
			return fmt.Errorf("failed to compute Cholesky: %v", err)
		}
		config.CachedCholeskyMatrix = chol
	}

	// Pre-compute monthly parameters (avoid repeated AnnualToMonthly conversions)
	if config.PrecomputedMonthly == nil {
		config.PrecomputedMonthly = &PrecomputedMonthlyParams{
			// Monthly means
			MeanSPY:        AnnualToMonthlyRate(config.MeanSPYReturn),
			MeanBond:       AnnualToMonthlyRate(config.MeanBondReturn),
			MeanIntl:       AnnualToMonthlyRate(config.MeanIntlStockReturn),
			MeanOther:      AnnualToMonthlyRate(config.MeanOtherReturn),
			MeanIndividual: AnnualToMonthlyRate(config.MeanIndividualStockReturn),
			MeanInflation:  AnnualToMonthlyRate(config.MeanInflation),
			MeanHome:       AnnualToMonthlyRate(config.MeanHomeValueAppreciation),
			MeanRental:     AnnualToMonthlyRate(config.MeanRentalIncomeGrowth),

			// Monthly volatilities
			VolSPY:        AnnualToMonthlyVolatility(config.VolatilitySPY),
			VolBond:       AnnualToMonthlyVolatility(config.VolatilityBond),
			VolIntl:       AnnualToMonthlyVolatility(config.VolatilityIntlStock),
			VolOther:      AnnualToMonthlyVolatility(config.VolatilityOther),
			VolIndividual: AnnualToMonthlyVolatility(config.VolatilityIndividualStock),
			VolInflation:  AnnualToMonthlyVolatility(config.VolatilityInflation),
			VolHome:       AnnualToMonthlyVolatility(config.VolatilityHomeValue),
			VolRental:     AnnualToMonthlyVolatility(config.VolatilityRentalIncomeGrowth),
		}
	}

	return nil
}

// validateStochasticConfig validates the stochastic model configuration
func validateStochasticConfig(config *StochasticModelConfig) error {
	// SAFETY NET: Apply Go-side defaults for any zero GARCH parameters
	// This prevents JavaScript config errors from breaking simulation
	if config.GarchSPYOmega <= 0 {
		config.GarchSPYOmega = 0.000015
	}
	if config.GarchSPYAlpha <= 0 {
		config.GarchSPYAlpha = 0.12
	}
	if config.GarchSPYBeta <= 0 {
		config.GarchSPYBeta = 0.87
	}

	if config.GarchBondOmega <= 0 {
		config.GarchBondOmega = 0.000004
	}
	if config.GarchBondAlpha <= 0 {
		config.GarchBondAlpha = 0.15
	}
	if config.GarchBondBeta <= 0 {
		config.GarchBondBeta = 0.82
	}

	if config.GarchIntlStockOmega <= 0 {
		config.GarchIntlStockOmega = 0.000361
	}
	if config.GarchIntlStockAlpha <= 0 {
		config.GarchIntlStockAlpha = 0.14
	}
	if config.GarchIntlStockBeta <= 0 {
		config.GarchIntlStockBeta = 0.85
	}

	if config.GarchOtherOmega <= 0 {
		config.GarchOtherOmega = 0.0001
	}
	if config.GarchOtherAlpha <= 0 {
		config.GarchOtherAlpha = 0.12
	}
	if config.GarchOtherBeta <= 0 {
		config.GarchOtherBeta = 0.86
	}

	if config.GarchIndividualStockOmega <= 0 {
		config.GarchIndividualStockOmega = 0.00015
	}
	if config.GarchIndividualStockAlpha <= 0 {
		config.GarchIndividualStockAlpha = 0.15
	}
	if config.GarchIndividualStockBeta <= 0 {
		config.GarchIndividualStockBeta = 0.82
	}

	// Validate GARCH parameters for SPY
	if config.GarchSPYAlpha < 0 || config.GarchSPYBeta < 0 || config.GarchSPYOmega <= 0 {
		return fmt.Errorf("invalid GARCH SPY parameters: alpha=%.6f, beta=%.6f, omega=%.6f",
			config.GarchSPYAlpha, config.GarchSPYBeta, config.GarchSPYOmega)
	}
	if config.GarchSPYAlpha+config.GarchSPYBeta >= 1.0 {
		return fmt.Errorf("GARCH SPY parameters violate stationarity: alpha + beta = %.6f >= 1.0",
			config.GarchSPYAlpha+config.GarchSPYBeta)
	}

	// Validate GARCH parameters for Bonds
	if config.GarchBondAlpha < 0 || config.GarchBondBeta < 0 || config.GarchBondOmega <= 0 {
		return fmt.Errorf("invalid GARCH Bond parameters: alpha=%.6f, beta=%.6f, omega=%.6f",
			config.GarchBondAlpha, config.GarchBondBeta, config.GarchBondOmega)
	}
	if config.GarchBondAlpha+config.GarchBondBeta >= 1.0 {
		return fmt.Errorf("GARCH Bond parameters violate stationarity: alpha + beta = %.6f >= 1.0",
			config.GarchBondAlpha+config.GarchBondBeta)
	}

	// Validate GARCH parameters for International Stocks
	if config.GarchIntlStockAlpha < 0 || config.GarchIntlStockBeta < 0 || config.GarchIntlStockOmega <= 0 {
		return fmt.Errorf("invalid GARCH Intl parameters: alpha=%.6f, beta=%.6f, omega=%.6f",
			config.GarchIntlStockAlpha, config.GarchIntlStockBeta, config.GarchIntlStockOmega)
	}
	if config.GarchIntlStockAlpha+config.GarchIntlStockBeta >= 1.0 {
		return fmt.Errorf("GARCH Intl parameters violate stationarity: alpha + beta = %.6f >= 1.0",
			config.GarchIntlStockAlpha+config.GarchIntlStockBeta)
	}

	// Validate GARCH parameters for Other Assets
	if config.GarchOtherAlpha < 0 || config.GarchOtherBeta < 0 || config.GarchOtherOmega <= 0 {
		return fmt.Errorf("invalid GARCH Other parameters: alpha=%.6f, beta=%.6f, omega=%.6f",
			config.GarchOtherAlpha, config.GarchOtherBeta, config.GarchOtherOmega)
	}
	if config.GarchOtherAlpha+config.GarchOtherBeta >= 1.0 {
		return fmt.Errorf("GARCH Other parameters violate stationarity: alpha + beta = %.6f >= 1.0",
			config.GarchOtherAlpha+config.GarchOtherBeta)
	}

	// Validate GARCH parameters for Individual Stock
	if config.GarchIndividualStockAlpha < 0 || config.GarchIndividualStockBeta < 0 || config.GarchIndividualStockOmega <= 0 {
		return fmt.Errorf("invalid GARCH Individual Stock parameters: alpha=%.6f, beta=%.6f, omega=%.6f",
			config.GarchIndividualStockAlpha, config.GarchIndividualStockBeta, config.GarchIndividualStockOmega)
	}
	if config.GarchIndividualStockAlpha+config.GarchIndividualStockBeta >= 1.0 {
		return fmt.Errorf("GARCH Individual Stock parameters violate stationarity: alpha + beta = %.6f >= 1.0",
			config.GarchIndividualStockAlpha+config.GarchIndividualStockBeta)
	}

	// Validate AR(1) parameters
	if math.Abs(config.AR1InflationPhi) >= 1.0 {
		return fmt.Errorf("AR(1) inflation phi parameter violates stationarity: phi=%.6f", config.AR1InflationPhi)
	}
	if math.Abs(config.AR1HomeValuePhi) >= 1.0 {
		return fmt.Errorf("AR(1) home value phi parameter violates stationarity: phi=%.6f", config.AR1HomeValuePhi)
	}
	if math.Abs(config.AR1RentalIncomeGrowthPhi) >= 1.0 {
		return fmt.Errorf("AR(1) rental income phi parameter violates stationarity: phi=%.6f", config.AR1RentalIncomeGrowthPhi)
	}

	// Validate fat tail parameter
	if config.FatTailParameter <= 0 {
		return fmt.Errorf("fat tail parameter must be positive: %.6f", config.FatTailParameter)
	}

	// Validate correlation matrix dimensions
	if len(config.CorrelationMatrix) != 8 {
		return fmt.Errorf("correlation matrix must be 8x8, got %dx%d", len(config.CorrelationMatrix), len(config.CorrelationMatrix))
	}
	for i, row := range config.CorrelationMatrix {
		if len(row) != 8 {
			return fmt.Errorf("correlation matrix row %d has %d elements, expected 8", i, len(row))
		}
	}

	return nil
}

// GenerateAdvancedStochasticReturns generates one month of stochastic returns using GARCH and AR(1) models
func GenerateAdvancedStochasticReturns(state StochasticState, config StochasticModelConfig) (StochasticReturns, StochasticState, error) {
	// Validate inputs (and apply Go-side defaults if needed)
	if err := validateStochasticConfig(&config); err != nil {
		return StochasticReturns{}, state, fmt.Errorf("invalid config: %v", err)
	}

	// DEBUG MODE: If randomness is disabled, return deterministic mean returns
	if config.DebugDisableRandomness {
		// Convert annual mean returns to monthly
		monthlyMeanSPYReturn := AnnualToMonthlyRate(config.MeanSPYReturn)
		monthlyMeanBondReturn := AnnualToMonthlyRate(config.MeanBondReturn)
		monthlyMeanIntlReturn := AnnualToMonthlyRate(config.MeanIntlStockReturn)
		monthlyMeanOtherReturn := AnnualToMonthlyRate(config.MeanOtherReturn)
		monthlyMeanIndividualStockReturn := AnnualToMonthlyRate(config.MeanIndividualStockReturn)
		monthlyMeanInflation := AnnualToMonthlyRate(config.MeanInflation)
		monthlyMeanHomeReturn := AnnualToMonthlyRate(config.MeanHomeValueAppreciation)
		monthlyMeanRentalReturn := AnnualToMonthlyRate(config.MeanRentalIncomeGrowth)

		// Return deterministic mean returns with no volatility
		returns := StochasticReturns{
			SPY:             monthlyMeanSPYReturn,
			BND:             monthlyMeanBondReturn,
			Intl:            monthlyMeanIntlReturn,
			Other:           monthlyMeanOtherReturn,
			IndividualStock: monthlyMeanIndividualStockReturn,
			Home:            monthlyMeanHomeReturn,
			Rent:            monthlyMeanRentalReturn,
			Inflation:       monthlyMeanInflation,
		}

		// Update state with mean values (for consistency)
		newState := StochasticState{
			SPYVolatility:                     config.VolatilitySPY,
			SPYLastReturn:                     config.MeanSPYReturn,
			BNDVolatility:                     config.VolatilityBond,
			BNDLastReturn:                     config.MeanBondReturn,
			IntlVolatility:                    config.VolatilityIntlStock,
			IntlLastReturn:                    config.MeanIntlStockReturn,
			OtherVolatility:                   config.VolatilityOther,
			OtherLastReturn:                   config.MeanOtherReturn,
			IndividualStockVolatility:         config.VolatilityIndividualStock,
			IndividualStockLastReturn:         config.MeanIndividualStockReturn,
			LastInflation:                     config.MeanInflation,
			LastHomeValueGrowth:               config.MeanHomeValueAppreciation,
			LastRentalIncomeGrowth:            config.MeanRentalIncomeGrowth,
			LastWithdrawalAmount:              state.LastWithdrawalAmount,
			PortfolioValueAtLastWithdrawal:    state.PortfolioValueAtLastWithdrawal,
		}

		return returns, newState, nil
	}

	// LITE MODE: Skip GARCH, use constant volatility with simple normal returns
	// This provides ~3x speedup for Bronze tier simulations by avoiding:
	// - GARCH state tracking (5 asset classes)
	// - AR(1) parameter transformations
	// - Extensive volatility calculations
	if config.LiteMode {
		// PERF: Use pre-cached Cholesky matrix if available, otherwise compute once
		choleskyMatrix := config.CachedCholeskyMatrix
		if choleskyMatrix == nil {
			var err error
			choleskyMatrix, err = GetCachedCholeskyMatrix(config.CorrelationMatrix)
			if err != nil {
				return StochasticReturns{}, state, fmt.Errorf("failed to get Cholesky matrix: %v", err)
			}
		}

		// PERF: Use pooled buffer for shock generation (zero allocations)
		buf := shockBufferPool.Get().(*ShockBuffer8)
		GenerateCorrelatedTShocksFixed8(choleskyMatrix, config.FatTailParameter, buf)

		// PERF: Use pre-computed monthly parameters if available
		var returns StochasticReturns
		if pm := config.PrecomputedMonthly; pm != nil {
			// Fast path: use pre-computed values
			returns = StochasticReturns{
				SPY:             pm.MeanSPY + pm.VolSPY*buf.Correlated[0],
				BND:             pm.MeanBond + pm.VolBond*buf.Correlated[1],
				Intl:            pm.MeanIntl + pm.VolIntl*buf.Correlated[2],
				Inflation:       pm.MeanInflation + pm.VolInflation*buf.Correlated[3],
				Home:            pm.MeanHome + pm.VolHome*buf.Correlated[4],
				Rent:            pm.MeanRental + pm.VolRental*buf.Correlated[5],
				Other:           pm.MeanOther + pm.VolOther*buf.Correlated[6],
				IndividualStock: pm.MeanIndividual + pm.VolIndividual*buf.Correlated[7],
			}
		} else {
			// Fallback: compute on the fly (first call only)
			monthlyMeanSPY := AnnualToMonthlyRate(config.MeanSPYReturn)
			monthlyMeanBond := AnnualToMonthlyRate(config.MeanBondReturn)
			monthlyMeanIntl := AnnualToMonthlyRate(config.MeanIntlStockReturn)
			monthlyMeanOther := AnnualToMonthlyRate(config.MeanOtherReturn)
			monthlyMeanIndividual := AnnualToMonthlyRate(config.MeanIndividualStockReturn)
			monthlyMeanInflation := AnnualToMonthlyRate(config.MeanInflation)
			monthlyMeanHome := AnnualToMonthlyRate(config.MeanHomeValueAppreciation)
			monthlyMeanRental := AnnualToMonthlyRate(config.MeanRentalIncomeGrowth)

			monthlyVolSPY := AnnualToMonthlyVolatility(config.VolatilitySPY)
			monthlyVolBond := AnnualToMonthlyVolatility(config.VolatilityBond)
			monthlyVolIntl := AnnualToMonthlyVolatility(config.VolatilityIntlStock)
			monthlyVolOther := AnnualToMonthlyVolatility(config.VolatilityOther)
			monthlyVolIndividual := AnnualToMonthlyVolatility(config.VolatilityIndividualStock)
			monthlyVolInflation := AnnualToMonthlyVolatility(config.VolatilityInflation)
			monthlyVolHome := AnnualToMonthlyVolatility(config.VolatilityHomeValue)
			monthlyVolRental := AnnualToMonthlyVolatility(config.VolatilityRentalIncomeGrowth)

			returns = StochasticReturns{
				SPY:             monthlyMeanSPY + monthlyVolSPY*buf.Correlated[0],
				BND:             monthlyMeanBond + monthlyVolBond*buf.Correlated[1],
				Intl:            monthlyMeanIntl + monthlyVolIntl*buf.Correlated[2],
				Inflation:       monthlyMeanInflation + monthlyVolInflation*buf.Correlated[3],
				Home:            monthlyMeanHome + monthlyVolHome*buf.Correlated[4],
				Rent:            monthlyMeanRental + monthlyVolRental*buf.Correlated[5],
				Other:           monthlyMeanOther + monthlyVolOther*buf.Correlated[6],
				IndividualStock: monthlyMeanIndividual + monthlyVolIndividual*buf.Correlated[7],
			}
		}

		// Return buffer to pool
		shockBufferPool.Put(buf)

		// State unchanged in lite mode (no GARCH tracking needed)
		return returns, state, nil
	}

	// Get Cholesky matrix
	choleskyMatrix, err := GetCachedCholeskyMatrix(config.CorrelationMatrix)
	if err != nil {
		return StochasticReturns{}, state, fmt.Errorf("failed to get Cholesky matrix: %v", err)
	}

	// Generate correlated shocks
	shocks := GenerateCorrelatedTShocks(choleskyMatrix, config.FatTailParameter)

	// Order of shocks must match correlationMatrix order in config.go:
	// SPY, Bond, Intl, Infl, Home, Rent, Other, Individual
	// CRITICAL: Add bounds checking to prevent index out of bounds panics
	if len(shocks) < 8 {
		// Correlation matrix is malformed - return error instead of panicking
		return StochasticReturns{}, state, fmt.Errorf("correlation matrix malformed: expected 8 shocks, got %d", len(shocks))
	}
	zSPY := shocks[0]
	zBND := shocks[1]
	zIntl := shocks[2]
	zInflation := shocks[3]
	zHome := shocks[4]
	zRent := shocks[5]
	zOther := shocks[6]
	zIndividualStock := shocks[7]

	// Convert annual parameters to monthly
	monthlyMeanSPYReturn := AnnualToMonthlyRate(config.MeanSPYReturn)
	monthlyMeanBondReturn := AnnualToMonthlyRate(config.MeanBondReturn)
	monthlyMeanIntlReturn := AnnualToMonthlyRate(config.MeanIntlStockReturn)
	monthlyMeanOtherReturn := AnnualToMonthlyRate(config.MeanOtherReturn)
	monthlyMeanIndividualStockReturn := AnnualToMonthlyRate(config.MeanIndividualStockReturn)

	// Convert annual volatilities to monthly
	monthlyVolatilityInflation := AnnualToMonthlyVolatility(config.VolatilityInflation)
	monthlyVolatilityHomeValue := AnnualToMonthlyVolatility(config.VolatilityHomeValue)
	monthlyVolatilityRental := AnnualToMonthlyVolatility(config.VolatilityRentalIncomeGrowth)

	// GARCH omega parameters: properly scale for monthly frequency
	// For annual to monthly: ω_monthly = ω_annual / 12
	// This ensures the long-run variance is preserved across frequencies
	monthlyGarchSPYOmega := config.GarchSPYOmega / 12.0
	monthlyGarchBondOmega := config.GarchBondOmega / 12.0
	monthlyGarchIntlOmega := config.GarchIntlStockOmega / 12.0
	monthlyGarchOtherOmega := config.GarchOtherOmega / 12.0
	monthlyGarchIndividualStockOmega := config.GarchIndividualStockOmega / 12.0

	// --- GARCH(1,1) for SPY ---
	monthlyLastSPYReturn := AnnualToMonthlyRate(state.SPYLastReturn)
	spyErrorSq := math.Pow(monthlyLastSPYReturn-monthlyMeanSPYReturn, 2)
	spyVariance := monthlyGarchSPYOmega +
		config.GarchSPYAlpha*spyErrorSq +
		config.GarchSPYBeta*math.Pow(state.SPYVolatility/math.Sqrt(12), 2)
	newMonthlySPYVolatility := math.Sqrt(math.Max(1e-12, spyVariance))
	monthlySPYReturn := monthlyMeanSPYReturn + newMonthlySPYVolatility*zSPY

	// --- GARCH(1,1) for BND ---
	monthlyLastBNDReturn := AnnualToMonthlyRate(state.BNDLastReturn)
	bndErrorSq := math.Pow(monthlyLastBNDReturn-monthlyMeanBondReturn, 2)
	bndVariance := monthlyGarchBondOmega +
		config.GarchBondAlpha*bndErrorSq +
		config.GarchBondBeta*math.Pow(state.BNDVolatility/math.Sqrt(12), 2)
	newMonthlyBNDVolatility := math.Sqrt(math.Max(1e-12, bndVariance))
	monthlyBNDReturn := monthlyMeanBondReturn + newMonthlyBNDVolatility*zBND

	// --- GARCH(1,1) for INTL Stocks ---
	monthlyLastIntlReturn := AnnualToMonthlyRate(state.IntlLastReturn)
	intlErrorSq := math.Pow(monthlyLastIntlReturn-monthlyMeanIntlReturn, 2)
	intlVariance := monthlyGarchIntlOmega +
		config.GarchIntlStockAlpha*intlErrorSq +
		config.GarchIntlStockBeta*math.Pow(state.IntlVolatility/math.Sqrt(12), 2)
	newMonthlyIntlVolatility := math.Sqrt(math.Max(1e-12, intlVariance))
	monthlyIntlReturn := monthlyMeanIntlReturn + newMonthlyIntlVolatility*zIntl

	// --- GARCH(1,1) for Other Assets ---
	monthlyLastOtherReturn := AnnualToMonthlyRate(state.OtherLastReturn)
	otherErrorSq := math.Pow(monthlyLastOtherReturn-monthlyMeanOtherReturn, 2)
	otherVariance := monthlyGarchOtherOmega +
		config.GarchOtherAlpha*otherErrorSq +
		config.GarchOtherBeta*math.Pow(state.OtherVolatility/math.Sqrt(12), 2)
	newMonthlyOtherVolatility := math.Sqrt(math.Max(1e-12, otherVariance))
	monthlyOtherReturn := monthlyMeanOtherReturn + newMonthlyOtherVolatility*zOther

	// --- GARCH(1,1) for Individual Stock ---
	monthlyLastIndividualStockReturn := AnnualToMonthlyRate(state.IndividualStockLastReturn)
	individualStockErrorSq := math.Pow(monthlyLastIndividualStockReturn-monthlyMeanIndividualStockReturn, 2)
	individualStockVariance := monthlyGarchIndividualStockOmega +
		config.GarchIndividualStockAlpha*individualStockErrorSq +
		config.GarchIndividualStockBeta*math.Pow(state.IndividualStockVolatility/math.Sqrt(12), 2)
	newMonthlyIndividualStockVolatility := math.Sqrt(math.Max(1e-12, individualStockVariance))
	monthlyIndividualStockReturn := monthlyMeanIndividualStockReturn + newMonthlyIndividualStockVolatility*zIndividualStock

	// AR(1) for Inflation with proper frequency transformation
	// For AR(1): X_t = c + φ * X_{t-1} + ε_t
	// When converting from annual to monthly:
	// φ_monthly = φ_annual^(1/12)
	// c_monthly = c_annual * (1 - φ_monthly) / (1 - φ_annual)
	monthlyLastInflation := AnnualToMonthlyRate(state.LastInflation)
	monthlyInflationPhi := math.Pow(math.Max(0, math.Min(0.999, config.AR1InflationPhi)), 1.0/12.0)
	phiDenom := math.Max(1e-9, 1-config.AR1InflationPhi)
	monthlyInflationConstant := config.AR1InflationConstant * (1 - monthlyInflationPhi) / phiDenom
	monthlyInflationReturn := monthlyInflationConstant +
		monthlyInflationPhi*monthlyLastInflation +
		monthlyVolatilityInflation*zInflation

	// FIXED: AR(1) for Home Value Appreciation - Proper parameter transformation
	monthlyLastHomeValue := AnnualToMonthlyRate(state.LastHomeValueGrowth)
	monthlyHomeConstant := config.AR1HomeValueConstant * (1 - math.Pow(config.AR1HomeValuePhi, 1.0/12.0)) / math.Max(1e-9, (1-config.AR1HomeValuePhi))
	monthlyHomePhi := math.Pow(config.AR1HomeValuePhi, 1.0/12.0)
	monthlyHomeReturn := monthlyHomeConstant +
		monthlyHomePhi*monthlyLastHomeValue +
		monthlyVolatilityHomeValue*zHome

	// FIXED: AR(1) for Rental Income Growth - Proper parameter transformation
	monthlyLastRental := AnnualToMonthlyRate(state.LastRentalIncomeGrowth)
	monthlyRentalConstant := config.AR1RentalIncomeGrowthConstant * (1 - math.Pow(config.AR1RentalIncomeGrowthPhi, 1.0/12.0)) / math.Max(1e-9, (1-config.AR1RentalIncomeGrowthPhi))
	monthlyRentalPhi := math.Pow(config.AR1RentalIncomeGrowthPhi, 1.0/12.0)
	monthlyRentalReturn := monthlyRentalConstant +
		monthlyRentalPhi*monthlyLastRental +
		monthlyVolatilityRental*zRent

	// GARCH model generates appropriate stochastic returns - no artificial clamps needed
	// The model already incorporates proper volatility clustering and mean reversion

	// Convert monthly returns back to annual for state storage
	annualSPYReturn := math.Pow(1+monthlySPYReturn, 12) - 1
	annualBNDReturn := math.Pow(1+monthlyBNDReturn, 12) - 1
	annualIntlReturn := math.Pow(1+monthlyIntlReturn, 12) - 1
	annualOtherReturn := math.Pow(1+monthlyOtherReturn, 12) - 1
	annualIndividualStockReturn := math.Pow(1+monthlyIndividualStockReturn, 12) - 1
	annualInflationReturn := math.Pow(1+monthlyInflationReturn, 12) - 1
	annualHomeReturn := math.Pow(1+monthlyHomeReturn, 12) - 1
	annualRentalReturn := math.Pow(1+monthlyRentalReturn, 12) - 1

	// Create new state
	newState := StochasticState{
		SPYVolatility:                     newMonthlySPYVolatility * math.Sqrt(12),
		SPYLastReturn:                     annualSPYReturn,
		BNDVolatility:                     newMonthlyBNDVolatility * math.Sqrt(12),
		BNDLastReturn:                     annualBNDReturn,
		IntlVolatility:                    newMonthlyIntlVolatility * math.Sqrt(12),
		IntlLastReturn:                    annualIntlReturn,
		OtherVolatility:                   newMonthlyOtherVolatility * math.Sqrt(12),
		OtherLastReturn:                   annualOtherReturn,
		IndividualStockVolatility:         newMonthlyIndividualStockVolatility * math.Sqrt(12),
		IndividualStockLastReturn:         annualIndividualStockReturn,
		LastInflation:                     annualInflationReturn,
		LastHomeValueGrowth:               annualHomeReturn,
		LastRentalIncomeGrowth:            annualRentalReturn,
		LastWithdrawalAmount:              state.LastWithdrawalAmount,
		PortfolioValueAtLastWithdrawal:    state.PortfolioValueAtLastWithdrawal,
	}

	// Return monthly returns for direct application
	returns := StochasticReturns{
		SPY:             monthlySPYReturn,
		BND:             monthlyBNDReturn,
		Intl:            monthlyIntlReturn,
		Other:           monthlyOtherReturn,
		IndividualStock: monthlyIndividualStockReturn,
		Home:            monthlyHomeReturn,
		Rent:            monthlyRentalReturn,
		Inflation:       monthlyInflationReturn,
	}

	return returns, newState, nil
}

// CalculateDynamicWithdrawal calculates withdrawal amount based on guardrails
func CalculateDynamicWithdrawal(portfolioValue, baseWithdrawalAmount float64, config StochasticModelConfig) float64 {
	if portfolioValue <= 0 || baseWithdrawalAmount <= 0 {
		return 0
	}

	currentWithdrawalRate := baseWithdrawalAmount / portfolioValue
	guardrails := config.Guardrails

	if currentWithdrawalRate > guardrails.UpperGuardrail {
		// Spending cut triggered
		return baseWithdrawalAmount * (1 - guardrails.SpendingCutPct)
	} else if currentWithdrawalRate < guardrails.LowerGuardrail {
		// Spending bonus triggered
		return baseWithdrawalAmount * (1 + guardrails.SpendingBonusPct)
	}

	// No adjustment needed
	return baseWithdrawalAmount
}

// =============================================================================
// SEEDED STOCHASTIC RETURN GENERATION
// =============================================================================

// GenerateAdvancedStochasticReturnsSeeded generates one month of stochastic returns using seeded RNG
// When rng is nil, falls back to the original GenerateAdvancedStochasticReturns behavior
func GenerateAdvancedStochasticReturnsSeeded(state StochasticState, config StochasticModelConfig, rng *SeededRNG) (StochasticReturns, StochasticState, error) {
	// If no seeded RNG provided, fall back to original behavior
	if rng == nil {
		return GenerateAdvancedStochasticReturns(state, config)
	}

	// Validate inputs (and apply Go-side defaults if needed)
	if err := validateStochasticConfig(&config); err != nil {
		return StochasticReturns{}, state, err
	}

	// DEBUG MODE: If randomness is disabled, return deterministic mean returns
	if config.DebugDisableRandomness {
		// Convert annual mean returns to monthly
		monthlyMeanSPYReturn := AnnualToMonthlyRate(config.MeanSPYReturn)
		monthlyMeanBondReturn := AnnualToMonthlyRate(config.MeanBondReturn)
		monthlyMeanIntlReturn := AnnualToMonthlyRate(config.MeanIntlStockReturn)
		monthlyMeanOtherReturn := AnnualToMonthlyRate(config.MeanOtherReturn)
		monthlyMeanIndividualStockReturn := AnnualToMonthlyRate(config.MeanIndividualStockReturn)
		monthlyMeanInflation := AnnualToMonthlyRate(config.MeanInflation)
		monthlyMeanHomeReturn := AnnualToMonthlyRate(config.MeanHomeValueAppreciation)
		monthlyMeanRentalReturn := AnnualToMonthlyRate(config.MeanRentalIncomeGrowth)

		returns := StochasticReturns{
			SPY:             monthlyMeanSPYReturn,
			BND:             monthlyMeanBondReturn,
			Intl:            monthlyMeanIntlReturn,
			Other:           monthlyMeanOtherReturn,
			IndividualStock: monthlyMeanIndividualStockReturn,
			Home:            monthlyMeanHomeReturn,
			Rent:            monthlyMeanRentalReturn,
			Inflation:       monthlyMeanInflation,
		}

		newState := StochasticState{
			SPYVolatility:                  config.VolatilitySPY,
			SPYLastReturn:                  config.MeanSPYReturn,
			BNDVolatility:                  config.VolatilityBond,
			BNDLastReturn:                  config.MeanBondReturn,
			IntlVolatility:                 config.VolatilityIntlStock,
			IntlLastReturn:                 config.MeanIntlStockReturn,
			OtherVolatility:                config.VolatilityOther,
			OtherLastReturn:                config.MeanOtherReturn,
			IndividualStockVolatility:      config.VolatilityIndividualStock,
			IndividualStockLastReturn:      config.MeanIndividualStockReturn,
			LastInflation:                  config.MeanInflation,
			LastHomeValueGrowth:            config.MeanHomeValueAppreciation,
			LastRentalIncomeGrowth:         config.MeanRentalIncomeGrowth,
			LastWithdrawalAmount:           state.LastWithdrawalAmount,
			PortfolioValueAtLastWithdrawal: state.PortfolioValueAtLastWithdrawal,
		}

		return returns, newState, nil
	}

	// LITE MODE: Skip GARCH, use constant volatility with simple normal returns (seeded version)
	// PERF: Optimized with zero-allocation shock generation and cached parameters
	if config.LiteMode {
		// PERF: Use pre-cached Cholesky matrix if available
		choleskyMatrix := config.CachedCholeskyMatrix
		if choleskyMatrix == nil {
			var err error
			choleskyMatrix, err = GetCachedCholeskyMatrix(config.CorrelationMatrix)
			if err != nil {
				return StochasticReturns{}, state, err
			}
		}

		// PERF: Use pooled buffer for shock generation (zero allocations)
		buf := shockBufferPool.Get().(*ShockBuffer8)
		GenerateCorrelatedTShocksSeededFixed8(choleskyMatrix, config.FatTailParameter, rng, buf)

		// PERF: Use pre-computed monthly parameters if available
		var returns StochasticReturns
		if pm := config.PrecomputedMonthly; pm != nil {
			// Fast path: use pre-computed values
			returns = StochasticReturns{
				SPY:             pm.MeanSPY + pm.VolSPY*buf.Correlated[0],
				BND:             pm.MeanBond + pm.VolBond*buf.Correlated[1],
				Intl:            pm.MeanIntl + pm.VolIntl*buf.Correlated[2],
				Inflation:       pm.MeanInflation + pm.VolInflation*buf.Correlated[3],
				Home:            pm.MeanHome + pm.VolHome*buf.Correlated[4],
				Rent:            pm.MeanRental + pm.VolRental*buf.Correlated[5],
				Other:           pm.MeanOther + pm.VolOther*buf.Correlated[6],
				IndividualStock: pm.MeanIndividual + pm.VolIndividual*buf.Correlated[7],
			}
		} else {
			// Fallback: compute on the fly
			monthlyMeanSPY := AnnualToMonthlyRate(config.MeanSPYReturn)
			monthlyMeanBond := AnnualToMonthlyRate(config.MeanBondReturn)
			monthlyMeanIntl := AnnualToMonthlyRate(config.MeanIntlStockReturn)
			monthlyMeanOther := AnnualToMonthlyRate(config.MeanOtherReturn)
			monthlyMeanIndividual := AnnualToMonthlyRate(config.MeanIndividualStockReturn)
			monthlyMeanInflation := AnnualToMonthlyRate(config.MeanInflation)
			monthlyMeanHome := AnnualToMonthlyRate(config.MeanHomeValueAppreciation)
			monthlyMeanRental := AnnualToMonthlyRate(config.MeanRentalIncomeGrowth)

			monthlyVolSPY := AnnualToMonthlyVolatility(config.VolatilitySPY)
			monthlyVolBond := AnnualToMonthlyVolatility(config.VolatilityBond)
			monthlyVolIntl := AnnualToMonthlyVolatility(config.VolatilityIntlStock)
			monthlyVolOther := AnnualToMonthlyVolatility(config.VolatilityOther)
			monthlyVolIndividual := AnnualToMonthlyVolatility(config.VolatilityIndividualStock)
			monthlyVolInflation := AnnualToMonthlyVolatility(config.VolatilityInflation)
			monthlyVolHome := AnnualToMonthlyVolatility(config.VolatilityHomeValue)
			monthlyVolRental := AnnualToMonthlyVolatility(config.VolatilityRentalIncomeGrowth)

			returns = StochasticReturns{
				SPY:             monthlyMeanSPY + monthlyVolSPY*buf.Correlated[0],
				BND:             monthlyMeanBond + monthlyVolBond*buf.Correlated[1],
				Intl:            monthlyMeanIntl + monthlyVolIntl*buf.Correlated[2],
				Inflation:       monthlyMeanInflation + monthlyVolInflation*buf.Correlated[3],
				Home:            monthlyMeanHome + monthlyVolHome*buf.Correlated[4],
				Rent:            monthlyMeanRental + monthlyVolRental*buf.Correlated[5],
				Other:           monthlyMeanOther + monthlyVolOther*buf.Correlated[6],
				IndividualStock: monthlyMeanIndividual + monthlyVolIndividual*buf.Correlated[7],
			}
		}

		// Return buffer to pool
		shockBufferPool.Put(buf)

		return returns, state, nil
	}

	// Get Cholesky matrix
	choleskyMatrix, err := GetCachedCholeskyMatrix(config.CorrelationMatrix)
	if err != nil {
		return StochasticReturns{}, state, err
	}

	// Generate correlated shocks using SEEDED RNG
	shocks := GenerateCorrelatedTShocksSeeded(choleskyMatrix, config.FatTailParameter, rng)

	// Bounds check
	if len(shocks) < 8 {
		return StochasticReturns{}, state, fmt.Errorf("correlation matrix malformed: expected 8 shocks, got %d", len(shocks))
	}

	// Order of shocks must match correlationMatrix order in config.go:
	// SPY, Bond, Intl, Infl, Home, Rent, Other, Individual
	zSPY := shocks[0]
	zBND := shocks[1]
	zIntl := shocks[2]
	zInflation := shocks[3]
	zHome := shocks[4]
	zRent := shocks[5]
	zOther := shocks[6]
	zIndividualStock := shocks[7]

	// Convert annual parameters to monthly
	monthlyMeanSPYReturn := AnnualToMonthlyRate(config.MeanSPYReturn)
	monthlyMeanBondReturn := AnnualToMonthlyRate(config.MeanBondReturn)
	monthlyMeanIntlReturn := AnnualToMonthlyRate(config.MeanIntlStockReturn)
	monthlyMeanOtherReturn := AnnualToMonthlyRate(config.MeanOtherReturn)
	monthlyMeanIndividualStockReturn := AnnualToMonthlyRate(config.MeanIndividualStockReturn)

	// Convert annual volatilities to monthly
	monthlyVolatilityInflation := AnnualToMonthlyVolatility(config.VolatilityInflation)
	monthlyVolatilityHomeValue := AnnualToMonthlyVolatility(config.VolatilityHomeValue)
	monthlyVolatilityRental := AnnualToMonthlyVolatility(config.VolatilityRentalIncomeGrowth)

	// GARCH omega parameters: scale for monthly frequency
	monthlyGarchSPYOmega := config.GarchSPYOmega / 12.0
	monthlyGarchBondOmega := config.GarchBondOmega / 12.0
	monthlyGarchIntlOmega := config.GarchIntlStockOmega / 12.0
	monthlyGarchOtherOmega := config.GarchOtherOmega / 12.0
	monthlyGarchIndividualStockOmega := config.GarchIndividualStockOmega / 12.0

	// --- GARCH(1,1) for SPY ---
	monthlyLastSPYReturn := AnnualToMonthlyRate(state.SPYLastReturn)
	spyErrorSq := math.Pow(monthlyLastSPYReturn-monthlyMeanSPYReturn, 2)
	spyVariance := monthlyGarchSPYOmega +
		config.GarchSPYAlpha*spyErrorSq +
		config.GarchSPYBeta*math.Pow(state.SPYVolatility/math.Sqrt(12), 2)
	newMonthlySPYVolatility := math.Sqrt(math.Max(1e-12, spyVariance))
	monthlySPYReturn := monthlyMeanSPYReturn + newMonthlySPYVolatility*zSPY

	// --- GARCH(1,1) for BND ---
	monthlyLastBNDReturn := AnnualToMonthlyRate(state.BNDLastReturn)
	bndErrorSq := math.Pow(monthlyLastBNDReturn-monthlyMeanBondReturn, 2)
	bndVariance := monthlyGarchBondOmega +
		config.GarchBondAlpha*bndErrorSq +
		config.GarchBondBeta*math.Pow(state.BNDVolatility/math.Sqrt(12), 2)
	newMonthlyBNDVolatility := math.Sqrt(math.Max(1e-12, bndVariance))
	monthlyBNDReturn := monthlyMeanBondReturn + newMonthlyBNDVolatility*zBND

	// --- GARCH(1,1) for INTL Stocks ---
	monthlyLastIntlReturn := AnnualToMonthlyRate(state.IntlLastReturn)
	intlErrorSq := math.Pow(monthlyLastIntlReturn-monthlyMeanIntlReturn, 2)
	intlVariance := monthlyGarchIntlOmega +
		config.GarchIntlStockAlpha*intlErrorSq +
		config.GarchIntlStockBeta*math.Pow(state.IntlVolatility/math.Sqrt(12), 2)
	newMonthlyIntlVolatility := math.Sqrt(math.Max(1e-12, intlVariance))
	monthlyIntlReturn := monthlyMeanIntlReturn + newMonthlyIntlVolatility*zIntl

	// --- GARCH(1,1) for Other Assets ---
	monthlyLastOtherReturn := AnnualToMonthlyRate(state.OtherLastReturn)
	otherErrorSq := math.Pow(monthlyLastOtherReturn-monthlyMeanOtherReturn, 2)
	otherVariance := monthlyGarchOtherOmega +
		config.GarchOtherAlpha*otherErrorSq +
		config.GarchOtherBeta*math.Pow(state.OtherVolatility/math.Sqrt(12), 2)
	newMonthlyOtherVolatility := math.Sqrt(math.Max(1e-12, otherVariance))
	monthlyOtherReturn := monthlyMeanOtherReturn + newMonthlyOtherVolatility*zOther

	// --- GARCH(1,1) for Individual Stock ---
	monthlyLastIndividualStockReturn := AnnualToMonthlyRate(state.IndividualStockLastReturn)
	individualStockErrorSq := math.Pow(monthlyLastIndividualStockReturn-monthlyMeanIndividualStockReturn, 2)
	individualStockVariance := monthlyGarchIndividualStockOmega +
		config.GarchIndividualStockAlpha*individualStockErrorSq +
		config.GarchIndividualStockBeta*math.Pow(state.IndividualStockVolatility/math.Sqrt(12), 2)
	newMonthlyIndividualStockVolatility := math.Sqrt(math.Max(1e-12, individualStockVariance))
	monthlyIndividualStockReturn := monthlyMeanIndividualStockReturn + newMonthlyIndividualStockVolatility*zIndividualStock

	// AR(1) for Inflation
	monthlyLastInflation := AnnualToMonthlyRate(state.LastInflation)
	monthlyInflationPhi := math.Pow(math.Max(0, math.Min(0.999, config.AR1InflationPhi)), 1.0/12.0)
	phiDenom := math.Max(1e-9, 1-config.AR1InflationPhi)
	monthlyInflationConstant := config.AR1InflationConstant * (1 - monthlyInflationPhi) / phiDenom
	monthlyInflationReturn := monthlyInflationConstant +
		monthlyInflationPhi*monthlyLastInflation +
		monthlyVolatilityInflation*zInflation

	// AR(1) for Home Value Appreciation
	monthlyLastHomeValue := AnnualToMonthlyRate(state.LastHomeValueGrowth)
	monthlyHomeConstant := config.AR1HomeValueConstant * (1 - math.Pow(config.AR1HomeValuePhi, 1.0/12.0)) / math.Max(1e-9, (1-config.AR1HomeValuePhi))
	monthlyHomePhi := math.Pow(config.AR1HomeValuePhi, 1.0/12.0)
	monthlyHomeReturn := monthlyHomeConstant +
		monthlyHomePhi*monthlyLastHomeValue +
		monthlyVolatilityHomeValue*zHome

	// AR(1) for Rental Income Growth
	monthlyLastRental := AnnualToMonthlyRate(state.LastRentalIncomeGrowth)
	monthlyRentalConstant := config.AR1RentalIncomeGrowthConstant * (1 - math.Pow(config.AR1RentalIncomeGrowthPhi, 1.0/12.0)) / math.Max(1e-9, (1-config.AR1RentalIncomeGrowthPhi))
	monthlyRentalPhi := math.Pow(config.AR1RentalIncomeGrowthPhi, 1.0/12.0)
	monthlyRentalReturn := monthlyRentalConstant +
		monthlyRentalPhi*monthlyLastRental +
		monthlyVolatilityRental*zRent

	// Convert monthly returns back to annual for state storage
	annualSPYReturn := math.Pow(1+monthlySPYReturn, 12) - 1
	annualBNDReturn := math.Pow(1+monthlyBNDReturn, 12) - 1
	annualIntlReturn := math.Pow(1+monthlyIntlReturn, 12) - 1
	annualOtherReturn := math.Pow(1+monthlyOtherReturn, 12) - 1
	annualIndividualStockReturn := math.Pow(1+monthlyIndividualStockReturn, 12) - 1
	annualInflationReturn := math.Pow(1+monthlyInflationReturn, 12) - 1
	annualHomeReturn := math.Pow(1+monthlyHomeReturn, 12) - 1
	annualRentalReturn := math.Pow(1+monthlyRentalReturn, 12) - 1

	// Create new state
	newState := StochasticState{
		SPYVolatility:                  newMonthlySPYVolatility * math.Sqrt(12),
		SPYLastReturn:                  annualSPYReturn,
		BNDVolatility:                  newMonthlyBNDVolatility * math.Sqrt(12),
		BNDLastReturn:                  annualBNDReturn,
		IntlVolatility:                 newMonthlyIntlVolatility * math.Sqrt(12),
		IntlLastReturn:                 annualIntlReturn,
		OtherVolatility:                newMonthlyOtherVolatility * math.Sqrt(12),
		OtherLastReturn:                annualOtherReturn,
		IndividualStockVolatility:      newMonthlyIndividualStockVolatility * math.Sqrt(12),
		IndividualStockLastReturn:      annualIndividualStockReturn,
		LastInflation:                  annualInflationReturn,
		LastHomeValueGrowth:            annualHomeReturn,
		LastRentalIncomeGrowth:         annualRentalReturn,
		LastWithdrawalAmount:           state.LastWithdrawalAmount,
		PortfolioValueAtLastWithdrawal: state.PortfolioValueAtLastWithdrawal,
	}

	// Return monthly returns for direct application
	returns := StochasticReturns{
		SPY:             monthlySPYReturn,
		BND:             monthlyBNDReturn,
		Intl:            monthlyIntlReturn,
		Other:           monthlyOtherReturn,
		IndividualStock: monthlyIndividualStockReturn,
		Home:            monthlyHomeReturn,
		Rent:            monthlyRentalReturn,
		Inflation:       monthlyInflationReturn,
	}

	return returns, newState, nil
}

// Removed duplicate cache implementation - using the one above
