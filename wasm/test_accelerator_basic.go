//go:build ignore
// +build ignore

package main

import (
	"fmt"
)

// Simple test using just the basic WASM structures to test Accelerator
func main() {
	fmt.Println("🧪 Basic WASM Test for Accelerator Inflation Bug")
	fmt.Println("==============================================")

	// Test basic account structure
	initialAccounts := AccountHoldingsMonthEnd{
		Cash: 50000, // $50K cash
		// Note: the generated types use interface{} for account fields
		// This might be part of the issue - type confusion
	}

	simLogVerbose("   Cash: $%.0f", initialAccounts.Cash)

	// Test basic events
	events := []FinancialEvent{
		{
			ID:          "test-income",
			Type:        "INCOME",
			MonthOffset: 0,
			Amount:      400000, // Annual income
			Description: "Test income event",
		},
		{
			ID:          "test-expense",
			Type:        "RECURRING_EXPENSE",
			MonthOffset: 0,
			Amount:      6000, // Monthly expense
			Description: "Test expense event",
		},
	}

	fmt.Printf("\n📋 Events:\n")
	for _, event := range events {
		simLogVerbose("   %s: $%.0f (%s)", event.ID, event.Amount, event.Type)
	}

	// Check if basic structures look correct
	fmt.Printf("AccountHoldingsMonthEnd fields:\n")
	simLogVerbose("  - Cash: %.0f (float64)", initialAccounts.Cash)
	simLogVerbose("  - Taxable: %T", initialAccounts.Taxable)
	simLogVerbose("  - TaxDeferred: %T", initialAccounts.TaxDeferred)
	simLogVerbose("  - Roth: %T", initialAccounts.Roth)

	fmt.Printf("\nFinancialEvent fields:\n")
	for i, event := range events {
		simLogVerbose("  Event %d:", i+1)
		simLogVerbose("    - Amount: %.0f (%T)", event.Amount, event.Amount)
		simLogVerbose("    - Type: %s (%T)", event.Type, event.Type)
		simLogVerbose("    - MonthOffset: %d (%T)", event.MonthOffset, event.MonthOffset)
	}

	// Test potential multiplication issues
	fmt.Printf("\n🧮 Testing Potential Multiplication Issues:\n")

	// Scenario 1: If income is being processed as monthly instead of annual
	monthlyIncome := events[0].Amount / 12
	simLogVerbose("If annual income treated as monthly: $%.0f/month", monthlyIncome)
	simLogVerbose("Year 1 income would be: $%.0f (12x multiplier!)", events[0].Amount*12)

	// Scenario 2: If monthly expense is being multiplied by 12
	annualExpenses := events[1].Amount * 12
	simLogVerbose("Monthly expenses: $%.0f/month", events[1].Amount)
	simLogVerbose("Annual expenses: $%.0f", annualExpenses)

	// Scenario 3: Starting assets calculation
	simLogVerbose("Cash only: $%.0f", initialAccounts.Cash)
	fmt.Printf("Expected with retirement accounts: $216,000\n")

	if initialAccounts.Taxable == nil && initialAccounts.TaxDeferred == nil && initialAccounts.Roth == nil {
	}

	// Look for patterns that could cause inflation
	inflatedYear1 := events[0].Amount*12 + initialAccounts.Cash
	simLogVerbose("If income multiplied by 12: $%.0f (MATCHES $5M+ bug pattern)", inflatedYear1)

	if inflatedYear1 > 2000000 {
		fmt.Printf("   $280,000 annual income * 12 months = $3,360,000\n")
		fmt.Printf("   Plus starting assets = massive inflation\n")
	}

	fmt.Printf("================\n")
	fmt.Printf("1. Account mapping is fixed (our earlier work)\n")
	fmt.Printf("2. BUT: Income processing may have frequency confusion\n")
	fmt.Printf("3. Need to check event processing in WASM engine\n")
	fmt.Printf("4. Look for annual vs monthly frequency handling\n")

	fmt.Printf("- Find where events are processed in simulation\n")
	fmt.Printf("- Check frequency conversion logic\n")
	fmt.Printf("- Look for multiplication by 12 in income handling\n")
}
