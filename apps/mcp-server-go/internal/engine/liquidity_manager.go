package engine

import (
	"fmt"
	"sort"
)

// LiquidityManager handles asset liquidity classification and prioritization
type LiquidityManager struct{}

// NewLiquidityManager creates a new liquidity manager
func NewLiquidityManager() *LiquidityManager {
	return &LiquidityManager{}
}

// GetDefaultLiquidityTier returns the default liquidity tier for an asset class
func (lm *LiquidityManager) GetDefaultLiquidityTier(assetClass AssetClass) LiquidityTier {
	switch assetClass {
	case AssetClassCash:
		return LiquidityTierLiquid
	case AssetClassUSStocksTotalMarket, AssetClassUSBondsTotalMarket, AssetClassInternationalStocks:
		return LiquidityTierLiquid
	case AssetClassLeveragedSPY, AssetClassIndividualStock:
		return LiquidityTierLiquid
	case AssetClassRealEstatePrimaryHome:
		return LiquidityTierIlliquid
	case AssetClassOtherAssets:
		return LiquidityTierSemiLiquid // Conservative default
	default:
		return LiquidityTierSemiLiquid // Conservative default for unknown assets
	}
}

// AssignLiquidityTiers assigns liquidity tiers to holdings that don't have them
func (lm *LiquidityManager) AssignLiquidityTiers(holdings []Holding) []Holding {
	for i := range holdings {
		if holdings[i].LiquidityTier == "" {
			holdings[i].LiquidityTier = lm.GetDefaultLiquidityTier(holdings[i].AssetClass)
		}
	}
	return holdings
}

// SortHoldingsByLiquidity sorts holdings by liquidity tier (most liquid first)
func (lm *LiquidityManager) SortHoldingsByLiquidity(holdings []Holding) []Holding {
	sortedHoldings := make([]Holding, len(holdings))
	copy(sortedHoldings, holdings)

	sort.Slice(sortedHoldings, func(i, j int) bool {
		return lm.getLiquidityPriority(sortedHoldings[i].LiquidityTier) <
			lm.getLiquidityPriority(sortedHoldings[j].LiquidityTier)
	})

	return sortedHoldings
}

// getLiquidityPriority returns a numeric priority for sorting (lower = more liquid)
func (lm *LiquidityManager) getLiquidityPriority(tier LiquidityTier) int {
	switch tier {
	case LiquidityTierLiquid:
		return 1
	case LiquidityTierSemiLiquid:
		return 2
	case LiquidityTierIlliquid:
		return 3
	default:
		return 2 // Default to semi-liquid priority
	}
}

// ValidateLiquidationPlan checks if a liquidation plan requires selling illiquid assets
func (lm *LiquidityManager) ValidateLiquidationPlan(holdings []Holding, targetAmount float64) LiquidationPlan {
	plan := LiquidationPlan{
		TargetAmount:           targetAmount,
		LiquidAssetsAvailable:  0.0,
		SemiLiquidAvailable:    0.0,
		IlliquidAssetsRequired: false,
		Warnings:               []string{},
	}

	totalLiquid := 0.0
	totalSemiLiquid := 0.0
	totalIlliquid := 0.0

	for _, holding := range holdings {
		value := holding.CurrentMarketValueTotal
		switch holding.LiquidityTier {
		case LiquidityTierLiquid:
			totalLiquid += value
		case LiquidityTierSemiLiquid:
			totalSemiLiquid += value
		case LiquidityTierIlliquid:
			totalIlliquid += value
		}
	}

	plan.LiquidAssetsAvailable = totalLiquid
	plan.SemiLiquidAvailable = totalSemiLiquid
	plan.IlliquidAssetsAvailable = totalIlliquid

	// Check if liquidation requires progressively less liquid assets
	if targetAmount > totalLiquid {
		plan.Warnings = append(plan.Warnings,
			fmt.Sprintf("Insufficient liquid assets: need $%.2f, have $%.2f",
				targetAmount, totalLiquid))

		if targetAmount > totalLiquid+totalSemiLiquid {
			plan.IlliquidAssetsRequired = true
			plan.Warnings = append(plan.Warnings,
				fmt.Sprintf("ALERT: Must sell illiquid assets worth $%.2f",
					targetAmount-totalLiquid-totalSemiLiquid))
		}
	}

	return plan
}

// LiquidationPlan represents a plan for liquidating assets
type LiquidationPlan struct {
	TargetAmount            float64  `json:"targetAmount"`
	LiquidAssetsAvailable   float64  `json:"liquidAssetsAvailable"`
	SemiLiquidAvailable     float64  `json:"semiLiquidAvailable"`
	IlliquidAssetsAvailable float64  `json:"illiquidAssetsAvailable"`
	IlliquidAssetsRequired  bool     `json:"illiquidAssetsRequired"`
	Warnings                []string `json:"warnings"`
}

// GetLiquidationSummary returns a human-readable summary of the liquidation plan
func (plan *LiquidationPlan) GetLiquidationSummary() string {
	if plan.IlliquidAssetsRequired {
		return fmt.Sprintf("⚠️  FORCED LIQUIDATION: Target $%.0fk requires selling illiquid assets",
			plan.TargetAmount/1000)
	} else if len(plan.Warnings) > 0 {
		return fmt.Sprintf("⚠️  LIMITED LIQUIDITY: Target $%.0fk may require semi-liquid assets",
			plan.TargetAmount/1000)
	} else {
		return fmt.Sprintf("✅ LIQUID: Target $%.0fk can be met with liquid assets",
			plan.TargetAmount/1000)
	}
}
