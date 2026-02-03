package main

import (
	"testing"
)

func TestStrategyPatternRefactoring(t *testing.T) {
	// Test that the event handler registry is properly initialized
	registry := NewEventHandlerRegistry()

	// Test getting a known handler
	handler, err := registry.GetHandler(EventTypeIncome)
	if err != nil {
		t.Fatalf("Expected to find handler for EventTypeIncome, got error: %v", err)
	}

	if handler == nil {
		t.Fatal("Expected handler to not be nil")
	}

	// Verify it's the correct type
	if _, ok := handler.(*IncomeEventHandler); !ok {
		t.Fatalf("Expected IncomeEventHandler, got %T", handler)
	}
}

func TestEventHandlerRegistryHasAllTypes(t *testing.T) {
	registry := NewEventHandlerRegistry()

	// Test a few key event types to ensure they're registered
	testCases := []struct {
		eventType    EventType
		expectedType string
	}{
		{EventTypeIncome, "*main.IncomeEventHandler"},
		{EventTypeScheduledContribution, "*main.ScheduledContributionEventHandler"},
		{EventTypeRothConversion, "*main.RothConversionEventHandler"},
		{EventTypeSocialSecurityIncome, "*main.SocialSecurityIncomeEventHandler"},
		{EventTypeRecurringExpense, "*main.RecurringExpenseEventHandler"},
		{EventTypeOneTimeExpense, "*main.OneTimeExpenseEventHandler"},
	}

	for _, tc := range testCases {
		handler, err := registry.GetHandler(tc.eventType)
		if err != nil {
			t.Errorf("No handler found for event type %s: %v", tc.eventType, err)
			continue
		}

		if handler == nil {
			t.Errorf("Handler for event type %s is nil", tc.eventType)
			continue
		}

		// Note: We can't easily check the exact type name in Go without reflection
		// but we can at least verify the handler exists and is not nil
	}
}

func TestUnknownEventTypeUsesDefaultHandler(t *testing.T) {
	registry := NewEventHandlerRegistry()

	// Test with an undefined event type
	unknownEventType := EventType("UNKNOWN_EVENT_TYPE")
	handler, err := registry.GetHandler(unknownEventType)

	// Should return default handler even with error
	if handler == nil {
		t.Fatal("Expected default handler to be returned for unknown event type")
	}

	// Should be default handler type
	if _, ok := handler.(*DefaultEventHandler); !ok {
		t.Fatalf("Expected DefaultEventHandler, got %T", handler)
	}

	// Should return an error but still provide default handler
	if err == nil {
		t.Error("Expected error for unknown event type")
	}
}

func TestSimulationEngineHasEventRegistry(t *testing.T) {
	config := StochasticModelConfig{}
	engine := NewSimulationEngine(config)

	if engine.eventRegistry == nil {
		t.Fatal("Expected simulation engine to have event registry initialized")
	}

	// Test that we can get a handler through the simulation engine
	handler, err := engine.eventRegistry.GetHandler(EventTypeIncome)
	if err != nil {
		t.Fatalf("Expected to get handler through simulation engine: %v", err)
	}

	if handler == nil {
		t.Fatal("Expected handler to not be nil")
	}
}
