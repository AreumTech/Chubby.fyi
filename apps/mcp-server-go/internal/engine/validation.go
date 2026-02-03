package engine

import (
	"fmt"
	"math"
)

// validateNoLegacyHoldings ensures all holdings use proper share-based accounting
// This function checks that holdings have realistic share quantities, not dollar amounts
// disguised as single shares (Quantity=1 with high CostBasisPerUnit)
func validateNoLegacyHoldings(accounts *AccountHoldingsMonthEnd) error {
	// Check all account types
	accountsToCheck := []struct {
		name    string
		account *Account
	}{
		{"Taxable", accounts.Taxable},
		{"TaxDeferred", accounts.TaxDeferred},
		{"Roth", accounts.Roth},
		{"FiveTwoNine", accounts.FiveTwoNine},
	}

	for _, ac := range accountsToCheck {
		if ac.account == nil {
			continue
		}

		for i, holding := range ac.account.Holdings {
			// Validate share-based accounting
			if err := validateHoldingIsShareBased(holding, ac.name, i); err != nil {
				return err
			}

			// Ensure proper FIFO tax lots exist
			if err := validateTaxLots(holding, ac.name, i); err != nil {
				return err
			}
		}
	}

	return nil
}

// validateHoldingIsShareBased checks if a holding uses proper share-based accounting
func validateHoldingIsShareBased(holding Holding, accountName string, index int) error {
	// DEBUG: Log each holding being validated
	simLogVerbose("🔍 [VALIDATION-DEBUG] Checking holding %s[%d]: AssetClass=%s, Quantity=%.4f, CostBasisPerUnit=$%.2f, CostBasisTotal=$%.2f",
		accountName, index, holding.AssetClass, holding.Quantity, holding.CostBasisPerUnit, holding.CostBasisTotal)

	// Use consistent legacy detection logic with input boundary validation
	// Skip cash - it legitimately has $1 per unit
	if holding.AssetClass != AssetClassCash {
		// Check for the telltale sign: Quantity = 1.0 and high cost basis per unit
		// This indicates the old model where "$10,000" was stored as Quantity=1.0, CostBasisPerUnit=10000.0
		if holding.Quantity == 1.0 && holding.CostBasisPerUnit > 10.0 {
			simLogVerbose("❌ [VALIDATION-DEBUG] Legacy dollar-based pattern detected: %s[%d] has Quantity=1.0 with CostBasisPerUnit=$%.2f",
				accountName, index, holding.CostBasisPerUnit)
			return fmt.Errorf(
				"CRITICAL: Legacy dollar-based holding detected in %s[%d]: "+
					"Quantity=%.2f, CostBasisPerUnit=$%.2f. Engine requires share-based accounting with realistic share quantities and cost basis per share",
				accountName, index, holding.Quantity, holding.CostBasisPerUnit,
			)
		}

		// Additional check for very small quantities with very large cost basis
		// Sometimes legacy holdings have Quantity = 0.5 with CostBasisPerUnit = $20,000, etc.
		if holding.Quantity < 5.0 && holding.CostBasisPerUnit > 100.0 {
			simLogVerbose("❌ [VALIDATION-DEBUG] Legacy dollar-based pattern detected: %s[%d] has Quantity=%.4f with CostBasisPerUnit=$%.2f",
				accountName, index, holding.Quantity, holding.CostBasisPerUnit)
			return fmt.Errorf(
				"CRITICAL: Legacy dollar-based holding detected in %s[%d]: "+
					"Quantity=%.4f, CostBasisPerUnit=$%.2f. Engine requires share-based accounting with realistic share quantities and cost basis per share",
				accountName, index, holding.Quantity, holding.CostBasisPerUnit,
			)
		}
	}

	// Verify consistency between fields
	expectedTotal := holding.Quantity * holding.CostBasisPerUnit
	tolerance := 0.01 // Allow for floating-point rounding
	if math.Abs(expectedTotal-holding.CostBasisTotal) > tolerance {
		simLogVerbose("❌ [VALIDATION-DEBUG] Inconsistent holding data: %s[%d] expected=$%.4f, actual=$%.4f, diff=$%.4f",
			accountName, index, expectedTotal, holding.CostBasisTotal, math.Abs(expectedTotal-holding.CostBasisTotal))
		return fmt.Errorf(
			"[VALIDATION-ERROR] Inconsistent holding data in %s[%d]: "+
				"Quantity=%.4f * CostBasisPerUnit=$%.4f = $%.4f, but CostBasisTotal=$%.4f. "+
				"Difference of $%.4f exceeds tolerance.",
			accountName, index, holding.Quantity, holding.CostBasisPerUnit,
			expectedTotal, holding.CostBasisTotal,
			math.Abs(expectedTotal-holding.CostBasisTotal),
		)
	}

	simLogVerbose("✅ [VALIDATION-DEBUG] Holding %s[%d] passed share-based validation", accountName, index)

	return nil
}

// validateTaxLots ensures proper FIFO tax lot tracking exists
func validateTaxLots(holding Holding, accountName string, index int) error {
	// Skip validation for tax-advantaged accounts (no capital gains tracking needed)
	if accountName == "TaxDeferred" || accountName == "Roth" || accountName == "FiveTwoNine" {
		simLogVerbose("🔍 [VALIDATION-DEBUG] Skipping tax lot validation for %s[%d] (tax-advantaged)", accountName, index)
		return nil
	}

	simLogVerbose("🔍 [VALIDATION-DEBUG] Checking tax lots for %s[%d]: Quantity=%.4f, Lots=%d",
		accountName, index, holding.Quantity, len(holding.Lots))

	// For taxable accounts, ensure tax lots exist and are consistent
	if len(holding.Lots) == 0 && holding.Quantity > 0 {
		simLogVerbose("❌ [VALIDATION-DEBUG] Missing tax lots: %s[%d] has Quantity=%.4f but no tax lots",
			accountName, index, holding.Quantity)
		return fmt.Errorf(
			"[VALIDATION-ERROR] Missing tax lots in %s[%d]: "+
				"Holding has Quantity=%.4f but no tax lots for FIFO tracking. "+
				"All taxable holdings must have tax lots for capital gains calculation.",
			accountName, index, holding.Quantity,
		)
	}

	// Verify tax lots sum to total quantity
	totalLotQuantity := 0.0
	totalLotCostBasis := 0.0
	for _, lot := range holding.Lots {
		totalLotQuantity += lot.Quantity
		totalLotCostBasis += lot.Quantity * lot.CostBasisPerUnit
	}

	simLogVerbose("🔍 [VALIDATION-DEBUG] Tax lot totals for %s[%d]: totalLotQuantity=%.4f, totalLotCostBasis=$%.2f",
		accountName, index, totalLotQuantity, totalLotCostBasis)

	quantityTolerance := 0.0001
	if math.Abs(totalLotQuantity-holding.Quantity) > quantityTolerance {
		simLogVerbose("❌ [VALIDATION-DEBUG] Tax lot quantity mismatch: %s[%d] lots=%.4f vs holding=%.4f, diff=%.4f",
			accountName, index, totalLotQuantity, holding.Quantity, math.Abs(totalLotQuantity-holding.Quantity))
		return fmt.Errorf(
			"[VALIDATION-ERROR] Tax lot quantity mismatch in %s[%d]: "+
				"Sum of tax lots=%.4f but holding Quantity=%.4f. "+
				"Difference of %.4f exceeds tolerance.",
			accountName, index, totalLotQuantity, holding.Quantity,
			math.Abs(totalLotQuantity-holding.Quantity),
		)
	}

	costBasisTolerance := 0.01
	if math.Abs(totalLotCostBasis-holding.CostBasisTotal) > costBasisTolerance {
		simLogVerbose("❌ [VALIDATION-DEBUG] Tax lot cost basis mismatch: %s[%d] lots=$%.4f vs holding=$%.4f, diff=$%.4f",
			accountName, index, totalLotCostBasis, holding.CostBasisTotal, math.Abs(totalLotCostBasis-holding.CostBasisTotal))
		return fmt.Errorf(
			"[VALIDATION-ERROR] Tax lot cost basis mismatch in %s[%d]: "+
				"Sum of tax lot cost bases=$%.4f but CostBasisTotal=$%.4f. "+
				"Difference of $%.4f exceeds tolerance.",
			accountName, index, totalLotCostBasis, holding.CostBasisTotal,
			math.Abs(totalLotCostBasis-holding.CostBasisTotal),
		)
	}

	simLogVerbose("✅ [VALIDATION-DEBUG] Tax lot validation passed for %s[%d]", accountName, index)
	return nil
}

// validateAccountIntegrity performs comprehensive validation of account state
func validateAccountIntegrity(accounts *AccountHoldingsMonthEnd) error {
	// First check for legacy holdings
	if err := validateNoLegacyHoldings(accounts); err != nil {
		return err
	}

	// Validate total values match sum of holdings
	accountsToCheck := []struct {
		name    string
		account *Account
	}{
		{"Taxable", accounts.Taxable},
		{"TaxDeferred", accounts.TaxDeferred},
		{"Roth", accounts.Roth},
		{"FiveTwoNine", accounts.FiveTwoNine},
	}

	for _, ac := range accountsToCheck {
		if ac.account == nil {
			continue
		}

		calculatedTotal := 0.0
		for _, holding := range ac.account.Holdings {
			// Use current market value for total calculation
			marketValue := holding.Quantity * holding.CurrentMarketPricePerUnit
			calculatedTotal += marketValue
		}

		tolerance := 0.01
		if math.Abs(calculatedTotal-ac.account.TotalValue) > tolerance {
			// This is a warning, not an error, as TotalValue might include cash
			fmt.Printf(
				"⚠️  [VALIDATION-WARNING] Total value mismatch in %s: "+
					"Calculated=$%.2f, Stored=$%.2f, Difference=$%.2f\n",
				ac.name, calculatedTotal, ac.account.TotalValue,
				math.Abs(calculatedTotal-ac.account.TotalValue),
			)
		}
	}

	// Check cash is non-negative
	if accounts.Cash < 0 {
		return fmt.Errorf(
			"[VALIDATION-ERROR] Negative cash balance: $%.2f. "+
				"Cash should never be negative.",
			accounts.Cash,
		)
	}

	fmt.Println("✅ [VALIDATION] Account integrity check passed - all holdings use share-based accounting")
	return nil
}

// ValidateSimulationIntegrity is the main entry point for simulation validation
// Call this at key points during simulation to ensure data integrity
// Note: Pass accounts directly since SimulationEngine doesn't maintain currentState
func ValidateSimulationIntegrity(se *SimulationEngine) error {
	if se == nil {
		return fmt.Errorf("[VALIDATION-ERROR] Invalid simulation engine")
	}

	// Validation is now called with accounts passed directly from the simulation loop
	// See ValidateAccountsIntegrity for the actual validation
	return nil
}

// ValidateAccountsIntegrity is the comprehensive "circuit breaker" validation
// This enforces the core requirements and fails fast on any integrity violations
func ValidateAccountsIntegrity(accounts *AccountHoldingsMonthEnd) error {
	if accounts == nil {
		return fmt.Errorf("[VALIDATION-ERROR] Nil accounts")
	}

	// Circuit Breaker Check 1: Detect legacy holdings that violate share-based accounting
	if err := validateNoLegacyHoldings(accounts); err != nil {
		return fmt.Errorf("[CIRCUIT-BREAKER] Legacy holding detected: %v", err)
	}

	// Circuit Breaker Check 2: Ensure all taxable holdings have proper tax lots
	if err := validateTaxableLotIntegrity(accounts); err != nil {
		return fmt.Errorf("[CIRCUIT-BREAKER] Tax lot integrity violation: %v", err)
	}

	// Circuit Breaker Check 3: Validate numerical consistency
	if err := validateNumericalConsistency(accounts); err != nil {
		return fmt.Errorf("[CIRCUIT-BREAKER] Numerical inconsistency: %v", err)
	}

	// Circuit Breaker Check 4: Validate no NaN or Infinity values
	if err := validateNoInvalidNumbers(accounts); err != nil {
		return fmt.Errorf("[CIRCUIT-BREAKER] Invalid numbers detected: %v", err)
	}

	return nil
}

// validateTaxableLotIntegrity ensures all taxable holdings have proper FIFO tax lots
func validateTaxableLotIntegrity(accounts *AccountHoldingsMonthEnd) error {
	if accounts.Taxable == nil {
		return nil // No taxable account is valid
	}

	for i, holding := range accounts.Taxable.Holdings {
		if holding.Quantity > 0 && len(holding.Lots) == 0 {
			return fmt.Errorf(
				"Taxable holding[%d] has Quantity=%.4f but ZERO tax lots. "+
					"This violates FIFO capital gains tracking. "+
					"Asset class: %s",
				i, holding.Quantity, holding.AssetClass,
			)
		}

		// Verify tax lots sum to holding totals
		if len(holding.Lots) > 0 {
			totalLotQuantity := 0.0
			totalLotCostBasis := 0.0
			for _, lot := range holding.Lots {
				totalLotQuantity += lot.Quantity
				totalLotCostBasis += lot.CostBasisTotal
			}

			// Check quantity consistency
			quantityTolerance := 0.0001
			if math.Abs(totalLotQuantity-holding.Quantity) > quantityTolerance {
				return fmt.Errorf(
					"Taxable holding[%d] quantity mismatch: "+
						"Sum of lots=%.6f, Holding=%.6f, Difference=%.6f exceeds tolerance %.6f",
					i, totalLotQuantity, holding.Quantity,
					math.Abs(totalLotQuantity-holding.Quantity), quantityTolerance,
				)
			}

			// Check cost basis consistency
			costBasisTolerance := 0.01
			if math.Abs(totalLotCostBasis-holding.CostBasisTotal) > costBasisTolerance {
				return fmt.Errorf(
					"Taxable holding[%d] cost basis mismatch: "+
						"Sum of lots=$%.4f, Holding=$%.4f, Difference=$%.4f exceeds tolerance $%.4f",
					i, totalLotCostBasis, holding.CostBasisTotal,
					math.Abs(totalLotCostBasis-holding.CostBasisTotal), costBasisTolerance,
				)
			}
		}
	}

	return nil
}

// validateNumericalConsistency checks for mathematical consistency in holdings
func validateNumericalConsistency(accounts *AccountHoldingsMonthEnd) error {
	accountsToCheck := []struct {
		name    string
		account *Account
	}{
		{"Taxable", accounts.Taxable},
		{"TaxDeferred", accounts.TaxDeferred},
		{"Roth", accounts.Roth},
		{"FiveTwoNine", accounts.FiveTwoNine},
		{"HSA", accounts.HSA},
		{"Checking", accounts.Checking},
		{"Savings", accounts.Savings},
	}

	for _, ac := range accountsToCheck {
		if ac.account == nil {
			continue
		}

		for i, holding := range ac.account.Holdings {
			// Check for negative quantities (impossible)
			if holding.Quantity < 0 {
				return fmt.Errorf(
					"%s holding[%d] has negative quantity: %.6f. This is mathematically impossible.",
					ac.name, i, holding.Quantity,
				)
			}

			// Check cost basis consistency: Quantity * CostBasisPerUnit should equal CostBasisTotal
			if holding.Quantity > 0 {
				expectedCostBasisTotal := holding.Quantity * holding.CostBasisPerUnit
				tolerance := 0.01
				if math.Abs(expectedCostBasisTotal-holding.CostBasisTotal) > tolerance {
					return fmt.Errorf(
						"%s holding[%d] cost basis inconsistency: "+
							"%.6f shares * $%.4f/share = $%.4f, but CostBasisTotal=$%.4f. "+
							"Difference $%.4f exceeds tolerance.",
						ac.name, i, holding.Quantity, holding.CostBasisPerUnit,
						expectedCostBasisTotal, holding.CostBasisTotal,
						math.Abs(expectedCostBasisTotal-holding.CostBasisTotal),
					)
				}
			}

			// Check market value consistency: Quantity * CurrentMarketPricePerUnit should equal CurrentMarketValueTotal
			if holding.Quantity > 0 {
				expectedMarketValue := holding.Quantity * holding.CurrentMarketPricePerUnit
				tolerance := 0.01
				if math.Abs(expectedMarketValue-holding.CurrentMarketValueTotal) > tolerance {
					return fmt.Errorf(
						"%s holding[%d] market value inconsistency: "+
							"%.6f shares * $%.4f/share = $%.4f, but CurrentMarketValueTotal=$%.4f. "+
							"Difference $%.4f exceeds tolerance.",
						ac.name, i, holding.Quantity, holding.CurrentMarketPricePerUnit,
						expectedMarketValue, holding.CurrentMarketValueTotal,
						math.Abs(expectedMarketValue-holding.CurrentMarketValueTotal),
					)
				}
			}
		}
	}

	return nil
}

// validateNoInvalidNumbers checks for NaN and Infinity values that poison calculations
func validateNoInvalidNumbers(accounts *AccountHoldingsMonthEnd) error {
	// Check cash first
	if math.IsNaN(accounts.Cash) || math.IsInf(accounts.Cash, 0) {
		return fmt.Errorf("Cash amount is NaN or Infinity: %v", accounts.Cash)
	}

	accountsToCheck := []struct {
		name    string
		account *Account
	}{
		{"Taxable", accounts.Taxable},
		{"TaxDeferred", accounts.TaxDeferred},
		{"Roth", accounts.Roth},
		{"FiveTwoNine", accounts.FiveTwoNine},
		{"HSA", accounts.HSA},
		{"Checking", accounts.Checking},
		{"Savings", accounts.Savings},
	}

	for _, ac := range accountsToCheck {
		if ac.account == nil {
			continue
		}

		// Check account total value
		if math.IsNaN(ac.account.TotalValue) || math.IsInf(ac.account.TotalValue, 0) {
			return fmt.Errorf("%s account TotalValue is NaN or Infinity: %v", ac.name, ac.account.TotalValue)
		}

		// Check all holding values
		for i, holding := range ac.account.Holdings {
			values := []struct {
				name string
				val  float64
			}{
				{"Quantity", holding.Quantity},
				{"CostBasisPerUnit", holding.CostBasisPerUnit},
				{"CostBasisTotal", holding.CostBasisTotal},
				{"CurrentMarketPricePerUnit", holding.CurrentMarketPricePerUnit},
				{"CurrentMarketValueTotal", holding.CurrentMarketValueTotal},
				{"UnrealizedGainLossTotal", holding.UnrealizedGainLossTotal},
			}

			for _, v := range values {
				if math.IsNaN(v.val) || math.IsInf(v.val, 0) {
					return fmt.Errorf(
						"%s holding[%d].%s is NaN or Infinity: %v",
						ac.name, i, v.name, v.val,
					)
				}
			}

			// Check tax lots if they exist
			for j, lot := range holding.Lots {
				lotValues := []struct {
					name string
					val  float64
				}{
					{"Quantity", lot.Quantity},
					{"CostBasisPerUnit", lot.CostBasisPerUnit},
					{"CostBasisTotal", lot.CostBasisTotal},
				}

				for _, v := range lotValues {
					if math.IsNaN(v.val) || math.IsInf(v.val, 0) {
						return fmt.Errorf(
							"%s holding[%d] lot[%d].%s is NaN or Infinity: %v",
							ac.name, i, j, v.name, v.val,
						)
					}
				}
			}
		}
	}

	return nil
}