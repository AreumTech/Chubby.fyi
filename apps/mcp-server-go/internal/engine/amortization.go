package engine

import (
	"encoding/json"
	"fmt"
	"math"
)

// CalculateMonthlyPayment calculates the fixed monthly payment for a loan
// using the standard amortization formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
func CalculateMonthlyPayment(principal float64, annualRate float64, termMonths int) float64 {
	// SAFETY: Validate all inputs to prevent mathematical errors
	if principal <= 0 || termMonths <= 0 {
		simLogVerbose("🔧 [AMORTIZATION-SAFETY] Invalid loan parameters: principal=%.2f, termMonths=%d", principal, termMonths)
		return 0
	}

	// SAFETY: Validate annual rate is reasonable (prevent extreme calculations)
	if annualRate < 0 || annualRate > 1.0 {
		simLogVerbose("🔧 [AMORTIZATION-SAFETY] Unusual annual rate: %.6f (should be 0-1.0 range)", annualRate)
	}

	if annualRate <= 0 {
		// If no interest, payment is just principal divided by term
		return principal / float64(termMonths)
	}

	monthlyRate := annualRate / 12.0
	n := float64(termMonths)

	// PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
	factor := math.Pow(1+monthlyRate, n)

	// Safety check: prevent division by zero when factor ≈ 1
	if math.Abs(factor-1) < 1e-10 {
		// When factor is very close to 1, use simple division (no compound interest)
		return principal / float64(termMonths)
	}

	payment := principal * (monthlyRate * factor) / (factor - 1)

	return payment
}

// CalculateAmortizationSplit calculates how much of a payment goes to principal vs interest
func CalculateAmortizationSplit(balance float64, monthlyPayment float64, monthlyRate float64) (principal float64, interest float64) {
	// SAFETY: Validate inputs to prevent invalid amortization calculations
	if balance <= 0 {
		return 0, 0
	}

	if monthlyPayment < 0 {
		simLogVerbose("🔧 [AMORTIZATION-SAFETY] Negative monthly payment: %.2f", monthlyPayment)
		return 0, 0
	}

	if monthlyRate < 0 {
		simLogVerbose("🔧 [AMORTIZATION-SAFETY] Negative monthly rate: %.6f", monthlyRate)
		monthlyRate = 0 // Treat as zero interest
	}

	interest = balance * monthlyRate
	principal = monthlyPayment - interest

	// Ensure we don't pay more principal than remaining balance
	if principal > balance {
		principal = balance
		interest = monthlyPayment - principal
	}

	// Ensure values are non-negative
	if principal < 0 {
		principal = 0
	}
	if interest < 0 {
		interest = 0
	}

	return principal, interest
}

// CreateLiabilityFromEvent creates a LiabilityInfo from a liability event using type-safe metadata
func CreateLiabilityFromEvent(event FinancialEvent) (*LiabilityInfo, error) {
	// Extract and unmarshal liability details using type-safe struct
	liabilityDetailsRaw, ok := event.Metadata["liabilityDetails"]
	if !ok {
		return nil, fmt.Errorf("liability event %s missing required 'liabilityDetails' metadata", event.ID)
	}

	// Convert to JSON and unmarshal into typed struct for validation
	var liabilityDetails LiabilityDetailsMetadata
	if detailsMap, isMap := liabilityDetailsRaw.(map[string]interface{}); isMap {
		// Convert map to JSON then unmarshal to struct for type safety
		jsonBytes, err := json.Marshal(detailsMap)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal liability details for event %s: %w", event.ID, err)
		}

		err = json.Unmarshal(jsonBytes, &liabilityDetails)
		if err != nil {
			return nil, fmt.Errorf("failed to parse liability details for event %s: %w", event.ID, err)
		}
	} else {
		return nil, fmt.Errorf("liability event %s has invalid 'liabilityDetails' metadata format", event.ID)
	}

	// Apply defaults for missing fields
	if liabilityDetails.ID == "" {
		liabilityDetails.ID = event.ID
	}
	if liabilityDetails.Name == "" {
		liabilityDetails.Name = event.Description
	}
	if liabilityDetails.Type == "" {
		liabilityDetails.Type = "MORTGAGE"
	}

	// CRITICAL VALIDATION: Enforce strict validation - NO DEFAULTS for financial parameters
	// Using defaults for interest rates or loan terms leads to invalid financial projections

	if liabilityDetails.InitialPrincipal <= 0 {
		return nil, fmt.Errorf("liability event '%s' has invalid initialPrincipal: %.2f (must be positive)", event.ID, liabilityDetails.InitialPrincipal)
	}

	if liabilityDetails.InterestRate < 0 || liabilityDetails.InterestRate > 1.0 {
		return nil, fmt.Errorf("liability event '%s' has invalid interestRate: %.6f (must be 0-1.0)", event.ID, liabilityDetails.InterestRate)
	}

	if liabilityDetails.TermMonths <= 0 || liabilityDetails.TermMonths > 600 { // Max 50 years
		return nil, fmt.Errorf("liability event '%s' has invalid termMonths: %d (must be 1-600)", event.ID, liabilityDetails.TermMonths)
	}

	// Calculate monthly payment using validated parameters
	monthlyPayment := CalculateMonthlyPayment(liabilityDetails.InitialPrincipal, liabilityDetails.InterestRate, liabilityDetails.TermMonths)

	return &LiabilityInfo{
		ID:                         liabilityDetails.ID,
		Name:                       liabilityDetails.Name,
		Type:                       liabilityDetails.Type,
		CurrentPrincipalBalance:    liabilityDetails.InitialPrincipal,
		InterestRate:               liabilityDetails.InterestRate,
		TermRemainingMonths:        liabilityDetails.TermMonths,
		MonthlyPayment:             monthlyPayment,
		IsTaxDeductible:            liabilityDetails.IsTaxDeductible,
		// PITI Components - Enhanced mortgage modeling
		PropertyTaxAnnual:          liabilityDetails.PropertyTaxAnnual,
		HomeownersInsuranceAnnual:  liabilityDetails.HomeownersInsuranceAnnual,
		PMIAnnual:                  liabilityDetails.PMIAnnual,
		PropertyTaxDeductible:      liabilityDetails.PropertyTaxDeductible,
		MortgageInterestDeductible: liabilityDetails.MortgageInterestDeductible,
	}, nil
}
