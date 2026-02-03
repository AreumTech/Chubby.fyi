package main

import (
	"testing"
)

// TestEventPriorityQueue validates the event queue implementation
func TestEventPriorityQueue(t *testing.T) {
	// Implementation verified - all expected methods exist
	t.Run("Basic queue operations", func(t *testing.T) {
		queue := NewEventPriorityQueue()

		// Add events in random order
		queue.Add(FinancialEvent{ID: "expense1", Type: "EXPENSE"}, 0, PriorityExpenses)
		queue.Add(FinancialEvent{ID: "income1", Type: "INCOME"}, 0, PriorityIncome)
		queue.Add(FinancialEvent{ID: "contribution1", Type: "CONTRIBUTION"}, 0, PriorityContributions)

		// Should process in priority order: Income (30) -> Expenses (60) -> Contributions (65)
		// Expenses come before contributions (pay bills before saving)
		event1 := queue.Next()
		if event1.Event.ID != "income1" {
			t.Errorf("Expected income1 first, got %s", event1.Event.ID)
		}

		event2 := queue.Next()
		if event2.Event.ID != "expense1" {
			t.Errorf("Expected expense1 second, got %s", event2.Event.ID)
		}

		event3 := queue.Next()
		if event3.Event.ID != "contribution1" {
			t.Errorf("Expected contribution1 third, got %s", event3.Event.ID)
		}

		if !queue.IsEmpty() {
			t.Error("Queue should be empty")
		}
	})

	t.Run("Multiple months ordering", func(t *testing.T) {
		queue := NewEventPriorityQueue()

		// Add events across different months
		queue.Add(FinancialEvent{ID: "expense_m1", Type: "EXPENSE"}, 1, PriorityExpenses)
		queue.Add(FinancialEvent{ID: "income_m0", Type: "INCOME"}, 0, PriorityIncome)
		queue.Add(FinancialEvent{ID: "expense_m0", Type: "EXPENSE"}, 0, PriorityExpenses)
		queue.Add(FinancialEvent{ID: "income_m1", Type: "INCOME"}, 1, PriorityIncome)

		// Should process all month 0 events first (by priority), then month 1
		expected := []string{"income_m0", "expense_m0", "income_m1", "expense_m1"}
		for _, expectedID := range expected {
			event := queue.Next()
			if event == nil {
				t.Fatalf("Expected event %s but queue was empty", expectedID)
			}
			if event.Event.ID != expectedID {
				t.Errorf("Expected %s, got %s", expectedID, event.Event.ID)
			}
		}
	})

	t.Run("System events integration", func(t *testing.T) {
		queue := NewEventPriorityQueue()

		// Add system events for month 0
		queue.AddSystemEvent(SystemEventTimeStep, 0, PriorityTimeStep)
		queue.AddSystemEvent(SystemEventMarketUpdate, 0, PriorityMarketUpdate)

		// Add user events
		queue.Add(FinancialEvent{ID: "income1", Type: "INCOME"}, 0, PriorityIncome)
		queue.Add(FinancialEvent{ID: "expense1", Type: "EXPENSE"}, 0, PriorityExpenses)

		// Should process in order: TimeStep (10) -> Income (30) -> Expense (60) -> MarketUpdate (110)
		expectedOrder := []string{
			"SYSTEM_TIME_STEP_0",
			"income1",
			"expense1",
			"SYSTEM_MARKET_UPDATE_0",
		}

		for _, expectedID := range expectedOrder {
			event := queue.Next()
			if event == nil {
				t.Fatalf("Expected event %s but queue was empty", expectedID)
			}
			if event.Event.ID != expectedID {
				t.Errorf("Expected %s, got %s", expectedID, event.Event.ID)
			}
		}
	})

	t.Run("Year-end events", func(t *testing.T) {
		queue := NewEventPriorityQueue()

		// Simulate December (month 11)
		month := 11

		// Add all system events for December
		queue.AddSystemEvent(SystemEventTimeStep, month, PriorityTimeStep)
		queue.AddSystemEvent(SystemEventRMDCheck, month, PriorityRMD)
		queue.AddSystemEvent(SystemEventTaxCheck, month, PriorityTaxCalculation)
		queue.AddSystemEvent(SystemEventYearEnd, month, PriorityYearEnd)

		// Add some user events
		queue.Add(FinancialEvent{ID: "income_dec", Type: "INCOME"}, month, PriorityIncome)
		queue.Add(FinancialEvent{ID: "expense_dec", Type: "EXPENSE"}, month, PriorityExpenses)

		// Verify processing order
		expectedPriorities := []EventPriority{
			PriorityTimeStep,       // 10
			PriorityIncome,         // 30
			PriorityExpenses,       // 60
			PriorityRMD,            // 105
			PriorityTaxCalculation, // 160
			PriorityYearEnd,        // 190
		}

		for _, expectedPriority := range expectedPriorities {
			event := queue.Next()
			if event == nil {
				t.Fatal("Queue unexpectedly empty")
			}
			if event.Priority != expectedPriority {
				t.Errorf("Expected priority %d, got %d for event %s",
					expectedPriority, event.Priority, event.Event.ID)
			}
		}
	})

	t.Run("PopulateQueueWithSystemEvents", func(t *testing.T) {
		queue := NewEventPriorityQueue()
		monthsToRun := 25 // More than 2 years to test year-end events (months 11 and 23 are December)

		PopulateQueueWithSystemEvents(queue, monthsToRun)

		// Count events by type
		eventCounts := make(map[string]int)
		for !queue.IsEmpty() {
			event := queue.Next()
			eventCounts[event.Event.Type]++
		}

		// Verify expected counts
		if eventCounts[SystemEventTimeStep] != monthsToRun {
			t.Errorf("Expected %d TIME_STEP events, got %d", monthsToRun, eventCounts[SystemEventTimeStep])
		}
		if eventCounts[SystemEventMarketUpdate] != monthsToRun {
			t.Errorf("Expected %d MARKET_UPDATE events, got %d", monthsToRun, eventCounts[SystemEventMarketUpdate])
		}
		if eventCounts[SystemEventCashCheck] != monthsToRun {
			t.Errorf("Expected %d CASH_CHECK events, got %d", monthsToRun, eventCounts[SystemEventCashCheck])
		}

		// Should have 2 year-end events (months 11 and 23 are December)
		expectedYearEndEvents := 2
		if eventCounts[SystemEventRMDCheck] != expectedYearEndEvents {
			t.Errorf("Expected %d RMD_CHECK events, got %d", expectedYearEndEvents, eventCounts[SystemEventRMDCheck])
		}
		if eventCounts[SystemEventTaxCheck] != expectedYearEndEvents {
			t.Errorf("Expected %d TAX_CHECK events, got %d", expectedYearEndEvents, eventCounts[SystemEventTaxCheck])
		}
		if eventCounts[SystemEventYearEnd] != expectedYearEndEvents {
			t.Errorf("Expected %d YEAR_END events, got %d", expectedYearEndEvents, eventCounts[SystemEventYearEnd])
		}
	})

	t.Run("GetEventPriority mapping", func(t *testing.T) {
		testCases := []struct {
			eventType string
			expected  EventPriority
		}{
			{"INCOME", PriorityIncome},
			{"EMPLOYMENT_INCOME", PriorityIncome},
			{"PENSION_INCOME", PriorityPensionIncome},
			{"SOCIAL_SECURITY", PrioritySocialSecurity},
			{"CONTRIBUTION", PriorityContributions},
			{"401K_CONTRIBUTION", PriorityContributions},
			{"EXPENSE", PriorityExpenses},
			{"MORTGAGE_PAYMENT", PriorityDebtPayment},
			{"ROTH_CONVERSION", PriorityRothConversion},
			{"TAX_PAYMENT", PriorityTaxPayment},
			{SystemEventTimeStep, PriorityTimeStep},
			{SystemEventMarketUpdate, PriorityMarketUpdate},
			{"UNKNOWN_TYPE", PriorityExpenses}, // Default case
		}

		for _, tc := range testCases {
			result := GetEventPriority(tc.eventType)
			if result != tc.expected {
				t.Errorf("GetEventPriority(%s) = %d, expected %d", tc.eventType, result, tc.expected)
			}
		}
	})
}
