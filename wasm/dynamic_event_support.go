package main

import (
	"fmt"
	"strings"
)

// DynamicEventMetadata represents metadata for events generated from dynamic events
type DynamicEventMetadata struct {
	GeneratedBy     string                 `json:"generatedBy"`
	GeneratedByType string                 `json:"generatedByType"`
	DynamicAction   bool                   `json:"dynamicAction"`
	OriginalAction  map[string]interface{} `json:"originalAction"`
}

// DynamicEventTracker tracks dynamic event execution for debugging and analytics
type DynamicEventTracker struct {
	executionLog []DynamicEventExecution
	debugMode    bool
}

// DynamicEventExecution represents a single dynamic event execution
type DynamicEventExecution struct {
	OriginalEventID   string  `json:"originalEventId"`
	OriginalEventType string  `json:"originalEventType"`
	GeneratedEventID  string  `json:"generatedEventId"`
	ExecutedAt        int     `json:"executedAt"` // Month offset
	Amount            float64 `json:"amount"`
	ActionType        string  `json:"actionType"`
	TargetAccount     string  `json:"targetAccount"`
	Success           bool    `json:"success"`
	ErrorMessage      string  `json:"errorMessage,omitempty"`
}

// NewDynamicEventTracker creates a new dynamic event tracker
func NewDynamicEventTracker(debugMode bool) *DynamicEventTracker {
	return &DynamicEventTracker{
		executionLog: make([]DynamicEventExecution, 0),
		debugMode:    debugMode,
	}
}

// isDynamicEvent checks if an event was generated from a dynamic event
func isDynamicEvent(event FinancialEvent) bool {
	if event.Metadata == nil {
		return false
	}

	dynamicAction, exists := event.Metadata["dynamicAction"]
	if !exists {
		return false
	}

	isDynamic, ok := dynamicAction.(bool)
	return ok && isDynamic
}

// getDynamicEventMetadata extracts dynamic event metadata from an event
func getDynamicEventMetadata(event FinancialEvent) *DynamicEventMetadata {
	if !isDynamicEvent(event) {
		return nil
	}

	// CRITICAL FIX: Check for nil Metadata to prevent panic
	if event.Metadata == nil {
		return nil
	}

	metadata := &DynamicEventMetadata{}

	if generatedBy, exists := event.Metadata["generatedBy"]; exists {
		if str, ok := generatedBy.(string); ok {
			metadata.GeneratedBy = str
		}
	}

	if generatedByType, exists := event.Metadata["generatedByType"]; exists {
		if str, ok := generatedByType.(string); ok {
			metadata.GeneratedByType = str
		}
	}

	if dynamicAction, exists := event.Metadata["dynamicAction"]; exists {
		if boolean, ok := dynamicAction.(bool); ok {
			metadata.DynamicAction = boolean
		}
	}

	if originalAction, exists := event.Metadata["originalAction"]; exists {
		if actionMap, ok := originalAction.(map[string]interface{}); ok {
			metadata.OriginalAction = actionMap
		}
	}

	return metadata
}

// TrackExecution logs the execution of a dynamic event
func (t *DynamicEventTracker) TrackExecution(
	event FinancialEvent,
	currentMonth int,
	success bool,
	errorMessage string,
) {
	if !isDynamicEvent(event) {
		return
	}

	metadata := getDynamicEventMetadata(event)
	if metadata == nil {
		return
	}

	// Determine action type from original action metadata
	actionType := "UNKNOWN"
	if metadata.OriginalAction != nil {
		if actionTypeValue, exists := metadata.OriginalAction["type"]; exists {
			if str, ok := actionTypeValue.(string); ok {
				actionType = str
			}
		}
	}

	// Determine target account from metadata since TargetAccountType field doesn't exist
	targetAccount := ""
	if event.Metadata != nil {
		if accountType, exists := event.Metadata["targetAccountType"]; exists {
			if str, ok := accountType.(string); ok {
				targetAccount = str
			}
		}
	}

	execution := DynamicEventExecution{
		OriginalEventID:   metadata.GeneratedBy,
		OriginalEventType: metadata.GeneratedByType,
		GeneratedEventID:  event.ID,
		ExecutedAt:        currentMonth,
		Amount:            event.Amount,
		ActionType:        actionType,
		TargetAccount:     targetAccount,
		Success:           success,
		ErrorMessage:      errorMessage,
	}

	t.executionLog = append(t.executionLog, execution)

	if t.debugMode {
		status := "SUCCESS"
		if !success {
			status = "FAILED"
		}

		simLogVerbose("🧠 [DynamicEvent] %s: %s → %s (%.2f to %s) at month %d",
			status,
			metadata.GeneratedByType,
			actionType,
			event.Amount,
			targetAccount,
			currentMonth)

		if !success && errorMessage != "" {
			fmt.Printf("   Error: %s\n", errorMessage)
		}
	}
}

// GetExecutionSummary returns a summary of dynamic event executions
func (t *DynamicEventTracker) GetExecutionSummary() map[string]interface{} {
	summary := make(map[string]interface{})

	totalExecutions := len(t.executionLog)
	successfulExecutions := 0
	eventTypeCounts := make(map[string]int)
	actionTypeCounts := make(map[string]int)
	totalAmount := 0.0

	for _, execution := range t.executionLog {
		if execution.Success {
			successfulExecutions++
		}

		eventTypeCounts[execution.OriginalEventType]++
		actionTypeCounts[execution.ActionType]++

		if execution.Success {
			totalAmount += execution.Amount
		}
	}

	summary["totalExecutions"] = totalExecutions
	summary["successfulExecutions"] = successfulExecutions
	summary["failedExecutions"] = totalExecutions - successfulExecutions
	summary["successRate"] = float64(successfulExecutions) / float64(totalExecutions)
	summary["eventTypeCounts"] = eventTypeCounts
	summary["actionTypeCounts"] = actionTypeCounts
	summary["totalAmount"] = totalAmount

	return summary
}

// GetExecutionLog returns the full execution log
func (t *DynamicEventTracker) GetExecutionLog() []DynamicEventExecution {
	return t.executionLog
}

// ClearLog clears the execution log
func (t *DynamicEventTracker) ClearLog() {
	t.executionLog = make([]DynamicEventExecution, 0)
}

// Enhanced event handler wrapper that adds dynamic event tracking
type DynamicEventAwareHandler struct {
	originalHandler EventHandler
	tracker         *DynamicEventTracker
}

// NewDynamicEventAwareHandler wraps an existing handler with dynamic event tracking
func NewDynamicEventAwareHandler(originalHandler EventHandler, tracker *DynamicEventTracker) *DynamicEventAwareHandler {
	return &DynamicEventAwareHandler{
		originalHandler: originalHandler,
		tracker:         tracker,
	}
}

// Process wraps the original handler's Process method with dynamic event tracking
func (h *DynamicEventAwareHandler) Process(
	event FinancialEvent,
	accounts *AccountHoldingsMonthEnd,
	cashFlow *float64,
	context *EventProcessingContext,
) error {
	// Execute the original handler
	err := h.originalHandler.Process(event, accounts, cashFlow, context)

	// Track execution if this is a dynamic event
	if isDynamicEvent(event) {
		success := err == nil
		errorMessage := ""
		if err != nil {
			errorMessage = err.Error()
		}

		h.tracker.TrackExecution(event, context.CurrentMonth, success, errorMessage)
	}

	return err
}

// EnhanceDynamicEventRegistry enhances an existing event registry with dynamic event tracking
func EnhanceDynamicEventRegistry(registry *EventHandlerRegistry, debugMode bool) *DynamicEventTracker {
	tracker := NewDynamicEventTracker(debugMode)

	// Wrap existing handlers with dynamic event tracking
	for eventType, handler := range registry.handlers {
		if shouldTrackEventType(eventType) {
			registry.handlers[eventType] = NewDynamicEventAwareHandler(handler, tracker)
		}
	}

	return tracker
}

// shouldTrackEventType determines if an event type should be tracked for dynamic events
func shouldTrackEventType(eventType EventType) bool {
	// Track event types that can be generated by dynamic events
	trackableTypes := []EventType{
		EventTypeScheduledContribution,
		EventTypeRebalancePortfolio,
		// EventTypeWithdrawal and EventTypeTransfer not currently defined
		// EventTypeWithdrawalEvent,
		// EventTypeAccountTransfer,
		EventTypeRothConversion,
		EventTypeCapitalGainsRealization,
		EventTypeTaxLossHarvestingSale,
		EventTypeAdjustCashReserveBuyAssets,
		EventTypeAdjustCashReserveSellAssets,
		EventTypeDebtPayment,
		EventTypeOneTimeEvent,
	}

	for _, trackableType := range trackableTypes {
		if eventType == trackableType {
			return true
		}
	}

	return false
}

// ValidateDynamicEventIntegrity performs validation on dynamic events
func ValidateDynamicEventIntegrity(events []FinancialEvent) []string {
	var issues []string

	dynamicEventCount := 0
	generatedByMap := make(map[string]int) // Track how many events each dynamic event generated

	for _, event := range events {
		if isDynamicEvent(event) {
			dynamicEventCount++

			metadata := getDynamicEventMetadata(event)
			if metadata == nil {
				issues = append(issues, fmt.Sprintf("Event %s claims to be dynamic but has invalid metadata", event.ID))
				continue
			}

			// Validate required metadata fields
			if metadata.GeneratedBy == "" {
				issues = append(issues, fmt.Sprintf("Dynamic event %s missing generatedBy field", event.ID))
			}

			if metadata.GeneratedByType == "" {
				issues = append(issues, fmt.Sprintf("Dynamic event %s missing generatedByType field", event.ID))
			}

			// Track generation counts
			generatedByMap[metadata.GeneratedBy]++

			// Validate amount
			if event.Amount <= 0 {
				issues = append(issues, fmt.Sprintf("Dynamic event %s has invalid amount: %.2f", event.ID, event.Amount))
			}

			// Validate account type from metadata
			targetAccountType := ""
			if event.Metadata != nil {
				if accountType, exists := event.Metadata["targetAccountType"]; exists {
					if str, ok := accountType.(string); ok {
						targetAccountType = str
					}
				}
			}
			if targetAccountType == "" {
				issues = append(issues, fmt.Sprintf("Dynamic event %s missing target account type", event.ID))
			}
		}
	}

	// Check for excessive generation from single dynamic events (potential infinite loops)
	for dynamicEventId, count := range generatedByMap {
		if count > 1000 { // Arbitrary threshold
			issues = append(issues, fmt.Sprintf("Dynamic event %s generated %d events (potential infinite loop)", dynamicEventId, count))
		}
	}

	if len(issues) == 0 && dynamicEventCount > 0 {
		// Dynamic events validated successfully
	}

	return issues
}

// formatDynamicEventName creates a descriptive name for a dynamic event
func formatDynamicEventName(event FinancialEvent) string {
	if !isDynamicEvent(event) {
		return event.ID // Use ID as name since Name field doesn't exist
	}

	metadata := getDynamicEventMetadata(event)
	if metadata == nil {
		return event.ID // Use ID as name since Name field doesn't exist
	}

	// Create a more descriptive name
	actionType := "Action"
	if metadata.OriginalAction != nil {
		if actionTypeValue, exists := metadata.OriginalAction["type"]; exists {
			if str, ok := actionTypeValue.(string); ok {
				actionType = strings.Title(strings.ToLower(str))
			}
		}
	}

	return fmt.Sprintf("%s from %s", actionType, metadata.GeneratedByType)
}
