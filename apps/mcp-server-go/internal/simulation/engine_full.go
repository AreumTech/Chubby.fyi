package simulation

import (
	"fmt"

	"github.com/areumfire/mcp-server-go/internal/engine"
)

// FullEngine wraps the complete simulation engine from wasm/
type FullEngine struct {
	ready bool
}

// NewFullEngine creates a new full simulation engine
func NewFullEngine() *FullEngine {
	return &FullEngine{ready: true}
}

// Status returns the engine status
func (e *FullEngine) Status() map[string]interface{} {
	return map[string]interface{}{
		"ready": e.ready,
		"tier":  "full",
	}
}

// FullSimulationParams contains all parameters for the full simulation
type FullSimulationParams struct {
	// Core params
	Seed          int `json:"seed"`
	StartYear     int `json:"startYear"`
	HorizonMonths int `json:"horizonMonths"`
	MCPaths       int `json:"mcPaths"`

	// Person info
	CurrentAge int     `json:"currentAge"`
	StateCode  string  `json:"stateCode"` // e.g., "CA", "TX"
	StateRate  float64 `json:"stateRate"` // Override state rate

	// Initial accounts
	CashBalance        float64 `json:"cashBalance"`
	TaxableBalance     float64 `json:"taxableBalance"`
	TaxDeferredBalance float64 `json:"taxDeferredBalance"` // 401k, Traditional IRA
	RothBalance        float64 `json:"rothBalance"`
	FiveTwoNineBalance float64 `json:"fiveTwoNineBalance"` // 529

	// Cash flows
	AnnualIncome   float64 `json:"annualIncome"`
	AnnualSpending float64 `json:"annualSpending"`

	// Contributions
	Contribution401k float64 `json:"contribution401k"`
	ContributionRoth float64 `json:"contributionRoth"`
	ContributionHSA  float64 `json:"contributionHSA"`

	// Social Security
	SocialSecurityAge    int     `json:"socialSecurityAge"`
	SocialSecurityBenefit float64 `json:"socialSecurityBenefit"` // Monthly

	// Events (optional)
	Events []engine.FinancialEvent `json:"events,omitempty"`

	// Config
	LiteMode bool `json:"liteMode"` // Use optimized bronze mode
}

// FullSimulationResult contains the complete simulation results
type FullSimulationResult struct {
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
	RunID    string `json:"runId"`
	PathsRun int    `json:"pathsRun"`
	BaseSeed int    `json:"baseSeed"`

	// MC Results
	MC *MCResults `json:"mc"`

	// Plan Duration
	PlanDuration *PlanDuration `json:"planDuration"`

	// Trajectory
	Trajectory []TrajectoryPoint `json:"netWorthTrajectory"`

	// Snapshots
	Snapshots []AnnualSnapshot `json:"annualSnapshots"`

	// Account breakdown at end
	FinalAccounts map[string]float64 `json:"finalAccounts,omitempty"`

	// Tax summary
	TotalTaxesPaid    float64 `json:"totalTaxesPaid,omitempty"`
	EffectiveTaxRate  float64 `json:"effectiveTaxRate,omitempty"`
}

// RunFullSimulation runs the complete simulation engine with UI payload transformer
// This ensures full parity with the WASM engine including trajectory data
func (e *FullEngine) RunFullSimulation(params FullSimulationParams) (*FullSimulationResult, error) {
	if params.MCPaths < 1 {
		params.MCPaths = 100
	}
	if params.HorizonMonths < 12 {
		params.HorizonMonths = 360
	}

	// Build simulation input for the engine
	input := engine.SimulationInput{
		MonthsToRun: params.HorizonMonths,
		StartYear:   params.StartYear,
		InitialAge:  params.CurrentAge,
		InitialAccounts: engine.AccountHoldingsMonthEnd{
			Cash: params.CashBalance,
			Taxable: &engine.Account{
				TotalValue: params.TaxableBalance,
				Holdings:   []engine.Holding{},
			},
			TaxDeferred: &engine.Account{
				TotalValue: params.TaxDeferredBalance,
				Holdings:   []engine.Holding{},
			},
			Roth: &engine.Account{
				TotalValue: params.RothBalance,
				Holdings:   []engine.Holding{},
			},
		},
		Config: engine.StochasticModelConfig{
			RandomSeed:        int64(params.Seed),
			SimulationMode:    "stochastic",
			CashFloor:         10000,
			VolatilitySPY:     0.18,
			MeanSPYReturn:     0.07,
			MeanBondReturn:    0.03,
			MeanInflation:     0.025,
			LiteMode:          params.LiteMode,
			PayTaxesEndOfYear: true,
		},
		Events: buildEvents(params),
	}

	// Run simulation with UI payload transformer (includes trajectory)
	payload := engine.RunSimulationWithUIPayload(input, params.MCPaths)

	// Check for errors in plan health
	if len(payload.PlanProjection.Summary.PlanHealth.KeyRisks) > 0 &&
		payload.PlanProjection.Summary.PlanHealth.KeyRisks[0] != "" &&
		len(payload.PlanProjection.Summary.PlanHealth.KeyRisks[0]) > 20 &&
		payload.PlanProjection.Summary.PlanHealth.KeyRisks[0][:20] == "Simulation failed: " {
		return &FullSimulationResult{
			Success: false,
			Error:   payload.PlanProjection.Summary.PlanHealth.KeyRisks[0],
		}, fmt.Errorf("%s", payload.PlanProjection.Summary.PlanHealth.KeyRisks[0])
	}

	// Convert payload to our result format
	return convertPayloadToResult(payload, params), nil
}

// buildEvents creates financial events from params
func buildEvents(params FullSimulationParams) []engine.FinancialEvent {
	events := make([]engine.FinancialEvent, 0)

	// Add income event
	if params.AnnualIncome > 0 {
		events = append(events, engine.FinancialEvent{
			ID:          "income-salary",
			Type:        "INCOME",
			Description: "Annual salary income",
			Amount:      params.AnnualIncome / 12, // Monthly
			MonthOffset: 0,
			Frequency:   "monthly",
		})
	}

	// Add spending event
	if params.AnnualSpending > 0 {
		events = append(events, engine.FinancialEvent{
			ID:          "expense-living",
			Type:        "EXPENSE",
			Description: "Living expenses",
			Amount:      params.AnnualSpending / 12, // Monthly
			MonthOffset: 0,
			Frequency:   "monthly",
		})
	}

	// Add 401k contribution
	if params.Contribution401k > 0 {
		targetType := "tax_deferred"
		events = append(events, engine.FinancialEvent{
			ID:                fmt.Sprintf("contribution-401k-%d", params.Seed),
			Type:              "SCHEDULED_CONTRIBUTION",
			Description:       "401k contribution",
			Amount:            params.Contribution401k / 12,
			MonthOffset:       0,
			Frequency:         "monthly",
			TargetAccountType: &targetType,
		})
	}

	// Add Roth contribution
	if params.ContributionRoth > 0 {
		targetType := "roth"
		events = append(events, engine.FinancialEvent{
			ID:                fmt.Sprintf("contribution-roth-%d", params.Seed),
			Type:              "SCHEDULED_CONTRIBUTION",
			Description:       "Roth IRA contribution",
			Amount:            params.ContributionRoth / 12,
			MonthOffset:       0,
			Frequency:         "monthly",
			TargetAccountType: &targetType,
		})
	}

	// Add Social Security
	if params.SocialSecurityBenefit > 0 && params.SocialSecurityAge > 0 {
		ssStartMonth := (params.SocialSecurityAge - params.CurrentAge) * 12
		if ssStartMonth >= 0 && ssStartMonth < params.HorizonMonths {
			events = append(events, engine.FinancialEvent{
				ID:          "social-security",
				Type:        "SOCIAL_SECURITY_INCOME",
				Description: "Social Security benefits",
				Amount:      params.SocialSecurityBenefit,
				MonthOffset: ssStartMonth,
				Frequency:   "monthly",
			})
		}
	}

	// Append any custom events
	events = append(events, params.Events...)

	return events
}

// convertResult converts engine result to our format
func convertResult(result engine.SimulationResults, params FullSimulationParams) *FullSimulationResult {
	horizonYears := params.HorizonMonths / 12

	// Runway values - use P5/P50/P95 if available, otherwise use horizon as max
	runwayP10 := result.RunwayP5
	if runwayP10 <= 0 {
		runwayP10 = params.HorizonMonths // No breach
	}
	runwayP50 := result.RunwayP50
	if runwayP50 <= 0 {
		runwayP50 = params.HorizonMonths
	}
	runwayP75 := result.RunwayP95
	if runwayP75 <= 0 {
		runwayP75 = params.HorizonMonths
	}

	// Extract MC metrics
	mc := &MCResults{
		RunwayP10:             runwayP10,
		RunwayP50:             runwayP50,
		RunwayP75:             runwayP75,
		FinalNetWorthP50:      result.FinalNetWorthP50,
		EverBreachProbability: result.EverBreachProbability,
	}

	// Build trajectory from result
	trajectory := make([]TrajectoryPoint, 0)
	if result.NetWorthTrajectory != nil {
		for _, pt := range result.NetWorthTrajectory {
			trajectory = append(trajectory, TrajectoryPoint{
				MonthOffset: pt.MonthOffset,
				P10:         pt.P10,
				P50:         pt.P50,
				P75:         pt.P75,
			})
		}
	}

	// Build snapshots from trajectory
	snapshots := make([]AnnualSnapshot, 0)
	interval := 5
	if horizonYears > 50 {
		interval = 10
	}
	for year := 0; year <= horizonYears; year += interval {
		// Find matching trajectory point
		var endBalance float64
		monthOffset := year * 12
		for _, pt := range trajectory {
			if pt.MonthOffset == monthOffset {
				endBalance = pt.P50
				break
			}
		}

		snapshots = append(snapshots, AnnualSnapshot{
			Age:           params.CurrentAge + year,
			Year:          year,
			EndBalance:    endBalance,
			TotalIncome:   params.AnnualIncome,
			TotalExpenses: params.AnnualSpending,
		})
	}

	return &FullSimulationResult{
		Success:  true,
		RunID:    fmt.Sprintf("AF-F-%05d", params.Seed%100000),
		PathsRun: result.NumberOfRuns,
		BaseSeed: params.Seed,
		MC:       mc,
		PlanDuration: &PlanDuration{
			MostPathsAge:     params.CurrentAge + runwayP50/12,
			EarlierStressAge: params.CurrentAge + runwayP10/12,
			LaterOutcomesAge: params.CurrentAge + runwayP75/12,
			HorizonSaturated: runwayP50 >= params.HorizonMonths,
		},
		Trajectory: trajectory,
		Snapshots:  snapshots,
	}
}

// convertPayloadToResult converts SimulationPayload to FullSimulationResult
// This extracts the fields we need from the UI payload transformer output
func convertPayloadToResult(payload engine.SimulationPayload, params FullSimulationParams) *FullSimulationResult {
	charts := payload.PlanProjection.Charts
	summary := payload.PlanProjection.Summary

	// Build trajectory from NetWorthChart.TimeSeries
	trajectory := make([]TrajectoryPoint, 0)
	for i, pt := range charts.NetWorth.TimeSeries {
		trajectory = append(trajectory, TrajectoryPoint{
			MonthOffset: i * 12, // TimeSeries is yearly
			P10:         pt.P10,
			P50:         pt.P50,
			P75:         pt.P75,
		})
	}

	// Build annual snapshots
	snapshots := make([]AnnualSnapshot, 0)
	interval := 5
	horizonYears := params.HorizonMonths / 12
	if horizonYears > 50 {
		interval = 10
	}

	for year := 0; year <= horizonYears; year += interval {
		var startBal, endBal float64
		if year < len(charts.NetWorth.TimeSeries) {
			endBal = charts.NetWorth.TimeSeries[year].P50
		}
		if year > 0 && year-1 < len(charts.NetWorth.TimeSeries) {
			startBal = charts.NetWorth.TimeSeries[year-1].P50
		} else if year == 0 {
			startBal = params.CashBalance + params.TaxableBalance + params.TaxDeferredBalance + params.RothBalance
			endBal = startBal // Year 0 is starting point
		}

		snapshots = append(snapshots, AnnualSnapshot{
			Age:              params.CurrentAge + year,
			Year:             year,
			StartBalance:     startBal,
			EndBalance:       endBal,
			TotalIncome:      params.AnnualIncome,
			TotalExpenses:    params.AnnualSpending,
			InvestmentGrowth: endBal - startBal - params.AnnualIncome + params.AnnualSpending,
		})
	}

	// Extract runway from portfolio stats
	stats := summary.PortfolioStats
	runwayP10 := params.HorizonMonths
	runwayP50 := params.HorizonMonths
	runwayP75 := params.HorizonMonths

	// Use runway values if paths breached
	if stats.RunwayP5 > 0 {
		runwayP10 = stats.RunwayP5
	}
	if stats.RunwayP50 > 0 {
		runwayP50 = stats.RunwayP50
	}
	if stats.RunwayP95 > 0 {
		runwayP75 = stats.RunwayP95
	}

	// Calculate breach probability from success rate
	breachProb := 1.0 - stats.SuccessRate

	// Get final net worth from chart summary
	finalNW := 0.0
	if len(charts.NetWorth.TimeSeries) > 0 {
		finalNW = charts.NetWorth.TimeSeries[len(charts.NetWorth.TimeSeries)-1].P50
	}

	return &FullSimulationResult{
		Success:  true,
		RunID:    fmt.Sprintf("AF-F-%05d", params.Seed%100000),
		PathsRun: params.MCPaths,
		BaseSeed: params.Seed,
		MC: &MCResults{
			RunwayP10:             runwayP10,
			RunwayP50:             runwayP50,
			RunwayP75:             runwayP75,
			FinalNetWorthP50:      finalNW,
			EverBreachProbability: breachProb,
		},
		PlanDuration: &PlanDuration{
			MostPathsAge:     params.CurrentAge + runwayP50/12,
			EarlierStressAge: params.CurrentAge + runwayP10/12,
			LaterOutcomesAge: params.CurrentAge + runwayP75/12,
			HorizonSaturated: runwayP50 >= params.HorizonMonths,
		},
		Trajectory: trajectory,
		Snapshots:  snapshots,
	}
}
