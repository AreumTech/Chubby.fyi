// Unified Financial Types for Go WASM
// Generated from financial-types.schema.json
//
// CRITICAL: All amounts are stored as annual values
// Convert to monthly only for calculations

//go:build ignore
// +build ignore

package engine

import (
	"fmt"
	"math"
)

// ==================== CONSTANTS ====================

// Note: Validation constants already defined in monthly_types.go - avoiding duplicate declarations

// ==================== ENUMS ====================

type AccountType string

const (
	AccountTypeCash        AccountType = "cash"
	AccountTypeTaxable     AccountType = "taxable"
	AccountTypeTaxDeferred AccountType = "tax_deferred"
	AccountTypeRoth        AccountType = "roth"
)

type EventType string

const (
	EventTypeIncome                EventType = "INCOME"
	EventTypeRecurringExpense      EventType = "RECURRING_EXPENSE"
	EventTypeOneTimeEvent          EventType = "ONE_TIME_EVENT"
	EventTypeScheduledContribution EventType = "SCHEDULED_CONTRIBUTION"
	EventTypeGoalDefine            EventType = "GOAL_DEFINE"
	EventTypeRealEstatePurchase    EventType = "REAL_ESTATE_PURCHASE"
	EventTypeHealthcare            EventType = "HEALTHCARE"
)

type TaxTreatment string

const (
	TaxTreatmentPreTax  TaxTreatment = "pre_tax"
	TaxTreatmentPostTax TaxTreatment = "post_tax"
	TaxTreatmentTaxFree TaxTreatment = "tax_free"
)

type AssetClass string

const (
	AssetClassUSStocks            AssetClass = "us_stocks"
	AssetClassUSBonds             AssetClass = "us_bonds"
	AssetClassInternationalStocks AssetClass = "international_stocks"
	AssetClassRealEstate          AssetClass = "real_estate"
	AssetClassCash                AssetClass = "cash"
	AssetClassOther               AssetClass = "other"
)

type SimulationErrorType string

const (
	SimulationErrorValidation  SimulationErrorType = "validation_error"
	SimulationErrorComputation SimulationErrorType = "computation_error"
	SimulationErrorUnrealistic SimulationErrorType = "unrealistic_values"
	SimulationErrorTimeout     SimulationErrorType = "timeout"
)

// ==================== CORE TYPES ====================

type Holding struct {
	AssetClass          AssetClass `json:"assetClass"`
	Quantity            float64    `json:"quantity"`            // >= 0
	CostBasisPerUnit    float64    `json:"costBasisPerUnit"`    // >= 0
	CurrentPricePerUnit float64    `json:"currentPricePerUnit"` // >= 0
}

type AccountHoldings struct {
	Holdings    []Holding `json:"holdings"`
	CashBalance float64   `json:"cashBalance"` // >= 0
}

type AssetMap struct {
	TotalCash float64 `json:"totalCash"` // >= 0 (legacy - sum of checking + savings)
	Accounts  struct {
		Checking    *AccountHoldings `json:"checking,omitempty"` // Low-yield cash account
		Savings     *AccountHoldings `json:"savings,omitempty"`  // Higher-yield cash account
		Taxable     *AccountHoldings `json:"taxable,omitempty"`
		TaxDeferred *AccountHoldings `json:"tax_deferred,omitempty"`
		Roth        *AccountHoldings `json:"roth,omitempty"`
	} `json:"accounts"`
}

// CRITICAL: All events store annual amounts
// No frequency field to avoid confusion
type AnnualEvent struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Type          EventType              `json:"type"`
	AmountPerYear float64                `json:"amountPerYear"` // ALWAYS annual amount
	StartYear     int                    `json:"startYear"`     // 1900-3000
	EndYear       int                    `json:"endYear"`       // 1900-3000
	TaxTreatment  TaxTreatment           `json:"taxTreatment,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type FinancialPlan struct {
	ID            string        `json:"id"`
	StartYear     int           `json:"startYear"`  // 1900-3000
	CurrentAge    float64       `json:"currentAge"` // 0-150
	InitialAssets AssetMap      `json:"initialAssets"`
	Events        []AnnualEvent `json:"events"`
}

type MonthSnapshot struct {
	MonthOffset     int      `json:"monthOffset"`   // >= 0
	CalendarYear    int      `json:"calendarYear"`  // 1900-3000
	CalendarMonth   int      `json:"calendarMonth"` // 0-11 (0=January)
	NetWorth        float64  `json:"netWorth"`      // <= 1T (circuit breaker)
	Assets          AssetMap `json:"assets"`
	MonthlyIncome   float64  `json:"monthlyIncome,omitempty"`
	MonthlyExpenses float64  `json:"monthlyExpenses,omitempty"`
	TaxesPaid       float64  `json:"taxesPaid,omitempty"`
}

type SimulationPath struct {
	PathID         string          `json:"pathId"`
	Months         []MonthSnapshot `json:"months"`
	FinalNetWorth  float64         `json:"finalNetWorth"` // <= 1T (circuit breaker)
	SuccessMetrics *struct {
		AchievedGoals       []string `json:"achievedGoals,omitempty"`
		MaxDrawdown         float64  `json:"maxDrawdown,omitempty"`
		YearsUntilDepletion float64  `json:"yearsUntilDepletion,omitempty"`
	} `json:"successMetrics,omitempty"`
}

type SimulationConfig struct {
	NumPaths     int `json:"numPaths"` // 1-10000
	MaxYears     int `json:"maxYears"` // 1-100
	MarketConfig *struct {
		StockReturn     float64 `json:"stockReturn,omitempty"`
		BondReturn      float64 `json:"bondReturn,omitempty"`
		InflationRate   float64 `json:"inflationRate,omitempty"`
		StockVolatility float64 `json:"stockVolatility,omitempty"`
	} `json:"marketConfig,omitempty"`
}

type SimulationStatistics struct {
	MedianFinalWealth float64 `json:"medianFinalWealth"`
	Percentiles       struct {
		P10 float64 `json:"p10"`
		P25 float64 `json:"p25"`
		P50 float64 `json:"p50"`
		P75 float64 `json:"p75"`
		P90 float64 `json:"p90"`
	} `json:"percentiles"`
	SuccessRate float64 `json:"successRate"` // 0-1
}

type SimulationOutput struct {
	Paths      []SimulationPath     `json:"paths"`
	Statistics SimulationStatistics `json:"statistics"`
}

type SimulationError struct {
	Type    SimulationErrorType `json:"type"`
	Message string              `json:"message"`
	Field   string              `json:"field,omitempty"`
	Value   float64             `json:"value,omitempty"`
}

// ==================== VALIDATION FUNCTIONS ====================

func (h Holding) Validate() error {
	if h.Quantity < 0 {
		return fmt.Errorf("holding quantity cannot be negative: %v", h.Quantity)
	}
	if h.CostBasisPerUnit < 0 {
		return fmt.Errorf("cost basis per unit cannot be negative: %v", h.CostBasisPerUnit)
	}
	if h.CurrentPricePerUnit < 0 {
		return fmt.Errorf("current price per unit cannot be negative: %v", h.CurrentPricePerUnit)
	}
	return nil
}

func (ah AccountHoldings) Validate() error {
	if ah.CashBalance < 0 {
		return fmt.Errorf("cash balance cannot be negative: %v", ah.CashBalance)
	}
	for i, holding := range ah.Holdings {
		if err := holding.Validate(); err != nil {
			return fmt.Errorf("holding %d invalid: %w", i, err)
		}
	}
	return nil
}

func (ae AnnualEvent) Validate() error {
	if ae.ID == "" {
		return fmt.Errorf("event ID cannot be empty")
	}
	if ae.Name == "" {
		return fmt.Errorf("event name cannot be empty")
	}
	if !IsRealisticAnnualAmount(ae.AmountPerYear) {
		return fmt.Errorf("unrealistic annual amount: %v", ae.AmountPerYear)
	}
	if ae.StartYear < 1900 || ae.StartYear > 3000 {
		return fmt.Errorf("invalid start year: %d", ae.StartYear)
	}
	if ae.EndYear < ae.StartYear || ae.EndYear > 3000 {
		return fmt.Errorf("invalid end year: %d", ae.EndYear)
	}
	return nil
}

func (fp FinancialPlan) Validate() error {
	if fp.ID == "" {
		return fmt.Errorf("financial plan ID cannot be empty")
	}
	if fp.StartYear < 1900 || fp.StartYear > 3000 {
		return fmt.Errorf("invalid start year: %d", fp.StartYear)
	}
	if fp.CurrentAge < 0 || fp.CurrentAge > 150 {
		return fmt.Errorf("invalid current age: %v", fp.CurrentAge)
	}
	for i, event := range fp.Events {
		if err := event.Validate(); err != nil {
			return fmt.Errorf("event %d invalid: %w", i, err)
		}
	}
	return nil
}

func (ms MonthSnapshot) Validate() error {
	if ms.MonthOffset < 0 {
		return fmt.Errorf("month offset cannot be negative: %d", ms.MonthOffset)
	}
	if ms.CalendarYear < 1900 || ms.CalendarYear > 3000 {
		return fmt.Errorf("invalid calendar year: %d", ms.CalendarYear)
	}
	if ms.CalendarMonth < 0 || ms.CalendarMonth > 11 {
		return fmt.Errorf("invalid calendar month: %d", ms.CalendarMonth)
	}
	if !IsRealisticNetWorth(ms.NetWorth) {
		return fmt.Errorf("unrealistic net worth: %v", ms.NetWorth)
	}
	return nil
}

func (sp SimulationPath) Validate() error {
	if sp.PathID == "" {
		return fmt.Errorf("simulation path ID cannot be empty")
	}
	if !IsRealisticNetWorth(sp.FinalNetWorth) {
		return fmt.Errorf("unrealistic final net worth: %v", sp.FinalNetWorth)
	}
	for i, month := range sp.Months {
		if err := month.Validate(); err != nil {
			return fmt.Errorf("month %d invalid: %w", i, err)
		}
	}
	return nil
}

// ==================== UTILITY FUNCTIONS ====================

func IsRealisticNetWorth(value float64) bool {
	return value >= MinRealisticNetWorth && value <= MaxRealisticNetWorth
}

func IsRealisticAnnualAmount(value float64) bool {
	return math.Abs(value) <= 100_000_000 // $100M/year - inline constant to avoid duplicates
}

func ConvertAnnualToMonthly(annualAmount float64) float64 {
	return annualAmount / 12.0
}

func ConvertAnnualToMonthlyGrowthRate(annualRate float64) float64 {
	// Pure mathematical conversion without artificial clamping
	return math.Pow(1+annualRate, 1.0/12.0) - 1
}

// Error interface implementation
func (se SimulationError) Error() string {
	if se.Field != "" {
		return fmt.Sprintf("%s in field %s: %s", se.Type, se.Field, se.Message)
	}
	return fmt.Sprintf("%s: %s", se.Type, se.Message)
}
