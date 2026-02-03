//go:build js && wasm
// +build js,wasm

package main

import (
	"syscall/js"
)

// convertSingleResultToLightweightJS converts Go SimulationResult to lightweight JavaScript object
// PERFORMANCE: Reduces data transfer by ~90% - only essential fields for chart rendering
func convertSingleResultToLightweightJS(result SimulationResult) js.Value {
	obj := js.Global().Get("Object").New()
	obj.Set("success", result.Success)

	if result.Error != "" {
		obj.Set("error", result.Error)
	}

	// Always include monthlyData field, even if empty
	monthlyDataJS := js.Global().Get("Array").New(len(result.MonthlyData))
	if result.Success && len(result.MonthlyData) > 0 {
		// Convert to lightweight monthly data - only essential fields
		for i, data := range result.MonthlyData {
			dataJS := js.Global().Get("Object").New()
			dataJS.Set("monthOffset", data.MonthOffset)

			// Essential chart data only
			safeSetFloat64(dataJS, "netWorth", data.NetWorth)
			safeSetFloat64(dataJS, "cashFlow", data.CashFlow)
			safeSetFloat64(dataJS, "cash", data.Accounts.Cash)

			// Account totals only (no detailed holdings)
			if data.Accounts.Taxable != nil {
				safeSetFloat64(dataJS, "taxable", data.Accounts.Taxable.TotalValue)
			} else {
				dataJS.Set("taxable", 0)
			}
			if data.Accounts.TaxDeferred != nil {
				safeSetFloat64(dataJS, "taxDeferred", data.Accounts.TaxDeferred.TotalValue)
			} else {
				dataJS.Set("taxDeferred", 0)
			}
			if data.Accounts.Roth != nil {
				safeSetFloat64(dataJS, "roth", data.Accounts.Roth.TotalValue)
			} else {
				dataJS.Set("roth", 0)
			}
			if data.Accounts.FiveTwoNine != nil {
				safeSetFloat64(dataJS, "fiveTwoNine", data.Accounts.FiveTwoNine.TotalValue)
			} else {
				dataJS.Set("fiveTwoNine", 0)
			}

			// Essential monthly flows for UI
			safeSetFloat64(dataJS, "incomeThisMonth", data.IncomeThisMonth)
			safeSetFloat64(dataJS, "expensesThisMonth", data.ExpensesThisMonth)

			// Deep dive analysis fields
			dividendsJS := js.Global().Get("Object").New()
			safeSetFloat64(dividendsJS, "qualified", data.DividendsReceivedThisMonth.Qualified)
			safeSetFloat64(dividendsJS, "ordinary", data.DividendsReceivedThisMonth.Ordinary)
			dataJS.Set("dividendsReceivedThisMonth", dividendsJS)

			safeSetFloat64(dataJS, "interestIncomeThisMonth", data.InterestIncomeThisMonth)
			safeSetFloat64(dataJS, "taxWithheldThisMonth", data.TaxWithheldThisMonth)

			// Full accounts structure for balance sheet deep dive
			accountsJS := js.Global().Get("Object").New()

			// Always include cash balance
			safeSetFloat64(accountsJS, "cash", data.Accounts.Cash)

			// Add account values if they exist
			if data.Accounts.Taxable != nil {
				taxableJS := js.Global().Get("Object").New()
				safeSetFloat64(taxableJS, "totalValue", data.Accounts.Taxable.TotalValue)
				accountsJS.Set("taxable", taxableJS)
			}

			if data.Accounts.TaxDeferred != nil {
				taxDeferredJS := js.Global().Get("Object").New()
				safeSetFloat64(taxDeferredJS, "totalValue", data.Accounts.TaxDeferred.TotalValue)
				accountsJS.Set("taxDeferred", taxDeferredJS)
			}

			if data.Accounts.Roth != nil {
				rothJS := js.Global().Get("Object").New()
				safeSetFloat64(rothJS, "totalValue", data.Accounts.Roth.TotalValue)
				accountsJS.Set("roth", rothJS)
			}

			if data.Accounts.FiveTwoNine != nil {
				fiveTwoNineJS := js.Global().Get("Object").New()
				safeSetFloat64(fiveTwoNineJS, "totalValue", data.Accounts.FiveTwoNine.TotalValue)
				accountsJS.Set("fiveTwoNine", fiveTwoNineJS)
			}

			dataJS.Set("accounts", accountsJS)

			monthlyDataJS.SetIndex(i, dataJS)
		}
	}

	// Always set monthlyData field (even if empty array)
	obj.Set("monthlyData", monthlyDataJS)

	// Essential metadata - always include these fields
	obj.Set("isBankrupt", result.IsBankrupt)
	if result.IsBankrupt {
		obj.Set("bankruptcyMonth", result.BankruptcyMonth)
		obj.Set("bankruptcyTrigger", result.BankruptcyTrigger)
	}
	safeSetFloat64(obj, "maxFinancialStressLevel", float64(result.MaxFinancialStressLevel))

	return obj
}

// convertResultsToLightweightJS converts Go SimulationResults to lightweight JavaScript object
func convertResultsToLightweightJS(results SimulationResults) js.Value {
	obj := js.Global().Get("Object").New()
	obj.Set("success", results.Success)
	obj.Set("numberOfRuns", results.NumberOfRuns)

	// Essential percentiles for charts
	safeSetFloat64(obj, "finalNetWorthP10", results.FinalNetWorthP10)
	safeSetFloat64(obj, "finalNetWorthP25", results.FinalNetWorthP25)
	safeSetFloat64(obj, "finalNetWorthP50", results.FinalNetWorthP50)
	safeSetFloat64(obj, "finalNetWorthP75", results.FinalNetWorthP75)
	safeSetFloat64(obj, "finalNetWorthP90", results.FinalNetWorthP90)
	safeSetFloat64(obj, "probabilityOfSuccess", results.ProbabilityOfSuccess)

	// Bankruptcy detection
	safeSetFloat64(obj, "probabilityOfBankruptcy", results.ProbabilityOfBankruptcy)
	obj.Set("bankruptcyCount", results.BankruptcyCount)

	if results.Error != "" {
		obj.Set("error", results.Error)
	}

	return obj
}

// PERFORMANCE FLAG: Global flag to enable/disable lightweight mode
// ENABLED: Lightweight serialization tested and validated for production use
var UseLightweightSerialization = true

// Enhanced wrapper function to choose serialization method
func convertResultsToJSOptimized(results SimulationResults) js.Value {
	if UseLightweightSerialization {
		return convertResultsToLightweightJS(results)
	}
	return convertResultsToJS(results)
}

func convertSingleResultToJSOptimized(result SimulationResult) js.Value {
	if UseLightweightSerialization {
		return convertSingleResultToLightweightJS(result)
	}
	return convertSingleResultToJS(result)
}
