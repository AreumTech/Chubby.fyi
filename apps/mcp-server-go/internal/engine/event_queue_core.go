
package engine

import (
	"container/heap"
	"strconv"
)

// This file contains the core event queue implementation that doesn't depend on WASM

// QueuedEventCore represents an event with its scheduling information
type QueuedEventCore struct {
	EventID     string
	EventType   string
	Description string
	Amount      float64
	MonthOffset int
	Priority    int
	Index       int // Required by heap.Interface
}

// EventQueueCore implements a priority queue for simulation events
type EventQueueCore struct {
	items []*QueuedEventCore
}

// Len returns the number of items in the queue
func (pq EventQueueCore) Len() int { return len(pq.items) }

// Less defines the ordering: first by MonthOffset, then by Priority
func (pq EventQueueCore) Less(i, j int) bool {
	if pq.items[i].MonthOffset != pq.items[j].MonthOffset {
		return pq.items[i].MonthOffset < pq.items[j].MonthOffset
	}
	return pq.items[i].Priority < pq.items[j].Priority
}

// Swap swaps two items in the queue
func (pq EventQueueCore) Swap(i, j int) {
	pq.items[i], pq.items[j] = pq.items[j], pq.items[i]
	pq.items[i].Index = i
	pq.items[j].Index = j
}

// Push adds an item to the queue
func (pq *EventQueueCore) Push(x interface{}) {
	n := len(pq.items)
	item := x.(*QueuedEventCore)
	item.Index = n
	pq.items = append(pq.items, item)
}

// Pop removes and returns the highest priority item
func (pq *EventQueueCore) Pop() interface{} {
	old := pq.items
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.Index = -1
	pq.items = old[0 : n-1]
	return item
}

// NewEventQueueCore creates a new priority queue
func NewEventQueueCore() *EventQueueCore {
	pq := &EventQueueCore{
		items: make([]*QueuedEventCore, 0),
	}
	heap.Init(pq)
	return pq
}

// AddEvent adds an event to the queue
func (pq *EventQueueCore) AddEvent(id, eventType, description string, amount float64, monthOffset, priority int) {
	item := &QueuedEventCore{
		EventID:     id,
		EventType:   eventType,
		Description: description,
		Amount:      amount,
		MonthOffset: monthOffset,
		Priority:    priority,
	}
	heap.Push(pq, item)
}

// AddSystemEvent adds a system-generated event
func (pq *EventQueueCore) AddSystemEvent(eventType string, monthOffset, priority int) {
	id := "SYSTEM_" + eventType + "_" + strconv.Itoa(monthOffset)
	description := "System event: " + eventType + " for month " + strconv.Itoa(monthOffset)
	pq.AddEvent(id, eventType, description, 0, monthOffset, priority)
}

// Next removes and returns the next event to process
func (pq *EventQueueCore) Next() *QueuedEventCore {
	if pq.Len() == 0 {
		return nil
	}
	return heap.Pop(pq).(*QueuedEventCore)
}

// IsEmpty returns true if the queue has no items
func (pq *EventQueueCore) IsEmpty() bool {
	return pq.Len() == 0
}

// Priority constants for testing
const (
	TestPriorityTimeStep       = 10
	TestPriorityIncome         = 30
	TestPriorityContributions  = 40
	TestPriorityExpenses       = 60
	TestPriorityRMD            = 105
	TestPriorityMarketUpdate   = 110
	TestPriorityTaxCalculation = 160
	TestPriorityYearEnd        = 190
)
