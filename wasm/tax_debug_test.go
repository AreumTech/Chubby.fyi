package main

import (
	"fmt"
	"testing"
)

// TestBasicTaxCalculation tests the tax calculation engine with simple income scenarios
func TestBasicTaxCalculation(t *testing.T) {
	fmt.Println("=== TAX CALCULATION DEBUG TEST ===")

	// Create a tax calculator
	config := TaxConfigDetailed{
		FilingStatus:      FilingStatusSingle,
		State:             "CA",
		StandardDeduction: GetStandardDeduction(FilingStatusSingle),
	}
	taxCalculator := NewTaxCalculator(config, nil)

	// Test scenario 1: $700K ordinary income (similar to our failing case)
	fmt.Println("\n--- Test 1: $700K Ordinary Income ---")
	result1 := taxCalculator.CalculateComprehensiveTax(
		700000, // ordinary income
		0,      // capital gains
		0,      // short-term capital gains
		0,      // qualified dividends
		0,      // withholding
		0,      // estimated payments
	)

	fmt.Printf("Input: $700K ordinary income\n")
	fmt.Printf("Federal Income Tax: $%.2f\n", result1.FederalIncomeTax)
	fmt.Printf("State Income Tax: $%.2f\n", result1.StateIncomeTax)
	fmt.Printf("Social Security Tax: $%.2f\n", result1.SocialSecurityTax)
	fmt.Printf("Medicare Tax: $%.2f\n", result1.MedicareTax)
	fmt.Printf("Total Tax: $%.2f\n", result1.TotalTax)
	fmt.Printf("Effective Rate: %.2f%%\n", result1.EffectiveRate*100)

	// Test scenario 2: $1.1M ordinary income (our failing case)
	fmt.Println("\n--- Test 2: $1.1M Ordinary Income ---")
	result2 := taxCalculator.CalculateComprehensiveTax(
		1100000, // ordinary income
		0,       // capital gains
		0,       // short-term capital gains
		0,       // qualified dividends
		0,       // withholding
		0,       // estimated payments
	)

	fmt.Printf("Input: $1.1M ordinary income\n")
	fmt.Printf("Federal Income Tax: $%.2f\n", result2.FederalIncomeTax)
	fmt.Printf("State Income Tax: $%.2f\n", result2.StateIncomeTax)
	fmt.Printf("Social Security Tax: $%.2f\n", result2.SocialSecurityTax)
	fmt.Printf("Medicare Tax: $%.2f\n", result2.MedicareTax)
	fmt.Printf("Total Tax: $%.2f\n", result2.TotalTax)
	fmt.Printf("Effective Rate: %.2f%%\n", result2.EffectiveRate*100)

	// Assertions - these should never be zero for high income
	if result1.TotalTax == 0 {
		t.Errorf("Expected non-zero taxes for $700K income, got $%.2f", result1.TotalTax)
	}

	if result2.TotalTax == 0 {
		t.Errorf("Expected non-zero taxes for $1.1M income, got $%.2f", result2.TotalTax)
	}

	// Sanity check: higher income should have higher taxes
	if result2.TotalTax <= result1.TotalTax {
		t.Errorf("Expected higher taxes for $1.1M vs $700K, got $%.2f vs $%.2f", result2.TotalTax, result1.TotalTax)
	}

	fmt.Println("\n=== TAX CALCULATION DEBUG TEST COMPLETE ===")
}
