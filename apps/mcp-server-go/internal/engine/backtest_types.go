package engine

import (
	"encoding/json"
	"fmt"
	"math"
)

// HistoricalDataConfig contains historical market data for backtesting
// Updated to match monthly_historical_data.json structure
type HistoricalDataConfig struct {
	Description string                        `json:"description"`
	DataSource  string                        `json:"dataSource"`
	LastUpdated string                        `json:"lastUpdated"`
	Notes       HistoricalDataNotes           `json:"notes"`
	Scenarios   map[string]HistoricalScenario `json:"scenarios"`  // All scenarios now require monthly data
}

// HistoricalDataNotes contains metadata about the historical data
// Updated to match monthly_historical_data.json structure
type HistoricalDataNotes struct {
	Methodology       string `json:"methodology"`
	MissingData       string `json:"missingData"`
	NoApproximations  string `json:"noApproximations"`
	SPYReturns        string `json:"spyReturns"`
	BondReturns       string `json:"bondReturns"`
	IntlReturns       string `json:"intlReturns"`
	HomeReturns       string `json:"homeReturns"`
	RentGrowth        string `json:"rentGrowth"`
	Inflation         string `json:"inflation"`
}

// ELIMINATED: Legacy HistoricalScenario struct that allowed smoothed annual data
// All historical scenarios now REQUIRE discrete monthly data to preserve sequence-of-returns risk

// HistoricalYear type removed - only monthly data supported for accuracy

// HistoricalMonth contains monthly return data for true sequence-of-returns backtesting
// CRITICAL: This preserves intra-year volatility that the annual data conversion destroys
type HistoricalMonth struct {
	Year       int     `json:"year"`
	Month      int     `json:"month"`      // 1-12
	SPYReturn  float64 `json:"spyReturn"`  // Actual monthly return (not smoothed)
	BondReturn float64 `json:"bondReturn"` // Actual monthly return (not smoothed)
	Inflation  float64 `json:"inflation"`  // Monthly inflation rate
	// New fields for comprehensive asset class coverage
	IntlReturn float64 `json:"intlReturn,omitempty"` // International stocks (VXUS) monthly return
	HomeReturn float64 `json:"homeReturn,omitempty"` // Home price appreciation (Case-Shiller HPI)
	RentGrowth float64 `json:"rentGrowth,omitempty"` // Rent inflation (CPI Rent)
	DataSource string  `json:"dataSource,omitempty"` // Source of this data point
}

// ELIMINATED: Separate MonthlyHistoricalData struct - now unified with HistoricalDataConfig
// All historical data is now monthly data by definition

// HistoricalScenario represents a backtesting scenario using ONLY actual discrete monthly data
// CRITICAL: This struct ENFORCES monthly data to preserve sequence-of-returns risk
// No smoothed annual data is supported - mathematical accuracy demands month-by-month precision
// ENHANCED: Now supports event-driven plans for complex backtesting scenarios
type HistoricalScenario struct {
	Name               string            `json:"name"`
	Description        string            `json:"description"`
	StartDate          string            `json:"startDate"`          // YYYY-MM format
	EndDate            string            `json:"endDate"`            // YYYY-MM format
	InitialInvestment  float64           `json:"initialInvestment"`
	ExpectedFinalValue float64           `json:"expectedFinalValue"`
	Tolerance          float64           `json:"tolerance"`
	MonthlyData        []HistoricalMonth `json:"monthlyData"`       // Actual monthly returns
	Portfolio          *PortfolioAllocation `json:"portfolio,omitempty"`
	RebalanceFrequency string            `json:"rebalanceFrequency,omitempty"`
	InitialPrices      map[string]float64 `json:"initialPrices,omitempty"`

	// ENHANCED: Event-driven backtesting support
	Events             []FinancialEvent  `json:"events,omitempty"`   // Financial events to simulate during backtest
}

// PortfolioAllocation defines asset allocation percentages
type PortfolioAllocation struct {
	Stocks float64 `json:"stocks"`
	Bonds  float64 `json:"bonds"`
}

// BacktestConfig contains configuration for deterministic historical simulation
type BacktestConfig struct {
	IsBacktest     bool                      `json:"isBacktest"`
	ScenarioName   string                    `json:"scenarioName"`
	// HistoricalData field removed - monthly data required for accurate backtesting
	StartYear      int                       `json:"startYear"`
	EndYear        int                       `json:"endYear"`
}

// BacktestResult contains the results of a backtesting run
type BacktestResult struct {
	ScenarioName       string  `json:"scenarioName"`
	InitialValue       float64 `json:"initialValue"`
	FinalValue         float64 `json:"finalValue"`
	ExpectedFinalValue float64 `json:"expectedFinalValue"`
	ActualReturn       float64 `json:"actualReturn"`
	ExpectedReturn     float64 `json:"expectedReturn"`
	Tolerance          float64 `json:"tolerance"`
	WithinTolerance    bool    `json:"withinTolerance"`
	PercentageDiff     float64 `json:"percentageDiff"`
	YearsSimulated     int     `json:"yearsSimulated"`
	MonthsSimulated    int     `json:"monthsSimulated"`
}


// ValidateBacktestResult checks if the backtesting result is within tolerance
func ValidateBacktestResult(result BacktestResult) error {
	if !result.WithinTolerance {
		return fmt.Errorf("backtest validation failed for scenario '%s': expected %.2f, got %.2f (%.2f%% difference, tolerance: ±%.1f%%)",
			result.ScenarioName,
			result.ExpectedFinalValue,
			result.FinalValue,
			result.PercentageDiff*100,
			result.Tolerance*100)
	}
	return nil
}

// CalculateBacktestResult computes validation metrics for a backtesting run
func CalculateBacktestResult(scenarioName string, scenario HistoricalScenario, finalValue float64, monthsSimulated int) BacktestResult {
	// Safe division: prevent division by zero when expected value is 0
	var percentageDiff float64
	if scenario.ExpectedFinalValue == 0 {
		if finalValue == 0 {
			percentageDiff = 0 // Perfect match when both are zero
		} else {
			percentageDiff = math.Inf(1) // Infinite difference when expected is 0 but actual is not
		}
	} else {
		percentageDiff = math.Abs(finalValue-scenario.ExpectedFinalValue) / scenario.ExpectedFinalValue
	}
	withinTolerance := percentageDiff <= scenario.Tolerance

	// Calculate annualized returns
	years := float64(monthsSimulated) / 12.0

	// Safe calculation of annualized returns
	var actualReturn, expectedReturn float64
	if years > 0 && scenario.InitialInvestment > 0 {
		actualReturn = math.Pow(finalValue/scenario.InitialInvestment, 1.0/years) - 1.0
		expectedReturn = math.Pow(scenario.ExpectedFinalValue/scenario.InitialInvestment, 1.0/years) - 1.0
	} else {
		// Handle edge cases for zero time or zero investment
		actualReturn = 0
		expectedReturn = 0
	}

	return BacktestResult{
		ScenarioName:       scenarioName,
		InitialValue:       scenario.InitialInvestment,
		FinalValue:         finalValue,
		ExpectedFinalValue: scenario.ExpectedFinalValue,
		ActualReturn:       actualReturn,
		ExpectedReturn:     expectedReturn,
		Tolerance:          scenario.Tolerance,
		WithinTolerance:    withinTolerance,
		PercentageDiff:     percentageDiff,
		YearsSimulated:     int(years),
		MonthsSimulated:    monthsSimulated,
	}
}

// LoadHistoricalData loads historical data from JSON
func LoadHistoricalData(jsonData []byte) (*HistoricalDataConfig, error) {
	var config HistoricalDataConfig
	err := json.Unmarshal(jsonData, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse historical data: %v", err)
	}
	return &config, nil
}
