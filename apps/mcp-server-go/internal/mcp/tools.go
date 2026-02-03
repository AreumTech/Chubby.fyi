package mcp

import (
	"fmt"
	"log"

	"github.com/areumfire/mcp-server-go/internal/simulation"
)

// Tool definitions
var tools = []Tool{
	{
		Name: "run_simulation_packet",
		Description: `Run deterministic Monte Carlo financial simulation. Returns outcome distributions (P10/P50/P75), not recommendations. Answers "what tends to happen under these assumptions?" — never "what should I do?"

CRITICAL RESPONSE GUIDELINES (you MUST follow these when presenting results):
- SHOW the artifact (widget) and let it speak for itself
- DO NOT add evaluative language ("good position", "on track", "elite", "wealthy", "safe", "likely")
- DO NOT give advice or rules of thumb (no "4% rule", no "you could retire at X")
- DO NOT make predictions ("you will", "you're likely to")
- DO explain what the percentiles mean mechanically (P10 = 10% of paths ended below this)
- DO offer to explore scenarios ("What if spending increased?" "What if you retired earlier?")
- KEEP explanations under 100 words - the widget carries the information
- FRAME as "under these assumptions, simulations show..." not "you are/will be..."

DESIGN CONTEXT (why we do things this way):
- Default to age 80: Unless user specifies otherwise, simulate until age 80.
- P10/P50/P75 not P10/P90: We avoid P90 ("tail theater") because extreme percentiles are noisy.
- Asymmetric range (10th to 75th): Downside risk matters more than upside luck.
- "Constraint" not "failure": Running out of money triggers spending adjustment, not catastrophe.
- No survival probability: We removed "X% chance of success" framing.

SIMULATION TIERS:
- basic: Fastest (~2ms), simple compound growth, no taxes
- bronze: Fast (~3ms), adds federal/state taxes, account types (cash, taxable, 401k, roth)
- (future) silver: Full event processing, RMDs, Social Security
- (future) gold: Complete simulation with all features`,
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"investableAssets": map[string]interface{}{
					"type":        "number",
					"description": "Total investable assets in dollars (for basic tier, or split across accounts for bronze)",
				},
				"annualSpending": map[string]interface{}{
					"type":        "number",
					"description": "Annual spending in dollars",
				},
				"currentAge": map[string]interface{}{
					"type":        "number",
					"description": "Current age in years. Simulation is capped at age 80.",
				},
				"expectedIncome": map[string]interface{}{
					"type":        "number",
					"description": "Expected annual income in dollars",
				},
				"seed": map[string]interface{}{
					"type":        "number",
					"description": "Random seed for deterministic simulation (integer)",
				},
				"startYear": map[string]interface{}{
					"type":        "number",
					"description": "Calendar year to start simulation",
				},
				"horizonMonths": map[string]interface{}{
					"type":        "number",
					"description": "Simulation horizon in months (default: until age 80)",
				},
				"mcPaths": map[string]interface{}{
					"type":        "number",
					"description": "Number of Monte Carlo paths (default: 100)",
				},
				"tier": map[string]interface{}{
					"type":        "string",
					"description": "Simulation tier: 'basic' (~2ms, no taxes), 'bronze' (~3ms, simplified), or 'full' (~500ms, complete WASM-parity simulation). Default: full",
					"enum":        []string{"basic", "bronze", "full"},
				},
				"cashBalance": map[string]interface{}{
					"type":        "number",
					"description": "Cash/checking balance in dollars (bronze tier)",
				},
				"taxableBalance": map[string]interface{}{
					"type":        "number",
					"description": "Taxable brokerage account balance (bronze tier)",
				},
				"retirement401kBalance": map[string]interface{}{
					"type":        "number",
					"description": "401k/Traditional IRA balance (bronze tier)",
				},
				"rothBalance": map[string]interface{}{
					"type":        "number",
					"description": "Roth IRA/401k balance (bronze tier)",
				},
				"contribution401k": map[string]interface{}{
					"type":        "number",
					"description": "Annual 401k contribution (bronze tier, max $23,000 for 2024)",
				},
				"contributionRoth": map[string]interface{}{
					"type":        "number",
					"description": "Annual Roth IRA contribution (bronze tier, max $7,000 for 2024)",
				},
				"stateRate": map[string]interface{}{
					"type":        "number",
					"description": "State income tax rate (e.g., 0.093 for CA). Default: 0.065",
				},
			},
			"required": []string{
				"investableAssets",
				"annualSpending",
				"currentAge",
				"expectedIncome",
				"seed",
				"startYear",
			},
		},
		Annotations: &ToolAnnotations{
			ReadOnlyHint:    true,
			DestructiveHint: false,
			OpenWorldHint:   false,
		},
	},
	{
		Name: "extract_financial_changes",
		Description: `Extract structured financial changes from natural language text. Returns proposed draft changes with field paths, values, and confidence levels. Use this to parse user statements like "I make $100k and spend $60k per year".`,
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"text": map[string]interface{}{
					"type":        "string",
					"description": "Natural language text describing financial situation or changes",
				},
			},
			"required": []string{"text"},
		},
		Annotations: &ToolAnnotations{
			ReadOnlyHint:    true,
			DestructiveHint: false,
			OpenWorldHint:   false,
		},
	},
}

// handleToolsList returns the list of available tools
func (s *Server) handleToolsList(req *JSONRPCRequest) *JSONRPCResponse {
	// Add _meta to each tool for OpenAI Apps SDK
	toolsWithMeta := make([]map[string]interface{}, len(tools))
	for i, tool := range tools {
		toolMap := map[string]interface{}{
			"name":        tool.Name,
			"description": tool.Description,
			"inputSchema": tool.InputSchema,
		}
		if tool.Annotations != nil {
			toolMap["annotations"] = tool.Annotations
		}
		// Add OpenAI Apps SDK metadata for simulation tool
		if tool.Name == "run_simulation_packet" {
			toolMap["_meta"] = toolDescriptorMeta()
		}
		toolsWithMeta[i] = toolMap
	}

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: map[string]interface{}{
			"tools": toolsWithMeta,
		},
	}
}

// toolDescriptorMeta returns OpenAI Apps SDK metadata
func toolDescriptorMeta() map[string]interface{} {
	return map[string]interface{}{
		"openai/outputTemplate":          WidgetTemplateURI,
		"openai/toolInvocation/invoking": "Running Monte Carlo simulation...",
		"openai/toolInvocation/invoked":  "Simulation complete",
		"openai/widgetAccessible":        true,
		"openai/widgetDomain":            "chubby-simulation",
		"openai/widgetCSP": map[string]interface{}{
			"connect_domains":  []string{},
			"resource_domains": []string{},
		},
	}
}

// handleToolsCall handles tool invocation
func (s *Server) handleToolsCall(req *JSONRPCRequest) *JSONRPCResponse {
	params := req.Params
	name, _ := params["name"].(string)
	args, _ := params["arguments"].(map[string]interface{})

	log.Printf("Tool call: %s", name)

	switch name {
	case "run_simulation_packet":
		return s.handleRunSimulation(req.ID, args)
	case "extract_financial_changes":
		return s.handleExtractChanges(req.ID, args)
	default:
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &JSONRPCError{
				Code:    -32602,
				Message: "Unknown tool: " + name,
			},
		}
	}
}

// handleRunSimulation runs the simulation
func (s *Server) handleRunSimulation(id interface{}, args map[string]interface{}) *JSONRPCResponse {
	// Check simulation tier - default to full for parity with WASM engine
	tier := getString(args, "tier", "full")

	// Calculate default horizon (age 80)
	currentAge := getFloat(args, "currentAge", 35)
	horizonMonths := getInt(args, "horizonMonths", 0)
	if horizonMonths == 0 {
		yearsToAge80 := 80 - int(currentAge)
		if yearsToAge80 < 1 {
			yearsToAge80 = 1
		}
		horizonMonths = yearsToAge80 * 12
	}

	var result interface{}
	var err error

	// Parse account balances
	investableAssets := getFloat(args, "investableAssets", 0)
	cashBalance := getFloat(args, "cashBalance", 0)
	taxableBalance := getFloat(args, "taxableBalance", 0)
	retirement401k := getFloat(args, "retirement401kBalance", 0)
	rothBalance := getFloat(args, "rothBalance", 0)

	// If no individual accounts provided, distribute investableAssets
	if cashBalance == 0 && taxableBalance == 0 && retirement401k == 0 && rothBalance == 0 {
		// Default distribution: 10% cash, 50% taxable, 30% 401k, 10% roth
		cashBalance = investableAssets * 0.10
		taxableBalance = investableAssets * 0.50
		retirement401k = investableAssets * 0.30
		rothBalance = investableAssets * 0.10
	}

	switch tier {
	case "basic":
		// Basic tier: fast, no taxes
		params := simulation.SimulationParams{
			InvestableAssets: investableAssets,
			AnnualSpending:   getFloat(args, "annualSpending", 0),
			CurrentAge:       currentAge,
			ExpectedIncome:   getFloat(args, "expectedIncome", 0),
			Seed:             getInt(args, "seed", 12345),
			StartYear:        getInt(args, "startYear", 2024),
			HorizonMonths:    horizonMonths,
			MCPaths:          getInt(args, "mcPaths", 100),
		}
		result, err = s.engine.RunSimulation(params)

	case "full":
		// Full tier: complete simulation with all features
		params := simulation.FullSimulationParams{
			Seed:               getInt(args, "seed", 12345),
			StartYear:          getInt(args, "startYear", 2024),
			HorizonMonths:      horizonMonths,
			MCPaths:            getInt(args, "mcPaths", 100),
			CurrentAge:         int(currentAge),
			StateCode:          getString(args, "stateCode", "CA"),
			StateRate:          getFloat(args, "stateRate", 0.093),
			CashBalance:        cashBalance,
			TaxableBalance:     taxableBalance,
			TaxDeferredBalance: retirement401k,
			RothBalance:        rothBalance,
			AnnualIncome:       getFloat(args, "expectedIncome", 0),
			AnnualSpending:     getFloat(args, "annualSpending", 0),
			Contribution401k:   getFloat(args, "contribution401k", 0),
			ContributionRoth:   getFloat(args, "contributionRoth", 0),
			LiteMode:           true, // Use optimized mode by default
		}
		result, err = s.fullEngine.RunFullSimulation(params)

	default:
		// Bronze tier: use full engine in LiteMode for WASM parity
		params := simulation.FullSimulationParams{
			Seed:               getInt(args, "seed", 12345),
			StartYear:          getInt(args, "startYear", 2024),
			HorizonMonths:      horizonMonths,
			MCPaths:            getInt(args, "mcPaths", 100),
			CurrentAge:         int(currentAge),
			StateCode:          getString(args, "stateCode", "CA"),
			StateRate:          getFloat(args, "stateRate", 0.093),
			CashBalance:        cashBalance,
			TaxableBalance:     taxableBalance,
			TaxDeferredBalance: retirement401k,
			RothBalance:        rothBalance,
			AnnualIncome:       getFloat(args, "expectedIncome", 0),
			AnnualSpending:     getFloat(args, "annualSpending", 0),
			Contribution401k:   getFloat(args, "contribution401k", 0),
			ContributionRoth:   getFloat(args, "contributionRoth", 0),
			LiteMode:           true, // Use optimized mode
		}
		result, err = s.fullEngine.RunFullSimulation(params)
	}

	if err != nil {
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      id,
			Error: &JSONRPCError{
				Code:    -32000,
				Message: "Simulation error: " + err.Error(),
			},
		}
	}

	// Build text summary
	textSummary := buildTextSummary(result)

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Result: ToolResult{
			Content: []ContentBlock{
				{Type: "text", Text: textSummary},
			},
			StructuredContent: result,
			Meta: map[string]interface{}{
				"openai/outputTemplate":          WidgetTemplateURI,
				"openai/toolInvocation/invoking": "Running Monte Carlo simulation...",
				"openai/toolInvocation/invoked":  "Simulation complete",
				"simulationTier":                 tier,
			},
		},
	}
}

// handleExtractChanges extracts financial changes from text
func (s *Server) handleExtractChanges(id interface{}, args map[string]interface{}) *JSONRPCResponse {
	text, _ := args["text"].(string)

	// TODO: Implement NLP extraction
	// For now, return empty changes
	result := map[string]interface{}{
		"changes":    []interface{}{},
		"confidence": 0.0,
		"rawText":    text,
	}

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Result: ToolResult{
			Content: []ContentBlock{
				{Type: "text", Text: "Extracted financial changes from text."},
			},
			StructuredContent: result,
		},
	}
}

// buildTextSummary creates a text summary of simulation results
func buildTextSummary(result interface{}) string {
	if result == nil {
		return "Simulation completed but no results available."
	}

	// Handle both basic and enhanced results
	switch r := result.(type) {
	case *simulation.SimulationResult:
		if r.MC != nil {
			return fmt.Sprintf("Monte Carlo simulation complete (%d paths). "+
				"Median runway: %d months. See widget for trajectory analysis.",
				r.PathsRun, r.MC.RunwayP50)
		}
	case *simulation.EnhancedSimulationResult:
		if r.MC != nil {
			return fmt.Sprintf("Monte Carlo simulation complete (%d paths, bronze tier). "+
				"Median final net worth: $%.0f. Taxes calculated. See widget for details.",
				r.PathsRun, r.MC.FinalNetWorthP50)
		}
	}

	return "Monte Carlo simulation complete. See widget for trajectory and plan duration analysis."
}

// Helper functions
func getFloat(m map[string]interface{}, key string, def float64) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return def
}

func getInt(m map[string]interface{}, key string, def int) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return def
}

func getString(m map[string]interface{}, key string, def string) string {
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return def
}
