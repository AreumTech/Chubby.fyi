package main

import (
	"fmt"
	"strconv"
	"strings"
	// "encoding/json" - unused for now
	// "os" - unused for now
)

// BacktestEngine provides deterministic historical simulation capabilities
type BacktestEngine struct {
	simulationEngine *SimulationEngine
	historicalData   *HistoricalDataConfig
	currentScenario  *HistoricalScenario
	backtest         BacktestConfig
}

// NewBacktestEngine creates a new backtesting engine
func NewBacktestEngine(historicalData *HistoricalDataConfig) *BacktestEngine {
	return &BacktestEngine{
		historicalData: historicalData,
	}
}

// RunBacktest executes a complete backtesting scenario using the user's actual portfolio
// FIXED: Now accepts userInput with real initialAccounts instead of creating fake portfolio
func (be *BacktestEngine) RunBacktest(scenarioName string, userInput SimulationInput) (*BacktestResult, error) {
	scenario, exists := be.historicalData.Scenarios[scenarioName]
	if !exists {
		return nil, fmt.Errorf("scenario '%s' not found in historical data", scenarioName)
	}

	be.currentScenario = &scenario

	// Parse start and end years from dates
	startYear, err := be.parseYear(scenario.StartDate)
	if err != nil {
		return nil, fmt.Errorf("failed to parse start date: %v", err)
	}

	endYear, err := be.parseYear(scenario.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to parse end date: %v", err)
	}

	// Create historical returns map for true backtesting using month-by-month historical data
	historicalReturnsMap, err := be.createHistoricalReturnsMap(scenarioName, scenario, startYear, endYear)
	if err != nil {
		return nil, fmt.Errorf("failed to create historical returns map: %v", err)
	}

	// Use complete default config to ensure engine has all required parameters
	// Historical data will override market returns, but config provides necessary
	// fallback parameters and validation requirements (GARCH, AR(1), correlations, etc.)
	config := GetDefaultStochasticConfig()

	// Initialize simulation engine and inject historical returns
	be.simulationEngine = NewSimulationEngine(config)
	be.simulationEngine.backtestReturns = historicalReturnsMap

	be.backtest = BacktestConfig{
		IsBacktest:     true,
		ScenarioName:   scenarioName,
		// HistoricalData removed - monthly data required for accurate backtesting
		StartYear:      startYear,
		EndYear:        endYear,
	}

	// CRITICAL FIX: Use user's actual portfolio from userInput.InitialAccounts
	// This ensures backtest uses the real holdings, tax lots, and account values
	simLogVerbose("🔍 [BACKTEST] Using user's actual portfolio with Cash=$%.2f, Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f",
		userInput.InitialAccounts.Cash,
		userInput.InitialAccounts.Taxable.TotalValue,
		userInput.InitialAccounts.TaxDeferred.TotalValue,
		userInput.InitialAccounts.Roth.TotalValue)

	// Calculate months to run
	monthsToRun := (endYear - startYear + 1) * 12

	// Create proper simulation input for event-driven simulation using user's accounts
	simulationInput := be.createBacktestSimulationInput(scenario, userInput.InitialAccounts, userInput.Events, monthsToRun)

	// Run full event-driven simulation with historical market data
	result := be.simulationEngine.RunSingleSimulation(simulationInput)
	if !result.Success {
		return nil, fmt.Errorf("simulation failed: %s", result.Error)
	}

	// Get final portfolio value from the last month's data
	finalValue := 0.0
	if len(result.MonthlyData) > 0 {
		lastMonth := result.MonthlyData[len(result.MonthlyData)-1]
		finalValue = lastMonth.NetWorth
	}

	// Calculate and return validation results
	backtestResult := CalculateBacktestResult(scenarioName, scenario, finalValue, monthsToRun)
	return &backtestResult, nil
}

// createBacktestSimulationInput creates a SimulationInput structure for backtesting
// FIXED: Now uses user's actual accounts and combines user events with scenario events
func (be *BacktestEngine) createBacktestSimulationInput(scenario HistoricalScenario, initialAccounts AccountHoldingsMonthEnd, userEvents []FinancialEvent, monthsToRun int) SimulationInput {
	// Combine user's financial plan with scenario-specific events (if any)
	var events []FinancialEvent

	// Start with user's financial plan events (income, expenses, contributions, etc.)
	if len(userEvents) > 0 {
		events = append(events, userEvents...)
		simLogVerbose("🔍 [BACKTEST] Using user's financial plan with %d events", len(userEvents))
	}

	// Add scenario-specific events (if any) - these might be market shocks, policy changes, etc.
	if len(scenario.Events) > 0 {
		events = append(events, scenario.Events...)
		simLogVerbose("🔍 [BACKTEST] Added %d scenario-specific events from '%s'", len(scenario.Events), scenario.Name)
	}

	if len(events) == 0 {
		simLogVerbose("🔍 [BACKTEST] Buy-and-hold scenario with no events")
	}

	// Create simulation input structure using user's actual accounts
	simulationInput := SimulationInput{
		InitialAccounts: initialAccounts,
		Events:          events,
		Config:          be.simulationEngine.config,
		MonthsToRun:     monthsToRun,
		// The historical market data will be applied via backtestReturns map
		// which was injected into the simulation engine
	}

	return simulationInput
}


// createHistoricalReturnsMap creates a month-by-month historical returns map for TRUE backtesting
// SIMPLIFIED: Now directly uses monthly data from HistoricalScenario - no fallbacks or conversions
func (be *BacktestEngine) createHistoricalReturnsMap(scenarioName string, scenario HistoricalScenario, startYear, endYear int) (map[int]StochasticReturns, error) {
	// CRITICAL: All scenarios now require monthly data - no exceptions
	// This enforces mathematical accuracy by preserving sequence-of-returns risk
	return be.createHistoricalReturnsFromMonthlyData(scenario, startYear, endYear)
}

// createHistoricalReturnsFromMonthlyData creates returns map from actual monthly historical data
// This preserves sequence-of-returns risk and intra-year volatility
func (be *BacktestEngine) createHistoricalReturnsFromMonthlyData(scenario HistoricalScenario, startYear, endYear int) (map[int]StochasticReturns, error) {
	historicalReturns := make(map[int]StochasticReturns)
	monthOffset := 0

	simLogVerbose("✅ [BACKTEST-MONTHLY] Using TRUE monthly data for scenario '%s' - sequence-of-returns risk preserved", scenario.Name)

	// Iterate through the provided monthly data
	for _, monthData := range scenario.MonthlyData {
		// Check if this month falls within our simulation range
		if monthData.Year >= startYear && monthData.Year <= endYear {
			// Create returns structure from actual monthly data
			monthlyReturns := StochasticReturns{
				SPY:       monthData.SPYReturn,  // ACTUAL monthly return (Source: Yahoo Finance SPY)
				BND:       monthData.BondReturn, // ACTUAL monthly return (Source: Yahoo Finance AGG)
				Inflation: monthData.Inflation,  // ACTUAL monthly inflation (Source: BLS CPI-U)
			}

			// Use actual data when available - NO PROXIES for missing data
			// Missing data means the asset class is not available for that period
			monthlyReturns.Intl = monthData.IntlReturn  // May be 0 if data unavailable
			monthlyReturns.Home = monthData.HomeReturn  // May be 0 if data unavailable
			monthlyReturns.Rent = monthData.RentGrowth  // May be 0 if data unavailable

			// Log warning for missing critical data
			if monthData.IntlReturn == 0 && monthOffset == 0 {
				simLogVerbose("⚠️  [BACKTEST-WARNING] International stock data missing for %d-%02d", monthData.Year, monthData.Month)
			}
			if monthData.HomeReturn == 0 && monthOffset == 0 {
				simLogVerbose("⚠️  [BACKTEST-WARNING] Home price data missing for %d-%02d", monthData.Year, monthData.Month)
			}
			if monthData.RentGrowth == 0 && monthOffset == 0 {
				simLogVerbose("⚠️  [BACKTEST-WARNING] Rent growth data missing for %d-%02d", monthData.Year, monthData.Month)
			}

			historicalReturns[monthOffset] = monthlyReturns
			monthOffset++

			simLogVerbose("📊 [MONTHLY-DATA] %d-%02d: SPY=%.4f%%, BND=%.4f%%, Inflation=%.4f%%",
				monthData.Year, monthData.Month, monthData.SPYReturn*100, monthData.BondReturn*100, monthData.Inflation*100)
		}
	}

	if monthOffset == 0 {
		return nil, fmt.Errorf("no monthly data found for years %d-%d in scenario '%s'", startYear, endYear, scenario.Name)
	}

	simLogVerbose("✅ [BACKTEST-MONTHLY] Loaded %d months of actual historical data", monthOffset)
	return historicalReturns, nil
}


// ELIMINATED: getMonthlyScenario function - all scenarios now contain monthly data directly

// ELIMINATED: loadMonthlyHistoricalData function - historical data now unified in HistoricalDataConfig

// Helper functions for scenario matching
func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) && strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func getMapKeys(scenarios map[string]HistoricalScenario) []string {
	keys := make([]string, 0, len(scenarios))
	for k := range scenarios {
		keys = append(keys, k)
	}
	return keys
}


// createInitialAccounts creates initial account holdings based on scenario
// DEPRECATED: This function creates a FAKE portfolio and should NOT be used for actual backtesting.
// Use RunBacktest with a real SimulationInput containing the user's actual initialAccounts instead.
// This function is kept only for backward compatibility with old tests.
func (be *BacktestEngine) createInitialAccounts(scenario HistoricalScenario) AccountHoldingsMonthEnd {
	accounts := AccountHoldingsMonthEnd{}

	// PHASE 1.1: Use centralized holding creation instead of manual construction
	// This ensures all holdings are created with proper tax lot tracking
	cashManager := be.simulationEngine.cashManager

	// Set up initial market prices for the backtest
	// Use configurable initial prices from scenario, with centralized defaults
	initialStockPrice := GetDefaultInitialStockPrice()
	initialBondPrice := GetDefaultInitialBondPrice()
	if scenario.InitialPrices != nil {
		if price, ok := scenario.InitialPrices["stocks"]; ok && price > 0 {
			initialStockPrice = price
		}
		if price, ok := scenario.InitialPrices["bonds"]; ok && price > 0 {
			initialBondPrice = price
		}
	}

	// Initialize market prices for the cash manager
	// Use normalized $1/share for assets without specific historical prices
	marketPrices := MarketPrices{
		SPY:        initialStockPrice,
		BND:        initialBondPrice,
		INTL:       initialStockPrice * 0.95, // International stocks slightly lower
		RealEstate: 1.0,                      // Normalized: $1/share
		Individual: initialStockPrice,        // Individual stocks same as SPY
		Cash:       1.0,                      // Cash is always 1.0
		Other:      1.0,                      // Normalized: $1/share
	}
	cashManager.marketPrices = &marketPrices

	// Create empty taxable account first
	taxableAccount := &Account{
		TotalValue: 0,
		Holdings:   make([]Holding, 0),
	}

	// Add holdings using centralized method based on scenario portfolio
	if scenario.Portfolio != nil {
		// Portfolio-based allocation
		stockAmount := scenario.InitialInvestment * scenario.Portfolio.Stocks
		bondAmount := scenario.InitialInvestment * scenario.Portfolio.Bonds

		// Get configurable default acquisition date instead of hardcoded -12
		defaultAcquisitionDate := GetDefaultBacktestAcquisitionDate()

		// Add stock holdings if allocation > 0
		if stockAmount > 0 {
			simLogVerbose("🔍 [CENTRALIZED-HOLDING] Adding $%.2f in stocks to taxable account (acquisition date: %d months)", stockAmount, defaultAcquisitionDate)
			err := cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassUSStocksTotalMarket, stockAmount, defaultAcquisitionDate)
			if err != nil {
				simLogVerbose("⚠️  [BACKTEST-ERROR] Failed to add stock holding: %v", err)
			}
		}

		// Add bond holdings if allocation > 0
		if bondAmount > 0 {
			simLogVerbose("🔍 [CENTRALIZED-HOLDING] Adding $%.2f in bonds to taxable account (acquisition date: %d months)", bondAmount, defaultAcquisitionDate)
			err := cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassUSBondsTotalMarket, bondAmount, defaultAcquisitionDate)
			if err != nil {
				simLogVerbose("⚠️  [BACKTEST-ERROR] Failed to add bond holding: %v", err)
			}
		}
	} else {
		// Simple 100% stock allocation
		// Get configurable default acquisition date instead of hardcoded -12
		defaultAcquisitionDate := GetDefaultBacktestAcquisitionDate()
		simLogVerbose("🔍 [CENTRALIZED-HOLDING] Adding $%.2f in stocks (100%% allocation) to taxable account (acquisition date: %d months)", scenario.InitialInvestment, defaultAcquisitionDate)
		err := cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassUSStocksTotalMarket, scenario.InitialInvestment, defaultAcquisitionDate)
		if err != nil {
			simLogVerbose("⚠️  [BACKTEST-ERROR] Failed to add stock holding: %v", err)
		}
	}

	accounts.Taxable = taxableAccount

	// Debug: Log final account state
	simLogVerbose("🔍 [CENTRALIZED-RESULT] Taxable account: TotalValue=%.2f, Holdings count=%d",
		taxableAccount.TotalValue, len(taxableAccount.Holdings))
	for i, holding := range taxableAccount.Holdings {
		simLogVerbose("🔍 [CENTRALIZED-RESULT] Holding[%d]: AssetClass=%s, Quantity=%.6f, Price=%.2f, Value=%.2f, Lots=%d",
			i, holding.AssetClass, holding.Quantity, holding.CurrentMarketPricePerUnit, holding.CurrentMarketValueTotal, len(holding.Lots))
	}

	// CRITICAL FIX: Initialize all account pointers to prevent nil pointer crashes
	// The simulation engine expects all account pointers to be non-nil
	if accounts.TaxDeferred == nil {
		accounts.TaxDeferred = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}
	if accounts.Roth == nil {
		accounts.Roth = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}
	if accounts.FiveTwoNine == nil {
		accounts.FiveTwoNine = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}
	if accounts.HSA == nil {
		accounts.HSA = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}
	if accounts.Checking == nil {
		accounts.Checking = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}
	if accounts.Savings == nil {
		accounts.Savings = &Account{TotalValue: 0, Holdings: make([]Holding, 0)}
	}

	// FINAL DEBUG: Log the complete accounts structure before returning
	simLogVerbose("🔍 [FINAL-ACCOUNTS-DEBUG] Returning accounts:")
	if accounts.Taxable != nil {
		simLogVerbose("  Taxable: TotalValue=%.2f, Holdings=%d", accounts.Taxable.TotalValue, len(accounts.Taxable.Holdings))
		for i, holding := range accounts.Taxable.Holdings {
			simLogVerbose("    [%d] AssetClass=%s: qty=%.6f, price=%.2f, value=%.2f, lots=%d",
				i, holding.AssetClass, holding.Quantity, holding.CurrentMarketPricePerUnit, holding.CurrentMarketValueTotal, len(holding.Lots))
		}
	}

	return accounts
}

// Helper functions
func (be *BacktestEngine) parseYear(dateStr string) (int, error) {
	// Parse year from YYYY-MM-DD format
	year, err := strconv.Atoi(dateStr[:4])
	if err != nil {
		return 0, fmt.Errorf("invalid date format: %s", dateStr)
	}
	return year, nil
}


func (be *BacktestEngine) calculateNetWorth(accounts AccountHoldingsMonthEnd) float64 {
	total := accounts.Cash

	// Sum all account values
	if accounts.Taxable != nil {
		total += be.calculateAccountValue(*accounts.Taxable)
	}
	if accounts.TaxDeferred != nil {
		total += be.calculateAccountValue(*accounts.TaxDeferred)
	}
	if accounts.Roth != nil {
		total += be.calculateAccountValue(*accounts.Roth)
	}

	return total
}

func (be *BacktestEngine) calculateAccountValue(account Account) float64 {
	total := 0.0
	for _, holding := range account.Holdings {
		total += holding.CurrentMarketValueTotal
	}
	return total
}
