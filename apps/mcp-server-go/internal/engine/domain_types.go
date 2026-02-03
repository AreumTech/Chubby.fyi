// Core domain types for the financial simulation engine

package engine

import "encoding/json"

// Goal represents a financial goal to track during simulation
type Goal struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Description       string  `json:"description,omitempty"`
	TargetAmount      float64 `json:"targetAmount"`
	TargetMonthOffset int     `json:"targetMonthOffset"`
	Priority          int     `json:"priority"`
	Category          string  `json:"category"`
	TargetAccountType string  `json:"targetAccountType,omitempty"`  // ✅ FIX: Add target account for goal tracking
}

// LiabilityInfo represents active debt during simulation
// ENHANCED: Now includes full PITI components for complete mortgage modeling
type LiabilityInfo struct {
	ID                      string  `json:"id"`
	Name                    string  `json:"name"`
	Type                    string  `json:"type"`
	CurrentPrincipalBalance float64 `json:"currentPrincipalBalance"`
	InterestRate            float64 `json:"interestRate"`
	TermRemainingMonths     int     `json:"termRemainingMonths"`
	MonthlyPayment          float64 `json:"monthlyPayment"`          // P&I only (for backwards compatibility)
	IsTaxDeductible         bool    `json:"isTaxDeductible"`

	// PITI Components - Enhanced mortgage modeling
	PropertyTaxAnnual          float64 `json:"propertyTaxAnnual,omitempty"`          // Annual property taxes
	HomeownersInsuranceAnnual  float64 `json:"homeownersInsuranceAnnual,omitempty"`  // Annual homeowner's insurance
	PMIAnnual                  float64 `json:"pmiAnnual,omitempty"`                  // Annual Private Mortgage Insurance
	PropertyTaxDeductible      bool    `json:"propertyTaxDeductible,omitempty"`      // Whether property tax is tax-deductible
	MortgageInterestDeductible bool    `json:"mortgageInterestDeductible,omitempty"` // Whether mortgage interest is tax-deductible
}

// AssetClass represents different types of assets
type AssetClass string

const (
	AssetClassCash                  AssetClass = "cash"
	AssetClassUSStocksTotalMarket   AssetClass = "stocks"
	AssetClassUSBondsTotalMarket    AssetClass = "bonds"
	AssetClassInternationalStocks   AssetClass = "international_stocks"
	AssetClassRealEstatePrimaryHome AssetClass = "real_estate_primary_home"
	AssetClassLeveragedSPY          AssetClass = "leveraged_spy"
	AssetClassOtherAssets           AssetClass = "otherAssets"
	AssetClassIndividualStock       AssetClass = "individual_stock"
)

// NormalizeAssetClass converts UI asset class names to WASM expected format
func NormalizeAssetClass(assetClass AssetClass) AssetClass {
	// Map UI's snake_case full names to WASM's short names
	switch assetClass {
	case "us_stocks_total_market", "us_stock_market", "us_stocks":
		return AssetClassUSStocksTotalMarket // "stocks"
	case "us_bonds_total_market", "us_bonds":
		return AssetClassUSBondsTotalMarket // "bonds"
	case "international_stocks", "international_stock_market":
		return AssetClassInternationalStocks // "international_stocks" (same)
	case "real_estate_primary_home":
		return AssetClassRealEstatePrimaryHome // "real_estate_primary_home" (same)
	case "leveraged_spy":
		return AssetClassLeveragedSPY // "leveraged_spy" (same)
	case "other_assets", "otherAssets":
		return AssetClassOtherAssets // "otherAssets"
	case "individual_stock":
		return AssetClassIndividualStock // "individual_stock" (same)
	case "cash":
		return AssetClassCash // "cash" (same)
	default:
		// Already in correct format or unknown
		return assetClass
	}
}

// AccountType represents different account types
// Note: Using StandardAccountType from generated interface types for consistency
type AccountType = StandardAccountType

// StochasticState holds the current state of stochastic variables for simulation
type StochasticState struct {
	// GARCH volatility states
	SPYVolatility             float64 `json:"spyVolatility"`
	SPYLastReturn             float64 `json:"spyLastReturn"`
	BNDVolatility             float64 `json:"bndVolatility"`
	BNDLastReturn             float64 `json:"bndLastReturn"`
	IntlVolatility            float64 `json:"intlStockVolatility"`
	IntlLastReturn            float64 `json:"intlStockLastReturn"`
	OtherVolatility           float64 `json:"otherVolatility"`
	OtherLastReturn           float64 `json:"otherLastReturn"`
	IndividualStockVolatility float64 `json:"individualStockVolatility"`
	IndividualStockLastReturn float64 `json:"individualStockLastReturn"`

	// AR(1) states
	LastInflation          float64 `json:"lastInflation"`
	LastHomeValueGrowth    float64 `json:"lastHomeValueGrowth"`
	LastRentalIncomeGrowth float64 `json:"lastRentalIncomeGrowth"`

	// Withdrawal guardrails state
	LastWithdrawalAmount           float64 `json:"lastWithdrawalAmount"`
	PortfolioValueAtLastWithdrawal float64 `json:"portfolioValueAtLastWithdrawal"`
}

// StochasticReturns defines monthly stochastic returns for various asset classes
type StochasticReturns struct {
	SPY             float64 `json:"spy"`             // US Large Cap Stocks
	BND             float64 `json:"bnd"`             // US Total Bond Market
	Intl            float64 `json:"intl"`            // International Stocks
	Other           float64 `json:"other"`           // Other/Alternative Assets
	IndividualStock float64 `json:"individualStock"` // Individual Stocks
	Home            float64 `json:"home"`            // Home Value Appreciation
	Rent            float64 `json:"rent"`            // Rental Income Growth
	Inflation       float64 `json:"inflation"`       // Consumer Price Inflation
}

// GuardrailConfig holds parameters for dynamic withdrawal guardrails
type GuardrailConfig struct {
	UpperGuardrail   float64 `json:"upperGuardrail"`
	LowerGuardrail   float64 `json:"lowerGuardrail"`
	SpendingCutPct   float64 `json:"spendingCutPct"`
	SpendingBonusPct float64 `json:"spendingBonusPct"`
}

// StochasticModelConfig contains all parameters for the stochastic simulation
type StochasticModelConfig struct {
	// Asset returns
	MeanSPYReturn             float64 `json:"meanSpyReturn"`
	MeanBondReturn            float64 `json:"meanBondReturn"`
	MeanIntlStockReturn       float64 `json:"meanIntlStockReturn"`
	MeanInflation             float64 `json:"meanInflation"`
	MeanHomeValueAppreciation float64 `json:"meanHomeValueAppreciation"`
	MeanRentalIncomeGrowth    float64 `json:"meanRentalIncomeGrowth"`
	MeanOtherReturn           float64 `json:"meanOtherReturn"`           // Other/Alternative assets mean return
	MeanIndividualStockReturn float64 `json:"meanIndividualStockReturn"` // Individual stock mean return

	// Dividend yields (annual)
	DividendYieldSPY       float64 `json:"dividendYieldSpy"`       // US Total Market dividend yield
	DividendYieldIntlStock float64 `json:"dividendYieldIntlStock"` // International stocks dividend yield
	DividendYieldBond      float64 `json:"dividendYieldBond"`      // Bond interest income yield
	DividendYieldDefault   float64 `json:"dividendYieldDefault"`   // Default yield for other asset classes

	// Dividend configuration
	EnableDividends        bool    `json:"enableDividends"`        // Whether to apply dividend yields during simulation

	// Volatilities
	VolatilitySPY                float64 `json:"volatilitySpy"`
	VolatilityBond               float64 `json:"volatilityBond"`
	VolatilityIntlStock          float64 `json:"volatilityIntlStock"`
	VolatilityInflation          float64 `json:"volatilityInflation"`
	VolatilityHomeValue          float64 `json:"volatilityHomeValue"`
	VolatilityRentalIncomeGrowth float64 `json:"volatilityRentalIncomeGrowth"`
	VolatilityOther              float64 `json:"volatilityOther"`              // Other/Alternative assets volatility
	VolatilityIndividualStock    float64 `json:"volatilityIndividualStock"`    // Individual stock volatility

	// GARCH parameters for SPY
	GarchSPYOmega float64 `json:"garchSpyOmega"`
	GarchSPYAlpha float64 `json:"garchSpyAlpha"`
	GarchSPYBeta  float64 `json:"garchSpyBeta"`

	// GARCH parameters for Bonds
	GarchBondOmega float64 `json:"garchBondOmega"`
	GarchBondAlpha float64 `json:"garchBondAlpha"`
	GarchBondBeta  float64 `json:"garchBondBeta"`

	// GARCH parameters for International Stocks
	GarchIntlStockOmega float64 `json:"garchIntlStockOmega"`
	GarchIntlStockAlpha float64 `json:"garchIntlStockAlpha"`
	GarchIntlStockBeta  float64 `json:"garchIntlStockBeta"`

	// GARCH parameters for Other/Alternative Assets
	GarchOtherOmega float64 `json:"garchOtherOmega"`
	GarchOtherAlpha float64 `json:"garchOtherAlpha"`
	GarchOtherBeta  float64 `json:"garchOtherBeta"`

	// GARCH parameters for Individual Stocks
	GarchIndividualStockOmega float64 `json:"garchIndividualStockOmega"`
	GarchIndividualStockAlpha float64 `json:"garchIndividualStockAlpha"`
	GarchIndividualStockBeta  float64 `json:"garchIndividualStockBeta"`

	// AR(1) parameters
	AR1InflationConstant          float64 `json:"ar1InflationConstant"`
	AR1InflationPhi               float64 `json:"ar1InflationPhi"`
	AR1HomeValueConstant          float64 `json:"ar1HomeValueConstant"`
	AR1HomeValuePhi               float64 `json:"ar1HomeValuePhi"`
	AR1RentalIncomeGrowthConstant float64 `json:"ar1RentalIncomeGrowthConstant"`
	AR1RentalIncomeGrowthPhi      float64 `json:"ar1RentalIncomeGrowthPhi"`

	// Fat tail parameter for Student's t-distribution
	FatTailParameter float64 `json:"fatTailParameter"`

	// Correlation matrix (8x8: SPY, BND, INFL, INTL, HOME, RENT, OTHER, INDIVIDUAL)
	CorrelationMatrix [][]float64 `json:"correlationMatrix"`

	// Cost parameters
	CostLeveragedETF float64 `json:"costLeveragedEtf"`

	// Transaction costs
	TransactionCostPercentage float64 `json:"transactionCostPercentage"` // Percentage of transaction value (e.g., 0.0005 for 0.05%)
	TransactionCostMinimum    float64 `json:"transactionCostMinimum"`    // Minimum transaction cost in dollars
	TransactionCostMaximum    float64 `json:"transactionCostMaximum"`    // Maximum transaction cost in dollars

	// Guardrails configuration
	Guardrails GuardrailConfig `json:"guardrails"`

	// Cash account configuration
	CashAccountConfig CashAccountConfig `json:"cashAccountConfig"`

	// Withdrawal strategy parameters
	TaxDeferredWithdrawalRatio float64 `json:"taxDeferredWithdrawalRatio,omitempty"` // Ratio of withdrawals from tax-deferred accounts

	// Tax payment timing
	PayTaxesEndOfYear bool `json:"payTaxesEndOfYear,omitempty"` // When true, taxes paid end of year instead of April (disables tax float)

	// Debug mode
	DebugDisableRandomness bool `json:"debugDisableRandomness,omitempty"` // Debug mode: disable market randomness, use mean returns only

	// Seeded stochastic simulation
	RandomSeed     int64  `json:"randomSeed,omitempty"`     // 0 = use crypto/rand (non-reproducible), >0 = seeded PCG32 (reproducible)
	SimulationMode string `json:"simulationMode,omitempty"` // "deterministic" | "stochastic" - controls return generation

	// Cash floor for breach detection (default 0 means breach = going negative)
	CashFloor float64 `json:"cashFloor,omitempty"` // End Cash < CashFloor triggers breach

	// Performance optimization: LiteMode skips expensive features for Bronze tier
	// - Skips GARCH volatility (uses constant volatility)
	// - Skips tax lot tracking (tracks total values only)
	// - Skips IRMAA calculations
	// - Uses simplified withdrawal sequencing
	LiteMode bool `json:"liteMode,omitempty"`

	// PERF: Cached Cholesky decomposition (computed once per simulation, not per month)
	// This avoids recomputing O(n^3) decomposition every month
	CachedCholeskyMatrix [][]float64 `json:"-"` // Not serialized - computed at runtime

	// PERF: Pre-computed monthly parameters (avoid repeated AnnualToMonthly conversions)
	PrecomputedMonthly *PrecomputedMonthlyParams `json:"-"`
}

// PrecomputedMonthlyParams holds pre-calculated monthly values
// PERF: Computed once per simulation to avoid repeated conversions
type PrecomputedMonthlyParams struct {
	// Monthly means
	MeanSPY        float64
	MeanBond       float64
	MeanIntl       float64
	MeanOther      float64
	MeanIndividual float64
	MeanInflation  float64
	MeanHome       float64
	MeanRental     float64

	// Monthly volatilities
	VolSPY        float64
	VolBond       float64
	VolIntl       float64
	VolOther      float64
	VolIndividual float64
	VolInflation  float64
	VolHome       float64
	VolRental     float64
}

// =============================================================================
// REALIZED PATH VARIABLES (for seeded stochastic single-path)
// =============================================================================

// RealizedMonthVariables captures all stochastic realizations for a single month
// This enables "show the math" traceability in stochastic mode
type RealizedMonthVariables struct {
	MonthOffset int    `json:"monthOffset"`
	Month       string `json:"month"` // YYYY-MM format

	// Asset class returns (monthly, decimal)
	SPYReturn             float64 `json:"spyReturn"`
	BNDReturn             float64 `json:"bndReturn"`
	IntlReturn            float64 `json:"intlReturn"`
	OtherReturn           float64 `json:"otherReturn"`
	IndividualStockReturn float64 `json:"individualStockReturn"`
	Inflation             float64 `json:"inflation"`
	HomeValueGrowth       float64 `json:"homeValueGrowth"`
	RentalIncomeGrowth    float64 `json:"rentalIncomeGrowth"`

	// Volatility states (GARCH transparency)
	SPYVolatility  float64 `json:"spyVolatility,omitempty"`
	BNDVolatility  float64 `json:"bndVolatility,omitempty"`
	IntlVolatility float64 `json:"intlVolatility,omitempty"`

	// "Show the math" linkage - how returns became growth dollars
	InvestedBaseForReturn float64            `json:"investedBaseForReturn"` // Invested value after transfers
	AssetWeights          map[string]float64 `json:"assetWeights"`          // e.g., {"SPY": 0.6, "BND": 0.4}
	WeightedReturn        float64            `json:"weightedReturn"`        // dot(weights, returns)
	ComputedGrowthDollars float64            `json:"computedGrowthDollars"` // base × weighted return
}

// LiquidityTier represents the liquidity classification of an asset
type LiquidityTier string

const (
	LiquidityTierLiquid     LiquidityTier = "LIQUID"      // Stocks, bonds, ETFs - can be sold quickly
	LiquidityTierSemiLiquid LiquidityTier = "SEMI_LIQUID" // CDs, some bonds - moderate settlement time
	LiquidityTierIlliquid   LiquidityTier = "ILLIQUID"    // Real estate, private equity - slow to liquidate
)

// Holding represents an aggregate holding of a single asset class within an account
// CRITICAL MATHEMATICAL REQUIREMENT: This MUST use a share-based model for accurate capital gains
// - Quantity MUST represent the actual number of shares/units owned (e.g., 150.5 shares of SPY)
// - CostBasisPerUnit MUST be the weighted average cost basis per share across all lots
// - The PurchaseMonth field has been REMOVED - timing data belongs in individual TaxLots
// Any system that sets Quantity=1.0 and stores dollar amounts in CostBasisPerUnit is INVALID
type Holding struct {
	ID                        string        `json:"id"`
	AssetClass                AssetClass    `json:"assetClass"`
	LiquidityTier             LiquidityTier `json:"liquidityTier"`
	Quantity                  float64       `json:"quantity"`                  // MANDATORY: Actual number of shares/units (e.g., 150.5 shares)
	CostBasisPerUnit          float64       `json:"costBasisPerUnit"`          // Weighted average purchase price per share across all lots
	CostBasisTotal            float64       `json:"costBasisTotal"`            // Total cost basis (sum of all lots' cost basis)
	CurrentMarketPricePerUnit float64       `json:"currentMarketPricePerUnit"` // Current market price per share from central pricing
	CurrentMarketValueTotal   float64       `json:"currentMarketValueTotal"`   // Quantity * CurrentMarketPricePerUnit
	UnrealizedGainLossTotal   float64       `json:"unrealizedGainLossTotal"`   // CurrentMarketValueTotal - CostBasisTotal
	Lots                      []TaxLot      `json:"lots,omitempty"`            // Individual tax lots for FIFO capital gains tracking
}

// TaxLot represents a tax lot for FIFO tracking using accurate share-based tracking
// CRITICAL: This uses a share-based model where Quantity = number of shares/units, NOT dollars
type TaxLot struct {
	ID                string     `json:"id"`
	AssetClass        AssetClass `json:"assetClass"`
	Quantity          float64    `json:"quantity"`          // Number of shares/units in this lot (NOT dollar amount)
	CostBasisPerUnit  float64    `json:"costBasisPerUnit"`  // Original purchase price per share for this lot
	CostBasisTotal    float64    `json:"costBasisTotal"`    // Total cost basis for this lot (Quantity * CostBasisPerUnit)
	AcquisitionDate   int        `json:"acquisitionDate"`   // Month offset when acquired
	IsLongTerm        bool       `json:"isLongTerm"`        // True if held > 12 months
	WashSalePeriodEnd int        `json:"washSalePeriodEnd"` // Month when wash sale period ends
}

// Account represents an investment account with holdings
type Account struct {
	Holdings   []Holding `json:"holdings"`
	TotalValue float64   `json:"totalValue"`
}

// DividendsReceived tracks dividend income breakdown
type DividendsReceived struct {
	Qualified float64 `json:"qualified"`
	Ordinary  float64 `json:"ordinary"`
}

// AccountHoldingsMonthEnd represents all account holdings at month end
type AccountHoldingsMonthEnd struct {
	Checking    *Account `json:"checking,omitempty"` // Low-yield checking account
	Savings     *Account `json:"savings,omitempty"`  // Higher-yield savings account
	Taxable     *Account `json:"taxable"`
	TaxDeferred *Account `json:"tax_deferred"`
	Roth        *Account `json:"roth"`
	FiveTwoNine *Account `json:"529,omitempty"` // 529 Education Savings Plan
	HSA         *Account `json:"hsa,omitempty"` // Health Savings Account (Triple Tax Advantage)
	Cash        float64  `json:"cash"`          // Legacy - maintained for backward compatibility
}

// Helper functions to access accounts safely
func GetTaxableAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.Taxable
}

func GetTaxDeferredAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.TaxDeferred
}

func GetRothAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.Roth
}

func GetCheckingAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.Checking
}

func GetSavingsAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.Savings
}

func GetFiveTwoNineAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.FiveTwoNine
}

func GetHSAAccount(accounts *AccountHoldingsMonthEnd) *Account {
	if accounts == nil {
		return nil
	}
	return accounts.HSA
}

// Helper conversion functions
func mapSliceToFinancialEvents(events []interface{}) []FinancialEvent {
	result := make([]FinancialEvent, len(events))
	for i, eventInterface := range events {
		if event, ok := eventInterface.(FinancialEvent); ok {
			result[i] = event
		}
	}
	return result
}

func MapToAccountHoldingsMonthEnd(data map[string]interface{}) AccountHoldingsMonthEnd {
	accounts := AccountHoldingsMonthEnd{}

	if cash, ok := data["cash"].(float64); ok {
		accounts.Cash = cash
	}

	// For now, return basic structure - in practice would need proper mapping
	return accounts
}

func MapToFinancialEvent(data map[string]interface{}) FinancialEvent {
	event := FinancialEvent{}

	if id, ok := data["id"].(string); ok {
		event.ID = id
	}
	if eventType, ok := data["type"].(string); ok {
		event.Type = eventType
	}
	if description, ok := data["description"].(string); ok {
		event.Description = description
	}
	if amount, ok := data["amount"].(float64); ok {
		event.Amount = amount
	}
	if monthOffset, ok := data["monthOffset"].(float64); ok {
		event.MonthOffset = int(monthOffset)
	}

	return event
}

func accountHoldingsToMap(accounts AccountHoldingsMonthEnd) map[string]interface{} {
	result := make(map[string]interface{})
	result["cash"] = accounts.Cash
	if accounts.Checking != nil {
		result["checking"] = accounts.Checking
	}
	if accounts.Savings != nil {
		result["savings"] = accounts.Savings
	}
	if accounts.Taxable != nil {
		result["taxable"] = accounts.Taxable
	}
	if accounts.TaxDeferred != nil {
		result["tax_deferred"] = accounts.TaxDeferred
	}
	if accounts.Roth != nil {
		result["roth"] = accounts.Roth
	}
	if accounts.FiveTwoNine != nil {
		result["529"] = accounts.FiveTwoNine
	}
	if accounts.HSA != nil {
		result["hsa"] = accounts.HSA
	}
	return result
}

// FinancialEvent represents a generic financial event with enhanced granular data support
type FinancialEvent struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	MonthOffset int                    `json:"monthOffset"`
	Amount      float64                `json:"amount"`
	Frequency   string                 `json:"frequency,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`

	// Enhanced granular fields for detailed tracking
	IncomeType  *string `json:"incomeType,omitempty"`   // "salary" | "bonus" | "rsu" for INCOME events
	ExpenseCategory *string `json:"expenseCategory,omitempty"` // "housing" | "transportation" | "food" | "other" for EXPENSE events
	TaxType     *string `json:"taxType,omitempty"`      // "federal" | "state" | "fica" for TAX events

	// Target account information for contributions and transfers
	TargetAccountType *string `json:"targetAccountType,omitempty"` // Standard account type

	// PFOS-E consolidated event fields
	TaxProfile       *string  `json:"taxProfile,omitempty"`       // Tax treatment: "ordinary_income" | "capital_gains" | "tax_free" | etc.
	DriverKey        *string  `json:"driverKey,omitempty"`        // Sensitivity attribution key (typed, not freeform)
	WithholdingModel *string  `json:"withholdingModel,omitempty"` // "irs_percentage" | "flat" | "none"
	ExpenseNature    *string  `json:"expenseNature,omitempty"`    // "fixed" | "variable" | "shock"
	SourceType       *string  `json:"sourceType,omitempty"`       // Income source type for consolidated events
	InsuranceType    *string  `json:"insuranceType,omitempty"`    // Insurance type for premium/payout events
	ExposureType     *string  `json:"exposureType,omitempty"`     // Exposure type for concentration events
	TaxTreatment     *string  `json:"taxTreatment,omitempty"`     // Tax treatment for account contributions
	ConstraintCodes  []string `json:"constraintCodes,omitempty"`  // Blocked output constraint codes
	DeltaNotional    *float64 `json:"deltaNotional,omitempty"`    // Change in notional value for exposure events
}

// SimulationInput represents the input data for a simulation run
type SimulationInput struct {
	InitialAccounts    AccountHoldingsMonthEnd `json:"initialAccounts"`
	Events             []FinancialEvent        `json:"events"`
	Config             StochasticModelConfig   `json:"config"`
	MonthsToRun        int                     `json:"monthsToRun"`
	InitialAge         int                     `json:"initialAge"`                 // User's current age at simulation start
	StartYear          int                     `json:"startYear"`                  // Calendar year simulation begins (e.g., 2024)
	WithdrawalStrategy WithdrawalSequence      `json:"withdrawalStrategy"`
	Goals              []Goal                  `json:"goals,omitempty"`
	CashStrategy       *CashManagementStrategy `json:"cashStrategy,omitempty"`
	StrategySettings   *StrategySettings       `json:"strategySettings,omitempty"` // Dynamic strategy configuration
}

// MonthlyDataSimulation represents simulation results for a single month
type MonthlyDataSimulation struct {
	MonthOffset int                     `json:"monthOffset"`
	NetWorth    float64                 `json:"netWorth"`
	CashFlow    float64                 `json:"cashFlow"`
	Accounts    AccountHoldingsMonthEnd `json:"accounts"`
	Liabilities []*LiabilityInfo        `json:"liabilities"`
	Returns     StochasticReturns       `json:"returns"`

	// Monthly flow tracking for UI projection
	IncomeThisMonth                     float64           `json:"incomeThisMonth"`
	EmploymentIncomeThisMonth           float64           `json:"employmentIncomeThisMonth"`
	ExpensesThisMonth                   float64           `json:"expensesThisMonth"`

	// Enhanced granular income tracking
	SalaryIncomeThisMonth               float64           `json:"salaryIncomeThisMonth"`
	BonusIncomeThisMonth                float64           `json:"bonusIncomeThisMonth"`
	RSUIncomeThisMonth                  float64           `json:"rsuIncomeThisMonth"`

	// Enhanced granular expense tracking
	HousingExpensesThisMonth            float64           `json:"housingExpensesThisMonth"`
	TransportationExpensesThisMonth     float64           `json:"transportationExpensesThisMonth"`
	FoodExpensesThisMonth               float64           `json:"foodExpensesThisMonth"`
	OtherExpensesThisMonth              float64           `json:"otherExpensesThisMonth"`
	ContributionsToInvestmentsThisMonth float64           `json:"contributionsToInvestmentsThisMonth"`

	// Contribution breakdown by account type
	ContributionsTaxableThisMonth       float64           `json:"contributionsTaxableThisMonth"`
	ContributionsTaxDeferredThisMonth   float64           `json:"contributionsTaxDeferredThisMonth"`
	ContributionsRothThisMonth          float64           `json:"contributionsRothThisMonth"`

	DebtPaymentsPrincipalThisMonth      float64           `json:"debtPaymentsPrincipalThisMonth"`
	DebtPaymentsInterestThisMonth       float64           `json:"debtPaymentsInterestThisMonth"`
	RothConversionAmountThisMonth       float64           `json:"rothConversionAmountThisMonth"`
	OneTimeEventsImpactThisMonth        float64           `json:"oneTimeEventsImpactThisMonth"`
	DivestmentProceedsThisMonth         float64           `json:"divestmentProceedsThisMonth"`
	RebalancingTradesNetEffectThisMonth float64           `json:"rebalancingTradesNetEffectThisMonth"`
	TaxWithheldThisMonth                float64           `json:"taxWithheldThisMonth"`
	TaxesPaidThisMonth                  float64           `json:"taxesPaidThisMonth"`
	CapitalGainsTaxPaidThisMonth        float64           `json:"capitalGainsTaxPaidThisMonth"`
	DividendsReceivedThisMonth          DividendsReceived `json:"dividendsReceivedThisMonth"`
	InterestIncomeThisMonth             float64           `json:"interestIncomeThisMonth"`

	// Tax tracking fields for year-to-date calculations
	OrdinaryIncomeForTaxYTD           float64 `json:"ordinaryIncomeForTaxYTD"`
	STCGForTaxYTD                     float64 `json:"stcgForTaxYTD"`
	LTCGForTaxYTD                     float64 `json:"ltcgForTaxYTD"`
	QualifiedDividendIncomeYTD        float64 `json:"qualifiedDividendIncomeYTD"`
	OrdinaryDividendIncomeYTD         float64 `json:"ordinaryDividendIncomeYTD"`
	InterestIncomeYTD                 float64 `json:"interestIncomeYTD"`
	ItemizedDeductibleInterestPaidYTD float64 `json:"itemizedDeductibleInterestPaidYTD"`
	PreTaxContributionsYTD            float64 `json:"preTaxContributionsYTD"`
	TaxWithholdingYTD                 float64 `json:"taxWithholdingYTD"`

	// Annual tax calculation results (populated in December)
	TaxPaidAnnual                  *float64 `json:"taxPaidAnnual,omitempty"`
	RMDAmountAnnual                *float64 `json:"rmdAmountAnnual,omitempty"`
	IRMAAMedicarePremiumAdjustment *float64 `json:"irmaaMedicarePremiumAdjustment,omitempty"`
	CapitalLossCarryoverEndYear    *float64 `json:"capitalLossCarryoverEndYear,omitempty"`
	ActiveFilingStatus             *string  `json:"activeFilingStatus,omitempty"`
	ActiveNumDependents            *int     `json:"activeNumDependents,omitempty"`

	// Detailed tax breakdown (populated in December)
	FederalIncomeTaxAnnual         *float64 `json:"federalIncomeTaxAnnual,omitempty"`
	StateIncomeTaxAnnual           *float64 `json:"stateIncomeTaxAnnual,omitempty"`
	CapitalGainsTaxShortTermAnnual *float64 `json:"capitalGainsTaxShortTermAnnual,omitempty"`
	CapitalGainsTaxLongTermAnnual  *float64 `json:"capitalGainsTaxLongTermAnnual,omitempty"`
	AlternativeMinimumTaxAnnual    *float64 `json:"alternativeMinimumTaxAnnual,omitempty"`
	EffectiveTaxRateAnnual         *float64 `json:"effectiveTaxRateAnnual,omitempty"`
	MarginalTaxRateAnnual          *float64 `json:"marginalTaxRateAnnual,omitempty"`
	AdjustedGrossIncomeAnnual      *float64 `json:"adjustedGrossIncomeAnnual,omitempty"`
	TaxableIncomeAnnual            *float64 `json:"taxableIncomeAnnual,omitempty"`

	// FICA Tax Breakdown (populated in December)
	SocialSecurityTaxAnnual     *float64 `json:"socialSecurityTaxAnnual,omitempty"`
	MedicareTaxAnnual           *float64 `json:"medicareTaxAnnual,omitempty"`
	AdditionalMedicareTaxAnnual *float64 `json:"additionalMedicareTaxAnnual,omitempty"`
	TotalFICATaxAnnual          *float64 `json:"totalFicaTaxAnnual,omitempty"`

	// Savings analysis fields
	AvailableForSavings   float64 `json:"availableForSavings,omitempty"`
	SavingsRate           float64 `json:"savingsRate,omitempty"`
	FreeCashFlow          float64 `json:"freeCashFlow,omitempty"`
	HousingExpensesAnnual float64 `json:"housingExpensesAnnual,omitempty"`
}

// Enhanced SimulationPayload that matches the UI's expected format
type SimulationPayload struct {
	PlanInputs    PlanInputs    `json:"planInputs"`
	PlanProjection PlanProjection `json:"planProjection"`
}

// PlanInputs contains normalized reference data about the user's financial plan configuration
type PlanInputs struct {
	Goals      []EnhancedGoal   `json:"goals"`
	Events     []TimelineEvent  `json:"events"`
	Strategies []Strategy       `json:"strategies"`
	Accounts   []AccountNew     `json:"accounts"`
}

// TimelineEvent represents a UI-friendly event on the financial timeline
type TimelineEvent struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Icon        string  `json:"icon"`
	StartYear   int     `json:"startYear"`
	EndYear     *int    `json:"endYear,omitempty"`
	Description string  `json:"description"`
	Category    string  `json:"category"` // 'income' | 'expense' | 'contribution' | 'strategy' | 'life_event'
	Amount      *float64 `json:"amount,omitempty"`
	Frequency   *string `json:"frequency,omitempty"` // 'monthly' | 'annually' | 'one-time'
}

// Strategy represents a financial strategy with its configuration
type Strategy struct {
	ID           string                 `json:"id"`
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	Icon         string                 `json:"icon"`
	Category     string                 `json:"category"` // StrategyCategory from UI types
	Status       string                 `json:"status"`   // 'active' | 'planned' | 'disabled'
	Parameters   map[string]interface{} `json:"parameters,omitempty"`
	Effectiveness *StrategyEffectiveness `json:"effectiveness,omitempty"`
}

// StrategyEffectiveness represents the expected impact of a strategy
type StrategyEffectiveness struct {
	EstimatedImpact string `json:"estimatedImpact"`
	Confidence      string `json:"confidence"` // 'high' | 'medium' | 'low'
}

// AccountNew represents an enhanced account model for UI display
type AccountNew struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Category     string   `json:"category"` // AccountCategory from UI types
	Type         string   `json:"type"`     // AccountType
	CurrentValue *float64 `json:"currentValue,omitempty"`
	Institution  *string  `json:"institution,omitempty"`
	IsVisible    *bool    `json:"isVisible,omitempty"`
}

// EnhancedGoal represents a user's financial goal with rich metadata
type EnhancedGoal struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	TargetAmount     float64  `json:"targetAmount"`
	TargetYear       int      `json:"targetYear"`
	Priority         int      `json:"priority"`
	Category         string   `json:"category"`
	Icon             string   `json:"icon"`
	IsActive         bool     `json:"isActive"`
	Tags             []string `json:"tags,omitempty"`
	InflationAdjusted bool    `json:"inflationAdjusted"`

	// Success metrics computed by simulation engine
	ProbabilityOfSuccess   float64 `json:"probabilityOfSuccess"`   // 0.0 to 1.0
	MedianAchievementYear  *int    `json:"medianAchievementYear,omitempty"`
	ProgressPercentage     float64 `json:"progressPercentage"`     // 0.0 to 1.0
	StatusTag              string  `json:"statusTag"`              // 'excellent' | 'good' | 'concerning' | 'critical'
	ShortDescription       string  `json:"shortDescription"`
}

// PlanProjection contains all simulation results organized for UI consumption
type PlanProjection struct {
	Summary     PlanSummary      `json:"summary"`
	Charts      ProjectionCharts `json:"charts"`
	Analysis    DetailedAnalysis `json:"analysis"`
	Spreadsheet SpreadsheetData  `json:"spreadsheet"`
}

// Alert represents a financial planning alert generated by backend analysis
type Alert struct {
	ID       string `json:"id"`
	Type     string `json:"type"`     // 'warning' | 'info' | 'success' | 'error'
	Title    string `json:"title"`
	Message  string `json:"message"`
	Year     *int   `json:"year,omitempty"`     // The year the alert pertains to
	Severity string `json:"severity"`           // 'high' | 'medium' | 'low'
}

// PlanSummary contains high-level success metrics and summary
type PlanSummary struct {
	GoalOutcomes            []GoalOutcome    `json:"goalOutcomes"`
	PortfolioStats          PortfolioStats   `json:"portfolioStats"`
	PlanHealth              PlanHealth       `json:"planHealth"`
	Alerts                  []Alert          `json:"alerts"`          // Important financial alerts pre-computed by backend
	QuickActions            []QuickAction    `json:"quickActions,omitempty"`
	ProbabilityOfBankruptcy float64          `json:"probabilityOfBankruptcy,omitempty"` // 0.0 to 1.0
	BankruptcyCount         int              `json:"bankruptcyCount,omitempty"`         // Number of paths that went bankrupt
	NumberOfRuns            int              `json:"numberOfRuns,omitempty"`            // Total Monte Carlo runs
}

// GoalOutcome represents the achievement probability for a specific goal
type GoalOutcome struct {
	GoalID              string  `json:"goalId"`
	GoalName            string  `json:"goalName"`
	Probability         float64 `json:"probability"`         // 0.0 to 1.0 (NOT 0-100%)
	StatusTag           string  `json:"statusTag"`           // 'excellent' | 'good' | 'concerning' | 'critical'
	ShortDescription    string  `json:"shortDescription"`
	TargetAccount       string  `json:"targetAccount"`       // Account type this goal tracks (e.g., 'taxable', 'roth')
	TargetAmount        float64 `json:"targetAmount"`        // The goal's target amount
	CurrentProgress     float64 `json:"currentProgress"`     // Current value in the target account (DEPRECATED - remove in future)
	ProgressPercentage  float64 `json:"progressPercentage"`  // Progress as percentage (DEPRECATED - remove in future)
	Status              string  `json:"status"`              // UI-friendly status (e.g., 'On Track', 'Behind')
	// Distribution data from Monte Carlo runs - AMOUNT distribution (at fixed date)
	P10Amount           float64 `json:"p10Amount"`           // 10th percentile final amount in goal account
	P25Amount           float64 `json:"p25Amount"`           // 25th percentile final amount
	P50Amount           float64 `json:"p50Amount"`           // Median final amount
	P75Amount           float64 `json:"p75Amount"`           // 75th percentile final amount
	P90Amount           float64 `json:"p90Amount"`           // 90th percentile final amount

	// Distribution data from Monte Carlo runs - TIME distribution (when target is achieved)
	// For "solve for time" goals (fixed amount, unknown date)
	AchievementMonthP10 int `json:"achievementMonthP10,omitempty"` // 10th percentile - earliest achievements
	AchievementMonthP25 int `json:"achievementMonthP25,omitempty"` // 25th percentile
	AchievementMonthP50 int `json:"achievementMonthP50,omitempty"` // Median achievement month
	AchievementMonthP75 int `json:"achievementMonthP75,omitempty"` // 75th percentile
	AchievementMonthP90 int `json:"achievementMonthP90,omitempty"` // 90th percentile - latest achievements
	AchievementRate     float64 `json:"achievementRate,omitempty"`  // Percentage of paths that achieved target (ever)
}

// PortfolioStats contains portfolio statistics at end of simulation
type PortfolioStats struct {
	P10FinalValue float64 `json:"p10FinalValue"`
	P25FinalValue float64 `json:"p25FinalValue"`
	P50FinalValue float64 `json:"p50FinalValue"`
	P75FinalValue float64 `json:"p75FinalValue"`
	P90FinalValue float64 `json:"p90FinalValue"`
	SuccessRate   float64 `json:"successRate"` // Percentage achieving primary goal

	// Extended percentiles (MC enhancement)
	P5FinalValue  float64 `json:"p5FinalValue,omitempty"`
	P95FinalValue float64 `json:"p95FinalValue,omitempty"`

	// Min cash KPIs (across all successful paths)
	MinCashP5  float64 `json:"minCashP5,omitempty"`
	MinCashP50 float64 `json:"minCashP50,omitempty"`
	MinCashP95 float64 `json:"minCashP95,omitempty"`

	// Runway KPIs (ONLY for paths that breached - omitted if no breaches)
	RunwayP5          int `json:"runwayP5,omitempty"`
	RunwayP50         int `json:"runwayP50,omitempty"`
	RunwayP95         int `json:"runwayP95,omitempty"`
	BreachedPathCount int `json:"breachedPathCount,omitempty"` // Denominator for runway percentiles

	// Breach probability time series (cumulative first-breach)
	BreachProbabilityByMonth []MCBreachProbability `json:"breachProbabilityByMonth,omitempty"`

	// Ever-breach probability (cash floor breach at any point)
	EverBreachProbability float64 `json:"everBreachProbability,omitempty"`

	// Exemplar path reference (trace fetched separately via seed)
	ExemplarPath *ExemplarPath `json:"exemplarPath,omitempty"`

	// Net worth trajectory (percentiles at yearly intervals for fan chart)
	NetWorthTrajectory []NetWorthTrajectoryPoint `json:"netWorthTrajectory,omitempty"`

	// Audit fields
	BaseSeed        int64 `json:"baseSeed,omitempty"`
	SuccessfulPaths int   `json:"successfulPaths,omitempty"` // Paths with valid data (denominator for percentiles)
	FailedPaths     int   `json:"failedPaths,omitempty"`     // Paths that errored/produced no data
}

// PlanHealth represents overall plan health indicators
type PlanHealth struct {
	OverallScore     int      `json:"overallScore"`     // 0-100
	RiskLevel        string   `json:"riskLevel"`        // 'low' | 'moderate' | 'high'
	ConfidenceLevel  string   `json:"confidenceLevel"`  // 'high' | 'medium' | 'low'
	KeyRisks         []string `json:"keyRisks"`
	KeyStrengths     []string `json:"keyStrengths"`
}

// QuickAction represents actionable recommendations
type QuickAction struct {
	Type             string `json:"type"`             // 'opportunity' | 'warning' | 'optimization'
	Title            string `json:"title"`
	Description      string `json:"description"`
	Priority         string `json:"priority"`         // 'high' | 'medium' | 'low'
	EstimatedImpact  string `json:"estimatedImpact"`
}

// ProjectionCharts contains pre-computed data optimized for chart rendering
type ProjectionCharts struct {
	NetWorth        NetWorthChart         `json:"netWorth"`
	CashFlow        CashFlowChart         `json:"cashFlow"`
	AssetAllocation AssetAllocationChart  `json:"assetAllocation"`
	GoalProgress    []GoalProgressChart   `json:"goalProgress"`
	EventMarkers    []EventMarker         `json:"eventMarkers"`
}

// NetWorthChart contains net worth projection data
type NetWorthChart struct {
	TimeSeries   []NetWorthTimeSeriesPoint `json:"timeSeries"`
	SamplePaths  [][]float64              `json:"samplePaths"` // Array of paths for display
	Summary      NetWorthChartSummary     `json:"summary"`
}

// NetWorthTimeSeriesPoint represents a single point in net worth time series
type NetWorthTimeSeriesPoint struct {
	Year int     `json:"year"`
	P10  float64 `json:"p10"`
	P25  float64 `json:"p25"`
	P50  float64 `json:"p50"` // Median path
	P75  float64 `json:"p75"`
	P90  float64 `json:"p90"`
	Mean *float64 `json:"mean,omitempty"`
}

// NetWorthChartSummary contains chart optimization hints
type NetWorthChartSummary struct {
	RecommendedYAxisMax float64               `json:"recommendedYAxisMax"`
	RecommendedYAxisMin float64               `json:"recommendedYAxisMin"`
	VolatilityPeriods   []VolatilityPeriod    `json:"volatilityPeriods"`
}

// VolatilityPeriod represents a period of high volatility
type VolatilityPeriod struct {
	StartYear int    `json:"startYear"`
	EndYear   int    `json:"endYear"`
	Reason    string `json:"reason"`
}

// CashFlowChart contains cash flow analysis data
type CashFlowChart struct {
	TimeSeries []CashFlowTimeSeriesPoint `json:"timeSeries"`
	Summary    CashFlowChartSummary      `json:"summary"`
}

// CashFlowTimeSeriesPoint represents a single point in cash flow time series
type CashFlowTimeSeriesPoint struct {
	Year         int              `json:"year"`
	Income       float64          `json:"income"`
	Expenses     float64          `json:"expenses"`
	NetSavings   float64          `json:"netSavings"`
	SavingsRate  float64          `json:"savingsRate"` // 0.0 to 1.0
	Taxes        float64          `json:"taxes"`
	TaxBreakdown TaxBreakdown     `json:"taxBreakdown"`
}

// TaxBreakdown contains detailed tax information
type TaxBreakdown struct {
	Total   float64 `json:"total"`
	Federal float64 `json:"federal"`
	State   float64 `json:"state"`
	Fica    float64 `json:"fica"`
}

// CashFlowChartSummary contains cash flow summary statistics
type CashFlowChartSummary struct {
	AverageAnnualSavings          float64                        `json:"averageAnnualSavings"`
	AverageSavingsRate            float64                        `json:"averageSavingsRate"`           // 0.0 to 1.0
	PeakSavingsYear               int                            `json:"peakSavingsYear"`
	LowestSavingsYear             int                            `json:"lowestSavingsYear"`
	RetirementCashFlowTransition  *RetirementCashFlowTransition  `json:"retirementCashFlowTransition,omitempty"`
}

// RetirementCashFlowTransition represents the cash flow change at retirement
type RetirementCashFlowTransition struct {
	Year          int     `json:"year"`
	IncomeChange  float64 `json:"incomeChange"`
	ExpenseChange float64 `json:"expenseChange"`
}

// AssetAllocationChart contains asset allocation evolution data
type AssetAllocationChart struct {
	TimeSeries   []AssetAllocationPoint `json:"timeSeries"`
	TargetBands  []AllocationTargetBand `json:"targetBands"`
	Summary      AssetAllocationSummary `json:"summary"`
}

// GoalProgressChart contains progress tracking data for a specific goal
type GoalProgressChart struct {
	GoalID              string                    `json:"goalId"`
	GoalName            string                    `json:"goalName"`
	TimeSeries          []GoalProgressTimeSeriesPoint `json:"timeSeries"`
	ProjectionLines     GoalProjectionLines       `json:"projectionLines"`
	Milestones          []GoalMilestone           `json:"milestones"`
	AchievementAnalysis GoalAchievementAnalysis   `json:"achievementAnalysis"`
	TrendAnalysis       GoalTrendAnalysis         `json:"trendAnalysis"`
	Recommendations     []GoalRecommendation      `json:"recommendations"`
}

// GoalProgressTimeSeriesPoint represents goal progress at a specific time
type GoalProgressTimeSeriesPoint struct {
	Year               int     `json:"year"`
	CurrentAmount      float64 `json:"currentAmount"`      // P50 value
	TargetAmount       float64 `json:"targetAmount"`       // Target amount for this year
	ProgressPercentage float64 `json:"progressPercentage"` // 0.0 to 1.0
	OnTrack            bool    `json:"onTrack"`
}

// GoalProjectionLines contains trajectory projections
type GoalProjectionLines struct {
	CurrentTrend  []GoalTrendPoint `json:"currentTrend"`  // Based on median simulation
	RequiredTrend []GoalTrendPoint `json:"requiredTrend"` // Required to meet goal
}

// GoalTrendPoint represents a point on a goal trend line
type GoalTrendPoint struct {
	Year             int     `json:"year"`
	ProjectedAmount  float64 `json:"projectedAmount"`  // For currentTrend
	RequiredAmount   float64 `json:"requiredAmount"`   // For requiredTrend
}

// GoalMilestone represents key milestones toward goal achievement
type GoalMilestone struct {
	Year   int    `json:"year"`
	Label  string `json:"label"`
	Type   string `json:"type"` // 'target' | 'checkpoint' | 'risk' | 'opportunity'
}

// GoalAchievementAnalysis contains achievement probability analysis
type GoalAchievementAnalysis struct {
	ProbabilityOfSuccess     float64               `json:"probabilityOfSuccess"`     // 0.0 to 1.0
	MedianAchievementYear    *int                  `json:"medianAchievementYear"`
	Status                   string                `json:"status"`                   // 'on_track' | 'at_risk' | 'off_track' | 'achieved'
	ConfidenceInterval       GoalConfidenceInterval `json:"confidenceInterval"`
}

// GoalConfidenceInterval contains confidence interval for achievement timing
type GoalConfidenceInterval struct {
	P10AchievementYear *int `json:"p10AchievementYear"`
	P90AchievementYear *int `json:"p90AchievementYear"`
}

// GoalTrendAnalysis contains progress trend analysis
type GoalTrendAnalysis struct {
	AverageMonthlyProgress   float64 `json:"averageMonthlyProgress"`
	Consistency              string  `json:"consistency"`              // 'excellent' | 'good' | 'variable' | 'poor'
	ProgressAcceleration     float64 `json:"progressAcceleration"`     // Positive = accelerating, negative = decelerating
	RecentTrendDirection     string  `json:"recentTrendDirection"`     // 'up' | 'down' | 'stable'
}

// GoalRecommendation contains backend-generated recommendations
type GoalRecommendation struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`    // 'high' | 'medium' | 'low'
	ActionType  string `json:"actionType"`  // 'increase_contributions' | 'adjust_allocation' | 'extend_timeline' | 'reduce_target'
}

// SpreadsheetData contains yearly data with percentiles for spreadsheet export
type SpreadsheetData struct {
	Years []SpreadsheetYearData `json:"years"`
}

// SpreadsheetYearData contains a single year's data with percentile ranges
type SpreadsheetYearData struct {
	Year     int                     `json:"year"`
	Age      int                     `json:"age"`
	Income   SpreadsheetPercentiles  `json:"income"`
	Expenses SpreadsheetPercentiles  `json:"expenses"`
	Taxes    SpreadsheetPercentiles  `json:"taxes"`
	Savings  SpreadsheetPercentiles  `json:"savings"`
	NetWorth SpreadsheetPercentiles  `json:"netWorth"`
}

// SpreadsheetPercentiles contains p10, p50, p90 values for a metric
type SpreadsheetPercentiles struct {
	P10 float64 `json:"p10"`
	P50 float64 `json:"p50"`
	P90 float64 `json:"p90"`
}

// InitialStateEvent represents the initial state of a financial plan
type InitialStateEvent struct {
	ID                  string                 `json:"id"`
	Type                string                 `json:"type"`
	InitialAssets       map[string]interface{} `json:"initialAssets"`
	InitialLiabilities  []LiabilityInfo        `json:"initialLiabilities"`
}

// SimulationOutput represents the output of a simulation run
type SimulationOutput struct {
	Paths      []SimulationPath     `json:"paths"`
	Statistics SimulationStatistics `json:"statistics"`
}

// SimulationPath represents a single simulation path
type SimulationPath struct {
	FinalNetWorth float64 `json:"finalNetWorth"`
}

// SimulationStatistics represents aggregated statistics from simulation runs
type SimulationStatistics struct {
	SuccessRate float64 `json:"successRate"`
}

// AssetAllocationPoint represents asset allocation at a specific time
type AssetAllocationPoint struct {
	Year       int                                `json:"year"`
	TotalValue float64                            `json:"totalValue"`
	Breakdown  map[string]AssetAllocationDetail   `json:"breakdown"` // AssetClass -> Detail
}

// AssetAllocationDetail contains details for a specific asset class
type AssetAllocationDetail struct {
	AssetClass    string                  `json:"assetClass"`
	Value         float64                 `json:"value"`
	Percentage    float64                 `json:"percentage"` // 0 to 1
	TaxBreakdown  AssetClassTaxBreakdown  `json:"taxBreakdown"`
}

// AssetClassTaxBreakdown shows tax treatment breakdown for an asset class
type AssetClassTaxBreakdown struct {
	Taxable          float64 `json:"taxable"`
	TaxAdvantaged    float64 `json:"taxAdvantaged"`    // Combined tax-deferred + Roth
	TaxDeferred      *float64 `json:"taxDeferred,omitempty"`
	Roth             *float64 `json:"roth,omitempty"`
}

// AllocationTargetBand represents target allocation ranges
type AllocationTargetBand struct {
	AssetClass        string  `json:"assetClass"`
	Label             string  `json:"label"`
	MinPercentage     float64 `json:"minPercentage"`    // 0 to 1
	MaxPercentage     float64 `json:"maxPercentage"`    // 0 to 1
	TargetPercentage  float64 `json:"targetPercentage"` // 0 to 1
}

// AssetAllocationSummary contains allocation summary and insights
type AssetAllocationSummary struct {
	CurrentAllocation []AssetAllocationDetail `json:"currentAllocation"`
	TargetAllocation  []AssetAllocationDetail `json:"targetAllocation"`
	DriftFromTarget   []AllocationDrift       `json:"driftFromTarget"`
}

// AllocationDrift represents drift from target allocation
type AllocationDrift struct {
	AssetClass        string  `json:"assetClass"`
	CurrentPercentage float64 `json:"currentPercentage"`
	TargetPercentage  float64 `json:"targetPercentage"`
	DriftPercentage   float64 `json:"driftPercentage"`
}

// EventMarker represents important events on timeline
type EventMarker struct {
	Year             int     `json:"year"`
	NetWorthAtEvent  float64 `json:"netWorthAtEvent"`
	Label            string  `json:"label"`
	Icon             string  `json:"icon"`
	Type             string  `json:"type"`      // 'goal' | 'milestone' | 'risk' | 'opportunity'
	Category         string  `json:"category"`  // 'essential' (life events) | 'detailed' (financial events)
	EventType        string  `json:"eventType"` // Original event type for client-side filtering
	ID               *string `json:"id,omitempty"`
}

// DetailedAnalysis contains comprehensive insights and goal-specific analysis
type DetailedAnalysis struct {
	GoalBreakdowns           []GoalBreakdown              `json:"goalBreakdowns"`
	AnnualSnapshots          map[string]AnnualDeepDiveSnapshot `json:"annualSnapshots"` // year -> snapshot
	AdvancedAnalysisPanels   []AdvancedAnalysisPanel      `json:"advancedAnalysisPanels"`
	RiskAnalysis             *RiskAnalysis                `json:"riskAnalysis,omitempty"`
}

// GoalBreakdown contains comprehensive analysis for a specific goal
type GoalBreakdown struct {
	GoalID          string           `json:"goalId"`
	Name            string           `json:"name"`
	Icon            string           `json:"icon"`
	Description     string           `json:"description"`
	SummaryMetrics  []SummaryMetric  `json:"summaryMetrics"`
	Insights        []GoalInsight    `json:"insights"`
	SubScenarios    []SubScenario    `json:"subScenarios,omitempty"`
	Sensitivity     *SensitivityAnalysis `json:"sensitivity,omitempty"`
}

// SummaryMetric represents a key metric for a goal
type SummaryMetric struct {
	Label string  `json:"label"`
	Value string  `json:"value"`
	Trend *string `json:"trend,omitempty"` // 'positive' | 'negative' | 'neutral'
}

// GoalInsight represents insights and recommendations for a goal
type GoalInsight struct {
	Type       string `json:"type"`       // InsightType from UI types
	Title      string `json:"title"`
	Text       string `json:"text"`
	Priority   string `json:"priority"`   // 'high' | 'medium' | 'low'
	Actionable *bool  `json:"actionable,omitempty"`
}

// SubScenario represents alternative scenarios for a goal
type SubScenario struct {
	Name         string           `json:"name"`
	Description  string           `json:"description"`
	Probability  float64          `json:"probability"`
	Metrics      []SummaryMetric  `json:"metrics"`
}

// SensitivityAnalysis contains sensitivity analysis for a goal
type SensitivityAnalysis struct {
	KeyFactors []SensitivityFactor `json:"keyFactors"`
}

// SensitivityFactor represents a factor affecting goal success
type SensitivityFactor struct {
	Factor      string  `json:"factor"`
	Impact      float64 `json:"impact"`      // -1 to 1, impact on goal success
	Description string  `json:"description"`
}

// RiskAnalysis contains advanced risk analysis
type RiskAnalysis struct {
	SequenceOfReturnsRisk float64        `json:"sequenceOfReturnsRisk"`
	InflationRisk         float64        `json:"inflationRisk"`
	LongevityRisk         float64        `json:"longevityRisk"`
	ConcentrationRisk     float64        `json:"concentrationRisk"`
	KeyRiskFactors        []RiskFactor   `json:"keyRiskFactors"`
}

// RiskFactor represents a key risk factor
type RiskFactor struct {
	Factor      string  `json:"factor"`
	Impact      string  `json:"impact"`      // 'high' | 'medium' | 'low'
	Description string  `json:"description"`
	Mitigation  *string `json:"mitigation,omitempty"`
}

// AdvancedAnalysisPanel represents flexible panel for specialized analysis
type AdvancedAnalysisPanel struct {
	ID          string                  `json:"id"`
	Title       string                  `json:"title"`
	Icon        string                  `json:"icon"`
	Description string                  `json:"description"`
	Category    string                  `json:"category"` // 'tax' | 'investment' | 'risk' | 'strategy' | 'scenario'
	Metrics     []AdvancedMetric        `json:"metrics"`
	ChartData   *ChartData              `json:"chartData,omitempty"`
}

// AdvancedMetric represents a metric with optional display hints
type AdvancedMetric struct {
	Label       string       `json:"label"`
	Value       string       `json:"value"`
	Subtext     *string      `json:"subtext,omitempty"`
	DisplayHint *DisplayHint `json:"displayHint,omitempty"`
}

// DisplayHint provides UI rendering hints for metrics
type DisplayHint struct {
	Type         string   `json:"type"` // 'progress_bar' | 'comparison' | 'trend' | 'default'
	CurrentValue *float64 `json:"currentValue,omitempty"`
	TargetValue  *float64 `json:"targetValue,omitempty"`
	MaxValue     *float64 `json:"maxValue,omitempty"`
	Trend        *string  `json:"trend,omitempty"` // 'up' | 'down' | 'stable'
}

// ChartData contains optional chart data for analysis panels
type ChartData struct {
	Type string      `json:"type"` // 'line' | 'bar' | 'pie' | 'table'
	Data interface{} `json:"data"`
}

// AnnualDeepDiveSnapshot contains complete financial picture for a specific year (P50 path)
// All data is pre-computed and ready for display without additional processing
type AnnualDeepDiveSnapshot struct {
	// Personal information
	Age  int `json:"age"`
	Year int `json:"year"`

	// High-level metrics
	NetWorth         float64              `json:"netWorth"`
	NetWorthChangeYoY NetWorthChangeYoY   `json:"netWorthChangeYoY"`

	// Complete balance sheet - grounded in simulation engine data
	BalanceSheet     BalanceSheet         `json:"balanceSheet"`

	// Cash flow analysis - grounded in WASM MonthSnapshot data
	CashFlow         CashFlowAnalysis     `json:"cashFlow"`

	// Divestment proceeds from forced asset sales (calculated by simulation engine)
	DivestmentProceeds float64            `json:"divestmentProceeds"`

	// Strategy execution and analysis
	StrategyAnalysis StrategyAnalysis     `json:"strategyAnalysis"`
}

// NetWorthChangeYoY represents year-over-year net worth change
type NetWorthChangeYoY struct {
	Amount  float64 `json:"amount"`
	Percent float64 `json:"percent"`
}

// BalanceSheet represents complete balance sheet information
type BalanceSheet struct {
	TotalAssets      float64               `json:"totalAssets"`
	TotalLiabilities float64               `json:"totalLiabilities"`
	InvestmentAccounts InvestmentAccounts  `json:"investmentAccounts"`
	Cash             float64               `json:"cash"`
	InvestmentAllocation []InvestmentAllocation `json:"investmentAllocation"`
}

// InvestmentAccounts breakdown - direct from WASM MonthSnapshot.accounts
type InvestmentAccounts struct {
	Total           float64 `json:"total"`
	TaxableBrokerage float64 `json:"taxableBrokerage"`
	Account401k     float64 `json:"account401k"`  // tax_deferred from WASM
	RothIRA         float64 `json:"rothIRA"`      // roth from WASM
}

// InvestmentAllocation represents allocation of investments
type InvestmentAllocation struct {
	AssetClass       string  `json:"assetClass"`
	Percentage       float64 `json:"percentage"`
	Value            float64 `json:"value"`
	TargetPercentage *float64 `json:"targetPercentage,omitempty"`
}

// CashFlowAnalysis represents detailed cash flow analysis
type CashFlowAnalysis struct {
	GrossIncome     float64          `json:"grossIncome"`     // From WASM incomeThisMonth
	TotalExpenses   float64          `json:"totalExpenses"`   // From WASM expensesThisMonth
	NetCashFlow     float64          `json:"netCashFlow"`     // Computed from income - expenses - taxes
	TotalOutflows   float64          `json:"totalOutflows"`   // Total expenses + taxes + contributions
	IncomeSources   IncomeSources    `json:"incomeSources"`   // Detailed income breakdown
	ExpenseSources  ExpenseSources   `json:"expenseSources"`  // Detailed expense breakdown
	SavingsAnalysis SavingsAnalysis  `json:"savingsAnalysis"` // Savings metrics
}

// IncomeSources represents different sources of income with detailed breakdowns
type IncomeSources struct {
	Employment EmploymentIncome `json:"employment"` // Employment income breakdown
	Investment InvestmentIncome `json:"investment"` // Investment income breakdown
	Retirement RetirementIncome `json:"retirement"` // Retirement income breakdown
	DivestmentProceeds float64 `json:"divestmentProceeds"` // Asset sales proceeds
}

// EmploymentIncome breaks down employment income sources
type EmploymentIncome struct {
	Total      float64 `json:"total"`      // Sum of all employment income
	BaseSalary float64 `json:"baseSalary"` // From WASM SalaryIncomeThisMonth
	Bonus      float64 `json:"bonus"`      // From WASM BonusIncomeThisMonth
	RsuVesting float64 `json:"rsuVesting"` // From WASM RSUIncomeThisMonth
}

// InvestmentIncome breaks down investment income sources
type InvestmentIncome struct {
	Total                   float64 `json:"total"`                   // Sum of all investment income
	QualifiedDividends      float64 `json:"qualifiedDividends"`      // From WASM DividendsReceivedThisMonth.Qualified
	InterestIncome          float64 `json:"interestIncome"`          // From WASM InterestIncomeThisMonth
	ShortTermCapitalGains   float64 `json:"shortTermCapitalGains"`   // From WASM CapitalGainsShortTermThisYear
	LongTermCapitalGains    float64 `json:"longTermCapitalGains"`    // From WASM CapitalGainsLongTermThisYear
}

// RetirementIncome breaks down retirement income sources
type RetirementIncome struct {
	Total           float64 `json:"total"`           // Sum of all retirement income
	SocialSecurity  float64 `json:"socialSecurity"`  // From WASM SocialSecurityBenefitsYTD
	Pension         float64 `json:"pension"`         // From WASM pension income tracking
	Annuities       float64 `json:"annuities"`       // From WASM annuity income tracking
	Withdrawals     float64 `json:"withdrawals"`     // From WASM RMD/withdrawals
}

// TaxDetails represents detailed tax breakdown
type TaxDetails struct {
	Total        float64 `json:"total"`        // Sum of all tax components
	Federal      float64 `json:"federal"`      // From WASM federalIncomeTaxAnnual
	State        float64 `json:"state"`        // From WASM stateIncomeTaxAnnual
	Fica         float64 `json:"fica"`         // From WASM totalFicaTaxAnnual
	CapitalGains float64 `json:"capitalGains"` // From WASM capital gains tax fields
}

// ExpenseSources represents detailed expense breakdown
type ExpenseSources struct {
	Taxes       TaxDetails          `json:"taxes"`       // Tax breakdown
	Living      LivingExpenses      `json:"living"`      // Living expense breakdown
	Investments InvestmentExpenses  `json:"investments"` // Investment contribution breakdown
}

// LivingExpenses breaks down living expenses
type LivingExpenses struct {
	Total       float64 `json:"total"`       // Sum of all living expenses
	Housing     float64 `json:"housing"`     // From WASM HousingExpensesThisMonth
	Other       float64 `json:"other"`       // All other expenses
}

// InvestmentExpenses breaks down investment contributions by account type
type InvestmentExpenses struct {
	Total       float64 `json:"total"`       // Sum of all contributions
	Taxable     float64 `json:"taxable"`     // Contributions to taxable accounts
	TaxDeferred float64 `json:"taxDeferred"` // Contributions to 401(k)/IRA
	Roth        float64 `json:"roth"`        // Contributions to Roth accounts
}

// SavingsAnalysis provides savings metrics
type SavingsAnalysis struct {
	AvailableForSavings float64 `json:"availableForSavings"` // Income - expenses - taxes
	TotalContributions  float64 `json:"totalContributions"`  // Sum of all investment contributions
	SavingsRate         float64 `json:"savingsRate"`         // (income - expenses) / income
	FreeCashFlow        float64 `json:"freeCashFlow"`        // income - expenses - taxes - contributions
}

// StrategyAnalysis represents strategy execution and analysis
type StrategyAnalysis struct {
	Active       []ActiveStrategy  `json:"active"`
	Planned      []PlannedStrategy `json:"planned"`
	KeyMilestones []KeyMilestone   `json:"keyMilestones"`
}

// ActiveStrategy represents currently active strategies
type ActiveStrategy struct {
	StrategyID string           `json:"strategyId"`
	Name       string           `json:"name"`
	Details    string           `json:"details"`
	Metrics    []SummaryMetric  `json:"metrics"`
}

// PlannedStrategy represents planned future strategies
type PlannedStrategy struct {
	StrategyID         string `json:"strategyId"`
	Name               string `json:"name"`
	Status             string `json:"status"`
	Details            string `json:"details"`
	ExpectedActivation string `json:"expectedActivation"`
}

// KeyMilestone represents key milestones and events
type KeyMilestone struct {
	Timeframe string `json:"timeframe"`
	Event     string `json:"event"`
	Detail    string `json:"detail"`
	Impact    string `json:"impact"` // 'positive' | 'negative' | 'neutral'
}

// Legacy SimulationResult for backward compatibility
type SimulationResult struct {
	Success        bool                    `json:"success"`
	MonthlyData    []MonthlyDataSimulation `json:"monthlyData"`
	FinalNetWorth  float64                 `json:"finalNetWorth,omitempty"`
	Error          string                  `json:"error,omitempty"`
	Metadata       map[string]interface{}  `json:"metadata,omitempty"`

	// Enhanced bankruptcy and financial stress data
	IsBankrupt              bool    `json:"isBankrupt,omitempty"`
	BankruptcyMonth         int     `json:"bankruptcyMonth,omitempty"`
	BankruptcyTrigger       string  `json:"bankruptcyTrigger,omitempty"`
	MaxFinancialStressLevel int     `json:"maxFinancialStressLevel,omitempty"`
	MonthsInFinancialStress int     `json:"monthsInFinancialStress,omitempty"`
	MinEmergencyFundMonths  float64 `json:"minEmergencyFundMonths,omitempty"`
	MaxDebtServiceRatio     float64 `json:"maxDebtServiceRatio,omitempty"`

	// Simple bankruptcy tracking (terminal event only)
	FinancialStressEvents []FinancialStressEvent `json:"financialStressEvents,omitempty"`

	// PERF: Incremental metrics for MC (avoids need to iterate MonthlyData)
	// These are populated during simulation for fast metric extraction
	MinCash                float64 `json:"minCash,omitempty"`                // Minimum cash observed (-1 if not tracked)
	MinCashMonth           int     `json:"minCashMonth,omitempty"`           // Month when minimum cash occurred
	CashFloorBreachedMonth int     `json:"cashFloorBreachedMonth,omitempty"` // Month when cash breached floor (-1 if never)
}

// FinancialStressEvent tracks significant financial stress events during simulation
type FinancialStressEvent struct {
	Month               int     `json:"month"`
	StressLevel         int     `json:"stressLevel"`         // 0-4 stress level
	EmergencyFundMonths float64 `json:"emergencyFundMonths"` // Months of expenses covered
	DebtServiceRatio    float64 `json:"debtServiceRatio"`    // Debt payments / income
	TriggerDescription  string  `json:"triggerDescription"`  // What caused this stress level
}

// SimulationResults represents aggregated results from multiple simulation runs
type SimulationResults struct {
	Success              bool    `json:"success"`
	NumberOfRuns         int     `json:"numberOfRuns"`
	FinalNetWorthP10     float64 `json:"finalNetWorthP10"`
	FinalNetWorthP25     float64 `json:"finalNetWorthP25"`
	FinalNetWorthP50     float64 `json:"finalNetWorthP50"`
	FinalNetWorthP75     float64 `json:"finalNetWorthP75"`
	FinalNetWorthP90     float64 `json:"finalNetWorthP90"`
	ProbabilityOfSuccess float64 `json:"probabilityOfSuccess"`

	// Enhanced bankruptcy analytics
	ProbabilityOfBankruptcy    float64        `json:"probabilityOfBankruptcy"`
	BankruptcyCount            int            `json:"bankruptcyCount"`
	BankruptcyTriggerBreakdown map[string]int `json:"bankruptcyTriggerBreakdown,omitempty"`
	AvgBankruptcyMonth         float64        `json:"avgBankruptcyMonth,omitempty"`

	// Bankruptcy timing distribution (when does bankruptcy happen across failed paths)
	BankruptcyMonthP10         int            `json:"bankruptcyMonthP10,omitempty"` // 10th percentile - earliest bankruptcies
	BankruptcyMonthP25         int            `json:"bankruptcyMonthP25,omitempty"` // 25th percentile
	BankruptcyMonthP50         int            `json:"bankruptcyMonthP50,omitempty"` // Median bankruptcy month
	BankruptcyMonthP75         int            `json:"bankruptcyMonthP75,omitempty"` // 75th percentile
	BankruptcyMonthP90         int            `json:"bankruptcyMonthP90,omitempty"` // 90th percentile - latest bankruptcies

	// Financial stress analytics
	ProbabilityOfFinancialStress   float64 `json:"probabilityOfFinancialStress,omitempty"`   // Probability of stress level >= 2
	ProbabilityOfFinancialDistress float64 `json:"probabilityOfFinancialDistress,omitempty"` // Probability of stress level >= 3
	AvgMaxFinancialStressLevel     float64 `json:"avgMaxFinancialStressLevel,omitempty"`
	AvgMinEmergencyFundMonths      float64 `json:"avgMinEmergencyFundMonths,omitempty"`
	AvgMaxDebtServiceRatio         float64 `json:"avgMaxDebtServiceRatio,omitempty"`

	// Recovery analytics
	RecoveryAttemptRate       float64        `json:"recoveryAttemptRate,omitempty"`       // % of paths that attempted recovery
	RecoveryStrategyBreakdown map[string]int `json:"recoveryStrategyBreakdown,omitempty"` // Breakdown of recovery strategies used
	RecoverySuccessRate       float64        `json:"recoverySuccessRate,omitempty"`       // % of recovery attempts that avoided bankruptcy

	// Extended percentiles (P5/P95 in addition to existing P10-P90)
	FinalNetWorthP5  float64 `json:"finalNetWorthP5,omitempty"`
	FinalNetWorthP95 float64 `json:"finalNetWorthP95,omitempty"`

	// Min cash KPIs (across all successful paths)
	MinCashP5  float64 `json:"minCashP5,omitempty"`
	MinCashP50 float64 `json:"minCashP50,omitempty"`
	MinCashP95 float64 `json:"minCashP95,omitempty"`

	// Runway KPIs (ONLY for paths that breached cash floor - omitted if no breaches)
	RunwayP5          int `json:"runwayP5,omitempty"`
	RunwayP50         int `json:"runwayP50,omitempty"`
	RunwayP95         int `json:"runwayP95,omitempty"`
	BreachedPathCount int `json:"breachedPathCount,omitempty"` // Denominator for runway percentiles

	// Breach probability time series (cumulative first-breach)
	BreachProbabilityByMonth []MCBreachProbability `json:"breachProbabilityByMonth,omitempty"`

	// Ever-breach probability (cash floor breach at any point)
	EverBreachProbability float64 `json:"everBreachProbability,omitempty"`

	// Exemplar path reference (trace fetched separately via seed)
	ExemplarPath *ExemplarPath `json:"exemplarPath,omitempty"`

	// Net worth trajectory (percentiles at yearly intervals for fan chart)
	NetWorthTrajectory []NetWorthTrajectoryPoint `json:"netWorthTrajectory,omitempty"`

	// Audit fields
	BaseSeed        int64 `json:"baseSeed,omitempty"`
	SuccessfulPaths int   `json:"successfulPaths,omitempty"` // Paths with valid data (denominator for percentiles)
	FailedPaths     int   `json:"failedPaths,omitempty"`     // Paths that errored/produced no data

	Error string `json:"error,omitempty"`
}

// MCPathMetrics captures per-path metrics for aggregation (internal, not exported to JSON)
type MCPathMetrics struct {
	PathIndex         int
	PathSeed          int64
	TerminalWealth    float64
	MinCash           float64
	MinCashMonth      int
	RunwayMonths      int  // Months until first cash floor breach (-1 if never)
	CashFloorBreached bool
	IsBankrupt        bool
	BankruptcyMonth   int
}

// MCBreachProbability tracks cumulative first-breach probability over time
type MCBreachProbability struct {
	MonthOffset          int     `json:"monthOffset"`
	CumulativeBreachProb float64 `json:"cumulativeBreachProb"` // P(first breach <= this month)
	NewBreachesThisMonth int     `json:"newBreachesThisMonth"` // Count of paths first breaching this month
}

// NetWorthTrajectoryPoint represents net worth percentiles at a specific time point
// Used for fan chart visualization showing outcome dispersion over time
type NetWorthTrajectoryPoint struct {
	MonthOffset int     `json:"monthOffset"`
	Year        int     `json:"year"`
	Age         int     `json:"age,omitempty"`
	P10         float64 `json:"p10"`
	P25         float64 `json:"p25,omitempty"`
	P50         float64 `json:"p50"` // Median
	P75         float64 `json:"p75"`
	P90         float64 `json:"p90,omitempty"`
}

// ExemplarPath holds reference to median path (trace fetched separately)
// NOTE: No embedded DeterministicResults - UI calls RunDeterministicSimulation(seed=PathSeed)
type ExemplarPath struct {
	PathIndex          int     `json:"pathIndex"`
	PathSeed           int64   `json:"pathSeed"`           // Use this seed to fetch full trace
	TerminalWealth     float64 `json:"terminalWealth"`
	SelectionCriterion string  `json:"selectionCriterion"` // "median_terminal_wealth"
}

// ToJSON converts a struct to JSON string
func ToJSON(v interface{}) (string, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON converts JSON string to struct
func FromJSON(jsonStr string, v interface{}) error {
	return json.Unmarshal([]byte(jsonStr), v)
}

// MonthContext provides contextual information for processing each month
type MonthContext struct {
	MonthOffset               int     `json:"monthOffset"`
	CalendarMonth             int     `json:"calendarMonth"` // 0-11 (Jan-Dec)
	CalendarYear              int     `json:"calendarYear"`
	AgeYears                  int     `json:"ageYears"`
	RMDAmountAnnualCalculated float64 `json:"rmdAmountAnnualCalculated"`
	RMDAmountTaken            float64 `json:"rmdAmountTaken"`
	AnnualTaxWithholding      float64 `json:"annualTaxWithholding"`
	AnnualEstimatedPayments   float64 `json:"annualEstimatedPayments"`
}

// SaleTransaction represents a sale transaction for tax tracking
type SaleTransaction struct {
	ID               string     `json:"id"`
	AssetClass       AssetClass `json:"assetClass"`
	Quantity         float64    `json:"quantity"`
	QuantitySold     float64    `json:"quantitySold"` // Added for compatibility
	SalePrice        float64    `json:"salePrice"`
	SaleDate         int        `json:"saleDate"` // Month offset when sold
	Proceeds         float64    `json:"proceeds"`
	CostBasis        float64    `json:"costBasis"`
	RealizedGainLoss float64    `json:"realizedGainLoss"`
	IsLongTerm       bool       `json:"isLongTerm"`
	SoldLots         []TaxLot   `json:"soldLots"`
}

// WithdrawalStrategy represents different withdrawal sequencing strategies
type WithdrawalSequence string

const (
	WithdrawalSequenceTaxEfficient     WithdrawalSequence = "TAX_EFFICIENT"     // Cash -> Taxable -> Tax-deferred -> Roth
	WithdrawalSequenceTaxDeferredFirst WithdrawalSequence = "TAX_DEFERRED_FIRST" // Cash -> Tax-deferred -> Taxable -> Roth (was incorrectly named "PROPORTIONAL")
	WithdrawalSequenceCashFirst        WithdrawalSequence = "CASH_FIRST"        // Deplete cash first, then other accounts
	WithdrawalSequenceTaxDeferred      WithdrawalSequence = "TAX_DEFERRED"      // Tax bracket aware (placeholder logic to be fixed)
)

// LotSaleResult represents the result of selling specific lots
type LotSaleResult struct {
	TotalProceeds      float64           `json:"totalProceeds"`   // Gross proceeds before taxes
	NetProceeds        float64           `json:"netProceeds"`     // Net proceeds after capital gains taxes
	CapitalGainsTax    float64           `json:"capitalGainsTax"` // Capital gains tax owed on this sale
	TotalCostBasis     float64           `json:"totalCostBasis"`
	TotalRealizedGains float64           `json:"totalRealizedGains"`
	ShortTermGains     float64           `json:"shortTermGains"`
	LongTermGains      float64           `json:"longTermGains"`
	SoldLots           []TaxLot          `json:"soldLots"`
	SaleTransactions   []SaleTransaction `json:"saleTransactions"`
}

// Advanced Strategy Types

// TaxLossHarvestingSettings configures tax-loss harvesting strategy
type TaxLossHarvestingSettings struct {
	Enabled                 bool    `json:"enabled"`
	MaxAnnualLossHarvest    float64 `json:"maxAnnualLossHarvest"`    // Default: $3,000
	MinimumLossThreshold    float64 `json:"minimumLossThreshold"`    // Minimum loss to trigger harvesting
	WashSaleAvoidancePeriod int     `json:"washSaleAvoidancePeriod"` // Days to avoid wash sale (typically 31)
	ReplaceWithSimilar      bool    `json:"replaceWithSimilar"`      // Replace sold assets with similar assets
}

// StrategicCapitalGainsSettings configures strategic capital gains realization
type StrategicCapitalGainsSettings struct {
	Enabled             bool    `json:"enabled"`
	TargetTaxBracket    float64 `json:"targetTaxBracket"`    // 0.0 for 0% bracket, 0.15 for 15% bracket
	MaxGainsPerYear     float64 `json:"maxGainsPerYear"`     // Maximum gains to realize annually
	MinGainThreshold    float64 `json:"minGainThreshold"`    // Minimum gain to trigger realization
	AllowShortTermGains bool    `json:"allowShortTermGains"` // Whether to allow short-term gains
}

// ConcentrationRiskSettings configures concentration risk monitoring
type ConcentrationRiskSettings struct {
	Enabled             bool    `json:"enabled"`
	ThresholdPercentage float64 `json:"thresholdPercentage"` // Percentage threshold for alerts (e.g., 5.0 for 5%)
	AutoRebalance       bool    `json:"autoRebalance"`       // Automatically rebalance when threshold exceeded
}

// ConcentrationRiskAlert represents a concentration risk alert
type ConcentrationRiskAlert struct {
	AssetClass           AssetClass `json:"assetClass"`
	CurrentConcentration float64    `json:"currentConcentration"` // Current percentage
	ThresholdExceeded    float64    `json:"thresholdExceeded"`    // Amount over threshold
	RecommendedAction    string     `json:"recommendedAction"`
	DetectedMonth        int        `json:"detectedMonth"`
}

// AdvancedTaxContext provides tax context for strategic decisions
type AdvancedTaxContext struct {
	OrdinaryIncomeYTD        float64 `json:"ordinaryIncomeYTD"`
	LongTermCapitalGainsYTD  float64 `json:"longTermCapitalGainsYTD"`
	ShortTermCapitalGainsYTD float64 `json:"shortTermCapitalGainsYTD"`
	CapitalLossesYTD         float64 `json:"capitalLossesYTD"`
	QualifiedDividendsYTD    float64 `json:"qualifiedDividendsYTD"`
	TaxWithholdingYTD        float64 `json:"taxWithholdingYTD"`
	EstimatedPaymentsYTD     float64 `json:"estimatedPaymentsYTD"`
	CurrentTaxBracket        float64 `json:"currentTaxBracket"`
	CurrentLTCGBracket       float64 `json:"currentLTCGBracket"`
}

// AdvancedCashManagementStrategy configures advanced cash management
type AdvancedCashManagementStrategy struct {
	TargetCashReserve          float64               `json:"targetCashReserve"`
	AutomaticallyMeetShortfall bool                  `json:"automaticallyMeetShortfall"`
	AutomaticallyInvestExcess  bool                  `json:"automaticallyInvestExcess"`
	InvestmentPreferences      InvestmentPreferences `json:"investmentPreferences"`
}

// InvestmentPreferences specifies how to invest excess cash
type InvestmentPreferences struct {
	PreferredAccount    string     `json:"preferredAccount"` // "taxable", "tax_deferred", "roth"
	PreferredAssetClass AssetClass `json:"preferredAssetClass"`
}

// AssetAllocationStrategy represents target asset allocations
type AssetAllocationStrategy struct {
	StrategyType       string                 `json:"strategyType"` // "fixed", "age_based", "glide_path"
	Allocations        map[AssetClass]float64 `json:"allocations"`  // Asset class to percentage mapping
	RebalanceThreshold float64                `json:"rebalanceThreshold"`
}

// AssetLocationPreferences defines preferred account types for asset classes
type AssetLocationPreferences struct {
	Preferences map[AssetClass][]AccountType `json:"preferences"` // Ordered by preference
}

// RebalancingParameters controls portfolio rebalancing behavior
type RebalancingParameters struct {
	Method              string  `json:"method"`              // "threshold", "periodic", "hybrid"
	ThresholdPercentage float64 `json:"thresholdPercentage"` // Deviation threshold for rebalancing
	Frequency           string  `json:"frequency"`           // "monthly", "quarterly", "annually"
	MinimumTradeSize    float64 `json:"minimumTradeSize"`    // Minimum trade amount
	TaxAwarenessLevel   string  `json:"taxAwarenessLevel"`   // "none", "basic", "advanced"
}

// CashManagementStrategy controls cash reserves and investment
type CashManagementStrategy struct {
	TargetReserveMonths  float64 `json:"targetReserveMonths"`  // Months of expenses to keep in cash
	TargetReserveAmount  float64 `json:"targetReserveAmount"`  // Absolute dollar amount
	AutoInvestExcess     bool    `json:"autoInvestExcess"`     // Automatically invest excess cash
	AutoSellForShortfall bool    `json:"autoSellForShortfall"` // Automatically sell for cash needs
	NoAutoLiquidate      bool    `json:"noAutoLiquidate"`      // PFOS-E: "Show the wall" - don't auto-liquidate, allow negative cash
}

// DebtManagementStrategy controls debt payoff strategies
type DebtManagementStrategy struct {
	Method               string         `json:"method"`               // "avalanche", "snowball", "custom"
	ExtraPaymentAmount   float64        `json:"extraPaymentAmount"`   // Monthly extra payment
	TargetPayoffDates    map[string]int `json:"targetPayoffDates"`    // Debt ID to target month mapping
	DebtPriorities       map[string]int `json:"debtPriorities"`       // Debt ID to priority mapping
	MaxLeverageRatio     float64        `json:"maxLeverageRatio"`     // PFOS-E: Maximum debt-to-assets ratio (e.g., 0.8 = 80%)
	BlockNewDebtOnBreach bool           `json:"blockNewDebtOnBreach"` // PFOS-E: Block new debt when leverage exceeded
}

// RetirementWithdrawalStrategy controls retirement withdrawal behavior
type RetirementWithdrawalStrategy struct {
	Method                     string          `json:"method"`                     // "constant_inflation_adjusted", "vpw", "guardrail"
	BaseWithdrawalRate         float64         `json:"baseWithdrawalRate"`         // Initial withdrawal rate (e.g., 0.04 for 4%)
	InflationAdjustment        bool            `json:"inflationAdjustment"`        // Adjust withdrawals for inflation
	TaxEfficientSequence       bool            `json:"taxEfficientSequence"`       // Use tax-efficient withdrawal order
	GuardrailParameters        GuardrailConfig `json:"guardrailParameters"`
	ProtectRetirementAccounts  bool            `json:"protectRetirementAccounts"`  // PFOS-E: Block withdrawals from TaxDeferred/Roth before age
	ProtectionMinAge           float64         `json:"protectionMinAge"`           // Minimum age for retirement withdrawals (default 59.5)
}

// QualifiedCharitableDistributionSettings controls QCD behavior
type QualifiedCharitableDistributionSettings struct {
	Enabled          bool    `json:"enabled"`
	AnnualAmount     float64 `json:"annualAmount"`     // Annual QCD amount
	SatisfyRMDFirst  bool    `json:"satisfyRMDFirst"`  // Use QCD to satisfy RMD requirement
	PreferredAccount string  `json:"preferredAccount"` // Account ID for QCD source
}

// EventPriority defines the processing order for events within a time step
type EventPriority int

const (
	// System events
	PriorityTimeStep EventPriority = 10

	// Income events
	PriorityPensionIncome  EventPriority = 25
	PrioritySocialSecurity EventPriority = 28
	PriorityIncome         EventPriority = 30

	// Liabilities and expenses (BEFORE contributions - must pay expenses first)
	PriorityDebtPayment EventPriority = 50
	PriorityExpenses    EventPriority = 60

	// Contributions (AFTER expenses - only contribute from excess income)
	// Priority order: 401k/tax-deferred > Roth > Taxable > HSA > 529
	PriorityContribution401k   EventPriority = 65 // Tax-deferred (401k, 403b, Traditional IRA)
	PriorityContributionRoth   EventPriority = 66 // Roth (Roth IRA, Roth 401k)
	PriorityContributionHSA    EventPriority = 67 // HSA (Health Savings Account)
	PriorityContribution529    EventPriority = 68 // 529 (Education Savings)
	PriorityContributionTaxable EventPriority = 69 // Taxable brokerage
	PriorityContributions      EventPriority = 65 // Legacy/default (maps to 401k priority)

	// Investment transactions
	PriorityAssetSales        EventPriority = 70
	PriorityRebalancing       EventPriority = 80
	PriorityTaxLossHarvesting EventPriority = 90
	PriorityAssetPurchases    EventPriority = 100
	PriorityRMD               EventPriority = 105

	// Strategic transactions
	PriorityRothConversion EventPriority = 120
	PriorityHealthcare     EventPriority = 125
	PriorityGoalFunding    EventPriority = 130

	// Market updates (apply returns after flows/transfers, before year-end checks)
	PriorityMarketUpdate EventPriority = 110

	// Year-end events
	PriorityTaxCalculation EventPriority = 160
	PriorityTaxPayment     EventPriority = 170
	PriorityYearEnd        EventPriority = 190
)

// StrategySettings aggregates all strategy configurations
type StrategySettings struct {
	AssetAllocation       AssetAllocationStrategy                 `json:"assetAllocation"`
	AssetLocation         AssetLocationPreferences                `json:"assetLocation"`
	Rebalancing           RebalancingParameters                   `json:"rebalancing"`
	TaxLossHarvesting     TaxLossHarvestingSettings               `json:"taxLossHarvesting"`
	StrategicCapitalGains StrategicCapitalGainsSettings           `json:"strategicCapitalGains"`
	CashManagement        CashManagementStrategy                  `json:"cashManagement"`
	DebtManagement        DebtManagementStrategy                  `json:"debtManagement"`
	RetirementWithdrawal  RetirementWithdrawalStrategy            `json:"retirementWithdrawal"`
	QualifiedCharitable   QualifiedCharitableDistributionSettings `json:"qualifiedCharitable"`
	ConcentrationRisk     ConcentrationRiskSettings               `json:"concentrationRisk"`
}

// ExtendedAssetClass provides more granular asset classification
type ExtendedAssetClass string

const (
	// US Equities
	ExtendedAssetClassUSLargeCap ExtendedAssetClass = "US_LARGE_CAP_STOCK"
	ExtendedAssetClassUSMidCap   ExtendedAssetClass = "US_MID_CAP_STOCK"
	ExtendedAssetClassUSSmallCap ExtendedAssetClass = "US_SMALL_CAP_STOCK"
	ExtendedAssetClassUSValue    ExtendedAssetClass = "US_VALUE_STOCK"
	ExtendedAssetClassUSGrowth   ExtendedAssetClass = "US_GROWTH_STOCK"

	// International Equities
	ExtendedAssetClassIntlDeveloped  ExtendedAssetClass = "INTERNATIONAL_DEVELOPED_STOCK"
	ExtendedAssetClassEmergingMarket ExtendedAssetClass = "EMERGING_MARKET_STOCK"

	// Fixed Income
	ExtendedAssetClassUSTreasury    ExtendedAssetClass = "US_TREASURY_BOND"
	ExtendedAssetClassCorporateBond ExtendedAssetClass = "CORPORATE_BOND"
	ExtendedAssetClassMunicipalBond ExtendedAssetClass = "MUNICIPAL_BOND"
	ExtendedAssetClassIntlBond      ExtendedAssetClass = "INTERNATIONAL_BOND"
	ExtendedAssetClassTIPS          ExtendedAssetClass = "TREASURY_INFLATION_PROTECTED"

	// Alternatives
	ExtendedAssetClassREIT          ExtendedAssetClass = "REAL_ESTATE_REIT"
	ExtendedAssetClassCommodities   ExtendedAssetClass = "COMMODITIES"
	ExtendedAssetClassGold          ExtendedAssetClass = "GOLD"
	ExtendedAssetClassCrypto        ExtendedAssetClass = "CRYPTO_ASSET"
	ExtendedAssetClassPrivateEquity ExtendedAssetClass = "PRIVATE_EQUITY_FUND_INTEREST"
	ExtendedAssetClassHedgeFund     ExtendedAssetClass = "HEDGE_FUND_INTEREST"

	// Cash equivalents
	ExtendedAssetClassCashEquivalent ExtendedAssetClass = "CASH_EQUIVALENT"
)

// DetailedAccountType provides more granular account classification
type DetailedAccountType string

const (
	// Taxable accounts
	DetailedAccountTypeTaxableBrokerage DetailedAccountType = "TAXABLE_BROKERAGE"
	DetailedAccountTypeChecking         DetailedAccountType = "CHECKING"
	DetailedAccountTypeSavings          DetailedAccountType = "SAVINGS"
	DetailedAccountTypeMoneyMarket      DetailedAccountType = "MONEY_MARKET_ACCOUNT"
	DetailedAccountTypeCD               DetailedAccountType = "CERTIFICATE_OF_DEPOSIT"

	// Tax-deferred accounts
	DetailedAccountTypeTraditionalIRA     DetailedAccountType = "TRADITIONAL_IRA"
	DetailedAccountTypeSEPIRA             DetailedAccountType = "SEP_IRA"
	DetailedAccountTypeSimpleIRA          DetailedAccountType = "SIMPLE_IRA"
	DetailedAccountTypeSolo401kPreTax     DetailedAccountType = "SOLO_401K_PRETAX"
	DetailedAccountTypeEmployer401kPreTax DetailedAccountType = "EMPLOYER_401K_PRETAX"
	DetailedAccountTypeEmployer403bPreTax DetailedAccountType = "EMPLOYER_403B_PRETAX"
	DetailedAccountTypePension            DetailedAccountType = "PENSION"

	// Tax-free accounts
	DetailedAccountTypeRothIRA          DetailedAccountType = "ROTH_IRA"
	DetailedAccountTypeSolo401kRoth     DetailedAccountType = "SOLO_401K_ROTH"
	DetailedAccountTypeEmployer401kRoth DetailedAccountType = "EMPLOYER_401K_ROTH"
	DetailedAccountTypeEmployer403bRoth DetailedAccountType = "EMPLOYER_403B_ROTH"
	DetailedAccountTypeHSA              DetailedAccountType = "HSA"
	DetailedAccountTypeCoverdellESA     DetailedAccountType = "COVERDELL_ESA"
	DetailedAccountType529Plan          DetailedAccountType = "_529_PLAN"

	// Other specialized accounts
	DetailedAccountTypeFSA      DetailedAccountType = "FSA"
	DetailedAccountTypeUTMAUGMA DetailedAccountType = "UTMA_UGMA"
)

// MarketPrices tracks current market prices per share for accurate share-based calculations
// This enables proper tracking of quantity as shares rather than dollars
type MarketPrices struct {
	SPY        float64 `json:"spy"`        // S&P 500 Total Market ETF price per share
	BND        float64 `json:"bnd"`        // US Total Bond Market ETF price per share
	INTL       float64 `json:"intl"`       // International Stock ETF price per share
	RealEstate float64 `json:"realEstate"` // Real Estate per square foot (or per property)
	Individual float64 `json:"individual"` // Individual stock price (company-specific)
	Cash       float64 `json:"cash"`       // Always 1.0 (cash is cash)
	Other      float64 `json:"other"`      // Other/Alternative assets composite price
}

// GetPriceForAssetClass returns the current market price for a specific asset class
func (mp *MarketPrices) GetPriceForAssetClass(assetClass AssetClass) float64 {
	switch assetClass {
	case AssetClassUSStocksTotalMarket, AssetClassLeveragedSPY:
		return mp.SPY
	case AssetClassUSBondsTotalMarket:
		return mp.BND
	case AssetClassInternationalStocks:
		return mp.INTL
	case AssetClassRealEstatePrimaryHome:
		return mp.RealEstate
	case AssetClassIndividualStock:
		return mp.Individual
	case AssetClassCash:
		return mp.Cash
	case AssetClassOtherAssets:
		return mp.Other
	default:
		// CRITICAL: Engine must fail fast for unknown asset classes
		// No fake data - return invalid price to force immediate failure
		simLogVerbose("CRITICAL: Unknown asset class '%s' in GetPriceForAssetClass. Returning 0 to force simulation failure.", assetClass)
		return 0.0
	}
}

// CreateDefaultMarketPrices creates normalized starting market prices for simulation
// Using $1.00 as the base price makes the math simple:
//   - $500,000 at $1/share = 500,000 shares
//   - After 0.8% return: price = $1.008, value = 500,000 × $1.008 = $504,000
// This is mathematically equivalent to percentage-based growth and never needs updating.
func CreateDefaultMarketPrices() MarketPrices {
	return MarketPrices{
		SPY:        1.0,  // Normalized: $1/share means shares = dollars
		BND:        1.0,  // Normalized: percentage returns work correctly
		INTL:       1.0,  // Normalized: no arbitrary price assumptions
		RealEstate: 1.0,  // Normalized: value tracks directly
		Individual: 1.0,  // Normalized: simple accounting
		Cash:       1.0,  // Cash is always $1 per $1
		Other:      1.0,  // Normalized: consistent with other assets
	}
}

// ========================================================================
// TYPE-SAFE EVENT METADATA STRUCTS
// ========================================================================
// These structs replace map[string]interface{} parsing with type-safe
// structures for complex event metadata. This eliminates runtime type
// assertion errors and makes the contract between UI and engine explicit.

// LiabilityDetailsMetadata represents structured metadata for liability events
type LiabilityDetailsMetadata struct {
	ID                         string  `json:"id"`
	Name                       string  `json:"name"`
	Type                       string  `json:"type"` // "MORTGAGE", "AUTO_LOAN", "STUDENT_LOAN", etc.
	InitialPrincipal           float64 `json:"initialPrincipal"`
	InterestRate               float64 `json:"interestRate"`           // Annual rate (e.g., 0.045 for 4.5%)
	TermMonths                 int     `json:"termMonths"`             // Total loan term in months
	IsTaxDeductible            bool    `json:"isTaxDeductible"`        // Whether interest is tax-deductible

	// PITI Components (for mortgages)
	PropertyTaxAnnual          float64 `json:"propertyTaxAnnual,omitempty"`          // Annual property taxes
	HomeownersInsuranceAnnual  float64 `json:"homeownersInsuranceAnnual,omitempty"`  // Annual homeowner's insurance
	PMIAnnual                  float64 `json:"pmiAnnual,omitempty"`                  // Annual Private Mortgage Insurance
	PropertyTaxDeductible      bool    `json:"propertyTaxDeductible,omitempty"`      // Whether property tax is tax-deductible
	MortgageInterestDeductible bool    `json:"mortgageInterestDeductible,omitempty"` // Whether mortgage interest is tax-deductible

	// Additional metadata
	LenderName                 string  `json:"lenderName,omitempty"`     // Name of lending institution
	AccountNumber              string  `json:"accountNumber,omitempty"`  // Account number (for tracking)
	Notes                      string  `json:"notes,omitempty"`          // Additional notes
}

// PropertyDetailsMetadata represents structured metadata for real estate events
type PropertyDetailsMetadata struct {
	ID                    string  `json:"id"`
	Address               string  `json:"address"`
	PropertyType          string  `json:"propertyType"` // "PRIMARY_HOME", "RENTAL", "VACATION", etc.
	PurchasePrice         float64 `json:"purchasePrice"`
	DownPaymentAmount     float64 `json:"downPaymentAmount"`
	ClosingCosts          float64 `json:"closingCosts"`

	// Property characteristics
	SquareFeet           int     `json:"squareFeet,omitempty"`
	YearBuilt            int     `json:"yearBuilt,omitempty"`
	Bedrooms             int     `json:"bedrooms,omitempty"`
	Bathrooms            float64 `json:"bathrooms,omitempty"`
	LotSizeAcres         float64 `json:"lotSizeAcres,omitempty"`

	// Financial details
	PropertyTaxRate      float64 `json:"propertyTaxRate,omitempty"`      // Annual property tax rate
	InsuranceAnnual      float64 `json:"insuranceAnnual,omitempty"`      // Annual insurance cost
	HOAFeesMonthly       float64 `json:"hoaFeesMonthly,omitempty"`       // Monthly HOA fees
	MaintenancePercent   float64 `json:"maintenancePercent,omitempty"`   // Annual maintenance as % of value

	// Rental property details (if applicable)
	ExpectedRentMonthly  float64 `json:"expectedRentMonthly,omitempty"`  // Monthly rental income
	VacancyRate          float64 `json:"vacancyRate,omitempty"`          // Expected vacancy rate
	PropertyManagementFee float64 `json:"propertyManagementFee,omitempty"` // Property management fee as %

	// Location and market data
	City                 string  `json:"city,omitempty"`
	State                string  `json:"state,omitempty"`
	ZipCode              string  `json:"zipCode,omitempty"`
	SchoolDistrict       string  `json:"schoolDistrict,omitempty"`

	// Additional metadata
	Notes                string  `json:"notes,omitempty"`
}

// StrategySettingsMetadata represents structured metadata for strategy events
type StrategySettingsMetadata struct {
	StrategyName         string             `json:"strategyName"`
	StrategyType         string             `json:"strategyType"` // "fixed", "glide_path", "target_date", etc.
	TargetAllocations    map[string]float64 `json:"targetAllocations"` // Asset class to allocation percentage
	RebalanceThreshold   float64            `json:"rebalanceThreshold,omitempty"` // Threshold for automatic rebalancing
	RebalanceFrequency   string             `json:"rebalanceFrequency,omitempty"` // "monthly", "quarterly", "annually"
	RiskTolerance        string             `json:"riskTolerance,omitempty"`      // "conservative", "moderate", "aggressive"
	TimeHorizon          int                `json:"timeHorizon,omitempty"`        // Investment time horizon in years

	// Glide path settings (if applicable)
	GlidePath            []struct {
		Age        int                `json:"age"`
		Allocations map[string]float64 `json:"allocations"`
	} `json:"glidePath,omitempty"`

	// Tax optimization settings
	TaxLossHarvesting    bool    `json:"taxLossHarvesting,omitempty"`
	AssetLocationOptimization bool `json:"assetLocationOptimization,omitempty"`

	// Additional metadata
	Description          string  `json:"description,omitempty"`
	Notes                string  `json:"notes,omitempty"`
}

// IncomeDetailsMetadata represents structured metadata for income events
type IncomeDetailsMetadata struct {
	EmployerName         string  `json:"employerName,omitempty"`
	JobTitle             string  `json:"jobTitle,omitempty"`
	IncomeType           string  `json:"incomeType"` // "SALARY", "HOURLY", "BONUS", "COMMISSION", "SELF_EMPLOYMENT", etc.
	PayFrequency         string  `json:"payFrequency"` // "WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUALLY"

	// Tax withholdings and deductions
	FederalWithholding   float64 `json:"federalWithholding,omitempty"`   // Federal tax withholding rate
	StateWithholding     float64 `json:"stateWithholding,omitempty"`     // State tax withholding rate
	SocialSecurityTax    float64 `json:"socialSecurityTax,omitempty"`    // Social Security tax rate
	MedicareTax          float64 `json:"medicareTax,omitempty"`          // Medicare tax rate

	// Retirement contributions
	Pre401kContribution  float64 `json:"pre401kContribution,omitempty"`  // Pre-tax 401k contribution rate
	Roth401kContribution float64 `json:"roth401kContribution,omitempty"` // Roth 401k contribution rate
	HSAContribution      float64 `json:"hsaContribution,omitempty"`      // HSA contribution amount

	// Benefits
	HealthInsurancePremium float64 `json:"healthInsurancePremium,omitempty"` // Monthly health insurance premium
	OtherDeductions      float64 `json:"otherDeductions,omitempty"`        // Other pre-tax deductions

	// Performance and growth
	ExpectedAnnualRaise  float64 `json:"expectedAnnualRaise,omitempty"`    // Expected annual raise percentage
	BonusTarget          float64 `json:"bonusTarget,omitempty"`            // Target annual bonus amount

	// Additional metadata
	StartDate            string  `json:"startDate,omitempty"`   // Job start date (ISO format)
	EndDate              string  `json:"endDate,omitempty"`     // Job end date (ISO format, if known)
	Notes                string  `json:"notes,omitempty"`
}

// =============================================================================
// DETERMINISTIC SIMULATION TYPES
// =============================================================================

// DeterministicAssumptions holds the constant growth rates used in deterministic mode
type DeterministicAssumptions struct {
	StockReturnAnnual    float64 `json:"stockReturnAnnual"`    // Annual stock return (e.g., 0.098 for 9.8%)
	BondReturnAnnual     float64 `json:"bondReturnAnnual"`     // Annual bond return (e.g., 0.042 for 4.2%)
	InflationAnnual      float64 `json:"inflationAnnual"`      // Annual inflation rate (e.g., 0.026 for 2.6%)
	IntlStockReturnAnnual float64 `json:"intlStockReturnAnnual"` // International stock return
	HomeAppreciationAnnual float64 `json:"homeAppreciationAnnual"` // Home value appreciation
}

// DeterministicMonthSnapshot represents a single month's complete financial state
type DeterministicMonthSnapshot struct {
	MonthOffset    int     `json:"monthOffset"`
	CalendarYear   int     `json:"calendarYear"`
	CalendarMonth  int     `json:"calendarMonth"`   // 1-12
	Age            float64 `json:"age"`             // Fractional age

	// Balances at end of month
	NetWorth           float64 `json:"netWorth"`
	CashBalance        float64 `json:"cashBalance"`
	TaxableBalance     float64 `json:"taxableBalance"`
	TaxDeferredBalance float64 `json:"taxDeferredBalance"`
	RothBalance        float64 `json:"rothBalance"`
	HSABalance         float64 `json:"hsaBalance,omitempty"`
	FiveTwoNineBalance float64 `json:"fiveTwoNineBalance,omitempty"`

	// Flows this month
	IncomeThisMonth        float64 `json:"incomeThisMonth"`
	ExpensesThisMonth      float64 `json:"expensesThisMonth"`
	TaxesThisMonth         float64 `json:"taxesThisMonth"`
	ContributionsThisMonth float64 `json:"contributionsThisMonth"`
	WithdrawalsThisMonth   float64 `json:"withdrawalsThisMonth"`
	InvestmentGrowth       float64 `json:"investmentGrowth"`  // Growth from returns this month
	DivestmentProceeds     float64 `json:"divestmentProceeds,omitempty"`

	// Event IDs that occurred this month (for linking to event trace)
	EventIDs []string `json:"eventIds,omitempty"`
}

// EventTraceEntry captures the before/after impact of a single event during simulation
type EventTraceEntry struct {
	MonthOffset int    `json:"monthOffset"`
	EventID     string `json:"eventId"`
	EventName   string `json:"eventName"`
	EventType   string `json:"eventType"`
	Priority    int    `json:"priority"`
	Amount      float64 `json:"amount"`

	// State BEFORE this event was processed
	NetWorthBefore     float64 `json:"netWorthBefore"`
	CashBefore         float64 `json:"cashBefore"`
	TaxableBefore      float64 `json:"taxableBefore"`
	TaxDeferredBefore  float64 `json:"taxDeferredBefore"`
	RothBefore         float64 `json:"rothBefore"`

	// State AFTER this event was processed
	NetWorthAfter     float64 `json:"netWorthAfter"`
	CashAfter         float64 `json:"cashAfter"`
	TaxableAfter      float64 `json:"taxableAfter"`
	TaxDeferredAfter  float64 `json:"taxDeferredAfter"`
	RothAfter         float64 `json:"rothAfter"`

	// Human-readable description of what happened
	Description string `json:"description"`
}

// DeterministicYearData aggregates a year's data for the spreadsheet view
type DeterministicYearData struct {
	Year             int     `json:"year"`
	Age              int     `json:"age"`
	StartNetWorth    float64 `json:"startNetWorth"`
	EndNetWorth      float64 `json:"endNetWorth"`
	NetWorthChange   float64 `json:"netWorthChange"`
	TotalIncome      float64 `json:"totalIncome"`
	TotalExpenses    float64 `json:"totalExpenses"`
	TotalTaxes       float64 `json:"totalTaxes"`
	TotalContributions float64 `json:"totalContributions"`
	TotalWithdrawals float64 `json:"totalWithdrawals"`
	InvestmentGrowth float64 `json:"investmentGrowth"`

	// Detailed monthly data for expansion
	Months []DeterministicMonthSnapshot `json:"months"`
}

// DeterministicResults is the complete output of a deterministic simulation
type DeterministicResults struct {
	Success     bool                   `json:"success"`
	Error       string                 `json:"error,omitempty"`
	Assumptions DeterministicAssumptions `json:"assumptions"`

	// Complete simulation data
	MonthlySnapshots []DeterministicMonthSnapshot `json:"monthlySnapshots"`
	EventTrace       []EventTraceEntry            `json:"eventTrace"`

	// Pre-computed yearly aggregates for UI
	YearlyData []DeterministicYearData `json:"yearlyData"`

	// Final state
	FinalNetWorth float64 `json:"finalNetWorth"`
	IsBankrupt    bool    `json:"isBankrupt"`
	BankruptcyMonth int   `json:"bankruptcyMonth,omitempty"`

	// Comprehensive monthly state for enhanced spreadsheet view
	ComprehensiveMonthlyStates []DeterministicMonthState `json:"comprehensiveMonthlyStates,omitempty"`

	// Seeded stochastic simulation metadata
	Seed                  int64                    `json:"seed,omitempty"`                  // Random seed used (0 = deterministic or unseeded stochastic)
	SimulationMode        string                   `json:"simulationMode"`                  // "deterministic" | "stochastic"
	ModelDescription      string                   `json:"modelDescription,omitempty"`      // e.g., "PCG32 seeded GARCH(1,1) with Student-t(5)"
	RealizedPathVariables []RealizedMonthVariables `json:"realizedPathVariables,omitempty"` // Per-month stochastic realizations
}

// =============================================================================
// COMPREHENSIVE STATE TYPES FOR ENHANCED SPREADSHEET VIEW
// =============================================================================

// ComprehensiveTaxLotDetail captures full tax lot information for spreadsheet display
type ComprehensiveTaxLotDetail struct {
	LotID            string  `json:"lotId"`
	AssetClass       string  `json:"assetClass"`
	Quantity         float64 `json:"quantity"`
	CostBasisPerUnit float64 `json:"costBasisPerUnit"`
	CostBasisTotal   float64 `json:"costBasisTotal"`
	CurrentValue     float64 `json:"currentValue"`
	UnrealizedGain   float64 `json:"unrealizedGain"`
	AcquisitionMonth int     `json:"acquisitionMonth"`
	IsLongTerm       bool    `json:"isLongTerm"`
}

// ComprehensiveHoldingDetail captures a holding with its tax lots
type ComprehensiveHoldingDetail struct {
	HoldingID            string                      `json:"holdingId"`
	AssetClass           string                      `json:"assetClass"`
	TotalQuantity        float64                     `json:"totalQuantity"`
	TotalValue           float64                     `json:"totalValue"`
	TotalCostBasis       float64                     `json:"totalCostBasis"`
	UnrealizedGain       float64                     `json:"unrealizedGain"`
	WeightedAvgCostBasis float64                     `json:"weightedAvgCostBasis"`
	Lots                 []ComprehensiveTaxLotDetail `json:"lots"`
}

// ComprehensiveAccountState captures full account state with all holdings and lots
type ComprehensiveAccountState struct {
	TotalValue       float64                      `json:"totalValue"`
	TotalCostBasis   float64                      `json:"totalCostBasis"`
	UnrealizedGain   float64                      `json:"unrealizedGain"`
	LongTermGain     float64                      `json:"longTermGain"`
	ShortTermGain    float64                      `json:"shortTermGain"`
	Holdings         []ComprehensiveHoldingDetail `json:"holdings"`
}

// ComprehensiveTaxState captures all YTD tax tracking from SimulationEngine
type ComprehensiveTaxState struct {
	// YTD Income tracking
	OrdinaryIncomeYTD         float64 `json:"ordinaryIncomeYTD"`
	QualifiedDividendsYTD     float64 `json:"qualifiedDividendsYTD"`
	OrdinaryDividendsYTD      float64 `json:"ordinaryDividendsYTD"`
	InterestIncomeYTD         float64 `json:"interestIncomeYTD"`
	SocialSecurityBenefitsYTD float64 `json:"socialSecurityBenefitsYTD"`

	// YTD Capital gains
	ShortTermCapGainsYTD float64 `json:"shortTermCapGainsYTD"`
	LongTermCapGainsYTD  float64 `json:"longTermCapGainsYTD"`
	CapitalLossesYTD     float64 `json:"capitalLossesYTD"`
	CapitalLossCarryover float64 `json:"capitalLossCarryover"`

	// YTD Deductions
	ItemizedDeductibleInterestYTD float64 `json:"itemizedDeductibleInterestYTD"`
	PreTaxContributionsYTD        float64 `json:"preTaxContributionsYTD"`
	CharitableDistributionsYTD    float64 `json:"charitableDistributionsYTD"`

	// YTD Payments
	TaxWithholdingYTD    float64 `json:"taxWithholdingYTD"`
	EstimatedPaymentsYTD float64 `json:"estimatedPaymentsYTD"`

	// Accrual tracking
	UnpaidTaxLiability float64 `json:"unpaidTaxLiability"`

	// Bracket information
	CurrentMarginalBracket float64 `json:"currentMarginalBracket"`
	CurrentLTCGBracket     float64 `json:"currentLTCGBracket"`
	EstimatedEffectiveRate float64 `json:"estimatedEffectiveRate"`
}

// ComprehensiveLiabilityState captures all debt/liability state
type ComprehensiveLiabilityState struct {
	LiabilityID         string  `json:"liabilityId"`
	Name                string  `json:"name"`
	Type                string  `json:"type"` // "MORTGAGE", "AUTO_LOAN", etc.
	OriginalPrincipal   float64 `json:"originalPrincipal"`
	CurrentPrincipal    float64 `json:"currentPrincipal"`
	InterestRate        float64 `json:"interestRate"`
	MonthlyPayment      float64 `json:"monthlyPayment"`
	TermRemainingMonths int     `json:"termRemainingMonths"`
	OriginalTermMonths  int     `json:"originalTermMonths"`

	// YTD tracking for this liability
	InterestPaidYTD  float64 `json:"interestPaidYTD"`
	PrincipalPaidYTD float64 `json:"principalPaidYTD"`
	TotalPaidYTD     float64 `json:"totalPaidYTD"`

	// This month
	InterestPaidThisMonth  float64 `json:"interestPaidThisMonth"`
	PrincipalPaidThisMonth float64 `json:"principalPaidThisMonth"`

	// Projections
	TotalInterestRemaining float64 `json:"totalInterestRemaining"` // Sum of remaining interest over life of loan
	PayoffDate             string  `json:"payoffDate"`             // Estimated payoff date YYYY-MM

	// Flags
	IsTaxDeductible bool `json:"isTaxDeductible"`
	IsActive        bool `json:"isActive"`
}

// StrategyExecution represents a single strategy action taken during simulation
type StrategyExecution struct {
	StrategyType    string  `json:"strategyType"` // "WITHDRAWAL", "REBALANCE", "ROTH_CONVERSION", etc.
	Description     string  `json:"description"`
	Amount          float64 `json:"amount"`
	SourceAccount   string  `json:"sourceAccount,omitempty"`
	TargetAccount   string  `json:"targetAccount,omitempty"`
	TaxImpact       float64 `json:"taxImpact,omitempty"`
	ExecutionReason string  `json:"executionReason,omitempty"`
}

// MonthlyFlowsDetail captures all cash flows for the month (serializable version)
type MonthlyFlowsDetail struct {
	// Income
	TotalIncome          float64 `json:"totalIncome"`
	EmploymentIncome     float64 `json:"employmentIncome"`
	SalaryIncome         float64 `json:"salaryIncome"`
	BonusIncome          float64 `json:"bonusIncome"`
	RSUIncome            float64 `json:"rsuIncome"`
	SocialSecurityIncome float64 `json:"socialSecurityIncome"`
	PensionIncome        float64 `json:"pensionIncome"`
	DividendIncome       float64 `json:"dividendIncome"`
	InterestIncome       float64 `json:"interestIncome"`

	// Expenses
	TotalExpenses          float64 `json:"totalExpenses"`
	HousingExpenses        float64 `json:"housingExpenses"`
	TransportationExpenses float64 `json:"transportationExpenses"`
	FoodExpenses           float64 `json:"foodExpenses"`
	OtherExpenses          float64 `json:"otherExpenses"`

	// Debt payments
	DebtPaymentsPrincipal float64 `json:"debtPaymentsPrincipal"`
	DebtPaymentsInterest  float64 `json:"debtPaymentsInterest"`

	// Contributions
	TotalContributions       float64 `json:"totalContributions"`
	ContributionsTaxable     float64 `json:"contributionsTaxable"`
	ContributionsTaxDeferred float64 `json:"contributionsTaxDeferred"`
	ContributionsRoth        float64 `json:"contributionsRoth"`
	ContributionsHSA         float64 `json:"contributionsHSA"`

	// Withdrawals
	TotalWithdrawals   float64 `json:"totalWithdrawals"`
	DivestmentProceeds float64 `json:"divestmentProceeds"`
	RMDAmount          float64 `json:"rmdAmount"`
	AutoShortfallCover float64 `json:"autoShortfallCover"` // Proceeds from forced asset sales to cover cash shortfall

	// Taxes
	TaxWithheld float64 `json:"taxWithheld"`
	TaxesPaid   float64 `json:"taxesPaid"`

	// Other
	RothConversionAmount float64 `json:"rothConversionAmount"`
	InvestmentGrowth     float64 `json:"investmentGrowth"`
}

// DeterministicMonthState is the comprehensive monthly state for enhanced spreadsheet view
type DeterministicMonthState struct {
	// Time identifiers
	MonthOffset   int     `json:"monthOffset"`
	CalendarYear  int     `json:"calendarYear"`
	CalendarMonth int     `json:"calendarMonth"` // 1-12
	Age           float64 `json:"age"`

	// Accounts with full lot detail
	Cash        float64                    `json:"cash"`
	Taxable     *ComprehensiveAccountState `json:"taxable"`
	TaxDeferred *ComprehensiveAccountState `json:"taxDeferred"`
	Roth        *ComprehensiveAccountState `json:"roth"`
	HSA         *ComprehensiveAccountState `json:"hsa,omitempty"`
	FiveTwoNine *ComprehensiveAccountState `json:"fiveTwoNine,omitempty"`

	// Aggregates (derived)
	NetWorth         float64 `json:"netWorth"`
	TotalAssets      float64 `json:"totalAssets"`
	TotalLiabilities float64 `json:"totalLiabilities"`

	// State snapshots
	TaxState           ComprehensiveTaxState         `json:"taxState"`
	Liabilities        []ComprehensiveLiabilityState `json:"liabilities"`
	StrategyExecutions []StrategyExecution           `json:"strategyExecutions"`

	// Monthly flows
	Flows MonthlyFlowsDetail `json:"flows"`

	// Market state
	MarketReturns StochasticReturns `json:"marketReturns"`

	// Events processed this month
	EventIDs []string `json:"eventIds,omitempty"`
}
