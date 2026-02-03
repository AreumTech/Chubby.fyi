package main

import (
	"math"
	"sort"
)

/**
 * Tax-Aware Rebalancer
 *
 * Implements tax-efficient portfolio rebalancing strategies to minimize tax drag.
 * Critical for taxable accounts where rebalancing can trigger capital gains tax.
 *
 * Key Principles:
 * 1. Rebalance tax-deferred accounts first (no immediate tax)
 * 2. Use new contributions to rebalance (avoid sales)
 * 3. Harvest tax losses opportunistically
 * 4. Defer gains when in high tax bracket
 * 5. Avoid short-term capital gains (taxed as ordinary income)
 * 6. Respect wash sale rules (30-day window)
 *
 * Tax-Loss Harvesting:
 * - Sell positions with losses to offset gains
 * - Can deduct $3,000/year against ordinary income
 * - Carry forward unused losses indefinitely
 * - Watch for wash sales (repurchase within 30 days)
 * - Replace with similar but not "substantially identical" security
 *
 * Capital Gains Tax Rates (2024):
 * - Short-term (<1 year): Ordinary income rates (10-37%)
 * - Long-term (>1 year): 0%, 15%, or 20% depending on income
 * - NIIT: Additional 3.8% on investment income over threshold
 *
 * Asset Location Optimization:
 * - Tax-inefficient in tax-deferred: Bonds, REITs, active funds
 * - Tax-efficient in taxable: Index funds, municipal bonds, growth stocks
 * - Roth for highest expected growth: Small-cap, international
 *
 * Rebalancing Thresholds:
 * - Typical: 5% absolute or 20% relative deviation
 * - Tax-aware: Higher thresholds in taxable accounts
 * - Consider transaction costs and tax impact
 *
 * Best Practices:
 * - Annual review, rebalance only when needed
 * - Use cash flows (dividends, contributions) to rebalance
 * - Prioritize tax-advantaged accounts for rebalancing
 * - Consider "tolerance bands" instead of exact targets
 * - Time harvesting losses with high-income years
 *
 * References:
 * - "The Bogleheads' Guide to Investing" (Tax-Efficient Strategies)
 * - IRS Publication 550 (Investment Income and Expenses)
 * - Vanguard Research: "The Value of Tax-Loss Harvesting"
 * - Kitces.com: "Tax-Efficient Portfolio Rebalancing"
 */

// AccountLot represents a specific tax lot of securities
type AccountLot struct {
	AssetClass       string
	PurchaseDate     int     // Year purchased
	CostBasis        float64 // Original purchase price
	CurrentValue     float64 // Current market value
	Shares           float64 // Number of shares
	ShortTermGains   bool    // True if held <1 year
}

// PortfolioAccount represents a single investment account
type PortfolioAccount struct {
	AccountType      string // "taxable", "tax_deferred", "roth"
	Lots             []AccountLot
	CashBalance      float64
	TotalValue       float64
}

// AssetAllocation represents target and current asset allocation
type AssetAllocation struct {
	AssetClass       string
	TargetPercent    float64 // Target allocation (0-1)
	CurrentPercent   float64 // Current allocation (0-1)
	CurrentValue     float64
	TargetValue      float64
	Deviation        float64 // Absolute deviation from target
}

// RebalanceAction represents a proposed rebalancing trade
type RebalanceAction struct {
	FromAsset        string
	ToAsset          string
	Amount           float64
	AccountType      string
	TaxCost          float64 // Estimated tax from the trade
	Lots             []AccountLot // Specific lots to sell
}

// TaxLossHarvestingOpportunity represents a potential tax-loss harvest
type TaxLossHarvestingOpportunity struct {
	AssetClass       string
	AccountType      string
	Lot              AccountLot
	RealizedLoss     float64
	TaxSavings       float64 // Estimated tax savings
	ReplacementAsset string  // Similar but not identical asset
}

// TaxAwareRebalancer implements tax-efficient rebalancing
type TaxAwareRebalancer struct {
	accounts                []PortfolioAccount
	targetAllocation        map[string]float64 // AssetClass -> target %
	rebalanceThreshold      float64            // Absolute deviation to trigger rebalance
	taxBracket              float64            // Marginal tax rate
	longTermCapGainsRate    float64            // Long-term cap gains rate
	carriedForwardLosses    float64            // Tax losses carried forward from prior years
	currentYear             int
}

// NewTaxAwareRebalancer creates a rebalancer with default settings
func NewTaxAwareRebalancer(currentYear int) *TaxAwareRebalancer {
	return &TaxAwareRebalancer{
		accounts:             make([]PortfolioAccount, 0),
		targetAllocation:     make(map[string]float64),
		rebalanceThreshold:   0.05, // 5% absolute deviation
		taxBracket:           0.24,  // 24% marginal rate
		longTermCapGainsRate: 0.15,  // 15% long-term cap gains
		currentYear:          currentYear,
	}
}

// AddAccount adds an account to the portfolio
func (reb *TaxAwareRebalancer) AddAccount(account PortfolioAccount) {
	reb.accounts = append(reb.accounts, account)
}

// SetTargetAllocation sets target allocation percentages
func (reb *TaxAwareRebalancer) SetTargetAllocation(assetClass string, targetPercent float64) {
	reb.targetAllocation[assetClass] = targetPercent
}

// SetTaxRates updates tax rate assumptions
func (reb *TaxAwareRebalancer) SetTaxRates(marginalRate float64, capGainsRate float64) {
	reb.taxBracket = marginalRate
	reb.longTermCapGainsRate = capGainsRate
}

// CalculateCurrentAllocation calculates current portfolio allocation
func (reb *TaxAwareRebalancer) CalculateCurrentAllocation() []AssetAllocation {
	// Calculate total portfolio value
	totalValue := 0.0
	assetValues := make(map[string]float64)

	for _, account := range reb.accounts {
		for _, lot := range account.Lots {
			assetValues[lot.AssetClass] += lot.CurrentValue
			totalValue += lot.CurrentValue
		}
	}

	// Build allocation array
	allocations := make([]AssetAllocation, 0)
	for assetClass, targetPercent := range reb.targetAllocation {
		currentValue := assetValues[assetClass]
		currentPercent := currentValue / totalValue
		targetValue := totalValue * targetPercent
		deviation := currentPercent - targetPercent

		allocations = append(allocations, AssetAllocation{
			AssetClass:     assetClass,
			TargetPercent:  targetPercent,
			CurrentPercent: currentPercent,
			CurrentValue:   currentValue,
			TargetValue:    targetValue,
			Deviation:      deviation,
		})
	}

	return allocations
}

// NeedsRebalancing returns true if portfolio deviates from target
func (reb *TaxAwareRebalancer) NeedsRebalancing() bool {
	allocations := reb.CalculateCurrentAllocation()

	for _, alloc := range allocations {
		if math.Abs(alloc.Deviation) > reb.rebalanceThreshold {
			return true
		}
	}

	return false
}

// GenerateRebalancePlan creates tax-efficient rebalancing plan
func (reb *TaxAwareRebalancer) GenerateRebalancePlan() []RebalanceAction {
	actions := make([]RebalanceAction, 0)
	allocations := reb.CalculateCurrentAllocation()

	// Sort by deviation (largest overweight first)
	sort.Slice(allocations, func(i, j int) bool {
		return allocations[i].Deviation > allocations[j].Deviation
	})

	// Identify overweight and underweight assets
	overweight := make([]AssetAllocation, 0)
	underweight := make([]AssetAllocation, 0)

	for _, alloc := range allocations {
		if alloc.Deviation > reb.rebalanceThreshold {
			overweight = append(overweight, alloc)
		} else if alloc.Deviation < -reb.rebalanceThreshold {
			underweight = append(underweight, alloc)
		}
	}

	// Strategy 1: Rebalance in tax-deferred accounts first (no tax cost)
	actions = append(actions, reb.rebalanceInTaxDeferredAccounts(overweight, underweight)...)

	// Strategy 2: Use new cash contributions
	actions = append(actions, reb.rebalanceWithContributions(underweight)...)

	// Strategy 3: Tax-loss harvest in taxable accounts
	actions = append(actions, reb.rebalanceWithTaxLossHarvesting(overweight, underweight)...)

	// Strategy 4: If still needed, rebalance in taxable (incur tax)
	actions = append(actions, reb.rebalanceTaxableAccounts(overweight, underweight)...)

	return actions
}

// rebalanceInTaxDeferredAccounts rebalances tax-advantaged accounts (no tax)
func (reb *TaxAwareRebalancer) rebalanceInTaxDeferredAccounts(
	overweight []AssetAllocation,
	underweight []AssetAllocation,
) []RebalanceAction {
	actions := make([]RebalanceAction, 0)

	for _, account := range reb.accounts {
		// Only rebalance tax-advantaged accounts here
		if account.AccountType == "taxable" {
			continue
		}

		// For each overweight asset, sell and buy underweight
		for _, over := range overweight {
			for _, under := range underweight {
				// Find lots in this account for overweight asset
				var lotsToSell []AccountLot
				sellAmount := 0.0

				for _, lot := range account.Lots {
					if lot.AssetClass == over.AssetClass {
						lotsToSell = append(lotsToSell, lot)
						sellAmount += lot.CurrentValue
					}
				}

				if sellAmount > 0 {
					// Don't sell more than needed
					needed := over.CurrentValue - over.TargetValue
					if sellAmount > needed {
						sellAmount = needed
					}

					actions = append(actions, RebalanceAction{
						FromAsset:   over.AssetClass,
						ToAsset:     under.AssetClass,
						Amount:      sellAmount,
						AccountType: account.AccountType,
						TaxCost:     0, // No tax in tax-deferred accounts
						Lots:        lotsToSell,
					})
				}
			}
		}
	}

	return actions
}

// rebalanceWithContributions uses new cash to rebalance
func (reb *TaxAwareRebalancer) rebalanceWithContributions(
	underweight []AssetAllocation,
) []RebalanceAction {
	actions := make([]RebalanceAction, 0)

	// Check available cash across all accounts
	for _, account := range reb.accounts {
		if account.CashBalance <= 0 {
			continue
		}

		// Allocate cash to most underweight assets
		remainingCash := account.CashBalance

		for _, under := range underweight {
			if remainingCash <= 0 {
				break
			}

			needed := under.TargetValue - under.CurrentValue
			allocation := needed
			if allocation > remainingCash {
				allocation = remainingCash
			}

			actions = append(actions, RebalanceAction{
				FromAsset:   "cash",
				ToAsset:     under.AssetClass,
				Amount:      allocation,
				AccountType: account.AccountType,
				TaxCost:     0, // No tax on contributions
				Lots:        []AccountLot{},
			})

			remainingCash -= allocation
		}
	}

	return actions
}

// rebalanceWithTaxLossHarvesting harvests losses opportunistically
func (reb *TaxAwareRebalancer) rebalanceWithTaxLossHarvesting(
	overweight []AssetAllocation,
	underweight []AssetAllocation,
) []RebalanceAction {
	actions := make([]RebalanceAction, 0)

	// Find tax-loss harvesting opportunities
	opportunities := reb.FindTaxLossHarvestingOpportunities()

	for _, opp := range opportunities {
		// Check if this asset is overweight
		isOverweight := false
		for _, over := range overweight {
			if over.AssetClass == opp.AssetClass {
				isOverweight = true
				break
			}
		}

		if !isOverweight {
			continue // Only harvest if overweight
		}

		// Harvest the loss
		actions = append(actions, RebalanceAction{
			FromAsset:   opp.AssetClass,
			ToAsset:     opp.ReplacementAsset,
			Amount:      opp.Lot.CurrentValue,
			AccountType: opp.AccountType,
			TaxCost:     -opp.TaxSavings, // Negative = tax benefit
			Lots:        []AccountLot{opp.Lot},
		})
	}

	return actions
}

// rebalanceTaxableAccounts rebalances taxable accounts (may incur tax)
func (reb *TaxAwareRebalancer) rebalanceTaxableAccounts(
	overweight []AssetAllocation,
	underweight []AssetAllocation,
) []RebalanceAction {
	actions := make([]RebalanceAction, 0)

	for _, account := range reb.accounts {
		if account.AccountType != "taxable" {
			continue
		}

		// Only proceed if deviation is significant
		for _, over := range overweight {
			if math.Abs(over.Deviation) < reb.rebalanceThreshold*2 {
				continue // Use higher threshold for taxable
			}

			// Find lots with lowest tax cost
			lotsToSell := reb.selectLotsWithLowestTaxCost(account, over.AssetClass)

			if len(lotsToSell) == 0 {
				continue
			}

			// Calculate tax cost
			taxCost := 0.0
			sellAmount := 0.0
			for _, lot := range lotsToSell {
				gain := lot.CurrentValue - lot.CostBasis
				if gain > 0 {
					if lot.ShortTermGains {
						taxCost += gain * reb.taxBracket
					} else {
						taxCost += gain * reb.longTermCapGainsRate
					}
				}
				sellAmount += lot.CurrentValue
			}

			// Only proceed if tax cost is reasonable (<1% of amount)
			if taxCost > sellAmount*0.01 {
				continue
			}

			for _, under := range underweight {
				actions = append(actions, RebalanceAction{
					FromAsset:   over.AssetClass,
					ToAsset:     under.AssetClass,
					Amount:      sellAmount,
					AccountType: account.AccountType,
					TaxCost:     taxCost,
					Lots:        lotsToSell,
				})
				break
			}
		}
	}

	return actions
}

// selectLotsWithLowestTaxCost selects lots that minimize tax impact
func (reb *TaxAwareRebalancer) selectLotsWithLowestTaxCost(
	account PortfolioAccount,
	assetClass string,
) []AccountLot {
	// Find all lots of this asset
	lots := make([]AccountLot, 0)
	for _, lot := range account.Lots {
		if lot.AssetClass == assetClass {
			lots = append(lots, lot)
		}
	}

	if len(lots) == 0 {
		return lots
	}

	// Sort by tax cost (prefer losses first, then long-term gains)
	sort.Slice(lots, func(i, j int) bool {
		gainI := lots[i].CurrentValue - lots[i].CostBasis
		gainJ := lots[j].CurrentValue - lots[j].CostBasis

		// Prefer losses
		if gainI < 0 && gainJ >= 0 {
			return true
		}
		if gainI >= 0 && gainJ < 0 {
			return false
		}

		// Both gains: prefer long-term
		if lots[i].ShortTermGains && !lots[j].ShortTermGains {
			return false
		}
		if !lots[i].ShortTermGains && lots[j].ShortTermGains {
			return true
		}

		// Same term: prefer smaller gain
		return gainI < gainJ
	})

	return lots
}

// FindTaxLossHarvestingOpportunities finds opportunities to harvest losses
func (reb *TaxAwareRebalancer) FindTaxLossHarvestingOpportunities() []TaxLossHarvestingOpportunity {
	opportunities := make([]TaxLossHarvestingOpportunity, 0)

	for _, account := range reb.accounts {
		// Only harvest in taxable accounts
		if account.AccountType != "taxable" {
			continue
		}

		for _, lot := range account.Lots {
			loss := lot.CostBasis - lot.CurrentValue
			if loss <= 0 {
				continue // Not a loss
			}

			// Don't harvest tiny losses (<$1000)
			if loss < 1000 {
				continue
			}

			// Calculate tax savings
			// Losses offset gains first, then $3k/year against ordinary income
			taxSavings := loss * reb.longTermCapGainsRate
			if reb.carriedForwardLosses == 0 && loss > 3000 {
				// Can only deduct $3k against ordinary income per year
				taxSavings = 3000*reb.taxBracket + (loss-3000)*reb.longTermCapGainsRate
			}

			// Suggest replacement asset (similar but not identical)
			replacement := reb.suggestReplacementAsset(lot.AssetClass)

			opportunities = append(opportunities, TaxLossHarvestingOpportunity{
				AssetClass:       lot.AssetClass,
				AccountType:      account.AccountType,
				Lot:              lot,
				RealizedLoss:     loss,
				TaxSavings:       taxSavings,
				ReplacementAsset: replacement,
			})
		}
	}

	// Sort by tax savings (highest first)
	sort.Slice(opportunities, func(i, j int) bool {
		return opportunities[i].TaxSavings > opportunities[j].TaxSavings
	})

	return opportunities
}

// suggestReplacementAsset suggests similar asset to avoid wash sale
func (reb *TaxAwareRebalancer) suggestReplacementAsset(assetClass string) string {
	// Map asset classes to similar replacements
	replacements := map[string]string{
		"us_stocks_total_market":   "us_stocks_sp500",
		"us_bonds_total_market":    "us_bonds_aggregate",
		"international_stocks":     "international_developed",
		"leveraged_spy":            "us_stocks_total_market",
	}

	if replacement, exists := replacements[assetClass]; exists {
		return replacement
	}

	return assetClass // Default: same asset (may trigger wash sale)
}

// EstimateTaxCostOfRebalancing estimates total tax cost of rebalancing
func (reb *TaxAwareRebalancer) EstimateTaxCostOfRebalancing() float64 {
	plan := reb.GenerateRebalancePlan()

	var totalTax float64
	for _, action := range plan {
		totalTax += action.TaxCost
	}

	return totalTax
}

// CalculateTaxDrag calculates annual tax drag on portfolio
func (reb *TaxAwareRebalancer) CalculateTaxDrag() float64 {
	// Tax drag = taxes paid / portfolio value
	totalValue := 0.0
	taxesPaid := 0.0

	for _, account := range reb.accounts {
		for _, lot := range account.Lots {
			totalValue += lot.CurrentValue

			// Taxable accounts pay tax on dividends/distributions
			if account.AccountType == "taxable" {
				// Assume 2% dividend yield taxed at 15%
				annualDividend := lot.CurrentValue * 0.02
				dividendTax := annualDividend * 0.15
				taxesPaid += dividendTax
			}
		}
	}

	if totalValue == 0 {
		return 0
	}

	return taxesPaid / totalValue
}

// SetRebalanceThreshold updates the rebalancing threshold
func (reb *TaxAwareRebalancer) SetRebalanceThreshold(threshold float64) {
	reb.rebalanceThreshold = threshold
}

// GetRecommendation provides high-level rebalancing recommendation
func (reb *TaxAwareRebalancer) GetRecommendation() string {
	if !reb.NeedsRebalancing() {
		return "Portfolio is well-balanced. No rebalancing needed."
	}

	taxCost := reb.EstimateTaxCostOfRebalancing()
	opportunities := reb.FindTaxLossHarvestingOpportunities()

	if len(opportunities) > 0 {
		totalLosses := 0.0
		for _, opp := range opportunities {
			totalLosses += opp.RealizedLoss
		}
		return "Rebalancing recommended with tax-loss harvesting. Can harvest $" + formatFloat(totalLosses) + " in losses."
	}

	if taxCost < 1000 {
		return "Rebalancing recommended. Estimated tax cost: $" + formatFloat(taxCost)
	}

	if taxCost > 5000 {
		return "Portfolio needs rebalancing, but tax cost is high ($" + formatFloat(taxCost) + "). Consider using contributions to rebalance gradually."
	}

	return "Rebalancing recommended. Estimated tax cost: $" + formatFloat(taxCost)
}
