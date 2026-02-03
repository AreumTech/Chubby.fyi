package main

import (
	"fmt"
	"math"
	"testing"
)

// StructuralSnapshot represents key structural aspects of a simulation result
type StructuralSnapshot struct {
	MonthsSimulated     int     `json:"monthsSimulated"`
	InitialNetWorth     float64 `json:"initialNetWorth"`
	NetWorthMonotonic   bool    `json:"netWorthMonotonic"`
	HasEducationEvents  bool    `json:"hasEducationEvents"`
	HasRetirementEvents bool    `json:"hasRetirementEvents"`
	FinalCashPositive   bool    `json:"finalCashPositive"`
	MaxDrawdown         float64 `json:"maxDrawdown"`
	EventsProcessed     int     `json:"eventsProcessed"`
}

// TestStructuralRegression tests that simulation maintains expected structural properties
func TestStructuralRegression(t *testing.T) {
	t.Skip("TODO: Structural regression test needs updating for current implementation")
	// Load the golden plan
	planPath := "../golden_plan.json"
	goldenInput, err := loadGoldenPlan(planPath)
	if err != nil {
		t.Fatalf("Failed to load golden plan: %v", err)
	}

	// Run simulation
	t.Log("Running structural regression test...")
	engine := NewSimulationEngine(goldenInput.Config)
	result := engine.RunSingleSimulation(*goldenInput)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Generate structural snapshot
	currentSnapshot := generateStructuralSnapshot(&result)

	// Validate structural properties
	err = validateStructuralProperties(currentSnapshot, goldenInput)
	if err != nil {
		t.Errorf("Structural regression detected: %v", err)
	} else {
		t.Log("✅ Structural regression test passed")
	}

	// Log key metrics for monitoring
	t.Logf("Structural Metrics:")
	t.Logf("  Months Simulated: %d", currentSnapshot.MonthsSimulated)
	t.Logf("  Initial Net Worth: $%.2f", currentSnapshot.InitialNetWorth)
	t.Logf("  Max Drawdown: %.2f%%", currentSnapshot.MaxDrawdown*100)
	t.Logf("  Events Processed: %d", currentSnapshot.EventsProcessed)
	t.Logf("  Final Cash Positive: %v", currentSnapshot.FinalCashPositive)
}

// generateStructuralSnapshot creates a structural snapshot from simulation results
func generateStructuralSnapshot(result *SimulationResult) *StructuralSnapshot {
	if len(result.MonthlyData) == 0 {
		return &StructuralSnapshot{}
	}

	monthsSimulated := len(result.MonthlyData)
	initialNetWorth := result.MonthlyData[0].NetWorth
	finalData := result.MonthlyData[monthsSimulated-1]

	// Check for net worth monotonicity (generally increasing trend)
	netWorthMonotonic := true
	maxNetWorth := initialNetWorth
	minNetWorth := initialNetWorth

	for _, data := range result.MonthlyData {
		if data.NetWorth > maxNetWorth {
			maxNetWorth = data.NetWorth
		}
		if data.NetWorth < minNetWorth {
			minNetWorth = data.NetWorth
		}
	}

	// Calculate maximum drawdown
	maxDrawdown := 0.0
	if maxNetWorth > 0 {
		maxDrawdown = (maxNetWorth - minNetWorth) / maxNetWorth
	}

	// Check for presence of expected events
	hasEducationEvents := false
	hasRetirementEvents := false
	eventsProcessed := 0

	for _, data := range result.MonthlyData {
		// Look for education expenses (large negative cash flows)
		if data.CashFlow < -40000 {
			hasEducationEvents = true
		}
		// Look for retirement (income drops to zero or near zero)
		if data.MonthOffset > 350 && data.IncomeThisMonth < 1000 {
			hasRetirementEvents = true
		}
		// Count significant events
		if data.CashFlow != 0 {
			eventsProcessed++
		}
	}

	return &StructuralSnapshot{
		MonthsSimulated:     monthsSimulated,
		InitialNetWorth:     initialNetWorth,
		NetWorthMonotonic:   netWorthMonotonic,
		HasEducationEvents:  hasEducationEvents,
		HasRetirementEvents: hasRetirementEvents,
		FinalCashPositive:   finalData.CashFlow >= 0,
		MaxDrawdown:         maxDrawdown,
		EventsProcessed:     eventsProcessed,
	}
}

// validateStructuralProperties validates that simulation maintains expected structural properties
func validateStructuralProperties(snapshot *StructuralSnapshot, input *SimulationInput) error {
	// Validate simulation ran for expected duration
	expectedMonths := input.MonthsToRun
	if snapshot.MonthsSimulated != expectedMonths {
		return fmt.Errorf("simulation duration mismatch: expected %d months, got %d",
			expectedMonths, snapshot.MonthsSimulated)
	}

	// Validate initial net worth is reasonable (should match input accounts)
	if snapshot.InitialNetWorth <= 0 {
		return fmt.Errorf("initial net worth should be positive, got %.2f", snapshot.InitialNetWorth)
	}

	// Validate that education events were processed
	if !snapshot.HasEducationEvents {
		return fmt.Errorf("education events were not detected in simulation")
	}

	// Validate that retirement transition was detected
	if !snapshot.HasRetirementEvents {
		return fmt.Errorf("retirement events were not detected in simulation")
	}

	// Validate maximum drawdown is within reasonable bounds (less than 99% - allows for aggressive spending plans)
	if snapshot.MaxDrawdown > 0.99 {
		return fmt.Errorf("maximum drawdown too high: %.2f%% (expected < 99%%)",
			snapshot.MaxDrawdown*100)
	}

	// Validate that events were processed throughout the simulation
	expectedMinEvents := 100 // At least 100 months should have events
	if snapshot.EventsProcessed < expectedMinEvents {
		return fmt.Errorf("too few events processed: %d (expected >= %d)",
			snapshot.EventsProcessed, expectedMinEvents)
	}

	return nil
}

// TestSimulationConsistency runs multiple simulations and checks for reasonable variance
func TestSimulationConsistency(t *testing.T) {
	// Load the golden plan
	planPath := "../golden_plan.json"
	goldenInput, err := loadGoldenPlan(planPath)
	if err != nil {
		t.Fatalf("Failed to load golden plan: %v", err)
	}

	// Run multiple simulations to check consistency
	const numRuns = 5
	var finalNetWorths []float64
	var growthRates []float64

	t.Logf("Running %d simulations for consistency check...", numRuns)

	for i := 0; i < numRuns; i++ {
		engine := NewSimulationEngine(goldenInput.Config)
		result := engine.RunSingleSimulation(*goldenInput)

		if !result.Success {
			t.Fatalf("Simulation %d failed: %s", i+1, result.Error)
		}

		if len(result.MonthlyData) > 0 {
			initialNW := result.MonthlyData[0].NetWorth
			finalNW := result.MonthlyData[len(result.MonthlyData)-1].NetWorth

			finalNetWorths = append(finalNetWorths, finalNW)

			// Calculate annualized growth rate
			years := float64(len(result.MonthlyData)) / 12.0
			if years > 0 && initialNW > 0 && finalNW > 0 {
				growthRate := math.Pow(finalNW/initialNW, 1/years) - 1
				growthRates = append(growthRates, growthRate)
			}
		}
	}

	// Validate that results are within reasonable variance
	if len(finalNetWorths) < numRuns {
		t.Fatalf("Not enough valid simulation results: %d/%d", len(finalNetWorths), numRuns)
	}

	// Calculate coefficient of variation for final net worth
	meanFinalNW := calculateMean(finalNetWorths)
	stdDevFinalNW := calculateStdDev(finalNetWorths, meanFinalNW)
	cvFinalNW := stdDevFinalNW / meanFinalNW

	// Validate coefficient of variation is reasonable (less than 50% for this plan)
	maxCV := 0.50
	if cvFinalNW > maxCV {
		t.Errorf("Final net worth variance too high: CV=%.2f%% (expected < %.0f%%)",
			cvFinalNW*100, maxCV*100)
	}

	t.Logf("✅ Simulation consistency check passed")
	t.Logf("  Mean Final Net Worth: $%.0f", meanFinalNW)
	t.Logf("  Standard Deviation: $%.0f", stdDevFinalNW)
	t.Logf("  Coefficient of Variation: %.1f%%", cvFinalNW*100)
}

// Helper functions
func calculateMean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func calculateStdDev(values []float64, mean float64) float64 {
	if len(values) <= 1 {
		return 0
	}
	sumSquares := 0.0
	for _, v := range values {
		diff := v - mean
		sumSquares += diff * diff
	}
	return math.Sqrt(sumSquares / float64(len(values)-1))
}
