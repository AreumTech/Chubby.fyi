package engine

// TransformToUIPayload - minimal stub implementation
// Returns empty data when called by legacy/quickstart paths
// Main simulation uses RunSimulationWithUIPayload instead
func TransformToUIPayload(output *SimulationOutput, planInputs map[string]interface{}) (*SimulationPayload, error) {
	// Return empty payload - no placeholder data
	return &SimulationPayload{
		PlanInputs: PlanInputs{
			Goals:      []EnhancedGoal{},
			Events:     []TimelineEvent{},
			Strategies: []Strategy{},
			Accounts:   []AccountNew{},
		},
		PlanProjection: PlanProjection{
			Summary: PlanSummary{
				GoalOutcomes:   []GoalOutcome{},
				PortfolioStats: PortfolioStats{},
				PlanHealth: PlanHealth{
					OverallScore:    0,
					RiskLevel:       "high",
					ConfidenceLevel: "low",
					KeyRisks:        []string{"TransformToUIPayload stub - use RunSimulationWithUIPayload instead"},
					KeyStrengths:    []string{},
				},
			},
			Charts:   ProjectionCharts{},
			Analysis: DetailedAnalysis{},
		},
	}, nil
}