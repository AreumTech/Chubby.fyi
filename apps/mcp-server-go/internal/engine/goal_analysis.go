// Goal Analysis Functions - Backend goal progress analysis replacing client-side calculations

package engine

// generateGoalAchievementAnalysis analyzes goal achievement probability and timing
func generateGoalAchievementAnalysis(goal Goal, medianPath SimulationResult, targetYear int) GoalAchievementAnalysis {
	// Calculate probability of success based on final net worth vs goal amount
	probability := 0.0
	if len(medianPath.MonthlyData) > 0 {
		finalMonth := medianPath.MonthlyData[len(medianPath.MonthlyData)-1]
		if finalMonth.NetWorth >= goal.TargetAmount {
			probability = 0.85 // Simplified - in reality would analyze multiple paths
		} else {
			probability = 0.45 // Simplified calculation
		}
	}

	// Determine status
	status := "off_track"
	if probability >= 0.8 {
		status = "on_track"
	} else if probability >= 0.6 {
		status = "at_risk"
	}

	// Calculate median achievement year (simplified)
	var medianYear *int
	if probability > 0.5 {
		year := targetYear
		medianYear = &year
	}

	return GoalAchievementAnalysis{
		ProbabilityOfSuccess:  probability,
		MedianAchievementYear: medianYear,
		Status:               status,
		ConfidenceInterval: GoalConfidenceInterval{
			P10AchievementYear: medianYear, // Simplified
			P90AchievementYear: medianYear, // Simplified
		},
	}
}

// generateGoalTrendAnalysis analyzes progress trends for the goal
func generateGoalTrendAnalysis(goal Goal, medianPath SimulationResult) GoalTrendAnalysis {
	// Calculate average monthly progress (simplified)
	averageProgress := 0.0
	if len(medianPath.MonthlyData) > 12 {
		startValue := medianPath.MonthlyData[0].NetWorth
		endValue := medianPath.MonthlyData[len(medianPath.MonthlyData)-1].NetWorth
		totalMonths := float64(len(medianPath.MonthlyData))
		if totalMonths > 0 {
			averageProgress = (endValue - startValue) / totalMonths
		}
	}

	// Determine consistency (simplified)
	consistency := "good"
	if averageProgress > 0 {
		consistency = "excellent"
	} else if averageProgress < 0 {
		consistency = "poor"
	}

	return GoalTrendAnalysis{
		AverageMonthlyProgress: averageProgress,
		Consistency:           consistency,
		ProgressAcceleration:  0.0,    // Simplified
		RecentTrendDirection:  "stable", // Simplified
	}
}

// generateGoalRecommendations creates backend-generated recommendations for the goal
func generateGoalRecommendations(goal Goal, medianPath SimulationResult) []GoalRecommendation {
	var recommendations []GoalRecommendation

	// Simple recommendation based on final net worth vs goal
	if len(medianPath.MonthlyData) > 0 {
		finalMonth := medianPath.MonthlyData[len(medianPath.MonthlyData)-1]
		shortfall := goal.TargetAmount - finalMonth.NetWorth

		if shortfall > 0 {
			recommendations = append(recommendations, GoalRecommendation{
				Title:       "Increase Monthly Contributions",
				Description: "Consider increasing monthly savings to bridge the gap to your goal.",
				Priority:    "high",
				ActionType:  "increase_contributions",
			})

			if shortfall > goal.TargetAmount*0.3 { // If shortfall > 30%
				recommendations = append(recommendations, GoalRecommendation{
					Title:       "Consider Adjusting Timeline",
					Description: "Your goal may be more achievable with a longer timeframe.",
					Priority:    "medium",
					ActionType:  "extend_timeline",
				})
			}
		}
	}

	return recommendations
}