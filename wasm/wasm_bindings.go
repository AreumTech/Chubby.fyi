//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"syscall/js"
	"time"
)

// WASM bindings for JavaScript interface

// runSimulation is the main WASM export for running a single simulation
func runSimulation(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🚨 WASM-BINDINGS WASM-EXECUTION-TEST: runSimulation called - THIS IS THE ACTUAL FUNCTION!")
	Debugf("WASM-BINDING DEBUG: runSimulation called\n")

	// Check if input is already a JavaScript object or a JSON string
	inputValue := inputs[0]
	var inputJSON string

	if inputValue.Type() == js.TypeString {
		// Input is already a JSON string
		inputJSON = inputValue.String()
		Debugf("WASM-BINDING DEBUG: Received JSON string, length=%d\n", len(inputJSON))
	} else if inputValue.Type() == js.TypeObject {
		// Input is a JavaScript object, convert to JSON
		Debugf("WASM-BINDING DEBUG: Received JS object, converting to JSON\n")
		inputJSON = js.Global().Get("JSON").Call("stringify", inputValue).String()
		Debugf("WASM-BINDING DEBUG: Converted to JSON, length=%d\n", len(inputJSON))
	} else {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid input type: %s", inputValue.Type().String()),
		}
	}

	Debugf("WASM-BINDING DEBUG: inputJSON preview: %.100s...\n", inputJSON)

	Debugf("WASM-BINDING DEBUG: About to parse test case JSON\n")

	// Parse test case JSON manually to handle structure mismatch
	var rawInput map[string]interface{}
	if err := json.Unmarshal([]byte(inputJSON), &rawInput); err != nil {
		Debugf("WASM-BINDING ERROR: Failed to parse raw JSON: %s\n", err.Error())
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse input JSON: " + err.Error(),
		}
	}

	Debugf("WASM-BINDING DEBUG: Raw JSON parsed successfully\n")

	// Convert test case format to WASM SimulationInput format
	input, err := convertTestCaseToSimulationInput(rawInput)
	if err != nil {
		Debugf("WASM-BINDING ERROR: Failed to convert test case format: %s\n", err.Error())
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to convert test case format: " + err.Error(),
		}
	}
	Debugf("WASM-BINDING DEBUG: JSON unmarshaled successfully\n")
	simLogVerbose("WASM-BINDING DEBUG: Input has %d events, months to run: %d", len(input.Events), input.MonthsToRun)

	// Create simulation engine - USE DEFAULT CONFIG instead of test case config to avoid JSON mismatch
	simLogVerbose("WASM-BINDING DEBUG: Using default config instead of test case config")
	config := GetDefaultStochasticConfig()

	// Override the input config to avoid unmarshaling issues
	input.Config = config
	simLogVerbose("WASM-BINDING DEBUG: Got config, about to create engine")
	engine := NewSimulationEngine(config)
	simLogVerbose("WASM-BINDING DEBUG: engine created, about to call RunSingleSimulation")

	// Run simulation
	result := engine.RunSingleSimulation(input)
	simLogVerbose("WASM-BINDING DEBUG: RunSingleSimulation completed, Success: %t", result.Success)
	if !result.Success {
		simLogVerbose("WASM-BINDING DEBUG: Simulation FAILED with error: %s", result.Error)
	}
	simLogVerbose("WASM-BINDING DEBUG: MonthlyData length: %d", len(result.MonthlyData))

	// Debug: Check if result has monthlyData and first accounts field
	if result.Success && len(result.MonthlyData) > 0 {
		firstMonth := result.MonthlyData[0]
		simLogVerbose("WASM-BINDING DEBUG: First month data - NetWorth: %f", firstMonth.NetWorth)
		simLogVerbose("WASM-BINDING DEBUG: First month accounts pointer: %p", &firstMonth.Accounts)
		simLogVerbose("WASM-BINDING DEBUG: First month taxable pointer: %p", firstMonth.Accounts.Taxable)
		if firstMonth.Accounts.Taxable != nil {
			simLogVerbose("WASM-BINDING DEBUG: Taxable TotalValue: %f", firstMonth.Accounts.Taxable.TotalValue)
		}
	}

	// Convert result to JavaScript-compatible format
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize result: " + err.Error(),
		}
	}

	// DEBUGGING: Include debug info in JSON response for JavaScript visibility
	debugInfo := map[string]interface{}{}
	if result.Success && len(result.MonthlyData) > 0 {
		firstMonth := result.MonthlyData[0]

		// Try to serialize just the accounts field separately to check if it's valid
		accountsJSON, accountsErr := json.Marshal(firstMonth.Accounts)
		if accountsErr != nil {
			debugInfo["accountsSerializationError"] = accountsErr.Error()
			debugInfo["accountsFieldValid"] = false
		} else {
			debugInfo["accountsSerializationError"] = "none"
			debugInfo["accountsFieldValid"] = true
			debugInfo["accountsJSON"] = string(accountsJSON)
		}

		// Check structure details
		debugInfo["accountsCashValue"] = firstMonth.Accounts.Cash
		debugInfo["accountsTaxableNil"] = (firstMonth.Accounts.Taxable == nil)
		debugInfo["accountsTaxDeferredNil"] = (firstMonth.Accounts.TaxDeferred == nil)
		debugInfo["accountsRothNil"] = (firstMonth.Accounts.Roth == nil)
		debugInfo["netWorth"] = firstMonth.NetWorth
		debugInfo["monthOffset"] = firstMonth.MonthOffset

		// Check if the full JSON contains accounts field
		jsonString := string(resultJSON)
		debugInfo["fullJSONContainsAccounts"] = strings.Contains(jsonString, "\"accounts\":{")
		debugInfo["fullJSONContainsAccountsAny"] = strings.Contains(jsonString, "\"accounts\"")
	}

	// Add debug info to result and re-serialize, preserving all original fields
	resultWithDebug := map[string]interface{}{
		"success":                 result.Success,
		"monthlyData":             result.MonthlyData,
		"error":                   result.Error,
		"metadata":                result.Metadata,
		"isBankrupt":              result.IsBankrupt,
		"bankruptcyMonth":         result.BankruptcyMonth,
		"bankruptcyTrigger":       result.BankruptcyTrigger,
		"maxFinancialStressLevel": result.MaxFinancialStressLevel,
		"monthsInFinancialStress": result.MonthsInFinancialStress,
		"minEmergencyFundMonths":  result.MinEmergencyFundMonths,
		"maxDebtServiceRatio":     result.MaxDebtServiceRatio,
		"debugInfo":               debugInfo,
	}

	resultJSON, err = json.Marshal(resultWithDebug)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize result with debug: " + err.Error(),
		}
	}

	// Return parsed JSON result with debug info included

	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// runMonteCarloSimulation runs multiple simulation paths
func runMonteCarloSimulation(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("WASM-BINDING DEBUG: runMonteCarloSimulation called")
	// Parse input JSON
	inputJSON := inputs[0].String()
	numberOfRuns := inputs[1].Int()
	Debugf("WASM-BINDING DEBUG: Monte Carlo runs=%d\n", numberOfRuns)

	var input SimulationInput
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse input: " + err.Error(),
		}
	}

	// Run Monte Carlo simulation
	results := RunMonteCarloSimulation(input, numberOfRuns)
	Debugf("WASM-BINDING DEBUG: Monte Carlo completed, success=%v\n", results.Success)

	// Convert results to JavaScript-compatible format
	resultJSON, err := json.Marshal(results)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize results: " + err.Error(),
		}
	}

	// NOTE: Monte Carlo returns aggregated statistics, not individual monthly data
	// The individual simulation results are handled by runSingleSimulation

	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// runSimulationWithUIPayload runs a complete simulation and returns UI-ready SimulationPayload
func runSimulationWithUIPayload(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🚨 WASM-BINDINGS UI-PAYLOAD: runSimulationWithUIPayload called - NEW UI-GROUNDED FUNCTION!")

	// Check if input is already a JavaScript object or a JSON string
	inputValue := inputs[0]
	numberOfRuns := inputs[1].Int()
	var inputJSON string

	if inputValue.Type() == js.TypeString {
		inputJSON = inputValue.String()
		simLogVerbose("WASM-BINDING UI-PAYLOAD: Received JSON string, length=%d", len(inputJSON))
	} else if inputValue.Type() == js.TypeObject {
		simLogVerbose("WASM-BINDING UI-PAYLOAD: Received JS object, converting to JSON")
		inputJSON = js.Global().Get("JSON").Call("stringify", inputValue).String()
		simLogVerbose("WASM-BINDING UI-PAYLOAD: Converted to JSON, length=%d", len(inputJSON))
	} else {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid input type: %s", inputValue.Type().String()),
		}
	}

	simLogVerbose("WASM-BINDING UI-PAYLOAD: About to parse input JSON")

    // Unmarshal directly into SimulationInput (UI sends correct shape). No legacy fallback.
    var input SimulationInput
    if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
        return map[string]interface{}{
            "success": false,
            "error":   "Failed to parse input JSON: " + err.Error(),
        }
    }

    // Always apply full defaults (GARCH, volatility, correlation, FatTailParameter, etc.)
    // then restore user-provided overrides. Previously this only applied when all three
    // means were 0, which left GARCH/volatility/correlation empty when means were overridden.
    // CRITICAL: Preserve RandomSeed, SimulationMode, CashFloor, LiteMode, and any user mean overrides.
    savedSeed := input.Config.RandomSeed
    savedMode := input.Config.SimulationMode
    savedCashFloor := input.Config.CashFloor
    savedLiteMode := input.Config.LiteMode
    savedMeanSPY := input.Config.MeanSPYReturn
    savedMeanBond := input.Config.MeanBondReturn
    savedMeanInflation := input.Config.MeanInflation
    input.Config = GetDefaultStochasticConfig()
    input.Config.RandomSeed = savedSeed
    input.Config.SimulationMode = savedMode
    input.Config.CashFloor = savedCashFloor
    input.Config.LiteMode = savedLiteMode
    // Restore user mean overrides (non-zero values override defaults)
    if savedMeanSPY != 0 { input.Config.MeanSPYReturn = savedMeanSPY }
    if savedMeanBond != 0 { input.Config.MeanBondReturn = savedMeanBond }
    if savedMeanInflation != 0 { input.Config.MeanInflation = savedMeanInflation }
    simLogVerbose("WASM-BINDING UI-PAYLOAD: Applied default config with overrides: meanSPY=%.4f, meanBond=%.4f, meanInflation=%.4f, seed=%d, mode=%s",
        input.Config.MeanSPYReturn, input.Config.MeanBondReturn, input.Config.MeanInflation, savedSeed, savedMode)

    simLogVerbose("WASM-BINDING UI-PAYLOAD: Running simulation with %d runs", numberOfRuns)

    // Run the UI-ready simulation (full path)
    payload := RunSimulationWithUIPayload(input, numberOfRuns)
    // Sanitize payload to ensure JSON encoding won't fail on NaN/Inf
    sanitizeForJSON(&payload)

    // FIX #4: Defensive check - ensure PlanProjection structure exists before marshaling
    if payload.PlanProjection.Analysis.AnnualSnapshots == nil {
        simLogVerbose("WASM-BINDING UI-PAYLOAD WARNING: PlanProjection has nil AnnualSnapshots, initializing empty map")
        payload.PlanProjection.Analysis.AnnualSnapshots = make(map[string]AnnualDeepDiveSnapshot)
    }

    // Additional defensive checks for required structures
    if payload.PlanProjection.Summary.GoalOutcomes == nil {
        payload.PlanProjection.Summary.GoalOutcomes = []GoalOutcome{}
    }
    if payload.PlanProjection.Summary.Alerts == nil {
        payload.PlanProjection.Summary.Alerts = []Alert{}
    }
    if payload.PlanInputs.Goals == nil {
        payload.PlanInputs.Goals = []EnhancedGoal{}
    }
    if payload.PlanInputs.Events == nil {
        payload.PlanInputs.Events = []TimelineEvent{}
    }

    simLogVerbose("WASM-BINDING UI-PAYLOAD: Simulation completed, serializing payload")

	// Convert payload to JavaScript-compatible format
    payloadJSON, err := json.Marshal(payload)
    if err != nil {
        simLogVerbose("WASM-BINDING UI-PAYLOAD ERROR: Failed to serialize payload: %s", err.Error())
        return map[string]interface{}{
            "success": false,
            "error":   "Failed to serialize payload: " + err.Error(),
        }
    }

	simLogVerbose("WASM-BINDING UI-PAYLOAD: Successfully generated UI payload, length=%d", len(payloadJSON))

	// Return parsed JSON result
	return js.Global().Get("JSON").Call("parse", string(payloadJSON))
}

// generateStochasticReturns generates a single period of stochastic returns
func generateStochasticReturns(this js.Value, inputs []js.Value) interface{} {
	stateJSON := inputs[0].String()
	configJSON := inputs[1].String()

	var state StochasticState
	var config StochasticModelConfig

	if err := json.Unmarshal([]byte(stateJSON), &state); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse state: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse config: " + err.Error(),
		}
	}

	returns, newState, err := GenerateAdvancedStochasticReturns(state, &config)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to generate returns: " + err.Error(),
		}
	}

	result := map[string]interface{}{
		"success":  true,
		"returns":  returns,
		"newState": newState,
	}

	resultJSON, _ := json.Marshal(result)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// calculateTax calculates comprehensive tax for given income components
func calculateTax(this js.Value, inputs []js.Value) interface{} {
	ordinaryIncome := inputs[0].Float()
	capitalGains := inputs[1].Float()
	stcg := inputs[2].Float()
	qualifiedDividends := inputs[3].Float()
	withholding := inputs[4].Float()
	estimatedPayments := inputs[5].Float()

	// Create tax calculator with default config
	taxConfig := GetDefaultTaxConfig()
	calculator := NewTaxCalculator(taxConfig, nil)

	result := calculator.CalculateComprehensiveTax(
		ordinaryIncome,
		capitalGains,
		stcg,
		qualifiedDividends,
		withholding,
		estimatedPayments,
	)

	resultJSON, err := json.Marshal(result)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize tax result: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// calculateRMD calculates required minimum distribution
func calculateRMD(this js.Value, inputs []js.Value) interface{} {
	age := inputs[0].Int()
	balance := inputs[1].Float()

	rmdAmount := CalculateRMD(age, balance)

	return map[string]interface{}{
		"rmdAmount": rmdAmount,
		"success":   true,
	}
}

// processAssetAllocation applies asset allocation strategy
func processAssetAllocation(this js.Value, inputs []js.Value) interface{} {
	accountsJSON := inputs[0].String()
	strategyJSON := inputs[1].String()
	currentMonth := inputs[2].Int()

	var accounts AccountHoldingsMonthEnd
	var strategy AssetAllocationStrategy

	if err := json.Unmarshal([]byte(accountsJSON), &accounts); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse accounts: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(strategyJSON), &strategy); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse strategy: " + err.Error(),
		}
	}

	// Create strategy processor
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	cashMgr := NewCashManager()
	processor := NewStrategyProcessor(taxCalc, cashMgr)

	err := processor.ProcessAssetAllocationStrategy(&accounts, strategy, currentMonth, 65, 67)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to process allocation: " + err.Error(),
		}
	}

	resultJSON, _ := json.Marshal(accounts)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// processTaxLossHarvesting executes tax-loss harvesting
func processTaxLossHarvesting(this js.Value, inputs []js.Value) interface{} {
	accountsJSON := inputs[0].String()
	settingsJSON := inputs[1].String()
	currentMonth := inputs[2].Int()

	var accounts AccountHoldingsMonthEnd
	var settings TaxLossHarvestingSettings

	if err := json.Unmarshal([]byte(accountsJSON), &accounts); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse accounts: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse settings: " + err.Error(),
		}
	}

	// Create strategy processor
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	cashMgr := NewCashManager()
	processor := NewStrategyProcessor(taxCalc, cashMgr)

	result, err := processor.ProcessTaxLossHarvesting(&accounts, settings, currentMonth)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to process TLH: " + err.Error(),
		}
	}

	response := map[string]interface{}{
		"success":    true,
		"saleResult": result,
		"accounts":   accounts,
	}

	resultJSON, _ := json.Marshal(response)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// processStrategicCapitalGains executes strategic capital gains realization
func processStrategicCapitalGains(this js.Value, inputs []js.Value) interface{} {
	accountsJSON := inputs[0].String()
	settingsJSON := inputs[1].String()
	taxContextJSON := inputs[2].String()
	currentMonth := inputs[3].Int()

	var accounts AccountHoldingsMonthEnd
	var settings StrategicCapitalGainsSettings
	var taxContext AdvancedTaxContext

	if err := json.Unmarshal([]byte(accountsJSON), &accounts); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse accounts: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse settings: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(taxContextJSON), &taxContext); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse tax context: " + err.Error(),
		}
	}

	// Create strategy processor
	taxConfig := GetDefaultTaxConfig()
	taxCalc := NewTaxCalculator(taxConfig, nil)
	cashMgr := NewCashManager()
	processor := NewStrategyProcessor(taxCalc, cashMgr)

	result, err := processor.ProcessStrategicCapitalGains(&accounts, settings, taxContext, currentMonth)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to process strategic gains: " + err.Error(),
		}
	}

	response := map[string]interface{}{
		"success":    true,
		"saleResult": result,
		"accounts":   accounts,
	}

	resultJSON, _ := json.Marshal(response)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// validateStochasticConfigJS validates stochastic model configuration
func validateStochasticConfigJS(this js.Value, inputs []js.Value) interface{} {
	configJSON := inputs[0].String()

	var config StochasticModelConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse config: " + err.Error(),
		}
	}

	if err := validateStochasticConfig(&config); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Invalid configuration: " + err.Error(),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Configuration is valid",
	}
}

// initializeStochasticState creates initial stochastic state
func initializeStochasticState(this js.Value, inputs []js.Value) interface{} {
	configJSON := inputs[0].String()

	var config StochasticModelConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse config: " + err.Error(),
		}
	}

	state := InitializeStochasticState(config)

	stateJSON, err := json.Marshal(state)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize state: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(stateJSON))
}

// getDefaultStochasticConfig returns default stochastic model configuration
func getDefaultStochasticConfig(this js.Value, inputs []js.Value) interface{} {
	config := GetDefaultStochasticConfig()

	configJSON, err := json.Marshal(config)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize config: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(configJSON))
}

// getDefaultTaxConfig returns default tax configuration
func getDefaultTaxConfig(this js.Value, inputs []js.Value) interface{} {
	config := GetDefaultTaxConfig()

	configJSON, err := json.Marshal(config)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize config: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(configJSON))
}

// transformToUIPayload converts raw simulation output to complete UI contract
func transformToUIPayload(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("WASM-BINDING DEBUG: transformToUIPayload called")

	// Parse input JSON
	outputJSON := inputs[0].String()
	planInputsJSON := inputs[1].String()

	var output SimulationOutput
	var planInputs map[string]interface{}

	if err := json.Unmarshal([]byte(outputJSON), &output); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse simulation output: " + err.Error(),
		}
	}

	if err := json.Unmarshal([]byte(planInputsJSON), &planInputs); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse plan inputs: " + err.Error(),
		}
	}

	// Transform to UI payload
	payload, err := TransformToUIPayload(&output, planInputs)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to transform payload: " + err.Error(),
		}
	}

	// Convert result to JavaScript-compatible format
	resultJSON, err := json.Marshal(payload)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize payload: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// generateQuickstartPlan creates a complete financial plan from quickstart inputs
func generateQuickstartPlan(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("WASM-BINDING DEBUG: generateQuickstartPlan called")

	// Parse input JSON
	inputJSON := inputs[0].String()

	var quickstartInputs QuickstartInputs
	if err := json.Unmarshal([]byte(inputJSON), &quickstartInputs); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse quickstart inputs: " + err.Error(),
		}
	}

	// Generate plan
	result, err := GenerateQuickstartPlan(quickstartInputs)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to generate quickstart plan: " + err.Error(),
		}
	}

	// Convert result to JavaScript-compatible format
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to serialize result: " + err.Error(),
		}
	}

	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// runBacktest executes historical backtesting scenarios
func runBacktest(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🔬 BACKTEST: runBacktest called")

	// Parse input JSON
	inputJSON := inputs[0].String()

	var backtestInput map[string]interface{}
	if err := json.Unmarshal([]byte(inputJSON), &backtestInput); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "Failed to parse backtest input: " + err.Error(),
		}
	}

	scenarioName, ok := backtestInput["scenarioName"].(string)
	if !ok {
		return map[string]interface{}{
			"success": false,
			"error":   "Missing or invalid scenarioName in input",
		}
	}

	simLogVerbose("🔬 BACKTEST: Running scenario '%s'", scenarioName)

	// TODO: Restore historical data functionality after fixing data loading
	// SIMPLIFIED: Access scenario directly from unified historical data structure
	// if historicalData == nil {
	// 	return map[string]interface{}{
	// 		"success": false,
	// 		"error":   "Historical data not loaded - run InitializeFinancialData first",
	// 	}
	// }

	return map[string]interface{}{
		"success": false,
		"error":   "Historical backtesting temporarily disabled - focus on quickstart integration",
	}

	// TODO: Restore the full backtest functionality after fixing historicalData loading
	// The original implementation relied on historicalData global variable
}

// convertMonthlyScenarioToHistorical function removed - converting monthly to annual data
// defeats the purpose of preserving sequence-of-returns risk and creates dangerous smoothing

// registerWASMFunctions registers all WASM functions with JavaScript
func registerWASMFunctions() {
    // Core entry points
    registerJSFunc("goRunSimulation", runSimulation)
    registerJSFunc("goRunSingleSimulation", runSimulation) // Alias for worker compatibility
    registerJSFunc("runSingleSimulation", runSimulation)   // Direct export for worker
    registerJSFunc("goRunMonteCarloSimulation", runMonteCarloSimulation)
    registerJSFunc("runMonteCarloSimulation", runMonteCarloSimulation) // Direct export for worker

    // Generators and calculators
    registerJSFunc("goGenerateStochasticReturns", generateStochasticReturns)
    registerJSFunc("goCalculateTax", calculateTax)
    registerJSFunc("goCalculateRMD", calculateRMD)
    registerJSFunc("goProcessAssetAllocation", processAssetAllocation)
    registerJSFunc("goProcessTaxLossHarvesting", processTaxLossHarvesting)
    registerJSFunc("goProcessStrategicCapitalGains", processStrategicCapitalGains)
    registerJSFunc("goValidateStochasticConfig", validateStochasticConfigJS)
    registerJSFunc("goInitializeStochasticState", initializeStochasticState)
    registerJSFunc("goGetDefaultStochasticConfig", getDefaultStochasticConfig)
    registerJSFunc("goGetDefaultTaxConfig", getDefaultTaxConfig)
    registerJSFunc("runBacktest", runBacktest) // Export for historical backtesting

    // UI payload + helpers
    registerJSFunc("goTransformToUIPayload", transformToUIPayload)
    registerJSFunc("goGenerateQuickstartPlan", generateQuickstartPlan)
    registerJSFunc("goRunSimulationWithUIPayload", runSimulationWithUIPayload) // Main UI-grounded function
    registerJSFunc("runSimulationWithUIPayload", runSimulationWithUIPayload)   // Direct export for worker

    // Phase 3: Financial calculation functions
    registerJSFunc("goCalculateGoalFormSuggestions", calculateGoalFormSuggestions)
    registerJSFunc("goCalculateQuickstartGoalAnalysis", calculateQuickstartGoalAnalysis)
    registerJSFunc("goPreviewFireTarget", previewFireTarget)
}

// Phase 3: Financial calculation functions implementation

// calculateGoalFormSuggestions calculates monthly contribution needed for a goal
func calculateGoalFormSuggestions(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🔧 WASM-FINANCIAL: calculateGoalFormSuggestions called")

	if len(inputs) < 1 {
		return js.Global().Get("JSON").Call("parse", `{"success": false, "error": "Missing input parameters"}`)
	}

	// Parse input JSON
	inputJSON := inputs[0].String()
	var inputData map[string]interface{}
	if err := json.Unmarshal([]byte(inputJSON), &inputData); err != nil {
		return js.Global().Get("JSON").Call("parse", fmt.Sprintf(`{"success": false, "error": "Failed to parse input: %s"}`, err.Error()))
	}

	// Extract parameters
	targetAmount, _ := inputData["targetAmount"].(float64)
	targetDate, _ := inputData["targetDate"].(string)
	accountType, _ := inputData["accountType"].(string)
	annualExpenses, _ := inputData["annualExpenses"].(float64)
	currentBalance := 0.0

	// Get current balance from accounts array
	if accounts, ok := inputData["currentAccounts"].([]interface{}); ok {
		for _, acc := range accounts {
			if accMap, ok := acc.(map[string]interface{}); ok {
				if accType, _ := accMap["type"].(string); accType == accountType {
					currentBalance, _ = accMap["balance"].(float64)
					break
				}
			}
		}
	}

	// Calculate months remaining
	targetDateObj, err := parseDate(targetDate)
	if err != nil {
		result := map[string]interface{}{
			"success": false,
			"error": "Invalid target date format",
		}
		resultJSON, _ := json.Marshal(result)
		return js.Global().Get("JSON").Call("parse", string(resultJSON))
	}

	monthsRemaining := calculateMonthsRemaining(targetDateObj)
	if monthsRemaining <= 0 {
		result := map[string]interface{}{
			"success": false,
			"error": "Target date must be in the future",
		}
		resultJSON, _ := json.Marshal(result)
		return js.Global().Get("JSON").Call("parse", string(resultJSON))
	}

	// Calculate monthly contribution using compound interest
	monthlyContribution := 0.0
	if targetAmount > currentBalance && monthsRemaining > 0 {
		remainingAmount := targetAmount - currentBalance
		// Use 6% annual return (0.5% monthly)
		monthlyGrowthRate := 0.005

		// Future value of ordinary annuity formula
		if monthlyGrowthRate > 0 {
			// PMT = FV / (((1 + r)^n - 1) / r)
			annuityFactor := (math.Pow(1+monthlyGrowthRate, float64(monthsRemaining)) - 1) / monthlyGrowthRate
			monthlyContribution = remainingAmount / annuityFactor
		} else {
			monthlyContribution = remainingAmount / float64(monthsRemaining)
		}
	}

	// Emergency fund suggestion
	var emergencyFundSuggestion *float64
	if annualExpenses > 0 && accountType == "cash" {
		suggestion := annualExpenses * 0.5 // 6 months of expenses
		emergencyFundSuggestion = &suggestion
	}

	// Achievability check (less than 50% of estimated income)
	estimatedAnnualIncome := annualExpenses / 0.7 // Assume expenses are 70% of income
	maxMonthlyContribution := estimatedAnnualIncome * 0.5 / 12
	isAchievable := monthlyContribution <= maxMonthlyContribution

	// Timeline warning
	var timelineWarning *string
	if monthsRemaining < 12 {
		warning := "Timeline may be too aggressive for significant savings goals"
		timelineWarning = &warning
	}

	result := map[string]interface{}{
		"success": true,
		"monthlyContributionNeeded": math.Max(0, monthlyContribution),
		"isAchievable": isAchievable,
	}

	if emergencyFundSuggestion != nil {
		result["emergencyFundSuggestion"] = *emergencyFundSuggestion
	}

	if timelineWarning != nil {
		result["timelineWarning"] = *timelineWarning
	}

	resultJSON, _ := json.Marshal(result)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// calculateQuickstartGoalAnalysis analyzes quickstart FIRE goals
func calculateQuickstartGoalAnalysis(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🔧 WASM-FINANCIAL: calculateQuickstartGoalAnalysis called")

	if len(inputs) < 1 {
		return js.Global().Get("JSON").Call("parse", `{"success": false, "error": "Missing input parameters"}`)
	}

	// Parse input JSON
	inputJSON := inputs[0].String()
	var inputData map[string]interface{}
	if err := json.Unmarshal([]byte(inputJSON), &inputData); err != nil {
		return js.Global().Get("JSON").Call("parse", fmt.Sprintf(`{"success": false, "error": "Failed to parse input: %s"}`, err.Error()))
	}

	// Extract quickstart inputs
	currentAge, _ := inputData["currentAge"].(float64)
	retirementAge, _ := inputData["retirementAge"].(float64)
	annualExpenses, _ := inputData["annualExpenses"].(float64)
	retirementExpenses, _ := inputData["retirementExpenses"].(float64)
	currentSavings, _ := inputData["currentSavings"].(float64)

	if retirementExpenses == 0 {
		retirementExpenses = annualExpenses
	}

	// Calculate years to retirement
	yearsToRetirement := retirementAge - currentAge

	// Calculate FIRE target using 25x rule
	fireTarget := retirementExpenses * 25

	// Calculate savings needed
	savingsNeeded := math.Max(0, fireTarget - currentSavings)

	result := map[string]interface{}{
		"success": true,
		"yearsToRetirement": yearsToRetirement,
		"fireTarget": fireTarget,
		"savingsNeeded": savingsNeeded,
		"isPreview": true, // Always mark as preview
	}

	resultJSON, _ := json.Marshal(result)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// previewFireTarget calculates FIRE target using 25x rule
func previewFireTarget(this js.Value, inputs []js.Value) interface{} {
	simLogVerbose("🔧 WASM-FINANCIAL: previewFireTarget called")

	if len(inputs) < 1 {
		return js.Global().Get("JSON").Call("parse", `{"success": false, "error": "Missing input parameters"}`)
	}

	// Parse input JSON
	inputJSON := inputs[0].String()
	var inputData map[string]interface{}
	if err := json.Unmarshal([]byte(inputJSON), &inputData); err != nil {
		return js.Global().Get("JSON").Call("parse", fmt.Sprintf(`{"success": false, "error": "Failed to parse input: %s"}`, err.Error()))
	}

	annualExpenses, _ := inputData["annualExpenses"].(float64)
	retirementExpenses, _ := inputData["retirementExpenses"].(float64)

	// Use retirement expenses if provided, otherwise use annual expenses
	expenses := retirementExpenses
	if expenses == 0 {
		expenses = annualExpenses
	}

	// Calculate FIRE target using 25x rule
	target := expenses * 25

	result := map[string]interface{}{
		"success": true,
		"target": target,
		"isPreview": true, // Always mark as preview
	}

	resultJSON, _ := json.Marshal(result)
	return js.Global().Get("JSON").Call("parse", string(resultJSON))
}

// Helper functions for financial calculations

// parseDate parses date string in various formats
func parseDate(dateStr string) (time.Time, error) {
	layouts := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
		"01/02/2006",
		"1/2/2006",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

// calculateMonthsRemaining calculates months from now to target date
func calculateMonthsRemaining(targetDate time.Time) int {
	now := time.Now()
	years := targetDate.Year() - now.Year()
	months := int(targetDate.Month()) - int(now.Month())

	totalMonths := years*12 + months

	// Add adjustment for partial months
	if targetDate.Day() < now.Day() {
		totalMonths--
	}

	return totalMonths
}

// convertTestCaseToSimulationInput converts test case JSON format to WASM SimulationInput format
func convertTestCaseToSimulationInput(rawInput map[string]interface{}) (SimulationInput, error) {
	simLogVerbose("WASM-BINDING DEBUG: Converting test case format to SimulationInput")

	// Handle both wrapped and direct simulationInput formats
	var simulationInputRaw map[string]interface{}

	// Check if this is already the simulationInput data (has initialAccounts, events, etc.)
	if _, hasInitialAccounts := rawInput["initialAccounts"]; hasInitialAccounts {
		// Direct simulationInput format
		simulationInputRaw = rawInput
		simLogVerbose("WASM-BINDING DEBUG: Using direct simulationInput format")
	} else if wrappedInput, ok := rawInput["simulationInput"].(map[string]interface{}); ok {
		// Wrapped format with simulationInput field
		simulationInputRaw = wrappedInput
		simLogVerbose("WASM-BINDING DEBUG: Using wrapped simulationInput format")
	} else {
		return SimulationInput{}, fmt.Errorf("missing or invalid simulationInput data - expected initialAccounts field or simulationInput wrapper")
	}

	var input SimulationInput

	// Parse monthsToRun
	if monthsToRunRaw, ok := simulationInputRaw["monthsToRun"]; ok {
		if monthsToRunFloat, ok := monthsToRunRaw.(float64); ok {
			input.MonthsToRun = int(monthsToRunFloat)
		} else {
			input.MonthsToRun = 12 // default
		}
	} else {
		input.MonthsToRun = 12 // default
	}

	// Parse initialAccounts
	if initialAccountsRaw, ok := simulationInputRaw["initialAccounts"].(map[string]interface{}); ok {
		input.InitialAccounts = convertInitialAccounts(initialAccountsRaw)
	} else {
		return SimulationInput{}, fmt.Errorf("missing initialAccounts field")
	}

	// Parse events
	if eventsRaw, ok := simulationInputRaw["events"].([]interface{}); ok {
		events, err := convertEvents(eventsRaw)
		if err != nil {
			return SimulationInput{}, fmt.Errorf("failed to parse events: %v", err)
		}
		input.Events = events
	} else {
		input.Events = make([]FinancialEvent, 0) // empty events
	}

	// Use default config instead of parsing incompatible test case config
	input.Config = GetDefaultStochasticConfig()

	// Set withdrawal strategy - accepts plain string from MCP adapter
	// Available strategies: TAX_EFFICIENT, PROPORTIONAL, ROTH_FIRST, TAX_DEFERRED_FIRST, CASH_FIRST
	if strategy, ok := simulationInputRaw["withdrawalStrategy"].(string); ok {
		switch strategy {
		case "TAX_EFFICIENT":
			// Cash → Taxable → Tax-deferred → Roth (minimizes lifetime taxes)
			input.WithdrawalStrategy = WithdrawalSequenceTaxEfficient
		case "PROPORTIONAL":
			// Proportional from all accounts (maintains allocation)
			input.WithdrawalStrategy = WithdrawalSequenceProportional
		case "CASH_FIRST":
			// Cash first, then proportional from investment accounts
			input.WithdrawalStrategy = WithdrawalSequenceCashFirst
		case "ROTH_FIRST":
			// Roth → Taxable → Tax-deferred → Cash
			input.WithdrawalStrategy = WithdrawalSequenceRothFirst
		case "TAX_DEFERRED_FIRST":
			// Cash → Tax-deferred → Taxable → Roth (preserves Roth for last)
			input.WithdrawalStrategy = WithdrawalSequenceTaxDeferredFirst
		case "TAX_DEFERRED":
			// Tax bracket aware withdrawals
			input.WithdrawalStrategy = WithdrawalSequenceTaxDeferred
		default:
			simLogVerbose("Unknown withdrawal strategy '%s', defaulting to TAX_EFFICIENT", strategy)
			input.WithdrawalStrategy = WithdrawalSequenceTaxEfficient
		}
		simLogVerbose("Withdrawal strategy set to: %s", input.WithdrawalStrategy)
	} else {
		// Default to tax efficient if not specified
		input.WithdrawalStrategy = WithdrawalSequenceTaxEfficient
	}

	// Empty goals for now
	input.Goals = make([]Goal, 0)

	simLogVerbose("WASM-BINDING DEBUG: Conversion complete - %d events, %d months", len(input.Events), input.MonthsToRun)
	return input, nil
}

// Helper function to get keys from map
func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	return keys
}

// convertInitialAccounts converts test case account format to WASM format
func convertInitialAccounts(accountsRaw map[string]interface{}) AccountHoldingsMonthEnd {
	// DEBUG: Print what we're receiving from JavaScript
	simLogVerbose("🔍 [convertInitialAccounts] Raw input keys: %v", getKeys(accountsRaw))
	for key, value := range accountsRaw {
		simLogVerbose("🔍 [convertInitialAccounts] %s: %v (type: %T)", key, value, value)
	}

	accounts := AccountHoldingsMonthEnd{
		// Initialize all account pointers to avoid nil pointer issues
		Taxable:     &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		TaxDeferred: &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		Roth:        &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		FiveTwoNine: &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		HSA:         &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		Checking:    &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		Savings:     &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
		Cash:        0,
	}

	// Parse simple numeric values from test cases
	if cashRaw, ok := accountsRaw["cash"]; ok {
		if cashFloat, ok := cashRaw.(float64); ok {
			accounts.Cash = cashFloat
		}
	}

	// Handle taxable account (can be number or object with holdings)
	if taxableRaw, ok := accountsRaw["taxable"]; ok {
		if taxableFloat, ok := taxableRaw.(float64); ok {
			accounts.Taxable.TotalValue = taxableFloat
			simLogVerbose("📊 TAXABLE-NUMERIC: Set totalValue=$%.2f", taxableFloat)
		} else if taxableMap, ok := taxableRaw.(map[string]interface{}); ok {
			simLogVerbose("📊 TAXABLE-MAP: Parsing complex account object")
			accounts.Taxable = parseAccountFromMap(taxableMap)
			simLogVerbose("📊 TAXABLE-RESULT: TotalValue=$%.2f, Holdings count=%d", accounts.Taxable.TotalValue, len(accounts.Taxable.Holdings))
		}
	}

	// Handle tax-deferred account
	if taxDeferredRaw, ok := accountsRaw["tax_deferred"]; ok {
		if taxDeferredFloat, ok := taxDeferredRaw.(float64); ok {
			accounts.TaxDeferred.TotalValue = taxDeferredFloat
		} else if taxDeferredMap, ok := taxDeferredRaw.(map[string]interface{}); ok {
			accounts.TaxDeferred = parseAccountFromMap(taxDeferredMap)
		}
	}

	// Handle Roth account
	if rothRaw, ok := accountsRaw["roth"]; ok {
		if rothFloat, ok := rothRaw.(float64); ok {
			accounts.Roth.TotalValue = rothFloat
		} else if rothMap, ok := rothRaw.(map[string]interface{}); ok {
			accounts.Roth = parseAccountFromMap(rothMap)
		}
	}

	if fiveTwoNineRaw, ok := accountsRaw["529"]; ok {
		if fiveTwoNineFloat, ok := fiveTwoNineRaw.(float64); ok {
			accounts.FiveTwoNine.TotalValue = fiveTwoNineFloat
		}
	}

    // Gate verbose logs behind debug logger to avoid heavy syscall/js printing in WASM
    simLogVerbose("📊 FINAL-ACCOUNTS: Cash=$%.2f, Taxable=$%.2f, TaxDeferred=$%.2f, Roth=$%.2f",
        accounts.Cash, accounts.Taxable.TotalValue, accounts.TaxDeferred.TotalValue, accounts.Roth.TotalValue)

	// CRITICAL: Perform comprehensive validation of converted accounts
	// This validates share-based accounting, prevents legacy holdings, and ensures data integrity
    validator := NewCircuitBreakerValidator()
    if err := validator.ValidateAccountsIntegrity(&accounts, 0, 1); err != nil {
        simLogVerbose("CRITICAL: convertInitialAccounts validation failed: %v", err)
        // Return empty accounts rather than corrupted data
        return AccountHoldingsMonthEnd{
            Taxable:     &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
            TaxDeferred: &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
            Roth:        &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
			FiveTwoNine: &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
			HSA:         &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
			Checking:    &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
			Savings:     &Account{TotalValue: 0, Holdings: make([]Holding, 0)},
			Cash:        0,
		}
	}

	return accounts
}

// parseAccountFromMap parses an account object that has holdings
func parseAccountFromMap(accountMap map[string]interface{}) *Account {
	account := &Account{
		TotalValue: 0,
		Holdings:   make([]Holding, 0),
	}

	// Parse totalValue if present
	if totalValue, ok := accountMap["totalValue"].(float64); ok {
		account.TotalValue = totalValue
	}

	// Parse holdings if present
	if holdingsRaw, ok := accountMap["holdings"].([]interface{}); ok {
		for _, holdingRaw := range holdingsRaw {
			if holdingMap, ok := holdingRaw.(map[string]interface{}); ok {
				holding := Holding{}

				// Parse holding fields
				if assetClass, ok := holdingMap["assetClass"].(string); ok {
					holding.AssetClass = NormalizeAssetClass(AssetClass(assetClass))
				}
				if quantity, ok := holdingMap["quantity"].(float64); ok {
					holding.Quantity = quantity
				}
				if costBasisPerUnit, ok := holdingMap["costBasisPerUnit"].(float64); ok {
					holding.CostBasisPerUnit = costBasisPerUnit
				}
				if costBasisTotal, ok := holdingMap["costBasisTotal"].(float64); ok {
					holding.CostBasisTotal = costBasisTotal
				}
				if currentMarketPricePerUnit, ok := holdingMap["currentMarketPricePerUnit"].(float64); ok {
					holding.CurrentMarketPricePerUnit = currentMarketPricePerUnit
				}
				if currentMarketValueTotal, ok := holdingMap["currentMarketValueTotal"].(float64); ok {
					holding.CurrentMarketValueTotal = currentMarketValueTotal
				}
				// Use configurable default acquisition date instead of hardcoded -12
				defaultAcquisitionDate := GetDefaultBacktestAcquisitionDate()
				purchaseMonth := defaultAcquisitionDate
				if pm, ok := holdingMap["purchaseMonth"].(float64); ok {
					purchaseMonth = int(pm)
				}
				// Store purchase month for lot creation (legacy compatibility)

				// CRITICAL FIX: Create a TaxLot from the holding data
				// The simulation's OptimizeLotStructure function calls updateHoldingTotals
				// which recalculates everything from Lots. Without Lots, holdings get zeroed out!
                if holding.Quantity > 0 {
                    lot := TaxLot{
                        AcquisitionDate:  purchaseMonth,
                        Quantity:         holding.Quantity,
                        CostBasisPerUnit: holding.CostBasisPerUnit,
                        CostBasisTotal:   holding.CostBasisTotal,
                        IsLongTerm:       purchaseMonth <= -13, // Long-term if held > 1 year (using -13 to ensure > 12 months)
                    }
                    holding.Lots = []TaxLot{lot}
                    simLogVerbose("📊 CREATED-LOT: AssetClass=%s, Quantity=%.2f, CostBasis=$%.2f, AcquisitionDate=%d",
                        holding.AssetClass, lot.Quantity, lot.CostBasisTotal, purchaseMonth)
                }

				// CRITICAL: Validate share-based accounting at input boundary
				// This prevents legacy dollar-based holdings from entering the system
                if isLegacyHolding(&holding) {
                    // CRITICAL: This parsing path must enforce the same validation as main.go
                    simLogVerbose("CRITICAL: Legacy dollar-based holding detected in parseAccountFromMap for asset class '%s' (quantity=%.1f, costBasisPerUnit=$%.2f). Engine requires share-based accounting with realistic share quantities. Please convert holdings to share-based format with proper quantity of shares and cost basis per share",
                        holding.AssetClass, holding.Quantity, holding.CostBasisPerUnit)
                    // Continue processing but log the critical error - this ensures the system fails safely
                    continue
                }

				account.Holdings = append(account.Holdings, holding)
			}
		}
	}

	// If totalValue is 0 but we have holdings, calculate it from holdings
	if account.TotalValue == 0 && len(account.Holdings) > 0 {
		calculatedTotal := 0.0
		for _, holding := range account.Holdings {
			calculatedTotal += holding.CurrentMarketValueTotal
		}
		account.TotalValue = calculatedTotal
		simLogVerbose("📊 CALCULATED-TOTAL-VALUE: Account had totalValue=0, calculated $%.2f from %d holdings", calculatedTotal, len(account.Holdings))
	}

	return account
}

// convertEvents converts test case events format to WASM format
func convertEvents(eventsRaw []interface{}) ([]FinancialEvent, error) {
	events := make([]FinancialEvent, 0, len(eventsRaw))

	for i, eventRaw := range eventsRaw {
		eventMap, ok := eventRaw.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("event %d is not a valid object", i)
		}

		event := FinancialEvent{}

		// Parse required fields
		if id, ok := eventMap["id"].(string); ok {
			event.ID = id
		} else {
			event.ID = fmt.Sprintf("event_%d", i)
		}

		if eventType, ok := eventMap["type"].(string); ok {
			event.Type = eventType
		} else {
			return nil, fmt.Errorf("event %d missing type field", i)
		}

		switch monthOffsetVal := eventMap["monthOffset"].(type) {
		case float64:
			event.MonthOffset = int(monthOffsetVal)
		case int:
			event.MonthOffset = monthOffsetVal
		case int32:
			event.MonthOffset = int(monthOffsetVal)
		case int64:
			event.MonthOffset = int(monthOffsetVal)
		default:
			event.MonthOffset = 0
		}

		switch amountVal := eventMap["amount"].(type) {
		case float64:
			event.Amount = amountVal
		case int:
			event.Amount = float64(amountVal)
		case int32:
			event.Amount = float64(amountVal)
		case int64:
			event.Amount = float64(amountVal)
		default:
			event.Amount = 0
		}

		// Parse metadata first
		if metadataRaw, ok := eventMap["metadata"].(map[string]interface{}); ok {
			event.Metadata = metadataRaw
		} else {
			event.Metadata = make(map[string]interface{})
		}

		// Preserve human-readable description if provided (fall back to name)
		if description, ok := eventMap["description"].(string); ok && description != "" {
			event.Description = description
		} else if name, ok := eventMap["name"].(string); ok && name != "" {
			event.Description = name
		}

		// Persist frequency information for downstream scheduling
		if frequency, ok := eventMap["frequency"].(string); ok && frequency != "" {
			event.Frequency = frequency
			event.Metadata["frequency"] = frequency
		} else if frequencyMeta, ok := event.Metadata["frequency"].(string); ok && frequencyMeta != "" {
			event.Frequency = frequencyMeta
		}

		// Parse optional account type fields into metadata
		if sourceAccountType, ok := eventMap["sourceAccountType"].(string); ok {
			event.Metadata["sourceAccountType"] = sourceAccountType
		}

		if targetAccountType, ok := eventMap["targetAccountType"].(string); ok {
			event.Metadata["targetAccountType"] = targetAccountType
		}

		// Persist priority when provided directly on the event
		if priority, ok := eventMap["priority"].(string); ok && priority != "" {
			event.Metadata["priority"] = priority
		}

		events = append(events, event)
	}

	return events, nil
}
