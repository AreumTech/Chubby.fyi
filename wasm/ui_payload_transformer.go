// UI Payload Transformer - Converts raw simulation results to UI-ready SimulationPayload
package main

import (
	"fmt"
	"math"
	"sort"
	"strconv"
)

// RunSimulationWithUIPayload runs a Monte Carlo simulation and returns a complete UI-ready SimulationPayload
func RunSimulationWithUIPayload(input SimulationInput, numberOfRuns int) SimulationPayload {
    simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Starting simulation with %d runs", numberOfRuns)

    // Run the raw Monte Carlo simulation
    results := RunMonteCarloSimulation(input, numberOfRuns)
	if !results.Success {
		// Return empty payload with error information
		return SimulationPayload{
			PlanInputs: transformToPlanInputs(input),
			PlanProjection: PlanProjection{
				Summary: PlanSummary{
					GoalOutcomes:   []GoalOutcome{},
					PortfolioStats: PortfolioStats{},
					PlanHealth: PlanHealth{
						OverallScore:    0,
						RiskLevel:       "high",
						ConfidenceLevel: "low",
						KeyRisks:        []string{"Simulation failed: " + results.Error},
						KeyStrengths:    []string{},
					},
				},
				Charts:   ProjectionCharts{},
				Analysis: DetailedAnalysis{},
			},
		}
	}

	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Raw simulation completed successfully")

	// Transform raw results into UI-ready payload
	planInputs := transformToPlanInputs(input)
	planProjection := transformToPlanProjection(results, input, numberOfRuns)

	payload := SimulationPayload{
		PlanInputs:     planInputs,
		PlanProjection: planProjection,
	}

	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: UI payload transformation completed")
	return payload
}

// transformToPlanInputs converts SimulationInput to PlanInputs (normalized reference data)
func transformToPlanInputs(input SimulationInput) PlanInputs {
	// Convert goals
	goals := make([]EnhancedGoal, len(input.Goals))
	for i, goal := range input.Goals {
		goals[i] = EnhancedGoal{
			ID:                goal.ID,
			Name:              goal.Name,
			Description:       goal.Description,
			TargetAmount:      goal.TargetAmount,
			TargetYear:        calculateTargetYear(goal.TargetMonthOffset, input.StartYear),  // ✅ FIX: Pass startYear
			Priority:          goal.Priority,
			Category:          goal.Category,
			Icon:              "🎯", // Default icon
			IsActive:          true,
			Tags:              []string{},
			InflationAdjusted: true,
			// These will be populated later from simulation results
			ProbabilityOfSuccess:  0.0,
			MedianAchievementYear: nil,
			ProgressPercentage:    0.0,
			StatusTag:             "unknown",
			ShortDescription:      goal.Description,
		}
	}

	// Convert events to timeline events
	events := make([]TimelineEvent, len(input.Events))
	for i, event := range input.Events {
		events[i] = TimelineEvent{
			ID:          event.ID,
			Name:        event.Description,
			Icon:        getEventIcon(event.Type),
			StartYear:   calculateYearFromMonthOffset(event.MonthOffset, input.StartYear),  // ✅ FIX: Pass startYear
			Description: event.Description,
			Category:    mapEventTypeToCategory(event.Type),
			Amount:      &event.Amount,
			Frequency:   &event.Frequency,
		}
	}

	// Convert accounts (simplified for now)
	accounts := []AccountNew{
		{ID: "cash", Name: "Cash", Category: "liquid", Type: "cash", CurrentValue: &input.InitialAccounts.Cash},
		{ID: "taxable", Name: "Taxable Brokerage", Category: "investment", Type: "taxable", CurrentValue: getTotalAccountValue(input.InitialAccounts.Taxable)},
		{ID: "tax_deferred", Name: "401(k) / IRA", Category: "retirement", Type: "tax_deferred", CurrentValue: getTotalAccountValue(input.InitialAccounts.TaxDeferred)},
		{ID: "roth", Name: "Roth IRA", Category: "retirement", Type: "roth", CurrentValue: getTotalAccountValue(input.InitialAccounts.Roth)},
	}

	// Extract active strategies from strategy settings
	strategies := extractActiveStrategies(input.StrategySettings, input.CashStrategy)

	return PlanInputs{
		Goals:      goals,
		Events:     events,
		Strategies: strategies,
		Accounts:   accounts,
	}
}

// transformToPlanProjection converts raw simulation results to UI-ready projection data
func transformToPlanProjection(results SimulationResults, input SimulationInput, numberOfRuns int) PlanProjection {
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Starting plan projection transformation")

	// We need to run a few individual simulation paths to get detailed monthly data
	// for statistical analysis and chart generation
    var samplePaths []SimulationResult
    // Limit detailed sample paths to a small constant to reduce memory/GC pressure in WASM.
    // We still honor UI-selected run counts via Monte Carlo aggregates; detailed paths are only for charts.
    sampleSize := numberOfRuns
    if sampleSize > 30 { // Increased for meaningful percentile calculations in spreadsheet view
        sampleSize = 30
    }

    simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Running %d sample paths for detailed analysis", sampleSize)
    for i := 0; i < sampleSize; i++ {
        // Use RunIsolatedPath for proper seed diversity and state isolation
        // TrackMonthlyData=true because we need detailed monthly data for charts
        simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Running sample path %d/%d", i+1, sampleSize)
        result := RunIsolatedPath(input, i, IsolatedPathOptions{
            TrackMonthlyData: true, // Need monthly data for trajectory/charts
        })
        simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Sample path %d result: Success=%t, MonthlyData count=%d, Error=%s",
            i+1, result.Success, len(result.MonthlyData), result.Error)
        // Accept any run that produced monthly data, even if it flagged bankruptcy
        if len(result.MonthlyData) > 0 {
            samplePaths = append(samplePaths, result)
            simLogVerbose("✅ PAYLOAD-TRANSFORMER: Sample path %d accepted with %d months of data", i+1, len(result.MonthlyData))
        } else {
            simLogVerbose("❌ PAYLOAD-TRANSFORMER: Sample path %d rejected - no monthly data (Success=%t, Error=%s)", i+1, result.Success, result.Error)
        }
    }

    // If we still have no paths, make one more attempt to generate a single path
    if len(samplePaths) == 0 {
        simLogVerbose("❌ PAYLOAD-TRANSFORMER: No sample paths from initial attempts; retrying once")
        // Use RunIsolatedPath with pathIndex=sampleSize (next unused index)
        res := RunIsolatedPath(input, sampleSize, IsolatedPathOptions{
            TrackMonthlyData: true,
        })
        simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Retry result: Success=%t, MonthlyData count=%d, Error=%s",
            res.Success, len(res.MonthlyData), res.Error)
        if len(res.MonthlyData) > 0 {
            samplePaths = append(samplePaths, res)
            simLogVerbose("✅ PAYLOAD-TRANSFORMER: Retry succeeded with %d months of data", len(res.MonthlyData))
        } else {
            simLogVerbose("❌ PAYLOAD-TRANSFORMER: Retry failed - no monthly data (Success=%t, Error=%s)", res.Success, res.Error)
        }
    }

    if len(samplePaths) == 0 {
        simLogVerbose("❌ PAYLOAD-TRANSFORMER: FATAL - No monthly data available for charts; returning empty projection")
        simLogVerbose("❌ PAYLOAD-TRANSFORMER: This means all %d sample path attempts failed to produce monthly data", sampleSize+1)
        return createEmptyPlanProjection()
    }

	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generated %d successful sample paths", len(samplePaths))

	// Find the median path (P50) based on final net worth
	medianPath := findMedianPath(samplePaths)
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Identified median path with final net worth: $%.2f", medianPath.FinalNetWorth)

	// Generate all components - pass input for access to StartYear and InitialAge
	summary := generatePlanSummary(results, input, samplePaths)
	charts := generateProjectionCharts(samplePaths, medianPath, input)
	analysis := generateDetailedAnalysis(medianPath, input, samplePaths)
	spreadsheet := generateSpreadsheetData(samplePaths, input)

	return PlanProjection{
		Summary:     summary,
		Charts:      charts,
		Analysis:    analysis,
		Spreadsheet: spreadsheet,
	}
}

// generatePlanSummary creates the high-level success metrics and summary
func generatePlanSummary(results SimulationResults, input SimulationInput, samplePaths []SimulationResult) PlanSummary {
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating plan summary")

	// Find median path for current progress calculation
	medianPath := findMedianPath(samplePaths)

	// Generate goal outcomes
	goalOutcomes := make([]GoalOutcome, len(input.Goals))
	for i, goal := range input.Goals {
		probability := calculateGoalSuccessRate(goal, samplePaths)

		// Calculate percentiles from all Monte Carlo paths (amount distribution at target date)
		p10, p25, p50, p75, p90 := calculateGoalPercentiles(goal, samplePaths)

		// Calculate achievement timing (when goal is achieved across paths)
		// This is for "solve for time" mode where we want to know WHEN we'll hit the target
		achP10, achP25, achP50, achP75, achP90, achRate := calculateGoalAchievementTiming(goal, samplePaths)

		// Get current progress from the latest month in median path (DEPRECATED - keeping for backward compatibility)
		currentProgress := 0.0
		progressPercentage := 0.0
		if len(medianPath.MonthlyData) > 0 {
			latestMonth := medianPath.MonthlyData[len(medianPath.MonthlyData)-1]
			sourceAccount := goal.TargetAccountType
			if sourceAccount == "" {
				sourceAccount = "total"
			}
			currentProgress = getAccountBalanceForGoal(latestMonth, sourceAccount)
			if goal.TargetAmount > 0 {
				progressPercentage = (currentProgress / goal.TargetAmount) * 100.0
			}
		}

		// Determine user-friendly status based on progress and probability
		status := determineGoalStatus(progressPercentage, probability)

		goalOutcomes[i] = GoalOutcome{
			GoalID:             goal.ID,
			GoalName:           goal.Name,
			Probability:        probability,
			StatusTag:          getStatusTagFromProbability(probability),
			ShortDescription:   fmt.Sprintf("%.0f%% chance of achieving %s", probability*100, goal.Name),
			TargetAccount:      goal.TargetAccountType,
			TargetAmount:       goal.TargetAmount,
			CurrentProgress:    currentProgress,    // DEPRECATED
			ProgressPercentage: progressPercentage, // DEPRECATED
			Status:             status,
			// Amount distribution data (at target date)
			P10Amount:          p10,
			P25Amount:          p25,
			P50Amount:          p50,
			P75Amount:          p75,
			P90Amount:          p90,
			// Time distribution data (when target is achieved)
			AchievementMonthP10: achP10,
			AchievementMonthP25: achP25,
			AchievementMonthP50: achP50,
			AchievementMonthP75: achP75,
			AchievementMonthP90: achP90,
			AchievementRate:     achRate,
		}
	}

	// Aggregate net worth trajectory from sample paths (v1.5 phase-aware UI)
	netWorthTrajectory := aggregateNetWorthTrajectory(samplePaths, input)
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Aggregated net worth trajectory with %d data points", len(netWorthTrajectory))

	// Portfolio statistics (including MC enhancement fields)
	portfolioStats := PortfolioStats{
		P10FinalValue: results.FinalNetWorthP10,
		P25FinalValue: results.FinalNetWorthP25,
		P50FinalValue: results.FinalNetWorthP50,
		P75FinalValue: results.FinalNetWorthP75,
		P90FinalValue: results.FinalNetWorthP90,
		SuccessRate:   results.ProbabilityOfSuccess,

		// Extended percentiles (MC enhancement)
		P5FinalValue:  results.FinalNetWorthP5,
		P95FinalValue: results.FinalNetWorthP95,

		// Min cash KPIs
		MinCashP5:  results.MinCashP5,
		MinCashP50: results.MinCashP50,
		MinCashP95: results.MinCashP95,

		// Runway KPIs (conditional on breach)
		RunwayP5:          results.RunwayP5,
		RunwayP50:         results.RunwayP50,
		RunwayP95:         results.RunwayP95,
		BreachedPathCount: results.BreachedPathCount,

		// Breach probability time series
		BreachProbabilityByMonth: results.BreachProbabilityByMonth,

		// Ever-breach probability
		EverBreachProbability: results.EverBreachProbability,

		// Exemplar path reference
		ExemplarPath: results.ExemplarPath,

		// Net worth trajectory (v1.5 phase-aware UI)
		NetWorthTrajectory: netWorthTrajectory,

		// Audit fields
		BaseSeed:        results.BaseSeed,
		SuccessfulPaths: results.SuccessfulPaths,
		FailedPaths:     results.FailedPaths,
	}

	// Plan health assessment
	planHealth := assessPlanHealth(results, goalOutcomes)

	// Generate financial alerts using the new alert system
	var alerts []Alert
	alertGenerator, err := NewAlertGenerator()
	if err != nil {
		simLogVerbose("⚠️  PAYLOAD-TRANSFORMER: Failed to create alert generator: %v", err)
	} else {
		alerts = alertGenerator.GenerateAlerts(results, input)
		simLogVerbose("✅ PAYLOAD-TRANSFORMER: Generated %d alerts", len(alerts))
	}

	return PlanSummary{
		GoalOutcomes:            goalOutcomes,
		PortfolioStats:          portfolioStats,
		PlanHealth:              planHealth,
		Alerts:                  alerts,
		QuickActions:            generateQuickActions(results, goalOutcomes),
		ProbabilityOfBankruptcy: results.ProbabilityOfBankruptcy,
		BankruptcyCount:         results.BankruptcyCount,
		NumberOfRuns:            results.NumberOfRuns,
	}
}

// generateProjectionCharts creates chart-ready data for visualizations
func generateProjectionCharts(samplePaths []SimulationResult, medianPath SimulationResult, input SimulationInput) ProjectionCharts {
    simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating projection charts")

    netWorthChart := generateNetWorthChart(samplePaths, medianPath, input.StartYear)
    cashFlowChart := generateCashFlowChart(medianPath, input.StartYear)
    assetAllocationChart := generateAssetAllocationChart(medianPath, input.StartYear)
    goalProgressCharts := generateGoalProgressCharts(input.Goals, samplePaths, medianPath, input.StartYear)
    eventMarkers := generateEventMarkers(medianPath, input)

    simLogVerbose("📊 CHARTS: NW ts=%d, paths=%d | CF ts=%d",
        len(netWorthChart.TimeSeries), len(netWorthChart.SamplePaths), len(cashFlowChart.TimeSeries))

    return ProjectionCharts{
        NetWorth:        netWorthChart,
        CashFlow:        cashFlowChart,
        AssetAllocation: assetAllocationChart,
        GoalProgress:    goalProgressCharts,
		EventMarkers:    eventMarkers,
	}
}

// generateDetailedAnalysis creates comprehensive insights and goal-specific analysis
func generateDetailedAnalysis(medianPath SimulationResult, input SimulationInput, samplePaths []SimulationResult) DetailedAnalysis {
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating detailed analysis")

	goalBreakdowns := generateGoalBreakdowns(input.Goals, samplePaths, input.StartYear)
	annualSnapshots := generateAnnualSnapshots(medianPath, input)
	advancedPanels := generateAdvancedAnalysisPanels(medianPath, samplePaths)
	riskAnalysis := generateRiskAnalysis(samplePaths)

	return DetailedAnalysis{
		GoalBreakdowns:         goalBreakdowns,
		AnnualSnapshots:        annualSnapshots,
		AdvancedAnalysisPanels: advancedPanels,
		RiskAnalysis:           riskAnalysis,
	}
}

// generateEmptyPlanProjection creates a minimal but structurally valid projection

// generateAnnualSnapshots creates year-by-year detailed snapshots from the median path
func generateAnnualSnapshots(medianPath SimulationResult, input SimulationInput) map[string]AnnualDeepDiveSnapshot {
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating annual snapshots from median path")

	snapshots := make(map[string]AnnualDeepDiveSnapshot)

	// Group monthly data by year
	yearlyData := make(map[int][]MonthlyDataSimulation)
	startYear := input.StartYear

	for _, monthData := range medianPath.MonthlyData {
		year := startYear + (monthData.MonthOffset / 12)
		yearlyData[year] = append(yearlyData[year], monthData)
	}

	// Create annual snapshots
	for year, months := range yearlyData {
		if len(months) == 0 {
			continue
		}

		// Use December data (or last available month) as the year-end snapshot
		lastMonth := months[len(months)-1]

		// Calculate previous year's net worth for YoY comparison
		var previousNetWorth float64
		if prevYearData, exists := yearlyData[year-1]; exists && len(prevYearData) > 0 {
			previousNetWorth = prevYearData[len(prevYearData)-1].NetWorth
		}

		snapshot := AnnualDeepDiveSnapshot{
			Age:  calculateAge(lastMonth.MonthOffset, input.InitialAge),
			Year: year,

			NetWorth: math.Max(lastMonth.NetWorth, 0), // Floor at 0 for consistency with netWorthTrajectory chart
			NetWorthChangeYoY: NetWorthChangeYoY{
				Amount:  lastMonth.NetWorth - previousNetWorth,
				Percent: calculatePercentageChange(previousNetWorth, lastMonth.NetWorth),
			},

			BalanceSheet: generateBalanceSheet(lastMonth),
			CashFlow:     generateCashFlowAnalysis(months, lastMonth),

			DivestmentProceeds: lastMonth.DivestmentProceedsThisMonth * 12, // Approximate annual
			StrategyAnalysis:   generateStrategyAnalysis(lastMonth),
		}

		snapshots[strconv.Itoa(year)] = snapshot
	}

	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generated %d annual snapshots", len(snapshots))
	return snapshots
}

// Helper functions

func calculateTargetYear(monthOffset int, startYear int) int {
	return startYear + (monthOffset / 12)  // ✅ FIX: Use actual start year instead of hard-coded 2024
}

func calculateYearFromMonthOffset(monthOffset int, startYear int) int {
	return startYear + (monthOffset / 12)  // ✅ FIX: Use actual start year instead of hard-coded 2024
}

func getEventIcon(eventType string) string {
	switch eventType {
	case "INCOME":
		return "💰"
	case "EXPENSE":
		return "💳"
	case "CONTRIBUTION":
		return "📈"
	default:
		return "📅"
	}
}

func mapEventTypeToCategory(eventType string) string {
	switch eventType {
	case "INCOME":
		return "income"
	case "EXPENSE":
		return "expense"
	case "CONTRIBUTION":
		return "contribution"
	default:
		return "life_event"
	}
}

// extractActiveStrategies converts StrategySettings to UI-friendly Strategy objects
func extractActiveStrategies(strategySettings *StrategySettings, cashStrategy *CashManagementStrategy) []Strategy {
	strategies := []Strategy{}

	// Use default settings if none provided
	var settings StrategySettings
	if strategySettings != nil {
		settings = *strategySettings
	} else {
		settings = getDefaultStrategySettings()
	}

	// Asset Allocation Strategy
	if settings.AssetAllocation.StrategyType != "" {
		params := make(map[string]interface{})
		params["strategyType"] = settings.AssetAllocation.StrategyType
		params["allocations"] = settings.AssetAllocation.Allocations
		params["rebalanceThreshold"] = settings.AssetAllocation.RebalanceThreshold

		strategies = append(strategies, Strategy{
			ID:          "asset-allocation",
			Name:        "Asset Allocation",
			Description: fmt.Sprintf("%s allocation strategy", settings.AssetAllocation.StrategyType),
			Icon:        "📊",
			Category:    "investment",
			Status:      "active",
			Parameters:  params,
		})
	}

	// Rebalancing Strategy
	if settings.Rebalancing.Method != "" {
		params := make(map[string]interface{})
		params["method"] = settings.Rebalancing.Method
		params["frequency"] = settings.Rebalancing.Frequency
		params["threshold"] = settings.Rebalancing.ThresholdPercentage

		strategies = append(strategies, Strategy{
			ID:          "rebalancing",
			Name:        "Portfolio Rebalancing",
			Description: fmt.Sprintf("%s rebalancing %s", settings.Rebalancing.Method, settings.Rebalancing.Frequency),
			Icon:        "⚖️",
			Category:    "investment",
			Status:      "active",
			Parameters:  params,
		})
	}

	// Tax Loss Harvesting Strategy (if enabled)
	if settings.TaxLossHarvesting.Enabled {
		params := make(map[string]interface{})
		params["maxAnnualLoss"] = settings.TaxLossHarvesting.MaxAnnualLossHarvest
		params["minLossThreshold"] = settings.TaxLossHarvesting.MinimumLossThreshold
		params["washSalePeriod"] = settings.TaxLossHarvesting.WashSaleAvoidancePeriod

		strategies = append(strategies, Strategy{
			ID:          "tax-loss-harvesting",
			Name:        "Tax-Loss Harvesting",
			Description: "Automatic tax-loss harvesting to minimize tax liability",
			Icon:        "💰",
			Category:    "tax-optimization",
			Status:      "active",
			Parameters:  params,
		})
	}

	// Cash Management Strategy
	cashMgmt := settings.CashManagement
	// Fall back to legacy CashStrategy if new settings not available
	if cashStrategy != nil && cashMgmt.TargetReserveMonths == 0 {
		params := make(map[string]interface{})
		params["targetReserveMonths"] = cashStrategy.TargetReserveMonths
		params["autoInvestExcess"] = cashStrategy.AutoInvestExcess
		params["autoSellForShortfall"] = cashStrategy.AutoSellForShortfall

		strategies = append(strategies, Strategy{
			ID:          "cash-management",
			Name:        "Cash Management",
			Description: fmt.Sprintf("Maintain %.0f months emergency fund", cashStrategy.TargetReserveMonths),
			Icon:        "💵",
			Category:    "cash-flow",
			Status:      "active",
			Parameters:  params,
		})
	} else if cashMgmt.TargetReserveMonths > 0 {
		params := make(map[string]interface{})
		params["targetReserveMonths"] = cashMgmt.TargetReserveMonths
		params["autoInvestExcess"] = cashMgmt.AutoInvestExcess
		params["autoSellForShortfall"] = cashMgmt.AutoSellForShortfall

		strategies = append(strategies, Strategy{
			ID:          "cash-management",
			Name:        "Cash Management",
			Description: fmt.Sprintf("Maintain %.0f months emergency fund", cashMgmt.TargetReserveMonths),
			Icon:        "💵",
			Category:    "cash-flow",
			Status:      "active",
			Parameters:  params,
		})
	}

	return strategies
}

func getTotalAccountValue(account *Account) *float64 {
	if account == nil {
		zero := 0.0
		return &zero
	}
	return &account.TotalValue
}

func findMedianPath(paths []SimulationResult) SimulationResult {
	if len(paths) == 0 {
		return SimulationResult{}
	}

	// Sort paths by final net worth
	sort.Slice(paths, func(i, j int) bool {
		return paths[i].FinalNetWorth < paths[j].FinalNetWorth
	})

	// Return the median path
	medianIndex := len(paths) / 2
	return paths[medianIndex]
}

func calculateGoalSuccessRate(goal Goal, samplePaths []SimulationResult) float64 {
	successCount := 0
	totalPaths := len(samplePaths)

	if totalPaths == 0 {
		return 0.0
	}

	for _, path := range samplePaths {
		// ✅ FIX: Check specific account balance at specific time instead of final net worth
		goalAchieved := false

		// Check if we have data for the target month
		if goal.TargetMonthOffset < len(path.MonthlyData) {
			monthData := path.MonthlyData[goal.TargetMonthOffset]

			// Get balance from the specific target account
			var accountBalance float64
			switch goal.TargetAccountType {
			case "cash":
				accountBalance = monthData.Accounts.Cash
			case "taxable":
				if monthData.Accounts.Taxable != nil {
					accountBalance = monthData.Accounts.Taxable.TotalValue
				}
			case "tax_deferred":
				if monthData.Accounts.TaxDeferred != nil {
					accountBalance = monthData.Accounts.TaxDeferred.TotalValue
				}
			case "roth":
				if monthData.Accounts.Roth != nil {
					accountBalance = monthData.Accounts.Roth.TotalValue
				}
			default:
				// If no specific account type, use net worth as fallback
				accountBalance = monthData.NetWorth
			}

			if accountBalance >= goal.TargetAmount {
				goalAchieved = true
			}
		}

		if goalAchieved {
			successCount++
		}
	}

	return float64(successCount) / float64(totalPaths)
}

// calculateGoalPercentiles calculates the distribution of goal outcomes across Monte Carlo paths
// Returns P10, P25, P50, P75, P90 of final balances in the goal account at target month
func calculateGoalPercentiles(goal Goal, samplePaths []SimulationResult) (p10, p25, p50, p75, p90 float64) {
	totalPaths := len(samplePaths)

	if totalPaths == 0 {
		return 0.0, 0.0, 0.0, 0.0, 0.0
	}

	// Collect all final balances for this goal across all paths
	balances := make([]float64, 0, totalPaths)

	for _, path := range samplePaths {
		// Check if we have data for the target month
		if goal.TargetMonthOffset < len(path.MonthlyData) {
			monthData := path.MonthlyData[goal.TargetMonthOffset]

			// Get balance from the specific target account
			var accountBalance float64
			switch goal.TargetAccountType {
			case "cash":
				accountBalance = monthData.Accounts.Cash
			case "taxable":
				if monthData.Accounts.Taxable != nil {
					accountBalance = monthData.Accounts.Taxable.TotalValue
				}
			case "tax_deferred":
				if monthData.Accounts.TaxDeferred != nil {
					accountBalance = monthData.Accounts.TaxDeferred.TotalValue
				}
			case "roth":
				if monthData.Accounts.Roth != nil {
					accountBalance = monthData.Accounts.Roth.TotalValue
				}
			default:
				// If no specific account type, use net worth as fallback
				accountBalance = monthData.NetWorth
			}

			balances = append(balances, accountBalance)
		} else {
			// If target month is beyond simulation, use 0
			balances = append(balances, 0.0)
		}
	}

	// Sort balances to calculate percentiles
	sort.Float64s(balances)

	// Calculate percentile indices
	p10Index := int(float64(totalPaths) * 0.10)
	p25Index := int(float64(totalPaths) * 0.25)
	p50Index := int(float64(totalPaths) * 0.50)
	p75Index := int(float64(totalPaths) * 0.75)
	p90Index := int(float64(totalPaths) * 0.90)

	// Ensure indices are within bounds
	if p10Index >= totalPaths {
		p10Index = totalPaths - 1
	}
	if p25Index >= totalPaths {
		p25Index = totalPaths - 1
	}
	if p50Index >= totalPaths {
		p50Index = totalPaths - 1
	}
	if p75Index >= totalPaths {
		p75Index = totalPaths - 1
	}
	if p90Index >= totalPaths {
		p90Index = totalPaths - 1
	}

	return balances[p10Index], balances[p25Index], balances[p50Index], balances[p75Index], balances[p90Index]
}

// calculateGoalAchievementTiming calculates WHEN the goal is achieved across Monte Carlo paths
// Returns P10, P25, P50, P75, P90 of achievement months, plus achievement rate
// For "solve for time" goals where we have a target amount but want to know when we'll reach it
func calculateGoalAchievementTiming(goal Goal, samplePaths []SimulationResult) (p10, p25, p50, p75, p90 int, achievementRate float64) {
	totalPaths := len(samplePaths)

	if totalPaths == 0 {
		return 0, 0, 0, 0, 0, 0.0
	}

	// Collect achievement months (when goal is first achieved in each path)
	achievementMonths := make([]int, 0, totalPaths)
	achievedCount := 0

	for _, path := range samplePaths {
		goalAchieved := false
		achievementMonth := -1

		// Iterate through each month to find FIRST month where balance >= target
		for monthIdx, monthData := range path.MonthlyData {
			// Get balance from the specific target account
			var accountBalance float64
			switch goal.TargetAccountType {
			case "cash":
				accountBalance = monthData.Accounts.Cash
			case "taxable":
				if monthData.Accounts.Taxable != nil {
					accountBalance = monthData.Accounts.Taxable.TotalValue
				}
			case "tax_deferred":
				if monthData.Accounts.TaxDeferred != nil {
					accountBalance = monthData.Accounts.TaxDeferred.TotalValue
				}
			case "roth":
				if monthData.Accounts.Roth != nil {
					accountBalance = monthData.Accounts.Roth.TotalValue
				}
			case "529":
				if monthData.Accounts.FiveTwoNine != nil {
					accountBalance = monthData.Accounts.FiveTwoNine.TotalValue
				}
			case "hsa":
				if monthData.Accounts.HSA != nil {
					accountBalance = monthData.Accounts.HSA.TotalValue
				}
			default:
				// If no specific account type, use net worth as fallback
				accountBalance = monthData.NetWorth
			}

			// Check if goal is achieved in this month
			if accountBalance >= goal.TargetAmount {
				achievementMonth = monthIdx
				goalAchieved = true
				break // Found first achievement month, stop searching
			}
		}

		if goalAchieved {
			achievementMonths = append(achievementMonths, achievementMonth)
			achievedCount++
		}
		// If goal is never achieved in this path, we don't add it to achievementMonths
	}

	// Calculate achievement rate (what percentage of paths achieved the goal)
	achievementRate = float64(achievedCount) / float64(totalPaths)

	// If no paths achieved the goal, return zeros
	if len(achievementMonths) == 0 {
		return 0, 0, 0, 0, 0, achievementRate
	}

	// Sort achievement months to calculate percentiles
	sort.Ints(achievementMonths)

	// Calculate percentile indices
	count := len(achievementMonths)
	p10Index := int(float64(count) * 0.10)
	p25Index := int(float64(count) * 0.25)
	p50Index := int(float64(count) * 0.50)
	p75Index := int(float64(count) * 0.75)
	p90Index := int(float64(count) * 0.90)

	// Ensure indices are within bounds
	if p10Index >= count {
		p10Index = count - 1
	}
	if p25Index >= count {
		p25Index = count - 1
	}
	if p50Index >= count {
		p50Index = count - 1
	}
	if p75Index >= count {
		p75Index = count - 1
	}
	if p90Index >= count {
		p90Index = count - 1
	}

	return achievementMonths[p10Index], achievementMonths[p25Index], achievementMonths[p50Index],
		achievementMonths[p75Index], achievementMonths[p90Index], achievementRate
}

func getStatusTagFromProbability(probability float64) string {
	if probability >= 0.9 {
		return "excellent"
	} else if probability >= 0.7 {
		return "good"
	} else if probability >= 0.5 {
		return "concerning"
	} else {
		return "critical"
	}
}

// determineGoalStatus returns a user-friendly status string based on progress and probability
func determineGoalStatus(progressPercentage float64, probability float64) string {
	// If goal is already achieved (100%+ progress)
	if progressPercentage >= 100.0 {
		return "Achieved"
	}

	// If high probability and good progress
	if probability >= 0.9 && progressPercentage >= 50.0 {
		return "On Track"
	}

	// If good probability but lower progress
	if probability >= 0.7 {
		return "On Track"
	}

	// If moderate probability
	if probability >= 0.5 {
		return "At Risk"
	}

	// Low probability
	return "Behind"
}

func assessPlanHealth(results SimulationResults, goalOutcomes []GoalOutcome) PlanHealth {
	// Calculate overall score based on goal success rates and bankruptcy risk
	overallScore := int((results.ProbabilityOfSuccess * 0.7 + (1.0-results.ProbabilityOfBankruptcy) * 0.3) * 100)

	var riskLevel string
	if results.ProbabilityOfBankruptcy > 0.1 {
		riskLevel = "high"
	} else if results.ProbabilityOfBankruptcy > 0.05 {
		riskLevel = "moderate"
	} else {
		riskLevel = "low"
	}

	var confidenceLevel string
	if overallScore >= 80 {
		confidenceLevel = "high"
	} else if overallScore >= 60 {
		confidenceLevel = "medium"
	} else {
		confidenceLevel = "low"
	}

	keyRisks := []string{}
	if results.ProbabilityOfBankruptcy > 0.05 {
		keyRisks = append(keyRisks, fmt.Sprintf("%.1f%% chance of financial distress", results.ProbabilityOfBankruptcy*100))
	}

	keyStrengths := []string{}
	if results.ProbabilityOfSuccess > 0.8 {
		keyStrengths = append(keyStrengths, "High probability of achieving primary goals")
	}

	return PlanHealth{
		OverallScore:    overallScore,
		RiskLevel:       riskLevel,
		ConfidenceLevel: confidenceLevel,
		KeyRisks:        keyRisks,
		KeyStrengths:    keyStrengths,
	}
}

func generateQuickActions(results SimulationResults, goalOutcomes []GoalOutcome) []QuickAction {
	actions := []QuickAction{}

	// Add action if bankruptcy risk is high
	if results.ProbabilityOfBankruptcy > 0.1 {
		actions = append(actions, QuickAction{
			Type:            "warning",
			Title:           "Reduce Financial Risk",
			Description:     "Consider increasing emergency fund and reducing expenses",
			Priority:        "high",
			EstimatedImpact: fmt.Sprintf("Could reduce bankruptcy risk by %.1f%%", results.ProbabilityOfBankruptcy*50*100),
		})
	}

	// Add action for low-probability goals
	for _, outcome := range goalOutcomes {
		if outcome.Probability < 0.6 {
			actions = append(actions, QuickAction{
				Type:            "opportunity",
				Title:           fmt.Sprintf("Improve %s Success Rate", outcome.GoalName),
				Description:     "Consider increasing contributions or adjusting timeline",
				Priority:        "medium",
				EstimatedImpact: "Could improve success rate by 15-20%",
			})
		}
	}

	return actions
}

func calculateAge(monthOffset int, initialAge int) int {
	return initialAge + (monthOffset / 12)
}

func calculatePercentageChange(previous, current float64) float64 {
	if previous == 0 {
		return 0.0
	}
	return (current - previous) / previous
}

func generateBalanceSheet(monthData MonthlyDataSimulation) BalanceSheet {
	// Calculate total liabilities from all active liabilities
	totalLiabilities := 0.0
	for _, liability := range monthData.Liabilities {
		if liability != nil {
			totalLiabilities += liability.CurrentPrincipalBalance
		}
	}

	// Calculate total assets (net worth + liabilities, since net worth = assets - liabilities)
	totalAssets := monthData.NetWorth + totalLiabilities
	if totalAssets < 0 {
		totalAssets = 0
	}

	return BalanceSheet{
		TotalAssets:      totalAssets,
		TotalLiabilities: totalLiabilities,
		InvestmentAccounts: InvestmentAccounts{
			Total:            getTotalInvestmentValue(monthData.Accounts),
			TaxableBrokerage: getAccountValue(monthData.Accounts.Taxable),
			Account401k:      getAccountValue(monthData.Accounts.TaxDeferred),
			RothIRA:          getAccountValue(monthData.Accounts.Roth),
		},
		Cash:                 monthData.Accounts.Cash,
		InvestmentAllocation: generateInvestmentAllocation(monthData.Accounts),
	}
}

func generateCashFlowAnalysis(monthlyData []MonthlyDataSimulation, lastMonth MonthlyDataSimulation) CashFlowAnalysis {
    // ✅ FIX: Aggregate annual data with detailed breakdowns matching UI expectations
    totalIncome := 0.0
    totalExpenses := 0.0
    totalTaxes := 0.0
    totalContributions := 0.0
	divestmentProceeds := 0.0

	// Detailed income breakdowns
	baseSalary := 0.0
	bonus := 0.0
	rsuVesting := 0.0
	qualifiedDividends := 0.0
	interestIncome := 0.0
	shortTermCapitalGains := 0.0
	longTermCapitalGains := 0.0
	socialSecurity := 0.0
	pension := 0.0

	// Detailed expense breakdowns
	housingExpenses := 0.0
	otherExpenses := 0.0
	contributionsTaxable := 0.0
	contributionsTaxDeferred := 0.0
	contributionsRoth := 0.0

    for _, month := range monthlyData {
        totalIncome += month.IncomeThisMonth
        totalExpenses += month.ExpensesThisMonth
        if month.TaxPaidAnnual != nil {
            totalTaxes += *month.TaxPaidAnnual
        }
        totalContributions += month.ContributionsToInvestmentsThisMonth
		divestmentProceeds += month.DivestmentProceedsThisMonth

		// Aggregate detailed income
		baseSalary += month.SalaryIncomeThisMonth
		bonus += month.BonusIncomeThisMonth
		rsuVesting += month.RSUIncomeThisMonth
		qualifiedDividends += month.DividendsReceivedThisMonth.Qualified
		interestIncome += month.InterestIncomeThisMonth
		socialSecurity += month.SocialSecurityIncomeThisMonth
		pension += month.PensionIncomeThisMonth
		// Note: Capital gains would come from annual tax calculation, not monthly

		// Aggregate detailed expenses
		housingExpenses += month.HousingExpensesThisMonth
		otherExpenses += month.ExpensesThisMonth - month.HousingExpensesThisMonth

		// Aggregate contributions by account type
		contributionsTaxable += month.ContributionsTaxableThisMonth
		contributionsTaxDeferred += month.ContributionsTaxDeferredThisMonth
		contributionsRoth += month.ContributionsRothThisMonth
    }

	// Get capital gains amounts from year-to-date tracking (not the tax, but the actual gains)
	longTermCapitalGains = lastMonth.LTCGForTaxYTD
	shortTermCapitalGains = lastMonth.STCGForTaxYTD

	// Calculate totals for each category
	employmentTotal := baseSalary + bonus + rsuVesting
	investmentTotal := qualifiedDividends + interestIncome + shortTermCapitalGains + longTermCapitalGains
	retirementTotal := socialSecurity + pension // + annuities + withdrawals (when available)

	netCashFlow := totalIncome - totalExpenses - totalTaxes
	savingsRate := 0.0
	if totalIncome > 0 {
		savingsRate = (totalIncome - totalExpenses) / totalIncome
	}
	availableForSavings := totalIncome - totalExpenses - totalTaxes
	// Include divestment proceeds in free cash flow calculation
	// Free cash flow = what's left after all expenses, taxes, and contributions are paid
	// Divestment proceeds are cash inflows that help fund expenses
	freeCashFlow := availableForSavings - totalContributions + divestmentProceeds

	return CashFlowAnalysis{
		GrossIncome:   totalIncome,
		TotalExpenses: totalExpenses,
		NetCashFlow:   netCashFlow,
		TotalOutflows: totalExpenses + totalTaxes + totalContributions,

        IncomeSources: IncomeSources{
            Employment: EmploymentIncome{
				Total:      employmentTotal,
				BaseSalary: baseSalary,
				Bonus:      bonus,
				RsuVesting: rsuVesting,
			},
            Investment: InvestmentIncome{
				Total:                 investmentTotal,
				QualifiedDividends:    qualifiedDividends,
				InterestIncome:        interestIncome,
				ShortTermCapitalGains: shortTermCapitalGains,
				LongTermCapitalGains:  longTermCapitalGains,
			},
			Retirement: RetirementIncome{
				Total:          retirementTotal,
				SocialSecurity: socialSecurity,
				Pension:        pension,
				Annuities:      0.0, // TODO: Track annuities in monthly data
				Withdrawals:    divestmentProceeds, // Asset liquidations to fund spending
			},
			DivestmentProceeds: divestmentProceeds,
        },

		ExpenseSources: ExpenseSources{
			Taxes: TaxDetails{
				Total:        totalTaxes,
				Federal:      getFloatValue(lastMonth.FederalIncomeTaxAnnual),
				State:        getFloatValue(lastMonth.StateIncomeTaxAnnual),
				Fica:         getFloatValue(lastMonth.TotalFICATaxAnnual),
				CapitalGains: getFloatValue(lastMonth.CapitalGainsTaxLongTermAnnual) + getFloatValue(lastMonth.CapitalGainsTaxShortTermAnnual),
			},
			Living: LivingExpenses{
				Total:   totalExpenses,
				Housing: housingExpenses,
				Other:   otherExpenses,
			},
			Investments: InvestmentExpenses{
				Total:       totalContributions,
				Taxable:     contributionsTaxable,      // TODO: Track by account type
				TaxDeferred: contributionsTaxDeferred,  // TODO: Track by account type
				Roth:        contributionsRoth,         // TODO: Track by account type
			},
		},

		SavingsAnalysis: SavingsAnalysis{
			AvailableForSavings: availableForSavings,
			TotalContributions:  totalContributions,
			SavingsRate:         savingsRate,
			FreeCashFlow:        freeCashFlow,
		},
	}
}

func generateStrategyAnalysis(monthData MonthlyDataSimulation) StrategyAnalysis {
	return StrategyAnalysis{
		Active:        []ActiveStrategy{},
		Planned:       []PlannedStrategy{},
		KeyMilestones: []KeyMilestone{},
	}
}

// Helper functions for accessing account values safely

func getTotalInvestmentValue(accounts AccountHoldingsMonthEnd) float64 {
	total := 0.0
	if accounts.Taxable != nil {
		total += accounts.Taxable.TotalValue
	}
	if accounts.TaxDeferred != nil {
		total += accounts.TaxDeferred.TotalValue
	}
	if accounts.Roth != nil {
		total += accounts.Roth.TotalValue
	}
	return total
}

func getAccountValue(account *Account) float64 {
	if account == nil {
		return 0.0
	}
	return account.TotalValue
}

func getFloatValue(ptr *float64) float64 {
	if ptr == nil {
		return 0.0
	}
	return *ptr
}

func generateInvestmentAllocation(accounts AccountHoldingsMonthEnd) []InvestmentAllocation {
	// Calculate total investment value across all accounts
	totalValue := getTotalInvestmentValue(accounts)

	if totalValue == 0 {
		return []InvestmentAllocation{}
	}

	// Aggregate holdings by asset class across all accounts
	assetClassTotals := make(map[AssetClass]float64)

	// Helper function to aggregate holdings from an account
	aggregateHoldings := func(account *Account) {
		if account == nil || account.Holdings == nil {
			return
		}
		for _, holding := range account.Holdings {
			assetClassTotals[holding.AssetClass] += holding.CurrentMarketValueTotal
		}
	}

	// Aggregate across all investment accounts
	aggregateHoldings(accounts.Taxable)
	aggregateHoldings(accounts.TaxDeferred)
	aggregateHoldings(accounts.Roth)
	aggregateHoldings(accounts.FiveTwoNine)
	aggregateHoldings(accounts.HSA)

	// Convert to allocation array
	allocations := []InvestmentAllocation{}
	for assetClass, value := range assetClassTotals {
		if value > 0 {
			percentage := value / totalValue
			allocations = append(allocations, InvestmentAllocation{
				AssetClass: string(assetClass),
				Percentage: percentage,
				Value:      value,
				TargetPercentage: nil, // Target allocation not currently tracked
			})
		}
	}

	return allocations
}

// Simplified implementations for chart generation
// These would need full implementation for production

func generateNetWorthChart(samplePaths []SimulationResult, medianPath SimulationResult, startYear int) NetWorthChart {
    if len(medianPath.MonthlyData) == 0 {
        return NetWorthChart{TimeSeries: []NetWorthTimeSeriesPoint{}, SamplePaths: [][]float64{}, Summary: NetWorthChartSummary{RecommendedYAxisMax: 0, RecommendedYAxisMin: 0, VolatilityPeriods: []VolatilityPeriod{}}}
    }

    years := len(medianPath.MonthlyData) / 12

    // Build sample path yearly net worth series
    samplePathValues := make([][]float64, 0, len(samplePaths))
    for _, path := range samplePaths {
        yearVals := make([]float64, 0, years)
        for y := 0; y < years; y++ {
            idx := y*12 + 11
            if idx < len(path.MonthlyData) {
                yearVals = append(yearVals, path.MonthlyData[idx].NetWorth)
            }
        }
        if len(yearVals) == years {
            samplePathValues = append(samplePathValues, yearVals)
        }
    }

    // Compute percentiles across sample paths per year
    ts := make([]NetWorthTimeSeriesPoint, 0, years)
    for y := 0; y < years; y++ {
        vals := make([]float64, 0, len(samplePathValues))
        for _, sp := range samplePathValues {
            if y < len(sp) {
                vals = append(vals, sp[y])
            }
        }
        var p10, p25, p50, p75, p90 float64
        if len(vals) == 0 {
            idx := y*12 + 11
            v := medianPath.MonthlyData[idx].NetWorth
            p10, p25, p50, p75, p90 = v, v, v, v, v
        } else {
            sort.Float64s(vals)
            getPct := func(p float64) float64 {
                if len(vals) == 1 {
                    return vals[0]
                }
                pos := p * float64(len(vals)-1)
                lo := int(pos)
                hi := lo
                if float64(lo) < pos {
                    hi = lo + 1
                }
                if hi >= len(vals) {
                    hi = len(vals) - 1
                }
                w := pos - float64(lo)
                return vals[lo]*(1-w) + vals[hi]*w
            }
            p10 = getPct(0.10)
            p25 = getPct(0.25)
            p50 = getPct(0.50)
            p75 = getPct(0.75)
            p90 = getPct(0.90)
        }
        ts = append(ts, NetWorthTimeSeriesPoint{Year: startYear + y, P10: p10, P25: p25, P50: p50, P75: p75, P90: p90})
    }

    recMax := 0.0
    for _, pt := range ts {
        if pt.P90 > recMax {
            recMax = pt.P90
        }
    }

    return NetWorthChart{
        TimeSeries:  ts,
        SamplePaths: samplePathValues,
        Summary: NetWorthChartSummary{RecommendedYAxisMax: recMax * 1.05, RecommendedYAxisMin: 0, VolatilityPeriods: []VolatilityPeriod{}},
    }
}

func generateCashFlowChart(medianPath SimulationResult, startYear int) CashFlowChart {
    if len(medianPath.MonthlyData) == 0 {
        return CashFlowChart{TimeSeries: []CashFlowTimeSeriesPoint{}, Summary: CashFlowChartSummary{AverageAnnualSavings: 0, AverageSavingsRate: 0, PeakSavingsYear: startYear, LowestSavingsYear: startYear}}
    }
    years := len(medianPath.MonthlyData) / 12
    pts := make([]CashFlowTimeSeriesPoint, 0, years)
    totalSavings := 0.0
    avgSR := 0.0
    best := -1e18
    worst := 1e18
    peak := startYear
    low := startYear
    for y := 0; y < years; y++ {
        income := 0.0
        expenses := 0.0
        taxes := 0.0
        fed := 0.0
        st := 0.0
        fica := 0.0
        for m := 0; m < 12; m++ {
            idx := y*12 + m
            md := medianPath.MonthlyData[idx]
            income += md.IncomeThisMonth
            expenses += md.ExpensesThisMonth
            if md.TaxPaidAnnual != nil {
                taxes += *md.TaxPaidAnnual
                if md.FederalIncomeTaxAnnual != nil {
                    fed = *md.FederalIncomeTaxAnnual
                }
                if md.StateIncomeTaxAnnual != nil {
                    st = *md.StateIncomeTaxAnnual
                }
                if md.TotalFICATaxAnnual != nil {
                    fica = *md.TotalFICATaxAnnual
                }
            }
        }
        net := income - expenses - taxes
        sr := 0.0
        if income > 0 {
            sr = (income - expenses) / income
        }
        yr := startYear + y
        pts = append(pts, CashFlowTimeSeriesPoint{Year: yr, Income: income, Expenses: expenses, NetSavings: net, SavingsRate: sr, Taxes: taxes, TaxBreakdown: TaxBreakdown{Total: taxes, Federal: fed, State: st, Fica: fica}})
        totalSavings += net
        avgSR += sr
        if net > best {
            best = net
            peak = yr
        }
        if net < worst {
            worst = net
            low = yr
        }
    }
    if years > 0 {
        avgSR = avgSR / float64(years)
    }
    return CashFlowChart{TimeSeries: pts, Summary: CashFlowChartSummary{AverageAnnualSavings: totalSavings / float64(max(1, years)), AverageSavingsRate: avgSR, PeakSavingsYear: peak, LowestSavingsYear: low}}
}

func max(a, b int) int { if a>b {return a}; return b }

func generateAssetAllocationChart(medianPath SimulationResult, startYear int) AssetAllocationChart {
	if len(medianPath.MonthlyData) == 0 {
		return AssetAllocationChart{
			TimeSeries:  []AssetAllocationPoint{},
			TargetBands: []AllocationTargetBand{},
			Summary:     AssetAllocationSummary{},
		}
	}

	years := len(medianPath.MonthlyData) / 12
	timeSeries := make([]AssetAllocationPoint, 0, years)

	// Helper struct for aggregating asset class data
	type AssetClassAggregation struct {
		AssetClass         string
		TotalValue         float64
		TaxableValue       float64
		TaxAdvantagedValue float64
	}

	for y := 0; y < years; y++ {
		// Use December (month 11) of each year
		idx := y*12 + 11
		if idx >= len(medianPath.MonthlyData) {
			break
		}

		monthData := medianPath.MonthlyData[idx]

		// Aggregate holdings by asset class across all accounts
		assetClassTotals := make(map[string]AssetClassAggregation)
		totalValue := 0.0

		// Helper to process account holdings
		processAccount := func(account *Account, accountType string) {
			if account == nil || account.Holdings == nil {
				return
			}
			for _, holding := range account.Holdings {
				key := string(holding.AssetClass)
				agg := assetClassTotals[key]

				value := holding.CurrentMarketValueTotal
				agg.TotalValue += value
				totalValue += value

				// Track tax breakdown
				switch accountType {
				case "taxable":
					agg.TaxableValue += value
				case "tax_deferred", "roth", "529", "hsa":
					agg.TaxAdvantagedValue += value
				}

				agg.AssetClass = string(holding.AssetClass)
				assetClassTotals[key] = agg
			}
		}

		// Process all investment accounts
		processAccount(monthData.Accounts.Taxable, "taxable")
		processAccount(monthData.Accounts.TaxDeferred, "tax_deferred")
		processAccount(monthData.Accounts.Roth, "roth")
		processAccount(monthData.Accounts.FiveTwoNine, "529")
		processAccount(monthData.Accounts.HSA, "hsa")

		// Add cash as a special asset class
		if monthData.Accounts.Cash > 0 {
			cashKey := string(AssetClassCash)
			agg := assetClassTotals[cashKey]
			agg.TotalValue = monthData.Accounts.Cash
			agg.TaxableValue = monthData.Accounts.Cash
			agg.AssetClass = string(AssetClassCash)
			assetClassTotals[cashKey] = agg
			totalValue += monthData.Accounts.Cash
		}

		// Build breakdown map
		breakdown := make(map[string]AssetAllocationDetail)
		for assetClass, agg := range assetClassTotals {
			percentage := 0.0
			if totalValue > 0 {
				percentage = agg.TotalValue / totalValue
			}

			breakdown[assetClass] = AssetAllocationDetail{
				AssetClass: agg.AssetClass,
				Value:      agg.TotalValue,
				Percentage: percentage,
				TaxBreakdown: AssetClassTaxBreakdown{
					Taxable:       agg.TaxableValue,
					TaxAdvantaged: agg.TaxAdvantagedValue,
				},
			}
		}

		timeSeries = append(timeSeries, AssetAllocationPoint{
			Year:       startYear + y,
			TotalValue: totalValue,
			Breakdown:  breakdown,
		})
	}

	return AssetAllocationChart{
		TimeSeries:  timeSeries,
		TargetBands: []AllocationTargetBand{},
		Summary:     AssetAllocationSummary{},
	}
}

func generateEventMarkers(medianPath SimulationResult, input SimulationInput) []EventMarker {
	markers := make([]EventMarker, 0)

	// Helper function to find net worth at a specific year
	findNetWorthAtYear := func(year int) float64 {
		targetMonthOffset := (year - input.StartYear) * 12
		for _, monthData := range medianPath.MonthlyData {
			if monthData.MonthOffset == targetMonthOffset {
				return monthData.NetWorth
			}
		}
		// If exact month not found, find closest
		for _, monthData := range medianPath.MonthlyData {
			monthYear := input.StartYear + (monthData.MonthOffset / 12)
			if monthYear == year {
				return monthData.NetWorth
			}
		}
		return 0.0
	}

	// Helper function to map event type to marker type
	mapEventTypeToMarkerType := func(eventType string) string {
		switch eventType {
		case "GOAL_DEFINE":
			return "goal"
		case "INCOME", "SOCIAL_SECURITY_INCOME", "INHERITANCE", "LIFE_INSURANCE_PAYOUT":
			return "opportunity"
		case "HEALTHCARE_COST", "LIABILITY_ADD", "DISABILITY_INSURANCE_PAYOUT", "LONG_TERM_CARE_PAYOUT":
			return "risk"
		case "CAREER_CHANGE", "RELOCATION", "FAMILY_EVENT", "FINANCIAL_MILESTONE":
			return "milestone"
		default:
			return "milestone"
		}
	}

	// HYBRID APPROACH: Blacklist routine events, classify rest by category
	// Essential events = Life events that always matter (show in Essential mode)
	// Detailed events = Financial events (show only in Detailed mode)
	// Routine events = Never show (too frequent/noisy)

	// Life events - always show as "essential" category
	lifeEvents := map[string]bool{
		"CAREER_CHANGE":              true,
		"RELOCATION":                 true,
		"FAMILY_EVENT":               true,
		"INHERITANCE":                true,
		"LARGE_GIFT":                 true,
		"FINANCIAL_MILESTONE":        true,
		"SOCIAL_SECURITY_INCOME":     true,
		"DISABILITY_INSURANCE_PAYOUT": true,
		"LIFE_INSURANCE_PAYOUT":      true,
		"LONG_TERM_CARE_PAYOUT":      true,
	}

	// Routine events - never show (blacklist) unless amount > $100k
	routineEvents := map[string]bool{
		"CONTRIBUTION":         true,
		"WITHDRAWAL":           true,
		"DEBT_PAYMENT":         true,
		"PROPERTY_MAINTENANCE": true,
		"ASSET_ALLOCATION":     true,
		"RMD":                  true,
		"TAX_LOSS_HARVESTING":  true,
	}

	// Add markers for events using hybrid logic
	for _, event := range input.Events {
		eventYear := input.StartYear + (event.MonthOffset / 12)

		// Determine category and whether to include
		var category string
		var shouldInclude bool

		if lifeEvents[event.Type] {
			// Life events always included as "essential"
			category = "essential"
			shouldInclude = true
		} else if routineEvents[event.Type] {
			// Routine events only if very large amount ($100k+)
			if event.Amount > 100000 {
				category = "detailed"
				shouldInclude = true
			} else {
				shouldInclude = false
			}
		} else {
			// All other events included as "detailed" if significant
			// Include if amount > $25k OR it's a notable event type
			if event.Amount > 25000 ||
				event.Type == "INCOME" ||
				event.Type == "ONE_TIME_EVENT" ||
				event.Type == "HEALTHCARE_COST" ||
				event.Type == "LIABILITY_ADD" ||
				event.Type == "REAL_ESTATE_PURCHASE" ||
				event.Type == "REAL_ESTATE_SALE" ||
				event.Type == "RSU_VESTING" ||
				event.Type == "ROTH_CONVERSION" ||
				event.Type == "MEGA_BACKDOOR_ROTH" ||
				event.Type == "ANNUITY" {
				category = "detailed"
				shouldInclude = true
			} else {
				shouldInclude = false
			}
		}

		if shouldInclude {
			netWorthAtEvent := findNetWorthAtYear(eventYear)

			markers = append(markers, EventMarker{
				Year:            eventYear,
				NetWorthAtEvent: netWorthAtEvent,
				Label:           event.Description,
				Icon:            getEventIcon(event.Type),
				Type:            mapEventTypeToMarkerType(event.Type),
				Category:        category,
				EventType:       event.Type,
			})
		}
	}

	// Add markers for goals (always essential)
	for _, goal := range input.Goals {
		goalYear := input.StartYear + (goal.TargetMonthOffset / 12)
		netWorthAtGoal := findNetWorthAtYear(goalYear)

		markers = append(markers, EventMarker{
			Year:            goalYear,
			NetWorthAtEvent: netWorthAtGoal,
			Label:           goal.Name,
			Icon:            "🎯",
			Type:            "goal",
			Category:        "essential",
			EventType:       "GOAL_DEFINE",
		})
	}

	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generated %d event markers", len(markers))
	return markers
}

func generateGoalBreakdowns(goals []Goal, samplePaths []SimulationResult, startYear int) []GoalBreakdown {
	breakdowns := make([]GoalBreakdown, len(goals))

	for i, goal := range goals {
		simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating breakdown for goal: %s", goal.Name)

		// Calculate success probability across all paths
		successRate := calculateGoalSuccessRate(goal, samplePaths)
		targetYear := startYear + (goal.TargetMonthOffset / 12)

		// Calculate current progress from median path
		medianPath := findMedianPath(samplePaths)
		currentAmount := 0.0
		if len(medianPath.MonthlyData) > 0 {
			// Get current year data
			currentYearData := findMonthDataForYear(medianPath.MonthlyData, startYear, startYear)
			if currentYearData != nil {
				// Goals track against total net worth by default
				currentAmount = currentYearData.NetWorth
			}
		}

		progressPercentage := 0.0
		if goal.TargetAmount > 0 {
			progressPercentage = (currentAmount / goal.TargetAmount) * 100
		}

		// Generate summary metrics
		summaryMetrics := []SummaryMetric{
			{
				Label: "Success Probability",
				Value: fmt.Sprintf("%.0f%%", successRate*100),
				Trend: getSuccessTrend(successRate),
			},
			{
				Label: "Target Year",
				Value: fmt.Sprintf("%d", targetYear),
				Trend: nil,
			},
			{
				Label: "Current Progress",
				Value: fmt.Sprintf("%.1f%%", progressPercentage),
				Trend: getProgressTrend(progressPercentage, targetYear, startYear),
			},
			{
				Label: "Target Amount",
				Value: fmt.Sprintf("$%.0f", goal.TargetAmount),
				Trend: nil,
			},
		}

		// Generate insights based on success rate and progress
		insights := generateGoalInsights(goal, successRate, progressPercentage, targetYear, startYear)

		// Generate scenarios (optimistic, realistic, pessimistic)
		subScenarios := generateGoalScenarios(goal, samplePaths)

		breakdowns[i] = GoalBreakdown{
			GoalID:          goal.ID,
			Name:            goal.Name,
			Icon:            getGoalIcon(goal.Category),
			Description:     goal.Description,
			SummaryMetrics:  summaryMetrics,
			Insights:        insights,
			SubScenarios:    subScenarios,
			Sensitivity:     generateSensitivityAnalysis(goal, samplePaths),
		}
	}

	return breakdowns
}

// findMonthDataForYear finds the December data for a specific year
func findMonthDataForYear(monthlyData []MonthlyDataSimulation, year int, startYear int) *MonthlyDataSimulation {
	targetMonthOffset := ((year - startYear) * 12) + 11 // December

	for _, month := range monthlyData {
		if month.MonthOffset == targetMonthOffset {
			return &month
		}
	}
	return nil
}

// getSuccessTrend determines trend based on success rate
func getSuccessTrend(successRate float64) *string {
	if successRate > 0.8 {
		trend := "positive"
		return &trend
	} else if successRate < 0.4 {
		trend := "negative"
		return &trend
	} else {
		trend := "neutral"
		return &trend
	}
}

// getProgressTrend determines progress trend based on current progress vs expected
func getProgressTrend(currentProgress float64, targetYear, startYear int) *string {
	yearsElapsed := 1.0 // Assume we're 1 year in
	totalYears := float64(targetYear - startYear)
	expectedProgress := (yearsElapsed / totalYears) * 100

	if currentProgress > expectedProgress*1.2 {
		trend := "positive"
		return &trend
	} else if currentProgress < expectedProgress*0.8 {
		trend := "negative"
		return &trend
	} else {
		trend := "neutral"
		return &trend
	}
}

// generateGoalInsights creates insights based on goal analysis
func generateGoalInsights(goal Goal, successRate, progressPercentage float64, targetYear, startYear int) []GoalInsight {
	insights := []GoalInsight{}

	// Success rate insights
	if successRate >= 0.8 {
		insights = append(insights, GoalInsight{
			Type:       "strength",
			Title:      "Excellent Success Rate",
			Text:       "Your current plan has a high probability of achieving this goal.",
			Priority:   "medium",
			Actionable: boolPtr(false),
		})
	} else if successRate >= 0.6 {
		insights = append(insights, GoalInsight{
			Type:       "opportunity",
			Title:      "Good Progress",
			Text:       "You're on track, but consider increasing contributions for better certainty.",
			Priority:   "medium",
			Actionable: boolPtr(true),
		})
	} else if successRate >= 0.4 {
		insights = append(insights, GoalInsight{
			Type:       "risk",
			Title:      "Moderate Risk",
			Text:       "Consider increasing contributions or extending the timeline.",
			Priority:   "high",
			Actionable: boolPtr(true),
		})
	} else {
		insights = append(insights, GoalInsight{
			Type:       "risk",
			Title:      "High Risk",
			Text:       "This goal may not be achievable with current contributions. Consider a revised strategy.",
			Priority:   "high",
			Actionable: boolPtr(true),
		})
	}

	// Progress insights
	yearsElapsed := 1.0
	totalYears := float64(targetYear - startYear)
	expectedProgress := (yearsElapsed / totalYears) * 100

	if progressPercentage > expectedProgress*1.2 {
		insights = append(insights, GoalInsight{
			Type:       "strength",
			Title:      "Ahead of Schedule",
			Text:       "You're making excellent progress toward this goal.",
			Priority:   "low",
			Actionable: boolPtr(false),
		})
	} else if progressPercentage < expectedProgress*0.8 {
		insights = append(insights, GoalInsight{
			Type:       "opportunity",
			Title:      "Behind Schedule",
			Text:       "Consider increasing monthly contributions to get back on track.",
			Priority:   "medium",
			Actionable: boolPtr(true),
		})
	}

	// Timeline insights
	if targetYear - startYear < 5 {
		insights = append(insights, GoalInsight{
			Type:       "risk",
			Title:      "Short Timeline",
			Text:       "This goal has a relatively short timeline, which increases volatility risk.",
			Priority:   "medium",
			Actionable: boolPtr(true),
		})
	}

	return insights
}

// generateGoalScenarios creates optimistic, realistic, and pessimistic scenarios
func generateGoalScenarios(goal Goal, samplePaths []SimulationResult) []SubScenario {
	scenarios := []SubScenario{}

	// Calculate percentile outcomes
	finalValues := []float64{}
	for _, path := range samplePaths {
		if len(path.MonthlyData) > 0 {
			lastMonth := path.MonthlyData[len(path.MonthlyData)-1]
			// Goals track against total net worth by default
			balance := lastMonth.NetWorth
			finalValues = append(finalValues, balance)
		}
	}

	if len(finalValues) > 0 {
		// Sort for percentile calculation
		sort.Float64s(finalValues)

		p25Index := int(float64(len(finalValues)) * 0.25)
		p50Index := int(float64(len(finalValues)) * 0.5)
		p75Index := int(float64(len(finalValues)) * 0.75)

		// Pessimistic scenario (P25)
		scenarios = append(scenarios, SubScenario{
			Name:        "Conservative Outcome",
			Description: "Lower end of expected results",
			Probability: 0.25,
			Metrics: []SummaryMetric{
				{
					Label: "Final Amount",
					Value: fmt.Sprintf("$%.0f", finalValues[p25Index]),
				},
				{
					Label: "Success Rate",
					Value: fmt.Sprintf("%.0f%%", float64(p25Index)/float64(len(finalValues))*100),
				},
			},
		})

		// Realistic scenario (P50)
		scenarios = append(scenarios, SubScenario{
			Name:        "Expected Outcome",
			Description: "Most likely result based on median path",
			Probability: 0.5,
			Metrics: []SummaryMetric{
				{
					Label: "Final Amount",
					Value: fmt.Sprintf("$%.0f", finalValues[p50Index]),
				},
				{
					Label: "Goal Achievement",
					Value: func() string {
						if finalValues[p50Index] >= goal.TargetAmount {
							return "✅ Achieved"
						} else {
							return "❌ Not Achieved"
						}
					}(),
				},
			},
		})

		// Optimistic scenario (P75)
		scenarios = append(scenarios, SubScenario{
			Name:        "Optimistic Outcome",
			Description: "Upper end of expected results",
			Probability: 0.75,
			Metrics: []SummaryMetric{
				{
					Label: "Final Amount",
					Value: fmt.Sprintf("$%.0f", finalValues[p75Index]),
				},
				{
					Label: "Excess Amount",
					Value: func() string {
						excess := finalValues[p75Index] - goal.TargetAmount
						if excess > 0 {
							return fmt.Sprintf("+$%.0f", excess)
						} else {
							return "$0"
						}
					}(),
				},
			},
		})
	}

	return scenarios
}

// generateSensitivityAnalysis creates sensitivity analysis for key factors
func generateSensitivityAnalysis(goal Goal, samplePaths []SimulationResult) *SensitivityAnalysis {
	// Simple sensitivity analysis based on goal characteristics
	factors := []SensitivityFactor{
		{
			Factor:      "Market Returns",
			Impact:      0.7,
			Description: "Stock and bond market performance significantly affects this goal",
		},
		{
			Factor:      "Contribution Rate",
			Impact:      0.8,
			Description: "Monthly contribution amount is highly impactful for goal success",
		},
	}

	// Add timeline sensitivity for shorter-term goals (less than 10 years)
	yearsUntilGoal := goal.TargetMonthOffset / 12
	if yearsUntilGoal < 10 {
		factors = append(factors, SensitivityFactor{
			Factor:      "Timeline",
			Impact:      0.6,
			Description: "Short timeline increases volatility risk and reduces compounding benefits",
		})
	}

	return &SensitivityAnalysis{
		KeyFactors: factors,
	}
}

// getGoalIcon returns appropriate icon for goal category
func getGoalIcon(category string) string {
	switch category {
	case "retirement":
		return "🏖️"
	case "purchase":
		return "🏠"
	case "education":
		return "🎓"
	case "emergency":
		return "🚨"
	default:
		return "🎯"
	}
}

// boolPtr returns a pointer to a boolean value
func boolPtr(b bool) *bool {
	return &b
}

func generateAdvancedAnalysisPanels(medianPath SimulationResult, samplePaths []SimulationResult) []AdvancedAnalysisPanel {
	return []AdvancedAnalysisPanel{}
}

func generateRiskAnalysis(samplePaths []SimulationResult) *RiskAnalysis {
	if len(samplePaths) == 0 {
		return &RiskAnalysis{
			SequenceOfReturnsRisk: 0.0,
			InflationRisk:         0.0,
			LongevityRisk:         0.0,
			ConcentrationRisk:     0.0,
			KeyRiskFactors:        []RiskFactor{},
		}
	}

	// Calculate sequence of returns risk based on variance in final outcomes
	finalNetWorths := make([]float64, 0, len(samplePaths))
	for _, path := range samplePaths {
		if len(path.MonthlyData) > 0 {
			finalNetWorths = append(finalNetWorths, path.FinalNetWorth)
		}
	}

	// Calculate coefficient of variation (volatility/mean) as sequence risk measure
	sequenceRisk := 0.0
	if len(finalNetWorths) > 1 {
		mean := 0.0
		for _, nw := range finalNetWorths {
			mean += nw
		}
		mean /= float64(len(finalNetWorths))

		variance := 0.0
		for _, nw := range finalNetWorths {
			diff := nw - mean
			variance += diff * diff
		}
		variance /= float64(len(finalNetWorths))
		stdDev := math.Sqrt(variance)

		if mean != 0 {
			coeffOfVariation := stdDev / math.Abs(mean)
			// Normalize to 0-1 scale (cap at 2.0 CoV = 1.0 risk)
			sequenceRisk = math.Min(coeffOfVariation/2.0, 1.0)
		}
	}

	// Assess concentration risk based on asset allocation diversity
	// Use median path for this analysis
	sort.Slice(samplePaths, func(i, j int) bool {
		return samplePaths[i].FinalNetWorth < samplePaths[j].FinalNetWorth
	})
	medianPath := samplePaths[len(samplePaths)/2]

	concentrationRisk := 0.0
	if len(medianPath.MonthlyData) > 0 {
		lastMonth := medianPath.MonthlyData[len(medianPath.MonthlyData)-1]

		// Calculate Herfindahl-Hirschman Index (HHI) for concentration
		assetClassValues := make(map[AssetClass]float64)
		totalValue := 0.0

		processHoldings := func(account *Account) {
			if account == nil || account.Holdings == nil {
				return
			}
			for _, holding := range account.Holdings {
				assetClassValues[holding.AssetClass] += holding.CurrentMarketValueTotal
				totalValue += holding.CurrentMarketValueTotal
			}
		}

		processHoldings(lastMonth.Accounts.Taxable)
		processHoldings(lastMonth.Accounts.TaxDeferred)
		processHoldings(lastMonth.Accounts.Roth)
		processHoldings(lastMonth.Accounts.FiveTwoNine)
		processHoldings(lastMonth.Accounts.HSA)

		if totalValue > 0 {
			hhi := 0.0
			for _, value := range assetClassValues {
				share := value / totalValue
				hhi += share * share
			}
			// HHI ranges from 1/n (perfect diversification) to 1.0 (complete concentration)
			// Normalize: highly diversified (HHI < 0.25) = low risk, concentrated (HHI > 0.5) = high risk
			concentrationRisk = math.Min((hhi-0.15)/0.5, 1.0)
			if concentrationRisk < 0 {
				concentrationRisk = 0
			}
		}
	}

	// Build key risk factors based on analysis
	keyRiskFactors := []RiskFactor{}

	if sequenceRisk > 0.5 {
		mitigation := "Consider a more conservative withdrawal strategy or increase emergency reserves"
		keyRiskFactors = append(keyRiskFactors, RiskFactor{
			Factor:      "High Sequence of Returns Risk",
			Impact:      "high",
			Description: "Significant variability in outcomes suggests sensitivity to market timing",
			Mitigation:  &mitigation,
		})
	}

	if concentrationRisk > 0.6 {
		mitigation := "Diversify across multiple asset classes to reduce concentration risk"
		keyRiskFactors = append(keyRiskFactors, RiskFactor{
			Factor:      "Portfolio Concentration",
			Impact:      "medium",
			Description: "Portfolio appears concentrated in fewer asset classes",
			Mitigation:  &mitigation,
		})
	}

	// Inflation risk - assess based on real vs nominal returns
	inflationRisk := 0.3 // Base assumption of moderate inflation risk

	// Longevity risk - assess based on plan duration
	longevityRisk := 0.0
	if len(medianPath.MonthlyData) > 0 {
		planYears := len(medianPath.MonthlyData) / 12
		if planYears > 40 {
			longevityRisk = 0.7 // High longevity risk for 40+ year plans
			mitigation := "Consider inflation-protected income streams and healthcare cost provisions"
			keyRiskFactors = append(keyRiskFactors, RiskFactor{
				Factor:      "Longevity Risk",
				Impact:      "high",
				Description: fmt.Sprintf("Plan spans %d years, creating significant longevity uncertainty", planYears),
				Mitigation:  &mitigation,
			})
		} else if planYears > 25 {
			longevityRisk = 0.4 // Moderate longevity risk for 25-40 year plans
		}
	}

	return &RiskAnalysis{
		SequenceOfReturnsRisk: sequenceRisk,
		InflationRisk:         inflationRisk,
		LongevityRisk:         longevityRisk,
		ConcentrationRisk:     concentrationRisk,
		KeyRiskFactors:        keyRiskFactors,
	}
}

func createEmptyPlanProjection() PlanProjection {
	return PlanProjection{
		Summary: PlanSummary{
			GoalOutcomes:   []GoalOutcome{},
			PortfolioStats: PortfolioStats{},
			PlanHealth: PlanHealth{
				OverallScore:    0,
				RiskLevel:       "high",
				ConfidenceLevel: "low",
				KeyRisks:        []string{"No successful simulation paths"},
				KeyStrengths:    []string{},
			},
		},
		Charts:   ProjectionCharts{},
		Analysis: DetailedAnalysis{},
	}
}

// generateGoalProgressCharts creates goal progress chart data for each goal
func generateGoalProgressCharts(goals []Goal, samplePaths []SimulationResult, medianPath SimulationResult, startYear int) []GoalProgressChart {
	simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating goal progress charts for %d goals", len(goals))

	charts := make([]GoalProgressChart, len(goals))

	for i, goal := range goals {
		simLogVerbose("🔧 PAYLOAD-TRANSFORMER: Generating progress chart for goal: %s", goal.Name)

		// Calculate target year and determine source account from goal configuration
		targetMonthOffset := goal.TargetMonthOffset
		targetYear := startYear + (targetMonthOffset / 12)

		// Use the goal's specified target account type for progress tracking
		sourceAccount := goal.TargetAccountType
		if sourceAccount == "" {
			// Fallback to total net worth if no specific account is configured
			sourceAccount = "total"
		}

		// Generate time series data from median path
		timeSeries := []GoalProgressTimeSeriesPoint{}

		// Group monthly data by year for the median path
		yearlyData := make(map[int][]MonthlyDataSimulation)
		for _, monthData := range medianPath.MonthlyData {
			year := startYear + (monthData.MonthOffset / 12)
			if year <= targetYear {
				yearlyData[year] = append(yearlyData[year], monthData)
			}
		}

		// Create time series points for each year
		for year := startYear; year <= targetYear; year++ {
			if months, exists := yearlyData[year]; exists && len(months) > 0 {
				// Use December data (or last available month)
				lastMonth := months[len(months)-1]

				// Get the account balance for this goal
				currentAmount := getAccountBalanceForGoal(lastMonth, sourceAccount)
				progressPercentage := 0.0
				if goal.TargetAmount > 0 {
					progressPercentage = currentAmount / goal.TargetAmount
				}

				// Determine if on track (simple linear projection)
				yearsElapsed := float64(year - startYear)
				totalYears := float64(targetYear - startYear)
				expectedProgress := 0.0
				if totalYears > 0 {
					expectedProgress = yearsElapsed / totalYears
				}

				onTrack := progressPercentage >= expectedProgress * 0.8 // 80% of expected progress

				timeSeries = append(timeSeries, GoalProgressTimeSeriesPoint{
					Year:               year,
					CurrentAmount:      currentAmount,
					TargetAmount:       goal.TargetAmount, // Add the missing field
					ProgressPercentage: progressPercentage,
					OnTrack:            onTrack,
				})
			}
		}

		// Generate projection lines
		projectionLines := generateGoalProjectionLines(goal, medianPath, targetYear, startYear)

		// Generate milestones
		milestones := generateGoalMilestones(goal, targetYear, startYear)

		charts[i] = GoalProgressChart{
			GoalID:              goal.ID,
			GoalName:            goal.Name,
			TimeSeries:          timeSeries,
			ProjectionLines:     projectionLines,
			Milestones:          milestones,
			AchievementAnalysis: generateGoalAchievementAnalysis(goal, medianPath, targetYear),
			TrendAnalysis:       generateGoalTrendAnalysis(goal, medianPath),
			Recommendations:     generateGoalRecommendations(goal, medianPath),
		}
	}

	return charts
}

// getAccountBalanceForGoal gets the balance for the account associated with a goal
func getAccountBalanceForGoal(monthData MonthlyDataSimulation, sourceAccount string) float64 {
	switch sourceAccount {
	case "cash":
		return monthData.Accounts.Cash
	case "taxable":
		return getAccountValue(monthData.Accounts.Taxable)
	case "tax_deferred":
		return getAccountValue(monthData.Accounts.TaxDeferred)
	case "roth":
		return getAccountValue(monthData.Accounts.Roth)
	default:
		// Fallback to total net worth
		return monthData.NetWorth
	}
}

// generateGoalProjectionLines creates current and required trend lines
func generateGoalProjectionLines(goal Goal, medianPath SimulationResult, targetYear int, startYear int) GoalProjectionLines {
	// Required trend - linear growth from 0 to target amount
	requiredTrend := []GoalTrendPoint{}
	totalYears := targetYear - startYear
	for year := startYear; year <= targetYear; year++ {
		var progress float64
		if totalYears > 0 {
			progress = float64(year - startYear) / float64(totalYears)
		} else {
			progress = 1.0 // If target year is same as start year, goal is at 100%
		}
		amount := progress * goal.TargetAmount
		requiredTrend = append(requiredTrend, GoalTrendPoint{
			Year:           year,
			ProjectedAmount: 0, // Not used for required trend
			RequiredAmount: amount,
		})
	}

	// Current trend - actual progress from simulation
	currentTrend := []GoalTrendPoint{}

	// Use the goal's specified target account type for progress tracking
	sourceAccount := goal.TargetAccountType
	if sourceAccount == "" {
		// Fallback to total net worth if no specific account is configured
		sourceAccount = "total"
	}

	yearlyData := make(map[int][]MonthlyDataSimulation)
	for _, monthData := range medianPath.MonthlyData {
		year := startYear + (monthData.MonthOffset / 12)
		if year <= targetYear {
			yearlyData[year] = append(yearlyData[year], monthData)
		}
	}

	for year := startYear; year <= targetYear; year++ {
		if months, exists := yearlyData[year]; exists && len(months) > 0 {
			lastMonth := months[len(months)-1]
			// Get the account balance for this goal
			amount := getAccountBalanceForGoal(lastMonth, sourceAccount)
			currentTrend = append(currentTrend, GoalTrendPoint{
				Year:           year,
				ProjectedAmount: amount,
				RequiredAmount: 0, // Not used for current trend
			})
		}
	}

	return GoalProjectionLines{
		CurrentTrend:  currentTrend,
		RequiredTrend: requiredTrend,
	}
}

// generateGoalMilestones creates key milestones for a goal
func generateGoalMilestones(goal Goal, targetYear int, startYear int) []GoalMilestone {
	milestones := []GoalMilestone{}

	// Add milestones at 25%, 50%, 75%, and 100% of target
	milestonePercentages := []float64{0.25, 0.5, 0.75, 1.0}
	milestoneDescriptions := []string{"25% Complete", "Halfway There", "75% Complete", "Goal Achieved"}

	totalYears := targetYear - startYear
	for i, percentage := range milestonePercentages {
		milestoneYear := startYear + int(float64(totalYears) * percentage)

		milestones = append(milestones, GoalMilestone{
			Year:  milestoneYear,
			Label: milestoneDescriptions[i],
			Type:  "checkpoint",
		})
	}

	return milestones
}

// min function removed - already defined in event_handler.go

// generateSpreadsheetData creates yearly data with percentiles for spreadsheet export
func generateSpreadsheetData(samplePaths []SimulationResult, input SimulationInput) SpreadsheetData {
	if len(samplePaths) == 0 {
		return SpreadsheetData{Years: []SpreadsheetYearData{}}
	}

	// Find the number of years from the first path
	firstPath := samplePaths[0]
	if len(firstPath.MonthlyData) == 0 {
		return SpreadsheetData{Years: []SpreadsheetYearData{}}
	}

	years := len(firstPath.MonthlyData) / 12
	startYear := input.StartYear
	startAge := input.InitialAge

	// Collect annual data from each path
	// Structure: pathIdx -> yearIdx -> {income, expenses, taxes, savings, netWorth}
	type yearlyMetrics struct {
		income   float64
		expenses float64
		taxes    float64
		savings  float64
		netWorth float64
	}

	allPathsData := make([][]yearlyMetrics, len(samplePaths))
	for pathIdx, path := range samplePaths {
		if len(path.MonthlyData) < years*12 {
			continue
		}

		pathYearData := make([]yearlyMetrics, years)
		for y := 0; y < years; y++ {
			var yearIncome, yearExpenses, yearTaxes, yearSavings float64

			// Sum monthly values for this year
			for m := 0; m < 12; m++ {
				monthIdx := y*12 + m
				if monthIdx >= len(path.MonthlyData) {
					break
				}
				monthData := path.MonthlyData[monthIdx]
				yearIncome += monthData.IncomeThisMonth
				yearExpenses += monthData.ExpensesThisMonth
				yearTaxes += monthData.TaxesPaidThisMonth + monthData.TaxWithheldThisMonth + monthData.CapitalGainsTaxPaidThisMonth
				yearSavings += monthData.ContributionsToInvestmentsThisMonth
			}

			// Get December net worth for year-end value
			decemberIdx := y*12 + 11
			if decemberIdx < len(path.MonthlyData) {
				pathYearData[y] = yearlyMetrics{
					income:   yearIncome,
					expenses: yearExpenses,
					taxes:    yearTaxes,
					savings:  yearSavings,
					netWorth: path.MonthlyData[decemberIdx].NetWorth,
				}
			}
		}
		allPathsData[pathIdx] = pathYearData
	}

	// Helper to compute percentile from a sorted slice
	getPercentile := func(sorted []float64, p float64) float64 {
		if len(sorted) == 0 {
			return 0
		}
		if len(sorted) == 1 {
			return sorted[0]
		}
		pos := p * float64(len(sorted)-1)
		lo := int(pos)
		hi := lo + 1
		if hi >= len(sorted) {
			hi = len(sorted) - 1
		}
		w := pos - float64(lo)
		return sorted[lo]*(1-w) + sorted[hi]*w
	}

	// Compute percentiles for each year
	spreadsheetYears := make([]SpreadsheetYearData, 0, years)
	for y := 0; y < years; y++ {
		var incomes, expenses, taxes, savings, netWorths []float64

		for _, pathData := range allPathsData {
			if pathData == nil || y >= len(pathData) {
				continue
			}
			incomes = append(incomes, pathData[y].income)
			expenses = append(expenses, pathData[y].expenses)
			taxes = append(taxes, pathData[y].taxes)
			savings = append(savings, pathData[y].savings)
			netWorths = append(netWorths, pathData[y].netWorth)
		}

		// Sort all slices for percentile calculation
		sort.Float64s(incomes)
		sort.Float64s(expenses)
		sort.Float64s(taxes)
		sort.Float64s(savings)
		sort.Float64s(netWorths)

		spreadsheetYears = append(spreadsheetYears, SpreadsheetYearData{
			Year: startYear + y,
			Age:  startAge + y,
			Income: SpreadsheetPercentiles{
				P10: getPercentile(incomes, 0.10),
				P50: getPercentile(incomes, 0.50),
				P90: getPercentile(incomes, 0.90),
			},
			Expenses: SpreadsheetPercentiles{
				P10: getPercentile(expenses, 0.10),
				P50: getPercentile(expenses, 0.50),
				P90: getPercentile(expenses, 0.90),
			},
			Taxes: SpreadsheetPercentiles{
				P10: getPercentile(taxes, 0.10),
				P50: getPercentile(taxes, 0.50),
				P90: getPercentile(taxes, 0.90),
			},
			Savings: SpreadsheetPercentiles{
				P10: getPercentile(savings, 0.10),
				P50: getPercentile(savings, 0.50),
				P90: getPercentile(savings, 0.90),
			},
			NetWorth: SpreadsheetPercentiles{
				P10: getPercentile(netWorths, 0.10),
				P50: getPercentile(netWorths, 0.50),
				P90: getPercentile(netWorths, 0.90),
			},
		})
	}

	return SpreadsheetData{Years: spreadsheetYears}
}

// aggregateNetWorthTrajectory computes net worth percentiles at yearly intervals
// across all sample paths for fan chart visualization
func aggregateNetWorthTrajectory(samplePaths []SimulationResult, input SimulationInput) []NetWorthTrajectoryPoint {
	if len(samplePaths) == 0 {
		return nil
	}

	// Find maximum months across all paths
	maxMonths := 0
	for _, path := range samplePaths {
		if len(path.MonthlyData) > maxMonths {
			maxMonths = len(path.MonthlyData)
		}
	}

	if maxMonths == 0 {
		return nil
	}

	// Local percentile helper (linear interpolation)
	getPct := func(sorted []float64, p float64) float64 {
		if len(sorted) == 0 {
			return 0
		}
		idx := p * float64(len(sorted)-1)
		lower := int(math.Floor(idx))
		upper := int(math.Ceil(idx))
		if lower == upper || upper >= len(sorted) {
			return sorted[lower]
		}
		weight := idx - float64(lower)
		return sorted[lower]*(1-weight) + sorted[upper]*weight
	}

	// Calculate number of years to aggregate
	numYears := (maxMonths + 11) / 12 // Round up to include partial years

	trajectory := make([]NetWorthTrajectoryPoint, 0, numYears)

	startYear := input.StartYear
	startAge := input.InitialAge

	// Aggregate at year-end (December) for each year
	for y := 0; y < numYears; y++ {
		// Use December of each year (month 11, 23, 35, ...)
		monthOffset := (y+1)*12 - 1 // December of year y+1 from start
		if monthOffset >= maxMonths {
			monthOffset = maxMonths - 1 // Use last available month
		}

		// Collect net worth at this month across all paths
		// Count paths that are still "solvent" (net worth > 0) at this month
		netWorths := make([]float64, 0, len(samplePaths))
		solventCount := 0
		for _, path := range samplePaths {
			if monthOffset < len(path.MonthlyData) {
				nw := path.MonthlyData[monthOffset].NetWorth
				netWorths = append(netWorths, nw)
				// Path is solvent if net worth is positive
				if nw > 0 {
					solventCount++
				}
			}
		}

		if len(netWorths) == 0 {
			continue
		}

		// Sort and calculate percentiles
		sort.Float64s(netWorths)

		// Pct paths funded = % of paths still funded (spending sustainable) at this age
		pctPathsFunded := float64(solventCount) / float64(len(samplePaths))

		point := NetWorthTrajectoryPoint{
			MonthOffset:    monthOffset,
			Year:           startYear + y + 1,
			Age:            startAge + y + 1,
			P10:            getPct(netWorths, 0.10),
			P25:            getPct(netWorths, 0.25),
			P50:            getPct(netWorths, 0.50),
			P75:            getPct(netWorths, 0.75),
			P90:            getPct(netWorths, 0.90),
			PctPathsFunded: pctPathsFunded,
		}

		trajectory = append(trajectory, point)
	}

	return trajectory
}
