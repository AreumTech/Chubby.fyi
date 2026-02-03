package simulation

// AccountType represents different account types for tax purposes
type AccountType string

const (
	AccountTypeCash        AccountType = "cash"
	AccountTypeTaxable     AccountType = "taxable"
	AccountTypeTaxDeferred AccountType = "tax_deferred" // 401k, Traditional IRA
	AccountTypeRoth        AccountType = "roth"         // Roth IRA, Roth 401k
	AccountType529         AccountType = "529"
)

// TaxProfile determines how income/withdrawals are taxed
type TaxProfile string

const (
	TaxProfileOrdinary      TaxProfile = "ordinary"      // W-2, 1099, 401k withdrawals
	TaxProfileCapitalGains  TaxProfile = "capital_gains" // Long-term gains (> 1 year)
	TaxProfileShortTermGain TaxProfile = "short_term"    // Short-term gains (< 1 year)
	TaxProfileTaxFree       TaxProfile = "tax_free"      // Roth, municipal bonds
	TaxProfileSocialSec     TaxProfile = "social_sec"    // Up to 85% taxable
)

// FinancialEvent represents a scheduled financial event
type FinancialEvent struct {
	ID                string            `json:"id"`
	Type              string            `json:"type"`
	Description       string            `json:"description,omitempty"`
	Amount            float64           `json:"amount"`
	MonthOffset       int               `json:"monthOffset"`
	Frequency         string            `json:"frequency,omitempty"` // once, monthly, annually
	EndMonthOffset    int               `json:"endMonthOffset,omitempty"`
	TargetAccountType AccountType       `json:"targetAccountType,omitempty"`
	SourceAccountType AccountType       `json:"sourceAccountType,omitempty"`
	TaxProfile        TaxProfile        `json:"taxProfile,omitempty"`
	GrowthRate        float64           `json:"growthRate,omitempty"` // Annual growth rate
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
}

// Accounts represents the portfolio state with different account types
type Accounts struct {
	Cash        float64 `json:"cash"`
	Taxable     float64 `json:"taxable"`
	TaxDeferred float64 `json:"taxDeferred"` // 401k, Traditional IRA
	Roth        float64 `json:"roth"`        // Roth accounts
	FiveTwoNine float64 `json:"529"`         // Education savings
}

// TotalValue returns the total portfolio value across all accounts
func (a *Accounts) TotalValue() float64 {
	return a.Cash + a.Taxable + a.TaxDeferred + a.Roth + a.FiveTwoNine
}

// Clone creates a copy of the accounts state
func (a *Accounts) Clone() *Accounts {
	return &Accounts{
		Cash:        a.Cash,
		Taxable:     a.Taxable,
		TaxDeferred: a.TaxDeferred,
		Roth:        a.Roth,
		FiveTwoNine: a.FiveTwoNine,
	}
}

// TaxState tracks income for tax calculations
type TaxState struct {
	OrdinaryIncome   float64 `json:"ordinaryIncome"`
	LongTermGains    float64 `json:"longTermGains"`
	ShortTermGains   float64 `json:"shortTermGains"`
	SocialSecIncome  float64 `json:"socialSecIncome"`
	TaxFreeIncome    float64 `json:"taxFreeIncome"`
	TaxWithheld      float64 `json:"taxWithheld"`
}

// Reset clears tax state for new year
func (ts *TaxState) Reset() {
	ts.OrdinaryIncome = 0
	ts.LongTermGains = 0
	ts.ShortTermGains = 0
	ts.SocialSecIncome = 0
	ts.TaxFreeIncome = 0
	ts.TaxWithheld = 0
}

// TaxBracket represents a federal tax bracket
type TaxBracket struct {
	Min  float64
	Max  float64
	Rate float64
}

// 2024 Federal Tax Brackets (Single filer, simplified)
var FederalBrackets2024 = []TaxBracket{
	{0, 11600, 0.10},
	{11600, 47150, 0.12},
	{47150, 100525, 0.22},
	{100525, 191950, 0.24},
	{191950, 243725, 0.32},
	{243725, 609350, 0.35},
	{609350, 1e12, 0.37},
}

// Long-term capital gains brackets (2024, single)
var CapGainsBrackets2024 = []TaxBracket{
	{0, 47025, 0.00},
	{47025, 518900, 0.15},
	{518900, 1e12, 0.20},
}

// CalculateFederalTax computes federal income tax using 2024 brackets
func CalculateFederalTax(taxableIncome float64) float64 {
	if taxableIncome <= 0 {
		return 0
	}

	tax := 0.0
	remaining := taxableIncome

	for _, bracket := range FederalBrackets2024 {
		if remaining <= 0 {
			break
		}
		bracketSize := bracket.Max - bracket.Min
		taxableInBracket := min(remaining, bracketSize)
		tax += taxableInBracket * bracket.Rate
		remaining -= taxableInBracket
	}

	return tax
}

// CalculateCapitalGainsTax computes long-term capital gains tax
func CalculateCapitalGainsTax(gains float64, ordinaryIncome float64) float64 {
	if gains <= 0 {
		return 0
	}

	// Capital gains stack on top of ordinary income for bracket determination
	totalIncome := ordinaryIncome + gains
	tax := 0.0
	gainsRemaining := gains

	for _, bracket := range CapGainsBrackets2024 {
		if gainsRemaining <= 0 {
			break
		}

		// Calculate how much of gains falls in this bracket
		bracketStart := bracket.Min
		bracketEnd := bracket.Max

		// Skip brackets below our starting point
		if totalIncome < bracketStart {
			continue
		}

		// Calculate gains in this bracket
		startInBracket := max(bracketStart, totalIncome-gains)
		endInBracket := min(bracketEnd, totalIncome)
		gainsInBracket := max(0, endInBracket-startInBracket)

		if gainsInBracket > gainsRemaining {
			gainsInBracket = gainsRemaining
		}

		tax += gainsInBracket * bracket.Rate
		gainsRemaining -= gainsInBracket
	}

	return tax
}

// CalculateStateTax estimates state income tax (simplified CA rate)
func CalculateStateTax(taxableIncome float64, stateRate float64) float64 {
	if stateRate <= 0 {
		stateRate = 0.093 // Default CA top marginal
	}
	// Simplified: use flat rate (real implementation uses brackets)
	return taxableIncome * stateRate * 0.7 // Approximate effective rate
}

// SimulationTier represents different levels of simulation fidelity
type SimulationTier string

const (
	TierBronze SimulationTier = "bronze" // Basic: simple taxes, 3 account types
	TierSilver SimulationTier = "silver" // Enhanced: full tax brackets, 5 accounts, events
	TierGold   SimulationTier = "gold"   // Full: complete simulation with all features
)

// Enhanced simulation parameters with account support
type EnhancedSimulationParams struct {
	// Basic params
	Seed          int            `json:"seed"`
	StartYear     int            `json:"startYear"`
	HorizonMonths int            `json:"horizonMonths"`
	MCPaths       int            `json:"mcPaths"`
	Tier          SimulationTier `json:"tier"`

	// Person info
	CurrentAge int     `json:"currentAge"`
	StateRate  float64 `json:"stateRate"` // State income tax rate

	// Initial accounts
	InitialAccounts Accounts `json:"initialAccounts"`

	// Cash flows (annual amounts)
	AnnualIncome   float64 `json:"annualIncome"`
	AnnualSpending float64 `json:"annualSpending"`

	// Contributions (annual)
	Contribution401k float64 `json:"contribution401k"`
	ContributionRoth float64 `json:"contributionRoth"`

	// Events (optional)
	Events []FinancialEvent `json:"events,omitempty"`
}

// EnhancedSimulationResult extends the basic result with account breakdown
type EnhancedSimulationResult struct {
	*SimulationResult

	// Account breakdown at end of simulation
	FinalAccounts *Accounts `json:"finalAccounts,omitempty"`

	// Tax summary for final year
	TotalTaxesPaid float64 `json:"totalTaxesPaid,omitempty"`
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
