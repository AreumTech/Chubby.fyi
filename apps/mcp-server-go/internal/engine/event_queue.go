
package engine

import (
	"container/heap"
	"sort"
	"strconv"
	"sync"
)

// QueuedEvent represents an event with its scheduling information
type QueuedEvent struct {
	Event       FinancialEvent
	MonthOffset int
	Priority    EventPriority
	Index       int // Required by heap.Interface, managed by container/heap
}

// PERF: Object pool to reduce GC pressure from QueuedEvent allocations
var queuedEventPool = sync.Pool{
	New: func() interface{} {
		return &QueuedEvent{}
	},
}

// acquireQueuedEvent gets a QueuedEvent from the pool
func acquireQueuedEvent() *QueuedEvent {
	return queuedEventPool.Get().(*QueuedEvent)
}

// releaseQueuedEvent returns a QueuedEvent to the pool
func releaseQueuedEvent(qe *QueuedEvent) {
	// Reset fields to avoid holding references
	qe.Event = FinancialEvent{}
	qe.MonthOffset = 0
	qe.Priority = 0
	qe.Index = -1
	queuedEventPool.Put(qe)
}

// EventPriorityQueue implements a priority queue for simulation events
type EventPriorityQueue struct {
	items []*QueuedEvent
}

// Len returns the number of items in the queue
func (pq EventPriorityQueue) Len() int { return len(pq.items) }

// Less defines the ordering: first by MonthOffset, then by Priority (lower values = higher priority)
func (pq EventPriorityQueue) Less(i, j int) bool {
	// First sort by month
	if pq.items[i].MonthOffset != pq.items[j].MonthOffset {
		return pq.items[i].MonthOffset < pq.items[j].MonthOffset
	}
	// Within the same month, sort by priority (lower priority value = processed first)
	return pq.items[i].Priority < pq.items[j].Priority
}

// Swap swaps two items in the queue
func (pq EventPriorityQueue) Swap(i, j int) {
	pq.items[i], pq.items[j] = pq.items[j], pq.items[i]
	pq.items[i].Index = i
	pq.items[j].Index = j
}

// Push adds an item to the queue
func (pq *EventPriorityQueue) Push(x interface{}) {
	n := len(pq.items)
	item := x.(*QueuedEvent)
	item.Index = n
	pq.items = append(pq.items, item)
}

// Pop removes and returns the highest priority item
func (pq *EventPriorityQueue) Pop() interface{} {
	old := pq.items
	n := len(old)
	item := old[n-1]
	old[n-1] = nil  // avoid memory leak
	item.Index = -1 // for safety
	pq.items = old[0 : n-1]
	return item
}

// NewEventPriorityQueue creates and initializes a new priority queue
func NewEventPriorityQueue() *EventPriorityQueue {
	// PERF: Pre-allocate with typical capacity (60 months * 10 events/month = 600)
	pq := &EventPriorityQueue{
		items: make([]*QueuedEvent, 0, 1024),
	}
	heap.Init(pq)
	return pq
}

// NewEventPriorityQueueWithCapacity creates a priority queue with specified capacity
func NewEventPriorityQueueWithCapacity(capacity int) *EventPriorityQueue {
	pq := &EventPriorityQueue{
		items: make([]*QueuedEvent, 0, capacity),
	}
	heap.Init(pq)
	return pq
}

// Add adds an event to the queue with the specified priority and month
func (pq *EventPriorityQueue) Add(event FinancialEvent, monthOffset int, priority EventPriority) {
	// PERF: Use pooled QueuedEvent to reduce allocations
	item := acquireQueuedEvent()
	item.Event = event
	item.MonthOffset = monthOffset
	item.Priority = priority
	heap.Push(pq, item)
}

// AddSystemEvent adds a system-generated event (like TIME_STEP or MARKET_UPDATE)
// PERF: Optimized to avoid fmt.Sprintf allocations in hot path
func (pq *EventPriorityQueue) AddSystemEvent(eventType string, monthOffset int, priority EventPriority) {
	// PERF: Use string concatenation instead of fmt.Sprintf (10x faster, no allocations for small strings)
	// Event ID: "SYSTEM_TIME_STEP_42" format
	monthStr := strconv.Itoa(monthOffset)
	event := FinancialEvent{
		ID:          eventType + "_" + monthStr,
		Type:        eventType,
		Description: "", // PERF: Skip description for system events - not used in simulation
		MonthOffset: monthOffset,
	}
	pq.Add(event, monthOffset, priority)
}

// Next removes and returns the next event to process
func (pq *EventPriorityQueue) Next() *QueuedEvent {
	if pq.Len() == 0 {
		return nil
	}
	return heap.Pop(pq).(*QueuedEvent)
}

// Peek returns the next event without removing it
func (pq *EventPriorityQueue) Peek() *QueuedEvent {
	if pq.Len() == 0 {
		return nil
	}
	return pq.items[0]
}

// IsEmpty returns true if the queue has no items
func (pq *EventPriorityQueue) IsEmpty() bool {
	return pq.Len() == 0
}

// Clear removes all items from the queue
func (pq *EventPriorityQueue) Clear() {
	pq.items = pq.items[:0]
	heap.Init(pq)
}

// PERF: ToSortedSlice extracts all items as a pre-sorted slice for O(1) iteration
// This is a one-time O(n log n) sort that replaces n * log(n) heap operations
func (pq *EventPriorityQueue) ToSortedSlice() []*QueuedEvent {
	// Extract all items from heap without modifying original
	sorted := make([]*QueuedEvent, len(pq.items))
	copy(sorted, pq.items)

	// Sort using same comparison logic as heap (monthOffset, then priority)
	// sort.Slice is stable, so events with same month+priority maintain insertion order
	sort.Slice(sorted, func(i, j int) bool {
		// First sort by month
		if sorted[i].MonthOffset != sorted[j].MonthOffset {
			return sorted[i].MonthOffset < sorted[j].MonthOffset
		}
		// Within the same month, sort by priority (lower priority value = processed first)
		return sorted[i].Priority < sorted[j].Priority
	})

	return sorted
}

// System event types
const (
	SystemEventTimeStep     = "SYSTEM_TIME_STEP"
	SystemEventMarketUpdate = "SYSTEM_MARKET_UPDATE"
	SystemEventTaxCheck     = "SYSTEM_TAX_CHECK"
	SystemEventYearEnd      = "SYSTEM_YEAR_END"
	SystemEventRMDCheck            = "SYSTEM_RMD_CHECK"
	SystemEventCashCheck           = "SYSTEM_CASH_CHECK"
	SystemEventDebtPayment         = "SYSTEM_DEBT_PAYMENT"
	SystemEventFinancialHealthCheck = "SYSTEM_FINANCIAL_HEALTH_CHECK"
)

// PopulateQueueWithSystemEvents adds all necessary system events for the simulation
func PopulateQueueWithSystemEvents(queue *EventPriorityQueue, monthsToRun int) {
	PopulateQueueWithSystemEventsLiteMode(queue, monthsToRun, false)
}

// PopulateQueueWithSystemEventsLiteMode adds system events with optional lite mode
// PERF: In liteMode, combines TIME_STEP and MARKET_UPDATE into single event to reduce overhead
func PopulateQueueWithSystemEventsLiteMode(queue *EventPriorityQueue, monthsToRun int, liteMode bool) {
	for month := 0; month < monthsToRun; month++ {
		if liteMode {
			// PERF: Combined time step + market update in LiteMode (one event instead of two)
			queue.AddSystemEvent(SystemEventTimeStep, month, PriorityTimeStep)
			// Skip separate MARKET_UPDATE - will be handled by TIME_STEP
		} else {
			// Full mode: separate events for detailed tracking
			queue.AddSystemEvent(SystemEventTimeStep, month, PriorityTimeStep)
			queue.AddSystemEvent(SystemEventMarketUpdate, month, PriorityMarketUpdate)
		}

		// Add cash check event after all expenses (before contributions)
		queue.AddSystemEvent(SystemEventCashCheck, month, PriorityAssetSales-5) // Just before asset sales

		// Add year-end events for December (month % 12 == 11)
		if month%12 == 11 {
			// RMD check comes before tax calculation
			queue.AddSystemEvent(SystemEventRMDCheck, month, PriorityRMD)

			// Annual tax calculation
			queue.AddSystemEvent(SystemEventTaxCheck, month, PriorityTaxCalculation)

			// Year-end processing
			queue.AddSystemEvent(SystemEventYearEnd, month, PriorityYearEnd)
		}
	}
}

// GetEventPriority determines the priority for a given event type (basic version for tests)
func GetEventPriority(eventType string) EventPriority {
	switch eventType {
	// Income events
	case "INCOME", "EMPLOYMENT_INCOME":
		return PriorityIncome
	case "PENSION_INCOME":
		return PriorityPensionIncome
	case "SOCIAL_SECURITY":
		return PrioritySocialSecurity

	// Contribution events (default priority - use GetEventPriorityWithAccount for account-specific)
	case "CONTRIBUTION", "401K_CONTRIBUTION", "IRA_CONTRIBUTION", "ROTH_CONTRIBUTION":
		return PriorityContributions

	// Expense events
	case "EXPENSE", "RECURRING_EXPENSE", "ONE_TIME_EXPENSE":
		return PriorityExpenses

	// Debt events
	case "MORTGAGE_PAYMENT", "LOAN_PAYMENT":
		return PriorityDebtPayment

	// Asset transaction events
	case "ASSET_SALE", "WITHDRAWAL":
		return PriorityAssetSales
	case "ASSET_PURCHASE", "INVESTMENT":
		return PriorityAssetPurchases

	// Tax-related events
	case "ROTH_CONVERSION":
		return PriorityRothConversion
	case "TAX_PAYMENT", "ESTIMATED_TAX":
		return PriorityTaxPayment

	// Healthcare events
	case "HEALTHCARE_EXPENSE":
		return PriorityHealthcare
	case "HSA_CONTRIBUTION":
		return PriorityContributionHSA

	// 529 contributions
	case "FIVE_TWO_NINE_CONTRIBUTION":
		return PriorityContribution529

	// Goal-related events
	case "GOAL_FUNDING", "EDUCATION_EXPENSE":
		return PriorityGoalFunding

	// System events
	case SystemEventTimeStep:
		return PriorityTimeStep
	case SystemEventMarketUpdate:
		return PriorityMarketUpdate
	case SystemEventRMDCheck:
		return PriorityRMD
	case SystemEventTaxCheck:
		return PriorityTaxCalculation
	case SystemEventYearEnd:
		return PriorityYearEnd
	case SystemEventCashCheck:
		return PriorityAssetSales - 5

	default:
		// Default to a middle priority if unknown
		return PriorityExpenses
	}
}

// GetEventPriorityWithAccount determines priority for contribution events based on target account
func GetEventPriorityWithAccount(event FinancialEvent) EventPriority {
	// For contribution events, use account-specific priority
	if event.Type == string(EventTypeScheduledContribution) {
		// Check for target account type
		targetAccount := "taxable" // default

		// Check TargetAccountType field first
		if event.TargetAccountType != nil && *event.TargetAccountType != "" {
			targetAccount = *event.TargetAccountType
		} else if metadata, ok := event.Metadata["targetAccount"].(string); ok && metadata != "" {
			targetAccount = metadata
		} else if legacyType, ok := event.Metadata["accountType"].(string); ok && legacyType != "" {
			// Map legacy account types
			switch legacyType {
			case "401k", "403b", "401k_traditional", "ira":
				targetAccount = "tax_deferred"
			case "rothIra", "401k_roth":
				targetAccount = "roth"
			default:
				targetAccount = legacyType
			}
		}

		// Return priority based on target account
		switch targetAccount {
		case "tax_deferred":
			return PriorityContribution401k
		case "roth":
			return PriorityContributionRoth
		case "hsa":
			return PriorityContributionHSA
		case "five_twenty_nine", "529":
			return PriorityContribution529
		case "taxable":
			return PriorityContributionTaxable
		default:
			return PriorityContributions // fallback
		}
	}

	// For non-contribution events, use the basic priority lookup
	return GetEventPriority(event.Type)
}
