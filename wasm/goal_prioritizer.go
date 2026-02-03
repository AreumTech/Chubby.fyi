package main

import (
	"fmt"
	"sort"
)

/**
 * Goal Prioritizer
 *
 * Prioritizes and optimizes goal funding when resources are constrained.
 * Ensures must-have goals are funded before nice-to-have goals.
 *
 * Goal Priority Levels:
 * - CRITICAL: Essential needs (healthcare, food, shelter)
 * - MUST_HAVE: Core retirement goals that define success
 * - IMPORTANT: Desired goals that improve quality of life
 * - NICE_TO_HAVE: Aspirational goals (luxury travel, legacy gifts)
 *
 * Goal Categories:
 * - Retirement: Basic retirement spending
 * - College: Children's/grandchildren's education
 * - Dream: Major purchases (vacation home, boat, etc.)
 * - Other: Custom goals
 *
 * Prioritization Strategy:
 * 1. Fund CRITICAL goals first (non-negotiable)
 * 2. Fund MUST_HAVE goals in order of priority
 * 3. Fund IMPORTANT goals if resources permit
 * 4. Fund NICE_TO_HAVE goals with excess funds
 * 5. Stop funding lower-priority goals if higher-priority goals at risk
 *
 * Monte Carlo Success Rate:
 * - 90%+ success: Excellent (goal likely achievable)
 * - 75-90% success: Good (goal achievable with minor adjustments)
 * - 50-75% success: Uncertain (significant risk of failure)
 * - <50% success: Poor (goal likely unachievable without major changes)
 *
 * Goal Failure Cascade:
 * - If MUST_HAVE goal fails, all lower priority goals fail
 * - Reallocate funds from failed goals to remaining goals
 * - Notify user of trade-offs and alternatives
 *
 * Planning Strategies:
 * - Fund goals in priority order
 * - Build emergency fund before funding goals
 * - Consider goal timing (near-term vs long-term)
 * - Adjust goals based on Monte Carlo results
 * - Consider partial goal achievement
 *
 * References:
 * - "Build a Robo-Advisor with Python" Chapter 3 (Goal-Based Planning)
 * - Financial Planning Association best practices
 * - CFP Board Standards of Conduct
 */

// GoalPriority represents goal priority levels
type GoalPriority int

const (
	PriorityCritical GoalPriority = iota // Healthcare, shelter, food
	PriorityMustHave                     // Core retirement goals
	PriorityImportant                    // Desired but flexible
	PriorityNiceToHave                   // Aspirational, optional
)

// GoalStatus represents current status of a goal
type GoalStatus int

const (
	GoalStatusNotStarted GoalStatus = iota
	GoalStatusOnTrack
	GoalStatusAtRisk
	GoalStatusFailed
	GoalStatusAchieved
)

// PrioritizedGoal represents a financial goal with prioritization metadata
type PrioritizedGoal struct {
	ID                string
	Name              string
	Description       string
	Priority          GoalPriority
	Category          string // "retirement", "college", "dream", "other"

	// Financial details
	TargetAmount      float64
	CurrentAmount     float64 // Already saved
	MonthlyContribution float64
	TargetDate        int    // Year to achieve goal

	// Flexibility
	IsFlexible        bool   // Can reduce target if needed
	MinimumAmount     float64 // Minimum acceptable if flexible
	MaxMonthlyContribution float64 // Budget constraint

	// Status
	Status            GoalStatus
	ProbabilityOfSuccess float64 // From Monte Carlo (0-1)
	ProjectedShortfall float64   // How much short of target
	EstimatedAchievementYear int

	// Dependencies
	DependsOnGoalIDs  []string // Must achieve these first
	BlocksGoalIDs     []string // If this fails, these cannot be funded
}

// GoalPrioritizer manages goal prioritization and funding allocation
type GoalPrioritizer struct {
	goals            []*PrioritizedGoal
	availableMonthlyFunds float64
	currentYear      int
}

// NewGoalPrioritizer creates a new goal prioritizer
func NewGoalPrioritizer(currentYear int) *GoalPrioritizer {
	return &GoalPrioritizer{
		goals:       make([]*PrioritizedGoal, 0),
		currentYear: currentYear,
	}
}

// AddGoal adds a goal to the prioritization queue
func (gp *GoalPrioritizer) AddGoal(goal *PrioritizedGoal) {
	gp.goals = append(gp.goals, goal)
}

// SetAvailableMonthlyFunds sets total monthly funds available for goals
func (gp *GoalPrioritizer) SetAvailableMonthlyFunds(amount float64) {
	gp.availableMonthlyFunds = amount
}

// PrioritizeGoals sorts goals by priority and returns funding order
func (gp *GoalPrioritizer) PrioritizeGoals() []*PrioritizedGoal {
	// Create copy to sort
	prioritized := make([]*PrioritizedGoal, len(gp.goals))
	copy(prioritized, gp.goals)

	// Sort by priority (critical first), then by target date (sooner first)
	sort.Slice(prioritized, func(i, j int) bool {
		// First sort by priority
		if prioritized[i].Priority != prioritized[j].Priority {
			return prioritized[i].Priority < prioritized[j].Priority
		}

		// Same priority: sort by target date (sooner first)
		return prioritized[i].TargetDate < prioritized[j].TargetDate
	})

	return prioritized
}

// AllocateFunds allocates available funds to goals in priority order
func (gp *GoalPrioritizer) AllocateFunds() map[string]float64 {
	allocation := make(map[string]float64)
	remainingFunds := gp.availableMonthlyFunds

	// Get prioritized goal list
	prioritized := gp.PrioritizeGoals()

	for _, goal := range prioritized {
		// Skip if goal already achieved
		if goal.Status == GoalStatusAchieved {
			continue
		}

		// Skip if goal has failed
		if goal.Status == GoalStatusFailed {
			continue
		}

		// Check dependencies - can only fund if dependencies met
		if !gp.checkDependencies(goal) {
			continue
		}

		// Calculate how much this goal needs per month
		needed := goal.MonthlyContribution

		// Cap at max if specified
		if goal.MaxMonthlyContribution > 0 && needed > goal.MaxMonthlyContribution {
			needed = goal.MaxMonthlyContribution
		}

		// Allocate up to what's available
		allocated := needed
		if allocated > remainingFunds {
			allocated = remainingFunds
		}

		allocation[goal.ID] = allocated
		remainingFunds -= allocated

		// No more funds available
		if remainingFunds <= 0 {
			break
		}
	}

	return allocation
}

// checkDependencies returns true if all dependency goals are achieved
func (gp *GoalPrioritizer) checkDependencies(goal *PrioritizedGoal) bool {
	for _, depID := range goal.DependsOnGoalIDs {
		depGoal := gp.getGoalByID(depID)
		if depGoal == nil {
			continue // Dependency not found, allow funding
		}

		if depGoal.Status != GoalStatusAchieved {
			return false // Dependency not met
		}
	}
	return true
}

// getGoalByID finds a goal by ID
func (gp *GoalPrioritizer) getGoalByID(id string) *PrioritizedGoal {
	for _, goal := range gp.goals {
		if goal.ID == id {
			return goal
		}
	}
	return nil
}

// EvaluateGoalFeasibility evaluates if goals are achievable with current funding
func (gp *GoalPrioritizer) EvaluateGoalFeasibility() map[string]string {
	recommendations := make(map[string]string)
	allocation := gp.AllocateFunds()

	for _, goal := range gp.goals {
		allocated := allocation[goal.ID]
		needed := goal.MonthlyContribution

		// Calculate months until target date
		monthsRemaining := (goal.TargetDate - gp.currentYear) * 12

		if monthsRemaining <= 0 {
			if goal.CurrentAmount < goal.TargetAmount {
				recommendations[goal.ID] = "OVERDUE: Goal date passed without achieving target"
			} else {
				recommendations[goal.ID] = "ACHIEVED: Goal reached"
			}
			continue
		}

		// Project future value with current allocation
		futureValue := goal.CurrentAmount
		for month := 0; month < monthsRemaining; month++ {
			futureValue += allocated
			futureValue *= 1.005 // Assume 6% annual return (0.5% monthly)
		}

		// Evaluate feasibility
		if futureValue >= goal.TargetAmount {
			recommendations[goal.ID] = "ON TRACK: Current funding sufficient"
		} else {
			shortfall := goal.TargetAmount - futureValue
			if allocated < needed {
				recommendations[goal.ID] = "UNDERFUNDED: Increase monthly contribution or extend timeline"
			} else if goal.IsFlexible && futureValue >= goal.MinimumAmount {
				recommendations[goal.ID] = "PARTIAL: Can achieve minimum acceptable amount"
			} else {
				recommendations[goal.ID] = "AT RISK: Shortfall projected at $" + formatFloat(shortfall)
			}
		}
	}

	return recommendations
}

// formatFloat formats a float to string with 2 decimals (helper)
func formatFloat(val float64) string {
	return fmt.Sprintf("%.2f", val)
}

// HandleGoalFailure implements failure cascade logic
func (gp *GoalPrioritizer) HandleGoalFailure(failedGoalID string) []string {
	failedGoal := gp.getGoalByID(failedGoalID)
	if failedGoal == nil {
		return []string{}
	}

	// Mark goal as failed
	failedGoal.Status = GoalStatusFailed

	// Find all goals blocked by this failure
	blockedGoals := make([]string, 0)
	for _, goal := range gp.goals {
		// Check if this goal depends on failed goal
		for _, depID := range goal.DependsOnGoalIDs {
			if depID == failedGoalID {
				goal.Status = GoalStatusFailed
				blockedGoals = append(blockedGoals, goal.ID)
			}
		}

		// Check if failed goal explicitly blocks this one
		for _, blockedID := range failedGoal.BlocksGoalIDs {
			if blockedID == goal.ID {
				goal.Status = GoalStatusFailed
				blockedGoals = append(blockedGoals, goal.ID)
			}
		}
	}

	return blockedGoals
}

// OptimizeGoalMix finds optimal combination of goals given constraints
func (gp *GoalPrioritizer) OptimizeGoalMix(maxMonthlyBudget float64) []*PrioritizedGoal {
	// Knapsack-like optimization: maximize total goal value within budget

	// Separate must-have from nice-to-have
	mustHave := make([]*PrioritizedGoal, 0)
	optional := make([]*PrioritizedGoal, 0)

	for _, goal := range gp.goals {
		if goal.Priority <= PriorityMustHave {
			mustHave = append(mustHave, goal)
		} else {
			optional = append(optional, goal)
		}
	}

	// Must fund all critical/must-have goals first
	selected := make([]*PrioritizedGoal, 0)
	budget := maxMonthlyBudget

	for _, goal := range mustHave {
		selected = append(selected, goal)
		budget -= goal.MonthlyContribution
	}

	// If budget exhausted, return must-have goals only
	if budget <= 0 {
		return selected
	}

	// Try to fit in optional goals by value/cost ratio
	// Sort optional goals by value density
	sort.Slice(optional, func(i, j int) bool {
		ratioI := optional[i].TargetAmount / optional[i].MonthlyContribution
		ratioJ := optional[j].TargetAmount / optional[j].MonthlyContribution
		return ratioI > ratioJ
	})

	for _, goal := range optional {
		if goal.MonthlyContribution <= budget {
			selected = append(selected, goal)
			budget -= goal.MonthlyContribution
		}
	}

	return selected
}

// CalculateGoalScore calculates a score for goal prioritization (0-100)
func (gp *GoalPrioritizer) CalculateGoalScore(goal *PrioritizedGoal) float64 {
	score := 0.0

	// Priority weight (50 points max)
	switch goal.Priority {
	case PriorityCritical:
		score += 50
	case PriorityMustHave:
		score += 40
	case PriorityImportant:
		score += 25
	case PriorityNiceToHave:
		score += 10
	}

	// Urgency weight (30 points max)
	yearsUntilTarget := goal.TargetDate - gp.currentYear
	if yearsUntilTarget <= 0 {
		score += 30 // Overdue, highest urgency
	} else if yearsUntilTarget <= 5 {
		score += 25
	} else if yearsUntilTarget <= 10 {
		score += 15
	} else {
		score += 5
	}

	// Success probability weight (20 points max)
	score += goal.ProbabilityOfSuccess * 20

	return score
}

// GetGoalsByPriority returns goals filtered by priority level
func (gp *GoalPrioritizer) GetGoalsByPriority(priority GoalPriority) []*PrioritizedGoal {
	filtered := make([]*PrioritizedGoal, 0)
	for _, goal := range gp.goals {
		if goal.Priority == priority {
			filtered = append(filtered, goal)
		}
	}
	return filtered
}

// GetGoalsByStatus returns goals filtered by status
func (gp *GoalPrioritizer) GetGoalsByStatus(status GoalStatus) []*PrioritizedGoal {
	filtered := make([]*PrioritizedGoal, 0)
	for _, goal := range gp.goals {
		if goal.Status == status {
			filtered = append(filtered, goal)
		}
	}
	return filtered
}

// CalculateTotalMonthlyCommitment calculates total monthly funds committed to goals
func (gp *GoalPrioritizer) CalculateTotalMonthlyCommitment() float64 {
	var total float64
	allocation := gp.AllocateFunds()
	for _, amount := range allocation {
		total += amount
	}
	return total
}

// SuggestGoalAdjustments suggests modifications to make goals more achievable
func (gp *GoalPrioritizer) SuggestGoalAdjustments() map[string]string {
	suggestions := make(map[string]string)

	for _, goal := range gp.goals {
		if goal.Status == GoalStatusAtRisk || goal.Status == GoalStatusFailed {
			// Calculate years to target
			yearsRemaining := goal.TargetDate - gp.currentYear
			if yearsRemaining <= 0 {
				suggestions[goal.ID] = "Extend target date by 3-5 years"
				continue
			}

			// Check if flexible
			if goal.IsFlexible {
				reductionPct := (goal.TargetAmount - goal.MinimumAmount) / goal.TargetAmount * 100
				suggestions[goal.ID] = fmt.Sprintf("Reduce target by %.0f%% to minimum acceptable", reductionPct)
				continue
			}

			// Calculate additional funding needed
			shortfall := goal.ProjectedShortfall
			additionalMonthly := shortfall / float64(yearsRemaining*12)
			suggestions[goal.ID] = fmt.Sprintf("Increase contribution by $%.2f/month", additionalMonthly)
		}
	}

	return suggestions
}

// ProjectGoalAchievement projects when each goal will be achieved
func (gp *GoalPrioritizer) ProjectGoalAchievement() map[string]int {
	achievements := make(map[string]int)
	allocation := gp.AllocateFunds()

	for _, goal := range gp.goals {
		currentValue := goal.CurrentAmount
		monthlyContribution := allocation[goal.ID]

		if monthlyContribution == 0 {
			achievements[goal.ID] = -1 // Never achieved with current funding
			continue
		}

		// Project with compound growth (6% annual = 0.5% monthly)
		monthlyReturn := 0.005
		monthsToGoal := 0
		maxMonths := 600 // 50 years cap

		for currentValue < goal.TargetAmount && monthsToGoal < maxMonths {
			currentValue += monthlyContribution
			currentValue *= (1 + monthlyReturn)
			monthsToGoal++
		}

		if currentValue >= goal.TargetAmount {
			achievementYear := gp.currentYear + (monthsToGoal / 12)
			achievements[goal.ID] = achievementYear
		} else {
			achievements[goal.ID] = -1 // Unachievable
		}
	}

	return achievements
}

// UpdateGoalFromMonteCarloResults updates goal status based on Monte Carlo simulation
func (gp *GoalPrioritizer) UpdateGoalFromMonteCarloResults(
	goalID string,
	successRate float64,
	avgShortfall float64,
	avgAchievementYear int,
) {
	goal := gp.getGoalByID(goalID)
	if goal == nil {
		return
	}

	goal.ProbabilityOfSuccess = successRate
	goal.ProjectedShortfall = avgShortfall
	goal.EstimatedAchievementYear = avgAchievementYear

	// Update status based on success rate
	if successRate >= 0.90 {
		goal.Status = GoalStatusOnTrack
	} else if successRate >= 0.75 {
		goal.Status = GoalStatusOnTrack // Still good
	} else if successRate >= 0.50 {
		goal.Status = GoalStatusAtRisk
	} else {
		goal.Status = GoalStatusFailed // <50% success = failed
	}
}

// GetGoalSummary returns summary statistics for all goals
func (gp *GoalPrioritizer) GetGoalSummary() map[string]interface{} {
	summary := make(map[string]interface{})

	totalGoals := len(gp.goals)
	onTrack := len(gp.GetGoalsByStatus(GoalStatusOnTrack))
	atRisk := len(gp.GetGoalsByStatus(GoalStatusAtRisk))
	failed := len(gp.GetGoalsByStatus(GoalStatusFailed))
	achieved := len(gp.GetGoalsByStatus(GoalStatusAchieved))

	summary["total_goals"] = totalGoals
	summary["on_track"] = onTrack
	summary["at_risk"] = atRisk
	summary["failed"] = failed
	summary["achieved"] = achieved

	summary["total_monthly_commitment"] = gp.CalculateTotalMonthlyCommitment()
	summary["available_monthly_funds"] = gp.availableMonthlyFunds
	summary["monthly_surplus"] = gp.availableMonthlyFunds - gp.CalculateTotalMonthlyCommitment()

	return summary
}
