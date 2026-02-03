package engine

import (
	"fmt"
	"math"
)

// EventPreprocessor is responsible for expanding and scheduling all events for a simulation
type EventPreprocessor struct {
	queue *EventPriorityQueue
}

// NewEventPreprocessor creates a new event preprocessor
func NewEventPreprocessor() *EventPreprocessor {
	return &EventPreprocessor{
		queue: NewEventPriorityQueue(),
	}
}

// PreprocessAndPopulateQueue creates and populates the priority queue for the entire simulation
func PreprocessAndPopulateQueue(input SimulationInput) *EventPriorityQueue {
	preprocessor := NewEventPreprocessor()

	// DEBUG: Log the input parameters
	simLogVerbose("🔍 [QUEUE-PREPROCESSING-DEBUG] MonthsToRun: %d, NumEvents: %d", input.MonthsToRun, len(input.Events))

	// Step 1: Add all system events for the entire simulation duration
	preprocessor.addSystemEvents(input.MonthsToRun, input.Config)
	simLogVerbose("🔍 [SYSTEM-EVENTS-DEBUG] After system events: queue size = %d", preprocessor.queue.Len())

	// Step 2: Expand and add all user events based on their frequency
	preprocessor.addUserEvents(input.Events, input.MonthsToRun)
	simLogVerbose("🔍 [USER-EVENTS-DEBUG] After user events: queue size = %d", preprocessor.queue.Len())

	// Step 3: Add any scheduled liabilities/debt events (future enhancement)
	preprocessor.addLiabilityEvents(input.MonthsToRun)
	simLogVerbose("🔍 [LIABILITY-EVENTS-DEBUG] After liability events: queue size = %d", preprocessor.queue.Len())

	// Step 4: Add strategy-driven events (rebalancing, cash management, etc.)
	// Pass strategy settings to configure rebalancing and other strategy events
	preprocessor.addStrategyEvents(input.MonthsToRun, input.StrategySettings)

	// DEBUG: Final queue analysis
	simLogVerbose("🔍 [FINAL-QUEUE-DEBUG] Total queue size: %d for %d months", preprocessor.queue.Len(), input.MonthsToRun)

	return preprocessor.queue
}

// addSystemEvents adds all system-generated events for the simulation
func (ep *EventPreprocessor) addSystemEvents(monthsToRun int, config StochasticModelConfig) {
	for month := 0; month < monthsToRun; month++ {
		// PERF: In LiteMode, combine TIME_STEP and MARKET_UPDATE (handled in processTimeStep)
		if config.LiteMode {
			// Single event handles both time step and market update
			ep.queue.AddSystemEvent(SystemEventTimeStep, month, PriorityTimeStep)
		} else {
			// Full mode: separate events for detailed tracking
			ep.queue.AddSystemEvent(SystemEventTimeStep, month, PriorityTimeStep)
			ep.queue.AddSystemEvent(SystemEventMarketUpdate, month, PriorityMarketUpdate)
		}

		// Debt payments must happen after income but before expenses
		ep.queue.AddSystemEvent(SystemEventDebtPayment, month, PriorityDebtPayment)

		// Cash check runs after expenses to detect and fix shortfalls
		ep.queue.AddSystemEvent(SystemEventCashCheck, month, PriorityAssetSales-5)

		// PERF: Skip financial health check in LiteMode (used for detailed bankruptcy tracking)
		if !config.LiteMode {
			// Financial health check at the end of each month (after all transactions)
			ep.queue.AddSystemEvent(SystemEventFinancialHealthCheck, month, PriorityYearEnd-1)
		}

		// December-only events (year-end processing)
		if month%12 == 11 {
			// PERF: Skip RMD check in LiteMode for Bronze tier (no retirement account management)
			if !config.LiteMode {
				// RMD check for retirement accounts
				ep.queue.AddSystemEvent(SystemEventRMDCheck, month, PriorityRMD)
			}

			// Annual tax calculation and filing
			ep.queue.AddSystemEvent(SystemEventTaxCheck, month, PriorityTaxCalculation)

			// Tax payment timing based on configuration
			if config.PayTaxesEndOfYear {
				// Pay taxes immediately at end of year (December)
				ep.queue.Add(FinancialEvent{
					ID:          fmt.Sprintf("TAX_PAYMENT_%d", month/12),
					Type:        "TAX_PAYMENT",
					Description: "Annual tax payment/refund settlement (end of year)",
					MonthOffset: month,
				}, month, PriorityTaxPayment)
			}

			// Year-end reconciliation
			ep.queue.AddSystemEvent(SystemEventYearEnd, month, PriorityYearEnd)
		}

		// April tax payment (for previous year's taxes) - only if NOT paying at end of year
		if !config.PayTaxesEndOfYear && month%12 == 3 && month > 0 {
			ep.queue.Add(FinancialEvent{
				ID:          fmt.Sprintf("TAX_PAYMENT_%d", month/12),
				Type:        "TAX_PAYMENT",
				Description: "Annual tax payment/refund settlement (April)",
				MonthOffset: month,
			}, month, PriorityTaxPayment)
		}
	}
}

// addUserEvents expands recurring events and adds them to the queue
func (ep *EventPreprocessor) addUserEvents(events []FinancialEvent, monthsToRun int) {
	for _, event := range events {
		expandedMonths := ep.expandEventSchedule(event, monthsToRun)
		// Use account-aware priority assignment for contributions
		priority := GetEventPriorityWithAccount(event)

		for _, month := range expandedMonths {
			// Clone the event for this specific month
			eventInstance := ep.cloneEventForMonth(event, month)
			ep.queue.Add(eventInstance, month, priority)
		}
	}
}

// expandEventSchedule determines which months an event should fire based on its frequency
func (ep *EventPreprocessor) expandEventSchedule(event FinancialEvent, totalMonths int) []int {
	months := make([]int, 0)

	// Get frequency - check Frequency field first, then metadata, default to "once"
	frequency := "once"
	frequencySource := "default"

	// Priority 1: Check the Frequency field (canonical source)
	if event.Frequency != "" {
		frequency = event.Frequency
		frequencySource = "Frequency field"
	} else if freq, ok := event.Metadata["frequency"].(string); ok && freq != "" {
		// Priority 2: Fall back to metadata for backwards compatibility
		frequency = freq
		frequencySource = "Metadata"
	}
	// Priority 3: Default to "once" if neither is set

	// DEBUG: Log frequency resolution for first 3 events
	if len(event.ID) > 0 {
		simLogVerbose("📅 [FREQUENCY-DEBUG] Event '%s' (Type=%s): frequency='%s' from %s (Frequency field='%s', Metadata freq='%v')",
			event.ID, event.Type, frequency, frequencySource, event.Frequency, event.Metadata["frequency"])
	}

	// Determine start and end months
	startMonth := event.MonthOffset
	if startMonth < 0 {
		startMonth = 0
	}

	endMonth := totalMonths
	// Check for endDateOffset (from TypeScript) or endMonthOffset (legacy)
	if endMonthMeta, ok := event.Metadata["endDateOffset"]; ok {
		switch v := endMonthMeta.(type) {
		case float64:
			endMonth = int(math.Min(v, float64(totalMonths)))
		case int:
			endMonth = int(math.Min(float64(v), float64(totalMonths)))
		}
	} else if endMonthMeta, ok := event.Metadata["endMonthOffset"]; ok {
		switch v := endMonthMeta.(type) {
		case float64:
			endMonth = int(math.Min(v, float64(totalMonths)))
		case int:
			endMonth = int(math.Min(float64(v), float64(totalMonths)))
		}
	}

	// Handle different frequency types
	switch frequency {
	case "monthly":
		for m := startMonth; m < endMonth; m++ {
			months = append(months, m)
		}

	case "biweekly":
		// Approximate biweekly as twice per month
		for m := startMonth; m < endMonth; m++ {
			months = append(months, m)
			// Add mid-month instance
			if m < endMonth-1 || (m == endMonth-1 && m%2 == 0) {
				months = append(months, m)
			}
		}

	case "quarterly":
		for m := startMonth; m < endMonth; m += 3 {
			months = append(months, m)
		}

	case "semiannually":
		for m := startMonth; m < endMonth; m += 6 {
			months = append(months, m)
		}

	case "annually", "annual":
		// SPECIAL CASE: For INCOME events, "annually" means the amount is annual
		// but payments should be monthly (divide annual salary by 12)
		if event.Type == "INCOME" {
			simLogVerbose("💰 [INCOME-FREQUENCY-FIX] Converting annual income to monthly: Event='%s', Amount=$%.2f (will be /12)", event.ID, event.Amount)
			for m := startMonth; m < endMonth; m++ {
				months = append(months, m)
			}
		} else {
			// For non-income events, annually means fire once per year
			for m := startMonth; m < endMonth; m += 12 {
				months = append(months, m)
			}
		}

	case "once", "one-time", "":
		if startMonth < totalMonths {
			months = append(months, startMonth)
		}

	default:
		// Try to parse custom frequency (e.g., "every_2_months")
		if startMonth < totalMonths {
			months = append(months, startMonth)
		}
	}

	return months
}

// cloneEventForMonth creates a copy of an event for a specific month
func (ep *EventPreprocessor) cloneEventForMonth(event FinancialEvent, month int) FinancialEvent {
	clone := event
	clone.MonthOffset = month

	// CRITICAL FIX: For INCOME events with annual frequency, divide amount by 12
	// to get monthly salary from annual salary
	frequency := event.Frequency
	if frequency == "" {
		if freq, ok := event.Metadata["frequency"].(string); ok {
			frequency = freq
		}
	}

	if event.Type == "INCOME" && (frequency == "annually" || frequency == "annual") {
		clone.Amount = event.Amount / 12.0
		simLogVerbose("💰 [INCOME-AMOUNT-FIX] Divided annual income by 12: Event='%s', Annual=$%.2f, Monthly=$%.2f",
			event.ID, event.Amount, clone.Amount)
	}

	// Apply growth rate if specified
	if growthRate, ok := event.Metadata["growthRate"].(float64); ok && growthRate > 0 {
		yearsElapsed := float64(month-event.MonthOffset) / 12.0
		if yearsElapsed > 0 {
			growthMultiplier := math.Pow(1+growthRate, yearsElapsed)
			clone.Amount = event.Amount * growthMultiplier
		}
	}

	// Apply inflation if specified
	if applyInflation, ok := event.Metadata["applyInflation"].(bool); ok && applyInflation {
		inflationRate := 0.025 // Default 2.5% inflation
		if rate, ok := event.Metadata["inflationRate"].(float64); ok {
			inflationRate = rate
		}
		yearsElapsed := float64(month) / 12.0
		inflationMultiplier := math.Pow(1+inflationRate, yearsElapsed)
		clone.Amount = clone.Amount * inflationMultiplier
	}

	return clone
}

// addLiabilityEvents adds debt payment events for mortgages and loans
// addLiabilityEvents adds scheduled liability/debt payment events
// NOTE: Currently using system event handler for debt payments
// Future enhancement could implement more sophisticated liability scheduling
func (ep *EventPreprocessor) addLiabilityEvents(monthsToRun int) {
	// Debt payments are currently handled by SystemEventDebtPayment events
	// This function is reserved for future complex liability scheduling
}

// ValidateQueueIntegrity performs sanity checks on the populated queue
func ValidateQueueIntegrity(queue *EventPriorityQueue) []string {
	issues := make([]string, 0)

	// Track event counts by type
	eventCounts := make(map[string]int)
	monthCoverage := make(map[int]bool)

	// Create a copy to iterate without modifying
	tempQueue := &EventPriorityQueue{items: make([]*QueuedEvent, len(queue.items))}
	copy(tempQueue.items, queue.items)

	var lastMonth = -1
	var lastPriority EventPriority = -1

	for !tempQueue.IsEmpty() {
		event := tempQueue.Next()
		eventCounts[event.Event.Type]++
		monthCoverage[event.MonthOffset] = true

		// Check ordering
		if event.MonthOffset < lastMonth {
			issues = append(issues, fmt.Sprintf(
				"Event ordering violation: month %d came after month %d",
				event.MonthOffset, lastMonth))
		}

		if event.MonthOffset == lastMonth && event.Priority < lastPriority {
			issues = append(issues, fmt.Sprintf(
				"Priority ordering violation in month %d: priority %d came after %d",
				event.MonthOffset, event.Priority, lastPriority))
		}

		lastMonth = event.MonthOffset
		if event.MonthOffset > lastMonth {
			lastPriority = event.Priority
		}
	}

	// Validate essential system events exist
	if eventCounts[SystemEventTimeStep] == 0 {
		issues = append(issues, "Missing TIME_STEP system events")
	}
	if eventCounts[SystemEventMarketUpdate] == 0 {
		issues = append(issues, "Missing MARKET_UPDATE system events")
	}

	return issues
}

// addStrategyEvents adds strategy-driven events (rebalancing, cash management, etc.)
func (ep *EventPreprocessor) addStrategyEvents(monthsToRun int, settings *StrategySettings) {
	// Use default settings if none provided
	var strategyConfig StrategySettings
	if settings != nil {
		strategyConfig = *settings
	} else {
		strategyConfig = getDefaultStrategySettings()
	}

	// Determine rebalancing frequency from strategy settings
	rebalanceInterval := 3 // Default quarterly
	if strategyConfig.Rebalancing.Frequency == "monthly" {
		rebalanceInterval = 1
	} else if strategyConfig.Rebalancing.Frequency == "annually" {
		rebalanceInterval = 12
	} else if strategyConfig.Rebalancing.Frequency == "semiannually" {
		rebalanceInterval = 6
	}

	// Add rebalancing check events based on configured frequency
	for month := rebalanceInterval - 1; month < monthsToRun; month += rebalanceInterval {
		// Embed strategy settings in event metadata
		eventMetadata := make(map[string]interface{})
		eventMetadata["strategySettings"] = strategyConfig
		eventMetadata["rebalanceThreshold"] = strategyConfig.Rebalancing.ThresholdPercentage
		eventMetadata["assetAllocation"] = strategyConfig.AssetAllocation.Allocations

		ep.queue.Add(FinancialEvent{
			ID:          fmt.Sprintf("STRATEGY_REBALANCE_CHECK_%d", month),
			Type:        "STRATEGY_REBALANCING_RULE_SET",
			Description: fmt.Sprintf("Rebalancing check for month %d", month),
			Amount:      0, // No specific amount - generates sub-events as needed
			MonthOffset: month,
			Metadata:    eventMetadata,
		}, month, PriorityContributions-10) // After contributions but before other events
	}

	// Add cash management check events monthly (after expenses)
	for month := 0; month < monthsToRun; month++ {
		ep.queue.Add(FinancialEvent{
			ID:          fmt.Sprintf("STRATEGY_CASH_MANAGEMENT_%d", month),
			Type:        "ADJUST_CASH_RESERVE_SELL_ASSETS", // Use existing handler
			Description: fmt.Sprintf("Monthly cash management check for month %d", month),
			Amount:      0, // Amount determined dynamically by handler
			MonthOffset: month,
		}, month, PriorityAssetSales-10) // Just before other asset sales

		// Also add investment check for excess cash
		ep.queue.Add(FinancialEvent{
			ID:          fmt.Sprintf("STRATEGY_CASH_INVEST_%d", month),
			Type:        "ADJUST_CASH_RESERVE_BUY_ASSETS", // Use existing handler
			Description: fmt.Sprintf("Monthly excess cash investment for month %d", month),
			Amount:      0, // Amount determined dynamically by handler
			MonthOffset: month,
		}, month, PriorityAssetPurchases) // With other asset purchases
	}

	// Add annual tax loss harvesting check (December)
	for month := 11; month < monthsToRun; month += 12 { // December of each year
		ep.queue.Add(FinancialEvent{
			ID:          fmt.Sprintf("STRATEGY_TAX_LOSS_HARVEST_%d", month),
			Type:        "TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE",
			Description: fmt.Sprintf("Annual tax loss harvesting check for month %d", month),
			Amount:      0, // Amount determined by available losses
			MonthOffset: month,
		}, month, PriorityTaxCalculation-10) // Before tax calculation
	}

	rebalancingCount := monthsToRun / rebalanceInterval
	if monthsToRun%rebalanceInterval > 0 {
		rebalancingCount++
	}
	simLogVerbose("📅 [STRATEGY-SCHEDULE] Added strategy events: %d rebalancing (every %d months), %d cash mgmt, %d tax harvest",
		rebalancingCount, rebalanceInterval, monthsToRun*2, (monthsToRun+11)/12)
}
