package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

// BacktestCLI provides command-line interface for running backtests
type BacktestCLI struct {
	historicalDataPath string
	engine             *BacktestEngine
}

// NewBacktestCLI creates a new CLI instance
func NewBacktestCLI(historicalDataPath string) (*BacktestCLI, error) {
	// Load historical data
	data, err := ioutil.ReadFile(historicalDataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read historical data file: %v", err)
	}

	historicalData, err := LoadHistoricalData(data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse historical data: %v", err)
	}

	engine := NewBacktestEngine(historicalData)

	return &BacktestCLI{
		historicalDataPath: historicalDataPath,
		engine:             engine,
	}, nil
}

// RunAllScenarios executes all available backtesting scenarios
func (cli *BacktestCLI) RunAllScenarios() error {
	fmt.Println("🔄 Running all backtesting scenarios...")
	fmt.Println()

	scenarios := cli.engine.historicalData.Scenarios
	results := make(map[string]*BacktestResult)
	var failures []string

	for scenarioName, scenario := range scenarios {
		// Create a default simulation input for CLI testing
		// For real usage, this should come from user's actual financial plan
		testInput := cli.createDefaultTestInput(scenario)

		result, err := cli.engine.RunBacktest(scenarioName, testInput)
		if err != nil {
			failures = append(failures, fmt.Sprintf("%s: %v", scenarioName, err))
			continue
		}

		results[scenarioName] = result

		// Validate result
		err = ValidateBacktestResult(*result)
		if err != nil {
			failures = append(failures, fmt.Sprintf("%s: %v", scenarioName, err))
		} else {
		}

		// Print detailed results
		cli.printScenarioResults(*result)
		fmt.Println()
	}

	// Print summary
	cli.printSummary(results, failures)

	if len(failures) > 0 {
		return fmt.Errorf("backtesting failed with %d errors", len(failures))
	}

	return nil
}

// RunScenario executes a specific backtesting scenario
func (cli *BacktestCLI) RunScenario(scenarioName string) error {
	fmt.Printf("Running backtesting scenario: %s\n", scenarioName)
	fmt.Println()

	scenario, exists := cli.engine.historicalData.Scenarios[scenarioName]
	if !exists {
		return fmt.Errorf("scenario '%s' not found", scenarioName)
	}

	// Create a default simulation input for CLI testing
	testInput := cli.createDefaultTestInput(scenario)

	result, err := cli.engine.RunBacktest(scenarioName, testInput)
	if err != nil {
		return fmt.Errorf("backtest failed: %v", err)
	}

	// Validate result
	err = ValidateBacktestResult(*result)
	if err != nil {
		return err
	}

	cli.printScenarioResults(*result)

	return nil
}

// ListScenarios displays all available backtesting scenarios
func (cli *BacktestCLI) ListScenarios() {
	fmt.Println("📋 Available Backtesting Scenarios:")
	fmt.Println()

	scenarios := cli.engine.historicalData.Scenarios
	for name, scenario := range scenarios {
		fmt.Printf("   Scenario: %s\n", name)
		fmt.Printf("   Description: %s\n", scenario.Description)
		fmt.Printf("   Period: %s to %s\n", scenario.StartDate, scenario.EndDate)
		fmt.Printf("   Initial Investment: $%.2f\n", scenario.InitialInvestment)
		fmt.Printf("   Expected Final Value: $%.2f\n", scenario.ExpectedFinalValue)
		fmt.Printf("   Tolerance: ±%.1f%%\n", scenario.Tolerance*100)
		fmt.Println()
	}
}

// printScenarioResults prints detailed results for a scenario
func (cli *BacktestCLI) printScenarioResults(result BacktestResult) {
	fmt.Printf("Results for %s:\n", result.ScenarioName)
	fmt.Printf("   Initial Investment:    $%s\n", formatCurrency(result.InitialValue))
	fmt.Printf("   Expected Final Value:  $%s\n", formatCurrency(result.ExpectedFinalValue))
	fmt.Printf("   Actual Final Value:    $%s\n", formatCurrency(result.FinalValue))
	fmt.Printf("   Expected Annual Return: %.2f%%\n", result.ExpectedReturn*100)
	fmt.Printf("   Actual Annual Return:   %.2f%%\n", result.ActualReturn*100)
	fmt.Printf("   Percentage Difference:  %.2f%%\n", result.PercentageDiff*100)
	fmt.Printf("   Tolerance:             ±%.1f%%\n", result.Tolerance*100)
	fmt.Printf("   Within Tolerance:      %s\n", formatBool(result.WithinTolerance))
	fmt.Printf("   Years Simulated:       %d\n", result.YearsSimulated)
}

// printSummary prints a summary of all backtest results
func (cli *BacktestCLI) printSummary(results map[string]*BacktestResult, failures []string) {
	fmt.Println("=" + fmt.Sprintf("%50s", "="))

	totalScenarios := len(results) + len(failures)
	passedScenarios := len(results)

	fmt.Printf("Total Scenarios:    %d\n", totalScenarios)
	fmt.Printf("Passed:            %d\n", passedScenarios)
	fmt.Printf("Failed:            %d\n", len(failures))

	if len(results) > 0 {
		fmt.Println()
		for name, result := range results {
			status := "✅"
			if !result.WithinTolerance {
				status = "⚠️"
			}
			fmt.Printf("   %s %s (%.2f%% diff)\n", status, name, result.PercentageDiff*100)
		}
	}

	if len(failures) > 0 {
		fmt.Println()
		fmt.Println("❌ Failed scenarios:")
		for _, failure := range failures {
			fmt.Printf("   ❌ %s\n", failure)
		}
	}

	fmt.Println()
	if len(failures) == 0 {
		fmt.Println("🎉 ALL BACKTESTS PASSED! Financial simulation engine validated against historical data.")
	} else {
	}
}

// Helper functions
func formatCurrency(amount float64) string {
	return fmt.Sprintf("%.2f", amount)
}

func formatBool(b bool) string {
	if b {
		return "YES ✅"
	}
	return "NO ❌"
}

// Main function for standalone backtest execution
func runBacktestMain() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run . backtest [scenario_name|all|list]")
		fmt.Println()
		fmt.Println("Commands:")
		fmt.Println("  all                    - Run all available scenarios")
		fmt.Println("  list                   - List all available scenarios")
		fmt.Println("  <scenario_name>        - Run a specific scenario")
		os.Exit(1)
	}

	command := os.Args[1]

	// Default to looking for historical data in the project root
	historicalDataPath := filepath.Join("..", "historical_data.json")

	// Check if file exists, if not try current directory
	if _, err := os.Stat(historicalDataPath); os.IsNotExist(err) {
		historicalDataPath = "historical_data.json"
		if _, err := os.Stat(historicalDataPath); os.IsNotExist(err) {
			log.Fatalf("Historical data file not found. Please ensure historical_data.json exists.")
		}
	}

	cli, err := NewBacktestCLI(historicalDataPath)
	if err != nil {
		log.Fatalf("Failed to initialize backtest CLI: %v", err)
	}

	switch command {
	case "all":
		err = cli.RunAllScenarios()
		if err != nil {
			log.Fatalf("Backtesting failed: %v", err)
		}
	case "list":
		cli.ListScenarios()
	default:
		err = cli.RunScenario(command)
		if err != nil {
			log.Fatalf("Scenario failed: %v", err)
		}
	}
}

// JSON output for CI integration
func (cli *BacktestCLI) RunAllScenariosJSON() error {
	scenarios := cli.engine.historicalData.Scenarios
	results := make(map[string]*BacktestResult)
	var failures []string

	for scenarioName, scenario := range scenarios {
		// Create a default simulation input for CLI testing
		testInput := cli.createDefaultTestInput(scenario)

		result, err := cli.engine.RunBacktest(scenarioName, testInput)
		if err != nil {
			failures = append(failures, fmt.Sprintf("%s: %v", scenarioName, err))
			continue
		}

		results[scenarioName] = result

		// Validate result
		err = ValidateBacktestResult(*result)
		if err != nil {
			failures = append(failures, fmt.Sprintf("%s: %v", scenarioName, err))
		}
	}

	// Create JSON output
	output := map[string]interface{}{
		"totalScenarios":  len(results) + len(failures),
		"passedScenarios": len(results),
		"failedScenarios": len(failures),
		"results":         results,
		"failures":        failures,
		"overallSuccess":  len(failures) == 0,
	}

	jsonData, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON output: %v", err)
	}

	fmt.Println(string(jsonData))

	if len(failures) > 0 {
		return fmt.Errorf("backtesting failed with %d errors", len(failures))
	}

	return nil
}

// createDefaultTestInput creates a default SimulationInput for CLI backtesting
// NOTE: For production usage, this should use the user's actual financial plan
// This is a simplified version just for CLI testing purposes
func (cli *BacktestCLI) createDefaultTestInput(scenario HistoricalScenario) SimulationInput {
	// Use the deprecated createInitialAccounts for CLI testing only
	// In production, the user's real accounts should be passed in
	initialAccounts := cli.engine.createInitialAccounts(scenario)

	return SimulationInput{
		InitialAccounts: initialAccounts,
		Events:          []FinancialEvent{}, // No events for simple buy-and-hold testing
		Config:          cli.engine.simulationEngine.config,
		MonthsToRun:     0, // Will be calculated by RunBacktest
	}
}
