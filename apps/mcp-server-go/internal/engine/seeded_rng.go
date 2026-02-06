// Seeded RNG for deterministic reproducible stochastic simulations
// Uses PCG32 algorithm for cross-platform, version-stable random number generation
//
// Why PCG32?
// - math/rand is deterministic within a Go version but algorithm is not guaranteed stable across Go upgrades
// - PCG32 is fast, simple (~20 lines), statistically excellent, and algorithm is fixed forever (we control it)
// - This enables long-term reproducibility: same seed + same inputs → identical results

package engine

import (
	"math"
)

// =============================================================================
// PCG32 IMPLEMENTATION
// =============================================================================

// PCG32 implements the PCG32 pseudo-random number generator
// Algorithm from https://www.pcg-random.org/
type PCG32 struct {
	state uint64
	inc   uint64
}

// NewPCG32 creates a new PCG32 generator with the given seed
func NewPCG32(seed int64) *PCG32 {
	pcg := &PCG32{}
	pcg.Seed(seed)
	return pcg
}

// Seed initializes the PCG32 with a seed value
func (p *PCG32) Seed(seed int64) {
	// Use seed for both state initialization and stream selection
	// This ensures different seeds produce different sequences
	p.state = 0
	p.inc = (uint64(seed) << 1) | 1 // inc must be odd
	p.Uint32()                      // Advance state once
	p.state += uint64(seed)
	p.Uint32() // Advance state again for better mixing
}

// Uint32 returns a uniformly distributed uint32
func (p *PCG32) Uint32() uint32 {
	// PCG-XSH-RR variant
	oldstate := p.state
	// Advance internal state
	p.state = oldstate*6364136223846793005 + p.inc
	// Calculate output function (XSH RR)
	xorshifted := uint32(((oldstate >> 18) ^ oldstate) >> 27)
	rot := uint32(oldstate >> 59)
	return (xorshifted >> rot) | (xorshifted << ((-rot) & 31))
}

// Uint64 returns a uniformly distributed uint64
func (p *PCG32) Uint64() uint64 {
	return (uint64(p.Uint32()) << 32) | uint64(p.Uint32())
}

// Float64 returns a uniformly distributed float64 in [0, 1)
func (p *PCG32) Float64() float64 {
	// Use 53 bits for precision, like math/rand does
	return float64(p.Uint64()>>11) / (1 << 53)
}

// NormFloat64 returns a normally distributed float64 with mean 0 and stddev 1
// Uses the Box-Muller transform for numerical stability
func (p *PCG32) NormFloat64() float64 {
	// Box-Muller transform
	for {
		u1 := p.Float64()
		u2 := p.Float64()
		if u1 > 0 { // Avoid log(0)
			// Box-Muller generates pairs; we only use one
			return math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
		}
	}
}

// =============================================================================
// SEEDED RNG WRAPPER (Thread-Safe)
// =============================================================================

// SeededRNG wraps PCG32 with reset capability
// PERF: No mutex — simulation is single-threaded (no goroutines in MC loop)
type SeededRNG struct {
	pcg         *PCG32
	initialSeed int64
	callCount   uint64
}

// NewSeededRNG creates a new thread-safe seeded RNG
func NewSeededRNG(seed int64) *SeededRNG {
	return &SeededRNG{
		pcg:         NewPCG32(seed),
		initialSeed: seed,
		callCount:   0,
	}
}

// Float64 returns a uniformly distributed float64 in [0, 1)
func (rng *SeededRNG) Float64() float64 {
	rng.callCount++
	return rng.pcg.Float64()
}

// NormFloat64 returns a normally distributed float64 with mean 0 and stddev 1
func (rng *SeededRNG) NormFloat64() float64 {
	rng.callCount++
	return rng.pcg.NormFloat64()
}

// Reset resets the RNG to its initial seed state
// This allows replaying the same sequence of random numbers
func (rng *SeededRNG) Reset() {
	rng.pcg.Seed(rng.initialSeed)
	rng.callCount = 0
}

// Seed returns the initial seed used to create this RNG
func (rng *SeededRNG) Seed() int64 {
	return rng.initialSeed
}

// CallCount returns the number of random calls made (for debugging)
func (rng *SeededRNG) CallCount() uint64 {
	return rng.callCount
}

// =============================================================================
// SEEDED RANDOM SAMPLING FUNCTIONS
// =============================================================================

// GaussianRandomSeeded generates a random number from Gaussian distribution using seeded RNG
// When rng is nil, falls back to existing crypto/rand behavior
func GaussianRandomSeeded(mean, stdev float64, rng *SeededRNG) float64 {
	if rng == nil {
		// Fallback to original behavior
		return GaussianRandom(mean, stdev)
	}
	return mean + stdev*rng.NormFloat64()
}

// StudentTRandomSeeded generates a random number from Student's t-distribution using seeded RNG
// When rng is nil, falls back to existing crypto/rand behavior
func StudentTRandomSeeded(degreesOfFreedom float64, rng *SeededRNG) float64 {
	if rng == nil {
		return StudentTRandom(degreesOfFreedom)
	}

	if degreesOfFreedom <= 0 {
		simLogVerbose("🚨 [MATH-SAFETY] Invalid degrees of freedom (%.6f), using normal distribution", degreesOfFreedom)
		return GaussianRandomSeeded(0, 1, rng)
	}

	// For very high degrees of freedom, approximate with normal distribution
	if degreesOfFreedom > 100 {
		return GaussianRandomSeeded(0, 1, rng)
	}

	// Use the fact that t = Z / sqrt(Chi2/nu) where Z ~ N(0,1) and Chi2 ~ χ²(nu)
	z := rng.NormFloat64()
	chi2 := generateChiSquaredSeeded(degreesOfFreedom, rng)

	return z / math.Sqrt(chi2/degreesOfFreedom)
}

// generateChiSquaredSeeded generates chi-squared random variable using seeded RNG
func generateChiSquaredSeeded(degreesOfFreedom float64, rng *SeededRNG) float64 {
	// χ²(k) = Gamma(k/2, 2)
	return generateGammaSeeded(degreesOfFreedom/2, 2, rng)
}

// generateGammaSeeded generates gamma random variable using Marsaglia and Tsang's method with seeded RNG
func generateGammaSeeded(shape, scale float64, rng *SeededRNG) float64 {
	if shape <= 0 || scale <= 0 {
		simLogVerbose("🚨 [MATH-SAFETY] Invalid gamma parameters: shape=%.6f, scale=%.6f, using default (1.0)", shape, scale)
		return 1.0
	}

	if shape < 1 {
		// Use the transformation for shape < 1
		u := rng.Float64()
		if u == 0 {
			u = 1e-10
		}

		if shape <= 1e-10 {
			return scale * 2.0
		}

		exponent := 1.0 / shape
		if math.IsInf(exponent, 0) || math.IsNaN(exponent) || math.Abs(exponent) > 100 {
			return scale * 1.5
		}

		powResult := math.Pow(u, exponent)
		if math.IsInf(powResult, 0) || math.IsNaN(powResult) {
			return scale * 1.2
		}

		return scale * powResult * math.Gamma(shape+1)
	}

	d := shape - 1.0/3.0
	c := 1.0 / math.Sqrt(9*d)

	maxIterations := 1000
	for i := 0; i < maxIterations; i++ {
		var x, v float64
		for j := 0; j < 100; j++ {
			x = rng.NormFloat64()
			v = 1 + c*x
			if v > 0 {
				break
			}
			if j == 99 {
				return scale * 1.8
			}
		}

		v = v * v * v
		u := rng.Float64()
		if u == 0 {
			u = 1e-10
		}

		if u < 1-0.0331*x*x*x*x {
			result := d * v * scale
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return scale * 1.1
			}
			return result
		}

		if v <= 0 || math.IsInf(v, 0) || math.IsNaN(v) {
			return scale * 1.0
		}

		logV := math.Log(v)
		if math.IsInf(logV, 0) || math.IsNaN(logV) {
			return scale * 0.9
		}

		logCondition := 0.5*x*x + d*(1-v+logV)
		if math.IsInf(logCondition, 0) || math.IsNaN(logCondition) {
			return scale * 0.8
		}

		logU := math.Log(u)
		if math.IsInf(logU, 0) || math.IsNaN(logU) {
			return scale * 0.7
		}

		if logU < logCondition {
			result := d * v * scale
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return scale * 0.6
			}
			return result
		}
	}

	fallbackResult := shape * scale
	if math.IsInf(fallbackResult, 0) || math.IsNaN(fallbackResult) {
		return 1.0
	}
	return fallbackResult
}

// =============================================================================
// FIXED ASSET CLASS ORDER (Determinism Critical)
// =============================================================================

// AssetClassOrder defines the canonical order for asset classes in stochastic operations
// CRITICAL: Never iterate over maps in stochastic pipeline - always use this fixed order
// This order must match the correlation matrix order in config.go
var AssetClassOrder = []string{
	"SPY",             // 0: US Large Cap Stocks
	"BND",             // 1: US Total Bond Market (called "Bond" in correlation matrix)
	"Intl",            // 2: International Stocks
	"Inflation",       // 3: Inflation rate (called "Infl" in correlation matrix)
	"Home",            // 4: Home Value
	"Rent",            // 5: Rental Income
	"Other",           // 6: Other/Alternative Assets
	"IndividualStock", // 7: Individual Stocks (called "Indiv" in correlation matrix)
}

// GenerateCorrelatedTShocksSeeded generates N correlated random shocks using Student's t-distribution with seeded RNG
// Uses fixed asset class order for determinism
func GenerateCorrelatedTShocksSeeded(choleskyMatrix [][]float64, degreesOfFreedom float64, rng *SeededRNG) []float64 {
	if rng == nil {
		return GenerateCorrelatedTShocks(choleskyMatrix, degreesOfFreedom)
	}

	n := len(choleskyMatrix)

	// Generate independent t-distributed random numbers in FIXED ORDER
	tIndependent := make([]float64, n)
	for i := 0; i < n; i++ {
		tIndependent[i] = StudentTRandomSeeded(degreesOfFreedom, rng)
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

// assetClassToReturnKey maps asset class identifiers to their return key names
// Used for "show the math" reconciliation in RealizedPathVariables
func assetClassToReturnKey(assetClass string) string {
	switch assetClass {
	case "stocks": // AssetClassUSStocksTotalMarket
		return "SPY"
	case "bonds": // AssetClassUSBondsTotalMarket
		return "BND"
	case "international_stocks": // AssetClassInternationalStocks
		return "Intl"
	case "otherAssets": // AssetClassOtherAssets
		return "Other"
	case "individual_stock": // AssetClassIndividualStock
		return "IndividualStock"
	case "cash": // AssetClassCash
		return "" // Cash has no return
	case "real_estate_primary_home": // AssetClassRealEstatePrimaryHome
		return "" // Real estate has separate returns
	default:
		return ""
	}
}
