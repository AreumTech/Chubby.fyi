// Monthly Financial Types for Go WASM
// SEMANTIC DESIGN: All amounts are MONTHLY values
// No frequency confusion - everything is standardized to monthly

package engine

import (
	"fmt"
)

// ==================== MONTHLY EVENT TYPES ====================

// MonthlySimulationEvent - all amounts are monthly, no frequency field
type MonthlySimulationEvent struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Type              string  `json:"type"`
	MonthlyAmount     float64 `json:"amount"` // CRITICAL: Always monthly amount
	MonthOffset       int     `json:"monthOffset"`
	EndMonthOffset    *int    `json:"endMonthOffset,omitempty"`
	TargetAccountType string  `json:"targetAccountType,omitempty"`
}

// MonthlyAccountState - account holdings at a specific month
type MonthlyAccountState struct {
	Cash        float64  `json:"cash"`
	Taxable     *Account `json:"taxable,omitempty"`
	TaxDeferred *Account `json:"tax_deferred,omitempty"`
	Roth        *Account `json:"roth,omitempty"`
}

// MonthlyDataDetailed - simulation output for a single month (detailed version)
type MonthlyDataDetailed struct {
	MonthOffset   int                 `json:"monthOffset"`
	CalendarYear  int                 `json:"calendarYear"`
	CalendarMonth int                 `json:"calendarMonth"`
	NetWorth      float64             `json:"netWorth"`
	Accounts      MonthlyAccountState `json:"accounts"`

	// Monthly flows (all monthly amounts)
	IncomeThisMonth        float64 `json:"incomeThisMonth,omitempty"`
	ExpensesThisMonth      float64 `json:"expensesThisMonth,omitempty"`
	ContributionsThisMonth float64 `json:"contributionsToInvestmentsThisMonth,omitempty"`
	TaxWithheldThisMonth   float64 `json:"taxWithheldThisMonth,omitempty"`

	// Market returns for this month
	Returns *struct {
		SPY       float64 `json:"spy,omitempty"`
		BND       float64 `json:"bnd,omitempty"`
		Inflation float64 `json:"inflation,omitempty"`
	} `json:"returns,omitempty"`
}

// MonthlySimulationInput - input to WASM simulation (all monthly)
type MonthlySimulationInput struct {
	InitialAccounts MonthlyAccountState      `json:"initialAccounts"`
	Events          []MonthlySimulationEvent `json:"events"`
	MonthsToRun     int                      `json:"monthsToRun"`
	Config          *struct {
		InflationRate   float64 `json:"inflationRate,omitempty"`
		StockReturn     float64 `json:"stockReturn,omitempty"`
		BondReturn      float64 `json:"bondReturn,omitempty"`
		StockVolatility float64 `json:"stockVolatility,omitempty"`
	} `json:"config,omitempty"`
}

// MonthlySimulationResult - output from WASM simulation
type MonthlySimulationResult struct {
	Success     bool                    `json:"success"`
	MonthlyData []MonthlyDataSimulation `json:"monthlyData,omitempty"`
	Error       string                  `json:"error,omitempty"`
}

// ==================== VALIDATION FUNCTIONS ====================

const (
	MaxRealisticMonthlyAmount = 10_000_000        // $10M/month
	MinRealisticMonthlyAmount = -1_000_000        // -$1M/month
	MaxRealisticNetWorth      = 1_000_000_000_000 // $1T
	MinRealisticNetWorth      = -10_000_000       // -$10M
)

func (e MonthlySimulationEvent) Validate() error {
	if e.ID == "" {
		return fmt.Errorf("event ID cannot be empty")
	}
	if e.Name == "" {
		return fmt.Errorf("event name cannot be empty")
	}
	if !IsRealisticMonthlyAmount(e.MonthlyAmount) {
		return fmt.Errorf("unrealistic monthly amount: %v", e.MonthlyAmount)
	}
	if e.MonthOffset < 0 {
		return fmt.Errorf("month offset cannot be negative: %d", e.MonthOffset)
	}
	if e.EndMonthOffset != nil && *e.EndMonthOffset < e.MonthOffset {
		return fmt.Errorf("end month offset cannot be before start: %d < %d", *e.EndMonthOffset, e.MonthOffset)
	}
	return nil
}

func (d MonthlyDataSimulation) Validate() error {
	if d.MonthOffset < 0 {
		return fmt.Errorf("month offset cannot be negative: %d", d.MonthOffset)
	}
	if !IsRealisticNetWorth(d.NetWorth) {
		return fmt.Errorf("unrealistic net worth: %v", d.NetWorth)
	}

	// Validate monthly flow amounts
	if !IsRealisticMonthlyAmount(d.IncomeThisMonth) {
		return fmt.Errorf("unrealistic monthly income: %v", d.IncomeThisMonth)
	}
	if !IsRealisticMonthlyAmount(d.ExpensesThisMonth) {
		return fmt.Errorf("unrealistic monthly expenses: %v", d.ExpensesThisMonth)
	}
	if !IsRealisticMonthlyAmount(d.ContributionsToInvestmentsThisMonth) {
		return fmt.Errorf("unrealistic monthly contributions: %v", d.ContributionsToInvestmentsThisMonth)
	}

	return nil
}

func IsRealisticMonthlyAmount(value float64) bool {
	return value >= MinRealisticMonthlyAmount && value <= MaxRealisticMonthlyAmount
}

func IsRealisticNetWorth(netWorth float64) bool {
	return netWorth >= MinRealisticNetWorth && netWorth <= MaxRealisticNetWorth
}

// ==================== SIMULATION PROCESSING FUNCTIONS ====================

func ProcessMonthlyEvent(event MonthlySimulationEvent, accounts *MonthlyAccountState, monthOffset int) error {
	// Validate event before processing
	if err := event.Validate(); err != nil {
		return fmt.Errorf("invalid event: %w", err)
	}

	// Validate monthly amount is realistic
	if !IsRealisticMonthlyAmount(event.MonthlyAmount) {
		return fmt.Errorf("🚨 CIRCUIT BREAKER: Unrealistic monthly amount in event %s: %v", event.Name, event.MonthlyAmount)
	}

	// Process based on event type
	switch event.Type {
	case "INCOME":
		return processMonthlyIncome(event, accounts)
	case "RECURRING_EXPENSE":
		return processMonthlyExpense(event, accounts)
	case "SCHEDULED_CONTRIBUTION":
		return processMonthlyContribution(event, accounts)
	case "CONTRIBUTION":
		// Generic contribution type mapped from frontend SCHEDULED_CONTRIBUTION
		return processMonthlyContribution(event, accounts)
	case "ONE_TIME_EVENT":
		return processOneTimeEvent(event, accounts)
	default:
		return fmt.Errorf("unknown event type: %s", event.Type)
	}
}

func processMonthlyIncome(event MonthlySimulationEvent, accounts *MonthlyAccountState) error {
	// Apply monthly income (after taxes)
	netIncome := event.MonthlyAmount * 0.75 // Assume 25% tax withholding
	accounts.Cash += netIncome

	// Validate result
	if !IsRealisticNetWorth(accounts.Cash) {
		return fmt.Errorf("🚨 Income processing resulted in unrealistic cash: %v", accounts.Cash)
	}

	return nil
}

func processMonthlyExpense(event MonthlySimulationEvent, accounts *MonthlyAccountState) error {
	// Apply monthly expense (negative amount)
	accounts.Cash += event.MonthlyAmount // MonthlyAmount should be negative for expenses

	// Validate result
	if accounts.Cash < -1_000_000 { // Allow some negative cash for overdraft
		return fmt.Errorf("🚨 Expense processing resulted in excessive negative cash: %v", accounts.Cash)
	}

	return nil
}

func processMonthlyContribution(event MonthlySimulationEvent, accounts *MonthlyAccountState) error {
	// Debug: Log large contribution amounts using JS console
	if event.MonthlyAmount > 10000 {
		simLogVerbose("🚨 [WASM-DEBUG] Large contribution: %s = $%.2f to %s",
			event.Name, event.MonthlyAmount, event.TargetAccountType)
	}

	// Route contribution to appropriate account
	switch event.TargetAccountType {
	case "401k", "tax_deferred":
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}

		// Debug: Log 401k contributions using JS console
		if event.MonthlyAmount > 1000 {
			simLogVerbose("🏦 [WASM-DEBUG] 401k contribution: $%.2f (before: $%.2f)",
				event.MonthlyAmount, accounts.TaxDeferred.TotalValue)
		}

		accounts.TaxDeferred.TotalValue += event.MonthlyAmount
		accounts.Cash -= event.MonthlyAmount
	case "roth", "rothIra":
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		accounts.Roth.TotalValue += event.MonthlyAmount
		accounts.Cash -= event.MonthlyAmount
	case "taxable":
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		accounts.Taxable.TotalValue += event.MonthlyAmount
		accounts.Cash -= event.MonthlyAmount
	default:
		// Default to cash savings
		accounts.Cash += event.MonthlyAmount
	}

	return nil
}

func processOneTimeEvent(event MonthlySimulationEvent, accounts *MonthlyAccountState) error {
	// Apply one-time amount to cash
	accounts.Cash += event.MonthlyAmount

	// Validate result
	if !IsRealisticNetWorth(accounts.Cash) {
		return fmt.Errorf("🚨 One-time event resulted in unrealistic cash: %v", accounts.Cash)
	}

	return nil
}

func CalculateNetWorth(accounts MonthlyAccountState) float64 {
	netWorth := accounts.Cash

	if accounts.Taxable != nil {
		netWorth += calculateAccountValue(*accounts.Taxable)
	}
	if accounts.TaxDeferred != nil {
		netWorth += calculateAccountValue(*accounts.TaxDeferred)
	}
	if accounts.Roth != nil {
		netWorth += calculateAccountValue(*accounts.Roth)
	}

	return netWorth
}

func calculateAccountValue(account Account) float64 {
	// Account already has TotalValue calculated, so use that
	return account.TotalValue
}
