// quickstart_plan_generator.go
//
// Backend Quickstart Plan Generator
//
// This file implements complete quickstart plan generation in the WASM backend,
// replacing all client-side financial plan fabrication with authoritative
// simulation-based plan generation.
//
// ARCHITECTURAL PRINCIPLE: All financial plan creation is now centralized in the
// backend, ensuring users only see data that comes from the simulation engine.

package main

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// ========================================================================================
// QUICKSTART INPUT TYPES
// ========================================================================================

type QuickstartInputs struct {
	// Personal info
	CurrentAge    int `json:"currentAge"`
	RetirementAge int `json:"retirementAge"`

	// Income
	AnnualSalary float64 `json:"annualSalary"`
	AnnualBonus  float64 `json:"annualBonus,omitempty"`
	OtherIncome  float64 `json:"otherIncome,omitempty"`

	// Tax info
	FilingStatus string `json:"filingStatus,omitempty"`
	State        string `json:"state,omitempty"`

	// Expenses
	AnnualExpenses     float64 `json:"annualExpenses"`
	RetirementExpenses float64 `json:"retirementExpenses,omitempty"`
	HasChildren        bool    `json:"hasChildren,omitempty"`

	// Current position
	CurrentSavings float64 `json:"currentSavings,omitempty"`
	CurrentDebt    float64 `json:"currentDebt,omitempty"`

	// Goals
	CustomGoals []QuickstartGoal `json:"customGoals,omitempty"`

	// Preferences
	RiskTolerance string  `json:"riskTolerance,omitempty"`
	SavingsRate   float64 `json:"savingsRate,omitempty"`
}

type QuickstartGoal struct {
	Name         string  `json:"name"`
	TargetAmount float64 `json:"targetAmount"`
	TargetYear   int     `json:"targetYear,omitempty"`
	Priority     string  `json:"priority,omitempty"`
}

type QuickstartResult struct {
	Success            bool             `json:"success"`
	SimulationPayload  *SimulationPayload `json:"simulationPayload,omitempty"`
	Error              string           `json:"error,omitempty"`
	Recommendations    []string         `json:"recommendations,omitempty"`
	ScenarioID         string           `json:"scenarioId,omitempty"`
	PlanSummary        QuickstartSummary `json:"planSummary"`
}

type QuickstartSummary struct {
	FireTarget           float64 `json:"fireTarget"`
	YearsToFire          int     `json:"yearsToFire"`
	RequiredSavingsRate  float64 `json:"requiredSavingsRate"`
	CurrentSavingsRate   float64 `json:"currentSavingsRate"`
	IsFeasible           bool    `json:"isFeasible"`
	RecommendedActions   []string `json:"recommendedActions"`
}

// LiabilityInfo is already defined in domain_types.go

// ========================================================================================
// QUICKSTART PLAN GENERATOR - MAIN IMPLEMENTATION
// ========================================================================================

// GenerateQuickstartPlan creates complete financial plan from minimal user inputs
func GenerateQuickstartPlan(inputs QuickstartInputs) (*QuickstartResult, error) {
	simLogVerbose("🚀 Generating complete quickstart plan from user inputs")

	// Validate inputs
	if err := validateQuickstartInputs(inputs); err != nil {
		return &QuickstartResult{
			Success: false,
			Error:   fmt.Sprintf("Invalid inputs: %s", err.Error()),
		}, nil
	}

	// Calculate FIRE fundamentals
	fireAnalysis := calculateFireAnalysis(inputs)
	simLogVerbose("💰 FIRE target: $%.0f, Years to FIRE: %d", fireAnalysis.FireTarget, fireAnalysis.YearsToFire)

	// Generate comprehensive event ledger
	eventLedger, err := generateEventLedger(inputs, fireAnalysis)
	if err != nil {
		return &QuickstartResult{
			Success: false,
			Error:   fmt.Sprintf("Failed to generate event ledger: %s", err.Error()),
		}, nil
	}

	// Create initial state
	initialState := generateInitialState(inputs)

	// Generate goals from inputs
	goals := generateGoalsFromInputs(inputs, fireAnalysis)

	// Prepare simulation input
	simulationInput := SimulationInput{
		InitialAccounts:    generateInitialAccounts(initialState),
		Events:             eventLedger,
		Goals:              convertEnhancedGoalsToGoals(goals),
		Config:             generateStochasticConfig(),
		MonthsToRun:        fireAnalysis.YearsToFire * 12 + 120, // Extra years for safety
		WithdrawalStrategy: generateWithdrawalStrategy(),
		StartYear:          time.Now().Year(),
	}

	simLogVerbose("🎯 Running Monte Carlo simulation with %d events, %d goals", len(eventLedger), len(goals))

	// Run complete simulation with UI payload transformation (same path as main simulation)
	simulationPayload := RunSimulationWithUIPayload(simulationInput, 100)

	// Check if simulation succeeded by examining the payload
	if len(simulationPayload.PlanProjection.Summary.PlanHealth.KeyRisks) > 0 {
		// Check for simulation failure in key risks
		for _, risk := range simulationPayload.PlanProjection.Summary.PlanHealth.KeyRisks {
			if strings.Contains(risk, "Simulation failed") {
				return &QuickstartResult{
					Success: false,
					Error:   risk,
				}, nil
			}
		}
	}

	simLogVerbose("✅ Simulation completed successfully with full UI payload")

	// Generate recommendations based on simulation results
	recommendations := generateRecommendationsFromPayload(inputs, fireAnalysis, &simulationPayload)

	simLogVerbose("✅ Quickstart plan generation complete")

	return &QuickstartResult{
		Success:           true,
		SimulationPayload: &simulationPayload,
		ScenarioID:        generateScenarioID(),
		PlanSummary:       buildQuickstartSummary(inputs, fireAnalysis),
		Recommendations:   recommendations,
	}, nil
}

// ========================================================================================
// FIRE ANALYSIS AND CALCULATIONS
// ========================================================================================

type FireAnalysis struct {
	FireTarget          float64
	YearsToFire         int
	RequiredSavingsRate float64
	CurrentSavingsRate  float64
	IsFeasible          bool
	MonthlyContribution float64
}

func calculateFireAnalysis(inputs QuickstartInputs) FireAnalysis {
	simLogVerbose("📊 Calculating FIRE analysis")

	// Calculate expenses for retirement (default to current if not specified)
	retirementExpenses := inputs.RetirementExpenses
	if retirementExpenses == 0 {
		retirementExpenses = inputs.AnnualExpenses
	}

	// Apply 25x rule for FIRE target
	fireTarget := retirementExpenses * 25

	// Calculate total income
	totalIncome := inputs.AnnualSalary + inputs.AnnualBonus + inputs.OtherIncome

	// Current savings rate (guard against division by zero)
	var currentSavingsRate float64
	if totalIncome > 0 {
		currentSavingsRate = (totalIncome - inputs.AnnualExpenses) / totalIncome
	} else {
		currentSavingsRate = 0
	}

	// Years to retirement
	yearsToFire := inputs.RetirementAge - inputs.CurrentAge

	// Calculate required monthly savings
	currentSavings := inputs.CurrentSavings

	// Use compound growth calculation (assuming 7% annual return)
	annualReturn := 0.07
	monthlyReturn := math.Pow(1+annualReturn, 1.0/12.0) - 1 // FIXED: Proper compound conversion
	months := yearsToFire * 12

	// Future value of current savings
	futureValueOfCurrentSavings := currentSavings * math.Pow(1+annualReturn, float64(yearsToFire))

	// Required future value from monthly contributions
	requiredFromContributions := fireTarget - futureValueOfCurrentSavings

	// Calculate required monthly contribution using annuity formula
	var monthlyContribution float64
	if requiredFromContributions > 0 && months > 0 {
		// PMT = FV / [((1 + r)^n - 1) / r]
		if monthlyReturn > 0 {
			annuityFactor := (math.Pow(1+monthlyReturn, float64(months)) - 1) / monthlyReturn
			monthlyContribution = requiredFromContributions / annuityFactor
		} else {
			monthlyContribution = requiredFromContributions / float64(months)
		}
	}

	// Required savings rate (guard against division by zero)
	var requiredSavingsRate float64
	if totalIncome > 0 {
		requiredSavingsRate = (monthlyContribution * 12) / totalIncome
	} else {
		requiredSavingsRate = 0
	}

	// Feasibility check
	isFeasible := requiredSavingsRate <= 0.5 && requiredSavingsRate > 0

	return FireAnalysis{
		FireTarget:          fireTarget,
		YearsToFire:         yearsToFire,
		RequiredSavingsRate: requiredSavingsRate,
		CurrentSavingsRate:  currentSavingsRate,
		IsFeasible:          isFeasible,
		MonthlyContribution: monthlyContribution,
	}
}

// ========================================================================================
// EVENT LEDGER GENERATION
// ========================================================================================

func generateEventLedger(inputs QuickstartInputs, fireAnalysis FireAnalysis) ([]FinancialEvent, error) {
	simLogVerbose("📝 Generating complete event ledger from quickstart inputs")

	events := []FinancialEvent{}
	currentYear := time.Now().Year()

	// 1. Generate salary events
	salaryEvent := createSalaryEvent(inputs, currentYear)
	events = append(events, salaryEvent)

	// 2. Generate bonus events if applicable
	if inputs.AnnualBonus > 0 {
		bonusEvent := createBonusEvent(inputs, currentYear)
		events = append(events, bonusEvent)
	}

	// 3. Generate expense events
	expenseEvent := createExpenseEvent(inputs, currentYear)
	events = append(events, expenseEvent)

	// 4. Generate savings/contribution events
	if fireAnalysis.MonthlyContribution > 0 {
		contributionEvent := createContributionEvent(inputs, fireAnalysis, currentYear)
		events = append(events, contributionEvent)
	}

	// 5. Generate retirement events
	retirementEvent := createRetirementEvent(inputs, currentYear)
	events = append(events, retirementEvent)

	// 6. Generate custom goal events
	for _, goal := range inputs.CustomGoals {
		goalEvent := createGoalEvent(goal, currentYear)
		events = append(events, goalEvent)
	}

	simLogVerbose("📊 Generated %d events for complete financial plan", len(events))
	return events, nil
}

func createSalaryEvent(inputs QuickstartInputs, currentYear int) FinancialEvent {
	// Create comprehensive salary event with tax-deferred contributions
	return FinancialEvent{
		ID:          generateEventID("salary"),
		Type:        "INCOME", // Must match TypeScript EventType enum
		Description: fmt.Sprintf("Annual salary of $%.0f with retirement contributions", inputs.AnnualSalary),
		MonthOffset: 0, // Start immediately
		Amount:      inputs.AnnualSalary / 12, // Monthly amount
		Frequency:   "monthly",
		Metadata: map[string]interface{}{
			"name":         "Annual Salary",
			"startYear":    currentYear,
			"endYear":      currentYear + inputs.RetirementAge - inputs.CurrentAge,
			"priority":     "NORMAL",
			"targetAccountType": "tax_deferred", // 401k contributions
		},
	}
}

func createBonusEvent(inputs QuickstartInputs, currentYear int) FinancialEvent {
	return FinancialEvent{
		ID:          generateEventID("bonus"),
		Type:        "INCOME", // Must match TypeScript EventType enum (bonus is also INCOME type)
		Description: fmt.Sprintf("Annual bonus of $%.0f", inputs.AnnualBonus),
		MonthOffset: 0,
		Amount:      inputs.AnnualBonus,
		Frequency:   "annual",
		Metadata: map[string]interface{}{
			"name":      "Annual Bonus",
			"startYear": currentYear,
			"endYear":   currentYear + inputs.RetirementAge - inputs.CurrentAge,
			"priority":  "NORMAL",
		},
	}
}

func createExpenseEvent(inputs QuickstartInputs, currentYear int) FinancialEvent {
	return FinancialEvent{
		ID:          generateEventID("expenses"),
		Type:        "RECURRING_EXPENSE", // Must match TypeScript EventType enum
		Description: fmt.Sprintf("Annual living expenses of $%.0f", inputs.AnnualExpenses),
		MonthOffset: 0,
		Amount:      inputs.AnnualExpenses / 12, // Monthly amount
		Frequency:   "monthly",
		Metadata: map[string]interface{}{
			"name":             "Living Expenses",
			"startYear":        currentYear,
			"endYear":          currentYear + inputs.RetirementAge - inputs.CurrentAge,
			"priority":         "HIGH",
			"annualGrowthRate": 0.03, // 3% inflation adjustment
		},
	}
}

func createContributionEvent(inputs QuickstartInputs, fireAnalysis FireAnalysis, currentYear int) FinancialEvent {
	return FinancialEvent{
		ID:          generateEventID("401k_contribution"),
		Type:        "SCHEDULED_CONTRIBUTION", // Must match TypeScript EventType enum
		Description: fmt.Sprintf("Monthly 401(k) contributions of $%.0f", fireAnalysis.MonthlyContribution),
		MonthOffset: 0,
		Amount:      fireAnalysis.MonthlyContribution,
		Frequency:   "monthly",
		Metadata: map[string]interface{}{
			"name":                "401(k) Contributions",
			"startYear":           currentYear,
			"endYear":             currentYear + inputs.RetirementAge - inputs.CurrentAge,
			"priority":            "HIGH",
			"targetAccountType":   "tax_deferred",
		},
	}
}

func createRetirementEvent(inputs QuickstartInputs, currentYear int) FinancialEvent {
	retirementYear := currentYear + inputs.RetirementAge - inputs.CurrentAge
	retirementExpenses := inputs.RetirementExpenses
	if retirementExpenses == 0 {
		retirementExpenses = inputs.AnnualExpenses
	}

	return FinancialEvent{
		ID:          generateEventID("retirement"),
		Type:        "ONE_TIME_EVENT", // Must match TypeScript EventType enum (retirement is a life event)
		Description: fmt.Sprintf("Retirement at age %d", inputs.RetirementAge),
		MonthOffset: (inputs.RetirementAge - inputs.CurrentAge) * 12,
		Amount:      retirementExpenses / 12, // Monthly retirement expenses
		Frequency:   "monthly",
		Metadata: map[string]interface{}{
			"name":      "Retirement",
			"startYear": retirementYear,
			"endYear":   retirementYear + 40, // Plan for 40 years of retirement
			"priority":  "HIGH",
		},
	}
}

func createGoalEvent(goal QuickstartGoal, currentYear int) FinancialEvent {
	targetYear := goal.TargetYear
	if targetYear == 0 {
		targetYear = currentYear + 10 // Default 10 years if not specified
	}

	return FinancialEvent{
		ID:          generateEventID("goal_" + goal.Name),
		Type:        "GOAL_DEFINE", // Must match TypeScript EventType enum
		Description: fmt.Sprintf("Custom goal: %s ($%.0f)", goal.Name, goal.TargetAmount),
		MonthOffset: (targetYear - currentYear) * 12,
		Amount:      goal.TargetAmount,
		Frequency:   "one-time",
		Metadata: map[string]interface{}{
			"name":      goal.Name,
			"startYear": currentYear,
			"endYear":   targetYear,
			"priority":  goal.Priority,
		},
	}
}

// ========================================================================================
// INITIAL STATE AND GOALS GENERATION
// ========================================================================================

func generateInitialState(inputs QuickstartInputs) InitialStateEvent {
	return InitialStateEvent{
		ID:   "quickstart_initial_state",
		Type: "INITIAL_STATE",
		InitialAssets: map[string]interface{}{
			"cash":         inputs.CurrentSavings * 0.1, // 10% in cash
			"taxable":      inputs.CurrentSavings * 0.4, // 40% in taxable accounts
			"tax_deferred": inputs.CurrentSavings * 0.4, // 40% in 401k
			"roth":         inputs.CurrentSavings * 0.1, // 10% in Roth
		},
		InitialLiabilities: []LiabilityInfo{},
	}
}

func generateGoalsFromInputs(inputs QuickstartInputs, fireAnalysis FireAnalysis) []EnhancedGoal {
	goals := []EnhancedGoal{}

	// Primary FIRE goal
	fireGoal := EnhancedGoal{
		ID:           generateGoalID("fire_retirement"),
		Name:         "Financial Independence",
		Description:  fmt.Sprintf("Achieve FIRE target of $%.0f by age %d", fireAnalysis.FireTarget, inputs.RetirementAge),
		TargetAmount: fireAnalysis.FireTarget,
		Category:     "RETIREMENT",
		Priority:     1, // High priority (1=high, 2=medium, 3=low)
	}
	goals = append(goals, fireGoal)

	// Convert custom goals
	for _, customGoal := range inputs.CustomGoals {
		// Convert string priority to numeric priority
		priority := 2 // Default to medium priority
		switch customGoal.Priority {
		case "HIGH", "high":
			priority = 1
		case "MEDIUM", "medium":
			priority = 2
		case "LOW", "low":
			priority = 3
		}

		goal := EnhancedGoal{
			ID:           generateGoalID(customGoal.Name),
			Name:         customGoal.Name,
			TargetAmount: customGoal.TargetAmount,
			Category:     "CUSTOM",
			Priority:     priority,
		}
		goals = append(goals, goal)
	}

	return goals
}

// ========================================================================================
// RECOMMENDATIONS AND SUMMARY
// ========================================================================================

func generateRecommendationsFromPayload(inputs QuickstartInputs, fireAnalysis FireAnalysis, payload *SimulationPayload) []string {
	recommendations := []string{}

	// Check simulation results for goal success rates
	if len(payload.PlanProjection.Summary.GoalOutcomes) > 0 {
		fireGoal := payload.PlanProjection.Summary.GoalOutcomes[0]
		if fireGoal.Probability < 0.7 {
			recommendations = append(recommendations,
				fmt.Sprintf("Your FIRE plan has a %.0f%% success rate. Consider increasing savings or reducing expenses to improve your odds.", fireGoal.Probability*100))
		}
	}

	if !fireAnalysis.IsFeasible {
		recommendations = append(recommendations,
			fmt.Sprintf("Your FIRE goal requires a %.1f%% savings rate, which may be challenging. Consider extending your timeline or reducing expenses.", fireAnalysis.RequiredSavingsRate*100))
	}

	if fireAnalysis.CurrentSavingsRate < fireAnalysis.RequiredSavingsRate {
		gap := (fireAnalysis.RequiredSavingsRate - fireAnalysis.CurrentSavingsRate) * (inputs.AnnualSalary + inputs.AnnualBonus + inputs.OtherIncome)
		recommendations = append(recommendations,
			fmt.Sprintf("Increase savings by $%.0f annually to meet your FIRE goal", gap))
	}

	if inputs.CurrentSavings < inputs.AnnualExpenses*6 {
		recommendations = append(recommendations, "Build an emergency fund of 6 months expenses before aggressive FIRE investing")
	}

	// Add recommendations from simulation risks
	if len(payload.PlanProjection.Summary.PlanHealth.KeyRisks) > 0 {
		for _, risk := range payload.PlanProjection.Summary.PlanHealth.KeyRisks {
			// Skip internal error messages
			if !strings.Contains(risk, "Simulation failed") && !strings.Contains(risk, "stub") {
				recommendations = append(recommendations, risk)
			}
		}
	}

	return recommendations
}

func buildQuickstartSummary(inputs QuickstartInputs, fireAnalysis FireAnalysis) QuickstartSummary {
	return QuickstartSummary{
		FireTarget:          fireAnalysis.FireTarget,
		YearsToFire:         fireAnalysis.YearsToFire,
		RequiredSavingsRate: fireAnalysis.RequiredSavingsRate,
		CurrentSavingsRate:  fireAnalysis.CurrentSavingsRate,
		IsFeasible:          fireAnalysis.IsFeasible,
		RecommendedActions:  []string{
			fmt.Sprintf("Save $%.0f monthly for retirement", fireAnalysis.MonthlyContribution),
			"Maximize employer 401(k) match",
			"Consider Roth IRA for tax diversification",
		},
	}
}

// ========================================================================================
// VALIDATION AND UTILITIES
// ========================================================================================

func validateQuickstartInputs(inputs QuickstartInputs) error {
	if inputs.CurrentAge < 18 || inputs.CurrentAge > 100 {
		return fmt.Errorf("current age must be between 18 and 100")
	}

	if inputs.RetirementAge <= inputs.CurrentAge {
		return fmt.Errorf("retirement age must be greater than current age")
	}

	if inputs.AnnualSalary <= 0 {
		return fmt.Errorf("annual salary must be positive")
	}

	if inputs.AnnualExpenses <= 0 {
		return fmt.Errorf("annual expenses must be positive")
	}

	return nil
}

// idCounter provides deterministic ID generation for quickstart plans.
// Each call increments the counter, ensuring unique but reproducible IDs
// when the counter is reset between runs with the same seed.
var quickstartIDCounter int64 = 0

// ResetQuickstartIDCounter resets the ID counter for deterministic generation.
// Call this before generating a new quickstart plan to ensure reproducibility.
func ResetQuickstartIDCounter(seed int64) {
	quickstartIDCounter = seed
}

func generateEventID(prefix string) string {
	quickstartIDCounter++
	return fmt.Sprintf("%s_%d", prefix, quickstartIDCounter)
}

func generateGoalID(name string) string {
	quickstartIDCounter++
	return fmt.Sprintf("goal_%s_%d", name, quickstartIDCounter)
}

func generateScenarioID() string {
	quickstartIDCounter++
	return fmt.Sprintf("quickstart_%d", quickstartIDCounter)
}

// ========================================================================================
// SIMULATION INTEGRATION HELPERS
// ========================================================================================

func generateInitialAccounts(initialState InitialStateEvent) AccountHoldingsMonthEnd {
	// Convert InitialStateEvent to AccountHoldingsMonthEnd
	return AccountHoldingsMonthEnd{
		Cash:        extractFloatValue(initialState.InitialAssets, "cash"),
		Taxable:     createAccountFromValue(extractFloatValue(initialState.InitialAssets, "taxable")),
		TaxDeferred: createAccountFromValue(extractFloatValue(initialState.InitialAssets, "tax_deferred")),
		Roth:        createAccountFromValue(extractFloatValue(initialState.InitialAssets, "roth")),
		FiveTwoNine: createAccountFromValue(0.0),
		HSA:         createAccountFromValue(0.0),
		Checking:    createAccountFromValue(0.0),
		Savings:     createAccountFromValue(0.0),
	}
}

func extractFloatValue(assets map[string]interface{}, accountType string) float64 {
	if val, exists := assets[accountType]; exists {
		if floatVal, ok := val.(float64); ok {
			return floatVal
		}
	}
	return 0.0
}

func createAccountFromValue(value float64) *Account {
	return &Account{
		TotalValue: value,
		Holdings:   make([]Holding, 0),
	}
}

func convertEnhancedGoalsToGoals(enhancedGoals []EnhancedGoal) []Goal {
	goals := make([]Goal, len(enhancedGoals))
	for i, enhanced := range enhancedGoals {
		goals[i] = Goal{
			ID:                enhanced.ID,
			Name:              enhanced.Name,
			Description:       enhanced.Description,
			TargetAmount:      enhanced.TargetAmount,
			TargetMonthOffset: 0, // Will be calculated based on retirement age
			Priority:          enhanced.Priority,
			Category:          enhanced.Category,
		}
	}
	return goals
}

func convertPriorityToInt(priority string) int {
	switch priority {
	case "HIGH":
		return 1
	case "MEDIUM":
		return 2
	case "LOW":
		return 3
	default:
		return 2
	}
}

func generateStochasticConfig() StochasticModelConfig {
	// Return default stochastic model configuration
	return StochasticModelConfig{
		MeanSPYReturn:             0.07,
		MeanBondReturn:            0.03,
		MeanIntlStockReturn:       0.06,
		MeanInflation:             0.025,
		MeanHomeValueAppreciation: 0.03,
		MeanRentalIncomeGrowth:    0.025,
	}
}

func generateWithdrawalStrategy() WithdrawalSequence {
	// Return default tax-efficient withdrawal sequence
	return WithdrawalSequenceTaxEfficient
}

// ========================================================================================
// WASM EXPORT FUNCTION
// ========================================================================================

// ExportQuickstartPlanGenerator exports the quickstart functionality to JavaScript
func ExportQuickstartPlanGenerator() {
	simLogVerbose("🚀 Quickstart Plan Generator Ready")
}