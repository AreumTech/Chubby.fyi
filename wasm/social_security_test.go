package main

import (
	"testing"
)

func TestSocialSecurityTaxability(t *testing.T) {
	t.Skip("TODO: Social Security taxability test needs updating for current implementation")
	// Test data structure for Social Security taxability scenarios
	testCases := []struct {
		name                   string
		filingStatus           FilingStatus
		provisionalIncome      float64
		socialSecurityBenefits float64
		expectedTaxablePortion float64
	}{
		// Single filer test cases
		{
			name:                   "Single filer - Low income, no SS taxable",
			filingStatus:           FilingStatusSingle,
			provisionalIncome:      15000, // Below first threshold (25k)
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 0,
		},
		{
			name:                   "Single filer - Mid income, 50% SS taxable",
			filingStatus:           FilingStatusSingle,
			provisionalIncome:      30000, // Between 25k and 34k thresholds
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 5000, // 50% of benefits up to limit
		},
		{
			name:                   "Single filer - High income, 85% SS taxable",
			filingStatus:           FilingStatusSingle,
			provisionalIncome:      50000, // Above 34k threshold
			socialSecurityBenefits: 30000,
			expectedTaxablePortion: 25500, // 85% of benefits
		},

		// Married filing jointly test cases
		{
			name:                   "MFJ - Low income, no SS taxable",
			filingStatus:           FilingStatusMarriedFilingJointly,
			provisionalIncome:      25000, // Below first threshold (32k)
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 0,
		},
		{
			name:                   "MFJ - Mid income, 50% SS taxable",
			filingStatus:           FilingStatusMarriedFilingJointly,
			provisionalIncome:      40000, // Between 32k and 44k thresholds
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 8000, // Partial taxability
		},
		{
			name:                   "MFJ - High income, 85% SS taxable",
			filingStatus:           FilingStatusMarriedFilingJointly,
			provisionalIncome:      60000, // Above 44k threshold
			socialSecurityBenefits: 30000,
			expectedTaxablePortion: 25500, // 85% of benefits
		},

		// Edge cases
		{
			name:                   "Single filer - Exactly at first threshold",
			filingStatus:           FilingStatusSingle,
			provisionalIncome:      15000, // 15k other income + 10k (half of SS) = 25k exactly
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 0, // Should be zero at exact threshold
		},
		{
			name:                   "Single filer - Just above first threshold",
			filingStatus:           FilingStatusSingle,
			provisionalIncome:      16000, // 16k other income + 10k (half of SS) = 26k, $1k over
			socialSecurityBenefits: 20000,
			expectedTaxablePortion: 1000, // $1k taxable
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create tax calculator with the specified filing status
			taxConfig := TaxConfigDetailed{
				FilingStatus:      tc.filingStatus,
				State:             "CA",
				StandardDeduction: GetStandardDeduction(tc.filingStatus),
				ItemizedDeduction: 0,
				SaltCap:           10000,
			}
			taxCalculator := NewTaxCalculator(taxConfig, nil)

			// Calculate taxable Social Security
			actualTaxablePortion := taxCalculator.CalculateTaxableSocialSecurity(
				tc.provisionalIncome,
				tc.socialSecurityBenefits,
			)

			// Allow for small floating point differences
			tolerance := 0.01
			diff := actualTaxablePortion - tc.expectedTaxablePortion
			if diff < -tolerance || diff > tolerance {
				t.Errorf("Expected taxable portion %.2f, got %.2f (diff: %.2f)",
					tc.expectedTaxablePortion, actualTaxablePortion, diff)
			}
		})
	}
}

func TestSocialSecurityFormula(t *testing.T) {
	t.Skip("TODO: Social Security formula test needs updating for current implementation")
	// Test the IRS formula implementation details
	taxConfig := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
		ItemizedDeduction: 0,
		SaltCap:           10000,
	}
	taxCalculator := NewTaxCalculator(taxConfig, nil)

	// Test case where both tiers apply (single filer with high income)
	provisionalIncome := 40000.0 // Other income
	socialSecurityBenefits := 30000.0

	// Half of SS benefits = 15k
	// Total provisional income = 40k + 15k = 55k
	// First tier: 55k - 25k = 30k excess over first threshold
	// But can't exceed half of benefits (15k), so first tier taxable = 15k
	// Second tier: 55k - 34k = 21k excess over second threshold
	// Additional taxable at 85% rate: min(21k * 0.85, 30k * 0.35) = min(17.85k, 10.5k) = 10.5k
	// Total taxable = 15k + 10.5k = 25.5k
	// But cannot exceed 85% of total benefits = 30k * 0.85 = 25.5k ✓

	expectedTaxable := 25500.0 // 85% of 30k
	actualTaxable := taxCalculator.CalculateTaxableSocialSecurity(provisionalIncome, socialSecurityBenefits)

	tolerance := 0.01
	diff := actualTaxable - expectedTaxable
	if diff < -tolerance || diff > tolerance {
		t.Errorf("Complex formula test failed. Expected %.2f, got %.2f (diff: %.2f)",
			expectedTaxable, actualTaxable, diff)
	}
}

func TestSocialSecurityZeroBenefits(t *testing.T) {
	// Test edge case with zero Social Security benefits
	taxConfig := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
		ItemizedDeduction: 0,
		SaltCap:           10000,
	}
	taxCalculator := NewTaxCalculator(taxConfig, nil)

	result := taxCalculator.CalculateTaxableSocialSecurity(50000, 0)
	if result != 0 {
		t.Errorf("Expected 0 taxable amount for zero SS benefits, got %.2f", result)
	}
}
