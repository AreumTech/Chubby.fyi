package simulation

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
)

// BronzeEngine is an enhanced simulation engine with basic tax and account support
// Target: <10ms for 100 paths (compared to ~320ms for full engine)
type BronzeEngine struct {
	ready bool
}

// NewBronzeEngine creates a new bronze tier simulation engine
func NewBronzeEngine() *BronzeEngine {
	return &BronzeEngine{ready: true}
}

// Status returns the engine status
func (e *BronzeEngine) Status() map[string]interface{} {
	return map[string]interface{}{
		"ready": e.ready,
		"tier":  "bronze",
	}
}

// pathState holds the state for a single simulation path
type pathState struct {
	accounts     Accounts
	taxState     TaxState
	age          int
	currentYear  int
	netWorth     float64
	yearlyNW     []float64
	breached     bool
	breachMonth  int
	totalTaxPaid float64
}

// RunEnhancedSimulation runs a bronze tier Monte Carlo simulation
func (e *BronzeEngine) RunEnhancedSimulation(params EnhancedSimulationParams) (*EnhancedSimulationResult, error) {
	if params.MCPaths < 1 {
		params.MCPaths = 100
	}
	if params.HorizonMonths < 12 {
		params.HorizonMonths = 360 // Default 30 years
	}

	horizonYears := params.HorizonMonths / 12
	rng := rand.New(rand.NewSource(int64(params.Seed)))

	// Pre-allocate path results
	paths := make([]pathState, params.MCPaths)

	// Monthly amounts
	monthlyIncome := params.AnnualIncome / 12
	monthlySpending := params.AnnualSpending / 12
	monthly401k := params.Contribution401k / 12
	monthlyRoth := params.ContributionRoth / 12

	// Run Monte Carlo paths
	for p := 0; p < params.MCPaths; p++ {
		state := &paths[p]
		state.accounts = *params.InitialAccounts.Clone()
		state.age = params.CurrentAge
		state.currentYear = params.StartYear
		state.yearlyNW = make([]float64, horizonYears+1)
		state.yearlyNW[0] = state.accounts.TotalValue()
		state.breachMonth = params.HorizonMonths

		for month := 1; month <= params.HorizonMonths; month++ {
			// Generate monthly returns (simplified market model)
			// ~7% annual return with 15% annual volatility
			// Monthly: mean = annual/12, stddev = annual/sqrt(12)
			monthlyMean := 0.07 / 12                      // ~0.58% monthly
			monthlyVol := 0.15 / math.Sqrt(12)            // ~4.33% monthly
			monthlyReturn := monthlyMean + rng.NormFloat64()*monthlyVol

			// Process income (deposited to cash)
			if monthlyIncome > 0 {
				netIncome := e.applyWithholding(monthlyIncome, &state.taxState, params.StateRate)
				state.accounts.Cash += netIncome
				state.taxState.OrdinaryIncome += monthlyIncome
			}

			// Process 401k contribution (pre-tax)
			if monthly401k > 0 && state.accounts.Cash >= monthly401k {
				state.accounts.Cash -= monthly401k
				state.accounts.TaxDeferred += monthly401k
			}

			// Process Roth contribution (post-tax)
			if monthlyRoth > 0 && state.accounts.Cash >= monthlyRoth {
				state.accounts.Cash -= monthlyRoth
				state.accounts.Roth += monthlyRoth
			}

			// Apply market growth to investment accounts
			state.accounts.Taxable *= (1 + monthlyReturn)
			state.accounts.TaxDeferred *= (1 + monthlyReturn)
			state.accounts.Roth *= (1 + monthlyReturn)

			// Process spending - withdrawal cascade: Cash → Taxable → TaxDeferred → Roth
			remaining := monthlySpending

			// 1. Withdraw from Cash first
			if remaining > 0 && state.accounts.Cash > 0 {
				withdraw := min(remaining, state.accounts.Cash)
				state.accounts.Cash -= withdraw
				remaining -= withdraw
			}

			// 2. Sell from Taxable (incurs capital gains)
			if remaining > 0 && state.accounts.Taxable > 0 {
				withdraw := min(remaining, state.accounts.Taxable)
				state.accounts.Taxable -= withdraw
				remaining -= withdraw
				// Track capital gains (simplified: assume 50% is gain)
				state.taxState.LongTermGains += withdraw * 0.5
			}

			// 3. Withdraw from TaxDeferred (incurs ordinary income tax)
			if remaining > 0 && state.accounts.TaxDeferred > 0 {
				withdraw := min(remaining, state.accounts.TaxDeferred)
				state.accounts.TaxDeferred -= withdraw
				remaining -= withdraw
				// TaxDeferred withdrawals are ordinary income
				state.taxState.OrdinaryIncome += withdraw
			}

			// 4. Withdraw from Roth (tax-free)
			if remaining > 0 && state.accounts.Roth > 0 {
				withdraw := min(remaining, state.accounts.Roth)
				state.accounts.Roth -= withdraw
				remaining -= withdraw
			}

			// 5. If still remaining, we've breached - can't cover spending
			if remaining > 0 && !state.breached {
				state.breached = true
				state.breachMonth = month
			}

			// Year-end tax calculation
			if month%12 == 0 {
				year := month / 12
				if year <= horizonYears {
					state.yearlyNW[year] = state.accounts.TotalValue()
				}

				// Calculate and pay annual taxes
				taxes := e.calculateAnnualTax(&state.taxState, params.StateRate)
				state.totalTaxPaid += taxes

				// Pay taxes from cash (or taxable if insufficient)
				taxDue := taxes - state.taxState.TaxWithheld
				if taxDue > 0 {
					if state.accounts.Cash >= taxDue {
						state.accounts.Cash -= taxDue
					} else {
						taxDue -= state.accounts.Cash
						state.accounts.Cash = 0
						if state.accounts.Taxable >= taxDue {
							state.accounts.Taxable -= taxDue
						}
					}
				} else {
					// Refund
					state.accounts.Cash -= taxDue // Adding negative = adding refund
				}

				// Reset tax state for new year
				state.taxState.Reset()
				state.age++
				state.currentYear++
			}

			// Check for breach
			state.netWorth = state.accounts.TotalValue()
			if state.netWorth < 0 && !state.breached {
				state.breached = true
				state.breachMonth = month
			}
		}
	}

	// Aggregate results
	runways := make([]int, params.MCPaths)
	finalNWs := make([]float64, params.MCPaths)
	breachCount := 0

	for i, p := range paths {
		runways[i] = p.breachMonth
		finalNWs[i] = p.accounts.TotalValue()
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

	// Build trajectory
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

	// Build snapshots
	currentAge := params.CurrentAge
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

		yearNWs := make([]float64, params.MCPaths)
		for i, p := range paths {
			if year < len(p.yearlyNW) {
				yearNWs[i] = p.yearlyNW[year]
			}
		}
		sort.Float64s(yearNWs)

		startBalance := params.InitialAccounts.TotalValue()
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
			TotalIncome:      params.AnnualIncome,
			TotalExpenses:    params.AnnualSpending,
			InvestmentGrowth: yearNWs[p50idx] - startBalance - params.AnnualIncome + params.AnnualSpending,
		})
	}

	// Calculate plan duration
	runwayP10 := runways[p10idx]
	runwayP50 := runways[p50idx]
	runwayP75 := runways[p75idx]

	// Get median final accounts
	medianPath := paths[p50idx]

	result := &EnhancedSimulationResult{
		SimulationResult: &SimulationResult{
			Success:  true,
			RunID:    fmt.Sprintf("AF-B-%05d", params.Seed%100000),
			PathsRun: params.MCPaths,
			BaseSeed: params.Seed,
			Inputs: &SimulationInputs{
				CurrentAge:       float64(params.CurrentAge),
				InvestableAssets: params.InitialAccounts.TotalValue(),
				AnnualSpending:   params.AnnualSpending,
				ExpectedIncome:   params.AnnualIncome,
				HorizonMonths:    params.HorizonMonths,
			},
			MC: &MCResults{
				RunwayP10:             runwayP10,
				RunwayP50:             runwayP50,
				RunwayP75:             runwayP75,
				FinalNetWorthP50:      finalNWs[p50idx],
				EverBreachProbability: float64(breachCount) / float64(params.MCPaths),
			},
			PlanDuration: &PlanDuration{
				MostPathsAge:     currentAge + runwayP50/12,
				EarlierStressAge: currentAge + runwayP10/12,
				LaterOutcomesAge: currentAge + runwayP75/12,
				HorizonSaturated: runwayP50 >= params.HorizonMonths,
			},
			Trajectory: trajectory,
			Snapshots:  snapshots,
		},
		FinalAccounts:  &medianPath.accounts,
		TotalTaxesPaid: medianPath.totalTaxPaid,
	}

	return result, nil
}

// applyWithholding calculates take-home pay after withholding
func (e *BronzeEngine) applyWithholding(grossIncome float64, taxState *TaxState, stateRate float64) float64 {
	// Estimate annual income for bracket calculation
	estimatedAnnual := grossIncome * 12

	// Calculate approximate marginal rates
	federalRate := e.estimateMarginalRate(estimatedAnnual, FederalBrackets2024)
	if stateRate <= 0 {
		stateRate = 0.065 // Default ~6.5% effective state rate
	}

	// FICA (Social Security + Medicare)
	ficaRate := 0.0765 // 6.2% SS + 1.45% Medicare

	totalWithholding := grossIncome * (federalRate + stateRate*0.7 + ficaRate)
	taxState.TaxWithheld += totalWithholding

	return grossIncome - totalWithholding
}

// estimateMarginalRate finds the marginal tax rate for given income
func (e *BronzeEngine) estimateMarginalRate(income float64, brackets []TaxBracket) float64 {
	for i := len(brackets) - 1; i >= 0; i-- {
		if income > brackets[i].Min {
			return brackets[i].Rate
		}
	}
	return brackets[0].Rate
}

// calculateAnnualTax computes total annual tax liability
func (e *BronzeEngine) calculateAnnualTax(taxState *TaxState, stateRate float64) float64 {
	// Standard deduction (2024 single)
	standardDeduction := 14600.0

	// Taxable ordinary income
	taxableOrdinary := max(0, taxState.OrdinaryIncome-standardDeduction)

	// Short-term gains taxed as ordinary income
	taxableOrdinary += taxState.ShortTermGains

	// Federal income tax
	federalTax := CalculateFederalTax(taxableOrdinary)

	// Capital gains tax (long-term)
	capGainsTax := CalculateCapitalGainsTax(taxState.LongTermGains, taxableOrdinary)

	// State tax (simplified)
	stateTax := CalculateStateTax(taxableOrdinary+taxState.LongTermGains, stateRate)

	return federalTax + capGainsTax + stateTax
}

// ConvertBasicToEnhanced converts basic SimulationParams to EnhancedSimulationParams
func ConvertBasicToEnhanced(basic SimulationParams) EnhancedSimulationParams {
	return EnhancedSimulationParams{
		Seed:          basic.Seed,
		StartYear:     basic.StartYear,
		HorizonMonths: basic.HorizonMonths,
		MCPaths:       basic.MCPaths,
		Tier:          TierBronze,
		CurrentAge:    int(basic.CurrentAge),
		InitialAccounts: Accounts{
			Cash:    basic.InvestableAssets * 0.1, // 10% in cash
			Taxable: basic.InvestableAssets * 0.9, // 90% in taxable
		},
		AnnualIncome:   basic.ExpectedIncome,
		AnnualSpending: basic.AnnualSpending,
	}
}
