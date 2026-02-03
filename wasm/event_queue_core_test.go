//go:build !wasm || !js
// +build !wasm !js

package main

import (
	"fmt"
	"testing"
)

func TestEventQueueCore(t *testing.T) {
	t.Run("Basic queue operations", func(t *testing.T) {
		queue := NewEventQueueCore()

		// Add events in random order
		queue.AddEvent("expense1", "EXPENSE", "Monthly expense", 1000, 0, TestPriorityExpenses)
		queue.AddEvent("income1", "INCOME", "Salary", 5000, 0, TestPriorityIncome)
		queue.AddEvent("contribution1", "CONTRIBUTION", "401k", 500, 0, TestPriorityContributions)

		// Should process in priority order: Income (30) -> Contributions (40) -> Expenses (60)
		event1 := queue.Next()
		if event1.EventID != "income1" {
			t.Errorf("Expected income1 first, got %s", event1.EventID)
		}

		event2 := queue.Next()
		if event2.EventID != "contribution1" {
			t.Errorf("Expected contribution1 second, got %s", event2.EventID)
		}

		event3 := queue.Next()
		if event3.EventID != "expense1" {
			t.Errorf("Expected expense1 third, got %s", event3.EventID)
		}

		if !queue.IsEmpty() {
			t.Error("Queue should be empty")
		}
	})

	t.Run("Multiple months ordering", func(t *testing.T) {
		queue := NewEventQueueCore()

		// Add events across different months
		queue.AddEvent("expense_m1", "EXPENSE", "Expense month 1", 1000, 1, TestPriorityExpenses)
		queue.AddEvent("income_m0", "INCOME", "Income month 0", 5000, 0, TestPriorityIncome)
		queue.AddEvent("expense_m0", "EXPENSE", "Expense month 0", 1000, 0, TestPriorityExpenses)
		queue.AddEvent("income_m1", "INCOME", "Income month 1", 5000, 1, TestPriorityIncome)

		// Should process all month 0 events first (by priority), then month 1
		expected := []string{"income_m0", "expense_m0", "income_m1", "expense_m1"}
		for _, expectedID := range expected {
			event := queue.Next()
			if event == nil {
				t.Fatalf("Expected event %s but queue was empty", expectedID)
			}
			if event.EventID != expectedID {
				t.Errorf("Expected %s, got %s", expectedID, event.EventID)
			}
		}
	})

	t.Run("System events integration", func(t *testing.T) {
		queue := NewEventQueueCore()

		// Add system events for month 0
		queue.AddSystemEvent("TIME_STEP", 0, TestPriorityTimeStep)
		queue.AddSystemEvent("MARKET_UPDATE", 0, TestPriorityMarketUpdate)

		// Add user events
		queue.AddEvent("income1", "INCOME", "Salary", 5000, 0, TestPriorityIncome)
		queue.AddEvent("expense1", "EXPENSE", "Rent", 2000, 0, TestPriorityExpenses)

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
			if event.EventID != expectedID {
				t.Errorf("Expected %s, got %s", expectedID, event.EventID)
			}
		}
	})

	t.Run("Year-end events priority", func(t *testing.T) {
		queue := NewEventQueueCore()

		// Simulate December (month 11)
		month := 11

		// Add all system events for December
		queue.AddSystemEvent("TIME_STEP", month, TestPriorityTimeStep)
		queue.AddSystemEvent("RMD_CHECK", month, TestPriorityRMD)
		queue.AddSystemEvent("TAX_CHECK", month, TestPriorityTaxCalculation)
		queue.AddSystemEvent("YEAR_END", month, TestPriorityYearEnd)

		// Add some user events
		queue.AddEvent("income_dec", "INCOME", "December salary", 5000, month, TestPriorityIncome)
		queue.AddEvent("expense_dec", "EXPENSE", "December rent", 2000, month, TestPriorityExpenses)

		// Verify processing order by priority
		expectedPriorities := []int{
			TestPriorityTimeStep,       // 10
			TestPriorityIncome,         // 30
			TestPriorityExpenses,       // 60
			TestPriorityRMD,            // 105
			TestPriorityTaxCalculation, // 160
			TestPriorityYearEnd,        // 190
		}

		for _, expectedPriority := range expectedPriorities {
			event := queue.Next()
			if event == nil {
				t.Fatal("Queue unexpectedly empty")
			}
			if event.Priority != expectedPriority {
				t.Errorf("Expected priority %d, got %d for event %s",
					expectedPriority, event.Priority, event.EventID)
			}
		}
	})

	t.Run("Large scale simulation", func(t *testing.T) {
		queue := NewEventQueueCore()
		monthsToRun := 120 // 10 years

		// Add system events for each month
		for month := 0; month < monthsToRun; month++ {
			queue.AddSystemEvent("TIME_STEP", month, TestPriorityTimeStep)
			queue.AddSystemEvent("MARKET_UPDATE", month, TestPriorityMarketUpdate)

			// Add typical monthly events
			queue.AddEvent(
				fmt.Sprintf("income_%d", month),
				"INCOME",
				"Monthly salary",
				5000,
				month,
				TestPriorityIncome,
			)
			queue.AddEvent(
				fmt.Sprintf("expense_%d", month),
				"EXPENSE",
				"Monthly expenses",
				3000,
				month,
				TestPriorityExpenses,
			)

			// Add year-end events for December
			if month%12 == 11 {
				queue.AddSystemEvent("TAX_CHECK", month, TestPriorityTaxCalculation)
				queue.AddSystemEvent("YEAR_END", month, TestPriorityYearEnd)
			}
		}

		// Process all events and verify ordering
		lastMonth := -1
		lastPriority := -1
		eventCount := 0

		for !queue.IsEmpty() {
			event := queue.Next()
			eventCount++

			// Verify month ordering
			if event.MonthOffset < lastMonth {
				t.Errorf("Month went backward: %d -> %d", lastMonth, event.MonthOffset)
			}

			// Verify priority ordering within same month
			if event.MonthOffset == lastMonth && event.Priority < lastPriority {
				t.Errorf("Priority went backward in month %d: %d -> %d",
					event.MonthOffset, lastPriority, event.Priority)
			}

			// Update tracking
			if event.MonthOffset > lastMonth {
				lastMonth = event.MonthOffset
				lastPriority = event.Priority
			} else {
				lastPriority = event.Priority
			}
		}

		// Verify we processed the expected number of events
		// 4 regular events per month + 2 extra for year-end months (10 times)
		expectedEvents := monthsToRun*4 + 10*2
		if eventCount != expectedEvents {
			t.Errorf("Expected %d events, processed %d", expectedEvents, eventCount)
		}
	})
}
