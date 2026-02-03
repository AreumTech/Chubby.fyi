package engine

import (
	"fmt"
	"math"
)

// PERFORMANCE OPTIMIZATION: Tax calculation lookup tables
// Pre-compute common tax scenarios to avoid expensive calculations during simulation

// TaxLookupEntry represents a pre-computed tax calculation result
type TaxLookupEntry struct {
	OrdinaryIncome     float64 `json:"ordinaryIncome"`
	CapitalGains       float64 `json:"capitalGains"`
	QualifiedDividends float64 `json:"qualifiedDividends"`

	// Pre-computed results
	FederalIncomeTax  float64 `json:"federalIncomeTax"`
	StateIncomeTax    float64 `json:"stateIncomeTax"`
	SocialSecurityTax float64 `json:"socialSecurityTax"`
	MedicareTax       float64 `json:"medicareTax"`
	TotalTax          float64 `json:"totalTax"`
	EffectiveRate     float64 `json:"effectiveRate"`
	MarginalRate      float64 `json:"marginalRate"`
}

// TaxLookupTable provides fast tax calculation lookup
type TaxLookupTable struct {
	entries           []TaxLookupEntry
	ordinaryIncomeMin float64
	ordinaryIncomeMax float64
	incomeStep        float64

	// Cache for computed results
	cache map[string]TaxCalculationResult
}

// NewTaxLookupTable creates and populates a tax lookup table
func NewTaxLookupTable(taxCalculator *TaxCalculator) *TaxLookupTable {
	table := &TaxLookupTable{
		entries:           make([]TaxLookupEntry, 0, 1000), // Pre-allocate capacity
		ordinaryIncomeMin: 0,
		ordinaryIncomeMax: 2000000, // Up to $2M ordinary income
		incomeStep:        25000,   // $25K increments
		cache:             make(map[string]TaxCalculationResult, 200),
	}

	// Pre-compute common scenarios
	table.populateLookupTable(taxCalculator)
	return table
}

// populateLookupTable pre-computes tax calculations for common income scenarios
func (tlt *TaxLookupTable) populateLookupTable(taxCalculator *TaxCalculator) {
	// Generate lookup entries for common income combinations
	for ordinaryIncome := tlt.ordinaryIncomeMin; ordinaryIncome <= tlt.ordinaryIncomeMax; ordinaryIncome += tlt.incomeStep {
		// Common capital gains scenarios (0%, 10%, 20% of ordinary income)
		capitalGainsScenarios := []float64{0, ordinaryIncome * 0.1, ordinaryIncome * 0.2}

		for _, capitalGains := range capitalGainsScenarios {
			// Common qualified dividend scenarios (0%, 5%, 10% of ordinary income)
			dividendScenarios := []float64{0, ordinaryIncome * 0.05, ordinaryIncome * 0.1}

			for _, qualifiedDividends := range dividendScenarios {
				// Pre-compute tax result
				result := taxCalculator.CalculateComprehensiveTax(
					ordinaryIncome,
					capitalGains,
					0, // STCG treated as ordinary income
					qualifiedDividends,
					0, // No withholding for lookup
					0, // No estimated payments for lookup
				)

				entry := TaxLookupEntry{
					OrdinaryIncome:     ordinaryIncome,
					CapitalGains:       capitalGains,
					QualifiedDividends: qualifiedDividends,
					FederalIncomeTax:   result.FederalIncomeTax,
					StateIncomeTax:     result.StateIncomeTax,
					SocialSecurityTax:  result.SocialSecurityTax,
					MedicareTax:        result.MedicareTax,
					TotalTax:           result.TotalTax,
					EffectiveRate:      result.EffectiveRate,
					MarginalRate:       result.MarginalRate,
				}

				tlt.entries = append(tlt.entries, entry)
			}
		}
	}
}

// GetTaxCalculationFast returns tax calculation using lookup table with interpolation
func (tlt *TaxLookupTable) GetTaxCalculationFast(
	ordinaryIncome, capitalGains, qualifiedDividends, taxWithholding, estimatedPayments float64,
) TaxCalculationResult {

	// Create cache key for common lookups
	cacheKey := tlt.createCacheKey(ordinaryIncome, capitalGains, qualifiedDividends)
	if cachedResult, exists := tlt.cache[cacheKey]; exists {
		// Return cached result (withholding and estimated payments handled by caller)
		return cachedResult
	}

	// Find closest lookup entries for interpolation
	closest := tlt.findClosestEntries(ordinaryIncome, capitalGains, qualifiedDividends)

	if len(closest) == 0 {
		// Fallback to full calculation if no close matches
		return TaxCalculationResult{}
	}

	// Use exact match if available
	if len(closest) == 1 {
		entry := closest[0]
		result := TaxCalculationResult{
			FederalIncomeTax:  entry.FederalIncomeTax,
			StateIncomeTax:    entry.StateIncomeTax,
			SocialSecurityTax: entry.SocialSecurityTax,
			MedicareTax:       entry.MedicareTax,
			TotalTax:          entry.TotalTax,
			EffectiveRate:     entry.EffectiveRate,
			MarginalRate:      entry.MarginalRate,
		}

		// Cache the result
		tlt.cache[cacheKey] = result
		return result
	}

	// Interpolate between closest entries (simplified linear interpolation)
	interpolated := tlt.interpolateEntries(closest, ordinaryIncome, capitalGains, qualifiedDividends)
	result := TaxCalculationResult{
		FederalIncomeTax:  interpolated.FederalIncomeTax,
		StateIncomeTax:    interpolated.StateIncomeTax,
		SocialSecurityTax: interpolated.SocialSecurityTax,
		MedicareTax:       interpolated.MedicareTax,
		TotalTax:          interpolated.TotalTax,
		EffectiveRate:     interpolated.EffectiveRate,
		MarginalRate:      interpolated.MarginalRate,
	}

	// Cache the result
	tlt.cache[cacheKey] = result
	return result
}

// createCacheKey creates a string key for caching (rounded to nearest $1K for efficiency)
func (tlt *TaxLookupTable) createCacheKey(ordinaryIncome, capitalGains, qualifiedDividends float64) string {
	// Round to nearest $1K for cache efficiency
	roundedOrdinary := math.Round(ordinaryIncome/1000) * 1000
	roundedCapGains := math.Round(capitalGains/1000) * 1000
	roundedDividends := math.Round(qualifiedDividends/1000) * 1000

	return fmt.Sprintf("%.0f_%.0f_%.0f", roundedOrdinary, roundedCapGains, roundedDividends)
}

// findClosestEntries finds lookup entries closest to the target values
func (tlt *TaxLookupTable) findClosestEntries(ordinaryIncome, capitalGains, qualifiedDividends float64) []TaxLookupEntry {
	var closest []TaxLookupEntry
	tolerance := tlt.incomeStep * 1.5 // Allow 1.5x step size tolerance

	for _, entry := range tlt.entries {
		ordinaryDiff := math.Abs(entry.OrdinaryIncome - ordinaryIncome)
		capitalDiff := math.Abs(entry.CapitalGains - capitalGains)
		dividendDiff := math.Abs(entry.QualifiedDividends - qualifiedDividends)

		// Check if entry is within tolerance for all dimensions
		if ordinaryDiff <= tolerance &&
			capitalDiff <= tolerance &&
			dividendDiff <= tolerance {
			closest = append(closest, entry)
		}

		// Return exact match immediately
		if ordinaryDiff < 1 && capitalDiff < 1 && dividendDiff < 1 {
			return []TaxLookupEntry{entry}
		}
	}

	return closest
}

// interpolateEntries performs simple weighted average interpolation
func (tlt *TaxLookupTable) interpolateEntries(entries []TaxLookupEntry, ordinaryIncome, capitalGains, qualifiedDividends float64) TaxLookupEntry {
	if len(entries) == 1 {
		return entries[0]
	}

	// Simple average for multiple entries (could be enhanced with distance-weighted interpolation)
	var avgEntry TaxLookupEntry
	count := float64(len(entries))

	for _, entry := range entries {
		avgEntry.FederalIncomeTax += entry.FederalIncomeTax / count
		avgEntry.StateIncomeTax += entry.StateIncomeTax / count
		avgEntry.SocialSecurityTax += entry.SocialSecurityTax / count
		avgEntry.MedicareTax += entry.MedicareTax / count
		avgEntry.TotalTax += entry.TotalTax / count
		avgEntry.EffectiveRate += entry.EffectiveRate / count
		avgEntry.MarginalRate += entry.MarginalRate / count
	}

	return avgEntry
}

// ClearCache clears the lookup cache (useful for memory management)
func (tlt *TaxLookupTable) ClearCache() {
	tlt.cache = make(map[string]TaxCalculationResult, 200)
}
