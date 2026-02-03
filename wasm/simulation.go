package main

import (
	"fmt"
	"math"
	"runtime"
	"sort"
	"strings"
)

// VERBOSE_DEBUG is set by build tags in verbose_debug_*.go files
// Development builds: true
// Production builds: false

// criticalLog only logs critical path information (respects VERBOSE_DEBUG)
func criticalLog(format string, args ...interface{}) {
	if !VERBOSE_DEBUG {
		return
	}
	fmt.Printf("[CRITICAL] "+format+"\n", args...)
}

// Priority Queue-based Discrete Event Simulation Engine
// This is now the sole simulation implementation (legacy loop removed)
//
// DATA SOURCES: All financial data, tax rules, and market returns are sourced from
// authoritative government and academic sources. See DATA_SOURCES_AND_CITATIONS.md
// for comprehensive documentation of all data sources and methodologies.

// SimulationEngine manages the core simulation state and execution
type SimulationEngine struct {
	config              StochasticModelConfig
	stochasticState     StochasticState
	currentYear         int
	currentMonthReturns *StochasticReturns
	marketPrices        MarketPrices                // Current market prices per share for share-based calculations
	backtestReturns     map[int]StochasticReturns   // Historical returns for true backtesting (month offset -> returns)
	taxCalculator       *TaxCalculator
	cashManager         *CashManager
	seededRng           *SeededRNG                  // Seeded RNG for deterministic stochastic simulation (nil if not seeded)

	// Retirement optimization modules
	rmdCalculator           *RMDCalculator
	withdrawalSequencer     *WithdrawalSequencer
	assetLocationOptimizer  *AssetLocationOptimizer
	rothConversionOptimizer *RothConversionOptimizer

	// Comprehensive financial calculators (Gap Closure Phase)
	contributionLimitTracker *ContributionLimitTracker
	stateTaxCalculator       *StateTaxCalculator
	socialSecurityCalc       *SocialSecurityCalculator
	estateTaxCalculator      *EstateTaxCalculator
	ltcCalculator            *LongTermCareCalculator
	propertyCostEscalator    *PropertyCostEscalator
	goalPrioritizer          *GoalPrioritizer
	taxAwareRebalancer       *TaxAwareRebalancer

	ledger              *SimpleLedger
	strategyProcessor   *StrategyProcessor
	eventRegistry       *EventHandlerRegistry
	dynamicEventTracker *DynamicEventTracker
	simulationInput     *SimulationInput     // Store input for access to strategies
	eventQueue          *EventPriorityQueue // Queue for dynamic event injection

	// Tax tracking (Year-to-Date)
	taxWithholdingYTD                   float64
	estimatedPaymentsYTD                float64
	ordinaryIncomeYTD                   float64
	// employmentIncomeYTD removed - unified with ordinaryIncomeYTD to prevent sync issues
	capitalGainsYTD                     float64
	capitalLossesYTD                    float64
	qualifiedDividendsYTD               float64
	ordinaryDividendsYTD                float64
	interestIncomeYTD                   float64 // Interest from cash accounts (checking, savings)
	shortTermCapitalGainsYTD            float64
	longTermCapitalGainsYTD             float64
	socialSecurityBenefitsYTD           float64
	qualifiedCharitableDistributionsYTD float64
	itemizedDeductibleInterestYTD       float64
	preTaxContributionsYTD              float64

	// PFOS-E: Additional tax profile tracking
	selfEmploymentIncomeYTD float64 // Schedule C income
	passiveIncomeYTD        float64 // Schedule E income (rental, royalties)
	taxExemptIncomeYTD      float64 // Tax-exempt income (muni bonds, etc.)

	// PFOS-E: Driver contribution tracking for sensitivity analysis
	driverContributions map[string]float64 // driverKey -> cumulative amount

	// Annual tax calculation results (populated in December)
	lastTaxCalculationResults *TaxCalculationResult
	lastRMDAmount             float64

	// MAGI history for IRMAA two-year look-back
	magiHistory map[int]float64 // Year -> MAGI

	// Unpaid tax liability (for accrual accounting)
	// Positive = we owe taxes, Negative = we're owed refund
	// Set in December, paid/received in April, then reset to 0
	unpaidTaxLiability float64

	// Monthly flow tracking for detailed UI reporting
	currentMonthFlows MonthlyFlows

	// Expense history tracking for cash reserve calculations
	expenseHistory        []float64 // Rolling window of monthly expenses
	expenseHistorySize    int       // Maximum size of expense history (6 months)
	rollingExpenseAverage float64   // Pre-calculated average for performance
	rollingExpenseSum     float64   // Running sum for O(1) average calculation

	// Active liabilities tracking
	liabilities []*LiabilityInfo

	// Advanced bankruptcy and financial stress tracking
	isBankrupt               bool
	bankruptcyMonth          int     // Month when bankruptcy occurred
	bankruptcyTrigger        string  // What caused bankruptcy (liquidity, debt_service, prolonged_stress, etc.)
	maxNetWorthDebtThreshold float64 // Maximum negative net worth before bankruptcy

	// Financial stress indicators
	financialStressLevel    int     // 0=healthy, 1=stressed, 2=distressed, 3=critical, 4=bankrupt
	monthsInFinancialStress int     // Consecutive months of financial stress
	liquidityCrisisMonths   int     // Months with insufficient liquid assets for expenses
	debtServiceRatio        float64 // Current debt payments / gross income
	emergencyFundMonths     float64 // Months of expenses covered by liquid assets

	// Enhanced debt service tracking
	debtServiceAnalysis       DebtServiceAnalysis // Comprehensive debt payment tracking
	consecutiveMissedPayments int                 // Consecutive months of missed debt payments

	// PERF: Incremental metric tracking for MC (avoids deep copy + iterate)
	minCash               float64 // Minimum cash observed during simulation
	minCashMonth          int     // Month when minimum cash occurred
	cashFloorBreachedMonth int     // Month when cash first breached floor (-1 if never)
	trackMonthlyData      bool    // Whether to store full monthly snapshots (true for deterministic, false for MC)

	// Simple bankruptcy tracking (no recovery - bankruptcy is terminal)
	// Removed recovery and timeline tracking - bankruptcy ends simulation path

	// PFOS-E: Track realized stochastic variables for "show the math" transparency
	realizedPathVariables []RealizedMonthVariables
}

// MonthlyFlows tracks financial flows for the current month
type MonthlyFlows struct {
	IncomeThisMonth                     float64
	EmploymentIncomeThisMonth           float64 // NEW: Track employment income separately
	ExpensesThisMonth                   float64
	ContributionsToInvestmentsThisMonth float64

	// Contribution breakdown by account type
	ContributionsTaxableThisMonth     float64
	ContributionsTaxDeferredThisMonth float64
	ContributionsRothThisMonth        float64
	ContributionsHSAThisMonth         float64 // HSA contributions

	DebtPaymentsPrincipalThisMonth      float64
	DebtPaymentsInterestThisMonth       float64
	RothConversionAmountThisMonth       float64
	OneTimeEventsImpactThisMonth        float64
	DivestmentProceedsThisMonth         float64 // Proceeds from forced asset sales (not income)
	RebalancingTradesNetEffectThisMonth float64
	TaxWithheldThisMonth                float64
	TaxesPaidThisMonth                  float64
	CapitalGainsTaxPaidThisMonth        float64
	DividendsReceivedThisMonth          DividendsReceived
	InterestIncomeThisMonth             float64

	// Enhanced granular income tracking
	SalaryIncomeThisMonth        float64
	BonusIncomeThisMonth         float64
	RSUIncomeThisMonth           float64
	SocialSecurityIncomeThisMonth float64 // Social Security benefits
	PensionIncomeThisMonth       float64 // Pension/annuity income
	RMDAmountThisMonth           float64 // Required Minimum Distribution amount

	// Enhanced granular expense tracking
	HousingExpensesThisMonth            float64
	TransportationExpensesThisMonth     float64
	FoodExpensesThisMonth               float64
	OtherExpensesThisMonth              float64

	// Investment growth tracking (for Trace View)
	InvestmentGrowthThisMonth float64

	// Auto-shortfall cover tracking (for Trace View attribution)
	AutoShortfallCoverThisMonth float64
}

// NewSimulationEngine creates a new simulation engine with given configuration
func NewSimulationEngine(config StochasticModelConfig) *SimulationEngine {
	simLogVerbose("🔍 [DEBUG] NewSimulationEngine started")

	simLogVerbose("🔍 [DEBUG] About to get tax config")
	taxConfig := GetDefaultTaxConfigDetailed()
	simLogVerbose("🔍 [DEBUG] Tax config obtained")

	simLogVerbose("🔍 [DEBUG] Creating state tax calculator")
	stateTaxCalculator := NewStateTaxCalculator()
	simLogVerbose("🔍 [DEBUG] State tax calculator created")

	simLogVerbose("🔍 [DEBUG] About to create tax calculator")
	taxCalculator := NewTaxCalculator(taxConfig, stateTaxCalculator)
	simLogVerbose("🔍 [DEBUG] Tax calculator created")

	simLogVerbose("🔍 [DEBUG] About to create cash manager")
	cashManager := NewCashManagerWithConfig(&config)
	simLogVerbose("🔍 [DEBUG] Cash manager created")

	simLogVerbose("🔍 [DEBUG] Creating retirement optimization modules")
	rmdCalculator := NewRMDCalculator()
	withdrawalSequencer := NewWithdrawalSequencer(cashManager, taxCalculator, rmdCalculator)
	assetLocationOptimizer := NewAssetLocationOptimizer(taxCalculator)
	rothConversionOptimizer := NewRothConversionOptimizer(taxCalculator, rmdCalculator)
	simLogVerbose("🔍 [DEBUG] Retirement optimization modules created")

	simLogVerbose("🔍 [DEBUG] Creating comprehensive financial calculators")
	contributionLimitTracker := NewContributionLimitTracker()
	socialSecurityCalc := NewSocialSecurityCalculator()
	estateTaxCalculator := NewEstateTaxCalculator()
	ltcCalculator := NewLongTermCareCalculator()
	propertyCostEscalator := NewPropertyCostEscalator()
	goalPrioritizer := NewGoalPrioritizer(2024) // Will be updated with actual start year
	taxAwareRebalancer := NewTaxAwareRebalancer(2024)
	simLogVerbose("🔍 [DEBUG] Comprehensive financial calculators created")

	simLogVerbose("🔍 [DEBUG] About to create event registry")
	eventRegistry := NewEventHandlerRegistry()
	simLogVerbose("🔍 [DEBUG] Event registry created")

	// Dynamic event tracking re-enabled - allows waterfall allocation, smart debt payment, etc.
	simLogVerbose("🔍 [DEBUG] Enabling dynamic event enhancement")
	dynamicEventTracker := NewDynamicEventTracker(true)
	simLogVerbose("🔍 [DEBUG] Dynamic event tracker created with enhancement enabled")

	simLogVerbose("🔍 [DEBUG] About to create SimulationEngine struct")
	simLogVerbose("🔍 [DEBUG] About to initialize stochastic state")
	stochasticState := InitializeStochasticState(config)
	simLogVerbose("🔍 [DEBUG] Stochastic state initialized")

	// Initialize seeded RNG if RandomSeed > 0 for deterministic stochastic simulation
	var seededRng *SeededRNG
	if config.RandomSeed > 0 {
		seededRng = NewSeededRNG(config.RandomSeed)
		simLogVerbose("🔍 [DEBUG] Seeded RNG initialized with seed %d", config.RandomSeed)
	}

	return &SimulationEngine{
		config:                              config,
		stochasticState:                     stochasticState,
		currentYear:                         -1,
		currentMonthReturns:                 nil,
		marketPrices:                        CreateDefaultMarketPrices(),
		taxCalculator:                       taxCalculator,
		cashManager:                         cashManager,
		rmdCalculator:                       rmdCalculator,
		withdrawalSequencer:                 withdrawalSequencer,
		assetLocationOptimizer:              assetLocationOptimizer,
		rothConversionOptimizer:             rothConversionOptimizer,
		contributionLimitTracker:            contributionLimitTracker,
		stateTaxCalculator:                  stateTaxCalculator,
		socialSecurityCalc:                  socialSecurityCalc,
		estateTaxCalculator:                 estateTaxCalculator,
		ltcCalculator:                       ltcCalculator,
		propertyCostEscalator:               propertyCostEscalator,
		goalPrioritizer:                     goalPrioritizer,
		taxAwareRebalancer:                  taxAwareRebalancer,
		ledger:                              NewSimpleLedger(),
		strategyProcessor:                   NewStrategyProcessor(taxCalculator, cashManager),
		eventRegistry:                       eventRegistry,
		dynamicEventTracker:                 dynamicEventTracker,
		taxWithholdingYTD:                   0,
		estimatedPaymentsYTD:                0,
		unpaidTaxLiability:                  0,
		ordinaryIncomeYTD:                   0,
		capitalGainsYTD:                     0,
		capitalLossesYTD:                    0,
		qualifiedDividendsYTD:               0,
		ordinaryDividendsYTD:                0,
		interestIncomeYTD:                   0,
		shortTermCapitalGainsYTD:            0,
		longTermCapitalGainsYTD:             0,
		socialSecurityBenefitsYTD:           0,
		qualifiedCharitableDistributionsYTD: 0,
		itemizedDeductibleInterestYTD:       0,
		preTaxContributionsYTD:              0,
		selfEmploymentIncomeYTD:             0,
		passiveIncomeYTD:                    0,
		taxExemptIncomeYTD:                  0,
		driverContributions:                 make(map[string]float64),
		magiHistory:                         make(map[int]float64),
		isBankrupt:                          false,
		bankruptcyMonth:                     -1,
		maxNetWorthDebtThreshold:            -500000, // $500K maximum negative net worth (more realistic)
		seededRng:                           seededRng,
		// PERF: Initialize incremental metric tracking for MC optimization
		minCash:                math.MaxFloat64, // Start with max, find minimum
		minCashMonth:           -1,
		cashFloorBreachedMonth: -1,              // -1 means never breached
		trackMonthlyData:       true,            // Default to true (safe); set false for MC
		// Initialize expense history tracking
		expenseHistorySize:    6, // Track 6 months of expenses
		expenseHistory:        make([]float64, 0, 6),
		rollingExpenseAverage: 0.0,
		rollingExpenseSum:     0.0,
	}
}

// ResetSimulationState resets the simulation state for a new Monte Carlo path
func (se *SimulationEngine) ResetSimulationState() {
	se.currentMonthReturns = nil
	se.stochasticState = InitializeStochasticState(se.config)
	se.cashManager = NewCashManagerWithConfig(&se.config)

	// Reset seeded RNG if configured for deterministic simulation
	if se.config.RandomSeed > 0 {
		se.seededRng = NewSeededRNG(se.config.RandomSeed)
	} else {
		se.seededRng = nil
	}
	se.ledger = NewSimpleLedger()
	se.strategyProcessor = NewStrategyProcessor(se.taxCalculator, se.cashManager)

	// Recreate event registry with dynamic event tracking
	eventRegistry := NewEventHandlerRegistry()
	// Dynamic event tracking re-enabled for full functionality
	se.dynamicEventTracker = NewDynamicEventTracker(true)
	se.eventRegistry = eventRegistry
	se.taxWithholdingYTD = 0
	se.estimatedPaymentsYTD = 0
	se.unpaidTaxLiability = 0
	se.ordinaryIncomeYTD = 0
	se.capitalGainsYTD = 0
	se.capitalLossesYTD = 0
	se.qualifiedDividendsYTD = 0
	se.ordinaryDividendsYTD = 0
	se.interestIncomeYTD = 0
	se.shortTermCapitalGainsYTD = 0
	se.longTermCapitalGainsYTD = 0
	se.socialSecurityBenefitsYTD = 0
	se.qualifiedCharitableDistributionsYTD = 0
	se.itemizedDeductibleInterestYTD = 0
	se.preTaxContributionsYTD = 0
	se.selfEmploymentIncomeYTD = 0
	se.passiveIncomeYTD = 0
	se.taxExemptIncomeYTD = 0
	se.driverContributions = make(map[string]float64)
	se.magiHistory = make(map[int]float64)
	se.liabilities = make([]*LiabilityInfo, 0)
	se.isBankrupt = false
	se.bankruptcyMonth = -1

	// Initialize expense history tracking for cash reserve calculations
	se.expenseHistorySize = 6 // Track 6 months of expenses
	se.expenseHistory = make([]float64, 0, se.expenseHistorySize)
	se.rollingExpenseAverage = 0.0
	se.rollingExpenseSum = 0.0

	// PERF: Reset incremental metric tracking for new MC path
	se.minCash = math.MaxFloat64
	se.minCashMonth = -1
	se.cashFloorBreachedMonth = -1
	// Note: trackMonthlyData is NOT reset here - it persists across paths

	se.ResetMarketPrices() // Reset market prices for new simulation path
	se.resetMonthlyFlows()

	// Reset realized path variables for stochastic transparency
	se.realizedPathVariables = make([]RealizedMonthVariables, 0)
}

// resetMonthlyFlows resets the monthly flow tracking for a new month
func (se *SimulationEngine) resetMonthlyFlows() {
	se.currentMonthFlows = MonthlyFlows{
		IncomeThisMonth:                     0,
		EmploymentIncomeThisMonth:           0, // NEW: Initialize employment income tracking
		ExpensesThisMonth:                   0,
		ContributionsToInvestmentsThisMonth: 0,
		DebtPaymentsPrincipalThisMonth:      0,
		DebtPaymentsInterestThisMonth:       0,
		RothConversionAmountThisMonth:       0,
		OneTimeEventsImpactThisMonth:        0,
		DivestmentProceedsThisMonth:         0,
		RebalancingTradesNetEffectThisMonth: 0,
		TaxWithheldThisMonth:                0,
		TaxesPaidThisMonth:                  0,
		CapitalGainsTaxPaidThisMonth:        0,
		DividendsReceivedThisMonth:          DividendsReceived{Qualified: 0, Ordinary: 0},
		InterestIncomeThisMonth:             0,

		// Enhanced granular income tracking
		SalaryIncomeThisMonth:               0,
		BonusIncomeThisMonth:                0,
		RSUIncomeThisMonth:                  0,

		// Enhanced granular expense tracking
		HousingExpensesThisMonth:            0,
		TransportationExpensesThisMonth:     0,
		FoodExpensesThisMonth:               0,
		OtherExpensesThisMonth:              0,
	}
}

// updateExpenseHistory updates the rolling expense history with current month's expenses
// This is called at the end of each month before resetMonthlyFlows()
// PERF: Optimized to O(1) by maintaining running sum instead of recalculating each month
func (se *SimulationEngine) updateExpenseHistory() {
	monthlyExpenses := se.currentMonthFlows.ExpensesThisMonth

	// If we're at capacity, remove oldest expense from running sum
	if len(se.expenseHistory) >= se.expenseHistorySize {
		oldestExpense := se.expenseHistory[0]
		se.rollingExpenseSum -= oldestExpense
		se.expenseHistory = se.expenseHistory[1:]
	}

	// Add current month's expenses to history and running sum
	se.expenseHistory = append(se.expenseHistory, monthlyExpenses)
	se.rollingExpenseSum += monthlyExpenses

	// Calculate average from running sum (O(1) instead of O(n))
	if len(se.expenseHistory) > 0 {
		se.rollingExpenseAverage = se.rollingExpenseSum / float64(len(se.expenseHistory))
	} else {
		se.rollingExpenseAverage = 0.0
	}

	simLogVerbose("💰 [EXPENSE-HISTORY] Updated expense history: historySize=%d, average=$%.2f, current=$%.2f",
		len(se.expenseHistory), se.rollingExpenseAverage, monthlyExpenses)
}

// getEstimatedMonthlyExpenses returns the best estimate of monthly expenses for cash reserve calculations
// Priority: rolling average > current month > default
func (se *SimulationEngine) getEstimatedMonthlyExpenses() float64 {
	// Use rolling average if we have enough history (at least 3 months)
	if len(se.expenseHistory) >= 3 && se.rollingExpenseAverage > 0 {
		simLogVerbose("💰 [EXPENSE-ESTIMATE] Using rolling average: $%.2f (%d months)",
			se.rollingExpenseAverage, len(se.expenseHistory))
		return se.rollingExpenseAverage
	}

	// Fall back to current month if available
	if se.currentMonthFlows.ExpensesThisMonth > 0 {
		simLogVerbose("💰 [EXPENSE-ESTIMATE] Using current month: $%.2f", se.currentMonthFlows.ExpensesThisMonth)
		return se.currentMonthFlows.ExpensesThisMonth
	}

	// Last resort: use default from configuration
	defaultExpenses := GetDefaultMonthlyExpenses()
	simLogVerbose("💰 [EXPENSE-ESTIMATE] Using default: $%.2f", defaultExpenses)
	return defaultExpenses
}

// GetCurrentMarketPrices returns the current market prices per share
func (se *SimulationEngine) GetCurrentMarketPrices() *MarketPrices {
	return &se.marketPrices
}

// UpdateMarketPrices updates the market prices based on monthly returns
func (se *SimulationEngine) UpdateMarketPrices(monthlyReturns StochasticReturns) {
	// Apply monthly returns to each asset class price
	se.marketPrices.SPY *= (1 + monthlyReturns.SPY)
	se.marketPrices.BND *= (1 + monthlyReturns.BND)
	se.marketPrices.INTL *= (1 + monthlyReturns.Intl)          // Use Intl field
	se.marketPrices.RealEstate *= (1 + monthlyReturns.Home)    // Use Home field for real estate
	se.marketPrices.Individual *= (1 + monthlyReturns.SPY)     // Use SPY return for individual stocks
	// Cash always remains at 1.0
	se.marketPrices.Cash = 1.0
	se.marketPrices.Other *= (1 + monthlyReturns.SPY)          // Use SPY return for other assets
}

// ResetMarketPrices resets market prices to their initial values for a new simulation path
func (se *SimulationEngine) ResetMarketPrices() {
	se.marketPrices = CreateDefaultMarketPrices()
}

// GetPricePerShare returns the current market price per share for the given asset class
func (se *SimulationEngine) GetPricePerShare(assetClass AssetClass) float64 {
	// Normalize asset class to handle UI naming variations
	normalized := NormalizeAssetClass(assetClass)

	switch normalized {
	case AssetClassUSStocksTotalMarket:
		return se.marketPrices.SPY
	case AssetClassUSBondsTotalMarket:
		return se.marketPrices.BND
	case AssetClassInternationalStocks:
		return se.marketPrices.INTL
	case AssetClassRealEstatePrimaryHome:
		return se.marketPrices.RealEstate
	case AssetClassIndividualStock:
		return se.marketPrices.Individual
	case AssetClassCash:
		return se.marketPrices.Cash // Always 1.0
	case AssetClassOtherAssets:
		return se.marketPrices.Other
	default:
		simLogVerbose("⚠️ [PRICE-LOOKUP] Unknown asset class '%s' - returning fallback $1.00", normalized)
		return 1.0 // Fallback to $1 per share for unknown asset classes
	}
}



// validateNoLegacyHoldings checks all accounts for legacy dollar-based holdings and returns error if found
// PHASE 1.2: Force early termination if any legacy holdings are detected
func (se *SimulationEngine) validateNoLegacyHoldings(accounts AccountHoldingsMonthEnd) error {
	accountsToCheck := []*Account{
		accounts.Taxable,
		accounts.TaxDeferred,
		accounts.Roth,
		accounts.FiveTwoNine,
		accounts.HSA,
		accounts.Checking,
		accounts.Savings,
	}

	accountNames := []string{"Taxable", "TaxDeferred", "Roth", "529", "HSA", "Checking", "Savings"}

	for accountIndex, account := range accountsToCheck {
		if account == nil {
			continue
		}

		// CRITICAL FIX: Check for nil Holdings to prevent panic
		if account.Holdings == nil {
			continue
		}

		for holdingIndex, holding := range account.Holdings {
			if isLegacyHolding(&holding) {
				return fmt.Errorf("CRITICAL: Legacy dollar-based holding detected in %s account (holding %d): %s with Quantity=%.6f, CostBasisPerUnit=%.2f. Engine requires share-based accounting with realistic share quantities and cost basis per share",
					accountNames[accountIndex], holdingIndex, holding.AssetClass, holding.Quantity, holding.CostBasisPerUnit)
			}

			// Also check individual tax lots
			for lotIndex, lot := range holding.Lots {
				if isLegacyTaxLot(&lot) {
					return fmt.Errorf("CRITICAL: Legacy tax lot detected in %s account, holding %d, lot %d: Quantity=%.6f, CostBasisPerUnit=%.2f. All tax lots must use proper share-based model",
						accountNames[accountIndex], holdingIndex, lotIndex, lot.Quantity, lot.CostBasisPerUnit)
				}
			}
		}
	}

	return nil
}



// validateNoLegacyHoldings checks all accounts for legacy dollar-based holdings and returns error if found
// CRITICAL: Enforces strict share-based accounting - rejects any legacy data format
// Helper functions moved from deleted migration code for validation use only

// isLegacyHolding detects if a holding uses the old dollar-based model
// CRITICAL: Legacy holdings have quantity ≈ 1.0 with high CostBasisPerUnit
// This pattern indicates the old incorrect model where holdings were stored as dollar amounts
func isLegacyHolding(holding *Holding) bool {
	// Skip cash - it legitimately has $1 per unit
	if holding.AssetClass == AssetClassCash {
		return false
	}

	// Check for the telltale sign: Quantity = 1.0 and high cost basis per unit
	// This indicates the old model where "$10,000" was stored as Quantity=1.0, CostBasisPerUnit=10000.0
	if holding.Quantity == 1.0 && holding.CostBasisPerUnit > 10.0 {
		return true
	}

	// Additional check for very small quantities with very large cost basis
	// Sometimes legacy holdings have Quantity = 0.5 with CostBasisPerUnit = $20,000, etc.
	if holding.Quantity < 5.0 && holding.CostBasisPerUnit > 100.0 {
		return true
	}

	return false
}

// isLegacyTaxLot detects if a tax lot uses the old dollar-based model
func isLegacyTaxLot(lot *TaxLot) bool {
	// Skip cash - it legitimately has $1 per unit
	if lot.AssetClass == AssetClassCash {
		return false
	}

	// Same detection logic as holdings: Quantity = 1.0 and high cost basis per unit
	if lot.Quantity == 1.0 && lot.CostBasisPerUnit > 10.0 {
		return true
	}

	// Also check for quantities very close to 1.0 with suspiciously high cost basis
	if lot.Quantity > 0.99 && lot.Quantity < 1.01 && lot.CostBasisPerUnit > 100.0 {
		return true
	}

	return false
}


// createInitialHoldingsViaCashManager creates holdings properly through CashManager to ensure tax lot integrity
// This prevents the critical bug where holdings are created without tax lots and get zeroed by recalculateHoldingFromLots
func (se *SimulationEngine) createInitialHoldingsViaCashManager(accounts *AccountHoldingsMonthEnd, parsedAccounts AccountHoldingsMonthEnd) error {
	// Process each account type that might have holdings
	accountConfigs := []struct {
		name string
		targetAccount *Account
		sourceAccount *Account
		accountType string
	}{
		{"Taxable", accounts.Taxable, parsedAccounts.Taxable, "taxable"},
		{"TaxDeferred", accounts.TaxDeferred, parsedAccounts.TaxDeferred, "tax_deferred"},
		{"Roth", accounts.Roth, parsedAccounts.Roth, "roth"},
		{"FiveTwoNine", accounts.FiveTwoNine, parsedAccounts.FiveTwoNine, "529"},
	}

	for _, config := range accountConfigs {
		if config.sourceAccount == nil || len(config.sourceAccount.Holdings) == 0 {
			continue // Skip empty accounts
		}

		simLogVerbose("🔨 [HOLDINGS-CREATION] Processing %s account with %d holdings",
			config.name, len(config.sourceAccount.Holdings))

		// Extract each holding from the source account and create it properly
		for i, sourceHolding := range config.sourceAccount.Holdings {
			if sourceHolding.Quantity <= 0 {
				continue // Skip zero-quantity holdings
			}

			// Calculate purchase date (use simulation start as approximation)
			// For initial holdings, we approximate the purchase as 1 month before simulation start
			purchaseMonthOffset := -1

			// Convert share-based holding to dollar amount for CashManager
			// CashManager.AddHoldingWithLotTracking expects dollar amount, not shares
			dollarAmount := sourceHolding.CostBasisTotal

			// Create the holding properly through CashManager
			// This ensures proper tax lots are created and FIFO integrity is maintained
			err := se.cashManager.AddHoldingWithLotTracking(
				config.targetAccount,
				sourceHolding.AssetClass,
				dollarAmount,
				purchaseMonthOffset,
			)

			if err != nil {
				return fmt.Errorf("failed to create holding %d in %s account: %v", i, config.name, err)
			}

			simLogVerbose("✅ [HOLDING-CREATED] %s[%d]: %s, %.6f shares @ $%.4f = $%.2f",
				config.name, i, sourceHolding.AssetClass, sourceHolding.Quantity,
				sourceHolding.CostBasisPerUnit, sourceHolding.CostBasisTotal)
		}
	}

	// Verify holdings were created correctly by checking tax lots
	for _, config := range accountConfigs {
		if config.targetAccount == nil {
			continue
		}

		for i, holding := range config.targetAccount.Holdings {
			if config.accountType == "taxable" && len(holding.Lots) == 0 && holding.Quantity > 0 {
				return fmt.Errorf("CRITICAL: %s holding[%d] created without tax lots - this would cause data corruption", config.name, i)
			}
		}
	}

	return nil
}

// ApplyMarketGrowth applies market growth to all account holdings for the current month with enhanced validation
func (se *SimulationEngine) ApplyMarketGrowth(accounts *AccountHoldingsMonthEnd, currentMonthOffset int) error {
	// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG {
		_ = fmt.Sprintf("GROWTH FUNCTION ENTRY: Called ApplyMarketGrowth for month %d\n", currentMonthOffset)
	}
	if accounts == nil {
		return fmt.Errorf("accounts cannot be nil")
	}

	// Track total invested value BEFORE applying growth (for Trace View)
	investedBefore := 0.0
	if accounts.Taxable != nil {
		investedBefore += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		investedBefore += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		investedBefore += accounts.Roth.TotalValue
	}
	if accounts.HSA != nil {
		investedBefore += accounts.HSA.TotalValue
	}
	if accounts.FiveTwoNine != nil {
		investedBefore += accounts.FiveTwoNine.TotalValue
	}

	simulationYear := currentMonthOffset / 12

	// CRITICAL FIX: Use historical returns for backtesting instead of stochastic generation
	var monthlyReturns StochasticReturns

	// Check if we have historical returns for this specific month (true backtesting)
	if se.backtestReturns != nil {
		if historicalReturns, exists := se.backtestReturns[currentMonthOffset]; exists {
			monthlyReturns = historicalReturns
			// Skip stochastic generation entirely for historical backtesting
		} else {
			return fmt.Errorf("missing historical returns for month %d in backtest mode", currentMonthOffset)
		}
	} else {
		// Standard stochastic simulation (not backtesting)
		// Generate new annual returns if we've moved to a new year
		if se.currentYear != simulationYear || se.currentMonthReturns == nil {
			// Use seeded RNG if available for deterministic simulation
			returns, newState, err := GenerateAdvancedStochasticReturnsSeeded(se.stochasticState, se.config, se.seededRng)
			if err != nil {
				return fmt.Errorf("failed to generate stochastic returns: %v", err)
			}

			se.currentMonthReturns = &returns
			se.stochasticState = newState
			se.currentYear = simulationYear
		}

		if se.currentMonthReturns == nil {
			return fmt.Errorf("annual returns not initialized")
		}

		monthlyReturns = *se.currentMonthReturns
	}

	// Update market prices based on current month's returns
	se.UpdateMarketPrices(monthlyReturns)

	// Update CashManager's market prices to stay in sync
	se.cashManager.UpdateMarketPrices(se.GetCurrentMarketPrices())

	// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG && currentMonthOffset < 36 { // Only log first 3 years to avoid spam
		_ = fmt.Sprintf("🔍 [MONTHLY-RETURNS] Month %d: SPY=%.4f%%, BND=%.4f%%, Inflation=%.4f%%\n",
			currentMonthOffset, monthlyReturns.SPY*100, monthlyReturns.BND*100, monthlyReturns.Inflation*100)
	}

	// Apply growth to all investment account types
	accountTypes := []*Account{GetTaxableAccount(accounts), GetTaxDeferredAccount(accounts), GetRothAccount(accounts), GetFiveTwoNineAccount(accounts), GetHSAAccount(accounts)}
	accountNames := []string{"taxable", "tax_deferred", "roth", "529", "hsa"}

	for i, account := range accountTypes {
		if account == nil {
			continue
		}

		totalValue := 0.0
		_ = account.TotalValue // Old value for debugging if needed

		// CRITICAL FIX: Enforce that accounts with value MUST have holdings
		// This eliminates the placeholder logic that grew TotalValue without actual assets
		if len(account.Holdings) == 0 && account.TotalValue > 0 {
			debugErrorf("[CRITICAL] Account %s has value $%.2f but no holdings - this is an initialization error",
				accountNames[i], account.TotalValue)
			// Reset the invalid state
			account.TotalValue = 0
			continue // Skip the holdings loop since there are none
		}

		// Apply growth to each holding using centralized market prices
		// PERF: LiteMode skips tax lot recalculation for speed
		if se.config.LiteMode {
			// Fast path: Just update prices and values directly (no lot iteration)
			for j := range account.Holdings {
				holding := &account.Holdings[j]
				currentMarketPrice := se.GetPricePerShare(holding.AssetClass)
				holding.CurrentMarketPricePerUnit = currentMarketPrice
				holding.CurrentMarketValueTotal = holding.Quantity * currentMarketPrice
				totalValue += holding.CurrentMarketValueTotal
			}
		} else {
			// Full path: Recalculate from tax lots for accurate cost basis tracking
			for j := range account.Holdings {
				holding := &account.Holdings[j]

				// Get current market price from centralized system
				currentMarketPrice := se.GetPricePerShare(holding.AssetClass)
				oldValue := holding.CurrentMarketValueTotal

				// CRITICAL FIX: Update the holding's price and recalculate from tax lots
				// This ensures tax lot integrity is maintained
				holding.CurrentMarketPricePerUnit = currentMarketPrice

				// Recalculate all holding aggregates from the tax lots using the new price
				// This maintains the integrity of the share-based accounting model
				se.cashManager.recalculateHoldingFromLots(holding)

				// Debug exponential growth bug to JavaScript console
				if currentMonthOffset < 24 && oldValue > 0 && holding.CurrentMarketValueTotal > oldValue*5 {
					debugErrorf("[WASM-ERROR] EXPONENTIAL BUG: holding grew %.1fx in month %d ($%.0f → $%.0f)",
						holding.CurrentMarketValueTotal/oldValue, currentMonthOffset, oldValue, holding.CurrentMarketValueTotal)
				}

				totalValue += holding.CurrentMarketValueTotal

				// DEBUG: Log value changes for first few months to verify price sync
				if currentMonthOffset < 12 && j == 0 && i == 0 {
					simLogVerbose("🔍 [PRICE-SYNC] Month %d, %s[%d]: price=%.6f, quantity=%.6f, value=%.2f",
						currentMonthOffset, accountNames[i], j, currentMarketPrice, holding.Quantity, holding.CurrentMarketValueTotal)
				}
			}
		}

		// Only update TotalValue from holdings if we have holdings
		if len(account.Holdings) > 0 {
			account.TotalValue = totalValue
		}
		// If no holdings, TotalValue was already updated above or preserved

		// DEBUG: Log account total value changes
		// if currentMonthOffset < 24 && len(account.Holdings) > 0 {
		// 		currentMonthOffset, accountNames[i], oldTotalValue, totalValue, totalValue-oldTotalValue)
		// }

		// Update the account in the accounts struct
		switch accountNames[i] {
		case "taxable":
			accounts.Taxable = account
		case "tax_deferred":
			accounts.TaxDeferred = account
		case "roth":
			accounts.Roth = account
		}
	}

	// Apply growth to cash holdings based on inflation
	monthlyCashGrowthRate := monthlyReturns.Inflation * 0.3 // Cash tracks 30% of inflation
	accounts.Cash *= (1 + monthlyCashGrowthRate)

	// Generate dividend income from holdings
	se.generateDividendIncome(accounts, currentMonthOffset, &se.config)

	// Track total invested value AFTER applying growth (for Trace View)
	investedAfter := 0.0
	if accounts.Taxable != nil {
		investedAfter += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		investedAfter += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		investedAfter += accounts.Roth.TotalValue
	}
	if accounts.HSA != nil {
		investedAfter += accounts.HSA.TotalValue
	}
	if accounts.FiveTwoNine != nil {
		investedAfter += accounts.FiveTwoNine.TotalValue
	}

	// Record investment growth for Trace View
	se.currentMonthFlows.InvestmentGrowthThisMonth = investedAfter - investedBefore

	// Capture realized stochastic variables for "show the math" transparency
	if se.simulationInput != nil {
		se.captureRealizedVariables(currentMonthOffset, se.simulationInput.StartYear, *accounts)
	}

	return nil
}

// generateDividendIncome generates dividend income from holdings and processes for tax purposes
func (se *SimulationEngine) generateDividendIncome(accounts *AccountHoldingsMonthEnd, currentMonthOffset int, config *StochasticModelConfig) {
	// CRITICAL: Return early if dividends are disabled
	if !config.EnableDividends {
		return
	}
	// DEBUG: Track dividend generation in retirement years
	simulationYear := currentMonthOffset/12 + 2025
	isRetirementYear := simulationYear >= 2031 // Retirement starts when employment ends in 2031
	cashBeforeDividends := accounts.Cash

	// Only generate dividends for taxable accounts (tax-advantaged accounts don't generate taxable dividends)
	if accounts.Taxable == nil {
		return
	}

	totalDividendIncome := 0.0

	// Generate dividends from each holding in taxable account (conditional on asset class configuration)
	taxableAccount := GetTaxableAccount(accounts)
	if taxableAccount != nil {
		for _, holding := range taxableAccount.Holdings {
			// REAL DATA: Use comprehensive dividend model with realistic timing and yields
			assetClassStr := string(holding.AssetClass)
			currentMonth := (currentMonthOffset % 12) + 1
			annualDividendYield := GetLegacyDividendYield(assetClassStr) // Use legacy function for backward compatibility
			qualifiedPercentage := GetQualifiedDividendPercentage(assetClassStr)

			// Apply realistic dividend timing (quarterly, monthly, semiannual)
			paymentMultiplier := GetDividendPaymentTiming(assetClassStr, currentMonth)

			// Calculate dividend payment for this period using discrete timing
			// CRITICAL FIX: Use proper discrete quarterly/monthly calculations instead of smoothing
			var monthlyDividend float64
			if paymentMultiplier > 0 {
				// Calculate the actual payment amount based on payment frequency
				if paymentMultiplier == 1.0 {
					// Monthly payments (e.g., bonds)
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 12)
				} else if paymentMultiplier == 3.0 {
					// Quarterly payments (most stocks) - pay full quarterly amount
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 4)
				} else if paymentMultiplier == 6.0 {
					// Semiannual payments - pay full semiannual amount
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 2)
				} else {
					// Fallback for custom frequencies
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 12) * paymentMultiplier
				}
			} else {
				// No payment this month
				monthlyDividend = 0.0
			}

			if monthlyDividend > 0 {
				// Add dividend to cash
				accounts.Cash += monthlyDividend
				totalDividendIncome += monthlyDividend

				// REAL DATA: Use sophisticated tax treatment based on asset class and income levels
				qualifiedAmount := monthlyDividend * qualifiedPercentage
				ordinaryAmount := monthlyDividend * (1.0 - qualifiedPercentage)

				// Calculate appropriate withholding rates based on income and asset class
				estimatedIncome := se.ordinaryIncomeYTD + se.capitalGainsYTD // Rough current year income estimate
				filingStatus := FilingStatusSingle // Would need actual filing status from simulation input

				// Process qualified dividends
				if qualifiedAmount > 0 {
					qualifiedWithholdingRate := GetDividendWithholdingRate(assetClassStr, true, estimatedIncome, filingStatus)
					qualifiedWithholding := qualifiedAmount * qualifiedWithholdingRate
					se.currentMonthFlows.DividendsReceivedThisMonth.Qualified += qualifiedAmount
					se.currentMonthFlows.TaxWithheldThisMonth += qualifiedWithholding
					accounts.Cash -= qualifiedWithholding
					se.ProcessIncome(qualifiedAmount, true, qualifiedWithholding)
				}

				// Process ordinary dividends
				if ordinaryAmount > 0 {
					ordinaryWithholdingRate := GetDividendWithholdingRate(assetClassStr, false, estimatedIncome, filingStatus)
					ordinaryWithholding := ordinaryAmount * ordinaryWithholdingRate
					se.currentMonthFlows.DividendsReceivedThisMonth.Ordinary += ordinaryAmount
					se.currentMonthFlows.TaxWithheldThisMonth += ordinaryWithholding
					accounts.Cash -= ordinaryWithholding
					se.ProcessIncome(ordinaryAmount, false, ordinaryWithholding)
				}
			}
		}
	}

	// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG && isRetirementYear && totalDividendIncome > 0 {
		monthInYear := currentMonthOffset%12 + 1
		_ = fmt.Sprintf("💰 [DIVIDEND-INCOME] Year %d Month %d - Generated $%.2f dividends (Cash: $%.2f → $%.2f)\n",
			simulationYear, monthInYear, totalDividendIncome, cashBeforeDividends, accounts.Cash)
	}
}

// calculateProjectedDividendIncome calculates dividend income without adding it to cash
// This is used for cash shortfall analysis before dividends mask the problem
func (se *SimulationEngine) calculateProjectedDividendIncome(accounts *AccountHoldingsMonthEnd, currentMonthOffset int) float64 {
	// Only generate dividends for taxable accounts (tax-advantaged accounts don't generate taxable dividends)
	if accounts.Taxable == nil {
		return 0.0
	}

	totalDividendIncome := 0.0
	taxableAccount := GetTaxableAccount(accounts)
	if taxableAccount != nil {
		for _, holding := range taxableAccount.Holdings {
			// CONSISTENCY FIX: Use the same dividend configuration source as main dividend function
			assetClassStr := string(holding.AssetClass)
			currentMonth := (currentMonthOffset % 12) + 1
			annualDividendYield := GetLegacyDividendYield(assetClassStr) // Use legacy function for backward compatibility

			// Calculate discrete dividend payment based on asset class timing
			// CRITICAL FIX: Use proper dividend timing instead of smoothed monthly payments
			paymentMultiplier := GetDividendPaymentTiming(assetClassStr, currentMonth)

			var monthlyDividend float64
			if paymentMultiplier > 0 {
				// Calculate the actual payment amount based on payment frequency
				if paymentMultiplier == 1.0 {
					// Monthly payments (e.g., bonds)
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 12)
				} else if paymentMultiplier == 3.0 {
					// Quarterly payments (most stocks) - pay full quarterly amount
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 4)
				} else if paymentMultiplier == 6.0 {
					// Semiannual payments - pay full semiannual amount
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 2)
				} else {
					// Fallback for custom frequencies
					monthlyDividend = holding.CurrentMarketValueTotal * (annualDividendYield / 12) * paymentMultiplier
				}
			} else {
				// No payment this month
				monthlyDividend = 0.0
			}

			if monthlyDividend > 0 {
				totalDividendIncome += monthlyDividend
			}
		}
	}

	return totalDividendIncome
}

// calculateMonthlyExpenses estimates monthly expenses from recurring expense events
func (se *SimulationEngine) calculateMonthlyExpenses(input SimulationInput, currentMonth int) float64 {
	monthlyExpenses := 0.0

	// Sum up recurring monthly expenses to estimate cost of living
	for _, event := range input.Events {
		if event.Type == "EXPENSE" && event.Frequency == "monthly" {
			// Add all monthly expenses (rent, utilities, food, etc.)
			monthlyExpenses += event.Amount
		} else if event.Type == "EXPENSE" && event.Frequency == "annual" {
			// Convert annual expenses to monthly equivalent
			monthlyExpenses += event.Amount / 12
		}
	}

	// Add default baseline if no expenses detected (to avoid $0 emergency fund)
	if monthlyExpenses < 1000 {
		monthlyExpenses = 3000 // Default $3k/month if no explicit expenses
	}

	return monthlyExpenses
}

// autoInvestSurplusCash automatically invests surplus cash in a diversified portfolio
func (se *SimulationEngine) autoInvestSurplusCash(accounts *AccountHoldingsMonthEnd, investableAmount float64, monthOffset int) {
	if investableAmount <= 0 {
		return
	}

	// Deduct cash from accounts
	accounts.Cash -= investableAmount

	// Ensure taxable account exists
	if accounts.Taxable == nil {
		accounts.Taxable = &Account{
			Holdings:   []Holding{},
			TotalValue: 0.0,
		}
	}

	// Get or create the taxable account
	taxableAccount := GetTaxableAccount(accounts)
	if taxableAccount == nil {
		return
	}

	// Create diversified portfolio allocation (age-based glide path)
	currentYear := monthOffset/12 + 2025
	age := currentYear - 1985                                              // Assume born in 1985 (40 in 2025)
	stockAllocation := math.Max(0.4, math.Min(0.9, 1.1-float64(age)*0.01)) // 110-age rule, capped 40-90%
	bondAllocation := 1.0 - stockAllocation

	// Split stocks: 70% US Total Market, 30% International
	usStockAmount := investableAmount * stockAllocation * 0.70
	intlStockAmount := investableAmount * stockAllocation * 0.30
	bondAmount := investableAmount * bondAllocation

	// CRITICAL FIX: Use proper CashManager to add holdings with tax lot tracking
	if usStockAmount > 0 {
		err := se.cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassUSStocksTotalMarket, usStockAmount, monthOffset)
		if err != nil {
			debugErrorf("Failed to add US stock holding: %v", err)
		}
	}
	if intlStockAmount > 0 {
		err := se.cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassInternationalStocks, intlStockAmount, monthOffset)
		if err != nil {
			debugErrorf("Failed to add international stock holding: %v", err)
		}
	}
	if bondAmount > 0 {
		err := se.cashManager.AddHoldingWithLotTracking(taxableAccount, AssetClassUSBondsTotalMarket, bondAmount, monthOffset)
		if err != nil {
			debugErrorf("Failed to add bond holding: %v", err)
		}
	}

	// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG {
		_ = fmt.Sprintf("💼 [ALLOCATION] Age %d - Stocks: %.1f%% ($%.0f US + $%.0f Intl), Bonds: %.1f%% ($%.0f)\n",
			age, stockAllocation*100, usStockAmount, intlStockAmount, bondAllocation*100, bondAmount)
	}
}


// deepCopyAccounts creates a deep copy of AccountHoldingsMonthEnd to avoid reference issues
func (se *SimulationEngine) deepCopyAccounts(original AccountHoldingsMonthEnd) AccountHoldingsMonthEnd {
	copy := AccountHoldingsMonthEnd{
		Cash: original.Cash,
	}

	// Deep copy Taxable account - always initialize even if original is nil
	if originalTaxable := GetTaxableAccount(&original); originalTaxable != nil {
		newTaxable := &Account{
			TotalValue: originalTaxable.TotalValue,
			Holdings:   make([]Holding, len(originalTaxable.Holdings)),
		}
		for i, holding := range originalTaxable.Holdings {
			newTaxable.Holdings[i] = holding // Holdings are value types, so this is a deep copy
		}
		copy.Taxable = newTaxable
	} else {
		// Initialize empty account to avoid nil pointer in JSON serialization
		copy.Taxable = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0, 10), // Pre-allocate capacity for typical holdings
		}
	}

	// Deep copy TaxDeferred account - always initialize even if original is nil
	if originalTaxDeferred := GetTaxDeferredAccount(&original); originalTaxDeferred != nil {
		newTaxDeferred := &Account{
			TotalValue: originalTaxDeferred.TotalValue,
			Holdings:   make([]Holding, len(originalTaxDeferred.Holdings)),
		}
		for i, holding := range originalTaxDeferred.Holdings {
			newTaxDeferred.Holdings[i] = holding
		}
		copy.TaxDeferred = newTaxDeferred
	} else {
		// Initialize empty account to avoid nil pointer in JSON serialization
		copy.TaxDeferred = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0, 10), // Pre-allocate capacity for typical holdings
		}
	}

	// Deep copy Roth account - always initialize even if original is nil
	if originalRoth := GetRothAccount(&original); originalRoth != nil {
		newRoth := &Account{
			TotalValue: originalRoth.TotalValue,
			Holdings:   make([]Holding, len(originalRoth.Holdings)),
		}
		for i, holding := range originalRoth.Holdings {
			newRoth.Holdings[i] = holding
		}
		copy.Roth = newRoth
	} else {
		// Initialize empty account to avoid nil pointer in JSON serialization
		copy.Roth = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0, 10), // Pre-allocate capacity for typical holdings
		}
	}

	return copy
}

// getAssetClassReturn returns the appropriate monthly return for an asset class
func (se *SimulationEngine) getAssetClassReturn(assetClass AssetClass, returns StochasticReturns) float64 {
	switch assetClass {
	case AssetClassUSStocksTotalMarket:
		return returns.SPY
	case AssetClassUSBondsTotalMarket:
		return returns.BND
	case AssetClassInternationalStocks:
		return returns.Intl
	case AssetClassRealEstatePrimaryHome:
		return returns.Home
	case AssetClassLeveragedSPY:
		// Leveraged ETF return: (LeverageFactor * SPY_Return) - Costs
		leverageFactor := 2.0
		monthlyCostLeveragedETF := AnnualToMonthlyRate(se.config.CostLeveragedETF)
		return (leverageFactor * returns.SPY) - monthlyCostLeveragedETF
	case AssetClassOtherAssets:
		// REAL DATA: Other/Alternative assets use actual historical asset class weights
		// Replaces previous 60/40 approximation with configurable real-world allocations
		weights := GetAlternativeAssetWeights("balanced")
		weightedReturn := 0.0
		weightedReturn += returns.SPY * weights["spy"]
		weightedReturn += returns.BND * weights["bnd"]
		weightedReturn += returns.Intl * weights["intl"]
		// Note: RealEstate and Commodities would need to be added to StochasticReturns
		// For now, approximate with available assets
		return weightedReturn
	case AssetClassIndividualStock:
		// REAL DATA: Individual stocks use empirical risk premiums and concentration penalties
		// Replaces simple volatility factor with research-based risk adjustments
		riskPremium := GetIndividualStockRiskPremium()
		monthlyVolFactor := AnnualToMonthlyVolatility(se.config.VolatilitySPY)

		// Apply research-based risk premium (typically negative due to concentration risk)
		return returns.SPY + AnnualToMonthlyRate(riskPremium) + monthlyVolFactor
	case AssetClassCash:
		// REAL DATA: Cash returns use actual interest rate correlations with inflation
		// Replaces arbitrary 30% factor with empirical correlation data
		return AnnualToMonthlyRate(GetCashReturn(AnnualToMonthlyRate(returns.Inflation) * 12))
	default:
		return 0.0
	}
}

// RunSingleSimulation runs a single Monte Carlo simulation path
func (se *SimulationEngine) RunSingleSimulation(input SimulationInput) SimulationResult {
	simLogVerbose("🔥 WASM VERSION: 2025-10-03-18:00 INCOME-MONTHLY-FIX 🔥")
	simLogVerbose("RunSingleSimulation started")

	// PERF: Pre-compute Cholesky matrix and monthly parameters once per simulation
	if se.config.LiteMode {
		if err := PrecomputeConfigParameters(&se.config); err != nil {
			simLogVerbose("⚠️ [PERF] Failed to precompute config: %v", err)
			// Non-fatal - fallback to computing on the fly
		}
	}

	// BANKRUPTCY DEBUG: Log starting configuration
	simLogVerbose("💰 [BANKRUPTCY-DEBUG] STARTING CONFIG: InitialCash=$%.2f, MonthsToRun=%d",
		input.InitialAccounts.Cash, input.MonthsToRun)

	// Store simulation input for access to strategies
	se.simulationInput = &input

	// Reset state for new simulation run
	se.ResetSimulationState()

	// Validate events before simulation
	if len(input.Events) > 0 {
		validationIssues := ValidateDynamicEventIntegrity(input.Events)
		if len(validationIssues) > 0 {
			// Log validation issues as warnings - critical issues would have caused validation to fail earlier
			simLogVerbose("⚠️ [VALIDATION] Dynamic event validation issues: %v", validationIssues)
		}
	}

	// CRITICAL FIX: Create clean accounts and parse holdings separately to prevent data corruption
	// The bug was that input.InitialAccounts contains "hollow" holdings (no tax lots)
	// which get zeroed out by recalculateHoldingFromLots during first market update
	simLogVerbose("🔍 [CRITICAL] About to access input.InitialAccounts (struct, cannot be nil)")
	simLogVerbose("🔍 [CRITICAL] input.InitialAccounts.Cash=%.2f", input.InitialAccounts.Cash)
	simLogVerbose("🔍 [CRITICAL] About to create AccountHoldingsMonthEnd structure")
	accounts := AccountHoldingsMonthEnd{
		Cash: input.InitialAccounts.Cash,
	}
	simLogVerbose("🔍 [CRITICAL] AccountHoldingsMonthEnd created successfully, Cash=%.2f", accounts.Cash)

	// Initialize account structures with totalValue but empty holdings arrays
	// Holdings will be created properly through CashManager to ensure tax lot integrity

	// CRITICAL FIX: Initialize accounts with actual values from input instead of zeros
	// Previous defensive approach was zeroing out all financial data, causing $0K issue
	simLogVerbose("🔧 [CRITICAL] Using actual account values from input instead of zero defaults")

	// ✅ FIX: Preserve holdings from input and initialize tax lots for backwards compatibility
	simLogVerbose("🔧 [FIX] Preserving holdings from input and initializing missing tax lots")

	// Helper function to initialize tax lots for holdings without them
	initializeMissingTaxLots := func(account *Account, startMonth int) {
		if account == nil {
			return
		}
		for i := range account.Holdings {
			holding := &account.Holdings[i]
			// If lots are missing/empty but holding has quantity, create initial lot
			if len(holding.Lots) == 0 && holding.Quantity > 0 {
				initialLot := TaxLot{
					ID:                fmt.Sprintf("%s-initial", holding.ID),
					AssetClass:        holding.AssetClass,
					Quantity:          holding.Quantity,
					CostBasisPerUnit:  holding.CostBasisPerUnit,
					CostBasisTotal:    holding.CostBasisTotal,
					AcquisitionDate:   startMonth,
					IsLongTerm:        true, // Assume existing holdings are long-term
					WashSalePeriodEnd: 0,
				}
				holding.Lots = []TaxLot{initialLot}
				simLogVerbose("🔧 [FIX] Created initial tax lot for holding %s: %.2f shares @ $%.2f",
					holding.ID, holding.Quantity, holding.CostBasisPerUnit)
			}
		}
	}

	// Preserve holdings from input (don't discard them!)
	if input.InitialAccounts.Taxable != nil {
		accounts.Taxable = &Account{
			TotalValue: input.InitialAccounts.Taxable.TotalValue,
			Holdings:   input.InitialAccounts.Taxable.Holdings,  // ✅ PRESERVE
		}
		initializeMissingTaxLots(accounts.Taxable, 0)
		simLogVerbose("🔍 [CRITICAL] Preserved taxable account: $%.2f with %d holdings",
			accounts.Taxable.TotalValue, len(accounts.Taxable.Holdings))
	} else {
		accounts.Taxable = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	if input.InitialAccounts.TaxDeferred != nil {
		accounts.TaxDeferred = &Account{
			TotalValue: input.InitialAccounts.TaxDeferred.TotalValue,
			Holdings:   input.InitialAccounts.TaxDeferred.Holdings,  // ✅ PRESERVE
		}
		initializeMissingTaxLots(accounts.TaxDeferred, 0)
		simLogVerbose("🔍 [CRITICAL] Preserved tax-deferred account: $%.2f with %d holdings",
			accounts.TaxDeferred.TotalValue, len(accounts.TaxDeferred.Holdings))
	} else {
		accounts.TaxDeferred = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	if input.InitialAccounts.Roth != nil {
		accounts.Roth = &Account{
			TotalValue: input.InitialAccounts.Roth.TotalValue,
			Holdings:   input.InitialAccounts.Roth.Holdings,  // ✅ PRESERVE
		}
		initializeMissingTaxLots(accounts.Roth, 0)
		simLogVerbose("🔍 [CRITICAL] Preserved Roth account: $%.2f with %d holdings",
			accounts.Roth.TotalValue, len(accounts.Roth.Holdings))
	} else {
		accounts.Roth = &Account{TotalValue: 0, Holdings: make([]Holding, 0, 10)}
	}

	// Priority queue simulation system
	// Full discrete event simulation engine with proper financial modeling
	// Track totals for verification
	totalAnnualIncome := 0.0
	totalAnnualExpenses := 0.0
	for i, event := range input.Events {
		// PERF: Guard debug strings with VERBOSE_DEBUG to avoid allocation in production
		if VERBOSE_DEBUG {
			_ = fmt.Sprintf("EVENT_LOADING_DEBUG: Event %d: %s (Type: %s, Amount: $%.2f, MonthOffset: %d)\n",
				i, event.ID, event.Type, event.Amount, event.MonthOffset)
			if event.Type == "REAL_ESTATE_SALE" {
				_ = fmt.Sprintf("EVENT_LOADING_DEBUG: REAL_ESTATE_SALE found - MonthOffset=%d Amount=%.2f\n", event.MonthOffset, event.Amount)
				if freq, ok := event.Metadata["frequency"]; ok {
					_ = fmt.Sprintf("EVENT_LOADING_DEBUG: REAL_ESTATE_SALE frequency: %v\n", freq)
				} else {
					_ = fmt.Sprintf("EVENT_LOADING_DEBUG: REAL_ESTATE_SALE frequency: NOT SET\n")
				}
			}
		}

		// Calculate annual amounts based on frequency
		if event.Type == "INCOME" {
			if event.Frequency == "monthly" {
				totalAnnualIncome += event.Amount * 12
			} else {
				totalAnnualIncome += event.Amount
			}
		} else if event.Type == "EXPENSE" {
			if event.Frequency == "monthly" {
				totalAnnualExpenses += event.Amount * 12
			} else {
				totalAnnualExpenses += event.Amount
			}
		}
	}
	// PERF: Guard debug string with VERBOSE_DEBUG
	if VERBOSE_DEBUG {
		_ = fmt.Sprintf("📊 [SIM-TOTALS] Annual Income: $%.2f, Annual Expenses: $%.2f, Net: $%.2f/year\n",
			totalAnnualIncome, totalAnnualExpenses, totalAnnualIncome-totalAnnualExpenses)
	}

	// SAFETY: Prevent infinite loops from corrupted monthsToRun values
	if input.MonthsToRun <= 0 || input.MonthsToRun > 1200 {
		fmt.Printf("🚨 [CRITICAL-ERROR] Invalid MonthsToRun: %d (must be between 1 and 1200)\n", input.MonthsToRun)
		// Return minimal result to prevent crash
		return SimulationResult{
			Success:     false,
			MonthlyData: []MonthlyDataSimulation{},
			Error:       fmt.Sprintf("Invalid MonthsToRun: %d", input.MonthsToRun),
		}
	}

	// DEBUG: Log MonthsToRun value received
	simLogVerbose("🔍 [MONTHS-TO-RUN-DEBUG] Go received MonthsToRun: %d", input.MonthsToRun)

	// Run the priority queue-based simulation engine
	simLogVerbose("🚀 [ENGINE] Running Priority Queue-based Discrete Event Simulation...")
	var result SimulationResult
	result = se.runQueueSimulationLoop(input, accounts)

	return result
}

// NOTE: Legacy simulation loop removed and archived in simulation_legacy.go.archive
// The monolithic loop has been replaced by the priority queue-based discrete event system
// runQueueSimulationLoop implements the new priority queue-based simulation engine
func (se *SimulationEngine) runQueueSimulationLoop(input SimulationInput, accounts AccountHoldingsMonthEnd) SimulationResult {
	// Store simulation input for access by event handlers
	se.simulationInput = &input

	// Create and populate the event queue FIRST (before initializing accounts)
	// This is required because initializeAccountsForQueue checks for investment events
	eventQueue := PreprocessAndPopulateQueue(input)

	// DEBUG: Log queue size
	simLogVerbose("🔍 [QUEUE-SIZE-DEBUG] Event queue contains %d events for %d months", eventQueue.Len(), input.MonthsToRun)

	// PERF: Convert heap to pre-sorted slice for O(1) iteration (Phase B.2)
	// This is a one-time O(n log n) sort that eliminates n * log(n) heap pops
	sortedEvents := eventQueue.ToSortedSlice()
	simLogVerbose("🚀 [PERF] Pre-sorted %d events for fast iteration", len(sortedEvents))

	// CRITICAL: Clear the queue after extracting to sorted slice to prevent double processing
	// Events are now in sortedEvents; queue will only be used for dynamically injected events
	eventQueue.Clear()

	// Set queue reference for dynamic event injection (BEFORE initializeAccountsForQueue)
	// Note: Main loop uses pre-sorted array for initial events, but checks eventQueue for injected events
	se.eventQueue = eventQueue

	// Initialize accounts with proper structure (now eventQueue is available)
	accounts = se.initializeAccountsForQueue(accounts)

	// DEBUG: Check holdings right after queue initialization
	if accounts.Taxable != nil && len(accounts.Taxable.Holdings) > 0 {
		holding := &accounts.Taxable.Holdings[0]
		simLogVerbose("🔍 [AFTER-QUEUE-INIT] After queue init: holding[0] qty=%.6f, price=%.2f, value=%.2f",
			holding.Quantity, holding.CurrentMarketPricePerUnit, holding.CurrentMarketValueTotal)
	}

	simLogVerbose("🏦 [QUEUE-INIT] Starting simulation with: Cash=$%.0f, Taxable=$%.0f, TaxDeferred=$%.0f, Roth=$%.0f",
		accounts.Cash, accounts.Taxable.TotalValue, accounts.TaxDeferred.TotalValue, accounts.Roth.TotalValue)

	// Validate queue integrity
	queueIssues := ValidateQueueIntegrity(eventQueue)
	if len(queueIssues) > 0 {
			simLogVerbose("⚠️ [QUEUE-VALIDATION] Issues: %v", queueIssues)
	}

	// Initialize system event handler
	systemHandler := NewSystemEventHandlerSimple(se)

	// Initialize results storage
	monthlyDataList := make([]MonthlyDataSimulation, 0, input.MonthsToRun)
	var currentMonthData *MonthlyDataSimulation
	currentMonth := -1

	// Track bankruptcy
	bankruptcyMonth := 0
	bankruptcyTrigger := ""

	// Main simulation loop - elegant and simple!
	eventCounter := 0
	eventIndex := 0
	simLogVerbose("🔍 [SIMULATION-LOOP-DEBUG] Starting loop with %d pre-sorted events", len(sortedEvents))

	// PROGRESS: Initial progress log
	totalYears := float64(input.MonthsToRun) / 12.0
	simLogVerbose("🚀 [PROGRESS-START] Beginning simulation: %d months (%.1f years) with %d events",
		input.MonthsToRun, totalYears, len(sortedEvents))

	// PERF: Use simple index iteration instead of heap pops (Phase B.2)
	// CRITICAL FIX: Also process dynamically injected events (rebalancing, tax strategies)
	for eventIndex < len(sortedEvents) || !se.eventQueue.IsEmpty() {
		var queuedEvent *QueuedEvent

		// Determine which event to process next: pre-sorted or injected
		if eventIndex < len(sortedEvents) && (se.eventQueue.IsEmpty() || sortedEvents[eventIndex].MonthOffset <= se.eventQueue.Peek().MonthOffset) {
			// Process next pre-sorted event
			queuedEvent = sortedEvents[eventIndex]
			eventIndex++
		} else if !se.eventQueue.IsEmpty() {
			// Process next injected event (rebalancing, tax strategies, etc.)
			queuedEvent = se.eventQueue.Next()
			simLogVerbose("🔄 [INJECTED-EVENT] Processing dynamically injected event: %s at month %d",
				queuedEvent.Event.Type, queuedEvent.MonthOffset)
		} else {
			// Both sources exhausted
			break
		}

		eventCounter++

		// Log every 50th event to track progress
		if eventCounter%50 == 0 {
			simLogVerbose("🔍 [LOOP-PROGRESS-DEBUG] Processed %d events, current month: %d, events remaining: %d+%d",
				eventCounter, queuedEvent.MonthOffset, len(sortedEvents)-eventIndex, se.eventQueue.Len())
		}

		// DEBUG: Check holdings before processing any event (only for first few events)
		if queuedEvent.MonthOffset == 0 && accounts.Taxable != nil && len(accounts.Taxable.Holdings) > 0 {
			holding := &accounts.Taxable.Holdings[0]
			simLogVerbose("🔍 [BEFORE-EVENT-%s] holding[0] qty=%.6f, price=%.2f, value=%.2f",
				queuedEvent.Event.Type, holding.Quantity, holding.CurrentMarketPricePerUnit, holding.CurrentMarketValueTotal)
		}

		// Check if we've moved to a new month
		if queuedEvent.MonthOffset > currentMonth {
			// PROGRESS: Log monthly progress at low frequency (every 12 months = 1 year)
			if currentMonth >= 0 && (currentMonth+1)%12 == 0 {
				progressYear := (currentMonth + 1) / 12
				totalYears := float64(input.MonthsToRun) / 12.0
				progressPercent := float64(currentMonth+1) * 100.0 / float64(input.MonthsToRun)
				simLogVerbose("📈 [PROGRESS] Year %d of %.1f complete (%.1f%%) - Month %d/%d",
					progressYear, totalYears, progressPercent, currentMonth+1, input.MonthsToRun)
			}

			// Save previous month's data
			if currentMonthData != nil {
				// NOTE: Debt payments are handled by SYSTEM_DEBT_PAYMENT event (priority 50)
				// Do NOT call ProcessDebtPayments here - it would double-count payments

				// Calculate final net worth for the month
				currentMonthData.NetWorth = se.calculateNetWorth(accounts)

				// PERF: Track incremental metrics for MC (avoids need to iterate MonthlyData later)
				cash := accounts.Cash
				if cash < se.minCash {
					se.minCash = cash
					se.minCashMonth = currentMonth
				}
				if se.cashFloorBreachedMonth == -1 && cash < se.config.CashFloor {
					se.cashFloorBreachedMonth = currentMonth
				}

				// PERF: Only deep copy accounts if tracking monthly data (skip for MC)
				if se.trackMonthlyData {
					currentMonthData.Accounts = se.deepCopyAccounts(accounts)
				}

            // Copy monthly flows to monthly data - THIS WAS MISSING!
            currentMonthData.IncomeThisMonth = se.currentMonthFlows.IncomeThisMonth
            currentMonthData.EmploymentIncomeThisMonth = se.currentMonthFlows.EmploymentIncomeThisMonth
            currentMonthData.ExpensesThisMonth = se.currentMonthFlows.ExpensesThisMonth
            currentMonthData.ContributionsToInvestmentsThisMonth = se.currentMonthFlows.ContributionsToInvestmentsThisMonth
            currentMonthData.DividendsReceivedThisMonth = se.currentMonthFlows.DividendsReceivedThisMonth
            currentMonthData.DebtPaymentsPrincipalThisMonth = se.currentMonthFlows.DebtPaymentsPrincipalThisMonth
            currentMonthData.DebtPaymentsInterestThisMonth = se.currentMonthFlows.DebtPaymentsInterestThisMonth
            currentMonthData.InterestIncomeThisMonth = se.currentMonthFlows.InterestIncomeThisMonth
            currentMonthData.TaxWithheldThisMonth = se.currentMonthFlows.TaxWithheldThisMonth
            currentMonthData.DivestmentProceedsThisMonth = se.currentMonthFlows.DivestmentProceedsThisMonth

				// Copy granular tracking data
				currentMonthData.SalaryIncomeThisMonth = se.currentMonthFlows.SalaryIncomeThisMonth
				currentMonthData.BonusIncomeThisMonth = se.currentMonthFlows.BonusIncomeThisMonth
				currentMonthData.RSUIncomeThisMonth = se.currentMonthFlows.RSUIncomeThisMonth
            currentMonthData.HousingExpensesThisMonth = se.currentMonthFlows.HousingExpensesThisMonth
            currentMonthData.TransportationExpensesThisMonth = se.currentMonthFlows.TransportationExpensesThisMonth
            currentMonthData.FoodExpensesThisMonth = se.currentMonthFlows.FoodExpensesThisMonth
            currentMonthData.OtherExpensesThisMonth = se.currentMonthFlows.OtherExpensesThisMonth

			// Copy contribution breakdown by account type
			currentMonthData.ContributionsTaxableThisMonth = se.currentMonthFlows.ContributionsTaxableThisMonth
			currentMonthData.ContributionsTaxDeferredThisMonth = se.currentMonthFlows.ContributionsTaxDeferredThisMonth
			currentMonthData.ContributionsRothThisMonth = se.currentMonthFlows.ContributionsRothThisMonth

			// Copy YTD tax tracking fields
			currentMonthData.OrdinaryIncomeForTaxYTD = se.ordinaryIncomeYTD
			currentMonthData.STCGForTaxYTD = se.shortTermCapitalGainsYTD
			currentMonthData.LTCGForTaxYTD = se.longTermCapitalGainsYTD
			currentMonthData.QualifiedDividendIncomeYTD = se.qualifiedDividendsYTD
			currentMonthData.OrdinaryDividendIncomeYTD = se.ordinaryDividendsYTD
			currentMonthData.InterestIncomeYTD = se.interestIncomeYTD
			currentMonthData.ItemizedDeductibleInterestPaidYTD = se.itemizedDeductibleInterestYTD
			currentMonthData.PreTaxContributionsYTD = se.preTaxContributionsYTD
			currentMonthData.TaxWithholdingYTD = se.taxWithholdingYTD

            // If December, populate annual tax breakdown fields from last tax calculation
            if (currentMonth+1)%12 == 0 && se.lastTaxCalculationResults != nil {
                tr := se.lastTaxCalculationResults
                // Allocate pointers and assign
                setFloatPtr := func(dst **float64, v float64) {
                    val := v
                    *dst = &val
                }
                // Total tax (including IRMAA premiums already added in ProcessAnnualTaxes)
                setFloatPtr(&currentMonthData.TaxPaidAnnual, tr.TotalTax)
                // Federal/state/cap gains/AMT
                setFloatPtr(&currentMonthData.FederalIncomeTaxAnnual, tr.FederalIncomeTax)
                setFloatPtr(&currentMonthData.StateIncomeTaxAnnual, tr.StateIncomeTax)
                setFloatPtr(&currentMonthData.CapitalGainsTaxShortTermAnnual, 0) // STCG accounted as ordinary in this model
                setFloatPtr(&currentMonthData.CapitalGainsTaxLongTermAnnual, tr.CapitalGainsTax)
                setFloatPtr(&currentMonthData.AlternativeMinimumTaxAnnual, tr.AlternativeMinimumTax)
                setFloatPtr(&currentMonthData.EffectiveTaxRateAnnual, tr.EffectiveRate)
                setFloatPtr(&currentMonthData.MarginalTaxRateAnnual, tr.MarginalRate)
                setFloatPtr(&currentMonthData.AdjustedGrossIncomeAnnual, tr.AdjustedGrossIncome)
                setFloatPtr(&currentMonthData.TaxableIncomeAnnual, tr.TaxableIncome)
                // FICA breakdown
                setFloatPtr(&currentMonthData.SocialSecurityTaxAnnual, tr.SocialSecurityTax)
                setFloatPtr(&currentMonthData.MedicareTaxAnnual, tr.MedicareTax)
                setFloatPtr(&currentMonthData.AdditionalMedicareTaxAnnual, tr.AdditionalMedicareTax)
                setFloatPtr(&currentMonthData.TotalFICATaxAnnual, tr.TotalFICATax)
                // RMD amount tracked for year
                if se.lastRMDAmount > 0 {
                    setFloatPtr(&currentMonthData.RMDAmountAnnual, se.lastRMDAmount)
                }
            }

            // PERF: Only append monthly data if tracking enabled (skip for MC)
            if se.trackMonthlyData {
                monthlyDataList = append(monthlyDataList, *currentMonthData)
            }

				// PHASE 2: Validate share-based accounting integrity after each month
				// This ensures no legacy dollar-based holdings creep in during simulation
				if err := ValidateAccountsIntegrity(&accounts); err != nil {
						simLogVerbose("❌ [VALIDATION-ERROR] Month %d: %v", currentMonth, err)
					// Log error but continue simulation to identify all issues
				}

				// Bankruptcy is now handled by SystemEventFinancialHealthCheck
				// Check if bankruptcy was triggered during event processing
				if se.isBankrupt {
					bankruptcyMonth = se.bankruptcyMonth
					bankruptcyTrigger = se.bankruptcyTrigger
					simLogVerbose("💀 [BANKRUPTCY] Detected in month %d: %s", bankruptcyMonth, bankruptcyTrigger)
					break // Stop simulation
				}
			}

			// Initialize new month
			currentMonth = queuedEvent.MonthOffset
			currentMonthData = &MonthlyDataSimulation{
				MonthOffset: currentMonth,
				// Year and Month fields don't exist in MonthlyDataSimulation
			}

			// Set the monthly data for system handler
			systemHandler.SetMonthlyData(currentMonthData)

			// Update expense history BEFORE resetting monthly flows
			// This captures the current month's expenses for rolling average calculation
			se.updateExpenseHistory()

			// Reset monthly flows for the new month
			se.resetMonthlyFlows()

			Year := currentMonth/12 + 2025
			Month := currentMonth%12 + 1
			simLogVerbose("📅 [NEW-MONTH] Starting month %d (Year %d, Month %d) - Cash: $%.2f",
				currentMonth, Year, Month, accounts.Cash)
		}

		// Process the event
		err := se.processQueuedEvent(queuedEvent, &accounts, currentMonthData, systemHandler)
		if err != nil {
			// Handle critical errors
			if queuedEvent.Event.Type == SystemEventYearEnd {
				// Year-end bankruptcy check
				bankruptcyMonth = currentMonth
				bankruptcyTrigger = err.Error()
				break
			}
			simLogVerbose("❌ [ERROR] Processing event %s: %v", queuedEvent.Event.ID, err)
		}
	}

	// Save the final month's data if it was created
        if currentMonthData != nil {
            currentMonthData.NetWorth = se.calculateNetWorth(accounts)
            currentMonthData.Accounts = se.deepCopyAccounts(accounts)

		// Copy monthly flows to monthly data for final month too
		currentMonthData.IncomeThisMonth = se.currentMonthFlows.IncomeThisMonth
		currentMonthData.EmploymentIncomeThisMonth = se.currentMonthFlows.EmploymentIncomeThisMonth
		currentMonthData.ExpensesThisMonth = se.currentMonthFlows.ExpensesThisMonth
		currentMonthData.ContributionsToInvestmentsThisMonth = se.currentMonthFlows.ContributionsToInvestmentsThisMonth
		currentMonthData.DividendsReceivedThisMonth = se.currentMonthFlows.DividendsReceivedThisMonth
		currentMonthData.DebtPaymentsPrincipalThisMonth = se.currentMonthFlows.DebtPaymentsPrincipalThisMonth
		currentMonthData.DebtPaymentsInterestThisMonth = se.currentMonthFlows.DebtPaymentsInterestThisMonth
		currentMonthData.InterestIncomeThisMonth = se.currentMonthFlows.InterestIncomeThisMonth
		currentMonthData.TaxWithheldThisMonth = se.currentMonthFlows.TaxWithheldThisMonth
		currentMonthData.DivestmentProceedsThisMonth = se.currentMonthFlows.DivestmentProceedsThisMonth

		// Copy granular tracking data for final month
		currentMonthData.SalaryIncomeThisMonth = se.currentMonthFlows.SalaryIncomeThisMonth
		currentMonthData.BonusIncomeThisMonth = se.currentMonthFlows.BonusIncomeThisMonth
		currentMonthData.RSUIncomeThisMonth = se.currentMonthFlows.RSUIncomeThisMonth
		currentMonthData.HousingExpensesThisMonth = se.currentMonthFlows.HousingExpensesThisMonth
		currentMonthData.TransportationExpensesThisMonth = se.currentMonthFlows.TransportationExpensesThisMonth
		currentMonthData.FoodExpensesThisMonth = se.currentMonthFlows.FoodExpensesThisMonth
            currentMonthData.OtherExpensesThisMonth = se.currentMonthFlows.OtherExpensesThisMonth

		// Copy contribution breakdown by account type for final month
		currentMonthData.ContributionsTaxableThisMonth = se.currentMonthFlows.ContributionsTaxableThisMonth
		currentMonthData.ContributionsTaxDeferredThisMonth = se.currentMonthFlows.ContributionsTaxDeferredThisMonth
		currentMonthData.ContributionsRothThisMonth = se.currentMonthFlows.ContributionsRothThisMonth

		// Copy YTD tax tracking fields for final month
		currentMonthData.OrdinaryIncomeForTaxYTD = se.ordinaryIncomeYTD
		currentMonthData.STCGForTaxYTD = se.shortTermCapitalGainsYTD
		currentMonthData.LTCGForTaxYTD = se.longTermCapitalGainsYTD
		currentMonthData.QualifiedDividendIncomeYTD = se.qualifiedDividendsYTD
		currentMonthData.OrdinaryDividendIncomeYTD = se.ordinaryDividendsYTD
		currentMonthData.InterestIncomeYTD = se.interestIncomeYTD
		currentMonthData.ItemizedDeductibleInterestPaidYTD = se.itemizedDeductibleInterestYTD
		currentMonthData.PreTaxContributionsYTD = se.preTaxContributionsYTD
		currentMonthData.TaxWithholdingYTD = se.taxWithholdingYTD

            // If this is December, populate annual tax breakdown fields on the final month as well
            if (currentMonth+1)%12 == 0 && se.lastTaxCalculationResults != nil {
                tr := se.lastTaxCalculationResults
                setFloatPtr := func(dst **float64, v float64) {
                    val := v
                    *dst = &val
                }
                setFloatPtr(&currentMonthData.TaxPaidAnnual, tr.TotalTax)
                setFloatPtr(&currentMonthData.FederalIncomeTaxAnnual, tr.FederalIncomeTax)
                setFloatPtr(&currentMonthData.StateIncomeTaxAnnual, tr.StateIncomeTax)
                setFloatPtr(&currentMonthData.CapitalGainsTaxShortTermAnnual, 0)
                setFloatPtr(&currentMonthData.CapitalGainsTaxLongTermAnnual, tr.CapitalGainsTax)
                setFloatPtr(&currentMonthData.AlternativeMinimumTaxAnnual, tr.AlternativeMinimumTax)
                setFloatPtr(&currentMonthData.EffectiveTaxRateAnnual, tr.EffectiveRate)
                setFloatPtr(&currentMonthData.MarginalTaxRateAnnual, tr.MarginalRate)
                setFloatPtr(&currentMonthData.AdjustedGrossIncomeAnnual, tr.AdjustedGrossIncome)
                setFloatPtr(&currentMonthData.TaxableIncomeAnnual, tr.TaxableIncome)
                setFloatPtr(&currentMonthData.SocialSecurityTaxAnnual, tr.SocialSecurityTax)
                setFloatPtr(&currentMonthData.MedicareTaxAnnual, tr.MedicareTax)
                setFloatPtr(&currentMonthData.AdditionalMedicareTaxAnnual, tr.AdditionalMedicareTax)
                setFloatPtr(&currentMonthData.TotalFICATaxAnnual, tr.TotalFICATax)
                if se.lastRMDAmount > 0 {
                    setFloatPtr(&currentMonthData.RMDAmountAnnual, se.lastRMDAmount)
                }
            }

            // PERF: Only append final month data if tracking enabled (skip for MC)
            if se.trackMonthlyData {
                monthlyDataList = append(monthlyDataList, *currentMonthData)
            }
        }

	// DEBUG: Log loop termination status
	simLogVerbose("🔍 [SIMULATION-LOOP-END-DEBUG] Loop ended. Processed %d events, generated %d months of data, lastMonth: %d",
		eventCounter, len(monthlyDataList), currentMonth)

	// EDGE CASE: If no monthly data was generated at all (e.g., zero events), create initial month
	// This ensures we always return at least one data point for the initial state
	if len(monthlyDataList) == 0 {
		simLogVerbose("🔧 [MONTHLY-DATA-FIX] No monthly data generated from events, creating initial month")
		initialMonth := MonthlyDataSimulation{
			MonthOffset: 0,
			NetWorth:    se.calculateNetWorth(accounts),
			Accounts:    se.deepCopyAccounts(accounts),
		}
		monthlyDataList = append(monthlyDataList, initialMonth)
	}

	// DO NOT pad results after simulation failure
	// If simulation stopped early (bankruptcy), return only the months actually simulated
	// The UI uses bankruptcyMonth and isBankrupt fields to handle failed simulations

	// Calculate final values
	finalNetWorth := se.calculateNetWorth(accounts)

	simLogVerbose("🏁 [QUEUE-COMPLETE] Final: Cash=$%.0f, NetWorth=$%.0f, Months=%d",
		accounts.Cash, finalNetWorth, len(monthlyDataList))

	// PROGRESS: Final completion log
	actualYears := float64(len(monthlyDataList)) / 12.0
	simLogVerbose("✅ [PROGRESS-COMPLETE] Simulation finished: %d months (%.1f years) - Final Net Worth: $%.0f",
		len(monthlyDataList), actualYears, finalNetWorth)

	// Build and return result
	result := SimulationResult{
		Success:           bankruptcyMonth == 0,
		MonthlyData:       monthlyDataList,
		FinalNetWorth:     finalNetWorth,
		BankruptcyMonth:   bankruptcyMonth,
		BankruptcyTrigger: bankruptcyTrigger,
		IsBankrupt:        bankruptcyMonth > 0,
		Metadata: map[string]interface{}{
			"simulationCompleted": true,
		},
		// PERF: Populate incremental metrics for fast MC extraction
		MinCash:                se.minCash,
		MinCashMonth:           se.minCashMonth,
		CashFloorBreachedMonth: se.cashFloorBreachedMonth,
	}
	return result
}

// Helper methods for queue-based simulation

// InjectEvent adds a generated event to the simulation queue during processing
func (se *SimulationEngine) InjectEvent(event FinancialEvent, monthOffset int, priority EventPriority) {
	if se.eventQueue != nil {
		se.eventQueue.Add(event, monthOffset, priority)
		simLogVerbose("📥 [INJECT] Added event %s (%.2f) for month %d with priority %d",
			event.Type, event.Amount, monthOffset, priority)
	}
}

// InjectQueuedEvents adds multiple generated events to the simulation queue
func (se *SimulationEngine) InjectQueuedEvents(events []QueuedEvent) {
	if se.eventQueue != nil {
		for _, queuedEvent := range events {
			se.eventQueue.Add(queuedEvent.Event, queuedEvent.MonthOffset, queuedEvent.Priority)
			simLogVerbose("📥 [INJECT-BATCH] Added event %s (%.2f) for month %d with priority %d",
				queuedEvent.Event.Type, queuedEvent.Event.Amount, queuedEvent.MonthOffset, queuedEvent.Priority)
		}
	}
}

// processQueuedEvent routes events to appropriate handlers
func (se *SimulationEngine) processQueuedEvent(
	queuedEvent *QueuedEvent,
	accounts *AccountHoldingsMonthEnd,
	monthlyData *MonthlyDataSimulation,
	systemHandler *SystemEventHandlerSimple,
) error {
	event := queuedEvent.Event

	// Debug: Log all events being processed
		simLogVerbose("[WASM-QUEUE-DEBUG] Processing queued event: type='%s', amount=%.2f, month=%d",
			event.Type, event.Amount, queuedEvent.MonthOffset)

	// Check if it's a system event
	if se.isSystemEvent(event.Type) {
		// System event processing - logging handled by ProcessSystemEvent
		return systemHandler.ProcessSystemEvent(event, accounts, queuedEvent.MonthOffset)
	}

		simLogVerbose("[WASM-QUEUE-DEBUG] User event detected: type='%s', processing through event registry", event.Type)

	// Process user event through the event registry
	cashFlow := 0.0 // Legacy compatibility
	context := &EventProcessingContext{
		CurrentMonth:     queuedEvent.MonthOffset,
		SimulationEngine: se,
	}
	err := se.eventRegistry.ProcessEvent(event, accounts, &cashFlow, context)

	if err != nil {
		return fmt.Errorf("processing event %s: %w", event.ID, err)
	}

	// Update monthly data with event results
	se.updateMonthlyDataFromEvent(monthlyData, &event, cashFlow)

	return nil
}

// isSystemEvent checks if an event type is system-generated
func (se *SimulationEngine) isSystemEvent(eventType string) bool {
	switch eventType {
	case SystemEventTimeStep,
		SystemEventMarketUpdate,
		SystemEventCashCheck,
		SystemEventRMDCheck,
		SystemEventTaxCheck,
		SystemEventYearEnd,
		SystemEventDebtPayment,
		SystemEventFinancialHealthCheck:
		return true
	default:
		return false
	}
}

// hasInvestmentRelatedEvents checks if the event queue contains any investment-related events
// Investment events are those that involve moving money into/out of investment accounts
// This is used to prevent auto-investing when user only has cash with no investment plan
func (se *SimulationEngine) hasInvestmentRelatedEvents() bool {
	// Safety check: if eventQueue hasn't been initialized yet, return false
	if se.eventQueue == nil || se.eventQueue.items == nil {
		return false
	}

	investmentEventTypes := map[string]bool{
		"CONTRIBUTION":                   true,
		"WITHDRAWAL":                     true,
		"ROTH_CONVERSION":                true,
		"REBALANCE":                      true,
		"SELL_ASSET":                     true,
		"BUY_ASSET":                      true,
		"TRANSFER_BETWEEN_ACCOUNTS":      true,
		"TAX_LOSS_HARVESTING":            true,
		"CAPITAL_GAINS_DISTRIBUTION":     true,
		"EMPLOYER_MATCH":                 true,
		"DIVIDEND_REINVESTMENT":          true,
		"PORTFOLIO_REBALANCE":            true,
		"ASSET_ALLOCATION_CHANGE":        true,
		"TAXABLE_ACCOUNT_CONTRIBUTION":   true,
		"TAX_DEFERRED_CONTRIBUTION":      true,
		"ROTH_CONTRIBUTION":              true,
		"HSA_CONTRIBUTION":               true,
		"FIVE_TWO_NINE_CONTRIBUTION":     true,
		"TAXABLE_WITHDRAWAL":             true,
		"TAX_DEFERRED_WITHDRAWAL":        true,
		"ROTH_WITHDRAWAL":                true,
		"RMD":                            true,
	}

	for _, queuedEvent := range se.eventQueue.items {
		if investmentEventTypes[queuedEvent.Event.Type] {
			return true
		}
	}

	return false
}

// initializeAccountsForQueue ensures all accounts are properly initialized
func (se *SimulationEngine) initializeAccountsForQueue(initial AccountHoldingsMonthEnd) AccountHoldingsMonthEnd {
	accounts := initial

	// Helper function to convert legacy dollar-based holdings to share-based and initialize tax lots
	initializeMissingTaxLots := func(account *Account, startMonth int) {
		if account == nil {
			return
		}
		for i := range account.Holdings {
			holding := &account.Holdings[i]

			// CRITICAL: Detect and convert legacy holdings (quantity ≈ 1.0 with high cost basis)
			// Legacy holdings used quantity=1 as a placeholder with dollar amount as "price"
			isLegacyHolding := holding.Quantity > 0 && holding.Quantity < 2.0 && holding.CostBasisPerUnit > 1000

			if isLegacyHolding {
				// Convert legacy holding to proper share-based model
				currentPrice := se.GetPricePerShare(holding.AssetClass)
				if currentPrice <= 0 {
					currentPrice = 1.0 // Use normalized $1/share price
				}

				// Calculate real share quantity based on dollar value
				dollarValue := holding.CurrentMarketValueTotal
				if dollarValue <= 0 {
					dollarValue = holding.CostBasisTotal
				}

				realQuantity := dollarValue / currentPrice
				realCostBasisPerShare := holding.CostBasisTotal / realQuantity

				simLogVerbose("🔧 [LEGACY-CONVERSION] Converting legacy holding %s: %.2f→%.2f shares, $%.2f→$%.2f/share",
					holding.ID, holding.Quantity, realQuantity, holding.CostBasisPerUnit, realCostBasisPerShare)

				// Update holding to proper share-based model
				holding.Quantity = realQuantity
				holding.CostBasisPerUnit = realCostBasisPerShare
				holding.CurrentMarketPricePerUnit = currentPrice
				holding.CurrentMarketValueTotal = realQuantity * currentPrice
				holding.UnrealizedGainLossTotal = holding.CurrentMarketValueTotal - holding.CostBasisTotal
			}

			// Now create tax lot if missing
			if len(holding.Lots) == 0 && holding.Quantity > 0 {
				initialLot := TaxLot{
					ID:                fmt.Sprintf("%s-initial", holding.ID),
					AssetClass:        holding.AssetClass,
					Quantity:          holding.Quantity,
					CostBasisPerUnit:  holding.CostBasisPerUnit,
					CostBasisTotal:    holding.CostBasisTotal,
					AcquisitionDate:   startMonth,
					IsLongTerm:        true, // Assume existing holdings are long-term
					WashSalePeriodEnd: 0,
				}
				holding.Lots = []TaxLot{initialLot}
				simLogVerbose("🔧 [QUEUE-INIT] Created initial tax lot for holding %s: %.2f shares @ $%.2f",
					holding.ID, holding.Quantity, holding.CostBasisPerUnit)
			}
		}
	}

	// CRITICAL FIX: If account has TotalValue but no Holdings, ALWAYS create default holding
	// This ensures calculateNetWorth returns correct values and prevents TotalValue from being reset to 0
	// User-specified account values in Initial State represent investments that must be tracked as holdings
	createDefaultHolding := func(account *Account, accountName string, assetClass AssetClass) {
		if account == nil || account.TotalValue <= 0 || len(account.Holdings) > 0 {
			return
		}

		// Account has value but no holdings - create a default holding
		currentPrice := se.GetPricePerShare(assetClass)
		if currentPrice <= 0 {
			currentPrice = 1.0 // Fallback
		}

		quantity := account.TotalValue / currentPrice

		holding := Holding{
			ID:                        fmt.Sprintf("%s-default-holding", accountName),
			AssetClass:                assetClass,
			Quantity:                  quantity,
			CostBasisPerUnit:          currentPrice,
			CostBasisTotal:            account.TotalValue,
			CurrentMarketPricePerUnit: currentPrice,
			CurrentMarketValueTotal:   account.TotalValue,
			UnrealizedGainLossTotal:   0,
			LiquidityTier:             LiquidityTierLiquid,
			Lots: []TaxLot{
				{
					ID:                fmt.Sprintf("%s-default-lot", accountName),
					AssetClass:        assetClass,
					Quantity:          quantity,
					CostBasisPerUnit:  currentPrice,
					CostBasisTotal:    account.TotalValue,
					AcquisitionDate:   0,
					IsLongTerm:        true,
					WashSalePeriodEnd: 0,
				},
			},
		}

		account.Holdings = []Holding{holding}
		simLogVerbose("✅ [QUEUE-INIT] Created default holding for %s: $%.2f (%.2f shares @ $%.2f)",
			accountName, account.TotalValue, quantity, currentPrice)
	}

	// Ensure all account pointers are initialized
	if accounts.Taxable == nil {
		accounts.Taxable = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0),
		}
		simLogVerbose("⚠️ [INIT] Created empty Taxable account")
	} else {
		initializeMissingTaxLots(accounts.Taxable, 0)
		createDefaultHolding(accounts.Taxable, "taxable", AssetClassUSStocksTotalMarket)
	}

	if accounts.TaxDeferred == nil {
		accounts.TaxDeferred = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0),
		}
		simLogVerbose("⚠️ [INIT] Created empty TaxDeferred account")
	} else {
		initializeMissingTaxLots(accounts.TaxDeferred, 0)
		createDefaultHolding(accounts.TaxDeferred, "tax_deferred", AssetClassUSStocksTotalMarket)
	}

	if accounts.Roth == nil {
		accounts.Roth = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0),
		}
		simLogVerbose("⚠️ [INIT] Created empty Roth account")
	} else {
		initializeMissingTaxLots(accounts.Roth, 0)
		createDefaultHolding(accounts.Roth, "roth", AssetClassUSStocksTotalMarket)
	}

	// Initialize optional accounts if needed
	if accounts.FiveTwoNine == nil {
		accounts.FiveTwoNine = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0),
		}
	} else {
		initializeMissingTaxLots(accounts.FiveTwoNine, 0)
		createDefaultHolding(accounts.FiveTwoNine, "529", AssetClassUSStocksTotalMarket)
	}

	if accounts.HSA == nil {
		accounts.HSA = &Account{
			TotalValue: 0,
			Holdings:   make([]Holding, 0),
		}
	} else {
		initializeMissingTaxLots(accounts.HSA, 0)
		createDefaultHolding(accounts.HSA, "hsa", AssetClassUSStocksTotalMarket)
	}

	return accounts
}

// updateMonthlyDataFromEvent updates the monthly tracking data based on event results
func (se *SimulationEngine) updateMonthlyDataFromEvent(
	monthlyData *MonthlyDataSimulation,
	event *FinancialEvent,
	cashFlow float64,
) {
	// Debug event types being processed
		simLogVerbose("[WASM-EVENT-DEBUG] Processing event type: '%s', amount: %.2f", event.Type, event.Amount)

	// Map event types to monthly data fields
	switch event.Type {
	case "INCOME", "EMPLOYMENT_INCOME":
			simLogVerbose("[WASM-INCOME-DEBUG] MATCHED income event: type='%s', amount=%.2f", event.Type, event.Amount)
		monthlyData.EmploymentIncomeThisMonth += event.Amount
		monthlyData.IncomeThisMonth += event.Amount

	case "PENSION_INCOME":
		// Note: PensionIncomeThisMonth field doesn't exist, adding to general income
		monthlyData.IncomeThisMonth += event.Amount

	case "SOCIAL_SECURITY":
		// Note: SocialSecurityThisMonth field doesn't exist, adding to general income
		monthlyData.IncomeThisMonth += event.Amount

	case "EXPENSE", "RECURRING_EXPENSE":
		monthlyData.ExpensesThisMonth += event.Amount

	case "CONTRIBUTION", "401K_CONTRIBUTION", "IRA_CONTRIBUTION":
		monthlyData.ContributionsToInvestmentsThisMonth += event.Amount

	case "ROTH_CONVERSION":
		monthlyData.RothConversionAmountThisMonth += event.Amount

	case "ASSET_SALE", "WITHDRAWAL":
		// This is tracked in the cash manager
		// monthlyData.DivestmentProceedsThisMonth is updated there

	case "MORTGAGE_PAYMENT", "LOAN_PAYMENT":
		// Use the correct field names for debt payments
		monthlyData.DebtPaymentsPrincipalThisMonth += event.Amount * 0.8 // Approximate 80% principal
		monthlyData.DebtPaymentsInterestThisMonth += event.Amount * 0.2  // Approximate 20% interest
	}

	// Note: TotalIncomeThisMonth field doesn't exist in MonthlyDataSimulation
	// Total income is calculated from IncomeThisMonth
}

// SetDynamicEventDebugMode enables or disables debug mode for dynamic events
func (se *SimulationEngine) SetDynamicEventDebugMode(enabled bool) {
	if se.dynamicEventTracker != nil {
		se.dynamicEventTracker.debugMode = enabled
	}
}

// GetDynamicEventSummary returns summary statistics for dynamic event execution
func (se *SimulationEngine) GetDynamicEventSummary() map[string]interface{} {
	if se.dynamicEventTracker != nil {
		return se.dynamicEventTracker.GetExecutionSummary()
	}
	return map[string]interface{}{
		"totalExecutions": 0,
		"message":         "No dynamic event tracker available",
	}
}

// GetDynamicEventLog returns the detailed execution log for dynamic events
func (se *SimulationEngine) GetDynamicEventLog() []DynamicEventExecution {
	if se.dynamicEventTracker != nil {
		return se.dynamicEventTracker.GetExecutionLog()
	}
	return []DynamicEventExecution{}
}

// shouldEventFireThisMonth determines if a recurring event should execute this month
func (se *SimulationEngine) shouldEventFireThisMonth(event FinancialEvent, monthOffset int) bool {
	// PERF: Guard debug strings with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG {
		// DEBUG: Add debugging for REAL_ESTATE_SALE events
		if event.Type == "REAL_ESTATE_SALE" {
			_ = fmt.Sprintf("SHOULD_FIRE_DEBUG: REAL_ESTATE_SALE - monthOffset=%d, event.MonthOffset=%d\n", monthOffset, event.MonthOffset)
			if freq, ok := event.Metadata["frequency"]; ok {
				_ = fmt.Sprintf("SHOULD_FIRE_DEBUG: REAL_ESTATE_SALE frequency: %v\n", freq)
			} else {
				_ = fmt.Sprintf("SHOULD_FIRE_DEBUG: REAL_ESTATE_SALE frequency: NOT SET (will default to monthly)\n")
			}
		}
	}

	// Check if we're within the event's active period
	if monthOffset < event.MonthOffset {
		if VERBOSE_DEBUG && event.Type == "REAL_ESTATE_SALE" {
			_ = fmt.Sprintf("SHOULD_FIRE_DEBUG: REAL_ESTATE_SALE - Event hasn't started yet\n")
		}
		return false // Event hasn't started yet
	}

	// Check end date if specified (from metadata)
	if endOffset, ok := event.Metadata["endMonthOffset"].(float64); ok && int(endOffset) > 0 && monthOffset >= int(endOffset) {
		if VERBOSE_DEBUG {
			_ = fmt.Sprintf("🚨 [EVENT-TERMINATION] Event %s ending at month %d (endOffset=%d)", event.ID, monthOffset, int(endOffset))
		}
		return false // Event has ended
	}

	// Get frequency - check Frequency field first, then metadata (defaults to "monthly" if not specified)
	frequency := "monthly"

	// Priority 1: Check the Frequency field (canonical source)
	if event.Frequency != "" {
		frequency = event.Frequency
	} else if freqVal, ok := event.Metadata["frequency"]; ok {
		// Priority 2: Fall back to metadata for backwards compatibility
		// Handle different types that might come from JavaScript
		switch v := freqVal.(type) {
		case string:
			if v != "" {
				frequency = v
			}
		case interface{}:
			if str := fmt.Sprintf("%v", v); str != "" && str != "<nil>" {
				frequency = str
			}
		}
	}
	// Priority 3: Default to "monthly" if neither is set

	// Calculate months since event started
	monthsSinceStart := monthOffset - event.MonthOffset

	switch frequency {
	case "one-time":
		result := monthsSinceStart == 0 // Only fire on the exact start month
		if event.Type == "REAL_ESTATE_SALE" {
			_ = fmt.Sprintf("SHOULD_FIRE_DEBUG: REAL_ESTATE_SALE - one-time frequency, monthsSinceStart=%d, result=%v\n", monthsSinceStart, result)
		}
		return result
	case "monthly":
		return true // Fire every month while active
	case "quarterly":
		return monthsSinceStart%3 == 0 // Fire every 3 months
	case "semiannually":
		return monthsSinceStart%6 == 0 // Fire every 6 months
	case "annually":
		return monthsSinceStart%12 == 0 // Fire every 12 months
	case "weekly":
		return true // Weekly events fire monthly with aggregated amount
	case "biweekly":
		return true // Biweekly events fire monthly with aggregated amount
	default:
		return true // Default to monthly
	}
}

// calculateEventAmountForMonth calculates the proper amount for an event occurrence
func (se *SimulationEngine) calculateEventAmountForMonth(event FinancialEvent, monthOffset int) float64 {
	// Get frequency - check Frequency field first, then metadata
	frequency := "monthly"

	// Priority 1: Check the Frequency field (canonical source)
	if event.Frequency != "" {
		frequency = event.Frequency
	} else if freq, ok := event.Metadata["frequency"].(string); ok && freq != "" {
		// Priority 2: Fall back to metadata for backwards compatibility
		frequency = freq
	}
	// Priority 3: Default to "monthly" if neither is set

	// Base amount from event
	baseAmount := event.Amount

	// Apply annual growth rate if specified in metadata
	if growthRateValue, ok := event.Metadata["annualGrowthRate"].(float64); ok && growthRateValue > 0 {
		// Calculate years elapsed since event start (month 0)
		yearsElapsed := float64(monthOffset) / 12.0
		// Apply compound growth: amount = baseAmount * (1 + rate)^years
		growthMultiplier := math.Pow(1.0+growthRateValue, yearsElapsed)
		baseAmount = baseAmount * growthMultiplier
	}

	switch frequency {
	case "annually":
		// Annual events: amount is already annual, use as-is
		return baseAmount
	case "quarterly":
		// Quarterly events: amount is already quarterly, use as-is
		return baseAmount
	case "monthly":
		// Monthly events: amount is already monthly, use as-is
		return baseAmount
	case "weekly":
		// Weekly events: aggregate 4.33 weeks per month
		return baseAmount * 4.33
	case "biweekly":
		// Biweekly events: aggregate 2.17 biweeks per month
		return baseAmount * 2.17
	case "one-time":
		// One-time events: full amount
		return baseAmount
	default:
		// Default to monthly
		return baseAmount
	}
}

// processEventWithFIFO processes a single financial event with FIFO lot tracking using the Strategy pattern
func (se *SimulationEngine) processEventWithFIFO(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, currentMonth int) {
	// PERF: Guard debug strings with VERBOSE_DEBUG to avoid allocation in production
	if VERBOSE_DEBUG && currentMonth == 0 {
		_ = fmt.Sprintf("DEBUG WASM processEventWithFIFO: event.Type=%s, event.ID=%s, currentMonth=%d\n", event.Type, event.ID, currentMonth)
		_ = fmt.Sprintf("DEBUG WASM processEventWithFIFO: current cashFlow=%.2f, event.Amount=%.2f\n", *cashFlow, event.Amount)
	}

	// Create processing context
	context := &EventProcessingContext{
		SimulationEngine: se,
		CurrentMonth:     currentMonth,
	}

	// Process event using the appropriate handler
	if currentMonth == 0 {
		simLogVerbose("🎯 [EVENT-DEBUG] About to call ProcessEvent for type=%s", event.Type)
	}
	if err := se.eventRegistry.ProcessEvent(event, accounts, cashFlow, context); err != nil {
		simLogVerbose("🚨 [EVENT-ERROR] ERROR processing event %s: %v", event.Type, err)
	} else if currentMonth == 0 {
		simLogVerbose("✅ [EVENT-DEBUG] ProcessEvent SUCCESS for type=%s, new cashFlow=%.2f", event.Type, *cashFlow)
	}
}

// calculateNetWorth calculates total net worth across all accounts
func (se *SimulationEngine) calculateNetWorth(accounts AccountHoldingsMonthEnd) float64 {
	netWorth := accounts.Cash

	// Calculate from actual holdings to ensure consistency
	if taxableAccount := GetTaxableAccount(&accounts); taxableAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range taxableAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		taxableAccount.TotalValue = holdingsTotal
	}
	if taxDeferredAccount := GetTaxDeferredAccount(&accounts); taxDeferredAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range taxDeferredAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		taxDeferredAccount.TotalValue = holdingsTotal
	}
	if rothAccount := GetRothAccount(&accounts); rothAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range rothAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		rothAccount.TotalValue = holdingsTotal
	}
	if fiveTwoNineAccount := GetFiveTwoNineAccount(&accounts); fiveTwoNineAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range fiveTwoNineAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		fiveTwoNineAccount.TotalValue = holdingsTotal
	}
	if hsaAccount := GetHSAAccount(&accounts); hsaAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range hsaAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		hsaAccount.TotalValue = holdingsTotal
	}
	if checkingAccount := GetCheckingAccount(&accounts); checkingAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range checkingAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		checkingAccount.TotalValue = holdingsTotal
	}
	if savingsAccount := GetSavingsAccount(&accounts); savingsAccount != nil {
		holdingsTotal := 0.0
		for _, holding := range savingsAccount.Holdings {
			holdingsTotal += holding.CurrentMarketValueTotal
		}
		netWorth += holdingsTotal
		savingsAccount.TotalValue = holdingsTotal
	}

	// Subtract liabilities to get true net worth
	totalLiabilities := 0.0
	for _, liability := range se.liabilities {
		totalLiabilities += liability.CurrentPrincipalBalance
	}
	netWorth -= totalLiabilities

	// Subtract unpaid tax liability for accrual accounting
	// This shows the true net worth accounting for taxes owed but not yet paid
	netWorth -= se.unpaidTaxLiability

	return netWorth
}


// getLiquidAssets calculates total liquid assets available for emergencies
func (se *SimulationEngine) getLiquidAssets(accounts AccountHoldingsMonthEnd) float64 {
	// Cash is fully liquid
	liquidAssets := accounts.Cash

	// Taxable investment accounts are reasonably liquid (with some penalty for market timing)
	if accounts.Taxable != nil {
		liquidAssets += accounts.Taxable.TotalValue * 0.85 // 15% haircut for market timing/taxes
	}

	// Emergency access to retirement accounts (with heavy penalties)
	if accounts.TaxDeferred != nil {
		liquidAssets += accounts.TaxDeferred.TotalValue * 0.6 // 40% penalty/tax hit
	}

	if accounts.Roth != nil {
		liquidAssets += accounts.Roth.TotalValue * 0.7 // 30% penalty for early withdrawal
	}

	return liquidAssets
}

// Bankruptcy consequences are not modeled - bankruptcy is terminal event

// RunMonteCarloSimulation runs multiple simulation paths with proper deterministic-stochastic separation
// CRITICAL BUG FIX: This fixes the 401k contribution inflation bug by ensuring cash flows are
// processed correctly and market returns are the only stochastic component
func RunMonteCarloSimulation(input SimulationInput, numberOfRuns int) SimulationResults {
	if numberOfRuns <= 0 {
		return SimulationResults{
			Success: false,
			Error:   "Number of runs must be positive",
		}
	}

	if numberOfRuns > 100000 {
		return SimulationResults{
			Success: false,
			Error:   "Number of runs exceeds maximum limit of 100,000",
		}
	}

	// PFOS-E: Require non-zero seed for reproducibility
	baseSeed := input.Config.RandomSeed
	if baseSeed == 0 {
		return SimulationResults{
			Success: false,
			Error:   "MC requires non-zero RandomSeed for reproducibility (PFOS-E)",
		}
	}

	// CRITICAL FIX: When simulationMode is "deterministic", disable randomness to use mean returns
	// This fixes the bug where deterministic mode was still generating stochastic returns with volatility
	// The formula was: return = meanMonthly + volMonthly * shock, giving ~6.4% instead of ~0.57%
	if input.Config.SimulationMode == "deterministic" {
		input.Config.DebugDisableRandomness = true
		simLogVerbose("🔧 MONTE-CARLO: Deterministic mode - disabling randomness, using mean returns")
	}

	// Cash floor for breach detection (default 0 = breach when going negative)
	cashFloor := input.Config.CashFloor

	// PERF: Pre-compute Cholesky matrix and monthly parameters once for all paths
	if input.Config.LiteMode {
		if err := PrecomputeConfigParameters(&input.Config); err != nil {
			return SimulationResults{
				Success: false,
				Error:   fmt.Sprintf("Failed to precompute config: %v", err),
			}
		}
	}

	// Storage for per-path metrics
	pathMetrics := make([]MCPathMetrics, 0, numberOfRuns)
	finalNetWorths := make([]float64, 0, numberOfRuns)
	bankruptcyMonths := make([]int, 0, numberOfRuns)
	successfulPaths := 0
	failedPaths := 0
	bankruptcyCount := 0
	maxErrors := numberOfRuns / 10 // Allow up to 10% failures

	// Track max months for breach time series
	maxMonthsObserved := 0

	simLogVerbose("🔧 MONTE-CARLO: Starting %d Monte Carlo runs (baseSeed=%d, cashFloor=%.2f)", numberOfRuns, baseSeed, cashFloor)
	for i := 0; i < numberOfRuns; i++ {
		if i == 0 || i == numberOfRuns-1 || i%25 == 0 {
			simLogVerbose("🔧 MONTE-CARLO: Run %d/%d", i+1, numberOfRuns)
		}

		// Use RunIsolatedPath for proper seed diversity and state isolation
		result := RunIsolatedPath(input, i, IsolatedPathOptions{
			TrackMonthlyData: false, // MC mode: use incremental metrics
		})

		// Track max months for breach time series
		// CRITICAL FIX: In MC mode, MonthlyData is empty (trackMonthlyData=false)
		// Use simulation horizon instead of empty array length
		if maxMonthsObserved < input.MonthsToRun {
			maxMonthsObserved = input.MonthsToRun
		}

		// Get final net worth from either MonthlyData or direct field (MC mode)
		var finalNetWorth float64
		if len(result.MonthlyData) > 0 {
			lastMonth := result.MonthlyData[len(result.MonthlyData)-1]
			finalNetWorth = lastMonth.NetWorth
		} else if result.FinalNetWorth != 0 || result.Success {
			// MC mode: use direct FinalNetWorth field (trackMonthlyData=false)
			finalNetWorth = result.FinalNetWorth
		} else {
			simLogVerbose("⚠️  MONTE-CARLO: Run %d failed with no data: Success=%t, Error=%s", i+1, result.Success, result.Error)
			failedPaths++
			continue
		}

		// Track bankruptcy
		if result.IsBankrupt {
			bankruptcyCount++
			bankruptcyMonths = append(bankruptcyMonths, result.BankruptcyMonth)
			simLogVerbose("💀 MONTE-CARLO: Run %d ended in bankruptcy at month %d: %s",
				i+1, result.BankruptcyMonth, result.BankruptcyTrigger)
		}

		// Accept all mathematically valid results - only reject NaN/Inf
		if math.IsNaN(finalNetWorth) || math.IsInf(finalNetWorth, 0) {
			simLogVerbose("⚠️  MONTE-CARLO: Run %d produced invalid net worth: %v", i+1, finalNetWorth)
			failedPaths++
		} else {
			// Extract path metrics for enhanced KPIs
			// Calculate pathSeed (matches RunIsolatedPath: baseSeed + pathIndex)
			pathSeed := baseSeed + int64(i)
			metrics := extractPathMetrics(result, i, pathSeed, cashFloor)
			pathMetrics = append(pathMetrics, metrics)
			finalNetWorths = append(finalNetWorths, finalNetWorth)
			successfulPaths++
		}

		// MEMORY OPTIMIZATION: Clear heavy data after extracting metrics
		// This allows GC to reclaim ~50KB per month × months per path
		result.MonthlyData = nil
		result.FinancialStressEvents = nil

		// PERF: Conditional GC based on memory pressure instead of fixed interval
		// Check memory every 50 paths (not 10) to reduce ReadMemStats overhead in WASM
		// Only force GC if heap usage is above threshold (50MB)
		// This avoids expensive stop-the-world GC when memory is not under pressure
		if (i+1)%50 == 0 {
			var memStats runtime.MemStats
			runtime.ReadMemStats(&memStats)
			const gcThresholdMB = 50 * 1024 * 1024 // 50MB
			if memStats.HeapInuse > gcThresholdMB {
				runtime.GC()
				if VERBOSE_DEBUG {
					simLogVerbose("🧹 [GC] Forced GC at path %d (HeapInuse: %.1fMB)", i+1, float64(memStats.HeapInuse)/(1024*1024))
				}
			}
		}

		// Early termination if too many errors
		if failedPaths > maxErrors {
			simLogVerbose("❌ MONTE-CARLO: ABORTED - Too many failures: %d errors in %d runs (max allowed: %d)",
				failedPaths, i+1, maxErrors)
			return SimulationResults{
				Success: false,
				Error:   fmt.Sprintf("Too many simulation failures: %d/%d", failedPaths, i+1),
			}
		}
	}

	if successfulPaths == 0 {
		simLogVerbose("❌ MONTE-CARLO: FAILED - No successful simulation runs out of %d attempts", numberOfRuns)
		return SimulationResults{
			Success: false,
			Error:   "No successful simulation runs",
		}
	}

	simLogVerbose("✅ MONTE-CARLO: Completed %d/%d successful runs (errors: %d, bankruptcies: %d)",
		successfulPaths, numberOfRuns, failedPaths, bankruptcyCount)

	// Calculate standard percentiles (P10-P90)
	percentiles := calculatePercentiles(finalNetWorths)

	// Calculate extended percentiles (P5, P10, P25, P50, P75, P90, P95)
	var terminalWealth, minCash []float64
	for _, m := range pathMetrics {
		terminalWealth = append(terminalWealth, m.TerminalWealth)
		minCash = append(minCash, m.MinCash)
	}
	twPct := calculatePercentilesExtended(terminalWealth)
	mcPct := calculatePercentilesExtended(minCash)

	// Calculate runway percentiles (conditional on breach)
	runwayP5, runwayP50, runwayP95, breachedCount := calculateRunwayPercentiles(pathMetrics)

	// Calculate breach time series
	breachTimeSeries := calculateBreachTimeSeries(pathMetrics, maxMonthsObserved)

	// Calculate ever-breach probability
	everBreachCount := 0
	for _, m := range pathMetrics {
		if m.CashFloorBreached {
			everBreachCount++
		}
	}
	everBreachProbability := 0.0
	if len(pathMetrics) > 0 {
		everBreachProbability = float64(everBreachCount) / float64(len(pathMetrics))
	}

	// Select exemplar path (reference only, no embedded trace)
	var exemplarPath *ExemplarPath
	if len(pathMetrics) > 0 {
		exemplarIdx := selectExemplarPath(pathMetrics)
		m := pathMetrics[exemplarIdx]
		exemplarPath = &ExemplarPath{
			PathIndex:          m.PathIndex,
			PathSeed:           m.PathSeed,
			TerminalWealth:     m.TerminalWealth,
			SelectionCriterion: "median_terminal_wealth",
		}
	}

	// Calculate probability of success (positive net worth)
	successCount := 0
	for _, nw := range finalNetWorths {
		if nw > 0 {
			successCount++
		}
	}
	probabilityOfSuccess := float64(successCount) / float64(len(finalNetWorths))

	// Calculate bankruptcy probability
	probabilityOfBankruptcy := float64(bankruptcyCount) / float64(successfulPaths)

	// Calculate bankruptcy timing percentiles
	bankruptcyTimingPercentiles := calculateBankruptcyTimingPercentiles(bankruptcyMonths)

	simLogVerbose("✅ MONTE-CARLO: SUCCESS - P50=$%.0f, ProbSuccess=%.1f%%, EverBreach=%.1f%%, Exemplar={idx:%d, seed:%d}",
		percentiles[2], probabilityOfSuccess*100, everBreachProbability*100,
		exemplarPath.PathIndex, exemplarPath.PathSeed)

	return SimulationResults{
		Success:                 true,
		NumberOfRuns:            successfulPaths,
		FinalNetWorthP10:        percentiles[0],
		FinalNetWorthP25:        percentiles[1],
		FinalNetWorthP50:        percentiles[2],
		FinalNetWorthP75:        percentiles[3],
		FinalNetWorthP90:        percentiles[4],
		ProbabilityOfSuccess:    probabilityOfSuccess,
		ProbabilityOfBankruptcy: probabilityOfBankruptcy,
		BankruptcyCount:         bankruptcyCount,
		BankruptcyMonthP10:      bankruptcyTimingPercentiles[0],
		BankruptcyMonthP25:      bankruptcyTimingPercentiles[1],
		BankruptcyMonthP50:      bankruptcyTimingPercentiles[2],
		BankruptcyMonthP75:      bankruptcyTimingPercentiles[3],
		BankruptcyMonthP90:      bankruptcyTimingPercentiles[4],

		// Extended percentiles
		FinalNetWorthP5:  twPct[0],
		FinalNetWorthP95: twPct[6],

		// Min cash KPIs
		MinCashP5:  mcPct[0],
		MinCashP50: mcPct[3],
		MinCashP95: mcPct[6],

		// Runway KPIs (conditional on breach)
		RunwayP5:          runwayP5,
		RunwayP50:         runwayP50,
		RunwayP95:         runwayP95,
		BreachedPathCount: breachedCount,

		// Breach probability time series
		BreachProbabilityByMonth: breachTimeSeries,

		// Ever-breach probability
		EverBreachProbability: everBreachProbability,

		// Exemplar path reference
		ExemplarPath: exemplarPath,

		// Audit fields
		BaseSeed:        baseSeed,
		SuccessfulPaths: successfulPaths,
		FailedPaths:     failedPaths,
	}
}

// calculatePercentiles calculates 10th, 25th, 50th, 75th, and 90th percentiles
func calculatePercentiles(values []float64) [5]float64 {
	if len(values) == 0 {
		return [5]float64{0, 0, 0, 0, 0}
	}

	// Simple sort-based percentile calculation
	// For production, consider using a more efficient algorithm
	sortedValues := make([]float64, len(values))
	copy(sortedValues, values)

	// Use Go's efficient built-in sort
	sort.Float64s(sortedValues)

	getPercentile := func(p float64) float64 {
		index := p * float64(len(sortedValues)-1)
		lower := int(math.Floor(index))
		upper := int(math.Ceil(index))

		if lower == upper {
			return sortedValues[lower]
		}

		weight := index - float64(lower)
		return sortedValues[lower]*(1-weight) + sortedValues[upper]*weight
	}

	return [5]float64{
		getPercentile(0.10), // 10th percentile
		getPercentile(0.25), // 25th percentile
		getPercentile(0.50), // 50th percentile (median)
		getPercentile(0.75), // 75th percentile
		getPercentile(0.90), // 90th percentile
	}
}

// calculateBankruptcyTimingPercentiles calculates bankruptcy timing percentiles
// Returns months when bankruptcy occurs at P10, P25, P50, P75, P90
// P10 = earliest 10% of bankruptcies, P90 = latest 10% of bankruptcies
func calculateBankruptcyTimingPercentiles(bankruptcyMonths []int) [5]int {
	if len(bankruptcyMonths) == 0 {
		return [5]int{0, 0, 0, 0, 0}
	}

	// Sort bankruptcy months
	sorted := make([]int, len(bankruptcyMonths))
	copy(sorted, bankruptcyMonths)
	sort.Ints(sorted)

	getPercentile := func(p float64) int {
		index := p * float64(len(sorted)-1)
		lower := int(math.Floor(index))
		upper := int(math.Ceil(index))

		if lower == upper {
			return sorted[lower]
		}

		// For integer months, round to nearest
		weight := index - float64(lower)
		interpolated := float64(sorted[lower])*(1-weight) + float64(sorted[upper])*weight
		return int(math.Round(interpolated))
	}

	return [5]int{
		getPercentile(0.10), // 10th percentile - earliest bankruptcies
		getPercentile(0.25), // 25th percentile
		getPercentile(0.50), // 50th percentile - median bankruptcy month
		getPercentile(0.75), // 75th percentile
		getPercentile(0.90), // 90th percentile - latest bankruptcies
	}
}

// calculatePercentilesExtended returns P5, P10, P25, P50, P75, P90, P95
// Uses linear interpolation (Type 7, same as NumPy default)
func calculatePercentilesExtended(values []float64) [7]float64 {
	if len(values) == 0 {
		return [7]float64{}
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	getPercentile := func(p float64) float64 {
		idx := p * float64(len(sorted)-1)
		lower, upper := int(math.Floor(idx)), int(math.Ceil(idx))
		if lower == upper {
			return sorted[lower]
		}
		weight := idx - float64(lower)
		return sorted[lower]*(1-weight) + sorted[upper]*weight
	}
	return [7]float64{
		getPercentile(0.05), getPercentile(0.10), getPercentile(0.25),
		getPercentile(0.50), getPercentile(0.75), getPercentile(0.90),
		getPercentile(0.95),
	}
}

// extractPathMetrics extracts KPI metrics from a single path result
// Breach defined as: End Cash < cashFloor (strict inequality)
// PERF: Uses incremental metrics when available (MC mode) to avoid iterating MonthlyData
func extractPathMetrics(result SimulationResult, pathIndex int, pathSeed int64, cashFloor float64) MCPathMetrics {
	metrics := MCPathMetrics{
		PathIndex:       pathIndex,
		PathSeed:        pathSeed,
		IsBankrupt:      result.IsBankrupt,
		BankruptcyMonth: result.BankruptcyMonth,
		RunwayMonths:    -1, // -1 = never breached
		MinCash:         math.MaxFloat64,
	}

	// PERF: Use incremental metrics if available (MC mode with trackMonthlyData=false)
	// This avoids iterating through 360 months of data for every path
	if result.MinCash > 0 || result.MinCashMonth >= 0 {
		// Incremental metrics available - use them directly
		metrics.MinCash = result.MinCash
		metrics.MinCashMonth = result.MinCashMonth
		metrics.CashFloorBreached = result.CashFloorBreachedMonth >= 0
		metrics.RunwayMonths = result.CashFloorBreachedMonth
		metrics.TerminalWealth = result.FinalNetWorth
	} else {
		// Fall back to iterating MonthlyData (deterministic mode or legacy)
		for _, month := range result.MonthlyData {
			cash := month.Accounts.Cash
			if cash < metrics.MinCash {
				metrics.MinCash = cash
				metrics.MinCashMonth = month.MonthOffset
			}
			if cash < cashFloor && !metrics.CashFloorBreached {
				metrics.CashFloorBreached = true
				metrics.RunwayMonths = month.MonthOffset
			}
		}
		if len(result.MonthlyData) > 0 {
			metrics.TerminalWealth = result.MonthlyData[len(result.MonthlyData)-1].NetWorth
		}
		if metrics.MinCash == math.MaxFloat64 {
			metrics.MinCash = 0 // No monthly data
		}
	}

	return metrics
}

// selectExemplarPath finds the path closest to median terminal wealth
func selectExemplarPath(pathMetrics []MCPathMetrics) int {
	if len(pathMetrics) == 0 {
		return 0
	}
	// Sort copy to find median value
	sorted := make([]MCPathMetrics, len(pathMetrics))
	copy(sorted, pathMetrics)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].TerminalWealth < sorted[j].TerminalWealth
	})
	medianWealth := sorted[len(sorted)/2].TerminalWealth
	// Find original index with closest terminal wealth
	for i, m := range pathMetrics {
		if m.TerminalWealth == medianWealth {
			return i
		}
	}
	return len(pathMetrics) / 2
}

// calculateBreachTimeSeries builds cumulative first-breach probability by month
func calculateBreachTimeSeries(pathMetrics []MCPathMetrics, maxMonths int) []MCBreachProbability {
	if maxMonths <= 0 || len(pathMetrics) == 0 {
		return nil
	}
	// Count first-breach events by month
	breachByMonth := make(map[int]int)
	for _, m := range pathMetrics {
		if m.CashFloorBreached && m.RunwayMonths >= 0 {
			breachByMonth[m.RunwayMonths]++
		}
	}
	// Build cumulative series
	result := make([]MCBreachProbability, maxMonths)
	cumulative := 0
	n := len(pathMetrics)
	for month := 0; month < maxMonths; month++ {
		newBreaches := breachByMonth[month]
		cumulative += newBreaches
		result[month] = MCBreachProbability{
			MonthOffset:          month,
			CumulativeBreachProb: float64(cumulative) / float64(n),
			NewBreachesThisMonth: newBreaches,
		}
	}
	return result
}

// calculateRunwayPercentiles computes percentiles ONLY for breached paths
func calculateRunwayPercentiles(pathMetrics []MCPathMetrics) (p5, p50, p95 int, count int) {
	var runways []float64
	for _, m := range pathMetrics {
		if m.CashFloorBreached && m.RunwayMonths >= 0 {
			runways = append(runways, float64(m.RunwayMonths))
		}
	}
	if len(runways) == 0 {
		return 0, 0, 0, 0
	}
	pct := calculatePercentilesExtended(runways)
	return int(pct[0]), int(pct[3]), int(pct[6]), len(runways)
}

// deepCopyInputAccounts creates a deep copy of AccountHoldingsMonthEnd for MC path isolation
// This ensures each path starts with fresh account state, preventing state pollution
func deepCopyInputAccounts(original AccountHoldingsMonthEnd) AccountHoldingsMonthEnd {
	result := AccountHoldingsMonthEnd{
		Cash: original.Cash,
	}

	// Deep copy each account with its holdings and lots
	copyAccount := func(acc *Account) *Account {
		if acc == nil {
			return nil
		}
		newAcc := &Account{
			TotalValue: acc.TotalValue,
			Holdings:   make([]Holding, len(acc.Holdings)),
		}
		for i, h := range acc.Holdings {
			newHolding := h // Copy the Holding struct
			// Deep copy the Lots slice
			if len(h.Lots) > 0 {
				newHolding.Lots = make([]TaxLot, len(h.Lots))
				copy(newHolding.Lots, h.Lots)
			}
			newAcc.Holdings[i] = newHolding
		}
		return newAcc
	}

	result.Taxable = copyAccount(original.Taxable)
	result.TaxDeferred = copyAccount(original.TaxDeferred)
	result.Roth = copyAccount(original.Roth)
	result.HSA = copyAccount(original.HSA)
	result.FiveTwoNine = copyAccount(original.FiveTwoNine)

	return result
}

// IsolatedPathOptions configures how an isolated simulation path should run
type IsolatedPathOptions struct {
	TrackMonthlyData bool // Whether to store full monthly snapshots (false for MC aggregation)
}

// RunIsolatedPath runs a single simulation path with proper isolation guarantees:
// 1. Unique deterministic seed (baseSeed + pathIndex)
// 2. Deep copied InitialAccounts to prevent state pollution
// 3. Fresh engine instance
//
// This is the ONLY correct way to run multiple paths from the same input.
// Using RunSingleSimulation directly risks state pollution bugs.
func RunIsolatedPath(input SimulationInput, pathIndex int, opts IsolatedPathOptions) SimulationResult {
	baseSeed := input.Config.RandomSeed

	// Create path-specific config with deterministic seed
	pathConfig := input.Config
	pathConfig.RandomSeed = baseSeed + int64(pathIndex)

	// CRITICAL: Deep copy input to prevent state pollution between paths
	// The original input.InitialAccounts contains pointers that would be mutated
	pathInput := input
	pathInput.Config = pathConfig
	pathInput.InitialAccounts = deepCopyInputAccounts(input.InitialAccounts)

	// Create fresh engine for this path
	engine := NewSimulationEngine(pathConfig)
	engine.trackMonthlyData = opts.TrackMonthlyData

	return engine.RunSingleSimulation(pathInput)
}

// ProcessAnnualTaxes processes taxes at the end of the year
func (se *SimulationEngine) ProcessAnnualTaxes(accounts *AccountHoldingsMonthEnd, monthOffset int, age int) error {
	// Only process taxes in December (month % 12 == 11)
	if monthOffset%12 != 11 {
		return nil
	}

	// Process Required Minimum Distributions first
	if err := se.processRMDs(accounts, age); err != nil {
		return fmt.Errorf("failed to process RMDs: %v", err)
	}

	// Calculate taxable portion of Social Security benefits
	provisionalIncome := se.ordinaryIncomeYTD + se.qualifiedDividendsYTD + se.capitalGainsYTD
	taxableSocialSecurity := se.taxCalculator.CalculateTaxableSocialSecurity(provisionalIncome, se.socialSecurityBenefitsYTD)

	// Add taxable Social Security to ordinary income
	adjustedOrdinaryIncome := se.ordinaryIncomeYTD + taxableSocialSecurity

	// Calculate current year for Medicare processing
	currentYear := se.currentYear + monthOffset/12  // ✅ FIX: Use simulation's start year instead of hard-coded 2024

	// Calculate MAGI for current year (AGI + tax-exempt interest + foreign income exclusions)
	// For simplified calculation, we'll use AGI as MAGI approximation
	currentYearMAGI := adjustedOrdinaryIncome + se.capitalGainsYTD + se.qualifiedDividendsYTD

	// Store MAGI in history for future IRMAA calculations
	se.magiHistory[currentYear] = currentYearMAGI

	// Get MAGI from two years ago for IRMAA calculation
	lookbackYear := currentYear - 2
	lookbackMAGI := se.magiHistory[lookbackYear] // Will be 0 if not available

	// Calculate Medicare premiums and IRMAA (for age 65+)
	totalMedicarePremium, partBPremium, partDPremium := se.taxCalculator.CalculateIRMAAEnhanced(
		currentYearMAGI, lookbackMAGI, currentYear, age)

	// Store individual premium components for detailed healthcare reporting
	// These will be used in the Healthcare tab of the Focus Year View
	_ = partBPremium // Part B premium for UI display
	_ = partDPremium // Part D premium for UI display

	// Calculate and pay annual taxes
	simLogVerbose("🎯 [TAX-CALCULATION] ProcessAnnualTaxes called: ordinaryIncome=$%.2f, capitalGains=$%.2f, dividends=$%.2f",
		adjustedOrdinaryIncome, se.capitalGainsYTD, se.qualifiedDividendsYTD)

	// UNIFIED INCOME FIX: Use adjustedOrdinaryIncome for BOTH income tax AND FICA calculation
	// This ensures that if ordinaryIncome exists, FICA is calculated correctly
	// Previously: employmentIncomeYTD and ordinaryIncomeYTD could get out of sync
	taxResult := se.taxCalculator.CalculateComprehensiveTaxWithFICA(
		adjustedOrdinaryIncome,
		se.capitalGainsYTD,
		0, // STCG (treated as ordinary income)
		se.qualifiedDividendsYTD,
		se.taxWithholdingYTD,
		se.estimatedPaymentsYTD,
		adjustedOrdinaryIncome,  // Use same income for FICA calculation (unified tracker)
		0,                       // Self-employment income (not implemented yet)
	)

	simLogVerbose("🎯 [TAX-RESULT] Tax calculation completed: TotalTax=$%.2f, FederalTax=$%.2f, StateTax=$%.2f",
		taxResult.TotalTax, taxResult.FederalIncomeTax, taxResult.StateIncomeTax)

	// Add Medicare premiums to tax liability (annual cost)
	annualMedicareCost := totalMedicarePremium * 12
	taxResult.IRMAAPremium = annualMedicareCost
	taxResult.TotalTax += annualMedicareCost

	// Store tax calculation results for MonthlyData
	se.lastTaxCalculationResults = &taxResult

	// Calculate unpaid tax liability for April settlement
	// Positive = we owe money, Negative = we get refund
	se.unpaidTaxLiability = taxResult.TotalTax - se.taxWithholdingYTD

	// Reset YTD tax tracking for new year
	taxYear := monthOffset / 12
	se.resetTaxYTD(taxYear)

	return nil
}

// processRMDs handles Required Minimum Distributions
func (se *SimulationEngine) processRMDs(accounts *AccountHoldingsMonthEnd, age int) error {
	taxDeferredAccount := GetTaxDeferredAccount(accounts)
	if age < 73 || taxDeferredAccount == nil || taxDeferredAccount.TotalValue <= 0 {
		return nil
	}

	// Calculate total RMD requirement for the year
	totalRmdRequired := CalculateRMD(age, taxDeferredAccount.TotalValue)
	if totalRmdRequired <= 0 {
		se.lastRMDAmount = 0
		return nil
	}

	// Subtract QCDs taken during the year from the RMD requirement
	remainingRmdRequired := math.Max(0, totalRmdRequired-se.qualifiedCharitableDistributionsYTD)

	// Store total RMD amount for MonthlyData (including QCD portion)
	se.lastRMDAmount = totalRmdRequired

	// Only process additional withdrawal if QCDs haven't satisfied the full RMD
	if remainingRmdRequired > 0 {
		withdrawalAmount := math.Min(remainingRmdRequired, taxDeferredAccount.TotalValue)

		// Proportionally reduce holdings in tax-deferred account
		if taxDeferredAccount.TotalValue > 0 {
			reductionFactor := 1.0 - (withdrawalAmount / taxDeferredAccount.TotalValue)
			for i := range taxDeferredAccount.Holdings {
				taxDeferredAccount.Holdings[i].CurrentMarketValueTotal *= reductionFactor
			}
			taxDeferredAccount.TotalValue -= withdrawalAmount
		}

		// Add remaining RMD to cash and ordinary income
		accounts.Cash += withdrawalAmount
		se.ordinaryIncomeYTD += withdrawalAmount
	}

	return nil
}

// ProcessIncome processes income events and tracks for tax purposes
func (se *SimulationEngine) ProcessIncome(amount float64, isQualifiedDividend bool, withholding float64) {
	// DEBUG: Log income processing to identify tax calculation issues
	simLogVerbose("🎯 [TAX-DEBUG] ProcessIncome called: amount=$%.2f, qualified=%t, withholding=$%.2f", amount, isQualifiedDividend, withholding)
	simLogVerbose("🎯 [TAX-DEBUG] Before: ordinaryIncomeYTD=$%.2f, qualifiedDividendsYTD=$%.2f", se.ordinaryIncomeYTD, se.qualifiedDividendsYTD)

	if isQualifiedDividend {
		se.qualifiedDividendsYTD += amount
	} else {
		se.ordinaryIncomeYTD += amount
	}

	if withholding > 0 {
		se.taxWithholdingYTD += withholding
		// Withholding is tracked here and used in December to calculate unpaidTaxLiability
	}

	simLogVerbose("🎯 [TAX-DEBUG] After: ordinaryIncomeYTD=$%.2f, qualifiedDividendsYTD=$%.2f, taxWithholdingYTD=$%.2f", se.ordinaryIncomeYTD, se.qualifiedDividendsYTD, se.taxWithholdingYTD)
}

// RegisterIncomeByTaxProfile routes income to the appropriate YTD tracker based on taxProfile
// This is the PFOS-E compliant method that the tax engine uses for all branching.
// Handlers should call this instead of directly manipulating YTD fields.
func (se *SimulationEngine) RegisterIncomeByTaxProfile(amount float64, taxProfile string, withholding float64) {
	simLogVerbose("🎯 [PFOS-E] RegisterIncomeByTaxProfile: amount=$%.2f, taxProfile=%s, withholding=$%.2f",
		amount, taxProfile, withholding)

	switch taxProfile {
	case "ordinary_income":
		se.ordinaryIncomeYTD += amount
	case "qualified_dividend":
		se.qualifiedDividendsYTD += amount
	case "capital_gain_ltcg":
		se.longTermCapitalGainsYTD += amount
	case "capital_gain_stcg":
		se.shortTermCapitalGainsYTD += amount
	case "social_security_benefit":
		se.socialSecurityBenefitsYTD += amount
	case "tax_exempt":
		se.taxExemptIncomeYTD += amount
	case "schedule_c":
		// Self-employment income: track separately AND add to ordinary income
		se.selfEmploymentIncomeYTD += amount
		se.ordinaryIncomeYTD += amount
	case "schedule_e":
		// Passive income: track separately AND add to ordinary income
		se.passiveIncomeYTD += amount
		se.ordinaryIncomeYTD += amount
	default:
		// PFOS-E INVARIANT 3: Fail loudly on missing/unknown taxProfile
		simLogVerbose("⚠️ [PFOS-E-ERROR] Unknown taxProfile '%s' - defaulting to ordinary_income", taxProfile)
		se.ordinaryIncomeYTD += amount
	}

	// Track withholding
	if withholding > 0 {
		se.taxWithholdingYTD += withholding
	}
}

// RecordDriverContribution records a contribution to a sensitivity driver
// This powers PFOS-E sensitivity charts and Simulation Packet narratives.
func (se *SimulationEngine) RecordDriverContribution(driverKey string, amount float64) {
	if driverKey == "" {
		simLogVerbose("⚠️ [PFOS-E-WARNING] Empty driverKey provided to RecordDriverContribution")
		return
	}

	if se.driverContributions == nil {
		se.driverContributions = make(map[string]float64)
	}

	se.driverContributions[driverKey] += amount
	simLogVerbose("📊 [PFOS-E] RecordDriverContribution: driverKey=%s, amount=$%.2f, cumulative=$%.2f",
		driverKey, amount, se.driverContributions[driverKey])
}

// GetDriverContributions returns the map of driver contributions for sensitivity analysis
func (se *SimulationEngine) GetDriverContributions() map[string]float64 {
	if se.driverContributions == nil {
		return make(map[string]float64)
	}
	// Return a copy to prevent external modification
	result := make(map[string]float64)
	for k, v := range se.driverContributions {
		result[k] = v
	}
	return result
}

// GetRealizedPathVariables returns the captured stochastic variables for each month
// Used for "show the math" transparency in PFOS-E stochastic simulations
func (se *SimulationEngine) GetRealizedPathVariables() []RealizedMonthVariables {
	return se.realizedPathVariables
}

// captureRealizedVariables captures the current month's stochastic variables
// Called at the end of each simulation month for "show the math" transparency
func (se *SimulationEngine) captureRealizedVariables(monthOffset int, startYear int, accounts AccountHoldingsMonthEnd) {
	if se.currentMonthReturns == nil {
		return // Not in stochastic mode or returns not yet generated
	}

	// Calculate the month string (YYYY-MM format)
	simulationYear := startYear + (monthOffset / 12)
	simulationMonth := (monthOffset % 12) + 1
	monthStr := fmt.Sprintf("%d-%02d", simulationYear, simulationMonth)

	// Calculate asset weights from current accounts
	assetWeights := make(map[string]float64)
	totalInvested := 0.0

	accountTypes := []*Account{
		GetTaxableAccount(&accounts),
		GetTaxDeferredAccount(&accounts),
		GetRothAccount(&accounts),
		GetFiveTwoNineAccount(&accounts),
		GetHSAAccount(&accounts),
	}

	for _, account := range accountTypes {
		if account == nil {
			continue
		}
		for _, holding := range account.Holdings {
			assetClass := string(holding.AssetClass)
			assetWeights[assetClass] += holding.CurrentMarketValueTotal
			totalInvested += holding.CurrentMarketValueTotal
		}
	}

	// Normalize weights to sum to 1.0
	if totalInvested > 0 {
		for k := range assetWeights {
			assetWeights[k] /= totalInvested
		}
	}

	realized := RealizedMonthVariables{
		MonthOffset:           monthOffset,
		Month:                 monthStr,
		SPYReturn:             se.currentMonthReturns.SPY,
		BNDReturn:             se.currentMonthReturns.BND,
		IntlReturn:            se.currentMonthReturns.Intl,
		OtherReturn:           se.currentMonthReturns.Other,
		IndividualStockReturn: se.currentMonthReturns.IndividualStock,
		Inflation:             se.currentMonthReturns.Inflation,
		HomeValueGrowth:       se.currentMonthReturns.Home,
		RentalIncomeGrowth:    se.currentMonthReturns.Rent,
		SPYVolatility:         se.stochasticState.SPYVolatility,
		BNDVolatility:         se.stochasticState.BNDVolatility,
		IntlVolatility:        se.stochasticState.IntlVolatility,
		InvestedBaseForReturn: totalInvested,
		AssetWeights:          assetWeights,
	}

	se.realizedPathVariables = append(se.realizedPathVariables, realized)
}

// ProcessDividendIncome processes dividend income with proper qualified vs ordinary tracking
func (se *SimulationEngine) ProcessDividendIncome(amount float64, isQualified bool, withholding float64) {
	if isQualified {
		se.qualifiedDividendsYTD += amount
	} else {
		se.ordinaryDividendsYTD += amount
		se.ordinaryIncomeYTD += amount // Ordinary dividends count as ordinary income for tax
	}

	if withholding > 0 {
		se.taxWithholdingYTD += withholding
	}
}

// ProcessInterestIncome processes interest income from cash accounts
func (se *SimulationEngine) ProcessInterestIncome(amount float64) {
	se.interestIncomeYTD += amount
	se.ordinaryIncomeYTD += amount // Interest income is taxed as ordinary income
}

// ApplyCashAccountInterest calculates and applies monthly interest to checking and savings accounts
func (se *SimulationEngine) ApplyCashAccountInterest(accounts *AccountHoldingsMonthEnd, config CashAccountConfig, monthOffset int) error {
	if accounts == nil {
		return fmt.Errorf("accounts cannot be nil")
	}

	totalInterestThisMonth := 0.0

	// Calculate checking account interest (if checking account exists)
	if accounts.Checking != nil && accounts.Checking.TotalValue > 0 {
		monthlyCheckingRate := math.Pow(1+float64(config.CheckingInterestRate), 1.0/12.0) - 1
		checkingInterest := accounts.Checking.TotalValue * monthlyCheckingRate
		accounts.Checking.TotalValue += checkingInterest
		totalInterestThisMonth += checkingInterest

		// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
		if VERBOSE_DEBUG && monthOffset < 12 { // Log first year only
			_ = fmt.Sprintf("💰 [CHECKING-INTEREST] Month %d: $%.2f balance × %.4f%% rate = $%.2f interest\n",
				monthOffset, accounts.Checking.TotalValue-checkingInterest, monthlyCheckingRate*100, checkingInterest)
		}
	}

	// Calculate savings account interest (if savings account exists)
	if accounts.Savings != nil && accounts.Savings.TotalValue > 0 {
		monthlySavingsRate := math.Pow(1+float64(config.SavingsInterestRate), 1.0/12.0) - 1
		savingsInterest := accounts.Savings.TotalValue * monthlySavingsRate
		accounts.Savings.TotalValue += savingsInterest
		totalInterestThisMonth += savingsInterest

		// PERF: Guard debug string with VERBOSE_DEBUG to avoid allocation in production
		if VERBOSE_DEBUG && monthOffset < 12 { // Log first year only
			_ = fmt.Sprintf("💰 [SAVINGS-INTEREST] Month %d: $%.2f balance × %.4f%% rate = $%.2f interest\n",
				monthOffset, accounts.Savings.TotalValue-savingsInterest, monthlySavingsRate*100, savingsInterest)
		}
	}

	// Track interest income for tax purposes
	if totalInterestThisMonth > 0 {
		se.ProcessInterestIncome(totalInterestThisMonth)
		se.currentMonthFlows.InterestIncomeThisMonth += totalInterestThisMonth // Track separately from general income
		se.currentMonthFlows.IncomeThisMonth += totalInterestThisMonth         // Also add to total income for cash flow
	}

	return nil
}

// ProcessCapitalGains processes capital gains/losses and tracks for tax purposes
func (se *SimulationEngine) ProcessCapitalGains(amount float64) {
	if amount > 0 {
		se.capitalGainsYTD += amount
	} else {
		se.capitalLossesYTD += math.Abs(amount)
	}
}

// enforcePreTaxContributionLimits enforces 401k/403b/Traditional IRA contribution limits
func (se *SimulationEngine) enforcePreTaxContributionLimits(contributionAmount *float64, currentMonth int) float64 {
	// Use comprehensive contribution limit tracker
	// Note: Age should be set externally before calling this function
	// Note: Reset is handled in ProcessAnnualTaxes (December) or manually for testing
	// Check if contribution is allowed and get capped amount
	maxAllowed := se.contributionLimitTracker.GetMaxAllowedContribution("tax_deferred", *contributionAmount)

	if maxAllowed <= 0 {
		// Already at limit, route everything to taxable
		excess := *contributionAmount
		*contributionAmount = 0
		ytd := se.contributionLimitTracker.GetYTDContribution("tax_deferred")
		limit := se.contributionLimitTracker.GetLimit("tax_deferred")
		simLogVerbose("🔍 PRE-TAX LIMIT EXCEEDED: YTD=$%.0f, Limit=$%.0f, Requested=$%.0f, All excess",
			ytd, limit, excess)
		return excess
	}

	if maxAllowed >= *contributionAmount {
		// Within limit, track contribution and no excess
		se.contributionLimitTracker.TrackContribution("tax_deferred", *contributionAmount)
		ytd := se.contributionLimitTracker.GetYTDContribution("tax_deferred")
		limit := se.contributionLimitTracker.GetLimit("tax_deferred")
		simLogVerbose("🔍 PRE-TAX WITHIN LIMIT: YTD=$%.0f, Limit=$%.0f, Contributing=$%.0f",
			ytd, limit, *contributionAmount)
		return 0
	}

	// Partially exceeds limit
	excess := *contributionAmount - maxAllowed
	*contributionAmount = maxAllowed
	se.contributionLimitTracker.TrackContribution("tax_deferred", maxAllowed)
	ytd := se.contributionLimitTracker.GetYTDContribution("tax_deferred")
	limit := se.contributionLimitTracker.GetLimit("tax_deferred")
	simLogVerbose("🔍 PRE-TAX PARTIAL LIMIT: YTD=$%.0f, Limit=$%.0f, Contributing=$%.0f, Excess=$%.0f",
		ytd, limit, *contributionAmount, excess)
	return excess
}

// enforceRothContributionLimits enforces Roth IRA contribution limits
func (se *SimulationEngine) enforceRothContributionLimits(contributionAmount *float64, currentMonth int) float64 {
	// Use comprehensive contribution limit tracker
	// Note: Age should be set externally before calling this function
	// Note: Reset is handled in ProcessAnnualTaxes (December) or manually for testing
	// Note: "roth" account type uses IRA limits ($7k base + $1k catch-up at age 50+)
	maxAllowed := se.contributionLimitTracker.GetMaxAllowedContribution("roth", *contributionAmount)

	if maxAllowed <= 0 {
		// Already at limit, route everything to taxable
		excess := *contributionAmount
		*contributionAmount = 0
		ytd := se.contributionLimitTracker.GetYTDContribution("roth")
		limit := se.contributionLimitTracker.GetLimit("roth")
		simLogVerbose("🔍 ROTH LIMIT EXCEEDED: YTD=$%.0f, Limit=$%.0f, Requested=$%.0f, All excess",
			ytd, limit, excess)
		return excess
	}

	if maxAllowed >= *contributionAmount {
		// Within limit, track contribution and no excess
		se.contributionLimitTracker.TrackContribution("roth", *contributionAmount)
		ytd := se.contributionLimitTracker.GetYTDContribution("roth")
		limit := se.contributionLimitTracker.GetLimit("roth")
		simLogVerbose("🔍 ROTH WITHIN LIMIT: YTD=$%.0f, Limit=$%.0f, Contributing=$%.0f",
			ytd, limit, *contributionAmount)
		return 0
	}

	// Partially exceeds limit
	excess := *contributionAmount - maxAllowed
	*contributionAmount = maxAllowed
	se.contributionLimitTracker.TrackContribution("roth", maxAllowed)
	ytd := se.contributionLimitTracker.GetYTDContribution("roth")
	limit := se.contributionLimitTracker.GetLimit("roth")
	simLogVerbose("🔍 ROTH PARTIAL LIMIT: YTD=$%.0f, Limit=$%.0f, Contributing=$%.0f, Excess=$%.0f",
		ytd, limit, *contributionAmount, excess)
	return excess
}

// resetTaxYTD resets year-to-date tax tracking
func (se *SimulationEngine) resetTaxYTD(taxYear int) {
	se.taxWithholdingYTD = 0
	se.estimatedPaymentsYTD = 0
	se.ordinaryIncomeYTD = 0
	se.capitalGainsYTD = 0
	se.capitalLossesYTD = 0
	se.qualifiedDividendsYTD = 0
	se.ordinaryDividendsYTD = 0
	se.interestIncomeYTD = 0
	se.shortTermCapitalGainsYTD = 0
	se.longTermCapitalGainsYTD = 0
	se.socialSecurityBenefitsYTD = 0
	se.qualifiedCharitableDistributionsYTD = 0
	se.itemizedDeductibleInterestYTD = 0
	se.preTaxContributionsYTD = 0

	// Note: unpaidTaxLiability is NOT reset here
	// It's set in December and paid in April, then reset to 0 in TAX_PAYMENT handler
}

// CalculateTaxOwed calculates current tax liability
func (se *SimulationEngine) CalculateTaxOwed() TaxCalculationResult {
	// UNIFIED INCOME FIX: Use ordinaryIncomeYTD for BOTH income tax AND FICA calculation
	return se.taxCalculator.CalculateComprehensiveTaxWithFICA(
		se.ordinaryIncomeYTD,
		se.capitalGainsYTD,
		0, // STCG
		se.qualifiedDividendsYTD,
		se.taxWithholdingYTD,
		se.estimatedPaymentsYTD,
		se.ordinaryIncomeYTD,    // Use unified income tracker for FICA calculation
		0,                       // Self-employment income (not implemented yet)
	)
}

// Add debt processing structures and functions
type Liability struct {
	ID                         string  `json:"id"`
	Type                       string  `json:"type"` // "mortgage", "student", "auto", "credit_card"
	CurrentPrincipalBalance    float64 `json:"currentPrincipalBalance"`
	OriginalPrincipalBalance   float64 `json:"originalPrincipalBalance"`
	AnnualInterestRate         float64 `json:"annualInterestRate"`
	MonthlyPayment             float64 `json:"monthlyPayment"`
	RemainingTermInMonths      int     `json:"remainingTermInMonths"`
	PropertyTaxAnnual          float64 `json:"propertyTaxAnnual,omitempty"`
	HomeownersInsuranceAnnual  float64 `json:"homeownersInsuranceAnnual,omitempty"`
	PMIAnnual                  float64 `json:"pmiAnnual,omitempty"`
	PropertyTaxDeductible      bool    `json:"propertyTaxDeductible"`
	MortgageInterestDeductible bool    `json:"mortgageInterestDeductible"`
}

type MortgagePITI struct {
	Principal float64 `json:"principal"`
	Interest  float64 `json:"interest"`
	Taxes     float64 `json:"taxes"`
	Insurance float64 `json:"insurance"`
	PMI       float64 `json:"pmi"`
	TotalPITI float64 `json:"totalPITI"`
}

// DebtServiceAnalysis tracks debt payment requirements and missed payments
type DebtServiceAnalysis struct {
	TotalMonthlyRequired    float64              `json:"totalMonthlyRequired"`    // Total required payments
	TotalPaymentsMade       float64              `json:"totalPaymentsMade"`       // Actual payments made
	TotalMissedPayments     float64              `json:"totalMissedPayments"`     // Cumulative missed payments
	ConsecutiveMissedMonths int                  `json:"consecutiveMissedMonths"` // Consecutive months of missed payments
	DebtServiceRatio        float64              `json:"debtServiceRatio"`        // Required payments / gross income
	FailedPaymentDetails    []DebtPaymentFailure `json:"failedPaymentDetails"`
}

// DebtPaymentFailure tracks individual debt payment failures
type DebtPaymentFailure struct {
	DebtID          string  `json:"debtId"`
	DebtType        string  `json:"debtType"`
	RequiredPayment float64 `json:"requiredPayment"`
	AmountShort     float64 `json:"amountShort"`
	MonthOffset     int     `json:"monthOffset"`
}

// CalculateRealisticMonthlyPayment calculates realistic minimum payment for different debt types
func CalculateRealisticMonthlyPayment(liability *Liability) float64 {
	switch liability.Type {
	case "credit_card":
		// Credit card: Minimum 2% of balance or $25, whichever is higher
		// Use typical credit card APR if not specified (21% average)
		interestRate := liability.AnnualInterestRate
		if interestRate == 0 {
			interestRate = 0.21 // 21% typical credit card APR
		}
		monthlyInterest := liability.CurrentPrincipalBalance * (interestRate / 12)
		minimumPayment := math.Max(liability.CurrentPrincipalBalance*0.02, 25.0) // 2% or $25 minimum
		return math.Max(monthlyInterest+10, minimumPayment)                      // At least interest + small principal

	case "student":
		// Student loan: Use existing payment or calculate standard 10-year repayment
		if liability.MonthlyPayment > 0 {
			return liability.MonthlyPayment
		}
		// Calculate 10-year standard repayment (typical rate 5.5%)
		interestRate := liability.AnnualInterestRate
		if interestRate == 0 {
			interestRate = 0.055 // 5.5% typical student loan rate
		}
		monthlyRate := interestRate / 12
		numPayments := 120.0 // 10 years
		if numPayments > 0 && monthlyRate > 0 {
			payment := (liability.CurrentPrincipalBalance * monthlyRate * math.Pow(1+monthlyRate, numPayments)) /
				(math.Pow(1+monthlyRate, numPayments) - 1)
			return payment
		}
		return liability.CurrentPrincipalBalance * 0.01 // Fallback: 1% of balance

	case "auto":
		// Auto loan: Use existing payment or calculate based on typical 5-year term
		if liability.MonthlyPayment > 0 {
			return liability.MonthlyPayment
		}
		// Calculate payment for remaining term (typical rate 7%)
		interestRate := liability.AnnualInterestRate
		if interestRate == 0 {
			interestRate = 0.07 // 7% typical auto loan rate
		}
		monthlyRate := interestRate / 12
		remainingPayments := float64(liability.RemainingTermInMonths)
		if remainingPayments > 0 && monthlyRate > 0 {
			payment := (liability.CurrentPrincipalBalance * monthlyRate * math.Pow(1+monthlyRate, remainingPayments)) /
				(math.Pow(1+monthlyRate, remainingPayments) - 1)
			return payment
		}
		return liability.CurrentPrincipalBalance * 0.02 // Fallback: 2% of balance

	case "mortgage":
		// Mortgage: Use PITI calculation
		piti := CalculateMortgagePITI(liability)
		return piti.TotalPITI

	case "personal":
		// Personal loan: Use existing payment or calculate based on typical terms
		if liability.MonthlyPayment > 0 {
			return liability.MonthlyPayment
		}
		// Calculate payment (typical rate 12%, 3-5 year term)
		interestRate := liability.AnnualInterestRate
		if interestRate == 0 {
			interestRate = 0.12 // 12% typical personal loan rate
		}
		monthlyRate := interestRate / 12
		remainingPayments := float64(liability.RemainingTermInMonths)
		if remainingPayments <= 0 {
			remainingPayments = 36 // Default 3-year term
		}
		if monthlyRate > 0 {
			payment := (liability.CurrentPrincipalBalance * monthlyRate * math.Pow(1+monthlyRate, remainingPayments)) /
				(math.Pow(1+monthlyRate, remainingPayments) - 1)
			return payment
		}
		return liability.CurrentPrincipalBalance * 0.03 // Fallback: 3% of balance

	default:
		// Generic debt: Use existing payment or fallback calculation
		if liability.MonthlyPayment > 0 {
			return liability.MonthlyPayment
		}
		// Fallback: Interest + 1% principal
		monthlyInterest := liability.CurrentPrincipalBalance * (liability.AnnualInterestRate / 12)
		return monthlyInterest + (liability.CurrentPrincipalBalance * 0.01)
	}
}

// Calculate monthly mortgage payment including PITI components
func CalculateMortgagePITI(mortgage *Liability) MortgagePITI {
	monthlyInterestRate := mortgage.AnnualInterestRate / 12
	interestPayment := mortgage.CurrentPrincipalBalance * monthlyInterestRate

	// Calculate principal payment (assuming fixed payment schedule)
	principalPayment := math.Max(0, mortgage.MonthlyPayment-interestPayment)

	// Calculate monthly property tax and insurance
	monthlyPropertyTax := mortgage.PropertyTaxAnnual / 12
	monthlyInsurance := mortgage.HomeownersInsuranceAnnual / 12
	monthlyPMI := mortgage.PMIAnnual / 12

	totalPITI := principalPayment + interestPayment + monthlyPropertyTax + monthlyInsurance + monthlyPMI

	return MortgagePITI{
		Principal: principalPayment,
		Interest:  interestPayment,
		Taxes:     monthlyPropertyTax,
		Insurance: monthlyInsurance,
		PMI:       monthlyPMI,
		TotalPITI: totalPITI,
	}
}

// ConvertLiabilityInfoToLiability converts LiabilityInfo to Liability for PITI processing
func ConvertLiabilityInfoToLiability(info *LiabilityInfo) *Liability {
	return &Liability{
		ID:                         info.ID,
		Type:                       strings.ToLower(info.Type), // Convert "MORTGAGE" to "mortgage"
		CurrentPrincipalBalance:    info.CurrentPrincipalBalance,
		OriginalPrincipalBalance:   info.CurrentPrincipalBalance, // Assume same for new loans
		AnnualInterestRate:         info.InterestRate,
		MonthlyPayment:             info.MonthlyPayment,
		RemainingTermInMonths:      info.TermRemainingMonths,
		PropertyTaxAnnual:          info.PropertyTaxAnnual,
		HomeownersInsuranceAnnual:  info.HomeownersInsuranceAnnual,
		PMIAnnual:                  info.PMIAnnual,
		PropertyTaxDeductible:      info.PropertyTaxDeductible,
		MortgageInterestDeductible: info.MortgageInterestDeductible,
	}
}

// GetPITIForMortgage calculates PITI for a LiabilityInfo mortgage - Enhanced mortgage modeling
func GetPITIForMortgage(info *LiabilityInfo) MortgagePITI {
	if strings.ToLower(info.Type) != "mortgage" {
		return MortgagePITI{} // Return zero PITI for non-mortgages
	}

	// Convert to Liability and calculate PITI using existing infrastructure
	liability := ConvertLiabilityInfoToLiability(info)
	return CalculateMortgagePITI(liability)
}

// Process monthly debt payments
func (se *SimulationEngine) ProcessMonthlyDebtPayments(accounts *AccountHoldingsMonthEnd, liabilities []Liability) {
	// Reset debt service analysis for this month
	se.debtServiceAnalysis = DebtServiceAnalysis{
		FailedPaymentDetails: []DebtPaymentFailure{},
	}

	totalRequiredPayments := 0.0
	totalPaymentsMade := 0.0
	paymentShortfall := 0.0

	// Calculate total required payments and attempt to make payments
	for i := range liabilities {
		liability := &liabilities[i]

		if liability.CurrentPrincipalBalance <= 0 || liability.RemainingTermInMonths <= 0 {
			continue
		}

		requiredPayment := CalculateRealisticMonthlyPayment(liability)
		totalRequiredPayments += requiredPayment

		if liability.Type == "mortgage" {
			paymentMade := se.processMortgagePaymentWithTracking(accounts, liability, requiredPayment)
			totalPaymentsMade += paymentMade
			if paymentMade < requiredPayment {
				paymentShortfall += (requiredPayment - paymentMade)
			}
		} else {
			paymentMade := se.processGeneralDebtPaymentWithTracking(accounts, liability, requiredPayment)
			totalPaymentsMade += paymentMade
			if paymentMade < requiredPayment {
				paymentShortfall += (requiredPayment - paymentMade)
			}
		}
	}

	// Update debt service analysis
	se.debtServiceAnalysis.TotalMonthlyRequired = totalRequiredPayments
	se.debtServiceAnalysis.TotalPaymentsMade = totalPaymentsMade
	se.debtServiceAnalysis.TotalMissedPayments += paymentShortfall

	// Update consecutive missed payments counter
	if paymentShortfall > 10 { // Allow for small rounding errors
		se.consecutiveMissedPayments++
		se.debtServiceAnalysis.ConsecutiveMissedMonths = se.consecutiveMissedPayments
	} else {
		se.consecutiveMissedPayments = 0
		se.debtServiceAnalysis.ConsecutiveMissedMonths = 0
	}

	// Calculate debt service ratio (will be used in bankruptcy evaluation)
	monthlyIncome := se.ordinaryIncomeYTD // This is YTD, but gives us a rough monthly estimate
	if monthlyIncome > 0 {
		se.debtServiceAnalysis.DebtServiceRatio = totalRequiredPayments / (monthlyIncome / 12)
		se.debtServiceRatio = se.debtServiceAnalysis.DebtServiceRatio
	}
}

// processMortgagePaymentWithTracking processes mortgage payments with detailed tracking
func (se *SimulationEngine) processMortgagePaymentWithTracking(accounts *AccountHoldingsMonthEnd, mortgage *Liability, requiredPayment float64) float64 {
	piti := CalculateMortgagePITI(mortgage)
	paymentAttempted := piti.TotalPITI

	if accounts.Cash >= paymentAttempted {
		// Full payment possible
		accounts.Cash -= paymentAttempted
		mortgage.CurrentPrincipalBalance -= piti.Principal
		mortgage.RemainingTermInMonths -= 1

		// Handle tax-deductible components
		if mortgage.MortgageInterestDeductible {
			se.ordinaryIncomeYTD -= piti.Interest // Deduction reduces taxable income
		}
		if mortgage.PropertyTaxDeductible {
			se.ordinaryIncomeYTD -= piti.Taxes
		}

		return paymentAttempted
	} else {
		// Cannot make full payment - record failure and attempt partial payment
		amountShort := paymentAttempted - accounts.Cash
		se.debtServiceAnalysis.FailedPaymentDetails = append(se.debtServiceAnalysis.FailedPaymentDetails,
			DebtPaymentFailure{
				DebtID:          mortgage.ID,
				DebtType:        mortgage.Type,
				RequiredPayment: paymentAttempted,
				AmountShort:     amountShort,
				MonthOffset:     0, // Will be set by caller if needed
			})

		// Use all available cash for partial payment
		partialPayment := accounts.Cash
		accounts.Cash = 0

		// Apply partial payment (interest first, then principal)
		if partialPayment > piti.Interest {
			principalPortion := partialPayment - piti.Interest
			mortgage.CurrentPrincipalBalance -= principalPortion
		}

		return partialPayment
	}
}

// processGeneralDebtPaymentWithTracking processes non-mortgage debt with detailed tracking
func (se *SimulationEngine) processGeneralDebtPaymentWithTracking(accounts *AccountHoldingsMonthEnd, liability *Liability, requiredPayment float64) float64 {
	monthlyInterestRate := liability.AnnualInterestRate / 12
	interestThisMonth := liability.CurrentPrincipalBalance * monthlyInterestRate
	principalPaidThisMonth := requiredPayment - interestThisMonth

	// Ensure principal payment is not negative
	if principalPaidThisMonth < 0 {
		principalPaidThisMonth = 0
	}

	// Ensure we don't pay more principal than remaining balance
	if liability.CurrentPrincipalBalance-principalPaidThisMonth < 0 {
		principalPaidThisMonth = liability.CurrentPrincipalBalance
	}

	paymentThisMonth := interestThisMonth + principalPaidThisMonth

	if accounts.Cash >= paymentThisMonth {
		// Full payment possible
		accounts.Cash -= paymentThisMonth
		liability.CurrentPrincipalBalance -= principalPaidThisMonth
		liability.RemainingTermInMonths -= 1

		// Handle tax-deductible interest for student loans
		if liability.Type == "student" {
			maxStudentLoanDeduction := 2500.0 / 12 // Monthly limit
			additionalDeduction := math.Min(interestThisMonth, maxStudentLoanDeduction)
			se.ordinaryIncomeYTD -= additionalDeduction // Above-the-line deduction
		}

		return paymentThisMonth
	} else {
		// Cannot make full payment - record failure and attempt partial payment
		amountShort := paymentThisMonth - accounts.Cash
		se.debtServiceAnalysis.FailedPaymentDetails = append(se.debtServiceAnalysis.FailedPaymentDetails,
			DebtPaymentFailure{
				DebtID:          liability.ID,
				DebtType:        liability.Type,
				RequiredPayment: paymentThisMonth,
				AmountShort:     amountShort,
				MonthOffset:     0, // Will be set by caller if needed
			})

		// Use all available cash for partial payment
		partialPayment := accounts.Cash
		accounts.Cash = 0

		// Apply partial payment (interest first, then principal)
		if partialPayment > interestThisMonth {
			principalPortion := partialPayment - interestThisMonth
			liability.CurrentPrincipalBalance -= principalPortion
		}
		// Note: If partial payment doesn't cover interest, debt grows (realistic for high-interest debt)

		return partialPayment
	}
}

// Legacy function for backward compatibility - Process mortgage payments with PITI breakdown
func (se *SimulationEngine) processMortgagePayment(accounts *AccountHoldingsMonthEnd, mortgage *Liability) {
	piti := CalculateMortgagePITI(mortgage)

	if accounts.Cash >= piti.TotalPITI {
		// Deduct total PITI payment from cash
		accounts.Cash -= piti.TotalPITI

		// Update mortgage principal balance
		mortgage.CurrentPrincipalBalance -= piti.Principal
		mortgage.RemainingTermInMonths -= 1

		// Handle tax-deductible components
		if mortgage.MortgageInterestDeductible {
			// Add mortgage interest to itemized deductions
			se.ordinaryIncomeYTD -= piti.Interest // Deduction reduces taxable income
		}

		if mortgage.PropertyTaxDeductible {
			// Add property taxes to itemized deductions (subject to SALT cap)
			saltCap := 10000.0                 // Annual SALT cap
			currentSALT := se.capitalLossesYTD // Reuse this field for SALT tracking
			additionalSALT := math.Min(piti.Taxes, math.Max(0, saltCap/12-currentSALT))
			se.capitalLossesYTD = currentSALT + additionalSALT
			se.ordinaryIncomeYTD -= additionalSALT
		}
	}
}

// Process general debt payments
func (se *SimulationEngine) processGeneralDebtPayment(accounts *AccountHoldingsMonthEnd, liability *Liability) {
	monthlyInterestRate := liability.AnnualInterestRate / 12
	interestThisMonth := liability.CurrentPrincipalBalance * monthlyInterestRate
	principalPaidThisMonth := liability.MonthlyPayment - interestThisMonth

	// Ensure principal payment is not negative
	if principalPaidThisMonth < 0 {
		principalPaidThisMonth = 0
	}

	// Ensure we don't pay more principal than remaining balance
	if liability.CurrentPrincipalBalance-principalPaidThisMonth < 0 {
		principalPaidThisMonth = liability.CurrentPrincipalBalance
	}

	paymentThisMonth := interestThisMonth + principalPaidThisMonth

	if accounts.Cash >= paymentThisMonth {
		accounts.Cash -= paymentThisMonth
		liability.CurrentPrincipalBalance -= principalPaidThisMonth
		liability.RemainingTermInMonths -= 1

		// Handle tax-deductible interest for student loans
		if liability.Type == "student" {
			maxStudentLoanDeduction := 2500.0 / 12 // Monthly limit
			additionalDeduction := math.Min(interestThisMonth, maxStudentLoanDeduction)
			se.ordinaryIncomeYTD -= additionalDeduction // Above-the-line deduction
		}
	}
}

// Add withdrawal strategy functions
type WithdrawalStrategy string

const (
	ConstantWithdrawal  WithdrawalStrategy = "CONSTANT_WITHDRAWAL"
	InflationAdjusted   WithdrawalStrategy = "INFLATION_ADJUSTED"
	VPWWithdrawal       WithdrawalStrategy = "VPW_WITHDRAWAL"
	GuardRailWithdrawal WithdrawalStrategy = "GUARDRAIL_WITHDRAWAL"
)

// Calculate withdrawal amount based on strategy
func CalculateWithdrawalAmount(
	strategy WithdrawalStrategy,
	portfolioValue float64,
	baseWithdrawalRate float64,
	inflationRate float64,
	lastWithdrawal float64,
	config StochasticModelConfig,
) float64 {
	switch strategy {
	case ConstantWithdrawal:
		return portfolioValue * baseWithdrawalRate / 12 // Monthly withdrawal

	case InflationAdjusted:
		if lastWithdrawal > 0 {
			return lastWithdrawal * (1 + inflationRate) // Adjust last withdrawal for inflation
		}
		return portfolioValue * baseWithdrawalRate / 12

	case VPWWithdrawal:
		// Variable Percentage Withdrawal - adjust based on portfolio performance
		adjustedRate := baseWithdrawalRate * (1 + (inflationRate - 0.025)) // Adjust for inflation vs target
		return portfolioValue * adjustedRate / 12

	case GuardRailWithdrawal:
		return calculateDynamicWithdrawal(portfolioValue, lastWithdrawal, config)

	default:
		return portfolioValue * baseWithdrawalRate / 12
	}
}

// Calculate dynamic withdrawal with guardrails
func calculateDynamicWithdrawal(portfolioValue float64, baseWithdrawalAmount float64, config StochasticModelConfig) float64 {
	if portfolioValue <= 0 || baseWithdrawalAmount <= 0 {
		return 0
	}

	currentWithdrawalRate := baseWithdrawalAmount / portfolioValue

	if currentWithdrawalRate > config.Guardrails.UpperGuardrail {
		// Spending cut triggered
		return baseWithdrawalAmount * (1 - config.Guardrails.SpendingCutPct)
	} else if currentWithdrawalRate < config.Guardrails.LowerGuardrail {
		// Spending bonus triggered
		return baseWithdrawalAmount * (1 + config.Guardrails.SpendingBonusPct)
	}

	// No adjustment needed
	return baseWithdrawalAmount
}

// Mathematical helper functions are defined in math.go

// Helper function to get string from metadata map
func getStringFromMetadata(metadata map[string]interface{}, key string, defaultVal string) string {
	if metadata == nil {
		return defaultVal
	}
	if val, exists := metadata[key]; exists {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultVal
}

// Helper function to get float64 from metadata map
func getFloat64FromMetadata(metadata map[string]interface{}, key string, defaultVal float64) float64 {
	if metadata == nil {
		return defaultVal
	}
	if val, exists := metadata[key]; exists {
		if f, ok := val.(float64); ok {
			return f
		}
	}
	return defaultVal
}

// Helper function to get bool from metadata map
func getBoolFromMetadata(metadata map[string]interface{}, key string, defaultVal bool) bool {
	if metadata == nil {
		return defaultVal
	}
	if val, exists := metadata[key]; exists {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return defaultVal
}

// processInvestmentContribution handles investment contributions to accounts
func (se *SimulationEngine) processInvestmentContribution(accounts *AccountHoldingsMonthEnd, amount float64, targetAccount string, assetClass AssetClass) {
	if amount <= 0 {
		return
	}

	var targetAcct *Account
	switch targetAccount {
	case "taxable":
		if GetTaxableAccount(accounts) == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = GetTaxableAccount(accounts)
	case "tax_deferred":
		if GetTaxDeferredAccount(accounts) == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = GetTaxDeferredAccount(accounts)
	case "roth":
		if GetRothAccount(accounts) == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = GetRothAccount(accounts)
	default:
		// Default to taxable
		if GetTaxableAccount(accounts) == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = GetTaxableAccount(accounts)
	}

	// PHASE 1.2: Use centralized holding creation (default to month 0 for legacy calls)
	currentMonth := 0 // Default month for legacy processInvestmentContribution calls
	if err := se.cashManager.AddHoldingWithLotTracking(targetAcct, assetClass, amount, currentMonth); err != nil {
		// PHASE 1.2: Log error instead of using deprecated fallback
		simLogVerbose("INVESTMENT-CONTRIBUTION-LEGACY FAILED: %v", err)
		return
	}
	simLogVerbose("INVESTMENT-CONTRIBUTION-LEGACY SUCCESS: account value now %.0f", targetAcct.TotalValue)
}



// processPortfolioRebalance handles portfolio rebalancing
func (se *SimulationEngine) processPortfolioRebalance(event FinancialEvent, accounts *AccountHoldingsMonthEnd) {
	// Extract rebalancing parameters from event metadata
	rebalancingParams := se.extractRebalancingParams(event)
	assetAllocation := se.extractAssetAllocation(event)
	assetLocation := AssetLocationPreferences{} // Default empty preferences

	currentMonth := int(event.MonthOffset)

	// Execute rebalancing using the sophisticated StrategyProcessor
	err := se.strategyProcessor.ProcessRebalancing(
		accounts,
		rebalancingParams,
		assetAllocation,
		assetLocation,
		currentMonth,
	)

	if err != nil {
		simLogVerbose("REBALANCE-ERROR: Rebalancing failed for month %d: %v", currentMonth, err)
		return
	}

	simLogVerbose("REBALANCE-SUCCESS: Portfolio rebalanced for month %d", currentMonth)
}

// extractRebalancingParams extracts rebalancing parameters from event metadata
func (se *SimulationEngine) extractRebalancingParams(event FinancialEvent) RebalancingParameters {
	// Default rebalancing parameters
	params := RebalancingParameters{
		Method:              "threshold",
		ThresholdPercentage: 0.05, // 5% threshold
		Frequency:           "quarterly",
		MinimumTradeSize:    1000.0,
		TaxAwarenessLevel:   "basic",
	}

	// Override with values from event metadata if available
	if method, ok := event.Metadata["rebalanceMethod"].(string); ok {
		params.Method = method
	}
	if threshold, ok := event.Metadata["rebalanceThreshold"].(float64); ok {
		params.ThresholdPercentage = threshold
	}
	if frequency, ok := event.Metadata["rebalanceFrequency"].(string); ok {
		params.Frequency = frequency
	}
	if minTradeSize, ok := event.Metadata["minTradeSize"].(float64); ok {
		params.MinimumTradeSize = minTradeSize
	}

	return params
}

// extractAssetAllocation extracts asset allocation strategy from event metadata using unified strategySettings
func (se *SimulationEngine) extractAssetAllocation(event FinancialEvent) AssetAllocationStrategy {
	// Default balanced allocation
	defaultAllocations := map[AssetClass]float64{
		AssetClassUSStocksTotalMarket:   0.60, // 60% US stocks
		AssetClassUSBondsTotalMarket:    0.30, // 30% bonds
		AssetClassInternationalStocks:   0.10, // 10% international stocks
	}

	strategy := AssetAllocationStrategy{
		StrategyType:       "fixed",
		Allocations:        defaultAllocations,
		RebalanceThreshold: 0.05,
	}

	// CONSISTENCY FIX: Use unified strategySettings approach instead of legacy metadata keys
	if event.Metadata != nil {
		// First priority: Check for unified strategySettings object
		if settings, ok := event.Metadata["strategySettings"].(StrategySettings); ok {
			strategy.StrategyType = settings.AssetAllocation.StrategyType
			strategy.Allocations = settings.AssetAllocation.Allocations
			strategy.RebalanceThreshold = settings.Rebalancing.ThresholdPercentage
			return strategy
		}

		// Second priority: Check for strategySettings as a map (for JSON deserialization compatibility)
		if settingsMap, ok := event.Metadata["strategySettings"].(map[string]interface{}); ok {
			if assetAllocation, ok := settingsMap["assetAllocation"].(map[string]interface{}); ok {
				if strategyType, ok := assetAllocation["strategyType"].(string); ok {
					strategy.StrategyType = strategyType
				}
				if allocations, ok := assetAllocation["allocations"].(map[string]interface{}); ok {
					customAllocations := make(map[AssetClass]float64)
					for assetStr, percentInterface := range allocations {
						if percent, ok := percentInterface.(float64); ok {
							assetClass := NormalizeAssetClass(AssetClass(assetStr))
							customAllocations[assetClass] = percent
						}
					}
					if len(customAllocations) > 0 {
						strategy.Allocations = customAllocations
					}
				}
			}
			if rebalancing, ok := settingsMap["rebalancing"].(map[string]interface{}); ok {
				if threshold, ok := rebalancing["thresholdPercentage"].(float64); ok {
					strategy.RebalanceThreshold = threshold
				}
			}
			return strategy
		}

		// Legacy fallback: Support old metadata keys for backward compatibility
		if strategyType, ok := event.Metadata["allocationStrategy"].(string); ok {
			strategy.StrategyType = strategyType
		}

		if allocationsData, ok := event.Metadata["targetAllocations"].(map[string]interface{}); ok {
			customAllocations := make(map[AssetClass]float64)
			for assetStr, percentInterface := range allocationsData {
				if percent, ok := percentInterface.(float64); ok {
					assetClass := NormalizeAssetClass(AssetClass(assetStr))
					customAllocations[assetClass] = percent
				}
			}
			if len(customAllocations) > 0 {
				strategy.Allocations = customAllocations
			}
		}

		if threshold, ok := event.Metadata["rebalanceThreshold"].(float64); ok {
			strategy.RebalanceThreshold = threshold
		}
	}

	return strategy
}

// processTaxLossHarvesting handles tax-loss harvesting sales
func (se *SimulationEngine) processTaxLossHarvesting(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// CRITICAL FIX: Use proper CashManager for tax loss harvesting
	sellAmount := event.Amount
	currentMonth := int(event.MonthOffset)

	if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil && sellAmount > 0 {
		// Look for holdings with losses (this is simplified - real TLH would be more sophisticated)
		for i := range taxableAccount.Holdings {
			holding := &taxableAccount.Holdings[i]
			if holding.UnrealizedGainLossTotal < 0 && holding.CurrentMarketValueTotal >= sellAmount {
				// Use CashManager to sell specific holding with proper lot tracking
				targetAccount := &Account{
					Holdings: []Holding{*holding},
					TotalValue: holding.CurrentMarketValueTotal,
				}
				saleResult := se.cashManager.SellAssetsFromAccountFIFO(targetAccount, sellAmount, currentMonth)

				// Update actual account
				taxableAccount.Holdings[i] = targetAccount.Holdings[0]

				// Add proceeds to cash
				accounts.Cash += saleResult.TotalProceeds
				*cashFlow += saleResult.TotalProceeds

				// Process capital losses (should be negative)
				se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
				return
			}
		}
	}
}

// processStrategicCapitalGains handles strategic capital gains realization
func (se *SimulationEngine) processStrategicCapitalGains(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// CRITICAL FIX: Use proper CashManager for strategic capital gains realization
	sellAmount := event.Amount
	currentMonth := int(event.MonthOffset)

	if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil && sellAmount > 0 {
		// Look for holdings with gains (simplified - real implementation would be more sophisticated)
		for i := range taxableAccount.Holdings {
			holding := &taxableAccount.Holdings[i]
			if holding.UnrealizedGainLossTotal > 0 && holding.CurrentMarketValueTotal >= sellAmount {
				// Use CashManager to sell specific holding with proper lot tracking
				targetAccount := &Account{
					Holdings: []Holding{*holding},
					TotalValue: holding.CurrentMarketValueTotal,
				}
				saleResult := se.cashManager.SellAssetsFromAccountFIFO(targetAccount, sellAmount, currentMonth)

				// Update actual account
				taxableAccount.Holdings[i] = targetAccount.Holdings[0]

				// Add proceeds to cash
				accounts.Cash += saleResult.TotalProceeds
				*cashFlow += saleResult.TotalProceeds

				// Process capital gains
				se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
				return
			}
		}
	}
}

// processHealthcareExpense handles healthcare cost events
func (se *SimulationEngine) processHealthcareExpense(amount float64, metadata map[string]interface{}) {
	// Healthcare expenses may be tax-deductible if they exceed threshold
	isDeductible := getBoolFromMetadata(metadata, "isDeductible", false)
	if isDeductible {
		// Simplified: treat as itemized deduction
		// In full implementation, would track medical expense accumulation
	}
}

// processQualifiedCharitableDistribution handles QCD events
func (se *SimulationEngine) processQualifiedCharitableDistribution(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// CRITICAL FIX: Use proper CashManager for QCD
	qcdAmount := event.Amount
	currentMonth := int(event.MonthOffset)

	if taxDeferredAccount := GetTaxDeferredAccount(accounts); taxDeferredAccount != nil && qcdAmount > 0 {
		// Withdraw from IRA using proper FIFO sale
		withdrawalAmount := math.Min(qcdAmount, taxDeferredAccount.TotalValue)
		saleResult := se.cashManager.SellAssetsFromAccountFIFO(taxDeferredAccount, withdrawalAmount, currentMonth)

		// Track QCD amount for RMD offset calculation
		se.qualifiedCharitableDistributionsYTD += saleResult.TotalProceeds

		// QCD is not taxable income (unlike regular IRA withdrawal)
		// and counts toward RMD if applicable
		// The proceeds go to charity, not to cash
	}
}

// processAdjustCashReserveSell handles selling assets to meet cash targets
func (se *SimulationEngine) processAdjustCashReserveSell(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// CRITICAL FIX: Use proper CashManager for cash reserve adjustments
	targetSaleAmount := event.Amount
	currentMonth := int(event.MonthOffset)

	// Sell from taxable account first (tax-efficient)
	if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil && taxableAccount.TotalValue > 0 {
		sellAmount := math.Min(targetSaleAmount, taxableAccount.TotalValue)
		saleResult := se.cashManager.SellAssetsFromAccountFIFO(taxableAccount, sellAmount, currentMonth)

		// Add proceeds to cash
		accounts.Cash += saleResult.TotalProceeds
		*cashFlow += saleResult.TotalProceeds

		// Process capital gains
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
	}
}

// processAdjustCashReserveBuy handles investing excess cash
func (se *SimulationEngine) processAdjustCashReserveBuy(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	investmentAmount := math.Min(event.Amount, accounts.Cash)

	if investmentAmount > 0 {
		accounts.Cash -= investmentAmount

		// Default to broad market investment
		targetAccount := getStringFromMetadata(event.Metadata, "targetAccount", "taxable")
		assetClass := NormalizeAssetClass(AssetClass(getStringFromMetadata(event.Metadata, "assetClass", string(AssetClassUSStocksTotalMarket))))

		se.processInvestmentContribution(accounts, investmentAmount, targetAccount, assetClass)
	}
}

// processManualRMD handles manual RMD events
func (se *SimulationEngine) processManualRMD(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// CRITICAL FIX: Use proper CashManager for RMD withdrawals
	rmdAmount := event.Amount
	currentMonth := int(event.MonthOffset)

	if taxDeferredAccount := GetTaxDeferredAccount(accounts); taxDeferredAccount != nil && rmdAmount > 0 {
		withdrawalAmount := math.Min(rmdAmount, taxDeferredAccount.TotalValue)

		// Use proper FIFO sale for RMD
		saleResult := se.cashManager.SellAssetsFromAccountFIFO(taxDeferredAccount, withdrawalAmount, currentMonth)

		accounts.Cash += saleResult.TotalProceeds
		*cashFlow += saleResult.TotalProceeds

		// RMD is taxable income
		se.ProcessIncome(saleResult.TotalProceeds, false, 0)
	}
}

// processTaxLossHarvestingCheck checks for and executes tax-loss harvesting opportunities
func (se *SimulationEngine) processTaxLossHarvestingCheck(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64) {
	// Simplified implementation - check for losses and harvest if beneficial
	if accounts.Taxable == nil {
		return
	}

	totalLosses := 0.0
	if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil {
		for i := range taxableAccount.Holdings {
			if taxableAccount.Holdings[i].UnrealizedGainLossTotal < 0 {
				totalLosses += math.Abs(taxableAccount.Holdings[i].UnrealizedGainLossTotal)
			}
		}
	}

	// If significant losses available, trigger harvesting
	harvestThreshold := getFloat64FromMetadata(event.Metadata, "lossThreshold", 1000.0)
	if totalLosses > harvestThreshold {
		// Execute tax-loss harvesting
		maxHarvest := math.Min(totalLosses, 3000.0) // Annual loss limit
		se.processTaxLossHarvesting(FinancialEvent{Amount: maxHarvest}, accounts, cashFlow)
	}
}

// processConcentrationRiskCheck monitors for concentration risk
func (se *SimulationEngine) processConcentrationRiskCheck(event FinancialEvent, accounts *AccountHoldingsMonthEnd) {
	// Check for concentration risk in individual stocks
	concentrationThreshold := getFloat64FromMetadata(event.Metadata, "concentrationThreshold", 0.05) // 5%

	totalPortfolioValue := se.calculateNetWorth(*accounts)

	if accounts.Taxable != nil {
		for _, holding := range accounts.Taxable.Holdings {
			if holding.AssetClass == AssetClassIndividualStock {
				concentration := holding.CurrentMarketValueTotal / totalPortfolioValue
				if concentration > concentrationThreshold {
					// Concentration risk detected - could trigger alert or automatic sale
					// For now, just log the risk
				}
			}
		}
	}
}


// FIFO-aware event processing functions

// processInvestmentContributionWithFIFO handles investment contributions with FIFO lot tracking
func (se *SimulationEngine) processInvestmentContributionWithFIFO(accounts *AccountHoldingsMonthEnd, amount float64, targetAccount string, assetClass AssetClass, currentMonth int) error {
	if amount <= 0 {
		simLogVerbose("INVESTMENT-CONTRIBUTION EARLY-EXIT: amount=%.0f", amount)
		return nil
	}

	simLogVerbose("INVESTMENT-CONTRIBUTION ENTRY: amount=%.0f, targetAccount=%s, assetClass=%s",
		amount, targetAccount, assetClass)

	var targetAcct *Account
	switch targetAccount {
	case "taxable":
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = accounts.Taxable
	case "tax_deferred":
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = accounts.TaxDeferred
	case "roth":
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = accounts.Roth
	default:
		// Default to taxable
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAcct = accounts.Taxable
	}

	// CRITICAL: Add new holding with FIFO lot tracking - must succeed or return error
	if err := se.cashManager.AddHoldingWithLotTracking(targetAcct, assetClass, amount, currentMonth); err != nil {
		// Return error so caller can restore cash
		return fmt.Errorf("failed to create holding: %w", err)
	}
	simLogVerbose("INVESTMENT-CONTRIBUTION SUCCESS: account value now %.0f", targetAcct.TotalValue)
	return nil
}


// processTaxLossHarvestingWithFIFO handles tax-loss harvesting with FIFO
func (se *SimulationEngine) processTaxLossHarvestingWithFIFO(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, currentMonth int) {
	maxLossToHarvest := event.Amount

	if maxLossToHarvest <= 0 {
		maxLossToHarvest = 3000.0 // Default annual loss limit
	}

	// Execute tax-loss harvesting with wash sale compliance
	saleResult := se.cashManager.ExecuteTaxLossHarvesting(accounts, maxLossToHarvest, currentMonth)

	// Add sale proceeds to cash
	accounts.Cash += saleResult.TotalProceeds
	*cashFlow += saleResult.TotalProceeds

	// Track capital losses with proper categorization
	se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
}

// processStrategicCapitalGainsWithFIFO handles strategic capital gains realization with FIFO
func (se *SimulationEngine) processStrategicCapitalGainsWithFIFO(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, currentMonth int) {
	targetGains := event.Amount

	if accounts.Taxable == nil || targetGains <= 0 {
		return
	}

	// Find holdings with gains and sell strategically
	totalGainsRealized := 0.0

	taxableAccount := (accounts.Taxable)
	for i := range taxableAccount.Holdings {
		if totalGainsRealized >= targetGains {
			break
		}

		holding := &taxableAccount.Holdings[i]
		if holding.UnrealizedGainLossTotal > 0 {
			// Calculate how much to sell to realize desired gains
			gainPercentage := holding.UnrealizedGainLossTotal / holding.CurrentMarketValueTotal
			remainingGainsNeeded := targetGains - totalGainsRealized
			sellValue := remainingGainsNeeded / gainPercentage
			sellValue = math.Min(sellValue, holding.CurrentMarketValueTotal)

			if sellValue > 0 {
				saleResult := se.cashManager.SellAssetsFromAccountFIFO(taxableAccount, sellValue, currentMonth)

				accounts.Cash += saleResult.TotalProceeds
				*cashFlow += saleResult.TotalProceeds

				se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
				totalGainsRealized += saleResult.TotalRealizedGains
			}
		}
	}
	accounts.Taxable = (taxableAccount)
}

// ProcessCapitalGainsWithTermDifferentiation processes capital gains with proper short-term vs long-term tracking
func (se *SimulationEngine) ProcessCapitalGainsWithTermDifferentiation(shortTermGains float64, longTermGains float64) {
	se.shortTermCapitalGainsYTD += shortTermGains
	se.longTermCapitalGainsYTD += longTermGains

	// Update legacy field for backwards compatibility
	se.capitalGainsYTD += shortTermGains + longTermGains

	// Handle losses
	if shortTermGains < 0 {
		se.capitalLossesYTD += math.Abs(shortTermGains)
	}
	if longTermGains < 0 {
		se.capitalLossesYTD += math.Abs(longTermGains)
	}
}

// ApplyImmediateWithdrawalTax applies immediate tax withholding on withdrawals
// Returns the total tax withheld (which should be deducted from cash)
// Tax rates come from simulationInput.TaxConfig (SimpleTaxConfig)
func (se *SimulationEngine) ApplyImmediateWithdrawalTax(saleResult LotSaleResult, accounts *AccountHoldingsMonthEnd) float64 {
	// Check if taxes are enabled via SimpleTaxConfig
	taxConfig := se.simulationInput.TaxConfig
	if taxConfig == nil || !taxConfig.Enabled {
		simLogVerbose("TAX-WITHHOLDING: Taxes disabled, no withholding applied")
		return 0.0
	}

	totalTaxWithheld := 0.0

	// Get tax rates from config (with sensible defaults)
	effectiveRate := taxConfig.EffectiveRate
	if effectiveRate <= 0 {
		effectiveRate = 0.22 // Default 22% if not specified
	}
	capitalGainsRate := taxConfig.CapitalGainsRate
	if capitalGainsRate <= 0 {
		capitalGainsRate = 0.15 // Default 15% LTCG if not specified
	}

	// Tax-deferred withdrawals: Full amount taxed as ordinary income
	if saleResult.TaxDeferredProceeds > 0 {
		taxDeferredTax := saleResult.TaxDeferredProceeds * effectiveRate
		totalTaxWithheld += taxDeferredTax

		// Track as ordinary income for year-end tax calculation
		se.ordinaryIncomeYTD += saleResult.TaxDeferredProceeds
		se.taxWithholdingYTD += taxDeferredTax

		simLogVerbose("TAX-WITHHOLDING: Tax-deferred withdrawal $%.0f, withheld $%.0f (%.0f%%)",
			saleResult.TaxDeferredProceeds, taxDeferredTax, effectiveRate*100)
	}

	// Taxable withdrawals: Only gains are taxed (at capital gains rate)
	if saleResult.TaxableProceeds > 0 {
		// Long-term capital gains: use configured rate
		// Short-term capital gains: taxed as ordinary income rate
		ltcgTax := saleResult.LongTermGains * capitalGainsRate
		stcgTax := saleResult.ShortTermGains * effectiveRate
		capitalGainsTax := math.Max(0, ltcgTax) + math.Max(0, stcgTax) // Don't withhold on losses

		totalTaxWithheld += capitalGainsTax
		se.taxWithholdingYTD += capitalGainsTax

		simLogVerbose("TAX-WITHHOLDING: Taxable withdrawal $%.0f (gains: LTCG=$%.0f at %.0f%%, STCG=$%.0f at %.0f%%), withheld $%.0f",
			saleResult.TaxableProceeds, saleResult.LongTermGains, capitalGainsRate*100,
			saleResult.ShortTermGains, effectiveRate*100, capitalGainsTax)
	}

	// Roth withdrawals: Tax-free, no withholding
	if saleResult.RothProceeds > 0 {
		simLogVerbose("TAX-WITHHOLDING: Roth withdrawal $%.0f, no tax withheld (tax-free)", saleResult.RothProceeds)
	}

	// Cash: No tax
	if saleResult.CashUsed > 0 {
		simLogVerbose("TAX-WITHHOLDING: Cash used $%.0f, no tax withheld", saleResult.CashUsed)
	}

	// Deduct withheld tax from cash
	if totalTaxWithheld > 0 && accounts != nil {
		accounts.Cash -= totalTaxWithheld
		simLogVerbose("TAX-WITHHOLDING: Total withheld $%.0f, cash reduced to $%.0f", totalTaxWithheld, accounts.Cash)
	}

	return totalTaxWithheld
}

// grossUpForTaxes calculates the gross withdrawal amount needed to achieve a net amount after taxes.
// This estimates the effective tax rate based on available account balances and withdrawal order.
// The goal is to withdraw enough so that after tax withholding, the desired net amount remains.
//
// IMPORTANT: This function is meant to calculate gross withdrawal from INVESTMENT accounts.
// It does NOT consider cash because callers should have already accounted for available cash
// before calling this function. The netAmountNeeded parameter should represent the shortfall
// that needs to be covered by investment account withdrawals.
func (se *SimulationEngine) grossUpForTaxes(netAmountNeeded float64, accounts *AccountHoldingsMonthEnd) float64 {
	// Safety check: if simulationInput is nil, return unchanged amount
	if se.simulationInput == nil {
		return netAmountNeeded
	}

	// If taxes are disabled, no gross-up needed
	taxConfig := se.simulationInput.TaxConfig
	if taxConfig == nil || !taxConfig.Enabled {
		return netAmountNeeded
	}

	// Get tax rates from config
	effectiveRate := taxConfig.EffectiveRate
	if effectiveRate <= 0 {
		effectiveRate = 0.22 // Default 22%
	}
	capitalGainsRate := taxConfig.CapitalGainsRate
	if capitalGainsRate <= 0 {
		capitalGainsRate = 0.15 // Default 15% LTCG
	}

	// Estimate which accounts will be drawn from based on withdrawal order and balances
	// Withdrawal order: Taxable -> Tax-Deferred -> Roth
	// NOTE: Cash is NOT considered here because callers should have already
	// accounted for available cash before calculating the shortfall.
	remainingNeeded := netAmountNeeded
	totalGrossNeeded := 0.0

	// Taxable: only gains are taxed (estimate 50% of proceeds are gains, taxed at LTCG rate)
	taxableAvailable := 0.0
	if taxableAccount := GetTaxableAccount(accounts); taxableAccount != nil {
		taxableAvailable = taxableAccount.TotalValue
	}
	if taxableAvailable > 0 && remainingNeeded > 0 {
		// Estimate: 50% of taxable withdrawal is gains, taxed at capital gains rate
		// Net = Gross - (Gross * 0.5 * capitalGainsRate)
		// Net = Gross * (1 - 0.5 * capitalGainsRate)
		// Gross = Net / (1 - 0.5 * capitalGainsRate)
		taxableEffectiveRate := 0.5 * capitalGainsRate
		fromTaxableNet := math.Min(remainingNeeded, taxableAvailable*(1-taxableEffectiveRate))
		fromTaxableGross := fromTaxableNet / (1 - taxableEffectiveRate)
		totalGrossNeeded += fromTaxableGross
		remainingNeeded -= fromTaxableNet
	}

	// Tax-Deferred: full amount taxed as ordinary income
	taxDeferredAvailable := 0.0
	if taxDeferredAccount := GetTaxDeferredAccount(accounts); taxDeferredAccount != nil {
		taxDeferredAvailable = taxDeferredAccount.TotalValue
	}
	if taxDeferredAvailable > 0 && remainingNeeded > 0 {
		// Net = Gross * (1 - effectiveRate)
		// Gross = Net / (1 - effectiveRate)
		fromTaxDeferredNet := math.Min(remainingNeeded, taxDeferredAvailable*(1-effectiveRate))
		fromTaxDeferredGross := fromTaxDeferredNet / (1 - effectiveRate)
		totalGrossNeeded += fromTaxDeferredGross
		remainingNeeded -= fromTaxDeferredNet
	}

	// Roth: no tax on qualified withdrawals
	rothAvailable := 0.0
	if rothAccount := GetRothAccount(accounts); rothAccount != nil {
		rothAvailable = rothAccount.TotalValue
	}
	if rothAvailable > 0 && remainingNeeded > 0 {
		fromRoth := math.Min(remainingNeeded, rothAvailable)
		totalGrossNeeded += fromRoth
		remainingNeeded -= fromRoth
	}

	// If we still need more (all accounts depleted), just return what we calculated
	// The simulation will handle the shortfall elsewhere
	if remainingNeeded > 0 {
		// No more accounts to draw from - add remaining at worst-case tax rate
		totalGrossNeeded += remainingNeeded / (1 - effectiveRate)
	}

	simLogVerbose("💰 [GROSS-UP] Net needed: $%.2f, Gross calculated: $%.2f (ratio: %.2f)",
		netAmountNeeded, totalGrossNeeded, totalGrossNeeded/netAmountNeeded)

	return totalGrossNeeded
}

// ProcessTaxEfficientWithdrawal processes withdrawals using tax-efficient sequencing
func (se *SimulationEngine) ProcessTaxEfficientWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int) float64 {
	saleResult, cashWithdrawn := se.cashManager.ExecuteTaxEfficientWithdrawal(accounts, targetAmount, currentMonth)

	// Process tax implications
	se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

	// Apply immediate tax withholding
	se.ApplyImmediateWithdrawalTax(saleResult, accounts)

	return cashWithdrawn + saleResult.TotalProceeds
}

// ProcessDebtPayments processes monthly debt payments for all active liabilities
func (se *SimulationEngine) ProcessDebtPayments(accounts *AccountHoldingsMonthEnd, cashFlow *float64) error {
	totalPrincipalPayment := 0.0
	totalInterestPayment := 0.0

	// Process payments for each active liability
	remainingLiabilities := make([]*LiabilityInfo, 0, len(se.liabilities))

	for _, liability := range se.liabilities {
		if liability.TermRemainingMonths <= 0 || liability.CurrentPrincipalBalance <= 0 {
			continue // Liability is paid off
		}

		monthlyRate := liability.InterestRate / 12.0
		principal, interest := CalculateAmortizationSplit(
			liability.CurrentPrincipalBalance,
			liability.MonthlyPayment,
			monthlyRate,
		)

		// Ensure we don't overdraw cash
		totalPayment := principal + interest
		if accounts.Cash < totalPayment {
			// Skip payment if insufficient funds (could implement partial payment logic)
			remainingLiabilities = append(remainingLiabilities, liability)
			continue
		}

		// Process payment
		accounts.Cash -= totalPayment
		*cashFlow -= totalPayment

		// Update liability
		liability.CurrentPrincipalBalance -= principal
		liability.TermRemainingMonths--

		// Track payments
		totalPrincipalPayment += principal
		totalInterestPayment += interest

		// Add tax-deductible interest to itemized deductions
		if liability.IsTaxDeductible {
			se.itemizedDeductibleInterestYTD += interest
		}

		// Keep liability if still has balance
		if liability.CurrentPrincipalBalance > 0 && liability.TermRemainingMonths > 0 {
			remainingLiabilities = append(remainingLiabilities, liability)
		}
	}

	// Update liabilities list
	se.liabilities = remainingLiabilities

	// Track monthly flows
	se.currentMonthFlows.DebtPaymentsPrincipalThisMonth += totalPrincipalPayment
	se.currentMonthFlows.DebtPaymentsInterestThisMonth += totalInterestPayment

	return nil
}

// ============================================================================
// CALCULATOR HELPER METHODS
// ============================================================================
// These methods expose calculator functionality for use throughout the simulation.

// GetContributionLimit returns the maximum allowed contribution for a given account type
// considering age-based limits and year-to-date contributions.
func (se *SimulationEngine) GetContributionLimit(accountType string, requestedAmount float64) float64 {
	return se.contributionLimitTracker.GetMaxAllowedContribution(accountType, requestedAmount)
}

// TrackContribution records a contribution for limit tracking purposes.
func (se *SimulationEngine) TrackContribution(accountType string, amount float64) {
	se.contributionLimitTracker.TrackContribution(accountType, amount)
}

// ResetContributionLimits resets year-to-date contribution tracking for a new calendar year.
func (se *SimulationEngine) ResetContributionLimits(year int) {
	se.contributionLimitTracker.ResetForNewYear(year)
}

// CalculateStateTaxLiability calculates state income tax for the given income and state.
func (se *SimulationEngine) CalculateStateTaxLiability(
	ordinaryIncome float64,
	capitalGains float64,
	stateCode string,
	filingStatus FilingStatus,
	numDependents int,
) float64 {
	return se.stateTaxCalculator.CalculateStateTax(
		ordinaryIncome,
		capitalGains,
		stateCode,
		filingStatus,
		numDependents,
	)
}

// NOTE: Advanced Financial Calculators Available
//
// The following calculators are integrated into SimulationEngine and available
// for use throughout the simulation:
//
// 1. Social Security Calculator (se.socialSecurityCalc):
//    - CalculateMonthlyBenefit(profile, year)
//    - OptimizeClaimingAge(profile, lifeExpectancy, discountRate)
//    - CalculateSpousalBenefit(primaryWorkerPIA, spouseProfile)
//    - GetBreakEvenAge(profile, earlyAge, lateAge, discountRate)
//
// 2. Estate Tax Calculator (se.estateTaxCalculator):
//    - CalculateFederalEstateTax(profile)
//    - CalculateStateEstateTax(profile)
//
// 3. Long-Term Care Calculator (se.ltcCalculator):
//    - CalculateAnnualCost(careLevel, region)
//    - CalculateInsuranceBenefit(scenario)
//
// 4. Property Cost Escalator (se.propertyCostEscalator):
//    - ProjectPropertyTax(config)
//    - CalculateInsurancePremium(config)
//
// 5. Goal Prioritizer (se.goalPrioritizer):
//    - AllocateFunds()
//    - RankGoalsByPriority()
//
// 6. Tax-Aware Rebalancer (se.taxAwareRebalancer):
//    - OptimizeRebalancing(accounts)
//    - MinimizeTaxImpact(trades)
//
// These calculators can be accessed directly when implementing new features
// or enhancing existing event handlers.
