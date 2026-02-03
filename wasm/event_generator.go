package main

import (
	"fmt"
	"sort"
)

// EventGenerator interface for strategy events that generate atomic events
type EventGenerator interface {
	GenerateEvents(
		accounts *AccountHoldingsMonthEnd,
		config StrategySettings,
		currentMonth int,
		engine *SimulationEngine,
	) ([]QueuedEvent, error)
}

// RebalancingEventGenerator generates asset sale/purchase events based on rebalancing needs
type RebalancingEventGenerator struct{}

// GenerateEvents implements EventGenerator for rebalancing
func (reg *RebalancingEventGenerator) GenerateEvents(
	accounts *AccountHoldingsMonthEnd,
	config StrategySettings,
	currentMonth int,
	engine *SimulationEngine,
) ([]QueuedEvent, error) {
	var events []QueuedEvent

	// Check if rebalancing is needed based on thresholds
	params := config.Rebalancing
	allocation := config.AssetAllocation

	// Calculate current allocation vs target
	totalValue := calculateTotalPortfolioValue(accounts)
	if totalValue <= 0 {
		return events, nil // No portfolio to rebalance
	}

	currentAllocations := calculateCurrentAllocations(accounts, totalValue)
	targetAllocations := getTargetAllocations(allocation)

	// Check if any asset class exceeds threshold
	needsRebalancing := false
	var trades []RebalancingTrade

	// DETERMINISM FIX: Sort asset classes for consistent iteration order
	// Go maps have non-deterministic iteration order, which causes different
	// trade sequences between runs with the same seed
	sortedAssetClasses := getSortedAssetClassesFromAllocationMap(targetAllocations)

	for _, assetClass := range sortedAssetClasses {
		targetPercent := targetAllocations[assetClass]
		currentPercent := currentAllocations[assetClass]
		deviation := abs(currentPercent - targetPercent)

		if deviation > params.ThresholdPercentage {
			needsRebalancing = true

			targetValue := totalValue * targetPercent
			currentValue := totalValue * currentPercent
			tradeAmount := currentValue - targetValue

			if abs(tradeAmount) >= params.MinimumTradeSize {
				trades = append(trades, RebalancingTrade{
					AssetClass: assetClass,
					Amount:     tradeAmount, // Positive = sell, Negative = buy
				})
			}
		}
	}

	if !needsRebalancing {
		return events, nil
	}

	// Generate atomic events for each trade
	for _, trade := range trades {
		if trade.Amount > 0 {
			// Generate ASSET_SALE event
			saleEvent := QueuedEvent{
				Event: FinancialEvent{
					ID:          fmt.Sprintf("rebalance_sale_%s_%d", trade.AssetClass, currentMonth),
					Type:        "ASSET_SALE",
					Amount:      trade.Amount,
					Description: fmt.Sprintf("Rebalancing sale of %s", trade.AssetClass),
					Metadata: map[string]interface{}{
						"assetClass":   string(trade.AssetClass),
						"reason":       "rebalancing",
						"sourceEvent":  "STRATEGY_REBALANCING_RULE_SET",
						"accountType":  "taxable", // Prefer taxable for tax efficiency
					},
				},
				MonthOffset: currentMonth,
				Priority:    PriorityAssetSales,
			}
			events = append(events, saleEvent)
		} else if trade.Amount < 0 {
			// Generate ASSET_PURCHASE event
			purchaseEvent := QueuedEvent{
				Event: FinancialEvent{
					ID:          fmt.Sprintf("rebalance_buy_%s_%d", trade.AssetClass, currentMonth),
					Type:        "ASSET_PURCHASE",
					Amount:      -trade.Amount, // Convert to positive
					Description: fmt.Sprintf("Rebalancing purchase of %s", trade.AssetClass),
					Metadata: map[string]interface{}{
						"assetClass":   string(trade.AssetClass),
						"reason":       "rebalancing",
						"sourceEvent":  "STRATEGY_REBALANCING_RULE_SET",
						"accountType":  "taxable", // Prefer taxable for tax efficiency
					},
				},
				MonthOffset: currentMonth,
				Priority:    PriorityAssetPurchases,
			}
			events = append(events, purchaseEvent)
		}
	}

	return events, nil
}

// CashManagementEventGenerator generates events for cash shortfalls and excess cash
type CashManagementEventGenerator struct{}

// GenerateEvents implements EventGenerator for cash management
func (cmeg *CashManagementEventGenerator) GenerateEvents(
	accounts *AccountHoldingsMonthEnd,
	config StrategySettings,
	currentMonth int,
	engine *SimulationEngine,
) ([]QueuedEvent, error) {
	var events []QueuedEvent

	// Get cash management settings (simplified)
	targetCashReserve := 10000.0 // Default emergency fund target - could be made configurable
	currentCash := accounts.Cash

	if currentCash < targetCashReserve {
		// Generate asset sale for cash shortfall
		shortfall := targetCashReserve - currentCash

		saleEvent := QueuedEvent{
			Event: FinancialEvent{
				ID:          fmt.Sprintf("cash_mgmt_sale_%d", currentMonth),
				Type:        "ASSET_SALE",
				Amount:      shortfall,
				Description: fmt.Sprintf("Asset sale for cash shortfall: $%.0f", shortfall),
				Metadata: map[string]interface{}{
					"reason":      "cash_shortfall",
					"sourceEvent": "STRATEGY_CASH_MANAGEMENT",
					"targetCash":  targetCashReserve,
				},
			},
			MonthOffset: currentMonth,
			Priority:    PriorityAssetSales,
		}
		events = append(events, saleEvent)
	} else if currentCash > targetCashReserve*2 {
		// Generate asset purchase for excess cash
		excess := currentCash - targetCashReserve

		purchaseEvent := QueuedEvent{
			Event: FinancialEvent{
				ID:          fmt.Sprintf("cash_mgmt_buy_%d", currentMonth),
				Type:        "ASSET_PURCHASE",
				Amount:      excess,
				Description: fmt.Sprintf("Asset purchase with excess cash: $%.0f", excess),
				Metadata: map[string]interface{}{
					"reason":      "excess_cash",
					"sourceEvent": "STRATEGY_CASH_MANAGEMENT",
					"assetClass":  "AssetClassUSStocksTotalMarket", // Default allocation
				},
			},
			MonthOffset: currentMonth,
			Priority:    PriorityAssetPurchases,
		}
		events = append(events, purchaseEvent)
	}

	return events, nil
}

// Helper types and functions
type RebalancingTrade struct {
	AssetClass AssetClass
	Amount     float64 // Positive = sell, Negative = buy
}

func calculateTotalPortfolioValue(accounts *AccountHoldingsMonthEnd) float64 {
	total := accounts.Cash

	if accounts.Taxable != nil {
		for _, holding := range accounts.Taxable.Holdings {
			total += holding.CurrentMarketValueTotal
		}
	}

	if accounts.TaxDeferred != nil {
		for _, holding := range accounts.TaxDeferred.Holdings {
			total += holding.CurrentMarketValueTotal
		}
	}

	if accounts.Roth != nil {
		for _, holding := range accounts.Roth.Holdings {
			total += holding.CurrentMarketValueTotal
		}
	}

	return total
}

func calculateCurrentAllocations(accounts *AccountHoldingsMonthEnd, totalValue float64) map[AssetClass]float64 {
	allocations := make(map[AssetClass]float64)

	if totalValue <= 0 {
		return allocations
	}

	// Count holdings across all accounts
	for _, account := range []*Account{accounts.Taxable, accounts.TaxDeferred, accounts.Roth} {
		if account != nil {
			for _, holding := range account.Holdings {
				allocations[holding.AssetClass] += holding.CurrentMarketValueTotal / totalValue
			}
		}
	}

	return allocations
}

func getTargetAllocations(allocation AssetAllocationStrategy) map[AssetClass]float64 {
	// Use allocations from strategy configuration if available
	if allocation.Allocations != nil && len(allocation.Allocations) > 0 {
		return allocation.Allocations
	}

	// Fall back to default allocation if none specified
	targets := make(map[AssetClass]float64)
	targets[AssetClassUSStocksTotalMarket] = 0.50
	targets[AssetClassInternationalStocks] = 0.20
	targets[AssetClassUSBondsTotalMarket] = 0.30

	return targets
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// getSortedAssetClassesFromAllocationMap returns asset classes from a map in deterministic sorted order
func getSortedAssetClassesFromAllocationMap(m map[AssetClass]float64) []AssetClass {
	keys := make([]AssetClass, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return string(keys[i]) < string(keys[j])
	})
	return keys
}