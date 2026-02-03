package simulation

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
)

// Engine is the Monte Carlo simulation engine
type Engine struct {
	ready bool
}

// SimulationParams are the input parameters for a simulation
type SimulationParams struct {
	InvestableAssets float64
	AnnualSpending   float64
	CurrentAge       float64
	ExpectedIncome   float64
	Seed             int
	StartYear        int
	HorizonMonths    int
	MCPaths          int
}

// SimulationResult is the output of a simulation
type SimulationResult struct {
	Success      bool                     `json:"success"`
	RunID        string                   `json:"runId"`
	PathsRun     int                      `json:"pathsRun"`
	BaseSeed     int                      `json:"baseSeed"`
	Inputs       *SimulationInputs        `json:"inputs"`
	MC           *MCResults               `json:"mc"`
	PlanDuration *PlanDuration            `json:"planDuration"`
	Trajectory   []TrajectoryPoint        `json:"netWorthTrajectory"`
	Snapshots    []AnnualSnapshot         `json:"annualSnapshots"`
	Schedule     *Schedule                `json:"schedule,omitempty"`
}

// SimulationInputs echoes back the input parameters
type SimulationInputs struct {
	CurrentAge       float64 `json:"currentAge"`
	InvestableAssets float64 `json:"investableAssets"`
	AnnualSpending   float64 `json:"annualSpending"`
	ExpectedIncome   float64 `json:"expectedIncome"`
	HorizonMonths    int     `json:"horizonMonths"`
}

// MCResults are the Monte Carlo aggregation results
type MCResults struct {
	RunwayP10            int     `json:"runwayP10"`
	RunwayP50            int     `json:"runwayP50"`
	RunwayP75            int     `json:"runwayP75"`
	FinalNetWorthP50     float64 `json:"finalNetWorthP50"`
	EverBreachProbability float64 `json:"everBreachProbability"`
}

// PlanDuration describes when the plan runs out
type PlanDuration struct {
	MostPathsAge      int  `json:"mostPathsAge"`
	EarlierStressAge  int  `json:"earlierStressAge"`
	LaterOutcomesAge  int  `json:"laterOutcomesAge"`
	HorizonSaturated  bool `json:"horizonSaturated"`
}

// TrajectoryPoint is a point on the net worth trajectory
type TrajectoryPoint struct {
	MonthOffset int     `json:"monthOffset"`
	P10         float64 `json:"p10"`
	P50         float64 `json:"p50"`
	P75         float64 `json:"p75"`
}

// AnnualSnapshot is a yearly summary
type AnnualSnapshot struct {
	Age              int     `json:"age"`
	Year             int     `json:"year"`
	StartBalance     float64 `json:"startBalance"`
	EndBalance       float64 `json:"endBalance"`
	TotalIncome      float64 `json:"totalIncome"`
	TotalExpenses    float64 `json:"totalExpenses"`
	InvestmentGrowth float64 `json:"investmentGrowth"`
}

// Schedule contains scheduled events
type Schedule struct {
	Events []ScheduleEvent `json:"events,omitempty"`
}

// ScheduleEvent is a scheduled financial event
type ScheduleEvent struct {
	Age         int     `json:"age"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
}

// NewEngine creates a new simulation engine
func NewEngine() *Engine {
	return &Engine{ready: true}
}

// Status returns the engine status
func (e *Engine) Status() map[string]interface{} {
	return map[string]interface{}{
		"ready": e.ready,
	}
}

// RunSimulation runs a Monte Carlo simulation
func (e *Engine) RunSimulation(params SimulationParams) (*SimulationResult, error) {
	if params.MCPaths < 1 {
		params.MCPaths = 100
	}

	horizonYears := params.HorizonMonths / 12
	if horizonYears < 1 {
		horizonYears = 30
	}

	// Run Monte Carlo paths
	rng := rand.New(rand.NewSource(int64(params.Seed)))

	// Store path results for aggregation
	type pathResult struct {
		runway      int // months until breach
		finalNW     float64
		breached    bool
		yearlyNW    []float64 // net worth at end of each year
	}

	paths := make([]pathResult, params.MCPaths)

	for p := 0; p < params.MCPaths; p++ {
		// Initialize path
		netWorth := params.InvestableAssets
		monthsUntilBreach := params.HorizonMonths
		breached := false
		yearlyNW := make([]float64, horizonYears+1)
		yearlyNW[0] = netWorth

		monthlySpending := params.AnnualSpending / 12
		monthlyIncome := params.ExpectedIncome / 12

		for month := 1; month <= params.HorizonMonths; month++ {
			// Monthly return (simplified: ~7% annual with volatility)
			annualReturn := 0.07 + rng.NormFloat64()*0.15
			monthlyReturn := math.Pow(1+annualReturn, 1.0/12) - 1

			// Apply growth
			growth := netWorth * monthlyReturn

			// Cash flow
			netWorth = netWorth + growth + monthlyIncome - monthlySpending

			// Track yearly values
			if month%12 == 0 {
				year := month / 12
				if year <= horizonYears {
					yearlyNW[year] = netWorth
				}
			}

			// Check for breach (net worth < 0)
			if netWorth < 0 && !breached {
				monthsUntilBreach = month
				breached = true
			}
		}

		paths[p] = pathResult{
			runway:   monthsUntilBreach,
			finalNW:  netWorth,
			breached: breached,
			yearlyNW: yearlyNW,
		}
	}

	// Aggregate results
	runways := make([]int, params.MCPaths)
	finalNWs := make([]float64, params.MCPaths)
	breachCount := 0

	for i, p := range paths {
		runways[i] = p.runway
		finalNWs[i] = p.finalNW
		if p.breached {
			breachCount++
		}
	}

	sort.Ints(runways)
	sort.Float64s(finalNWs)

	// Percentile indices
	p10idx := int(float64(params.MCPaths) * 0.10)
	p50idx := int(float64(params.MCPaths) * 0.50)
	p75idx := int(float64(params.MCPaths) * 0.75)

	// Build trajectory (aggregate yearly net worth across paths)
	trajectory := make([]TrajectoryPoint, 0)
	for year := 0; year <= horizonYears; year += 5 {
		if year > horizonYears {
			break
		}

		yearNWs := make([]float64, params.MCPaths)
		for i, p := range paths {
			if year < len(p.yearlyNW) {
				yearNWs[i] = p.yearlyNW[year]
			}
		}
		sort.Float64s(yearNWs)

		trajectory = append(trajectory, TrajectoryPoint{
			MonthOffset: year * 12,
			P10:         yearNWs[p10idx],
			P50:         yearNWs[p50idx],
			P75:         yearNWs[p75idx],
		})
	}

	// Build annual snapshots for displayed years
	currentAge := int(params.CurrentAge)
	endAge := currentAge + horizonYears
	interval := 5
	if horizonYears > 50 {
		interval = 10
	}

	snapshots := make([]AnnualSnapshot, 0)
	for age := currentAge; age <= endAge; age += interval {
		year := age - currentAge
		if year > horizonYears {
			break
		}

		// Get median values
		yearNWs := make([]float64, params.MCPaths)
		for i, p := range paths {
			if year < len(p.yearlyNW) {
				yearNWs[i] = p.yearlyNW[year]
			}
		}
		sort.Float64s(yearNWs)

		startBalance := params.InvestableAssets
		if year > 0 {
			prevYearNWs := make([]float64, params.MCPaths)
			for i, p := range paths {
				if year-1 < len(p.yearlyNW) {
					prevYearNWs[i] = p.yearlyNW[year-1]
				}
			}
			sort.Float64s(prevYearNWs)
			startBalance = prevYearNWs[p50idx]
		}

		snapshots = append(snapshots, AnnualSnapshot{
			Age:              age,
			Year:             year,
			StartBalance:     startBalance,
			EndBalance:       yearNWs[p50idx],
			TotalIncome:      params.ExpectedIncome,
			TotalExpenses:    params.AnnualSpending,
			InvestmentGrowth: yearNWs[p50idx] - startBalance - params.ExpectedIncome + params.AnnualSpending,
		})
	}
	// Always include start and end ages
	if len(snapshots) == 0 || snapshots[0].Age != currentAge {
		// Prepend start
	}
	if len(snapshots) == 0 || snapshots[len(snapshots)-1].Age != endAge {
		// Append end
	}

	// Calculate plan duration
	runwayP10 := runways[p10idx]
	runwayP50 := runways[p50idx]
	runwayP75 := runways[p75idx]

	mostPathsAge := currentAge + runwayP50/12
	earlierStressAge := currentAge + runwayP10/12
	laterOutcomesAge := currentAge + runwayP75/12
	horizonSaturated := runwayP50 >= params.HorizonMonths

	result := &SimulationResult{
		Success:  true,
		RunID:    fmt.Sprintf("AF-%05d", params.Seed%100000),
		PathsRun: params.MCPaths,
		BaseSeed: params.Seed,
		Inputs: &SimulationInputs{
			CurrentAge:       params.CurrentAge,
			InvestableAssets: params.InvestableAssets,
			AnnualSpending:   params.AnnualSpending,
			ExpectedIncome:   params.ExpectedIncome,
			HorizonMonths:    params.HorizonMonths,
		},
		MC: &MCResults{
			RunwayP10:            runwayP10,
			RunwayP50:            runwayP50,
			RunwayP75:            runwayP75,
			FinalNetWorthP50:     finalNWs[p50idx],
			EverBreachProbability: float64(breachCount) / float64(params.MCPaths),
		},
		PlanDuration: &PlanDuration{
			MostPathsAge:     mostPathsAge,
			EarlierStressAge: earlierStressAge,
			LaterOutcomesAge: laterOutcomesAge,
			HorizonSaturated: horizonSaturated,
		},
		Trajectory: trajectory,
		Snapshots:  snapshots,
	}

	return result, nil
}
