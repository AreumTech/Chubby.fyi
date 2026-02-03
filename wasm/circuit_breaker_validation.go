package main

import (
	"fmt"
	"math"
)

// CircuitBreakerValidator provides runtime validation to catch data integrity issues
// This system prevents the simulation from continuing with corrupted or invalid data
type CircuitBreakerValidator struct {
	validationCount int
	errorThreshold  int
}

// NewCircuitBreakerValidator creates a new circuit breaker validator
func NewCircuitBreakerValidator() *CircuitBreakerValidator {
	return &CircuitBreakerValidator{
		validationCount: 0,
		errorThreshold:  3, // Stop simulation after 3 validation failures
	}
}

// ValidateAccountsIntegrity performs comprehensive validation of account data integrity
// CRITICAL: This function ensures NO corrupted holdings can exist in the simulation
func (cbv *CircuitBreakerValidator) ValidateAccountsIntegrity(accounts *AccountHoldingsMonthEnd, month int, year int) error {
	cbv.validationCount++

	simLogVerbose("🔍 [VALIDATOR] Running account integrity validation - Month %d, Year %d (Check #%d)", month, year, cbv.validationCount)

	// 1. Validate taxable account integrity
	if accounts.Taxable != nil {
		if err := cbv.validateTaxableAccountIntegrity(accounts.Taxable, month, year); err != nil {
			return fmt.Errorf("taxable account integrity failure: %w", err)
		}
	}

	// 2. Validate tax-deferred account integrity
	if accounts.TaxDeferred != nil {
		if err := cbv.validateTaxDeferredAccountIntegrity(accounts.TaxDeferred, month, year); err != nil {
			return fmt.Errorf("tax-deferred account integrity failure: %w", err)
		}
	}

	// 3. Validate Roth account integrity
	if accounts.Roth != nil {
		if err := cbv.validateRothAccountIntegrity(accounts.Roth, month, year); err != nil {
			return fmt.Errorf("roth account integrity failure: %w", err)
		}
	}

	// 4. Validate cash account integrity
	if err := cbv.validateCashAccountIntegrity(accounts.Cash, month, year); err != nil {
		return fmt.Errorf("cash account integrity failure: %w", err)
	}

	// 5. Validate net worth calculation integrity
	if err := cbv.validateNetWorthIntegrity(accounts, month, year); err != nil {
		return fmt.Errorf("net worth calculation integrity failure: %w", err)
	}

	simLogVerbose("✅ [VALIDATOR] Account integrity validation passed - Month %d, Year %d", month, year)
	return nil
}

// validateTaxableAccountIntegrity ensures taxable account data is mathematically sound
func (cbv *CircuitBreakerValidator) validateTaxableAccountIntegrity(account *Account, month int, year int) error {
	if account == nil {
		return nil // No taxable account to validate
	}

	// Check for negative total value (impossible in real scenarios)
	if account.TotalValue < 0 {
		return fmt.Errorf("CRITICAL: taxable account has negative value: $%.2f (Month %d, Year %d)", account.TotalValue, month, year)
	}

	// Validate individual holdings
	calculatedTotal := 0.0
	for i, holding := range account.Holdings {
		if err := cbv.validateHoldingIntegrity(&holding, fmt.Sprintf("Taxable[%d]", i), month, year); err != nil {
			return fmt.Errorf("holding %d integrity failure: %w", i, err)
		}
		calculatedTotal += holding.Quantity * holding.CostBasisPerUnit
	}

	// Validate total value matches sum of holdings (within small tolerance for rounding)
	// EXCEPTION: If holdings is empty but totalValue > 0, this is valid input format
	// The simulation engine will create holdings from totalValue in initializeAccountsForQueue
	if len(account.Holdings) > 0 {
		tolerance := math.Max(account.TotalValue*0.0001, 0.01) // 0.01% or $0.01, whichever is larger
		if math.Abs(account.TotalValue-calculatedTotal) > tolerance {
			return fmt.Errorf("CRITICAL: taxable account total value mismatch - Account: $%.2f, Calculated: $%.2f (Diff: $%.2f)", account.TotalValue, calculatedTotal, math.Abs(account.TotalValue-calculatedTotal))
		}
	}

	return nil
}

// validateHoldingIntegrity ensures individual holdings follow share-based accounting rules
func (cbv *CircuitBreakerValidator) validateHoldingIntegrity(holding *Holding, location string, month int, year int) error {
	// Check for impossible quantity values
	if holding.Quantity < 0 {
		return fmt.Errorf("CRITICAL: %s has negative quantity: %.6f shares", location, holding.Quantity)
	}

	if holding.Quantity > 0 && holding.CostBasisPerUnit <= 0 {
		return fmt.Errorf("CRITICAL: %s has positive quantity but non-positive cost basis: %.6f shares at $%.6f per share", location, holding.Quantity, holding.CostBasisPerUnit)
	}

	// CRITICAL: Detect legacy dollar-based holdings (the old, incorrect format)
	if cbv.isLegacyDollarBasedHolding(holding) {
		return fmt.Errorf("CRITICAL: %s appears to be legacy dollar-based holding (Qty: %.6f, Basis: $%.2f) - share-based accounting required", location, holding.Quantity, holding.CostBasisPerUnit)
	}

	// For taxable accounts: Validate FIFO lot tracking integrity
	if len(holding.Lots) > 0 {
		if err := cbv.validateLotTrackingIntegrity(holding, location); err != nil {
			return fmt.Errorf("lot tracking integrity failure in %s: %w", location, err)
		}
	}

	// Validate holding value calculation
	calculatedValue := holding.Quantity * holding.CostBasisPerUnit
	if holding.CostBasisTotal > 0 {
		tolerance := math.Max(holding.CostBasisTotal*0.0001, 0.01)
		if math.Abs(holding.CostBasisTotal-calculatedValue) > tolerance {
			return fmt.Errorf("CRITICAL: %s holding value mismatch - Stored: $%.2f, Calculated: $%.2f", location, holding.CostBasisTotal, calculatedValue)
		}
	}

	return nil
}

// isLegacyDollarBasedHolding detects holdings that use the old, incorrect dollar-based format
func (cbv *CircuitBreakerValidator) isLegacyDollarBasedHolding(holding *Holding) bool {
	// Legacy pattern: Quantity = 1.0, CostBasisPerUnit = total dollar value
	// This breaks capital gains calculations and must be eliminated

	const legacyQuantityThreshold = 1.0001 // Slightly above 1.0 to account for floating point precision
	const legacyMinBasisThreshold = 1000.0 // Minimum dollar amount that suggests legacy format

	if holding.Quantity <= legacyQuantityThreshold && holding.CostBasisPerUnit >= legacyMinBasisThreshold {
		// This looks like legacy format: 1 "share" worth thousands of dollars
		// Real shares should have reasonable per-share prices (typically $1-$500 per share for ETFs)
		simLogVerbose("⚠️ [VALIDATOR] Detected possible legacy holding: Qty=%.6f, Basis=$%.2f", holding.Quantity, holding.CostBasisPerUnit)
		return true
	}

	return false
}

// validateLotTrackingIntegrity ensures FIFO lot tracking is mathematically consistent
func (cbv *CircuitBreakerValidator) validateLotTrackingIntegrity(holding *Holding, location string) error {
	if len(holding.Lots) == 0 {
		return nil // No lots to validate
	}

	// Sum all lot quantities and values
	totalLotQuantity := 0.0
	totalLotValue := 0.0

	for i, lot := range holding.Lots {
		if lot.Quantity <= 0 {
			return fmt.Errorf("lot %d has non-positive quantity: %.6f", i, lot.Quantity)
		}

		if lot.CostBasisPerUnit <= 0 {
			return fmt.Errorf("lot %d has non-positive cost basis per unit: $%.6f", i, lot.CostBasisPerUnit)
		}

		totalLotQuantity += lot.Quantity
		totalLotValue += lot.Quantity * lot.CostBasisPerUnit
	}

	// Validate lot totals match holding totals
	quantityTolerance := math.Max(holding.Quantity*0.00001, 0.000001) // Very tight tolerance for share quantities
	if math.Abs(holding.Quantity-totalLotQuantity) > quantityTolerance {
		return fmt.Errorf("lot quantity sum mismatch - Holding: %.6f, Lots: %.6f (Diff: %.6f)", holding.Quantity, totalLotQuantity, math.Abs(holding.Quantity-totalLotQuantity))
	}

	valueTolerance := math.Max(holding.CostBasisTotal*0.0001, 0.01)
	if holding.CostBasisTotal > 0 && math.Abs(holding.CostBasisTotal-totalLotValue) > valueTolerance {
		return fmt.Errorf("lot value sum mismatch - Holding: $%.2f, Lots: $%.2f (Diff: $%.2f)", holding.CostBasisTotal, totalLotValue, math.Abs(holding.CostBasisTotal-totalLotValue))
	}

	return nil
}

// validateTaxDeferredAccountIntegrity validates tax-deferred account integrity
func (cbv *CircuitBreakerValidator) validateTaxDeferredAccountIntegrity(account *Account, month int, year int) error {
	if account == nil {
		return nil
	}

	// Tax-deferred accounts should never have negative balances in normal operation
	if account.TotalValue < 0 {
		return fmt.Errorf("CRITICAL: tax-deferred account has negative value: $%.2f (Month %d, Year %d)", account.TotalValue, month, year)
	}

	// Validate individual holdings (same rules as taxable)
	for i, holding := range account.Holdings {
		if err := cbv.validateHoldingIntegrity(&holding, fmt.Sprintf("TaxDeferred[%d]", i), month, year); err != nil {
			return fmt.Errorf("holding %d integrity failure: %w", i, err)
		}
	}

	return nil
}

// validateRothAccountIntegrity validates Roth account integrity
func (cbv *CircuitBreakerValidator) validateRothAccountIntegrity(account *Account, month int, year int) error {
	if account == nil {
		return nil
	}

	// Roth accounts should never have negative balances
	if account.TotalValue < 0 {
		return fmt.Errorf("CRITICAL: Roth account has negative value: $%.2f (Month %d, Year %d)", account.TotalValue, month, year)
	}

	// Validate individual holdings
	for i, holding := range account.Holdings {
		if err := cbv.validateHoldingIntegrity(&holding, fmt.Sprintf("Roth[%d]", i), month, year); err != nil {
			return fmt.Errorf("holding %d integrity failure: %w", i, err)
		}
	}

	return nil
}

// validateCashAccountIntegrity validates cash account integrity
func (cbv *CircuitBreakerValidator) validateCashAccountIntegrity(cash float64, month int, year int) error {
	// Cash can be negative (debt/borrowing), but extremely negative values may indicate errors
	const maxReasonableDebt = 10000000.0 // $10M max debt seems reasonable

	if cash < -maxReasonableDebt {
		return fmt.Errorf("CRITICAL: cash account has unrealistic negative value: $%.2f (Month %d, Year %d) - possible calculation error", cash, month, year)
	}

	// Extremely large cash values may also indicate errors
	const maxReasonableCash = 100000000.0 // $100M max cash
	if cash > maxReasonableCash {
		return fmt.Errorf("CRITICAL: cash account has unrealistic positive value: $%.2f (Month %d, Year %d) - possible calculation error", cash, month, year)
	}

	return nil
}

// validateNetWorthIntegrity validates overall net worth calculation
func (cbv *CircuitBreakerValidator) validateNetWorthIntegrity(accounts *AccountHoldingsMonthEnd, month int, year int) error {
	// Calculate net worth from individual account values
	calculatedNetWorth := accounts.Cash

	if accounts.Taxable != nil {
		calculatedNetWorth += accounts.Taxable.TotalValue
	}

	if accounts.TaxDeferred != nil {
		calculatedNetWorth += accounts.TaxDeferred.TotalValue
	}

	if accounts.Roth != nil {
		calculatedNetWorth += accounts.Roth.TotalValue
	}

	if accounts.HSA != nil {
		calculatedNetWorth += accounts.HSA.TotalValue
	}

	// Add other account types as they're implemented
	// calculatedNetWorth += accounts.FiveZeroNine.TotalValue
	// calculatedNetWorth += accounts.PrimaryHome

	// Validate against stored net worth (if available)
	// This comparison would need the actual NetWorth field from AccountHoldingsMonthEnd
	// For now, just ensure calculated value is reasonable
	const maxReasonableNetWorth = 1000000000.0 // $1B max net worth
	const minReasonableNetWorth = -50000000.0  // -$50M min net worth (extreme debt scenario)

	if calculatedNetWorth > maxReasonableNetWorth {
		return fmt.Errorf("CRITICAL: calculated net worth unrealistically high: $%.2f (Month %d, Year %d)", calculatedNetWorth, month, year)
	}

	if calculatedNetWorth < minReasonableNetWorth {
		return fmt.Errorf("CRITICAL: calculated net worth unrealistically low: $%.2f (Month %d, Year %d)", calculatedNetWorth, month, year)
	}

	return nil
}

// ValidateMonthlyDataIntegrity performs validation on monthly simulation data
func (cbv *CircuitBreakerValidator) ValidateMonthlyDataIntegrity(monthlyData MonthlyDataSimulation, month int, year int) error {
	// Validate net worth is reasonable
	if monthlyData.NetWorth < -50000000 || monthlyData.NetWorth > 1000000000 {
		return fmt.Errorf("CRITICAL: unrealistic net worth: $%.2f (Month %d, Year %d)", monthlyData.NetWorth, month, year)
	}

	// Validate cash flow values are reasonable
	if monthlyData.CashFlow < -10000000 || monthlyData.CashFlow > 10000000 {
		return fmt.Errorf("CRITICAL: unrealistic cash flow: $%.2f (Month %d, Year %d)", monthlyData.CashFlow, month, year)
	}

	// Validate monthly income values
	if monthlyData.IncomeThisMonth < 0 {
		return fmt.Errorf("CRITICAL: negative income this month: $%.2f (Month %d, Year %d)", monthlyData.IncomeThisMonth, month, year)
	}

	// Validate monthly employment income
	if monthlyData.EmploymentIncomeThisMonth < 0 {
		return fmt.Errorf("CRITICAL: negative employment income this month: $%.2f (Month %d, Year %d)", monthlyData.EmploymentIncomeThisMonth, month, year)
	}

	return nil
}

// ValidateFinancialEventProcessing validates financial event processing integrity
func (cbv *CircuitBreakerValidator) ValidateFinancialEventProcessing(event FinancialEvent, preAccounts, postAccounts *AccountHoldingsMonthEnd) error {
	// Validate that financial events don't create impossible scenarios

	// For expense events, ensure cash decreased appropriately
	if event.Type == "EXPENSE" {
		expectedCashChange := -event.Amount
		actualCashChange := postAccounts.Cash - preAccounts.Cash

		tolerance := math.Max(event.Amount*0.01, 1.0) // 1% or $1, whichever is larger
		if math.Abs(actualCashChange-expectedCashChange) > tolerance {
			return fmt.Errorf("CRITICAL: expense event processing error - Expected cash change: $%.2f, Actual: $%.2f (Event: %s, Amount: $%.2f)", expectedCashChange, actualCashChange, event.Type, event.Amount)
		}
	}

	// For income events, ensure cash increased appropriately
	if event.Type == "SALARY_INCOME" {
		// Cash should increase by at least some portion of the salary (after taxes)
		actualCashChange := postAccounts.Cash - preAccounts.Cash
		if actualCashChange <= 0 && event.Amount > 0 {
			// This might be OK if all salary went to retirement contributions, but let's warn
			simLogVerbose("⚠️ [VALIDATOR] Salary event resulted in no cash increase - may be OK if fully contributed to retirement")
		}
	}

	return nil
}

// ValidateSimulationPathIntegrity performs end-to-end validation of simulation path
func (cbv *CircuitBreakerValidator) ValidateSimulationPathIntegrity(result SimulationResult) error {
	if !result.Success {
		return fmt.Errorf("CRITICAL: simulation path failed - %s", result.Error)
	}

	if len(result.MonthlyData) == 0 {
		return fmt.Errorf("CRITICAL: simulation produced no monthly data")
	}

	// Validate final month data
	finalMonth := result.MonthlyData[len(result.MonthlyData)-1]

	// Check for reasonable final net worth
	if finalMonth.NetWorth < -50000000 || finalMonth.NetWorth > 1000000000 {
		return fmt.Errorf("CRITICAL: final net worth appears unrealistic: $%.2f", finalMonth.NetWorth)
	}

	// Validate data consistency across months
	for i, monthData := range result.MonthlyData {
		month := (i % 12) + 1
		year := (i / 12) + 1

		// Check for impossible month-to-month changes
		if i > 0 {
			prevMonth := result.MonthlyData[i-1]

			// Net worth shouldn't change by more than 50% in a single month under normal circumstances
			if prevMonth.NetWorth > 0 {
				monthlyChange := math.Abs(monthData.NetWorth-prevMonth.NetWorth) / prevMonth.NetWorth
				if monthlyChange > 0.50 {
					simLogVerbose("⚠️ [VALIDATOR] Large monthly net worth change detected: %.1f%% (Month %d, Year %d)", monthlyChange*100, month, year)
				}
			}
		}

		// Validate individual month data
		if err := cbv.ValidateMonthlyDataIntegrity(monthData, month, year); err != nil {
			return fmt.Errorf("month %d integrity failure: %w", i+1, err)
		}
	}

	simLogVerbose("✅ [VALIDATOR] Simulation path integrity validation passed - %d months validated", len(result.MonthlyData))
	return nil
}

// GetValidationSummary returns a summary of validation activities
func (cbv *CircuitBreakerValidator) GetValidationSummary() string {
	return fmt.Sprintf("Circuit Breaker Validator: %d validations performed, threshold: %d errors", cbv.validationCount, cbv.errorThreshold)
}