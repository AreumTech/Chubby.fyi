package engine

// PERFORMANCE OPTIMIZATION: Selective data serialization to minimize transfer overhead
// Instead of transferring 420 months × 50+ fields × 50 simulations = 1M+ data points,
// we transfer only essential data for UI rendering and provide full data on demand

// MonthlyDataLightweight contains only essential fields for chart rendering
type MonthlyDataLightweight struct {
	MonthOffset int     `json:"monthOffset"`
	NetWorth    float64 `json:"netWorth"`
	CashFlow    float64 `json:"cashFlow"`
	Cash        float64 `json:"cash"`
	Taxable     float64 `json:"taxable"`
	TaxDeferred float64 `json:"taxDeferred"`
	Roth        float64 `json:"roth"`
	FiveTwoNine float64 `json:"fiveTwoNine"`

	// Essential monthly flows for UI
	IncomeThisMonth   float64 `json:"incomeThisMonth"`
	ExpensesThisMonth float64 `json:"expensesThisMonth"`
}

// SimulationResultLightweight minimizes data transfer for initial UI rendering
type SimulationResultLightweight struct {
	Success                bool                     `json:"success"`
	Error                  string                   `json:"error,omitempty"`
	MonthlyDataLightweight []MonthlyDataLightweight `json:"monthlyDataLightweight"`

	// Essential result metadata
	IsBankrupt              bool    `json:"isBankrupt"`
	BankruptcyMonth         int     `json:"bankruptcyMonth,omitempty"`
	BankruptcyTrigger       string  `json:"bankruptcyTrigger,omitempty"`
	MaxFinancialStressLevel float64 `json:"maxFinancialStressLevel"`
}

// convertToLightweight extracts only essential data for fast UI rendering
func (se *SimulationEngine) convertToLightweight(fullResult SimulationResult) SimulationResultLightweight {
	lightweightData := make([]MonthlyDataLightweight, len(fullResult.MonthlyData))

	for i, monthData := range fullResult.MonthlyData {
		// Extract account totals efficiently
		var taxableValue, taxDeferredValue, rothValue float64

		if monthData.Accounts.Taxable != nil {
			taxableValue = monthData.Accounts.Taxable.TotalValue
		}
		if monthData.Accounts.TaxDeferred != nil {
			taxDeferredValue = monthData.Accounts.TaxDeferred.TotalValue
		}
		if monthData.Accounts.Roth != nil {
			rothValue = monthData.Accounts.Roth.TotalValue
		}
		var fiveTwoNineValue float64
		if monthData.Accounts.FiveTwoNine != nil {
			fiveTwoNineValue = monthData.Accounts.FiveTwoNine.TotalValue
		}

		lightweightData[i] = MonthlyDataLightweight{
			MonthOffset:       monthData.MonthOffset,
			NetWorth:          monthData.NetWorth,
			CashFlow:          monthData.CashFlow,
			Cash:              monthData.Accounts.Cash,
			Taxable:           taxableValue,
			TaxDeferred:       taxDeferredValue,
			Roth:              rothValue,
			FiveTwoNine:       fiveTwoNineValue,
			IncomeThisMonth:   monthData.IncomeThisMonth,
			ExpensesThisMonth: monthData.ExpensesThisMonth,
		}
	}

	return SimulationResultLightweight{
		Success:                 fullResult.Success,
		Error:                   fullResult.Error,
		MonthlyDataLightweight:  lightweightData,
		IsBankrupt:              fullResult.IsBankrupt,
		BankruptcyMonth:         fullResult.BankruptcyMonth,
		BankruptcyTrigger:       fullResult.BankruptcyTrigger,
		MaxFinancialStressLevel: float64(fullResult.MaxFinancialStressLevel),
	}
}
